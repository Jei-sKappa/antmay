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

## Post-implementation correction: fresh-thread plan task creation

- Root cause: owned-file containment validation required `plan-tasks/` to
  exist before the later recursive directory creation, so the Standard scripted
  happy path paused at `plan-strict-correct` on a fresh thread after partially
  writing `plan.md`.
- Fix: owned writes now validate existing parent components while accepting
  safe missing parents beneath the selected thread, then create those parents
  during the write phase. `plan-strict-correct` prepares its complete fixed
  plan/task write set before applying the first effect.
- Regression coverage: scripted invoker tests prove fresh-thread directory
  creation, preservation of unrelated task files, rejection of invalid and
  symlinked parents, and byte-for-byte preservation of an existing `plan.md`
  when validation fails. Run/resume tests no longer pre-create `plan-tasks/`.
- Verification: the focused invoker test passed 29 tests. The full
  `npm --prefix cli run check` gate passed typechecking, all 429 tests across 32
  test files, and the production build. A manual invocation of the built
  `cli/dist/main.js` completed all six Standard stages with exit `0` in a fresh
  disposable Git repository, produced the expected spec/plan/reconcile
  boundary commits and fixed plan/task artifacts, left the worktree clean, and
  recorded a completed scripted checkpoint.

## Follow-up implementation: scripted happy-path demo

- Added dependency-free `cli/scripts/scripted-happy-path.mjs`, exposed as
  `npm run demo`. It validates the resolved default settings and exact
  happy-path scenario, builds without tests, creates a unique Git repository
  under `/tmp`, invokes the real built CLI with the scripted toggle, and
  verifies the fixed artifacts, expected boundary commits, clean worktree, and
  completed scripted checkpoint.
- The helper refuses Antmay-specific config/state root overrides, never creates
  or changes config, preserves its repository and default-state run for
  inspection, and remains outside the CLI grammar, `npm run check`, and CI.
- Demo and CLI output are separated by explicit `ANTMAY CLI STARTED` /
  `ANTMAY CLI FINISHED` lines. Every prerequisite and post-run expectation is
  reported independently as `[PASS]` or `[FAIL]`; failures show expected and
  actual values, and independent post-run checks continue after a failure.
- Prerequisite checks were exercised against missing settings, malformed
  settings JSON, a non-happy scenario, and a forbidden root override; every
  case exited `1` before build or repository allocation. `node --check` passed.
- The full `npm --prefix cli run check` gate passed typechecking, all 429 tests
  across 32 files, and the production build. A direct `.mjs` run completed
  successfully with isolated XDG roots, and `npm --prefix cli run demo`
  completed all six Standard stages against the actual default config/state,
  preserving verified completed runs in distinct temporary repositories.
- The finalized checklist output was exercised with an intentionally wrong
  review case (14 passes and one explicit expected/actual failure) and the
  complete happy path (38 passes, zero failures).
