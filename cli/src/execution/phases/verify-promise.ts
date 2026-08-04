import type { AttemptReference, WaitingInfo } from "../../state/checkpoint.js";
import type { ArtifactMismatch } from "../../thread/artifacts.js";
import { evaluatePromisedState } from "../../thread/artifacts.js";
import type { StageContext } from "../context.js";
import { Pause } from "../pause.js";

/**
 * The promise a recognized `DONE` makes, checked before anything acts on it.
 *
 * A `DONE` claims the stage's promised artifact state, so that claim is verified
 * against freshly inspected concrete state **before** the Git boundary is looked
 * at. Nothing downstream — Git evaluation, the executor commit, the stage
 * advance, the queue resolution — runs on an unmet promise; the completed attempt
 * is preserved instead, so a human repair can finalize it later without running
 * the stage again.
 */

/**
 * What a violated promise needs from the attempt that made it, so its pause
 * keeps that attempt finalizable.
 */
export type DoneObservation = {
  /** Which attempt made the claim. */
  attempt: AttemptReference;
  /**
   * The tip observed once the attempt settled. This stage's boundary is never
   * reached, so the finalization a repair unlocks is the one and only judgement
   * of the stage's `HEAD` rule — and what that rule judges is the preserved
   * attempt's own movement, which is exactly what its two observations record.
   */
  pausedAtHead: string;
  /** The post-attempt queue observation, reported alongside the violation. */
  pendingFiles: string[];
  queueScanError: string | null;
};

/**
 * Why a recognized `DONE`'s promised artifact state was not accepted: it was
 * evaluated and came back unmet, or the thread could not be read to evaluate it
 * at all. Both preserve the completed attempt, and they are worded differently.
 */
type PromiseViolation =
  | { kind: "unmet"; unmet: ArtifactMismatch[] }
  | { kind: "uninspectable"; message: string };

export type PromiseVerdict =
  | { kind: "kept" }
  | { kind: "violated"; waiting: WaitingInfo };

export async function verifyPromisedState(
  ctx: StageContext,
  observed: DoneObservation,
): Promise<PromiseVerdict> {
  const inspection = await ctx.inspectArtifacts(ctx.repoRoot, ctx.threadRelPath);
  let violation: PromiseViolation | null = null;
  if (!inspection.ok) {
    // No end-to-end path reaches this branch, and none is expected to. An
    // inspection fails only when the thread directory cannot be read at all,
    // preflight refuses to start a run whose thread it cannot inspect, and
    // nothing the executor, a stage's skill, or a boundary commit does
    // revokes that readability mid-run — so producing it takes an outside
    // actor, and a test for it would have to fabricate a state the system
    // does not reach. It is written anyway because pausing is the
    // fail-closed direction: a promise that could not be evaluated is never
    // credited as kept, so an unreadable thread stops the pipeline with the
    // completed attempt preserved rather than advancing past it.
    violation = { kind: "uninspectable", message: inspection.message };
  } else {
    const unmet = evaluatePromisedState(inspection.state, ctx.stage.promises);
    if (unmet.length > 0) violation = { kind: "unmet", unmet };
  }
  if (violation === null) return { kind: "kept" };
  return {
    kind: "violated",
    waiting:
      violation.kind === "unmet"
        ? Pause.contractViolated({ ...observed, unmet: violation.unmet })
        : Pause.contractUninspectable({
            ...observed,
            message: violation.message,
          }),
  };
}
