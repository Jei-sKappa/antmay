import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type AttachmentHandle,
  asAttachmentHandle,
  asRunId,
  type RepositoryPath,
  type RunId,
  type RunRecord,
  transcriptTerminalOutcome,
} from "@antmay/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExecutionAdapter, LivenessResult } from "../src/adapters/types";
import type { ReconcileRunDeps } from "../src/observer/reconcile-run";
import { launchObserver } from "../src/observer/worker-launcher";
import {
  canonicalizeRepositoryPath,
  FilesystemRegistryStore,
  type WorkerOperationalRecord,
} from "../src/state/registry-store";
import { resolveStateRoot } from "../src/state/root";
import {
  finalEvidence,
  pendingEvidence,
  type TranscriptEvidence,
} from "../src/transcripts/types";
import {
  type ObserveDeps,
  observeRun,
  resolveWorkerRunId,
  WORKER_RUN_ID_ENV,
} from "../src/worker";

let sandbox: string;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "antmay-worker-"));
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

function activeRecord(repositoryPath: RepositoryPath, id: string): RunRecord {
  return {
    id: asRunId(id),
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
  };
}

class StaticAdapter implements ExecutionAdapter {
  readonly name = "herdr" as const;
  constructor(private readonly alive: boolean = true) {}
  spawn(): never {
    throw new Error("unused");
  }
  send(): void {}
  read(): { output: string } {
    return { output: "" };
  }
  liveness(): LivenessResult {
    return { alive: this.alive };
  }
  enumerate(): readonly AttachmentHandle[] {
    return [];
  }
  attach(): void {}
}

function observeDeps(
  store: FilesystemRegistryStore,
  adapter: ExecutionAdapter,
  readEvidence: ReconcileRunDeps["readEvidence"],
  extra: Partial<ObserveDeps> = {},
): ObserveDeps {
  let clock = 1_000;
  return {
    store,
    adapter,
    readEvidence,
    sleep: () => Promise.resolve(),
    now: () => {
      clock += 1_000;
      return clock;
    },
    ...extra,
  };
}

describe("resolveWorkerRunId", () => {
  it("reads the run ID from the package-internal environment entry", () => {
    const runId = resolveWorkerRunId({
      argv: ["node", "worker.js"],
      env: { [WORKER_RUN_ID_ENV]: "run-42" },
    });
    expect(runId).toBe("run-42");
  });

  it("falls back to the first positional argument", () => {
    const runId = resolveWorkerRunId({
      argv: ["node", "worker.js", "run-7"],
      env: {},
    });
    expect(runId).toBe("run-7");
  });

  it("rejects a missing run ID", () => {
    expect(() =>
      resolveWorkerRunId({ argv: ["node", "worker.js"], env: {} }),
    ).toThrow(/requires a run ID/);
  });
});

describe("observeRun", () => {
  it("writes a heartbeat and exits after a terminal transcript outcome", async () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo, "run-0001"));
    const outcome = transcriptTerminalOutcome("done", "shipped");

    const result = await observeRun(
      asRunId("run-0001"),
      observeDeps(store, new StaticAdapter(), () => finalEvidence(outcome)),
    );

    expect(result.record.classification).toBe("done");
    const sidecar = store.readWorkerRecord(repo, asRunId("run-0001"));
    expect(sidecar?.heartbeatAt).not.toBeNull();
    expect(sidecar?.health.state).toBe("healthy");
  });

  it("exits after a positive ended-without-outcome unknown classification", async () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo, "run-0001"));

    const result = await observeRun(
      asRunId("run-0001"),
      observeDeps(store, new StaticAdapter(false), () =>
        pendingEvidence("no outcome"),
      ),
    );

    expect(result.record.classification).toBe("unknown");
  });

  it("writes a fresh heartbeat on every poll while the run stays active", async () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo, "run-0001"));
    const heartbeats: WorkerOperationalRecord[] = [];
    const original = store.writeWorkerRecord.bind(store);
    store.writeWorkerRecord = (r, op) => {
      heartbeats.push(op);
      original(r, op);
    };

    let calls = 0;
    const readEvidence = (): TranscriptEvidence => {
      calls += 1;
      return calls >= 3
        ? finalEvidence(transcriptTerminalOutcome("done", "shipped"))
        : pendingEvidence("still working");
    };

    const result = await observeRun(
      asRunId("run-0001"),
      observeDeps(store, new StaticAdapter(), readEvidence),
    );

    expect(result.record.classification).toBe("done");
    expect(heartbeats.length).toBe(3);
    const stamps = heartbeats.map((h) => h.heartbeatAt);
    expect(new Set(stamps).size).toBe(3);
  });

  it("observes only its own run, leaving other runs untouched", async () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo, "run-0001"));
    store.register(activeRecord(repo, "run-0002"));
    const outcome = transcriptTerminalOutcome("done", "shipped");

    await observeRun(
      asRunId("run-0001"),
      observeDeps(store, new StaticAdapter(), () => finalEvidence(outcome)),
    );

    const other = store.findById(repo, asRunId("run-0002"));
    expect(other?.classification).toBe("active");
    expect(store.readWorkerRecord(repo, asRunId("run-0002"))).toBeUndefined();
  });

  it("stops at maxPolls without terminalizing a persistently active run", async () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo, "run-0001"));

    const result = await observeRun(
      asRunId("run-0001"),
      observeDeps(
        store,
        new StaticAdapter(),
        () => pendingEvidence("working"),
        {
          maxPolls: 3,
        },
      ),
    );

    expect(result.record.classification).toBe("active");
  });
});

describe("launchObserver", () => {
  it("spawns a detached process with the current node executable that survives the parent", async () => {
    const marker = join(sandbox, "marker.txt");
    const script = join(sandbox, "fake-worker.cjs");
    writeFileSync(
      script,
      [
        'const fs = require("node:fs");',
        "const runId = process.env.ANTMAY_WORKER_RUN_ID ?? 'MISSING';",
        "fs.writeFileSync(process.env.ANTMAY_TEST_MARKER, runId + '|' + process.execPath);",
      ].join("\n"),
      "utf8",
    );

    const result = launchObserver(asRunId("run-detached") as RunId, {
      workerModulePath: script,
      env: { ...process.env, ANTMAY_TEST_MARKER: marker },
    });

    expect(result.pid).not.toBeNull();

    await waitFor(() => existsSync(marker), 5_000);
    const [runId, execPath] = readFileSync(marker, "utf8").split("|");
    expect(runId).toBe("run-detached");
    expect(execPath).toBe(process.execPath);
  });
});

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (predicate()) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error("timed out waiting for the detached worker");
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
