# Task 11: Enforce and verify the resulting architecture

**Objective:** Lock in the intended dependency directions, document the durable CLI model, and prove the complete refactor through automated and executable-UI regression gates.

**Input / context:** The completed implementation from Tasks 1–10; `spec.md` FR-7, FR-8, Coverage and traceability, and the preserved-behavior boundary; `decisions.md DR5`–`DR8` and `DR10`–`DR12` define the architecture and evidence that must remain durable.

**Steps:**
1. Create `cli/src/architecture.test.ts` with source/import-graph assertions that enforce: one post-allocation checkpoint writer in the execution engine; no recovery/Git/persistence collaborators in resume; the complete Git protocol called only through `finalizeGitBoundary`; artifact dimensions and serialized validators owned only by the thread domain; no thread-artifact dependency on pipeline types; and phase-specific display consumers.
2. Add lazy-loading architecture assertions that production dispatch and commands do not statically import concrete real and scripted adapters; keep production-build inspection as the post-build verification in step 6.
3. Update `cli/AGENTS.md` so the execution model, module map, recovery section, scripted-harness section, display guidance, and scenario numbering describe the resulting one-engine architecture, four recovery variants, attempt-local Git evidence, immutable runtime resolver, thread-owned artifact contracts, and focused display modules.
4. Remove every instruction in `cli/AGENTS.md` that teaches `startedScripted`, `gitCursor`, reason-driven recovery, duplicated command transitions, or a monolithic terminal implementation; keep the document focused on durable constraints rather than ordinary implementation inventory.
5. Run focused architecture, checkpoint, boundary, runtime, artifact, display, engine, command, program, catalog, composition, and documentation tests.
6. Run `npm --prefix cli run check`, assert the scripted adapter/catalog marker is absent from `dist/main.js`, and locate that marker in a separate built module.
7. Run executable UI scenarios `01-all-done`, `11-real-runtime-scripted-toggle-refusal`, `14-waiting-for-user`, `16-retry`, `18-stage-contract-violation`, `19-saved-done-recovery`, `23-failed-git-policy`, `24-failed-commit`, `25-failed-queue-scan`, `28-permissions-warning`, and `31-list`; rerun the mismatch, contract, Git-policy, permissions-warning, and listing scenarios with `--no-color`.
8. Confirm the catalog/documentation tests show no semantic stage-catalog or published stage-support-table change, and review the final file set for no dependency-manifest, package-version, command-surface, suite-skill, or method-document change.

**Files modified:**
- `cli/src/architecture.test.ts` (NEW)
- `cli/AGENTS.md`

**Verification:**
- `npm --prefix cli run test -- src/architecture.test.ts src/state/checkpoint.test.ts src/gitops/boundary.test.ts src/harness/runtime.test.ts src/thread/artifacts.test.ts src/display/terminal.test.ts src/execution/engine.test.ts src/commands/run.test.ts src/commands/resume.test.ts src/program.test.ts src/pipeline/catalog.test.ts src/pipeline/composition.test.ts src/pipeline/documentation.test.ts`
- `npm --prefix cli run check`
- `! rg -n "ScriptedHarnessError" cli/dist/main.js`
- `rg -l "ScriptedHarnessError" cli/dist/*.js`
- `npm --prefix cli run demo -- --scenario 01-all-done`
- `npm --prefix cli run demo -- --scenario 11-real-runtime-scripted-toggle-refusal`
- `npm --prefix cli run demo -- --scenario 14-waiting-for-user`
- `npm --prefix cli run demo -- --scenario 16-retry`
- `npm --prefix cli run demo -- --scenario 18-stage-contract-violation`
- `npm --prefix cli run demo -- --scenario 19-saved-done-recovery`
- `npm --prefix cli run demo -- --scenario 23-failed-git-policy`
- `npm --prefix cli run demo -- --scenario 24-failed-commit`
- `npm --prefix cli run demo -- --scenario 25-failed-queue-scan`
- `npm --prefix cli run demo -- --scenario 28-permissions-warning`
- `npm --prefix cli run demo -- --scenario 31-list`
- `npm --prefix cli run demo -- --scenario 11-real-runtime-scripted-toggle-refusal --no-color`
- `npm --prefix cli run demo -- --scenario 18-stage-contract-violation --no-color`
- `npm --prefix cli run demo -- --scenario 23-failed-git-policy --no-color`
- `npm --prefix cli run demo -- --scenario 28-permissions-warning --no-color`
- `npm --prefix cli run demo -- --scenario 31-list --no-color`

**Acceptance criteria:**
- FR-7 / AC-7.5: every affected existing scenario retains its declared exit code and distinct visual state after the display and engine changes.
- FR-8 / AC-8.1: typecheck, complete Vitest suite, and production build pass with no half-migrated path.
- FR-8 / AC-8.2: regression coverage preserves grammar/help, exit codes, composition, snapshots, artifact contracts, queue resolution, locks, signals, prompts, logs, sessions, continuation commands, and ordinary terminal output outside explicit rejection changes.
- FR-8 / AC-8.3: ordinary success, waiting, retry, saved-DONE recovery, contract/Git/commit/queue pauses, startup/listing, and runtime mismatch scenarios pass; selected renderings remain legible without color.
- FR-8 / AC-8.4: the production build and lazy-loader tests prove the scripted adapter and case catalog are not evaluated for a real run or resume.
- FR-8 / AC-8.5: `cli/AGENTS.md` accurately and durably describes the resulting architecture and teaches none of the removed design.
- FR-8 / AC-8.6: suite skills, method documents, stage catalog semantics, the published stage-support table, dependencies, package version, and command surface remain unchanged.
- Architecture tests mechanically enforce AC-1.3, AC-4.4, AC-5.5, AC-6.1, and AC-6.5 dependency directions.

**Consumes:** The complete code, tests, scenarios, and build outputs produced by Tasks 1–10.

**Produces:** none
