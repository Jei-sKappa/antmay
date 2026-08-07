import path from "node:path";

import { EXIT_FAILURE, EXIT_OK, EXIT_WAITING } from "../cli/exit-codes.js";
import { createTerminalExecutionDisplay } from "../display/execution.js";
import type { DisplayOptions } from "../display/format.js";
import {
  printCompositionRefusal,
  printHarnessRuntimeRefusal,
  printTemporaryWorkspaceRefusal,
} from "../display/preflight.js";
import {
  printRunSummary,
  printScriptedModeStartup,
  printScriptedResolvedPrompt,
} from "../display/startup.js";
import { executeEngine } from "../execution/engine.js";
import { installSignalHandlers } from "../runner/signals.js";
import { allocateRun } from "./run/allocate.js";
import { checkRunTemporaryWorkspaces } from "./run/preflight/check-temporary-workspaces.js";
import { composeRunPipeline } from "./run/preflight/compose-pipeline.js";
import { findUnfinishedThreadRun } from "./run/preflight/find-unfinished-run.js";
import { inspectRunArtifacts } from "./run/preflight/inspect-artifacts.js";
import { loadRunPipeline } from "./run/preflight/load-pipeline.js";
import { loadRunProfile } from "./run/preflight/load-profile.js";
import { loadRunSettings } from "./run/preflight/load-settings.js";
import { requireCleanRunWorktree } from "./run/preflight/require-clean-worktree.js";
import { resolveRunRoots } from "./run/preflight/resolve-roots.js";
import { resolveRunRuntime } from "./run/preflight/resolve-runtime.js";
import { resolveRunThread } from "./run/preflight/resolve-thread.js";
import { scanRunPendingQueues } from "./run/preflight/scan-pending-queues.js";
import { snapshotRunStages } from "./run/preflight/snapshot-stages.js";
import type {
  RunAllocationRefusal,
  RunArgs,
  RunDeps,
  RunPreflightRefusal,
} from "./run/types.js";
export type { RunDeps } from "./run/types.js";

function bullets(items: string[]): string {
  return items.map((item) => `  - ${item}`).join("\n");
}

/**
 * Run a full `antmay afk run`: install the signal handlers, then the ordered
 * preflight, allocation under the workspace lock, the initial `ready`
 * checkpoint, and handoff of that allocated cursor to the execution engine.
 * Returns the process exit code. Every preflight failure prints to `stderr` and
 * returns `1`, leaving no run directory, no checkpoint, and no held lock; the
 * mapped engine results are `0` (completed), `2` (durable pause), `1` (fatal
 * checkpoint), and the conventional signal exit code (interruption). Handlers are
 * uninstalled on every ordinary return path.
 */
export async function runCommand(
  args: RunArgs,
  deps: RunDeps,
): Promise<number> {
  const clock = deps.clock ?? (() => new Date());
  const displayOptions: DisplayOptions = {
    stdout: deps.stdout,
    stderr: deps.stderr,
    color: deps.color,
  };

  const fail = (message: string): number => {
    deps.stderr.write(`${message}\n`);
    return EXIT_FAILURE;
  };

  /**
   * Present an inert preflight refusal. Field-level schema problems name no
   * file of their own, and three different documents can produce them, so the
   * refusal carries the label and resolved source the command names here.
   */
  const refuse = (refusal: RunPreflightRefusal): number => {
    if (refusal.kind === "message") {
      return fail(refusal.message);
    }
    return fail(
      `The ${refusal.label} at ${refusal.sourcePath} was rejected:\n${bullets(refusal.errors)}`,
    );
  };

  const refuseAllocation = (refusal: RunAllocationRefusal): number => {
    switch (refusal.kind) {
      case "lock-contention": {
        const record = refusal.existingRecord.trim();
        return fail(
          `The workspace is already locked by another antmay run.\n` +
            `Lock file: ${refusal.lockPath}\n` +
            (record.length > 0 ? `Lock record:\n${record}\n` : "") +
            `antmay never removes a lock automatically. Verify the recorded process is no longer running, then delete the lock file manually if it is stale.`,
        );
      }
      case "queue-scan-error":
        return fail(refusal.message);
      case "pending-files":
        return fail(
          `The thread has unresolved pending bundle files; resolve them before starting a run:\n${bullets(refusal.pendingFiles)}`,
        );
      case "checkpoint-write-failed":
        return fail(
          `Failed to write the initial checkpoint at ${path.join(refusal.runDir, "state.json")}: ${refusal.message}`,
        );
    }
  };

  // Install the signal handlers before preflight so a Ctrl-C at any point drives
  // the graceful stop; uninstall them on every ordinary return path.
  const controller = (deps.createAbortController ?? (() => new AbortController()))();
  const signals = (deps.installSignals ?? installSignalHandlers)({
    abort: controller,
    stderr: deps.stderr,
  });

  try {
    const roots = resolveRunRoots(deps.env, deps.homedir);
    if (!roots.ok) {
      return refuse(roots.refusal);
    }

    const pipeline = loadRunPipeline(args.pipeline, roots.configRoot, deps.cwd);
    if (!pipeline.ok) {
      return refuse(pipeline.refusal);
    }
    const { document, pipelineSourcePath } = pipeline;

    const profile = loadRunProfile(args.profile, roots.configRoot, deps.cwd);
    if (!profile.ok) {
      return refuse(profile.refusal);
    }
    const { profileStages, profileSelection } = profile;

    const settings = loadRunSettings(roots.configRoot);
    if (!settings.ok) {
      return refuse(settings.refusal);
    }

    const thread = await resolveRunThread(args.thread, deps.cwd);
    if (!thread.ok) {
      return refuse(thread.refusal);
    }

    const inspection = await inspectRunArtifacts(
      thread.repoRoot,
      thread.threadRelPath,
    );
    if (!inspection.ok) {
      return refuse(inspection.refusal);
    }

    const composition = composeRunPipeline(
      document,
      inspection.state,
      thread.threadRelPath,
      args.from ?? null,
    );
    if (!composition.ok) {
      printCompositionRefusal(displayOptions, {
        pipelineName: document.name,
        pipelineSourcePath,
        failure: composition.failure,
      });
      return EXIT_FAILURE;
    }

    const snapshot = snapshotRunStages(
      composition.stages,
      settings.stages,
      profileStages,
      profileSelection,
      args.from,
    );
    if (!snapshot.ok) {
      return refuse(snapshot.refusal);
    }
    const { stages, fromStage } = snapshot;

    const harnessRuntime = await resolveRunRuntime(
      stages,
      deps.env,
      thread.repoRoot,
      roots.configRoot,
      deps.harnessRuntime,
      (prompt) => {
        printScriptedResolvedPrompt(displayOptions, prompt);
      },
    );
    if (!harnessRuntime.ok) {
      printHarnessRuntimeRefusal(displayOptions, harnessRuntime.failure);
      return EXIT_FAILURE;
    }
    const { observedHarnessVersions, harnessVersions } = harnessRuntime;

    const workspaces = await checkRunTemporaryWorkspaces(
      thread.repoRoot,
      thread.threadRelPath,
    );
    if (!workspaces.ok) {
      if (workspaces.kind === "inspection-error") {
        return fail(workspaces.message);
      }
      printTemporaryWorkspaceRefusal(displayOptions, {
        mode: "run",
        pipelineName: document.name,
        threadRelPath: thread.threadRelPath,
        repoRoot: thread.repoRoot,
        problems: workspaces.problems,
      });
      return EXIT_FAILURE;
    }

    const cleanWorktree = await requireCleanRunWorktree(thread.repoRoot);
    if (!cleanWorktree.ok) {
      return refuse(cleanWorktree.refusal);
    }

    const preScan = await scanRunPendingQueues(
      thread.repoRoot,
      thread.threadRelPath,
    );
    if (!preScan.ok) {
      return fail(preScan.message);
    }
    if (preScan.pendingFiles.length > 0) {
      return fail(
        `The thread has unresolved pending bundle files; resolve them before starting a run:\n${bullets(preScan.pendingFiles)}`,
      );
    }

    const unfinished = await findUnfinishedThreadRun(
      roots.stateRoot,
      thread.repoRoot,
      thread.threadRelPath,
    );
    if (!unfinished.ok) {
      if (unfinished.kind === "scan-error") {
        return fail(unfinished.message);
      }
    }
    for (const warning of unfinished.warnings) {
      deps.stderr.write(
        `warning: ignoring an unreadable run checkpoint at ${warning.runDir}: ${warning.errors.join("; ")}\n`,
      );
    }
    if (!unfinished.ok) {
      const { match } = unfinished;
      return fail(
        `An unfinished run for this thread already exists: ${match.runId} (condition: ${match.condition}).\n` +
          `Resume it with:\n  antmay afk resume ${match.runId}\n` +
          `If it is abandoned, delete its run directory to start fresh:\n  ${match.runDir}`,
      );
    }

    // A signal that arrived before the initial checkpoint exists exits with the
    // conventional code and creates no run.
    const preAllocSig = signals.signaled();
    if (preAllocSig !== null) {
      return signals.exitCodeFor(preAllocSig);
    }

    const allocation = await allocateRun({
      stateRoot: roots.stateRoot,
      repoRoot: thread.repoRoot,
      threadRelPath: thread.threadRelPath,
      dangerouslySkipPermissions: args.dangerouslySkipPermissions,
      pipelineName: document.name,
      pipelineSourcePath,
      profileSelection,
      fromStage,
      stages,
      observedHarnessVersions,
      runtime: harnessRuntime.runtime,
      clock,
      generateId: deps.generateId,
      writeInitialCheckpoint: deps.writeInitialCheckpoint,
    });
    if (!allocation.ok) {
      return refuseAllocation(allocation.refusal);
    }
    const { runDir, lock, checkpoint } = allocation;

    // A signal after allocation but before launch releases the owned lock and
    // exits with the conventional code, leaving the ready checkpoint for resume.
    const preLaunchSig = signals.signaled();
    if (preLaunchSig !== null) {
      await lock.release();
      return signals.exitCodeFor(preLaunchSig);
    }

    // The initial checkpoint exists. Print the startup summary (with the
    // unrestricted warning when applicable), drive the run, map the engine
    // result to an exit code, and release the lock unconditionally.
    if (harnessRuntime.scenarioPath !== undefined) {
      printScriptedModeStartup(displayOptions, harnessRuntime.scenarioPath);
    }
    printRunSummary(displayOptions, {
      runId: checkpoint.runId,
      pipelineName: document.name,
      pipelineSourcePath,
      profileSelection,
      ...(fromStage !== null ? { fromStage } : {}),
      threadRelPath: thread.threadRelPath,
      workspacePath: checkpoint.workspace.path,
      dangerouslySkipPermissions: args.dangerouslySkipPermissions,
      stages: stages.map((stage) => ({
        id: stage.id,
        harness: stage.binding.agent.harness,
        model: stage.binding.agent.model,
        target: stage.resolvedTarget,
      })),
    });

    const display = createTerminalExecutionDisplay(displayOptions);
    try {
      const result = await executeEngine({
        entry: { kind: "allocated", checkpoint },
        runDir,
        invoker: harnessRuntime.invoker,
        display,
        harnessVersions,
        signal: controller.signal,
        clock: deps.clock,
      });
      switch (result.kind) {
        case "completed":
          return EXIT_OK;
        case "paused":
          return EXIT_WAITING;
        // A signal interruption maps to the conventional signal exit code, never
        // to the ordinary durable-pause code, even though a waiting checkpoint
        // persists.
        case "interrupted":
          return signals.exitCodeFor(result.signal);
        case "refused":
          return fail(result.message);
        case "fatal-checkpoint":
          return fail(
            `A fatal checkpoint error ended the run before it could pause safely: ${result.message}`,
          );
      }
    } finally {
      await lock.release();
    }
  } finally {
    signals.uninstall();
  }
}
