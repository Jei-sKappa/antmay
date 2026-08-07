import { checkTemporaryWorkspaces } from "../../../gitops/temporary-workspaces.js";
import type { RunTemporaryWorkspaceResult } from "../types.js";

/**
 * Verify that the thread's temporary workspaces are Git-safe. Returns
 * structured unsafe problems or an inspection diagnostic; presentation stays
 * with the command. Ordered ahead of the clean-worktree gate so leftover
 * workspace dirt receives this refusal rather than commit-or-revert advice.
 */
export async function checkRunTemporaryWorkspaces(
  repoRoot: string,
  threadRelPath: string,
): Promise<RunTemporaryWorkspaceResult> {
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
