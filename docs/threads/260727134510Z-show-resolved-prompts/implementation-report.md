# Implementation report

Source: spec.md

## Outcome

Completed the scripted-demo prompt inspection behavior. Every scripted harness invocation selected by `antmay afk run` or `antmay afk resume` now prints its submitted `request.prompt` as readable `[DEV]` input after the attempt header and before simulated agent output. The prompt is emitted at scripted-adapter entry, so pre-transcript validation failures expose the submitted value; real-harness paths and attempts interrupted before invocation emit no prompt block.

Commit: `5774179559af193bfafdd988c36a67a09db06135` (`feat(cli): show resolved prompts in scripted demos`).

## Changes

- Added a terminal renderer for `Resolved prompt` developer blocks that preserves natural multiline content and prefixes every physical line with `[DEV]`.
- Added an optional scripted-invocation observer that receives the exact request prompt before validation without routing it through normalized harness events or attempt logs.
- Bound the observer to the terminal renderer in both new-run and resume scripted-mode selection paths.
- Added renderer, adapter, run, resume, retry, failure-path, multiline-profile, gating, and output-order coverage.
- Extended the all-success demo description and updated `cli/README.md` and `cli/AGENTS.md` to describe the current terminal behavior.

## Verification

- Installed the locked CLI dependencies with `npm ci` after the initial focused test command could not find `vitest`.
- `npm run test -- src/display/terminal.test.ts src/harness/scripted/invoker.test.ts src/commands/run.test.ts src/commands/resume.test.ts`: passed 140 tests.
- The first `npm run check` reached 513 passing tests and found one incorrect new assertion that omitted the canonical trailing slash on a thread-root target. After correcting the assertion, `npm run test -- src/commands/run.test.ts` passed all 26 tests.
- Final `npm run check`: passed typecheck, all 514 tests, and the production build.
- `npm run demo -- --scenario 01-all-done --no-color`: passed with exit `0` and visibly rendered all six resolved prompts between their attempt headers and simulated transcripts.
- `git diff --check`: passed.

## Deviations and judgment calls

The observable behavior matches `spec.md`. Within its granted implementation freedom, the scripted factory accepts an optional prompt observer and the command layer binds that observer to the terminal renderer. This keeps environment interpretation at the command boundary, leaves the real invoker unchanged, and avoids presenting developer diagnostics as provider-neutral harness events.

## Remaining concerns

`npm ci` reported five audit findings in the existing lockfile (three moderate, one high, and one critical). This implementation changed no dependency or lock files.
