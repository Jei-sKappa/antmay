import { randomBytes } from "node:crypto";
import type { Dirent } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

import { EXIT_FAILURE, EXIT_OK, EXIT_WAITING } from "../cli/exit-codes.js";
import { VERSION } from "../cli/help.js";
import { resolveStageBindings } from "../config/execution.js";
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
import { isWorktreeClean } from "../gitops/status.js";
import { checkTemporaryWorkspaces } from "../gitops/temporary-workspaces.js";
import { resolveHarnessRuntime } from "../harness/runtime.js";
import { composePipeline } from "../pipeline/composition.js";
import { installSignalHandlers } from "../runner/signals.js";
import { readCheckpoint } from "../state/checkpoint/read.js";
import type { RunCheckpoint, SnapshottedStage } from "../state/checkpoint/types.js";
import { acquireWorkspaceLock } from "../state/lock.js";
import type { LockHandle } from "../state/lock.js";
import { writeCheckpoint } from "../state/persist.js";
import {
  createRunDirectory,
  generateRunId,
  runsDirectory,
} from "../state/runs.js";
import { scanPendingQueues } from "../thread/queues.js";
import { resolveCurrentCheckoutWorkspace } from "../workspace/current-checkout.js";
import { inspectRunArtifacts } from "./run/preflight/inspect-artifacts.js";
import { loadRunPipeline } from "./run/preflight/load-pipeline.js";
import { loadRunProfile } from "./run/preflight/load-profile.js";
import { loadRunSettings } from "./run/preflight/load-settings.js";
import { resolveRunRoots } from "./run/preflight/resolve-roots.js";
import { resolveRunThread } from "./run/preflight/resolve-thread.js";
import type { RunArgs, RunDeps, RunPreflightRefusal } from "./run/types.js";

export type { RunDeps } from "./run/types.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function bullets(items: string[]): string {
  return items.map((item) => `  - ${item}`).join("\n");
}

type Allocated = {
  runId: string;
  runDir: string;
  lock: LockHandle;
  checkpoint: RunCheckpoint;
};

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

    // Compose the selected suffix, proving every selected stage can run from
    // the state at its position and resolving its concrete target.
    const composition = composePipeline(
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
    const prepared = composition.stages;

    // Preflight 8: one complete local binding per selected stage, from the
    // profile when it binds the stage and from settings otherwise.
    const bindings = resolveStageBindings(
      prepared.map((entry) => entry.stage.id),
      settings.stages,
      profileStages,
    );
    if (!bindings.ok) {
      return fail(bindings.errors.join("\n"));
    }

    // Composition accepted the entry point, so the first selected stage is
    // exactly the stage `--from` named.
    const fromStage = args.from === undefined ? null : prepared[0]!.stage.id;

    const stages: SnapshottedStage[] = prepared.map((entry, index) => ({
      ...entry.stage,
      resolvedTarget: entry.target,
      ...(entry.instructions !== undefined
        ? { instructions: entry.instructions }
        : {}),
      binding: bindings.bindings[index]!,
    }));

    // Preflight 9: the harness runtime. The developer toggle selects it, exactly
    // one adapter family is loaded, its own probe covers the distinct selected
    // harnesses, and a non-empty version is required for each.
    const harnessRuntime = await resolveHarnessRuntime(
      {
        kind: "new-run",
        env: deps.env,
        harnesses: stages.map((stage) => stage.binding.agent.harness),
        repoRoot: thread.repoRoot,
        stageIds: stages.map((stage) => stage.id),
        configRoot: () => ({ ok: true, configRoot: roots.configRoot }),
        onScriptedPrompt: (prompt) => {
          printScriptedResolvedPrompt(displayOptions, prompt);
        },
      },
      deps.harnessRuntime,
    );
    if (!harnessRuntime.ok) {
      printHarnessRuntimeRefusal(displayOptions, harnessRuntime.failure);
      return EXIT_FAILURE;
    }
    const observedHarnessVersions = harnessRuntime.versions;
    const harnessVersions: Record<string, string> = {};
    for (const [harness, version] of Object.entries(observedHarnessVersions)) {
      if (version !== undefined) {
        harnessVersions[harness] = version;
      }
    }

    // Preflight 10: the thread's temporary workspaces must be Git-safe. It comes
    // before the clean-worktree gate on purpose: leftover files in an unignored
    // workspace are themselves what makes the worktree dirty, and the
    // commit-or-revert advice that gate gives would commit work in progress into
    // the repository.
    const workspaces = await checkTemporaryWorkspaces(
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

    // Preflight 11: clean-worktree requirement (boundary status set).
    let clean: boolean;
    try {
      clean = await isWorktreeClean(thread.repoRoot);
    } catch (error) {
      return fail(
        `Cannot inspect the Git worktree at ${thread.repoRoot}: ${errorMessage(error)}`,
      );
    }
    if (!clean) {
      return fail(
        `The Git worktree at ${thread.repoRoot} is not clean. Commit what you want to keep or revert the rest before starting a run.`,
      );
    }

    // Preflight 12: both pending queues must be empty; a non-empty queue or a scan
    // error both fail preflight with no run.
    const preScan = await scanPendingQueues(thread.repoRoot, thread.threadRelPath);
    if (!preScan.ok) {
      return fail(preScan.message);
    }
    if (preScan.pendingFiles.length > 0) {
      return fail(
        `The thread has unresolved pending bundle files; resolve them before starting a run:\n${bullets(preScan.pendingFiles)}`,
      );
    }

    // Preflight 13: unfinished same-thread-run guard. An absent runs directory
    // means no runs and creates nothing; a corrupt sibling checkpoint warns
    // without blocking; a non-completed run recording this workspace AND thread
    // refuses.
    const runsDir = runsDirectory(roots.stateRoot);
    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(runsDir, { withFileTypes: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        return fail(`Cannot scan the runs directory ${runsDir}: ${errorMessage(error)}`);
      }
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const runDir = path.join(runsDir, entry.name);
      const existing = await readCheckpoint(runDir);
      if (!existing.ok) {
        deps.stderr.write(
          `warning: ignoring an unreadable run checkpoint at ${runDir}: ${existing.errors.join("; ")}\n`,
        );
        continue;
      }
      const cp = existing.checkpoint;
      if (
        cp.condition !== "completed" &&
        cp.workspace.path === thread.repoRoot &&
        cp.threadRelPath === thread.threadRelPath
      ) {
        return fail(
          `An unfinished run for this thread already exists: ${cp.runId} (condition: ${cp.condition}).\n` +
            `Resume it with:\n  antmay afk resume ${cp.runId}\n` +
            `If it is abandoned, delete its run directory to start fresh:\n  ${runDir}`,
        );
      }
    }

    // A signal that arrived before the initial checkpoint exists exits with the
    // conventional code and creates no run.
    const preAllocSig = signals.signaled();
    if (preAllocSig !== null) {
      return signals.exitCodeFor(preAllocSig);
    }

    // Allocation: only after every preflight passes. Resolve the canonical
    // workspace, then run one candidate-ID loop that keeps the lock, the durable
    // paths, and the under-lock queue recheck consistent.
    const workspace = await resolveCurrentCheckoutWorkspace(thread.repoRoot);
    const generateId =
      deps.generateId ?? (() => generateRunId(clock(), (n) => randomBytes(n)));

    const allocate = async (): Promise<
      { ok: true; allocated: Allocated } | { ok: false; code: number }
    > => {
      for (;;) {
        const candidate = generateId();

        const lockOutcome = await acquireWorkspaceLock(
          roots.stateRoot,
          workspace.path,
          candidate,
          clock(),
        );
        if (!lockOutcome.ok) {
          const record = lockOutcome.existingRecord.trim();
          return {
            ok: false,
            code: fail(
              `The workspace is already locked by another antmay run.\n` +
                `Lock file: ${lockOutcome.lockPath}\n` +
                (record.length > 0 ? `Lock record:\n${record}\n` : "") +
                `antmay never removes a lock automatically. Verify the recorded process is no longer running, then delete the lock file manually if it is stale.`,
            ),
          };
        }
        const lock = lockOutcome.handle;

        // Re-scan both queues under the lock. A file or scan error releases the
        // lock and exits 1 with no run.
        const lockedScan = await scanPendingQueues(thread.repoRoot, thread.threadRelPath);
        if (!lockedScan.ok || lockedScan.pendingFiles.length > 0) {
          await lock.release();
          if (!lockedScan.ok) {
            return { ok: false, code: fail(lockedScan.message) };
          }
          return {
            ok: false,
            code: fail(
              `The thread has unresolved pending bundle files; resolve them before starting a run:\n${bullets(lockedScan.pendingFiles)}`,
            ),
          };
        }

        const created = await createRunDirectory(roots.stateRoot, candidate);
        if (created.kind === "collision") {
          // Restart the loop with a fresh ID, re-acquiring the lock and
          // rechecking the queues under it.
          await lock.release();
          continue;
        }

        const now = clock().toISOString();
        const checkpoint: RunCheckpoint = {
          schemaVersion: 0,
          runId: candidate,
          executor: { pid: process.pid, version: VERSION },
          createdAt: now,
          updatedAt: now,
          repoRoot: thread.repoRoot,
          threadRelPath: thread.threadRelPath,
          workspace,
          dangerouslySkipPermissions: args.dangerouslySkipPermissions,
          pipelineName: document.name,
          pipelineSourcePath,
          profileSelection,
          ...(fromStage !== null ? { fromStage } : {}),
          stages,
          observedHarnessVersions,
          runtime: harnessRuntime.runtime,
          stageIndex: 0,
          condition: "ready",
          attempts: [],
          waiting: null,
        };
        try {
          await writeCheckpoint(created.runDir, checkpoint);
        } catch (error) {
          await lock.release();
          return {
            ok: false,
            code: fail(
              `Failed to write the initial checkpoint at ${path.join(created.runDir, "state.json")}: ${errorMessage(error)}`,
            ),
          };
        }

        return {
          ok: true,
          allocated: { runId: candidate, runDir: created.runDir, lock, checkpoint },
        };
      }
    };

    const allocation = await allocate();
    if (!allocation.ok) {
      return allocation.code;
    }
    const { runDir, lock, checkpoint } = allocation.allocated;

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
      workspacePath: workspace.path,
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
