import { mkdirSync, promises as fs, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";

import type { HarnessId } from "../config/settings.js";
import type { ProbeResult } from "../harness/probe.js";
import { EXIT_SIGHUP, EXIT_SIGINT, EXIT_SIGTERM } from "../cli/exit-codes.js";
import type { installSignalHandlers } from "../runner/signals.js";
import { SignalInterruption } from "../runner/signals.js";
import { acquireWorkspaceLock, locksDirectory } from "../state/lock.js";
import type { LockHandle } from "../state/lock.js";
import { readCheckpoint } from "../state/persist.js";
import { createRunDirectory, runsDirectory } from "../state/runs.js";
import {
  createFakeHarness,
  type FakeHarnessStep,
} from "../test-helpers/fake-harness.js";
import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import { runCommand, type RunDeps } from "./run.js";

/** An in-memory writable stream that accumulates everything written to it. */
class Capture extends Writable {
  chunks: string[] = [];
  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(chunk.toString());
    callback();
  }
  get text(): string {
    return this.chunks.join("");
  }
}

const fixtures: RepoFixture[] = [];
const tempDirs: string[] = [];
const heldLocks: LockHandle[] = [];

afterEach(async () => {
  while (heldLocks.length > 0) {
    const lock = heldLocks.pop();
    if (lock) await lock.release().catch(() => undefined);
  }
  while (fixtures.length > 0) {
    const fixture = fixtures.pop();
    if (fixture) await fixture.cleanup();
  }
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), prefix)));
  tempDirs.push(dir);
  return dir;
}

const VALID_SETTINGS = {
  afk: { defaults: { harness: "codex", model: "test-model" } },
};

const SIGNAL_EXIT: Record<string, number> = {
  SIGINT: EXIT_SIGINT,
  SIGTERM: EXIT_SIGTERM,
  SIGHUP: EXIT_SIGHUP,
};

/**
 * A `installSignalHandlers`-shaped fake that never touches `process`: `signaled`
 * returns whatever the supplied getter reports and `exitCodeFor` maps by the
 * conventional codes. The default getter reports no signal.
 */
function fakeSignals(
  signaled: () => NodeJS.Signals | null = () => null,
): typeof installSignalHandlers {
  return () => ({
    signaled,
    exitCodeFor: (sig) => SIGNAL_EXIT[sig] ?? EXIT_SIGINT,
    uninstall: () => undefined,
  });
}

/** Harness probe fake that reports a distinctive version for every request. */
const okProbe: RunDeps["probe"] = async (harnesses): Promise<ProbeResult> => {
  const versions: Partial<Record<HarnessId, string>> = {};
  for (const h of harnesses) versions[h] = `${h} 99.9.9`;
  return { ok: true, versions };
};

/** Harness probe fake that fails for every requested harness. */
const failingProbe: RunDeps["probe"] = async (harnesses): Promise<ProbeResult> => ({
  ok: false,
  failures: harnesses.map((h) => ({
    harness: h,
    binary: h === "codex" ? "codex" : "claude",
    reason: "executable not found on PATH",
  })),
});

type Harness = {
  configRoot: string;
  stateRoot: string;
  fixture: RepoFixture;
};

async function setup(
  settings: unknown = VALID_SETTINGS,
  writeSettings = true,
): Promise<Harness> {
  const fixture = await createRepoFixture({ thread: {} });
  fixtures.push(fixture);
  const configRoot = await tempDir("antmay-cfg-");
  const stateRoot = await tempDir("antmay-state-");
  if (writeSettings) {
    await fs.writeFile(
      path.join(configRoot, "settings.json"),
      JSON.stringify(settings, null, 2),
      "utf8",
    );
  }
  return { configRoot, stateRoot, fixture };
}

type RunResult = { code: number; out: string; err: string };

async function run(
  h: Harness,
  steps: FakeHarnessStep[],
  overrides: Partial<{
    recipe: string;
    thread: string;
    dangerouslySkipPermissions: boolean;
    probe: RunDeps["probe"];
    generateId: () => string;
    createAbortController: () => AbortController;
    installSignals: RunDeps["installSignals"];
  }> = {},
): Promise<RunResult> {
  const out = new Capture();
  const err = new Capture();
  const deps: RunDeps = {
    env: {
      ANTMAY_CONFIG_HOME: h.configRoot,
      ANTMAY_STATE_HOME: h.stateRoot,
      NO_COLOR: "1",
    },
    cwd: h.fixture.root,
    homedir: os.homedir(),
    invoker: createFakeHarness(steps),
    probe: overrides.probe ?? okProbe,
    stdout: out,
    stderr: err,
    isTTY: false,
    createAbortController: overrides.createAbortController,
    // Default to a no-op installer so tests never register real process handlers.
    installSignals: overrides.installSignals ?? fakeSignals(),
    generateId: overrides.generateId,
  };
  const code = await runCommand(
    {
      recipe: overrides.recipe ?? "standard",
      thread: overrides.thread ?? (h.fixture.threadFolder as string),
      dangerouslySkipPermissions: overrides.dangerouslySkipPermissions ?? false,
    },
    deps,
  );
  return { code, out: out.text, err: err.text };
}

async function runDirNames(stateRoot: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(runsDirectory(stateRoot), {
      withFileTypes: true,
    });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function lockNames(stateRoot: string): Promise<string[]> {
  try {
    return await fs.readdir(locksDirectory(stateRoot));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeThreadFile(
  fixture: RepoFixture,
  relative: string,
  content: string,
): Promise<void> {
  const target = path.join(fixture.threadPath as string, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

async function dropPendingDecision(
  fixture: RepoFixture,
  name: string,
): Promise<void> {
  const dir = path.join(fixture.threadPath as string, ".pending-decisions");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), "open decision", "utf8");
}

async function commitSubjects(fixture: RepoFixture): Promise<string[]> {
  const result = await fixture.git(["log", "--pretty=%s"]);
  return result.stdout.trim().split("\n");
}

async function soleCheckpointDir(stateRoot: string): Promise<string> {
  const names = await runDirNames(stateRoot);
  const withCheckpoint: string[] = [];
  for (const name of names) {
    const runDir = path.join(runsDirectory(stateRoot), name);
    if ((await readCheckpoint(runDir)).ok) withCheckpoint.push(runDir);
  }
  expect(withCheckpoint.length).toBe(1);
  return withCheckpoint[0]!;
}

/**
 * Standard-recipe script: the two authoring stages (spec, plan-strict) and the
 * first reconciliation stage change their boundary; review-spec, reconcile-plan,
 * and the implementation stage change nothing.
 */
function standardSteps(fixture: RepoFixture): FakeHarnessStep[] {
  return [
    { before: () => writeThreadFile(fixture, "spec.md", "# Spec\n") },
    { before: () => writeThreadFile(fixture, "spec.md", "# Spec v2\n") },
    {},
    { before: () => writeThreadFile(fixture, "plan.md", "# Plan\n") },
    {},
    {},
  ];
}

describe("runCommand — happy path (AC-1.3, AC-20.2)", () => {
  it("runs the standard recipe to completion, committing only changed authoring and reconciliation boundaries", async () => {
    const h = await setup();
    const folder = h.fixture.threadFolder as string;
    const before = (await commitSubjects(h.fixture)).length;

    const result = await run(h, standardSteps(h.fixture));

    expect(result.code).toBe(0);
    const subjects = await commitSubjects(h.fixture);
    expect(subjects.length).toBe(before + 3);
    expect(subjects.slice(0, 3)).toEqual([
      `docs(${folder}): plan`,
      `docs(${folder}): reconcile spec`,
      `docs(${folder}): spec`,
    ]);
    expect(subjects).not.toContain(`docs(${folder}): reconcile plan`);

    const runDir = await soleCheckpointDir(h.stateRoot);
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.condition).toBe("completed");
      expect(cp.checkpoint.stageIndex).toBe(6);
    }
    // Lock released on completion.
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("stores every selected-harness version outside the immutable stage snapshot", async () => {
    const h = await setup();
    await run(h, standardSteps(h.fixture));
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.observedHarnessVersions.codex).toBe("codex 99.9.9");
      expect(JSON.stringify(cp.checkpoint.stages)).not.toContain("99.9.9");
    }
  });

  it("keeps the created snapshot fixed even when settings are edited afterward (AC-4.2)", async () => {
    const h = await setup();
    await run(h, standardSteps(h.fixture));
    const runDir = await soleCheckpointDir(h.stateRoot);
    await fs.writeFile(
      path.join(h.configRoot, "settings.json"),
      JSON.stringify({ afk: { defaults: { harness: "codex", model: "changed-model" } } }),
      "utf8",
    );
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.stages.every((s) => s.profile.model === "test-model")).toBe(true);
    }
  });

  it("emits the unrestricted-permissions warning when the flag is set", async () => {
    const h = await setup();
    const result = await run(h, standardSteps(h.fixture), {
      dangerouslySkipPermissions: true,
    });
    expect(result.code).toBe(0);
    expect(result.err).toContain("dangerously-skip-permissions");
  });
});

describe("runCommand — preflight failures leave no run, no checkpoint, no lock (AC-7.1)", () => {
  async function expectClean(h: Harness, result: RunResult): Promise<void> {
    expect(result.code).toBe(1);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  }

  it("rejects an unknown recipe", async () => {
    const h = await setup();
    const result = await run(h, [], { recipe: "nope" });
    await expectClean(h, result);
    expect(result.err).toContain("Unknown recipe");
  });

  it("rejects an unresolvable thread", async () => {
    const h = await setup();
    const result = await run(h, [], { thread: "no-such-thread" });
    await expectClean(h, result);
  });

  it("rejects a missing settings file and points at documentation", async () => {
    const h = await setup(undefined, false);
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain("cli/README.md");
  });

  it("rejects an invalid settings document", async () => {
    const h = await setup({ afk: { defaults: { harness: "nope" } } });
    const result = await run(h, []);
    await expectClean(h, result);
  });

  it("rejects when a selected harness executable is unavailable", async () => {
    const h = await setup();
    const result = await run(h, [], { probe: failingProbe });
    await expectClean(h, result);
    expect(result.err).toContain("not found on PATH");
  });

  it("rejects a dirty worktree", async () => {
    const h = await setup();
    await fs.writeFile(path.join(h.fixture.root, "stray.txt"), "dirty\n", "utf8");
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain("not clean");
  });

  it("rejects a thread with a non-empty pending queue", async () => {
    const h = await setup();
    await dropPendingDecision(h.fixture, "d1.md");
    const result = await run(h, []);
    await expectClean(h, result);
  });

  it("rejects when a pending queue cannot be scanned", async () => {
    const h = await setup();
    // A committed regular file where the queue directory is expected makes the
    // scan's readdir fail with ENOTDIR while keeping the worktree clean.
    await fs.writeFile(
      path.join(h.fixture.threadPath as string, ".pending-decisions"),
      "not a directory",
      "utf8",
    );
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: block queue"]);
    const result = await run(h, []);
    await expectClean(h, result);
  });

  it("refuses when an unfinished run already exists for the same thread (AC-7.1, DR55)", async () => {
    const h = await setup();
    // First run pauses (BLOCKED) leaving a waiting checkpoint and no changes.
    const first = await run(h, [
      { outcome: { kind: "completed", finalText: "Outcome: BLOCKED" } },
    ]);
    expect(first.code).toBe(2);
    const existingId = (await runDirNames(h.stateRoot))[0]!;

    const second = await run(h, standardSteps(h.fixture));
    expect(second.code).toBe(1);
    expect(second.err).toContain(existingId);
    expect(second.err).toContain("antmay afk resume");
    // Still exactly the one paused run; the second created nothing.
    expect(await runDirNames(h.stateRoot)).toEqual([existingId]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("exits 1 on lock contention, printing the lock metadata and path", async () => {
    const h = await setup();
    const outcome = await acquireWorkspaceLock(
      h.stateRoot,
      h.fixture.root,
      "holder-run",
      new Date(),
    );
    if (!outcome.ok) throw new Error("expected to acquire the lock");
    heldLocks.push(outcome.handle);

    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(1);
    expect(result.err).toContain("already locked");
    expect(result.err).toContain(outcome.handle.lockPath);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    // Only the pre-acquired lock remains; the command never held its own.
    expect(await lockNames(h.stateRoot)).toHaveLength(1);
  });
});

describe("runCommand — allocation races (AC-7.4, AC-7.5)", () => {
  it("re-checks the queues under the lock and creates nothing when one fills mid-allocation", async () => {
    const h = await setup();
    // generateId runs after the initial preflight scan but before lock
    // acquisition and the under-lock recheck: dropping a pending file here
    // exercises the locked recheck race.
    const result = await run(h, standardSteps(h.fixture), {
      generateId: () => {
        void dropPendingDecisionSync(h.fixture, "race.md");
        return "queuerace-000000000000";
      },
    });
    expect(result.code).toBe(1);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("releases the first lock and regenerates on an ID collision (AC-7.5)", async () => {
    const h = await setup();
    // Pre-create the colliding run directory so createRunDirectory reports a
    // collision on the first candidate.
    await createRunDirectory(h.stateRoot, "collide-000000000000");

    let call = 0;
    const result = await run(h, standardSteps(h.fixture), {
      generateId: () => (call++ === 0 ? "collide-000000000000" : "fresh-111111111111"),
    });

    expect(result.code).toBe(0);
    const runDir = path.join(runsDirectory(h.stateRoot), "fresh-111111111111");
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) expect(cp.checkpoint.runId).toBe("fresh-111111111111");
    // The pre-created colliding directory holds no checkpoint of its own.
    const collide = await readCheckpoint(
      path.join(runsDirectory(h.stateRoot), "collide-000000000000"),
    );
    expect(collide.ok).toBe(false);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

describe("runCommand — non-blocking and pause behavior (AC-7.6, AC-1.3)", () => {
  it("warns about a corrupt sibling checkpoint without blocking creation (AC-7.6)", async () => {
    const h = await setup();
    const corrupt = await createRunDirectory(h.stateRoot, "corrupt-run-000000");
    if (corrupt.kind === "created") {
      await fs.writeFile(path.join(corrupt.runDir, "state.json"), "{ not json", "utf8");
    }
    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    expect(result.err).toContain("warning");
    expect(result.err).toContain("unreadable");
    // The new run was created alongside the corrupt sibling.
    expect((await runDirNames(h.stateRoot)).length).toBe(2);
  });

  it("exits 2 on a durable pause and prints the exact resume command", async () => {
    const h = await setup();
    const result = await run(h, [
      { outcome: { kind: "completed", finalText: "Outcome: BLOCKED — needs a human" } },
    ]);
    expect(result.code).toBe(2);
    const runId = (await runDirNames(h.stateRoot))[0]!;
    expect(result.out).toContain(`antmay afk resume ${runId}`);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

describe("runCommand — signal interruption (AC-17.1, AC-17.2)", () => {
  it("returns the signal exit code and creates no run when interrupted before allocation", async () => {
    const h = await setup();
    const result = await run(h, standardSteps(h.fixture), {
      installSignals: fakeSignals(() => "SIGINT"),
    });
    expect(result.code).toBe(EXIT_SIGINT);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("maps an active interruption to the signal exit code, not the durable-pause code", async () => {
    const h = await setup();
    const controller = new AbortController();
    const result = await run(
      h,
      [{ before: () => controller.abort(new SignalInterruption("SIGINT")), hangUntilAbort: true }],
      {
        createAbortController: () => controller,
        installSignals: fakeSignals(() => null),
      },
    );

    expect(result.code).toBe(EXIT_SIGINT);
    expect(result.code).not.toBe(2);
    const runDir = await soleCheckpointDir(h.stateRoot);
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.condition).toBe("waiting-for-user");
      expect(cp.checkpoint.waiting?.kind).toBe("interrupted");
    }
    // The lock is released before the command returns the signal exit code.
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

/** Synchronous pending-file drop for the generateId hook so the file is on disk
 * before the under-lock queue recheck runs. */
function dropPendingDecisionSync(fixture: RepoFixture, name: string): void {
  const dir = path.join(fixture.threadPath as string, ".pending-decisions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), "open decision", "utf8");
}
