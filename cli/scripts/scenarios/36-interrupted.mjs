import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A signal arrives while a stage is still working. Ends on the `INTERRUPTED`
 * pause banner under an `interrupted` stage footer, having first printed the
 * handler's own "finishing the current attempt" notice to stderr.
 *
 * The stage runs a case that does nothing but wait, so the signal always lands
 * mid-attempt rather than racing the stage to completion.
 */
export default {
  label: "SIGINT during a stage — ends on the INTERRUPTED banner",
  scenario: standardScenario({ "review-spec": ["harness-hang"] }),
  steps: [
    run({
      expectExit: 130,
      afterMs: 2500,
      markers: [
        "INTERRUPTED",
        "The attempt was interrupted before producing a terminal outcome.",
        "Stage 3/6 interrupted in",
        "Received SIGINT; finishing the current attempt and pausing.",
        printedResumeCommand,
      ],
      during: (_ctx, child) => {
        child.kill("SIGINT");
      },
    }),
  ],
};
