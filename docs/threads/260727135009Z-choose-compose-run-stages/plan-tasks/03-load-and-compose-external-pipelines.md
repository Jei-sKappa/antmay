### Task 3: Load and compose external pipeline documents

**Objective:** Turn one resolved pipeline JSON source plus current thread state and optional `--from` into a validated ordered executable-stage preparation.

**Input / context:** Use the trusted catalog and artifact-state model from Task 1 and the source/name utilities from Task 2. Follow `spec.md` sections “Pipeline document” and “Suffix selection and composition validation,” with `decisions.md DR1`, `DR3`, `DR4`, `DR5`, `DR7`, `DR10`, and `DR16`.

**Steps:**
1. Create `cli/src/pipeline/documents.ts` to read and validate one resolved pipeline source. Require exactly `schemaVersion: 0`, a raw-name-valid declared `name`, and a non-empty `stages` array of objects with required catalog `stage` and optional non-empty `instructions`.
2. Collect and report every discoverable schema problem: wrong version, invalid declared name, empty stages, string shorthand, duplicate or unknown IDs, empty instructions, and unknown root or entry fields. Explicitly reject local binding, prompt, target, Git, queue, prerequisite, output, timing, and pipeline-wide instruction fields through strict unknown-field validation.
3. Keep the pipeline document's declared name, resolved source provenance, ordered portable entries, and optional per-stage instructions distinct from catalog-owned stage definitions.
4. Create `cli/src/pipeline/composition.ts` to validate the complete source document before applying `--from`, select all stages or the inclusive named suffix, and reject an unknown entry stage before allocation.
5. Begin composition from one freshly inspected concrete artifact state. Walk only the selected entries in document order: check each catalog prerequisite, resolve the catalog target against the current simulated state, record a prepared stage containing the catalog definition plus portable instructions and concrete target, apply the promised transition, and preserve unrelated state dimensions.
6. Stop at the first impossible composition and return a diagnostic naming the failing stage, required state, observed or simulated state, and relevant preceding selected stages. Never credit skipped-stage output.
7. Add focused tests for complete-document validation before suffix selection, all/no suffix selection, unknown `--from`, skipped-output exclusion, later-stage entry with and without existing prerequisites, unrelated-state preservation, all `plan-brief` target cases, strict-plan implementation admission, `plan-brief` to strict-plan implementation rejection, and strict-to-brief admission without interpreting portable instructions.

**Files modified:**

- `cli/src/pipeline/types.ts`
- `cli/src/pipeline/documents.ts` (NEW)
- `cli/src/pipeline/documents.test.ts` (NEW)
- `cli/src/pipeline/composition.ts` (NEW)
- `cli/src/pipeline/composition.test.ts` (NEW)

**Verification:**

1. Run `npm --prefix cli run test -- src/pipeline/documents.test.ts src/pipeline/composition.test.ts`.
2. Run `npm --prefix cli run check`.

**Acceptance criteria:**

- The loader accepts only the exact object-only pipeline representation from the spec.
- The complete source document is validated even when `--from` would skip the faulty entry.
- Declared pipeline identity and resolved source provenance remain separate and survive loading.
- Selection includes the named `--from` stage and every later entry, or all entries when `--from` is absent.
- Composition begins from concrete thread state, never credits skipped outputs, preserves unrelated state, and applies catalog transitions in order.
- The first impossible stage diagnostic carries the stage, requirement, observed/simulated state, and relevant preceding selected stages.
- `plan-brief` resolves to `spec.md` only when spec is present in the simulated state and otherwise resolves to the thread root.
- Portable instructions remain opaque data attached to their selected stage and cannot modify any catalog contract.
- The targeted tests and the full CLI gate pass.

**Consumes:** `STAGE_CATALOG`, `inspectArtifactState`, safe target resolution, `resolveDocumentReference`, and the shared raw-name predicate produced by Tasks 1 and 2.

**Produces:** `loadPipelineDocument(resolvedSource)` from `cli/src/pipeline/documents.ts`; `composePipeline(document, artifactState, threadRelPath, fromStage)` from `cli/src/pipeline/composition.ts`, returning only the selected prepared stages with catalog contracts, portable instructions, resolved targets, and simulated transitions.
