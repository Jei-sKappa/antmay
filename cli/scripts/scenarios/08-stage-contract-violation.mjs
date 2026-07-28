import { pipelineDocument, scriptedRun } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A stage reports DONE without leaving the artifact state it promises. Ends on
 * the `FAILED — promised artifact state unmet` banner, its `Artifacts:` list of
 * expected-against-found dimensions, and the repair-or-revert instruction that
 * names the two recoveries a resume can take.
 *
 * The pipeline is the `spec` stage alone, driven by the case that changes
 * nothing and claims DONE anyway. The promised state is checked before the Git
 * boundary is looked at, so the run stops here rather than on the empty diff a
 * `changeRequired` policy would otherwise reject.
 */
export default {
  label: "DONE without the promised artifact — ends on the contract banner",
  pipeline: pipelineDocument("spec-only", ["spec"]),
  scenario: scriptedRun(["spec"], { spec: ["outcome-done"] }),
  steps: [run({ expectExit: 2 })],
};
