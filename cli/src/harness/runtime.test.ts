import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import type { ProbeResult } from "./backends/probe.js";
import type { HarnessId } from "./id.js";
import {
  productionHarnessRuntimeLoader,
  resolveHarnessRuntime,
  type HarnessExecutableProbe,
  type HarnessRuntimeLoader,
  type HarnessRuntimeRequest,
} from "./runtime.js";
import type { ScriptedScenario } from "./scripted/scenario.js";
import {
  SCRIPTED_HARNESS_TOGGLE_VAR,
  SCRIPTED_SCENARIO_FILENAME,
} from "./scripted/scenario.js";
import type { AttemptOutcome, HarnessInvoker } from "./types.js";

const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(
    tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

/** A config root holding the live scripted scenario, or none at all. */
async function makeConfigRoot(scenario?: unknown): Promise<string> {
  const configRoot = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-runtime-"));
  tempDirs.push(configRoot);
  if (scenario !== undefined) {
    await writeScenario(configRoot, scenario);
  }
  return configRoot;
}

async function writeScenario(configRoot: string, scenario: unknown): Promise<void> {
  await fs.writeFile(
    path.join(configRoot, SCRIPTED_SCENARIO_FILENAME),
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
 * Records which adapter family was loaded, which probe ran, and what the scripted
 * family was constructed with, so a test can prove exactly one family — with its
 * own probe — was ever evaluated.
 */
type LoaderSpy = {
  loader: HarnessRuntimeLoader;
  realLoads: number;
  scriptedLoads: number;
  realProbeCalls: HarnessId[][];
  scriptedProbeCalls: HarnessId[][];
  scenarios: ScriptedScenario[];
  promptCallbacks: Array<(prompt: string) => void>;
  realInvoker: HarnessInvoker;
  scriptedInvoker: HarnessInvoker;
};

function createLoaderSpy(
  probes: { real?: HarnessExecutableProbe; scripted?: HarnessExecutableProbe } = {},
): LoaderSpy {
  const realProbe = probes.real ?? okProbe("1.0.0");
  const scriptedProbe = probes.scripted ?? okProbe("scripted");
  const spy: LoaderSpy = {
    realLoads: 0,
    scriptedLoads: 0,
    realProbeCalls: [],
    scriptedProbeCalls: [],
    scenarios: [],
    promptCallbacks: [],
    realInvoker: NEVER_INVOKED,
    scriptedInvoker: { invoke: NEVER_INVOKED.invoke },
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
      scripted: async () => {
        spy.scriptedLoads += 1;
        return {
          createInvoker: (scenario, onResolvedPrompt) => {
            spy.scenarios.push(scenario);
            spy.promptCallbacks.push(onResolvedPrompt);
            return spy.scriptedInvoker;
          },
          probe: async (harnesses, repoRoot) => {
            spy.scriptedProbeCalls.push([...harnesses]);
            return scriptedProbe(harnesses, repoRoot);
          },
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
    onScriptedPrompt?: (prompt: string) => void;
  } = {},
): Omit<HarnessRuntimeRequest & { kind: "new-run" }, "kind"> {
  return {
    env: overrides.env ?? {},
    harnesses: overrides.harnesses ?? ["codex"],
    repoRoot: "/repo",
    stageIds: overrides.stageIds ?? ["spec"],
    configRoot:
      overrides.configRoot ?? (() => ({ ok: true as const, configRoot })),
    onScriptedPrompt: overrides.onScriptedPrompt ?? (() => undefined),
  };
}

const scriptedEnv: NodeJS.ProcessEnv = { [SCRIPTED_HARNESS_TOGGLE_VAR]: "1" };

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
    expect(spy.scriptedLoads).toBe(0);
    expect(spy.realProbeCalls).toEqual([["codex"]]);
    expect(spy.scriptedProbeCalls).toEqual([]);
  });

  it("treats an empty toggle as real and never consults the config root", async () => {
    let configRootLookups = 0;
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "new-run",
        ...baseRequest("/unused", {
          env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "" },
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
    expect(spy.scriptedLoads).toBe(0);
  });

  it("selects scripted for the exact toggle and loads only the scripted family", async () => {
    const configRoot = await makeConfigRoot(
      scenarioDocument({ spec: ["spec-correct"] }),
    );
    const observed: string[] = [];
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "new-run",
        ...baseRequest(configRoot, {
          env: scriptedEnv,
          onScriptedPrompt: (prompt) => observed.push(prompt),
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    expect(resolution.runtime).toEqual({ kind: "scripted" });
    expect(resolution.invoker).toBe(spy.scriptedInvoker);
    expect(resolution.versions).toEqual({ codex: "codex scripted" });
    expect(resolution.scenarioPath).toBe(
      path.join(configRoot, SCRIPTED_SCENARIO_FILENAME),
    );
    expect(spy.realLoads).toBe(0);
    expect(spy.scriptedLoads).toBe(1);
    expect(spy.scriptedProbeCalls).toEqual([["codex"]]);
    expect(spy.realProbeCalls).toEqual([]);
    expect(spy.scenarios[0]?.stages).toEqual({ spec: ["spec-correct"] });

    // The scripted invoker is built with the request's observational callback.
    spy.promptCallbacks[0]!("$spec `docs/threads/x/`.");
    expect(observed).toEqual(["$spec `docs/threads/x/`."]);
  });

  it("fails an unrecognized toggle value before loading any family or probing", async () => {
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "new-run",
        ...baseRequest("/unused", {
          env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "true" },
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.failure.kind).toBe("toggle-invalid");
    if (resolution.failure.kind === "toggle-invalid") {
      expect(resolution.failure.message).toContain(SCRIPTED_HARNESS_TOGGLE_VAR);
    }
    expect(spy.realLoads).toBe(0);
    expect(spy.scriptedLoads).toBe(0);
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
  it("refuses a scripted run without the exact toggle, before loading or probing", async () => {
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "scripted" },
        ...baseRequest("/unused"),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.failure).toEqual({
      kind: "scripted-runtime-requires-toggle",
      runId: "260101T000000000Z-run",
      toggleVar: SCRIPTED_HARNESS_TOGGLE_VAR,
    });
    expect(spy.realLoads + spy.scriptedLoads).toBe(0);
  });

  it("refuses a real run when the scripted toggle is set, before loading or probing", async () => {
    const configRoot = await makeConfigRoot(
      scenarioDocument({ spec: ["spec-correct"] }),
    );
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "real" },
        ...baseRequest(configRoot, { env: scriptedEnv }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.failure).toEqual({
      kind: "real-runtime-refuses-toggle",
      runId: "260101T000000000Z-run",
      toggleVar: SCRIPTED_HARNESS_TOGGLE_VAR,
    });
    expect(spy.realLoads + spy.scriptedLoads).toBe(0);
  });

  it("rejects an unrecognized toggle value on a real run", async () => {
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "real" },
        ...baseRequest("/unused", {
          env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "yes" },
        }),
      },
      spy.loader,
    );

    expect(resolution.ok).toBe(false);
    if (!resolution.ok) expect(resolution.failure.kind).toBe("toggle-invalid");
    expect(spy.realLoads + spy.scriptedLoads).toBe(0);
  });

  it("rereads the live scenario on every scripted resolution", async () => {
    const configRoot = await makeConfigRoot(
      scenarioDocument({ spec: ["outcome-blocked"] }),
    );
    const spy = createLoaderSpy();
    const request: HarnessRuntimeRequest = {
      kind: "resume",
      runId: "260101T000000000Z-run",
      runtime: { kind: "scripted" },
      ...baseRequest(configRoot, { env: scriptedEnv }),
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
        runtime: { kind: "scripted" },
        ...baseRequest(configRoot, {
          env: scriptedEnv,
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
    // A rejected scenario stops before either family is loaded.
    expect(spy.scriptedLoads).toBe(0);
  });

  it("reports an unresolvable config root only in scripted mode", async () => {
    const spy = createLoaderSpy();
    const resolution = await resolveHarnessRuntime(
      {
        kind: "resume",
        runId: "260101T000000000Z-run",
        runtime: { kind: "scripted" },
        ...baseRequest("/unused", {
          env: scriptedEnv,
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
    expect(spy.scriptedLoads).toBe(0);
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

    const scripted = await productionHarnessRuntimeLoader.scripted();
    const scenario: ScriptedScenario = Object.freeze({
      schemaVersion: 0 as const,
      stages: Object.freeze({ spec: Object.freeze(["spec-correct" as const]) }),
    });
    expect(
      typeof scripted.createInvoker(scenario, () => undefined).invoke,
    ).toBe("function");
    const scriptedProbe = await scripted.probe(["codex"], "/repo");
    expect(scriptedProbe.ok).toBe(true);
    if (scriptedProbe.ok) {
      expect(scriptedProbe.versions.codex).toContain("scripted-harness");
    }
  });
});
