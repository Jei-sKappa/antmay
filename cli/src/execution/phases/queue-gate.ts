import { scanPendingQueues } from "../../thread/queues.js";
import type { WaitingInfo } from "../../state/checkpoint.js";
import type { RunContext } from "../context.js";
import { Pause } from "../pause.js";

/**
 * The pre-attempt queue gate: whether a human still owes the thread work.
 *
 * The gate is stage-independent — a pending bundle holds the pipeline wherever
 * its cursor sits — so it takes the run rather than the stage. Neither verdict
 * allocates an attempt, creates a log, or launches the harness, which is why the
 * pause it hands back carries no log path.
 */

export type QueueGateVerdict =
  | { kind: "clear" }
  | { kind: "blocked"; waiting: WaitingInfo };

export async function checkQueueGate(
  ctx: RunContext,
): Promise<QueueGateVerdict> {
  const scan = await scanPendingQueues(ctx.repoRoot, ctx.threadRelPath);
  if (!scan.ok) {
    return { kind: "blocked", waiting: Pause.queueUnreadable(scan.message) };
  }
  if (scan.pendingFiles.length > 0) {
    return { kind: "blocked", waiting: Pause.queueBlocked(scan.pendingFiles) };
  }
  return { kind: "clear" };
}
