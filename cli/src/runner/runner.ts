import path from "node:path";

import type { Display, StageDisposition } from "../display/types.js";
import { nativeContinuationCommand } from "../harness/native-session.js";
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
  WaitingReason,
  WaitingReasons,
} from "../state/checkpoint.js";
import {
  CONTRACT_REPAIR_NOTE,
  UNVALIDATED_CHANGES_NOTE,
} from "../state/checkpoint.js";
import { attemptLogPaths, createAttemptLog } from "../state/logs.js";
import type { AttemptLogHeader } from "../state/logs.js";
import { writeCheckpoint } from "../state/persist.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";
import {
  describeContractSide,
  evaluateArtifactPrerequisite,
  evaluatePromisedState,
  inspectArtifactState,
} from "../thread/artifacts.js";
import { scanPendingQueues } from "../thread/queues.js";
import type { BoundaryDisposition } from "./classify.js";
import {
  classifyAttempt,
  gateErrorMessage,
  pendingQueuesMessage,
  queueReasons,
} from "./classify.js";
import type { OutcomeParse } from "./outcome.js";
import { parseTerminalOutcome } from "./outcome.js";
import { SignalInterruption } from "./signals.js";

/** Milliseconds per second, for turning the binding's interval into a timer. */
const MS_PER_SECOND = 1000;

/**
 * The instruction a pre-attempt prerequisite pause carries: the stage was never
 * launched, so there is nothing to revert — the artifacts the pause listed have
 * to come back, and the worktree has to be clean, before the stage can run.
 *
 * One static sentence, never composed from the unmet dimensions: the pause's
 * requirement sections already show which thread files need attention.
 */
const RESTORE_PREREQUISITE_NOTE =
  "Fix the thread files shown above and leave the worktree clean, then resume.";

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
  /**
   * Atomic checkpoint writer. Defaults to production `writeCheckpoint`; tests
   * may inject a wrapper to control ordering and failure without changing
   * production callers.
   */
  persistCheckpoint?: typeof writeCheckpoint;
};

/**
 * The outcome the runner returns to its command caller, which maps it to a
 * process exit code. Skill-local to the runner/commands seam.
 */
export type RunnerResult =
  | { status: "completed" }
  | { status: "paused"; waiting: WaitingInfo }
  | { status: "interrupted"; signal: NodeJS.Signals }
  | { status: "fatal-checkpoint"; message: string };

type PersistOutcome = { ok: true } | { ok: false; message: string };

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

/** The originating signal name when the abort reason is a `SignalInterruption`,
 * else `null` for any other (or absent) abort. */
function signalReason(signal: AbortSignal): NodeJS.Signals | null {
  const reason = signal.reason;
  return reason instanceof SignalInterruption ? reason.signal : null;
}

function abortOrigin(signal: AbortSignal): string {
  const reason = signal.reason;
  if (typeof reason === "string" && reason.length > 0) return reason;
  if (reason instanceof Error && reason.message.length > 0) return reason.message;
  return "aborted";
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

function withAgentSession(
  record: AttemptRecord,
  session: { id: string } | undefined,
): AttemptRecord {
  if (session === undefined) return record;
  return { ...record, agentSession: session };
}

function prerequisiteMessage(
  stagePosition: string,
  stageId: string,
  unmet: readonly ArtifactMismatch[],
): string {
  return (
    `Stage ${stagePosition} "${stageId}" cannot start: it requires ` +
    `${describeContractSide(unmet, "expected")}, but the thread's current ` +
    `artifact state has ${describeContractSide(unmet, "observed")}.`
  );
}

function contractViolationMessage(unmet: readonly ArtifactMismatch[]): string {
  return (
    "The stage reported DONE without leaving the artifact state it promises: " +
    `it promises ${describeContractSide(unmet, "expected")}, but the thread ` +
    `has ${describeContractSide(unmet, "observed")}.`
  );
}

/**
 * Drive one run from its checkpoint cursor through the generic stage loop until
 * a durable pause, a fatal checkpoint error, or pipeline completion. Consumes only
 * snapshotted stage data and typed inputs — never a pipeline, stage, or skill
 * identity. The caller releases the lock.
 */
export async function executeRun(ctx: RunnerContext): Promise<RunnerResult> {
  const { runDir, invoker, display, signal } = ctx;
  const clock = ctx.clock ?? (() => new Date());
  const persistCheckpoint = ctx.persistCheckpoint ?? writeCheckpoint;
  let checkpoint = ctx.checkpoint;

  const repoRoot = checkpoint.repoRoot;
  const threadRelPath = checkpoint.threadRelPath;
  const threadFolder = path.posix.basename(threadRelPath);
  const stageCount = checkpoint.stages.length;
  const runId = checkpoint.runId;
  const pipelineName = checkpoint.pipelineName;
  const checkpointPath = path.join(runDir, "state.json");
  const resumeCommand = `antmay afk resume ${runId}`;

  async function persist(next: RunCheckpoint): Promise<PersistOutcome> {
    const stamped: RunCheckpoint = { ...next, updatedAt: clock().toISOString() };
    try {
      await persistCheckpoint(runDir, stamped);
      checkpoint = stamped;
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  }

  function elapsedMs(): number {
    return clock().getTime() - Date.parse(checkpoint.createdAt);
  }

  function fatal(message: string): RunnerResult {
    display.runFailed({
      runId,
      pipelineName,
      totalElapsedMs: elapsedMs(),
      checkpointPath,
      message,
    });
    return { status: "fatal-checkpoint", message };
  }

  // Render the durable pause. `createdAt` never changes across a persist, so the
  // run's total elapsed time is derived at call time from the live checkpoint.
  // Log and Continue both come from the persisted attempt this pause is about;
  // a pre-attempt pause passes none.
  function renderPause(
    waiting: WaitingInfo,
    attempt: AttemptRecord | undefined = undefined,
  ): void {
    const logAbsPath =
      attempt === undefined ? null : path.join(runDir, attempt.logPath);
    const continuationCommand =
      attempt?.agentSession !== undefined
        ? nativeContinuationCommand(
            checkpoint.stages[attempt.stageIndex]!.binding.agent.harness,
            attempt.agentSession.id,
          )
        : undefined;
    display.runPaused({
      waiting,
      currentStage: {
        id: checkpoint.stages[checkpoint.stageIndex]!.id,
        position: checkpoint.stageIndex + 1,
        count: checkpoint.stages.length,
      },
      runId,
      pipelineName,
      totalElapsedMs: elapsedMs(),
      logAbsPath,
      continuationCommand,
      resumeCommand,
      checkpointPath,
    });
  }

  // Finish a reserved attempt as a signal interruption: persist a durable
  // `interrupted` waiting pause carrying the signal origin, the unvalidated-
  // changes note, and any pending paths retained as evidence, then return
  // `interrupted`.
  async function finishInterrupted(args: {
    sig: NodeJS.Signals;
    executingAttempt: AttemptRecord;
    finalCursor: {
      stageIndex: number;
      observedHead: string | null;
    };
    pendingFiles: string[];
    failure?: { errorClass: string; errorMessage: string };
    agentSession?: { id: string };
  }): Promise<RunnerResult> {
    const endedAt = clock().toISOString();
    const baseMessage =
      "The attempt was interrupted before producing a terminal outcome.";
    const pending = args.pendingFiles.length > 0 ? args.pendingFiles : undefined;
    const diagnostics: WaitingDiagnostics = args.failure
      ? {
          errorClass: args.failure.errorClass,
          errorMessage: args.failure.errorMessage,
          origin: args.sig,
        }
      : { origin: args.sig };
    // The interruption is what stopped the run; pending paths observed on the
    // way out are a second, independent reason it cannot simply resume.
    const reasons: WaitingReasons = [
      { kind: "interrupted", message: baseMessage, diagnostics },
    ];
    if (pending !== undefined) {
      reasons.push({
        kind: "pending-queues",
        message: pendingQueuesMessage(pending),
        pendingFiles: pending,
      });
    }
    const waiting: WaitingInfo = {
      reasons,
      nextAction: UNVALIDATED_CHANGES_NOTE,
    };
    const settled: AttemptRecord = withAgentSession(
      {
        ...args.executingAttempt,
        result: "interrupted",
        endedAt,
        terminalResult: null,
        pendingFiles: pending,
        failure: { kind: "interrupted", message: baseMessage },
      },
      args.agentSession,
    );
    const persisted = await persist({
      ...checkpoint,
      attempts: replaceLast(checkpoint.attempts, settled),
      condition: "waiting-for-user",
      waiting,
      gitCursor: args.finalCursor,
    });
    if (!persisted.ok) return fatal(persisted.message);
    display.stageStopped({
      stagePosition: `${args.executingAttempt.stageIndex + 1}/${stageCount}`,
      durationMs: Date.parse(endedAt) - Date.parse(args.executingAttempt.startedAt),
      disposition: "interrupted",
    });
    renderPause(waiting, settled);
    return { status: "interrupted", signal: args.sig };
  }

  while (checkpoint.stageIndex < stageCount) {
    // A first signal while the checkpoint is durably ready between stages stops
    // before allocating anything: the cursor stays byte-for-byte unchanged, no
    // fictional pause is rendered, and the run reports the interruption.
    const readySig = signalReason(signal);
    if (readySig !== null) {
      display.runInterrupted({
        runId,
        pipelineName,
        totalElapsedMs: elapsedMs(),
        checkpointPath,
        resumeCommand,
        signal: readySig,
      });
      return { status: "interrupted", signal: readySig };
    }

    const stageIndex = checkpoint.stageIndex;
    const stage: SnapshottedStage = checkpoint.stages[stageIndex];
    const binding = stage.binding;
    const agent = binding.agent;
    const ordinal = stageIndex + 1;
    const stagePosition = `${ordinal}/${stageCount}`;

    // 1. Pre-attempt queue gate. Neither branch allocates an attempt, creates a
    //    log, or launches the harness; the pause payload carries no log path.
    const preScan = await scanPendingQueues(repoRoot, threadRelPath);
    if (!preScan.ok) {
      const message = gateErrorMessage(preScan.message);
      const waiting: WaitingInfo = {
        reasons: [
          {
            kind: "gate-error",
            message,
            diagnostics: { errorMessage: preScan.message },
          },
        ],
      };
      const persisted = await persist({
        ...checkpoint,
        condition: "waiting-for-user",
        waiting,
      });
      if (!persisted.ok) return fatal(persisted.message);
      renderPause(waiting);
      return { status: "paused", waiting };
    }
    if (preScan.pendingFiles.length > 0) {
      const pendingFiles = preScan.pendingFiles;
      const message = pendingQueuesMessage(pendingFiles);
      const waiting: WaitingInfo = {
        reasons: [{ kind: "pending-queues", message, pendingFiles }],
      };
      const persisted = await persist({
        ...checkpoint,
        condition: "waiting-for-user",
        waiting,
      });
      if (!persisted.ok) return fatal(persisted.message);
      renderPause(waiting);
      return { status: "paused", waiting };
    }

    // 2. Pre-attempt artifact contract. Composition proved the stage runnable
    //    against the state it simulated at allocation time; the concrete state
    //    can have moved since, so it is re-inspected here. An unmet
    //    prerequisite pauses on this stage having allocated no attempt, created
    //    no log, and invoked no harness.
    const preInspection = await inspectArtifactState(repoRoot, threadRelPath);
    let prerequisiteReason: WaitingReason | null = null;
    if (!preInspection.ok) {
      prerequisiteReason = {
        kind: "stage-prerequisite-unmet",
        message:
          `The requirements for stage ${stagePosition} "${stage.id}" could not ` +
          `be checked: ${preInspection.message}`,
        diagnostics: { errorMessage: preInspection.message },
      };
    } else {
      const unmet = evaluateArtifactPrerequisite(
        preInspection.state,
        stage.prerequisite,
      );
      if (unmet.length > 0) {
        prerequisiteReason = {
          kind: "stage-prerequisite-unmet",
          message: prerequisiteMessage(stagePosition, stage.id, unmet),
          contract: unmet,
        };
      }
    }
    if (prerequisiteReason !== null) {
      const waiting: WaitingInfo = {
        reasons: [prerequisiteReason],
        nextAction: RESTORE_PREREQUISITE_NOTE,
      };
      const persisted = await persist({
        ...checkpoint,
        condition: "waiting-for-user",
        waiting,
      });
      if (!persisted.ok) return fatal(persisted.message);
      renderPause(waiting);
      return { status: "paused", waiting };
    }

    // 3. Attempt setup: read attempt-start HEAD, persist the executing attempt
    //    BEFORE creating its log.
    const attemptStartHead = await readHead(repoRoot);
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
      harness: agent.harness,
      model: agent.model,
      harnessVersion:
        ctx.harnessVersions[agent.harness] ??
        checkpoint.observedHarnessVersions[agent.harness] ??
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

    // 4. Invoke. The prompt is pure and deterministic from the snapshot.
    display.attemptStarted({
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
    const preLaunchSig = signalReason(signal);
    if (preLaunchSig !== null) {
      return finishInterrupted({
        sig: preLaunchSig,
        executingAttempt,
        finalCursor: {
          stageIndex,
          observedHead: attemptStartHead,
        },
        pendingFiles: [],
      });
    }

    const attemptStartMs = Date.now();
    const heartbeat = setInterval(() => {
      display.heartbeat(Date.now() - attemptStartMs);
    }, binding.heartbeatSeconds * MS_PER_SECOND);
    heartbeat.unref();

    // Live session capture: first non-empty ID starts exactly one provisional
    // checkpoint write. The promise is retained and awaited before settlement.
    let liveSession: { id: string } | undefined;
    let provisionalWrite: Promise<PersistOutcome> | undefined;

    let outcome: AttemptOutcome;
    try {
      outcome = await invoker.invoke({
        harness: agent.harness,
        model: agent.model,
        prompt,
        stage: {
          id: stage.id,
          skill: stage.skill,
          resolvedTarget: stage.resolvedTarget,
          threadRelPath,
          ...(stage.instructions !== undefined
            ? { instructions: stage.instructions }
            : {}),
          attemptNumber,
        },
        idleTimeoutSeconds: binding.idleTimeoutSeconds,
        dangerouslySkipPermissions: checkpoint.dangerouslySkipPermissions,
        workspace: checkpoint.workspace.execution,
        logFilePath: logPaths.absPath,
        onEvent: (event) => display.harnessEvent(event),
        onSessionCaptured: (session) => {
          if (liveSession !== undefined) return;
          if (typeof session.id !== "string" || session.id.length === 0) return;
          liveSession = { id: session.id };
          // Do not await here — retain the promise and serialize before settlement.
          provisionalWrite = persist({
            ...checkpoint,
            attempts: replaceLast(
              checkpoint.attempts,
              withAgentSession(executingAttempt, liveSession),
            ),
          });
        },
        signal,
      });
    } finally {
      clearInterval(heartbeat);
      if (provisionalWrite !== undefined) {
        const early = await provisionalWrite;
        if (!early.ok) {
          display.warn(
            `Failed to persist the live agent session on the executing attempt: ${early.message}`,
          );
        }
      }
    }

    const agentSession = resolveAttemptSession(outcome, liveSession);

    // 5. Post-attempt gates: re-scan queues, parse on completion, read the
    //    post-attempt HEAD for every settled attempt, finalize a DONE boundary.
    const postScan = await scanPendingQueues(repoRoot, threadRelPath);
    const pendingFiles = postScan.ok ? postScan.pendingFiles : [];
    const queueScanError = postScan.ok ? null : postScan.message;

    const parse = outcome.kind === "completed" ? parseTerminalOutcome(outcome.finalText) : null;
    const isDone = parse !== null && parse.token === "DONE";

    let observedHead = await readHead(repoRoot);

    // A signal-caused abort is an interruption. This branch precedes ordinary
    // non-DONE queue/error classification: a first-signal rejection is always
    // interruption, never harness-error or a pending-queues relabel. The
    // post-attempt scan's pending paths are retained as evidence.
    const abortSig = signalReason(signal);
    if (
      outcome.kind === "failed" &&
      outcome.category === "aborted" &&
      abortSig !== null
    ) {
      return finishInterrupted({
        sig: abortSig,
        executingAttempt,
        finalCursor: { stageIndex, observedHead },
        pendingFiles,
        failure: {
          errorClass: outcome.errorClass,
          errorMessage: outcome.errorMessage,
        },
        agentSession,
      });
    }

    // A recognized DONE claims the stage's promised artifact state, so that
    // claim is verified against freshly inspected concrete state before the
    // boundary is looked at. Nothing downstream — Git evaluation, the executor
    // commit, the stage advance, the queue resolution — runs on an unmet
    // promise; the completed attempt is preserved instead, so a human repair can
    // finalize it later without running the stage again.
    if (isDone) {
      const postInspection = await inspectArtifactState(repoRoot, threadRelPath);
      let violation: WaitingReason | null = null;
      if (!postInspection.ok) {
        // No end-to-end path reaches this branch, and none is expected to. An
        // inspection fails only when the thread directory cannot be read at all,
        // preflight refuses to start a run whose thread it cannot inspect, and
        // nothing the executor, a stage's skill, or a boundary commit does
        // revokes that readability mid-run — so producing it takes an outside
        // actor, and a test for it would have to fabricate a state the system
        // does not reach. It is written anyway because pausing is the
        // fail-closed direction: a promise that could not be evaluated is never
        // credited as kept, so an unreadable thread stops the pipeline with the
        // completed attempt preserved rather than advancing past it.
        violation = {
          kind: "stage-contract-violation",
          message: `The stage reported DONE but its promised artifact state could not be verified: ${postInspection.message}`,
          diagnostics: { errorMessage: postInspection.message },
        };
      } else {
        const unmet = evaluatePromisedState(postInspection.state, stage.promises);
        if (unmet.length > 0) {
          violation = {
            kind: "stage-contract-violation",
            message: contractViolationMessage(unmet),
            contract: unmet,
          };
        }
      }
      if (violation !== null) {
        const endedAt = clock().toISOString();
        const waiting: WaitingInfo = {
          reasons: [
            // The attempt's own start HEAD travels with the pause. This stage's
            // boundary is never reached, so the finalization that a repair
            // unlocks has nothing else to judge the HEAD rule against, and that
            // rule judges this attempt's own movement — never a commit an
            // earlier attempt or an earlier pause left behind.
            { ...violation, headAtAttemptStart: attemptStartHead },
            ...queueReasons(pendingFiles, queueScanError),
          ],
          nextAction: CONTRACT_REPAIR_NOTE,
        };
        const settled: AttemptRecord = withAgentSession(
          {
            ...executingAttempt,
            result: "waiting",
            endedAt,
            terminalResult: terminalResultFrom(parse),
            pendingFiles: pendingFiles.length > 0 ? pendingFiles : undefined,
            failure: { kind: violation.kind, message: violation.message },
          },
          agentSession,
        );
        const persisted = await persist({
          ...checkpoint,
          attempts: replaceLast(checkpoint.attempts, settled),
          condition: "waiting-for-user",
          waiting,
          // The cursor keeps the attempt's own HEAD observation, which is what
          // a later finalization compares against.
          gitCursor: { stageIndex, observedHead },
        });
        if (!persisted.ok) return fatal(persisted.message);
        display.stageStopped({
          stagePosition,
          durationMs: Date.parse(endedAt) - Date.parse(startedAt),
          disposition: stageDisposition(false, parse),
        });
        renderPause(waiting, settled);
        return { status: "paused", waiting };
      }
    }

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
          if (finalized.kind === "committed") {
            // The executor's boundary commit moved the tip, so re-read HEAD to
            // make that commit the pause-time observation. Every other path
            // leaves the tip where the post-attempt read already observed it: a
            // failed evaluation runs no Git command at all, an
            // `advanced-without-commit` finalization stages and commits nothing,
            // and a `commit-error` never produced a commit object.
            observedHead = await readHead(repoRoot);
          }
        }
      }
    }

    const classification = classifyAttempt({
      attemptOutcome: outcome,
      parse,
      pendingFiles,
      queueScanError,
      boundary,
    });

    // 6. Transition. Persist the final HEAD observation on the git cursor so a
    //    later resume compares against the actual pause-time boundary.
    const endedAt = clock().toISOString();
    const durationMs = Date.parse(endedAt) - Date.parse(startedAt);
    const finalCursor = {
      stageIndex,
      observedHead,
    };
    const terminalResult = terminalResultFrom(parse);

    if (classification.action === "advance") {
      const done: AttemptRecord = withAgentSession(
        {
          ...executingAttempt,
          result: "done",
          endedAt,
          terminalResult,
        },
        agentSession,
      );
      const nextIndex = stageIndex + 1;
      const completed = nextIndex === stageCount;
      const persisted = await persist({
        ...checkpoint,
        attempts: replaceLast(checkpoint.attempts, done),
        stageIndex: nextIndex,
        condition: completed ? "completed" : "ready",
        waiting: null,
        gitCursor: { stageIndex: nextIndex, observedHead: null },
      });
      if (!persisted.ok) return fatal(persisted.message);
      display.stageSucceeded({ stagePosition, durationMs });
      if (completed) {
        display.runCompleted({
          runId,
          pipelineName,
          totalElapsedMs: elapsedMs(),
          checkpointPath,
          stageCount,
        });
        return { status: "completed" };
      }
      continue;
    }

    if (classification.action === "pause-done") {
      const done: AttemptRecord = withAgentSession(
        {
          ...executingAttempt,
          result: "done",
          endedAt,
          terminalResult,
          pendingFiles,
        },
        agentSession,
      );
      const waiting: WaitingInfo = { reasons: classification.reasons };
      const persisted = await persist({
        ...checkpoint,
        attempts: replaceLast(checkpoint.attempts, done),
        condition: "waiting-for-user",
        waiting,
        gitCursor: finalCursor,
      });
      if (!persisted.ok) return fatal(persisted.message);
      // The stage itself succeeded — it reported DONE and its boundary was
      // finalized. Only the pending bundle keeps the run from advancing.
      display.stageSucceeded({ stagePosition, durationMs });
      renderPause(waiting, done);
      return { status: "paused", waiting };
    }

    // classification.action === "pause": every non-DONE pause. When the abort
    // signal caused it, the attempt records `interrupted` with its origin.
    const aborted = outcome.kind === "failed" && outcome.category === "aborted";
    const governing = classification.reasons[0];
    const kind = aborted ? "interrupted" : governing.kind;
    const baseMessage = aborted
      ? "The attempt was interrupted before producing a terminal outcome."
      : governing.message;
    let diagnostics: WaitingDiagnostics | undefined;
    if (outcome.kind === "failed") {
      diagnostics = aborted
        ? {
            errorClass: outcome.errorClass,
            errorMessage: outcome.errorMessage,
            origin: abortOrigin(signal),
          }
        : { errorClass: outcome.errorClass, errorMessage: outcome.errorMessage };
    }

    // An abort replaces the stage's own reason with the interruption, but the
    // queue-level reasons it observed still hold and are still reported. Either
    // way the attempt's failure telemetry rides on the reason that reports that
    // failure, which is the only reason it describes.
    const reasons: WaitingReasons = aborted
      ? [
          { kind: "interrupted", message: baseMessage, diagnostics },
          ...classification.reasons.filter(
            (reason) =>
              reason.kind === "pending-queues" || reason.kind === "gate-error",
          ),
        ]
      : diagnostics === undefined
        ? classification.reasons
        : (classification.reasons.map((reason) =>
            reason.kind === "harness-error" || reason.kind === "idle-timeout"
              ? { ...reason, diagnostics }
              : reason,
          ) as WaitingReasons);

    const waiting: WaitingInfo = {
      reasons,
      nextAction: UNVALIDATED_CHANGES_NOTE,
    };
    const settled: AttemptRecord = withAgentSession(
      {
        ...executingAttempt,
        result: aborted ? "interrupted" : "waiting",
        endedAt,
        terminalResult,
        pendingFiles: pendingFiles.length > 0 ? pendingFiles : undefined,
        failure: { kind, message: baseMessage },
      },
      agentSession,
    );
    const persisted = await persist({
      ...checkpoint,
      attempts: replaceLast(checkpoint.attempts, settled),
      condition: "waiting-for-user",
      waiting,
      gitCursor: finalCursor,
    });
    if (!persisted.ok) return fatal(persisted.message);
    display.stageStopped({
      stagePosition,
      durationMs,
      disposition: stageDisposition(aborted, parse),
    });
    renderPause(waiting, settled);
    return { status: "paused", waiting };
  }

  // The cursor already sat at (or past) the final stage on entry.
  display.runCompleted({
    runId,
    pipelineName,
    totalElapsedMs: elapsedMs(),
    checkpointPath,
    stageCount,
  });
  return { status: "completed" };
}
