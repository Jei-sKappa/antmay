import type { HarnessRuntimeLoader } from "../../../harness/runtime.js";
import { resolveHarnessRuntime } from "../../../harness/runtime.js";
import type { SnapshottedStage } from "../../../state/checkpoint/types.js";
import type { RunRuntimeResult } from "../types.js";

/**
 * Resolve exactly one harness adapter family for a new run, probe the selected
 * harnesses, and return the invoker, immutable runtime identity, observed
 * versions, non-empty process-local version map, and optional scenario path —
 * or the structured runtime refusal. The command owns the scripted-prompt
 * observer; this step never imports or invokes a presenter.
 */
export async function resolveRunRuntime(
  stages: readonly SnapshottedStage[],
  env: NodeJS.ProcessEnv,
  repoRoot: string,
  configRoot: string,
  loader: HarnessRuntimeLoader,
  onScriptedPrompt: (prompt: string) => void,
): Promise<RunRuntimeResult> {
  const harnessRuntime = await resolveHarnessRuntime(
    {
      kind: "new-run",
      env,
      harnesses: stages.map((stage) => stage.binding.agent.harness),
      repoRoot,
      stageIds: stages.map((stage) => stage.id),
      configRoot: () => ({ ok: true, configRoot }),
      onScriptedPrompt,
    },
    loader,
  );
  if (!harnessRuntime.ok) {
    return { ok: false, failure: harnessRuntime.failure };
  }

  const observedHarnessVersions = harnessRuntime.versions;
  const harnessVersions: Record<string, string> = {};
  for (const [harness, version] of Object.entries(observedHarnessVersions)) {
    if (version !== undefined) {
      harnessVersions[harness] = version;
    }
  }

  return {
    ok: true,
    runtime: harnessRuntime.runtime,
    invoker: harnessRuntime.invoker,
    observedHarnessVersions,
    harnessVersions,
    ...(harnessRuntime.scenarioPath !== undefined
      ? { scenarioPath: harnessRuntime.scenarioPath }
      : {}),
  };
}
