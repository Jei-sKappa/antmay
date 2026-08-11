import type { ExecutionContext } from "./context.js";
import { createRunContext, stageContext } from "./context.js";
import { recoverFromDurableCursor } from "./entry/recover.js";
import { signalReason } from "./interruption.js";
import { launchAttempt } from "./phases/attempt.js";
import { checkPrerequisite } from "./phases/prerequisite.js";
import { checkQueueGate } from "./phases/queue-gate.js";
import { settleAttempt } from "./phases/settlement.js";
import type { ExecutionResult } from "./result.js";
import { completed, interruptedAtRest, pauseRun } from "./result.js";

export type { ExecutionContext, ExecutionEntry } from "./context.js";
export type { ExecutionResult } from "./result.js";

/**
 * Drive one run from the entry cursor to a durable pause, a refused gate, a fatal
 * checkpoint error, or pipeline completion.
 *
 * This is the whole order of a run, and the only place that order is stated. A
 * `resume` entry first turns the durable past its cursor carries into a runnable
 * present; then, for each stage the snapshot still holds, a signal at rest stops
 * the run, the queue gate and the artifact prerequisite may pause it before
 * anything is allocated, and an attempt is launched and settled. A settlement
 * that advanced the cursor returns nothing, so the loop simply carries on; every
 * other outcome is the whole of what this invocation reports.
 *
 * The engine consumes only snapshotted stage data and typed inputs — never a
 * pipeline, stage, or skill identity — and reaches no collaborator itself: the
 * queue, artifact, harness, log, Git, policy, pause, and display work each belongs
 * to the phase named below, and the run's cursor moves only by committing named
 * transitions to a `RunState` no collaborator is handed. The caller releases the
 * lock.
 */
export async function executeEngine(
  execution: ExecutionContext,
): Promise<ExecutionResult> {
  const ctx = createRunContext(execution);

  if (execution.entry.kind === "resume") {
    const entered = await recoverFromDurableCursor(ctx);
    if (entered !== null) return entered;
  }

  for (
    let cursor = ctx.run.cursor;
    cursor.kind === "at-stage";
    cursor = ctx.run.cursor
  ) {
    const sig = signalReason(ctx.signal);
    if (sig !== null) return interruptedAtRest(ctx, sig);

    const stage = stageContext(ctx, cursor.stage);

    const queue = await checkQueueGate(stage);
    if (queue.kind === "blocked") return pauseRun(stage, queue.waiting);

    const prerequisite = await checkPrerequisite(stage);
    if (prerequisite.kind === "unmet") return pauseRun(stage, prerequisite.waiting);

    const launched = await launchAttempt(stage);
    if (launched.kind === "not-launched") return launched.result;

    const settled = await settleAttempt(stage, launched.attempt);
    if (settled !== null) return settled;
  }

  // The cursor sits past the final stage: it either entered there, a stage of
  // this invocation advanced it there, or an entry transition did — a saved DONE
  // finalized on resume, or a finalized DONE's queue releasing.
  return completed(ctx);
}
