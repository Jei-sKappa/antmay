### Task 2: Gate run and resume and exhibit the refusal

**Objective:** Make both run entry points refuse unsafe temporary workspaces before cleanliness, allocation, locking, checkpoint mutation, or harness invocation, and preserve the structured rendering in the demo catalog.

**Input / context:** `spec.md` FR-1 through FR-4; `decisions.md DR3`, `decisions.md DR4`, and `decisions.md DR5`; the shared result produced by Task 1; the ordered preflights in `cli/src/commands/run.ts` and `cli/src/commands/resume.ts`; and the scenario conventions in `cli/AGENTS.md`.

**Steps:**
1. Add command-level cases to `cli/src/commands/run.test.ts` and `cli/src/commands/resume.test.ts` before wiring the check, and run them once to observe the pre-change behavior fail. Reuse each concurrent suite's existing fixture allocation and module-level `afterAll`; add no per-test teardown.
2. Cover `run` refusal with several unsafe workspaces, both failure kinds, and a dirty worktree at once. Assert exit `1`, the workspace refusal rather than the clean-worktree message, zero invoker calls, no run directory, no `state.json`, and no lock.
3. Cover `resume` with table-driven checkpoints governed by `git-policy-violation`, `commit-error`, and `stage-contract-violation`. Make the repository workspace unsafe, assert the workspace refusal applies to all three cleanliness exemptions, assert the checkpoint bytes are unchanged, assert zero invoker calls, and assert no lock was acquired.
4. Import and call `checkTemporaryWorkspaces` in `run.ts` as the first repository-state gate immediately before `isWorktreeClean`, then renumber every later preflight comment. Return its failure message through the existing `fail` path without allocating state.
5. Import and call the same function in `resume.ts` unconditionally immediately before its clean-worktree rule, outside the `requiresClean` branch. Keep the check before lock acquisition and checkpoint mutation.
6. Add `cli/scripts/scenarios/20-operational-workspace-refusal.mjs`. Give it the normal Standard scripted document so executable probing remains fake, then use one setup action to remove ignore coverage for `.pending-decisions/` and `.pending-reviews/`, force-add and commit one file under the still-ignore-covered `.implementation-runs/`, and run once expecting exit `1`. Stop on the refusal.
7. Keep the aggregate listing last by moving `cli/scripts/scenarios/20-list.mjs` to `cli/scripts/scenarios/21-list.mjs`; update its IDs in `cli/README.md` and `cli/AGENTS.md`. Add the new scenario's row to the README table and add the rule in `cli/AGENTS.md` that grouped lists or copyable blocks earn a preflight-refusal scenario while a single sentence does not.
8. Run the focused command suites, the full CLI gate, the new scenario and renamed list scenario with color disabled, and the scenario listing.

**Files modified:**

- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`
- `cli/scripts/scenarios/20-operational-workspace-refusal.mjs` (NEW)
- `cli/scripts/scenarios/20-list.mjs` (DELETED)
- `cli/scripts/scenarios/21-list.mjs` (NEW)
- `cli/README.md`
- `cli/AGENTS.md`

**Verification:**

- `npm --prefix cli run test -- src/commands/run.test.ts src/commands/resume.test.ts` exits `0`.
- `npm --prefix cli run check` exits `0`.
- `npm --prefix cli run demo -- --scenario 20-operational-workspace-refusal --no-color` reports `[PASS]`, exits `0` as a demo command, and ends its enclosed CLI stream on the grouped refusal from an invocation that exited `1`.
- `npm --prefix cli run demo -- --scenario 21-list --no-color` reports `[PASS]`.
- `npm --prefix cli run demo -- --list` lists `20-operational-workspace-refusal` immediately before `21-list`.
- A one-off Node comparison of sorted `cli/scripts/scenarios/*.mjs` stems with the Scenario-column IDs in `cli/README.md` exits `0`.

**Acceptance criteria:**

- `run` performs the workspace check immediately before cleanliness and before any state allocation or lock.
- `resume` performs it immediately before cleanliness for every checkpoint condition and pause kind, including the three clean-worktree exemptions.
- Dirty unsafe repositories receive the workspace-specific correction, never advice to commit or revert the operational residue.
- Refusals leave run state, checkpoints, and locks untouched and make no harness invocation.
- The demo shows both message groups and both correction blocks in one invocation, and the README, `--list`, and on-disk catalog agree.
- `cli/AGENTS.md` records the structured-refusal scenario boundary.

**Consumes:** `checkTemporaryWorkspaces(...)` and `TemporaryWorkspaceCheckResult` from `cli/src/gitops/temporary-workspaces.ts`.

**Produces:** the workspace-safety preflight in both `antmay afk run` and `antmay afk resume`; demo scenario `20-operational-workspace-refusal`; renamed aggregate scenario `21-list`.
