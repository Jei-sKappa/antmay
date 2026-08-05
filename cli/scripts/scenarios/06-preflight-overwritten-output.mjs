import { pipelineDocument } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * `plan-strict` would create the strict plan `implement-plan` needs, then
 * `plan-brief` would replace it with an incompatible brief plan. Ends on the
 * ordered multi-transition projection and its overwrite explanation.
 */
export default {
  label: "Compatible output is overwritten — ends on the transition history",
  pipeline: pipelineDocument("overwritten-output", [
    "spec",
    "plan-strict",
    "plan-brief",
    "implement-plan",
  ]),
  steps: [
    run({
      expectExit: 1,
      markers: [
        "Pipeline cannot start",
        "After stage 2 · plan-strict:",
        "After stage 3 · plan-brief:",
        "would replace the compatible plan projected after stage 2",
      ],
    }),
  ],
};
