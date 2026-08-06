import { describe, expect, it } from "vitest";

import { STAGE_CATALOG } from "../pipeline/catalog.js";
import type {
  AttemptRecord,
  RunCheckpoint,
  SnapshottedStage,
  WaitingInfo,
} from "../state/checkpoint/types.js";
import { validateCheckpoint } from "../state/checkpoint/validate.js";
import { Pause } from "./pause.js";
import type { CheckpointWriter, Transition } from "./run-state.js";
import { RunState } from "./run-state.js";

/**
 * The cursor is a pure function of the transitions committed to it plus one
 * injected writer and clock, so every case here runs in memory: no repository,
 * no run directory, no real checkpoint file. That is the point of the move — the
 * transitions the pause/resume bugs live in are now reachable without driving
 * the engine to the situation that commits them.
 */

const CLOCK = new Date("2026-02-01T10:00:00.000Z");

/** The two stages the cases below drive, in the order a run selects them. */
const STAGE_IDS = ["spec", "review-spec"] as const;

function snapshotted(index: number): SnapshottedStage {
  return {
    ...STAGE_CATALOG[STAGE_IDS[index]!],
    resolvedTarget: `docs/threads/260201100000Z-t/artifact-${index}.md`,
    binding: {
      agent: { harness: "codex", model: "gpt-5" },
      idleTimeoutSeconds: 60,
      heartbeatSeconds: 30,
    },
  };
}

function baseCheckpoint(overrides: Partial<RunCheckpoint> = {}): RunCheckpoint {
  return {
    schemaVersion: 0,
    runId: "260201095959Z-abcdef",
    executor: { pid: 4242, version: "0.1.0" },
    createdAt: "2026-02-01T09:59:59.000Z",
    updatedAt: "2026-02-01T09:59:59.000Z",
    repoRoot: "/tmp/repo",
    threadRelPath: "docs/threads/260201100000Z-t",
    workspace: {
      strategy: "current-checkout",
      path: "/tmp/repo",
      execution: { cwd: "/tmp/repo", sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    pipelineName: "standard",
    pipelineSourcePath: "/tmp/config/pipelines/standard.json",
    profileSelection: { kind: "settings-only" },
    stages: [snapshotted(0), snapshotted(1)],
    observedHarnessVersions: { codex: "codex 1.2.3" },
    runtime: { kind: "real" },
    stageIndex: 0,
    condition: "ready",
    attempts: [],
    waiting: null,
    ...overrides,
  };
}

function attempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    attempt: 1,
    stageIndex: 0,
    stageId: STAGE_IDS[0],
    startedAt: "2026-02-01T09:59:59.000Z",
    result: "executing",
    terminalResult: null,
    headAtStart: "aaaa",
    logPath: "logs/stage-01-attempt-1.log",
    ...overrides,
  };
}

/** A cursor whose writes are collected rather than performed. */
function cursor(
  checkpoint: RunCheckpoint = baseCheckpoint(),
  writer?: CheckpointWriter,
): { run: RunState; written: RunCheckpoint[] } {
  const written: RunCheckpoint[] = [];
  const run = new RunState({
    checkpoint,
    runDir: "/tmp/state/runs/260201095959Z-abcdef",
    clock: () => CLOCK,
    persistCheckpoint:
      writer ??
      (async (_dir, next) => {
        written.push(next);
      }),
  });
  return { run, written };
}

const PAUSE: WaitingInfo = Pause.queueBlocked([
  "docs/threads/260201100000Z-t/.pending-decisions/one.md",
]);

describe("RunState — the cursor it reads as", () => {
  it("reports the stage it sits on and whether the snapshot is exhausted", async () => {
    const { run } = cursor();
    expect(run.stage.id).toBe(STAGE_IDS[0]);
    expect(run.isExhausted).toBe(false);

    await run.commit({ kind: "advance" });
    expect(run.stage.id).toBe(STAGE_IDS[1]);
    expect(run.isExhausted).toBe(false);

    await run.commit({ kind: "advance" });
    expect(run.isExhausted).toBe(true);
  });
});

describe("RunState — one transition, one durable step", () => {
  it("reserves a live attempt and makes the run executing", async () => {
    const { run, written } = cursor();
    const live = attempt();

    expect(await run.commit({ kind: "reserve-attempt", attempt: live })).toEqual({
      ok: true,
    });
    expect(written).toHaveLength(1);
    expect(run.checkpoint.condition).toBe("executing");
    expect(run.checkpoint.waiting).toBeNull();
    expect(run.checkpoint.attempts).toEqual([live]);
  });

  it("attaches a captured session to the live attempt, leaving it live", async () => {
    const live = attempt();
    const { run } = cursor(
      baseCheckpoint({ condition: "executing", attempts: [live] }),
    );

    await run.commit({
      kind: "attach-session",
      attempt: { ...live, agentSession: { id: "sess-1" } },
    });

    expect(run.checkpoint.condition).toBe("executing");
    expect(run.checkpoint.attempts).toHaveLength(1);
    expect(run.checkpoint.attempts[0]!.agentSession).toEqual({ id: "sess-1" });
    expect(run.checkpoint.attempts[0]!.result).toBe("executing");
  });

  it("settles the live attempt without touching the ones before it", async () => {
    const earlier = attempt({
      attempt: 1,
      result: "waiting",
      endedAt: "2026-02-01T09:59:59.000Z",
      headAfterAttempt: "aaaa",
    });
    const live = attempt({ attempt: 2 });
    const { run } = cursor(
      baseCheckpoint({ condition: "executing", attempts: [earlier, live] }),
    );

    await run.commit({
      kind: "settle-attempt",
      attempt: { ...live, result: "waiting", headAfterAttempt: "bbbb" },
    });

    expect(run.checkpoint.attempts[0]).toEqual(earlier);
    expect(run.checkpoint.attempts[1]!.result).toBe("waiting");
    expect(run.checkpoint.attempts[1]!.headAfterAttempt).toBe("bbbb");
  });

  it("finalizes the preserved DONE by identity, wherever it sits", async () => {
    // A preserved DONE is addressed by its own `(stageIndex, attempt)` rather
    // than by position, which is what a `settle-attempt` of the tail cannot
    // express.
    const preserved = attempt({
      attempt: 3,
      result: "waiting",
      endedAt: "2026-02-01T09:59:59.000Z",
      terminalResult: { token: "DONE", candidateLine: "Outcome: DONE", detail: "" },
      headAfterAttempt: "bbbb",
    });
    const trailing = attempt({
      attempt: 4,
      result: "interrupted",
      endedAt: "2026-02-01T09:59:59.000Z",
      headAfterAttempt: "cccc",
    });
    const { run } = cursor(baseCheckpoint({ attempts: [trailing, preserved] }));

    await run.commit({
      kind: "finalize-preserved-done",
      attempt: { ...preserved, result: "done", headAfterAttempt: "dddd" },
    });

    expect(run.checkpoint.attempts[0]).toEqual(trailing);
    expect(run.checkpoint.attempts[1]!.result).toBe("done");
    expect(run.checkpoint.attempts[1]!.headAfterAttempt).toBe("dddd");
  });

  it("records a pause, and clears it again on becoming ready", async () => {
    const { run } = cursor();

    await run.commit({ kind: "pause", waiting: PAUSE });
    expect(run.checkpoint.condition).toBe("waiting-for-user");
    expect(run.checkpoint.waiting).toEqual(PAUSE);

    await run.commit({ kind: "become-ready" });
    expect(run.checkpoint.condition).toBe("ready");
    expect(run.checkpoint.waiting).toBeNull();
    expect(run.checkpoint.stageIndex).toBe(0);
  });

  it("advances to ready mid-snapshot and to completed at the end", async () => {
    const { run } = cursor(
      baseCheckpoint({ condition: "waiting-for-user", waiting: PAUSE }),
    );

    await run.commit({ kind: "advance" });
    expect(run.checkpoint.stageIndex).toBe(1);
    expect(run.checkpoint.condition).toBe("ready");
    expect(run.checkpoint.waiting).toBeNull();

    await run.commit({ kind: "advance" });
    expect(run.checkpoint.stageIndex).toBe(2);
    expect(run.checkpoint.condition).toBe("completed");
  });

  it("leaves every committed cursor a valid checkpoint", async () => {
    // The invariants the schema enforces across fields — an executing run's tail
    // is its only live attempt, a pause and only a pause holds a waiting object,
    // completion is the cursor reaching the stage count — are what a transition
    // has to keep. Validating each committed document is what proves it does.
    const { run, written } = cursor();
    const live = attempt();
    const settled: AttemptRecord = {
      ...live,
      result: "waiting",
      endedAt: "2026-02-01T10:00:00.000Z",
      headAfterAttempt: "bbbb",
    };
    const steps: Transition[][] = [
      [{ kind: "reserve-attempt", attempt: live }],
      [
        { kind: "settle-attempt", attempt: settled },
        { kind: "pause", waiting: PAUSE },
      ],
      [{ kind: "become-ready" }],
      [{ kind: "advance" }],
      [{ kind: "advance" }],
    ];
    for (const step of steps) await run.commit(...step);

    expect(written).toHaveLength(steps.length);
    for (const document of written) {
      const validated = validateCheckpoint(JSON.parse(JSON.stringify(document)));
      expect(validated.ok ? [] : validated.errors).toEqual([]);
    }
  });
});

describe("RunState — what one commit means", () => {
  it("writes several transitions as one document", async () => {
    const live = attempt();
    const { run, written } = cursor(
      baseCheckpoint({ condition: "executing", attempts: [live] }),
    );
    const settled: AttemptRecord = {
      ...live,
      result: "waiting",
      endedAt: "2026-02-01T10:00:00.000Z",
      headAfterAttempt: "bbbb",
    };

    await run.commit(
      { kind: "settle-attempt", attempt: settled },
      { kind: "pause", waiting: PAUSE },
    );

    expect(written).toHaveLength(1);
    expect(written[0]!.attempts[0]!.result).toBe("waiting");
    expect(written[0]!.condition).toBe("waiting-for-user");
    expect(written[0]!.waiting).toEqual(PAUSE);
  });

  it("stamps updatedAt on every write and leaves createdAt alone", async () => {
    const { run, written } = cursor();

    await run.commit({ kind: "pause", waiting: PAUSE });

    expect(written[0]!.updatedAt).toBe(CLOCK.toISOString());
    expect(written[0]!.createdAt).toBe("2026-02-01T09:59:59.000Z");
    expect(run.checkpoint.updatedAt).toBe(CLOCK.toISOString());
  });

  it("leaves the cursor where it was when the write fails", async () => {
    const { run } = cursor(baseCheckpoint(), async () => {
      throw new Error("state root is read-only");
    });

    const outcome = await run.commit({ kind: "pause", waiting: PAUSE });

    expect(outcome).toEqual({ ok: false, message: "state root is read-only" });
    expect(run.checkpoint.condition).toBe("ready");
    expect(run.checkpoint.waiting).toBeNull();
    expect(run.checkpoint.updatedAt).toBe("2026-02-01T09:59:59.000Z");
  });

  it("reports a non-Error rejection as its own text", async () => {
    const { run } = cursor(baseCheckpoint(), async () => {
      throw "ENOSPC";
    });
    expect(await run.commit({ kind: "advance" })).toEqual({
      ok: false,
      message: "ENOSPC",
    });
  });

  it("moves the cursor in memory alone on apply", async () => {
    const { run, written } = cursor(
      baseCheckpoint({ condition: "waiting-for-user", waiting: PAUSE }),
    );

    run.apply({ kind: "become-ready" });

    expect(written).toEqual([]);
    expect(run.checkpoint.condition).toBe("ready");
    expect(run.checkpoint.waiting).toBeNull();
    expect(run.checkpoint.updatedAt).toBe("2026-02-01T09:59:59.000Z");
  });
});

describe("RunState — a pause the checkpoint already records", () => {
  it("writes nothing and restamps nothing when the pause says the same thing", async () => {
    // Rebuilt from its fields rather than carried over, so it is a different
    // object saying the same thing — which is exactly the case a serialized
    // comparison would get wrong and a repeated resume reaches.
    const recorded = Pause.queueBlocked([
      "docs/threads/260201100000Z-t/.pending-decisions/one.md",
    ]);
    const { run, written } = cursor(
      baseCheckpoint({ condition: "waiting-for-user", waiting: recorded }),
    );
    const rebuilt = Pause.queueBlocked([
      "docs/threads/260201100000Z-t/.pending-decisions/one.md",
    ]);
    expect(rebuilt).not.toBe(recorded);

    expect(await run.commit({ kind: "pause", waiting: rebuilt })).toEqual({
      ok: true,
    });

    expect(written).toEqual([]);
    expect(run.checkpoint.updatedAt).toBe("2026-02-01T09:59:59.000Z");
    expect(run.checkpoint.waiting).toBe(recorded);
  });

  it("writes when the pause has anything new to say", async () => {
    const { run, written } = cursor(
      baseCheckpoint({
        condition: "waiting-for-user",
        waiting: Pause.queueBlocked([
          "docs/threads/260201100000Z-t/.pending-decisions/one.md",
        ]),
      }),
    );

    await run.commit({
      kind: "pause",
      waiting: Pause.queueBlocked([
        "docs/threads/260201100000Z-t/.pending-decisions/two.md",
      ]),
    });

    expect(written).toHaveLength(1);
  });

  it("writes when the run was not paused at all", async () => {
    const { run, written } = cursor();
    await run.commit({ kind: "pause", waiting: PAUSE });
    expect(written).toHaveLength(1);
  });

  it("writes when the step carries anything besides that pause", async () => {
    // The pause repeats itself, but the attempt it settles does not, so the step
    // still changes the run.
    const live = attempt();
    const recorded = Pause.queueBlocked([
      "docs/threads/260201100000Z-t/.pending-decisions/one.md",
    ]);
    const { run, written } = cursor(
      baseCheckpoint({
        condition: "executing",
        attempts: [live],
        waiting: null,
      }),
    );
    run.apply({ kind: "pause", waiting: recorded });

    await run.commit(
      {
        kind: "settle-attempt",
        attempt: {
          ...live,
          result: "waiting",
          endedAt: "2026-02-01T10:00:00.000Z",
          headAfterAttempt: "bbbb",
        },
      },
      {
        kind: "pause",
        waiting: Pause.queueBlocked([
          "docs/threads/260201100000Z-t/.pending-decisions/one.md",
        ]),
      },
    );

    expect(written).toHaveLength(1);
    expect(written[0]!.attempts[0]!.result).toBe("waiting");
  });
});
