import { chmodPath } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { pipelineDocument, scriptedRun } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A recognized `DONE` whose promised artifact state could not be read at all.
 * Ends on the contract banner worded as *could not be verified* rather than as
 * unmet — the distinction that keeps the completed attempt preserved, because a
 * promise nobody could evaluate is never credited as kept and never discarded on
 * that basis either.
 *
 * The thread directory is made unreadable while the delayed `spec` attempt is
 * still in flight, after that case has written its spec. An unreadable thread is
 * also an unscannable queue, so the same permission produces the queue-scan
 * reason stacked beneath the contract one, and the screen reports both.
 */
export default {
  label: "DONE whose promise cannot be read — ends on the unverifiable contract",
  note:
    "The thread directory becomes unreadable while the first stage is still " +
    "running, so the promise it reported DONE on cannot be checked either way.",
  pipeline: pipelineDocument("spec-only", ["spec"]),
  scenario: scriptedRun(["spec"], { spec: ["spec-correct-delayed"] }),
  steps: [
    run({
      expectExit: 2,
      // Inside the window the delayed case holds open once it has written the
      // spec: late enough to clear preflight, early enough that the attempt has
      // not settled. `29-unexpected-head-movement` fires in the same window.
      afterMs: 1000,
      during: (ctx) => {
        ctx.onCleanup(chmodPath(ctx.threadRoot, 0o000));
      },
      markers: [
        "Run stopped for 2 reasons:",
        "FAILED — promised artifact state unmet",
        "The stage reported DONE but its promised artifact state could not be verified",
        "FAILED — queue scan error",
        printedResumeCommand,
      ],
    }),
  ],
};
