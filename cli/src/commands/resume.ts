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
  printTemporaryWorkspaceRefusal,
} from "../display/terminal.js";
import type { DisplayOptions } from "../display/terminal.js";
import { decideRecovery } from "../execution/recovery-policy.js";
import type {
  ContractEvidence,
  QueueEvidence,
  RecoveryDirective,
} from "../execution/recovery-policy.js";
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
  AttemptReference,
  RunCheckpoint,
  WaitingInfo,
  WaitingReasons,
  WaitingRecovery,
} from "../state/checkpoint.js";
import {
  CONTRACT_REPAIR_NOTE,
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

/**
 * The one attempt a recovery reference names. Checkpoint validation already
 * proved it exists in the state resuming from it requires, so a caller holding a
 * validated recovery reads the record itself and never the history's tail.
 */
function referencedAttempt(
  checkpoint: RunCheckpoint,
  reference: AttemptReference,
): AttemptRecord {
  const found = checkpoint.attempts.find(
    (attempt) =>
      attempt.stageIndex === reference.stageIndex &&
      attempt.attempt === reference.attempt,
  );
  if (found === undefined) {
    throw new Error(
      `the validated checkpoint records no attempt ${reference.attempt} for stage ${reference.stageIndex}`,
    );
  }
  return found;
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
 * the recorded workspace lock, and recovers an abandoned `executing` attempt.
 * For a paused run it then observes the fresh queue, promised-artifact, and
 * worktree evidence its recorded recovery acts on, asks `decideRecovery` what to
 * do, and carries the returned directive out as a durable transition (AC-15.3):
 * a finalized `DONE` follows the resolution it recorded, a refused boundary and
 * a repaired promise are finalized without another harness invocation, and every
 * other resumable cursor starts a fresh attempt at its stored stage before
 * continuing through the snapshotted stages via `executeRun`. Returns the
 * process exit code, mapping
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

    // The run's harness runtime is fixed at allocation, so the developer toggle
    // may only agree with it. Both directions are fail-closed, and both refuse
    // here — before the probe, the lock, and any mutation.
    const toggleResult = interpretScriptedHarnessToggle(deps.env);
    const useScripted = checkpoint.runtime.kind === "scripted";

    if (useScripted) {
      if (toggleResult.mode !== "scripted") {
        return fail(
          `Run "${args.runId}" was started in scripted test mode. Re-run resume with ${SCRIPTED_HARNESS_TOGGLE_VAR}=1 to continue.`,
        );
      }
    } else if (toggleResult.mode === "error") {
      return fail(toggleResult.message);
    } else if (toggleResult.mode === "scripted") {
      return fail(
        `Run "${args.runId}" was started against a real harness, and a run's harness runtime cannot change. ` +
          `Unset ${SCRIPTED_HARNESS_TOGGLE_VAR} and resume again to continue in real mode.`,
      );
    }
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
      if (workspaces.kind === "inspection-error") {
        return fail(workspaces.message);
      }
      printTemporaryWorkspaceRefusal(displayOptions, {
        mode: "resume",
        runId: checkpoint.runId,
        pipelineName: checkpoint.pipelineName,
        threadRelPath,
        repoRoot,
        problems: workspaces.problems,
      });
      return EXIT_FAILURE;
    }

    // Clean-worktree rule: required for a ready or executing run and for every
    // recovery except the two that finalize a preserved DONE. A contract recheck
    // is exempt because a dirty tree is exactly what it has to inspect: the
    // repair that finalizes the saved DONE arrives uncommitted, and whether the
    // tree is clean is what decides between retrying the stage and staying
    // paused. A boundary retry is exempt because the diff it commits is the
    // thing it is waiting for.
    const originalCondition = checkpoint.condition;
    const originalWaiting = checkpoint.waiting;
    const recovery: WaitingRecovery | null = originalWaiting?.recovery ?? null;
    const finalizesPreservedDone =
      recovery !== null &&
      (recovery.kind === "recheck-stage-contract" ||
        recovery.kind === "retry-git-finalization");
    const requiresClean = !finalizesPreservedDone;
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

    // The one shared advance transition: increment the stage index and persist
    // ready — or completed at the end of the snapshot — then continue any
    // runnable cursor through the remaining stages.
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
          // The abandoned attempt settles here, so this is where it acquires the
          // post-attempt observation every settled attempt carries.
          headAfterAttempt: await readHead(repoRoot),
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

      // Re-scan both queues under the lock. The fresh result gates every
      // recovery and every runnable cursor alike, before any harness action.
      const scan = await scanPendingQueues(repoRoot, threadRelPath);
      sig = signalCode();
      if (sig !== null) return sig;

      const queues: QueueEvidence = !scan.ok
        ? { kind: "scan-failed", message: scan.message }
        : scan.pendingFiles.length > 0
          ? { kind: "pending", pendingFiles: scan.pendingFiles }
          : { kind: "clear" };

      const lastAttempt = checkpoint.attempts[checkpoint.attempts.length - 1];

      if (recovery === null || originalWaiting === null) {
        // A ready or recovered-executing cursor carries no recorded recovery, so
        // queued work and an unreadable queue each persist a fresh tokenless
        // pre-attempt pause without allocating an attempt.
        const preAttemptPause = async (
          waiting: WaitingInfo,
        ): Promise<number> => {
          const persisted = await persist({
            ...checkpoint,
            condition: "waiting-for-user",
            waiting,
          });
          if (!persisted.ok) return fatalCheckpoint(persisted.message);
          renderPause(waiting);
          return EXIT_WAITING;
        };
        if (queues.kind === "scan-failed") {
          return preAttemptPause({
            reasons: [
              {
                kind: "gate-error",
                message: gateErrorMessage(queues.message),
                diagnostics: { errorMessage: queues.message },
              },
            ],
            recovery: { kind: "retry-stage" },
          });
        }
        if (queues.kind === "pending") {
          return preAttemptPause({
            reasons: [
              {
                kind: "pending-queues",
                message: pendingQueuesMessage(queues.pendingFiles),
                pendingFiles: queues.pendingFiles,
              },
            ],
            recovery: { kind: "retry-stage" },
          });
        }
        // Queues are empty. A signal before the transition leaves the durable
        // cursor unchanged.
        sig = signalCode();
        if (sig !== null) return sig;
        return continueRun({ ...checkpoint, condition: "ready", waiting: null });
      }

      // Everything from here is decided by the pause's own recorded recovery.
      // The reason list explains the pause and never steers it.
      const pausedRecovery: WaitingRecovery = recovery;
      const pausedWaiting: WaitingInfo = originalWaiting;

      /**
       * Persist and render the refreshed pause a `remain-paused` directive
       * describes, leaving the run exactly as recoverable as this resume found
       * it. Still-present bundles are the one case that writes nothing: the
       * durable checkpoint stays byte-for-byte unchanged and only what is
       * printed reflects the files that are still there.
       */
      const remainPaused = async (
        directive: Extract<RecoveryDirective, { kind: "remain-paused" }>,
        attempt: AttemptRecord | undefined,
      ): Promise<number> => {
        const facts = directive.facts;
        const [governing, ...rest] = pausedWaiting.reasons;
        const pauseWith = async (
          waiting: WaitingInfo,
          rendered: AttemptRecord | undefined,
        ): Promise<number> => {
          const persisted = await persist({
            ...checkpoint,
            condition: "waiting-for-user",
            waiting,
          });
          if (!persisted.ok) return fatalCheckpoint(persisted.message);
          renderPause(waiting, rendered);
          return EXIT_WAITING;
        };

        switch (facts.kind) {
          case "pending-bundles":
            renderPause(
              {
                ...pausedWaiting,
                reasons: refreshPendingReason(
                  pausedWaiting.reasons,
                  facts.pendingFiles,
                ),
              },
              attempt,
            );
            return EXIT_WAITING;

          case "queue-scan-failed":
            // A pause awaiting no-harness finalization — a Git boundary or an
            // unmet promised artifact — keeps its own kind, folding the scan
            // diagnostic in. Downgrading it to a gate-error would describe away
            // the saved DONE the pause is holding.
            if (finalizesPreservedDone) {
              return pauseWith(
                {
                  ...pausedWaiting,
                  reasons: [
                    {
                      ...governing,
                      message: `${governing.message} The pending-queue scan failed again and must be repeated before finalizing: ${facts.message}`,
                      diagnostics: {
                        ...governing.diagnostics,
                        errorMessage: facts.message,
                      },
                    },
                    ...rest,
                  ],
                  recovery: directive.recovery,
                },
                attempt,
              );
            }
            return pauseWith(
              {
                // The scan failure replaces what the pause explains, never what
                // a later resume may safely do about it.
                reasons: [
                  {
                    kind: "gate-error",
                    message: gateErrorMessage(facts.message),
                    diagnostics: { errorMessage: facts.message },
                  },
                ],
                recovery: directive.recovery,
              },
              undefined,
            );

          case "promise-uninspectable": {
            // The reason's recorded dimensions describe the earlier inspection,
            // not this one, so they go. What can make an inspection fail, and
            // why pausing on it is the fail-closed direction, is recorded beside
            // the runner's post-DONE verification in `runner/runner.ts`.
            const { contract: _staleContract, ...withoutContract } = governing;
            return pauseWith(
              {
                reasons: [
                  {
                    ...withoutContract,
                    message: `${governing.message} It could not be re-verified on resume either.`,
                  },
                  ...rest,
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
                    ...governing,
                    message: stillUnmetContractMessage(facts.unmet),
                    contract: facts.unmet,
                    detail:
                      "The worktree is dirty, so the stage was not run again: those " +
                      "changes are the attempt's own and no executor may discard them.",
                  },
                  ...rest,
                ],
                recovery: directive.recovery,
                nextAction: CONTRACT_REPAIR_NOTE,
              },
              attempt,
            );

          case "git-finalization-failed":
            return pauseWith(
              {
                reasons: [
                  {
                    kind: facts.failure,
                    message: `${facts.message}.`,
                    candidateLine:
                      attempt?.terminalResult?.candidateLine ?? undefined,
                  },
                ],
                recovery: directive.recovery,
                nextAction: UNVALIDATED_CHANGES_NOTE,
              },
              attempt,
            );
        }
      };

      /**
       * Finalize the exact saved `DONE` attempt a `finalize-boundary` directive
       * names, without invoking the agent again: evaluate the boundary as a
       * resume (HEAD movement across the pause is diagnostic, and a deliberately
       * committed diff satisfies a required change), commit it, then apply the
       * stage's declared queue resolution. Both no-harness recoveries — a
       * refused boundary that was corrected and a repaired promised artifact —
       * land here, so neither grows a finalization path of its own.
       *
       * The `headMayChange` rule follows the directive's context, because the two
       * contexts stand in different places with respect to it. A boundary retry
       * was already judged under that rule during the run, so waiving it here
       * forgives only movement across the pause. A contract repair was never
       * judged at all — the runner stopped before the boundary — so this is the
       * stage's one chance to apply it, and it is applied against the `HEAD` the
       * preserved attempt itself started from: the rule judges that attempt's own
       * movement, and nothing an earlier attempt or a human across a pause did to
       * the tip.
       */
      const finalizeSavedDone = async (
        directive: Extract<RecoveryDirective, { kind: "finalize-boundary" }>,
      ): Promise<number> => {
        const preserved = referencedAttempt(checkpoint, directive.attempt);
        const currentHead = await readHead(repoRoot);
        if (directive.pausedAtHead !== currentHead) {
          display.warn(
            `HEAD moved while the run was paused (${directive.pausedAtHead} → ${currentHead}); this is diagnostic only and is not a policy violation.`,
          );
        }
        const observedPaths = await collectBoundaryStatus(repoRoot);
        // The pause's own observation is the boundary side of the HEAD rule; what
        // the human did across the pause is reported by the warning above and
        // forbidden by no policy. Unenforced, the two sides are the same value, so
        // the rule cannot fire on anything.
        const headAtBoundary = directive.pausedAtHead;
        const enforceHead = directive.context === "after-contract-repair";
        const evaluation = evaluateBoundary(
          stage.gitPolicy,
          threadRelPath,
          observedPaths,
          enforceHead ? preserved.headAtStart : headAtBoundary,
          headAtBoundary,
          {
            enforceHead,
            allowRequiredChangeToBeAlreadyCommitted: true,
          },
        );

        // A boundary this resume could not finalize is fresh Git evidence like
        // any other: the policy decides what the run does about it, and keeps the
        // preserved attempt finalizable from wherever this attempt left the tip.
        const finalizationFailed = async (
          failure: "git-policy-violation" | "commit-error",
          message: string,
        ): Promise<number> =>
          applyDirective(
            decideRecovery(pausedRecovery, {
              queues: { kind: "clear" },
              git: {
                kind: "finalization-failed",
                failure,
                message,
                observedHead: await readHead(repoRoot),
              },
            }),
            preserved,
          );

        if (!evaluation.ok) {
          return finalizationFailed("git-policy-violation", evaluation.message);
        }

        const finalized = await finalizeBoundary(
          repoRoot,
          stage.gitPolicy,
          threadFolder,
          evaluation,
        );
        if (finalized.kind === "commit-error") {
          return finalizationFailed("commit-error", finalized.message);
        }

        // Success: flip the preserved DONE attempt from waiting to done, clear
        // waiting, then apply the declared resolution when the attempt listed
        // pending files, else the normal successful-stage advance.
        const doneAttempts = replaceAttempt(checkpoint.attempts, {
          ...preserved,
          result: "done",
        });
        const hadPending = (preserved.pendingFiles?.length ?? 0) > 0;
        if (hadPending && stage.queueResolution === "rerun") {
          const persisted = await persist({
            ...checkpoint,
            attempts: doneAttempts,
            condition: "ready",
            waiting: null,
          });
          if (!persisted.ok) return fatalCheckpoint(persisted.message);
          return continueRun(persisted.checkpoint);
        }
        return advanceThenContinue({ ...checkpoint, attempts: doneAttempts });
      };

      /** Carry out one recovery directive as a durable transition. */
      const applyDirective = async (
        directive: RecoveryDirective,
        attempt: AttemptRecord | undefined,
      ): Promise<number> => {
        switch (directive.kind) {
          case "retry-stage":
            return continueRun({ ...checkpoint, condition: "ready", waiting: null });
          case "advance-stage":
            return advanceThenContinue(checkpoint);
          case "finalize-boundary":
            return finalizeSavedDone(directive);
          case "remain-paused":
            return remainPaused(directive, attempt);
        }
      };

      // The evidence the recorded recovery acts on, observed only where that
      // recovery calls for it. Held queues decide the pause on their own, so
      // nothing further is read while a human still owes the thread work.
      let contract: ContractEvidence | undefined;
      if (queues.kind === "clear") {
        // Queues are empty. A signal before any queue-empty transition leaves
        // the durable cursor unchanged.
        sig = signalCode();
        if (sig !== null) return sig;

        if (pausedRecovery.kind === "recheck-stage-contract") {
          const inspection = await inspectArtifactState(repoRoot, threadRelPath);
          if (!inspection.ok) {
            contract = { kind: "uninspectable" };
          } else {
            const unmet = evaluatePromisedState(inspection.state, stage.promises);
            if (unmet.length === 0) {
              contract = { kind: "satisfied" };
            } else {
              let clean: boolean;
              try {
                clean = await isWorktreeClean(repoRoot);
              } catch (error) {
                return fail(
                  `Cannot inspect the Git worktree at ${repoRoot}: ${errorMessage(error)}`,
                );
              }
              contract = {
                kind: "unmet",
                unmet,
                worktree: clean ? "clean" : "dirty",
              };
            }
          }
        }
      }

      return applyDirective(
        decideRecovery(pausedRecovery, {
          queues,
          ...(contract !== undefined ? { contract } : {}),
        }),
        lastAttempt,
      );
    } finally {
      await lock.release();
    }
  } finally {
    signals.uninstall();
  }
}
