# Implementation report

Source: `spec.md`

## Outcome

Completed in full. `cli/src/config/execution.ts` no longer exists; the local binding
vocabulary, the shared stage-binding schema, per-stage resolution, and each of the two
local documents' validation and loading are now seven modules across three folders, with
every consumer importing the one module it needs. The declarations-only architecture
guard covers the new vocabulary module as well as the checkpoint's, and `cli/AGENTS.md`
describes the resulting shape.

Every acceptance criterion is satisfied except the transitive half of AC-4.1, which
cannot be met without moving symbols the spec puts out of scope — see Remaining
concerns. Nothing a user can observe changed: every document shape accepted before is
accepted, every shape rejected before is rejected, with the same diagnostics in the same
order.

## Changes

**`config/binding/`**

- `types.ts` — every binding type declaration and nothing executable: `AgentBinding`,
  `StageBinding`, `StageBindingMap`, `ExecutionProfile`, `ResolvedStageBinding`, the
  three result types, and the outcome unions the validators return (`StageMapValidation`,
  `SettingsValidation`). Type imports only, from `harness/id.js` and `pipeline/types.js`.
- `schema.ts` — the four validators that were private to the old module (the timing
  field, the agent pair, one binding, a stage map), as one module. `validateStageMap` is
  its only export, and it holds no emptiness opinion: the `requireNonEmpty` flag is gone.
- `resolve.ts` — `DEFAULT_IDLE_TIMEOUT_SECONDS` (86 400), `DEFAULT_HEARTBEAT_SECONDS`
  (300), and `resolveStageBindings`.

**`config/settings/` and `config/execution-profile/`** — each holds `validate.ts`, which
checks its own envelope over an already-parsed root and reaches the shared schema for the
stage map, and `load.ts`, which owns that document's disk semantics and failure shape.
The exported loaders keep the names `loadStageSettings` and `loadExecutionProfile`. Every
validator returns a discriminated union rather than appending to an `errors: string[]`
out-parameter, and each document applies its own emptiness rule at its own call site.

No barrel, index, or re-export spans the split. Five consumers were repointed:
`state/checkpoint/types.ts` takes `ResolvedStageBinding` from `config/binding/types.js`,
so the checkpoint vocabulary reaches nothing that performs I/O; each of the three run
preflight steps imports the one module whose function it calls plus `binding/types.js`
for the map type it names; `pipeline/documentation.test.ts` imports each loader from that
loader's own module.

**Tests** — six co-located test files replace `config/execution.test.ts`. The fifteen-case
schema table runs once, directly against the shared validator with no filesystem, and
absorbs both catalog-stage-coverage cases. Each document's validator test covers its
envelope plus the base path its diagnostics carry; each loader test covers missing-file
semantics, JSON syntax errors, and the failure shape loading produces; resolution is
tested beside `binding/resolve.ts`.

**Guard** — the one declarations-only block in `src/architecture.test.ts` now runs
table-driven over a two-entry vocabulary list holding `state/checkpoint/types.ts` and
`config/binding/types.ts`. Each entry carries the anchor type it must declare
(`RunCheckpoint`, `ResolvedStageBinding`), and the execution/display inversion check
applies to both.

**Documentation** — three `cli/AGENTS.md` edits: the "Local bindings" bullet points at
`config/binding/resolve.ts`; the `config/` module-layout entry names the three folders
rather than the seven files and states that the binding vocabulary declares and does
nothing and that both documents share one stage-binding schema; the architecture-guard
contract line describes the generalized guard. `cli/README.md` and the demo scenario
catalog are untouched, because no rendering, diagnostic, or stage-support answer moved.

## Verification

- `npm --prefix cli run check` passes: `tsc --noEmit` clean, 54 test files / 1195 tests
  green, `tsup` build succeeds. It was run ahead of each commit; the focused config,
  preflight, snapshot, checkpoint, documentation, and architecture tests were also run
  directly (315 tests green).
- `npm --prefix cli run lint` (oxlint, the type-aware promise-safety sibling gate) clean.
- Diagnostic equivalence was established against a recorded baseline rather than by
  re-derivation: before any code changed, the exact `errors` arrays the pre-change
  implementation produced were captured for a multi-problem settings document, a
  multi-problem profile document, an empty profile stage map among other problems, a
  non-object stage map, a binding carrying every kind of problem, and each envelope pair
  reported together. The split tests assert those strings and that order, including that a
  profile's `stages must bind at least one stage.` still lands after the envelope
  diagnostics and in place of the per-key diagnostics an empty map has none of.
- The generalized guard was proven to bite: appending `export const SMUGGLED_DEFAULT = 1;`
  to `config/binding/types.ts` fails `src/architecture.test.ts` naming that module. The
  edit was reverted and the file confirmed clean; it was never committed.
- No tracked file under `cli/` names `config/execution.ts`.
- No demo scenario was run, and none needed to be: every rendering, diagnostic, and
  diagnostic ordering is held fixed by construction and asserted by unit tests.

## Deviations and judgment calls

- The migration was carried as one commit for the code rather than two (the binding
  folder, then the document folders). The spec left the order to the implementer, and an
  intermediate commit would have left `config/execution.ts` holding both documents while
  importing the new shared schema — the half-migrated shape `cli/AGENTS.md` forbids
  committing.
- AC-4.2's "no validator signature takes an `errors: string[]` parameter" was applied to
  every validator in the new modules rather than only the two document validators, so the
  shared schema's four functions each return a union too. The narrow reading was also
  defensible; the broad one satisfies both and required no change to diagnostic order.
- `StageMapValidation`, the union the shared schema returns, is declared in
  `config/binding/types.ts` beside the document validators' unions, so every outcome union
  in the area sits in one place. The spec enumerated what `types.ts` declares without
  forbidding this.
- `validateAgent` and `validateBinding` now report a failure where they previously
  returned a partial value alongside a recorded error — an unknown agent or binding field
  beside an otherwise complete pair. No caller can observe the difference: a non-empty
  error list already rejected the whole document, and the partially built map is never
  read on failure.

## Remaining concerns

- AC-4.1 asks that neither document validator import `node:fs` or `node:path` "directly
  or transitively". The direct half holds — no validator, the shared schema, or the
  vocabulary imports either builtin, and no validator touches the filesystem. The
  transitive half does not hold and cannot within this spec's scope: the shared schema
  needs `isCatalogStageId` from `pipeline/catalog.ts`, which reaches `thread/artifacts.ts`
  (`node:fs`), and the profile validator needs `DOCUMENT_NAME_PATTERN` /
  `isValidDocumentName` from `config/references.ts` (`node:path`). Both edges predate the
  split and neither is a regression; closing either means moving a symbol out of a module
  the spec puts out of scope. Left as it stands, and the spec was not edited.
- `cli/temp/` holds a stale, gitignored call-trace dump from an earlier session that still
  names `config/execution.ts` and its private functions. It is outside the acceptance
  criteria and was left alone; regenerate or delete it whenever it is next used.
