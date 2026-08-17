import { printedResumeCommand } from "../demo/markers.mjs";
import { writeThreadFile } from "../demo/fixture.mjs";
import { pipelineDocument, simulatedRun } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * The recovery on the other side of a contract pause: the human writes the
 * artifact the attempt promised, and resume finalizes that saved `DONE` instead
 * of running the stage again. Ends on the completion summary, whose stage count
 * is reached with one attempt — the agent is never invoked a second time.
 *
 * The first invocation is the pause itself, produced by the case that claims
 * DONE while changing nothing. The action then writes `spec.md` and leaves it
 * uncommitted, which is what a repair looks like: the boundary this stage never
 * reached is what commits it.
 */

const SPEC = `# Spec

Repaired by hand while the run was paused, so the saved DONE can be finalized.
`;

export default {
  label: "Repaired promise finalizes the saved DONE — ends on the run summary",
  note:
    "The first invocation pauses on the artifact contract, so the repair has a " +
    "saved DONE attempt to finalize. Resume makes no harness call.",
  pipeline: pipelineDocument("spec-only", ["spec"]),
  scenario: simulatedRun(["spec"], { spec: ["outcome-done"] }),
  steps: [
    run({
      expectExit: 2,
      markers: [
        "FAILED — promised artifact state unmet",
        "expected a non-empty spec.md, found no spec.md",
        printedResumeCommand,
      ],
    }),
    action("Write the promised spec.md and leave it uncommitted", (ctx) => {
      writeThreadFile(ctx, "spec.md", SPEC);
    }),
    resume({ expectExit: 0, markers: ["SUCCESS — 1/1 stages completed"] }),
  ],
};
