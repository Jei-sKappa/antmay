import {
  applyTerminalOutcome,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  isTerminalClassification,
  type RunClassification,
  type RunRecord,
  transcriptTerminalOutcome,
  unknownOutcome,
} from "@antmay/core";
import { describe, expect, it } from "vitest";

function activeRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: asRunId("run-0001"),
    repositoryPath: asRepositoryPath("/repo"),
    threadPath: asThreadPath("/repo/docs/threads/260718155545Z-x"),
    skill: "implement",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "session-uuid" },
    attachment: { available: true, handle: null },
    classification: "active",
    reason: null,
    workerHealth: { state: "healthy", detail: null },
    ...overrides,
  };
}

describe("run identity constructors", () => {
  it("accepts printable values and rejects empty or control-character IDs", () => {
    expect(asRunId("run-42")).toBe("run-42");
    expect(() => asRunId("")).toThrow(/non-empty/);
    expect(() => asRunId("run\n42")).toThrow(/printable/);
  });
});

describe("classification predicate", () => {
  it("treats every non-active classification as terminal", () => {
    const cases: Array<[RunClassification, boolean]> = [
      ["active", false],
      ["done", true],
      ["blocked", true],
      ["refused", true],
      ["unknown", true],
    ];
    for (const [classification, expected] of cases) {
      expect(isTerminalClassification(classification)).toBe(expected);
    }
  });
});

describe("transcript-derived terminal outcomes", () => {
  it("stores the complete reason for done, blocked, and refused", () => {
    expect(transcriptTerminalOutcome("done", "shipped the change")).toEqual({
      classification: "done",
      reason: "shipped the change",
    });
    expect(transcriptTerminalOutcome("blocked", "missing input")).toEqual({
      classification: "blocked",
      reason: "missing input",
    });
    expect(transcriptTerminalOutcome("refused", "out of scope")).toEqual({
      classification: "refused",
      reason: "out of scope",
    });
  });

  it("rejects a blank reason", () => {
    expect(() => transcriptTerminalOutcome("done", "")).toThrow(
      /complete reason/,
    );
    expect(() => transcriptTerminalOutcome("blocked", "   ")).toThrow(
      /complete reason/,
    );
  });
});

describe("unknown outcome requires positive endpoint-end evidence", () => {
  it("resolves to unknown with no reason when the endpoint has ended", () => {
    expect(unknownOutcome({ endpointEnded: true })).toEqual({
      classification: "unknown",
      reason: null,
    });
  });

  it("rejects absent or non-positive evidence", () => {
    // @ts-expect-error evidence must positively confirm the endpoint ended.
    expect(() => unknownOutcome({ endpointEnded: false })).toThrow(
      /positive endpoint-end evidence/,
    );
    // @ts-expect-error evidence is mandatory.
    expect(() => unknownOutcome(undefined)).toThrow(
      /positive endpoint-end evidence/,
    );
  });
});

describe("terminal transitions are immutable and idempotent", () => {
  it("transitions an active record into the terminal outcome", () => {
    const record = activeRecord();
    const result = applyTerminalOutcome(
      record,
      transcriptTerminalOutcome("done", "all tasks complete"),
    );
    expect(result.changed).toBe(true);
    expect(result.record.classification).toBe("done");
    expect(result.record.reason).toBe("all tasks complete");
    // The input record is not mutated.
    expect(record.classification).toBe("active");
    expect(record.reason).toBeNull();
  });

  it("never regresses or rewrites an existing terminal record", () => {
    const done = activeRecord({ classification: "done", reason: "first" });

    const toActiveAttempt = applyTerminalOutcome(
      done,
      transcriptTerminalOutcome("blocked", "second"),
    );
    expect(toActiveAttempt.changed).toBe(false);
    expect(toActiveAttempt.record).toBe(done);
    expect(toActiveAttempt.record.classification).toBe("done");
    expect(toActiveAttempt.record.reason).toBe("first");

    const toUnknownAttempt = applyTerminalOutcome(
      done,
      unknownOutcome({ endpointEnded: true }),
    );
    expect(toUnknownAttempt.changed).toBe(false);
    expect(toUnknownAttempt.record.classification).toBe("done");
  });

  it("applies the same outcome idempotently", () => {
    const record = activeRecord();
    const outcome = transcriptTerminalOutcome("refused", "preflight refused");
    const first = applyTerminalOutcome(record, outcome);
    const second = applyTerminalOutcome(first.record, outcome);
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.record).toEqual(first.record);
  });
});
