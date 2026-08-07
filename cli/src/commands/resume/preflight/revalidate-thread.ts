import path from "node:path";

import { resolveThreadTarget } from "../../../thread/resolve.js";
import type { ResumePreflightResult } from "../types.js";

/**
 * Re-resolve the checkpoint's active thread and require both repository and
 * thread identities to equal the recorded values.
 */
export async function revalidateResumeThread(
  repoRoot: string,
  threadRelPath: string,
  runId: string,
  cwd: string,
): Promise<ResumePreflightResult<{ repoRoot: string; threadRelPath: string }>> {
  const thread = await resolveThreadTarget(
    path.join(repoRoot, threadRelPath),
    cwd,
  );
  if (!thread.ok) {
    return {
      ok: false,
      refusal: {
        kind: "message",
        message: `The recorded repository or thread for run "${runId}" could not be revalidated: ${thread.message}`,
      },
    };
  }
  if (thread.repoRoot !== repoRoot || thread.threadRelPath !== threadRelPath) {
    return {
      ok: false,
      refusal: {
        kind: "message",
        message:
          `The recorded thread no longer resolves to its recorded repository. ` +
          `Recorded repository ${repoRoot} with thread ${threadRelPath}; ` +
          `resolved repository ${thread.repoRoot} with thread ${thread.threadRelPath}.`,
      },
    };
  }
  return { ok: true, repoRoot, threadRelPath };
}
