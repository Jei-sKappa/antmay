### Task 1: Establish the trusted catalog and artifact-state engine

**Objective:** Provide the serializable nine-stage safety catalog and one bounded filesystem model for preflight simulation and runtime checks.

**Input / context:** Start from `spec.md` sections “Trusted stage catalog” and “Artifact-state model.” Honor `decisions.md DR1`, `DR5`, `DR9`, `DR10`, and `DR13`: the catalog owns skill adapters and safety policy; the release set is exactly nine stages; artifact inspection is structural rather than semantic; and `plan-brief` has a state-resolved target.

**Steps:**
1. Extend `cli/src/pipeline/types.ts` with serializable types for catalog stage IDs, artifact prerequisites, promised transitions, plan state (`absent`, `brief`, `strict`, `malformed`), and declarative target rules. Keep executable functions out of every descriptor that can enter a checkpoint.
2. Create `cli/src/pipeline/catalog.ts` containing exactly the nine stage definitions from the spec: skill, target rule, prerequisite, promised transition, Git policy, queue resolution, and base trigger data for `spec`, `reconcile-spec`, `review-spec`, `plan-brief`, `plan-strict`, `reconcile-plan`, `implement`, `implement-plan`, and `implement-plan-with-subagents`.
3. Represent the `plan-brief` target as a declarative state-sensitive rule that selects `spec.md` when the simulated state has a spec and the thread root otherwise; keep every other target fixed exactly as the catalog table requires.
4. Create `cli/src/thread/artifacts.ts` to inspect a resolved active thread into the canonical artifact state. Count proposal, spec, and implementation report only when the path is a non-empty regular file; classify every plan/index/task topology exactly as `absent`, `brief`, `strict`, or `malformed`; treat every plan-topology inspection failure as `malformed`; and surface any failure that prevents constructing the remaining artifact state as a typed inspection failure that callers cannot mistake for valid state.
5. In the same artifact-state module, expose pure helpers that evaluate a declarative prerequisite, apply a promised transition while preserving unrelated dimensions, and test whether fresh concrete state satisfies a promised postcondition. Keep these helpers independent of executable checkpoint callbacks so composition and runtime enforcement use the same canonical contract semantics.
6. Extend `cli/src/pipeline/targets.ts` so it resolves both fixed and state-sensitive catalog target rules to safe repository-relative paths without weakening the existing thread-relative traversal checks.
7. Replace the built-in-pipeline assertions in focused tests with catalog contract tests that assert the exact ID set and every catalog row, including plan variants, allowed plan-task deletion for `plan-brief`, implementation `HEAD` movement, queue resolution, and JSON round-tripping.
8. Add filesystem-table and contract-evaluator tests for all artifact states, including missing paths, empty files, non-regular paths, task storage without an index, an empty/non-regular index, a non-directory `plan-tasks`, no recognizable non-empty Markdown task, inspection errors, inputs that must remain semantically uninterpreted, prerequisite matches and mismatches, unrelated-state preservation, and postcondition matches and mismatches.

**Files modified:**

- `cli/src/pipeline/types.ts`
- `cli/src/pipeline/catalog.ts` (NEW)
- `cli/src/pipeline/catalog.test.ts` (NEW)
- `cli/src/pipeline/targets.ts`
- `cli/src/pipeline/targets.test.ts`
- `cli/src/thread/artifacts.ts` (NEW)
- `cli/src/thread/artifacts.test.ts` (NEW)

**Verification:**

1. Run `npm --prefix cli run test -- src/pipeline/catalog.test.ts src/pipeline/targets.test.ts src/thread/artifacts.test.ts`.
2. Run `npm --prefix cli run check`.

**Acceptance criteria:**

- The catalog exports exactly the nine specified stage IDs and no proposal or Roadmap stage.
- Every catalog entry matches the spec's skill, target rule, prerequisite, transition, Git policy, queue resolution, and base trigger contract.
- Catalog definitions and artifact contracts survive a JSON round-trip without executable callbacks.
- Artifact inspection recognizes every canonical plan shape and treats every other shape or plan-topology inspection failure as malformed.
- Artifact inspection never parses Markdown prose, plan index entries, task ordinals, decision counts, or semantic consistency.
- Preflight composition and runtime enforcement can share pure prerequisite, transition, and postcondition evaluators that preserve unrelated artifact-state dimensions.
- Target resolution keeps `plan-brief` state-sensitive while preserving safe repository-relative paths for every stage.
- The targeted tests and the full CLI gate pass.

**Consumes:** none

**Produces:** `STAGE_CATALOG` and its exact catalog stage ID set from `cli/src/pipeline/catalog.ts`; serializable artifact prerequisite/transition types from `cli/src/pipeline/types.ts`; `inspectArtifactState(repoRoot, threadRelPath)` plus pure prerequisite, transition, and postcondition evaluators from `cli/src/thread/artifacts.ts`; state-sensitive safe target resolution from `cli/src/pipeline/targets.ts`.
