import { DEMO_PROFILE, standardScenario } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * Nothing goes wrong. Ends on the `SUCCESS` block, having rendered the resolved
 * execution block, six stage headers, each resolved prompt as developer input,
 * live agent output behind the gutter — both prose lines and tool calls — and
 * six green stage footers.
 *
 * This is also the scenario that selects an execution profile, so the startup
 * block shows the profile summary form and a run whose stages do not all share
 * one agent: the two planning stages come from the profile and the rest from
 * settings. Every other scenario runs on `settings only`, so both forms stay
 * inspectable.
 */
export default {
  label: "Everything correct — six stages, ends on SUCCESS",
  profile: DEMO_PROFILE,
  scenario: standardScenario(),
  steps: [run({ expectExit: 0, flags: ["--profile", DEMO_PROFILE.name] })],
};
