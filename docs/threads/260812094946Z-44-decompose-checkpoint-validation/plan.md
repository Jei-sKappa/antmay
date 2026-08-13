# Plan — Decompose checkpoint validation without weakening aggregate diagnostics

Source: spec.md

## Objective and context

`cli/src/state/checkpoint/validate.ts` validates an untrusted `state.json` in two
passes: a field-shape sweep, then — only if that sweep found nothing — a block of
cross-field invariants. This plan turns that second pass into six named, pure
invariants driven from a declared readonly table, severs the five mutable
intermediates the two passes exchange, makes the recovery-resolution invariant an
exhaustive `switch` over the recovery kind, extends the aggregate regression to
reach every table entry, and relocates the validator's test file beside the module
it covers.

Nothing observable changes. Every diagnostic keeps its exact wording and its
position in the returned array, every document accepted today is still accepted,
every document rejected today is still rejected, and
`validateCheckpoint(doc: unknown): CheckpointResult` remains the module's one
export. What changes is that "one call reports every discoverable problem" stops
being a property a reader verifies by reading 150 lines of procedure and becomes a
property of a table that cannot be short-circuited.

The field-shape sweep and its twenty private helpers are deliberately untouched
(per `decisions.md` DR1); the single edit any of them takes is `validateStage`
ceasing to return the stage info it fed the second pass. The module is expected to
remain roughly its current length, which is an accepted outcome rather than a
shortfall.

The task order is chosen so the regression net lands before the refactor it
protects: the test file moves first, the two aggregate additions are written next
against the current implementation where they must already pass, and only then is
the cross-field pass restructured — so the added coverage is what proves the
restructure preserved behavior. The recovery `switch` is last and separate,
because it is the one rewrite the spec calls out as easy to get subtly wrong.

The change is allowed to touch exactly two files: `cli/src/state/checkpoint/validate.ts`
and the relocated `cli/src/state/checkpoint/validate.test.ts`.

## Global Constraints

- **`cli/src/architecture.test.ts` must pass with no edit.** Two of its guards bear on this change directly:
  - The recovery-kind guard bans comparing a recovery kind to a string literal everywhere except the single path `state/checkpoint/validate.ts`. That exemption list must remain a single path — DR3's switch satisfies the guard because it deliberately does not match `case` clauses.
  - The terminal-outcome guard bans a protocol token embedded in a larger string literal. Diagnostic messages must keep interpolating `DONE_OUTCOME` rather than spelling `DONE` inside the message text. A bare `=== "DONE"` comparison against an already-narrowed token stays permitted, because the compiler guards it.
- **`cli/src/state/checkpoint/validate.ts` must not import `cli/src/execution/`.** In particular, do not reach for `AttemptReferencingRecovery` or any other name from `execution/recovery.ts`; the architecture guard would then require the import, and the dependency direction is wrong. Switch over the union declared in `state/checkpoint/types.ts` (per `decisions.md` DR3).
- **`cli/src/state/checkpoint/types.ts` is unchanged.** It is guarded to hold nothing but type declarations.
- **No new runtime dependency.** The CLI has exactly one and keeps it.
- **`npm --prefix cli run check`** (typecheck + test + build) is the gate, and `npm --prefix cli run lint` runs beside it in CI.
- **`vitest.config.ts` is unchanged**; it already includes `src/**/*.test.ts`, so a test file inside `state/checkpoint/` is collected without configuration.
- The relocated test file is not one of the three `describe.concurrent` suites, so the no-teardown-between-cases convention does not apply to it.

## Tasks

1. **Relocate the validator test beside the validator** — `git mv` `cli/src/state/checkpoint.test.ts` to `cli/src/state/checkpoint/validate.test.ts` and correct its three import specifiers, changing nothing else. → `plan-tasks/01-relocate-validator-test.md`
2. **Extend aggregate cross-field coverage to every invariant** — add the fifth independent fault to the existing shape-valid aggregate document and add the two-diagnostic recovery-resolution case, both passing against the current implementation. → `plan-tasks/02-extend-aggregate-cross-field-coverage.md`
3. **Drive the cross-field pass from a declared table of pure invariants** — delete the four locals that exist only for the second pass, stop that pass reading the sweep's `condition`, and replace the cross-field block with six pure functions run from one readonly table. → `plan-tasks/03-table-driven-cross-field-invariants.md`
4. **Make recovery resolution exhaustive over the recovery kind** — rewrite the sixth invariant as a `switch` total over `WaitingRecovery`, keeping the queue-resolution check outside the reference lookup, and confirm the change's whole footprint. → `plan-tasks/04-exhaustive-recovery-resolution-switch.md`
