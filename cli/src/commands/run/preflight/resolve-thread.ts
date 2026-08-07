import { resolveThreadTarget } from "../../../thread/resolve.js";
import type { RunPreflightResult } from "../types.js";

/**
 * Resolve and validate the active thread and its owning repository (Git root,
 * active location, seed, and decision log).
 */
export async function resolveRunThread(
  threadArg: string,
  cwd: string,
): Promise<
  RunPreflightResult<{
    repoRoot: string;
    threadRelPath: string;
    threadFolder: string;
  }>
> {
  const thread = await resolveThreadTarget(threadArg, cwd);
  if (!thread.ok) {
    return {
      ok: false,
      refusal: { kind: "message", message: thread.message },
    };
  }
  return {
    ok: true,
    repoRoot: thread.repoRoot,
    threadRelPath: thread.threadRelPath,
    threadFolder: thread.threadFolder,
  };
}
