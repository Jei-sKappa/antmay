import type { AttemptRecord, WaitingInfo } from "../../state/checkpoint.js";
import { attemptInterval } from "../attempts.js";
import type { StageContext } from "../context.js";
import {
  Pause,
  isAdvisoryHeadMovement,
  unexpectedHeadMovementMessage,
} from "../pause.js";
import type { RecoveryDirective } from "../recovery-policy.js";
import { holdsPreservedDone } from "../recovery-policy.js";
import type { ExecutionResult } from "../result.js";
import { fatal, pauseRun, renderPause } from "../result.js";

/**
 * The pause a resume leaves in place, restated over what this resume just
 * observed.
 *
 * Six situations reach here, and each words the same pause differently while
 * leaving the run exactly as recoverable as this resume found it: what a later
 * resume may do is carried through from the directive, never re-derived from the
 * refreshed reasons. Still-present bundles write nothing at all, and a refresh
 * that computes the already-persisted waiting object renders without restamping
 * `updatedAt`.
 */
export async function remainPaused(
  ctx: StageContext,
  args: {
    /** The waiting object the checkpoint records, which this refresh restates. */
    paused: WaitingInfo;
    /** The attempt this pause describes, when it still describes one. */
    attempt: AttemptRecord | undefined;
    directive: Extract<RecoveryDirective, { kind: "remain-paused" }>;
  },
): Promise<ExecutionResult> {
  const { paused, attempt, directive } = args;
  const facts = directive.facts;
  const candidateLine = attempt?.terminalResult?.candidateLine ?? undefined;

  switch (facts.kind) {
    case "pending-bundles":
      return renderPause(
        ctx,
        Pause.refreshPendingBundles({
          paused,
          pendingFiles: facts.pendingFiles,
        }),
        attempt,
      );

    case "queue-scan-failed":
      // A pause holding a saved DONE for finalization still describes the
      // attempt holding it; a pause whose whole explanation the scan failure
      // replaced has no attempt left to describe.
      if (holdsPreservedDone(directive.recovery)) {
        return pauseRun(
          ctx,
          Pause.refreshQueueUnreadableHoldingDone({
            paused,
            recovery: directive.recovery,
            scanMessage: facts.message,
          }),
          attempt,
        );
      }
      return pauseRun(
        ctx,
        Pause.refreshQueueUnreadable({
          paused,
          recovery: directive.recovery,
          scanMessage: facts.message,
        }),
        undefined,
      );

    case "promise-uninspectable":
      return pauseRun(
        ctx,
        Pause.refreshPromiseUninspectable({
          paused,
          recovery: directive.recovery,
          message: facts.message,
          candidateLine,
        }),
        attempt,
      );

    case "promise-unmet":
      return pauseRun(
        ctx,
        Pause.refreshPromiseUnmet({
          paused,
          recovery: directive.recovery,
          unmet: facts.unmet,
          worktree: facts.worktree,
          candidateLine,
        }),
        attempt,
      );

    case "git-finalization-failed": {
      // An advisory movement is worded from the preserved attempt's own
      // interval, so that interval has to be resolvable before the pause can
      // be built at all.
      const interval =
        isAdvisoryHeadMovement(facts.failure) && attempt !== undefined
          ? attemptInterval(attempt)
          : undefined;
      if (interval !== undefined && !interval.ok) {
        return fatal(ctx, interval.message);
      }
      return pauseRun(
        ctx,
        Pause.refreshBoundaryRefused({
          recovery: directive.recovery,
          failure: facts.failure,
          message:
            interval?.ok === true
              ? unexpectedHeadMovementMessage(interval.value)
              : `${facts.message}.`,
          candidateLine,
        }),
        attempt,
      );
    }
  }
}
