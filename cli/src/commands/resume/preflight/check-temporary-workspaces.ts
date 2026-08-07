import {
  checkTemporaryWorkspaces,
  type TemporaryWorkspaceProblems,
} from "../../../gitops/temporary-workspaces.js";

/**
 * Temporary-workspace Git safety for a resume. Unsafe problems stay structured
 * for the rich refusal renderer; an inspection error is a plain diagnostic.
 * Runs before lock acquisition and every checkpoint mutation.
 */
export type ResumeTemporaryWorkspaceResult =
  | { ok: true }
  | { ok: false; kind: "inspection-error"; message: string }
  | { ok: false; kind: "unsafe"; problems: TemporaryWorkspaceProblems };

/**
 * Verify that the thread's temporary workspaces are Git-safe. The worktree
 * exemptions the engine applies do not extend here: leftover files in an
 * unignored workspace are themselves what makes the worktree dirty, and the
 * commit-or-revert advice the engine's clean-worktree rule gives would commit
 * work in progress into the repository.
 */
export async function checkResumeTemporaryWorkspaces(
  repoRoot: string,
  threadRelPath: string,
): Promise<ResumeTemporaryWorkspaceResult> {
  const workspaces = await checkTemporaryWorkspaces(repoRoot, threadRelPath);
  if (!workspaces.ok) {
    if (workspaces.kind === "inspection-error") {
      return {
        ok: false,
        kind: "inspection-error",
        message: workspaces.message,
      };
    }
    return { ok: false, kind: "unsafe", problems: workspaces.problems };
  }
  return { ok: true };
}
