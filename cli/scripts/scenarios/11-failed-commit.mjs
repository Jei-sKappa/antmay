import { chmodSync, writeFileSync } from "node:fs";
import path from "node:path";

import { standardScenario } from "../demo/pipeline.mjs";
import { action, run } from "../demo/steps.mjs";

/**
 * A stage finalizes DONE, its changes pass the boundary, and the boundary commit
 * itself fails. Ends on the `FAILED — commit failed` banner.
 *
 * The failure comes from a `commit-msg` hook that rejects one subject and lets
 * every other through, so the stages before the plan stage commit normally and
 * the run reaches the failure with green footers above it. The fixture points
 * `core.hooksPath` at its own directory, which is where this installs the hook.
 */
export default {
  label: "The boundary commit is rejected — ends on the commit-failed banner",
  scenario: standardScenario(),
  steps: [
    action("Install a commit-msg hook that rejects the plan commit", (ctx) => {
      const hookPath = path.join(ctx.repoRoot, ".git", "hooks-disabled", "commit-msg");
      writeFileSync(
        hookPath,
        [
          "#!/bin/sh",
          'if grep -q "): plan$" "$1"; then',
          '  echo "commit-msg hook: the plan commit is rejected by this fixture" >&2',
          "  exit 1",
          "fi",
          "exit 0",
          "",
        ].join("\n"),
      );
      chmodSync(hookPath, 0o755);
    }),
    run({ expectExit: 2 }),
  ],
};
