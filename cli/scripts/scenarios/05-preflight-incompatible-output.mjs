import { pipelineDocument } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * `plan-brief` would leave a brief plan while `implement-plan` requires a strict
 * one. Ends on the projection branch carrying one incompatible earlier
 * transition.
 */
export default {
  label: "Earlier output is incompatible — ends on one projected transition",
  pipeline: pipelineDocument("incompatible-output", [
    "plan-brief",
    "implement-plan",
  ]),
  steps: [run({ expectExit: 1 })],
};
