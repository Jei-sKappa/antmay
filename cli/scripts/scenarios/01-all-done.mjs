import { standardScenario } from "../demo/recipe.mjs";
import { run } from "../demo/steps.mjs";

/**
 * Nothing goes wrong. Ends on the `SUCCESS` block, having rendered the startup
 * details, six stage headers, live agent output behind the gutter — both prose
 * lines and tool calls — and six green stage footers.
 */
export default {
  label: "Everything correct — six stages, ends on SUCCESS",
  scenario: standardScenario(),
  steps: [run({ expectExit: 0 })],
};
