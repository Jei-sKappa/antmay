import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  asAttachmentHandle,
  asRunId,
  type RepositoryPath,
  type RunId,
  type RunRecord,
  type WorkerHealth,
} from "@antmay/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type EnsureObserverDeps,
  ensureObserver,
} from "../src/observer/ensure-observer";
import type { LaunchObserverOptions } from "../src/observer/worker-launcher";
import {
  canonicalizeRepositoryPath,
  FilesystemRegistryStore,
  type WorkerOperationalRecord,
} from "../src/state/registry-store";
import { resolveStateRoot } from "../src/state/root";

let sandbox: string;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "antmay-ensure-"));
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function makeStore(): FilesystemRegistryStore {
  return new FilesystemRegistryStore(
    resolveStateRoot({ ANTMAY_STATE_HOME: join(sandbox, "state") }),
  );
}

function makeRepo(): RepositoryPath {
  const dir = join(sandbox, "repo");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "README.md"), "# repo\n", "utf8");
  return canonicalizeRepositoryPath(dir);
}

function record(
  repositoryPath: RepositoryPath,
  overrides: Partial<RunRecord> = {},
): RunRecord {
  return {
    id: asRunId("run-0001"),
    repositoryPath,
    threadPath:
      `${repositoryPath}/docs/threads/260718155545Z-x` as RunRecord["threadPath"],
    skill: "implement",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "session-uuid" },
    attachment: { available: true, handle: asAttachmentHandle("w1:p1") },
    classification: "active",
    reason: null,
    workerHealth: { state: "healthy", detail: null },
    ...overrides,
  };
}

function sidecar(
  heartbeatAt: string | null,
  health: WorkerHealth,
): WorkerOperationalRecord {
  return {
    runId: "run-0001",
    heartbeatAt,
    health,
    diagnostic: null,
    tailCursor: null,
    session: { kind: "pinned", id: "session-uuid" },
    adapter: "herdr",
    attachHandle: "w1:p1",
  };
}

const NOW = Date.parse("2026-07-21T12:00:00.000Z");
const RUN = asRunId("run-0001") as RunId;

function depsWith(
  store: FilesystemRegistryStore,
  launches: Array<{ runId: RunId; options?: LaunchObserverOptions }>,
  extra: Partial<EnsureObserverDeps> = {},
): EnsureObserverDeps {
  return {
    store,
    now: () => NOW,
    launch: (runId, options) => {
      launches.push({ runId, options });
      return { pid: 4242 };
    },
    ...extra,
  };
}

describe("ensureObserver", () => {
  it("does nothing for a fresh, healthy observer", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(record(repo));
    store.writeWorkerRecord(
      repo,
      sidecar(new Date(NOW - 5_000).toISOString(), {
        state: "healthy",
        detail: null,
      }),
    );
    const launches: Array<{ runId: RunId }> = [];

    const result = ensureObserver(RUN, depsWith(store, launches));

    expect(result.action).toBe("healthy");
    expect(launches).toEqual([]);
  });

  it("restores observation when no heartbeat is recorded", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(record(repo));
    const launches: Array<{ runId: RunId }> = [];

    const result = ensureObserver(RUN, depsWith(store, launches));

    expect(result.action).toBe("restored");
    expect(result.pid).toBe(4242);
    expect(launches).toEqual([{ runId: RUN, options: undefined }]);
  });

  it("restores observation for a stale heartbeat", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(record(repo));
    store.writeWorkerRecord(
      repo,
      sidecar(new Date(NOW - 120_000).toISOString(), {
        state: "healthy",
        detail: null,
      }),
    );
    const launches: Array<{ runId: RunId }> = [];

    const result = ensureObserver(RUN, depsWith(store, launches));

    expect(result.action).toBe("restored");
    expect(launches.length).toBe(1);
  });

  it("restores observation for a degraded observer even with a fresh heartbeat", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(record(repo));
    store.writeWorkerRecord(
      repo,
      sidecar(new Date(NOW - 1_000).toISOString(), {
        state: "degraded",
        detail: "transcript unreadable",
      }),
    );
    const launches: Array<{ runId: RunId }> = [];

    const result = ensureObserver(RUN, depsWith(store, launches));

    expect(result.action).toBe("restored");
    expect(launches.length).toBe(1);
  });

  it("restores observation without creating another run or regressing state", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(record(repo));
    const launches: Array<{ runId: RunId }> = [];

    ensureObserver(RUN, depsWith(store, launches));

    const runs = store.listForRepository(repo);
    expect(runs.length).toBe(1);
    expect(runs[0]?.classification).toBe("active");
    expect(runs[0]?.reason).toBeNull();
  });

  it("does not observe a terminal run", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(record(repo, { classification: "done", reason: "shipped" }));
    const launches: Array<{ runId: RunId }> = [];

    const result = ensureObserver(RUN, depsWith(store, launches));

    expect(result.action).toBe("not-applicable");
    expect(launches).toEqual([]);
  });

  it("is not applicable for an unknown run ID", () => {
    const store = makeStore();
    makeRepo();
    const launches: Array<{ runId: RunId }> = [];

    const result = ensureObserver(
      asRunId("missing") as RunId,
      depsWith(store, launches),
    );

    expect(result.action).toBe("not-applicable");
    expect(launches).toEqual([]);
  });
});
