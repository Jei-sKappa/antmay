import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  asRunId,
  type RepositoryPath,
  type RunRecord,
  transcriptTerminalOutcome,
  unknownOutcome,
} from "@antmay/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canonicalizeRepositoryPath,
  FilesystemRegistryStore,
  MalformedStateError,
  TerminalConflictError,
  type WorkerOperationalRecord,
} from "../src/state/registry-store";
import { resolveStateRoot } from "../src/state/root";

let sandbox: string;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "antmay-state-"));
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function makeStateRoot(name: string): string {
  return resolveStateRoot({ ANTMAY_STATE_HOME: join(sandbox, name) });
}

function makeRepo(name: string): RepositoryPath {
  const dir = join(sandbox, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "README.md"), `# ${name}\n`, "utf8");
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
    attachment: { available: true, handle: null },
    classification: "active",
    reason: null,
    workerHealth: { state: "healthy", detail: null },
    ...overrides,
  };
}

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function fingerprint(dir: string): string {
  const hash = createHash("sha256");
  for (const file of listFilesRecursive(dir).sort()) {
    hash.update(relative(dir, file));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

describe("filesystem registry store", () => {
  it("keeps state for separate repositories independent", () => {
    const store = new FilesystemRegistryStore(makeStateRoot("state"));
    const repoA = makeRepo("repo-a");
    const repoB = makeRepo("repo-b");
    store.register(record(repoA, { id: asRunId("run-a") }));
    store.register(record(repoB, { id: asRunId("run-b") }));

    expect(store.listForRepository(repoA).map((r) => r.id)).toEqual(["run-a"]);
    expect(store.listForRepository(repoB).map((r) => r.id)).toEqual(["run-b"]);
    expect(
      store
        .listAll()
        .map((r) => r.id)
        .sort(),
    ).toEqual(["run-a", "run-b"]);
  });

  it("looks up runs by public ID within and across repositories", () => {
    const store = new FilesystemRegistryStore(makeStateRoot("state"));
    const repoA = makeRepo("repo-a");
    store.register(record(repoA, { id: asRunId("run-a") }));

    expect(store.findById(repoA, asRunId("run-a"))?.skill).toBe("implement");
    expect(store.findById(repoA, asRunId("missing"))).toBeUndefined();
    expect(store.findByIdGlobal(asRunId("run-a"))?.repositoryPath).toBe(repoA);
    expect(store.findByIdGlobal(asRunId("missing"))).toBeUndefined();
  });

  it("rejects a duplicate public ID on registration", () => {
    const store = new FilesystemRegistryStore(makeStateRoot("state"));
    const repoA = makeRepo("repo-a");
    store.register(record(repoA));
    expect(() => store.register(record(repoA))).toThrow(/already registered/);
  });

  it("replaces the record atomically without leaving temp siblings", () => {
    const stateRoot = makeStateRoot("state");
    const store = new FilesystemRegistryStore(stateRoot);
    const repoA = makeRepo("repo-a");
    store.register(record(repoA));
    store.updateWorkerHealth(repoA, asRunId("run-0001"), {
      state: "degraded",
      detail: "transcript unreadable",
    });

    const leftovers = listFilesRecursive(stateRoot).filter((f) =>
      f.endsWith(".tmp"),
    );
    expect(leftovers).toEqual([]);
    expect(store.findById(repoA, asRunId("run-0001"))?.workerHealth.state).toBe(
      "degraded",
    );
  });

  it("returns the existing record on a repeated identical terminalization", () => {
    const store = new FilesystemRegistryStore(makeStateRoot("state"));
    const repoA = makeRepo("repo-a");
    store.register(record(repoA));
    const outcome = transcriptTerminalOutcome("done", "all tasks complete");

    const first = store.terminalize(repoA, asRunId("run-0001"), outcome);
    const second = store.terminalize(repoA, asRunId("run-0001"), outcome);
    expect(first.classification).toBe("done");
    expect(second.classification).toBe("done");
    expect(second.reason).toBe("all tasks complete");
    expect(store.listForRepository(repoA)).toHaveLength(1);
  });

  it("fails a conflicting terminalization without rewriting the record", () => {
    const stateRoot = makeStateRoot("state");
    const store = new FilesystemRegistryStore(stateRoot);
    const repoA = makeRepo("repo-a");
    store.register(record(repoA));
    store.terminalize(
      repoA,
      asRunId("run-0001"),
      transcriptTerminalOutcome("done", "first"),
    );
    const before = readFileSync(
      join(
        stateRoot,
        "runs",
        createHash("sha256").update(repoA).digest("hex"),
        "record.json",
      ),
      "utf8",
    );

    expect(() =>
      store.terminalize(
        repoA,
        asRunId("run-0001"),
        unknownOutcome({ endpointEnded: true }),
      ),
    ).toThrow(TerminalConflictError);

    const after = store.findById(repoA, asRunId("run-0001"));
    expect(after?.classification).toBe("done");
    expect(after?.reason).toBe("first");
    expect(
      readFileSync(
        join(
          stateRoot,
          "runs",
          createHash("sha256").update(repoA).digest("hex"),
          "record.json",
        ),
        "utf8",
      ),
    ).toBe(before);
  });

  it("reports malformed state as an operational error instead of dropping it", () => {
    const stateRoot = makeStateRoot("state");
    const store = new FilesystemRegistryStore(stateRoot);
    const repoA = makeRepo("repo-a");
    store.register(record(repoA));
    const file = join(
      stateRoot,
      "runs",
      createHash("sha256").update(repoA).digest("hex"),
      "record.json",
    );
    writeFileSync(
      file,
      '{ "schemaVersion": 1, "runs": [ { "id": 42 } ] }',
      "utf8",
    );

    expect(() => store.listForRepository(repoA)).toThrow(MalformedStateError);
    expect(() => store.listAll()).toThrow(MalformedStateError);
  });

  it("stores operational worker data beneath the state root", () => {
    const store = new FilesystemRegistryStore(makeStateRoot("state"));
    const repoA = makeRepo("repo-a");
    store.register(record(repoA));
    const op: WorkerOperationalRecord = {
      runId: "run-0001",
      heartbeatAt: "2026-07-21T10:00:00.000Z",
      health: { state: "healthy", detail: null },
      diagnostic: "observing transcript",
      tailCursor: 128,
      session: { kind: "pinned", id: "session-uuid" },
      adapter: "herdr",
      attachHandle: "lane-7",
    };
    store.writeWorkerRecord(repoA, op);
    expect(store.readWorkerRecord(repoA, asRunId("run-0001"))).toEqual(op);
    expect(store.readWorkerRecord(repoA, asRunId("ghost"))).toBeUndefined();
  });

  it("isolates and relocates state through distinct roots", () => {
    const rootOne = makeStateRoot("state-one");
    const rootTwo = makeStateRoot("state-two");
    const repoA = makeRepo("repo-a");

    new FilesystemRegistryStore(rootOne).register(
      record(repoA, { id: asRunId("run-one") }),
    );
    const storeTwo = new FilesystemRegistryStore(rootTwo);
    expect(storeTwo.listAll()).toEqual([]);

    storeTwo.register(record(repoA, { id: asRunId("run-two") }));
    expect(
      new FilesystemRegistryStore(rootOne).listAll().map((r) => r.id),
    ).toEqual(["run-one"]);
    expect(storeTwo.listAll().map((r) => r.id)).toEqual(["run-two"]);
  });

  it("writes only beneath the state root and never into the repository", () => {
    const stateRoot = makeStateRoot("state");
    const store = new FilesystemRegistryStore(stateRoot);
    const repoDir = join(sandbox, "repo-a");
    const repoA = makeRepo("repo-a");
    const before = fingerprint(repoDir);

    store.register(record(repoA));
    store.updateWorkerHealth(repoA, asRunId("run-0001"), {
      state: "degraded",
      detail: "recovering",
    });
    store.terminalize(
      repoA,
      asRunId("run-0001"),
      transcriptTerminalOutcome("done", "shipped"),
    );
    store.writeWorkerRecord(repoA, {
      runId: "run-0001",
      heartbeatAt: null,
      health: { state: "healthy", detail: null },
      diagnostic: null,
      tailCursor: null,
      session: { kind: "pinned", id: null },
      adapter: "herdr",
      attachHandle: null,
    });

    expect(fingerprint(repoDir)).toBe(before);
    for (const file of listFilesRecursive(stateRoot)) {
      expect(file.startsWith(stateRoot)).toBe(true);
    }
  });
});
