import { standardScenario } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A stage reports BLOCKED with an empty queue and the run stops there. Ends on
 * the `BLOCKED` banner and its `Detail` line, under a `blocked` stage footer and
 * the two green footers that preceded it.
 */
export default {
  label: "A stage reports BLOCKED — ends on the BLOCKED banner",
  scenario: standardScenario({ "review-spec": ["outcome-blocked"] }),
  steps: [run({ expectExit: 2 })],
};
