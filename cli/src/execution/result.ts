import path from "node:path";

import { HARNESSES } from "../harness/providers/index.js";
import type { AttemptRecord, WaitingInfo } from "../state/checkpoint/types.js";
import type { RunContext, StageContext } from "./context.js";
import type { Transition } from "./run-state.js";

/**
 * The five ways one invocation of the engine ends, and the one durable step that
 * can turn into any of them.
 *
 * Each ending is a value the caller maps to an exit code *and* an event the
 * terminal is owed, and the two are only correct together: a pause nothing
 * rendered exits `2` with a blank screen, and a checkpoint failure nothing
 * rendered ends the run with no explanation. Pairing them here is what keeps
 * every phase from having to remember the second half.
 */

/**
 * The outcome the engine returns to its command caller, which maps it to a
 * process exit code. These five kinds are the whole vocabulary of how execution
 * ends; the durable run state a pause or interruption left behind is read from
 * the checkpoint, never re-described here.
 *
 * `refused` is a gate the run cannot pass until a human acts: the engine changed
 * nothing and the message is the whole of what the caller reports.
 */
export type ExecutionResult =
  | { kind: "completed" }
  | { kind: "paused"; waiting: WaitingInfo }
  | { kind: "interrupted"; signal: NodeJS.Signals }
  | { kind: "refused"; message: string }
  | { kind: "fatal-checkpoint"; message: string };

/**
 * A value the engine could produce, or the message that refuses it. Every
 * producer is a check the engine makes on its own behalf — a Git observation, a
 * checkpoint invariant — whose failure becomes one of the endings above.
 */
export type InvariantResult<Value> =
  | { ok: true; value: Value }
  | { ok: false; message: string };

/**
 * How long the run has been going. `createdAt` never changes across a persist,
 * so total elapsed time is derived at call time from the live checkpoint.
 */
function elapsedMs(ctx: RunContext): number {
  return ctx.clock().getTime() - Date.parse(ctx.run.checkpoint.createdAt);
}

/** The pipeline reached the end of its snapshot. */
export function completed(ctx: RunContext): ExecutionResult {
  ctx.display.runCompleted({
    runId: ctx.runId,
    pipelineName: ctx.pipelineName,
    totalElapsedMs: elapsedMs(ctx),
    checkpointPath: ctx.checkpointPath,
    stageCount: ctx.stageCount,
  });
  return { kind: "completed" };
}

/**
 * A gate the run cannot pass until a human acts. The engine changed nothing, and
 * the command reports the message as the whole of what happened — so there is no
 * lifecycle event to draw here.
 */
export function refused(message: string): ExecutionResult {
  return { kind: "refused", message };
}

/** The run could not persist its own state and ended without pausing safely. */
export function fatal(ctx: RunContext, message: string): ExecutionResult {
  ctx.display.runFailed({
    runId: ctx.runId,
    pipelineName: ctx.pipelineName,
    totalElapsedMs: elapsedMs(ctx),
    checkpointPath: ctx.checkpointPath,
    message,
  });
  return { kind: "fatal-checkpoint", message };
}

/**
 * A signal that arrived while the checkpoint was durably at rest — between
 * stages, or at the cursor a resume was handed — stops before allocating
 * anything: the cursor stays byte-for-byte unchanged, no fictional pause is
 * rendered, and the run reports the interruption.
 */
export function interruptedAtRest(
  ctx: RunContext,
  signal: NodeJS.Signals,
): ExecutionResult {
  ctx.display.runInterrupted({
    runId: ctx.runId,
    pipelineName: ctx.pipelineName,
    totalElapsedMs: elapsedMs(ctx),
    checkpointPath: ctx.checkpointPath,
    resumeCommand: ctx.resumeCommand,
    signal,
  });
  return { kind: "interrupted", signal };
}

/**
 * The interruption a settled attempt's own pause already explained. The reserved
 * attempt was finished and its pause rendered, so this adds no second summary.
 */
export function interrupted(signal: NodeJS.Signals): ExecutionResult {
  return { kind: "interrupted", signal };
}

/**
 * Draw the durable pause and return it, writing nothing. For the refresh that
 * computes what the checkpoint already records: rendering a pause the run is
 * already sitting in is not a change to the run.
 *
 * Log and Continue both come from the persisted attempt this pause is about; a
 * pre-attempt pause passes none. The stage a pause is at is the one its context
 * was built for, which is what states in the type that a pause has one.
 */
export function renderPause(
  ctx: StageContext,
  waiting: WaitingInfo,
  attempt: AttemptRecord | undefined = undefined,
): ExecutionResult {
  const logAbsPath =
    attempt === undefined ? null : path.join(ctx.runDir, attempt.logPath);
  const continuationCommand =
    attempt?.agentSession !== undefined
      ? HARNESSES[
          ctx.run.checkpoint.stages[attempt.stageIndex]!.binding.agent.harness
        ].continuationCommand(attempt.agentSession.id)
      : undefined;
  ctx.display.runPaused({
    waiting,
    currentStage: {
      id: ctx.stage.id,
      position: ctx.ordinal,
      count: ctx.stageCount,
    },
    runId: ctx.runId,
    pipelineName: ctx.pipelineName,
    totalElapsedMs: elapsedMs(ctx),
    logAbsPath,
    continuationCommand,
    resumeCommand: ctx.resumeCommand,
    checkpointPath: ctx.checkpointPath,
  });
  return { kind: "paused", waiting };
}

/**
 * Record the pause the run is stopping at, then draw it. A write failure ends the
 * run as fatal instead: a pause nothing durably recorded is not one a resume
 * could act on.
 */
export async function pauseRun(
  ctx: StageContext,
  waiting: WaitingInfo,
  attempt: AttemptRecord | undefined = undefined,
): Promise<ExecutionResult> {
  const failed = await commitCursor(ctx, { kind: "pause", waiting });
  if (failed !== null) return failed;
  return renderPause(ctx, waiting, attempt);
}

/**
 * Move the run's cursor by one durable step, or end the run with the fatal
 * result a failed checkpoint write is. `null` means the cursor is durably where
 * the transitions put it and the caller may carry on; anything else is the
 * whole of what this invocation reports.
 *
 * Several transitions in one call are one document on disk. That is what keeps
 * a settled attempt and the pause it settled into, or a finalized `DONE` and
 * the advance it earned, from being two writes and two chances to fail.
 */
export async function commitCursor(
  ctx: RunContext,
  ...transitions: Transition[]
): Promise<ExecutionResult | null> {
  const committed = await ctx.run.commit(...transitions);
  return committed.ok ? null : fatal(ctx, committed.message);
}
