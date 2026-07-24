import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { Display } from "../display/types.js";
import { nullDisplay } from "../display/types.js";
import type { HarnessInvoker } from "../harness/types.js";
import { readHead } from "../gitops/status.js";
import { standardRecipe } from "../recipe/standard.js";
import { resolveStageTarget } from "../recipe/targets.js";
import type { StageDescriptor } from "../recipe/types.js";
import type { RunCheckpoint } from "../state/checkpoint.js";
import { readCheckpoint, writeCheckpoint } from "../state/persist.js";
import {
  createFakeHarness,
  type FakeHarnessStep,
} from "../test-helpers/fake-harness.js";
import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import type { RunnerContext } from "./runner.js";
import { executeRun } from "./runner.js";
import { SignalInterruption } from "./signals.js";

const fixtures: RepoFixture[] = [];
const runDirs: string[] = [];

afterEach(async () => {
  while (fixtures.length > 0) {
    const fixture = fixtures.pop();
    if (fixture) await fixture.cleanup();
  }
  while (runDirs.length > 0) {
    const dir = runDirs.pop();
    if (dir) {
      await fs.chmod(dir, 0o700).catch(() => undefined);
      await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
});

async function newFixture(): Promise<RepoFixture> {
  const fixture = await createRepoFixture({ thread: {} });
  fixtures.push(fixture);
  return fixture;
}

async function makeRunDir(): Promise<string> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-runner-"));
  runDirs.push(raw);
  return raw;
}

// Synthetic (non-`standard`) descriptors that prove recipe-agnosticism.
const alphaStage: StageDescriptor = {
  id: "alpha",
  skill: "alpha-skill",
  target: { kind: "thread-file", path: "notes.md" },
  gitPolicy: {
    headMayChange: false,
    allowedChanges: [{ kind: "exact-file", threadRelativePath: "notes.md" }],
    changeRequired: true,
    commitSubjectTemplate: "chore(<thread-folder>): alpha",
  },
  queueResolution: "advance",
};

const betaStage: StageDescriptor = {
  id: "beta",
  skill: "beta-skill",
  target: { kind: "thread-file", path: "summary.md" },
  gitPolicy: {
    headMayChange: true,
    allowedChanges: [],
    changeRequired: false,
    commitSubjectTemplate: null,
  },
  queueResolution: "rerun",
};

const cleanStage: StageDescriptor = {
  id: "solo",
  skill: "solo-skill",
  target: { kind: "thread-file", path: "artifact.md" },
  gitPolicy: {
    headMayChange: false,
    allowedChanges: [],
    changeRequired: false,
    commitSubjectTemplate: null,
  },
  queueResolution: "rerun",
};

function buildCheckpoint(
  fixture: RepoFixture,
  stages: StageDescriptor[],
  recipeName = "synthetic",
): RunCheckpoint {
  const threadRelPath = fixture.threadRelPath as string;
  const root = fixture.root;
  const snapshotted = stages.map((descriptor) => {
    const target = resolveStageTarget(descriptor.target, threadRelPath);
    if (!target.ok) throw new Error(target.error);
    return {
      ...descriptor,
      profile: {
        harness: "codex" as const,
        model: "test-model",
        prompt: "",
        idleTimeoutSeconds: 900,
      },
      resolvedTarget: target.path,
    };
  });
  const now = "2026-07-24T00:00:00.000Z";
  return {
    schemaVersion: 1,
    runId: "20260724T000000000Z-0a1b2c3d",
    executor: { pid: 4242, version: "0.1.0" },
    createdAt: now,
    updatedAt: now,
    repoRoot: root,
    threadRelPath,
    workspace: {
      strategy: "current-checkout",
      path: root,
      execution: { cwd: root, sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    recipeName,
    stages: snapshotted,
    observedHarnessVersions: { codex: "codex 1.2.3" },
    stageIndex: 0,
    condition: "ready",
    attempts: [],
    waiting: null,
    gitCursor: { stageIndex: 0, headAtStageEntry: null, observedHead: null },
  };
}

function makeContext(
  checkpoint: RunCheckpoint,
  runDir: string,
  invoker: HarnessInvoker,
  display: Display = nullDisplay,
  signal: AbortSignal = new AbortController().signal,
): RunnerContext {
  return {
    checkpoint,
    runDir,
    stateRoot: path.dirname(runDir),
    lock: { lockPath: "lock", ownerToken: "token", release: async () => undefined },
    invoker,
    display,
    harnessVersions: { codex: "codex 1.2.3" },
    signal,
  };
}

function recorder(): {
  display: Display;
  attemptStarted: Array<Parameters<Display["attemptStarted"]>[0]>;
  stageSucceeded: Array<Parameters<Display["stageSucceeded"]>[0]>;
  runPaused: Array<Parameters<Display["runPaused"]>[0]>;
  runCompleted: Array<Parameters<Display["runCompleted"]>[0]>;
  warns: string[];
} {
  const attemptStarted: Array<Parameters<Display["attemptStarted"]>[0]> = [];
  const stageSucceeded: Array<Parameters<Display["stageSucceeded"]>[0]> = [];
  const runPaused: Array<Parameters<Display["runPaused"]>[0]> = [];
  const runCompleted: Array<Parameters<Display["runCompleted"]>[0]> = [];
  const warns: string[] = [];
  const display: Display = {
    attemptStarted: (info) => attemptStarted.push(info),
    harnessEvent: () => undefined,
    heartbeat: () => undefined,
    stageSucceeded: (info) => stageSucceeded.push(info),
    runPaused: (info) => runPaused.push(info),
    runCompleted: (info) => runCompleted.push(info),
    warn: (message) => warns.push(message),
  };
  return { display, attemptStarted, stageSucceeded, runPaused, runCompleted, warns };
}

async function loadCheckpoint(runDir: string): Promise<RunCheckpoint> {
  const result = await readCheckpoint(runDir);
  if (!result.ok) throw new Error(`checkpoint invalid: ${result.errors.join("; ")}`);
  return result.checkpoint;
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
): Promise<string> {
  const dir = path.join(fixture.threadPath as string, ".pending-decisions");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), "open decision", "utf8");
  return path.posix.join(fixture.threadRelPath as string, ".pending-decisions", name);
}

async function commitCount(fixture: RepoFixture): Promise<number> {
  const result = await fixture.git(["rev-list", "--count", "HEAD"]);
  return Number(result.stdout.trim());
}

async function lastSubject(fixture: RepoFixture): Promise<string> {
  const result = await fixture.git(["log", "-1", "--pretty=%s"]);
  return result.stdout.trim();
}

describe("executeRun — full completion (AC-6.3, AC-13.3)", () => {
  it("runs a synthetic two-stage recipe to completion with per-stage transitions", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);

    const harness = createFakeHarness([
      { before: () => writeThreadFile(fixture, "notes.md", "notes\n") },
      {},
    ]);
    const rec = recorder();
    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [alphaStage, betaStage]), runDir, harness, rec.display),
    );

    expect(result).toEqual({ status: "completed" });
    expect(harness.calls.length).toBe(2);
    expect(rec.stageSucceeded.length).toBe(2);
    expect(rec.runCompleted.length).toBe(1);

    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    expect(cp.stageIndex).toBe(2);
    expect(cp.waiting).toBeNull();
    expect(cp.gitCursor).toEqual({ stageIndex: 2, headAtStageEntry: null, observedHead: null });
    expect(cp.attempts.map((a) => a.result)).toEqual(["done", "done"]);
    expect(cp.attempts.every((a) => a.terminalResult?.token === "DONE")).toBe(true);

    // Stage alpha committed its required change; beta committed nothing.
    expect(await commitCount(fixture)).toBe(before + 1);
    expect(await lastSubject(fixture)).toBe(`chore(${fixture.threadFolder}): alpha`);
  });

  it("runs the standard recipe through the identical code path", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);

    const steps: FakeHarnessStep[] = [
      { before: () => writeThreadFile(fixture, "spec.md", "# Spec\n") },
      {},
      {},
      { before: () => writeThreadFile(fixture, "plan.md", "# Plan\n") },
      {},
      {},
    ];
    const result = await executeRun(
      makeContext(
        buildCheckpoint(fixture, standardRecipe.stages, standardRecipe.name),
        runDir,
        createFakeHarness(steps),
      ),
    );

    expect(result).toEqual({ status: "completed" });
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    expect(cp.stageIndex).toBe(6);
    expect(cp.gitCursor).toEqual({ stageIndex: 6, headAtStageEntry: null, observedHead: null });
    expect(await commitCount(fixture)).toBe(before + 2);
  });
});

describe("executeRun — DONE with a pending-queue pause (AC-11.3, AC-12.1, AC-12.7)", () => {
  it("finalizes the boundary first, records the attempt done, then pauses pending-queues", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    let pendingRel = "";

    const harness = createFakeHarness([
      {
        before: async () => {
          await writeThreadFile(fixture, "notes.md", "notes\n");
          pendingRel = await dropPendingDecision(fixture, "d1.md");
        },
      },
    ]);
    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [alphaStage]), runDir, harness),
    );

    expect(result.status).toBe("paused");
    const commitHead = await readHead(fixture.root);

    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.stageIndex).toBe(0);
    expect(cp.waiting?.kind).toBe("pending-queues");
    expect(cp.waiting?.pendingFiles).toEqual([pendingRel]);
    expect(cp.attempts[0].result).toBe("done");
    expect(cp.attempts[0].terminalResult?.token).toBe("DONE");
    // The executor commit's HEAD is the stored pause-time observation.
    expect(cp.gitCursor.observedHead).toBe(commitHead);
    expect(await lastSubject(fixture)).toBe(`chore(${fixture.threadFolder}): alpha`);
  });
});

describe("executeRun — non-DONE pauses (AC-11.3, AC-12.6, AC-12.7)", () => {
  const cases: Array<{
    name: string;
    step: FakeHarnessStep;
    kind: string;
    candidateLine: string | null;
  }> = [
    {
      name: "BLOCKED",
      step: { outcome: { kind: "completed", finalText: "reasoning\n\nOutcome: BLOCKED — needs a human" } },
      kind: "outcome-blocked",
      candidateLine: "Outcome: BLOCKED — needs a human",
    },
    {
      name: "REFUSED",
      step: { outcome: { kind: "completed", finalText: "Outcome: REFUSED" } },
      kind: "outcome-refused",
      candidateLine: "Outcome: REFUSED",
    },
    {
      name: "malformed",
      step: { outcome: { kind: "completed", finalText: "I wandered off." } },
      kind: "malformed-outcome",
      candidateLine: "I wandered off.",
    },
    {
      name: "idle-timeout",
      step: {
        outcome: {
          kind: "failed",
          category: "idle-timeout",
          errorClass: "IdleTimeout",
          errorMessage: "no output",
        },
      },
      kind: "idle-timeout",
      candidateLine: null,
    },
    {
      name: "provider-error",
      step: {
        outcome: {
          kind: "failed",
          category: "provider-error",
          errorClass: "ProviderError",
          errorMessage: "boom",
        },
      },
      kind: "harness-error",
      candidateLine: null,
    },
  ];

  for (const testCase of cases) {
    it(`pauses ${testCase.name} as waiting with the DR54 warning`, async () => {
      const fixture = await newFixture();
      const runDir = await makeRunDir();
      const headBefore = await readHead(fixture.root);

      const result = await executeRun(
        makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, createFakeHarness([testCase.step])),
      );

      expect(result.status).toBe("paused");
      const cp = await loadCheckpoint(runDir);
      expect(cp.condition).toBe("waiting-for-user");
      expect(cp.waiting?.kind).toBe(testCase.kind);
      expect(cp.waiting?.message).toContain("unvalidated");
      expect(cp.attempts[0].result).toBe("waiting");
      expect(cp.gitCursor.observedHead).toBe(headBefore);
      if (testCase.candidateLine === null) {
        expect(cp.attempts[0].terminalResult).toBeNull();
      } else {
        expect(cp.attempts[0].terminalResult?.candidateLine).toBe(testCase.candidateLine);
      }
    });
  }
});

describe("executeRun — pre-attempt queue gates (AC-11.2, AC-11.5)", () => {
  it("pauses pending-queues before allocating any attempt or log", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const pendingRel = await dropPendingDecision(fixture, "d1.md");
    const harness = createFakeHarness([{}]);

    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );

    expect(result.status).toBe("paused");
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.waiting?.kind).toBe("pending-queues");
    expect(cp.waiting?.pendingFiles).toEqual([pendingRel]);
    expect(cp.attempts.length).toBe(0);
    await expect(fs.access(path.join(runDir, "logs"))).rejects.toThrow();
  });

  it("pauses gate-error when a queue directory cannot be scanned", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    // A regular file where the queue directory is expected makes readdir fail.
    await fs.writeFile(
      path.join(fixture.threadPath as string, ".pending-decisions"),
      "not a directory",
      "utf8",
    );
    const harness = createFakeHarness([{}]);

    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );

    expect(result.status).toBe("paused");
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.kind).toBe("gate-error");
    expect(cp.attempts.length).toBe(0);
  });
});

describe("executeRun — boundary failures preserve the attempt (AC-11.6, AC-12.2, AC-12.4)", () => {
  it("pauses git-policy-violation for an out-of-bounds change", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);

    const harness = createFakeHarness([
      { before: () => writeThreadFile(fixture, "stray.md", "unexpected\n") },
    ]);
    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [alphaStage]), runDir, harness),
    );

    expect(result.status).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.kind).toBe("git-policy-violation");
    expect(cp.waiting?.message).toContain("unvalidated");
    expect(cp.attempts[0].result).toBe("waiting");
    expect(cp.attempts[0].terminalResult?.token).toBe("DONE");
    expect(await commitCount(fixture)).toBe(before);
  });

  it("keeps git-policy-violation with a folded scan diagnostic when the queue scan also fails", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();

    const harness = createFakeHarness([
      {
        before: async () => {
          await writeThreadFile(fixture, "stray.md", "unexpected\n");
          // A file at the queue path makes the post-attempt scan fail.
          await fs.writeFile(
            path.join(fixture.threadPath as string, ".pending-decisions"),
            "not a directory",
            "utf8",
          );
        },
      },
    ]);
    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [alphaStage]), runDir, harness),
    );

    expect(result.status).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.kind).toBe("git-policy-violation");
    expect(cp.waiting?.message).toContain("scan also failed");
    expect(cp.attempts[0].result).toBe("waiting");
  });

  it("pauses commit-error when the executor commit fails", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);
    // A failing pre-commit hook makes finalizeBoundary's commit exit non-zero.
    const hookPath = path.join(fixture.root, ".git", "hooks", "pre-commit");
    await fs.mkdir(path.dirname(hookPath), { recursive: true });
    await fs.writeFile(hookPath, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    await fs.chmod(hookPath, 0o755);

    const harness = createFakeHarness([
      { before: () => writeThreadFile(fixture, "notes.md", "notes\n") },
    ]);
    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [alphaStage]), runDir, harness),
    );

    expect(result.status).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.kind).toBe("commit-error");
    expect(cp.attempts[0].result).toBe("waiting");
    expect(await commitCount(fixture)).toBe(before);
  });
});

describe("executeRun — interruption (AC-17.3)", () => {
  it("records the attempt interrupted when the abort signal fires", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const controller = new AbortController();

    const harness = createFakeHarness([
      { before: () => controller.abort("SIGINT"), hangUntilAbort: true },
    ]);
    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness, nullDisplay, controller.signal),
    );

    expect(result.status).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.kind).toBe("interrupted");
    expect(cp.waiting?.diagnostics?.origin).toBe("SIGINT");
    expect(cp.attempts[0].result).toBe("interrupted");
    expect(cp.waiting?.message).toContain("unvalidated");
  });
});

describe("executeRun — signal interruption (AC-17.1, AC-17.3)", () => {
  it("finishes the reserved attempt interrupted when a signal arrives before launch", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const controller = new AbortController();
    // Abort during attemptStarted: after the executing checkpoint and its log,
    // but before the harness is invoked.
    const display: Display = {
      ...nullDisplay,
      attemptStarted: () => controller.abort(new SignalInterruption("SIGINT")),
    };
    const harness = createFakeHarness([{}]);

    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness, display, controller.signal),
    );

    expect(result).toEqual({ status: "interrupted", signal: "SIGINT" });
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.waiting?.kind).toBe("interrupted");
    expect(cp.waiting?.diagnostics?.origin).toBe("SIGINT");
    expect(cp.attempts.length).toBe(1);
    expect(cp.attempts[0].result).toBe("interrupted");
  });

  it("interrupts a mid-flight attempt, pauses interrupted, preserves the log, and starts nothing new", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const controller = new AbortController();
    const harness = createFakeHarness([
      { before: () => controller.abort(new SignalInterruption("SIGTERM")), hangUntilAbort: true },
      {}, // A second attempt must never start after the first signal.
    ]);

    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness, nullDisplay, controller.signal),
    );

    expect(result).toEqual({ status: "interrupted", signal: "SIGTERM" });
    expect(harness.calls.length).toBe(1);
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.waiting?.kind).toBe("interrupted");
    expect(cp.waiting?.diagnostics?.origin).toBe("SIGTERM");
    expect(cp.waiting?.message).toContain("unvalidated");
    expect(cp.attempts.length).toBe(1);
    expect(cp.attempts[0].result).toBe("interrupted");
    // The attempt's log file survives the interruption.
    await expect(fs.access(path.join(runDir, cp.attempts[0].logPath))).resolves.toBeUndefined();
  });

  it("retains a pending file discovered at interruption while staying kind interrupted", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const controller = new AbortController();
    let pendingRel = "";
    const harness = createFakeHarness([
      {
        before: async () => {
          pendingRel = await dropPendingDecision(fixture, "d1.md");
          controller.abort(new SignalInterruption("SIGINT"));
        },
        hangUntilAbort: true,
      },
    ]);

    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness, nullDisplay, controller.signal),
    );

    expect(result.status).toBe("interrupted");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.kind).toBe("interrupted");
    expect(cp.waiting?.pendingFiles).toEqual([pendingRel]);
    expect(cp.attempts[0].pendingFiles).toEqual([pendingRel]);
  });

  it("stops between stages without touching the ready checkpoint or rendering a pause", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const controller = new AbortController();
    controller.abort(new SignalInterruption("SIGHUP"));

    const checkpoint = buildCheckpoint(fixture, [cleanStage, betaStage]);
    await writeCheckpoint(runDir, checkpoint);
    const before = await fs.readFile(path.join(runDir, "state.json"));

    const rec = recorder();
    const harness = createFakeHarness([{}]);
    const result = await executeRun(
      makeContext(checkpoint, runDir, harness, rec.display, controller.signal),
    );

    expect(result).toEqual({ status: "interrupted", signal: "SIGHUP" });
    expect(harness.calls.length).toBe(0);
    expect(rec.runPaused.length).toBe(0);
    const after = await fs.readFile(path.join(runDir, "state.json"));
    expect(after.equals(before)).toBe(true);
  });
});

describe("executeRun — persistence and log failures (AC-13.3)", () => {
  it("creates no log and launches nothing when the pre-launch checkpoint write fails", async () => {
    const fixture = await newFixture();
    const runDir = path.join(await makeRunDir(), "missing-child");
    const harness = createFakeHarness([{}]);

    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );

    expect(result.status).toBe("fatal-checkpoint");
    expect(harness.calls.length).toBe(0);
    await expect(fs.access(runDir)).rejects.toThrow();
  });

  it("leaves a recoverable executing attempt when the log header cannot be written", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    // A regular file where logs/ must be created makes createAttemptLog fail.
    await fs.writeFile(path.join(runDir, "logs"), "blocker", "utf8");
    const harness = createFakeHarness([{}]);

    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );

    expect(result.status).toBe("fatal-checkpoint");
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("executing");
    expect(cp.attempts[0].result).toBe("executing");
  });

  it("never advances when the post-return checkpoint write fails", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();

    const harness = createFakeHarness([
      { before: () => fs.chmod(runDir, 0o500) },
    ]);
    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );
    await fs.chmod(runDir, 0o700);

    expect(result.status).toBe("fatal-checkpoint");
    const cp = await loadCheckpoint(runDir);
    // The last durable checkpoint is still the executing attempt; no advance.
    expect(cp.condition).toBe("executing");
    expect(cp.stageIndex).toBe(0);
  });
});

describe("executeRun — no artifact preconditions (AC-6.4)", () => {
  it("launches a stage whose target file does not exist", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    // Neither stage's target file exists; both must still launch.
    const harness = createFakeHarness([{}, {}]);

    const result = await executeRun(
      makeContext(buildCheckpoint(fixture, [cleanStage, betaStage]), runDir, harness),
    );

    expect(result.status).toBe("completed");
    expect(harness.calls.length).toBe(2);
  });
});
