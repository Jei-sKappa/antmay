import type { AttemptInterval } from "../../gitops/boundary.js";
import type { BoundaryDisposition } from "../../runner/classify.js";
import type { StageContext } from "../context.js";
import { unexpectedHeadMovementMessage } from "../pause.js";

/**
 * The stage's Git boundary, once its promise has been verified.
 *
 * The whole protocol — status collection, policy evaluation, staging, the
 * declared commit, the final tip read — belongs to the one boundary operation.
 * This phase decides only what the run makes of its verdict: what the classifier
 * reads, whether the refusal is the advisory movement one resume may accept, and
 * where the tip now stands.
 */

export type BoundaryVerdict = {
  /** What the classifier reads to decide the attempt's single next action. */
  disposition: BoundaryDisposition;
  /** Whether the refusal is a movement one resume may accept, not a violation. */
  advisoryHeadMovement: boolean;
  /**
   * The tip the finalization left behind — the boundary commit's, when it made
   * one. A Git failure may occur before any observation exists, so it leaves the
   * tip where the attempt did.
   */
  observedHead: string;
};

export async function finalizeStageBoundary(
  ctx: StageContext,
  interval: AttemptInterval,
): Promise<BoundaryVerdict> {
  const finalization = await ctx.finalizeBoundary({
    repoRoot: ctx.repoRoot,
    threadRelPath: ctx.threadRelPath,
    threadFolder: ctx.threadFolder,
    policy: ctx.stage.gitPolicy,
    // The stage's HEAD rule judges this attempt's own movement, which is
    // exactly the interval between its two observations.
    context: { kind: "attempt", attempt: interval },
  });
  const advisoryHeadMovement =
    finalization.kind === "git-policy-violation" &&
    finalization.cause === "head-rule";
  return {
    disposition:
      finalization.kind === "finalized"
        ? { evaluated: true, ok: true }
        : {
            evaluated: true,
            ok: false,
            kind:
              finalization.kind === "git-error"
                ? "commit-error"
                : advisoryHeadMovement
                  ? "unexpected-head-movement"
                : finalization.kind,
            message:
              finalization.kind === "git-error"
                ? `Git finalization failed during ${finalization.phase}: ${finalization.message}`
                : advisoryHeadMovement
                  ? unexpectedHeadMovementMessage(interval)
                : finalization.message,
          },
    advisoryHeadMovement,
    observedHead:
      finalization.kind === "git-error"
        ? interval.headAfterAttempt
        : finalization.headAfterFinalization,
  };
}
