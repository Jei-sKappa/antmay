import { appendFile } from "node:fs/promises";

import { renderStagePrompt } from "../../prompt.js";
import type {
  AttemptOutcome,
  AttemptRequest,
  HarnessEvent,
  HarnessInvoker,
} from "../../types.js";
import type { SimulatedCaseEnding, TranscriptLine } from "./cases.js";
import { executeSimulatedCase, resolveCaseThreadRoot } from "./cases.js";
import type { SimulatedCaseName, SimulatedScenario } from "./scenario.js";
import { isCaseCompatibleWithStage } from "./scenario.js";

/** Error class name surfaced on simulated adapter failures. */
export const SIMULATED_HARNESS_ERROR_CLASS = "SimulatedHarnessError";

const ABORTED_OUTCOME: AttemptOutcome = {
  kind: "failed",
  category: "aborted",
  errorClass: "AbortError",
  errorMessage: "The attempt was aborted by a signal.",
};

/**
 * Deterministic fake session identity for a launched simulated attempt. The
 * shape is intentionally obvious so pause and list renderings stay demo-covered
 * without resembling a real provider ID.
 */
export function simulatedSessionId(stageId: string, attemptNumber: number): string {
  return `simulated-session-${stageId}-${attemptNumber}`;
}

function withSession(
  outcome: AttemptOutcome,
  session: { id: string },
): AttemptOutcome {
  return { ...outcome, session };
}

/**
 * How often the waiting case wakes to keep the process alive. An abort listener
 * alone holds nothing open, so without a referenced timer the event loop drains
 * and Node exits before any signal can arrive.
 */
const AWAIT_ABORT_TICK_MS = 250;

/**
 * Wait until the attempt is aborted, then report the abort. The returned promise
 * settles on nothing else, so a case that ends this way stands in for an agent
 * that is still working when a signal arrives.
 */
function awaitAbort(signal: AbortSignal): Promise<AttemptOutcome> {
  if (signal.aborted) {
    return Promise.resolve(ABORTED_OUTCOME);
  }
  return new Promise((resolve) => {
    const tick = setInterval(() => {}, AWAIT_ABORT_TICK_MS);
    signal.addEventListener(
      "abort",
      () => {
        clearInterval(tick);
        resolve(ABORTED_OUTCOME);
      },
      { once: true },
    );
  });
}

function simulatedProviderError(message: string): AttemptOutcome {
  return {
    kind: "failed",
    category: "provider-error",
    errorClass: SIMULATED_HARNESS_ERROR_CLASS,
    errorMessage: message,
  };
}

function validateRequestShape(
  request: AttemptRequest,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(request.stage.attemptNumber)) {
    return { ok: false, error: "attemptNumber must be a positive integer." };
  }
  if (request.stage.attemptNumber < 1) {
    return { ok: false, error: "attemptNumber must be at least 1." };
  }

  // The concrete target was settled by composition against the thread's
  // artifact state, so it is verified for containment rather than re-derived:
  // both a thread-root target (`<thread>/`) and a thread-file target
  // (`<thread>/spec.md`) sit under the thread prefix.
  if (!request.stage.resolvedTarget.startsWith(`${request.stage.threadRelPath}/`)) {
    return {
      ok: false,
      error: "resolvedTarget does not lie inside the stage's thread.",
    };
  }

  const expectedPrompt = renderStagePrompt(
    request.harness,
    request.stage.skill,
    request.stage.resolvedTarget,
    request.stage.instructions,
  );
  if (request.prompt !== expectedPrompt) {
    return { ok: false, error: "prompt does not match the expected stage prompt." };
  }

  return { ok: true };
}

function selectCase(
  scenario: SimulatedScenario,
  request: AttemptRequest,
):
  | { ok: true; caseName: SimulatedCaseName }
  | { ok: false; error: string } {
  const stageCases = scenario.stages[request.stage.id];
  if (stageCases === undefined) {
    return {
      ok: false,
      error: `no simulated cases configured for stage ${request.stage.id}.`,
    };
  }

  const index = request.stage.attemptNumber - 1;
  if (index >= stageCases.length) {
    return {
      ok: false,
      error: `simulated cases exhausted for stage ${request.stage.id} at attempt ${request.stage.attemptNumber}.`,
    };
  }

  const caseName = stageCases[index]!;
  if (!isCaseCompatibleWithStage(caseName, request.stage.id)) {
    return {
      ok: false,
      error: `case ${caseName} is not compatible with stage ${request.stage.id}.`,
    };
  }

  return { ok: true, caseName };
}

/** The normalized stream event one transcript line is surfaced as. */
function eventFor(line: TranscriptLine): HarnessEvent {
  return typeof line === "string"
    ? { type: "text", text: line }
    : { type: "tool-call", name: line.tool, args: line.args };
}

/** One transcript line as the attempt log records it. A tool call is written in
 * the same call-and-arguments form the terminal renders. */
function logTextFor(line: TranscriptLine): string {
  return typeof line === "string" ? line : `${line.tool}(${line.args})`;
}

/**
 * Stream the attempt's transcript to the display: every progress line, then the
 * final message. These are the lines a real attempt shares between the terminal
 * and its log; the session framing around them is written to the log alone.
 */
function emitTranscript(
  request: AttemptRequest,
  transcript: readonly TranscriptLine[],
): { ok: true } | { ok: false; error: string } {
  for (const line of transcript) {
    try {
      request.onEvent(eventFor(line));
    } catch (error) {
      return {
        ok: false,
        error: `event callback failed: ${(error as Error).message}`,
      };
    }
  }
  return { ok: true };
}

/**
 * Persist the synthetic session identity as simulated-harness metadata as soon
 * as it exists. Real harness logs retain the provider's raw session event; this
 * explicit line gives simulated logs the same recovery surface without
 * fabricating provider JSON or emitting executor metadata as agent output.
 */
async function appendSessionIdentity(
  request: AttemptRequest,
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await appendFile(
      request.logFilePath,
      `Simulated session: ${sessionId}\n`,
      "utf8",
    );
  } catch (error) {
    return {
      ok: false,
      error: `failed to append simulated session identity: ${(error as Error).message}`,
    };
  }
  return { ok: true };
}

/**
 * Append the attempt's session log beneath the header Antmay already wrote: an
 * opening frame naming the agent, case, and attempt, the same transcript the
 * display received, and a closing frame. The frame reports only what this
 * harness actually did — it fabricates no sandbox, branch, or timing.
 */
async function appendSessionLog(
  request: AttemptRequest,
  caseName: SimulatedCaseName,
  transcript: readonly TranscriptLine[],
  closing: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = [
    "Simulated Harness Run",
    `  Agent: ${request.harness}`,
    `  Model: ${request.model}`,
    `  Case: ${caseName}`,
    `  Attempt: ${request.stage.attemptNumber}`,
    "Agent started",
    ...transcript.map(logTextFor),
    "Agent stopped",
    closing,
  ].join("\n");
  try {
    await appendFile(request.logFilePath, `${body}\n`, "utf8");
  } catch (error) {
    return {
      ok: false,
      error: `failed to append attempt log: ${(error as Error).message}`,
    };
  }
  return { ok: true };
}

/** The closing log frame for the way the case ended. */
function closingFor(ending: SimulatedCaseEnding): string {
  switch (ending.kind) {
    case "ordinary":
      return "Run complete: the simulated agent finished after 1 iteration(s).";
    case "failed":
      return `Run failed: ${ending.category}: ${ending.errorMessage}.`;
    case "await-abort":
      return "Run aborted: the simulated agent was waiting when the attempt was aborted.";
  }
}

async function invokeSimulated(
  scenario: SimulatedScenario,
  request: AttemptRequest,
): Promise<AttemptOutcome> {
  const shape = validateRequestShape(request);
  if (!shape.ok) {
    return simulatedProviderError(shape.error);
  }

  const selected = selectCase(scenario, request);
  if (!selected.ok) {
    return simulatedProviderError(selected.error);
  }

  const threadRoot = await resolveCaseThreadRoot(
    request.workspace.cwd,
    request.stage.threadRelPath,
  );
  if (!threadRoot.ok) {
    return simulatedProviderError(threadRoot.error);
  }

  if (request.signal.aborted) {
    return ABORTED_OUTCOME;
  }

  const session = {
    id: simulatedSessionId(request.stage.id, request.stage.attemptNumber),
  };
  request.onSessionCaptured?.(session);
  const sessionLog = await appendSessionIdentity(request, session.id);
  if (!sessionLog.ok) {
    return withSession(simulatedProviderError(sessionLog.error), session);
  }

  const executed = await executeSimulatedCase(selected.caseName, {
    threadRelPath: request.stage.threadRelPath,
    threadAbsRoot: threadRoot.absPath,
  });
  if (!executed.ok) {
    return withSession(simulatedProviderError(executed.error), session);
  }

  const streamed = emitTranscript(request, executed.transcript);
  if (!streamed.ok) {
    return withSession(simulatedProviderError(streamed.error), session);
  }

  const log = await appendSessionLog(
    request,
    selected.caseName,
    executed.transcript,
    closingFor(executed.ending),
  );
  if (!log.ok) {
    return withSession(simulatedProviderError(log.error), session);
  }

  const ending = executed.ending;
  if (ending.kind === "ordinary") {
    return withSession(
      { kind: "completed", finalText: ending.finalText },
      session,
    );
  }
  if (ending.kind === "failed") {
    return withSession(
      {
        kind: "failed",
        category: ending.category,
        errorClass: SIMULATED_HARNESS_ERROR_CLASS,
        errorMessage: ending.errorMessage,
      },
      session,
    );
  }
  return withSession(await awaitAbort(request.signal), session);
}

/**
 * Create a provider-neutral simulated harness invoker bound to a validated
 * scenario. Case selection uses explicit stage ID and durable attempt number
 * only; failures normalize to provider-error outcomes at the adapter boundary.
 * The optional developer observer receives the exact submitted prompt at
 * adapter entry, before request validation, and stays outside normalized
 * harness events and attempt logs.
 */
export function createSimulatedInvoker(
  scenario: SimulatedScenario,
  onResolvedPrompt: (prompt: string) => void = () => undefined,
): HarnessInvoker {
  return {
    invoke(request: AttemptRequest): Promise<AttemptOutcome> {
      try {
        onResolvedPrompt(request.prompt);
      } catch {
        // Developer diagnostics are observational. A broken display path must
        // not replace or reclassify the simulated harness outcome.
      }
      return invokeSimulated(scenario, request);
    },
  };
}
