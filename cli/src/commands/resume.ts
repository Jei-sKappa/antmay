import { EXIT_FAILURE, EXIT_OK, EXIT_WAITING } from "../cli/exit-codes.js";
import { createTerminalExecutionDisplay } from "../display/execution.js";
import type { DisplayOptions } from "../display/format.js";
import {
  printHarnessRuntimeRefusal,
  printTemporaryWorkspaceRefusal,
} from "../display/preflight.js";
import {
  printRunSummary,
  printSimulatedModeStartup,
  printSimulatedResolvedPrompt,
} from "../display/startup.js";
import { executeEngine } from "../execution/engine.js";
import { installSignalHandlers } from "../runner/signals.js";
import type { CommandDeps } from "./deps.js";
import { acquireResumeLock } from "./resume/acquire-lock.js";
import { checkResumeTemporaryWorkspaces } from "./resume/preflight/check-temporary-workspaces.js";
import { locateResumeRun } from "./resume/preflight/locate-run.js";
import { loadResumeCheckpoint } from "./resume/preflight/load-checkpoint.js";
import { requireIncompleteRun } from "./resume/preflight/require-incomplete.js";
import { resolveResumeRuntime } from "./resume/preflight/resolve-runtime.js";
import { resolveResumeStateRoot } from "./resume/preflight/resolve-state-root.js";
import { revalidateResumeThread } from "./resume/preflight/revalidate-thread.js";
import { validateResumeWorkspace } from "./resume/preflight/validate-workspace.js";
import type { ResumeArgs, ResumePreflightRefusal } from "./resume/types.js";

/**
 * Resume an existing `antmay afk run` from its durable checkpoint.
 *
 * Read-only preparation, in order: resolve the state root; locate the run;
 * load and validate the checkpoint; refuse a completed run; revalidate the
 * recorded thread; resolve the immutable harness runtime; require the
 * canonical current-checkout workspace to match the recorded identity; require
 * the thread's temporary workspaces to be Git-safe; then acquire the recorded
 * workspace lock. Signal observations sit after location, after load, after
 * thread revalidation, after runtime resolution, after workspace validation,
 * immediately before lock acquisition, and immediately after a successful
 * acquisition. Every refusal returns `1` with the checkpoint byte-for-byte
 * unchanged.
 *
 * Under that lock, the validated cursor goes to `executeEngine` exactly as it was
 * found. Recovering it, and every durable transition that follows, belongs to the
 * engine; this command maps the structured result to the process exit code exactly
 * as `run` does. Signal handlers are installed at entry and uninstalled on every
 * ordinary return.
 */
export async function resumeCommand(
  args: ResumeArgs,
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

  const refuse = (refusal: ResumePreflightRefusal): number => {
    return fail(refusal.message);
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
    const stateRootResult = resolveResumeStateRoot(deps.env, deps.homedir);
    if (!stateRootResult.ok) {
      return refuse(stateRootResult.refusal);
    }
    const { stateRoot } = stateRootResult;

    // Locate the run directory. An absent runs directory or run directory is an
    // unknown run, never a search for a replacement.
    const located = await locateResumeRun(stateRoot, args.runId);
    if (!located.ok) {
      return refuse(located.refusal);
    }
    const { runDir } = located;
    let sig = signalCode();
    if (sig !== null) return sig;

    // Load and validate the checkpoint.
    const loaded = await loadResumeCheckpoint(runDir, args.runId);
    if (!loaded.ok) {
      return refuse(loaded.refusal);
    }
    const { checkpoint: loadedCheckpoint } = loaded;
    sig = signalCode();
    if (sig !== null) return sig;

    // A completed run reports that fact and exits 1.
    const incomplete = requireIncompleteRun(loadedCheckpoint, args.runId);
    if (!incomplete.ok) {
      return refuse(incomplete.refusal);
    }
    const { checkpoint, repoRoot, threadRelPath } = incomplete;

    // Verify the recorded repository still resolves to the Git worktree top level
    // containing the recorded active thread, with non-empty seed/decisions.
    const thread = await revalidateResumeThread(
      repoRoot,
      threadRelPath,
      args.runId,
      deps.cwd,
    );
    if (!thread.ok) {
      return refuse(thread.refusal);
    }
    sig = signalCode();
    if (sig !== null) return sig;

    // The run's harness runtime is fixed at allocation, so the developer toggle
    // may only agree with it. Both directions are fail-closed and refuse here —
    // before the probe, the lock, and any mutation. Only the current stage's
    // snapshotted harness is probed, and a simulated run's live scenario is
    // reread and revalidated against the complete snapshotted stage set.
    const harnessRuntime = await resolveResumeRuntime(
      checkpoint,
      args.runId,
      deps.env,
      deps.homedir,
      repoRoot,
      deps.harnessRuntime,
      (prompt) => {
        printSimulatedResolvedPrompt(displayOptions, prompt);
      },
    );
    if (!harnessRuntime.ok) {
      printHarnessRuntimeRefusal(displayOptions, harnessRuntime.failure);
      return EXIT_FAILURE;
    }
    const { invoker, harnessVersions } = harnessRuntime;
    sig = signalCode();
    if (sig !== null) return sig;

    // Resolve the current-checkout workspace and require its canonical path to
    // match the snapshotted workspace identity.
    const workspace = await validateResumeWorkspace(
      repoRoot,
      checkpoint.workspace.path,
    );
    if (!workspace.ok) {
      return refuse(workspace.refusal);
    }
    sig = signalCode();
    if (sig !== null) return sig;

    // The thread's temporary workspaces must be Git-safe, whatever the durable
    // condition is. This runs before lock acquisition and every checkpoint
    // mutation.
    const workspaces = await checkResumeTemporaryWorkspaces(
      repoRoot,
      threadRelPath,
    );
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
    const lockOutcome = await acquireResumeLock(
      stateRoot,
      checkpoint.workspace.path,
      checkpoint.runId,
      clock,
    );
    if (!lockOutcome.ok) {
      const record = lockOutcome.refusal.existingRecord.trim();
      return fail(
        `The workspace is already locked by another antmay run.\n` +
          `Lock file: ${lockOutcome.refusal.lockPath}\n` +
          (record.length > 0 ? `Lock record:\n${record}\n` : "") +
          `antmay never removes a lock automatically. Verify the recorded process is no longer running, then delete the lock file manually if it is stale before resuming.`,
      );
    }
    const lock = lockOutcome.lock;

    try {
      // A signal that arrived before any mutation releases the lock (in finally)
      // and returns its conventional code with the durable cursor unchanged.
      sig = signalCode();
      if (sig !== null) return sig;

      // Startup summary; re-print the unrestricted warning when the persisted
      // permission choice is unrestricted.
      if (harnessRuntime.scenarioPath !== undefined) {
        printSimulatedModeStartup(displayOptions, harnessRuntime.scenarioPath);
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

      const result = await (deps.runEngine ?? executeEngine)({
        entry: { kind: "resume", checkpoint },
        runDir,
        invoker,
        display,
        harnessVersions,
        signal: controller.signal,
        clock,
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
