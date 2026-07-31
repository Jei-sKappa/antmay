# Task 1: Centralize thread-artifact contracts

**Objective:** Make the thread-artifact domain the single source of truth for artifact contract types, metadata, serialized validation, filesystem inspection, evaluation, projection, and descriptions.

**Input / context:** `spec.md` sections 6, FR-6, and Degrees of freedom; `decisions.md DR7` requires plain serializable contracts owned by the thread domain and forbids a dependency from that domain back to pipeline types.

**Steps:**
1. Move `PlanState`, `ArtifactState`, `PartialArtifactState`, `ArtifactPrerequisite`, and `ArtifactTransition` from `cli/src/pipeline/types.ts` into `cli/src/thread/artifacts.ts`, alongside `ArtifactMismatch` and the canonical dimension/value metadata.
2. Export validators for untrusted artifact patterns and mismatch arrays from `cli/src/thread/artifacts.ts`; make them report field-qualified errors without importing checkpoint or pipeline types.
3. Retain the current topology-only inspection semantics, prerequisite matching, promised-state matching, simulated transition application, dimension names, and descriptions in the thread domain.
4. Change the catalog, composition, and target-resolution modules to import artifact vocabulary and operations from `cli/src/thread/artifacts.ts`; leave only pipeline-owned stage, target, Git-policy, queue-resolution, and document types in `cli/src/pipeline/types.ts`.
5. Replace the checkpoint validator's local plan-state set, Boolean-dimension list, artifact-pattern validator, and mismatch validator with delegation to the thread-domain validators.
6. Extend thread-artifact tests with valid and invalid serialized patterns and mismatches, JSON round trips, exhaustive metadata coverage, and a dependency-direction assertion; update checkpoint tests to prove delegation rejects unknown dimensions and values with the established meaning.
7. Run the focused artifact, checkpoint, catalog, composition, and target tests, then run the complete CLI gate.

**Files modified:**
- `cli/src/thread/artifacts.ts`
- `cli/src/thread/artifacts.test.ts`
- `cli/src/pipeline/types.ts`
- `cli/src/pipeline/catalog.ts`
- `cli/src/pipeline/composition.ts`
- `cli/src/pipeline/targets.ts`
- `cli/src/state/checkpoint.ts`
- `cli/src/state/checkpoint.test.ts`

**Verification:**
- `npm --prefix cli run test -- src/thread/artifacts.test.ts src/state/checkpoint.test.ts src/pipeline/catalog.test.ts src/pipeline/composition.test.ts src/pipeline/targets.test.ts`
- `! rg -n "BOOLEAN_ARTIFACT_DIMENSIONS|const PLAN_STATES|validateArtifactPattern\(|validateContractMismatches\(" cli/src/state/checkpoint.ts`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-6 / AC-6.1: artifact state, plan state, patterns, mismatches, dimension/value metadata, validators, inspection, evaluation, transition application, and descriptions originate in `cli/src/thread/artifacts.ts`.
- FR-6 / AC-6.2: checkpoint validation delegates artifact patterns and mismatch records to the thread domain and rejects unknown dimensions or values.
- FR-6 / AC-6.3: filesystem inspection, plan topology, semantic blindness, matching, transition, composition, target, and description tests retain their meaning.
- FR-6 / AC-6.4: catalog and checkpoint artifact contracts remain plain JSON-like values and survive JSON round trips.
- FR-6 / AC-6.5: `cli/src/thread/artifacts.ts` has no dependency on `cli/src/pipeline/` for its vocabulary.

**Consumes:** none

**Produces:** Artifact contract types, metadata, validators, inspection, evaluation, transition, and description exports from `cli/src/thread/artifacts.ts`.
