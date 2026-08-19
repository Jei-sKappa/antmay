import { describe, expect, it } from "vitest";

import type { ArtifactMismatch } from "../../thread/artifacts.js";

import type {
  AttemptIdentity,
  AttemptRecord,
  AttemptSettlement,
  DoneTerminalResult,
  QueueObservation,
  RunCheckpoint,
  RunCheckpointFields,
  WaitingInfo,
  WaitingReason,
} from "./types.js";

/**
 * What the durable execution vocabulary cannot represent.
 *
 * Each `@ts-expect-error` below *is* the assertion, and `npm run typecheck` is
 * what runs it: the marker fails the build the day the line beneath it becomes
 * constructible. The legal counterpart of every illegal state sits beside it, so
 * the distinction each type draws is readable from one place, and the cases the
 * suite runs are what keep those counterparts honest.
 */

const IDENTITY: AttemptIdentity = {
  attempt: 1,
  stageIndex: 0,
  stageId: "spec",
  startedAt: "2026-08-19T10:00:00.000Z",
  headAtStart: "aaa111",
  logPath: "logs/00-spec-attempt-01.log",
};

const SETTLEMENT: AttemptSettlement = {
  endedAt: "2026-08-19T10:05:00.000Z",
  headAfterAttempt: "bbb222",
  queues: { kind: "observed", pendingFiles: [] },
};

const DONE_VERDICT: DoneTerminalResult = {
  token: "DONE",
  candidateLine: "Outcome: DONE",
  detail: "",
};

describe("the attempt record admits only its four dispositions", () => {
  const executing: AttemptRecord = {
    ...IDENTITY,
    result: "executing",
    terminalResult: null,
  };
  const done: AttemptRecord = {
    ...IDENTITY,
    ...SETTLEMENT,
    result: "done",
    terminalResult: DONE_VERDICT,
  };
  const waiting: AttemptRecord = {
    ...IDENTITY,
    ...SETTLEMENT,
    result: "waiting",
    terminalResult: null,
    failure: { kind: "outcome-blocked", message: "The stage reported BLOCKED." },
  };

  // An attempt still running has reached no ending and no post-attempt tip.
  const endedWhileExecuting: AttemptRecord = {
    ...IDENTITY,
    result: "executing",
    terminalResult: null,
    // @ts-expect-error an executing attempt declares no ending timestamp
    endedAt: SETTLEMENT.endedAt,
  };
  const observedWhileExecuting: AttemptRecord = {
    ...IDENTITY,
    result: "executing",
    terminalResult: null,
    // @ts-expect-error an executing attempt declares no post-attempt HEAD
    headAfterAttempt: SETTLEMENT.headAfterAttempt,
  };

  // @ts-expect-error a done attempt requires both settlement observations
  const doneWithoutSettlement: AttemptRecord = {
    ...IDENTITY,
    result: "done",
    terminalResult: DONE_VERDICT,
  };

  // @ts-expect-error the done arm's terminal token is the advancing one
  const doneWithoutTheVerdict: AttemptRecord = {
    ...IDENTITY,
    ...SETTLEMENT,
    result: "done",
    terminalResult: { token: "BLOCKED", candidateLine: null, detail: "" },
  };

  // @ts-expect-error a waiting attempt reports the failure that stopped it
  const waitingWithoutFailure: AttemptRecord = {
    ...IDENTITY,
    ...SETTLEMENT,
    result: "waiting",
    terminalResult: null,
  };

  it("keeps the legal counterpart of each rejected record constructible", () => {
    expect([executing, done, waiting].map((record) => record.result)).toEqual([
      "executing",
      "done",
      "waiting",
    ]);
    expect([
      endedWhileExecuting,
      observedWhileExecuting,
      doneWithoutSettlement,
      doneWithoutTheVerdict,
      waitingWithoutFailure,
    ]).toHaveLength(5);
  });
});

describe("a settled attempt states its queue observation", () => {
  const observed: QueueObservation = {
    kind: "observed",
    pendingFiles: ["docs/threads/260819100000Z-t/.pending-decisions/one.md"],
  };
  const unavailable: QueueObservation = { kind: "unavailable" };

  // @ts-expect-error a settled attempt requires its queue observation
  const settledWithoutObservation: AttemptRecord = {
    ...IDENTITY,
    endedAt: SETTLEMENT.endedAt,
    headAfterAttempt: SETTLEMENT.headAfterAttempt,
    result: "done",
    terminalResult: DONE_VERDICT,
  };

  const unavailableWithFiles: QueueObservation = {
    kind: "unavailable",
    // @ts-expect-error a scan that could not run observed no files
    pendingFiles: [],
  };

  it("keeps both cases constructible and distinguishable", () => {
    expect(observed.kind === "observed" ? observed.pendingFiles : null).toHaveLength(
      1,
    );
    expect(unavailable.kind).toBe("unavailable");
    expect([settledWithoutObservation, unavailableWithFiles]).toHaveLength(2);
  });
});

describe("every waiting kind determines the evidence it carries", () => {
  const UNMET: ArtifactMismatch[] = [
    { dimension: "spec", expected: true, observed: false },
  ];

  const pending: WaitingReason = {
    kind: "pending-queues",
    message: "1 pending bundle file awaits human resolution.",
    pendingFiles: ["docs/threads/260819100000Z-t/.pending-decisions/one.md"],
  };
  const gateError: WaitingReason = {
    kind: "gate-error",
    message: "The pending-queue scan failed.",
    errorMessage: "EACCES",
  };
  const contractUnmet: WaitingReason = {
    kind: "stage-contract-unmet",
    message: "The stage left no spec.md.",
    contract: UNMET,
    preservationNote: null,
  };
  const harnessError: WaitingReason = {
    kind: "harness-error",
    message: "The harness attempt failed.",
  };

  // @ts-expect-error a pending-queue reason states the files it found
  const pendingWithoutFiles: WaitingReason = {
    kind: "pending-queues",
    message: "1 pending bundle file awaits human resolution.",
  };

  // @ts-expect-error a gate error states the text of the failure it reports
  const gateErrorWithoutText: WaitingReason = {
    kind: "gate-error",
    message: "The pending-queue scan failed.",
  };

  const pendingWithMismatches: WaitingReason = {
    kind: "pending-queues",
    message: "1 pending bundle file awaits human resolution.",
    pendingFiles: [],
    // @ts-expect-error artifact mismatches belong to the contract kinds alone
    contract: UNMET,
  };

  const blockedWithCandidateLine: WaitingReason = {
    kind: "outcome-blocked",
    message: "The stage reported BLOCKED.",
    agentReason: null,
    // @ts-expect-error the candidate line is the malformed-outcome kind's alone
    candidateLine: "Outcome: BLOCKED",
  };

  const harnessErrorWithEvidence: WaitingReason = {
    kind: "harness-error",
    message: "The harness attempt failed.",
    // @ts-expect-error a harness error carries nothing beyond its message
    errorMessage: "ECONNRESET",
  };

  // @ts-expect-error the blocked kind states the agent's own reason text
  const blockedWithoutAgentReason: WaitingReason = {
    kind: "outcome-blocked",
    message: "The stage reported BLOCKED.",
  };

  it("keeps the legal counterpart of each rejected reason constructible", () => {
    expect(
      [pending, gateError, contractUnmet, harnessError].map(
        (reason) => reason.kind,
      ),
    ).toEqual([
      "pending-queues",
      "gate-error",
      "stage-contract-unmet",
      "harness-error",
    ]);
    expect([
      pendingWithoutFiles,
      gateErrorWithoutText,
      pendingWithMismatches,
      blockedWithCandidateLine,
      harnessErrorWithEvidence,
      blockedWithoutAgentReason,
    ]).toHaveLength(6);
  });
});

describe("the checkpoint states its own pause correlation", () => {
  // Nothing here is about a stage or an attempt, so the run carries neither.
  const FIELDS: RunCheckpointFields = {
    schemaVersion: 0,
    runId: "260819100000Z-0a1b2c3d",
    executor: { pid: 4242, version: "0.1.0" },
    createdAt: "2026-08-19T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
    repoRoot: "/tmp/repo",
    threadRelPath: "docs/threads/260819100000Z-t",
    workspace: {
      strategy: "current-checkout",
      path: "/tmp/repo",
      execution: { cwd: "/tmp/repo", sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    pipelineName: "standard",
    pipelineSourcePath: "/tmp/config/pipelines/standard.json",
    profileSelection: { kind: "settings-only" },
    stages: [],
    observedHarnessVersions: {},
    runtime: { kind: "real" },
    stageIndex: 0,
    attempts: [],
  };

  const PAUSE: WaitingInfo = {
    reasons: [
      { kind: "gate-error", message: "The scan failed.", errorMessage: "EACCES" },
    ],
    recovery: { kind: "retry-stage" },
  };

  const paused: RunCheckpoint = {
    ...FIELDS,
    condition: "waiting-for-user",
    waiting: PAUSE,
  };
  const ready: RunCheckpoint = { ...FIELDS, condition: "ready", waiting: null };
  const executing: RunCheckpoint = {
    ...FIELDS,
    condition: "executing",
    waiting: null,
  };
  const completed: RunCheckpoint = {
    ...FIELDS,
    condition: "completed",
    waiting: null,
  };

  // @ts-expect-error a paused run carries the pause that explains it
  const pausedWithoutPause: RunCheckpoint = {
    ...FIELDS,
    condition: "waiting-for-user",
    waiting: null,
  };

  // @ts-expect-error a completed run has no pause to carry
  const completedWithPause: RunCheckpoint = {
    ...FIELDS,
    condition: "completed",
    waiting: PAUSE,
  };

  it("keeps every legal condition and pause pairing constructible", () => {
    expect(
      [paused, ready, executing, completed].map((cp) => [
        cp.condition,
        cp.waiting === null,
      ]),
    ).toEqual([
      ["waiting-for-user", false],
      ["ready", true],
      ["executing", true],
      ["completed", true],
    ]);
    expect([pausedWithoutPause, completedWithPause]).toHaveLength(2);
  });
});
