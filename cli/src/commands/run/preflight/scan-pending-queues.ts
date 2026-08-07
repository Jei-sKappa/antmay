import { scanPendingQueues } from "../../../thread/queues.js";
import type { RunPendingQueuesResult } from "../types.js";

/**
 * Scan both pending queues and return scan failures or pending paths. Emptiness
 * checks, refusal wording, and exit selection stay with the command.
 */
export async function scanRunPendingQueues(
  repoRoot: string,
  threadRelPath: string,
): Promise<RunPendingQueuesResult> {
  return scanPendingQueues(repoRoot, threadRelPath);
}
