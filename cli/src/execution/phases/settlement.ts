import type { StageDisposition } from "../../display/types.js";
import type { AttemptOutcome } from "../../harness/types.js";
import type { BoundaryDisposition } from "../../runner/classify.js";
import { classifyAttempt } from "../../runner/classify.js";
import type { OutcomeParse } from "../../runner/outcome.js";
import { parseTerminalOutcome } from "../../runner/outcome.js";
import type {
  TerminalResult,
  WaitingDiagnostics,
} from "../../state/checkpoint/types.js";
import { scanPendingQueues } from "../../thread/queues.js";
import type { StageContext } from "../context.js";
import {
  abortOrigin,
  settleInterrupted,
  signalReason,
} from "../interruption.js";
import { observeHead } from "../observations.js";
import type { BoundaryOutcome } from "../pause.js";
import { Pause } from "../pause.js";
import type { ExecutionResult } from "../result.js";
import { refused } from "../result.js";
import { finalizeStageBoundary } from "./boundary.js";
import type { LaunchedAttempt } from "./attempt.js";
import type { SettlingAttempt } from "./commit-settlement.js";
import { commitSettlement } from "./commit-settlement.js";
import { verifyPromisedState } from "./verify-promise.js";

/**
 * How an attempt the harness returned from becomes a durable settlement.
 *
 * The order of the gates is the safety property, and it is the order the
 * orchestrator below reads in. Queues and the terminal outcome are read first,
 * then the tip every settled attempt records. A signal-caused abort is an
 * interruption, and its guard comes next — ahead of any ordinary non-`DONE`
 * classification, so a first-signal rejection is never relabelled as a harness
 * error or a queue hold. Then, for a recognized `DONE`, the promised artifact
 * state, and only once that holds, the Git boundary: a promise that is not kept
 * therefore never reaches the boundary, and the completed attempt is preserved
 * for a human repair to finalize.
 *
 * Three settlements end it: the stage advanced, the stage succeeded but its
 * queue holds the run, or the stage stopped and the run pauses. Which one holds
 * is decided here; what each one records and draws belongs to the fold in
 * `commit-settlement.ts`.
 */

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
 * What a stopped pause reports about the attempt's own failure: the harness
 * error it ended with, and, when an abort ended it, where that abort came from.
 * An attempt that completed has no such failure to describe.
 */
function stoppedDiagnostics(
  outcome: AttemptOutcome,
  signal: AbortSignal,
): WaitingDiagnostics | undefined {
  if (outcome.kind !== "failed") return undefined;
  const failure = {
    errorClass: outcome.errorClass,
    errorMessage: outcome.errorMessage,
  };
  return outcome.category === "aborted"
    ? { ...failure, origin: abortOrigin(signal) }
    : failure;
}

/**
 * What a stopped pause is told about the boundary. Only a boundary that was
 * reached and refused names a movement one resume may accept; every other case
 * has no refusal for the pause to describe.
 */
function refusedBoundary(
  boundary: BoundaryDisposition,
  advisoryHeadMovement: boolean,
  observedHead: string,
): BoundaryOutcome {
  if (!boundary.evaluated || boundary.ok) return { refused: false };
  return { refused: true, advisoryHeadMovement, observedHead };
}

export async function settleAttempt(
  ctx: StageContext,
  launched: LaunchedAttempt,
): Promise<ExecutionResult | null> {
  const { stage, stageIndex } = ctx;
  const executingAttempt = launched.record;
  const { outcome, session: agentSession } = launched;
  const attemptReference = {
    stageIndex,
    attempt: executingAttempt.attempt,
  };
  const startedAt = executingAttempt.startedAt;

  const postScan = await scanPendingQueues(ctx.repoRoot, ctx.threadRelPath);
  const pendingFiles = postScan.ok ? postScan.pendingFiles : [];
  const queueScanError = postScan.ok ? null : postScan.message;

  const parse =
    outcome.kind === "completed" ? parseTerminalOutcome(outcome.finalText) : null;
  const isDone = parse !== null && parse.token === "DONE";

  const postAttemptHead = await observeHead(ctx, "after-attempt");
  if (!postAttemptHead.ok) return refused(postAttemptHead.message);
  let observedHead = postAttemptHead.value;

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

  if (isDone) {
    const verdict = await verifyPromisedState(ctx, {
      attempt: attemptReference,
      pausedAtHead: observedHead,
      pendingFiles,
      queueScanError,
    });
    if (verdict.kind === "violated") {
      const endedAt = ctx.clock().toISOString();
      return commitSettlement(
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
          kind: "stopped",
          waiting: verdict.waiting,
          aborted: false,
          disposition: stageDisposition(false, parse),
        },
      );
    }
  }

  // The finalization owns every Git observation this boundary makes, so the tip
  // it left behind is what the settled attempt records.
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

  const endedAt = ctx.clock().toISOString();
  const settling: SettlingAttempt = {
    executing: executingAttempt,
    session: agentSession,
    endedAt,
    durationMs: Date.parse(endedAt) - Date.parse(startedAt),
    terminalResult: terminalResultFrom(parse),
    observedHead,
    pendingFiles,
  };

  if (classification.action === "advance") {
    return commitSettlement(ctx, settling, { kind: "advanced" });
  }

  if (classification.action === "pause-done") {
    return commitSettlement(ctx, settling, {
      kind: "done-pending-queues",
      waiting: Pause.donePendingQueues({
        classified: classification.reasons,
        attempt: attemptReference,
        queueResolution: stage.queueResolution,
      }),
    });
  }

  const aborted = outcome.kind === "failed" && outcome.category === "aborted";
  return commitSettlement(ctx, settling, {
    kind: "stopped",
    waiting: Pause.attemptStopped({
      classified: classification.reasons,
      aborted,
      diagnostics: stoppedDiagnostics(outcome, ctx.signal),
      attempt: attemptReference,
      boundary: refusedBoundary(boundary, headMovementAdvisory, observedHead),
    }),
    aborted,
    disposition: headMovementAdvisory
      ? "paused"
      : stageDisposition(aborted, parse),
  });
}
