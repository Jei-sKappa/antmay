import { standardScenario } from "../demo/recipe.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A stage reports BLOCKED *and* leaves a decision queued, so two reasons hold at
 * once. Ends on the `Run stopped for 2 reasons:` header followed by both
 * banners — the stage's own above the queue's, which is the only place that
 * ordering is visible.
 */
export default {
  label: "BLOCKED with a queued decision — ends on two stacked reason banners",
  scenario: standardScenario({
    "review-spec": ["outcome-blocked-pending-decision"],
  }),
  steps: [run({ expectExit: 2 })],
};
