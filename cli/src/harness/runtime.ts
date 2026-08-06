import type { HarnessRuntimeIdentity } from "../state/checkpoint/types.js";
import type { ProbeFailure, ProbeResult } from "./backends/probe.js";
import type { HarnessId } from "./id.js";
import type { ScriptedScenario } from "./scripted/scenario.js";
import {
  SCRIPTED_HARNESS_TOGGLE_VAR,
  interpretScriptedHarnessToggle,
  loadScriptedScenario,
} from "./scripted/scenario.js";
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
 * The developer scripted adapter family: the scripted invoker, which drives a
 * validated scenario and observes each resolved prompt, and its own probe.
 */
export type ScriptedHarnessAdapters = {
  createInvoker: (
    scenario: ScriptedScenario,
    onResolvedPrompt: (prompt: string) => void,
  ) => HarnessInvoker;
  probe: HarnessExecutableProbe;
};

/**
 * The two adapter families, each behind its own thunk. Resolution calls exactly
 * one of them, so the family a run does not use is never evaluated. Production
 * supplies dynamic imports; a test supplies spies.
 */
export type HarnessRuntimeLoader = {
  real: () => Promise<RealHarnessAdapters>;
  scripted: () => Promise<ScriptedHarnessAdapters>;
};

/**
 * How the resolver obtains the config root the live scripted scenario is read
 * from. It is consulted only in scripted mode, so a real run or resume never
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
  /** The exact stage IDs a live scripted scenario must cover. */
  stageIds: readonly string[];
  configRoot: ConfigRootLookup;
  /** Observes the prompt each scripted invocation submits. */
  onScriptedPrompt: (prompt: string) => void;
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
  | { kind: "scripted-runtime-requires-toggle"; runId: string; toggleVar: string }
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
 * and — in scripted mode — the path the live scenario was read from, which is
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
 * toggle once: unset or empty selects real, exactly `1` selects scripted, and
 * every other non-empty value is a configuration error. A resume enforces its
 * checkpoint's runtime in both directions instead — a scripted run continues only
 * with the toggle set, and a real run refuses to be switched to the scripted
 * provider rather than following the ambient environment.
 */
function selectRuntime(
  request: HarnessRuntimeRequest,
):
  | { ok: true; runtime: HarnessRuntimeIdentity }
  | { ok: false; failure: HarnessRuntimeFailure } {
  const toggle = interpretScriptedHarnessToggle(request.env);

  if (request.kind === "new-run") {
    if (toggle.mode === "error") {
      return {
        ok: false,
        failure: { kind: "toggle-invalid", message: toggle.message },
      };
    }
    return { ok: true, runtime: { kind: toggle.mode } };
  }

  if (request.runtime.kind === "scripted") {
    if (toggle.mode !== "scripted") {
      return {
        ok: false,
        failure: {
          kind: "scripted-runtime-requires-toggle",
          runId: request.runId,
          toggleVar: SCRIPTED_HARNESS_TOGGLE_VAR,
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
  if (toggle.mode === "scripted") {
    return {
      ok: false,
      failure: {
        kind: "real-runtime-refuses-toggle",
        runId: request.runId,
        toggleVar: SCRIPTED_HARNESS_TOGGLE_VAR,
      },
    };
  }
  return { ok: true, runtime: request.runtime };
}

/**
 * Load the scripted adapter family over a freshly read live scenario. The
 * scenario is read and validated against the request's exact stage IDs on every
 * resolution, so a developer edits one file between invocations and the next one
 * sees it; nothing about it is carried in durable state.
 */
async function resolveScripted(
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
  const loaded = await loadScriptedScenario(configRoot.configRoot, request.stageIds);
  if (!loaded.ok) {
    return { ok: false, failure: { kind: "scenario-rejected", errors: loaded.errors } };
  }
  const adapters = await loader.scripted();
  return {
    ok: true,
    invoker: adapters.createInvoker(loaded.scenario, request.onScriptedPrompt),
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
  if (runtime.kind === "scripted") {
    const scripted = await resolveScripted(request, loader);
    if (!scripted.ok) {
      return { ok: false, failure: scripted.failure };
    }
    invoker = scripted.invoker;
    probe = scripted.probe;
    scenarioPath = scripted.scenarioPath;
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
 * and a scripted run never loads Sandcastle.
 */
export const productionHarnessRuntimeLoader: HarnessRuntimeLoader = {
  real: async () => {
    const [{ createSandcastleInvoker }, { probeHarnessExecutables }] =
      await Promise.all([
        import("./backends/sandcastle.js"),
        import("./backends/probe.js"),
      ]);
    return {
      createInvoker: createSandcastleInvoker,
      probe: probeHarnessExecutables,
    };
  },
  scripted: async () => {
    const [{ createScriptedInvoker }, { probeScriptedHarnessExecutables }] =
      await Promise.all([
        import("./scripted/invoker.js"),
        import("./scripted/probe.js"),
      ]);
    return {
      createInvoker: createScriptedInvoker,
      probe: probeScriptedHarnessExecutables,
    };
  },
};
