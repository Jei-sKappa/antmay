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
import { attachRun } from "../src/attach/operation";
import {
  RetainedPaneError,
  runSpawn,
  type SpawnDeps,
  type SpawnOptions,
} from "../src/commands/spawn";
import type { NormalizedSpawnRequest } from "../src/preflight/spawn";
import type { ProcessRunner } from "../src/process/process-runner";
import type {
  PromptContext,
  PromptField,
  PromptProvider,
} from "../src/prompts";
import { CODEX_SPAWNED_AT_MS_ENV } from "../src/worker-env";

const REPO = asRepositoryPath("/canonical/repo");
const THREAD = asThreadPath("/canonical/repo/docs/threads/260718155545Z-x");
const HANDLE = asAttachmentHandle("w1:p1");

function normalized(
  overrides: Partial<NormalizedSpawnRequest> = {},
): NormalizedSpawnRequest {
  return {
    repositoryPath: REPO,
    threadPath: THREAD,
    skill: findCatalogEntry("implement") as CatalogEntry,
    harness: "claude",
    adapter: "herdr",
    request: "do the work",
    harnessExecutable: "/bin/claude",
    skillDir: "/roots/implement",
    activeRunGuard: { hasActiveRun: false, activeRuns: [] },
    ...overrides,
  };
}

class EventAdapter implements ExecutionAdapter {
  readonly name = "herdr" as const;
  spawnedWith: SpawnSpec | null = null;
  attachCalls: AttachmentHandle[] = [];
  constructor(private readonly events: string[]) {}
  spawn(spec: SpawnSpec): SpawnedSession {
    this.spawnedWith = spec;
    this.events.push("pane");
    return { handle: HANDLE };
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
    this.events.push("attach");
  }
}

const nonInteractive: PromptProvider = {
  isInteractive: () => false,
  gather: async (_field: PromptField, _context: PromptContext) => "",
  confirmAdditionalRun: async () => false,
};

const okRunner: ProcessRunner = {
  run: () => ({ code: 0, stdout: "", stderr: "" }),
  locate: (program) => `/bin/${program}`,
};

const fullFlags: SpawnOptions = {
  thread: "260718155545Z-x",
  skill: "implement",
  harness: "claude",
  adapter: "herdr",
  request: "do the work",
};

type Harness = {
  deps: SpawnDeps;
  events: string[];
  registered: RunRecord[];
  observerEnvs: (NodeJS.ProcessEnv | undefined)[];
  observerIds: RunId[];
  attachAdapter: EventAdapter;
  output: string[];
};

function harness(overrides: Partial<SpawnDeps> = {}): Harness {
  const events: string[] = [];
  const registered: RunRecord[] = [];
  const observerEnvs: (NodeJS.ProcessEnv | undefined)[] = [];
  const observerIds: RunId[] = [];
  const output: string[] = [];
  const adapter = new EventAdapter(events);
  const attachAdapter = new EventAdapter(events);
  const store = {
    register(record: RunRecord): RunRecord {
      events.push("register");
      registered.push(record);
      return record;
    },
    listForRepository(_repositoryPath: RepositoryPath): readonly RunRecord[] {
      return [];
    },
  };
  const deps: SpawnDeps = {
    cwd: "/canonical/repo",
    env: {},
    runner: okRunner,
    prompt: nonInteractive,
    store,
    adapter,
    attachAdapter,
    write: (message) => {
      output.push(message);
    },
    preflight: () => normalized(),
    resolveHerdr: () => "/bin/herdr",
    launchObserver: (runId, options) => {
      events.push("observer");
      observerIds.push(runId);
      observerEnvs.push(options?.env);
      return { pid: 7 };
    },
    attachRun,
    generateRunId: () => asRunId("run-fixed"),
    generateSessionId: () => "fixed-uuid",
    now: () => 1_700_000_000_000,
    ...overrides,
  };
  return {
    deps,
    events,
    registered,
    observerEnvs,
    observerIds,
    attachAdapter,
    output,
  };
}

describe("runSpawn — transaction order", () => {
  it("launches the pane, registers, then starts the observer in that order", async () => {
    const h = harness();
    const result = await runSpawn(fullFlags, h.deps);
    expect(h.events).toEqual(["pane", "register", "observer"]);
    expect(result.runId).toBe(asRunId("run-fixed"));
    expect(result.handle).toBe(HANDLE);
    expect(result.attached).toBe(false);
  });

  it("records a complete active binding carrying every §3.2 field", async () => {
    const h = harness();
    await runSpawn(fullFlags, h.deps);
    expect(h.registered).toHaveLength(1);
    expect(h.registered[0]).toEqual({
      id: asRunId("run-fixed"),
      repositoryPath: REPO,
      threadPath: THREAD,
      skill: "implement",
      harness: "claude",
      adapter: "herdr",
      session: { kind: "pinned", id: "fixed-uuid" },
      attachment: { available: true, handle: HANDLE },
      classification: "active",
      reason: null,
      workerHealth: { state: "healthy", detail: null },
    });
  });

  it("prints the stable run ID and attach info on a detached success", async () => {
    const h = harness();
    await runSpawn(fullFlags, h.deps);
    const printed = h.output.join("");
    expect(printed).toContain("run-fixed");
    expect(printed).toContain("antmay attach run-fixed");
    expect(printed).toContain(HANDLE);
  });

  it("submits the literal catalog identity, thread, and request into the pane", async () => {
    const events: string[] = [];
    const adapter = new EventAdapter(events);
    const h = harness({ adapter });
    await runSpawn(fullFlags, h.deps);
    expect(adapter.spawnedWith?.initialInput).toBe(
      `/implement ${THREAD}\n\ndo the work`,
    );
    expect(adapter.spawnedWith?.cwd).toBe(REPO);
    expect(adapter.spawnedWith?.args).toEqual(["--session-id", "fixed-uuid"]);
  });
});

describe("runSpawn — observation config for the worker", () => {
  it("hands the Claude transcript root to the detached worker", async () => {
    const h = harness({
      env: { ANTMAY_CLAUDE_TRANSCRIPT_ROOT: "/tscript" },
    });
    await runSpawn(fullFlags, h.deps);
    expect(h.observerIds).toEqual([asRunId("run-fixed")]);
    expect(h.observerEnvs[0]?.ANTMAY_CLAUDE_TRANSCRIPT_ROOT).toBe("/tscript");
  });

  it("hands the Codex session root and recorded spawn time to the worker", async () => {
    const h = harness({
      env: { ANTMAY_CODEX_SESSION_ROOT: "/sroot" },
      preflight: () =>
        normalized({
          harness: "codex",
          harnessExecutable: "/bin/codex",
          skill: findCatalogEntry("propose") as CatalogEntry,
          request: null,
        }),
    });
    await runSpawn(
      { ...fullFlags, skill: "propose", harness: "codex", request: undefined },
      h.deps,
    );
    expect(h.observerEnvs[0]?.ANTMAY_CODEX_SESSION_ROOT).toBe("/sroot");
    expect(h.observerEnvs[0]?.[CODEX_SPAWNED_AT_MS_ENV]).toBe(
      String(1_700_000_000_000),
    );
  });
});

describe("runSpawn — immediate attachment", () => {
  it("joins the pane through the shared attach operation after startup", async () => {
    const h = harness();
    const result = await runSpawn({ ...fullFlags, attach: true }, h.deps);
    expect(h.events).toEqual(["pane", "register", "observer", "attach"]);
    expect(h.attachAdapter.attachCalls).toEqual([HANDLE]);
    expect(result.attached).toBe(true);
  });
});

describe("runSpawn — post-pane partial failures", () => {
  it("retains the pane and reports non-success when registration fails", async () => {
    const events: string[] = [];
    const adapter = new EventAdapter(events);
    const attachAdapter = new EventAdapter(events);
    const observerIds: RunId[] = [];
    const output: string[] = [];
    const deps: SpawnDeps = {
      ...harness().deps,
      adapter,
      attachAdapter,
      write: (message) => output.push(message),
      store: {
        register(): RunRecord {
          throw new Error("disk full");
        },
        listForRepository: () => [],
      },
      launchObserver: (runId) => {
        observerIds.push(runId);
        return { pid: 1 };
      },
    };
    await expect(runSpawn(fullFlags, deps)).rejects.toBeInstanceOf(
      RetainedPaneError,
    );
    try {
      await runSpawn(fullFlags, deps);
    } catch (error) {
      expect((error as RetainedPaneError).retainedHandle).toBe(HANDLE);
      expect((error as RetainedPaneError).message).toContain(String(HANDLE));
    }
    // The observer never started and no success was printed.
    expect(observerIds).toEqual([]);
    expect(output.join("")).not.toContain("Launched run");
    // The pane was never closed or re-touched.
    expect(adapter.attachCalls).toEqual([]);
  });

  it("retains the pane and reports non-success when the observer fails to start", async () => {
    const events: string[] = [];
    const adapter = new EventAdapter(events);
    const output: string[] = [];
    const deps: SpawnDeps = {
      ...harness().deps,
      adapter,
      attachAdapter: adapter,
      write: (message) => output.push(message),
      launchObserver: () => {
        throw new Error("fork failed");
      },
    };
    let caught: unknown;
    try {
      await runSpawn({ ...fullFlags, attach: true }, deps);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RetainedPaneError);
    expect((caught as RetainedPaneError).retainedHandle).toBe(HANDLE);
    // A worker-startup failure never reaches attach and never prints success.
    expect(adapter.attachCalls).toEqual([]);
    expect(output.join("")).not.toContain("Launched run");
  });
});
