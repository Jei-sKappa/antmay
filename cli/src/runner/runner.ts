import path from "node:path";

import type { Display } from "../display/types.js";
import { renderStagePrompt } from "../harness/prompt.js";
import type { AttemptOutcome, HarnessInvoker } from "../harness/types.js";
import {
  collectBoundaryStatus,
  readHead,
} from "../gitops/status.js";
import { evaluateBoundary, finalizeBoundary } from "../gitops/boundary.js";
import type { LockHandle } from "../state/lock.js";
import type {
  AttemptRecord,
  RunCheckpoint,
  SnapshottedStage,
  TerminalResult,
  WaitingDiagnostics,
  WaitingInfo,
} from "../state/checkpoint.js";
import { attemptLogPaths, createAttemptLog } from "../state/logs.js";
import type { AttemptLogHeader } from "../state/logs.js";
import { writeCheckpoint } from "../state/persist.js";
import { scanPendingQueues } from "../thread/queues.js";
import type { BoundaryDisposition } from "./classify.js";
import { classifyAttempt } from "./classify.js";
import type { OutcomeParse } from "./outcome.js";
import { parseTerminalOutcome } from "./outcome.js";

/** The interval between display heartbeats for a live attempt. */
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * The unstable and injected dependencies plus the durable inputs the runner
 * drives one run to a pause or completion from. `checkpoint` is the starting
 * cursor (its `stageIndex` is where the loop begins). The caller owns the lock's
 * acquire/release symmetry; the runner never releases it.
 */
export type RunnerContext = {
  checkpoint: RunCheckpoint;
  runDir: string;
  stateRoot: string;
  lock: LockHandle;
  invoker: HarnessInvoker;
  display: Display;
  harnessVersions: Record<string, string>;
  signal: AbortSignal;
  clock?: () => Date;
};

/**
 * The outcome the runner returns to its command caller, which maps it to a
 * process exit code. Skill-local to the runner/commands seam.
 */
export type RunnerResult =
  | { status: "completed" }
  | { status: "paused"; waiting: WaitingInfo }
  | { status: "fatal-checkpoint"; message: string };

type PersistOutcome = { ok: true } | { ok: false; message: string };

const DR54_WARNING =
  "The attempt's file changes are unvalidated: revert them or deliberately " +
  "commit them before resuming.";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function replaceLast(
  attempts: AttemptRecord[],
  record: AttemptRecord,
): AttemptRecord[] {
  return [...attempts.slice(0, -1), record];
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

/** Build the stored terminal-result candidate from a parse, or null when the
 * attempt produced no terminal text at all. */
function terminalResultFrom(parse: OutcomeParse | null): TerminalResult | null {
  if (parse === null) return null;
  if (parse.token === null) {
    return { token: null, candidateLine: parse.candidateLine, detail: "" };
  }
  return { token: parse.token, candidateLine: parse.candidateLine, detail: parse.detail };
}

function candidateLineOf(parse: OutcomeParse | null): string | undefined {
  if (parse === null) return undefined;
  return parse.candidateLine === null ? undefined : parse.candidateLine;
}

function abortOrigin(signal: AbortSignal): string {
  const reason = signal.reason;
  if (typeof reason === "string" && reason.length > 0) return reason;
  if (reason instanceof Error && reason.message.length > 0) return reason.message;
  return "aborted";
}

function gateErrorMessage(scanError: string): string {
  return (
    "The advancement invariant could not be evaluated because the " +
    `pending-queue scan failed: ${scanError}`
  );
}

function pendingQueuesMessage(sorted: string[]): string {
  const subject =
    sorted.length === 1
      ? "a pending bundle file awaits"
      : "pending bundle files await";
  return `The stage cannot advance while ${subject} human resolution: ${sorted.join(", ")}.`;
}

/**
 * Drive one run from its checkpoint cursor through the generic stage loop until
 * a durable pause, a fatal checkpoint error, or recipe completion. Consumes only
 * snapshotted stage data and typed inputs — never a recipe, stage, or skill
 * identity. The caller releases the lock.
 */
export async function executeRun(ctx: RunnerContext): Promise<RunnerResult> {
  const { runDir, invoker, display, signal } = ctx;
  const clock = ctx.clock ?? (() => new Date());
  let checkpoint = ctx.checkpoint;

  const repoRoot = checkpoint.repoRoot;
  const threadRelPath = checkpoint.threadRelPath;
  const threadFolder = path.posix.basename(threadRelPath);
  const stageCount = checkpoint.stages.length;
  const runId = checkpoint.runId;
  const recipeName = checkpoint.recipeName;
  const checkpointPath = path.join(runDir, "state.json");
  const resumeCommand = `antmay afk resume ${runId}`;

  async function persist(next: RunCheckpoint): Promise<PersistOutcome> {
    const stamped: RunCheckpoint = { ...next, updatedAt: clock().toISOString() };
    try {
      await writeCheckpoint(runDir, stamped);
      checkpoint = stamped;
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  }

  function fatal(message: string): RunnerResult {
    display.warn(message);
    return { status: "fatal-checkpoint", message };
  }

  while (checkpoint.stageIndex < stageCount) {
    const stageIndex = checkpoint.stageIndex;
    const stage: SnapshottedStage = checkpoint.stages[stageIndex];
    const profile = stage.profile;
    const ordinal = stageIndex + 1;
    const stagePosition = `${ordinal}/${stageCount}`;

    // 1. Pre-attempt queue gate. Neither branch allocates an attempt, creates a
    //    log, or launches the harness; the pause payload carries no log path.
    const preScan = await scanPendingQueues(repoRoot, threadRelPath);
    if (!preScan.ok) {
      const message = gateErrorMessage(preScan.message);
      const waiting: WaitingInfo = {
        kind: "gate-error",
        message,
        diagnostics: { category: "gate-error", errorMessage: preScan.message },
      };
      const persisted = await persist({
        ...checkpoint,
        condition: "waiting-for-user",
        waiting,
      });
      if (!persisted.ok) return fatal(persisted.message);
      display.runPaused({ waiting, runId, logAbsPath: null, resumeCommand, checkpointPath });
      return { status: "paused", waiting };
    }
    if (preScan.pendingFiles.length > 0) {
      const pendingFiles = preScan.pendingFiles;
      const waiting: WaitingInfo = {
        kind: "pending-queues",
        message: pendingQueuesMessage(pendingFiles),
        pendingFiles,
      };
      const persisted = await persist({
        ...checkpoint,
        condition: "waiting-for-user",
        waiting,
      });
      if (!persisted.ok) return fatal(persisted.message);
      display.runPaused({ waiting, runId, logAbsPath: null, resumeCommand, checkpointPath });
      return { status: "paused", waiting };
    }

    // 2. Attempt setup: read attempt-start HEAD, init/preserve the stage-entry
    //    baseline, persist the executing attempt BEFORE creating its log.
    const attemptStartHead = await readHead(repoRoot);
    const cursorEntry =
      checkpoint.gitCursor.stageIndex === stageIndex &&
      checkpoint.gitCursor.headAtStageEntry !== null
        ? checkpoint.gitCursor.headAtStageEntry
        : attemptStartHead;
    const attemptNumber = nextAttemptNumber(checkpoint.attempts, stageIndex);
    const logPaths = attemptLogPaths(runDir, ordinal, stage.id, attemptNumber);
    const startedAt = clock().toISOString();

    const executingAttempt: AttemptRecord = {
      attempt: attemptNumber,
      stageIndex,
      stageId: stage.id,
      startedAt,
      result: "executing",
      terminalResult: null,
      logPath: logPaths.runRelPath,
    };

    const executingPersist = await persist({
      ...checkpoint,
      condition: "executing",
      waiting: null,
      attempts: [...checkpoint.attempts, executingAttempt],
      gitCursor: {
        stageIndex,
        headAtStageEntry: cursorEntry,
        observedHead: attemptStartHead,
      },
    });
    // A persistence failure creates no log and prevents launch.
    if (!executingPersist.ok) return fatal(executingPersist.message);

    // Only after persistence succeeds, exclusively create the header log. A
    // log-header failure leaves the durable executing attempt recoverable, does
    // not launch, and reports a fatal checkpoint.
    const header: AttemptLogHeader = {
      runId,
      stageId: stage.id,
      stageOrdinal: ordinal,
      attempt: attemptNumber,
      harness: profile.harness,
      model: profile.model,
      harnessVersion:
        ctx.harnessVersions[profile.harness] ??
        checkpoint.observedHarnessVersions[profile.harness] ??
        "unknown",
      repoRoot,
      threadRelPath,
      startedAt,
    };
    try {
      await createAttemptLog(logPaths, header);
    } catch (error) {
      return fatal(`Failed to initialize the attempt log: ${errorMessage(error)}`);
    }

    // 3. Invoke. The prompt is pure and deterministic from the snapshot.
    display.attemptStarted({
      stagePosition,
      stageId: stage.id,
      harness: profile.harness,
      model: profile.model,
      attempt: attemptNumber,
      logAbsPath: logPaths.absPath,
    });

    const prompt = renderStagePrompt(
      profile.harness,
      stage.skill,
      stage.resolvedTarget,
      profile.prompt,
    );

    const attemptStartMs = Date.now();
    const heartbeat = setInterval(() => {
      display.heartbeat(Date.now() - attemptStartMs);
    }, HEARTBEAT_INTERVAL_MS);
    heartbeat.unref();

    let outcome: AttemptOutcome;
    try {
      outcome = await invoker.invoke({
        harness: profile.harness,
        model: profile.model,
        prompt,
        idleTimeoutSeconds: profile.idleTimeoutSeconds,
        dangerouslySkipPermissions: checkpoint.dangerouslySkipPermissions,
        workspace: checkpoint.workspace.execution,
        logFilePath: logPaths.absPath,
        onEvent: (event) => display.harnessEvent(event),
        signal,
      });
    } finally {
      clearInterval(heartbeat);
    }

    // 4. Post-attempt gates: re-scan queues, parse on completion, read the
    //    post-attempt HEAD for every settled attempt, finalize a DONE boundary.
    const postScan = await scanPendingQueues(repoRoot, threadRelPath);
    const pendingFiles = postScan.ok ? postScan.pendingFiles : [];
    const queueScanError = postScan.ok ? null : postScan.message;

    const parse = outcome.kind === "completed" ? parseTerminalOutcome(outcome.finalText) : null;
    const isDone = parse !== null && parse.token === "DONE";

    let observedHead = await readHead(repoRoot);
    let boundary: BoundaryDisposition = { evaluated: false };
    if (isDone) {
      const observedPaths = await collectBoundaryStatus(repoRoot);
      const evaluation = evaluateBoundary(
        stage.gitPolicy,
        threadRelPath,
        observedPaths,
        attemptStartHead,
        observedHead,
      );
      if (!evaluation.ok) {
        boundary = { evaluated: true, ok: false, kind: evaluation.kind, message: evaluation.message };
      } else {
        const finalized = await finalizeBoundary(
          repoRoot,
          stage.gitPolicy,
          threadFolder,
          evaluation,
        );
        if (finalized.kind === "commit-error") {
          boundary = { evaluated: true, ok: false, kind: "commit-error", message: finalized.message };
        } else {
          boundary = { evaluated: true, ok: true };
        }
      }
      // Re-read HEAD so an executor commit becomes the pause-time observation.
      observedHead = await readHead(repoRoot);
    }

    const classification = classifyAttempt({
      attemptOutcome: outcome,
      parse,
      pendingFiles,
      queueScanError,
      boundary,
    });

    // 5. Transition. Persist the final HEAD observation on the git cursor so a
    //    later resume compares against the actual pause-time boundary.
    const endedAt = clock().toISOString();
    const finalCursor = {
      stageIndex,
      headAtStageEntry: cursorEntry,
      observedHead,
    };
    const terminalResult = terminalResultFrom(parse);

    if (classification.action === "advance") {
      const done: AttemptRecord = {
        ...executingAttempt,
        result: "done",
        endedAt,
        terminalResult,
      };
      const nextIndex = stageIndex + 1;
      const completed = nextIndex === stageCount;
      const persisted = await persist({
        ...checkpoint,
        attempts: replaceLast(checkpoint.attempts, done),
        stageIndex: nextIndex,
        condition: completed ? "completed" : "ready",
        waiting: null,
        gitCursor: { stageIndex: nextIndex, headAtStageEntry: null, observedHead: null },
      });
      if (!persisted.ok) return fatal(persisted.message);
      display.stageSucceeded({
        stagePosition,
        durationMs: Date.parse(endedAt) - Date.parse(startedAt),
      });
      if (completed) {
        display.runCompleted({
          runId,
          recipeName,
          totalElapsedMs: clock().getTime() - Date.parse(checkpoint.createdAt),
          checkpointPath,
        });
        return { status: "completed" };
      }
      continue;
    }

    if (classification.action === "pause-done") {
      const done: AttemptRecord = {
        ...executingAttempt,
        result: "done",
        endedAt,
        terminalResult,
        pendingFiles,
      };
      const waiting: WaitingInfo = {
        kind: "pending-queues",
        message: classification.message,
        pendingFiles,
        candidateLine: candidateLineOf(parse),
      };
      const persisted = await persist({
        ...checkpoint,
        attempts: replaceLast(checkpoint.attempts, done),
        condition: "waiting-for-user",
        waiting,
        gitCursor: finalCursor,
      });
      if (!persisted.ok) return fatal(persisted.message);
      display.runPaused({
        waiting,
        runId,
        logAbsPath: logPaths.absPath,
        resumeCommand,
        checkpointPath,
      });
      return { status: "paused", waiting };
    }

    // classification.action === "pause": every non-DONE pause. When the abort
    // signal caused it, the attempt records `interrupted` with its origin.
    const aborted = outcome.kind === "failed" && outcome.category === "aborted";
    const kind = aborted ? "interrupted" : classification.kind;
    const baseMessage = aborted
      ? "The attempt was interrupted before producing a terminal outcome."
      : classification.message;
    const message = `${baseMessage} ${DR54_WARNING}`;

    let diagnostics: WaitingDiagnostics | undefined;
    if (outcome.kind === "failed") {
      diagnostics = aborted
        ? {
            category: "interrupted",
            errorClass: outcome.errorClass,
            errorMessage: outcome.errorMessage,
            origin: abortOrigin(signal),
          }
        : {
            category: outcome.category,
            errorClass: outcome.errorClass,
            errorMessage: outcome.errorMessage,
          };
    }

    const waiting: WaitingInfo = {
      kind,
      message,
      pendingFiles: pendingFiles.length > 0 ? pendingFiles : undefined,
      candidateLine: candidateLineOf(parse),
      diagnostics,
    };
    const settled: AttemptRecord = {
      ...executingAttempt,
      result: aborted ? "interrupted" : "waiting",
      endedAt,
      terminalResult,
      pendingFiles: pendingFiles.length > 0 ? pendingFiles : undefined,
      failure: { kind, message: baseMessage },
    };
    const persisted = await persist({
      ...checkpoint,
      attempts: replaceLast(checkpoint.attempts, settled),
      condition: "waiting-for-user",
      waiting,
      gitCursor: finalCursor,
    });
    if (!persisted.ok) return fatal(persisted.message);
    display.runPaused({
      waiting,
      runId,
      logAbsPath: logPaths.absPath,
      resumeCommand,
      checkpointPath,
    });
    return { status: "paused", waiting };
  }

  // The cursor already sat at (or past) the final stage on entry.
  display.runCompleted({
    runId,
    recipeName,
    totalElapsedMs: clock().getTime() - Date.parse(checkpoint.createdAt),
    checkpointPath,
  });
  return { status: "completed" };
}
