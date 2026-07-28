import { commitAll, writeThreadFile } from "../demo/fixture.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { action, run } from "../demo/steps.mjs";

/**
 * A stage reports DONE having changed nothing, at a stage whose Git policy
 * requires a change. The terminal outcome parses, so the boundary is evaluated
 * and rejects it. Ends on the `FAILED — git policy violation` banner, which is
 * also where the `Next:` unvalidated-changes instruction shows up.
 *
 * The plan that stage promises is committed into the fixture beforehand, so the
 * artifact contract is already satisfied and the run reaches the boundary —
 * which is the only place an empty diff is a problem.
 */

/** A strict plan: an index and at least one task file. */
const PLAN = "# Plan: Fake\n\nPlaceholder plan.\n";
const TASK = "# Task 01\n\nPlaceholder task.\n";

export default {
  label: "DONE that changed nothing — ends on the git-policy banner",
  scenario: standardScenario({ "plan-strict": ["outcome-done"] }),
  steps: [
    action("Commit the strict plan the plan stage promises", (ctx) => {
      writeThreadFile(ctx, "plan.md", PLAN);
      writeThreadFile(ctx, "plan-tasks/01-fake-task.md", TASK);
      commitAll(ctx, "docs: seed the plan the stage will not change");
    }),
    run({ expectExit: 2 }),
  ],
};
