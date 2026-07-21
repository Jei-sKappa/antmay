import {
  asRepositoryPath,
  asRunId,
  asThreadPath,
  emptyRegistry,
  findRunById,
  listRuns,
  listRunsForRepository,
  type RunRecord,
  registerRun,
  registryFromRecords,
  terminalizeRun,
  transcriptTerminalOutcome,
  unknownOutcome,
  updateWorkerHealth,
} from "@antmay/core";
import { describe, expect, it } from "vitest";

function record(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: asRunId("run-0001"),
    repositoryPath: asRepositoryPath("/repo-a"),
    threadPath: asThreadPath("/repo-a/docs/threads/260718155545Z-x"),
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

describe("registration and unique identity", () => {
  it("adds a run and rejects a duplicate public ID", () => {
    const one = registerRun(emptyRegistry(), record());
    expect(listRuns(one)).toHaveLength(1);
    expect(() => registerRun(one, record({ skill: "propose" }))).toThrow(
      /already registered/,
    );
  });

  it("rejects duplicate IDs when built from records", () => {
    expect(() => registryFromRecords([record(), record()])).toThrow(
      /Duplicate run ID/,
    );
  });

  it("does not mutate the input snapshot", () => {
    const base = emptyRegistry();
    registerRun(base, record());
    expect(listRuns(base)).toHaveLength(0);
  });
});

describe("listing and lookup", () => {
  const registry = registryFromRecords([
    record({
      id: asRunId("run-a1"),
      repositoryPath: asRepositoryPath("/repo-a"),
    }),
    record({
      id: asRunId("run-a2"),
      repositoryPath: asRepositoryPath("/repo-a"),
    }),
    record({
      id: asRunId("run-b1"),
      repositoryPath: asRepositoryPath("/repo-b"),
    }),
  ]);

  it("lists globally and by canonical repository", () => {
    expect(listRuns(registry)).toHaveLength(3);
    expect(
      listRunsForRepository(registry, asRepositoryPath("/repo-a")).map(
        (r) => r.id,
      ),
    ).toEqual(["run-a1", "run-a2"]);
    expect(
      listRunsForRepository(registry, asRepositoryPath("/repo-b")).map(
        (r) => r.id,
      ),
    ).toEqual(["run-b1"]);
  });

  it("finds a run by public ID", () => {
    expect(findRunById(registry, asRunId("run-b1"))?.repositoryPath).toBe(
      "/repo-b",
    );
    expect(findRunById(registry, asRunId("missing"))).toBeUndefined();
  });
});

describe("worker health updates", () => {
  it("replaces health and reports change, idempotent on identical health", () => {
    const registry = registerRun(emptyRegistry(), record());
    const first = updateWorkerHealth(registry, asRunId("run-0001"), {
      state: "degraded",
      detail: "transcript unreadable",
    });
    expect(first.changed).toBe(true);
    expect(first.record.workerHealth.state).toBe("degraded");

    const second = updateWorkerHealth(first.registry, asRunId("run-0001"), {
      state: "degraded",
      detail: "transcript unreadable",
    });
    expect(second.changed).toBe(false);
  });

  it("throws for an unregistered run", () => {
    expect(() =>
      updateWorkerHealth(emptyRegistry(), asRunId("ghost"), {
        state: "stale",
        detail: null,
      }),
    ).toThrow(/No run registered/);
  });
});

describe("terminal transitions", () => {
  it("terminalizes an active run and is idempotent on repeat", () => {
    const registry = registerRun(emptyRegistry(), record());
    const outcome = transcriptTerminalOutcome("done", "all tasks complete");
    const first = terminalizeRun(registry, asRunId("run-0001"), outcome);
    expect(first.changed).toBe(true);
    expect(first.record.classification).toBe("done");

    const second = terminalizeRun(first.registry, asRunId("run-0001"), outcome);
    expect(second.changed).toBe(false);
    expect(second.record.classification).toBe("done");
  });

  it("never regresses a terminal record on a conflicting transition", () => {
    const registry = registerRun(emptyRegistry(), record());
    const done = terminalizeRun(
      registry,
      asRunId("run-0001"),
      transcriptTerminalOutcome("done", "first"),
    );
    const conflict = terminalizeRun(
      done.registry,
      asRunId("run-0001"),
      unknownOutcome({ endpointEnded: true }),
    );
    expect(conflict.changed).toBe(false);
    expect(conflict.record.classification).toBe("done");
    expect(conflict.record.reason).toBe("first");
  });

  it("throws for an unregistered run", () => {
    expect(() =>
      terminalizeRun(
        emptyRegistry(),
        asRunId("ghost"),
        transcriptTerminalOutcome("done", "x"),
      ),
    ).toThrow(/No run registered/);
  });
});
