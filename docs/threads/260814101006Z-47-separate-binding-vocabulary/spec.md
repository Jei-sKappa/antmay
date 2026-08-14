# Separate the local binding vocabulary from the documents that carry it

## Intended outcome

The CLI's local execution-binding code is separated into modules that each state one reason to change, so that a consumer's import list says what it depends on. After this work, a reader following the checkpoint's `ResolvedStageBinding` lands in a file that provably cannot read a file or run anything; a reader asking what a stage binding may contain finds one schema module; and each of the two local documents — `settings.json` and an execution profile — has its own envelope validation separated from its own disk access.

Nothing a user can observe changes. Every document shape accepted today is still accepted, every shape rejected today is still rejected with the same message in the same order, and the rule that binds a selected stage to exactly one source document is untouched.

## Context

`cli/src/config/execution.ts` is one module of roughly 487 lines carrying four things that change for different reasons: the local binding vocabulary together with the intrinsic timing defaults, the strict `settings.json` schema, the strict execution-profile schema, and the rule that resolves one selected stage's complete binding from those two sources.

Two signals, rather than the line count, motivate the separation.

The consumers are already one per concern while the module they read from is not. The run preflight tree was decomposed along exactly this seam: `commands/run/preflight/load-settings.ts` wants `loadStageSettings`, `load-profile.ts` wants `loadExecutionProfile`, and `snapshot-stages.ts` wants `resolveStageBindings`. Each imports one function and gets a module that also reads files, validates two unrelated document schemas, and declares the vocabulary.

The checkpoint vocabulary reaches this module for a declaration alone. `cli/src/state/checkpoint/types.ts` imports `ResolvedStageBinding` from it. That import is type-only and `architecture.test.ts` holds the checkpoint vocabulary to type imports and type declarations, so no guard is violated today — but a reader following the checkpoint's own binding type lands in a module that calls `fs.readFileSync`.

This is maintainability work behind no active defect. The external tracking issue is <https://github.com/Jei-sKappa/antmay/issues/47>; `seed.md` carries the thread's own account, and `decisions.md` carries the settled design this spec encodes.

## Scope

In scope, all within `cli/`:

- Replacing `src/config/execution.ts` with seven modules across three folders, and splitting `src/config/execution.test.ts` to follow them.
- Updating the five modules that import `config/execution.js` today: `src/state/checkpoint/types.ts`, the three run preflight steps (`load-settings.ts`, `load-profile.ts`, `snapshot-stages.ts`), and `src/pipeline/documentation.test.ts`.
- Generalizing the declarations-only guard in `src/architecture.test.ts` to cover the new vocabulary module as well as the checkpoint's.
- Two edits to `cli/AGENTS.md`.

Out of scope:

- **Any schema change to either document**, including renaming a key, adding or removing a field, and relaxing unknown-field rejection.
- **Changing which source document wins**, or introducing any field-level merge between the two.
- **Changing the intrinsic timing default values.**
- **Harness identity ownership**, which issue #45 covers.
- **Decomposition motivated by a line-count target** rather than by a distinct reason to change — this applies inside the new modules too (per `decisions.md` DR3).
- **`cli/README.md`, including its stage-support table, and the demo scenario catalog** (per `decisions.md` DR8).
- **Renaming the exported loader functions** `loadStageSettings` and `loadExecutionProfile` (per `decisions.md` DR7).

## Expected behavior

### Module structure

Seven modules replace `config/execution.ts`, which ceases to exist (per `decisions.md` DR4, with file naming amended by DR7):

| Module | Holds |
| --- | --- |
| `src/config/binding/types.ts` | every binding type declaration, and nothing executable |
| `src/config/binding/schema.ts` | the stage-binding schema both documents accept |
| `src/config/binding/resolve.ts` | the two intrinsic timing defaults and per-stage binding resolution |
| `src/config/settings/validate.ts` | the settings envelope, over an already-parsed root |
| `src/config/settings/load.ts` | reading, parsing, and the settings document's disk semantics |
| `src/config/execution-profile/validate.ts` | the profile envelope, over an already-parsed root |
| `src/config/execution-profile/load.ts` | reading, parsing, and the profile document's disk semantics |

No barrel, index, or re-export spans the split; every consumer imports the one module it needs.

`binding/types.ts` declares `AgentBinding`, `StageBinding`, `StageBindingMap`, `ExecutionProfile`, `ResolvedStageBinding`, the three existing result types, and the outcome unions the two document validators return (per DR1 and DR7). It contains type imports and exported type declarations only — no constant, function, class, or value import — matching the form `state/checkpoint/types.ts` takes. `DEFAULT_IDLE_TIMEOUT_SECONDS` and `DEFAULT_HEARTBEAT_SECONDS` are not in it; they live in `binding/resolve.ts`, next to the fallbacks that apply them (per DR1).

`binding/schema.ts` holds the four validators that today are private to `config/execution.ts` — the agent pair, the optional timing fields, one binding, and a map of bindings — as one module, not split by function or depth (per DR3). It holds no opinion about whether a stage map may be empty, and takes no `requireNonEmpty` flag: each document applies its own emptiness rule at its own call site (per DR2).

### Document validation and loading

Each document validator takes an already-parsed root and returns a discriminated union — no `errors: string[]` out-parameter, no partial value returned alongside a separate error list (per DR7). Neither validator touches the filesystem.

Each loader reads its path, parses JSON, delegates to its validator, and applies its own disk semantics and failure shape:

- **Settings.** `loadStageSettings(configRoot)` reads only `<config-root>/settings.json` and creates no file. A missing file succeeds as the canonical empty document `{"afk":{"stages":{}}}`. A present file is validated strictly, and every discoverable problem is reported together against the resolved path. No environment interpolation is performed. The failure result carries `sourcePath`, because the loader is the only party that knows it.
- **Execution profile.** `loadExecutionProfile(sourcePath)` reads exactly the absolute path it is given. A missing document there is an error naming that path, never a prompt to search elsewhere. Its failure result carries no `sourcePath`; `load-profile.ts` continues to use the reference's own resolved path in its refusal.

### Behavior held fixed

Across all three entry points, the following are unchanged in every respect a caller or a user can observe:

- Which documents are accepted and which are rejected.
- Every diagnostic's exact wording and the order diagnostics are reported in.
- A selected stage takes its whole binding from one source document — the profile when the profile binds it, settings otherwise. Fields never merge across the two, so a profile entry inherits neither a settings timing value nor a settings harness.
- Only the intrinsic defaults fill an omitted timing field, and those defaults keep their current values.
- Harness and model remain one indivisible validated pair.
- A selected stage bound by neither source is an error naming that stage, and every such stage is reported together.

### Consumers

`state/checkpoint/types.ts` imports `ResolvedStageBinding` from `config/binding/types.js`, so the checkpoint vocabulary reaches no module that performs I/O. Each preflight step imports the one module whose function it calls — `settings/load.js`, `execution-profile/load.js`, `binding/resolve.js` respectively — plus `binding/types.js` for the map type it names. `pipeline/documentation.test.ts` imports each loader from its own module.

### Guard

The declarations-only block in `src/architecture.test.ts` is generalized to run over a set of vocabulary modules holding both `state/checkpoint/types.ts` and `config/binding/types.ts`, rather than gaining a second block (per DR5). Each module keeps an anchor assertion naming a type it must declare, so the guard still proves which file it read, and the execution/display inversion check applies to both.

### Tests

`config/execution.test.ts` divides to follow the modules (per DR6). The fifteen-case schema table runs once, directly against the shared validator with no filesystem, and absorbs both of today's catalog-stage-coverage cases. Each document's validator test covers its envelope plus a small number of cases asserting the field path its diagnostics carry, proving it delegates to the shared schema at the right base path. Each document's loader test covers missing-file semantics, JSON syntax errors, and the failure shape loading produces. Resolution is tested beside `binding/resolve.ts`.

### Documentation

Two edits to `cli/AGENTS.md` (per DR8):

- The "Local bindings" bullet under "Execution model" points at `config/binding/resolve.ts`.
- The `config/` entry in the module layout names the three folders rather than the seven files, and carries the two facts a directory listing cannot give: that the binding vocabulary declares and does nothing, so the checkpoint can name a resolved binding without reaching a document loader, and that both documents validate their stage maps through one shared schema, which is what keeps their diagnostics from drifting apart.

The guard's contract line in the same file is reworded from the singular to describe the generalized guard (per DR5).

## Constraints

- **Diagnostic wording and order are a contract, not an implementation detail.** They are the reason both documents must share one schema module: duplicated validation is how two documents' messages drift apart.
- **The emptiness rule must move without moving a diagnostic.** An empty stage map produces no per-key diagnostics, which is what lets each document apply its own emptiness check at its own call site while preserving order; an implementation that reorders anything here has broken the contract.
- **`config/binding/types.ts` must remain executable-free**, since the generalized guard reads its source text and rejects a value import, a constant, a function, a class, or a `new`.
- **`architecture.test.ts` reads source text and judges static, dynamic, re-export, and type-only imports for what they are.** When it fails, the boundary moved — argue the direction rather than relaxing the guard.
- **No barrel, index, or re-export may span the split**, including as a convenience for the preflight steps.
- **The CLI is pre-release with no backward-compatibility obligation**, but that licenses redesign, not disrepair: `npm --prefix cli run check` must pass — no failing tests, no type errors, no half-migrated code.
- **Do not stage, commit, or push** as part of this spec's implementation beyond what the repository's own workflow directs.

## Acceptance criteria

### FR-1 — The seven modules exist in their settled locations

- **AC-1.1** `cli/src/config/execution.ts` and `cli/src/config/execution.test.ts` no longer exist.
- **AC-1.2** All seven modules named in the Expected behavior table exist at exactly those paths (DR4, DR7).
- **AC-1.3** No file under `cli/src/config/` re-exports a symbol declared in another module, and no `index.ts` exists under `binding/`, `settings/`, or `execution-profile/` (DR4).

### FR-2 — The binding vocabulary declares and does nothing

- **AC-2.1** `config/binding/types.ts` contains only type imports and exported type declarations: no value import, `const`, `let`, `var`, `function`, `class`, or `new` (DR1).
- **AC-2.2** `DEFAULT_IDLE_TIMEOUT_SECONDS` and `DEFAULT_HEARTBEAT_SECONDS` are declared in `config/binding/resolve.ts` and nowhere else, and their values are `86_400` and `300` (DR1).
- **AC-2.3** The declarations-only block in `architecture.test.ts` covers both `state/checkpoint/types.ts` and `config/binding/types.ts`, and there is exactly one such block (DR5).
- **AC-2.4** Introducing a `const` into `config/binding/types.ts` fails `architecture.test.ts`. (Verify by temporary edit; do not commit it.)
- **AC-2.5** `state/checkpoint/types.ts` imports `ResolvedStageBinding` from `config/binding/types.js`, and imports nothing from any module that touches `node:fs`.

### FR-3 — One shared stage-binding schema, with no emptiness opinion

- **AC-3.1** The agent, timing-field, binding, and stage-map validators are all declared in `config/binding/schema.ts` (DR3).
- **AC-3.2** No exported or internal function in `config/binding/schema.ts` takes a boolean parameter governing emptiness; the `requireNonEmpty` flag is gone (DR2).
- **AC-3.3** Both `config/settings/validate.ts` and `config/execution-profile/validate.ts` reach the stage-map schema through `config/binding/schema.js`, and neither declares a validator for the agent pair, the timing fields, a binding, or a stage map.

### FR-4 — Validators are pure and return a union

- **AC-4.1** Neither document validator imports `node:fs` or `node:path`, directly or transitively.
- **AC-4.2** Each document validator takes a parsed root and returns a discriminated union; no validator signature takes an `errors: string[]` parameter (DR7).
- **AC-4.3** The profile validator and `loadExecutionProfile` return the same profile result union (DR7).
- **AC-4.4** The settings validator returns a union carrying the stage map or the errors, and `loadStageSettings` returns that outcome with `sourcePath` attached on failure (DR7).
- **AC-4.5** The unions both validators return are declared in `config/binding/types.ts` (DR7).

### FR-5 — Loader disk semantics are unchanged

- **AC-5.1** With no `settings.json` present, `loadStageSettings` succeeds with an empty stage map and creates no file at any path under the config root.
- **AC-5.2** `loadStageSettings` reads no path other than `<config-root>/settings.json`, and performs no environment interpolation.
- **AC-5.3** A malformed present `settings.json` fails with `sourcePath` set to the resolved path and reports every discoverable problem in one result.
- **AC-5.4** `loadExecutionProfile` on a path with no document fails with an error naming that exact path, and reads no other path.
- **AC-5.5** A JSON syntax error in either document produces the same message it produces today, naming the source path.

### FR-6 — Resolution is unchanged

- **AC-6.1** A selected stage bound by the profile takes its whole binding from the profile entry, inheriting no timing value and no harness from a settings entry for the same stage.
- **AC-6.2** A selected stage the profile does not bind takes its whole binding from settings.
- **AC-6.3** An omitted `idleTimeoutSeconds` resolves to `86_400` and an omitted `heartbeatSeconds` to `300`; explicit values are carried through unchanged.
- **AC-6.4** When one or more selected stages are bound by neither source, the failure names every such stage, and the message distinguishes the no-profile-selected case from the profile-selected case exactly as it does today.

### FR-7 — Consumers import narrowly

- **AC-7.1** No file in `cli/src/` imports from `config/execution.js`.
- **AC-7.2** `load-settings.ts` imports its function from `config/settings/load.js`, `load-profile.ts` from `config/execution-profile/load.js`, and `snapshot-stages.ts` from `config/binding/resolve.js`; each imports the types it names from `config/binding/types.js`.
- **AC-7.3** `pipeline/documentation.test.ts` imports each loader from that loader's own module.
- **AC-7.4** No preflight step imports a document schema, a validator, or a loader it does not call.

### FR-8 — Observable behavior is byte-identical

- **AC-8.1** Every document shape accepted before the change is accepted after it, and every shape rejected before is rejected after, for both documents.
- **AC-8.2** For a document producing multiple diagnostics, the messages and their order are identical to those produced before the change — verified for at least one multi-problem settings document and one multi-problem profile document.
- **AC-8.3** An execution profile whose `stages` is present but empty produces exactly the one diagnostic it produces today, in the same position among that document's diagnostics (DR2).
- **AC-8.4** A settings document binding zero stages is accepted.
- **AC-8.5** A binding naming an unknown stage ID invalidates its document, with the same message as today, and the binding's own problems are still reported alongside.

### FR-9 — Tests follow the modules

- **AC-9.1** Each of the six modules that hold behavior — the shared schema, both document validators, both loaders, and resolution — has its test co-located beside it, and no test file spans two of them. `config/binding/types.ts` declares no behavior to test; `architecture.test.ts` is what holds it to its contract (DR5, DR6).
- **AC-9.2** The shared schema case table runs once, against the schema validator, and writes no file to disk (DR6).
- **AC-9.3** Both of today's catalog-stage-coverage cases live in the schema test (DR6).
- **AC-9.4** Each document validator test asserts the base path its diagnostics carry — `afk.stages.<stage>.…` for settings, `stages.<stage>.…` for a profile (DR6).
- **AC-9.5** Every case in today's `config/execution.test.ts` has a counterpart in the split tests, or its removal is accounted for by DR6's retirement of the twin-run.

### FR-10 — Documentation matches the code

- **AC-10.1** No file under `cli/` refers to `config/execution.ts` (`display/execution.ts` references are unrelated and stay).
- **AC-10.2** The "Local bindings" bullet in `cli/AGENTS.md` names `config/binding/resolve.ts` (DR8).
- **AC-10.3** The `config/` module-layout entry names the three folders, states that the binding vocabulary declares and does nothing, and states that both documents share one stage-binding schema — and does not enumerate the seven files (DR8).
- **AC-10.4** The guard contract line in `cli/AGENTS.md` describes the generalized declarations-only guard (DR5).
- **AC-10.5** `cli/README.md` is unmodified, and no demo scenario is added or edited (DR8).

### FR-11 — The gate passes

- **AC-11.1** `npm --prefix cli run check` passes.
- **AC-11.2** The focused config, preflight, snapshot, checkpoint, documentation, and architecture tests pass.

## Degrees of freedom

The following are left to the implementer, and any admissible choice satisfies every acceptance criterion above without change:

- **The names of exported symbols other than the two loader functions** — the validator function names, the names of the result unions declared in `binding/types.ts`, and whether the timing defaults are exported from `binding/resolve.ts` or kept internal to it, so long as their values are unchanged.
- **The internal structure of each module** — function decomposition inside a module, parameter order, and whether a validator accumulates into a local array before returning its union.
- **Whether the two loaders share a read-and-parse helper.** Their read and JSON-syntax messages are already identical, so extracting one is admissible, as is leaving each loader self-contained. If extracted, it lives under `cli/src/config/`, carries no document knowledge, and is not a barrel or re-export point.
- **Test file names and internal organization**, provided co-location holds and no test file spans two modules.
- **The exact mechanism generalizing the architecture guard** — a list constant, a loop, a table — provided one block covers both vocabularies and each keeps its anchor assertion.
- **The order the migration is carried out in**, including whether the modules are created before or after the consumers are repointed.
