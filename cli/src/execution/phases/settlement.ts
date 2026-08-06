import type { StageDisposition } from "../../display/types.js";
import type { BoundaryDisposition } from "../../runner/classify.js";
import { classifyAttempt } from "../../runner/classify.js";
import type { OutcomeParse } from "../../runner/outcome.js";
import { parseTerminalOutcome } from "../../runner/outcome.js";
import type {
  AttemptRecord,
  TerminalResult,
  WaitingDiagnostics,
  WaitingInfo,
} from "../../state/checkpoint/types.js";
import { scanPendingQueues } from "../../thread/queues.js";
import { withAgentSession } from "../attempts.js";
import type { StageContext } from "../context.js";
import {
  abortOrigin,
  settleInterrupted,
  signalReason,
} from "../interruption.js";
import { observeHead } from "../observations.js";
import { Pause } from "../pause.js";
import type { ExecutionResult } from "../result.js";
import { commitCursor, refused, renderPause } from "../result.js";
import { finalizeStageBoundary } from "./boundary.js";
import type { LaunchedAttempt } from "./attempt.js";
import { verifyPromisedState } from "./verify-promise.js";

/**
 * How an attempt the harness returned from becomes a durable settlement.
 *
 * The order of the gates is the safety property. Queues and the terminal outcome
 * are read first, then the tip every settled attempt records, then — for a
 * recognized `DONE` — the promised artifact state, and only once that holds, the
 * Git boundary. A promise that is not kept therefore never reaches the boundary,
 * and the completed attempt is preserved for a human repair to finalize.
 *
 * Three settlements end it: the stage advanced, the stage succeeded but its queue
 * holds the run, or the stage stopped and the run pauses. `null` is the first of
 * those — the cursor moved and the loop carries on.
 */

/** Everything the settlement branches share about the attempt they are ending. */
type SettlingAttempt = {
  /** The executing record the cursor holds, which every settlement amends. */
  executing: AttemptRecord;
  session: { id: string } | undefined;
  endedAt: string;
  durationMs: number;
  terminalResult: TerminalResult | null;
  /** The tip observed once this attempt settled, boundary commit included. */
  observedHead: string;
  pendingFiles: string[];
};

/** Build the stored terminal-result candidate from a parse, or null when the
 * attempt produced no terminal text at all. */
function terminalResultFrom(parse: OutcomeParse | null): TerminalResult | null {
  if (parse === null) return null;
  if (parse.token === null) {
    return { token: null, candidateLine: parse.candidateLine, detail: "" };
  }
  return { token: parse.token, candidateLine: parse.candidateLine, detail: parse.detail };
}

/**
 * How the stage itself ended, read from the attempt's own terminal token rather
 * than from the reason that governs the run's pause: a stage can be refused
 * while a pending bundle is what actually holds the run.
 */
function stageDisposition(
  aborted: boolean,
  parse: OutcomeParse | null,
): StageDisposition {
  if (aborted) return "interrupted";
  if (parse !== null && parse.token === "REFUSED") return "refused";
  if (parse !== null && parse.token === "BLOCKED") return "blocked";
  return "failed";
}

/**
 * Record the attempt as the pause it settled into — one document carrying both —
 * then report how the stage ended and draw the pause.
 *
 * The attempt's failure telemetry rides on the reason that reports that failure,
 * which is the reason the pause leads with and the only one it describes.
 */
async function settleIntoPause(
  ctx: StageContext,
  settling: SettlingAttempt,
  args: {
    waiting: WaitingInfo;
    /** Whether a signal-caused abort is what ended the attempt. */
    aborted: boolean;
    /** Whether a refused boundary is the movement one resume may accept. */
    advisoryHeadMovement: boolean;
    parse: OutcomeParse | null;
  },
): Promise<ExecutionResult> {
  const governing = args.waiting.reasons[0];
  const settled: AttemptRecord = withAgentSession(
    {
      ...settling.executing,
      result: args.aborted ? "interrupted" : "waiting",
      endedAt: settling.endedAt,
      terminalResult: settling.terminalResult,
      pendingFiles:
        settling.pendingFiles.length > 0 ? settling.pendingFiles : undefined,
      failure: { kind: governing.kind, message: governing.message },
      headAfterAttempt: settling.observedHead,
    },
    settling.session,
  );
  const failed = await commitCursor(
    ctx,
    { kind: "settle-attempt", attempt: settled },
    { kind: "pause", waiting: args.waiting },
  );
  if (failed !== null) return failed;
  ctx.display.stageStopped({
    stagePosition: ctx.stagePosition,
    durationMs: settling.durationMs,
    disposition: args.advisoryHeadMovement
      ? "paused"
      : stageDisposition(args.aborted, args.parse),
  });
  return renderPause(ctx, args.waiting, settled);
}

export async function settleAttempt(
  ctx: StageContext,
  launched: LaunchedAttempt,
): Promise<ExecutionResult | null> {
  const { stage, stageIndex, stagePosition } = ctx;
  const executingAttempt = launched.record;
  const { outcome, session: agentSession } = launched;
  const attemptNumber = executingAttempt.attempt;
  const startedAt = executingAttempt.startedAt;

  // 1. Post-attempt gates: re-scan queues, parse on completion, read the
  //    post-attempt HEAD for every settled attempt.
  const postScan = await scanPendingQueues(ctx.repoRoot, ctx.threadRelPath);
  const pendingFiles = postScan.ok ? postScan.pendingFiles : [];
  const queueScanError = postScan.ok ? null : postScan.message;

  const parse =
    outcome.kind === "completed" ? parseTerminalOutcome(outcome.finalText) : null;
  const isDone = parse !== null && parse.token === "DONE";

  const postAttemptHead = await observeHead(ctx, "after-attempt");
  if (!postAttemptHead.ok) return refused(postAttemptHead.message);
  let observedHead = postAttemptHead.value;

  // A signal-caused abort is an interruption. This branch precedes ordinary
  // non-DONE queue/error classification: a first-signal rejection is always
  // interruption, never harness-error or a pending-queues relabel. The
  // post-attempt scan's pending paths are retained as evidence.
  const abortSig = signalReason(ctx.signal);
  if (
    outcome.kind === "failed" &&
    outcome.category === "aborted" &&
    abortSig !== null
  ) {
    return settleInterrupted(ctx, {
      sig: abortSig,
      executingAttempt,
      headAfterAttempt: observedHead,
      pendingFiles,
      failure: {
        errorClass: outcome.errorClass,
        errorMessage: outcome.errorMessage,
      },
      agentSession,
    });
  }

  // 2. The promise a recognized DONE claims, before the boundary is looked at.
  if (isDone) {
    const verdict = await verifyPromisedState(ctx, {
      attempt: { stageIndex, attempt: attemptNumber },
      pausedAtHead: observedHead,
      pendingFiles,
      queueScanError,
    });
    if (verdict.kind === "violated") {
      const endedAt = ctx.clock().toISOString();
      return settleIntoPause(
        ctx,
        {
          executing: executingAttempt,
          session: agentSession,
          endedAt,
          durationMs: Date.parse(endedAt) - Date.parse(startedAt),
          terminalResult: terminalResultFrom(parse),
          observedHead,
          pendingFiles,
        },
        {
          waiting: verdict.waiting,
          aborted: false,
          advisoryHeadMovement: false,
          parse,
        },
      );
    }
  }

  // 3. The stage's Git boundary, now that its promise holds. The finalization
  //    owns every Git observation this boundary makes, so the tip it left behind
  //    is what the settled attempt records.
  let boundary: BoundaryDisposition = { evaluated: false };
  let headMovementAdvisory = false;
  if (isDone) {
    const verdict = await finalizeStageBoundary(ctx, {
      headAtStart: executingAttempt.headAtStart,
      headAfterAttempt: observedHead,
    });
    observedHead = verdict.observedHead;
    headMovementAdvisory = verdict.advisoryHeadMovement;
    boundary = verdict.disposition;
  }

  const classification = classifyAttempt({
    attemptOutcome: outcome,
    parse,
    pendingFiles,
    queueScanError,
    boundary,
  });

  // 4. Settlement. Every settled attempt records the HEAD observed once it
  //    settled, so the evidence a later recovery reads belongs to the attempt
  //    that produced it.
  const endedAt = ctx.clock().toISOString();
  const durationMs = Date.parse(endedAt) - Date.parse(startedAt);
  const attemptReference = { stageIndex, attempt: attemptNumber };
  const terminalResult = terminalResultFrom(parse);

  if (classification.action === "advance") {
    const done: AttemptRecord = withAgentSession(
      {
        ...executingAttempt,
        result: "done",
        endedAt,
        terminalResult,
        headAfterAttempt: observedHead,
      },
      agentSession,
    );
    const failed = await commitCursor(
      ctx,
      { kind: "settle-attempt", attempt: done },
      { kind: "advance" },
    );
    if (failed !== null) return failed;
    ctx.display.stageSucceeded({ stagePosition, durationMs });
    return null;
  }

  if (classification.action === "pause-done") {
    const done: AttemptRecord = withAgentSession(
      {
        ...executingAttempt,
        result: "done",
        endedAt,
        terminalResult,
        pendingFiles,
        headAfterAttempt: observedHead,
      },
      agentSession,
    );
    const waiting = Pause.donePendingQueues({
      classified: classification.reasons,
      attempt: attemptReference,
      queueResolution: stage.queueResolution,
    });
    const failed = await commitCursor(
      ctx,
      { kind: "settle-attempt", attempt: done },
      { kind: "pause", waiting },
    );
    if (failed !== null) return failed;
    // The stage itself succeeded — it reported DONE and its boundary was
    // finalized. Only the pending bundle keeps the run from advancing.
    ctx.display.stageSucceeded({ stagePosition, durationMs });
    return renderPause(ctx, waiting, done);
  }

  // classification.action === "pause": every non-DONE pause. When the abort
  // signal caused it, the attempt records `interrupted` with its origin.
  const aborted = outcome.kind === "failed" && outcome.category === "aborted";
  let diagnostics: WaitingDiagnostics | undefined;
  if (outcome.kind === "failed") {
    diagnostics = aborted
      ? {
          errorClass: outcome.errorClass,
          errorMessage: outcome.errorMessage,
          origin: abortOrigin(ctx.signal),
        }
      : { errorClass: outcome.errorClass, errorMessage: outcome.errorMessage };
  }
  const waiting = Pause.attemptStopped({
    classified: classification.reasons,
    aborted,
    diagnostics,
    attempt: attemptReference,
    boundary:
      boundary.evaluated && !boundary.ok
        ? {
            refused: true,
            advisoryHeadMovement: headMovementAdvisory,
            observedHead,
          }
        : { refused: false },
  });
  return settleIntoPause(
    ctx,
    {
      executing: executingAttempt,
      session: agentSession,
      endedAt,
      durationMs,
      terminalResult,
      observedHead,
      pendingFiles,
    },
    { waiting, aborted, advisoryHeadMovement: headMovementAdvisory, parse },
  );
}
