### Task 3: Extract run safety preflight

**Objective:** Make temporary-workspace safety, clean-worktree validation, pending queues, and unfinished-run detection separate ordered gates immediately before allocation.

**Input / context:** Tasks 1–2's prepared run and runtime facts; `spec.md`; `decisions.md DR2`, `decisions.md DR3`, `decisions.md DR4`, and `decisions.md DR5`; existing safety-order and refusal assertions in `run.test.ts`.

**Steps:**

1. Create `cli/src/commands/run/preflight/check-temporary-workspaces.ts` and `require-clean-worktree.ts`, exporting `checkRunTemporaryWorkspaces` and `requireCleanRunWorktree`; return structured facts and keep them separate so temporary-workspace safety visibly precedes clean-worktree advice.
2. Create `cli/src/commands/run/preflight/scan-pending-queues.ts` exporting `scanRunPendingQueues`; scan both queues and return scan failures or pending paths without selecting an exit code.
3. Create `cli/src/commands/run/preflight/find-unfinished-run.ts` exporting `findUnfinishedThreadRun`; scan sibling directories without creating the runs directory, return matching unfinished workspace/thread facts, and return unreadable-checkpoint warnings for `run.ts` to print and continue past.
4. Replace the inline gates in `run.ts` with direct calls in this order after runtime resolution: `checkRunTemporaryWorkspaces`, `requireCleanRunWorktree`, `scanRunPendingQueues`, then `findUnfinishedThreadRun`.
5. Keep rich temporary-workspace rendering, plain refusal presentation, unreadable-checkpoint warning output, and the pre-allocation signal observation in `run.ts`; leave allocation inline for task 4.
6. Remove obsolete numbered preflight comments and leaf imports from `run.ts` without introducing a multi-step wrapper or shared command coordinator.
7. Run the run suite, retaining the temporary-workspace-over-dirty-tree precedence, dirty tree, pending queue, queue scan, unfinished matching run, unreadable sibling, and pre-allocation signal assertions, then run the full gate.

**Files modified:**

- `cli/src/commands/run/types.ts`
- `cli/src/commands/run/preflight/check-temporary-workspaces.ts` (NEW)
- `cli/src/commands/run/preflight/require-clean-worktree.ts` (NEW)
- `cli/src/commands/run/preflight/scan-pending-queues.ts` (NEW)
- `cli/src/commands/run/preflight/find-unfinished-run.ts` (NEW)
- `cli/src/commands/run.ts`

**Verification:** `npm --prefix cli run test -- src/commands/run.test.ts` exits 0; `npm --prefix cli run check` exits 0; `rg -n 'checkTemporaryWorkspaces|isWorktreeClean|scanPendingQueues|readCheckpoint' cli/src/commands/run.ts` returns no matches.

**Acceptance criteria:**

- `run.ts` directly states the complete read-only order from task 1's roots through unfinished-run detection.
- Temporary-workspace and clean-worktree checks are separate and ordered; the dedicated unsafe-workspace refusal still wins when both conditions exist.
- Queue scanning and unfinished-run detection are separate; unreadable sibling checkpoints still warn and do not block.
- Every safety-step refusal is inert data, and all output, streams, exit mapping, signals, and cleanup remain command-owned.
- Focused and full gates pass with existing safety assertions intact.

**Consumes:** Task 2's selected stages, runtime result, pipeline identity, thread identity, and state root.

**Produces:** `checkRunTemporaryWorkspaces`, `requireCleanRunWorktree`, `scanRunPendingQueues`, and `findUnfinishedThreadRun`; fully prepared, safety-checked allocation facts in `run.ts`.
