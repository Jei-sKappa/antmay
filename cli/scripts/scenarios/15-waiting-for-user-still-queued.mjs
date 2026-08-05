import { writeThreadFile } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * A resume that finds the queue still holding the run. Ends on the same
 * `WAITING FOR USER` banner the pause was recorded with, restated over the files
 * this resume's own scan just found — which is the point: the list is re-derived
 * rather than replayed, so the reader is told what the thread owes *now*.
 *
 * The action queues a second bundle instead of resolving the first, so the
 * refreshed count and the second path are visible evidence of the rescan. This
 * resume writes no checkpoint and restamps nothing: the run is left exactly as
 * recoverable as it was found.
 */
export default {
  label: "Resume with the queue still held — restates the freshly scanned list",
  note:
    "Two invocations: the first pauses at the queue gate after a DONE stage, and " +
    "the second resumes with the bundle still unresolved and one more queued.",
  scenario: standardScenario({
    "reconcile-spec": ["reconcile-spec-pending-decision"],
  }),
  steps: [
    run({
      expectExit: 2,
      markers: ["WAITING FOR USER", "Stage 2/6 done in", printedResumeCommand],
    }),
    action("Queue a second bundle instead of resolving the first", (ctx) => {
      writeThreadFile(
        ctx,
        ".pending-reviews/second-fake-review.md",
        "# Review\n\nA second fake bundle, queued while the run was paused.\n",
      );
    }),
    resume({
      expectExit: 2,
      markers: [
        "WAITING FOR USER",
        "2 pending bundle files await human resolution.",
        "second-fake-review.md",
        printedResumeCommand,
      ],
    }),
  ],
};
