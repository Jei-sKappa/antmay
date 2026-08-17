import { resolveRoots } from "../../../config/roots.js";
import type {
  HarnessRuntimeFailure,
  HarnessRuntimeLoader,
} from "../../../harness/runtime.js";
import { resolveHarnessRuntime } from "../../../harness/runtime.js";
import type { HarnessInvoker } from "../../../harness/types.js";
import type { RunCheckpoint } from "../../../state/checkpoint/types.js";

/**
 * Resolved harness runtime for a resume: invoker, optional scenario path, and
 * the process-local version map merged from the checkpoint's retained
 * observations and the fresh current-harness probe — without mutating the
 * checkpoint.
 */
export type ResumeResolvedRuntime = {
  invoker: HarnessInvoker;
  harnessVersions: Record<string, string>;
  scenarioPath?: string;
};

/**
 * Runtime resolution for a resume: the prepared facts, or the structured
 * harness-runtime failure the command renders.
 */
export type ResumeRuntimeResult =
  | ({ ok: true } & ResumeResolvedRuntime)
  | { ok: false; failure: HarnessRuntimeFailure };

/**
 * Enforce the checkpoint's immutable runtime, probe only the current stage's
 * harness, resolve config only through the lazy simulated path, and return the
 * invoker, optional scenario path, and merged version map. The command owns the
 * simulated-prompt observer; this step never imports or invokes a presenter.
 */
export async function resolveResumeRuntime(
  checkpoint: RunCheckpoint,
  runId: string,
  env: NodeJS.ProcessEnv,
  homedir: string | undefined,
  repoRoot: string,
  loader: HarnessRuntimeLoader,
  onSimulatedPrompt: (prompt: string) => void,
): Promise<ResumeRuntimeResult> {
  const currentHarness =
    checkpoint.stages[checkpoint.stageIndex]!.binding.agent.harness;

  const harnessRuntime = await resolveHarnessRuntime(
    {
      kind: "resume",
      runId,
      runtime: checkpoint.runtime,
      env,
      harnesses: [currentHarness],
      repoRoot,
      stageIds: checkpoint.stages.map((snapshotted) => snapshotted.id),
      // Consulted in simulated mode only, so a config-root problem never blocks
      // an otherwise state-only resume.
      configRoot: () => {
        const roots = resolveRoots(env, homedir);
        return roots.ok
          ? { ok: true, configRoot: roots.configRoot }
          : { ok: false, message: roots.message };
      },
      onSimulatedPrompt,
    },
    loader,
  );
  if (!harnessRuntime.ok) {
    return { ok: false, failure: harnessRuntime.failure };
  }

  // The process-local version map keeps every run-creation observation and
  // overrides only the current harness with the fresh resume probe; the
  // immutable stage snapshot and stored observations are never mutated.
  const harnessVersions: Record<string, string> = {};
  for (const [harness, version] of Object.entries(
    checkpoint.observedHarnessVersions,
  )) {
    if (version !== undefined && version.length > 0) {
      harnessVersions[harness] = version;
    }
  }
  for (const [harness, version] of Object.entries(harnessRuntime.versions)) {
    if (version !== undefined) {
      harnessVersions[harness] = version;
    }
  }

  return {
    ok: true,
    invoker: harnessRuntime.invoker,
    harnessVersions,
    ...(harnessRuntime.scenarioPath !== undefined
      ? { scenarioPath: harnessRuntime.scenarioPath }
      : {}),
  };
}
