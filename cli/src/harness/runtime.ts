import type { HarnessRuntimeIdentity } from "../state/checkpoint/types.js";
import type { ProbeFailure, ProbeResult } from "./adapters/real/probe.js";
import type {
  LoadSimulatedScenarioResult,
  SimulatedScenario,
} from "./adapters/simulated/scenario.js";
import {
  SIMULATED_HARNESS_TOGGLE_VAR,
  interpretSimulatedHarnessToggle,
} from "./adapters/simulated/toggle.js";
import type { HarnessId } from "./id.js";
import type { HarnessInvoker } from "./types.js";

/**
 * Probe every requested logical harness's executable. One runtime's invoker and
 * probe always come from the same adapter family, so this is the seam that moves
 * with the invoker rather than a dependency of its own.
 */
export type HarnessExecutableProbe = (
  harnesses: HarnessId[],
  repoRoot: string,
) => Promise<ProbeResult>;

/** The real provider adapter family: the Sandcastle invoker and its own probe. */
export type RealHarnessAdapters = {
  createInvoker: () => HarnessInvoker;
  probe: HarnessExecutableProbe;
};

/**
 * The developer stand-in adapter family: the simulated invoker, which drives a
 * validated scenario and observes each resolved prompt, its own probe, and the
 * read of the live scenario the invoker is built over. The scenario schema, the
 * case catalog it names, and the validator that enforces both belong to the
 * family rather than to the resolver, so selecting the real runtime loads none
 * of them.
 */
export type SimulatedHarnessAdapters = {
  createInvoker: (
    scenario: SimulatedScenario,
    onResolvedPrompt: (prompt: string) => void,
  ) => HarnessInvoker;
  probe: HarnessExecutableProbe;
  loadScenario: (
    configRoot: string,
    stageIds: readonly string[],
  ) => Promise<LoadSimulatedScenarioResult>;
};

/**
 * The two adapter families, each behind its own thunk. Resolution calls exactly
 * one of them, so the family a run does not use is never evaluated. Production
 * supplies dynamic imports; a test supplies spies.
 */
export type HarnessRuntimeLoader = {
  real: () => Promise<RealHarnessAdapters>;
  simulated: () => Promise<SimulatedHarnessAdapters>;
};

/**
 * How the resolver obtains the config root the live simulated scenario is read
 * from. It is consulted only in simulated mode, so a real run or resume never
 * depends on config-root resolution.
 */
export type ConfigRootLookup = () =>
  | { ok: true; configRoot: string }
  | { ok: false; message: string };

type HarnessRuntimeRequestBase = {
  env: NodeJS.ProcessEnv;
  /** The logical harnesses to probe, de-duplicated by the resolver. */
  harnesses: readonly HarnessId[];
  repoRoot: string;
  /** The exact stage IDs a live simulated scenario must cover. */
  stageIds: readonly string[];
  configRoot: ConfigRootLookup;
  /** Observes the prompt each simulated invocation submits. */
  onSimulatedPrompt: (prompt: string) => void;
};

/**
 * What the runtime is being resolved for. A new run selects its runtime from the
 * developer toggle; a resume enforces the runtime its checkpoint already fixed
 * and names the run so a refusal can identify it.
 */
export type HarnessRuntimeRequest =
  | (HarnessRuntimeRequestBase & { kind: "new-run" })
  | (HarnessRuntimeRequestBase & {
      kind: "resume";
      runId: string;
      runtime: HarnessRuntimeIdentity;
    });

/**
 * Which harnesses a failed probe covered: everything a new run selected, or the
 * one harness the resuming stage is bound to.
 */
export type HarnessProbeScope = "selected-stages" | "current-stage";

/**
 * Why a runtime could not be resolved, as structured facts. Terminal prose over
 * these lives in `display/preflight.ts`.
 */
export type HarnessRuntimeFailure =
  | { kind: "toggle-invalid"; message: string }
  | { kind: "simulated-runtime-requires-toggle"; runId: string; toggleVar: string }
  | { kind: "real-runtime-refuses-toggle"; runId: string; toggleVar: string }
  | { kind: "config-root-unresolved"; message: string }
  | { kind: "scenario-rejected"; errors: readonly string[] }
  | {
      kind: "probe-failed";
      scope: HarnessProbeScope;
      failures: readonly ProbeFailure[];
    }
  | { kind: "version-missing"; harnesses: readonly HarnessId[] };

/**
 * The resolved runtime: its immutable identity, the invoker of the one loaded
 * adapter family, the non-empty version line observed for every probed harness,
 * and — in simulated mode — the path the live scenario was read from, which is
 * developer-visible startup context and never persisted.
 */
export type ResolvedHarnessRuntime = {
  runtime: HarnessRuntimeIdentity;
  invoker: HarnessInvoker;
  versions: Partial<Record<HarnessId, string>>;
  scenarioPath?: string;
};

export type HarnessRuntimeResolution =
  | ({ ok: true } & ResolvedHarnessRuntime)
  | { ok: false; failure: HarnessRuntimeFailure };

/**
 * Decide which runtime a request runs against. A new run reads the developer
 * toggle once: unset or empty selects real, exactly `1` selects simulated, and
 * every other non-empty value is a configuration error. A resume enforces its
 * checkpoint's runtime in both directions instead — a simulated run continues only
 * with the toggle set, and a real run refuses to be switched to the simulated
 * provider rather than following the ambient environment.
 */
function selectRuntime(
  request: HarnessRuntimeRequest,
):
  | { ok: true; runtime: HarnessRuntimeIdentity }
  | { ok: false; failure: HarnessRuntimeFailure } {
  const toggle = interpretSimulatedHarnessToggle(request.env);

  if (request.kind === "new-run") {
    if (toggle.mode === "error") {
      return {
        ok: false,
        failure: { kind: "toggle-invalid", message: toggle.message },
      };
    }
    return { ok: true, runtime: { kind: toggle.mode } };
  }

  if (request.runtime.kind === "simulated") {
    if (toggle.mode !== "simulated") {
      return {
        ok: false,
        failure: {
          kind: "simulated-runtime-requires-toggle",
          runId: request.runId,
          toggleVar: SIMULATED_HARNESS_TOGGLE_VAR,
        },
      };
    }
    return { ok: true, runtime: request.runtime };
  }

  if (toggle.mode === "error") {
    return {
      ok: false,
      failure: { kind: "toggle-invalid", message: toggle.message },
    };
  }
  if (toggle.mode === "simulated") {
    return {
      ok: false,
      failure: {
        kind: "real-runtime-refuses-toggle",
        runId: request.runId,
        toggleVar: SIMULATED_HARNESS_TOGGLE_VAR,
      },
    };
  }
  return { ok: true, runtime: request.runtime };
}

/**
 * Load the simulated adapter family and build its invoker over the live scenario
 * the family itself reads. That read and its validation against the request's
 * exact stage IDs happen on every resolution, so a developer edits one file
 * between invocations and the next one sees it; nothing about it is carried in
 * durable state.
 */
async function resolveSimulated(
  request: HarnessRuntimeRequest,
  loader: HarnessRuntimeLoader,
): Promise<
  | { ok: true; invoker: HarnessInvoker; probe: HarnessExecutableProbe; scenarioPath: string }
  | { ok: false; failure: HarnessRuntimeFailure }
> {
  const configRoot = request.configRoot();
  if (!configRoot.ok) {
    return {
      ok: false,
      failure: { kind: "config-root-unresolved", message: configRoot.message },
    };
  }
  const adapters = await loader.simulated();
  const loaded = await adapters.loadScenario(configRoot.configRoot, request.stageIds);
  if (!loaded.ok) {
    return { ok: false, failure: { kind: "scenario-rejected", errors: loaded.errors } };
  }
  return {
    ok: true,
    invoker: adapters.createInvoker(loaded.scenario, request.onSimulatedPrompt),
    probe: adapters.probe,
    scenarioPath: loaded.scenarioPath,
  };
}

/**
 * Resolve the one harness runtime a `run` or `resume` executes against: select
 * or enforce its immutable identity, dynamically load exactly the selected
 * adapter family, probe the requested logical harnesses through that family's own
 * probe, and require a non-empty version line for each.
 *
 * The invoker and the probe always come from the same loaded family, so no
 * caller can pair a provider with another provider's availability check. Every
 * refusal is structured data and reaches the terminal through the preflight
 * renderer.
 */
export async function resolveHarnessRuntime(
  request: HarnessRuntimeRequest,
  loader: HarnessRuntimeLoader,
): Promise<HarnessRuntimeResolution> {
  const selected = selectRuntime(request);
  if (!selected.ok) {
    return { ok: false, failure: selected.failure };
  }
  const runtime = selected.runtime;

  let invoker: HarnessInvoker;
  let probe: HarnessExecutableProbe;
  let scenarioPath: string | undefined;
  if (runtime.kind === "simulated") {
    const simulated = await resolveSimulated(request, loader);
    if (!simulated.ok) {
      return { ok: false, failure: simulated.failure };
    }
    invoker = simulated.invoker;
    probe = simulated.probe;
    scenarioPath = simulated.scenarioPath;
  } else {
    const adapters = await loader.real();
    invoker = adapters.createInvoker();
    probe = adapters.probe;
  }

  const harnesses = [...new Set(request.harnesses)];
  const probed = await probe(harnesses, request.repoRoot);
  if (!probed.ok) {
    return {
      ok: false,
      failure: {
        kind: "probe-failed",
        scope: request.kind === "new-run" ? "selected-stages" : "current-stage",
        failures: probed.failures,
      },
    };
  }

  const versions: Partial<Record<HarnessId, string>> = {};
  const missing: HarnessId[] = [];
  for (const harness of harnesses) {
    const version = probed.versions[harness];
    if (version === undefined || version.length === 0) {
      missing.push(harness);
    } else {
      versions[harness] = version;
    }
  }
  if (missing.length > 0) {
    return { ok: false, failure: { kind: "version-missing", harnesses: missing } };
  }

  return {
    ok: true,
    runtime,
    invoker,
    versions,
    ...(scenarioPath !== undefined ? { scenarioPath } : {}),
  };
}

/**
 * The production loader. Each family is imported only when its runtime is the
 * one selected, so an ordinary real run never evaluates the developer harness
 * and a simulated run never loads Sandcastle.
 */
export const productionHarnessRuntimeLoader: HarnessRuntimeLoader = {
  real: async () => {
    const [{ createSandcastleInvoker }, { probeHarnessExecutables }] =
      await Promise.all([
        import("./adapters/real/sandcastle.js"),
        import("./adapters/real/probe.js"),
      ]);
    return {
      createInvoker: createSandcastleInvoker,
      probe: probeHarnessExecutables,
    };
  },
  simulated: async () => {
    const [
      { createSimulatedInvoker },
      { probeSimulatedHarnessExecutables },
      { loadSimulatedScenario },
    ] = await Promise.all([
      import("./adapters/simulated/invoker.js"),
      import("./adapters/simulated/probe.js"),
      import("./adapters/simulated/scenario.js"),
    ]);
    return {
      createInvoker: createSimulatedInvoker,
      probe: probeSimulatedHarnessExecutables,
      loadScenario: loadSimulatedScenario,
    };
  },
};
