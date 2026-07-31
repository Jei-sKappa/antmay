import { mkdirSync, promises as fs, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";

import { afterAll, describe, expect, it } from "vitest";

import { EXIT_SIGINT } from "../cli/exit-codes.js";
import type { HarnessId } from "../config/execution.js";
import type { ProbeResult } from "../harness/probe.js";
import { createScriptedInvoker } from "../harness/scripted/invoker.js";
import { probeScriptedHarnessExecutables } from "../harness/scripted/probe.js";
import {
  SCRIPTED_HARNESS_TOGGLE_VAR,
  SCRIPTED_SCENARIO_FILENAME,
} from "../harness/scripted/scenario.js";
import type { installSignalHandlers } from "../runner/signals.js";
import { SignalInterruption } from "../runner/signals.js";
import type { RunCheckpoint } from "../state/checkpoint.js";
import { acquireWorkspaceLock, locksDirectory } from "../state/lock.js";
import type { LockHandle } from "../state/lock.js";
import { readCheckpoint, writeCheckpoint } from "../state/persist.js";
import { runDirectoryFor, runsDirectory } from "../state/runs.js";
import {
  createFakeHarness,
  type FakeHarness,
  type FakeHarnessStep,
} from "../test-helpers/fake-harness.js";
import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import { runCommand, type RunDeps } from "./run.js";
import { resumeCommand } from "./resume.js";

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

/**
 * Temporary resources are collected for the whole file and released once every
 * case has finished. The cases here run concurrently, so nothing may be torn
 * down between tests: a per-test hook would reach into a repository or state
 * root another in-flight case is still using.
 */
const fixtures: RepoFixture[] = [];
const tempDirs: string[] = [];
const heldLocks: LockHandle[] = [];

afterAll(async () => {
  for (const lock of heldLocks) await lock.release().catch(() => undefined);
  for (const fixture of fixtures) await fixture.cleanup().catch(() => undefined);
  for (const dir of tempDirs) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), prefix)));
  tempDirs.push(dir);
  return dir;
}

/** The stage IDs the fixture's `standard` pipeline document selects, in order. */
const STANDARD_STAGE_IDS = [
  "spec",
  "reconcile-spec",
  "review-spec",
  "plan-strict",
  "reconcile-plan",
  "implement-plan-with-subagents",
] as const;

/** A pipeline document selecting the Standard stages under the name `standard`. */
function pipelineDocument(): Record<string, unknown> {
  return {
    schemaVersion: 0,
    name: "standard",
    stages: STANDARD_STAGE_IDS.map((stage) => ({ stage })),
  };
}

/**
 * A settings document binding every Standard stage to one codex/test-model
 * agent, with `overrides` replacing whole bindings stage by stage.
 */
function settingsFor(
  overrides: Record<string, unknown> = {},
  model = "test-model",
): Record<string, unknown> {
  return {
    afk: {
      stages: {
        ...Object.fromEntries(
          STANDARD_STAGE_IDS.map((stage) => [
            stage,
            { agent: { harness: "codex", model } },
          ]),
        ),
        ...overrides,
      },
    },
  };
}

function fakeSignals(
  signaled: () => NodeJS.Signals | null = () => null,
): typeof installSignalHandlers {
  return () => ({
    signaled,
    exitCodeFor: () => EXIT_SIGINT,
    uninstall: () => undefined,
  });
}

const okProbe: RunDeps["probe"] = async (harnesses): Promise<ProbeResult> => {
  const versions: Partial<Record<HarnessId, string>> = {};
  for (const h of harnesses) versions[h] = `${h} 99.9.9`;
  return { ok: true, versions };
};

type Harness = { configRoot: string; stateRoot: string; fixture: RepoFixture };

async function setup(settings: unknown = settingsFor()): Promise<Harness> {
  const fixture = await createRepoFixture({ thread: {} });
  fixtures.push(fixture);
  const configRoot = await tempDir("antmay-cfg-");
  const stateRoot = await tempDir("antmay-state-");
  await fs.writeFile(
    path.join(configRoot, "settings.json"),
    JSON.stringify(settings, null, 2),
    "utf8",
  );
  await fs.mkdir(path.join(configRoot, "pipelines"), { recursive: true });
  await fs.writeFile(
    path.join(configRoot, "pipelines", "standard.json"),
    JSON.stringify(pipelineDocument(), null, 2),
    "utf8",
  );
  return { configRoot, stateRoot, fixture };
}

type CmdResult = { code: number; out: string; err: string; invoker: FakeHarness };

function baseEnv(h: Harness): NodeJS.ProcessEnv {
  return {
    ANTMAY_CONFIG_HOME: h.configRoot,
    ANTMAY_STATE_HOME: h.stateRoot,
    NO_COLOR: "1",
  };
}

async function seed(
  h: Harness,
  steps: FakeHarnessStep[],
  overrides: Partial<{
    dangerouslySkipPermissions: boolean;
    profile: string;
    env: NodeJS.ProcessEnv;
    probe: RunDeps["probe"];
    installSignals: RunDeps["installSignals"];
    createAbortController: () => AbortController;
  }> = {},
): Promise<CmdResult> {
  const out = new Capture();
  const err = new Capture();
  const invoker = createFakeHarness(steps);
  const deps: RunDeps = {
    env: overrides.env ?? baseEnv(h),
    cwd: h.fixture.root,
    homedir: os.homedir(),
    invoker,
    probe: overrides.probe ?? okProbe,
    createScriptedInvoker,
    scriptedProbe: probeScriptedHarnessExecutables,
    stdout: out,
    stderr: err,
    isTTY: false,
    installSignals: overrides.installSignals ?? fakeSignals(),
    createAbortController: overrides.createAbortController,
  };
  const code = await runCommand(
    {
      pipeline: "standard",
      thread: h.fixture.threadFolder as string,
      ...(overrides.profile !== undefined ? { profile: overrides.profile } : {}),
      dangerouslySkipPermissions: overrides.dangerouslySkipPermissions ?? false,
    },
    deps,
  );
  return { code, out: out.text, err: err.text, invoker };
}

async function resume(
  h: Harness,
  runId: string,
  steps: FakeHarnessStep[],
  overrides: Partial<{
    env: NodeJS.ProcessEnv;
    probe: RunDeps["probe"];
    installSignals: RunDeps["installSignals"];
    createAbortController: () => AbortController;
  }> = {},
): Promise<CmdResult> {
  const out = new Capture();
  const err = new Capture();
  const invoker = createFakeHarness(steps);
  const deps: RunDeps = {
    env: overrides.env ?? baseEnv(h),
    cwd: h.fixture.root,
    homedir: os.homedir(),
    invoker,
    probe: overrides.probe ?? okProbe,
    createScriptedInvoker,
    scriptedProbe: probeScriptedHarnessExecutables,
    stdout: out,
    stderr: err,
    isTTY: false,
    installSignals: overrides.installSignals ?? fakeSignals(),
    createAbortController: overrides.createAbortController,
  };
  const code = await resumeCommand({ runId }, deps);
  return { code, out: out.text, err: err.text, invoker };
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

async function soleRunId(h: Harness): Promise<string> {
  const names = await runDirNames(h.stateRoot);
  expect(names.length).toBe(1);
  return names[0]!;
}

async function readCp(h: Harness, runId: string): Promise<RunCheckpoint> {
  const result = await readCheckpoint(runDirectoryFor(h.stateRoot, runId));
  if (!result.ok) throw new Error(`checkpoint unreadable: ${result.errors.join("; ")}`);
  return result.checkpoint;
}

function attemptCountAt(cp: RunCheckpoint, stageIndex: number): number {
  return cp.attempts.filter((a) => a.stageIndex === stageIndex).length;
}

async function commitSubjects(fixture: RepoFixture): Promise<string[]> {
  const result = await fixture.git(["log", "--pretty=%s"]);
  return result.stdout.trim().split("\n");
}

async function headOf(fixture: RepoFixture): Promise<string> {
  const result = await fixture.git(["rev-parse", "HEAD"]);
  return result.stdout.trim();
}

function writeThreadFileSync(fixture: RepoFixture, rel: string, content: string): void {
  writeFileSync(path.join(fixture.threadPath as string, rel), content, "utf8");
}
function writePlanTaskSync(fixture: RepoFixture, name: string, content: string): void {
  const dir = path.join(fixture.threadPath as string, "plan-tasks");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), content, "utf8");
}
function writeRootFileSync(fixture: RepoFixture, rel: string, content: string): void {
  writeFileSync(path.join(fixture.root, rel), content, "utf8");
}
function dropPendingSync(fixture: RepoFixture, name: string): void {
  const dir = path.join(fixture.threadPath as string, ".pending-decisions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), "open decision", "utf8");
}
/**
 * Break the thread's temporary workspaces on both counts at once: two of them
 * lose their ignore rule, and the third — still ignored — gains force-added
 * tracked content. Rewriting `.gitignore` also leaves the worktree dirty, which
 * is what makes the refusal's precedence over the clean-worktree rule visible.
 */
async function makeWorkspacesUnsafe(fixture: RepoFixture): Promise<void> {
  await fs.writeFile(
    path.join(fixture.root, ".gitignore"),
    ".implementation-runs/\n",
    "utf8",
  );
  const runs = path.join(fixture.threadPath as string, ".implementation-runs");
  await fs.mkdir(runs, { recursive: true });
  await fs.writeFile(path.join(runs, "leftover.md"), "x", "utf8");
  await fixture.git([
    "add",
    "-f",
    "--",
    `${fixture.threadRelPath as string}/.implementation-runs`,
  ]);
}

async function removePending(fixture: RepoFixture, name: string): Promise<void> {
  await fs.rm(path.join(fixture.threadPath as string, ".pending-decisions", name), {
    force: true,
  });
}

/**
 * Make one queue's scan fail with `ENOTDIR` by putting a regular file where its
 * directory is expected. The file has to be both untracked and ignored: Git
 * tracking anything at a temporary-workspace path is refused before the scan is
 * reached, and an unignored file would leave the worktree dirty.
 */
async function blockQueueScan(
  fixture: RepoFixture,
  queueName: ".pending-decisions" | ".pending-reviews",
): Promise<void> {
  await fs.appendFile(
    path.join(fixture.root, ".gitignore"),
    `${queueName}\n`,
    "utf8",
  );
  await fixture.git(["add", "--", ".gitignore"]);
  await fixture.git(["commit", "-m", "chore: ignore the queue path itself"]);
  await fs.writeFile(
    path.join(fixture.threadPath as string, queueName),
    "not a directory",
    "utf8",
  );
}

/**
 * The six standard stage side effects; resume from stage k slices from k. Each
 * step leaves the artifact state its catalog stage promises, so `plan-strict`
 * writes an index *and* a task file: a DONE that leaves less is a contract
 * violation rather than a finished stage.
 */
function standardSteps(fixture: RepoFixture): FakeHarnessStep[] {
  return [
    { before: () => writeThreadFileSync(fixture, "spec.md", "# Spec\n") },
    { before: () => writeThreadFileSync(fixture, "spec.md", "# Spec v2\n") },
    {},
    {
      before: () => {
        writeThreadFileSync(fixture, "plan.md", "# Plan\n");
        writePlanTaskSync(fixture, "01-task.md", "# Task 01\n");
      },
    },
    {},
    {
      before: () =>
        writeThreadFileSync(fixture, "implementation-report.md", "# Report\n"),
    },
  ];
}

const DONE = { kind: "completed", finalText: "Outcome: DONE" } as const;
const BLOCKED = { kind: "completed", finalText: "Outcome: BLOCKED — needs a human" } as const;

function standardScriptedScenario(
  overrides: Partial<Record<string, string[]>> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 0,
    stages: {
      spec: ["spec-correct"],
      "reconcile-spec": ["reconcile-spec-correct"],
      "review-spec": ["outcome-done"],
      "plan-strict": ["plan-strict-correct"],
      "reconcile-plan": ["reconcile-plan-correct"],
      "implement-plan-with-subagents": ["implement-plan-with-subagents-correct"],
      ...overrides,
    },
  };
}

async function writeScriptedScenario(
  configRoot: string,
  scenario: Record<string, unknown> = standardScriptedScenario(),
): Promise<string> {
  const scenarioPath = path.join(configRoot, SCRIPTED_SCENARIO_FILENAME);
  await fs.writeFile(scenarioPath, JSON.stringify(scenario, null, 2), "utf8");
  return scenarioPath;
}

function scriptedEnv(h: Harness): NodeJS.ProcessEnv {
  return {
    ...baseEnv(h),
    [SCRIPTED_HARNESS_TOGGLE_VAR]: "1",
  };
}

async function seedScriptedBlocked(
  h: Harness,
  scenario: Record<string, unknown> = standardScriptedScenario({
    spec: ["outcome-blocked", "spec-correct"],
  }),
): Promise<string> {
  await writeScriptedScenario(h.configRoot, scenario);
  const seeded = await seed(h, [], { env: scriptedEnv(h) });
  expect(seeded.code).toBe(2);
  return soleRunId(h);
}

describe.concurrent("resumeCommand — preflight rejections (AC-15.2)", () => {
  it("rejects an unknown run with exit 1", async () => {
    const h = await setup();
    const result = await resume(h, "no-such-run-000000", []);
    expect(result.code).toBe(1);
    expect(result.err).toContain("Unknown run");
  });

  it("rejects a malformed checkpoint with exit 1", async () => {
    const h = await setup();
    const runDir = runDirectoryFor(h.stateRoot, "malformed-000000");
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(path.join(runDir, "state.json"), "{ not json", "utf8");
    const result = await resume(h, "malformed-000000", []);
    expect(result.code).toBe(1);
    expect(result.err).toContain("malformed");
  });

  it("reports a completed run and exits 1", async () => {
    const h = await setup();
    const seeded = await seed(h, standardSteps(h.fixture));
    expect(seeded.code).toBe(0);
    const runId = await soleRunId(h);
    const result = await resume(h, runId, []);
    expect(result.code).toBe(1);
    expect(result.err).toContain("already completed");
  });

  it("fails clearly when the recorded thread no longer resolves, never searching", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    // Remove the recorded thread directory: the recorded path no longer resolves.
    await fs.rm(h.fixture.threadPath as string, { recursive: true, force: true });
    const result = await resume(h, runId, []);
    expect(result.code).toBe(1);
    expect(result.err).toContain("could not be revalidated");
  });

  it("does not let a config-only environment error block a state-only resume", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const result = await resume(h, runId, standardSteps(h.fixture), {
      env: {
        ANTMAY_CONFIG_HOME: "relative/not/absolute",
        ANTMAY_STATE_HOME: h.stateRoot,
        NO_COLOR: "1",
      },
    });
    expect(result.code).toBe(0);
  });
});

describe.concurrent("resumeCommand — clean-worktree rule (AC-15.1)", () => {
  it("refuses a dirty worktree for an outcome-blocked pause, leaving the checkpoint unchanged", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);
    await fs.writeFile(path.join(h.fixture.root, "stray.txt"), "dirty\n", "utf8");
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(1);
    expect(result.err).toContain("not clean");
    const after = await readCp(h, runId);
    expect(after.condition).toBe("waiting-for-user");
    expect(after.waiting?.reasons[0].kind).toBe("outcome-blocked");
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it("accepts a dirty worktree for a commit-error pause and finalizes the boundary", async () => {
    const h = await setup();
    // Force a commit-error by failing the pre-commit hook during the seed.
    const hook = path.join(h.fixture.root, ".git", "hooks", "pre-commit");
    await fs.writeFile(hook, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    await fs.chmod(hook, 0o755);
    await seed(h, [
      { before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n"), outcome: DONE },
    ]);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.waiting?.reasons[0].kind).toBe("commit-error");

    await fs.rm(hook, { force: true });
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.err).not.toContain("not clean");
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
  });
});

/**
 * The three pauses the clean-worktree rule exempts, each seeded through a real
 * run. The temporary-workspace check is exempt from nothing, so every one of
 * them has to reach it.
 */
const CLEAN_WORKTREE_EXEMPT_PAUSES: {
  kind: string;
  seedPause: (h: Harness) => Promise<void>;
}[] = [
  {
    kind: "git-policy-violation",
    seedPause: async (h) => {
      await seed(h, [
        {
          before: () => {
            writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
            writeRootFileSync(h.fixture, "stray.txt", "x");
          },
          outcome: DONE,
        },
      ]);
    },
  },
  {
    kind: "commit-error",
    seedPause: async (h) => {
      // A rejecting pre-commit hook fails the boundary commit itself; it is
      // removed again so only the workspace state can refuse the resume.
      const hook = path.join(h.fixture.root, ".git", "hooks", "pre-commit");
      await fs.writeFile(hook, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
      await fs.chmod(hook, 0o755);
      await seed(h, [
        {
          before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n"),
          outcome: DONE,
        },
      ]);
      await fs.rm(hook, { force: true });
    },
  },
  {
    kind: "stage-contract-violation",
    seedPause: async (h) => {
      // The `spec` stage reports DONE and writes nothing, so the spec it
      // promises is missing.
      await seed(h, [{}]);
    },
  },
];

describe.concurrent("resumeCommand — temporary-workspace safety (AC-1.7, AC-2.2, AC-2.4)", () => {
  for (const pause of CLEAN_WORKTREE_EXEMPT_PAUSES) {
    it(`refuses unsafe temporary workspaces for a ${pause.kind} pause`, async () => {
      const h = await setup();
      await pause.seedPause(h);
      const runId = await soleRunId(h);
      expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe(pause.kind);
      const checkpointFile = path.join(
        runDirectoryFor(h.stateRoot, runId),
        "state.json",
      );
      const before = await fs.readFile(checkpointFile, "utf8");

      await makeWorkspacesUnsafe(h.fixture);
      const result = await resume(h, runId, standardSteps(h.fixture));

      expect(result.code).toBe(1);
      const rel = h.fixture.threadRelPath as string;
      expect(result.err).toContain("Run cannot resume ❌");
      expect(result.err).toContain(`Run ID:   ${runId}`);
      expect(result.err).toContain("Check:    Temporary workspace Git safety");
      expect(result.err).toContain("Missing ignore coverage");
      expect(result.err).toContain("    - .pending-decisions/");
      expect(result.err).toContain("    - .pending-reviews/");
      expect(result.err).toContain("Tracked temporary content");
      expect(result.err).toContain("    - .implementation-runs/leftover.md");
      expect(result.err).toContain(
        `      git rm -r --cached -- ${rel}/.implementation-runs`,
      );
      expect(result.err).toContain(
        "Result:   Checkpoint unchanged. No lock was acquired and no stage was run.",
      );
      expect(result.err.trimEnd().split("\n").at(-1)).toContain(
        `Resume:   antmay afk resume ${runId}`,
      );
      // This pause is exempt from the clean-worktree rule, so nothing else here
      // would have stopped the resume — and the workspace refusal never offers
      // the commit-or-revert advice that would commit the residue.
      expect(result.err).not.toContain("not clean");
      expect(result.invoker.calls.length).toBe(0);
      expect(await fs.readFile(checkpointFile, "utf8")).toBe(before);
      expect(await lockNames(h.stateRoot)).toEqual([]);
    });
  }
});

describe.concurrent("resumeCommand — queue handling under the lock (AC-15.3, AC-11.6)", () => {
  it("leaves a waiting run with non-empty queues byte-for-byte unchanged, prints files, exits 2", async () => {
    const h = await setup();
    await seed(h, [{ before: () => dropPendingSync(h.fixture, "q.md"), outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    // The printed list comes from the pause's queue reason, so a file still
    // present has to be named there — the durable checkpoint stays untouched.
    expect(result.out).toContain("q.md");
    const after = await readCp(h, runId);
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
  });

  it("names a bundle that appeared while the run was paused for another reason", async () => {
    const h = await setup();
    // Pause on the stage's own verdict with both queues empty, then queue a
    // bundle by hand: the pause never recorded a queue reason, but the file is
    // why this resume cannot proceed and the reader is owed its name.
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe("outcome-blocked");
    dropPendingSync(h.fixture, "appeared.md");
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    expect(result.out).toContain("appeared.md");
  });

  it("downgrades a locked queue-scan failure to a durable gate-error and exits 2", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    await blockQueueScan(h.fixture, ".pending-reviews");
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    const cp = await readCp(h, runId);
    expect(cp.waiting?.reasons[0].kind).toBe("gate-error");
    // What the pause explains has moved on; what a later resume may do about it
    // has not.
    expect(cp.waiting?.recovery).toEqual({ kind: "retry-stage" });
  });

  it("keeps a finalized DONE's declared resolution across a scan failure, then advances", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          dropPendingSync(h.fixture, "q.md");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const finalizedRecovery = {
      kind: "resume-finalized-done",
      attempt: { stageIndex: 0, attempt: 1 },
      queueResolution: "advance",
    };
    expect((await readCp(h, runId)).waiting?.recovery).toEqual(finalizedRecovery);

    // An unreadable queue is not an empty one, so this resume may explain that
    // and nothing else — and must leave the finalized attempt exactly as
    // advanceable as it found it.
    await removePending(h.fixture, "q.md");
    await blockQueueScan(h.fixture, ".pending-reviews");
    const held = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(held.code).toBe(2);
    expect(held.invoker.calls.length).toBe(0);
    const heldCp = await readCp(h, runId);
    expect(heldCp.waiting?.reasons[0].kind).toBe("gate-error");
    expect(heldCp.waiting?.recovery).toEqual(finalizedRecovery);

    // Readable again: the resolution the pause recorded still applies, and the
    // finalized attempt is never rerun.
    await fs.rm(path.join(h.fixture.threadPath as string, ".pending-reviews"), {
      force: true,
    });
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    expect(attemptCountAt(await readCp(h, runId), 0)).toBe(1);
  });

  it("keeps a git-policy-violation kind on a scan failure, folding the diagnostic in", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe("git-policy-violation");
    // Revert the disallowed change so only the boundary diff remains, then break
    // the queue scan by putting a regular file where the queue directory is
    // expected (ENOTDIR).
    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    await fs.writeFile(
      path.join(h.fixture.threadPath as string, ".pending-reviews"),
      "not a dir",
      "utf8",
    );
    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    const cp = await readCp(h, runId);
    // The governing reason is what the pause renders, so the folded-in scan
    // failure has to reach it for the reader to ever see it.
    expect(cp.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(cp.waiting?.reasons[0].message).toContain("scan failed again");
    expect(cp.waiting?.reasons[0].diagnostics?.errorMessage).toBeDefined();
    expect(result.out).toContain("scan failed again");
  });
});

describe.concurrent("resumeCommand — pending-queues resolution (AC-15.3)", () => {
  it("re-attempts the same stage for a non-DONE pending-queues pause", async () => {
    const h = await setup();
    await seed(h, [{ before: () => dropPendingSync(h.fixture, "q.md"), outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe("pending-queues");
    await removePending(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(attemptCountAt(cp, 0)).toBe(2);
  });

  it("advances without rerunning for a DONE-finalized pending-queues pause declaring advance", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          dropPendingSync(h.fixture, "q.md");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.waiting?.reasons[0].kind).toBe("pending-queues");
    expect(seededCp.attempts[0]?.result).toBe("done");

    await removePending(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    // The finalized stage-0 attempt was never rerun.
    expect(attemptCountAt(cp, 0)).toBe(1);
  });

  it("re-attempts the same stage for a DONE-finalized pending-queues pause declaring rerun", async () => {
    const h = await setup();
    await seed(h, [
      { before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n"), outcome: DONE },
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec v2\n");
          dropPendingSync(h.fixture, "q.md");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.stageIndex).toBe(1);
    expect(seededCp.waiting?.reasons[0].kind).toBe("pending-queues");

    await removePending(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    // Stage 1 (reconcile-spec, rerun) ran a fresh attempt over the finalized one.
    expect(attemptCountAt(cp, 1)).toBe(2);
  });
});

describe.concurrent("resumeCommand — harness-free Git-boundary finalization (AC-15.3)", () => {
  it("commits the preserved diff without any harness call, then advances", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe("git-policy-violation");

    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
    const cp = await readCp(h, runId);
    // Stage 0 was finalized, never rerun by a harness invocation.
    expect(attemptCountAt(cp, 0)).toBe(1);
  });

  it("keeps the same attempt finalizable when the boundary refuses again, then commits it", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const paused = await readCp(h, runId);
    const savedDone = {
      kind: "retry-git-finalization",
      attempt: { stageIndex: 0, attempt: 1 },
      pausedAtHead: paused.attempts[0]?.headAfterAttempt,
    };
    expect(paused.waiting?.recovery).toEqual(savedDone);

    // The out-of-bounds file is still there, so this resume's boundary refuses
    // exactly as the run's did — and the preserved attempt stays finalizable.
    const refused = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(refused.code).toBe(2);
    expect(refused.invoker.calls.length).toBe(0);
    const stillPaused = await readCp(h, runId);
    expect(stillPaused.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(stillPaused.waiting?.recovery).toEqual(savedDone);
    expect(attemptCountAt(stillPaused, 0)).toBe(1);

    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
    expect(attemptCountAt(await readCp(h, runId), 0)).toBe(1);
  });

  it("advances when the intended diff was manually committed to an empty worktree", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const folder = h.fixture.threadFolder as string;
    // The user reverts the stray file and commits the intended diff themselves.
    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    await h.fixture.git(["add", "--", `docs/threads/${folder}/spec.md`]);
    await h.fixture.git(["commit", "-m", "manual: user commit"]);

    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const subjects = await commitSubjects(h.fixture);
    // No executor spec commit: the user's commit already satisfied the boundary.
    expect(subjects).not.toContain(`docs(${folder}): spec`);
    expect(subjects).toContain("manual: user commit");
  });

  it("applies the declared rerun resolution after finalizing a Git pause that listed pending files", async () => {
    const h = await setup();
    await seed(h, [
      { before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n"), outcome: DONE },
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec v2\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
          dropPendingSync(h.fixture, "q.md");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.stageIndex).toBe(1);
    expect(seededCp.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(
      seededCp.waiting?.reasons.find((r) => r.kind === "pending-queues")?.pendingFiles
        ?.length,
    ).toBeGreaterThan(0);

    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    await removePending(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): reconcile spec`);
    const cp = await readCp(h, runId);
    // Stage 1 (rerun) got a fresh attempt after the boundary finalized.
    expect(attemptCountAt(cp, 1)).toBe(2);
  });

  it("warns on cross-pause HEAD movement and never treats it as a violation (AC-12.7)", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    // Move HEAD while paused with an unrelated commit.
    await fs.writeFile(path.join(h.fixture.root, "other.txt"), "y\n", "utf8");
    await h.fixture.git(["add", "--", "other.txt"]);
    await h.fixture.git(["commit", "-m", "chore: unrelated"]);

    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.err).toContain("HEAD moved");
    expect(result.code).toBe(0);
  });

  it("finalizes the implement boundary by committing the implementation report", async () => {
    const h = await setup();
    const steps = standardSteps(h.fixture);
    steps[5] = {
      before: () => {
        writeThreadFileSync(h.fixture, "implementation-report.md", "# Report\n");
        writeRootFileSync(h.fixture, "stray.txt", "x");
      },
    };
    await seed(h, steps);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.stageIndex).toBe(5);
    expect(seededCp.waiting?.reasons[0].kind).toBe("git-policy-violation");

    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    const result = await resume(h, runId, []);
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(
      `docs(${folder}): implementation report`,
    );
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    // Stage 5 was finalized, never rerun by a harness invocation.
    expect(attemptCountAt(cp, 5)).toBe(1);
    // The boundary commit this resume made is the tip the finalized attempt
    // records, exactly as a boundary committed during the run leaves it.
    const finalized = cp.attempts.find((a) => a.stageIndex === 5);
    expect(finalized?.headAfterAttempt).toBe(await headOf(h.fixture));
  });
});

describe.concurrent("resumeCommand — artifact-contract recovery (AC-7.4, AC-7.5, AC-7.6)", () => {
  /**
   * Pause stage 0 on its contract: the `spec` stage reports DONE and writes
   * nothing, so the spec it promises is missing.
   */
  async function seedContractViolation(h: Harness): Promise<string> {
    const seeded = await seed(h, [{}]);
    expect(seeded.code).toBe(2);
    const runId = await soleRunId(h);
    const cp = await readCp(h, runId);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-contract-violation");
    expect(cp.attempts[0]?.terminalResult?.token).toBe("DONE");
    return runId;
  }

  it("pauses on a prerequisite lost while stopped, then starts the stage once it is restored", async () => {
    const h = await setup();
    // Stage 0 writes the spec and finishes; stage 1 pauses on its own verdict.
    await seed(h, [
      { before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n") },
      { outcome: BLOCKED },
    ]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).stageIndex).toBe(1);

    // The spec is deleted and the deletion committed: the worktree is clean, so
    // nothing but the contract check can refuse this resume.
    const specPath = path.join(h.fixture.threadPath as string, "spec.md");
    await fs.rm(specPath);
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: drop the spec"]);

    const first = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(first.code).toBe(2);
    expect(first.invoker.calls.length).toBe(0);
    expect(first.out).toContain(
      "STAGE CANNOT START — requirements not met ❌",
    );
    expect(first.out).toContain("stage 2 of 6 · reconcile-spec");
    const paused = await readCp(h, runId);
    expect(paused.stageIndex).toBe(1);
    expect(paused.waiting?.reasons[0].kind).toBe("stage-prerequisite-unmet");
    expect(paused.waiting?.reasons[0].contract).toEqual([
      { dimension: "spec", expected: true, observed: false },
    ]);
    expect(attemptCountAt(paused, 1)).toBe(1);

    // Restored and committed, the stage starts.
    writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: restore the spec"]);
    const second = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(second.code).toBe(0);
    expect(attemptCountAt(await readCp(h, runId), 1)).toBe(2);
  });

  it("finalizes the saved DONE without another attempt once the promised artifact is repaired", async () => {
    const h = await setup();
    const runId = await seedContractViolation(h);
    // The human writes the missing spec, leaving the worktree dirty — which
    // this pause is allowed to inspect.
    writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");

    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.err).not.toContain("not clean");
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    // Stage 0 was finalized from its saved DONE, never run again.
    expect(attemptCountAt(cp, 0)).toBe(1);
    expect(cp.attempts[0]?.result).toBe("done");
  });

  it("enforces the HEAD rule the runner never reached when finalizing a repaired promise", async () => {
    const h = await setup();
    // The stage-0 attempt commits on its own — movement the `spec` stage
    // forbids — and reports DONE without the spec it promises, so the runner
    // stops at the contract and never evaluates the boundary.
    const seeded = await seed(h, [
      {
        before: async () => {
          writeRootFileSync(h.fixture, "stray.txt", "x");
          await h.fixture.git(["add", "-A"]);
          await h.fixture.git(["commit", "-m", "chore: attempt commit"]);
        },
      },
    ]);
    expect(seeded.code).toBe(2);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe(
      "stage-contract-violation",
    );

    // The human repairs the promise. The contract now holds, so finalization is
    // reached — and it is the first and only evaluation of a HEAD rule this
    // attempt already broke.
    writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(2);
    expect(result.invoker.calls.length).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.stageIndex).toBe(0);
    expect(cp.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(cp.waiting?.reasons[0].message).toContain("forbids HEAD movement");
  });

  it("judges the HEAD rule against the second attempt's own start, not the stage entry", async () => {
    const h = await setup();
    // Attempt 1 of stage 0 reports DONE without the spec it promises.
    const runId = await seedContractViolation(h);

    // The human commits across the pause — HEAD moves without the promise being
    // met — so the clean-worktree resume runs the stage again.
    writeRootFileSync(h.fixture, "notes.txt", "partial repair\n");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: human commit across the pause"]);
    const relaunched = await resume(h, runId, [{}]);
    expect(relaunched.code).toBe(2);
    const paused = await readCp(h, runId);
    expect(attemptCountAt(paused, 0)).toBe(2);
    expect(paused.waiting?.reasons[0].kind).toBe("stage-contract-violation");

    // Attempt 2 started after that commit and moved HEAD no further, so the
    // `spec` stage's forbidden-HEAD-movement rule holds and the repaired
    // promise finalizes.
    writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
    const finalized = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(finalized.out).not.toContain("forbids HEAD movement");
    expect(finalized.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    // The saved DONE of attempt 2 was finalized, never run a third time.
    expect(attemptCountAt(cp, 0)).toBe(2);
  });

  it("starts a fresh same-stage attempt when the promise is still unmet and the worktree is clean", async () => {
    const h = await setup();
    const runId = await seedContractViolation(h);

    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    expect(attemptCountAt(cp, 0)).toBe(2);
  });

  it("keeps the contract kind when the locked queue scan fails, folding the diagnostic in", async () => {
    const h = await setup();
    const runId = await seedContractViolation(h);
    // The queue scan fails while the pause is held. Downgrading the pause to a
    // gate-error would throw away the saved DONE's recovery path.
    await blockQueueScan(h.fixture, ".pending-reviews");

    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    const cp = await readCp(h, runId);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-contract-violation");
    expect(cp.waiting?.reasons[0].message).toContain("scan failed again");
  });

  it("stays paused with repair-or-revert guidance when the promise is still unmet and the worktree is dirty", async () => {
    const h = await setup();
    const runId = await seedContractViolation(h);
    writeRootFileSync(h.fixture, "stray.txt", "x");

    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    expect(result.invoker.calls.length).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.stageIndex).toBe(0);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-contract-violation");
    expect(cp.waiting?.reasons[0].detail).toContain("dirty");
    expect(cp.waiting?.nextAction).toContain("revert");
    expect(attemptCountAt(cp, 0)).toBe(1);
    // The recheck restates the still-unmet promise as the file it is about, in
    // the same words the rendered `Artifacts:` row uses.
    expect(cp.waiting?.reasons[0].message).toContain("a non-empty spec.md");
    expect(result.out).toContain("expected a non-empty spec.md, found no spec.md");
    expect(result.out).not.toContain("expected true, found false");
  });
});

describe.concurrent("resumeCommand — unrecoverable recovery documents (AC-2.3)", () => {
  /**
   * Rewrite a seeded run's raw `state.json`, which is what lets a case present a
   * document the validator refuses. The exact bytes are returned so the case can
   * prove nothing wrote over them.
   */
  async function writeRawCheckpoint(
    h: Harness,
    runId: string,
    mutate: (raw: Record<string, unknown>) => void,
  ): Promise<{ file: string; text: string }> {
    const file = path.join(runDirectoryFor(h.stateRoot, runId), "state.json");
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>;
    mutate(raw);
    const text = `${JSON.stringify(raw, null, 2)}\n`;
    await fs.writeFile(file, text, "utf8");
    return { file, text };
  }

  /** The two shapes the audit found a resume would accept and then finalize. */
  const unrecoverable: {
    name: string;
    mutate: (raw: Record<string, unknown>) => void;
  }[] = [
    {
      name: "a saved-DONE recovery whose referenced attempt reported BLOCKED",
      mutate: (raw) => {
        const stages = raw.stages as Array<{ queueResolution: string }>;
        (raw.waiting as Record<string, unknown>).recovery = {
          kind: "resume-finalized-done",
          attempt: { stageIndex: 0, attempt: 1 },
          queueResolution: stages[0]!.queueResolution,
        };
      },
    },
    {
      name: "a finalization recovery that references no recorded attempt",
      mutate: (raw) => {
        raw.attempts = [];
        (raw.waiting as Record<string, unknown>).recovery = {
          kind: "retry-git-finalization",
          attempt: { stageIndex: 0, attempt: 1 },
          pausedAtHead: "0".repeat(40),
        };
      },
    },
  ];

  for (const document of unrecoverable) {
    it(`refuses ${document.name} before acquiring the lock or writing state`, async () => {
      const h = await setup();
      await seed(h, [{ outcome: BLOCKED }]);
      const runId = await soleRunId(h);
      const written = await writeRawCheckpoint(h, runId, document.mutate);

      // Holding the workspace lock is what makes the ordering visible: a resume
      // that reached lock acquisition would refuse for that reason instead.
      const held = await acquireWorkspaceLock(
        h.stateRoot,
        h.fixture.root,
        "holder-run",
        new Date(),
      );
      if (!held.ok) throw new Error("expected to acquire the lock");
      heldLocks.push(held.handle);

      const result = await resume(h, runId, standardSteps(h.fixture));

      expect(result.code).toBe(1);
      expect(result.err).toContain("malformed or unreadable");
      expect(result.err).not.toContain("already locked");
      expect(result.invoker.calls.length).toBe(0);
      // Nothing was persisted, so the stage cannot have advanced and the
      // referenced attempt cannot have been rewritten as done.
      expect(await fs.readFile(written.file, "utf8")).toBe(written.text);
    });
  }
});

describe.concurrent("resumeCommand — ready and executing recovery (AC-15.3, AC-15.4)", () => {
  /** Seed a durable ready checkpoint (post-allocation, pre-launch signal). */
  async function seedReady(h: Harness): Promise<string> {
    let calls = 0;
    // First signaled() (pre-allocation) is null; the second (pre-launch) fires
    // so the allocated ready checkpoint survives with no attempts.
    await seed(h, standardSteps(h.fixture), {
      installSignals: fakeSignals(() => (++calls > 1 ? "SIGINT" : null)),
    });
    return soleRunId(h);
  }

  it("persists a tokenless pre-attempt pending-queues pause for a ready run with queued files, then re-attempts", async () => {
    const h = await setup();
    const runId = await seedReady(h);
    expect((await readCp(h, runId)).condition).toBe("ready");

    // First resume: a ready cursor with a queued file persists a no-attempt pause.
    dropPendingSync(h.fixture, "q.md");
    const first = await resume(h, runId, standardSteps(h.fixture));
    expect(first.code).toBe(2);
    const paused = await readCp(h, runId);
    expect(paused.condition).toBe("waiting-for-user");
    expect(paused.waiting?.reasons[0].kind).toBe("pending-queues");
    expect(paused.attempts.length).toBe(0);

    // Second resume: queues empty, the pre-gate pause re-attempts the stage.
    await removePending(h.fixture, "q.md");
    const second = await resume(h, runId, standardSteps(h.fixture));
    expect(second.code).toBe(0);
    expect(attemptCountAt(await readCp(h, runId), 0)).toBe(1);
  });

  it("runs the stored next stage for a ready run", async () => {
    const h = await setup();
    const runId = await seedReady(h);
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    expect((await readCp(h, runId)).condition).toBe("completed");
  });

  it("refuses an executing run while a stale lock is present, then recovers after removal", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    // Rewrite the checkpoint to a raw abandoned executing state.
    const runDir = runDirectoryFor(h.stateRoot, runId);
    const base = await readCp(h, runId);
    const executingAttempt = {
      ...base.attempts[0]!,
      result: "executing" as const,
      terminalResult: null,
    };
    delete (executingAttempt as { endedAt?: string }).endedAt;
    delete (executingAttempt as { failure?: unknown }).failure;
    // A live attempt has not reached its post-attempt observation yet.
    delete (executingAttempt as { headAfterAttempt?: string }).headAfterAttempt;
    const executingCp: RunCheckpoint = {
      ...base,
      condition: "executing",
      waiting: null,
      attempts: [executingAttempt],
    };
    await writeCheckpoint(runDir, executingCp);

    // A present lock refuses the resume.
    const held = await acquireWorkspaceLock(
      h.stateRoot,
      h.fixture.root,
      "holder-run",
      new Date(),
    );
    if (!held.ok) throw new Error("expected to acquire the lock");
    heldLocks.push(held.handle);
    const refused = await resume(h, runId, standardSteps(h.fixture));
    expect(refused.code).toBe(1);
    expect(refused.err).toContain("already locked");
    expect((await readCp(h, runId)).condition).toBe("executing");

    // Manual stale-lock removal, then recovery marks the attempt interrupted and
    // runs a fresh attempt.
    await held.handle.release();
    const recovered = await resume(h, runId, standardSteps(h.fixture));
    expect(recovered.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.attempts[0]?.result).toBe("interrupted");
    expect(attemptCountAt(cp, 0)).toBe(2);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

describe.concurrent("resumeCommand — snapshot fidelity and display (AC-15.4, AC-18.1)", () => {
  it("probes only the current stage's harness and keeps retained versions for later stages", async () => {
    const h = await setup(
      settingsFor({
        "implement-plan-with-subagents": {
          agent: { harness: "claude-code", model: "claude-model" },
        },
      }),
    );
    const runProbe: RunDeps["probe"] = async (harnesses) => {
      const versions: Partial<Record<HarnessId, string>> = {};
      for (const hh of harnesses) versions[hh] = `${hh}-run`;
      return { ok: true, versions };
    };
    let resumeProbeHarnesses: HarnessId[] = [];
    const resumeProbe: RunDeps["probe"] = async (harnesses) => {
      resumeProbeHarnesses = [...harnesses];
      const versions: Partial<Record<HarnessId, string>> = {};
      for (const hh of harnesses) versions[hh] = `${hh}-resume`;
      return { ok: true, versions };
    };
    await seed(h, [{ outcome: BLOCKED }], { probe: runProbe });
    const runId = await soleRunId(h);

    const result = await resume(h, runId, standardSteps(h.fixture), {
      probe: resumeProbe,
    });
    expect(result.code).toBe(0);
    // Only the current stage's harness (codex) was probed on resume.
    expect(resumeProbeHarnesses).toEqual(["codex"]);

    const runDir = runDirectoryFor(h.stateRoot, runId);
    const specLog = await fs.readFile(
      path.join(runDir, "logs", "01-spec-attempt-02.log"),
      "utf8",
    );
    expect(specLog).toContain("Harness version: codex-resume");
    const implLog = await fs.readFile(
      path.join(runDir, "logs", "06-implement-plan-with-subagents-attempt-01.log"),
      "utf8",
    );
    expect(implLog).toContain("Harness version: claude-code-run");
  });

  it("never rereads settings: a settings edit between pause and resume changes nothing", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    await fs.writeFile(
      path.join(h.configRoot, "settings.json"),
      JSON.stringify(settingsFor({}, "changed")),
      "utf8",
    );
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(
      cp.stages.every((stage) => stage.binding.agent.model === "test-model"),
    ).toBe(true);
  });

  it("rereads no pipeline, profile, or settings document after allocation (AC-6.3)", async () => {
    const h = await setup(
      settingsFor({
        spec: { agent: { harness: "codex", model: "settings-model" } },
      }),
    );
    await fs.mkdir(path.join(h.configRoot, "profiles"), { recursive: true });
    await fs.writeFile(
      path.join(h.configRoot, "profiles", "quality.json"),
      JSON.stringify({
        schemaVersion: 0,
        name: "quality",
        stages: Object.fromEntries(
          STANDARD_STAGE_IDS.map((stage) => [
            stage,
            { agent: { harness: "codex", model: "profile-model" } },
          ]),
        ),
      }),
      "utf8",
    );
    await seed(h, [{ outcome: BLOCKED }], { profile: "quality" });
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);

    // Rewrite the pipeline into a different selection, corrupt the profile, and
    // delete the settings file entirely.
    await fs.writeFile(
      path.join(h.configRoot, "pipelines", "standard.json"),
      JSON.stringify({
        schemaVersion: 0,
        name: "rewritten",
        stages: [{ stage: "review-spec" }],
      }),
      "utf8",
    );
    await fs.rm(path.join(h.configRoot, "profiles", "quality.json"));
    await fs.rm(path.join(h.configRoot, "settings.json"));

    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const after = await readCp(h, runId);
    expect(after.pipelineName).toBe("standard");
    expect(after.pipelineSourcePath).toBe(before.pipelineSourcePath);
    expect(after.profileSelection).toEqual(before.profileSelection);
    expect(after.stages).toEqual(before.stages);
    expect(
      after.stages.every((stage) => stage.binding.agent.model === "profile-model"),
    ).toBe(true);
  });

  it("renders the same resolved-execution block after every source document is gone (AC-11)", async () => {
    const h = await setup();
    await fs.mkdir(path.join(h.configRoot, "profiles"), { recursive: true });
    await fs.writeFile(
      path.join(h.configRoot, "profiles", "quality.json"),
      JSON.stringify({
        schemaVersion: 0,
        name: "quality",
        stages: Object.fromEntries(
          STANDARD_STAGE_IDS.map((stage) => [
            stage,
            { agent: { harness: "codex", model: "profile-model" } },
          ]),
        ),
      }),
      "utf8",
    );
    /** The startup block alone, which both commands print before stage 1. */
    const startupBlock = (output: string): string =>
      output.slice(output.indexOf("Run details"), output.indexOf("Stage 1/"));

    const seeded = await seed(h, [{ outcome: BLOCKED }], { profile: "quality" });
    const atAllocation = startupBlock(seeded.out);
    expect(atAllocation).toContain("quality (");
    expect(atAllocation).toContain("codex · profile-model");
    expect(atAllocation).toContain("1. spec");

    // Every document the block was resolved from is deleted; the snapshot is
    // the only thing resume has left to render from.
    const runId = await soleRunId(h);
    await fs.rm(path.join(h.configRoot, "pipelines", "standard.json"));
    await fs.rm(path.join(h.configRoot, "profiles", "quality.json"));
    await fs.rm(path.join(h.configRoot, "settings.json"));

    const resumed = await resume(h, runId, standardSteps(h.fixture));
    expect(resumed.code).toBe(0);
    expect(startupBlock(resumed.out)).toBe(atAllocation);
  });

  it("re-prints the unrestricted-permissions warning on resume", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }], { dangerouslySkipPermissions: true });
    const runId = await soleRunId(h);
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.err).toContain("dangerously-skip-permissions");
  });
});

describe.concurrent("resumeCommand — signals during resumed execution (AC-17)", () => {
  it("persists interruption, releases the lock, and returns the conventional code", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const controller = new AbortController();
    const result = await resume(
      h,
      runId,
      [
        {
          before: () => controller.abort(new SignalInterruption("SIGINT")),
          hangUntilAbort: true,
        },
      ],
      {
        createAbortController: () => controller,
        installSignals: fakeSignals(() => null),
      },
    );
    expect(result.code).toBe(EXIT_SIGINT);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.waiting?.reasons[0].kind).toBe("interrupted");
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

describe.concurrent("resumeCommand — scripted harness mode (FR-5, FR-8)", () => {
  it("rejects a non-exact toggle on an unmarked checkpoint before probe or lock", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);
    expect(before.runtime).toEqual({ kind: "real" });

    let probeCalled = false;
    const result = await resume(h, runId, [], {
      env: { ...baseEnv(h), [SCRIPTED_HARNESS_TOGGLE_VAR]: "true" },
      probe: async (...args) => {
        probeCalled = true;
        return okProbe(...args);
      },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_HARNESS_TOGGLE_VAR);
    expect(probeCalled).toBe(false);
    const after = await readCp(h, runId);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it("rejects a marked scripted checkpoint without the toggle before probe or lock", async () => {
    const h = await setup();
    await writeScriptedScenario(
      h.configRoot,
      standardScriptedScenario({ spec: ["outcome-blocked"] }),
    );
    const seeded = await seed(h, [], { env: scriptedEnv(h) });
    expect(seeded.code).toBe(2);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);

    let probeCalled = false;
    const result = await resume(h, runId, [], {
      probe: async (...args) => {
        probeCalled = true;
        return okProbe(...args);
      },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_HARNESS_TOGGLE_VAR);
    expect(probeCalled).toBe(false);
    const after = await readCp(h, runId);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it("refuses to switch a real-runtime checkpoint to scripted mode, before probe or lock", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);
    expect(before.runtime).toEqual({ kind: "real" });
    // A valid live scenario is present, so only the run's own immutable runtime
    // can be what refuses.
    await writeScriptedScenario(
      h.configRoot,
      standardScriptedScenario({
        spec: ["outcome-blocked", "spec-correct"],
      }),
    );

    let probeCalled = false;
    const result = await resume(h, runId, standardSteps(h.fixture), {
      env: scriptedEnv(h),
      probe: async (...args) => {
        probeCalled = true;
        return okProbe(...args);
      },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain("real harness");
    expect(result.err).toContain(SCRIPTED_HARNESS_TOGGLE_VAR);
    expect(probeCalled).toBe(false);
    expect(result.invoker.calls.length).toBe(0);
    const after = await readCp(h, runId);
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(after.runtime).toEqual({ kind: "real" });
  });

  it("pauses with harness-error when the stage case array is exhausted on resume", async () => {
    const h = await setup();
    await writeScriptedScenario(
      h.configRoot,
      standardScriptedScenario({ spec: ["outcome-blocked"] }),
    );
    const seeded = await seed(h, [], { env: scriptedEnv(h) });
    expect(seeded.code).toBe(2);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe("outcome-blocked");

    const result = await resume(h, runId, standardSteps(h.fixture), {
      env: scriptedEnv(h),
    });
    expect(result.code).toBe(2);
    const promptHeading = result.out.indexOf("[DEV] Resolved prompt");
    const promptBody = result.out.indexOf(
      `[DEV] $spec \`${h.fixture.threadRelPath}/\`.`,
    );
    const failure = result.out.indexOf("Stage 1/6 failed");
    expect(result.out.match(/\[DEV\] Resolved prompt/g)).toHaveLength(1);
    expect(promptHeading).toBeGreaterThan(-1);
    expect(promptHeading).toBeLessThan(promptBody);
    expect(failure).toBeGreaterThan(-1);
    expect(promptBody).toBeLessThan(failure);
    expect(result.out).not.toContain("│ ");
    expect(result.out).toContain(`antmay afk resume ${runId}`);
    const cp = await readCp(h, runId);
    expect(cp.waiting?.reasons[0].kind).toBe("harness-error");
    expect(cp.waiting?.reasons[0].message).toContain("provider-error");
    expect(cp.waiting?.reasons[0].message).toContain("exhausted");
    expect(attemptCountAt(cp, 0)).toBe(2);
    expect(cp.attempts[1]?.result).toBe("waiting");
  });

  it("runs spec-correct on attempt 2 after an outcome-blocked pause", async () => {
    const h = await setup();
    const runId = await seedScriptedBlocked(h);
    const result = await resume(h, runId, standardSteps(h.fixture), {
      env: scriptedEnv(h),
    });
    expect(result.code).toBe(0);
    const attemptHeader = result.out.indexOf("Stage 1/6 · spec · attempt 2");
    const nextStageHeader = result.out.indexOf(
      "Stage 2/6 · reconcile-spec",
      attemptHeader,
    );
    const retryOutput = result.out.slice(attemptHeader, nextStageHeader);
    const promptHeading = retryOutput.indexOf("[DEV] Resolved prompt");
    const promptBody = retryOutput.indexOf(
      `[DEV] $spec \`${h.fixture.threadRelPath}/\`.`,
    );
    const transcript = retryOutput.indexOf("│ Writing spec.md.");
    expect(attemptHeader).toBeGreaterThan(-1);
    expect(nextStageHeader).toBeGreaterThan(attemptHeader);
    expect(retryOutput.match(/\[DEV\] Resolved prompt/g)).toHaveLength(1);
    expect(promptHeading).toBeGreaterThan(-1);
    expect(promptHeading).toBeLessThan(promptBody);
    expect(transcript).toBeGreaterThan(-1);
    expect(promptBody).toBeLessThan(transcript);
    const cp = await readCp(h, runId);
    expect(attemptCountAt(cp, 0)).toBe(2);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
  });

  it("requires a valid scenario for no-harness finalization resume paths", async () => {
    const h = await setup();
    await writeScriptedScenario(
      h.configRoot,
      standardScriptedScenario({ spec: ["outcome-done"] }),
    );
    await seed(h, [], { env: scriptedEnv(h) });
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe(
      "stage-contract-violation",
    );
    await fs.rm(path.join(h.configRoot, SCRIPTED_SCENARIO_FILENAME), { force: true });

    const result = await resume(h, runId, standardSteps(h.fixture).slice(1), {
      env: scriptedEnv(h),
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_SCENARIO_FILENAME);
  });

  it("requires a valid scenario for no-call pending-queue resume paths", async () => {
    const h = await setup();
    await writeScriptedScenario(h.configRoot);
    let calls = 0;
    await seed(h, [], {
      env: scriptedEnv(h),
      installSignals: fakeSignals(() => (++calls > 1 ? "SIGINT" : null)),
    });
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).condition).toBe("ready");

    dropPendingSync(h.fixture, "q.md");
    await fs.rm(path.join(h.configRoot, SCRIPTED_SCENARIO_FILENAME), { force: true });

    const result = await resume(h, runId, [], { env: scriptedEnv(h) });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_SCENARIO_FILENAME);
  });
});

describe.concurrent("resumeCommand — persisted-attempt Continue (AC-3.2, AC-3.3)", () => {
  async function seedSessionBackedPause(
    h: Harness,
    sessionId: string,
  ): Promise<string> {
    await seed(h, [
      {
        before: () => dropPendingSync(h.fixture, "q.md"),
        outcome: {
          kind: "completed",
          finalText: "Outcome: BLOCKED — needs a human",
          session: { id: sessionId },
        },
      },
    ]);
    return soleRunId(h);
  }

  it("re-renders the Codex Continue command from the persisted attempt", async () => {
    const h = await setup();
    const runId = await seedSessionBackedPause(h, "codex-sess");
    const cp = await readCp(h, runId);
    expect(cp.attempts[0]?.agentSession).toEqual({ id: "codex-sess" });
    expect(cp.stages[0]?.binding.agent.harness).toBe("codex");

    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    expect(result.out).toContain("Continue:   codex resume 'codex-sess'");
    expect(result.out).toContain("Log:");
    expect(result.out).toMatch(new RegExp(`Resume:\\s+antmay afk resume ${runId}`));
  });

  it("re-renders the Claude Code Continue command from the snapshotted harness", async () => {
    const h = await setup(
      settingsFor({
        spec: { agent: { harness: "claude-code", model: "test-model" } },
      }),
    );
    const runId = await seedSessionBackedPause(h, "claude-sess");
    const cp = await readCp(h, runId);
    expect(cp.stages[0]?.binding.agent.harness).toBe("claude-code");

    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    expect(result.out).toContain("Continue:   claude --resume 'claude-sess'");
  });

  it("quotes a session ID containing a single quote as one shell argument", async () => {
    const h = await setup();
    const runId = await seedSessionBackedPause(h, "foo'bar");
    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    expect(result.out).toContain("Continue:   codex resume 'foo'\\''bar'");
  });

  it("omits Continue when the attempt has no session, keeping Log and Resume", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => dropPendingSync(h.fixture, "q.md"),
        outcome: BLOCKED,
      },
    ]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).attempts[0]?.agentSession).toBeUndefined();

    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    expect(result.out).not.toContain("Continue:");
    expect(result.out).toContain("Log:");
    expect(result.out).toMatch(new RegExp(`Resume:\\s+antmay afk resume ${runId}`));
  });

  it("omits Log and Continue on a pre-attempt pause", async () => {
    const h = await setup();
    let calls = 0;
    await seed(h, standardSteps(h.fixture), {
      installSignals: fakeSignals(() => (++calls > 1 ? "SIGINT" : null)),
    });
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).attempts.length).toBe(0);

    dropPendingSync(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    expect(result.out).not.toContain("Continue:");
    expect(result.out).not.toContain("Log:");
    expect(result.out).toMatch(new RegExp(`Resume:\\s+antmay afk resume ${runId}`));
  });
});
