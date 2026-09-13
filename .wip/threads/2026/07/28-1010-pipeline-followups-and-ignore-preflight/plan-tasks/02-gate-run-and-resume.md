### Task 2: Gate run and resume

**Objective:** Make both run entry points refuse unsafe temporary workspaces before cleanliness, allocation, locking, checkpoint mutation, or harness invocation.

**Input / context:** `spec.md` FR-1 through FR-3; `decisions.md DR3` and `decisions.md DR4`; the shared result produced by Task 1; and the ordered preflights in `cli/src/commands/run.ts` and `cli/src/commands/resume.ts`.

**Steps:**
1. Add command-level cases to `cli/src/commands/run.test.ts` and `cli/src/commands/resume.test.ts` before wiring the check, and run them once to observe the pre-change behavior fail. Reuse each concurrent suite's existing fixture allocation and module-level `afterAll`; add no per-test teardown.
2. Cover `run` refusal with several unsafe workspaces, both failure kinds, and a dirty worktree at once. Assert exit `1`, the workspace refusal rather than the clean-worktree message, zero invoker calls, no run directory, no `state.json`, and no lock.
3. Cover `resume` with table-driven checkpoints governed by `git-policy-violation`, `commit-error`, and `stage-contract-violation`. Make the repository workspace unsafe and the worktree dirty, assert the workspace refusal applies before cleanliness for all three exemptions, assert the checkpoint bytes are unchanged, assert zero invoker calls, and assert no lock was acquired.
4. Import and call `checkTemporaryWorkspaces` in `run.ts` as the first repository-state gate immediately before `isWorktreeClean`, then renumber every later preflight comment. Return its failure message through the existing `fail` path without allocating state.
5. Import and call the same function in `resume.ts` unconditionally immediately before its clean-worktree rule, outside the `requiresClean` branch. Keep the check before lock acquisition and checkpoint mutation.
6. Run the focused command suites and the full CLI gate.

**Files modified:**

- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`

**Verification:**

- `npm --prefix cli run test -- src/commands/run.test.ts src/commands/resume.test.ts` exits `0`.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- `run` performs the workspace check immediately before cleanliness and before any state allocation or lock.
- `resume` performs it immediately before cleanliness for every checkpoint condition and pause kind, including the three clean-worktree exemptions.
- Dirty unsafe repositories receive the workspace-specific correction, never advice to commit or revert the operational residue.
- Refusals leave run state, checkpoints, and locks untouched and make no harness invocation.

**Consumes:** `checkTemporaryWorkspaces(...)` and `TemporaryWorkspaceCheckResult` from `cli/src/gitops/temporary-workspaces.ts`.

**Produces:** the temporary-workspace safety preflight in both `antmay afk run` and `antmay afk resume`, before their clean-worktree gates and all mutable execution state.
