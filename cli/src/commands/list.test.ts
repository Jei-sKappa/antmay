import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";

import type {
  RunCheckpoint,
  RunCondition,
  SnapshottedStage,
} from "../state/checkpoint.js";
import { validateCheckpoint } from "../state/checkpoint.js";
import { writeCheckpoint } from "../state/persist.js";
import { runsDirectory } from "../state/runs.js";
import { listCommand, type ListDeps } from "./list.js";

class Capture extends Writable {
  chunks: string[] = [];
  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(chunk.toString());
    callback();
  }
  get text(): string {
    return this.chunks.join("");
  }
}

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), prefix)));
  tempDirs.push(dir);
  return dir;
}

function makeStage(id: string, model: string): SnapshottedStage {
  return {
    id,
    skill: id,
    target: { kind: "thread-root" },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [],
      changeRequired: false,
      commitSubjectTemplate: null,
    },
    queueResolution: "advance",
    profile: {
      harness: "codex",
      model,
      prompt: "do work",
      idleTimeoutSeconds: 900,
    },
    resolvedTarget: "/Users/dev/repo/docs/threads/x",
  };
}

function makeCheckpoint(overrides: {
  runId: string;
  updatedAt: string;
  condition: RunCondition;
  stageIndex: number;
  recipeName?: string;
  stages?: SnapshottedStage[];
  repoRoot?: string;
  threadRelPath?: string;
}): RunCheckpoint {
  const stages =
    overrides.stages ??
    [makeStage("spec", "gpt-spec"), makeStage("plan", "gpt-plan"), makeStage("impl", "gpt-impl")];
  const repoRoot = overrides.repoRoot ?? "/Users/dev/repo";
  const checkpoint: RunCheckpoint = {
    schemaVersion: 1,
    runId: overrides.runId,
    executor: { pid: 4242, version: "0.1.0" },
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: overrides.updatedAt,
    repoRoot,
    threadRelPath: overrides.threadRelPath ?? "docs/threads/260723121015Z-demo",
    workspace: {
      strategy: "current-checkout",
      path: repoRoot,
      execution: { cwd: repoRoot, sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    recipeName: overrides.recipeName ?? "standard",
    stages,
    observedHarnessVersions: { codex: "codex 1.0.0" },
    stageIndex: overrides.stageIndex,
    condition: overrides.condition,
    attempts: [],
    waiting: null,
    gitCursor: { stageIndex: overrides.stageIndex, headAtStageEntry: null, observedHead: null },
  };
  if (overrides.condition === "waiting-for-user") {
    checkpoint.waiting = { kind: "idle-timeout", message: "The stage idled out." };
  }
  // Guard the fixtures themselves: a test-authored invalid checkpoint would
  // otherwise silently exercise the warning path instead of the row path.
  const validated = validateCheckpoint(JSON.parse(JSON.stringify(checkpoint)));
  if (!validated.ok) {
    throw new Error(`test fixture is invalid: ${validated.errors.join("; ")}`);
  }
  return checkpoint;
}

async function seedRun(stateRoot: string, checkpoint: RunCheckpoint): Promise<string> {
  const runDir = path.join(runsDirectory(stateRoot), checkpoint.runId);
  await fs.mkdir(runDir, { recursive: true });
  await writeCheckpoint(runDir, checkpoint);
  return runDir;
}

function deps(env: NodeJS.ProcessEnv, isTTY = false): {
  deps: ListDeps;
  out: Capture;
  err: Capture;
} {
  const out = new Capture();
  const err = new Capture();
  return {
    deps: { env, homedir: undefined, stdout: out, stderr: err, isTTY },
    out,
    err,
  };
}

describe("listCommand (AC-2.4)", () => {
  it("prints 'No AFK runs found.' and creates nothing for an absent state root", async () => {
    const base = await tempDir("antmay-list-");
    const stateRoot = path.join(base, "nowhere");
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(out.text).toBe("No AFK runs found.\n");
    expect(err.text).toBe("");
    await expect(fs.stat(stateRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("prints 'No AFK runs found.' for an empty runs directory without writing", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await fs.mkdir(runsDirectory(stateRoot), { recursive: true });
    const before = await fs.readdir(runsDirectory(stateRoot));
    const { deps: d, out } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(out.text).toBe("No AFK runs found.\n");
    expect(await fs.readdir(runsDirectory(stateRoot))).toEqual(before);
  });

  it("ignores an invalid config-only environment value for a state-only listing", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T120000000Z-aaaaaaaa",
        updatedAt: "2026-07-23T12:30:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );
    const { deps: d, out, err } = deps({
      ANTMAY_STATE_HOME: stateRoot,
      ANTMAY_CONFIG_HOME: "relative/not/absolute",
    });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(err.text).toBe("");
    expect(out.text).toContain("20260723T120000000Z-aaaaaaaa");
  });
});

describe("listCommand rendering (AC-16.1, AC-16.2)", () => {
  it("renders valid runs sorted by updatedAt descending with every column", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T120000000Z-old00000",
        updatedAt: "2026-07-23T12:10:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T130000000Z-new00000",
        updatedAt: "2026-07-23T13:45:00.000Z",
        condition: "waiting-for-user",
        stageIndex: 1,
      }),
    );
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(err.text).toBe("");
    const lines = out.text.trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    // Descending: the 13:45 run comes first.
    expect(lines[0]).toContain("20260723T130000000Z-new00000");
    expect(lines[1]).toContain("20260723T120000000Z-old00000");

    const first = lines[0]!;
    expect(first).toContain("2026-07-23T13:45:00.000Z"); // updated time
    expect(first).toContain("Waiting for user"); // friendly condition
    expect(first).toContain("standard"); // recipe
    expect(first).toContain("2/3 [plan]"); // one-based stage position + id
    expect(first).toContain("codex/gpt-plan"); // current harness/model
    expect(first).toContain("/Users/dev/repo"); // absolute repo path
    expect(first).toContain("docs/threads/260723121015Z-demo"); // repo-relative thread

    expect(lines[1]).toContain("Ready");
    expect(lines[1]).toContain("1/3 [spec]");
    expect(lines[1]).toContain("codex/gpt-spec");
  });

  it("renders an executing run with the unverified condition label", async () => {
    const stateRoot = await tempDir("antmay-list-");
    const executing = makeCheckpoint({
      runId: "20260723T140000000Z-exec0000",
      updatedAt: "2026-07-23T14:00:00.000Z",
      condition: "ready",
      stageIndex: 0,
    });
    // Promote to a valid executing checkpoint with exactly one live final attempt.
    executing.condition = "executing";
    executing.attempts = [
      {
        attempt: 1,
        stageIndex: 0,
        stageId: "spec",
        startedAt: "2026-07-23T14:00:00.000Z",
        result: "executing",
        terminalResult: null,
        logPath: "logs/00-spec-attempt-01.log",
      },
    ];
    await seedRun(stateRoot, executing);
    const { deps: d, out } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(out.text).toContain("Executing (unverified)");
  });

  it("shows the final stage count and no harness/model for a completed run", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T150000000Z-done0000",
        updatedAt: "2026-07-23T15:00:00.000Z",
        condition: "completed",
        stageIndex: 3,
      }),
    );
    const { deps: d, out } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    const row = out.text.trimEnd();
    expect(row).toContain("Completed");
    expect(row).toContain("3/3");
    expect(row).not.toContain("codex/");
  });

  it("emits meaning-free color only on a TTY with NO_COLOR unset", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T160000000Z-color000",
        updatedAt: "2026-07-23T16:00:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );

    const tty = deps({ ANTMAY_STATE_HOME: stateRoot }, true);
    expect(await listCommand(tty.deps)).toBe(0);
    expect(tty.out.text).toContain("\x1b[");

    const noColor = deps({ ANTMAY_STATE_HOME: stateRoot, NO_COLOR: "1" }, true);
    expect(await listCommand(noColor.deps)).toBe(0);
    expect(noColor.out.text).not.toContain("\x1b[");

    const piped = deps({ ANTMAY_STATE_HOME: stateRoot }, false);
    expect(await listCommand(piped.deps)).toBe(0);
    expect(piped.out.text).not.toContain("\x1b[");
  });
});

describe("listCommand corruption handling (AC-16.3)", () => {
  it("warns per corrupt checkpoint, still prints valid rows, and exits 1", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T120000000Z-valid000",
        updatedAt: "2026-07-23T12:00:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );
    const corruptDir = path.join(runsDirectory(stateRoot), "20260723T130000000Z-corrupt0");
    await fs.mkdir(corruptDir, { recursive: true });
    await fs.writeFile(path.join(corruptDir, "state.json"), "{ not valid json", "utf8");
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(1);
    expect(out.text).toContain("20260723T120000000Z-valid000");
    expect(err.text).toContain(corruptDir); // names the directory
    expect(err.text).toContain(path.join(corruptDir, "state.json")); // names the path
    expect(err.text.toLowerCase()).toContain("json"); // names the validation error
  });

  it("ignores stray non-directory entries and never writes a lock", async () => {
    const stateRoot = await tempDir("antmay-list-");
    await seedRun(
      stateRoot,
      makeCheckpoint({
        runId: "20260723T120000000Z-valid000",
        updatedAt: "2026-07-23T12:00:00.000Z",
        condition: "ready",
        stageIndex: 0,
      }),
    );
    await fs.writeFile(path.join(runsDirectory(stateRoot), "README.txt"), "ignore me", "utf8");
    const { deps: d, out, err } = deps({ ANTMAY_STATE_HOME: stateRoot });

    const code = await listCommand(d);

    expect(code).toBe(0);
    expect(err.text).toBe("");
    expect(out.text.trimEnd().split("\n")).toHaveLength(1);

    // No lock directory or lock file may appear anywhere under the state root.
    const stateEntries = await fs.readdir(stateRoot);
    expect(stateEntries).toEqual(["afk-runs"]);
  });
});
