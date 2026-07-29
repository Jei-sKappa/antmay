import { pipelineDocument } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * The thread starts without a plan and `spec` does not change the plan, so
 * `implement` would still lack its brief-plan prerequisite. Ends on the
 * projection branch that names earlier stages but shows no relevant transition.
 */
export default {
  label: "Later stage input stays absent — ends on the unchanged projection",
  pipeline: pipelineDocument("missing-later-prerequisite", ["spec", "implement"]),
  steps: [run({ expectExit: 1 })],
};
