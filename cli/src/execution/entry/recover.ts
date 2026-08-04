import type { AttemptRecord, WaitingInfo } from "../../state/checkpoint.js";
import { referencedAttempt } from "../attempts.js";
import type { RunContext, StageContext } from "../context.js";
import { stageContext } from "../context.js";
import { signalReason } from "../interruption.js";
import { observeHead, readWorktreeCleanliness } from "../observations.js";
import { holdsPreservedDone, referencesAttempt } from "../recovery.js";
import type { RecoveryDirective } from "../recovery-policy.js";
import { decideRecovery } from "../recovery-policy.js";
import type { ExecutionResult } from "../result.js";
import {
  commitCursor,
  fatal,
  interruptedAtRest,
  refused,
} from "../result.js";
import { gatherRecoveryEvidence } from "./evidence.js";
import { finalizeSavedDone } from "./finalize.js";
import { remainPaused } from "./refresh.js";

/**
 * Turn the durable cursor a resume was handed into a runnable one, or into the
 * result that ends this invocation.
 *
 * Everything here happens under the held lock, which is why the abandoned
 * attempt, the fresh evidence, and the transition the evidence justifies can be
 * treated as one atomic step. Only a `resume` entry comes through here; an
 * `allocated` cursor has no past to recover from.
 */

/**
 * How an attempt that was live when its executor disappeared is settled. The
 * origin is recorded in the message because nothing else observed the stop.
 */
const ABANDONED_ATTEMPT_NOTE =
  "The attempt was abandoned; the run was recovered on resume after manual " +
  "stale-lock removal (origin: manual-recovery).";

/**
 * What this resume resolved about the pause it is deciding, before any directive
 * is applied. Checkpoint validation guarantees that every attempt-referencing
 * recovery names the final active record, so it is resolved once here and carried
 * through finalization and rendering.
 */
type PausedCursor = {
  /** The waiting object the checkpoint records. */
  paused: WaitingInfo;
  /** The record the recovery names, absent for a recovery that names none. */
  recoveryAttempt: AttemptRecord | undefined;
  /**
   * The record a pause that stays paused describes. A recovery that names no
   * attempt has none of its own to describe, so its display describes the latest
   * persisted attempt that led to the pause.
   */
  describedAttempt: AttemptRecord | undefined;
};

/** Carry out one recovery directive as a durable transition. */
async function applyDirective(
  ctx: StageContext,
  cursor: PausedCursor,
  directive: RecoveryDirective,
): Promise<ExecutionResult | null> {
  switch (directive.kind) {
    case "retry-stage":
      ctx.run.apply({ kind: "become-ready" });
      return null;
    case "advance-stage":
      return commitCursor(ctx, { kind: "advance" });
    case "finalize-boundary": {
      const finalization = await finalizeSavedDone(
        ctx,
        directive,
        cursor.recoveryAttempt,
      );
      if (finalization.kind === "resolved") return finalization.result;
      // A boundary this resume could not finalize is fresh Git evidence like any
      // other: the policy decides what the run does about it, and keeps the
      // preserved attempt finalizable from wherever this pass left the tip.
      return applyDirective(
        ctx,
        { ...cursor, describedAttempt: cursor.recoveryAttempt },
        decideRecovery({
          decidedFrom: "preserved-done",
          recovery: directive.recovery,
          evidence: finalization.evidence,
        }),
      );
    }
    case "remain-paused":
      return remainPaused(ctx, {
        paused: cursor.paused,
        attempt: cursor.describedAttempt,
        directive,
      });
  }
}

export async function recoverFromDurableCursor(
  ctx: RunContext,
): Promise<ExecutionResult | null> {
  const { run } = ctx;
  const enteredWaiting = run.checkpoint.waiting;
  const enteredRecovery = enteredWaiting?.recovery ?? null;

  // Clean-worktree rule: required for a ready or executing cursor and for every
  // recovery except the two holding a saved DONE for finalization. Those are
  // exempt because the repair they wait for arrives uncommitted — a contract
  // recheck has to inspect a dirty tree to decide anything, and a boundary retry
  // commits exactly the diff it is waiting for.
  if (enteredRecovery === null || !holdsPreservedDone(enteredRecovery)) {
    const worktree = await readWorktreeCleanliness(ctx);
    if (!worktree.ok) return refused(worktree.message);
    if (worktree.value !== "clean") {
      return refused(
        `The Git worktree at ${ctx.repoRoot} is not clean. Commit what you want to keep or revert the rest before resuming.`,
      );
    }
  }

  // An attempt that was live when its executor disappeared is settled before
  // any other transition: it records the tip observed now as its post-attempt
  // observation, and the cursor becomes a durable retry at the same stage.
  if (run.checkpoint.condition === "executing") {
    const sig = signalReason(ctx.signal);
    if (sig !== null) return interruptedAtRest(ctx, sig);
    const abandoned = run.checkpoint.attempts[run.checkpoint.attempts.length - 1]!;
    const abandonedHead = await observeHead(ctx, "before-transition");
    if (!abandonedHead.ok) return refused(abandonedHead.message);
    const settled: AttemptRecord = {
      ...abandoned,
      result: "interrupted",
      endedAt: ctx.clock().toISOString(),
      terminalResult: null,
      headAfterAttempt: abandonedHead.value,
      failure: { kind: "interrupted", message: ABANDONED_ATTEMPT_NOTE },
    };
    const failed = await commitCursor(
      ctx,
      { kind: "settle-attempt", attempt: settled },
      { kind: "become-ready" },
    );
    if (failed !== null) return failed;
  }

  // A ready cursor — allocated, or just recovered above — records no recovery,
  // so there is nothing to decide: the loop's own pre-attempt gate is what
  // pauses it on queued work or an unreadable queue.
  if (enteredWaiting === null) {
    run.apply({ kind: "become-ready" });
    return null;
  }

  const pausedRecovery = enteredWaiting.recovery;
  let recoveryAttempt: AttemptRecord | undefined;
  let describedAttempt: AttemptRecord | undefined;
  if (referencesAttempt(pausedRecovery)) {
    const resolved = referencedAttempt(run.checkpoint, pausedRecovery.attempt);
    if (!resolved.ok) return fatal(ctx, resolved.message);
    recoveryAttempt = resolved.value;
    describedAttempt = resolved.value;
  } else {
    describedAttempt = run.checkpoint.attempts[run.checkpoint.attempts.length - 1];
  }
  const cursor: PausedCursor = {
    paused: enteredWaiting,
    recoveryAttempt,
    describedAttempt,
  };
  const stage = stageContext(ctx);

  const gathered = await gatherRecoveryEvidence(stage, pausedRecovery);
  if (gathered.kind === "interrupted") {
    return interruptedAtRest(ctx, gathered.signal);
  }
  if (gathered.kind === "worktree-unreadable") return refused(gathered.message);

  return applyDirective(stage, cursor, decideRecovery(gathered.paused));
}
