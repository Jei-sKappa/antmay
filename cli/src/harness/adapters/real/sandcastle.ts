import { run, codex, claudeCode } from "@ai-hero/sandcastle";
import type { AgentProvider, RunOptions, RunResult } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

import {
  formatTerminalOutcome,
  TERMINAL_OUTCOMES,
} from "../../../runner/outcome.js";
import type { HarnessId } from "../../id.js";
import type {
  AttemptOutcome,
  AttemptRequest,
  HarnessEvent,
  HarnessInvoker,
} from "../../types.js";

/** The completion signals the harness emits to end the single iteration. */
const COMPLETION_SIGNALS = TERMINAL_OUTCOMES.map((token) =>
  formatTerminalOutcome(token),
);

/** The completion grace window (seconds) after a completion signal is seen. */
const COMPLETION_TIMEOUT_SECONDS = 60;

/** How a single attempt's permissions are governed. */
type PermissionPolicy = "ai-mediated" | "harness-bypass";

/**
 * How each harness is constructed through the Sandcastle SDK, keyed by harness
 * id and total over it. Both the SDK factory and the option that expresses an
 * AI-mediated policy are harness-specific, and this is the one place either is
 * named: the SDK stays behind this adapter, so a harness cannot declare its own
 * construction without dragging the SDK into the statically loaded providers.
 */
const SANDCASTLE_AGENTS: Record<
  HarnessId,
  (model: string, policy: PermissionPolicy) => AgentProvider
> = {
  codex: (model, policy) =>
    policy === "harness-bypass"
      ? codex(model, { captureSessions: false })
      : codex(model, {
          captureSessions: false,
          approvalsReviewer: "auto_review",
        }),
  "claude-code": (model, policy) =>
    policy === "harness-bypass"
      ? claudeCode(model, { captureSessions: false })
      : claudeCode(model, {
          captureSessions: false,
          permissionMode: "auto",
        }),
};

/**
 * Build the agent provider for a request, applying the exact permission policy.
 *
 * Session capture is always disabled. In the default (AI-mediated) mode Codex
 * runs under `approvalsReviewer: "auto_review"` and Claude Code under
 * `permissionMode: "auto"`. When `dangerouslySkipPermissions` is set, both
 * options are omitted so the harness's own bypass governs — session capture
 * stays disabled.
 */
function buildAgent(request: AttemptRequest): AgentProvider {
  return SANDCASTLE_AGENTS[request.harness](
    request.model,
    request.dangerouslySkipPermissions ? "harness-bypass" : "ai-mediated",
  );
}

/**
 * Map a single harness stream event to a normalized {@link HarnessEvent}, or
 * `null` for events the display drops (raw lines go only to the attempt log).
 * Accepts a structural shape so the bridge is testable without any
 * harness-specific type.
 */
export function mapAgentStreamEvent(event: {
  type: string;
  message?: string;
  name?: string;
  formattedArgs?: string;
}): HarnessEvent | null {
  if (event.type === "text" && typeof event.message === "string") {
    return { type: "text", text: event.message };
  }
  if (
    event.type === "toolCall" &&
    typeof event.name === "string" &&
    typeof event.formattedArgs === "string"
  ) {
    return { type: "tool-call", name: event.name, args: event.formattedArgs };
  }
  return null;
}

/**
 * Watch raw stream lines through the attempt's provider parser and retain the
 * first non-empty normalized session identity, reporting it once via the
 * live-capture callback.
 */
function createSessionCapture(request: AttemptRequest, agent: AgentProvider): {
  noteRawLine: (line: string) => void;
} {
  let captured = false;
  return {
    noteRawLine(line: string): void {
      if (captured) {
        return;
      }
      for (const parsed of agent.parseStreamLine(line)) {
        if (parsed.type !== "session_id") {
          continue;
        }
        if (parsed.sessionId.length === 0) {
          continue;
        }
        captured = true;
        request.onSessionCaptured?.({ id: parsed.sessionId });
        return;
      }
    },
  };
}

/**
 * Build the exact harness run options for a single attempt. Pure and
 * unit-testable: the mapping is fixed field-by-field, mapping the Antmay-owned
 * workspace values at the adapter edge and setting nothing outside the listed
 * options. One provider instance is both the run agent and the raw-line parser.
 */
export function buildSandcastleRunOptions(request: AttemptRequest): RunOptions {
  const agent = buildAgent(request);
  const sessionCapture = createSessionCapture(request, agent);
  return {
    agent,
    sandbox: noSandbox(),
    cwd: request.workspace.cwd,
    prompt: request.prompt,
    maxIterations: 1,
    completionSignal: COMPLETION_SIGNALS,
    completionTimeoutSeconds: COMPLETION_TIMEOUT_SECONDS,
    idleTimeoutSeconds: request.idleTimeoutSeconds,
    branchStrategy: { type: "head" },
    logging: {
      type: "file",
      path: request.logFilePath,
      verbose: true,
      onAgentStreamEvent: (event) => {
        if (event.type === "raw") {
          sessionCapture.noteRawLine(event.line);
        }
        const mapped = mapAgentStreamEvent(event);
        if (mapped !== null) {
          request.onEvent(mapped);
        }
      },
    },
    signal: request.signal,
  };
}

/** Extract the original error's class name and message, retained verbatim. */
function describeError(error: unknown): {
  errorClass: string;
  errorMessage: string;
} {
  if (error instanceof Error) {
    const ctorName = error.constructor?.name;
    return {
      errorClass: ctorName && ctorName.length > 0 ? ctorName : error.name,
      errorMessage: error.message,
    };
  }
  return { errorClass: typeof error, errorMessage: String(error) };
}

/**
 * The harness's idle-timeout failure surfaces as its `AgentIdleTimeoutError`
 * (a tagged error whose `_tag`, `name`, and class name all read
 * `"AgentIdleTimeoutError"`). Detected structurally so no harness type is
 * imported.
 */
function isIdleTimeout(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const marker = "AgentIdleTimeoutError";
  const record = error as {
    _tag?: unknown;
    name?: unknown;
    constructor?: { name?: unknown };
  };
  return (
    record._tag === marker ||
    record.name === marker ||
    record.constructor?.name === marker
  );
}

/**
 * Normalize a rejected harness run into a provider-neutral failed outcome. An
 * abort (signalled or an `AbortError`) maps to `"aborted"`, the idle-timeout
 * failure to `"idle-timeout"`, and everything else to `"provider-error"` —
 * always retaining the original error's class name and message.
 */
function normalizeError(
  error: unknown,
  signal: AbortSignal,
): Extract<AttemptOutcome, { kind: "failed" }> {
  const { errorClass, errorMessage } = describeError(error);
  const category: "idle-timeout" | "aborted" | "provider-error" =
    signal.aborted || (error instanceof Error && error.name === "AbortError")
      ? "aborted"
      : isIdleTimeout(error)
        ? "idle-timeout"
        : "provider-error";
  return { kind: "failed", category, errorClass, errorMessage };
}

/**
 * Prefer the live-captured ID; otherwise, on a resolved run only, take the
 * last iteration's non-empty session ID as a settlement-only fallback.
 */
function resolveOutcomeSession(
  liveSessionId: string | undefined,
  result?: RunResult,
): { id: string } | undefined {
  if (liveSessionId !== undefined && liveSessionId.length > 0) {
    return { id: liveSessionId };
  }
  if (result === undefined) {
    return undefined;
  }
  const fallback = result.iterations.at(-1)?.sessionId;
  if (typeof fallback === "string" && fallback.length > 0) {
    return { id: fallback };
  }
  return undefined;
}

function withSession(
  outcome: AttemptOutcome,
  session: { id: string } | undefined,
): AttemptOutcome {
  return session === undefined ? outcome : { ...outcome, session };
}

/**
 * Create the {@link HarnessInvoker} backed by the harness adapter. On resolve,
 * the completed outcome's `finalText` is the captured single-iteration result
 * text; on reject, the error is normalized to a provider-neutral failed
 * outcome. The first live-captured session ID is retained on either path; a
 * resolved run with no live ID may still carry Sandcastle's final iteration
 * session ID. No harness type appears in this signature.
 */
export function createSandcastleInvoker(): HarnessInvoker {
  return {
    async invoke(request: AttemptRequest): Promise<AttemptOutcome> {
      let liveSessionId: string | undefined;
      const requestWithCapture: AttemptRequest = {
        ...request,
        onSessionCaptured: (session) => {
          liveSessionId = session.id;
          request.onSessionCaptured?.(session);
        },
      };
      try {
        const result = await run(buildSandcastleRunOptions(requestWithCapture));
        return withSession(
          { kind: "completed", finalText: result.stdout },
          resolveOutcomeSession(liveSessionId, result),
        );
      } catch (error) {
        return withSession(
          normalizeError(error, request.signal),
          resolveOutcomeSession(liveSessionId),
        );
      }
    },
  };
}
