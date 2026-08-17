import { mkdirSync, promises as fs, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";

import { expect } from "vitest";

import { EXIT_SIGINT } from "../cli/exit-codes.js";
import type { ProbeResult } from "../harness/adapters/real/probe.js";
import type { HarnessId } from "../harness/id.js";
import type {
  HarnessExecutableProbe,
  HarnessRuntimeLoader,
} from "../harness/runtime.js";
import { createSimulatedInvoker } from "../harness/adapters/simulated/invoker.js";
import { probeSimulatedHarnessExecutables } from "../harness/adapters/simulated/probe.js";
import type { HarnessInvoker } from "../harness/types.js";
import {
  SIMULATED_SCENARIO_FILENAME,
  loadSimulatedScenario,
} from "../harness/adapters/simulated/scenario.js";
import { SIMULATED_HARNESS_TOGGLE_VAR } from "../harness/adapters/simulated/toggle.js";
import type { installSignalHandlers } from "../runner/signals.js";
import type { RunCheckpoint } from "../state/checkpoint/types.js";
import { locksDirectory } from "../state/lock.js";
import { readCheckpoint } from "../state/checkpoint/read.js";
import { runDirectoryFor, runsDirectory } from "../state/runs.js";
import {
  createFakeHarness,
  type FakeHarness,
  type FakeHarnessStep,
} from "./fake-harness.js";
import { createRepoFixture, type RepoFixture } from "./git-fixture.js";
import { tempDir } from "./temp-root.js";
import type { CommandDeps } from "../commands/deps.js";
import { resumeCommand } from "../commands/resume.js";
import { runCommand } from "../commands/run.js";
import type { RunDeps } from "../commands/run/types.js";

/**
 * The fixtures, helpers, and command drivers the `resumeCommand` suites share.
 *
 * `resume` is tested across several files, and every one of them needs the same
 * repository, config root, state root, pipeline document, and seeded run. Those
 * live here so a case reads as the behavior it is about, and what a case needs
 * to control it passes to `resume` as an override rather than mocking the module
 * underneath.
 */
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

export { tempDir };

/** The whole Standard selection, in order. */
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
 * A resume is judged against stage *shapes* rather than against any particular
 * skill, and this prefix carries all three — an advancing stage whose boundary
 * must commit, a rerun stage whose boundary may, and a rerun stage whose
 * boundary must not — over a real prerequisite chain, since both later stages
 * require the spec the first one promises. Selecting the whole Standard set
 * instead would drive three more stage boundaries through real `git` for no
 * property a case here asserts, and boundaries are what this suite's runtime is
 * made of. A case about the whole Standard sequence names it explicitly.
 */
export const DEFAULT_STAGE_IDS = STANDARD_STAGE_IDS.slice(0, 3);

/** A pipeline document selecting `stages` under the name `standard`. */
export function pipelineDocument(
  stages: readonly string[] = DEFAULT_STAGE_IDS,
): Record<string, unknown> {
  return {
    schemaVersion: 0,
    name: "standard",
    stages: stages.map((stage) => ({ stage })),
  };
}

/**
 * A settings document binding every Standard stage to one codex/test-model
 * agent, with `overrides` replacing whole bindings stage by stage.
 */
export function settingsFor(
  overrides: Record<string, unknown> = {},
  model = "test-model",
): Record<string, unknown> {
  return {
    afk: {
      stages: {
        ...Object.fromEntries(
          STANDARD_STAGE_IDS.map((stage) => [
            stage,
            { agent: { harness: "codex", model } },
          ]),
        ),
        ...overrides,
      },
    },
  };
}

export function fakeSignals(
  signaled: () => NodeJS.Signals | null = () => null,
): typeof installSignalHandlers {
  return () => ({
    signaled,
    exitCodeFor: () => EXIT_SIGINT,
    uninstall: () => undefined,
  });
}

export const okProbe: HarnessExecutableProbe = async (harnesses): Promise<ProbeResult> => {
  const versions: Partial<Record<HarnessId, string>> = {};
  for (const h of harnesses) versions[h] = `${h} 99.9.9`;
  return { ok: true, versions };
};

/**
 * The one lazy runtime seam the command reads its adapters through. The real
 * family hands back the case-driven fake harness under test with whichever probe
 * the case injected; the simulated family is the genuine developer adapter, so a
 * simulated case exercises the same invoker, catalog, probe, and scenario reader
 * production loads.
 */
export function testRuntimeLoader(
  invoker: HarnessInvoker,
  probe: HarnessExecutableProbe,
): HarnessRuntimeLoader {
  return {
    real: async () => ({ createInvoker: () => invoker, probe }),
    simulated: async () => ({
      createInvoker: createSimulatedInvoker,
      probe: probeSimulatedHarnessExecutables,
      loadScenario: loadSimulatedScenario,
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

export async function setup(
  settings: unknown = settingsFor(),
  stages: readonly string[] = DEFAULT_STAGE_IDS,
): Promise<Harness> {
  const fixture = await createRepoFixture({ thread: {} });
  const configRoot = await tempDir("antmay-cfg-");
  const stateRoot = await tempDir("antmay-state-");
  await fs.writeFile(
    path.join(configRoot, "settings.json"),
    JSON.stringify(settings, null, 2),
    "utf8",
  );
  await fs.mkdir(path.join(configRoot, "pipelines"), { recursive: true });
  await fs.writeFile(
    path.join(configRoot, "pipelines", "standard.json"),
    JSON.stringify(pipelineDocument(stages), null, 2),
    "utf8",
  );
  return { configRoot, stateRoot, fixture, stages };
}

export type CmdResult = { code: number; out: string; err: string; invoker: FakeHarness };

export function baseEnv(h: Harness): NodeJS.ProcessEnv {
  return {
    ANTMAY_CONFIG_HOME: h.configRoot,
    ANTMAY_STATE_HOME: h.stateRoot,
  };
}

export async function seed(
  h: Harness,
  steps: FakeHarnessStep[],
  overrides: Partial<{
    dangerouslySkipPermissions: boolean;
    profile: string;
    env: NodeJS.ProcessEnv;
    probe: HarnessExecutableProbe;
    installSignals: RunDeps["installSignals"];
    createAbortController: () => AbortController;
  }> = {},
): Promise<CmdResult> {
  const out = new Capture();
  const err = new Capture();
  const invoker = createFakeHarness(steps);
  const deps: RunDeps = {
    env: overrides.env ?? baseEnv(h),
    cwd: h.fixture.root,
    homedir: os.homedir(),
    harnessRuntime: testRuntimeLoader(invoker, overrides.probe ?? okProbe),
    stdout: out,
    stderr: err,
    color: false,
    installSignals: overrides.installSignals ?? fakeSignals(),
    ...(overrides.createAbortController !== undefined
      ? { createAbortController: overrides.createAbortController }
      : {}),
  };
  const code = await runCommand(
    {
      pipeline: "standard",
      thread: h.fixture.threadFolder as string,
      ...(overrides.profile !== undefined ? { profile: overrides.profile } : {}),
      dangerouslySkipPermissions: overrides.dangerouslySkipPermissions ?? false,
    },
    deps,
  );
  return { code, out: out.text, err: err.text, invoker };
}

export async function resume(
  h: Harness,
  runId: string,
  steps: FakeHarnessStep[],
  overrides: Partial<{
    env: NodeJS.ProcessEnv;
    probe: HarnessExecutableProbe;
    installSignals: CommandDeps["installSignals"];
    createAbortController: () => AbortController;
    runEngine: CommandDeps["runEngine"];
  }> = {},
): Promise<CmdResult> {
  const out = new Capture();
  const err = new Capture();
  const invoker = createFakeHarness(steps);
  const deps: CommandDeps = {
    env: overrides.env ?? baseEnv(h),
    cwd: h.fixture.root,
    homedir: os.homedir(),
    harnessRuntime: testRuntimeLoader(invoker, overrides.probe ?? okProbe),
    stdout: out,
    stderr: err,
    color: false,
    installSignals: overrides.installSignals ?? fakeSignals(),
    ...(overrides.createAbortController !== undefined
      ? { createAbortController: overrides.createAbortController }
      : {}),
    ...(overrides.runEngine !== undefined ? { runEngine: overrides.runEngine } : {}),
  };
  const code = await resumeCommand({ runId }, deps);
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

export async function soleRunId(h: Harness): Promise<string> {
  const names = await runDirNames(h.stateRoot);
  expect(names.length).toBe(1);
  return names[0]!;
}

export async function readCp(h: Harness, runId: string): Promise<RunCheckpoint> {
  const result = await readCheckpoint(runDirectoryFor(h.stateRoot, runId));
  if (!result.ok) throw new Error(`checkpoint unreadable: ${result.errors.join("; ")}`);
  return result.checkpoint;
}

export function attemptCountAt(cp: RunCheckpoint, stageIndex: number): number {
  return cp.attempts.filter((a) => a.stageIndex === stageIndex).length;
}

export async function commitSubjects(fixture: RepoFixture): Promise<string[]> {
  const result = await fixture.git(["log", "--pretty=%s"]);
  return result.stdout.trim().split("\n");
}

export async function headOf(fixture: RepoFixture): Promise<string> {
  const result = await fixture.git(["rev-parse", "HEAD"]);
  return result.stdout.trim();
}

export function writeThreadFileSync(fixture: RepoFixture, rel: string, content: string): void {
  writeFileSync(path.join(fixture.threadPath as string, rel), content, "utf8");
}
export function writePlanTaskSync(fixture: RepoFixture, name: string, content: string): void {
  const dir = path.join(fixture.threadPath as string, "plan-tasks");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), content, "utf8");
}
export function writeRootFileSync(fixture: RepoFixture, rel: string, content: string): void {
  writeFileSync(path.join(fixture.root, rel), content, "utf8");
}
export function dropPendingSync(fixture: RepoFixture, name: string): void {
  const dir = path.join(fixture.threadPath as string, ".pending-decisions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), "open decision", "utf8");
}
/**
 * Break the thread's temporary workspaces on both counts at once: two of them
 * lose their ignore rule, and the third — still ignored — gains force-added
 * tracked content. Rewriting `.gitignore` also leaves the worktree dirty, which
 * is what makes the refusal's precedence over the clean-worktree rule visible.
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

export async function removePending(fixture: RepoFixture, name: string): Promise<void> {
  await fs.rm(path.join(fixture.threadPath as string, ".pending-decisions", name), {
    force: true,
  });
}

/**
 * Make one queue's scan fail with `ENOTDIR` by putting a regular file where its
 * directory is expected. The file has to be both untracked and ignored: Git
 * tracking anything at a temporary-workspace path is refused before the scan is
 * reached, and an unignored file would leave the worktree dirty.
 */
export async function blockQueueScan(
  fixture: RepoFixture,
  queueName: ".pending-decisions" | ".pending-reviews",
): Promise<void> {
  await fs.appendFile(
    path.join(fixture.root, ".gitignore"),
    `${queueName}\n`,
    "utf8",
  );
  await fixture.git(["add", "--", ".gitignore"]);
  await fixture.git(["commit", "-m", "chore: ignore the queue path itself"]);
  await fs.writeFile(
    path.join(fixture.threadPath as string, queueName),
    "not a directory",
    "utf8",
  );
}

/**
 * What each Standard stage's attempt does to the worktree. Each step leaves the
 * artifact state its catalog stage promises, so `plan-strict` writes an index
 * *and* a task file: a DONE that leaves less is a contract violation rather
 * than a finished stage.
 */
const STAGE_STEPS: Record<string, (f: RepoFixture) => FakeHarnessStep> = {
  spec: (f) => ({ before: () => writeThreadFileSync(f, "spec.md", "# Spec\n") }),
  "reconcile-spec": (f) => ({
    before: () => writeThreadFileSync(f, "spec.md", "# Spec v2\n"),
  }),
  "review-spec": () => ({}),
  "plan-strict": (f) => ({
    before: () => {
      writeThreadFileSync(f, "plan.md", "# Plan\n");
      writePlanTaskSync(f, "01-task.md", "# Task 01\n");
    },
  }),
  "reconcile-plan": () => ({}),
  "implement-plan-with-subagents": (f) => ({
    before: () =>
      writeThreadFileSync(f, "implementation-report.md", "# Report\n"),
  }),
};

/**
 * The simulated attempt for each stage the harness selected, in selection order;
 * a resume from stage k slices from k.
 *
 * Keying by stage id rather than by position is what keeps a step tied to the
 * stage it belongs to: the fake harness consumes the array by invocation
 * ordinal, so a positional script silently changes meaning the moment a case
 * selects a different prefix.
 */
export function standardSteps(h: Harness): FakeHarnessStep[] {
  return h.stages.map((id) => STAGE_STEPS[id]!(h.fixture));
}

export const DONE = { kind: "completed", finalText: "Outcome: DONE" } as const;
export const BLOCKED = { kind: "completed", finalText: "Outcome: BLOCKED — needs a human" } as const;

/** The case each Standard stage runs when a scenario does not override it. */
export const SIMULATED_STAGE_CASES: Record<string, string[]> = {
  spec: ["spec-correct"],
  "reconcile-spec": ["reconcile-spec-correct"],
  "review-spec": ["outcome-done"],
  "plan-strict": ["plan-strict-correct"],
  "reconcile-plan": ["reconcile-plan-correct"],
  "implement-plan-with-subagents": ["implement-plan-with-subagents-correct"],
};

/**
 * A simulated document for `stages`. The executor validates a scenario against
 * exactly the stage IDs the run selects, so the document is keyed off the
 * harness's own selection rather than off the whole Standard set.
 */
export function standardSimulatedScenario(
  overrides: Partial<Record<string, string[]>> = {},
  stages: readonly string[] = DEFAULT_STAGE_IDS,
): Record<string, unknown> {
  return {
    schemaVersion: 0,
    stages: {
      ...Object.fromEntries(
        stages.map((stage) => [stage, SIMULATED_STAGE_CASES[stage]]),
      ),
      ...overrides,
    },
  };
}

export async function writeSimulatedScenario(
  h: Harness,
  scenario: Record<string, unknown> = standardSimulatedScenario({}, h.stages),
): Promise<string> {
  const scenarioPath = path.join(h.configRoot, SIMULATED_SCENARIO_FILENAME);
  await fs.writeFile(scenarioPath, JSON.stringify(scenario, null, 2), "utf8");
  return scenarioPath;
}

export function simulatedEnv(h: Harness): NodeJS.ProcessEnv {
  return {
    ...baseEnv(h),
    [SIMULATED_HARNESS_TOGGLE_VAR]: "1",
  };
}

export async function seedSimulatedBlocked(
  h: Harness,
  scenario: Record<string, unknown> = standardSimulatedScenario({
    spec: ["outcome-blocked", "spec-correct"],
  }),
): Promise<string> {
  await writeSimulatedScenario(h, scenario);
  const seeded = await seed(h, [], { env: simulatedEnv(h) });
  expect(seeded.code).toBe(2);
  return soleRunId(h);
}

