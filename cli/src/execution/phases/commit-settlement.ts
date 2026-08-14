import type { StageDisposition } from "../../display/types.js";
import type {
  AttemptRecord,
  TerminalResult,
  WaitingInfo,
} from "../../state/checkpoint/types.js";
import { withAgentSession } from "../attempts.js";
import type { StageContext } from "../context.js";
import type { ExecutionResult } from "../result.js";
import { commitCursor, renderPause } from "../result.js";
import type { Transition } from "../run-state.js";

/**
 * Where an attempt becomes durable: the executing record is amended, written
 * together with the cursor movement it settled into as one document, and the
 * event that ending is owed is drawn.
 *
 * An attempt ends in one of three ways and no others, so the three are a closed
 * union folded here rather than three branches each doing their own writing.
 * That is what makes "one checkpoint document carries a settled attempt together
 * with the pause it settled into" a property of there being one write site. A
 * fourth ending fails to compile until it states what it records and how the
 * cursor moves for it.
 */

/** Everything the three endings share about the attempt they are ending. */
export type SettlingAttempt = {
  /** The executing record the cursor holds, which every settlement amends. */
  executing: AttemptRecord;
  session: { id: string } | undefined;
  endedAt: string;
  durationMs: number;
  terminalResult: TerminalResult | null;
  /** The tip observed once this attempt settled, boundary commit included. */
  observedHead: string;
  pendingFiles: string[];
};

/**
 * Which ending an attempt settled into, and what only that ending needs. The
 * orchestrator decides which one holds and how the stage reports itself; nothing
 * here re-derives either.
 */
export type Settlement =
  | { kind: "advanced" }
  | { kind: "done-pending-queues"; waiting: WaitingInfo }
  | {
      kind: "stopped";
      waiting: WaitingInfo;
      /** Whether a signal-caused abort is what ended the attempt. */
      aborted: boolean;
      /** How the stage itself ended, as the terminal reports it. */
      disposition: StageDisposition;
    };

/** What a settled record carries whichever ending produced it. */
function settledFields(settling: SettlingAttempt) {
  return {
    ...settling.executing,
    endedAt: settling.endedAt,
    terminalResult: settling.terminalResult,
  };
}

/**
 * What each ending records and where it leaves the cursor. The three shapes
 * differ in exactly one field each, and they sit together so that difference is
 * readable: an advanced attempt observed no pending queue and records no such
 * key, which is not the same as recording an empty one.
 */
function settledBy(
  settling: SettlingAttempt,
  settlement: Settlement,
): { attempt: AttemptRecord; movement: Transition } {
  switch (settlement.kind) {
    case "advanced":
      return {
        attempt: withAgentSession(
          {
            ...settledFields(settling),
            result: "done",
            headAfterAttempt: settling.observedHead,
          },
          settling.session,
        ),
        movement: { kind: "advance" },
      };
    case "done-pending-queues":
      return {
        attempt: withAgentSession(
          {
            ...settledFields(settling),
            result: "done",
            pendingFiles: settling.pendingFiles,
            headAfterAttempt: settling.observedHead,
          },
          settling.session,
        ),
        movement: { kind: "pause", waiting: settlement.waiting },
      };
    case "stopped": {
      // The attempt's failure telemetry rides on the reason that reports that
      // failure, which is the reason the pause leads with and the only one it
      // describes.
      const governing = settlement.waiting.reasons[0];
      return {
        attempt: withAgentSession(
          {
            ...settledFields(settling),
            result: settlement.aborted ? "interrupted" : "waiting",
            ...(settling.pendingFiles.length > 0
              ? { pendingFiles: settling.pendingFiles }
              : {}),
            failure: { kind: governing.kind, message: governing.message },
            headAfterAttempt: settling.observedHead,
          },
          settling.session,
        ),
        movement: { kind: "pause", waiting: settlement.waiting },
      };
    }
  }
}

export async function commitSettlement(
  ctx: StageContext,
  settling: SettlingAttempt,
  settlement: Settlement,
): Promise<ExecutionResult | null> {
  const { attempt, movement } = settledBy(settling, settlement);
  const failed = await commitCursor(
    ctx,
    { kind: "settle-attempt", attempt },
    movement,
  );
  if (failed !== null) return failed;

  const stageLine = {
    stagePosition: ctx.stagePosition,
    durationMs: settling.durationMs,
  };
  if (settlement.kind === "stopped") {
    ctx.display.stageStopped({ ...stageLine, disposition: settlement.disposition });
  } else {
    // A stage that reported `DONE` and finalized its boundary succeeded, even
    // when its own pending bundle is what keeps the run from advancing.
    ctx.display.stageSucceeded(stageLine);
  }
  if (settlement.kind === "advanced") return null;
  return renderPause(ctx, settlement.waiting, attempt);
}
