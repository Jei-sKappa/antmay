# Implementation report

Source: plan.md

## Outcome

All four plan tasks are complete. The validator's cross-field pass is now six
named, pure invariants driven from a declared readonly table, the two passes
exchange nothing but the narrowed checkpoint, recovery resolution is an
exhaustive `switch` over the recovery kind, the aggregate regression reaches
every table entry, and the validator's test file sits beside the module it
covers. Nothing was left partial, nothing was blocked, and no task was found
already satisfied.

Validation behavior is unchanged. Every diagnostic string, its interpolations,
and its position in the returned array are preserved, and the field-shape pass
still returns before the cross-field pass runs.

## Changes

Two files changed, which is the whole footprint the plan allowed.

`cli/src/state/checkpoint/validate.ts`:

- The six comment-delimited cross-field sections became six named pure
  functions typed `CrossFieldInvariant = (checkpoint: RunCheckpoint) =>
  string[]`, listed in diagnostic order in the readonly
  `CROSS_FIELD_INVARIANTS` table between the invariant declarations and
  `validateCheckpoint`: `stageIndex` bounds, observed-harness coverage,
  workspace path equality, attempts/stage agreement, executing-attempt
  position, recovery resolution.
- The coordinator runs the table in one flat-mapping expression immediately
  after the narrowing to `RunCheckpoint`, with no conditional, no `return`, and
  no per-entry call site between. Its doc comment states that one call reports
  every field-shape and cross-field problem.
- `stageInfos`, the `observedHarnesses` map, `stageCount` and `stageIndexValid`
  are deleted, and the `if (stageIndexValid && condition !== undefined)` guard
  went with them. `validateStage` returns `void` and no longer derives a bound
  harness from `binding.agent`. `condition` remains a field-sweep local for the
  sweep's own `waiting`/`condition` consistency check and is not read past the
  pass boundary.
- `recoveryResolvesAgainstAttemptHistory` is a `switch` total over
  `WaitingRecovery`: `retry-stage` yields no diagnostics,
  `resume-finalized-done` requires the referenced attempt's result to be
  `"done"`, and `recheck-stage-contract` and `retry-git-finalization` share a
  fallthrough requiring `"waiting"`. A fifth member added to the union fails to
  typecheck here. The reference checks moved into the module-private
  `attemptReferenceDiagnostics`, and the queue-resolution check stays a sibling
  of them rather than nested inside a successful lookup, so a
  `resume-finalized-done` recovery that both names no recorded attempt and
  disagrees on queue resolution still owes two diagnostics, the reference one
  first.
- `validateCheckpoint(doc: unknown): CheckpointResult` remains the module's one
  export, no name is imported from `cli/src/execution/`, and no file was added
  under `cli/src/state/checkpoint/` other than the relocated test.

`cli/src/state/checkpoint/validate.test.ts` (renamed from
`cli/src/state/checkpoint.test.ts`, recorded by Git as a rename):

- Its three import specifiers now resolve to `./types.js`, `./validate.js`, and
  `../../test-helpers/waiting.js`; nothing else about the relocation changed.
- The shape-valid cross-field aggregate document carries a fifth independent
  fault — a live `executing` attempt 2 — and asserts five diagnostics as an
  exact ordered array.
- A new aggregate case on a shape-valid `waiting-for-user` document pins the
  two recovery-resolution diagnostics as an exact ordered array, carrying the
  comment that explains the queue-resolution independence it exists to catch.

`cli/src/state/checkpoint/types.ts`, `cli/src/architecture.test.ts`,
`cli/vitest.config.ts`, `cli/AGENTS.md`, `cli/README.md`, and everything under
`cli/scripts/scenarios/` are unchanged, `schemaVersion` is still `0`, no
migration, shim, barrel, or re-export was introduced, and no runtime dependency
was added.

## Verification

Every plan task's verification block was run in full, and the project's
standing gate was re-run independently after each task before its commit.

- `npm --prefix cli run check` — exit `0` after every task; final run 49 test
  files / 1194 tests, build success.
- `npm --prefix cli run lint` — exit `0` after every task.
- `cli/src/state/checkpoint/validate.test.ts` — 93/93 pass (92 before the two
  additions).
- `cli/src/architecture.test.ts` — 62/62 pass, unmodified, with
  `state/checkpoint/validate.ts` still the recovery-kind guard's single exempt
  path.
- Behavior preservation was checked textually as well as by test: every
  template literal in the final module was diffed against the pre-change file.
  The only differences are interpolated expressions (`condition` →
  `checkpoint.condition`, `info.harness` → `harness`), which evaluate
  identically at the cross-field boundary, and both `DONE` messages still
  interpolate `DONE_OUTCOME`.
- Four mutation and type probes were run and reverted, each behaving as the
  plan predicted: dropping the fifth cross-field diagnostic fails that
  aggregate case; nesting the queue-resolution check inside the
  successful-lookup branch fails only the new recovery case, on the missing
  second diagnostic; adding a fifth `WaitingRecovery` member produces `TS2366`
  at the switch; the reverted tree was checksum-verified each time.
- The rename is recorded by Git as a rename, `cli/src/state/persist.test.ts`
  still holds its five `readCheckpoint` call sites, no
  `cli/src/state/checkpoint/read.test.ts` exists, and no module was added to
  `cli/src/test-helpers/`.
- The cumulative change footprint was verified with
  `git diff --name-only -M` across the thread's commits: exactly
  `cli/src/state/checkpoint/validate.ts` and the renamed
  `cli/src/state/checkpoint/validate.test.ts`.

Not run: `npm run demo` / `npm run demo:all`. The change alters no
user-visible terminal output, so no scenario reaches it.

## Deviations and judgment calls

- Task 04's footprint bullet is worded against `git status --porcelain` listing
  both the test rename and the validator modification at once. Under the
  per-task commit cadence this run used, tasks 01–03 were already committed by
  then, so that bullet is unsatisfiable as literally worded. It was read as the
  thread's cumulative footprint and verified with a range diff instead, which
  confirmed exactly the two intended files. This is a wording fault in the plan
  task, not a difference in what was built.

## Remaining concerns

- The two diagnostic strings added to the test file
  (`validate.test.ts:496` and `:522`) are non-interpolated template literals
  and the only two backtick literals in that 1500-line file, where every
  sibling string containing double quotes is single-quoted. The plan wrote both
  diagnostics inside markdown code spans, which is the likely source. Lint and
  the formatter accept them and the diagnostic text itself is pinned by the
  assertions, so this was left as-is rather than churned through another
  review cycle.
- `attemptReferenceDiagnostics` takes `kind: string` where
  `WaitingRecovery["kind"]` would state the truth. The plan task mandates that
  signature verbatim and the value is only interpolated into a message, so the
  looseness is inert — but it widens a closed set inside the one module the
  recovery-kind guard exempts.
- The fifth aggregate fault is independent of the other four only because the
  executing-attempt invariant keys off `condition` rather than `stageIndex`,
  and because the sibling attempt it joins names the same stage. Both hold
  today; the exact-array assertion is what would catch a future edit that made
  one fault a consequence of another.

## Follow-ups

- The field-shape sweep and its twenty private helpers were deliberately left
  untouched, and the module remains roughly its original length. That is the
  accepted outcome of this thread rather than a shortfall, so any further
  decomposition needs its own motivation beyond line count.
