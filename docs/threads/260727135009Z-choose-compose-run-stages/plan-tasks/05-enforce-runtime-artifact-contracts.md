### Task 5: Enforce artifact contracts and deterministic recovery at runtime

**Objective:** Prevent a stage from launching without its concrete prerequisite or finalizing after `DONE` without its promised artifact state, with deterministic same-stage recovery on resume.

**Input / context:** Consume the snapshotted serializable contracts from Task 4 and the fresh artifact inspector from Task 1. Follow `spec.md` section “Runtime contract enforcement and recovery” and `decisions.md DR5`, `DR13`, and `DR15`. Contract checks precede harness launch and Git/queue advancement; they do not replace existing queue, outcome, or Git gates.

**Steps:**
1. Add durable waiting reason kinds and checkpoint validation for an unmet runtime prerequisite and for `stage-contract-violation`. Store enough serializable expected/observed contract detail for terminal diagnostics and resume dispatch without consulting live pipeline documents.
2. In `executeRun`, freshly inspect artifact state after the pre-attempt queue gate and immediately before attempt allocation. If the current stage prerequisite is unmet, persist a same-stage pause with no attempt/log/harness call and report the required and observed state.
3. After a recognized `DONE`, freshly inspect artifact state and verify the promised postcondition before collecting boundary status, evaluating Git policy, committing, advancing the stage, or applying queue resolution.
4. When the postcondition is unmet, persist the completed terminal result as a same-stage `stage-contract-violation`, retain the Git cursor and attempt evidence needed for recovery, and leave the boundary unfinalized.
5. Update resume preflight so a postcondition-contract pause is allowed to inspect a dirty tree under the owned lock instead of being rejected by the ordinary clean-worktree rule. Keep the existing clean-tree rule for unrelated pause kinds.
6. Implement the four recovery paths: recheck and launch after a prerequisite is restored; finalize the saved `DONE` without a harness call when a repaired postcondition now passes; launch a fresh same-stage attempt when the postcondition still fails and the worktree is clean; and remain durably paused with repair-or-revert guidance when it still fails and the worktree is dirty.
7. Reuse the existing boundary-finalization and queue-resolution behavior after a repaired postcondition, including commit-error/Git-policy pauses and `advance` versus `rerun`; do not duplicate a divergent finalization path.
8. Add runner, run-command, resume, checkpoint, and terminal tests covering artifact drift after preflight, no harness call on prerequisite failure, postcondition ordering before Git evaluation, both new durable reason shapes, all four recovery paths, preserved queue reasons, and regressions for outcome handling, implementation `HEAD` movement, boundaries, locks, signals, and exit codes.

**Files modified:**

- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/display/terminal.ts`
- `cli/src/display/terminal.test.ts`
- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`
- `cli/src/state/checkpoint.ts`
- `cli/src/state/checkpoint.test.ts`

**Verification:**

1. Run `npm --prefix cli run test -- src/runner/runner.test.ts src/commands/run.test.ts src/commands/resume.test.ts src/state/checkpoint.test.ts src/display/terminal.test.ts`.
2. Run `npm --prefix cli run check`.

**Acceptance criteria:**

- Every stage prerequisite is checked from fresh concrete state immediately before an attempt.
- An unmet prerequisite pauses on the current stage without an attempt, log, or harness invocation and names required and observed state.
- Every promised postcondition is checked after recognized `DONE` and before any Git evaluation, commit, stage advancement, or queue advancement.
- An unmet postcondition creates a durable same-stage `stage-contract-violation` with expected and observed state.
- Resume after prerequisite repair starts the stage only when its requirement passes.
- Resume after postcondition repair finalizes the saved `DONE` through the ordinary Git/queue path without invoking the agent again.
- A still-unsatisfied postcondition retries only with a clean worktree and remains paused with repair/revert guidance when dirty.
- Existing queue gates, terminal outcomes, boundaries, lock ownership, signals, and exit codes pass regression coverage.
- The targeted tests and the full CLI gate pass.

**Consumes:** snapshotted stage prerequisites, promised transitions, resolved targets, Git policies, and queue resolutions from Task 4; `inspectArtifactState` and artifact-contract evaluation from Tasks 1 and 3.

**Produces:** durable runtime prerequisite pauses and `stage-contract-violation` pauses; deterministic checkpoint-only recovery for repaired, retryable, and dirty unresolved contract violations.
