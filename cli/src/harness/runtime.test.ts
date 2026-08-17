import { promises as fs } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ProbeResult } from "./adapters/real/probe.js";
import type { HarnessId } from "./id.js";
import {
  productionHarnessRuntimeLoader,
  resolveHarnessRuntime,
  type HarnessExecutableProbe,
  type HarnessRuntimeLoader,
  type HarnessRuntimeRequest,
} from "./runtime.js";
import type { SimulatedScenario } from "./adapters/simulated/scenario.js";
import {
  SIMULATED_SCENARIO_FILENAME,
  loadSimulatedScenario,
} from "./adapters/simulated/scenario.js";
import { SIMULATED_HARNESS_TOGGLE_VAR } from "./adapters/simulated/toggle.js";
import type { AttemptOutcome, HarnessInvoker } from "./types.js";
import { tempDir as allocate } from "../test-helpers/temp-root.js";

/** A config root holding the live simulated scenario, or none at all. */
async function makeConfigRoot(scenario?: unknown): Promise<string> {
  const configRoot = await allocate("antmay-runtime-");
  if (scenario !== undefined) {
    await writeScenario(configRoot, scenario);
  }
  return configRoot;
}

async function writeScenario(configRoot: string, scenario: unknown): Promise<void> {
  await fs.writeFile(
    path.join(configRoot, SIMULATED_SCENARIO_FILENAME),
    JSON.stringify(scenario, null, 2),
    "utf8",
  );
}

function scenarioDocument(stages: Record<string, string[]>): unknown {
  return { schemaVersion: 0, stages };
}

const NEVER_INVOKED: HarnessInvoker = {
  invoke: (): Promise<AttemptOutcome> => {
    throw new Error("the resolver must never invoke the harness it resolves");
  },
};

const okProbe =
  (line: string): HarnessExecutableProbe =>
  async (harnesses): Promise<ProbeResult> => {
    const versions: Partial<Record<HarnessId, string>> = {};
    for (const harness of harnesses) versions[harness] = `${harness} ${line}`;
    return { ok: true, versions };
  };

/**
 * Records which adapter family was loaded, which probe ran, and what the simulated
 * family was constructed with, so a test can prove exactly one family — with its
 * own probe — was ever evaluated.
 */
type LoaderSpy = {
  loader: HarnessRuntimeLoader;
  realLoads: number;
  simulatedLoads: number;
  realProbeCalls: HarnessId[][];
  simulatedProbeCalls: HarnessId[][];
  scenarios: SimulatedScenario[];
  promptCallbacks: Array<(prompt: string) => void>;
  realInvoker: HarnessInvoker;
  simulatedInvoker: HarnessInvoker;
};

function createLoaderSpy(
  probes: { real?: HarnessExecutableProbe; simulated?: HarnessExecutableProbe } = {},
): LoaderSpy {
  const realProbe = probes.real ?? okProbe("1.0.0");
  const simulatedProbe = probes.simulated ?? okProbe("simulated");
  const spy: LoaderSpy = {
    realLoads: 0,
    simulatedLoads: 0,
    realProbeCalls: [],
    simulatedProbeCalls: [],
    scenarios: [],
    promptCallbacks: [],
    realInvoker: NEVER_INVOKED,
    simulatedInvoker: { invoke: NEVER_INVOKED.invoke },
    loader: {
      real: async () => {
        spy.realLoads += 1;
        return {
          createInvoker: () => spy.realInvoker,
          probe: async (harnesses, repoRoot) => {
            spy.realProbeCalls.push([...harnesses]);
            return realProbe(harnesses, repoRoot);
          },
        };
      },
      simulated: async () => {
        spy.simulatedLoads += 1;
        return {
          createInvoker: (scenario, onResolvedPrompt) => {
            spy.scenarios.push(scenario);
            spy.promptCallbacks.push(onResolvedPrompt);
            return spy.simulatedInvoker;
          },
          probe: async (harnesses, repoRoot) => {
            spy.simulatedProbeCalls.push([...harnesses]);
            return simulatedProbe(harnesses, repoRoot);
          },
          // The family reads the live scenario, so the spy delegates to the real
          // reader over the config root each case actually wrote.
          loadScenario: loadSimulatedScenario,
        };
      },
    },
  };
  return spy;
}

function baseRequest(
  configRoot: string,
  overrides: {
    env?: NodeJS.ProcessEnv;
    harnesses?: HarnessId[];
    stageIds?: string[];
    configRoot?: HarnessRuntimeRequest["configRoot"];
    onSimulatedPrompt?: (prompt: string) => void;
  } = {},
): Omit<HarnessRuntimeRequest & { kind: "new-run" }, "kind"> {
  return {
    env: overrides.env ?? {},
    harnesses: overrides.harnesses ?? ["codex"],
    repoRoot: "/repo",
    stageIds: overrides.stageIds ?? ["spec"],
    configRoot:
      overrides.configRoot ?? (() => ({ ok: true as const, configRoot })),
    onSimulatedPrompt: overrides.onSimulatedPrompt ?? (() => undefined),
  };
}

const simulatedEnv: NodeJS.ProcessEnv = { [SIMULATED_HARNESS_TOGGLE_VAR]: "1" };

describe("resolveHarnessRuntime — new-run selection (AC-5.1, AC-5.4)", () => {
  it("selects real and loads only the real family when the toggle is unset", async () => {
    const configRoot = await makeConfigRoot();
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      { kind: "new-run", ...baseRequest(configRoot) },
      spy.loader,
    );

    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    expect(resolution.runtime).toEqual({ kind: "real" });
    expect(resolution.invoker).toBe(spy.realInvoker);
    expect(resolution.versions).toEqual({ codex: "codex 1.0.0" });
    expect(resolution.scenarioPath).toBeUndefined();
    expect(spy.realLoads).toBe(1);
    expect(spy.simulatedLoads).toBe(0);
    expect(spy.realProbeCalls).toEqual([["codex"]]);
    expect(spy.simulatedProbeCalls).toEqual([]);
  });

  it("treats an empty toggle as real and never consults the config root", async () => {
    let configRootLookups = 0;
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "new-run",
        ...baseRequest("/unused", {
          env: { [SIMULATED_HARNESS_TOGGLE_VAR]: "" },
          configRoot: () => {
            configRootLookups += 1;
            return { ok: true, configRoot: "/unused" };
          },
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(true);
    if (resolution.ok) expect(resolution.runtime).toEqual({ kind: "real" });
    expect(configRootLookups).toBe(0);
    expect(spy.simulatedLoads).toBe(0);
  });

  it("selects simulated for the exact toggle and loads only the simulated family", async () => {
    const configRoot = await makeConfigRoot(
      scenarioDocument({ spec: ["spec-correct"] }),
    );
    const observed: string[] = [];
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "new-run",
        ...baseRequest(configRoot, {
          env: simulatedEnv,
          onSimulatedPrompt: (prompt) => observed.push(prompt),
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    expect(resolution.runtime).toEqual({ kind: "simulated" });
    expect(resolution.invoker).toBe(spy.simulatedInvoker);
    expect(resolution.versions).toEqual({ codex: "codex simulated" });
    expect(resolution.scenarioPath).toBe(
      path.join(configRoot, SIMULATED_SCENARIO_FILENAME),
    );
    expect(spy.realLoads).toBe(0);
    expect(spy.simulatedLoads).toBe(1);
    expect(spy.simulatedProbeCalls).toEqual([["codex"]]);
    expect(spy.realProbeCalls).toEqual([]);
    expect(spy.scenarios[0]?.stages).toEqual({ spec: ["spec-correct"] });

    // The simulated invoker is built with the request's observational callback.
    spy.promptCallbacks[0]!("$spec `docs/threads/x/`.");
    expect(observed).toEqual(["$spec `docs/threads/x/`."]);
  });

  it("fails an unrecognized toggle value before loading any family or probing", async () => {
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "new-run",
        ...baseRequest("/unused", {
          env: { [SIMULATED_HARNESS_TOGGLE_VAR]: "true" },
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.failure.kind).toBe("toggle-invalid");
    if (resolution.failure.kind === "toggle-invalid") {
      expect(resolution.failure.message).toContain(SIMULATED_HARNESS_TOGGLE_VAR);
    }
    expect(spy.realLoads).toBe(0);
    expect(spy.simulatedLoads).toBe(0);
  });

  it("probes each distinct harness once", async () => {
    const configRoot = await makeConfigRoot();
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "new-run",
        ...baseRequest(configRoot, {
          harnesses: ["codex", "claude-code", "codex"],
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(true);
    if (resolution.ok) {
      expect(resolution.versions).toEqual({
        codex: "codex 1.0.0",
        "claude-code": "claude-code 1.0.0",
      });
    }
    expect(spy.realProbeCalls).toEqual([["codex", "claude-code"]]);
  });
});

describe("resolveHarnessRuntime — resume enforcement (AC-5.2, AC-5.3)", () => {
  it("refuses a simulated run without the exact toggle, before loading or probing", async () => {
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "simulated" },
        ...baseRequest("/unused"),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.failure).toEqual({
      kind: "simulated-runtime-requires-toggle",
      runId: "260101T000000000Z-run",
      toggleVar: SIMULATED_HARNESS_TOGGLE_VAR,
    });
    expect(spy.realLoads + spy.simulatedLoads).toBe(0);
  });

  it("refuses a real run when the simulated toggle is set, before loading or probing", async () => {
    const configRoot = await makeConfigRoot(
      scenarioDocument({ spec: ["spec-correct"] }),
    );
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "real" },
        ...baseRequest(configRoot, { env: simulatedEnv }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.failure).toEqual({
      kind: "real-runtime-refuses-toggle",
      runId: "260101T000000000Z-run",
      toggleVar: SIMULATED_HARNESS_TOGGLE_VAR,
    });
    expect(spy.realLoads + spy.simulatedLoads).toBe(0);
  });

  it("rejects an unrecognized toggle value on a real run", async () => {
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "real" },
        ...baseRequest("/unused", {
          env: { [SIMULATED_HARNESS_TOGGLE_VAR]: "yes" },
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (!resolution.ok) expect(resolution.failure.kind).toBe("toggle-invalid");
    expect(spy.realLoads + spy.simulatedLoads).toBe(0);
  });

  it("rereads the live scenario on every simulated resolution", async () => {
    const configRoot = await makeConfigRoot(
      scenarioDocument({ spec: ["outcome-blocked"] }),
    );
    const spy = createLoaderSpy();
    const request: HarnessRuntimeRequest = {
      kind: "resume",
      runId: "260101T000000000Z-run",
      runtime: { kind: "simulated" },
      ...baseRequest(configRoot, { env: simulatedEnv }),
    };

    const first = await resolveHarnessRuntime(request, spy.loader);
    await writeScenario(configRoot, scenarioDocument({ spec: ["spec-correct"] }));
    const second = await resolveHarnessRuntime(request, spy.loader);

    expect(first.ok && second.ok).toBe(true);
    expect(spy.scenarios.map((scenario) => scenario.stages)).toEqual([
      { spec: ["outcome-blocked"] },
      { spec: ["spec-correct"] },
    ]);
  });

  it("validates the live scenario against the complete snapshotted stage set", async () => {
    const configRoot = await makeConfigRoot(
      scenarioDocument({ spec: ["spec-correct"] }),
    );
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "simulated" },
        ...baseRequest(configRoot, {
          env: simulatedEnv,
          stageIds: ["spec", "review-spec"],
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.failure.kind).toBe("scenario-rejected");
    if (resolution.failure.kind === "scenario-rejected") {
      expect(resolution.failure.errors).toEqual([
        "stages.review-spec must be present.",
      ]);
    }
    // Reading the scenario is the simulated family's own work, so a rejected one
    // still leaves the real family unloaded.
    expect(spy.realLoads).toBe(0);
  });

  it("reports an unresolvable config root only in simulated mode", async () => {
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "simulated" },
        ...baseRequest("/unused", {
          env: simulatedEnv,
          configRoot: () => ({ ok: false, message: "HOME is not set" }),
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (!resolution.ok) {
      expect(resolution.failure).toEqual({
        kind: "config-root-unresolved",
        message: "HOME is not set",
      });
    }
    expect(spy.simulatedLoads).toBe(0);
  });
});

describe("resolveHarnessRuntime — probe results (AC-5.6)", () => {
  it("returns every probe failure with the new-run scope", async () => {
    const configRoot = await makeConfigRoot();
    const spy = createLoaderSpy({
      real: async () => ({
        ok: false,
        failures: [
          { harness: "codex", binary: "codex", reason: "executable not found on PATH" },
          { harness: "claude-code", binary: "claude", reason: "timed out after 10s" },
        ],
      }),
    });
    const resolution = await resolveHarnessRuntime(
      {
        kind: "new-run",
        ...baseRequest(configRoot, { harnesses: ["codex", "claude-code"] }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.failure.kind).toBe("probe-failed");
    if (resolution.failure.kind === "probe-failed") {
      expect(resolution.failure.scope).toBe("selected-stages");
      expect(resolution.failure.failures).toHaveLength(2);
    }
  });

  it("scopes a resume probe failure to the current stage's harness", async () => {
    const configRoot = await makeConfigRoot();
    const spy = createLoaderSpy({
      real: async () => ({
        ok: false,
        failures: [
          { harness: "codex", binary: "codex", reason: "exited with code 2" },
        ],
      }),
    });
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "real" },
        ...baseRequest(configRoot),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (!resolution.ok && resolution.failure.kind === "probe-failed") {
      expect(resolution.failure.scope).toBe("current-stage");
    }
  });

  it("rejects a probe that reports no usable version for a requested harness", async () => {
    const configRoot = await makeConfigRoot();
    const spy = createLoaderSpy({
      real: async () => ({ ok: true, versions: { codex: "" } }),
    });
    const resolution = await resolveHarnessRuntime(
      {
        kind: "new-run",
        ...baseRequest(configRoot, { harnesses: ["codex", "claude-code"] }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (!resolution.ok) {
      expect(resolution.failure).toEqual({
        kind: "version-missing",
        harnesses: ["codex", "claude-code"],
      });
    }
  });
});

describe("productionHarnessRuntimeLoader", () => {
  it("pairs each family's invoker with that family's own probe", async () => {
    const real = await productionHarnessRuntimeLoader.real();
    expect(typeof real.createInvoker().invoke).toBe("function");
    const realProbe = await real.probe([], "/repo");
    expect(realProbe).toEqual({ ok: true, versions: {} });

    const simulated = await productionHarnessRuntimeLoader.simulated();
    const scenario: SimulatedScenario = Object.freeze({
      schemaVersion: 0 as const,
      stages: Object.freeze({ spec: Object.freeze(["spec-correct" as const]) }),
    });
    expect(
      typeof simulated.createInvoker(scenario, () => undefined).invoke,
    ).toBe("function");
    const simulatedProbe = await simulated.probe(["codex"], "/repo");
    expect(simulatedProbe.ok).toBe(true);
    if (simulatedProbe.ok) {
      expect(simulatedProbe.versions.codex).toContain("simulated-harness");
    }
  });

  it("reads the live scenario through the simulated family", async () => {
    const configRoot = await makeConfigRoot(
      scenarioDocument({ spec: ["spec-correct"] }),
    );
    const simulated = await productionHarnessRuntimeLoader.simulated();
    const loaded = await simulated.loadScenario(configRoot, ["spec"]);

    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.scenario.stages).toEqual({ spec: ["spec-correct"] });
  });
});
