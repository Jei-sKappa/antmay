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
      "execution/run-state.ts",
    ]);
  });

  it("keeps run's own write to the one allocation write", async () => {
    // Creating the initial `ready` checkpoint is allocation, not a transition of
    // existing state, so it is the one write outside the run's own cursor.
    const run = await moduleNamed("commands/run.ts");
    expect(occurrencesOf(run.source, /\bwriteCheckpoint\(/g)).toBe(1);
  });

  it("routes every transition through the cursor's one persistence boundary", async () => {
    const state = await moduleNamed("execution/run-state.ts");
    // The cursor calls its injectable boundary, never the module function, and
    // that boundary has exactly one call site to stamp and persist through.
    expect(occurrencesOf(state.source, /\bwriteCheckpoint\(/g)).toBe(0);
    expect(occurrencesOf(state.source, /\bpersistCheckpoint\(/g)).toBe(1);
  });

  it("leaves the engine unable to write at all", async () => {
    const engine = await moduleNamed("execution/engine.ts");
    for (const writer of ["writeCheckpoint", "persistCheckpoint"]) {
      expect(
        occurrencesOf(engine.source, new RegExp(`\\b${writer}\\(`, "g")),
      ).toBe(0);
    }
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
    "execution/run-state.ts",
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
    "artifactMismatchesEqual",
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

describe("a pause is built in one module and compared field by field", () => {
  /** The one builder of every pause the executor can record. */
  const BUILDER = "execution/pause.ts";
  /** The module that declares the shape, and so states its keys once. */
  const SCHEMA = "state/checkpoint.ts";

  /**
   * An object literal led by the reason list: the shape of a pause. Only that
   * form matches, which is the form a hand-assembled pause naturally takes —
   * the same trade the harness-id guard makes.
   */
  const PAUSE_LITERAL = /\{\s*(?:\.\.\.[\w$.]+,\s*)?reasons\s*[,:]/;

  it("assembles a pause nowhere else", async () => {
    // A pause is three parts that have to agree — the reasons that explain it,
    // the one recovery that decides its resume, and the instruction the run as a
    // whole carries — so assembling one is a judgement per situation. Spread
    // across the engine, those judgements drift: the same situation gets
    // different wording before an attempt, after one, and on the resume that
    // refreshes it, and no file can be read to learn which pauses exist.
    for (const module of await productionModules()) {
      if (module.id === BUILDER || module.id === SCHEMA) continue;
      expect(
        withoutComments(module.source),
        `${module.id} assembles a pause`,
      ).not.toMatch(PAUSE_LITERAL);
    }
  });

  it("compares two pauses field by field, never by serializing", async () => {
    // `JSON.stringify` equality is key-insertion-order sensitive, so it answers
    // "were these two built the same way", not "do they say the same thing". A
    // pause rebuilt from its fields compares unequal to a byte-identical
    // persisted one, and every unchanged refresh then rewrites the checkpoint
    // and restamps `updatedAt` — which no assertion about content would catch.
    for (const module of await productionModules()) {
      const source = withoutComments(module.source);
      if (module.id.startsWith("execution/")) {
        expect(source, `${module.id} serializes a domain value`).not.toMatch(
          /JSON\.stringify/,
        );
      }
      expect(source, `${module.id} serializes a pause`).not.toMatch(
        /JSON\.stringify\(\s*[\w.]*[Ww]aiting/,
      );
    }
  });

  it("declares the one equality and makes every comparer depend on it", async () => {
    const modules = await productionModules();
    expect(
      modules
        .filter((module) => /^export\s+function\s+waitingEquals\b/m.test(module.source))
        .map((module) => module.id),
    ).toEqual([BUILDER]);
    for (const module of modules) {
      if (module.id === BUILDER || !/\bwaitingEquals\b/.test(module.source)) continue;
      expect(targetsOf(module), `${module.id} names waitingEquals`).toContain(BUILDER);
    }
  });

  it("keeps every builder a pure function of the facts it is handed", async () => {
    // Purity is what lets the whole pause catalog be enumerated and tested from
    // one file: a builder that read the filesystem or the clock could only be
    // exercised by driving the engine to the situation that calls it.
    const builder = await moduleNamed(BUILDER);
    expect(withoutComments(builder.source)).not.toMatch(
      /\b(?:writeCheckpoint|inspectArtifactState|scanPendingQueues|readHead|isWorktreeClean|Date|process)\b/,
    );
    for (const reference of builder.references) {
      expect(
        reference.specifier.startsWith("node:"),
        `${BUILDER} imports ${reference.specifier}`,
      ).toBe(false);
    }
  });
});

describe("durable state changes only by committing a named transition", () => {
  /** The one module that turns a transition into the next checkpoint. */
  const APPLIER = "execution/run-state.ts";
  /** The module that declares the document, and so states its fields once. */
  const SCHEMA = "state/checkpoint.ts";
  /** Writing the first checkpoint of a run is allocation, not a transition. */
  const ALLOCATION = "commands/run.ts";

  /**
   * An object literal that derives a checkpoint from an existing one: led by a
   * spread and carrying a field only a checkpoint has. That is the form a
   * hand-rolled transition naturally takes, and the form the applier owns.
   */
  const CHECKPOINT_DERIVATION =
    /\{\s*\.\.\.[\w$.]+,[^}]*\b(?:condition|stageIndex|attempts)\s*:/;

  it("derives a checkpoint from another checkpoint nowhere else", async () => {
    // A caller that assembles its own next state has to reproduce the invariants
    // the document carries — an appended attempt is the only executing one, a
    // pause and only a pause holds a waiting object, completion is the cursor
    // reaching the stage count — and nothing makes it. Two such callers drift,
    // silently, because every existing case still passes.
    for (const module of await productionModules()) {
      if (module.id === APPLIER) continue;
      expect(
        withoutComments(module.source),
        `${module.id} assembles its own next checkpoint`,
      ).not.toMatch(CHECKPOINT_DERIVATION);
    }
  });

  it("declares the transition vocabulary once, and makes every producer depend on it", async () => {
    const modules = await productionModules();
    expect(
      modules
        .filter((module) => /^export\s+type\s+Transition\b/m.test(module.source))
        .map((module) => module.id),
    ).toEqual([APPLIER]);
    for (const module of modules) {
      if (module.id === APPLIER || !/\bTransition\b/.test(module.source)) continue;
      expect(targetsOf(module), `${module.id} names Transition`).toContain(APPLIER);
    }
  });

  it("stamps updatedAt at allocation and in the applier only", async () => {
    // The stamp is what makes a checkpoint's age mean anything, and it is the
    // half of a write that is easiest to forget. Keeping it to the two modules
    // that may write at all is what keeps "every write is stamped" true by
    // construction rather than by review.
    //
    // Giving the field a value of its own is stamping. Declaring its type and
    // carrying an already-stamped value forward onto a display row are not, so
    // both are read for what they are rather than counted as a second stamp.
    const stamps = (source: string): boolean =>
      [...source.matchAll(/\bupdatedAt\s*:\s*([^,;\n]*)/g)].some((match) => {
        const value = match[1]!.trim();
        return value !== "string" && !/^[\w$.]*\.updatedAt$/.test(value);
      });
    const owners = (await productionModules())
      .filter((module) => stamps(withoutComments(module.source)))
      .map((module) => module.id);
    expect(owners).toEqual([ALLOCATION, APPLIER]);
  });

  it("gives the applier one stamp for its one write", async () => {
    const applier = await moduleNamed(APPLIER);
    expect(occurrencesOf(applier.source, /\bupdatedAt\s*:/g)).toBe(1);
    // The document the stamp lands on is the one the schema declares, so the
    // applier states the fields it moves and never a shape of its own.
    expect(targetsOf(applier)).toContain(SCHEMA);
  });

  it("keeps the applier a pure function of the cursor and the transition", async () => {
    // It reaches the clock and the writer it was handed, and nothing else: a
    // transition that inspected the thread, Git, or the harness could only be
    // exercised by driving the engine to the situation that commits it.
    const applier = await moduleNamed(APPLIER);
    expect(withoutComments(applier.source)).not.toMatch(
      /\b(?:inspectArtifactState|scanPendingQueues|readHead|isWorktreeClean|finalizeGitBoundary|process)\b/,
    );
    for (const target of targetsOf(applier)) {
      expect(
        /^(?:display|harness|runner|gitops|pipeline|thread|config|commands)\//.test(
          target,
        ),
        `${APPLIER} imports ${target}`,
      ).toBe(false);
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

describe("a harness is a provider object, never a literal", () => {
  /** The one declaration of what a harness is. */
  const FACE = "harness/provider.ts";
  /** The one place a harness id is turned into the harness it names. */
  const REGISTRY = "harness/providers/index.ts";
  const PROVIDER_DOMAIN = "harness/providers/";

  /**
   * Comparing an id to a literal is exactly the branch a provider object
   * replaces. Only comparison forms match, so the id union's own declaration
   * and a record keyed by id are both left alone.
   */
  const ID_COMPARISON =
    /(?:[=!]==?\s*|\bcase\s+)["'](?:codex|claude-code)["']|["'](?:codex|claude-code)["']\s*[=!]==?/;

  it("compares a harness id to a literal nowhere outside the providers", async () => {
    // Such a comparison is never exhaustive: `harness === "codex" ? … : …`
    // silently treats every other harness as Claude Code, so a harness added
    // later runs with the wrong trigger, resume command, and executable rather
    // than failing to build.
    for (const module of await productionModules()) {
      if (module.id.startsWith(PROVIDER_DOMAIN)) continue;
      expect(
        withoutComments(module.source),
        `${module.id} branches on a harness id`,
      ).not.toMatch(ID_COMPARISON);
    }
  });

  it("declares the face once, and makes every consumer of it depend on it", async () => {
    const modules = await productionModules();
    const declaration = /^export\s+interface\s+AgentHarness\b/m;
    expect(
      modules.filter((module) => declaration.test(module.source)).map((m) => m.id),
    ).toEqual([FACE]);
    for (const module of modules) {
      if (module.id === FACE || !/\bAgentHarness\b/.test(module.source)) continue;
      expect(targetsOf(module), `${module.id} names AgentHarness`).toContain(FACE);
    }
  });

  it("keeps a provider free of I/O, of packages, and of the backends", async () => {
    // The prompt renderer imports the registry statically and the engine
    // imports the prompt renderer, so anything a provider loads is loaded on
    // every run — including a scripted one that must contact no provider.
    for (const module of await productionModules()) {
      if (!module.id.startsWith(PROVIDER_DOMAIN)) continue;
      for (const reference of module.references) {
        expect(
          reference.target,
          `${module.id} imports ${reference.specifier}`,
        ).not.toBeNull();
        expect(
          /^harness\/(?:backends|scripted)\//.test(reference.target!),
          `${module.id} imports ${reference.target}`,
        ).toBe(false);
      }
    }
  });

  it("reaches a concrete provider through the registry only", async () => {
    for (const module of await productionModules()) {
      if (!module.id.startsWith(PROVIDER_DOMAIN) || module.id === REGISTRY) continue;
      const importers = await importersOf(module.id);
      if (/:\s*AgentHarness\b/.test(module.source)) {
        // A caller that names one harness is a caller that handles that harness
        // and not the others — the hunt the registry exists to remove.
        expect(importers, `importers of ${module.id}`).toEqual([REGISTRY]);
        continue;
      }
      for (const importer of importers) {
        expect(
          importer.startsWith(PROVIDER_DOMAIN),
          `${importer} imports the provider-internal ${module.id}`,
        ).toBe(true);
      }
    }
  });
});

describe("harness adapter families load lazily (AC-5.4, AC-5.5, AC-8.4)", () => {
  /** What resolving a runtime loads: one family's invoker paired with its probe. */
  const ENTRY_ADAPTERS = [
    "harness/backends/sandcastle.ts",
    "harness/backends/probe.ts",
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
      if (module.id === "harness/backends/sandcastle.ts") {
        expect(packages).toContain("@ai-hero/sandcastle");
        continue;
      }
      expect(packages, `${module.id} imports the provider SDK`).not.toContain(
        "@ai-hero/sandcastle",
      );
    }
  });
});
