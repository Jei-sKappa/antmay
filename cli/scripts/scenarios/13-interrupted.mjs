import { standardScenario } from "../demo/recipe.mjs";
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
      during: (_ctx, child) => {
        child.kill("SIGINT");
      },
    }),
  ],
};
