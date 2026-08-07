import type { ArtifactState } from "../../../thread/artifacts.js";
import { inspectArtifactState } from "../../../thread/artifacts.js";
import type { RunPreflightResult } from "../types.js";

/**
 * Inspect the thread's concrete artifact state — the only starting point
 * composition simulates from. Repository/thread validation is a separate fact
 * established earlier; this step owns only the artifact inspection.
 */
export async function inspectRunArtifacts(
  repoRoot: string,
  threadRelPath: string,
): Promise<RunPreflightResult<{ state: ArtifactState }>> {
  const inspection = await inspectArtifactState(repoRoot, threadRelPath);
  if (!inspection.ok) {
    return {
      ok: false,
      refusal: { kind: "message", message: inspection.message },
    };
  }
  return { ok: true, state: inspection.state };
}
