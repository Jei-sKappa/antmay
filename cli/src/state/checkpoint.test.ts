import { describe, expect, it } from "vitest";

import { governedBy } from "../test-helpers/waiting.js";
import type {
  AttemptRecord,
  RunCheckpoint,
  WaitingRecovery,
} from "./checkpoint.js";
import { validateCheckpoint } from "./checkpoint.js";

function validCheckpoint(): RunCheckpoint {
  return {
    schemaVersion: 0,
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
    pipelineName: "standard",
    pipelineSourcePath: "/Users/dev/.config/antmay/pipelines/standard.json",
    profileSelection: {
      kind: "profile",
      name: "maximum-quality",
      sourcePath: "/Users/dev/.config/antmay/profiles/maximum-quality.json",
    },
    stages: [
      {
        id: "spec",
        skill: "spec",
        targetRule: { kind: "fixed", target: { kind: "thread-root" } },
        prerequisite: { validThread: true },
        promises: { spec: true },
        gitPolicy: {
          headMayChange: false,
          allowedChanges: [{ kind: "exact-file", threadRelativePath: "spec.md" }],
          changeRequired: true,
          commitSubjectTemplate: "chore(afk): spec <thread-folder>",
        },
        queueResolution: "rerun",
        resolvedTarget: "docs/threads/260723121015Z-demo/",
        instructions: "Cover the migration path.",
        binding: {
          agent: { harness: "codex", model: "gpt-5" },
          idleTimeoutSeconds: 900,
          heartbeatSeconds: 300,
        },
      },
      {
        id: "plan-strict",
        skill: "plan-strict",
        targetRule: {
          kind: "fixed",
          target: { kind: "thread-file", path: "spec.md" },
        },
        prerequisite: { validThread: true, spec: true },
        promises: { plan: "strict" },
        gitPolicy: {
          headMayChange: true,
          allowedChanges: [],
          changeRequired: false,
          commitSubjectTemplate: null,
        },
        queueResolution: "advance",
        resolvedTarget: "docs/threads/260723121015Z-demo/spec.md",
        binding: {
          agent: { harness: "claude-code", model: "claude" },
          idleTimeoutSeconds: 1200,
          heartbeatSeconds: 300,
        },
      },
    ],
    observedHarnessVersions: { codex: "codex 1.0.0", "claude-code": "claude 2.0.0" },
    runtime: { kind: "real" },
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
        headAtStart: "abc123",
        headAfterAttempt: "abc123",
        logPath: "logs/00-spec-attempt-01.log",
      },
    ],
    waiting: governedBy({
      kind: "outcome-blocked",
      message: "The spec stage reported BLOCKED.",
      candidateLine: "Outcome: BLOCKED — x",
    }),
  };
}

/** A settled current-stage attempt that reported DONE, which the three
 * attempt-referencing recoveries are all about. */
function doneAttempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    attempt: 1,
    stageIndex: 0,
    stageId: "spec",
    startedAt: "2026-07-23T12:15:01.000Z",
    endedAt: "2026-07-23T12:15:30.000Z",
    result: "waiting",
    terminalResult: { token: "DONE", candidateLine: "Outcome: DONE", detail: "done" },
    headAtStart: "aaa111",
    headAfterAttempt: "bbb222",
    logPath: "logs/00-spec-attempt-01.log",
    ...overrides,
  };
}

/** A newer current-stage failure that makes any reference to attempt 1 stale. */
function laterBlockedAttempt(): AttemptRecord {
  return doneAttempt({
    attempt: 2,
    result: "waiting",
    terminalResult: {
      token: "BLOCKED",
      candidateLine: "Outcome: BLOCKED — later attempt",
      detail: "later attempt",
    },
    failure: { kind: "outcome-blocked", message: "later attempt blocked" },
    logPath: "logs/00-spec-attempt-02.log",
  });
}

/**
 * A waiting checkpoint carrying two diagnostic reasons and one recovery, so a
 * case can state the recovery it is about and nothing else. The reasons are
 * deliberately unrelated to the recovery: nothing may be inferred from them.
 */
function withRecovery(
  recovery: WaitingRecovery,
  attempts: AttemptRecord[] = [doneAttempt()],
): RunCheckpoint {
  return {
    ...validCheckpoint(),
    attempts,
    waiting: {
      reasons: [
        { kind: "git-policy-violation", message: "The boundary was refused." },
        {
          kind: "pending-queues",
          message: "1 pending bundle file awaits human resolution.",
          pendingFiles: ["docs/threads/260723121015Z-demo/.pending-decisions/d.md"],
        },
      ],
      recovery: { ...recovery },
    },
  };
}

const RECHECK_CONTRACT: WaitingRecovery = {
  kind: "recheck-stage-contract",
  attempt: { stageIndex: 0, attempt: 1 },
  pausedAtHead: "ccc333",
};

const RETRY_GIT: WaitingRecovery = {
  kind: "retry-git-finalization",
  attempt: { stageIndex: 0, attempt: 1 },
  pausedAtHead: "ccc333",
};

/** Stage 0 of the fixture declares `rerun`, which the recovery must agree with. */
const RESUME_FINALIZED: WaitingRecovery = {
  kind: "resume-finalized-done",
  attempt: { stageIndex: 0, attempt: 1 },
  queueResolution: "rerun",
};

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

  it("round-trips the attempt HEAD observations and observed harness-version map", () => {
    const result = validateCheckpoint(validCheckpoint());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.attempts[0].headAtStart).toBe("abc123");
      expect(result.checkpoint.attempts[0].headAfterAttempt).toBe("abc123");
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
    doc.waiting = governedBy({
      kind: "malformed-outcome",
      message: "No valid outcome token.",
    });
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

describe("validateCheckpoint — resolved execution snapshot (AC-6.2)", () => {
  it("round-trips pipeline provenance, profile selection, and the entry point", () => {
    const doc = validCheckpoint();
    doc.fromStage = "spec";
    const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checkpoint.pipelineName).toBe("standard");
    expect(result.checkpoint.pipelineSourcePath).toBe(
      "/Users/dev/.config/antmay/pipelines/standard.json",
    );
    expect(result.checkpoint.profileSelection).toEqual({
      kind: "profile",
      name: "maximum-quality",
      sourcePath: "/Users/dev/.config/antmay/profiles/maximum-quality.json",
    });
    expect(result.checkpoint.fromStage).toBe("spec");
  });

  it("round-trips each stage's catalog contract, target, instructions, and binding", () => {
    const result = validateCheckpoint(
      JSON.parse(JSON.stringify(validCheckpoint())),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [spec, plan] = result.checkpoint.stages;
    expect(spec.prerequisite).toEqual({ validThread: true });
    expect(spec.promises).toEqual({ spec: true });
    expect(spec.targetRule).toEqual({
      kind: "fixed",
      target: { kind: "thread-root" },
    });
    expect(spec.resolvedTarget).toBe("docs/threads/260723121015Z-demo/");
    expect(spec.instructions).toBe("Cover the migration path.");
    expect(spec.binding).toEqual({
      agent: { harness: "codex", model: "gpt-5" },
      idleTimeoutSeconds: 900,
      heartbeatSeconds: 300,
    });
    expect(plan.instructions).toBeUndefined();
  });

  it("accepts the settings-only selection and no entry point", () => {
    const doc = validCheckpoint();
    doc.profileSelection = { kind: "settings-only" };
    delete doc.fromStage;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checkpoint.profileSelection).toEqual({ kind: "settings-only" });
    expect(result.checkpoint.fromStage).toBeUndefined();
  });

  it("requires the pipeline source provenance", () => {
    const doc = validCheckpoint() as Record<string, unknown>;
    delete doc.pipelineSourcePath;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /pipelineSourcePath/.test(e))).toBe(true);
    }
  });

  it("requires a selected profile to carry both name and source", () => {
    const doc = validCheckpoint();
    doc.profileSelection = { kind: "profile", name: "quality" } as never;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /profileSelection\.sourcePath/.test(e)),
      ).toBe(true);
    }
  });

  it("rejects a fromStage that names no catalog stage", () => {
    const doc = { ...validCheckpoint(), fromStage: "propose" as never };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /fromStage/.test(e))).toBe(true);
    }
  });

  it("rejects a stage id that names no catalog stage", () => {
    const doc = validCheckpoint();
    doc.stages[0].id = "propose" as never;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /stages\[0\]\.id/.test(e))).toBe(true);
    }
  });

  it("rejects an artifact contract naming an unknown dimension or value", () => {
    const doc = validCheckpoint();
    (doc.stages[0].prerequisite as Record<string, unknown>).roadmap = true;
    (doc.stages[0].promises as Record<string, unknown>).spec = "present";
    doc.stages[1].promises.plan = "partial" as never;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) =>
          /stages\[0\]\.prerequisite\.roadmap is not an artifact-state dimension/.test(e),
        ),
      ).toBe(true);
      expect(
        result.errors.some((e) => /stages\[0\]\.promises\.spec must be a boolean/.test(e)),
      ).toBe(true);
      expect(
        result.errors.some((e) =>
          /stages\[1\]\.promises\.plan must be a known plan state/.test(e),
        ),
      ).toBe(true);
    }
  });

  it("rejects an empty instructions string", () => {
    const doc = validCheckpoint();
    doc.stages[0].instructions = "";
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /stages\[0\]\.instructions/.test(e))).toBe(
        true,
      );
    }
  });

  it("rejects a resolved target that escapes its repository-relative form", () => {
    const doc = validCheckpoint();
    doc.stages[0].resolvedTarget = "/Users/dev/repo/docs/threads/x";
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /stages\[0\]\.resolvedTarget/.test(e)),
      ).toBe(true);
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

  it("rejects a stage binding that carries no heartbeat interval", () => {
    const doc = validCheckpoint();
    delete (doc.stages[0].binding as Record<string, unknown>).heartbeatSeconds;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /heartbeatSeconds/.test(e))).toBe(true);
    }
  });

  it("rejects a non-positive heartbeat interval", () => {
    const doc = validCheckpoint();
    doc.stages[0].binding.heartbeatSeconds = 0;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /heartbeatSeconds/.test(e))).toBe(true);
    }
  });

  it("rejects a waiting object that records no reasons", () => {
    const doc = validCheckpoint();
    delete (doc.waiting as Record<string, unknown>).reasons;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /reasons must be a non-empty array/.test(e))).toBe(
        true,
      );
    }
  });

  it("rejects non-string diagnostics on a reason", () => {
    const doc = validCheckpoint();
    doc.waiting = governedBy({
      kind: "harness-error",
      message: "The provider returned an error.",
      diagnostics: { errorClass: 503 as unknown as string },
    });
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) =>
          /reasons\[0\]\.diagnostics\.errorClass must be a string/.test(e),
        ),
      ).toBe(true);
    }
  });

  it("accepts diagnostics recorded on the reason they describe", () => {
    const doc = validCheckpoint();
    doc.waiting = governedBy({
      kind: "harness-error",
      message: "The provider returned an error.",
      diagnostics: { errorClass: "HttpError", errorMessage: "503", origin: "SIGINT" },
    });
    expect(validateCheckpoint(doc).ok).toBe(true);
  });

  it("rejects unsorted pending paths", () => {
    const doc = validCheckpoint();
    doc.waiting = governedBy({
      kind: "pending-queues",
      message: "queues",
      pendingFiles: ["b.md", "a.md"],
    });
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /lexically sorted/.test(e))).toBe(true);
  });

  it("rejects duplicate pending paths", () => {
    const doc = validCheckpoint();
    doc.waiting = governedBy({
      kind: "pending-queues",
      message: "queues",
      pendingFiles: ["a.md", "a.md"],
    });
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
    delete doc.attempts[0].headAfterAttempt;
    const ok = validateCheckpoint(doc);
    expect(ok.ok).toBe(true);

    const bad = validCheckpoint();
    bad.condition = "ready";
    bad.waiting = null;
    bad.stageIndex = 1;
    bad.attempts[0].result = "executing";
    bad.attempts[0].terminalResult = null;
    delete bad.attempts[0].headAfterAttempt;
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

});

describe("validateCheckpoint — attempt agentSession (AC-2.1)", () => {
  it("accepts an attempt with no agentSession", () => {
    const doc = validCheckpoint();
    expect(doc.attempts[0].agentSession).toBeUndefined();
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.attempts[0].agentSession).toBeUndefined();
    }
  });

  it("round-trips a valid ID-only agentSession", () => {
    const doc = validCheckpoint();
    doc.attempts[0].agentSession = { id: "S" };
    const roundTripped = JSON.parse(JSON.stringify(doc));
    const result = validateCheckpoint(roundTripped);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.attempts[0].agentSession).toEqual({ id: "S" });
      expect(result.checkpoint.schemaVersion).toBe(0);
    }
  });

  it("rejects a null agentSession", () => {
    const doc = validCheckpoint();
    (doc.attempts[0] as Record<string, unknown>).agentSession = null;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /attempts\[0\]\.agentSession must be an object/.test(e))).toBe(
        true,
      );
    }
  });

  it("rejects a non-object agentSession", () => {
    const doc = validCheckpoint();
    (doc.attempts[0] as Record<string, unknown>).agentSession = "S";
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /attempts\[0\]\.agentSession must be an object/.test(e))).toBe(
        true,
      );
    }
  });

  it("rejects an agentSession missing id", () => {
    const doc = validCheckpoint();
    (doc.attempts[0] as Record<string, unknown>).agentSession = {};
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /attempts\[0\]\.agentSession\.id must be a non-empty string/.test(e)),
      ).toBe(true);
    }
  });

  it("rejects a non-string agentSession.id", () => {
    const doc = validCheckpoint();
    (doc.attempts[0] as Record<string, unknown>).agentSession = { id: 42 };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /attempts\[0\]\.agentSession\.id must be a non-empty string/.test(e)),
      ).toBe(true);
    }
  });

  it("rejects an empty agentSession.id", () => {
    const doc = validCheckpoint();
    doc.attempts[0].agentSession = { id: "" };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /attempts\[0\]\.agentSession\.id must be a non-empty string/.test(e)),
      ).toBe(true);
    }
  });
});

describe("validateCheckpoint — artifact-contract pauses (AC-7.1, AC-7.3)", () => {
  it("round-trips an unmet-prerequisite pause with its expected and observed state", () => {
    const doc = validCheckpoint();
    doc.waiting = governedBy(
      {
        kind: "stage-prerequisite-unmet",
        message: "The stage cannot start: it requires spec = true.",
        contract: [{ dimension: "spec", expected: true, observed: false }],
      },
      { nextAction: "Restore the artifact state the stage requires." },
    );
    const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.waiting?.reasons[0].contract).toEqual([
        { dimension: "spec", expected: true, observed: false },
      ]);
    }
  });

  it("accepts a stage-contract-violation carrying a plan-state mismatch", () => {
    const doc = withRecovery(RECHECK_CONTRACT);
    doc.waiting = {
      reasons: [
        {
          kind: "stage-contract-violation",
          message: "The stage reported DONE without leaving its promised plan.",
          contract: [{ dimension: "plan", expected: "strict", observed: "brief" }],
        },
      ],
      recovery: RECHECK_CONTRACT,
    };
    const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.waiting?.reasons[0].contract).toEqual([
        { dimension: "plan", expected: "strict", observed: "brief" },
      ]);
    }
  });

  it("rejects a contract entry naming something that is not a dimension", () => {
    const doc = validCheckpoint();
    doc.waiting = governedBy({
      kind: "stage-contract-violation",
      message: "unmet",
      contract: [
        { dimension: "roadmap" as unknown as "spec", expected: true, observed: false },
      ],
    });
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) =>
          /contract\[0\]\.dimension is not an artifact-state dimension/.test(e),
        ),
      ).toBe(true);
    }
  });

  it("rejects a value of the wrong type for its dimension", () => {
    const doc = validCheckpoint();
    doc.waiting = governedBy({
      kind: "stage-contract-violation",
      message: "unmet",
      contract: [
        { dimension: "plan", expected: true as unknown as "strict", observed: "brief" },
        {
          dimension: "spec",
          expected: true,
          observed: "absent" as unknown as boolean,
        },
      ],
    });
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) =>
          /contract\[0\]\.expected must be a valid value for the "plan" dimension/.test(e),
        ),
      ).toBe(true);
      expect(
        result.errors.some((e) =>
          /contract\[1\]\.observed must be a valid value for the "spec" dimension/.test(e),
        ),
      ).toBe(true);
    }
  });

  it("rejects an empty or non-array contract", () => {
    for (const contract of [[], "spec" as unknown as []]) {
      const doc = validCheckpoint();
      doc.waiting = governedBy({
        kind: "stage-prerequisite-unmet",
        message: "unmet",
        contract,
      });
      const result = validateCheckpoint(doc);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.errors.some((e) => /contract must be a non-empty array/.test(e)),
        ).toBe(true);
      }
    }
  });
});

describe("validateCheckpoint — harness runtime identity (AC-2.6, AC-5.1)", () => {
  it("round-trips each legal runtime identity", () => {
    for (const kind of ["real", "scripted"] as const) {
      const doc = { ...validCheckpoint(), runtime: { kind } };
      const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.checkpoint.runtime).toEqual({ kind });
    }
  });

  it("rejects an absent runtime identity", () => {
    const doc = validCheckpoint() as Record<string, unknown>;
    delete doc.runtime;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /runtime is required/.test(e))).toBe(true);
    }
  });

  it("rejects an unknown runtime identity", () => {
    const doc = { ...validCheckpoint(), runtime: { kind: "sandbox" } as never };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /runtime\.kind must be/.test(e))).toBe(true);
    }
  });

  it("preserves the identity across representative condition transitions", () => {
    const transitions: RunCheckpoint[] = [
      { ...validCheckpoint(), runtime: { kind: "scripted" }, condition: "ready", waiting: null },
      {
        ...validCheckpoint(),
        runtime: { kind: "scripted" },
        condition: "executing",
        waiting: null,
        attempts: [
          doneAttempt({
            result: "executing",
            terminalResult: null,
            endedAt: undefined,
            headAfterAttempt: undefined,
          }),
        ],
      },
      {
        ...validCheckpoint(),
        runtime: { kind: "scripted" },
        condition: "waiting-for-user",
        waiting: governedBy({
          kind: "outcome-blocked",
          message:
            "The spec stage reported BLOCKED and paused for human attention.",
          candidateLine: "Outcome: BLOCKED — x",
        }),
        attempts: [
          doneAttempt({
            terminalResult: {
              token: "BLOCKED",
              candidateLine: "Outcome: BLOCKED — x",
              detail: "blocked",
            },
          }),
        ],
      },
      {
        ...validCheckpoint(),
        runtime: { kind: "scripted" },
        condition: "waiting-for-user",
        waiting: governedBy({
          kind: "interrupted",
          message: "The harness attempt was interrupted by a signal.",
        }),
        attempts: [doneAttempt({ result: "interrupted", terminalResult: null })],
      },
      {
        ...validCheckpoint(),
        runtime: { kind: "scripted" },
        condition: "completed",
        stageIndex: 2,
        waiting: null,
        attempts: [doneAttempt({ result: "done" })],
      },
    ];
    for (const doc of transitions) {
      const result = validateCheckpoint(doc);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.checkpoint.runtime).toEqual({ kind: "scripted" });
      }
    }
  });
});

describe("validateCheckpoint — waiting recovery round trips (AC-2.1)", () => {
  const variants: Array<{ name: string; checkpoint: () => RunCheckpoint }> = [
    {
      name: "retry-stage",
      checkpoint: () =>
        withRecovery({ kind: "retry-stage" }, [
          doneAttempt({
            terminalResult: {
              token: "BLOCKED",
              candidateLine: "Outcome: BLOCKED",
              detail: "",
            },
          }),
        ]),
    },
    {
      name: "resume-finalized-done",
      checkpoint: () =>
        withRecovery(RESUME_FINALIZED, [doneAttempt({ result: "done" })]),
    },
    { name: "recheck-stage-contract", checkpoint: () => withRecovery(RECHECK_CONTRACT) },
    { name: "retry-git-finalization", checkpoint: () => withRecovery(RETRY_GIT) },
  ];

  for (const variant of variants) {
    it(`accepts a ${variant.name} recovery and preserves its reasons and data`, () => {
      const original = variant.checkpoint();
      const result = validateCheckpoint(JSON.parse(JSON.stringify(original)));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.checkpoint).toEqual(original);
      expect(result.checkpoint.waiting?.recovery).toEqual(original.waiting?.recovery);
      expect(result.checkpoint.waiting?.reasons.map((r) => r.kind)).toEqual([
        "git-policy-violation",
        "pending-queues",
      ]);
      expect(result.checkpoint.schemaVersion).toBe(0);
    });
  }

  it("accepts the same recovery whatever order the diagnostic reasons are in", () => {
    const doc = withRecovery(RETRY_GIT);
    const reversed = {
      ...doc,
      waiting: {
        ...doc.waiting!,
        reasons: [doc.waiting!.reasons[1]!, doc.waiting!.reasons[0]!] as never,
      },
    };
    const result = validateCheckpoint(JSON.parse(JSON.stringify(reversed)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint.waiting?.recovery).toEqual(RETRY_GIT);
  });

  it("accepts prior-stage history when recovery names the final current-stage attempt", () => {
    const recovery: WaitingRecovery = {
      kind: "retry-git-finalization",
      attempt: { stageIndex: 1, attempt: 1 },
      pausedAtHead: "ccc333",
    };
    const doc = withRecovery(recovery, [
      doneAttempt({ result: "done" }),
      doneAttempt({
        stageIndex: 1,
        stageId: "plan-strict",
        logPath: "logs/01-plan-strict-attempt-01.log",
      }),
    ]);
    doc.stageIndex = 1;

    const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint.waiting?.recovery).toEqual(recovery);
  });
});

describe("validateCheckpoint — waiting recovery rejections (AC-2.2, AC-2.5)", () => {
  const cases: Array<{ name: string; document: () => unknown; error: RegExp }> = [
    {
      name: "a waiting checkpoint with no recovery",
      document: () => {
        const doc = withRecovery(RETRY_GIT);
        delete (doc.waiting as Record<string, unknown>).recovery;
        return doc;
      },
      error: /waiting\.recovery is required/,
    },
    {
      name: "an unknown recovery kind",
      document: () => withRecovery({ kind: "give-up" } as never),
      error: /waiting\.recovery\.kind must be a known waiting recovery kind/,
    },
    {
      name: "an absent attempt reference",
      document: () => {
        const doc = withRecovery(RETRY_GIT);
        delete (doc.waiting!.recovery as Record<string, unknown>).attempt;
        return doc;
      },
      error: /waiting\.recovery\.attempt is required/,
    },
    {
      name: "a reference to another stage",
      document: () =>
        withRecovery({ ...RETRY_GIT, attempt: { stageIndex: 1, attempt: 1 } }),
      error: /must name the current stage/,
    },
    {
      name: "a reference to an attempt number that was never recorded",
      document: () =>
        withRecovery({ ...RETRY_GIT, attempt: { stageIndex: 0, attempt: 2 } }),
      error: /names no recorded attempt/,
    },
    {
      name: "a finalized-DONE recovery that references an older matching attempt",
      document: () =>
        withRecovery(RESUME_FINALIZED, [
          doneAttempt({ result: "done" }),
          laterBlockedAttempt(),
        ]),
      error: /must name the final attempt in the ordered history/,
    },
    {
      name: "a contract-recheck recovery that references an older matching attempt",
      document: () =>
        withRecovery(RECHECK_CONTRACT, [doneAttempt(), laterBlockedAttempt()]),
      error: /must name the final attempt in the ordered history/,
    },
    {
      name: "a Git-retry recovery that references an older matching attempt",
      document: () =>
        withRecovery(RETRY_GIT, [doneAttempt(), laterBlockedAttempt()]),
      error: /must name the final attempt in the ordered history/,
    },
    {
      name: "a referenced attempt whose terminal token is not DONE",
      document: () =>
        withRecovery(RETRY_GIT, [
          doneAttempt({
            terminalResult: {
              token: "BLOCKED",
              candidateLine: "Outcome: BLOCKED",
              detail: "",
            },
          }),
        ]),
      error: /terminal token is DONE/,
    },
    {
      name: "a referenced attempt whose result the recovery cannot start from",
      document: () => withRecovery(RESUME_FINALIZED, [doneAttempt()]),
      error: /must name an attempt with result "done"/,
    },
    {
      name: "a queue resolution the current stage does not declare",
      document: () =>
        withRecovery({ ...RESUME_FINALIZED, queueResolution: "advance" }, [
          doneAttempt({ result: "done" }),
        ]),
      error: /does not match the current stage's snapshotted resolution/,
    },
    {
      name: "an attempt with no start HEAD",
      document: () => {
        const doc = withRecovery(RETRY_GIT);
        delete (doc.attempts[0] as Record<string, unknown>).headAtStart;
        return doc;
      },
      error: /attempts\[0\]\.headAtStart must be a commit string/,
    },
    {
      name: "a settled attempt with no post-attempt HEAD",
      document: () => {
        const doc = withRecovery(RETRY_GIT);
        delete (doc.attempts[0] as Record<string, unknown>).headAfterAttempt;
        return doc;
      },
      error: /attempts\[0\]\.headAfterAttempt must be a commit string on a settled attempt/,
    },
    {
      name: "a recheck-stage-contract recovery with no pause-time HEAD",
      document: () => {
        const doc = withRecovery(RECHECK_CONTRACT);
        delete (doc.waiting!.recovery as Record<string, unknown>).pausedAtHead;
        return doc;
      },
      error: /pausedAtHead must be a commit string on a "recheck-stage-contract" recovery/,
    },
    {
      name: "a retry-git-finalization recovery with no pause-time HEAD",
      document: () => {
        const doc = withRecovery(RETRY_GIT);
        delete (doc.waiting!.recovery as Record<string, unknown>).pausedAtHead;
        return doc;
      },
      error: /pausedAtHead must be a commit string on a "retry-git-finalization" recovery/,
    },
    {
      name: "a pause-time HEAD on a retry-stage recovery",
      document: () =>
        withRecovery({ kind: "retry-stage", pausedAtHead: "ccc333" } as never),
      error: /pausedAtHead is not permitted on a "retry-stage" recovery/,
    },
    {
      name: "a pause-time HEAD on a resume-finalized-done recovery",
      document: () =>
        withRecovery({ ...RESUME_FINALIZED, pausedAtHead: "ccc333" } as never, [
          doneAttempt({ result: "done" }),
        ]),
      error: /pausedAtHead is not permitted on a "resume-finalized-done" recovery/,
    },
    {
      name: "an attempt reference on a retry-stage recovery",
      document: () =>
        withRecovery({
          kind: "retry-stage",
          attempt: { stageIndex: 0, attempt: 1 },
        } as never),
      error: /attempt is not permitted on a "retry-stage" recovery/,
    },
    {
      name: "a queue resolution on a retry-stage recovery",
      document: () =>
        withRecovery({ kind: "retry-stage", queueResolution: "rerun" } as never),
      error: /queueResolution is not permitted on a "retry-stage" recovery/,
    },
    {
      name: "a queue resolution on a recheck-stage-contract recovery",
      document: () =>
        withRecovery({ ...RECHECK_CONTRACT, queueResolution: "advance" } as never),
      error:
        /queueResolution is not permitted on a "recheck-stage-contract" recovery/,
    },
    {
      name: "a queue resolution on a retry-git-finalization recovery",
      document: () =>
        withRecovery({ ...RETRY_GIT, queueResolution: "advance" } as never),
      error:
        /queueResolution is not permitted on a "retry-git-finalization" recovery/,
    },
    {
      name: "an arbitrary field on a resume-finalized-done recovery",
      document: () =>
        withRecovery({ ...RESUME_FINALIZED, legacyCursor: "old" } as never, [
          doneAttempt({ result: "done" }),
        ]),
      error:
        /legacyCursor is not permitted on a "resume-finalized-done" recovery/,
    },
    {
      name: "an arbitrary field in an attempt reference",
      document: () =>
        withRecovery({
          ...RETRY_GIT,
          attempt: { stageIndex: 0, attempt: 1, stageId: "spec" },
        } as never),
      error: /waiting\.recovery\.attempt\.stageId is not permitted/,
    },
    {
      name: "a recovery on a checkpoint that is not waiting",
      document: () => ({ ...withRecovery(RETRY_GIT), condition: "ready", stageIndex: 1 }),
      error: /requires waiting to be null/,
    },
    {
      name: "a waiting checkpoint with no diagnostic reason",
      document: () => {
        const doc = withRecovery(RETRY_GIT);
        (doc.waiting as Record<string, unknown>).reasons = [];
        return doc;
      },
      error: /reasons must be a non-empty array/,
    },
  ];

  for (const testCase of cases) {
    it(`rejects ${testCase.name}`, () => {
      const result = validateCheckpoint(
        JSON.parse(JSON.stringify(testCase.document())),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => testCase.error.test(e))).toBe(true);
      }
    });
  }

  it("permits a missing post-attempt HEAD only while the attempt is executing", () => {
    const executing: RunCheckpoint = {
      ...validCheckpoint(),
      condition: "executing",
      waiting: null,
      attempts: [
        doneAttempt({
          result: "executing",
          terminalResult: null,
          endedAt: undefined,
          headAfterAttempt: undefined,
        }),
      ],
    };
    expect(validateCheckpoint(JSON.parse(JSON.stringify(executing))).ok).toBe(true);

    const settledLive = validateCheckpoint(
      JSON.parse(
        JSON.stringify({
          ...executing,
          attempts: [
            doneAttempt({
              result: "executing",
              terminalResult: null,
              endedAt: undefined,
            }),
          ],
        }),
      ),
    );
    expect(settledLive.ok).toBe(false);
    if (!settledLive.ok) {
      expect(
        settledLive.errors.some((e) =>
          /headAfterAttempt is not permitted while the attempt is executing/.test(e),
        ),
      ).toBe(true);
    }
  });
});

describe("validateCheckpoint — recovery regressions the audit found accepted (AC-2.3, AC-2.6)", () => {
  it("rejects a saved-DONE recovery whose referenced attempt reported BLOCKED", () => {
    const doc = withRecovery(RESUME_FINALIZED, [
      doneAttempt({
        result: "waiting",
        terminalResult: {
          token: "BLOCKED",
          candidateLine: "Outcome: BLOCKED — needs a human",
          detail: "needs a human",
        },
      }),
    ]);
    const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /terminal token is DONE/.test(e))).toBe(true);
      expect(
        result.errors.some((e) => /must name an attempt with result "done"/.test(e)),
      ).toBe(true);
    }
  });

  it("rejects a finalization recovery on a checkpoint with no attempt at all", () => {
    const doc = withRecovery(RETRY_GIT, []);
    const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /names no recorded attempt/.test(e))).toBe(true);
    }
  });

  it("rejects a document written against the previous version-zero shape", () => {
    // What makes such a document old is what it does not carry: the runtime
    // identity, the pause's recovery, and the attempt's own HEAD evidence.
    const old = { ...validCheckpoint() } as Record<string, unknown>;
    delete old.runtime;
    delete (old.waiting as Record<string, unknown>).recovery;
    delete (
      (old.attempts as Record<string, unknown>[])[0] as Record<string, unknown>
    ).headAtStart;

    const result = validateCheckpoint(JSON.parse(JSON.stringify(old)));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /runtime is required/.test(e))).toBe(true);
      expect(result.errors.some((e) => /waiting\.recovery is required/.test(e))).toBe(
        true,
      );
      expect(
        result.errors.some((e) => /attempts\[0\]\.headAtStart/.test(e)),
      ).toBe(true);
      expect(result.errors.some((e) => /migration/i.test(e))).toBe(false);
    }
  });

  it("carries no stage-global Git cursor in the current shape", () => {
    const result = validateCheckpoint(JSON.parse(JSON.stringify(validCheckpoint())));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.checkpoint).filter((k) => /cursor/i.test(k))).toEqual(
        [],
      );
      expect(result.checkpoint.schemaVersion).toBe(0);
    }
  });
});
