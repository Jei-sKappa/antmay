import { rejectCommitSubject } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * A resume that retries a refused Git boundary and has it refused again. The
 * saved `DONE` stays exactly as finalizable as this resume found it: the pause
 * carries the same recovery, re-aimed at the tip this pass left behind, so a
 * third resume can try once more.
 *
 * The rejecting hook is left installed, which is the realistic case — nothing
 * about the pause tells the human what to change, so resuming without changing
 * anything is the first thing they will do. The screen a reader gets is
 * `31-failed-commit`'s, minus the stage footer above it, because no attempt ran:
 * only the boundary was retried.
 */

/** What the fixture's hook refuses, and what it says when it does. */
const REJECTED = "commit-msg hook: the plan commit is rejected by this fixture";

export default {
  label: "A retried boundary is refused again — the saved DONE stays finalizable",
  note:
    "Two invocations: the first leaves a refused boundary holding a saved DONE, " +
    "and the second retries that boundary against the hook that is still installed.",
  scenario: standardScenario(),
  steps: [
    action("Install a commit-msg hook that rejects the plan commit", (ctx) => {
      rejectCommitSubject(ctx, { match: "): plan$", message: REJECTED });
    }),
    run({
      expectExit: 2,
      markers: [
        "FAILED — commit failed",
        REJECTED,
        "Stage 4/6 failed in",
        printedResumeCommand,
      ],
    }),
    // The refreshed reason ends in a full stop where the settling one does not,
    // which is the one textual difference between this screen and the pause it
    // was resumed from.
    resume({
      expectExit: 2,
      markers: ["FAILED — commit failed", `${REJECTED}.`, printedResumeCommand],
    }),
  ],
};
