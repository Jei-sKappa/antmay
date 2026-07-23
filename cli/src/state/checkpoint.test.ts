import { describe, expect, it } from "vitest";

import type { RunCheckpoint } from "./checkpoint.js";
import { validateCheckpoint } from "./checkpoint.js";

function validCheckpoint(): RunCheckpoint {
  return {
    schemaVersion: 1,
    runId: "20260723T121500123Z-0a1b2c3d",
    executor: { pid: 4242, version: "0.1.0" },
    createdAt: "2026-07-23T12:15:00.123Z",
    updatedAt: "2026-07-23T12:16:00.000Z",
    repoRoot: "/Users/dev/repo",
    threadRelPath: "docs/threads/260723121015Z-demo",
    workspace: {
      strategy: "current-checkout",
      path: "/Users/dev/repo",
      execution: { cwd: "/Users/dev/repo", sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    recipeName: "standard",
    stages: [
      {
        id: "spec",
        skill: "spec",
        target: { kind: "thread-root" },
        gitPolicy: {
          headMayChange: false,
          allowedChanges: [
            { kind: "exact-file", threadRelativePath: "docs/threads/x/spec.md" },
          ],
          changeRequired: true,
          commitSubjectTemplate: "chore(afk): spec <thread-folder>",
        },
        queueResolution: "rerun",
        profile: {
          harness: "codex",
          model: "gpt-5",
          prompt: "do spec",
          idleTimeoutSeconds: 900,
        },
        resolvedTarget: "/Users/dev/repo/docs/threads/x",
      },
      {
        id: "plan",
        skill: "plan-strict",
        target: { kind: "thread-file", path: "docs/threads/x/plan.md" },
        gitPolicy: {
          headMayChange: true,
          allowedChanges: [],
          changeRequired: false,
          commitSubjectTemplate: null,
        },
        queueResolution: "advance",
        profile: {
          harness: "claude-code",
          model: "claude",
          prompt: "do plan",
          idleTimeoutSeconds: 1200,
        },
        resolvedTarget: "/Users/dev/repo/docs/threads/x/plan.md",
      },
    ],
    observedHarnessVersions: { codex: "codex 1.0.0", "claude-code": "claude 2.0.0" },
    stageIndex: 0,
    condition: "waiting-for-user",
    attempts: [
      {
        attempt: 1,
        stageIndex: 0,
        stageId: "spec",
        startedAt: "2026-07-23T12:15:01.000Z",
        endedAt: "2026-07-23T12:15:30.000Z",
        result: "waiting",
        terminalResult: { token: "BLOCKED", candidateLine: "Outcome: BLOCKED — x", detail: "blocked" },
        logPath: "logs/00-spec-attempt-01.log",
      },
    ],
    waiting: {
      kind: "outcome-blocked",
      message: "The spec stage reported BLOCKED.",
      candidateLine: "Outcome: BLOCKED — x",
    },
    gitCursor: { stageIndex: 0, headAtStageEntry: "abc123", observedHead: "abc123" },
  };
}

describe("validateCheckpoint field and round-trip (AC-13.1)", () => {
  it("accepts a full round-tripped checkpoint", () => {
    const original = validCheckpoint();
    const roundTripped = JSON.parse(JSON.stringify(original));
    const result = validateCheckpoint(roundTripped);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint).toEqual(original);
    }
  });

  it("round-trips the HEAD cursor and observed harness-version map", () => {
    const result = validateCheckpoint(validCheckpoint());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.gitCursor).toEqual({
        stageIndex: 0,
        headAtStageEntry: "abc123",
        observedHead: "abc123",
      });
      expect(result.checkpoint.observedHarnessVersions).toEqual({
        codex: "codex 1.0.0",
        "claude-code": "claude 2.0.0",
      });
    }
  });

  it("retains a tokenless terminal candidate line", () => {
    const doc = validCheckpoint();
    doc.condition = "waiting-for-user";
    doc.attempts[0].result = "waiting";
    doc.attempts[0].terminalResult = {
      token: null,
      candidateLine: "outcome: maybe done?",
      detail: "no token parsed",
    };
    doc.waiting = { kind: "malformed-outcome", message: "No valid outcome token." };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.attempts[0].terminalResult).toEqual({
        token: null,
        candidateLine: "outcome: maybe done?",
        detail: "no token parsed",
      });
    }
  });
});

describe("validateCheckpoint schema version (AC-13.1)", () => {
  it("rejects an unknown schema version distinctly with no migration", () => {
    const doc = { ...validCheckpoint(), schemaVersion: 2 };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /schemaVersion 2/.test(e) && /no migration/i.test(e))).toBe(true);
    }
  });
});

describe("validateCheckpoint field errors", () => {
  it("reports a missing required scalar", () => {
    const doc = validCheckpoint() as Record<string, unknown>;
    delete doc.runId;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /runId/.test(e))).toBe(true);
  });

  it("rejects a non-UTC timestamp", () => {
    const doc = validCheckpoint();
    doc.createdAt = "2026-07-23 12:15:00";
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /createdAt/.test(e))).toBe(true);
  });

  it("rejects a relative repoRoot", () => {
    const doc = validCheckpoint();
    doc.repoRoot = "repo/here";
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /repoRoot/.test(e))).toBe(true);
  });

  it("rejects a non-normalized thread path", () => {
    const doc = validCheckpoint();
    doc.threadRelPath = "docs/../docs/threads/x";
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /threadRelPath/.test(e))).toBe(true);
  });
});

describe("validateCheckpoint cross-field invariants (AC-14.1, AC-12.7)", () => {
  it("rejects waiting-for-user with null waiting", () => {
    const doc = validCheckpoint();
    doc.waiting = null;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /non-null waiting/.test(e))).toBe(true);
  });

  it("rejects a non-waiting condition with a waiting object", () => {
    const doc = validCheckpoint();
    doc.condition = "ready";
    // keep waiting non-null
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /waiting to be null/.test(e))).toBe(true);
  });

  it("rejects unsorted pending paths", () => {
    const doc = validCheckpoint();
    doc.waiting = {
      kind: "pending-queues",
      message: "queues",
      pendingFiles: ["b.md", "a.md"],
    };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /lexically sorted/.test(e))).toBe(true);
  });

  it("rejects duplicate pending paths", () => {
    const doc = validCheckpoint();
    doc.waiting = {
      kind: "pending-queues",
      message: "queues",
      pendingFiles: ["a.md", "a.md"],
    };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /duplicate/.test(e))).toBe(true);
  });

  it("rejects an out-of-range stageIndex for a non-completed run", () => {
    const doc = validCheckpoint();
    doc.stageIndex = 2;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /out of range/.test(e))).toBe(true);
  });

  it("requires completed runs to sit past the last stage", () => {
    const doc = validCheckpoint();
    doc.condition = "completed";
    doc.waiting = null;
    doc.stageIndex = 1;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /stage count/.test(e))).toBe(true);
  });

  it("accepts a completed run at stageIndex === stage count", () => {
    const doc = validCheckpoint();
    doc.condition = "completed";
    doc.waiting = null;
    doc.stageIndex = 2;
    doc.attempts[0].result = "done";
    doc.attempts[0].terminalResult = {
      token: "DONE",
      candidateLine: "Outcome: DONE",
      detail: "ok",
    };
    doc.gitCursor = { stageIndex: 2, headAtStageEntry: null, observedHead: null };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(true);
  });

  it("rejects an attempt stageId that does not match the snapshot", () => {
    const doc = validCheckpoint();
    doc.attempts[0].stageId = "plan";
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /does not match snapshotted stage/.test(e))).toBe(true);
  });

  it("rejects colliding attempt numbers for the same stage", () => {
    const doc = validCheckpoint();
    doc.attempts.push({ ...doc.attempts[0] });
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /reuses attempt number/.test(e))).toBe(true);
  });

  it("rejects a done attempt without parsed DONE", () => {
    const doc = validCheckpoint();
    doc.condition = "ready";
    doc.waiting = null;
    doc.stageIndex = 1;
    doc.attempts[0].result = "done";
    doc.attempts[0].terminalResult = {
      token: "BLOCKED",
      candidateLine: "Outcome: BLOCKED",
      detail: "no",
    };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /parsed DONE/.test(e))).toBe(true);
  });

  it("requires exactly the final attempt executing iff executing", () => {
    const doc = validCheckpoint();
    doc.condition = "executing";
    doc.waiting = null;
    doc.attempts[0].result = "executing";
    doc.attempts[0].terminalResult = null;
    const ok = validateCheckpoint(doc);
    expect(ok.ok).toBe(true);

    const bad = validCheckpoint();
    bad.condition = "ready";
    bad.waiting = null;
    bad.stageIndex = 1;
    bad.attempts[0].result = "executing";
    bad.attempts[0].terminalResult = null;
    const result = validateCheckpoint(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /no attempt with result "executing"/.test(e))).toBe(true);
  });

  it("requires observed harness versions covering every stage harness", () => {
    const doc = validCheckpoint();
    doc.observedHarnessVersions = { codex: "codex 1.0.0" };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /observedHarnessVersions has no entry/.test(e))).toBe(true);
  });

  it("requires workspace.path to equal execution.cwd", () => {
    const doc = validCheckpoint();
    doc.workspace.execution.cwd = "/Users/dev/other";
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /equal workspace.execution.cwd/.test(e))).toBe(true);
  });

  it("requires gitCursor.stageIndex to name the current stage when HEAD set", () => {
    const doc = validCheckpoint();
    doc.gitCursor = { stageIndex: 1, headAtStageEntry: "abc", observedHead: null };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /name the current stage/.test(e))).toBe(true);
  });
});
