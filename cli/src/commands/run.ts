import { randomBytes } from "node:crypto";
import type { Dirent } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

import { EXIT_FAILURE, EXIT_OK, EXIT_WAITING } from "../cli/exit-codes.js";
import { VERSION } from "../cli/help.js";
import { resolveRoots } from "../config/roots.js";
import { loadSettings } from "../config/settings.js";
import type { HarnessId } from "../config/settings.js";
import { createTerminalDisplay, printRunSummary } from "../display/terminal.js";
import type { DisplayOptions } from "../display/terminal.js";
import { isWorktreeClean } from "../gitops/status.js";
import type { probeHarnessExecutables } from "../harness/probe.js";
import type { HarnessInvoker } from "../harness/types.js";
import { resolveStageProfiles } from "../recipe/profiles.js";
import { builtInRecipes, knownStageIds } from "../recipe/standard.js";
import { resolveStageTarget } from "../recipe/targets.js";
import { executeRun } from "../runner/runner.js";
import type { RunCheckpoint, SnapshottedStage } from "../state/checkpoint.js";
import { acquireWorkspaceLock } from "../state/lock.js";
import type { LockHandle } from "../state/lock.js";
import { readCheckpoint, writeCheckpoint } from "../state/persist.js";
import {
  createRunDirectory,
  generateRunId,
  runsDirectory,
} from "../state/runs.js";
import { scanPendingQueues } from "../thread/queues.js";
import { resolveThreadTarget } from "../thread/resolve.js";
import { resolveCurrentCheckoutWorkspace } from "../workspace/current-checkout.js";

/**
 * The injected dependency bag `runCommand` runs against. `env`, `cwd`, and
 * `homedir` root every path and settings decision; `invoker` and `probe` are the
 * harness seams the end-to-end tests fake; the streams, `isTTY`, and derived
 * `NO_COLOR` drive the display; `signal` aborts the in-flight run. `clock`
 * overrides the wall clock in tests, and `generateId` overrides run-ID
 * generation so a test can force a queue race or an ID collision deterministically.
 */
export type RunDeps = {
  env: NodeJS.ProcessEnv;
  cwd: string;
  homedir: string | undefined;
  invoker: HarnessInvoker;
  probe: typeof probeHarnessExecutables;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  isTTY: boolean;
  clock?: () => Date;
  signal: AbortSignal;
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
 * Run a full `antmay afk run`: the ordered preflight, allocation under the
 * workspace lock, the initial `ready` checkpoint, and delegation to the stage
 * runner. Returns the process exit code. Every preflight failure prints to
 * `stderr` and returns `1`, leaving no run directory, no checkpoint, and no held
 * lock; the mapped runner outcomes are `0` (completed), `2` (durable pause), and
 * `1` (fatal checkpoint).
 */
export async function runCommand(
  args: { recipe: string; thread: string; dangerouslySkipPermissions: boolean },
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

  // Preflight 1: exact built-in recipe resolution.
  const recipe = builtInRecipes[args.recipe];
  if (recipe === undefined) {
    const known = Object.keys(builtInRecipes).sort().join(", ");
    return fail(`Unknown recipe "${args.recipe}". Known recipes: ${known}.`);
  }

  // Preflight 2: thread resolution and validation (owning Git root, active
  // location, seed, and decision log).
  const thread = await resolveThreadTarget(args.thread, deps.cwd);
  if (!thread.ok) {
    return fail(thread.message);
  }

  // Preflight 3: roots, settings, and every resolved stage target and profile.
  const roots = resolveRoots(deps.env, deps.homedir);
  if (!roots.ok) {
    return fail(roots.message);
  }
  const settings = loadSettings(roots.configRoot, knownStageIds(builtInRecipes));
  if (!settings.ok) {
    return fail(settings.errors.join("\n"));
  }
  const profilesResult = resolveStageProfiles(recipe, settings.settings);
  if (!profilesResult.ok) {
    return fail(profilesResult.errors.join("\n"));
  }
  const stages: SnapshottedStage[] = [];
  const targetErrors: string[] = [];
  recipe.stages.forEach((stage, index) => {
    const target = resolveStageTarget(stage.target, thread.threadRelPath);
    if (!target.ok) {
      targetErrors.push(`Stage "${stage.id}": ${target.error}`);
      return;
    }
    stages.push({
      ...stage,
      profile: profilesResult.profiles[index]!,
      resolvedTarget: target.path,
    });
  });
  if (targetErrors.length > 0) {
    return fail(targetErrors.join("\n"));
  }

  // Preflight 4: harness-executable preflight over the distinct selected
  // harnesses; require a non-empty version for each and keep the observed lines.
  const distinct = [...new Set(stages.map((stage) => stage.profile.harness))];
  const probeResult = await deps.probe(distinct, thread.repoRoot);
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

  // Preflight 5: clean-worktree requirement (boundary status set).
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

  // Preflight 6: both pending queues must be empty; a non-empty queue or a scan
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

  // Preflight 7: unfinished same-thread-run guard. An absent runs directory
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
        schemaVersion: 1,
        runId: candidate,
        executor: { pid: process.pid, version: VERSION },
        createdAt: now,
        updatedAt: now,
        repoRoot: thread.repoRoot,
        threadRelPath: thread.threadRelPath,
        workspace,
        dangerouslySkipPermissions: args.dangerouslySkipPermissions,
        recipeName: recipe.name,
        stages,
        observedHarnessVersions,
        stageIndex: 0,
        condition: "ready",
        attempts: [],
        waiting: null,
        gitCursor: { stageIndex: 0, headAtStageEntry: null, observedHead: null },
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

  // The initial checkpoint exists. Print the startup summary (with the
  // unrestricted warning when applicable), drive the run, map the runner
  // outcome to an exit code, and release the lock unconditionally.
  printRunSummary(displayOptions, {
    runId: checkpoint.runId,
    recipeName: recipe.name,
    threadRelPath: thread.threadRelPath,
    workspacePath: workspace.path,
    dangerouslySkipPermissions: args.dangerouslySkipPermissions,
    stageCount: stages.length,
  });

  const display = createTerminalDisplay(displayOptions);
  try {
    const result = await executeRun({
      checkpoint,
      runDir,
      stateRoot: roots.stateRoot,
      lock,
      invoker: deps.invoker,
      display,
      harnessVersions,
      signal: deps.signal,
      clock: deps.clock,
    });
    if (result.status === "completed") {
      return EXIT_OK;
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
}
