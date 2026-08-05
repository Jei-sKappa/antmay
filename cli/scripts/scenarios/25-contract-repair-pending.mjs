import { dirtyWorktree } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { pipelineDocument, scriptedRun } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * The other side of `23-saved-done-recovery`: the human did not repair the
 * promise, and the worktree holds uncommitted work. Ends on the contract banner
 * worded over the *freshly observed* mismatch, with the `Detail:` line that says
 * why the stage was not simply run again — those changes are the attempt's own,
 * and no executor may discard them.
 *
 * A clean worktree at this point would have started a fresh attempt instead, so
 * the dirty tree is what this scenario exists to show. The pause is exempt from
 * the resume clean-worktree rule precisely because the repair it waits for
 * arrives uncommitted.
 */
export default {
  label: "Unrepaired promise with a dirty worktree — stays paused for the human",
  note:
    "Two invocations: the first pauses on the artifact contract, and the second " +
    "resumes with the promise still unmet and uncommitted work in the tree.",
  pipeline: pipelineDocument("spec-only", ["spec"]),
  scenario: scriptedRun(["spec"], { spec: ["outcome-done"] }),
  steps: [
    run({
      expectExit: 2,
      markers: [
        "FAILED — promised artifact state unmet",
        "expected a non-empty spec.md, found no spec.md",
        printedResumeCommand,
      ],
    }),
    action("Leave uncommitted work without repairing the promise", (ctx) => {
      dirtyWorktree(ctx);
    }),
    resume({
      expectExit: 2,
      markers: [
        "The stage reported DONE and the artifact state it promises is still missing",
        "The worktree is dirty, so the stage was not run again",
        printedResumeCommand,
      ],
    }),
  ],
};
