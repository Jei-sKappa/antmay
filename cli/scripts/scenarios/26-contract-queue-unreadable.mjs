import { chmodThreadPath } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { pipelineDocument, scriptedRun } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * A failed queue scan at a pause that is holding a saved `DONE` for
 * finalization. Ends with the contract reason still governing and the scan
 * diagnostic recorded behind it — the opposite of `34-failed-queue-scan`, where
 * the scan failure replaces the pause's whole explanation. Downgrading this pause
 * to a gate error would describe away the saved `DONE` it is holding, so the
 * ordering of the two reasons is the whole point of the screen.
 *
 * The `Next:` instruction stays the contract one, naming the two recoveries a
 * later resume can still take.
 */
export default {
  label: "Unreadable queue at a contract pause — keeps the contract reason governing",
  note:
    "Two invocations: the first pauses on the artifact contract, and the second " +
    "resumes with the thread's queue unreadable.",
  pipeline: pipelineDocument("spec-only", ["spec"]),
  scenario: scriptedRun(["spec"], { spec: ["outcome-done"] }),
  steps: [
    run({
      expectExit: 2,
      markers: [
        "FAILED — promised artifact state unmet",
        "expected a non-empty spec.md, found no spec.md",
        printedResumeCommand,
      ],
    }),
    action("Make the thread's .pending-decisions/ unreadable", (ctx) => {
      ctx.onCleanup(chmodThreadPath(ctx, ".pending-decisions", 0o000));
    }),
    resume({
      expectExit: 2,
      markers: [
        "Run stopped for 2 reasons:",
        "The stage reported DONE without leaving the artifact state it promises",
        "FAILED — queue scan error",
        "Repair the promised artifact and resume to finalize the completed attempt",
        printedResumeCommand,
      ],
    }),
  ],
};
