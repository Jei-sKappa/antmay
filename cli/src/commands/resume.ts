import { promises as fs } from "node:fs";
import path from "node:path";

import { EXIT_FAILURE, EXIT_OK, EXIT_WAITING } from "../cli/exit-codes.js";
import { resolveRoots, resolveStateRoot } from "../config/roots.js";
import { createTerminalExecutionDisplay } from "../display/execution.js";
import type { DisplayOptions } from "../display/format.js";
import {
  printHarnessRuntimeRefusal,
  printTemporaryWorkspaceRefusal,
} from "../display/preflight.js";
import {
  printRunSummary,
  printScriptedModeStartup,
  printScriptedResolvedPrompt,
} from "../display/startup.js";
import { executeEngine } from "../execution/engine.js";
import { checkTemporaryWorkspaces } from "../gitops/temporary-workspaces.js";
import { resolveHarnessRuntime } from "../harness/runtime.js";
import { installSignalHandlers } from "../runner/signals.js";
import { readCheckpoint } from "../state/checkpoint/read.js";
import { acquireWorkspaceLock } from "../state/lock.js";
import { runDirectoryFor, runsDirectory } from "../state/runs.js";
import { resolveThreadTarget } from "../thread/resolve.js";
import { resolveCurrentCheckoutWorkspace } from "../workspace/current-checkout.js";
import type { CommandDeps } from "./deps.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Resume an existing `antmay afk run` from its durable checkpoint.
 *
 * The preflight is read-only with respect to the checkpoint and knows nothing
 * about what the run was paused for: it resolves only the state root — never a
 * config root, settings, or pipeline definitions — locates the run, validates and
 * rejects a completed checkpoint, revalidates the recorded thread, repository, and
 * workspace, resolves the run's immutable harness runtime, requires the thread's
 * temporary workspaces to be Git-safe, and acquires the recorded workspace lock.
 * Every refusal returns `1` with the checkpoint byte-for-byte unchanged.
 *
 * Under that lock, the validated cursor goes to `executeEngine` exactly as it was
 * found. Recovering it, and every durable transition that follows, belongs to the
 * engine; this command maps the structured result to the process exit code exactly
 * as `run` does. Signal handlers are installed at entry and uninstalled on every
 * ordinary return.
 */
export async function resumeCommand(
  args: { runId: string },
  deps: CommandDeps,
): Promise<number> {
  const clock = deps.clock ?? (() => new Date());
  const displayOptions: DisplayOptions = {
    stdout: deps.stdout,
    stderr: deps.stderr,
    color: deps.color,
  };
  const display = createTerminalExecutionDisplay(displayOptions);

  const fail = (message: string): number => {
    deps.stderr.write(`${message}\n`);
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
    const checkpoint = loaded.checkpoint;
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
    sig = signalCode();
    if (sig !== null) return sig;

    const currentHarness =
      checkpoint.stages[checkpoint.stageIndex]!.binding.agent.harness;

    // The run's harness runtime is fixed at allocation, so the developer toggle
    // may only agree with it. Both directions are fail-closed and refuse here —
    // before the probe, the lock, and any mutation. Only the current stage's
    // snapshotted harness is probed, and a scripted run's live scenario is
    // reread and revalidated against the complete snapshotted stage set.
    const harnessRuntime = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: args.runId,
        runtime: checkpoint.runtime,
        env: deps.env,
        harnesses: [currentHarness],
        repoRoot,
        stageIds: checkpoint.stages.map((snapshotted) => snapshotted.id),
        // Consulted in scripted mode only, so a config-root problem never blocks
        // an otherwise state-only resume.
        configRoot: () => {
          const roots = resolveRoots(deps.env, deps.homedir);
          return roots.ok
            ? { ok: true, configRoot: roots.configRoot }
            : { ok: false, message: roots.message };
        },
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
    for (const [harness, version] of Object.entries(harnessRuntime.versions)) {
      if (version !== undefined) {
        harnessVersions[harness] = version;
      }
    }
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
    // condition is: the worktree exemptions the engine applies do not extend here.
    // Leftover files in an unignored workspace are themselves what makes the
    // worktree dirty, and the commit-or-revert advice the engine's clean-worktree
    // rule gives would commit work in progress into the repository. This runs
    // before lock acquisition and every checkpoint mutation.
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

    try {
      // A signal that arrived before any mutation releases the lock (in finally)
      // and returns its conventional code with the durable cursor unchanged.
      sig = signalCode();
      if (sig !== null) return sig;

      // Startup summary; re-print the unrestricted warning when the persisted
      // permission choice is unrestricted.
      if (harnessRuntime.scenarioPath !== undefined) {
        printScriptedModeStartup(displayOptions, harnessRuntime.scenarioPath);
      }
      // Every value here comes from the checkpoint, so a resume renders the
      // execution the run was allocated with whatever later happened to the
      // pipeline, profile, or settings documents it was resolved from.
      printRunSummary(displayOptions, {
        runId: checkpoint.runId,
        pipelineName: checkpoint.pipelineName,
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

      const result = await executeEngine({
        entry: { kind: "resume", checkpoint },
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
        case "interrupted":
          return signals.exitCodeFor(result.signal);
        case "refused":
          return fail(result.message);
        case "fatal-checkpoint":
          return fail(
            `A fatal checkpoint error ended the resume before it could pause safely: ${result.message}`,
          );
      }
    } finally {
      await lock.release();
    }
  } finally {
    signals.uninstall();
  }
}
