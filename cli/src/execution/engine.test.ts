import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import type { ExecutionDisplay, StageDisposition } from "../display/types.js";
import { nullDisplay } from "../display/types.js";
import type { HarnessInvoker } from "../harness/types.js";
import { readHead } from "../gitops/status.js";
import { STAGE_CATALOG } from "../pipeline/catalog.js";
import { resolveStageTarget } from "../pipeline/targets.js";
import type {
  CatalogStageId,
  GitPolicy,
  QueueResolution,
  StageTarget,
} from "../pipeline/types.js";
import type { PartialArtifactState } from "../thread/artifacts.js";
import { inspectArtifactState as inspectArtifactStateOnDisk } from "../thread/artifacts.js";
import type {
  AttemptRecord,
  RunCheckpoint,
  SnapshottedStage,
} from "../state/checkpoint.js";
import { readCheckpoint } from "../state/checkpoint.js";
import { writeCheckpoint } from "../state/persist.js";
import {
  createFakeHarness,
  type FakeHarness,
  type FakeHarnessStep,
} from "../test-helpers/fake-harness.js";
import { governedBy, reordered } from "../test-helpers/waiting.js";
import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import { SignalInterruption } from "../runner/signals.js";
import type { ExecutionContext, ExecutionResult } from "./engine.js";
import { executeEngine } from "./engine.js";

/**
 * Temporary resources are collected for the whole file and released once every
 * case has finished. The cases here run concurrently, so nothing may be torn
 * down between tests: a per-test hook would reach into a repository or run
 * directory another in-flight case is still using.
 */
const fixtures: RepoFixture[] = [];
const runDirs: string[] = [];

afterAll(async () => {
  for (const fixture of fixtures) await fixture.cleanup().catch(() => undefined);
  for (const dir of runDirs) {
    await fs.chmod(dir, 0o700).catch(() => undefined);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function newFixture(): Promise<RepoFixture> {
  const fixture = await createRepoFixture({ thread: {} });
  fixtures.push(fixture);
  return fixture;
}

async function makeRunDir(): Promise<string> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-engine-"));
  runDirs.push(raw);
  return raw;
}

/**
 * A stage the engine drives, described the way a test wants to think about it.
 * The catalog owns the real skill, target, and policies; these fixtures pair a
 * catalog stage ID with synthetic ones so the cases below prove the engine reads
 * only its snapshot and never any particular pipeline's behavior.
 */
type SyntheticStage = {
  id: CatalogStageId;
  skill: string;
  target: StageTarget;
  gitPolicy: GitPolicy;
  queueResolution: QueueResolution;
  /** Both default to the empty pattern, which every artifact state satisfies. */
  prerequisite?: PartialArtifactState;
  promises?: PartialArtifactState;
};

const alphaStage: SyntheticStage = {
  id: "spec",
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

const betaStage: SyntheticStage = {
  id: "review-spec",
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

const cleanStage: SyntheticStage = {
  id: "reconcile-spec",
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

/**
 * One Standard selection taken verbatim from the catalog, which is what the
 * composer hands the engine for a full `standard` document. Every one of these
 * stages has a `fixed` target rule, so the fixture reads the target off the rule
 * rather than simulating artifact state.
 */
const STANDARD_SELECTION: SyntheticStage[] = (
  [
    "spec",
    "reconcile-spec",
    "review-spec",
    "plan-strict",
    "reconcile-plan",
    "implement-plan-with-subagents",
  ] as const
).map((id) => {
  const stage = STAGE_CATALOG[id];
  if (stage.targetRule.kind !== "fixed") {
    throw new Error(`stage ${id} has no fixed target`);
  }
  return {
    id: stage.id,
    skill: stage.skill,
    target: stage.targetRule.target,
    gitPolicy: stage.gitPolicy,
    queueResolution: stage.queueResolution,
  };
});

function buildCheckpoint(
  fixture: RepoFixture,
  stages: SyntheticStage[],
  pipelineName = "synthetic",
): RunCheckpoint {
  const threadRelPath = fixture.threadRelPath as string;
  const root = fixture.root;
  const snapshotted: SnapshottedStage[] = stages.map((descriptor) => {
    const target = resolveStageTarget(descriptor.target, threadRelPath);
    if (!target.ok) throw new Error(target.error);
    return {
      id: descriptor.id,
      skill: descriptor.skill,
      targetRule: { kind: "fixed", target: descriptor.target },
      prerequisite: descriptor.prerequisite ?? {},
      promises: descriptor.promises ?? {},
      gitPolicy: descriptor.gitPolicy,
      queueResolution: descriptor.queueResolution,
      resolvedTarget: target.path,
      binding: {
        agent: { harness: "codex", model: "test-model" },
        idleTimeoutSeconds: 900,
        heartbeatSeconds: 300,
      },
    };
  });
  const now = "2026-07-24T00:00:00.000Z";
  return {
    schemaVersion: 0,
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
    pipelineName,
    pipelineSourcePath: "/tmp/config/pipelines/synthetic.json",
    profileSelection: { kind: "settings-only" },
    stages: snapshotted,
    observedHarnessVersions: { codex: "codex 1.2.3" },
    runtime: { kind: "real" },
    stageIndex: 0,
    condition: "ready",
    attempts: [],
    waiting: null,
  };
}

/**
 * A context entered the way `run` enters it, from a freshly allocated cursor.
 * `resumedFrom` below re-enters the same context the way `resume` does.
 */
function makeContext(
  checkpoint: RunCheckpoint,
  runDir: string,
  invoker: HarnessInvoker,
  display: ExecutionDisplay = nullDisplay,
  signal: AbortSignal = new AbortController().signal,
  persistCheckpoint?: ExecutionContext["persistCheckpoint"],
  inspectArtifactState?: ExecutionContext["inspectArtifactState"],
  readHead?: ExecutionContext["readHead"],
): ExecutionContext {
  return {
    entry: { kind: "allocated", checkpoint },
    runDir,
    invoker,
    display,
    harnessVersions: { codex: "codex 1.2.3" },
    signal,
    persistCheckpoint,
    inspectArtifactState,
    readHead,
  };
}

/** The same context handed over the way `resume` hands over a validated cursor. */
function resumedFrom(ctx: ExecutionContext): ExecutionContext {
  return { ...ctx, entry: { kind: "resume", checkpoint: ctx.entry.checkpoint } };
}

function recorder(): {
  display: ExecutionDisplay;
  attemptStarted: Array<Parameters<ExecutionDisplay["attemptStarted"]>[0]>;
  stageSucceeded: Array<Parameters<ExecutionDisplay["stageSucceeded"]>[0]>;
  stageStopped: Array<Parameters<ExecutionDisplay["stageStopped"]>[0]>;
  runPaused: Array<Parameters<ExecutionDisplay["runPaused"]>[0]>;
  runCompleted: Array<Parameters<ExecutionDisplay["runCompleted"]>[0]>;
  runInterrupted: Array<Parameters<ExecutionDisplay["runInterrupted"]>[0]>;
  runFailed: Array<Parameters<ExecutionDisplay["runFailed"]>[0]>;
  warns: string[];
} {
  const attemptStarted: Array<Parameters<ExecutionDisplay["attemptStarted"]>[0]> = [];
  const stageSucceeded: Array<Parameters<ExecutionDisplay["stageSucceeded"]>[0]> = [];
  const stageStopped: Array<Parameters<ExecutionDisplay["stageStopped"]>[0]> = [];
  const runPaused: Array<Parameters<ExecutionDisplay["runPaused"]>[0]> = [];
  const runCompleted: Array<Parameters<ExecutionDisplay["runCompleted"]>[0]> = [];
  const runInterrupted: Array<Parameters<ExecutionDisplay["runInterrupted"]>[0]> = [];
  const runFailed: Array<Parameters<ExecutionDisplay["runFailed"]>[0]> = [];
  const warns: string[] = [];
  const display: ExecutionDisplay = {
    attemptStarted: (info) => attemptStarted.push(info),
    harnessEvent: () => undefined,
    heartbeat: () => undefined,
    stageSucceeded: (info) => stageSucceeded.push(info),
    stageStopped: (info) => stageStopped.push(info),
    runPaused: (info) => runPaused.push(info),
    runCompleted: (info) => runCompleted.push(info),
    runInterrupted: (info) => runInterrupted.push(info),
    runFailed: (info) => runFailed.push(info),
    warn: (message) => warns.push(message),
  };
  return {
    display,
    attemptStarted,
    stageSucceeded,
    stageStopped,
    runPaused,
    runCompleted,
    runInterrupted,
    runFailed,
    warns,
  };
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

/**
 * A stage that promises a spec and commits exactly that file. A `DONE` attempt
 * leaving no `spec.md` therefore pauses on the stage contract with the completed
 * attempt preserved, which is the only way into a `recheck-stage-contract`
 * recovery.
 */
const promisingStage: SyntheticStage = {
  id: "spec",
  skill: "promise-skill",
  target: { kind: "thread-file", path: "spec.md" },
  promises: { spec: true },
  gitPolicy: {
    headMayChange: false,
    allowedChanges: [{ kind: "exact-file", threadRelativePath: "spec.md" }],
    changeRequired: true,
    commitSubjectTemplate: "chore(<thread-folder>): promise",
  },
  queueResolution: "advance",
};

const BLOCKED_OUTCOME: FakeHarnessStep = {
  outcome: { kind: "completed", finalText: "Outcome: BLOCKED — needs a human" },
};

/** Every attempt this stage recorded, so a case can prove none was added. */
function attemptsAt(cp: RunCheckpoint, stageIndex: number): AttemptRecord[] {
  return cp.attempts.filter((attempt) => attempt.stageIndex === stageIndex);
}

/**
 * Drive one run from a freshly allocated cursor, the way `run` does, so the state
 * a later resume reads is one the engine itself wrote and the validator accepts.
 */
async function allocatedRun(
  fixture: RepoFixture,
  runDir: string,
  stages: SyntheticStage[],
  steps: FakeHarnessStep[],
): Promise<ExecutionResult> {
  return executeEngine(
    makeContext(buildCheckpoint(fixture, stages), runDir, createFakeHarness(steps)),
  );
}

/**
 * Hand the run directory's own durable checkpoint back to the engine the way
 * `resume` does: nothing of the first invocation survives except what it wrote.
 * `checkpoint` substitutes a variant of that document for a case that is about the
 * document rather than about the run.
 */
async function resumeFromDisk(
  runDir: string,
  steps: FakeHarnessStep[],
  overrides: {
    checkpoint?: RunCheckpoint;
    display?: ExecutionDisplay;
    signal?: AbortSignal;
    persistCheckpoint?: ExecutionContext["persistCheckpoint"];
    inspectArtifactState?: ExecutionContext["inspectArtifactState"];
    readHead?: ExecutionContext["readHead"];
  } = {},
): Promise<{ result: ExecutionResult; harness: FakeHarness; cursor: RunCheckpoint }> {
  const cursor = overrides.checkpoint ?? (await loadCheckpoint(runDir));
  const harness = createFakeHarness(steps);
  const result = await executeEngine(
    resumedFrom(
      makeContext(
        cursor,
        runDir,
        harness,
        overrides.display,
        overrides.signal,
        overrides.persistCheckpoint,
        overrides.inspectArtifactState,
        overrides.readHead,
      ),
    ),
  );
  return { result, harness, cursor };
}

describe.concurrent("executeEngine — abandoned executing recovery (AC-1.4, AC-15.4)", () => {
  it("settles the exact abandoned attempt, then retries its stage", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [cleanStage], [BLOCKED_OUTCOME]);

    // Rewrite the pause into the state an executor that vanished mid-attempt
    // leaves: the attempt is live, so it carries no ending and no post-attempt
    // observation yet.
    const paused = await loadCheckpoint(runDir);
    const live = { ...paused.attempts[0]! } as Record<string, unknown>;
    live.result = "executing";
    live.terminalResult = null;
    delete live.endedAt;
    delete live.failure;
    delete live.headAfterAttempt;
    await writeCheckpoint(runDir, {
      ...paused,
      condition: "executing",
      waiting: null,
      attempts: [live as unknown as AttemptRecord],
    });

    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result).toEqual({ kind: "completed" });
    const cp = await loadCheckpoint(runDir);
    const attempts = attemptsAt(cp, 0);
    expect(attempts.map((a) => a.result)).toEqual(["interrupted", "done"]);
    // The abandoned attempt settles here, so this is where it acquires the
    // post-attempt observation every settled attempt carries.
    expect(attempts[0]?.headAfterAttempt).toBe(await readHead(fixture.root));
    expect(attempts[0]?.failure?.message).toContain("manual-recovery");
    expect(harness.calls.length).toBe(1);
  });

  it("reports a fatal checkpoint error and launches nothing when that recovery cannot persist", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [cleanStage], [BLOCKED_OUTCOME]);
    const paused = await loadCheckpoint(runDir);
    const live = { ...paused.attempts[0]! } as Record<string, unknown>;
    live.result = "executing";
    live.terminalResult = null;
    delete live.endedAt;
    delete live.failure;
    delete live.headAfterAttempt;
    const executing: RunCheckpoint = {
      ...paused,
      condition: "executing",
      waiting: null,
      attempts: [live as unknown as AttemptRecord],
    };
    await writeCheckpoint(runDir, executing);

    const rec = recorder();
    const { result, harness } = await resumeFromDisk(runDir, [{}], {
      display: rec.display,
      persistCheckpoint: async () => {
        throw new Error("state root is read-only");
      },
    });

    expect(result).toEqual({
      kind: "fatal-checkpoint",
      message: "state root is read-only",
    });
    expect(rec.runFailed.length).toBe(1);
    expect(harness.calls.length).toBe(0);
    expect((await loadCheckpoint(runDir)).condition).toBe("executing");
  });
});

describe.concurrent("executeEngine — guarded HEAD observations (AC-6.5, AC-6.6, AC-6.9)", () => {
  const unreadableHead: NonNullable<ExecutionContext["readHead"]> = async () => {
    throw new Error("synthetic rev-parse failure");
  };

  it("refuses an abandoned-attempt HEAD failure without changing its checkpoint", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [cleanStage], [BLOCKED_OUTCOME]);
    const paused = await loadCheckpoint(runDir);
    const live = { ...paused.attempts[0]! } as Record<string, unknown>;
    live.result = "executing";
    live.terminalResult = null;
    delete live.endedAt;
    delete live.failure;
    delete live.headAfterAttempt;
    await writeCheckpoint(runDir, {
      ...paused,
      condition: "executing",
      waiting: null,
      attempts: [live as unknown as AttemptRecord],
    });
    const before = await fs.readFile(path.join(runDir, "state.json"), "utf8");

    const { result, harness } = await resumeFromDisk(runDir, [{}], {
      readHead: unreadableHead,
    });

    expect(result).toEqual({
      kind: "refused",
      message: `Cannot read Git HEAD at ${fixture.root}: synthetic rev-parse failure`,
    });
    expect(harness.calls).toHaveLength(0);
    expect(await fs.readFile(path.join(runDir, "state.json"), "utf8")).toBe(
      before,
    );
  });

  it("refuses an attempt-start HEAD failure before reserving an attempt", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const checkpoint = buildCheckpoint(fixture, [cleanStage]);
    await writeCheckpoint(runDir, checkpoint);
    const before = await fs.readFile(path.join(runDir, "state.json"), "utf8");
    const harness = createFakeHarness([{}]);

    const result = await executeEngine(
      makeContext(
        checkpoint,
        runDir,
        harness,
        nullDisplay,
        undefined,
        undefined,
        undefined,
        unreadableHead,
      ),
    );

    expect(result).toEqual({
      kind: "refused",
      message: `Cannot read Git HEAD at ${fixture.root}: synthetic rev-parse failure`,
    });
    expect(harness.calls).toHaveLength(0);
    expect(await fs.readFile(path.join(runDir, "state.json"), "utf8")).toBe(
      before,
    );
  });

  it("leaves a post-attempt read failure abandoned until Git is readable", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const checkpoint = buildCheckpoint(fixture, [cleanStage]);
    await writeCheckpoint(runDir, checkpoint);
    let reads = 0;
    const failAfterStart: NonNullable<ExecutionContext["readHead"]> = async (
      repoRoot,
    ) => {
      reads += 1;
      if (reads === 1) return readHead(repoRoot);
      throw new Error("synthetic post-attempt failure");
    };
    let executingBytes = "";
    const harness = createFakeHarness([
      {
        before: async () => {
          executingBytes = await fs.readFile(
            path.join(runDir, "state.json"),
            "utf8",
          );
        },
      },
    ]);

    const failed = await executeEngine(
      makeContext(
        checkpoint,
        runDir,
        harness,
        nullDisplay,
        undefined,
        undefined,
        undefined,
        failAfterStart,
      ),
    );

    expect(failed.kind).toBe("refused");
    if (failed.kind !== "refused") return;
    expect(failed.message).toContain(fixture.root);
    expect(failed.message).toContain("synthetic post-attempt failure");
    expect(failed.message).toContain(
      `antmay afk resume ${checkpoint.runId}`,
    );
    expect(await fs.readFile(path.join(runDir, "state.json"), "utf8")).toBe(
      executingBytes,
    );
    const abandoned = await loadCheckpoint(runDir);
    expect(abandoned.condition).toBe("executing");
    expect(abandoned.attempts[0]).toMatchObject({ result: "executing" });
    expect(abandoned.attempts[0]?.headAfterAttempt).toBeUndefined();

    const stillUnreadableBefore = await fs.readFile(
      path.join(runDir, "state.json"),
      "utf8",
    );
    const stillUnreadable = await resumeFromDisk(runDir, [{}], {
      readHead: unreadableHead,
    });
    expect(stillUnreadable.result.kind).toBe("refused");
    expect(stillUnreadable.harness.calls).toHaveLength(0);
    expect(await fs.readFile(path.join(runDir, "state.json"), "utf8")).toBe(
      stillUnreadableBefore,
    );

    const recovered = await resumeFromDisk(runDir, [{}]);
    expect(recovered.result).toEqual({ kind: "completed" });
    expect(recovered.harness.calls).toHaveLength(1);
    const completed = await loadCheckpoint(runDir);
    expect(completed.attempts.map((attempt) => attempt.result)).toEqual([
      "interrupted",
      "done",
    ]);
    expect(completed.attempts[0]?.headAfterAttempt).toBe(
      await readHead(fixture.root),
    );
  });
});

describe.concurrent("executeEngine — recovery-sensitive worktree rule (AC-1.4)", () => {
  it("refuses a dirty worktree for a retry-stage pause without touching the cursor", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [cleanStage], [BLOCKED_OUTCOME]);
    const before = await fs.readFile(path.join(runDir, "state.json"), "utf8");
    await fs.writeFile(path.join(fixture.root, "stray.txt"), "dirty\n", "utf8");

    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result.kind).toBe("refused");
    expect(result.kind === "refused" && result.message).toContain("is not clean");
    expect(harness.calls.length).toBe(0);
    expect(await fs.readFile(path.join(runDir, "state.json"), "utf8")).toBe(before);
  });
});

describe.concurrent("executeEngine — queue gates on a resumed pause (AC-1.4, AC-3.1)", () => {
  it("leaves a held pause byte-for-byte unchanged while a bundle is still there", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    let pendingRel = "";
    await allocatedRun(fixture, runDir, [cleanStage], [
      {
        before: async () => {
          pendingRel = await dropPendingDecision(fixture, "d1.md");
        },
        outcome: BLOCKED_OUTCOME.outcome,
      },
    ]);
    const before = await fs.readFile(path.join(runDir, "state.json"), "utf8");

    const rec = recorder();
    const { result, harness } = await resumeFromDisk(runDir, [{}], {
      display: rec.display,
    });

    expect(result.kind).toBe("paused");
    expect(harness.calls.length).toBe(0);
    // The printed list comes from a fresh scan; the durable pause is untouched.
    expect(rec.runPaused.length).toBe(1);
    expect(
      rec.runPaused[0]?.waiting.reasons.find((r) => r.kind === "pending-queues")
        ?.pendingFiles,
    ).toEqual([pendingRel]);
    expect(await fs.readFile(path.join(runDir, "state.json"), "utf8")).toBe(before);
  });

  it("releases the same stage for a fresh attempt once the bundle is gone", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const pendingRel = path.join(
      fixture.threadPath as string,
      ".pending-decisions",
      "d1.md",
    );
    await allocatedRun(fixture, runDir, [cleanStage], [
      {
        before: async () => {
          await dropPendingDecision(fixture, "d1.md");
        },
        outcome: BLOCKED_OUTCOME.outcome,
      },
    ]);
    await fs.rm(pendingRel);

    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result).toEqual({ kind: "completed" });
    expect(harness.calls.length).toBe(1);
    expect(attemptsAt(await loadCheckpoint(runDir), 0).length).toBe(2);
  });

  it("replaces a retry-stage pause's reasons with a gate-error, keeping its recovery", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [cleanStage], [BLOCKED_OUTCOME]);
    // A regular file where a queue directory belongs makes the scan fail with
    // ENOTDIR. It is ignored so the worktree stays clean.
    await fs.appendFile(
      path.join(fixture.root, ".gitignore"),
      ".pending-reviews\n",
      "utf8",
    );
    await fixture.git(["add", "--", ".gitignore"]);
    await fixture.git(["commit", "-m", "chore: ignore the queue path"]);
    await fs.writeFile(
      path.join(fixture.threadPath as string, ".pending-reviews"),
      "not a directory",
      "utf8",
    );

    const before = await loadCheckpoint(runDir);
    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result.kind).toBe("paused");
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons.map((r) => r.kind)).toEqual(["gate-error"]);
    // What the pause explains has moved on; what a later resume may do has not.
    expect(cp.waiting?.recovery).toEqual({ kind: "retry-stage" });
    expect(cp.waiting?.nextAction).toBe(before.waiting?.nextAction);
    expect(cp.waiting?.nextAction).toContain("unvalidated");
  });

  it("keeps one separate scan error and a stable checkpoint across repeated failures", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [alphaStage], [
      {
        before: async () => {
          await writeThreadFile(fixture, "notes.md", "notes\n");
          await fs.writeFile(path.join(fixture.root, "stray.txt"), "x", "utf8");
        },
      },
    ]);
    const paused = await loadCheckpoint(runDir);
    expect(paused.waiting?.recovery.kind).toBe("retry-git-finalization");
    const recovery = paused.waiting?.recovery;
    const governing = paused.waiting?.reasons[0];
    await fs.writeFile(
      path.join(fixture.threadPath as string, ".pending-reviews"),
      "not a directory",
      "utf8",
    );

    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result.kind).toBe("paused");
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0]).toEqual(governing);
    expect(cp.waiting?.reasons.map((reason) => reason.kind)).toEqual([
      "git-policy-violation",
      "gate-error",
    ]);
    expect(cp.waiting?.recovery).toEqual(recovery);
    const afterFirst = await fs.readFile(path.join(runDir, "state.json"), "utf8");

    const repeated = await resumeFromDisk(runDir, [{}]);
    expect(repeated.result.kind).toBe("paused");
    expect(repeated.harness.calls).toHaveLength(0);
    const afterSecond = await fs.readFile(path.join(runDir, "state.json"), "utf8");
    expect(afterSecond).toBe(afterFirst);
    expect(
      (await loadCheckpoint(runDir)).waiting?.reasons.filter(
        (reason) => reason.kind === "gate-error",
      ),
    ).toHaveLength(1);
  });
});

describe.concurrent("executeEngine — contract recheck on resume (AC-1.4, AC-3.2)", () => {
  /** Pause stage 0 on its promise: the attempt reports DONE and writes nothing. */
  async function pauseOnContract(
    fixture: RepoFixture,
    runDir: string,
  ): Promise<void> {
    await allocatedRun(fixture, runDir, [promisingStage], [{}]);
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-contract-violation");
    expect(cp.waiting?.recovery.kind).toBe("recheck-stage-contract");
  }

  it("returns a typed fatal result when a recovery reference resolves to no attempt", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await pauseOnContract(fixture, runDir);
    const paused = await loadCheckpoint(runDir);
    const malformed: RunCheckpoint = {
      ...paused,
      waiting: {
        ...paused.waiting!,
        recovery: {
          kind: "recheck-stage-contract",
          attempt: { stageIndex: 0, attempt: 99 },
          pausedAtHead: await readHead(fixture.root),
        },
      },
    };
    let persistenceCalls = 0;
    const rec = recorder();

    const { result, harness } = await resumeFromDisk(runDir, [{}], {
      checkpoint: malformed,
      display: rec.display,
      persistCheckpoint: async () => {
        persistenceCalls += 1;
      },
    });

    expect(result).toEqual({
      kind: "fatal-checkpoint",
      message: "The validated checkpoint records no attempt 99 for stage 0.",
    });
    expect(rec.runFailed).toHaveLength(1);
    expect(persistenceCalls).toBe(0);
    expect(harness.calls).toHaveLength(0);
  });

  it("returns a typed fatal result when a finalizable attempt has no settled HEAD", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await pauseOnContract(fixture, runDir);
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    const paused = await loadCheckpoint(runDir);
    const malformedAttempt = { ...paused.attempts[0]! } as Record<string, unknown>;
    delete malformedAttempt.headAfterAttempt;
    const malformed: RunCheckpoint = {
      ...paused,
      attempts: [malformedAttempt as unknown as AttemptRecord],
    };
    let persistenceCalls = 0;
    const rec = recorder();

    const { result, harness } = await resumeFromDisk(runDir, [{}], {
      checkpoint: malformed,
      display: rec.display,
      persistCheckpoint: async () => {
        persistenceCalls += 1;
      },
    });

    expect(result).toEqual({
      kind: "fatal-checkpoint",
      message: "Attempt 1 of stage 0 records no post-attempt HEAD observation.",
    });
    expect(rec.runFailed).toHaveLength(1);
    expect(persistenceCalls).toBe(0);
    expect(harness.calls).toHaveLength(0);
  });

  it("finalizes the preserved DONE from an uncommitted repair, exempt from the clean rule", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await pauseOnContract(fixture, runDir);
    // The repair arrives uncommitted, which is exactly what this pause waits for.
    await writeThreadFile(fixture, "spec.md", "# Spec\n");

    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result).toEqual({ kind: "completed" });
    expect(harness.calls.length).toBe(0);
    expect(await lastSubject(fixture)).toBe(
      `chore(${fixture.threadFolder}): promise`,
    );
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    const attempts = attemptsAt(cp, 0);
    expect(attempts.length).toBe(1);
    expect(attempts[0]?.result).toBe("done");
    // The boundary commit this resume made is the tip the finalized attempt records.
    expect(attempts[0]?.headAfterAttempt).toBe(await readHead(fixture.root));
  });

  it("runs the stage again when the promise is still unmet over a clean worktree", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await pauseOnContract(fixture, runDir);

    const { result, harness } = await resumeFromDisk(runDir, [
      { before: () => writeThreadFile(fixture, "spec.md", "# Spec\n") },
    ]);

    expect(result).toEqual({ kind: "completed" });
    expect(harness.calls.length).toBe(1);
    expect(attemptsAt(await loadCheckpoint(runDir), 0).length).toBe(2);
  });

  it("stays paused on a dirty worktree, restating the unmet promise", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await pauseOnContract(fixture, runDir);
    // Uncommitted work that is not the repair: only a human can say what it is.
    await fs.writeFile(path.join(fixture.root, "stray.txt"), "x", "utf8");

    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result.kind).toBe("paused");
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.stageIndex).toBe(0);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-contract-violation");
    expect(cp.waiting?.reasons[0].detail).toContain("dirty");
    expect(cp.waiting?.reasons[0].contract).toEqual([
      { dimension: "spec", expected: true, observed: false },
    ]);
    expect(cp.waiting?.recovery.kind).toBe("recheck-stage-contract");
    expect(attemptsAt(cp, 0).length).toBe(1);
  });

  it("keeps the canonical uninspectable-promise pause byte-identical on repeated resumes", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    let inspectionCount = 0;
    const inspectArtifactState: NonNullable<
      ExecutionContext["inspectArtifactState"]
    > = async (...args) => {
      inspectionCount += 1;
      if (inspectionCount === 1) {
        return inspectArtifactStateOnDisk(...args);
      }
      return { ok: false, message: "synthetic artifact read failure" };
    };
    const initial = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [promisingStage]),
        runDir,
        createFakeHarness([{}]),
        nullDisplay,
        undefined,
        undefined,
        inspectArtifactState,
      ),
    );
    expect(initial.kind).toBe("paused");
    const initiallyPaused = await loadCheckpoint(runDir);
    const initialReason = initiallyPaused.waiting?.reasons[0];

    const first = await resumeFromDisk(runDir, [{}], {
      inspectArtifactState,
    });
    expect(first.result.kind).toBe("paused");
    expect(first.harness.calls).toHaveLength(0);
    const afterFirst = await fs.readFile(path.join(runDir, "state.json"), "utf8");
    const checkpoint = await loadCheckpoint(runDir);
    expect(checkpoint.waiting?.reasons[0].message).toBe(initialReason?.message);
    expect(checkpoint.waiting?.reasons[0]).toMatchObject({
      kind: "stage-contract-violation",
      message:
        "The stage reported DONE but its promised artifact state could not be " +
        "verified: synthetic artifact read failure",
      diagnostics: { errorMessage: "synthetic artifact read failure" },
    });
    expect(checkpoint.waiting?.reasons[0].message).not.toContain("re-verified");

    const second = await resumeFromDisk(runDir, [{}], {
      inspectArtifactState,
    });
    expect(second.result.kind).toBe("paused");
    expect(second.harness.calls).toHaveLength(0);
    expect(await fs.readFile(path.join(runDir, "state.json"), "utf8")).toBe(
      afterFirst,
    );
  });
});

describe.concurrent("executeEngine — finalized DONE resolutions on resume (AC-3.3)", () => {
  it("advances exactly once, never rerunning the finalized attempt", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [alphaStage], [
      {
        before: async () => {
          await writeThreadFile(fixture, "notes.md", "notes\n");
          await dropPendingDecision(fixture, "d1.md");
        },
      },
    ]);
    const paused = await loadCheckpoint(runDir);
    expect(paused.waiting?.recovery).toMatchObject({
      kind: "resume-finalized-done",
      queueResolution: "advance",
    });
    await fs.rm(
      path.join(fixture.threadPath as string, ".pending-decisions", "d1.md"),
    );

    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result).toEqual({ kind: "completed" });
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    expect(attemptsAt(cp, 0).length).toBe(1);
  });

  it("starts a fresh attempt at the same stage for a declared rerun", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [betaStage], [
      {
        before: async () => {
          await dropPendingDecision(fixture, "d1.md");
        },
      },
    ]);
    const paused = await loadCheckpoint(runDir);
    expect(paused.waiting?.recovery).toMatchObject({
      kind: "resume-finalized-done",
      queueResolution: "rerun",
    });
    await fs.rm(
      path.join(fixture.threadPath as string, ".pending-decisions", "d1.md"),
    );

    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result).toEqual({ kind: "completed" });
    expect(harness.calls.length).toBe(1);
    expect(attemptsAt(await loadCheckpoint(runDir), 0).map((a) => a.result)).toEqual([
      "done",
      "done",
    ]);
  });
});

describe.concurrent("executeEngine — Git finalization retry on resume (AC-3.4, AC-4.3)", () => {
  /** Pause stage 0 on its boundary: the attempt also changed a file outside it. */
  async function pauseOnBoundary(
    fixture: RepoFixture,
    runDir: string,
  ): Promise<void> {
    await allocatedRun(fixture, runDir, [alphaStage], [
      {
        before: async () => {
          await writeThreadFile(fixture, "notes.md", "notes\n");
          await fs.writeFile(path.join(fixture.root, "stray.txt"), "x", "utf8");
        },
      },
    ]);
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(cp.waiting?.recovery.kind).toBe("retry-git-finalization");
  }

  it("redirects a stale promise through contract repair before finalizing", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [promisingStage], [
      {
        before: async () => {
          await writeThreadFile(fixture, "spec.md", "# Spec\n");
          await fs.writeFile(path.join(fixture.root, "stray.txt"), "x", "utf8");
        },
      },
    ]);
    const boundaryPause = await loadCheckpoint(runDir);
    const boundaryRecovery = boundaryPause.waiting?.recovery;
    expect(boundaryRecovery?.kind).toBe("retry-git-finalization");
    if (boundaryRecovery?.kind !== "retry-git-finalization") return;

    await fs.rm(path.join(fixture.threadPath as string, "spec.md"));
    await fs.rm(path.join(fixture.root, "stray.txt"));
    const redirected = await resumeFromDisk(runDir, [{}]);

    expect(redirected.result.kind).toBe("paused");
    expect(redirected.harness.calls).toHaveLength(0);
    const contractPause = await loadCheckpoint(runDir);
    expect(contractPause.waiting?.reasons[0]).toMatchObject({
      kind: "stage-contract-violation",
      contract: [{ dimension: "spec", expected: true, observed: false }],
    });
    expect(contractPause.waiting?.recovery).toEqual({
      kind: "recheck-stage-contract",
      attempt: { stageIndex: 0, attempt: 1 },
      pausedAtHead: boundaryRecovery.pausedAtHead,
    });
    expect(contractPause.waiting?.nextAction).toContain(
      "Repair the promised artifact",
    );

    await writeThreadFile(fixture, "spec.md", "# Repaired spec\n");
    const repaired = await resumeFromDisk(runDir, [{}]);
    expect(repaired.result).toEqual({ kind: "completed" });
    expect(repaired.harness.calls).toHaveLength(0);
    const completed = await loadCheckpoint(runDir);
    expect(completed.attempts).toHaveLength(1);
    expect(completed.attempts[0]?.result).toBe("done");
  });

  it("commits the preserved diff with no harness invocation, then advances", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await pauseOnBoundary(fixture, runDir);
    await fs.rm(path.join(fixture.root, "stray.txt"));

    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result).toEqual({ kind: "completed" });
    expect(harness.calls.length).toBe(0);
    expect(await lastSubject(fixture)).toBe(`chore(${fixture.threadFolder}): alpha`);
    const cp = await loadCheckpoint(runDir);
    const attempts = attemptsAt(cp, 0);
    expect(attempts.length).toBe(1);
    expect(attempts[0]?.result).toBe("done");
    expect(attempts[0]?.headAfterAttempt).toBe(await readHead(fixture.root));
  });

  it("keeps the same attempt finalizable, re-aimed at the fresh tip, when it fails again", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await pauseOnBoundary(fixture, runDir);

    // The out-of-bounds file is still there, so this boundary refuses exactly as
    // the run's did.
    const { result, harness } = await resumeFromDisk(runDir, [{}]);

    expect(result.kind).toBe("paused");
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(cp.waiting?.recovery).toEqual({
      kind: "retry-git-finalization",
      attempt: { stageIndex: 0, attempt: 1 },
      pausedAtHead: await readHead(fixture.root),
    });
    expect(attemptsAt(cp, 0).length).toBe(1);
  });

  it("warns that HEAD moved across the pause without calling it a violation", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await pauseOnBoundary(fixture, runDir);
    await fs.rm(path.join(fixture.root, "stray.txt"));
    await fs.writeFile(path.join(fixture.root, "other.txt"), "y\n", "utf8");
    await fixture.git(["add", "--", "other.txt"]);
    await fixture.git(["commit", "-m", "chore: unrelated"]);

    const rec = recorder();
    const { result } = await resumeFromDisk(runDir, [{}], { display: rec.display });

    expect(result).toEqual({ kind: "completed" });
    expect(rec.warns.join("\n")).toContain("HEAD moved while the run was paused");
  });

  it("decides identically whichever order the pause's reasons are in (AC-2.4)", async () => {
    for (const order of ["as-recorded", "reversed"] as const) {
      const fixture = await newFixture();
      const runDir = await makeRunDir();
      // A boundary refusal that also observed a pending bundle, so the pause has
      // two reasons whose precedence can be swapped.
      await allocatedRun(fixture, runDir, [alphaStage], [
        {
          before: async () => {
            await writeThreadFile(fixture, "notes.md", "notes\n");
            await fs.writeFile(path.join(fixture.root, "stray.txt"), "x", "utf8");
            await dropPendingDecision(fixture, "d1.md");
          },
        },
      ]);
      const paused = await loadCheckpoint(runDir);
      expect(paused.waiting?.reasons.length).toBe(2);
      await fs.rm(path.join(fixture.root, "stray.txt"));
      await fs.rm(
        path.join(fixture.threadPath as string, ".pending-decisions", "d1.md"),
      );

      const cursor: RunCheckpoint =
        order === "as-recorded"
          ? paused
          : { ...paused, waiting: reordered(paused.waiting!) };
      const { result, harness } = await resumeFromDisk(runDir, [{}], {
        checkpoint: cursor,
      });

      expect(result).toEqual({ kind: "completed" });
      expect(harness.calls.length).toBe(0);
      expect(await lastSubject(fixture)).toBe(
        `chore(${fixture.threadFolder}): alpha`,
      );
    }
  });
});

describe.concurrent("executeEngine — signals at the resumed cursor (AC-17.1)", () => {
  it("stops at the durable cursor without recovering, mutating, or rendering a pause", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await allocatedRun(fixture, runDir, [cleanStage], [BLOCKED_OUTCOME]);
    const before = await fs.readFile(path.join(runDir, "state.json"), "utf8");

    const controller = new AbortController();
    controller.abort(new SignalInterruption("SIGINT"));
    const rec = recorder();
    const { result, harness } = await resumeFromDisk(runDir, [{}], {
      display: rec.display,
      signal: controller.signal,
    });

    expect(result).toEqual({ kind: "interrupted", signal: "SIGINT" });
    expect(harness.calls.length).toBe(0);
    expect(rec.runInterrupted.length).toBe(1);
    expect(rec.runPaused.length).toBe(0);
    expect(await fs.readFile(path.join(runDir, "state.json"), "utf8")).toBe(before);
  });
});

describe.concurrent("executeEngine — full completion (AC-6.3, AC-13.3)", () => {
  it("runs a synthetic two-stage pipeline to completion with per-stage transitions", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);

    const harness = createFakeHarness([
      { before: () => writeThreadFile(fixture, "notes.md", "notes\n") },
      {},
    ]);
    const rec = recorder();
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [alphaStage, betaStage]), runDir, harness, rec.display),
    );

    expect(result).toEqual({ kind: "completed" });
    expect(harness.calls.length).toBe(2);
    expect(rec.stageSucceeded.length).toBe(2);
    expect(rec.runCompleted.length).toBe(1);

    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    expect(cp.stageIndex).toBe(2);
    expect(cp.waiting).toBeNull();
    expect(cp.attempts.map((a) => a.result)).toEqual(["done", "done"]);
    // Every settled attempt carries its own start and post-attempt observation.
    expect(cp.attempts.every((a) => a.headAtStart.length > 0)).toBe(true);
    expect(cp.attempts.every((a) => (a.headAfterAttempt ?? "").length > 0)).toBe(true);
    expect(cp.attempts.every((a) => a.terminalResult?.token === "DONE")).toBe(true);

    // Stage alpha committed its required change; beta committed nothing.
    expect(await commitCount(fixture)).toBe(before + 1);
    expect(await lastSubject(fixture)).toBe(`chore(${fixture.threadFolder}): alpha`);
  });

  it("runs the standard pipeline through the identical code path", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);

    const steps: FakeHarnessStep[] = [
      { before: () => writeThreadFile(fixture, "spec.md", "# Spec\n") },
      {},
      {},
      { before: () => writeThreadFile(fixture, "plan.md", "# Plan\n") },
      {},
      {
        before: () =>
          writeThreadFile(fixture, "implementation-report.md", "# Report\n"),
      },
    ];
    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, STANDARD_SELECTION, "standard"),
        runDir,
        createFakeHarness(steps),
      ),
    );

    expect(result).toEqual({ kind: "completed" });
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    expect(cp.stageIndex).toBe(6);
    expect(await commitCount(fixture)).toBe(before + 3);
  });

  it("drives a resume entry through the same loop from its stored cursor", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const checkpoint = buildCheckpoint(fixture, [alphaStage, betaStage]);
    // The first stage is already behind this cursor, so only the second runs.
    checkpoint.stageIndex = 1;

    const harness = createFakeHarness([{}]);
    const result = await executeEngine(
      resumedFrom(makeContext(checkpoint, runDir, harness)),
    );

    expect(result).toEqual({ kind: "completed" });
    expect(harness.calls.map((call) => call.stage.id)).toEqual(["review-spec"]);
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    expect(cp.stageIndex).toBe(2);
  });
});

describe.concurrent("executeEngine — DONE with a pending-queue pause (AC-11.3, AC-12.1, AC-12.7)", () => {
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
    const rec = recorder();
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [alphaStage]), runDir, harness, rec.display),
    );

    expect(result.kind).toBe("paused");
    // The stage reported DONE and its boundary committed: it succeeded, and only
    // the pending bundle keeps the run from advancing.
    expect(rec.stageSucceeded.length).toBe(1);
    expect(rec.stageStopped.length).toBe(0);
    const commitHead = await readHead(fixture.root);

    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.stageIndex).toBe(0);
    expect(cp.waiting?.reasons[0].kind).toBe("pending-queues");
    expect(cp.waiting?.reasons[0].pendingFiles).toEqual([pendingRel]);
    expect(cp.attempts[0].result).toBe("done");
    expect(cp.attempts[0].terminalResult?.token).toBe("DONE");
    // The executor commit's HEAD is the attempt's post-attempt observation, and
    // the finalized DONE is what releasing the queue resolves against.
    expect(cp.attempts[0].headAfterAttempt).toBe(commitHead);
    expect(cp.waiting?.recovery).toEqual({
      kind: "resume-finalized-done",
      attempt: { stageIndex: 0, attempt: 1 },
      queueResolution: "advance",
    });
    expect(await lastSubject(fixture)).toBe(`chore(${fixture.threadFolder}): alpha`);
  });
});

describe.concurrent("executeEngine — non-DONE pauses (AC-11.3, AC-12.6, AC-12.7)", () => {
  const cases: Array<{
    name: string;
    step: FakeHarnessStep;
    kind: string;
    disposition: StageDisposition;
    candidateLine: string | null;
  }> = [
    {
      name: "BLOCKED",
      step: { outcome: { kind: "completed", finalText: "reasoning\n\nOutcome: BLOCKED — needs a human" } },
      kind: "outcome-blocked",
      disposition: "blocked",
      candidateLine: "Outcome: BLOCKED — needs a human",
    },
    {
      name: "REFUSED",
      step: { outcome: { kind: "completed", finalText: "Outcome: REFUSED" } },
      kind: "outcome-refused",
      disposition: "refused",
      candidateLine: "Outcome: REFUSED",
    },
    {
      name: "malformed",
      step: { outcome: { kind: "completed", finalText: "I wandered off." } },
      kind: "malformed-outcome",
      disposition: "failed",
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
      disposition: "failed",
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
      disposition: "failed",
      candidateLine: null,
    },
  ];

  for (const testCase of cases) {
    it(`pauses ${testCase.name} as waiting with the unvalidated-changes warning`, async () => {
      const fixture = await newFixture();
      const runDir = await makeRunDir();
      const headBefore = await readHead(fixture.root);

      const rec = recorder();
      const result = await executeEngine(
        makeContext(
          buildCheckpoint(fixture, [cleanStage]),
          runDir,
          createFakeHarness([testCase.step]),
          rec.display,
        ),
      );

      expect(result.kind).toBe("paused");
      expect(rec.stageSucceeded.length).toBe(0);
      // The stage line reports what the stage itself did, independently of the
      // reason that governs the run's pause.
      expect(rec.stageStopped.map((s) => s.disposition)).toEqual([
        testCase.disposition,
      ]);
      const cp = await loadCheckpoint(runDir);
      expect(cp.condition).toBe("waiting-for-user");
      expect(cp.waiting?.reasons[0].kind).toBe(testCase.kind);
      expect(cp.waiting?.nextAction).toContain("unvalidated");
      expect(cp.attempts[0].result).toBe("waiting");
      expect(cp.attempts[0].headAfterAttempt).toBe(headBefore);
      // No boundary was reached, so there is nothing to finalize: the stage runs
      // again once the human has dealt with the attempt's changes.
      expect(cp.waiting?.recovery).toEqual({ kind: "retry-stage" });
      if (testCase.candidateLine === null) {
        expect(cp.attempts[0].terminalResult).toBeNull();
      } else {
        expect(cp.attempts[0].terminalResult?.candidateLine).toBe(testCase.candidateLine);
      }
    });
  }
});

describe.concurrent("executeEngine — pre-attempt queue gates (AC-11.2, AC-11.5)", () => {
  it("pauses pending-queues before allocating any attempt or log", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const pendingRel = await dropPendingDecision(fixture, "d1.md");
    const harness = createFakeHarness([{}]);

    const rec = recorder();
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness, rec.display),
    );

    expect(result.kind).toBe("paused");
    expect(harness.calls.length).toBe(0);
    // No attempt was announced, so no stage is closed: only the run-level pause.
    expect(rec.attemptStarted.length).toBe(0);
    expect(rec.stageStopped.length).toBe(0);
    expect(rec.stageSucceeded.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.waiting?.reasons[0].kind).toBe("pending-queues");
    expect(cp.waiting?.reasons[0].pendingFiles).toEqual([pendingRel]);
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

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );

    expect(result.kind).toBe("paused");
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0].kind).toBe("gate-error");
    expect(cp.attempts.length).toBe(0);
  });
});

describe.concurrent("executeEngine — boundary failures preserve the attempt (AC-11.6, AC-12.2, AC-12.4)", () => {
  it("pauses unexpected HEAD movement advisorily, then accepts it on resume", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const headAtStart = await readHead(fixture.root);
    const rec = recorder();
    const harness = createFakeHarness([
      {
        before: async () => {
          await writeThreadFile(fixture, "notes.md", "committed by the stage\n");
          await fixture.git(["add", "-A"]);
          await fixture.git(["commit", "-m", "chore: stage-owned commit"]);
        },
      },
    ]);

    const first = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [alphaStage]),
        runDir,
        harness,
        rec.display,
      ),
    );

    expect(first.kind).toBe("paused");
    const paused = await loadCheckpoint(runDir);
    const headAfterAttempt = await readHead(fixture.root);
    expect(paused.waiting?.reasons[0]).toMatchObject({
      kind: "unexpected-head-movement",
    });
    expect(paused.waiting?.reasons[0].message).toContain(headAtStart);
    expect(paused.waiting?.reasons[0].message).toContain(headAfterAttempt);
    expect(paused.waiting?.nextAction).toContain(
      "will not block the next resume",
    );
    expect(paused.waiting?.nextAction).not.toContain("unvalidated");
    expect(paused.waiting?.recovery).toEqual({
      kind: "retry-git-finalization",
      attempt: { stageIndex: 0, attempt: 1 },
      pausedAtHead: headAfterAttempt,
    });
    expect(rec.stageStopped[0]?.disposition).toBe("paused");

    const resumed = await resumeFromDisk(runDir, []);
    expect(resumed.result).toEqual({ kind: "completed" });
    expect(resumed.harness.calls).toHaveLength(0);
    const completed = await loadCheckpoint(runDir);
    expect(completed.condition).toBe("completed");
    expect(completed.attempts[0]?.result).toBe("done");
  });

  it("pauses git-policy-violation for an out-of-bounds change", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);

    const harness = createFakeHarness([
      { before: () => writeThreadFile(fixture, "stray.md", "unexpected\n") },
    ]);
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [alphaStage]), runDir, harness),
    );

    expect(result.kind).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(cp.waiting?.nextAction).toContain("unvalidated");
    expect(cp.attempts[0].result).toBe("waiting");
    expect(cp.attempts[0].terminalResult?.token).toBe("DONE");
    expect(await commitCount(fixture)).toBe(before);
  });

  it("keeps git-policy-violation governing and records the failed scan as its own reason when the queue scan also fails", async () => {
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
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [alphaStage]), runDir, harness),
    );

    expect(result.kind).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    // The boundary still decides the resume path, and the scan failure it holds
    // alongside is reported rather than folded into the boundary's own message.
    expect(cp.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(cp.waiting?.reasons?.map((reason) => reason.kind)).toEqual([
      "git-policy-violation",
      "gate-error",
    ]);
    expect(
      cp.waiting?.reasons?.find((reason) => reason.kind === "gate-error")?.message,
    ).toContain("pending-queue scan failed");
    expect(cp.attempts[0].result).toBe("waiting");
  });

  it("pauses commit-error when the executor commit fails", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);
    // A failing pre-commit hook makes the boundary's commit exit non-zero.
    const hookPath = path.join(fixture.root, ".git", "hooks", "pre-commit");
    await fs.mkdir(path.dirname(hookPath), { recursive: true });
    await fs.writeFile(hookPath, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    await fs.chmod(hookPath, 0o755);

    const harness = createFakeHarness([
      { before: () => writeThreadFile(fixture, "notes.md", "notes\n") },
    ]);
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [alphaStage]), runDir, harness),
    );

    expect(result.kind).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0].kind).toBe("commit-error");
    expect(cp.attempts[0].result).toBe("waiting");
    expect(await commitCount(fixture)).toBe(before);
  });
});

describe.concurrent("executeEngine — artifact contracts (AC-7.1, AC-7.2, AC-7.3)", () => {
  /** Requires a spec in the thread; it promises nothing of its own. */
  const needsSpecStage: SyntheticStage = {
    id: "reconcile-spec",
    skill: "needs-spec-skill",
    target: { kind: "thread-file", path: "spec.md" },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [{ kind: "exact-file", threadRelativePath: "spec.md" }],
      changeRequired: false,
      commitSubjectTemplate: null,
    },
    queueResolution: "rerun",
    prerequisite: { validThread: true, spec: true },
  };

  /** Promises a spec, so a DONE that leaves none violates its contract. */
  const promisesSpecStage: SyntheticStage = {
    id: "spec",
    skill: "promises-spec-skill",
    target: { kind: "thread-root" },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [{ kind: "exact-file", threadRelativePath: "spec.md" }],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): spec",
    },
    queueResolution: "advance",
    promises: { spec: true },
  };

  it("pauses on the stage without an attempt, log, or harness call when the prerequisite is unmet", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const harness = createFakeHarness([{}]);

    const rec = recorder();
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [needsSpecStage]), runDir, harness, rec.display),
    );

    expect(result.kind).toBe("paused");
    expect(harness.calls.length).toBe(0);
    expect(rec.attemptStarted.length).toBe(0);
    expect(rec.stageStopped.length).toBe(0);
    expect(rec.runPaused[0]!.logAbsPath).toBeNull();
    expect(rec.runPaused[0]!.currentStage).toEqual({
      id: "reconcile-spec",
      position: 1,
      count: 1,
    });
    await expect(fs.access(path.join(runDir, "logs"))).rejects.toThrow();

    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.stageIndex).toBe(0);
    expect(cp.attempts.length).toBe(0);
    expect(cp.waiting?.reasons.map((reason) => reason.kind)).toEqual([
      "stage-prerequisite-unmet",
    ]);
    // The pause names what was required and what the thread actually held.
    expect(cp.waiting?.reasons[0].contract).toEqual([
      { dimension: "spec", expected: true, observed: false },
    ]);
    expect(cp.waiting?.reasons[0].message).toContain("a non-empty spec.md");
    expect(cp.waiting?.reasons[0].message).toContain("no spec.md");
    expect(cp.waiting?.reasons[0].message).not.toContain("spec = ");
    expect(cp.waiting?.nextAction).toBe(
      "Fix the thread files shown above and leave the worktree clean, then resume.",
    );
  });

  it("launches the stage once the required artifact state is present", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    const harness = createFakeHarness([{}]);

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [needsSpecStage]), runDir, harness),
    );

    expect(result.kind).toBe("completed");
    expect(harness.calls.length).toBe(1);
  });

  it("re-inspects state per attempt, so a stage runnable at entry can still be refused later", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    // Stage 1 requires the spec that stage 0's attempt deletes.
    const harness = createFakeHarness([
      { before: () => fs.rm(path.join(fixture.threadPath as string, "spec.md")) },
      {},
    ]);
    const rec = recorder();

    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [betaStage, needsSpecStage]),
        runDir,
        harness,
        rec.display,
      ),
    );

    expect(result.kind).toBe("paused");
    expect(harness.calls.length).toBe(1);
    expect(rec.runPaused[0]!.currentStage).toEqual({
      id: "reconcile-spec",
      position: 2,
      count: 2,
    });
    const cp = await loadCheckpoint(runDir);
    expect(cp.stageIndex).toBe(1);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-prerequisite-unmet");
    expect(cp.attempts.length).toBe(1);
  });

  it("pauses stage-contract-violation when a DONE leaves the promised artifact absent", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);
    const headBefore = await readHead(fixture.root);
    const harness = createFakeHarness([{}]);

    const rec = recorder();
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [promisesSpecStage]), runDir, harness, rec.display),
    );

    expect(result.kind).toBe("paused");
    expect(rec.stageSucceeded.length).toBe(0);
    expect(rec.stageStopped.map((s) => s.disposition)).toEqual(["failed"]);

    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.stageIndex).toBe(0);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-contract-violation");
    expect(cp.waiting?.reasons[0].contract).toEqual([
      { dimension: "spec", expected: true, observed: false },
    ]);
    // The promised-state sentence names the file the same way the rows do.
    expect(cp.waiting?.reasons[0].message).toContain("a non-empty spec.md");
    expect(cp.waiting?.reasons[0].message).toContain("no spec.md");
    expect(cp.waiting?.nextAction).toBe(
      "Repair the promised artifact and resume to finalize the completed attempt, " +
        "or revert the attempt's unvalidated changes and resume to run the stage again.",
    );
    // The completed attempt is preserved with its DONE, and its evidence is
    // what a later repaired resume finalizes from.
    expect(cp.attempts[0].result).toBe("waiting");
    expect(cp.attempts[0].terminalResult?.token).toBe("DONE");
    expect(cp.attempts[0].headAtStart).toBe(headBefore);
    expect(cp.attempts[0].headAfterAttempt).toBe(headBefore);
    expect(cp.waiting?.recovery).toEqual({
      kind: "recheck-stage-contract",
      attempt: { stageIndex: 0, attempt: 1 },
      pausedAtHead: headBefore,
    });
    expect(await commitCount(fixture)).toBe(before);
  });

  it("checks the promised state before evaluating the Git boundary", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const before = await commitCount(fixture);
    // The attempt leaves an out-of-bounds change and no spec: both the contract
    // and the boundary would refuse, and the contract is what governs.
    const harness = createFakeHarness([
      { before: () => writeThreadFile(fixture, "stray.md", "unexpected\n") },
    ]);

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [promisesSpecStage]), runDir, harness),
    );

    expect(result.kind).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons.map((reason) => reason.kind)).toEqual([
      "stage-contract-violation",
    ]);
    expect(await commitCount(fixture)).toBe(before);
  });

  it("reports the queue reasons that held alongside a contract violation", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    let pendingRel = "";
    const harness = createFakeHarness([
      { before: async () => { pendingRel = await dropPendingDecision(fixture, "d1.md"); } },
    ]);

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [promisesSpecStage]), runDir, harness),
    );

    expect(result.kind).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons.map((reason) => reason.kind)).toEqual([
      "stage-contract-violation",
      "pending-queues",
    ]);
    expect(cp.waiting?.reasons[1].pendingFiles).toEqual([pendingRel]);
    expect(cp.attempts[0].pendingFiles).toEqual([pendingRel]);
  });

  it("still pauses git-policy-violation when the promise holds but a required change is missing", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    // alphaStage promises nothing, so an empty boundary reaches the Git policy.
    const harness = createFakeHarness([{}]);

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [alphaStage]), runDir, harness),
    );

    expect(result.kind).toBe("paused");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(cp.waiting?.reasons[0].message).toContain("at least one allowed change");
  });
});

describe.concurrent("executeEngine — interruption (AC-17.3)", () => {
  it("records the attempt interrupted when the abort signal fires", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const controller = new AbortController();

    const harness = createFakeHarness([
      { before: () => controller.abort("SIGINT"), hangUntilAbort: true },
    ]);
    const rec = recorder();
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness, rec.display, controller.signal),
    );

    expect(result.kind).toBe("paused");
    // An interrupted stage is stopped, not "finished with problems".
    expect(rec.stageStopped.map((s) => s.disposition)).toEqual(["interrupted"]);
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0].kind).toBe("interrupted");
    expect(cp.waiting?.reasons[0].diagnostics?.origin).toBe("SIGINT");
    expect(cp.attempts[0].result).toBe("interrupted");
    expect(cp.waiting?.nextAction).toContain("unvalidated");
  });
});

describe.concurrent("executeEngine — signal interruption (AC-17.1, AC-17.3)", () => {
  it("finishes the reserved attempt interrupted when a signal arrives before launch", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const controller = new AbortController();
    // Abort during attemptStarted: after the executing checkpoint and its log,
    // but before the harness is invoked.
    const display: ExecutionDisplay = {
      ...nullDisplay,
      attemptStarted: () => controller.abort(new SignalInterruption("SIGINT")),
    };
    const harness = createFakeHarness([{}]);

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness, display, controller.signal),
    );

    expect(result).toEqual({ kind: "interrupted", signal: "SIGINT" });
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.waiting?.reasons[0].kind).toBe("interrupted");
    expect(cp.waiting?.reasons[0].diagnostics?.origin).toBe("SIGINT");
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

    const rec = recorder();
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness, rec.display, controller.signal),
    );

    expect(result).toEqual({ kind: "interrupted", signal: "SIGTERM" });
    expect(harness.calls.length).toBe(1);
    // The announced stage is closed exactly once, naming its real position.
    expect(rec.attemptStarted.length).toBe(1);
    expect(rec.stageStopped.length).toBe(1);
    expect(rec.stageStopped[0].stagePosition).toBe("1/1");
    expect(rec.stageStopped[0].disposition).toBe("interrupted");
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.waiting?.reasons[0].kind).toBe("interrupted");
    expect(cp.waiting?.reasons[0].diagnostics?.origin).toBe("SIGTERM");
    expect(cp.waiting?.nextAction).toContain("unvalidated");
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

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness, nullDisplay, controller.signal),
    );

    expect(result.kind).toBe("interrupted");
    const cp = await loadCheckpoint(runDir);
    expect(cp.waiting?.reasons[0].kind).toBe("interrupted");
    expect(cp.waiting?.reasons[1].pendingFiles).toEqual([pendingRel]);
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
    const result = await executeEngine(
      makeContext(checkpoint, runDir, harness, rec.display, controller.signal),
    );

    expect(result).toEqual({ kind: "interrupted", signal: "SIGHUP" });
    expect(harness.calls.length).toBe(0);
    expect(rec.runPaused.length).toBe(0);
    expect(rec.stageStopped.length).toBe(0);
    const after = await fs.readFile(path.join(runDir, "state.json"));
    expect(after.equals(before)).toBe(true);
  });
});

describe.concurrent("executeEngine — persistence and log failures (AC-13.3)", () => {
  it("creates no log and launches nothing when the pre-launch checkpoint write fails", async () => {
    const fixture = await newFixture();
    const runDir = path.join(await makeRunDir(), "missing-child");
    const harness = createFakeHarness([{}]);

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );

    expect(result.kind).toBe("fatal-checkpoint");
    expect(harness.calls.length).toBe(0);
    await expect(fs.access(runDir)).rejects.toThrow();
  });

  it("leaves a recoverable executing attempt when the log header cannot be written", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    // A regular file where logs/ must be created makes createAttemptLog fail.
    await fs.writeFile(path.join(runDir, "logs"), "blocker", "utf8");
    const harness = createFakeHarness([{}]);

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );

    expect(result.kind).toBe("fatal-checkpoint");
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
    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );
    await fs.chmod(runDir, 0o700);

    expect(result.kind).toBe("fatal-checkpoint");
    const cp = await loadCheckpoint(runDir);
    // The last durable checkpoint is still the executing attempt; no advance.
    expect(cp.condition).toBe("executing");
    expect(cp.stageIndex).toBe(0);
  });
});

describe.concurrent("executeEngine — no artifact preconditions (AC-6.4)", () => {
  it("launches a stage whose target file does not exist", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    // Neither stage's target file exists; both must still launch.
    const harness = createFakeHarness([{}, {}]);

    const result = await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage, betaStage]), runDir, harness),
    );

    expect(result.kind).toBe("completed");
    expect(harness.calls.length).toBe(2);
  });
});

describe.concurrent("executeEngine — live agentSession persistence (AC-2.2–AC-2.5)", () => {
  it("starts exactly one provisional write on first live capture and ignores later callbacks", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const provisionalSnapshots: RunCheckpoint[] = [];
    let provisionalCount = 0;

    const persistCheckpoint: NonNullable<ExecutionContext["persistCheckpoint"]> = async (
      dir,
      cp,
    ) => {
      const last = cp.attempts.at(-1);
      if (
        cp.condition === "executing" &&
        last?.result === "executing" &&
        last.agentSession !== undefined
      ) {
        provisionalCount += 1;
        provisionalSnapshots.push(structuredClone(cp));
      }
      await writeCheckpoint(dir, cp);
    };

    const harness = createFakeHarness([
      {
        before: (request) => {
          request.onSessionCaptured?.({ id: "live-1" });
          request.onSessionCaptured?.({ id: "live-2" });
          request.onSessionCaptured?.({ id: "live-3" });
        },
        outcome: {
          kind: "completed",
          finalText: "Outcome: DONE",
          session: { id: "live-1" },
        },
      },
    ]);

    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        harness,
        nullDisplay,
        new AbortController().signal,
        persistCheckpoint,
      ),
    );

    expect(result.kind).toBe("completed");
    expect(provisionalCount).toBe(1);
    const provisional = provisionalSnapshots[0];
    expect(provisional.condition).toBe("executing");
    expect(provisional.waiting).toBeNull();
    expect(provisional.stageIndex).toBe(0);
    expect(provisional.attempts).toHaveLength(1);
    expect(provisional.attempts[0]).toMatchObject({
      attempt: 1,
      stageIndex: 0,
      stageId: "reconcile-spec",
      result: "executing",
      terminalResult: null,
      agentSession: { id: "live-1" },
    });
    expect(provisional.attempts[0].endedAt).toBeUndefined();
    // The live attempt records the tip it launched from and has not yet reached
    // its post-attempt observation.
    expect(provisional.attempts[0].headAtStart.length).toBeGreaterThan(0);
    expect(provisional.attempts[0].headAfterAttempt).toBeUndefined();

    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    expect(cp.attempts[0].result).toBe("done");
    expect(cp.attempts[0].agentSession).toEqual({ id: "live-1" });
  });

  it("does not start settlement persistence while a provisional write is pending (AC-2.3)", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();

    let releaseProvisional!: () => void;
    let notifyProvisionalStarted!: () => void;
    const provisionalStarted = new Promise<void>((resolve) => {
      notifyProvisionalStarted = resolve;
    });
    let provisionalPending = false;
    let settlementStartedWhilePending = false;
    let settlementWriteCount = 0;

    const persistCheckpoint: NonNullable<ExecutionContext["persistCheckpoint"]> = async (
      dir,
      cp,
    ) => {
      const last = cp.attempts.at(-1);
      const isProvisional =
        cp.condition === "executing" &&
        last?.result === "executing" &&
        last.agentSession !== undefined;
      if (isProvisional) {
        provisionalPending = true;
        notifyProvisionalStarted();
        await new Promise<void>((resolve) => {
          releaseProvisional = resolve;
        });
        provisionalPending = false;
      } else if (last !== undefined && last.result !== "executing") {
        if (provisionalPending) settlementStartedWhilePending = true;
        settlementWriteCount += 1;
      }
      await writeCheckpoint(dir, cp);
    };

    const harness = createFakeHarness([
      {
        before: (request) => {
          request.onSessionCaptured?.({ id: "sess-deferred" });
        },
        outcome: {
          kind: "completed",
          finalText: "Outcome: DONE",
          session: { id: "sess-deferred" },
        },
      },
    ]);

    const runPromise = executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        harness,
        nullDisplay,
        new AbortController().signal,
        persistCheckpoint,
      ),
    );

    await provisionalStarted;
    expect(settlementWriteCount).toBe(0);
    expect(settlementStartedWhilePending).toBe(false);
    releaseProvisional();

    const result = await runPromise;
    expect(result.kind).toBe("completed");
    expect(settlementStartedWhilePending).toBe(false);
    expect(settlementWriteCount).toBe(1);

    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    expect(cp.attempts[0].result).toBe("done");
    expect(cp.attempts[0].agentSession).toEqual({ id: "sess-deferred" });
  });

  it("retains the session on completed, provider-error, idle-timeout, and post-launch interruption", async () => {
    const cases: Array<{
      name: string;
      step: FakeHarnessStep;
      expectResult: "done" | "waiting" | "interrupted";
      expectKind: "completed" | "paused" | "interrupted";
    }> = [
      {
        name: "completed",
        step: {
          before: (request) => request.onSessionCaptured?.({ id: "s-done" }),
          outcome: {
            kind: "completed",
            finalText: "Outcome: DONE",
            session: { id: "s-done" },
          },
        },
        expectResult: "done",
        expectKind: "completed",
      },
      {
        name: "provider-error",
        step: {
          before: (request) => request.onSessionCaptured?.({ id: "s-provider" }),
          outcome: {
            kind: "failed",
            category: "provider-error",
            errorClass: "ProviderError",
            errorMessage: "boom",
            session: { id: "s-provider" },
          },
        },
        expectResult: "waiting",
        expectKind: "paused",
      },
      {
        name: "idle-timeout",
        step: {
          before: (request) => request.onSessionCaptured?.({ id: "s-idle" }),
          outcome: {
            kind: "failed",
            category: "idle-timeout",
            errorClass: "IdleTimeout",
            errorMessage: "no output",
            session: { id: "s-idle" },
          },
        },
        expectResult: "waiting",
        expectKind: "paused",
      },
    ];

    for (const testCase of cases) {
      const fixture = await newFixture();
      const runDir = await makeRunDir();
      const result = await executeEngine(
        makeContext(
          buildCheckpoint(fixture, [cleanStage]),
          runDir,
          createFakeHarness([testCase.step]),
        ),
      );
      expect(result.kind).toBe(testCase.expectKind);
      const cp = await loadCheckpoint(runDir);
      expect(cp.attempts[0].result).toBe(testCase.expectResult);
      expect(cp.attempts[0].agentSession?.id).toMatch(/^s-/);
    }

    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const controller = new AbortController();
    const harness = createFakeHarness([
      {
        before: (request) => {
          request.onSessionCaptured?.({ id: "s-interrupt" });
          controller.abort(new SignalInterruption("SIGTERM"));
        },
        hangUntilAbort: true,
      },
    ]);
    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        harness,
        nullDisplay,
        controller.signal,
      ),
    );
    expect(result.kind).toBe("interrupted");
    const cp = await loadCheckpoint(runDir);
    expect(cp.attempts[0].result).toBe("interrupted");
    expect(cp.attempts[0].agentSession).toEqual({ id: "s-interrupt" });
  });

  it("does not invent a session on pre-launch interruption", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const controller = new AbortController();
    const display: ExecutionDisplay = {
      ...nullDisplay,
      attemptStarted: () => controller.abort(new SignalInterruption("SIGINT")),
    };
    const harness = createFakeHarness([{}]);

    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        harness,
        display,
        controller.signal,
      ),
    );

    expect(result).toEqual({ kind: "interrupted", signal: "SIGINT" });
    expect(harness.calls.length).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.attempts[0].result).toBe("interrupted");
    expect(cp.attempts[0].agentSession).toBeUndefined();
  });

  it("skips provisional persistence for an outcome-only fallback session", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    let provisionalCount = 0;

    const persistCheckpoint: NonNullable<ExecutionContext["persistCheckpoint"]> = async (
      dir,
      cp,
    ) => {
      const last = cp.attempts.at(-1);
      if (
        cp.condition === "executing" &&
        last?.result === "executing" &&
        last.agentSession !== undefined
      ) {
        provisionalCount += 1;
      }
      await writeCheckpoint(dir, cp);
    };

    const harness = createFakeHarness([
      {
        // No onSessionCaptured — session arrives only on the outcome.
        outcome: {
          kind: "completed",
          finalText: "Outcome: DONE",
          session: { id: "fallback-only" },
        },
      },
    ]);

    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        harness,
        nullDisplay,
        new AbortController().signal,
        persistCheckpoint,
      ),
    );

    expect(result.kind).toBe("completed");
    expect(provisionalCount).toBe(0);
    const cp = await loadCheckpoint(runDir);
    expect(cp.attempts[0].agentSession).toEqual({ id: "fallback-only" });
  });

  it("warns once on provisional failure, continues the harness, and settles with the session", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    let harnessContinued = false;

    const persistCheckpoint: NonNullable<ExecutionContext["persistCheckpoint"]> = async (
      dir,
      cp,
    ) => {
      const last = cp.attempts.at(-1);
      if (
        cp.condition === "executing" &&
        last?.result === "executing" &&
        last.agentSession !== undefined
      ) {
        throw new Error("provisional disk full");
      }
      await writeCheckpoint(dir, cp);
    };

    const harness = createFakeHarness([
      {
        before: (request) => {
          request.onSessionCaptured?.({ id: "s-warn" });
          harnessContinued = true;
        },
        outcome: {
          kind: "completed",
          finalText: "Outcome: DONE",
          session: { id: "s-warn" },
        },
      },
    ]);
    const rec = recorder();

    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        harness,
        rec.display,
        new AbortController().signal,
        persistCheckpoint,
      ),
    );

    expect(harnessContinued).toBe(true);
    expect(result.kind).toBe("completed");
    expect(rec.warns).toHaveLength(1);
    expect(rec.warns[0]).toContain("provisional disk full");
    const cp = await loadCheckpoint(runDir);
    expect(cp.condition).toBe("completed");
    expect(cp.attempts[0].agentSession).toEqual({ id: "s-warn" });
  });

  it("keeps settlement checkpoint failure fatal after a successful provisional write", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();

    const persistCheckpoint: NonNullable<ExecutionContext["persistCheckpoint"]> = async (
      dir,
      cp,
    ) => {
      const last = cp.attempts.at(-1);
      const isProvisional =
        cp.condition === "executing" &&
        last?.result === "executing" &&
        last.agentSession !== undefined;
      if (!isProvisional && last !== undefined && last.result !== "executing") {
        throw new Error("settlement write failed");
      }
      await writeCheckpoint(dir, cp);
    };

    const harness = createFakeHarness([
      {
        before: (request) => request.onSessionCaptured?.({ id: "s-fatal" }),
        outcome: {
          kind: "completed",
          finalText: "Outcome: DONE",
          session: { id: "s-fatal" },
        },
      },
    ]);

    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        harness,
        nullDisplay,
        new AbortController().signal,
        persistCheckpoint,
      ),
    );

    expect(result.kind).toBe("fatal-checkpoint");
    const cp = await loadCheckpoint(runDir);
    // Last durable checkpoint is the provisional executing record with the session.
    expect(cp.condition).toBe("executing");
    expect(cp.attempts[0].result).toBe("executing");
    expect(cp.attempts[0].agentSession).toEqual({ id: "s-fatal" });
  });

  it("prefers the outcome session over the live-captured value at settlement", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const harness = createFakeHarness([
      {
        before: (request) => request.onSessionCaptured?.({ id: "live-id" }),
        outcome: {
          kind: "completed",
          finalText: "Outcome: DONE",
          session: { id: "outcome-id" },
        },
      },
    ]);

    await executeEngine(
      makeContext(buildCheckpoint(fixture, [cleanStage]), runDir, harness),
    );

    const cp = await loadCheckpoint(runDir);
    expect(cp.attempts[0].agentSession).toEqual({ id: "outcome-id" });
  });
});

describe.concurrent("executeEngine — persisted-attempt pause Continue (AC-3.2, AC-3.3)", () => {
  it("supplies Continue from the persisted session ID and snapshotted harness", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const rec = recorder();
    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        createFakeHarness([
          {
            outcome: {
              kind: "completed",
              finalText: "Outcome: BLOCKED — needs a human",
              session: { id: "sess-pause-1" },
            },
          },
        ]),
        rec.display,
      ),
    );

    expect(result.kind).toBe("paused");
    expect(rec.runPaused).toHaveLength(1);
    const paused = rec.runPaused[0]!;
    const cp = await loadCheckpoint(runDir);
    expect(paused.logAbsPath).toBe(path.join(runDir, cp.attempts[0]!.logPath));
    expect(paused.continuationCommand).toBe("codex resume 'sess-pause-1'");
    expect(cp.attempts[0].agentSession).toEqual({ id: "sess-pause-1" });
  });

  it("spells Continue with the snapshotted Claude Code harness", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const checkpoint = buildCheckpoint(fixture, [cleanStage]);
    checkpoint.stages[0]!.binding.agent.harness = "claude-code";
    checkpoint.observedHarnessVersions = { "claude-code": "claude 1.0.0" };
    const rec = recorder();
    const ctx = makeContext(
      checkpoint,
      runDir,
      createFakeHarness([
        {
          outcome: {
            kind: "completed",
            finalText: "Outcome: BLOCKED — needs a human",
            session: { id: "claude-sess" },
          },
        },
      ]),
      rec.display,
    );
    ctx.harnessVersions = { "claude-code": "claude 1.0.0" };

    const result = await executeEngine(ctx);

    expect(result.kind).toBe("paused");
    expect(rec.runPaused[0]!.continuationCommand).toBe(
      "claude --resume 'claude-sess'",
    );
  });

  it("omits Continue when the settled attempt has no session, keeping Log", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const rec = recorder();
    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        createFakeHarness([
          {
            outcome: {
              kind: "completed",
              finalText: "Outcome: BLOCKED — needs a human",
            },
          },
        ]),
        rec.display,
      ),
    );

    expect(result.kind).toBe("paused");
    expect(rec.runPaused).toHaveLength(1);
    const cp = await loadCheckpoint(runDir);
    expect(rec.runPaused[0]!.logAbsPath).toBe(
      path.join(runDir, cp.attempts[0]!.logPath),
    );
    expect(rec.runPaused[0]!.continuationCommand).toBeUndefined();
  });

  it("omits Log and Continue on a pre-attempt pending-queues pause", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    await dropPendingDecision(fixture, "d1.md");
    const rec = recorder();
    const result = await executeEngine(
      makeContext(
        buildCheckpoint(fixture, [cleanStage]),
        runDir,
        createFakeHarness([{}]),
        rec.display,
      ),
    );

    expect(result.kind).toBe("paused");
    expect(rec.runPaused).toHaveLength(1);
    expect(rec.runPaused[0]!.logAbsPath).toBeNull();
    expect(rec.runPaused[0]!.continuationCommand).toBeUndefined();
  });
});

describe.concurrent("executeEngine — harness stage context", () => {
  it("passes snapshotted stage metadata and attempt number on the first attempt", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const checkpoint = buildCheckpoint(fixture, [alphaStage]);
    checkpoint.stages[0].instructions = "focus on acceptance criteria";
    const harness = createFakeHarness([{}]);

    await executeEngine(makeContext(checkpoint, runDir, harness));

    expect(harness.calls).toHaveLength(1);
    expect(harness.calls[0].stage).toEqual({
      id: "spec",
      skill: "alpha-skill",
      resolvedTarget: path.posix.join(fixture.threadRelPath as string, "notes.md"),
      threadRelPath: fixture.threadRelPath,
      instructions: "focus on acceptance criteria",
      attemptNumber: 1,
    });
    const cp = await loadCheckpoint(runDir);
    expect(cp.attempts[0].attempt).toBe(1);
  });

  it("increments attemptNumber on a later attempt of the same stage", async () => {
    const fixture = await newFixture();
    const runDir = await makeRunDir();
    const checkpoint = buildCheckpoint(fixture, [cleanStage]);
    const head = await readHead(fixture.root);
    checkpoint.stageIndex = 0;
    checkpoint.condition = "waiting-for-user";
    checkpoint.attempts = [
      {
        attempt: 1,
        stageIndex: 0,
        stageId: "reconcile-spec",
        startedAt: "2026-07-24T00:00:00.000Z",
        endedAt: "2026-07-24T00:01:00.000Z",
        result: "waiting",
        terminalResult: { token: "BLOCKED", candidateLine: "Outcome: BLOCKED", detail: "" },
        headAtStart: head,
        headAfterAttempt: head,
        logPath: "logs/01-reconcile-spec-attempt-1.log",
      },
    ];
    checkpoint.waiting = governedBy({ kind: "outcome-blocked", message: "blocked" });
    const harness = createFakeHarness([{}]);

    await executeEngine(resumedFrom(makeContext(checkpoint, runDir, harness)));

    expect(harness.calls).toHaveLength(1);
    expect(harness.calls[0].stage).toEqual({
      id: "reconcile-spec",
      skill: "solo-skill",
      resolvedTarget: path.posix.join(fixture.threadRelPath as string, "artifact.md"),
      threadRelPath: fixture.threadRelPath,
      attemptNumber: 2,
    });
    const cp = await loadCheckpoint(runDir);
    expect(cp.attempts[1].attempt).toBe(2);
  });
});
