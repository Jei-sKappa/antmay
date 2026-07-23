import { run, codex, claudeCode } from "@ai-hero/sandcastle";
import type { RunOptions } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

import type {
  AttemptOutcome,
  AttemptRequest,
  HarnessEvent,
  HarnessInvoker,
} from "./types.js";

/** The completion signals the harness emits to end the single iteration. */
const COMPLETION_SIGNALS = [
  "Outcome: DONE",
  "Outcome: BLOCKED",
  "Outcome: REFUSED",
];

/** The completion grace window (seconds) after a completion signal is seen. */
const COMPLETION_TIMEOUT_SECONDS = 60;

/**
 * Build the agent provider for a request, applying the exact permission policy.
 *
 * Session capture is always disabled. In the default (AI-mediated) mode Codex
 * runs under `approvalsReviewer: "auto_review"` and Claude Code under
 * `permissionMode: "auto"`. When `dangerouslySkipPermissions` is set, both
 * options are omitted so the harness's own bypass governs — session capture
 * stays disabled.
 */
function buildAgent(request: AttemptRequest) {
  if (request.harness === "codex") {
    return request.dangerouslySkipPermissions
      ? codex(request.model, { captureSessions: false })
      : codex(request.model, {
          captureSessions: false,
          approvalsReviewer: "auto_review",
        });
  }
  return request.dangerouslySkipPermissions
    ? claudeCode(request.model, { captureSessions: false })
    : claudeCode(request.model, {
        captureSessions: false,
        permissionMode: "auto",
      });
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
 * Build the exact harness run options for a single attempt. Pure and
 * unit-testable: the mapping is fixed field-by-field, mapping the Antmay-owned
 * workspace values at the adapter edge and setting nothing outside the listed
 * options.
 */
export function buildSandcastleRunOptions(request: AttemptRequest): RunOptions {
  return {
    agent: buildAgent(request),
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
 * Create the {@link HarnessInvoker} backed by the harness adapter. On resolve,
 * the completed outcome's `finalText` is the captured single-iteration result
 * text; on reject, the error is normalized to a provider-neutral failed
 * outcome. No harness type appears in this signature.
 */
export function createSandcastleInvoker(): HarnessInvoker {
  return {
    async invoke(request: AttemptRequest): Promise<AttemptOutcome> {
      try {
        const result = await run(buildSandcastleRunOptions(request));
        return { kind: "completed", finalText: result.stdout };
      } catch (error) {
        return normalizeError(error, request.signal);
      }
    },
  };
}
