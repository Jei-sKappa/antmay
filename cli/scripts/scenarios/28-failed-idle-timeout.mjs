import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * The agent goes quiet for longer than the stage's idle timeout allows. Ends on
 * the `FAILED — idle timeout` banner, which reads differently from an ordinary
 * harness error and is classified separately.
 */
export default {
  label: "The agent goes quiet — ends on the idle-timeout banner",
  scenario: standardScenario({ "review-spec": ["harness-idle-timeout"] }),
  steps: [
    run({
      expectExit: 2,
      markers: [
        "FAILED — idle timeout",
        "the agent produced no output within the idle timeout",
        printedResumeCommand,
      ],
    }),
  ],
};
