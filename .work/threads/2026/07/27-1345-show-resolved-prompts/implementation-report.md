# Implementation report

Source: spec.md

## Outcome

The scripted-demo prompt inspection behavior satisfies `spec.md` and DR1–DR5. Every scripted harness invocation selected by `antmay afk run` or `antmay afk resume` prints its submitted `request.prompt` as readable `[DEV]` input after the attempt header and before simulated agent output. The prompt is emitted at scripted-adapter entry, so pre-transcript validation failures expose the submitted value; real-harness paths and attempts interrupted before invocation emit no prompt block. Prompt rendering is best-effort observational output: a synchronous observer exception cannot replace or reclassify the scripted case's authoritative outcome.

## Changes

- Added a terminal renderer for `Resolved prompt` developer blocks that preserves natural multiline content and prefixes every physical line with `[DEV]`.
- Added a best-effort scripted-invocation observer that receives the exact request prompt before validation, remains outside normalized harness events and attempt logs, and discards synchronous rendering exceptions without changing the scripted outcome.
- Bound the observer to the terminal renderer in both new-run and resume scripted-mode selection paths.
- Added distinct single-line and multiline renderer coverage; current-request sourcing across distinguishable invocations; completed- and provider-error outcome preservation when rendering throws; prompt visibility on pre-transcript case-selection failure; exact retry block count, value, and ordering; and explicit event and attempt-log exclusion assertions.
- Retained run, resume, multiline-profile, scripted gating, real-harness absence, output-order, and pre-launch interruption coverage.
- Extended the all-success demo description and updated `cli/README.md` and `cli/AGENTS.md` to describe the current terminal behavior.

## Verification

- `npm run test -- src/display/terminal.test.ts src/harness/scripted/invoker.test.ts src/commands/run.test.ts src/commands/resume.test.ts`: passed all 144 focused tests.
- `npm run check`: passed typecheck, all 518 tests, and the production build.
- `npm run demo -- --scenario 01-all-done --no-color`: passed with exit `0` and rendered all six resolved prompts between their attempt headers and simulated transcripts.
- `git diff --check`: passed.

## Deviations and judgment calls

The scripted factory accepts an optional prompt observer and the command layer binds that observer to the terminal renderer. The observer's synchronous exception boundary implements DR4 at the adapter entry point, where it protects both completed and normalized failure outcomes without moving environment interpretation out of the command boundary or presenting developer diagnostics as provider-neutral harness events.

## Remaining concerns

`npm ci` reported five audit findings in the existing lockfile (three moderate, one high, and one critical). This implementation changed no dependency or lock files.
