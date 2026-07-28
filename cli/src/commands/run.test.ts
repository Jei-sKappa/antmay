import { mkdirSync, promises as fs, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";

import { afterAll, describe, expect, it } from "vitest";

import type { HarnessId } from "../config/execution.js";
import type { ProbeResult } from "../harness/probe.js";
import { createScriptedInvoker } from "../harness/scripted/invoker.js";
import { probeScriptedHarnessExecutables } from "../harness/scripted/probe.js";
import {
  SCRIPTED_HARNESS_TOGGLE_VAR,
  SCRIPTED_SCENARIO_FILENAME,
} from "../harness/scripted/scenario.js";
import { EXIT_SIGHUP, EXIT_SIGINT, EXIT_SIGTERM } from "../cli/exit-codes.js";
import type { installSignalHandlers } from "../runner/signals.js";
import { SignalInterruption } from "../runner/signals.js";
import { acquireWorkspaceLock, locksDirectory } from "../state/lock.js";
import type { LockHandle } from "../state/lock.js";
import { readCheckpoint } from "../state/persist.js";
import { createRunDirectory, runsDirectory } from "../state/runs.js";
import {
  createFakeHarness,
  type FakeHarness,
  type FakeHarnessStep,
} from "../test-helpers/fake-harness.js";
import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import { runCommand, type RunDeps } from "./run.js";

/** An in-memory writable stream that accumulates everything written to it. */
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

/**
 * Temporary resources are collected for the whole file and released once every
 * case has finished. The cases here run concurrently, so nothing may be torn
 * down between tests: a per-test hook would reach into a repository or state
 * root another in-flight case is still using.
 */
const fixtures: RepoFixture[] = [];
const tempDirs: string[] = [];
const heldLocks: LockHandle[] = [];

afterAll(async () => {
  for (const lock of heldLocks) await lock.release().catch(() => undefined);
  for (const fixture of fixtures) await fixture.cleanup().catch(() => undefined);
  for (const dir of tempDirs) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), prefix)));
  tempDirs.push(dir);
  return dir;
}

/** The stage IDs the fixture's `standard` pipeline document selects, in order. */
const STANDARD_STAGE_IDS = [
  "spec",
  "reconcile-spec",
  "review-spec",
  "plan-strict",
  "reconcile-plan",
  "implement-plan-with-subagents",
] as const;

/** A pipeline document selecting `stages` under the declared name `standard`. */
function pipelineDocument(
  stages: readonly (string | { stage: string; instructions: string })[] =
    STANDARD_STAGE_IDS,
  name = "standard",
): Record<string, unknown> {
  return {
    schemaVersion: 0,
    name,
    stages: stages.map((entry) =>
      typeof entry === "string" ? { stage: entry } : entry,
    ),
  };
}

/** A settings document binding every named stage to one codex/test-model agent. */
function settingsFor(
  stages: readonly string[] = STANDARD_STAGE_IDS,
  model = "test-model",
): Record<string, unknown> {
  return {
    afk: {
      stages: Object.fromEntries(
        stages.map((stage) => [
          stage,
          { agent: { harness: "codex", model } },
        ]),
      ),
    },
  };
}

const SIGNAL_EXIT: Record<string, number> = {
  SIGINT: EXIT_SIGINT,
  SIGTERM: EXIT_SIGTERM,
  SIGHUP: EXIT_SIGHUP,
};

/**
 * A `installSignalHandlers`-shaped fake that never touches `process`: `signaled`
 * returns whatever the supplied getter reports and `exitCodeFor` maps by the
 * conventional codes. The default getter reports no signal.
 */
function fakeSignals(
  signaled: () => NodeJS.Signals | null = () => null,
): typeof installSignalHandlers {
  return () => ({
    signaled,
    exitCodeFor: (sig) => SIGNAL_EXIT[sig] ?? EXIT_SIGINT,
    uninstall: () => undefined,
  });
}

/** Harness probe fake that reports a distinctive version for every request. */
const okProbe: RunDeps["probe"] = async (harnesses): Promise<ProbeResult> => {
  const versions: Partial<Record<HarnessId, string>> = {};
  for (const h of harnesses) versions[h] = `${h} 99.9.9`;
  return { ok: true, versions };
};

/** Harness probe fake that fails for every requested harness. */
const failingProbe: RunDeps["probe"] = async (harnesses): Promise<ProbeResult> => ({
  ok: false,
  failures: harnesses.map((h) => ({
    harness: h,
    binary: h === "codex" ? "codex" : "claude",
    reason: "executable not found on PATH",
  })),
});

type Harness = {
  configRoot: string;
  stateRoot: string;
  fixture: RepoFixture;
};

/**
 * A repository, config root, and state root for one case. `settings` and
 * `pipeline` are written unless explicitly `null`, which is how a case exercises
 * a missing settings file or a missing pipeline document.
 */
async function setup(
  options: {
    settings?: unknown;
    pipeline?: unknown;
    profile?: unknown;
    profileName?: string;
  } = {},
): Promise<Harness> {
  const fixture = await createRepoFixture({ thread: {} });
  fixtures.push(fixture);
  const configRoot = await tempDir("antmay-cfg-");
  const stateRoot = await tempDir("antmay-state-");
  const settings =
    "settings" in options ? options.settings : settingsFor();
  if (settings !== null) {
    await fs.writeFile(
      path.join(configRoot, "settings.json"),
      JSON.stringify(settings, null, 2),
      "utf8",
    );
  }
  const pipeline =
    "pipeline" in options ? options.pipeline : pipelineDocument();
  if (pipeline !== null) {
    await writeConfigDocument(configRoot, "pipelines", "standard", pipeline);
  }
  if (options.profile !== undefined) {
    await writeConfigDocument(
      configRoot,
      "profiles",
      options.profileName ?? "quality",
      options.profile,
    );
  }
  return { configRoot, stateRoot, fixture };
}

/** Write one config-root document, creating its role directory. */
async function writeConfigDocument(
  configRoot: string,
  directory: "pipelines" | "profiles",
  name: string,
  document: unknown,
): Promise<string> {
  const dir = path.join(configRoot, directory);
  await fs.mkdir(dir, { recursive: true });
  const documentPath = path.join(dir, `${name}.json`);
  await fs.writeFile(documentPath, JSON.stringify(document, null, 2), "utf8");
  return documentPath;
}

type RunResult = {
  code: number;
  out: string;
  err: string;
  invoker: FakeHarness;
};

async function run(
  h: Harness,
  steps: FakeHarnessStep[],
  overrides: Partial<{
    pipeline: string;
    thread: string;
    from: string;
    profile: string;
    dangerouslySkipPermissions: boolean;
    env: NodeJS.ProcessEnv;
    probe: RunDeps["probe"];
    generateId: () => string;
    createAbortController: () => AbortController;
    installSignals: RunDeps["installSignals"];
  }> = {},
): Promise<RunResult> {
  const out = new Capture();
  const err = new Capture();
  const invoker = createFakeHarness(steps);
  const deps: RunDeps = {
    env: {
      ANTMAY_CONFIG_HOME: h.configRoot,
      ANTMAY_STATE_HOME: h.stateRoot,
      NO_COLOR: "1",
      ...overrides.env,
    },
    cwd: h.fixture.root,
    homedir: os.homedir(),
    invoker,
    probe: overrides.probe ?? okProbe,
    createScriptedInvoker,
    scriptedProbe: probeScriptedHarnessExecutables,
    stdout: out,
    stderr: err,
    isTTY: false,
    createAbortController: overrides.createAbortController,
    // Default to a no-op installer so tests never register real process handlers.
    installSignals: overrides.installSignals ?? fakeSignals(),
    generateId: overrides.generateId,
  };
  const code = await runCommand(
    {
      pipeline: overrides.pipeline ?? "standard",
      thread: overrides.thread ?? (h.fixture.threadFolder as string),
      ...(overrides.from !== undefined ? { from: overrides.from } : {}),
      ...(overrides.profile !== undefined ? { profile: overrides.profile } : {}),
      dangerouslySkipPermissions: overrides.dangerouslySkipPermissions ?? false,
    },
    deps,
  );
  return { code, out: out.text, err: err.text, invoker };
}

async function runDirNames(stateRoot: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(runsDirectory(stateRoot), {
      withFileTypes: true,
    });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function lockNames(stateRoot: string): Promise<string[]> {
  try {
    return await fs.readdir(locksDirectory(stateRoot));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeThreadFile(
  fixture: RepoFixture,
  relative: string,
  content: string,
): Promise<void> {
  const target = path.join(fixture.threadPath as string, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

async function dropPendingDecision(
  fixture: RepoFixture,
  name: string,
): Promise<void> {
  const dir = path.join(fixture.threadPath as string, ".pending-decisions");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), "open decision", "utf8");
}

async function commitSubjects(fixture: RepoFixture): Promise<string[]> {
  const result = await fixture.git(["log", "--pretty=%s"]);
  return result.stdout.trim().split("\n");
}

async function soleCheckpointDir(stateRoot: string): Promise<string> {
  const names = await runDirNames(stateRoot);
  const withCheckpoint: string[] = [];
  for (const name of names) {
    const runDir = path.join(runsDirectory(stateRoot), name);
    if ((await readCheckpoint(runDir)).ok) withCheckpoint.push(runDir);
  }
  expect(withCheckpoint.length).toBe(1);
  return withCheckpoint[0]!;
}

/**
 * Standard-pipeline script: the two authoring stages (spec, plan-strict), the
 * first reconciliation stage, and the implementation stage change their
 * boundary; review-spec and reconcile-plan change nothing.
 *
 * Every step leaves the artifact state its catalog stage promises, because a
 * DONE that does not is a contract violation rather than a finished stage —
 * which is why `plan-strict` writes an index *and* a task file.
 */
function standardSteps(fixture: RepoFixture): FakeHarnessStep[] {
  return [
    { before: () => writeThreadFile(fixture, "spec.md", "# Spec\n") },
    { before: () => writeThreadFile(fixture, "spec.md", "# Spec v2\n") },
    {},
    {
      before: async () => {
        await writeThreadFile(fixture, "plan.md", "# Plan\n");
        await writeThreadFile(fixture, "plan-tasks/01-task.md", "# Task 01\n");
      },
    },
    {},
    {
      before: () =>
        writeThreadFile(fixture, "implementation-report.md", "# Report\n"),
    },
  ];
}

describe.concurrent("runCommand — happy path (AC-1.3, AC-20.2)", () => {
  it("runs the standard pipeline to completion, committing only the boundaries that changed", async () => {
    const h = await setup();
    const folder = h.fixture.threadFolder as string;
    const before = (await commitSubjects(h.fixture)).length;

    const result = await run(h, standardSteps(h.fixture));

    expect(result.code).toBe(0);
    const subjects = await commitSubjects(h.fixture);
    expect(subjects.length).toBe(before + 4);
    expect(subjects.slice(0, 4)).toEqual([
      `docs(${folder}): implementation report`,
      `docs(${folder}): plan`,
      `docs(${folder}): reconcile spec`,
      `docs(${folder}): spec`,
    ]);
    expect(subjects).not.toContain(`docs(${folder}): reconcile plan`);

    const runDir = await soleCheckpointDir(h.stateRoot);
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.condition).toBe("completed");
      expect(cp.checkpoint.stageIndex).toBe(6);
    }
    // Lock released on completion.
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("stores every selected-harness version outside the immutable stage snapshot", async () => {
    const h = await setup();
    await run(h, standardSteps(h.fixture));
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.observedHarnessVersions.codex).toBe("codex 99.9.9");
      expect(JSON.stringify(cp.checkpoint.stages)).not.toContain("99.9.9");
    }
  });

  it("keeps the created snapshot fixed even when settings are edited afterward (AC-4.2)", async () => {
    const h = await setup();
    await run(h, standardSteps(h.fixture));
    const runDir = await soleCheckpointDir(h.stateRoot);
    await fs.writeFile(
      path.join(h.configRoot, "settings.json"),
      JSON.stringify(settingsFor(STANDARD_STAGE_IDS, "changed-model")),
      "utf8",
    );
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(
        cp.checkpoint.stages.every(
          (stage) => stage.binding.agent.model === "test-model",
        ),
      ).toBe(true);
    }
  });

  it("emits the unrestricted-permissions warning when the flag is set", async () => {
    const h = await setup();
    const result = await run(h, standardSteps(h.fixture), {
      dangerouslySkipPermissions: true,
    });
    expect(result.code).toBe(0);
    expect(result.err).toContain("dangerously-skip-permissions");
  });
});

describe.concurrent("runCommand — external documents and selection (FR-1, FR-4, FR-5, FR-6)", () => {
  it("snapshots the declared identity and resolved source of a named pipeline", async () => {
    const h = await setup();
    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.pipelineName).toBe("standard");
    expect(cp.checkpoint.pipelineSourcePath).toBe(
      path.join(h.configRoot, "pipelines", "standard.json"),
    );
    expect(cp.checkpoint.profileSelection).toEqual({ kind: "settings-only" });
    expect(cp.checkpoint.fromStage).toBeUndefined();
  });

  it("loads an explicit relative path whose filename differs from the declared name", async () => {
    const h = await setup({ pipeline: null });
    const documentPath = path.join(h.fixture.root, "my-pipeline.json");
    await fs.writeFile(
      documentPath,
      JSON.stringify(pipelineDocument(STANDARD_STAGE_IDS, "standard")),
      "utf8",
    );
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: check in a pipeline"]);

    const result = await run(h, standardSteps(h.fixture), {
      pipeline: "./my-pipeline.json",
    });
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    // The declared name is the identity; the filename is only provenance.
    expect(cp.checkpoint.pipelineName).toBe("standard");
    expect(cp.checkpoint.pipelineSourcePath).toBe(documentPath);
  });

  it("runs a complete selected profile with no settings file at all", async () => {
    const h = await setup({
      settings: null,
      profile: {
        schemaVersion: 0,
        name: "maximum-quality",
        stages: Object.fromEntries(
          STANDARD_STAGE_IDS.map((stage) => [
            stage,
            {
              agent: { harness: "codex", model: "profile-model" },
              idleTimeoutSeconds: 120,
              heartbeatSeconds: 30,
            },
          ]),
        ),
      },
      profileName: "maximum-quality",
    });

    const result = await run(h, standardSteps(h.fixture), {
      profile: "maximum-quality",
    });
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.profileSelection).toEqual({
      kind: "profile",
      name: "maximum-quality",
      sourcePath: path.join(h.configRoot, "profiles", "maximum-quality.json"),
    });
    expect(
      cp.checkpoint.stages.every(
        (stage) =>
          stage.binding.agent.model === "profile-model" &&
          stage.binding.idleTimeoutSeconds === 120 &&
          stage.binding.heartbeatSeconds === 30,
      ),
    ).toBe(true);
  });

  it("falls back to the whole settings binding for a stage the profile omits", async () => {
    const h = await setup({
      profile: {
        schemaVersion: 0,
        name: "partial",
        stages: {
          spec: { agent: { harness: "codex", model: "profile-model" } },
        },
      },
      profileName: "partial",
    });

    const result = await run(h, standardSteps(h.fixture), { profile: "partial" });
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.stages[0]!.binding.agent.model).toBe("profile-model");
    expect(cp.checkpoint.stages[1]!.binding.agent.model).toBe("test-model");
    // Omitted timing fields settle to the intrinsic defaults on both sources.
    expect(cp.checkpoint.stages[0]!.binding.idleTimeoutSeconds).toBe(86_400);
    expect(cp.checkpoint.stages[1]!.binding.heartbeatSeconds).toBe(300);
  });

  it("snapshots only the selected suffix and records the entry point", async () => {
    const h = await setup();
    await writeThreadFile(h.fixture, "spec.md", "# Spec\n");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "docs: spec"]);

    const result = await run(h, standardSteps(h.fixture).slice(3), {
      from: "plan-strict",
    });
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.fromStage).toBe("plan-strict");
    expect(cp.checkpoint.stages.map((stage) => stage.id)).toEqual([
      "plan-strict",
      "reconcile-plan",
      "implement-plan-with-subagents",
    ]);
    // Nothing credits the three skipped stages: they were never attempted.
    expect(cp.checkpoint.attempts.map((attempt) => attempt.stageId)).toEqual([
      "plan-strict",
      "reconcile-plan",
      "implement-plan-with-subagents",
    ]);
  });

  it("snapshots the catalog contract and concrete target of every selected stage", async () => {
    const h = await setup();
    await run(h, standardSteps(h.fixture));
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    const rel = h.fixture.threadRelPath as string;
    const spec = cp.checkpoint.stages[0]!;
    expect(spec.prerequisite).toEqual({ validThread: true });
    expect(spec.promises).toEqual({ spec: true });
    expect(spec.resolvedTarget).toBe(`${rel}/`);
    expect(cp.checkpoint.stages[3]!.resolvedTarget).toBe(`${rel}/spec.md`);
  });

  it("appends portable stage instructions after the trigger and target", async () => {
    const h = await setup({
      pipeline: pipelineDocument([
        { stage: "spec", instructions: "Cover the migration path." },
        ...STANDARD_STAGE_IDS.slice(1),
      ]),
    });

    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const rel = h.fixture.threadRelPath as string;
    expect(result.invoker.calls[0]!.prompt).toBe(
      `$spec \`${rel}/\`. Cover the migration path.`,
    );
    expect(result.invoker.calls[1]!.prompt).toBe(
      `$reconcile-spec \`${rel}/spec.md\`.`,
    );
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.stages[0]!.instructions).toBe(
      "Cover the migration path.",
    );
    expect(cp.checkpoint.stages[1]!.instructions).toBeUndefined();
  });

  it("probes only the harnesses the selected stages bind", async () => {
    const h = await setup({
      settings: {
        afk: {
          stages: {
            ...(settingsFor(STANDARD_STAGE_IDS).afk as {
              stages: Record<string, unknown>;
            }).stages,
            "plan-brief": {
              agent: { harness: "claude-code", model: "unused-model" },
            },
          },
        },
      },
    });
    let probed: HarnessId[] = [];
    const trackingProbe: RunDeps["probe"] = async (harnesses, repoRoot) => {
      probed = [...harnesses];
      return okProbe(harnesses, repoRoot);
    };

    const result = await run(h, standardSteps(h.fixture), {
      probe: trackingProbe,
    });
    expect(result.code).toBe(0);
    // `plan-brief` is bound but never selected, so its harness is never probed.
    expect(probed).toEqual(["codex"]);
  });
});

describe.concurrent("runCommand — preflight failures leave no run, no checkpoint, no lock (AC-7.1)", () => {
  async function expectClean(h: Harness, result: RunResult): Promise<void> {
    expect(result.code).toBe(1);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  }

  it("rejects a named pipeline whose document does not exist", async () => {
    const h = await setup();
    const result = await run(h, [], { pipeline: "nope" });
    await expectClean(h, result);
    expect(result.err).toContain("No pipeline document exists at");
    expect(result.err).toContain(path.join("pipelines", "nope.json"));
  });

  it("rejects a bare filename reference with both legal alternatives", async () => {
    const h = await setup();
    const result = await run(h, [], { pipeline: "standard.json" });
    await expectClean(h, result);
    expect(result.err).toContain('Use "standard"');
    expect(result.err).toContain('"./standard.json"');
  });

  it("rejects a structurally invalid pipeline document", async () => {
    const h = await setup({
      pipeline: { schemaVersion: 1, name: "standard", stages: [] },
    });
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain("schemaVersion must be 0.");
  });

  it("rejects a named profile whose document does not exist", async () => {
    const h = await setup();
    const result = await run(h, [], { profile: "nope" });
    await expectClean(h, result);
    expect(result.err).toContain("No execution profile document exists at");
  });

  it("rejects an unresolvable thread", async () => {
    const h = await setup();
    const result = await run(h, [], { thread: "no-such-thread" });
    await expectClean(h, result);
  });

  it("refuses a selected stage that no source binds, naming that stage", async () => {
    const h = await setup({
      settings: settingsFor(STANDARD_STAGE_IDS.slice(1)),
    });
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain('Stage "spec" has no execution binding');
  });

  it("rejects an invalid settings document", async () => {
    const h = await setup({ settings: { afk: { defaults: {} } } });
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain("afk.defaults");
  });

  it("refuses an impossible composition before allocation", async () => {
    const h = await setup({
      pipeline: pipelineDocument(["plan-brief", "implement-plan"]),
      settings: settingsFor(["plan-brief", "implement-plan"]),
    });
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain('Stage "implement-plan" (selected position 2)');
    expect(result.err).toContain('plan state "strict"');
    expect(result.err).toContain('"plan-brief" (position 1) promises plan state "brief"');
  });

  it("refuses an unknown --from stage before allocation, naming it", async () => {
    const h = await setup();
    const result = await run(h, [], { from: "implement" });
    await expectClean(h, result);
    expect(result.err).toContain('Stage "implement" is not in pipeline "standard"');
  });

  it("refuses a --from entry point the thread cannot satisfy", async () => {
    const h = await setup();
    const result = await run(h, [], { from: "plan-strict" });
    await expectClean(h, result);
    expect(result.err).toContain('Stage "plan-strict" (selected position 1)');
    expect(result.err).toContain("No earlier stage is selected");
  });

  it("rejects when a selected harness executable is unavailable", async () => {
    const h = await setup();
    const result = await run(h, [], { probe: failingProbe });
    await expectClean(h, result);
    expect(result.err).toContain("not found on PATH");
  });

  it("rejects a dirty worktree", async () => {
    const h = await setup();
    await fs.writeFile(path.join(h.fixture.root, "stray.txt"), "dirty\n", "utf8");
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain("not clean");
  });

  it("rejects a thread with a non-empty pending queue", async () => {
    const h = await setup();
    await dropPendingDecision(h.fixture, "d1.md");
    const result = await run(h, []);
    await expectClean(h, result);
  });

  it("rejects when a pending queue cannot be scanned", async () => {
    const h = await setup();
    // A committed regular file where the queue directory is expected makes the
    // scan's readdir fail with ENOTDIR while keeping the worktree clean.
    await fs.writeFile(
      path.join(h.fixture.threadPath as string, ".pending-decisions"),
      "not a directory",
      "utf8",
    );
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: block queue"]);
    const result = await run(h, []);
    await expectClean(h, result);
  });

  it("refuses when an unfinished run already exists for the same thread (AC-7.1, DR55)", async () => {
    const h = await setup();
    // First run pauses (BLOCKED) leaving a waiting checkpoint and no changes.
    const first = await run(h, [
      { outcome: { kind: "completed", finalText: "Outcome: BLOCKED" } },
    ]);
    expect(first.code).toBe(2);
    const existingId = (await runDirNames(h.stateRoot))[0]!;

    const second = await run(h, standardSteps(h.fixture));
    expect(second.code).toBe(1);
    expect(second.err).toContain(existingId);
    expect(second.err).toContain("antmay afk resume");
    // Still exactly the one paused run; the second created nothing.
    expect(await runDirNames(h.stateRoot)).toEqual([existingId]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("exits 1 on lock contention, printing the lock metadata and path", async () => {
    const h = await setup();
    const outcome = await acquireWorkspaceLock(
      h.stateRoot,
      h.fixture.root,
      "holder-run",
      new Date(),
    );
    if (!outcome.ok) throw new Error("expected to acquire the lock");
    heldLocks.push(outcome.handle);

    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(1);
    expect(result.err).toContain("already locked");
    expect(result.err).toContain(outcome.handle.lockPath);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    // Only the pre-acquired lock remains; the command never held its own.
    expect(await lockNames(h.stateRoot)).toHaveLength(1);
  });
});

describe.concurrent("runCommand — allocation races (AC-7.4, AC-7.5)", () => {
  it("re-checks the queues under the lock and creates nothing when one fills mid-allocation", async () => {
    const h = await setup();
    // generateId runs after the initial preflight scan but before lock
    // acquisition and the under-lock recheck: dropping a pending file here
    // exercises the locked recheck race.
    const result = await run(h, standardSteps(h.fixture), {
      generateId: () => {
        void dropPendingDecisionSync(h.fixture, "race.md");
        return "queuerace-000000000000";
      },
    });
    expect(result.code).toBe(1);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("releases the first lock and regenerates on an ID collision (AC-7.5)", async () => {
    const h = await setup();
    // Pre-create the colliding run directory so createRunDirectory reports a
    // collision on the first candidate.
    await createRunDirectory(h.stateRoot, "collide-000000000000");

    let call = 0;
    const result = await run(h, standardSteps(h.fixture), {
      generateId: () => (call++ === 0 ? "collide-000000000000" : "fresh-111111111111"),
    });

    expect(result.code).toBe(0);
    const runDir = path.join(runsDirectory(h.stateRoot), "fresh-111111111111");
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) expect(cp.checkpoint.runId).toBe("fresh-111111111111");
    // The pre-created colliding directory holds no checkpoint of its own.
    const collide = await readCheckpoint(
      path.join(runsDirectory(h.stateRoot), "collide-000000000000"),
    );
    expect(collide.ok).toBe(false);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

describe.concurrent("runCommand — artifact drift after preflight (AC-7.1)", () => {
  it("pauses the stage without a harness call when its prerequisite disappears after composition", async () => {
    const h = await setup({
      pipeline: pipelineDocument(["reconcile-spec"]),
      settings: settingsFor(["reconcile-spec"]),
    });
    const specPath = path.join(h.fixture.threadPath as string, "spec.md");
    await fs.writeFile(specPath, "# Spec\n", "utf8");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "docs: spec"]);

    // `generateId` runs after composition simulated the thread's state and
    // before the runner re-inspects it, which is the drift window.
    const result = await run(h, [{}], {
      generateId: () => {
        rmSync(specPath);
        return "artifactdrift-0000";
      },
    });

    expect(result.code).toBe(2);
    expect(result.invoker.calls.length).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.condition).toBe("waiting-for-user");
    expect(cp.checkpoint.stageIndex).toBe(0);
    expect(cp.checkpoint.attempts).toEqual([]);
    expect(cp.checkpoint.waiting?.reasons[0].kind).toBe("stage-prerequisite-unmet");
    expect(cp.checkpoint.waiting?.reasons[0].contract).toEqual([
      { dimension: "spec", expected: true, observed: false },
    ]);
  });
});

describe.concurrent("runCommand — non-blocking and pause behavior (AC-7.6, AC-1.3)", () => {
  it("warns about a corrupt sibling checkpoint without blocking creation (AC-7.6)", async () => {
    const h = await setup();
    const corrupt = await createRunDirectory(h.stateRoot, "corrupt-run-000000");
    if (corrupt.kind === "created") {
      await fs.writeFile(path.join(corrupt.runDir, "state.json"), "{ not json", "utf8");
    }
    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    expect(result.err).toContain("warning");
    expect(result.err).toContain("unreadable");
    // The new run was created alongside the corrupt sibling.
    expect((await runDirNames(h.stateRoot)).length).toBe(2);
  });

  it("exits 2 on a durable pause and prints the exact resume command", async () => {
    const h = await setup();
    const result = await run(h, [
      { outcome: { kind: "completed", finalText: "Outcome: BLOCKED — needs a human" } },
    ]);
    expect(result.code).toBe(2);
    const runId = (await runDirNames(h.stateRoot))[0]!;
    expect(result.out).toContain(`antmay afk resume ${runId}`);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

describe.concurrent("runCommand — signal interruption (AC-17.1, AC-17.2)", () => {
  it("returns the signal exit code and creates no run when interrupted before allocation", async () => {
    const h = await setup();
    const result = await run(h, standardSteps(h.fixture), {
      installSignals: fakeSignals(() => "SIGINT"),
    });
    expect(result.code).toBe(EXIT_SIGINT);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("maps an active interruption to the signal exit code, not the durable-pause code", async () => {
    const h = await setup();
    const controller = new AbortController();
    const result = await run(
      h,
      [{ before: () => controller.abort(new SignalInterruption("SIGINT")), hangUntilAbort: true }],
      {
        createAbortController: () => controller,
        installSignals: fakeSignals(() => null),
      },
    );

    expect(result.code).toBe(EXIT_SIGINT);
    expect(result.code).not.toBe(2);
    const runDir = await soleCheckpointDir(h.stateRoot);
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.condition).toBe("waiting-for-user");
      expect(cp.checkpoint.waiting?.reasons[0].kind).toBe("interrupted");
    }
    // The lock is released before the command returns the signal exit code.
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

/** Synchronous pending-file drop for the generateId hook so the file is on disk
 * before the under-lock queue recheck runs. */
function dropPendingDecisionSync(fixture: RepoFixture, name: string): void {
  const dir = path.join(fixture.threadPath as string, ".pending-decisions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), "open decision", "utf8");
}

/** Happy-path scripted scenario for the fixture's `standard` selection. */
function standardScriptedScenario(
  overrides: Partial<Record<string, string[]>> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 0,
    stages: {
      spec: ["spec-correct"],
      "reconcile-spec": ["reconcile-spec-correct"],
      "review-spec": ["outcome-done"],
      "plan-strict": ["plan-strict-correct"],
      "reconcile-plan": ["reconcile-plan-correct"],
      "implement-plan-with-subagents": ["implement-plan-with-subagents-correct"],
      ...overrides,
    },
  };
}

async function writeScriptedScenario(
  configRoot: string,
  scenario: Record<string, unknown> = standardScriptedScenario(),
): Promise<string> {
  const scenarioPath = path.join(configRoot, SCRIPTED_SCENARIO_FILENAME);
  await fs.writeFile(scenarioPath, JSON.stringify(scenario, null, 2), "utf8");
  return scenarioPath;
}

function scriptedEnv(h: Harness): NodeJS.ProcessEnv {
  return {
    ANTMAY_CONFIG_HOME: h.configRoot,
    ANTMAY_STATE_HOME: h.stateRoot,
    NO_COLOR: "1",
    [SCRIPTED_HARNESS_TOGGLE_VAR]: "1",
  };
}

describe.concurrent("runCommand — scripted harness mode (FR-1, FR-5, FR-6)", () => {
  it("rejects a non-exact toggle before allocation", async () => {
    const h = await setup();
    const result = await run(h, [], {
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "true" },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_HARNESS_TOGGLE_VAR);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
  });

  it("rejects a missing scenario file before allocation", async () => {
    const h = await setup();
    const result = await run(h, [], { env: scriptedEnv(h) });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_SCENARIO_FILENAME);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
  });

  it("marks the initial checkpoint, prints startup output, and uses scripted seams", async () => {
    const h = await setup({
      afk: {
        defaults: {
          harness: "codex",
          model: "test-model",
          prompt: "Prefer small changes.\nCheck tests.",
        },
      },
    });
    const scenarioPath = await writeScriptedScenario(h.configRoot);
    const result = await run(h, [], {
      env: scriptedEnv(h),
    });
    expect(result.code).toBe(0);
    expect(result.out).toContain("[DEV] Scripted harness");
    expect(result.out).toContain(scenarioPath);
    // The scripted note precedes the otherwise-unchanged startup output.
    expect(result.out.indexOf("[DEV] Scripted harness")).toBeLessThan(
      result.out.indexOf("Run details"),
    );
    expect(result.out.match(/\[DEV\] Resolved prompt/g)).toHaveLength(6);
    const firstStage = result.out.indexOf("Stage 1/6 · spec");
    const firstPrompt = result.out.indexOf("[DEV] Resolved prompt");
    const firstPromptBody = result.out.indexOf("[DEV] $spec `");
    const firstTranscript = result.out.indexOf("│ Writing spec.md.");
    expect(firstStage).toBeLessThan(firstPrompt);
    expect(firstPrompt).toBeLessThan(firstPromptBody);
    expect(firstPromptBody).toBeLessThan(firstTranscript);
    expect(result.out).toContain(
      `[DEV] $spec \`${h.fixture.threadRelPath}/\`. Prefer small changes.\n` +
        "[DEV] Check tests.",
    );

    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.startedScripted).toBe(true);
      expect(cp.checkpoint.condition).toBe("completed");
      expect(cp.checkpoint.observedHarnessVersions.codex).toContain("scripted-harness");
    }
    const folder = h.fixture.threadFolder as string;
    const subjects = await commitSubjects(h.fixture);
    expect(subjects).toContain(`docs(${folder}): spec`);
    expect(subjects).toContain(`docs(${folder}): plan`);
    expect(subjects).toContain(`docs(${folder}): implementation report`);
  });

  it("rejects a bare outcome-done that leaves the promised spec absent (AC-7.2, AC-7.3)", async () => {
    const h = await setup();
    await writeScriptedScenario(
      h.configRoot,
      standardScriptedScenario({ spec: ["outcome-done"] }),
    );
    const result = await run(h, [], { env: scriptedEnv(h) });
    expect(result.code).toBe(2);
    const runDir = await soleCheckpointDir(h.stateRoot);
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      // The promised state is checked before the boundary is looked at, so the
      // pause names the missing artifact rather than the empty diff.
      expect(cp.checkpoint.waiting?.reasons[0].kind).toBe("stage-contract-violation");
      expect(cp.checkpoint.waiting?.reasons[0].contract).toEqual([
        { dimension: "spec", expected: true, observed: false },
      ]);
      expect(cp.checkpoint.stageIndex).toBe(0);
    }
  });

  it("pauses when the implement stage reaches DONE without leaving a report", async () => {
    const h = await setup();
    await writeScriptedScenario(
      h.configRoot,
      standardScriptedScenario({
        "implement-plan-with-subagents": ["outcome-done"],
      }),
    );
    const result = await run(h, [], { env: scriptedEnv(h) });
    expect(result.code).toBe(2);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.stageIndex).toBe(5);
      expect(cp.checkpoint.waiting?.reasons[0].kind).toBe("stage-contract-violation");
      expect(cp.checkpoint.waiting?.reasons[0].contract).toEqual([
        { dimension: "implementationReport", expected: true, observed: false },
      ]);
    }
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).not.toContain(
      `docs(${folder}): implementation report`,
    );
  });

  it("leaves real mode unchanged when the toggle is unset", async () => {
    const h = await setup();
    let probeHarnesses: HarnessId[] = [];
    const trackingProbe: RunDeps["probe"] = async (harnesses, repoRoot) => {
      probeHarnesses = [...harnesses];
      return okProbe(harnesses, repoRoot);
    };
    const result = await run(h, standardSteps(h.fixture), { probe: trackingProbe });
    expect(result.code).toBe(0);
    expect(probeHarnesses.length).toBeGreaterThan(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.startedScripted).toBeUndefined();
    }
    expect(result.out).not.toContain("[DEV] Resolved prompt");
  });

  it("validates the scenario against the selected suffix only", async () => {
    const h = await setup();
    await writeThreadFile(h.fixture, "spec.md", "# Spec\n");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "docs: spec"]);
    // A scenario covering every document stage now over-covers the suffix.
    await writeScriptedScenario(h.configRoot);

    const overCovered = await run(h, [], {
      env: scriptedEnv(h),
      from: "plan-strict",
    });
    expect(overCovered.code).toBe(1);
    expect(overCovered.err).toContain("stages.spec is not an expected stage id.");
    expect(await runDirNames(h.stateRoot)).toEqual([]);

    await writeScriptedScenario(h.configRoot, {
      schemaVersion: 0,
      stages: {
        "plan-strict": ["plan-strict-correct"],
        "reconcile-plan": ["reconcile-plan-correct"],
        "implement-plan-with-subagents": [
          "implement-plan-with-subagents-correct",
        ],
      },
    });
    const suffixOnly = await run(h, [], {
      env: scriptedEnv(h),
      from: "plan-strict",
    });
    expect(suffixOnly.code).toBe(0);
  });
});
