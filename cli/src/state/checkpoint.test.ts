import { describe, expect, it } from "vitest";

import { governedBy } from "../test-helpers/waiting.js";
import type { RunCheckpoint } from "./checkpoint.js";
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
    waiting: governedBy({
      kind: "outcome-blocked",
      message: "The spec stage reported BLOCKED.",
      candidateLine: "Outcome: BLOCKED — x",
    }),
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
    doc.stages[1].promises.plan = "partial" as never;
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /stages\[0\]\.prerequisite\.roadmap/.test(e)),
      ).toBe(true);
      expect(
        result.errors.some((e) => /stages\[1\]\.promises\.plan/.test(e)),
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
    const doc = validCheckpoint();
    doc.waiting = governedBy({
      kind: "stage-contract-violation",
      message: "The stage reported DONE without leaving its promised plan.",
      contract: [{ dimension: "plan", expected: "strict", observed: "brief" }],
      headAtAttemptStart: "abc123",
    });
    const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.waiting?.reasons[0].headAtAttemptStart).toBe("abc123");
    }
  });

  it("rejects a stage-contract-violation that records no attempt-start HEAD", () => {
    // Without it the finalization a repair unlocks has nothing to judge the
    // stage's HEAD rule against, so the pause is unrecoverable.
    const doc = validCheckpoint();
    doc.waiting = governedBy({
      kind: "stage-contract-violation",
      message: "The stage reported DONE without leaving its promised spec.",
      contract: [{ dimension: "spec", expected: true, observed: false }],
    });
    const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) =>
          /headAtAttemptStart is required on a stage-contract-violation reason/.test(e),
        ),
      ).toBe(true);
    }
  });

  it("rejects a non-string attempt-start HEAD on any reason", () => {
    const doc = validCheckpoint();
    doc.waiting = governedBy({
      kind: "outcome-blocked",
      message: "blocked",
      headAtAttemptStart: 7 as unknown as string,
    });
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) =>
          /headAtAttemptStart must be a commit string/.test(e),
        ),
      ).toBe(true);
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

describe("validateCheckpoint — scripted start marker (AC-5.1, AC-5.2)", () => {
  it("accepts marker-less checkpoints", () => {
    const result = validateCheckpoint(validCheckpoint());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.startedScripted).toBeUndefined();
    }
  });

  it("accepts startedScripted: true and round-trips it", () => {
    const doc = validCheckpoint();
    doc.startedScripted = true;
    const result = validateCheckpoint(JSON.parse(JSON.stringify(doc)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checkpoint.startedScripted).toBe(true);
    }
  });

  it("rejects any present value other than true", () => {
    const doc = { ...validCheckpoint(), startedScripted: false as unknown };
    const result = validateCheckpoint(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /startedScripted must be true/.test(e))).toBe(true);
    }
  });

  it("preserves the marker across representative condition transitions", () => {
    const transitions: RunCheckpoint[] = [
      { ...validCheckpoint(), startedScripted: true, condition: "ready", waiting: null },
      {
        ...validCheckpoint(),
        startedScripted: true,
        condition: "executing",
        waiting: null,
        attempts: [
          {
            attempt: 1,
            stageIndex: 0,
            stageId: "spec",
            startedAt: "2026-07-23T12:15:01.000Z",
            result: "executing",
            terminalResult: null,
            logPath: "logs/00-spec-attempt-01.log",
          },
        ],
      },
      {
        ...validCheckpoint(),
        startedScripted: true,
        condition: "waiting-for-user",
        waiting: governedBy({
          kind: "outcome-blocked",
          message:
            "The spec stage reported BLOCKED and paused for human attention.",
          candidateLine: "Outcome: BLOCKED — x",
        }),
        attempts: [
          {
            attempt: 1,
            stageIndex: 0,
            stageId: "spec",
            startedAt: "2026-07-23T12:15:01.000Z",
            endedAt: "2026-07-23T12:15:30.000Z",
            result: "waiting",
            terminalResult: {
              token: "BLOCKED",
              candidateLine: "Outcome: BLOCKED — x",
              detail: "blocked",
            },
            logPath: "logs/00-spec-attempt-01.log",
          },
        ],
      },
      {
        ...validCheckpoint(),
        startedScripted: true,
        condition: "waiting-for-user",
        waiting: governedBy({
          kind: "interrupted",
          message: "The harness attempt was interrupted by a signal.",
        }),
        attempts: [
          {
            attempt: 1,
            stageIndex: 0,
            stageId: "spec",
            startedAt: "2026-07-23T12:15:01.000Z",
            endedAt: "2026-07-23T12:15:30.000Z",
            result: "interrupted",
            terminalResult: null,
            logPath: "logs/00-spec-attempt-01.log",
          },
        ],
      },
      {
        ...validCheckpoint(),
        startedScripted: true,
        condition: "completed",
        stageIndex: 2,
        waiting: null,
        gitCursor: { stageIndex: 2, headAtStageEntry: null, observedHead: null },
        attempts: [
          {
            attempt: 1,
            stageIndex: 0,
            stageId: "spec",
            startedAt: "2026-07-23T12:15:01.000Z",
            endedAt: "2026-07-23T12:15:30.000Z",
            result: "done",
            terminalResult: {
              token: "DONE",
              candidateLine: "Outcome: DONE",
              detail: "done",
            },
            logPath: "logs/00-spec-attempt-01.log",
          },
        ],
      },
    ];
    for (const doc of transitions) {
      const result = validateCheckpoint(doc);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.checkpoint.startedScripted).toBe(true);
      }
    }
  });
});
