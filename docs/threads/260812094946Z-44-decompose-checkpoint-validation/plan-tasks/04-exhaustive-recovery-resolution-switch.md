### Task 4: Make recovery resolution exhaustive over the recovery kind

**Objective:** Rewrite `recoveryResolvesAgainstAttemptHistory` as a `switch` total
over the `WaitingRecovery` union, so a fifth recovery kind fails to typecheck here
rather than silently inheriting the `"waiting"` attempt-result requirement — and
confirm the whole change's footprint before it is done.

**Input / context:** `plan-tasks/03-table-driven-cross-field-invariants.md` has
made this invariant a pure function of the narrowed checkpoint, still entering on
`recovery.kind !== "retry-stage"` and still picking the required attempt result
with a ternary against `"resume-finalized-done"`. `decisions.md` DR3 settles the
switch, its four branches, and the constraint that decides this task's shape: the
queue-resolution agreement check stays independent of the reference lookup — it
runs whether or not the referenced stage index matched the current stage and
whether or not the referenced attempt was found, so a `resume-finalized-done`
recovery that both names no recorded attempt and disagrees on queue resolution
owes two diagnostics, the reference one first. Nesting that check inside a
successful lookup is the natural rewrite and it silently drops a diagnostic; the
case task 2 added is what catches it.

The union to switch over is `WaitingRecovery` in
`cli/src/state/checkpoint/types.ts`. Do not import `AttemptReferencingRecovery` or
any other name from `cli/src/execution/` — the architecture guard would then
require the import and the dependency direction is wrong. That guard's
recovery-kind exemption must remain the single path
`state/checkpoint/validate.ts`, and the guard itself is not edited; it permits
this switch because it deliberately does not match `case` clauses. Behavior for
all four existing kinds is identical to today's, so the suite must pass with no
test edit.

**Steps:**
1. Extract the reference-resolution checks into one module-private helper beside the invariant, `attemptReferenceDiagnostics(checkpoint: RunCheckpoint, reference: AttemptReference, requiredResult: "done" | "waiting", kind: string): string[]`, adding `AttemptReference` to the existing type-only import from `./types.js`. Its body is today's block verbatim: report the stage-index diagnostic when `reference.stageIndex !== checkpoint.stageIndex`; otherwise look the attempt up in `checkpoint.attempts`, report the no-recorded-attempt diagnostic when it is absent, and when it is present report the stale-attempt diagnostic unless it is the final attempt in the ordered history, the non-`DONE`-token diagnostic unless its terminal token is `DONE`, and the wrong-result diagnostic unless its result equals `requiredResult`. Every diagnostic keeps its exact wording, interpolations, and relative order, and the token message keeps interpolating `DONE_OUTCOME`.
2. Rewrite the invariant body as the switch below. Every case returns and no statement follows the switch — that is what makes a fifth union member a typecheck failure, because the function's declared `string[]` return type does not include the `undefined` a reachable function end would produce.
   ```ts
   function recoveryResolvesAgainstAttemptHistory(checkpoint: RunCheckpoint): string[] {
     const recovery = checkpoint.waiting?.recovery;
     if (recovery === undefined) return [];
     switch (recovery.kind) {
       case "retry-stage":
         return [];
       case "resume-finalized-done": {
         const current = checkpoint.stages[checkpoint.stageIndex];
         return [
           ...attemptReferenceDiagnostics(checkpoint, recovery.attempt, "done", recovery.kind),
           ...(current !== undefined && recovery.queueResolution !== current.queueResolution
             ? [
                 `waiting.recovery.queueResolution "${recovery.queueResolution}" does not match the current stage's snapshotted resolution "${current.queueResolution}".`,
               ]
             : []),
         ];
       }
       case "recheck-stage-contract":
       case "retry-git-finalization":
         return attemptReferenceDiagnostics(checkpoint, recovery.attempt, "waiting", recovery.kind);
     }
   }
   ```
   The `resume-finalized-done` case is the load-bearing one: the queue-resolution entry is a sibling of the reference diagnostics in the same array literal, never a branch reached only after a successful lookup.
3. Keep the long explanatory doc comment task 3 carried onto this invariant, and keep the invariant's entry in `CROSS_FIELD_INVARIANTS` in sixth position, unchanged.
4. Confirm the change's whole footprint before finishing: across tasks 1 through 4 this thread touches exactly two files — `cli/src/state/checkpoint/validate.ts` and the renamed `cli/src/state/checkpoint/validate.test.ts`.

**Files modified:** `cli/src/state/checkpoint/validate.ts`

**Verification:**
- `npm --prefix cli run test -- src/state/checkpoint/validate.test.ts` exits `0` with `cli/src/state/checkpoint/validate.test.ts` unmodified — confirm with `git status --porcelain cli/src/state/checkpoint/validate.test.ts` printing nothing.
- Temporarily add a fifth member to the `WaitingRecovery` union in `cli/src/state/checkpoint/types.ts`, run `npm --prefix cli run typecheck`, and confirm it fails at this switch; revert with `git checkout -- cli/src/state/checkpoint/types.ts` and confirm `git diff --stat cli/src/state/checkpoint/types.ts` is empty afterwards.
- Temporarily move the queue-resolution entry inside a successful-lookup branch, confirm the two-diagnostic aggregate case from task 2 fails, and revert.
- `grep -n "execution/" cli/src/state/checkpoint/validate.ts` returns nothing.
- `npm --prefix cli run test -- src/architecture.test.ts` exits `0`, `git status --porcelain cli/src/architecture.test.ts` prints nothing, and `grep -n 'const VALIDATOR = "state/checkpoint/validate.ts"' cli/src/architecture.test.ts` still shows that single exempt path.
- `git status --porcelain` over the repository lists exactly the rename of `cli/src/state/checkpoint.test.ts` to `cli/src/state/checkpoint/validate.test.ts` and the modification of `cli/src/state/checkpoint/validate.ts`, and nothing under `cli/AGENTS.md`, `cli/README.md`, `cli/vitest.config.ts`, `cli/src/architecture.test.ts`, or `cli/scripts/scenarios/`.
- `grep -n '"schemaVersion"\|schemaVersion: 0' cli/src/state/checkpoint/types.ts` still shows `schemaVersion: 0`, and no migration, compatibility shim, barrel, or re-export was introduced.
- `npm --prefix cli run check` exits `0`.
- `npm --prefix cli run lint` exits `0`.

**Acceptance criteria:**
- The recovery-resolution invariant is a `switch` over `recovery.kind` total over `WaitingRecovery`; adding a fifth member to that union in `cli/src/state/checkpoint/types.ts` produces a typecheck failure at this switch. (AC-3.1)
- `retry-stage` yields an empty diagnostic list; `resume-finalized-done` requires the referenced attempt's result to be `"done"`; `recheck-stage-contract` and `retry-git-finalization` require `"waiting"`. (AC-3.2)
- `cli/src/state/checkpoint/validate.ts` imports nothing from `cli/src/execution/`. (AC-3.3)
- `cli/src/architecture.test.ts` passes unmodified, and its recovery-kind exemption is still the single path `state/checkpoint/validate.ts`. (AC-3.4)
- The queue-resolution check runs whether or not the reference resolved, and a `resume-finalized-done` recovery that both names no recorded attempt and disagrees on queue resolution reports two diagnostics, the reference one first. (AC-5.4)
- Every case in the validator test file passes, unmodified except for the one extended document and the one added case from task 2. (AC-4.1)
- `cli/src/state/checkpoint/types.ts` is byte-identical to its pre-change state, `schemaVersion` is still `0`, and no migration, compatibility shim, barrel, or re-export is introduced. (AC-4.4)
- The thread's change touches exactly two files: `cli/src/state/checkpoint/validate.ts` and the renamed `cli/src/state/checkpoint/validate.test.ts`. (AC-7.1)
- `cli/AGENTS.md`, `cli/README.md`, `cli/vitest.config.ts`, `cli/src/architecture.test.ts`, and everything under `cli/scripts/scenarios/` are unchanged. (AC-7.2)
- `npm --prefix cli run check` passes. (AC-7.3)
- `npm --prefix cli run lint` passes. (AC-7.4)

**Consumes:** `recoveryResolvesAgainstAttemptHistory` and its sixth-position entry
in `CROSS_FIELD_INVARIANTS` from task 3; the two-diagnostic aggregate case from
task 2, which is what proves the queue-resolution check stayed independent.

**Produces:** none — this is the plan's final task.
