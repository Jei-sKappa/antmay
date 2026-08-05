import { pipelineDocument } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * `--from plan-strict` skips the `spec` stage, so its selected suffix starts
 * with a prerequisite the thread does not hold. Ends on the single-dependency
 * projection with both source-pipeline and selected-suffix positions.
 */
export default {
  label: "First selected stage lacks an input — ends on the --from projection",
  pipeline: pipelineDocument("missing-first-prerequisite", [
    "spec",
    "plan-strict",
  ]),
  steps: [
    run({
      expectExit: 1,
      flags: ["--from", "plan-strict"],
      markers: [
        "Pipeline cannot start",
        "selected stage 1 of 1 from --from plan-strict",
        "Spec projection",
        "none — this is the first selected stage",
      ],
    }),
  ],
};
