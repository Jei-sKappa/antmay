import { writeFileSync } from "node:fs";
import path from "node:path";

import { printedResumeCommand } from "../demo/markers.mjs";
import { commitAll, git, writeThreadFile } from "../demo/fixture.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * A paused run finds that its temporary workspaces have become unsafe before
 * resume. The final invocation renders the same problem and correction groups
 * as new-run preflight, but identifies the durable run and states that its
 * checkpoint stayed unchanged, no lock was acquired, and no stage ran.
 *
 * The first invocation is necessary because resume has to name a real durable
 * run. It blocks without changing the repository; the action then removes two
 * ignore rules and commits tracked content under the third workspace.
 */

const OUTCOME = "# Implementer Outcome — Task 01\n\nStatus: DONE\n";
const TRACKED = ".implementation-runs/260101000000Z-demo/task-01/01-outcome.md";

export default {
  label: "Unsafe temporary workspaces — ends on the structured resume refusal",
  note:
    "The first invocation creates a durable blocked run. The repository becomes " +
    "unsafe while it is paused, so resume can show its run-specific refusal.",
  scenario: standardScenario({ spec: ["outcome-blocked"] }),
  steps: [
    run({
      expectExit: 2,
      markers: [
        "BLOCKED",
        "Fake pause; no files changed",
        "Stage 1/6 blocked in",
        printedResumeCommand,
      ],
    }),
    action(
      "Drop two workspace ignore rules and commit content under the third",
      (ctx) => {
        writeFileSync(path.join(ctx.repoRoot, ".gitignore"), ".implementation-runs/\n");
        const tracked = writeThreadFile(ctx, TRACKED, OUTCOME);
        git(ctx, ["add", "-f", "--", tracked]);
        commitAll(ctx, "chore: make temporary workspaces unsafe while paused");
      },
    ),
    resume({
      expectExit: 1,
      markers: [
        "Run cannot resume",
        "Temporary workspace Git safety",
        "Checkpoint unchanged. No lock was acquired and no stage was run.",
        printedResumeCommand,
      ],
    }),
  ],
};
