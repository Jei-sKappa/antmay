import {
  type AttachmentHandle,
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  type CatalogEntry,
  findCatalogEntry,
  type RepositoryPath,
  type RunId,
  type RunRecord,
} from "@antmay/core";
import { describe, expect, it } from "vitest";
import type {
  ExecutionAdapter,
  ReadResult,
  SpawnedSession,
  SpawnSpec,
} from "../src/adapters/types";
import {
  runSpawn,
  type SpawnDeps,
  SpawnInputError,
  type SpawnOptions,
} from "../src/commands/spawn";
import type { NormalizedSpawnRequest } from "../src/preflight/spawn";
import { SpawnPreflightError } from "../src/preflight/spawn";
import type { ProcessRunner } from "../src/process/process-runner";
import type {
  PromptContext,
  PromptField,
  PromptProvider,
} from "../src/prompts";

const REPO = asRepositoryPath("/canonical/repo");
const THREAD = asThreadPath("/canonical/repo/docs/threads/260718155545Z-x");

function normalized(
  overrides: Partial<NormalizedSpawnRequest> = {},
): NormalizedSpawnRequest {
  return {
    repositoryPath: REPO,
    threadPath: THREAD,
    skill: findCatalogEntry("propose") as CatalogEntry,
    harness: "claude",
    adapter: "herdr",
    request: null,
    harnessExecutable: "/bin/claude",
    skillDir: "/roots/propose",
    activeRunGuard: { hasActiveRun: false, activeRuns: [] },
    ...overrides,
  };
}

function activeRecord(id: string): RunRecord {
  return {
    id: asRunId(id),
    repositoryPath: REPO,
    threadPath: THREAD,
    skill: "propose",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "s" },
    attachment: { available: true, handle: asAttachmentHandle("w1:p0") },
    classification: "active",
    reason: null,
    workerHealth: { state: "healthy", detail: null },
  };
}

class RecordingAdapter implements ExecutionAdapter {
  readonly name = "herdr" as const;
  spawnedWith: SpawnSpec | null = null;
  attachCalls: AttachmentHandle[] = [];
  spawn(spec: SpawnSpec): SpawnedSession {
    this.spawnedWith = spec;
    return { handle: asAttachmentHandle("w1:p1") };
  }
  send(): void {}
  read(): ReadResult {
    return { output: "" };
  }
  liveness(): { alive: boolean } {
    return { alive: true };
  }
  enumerate(): readonly AttachmentHandle[] {
    return [];
  }
  attach(handle: AttachmentHandle): void {
    this.attachCalls.push(handle);
  }
}

class FakeStore {
  registered: RunRecord[] = [];
  register(record: RunRecord): RunRecord {
    this.registered.push(record);
    return record;
  }
  listForRepository(_repositoryPath: RepositoryPath): readonly RunRecord[] {
    return [];
  }
}

class FakePrompt implements PromptProvider {
  gathered: PromptField[] = [];
  confirmCalls: number = 0;
  constructor(
    private readonly interactive: boolean,
    private readonly answers: Partial<Record<PromptField, string>> = {},
    private readonly confirm: boolean = true,
  ) {}
  isInteractive(): boolean {
    return this.interactive;
  }
  async gather(field: PromptField, _context: PromptContext): Promise<string> {
    this.gathered.push(field);
    return this.answers[field] ?? "";
  }
  async confirmAdditionalRun(_ids: readonly string[]): Promise<boolean> {
    this.confirmCalls += 1;
    return this.confirm;
  }
}

const okRunner: ProcessRunner = {
  run: () => ({ code: 0, stdout: "", stderr: "" }),
  locate: (program) => `/bin/${program}`,
};

type DepsOverrides = Partial<SpawnDeps> & {
  readonly preflightResult?: NormalizedSpawnRequest;
  readonly preflightError?: Error;
};

function makeDeps(overrides: DepsOverrides = {}): {
  deps: SpawnDeps;
  adapter: RecordingAdapter;
  store: FakeStore;
  observerCalls: RunId[];
  output: string[];
} {
  const adapter =
    (overrides.adapter as RecordingAdapter) ?? new RecordingAdapter();
  const store = (overrides.store as FakeStore) ?? new FakeStore();
  const observerCalls: RunId[] = [];
  const output: string[] = [];
  const {
    preflightResult,
    preflightError,
    adapter: _a,
    store: _s,
    ...rest
  } = overrides;
  const deps: SpawnDeps = {
    cwd: "/canonical/repo",
    env: {},
    runner: okRunner,
    prompt: new FakePrompt(false),
    store,
    adapter,
    attachAdapter: adapter,
    write: (message) => {
      output.push(message);
    },
    preflight: () => {
      if (preflightError !== undefined) {
        throw preflightError;
      }
      return preflightResult ?? normalized();
    },
    resolveHerdr: () => "/bin/herdr",
    launchObserver: (runId) => {
      observerCalls.push(runId);
      return { pid: 1 };
    },
    generateRunId: () => asRunId("run-fixed"),
    generateSessionId: () => "fixed-uuid",
    now: () => 1_700_000_000_000,
    ...rest,
  };
  return { deps, adapter, store, observerCalls, output };
}

const fullFlags: SpawnOptions = {
  thread: "260718155545Z-x",
  skill: "propose",
  harness: "claude",
  adapter: "herdr",
};

describe("runSpawn — input gathering", () => {
  it("never prompts when every value is supplied by flags", async () => {
    const prompt = new FakePrompt(true);
    const { deps } = makeDeps({ prompt });
    await runSpawn(fullFlags, deps);
    expect(prompt.gathered).toEqual([]);
    expect(prompt.confirmCalls).toBe(0);
  });

  it("gathers each missing thread/skill/harness/adapter value on a TTY", async () => {
    const prompt = new FakePrompt(true, {
      thread: "260718155545Z-x",
      skill: "propose",
      harness: "claude",
      adapter: "herdr",
    });
    const { deps } = makeDeps({ prompt });
    await runSpawn({}, deps);
    expect(prompt.gathered).toEqual(["thread", "skill", "harness", "adapter"]);
  });

  it("fails a non-interactive missing value naming the flag, with no side effect", async () => {
    const { deps, adapter, store, observerCalls } = makeDeps({
      prompt: new FakePrompt(false),
    });
    await expect(
      runSpawn({ ...fullFlags, thread: undefined }, deps),
    ).rejects.toThrow(/pass --thread <thread>/);
    expect(adapter.spawnedWith).toBeNull();
    expect(store.registered).toEqual([]);
    expect(observerCalls).toEqual([]);
  });

  it("rejects an unsupported harness value", async () => {
    const { deps } = makeDeps();
    await expect(
      runSpawn({ ...fullFlags, harness: "gpt" }, deps),
    ).rejects.toBeInstanceOf(SpawnInputError);
  });
});

describe("runSpawn — request postures", () => {
  it("prompts for a request only for a required posture on a TTY", async () => {
    const prompt = new FakePrompt(true, { request: "do the thing" });
    const { deps } = makeDeps({
      prompt,
      preflightResult: normalized({
        skill: findCatalogEntry("implement") as CatalogEntry,
      }),
    });
    await runSpawn({ ...fullFlags, skill: "implement" }, deps);
    expect(prompt.gathered).toEqual(["request"]);
  });

  it("does not prompt for a request on an optional posture", async () => {
    const prompt = new FakePrompt(true);
    const { deps } = makeDeps({ prompt });
    await runSpawn(fullFlags, deps);
    expect(prompt.gathered).not.toContain("request");
  });

  it("fails a non-interactive required posture naming --request", async () => {
    const { deps, adapter } = makeDeps({ prompt: new FakePrompt(false) });
    await expect(
      runSpawn({ ...fullFlags, skill: "implement" }, deps),
    ).rejects.toThrow(/requires a request; pass --request <text>/);
    expect(adapter.spawnedWith).toBeNull();
  });

  it("surfaces a forbidden-request preflight rejection with no launch", async () => {
    const { deps, adapter, store } = makeDeps({
      preflightError: new SpawnPreflightError("rejects --request"),
    });
    await expect(
      runSpawn({ ...fullFlags, skill: "roadmap", request: "x" }, deps),
    ).rejects.toThrow(/rejects --request/);
    expect(adapter.spawnedWith).toBeNull();
    expect(store.registered).toEqual([]);
  });
});

describe("runSpawn — preflight and herdr wiring", () => {
  it("passes resolved inputs into preflight and calls it synchronously", async () => {
    let calls = 0;
    let firstInput: Record<string, unknown> | null = null;
    const preflight: SpawnDeps["preflight"] = (input) => {
      calls += 1;
      firstInput ??= input as unknown as Record<string, unknown>;
      return normalized();
    };
    const { deps } = makeDeps({ preflight });
    await runSpawn({ ...fullFlags, request: undefined }, deps);
    expect(calls).toBe(1);
    expect(firstInput).toMatchObject({
      thread: "260718155545Z-x",
      skill: "propose",
      harness: "claude",
      adapter: "herdr",
    });
  });

  it("fails before any launch when the herdr executable is missing", async () => {
    const { deps, adapter, store, observerCalls } = makeDeps({
      resolveHerdr: () => null,
    });
    await expect(runSpawn(fullFlags, deps)).rejects.toThrow(
      /herdr executable .* not found on PATH/,
    );
    expect(adapter.spawnedWith).toBeNull();
    expect(store.registered).toEqual([]);
    expect(observerCalls).toEqual([]);
  });

  it("propagates a preflight failure without any side effect", async () => {
    const { deps, adapter, store, observerCalls } = makeDeps({
      preflightError: new SpawnPreflightError("bad thread"),
    });
    await expect(runSpawn(fullFlags, deps)).rejects.toThrow("bad thread");
    expect(adapter.spawnedWith).toBeNull();
    expect(store.registered).toEqual([]);
    expect(observerCalls).toEqual([]);
  });
});

describe("runSpawn — active-run guard", () => {
  const guarded = normalized({
    activeRunGuard: {
      hasActiveRun: true,
      activeRuns: [activeRecord("run-prior")],
    },
  });

  it("confirms an additional run interactively and leaves prior runs untouched", async () => {
    const prompt = new FakePrompt(true, {}, true);
    const store = new FakeStore();
    const { deps } = makeDeps({ prompt, store, preflightResult: guarded });
    await runSpawn(fullFlags, deps);
    expect(prompt.confirmCalls).toBe(1);
    expect(store.registered).toHaveLength(1);
    expect(store.registered[0]?.id).toBe(asRunId("run-fixed"));
  });

  it("aborts when the interactive confirmation is declined, with no side effect", async () => {
    const prompt = new FakePrompt(true, {}, false);
    const { deps, adapter, store, observerCalls } = makeDeps({
      prompt,
      preflightResult: guarded,
    });
    await expect(runSpawn(fullFlags, deps)).rejects.toThrow(/Spawn cancelled/);
    expect(adapter.spawnedWith).toBeNull();
    expect(store.registered).toEqual([]);
    expect(observerCalls).toEqual([]);
  });

  it("fails a non-interactive guarded spawn and points at --force", async () => {
    const { deps, adapter } = makeDeps({
      prompt: new FakePrompt(false),
      preflightResult: guarded,
    });
    await expect(runSpawn(fullFlags, deps)).rejects.toThrow(/--force/);
    expect(adapter.spawnedWith).toBeNull();
  });

  it("permits an additional run under --force without prompting", async () => {
    const prompt = new FakePrompt(false);
    const store = new FakeStore();
    const { deps } = makeDeps({ prompt, store, preflightResult: guarded });
    await runSpawn({ ...fullFlags, force: true }, deps);
    expect(prompt.confirmCalls).toBe(0);
    expect(store.registered).toHaveLength(1);
  });

  it("does not trigger the guard when no active run exists", async () => {
    const prompt = new FakePrompt(true);
    const { deps } = makeDeps({ prompt });
    await runSpawn(fullFlags, deps);
    expect(prompt.confirmCalls).toBe(0);
  });
});
