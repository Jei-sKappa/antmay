import { promises as fs } from "node:fs";
import path from "node:path";

import { EXIT_FAILURE, EXIT_OK, EXIT_WAITING } from "../cli/exit-codes.js";
import { resolveRoots, resolveStateRoot } from "../config/roots.js";
import type { HarnessId } from "../config/execution.js";
import {
  createTerminalDisplay,
  printRunSummary,
  printScriptedModeStartup,
  printScriptedResolvedPrompt,
} from "../display/terminal.js";
import type { DisplayOptions } from "../display/terminal.js";
import { evaluateBoundary, finalizeBoundary } from "../gitops/boundary.js";
import {
  collectBoundaryStatus,
  isWorktreeClean,
  readHead,
} from "../gitops/status.js";
import { checkTemporaryWorkspaces } from "../gitops/temporary-workspaces.js";
import {
  interpretScriptedHarnessToggle,
  loadScriptedScenario,
  SCRIPTED_HARNESS_TOGGLE_VAR,
} from "../harness/scripted/scenario.js";
import { nativeContinuationCommand } from "../harness/native-session.js";
import { gateErrorMessage, pendingQueuesMessage } from "../runner/classify.js";
import { executeRun } from "../runner/runner.js";
import { installSignalHandlers } from "../runner/signals.js";
import type {
  AttemptRecord,
  RunCheckpoint,
  WaitingInfo,
  WaitingReason,
  WaitingReasons,
} from "../state/checkpoint.js";
import {
  CONTRACT_REPAIR_NOTE,
  governingReason,
  UNVALIDATED_CHANGES_NOTE,
} from "../state/checkpoint.js";
import { acquireWorkspaceLock } from "../state/lock.js";
import { readCheckpoint, writeCheckpoint } from "../state/persist.js";
import { runDirectoryFor, runsDirectory } from "../state/runs.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";
import {
  describeContractSide,
  evaluatePromisedState,
  inspectArtifactState,
} from "../thread/artifacts.js";
import { scanPendingQueues } from "../thread/queues.js";
import { resolveThreadTarget } from "../thread/resolve.js";
import { resolveCurrentCheckoutWorkspace } from "../workspace/current-checkout.js";
import type { RunDeps } from "./run.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function replaceLast(
  attempts: AttemptRecord[],
  record: AttemptRecord,
): AttemptRecord[] {
  return [...attempts.slice(0, -1), record];
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

/**
 * Resume an existing `antmay afk run` from its durable checkpoint. Resolves only
 * the state root — never a config root, settings, or pipeline definitions — then
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
        `Run "${args.runId}" already completed the whole "${checkpoint.pipelineName}" pipeline; there is nothing to resume.`,
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

    const toggleResult = interpretScriptedHarnessToggle(deps.env);
    const isMarkedScripted = checkpoint.startedScripted === true;

    if (isMarkedScripted) {
      if (toggleResult.mode !== "scripted") {
        return fail(
          `Run "${args.runId}" was started in scripted test mode. Re-run resume with ${SCRIPTED_HARNESS_TOGGLE_VAR}=1 to continue.`,
        );
      }
    } else if (toggleResult.mode === "error") {
      return fail(toggleResult.message);
    }

    const useScripted = isMarkedScripted || toggleResult.mode === "scripted";
    let invoker = deps.invoker;
    let probe = deps.probe;
    let scenarioPath: string | undefined;
    if (useScripted) {
      const roots = resolveRoots(deps.env, deps.homedir);
      if (!roots.ok) {
        return fail(roots.message);
      }
      const loaded = await loadScriptedScenario(
        roots.configRoot,
        checkpoint.stages.map((stage) => stage.id),
      );
      if (!loaded.ok) {
        return fail(loaded.errors.join("\n"));
      }
      invoker = deps.createScriptedInvoker(loaded.scenario, (prompt) => {
        printScriptedResolvedPrompt(displayOptions, prompt);
      });
      probe = deps.scriptedProbe;
      scenarioPath = loaded.scenarioPath;
    }
    sig = signalCode();
    if (sig !== null) return sig;

    const stageIndex = checkpoint.stageIndex;
    const stage = checkpoint.stages[stageIndex]!;
    const currentHarness = stage.binding.agent.harness;

    // Probe only the current stage's snapshotted harness.
    const probeResult = await probe([currentHarness], repoRoot);
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

    // The thread's temporary workspaces must be Git-safe, whatever the durable
    // condition is: the clean-worktree exemptions below do not extend here.
    // Leftover files in an unignored workspace are themselves what makes the
    // worktree dirty, and the commit-or-revert advice the next gate gives would
    // commit work in progress into the repository. This runs before lock
    // acquisition and every checkpoint mutation.
    const workspaces = await checkTemporaryWorkspaces(repoRoot, threadRelPath);
    if (!workspaces.ok) {
      return fail(workspaces.message);
    }

    // Clean-worktree rule: required for every waiting kind except
    // git-policy-violation, commit-error, and stage-contract-violation, and for
    // ready and executing runs. A contract pause is exempt because a dirty tree
    // is exactly what it has to inspect: the repair that finalizes the saved
    // DONE arrives uncommitted, and whether the tree is clean is what decides
    // between retrying the stage and staying paused.
    const originalCondition = checkpoint.condition;
    const originalWaiting = checkpoint.waiting;
    const pausedKind =
      originalCondition === "waiting-for-user" && originalWaiting !== null
        ? governingReason(originalWaiting).kind
        : null;
    const boundaryPause =
      pausedKind === "git-policy-violation" || pausedKind === "commit-error";
    const contractPause = pausedKind === "stage-contract-violation";
    const requiresClean = !boundaryPause && !contractPause;
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
    const pipelineName = checkpoint.pipelineName;
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

    const renderPause = (
      waiting: WaitingInfo,
      attempt: AttemptRecord | undefined = undefined,
    ): void => {
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
        totalElapsedMs: clock().getTime() - Date.parse(checkpoint.createdAt),
        logAbsPath,
        continuationCommand,
        resumeCommand: resumeCommandLine,
        checkpointPath,
      });
    };

    const continueRun = async (cursor: RunCheckpoint): Promise<number> => {
      const result = await executeRun({
        checkpoint: cursor,
        runDir,
        stateRoot,
        lock,
        invoker,
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
          observedHead: null,
        },
      });
      if (!persisted.ok) return fatalCheckpoint(persisted.message);
      if (completed) {
        display.runCompleted({
          runId,
          pipelineName,
          totalElapsedMs: clock().getTime() - Date.parse(base.createdAt),
          checkpointPath,
          stageCount,
        });
        return EXIT_OK;
      }
      return continueRun(persisted.checkpoint);
    };

    /**
     * Finalize the saved `DONE` attempt of the paused stage without invoking the
     * agent again: evaluate the boundary as a resume (HEAD movement across the
     * pause is diagnostic, and a deliberately committed diff satisfies a
     * required change), commit it, then apply the stage's declared queue
     * resolution. Both no-harness recoveries — a boundary pause whose violation
     * was corrected and a contract pause whose promised artifact was repaired —
     * land here, so neither grows a finalization path of its own.
     *
     * The `headMayChange` rule is the caller's, because the two recoveries stand
     * in different places with respect to it. A boundary pause was already
     * judged under that rule during the run, so waiving it here forgives only
     * movement across the pause. A contract pause was never judged at all — the
     * runner stopped before the boundary — so this is the stage's one chance to
     * apply it. Enforcing it therefore comes with the `HEAD` the preserved
     * attempt started from: the rule judges that attempt's own movement, and
     * nothing an earlier attempt or a human across a pause did to the tip.
     */
    const finalizeSavedDone = async (
      pauseWaiting: WaitingInfo,
      headRule:
        | { enforce: false }
        | { enforce: true; headAtAttemptStart: string },
    ): Promise<number> => {
      const preserved = checkpoint.attempts[checkpoint.attempts.length - 1];
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
      // The attempt's post-attempt observation is the boundary side of the HEAD
      // rule; what the human did across the pause is reported by the warning
      // above and forbidden by no policy. Unenforced, the two sides are the same
      // value, so the rule cannot fire on anything.
      const headAtBoundary = checkpoint.gitCursor.observedHead ?? currentHead;
      const evaluation = evaluateBoundary(
        stage.gitPolicy,
        threadRelPath,
        observedPaths,
        headRule.enforce ? headRule.headAtAttemptStart : headAtBoundary,
        headAtBoundary,
        {
          enforceHead: headRule.enforce,
          allowRequiredChangeToBeAlreadyCommitted: true,
        },
      );
      const candidateLine = preserved?.terminalResult?.candidateLine ?? undefined;

      if (!evaluation.ok) {
        const newHead = await readHead(repoRoot);
        const message = `${evaluation.message}.`;
        const waiting: WaitingInfo = {
          reasons: [{ kind: "git-policy-violation", message, candidateLine }],
          nextAction: UNVALIDATED_CHANGES_NOTE,
        };
        const persisted = await persist({
          ...checkpoint,
          condition: "waiting-for-user",
          waiting,
          gitCursor: { ...checkpoint.gitCursor, observedHead: newHead },
        });
        if (!persisted.ok) return fatalCheckpoint(persisted.message);
        renderPause(waiting, preserved);
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
        const message = `${finalized.message}.`;
        const waiting: WaitingInfo = {
          reasons: [{ kind: "commit-error", message, candidateLine }],
          nextAction: UNVALIDATED_CHANGES_NOTE,
        };
        const persisted = await persist({
          ...checkpoint,
          condition: "waiting-for-user",
          waiting,
          gitCursor: { ...checkpoint.gitCursor, observedHead: newHead },
        });
        if (!persisted.ok) return fatalCheckpoint(persisted.message);
        renderPause(waiting, preserved);
        return EXIT_WAITING;
      }

      // Success: flip the preserved DONE attempt from waiting to done, clear
      // waiting, then apply the declared resolution when the pause listed
      // pending files, else the normal successful-stage advance.
      const doneAttempts =
        preserved !== undefined
          ? replaceLast(checkpoint.attempts, { ...preserved, result: "done" })
          : checkpoint.attempts;
      const hadPending = pauseWaiting.reasons.some(
        (reason) =>
          reason.kind === "pending-queues" &&
          reason.pendingFiles !== undefined &&
          reason.pendingFiles.length > 0,
      );
      if (hadPending && stage.queueResolution === "rerun") {
        const persisted = await persist({
          ...checkpoint,
          attempts: doneAttempts,
          condition: "ready",
          waiting: null,
          gitCursor: {
            stageIndex,
            observedHead: newHead,
          },
        });
        if (!persisted.ok) return fatalCheckpoint(persisted.message);
        return continueRun(persisted.checkpoint);
      }
      return advanceThenContinue({ ...checkpoint, attempts: doneAttempts });
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
      // permission choice is unrestricted.
      if (scenarioPath !== undefined) {
        printScriptedModeStartup(displayOptions, scenarioPath);
      }
      // Every value here comes from the checkpoint, so a resume renders the
      // execution the run was allocated with whatever later happened to the
      // pipeline, profile, or settings documents it was resolved from.
      printRunSummary(displayOptions, {
        runId,
        pipelineName,
        pipelineSourcePath: checkpoint.pipelineSourcePath,
        profileSelection: checkpoint.profileSelection,
        ...(checkpoint.fromStage !== undefined
          ? { fromStage: checkpoint.fromStage }
          : {}),
        threadRelPath,
        workspacePath: checkpoint.workspace.path,
        dangerouslySkipPermissions: checkpoint.dangerouslySkipPermissions,
        stages: checkpoint.stages.map((stage) => ({
          id: stage.id,
          harness: stage.binding.agent.harness,
          model: stage.binding.agent.model,
          target: stage.resolvedTarget,
        })),
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
        // A scan failure while a pause awaiting no-harness finalization — a Git
        // boundary or an unmet promised artifact — is held keeps that pause's
        // own kind, folding the scan diagnostic in. Downgrading it to a
        // gate-error would discard the saved DONE's recovery path.
        if ((boundaryPause || contractPause) && originalWaiting !== null) {
          const [governing, ...rest] = originalWaiting.reasons;
          const message = `${governing.message} The pending-queue scan failed again and must be repeated before finalizing: ${scan.message}`;
          const waiting: WaitingInfo = {
            ...originalWaiting,
            reasons: [
              {
                ...governing,
                message,
                diagnostics: { ...governing.diagnostics, errorMessage: scan.message },
              },
              ...rest,
            ],
          };
          const persisted = await persist({
            ...checkpoint,
            condition: "waiting-for-user",
            waiting,
          });
          if (!persisted.ok) return fatalCheckpoint(persisted.message);
          renderPause(waiting, lastAttempt);
          return EXIT_WAITING;
        }
        const message = gateErrorMessage(scan.message);
        const waiting: WaitingInfo = {
          reasons: [
            {
              kind: "gate-error",
              message,
              diagnostics: { errorMessage: scan.message },
            },
          ],
        };
        const persisted = await persist({
          ...checkpoint,
          condition: "waiting-for-user",
          waiting,
        });
        if (!persisted.ok) return fatalCheckpoint(persisted.message);
        renderPause(waiting);
        return EXIT_WAITING;
      }

      if (scan.pendingFiles.length > 0) {
        if (originalCondition === "waiting-for-user" && originalWaiting !== null) {
          // A waiting run with non-empty queues keeps its durable checkpoint
          // byte-for-byte unchanged; only what is printed reflects the files
          // that are still there.
          const waiting: WaitingInfo = {
            ...originalWaiting,
            reasons: refreshPendingReason(originalWaiting.reasons, scan.pendingFiles),
          };
          renderPause(waiting, lastAttempt);
          return EXIT_WAITING;
        }
        // A ready or recovered-executing cursor persists a tokenless pre-attempt
        // pending-queues pause without allocating an attempt.
        const message = pendingQueuesMessage(scan.pendingFiles);
        const waiting: WaitingInfo = {
          reasons: [
            {
              kind: "pending-queues",
              message,
              pendingFiles: scan.pendingFiles,
            },
          ],
        };
        const persisted = await persist({
          ...checkpoint,
          condition: "waiting-for-user",
          waiting,
        });
        if (!persisted.ok) return fatalCheckpoint(persisted.message);
        renderPause(waiting);
        return EXIT_WAITING;
      }

      // Queues are empty. A signal before any queue-empty transition leaves the
      // durable cursor unchanged.
      sig = signalCode();
      if (sig !== null) return sig;

      // Postcondition-contract resume: recheck the promised artifact state
      // first, because what that check finds is what chooses between the three
      // recoveries — finalize the saved DONE, run the stage again, or stay
      // paused.
      if (contractPause && originalWaiting !== null) {
        const [governing, ...rest] = originalWaiting.reasons;
        const inspection = await inspectArtifactState(repoRoot, threadRelPath);
        const unmet = inspection.ok
          ? evaluatePromisedState(inspection.state, stage.promises)
          : null;
        if (unmet !== null && unmet.length === 0) {
          // The stage's HEAD rule is applied here for the first time, against
          // the HEAD the preserved attempt started from. The schema requires
          // that value on this kind of reason; a reason somehow carrying none
          // states nothing about the attempt's movement, so there is nothing to
          // judge.
          const attemptStart = governing.headAtAttemptStart;
          return finalizeSavedDone(
            originalWaiting,
            attemptStart === undefined
              ? { enforce: false }
              : { enforce: true, headAtAttemptStart: attemptStart },
          );
        }

        let refreshed: WaitingReason;
        if (unmet === null) {
          // The inspection failed outright, so nothing about the promise was
          // decided. Staying paused is the only move that keeps the saved DONE
          // finalizable once the thread can be read again: running the stage on
          // "cannot verify" would move the governing kind off this pause and
          // discard that recovery for good. The reason's recorded
          // dimensions describe the earlier inspection, not this one, so they
          // go. What can make an inspection fail, and why pausing on it is the
          // fail-closed direction, is recorded beside the runner's post-DONE
          // verification in `runner/runner.ts`.
          const { contract: _staleContract, ...withoutContract } = governing;
          refreshed = {
            ...withoutContract,
            message: `${governing.message} It could not be re-verified on resume either.`,
          };
        } else {
          // The promise is genuinely still unmet. A clean worktree holds nothing
          // a human is in the middle of, so the stage runs again; a dirty one
          // holds the failed attempt's own changes, and only a human can say
          // whether they are a repair or something to revert.
          let clean: boolean;
          try {
            clean = await isWorktreeClean(repoRoot);
          } catch (error) {
            return fail(
              `Cannot inspect the Git worktree at ${repoRoot}: ${errorMessage(error)}`,
            );
          }
          if (clean) {
            return continueRun({ ...checkpoint, condition: "ready", waiting: null });
          }
          refreshed = {
            ...governing,
            message: stillUnmetContractMessage(unmet),
            contract: unmet,
            detail:
              "The worktree is dirty, so the stage was not run again: those " +
              "changes are the attempt's own and no executor may discard them.",
          };
        }
        const waiting: WaitingInfo = {
          reasons: [refreshed, ...rest],
          nextAction: CONTRACT_REPAIR_NOTE,
        };
        const persisted = await persist({
          ...checkpoint,
          condition: "waiting-for-user",
          waiting,
        });
        if (!persisted.ok) return fatalCheckpoint(persisted.message);
        renderPause(waiting, lastAttempt);
        return EXIT_WAITING;
      }

      // Boundary-finalization resume: finalize without a harness invocation.
      if (boundaryPause && originalWaiting !== null) {
        return finalizeSavedDone(originalWaiting, { enforce: false });
      }

      // DONE-finalized pending-queues: apply the stage's declared resolution.
      if (
        originalCondition === "waiting-for-user" &&
        originalWaiting !== null &&
        governingReason(originalWaiting).kind === "pending-queues"
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
