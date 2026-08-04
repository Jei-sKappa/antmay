import path from "node:path";

import type { ExecutionDisplay, StageDisposition } from "../display/types.js";
import { renderStagePrompt } from "../harness/prompt.js";
import { HARNESSES } from "../harness/providers/index.js";
import type { AttemptOutcome, HarnessInvoker } from "../harness/types.js";
import { isWorktreeClean, readHead } from "../gitops/status.js";
import { finalizeGitBoundary } from "../gitops/boundary.js";
import type {
  AttemptInterval,
  GitBoundaryContext,
} from "../gitops/boundary.js";
import {
  Pause,
  isAdvisoryHeadMovement,
  unexpectedHeadMovementMessage,
} from "./pause.js";
import { decideRecovery, holdsPreservedDone } from "./recovery-policy.js";
import type {
  ContractEvidence,
  QueueEvidence,
  RecoveryDirective,
} from "./recovery-policy.js";
import { RunState } from "./run-state.js";
import type {
  CheckpointWriter,
  CommitOutcome,
  Transition,
} from "./run-state.js";
import type {
  AttemptRecord,
  AttemptReference,
  RunCheckpoint,
  TerminalResult,
  WaitingDiagnostics,
  WaitingInfo,
} from "../state/checkpoint.js";
import { attemptLogPaths, createAttemptLog } from "../state/logs.js";
import type { AttemptLogHeader } from "../state/logs.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";
import {
  evaluateArtifactPrerequisite,
  evaluatePromisedState,
  inspectArtifactState,
} from "../thread/artifacts.js";
import type { QueueScan } from "../thread/queues.js";
import { scanPendingQueues } from "../thread/queues.js";
import type { BoundaryDisposition } from "../runner/classify.js";
import { classifyAttempt } from "../runner/classify.js";
import type { OutcomeParse } from "../runner/outcome.js";
import { parseTerminalOutcome } from "../runner/outcome.js";
import { SignalInterruption } from "../runner/signals.js";

/** Milliseconds per second, for turning the binding's interval into a timer. */
const MS_PER_SECOND = 1000;

/**
 * How an attempt that was live when its executor disappeared is settled. The
 * origin is recorded in the message because nothing else observed the stop.
 */
const ABANDONED_ATTEMPT_NOTE =
  "The attempt was abandoned; the run was recovered on resume after manual " +
  "stale-lock removal (origin: manual-recovery).";

/**
 * How a command hands one run to the engine. `allocated` carries the initial
 * checkpoint `run` just wrote, which is durably `ready` with no history behind
 * it; `resume` carries the checkpoint `resume` validated out of an existing run
 * directory, verbatim and in whatever condition it was found. Both name the same
 * thing to the engine — the starting cursor, whose `stageIndex` is where the loop
 * begins — and the variant is what tells the engine whether the cursor has a
 * durable past to recover from before that loop may start.
 */
export type ExecutionEntry =
  | { kind: "allocated"; checkpoint: RunCheckpoint }
  | { kind: "resume"; checkpoint: RunCheckpoint };

/**
 * The unstable and injected dependencies plus the durable inputs the engine
 * drives one run to a pause or completion from. The caller owns the lock's
 * acquire/release symmetry; the engine never releases it.
 */
export type ExecutionContext = {
  entry: ExecutionEntry;
  runDir: string;
  invoker: HarnessInvoker;
  display: ExecutionDisplay;
  harnessVersions: Record<string, string>;
  signal: AbortSignal;
  clock?: () => Date;
  /**
   * Checkpoint-writing seam the run's cursor persists through. Tests inject a
   * wrapper to control ordering and failure without changing production callers.
   */
  persistCheckpoint?: CheckpointWriter;
  /** Artifact inspector seam for deterministic recovery-path tests. */
  inspectArtifactState?: typeof inspectArtifactState;
  /** Git HEAD reader seam for exercising refusal and recovery paths. */
  readHead?: typeof readHead;
  /** Git-boundary seam for exercising structured finalization failures. */
  finalizeGitBoundary?: typeof finalizeGitBoundary;
};

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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type InvariantResult<Value> =
  | { ok: true; value: Value }
  | { ok: false; message: string };

/**
 * Why a recognized `DONE`'s promised artifact state was not accepted: it was
 * evaluated and came back unmet, or the thread could not be read to evaluate it
 * at all. Both preserve the completed attempt, and they are worded differently.
 */
type PromiseViolation =
  | { kind: "unmet"; unmet: ArtifactMismatch[] }
  | { kind: "uninspectable"; message: string };

/**
 * The one attempt a recovery reference names. Checkpoint validation already
 * proved it exists in the state resuming from it requires, so a caller holding a
 * validated recovery reads the record itself and never the history's tail.
 */
function referencedAttempt(
  checkpoint: RunCheckpoint,
  reference: AttemptReference,
): InvariantResult<AttemptRecord> {
  const found = checkpoint.attempts.find(
    (attempt) =>
      attempt.stageIndex === reference.stageIndex &&
      attempt.attempt === reference.attempt,
  );
  if (found === undefined) {
    return {
      ok: false,
      message: `The validated checkpoint records no attempt ${reference.attempt} for stage ${reference.stageIndex}.`,
    };
  }
  return { ok: true, value: found };
}

/**
 * The interval a preserved attempt's `HEAD` rule is judged across. Checkpoint
 * validation requires the post-attempt observation on every settled attempt, so
 * a record without one was never settled and no boundary of it can be judged.
 */
function attemptInterval(attempt: AttemptRecord): InvariantResult<AttemptInterval> {
  const headAfterAttempt = attempt.headAfterAttempt;
  if (headAfterAttempt === undefined) {
    return {
      ok: false,
      message: `Attempt ${attempt.attempt} of stage ${attempt.stageIndex} records no post-attempt HEAD observation.`,
    };
  }
  return {
    ok: true,
    value: { headAtStart: attempt.headAtStart, headAfterAttempt },
  };
}

/** A fresh queue scan in the shape the recovery policy reads it. */
function queueEvidence(scan: QueueScan): QueueEvidence {
  if (!scan.ok) return { kind: "scan-failed", message: scan.message };
  if (scan.pendingFiles.length > 0) {
    return { kind: "pending", pendingFiles: scan.pendingFiles };
  }
  return { kind: "clear" };
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

/**
 * Drive one run from the entry cursor to a durable pause, a refused gate, a fatal
 * checkpoint error, or pipeline completion.
 *
 * A `resume` entry first turns the durable past the cursor carries into a
 * runnable present: it applies the recovery-sensitive worktree rule, settles an
 * abandoned executing attempt, and — for a pause — gathers the fresh evidence its
 * recorded recovery acts on, asks `decideRecovery` for one directive, and carries
 * that directive out as one complete checkpoint transition. Only then does the
 * generic stage loop start. An `allocated` entry has no past, so it starts there
 * directly.
 *
 * The engine consumes only snapshotted stage data and typed inputs — never a
 * pipeline, stage, or skill identity — and coordinates the queue, artifact,
 * harness, log, Git, policy, pause, and display collaborators rather than
 * reproducing their rules: it decides which pause situation holds and asks
 * `Pause` for the value, never assembling one itself. It moves the run's cursor
 * only by committing named transitions to the `RunState` below, which owns every
 * rewrite of an existing checkpoint and is handed to no collaborator. The caller
 * releases the lock.
 */
export async function executeEngine(
  ctx: ExecutionContext,
): Promise<ExecutionResult> {
  const { runDir, invoker, display, signal } = ctx;
  const clock = ctx.clock ?? (() => new Date());
  const inspectArtifacts = ctx.inspectArtifactState ?? inspectArtifactState;
  const readCurrentHead = ctx.readHead ?? readHead;
  const finalizeBoundary = ctx.finalizeGitBoundary ?? finalizeGitBoundary;
  const run = new RunState({
    checkpoint: ctx.entry.checkpoint,
    runDir,
    clock,
    persistCheckpoint: ctx.persistCheckpoint,
  });

  // Everything a run is fixed at: no transition moves any of it.
  const repoRoot = run.checkpoint.repoRoot;
  const threadRelPath = run.checkpoint.threadRelPath;
  const threadFolder = path.posix.basename(threadRelPath);
  const stageCount = run.checkpoint.stages.length;
  const runId = run.checkpoint.runId;
  const pipelineName = run.checkpoint.pipelineName;
  const checkpointPath = path.join(runDir, "state.json");
  const resumeCommand = `antmay afk resume ${runId}`;

  async function observeHead(
    phase: "before-transition" | "after-attempt",
  ): Promise<InvariantResult<string>> {
    try {
      return { ok: true, value: await readCurrentHead(repoRoot) };
    } catch (error) {
      const base = `Cannot read Git HEAD at ${repoRoot}: ${errorMessage(error)}`;
      return {
        ok: false,
        message:
          phase === "after-attempt"
            ? `${base}. The attempt remains live in the checkpoint; recover it with ${resumeCommand}.`
            : base,
      };
    }
  }

  function elapsedMs(): number {
    return clock().getTime() - Date.parse(run.checkpoint.createdAt);
  }

  // A signal that arrives while the checkpoint is durably at rest — between
  // stages, or at the cursor a resume was handed — stops before allocating
  // anything: the cursor stays byte-for-byte unchanged, no fictional pause is
  // rendered, and the run reports the interruption.
  function interruptedAtRest(sig: NodeJS.Signals): ExecutionResult {
    display.runInterrupted({
      runId,
      pipelineName,
      totalElapsedMs: elapsedMs(),
      checkpointPath,
      resumeCommand,
      signal: sig,
    });
    return { kind: "interrupted", signal: sig };
  }

  function fatal(message: string): ExecutionResult {
    display.runFailed({
      runId,
      pipelineName,
      totalElapsedMs: elapsedMs(),
      checkpointPath,
      message,
    });
    return { kind: "fatal-checkpoint", message };
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
  async function commitCursor(
    ...transitions: Transition[]
  ): Promise<ExecutionResult | null> {
    const committed = await run.commit(...transitions);
    return committed.ok ? null : fatal(committed.message);
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
        ? HARNESSES[
            run.checkpoint.stages[attempt.stageIndex]!.binding.agent.harness
          ].continuationCommand(attempt.agentSession.id)
        : undefined;
    display.runPaused({
      waiting,
      currentStage: {
        id: run.stage.id,
        position: run.checkpoint.stageIndex + 1,
        count: run.checkpoint.stages.length,
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
    headAfterAttempt: string;
    pendingFiles: string[];
    failure?: { errorClass: string; errorMessage: string };
    agentSession?: { id: string };
  }): Promise<ExecutionResult> {
    const endedAt = clock().toISOString();
    const pending = args.pendingFiles.length > 0 ? args.pendingFiles : undefined;
    const diagnostics: WaitingDiagnostics = args.failure
      ? {
          errorClass: args.failure.errorClass,
          errorMessage: args.failure.errorMessage,
          origin: args.sig,
        }
      : { origin: args.sig };
    const waiting = Pause.attemptInterrupted({
      diagnostics,
      pendingFiles: args.pendingFiles,
    });
    // The attempt records the reason that governs its pause, which is the one
    // the pause leads with.
    const governing = waiting.reasons[0];
    const settled: AttemptRecord = withAgentSession(
      {
        ...args.executingAttempt,
        result: "interrupted",
        endedAt,
        terminalResult: null,
        pendingFiles: pending,
        failure: { kind: governing.kind, message: governing.message },
        headAfterAttempt: args.headAfterAttempt,
      },
      args.agentSession,
    );
    const failed = await commitCursor(
      { kind: "settle-attempt", attempt: settled },
      { kind: "pause", waiting },
    );
    if (failed !== null) return failed;
    display.stageStopped({
      stagePosition: `${args.executingAttempt.stageIndex + 1}/${stageCount}`,
      durationMs: Date.parse(endedAt) - Date.parse(args.executingAttempt.startedAt),
      disposition: "interrupted",
    });
    renderPause(waiting, settled);
    return { kind: "interrupted", signal: args.sig };
  }

  /**
   * Turn the durable cursor a resume was handed into a runnable one, or into the
   * result that ends this invocation. Returns `null` once the cursor is runnable.
   *
   * Everything here happens under the held lock, which is why the abandoned
   * attempt, the fresh evidence, and the transition the evidence justifies can be
   * treated as one atomic step.
   */
  async function enterFromDurableCursor(): Promise<ExecutionResult | null> {
    const enteredWaiting = run.checkpoint.waiting;
    const enteredRecovery = enteredWaiting?.recovery ?? null;

    // Clean-worktree rule: required for a ready or executing cursor and for every
    // recovery except the two holding a saved DONE for finalization. Those are
    // exempt because the repair they wait for arrives uncommitted — a contract
    // recheck has to inspect a dirty tree to decide anything, and a boundary retry
    // commits exactly the diff it is waiting for.
    if (enteredRecovery === null || !holdsPreservedDone(enteredRecovery)) {
      let clean: boolean;
      try {
        clean = await isWorktreeClean(repoRoot);
      } catch (error) {
        return {
          kind: "refused",
          message: `Cannot inspect the Git worktree at ${repoRoot}: ${errorMessage(error)}`,
        };
      }
      if (!clean) {
        return {
          kind: "refused",
          message: `The Git worktree at ${repoRoot} is not clean. Commit what you want to keep or revert the rest before resuming.`,
        };
      }
    }

    // An attempt that was live when its executor disappeared is settled before
    // any other transition: it records the tip observed now as its post-attempt
    // observation, and the cursor becomes a durable retry at the same stage.
    if (run.checkpoint.condition === "executing") {
      const sig = signalReason(signal);
      if (sig !== null) return interruptedAtRest(sig);
      const abandoned =
        run.checkpoint.attempts[run.checkpoint.attempts.length - 1]!;
      const abandonedHead = await observeHead("before-transition");
      if (!abandonedHead.ok) {
        return { kind: "refused", message: abandonedHead.message };
      }
      const settled: AttemptRecord = {
        ...abandoned,
        result: "interrupted",
        endedAt: clock().toISOString(),
        terminalResult: null,
        headAfterAttempt: abandonedHead.value,
        failure: { kind: "interrupted", message: ABANDONED_ATTEMPT_NOTE },
      };
      const failed = await commitCursor(
        { kind: "settle-attempt", attempt: settled },
        { kind: "become-ready" },
      );
      if (failed !== null) return failed;
    }

    // A ready cursor — allocated, or just recovered above — records no recovery,
    // so there is nothing to decide: the loop's own pre-attempt gate is what
    // pauses it on queued work or an unreadable queue.
    if (enteredWaiting === null) {
      run.apply({ kind: "become-ready" });
      return null;
    }
    const pausedWaiting = enteredWaiting;
    const pausedRecovery = pausedWaiting.recovery;
    // Checkpoint validation guarantees that every attempt-referencing recovery
    // names the final active record. Resolve that exact record once and carry it
    // through finalization and rendering. A retry-stage recovery has no attempt
    // reference; when it remains paused, its display still describes the latest
    // persisted attempt that led to the pause.
    let recoveryAttempt: AttemptRecord | undefined;
    if (pausedRecovery.kind !== "retry-stage") {
      const resolved = referencedAttempt(run.checkpoint, pausedRecovery.attempt);
      if (!resolved.ok) return fatal(resolved.message);
      recoveryAttempt = resolved.value;
    }
    const pauseAttempt =
      pausedRecovery.kind === "retry-stage"
        ? run.checkpoint.attempts[run.checkpoint.attempts.length - 1]
        : recoveryAttempt;
    const stage = run.stage;

    /**
     * Persist and render the refreshed pause a `remain-paused` directive
     * describes, leaving the run exactly as recoverable as this resume found it.
     * Still-present bundles write nothing, and a refresh that computes the
     * already-persisted waiting object renders without restamping `updatedAt`.
     */
    async function remainPaused(
      directive: Extract<RecoveryDirective, { kind: "remain-paused" }>,
      attempt: AttemptRecord | undefined,
    ): Promise<ExecutionResult> {
      const facts = directive.facts;
      const candidateLine = attempt?.terminalResult?.candidateLine ?? undefined;
      const pauseWith = async (
        waiting: WaitingInfo,
        rendered: AttemptRecord | undefined,
      ): Promise<ExecutionResult> => {
        const failed = await commitCursor({ kind: "pause", waiting });
        if (failed !== null) return failed;
        renderPause(waiting, rendered);
        return { kind: "paused", waiting };
      };

      switch (facts.kind) {
        case "pending-bundles": {
          const waiting = Pause.refreshPendingBundles({
            paused: pausedWaiting,
            pendingFiles: facts.pendingFiles,
          });
          renderPause(waiting, attempt);
          return { kind: "paused", waiting };
        }

        case "queue-scan-failed":
          // A pause holding a saved DONE for finalization still describes the
          // attempt holding it; a pause whose whole explanation the scan failure
          // replaced has no attempt left to describe.
          if (holdsPreservedDone(directive.recovery)) {
            return pauseWith(
              Pause.refreshQueueUnreadableHoldingDone({
                paused: pausedWaiting,
                recovery: directive.recovery,
                scanMessage: facts.message,
              }),
              attempt,
            );
          }
          return pauseWith(
            Pause.refreshQueueUnreadable({
              paused: pausedWaiting,
              recovery: directive.recovery,
              scanMessage: facts.message,
            }),
            undefined,
          );

        case "promise-uninspectable":
          return pauseWith(
            Pause.refreshPromiseUninspectable({
              paused: pausedWaiting,
              recovery: directive.recovery,
              message: facts.message,
              candidateLine,
            }),
            attempt,
          );

        case "promise-unmet":
          return pauseWith(
            Pause.refreshPromiseUnmet({
              paused: pausedWaiting,
              recovery: directive.recovery,
              unmet: facts.unmet,
              worktree: facts.worktree,
              candidateLine,
            }),
            attempt,
          );

        case "git-finalization-failed": {
          // An advisory movement is worded from the preserved attempt's own
          // interval, so that interval has to be resolvable before the pause can
          // be built at all.
          const interval =
            isAdvisoryHeadMovement(facts.failure) && attempt !== undefined
              ? attemptInterval(attempt)
              : undefined;
          if (interval !== undefined && !interval.ok) {
            return fatal(interval.message);
          }
          return pauseWith(
            Pause.refreshBoundaryRefused({
              recovery: directive.recovery,
              failure: facts.failure,
              message:
                interval?.ok === true
                  ? unexpectedHeadMovementMessage(interval.value)
                  : `${facts.message}.`,
              candidateLine,
            }),
            attempt,
          );
        }
      }
    }

    /**
     * Finalize the exact saved `DONE` attempt a `finalize-boundary` directive
     * names, without invoking the agent again, then apply the stage's declared
     * queue resolution. Both no-harness recoveries — a refused boundary that was
     * corrected and a repaired promised artifact — land here, so neither grows a
     * finalization path of its own.
     *
     * The directive's context is what the Git boundary judges the finalization as,
     * because the two stand in different places with respect to the
     * `headMayChange` rule. A boundary retry was already judged under that rule
     * during the run. A contract repair was never judged at all — the stage loop
     * stopped before the boundary — so this is the stage's one chance to apply it,
     * across the preserved attempt's own interval.
     */
    async function finalizeSavedDone(
      directive: Extract<RecoveryDirective, { kind: "finalize-boundary" }>,
    ): Promise<ExecutionResult | null> {
      // A finalization directive can arise only from either attempt-referencing
      // finalization recovery, so absence here is an invalid engine entry rather
      // than a reason to approximate from another history record.
      const preserved = recoveryAttempt;
      if (preserved === undefined) {
        return fatal(
          `The validated "${directive.recovery.kind}" recovery has no resolved attempt.`,
        );
      }
      let context: GitBoundaryContext;
      if (directive.context === "after-contract-repair") {
        const interval = attemptInterval(preserved);
        if (!interval.ok) return fatal(interval.message);
        context = {
          kind: "after-contract-repair",
          attempt: interval.value,
          pausedAtHead: directive.recovery.pausedAtHead,
        };
      } else {
        context = {
          kind: "boundary-retry",
          pausedAtHead: directive.recovery.pausedAtHead,
        };
      }
      const finalization = await finalizeBoundary({
        repoRoot,
        threadRelPath,
        threadFolder,
        policy: stage.gitPolicy,
        context,
      });

      // What a human did to the tip across the pause is evidence the reader is
      // owed and no policy forbids.
      const moved =
        finalization.kind === "git-error"
          ? undefined
          : finalization.headMovedWhilePaused;
      if (moved !== undefined) {
        display.warn(
          `HEAD moved while the run was paused (${moved.pausedAtHead} → ${moved.observedHead}); this is diagnostic only and is not a policy violation.`,
        );
      }

      // A boundary this resume could not finalize is fresh Git evidence like any
      // other: the policy decides what the run does about it, and keeps the
      // preserved attempt finalizable from wherever this attempt left the tip.
      if (finalization.kind !== "finalized") {
        const failedWithoutObservation = finalization.kind === "git-error";
        return applyDirective(
          decideRecovery(directive.recovery, {
            queues: { kind: "clear" },
            git: {
              kind: "finalization-failed",
              failure:
                finalization.kind === "git-policy-violation"
                  ? {
                      kind: "git-policy-violation",
                      treatment:
                        finalization.cause === "head-rule"
                          ? "advisory-head-movement"
                          : "blocking",
                    }
                  : finalization.kind === "git-error"
                    ? { kind: "git-error" }
                    : { kind: "commit-error" },
              message: failedWithoutObservation
                ? `Git finalization failed during ${finalization.phase}: ${finalization.message}`
                : finalization.message,
              observedHead: failedWithoutObservation
                ? directive.recovery.pausedAtHead
                : finalization.headAfterFinalization,
            },
          }),
          preserved,
        );
      }

      // Success: flip the preserved DONE attempt from waiting to done over the tip
      // this finalization left it at, clear waiting, then apply the declared
      // resolution when the attempt listed pending files, else the normal
      // successful-stage advance.
      const finalized: Transition = {
        kind: "finalize-preserved-done",
        attempt: {
          ...preserved,
          result: "done",
          headAfterAttempt: finalization.headAfterFinalization,
        },
      };
      const hadPending = (preserved.pendingFiles?.length ?? 0) > 0;
      if (hadPending && stage.queueResolution === "rerun") {
        return commitCursor(finalized, { kind: "become-ready" });
      }
      return commitCursor(finalized, { kind: "advance" });
    }

    /** Carry out one recovery directive as a durable transition. */
    async function applyDirective(
      directive: RecoveryDirective,
      attempt: AttemptRecord | undefined,
    ): Promise<ExecutionResult | null> {
      switch (directive.kind) {
        case "retry-stage":
          run.apply({ kind: "become-ready" });
          return null;
        case "advance-stage":
          return commitCursor({ kind: "advance" });
        case "finalize-boundary":
          return finalizeSavedDone(directive);
        case "remain-paused":
          return remainPaused(directive, attempt);
      }
    }

    // Fresh queue evidence gates every recovery alike, before any harness action.
    const queues = queueEvidence(
      await scanPendingQueues(repoRoot, threadRelPath),
    );
    const sig = signalReason(signal);
    if (sig !== null) return interruptedAtRest(sig);

    // The rest of the evidence is observed only where the recorded recovery calls
    // for it. Held queues decide the pause on their own, so nothing further is
    // read while a human still owes the thread work.
    let contract: ContractEvidence | undefined;
    if (
      queues.kind === "clear" &&
      (pausedRecovery.kind === "recheck-stage-contract" ||
        pausedRecovery.kind === "retry-git-finalization")
    ) {
      const inspection = await inspectArtifacts(repoRoot, threadRelPath);
      if (!inspection.ok) {
        // A thread the artifacts cannot be read in is also a thread whose queues
        // cannot be scanned, and the queue gate above already holds the pause in
        // that case — so no end-to-end path reaches this branch. It is written
        // anyway because pausing is the fail-closed direction: a promise that
        // could not be evaluated is never credited as kept.
        contract = { kind: "uninspectable", message: inspection.message };
      } else {
        const unmet = evaluatePromisedState(inspection.state, stage.promises);
        if (unmet.length === 0) {
          contract = { kind: "satisfied" };
        } else {
          let clean: boolean;
          try {
            clean = await isWorktreeClean(repoRoot);
          } catch (error) {
            return {
              kind: "refused",
              message: `Cannot inspect the Git worktree at ${repoRoot}: ${errorMessage(error)}`,
            };
          }
          contract = { kind: "unmet", unmet, worktree: clean ? "clean" : "dirty" };
        }
      }
    }

    return applyDirective(
      decideRecovery(pausedRecovery, {
        queues,
        ...(contract !== undefined ? { contract } : {}),
      }),
      pauseAttempt,
    );
  }

  // The durable past a resumed cursor carries is settled before the loop, so the
  // loop below only ever sees a runnable stage. A returned result ends the run
  // here; `null` means the transition left a runnable cursor to continue from.
  if (ctx.entry.kind === "resume") {
    const entered = await enterFromDurableCursor();
    if (entered !== null) return entered;
  }

  while (!run.isExhausted) {
    const readySig = signalReason(signal);
    if (readySig !== null) return interruptedAtRest(readySig);

    const stageIndex = run.checkpoint.stageIndex;
    const stage = run.stage;
    const binding = stage.binding;
    const agent = binding.agent;
    const ordinal = stageIndex + 1;
    const stagePosition = `${ordinal}/${stageCount}`;

    // 1. Pre-attempt queue gate. Neither branch allocates an attempt, creates a
    //    log, or launches the harness; the pause payload carries no log path.
    const preScan = await scanPendingQueues(repoRoot, threadRelPath);
    if (!preScan.ok) {
      const waiting = Pause.queueUnreadable(preScan.message);
      const failed = await commitCursor({ kind: "pause", waiting });
      if (failed !== null) return failed;
      renderPause(waiting);
      return { kind: "paused", waiting };
    }
    if (preScan.pendingFiles.length > 0) {
      const waiting = Pause.queueBlocked(preScan.pendingFiles);
      const failed = await commitCursor({ kind: "pause", waiting });
      if (failed !== null) return failed;
      renderPause(waiting);
      return { kind: "paused", waiting };
    }

    // 2. Pre-attempt artifact contract. Composition proved the stage runnable
    //    against the state it simulated at allocation time; the concrete state
    //    can have moved since, so it is re-inspected here. An unmet
    //    prerequisite pauses on this stage having allocated no attempt, created
    //    no log, and invoked no harness.
    const preInspection = await inspectArtifacts(repoRoot, threadRelPath);
    let unrunnable: WaitingInfo | null = null;
    if (!preInspection.ok) {
      unrunnable = Pause.prerequisiteUninspectable({
        stagePosition,
        stageId: stage.id,
        message: preInspection.message,
      });
    } else {
      const unmet = evaluateArtifactPrerequisite(
        preInspection.state,
        stage.prerequisite,
      );
      if (unmet.length > 0) {
        unrunnable = Pause.prerequisiteUnmet({
          stagePosition,
          stageId: stage.id,
          unmet,
        });
      }
    }
    if (unrunnable !== null) {
      const waiting = unrunnable;
      const failed = await commitCursor({ kind: "pause", waiting });
      if (failed !== null) return failed;
      renderPause(waiting);
      return { kind: "paused", waiting };
    }

    // 3. Attempt setup: read attempt-start HEAD, persist the executing attempt
    //    BEFORE creating its log.
    const attemptStartHead = await observeHead("before-transition");
    if (!attemptStartHead.ok) {
      return { kind: "refused", message: attemptStartHead.message };
    }
    const headAtStart = attemptStartHead.value;
    const attemptNumber = nextAttemptNumber(run.checkpoint.attempts, stageIndex);
    const logPaths = attemptLogPaths(runDir, ordinal, stage.id, attemptNumber);
    const startedAt = clock().toISOString();

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
    const reserveFailed = await commitCursor({
      kind: "reserve-attempt",
      attempt: executingAttempt,
    });
    if (reserveFailed !== null) return reserveFailed;

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
        run.checkpoint.observedHarnessVersions[agent.harness] ??
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
        headAfterAttempt: headAtStart,
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
    let provisionalWrite: Promise<CommitOutcome> | undefined;

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
        dangerouslySkipPermissions: run.checkpoint.dangerouslySkipPermissions,
        workspace: run.checkpoint.workspace.execution,
        logFilePath: logPaths.absPath,
        onEvent: (event) => display.harnessEvent(event),
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

    const postAttemptHead = await observeHead("after-attempt");
    if (!postAttemptHead.ok) {
      return { kind: "refused", message: postAttemptHead.message };
    }
    let observedHead = postAttemptHead.value;

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
        headAfterAttempt: observedHead,
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
      const postInspection = await inspectArtifacts(repoRoot, threadRelPath);
      let violation: PromiseViolation | null = null;
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
        violation = { kind: "uninspectable", message: postInspection.message };
      } else {
        const unmet = evaluatePromisedState(postInspection.state, stage.promises);
        if (unmet.length > 0) violation = { kind: "unmet", unmet };
      }
      if (violation !== null) {
        const endedAt = clock().toISOString();
        // This stage's boundary is never reached, so the finalization a repair
        // unlocks is the one and only judgement of the stage's HEAD rule. What
        // that rule judges is the preserved attempt's own movement, which is
        // exactly what the attempt's two observations record.
        const preserved = {
          attempt: { stageIndex, attempt: attemptNumber },
          pausedAtHead: observedHead,
          pendingFiles,
          queueScanError,
        };
        const waiting =
          violation.kind === "unmet"
            ? Pause.contractViolated({ ...preserved, unmet: violation.unmet })
            : Pause.contractUninspectable({
                ...preserved,
                message: violation.message,
              });
        const governing = waiting.reasons[0];
        const settled: AttemptRecord = withAgentSession(
          {
            ...executingAttempt,
            result: "waiting",
            endedAt,
            terminalResult: terminalResultFrom(parse),
            pendingFiles: pendingFiles.length > 0 ? pendingFiles : undefined,
            failure: { kind: governing.kind, message: governing.message },
            headAfterAttempt: observedHead,
          },
          agentSession,
        );
        const failed = await commitCursor(
          { kind: "settle-attempt", attempt: settled },
          { kind: "pause", waiting },
        );
        if (failed !== null) return failed;
        display.stageStopped({
          stagePosition,
          durationMs: Date.parse(endedAt) - Date.parse(startedAt),
          disposition: stageDisposition(false, parse),
        });
        renderPause(waiting, settled);
        return { kind: "paused", waiting };
      }
    }

    let boundary: BoundaryDisposition = { evaluated: false };
    let headMovementAdvisory = false;
    if (isDone) {
      const attemptInterval = {
        headAtStart,
        headAfterAttempt: observedHead,
      };
      const finalization = await finalizeBoundary({
        repoRoot,
        threadRelPath,
        threadFolder,
        policy: stage.gitPolicy,
        // The stage's HEAD rule judges this attempt's own movement, which is
        // exactly the interval between its two observations.
        context: {
          kind: "attempt",
          attempt: attemptInterval,
        },
      });
      // The finalization owns every Git observation this boundary makes, so the
      // tip it left behind — the boundary commit's, when it made one — is what
      // the settled attempt records.
      if (finalization.kind !== "git-error") {
        observedHead = finalization.headAfterFinalization;
      }
      headMovementAdvisory =
        finalization.kind === "git-policy-violation" &&
        finalization.cause === "head-rule";
      boundary =
        finalization.kind === "finalized"
          ? { evaluated: true, ok: true }
          : {
              evaluated: true,
              ok: false,
              kind:
                finalization.kind === "git-error"
                  ? "commit-error"
                  : headMovementAdvisory
                    ? "unexpected-head-movement"
                  : finalization.kind,
              message:
                finalization.kind === "git-error"
                  ? `Git finalization failed during ${finalization.phase}: ${finalization.message}`
                  : headMovementAdvisory
                    ? unexpectedHeadMovementMessage(attemptInterval)
                  : finalization.message,
            };
    }

    const classification = classifyAttempt({
      attemptOutcome: outcome,
      parse,
      pendingFiles,
      queueScanError,
      boundary,
    });

    // 6. Transition. Every settled attempt records the HEAD observed once it
    //    settled, so the evidence a later recovery reads belongs to the attempt
    //    that produced it.
    const endedAt = clock().toISOString();
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
        { kind: "settle-attempt", attempt: done },
        { kind: "advance" },
      );
      if (failed !== null) return failed;
      display.stageSucceeded({ stagePosition, durationMs });
      if (run.isExhausted) {
        display.runCompleted({
          runId,
          pipelineName,
          totalElapsedMs: elapsedMs(),
          checkpointPath,
          stageCount,
        });
        return { kind: "completed" };
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
        { kind: "settle-attempt", attempt: done },
        { kind: "pause", waiting },
      );
      if (failed !== null) return failed;
      // The stage itself succeeded — it reported DONE and its boundary was
      // finalized. Only the pending bundle keeps the run from advancing.
      display.stageSucceeded({ stagePosition, durationMs });
      renderPause(waiting, done);
      return { kind: "paused", waiting };
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
            origin: abortOrigin(signal),
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
    // The attempt's failure telemetry rides on the reason that reports that
    // failure, which is the reason the pause leads with and the only one it
    // describes.
    const governing = waiting.reasons[0];
    const settled: AttemptRecord = withAgentSession(
      {
        ...executingAttempt,
        result: aborted ? "interrupted" : "waiting",
        endedAt,
        terminalResult,
        pendingFiles: pendingFiles.length > 0 ? pendingFiles : undefined,
        failure: { kind: governing.kind, message: governing.message },
        headAfterAttempt: observedHead,
      },
      agentSession,
    );
    const failed = await commitCursor(
      { kind: "settle-attempt", attempt: settled },
      { kind: "pause", waiting },
    );
    if (failed !== null) return failed;
    display.stageStopped({
      stagePosition,
      durationMs,
      disposition: headMovementAdvisory
        ? "paused"
        : stageDisposition(aborted, parse),
    });
    renderPause(waiting, settled);
    return { kind: "paused", waiting };
  }

  // The cursor sits past the final stage without a stage of this invocation
  // having finalized: it either entered there, or an entry transition advanced it
  // there — a saved DONE finalized on resume, or a finalized DONE's queue
  // releasing — so the pipeline is complete and no stage-level event is due.
  display.runCompleted({
    runId,
    pipelineName,
    totalElapsedMs: elapsedMs(),
    checkpointPath,
    stageCount,
  });
  return { kind: "completed" };
}
