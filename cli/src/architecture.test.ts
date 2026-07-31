import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Whole-`src/` dependency guards.
 *
 * Every other test proves what one module does. This one proves what each module
 * may reach at all — a property no single execution can demonstrate, and the only
 * check that fires when a new caller crosses a boundary the design closed.
 *
 * The graph is read from source text, so a boundary cannot be crossed through a
 * form a narrower matcher would miss: static, dynamic, re-export, and
 * side-effect imports all count, in either quote style. The suite and its
 * fixtures are excluded — the guards constrain what ships, and a test may reach
 * anything it needs to observe.
 */

const SRC_ROOT = fileURLToPath(new URL("./", import.meta.url));

/** A `src/`-relative module path, POSIX-separated: `execution/engine.ts`. */
type ModuleId = string;

type ModuleReference = {
  /** The specifier exactly as written. */
  specifier: string;
  /** The module it names, when it names a file under `src/`. */
  target: ModuleId | null;
  /** True for `import(…)`; false for a static, re-export, or side-effect import. */
  dynamic: boolean;
  /** True for `import type` / `export type`, which loads nothing at runtime. */
  typeOnly: boolean;
};

type ProductionModule = {
  id: ModuleId;
  source: string;
  references: ModuleReference[];
};

/**
 * Every import specifier form TypeScript accepts: `import … from`,
 * `export … from`, a bare side-effect `import`, and `import(…)`, each in either
 * quote style and tolerant of the whitespace a formatter may introduce.
 */
const IMPORT_SPECIFIER = /\b(?:from|import)\s*(\()?\s*["']([^"'\n]+)["']/g;

/** Whether a quoted string is plausibly a specifier rather than ordinary prose. */
function looksLikeSpecifier(value: string): boolean {
  return /^(?:\.{1,2}\/|node:|@|[a-z])[^\s]*$/.test(value);
}

/** The module a relative specifier names, or `null` for a package or builtin. */
function resolveTarget(from: ModuleId, specifier: string): ModuleId | null {
  if (!specifier.startsWith(".")) return null;
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), specifier),
  );
  return resolved.replace(/\.js$/, ".ts");
}

/**
 * Whether the statement carrying the specifier at `at` is `import type` or
 * `export type`. Such a reference states a dependency direction but loads
 * nothing, which is the difference the lazy-loading guards turn on.
 */
function isTypeOnly(source: string, at: number): boolean {
  const starts = [...source.matchAll(/(?:^|\n)[ \t]*(?:import|export)\b/g)];
  const enclosing = starts.filter((start) => start.index <= at).pop();
  if (enclosing === undefined) return false;
  return /^[ \t]*(?:import|export)\s+type\b/.test(
    source.slice(enclosing.index).replace(/^\n/, ""),
  );
}

function referencesIn(id: ModuleId, source: string): ModuleReference[] {
  return [...source.matchAll(IMPORT_SPECIFIER)]
    .filter((match) => looksLikeSpecifier(match[2]!))
    .map((match) => ({
      specifier: match[2]!,
      target: resolveTarget(id, match[2]!),
      dynamic: match[1] !== undefined,
      typeOnly: isTypeOnly(source, match.index),
    }));
}

let loaded: Promise<ProductionModule[]> | null = null;

/** Every production module under `src/`, read once for the whole file. */
function productionModules(): Promise<ProductionModule[]> {
  loaded ??= (async () => {
    const entries = await fs.readdir(SRC_ROOT, {
      recursive: true,
      withFileTypes: true,
    });
    const modules: ProductionModule[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const absolute = path.join(entry.parentPath, entry.name);
      const id = path.relative(SRC_ROOT, absolute).split(path.sep).join("/");
      if (id.endsWith(".test.ts") || id.startsWith("test-helpers/")) continue;
      const source = await fs.readFile(absolute, "utf8");
      modules.push({ id, source, references: referencesIn(id, source) });
    }
    return modules.sort((a, b) => a.id.localeCompare(b.id));
  })();
  return loaded;
}

async function moduleNamed(id: ModuleId): Promise<ProductionModule> {
  const found = (await productionModules()).find((module) => module.id === id);
  expect(found, `no production module ${id}`).toBeDefined();
  return found!;
}

/** The modules a module reaches, however it reaches them. */
function targetsOf(module: ProductionModule): ModuleId[] {
  return module.references.flatMap((ref) => (ref.target === null ? [] : [ref.target]));
}

/** Which production modules reach `target`, sorted. */
async function importersOf(target: ModuleId): Promise<ModuleId[]> {
  return (await productionModules())
    .filter((module) => targetsOf(module).includes(target))
    .map((module) => module.id);
}

/** Which production modules mention `name` as an identifier, sorted. */
async function modulesNaming(name: string): Promise<ModuleId[]> {
  const pattern = new RegExp(`\\b${name}\\b`);
  return (await productionModules())
    .filter((module) => pattern.test(module.source))
    .map((module) => module.id);
}

function occurrencesOf(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

/** Line and block comments removed, so a guard reads declarations only. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("module graph", () => {
  it("resolves every relative import to a production module", async () => {
    const modules = await productionModules();
    const ids = new Set(modules.map((module) => module.id));
    expect(ids.size).toBeGreaterThan(30);
    for (const module of modules) {
      for (const target of targetsOf(module)) {
        expect(ids.has(target), `${module.id} imports ${target}`).toBe(true);
      }
    }
  });
});

describe("one post-allocation checkpoint writer (AC-1.3, AC-1.5)", () => {
  it("gives the atomic writer exactly two production importers", async () => {
    expect(await importersOf("state/persist.ts")).toEqual([
      "commands/run.ts",
      "execution/engine.ts",
    ]);
  });

  it("keeps run's own write to the one allocation write", async () => {
    // Creating the initial `ready` checkpoint is allocation, not a transition of
    // existing state, so it is the one write outside the engine.
    const run = await moduleNamed("commands/run.ts");
    expect(occurrencesOf(run.source, /\bwriteCheckpoint\(/g)).toBe(1);
  });

  it("routes every engine write through the engine's own persistence boundary", async () => {
    const engine = await moduleNamed("execution/engine.ts");
    // The engine calls its injectable boundary, never the module function, and
    // that boundary has exactly one call site to stamp and persist through.
    expect(occurrencesOf(engine.source, /\bwriteCheckpoint\(/g)).toBe(0);
    expect(occurrencesOf(engine.source, /\bpersistCheckpoint\(/g)).toBe(1);
  });

  it("leaves the writer a writer", async () => {
    const persist = await moduleNamed("state/persist.ts");
    expect(targetsOf(persist)).toEqual(["state/checkpoint.ts"]);
    expect(persist.source).not.toMatch(/\b(?:readCheckpoint|validateCheckpoint)\b/);
  });
});

describe("resume preflight reaches no transition collaborator (AC-1.3)", () => {
  /** Everything the engine owns under the lock. */
  const ENGINE_OWNED = [
    "state/persist.ts",
    "execution/recovery-policy.ts",
    "gitops/boundary.ts",
    "gitops/status.ts",
    "thread/artifacts.ts",
    "thread/queues.ts",
    "runner/classify.ts",
    "runner/outcome.ts",
    "state/logs.ts",
  ];

  it("enters the engine and imports nothing the engine owns", async () => {
    const resume = await moduleNamed("commands/resume.ts");
    const targets = targetsOf(resume);
    expect(targets).toContain("execution/engine.ts");
    for (const owned of ENGINE_OWNED) {
      expect(targets, `resume imports ${owned}`).not.toContain(owned);
    }
  });

  it("names no recovery dispatcher, mutation, or write helper", async () => {
    const resume = await moduleNamed("commands/resume.ts");
    for (const forbidden of [
      "writeCheckpoint",
      "decideRecovery",
      "WaitingRecovery",
      "finalizeGitBoundary",
      "scanPendingQueues",
      "evaluatePromisedState",
      "isWorktreeClean",
    ]) {
      expect(resume.source, `resume names ${forbidden}`).not.toMatch(
        new RegExp(`\\b${forbidden}\\b`),
      );
    }
  });

  it("keeps the recovery decision table inside the execution domain", async () => {
    for (const importer of await importersOf("execution/recovery-policy.ts")) {
      expect(importer.startsWith("execution/"), `${importer} decides recovery`).toBe(
        true,
      );
    }
  });
});

describe("the whole Git boundary protocol is one operation (AC-4.4)", () => {
  const inGitDomain = (id: ModuleId): boolean => id.startsWith("gitops/");

  it("keeps boundary observation inside the Git domain", async () => {
    for (const id of await modulesNaming("collectBoundaryStatus")) {
      expect(inGitDomain(id), `${id} observes the boundary status itself`).toBe(true);
    }
  });

  it("stages and commits nowhere else", async () => {
    for (const module of await productionModules()) {
      if (inGitDomain(module.id)) continue;
      expect(
        module.source,
        `${module.id} runs its own staging or commit`,
      ).not.toMatch(/\[\s*"(?:add|commit)"/);
    }
  });

  it("offers the engine one entry point into that protocol", async () => {
    expect(await modulesNaming("finalizeGitBoundary")).toEqual([
      "execution/engine.ts",
      "gitops/boundary.ts",
    ]);
  });

  it("keeps the Git domain out of persistence, execution, and display", async () => {
    for (const module of await productionModules()) {
      if (!inGitDomain(module.id)) continue;
      for (const target of targetsOf(module)) {
        expect(
          /^(?:state|execution|display)\//.test(target),
          `${module.id} imports ${target}`,
        ).toBe(false);
      }
    }
  });
});

describe("the thread domain owns every artifact contract (AC-6.1, AC-6.5)", () => {
  const ARTIFACT_DOMAIN = "thread/artifacts.ts";

  /** The artifact vocabulary, validators, and operations, by exported name. */
  const ARTIFACT_CONTRACTS = [
    "ArtifactState",
    "PartialArtifactState",
    "PlanState",
    "ArtifactPrerequisite",
    "ArtifactTransition",
    "ArtifactInspection",
    "ArtifactMismatch",
    "validateSerializedArtifactPattern",
    "validateSerializedArtifactMismatches",
    "inspectArtifactState",
    "evaluateArtifactPrerequisite",
    "evaluatePromisedState",
    "applyArtifactTransition",
    "describeArtifact",
    "describeArtifactDimension",
    "describeContractSide",
    "formatArtifactMismatch",
  ];

  it("declares each artifact contract in exactly one module", async () => {
    const modules = await productionModules();
    for (const name of ARTIFACT_CONTRACTS) {
      const declaration = new RegExp(
        `^export\\s+(?:async\\s+)?(?:type|interface|const|function)\\s+${name}\\b`,
        "m",
      );
      const owners = modules
        .filter((module) => declaration.test(module.source))
        .map((module) => module.id);
      expect(owners, `declarations of ${name}`).toEqual([ARTIFACT_DOMAIN]);
    }
  });

  it("makes every consumer of that vocabulary depend on the domain", async () => {
    const contract = new RegExp(`\\b(?:${ARTIFACT_CONTRACTS.join("|")})\\b`);
    for (const module of await productionModules()) {
      if (module.id === ARTIFACT_DOMAIN || !contract.test(module.source)) continue;
      expect(targetsOf(module), `${module.id} names an artifact contract`).toContain(
        ARTIFACT_DOMAIN,
      );
    }
  });

  it("leaves no second dimension, value-kind, or plan-state table", async () => {
    for (const module of await productionModules()) {
      if (module.id === ARTIFACT_DOMAIN) continue;
      expect(module.source, `${module.id} tabulates artifact dimensions`).not.toMatch(
        /Record<\s*keyof ArtifactState|ARTIFACT_(?:DIMENSION|DESCRIPTIONS|VALUE_KINDS)|PLAN_STATES/,
      );
    }
  });

  it("defines its own vocabulary without depending on the pipeline", async () => {
    for (const module of await productionModules()) {
      if (!module.id.startsWith("thread/")) continue;
      for (const target of targetsOf(module)) {
        expect(
          target.startsWith("pipeline/"),
          `${module.id} imports ${target}`,
        ).toBe(false);
      }
    }
  });
});

describe("display consumers are phase-specific (AC-7.1, AC-7.2)", () => {
  /** The execution lifecycle renderer and the interface it implements. */
  const EXECUTION_PHASE = ["display/execution.ts", "display/types.ts"];
  /** One import point over all phases, for a reader or test that spans them. */
  const CROSS_PHASE_BARREL = "display/terminal.ts";

  it("keeps the engine on the narrow lifecycle interface", async () => {
    const engine = await moduleNamed("execution/engine.ts");
    expect(targetsOf(engine).filter((target) => target.startsWith("display/"))).toEqual(
      ["display/types.ts"],
    );
  });

  it("keeps listing and preflight off the lifecycle and off the barrel", async () => {
    for (const id of ["display/list.ts", "display/preflight.ts", "commands/list.ts"]) {
      const targets = targetsOf(await moduleNamed(id));
      for (const forbidden of [...EXECUTION_PHASE, CROSS_PHASE_BARREL]) {
        expect(targets, `${id} imports ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it("leaves the cross-phase barrel to cross-phase readers", async () => {
    // Nothing in production imports it, and it declares nothing of its own, so
    // it can neither widen a phase's dependencies nor hold behavior a phase's
    // own guards would then miss.
    expect(await importersOf(CROSS_PHASE_BARREL)).toEqual([]);
    const barrel = await moduleNamed(CROSS_PHASE_BARREL);
    const declarations = withoutComments(barrel.source)
      .replace(/export\s+(?:type\s+)?\{[^}]*\}\s*from\s*"[^"]+";/g, "")
      .trim();
    expect(declarations).toBe("");
  });

  it("never lets a renderer persist or advance a checkpoint", async () => {
    for (const module of await productionModules()) {
      if (!module.id.startsWith("display/")) continue;
      expect(module.source, `${module.id} writes state`).not.toMatch(
        /\bwriteCheckpoint\b/,
      );
      for (const target of targetsOf(module)) {
        expect(
          /^(?:execution\/|state\/persist)/.test(target),
          `${module.id} imports ${target}`,
        ).toBe(false);
      }
    }
  });
});

describe("harness adapter families load lazily (AC-5.4, AC-5.5, AC-8.4)", () => {
  /** What resolving a runtime loads: one family's invoker paired with its probe. */
  const ENTRY_ADAPTERS = [
    "harness/sandcastle.ts",
    "harness/probe.ts",
    "harness/scripted/invoker.ts",
    "harness/scripted/probe.ts",
  ];
  /** The fixed case and effect catalog, internal to the scripted family. */
  const SCRIPTED_CASES = "harness/scripted/cases.ts";
  const ADAPTERS = [...ENTRY_ADAPTERS, SCRIPTED_CASES];
  /** The resolver is the one module allowed to name either family. */
  const RESOLVER = "harness/runtime.ts";

  it("gives no concrete adapter a loading importer outside its own family", async () => {
    for (const module of await productionModules()) {
      if (ADAPTERS.includes(module.id)) continue;
      for (const reference of module.references) {
        if (reference.target === null || !ADAPTERS.includes(reference.target)) continue;
        if (reference.typeOnly) continue;
        expect(
          reference.dynamic,
          `${module.id} statically imports ${reference.target}`,
        ).toBe(true);
      }
    }
  });

  it("names both families in the resolver only", async () => {
    const resolver = await moduleNamed(RESOLVER);
    for (const adapter of ENTRY_ADAPTERS) {
      const outside = (await importersOf(adapter)).filter(
        (id) => !ADAPTERS.includes(id),
      );
      expect(outside, `importers of ${adapter}`).toEqual([RESOLVER]);
      // Each family sits behind its own thunk, so resolving one runtime
      // evaluates neither the other family's invoker nor its probe.
      const deferred = resolver.references.some(
        (reference) => reference.target === adapter && reference.dynamic,
      );
      expect(deferred, `${RESOLVER} defers ${adapter}`).toBe(true);
    }
  });

  it("reaches the fixed scripted case catalog through the scripted invoker only", async () => {
    expect(await importersOf(SCRIPTED_CASES)).toEqual(["harness/scripted/invoker.ts"]);
  });

  it("keeps dispatch and the commands free of every concrete adapter", async () => {
    for (const id of ["program.ts", "commands/run.ts", "commands/resume.ts"]) {
      const module = await moduleNamed(id);
      for (const target of targetsOf(module)) {
        expect(ADAPTERS, `${id} imports ${target}`).not.toContain(target);
      }
      expect(module.source, `${id} names an adapter factory`).not.toMatch(
        /\b(?:createSandcastleInvoker|createScriptedInvoker|probeHarnessExecutables|probeScriptedHarnessExecutables)\b/,
      );
    }
  });

  it("keeps the provider SDK behind the real adapter", async () => {
    for (const module of await productionModules()) {
      const packages = module.references.map((reference) => reference.specifier);
      if (module.id === "harness/sandcastle.ts") {
        expect(packages).toContain("@ai-hero/sandcastle");
        continue;
      }
      expect(packages, `${module.id} imports the provider SDK`).not.toContain(
        "@ai-hero/sandcastle",
      );
    }
  });
});
