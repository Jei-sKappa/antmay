import { mkdirSync, promises as fs, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";

import { expect } from "vitest";

import type { ProbeResult } from "../harness/backends/probe.js";
import type { HarnessId } from "../harness/id.js";
import type {
  HarnessExecutableProbe,
  HarnessRuntimeLoader,
} from "../harness/runtime.js";
import { createScriptedInvoker } from "../harness/scripted/invoker.js";
import { probeScriptedHarnessExecutables } from "../harness/scripted/probe.js";
import type { HarnessInvoker } from "../harness/types.js";
import {
  SCRIPTED_SCENARIO_FILENAME,
  loadScriptedScenario,
} from "../harness/scripted/scenario.js";
import { SCRIPTED_HARNESS_TOGGLE_VAR } from "../harness/scripted/toggle.js";
import {
  EXIT_SIGHUP,
  EXIT_SIGINT,
  EXIT_SIGTERM,
} from "../cli/exit-codes.js";
import type { installSignalHandlers } from "../runner/signals.js";
import { locksDirectory } from "../state/lock.js";
import { readCheckpoint } from "../state/checkpoint/read.js";
import { runsDirectory } from "../state/runs.js";
import {
  createFakeHarness,
  type FakeHarness,
  type FakeHarnessStep,
} from "./fake-harness.js";
import { createRepoFixture, type RepoFixture } from "./git-fixture.js";
import { tempDir } from "./temp-root.js";
import { runCommand } from "../commands/run.js";
import type { RunDeps } from "../commands/run/types.js";

/**
 * The fixtures, helpers, and command driver the `runCommand` suites share.
 *
 * `run` is tested across several files so their cases run on separate workers,
 * and every one of them needs the same repository, config root, state root,
 * documents, and driver. Those live here so a case reads as the behavior it is
 * about; the files themselves declare only the module mocks they individually
 * need, because a mock is hoisted per test file.
 */

/** An in-memory writable stream that accumulates everything written to it. */
export class Capture extends Writable {
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
 * A stream that fails every write the way a closed pipe does. `write` itself
 * throws, which is what a caller reading the stream through the display's `emit`
 * sees; a `_write` failure would be stream machinery and surface as an event.
 */
export class ClosedPipe extends Capture {
  override write(): never {
    throw Object.assign(new Error("write EPIPE"), { code: "EPIPE" });
  }
}

export { tempDir };

/** The stage IDs the fixture's `standard` pipeline document selects, in order. */
export const STANDARD_STAGE_IDS = [
  "spec",
  "reconcile-spec",
  "review-spec",
  "plan-strict",
  "reconcile-plan",
  "implement-plan-with-subagents",
] as const;

/**
 * The selection a case gets unless it names another: the Standard prefix
 * through `review-spec`.
 *
 * It carries all three stage shapes an allocation and a run are judged against
 * — an advancing stage whose boundary must commit, a rerun stage whose boundary
 * may, and a rerun stage whose boundary must not — over a real prerequisite
 * chain, since both later stages require the spec the first one promises.
 * Selecting the whole Standard set instead would drive three more stage
 * boundaries through real `git` for no property a case here asserts, and
 * boundaries are what this suite's runtime is made of. A case about the whole
 * Standard sequence, about a `--from` suffix, or about a stage past
 * `review-spec` names the selection explicitly.
 */
export const DEFAULT_STAGE_IDS = STANDARD_STAGE_IDS.slice(0, 3);

/** A pipeline document selecting `stages` under the declared name `standard`. */
export function pipelineDocument(
  stages: readonly (string | { stage: string; instructions: string })[] =
    DEFAULT_STAGE_IDS,
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
export function settingsFor(
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

export const SIGNAL_EXIT: Record<string, number> = {
  SIGINT: EXIT_SIGINT,
  SIGTERM: EXIT_SIGTERM,
  SIGHUP: EXIT_SIGHUP,
};

/**
 * A `installSignalHandlers`-shaped fake that never touches `process`: `signaled`
 * returns whatever the supplied getter reports and `exitCodeFor` maps by the
 * conventional codes. The default getter reports no signal.
 */
export function fakeSignals(
  signaled: () => NodeJS.Signals | null = () => null,
): typeof installSignalHandlers {
  return () => ({
    signaled,
    exitCodeFor: (sig) => SIGNAL_EXIT[sig] ?? EXIT_SIGINT,
    uninstall: () => undefined,
  });
}

/** Harness probe fake that reports a distinctive version for every request. */
export const okProbe: HarnessExecutableProbe = async (harnesses): Promise<ProbeResult> => {
  const versions: Partial<Record<HarnessId, string>> = {};
  for (const h of harnesses) versions[h] = `${h} 99.9.9`;
  return { ok: true, versions };
};

/** Harness probe fake that fails for every requested harness. */
export const failingProbe: HarnessExecutableProbe = async (harnesses): Promise<ProbeResult> => ({
  ok: false,
  failures: harnesses.map((h) => ({
    harness: h,
    binary: h === "codex" ? "codex" : "claude",
    reason: "executable not found on PATH",
  })),
});

/**
 * The one lazy runtime seam the command reads its adapters through. The real
 * family hands back the case-driven fake harness under test with whichever probe
 * the case injected; the scripted family is the genuine developer adapter, so a
 * scripted case exercises the same invoker, catalog, probe, and scenario reader
 * production loads.
 */
export function testRuntimeLoader(
  invoker: HarnessInvoker,
  probe: HarnessExecutableProbe,
): HarnessRuntimeLoader {
  return {
    real: async () => ({ createInvoker: () => invoker, probe }),
    scripted: async () => ({
      createInvoker: createScriptedInvoker,
      probe: probeScriptedHarnessExecutables,
      loadScenario: loadScriptedScenario,
    }),
  };
}

export type Harness = {
  configRoot: string;
  stateRoot: string;
  fixture: RepoFixture;
  /** The stage IDs this harness's `standard` pipeline selects, in order. */
  stages: readonly string[];
};

/**
 * A repository, config root, and state root for one case. `settings` and
 * `pipeline` are written unless explicitly `null`, which is how a case exercises
 * a missing settings file or a missing pipeline document.
 */
export async function setup(
  options: {
    settings?: unknown;
    pipeline?: unknown;
    profile?: unknown;
    profileName?: string;
    stages?: readonly string[];
  } = {},
): Promise<Harness> {
  const fixture = await createRepoFixture({ thread: {} });
  const configRoot = await tempDir("antmay-cfg-");
  const stateRoot = await tempDir("antmay-state-");
  const stages = options.stages ?? DEFAULT_STAGE_IDS;
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
    "pipeline" in options ? options.pipeline : pipelineDocument(stages);
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
  return { configRoot, stateRoot, fixture, stages };
}

/** Write one config-root document, creating its role directory. */
export async function writeConfigDocument(
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

export type RunResult = {
  code: number;
  out: string;
  err: string;
  invoker: FakeHarness;
};

export async function run(
  h: Harness,
  steps: FakeHarnessStep[],
  overrides: Partial<{
    pipeline: string;
    thread: string;
    from: string;
    profile: string;
    dangerouslySkipPermissions: boolean;
    env: NodeJS.ProcessEnv;
    probe: HarnessExecutableProbe;
    generateId: () => string;
    writeInitialCheckpoint: RunDeps["writeInitialCheckpoint"];
    createAbortController: () => AbortController;
    installSignals: RunDeps["installSignals"];
    stdout: Capture;
  }> = {},
): Promise<RunResult> {
  const out = overrides.stdout ?? new Capture();
  const err = new Capture();
  const invoker = createFakeHarness(steps);
  const deps: RunDeps = {
    env: {
      ANTMAY_CONFIG_HOME: h.configRoot,
      ANTMAY_STATE_HOME: h.stateRoot,
      ...overrides.env,
    },
    cwd: h.fixture.root,
    homedir: os.homedir(),
    harnessRuntime: testRuntimeLoader(invoker, overrides.probe ?? okProbe),
    stdout: out,
    stderr: err,
    color: false,
    ...(overrides.createAbortController !== undefined
      ? { createAbortController: overrides.createAbortController }
      : {}),
    // Default to a no-op installer so tests never register real process handlers.
    installSignals: overrides.installSignals ?? fakeSignals(),
    ...(overrides.generateId !== undefined
      ? { generateId: overrides.generateId }
      : {}),
    ...(overrides.writeInitialCheckpoint !== undefined
      ? { writeInitialCheckpoint: overrides.writeInitialCheckpoint }
      : {}),
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

export async function runDirNames(stateRoot: string): Promise<string[]> {
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

export async function lockNames(stateRoot: string): Promise<string[]> {
  try {
    return await fs.readdir(locksDirectory(stateRoot));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function writeThreadFile(
  fixture: RepoFixture,
  relative: string,
  content: string,
): Promise<void> {
  const target = path.join(fixture.threadPath as string, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

export async function dropPendingDecision(
  fixture: RepoFixture,
  name: string,
): Promise<void> {
  const dir = path.join(fixture.threadPath as string, ".pending-decisions");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), "open decision", "utf8");
}

/**
 * Break the thread's temporary workspaces on both counts at once: two of them
 * lose their ignore rule, and the third — still ignored — gains force-added
 * tracked content. Rewriting `.gitignore` also leaves the worktree dirty, which
 * is what makes the refusal's precedence over the clean-worktree gate visible.
 */
export async function makeWorkspacesUnsafe(fixture: RepoFixture): Promise<void> {
  await fs.writeFile(
    path.join(fixture.root, ".gitignore"),
    ".implementation-runs/\n",
    "utf8",
  );
  const runs = path.join(fixture.threadPath as string, ".implementation-runs");
  await fs.mkdir(runs, { recursive: true });
  await fs.writeFile(path.join(runs, "leftover.md"), "x", "utf8");
  await fixture.git([
    "add",
    "-f",
    "--",
    `${fixture.threadRelPath as string}/.implementation-runs`,
  ]);
}

export async function commitSubjects(fixture: RepoFixture): Promise<string[]> {
  const result = await fixture.git(["log", "--pretty=%s"]);
  return result.stdout.trim().split("\n");
}

export async function soleCheckpointDir(stateRoot: string): Promise<string> {
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
 * What each Standard stage's attempt does to the worktree: the two authoring
 * stages (spec, plan-strict), the first reconciliation stage, and the
 * implementation stage change their boundary; review-spec and reconcile-plan
 * change nothing.
 *
 * Every step leaves the artifact state its catalog stage promises, because a
 * DONE that does not is a contract violation rather than a finished stage —
 * which is why `plan-strict` writes an index *and* a task file.
 */
const STAGE_STEPS: Record<string, (f: RepoFixture) => FakeHarnessStep> = {
  spec: (f) => ({ before: () => writeThreadFile(f, "spec.md", "# Spec\n") }),
  "reconcile-spec": (f) => ({
    before: () => writeThreadFile(f, "spec.md", "# Spec v2\n"),
  }),
  "review-spec": () => ({}),
  "plan-strict": (f) => ({
    before: async () => {
      await writeThreadFile(f, "plan.md", "# Plan\n");
      await writeThreadFile(f, "plan-tasks/01-task.md", "# Task 01\n");
    },
  }),
  "reconcile-plan": () => ({}),
  "implement-plan-with-subagents": (f) => ({
    before: () => writeThreadFile(f, "implementation-report.md", "# Report\n"),
  }),
};

/**
 * The scripted attempt for each stage the harness selected, in selection order.
 *
 * Keying by stage id rather than by position is what keeps a step tied to the
 * stage it belongs to: the fake harness consumes the array by invocation
 * ordinal, so a positional script silently changes meaning the moment a case
 * selects a different prefix.
 */
export function standardSteps(h: Harness): FakeHarnessStep[] {
  return h.stages.map((id) => STAGE_STEPS[id]!(h.fixture));
}

/** Synchronous pending-file drop for the generateId hook so the file is on disk
 * before the under-lock queue recheck runs. */
export function dropPendingDecisionSync(fixture: RepoFixture, name: string): void {
  const dir = path.join(fixture.threadPath as string, ".pending-decisions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), "open decision", "utf8");
}

/** The case each Standard stage runs when a scenario does not override it. */
export const SCRIPTED_STAGE_CASES: Record<string, string[]> = {
  spec: ["spec-correct"],
  "reconcile-spec": ["reconcile-spec-correct"],
  "review-spec": ["outcome-done"],
  "plan-strict": ["plan-strict-correct"],
  "reconcile-plan": ["reconcile-plan-correct"],
  "implement-plan-with-subagents": ["implement-plan-with-subagents-correct"],
};

/**
 * A happy-path scripted document for `stages`. The executor validates a
 * scenario against exactly the stage IDs the run selects, so the document is
 * keyed off the harness's own selection rather than off the whole Standard set.
 */
export function standardScriptedScenario(
  overrides: Partial<Record<string, string[]>> = {},
  stages: readonly string[] = DEFAULT_STAGE_IDS,
): Record<string, unknown> {
  return {
    schemaVersion: 0,
    stages: {
      ...Object.fromEntries(
        stages.map((stage) => [stage, SCRIPTED_STAGE_CASES[stage]]),
      ),
      ...overrides,
    },
  };
}

export async function writeScriptedScenario(
  h: Harness,
  scenario: Record<string, unknown> = standardScriptedScenario({}, h.stages),
): Promise<string> {
  const scenarioPath = path.join(h.configRoot, SCRIPTED_SCENARIO_FILENAME);
  await fs.writeFile(scenarioPath, JSON.stringify(scenario, null, 2), "utf8");
  return scenarioPath;
}

export function scriptedEnv(h: Harness): NodeJS.ProcessEnv {
  return {
    ANTMAY_CONFIG_HOME: h.configRoot,
    ANTMAY_STATE_HOME: h.stateRoot,
    [SCRIPTED_HARNESS_TOGGLE_VAR]: "1",
  };
}
