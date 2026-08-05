import { pipelineDocument } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * `reconcile-plan` would receive neither a spec nor a strict plan. The spec is
 * absent before the run and unchanged; the plan is changed by `plan-brief` to
 * the wrong shape. Ends on two projection blocks with independent causes.
 */
export default {
  label: "Two inputs fail differently — ends on independent projections",
  pipeline: pipelineDocument("multiple-prerequisites", [
    "plan-brief",
    "reconcile-plan",
  ]),
  steps: [
    run({
      expectExit: 1,
      markers: [
        "Pipeline cannot start",
        '2 requirements for "reconcile-plan" are not satisfied.',
        "Spec projection",
        "Plan projection",
      ],
    }),
  ],
};
