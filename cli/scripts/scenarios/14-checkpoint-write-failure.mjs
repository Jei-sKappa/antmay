import { standardScenario } from "../demo/recipe.mjs";
import { chmodPath } from "../demo/fixture.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * The executor cannot persist its own state and ends without pausing safely.
 * Ends on the `FAILED — checkpoint write` block — the fourth and rarest of the
 * closing blocks, and the only one that deliberately prints no resume command,
 * because the checkpoint on disk no longer reflects where the run stood.
 *
 * A run pauses first so a run directory exists to revoke; the resume then fails
 * on the first checkpoint write of its fresh attempt.
 */
export default {
  label: "State cannot be persisted — ends on the checkpoint-write block",
  note:
    "Two invocations, out of necessity: there is no run directory to revoke " +
    "write permission on until a run exists. The first run pauses; the " +
    "directory is made read-only; the resume fails on its first checkpoint " +
    "write.",
  scenario: standardScenario({ "review-spec": ["outcome-blocked"] }),
  steps: [
    run({ expectExit: 2 }),
    action("Revoke write permission on the run directory", (ctx) => {
      ctx.onCleanup(chmodPath(ctx.runDir(), 0o555));
    }),
    resume({ expectExit: 1 }),
  ],
};
