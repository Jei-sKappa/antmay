import { randomBytes } from "node:crypto";
import type { Dirent } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

import { EXIT_FAILURE, EXIT_OK, EXIT_WAITING } from "../cli/exit-codes.js";
import { VERSION } from "../cli/help.js";
import {
  loadExecutionProfile,
  loadStageSettings,
  resolveStageBindings,
} from "../config/execution.js";
import type { HarnessId, StageBindingMap } from "../config/execution.js";
import { resolveDocumentReference } from "../config/references.js";
import { resolveRoots } from "../config/roots.js";
import {
  createTerminalDisplay,
  printRunSummary,
  printScriptedModeStartup,
  printScriptedResolvedPrompt,
} from "../display/terminal.js";
import type { DisplayOptions } from "../display/terminal.js";
import { isWorktreeClean } from "../gitops/status.js";
import { checkTemporaryWorkspaces } from "../gitops/temporary-workspaces.js";
import type { probeHarnessExecutables } from "../harness/probe.js";
import { createScriptedInvoker } from "../harness/scripted/invoker.js";
import { probeScriptedHarnessExecutables } from "../harness/scripted/probe.js";
import {
  interpretScriptedHarnessToggle,
  loadScriptedScenario,
} from "../harness/scripted/scenario.js";
import type { HarnessInvoker } from "../harness/types.js";
import { composePipeline } from "../pipeline/composition.js";
import { loadPipelineDocument } from "../pipeline/documents.js";
import { executeRun } from "../runner/runner.js";
import { installSignalHandlers } from "../runner/signals.js";
import type {
  ProfileSelection,
  RunCheckpoint,
  SnapshottedStage,
} from "../state/checkpoint.js";
import { acquireWorkspaceLock } from "../state/lock.js";
import type { LockHandle } from "../state/lock.js";
import { readCheckpoint, writeCheckpoint } from "../state/persist.js";
import {
  createRunDirectory,
  generateRunId,
  runsDirectory,
} from "../state/runs.js";
import { inspectArtifactState } from "../thread/artifacts.js";
import { scanPendingQueues } from "../thread/queues.js";
import { resolveThreadTarget } from "../thread/resolve.js";
import { resolveCurrentCheckoutWorkspace } from "../workspace/current-checkout.js";

/**
 * The injected dependency bag `runCommand` runs against. `env`, `cwd`, and
 * `homedir` root every path and settings decision; `invoker` and `probe` are the
 * harness seams the end-to-end tests fake; the streams, `isTTY`, and derived
 * `NO_COLOR` drive the display. `createAbortController` and `installSignals` are
 * the signal-ownership seams: production defaults to a fresh controller and the
 * real handler installer, while tests inject controlled implementations without
 * emitting real process signals. `clock` overrides the wall clock in tests, and
 * `generateId` overrides run-ID generation so a test can force a queue race or
 * an ID collision deterministically.
 */
export type RunDeps = {
  env: NodeJS.ProcessEnv;
  cwd: string;
  homedir: string | undefined;
  invoker: HarnessInvoker;
  probe: typeof probeHarnessExecutables;
  createScriptedInvoker: typeof createScriptedInvoker;
  scriptedProbe: typeof probeScriptedHarnessExecutables;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  isTTY: boolean;
  clock?: () => Date;
  createAbortController?: () => AbortController;
  installSignals?: typeof installSignalHandlers;
  generateId?: () => string;
};

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
 * checkpoint, and delegation to the stage runner. Returns the process exit code.
 * Every preflight failure prints to `stderr` and returns `1`, leaving no run
 * directory, no checkpoint, and no held lock; the mapped runner outcomes are `0`
 * (completed), `2` (durable pause), `1` (fatal checkpoint), and the conventional
 * signal exit code (interruption). Handlers are uninstalled on every ordinary
 * return path.
 */
export async function runCommand(
  args: {
    pipeline: string;
    thread: string;
    from?: string;
    profile?: string;
    dangerouslySkipPermissions: boolean;
  },
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

  const fail = (message: string): number => {
    deps.stderr.write(`${message}\n`);
    return EXIT_FAILURE;
  };

  /**
   * Report a rejected loadable document. Field-level schema problems name no
   * file of their own, and three different documents can produce them, so the
   * one place that knows every resolved source is where the source is named.
   */
  const failDocument = (
    label: string,
    sourcePath: string,
    errors: string[],
  ): number => fail(`The ${label} at ${sourcePath} was rejected:\n${bullets(errors)}`);

  // Install the signal handlers before preflight so a Ctrl-C at any point drives
  // the graceful stop; uninstall them on every ordinary return path.
  const controller = (deps.createAbortController ?? (() => new AbortController()))();
  const signals = (deps.installSignals ?? installSignalHandlers)({
    abort: controller,
    stderr: deps.stderr,
  });

  try {
    const toggleResult = interpretScriptedHarnessToggle(deps.env);
    if (toggleResult.mode === "error") {
      return fail(toggleResult.message);
    }
    const useScripted = toggleResult.mode === "scripted";

    // Preflight 1: root resolution. Every reference below is resolved against
    // the config root or the invocation working directory, so nothing can be
    // read before the roots are known.
    const roots = resolveRoots(deps.env, deps.homedir);
    if (!roots.ok) {
      return fail(roots.message);
    }

    // Preflight 2: the required pipeline document. Its reference is resolved by
    // syntax alone, then exactly that source is read and strictly validated —
    // in full, before `--from` selects anything from it.
    const pipelineRef = resolveDocumentReference(
      args.pipeline,
      "pipeline",
      roots.configRoot,
      deps.cwd,
    );
    if (!pipelineRef.ok) {
      return fail(pipelineRef.message);
    }
    const pipelineSourcePath = pipelineRef.reference.sourcePath;
    const pipelineLoad = loadPipelineDocument(pipelineSourcePath);
    if (!pipelineLoad.ok) {
      return failDocument("pipeline document", pipelineSourcePath, pipelineLoad.errors);
    }
    const document = pipelineLoad.document;

    // Preflight 3: the optional execution profile. The declared name comes from
    // the loaded document and the source provenance from the resolved
    // reference, because the two are independent identities.
    let profileStages: StageBindingMap | null = null;
    let profileSelection: ProfileSelection = { kind: "settings-only" };
    if (args.profile !== undefined) {
      const profileRef = resolveDocumentReference(
        args.profile,
        "profile",
        roots.configRoot,
        deps.cwd,
      );
      if (!profileRef.ok) {
        return fail(profileRef.message);
      }
      const profileLoad = loadExecutionProfile(profileRef.reference.sourcePath);
      if (!profileLoad.ok) {
        return failDocument(
          "execution profile",
          profileRef.reference.sourcePath,
          profileLoad.errors,
        );
      }
      profileStages = profileLoad.profile.stages;
      profileSelection = {
        kind: "profile",
        name: profileLoad.profile.name,
        sourcePath: profileRef.reference.sourcePath,
      };
    }

    // Preflight 4: the optional settings file. A missing file is an empty stage
    // map, so a complete profile runs without one.
    const settings = loadStageSettings(roots.configRoot);
    if (!settings.ok) {
      return failDocument("settings document", settings.sourcePath, settings.errors);
    }

    // Preflight 5: thread resolution and validation (owning Git root, active
    // location, seed, and decision log).
    const thread = await resolveThreadTarget(args.thread, deps.cwd);
    if (!thread.ok) {
      return fail(thread.message);
    }

    // Preflight 6: the thread's concrete artifact state, which is the only
    // starting point composition simulates from.
    const inspection = await inspectArtifactState(
      thread.repoRoot,
      thread.threadRelPath,
    );
    if (!inspection.ok) {
      return fail(inspection.message);
    }

    // Preflight 7: compose the selected suffix, proving every selected stage can
    // run from the state at its position and resolving its concrete target.
    const composition = composePipeline(
      document,
      inspection.state,
      thread.threadRelPath,
      args.from ?? null,
    );
    if (!composition.ok) {
      return fail(composition.errors.join("\n"));
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

    // Preflight 9: the scripted scenario, validated against exactly the selected
    // stage IDs.
    let invoker = deps.invoker;
    let probe = deps.probe;
    let scenarioPath: string | undefined;
    if (useScripted) {
      const loaded = await loadScriptedScenario(
        roots.configRoot,
        stages.map((stage) => stage.id),
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

    // Preflight 10: harness-executable preflight over the distinct selected
    // harnesses; require a non-empty version for each and keep the observed lines.
    const distinct = [
      ...new Set(stages.map((stage) => stage.binding.agent.harness)),
    ];
    const probeResult = await probe(distinct, thread.repoRoot);
    if (!probeResult.ok) {
      const lines = probeResult.failures.map(
        (failure) => `${failure.harness} (${failure.binary}): ${failure.reason}`,
      );
      return fail(`Harness-executable preflight failed:\n${bullets(lines)}`);
    }
    const observedHarnessVersions: Partial<Record<HarnessId, string>> = {};
    const harnessVersions: Record<string, string> = {};
    const missingVersions: HarnessId[] = [];
    for (const harness of distinct) {
      const version = probeResult.versions[harness];
      if (version === undefined || version.length === 0) {
        missingVersions.push(harness);
      } else {
        observedHarnessVersions[harness] = version;
        harnessVersions[harness] = version;
      }
    }
    if (missingVersions.length > 0) {
      return fail(
        `Harness-executable preflight failed: no version reported for ${missingVersions.join(", ")}.`,
      );
    }

    // Preflight 11: the thread's temporary workspaces must be Git-safe. It comes
    // before the clean-worktree gate on purpose: leftover files in an unignored
    // workspace are themselves what makes the worktree dirty, and the
    // commit-or-revert advice that gate gives would commit work in progress into
    // the repository.
    const workspaces = await checkTemporaryWorkspaces(
      thread.repoRoot,
      thread.threadRelPath,
    );
    if (!workspaces.ok) {
      return fail(workspaces.message);
    }

    // Preflight 12: clean-worktree requirement (boundary status set).
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

    // Preflight 13: both pending queues must be empty; a non-empty queue or a scan
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

    // Preflight 14: unfinished same-thread-run guard. An absent runs directory
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
          stageIndex: 0,
          condition: "ready",
          attempts: [],
          waiting: null,
          gitCursor: { stageIndex: 0, headAtStageEntry: null, observedHead: null },
          ...(useScripted ? { startedScripted: true as const } : {}),
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
    // unrestricted warning when applicable), drive the run, map the runner
    // outcome to an exit code, and release the lock unconditionally.
    if (scenarioPath !== undefined) {
      printScriptedModeStartup(displayOptions, scenarioPath);
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

    const display = createTerminalDisplay(displayOptions);
    try {
      const result = await executeRun({
        checkpoint,
        runDir,
        stateRoot: roots.stateRoot,
        lock,
        invoker,
        display,
        harnessVersions,
        signal: controller.signal,
        clock: deps.clock,
      });
      if (result.status === "completed") {
        return EXIT_OK;
      }
      // A signal interruption maps to the conventional signal exit code, never to
      // the ordinary durable-pause code, even though a waiting checkpoint persists.
      if (result.status === "interrupted") {
        return signals.exitCodeFor(result.signal);
      }
      if (result.status === "paused") {
        return EXIT_WAITING;
      }
      deps.stderr.write(
        `A fatal checkpoint error ended the run before it could pause safely: ${result.message}\n`,
      );
      return EXIT_FAILURE;
    } finally {
      await lock.release();
    }
  } finally {
    signals.uninstall();
  }
}
