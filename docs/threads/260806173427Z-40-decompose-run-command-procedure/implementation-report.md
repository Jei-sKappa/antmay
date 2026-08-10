# Implementation report

Source: plan.md

## Outcome

All eight plan tasks completed, and both implementation-review findings are resolved. `runCommand` and `resumeCommand` are thin orchestrators over typed, effect-bounded collaborators: shared `CommandDeps` / run-only `RunDeps`, command-specific preflight trees, `allocateRun` for new-run allocation, and `acquireResumeLock` for resume lock acquisition. Exhaustive architecture guards hold the topology fail-closed, and `cli/AGENTS.md` describes the delivered command architecture. Observable command behavior, durable formats, catalog/pipeline semantics, and the terminal-outcome protocol are unchanged.

## Changes

- Added `cli/src/commands/deps.ts` and run/resume typed surfaces under `cli/src/commands/run/` and `cli/src/commands/resume/`.
- Extracted ordered run preflight steps (roots through unfinished-run detection), then composition/snapshot/runtime, then safety gates; moved allocation into `commands/run/allocate.ts`.
- Extracted ordered resume preflight steps (state root through temporary-workspace safety) and `commands/resume/acquire-lock.ts`.
- Strengthened command tests (allocation races, six-plus-one pre-lock signal matrix, thrown-engine cleanup) and architecture ownership/topology guards.
- Extended the resume refusal matrix to prove that every refusal preserves both checkpoint bytes and the arranged workspace-lock set.
- Made the engine suite release independent temporary resources concurrently and gave that file's cleanup hook a scoped 120-second allowance for full-suite filesystem contention.
- Updated `cli/AGENTS.md` for current command ownership and safety ordering. `cli/README.md` untouched.
- Task 08 also switched allocate’s under-lock queue rescan to the `scanPendingQueues` leaf so the preflight queue step keeps a single driver.

## Verification

- Per-task focused suites: `run.test.ts` / `resume.test.ts` / `architecture.test.ts` as required by each task — exit 0.
- Review-fix focused suite: `engine.test.ts` and `resume.test.ts` — 151/151 tests passed.
- Stock `npm --prefix cli run check` — two consecutive successful runs; each passed typecheck, all 1,193 tests in 49 files, and the production build.
- `npm --prefix cli run demo:all` — 42/42 scenarios passed.
- `git diff --exit-code -- cli/README.md` and `git diff --check` — exit 0.

## Deviations and judgment calls

- Task 03 fix: unfinished-match results now carry buffered unreadable-checkpoint warnings and `run.ts` prints them before the unfinished refusal, restoring pre-extract warning behavior.
- Task 08: `allocate.ts` was edited outside the task’s Files-modified list so fail-closed topology guards could land without a dual caller of `scan-pending-queues`.
- Full-suite evidence showed that parallel cleanup alone could still exceed the default 30-second hook allowance under filesystem contention, so the cleanup hook also receives a local 120-second timeout; test timeouts and global Vitest settings remain unchanged.
