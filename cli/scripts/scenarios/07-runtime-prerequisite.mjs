import { appendFileSync, rmSync } from "node:fs";
import path from "node:path";

import { commitAll, threadPath, writeThreadFile } from "../demo/fixture.mjs";
import { pipelineDocument, scriptedRun } from "../demo/pipeline.mjs";
import { action, run } from "../demo/steps.mjs";

/**
 * The artifact state a stage requires is gone by the time that stage is reached.
 * Ends on the `FAILED — stage prerequisite unmet` banner and its `Artifacts:`
 * list, printed before the stage allocates an attempt or contacts an agent —
 * so no stage header sits between the banner and the stage that never ran.
 *
 * The pipeline is `spec` then `implement`, and `implement` requires a brief
 * plan. The fixture starts with one, so preflight composes the whole pipeline
 * happily; the plan is then deleted while the `spec` stage is still in flight,
 * which is what the deliberately delayed spec case is for. The plan is
 * gitignored, so its disappearance is invisible to Git and the spec stage's own
 * boundary still commits exactly `spec.md`: the run reaches the second stage
 * with a clean tree and a prerequisite that no longer holds.
 */

/** The plan the fixture starts with and the run loses partway through. */
const BRIEF_PLAN = "# Plan: Fake\n\nA brief plan with no task files.\n";

export default {
  label: "A prerequisite disappears mid-run — ends on the prerequisite banner",
  note:
    "The plan this run needs is deleted while the first stage is still " +
    "running, so the second stage meets a prerequisite that held at preflight " +
    "and no longer does.",
  pipeline: pipelineDocument("brief-implement", ["spec", "implement"]),
  scenario: scriptedRun(["spec", "implement"], {
    spec: ["spec-correct-delayed"],
  }),
  steps: [
    action("Add a gitignored brief plan.md to the thread", (ctx) => {
      // Ignored first and committed on its own, so writing the plan leaves the
      // worktree clean and deleting it later is not a Git change at all.
      appendFileSync(path.join(ctx.repoRoot, ".gitignore"), "plan.md\n");
      commitAll(ctx, "chore: ignore the fixture's brief plan");
      writeThreadFile(ctx, "plan.md", BRIEF_PLAN);
    }),
    run({
      expectExit: 2,
      // The delete must land inside `spec-correct-delayed`'s 3 s window, which
      // opens once the spec is written — so any value above the cost of
      // preflight works, and the low one leaves the widest margin. Landing
      // after the window instead lets `spec` finish, and the run then ends on
      // the postcondition banner `08-stage-contract-violation` owns: still
      // exit 2, so the demo would still say `[PASS]` while showing the wrong
      // rendering.
      afterMs: 1000,
      during: (ctx) => {
        rmSync(threadPath(ctx, "plan.md"));
      },
    }),
  ],
};
