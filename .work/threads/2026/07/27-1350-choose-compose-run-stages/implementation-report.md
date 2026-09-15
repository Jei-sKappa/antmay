# Implementation report

Source: plan.md

## Outcome

All seven plan tasks are complete and committed. Nothing was left partial, blocked, or found already satisfied.

`antmay afk run` now executes a user-selected, ordered sequence of trusted stages loaded from an external pipeline document, replacing the executor-bundled runnable pipeline and the catch-all local defaults:

1. **Trusted catalog and artifact-state engine** — the nine-stage serializable catalog and the bounded filesystem state it consumes and promises.
2. **Document references and local execution bindings** — syntax-directed pipeline/profile resolution and strict settings/profile loading with whole-binding stage resolution.
3. **External pipeline loading and composition** — the canonical pipeline schema, optional `--from` suffix selection, artifact-transition simulation, and concrete target resolution.
4. **Run preflight and checkpoints** — the full ordered preflight before any allocation, and a redesigned checkpoint snapshotting every value resume needs.
5. **Runtime contract enforcement** — prerequisite rechecks before each attempt, promised-output verification after `DONE`, and all four deterministic resume recoveries.
6. **Resolved-execution rendering and demo coverage** — the startup summary and scenarios for every new terminal shape.
7. **Documentation and verification** — the user/maintainer documentation and a gated check that keeps it bound to the code.

## Changes

**Trusted catalog (`cli/src/pipeline/catalog.ts`, `types.ts`, `targets.ts`).** `STAGE_CATALOG` defines exactly nine stages — `spec`, `reconcile-spec`, `review-spec`, `plan-brief`, `plan-strict`, `reconcile-plan`, `implement`, `implement-plan`, `implement-plan-with-subagents` — each owning its skill, declarative target rule, artifact prerequisite, promised transition, Git policy, queue resolution, and base trigger. Every descriptor is serializable and survives a JSON round-trip with no executable callbacks. Target resolution handles `plan-brief`'s state-sensitive rule without weakening the thread-relative traversal check.

**Artifact state (`cli/src/thread/artifacts.ts`).** `inspectArtifactState` reads the thread through `lstat`/`readdir` only — it opens no file contents, so the "no semantic interpretation" boundary is structural rather than conventional. It classifies plan state as `absent`, `brief`, `strict`, or `malformed`, treating every plan-topology inspection failure as `malformed`. Pure prerequisite, transition, and postcondition evaluators are shared by preflight simulation and runtime enforcement.

**References and local execution (`cli/src/config/references.ts`, `execution.ts`).** One raw name grammar, `^[a-z0-9]+(?:-[a-z0-9]+)*$`, and one purely syntax-directed resolver touching no filesystem: a bare name resolves below the role's config-root directory, absolute and explicit-directory relative references resolve as paths, and a bare filename such as `standard.json` is rejected with both legal alternatives named. Neither form falls back to the other. Settings are optional and must be exactly `{"afk": {"stages": {…}}}`; `{}` and `{"afk": {}}` are invalid, `{"afk": {"stages": {}}}` is a valid empty document. A profile entry replaces the whole settings entry for a stage and fields never merge across the two sources, keeping harness and model an atomic pair. Omitted timing resolves to 86,400 idle-timeout and 300 heartbeat seconds.

**Pipeline documents and composition (`cli/src/pipeline/documents.ts`, `composition.ts`).** The loader accepts only the canonical object-only schema and collects every discoverable problem at once, rejecting local binding, prompt, target, Git, queue, prerequisite, output, timing, and pipeline-wide instruction fields. Composition validates the complete document before applying `--from`, selects the inclusive suffix, walks it from freshly inspected concrete state, credits no skipped output, preserves unrelated dimensions, and stops at the first impossible composition with a diagnostic naming the stage, its requirement, the observed or simulated origin, and the relevant preceding stages.

**Run preflight and checkpoints (`cli/src/commands/run.ts`, `state/checkpoint.ts`, `harness/`).** The grammar is `antmay afk run <pipeline-ref> --thread <path> [--from <stage-id>] [--profile <profile-ref>] [--dangerously-skip-permissions]`. Preflight runs in the mandated order and every refusal returns before run-directory creation; the under-lock queue recheck stays part of allocation. The checkpoint retains pipeline and profile identity with resolved provenance, the optional entry point, and only the selected stages, each carrying its catalog contract, resolved target, portable instructions, and fully resolved binding. Prompts put the catalog trigger and concrete target first and append portable instructions only when present. The built-in `standard` pipeline and the old settings/profile merge modules are deleted, with the shared harness and timing constants single-sourced.

**Runtime enforcement and recovery (`cli/src/runner/runner.ts`, `commands/resume.ts`, `display/terminal.ts`).** The runner rechecks the prerequisite from fresh state immediately before each attempt, pausing `stage-prerequisite-unmet` with no attempt, log, or harness call. After a recognized `DONE` it verifies the promised state before any Git evaluation, commit, stage advance, or queue resolution, pausing `stage-contract-violation` on the same stage. Resume implements the four recoveries over one shared no-harness finalization path.

**Rendering and demo (`cli/src/display/terminal.ts`, `cli/scripts/`).** The startup summary prints pipeline and profile names with their resolved sources (or `settings only`), the `--from` entry point, and every selected stage's harness, model, and target — with no confirmation prompt. The demo builds its isolated config root from production-schema documents rather than the developer's own settings, and the catalog is twenty scenarios including two new ones for the runtime pauses.

**Documentation (`cli/README.md`, `cli/AGENTS.md`, root `AGENTS.md`, `cli/src/pipeline/documentation.test.ts`).** The README carries the copyable Standard pipeline document, the schemas, the reference and binding rules, a 30-row skill support/prerequisite matrix, the startup summary, the pauses and their recoveries, and a real-harness smoke checklist. The cross-module rule keeping the matrix current lives at the root and only there. A gated test binds the documentation to the code.

## Verification

- `npm --prefix cli run check` — **exit 0**: typecheck clean, 793 tests across 37 files, build success. Run after every task by both the implementing and reviewing agents; this is the state of the final commit.
- Each task's own targeted test command passed: catalog/targets/artifacts (71 tests), references/execution (133), documents/composition (40), parse/program/run/resume/checkpoint/prompt/scenario (204), runner/run/resume/checkpoint/terminal (226), the task-6 block (221), and the documentation test (10 cases).
- `rg -n "builtInPipelines|standardPipeline|afk\.defaults|profilePrompt" cli/src` — no production-code match. The two remaining hits are tests asserting the retired `afk.defaults` key is now rejected.
- All twenty demo scenarios were executed with `--no-color`; each reported `[PASS]` at its declared exit code and showed the banner it exists to show. `demo --list` matches the README table.
- AC-8.1 was exercised rather than asserted: the documentation test resolves `standard` through the production reference resolver, writes the README's copyable block to the resolved `<config-root>/pipelines/standard.json`, and loads it with `loadPipelineDocument`.
- Mutation checks confirmed the new tests are not vacuous: each runtime-contract fix was verified to fail against its pre-fix baseline, and four mutations of the documentation surfaces (relabelling a `Supported` matrix row, wrapping a restatement of the root rule, an incidental use of the old marker phrase, a broken matrix section) each failed as intended.
- **Not run — the manual smoke checklist (AC-9.3).** It is human-run and needs real Codex and Claude Code credentials plus installed skills, which is outside automation.

## Deviations and judgment calls

- **`cli/src/commands/list.ts` was edited although task 4's file list omits it.** Its step 7 requires teaching `list`'s reads the new checkpoint shape, and the file read `stage.profile.harness`/`.model`, which no longer exist — it had to change to compile. The edit is two lines to `stage.binding.agent.*`; the rendering path, column order, and padding are untouched, so `list` presentation is preserved.
- **`cli/AGENTS.md` and `cli/README.md` were edited although task 6's file list omits them.** The "Keep the scenario catalog current" rule requires it: leaving them would have shipped a README table naming twelve scenario ids that no longer exist.
- **Task 1's step 7 was read narrowly.** Its instruction to "replace the built-in-pipeline assertions in focused tests" conflicts with its own file list and with task 4's deletion of `standard.ts`/`standard.test.ts`. The catalog contract suite was added as a new file and the built-in pipeline's tests were left for task 4 to remove with the pipeline itself.
- **The checkpoint reshape is incompatible at `schemaVersion: 0`.** Every previously written `state.json` is unreadable, so an existing local run directory must be deleted rather than resumed. This is the intended pre-release behavior and no migration was written.
- **`stage-prerequisite-unmet` is a chosen name.** The spec and decisions name only `stage-contract-violation`; its sibling was unconstrained, and the name is symmetric with it and validated the same way.
- **The attempt-start `HEAD` is carried on the pause reason** rather than on `AttemptRecord` or `gitCursor`, because a required field in either of those would have broken checkpoint literals in files outside the owning task's footprint.
- **Two pause banners were reworded** to `FAILED — stage prerequisite unmet` and `FAILED — promised artifact state unmet`, so they no longer reuse the `BLOCKED` word and icon the skill's own terminal token owns, and so the second covers the shape-mismatch case where nothing is actually missing.
- **`DocumentReference.form` is deliberately not rendered.** The provenance line prints the resolved absolute source, which strictly dominates the strategy name, and the raw reference is on the command line the user just typed.

## Remaining concerns

- **`cli/README.md` groups `review-spec` with the stages that "may touch only `spec.md`"**, but its `allowedChanges` is empty — the stage permits no tracked change at all. The published table understates that policy.
- **The demo's `07-runtime-prerequisite` timing pair is documented but not asserted.** Its `afterMs` must land inside the scripted case's delay window, and a `.mjs` scenario cannot import the TypeScript constant. Missing the window now produces a loud failure (exit 1, `[FAIL]`) rather than a scenario that silently shows another's rendering.
- **The unverifiable-postcondition branch ships untested.** It is unreachable end to end — preflight rejects the only producible cause — and was independently verified twice. It is the fail-closed direction.
- **The checkpoint validator requires each stage `id` to name a catalog stage but does not check the rest of the descriptor against that entry.** The gap is what keeps the runner's pipeline-agnosticism provable with synthetic fixtures.
- **The "user-visible reason" documentation check is structural, not semantic** (a sentence over a length threshold, not a placeholder), so it cannot detect a long but internally worded reason. The current rows were verified by hand.
- **`gitCursor.headAtStageEntry` is now write-only**, and the copyable settings example names concrete models that nothing validates against a provider (the smoke checklist tells the reader to edit them).
- **A `stage-prerequisite-unmet` pause keeps the ordinary clean-worktree resume rule**, so a human must commit the restored artifact before resume is accepted — which the pause's own `Next:` line does not say.

## Follow-ups

- Correct the `review-spec` row in the README's Git-policy prose to say the stage permits no tracked change.
- Update `docs/glossary.md`: its **stage** definition omits the artifact prerequisite and promised transition the catalog now owns, and it — together with `docs/recipes/standard.md` — reads as though the CLI ships the `standard` pipeline rather than publishing a document the user saves. The root `AGENTS.md` names the glossary the repository's naming authority, and `docs/` was outside this plan's scope.
- Remove `DocumentReference.form` and weigh `DocumentReference.raw` at the same time; neither is consumed outside its own test.
- Consolidate the duplications recorded across the implementation: `queueReasonsFor` in `runner.ts` re-implements `classify.ts`'s private `queueReasons` including its precedence; `describeContractSide` is duplicated between `runner.ts` and `resume.ts`; four `isPlainObject` copies remain; and the harness membership list exists as an array in `config/execution.ts` and a `Set` in `state/checkpoint.ts`.
- Retire `gitCursor.headAtStageEntry` or document it as diagnostic-only.
- In `config/execution.ts`, drop the `as HarnessId` cast inside the check that narrows it and derive the adjacent diagnostic's harness list from `HARNESS_IDS`.
- Run the manual smoke checklist against real harnesses.
