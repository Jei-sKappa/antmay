import path from "node:path";

import type { ExecutionDisplay, StageDisposition } from "../display/types.js";
import { nativeContinuationCommand } from "../harness/native-session.js";
import { renderStagePrompt } from "../harness/prompt.js";
import type { AttemptOutcome, HarnessInvoker } from "../harness/types.js";
import { isWorktreeClean, readHead } from "../gitops/status.js";
import { finalizeGitBoundary } from "../gitops/boundary.js";
import type {
  AttemptInterval,
  GitBoundaryContext,
} from "../gitops/boundary.js";
import { decideRecovery, holdsPreservedDone } from "./recovery-policy.js";
import type {
  ContractEvidence,
  QueueEvidence,
  RecoveryDirective,
} from "./recovery-policy.js";
import type {
  AttemptRecord,
  AttemptReference,
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
import type { QueueScan } from "../thread/queues.js";
import { scanPendingQueues } from "../thread/queues.js";
import type { BoundaryDisposition } from "../runner/classify.js";
import {
  classifyAttempt,
  gateErrorMessage,
  pendingQueuesMessage,
  queueReasons,
} from "../runner/classify.js";
import type { OutcomeParse } from "../runner/outcome.js";
import { parseTerminalOutcome } from "../runner/outcome.js";
import { SignalInterruption } from "../runner/signals.js";

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
   * Atomic checkpoint writer. Defaults to production `writeCheckpoint`; tests
   * may inject a wrapper to control ordering and failure without changing
   * production callers.
   */
  persistCheckpoint?: typeof writeCheckpoint;
  /** Artifact inspector seam for deterministic recovery-path tests. */
  inspectArtifactState?: typeof inspectArtifactState;
  /** Git HEAD reader seam for exercising refusal and recovery paths. */
  readHead?: typeof readHead;
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

function replaceAttempt(
  attempts: AttemptRecord[],
  record: AttemptRecord,
): AttemptRecord[] {
  return attempts.map((attempt) =>
    attempt.stageIndex === record.stageIndex && attempt.attempt === record.attempt
      ? record
      : attempt,
  );
}

type InvariantResult<Value> =
  | { ok: true; value: Value }
  | { ok: false; message: string };

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

function stillUnmetContractMessage(unmet: readonly ArtifactMismatch[]): string {
  return (
    "The stage reported DONE and the artifact state it promises is still " +
    `missing: it promises ${describeContractSide(unmet, "expected")}, but the ` +
    `thread has ${describeContractSide(unmet, "observed")}.`
  );
}

/**
 * The pause's reasons with the queue reason restated over the files a fresh scan
 * just found. A pause that recorded no queue reason gains one, because files
 * present now are the reason this resume cannot proceed and the reader is owed
 * that list either way.
 */
function refreshPendingReason(
  reasons: WaitingReasons,
  pendingFiles: string[],
): WaitingReasons {
  const message = pendingQueuesMessage(pendingFiles);
  let replaced = false;
  const next = reasons.map((reason) => {
    if (reason.kind !== "pending-queues") return reason;
    replaced = true;
    return { ...reason, message, pendingFiles };
  }) as WaitingReasons;
  if (replaced) return next;
  return [...next, { kind: "pending-queues", message, pendingFiles }];
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

function unexpectedHeadMovementMessage(interval: AttemptInterval): string {
  return (
    "The stage produced a commit even though its Git policy does not expect " +
    `one; the attempt moved HEAD from ${interval.headAtStart} to ${interval.headAfterAttempt}.`
  );
}

function uninspectablePromiseMessage(message: string): string {
  return (
    "The stage reported DONE but its promised artifact state could not be " +
    `verified: ${message}`
  );
}

const HEAD_MOVEMENT_NEXT_ACTION =
  "Inspect the attempt's commits if needed. This HEAD movement will not block " +
  "the next resume; Antmay will continue if the promised artifact and remaining Git checks pass.";

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
 * harness, log, Git, policy, and display collaborators rather than reproducing
 * their rules. Every rewrite of an existing checkpoint goes through `persist`
 * below, which is the engine's own persistence boundary and is handed to no
 * collaborator. The caller releases the lock.
 */
export async function executeEngine(
  ctx: ExecutionContext,
): Promise<ExecutionResult> {
  const { runDir, invoker, display, signal } = ctx;
  const clock = ctx.clock ?? (() => new Date());
  const persistCheckpoint = ctx.persistCheckpoint ?? writeCheckpoint;
  const inspectArtifacts = ctx.inspectArtifactState ?? inspectArtifactState;
  const readCurrentHead = ctx.readHead ?? readHead;
  let checkpoint = ctx.entry.checkpoint;

  const repoRoot = checkpoint.repoRoot;
  const threadRelPath = checkpoint.threadRelPath;
  const threadFolder = path.posix.basename(threadRelPath);
  const stageCount = checkpoint.stages.length;
  const runId = checkpoint.runId;
  const pipelineName = checkpoint.pipelineName;
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
    headAfterAttempt: string;
    pendingFiles: string[];
    failure?: { errorClass: string; errorMessage: string };
    agentSession?: { id: string };
  }): Promise<ExecutionResult> {
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
      recovery: { kind: "retry-stage" },
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
        headAfterAttempt: args.headAfterAttempt,
      },
      args.agentSession,
    );
    const persisted = await persist({
      ...checkpoint,
      attempts: replaceLast(checkpoint.attempts, settled),
      condition: "waiting-for-user",
      waiting,
    });
    if (!persisted.ok) return fatal(persisted.message);
    display.stageStopped({
      stagePosition: `${args.executingAttempt.stageIndex + 1}/${stageCount}`,
      durationMs: Date.parse(endedAt) - Date.parse(args.executingAttempt.startedAt),
      disposition: "interrupted",
    });
    renderPause(waiting, settled);
    return { kind: "interrupted", signal: args.sig };
  }

  // Advance past the stage the cursor sits on and persist the resulting cursor:
  // `ready`, or `completed` once the snapshot is exhausted. Returning `null`
  // leaves the loop (or its completion tail) to take it from there.
  async function advanceCursor(): Promise<ExecutionResult | null> {
    const nextIndex = checkpoint.stageIndex + 1;
    const persisted = await persist({
      ...checkpoint,
      stageIndex: nextIndex,
      condition: nextIndex === stageCount ? "completed" : "ready",
      waiting: null,
    });
    if (!persisted.ok) return fatal(persisted.message);
    return null;
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
    const enteredWaiting = checkpoint.waiting;
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
    if (checkpoint.condition === "executing") {
      const sig = signalReason(signal);
      if (sig !== null) return interruptedAtRest(sig);
      const abandoned = checkpoint.attempts[checkpoint.attempts.length - 1]!;
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
      const persisted = await persist({
        ...checkpoint,
        attempts: replaceLast(checkpoint.attempts, settled),
        condition: "ready",
        waiting: null,
      });
      if (!persisted.ok) return fatal(persisted.message);
    }

    // A ready cursor — allocated, or just recovered above — records no recovery,
    // so there is nothing to decide: the loop's own pre-attempt gate is what
    // pauses it on queued work or an unreadable queue.
    if (enteredWaiting === null) {
      checkpoint = { ...checkpoint, condition: "ready", waiting: null };
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
      const resolved = referencedAttempt(checkpoint, pausedRecovery.attempt);
      if (!resolved.ok) return fatal(resolved.message);
      recoveryAttempt = resolved.value;
    }
    const pauseAttempt =
      pausedRecovery.kind === "retry-stage"
        ? checkpoint.attempts[checkpoint.attempts.length - 1]
        : recoveryAttempt;
    const stage = checkpoint.stages[checkpoint.stageIndex]!;

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
      const [governing, ...rest] = pausedWaiting.reasons;
      const pauseWith = async (
        waiting: WaitingInfo,
        rendered: AttemptRecord | undefined,
      ): Promise<ExecutionResult> => {
        if (JSON.stringify(waiting) === JSON.stringify(checkpoint.waiting)) {
          renderPause(waiting, rendered);
          return { kind: "paused", waiting };
        }
        const persisted = await persist({
          ...checkpoint,
          condition: "waiting-for-user",
          waiting,
        });
        if (!persisted.ok) return fatal(persisted.message);
        renderPause(waiting, rendered);
        return { kind: "paused", waiting };
      };

      switch (facts.kind) {
        case "pending-bundles": {
          const waiting: WaitingInfo = {
            ...pausedWaiting,
            reasons: refreshPendingReason(
              pausedWaiting.reasons,
              facts.pendingFiles,
            ),
          };
          renderPause(waiting, attempt);
          return { kind: "paused", waiting };
        }

        case "queue-scan-failed":
          // A pause awaiting no-harness finalization — a Git boundary or an unmet
          // promised artifact — keeps its own governing reason and records the
          // scan diagnostic separately. Downgrading it to a gate-error would
          // describe away the saved DONE the pause is holding.
          if (holdsPreservedDone(directive.recovery)) {
            const withoutPriorScanError = rest.filter(
              (reason) => reason.kind !== "gate-error",
            );
            return pauseWith(
              {
                ...pausedWaiting,
                reasons: [
                  governing,
                  {
                    kind: "gate-error",
                    message: gateErrorMessage(facts.message),
                    diagnostics: { errorMessage: facts.message },
                  },
                  ...withoutPriorScanError,
                ],
                recovery: directive.recovery,
              },
              attempt,
            );
          }
          return pauseWith(
            {
              // The scan failure replaces what the pause explains, never what a
              // later resume may safely do about it.
              reasons: [
                {
                  kind: "gate-error",
                  message: gateErrorMessage(facts.message),
                  diagnostics: { errorMessage: facts.message },
                },
              ],
              recovery: directive.recovery,
              nextAction: pausedWaiting.nextAction,
            },
            undefined,
          );

        case "promise-uninspectable": {
          const currentRest = rest.filter(
            (reason) => reason.kind !== "gate-error",
          );
          return pauseWith(
            {
              reasons: [
                {
                  kind: "stage-contract-violation",
                  message: uninspectablePromiseMessage(facts.message),
                  diagnostics: { errorMessage: facts.message },
                  candidateLine:
                    attempt?.terminalResult?.candidateLine ?? undefined,
                },
                ...currentRest,
              ],
              recovery: directive.recovery,
              nextAction: CONTRACT_REPAIR_NOTE,
            },
            attempt,
          );
        }

        case "promise-unmet":
          return pauseWith(
            {
              reasons: [
                {
                  kind: "stage-contract-violation",
                  message: stillUnmetContractMessage(facts.unmet),
                  contract: facts.unmet,
                  detail:
                    facts.worktree === "dirty"
                      ? "The worktree is dirty, so the stage was not run again: those " +
                        "changes are the attempt's own and no executor may discard them."
                      : "The saved DONE remains preserved until the promised artifact " +
                        "is repaired and its Git boundary can be retried.",
                  candidateLine:
                    attempt?.terminalResult?.candidateLine ?? undefined,
                },
                ...rest.filter((reason) => reason.kind !== "gate-error"),
              ],
              recovery: directive.recovery,
              nextAction: CONTRACT_REPAIR_NOTE,
            },
            attempt,
          );

        case "git-finalization-failed": {
          const advisory =
            facts.failure.kind === "git-policy-violation" &&
            facts.failure.treatment === "advisory-head-movement";
          const interval =
            advisory && attempt !== undefined
              ? attemptInterval(attempt)
              : undefined;
          if (interval !== undefined && !interval.ok) {
            return fatal(interval.message);
          }
          return pauseWith(
            {
              reasons: [
                {
                  kind: advisory
                    ? "unexpected-head-movement"
                    : facts.failure.kind === "git-policy-violation"
                      ? "git-policy-violation"
                      : "commit-error",
                  message:
                    advisory && interval?.ok
                      ? unexpectedHeadMovementMessage(interval.value)
                      : `${facts.message}.`,
                  candidateLine:
                    attempt?.terminalResult?.candidateLine ?? undefined,
                },
              ],
              recovery: directive.recovery,
              nextAction: advisory
                ? HEAD_MOVEMENT_NEXT_ACTION
                : UNVALIDATED_CHANGES_NOTE,
            },
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
      const finalization = await finalizeGitBoundary({
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
      const doneAttempts = replaceAttempt(checkpoint.attempts, {
        ...preserved,
        result: "done",
        headAfterAttempt: finalization.headAfterFinalization,
      });
      const hadPending = (preserved.pendingFiles?.length ?? 0) > 0;
      if (hadPending && stage.queueResolution === "rerun") {
        const persisted = await persist({
          ...checkpoint,
          attempts: doneAttempts,
          condition: "ready",
          waiting: null,
        });
        if (!persisted.ok) return fatal(persisted.message);
        return null;
      }
      checkpoint = { ...checkpoint, attempts: doneAttempts };
      return advanceCursor();
    }

    /** Carry out one recovery directive as a durable transition. */
    async function applyDirective(
      directive: RecoveryDirective,
      attempt: AttemptRecord | undefined,
    ): Promise<ExecutionResult | null> {
      switch (directive.kind) {
        case "retry-stage":
          checkpoint = { ...checkpoint, condition: "ready", waiting: null };
          return null;
        case "advance-stage":
          return advanceCursor();
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

  while (checkpoint.stageIndex < stageCount) {
    const readySig = signalReason(signal);
    if (readySig !== null) return interruptedAtRest(readySig);

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
        recovery: { kind: "retry-stage" },
      };
      const persisted = await persist({
        ...checkpoint,
        condition: "waiting-for-user",
        waiting,
      });
      if (!persisted.ok) return fatal(persisted.message);
      renderPause(waiting);
      return { kind: "paused", waiting };
    }
    if (preScan.pendingFiles.length > 0) {
      const pendingFiles = preScan.pendingFiles;
      const message = pendingQueuesMessage(pendingFiles);
      const waiting: WaitingInfo = {
        reasons: [{ kind: "pending-queues", message, pendingFiles }],
        recovery: { kind: "retry-stage" },
      };
      const persisted = await persist({
        ...checkpoint,
        condition: "waiting-for-user",
        waiting,
      });
      if (!persisted.ok) return fatal(persisted.message);
      renderPause(waiting);
      return { kind: "paused", waiting };
    }

    // 2. Pre-attempt artifact contract. Composition proved the stage runnable
    //    against the state it simulated at allocation time; the concrete state
    //    can have moved since, so it is re-inspected here. An unmet
    //    prerequisite pauses on this stage having allocated no attempt, created
    //    no log, and invoked no harness.
    const preInspection = await inspectArtifacts(repoRoot, threadRelPath);
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
        recovery: { kind: "retry-stage" },
        nextAction: RESTORE_PREREQUISITE_NOTE,
      };
      const persisted = await persist({
        ...checkpoint,
        condition: "waiting-for-user",
        waiting,
      });
      if (!persisted.ok) return fatal(persisted.message);
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
      headAtStart,
      logPath: logPaths.runRelPath,
    };

    const executingPersist = await persist({
      ...checkpoint,
      condition: "executing",
      waiting: null,
      attempts: [...checkpoint.attempts, executingAttempt],
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
          message: uninspectablePromiseMessage(postInspection.message),
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
          reasons: [violation, ...queueReasons(pendingFiles, queueScanError)],
          // This stage's boundary is never reached, so the finalization a repair
          // unlocks is the one and only judgement of the stage's HEAD rule. What
          // that rule judges is the preserved attempt's own movement, which is
          // exactly what the attempt's two observations record.
          recovery: {
            kind: "recheck-stage-contract",
            attempt: { stageIndex, attempt: attemptNumber },
            pausedAtHead: observedHead,
          },
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
            headAfterAttempt: observedHead,
          },
          agentSession,
        );
        const persisted = await persist({
          ...checkpoint,
          attempts: replaceLast(checkpoint.attempts, settled),
          condition: "waiting-for-user",
          waiting,
        });
        if (!persisted.ok) return fatal(persisted.message);
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
      const finalization = await finalizeGitBoundary({
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
      const nextIndex = stageIndex + 1;
      const completed = nextIndex === stageCount;
      const persisted = await persist({
        ...checkpoint,
        attempts: replaceLast(checkpoint.attempts, done),
        stageIndex: nextIndex,
        condition: completed ? "completed" : "ready",
        waiting: null,
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
      // The stage is finished and its boundary is committed; only the queue is
      // holding the run, so releasing it applies the resolution the stage
      // declared and never finalizes this attempt a second time.
      const waiting: WaitingInfo = {
        reasons: classification.reasons,
        recovery: {
          kind: "resume-finalized-done",
          attempt: attemptReference,
          queueResolution: stage.queueResolution,
        },
      };
      const persisted = await persist({
        ...checkpoint,
        attempts: replaceLast(checkpoint.attempts, done),
        condition: "waiting-for-user",
        waiting,
      });
      if (!persisted.ok) return fatal(persisted.message);
      // The stage itself succeeded — it reported DONE and its boundary was
      // finalized. Only the pending bundle keeps the run from advancing.
      display.stageSucceeded({ stagePosition, durationMs });
      renderPause(waiting, done);
      return { kind: "paused", waiting };
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

    // A boundary that was reached and refused preserves a finalizable DONE, so
    // its recovery retries that boundary rather than the stage. Every other
    // non-DONE pause has no attempt to finalize and runs the stage again.
    const boundaryRefused = boundary.evaluated && !boundary.ok;
    const waiting: WaitingInfo = {
      reasons,
      recovery: boundaryRefused
        ? {
            kind: "retry-git-finalization",
            attempt: attemptReference,
            pausedAtHead: observedHead,
          }
        : { kind: "retry-stage" },
      nextAction: headMovementAdvisory
        ? HEAD_MOVEMENT_NEXT_ACTION
        : UNVALIDATED_CHANGES_NOTE,
    };
    const settled: AttemptRecord = withAgentSession(
      {
        ...executingAttempt,
        result: aborted ? "interrupted" : "waiting",
        endedAt,
        terminalResult,
        pendingFiles: pendingFiles.length > 0 ? pendingFiles : undefined,
        failure: { kind, message: baseMessage },
        headAfterAttempt: observedHead,
      },
      agentSession,
    );
    const persisted = await persist({
      ...checkpoint,
      attempts: replaceLast(checkpoint.attempts, settled),
      condition: "waiting-for-user",
      waiting,
    });
    if (!persisted.ok) return fatal(persisted.message);
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
