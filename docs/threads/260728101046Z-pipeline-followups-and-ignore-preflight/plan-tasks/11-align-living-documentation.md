### Task 11: Align the living documentation

**Objective:** Make the method vocabulary, Standard recipe, CLI reference, and maintainer guidance describe the implemented pipeline and verification contracts accurately.

**Input / context:** `spec.md` FR-10 through FR-12; `decisions.md DR11`, `decisions.md DR12`, `decisions.md DR16`, and `decisions.md DR17`; the root cross-module stage-support maintenance rule; and the code, scenario table, and `cli/AGENTS.md` changes produced by Tasks 3, 6, 9, and 10.

**Steps:**
1. Update the `stage` entry in `docs/glossary.md` to include its artifact prerequisite and promised transition alongside its ID, skill, target rule, Git policy, and queue resolution.
2. Rewrite the pipeline passages in `docs/glossary.md` and `docs/recipes/standard.md` to state that a pipeline is a document the user authors or saves and that `cli/README.md` publishes a ready-made Standard document. Keep document schema, config-root layout, reference grammar, and the stage-support table in CLI documentation only.
3. Correct the Git-policy prose beneath the stage-support table in `cli/README.md`: `spec` and `reconcile-spec` may touch only `spec.md`; `review-spec` permits no tracked change; the plan and implementation groups retain their current policies. Do not change any support-table skill or prerequisite cell.
4. Add a one-line note immediately beside the settings example saying its model strings are examples and are not validated against a provider. Place the note outside the fenced JSON block and retain the existing non-empty-string schema validation.
5. Delete the entire `## Manual smoke checklist` section from `cli/README.md` without editing historical thread artifacts.
6. Remove the checklist from the README-content pointer in `cli/AGENTS.md`. Beside the existing automated-suite and scripted-harness guidance, add a short prose paragraph stating that every test harness is fake and that only a real harness can prove: a session launches on its configured harness, the curated live stream agrees with the verbose attempt log, a genuine `DONE` produces a real boundary commit, and native session capture supports out-of-band continuation. State that nobody runs this periodically; add no checklist, numbered procedure, or schedule.
7. Review every edited documentation sentence against the repository's current-state rule. Remove before/after contrasts and dead-design negations while retaining live guardrails.
8. Run the documentation-focused tests and the complete CLI gate; mechanically confirm the removed section and pointer are absent from living documentation and historical thread artifacts are untouched.

**Files modified:**

- `docs/glossary.md`
- `docs/recipes/standard.md`
- `cli/README.md`
- `cli/AGENTS.md`

**Verification:**

- `npm --prefix cli run test -- src/pipeline/documentation.test.ts` exits `0`, proving the settings JSON still loads and the stage-support rows still match the suite and catalog prerequisites.
- `npm --prefix cli run check` exits `0`.
- `rg -n '^## Manual smoke checklist|README.*manual smoke checklist|manual smoke checklist.*README' cli/README.md cli/AGENTS.md` returns no matches.
- `rg -n 'review-spec.*no tracked change|not validated against.*provider' cli/README.md` finds both corrected statements.
- `git diff -- docs/threads ':!docs/threads/260728101046Z-pipeline-followups-and-ignore-preflight/plan.md' ':!docs/threads/260728101046Z-pipeline-followups-and-ignore-preflight/plan-tasks'` is empty.

**Acceptance criteria:**

- The glossary's `stage` meaning names all catalog-owned contract parts, including prerequisite and promise.
- Both method passages describe a user-authored or saved pipeline document and point to the ready-made Standard document in the CLI README without importing CLI schema details.
- `review-spec` is documented as the sole supported read-only stage, and no stage-support row or prerequisite changes.
- The settings model caveat sits outside the JSON fence and provider-aware validation remains absent.
- Living documentation contains no manual smoke checklist or pointer to one.
- `cli/AGENTS.md` contains a concise, non-periodic real-harness verification-gap paragraph naming all four properties.
- Every edited document describes the resulting current state, and `npm --prefix cli run check` passes.

**Consumes:** the README scenario row and structured-refusal boundary produced by Task 3, the `shared/` module-layout entry produced by Task 6, the concrete artifact-contract terminal output produced by Task 9, and the verification comments and timing test produced by Task 10.

**Produces:** current method and CLI documentation aligned with the implemented stage, model, Git-policy, scenario, and verification contracts; no later task consumes an implementation interface.
