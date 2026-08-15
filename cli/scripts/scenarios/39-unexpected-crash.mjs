import { standardScenario } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A defect inside antmay escapes every handler. Ends on the
 * `antmay stopped unexpectedly` block: the summary naming this a bug in antmay
 * rather than in the user's documents, what the invocation left behind, where to
 * report it, and the stack trace subordinated below all of that.
 *
 * The only scenario that reaches its rendering through a deliberate defect
 * instead of a supported failure — the `harness-crash` case throws rather than
 * reporting how the attempt ended, which nothing the executor supports does.
 * No resume command is asserted: the bootstrap never learns the run id, and that
 * absence is part of what this scenario documents.
 */
export default {
  label: "An internal defect escapes — ends on the unexpected-crash block",
  scenario: standardScenario({ "review-spec": ["harness-crash"] }),
  steps: [
    run({
      expectExit: 1,
      markers: [
        "antmay stopped unexpectedly",
        "This is a defect in antmay, not a problem with your pipeline",
        "github.com/Jei-sKappa/antmay/issues",
        "Stack trace",
      ],
    }),
  ],
};
