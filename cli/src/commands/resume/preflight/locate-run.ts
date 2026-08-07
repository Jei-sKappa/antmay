import { promises as fs } from "node:fs";

import { runDirectoryFor, runsDirectory } from "../../../state/runs.js";
import type { ResumePreflightResult } from "../types.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Locate exactly the requested run directory under the state root. An absent
 * runs directory or run directory is an unknown run, never a search for a
 * replacement.
 */
export async function locateResumeRun(
  stateRoot: string,
  runId: string,
): Promise<ResumePreflightResult<{ runDir: string }>> {
  const runDir = runDirectoryFor(stateRoot, runId);
  try {
    const stat = await fs.stat(runDir);
    if (!stat.isDirectory()) {
      return {
        ok: false,
        refusal: {
          kind: "message",
          message: `Unknown run "${runId}": ${runDir} is not a directory.`,
        },
      };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        ok: false,
        refusal: {
          kind: "message",
          message: `Unknown run "${runId}": no run directory exists under ${runsDirectory(stateRoot)}.`,
        },
      };
    }
    return {
      ok: false,
      refusal: {
        kind: "message",
        message: `Cannot access the run directory ${runDir}: ${errorMessage(error)}`,
      },
    };
  }
  return { ok: true, runDir };
}
