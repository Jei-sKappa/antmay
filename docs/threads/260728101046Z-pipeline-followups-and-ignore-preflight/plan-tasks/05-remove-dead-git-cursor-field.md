### Task 5: Remove the dead Git-cursor field

**Objective:** Reduce the checkpoint Git cursor to the properties production behavior consumes while preserving observed-HEAD recovery.

**Input / context:** `spec.md` FR-7 AC-7.2 through AC-7.4; `decisions.md DR8`; the pre-release schema licence in `cli/AGENTS.md`; Task 2's run/resume preflight order; and Task 3's renamed `cli/scripts/scenarios/21-list.mjs`.

**Steps:**
1. Change `RunCheckpoint.gitCursor` in `cli/src/state/checkpoint.ts` to `{ stageIndex, observedHead }`. Make checkpoint validation require and validate exactly `stageIndex` and `observedHead` — the latter a commit string or `null` — stop reading `headAtStageEntry` at all, and keep the cross-field invariant keyed to `observedHead` with a diagnostic that names it. Add no unknown-property strictness: whether a previously written `state.json` still validates is not a design consideration.
2. Add or adapt a checkpoint test whose `gitCursor` is exactly `{ stageIndex, observedHead }`, and run it once before the change to observe the pre-change validator reject it for the absent `headAtStageEntry`. Update every valid checkpoint fixture to the new shape.
3. Remove stage-entry cursor propagation from `run.ts`, `resume.ts`, and `runner.ts`. Every executing, paused, advanced, interrupted, and completed cursor writes only `stageIndex` and `observedHead`; attempt-boundary behavior continues to use its existing attempt-start HEAD, and resume continues to compare `observedHead` with current `HEAD`.
4. Update runner and persistence expectations, list-command fixtures, and the renamed list demo's seeded checkpoints. Preserve the observed-HEAD comparison and its user-visible diagnostic.
5. Run checkpoint-focused tests, typecheck, the aggregate list demo, and the full CLI gate. Confirm the removed identifier is absent under `cli/`.

**Files modified:**

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

- `npm --prefix cli run test -- src/state/checkpoint.test.ts src/state/persist.test.ts src/commands/list.test.ts src/commands/resume.test.ts src/runner/runner.test.ts` exits `0`, including the existing observed-HEAD resume comparison.
- `npm --prefix cli run typecheck` exits `0`.
- `npm --prefix cli run demo -- --scenario 21-list --no-color` reports `[PASS]`.
- `rg -n 'headAtStageEntry' cli` returns no matches.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- Every Git cursor contains only `stageIndex` and `observedHead`, and a checkpoint whose cursor carries exactly those two properties validates.
- Every checkpoint literal in the test suite and list demo uses the exact reduced shape.
- No migration, compatibility shim, optional removed field, or schema-version bump is introduced.
- Resume still reports an `observedHead` difference against current `HEAD`, and the cursor-index invariant still applies whenever `observedHead` is populated.
- No user-visible string, exit code, or rendering changes as a result of the field removal.

**Consumes:** the run/resume preflight order produced by Task 2 and `cli/scripts/scenarios/21-list.mjs` produced by Task 3.

**Produces:** `RunCheckpoint.gitCursor = { stageIndex, observedHead }`, production cursor writes over that exact shape, and checkpoint and demo fixtures valid against it.
