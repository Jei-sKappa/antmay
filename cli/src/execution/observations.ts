import { isWorktreeClean } from "../gitops/status.js";
import type { RunContext } from "./context.js";
import type { WorktreeCleanliness } from "./recovery-policy.js";
import type { InvariantResult } from "./result.js";

/**
 * The two Git observations the engine makes on its own behalf, as opposed to the
 * ones the boundary operation makes for a stage.
 *
 * Both fail as structured refusals rather than exceptions, because either one
 * failing means the engine cannot know where the repository stands — and a run
 * that cannot know that must stop rather than guess.
 */

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The tip as it stands now.
 *
 * The phase is what the failure means. Read before a transition, an unreadable
 * tip has cost the run nothing. Read after an attempt, it leaves that attempt
 * live in the checkpoint, so the message says how to recover it.
 */
export async function observeHead(
  ctx: RunContext,
  phase: "before-transition" | "after-attempt",
): Promise<InvariantResult<string>> {
  try {
    return { ok: true, value: await ctx.readHead(ctx.repoRoot) };
  } catch (error) {
    const base = `Cannot read Git HEAD at ${ctx.repoRoot}: ${errorMessage(error)}`;
    return {
      ok: false,
      message:
        phase === "after-attempt"
          ? `${base}. The attempt remains live in the checkpoint; recover it with ${ctx.resumeCommand}.`
          : base,
    };
  }
}

/** Whether the worktree holds uncommitted work. */
export async function readWorktreeCleanliness(
  ctx: RunContext,
): Promise<InvariantResult<WorktreeCleanliness>> {
  try {
    const clean = await isWorktreeClean(ctx.repoRoot);
    return { ok: true, value: clean ? "clean" : "dirty" };
  } catch (error) {
    return {
      ok: false,
      message: `Cannot inspect the Git worktree at ${ctx.repoRoot}: ${errorMessage(error)}`,
    };
  }
}
