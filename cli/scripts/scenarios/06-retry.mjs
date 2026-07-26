import { standardScenario } from "../demo/pipeline.mjs";
import { resume, run } from "../demo/steps.mjs";

/**
 * The one scenario that resumes. A stage blocks, the resume reruns it, and the
 * retry's header carries the `· attempt 2` suffix an ordinary first attempt
 * never shows. Ends on `SUCCESS`, so the retry header and the stages after it
 * are the last thing on screen.
 */
export default {
  label: "A blocked stage is resumed — shows the '· attempt 2' retry header",
  scenario: standardScenario({
    "reconcile-spec": ["outcome-blocked", "reconcile-spec-correct"],
  }),
  steps: [run({ expectExit: 2 }), resume({ expectExit: 0 })],
};
