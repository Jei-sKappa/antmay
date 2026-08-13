### Task 2: Extend aggregate cross-field coverage to every invariant

**Objective:** Bring the aggregate cross-field regression to every one of the six
cross-field invariants and pin the two diagnostics a `resume-finalized-done`
recovery owes when its reference resolves to nothing and its queue resolution
disagrees — so the restructure in tasks 3 and 4 lands against a net that already
holds.

**Input / context:** `plan-tasks/01-relocate-validator-test.md` has moved the
suite to `cli/src/state/checkpoint/validate.test.ts`; all edits here are made
there. `decisions.md` DR6 settles both additions and why the second needs its own
document: recovery resolution reads `checkpoint.stageIndex`, and the existing
aggregate document's opening fault is a deliberately out-of-range `stageIndex`, so
an attempt reference placed there would owe a "must name the current stage"
diagnostic that is a consequence of that fault rather than an independent one.
`decisions.md` DR3 is what the second case exists to enforce — the
queue-resolution check must stay outside the successful-lookup branch — and
`decisions.md` DR7 settles that this constraint is recorded as a comment on that
case rather than as module memory.

Both additions describe behavior the current implementation already has, so this
task's assertions must pass against `cli/src/state/checkpoint/validate.ts`
**unmodified**. If either fails here, the fixture is wrong — do not touch the
validator to make it pass.

The relevant existing furniture in the suite: `validCheckpoint()` builds the
shape-valid two-stage `waiting-for-user` fixture (stage 0 is `spec` with
`queueResolution: "rerun"`, stage 1 is `plan-strict`); `doneAttempt(overrides)`
returns a settled current-stage attempt carrying a `DONE` terminal token;
`liveAttempt(overrides)` returns that same attempt still executing, with
`endedAt` and `headAfterAttempt` absent rather than undefined;
`withRecovery(recovery, attempts)` builds a `waiting-for-user` checkpoint stating
one recovery and two deliberately unrelated reasons;
`crossFieldMultiFaultCheckpoint()` returns the existing shape-valid four-fault
document paired with its exact ordered diagnostics; and the
`validateCheckpoint aggregate reporting` describe block holds the case that
asserts them with `toEqual`.

**Steps:**
1. In `crossFieldMultiFaultCheckpoint()`, append a second attempt to the document — `doc.attempts.push(liveAttempt({ attempt: 2, logPath: "logs/00-spec-attempt-02.log" }))` — placed after the four existing fault assignments. This attempt is shape-valid (an `executing` attempt carrying neither `endedAt` nor `headAfterAttempt`), names stage 0 with the matching stage id `"spec"`, and reuses no attempt number, so it owes nothing to any invariant but the executing-attempt-position rule.
2. Append the diagnostic that fault owes as the fifth and last entry of that helper's returned `diagnostics` array, exactly: `` `a "waiting-for-user" run must have no attempt with result "executing".` ``
3. Update the helper's doc comment so it describes a shape-valid checkpoint carrying **five** independent cross-field faults, keeping its existing statement that none prevents the validator from reaching the cross-field pass and none is a consequence of another.
4. Add a sibling fixture helper beside `crossFieldMultiFaultCheckpoint()`, named `recoveryMultiFaultCheckpoint()`, with the same `{ doc: RunCheckpoint; diagnostics: string[] }` return shape. It returns `withRecovery({ kind: "resume-finalized-done", attempt: { stageIndex: 0, attempt: 2 }, queueResolution: "advance" }, [doneAttempt({ result: "done" })])` as its document — a shape-valid `waiting-for-user` checkpoint at `stageIndex: 0` whose one recorded attempt is numbered 1 with result `"done"` and a `DONE` terminal token, whose recovery names attempt 2, and whose current stage declares `queueResolution: "rerun"`.
5. Pair it with exactly these two diagnostics, in this order: `` `waiting.recovery.attempt names no recorded attempt (stage 0, attempt 2).` `` then `` `waiting.recovery.queueResolution "advance" does not match the current stage's snapshotted resolution "rerun".` ``
6. Give that helper a doc comment stating that the reference resolves to no recorded attempt while the queue resolution independently disagrees, so the document owes two diagnostics from the recovery-resolution invariant alone and reaches no other invariant.
7. Add a case to the `validateCheckpoint aggregate reporting` describe block that calls `recoveryMultiFaultCheckpoint()`, calls `validateCheckpoint(doc)`, asserts `result.ok` is `false`, and inside the `if (!result.ok)` narrowing asserts `expect(result.errors).toEqual(diagnostics)` — exact ordered array equality, never `toContain` and never `errors.some(...)`, because exact equality is the only assertion that fails when a diagnostic goes missing.
8. Comment that case with what it exists to catch: the queue-resolution agreement check is independent of the attempt-reference lookup, so it runs whether or not the reference resolved; nesting it inside the successful-lookup branch is the natural rewrite and would silently drop the second diagnostic, and this case is the only test that fails when that happens.
9. Leave the field-shape aggregate case, `fieldShapeMultiFaultCheckpoint()`, and every other case in the file untouched.

**Files modified:** `cli/src/state/checkpoint/validate.test.ts`

**Verification:**
- `npm --prefix cli run test -- src/state/checkpoint/validate.test.ts` exits `0` with `cli/src/state/checkpoint/validate.ts` unmodified — confirm with `git status --porcelain cli/src/state/checkpoint/validate.ts` printing nothing.
- Temporarily edit the existing cross-field aggregate expectation to drop its last diagnostic and confirm the suite fails; restore it. Then temporarily move the queue-resolution check in `validate.ts` inside the `else` branch that follows a successful `checkpoint.attempts.find(...)` lookup, confirm the new case fails on the missing second diagnostic, and revert that edit with `git checkout -- cli/src/state/checkpoint/validate.ts`.
- `grep -n "toEqual" cli/src/state/checkpoint/validate.test.ts` shows the new case asserting with `toEqual`, and the new case contains no `toContain` or `.some(`.
- `npm --prefix cli run check` exits `0`.
- `npm --prefix cli run lint` exits `0`.

**Acceptance criteria:**
- The existing shape-valid cross-field aggregate case carries five mutually independent faults and asserts exactly five diagnostics, as an exact ordered array, in table order: bounds, harness coverage, workspace equality, attempts/stage agreement, executing-attempt position. (AC-5.1)
- A separate aggregate case on a shape-valid `waiting-for-user` document at `stageIndex: 0`, with one `done` attempt numbered 1 carrying a `DONE` token and a `resume-finalized-done` recovery naming attempt 2 with `queueResolution: "advance"` against a stage declaring `"rerun"`, asserts exactly two diagnostics as an exact ordered array: the missing-reference diagnostic, then the queue-resolution diagnostic. (AC-5.2)
- Every cross-field invariant now contributes at least one diagnostic to at least one aggregate case. (AC-5.3)
- The second case fails if the queue-resolution check is moved inside the successful-lookup branch, and its assertion is exact-array equality rather than a `some(regex)` or a `toContain`. (AC-5.4)
- The queue-resolution independence constraint is stated in a comment on that case, explaining what the case exists to catch. (AC-5.5)
- `cli/src/state/checkpoint/validate.ts` is unmodified by this task, and every pre-existing case in the suite still passes unchanged. (AC-4.1)

**Consumes:** `cli/src/state/checkpoint/validate.test.ts` at its relocated path,
from task 1.

**Produces:** Two aggregate regressions in
`cli/src/state/checkpoint/validate.test.ts` — the five-diagnostic cross-field case
and the two-diagnostic recovery-resolution case — which tasks 3 and 4 are verified
against and must not weaken.
