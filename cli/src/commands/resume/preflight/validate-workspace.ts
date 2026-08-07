import { resolveCurrentCheckoutWorkspace } from "../../../workspace/current-checkout.js";
import type { ResumePreflightResult } from "../types.js";

/**
 * Resolve the canonical current-checkout workspace and require its path to
 * match the recorded workspace identity.
 */
export async function validateResumeWorkspace(
  repoRoot: string,
  recordedWorkspacePath: string,
): Promise<ResumePreflightResult<{ path: string }>> {
  const workspace = await resolveCurrentCheckoutWorkspace(repoRoot);
  if (workspace.path !== recordedWorkspacePath) {
    return {
      ok: false,
      refusal: {
        kind: "message",
        message:
          `The recorded workspace no longer resolves to the same canonical path. ` +
          `Recorded ${recordedWorkspacePath}; resolved ${workspace.path}.`,
      },
    };
  }
  return { ok: true, path: workspace.path };
}
