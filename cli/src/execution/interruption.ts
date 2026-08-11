import { SignalInterruption } from "../runner/signals.js";
import type { AttemptRecord, WaitingDiagnostics } from "../state/checkpoint/types.js";
import { withAgentSession } from "./attempts.js";
import type { StageContext } from "./context.js";
import { Pause } from "./pause.js";
import type { ExecutionResult } from "./result.js";
import { commitCursor, interrupted, renderPause } from "./result.js";

/**
 * How a signal ends a run: what the abort reports about itself, and how a
 * reserved attempt is settled once one has arrived.
 *
 * A signal can land at three points, and only one of them leaves anything to
 * settle. Between stages and at a resumed cursor the checkpoint is durably at
 * rest and the run reports the interruption without touching it; with an attempt
 * reserved, that attempt is finished here — before launch, or after an abort cut
 * a live one short.
 */

/**
 * The originating signal name when the abort reason is a `SignalInterruption`,
 * else `null` for any other (or absent) abort.
 */
export function signalReason(signal: AbortSignal): NodeJS.Signals | null {
  const reason = signal.reason;
  return reason instanceof SignalInterruption ? reason.signal : null;
}

/** How an abort describes its own origin, for the diagnostics a pause carries. */
export function abortOrigin(signal: AbortSignal): string {
  const reason = signal.reason;
  if (typeof reason === "string" && reason.length > 0) return reason;
  if (reason instanceof Error && reason.message.length > 0) return reason.message;
  return "aborted";
}

/**
 * Finish a reserved attempt as a signal interruption: persist a durable
 * `interrupted` waiting pause carrying the signal origin, the unvalidated-
 * changes note, and any pending paths retained as evidence, then return
 * `interrupted`.
 */
export async function settleInterrupted(
  ctx: StageContext,
  args: {
    sig: NodeJS.Signals;
    executingAttempt: AttemptRecord;
    headAfterAttempt: string;
    pendingFiles: string[];
    failure?: { errorClass: string; errorMessage: string };
    agentSession?: { id: string };
  },
): Promise<ExecutionResult> {
  const endedAt = ctx.clock().toISOString();
  const pending = args.pendingFiles.length > 0 ? args.pendingFiles : undefined;
  const diagnostics: WaitingDiagnostics = args.failure
    ? {
        errorClass: args.failure.errorClass,
        errorMessage: args.failure.errorMessage,
        origin: args.sig,
      }
    : { origin: args.sig };
  const waiting = Pause.attemptInterrupted({
    diagnostics,
    pendingFiles: args.pendingFiles,
  });
  // The attempt records the reason that governs its pause, which is the one
  // the pause leads with.
  const governing = waiting.reasons[0];
  const settled: AttemptRecord = withAgentSession(
    {
      ...args.executingAttempt,
      result: "interrupted",
      endedAt,
      terminalResult: null,
      pendingFiles: pending,
      failure: { kind: governing.kind, message: governing.message },
      headAfterAttempt: args.headAfterAttempt,
    },
    args.agentSession,
  );
  const failed = await commitCursor(
    ctx,
    { kind: "settle-attempt", attempt: settled },
    { kind: "pause", waiting },
  );
  if (failed !== null) return failed;
  ctx.display.stageStopped({
    stagePosition: `${args.executingAttempt.stageIndex + 1}/${ctx.stageCount}`,
    durationMs: Date.parse(endedAt) - Date.parse(args.executingAttempt.startedAt),
    disposition: "interrupted",
  });
  renderPause(ctx, waiting, settled);
  return interrupted(args.sig);
}
