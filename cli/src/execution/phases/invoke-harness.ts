import { renderStagePrompt } from "../../harness/prompt.js";
import type { AttemptOutcome } from "../../harness/types.js";
import type { AttemptRecord } from "../../state/checkpoint/types.js";
import { withAgentSession } from "../attempts.js";
import type { StageContext } from "../context.js";
import type { CommitOutcome } from "../run-state.js";
import type { LaunchedAttempt } from "./attempt.js";
import type { ReservedAttempt } from "./reserve-attempt.js";

/**
 * The harness call itself, for an attempt that is already reserved.
 *
 * A `ReservedAttempt` is the only thing here that names the attempt, so the
 * provider is contacted about nothing the checkpoint does not already record.
 * What surrounds the call is the heartbeat and the live-session capture, and
 * both are torn down before the attempt is handed on to settlement.
 */

/** Milliseconds per second, for turning the binding's interval into a timer. */
const MS_PER_SECOND = 1000;

/** Settlement session: outcome wins; live capture is the fallback when omitted. */
function resolveAttemptSession(
  outcome: AttemptOutcome,
  liveSession: { id: string } | undefined,
): { id: string } | undefined {
  const session = outcome.session ?? liveSession;
  if (session === undefined || session.id.length === 0) return undefined;
  return { id: session.id };
}

/**
 * The session a live attempt reports, from the harness callback through to the
 * value settlement is given. It exists so "at most one provisional write, and it
 * is awaited before settlement" is a property of one small thing rather than a
 * convention held across a callback, a `finally`, and a return.
 */
type SessionCapture = {
  /** What the harness calls; only the first non-empty ID is acted on. */
  onSessionCaptured: (session: { id: string }) => void;
  /** Serialize the provisional write and warn if it failed. */
  settle: () => Promise<void>;
  /** The session the attempt ended holding, once the outcome is known. */
  sessionOf: (outcome: AttemptOutcome) => { id: string } | undefined;
};

function captureLiveSession(
  ctx: StageContext,
  executingAttempt: AttemptRecord,
): SessionCapture {
  let liveSession: { id: string } | undefined;
  let provisionalWrite: Promise<CommitOutcome> | undefined;
  return {
    onSessionCaptured: (session) => {
      if (liveSession !== undefined) return;
      if (typeof session.id !== "string" || session.id.length === 0) return;
      liveSession = { id: session.id };
      // Committed directly rather than through `commitCursor`: a session this
      // attempt is still holding is worth recording and not worth ending the
      // run over, so the failure is warned about below instead. Do not await
      // here — retain the promise and serialize before settlement.
      provisionalWrite = ctx.run.commit({
        kind: "attach-session",
        attempt: withAgentSession(executingAttempt, liveSession),
      });
    },
    settle: async () => {
      if (provisionalWrite === undefined) return;
      const early = await provisionalWrite;
      if (!early.ok) {
        ctx.display.warn(
          `Failed to persist the live agent session on the executing attempt: ${early.message}`,
        );
      }
    },
    sessionOf: (outcome) => resolveAttemptSession(outcome, liveSession),
  };
}

export async function invokeHarness(
  ctx: StageContext,
  reserved: ReservedAttempt,
): Promise<LaunchedAttempt> {
  const { run, stage } = ctx;
  const binding = stage.binding;
  const agent = binding.agent;
  const executingAttempt = reserved.record;

  // The prompt is pure and deterministic from the snapshot.
  const prompt = renderStagePrompt(
    agent.harness,
    stage.skill,
    stage.resolvedTarget,
    stage.instructions,
  );

  const attemptStartMs = Date.now();
  const heartbeat = setInterval(() => {
    ctx.display.heartbeat(Date.now() - attemptStartMs);
  }, binding.heartbeatSeconds * MS_PER_SECOND);
  heartbeat.unref();

  const capture = captureLiveSession(ctx, executingAttempt);

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
        attemptNumber: executingAttempt.attempt,
      },
      idleTimeoutSeconds: binding.idleTimeoutSeconds,
      dangerouslySkipPermissions: run.checkpoint.dangerouslySkipPermissions,
      workspace: run.checkpoint.workspace.execution,
      logFilePath: reserved.logAbsPath,
      onEvent: (event) => ctx.display.harnessEvent(event),
      onSessionCaptured: capture.onSessionCaptured,
      signal: ctx.signal,
    });
  } finally {
    clearInterval(heartbeat);
    await capture.settle();
  }

  return {
    record: executingAttempt,
    outcome,
    session: capture.sessionOf(outcome),
  };
}
