import { promises as fs } from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import type { HarnessId } from "../harness/id.js";
import type { CatalogStageId } from "../pipeline/stage-id.js";
import type {
  AttemptRecord,
  RunCheckpoint,
  RunCondition,
  SnapshottedStage,
} from "../state/checkpoint/types.js";
import { validateCheckpoint } from "../state/checkpoint/validate.js";
import { writeCheckpoint } from "../state/persist.js";
import { runsDirectory } from "../state/runs.js";
import { governedBy } from "../test-helpers/waiting.js";
import { listCommand, type ListDeps } from "./list.js";
import { tempDir as allocate } from "../test-helpers/temp-root.js";

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

async function tempDir(prefix: string): Promise<string> {
  return allocate(prefix);
}

function makeStage(
  id: CatalogStageId,
  model: string,
  harness: HarnessId = "codex",
): SnapshottedStage {
  return {
    id,
    skill: id,
    targetRule: { kind: "fixed", target: { kind: "thread-root" } },
    prerequisite: { validThread: true },
    promises: {},
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [],
      changeRequired: false,
      commitSubjectTemplate: null,
    },
    queueResolution: "advance",
    resolvedTarget: "docs/threads/260723121015Z-demo/",
    binding: {
      agent: { harness, model },
      idleTimeoutSeconds: 900,
      heartbeatSeconds: 300,
    },
  };
}

function makeCheckpoint(overrides: {
  runId: string;
  updatedAt: string;
  condition: RunCondition;
  stageIndex: number;
  pipelineName?: string;
  stages?: SnapshottedStage[];
  attempts?: AttemptRecord[];
  repoRoot?: string;
  threadRelPath?: string;
}): RunCheckpoint {
  const stages =
    overrides.stages ??
    [
      makeStage("spec", "gpt-spec"),
      makeStage("plan-strict", "gpt-plan"),
      makeStage("implement-plan", "gpt-impl"),
    ];
  const repoRoot = overrides.repoRoot ?? "/Users/dev/repo";
  const observedHarnessVersions: Partial<Record<HarnessId, string>> = {};
  for (const stage of stages) {
    observedHarnessVersions[stage.binding.agent.harness] =
      `${stage.binding.agent.harness} 1.0.0`;
  }
  const checkpoint: RunCheckpoint = {
    schemaVersion: 0,
    runId: overrides.runId,
    executor: { pid: 4242, version: "0.1.0" },
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: overrides.updatedAt,
    repoRoot,
    threadRelPath: overrides.threadRelPath ?? "docs/threads/260723121015Z-demo",
    workspace: {
      strategy: "current-checkout",
      path: repoRoot,
      execution: { cwd: repoRoot, sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    pipelineName: overrides.pipelineName ?? "standard",
    pipelineSourcePath: "/Users/dev/.config/antmay/pipelines/standard.json",
    profileSelection: { kind: "settings-only" },
    stages,
    observedHarnessVersions,
    runtime: { kind: "real" },
    stageIndex: overrides.stageIndex,
    condition: overrides.condition,
    attempts: overrides.attempts ?? [],
    waiting: null,
  };
  if (overrides.condition === "waiting-for-user") {
    checkpoint.waiting = governedBy({
      kind: "idle-timeout",
      message: "The stage idled out.",
    });
  }
  // Guard the fixtures themselves: a test-authored invalid checkpoint would
  // otherwise silently exercise the warning path instead of the summary path.
  const validated = validateCheckpoint(JSON.parse(JSON.stringify(checkpoint)));
  if (!validated.ok) {
    throw new Error(`test fixture is invalid: ${validated.errors.join("; ")}`);
  }
  return checkpoint;
}

async function seedRun(stateRoot: string, checkpoint: RunCheckpoint): Promise<string> {
  const runDir = path.join(runsDirectory(stateRoot), checkpoint.runId);
  await fs.mkdir(runDir, { recursive: true });
  await writeCheckpoint(runDir, checkpoint);
  return runDir;
}

function deps(env: NodeJS.ProcessEnv, color = false): {
  deps: ListDeps;
  out: Capture;
  err: Capture;
} {
  const out = new Capture();
  const err = new Capture();
  return {
    deps: { env, homedir: undefined, stdout: out, stderr: err, color },
    out,
    err,
  };
}

describe("listCommand (AC-2.4)", () => {
  it("prints 'No AFK runs found.' and creates nothing for an absent state root", async () => {
    const base = await tempDir("antmay-list-");
    const stateRoot = path.join(base, "nowhere");
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(out.text).toBe("No AFK runs found.\n");
    expect(err.text).toBe("");
    await expect(fs.stat(stateRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("prints 'No AFK runs found.' for an empty runs directory without writing", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await fs.mkdir(runsDirectory(stateRoot), { recursive: true });
    const before = await fs.readdir(runsDirectory(stateRoot));
    const { deps: d, out } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(out.text).toBe("No AFK runs found.\n");
    expect(await fs.readdir(runsDirectory(stateRoot))).toEqual(before);
  });

  it("ignores an invalid config-only environment value for a state-only listing", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T120000000Z-aaaaaaaa",
        updatedAt: "2026-07-23T12:30:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );
    const { deps: d, out, err } = deps({
      ANTMAY_STATE_HOME: stateRoot,
      ANTMAY_CONFIG_HOME: "relative/not/absolute",
    });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(err.text).toBe("");
    expect(out.text).toContain("20260723T120000000Z-aaaaaaaa");
  });
});

describe("listCommand rendering (AC-16.1, AC-16.2)", () => {
  it("sorts globally by updatedAt instead of grouping matching conditions", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T120000000Z-old00000",
        updatedAt: "2026-07-23T12:10:00.000Z",
        condition: "waiting-for-user",
        stageIndex: 0,
      }),
    );
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T130000000Z-middle00",
        updatedAt: "2026-07-23T13:00:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T130000000Z-new00000",
        updatedAt: "2026-07-23T13:45:00.000Z",
        condition: "waiting-for-user",
        stageIndex: 1,
      }),
    );
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(err.text).toBe("");
    const [heading, first, second, third] = out.text.trimEnd().split("\n\n");
    expect(heading).toBe("AFK runs (3)");
    // Descending timestamps interleave two runs with the same condition.
    expect(first).toContain("20260723T130000000Z-new00000");
    expect(second).toContain("20260723T130000000Z-middle00");
    expect(third).toContain("20260723T120000000Z-old00000");

    expect(first).toContain("2026-07-23T13:45:00.000Z"); // updated time
    expect(first).toContain("WAITING FOR USER"); // friendly condition
    expect(first).toContain("standard"); // pipeline
    expect(first).toContain("2/3 · plan-strict"); // one-based stage position + id
    expect(first).toContain("codex · gpt-plan"); // current harness/model
    expect(first).toContain("/Users/dev/repo"); // absolute repo path
    expect(first).toContain("docs/threads/260723121015Z-demo"); // repo-relative thread

    expect(second).toContain("READY");
    expect(second).toContain("1/3 · spec");
    expect(second).toContain("codex · gpt-spec");
    expect(third).toContain("WAITING FOR USER");
  });

  it("renders an executing run with the unverified condition label", async () => {
    const stateRoot = await tempDir("antmay-list-");
    const executing = makeCheckpoint({
      runId: "20260723T140000000Z-exec0000",
      updatedAt: "2026-07-23T14:00:00.000Z",
      condition: "ready",
      stageIndex: 0,
    });
    // Promote to a valid executing checkpoint with exactly one live final attempt.
    executing.condition = "executing";
    executing.attempts = [
      {
        attempt: 1,
        stageIndex: 0,
        stageId: "spec",
        startedAt: "2026-07-23T14:00:00.000Z",
        result: "executing",
        terminalResult: null,
        headAtStart: "1a2b3c4d",
        logPath: "logs/00-spec-attempt-01.log",
      },
    ];
    await seedRun(stateRoot, executing);
    const { deps: d, out } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(out.text).toContain("EXECUTING (UNVERIFIED)");
  });

  it("shows the final stage count and no harness/model for a completed run", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T150000000Z-done0000",
        updatedAt: "2026-07-23T15:00:00.000Z",
        condition: "completed",
        stageIndex: 3,
      }),
    );
    const { deps: d, out } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    const summary = out.text.trimEnd();
    expect(summary).toContain("COMPLETED");
    expect(summary).toContain("3/3");
    expect(summary).not.toContain("Current agent:");
    expect(summary).not.toContain("codex ·");
  });

  it("emits meaning-free color only when the resolved color is on", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T160000000Z-color000",
        updatedAt: "2026-07-23T16:00:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );

    const colored = deps({ ANTMAY_STATE_HOME: stateRoot }, true);
    expect(await listCommand(colored.deps)).toBe(0);
    expect(colored.out.text).toContain("\x1b[");

    const plain = deps({ ANTMAY_STATE_HOME: stateRoot }, false);
    expect(await listCommand(plain.deps)).toBe(0);
    expect(plain.out.text).not.toContain("\x1b[");
  });
});

describe("listCommand corruption handling (AC-16.3)", () => {
  it("warns per corrupt checkpoint, still prints valid summaries, and exits 1", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T120000000Z-valid000",
        updatedAt: "2026-07-23T12:00:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );
    const corruptDir = path.join(runsDirectory(stateRoot), "20260723T130000000Z-corrupt0");
    await fs.mkdir(corruptDir, { recursive: true });
    await fs.writeFile(path.join(corruptDir, "state.json"), "{ not valid json", "utf8");
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(1);
    expect(out.text).toContain("20260723T120000000Z-valid000");
    expect(err.text).toContain(corruptDir); // names the directory
    expect(err.text).toContain(path.join(corruptDir, "state.json")); // names the path
    expect(err.text.toLowerCase()).toContain("json"); // names the validation error
  });

  it("ignores stray non-directory entries and never writes a lock", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T120000000Z-valid000",
        updatedAt: "2026-07-23T12:00:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );
    await fs.writeFile(path.join(runsDirectory(stateRoot), "README.txt"), "ignore me", "utf8");
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(err.text).toBe("");
    expect(out.text.match(/Run ID:/g)).toHaveLength(1);

    // No lock directory or lock file may appear anywhere under the state root.
    const stateEntries = await fs.readdir(stateRoot);
    expect(stateEntries).toEqual(["afk-runs"]);
  });

  it("ignores the scripted toggle and lists runs without loading scenario dependencies", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T170000000Z-toggle00",
        updatedAt: "2026-07-23T17:00:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );
    const { deps: d, out, err } = deps({
      ANTMAY_STATE_HOME: stateRoot,
      ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS: "1",
    });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(err.text).toBe("");
    expect(out.text).toContain("20260723T170000000Z-toggle00");
  });
});

describe("listCommand latest session field (AC-4.1, AC-4.2)", () => {
  const stagesWithMixedHarnesses = [
    makeStage("spec", "gpt-spec", "codex"),
    makeStage("plan-strict", "claude-plan", "claude-code"),
    makeStage("implement-plan", "gpt-impl", "codex"),
  ];

  function doneAttempt(
    stageIndex: number,
    stageId: string,
    sessionId?: string,
  ): AttemptRecord {
    return {
      attempt: 1,
      stageIndex,
      stageId,
      startedAt: "2026-07-23T12:00:00.000Z",
      endedAt: "2026-07-23T12:01:00.000Z",
      result: "done",
      terminalResult: {
        token: "DONE",
        candidateLine: `Outcome: DONE — ${stageId} finished.`,
        detail: `— ${stageId} finished.`,
      },
      ...(sessionId !== undefined ? { agentSession: { id: sessionId } } : {}),
      headAtStart: "1a2b3c4d",
      headAfterAttempt: "5e6f7a8b",
      logPath: `logs/0${stageIndex + 1}-${stageId}-attempt-01.log`,
    };
  }

  it("selects the newest session-carrying attempt and its snapshotted harness", async () => {
    const stateRoot = await tempDir("antmay-list-");
    // Cursor sits on impl (codex), but the newest captured session is on plan
    // (claude-code) — the field must use plan's snapshotted harness, not the
    // current stage's.
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T180000000Z-latest00",
        updatedAt: "2026-07-23T18:00:00.000Z",
        condition: "ready",
        stageIndex: 2,
        stages: stagesWithMixedHarnesses,
        attempts: [
          doneAttempt(0, "spec", "session-old-spec"),
          doneAttempt(1, "plan-strict", "session-newest-plan"),
          doneAttempt(2, "implement-plan"), // newer attempt, no session
        ],
      }),
    );
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(err.text).toBe("");
    const summary = out.text.trimEnd();
    expect(summary).toContain("claude-code · session-newest-plan");
    expect(summary).not.toContain("session-old-spec");
    expect(summary).toContain("3/3 · implement-plan");
    expect(summary).toContain("codex · gpt-impl"); // current stage harness/model unchanged
    expect(summary.indexOf("Current agent:")).toBeLessThan(
      summary.indexOf("Latest session:"),
    );
  });

  it("renders the latest session for ready, executing, waiting, and completed", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T181000000Z-ready000",
        updatedAt: "2026-07-23T18:10:00.000Z",
        condition: "ready",
        stageIndex: 1,
        stages: stagesWithMixedHarnesses,
        attempts: [doneAttempt(0, "spec", "sess-ready")],
      }),
    );
    const executing = makeCheckpoint({
      runId: "20260723T182000000Z-exec0000",
      updatedAt: "2026-07-23T18:20:00.000Z",
      condition: "ready",
      stageIndex: 1,
      stages: stagesWithMixedHarnesses,
      attempts: [doneAttempt(0, "spec", "sess-exec-old")],
    });
    executing.condition = "executing";
    executing.attempts = [
      doneAttempt(0, "spec", "sess-exec-old"),
      {
        attempt: 1,
        stageIndex: 1,
        stageId: "plan-strict",
        startedAt: "2026-07-23T18:20:00.000Z",
        result: "executing",
        terminalResult: null,
        agentSession: { id: "sess-exec-live" },
        headAtStart: "1a2b3c4d",
        logPath: "logs/02-plan-attempt-01.log",
      },
    ];
    await seedRun(stateRoot, executing);
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T183000000Z-wait0000",
        updatedAt: "2026-07-23T18:30:00.000Z",
        condition: "waiting-for-user",
        stageIndex: 1,
        stages: stagesWithMixedHarnesses,
        attempts: [
          doneAttempt(0, "spec", "sess-wait-old"),
          {
            attempt: 1,
            stageIndex: 1,
            stageId: "plan-strict",
            startedAt: "2026-07-23T18:29:00.000Z",
            endedAt: "2026-07-23T18:30:00.000Z",
            result: "waiting",
            terminalResult: {
              token: "BLOCKED",
              candidateLine: "Outcome: BLOCKED — blocked.",
              detail: "— blocked.",
            },
            agentSession: { id: "sess-wait-now" },
            headAtStart: "1a2b3c4d",
            headAfterAttempt: "5e6f7a8b",
            logPath: "logs/02-plan-attempt-01.log",
          },
        ],
      }),
    );
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T184000000Z-done0000",
        updatedAt: "2026-07-23T18:40:00.000Z",
        condition: "completed",
        stageIndex: 3,
        stages: stagesWithMixedHarnesses,
        attempts: [
          doneAttempt(0, "spec", "sess-done-old"),
          doneAttempt(1, "plan-strict", "sess-done-mid"),
          doneAttempt(2, "implement-plan", "sess-done-latest"),
        ],
      }),
    );
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(err.text).toBe("");
    const summaries = out.text.trimEnd().split("\n\n");
    expect(summaries).toHaveLength(5);
    expect(summaries[0]).toBe("AFK runs (4)");
    expect(summaries[1]).toContain("COMPLETED");
    expect(summaries[1]).toContain("codex · sess-done-latest");
    expect(summaries[1]).not.toContain("sess-done-old");
    expect(summaries[1]).not.toContain("sess-done-mid");
    expect(summaries[2]).toContain("WAITING FOR USER");
    expect(summaries[2]).toContain("claude-code · sess-wait-now");
    expect(summaries[3]).toContain("EXECUTING (UNVERIFIED)");
    expect(summaries[3]).toContain("claude-code · sess-exec-live");
    expect(summaries[4]).toContain("READY");
    expect(summaries[4]).toContain("codex · sess-ready");
  });

  it("omits the session field when no attempt captured a session", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T185000000Z-nosess00",
        updatedAt: "2026-07-23T18:50:00.000Z",
        condition: "ready",
        stageIndex: 0,
        attempts: [doneAttempt(0, "spec")],
      }),
    );
    const { deps: d, out } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    const summary = out.text.trimEnd();
    expect(summary).toContain("codex · gpt-spec");
    expect(summary).not.toContain("Latest session:");
  });
});
