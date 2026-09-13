### Task 3: Drive the cross-field pass from a declared table of pure invariants

**Objective:** Replace the cross-field block inside `validateCheckpoint` with six
named pure functions of the narrowed checkpoint, run from one declared readonly
table, and sever the five mutable intermediates the two passes exchange — the four
that exist only for the second pass are deleted outright and the sweep's
`condition` stops being read past the pass boundary — so the invariant set is
enumerable from the table and no edit can short-circuit it.

**Input / context:** `plan-tasks/02-extend-aggregate-cross-field-coverage.md` has
put the five-diagnostic and two-diagnostic aggregate regressions in place; they
are what proves this restructure preserved behavior, so the whole of this task is
verified by the suite passing with no test edit. `decisions.md` DR1 settles that
the cross-field pass takes only the narrowed checkpoint and that the field-shape
sweep and its twenty helpers are otherwise untouched — which is why four of the
five intermediates are deleted and `condition`, the one the sweep itself needs,
merely stops being read after the boundary; DR2 settles the pure `(checkpoint: RunCheckpoint) => string[]`
signature and the flat-mapped table; DR4 settles that the invariants and the table
stay inside `cli/src/state/checkpoint/validate.ts` with no new module or directory
under `cli/src/state/checkpoint/`; DR8 settles that the no-short-circuit
constraint begins only after the field-shape error guard has passed and the
document has been narrowed to `RunCheckpoint` — the field sweep keeps its own
conditionals and its early return.

The five intermediates are all redundant after the sweep, because the cross-field
pass runs only when the sweep reported no errors, at which point the document is
narrowed and each value is either readable off that typed value or unconditionally
true: `stageCount` is `checkpoint.stages.length`, `stageInfos[i]` is
`checkpoint.stages[i]` with its typed `binding.agent.harness`, `observedHarnesses`
is `checkpoint.observedHarnessVersions` (typed `Partial<Record<HarnessId, string>>`),
and `stageIndexValid` and a defined `condition` are both unconditionally true
there. `condition` is the one of the five that stays declared, because the sweep's
own `waiting`/`condition` consistency check needs it while the document is still
untrusted; it is simply not read after the pass boundary.

The sixth invariant is moved in this task with its current logic intact —
including its `recovery.kind !== "retry-stage"` entry test and the ternary that
picks the required attempt result. `plan-tasks/04-exhaustive-recovery-resolution-switch.md`
is what rewrites it. Every diagnostic string, its interpolations, and its position
in the returned array must come through this task unchanged, and no message may
spell a terminal-outcome token inside a larger literal — the two `DONE` messages
keep interpolating `DONE_OUTCOME`.

**Steps:**
1. In `validateStage`, change the return type to `void`. Delete the trailing `harness` derivation (`const harness = isPlainObject(value.binding) && …`) and the closing `if (id === undefined || harness === undefined) return undefined; return { id, harness };`. Change the early `return undefined;` on a non-object value to `return;`. The `let id: string | undefined` declaration and its `else { id = value.id; }` assignment now have no reader, so collapse the catalog-id check to a plain `if (…) { errors.push(\`${label}.id must name a catalog stage.\`); }`, keeping the long explanatory comment above it verbatim. Amend the function's doc comment to drop the sentence about returning the stage id and bound harness, leaving it describing what the function validates.
2. In `validateCheckpoint`, delete the `stageInfos` declaration and have the stages branch call `doc.stages.forEach((stage, i) => validateStage(stage, \`stages[${i}]\`, errors));`. Delete the `const stageCount = …` line that follows the block.
3. Delete the `observedHarnesses` map declaration and the `else { observedHarnesses.set(key, val); }` arm of the `observedHarnessVersions` loop, leaving the `isHarnessId` and `isNonEmptyString` checks and their two diagnostics exactly as they are.
4. Delete `let stageIndexValid = false;` and collapse its check to a plain `if (typeof doc.stageIndex !== "number" || !Number.isInteger(doc.stageIndex) || doc.stageIndex < 0) { errors.push(\`stageIndex must be a non-negative integer.\`); }`. Leave the `condition` local, its check, and the `waiting`/`condition` consistency block untouched.
5. Above `validateCheckpoint`, declare the invariant type and the six functions. Pin the type exactly — it is the contract AC-2.2 is read against:
   ```ts
   /** One cross-field invariant: a pure question asked of an accepted checkpoint. */
   type CrossFieldInvariant = (checkpoint: RunCheckpoint) => string[];
   ```
   Each function takes exactly that one parameter, returns its own array, accepts no error accumulator, mutates nothing, and reads no module-level mutable state.
6. Write invariant 1, `stageIndexWithinConditionBounds`: derive `const stageCount = checkpoint.stages.length;`, and reproduce today's logic against `checkpoint.condition` and `checkpoint.stageIndex` with the outer `stageIndexValid && condition !== undefined` guard dropped — a `completed` run must sit at exactly the stage count, any other condition must sit below it. Both diagnostics keep their exact wording and interpolations.
7. Write invariant 2, `everyStageHarnessObserved`: walk `checkpoint.stages` with its index, read `stage.binding.agent.harness` off the typed stage, and report the existing `stages[${i}] selects harness "…" but observedHarnessVersions has no entry for it.` diagnostic when `checkpoint.observedHarnessVersions[harness]` is `undefined`. It may report one diagnostic per uncovered stage.
8. Write invariant 3, `workspacePathMatchesExecutionCwd`: compare `checkpoint.workspace.path` with `checkpoint.workspace.execution.cwd` and return the existing single diagnostic when they differ.
9. Write invariant 4, `attemptsAgreeWithSnapshottedStages`: move the attempt-level block verbatim, deriving the stage count from `checkpoint.stages.length` for the out-of-range diagnostic. It keeps the per-stage `Map<number, Set<number>>` of seen attempt numbers as a function-local, and keeps all four checks in their current order — stage index in range, recorded stage id matches the snapshotted stage, attempt numbers unique within a stage, and a `done` attempt carrying a parsed `DONE` outcome with `DONE_OUTCOME` still interpolated into the message.
10. Write invariant 5, `executingAttemptIsFinal`: move the executing-index computation and its two branches verbatim, reading `checkpoint.condition` where the block reads the sweep's `condition` local.
11. Write invariant 6, `recoveryResolvesAgainstAttemptHistory`: move the recovery block verbatim, reading `checkpoint.waiting?.recovery`, returning `[]` early when the recovery is absent or its kind is `"retry-stage"`, and collecting into a function-local array it returns. Carry the block's long explanatory comment onto the function as its doc comment. Keep the queue-resolution check where it is today — a sibling of the reference lookup, not nested inside its successful branch.
12. Between the six declarations and `validateCheckpoint`, declare the table: `const CROSS_FIELD_INVARIANTS: readonly CrossFieldInvariant[] = [ … ];` listing exactly the six functions in the order above — bounds, harness coverage, workspace equality, attempts/stage agreement, executing-attempt position, recovery resolution. That order is the diagnostic order.
13. In `validateCheckpoint`, replace the entire cross-field block — everything from the `// stageIndex bounds by condition.` comment through the end of the recovery block — with one expression immediately after `const checkpoint = doc as unknown as RunCheckpoint;`: `errors.push(...CROSS_FIELD_INVARIANTS.flatMap((invariant) => invariant(checkpoint)));`. Between the narrowing and that expression there must be no conditional, no `return`, and no per-invariant call site. Leave the final `if (errors.length > 0) return { ok: false, errors }; return { ok: true, checkpoint };` unchanged, and leave the `// Bail before cross-field invariants…` comment and its early return above the narrowing unchanged.
14. Keep `validateCheckpoint`'s doc comment stating that one call reports every field-shape and cross-field invariant problem at once, and keep `validateCheckpoint` the module's only `export`.

**Files modified:** `cli/src/state/checkpoint/validate.ts`

**Verification:**
- `npm --prefix cli run test -- src/state/checkpoint/validate.test.ts` exits `0` with `cli/src/state/checkpoint/validate.test.ts` unmodified — confirm with `git status --porcelain cli/src/state/checkpoint/validate.test.ts` printing nothing.
- `grep -n "stageInfos\|observedHarnesses\|stageCount\|stageIndexValid" cli/src/state/checkpoint/validate.ts` shows no `stageInfos`, no `observedHarnesses`, no `stageIndexValid`, and `stageCount` only as a function-local inside an invariant.
- `grep -n "CROSS_FIELD_INVARIANTS" cli/src/state/checkpoint/validate.ts` shows exactly two occurrences — the declaration and the single flat-mapping call — and the declaration lists six entries.
- `grep -n "^export" cli/src/state/checkpoint/validate.ts` shows only `export function validateCheckpoint`.
- `grep -n "from \"../../execution/" cli/src/state/checkpoint/validate.ts` returns nothing, and `git diff --stat cli/src/state/checkpoint/types.ts` is empty.
- `npm --prefix cli run test -- src/architecture.test.ts` exits `0` with `cli/src/architecture.test.ts` unmodified.
- `npm --prefix cli run check` exits `0`.
- `npm --prefix cli run lint` exits `0`.

**Acceptance criteria:**
- The field sweep declares no `stageInfos`, no `observedHarnesses` map, no `stageCount`, and no `stageIndexValid`; what an invariant derives for itself from the narrowed checkpoint is not one of these. (AC-1.1)
- Every cross-field invariant's parameter list is exactly one parameter typed `RunCheckpoint` — no error array, count, condition, or precomputed map. (AC-1.2)
- `validateStage` has return type `void`, and the `binding.agent.harness` derivation that fed `stageInfos` is gone. (AC-1.3)
- `condition` is still declared and read by the field sweep's `waiting`/`condition` consistency check, and is not read after the point where the coordinator returns on accumulated field errors. (AC-1.4)
- A readonly table declares exactly six entries in this order: `stageIndex` bounds, observed-harness coverage, workspace path equality, attempts/stage agreement, executing-attempt position, recovery resolution. (AC-2.1)
- Every entry's type is a function from `RunCheckpoint` to `string[]`, mutating no parameter and reading no module-level mutable state. (AC-2.2)
- After the field-shape error guard has passed and the document has been narrowed, the coordinator runs the table in one flat-mapping expression appended to its accumulated errors, with no conditional, no `return`, and no per-entry call site in between. (AC-2.3)
- The table sits between the invariant declarations and `validateCheckpoint`, all inside `cli/src/state/checkpoint/validate.ts`, and no file is added under `cli/src/state/checkpoint/`. (AC-2.4)
- Each invariant's name states the validation purpose it carries, and the coordinator keeps its doc comment stating that one call reports every field-shape and cross-field problem. (AC-2.5)
- `validateCheckpoint(doc: unknown): CheckpointResult` is the only export of the module. (AC-4.2)
- A document carrying one field-shape fault and one cross-field fault still reports only the field-shape diagnostic. (AC-4.3)
- No diagnostic string changes its wording or interpolations, and no message spells a terminal-outcome token inside a larger literal. (AC-4.5)
- `cli/src/state/checkpoint/types.ts` is unchanged and `cli/src/architecture.test.ts` passes unmodified.

**Consumes:** The two aggregate regressions in
`cli/src/state/checkpoint/validate.test.ts` from task 2, which are what verify
this restructure changed nothing observable.

**Produces:** `type CrossFieldInvariant = (checkpoint: RunCheckpoint) => string[]`,
the six invariant functions, and
`const CROSS_FIELD_INVARIANTS: readonly CrossFieldInvariant[]` in
`cli/src/state/checkpoint/validate.ts` — task 4 rewrites the body of
`recoveryResolvesAgainstAttemptHistory` in place, leaving the table untouched.
