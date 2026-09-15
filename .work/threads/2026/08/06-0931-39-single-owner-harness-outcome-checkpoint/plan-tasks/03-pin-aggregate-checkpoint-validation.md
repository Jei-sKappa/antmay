### Task 3: Pin aggregate checkpoint validation

**Objective:** Make the checkpoint validator's all-problems-at-once behavior mechanically observable before its code is moved.

**Input / context:** The repository state after Task 2; `decisions.md DR6`; the `validCheckpoint()` fixture and existing single-fault assertions in `cli/src/state/checkpoint.test.ts`. Use independent faults that do not trigger the schema-version early refusal and whose diagnostics are already stable.

**Steps:**

1. Add one named regression test to `cli/src/state/checkpoint.test.ts` that starts from `validCheckpoint()` and introduces at least three independent faults in separate document regions, such as an invalid UTC timestamp, a relative `repoRoot`, and a non-positive stage heartbeat.
2. Call `validateCheckpoint` once and assert that the returned `errors` array contains the diagnostic for every injected fault, not merely that validation failed or that one error is present.
3. Keep the test helper local to `checkpoint.test.ts`; add no validator branches and change no production behavior.
4. Run the checkpoint test and the full CLI gate.

**Files modified:**

- `cli/src/state/checkpoint.test.ts`

**Verification:** From the repository root, run `npm --prefix cli run test -- src/state/checkpoint.test.ts`, then `npm --prefix cli run check`; both commands exit `0`. The new test's single `validateCheckpoint` result must assert the diagnostics for all injected faults individually.

**Acceptance criteria:**

- One validation call over a checkpoint with at least three independent faults returns a diagnostic for every fault.
- The regression assertion checks the specific expected diagnostics and would fail if `validateCheckpoint` short-circuited after the first problem.
- No production file changes, and the full CLI gate passes.

**Consumes:** none

**Produces:** an aggregate-error regression test in `cli/src/state/checkpoint.test.ts` that Tasks 4 through 6 preserve.
