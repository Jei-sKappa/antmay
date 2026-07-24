# Implementation report

Source: plan.md

## Outcome

All four plan tasks completed. The CLI now supports developer-only scripted harness mode for `antmay afk run` and `antmay afk resume`: explicit stage-attempt context at the harness boundary, strict fixed-path scenario loading, a deterministic invoker/probe with seven built-in cases, and paired runtime selection with an optional fail-closed checkpoint marker.

## Changes

- Added required `AttemptRequest.stage` (`AttemptStageContext`) and populated it from `executeRun` with snapshotted stage identity, thread path, profile prompt, and durable per-stage `attemptNumber`.
- Added `cli/src/harness/scripted/scenario.ts` with the seven-case catalog, `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS` toggle interpretation, fixed `<config-root>/scripted-harness.json` resolution, and strict one-read validation.
- Added `createScriptedInvoker` and `probeScriptedHarnessExecutables` implementing the seven DR4 cases, lexical path guards (including in-thread symlink rejection), prompt/target validation, deterministic events/logs, and provider-error normalization.
- Wired scripted mode into `run` / `resume` / `program.ts` with paired seam replacement, optional `startedScripted: true` checkpoint marker, live scenario reread on resume, conspicuous startup renderer, and `cli/AGENTS.md` documentation.
- Extended unit and command tests across runner, Sandcastle, scenario, invoker, probe, checkpoint, display, run, resume, list, and program dispatch.

## Verification

- Task 01: focused `runner.test.ts` + `sandcastle.test.ts`, then `npm --prefix cli run check` — exit 0.
- Task 02: focused `scenario.test.ts`, then `npm --prefix cli run check` — exit 0.
- Task 03: focused `invoker.test.ts` + `probe.test.ts`, then `npm --prefix cli run check` — exit 0.
- Task 04: focused `checkpoint.test.ts`, `terminal.test.ts`, `run.test.ts`, `resume.test.ts`, `list.test.ts`, `program.test.ts`; `rg` over public grammar/help/settings/list surfaces found no scripted behavior; `npm --prefix cli run check` — exit 0.

## Deviations and judgment calls

- Placeholder plan/task bodies and reconcile append lines for effectful cases were chosen under the spec's degrees of freedom; `spec-correct` bytes remain the fixed `# Spec: Fake\n\nPlaceholder\n` contract.
- Case handlers propagate `Result` values rather than throwing local failures into the outer catch, after review feedback on failure-path consistency.

## Remaining concerns

- The reconcile-plan lexical task-order test asserts final file contents after identical append lines; it does not directly observe append iteration order (behavior still sorts via `localeCompare`).

## Follow-ups

- Broader post-implementation review of the change as a whole (task-scoped gates only covered each task's diff).
- Spec verify stage against acceptance criteria, if desired.
- Automated E2E reuse of the scripted adapter remains intentionally out of scope for this MVP.
