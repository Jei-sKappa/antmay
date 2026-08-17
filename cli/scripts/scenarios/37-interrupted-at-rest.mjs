import { printedResumeCommand } from "../demo/markers.mjs";
import { pipelineDocument, simulatedRun } from "../demo/pipeline.mjs";
import { resume, run, signalOnOutput } from "../demo/steps.mjs";

/**
 * A signal that arrives while the checkpoint is durably at rest. Ends on the
 * at-rest `INTERRUPTED` summary: one reason sentence saying the checkpoint is
 * unchanged, and a single `Resume` line — no `Log:`, no `Continue:`, and no
 * unvalidated-changes instruction, because no attempt of this invocation was ever
 * launched and nothing needs disposing of.
 *
 * `36-interrupted` ends on the same banner drawn by a different renderer: there
 * the signal aborted a live attempt, so the run pauses on a reason of its own.
 * Here there is nothing to abort.
 *
 * The window this needs is between two of the executor's own steps and is far too
 * narrow for a timer measured from process spawn, so the signal is sent the moment
 * the resume finishes printing its run details — the last thing it writes before
 * the engine looks at the signal.
 */
export default {
  label: "A signal at rest — ends on the at-rest INTERRUPTED summary",
  note:
    "Two invocations: the first leaves a durably paused run, and the second is " +
    "signalled as soon as it has printed its run details, before it starts a stage.",
  pipeline: pipelineDocument("spec-only", ["spec"]),
  scenario: simulatedRun(["spec"], { spec: ["outcome-blocked", "spec-correct"] }),
  steps: [
    run({
      expectExit: 2,
      markers: ["BLOCKED", "Stage 1/1 blocked in", printedResumeCommand],
    }),
    resume({
      expectExit: 130,
      // Early enough that the listener is watching before any output arrives.
      afterMs: 50,
      during: (_ctx, child) => {
        signalOnOutput(child, { text: "1. spec", signal: "SIGINT" });
      },
      markers: [
        "INTERRUPTED",
        "Stopped by SIGINT between stages; the checkpoint is unchanged.",
        printedResumeCommand,
      ],
    }),
  ],
};
