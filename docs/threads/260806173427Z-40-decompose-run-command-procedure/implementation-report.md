# Implementation report

Source: plan.md

## Outcome

All eight plan tasks completed. `runCommand` and `resumeCommand` are thin orchestrators over typed, effect-bounded collaborators: shared `CommandDeps` / run-only `RunDeps`, command-specific preflight trees, `allocateRun` for new-run allocation, and `acquireResumeLock` for resume lock acquisition. Exhaustive architecture guards hold the topology fail-closed, and `cli/AGENTS.md` describes the delivered command architecture. Observable command behavior, durable formats, catalog/pipeline semantics, and the terminal-outcome protocol are unchanged.

## Changes

- Added `cli/src/commands/deps.ts` and run/resume typed surfaces under `cli/src/commands/run/` and `cli/src/commands/resume/`.
- Extracted ordered run preflight steps (roots through unfinished-run detection), then composition/snapshot/runtime, then safety gates; moved allocation into `commands/run/allocate.ts`.
- Extracted ordered resume preflight steps (state root through temporary-workspace safety) and `commands/resume/acquire-lock.ts`.
- Strengthened command tests (allocation races, six-plus-one pre-lock signal matrix, thrown-engine cleanup) and architecture ownership/topology guards.
- Updated `cli/AGENTS.md` for current command ownership and safety ordering. `cli/README.md` untouched.
- Task 08 also switched allocate’s under-lock queue rescan to the `scanPendingQueues` leaf so the preflight queue step keeps a single driver.

## Verification

- Per-task focused suites: `run.test.ts` / `resume.test.ts` / `architecture.test.ts` as required by each task — exit 0.
- Typecheck and build — exit 0 across the run.
- Closing task: `demo:all` — 42/42 exit 0; `git diff --exit-code -- cli/README.md` — exit 0; `git diff --check` — exit 0.
- Stock `npm --prefix cli run check` repeatedly failed only on a pre-existing `engine.test.ts` `afterAll` hookTimeout under file parallelism while all tests passed (confirmed at the pre-run baseline and after Task 08). Equivalent gate with `vitest run --no-file-parallelism` plus typecheck and build — exit 0 (1193 tests after Task 08).

## Deviations and judgment calls

- Task 03 fix: unfinished-match results now carry buffered unreadable-checkpoint warnings and `run.ts` prints them before the unfinished refusal, restoring pre-extract warning behavior.
- Task 08: `allocate.ts` was edited outside the task’s Files-modified list so fail-closed topology guards could land without a dual caller of `scan-pending-queues`.

## Remaining concerns

- Stock `npm run check` remains sensitive to the `engine.test.ts` suite teardown under file parallelism (hookTimeout 30s); every test assertion passes. Follow-up is harness/teardown hygiene, not this refactor.

## Follow-ups

- Stabilize or relax the engine-suite `afterAll` teardown so stock `npm run check` is reliable under default file parallelism.
