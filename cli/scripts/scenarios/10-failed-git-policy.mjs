import { standardScenario } from "../demo/recipe.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A stage reports DONE having changed nothing, at a stage whose Git policy
 * requires a change. The terminal outcome parses, so the boundary is evaluated
 * and rejects it. Ends on the `FAILED — git policy violation` banner, which is
 * also where the `Next:` unvalidated-changes instruction shows up.
 */
export default {
  label: "DONE that changed nothing — ends on the git-policy banner",
  scenario: standardScenario({ "plan-strict": ["outcome-done"] }),
  steps: [run({ expectExit: 2 })],
};
