import { rejectCommitSubject } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { action, run } from "../demo/steps.mjs";

/**
 * A stage finalizes DONE, its changes pass the boundary, and the boundary commit
 * itself fails. Ends on the `FAILED — commit failed` banner.
 *
 * The failure comes from a `commit-msg` hook that rejects one subject and lets
 * every other through, so the stages before the plan stage commit normally and
 * the run reaches the failure with green footers above it.
 */

/** What the fixture's hook refuses, and what it says when it does. */
const REJECTED = "commit-msg hook: the plan commit is rejected by this fixture";

export default {
  label: "The boundary commit is rejected — ends on the commit-failed banner",
  scenario: standardScenario(),
  steps: [
    action("Install a commit-msg hook that rejects the plan commit", (ctx) => {
      rejectCommitSubject(ctx, { match: "): plan$", message: REJECTED });
    }),
    run({
      expectExit: 2,
      markers: ["FAILED — commit failed", REJECTED, printedResumeCommand],
    }),
  ],
};
