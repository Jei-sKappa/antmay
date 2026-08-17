import { appendFileSync, rmSync } from "node:fs";
import path from "node:path";

import { printedResumeCommand } from "../demo/markers.mjs";
import { commitAll, threadPath, writeThreadFile } from "../demo/fixture.mjs";
import { pipelineDocument, simulatedRun } from "../demo/pipeline.mjs";
import { action, run } from "../demo/steps.mjs";

/**
 * The artifact state a stage requires is gone by the time that stage is reached.
 * Ends on the `STAGE CANNOT START — requirements not met` banner, which names
 * the affected stage and shows its current and required thread files, cause,
 * result, and recovery. It is printed before the stage allocates an attempt or
 * contacts an agent.
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
  label:
    "A prerequisite disappears mid-run — identifies the stage and pauses before it",
  note:
    "The plan this run needs is deleted while the first stage is still " +
    "running, so the second stage meets a prerequisite that held at preflight " +
    "and no longer does.",
  pipeline: pipelineDocument("brief-implement", ["spec", "implement"]),
  scenario: simulatedRun(["spec", "implement"], {
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
      // The delete must land inside the window `spec-correct-delayed` holds
      // open once it has written the spec: above the cost of preflight, and
      // below the moment that case settles. This value clears preflight and
      // leaves the widest margin at the far end, and
      // `src/harness/adapters/simulated/demo-timing.test.ts` holds it under
      // the case's delay constant under the test gate.
      //
      // Either miss fails the demo rather than passing it on another scenario's
      // rendering. Landing too early puts the delete ahead of preflight, so
      // composition finds `implement`'s prerequisite already gone and the run
      // refuses at exit 1. Landing too late lets `spec` settle and `implement`
      // recheck its prerequisite while the plan is still there, so both stages
      // complete at exit 0. This step declares exit 2, which neither produces.
      afterMs: 1000,
      markers: [
        "STAGE CANNOT START — requirements not met",
        "Plan requirement",
        'The pipeline passed preflight, but the thread\'s plan no longer matches what stage 2 "implement" requires.',
        printedResumeCommand,
      ],
      during: (ctx) => {
        rmSync(threadPath(ctx, "plan.md"));
      },
    }),
  ],
};
