import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type AttachmentHandle,
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  type RepositoryPath,
  type RunClassification,
  type RunId,
  type RunRecord,
} from "@antmay/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  ExecutionAdapter,
  LivenessResult,
  ReadResult,
  SpawnedSession,
} from "../src/adapters/types";
import type { AttachCandidate } from "../src/attach/select-run";
import {
  type AttachDeps,
  AttachError,
  type AttachOptions,
  createProductionAttachDeps,
  runAttach,
} from "../src/commands/attach";
import type { ProcessRunner } from "../src/process/process-runner";
import { FilesystemRegistryStore } from "../src/state/registry-store";

const REPO = asRepositoryPath("/canonical/repo");
const THREAD = asThreadPath("/canonical/repo/docs/threads/260718155545Z-x");

function run(
  id: string,
  overrides: {
    handle?: string | null;
    classification?: RunClassification;
    repositoryPath?: RepositoryPath;
  } = {},
): RunRecord {
  const handle = overrides.handle === undefined ? "w1:p1" : overrides.handle;
  return {
    id: asRunId(id),
    repositoryPath: overrides.repositoryPath ?? REPO,
    threadPath: THREAD,
    skill: "propose",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "s" },
    attachment: {
      available: handle !== null,
      handle: handle === null ? null : asAttachmentHandle(handle),
    },
    classification: overrides.classification ?? "active",
    reason: overrides.classification === "done" ? "shipped" : null,
    workerHealth: { state: "healthy", detail: null },
  };
}

// A registry that answers global and repository lookups from fixed record lists
// and records every method it is asked for, so a test can assert attach never
// invokes a mutation.
class FakeStore {
  constructor(
    private readonly global: readonly RunRecord[],
    private readonly scoped: readonly RunRecord[] = global,
  ) {}
  findByIdGlobal(id: RunId): RunRecord | undefined {
    return this.global.find((record) => record.id === id);
  }
  listForRepository(_repositoryPath: RepositoryPath): readonly RunRecord[] {
    return this.scoped;
  }
}

class FakeAdapter implements ExecutionAdapter {
  readonly name = "herdr" as const;
  attachCalls: AttachmentHandle[] = [];
  livenessCalls: AttachmentHandle[] = [];
  constructor(
    private readonly aliveHandles: readonly string[],
    private readonly failAttach = false,
  ) {}
  spawn(): SpawnedSession {
    return { handle: asAttachmentHandle("x") };
  }
  send(): void {}
  read(): ReadResult {
    return { output: "" };
  }
  liveness(handle: AttachmentHandle): LivenessResult {
    this.livenessCalls.push(handle);
    return { alive: this.aliveHandles.includes(handle) };
  }
  enumerate(): readonly AttachmentHandle[] {
    return [];
  }
  attach(handle: AttachmentHandle): void {
    this.attachCalls.push(handle);
    if (this.failAttach) {
      throw new Error(`pane ${handle} is gone`);
    }
  }
}

const okRunner: ProcessRunner = {
  run: () => ({ code: 0, stdout: "", stderr: "" }),
  locate: (program) => `/bin/${program}`,
};

function makeDeps(overrides: Partial<AttachDeps> = {}): {
  deps: AttachDeps;
  adapter: FakeAdapter;
  output: string[];
} {
  const adapter =
    (overrides.adapter as FakeAdapter) ?? new FakeAdapter(["w1:p1"]);
  const output: string[] = [];
  const deps: AttachDeps = {
    cwd: "/canonical/repo/nested",
    runner: okRunner,
    store: new FakeStore([]),
    adapter,
    attachAdapter: adapter,
    isInteractive: () => false,
    pickRun: async () => {
      throw new Error("pickRun should not be called");
    },
    resolveRepository: () => REPO,
    writeOut: (message) => {
      output.push(message);
    },
    ...overrides,
  };
  return { deps, adapter, output };
}

const NO_RUN: AttachOptions = {};

describe("runAttach — explicit run id", () => {
  it("attaches an active run resolved globally without prompting", async () => {
    const active = run("run-active");
    const { deps, adapter } = makeDeps({
      store: new FakeStore([active]),
      isInteractive: () => {
        throw new Error("must not check interactivity for an explicit id");
      },
    });
    const result = await runAttach({ runId: "run-active" }, deps);
    expect(result).toEqual({
      runId: asRunId("run-active"),
      handle: asAttachmentHandle("w1:p1"),
    });
    expect(adapter.attachCalls).toEqual([asAttachmentHandle("w1:p1")]);
    // An explicit id never consults liveness: it attaches directly.
    expect(adapter.livenessCalls).toEqual([]);
  });

  it("attaches a terminal run whose retained pane is available", async () => {
    const terminal = run("run-done", { classification: "done" });
    const { deps, adapter } = makeDeps({ store: new FakeStore([terminal]) });
    await runAttach({ runId: "run-done" }, deps);
    expect(adapter.attachCalls).toEqual([asAttachmentHandle("w1:p1")]);
  });

  it("fails non-zero when the explicit id is not registered", async () => {
    const { deps, adapter } = makeDeps({
      store: new FakeStore([run("other")]),
    });
    await expect(runAttach({ runId: "missing" }, deps)).rejects.toBeInstanceOf(
      AttachError,
    );
    expect(adapter.attachCalls).toEqual([]);
  });

  it("fails non-zero when the recorded pane handle is null", async () => {
    const { deps, adapter } = makeDeps({
      store: new FakeStore([run("run-x", { handle: null })]),
    });
    await expect(runAttach({ runId: "run-x" }, deps)).rejects.toThrow(
      /unavailable/,
    );
    expect(adapter.attachCalls).toEqual([]);
  });

  it("fails non-zero when the adapter cannot join the pane", async () => {
    const adapter = new FakeAdapter(["w1:p1"], true);
    const { deps } = makeDeps({
      store: new FakeStore([run("run-x")]),
      adapter,
    });
    await expect(runAttach({ runId: "run-x" }, deps)).rejects.toThrow(
      /Could not attach/,
    );
    expect(adapter.attachCalls).toEqual([asAttachmentHandle("w1:p1")]);
  });
});

describe("runAttach — contextual selection", () => {
  it("attaches the sole cwd-scoped attachable run directly", async () => {
    const attachable = run("run-alive", { handle: "w1:p1" });
    const dead = run("run-dead", { handle: "w1:p2" });
    const adapter = new FakeAdapter(["w1:p1"]);
    const { deps } = makeDeps({
      store: new FakeStore([], [attachable, dead]),
      adapter,
    });
    const result = await runAttach(NO_RUN, deps);
    expect(result.runId).toBe(asRunId("run-alive"));
    expect(adapter.attachCalls).toEqual([asAttachmentHandle("w1:p1")]);
  });

  it("prompts among several attachable runs on a TTY and attaches the choice", async () => {
    const a = run("run-a", { handle: "w1:p1" });
    const b = run("run-b", { handle: "w1:p2" });
    const adapter = new FakeAdapter(["w1:p1", "w1:p2"]);
    let offered: readonly AttachCandidate[] = [];
    const { deps } = makeDeps({
      store: new FakeStore([], [a, b]),
      adapter,
      isInteractive: () => true,
      pickRun: async (candidates) => {
        offered = candidates;
        return asRunId("run-b");
      },
    });
    const result = await runAttach(NO_RUN, deps);
    expect(offered.map((c) => c.record.id)).toEqual([
      asRunId("run-a"),
      asRunId("run-b"),
    ]);
    expect(result.runId).toBe(asRunId("run-b"));
    expect(adapter.attachCalls).toEqual([asAttachmentHandle("w1:p2")]);
  });

  it("fails a non-interactive ambiguity with an exact re-invocation hint", async () => {
    const a = run("run-a", { handle: "w1:p1" });
    const b = run("run-b", { handle: "w1:p2" });
    const adapter = new FakeAdapter(["w1:p1", "w1:p2"]);
    const { deps } = makeDeps({
      store: new FakeStore([], [a, b]),
      adapter,
      isInteractive: () => false,
    });
    await expect(runAttach(NO_RUN, deps)).rejects.toThrow(
      /antmay attach <run-id>/,
    );
    await expect(runAttach(NO_RUN, deps)).rejects.toThrow(/run-a, run-b/);
    expect(adapter.attachCalls).toEqual([]);
  });

  it("fails with an exact hint when no run is attachable", async () => {
    const dead = run("run-dead", { handle: "w1:p9" });
    const adapter = new FakeAdapter([]);
    const { deps } = makeDeps({ store: new FakeStore([], [dead]), adapter });
    await expect(runAttach(NO_RUN, deps)).rejects.toThrow(
      /antmay attach <run-id>/,
    );
    expect(adapter.attachCalls).toEqual([]);
  });
});

describe("runAttach — adapter delegation", () => {
  it("joins through the injected attach adapter and recorded handle", async () => {
    const liveness = new FakeAdapter(["w1:p1"]);
    const attachAdapter = new FakeAdapter(["w1:p1"]);
    const { deps } = makeDeps({
      store: new FakeStore([run("run-x", { handle: "w1:p1" })]),
      adapter: liveness,
      attachAdapter,
    });
    await runAttach({ runId: "run-x" }, deps);
    // Attachment goes through the interactive adapter, not the liveness one.
    expect(attachAdapter.attachCalls).toEqual([asAttachmentHandle("w1:p1")]);
    expect(liveness.attachCalls).toEqual([]);
  });
});

describe("attach registry non-mutation", () => {
  let stateRoot: string;

  beforeEach(() => {
    stateRoot = mkdtempSync(join(tmpdir(), "antmay-attach-"));
  });

  afterEach(() => {
    rmSync(stateRoot, { recursive: true, force: true });
  });

  it("leaves every on-disk record byte identical after a failed attach", async () => {
    const store = new FilesystemRegistryStore(stateRoot);
    const record = run("run-persisted", { classification: "done" });
    store.register(record);

    // Snapshot the exact bytes of every state file the store wrote.
    const runsRoot = join(stateRoot, "runs");
    const snapshot = new Map<string, Buffer>();
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          snapshot.set(full, readFileSync(full));
        }
      }
    };
    walk(runsRoot);

    const adapter = new FakeAdapter(["w1:p1"], true);
    const { deps } = makeDeps({ store, adapter });
    await expect(runAttach({ runId: "run-persisted" }, deps)).rejects.toThrow(
      /Could not attach/,
    );

    // Every previously written file is byte-for-byte unchanged, and no new
    // state file appeared.
    const after = new Map<string, Buffer>();
    const walkAfter = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walkAfter(full);
        } else {
          after.set(full, readFileSync(full));
        }
      }
    };
    walkAfter(runsRoot);

    expect([...after.keys()].sort()).toEqual([...snapshot.keys()].sort());
    for (const [file, bytes] of snapshot) {
      expect(after.get(file)?.equals(bytes)).toBe(true);
    }

    // The reloaded record still carries its full classification and handle.
    const reloaded = store.findByIdGlobal(asRunId("run-persisted"));
    expect(reloaded?.classification).toBe("done");
    expect(reloaded?.reason).toBe("shipped");
    expect(reloaded?.attachment.handle).toBe(asAttachmentHandle("w1:p1"));
  });
});

describe("createProductionAttachDeps", () => {
  it("wires a distinct liveness adapter and interactive attach adapter", () => {
    const deps = createProductionAttachDeps("/tmp/x", {
      ANTMAY_STATE_HOME: "/tmp/state",
    });
    expect(deps.adapter).not.toBe(deps.attachAdapter);
    expect(typeof deps.isInteractive).toBe("function");
    expect(typeof deps.pickRun).toBe("function");
  });
});
