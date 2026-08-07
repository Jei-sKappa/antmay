import { isWorktreeClean } from "../../../gitops/status.js";
import type { RunCleanWorktreeResult } from "../types.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Require a clean Git worktree at the repository root. Runs only after
 * temporary-workspace safety has already passed. Returns an inert refusal when
 * inspection fails or the tree is dirty; presentation stays with the command.
 */
export async function requireCleanRunWorktree(
  repoRoot: string,
): Promise<RunCleanWorktreeResult> {
  let clean: boolean;
  try {
    clean = await isWorktreeClean(repoRoot);
  } catch (error) {
    return {
      ok: false,
      refusal: {
        kind: "message",
        message: `Cannot inspect the Git worktree at ${repoRoot}: ${errorMessage(error)}`,
      },
    };
  }
  if (!clean) {
    return {
      ok: false,
      refusal: {
        kind: "message",
        message: `The Git worktree at ${repoRoot} is not clean. Commit what you want to keep or revert the rest before starting a run.`,
      },
    };
  }
  return { ok: true };
}
