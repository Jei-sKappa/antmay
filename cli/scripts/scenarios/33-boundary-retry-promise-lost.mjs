import { rmSync } from "node:fs";

import { git, rejectCommitSubject, threadPath } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * A boundary retry that finds the promise it was accepted on no longer holds.
 * The promised artifact is rechecked before the boundary is touched, so the pause
 * returns to contract repair — without discarding the saved `DONE`, which the
 * `Detail:` line says outright.
 *
 * That detail is the difference from `24-contract-repair-pending`: this promise
 * is unmet over a *clean* worktree, and it stays paused anyway, because the
 * attempt it is holding can still be finalized once the artifact is back.
 *
 * The action reverts the attempt's unvalidated changes — one of the two things
 * the earlier pause's instruction offered — which is exactly what takes the
 * promise away.
 */

/** What the fixture's hook refuses, and what it says when it does. */
const REJECTED = "commit-msg hook: the plan commit is rejected by this fixture";

export default {
  label: "A retried boundary whose promise is gone — returns to contract repair",
  note:
    "Two invocations: the first leaves a refused boundary holding a saved DONE, " +
    "and the second resumes after the promised plan has been reverted.",
  scenario: standardScenario(),
  steps: [
    action("Install a commit-msg hook that rejects the plan commit", (ctx) => {
      rejectCommitSubject(ctx, { match: "): plan$", message: REJECTED });
    }),
    run({
      expectExit: 2,
      markers: ["FAILED — commit failed", "Stage 4/6 failed in", printedResumeCommand],
    }),
    action("Revert the attempt's unvalidated plan", (ctx) => {
      rmSync(threadPath(ctx, "plan.md"));
      rmSync(threadPath(ctx, "plan-tasks"), { recursive: true });
      // The failed boundary left them staged and never committed, so dropping
      // them from the index is what returns the worktree to clean.
      git(ctx, ["add", "-A"]);
    }),
    resume({
      expectExit: 2,
      markers: [
        "The stage reported DONE and the artifact state it promises is still missing",
        "The saved DONE remains preserved until the promised artifact is repaired",
        printedResumeCommand,
      ],
    }),
  ],
};
