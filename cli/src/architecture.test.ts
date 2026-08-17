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

/**
 * Which production modules load `target`, sorted. A type-only reference states a
 * dependency direction but loads nothing and can call nothing, so a module that
 * only names another's types is not one of its drivers.
 */
async function driversOf(target: ModuleId): Promise<ModuleId[]> {
  return (await productionModules())
    .filter((module) =>
      module.references.some(
        (reference) => reference.target === target && !reference.typeOnly,
      ),
    )
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

/**
 * Every source-import path from `start` to a specifier matching `forbidden`.
 * Paths follow all relative references, including type-only edges, and stop a
 * branch when it would revisit a module already on that branch.
 */
async function importPathsMatching(
  start: ModuleId,
  forbidden: RegExp,
): Promise<string[][]> {
  const modules = new Map(
    (await productionModules()).map((module) => [module.id, module] as const),
  );
  const matches: string[][] = [];

  function visit(id: ModuleId, path: ModuleId[]): void {
    const module = modules.get(id);
    expect(module, `no production module ${id}`).toBeDefined();
    for (const reference of module!.references) {
      if (forbidden.test(reference.specifier)) {
        matches.push([...path, reference.specifier]);
      }
      if (reference.target === null || path.includes(reference.target)) continue;
      visit(reference.target, [...path, reference.target]);
    }
  }

  visit(start, [start]);
  return matches;
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
      "commands/run/allocate.ts",
      "execution/run-state.ts",
    ]);
  });

  it("keeps allocation's own write to the one initial checkpoint write", async () => {
    // Creating the initial `ready` checkpoint is allocation, not a transition of
    // existing state, so it is the one write outside the run's own cursor.
    const allocate = await moduleNamed("commands/run/allocate.ts");
    // The allocator calls its injectable boundary (defaulting to writeCheckpoint),
    // never scattering additional writer calls.
    expect(occurrencesOf(allocate.source, /\bwriteCheckpoint\(/g)).toBe(0);
    expect(occurrencesOf(allocate.source, /\bpersistInitialCheckpoint\(/g)).toBe(
      1,
    );
  });

  it("routes every transition through the cursor's one persistence boundary", async () => {
    const state = await moduleNamed("execution/run-state.ts");
    // The cursor calls its injectable boundary, never the module function, and
    // that boundary has exactly one call site to stamp and persist through.
    expect(occurrencesOf(state.source, /\bwriteCheckpoint\(/g)).toBe(0);
    expect(occurrencesOf(state.source, /\bpersistCheckpoint\(/g)).toBe(1);
  });

  it("leaves the engine and each of its phases unable to write at all", async () => {
    // The engine is a loop over phase modules, so the property is a domain
    // property: whichever of them moves the run states the transition and lets
    // the cursor decide when that reaches disk.
    for (const module of await productionModules()) {
      if (!module.id.startsWith("execution/")) continue;
      if (module.id === "execution/run-state.ts") continue;
      for (const writer of ["writeCheckpoint", "persistCheckpoint"]) {
        expect(
          occurrencesOf(module.source, new RegExp(`\\b${writer}\\(`, "g")),
          `${module.id} calls ${writer}`,
        ).toBe(0);
      }
    }
  });

  it("leaves the writer a writer", async () => {
    const persist = await moduleNamed("state/persist.ts");
    expect(targetsOf(persist)).toEqual(["state/checkpoint/types.ts"]);
    expect(persist.source).not.toMatch(/\b(?:readCheckpoint|validateCheckpoint)\b/);
  });
});

describe("resume preflight reaches no transition collaborator (AC-1.3)", () => {
  /** Everything the engine owns under the lock. */
  const ENGINE_OWNED = [
    "state/persist.ts",
    "execution/run-state.ts",
    "execution/recovery.ts",
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
    // The engine is several modules, and its entry is the only one a command
    // may reach: a preflight holding a phase could gate on it, which is what
    // would make the pause vocabulary a resume's business again.
    for (const target of targets.filter((id) => id.startsWith("execution/"))) {
      expect(target, `resume imports ${target}`).toBe("execution/engine.ts");
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

  it("keeps the recovery vocabulary and its decision table inside the execution domain", async () => {
    for (const module of ["execution/recovery.ts", "execution/recovery-policy.ts"]) {
      for (const importer of await importersOf(module)) {
        expect(importer.startsWith("execution/"), `${importer} reaches ${module}`).toBe(
          true,
        );
      }
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

  it("offers the execution domain one entry point into that protocol", async () => {
    // The domain names the operation in three places — the injectable seam's
    // type, its default, and the boundary itself — so what the guard pins is
    // the direction: nothing outside the run's own domain finalizes a boundary.
    const namers = await modulesNaming("finalizeGitBoundary");
    expect(namers).toContain("gitops/boundary.ts");
    for (const id of namers) {
      expect(
        id === "gitops/boundary.ts" || id.startsWith("execution/"),
        `${id} names the boundary operation`,
      ).toBe(true);
    }
    // Calling it is finalizing a boundary, and only the two phases that own one
    // do that: the stage's own boundary, and the retry a resume may finalize.
    const callers = (await productionModules())
      .filter((module) =>
        /\bfinalize(?:Git)?Boundary\(/.test(withoutComments(module.source)),
      )
      .map((module) => module.id);
    expect(callers).toEqual([
      "execution/entry/finalize.ts",
      "execution/phases/boundary.ts",
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

describe("the terminal-outcome protocol has one owner", () => {
  /** The one module that declares the tokens, the prefix, and the line form. */
  const OWNER = "runner/outcome.ts";

  /** The protocol vocabulary, by exported name. */
  const VOCABULARY = [
    "TERMINAL_OUTCOMES",
    "DONE_OUTCOME",
    "TerminalOutcome",
    "OUTCOME_PREFIX",
    "isTerminalOutcome",
    "formatTerminalOutcome",
  ];

  /** The three tokens, in the protocol order the owner declares them in. */
  const TOKENS = ["DONE", "BLOCKED", "REFUSED"];

  /**
   * The opening every outcome line carries, matched without its trailing space
   * so a copy that drops or relocates that space is caught with the rest.
   */
  const PREFIX = /Outcome:/;

  /**
   * Every quoted form a string may take, in one alternation so the source is
   * scanned once and in order: a quote character inside another quote's literal
   * is then consumed with it rather than opening a literal of its own.
   */
  const STRING_LITERAL = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

  /** The contents of every string literal in a module, quotes stripped. */
  function stringLiterals(source: string): string[] {
    return [...withoutComments(source).matchAll(STRING_LITERAL)].map((match) =>
      match[0].slice(1, -1),
    );
  }

  /** Which of the tokens a literal spells out as a word. */
  function tokensNamed(literal: string): string[] {
    return TOKENS.filter((token) => new RegExp(`\\b${token}\\b`).test(literal));
  }

  /** Whether a literal embeds a token in prose rather than stating only it. */
  function embedsToken(literal: string): boolean {
    return tokensNamed(literal).some((token) => literal !== token);
  }

  /**
   * Two token literals side by side: joined by `|` they are the union declared a
   * second time, and separated by `,` they are a second runtime collection. Two
   * comparisons joined by `||` put an operand between them, so neither form
   * reaches a test of an already-narrowed token.
   */
  const tokensJoinedBy = (separator: string): RegExp => {
    const token = `["'](?:${TOKENS.join("|")})["']`;
    return new RegExp(`${token}\\s*${separator}\\s*${token}`);
  };
  const TOKEN_UNION = tokensJoinedBy("\\|");
  const TOKEN_COLLECTION = tokensJoinedBy(",");

  it("declares the vocabulary in the owner, and makes every consumer depend on it", async () => {
    const modules = await productionModules();
    for (const name of VOCABULARY) {
      const declaration = new RegExp(
        `^export\\s+(?:type|const|function)\\s+${name}\\b`,
        "m",
      );
      const owners = modules
        .filter((module) => declaration.test(module.source))
        .map((module) => module.id);
      expect(owners, `declarations of ${name}`).toEqual([OWNER]);
    }
    const vocabulary = new RegExp(`\\b(?:${VOCABULARY.join("|")})\\b`);
    for (const module of modules) {
      if (module.id === OWNER || !vocabulary.test(module.source)) continue;
      expect(targetsOf(module), `${module.id} names the vocabulary`).toContain(OWNER);
    }
  });

  it("spells out an outcome line nowhere else", async () => {
    // This is the silent break the owner exists to prevent: a token change leaves
    // a hand-written copy watching for a string that no longer appears, and
    // nothing fails to build. The Sandcastle completion signals are the sharpest
    // case — the SDK stops recognizing completion, the attempt runs to its idle
    // timeout — and the simulated catalog's fabricated final messages are worse
    // placed still, since the demo they turn red sits outside `npm run check`.
    //
    // The prefix is held as tightly as the tokens: a copy assembled one
    // interpolation later, as `Outcome: ${token}`, carries exactly the same risk
    // and would otherwise be a hole in the middle of this rule's own subject.
    for (const module of await productionModules()) {
      if (module.id === OWNER) continue;
      for (const literal of stringLiterals(module.source)) {
        expect(literal, `${module.id} spells out an outcome line`).not.toMatch(PREFIX);
      }
    }
  });

  it("embeds no token in prose and repeats the vocabulary in no type or collection", async () => {
    // A token embedded in prose is another protocol statement: a rename leaves
    // the sentence stale with nothing to fail the build. So is a union
    // redeclaring the tokens, and so is a runtime set or array of them — a
    // `ReadonlySet<string>` most of all, since it accepts whatever the owner no
    // longer recognizes.
    //
    // Two forms are deliberately left outside the subject. A comparison against
    // an already-narrowed token needs no guard: TypeScript rejects a literal that
    // has left the union (TS2367), so the compiler is the guard, and the two
    // `display/execution.ts` labels are outside it for a different reason — they
    // name the `outcome-blocked` and `outcome-refused` event kinds rather than
    // the protocol. Both forms use a literal that is exactly one token, which is
    // why this clause rejects only a token embedded in a larger literal.
    const embedded: string[] = [];
    for (const module of await productionModules()) {
      if (module.id === OWNER) continue;
      const source = withoutComments(module.source);
      for (const literal of stringLiterals(module.source)) {
        if (embedsToken(literal)) embedded.push(`${module.id}: "${literal}"`);
      }
      expect(source, `${module.id} redeclares the token union`).not.toMatch(TOKEN_UNION);
      expect(source, `${module.id} collects the tokens`).not.toMatch(TOKEN_COLLECTION);
    }
    expect(embedded, "embedded terminal-outcome tokens").toEqual([]);
  });

  it("leaves the owner a leaf", async () => {
    // Four domains derive their tokens from this module, and one of them —
    // `runner/classify.ts` — is reached back from `state/`, so the domain graph
    // has a loop in it on paper. A module the build holds to importing nothing
    // can be depended on from anywhere without that loop ever becoming a runtime
    // cycle, which is what makes the owner's placement a naming artifact.
    expect((await moduleNamed(OWNER)).references).toEqual([]);
  });
});

describe("a vocabulary module declares and does nothing", () => {
  /**
   * Each module that exists to say what a shape is, with a type it must declare.
   * The anchor is what proves the guard read the file it names rather than an
   * empty or renamed one.
   */
  const VOCABULARIES: readonly { id: ModuleId; anchor: RegExp }[] = [
    { id: "state/checkpoint/types.ts", anchor: /^export type RunCheckpoint\b/m },
    {
      id: "config/binding/types.ts",
      anchor: /^export type ResolvedStageBinding\b/m,
    },
  ];

  /** The three forms a declarations-only module is made of, and their closers. */
  const DECLARATION =
    /^(?:import\s+type\b|export\s+type\b|export\s+interface\b|[)\]}>])/;

  /** Runtime code, in the forms a declaration cannot take. */
  const EXECUTABLE = /\b(?:const|let|var|function|class|new)\b/;

  it.each(VOCABULARIES)(
    "$id is made of type imports and exported type declarations only",
    async ({ id, anchor }) => {
      // What is worth guarding here is whether the module can run anything at all,
      // rather than which domains its types may name: an allow-list of importable
      // domains needs an edit for every legitimate new type reference and still
      // admits a validator that reaches only allow-listed modules. A module with no
      // value import and no non-type declaration cannot hold one, whatever it names.
      const source = withoutComments((await moduleNamed(id)).source);
      expect(source, `${id} declares the shape it exists for`).toMatch(anchor);
      // Every statement opens at column zero and every continuation of one is
      // indented, so a line starting there either opens a declaration or closes the
      // one above it. Anything else is a statement this module may not hold — a
      // value import, a constant, a function, or a bare call.
      for (const line of source.split("\n")) {
        if (line.trim() === "" || /^\s/.test(line)) continue;
        expect(line, `${id} states more than a declaration`).toMatch(DECLARATION);
      }
      expect(source, `${id} holds runtime code`).not.toMatch(EXECUTABLE);
    },
  );

  it.each(VOCABULARIES)(
    "$id reaches neither the execution nor the display domain",
    async ({ id }) => {
      // The shape is what a phase and a renderer are written in terms of, so a
      // reference in this direction is an inversion: the vocabulary would then
      // depend on one consumer's reading of it.
      for (const target of targetsOf(await moduleNamed(id))) {
        expect(
          /^(?:execution|display)\//.test(target),
          `${id} imports ${target}`,
        ).toBe(false);
      }
    },
  );
});

describe("document validators are transitively filesystem- and path-free", () => {
  const VALIDATORS: readonly ModuleId[] = [
    "config/settings/validate.ts",
    "config/execution-profile/validate.ts",
  ];
  const IDENTITY_LEAVES: readonly ModuleId[] = [
    "config/document-name.ts",
    "pipeline/stage-id.ts",
  ];
  const FILESYSTEM_OR_PATH = /^node:(?:fs|path)(?:\/|$)/;

  it.each(IDENTITY_LEAVES)("$id imports nothing", async (id) => {
    expect((await moduleNamed(id)).references).toEqual([]);
  });

  it.each(VALIDATORS)("$id reaches no filesystem or path builtin", async (id) => {
    const paths = await importPathsMatching(id, FILESYSTEM_OR_PATH);
    expect(
      paths,
      paths.map((path) => path.join(" -> ")).join("\n"),
    ).toEqual([]);
  });
});

describe("a pause is built in one module and compared field by field", () => {
  /** The one builder of every pause the executor can record. */
  const BUILDER = "execution/pause.ts";
  /** The module that declares the shape, and so states its keys once. */
  const SCHEMA = "state/checkpoint/types.ts";

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

describe("every recovery declares the evidence it is decided from", () => {
  /** The one module that says what a recovery is and what deciding one requires. */
  const VOCABULARY = "execution/recovery.ts";
  /** The one module that turns a recovery and its evidence into a directive. */
  const POLICY = "execution/recovery-policy.ts";
  /** The module that reads a recovery out of untrusted JSON, kind by kind. */
  const VALIDATOR = "state/checkpoint/validate.ts";
  /** The one module that observes what a pause is decided from. */
  const OBSERVER = "execution/entry/evidence.ts";

  /** The handshake between the observation and the decision, by exported name. */
  const HANDSHAKE = [
    "QueueEvidence",
    "HeldQueues",
    "WorktreeCleanliness",
    "GitFinalizationFailure",
    "FailedFinalization",
    "PreservedDoneEvidence",
    "RecoveryEvidenceKind",
    "DECIDED_FROM",
    "RecoveryDecidedFrom",
    "FinalizingRecovery",
    "AttemptReferencingRecovery",
    "ClassifiedRecovery",
    "RecoveryCase",
  ];

  /**
   * Comparing a recorded recovery's kind to a literal, in either order. A
   * `case` clause is deliberately not matched: a switch over the union is checked
   * for totality, so adding a kind breaks it, while a comparison is the partial
   * test that silently sends the new kind down an existing branch.
   */
  const KINDS = "retry-stage|resume-finalized-done|recheck-stage-contract|retry-git-finalization";
  const KIND_COMPARISON = new RegExp(
    `[=!]==?\\s*["'](?:${KINDS})["']|["'](?:${KINDS})["']\\s*[=!]==?`,
  );

  it("declares the handshake in one module, and makes every consumer depend on it", async () => {
    const modules = await productionModules();
    for (const name of HANDSHAKE) {
      const declaration = new RegExp(
        `^export\\s+(?:type|const|function)\\s+${name}\\b`,
        "m",
      );
      const owners = modules
        .filter((module) => declaration.test(module.source))
        .map((module) => module.id);
      expect(owners, `declarations of ${name}`).toEqual([VOCABULARY]);
    }
    // Two statements of what a recovery needs are two statements no compiler
    // reconciles: the observer would gather one set and the decision read
    // another, which is the unwritten handshake this vocabulary replaces.
    const handshake = new RegExp(`\\b(?:${HANDSHAKE.join("|")})\\b`);
    for (const module of modules) {
      if (module.id === VOCABULARY || !handshake.test(module.source)) continue;
      expect(targetsOf(module), `${module.id} names part of the handshake`).toContain(
        VOCABULARY,
      );
    }
  });

  it("tests a recovery kind by comparison nowhere outside the validator", async () => {
    // Such a test is never exhaustive: a fifth recovery kind added later takes
    // whichever branch the comparison leaves it, so no evidence is gathered for
    // it or its attempt reference is never resolved — and it fails on a resume in
    // production rather than in this gate. Validating a persisted document is the
    // one place with nothing to be exhaustive over: it reads a raw value that may
    // be any string at all, and has no narrowed union to switch on until it has
    // accepted one. The vocabulary needs no exemption: it keys its table by the
    // kind instead of comparing to one.
    for (const module of await productionModules()) {
      if (module.id === VALIDATOR) continue;
      expect(
        withoutComments(module.source),
        `${module.id} branches on a recovery kind`,
      ).not.toMatch(KIND_COMPARISON);
    }
  });

  it("gives the decision one driver, and keeps the observation independent of it", async () => {
    // One module decides, so "queues come first" and every other precedence in
    // the table is stated once. And the observer cannot see a directive: an
    // observation that branched on what the decision would be is an observation
    // that has started deciding, in the module that reaches Git and the thread.
    expect(await driversOf(POLICY)).toEqual(["execution/entry/recover.ts"]);
    expect(targetsOf(await moduleNamed(OBSERVER)), `${OBSERVER} reaches the policy`)
      .not.toContain(POLICY);
  });

  it("leaves neither pure module able to fail at runtime", async () => {
    // The handshake is closed by types, so there is no input either module has to
    // refuse. A `throw` reappearing is how an author papers over a kind they did
    // not finish wiring: the run then crashes on the resume that reaches it.
    for (const id of [VOCABULARY, POLICY]) {
      expect(
        withoutComments((await moduleNamed(id)).source),
        `${id} can fail at runtime`,
      ).not.toMatch(/\bthrow\b/);
    }
  });
});

describe("durable state changes only by committing a named transition", () => {
  /** The one module that turns a transition into the next checkpoint. */
  const APPLIER = "execution/run-state.ts";
  /** The module that declares the document, and so states its fields once. */
  const SCHEMA = "state/checkpoint/types.ts";
  /** Writing the first checkpoint of a run is allocation, not a transition. */
  const ALLOCATION = "commands/run/allocate.ts";

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

describe("the engine is one loop over named phases", () => {
  /** The loop, and the one module each phase and entry step is driven from. */
  const PHASE_CALLERS: Record<ModuleId, ModuleId> = {
    "execution/phases/queue-gate.ts": "execution/engine.ts",
    "execution/phases/prerequisite.ts": "execution/engine.ts",
    "execution/phases/attempt.ts": "execution/engine.ts",
    "execution/phases/reserve-attempt.ts": "execution/phases/attempt.ts",
    "execution/phases/invoke-harness.ts": "execution/phases/attempt.ts",
    "execution/phases/settlement.ts": "execution/engine.ts",
    "execution/phases/verify-promise.ts": "execution/phases/settlement.ts",
    "execution/phases/boundary.ts": "execution/phases/settlement.ts",
    "execution/phases/commit-settlement.ts": "execution/phases/settlement.ts",
    "execution/entry/recover.ts": "execution/engine.ts",
    "execution/entry/evidence.ts": "execution/entry/recover.ts",
    "execution/entry/refresh.ts": "execution/entry/recover.ts",
    "execution/entry/finalize.ts": "execution/entry/recover.ts",
  };
  /** The one module that states the order above. */
  const LOOP = "execution/engine.ts";
  /** The one module that turns an ending into a value and the event for it. */
  const RESULT = "execution/result.ts";

  it("declares every phase that exists", async () => {
    // A phase file the table does not name is a step of the run nothing above
    // accounts for, whether it is orphaned or driven from somewhere unexpected.
    const onDisk = (await productionModules())
      .map((module) => module.id)
      .filter((id) => /^execution\/(?:phases|entry)\//.test(id));
    expect([...onDisk].sort()).toEqual(Object.keys(PHASE_CALLERS).sort());
  });

  it("drives each phase from exactly the one module that states its place", async () => {
    // What a run does to a stage, in what order, is readable in one file only
    // while each phase has one caller. A second caller is how that reading stops
    // being the truth: the same gate then runs at a point the loop does not show,
    // and the pause/resume bug class this structure exists to close comes back.
    //
    // A phase may still name what an earlier one produced — a settlement is
    // handed the attempt a launch returned — because a type reference invokes
    // nothing and leaves the order above the only one there is.
    for (const [phase, caller] of Object.entries(PHASE_CALLERS)) {
      expect(await driversOf(phase), `drivers of ${phase}`).toEqual([caller]);
    }
  });

  it("lets no phase reach back into the loop", async () => {
    for (const phase of Object.keys(PHASE_CALLERS)) {
      expect(
        targetsOf(await moduleNamed(phase)),
        `${phase} reaches the loop`,
      ).not.toContain(LOOP);
    }
  });

  it("keeps the loop free of every collaborator a phase drives", async () => {
    // The loop states the order and does none of the work, so it reaches its own
    // domain and nothing else. The queue scanner, artifact inspector, harness
    // invoker, log writer, Git boundary, classifier, and pause builder are each
    // reachable only from the phase that owns them — which is what stops the
    // loop from re-absorbing them one import at a time.
    const loop = await moduleNamed(LOOP);
    for (const reference of loop.references) {
      expect(
        reference.target,
        `the loop imports ${reference.specifier}`,
      ).not.toBeNull();
      expect(
        reference.target!.startsWith("execution/"),
        `the loop imports ${reference.target}`,
      ).toBe(true);
    }
  });

  it("ends an invocation in one module", async () => {
    // Every ending is a value the command maps to an exit code *and* an event the
    // terminal is owed, and the two are only correct together: a pause nothing
    // rendered exits 2 with a blank screen, and a fatal write failure nothing
    // rendered ends the run with no explanation. With fifteen modules able to
    // return one, no assertion about a returned value would catch the omission.
    //
    // `interrupted` is left out of the literal check on purpose: a waiting reason
    // and a settled attempt's failure both legitimately carry that kind, so it is
    // held by the type rule below instead — the same trade the pause guard makes.
    const ENDING = /\bkind:\s*"(?:completed|paused|refused|fatal-checkpoint)"/;
    const modules = await productionModules();
    for (const module of modules) {
      if (module.id === RESULT || !module.id.startsWith("execution/")) continue;
      expect(
        withoutComments(module.source),
        `${module.id} ends an invocation`,
      ).not.toMatch(ENDING);
    }
    expect(
      modules
        .filter((module) =>
          /^export\s+type\s+ExecutionResult\b/m.test(module.source),
        )
        .map((module) => module.id),
    ).toEqual([RESULT]);
    for (const module of modules) {
      if (module.id === RESULT || !/\bExecutionResult\b/.test(module.source)) continue;
      expect(targetsOf(module), `${module.id} names ExecutionResult`).toContain(
        RESULT,
      );
    }
  });
});

describe("the bootstrap loads nothing ahead of the Node guard", () => {
  it("reaches exactly its two modules, and reaches both lazily", async () => {
    // The guard is only genuinely first if every application module the
    // bootstrap names loads after it, which a static import would defeat. The
    // second assertion is what keeps that true as the file grows: reaching for
    // one more constant here fails the build instead of quietly moving a module
    // ahead of the version check it exists to run before.
    const bootstrap = await moduleNamed("main.ts");
    for (const reference of bootstrap.references) {
      if (reference.target === null || reference.typeOnly) continue;
      expect(
        reference.dynamic,
        `main.ts statically imports ${reference.target}`,
      ).toBe(true);
    }
    expect(targetsOf(bootstrap).sort()).toEqual([
      "display/crash.ts",
      "program.ts",
    ]);
  });
});

describe("display consumers are phase-specific (AC-7.1, AC-7.2)", () => {
  /** The execution lifecycle renderer and the interface it implements. */
  const EXECUTION_PHASE = ["display/execution.ts", "display/types.ts"];
  /** One import point over all phases, for a reader or test that spans them. */
  const CROSS_PHASE_BARREL = "display/terminal.ts";

  it("keeps the execution domain on the narrow lifecycle interface", async () => {
    // The engine is a loop over phase modules, several of which draw something,
    // so the property is a domain property: each reaches the interface and never
    // a concrete renderer or another phase's entry point.
    for (const module of await productionModules()) {
      if (!module.id.startsWith("execution/")) continue;
      for (const target of targetsOf(module)) {
        if (!target.startsWith("display/")) continue;
        expect(target, `${module.id} reaches a display phase`).toBe(
          "display/types.ts",
        );
      }
    }
    expect(await importersOf("display/types.ts")).toContain("execution/context.ts");
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

describe("harness identity has one owner", () => {
  /** The one module that declares which harnesses exist. */
  const OWNER = "harness/id.ts";

  /** The identity vocabulary, by exported name. */
  const VOCABULARY = ["HarnessId", "HARNESS_IDS", "isHarnessId"];

  /** The ids themselves, in the order the owner declares them in. */
  const IDS = ["codex", "claude-code"];

  /**
   * Two id literals side by side: joined by `|` they are the union stated a
   * second time, and separated by `,` they are a second runtime collection.
   */
  const idsJoinedBy = (separator: string): RegExp => {
    const id = `["'](?:${IDS.join("|")})["']`;
    return new RegExp(`${id}\\s*${separator}\\s*${id}`);
  };
  const ID_UNION = idsJoinedBy("\\|");
  const ID_COLLECTION = idsJoinedBy(",");

  it("declares the vocabulary in the owner, and makes every consumer depend on it", async () => {
    const modules = await productionModules();
    for (const name of VOCABULARY) {
      const declaration = new RegExp(
        `^export\\s+(?:type|const|function)\\s+${name}\\b`,
        "m",
      );
      const owners = modules
        .filter((module) => declaration.test(module.source))
        .map((module) => module.id);
      expect(owners, `declarations of ${name}`).toEqual([OWNER]);
    }
    const vocabulary = new RegExp(`\\b(?:${VOCABULARY.join("|")})\\b`);
    for (const module of modules) {
      if (module.id === OWNER || !vocabulary.test(module.source)) continue;
      expect(targetsOf(module), `${module.id} names the vocabulary`).toContain(OWNER);
    }
  });

  it("repeats the ids in no second union or collection", async () => {
    // A hand-written union or list of the ids is another statement of which
    // harnesses exist, and a third harness leaves it stale with nothing to fail
    // the build — the diagnostic that names the supported ids keeps naming two.
    //
    // Only declaration forms are the subject here. A comparison against an id is
    // the neighbouring rule's, and whether the provider registry covers every id
    // is `harness/providers/index.test.ts`'s; both leave a second declaration
    // undetected, which is what this clause is for.
    for (const module of await productionModules()) {
      if (module.id === OWNER) continue;
      const source = withoutComments(module.source);
      expect(source, `${module.id} redeclares the id union`).not.toMatch(ID_UNION);
      expect(source, `${module.id} collects the ids`).not.toMatch(ID_COLLECTION);
    }
  });

  it("leaves the owner a leaf", async () => {
    // `harness/provider.ts` names the id union, so an import in the other
    // direction is a cycle between what a harness is and which ones exist. A
    // module the build holds to importing nothing can be depended on from the
    // settings parser, the checkpoint validator, and the harness domain alike.
    expect((await moduleNamed(OWNER)).references).toEqual([]);
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

  it("keeps a provider free of I/O, of packages, and of the adapters", async () => {
    // The prompt renderer imports the registry statically and the engine
    // imports the prompt renderer, so anything a provider loads is loaded on
    // every run — including a simulated one that must contact no provider.
    for (const module of await productionModules()) {
      if (!module.id.startsWith(PROVIDER_DOMAIN)) continue;
      for (const reference of module.references) {
        expect(
          reference.target,
          `${module.id} imports ${reference.specifier}`,
        ).not.toBeNull();
        expect(
          /^harness\/adapters\//.test(reference.target!),
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
  /**
   * What resolving a runtime loads: one family's entry points — its invoker
   * paired with its probe, and, for the simulated family, the read of the live
   * scenario its invoker is built over.
   */
  const ENTRY_ADAPTERS = [
    "harness/adapters/real/sandcastle.ts",
    "harness/adapters/real/probe.ts",
    "harness/adapters/simulated/invoker.ts",
    "harness/adapters/simulated/probe.ts",
    "harness/adapters/simulated/scenario.ts",
  ];
  /** The fixed case and effect catalog, internal to the simulated family. */
  const SIMULATED_CASES = "harness/adapters/simulated/cases.ts";
  const ADAPTERS = [...ENTRY_ADAPTERS, SIMULATED_CASES];
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
      // evaluates no entry point of the other.
      const deferred = resolver.references.some(
        (reference) => reference.target === adapter && reference.dynamic,
      );
      expect(deferred, `${RESOLVER} defers ${adapter}`).toBe(true);
    }
  });

  it("reaches the fixed simulated case catalog through the simulated invoker only", async () => {
    expect(await importersOf(SIMULATED_CASES)).toEqual(["harness/adapters/simulated/invoker.ts"]);
  });

  it("keeps dispatch and the commands free of every concrete adapter", async () => {
    for (const id of ["program.ts", "commands/run.ts", "commands/resume.ts"]) {
      const module = await moduleNamed(id);
      for (const target of targetsOf(module)) {
        expect(ADAPTERS, `${id} imports ${target}`).not.toContain(target);
      }
      expect(module.source, `${id} names an adapter factory`).not.toMatch(
        /\b(?:createSandcastleInvoker|createSimulatedInvoker|probeHarnessExecutables|probeSimulatedHarnessExecutables)\b/,
      );
    }
  });

  it("keeps the provider SDK behind the real adapter", async () => {
    for (const module of await productionModules()) {
      const packages = module.references.map((reference) => reference.specifier);
      if (module.id === "harness/adapters/real/sandcastle.ts") {
        expect(packages).toContain("@ai-hero/sandcastle");
        continue;
      }
      expect(packages, `${module.id} imports the provider SDK`).not.toContain(
        "@ai-hero/sandcastle",
      );
    }
  });
});

describe("commands are one sequence over named steps", () => {
  /**
   * Every production module under either command preflight tree, plus the run
   * allocation transaction and the resume lock acquisition collaborator. Each
   * value is the one module allowed to drive that step.
   */
  const COMMAND_STEP_CALLERS: Record<ModuleId, ModuleId> = {
    "commands/run/preflight/resolve-roots.ts": "commands/run.ts",
    "commands/run/preflight/load-pipeline.ts": "commands/run.ts",
    "commands/run/preflight/load-profile.ts": "commands/run.ts",
    "commands/run/preflight/load-settings.ts": "commands/run.ts",
    "commands/run/preflight/resolve-thread.ts": "commands/run.ts",
    "commands/run/preflight/inspect-artifacts.ts": "commands/run.ts",
    "commands/run/preflight/compose-pipeline.ts": "commands/run.ts",
    "commands/run/preflight/snapshot-stages.ts": "commands/run.ts",
    "commands/run/preflight/resolve-runtime.ts": "commands/run.ts",
    "commands/run/preflight/check-temporary-workspaces.ts": "commands/run.ts",
    "commands/run/preflight/require-clean-worktree.ts": "commands/run.ts",
    "commands/run/preflight/scan-pending-queues.ts": "commands/run.ts",
    "commands/run/preflight/find-unfinished-run.ts": "commands/run.ts",
    "commands/run/allocate.ts": "commands/run.ts",
    "commands/resume/preflight/resolve-state-root.ts": "commands/resume.ts",
    "commands/resume/preflight/locate-run.ts": "commands/resume.ts",
    "commands/resume/preflight/load-checkpoint.ts": "commands/resume.ts",
    "commands/resume/preflight/require-incomplete.ts": "commands/resume.ts",
    "commands/resume/preflight/revalidate-thread.ts": "commands/resume.ts",
    "commands/resume/preflight/resolve-runtime.ts": "commands/resume.ts",
    "commands/resume/preflight/validate-workspace.ts": "commands/resume.ts",
    "commands/resume/preflight/check-temporary-workspaces.ts": "commands/resume.ts",
    "commands/resume/acquire-lock.ts": "commands/resume.ts",
  };

  const RUN_ORCHESTRATOR = "commands/run.ts";
  const RESUME_ORCHESTRATOR = "commands/resume.ts";
  const ORCHESTRATORS = [RUN_ORCHESTRATOR, RESUME_ORCHESTRATOR] as const;
  const ALLOCATION = "commands/run/allocate.ts";
  const RESUME_ACQUIRE = "commands/resume/acquire-lock.ts";
  const RUNTIME_STEPS = [
    "commands/run/preflight/resolve-runtime.ts",
    "commands/resume/preflight/resolve-runtime.ts",
  ] as const;

  /** Lifecycle and presentation the orchestrators alone may reach. */
  const COMMAND_OWNED_IMPORTS = new Set([
    "cli/exit-codes.ts",
    "display/execution.ts",
    "display/format.ts",
    "display/preflight.ts",
    "display/startup.ts",
    "execution/engine.ts",
    "runner/signals.ts",
  ]);

  /** Modules a step must never load: exits, renderers, signals, or the engine. */
  const STEP_FORBIDDEN_IMPORTS = [
    "cli/exit-codes.ts",
    "display/execution.ts",
    "display/preflight.ts",
    "display/startup.ts",
    "display/list.ts",
    "display/terminal.ts",
    "runner/signals.ts",
    "execution/engine.ts",
    ...ORCHESTRATORS,
  ];

  /**
   * A selected exit or an executable presentation callback on a refusal. Either
   * would pull command control flow into the step that only returns facts.
   */
  const REFUSAL_CONTROL =
    /\b(?:exitCode|EXIT_(?:OK|FAILURE|WAITING|SIGINT|SIGTERM|SIGHUP))\b|\b(?:render|print)[A-Z]\w*\s*[:=]|\bon(?:Print|Render|Refuse)\w*\s*[:=]/;

  /** Value imports a module loads under `src/`, excluding type-only references. */
  function loadedTargets(module: ProductionModule): ModuleId[] {
    return module.references.flatMap((reference) =>
      reference.target !== null && !reference.typeOnly ? [reference.target] : [],
    );
  }

  it("declares every command step that exists", async () => {
    // A preflight, allocation, or acquisition file the table does not name is a
    // step of a command nothing above accounts for — orphaned, skipped, or driven
    // from somewhere unexpected. A duplicate key is unrepresentable in the table;
    // a removed row surfaces here as an undeclared file on disk.
    const onDisk = (await productionModules())
      .map((module) => module.id)
      .filter(
        (id) =>
          /^commands\/(?:run|resume)\/preflight\//.test(id) ||
          id === ALLOCATION ||
          id === RESUME_ACQUIRE,
      );
    expect([...onDisk].sort()).toEqual(Object.keys(COMMAND_STEP_CALLERS).sort());
  });

  it("drives each step from exactly the one module that owns its place", async () => {
    for (const [step, caller] of Object.entries(COMMAND_STEP_CALLERS)) {
      expect(await driversOf(step), `drivers of ${step}`).toEqual([caller]);
    }
  });

  it("keeps allocation and resume acquisition separate single-called collaborators", async () => {
    expect(await driversOf(ALLOCATION)).toEqual([RUN_ORCHESTRATOR]);
    expect(await driversOf(RESUME_ACQUIRE)).toEqual([RESUME_ORCHESTRATOR]);
    expect(targetsOf(await moduleNamed(ALLOCATION))).not.toContain(RESUME_ACQUIRE);
    expect(targetsOf(await moduleNamed(RESUME_ACQUIRE))).not.toContain(ALLOCATION);
  });

  it("lets no step invoke another step or reach back into an orchestrator", async () => {
    const steps = new Set(Object.keys(COMMAND_STEP_CALLERS));
    for (const step of steps) {
      const targets = targetsOf(await moduleNamed(step));
      for (const target of targets) {
        expect(
          steps.has(target),
          `${step} imports another command step ${target}`,
        ).toBe(false);
        expect(
          ORCHESTRATORS.includes(target as (typeof ORCHESTRATORS)[number]),
          `${step} reaches the orchestrator ${target}`,
        ).toBe(false);
      }
    }
  });

  it("keeps steps free of exits, renderers, signals, and the engine", async () => {
    for (const step of Object.keys(COMMAND_STEP_CALLERS)) {
      const targets = loadedTargets(await moduleNamed(step));
      for (const forbidden of STEP_FORBIDDEN_IMPORTS) {
        expect(targets, `${step} imports ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it("keeps refusals inert data with no selected exit or renderer callback", async () => {
    // The command selects the exit and the renderer; a step that returned either
    // would own presentation and stop being a fact producer.
    for (const id of [
      ...Object.keys(COMMAND_STEP_CALLERS),
      "commands/run/types.ts",
      "commands/resume/types.ts",
    ]) {
      expect(
        withoutComments((await moduleNamed(id)).source),
        `${id} embeds exit or renderer control in a refusal`,
      ).not.toMatch(REFUSAL_CONTROL);
    }
  });

  it("lets runtime steps accept only a pass-through simulated-prompt observer", async () => {
    // The command owns the observer that prints; the step forwards it to the
    // resolver and never defines or invokes presentation of its own.
    for (const id of RUNTIME_STEPS) {
      const source = withoutComments((await moduleNamed(id)).source);
      expect(source, `${id} accepts the observer`).toMatch(/\bonSimulatedPrompt\b/);
      expect(source, `${id} invokes presentation`).not.toMatch(
        /\b(?:print[A-Z]\w*|createTerminalExecutionDisplay)\s*\(/,
      );
    }
  });

  it("rejects orchestrator leakage of step-owned leaf collaborators", async () => {
    // A leaf assigned to an extracted step must not reappear as a direct
    // orchestrator import: that is how the step boundary dissolves one collaborator
    // at a time. Command-owned lifecycle and presentation imports stay permitted.
    for (const orchestratorId of ORCHESTRATORS) {
      const ownedLeaves = new Set<ModuleId>();
      for (const [step, caller] of Object.entries(COMMAND_STEP_CALLERS)) {
        if (caller !== orchestratorId) continue;
        for (const target of loadedTargets(await moduleNamed(step))) {
          if (target.startsWith("commands/")) continue;
          ownedLeaves.add(target);
        }
      }
      const orchestrator = await moduleNamed(orchestratorId);
      for (const target of loadedTargets(orchestrator)) {
        if (COMMAND_OWNED_IMPORTS.has(target)) continue;
        if (COMMAND_STEP_CALLERS[target] === orchestratorId) continue;
        expect(
          ownedLeaves.has(target),
          `${orchestratorId} reaches step-owned leaf ${target}`,
        ).toBe(false);
      }
    }
  });
});
