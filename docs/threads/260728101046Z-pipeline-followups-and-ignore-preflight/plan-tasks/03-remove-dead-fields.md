### Task 3: Remove dead reference and Git-cursor fields

**Objective:** Reduce `DocumentReference` and the checkpoint Git cursor to the properties production behavior actually consumes.

**Input / context:** `spec.md` FR-7; `decisions.md DR8` and `decisions.md DR14`; the pre-release schema licence in `cli/AGENTS.md`; and Task 2's renamed `cli/scripts/scenarios/21-list.mjs`.

**Steps:**
1. Change `DocumentReference` in `cli/src/config/references.ts` to exactly `{ role, sourcePath }`, remove `raw` and `form` from both resolved-reference object literals, and rewrite the type comment to describe source provenance without claiming a diagnostic consumes removed fields.
2. Update `cli/src/config/references.test.ts` to assert the two-property result for name and path routing while retaining coverage that syntax alone selects the same source paths. Remove only property-specific `.raw` and `.form` expectations.
3. Change `RunCheckpoint.gitCursor` in `cli/src/state/checkpoint.ts` to `{ stageIndex, observedHead }`. Make checkpoint validation accept exactly those fields, reject `headAtStageEntry`, validate only `observedHead` as a commit string or `null`, and keep the cross-field invariant keyed to `observedHead` with a diagnostic that names it.
4. Add or adapt a checkpoint test that first fails against the old validator by supplying `headAtStageEntry`, then passes after removal by proving the legacy property is rejected. Update every valid checkpoint fixture to the new shape.
5. Remove stage-entry cursor propagation from `run.ts`, `resume.ts`, and `runner.ts`. Every executing, paused, advanced, interrupted, and completed cursor writes only `stageIndex` and `observedHead`; attempt-boundary behavior continues to use its existing attempt-start HEAD, and resume continues to compare `observedHead` with current `HEAD`.
6. Update runner and persistence expectations, list-command fixtures, and the renamed list demo's seeded checkpoints. Preserve the observed-HEAD comparison and its user-visible diagnostic.
7. Run reference and checkpoint focused tests, typecheck, the aggregate list demo, and the full CLI gate. Confirm the removed identifier is absent under `cli/` while unrelated uses of the words `raw` and `form` remain untouched.

**Files modified:**

- `cli/src/config/references.ts`
- `cli/src/config/references.test.ts`
- `cli/src/state/checkpoint.ts`
- `cli/src/state/checkpoint.test.ts`
- `cli/src/state/persist.test.ts`
- `cli/src/commands/run.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/list.test.ts`
- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`
- `cli/scripts/scenarios/21-list.mjs`

**Verification:**

- `npm --prefix cli run test -- src/config/references.test.ts src/state/checkpoint.test.ts src/state/persist.test.ts src/commands/list.test.ts src/runner/runner.test.ts` exits `0`.
- `npm --prefix cli run typecheck` exits `0`.
- `npm --prefix cli run demo -- --scenario 21-list --no-color` reports `[PASS]`.
- `rg -n 'headAtStageEntry' cli` returns no matches.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- Every successful `DocumentReference` contains only `role` and `sourcePath`, with routing and diagnostics unchanged.
- Every Git cursor contains only `stageIndex` and `observedHead`, and a checkpoint carrying `headAtStageEntry` is rejected.
- No migration, compatibility shim, optional legacy field, or schema-version bump is introduced.
- Resume still reports an `observedHead` difference against current `HEAD`, and the cursor-index invariant still applies whenever `observedHead` is populated.
- No user-visible string, exit code, or rendering changes as a result of the field removal.

**Consumes:** `cli/scripts/scenarios/21-list.mjs` and the run/resume preflight order produced by Task 2.

**Produces:** `DocumentReference = { role, sourcePath }`; `RunCheckpoint.gitCursor = { stageIndex, observedHead }`; checkpoint and demo fixtures valid against that shape.
