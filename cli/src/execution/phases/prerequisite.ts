import type { WaitingInfo } from "../../state/checkpoint.js";
import { evaluateArtifactPrerequisite } from "../../thread/artifacts.js";
import type { StageContext } from "../context.js";
import { Pause } from "../pause.js";

/**
 * The pre-attempt artifact contract: whether the stage may start at all.
 *
 * Composition proved the stage runnable against the state it simulated at
 * allocation time; the concrete state can have moved since, so it is re-inspected
 * here, immediately before every attempt. An unmet prerequisite pauses on this
 * stage having allocated no attempt, created no log, and invoked no harness.
 */

export type PrerequisiteVerdict =
  | { kind: "met" }
  | { kind: "unmet"; waiting: WaitingInfo };

export async function checkPrerequisite(
  ctx: StageContext,
): Promise<PrerequisiteVerdict> {
  const inspection = await ctx.inspectArtifacts(ctx.repoRoot, ctx.threadRelPath);
  if (!inspection.ok) {
    // A thread the artifacts cannot be read in is also a thread whose queues
    // cannot be scanned, and the queue gate runs ahead of this one — so no
    // end-to-end path reaches this branch, and no demo scenario can show it. It
    // is written anyway because pausing is the fail-closed direction: a stage
    // whose requirements could not be checked is never started on that basis.
    return {
      kind: "unmet",
      waiting: Pause.prerequisiteUninspectable({
        stagePosition: ctx.stagePosition,
        stageId: ctx.stage.id,
        message: inspection.message,
      }),
    };
  }
  const unmet = evaluateArtifactPrerequisite(
    inspection.state,
    ctx.stage.prerequisite,
  );
  if (unmet.length > 0) {
    return {
      kind: "unmet",
      waiting: Pause.prerequisiteUnmet({
        stagePosition: ctx.stagePosition,
        stageId: ctx.stage.id,
        unmet,
      }),
    };
  }
  return { kind: "met" };
}
