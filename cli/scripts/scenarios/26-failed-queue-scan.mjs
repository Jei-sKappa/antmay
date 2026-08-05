import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { chmodThreadPath } from "../demo/fixture.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * The pending-queue scan itself fails, so the advancement invariant cannot be
 * evaluated at all. Ends on the `FAILED — queue scan error` banner — the one
 * banner that belongs to the queue group rather than to any stage, and the one
 * pause that carries no attempt log.
 *
 * A run pauses first, because `run`'s preflight rejects an unscannable queue
 * before starting anything; making the queue unreadable while a run already
 * exists is what reaches the banner. The mode is restored afterwards so the
 * temporary tree stays removable.
 */
export default {
  label: "The queue scan fails — ends on the queue-scan-error banner",
  note:
    "Two invocations, out of necessity: `run` rejects an unscannable queue in " +
    "preflight and starts nothing, so the banner is only reachable once a run " +
    "already exists. The first run pauses; the queue is broken; the resume is " +
    "what renders the banner.",
  scenario: standardScenario({ "review-spec": ["outcome-blocked"] }),
  steps: [
    run({
      expectExit: 2,
      markers: ["BLOCKED", "Stage 3/6 blocked in", printedResumeCommand],
    }),
    action("Make the thread's .pending-decisions/ unreadable", (ctx) => {
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
