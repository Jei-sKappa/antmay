import type { Dirent } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

import { readCheckpoint } from "../../../state/checkpoint/read.js";
import { runsDirectory } from "../../../state/runs.js";
import type {
  RunUnfinishedRunResult,
  RunUnreadableCheckpointWarning,
} from "../types.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Scan sibling run directories without creating the runs directory. Returns
 * unreadable-checkpoint warnings for the command to print and continue past, a
 * matching unfinished same-workspace/thread run, or a scan-failure diagnostic.
 */
export async function findUnfinishedThreadRun(
  stateRoot: string,
  repoRoot: string,
  threadRelPath: string,
): Promise<RunUnfinishedRunResult> {
  const runsDir = runsDirectory(stateRoot);
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(runsDir, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      return {
        ok: false,
        kind: "scan-error",
        message: `Cannot scan the runs directory ${runsDir}: ${errorMessage(error)}`,
      };
    }
  }

  const warnings: RunUnreadableCheckpointWarning[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const runDir = path.join(runsDir, entry.name);
    const existing = await readCheckpoint(runDir);
    if (!existing.ok) {
      warnings.push({ runDir, errors: existing.errors });
      continue;
    }
    const cp = existing.checkpoint;
    if (
      cp.condition !== "completed" &&
      cp.workspace.path === repoRoot &&
      cp.threadRelPath === threadRelPath
    ) {
      return {
        ok: false,
        kind: "unfinished",
        match: {
          runId: cp.runId,
          condition: cp.condition,
          runDir,
        },
        warnings,
      };
    }
  }

  return { ok: true, warnings };
}
