import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  asRunId,
  type RepositoryPath,
  type RunClassification,
  type RunRecord,
} from "@antmay/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepositoryResolutionError } from "../src/preflight/repository";
import { SkillUnavailableError } from "../src/preflight/skill-availability";
import {
  type ActiveRunLookup,
  type NormalizedSpawnRequest,
  preflightSpawn,
  type SpawnPreflightEnv,
  SpawnPreflightError,
} from "../src/preflight/spawn";
import { ThreadResolutionError } from "../src/preflight/thread";
import type {
  ProcessRunner,
  ProcessRunResult,
} from "../src/process/process-runner";

const THREAD = "260718155545Z-workflow-orchestrator-cli";

let repo: string;
let home: string;

beforeEach(() => {
  const sandbox = realpathSync.native(
    mkdtempSync(join(tmpdir(), "antmay-spawn-")),
  );
  repo = join(sandbox, "repo");
  home = join(sandbox, "home");
  mkdirSync(join(repo, "docs", "threads", THREAD), { recursive: true });
  mkdirSync(home, { recursive: true });
});

afterEach(() => {
  rmSync(join(repo, ".."), { recursive: true, force: true });
});

function installClaudeSkill(name: string): void {
  const dir = join(repo, ".claude", "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: x\n---\nbody\n`,
    "utf8",
  );
}

function canonicalRepo(): RepositoryPath {
  return realpathSync.native(repo) as RepositoryPath;
}

class FakeRunner implements ProcessRunner {
  readonly runCalls: string[] = [];
  constructor(private readonly located: Record<string, string | null>) {}
  run(program: string, _args: readonly string[]): ProcessRunResult {
    this.runCalls.push(program);
    if (program === "git") {
      return { code: 0, stdout: `${repo}\n`, stderr: "" };
    }
    return { code: 0, stdout: "", stderr: "" };
  }
  locate(program: string): string | null {
    const value = this.located[program];
    return value === undefined ? null : value;
  }
}

class FakeStore implements ActiveRunLookup {
  listCalls = 0;
  registerCalls = 0;
  constructor(private readonly records: readonly RunRecord[] = []) {}
  listForRepository(repositoryPath: RepositoryPath): readonly RunRecord[] {
    this.listCalls += 1;
    return this.records.filter((r) => r.repositoryPath === repositoryPath);
  }
  register(record: RunRecord): RunRecord {
    this.registerCalls += 1;
    return record;
  }
}

function makeRecord(
  repositoryPath: RepositoryPath,
  id: string,
  classification: RunClassification,
): RunRecord {
  return {
    id: asRunId(id),
    repositoryPath,
    threadPath:
      `${repositoryPath}/docs/threads/${THREAD}` as RunRecord["threadPath"],
    skill: "propose",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "s" },
    attachment: { available: true, handle: null },
    classification,
    reason: classification === "active" ? null : "done reason",
    workerHealth: { state: "healthy", detail: null },
  };
}

function runner(): FakeRunner {
  return new FakeRunner({
    git: "/bin/git",
    claude: "/bin/claude",
    codex: "/bin/codex",
  });
}

function baseInput(store: FakeStore, overrides: Record<string, unknown> = {}) {
  const env: SpawnPreflightEnv = { HOME: home };
  return {
    cwd: join(repo, "packages", "cli"),
    thread: THREAD,
    skill: "propose",
    harness: "claude" as const,
    adapter: "herdr",
    runner: runner(),
    activeRuns: store,
    env,
    ...overrides,
  };
}

describe("preflightSpawn", () => {
  it("resolves a valid request into a normalized launch request", () => {
    installClaudeSkill("propose");
    const store = new FakeStore();
    const result: NormalizedSpawnRequest = preflightSpawn(baseInput(store));

    expect(result.repositoryPath).toBe(canonicalRepo());
    expect(result.threadPath).toBe(
      realpathSync.native(join(repo, "docs", "threads", THREAD)),
    );
    expect(result.skill.name).toBe("propose");
    expect(result.adapter).toBe("herdr");
    expect(result.harnessExecutable).toBe("/bin/claude");
    expect(result.request).toBeNull();
    expect(result.activeRunGuard.hasActiveRun).toBe(false);
    expect(store.registerCalls).toBe(0);
  });

  it("rejects a cwd outside a git worktree", () => {
    installClaudeSkill("propose");
    const store = new FakeStore();
    const input = baseInput(store, {
      runner: new FakeRunner({ git: null }),
    });
    expect(() => preflightSpawn(input)).toThrow(RepositoryResolutionError);
    expect(store.listCalls).toBe(0);
  });

  it("rejects an unsupported adapter before the active guard", () => {
    installClaudeSkill("propose");
    const store = new FakeStore();
    expect(() => preflightSpawn(baseInput(store, { adapter: "tmux" }))).toThrow(
      SpawnPreflightError,
    );
    expect(store.listCalls).toBe(0);
    expect(store.registerCalls).toBe(0);
  });

  it("rejects an unknown catalog skill before side effects", () => {
    const store = new FakeStore();
    expect(() =>
      preflightSpawn(baseInput(store, { skill: "not-a-skill" })),
    ).toThrow(/Unknown catalog skill/);
    expect(store.listCalls).toBe(0);
  });

  it("rejects --request for a forbidden posture entry", () => {
    installClaudeSkill("roadmap");
    const store = new FakeStore();
    expect(() =>
      preflightSpawn(baseInput(store, { skill: "roadmap", request: "do it" })),
    ).toThrow(SpawnPreflightError);
    expect(store.listCalls).toBe(0);
  });

  it("rejects a missing request for a required posture entry", () => {
    installClaudeSkill("implement");
    const store = new FakeStore();
    expect(() =>
      preflightSpawn(baseInput(store, { skill: "implement" })),
    ).toThrow(/requires a non-empty --request/);
    expect(store.listCalls).toBe(0);
  });

  it("accepts a required request and carries it literally", () => {
    installClaudeSkill("implement");
    const store = new FakeStore();
    const result = preflightSpawn(
      baseInput(store, { skill: "implement", request: "task 5" }),
    );
    expect(result.request).toBe("task 5");
  });

  it("rejects a bad thread value before side effects", () => {
    installClaudeSkill("propose");
    const store = new FakeStore();
    expect(() =>
      preflightSpawn(baseInput(store, { thread: "260718" })),
    ).toThrow(ThreadResolutionError);
    expect(store.listCalls).toBe(0);
  });

  it("rejects an unavailable skill with remediation before side effects", () => {
    const store = new FakeStore();
    expect(() => preflightSpawn(baseInput(store))).toThrow(
      SkillUnavailableError,
    );
    expect(store.listCalls).toBe(0);
    expect(store.registerCalls).toBe(0);
  });

  it("rejects a missing harness executable before the active guard", () => {
    installClaudeSkill("propose");
    const store = new FakeStore();
    const input = baseInput(store, {
      runner: new FakeRunner({ git: "/bin/git", claude: null }),
    });
    expect(() => preflightSpawn(input)).toThrow(/harness executable/);
    expect(store.listCalls).toBe(0);
  });

  it("flags an existing active run in the guard result", () => {
    installClaudeSkill("propose");
    const repoKey = canonicalRepo();
    const store = new FakeStore([makeRecord(repoKey, "run-a", "active")]);
    const result = preflightSpawn(baseInput(store));
    expect(result.activeRunGuard.hasActiveRun).toBe(true);
    expect(result.activeRunGuard.activeRuns.map((r) => r.id)).toEqual([
      "run-a",
    ]);
  });

  it("does not let a terminal run trigger the guard", () => {
    installClaudeSkill("propose");
    const repoKey = canonicalRepo();
    const store = new FakeStore([makeRecord(repoKey, "run-done", "done")]);
    const result = preflightSpawn(baseInput(store));
    expect(result.activeRunGuard.hasActiveRun).toBe(false);
    expect(result.activeRunGuard.activeRuns).toEqual([]);
  });

  it("scopes the guard to the canonical repository folder", () => {
    installClaudeSkill("propose");
    const otherWorktree = "/some/other/worktree" as RepositoryPath;
    const store = new FakeStore([
      makeRecord(otherWorktree, "run-other", "active"),
    ]);
    const result = preflightSpawn(baseInput(store));
    expect(result.activeRunGuard.hasActiveRun).toBe(false);
  });
});
