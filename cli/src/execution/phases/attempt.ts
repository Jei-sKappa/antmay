import type { AttemptOutcome } from "../../harness/types.js";
import type { ExecutingAttemptRecord } from "../../state/checkpoint/types.js";
import type { StageContext } from "../context.js";
import { settleInterrupted, signalReason } from "../interruption.js";
import type { ExecutionResult } from "../result.js";
import { invokeHarness } from "./invoke-harness.js";
import { reserveAttempt } from "./reserve-attempt.js";

/**
 * One attempt, from reserving it to the harness returning: the attempt is
 * reserved, a signal is checked for, and only then is the harness invoked.
 *
 * That middle step is why the order is stated here rather than folded into the
 * two around it. A signal arriving once the attempt is reserved and its log
 * created, but before the provider is contacted, finishes the reserved attempt
 * as interrupted without ever invoking the harness — a property the guard's
 * position between the two calls is what establishes.
 */

/**
 * The attempt the cursor durably holds, and what the harness returned for it.
 * The harness invocation is what produces one, so a settlement can only be
 * handed an attempt the run reserved and launched.
 */
export type LaunchedAttempt = {
  /** The executing record the checkpoint records. */
  record: ExecutingAttemptRecord;
  outcome: AttemptOutcome;
  /** The session the attempt ended up holding, if it held one. */
  session: { id: string } | undefined;
};

/**
 * Either the harness ran, or this invocation is over: the tip was unreadable,
 * a write or the log failed, or a signal arrived before launch.
 */
export type LaunchOutcome =
  | { kind: "launched"; attempt: LaunchedAttempt }
  | { kind: "not-launched"; result: ExecutionResult };

export async function launchAttempt(
  ctx: StageContext,
): Promise<LaunchOutcome> {
  const reservation = await reserveAttempt(ctx);
  if (reservation.kind === "not-reserved") {
    return { kind: "not-launched", result: reservation.result };
  }
  const { reserved } = reservation;

  const preLaunchSig = signalReason(ctx.signal);
  if (preLaunchSig !== null) {
    return {
      kind: "not-launched",
      result: await settleInterrupted(ctx, {
        sig: preLaunchSig,
        executingAttempt: reserved.record,
        headAfterAttempt: reserved.record.headAtStart,
        // The attempt never ran, so no post-attempt scan was made.
        queues: { kind: "unavailable" },
      }),
    };
  }

  return { kind: "launched", attempt: await invokeHarness(ctx, reserved) };
}
