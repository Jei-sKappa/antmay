# Implementation report

Source: `spec.md`

## Outcome

Completed in full. The local binding vocabulary, shared stage-binding schema,
per-stage resolution, and each local document's validation and loading remain
separated across the seven modules under `config/binding/`, `config/settings/`,
and `config/execution-profile/`. Catalog-stage identity and the shared
document-name grammar now live in two import-free leaves, so neither document
validator reaches `node:fs` or `node:path` anywhere in its production source
dependency graph, including through type-only imports.

Every acceptance criterion is satisfied. Document shapes, binding resolution,
diagnostic wording, and diagnostic order are unchanged.

## Changes

**Binding configuration** — `config/binding/types.ts` remains declarations-only;
the shared schema, intrinsic timing defaults, per-stage resolution, settings
validation/loading, and execution-profile validation/loading remain separated by
purpose. Consumers import the specific module they use, and no barrel or re-export
spans the split.

**Pure identity leaves** — `pipeline/stage-id.ts` owns the ordered catalog-stage
ID tuple, the `CatalogStageId` type derived from it, and `isCatalogStageId`.
`config/document-name.ts` owns `DOCUMENT_NAME_PATTERN` and
`isValidDocumentName`. Both modules import nothing. The catalog remains exhaustive
over the tuple-derived union, and every consumer imports moved symbols directly
from their owner.

**Architecture enforcement** — `architecture.test.ts` keeps the generalized
declarations-only vocabulary guard and adds a cycle-safe traversal of every
production source import. From both document validators it follows static,
dynamic, re-export, side-effect, and type-only edges, rejecting any path that
reaches a `node:fs` or `node:path` specifier and printing the dependency chain.
It also holds both identity leaves to importing nothing.

**Tests** — the six behavior-bearing binding/document modules retain their
co-located tests. Raw document-name grammar cases now live beside
`document-name.ts`, catalog-stage identity cases live beside `stage-id.ts`, and
the catalog test holds its ordered keys equal to the identity tuple. Reference
resolution, pipeline documents, checkpoint validation, binding validation,
documentation, and architecture coverage exercise the repointed consumers.

**Durable intent and living documentation** — DR9 records strict source-graph
purity and the two identity owners; `spec.md` describes the resulting current
contract. `cli/AGENTS.md` names both import-free leaves and the transitive
validator guard. `cli/README.md` and the demo scenario catalog are unchanged
because no rendering, diagnostic, stage-support answer, or observable behavior
moved.

## Verification

- `npm --prefix cli run check` passes: typecheck clean, 56 test files / 1,208
  tests green, and the `tsup` build succeeds.
- `npm --prefix cli run lint` passes with no promise-safety findings.
- Ten focused configuration, pipeline, checkpoint, documentation, and
  architecture test files pass: 320 tests green.
- The three Git-heavy suites affected by an earlier overlapping verification run
  pass in isolation: 207 tests green. That earlier run reported 24 thirty-second
  timeouts while multiple full suites competed for the same machine; its other
  1,184 tests passed, and the final non-overlapping full gate passed unchanged.
- `git diff --check` is clean. Static ownership searches find no consumer importing
  a moved symbol from `pipeline/catalog.ts`, `pipeline/types.ts`, or
  `config/references.ts`.
- The architecture suite passes 68 tests, including both import-free leaf checks
  and both transitive validator-boundary checks.

## Deviations and judgment calls

- AC-4.2's prohibition on validator signatures taking an `errors: string[]`
  parameter is applied to every validator in the separated modules, including the
  shared schema's four internal validators. This broad reading preserves
  diagnostic order while making every validation boundary explicit.
- `StageMapValidation`, the union returned by the shared schema, remains beside
  the document validators' unions in `config/binding/types.ts`, keeping every
  binding-validation outcome declaration in the declarations-only vocabulary.
- `validateAgent` and `validateBinding` return failure rather than a partial value
  when they record an error. This is unobservable to callers because any recorded
  error rejects the containing document and the partial map is never read.

## Remaining concerns

- `cli/temp/` holds a stale, gitignored call-trace dump from an earlier session
  that names `config/execution.ts` and its private functions. It is outside the
  acceptance criteria and remains untouched; regenerate or delete it whenever it
  is next used.
