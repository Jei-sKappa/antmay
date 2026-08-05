import { chmodThreadPath, removeStaleLocks } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * The pre-attempt gate cannot evaluate the invariant at all, because the queue
 * itself is unreadable. Ends on the `FAILED — queue scan error` banner with the
 * raw filesystem diagnostic and nothing else: no `Log:`, no `Continue:`, and no
 * `Next:` instruction, because nothing was allocated and no attempt left changes
 * for a human to dispose of.
 *
 * The shape is `19-queue-gate-blocked`'s — an abandoned run whose lock is removed
 * by hand, so the resume reaches the gate with no recovery to decide from — with
 * the queue made unreadable instead of filled. The mode is restored afterwards so
 * the temporary tree stays removable.
 */
export default {
  label: "Unreadable queue at the pre-attempt gate — ends on the scan-error banner",
  note:
    "Three steps: the first invocation is killed outright to leave an abandoned " +
    "run, the stale lock is then removed by hand and the queue made unreadable, " +
    "and the resume meets the gate before starting a stage.",
  scenario: standardScenario({ "review-spec": ["harness-hang"] }),
  steps: [
    run({
      expectExit: 137,
      afterMs: 2500,
      during: (_ctx, child) => {
        child.kill("SIGKILL");
      },
      markers: ["Stage 3/6 · review-spec", "Making no changes."],
    }),
    action("Remove the abandoned run's lock and make the queue unreadable", (ctx) => {
      removeStaleLocks(ctx);
      ctx.onCleanup(chmodThreadPath(ctx, ".pending-decisions", 0o000));
    }),
    resume({
      expectExit: 2,
      markers: [
        "FAILED — queue scan error",
        "The advancement invariant could not be evaluated because the pending-queue scan failed",
        printedResumeCommand,
      ],
    }),
  ],
};
