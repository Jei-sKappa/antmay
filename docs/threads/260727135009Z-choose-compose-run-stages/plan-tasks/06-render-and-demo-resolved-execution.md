### Task 6: Render and demo the fully resolved execution

**Objective:** Make the selected pipeline, profile provenance, entry point, ordered local bindings, concrete targets, and runtime contract pauses visible through the terminal and scripted demo.

**Input / context:** Use the selected snapshot metadata from Task 4 and contract-pause data from Task 5. Follow `spec.md` sections “Snapshot, startup display, and resume” and the demo coverage requirement, with `decisions.md DR11` and `DR15`. The summary is informational and must never prompt.

**Steps:**
1. Replace the compact stage-ID-only startup line with a resolved execution block showing pipeline declared name and source, selected execution-profile declared name/source or `settings only`, optional `--from`, and every selected stage in order with its harness, model, and repository-relative target.
2. Render the same snapshotted information on resume without reading source documents. Preserve the existing unrestricted-permissions warning and scripted-mode note ordering.
3. Add terminal tests for settings-only and selected-profile summaries, optional entry-point presence/absence, stage order, harness/model/target rows, no confirmation prompt, and identical checkpoint-driven resume rendering after source deletion.
4. Make the demo driver create an isolated canonical settings document, a named execution profile, and `<config-root>/pipelines/standard.json` using the production pipeline schema. Pass the named or explicit pipeline reference through ordinary `run` steps rather than relying on a bundled name.
5. Update the demo's shared Standard document to list the six Standard stages as pipeline entries while keeping the scripted scenario document keyed only by the actually selected stage IDs.
6. Extend one existing scenario to show a selected execution profile and one suffix/retry scenario to show the optional `--from` rendering; leave other scenarios on `settings only` so both summary forms remain inspectable.
7. Add a fixed delayed scripted case that performs only its declared fixture operation and enables deterministic drift between preflight and a later stage without arbitrary scenario code.
8. Add `07-runtime-prerequisite` to begin from a clean preflight-valid ignored brief-plan fixture, remove that plan while a preceding `spec` stage is deliberately delayed, and stop on the next stage's runtime prerequisite banner without creating an out-of-policy Git change.
9. Add `08-stage-contract-violation` to run a single `spec` stage whose scripted `DONE` leaves no `spec.md`, stopping on the postcondition banner before Git policy runs.
10. Renumber the former scenarios `07`–`18` to `09`–`20` so the new routine contract pauses sit before generic failures. Update every renamed module import/comment and keep each scenario focused on one visible state.
11. Run the new/extended scenarios without color and confirm their declared exit codes and terminal blocks; keep behavioral assertions in Vitest rather than adding output assertions to the demo driver.

**Files modified:**

- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/display/terminal.ts`
- `cli/src/display/terminal.test.ts`
- `cli/src/harness/scripted/invoker.ts`
- `cli/src/harness/scripted/invoker.test.ts`
- `cli/scripts/demo.mjs`
- `cli/scripts/demo/fixture.mjs`
- `cli/scripts/demo/pipeline.mjs`
- `cli/scripts/demo/steps.mjs`
- `cli/scripts/scenarios/01-all-done.mjs`
- `cli/scripts/scenarios/06-retry.mjs`
- `cli/scripts/scenarios/07-runtime-prerequisite.mjs` (NEW)
- `cli/scripts/scenarios/08-stage-contract-violation.mjs` (NEW)
- `cli/scripts/scenarios/07-failed-no-outcome.mjs` (RENAMED to `09-failed-no-outcome.mjs`)
- `cli/scripts/scenarios/08-failed-harness-error.mjs` (RENAMED to `10-failed-harness-error.mjs`)
- `cli/scripts/scenarios/09-failed-idle-timeout.mjs` (RENAMED to `11-failed-idle-timeout.mjs`)
- `cli/scripts/scenarios/10-failed-git-policy.mjs` (RENAMED to `12-failed-git-policy.mjs`)
- `cli/scripts/scenarios/11-failed-commit.mjs` (RENAMED to `13-failed-commit.mjs`)
- `cli/scripts/scenarios/12-failed-queue-scan.mjs` (RENAMED to `14-failed-queue-scan.mjs`)
- `cli/scripts/scenarios/13-interrupted.mjs` (RENAMED to `15-interrupted.mjs`)
- `cli/scripts/scenarios/14-checkpoint-write-failure.mjs` (RENAMED to `16-checkpoint-write-failure.mjs`)
- `cli/scripts/scenarios/15-permissions-warning.mjs` (RENAMED to `17-permissions-warning.mjs`)
- `cli/scripts/scenarios/16-heartbeat.mjs` (RENAMED to `18-heartbeat.mjs`)
- `cli/scripts/scenarios/17-long-content.mjs` (RENAMED to `19-long-content.mjs`)
- `cli/scripts/scenarios/18-list.mjs` (RENAMED to `20-list.mjs`)

**Verification:**

1. Run `npm --prefix cli run test -- src/display/terminal.test.ts src/commands/run.test.ts src/commands/resume.test.ts src/harness/scripted/invoker.test.ts`.
2. Run `npm --prefix cli run demo -- --scenario 01-all-done --no-color`.
3. Run `npm --prefix cli run demo -- --scenario 06-retry --no-color`.
4. Run `npm --prefix cli run demo -- --scenario 07-runtime-prerequisite --no-color`.
5. Run `npm --prefix cli run demo -- --scenario 08-stage-contract-violation --no-color`.
6. Run `npm --prefix cli run demo -- --scenario 17-permissions-warning --no-color`.
7. Run `npm --prefix cli run check`.

**Acceptance criteria:**

- New-run and resume startup show pipeline name/source, profile name/source or `settings only`, optional `--from`, and every selected stage's ordered harness/model/target before the first attempt.
- Startup remains non-interactive and emits no confirmation prompt.
- Resume renders only snapshotted execution data and is unaffected by missing or edited source documents.
- The demo provisions an external Standard pipeline and canonical local bindings inside its isolated config root.
- Existing scenarios validate scripted documents against selected stage IDs rather than a bundled Standard stage list.
- Separate scenarios visibly cover runtime prerequisite and postcondition-contract pauses.
- Existing/extended scenarios cover selected-profile, settings-only, and `--from` summary shapes.
- Renumbered scenarios remain in intended reading order and each declared demo exits with its expected code.
- The targeted tests, selected demos, and full CLI gate pass.

**Consumes:** selected pipeline/profile provenance, `--from`, ordered resolved stage bindings/targets from Task 4; runtime prerequisite and postcondition waiting reasons from Task 5.

**Produces:** the non-interactive resolved-execution startup block; scripted demo fixtures for external pipelines and profiles; `07-runtime-prerequisite` and `08-stage-contract-violation` terminal demonstrations; renumbered `09`–`20` scenario catalog.
