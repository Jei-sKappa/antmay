import { standardScenario } from "../demo/recipe.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A stage ends on prose instead of a terminal outcome line. Ends on the
 * `FAILED — no terminal outcome` banner, which is the only banner that quotes
 * the offending line back behind the agent gutter as a `Candidate outcome line`.
 */
export default {
  label: "No terminal outcome — ends on the quoted candidate line",
  scenario: standardScenario({ "review-spec": ["outcome-malformed"] }),
  steps: [run({ expectExit: 2 })],
};
