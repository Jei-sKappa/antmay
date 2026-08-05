import { pipelineDocument } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * `--from` names a stage the pipeline does not select. Ends on the structured
 * entry-point refusal: pipeline identity, requested entry point, complete stage
 * list, explanation, and the explicit statement that nothing ran.
 */
export default {
  label: "Unknown --from entry point — ends on the pipeline stage list",
  pipeline: pipelineDocument("invalid-entry-point", ["spec", "plan-strict"]),
  steps: [
    run({
      expectExit: 1,
      flags: ["--from", "implement"],
      markers: [
        "Pipeline cannot start",
        "The requested entry point is not selected by this pipeline.",
        "Pipeline stages:",
      ],
    }),
  ],
};
