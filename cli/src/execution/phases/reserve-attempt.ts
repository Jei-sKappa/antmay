import type {
  AttemptRecord,
  ExecutingAttemptRecord,
} from "../../state/checkpoint/types.js";
import { attemptLogPaths, createAttemptLog } from "../../state/logs.js";
import type { AttemptLogHeader } from "../../state/logs.js";
import type { StageContext } from "../context.js";
import { observeHead } from "../observations.js";
import type { ExecutionResult } from "../result.js";
import { commitCursor, fatal, refused } from "../result.js";

/**
 * How an attempt becomes durable before anything is asked of the harness.
 *
 * Two orderings here are the reason the launch phase exists. The executing
 * attempt is persisted **before** its log is created, so a failed write creates
 * no log and launches nothing, and a failed log leaves a durable attempt a later
 * resume can recover. The announcement comes last, once every field of it —
 * the attempt number and the absolute path of the log — is true.
 */

/**
 * An attempt the checkpoint durably records, whose log exists. This module is
 * its only producer, which is what leaves the harness unreachable for an attempt
 * neither of those is true of. Its record already carries the attempt number,
 * the start time, and the attempt-start `HEAD`, so nothing here repeats them.
 */
export type ReservedAttempt = {
  /** The executing record the checkpoint holds. */
  record: ExecutingAttemptRecord;
  /** The attempt log, created with its header and nothing else yet. */
  logAbsPath: string;
};

/** Either the attempt is reserved, or this invocation is already over. */
export type ReservationOutcome =
  | { kind: "reserved"; reserved: ReservedAttempt }
  | { kind: "not-reserved"; result: ExecutionResult };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The next one-based attempt number for a stage, from its prior records. */
function nextAttemptNumber(attempts: AttemptRecord[], stageIndex: number): number {
  let max = 0;
  for (const attempt of attempts) {
    if (attempt.stageIndex === stageIndex && attempt.attempt > max) {
      max = attempt.attempt;
    }
  }
  return max + 1;
}

export async function reserveAttempt(
  ctx: StageContext,
): Promise<ReservationOutcome> {
  const { run, stage, stageIndex, stagePosition } = ctx;
  const agent = stage.binding.agent;

  const attemptStartHead = await observeHead(ctx, "before-transition");
  if (!attemptStartHead.ok) {
    return { kind: "not-reserved", result: refused(attemptStartHead.message) };
  }
  const attemptNumber = nextAttemptNumber(run.checkpoint.attempts, stageIndex);
  const logPaths = attemptLogPaths(
    ctx.runDir,
    ctx.ordinal,
    stage.id,
    attemptNumber,
  );
  const startedAt = ctx.clock().toISOString();

  const executingAttempt: ExecutingAttemptRecord = {
    attempt: attemptNumber,
    stageIndex,
    stageId: stage.id,
    startedAt,
    result: "executing",
    terminalResult: null,
    headAtStart: attemptStartHead.value,
    logPath: logPaths.runRelPath,
  };

  // A persistence failure creates no log and prevents launch.
  const reserveFailed = await commitCursor(ctx, {
    kind: "reserve-attempt",
    attempt: executingAttempt,
  });
  if (reserveFailed !== null) {
    return { kind: "not-reserved", result: reserveFailed };
  }

  // Only after persistence succeeds, exclusively create the header log. A
  // log-header failure leaves the durable executing attempt recoverable, does
  // not launch, and reports a fatal checkpoint.
  const header: AttemptLogHeader = {
    runId: ctx.runId,
    stageId: stage.id,
    stageOrdinal: ctx.ordinal,
    attempt: attemptNumber,
    harness: agent.harness,
    model: agent.model,
    harnessVersion:
      ctx.harnessVersions[agent.harness] ??
      run.checkpoint.observedHarnessVersions[agent.harness] ??
      "unknown",
    repoRoot: ctx.repoRoot,
    threadRelPath: ctx.threadRelPath,
    startedAt,
  };
  try {
    await createAttemptLog(logPaths, header);
  } catch (error) {
    return {
      kind: "not-reserved",
      result: fatal(
        ctx,
        `Failed to initialize the attempt log: ${errorMessage(error)}`,
      ),
    };
  }

  ctx.display.attemptStarted({
    stagePosition,
    stageId: stage.id,
    harness: agent.harness,
    model: agent.model,
    attempt: attemptNumber,
    logAbsPath: logPaths.absPath,
  });

  return {
    kind: "reserved",
    reserved: { record: executingAttempt, logAbsPath: logPaths.absPath },
  };
}
