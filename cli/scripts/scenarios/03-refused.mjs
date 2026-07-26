import { standardScenario } from "../demo/recipe.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A stage reports REFUSED with an empty queue and the run stops there. Ends on
 * the `REFUSED` banner and its `Detail` line, under a `refused` stage footer.
 */
export default {
  label: "A stage reports REFUSED — ends on the REFUSED banner",
  scenario: standardScenario({ "review-spec": ["outcome-refused"] }),
  steps: [run({ expectExit: 2 })],
};
