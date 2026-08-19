import { describe, expect, it } from "vitest";

import type {
  AttemptIdentity,
  AttemptRecord,
  AttemptSettlement,
  DoneTerminalResult,
  QueueObservation,
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
