import { renderStagePrompt } from "../../harness/prompt.js";
import type { AttemptOutcome } from "../../harness/types.js";
import type { AttemptRecord } from "../../state/checkpoint.js";
import { attemptLogPaths, createAttemptLog } from "../../state/logs.js";
import type { AttemptLogHeader } from "../../state/logs.js";
import { withAgentSession } from "../attempts.js";
import type { StageContext } from "../context.js";
import { settleInterrupted, signalReason } from "../interruption.js";
import { observeHead } from "../observations.js";
import type { ExecutionResult } from "../result.js";
import { commitCursor, fatal, refused } from "../result.js";
import type { CommitOutcome } from "../run-state.js";

/**
 * One attempt, from reserving it to the harness returning.
 *
 * Two orderings here are safety-critical and are the reason this is its own
 * phase. The executing attempt is persisted **before** its log is created, so a
 * failed write creates no log and launches nothing, and a failed log leaves a
 * durable attempt a later resume can recover. And the harness is launched only
 * once both have succeeded, so nothing the provider does can be owed to a
 * checkpoint that does not record it.
 */

/** Milliseconds per second, for turning the binding's interval into a timer. */
const MS_PER_SECOND = 1000;

/**
 * The attempt the cursor durably holds, and what the harness returned for it.
 * A settlement can only be handed one of these, so an attempt the run never
 * reserved cannot be settled.
 */
export type LaunchedAttempt = {
  /** The executing record the checkpoint records. */
  record: AttemptRecord;
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

/** Settlement session: outcome wins; live capture is the fallback when omitted. */
function resolveAttemptSession(
  outcome: AttemptOutcome,
  liveSession: { id: string } | undefined,
): { id: string } | undefined {
  const session = outcome.session ?? liveSession;
  if (session === undefined || session.id.length === 0) return undefined;
  return { id: session.id };
}

export async function launchAttempt(
  ctx: StageContext,
): Promise<LaunchOutcome> {
  const { run, stage, stageIndex, stagePosition } = ctx;
  const binding = stage.binding;
  const agent = binding.agent;

  // 1. Attempt setup: read attempt-start HEAD, persist the executing attempt
  //    BEFORE creating its log.
  const attemptStartHead = await observeHead(ctx, "before-transition");
  if (!attemptStartHead.ok) {
    return { kind: "not-launched", result: refused(attemptStartHead.message) };
  }
  const headAtStart = attemptStartHead.value;
  const attemptNumber = nextAttemptNumber(run.checkpoint.attempts, stageIndex);
  const logPaths = attemptLogPaths(
    ctx.runDir,
    ctx.ordinal,
    stage.id,
    attemptNumber,
  );
  const startedAt = ctx.clock().toISOString();

  const executingAttempt: AttemptRecord = {
    attempt: attemptNumber,
    stageIndex,
    stageId: stage.id,
    startedAt,
    result: "executing",
    terminalResult: null,
    headAtStart,
    logPath: logPaths.runRelPath,
  };

  // A persistence failure creates no log and prevents launch.
  const reserveFailed = await commitCursor(ctx, {
    kind: "reserve-attempt",
    attempt: executingAttempt,
  });
  if (reserveFailed !== null) {
    return { kind: "not-launched", result: reserveFailed };
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
      kind: "not-launched",
      result: fatal(
        ctx,
        `Failed to initialize the attempt log: ${errorMessage(error)}`,
      ),
    };
  }

  // 2. Invoke. The prompt is pure and deterministic from the snapshot.
  ctx.display.attemptStarted({
    stagePosition,
    stageId: stage.id,
    harness: agent.harness,
    model: agent.model,
    attempt: attemptNumber,
    logAbsPath: logPaths.absPath,
  });

  const prompt = renderStagePrompt(
    agent.harness,
    stage.skill,
    stage.resolvedTarget,
    stage.instructions,
  );

  // A signal after reserving the attempt and creating its log but before the
  // harness launches finishes the reserved attempt as interrupted without
  // ever invoking the harness.
  const preLaunchSig = signalReason(ctx.signal);
  if (preLaunchSig !== null) {
    return {
      kind: "not-launched",
      result: await settleInterrupted(ctx, {
        sig: preLaunchSig,
        executingAttempt,
        headAfterAttempt: headAtStart,
        pendingFiles: [],
      }),
    };
  }

  const attemptStartMs = Date.now();
  const heartbeat = setInterval(() => {
    ctx.display.heartbeat(Date.now() - attemptStartMs);
  }, binding.heartbeatSeconds * MS_PER_SECOND);
  heartbeat.unref();

  // Live session capture: first non-empty ID starts exactly one provisional
  // checkpoint write. The promise is retained and awaited before settlement.
  let liveSession: { id: string } | undefined;
  let provisionalWrite: Promise<CommitOutcome> | undefined;

  let outcome: AttemptOutcome;
  try {
    outcome = await ctx.invoker.invoke({
      harness: agent.harness,
      model: agent.model,
      prompt,
      stage: {
        id: stage.id,
        skill: stage.skill,
        resolvedTarget: stage.resolvedTarget,
        threadRelPath: ctx.threadRelPath,
        ...(stage.instructions !== undefined
          ? { instructions: stage.instructions }
          : {}),
        attemptNumber,
      },
      idleTimeoutSeconds: binding.idleTimeoutSeconds,
      dangerouslySkipPermissions: run.checkpoint.dangerouslySkipPermissions,
      workspace: run.checkpoint.workspace.execution,
      logFilePath: logPaths.absPath,
      onEvent: (event) => ctx.display.harnessEvent(event),
      onSessionCaptured: (session) => {
        if (liveSession !== undefined) return;
        if (typeof session.id !== "string" || session.id.length === 0) return;
        liveSession = { id: session.id };
        // Committed directly rather than through `commitCursor`: a session this
        // attempt is still holding is worth recording and not worth ending the
        // run over, so the failure is warned about below instead. Do not await
        // here — retain the promise and serialize before settlement.
        provisionalWrite = run.commit({
          kind: "attach-session",
          attempt: withAgentSession(executingAttempt, liveSession),
        });
      },
      signal: ctx.signal,
    });
  } finally {
    clearInterval(heartbeat);
    if (provisionalWrite !== undefined) {
      const early = await provisionalWrite;
      if (!early.ok) {
        ctx.display.warn(
          `Failed to persist the live agent session on the executing attempt: ${early.message}`,
        );
      }
    }
  }

  return {
    kind: "launched",
    attempt: {
      record: executingAttempt,
      outcome,
      session: resolveAttemptSession(outcome, liveSession),
    },
  };
}
