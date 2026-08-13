# Decompose checkpoint validation without weakening aggregate diagnostics

## Intended outcome

`cli/src/state/checkpoint/validate.ts` validates an untrusted `state.json` document in
two passes: a field-shape sweep, then — only if that sweep found nothing — a set of
cross-field invariants. After this change the second pass is an enumerable list of six
named, pure invariants driven from a declared table, the two passes exchange nothing but
the narrowed checkpoint, and the invariant that resolves a pause's recovery is exhaustive
over the recovery kinds instead of testing them by comparison.

Nothing observable changes. Every diagnostic keeps its exact wording and position, every
document the validator accepts is still accepted, every document it rejects is still
rejected, and `validateCheckpoint(doc: unknown): CheckpointResult` remains the module's
one exported entry point. What changes is that "one call reports every discoverable
problem" stops being a property a reader has to verify by reading 150 lines of procedure,
and becomes a property of a table that cannot be short-circuited.

## Context

The module is the untrusted-input boundary of the CLI's durable run state. A parsed
`state.json` is assumed to be nothing until this file has checked every field shape and
every cross-field invariant it declares, and the executor depends on its exhaustiveness:
a resume reads only the checkpoint, so a document this validator wrongly accepts is a
document the engine will act on.

The thread was opened from a maintainability report (see `seed.md` and
`https://github.com/Jei-sKappa/antmay/issues/44`) which proposed decomposing the whole
934-line module and, as a prerequisite, adding a shape-valid aggregate regression proving
that several independent cross-field faults are all reported from one call. Discussion
established two things that reshaped the work, both recorded in `decisions.md`:

- That prerequisite regression **already exists** and is stronger than the report assumed
  — it asserts exact ordered array equality over four independent cross-field
  diagnostics — so no work here is gated on writing it (per `decisions.md` DR1).
- The module is not uniformly in poor condition. Its twenty field-shape helpers are
  already purpose-named and its field sweep is a flat walk of the document's own field
  list, so decomposing those would be motivated only by the module's line count. The
  cross-field pass is different: six comment-delimited sections in one unbroken block,
  which is exactly the defect `cli/AGENTS.md` names when it says a function long enough
  to need internal section comments is a set of collaborators that has not been named
  yet.

So the work is deliberately narrower than the report proposed, and the module will remain
roughly its current length. That is an accepted outcome, not a shortfall
(per `decisions.md` DR1).

## Scope

### In scope

- The cross-field pass of `cli/src/state/checkpoint/validate.ts`: its six sections become
  six pure invariants driven from a declared table.
- The coupling between the two passes: the intermediates the field sweep currently
  produces for the cross-field pass are removed.
- The recovery-resolution invariant becomes an exhaustive `switch` over the recovery kind
  (per `decisions.md` DR3).
- Two additions to the aggregate cross-field regression (per `decisions.md` DR6).
- Relocating the validator's test file beside the module it covers
  (per `decisions.md` DR5).

### Out of scope

- **The structure of the field-shape sweep and its twenty existing private helpers.** No
  helper is grouped, split, renamed, or has any of its checks changed; grouping them would
  invent divisions the document's schema does not have (per `decisions.md` DR1). The single
  edit any helper takes is `validateStage` ceasing to return the stage info it fed the
  second pass, which follows from deleting that intermediate (AC-1.3).
- **Any new module or directory under `cli/src/state/checkpoint/`.** The invariants and
  their table stay inside `validate.ts` (per `decisions.md` DR4).
- **A declarative schema library.** No new runtime dependency
  (per `decisions.md` DR1).
- **Any checkpoint schema change**, `schemaVersion` change, migration, compatibility
  shim, barrel, or re-export.
- **`readCheckpoint` test coverage.** Every `readCheckpoint` case stays in
  `cli/src/state/persist.test.ts`; no `state/checkpoint/read.test.ts` is created and no
  shared checkpoint fixture is extracted into `test-helpers/`
  (per `decisions.md` DR5).
- **Documentation and demo scenarios.** No `cli/AGENTS.md` or `cli/README.md` edit, and
  no scenario added or extended (per `decisions.md` DR7).
- **Reducing the module's line count.** Not a goal, and not a measure of success.

## Expected behavior

### The pass boundary carries only the narrowed checkpoint

The field sweep currently produces four locals that exist solely to feed the cross-field
pass — `stageInfos`, an `observedHarnesses` map, `stageCount`, and `stageIndexValid` — and
the cross-field pass also reads the sweep's `condition` local. All of them are redundant
after the sweep, because the cross-field pass runs only when the sweep reported no errors,
at which point the document has been narrowed to `RunCheckpoint` and each value is either
readable off that typed value or unconditionally true (per `decisions.md` DR1).

- The four locals that exist only for the second pass are deleted outright.
- `validateStage` no longer returns a value and no longer derives a bound harness from
  its `binding.agent`; that derivation existed only to populate `stageInfos`.
- `condition` remains a local of the field sweep, because the sweep's own
  `waiting`/`condition` consistency check needs it while the document is still untrusted.
  It is simply no longer read after the pass boundary. This is the one of the five that
  cannot be deleted without changing field-sweep behavior, which is out of scope.
- The `if (stageIndexValid && condition !== undefined)` guard that opens the cross-field
  pass is unconditionally true where it stands and disappears with the locals.

### The cross-field pass is a declared table of pure invariants

Six invariants, each a pure function whose sole parameter is the narrowed `RunCheckpoint`
and whose result is its own `string[]` of diagnostics (per `decisions.md` DR2). None takes
an error accumulator and none mutates anything. The coordinator runs them by flat-mapping
a declared readonly table into its accumulated errors, with no conditional and no exit
between entries.

The table's order is the diagnostic order, and it is:

1. **`stageIndex` bounds by condition** — a `completed` run must sit at exactly the stage
   count; any other condition must sit below it.
2. **Observed-harness coverage** — every snapshotted stage's bound harness must have an
   entry in `observedHarnessVersions`. May report one diagnostic per uncovered stage.
3. **Workspace path equality** — `workspace.path` must equal `workspace.execution.cwd`.
4. **Attempts agree with snapshotted stages** — per attempt: the stage index is in range,
   the recorded stage id matches the snapshotted stage, attempt numbers do not repeat
   within a stage, and a `done` attempt carries a parsed `DONE` outcome. May report
   several diagnostics.
5. **Executing-attempt position** — exactly the final attempt is `executing` if and only
   if the run is `executing`.
6. **Recovery resolution** — the pause's recovery must resolve against the recorded
   attempt history. May report several diagnostics.

The field-shape helpers keep their existing signatures, accumulating diagnostics by pushing
into a caller-supplied `errors` array; the pure signature governs the cross-field
collaborators only (per `decisions.md` DR2).

### The recovery-resolution invariant is exhaustive

It switches over `recovery.kind` across the `WaitingRecovery` union declared in
`cli/src/state/checkpoint/types.ts`, total over the four kinds
(per `decisions.md` DR3):

- `retry-stage` contributes no diagnostics.
- `resume-finalized-done` runs the attempt-reference checks requiring result `"done"`,
  then the queue-resolution agreement check.
- `recheck-stage-contract` and `retry-git-finalization` run the attempt-reference checks
  requiring result `"waiting"`.

Behavior for those four kinds is identical to today's. What the switch adds is that a
fifth kind added to the union fails to typecheck here rather than silently inheriting the
`"waiting"` requirement.

**The queue-resolution check stays independent of the reference lookup.** It runs whether
or not the referenced stage index matched the current stage and whether or not the
referenced attempt was found. A `resume-finalized-done` recovery that both names no
recorded attempt and disagrees on queue resolution therefore owes two diagnostics, the
reference one first. Nesting that check inside a successful lookup is the natural rewrite
and it silently drops a diagnostic (per `decisions.md` DR3).

### Diagnostics are preserved exactly

Every diagnostic string keeps its current wording, interpolations, and position in the
returned array. The field-shape pass still returns before the cross-field pass runs, so a
document carrying both a field fault and a cross-field fault still reports only the field
fault.

### Aggregate coverage reaches every invariant

Two changes to the aggregate regression (per `decisions.md` DR6):

- The existing shape-valid cross-field document gains a fifth independent fault: a second
  attempt with result `"executing"` carrying neither `endedAt` nor `headAfterAttempt`,
  which is shape-valid and trips invariant 5. The case keeps its exact ordered array
  assertion, now over five diagnostics.
- A new case exercises invariant 6 owing two diagnostics on its own: a `waiting-for-user`
  document at `stageIndex: 0` with one recorded attempt numbered 1 whose result is
  `"done"` and whose terminal token is `DONE`, and a `resume-finalized-done` recovery
  naming attempt **2** with `queueResolution: "advance"` against a current stage that
  declares `"rerun"`. It asserts exactly two diagnostics as an exact ordered array —
  the missing-reference one, then the queue-resolution one.

Invariant 6 needs its own document rather than joining the first: it reads
`checkpoint.stageIndex`, and the first document's opening fault is a deliberately
out-of-range `stageIndex`, so any attempt reference placed there would produce a "must
name the current stage" diagnostic that is a consequence of that fault rather than an
independent one.

### The validator's test file moves beside the validator

`cli/src/state/checkpoint.test.ts` becomes
`cli/src/state/checkpoint/validate.test.ts` via `git mv`, with its three affected import
specifiers corrected and nothing else about it changed beyond the DR6 additions
(per `decisions.md` DR5). `cli/src/state/checkpoint/` currently holds no test file at all
while that 1423-line file covers exactly one of the directory's three modules.

## Constraints

- **`cli/src/architecture.test.ts` must pass with no edit.** Two of its guards bear on
  this change directly:
  - The recovery-kind guard bans comparing a recovery kind to a string literal everywhere
    except the single path `state/checkpoint/validate.ts`. That exemption list must remain
    a single path — DR3's switch satisfies the guard because it deliberately does not
    match `case` clauses.
  - The terminal-outcome guard bans a protocol token embedded in a larger string literal.
    Diagnostic messages must keep interpolating `DONE_OUTCOME` rather than spelling
    `DONE` inside the message text. A bare `=== "DONE"` comparison against an
    already-narrowed token stays permitted, because the compiler guards it.
- **`cli/src/state/checkpoint/validate.ts` must not import `cli/src/execution/`.** In
  particular, do not reach for `AttemptReferencingRecovery` or any other name from
  `execution/recovery.ts`; the architecture guard would then require the import, and the
  dependency direction is wrong. Switch over the union declared in
  `state/checkpoint/types.ts` (per `decisions.md` DR3).
- **`cli/src/state/checkpoint/types.ts` is unchanged.** It is guarded to hold nothing but
  type declarations.
- **No new runtime dependency.** The CLI has exactly one and keeps it.
- **`npm --prefix cli run check`** (typecheck + test + build) is the gate, and
  `npm --prefix cli run lint` runs beside it in CI.
- **`vitest.config.ts` is unchanged**; it already includes `src/**/*.test.ts`, so a test
  file inside `state/checkpoint/` is collected without configuration.
- The relocated test file is not one of the three `describe.concurrent` suites, so the
  no-teardown-between-cases convention does not apply to it.

## Acceptance criteria

### FR-1 — The two passes exchange only the narrowed checkpoint

- **AC-1.1** The field sweep declares no `stageInfos`, no `observedHarnesses` map, no
  `stageCount`, and no `stageIndexValid`. What an invariant derives for itself from the
  narrowed checkpoint is not one of these. (DR1)
- **AC-1.2** Every cross-field invariant's parameter list is exactly one parameter typed
  `RunCheckpoint`. No invariant accepts an error array, a count, a condition, or a
  precomputed map. (DR1, DR2)
- **AC-1.3** `validateStage` has return type `void`, and the `binding.agent.harness`
  derivation that fed `stageInfos` is gone. (DR1)
- **AC-1.4** `condition` is still declared and read by the field sweep's
  `waiting`/`condition` consistency check, and is not read after the point where the
  coordinator returns on accumulated field errors. (DR1)

### FR-2 — The cross-field pass is a non-short-circuitable table

- **AC-2.1** A readonly table declares exactly six entries, in this order: `stageIndex`
  bounds, observed-harness coverage, workspace path equality, attempts/stage agreement,
  executing-attempt position, recovery resolution. (DR2)
- **AC-2.2** Every entry's type is a function from `RunCheckpoint` to `string[]`. No entry
  mutates a parameter or reads module-level mutable state. (DR2)
- **AC-2.3** The coordinator runs the table in one flat-mapping expression appended to its
  accumulated errors. Between the table's declaration and that expression there is no
  conditional, no `return`, and no per-entry call site. (DR2)
- **AC-2.4** The table sits between the invariant declarations and `validateCheckpoint`,
  all inside `cli/src/state/checkpoint/validate.ts`. No file is added under
  `cli/src/state/checkpoint/` other than the relocated test. (DR4)
- **AC-2.5** Each invariant's name states the validation purpose it carries, and the
  coordinator keeps a doc comment stating that one call reports every field-shape and
  cross-field problem — so the invariant set is enumerable from the table rather than
  inferred from a procedure. (DR1)

### FR-3 — Recovery resolution is exhaustive over the recovery kind

- **AC-3.1** The recovery-resolution invariant is a `switch` over `recovery.kind` that is
  total over `WaitingRecovery`. Adding a fifth member to that union in
  `state/checkpoint/types.ts` produces a typecheck failure at this switch. (DR3)
- **AC-3.2** `retry-stage` yields an empty diagnostic list; `resume-finalized-done`
  requires the referenced attempt's result to be `"done"`; `recheck-stage-contract` and
  `retry-git-finalization` require `"waiting"`. (DR3)
- **AC-3.3** `cli/src/state/checkpoint/validate.ts` imports nothing from
  `cli/src/execution/`. (DR3)
- **AC-3.4** `cli/src/architecture.test.ts` passes unmodified, and its recovery-kind
  exemption is still the single path `state/checkpoint/validate.ts`. (DR3)

### FR-4 — Validation behavior is unchanged

- **AC-4.1** Every case in the relocated validator test file passes, unmodified except
  for the one extended document and the one added case FR-5 specifies. (DR5)
- **AC-4.2** `validateCheckpoint(doc: unknown): CheckpointResult` is the only export of
  `cli/src/state/checkpoint/validate.ts`.
- **AC-4.3** A document carrying one field-shape fault and one cross-field fault reports
  only the field-shape diagnostic — the pass boundary still returns early.
- **AC-4.4** `cli/src/state/checkpoint/types.ts` is byte-identical to its pre-change
  state, `schemaVersion` is still `0`, and no migration, compatibility shim, barrel, or
  re-export is introduced.
- **AC-4.5** No diagnostic string in the module changes its wording or interpolations, and
  no message spells a terminal-outcome token inside a larger literal.

### FR-5 — Aggregate coverage reaches every invariant and pins the two-diagnostic case

- **AC-5.1** The existing shape-valid cross-field aggregate case carries five mutually
  independent faults and asserts exactly five diagnostics, as an exact ordered array, in
  table order: bounds, harness coverage, workspace equality, attempts/stage agreement,
  executing-attempt position. (DR6)
- **AC-5.2** A separate aggregate case on a shape-valid `waiting-for-user` document at
  `stageIndex: 0`, with one `done` attempt numbered 1 carrying a `DONE` token and a
  `resume-finalized-done` recovery naming attempt 2 with `queueResolution: "advance"`
  against a stage declaring `"rerun"`, asserts exactly two diagnostics as an exact ordered
  array: the missing-reference diagnostic, then the queue-resolution diagnostic. (DR6)
- **AC-5.3** Every entry in the FR-2 table contributes at least one diagnostic to at least
  one aggregate case. (DR6)
- **AC-5.4** AC-5.2's case fails if the queue-resolution check is moved inside the
  successful-lookup branch. Exact-array equality is what makes it fail, so the assertion
  must not be a `some(regex)` or a `toContain`. (DR3, DR6)
- **AC-5.5** The queue-resolution independence constraint is stated in a comment on
  AC-5.2's case, explaining what the case exists to catch. (DR7)

### FR-6 — The validator test sits beside the validator

- **AC-6.1** `cli/src/state/checkpoint/validate.test.ts` exists and
  `cli/src/state/checkpoint.test.ts` does not. (DR5)
- **AC-6.2** Git records the change as a rename of that file, not as a deletion plus an
  addition. (DR5)
- **AC-6.3** Its imports resolve to `./types.js`, `./validate.js`, and
  `../../test-helpers/waiting.js`. (DR5)
- **AC-6.4** `cli/src/state/persist.test.ts` still contains all five of its
  `readCheckpoint` uses; no `cli/src/state/checkpoint/read.test.ts` exists; no module is
  added to `cli/src/test-helpers/`. (DR5)

### FR-7 — Nothing outside the module and its test changes

- **AC-7.1** The change touches exactly two files: `cli/src/state/checkpoint/validate.ts`
  and the renamed `cli/src/state/checkpoint/validate.test.ts`. (DR4, DR5, DR7)
- **AC-7.2** `cli/AGENTS.md`, `cli/README.md`, `cli/vitest.config.ts`,
  `cli/src/architecture.test.ts`, and everything under `cli/scripts/scenarios/` are
  unchanged. (DR7)
- **AC-7.3** `npm --prefix cli run check` passes.
- **AC-7.4** `npm --prefix cli run lint` passes.

## Degrees of freedom

Left to the implementer, because every admissible choice satisfies the criteria above
unchanged, none is user-visible, and each is reversible without revising this spec:

- **The exact identifiers** of the six invariant functions and of the table constant,
  within AC-2.5, and whether the function type is spelled as a named alias or inline on the
  table.
- **How each invariant assembles its diagnostics** — an array literal, a local array
  pushed to and returned, `flatMap` over attempts, or anything else — provided the
  resulting order and content are identical to today's.
- **Where the six functions sit among the existing private helpers**, provided they
  precede the table and the table precedes `validateCheckpoint`.
- **How the two DR6 fixtures are built** — extending the existing multi-fault helper,
  adding a sibling helper, reusing `liveAttempt()` for the executing attempt, or inline
  overrides of `validCheckpoint()`.
- **Whether AC-5.2's case joins the existing `validateCheckpoint aggregate reporting`
  describe block** or gets its own.
- **The wording** of the AC-5.5 comment and of any comment introduced on an invariant.
- **Whether each invariant carries a doc comment** naming its purpose, and how the
  existing section comments are redistributed onto the functions that replace them.

Explicitly **not** free, and pinned above: the diagnostic strings, their order, the
table's entry order, the exhaustive `switch`, the queue-resolution check's independence
from the reference lookup, the file the invariants live in, and the set of files the
change is allowed to touch.
