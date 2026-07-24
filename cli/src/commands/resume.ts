import { promises as fs } from "node:fs";
import path from "node:path";

import {
  EXIT_FAILURE,
  EXIT_OK,
  EXIT_WAITING,
} from "../cli/exit-codes.js";
import { resolveStateRoot } from "../config/roots.js";
import type { HarnessId } from "../config/settings.js";
import {
  createTerminalDisplay,
  printRunSummary,
} from "../display/terminal.js";
import type { DisplayOptions } from "../display/terminal.js";
import { evaluateBoundary, finalizeBoundary } from "../gitops/boundary.js";
import {
  collectBoundaryStatus,
  isWorktreeClean,
  readHead,
} from "../gitops/status.js";
import { executeRun } from "../runner/runner.js";
import { installSignalHandlers } from "../runner/signals.js";
import type {
  AttemptRecord,
  RunCheckpoint,
  WaitingInfo,
} from "../state/checkpoint.js";
import { acquireWorkspaceLock } from "../state/lock.js";
import { readCheckpoint, writeCheckpoint } from "../state/persist.js";
import { runDirectoryFor, runsDirectory } from "../state/runs.js";
import { scanPendingQueues } from "../thread/queues.js";
import { resolveThreadTarget } from "../thread/resolve.js";
import { resolveCurrentCheckoutWorkspace } from "../workspace/current-checkout.js";
import type { RunDeps } from "./run.js";

/**
 * The unvalidated-changes note every non-DONE and boundary pause carries: the
 * user must revert or deliberately commit before resuming (DR54).
 */
const COMMIT_OR_REVERT_NOTE =
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

function pendingQueuesMessage(sorted: string[]): string {
  const subject =
    sorted.length === 1
      ? "a pending bundle file awaits"
      : "pending bundle files await";
  return `The stage cannot advance while ${subject} human resolution: ${sorted.join(", ")}.`;
}

/**
 * Resume an existing `antmay afk run` from its durable checkpoint. Resolves only
 * the state root — never a config root, settings, or recipe definitions — then
 * runs the ordered, checkpoint-preserving preflight (AC-15.1/AC-15.2), acquires
 * the recorded workspace lock, recovers an abandoned `executing` attempt, and
 * dispatches on the durable condition and waiting kind (AC-15.3): DONE-finalized
 * queue pauses follow the stage's declared `advance`/`rerun`, Git-boundary pauses
 * are finalized without another harness invocation, and every other resumable
 * cursor starts a fresh attempt at its stored stage before continuing through the
 * snapshotted stages via `executeRun`. Returns the process exit code, mapping
 * runner outcomes exactly as `run` does; every preflight failure returns `1` and
 * leaves the checkpoint unchanged. Signal handlers are installed at entry and
 * uninstalled on every ordinary return.
 */
export async function resumeCommand(
  args: { runId: string },
  deps: RunDeps,
): Promise<number> {
  const clock = deps.clock ?? (() => new Date());
  const noColor = (deps.env.NO_COLOR ?? "") !== "";
  const displayOptions: DisplayOptions = {
    stdout: deps.stdout,
    stderr: deps.stderr,
    isTTY: deps.isTTY,
    noColor,
  };
  const display = createTerminalDisplay(displayOptions);

  const fail = (message: string): number => {
    deps.stderr.write(`${message}\n`);
    return EXIT_FAILURE;
  };
  const fatalCheckpoint = (message: string): number => {
    deps.stderr.write(
      `A fatal checkpoint error ended the resume before it could pause safely: ${message}\n`,
    );
    return EXIT_FAILURE;
  };

  const controller = (deps.createAbortController ?? (() => new AbortController()))();
  const signals = (deps.installSignals ?? installSignalHandlers)({
    abort: controller,
    stderr: deps.stderr,
  });
  const signalCode = (): number | null => {
    const sig = signals.signaled();
    return sig === null ? null : signals.exitCodeFor(sig);
  };

  try {
    // Preflight resolves only the state root; a config-root problem never blocks
    // a state-only resume.
    const stateRootResult = resolveStateRoot(deps.env, deps.homedir);
    if (!stateRootResult.ok) {
      return fail(stateRootResult.message);
    }
    const stateRoot = stateRootResult.root;

    // Locate the run directory. An absent runs directory or run directory is an
    // unknown run, never a search for a replacement.
    const runDir = runDirectoryFor(stateRoot, args.runId);
    try {
      const stat = await fs.stat(runDir);
      if (!stat.isDirectory()) {
        return fail(`Unknown run "${args.runId}": ${runDir} is not a directory.`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return fail(
          `Unknown run "${args.runId}": no run directory exists under ${runsDirectory(stateRoot)}.`,
        );
      }
      return fail(`Cannot access the run directory ${runDir}: ${errorMessage(error)}`);
    }
    let sig = signalCode();
    if (sig !== null) return sig;

    // Load and validate the checkpoint.
    const loaded = await readCheckpoint(runDir);
    if (!loaded.ok) {
      return fail(
        `The checkpoint for run "${args.runId}" is malformed or unreadable:\n${loaded.errors.join("\n")}`,
      );
    }
    let checkpoint = loaded.checkpoint;
    sig = signalCode();
    if (sig !== null) return sig;

    // A completed run reports that fact and exits 1.
    if (checkpoint.condition === "completed") {
      return fail(
        `Run "${args.runId}" already completed the whole "${checkpoint.recipeName}" recipe; there is nothing to resume.`,
      );
    }

    const repoRoot = checkpoint.repoRoot;
    const threadRelPath = checkpoint.threadRelPath;

    // Verify the recorded repository still resolves to the Git worktree top level
    // containing the recorded active thread, with non-empty seed/decisions.
    const thread = await resolveThreadTarget(
      path.join(repoRoot, threadRelPath),
      deps.cwd,
    );
    if (!thread.ok) {
      return fail(
        `The recorded repository or thread for run "${args.runId}" could not be revalidated: ${thread.message}`,
      );
    }
    if (thread.repoRoot !== repoRoot || thread.threadRelPath !== threadRelPath) {
      return fail(
        `The recorded thread no longer resolves to its recorded repository. ` +
          `Recorded repository ${repoRoot} with thread ${threadRelPath}; ` +
          `resolved repository ${thread.repoRoot} with thread ${thread.threadRelPath}.`,
      );
    }
    const threadFolder = thread.threadFolder;
    sig = signalCode();
    if (sig !== null) return sig;

    const stageIndex = checkpoint.stageIndex;
    const stage = checkpoint.stages[stageIndex]!;
    const currentHarness = stage.profile.harness;

    // Probe only the current stage's snapshotted harness (DR48).
    const probeResult = await deps.probe([currentHarness], repoRoot);
    if (!probeResult.ok) {
      const lines = probeResult.failures.map(
        (failure) => `${failure.harness} (${failure.binary}): ${failure.reason}`,
      );
      return fail(
        `Harness-executable preflight failed for the current stage's harness:\n${lines.join("\n")}`,
      );
    }
    const probedVersion = probeResult.versions[currentHarness];
    if (probedVersion === undefined || probedVersion.length === 0) {
      return fail(
        `Harness-executable preflight failed: no version reported for ${currentHarness}.`,
      );
    }
    // The process-local version map keeps every run-creation observation and
    // overrides only the current harness with the fresh resume probe; the
    // immutable stage snapshot and stored observations are never mutated.
    const harnessVersions: Record<string, string> = {};
    for (const [harness, version] of Object.entries(
      checkpoint.observedHarnessVersions,
    )) {
      if (version !== undefined && version.length > 0) {
        harnessVersions[harness] = version;
      }
    }
    harnessVersions[currentHarness] = probedVersion;
    sig = signalCode();
    if (sig !== null) return sig;

    // Resolve the current-checkout workspace and require its canonical path to
    // match the snapshotted workspace identity.
    const workspace = await resolveCurrentCheckoutWorkspace(repoRoot);
    if (workspace.path !== checkpoint.workspace.path) {
      return fail(
        `The recorded workspace no longer resolves to the same canonical path. ` +
          `Recorded ${checkpoint.workspace.path}; resolved ${workspace.path}.`,
      );
    }
    sig = signalCode();
    if (sig !== null) return sig;

    // Clean-worktree rule: required for every waiting kind except
    // git-policy-violation and commit-error, and for ready and executing runs.
    const originalCondition = checkpoint.condition;
    const originalWaiting = checkpoint.waiting;
    const boundaryPause =
      originalCondition === "waiting-for-user" &&
      originalWaiting !== null &&
      (originalWaiting.kind === "git-policy-violation" ||
        originalWaiting.kind === "commit-error");
    const requiresClean = !boundaryPause;
    if (requiresClean) {
      let clean: boolean;
      try {
        clean = await isWorktreeClean(repoRoot);
      } catch (error) {
        return fail(
          `Cannot inspect the Git worktree at ${repoRoot}: ${errorMessage(error)}`,
        );
      }
      if (!clean) {
        return fail(
          `The Git worktree at ${repoRoot} is not clean. Commit what you want to keep or revert the rest before resuming.`,
        );
      }
    }
    sig = signalCode();
    if (sig !== null) return sig;

    // Immediately before lock acquisition, a first signal exits with the
    // conventional code, the checkpoint unchanged.
    sig = signalCode();
    if (sig !== null) return sig;

    // Acquire the recorded workspace lock before any checkpoint mutation.
    const lockOutcome = await acquireWorkspaceLock(
      stateRoot,
      checkpoint.workspace.path,
      checkpoint.runId,
      clock(),
    );
    if (!lockOutcome.ok) {
      const record = lockOutcome.existingRecord.trim();
      return fail(
        `The workspace is already locked by another antmay run.\n` +
          `Lock file: ${lockOutcome.lockPath}\n` +
          (record.length > 0 ? `Lock record:\n${record}\n` : "") +
          `antmay never removes a lock automatically. Verify the recorded process is no longer running, then delete the lock file manually if it is stale before resuming.`,
      );
    }
    const lock = lockOutcome.handle;

    const runId = checkpoint.runId;
    const recipeName = checkpoint.recipeName;
    const checkpointPath = path.join(runDir, "state.json");
    const resumeCommandLine = `antmay afk resume ${runId}`;
    const stageCount = checkpoint.stages.length;

    const persist = async (
      next: RunCheckpoint,
    ): Promise<
      { ok: true; checkpoint: RunCheckpoint } | { ok: false; message: string }
    > => {
      const stamped: RunCheckpoint = { ...next, updatedAt: clock().toISOString() };
      try {
        await writeCheckpoint(runDir, stamped);
        checkpoint = stamped;
        return { ok: true, checkpoint: stamped };
      } catch (error) {
        return { ok: false, message: errorMessage(error) };
      }
    };

    const attemptLogAbs = (attempt: AttemptRecord | undefined): string | null =>
      attempt === undefined ? null : path.join(runDir, attempt.logPath);

    const continueRun = async (cursor: RunCheckpoint): Promise<number> => {
      const result = await executeRun({
        checkpoint: cursor,
        runDir,
        stateRoot,
        lock,
        invoker: deps.invoker,
        display,
        harnessVersions,
        signal: controller.signal,
        clock: deps.clock,
      });
      if (result.status === "completed") return EXIT_OK;
      if (result.status === "interrupted") {
        return signals.exitCodeFor(result.signal);
      }
      if (result.status === "paused") return EXIT_WAITING;
      deps.stderr.write(
        `A fatal checkpoint error ended the resume before it could pause safely: ${result.message}\n`,
      );
      return EXIT_FAILURE;
    };

    // The one shared advance transition: increment the stage index, reset the
    // HEAD cursor, and persist ready — or completed at the end of the snapshot —
    // then continue any runnable cursor through the remaining stages.
    const advanceThenContinue = async (
      base: RunCheckpoint,
    ): Promise<number> => {
      const nextIndex = base.stageIndex + 1;
      const completed = nextIndex === stageCount;
      const persisted = await persist({
        ...base,
        stageIndex: nextIndex,
        condition: completed ? "completed" : "ready",
        waiting: null,
        gitCursor: {
          stageIndex: nextIndex,
          headAtStageEntry: null,
          observedHead: null,
        },
      });
      if (!persisted.ok) return fatalCheckpoint(persisted.message);
      if (completed) {
        display.runCompleted({
          runId,
          recipeName,
          totalElapsedMs: clock().getTime() - Date.parse(base.createdAt),
          checkpointPath,
        });
        return EXIT_OK;
      }
      return continueRun(persisted.checkpoint);
    };

    try {
      // A signal that arrived before any mutation releases the lock (in finally)
      // and returns its conventional code with the durable cursor unchanged.
      sig = signalCode();
      if (sig !== null) return sig;

      // Recover an abandoned executing checkpoint under the lock: mark its
      // attempt interrupted (manual-recovery origin) and persist a
      // retry-at-same-stage ready cursor before any further transition.
      const recoveredExecuting = originalCondition === "executing";
      if (recoveredExecuting) {
        const abandoned = checkpoint.attempts[checkpoint.attempts.length - 1]!;
        const interrupted: AttemptRecord = {
          ...abandoned,
          result: "interrupted",
          endedAt: clock().toISOString(),
          terminalResult: null,
          failure: {
            kind: "interrupted",
            message:
              "The attempt was abandoned; the run was recovered on resume after manual stale-lock removal (origin: manual-recovery).",
          },
        };
        const persisted = await persist({
          ...checkpoint,
          attempts: replaceLast(checkpoint.attempts, interrupted),
          condition: "ready",
          waiting: null,
        });
        if (!persisted.ok) return fatalCheckpoint(persisted.message);
      }

      // Startup summary; re-print the unrestricted warning when the persisted
      // permission choice is unrestricted (DR56).
      printRunSummary(displayOptions, {
        runId,
        recipeName,
        threadRelPath,
        workspacePath: checkpoint.workspace.path,
        dangerouslySkipPermissions: checkpoint.dangerouslySkipPermissions,
        stageCount,
      });

      sig = signalCode();
      if (sig !== null) return sig;

      // Re-scan both queues under the lock, then handle the result before any
      // harness action.
      const scan = await scanPendingQueues(repoRoot, threadRelPath);
      sig = signalCode();
      if (sig !== null) return sig;

      const lastAttempt = checkpoint.attempts[checkpoint.attempts.length - 1];

      if (!scan.ok) {
        // DR57: a scan failure while a Git-boundary pause awaits finalization
        // keeps that boundary kind, folding the scan diagnostic in.
        if (boundaryPause && originalWaiting !== null) {
          const message = `${originalWaiting.message} The pending-queue scan failed again and must be repeated before finalizing: ${scan.message}`;
          const waiting: WaitingInfo = {
            kind: originalWaiting.kind,
            message,
            pendingFiles: originalWaiting.pendingFiles,
            candidateLine: originalWaiting.candidateLine,
            diagnostics: {
              ...(originalWaiting.diagnostics ?? {
                category: originalWaiting.kind,
              }),
              errorMessage: scan.message,
            },
          };
          const persisted = await persist({
            ...checkpoint,
            condition: "waiting-for-user",
            waiting,
          });
          if (!persisted.ok) return fatalCheckpoint(persisted.message);
          display.runPaused({
            waiting,
            runId,
            logAbsPath: attemptLogAbs(lastAttempt),
            resumeCommand: resumeCommandLine,
            checkpointPath,
          });
          return EXIT_WAITING;
        }
        const waiting: WaitingInfo = {
          kind: "gate-error",
          message: `The advancement invariant could not be evaluated because the pending-queue scan failed: ${scan.message}`,
          diagnostics: { category: "gate-error", errorMessage: scan.message },
        };
        const persisted = await persist({
          ...checkpoint,
          condition: "waiting-for-user",
          waiting,
        });
        if (!persisted.ok) return fatalCheckpoint(persisted.message);
        display.runPaused({
          waiting,
          runId,
          logAbsPath: null,
          resumeCommand: resumeCommandLine,
          checkpointPath,
        });
        return EXIT_WAITING;
      }

      if (scan.pendingFiles.length > 0) {
        if (originalCondition === "waiting-for-user" && originalWaiting !== null) {
          // A waiting run with non-empty queues stays byte-for-byte unchanged;
          // print the remaining files and exit 2.
          const waiting: WaitingInfo = {
            ...originalWaiting,
            pendingFiles: scan.pendingFiles,
          };
          display.runPaused({
            waiting,
            runId,
            logAbsPath: attemptLogAbs(lastAttempt),
            resumeCommand: resumeCommandLine,
            checkpointPath,
          });
          return EXIT_WAITING;
        }
        // A ready or recovered-executing cursor persists a tokenless pre-attempt
        // pending-queues pause without allocating an attempt.
        const waiting: WaitingInfo = {
          kind: "pending-queues",
          message: pendingQueuesMessage(scan.pendingFiles),
          pendingFiles: scan.pendingFiles,
        };
        const persisted = await persist({
          ...checkpoint,
          condition: "waiting-for-user",
          waiting,
        });
        if (!persisted.ok) return fatalCheckpoint(persisted.message);
        display.runPaused({
          waiting,
          runId,
          logAbsPath: null,
          resumeCommand: resumeCommandLine,
          checkpointPath,
        });
        return EXIT_WAITING;
      }

      // Queues are empty. A signal before any queue-empty transition leaves the
      // durable cursor unchanged.
      sig = signalCode();
      if (sig !== null) return sig;

      // Boundary-finalization resume: finalize without a harness invocation.
      if (boundaryPause && originalWaiting !== null) {
        const preserved = checkpoint.attempts[checkpoint.attempts.length - 1];
        const baseline = checkpoint.gitCursor.headAtStageEntry;
        const currentHead = await readHead(repoRoot);
        if (
          checkpoint.gitCursor.observedHead !== null &&
          checkpoint.gitCursor.observedHead !== currentHead
        ) {
          display.warn(
            `HEAD moved while the run was paused (${checkpoint.gitCursor.observedHead} → ${currentHead}); this is diagnostic only and is not a policy violation.`,
          );
        }
        const observedPaths = await collectBoundaryStatus(repoRoot);
        const evaluation = evaluateBoundary(
          stage.gitPolicy,
          threadRelPath,
          observedPaths,
          baseline ?? currentHead,
          currentHead,
          { enforceHead: false, allowRequiredChangeToBeAlreadyCommitted: true },
        );
        const candidateLine = preserved?.terminalResult?.candidateLine ?? undefined;

        if (!evaluation.ok) {
          const newHead = await readHead(repoRoot);
          const waiting: WaitingInfo = {
            kind: "git-policy-violation",
            message: `${evaluation.message}. ${COMMIT_OR_REVERT_NOTE}`,
            candidateLine,
            diagnostics: { category: "git-policy-violation" },
          };
          const persisted = await persist({
            ...checkpoint,
            condition: "waiting-for-user",
            waiting,
            gitCursor: { ...checkpoint.gitCursor, observedHead: newHead },
          });
          if (!persisted.ok) return fatalCheckpoint(persisted.message);
          display.runPaused({
            waiting,
            runId,
            logAbsPath: attemptLogAbs(preserved),
            resumeCommand: resumeCommandLine,
            checkpointPath,
          });
          return EXIT_WAITING;
        }

        const finalized = await finalizeBoundary(
          repoRoot,
          stage.gitPolicy,
          threadFolder,
          evaluation,
        );
        const newHead = await readHead(repoRoot);
        if (finalized.kind === "commit-error") {
          const waiting: WaitingInfo = {
            kind: "commit-error",
            message: `${finalized.message}. ${COMMIT_OR_REVERT_NOTE}`,
            candidateLine,
            diagnostics: { category: "commit-error" },
          };
          const persisted = await persist({
            ...checkpoint,
            condition: "waiting-for-user",
            waiting,
            gitCursor: { ...checkpoint.gitCursor, observedHead: newHead },
          });
          if (!persisted.ok) return fatalCheckpoint(persisted.message);
          display.runPaused({
            waiting,
            runId,
            logAbsPath: attemptLogAbs(preserved),
            resumeCommand: resumeCommandLine,
            checkpointPath,
          });
          return EXIT_WAITING;
        }

        // Success: flip the preserved DONE attempt from waiting to done, clear
        // waiting, then apply the declared resolution when the pause listed
        // pending files, else the normal successful-stage advance.
        const doneAttempts =
          preserved !== undefined
            ? replaceLast(checkpoint.attempts, { ...preserved, result: "done" })
            : checkpoint.attempts;
        const hadPending =
          originalWaiting.pendingFiles !== undefined &&
          originalWaiting.pendingFiles.length > 0;
        if (hadPending && stage.queueResolution === "rerun") {
          const persisted = await persist({
            ...checkpoint,
            attempts: doneAttempts,
            condition: "ready",
            waiting: null,
            gitCursor: {
              stageIndex,
              headAtStageEntry: checkpoint.gitCursor.headAtStageEntry,
              observedHead: newHead,
            },
          });
          if (!persisted.ok) return fatalCheckpoint(persisted.message);
          return continueRun(persisted.checkpoint);
        }
        return advanceThenContinue({ ...checkpoint, attempts: doneAttempts });
      }

      // DONE-finalized pending-queues: apply the stage's declared resolution.
      if (
        originalCondition === "waiting-for-user" &&
        originalWaiting !== null &&
        originalWaiting.kind === "pending-queues"
      ) {
        const doneFinalized =
          lastAttempt !== undefined &&
          lastAttempt.stageIndex === stageIndex &&
          lastAttempt.result === "done" &&
          lastAttempt.terminalResult?.token === "DONE";
        if (doneFinalized && stage.queueResolution === "advance") {
          return advanceThenContinue(checkpoint);
        }
        // A rerun of a DONE-finalized pause, and every non-DONE or pre-gate
        // pending-queues pause, start a fresh attempt at the same stage.
        return continueRun({ ...checkpoint, condition: "ready", waiting: null });
      }

      // Every other kind, and ready/recovered-executing: start a new attempt at
      // the stored stage.
      return continueRun({ ...checkpoint, condition: "ready", waiting: null });
    } finally {
      await lock.release();
    }
  } finally {
    signals.uninstall();
  }
}
