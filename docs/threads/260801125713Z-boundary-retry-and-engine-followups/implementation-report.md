# Implementation report

Source: plan.md

## Outcome

Completed all six plan steps. Git-boundary recovery is structured and resumable, unexpected attempt-owned `HEAD` movement has a distinct advisory pause, boundary retries re-verify the saved attempt's promised artifacts, repeated pause refreshes are deterministic, every engine-owned `HEAD` read is guarded, and the engine context contains only dependencies it reads.

## Changes

- Added discriminated Git-policy causes and phase-tagged, non-throwing Git invocation failures to boundary finalization, with the engine preserving the correct observed or paused tip when finalization cannot produce a new observation.
- Added the `unexpected-head-movement` waiting reason, yellow advisory terminal treatment, both attempt tips, non-blocking resume guidance, and a reading-ordered scripted demo scenario.
- Required fresh promised-artifact evidence before a saved `DONE` boundary retry; unmet and uninspectable promises return to contract repair while preserving the same attempt.
- Rebuilt refreshed pause diagnostics from current facts, kept one separate queue-scan error behind the governing reason, preserved each pause's `nextAction`, and skipped checkpoint writes when waiting state is unchanged.
- Guarded abandoned-attempt, attempt-start, and post-attempt `HEAD` observations. A failed post-attempt read leaves the valid `executing` checkpoint intact for abandoned-attempt recovery on a later resume.
- Removed `lock` and `stateRoot` from `ExecutionContext` and its command/test constructors, added focused dependency seams for failure paths, expanded cross-layer regression coverage, and updated `cli/AGENTS.md` with the durable execution contracts.

## Verification

- `npm --prefix cli run check` passed: TypeScript typecheck, 43 test files with 1061 tests, and the production build.
- The focused acceptance suite passed 407 tests across boundary, engine, commands, checkpoint validation, architecture, and terminal rendering. Additional focused engine/resume runs exercised the final command-level retry case.
- `npm --prefix cli run demo -- --list` placed `23-unexpected-head-movement` between scenarios 22 and 24.
- `npm --prefix cli run demo -- --scenario 23-unexpected-head-movement --no-color` passed. The demo runner confirmed the CLI's declared exit code `2`, displayed both commit tips and the non-blocking resume semantics, and printed no unvalidated-changes instruction.

## Deviations and judgment calls

The advisory uses the `unexpected-head-movement` identifier, a yellow `HEAD MOVED — review advised` banner, and a paused stage disposition. The pure recovery policy carries only the boundary treatment it needs instead of importing the Git-operations cause vocabulary. Artifact inspection, `HEAD` reading, and boundary finalization are injectable engine dependencies so otherwise unreachable failure paths can be verified without changing production behavior.
