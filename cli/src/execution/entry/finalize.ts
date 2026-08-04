import type { GitBoundaryContext } from "../../gitops/boundary.js";
import type { AttemptRecord } from "../../state/checkpoint.js";
import { attemptInterval } from "../attempts.js";
import type { StageContext } from "../context.js";
import type { GitReadiness, RecoveryDirective } from "../recovery-policy.js";
import type { ExecutionResult } from "../result.js";
import { commitCursor, fatal } from "../result.js";
import type { Transition } from "../run-state.js";

/**
 * Finalize the exact saved `DONE` attempt a `finalize-boundary` directive names,
 * without invoking the agent again, then apply the stage's declared queue
 * resolution. Both no-harness recoveries — a refused boundary that was corrected
 * and a repaired promised artifact — land here, so neither grows a finalization
 * path of its own.
 *
 * The directive's context is what the Git boundary judges the finalization as,
 * because the two stand in different places with respect to the `headMayChange`
 * rule. A boundary retry was already judged under that rule during the run. A
 * contract repair was never judged at all — the stage loop stopped before the
 * boundary — so this is the stage's one chance to apply it, across the preserved
 * attempt's own interval.
 */

/**
 * Whether the boundary is now behind the run.
 *
 * `unfinalized` reports the failure as fresh Git evidence rather than as a
 * decision: what the run does about a boundary this resume could not finalize is
 * the policy's to say, and the preserved attempt stays finalizable from wherever
 * this pass left the tip.
 */
export type FinalizationOutcome =
  | { kind: "resolved"; result: ExecutionResult | null }
  | {
      kind: "unfinalized";
      git: Extract<GitReadiness, { kind: "finalization-failed" }>;
    };

export async function finalizeSavedDone(
  ctx: StageContext,
  directive: Extract<RecoveryDirective, { kind: "finalize-boundary" }>,
  preserved: AttemptRecord | undefined,
): Promise<FinalizationOutcome> {
  // A finalization directive can arise only from either attempt-referencing
  // finalization recovery, so absence here is an invalid engine entry rather
  // than a reason to approximate from another history record.
  if (preserved === undefined) {
    return {
      kind: "resolved",
      result: fatal(
        ctx,
        `The validated "${directive.recovery.kind}" recovery has no resolved attempt.`,
      ),
    };
  }
  let context: GitBoundaryContext;
  if (directive.context === "after-contract-repair") {
    const interval = attemptInterval(preserved);
    if (!interval.ok) {
      return { kind: "resolved", result: fatal(ctx, interval.message) };
    }
    context = {
      kind: "after-contract-repair",
      attempt: interval.value,
      pausedAtHead: directive.recovery.pausedAtHead,
    };
  } else {
    context = {
      kind: "boundary-retry",
      pausedAtHead: directive.recovery.pausedAtHead,
    };
  }
  const finalization = await ctx.finalizeBoundary({
    repoRoot: ctx.repoRoot,
    threadRelPath: ctx.threadRelPath,
    threadFolder: ctx.threadFolder,
    policy: ctx.stage.gitPolicy,
    context,
  });

  // What a human did to the tip across the pause is evidence the reader is
  // owed and no policy forbids.
  const moved =
    finalization.kind === "git-error"
      ? undefined
      : finalization.headMovedWhilePaused;
  if (moved !== undefined) {
    ctx.display.warn(
      `HEAD moved while the run was paused (${moved.pausedAtHead} → ${moved.observedHead}); this is diagnostic only and is not a policy violation.`,
    );
  }

  if (finalization.kind !== "finalized") {
    const failedWithoutObservation = finalization.kind === "git-error";
    return {
      kind: "unfinalized",
      git: {
        kind: "finalization-failed",
        failure:
          finalization.kind === "git-policy-violation"
            ? {
                kind: "git-policy-violation",
                treatment:
                  finalization.cause === "head-rule"
                    ? "advisory-head-movement"
                    : "blocking",
              }
            : finalization.kind === "git-error"
              ? { kind: "git-error" }
              : { kind: "commit-error" },
        message: failedWithoutObservation
          ? `Git finalization failed during ${finalization.phase}: ${finalization.message}`
          : finalization.message,
        observedHead: failedWithoutObservation
          ? directive.recovery.pausedAtHead
          : finalization.headAfterFinalization,
      },
    };
  }

  // Success: flip the preserved DONE attempt from waiting to done over the tip
  // this finalization left it at, clear waiting, then apply the declared
  // resolution when the attempt listed pending files, else the normal
  // successful-stage advance.
  const finalized: Transition = {
    kind: "finalize-preserved-done",
    attempt: {
      ...preserved,
      result: "done",
      headAfterAttempt: finalization.headAfterFinalization,
    },
  };
  const hadPending = (preserved.pendingFiles?.length ?? 0) > 0;
  if (hadPending && ctx.stage.queueResolution === "rerun") {
    return {
      kind: "resolved",
      result: await commitCursor(ctx, finalized, { kind: "become-ready" }),
    };
  }
  return {
    kind: "resolved",
    result: await commitCursor(ctx, finalized, { kind: "advance" }),
  };
}
