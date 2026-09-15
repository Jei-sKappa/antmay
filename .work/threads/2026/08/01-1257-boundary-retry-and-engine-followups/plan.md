# Plan: Boundary-retry recovery and engine follow-ups

Source: spec.md

## Outcome

Make Git-boundary recovery truthful and dependable: refusals expose structured causes, advisory `HEAD` movement has its own actionable pause, retries re-verify the promised artifact, repeated resumes are idempotent, Git failures stay inside structured engine results, and the engine context contains only live dependencies. Preserve the existing pipeline, command, artifact, exit-code, and recovery contracts.

## Steps

1. Extend the Git-boundary result model with distinct policy-violation causes and a non-throwing Git-failure result, keeping boundary observation and Git sequencing inside `cli/src/gitops/` and covering every cause, recovery-context waiver, and failure phase with focused tests.

2. Add the advisory `HEAD`-movement waiting reason and its display treatment, carrying the attempt's start and end tips and explaining that the next resume may advance without the unvalidated-changes instruction; keep every other boundary refusal on the existing blocking presentation and add the required demo scenario.

3. Widen the pure recovery decision inputs and engine integration so a boundary retry gathers fresh promised-artifact evidence before finalization, redirects unmet or uninspectable promises through the existing contract-repair recovery, and handles cause-aware refusals and structured finalization failures without deriving behavior from reason order or message text.

4. Make pause refreshes deterministic from current facts: preserve the governing reason, replace rather than accumulate a separate queue-scan `gate-error`, use one canonical uninspectable-promise message, retain the pause's own `nextAction`, and prove whole-checkpoint stability across repeated resumes.

5. Guard every engine-owned `readHead` call, preserving the checkpoint on post-attempt failure so normal abandoned-attempt recovery can settle and rerun it, then remove the unread `lock` and `stateRoot` context fields from the engine, callers, and test helper while retaining lock-ownership guidance on `executeEngine`.

6. Complete the cross-layer regression coverage for advisory and blocking boundary retries, contract rechecks, Git failures, repeated pause refreshes, context construction, exit behavior, and the new terminal rendering without weakening architecture or checkpoint-validation guards.

## Verification

Run `npm --prefix cli run check`. Confirm the new advisory scenario appears in reading order with `npm --prefix cli run demo -- --list`, then run it with `--no-color` and verify it ends on the distinct advisory pause with exit code `2`, both commit tips, clear resume semantics, and no unvalidated-changes instruction.

## Notes

Keep `executeEngine` in its current procedural shape; FND3 is out of scope. A `boundary-retry` continues to skip the `HEAD` rule, and `changeRequired` remains attempt-only. Add no execution-result kind, checkpoint-rule relaxation, migration, compatibility shim, stage-catalog change, or commit-content inspection. Multiline operational prose belongs in `cli/src/display/`, and the recovery-policy module must remain pure.
