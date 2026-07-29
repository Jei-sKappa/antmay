import { standardScenario } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * Every list or freeform value in the closing block at its widest: a long
 * `Detail`, several long-named pending files across both queues, and tool-call
 * arguments past the 160-character display limit that the renderer truncates
 * with an ellipsis.
 *
 * This is the scenario to check the shared alignment column and terminal
 * wrapping against — none of the others push any value wide enough to break it.
 */
export default {
  label: "Long detail, paths and tool arguments — stresses wrapping",
  scenario: standardScenario({
    "reconcile-spec": ["outcome-blocked-long-detail"],
  }),
  steps: [run({ expectExit: 2 })],
};
