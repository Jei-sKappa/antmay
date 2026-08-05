import { writeFileSync } from "node:fs";
import path from "node:path";

import { commitAll, git, writeThreadFile } from "../demo/fixture.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { action, run } from "../demo/steps.mjs";

/**
 * The thread's temporary workspaces are not Git-safe, so preflight refuses
 * before any state, lock, checkpoint or agent effect. Ends on the structured
 * refusal — command context, the missing-coverage list with its copyable
 * `.gitignore` rules, then the tracked-content list with its copyable
 * `git rm -r --cached` command, followed by the reason and the explicit result.
 *
 * Both failure kinds are provoked at once and independently, so one invocation
 * shows both groups: the ignore rules covering `.pending-decisions/` and
 * `.pending-reviews/` are dropped, while `.implementation-runs/` keeps its rule
 * and is given committed content instead.
 *
 * The scripted document is the ordinary Standard one, and declaring it is
 * required rather than convenient: the scripted-scenario preflight loads and
 * validates it, and the executable probe runs against it, both before the
 * temporary-workspace check this scenario stops on. Without it the run exits `1`
 * on a missing `scripted-harness.json` instead, and the demo — which verifies
 * the exit code alone — reports `[PASS]` while showing a different refusal
 * entirely.
 */

/** An implementation-run outcome file, the shape that workspace really holds. */
const OUTCOME = "# Implementer Outcome — Task 01\n\nStatus: DONE\n";

/** The tracked file's thread-relative path, kept ignored and committed anyway. */
const TRACKED = ".implementation-runs/260101000000Z-demo/task-01/01-outcome.md";

export default {
  label: "Unsafe temporary workspaces — ends on the structured preflight refusal",
  scenario: standardScenario(),
  steps: [
    action(
      "Drop the ignore rules for two workspaces and commit content under the third",
      (ctx) => {
        // Only `.implementation-runs/` stays covered, so the two dropped
        // directories fail the ignore probe and it does not.
        writeFileSync(path.join(ctx.repoRoot, ".gitignore"), ".implementation-runs/\n");
        const tracked = writeThreadFile(ctx, TRACKED, OUTCOME);
        // `-f` is what gets an ignored path into the index at all — which is
        // exactly the state the tracked-content probe exists to catch.
        git(ctx, ["add", "-f", "--", tracked]);
        commitAll(ctx, "chore: track an implementation run and unignore two workspaces");
      },
    ),
    run({
      expectExit: 1,
      markers: [
        "Pipeline cannot start",
        "Temporary workspace Git safety",
        "Missing ignore coverage",
        "Tracked temporary content",
        "No run was created and no stages were run.",
      ],
    }),
  ],
};
