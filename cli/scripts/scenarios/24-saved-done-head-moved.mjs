import { writeFileSync } from "node:fs";
import path from "node:path";

import { git, writeThreadFile } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { pipelineDocument, simulatedRun } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * The display's out-of-band `warning:` line — the one rendering that is neither a
 * pause nor a closing block, and the only yellow line that appears mid-stream.
 *
 * A human who repairs a promise across a pause may commit other things while they
 * are in there, and the finalization reports that movement rather than judging
 * it: the stage's `HEAD` rule governs its own attempt's interval, not what a
 * human did while the run was stopped. So the warning is followed by a normal
 * completion.
 *
 * The repair itself is left uncommitted, exactly as in `23-saved-done-recovery`,
 * because the boundary this stage never reached is what commits it — a commit of
 * its own would leave that boundary empty.
 */

const SPEC = `# Spec

Repaired by hand while the run was paused, so the saved DONE can be finalized.
`;

export default {
  label: "HEAD moved while paused — the finalization warns and completes",
  note:
    "Two invocations: the first pauses on the artifact contract, and the second " +
    "resumes after a hand commit moved HEAD across the pause.",
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
    action("Repair the promise, and commit something else across the pause", (ctx) => {
      writeThreadFile(ctx, "spec.md", SPEC);
      const note = path.join(ctx.repoRoot, "NOTES.md");
      writeFileSync(note, "Committed by hand while the run was paused.\n");
      // Only the note is committed: the repaired spec has to stay uncommitted
      // for the stage's own boundary to have something to commit.
      git(ctx, ["add", "--", note]);
      git(ctx, ["commit", "--quiet", "-m", "docs: a human commit across the pause"]);
    }),
    resume({
      expectExit: 0,
      markers: [
        "warning: HEAD moved while the run was paused",
        "this is diagnostic only and is not a policy violation",
        "SUCCESS — 1/1 stages completed",
      ],
    }),
  ],
};
