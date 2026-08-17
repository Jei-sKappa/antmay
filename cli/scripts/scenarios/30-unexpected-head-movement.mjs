import { printedResumeCommand } from "../demo/markers.mjs";
import { commitAll } from "../demo/fixture.mjs";
import { pipelineDocument, simulatedRun } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A `spec` attempt writes its promised artifact and commits it while the
 * simulated harness is still active. The stage forbids HEAD movement, so the run
 * ends on the distinct advisory pause with the attempt's commit range and the
 * next resume's acceptance semantics.
 */
export default {
  label:
    "A stage commits unexpectedly — ends on the advisory HEAD-movement pause",
  note:
    "The fixture commits the simulated stage's spec while that attempt is still " +
    "running, imitating a stage-owned commit under a policy that forbids it.",
  pipeline: pipelineDocument("unexpected-head-movement", ["spec"]),
  scenario: simulatedRun(["spec"], {
    spec: ["spec-correct-delayed"],
  }),
  steps: [
    run({
      expectExit: 2,
      afterMs: 1000,
      markers: [
        "HEAD MOVED — review advised",
        "The stage produced a commit even though its Git policy does not expect one",
        "Stage 1/1 paused in",
        printedResumeCommand,
      ],
      during: (ctx) => {
        commitAll(ctx, "docs: stage committed its own spec");
      },
    }),
  ],
};
