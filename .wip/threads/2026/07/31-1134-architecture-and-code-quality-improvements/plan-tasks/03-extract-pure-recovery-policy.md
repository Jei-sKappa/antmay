# Task 3: Extract pure recovery policy

**Objective:** Centralize pause-and-recovery decisions in a pure exhaustive function that returns domain directives rather than checkpoint patches.

**Input / context:** The `WaitingRecovery` and exact attempt-reference types produced by Task 2; `spec.md` section 3 and FR-3; `decisions.md DR2`, `DR4`, and `DR11` require diagnostics to be irrelevant to control flow and the policy to perform no I/O or persistence.

**Steps:**
1. Create `cli/src/execution/recovery-policy.ts` with structured fresh-evidence types for queue scan success/failure/pending files, promised-artifact reinspection, worktree cleanliness, and recovery-specific Git readiness.
2. Export `decideRecovery(recovery: WaitingRecovery, evidence: RecoveryEvidence): RecoveryDirective` with a closed directive vocabulary for retrying the stage, advancing, requesting first-time or retry Git finalization of the exact referenced attempt, and remaining paused with refreshed diagnostic facts while preserving the underlying recovery.
3. Implement queue handling before recovery-specific action: scan failure and pending bundles must remain paused without changing the recovery variant; cleared queues permit the variant's next decision.
4. Implement the contract-recheck table: satisfied requests first-time finalization; unmet plus clean requests stage retry; unmet plus dirty or uninspectable remains paused.
5. Implement finalized-DONE `advance` and `rerun` directives and Git-retry finalization directives without consulting diagnostic reason kinds or positions.
6. Change the current resume orchestration to collect structured evidence, call `decideRecovery`, and translate the directive; remove direct recovery selection based on reason order while leaving checkpoint persistence and I/O outside the policy.
7. Add exhaustive table tests, including reordered and additional diagnostic reasons producing the same directive, queue failures retaining each recovery, and assertions that the module imports no filesystem, Git, clock, display, harness, or checkpoint writer.
8. Run the recovery-policy and resume tests, then run the complete CLI gate.

**Files modified:**
- `cli/src/execution/recovery-policy.ts` (NEW)
- `cli/src/execution/recovery-policy.test.ts` (NEW)
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`

**Verification:**
- `npm --prefix cli run test -- src/execution/recovery-policy.test.ts src/commands/resume.test.ts`
- `! rg -n "node:fs|gitops/|state/persist|display/|harness/|Date\(" cli/src/execution/recovery-policy.ts`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-2 / AC-2.4: changing diagnostic reason order or adding another diagnostic reason cannot change a directive.
- FR-3 / AC-3.1: every recovery variant is covered against queue success, queue failure, and pending files, and held queues preserve the same recovery.
- FR-3 / AC-3.2: contract recheck returns finalization, retry, remain-paused, and remain-paused for the four specified evidence states.
- FR-3 / AC-3.3: finalized-DONE `advance` and `rerun` are distinct directives applied only after queues clear.
- FR-3 / AC-3.4: Git retry requests finalization of the exact referenced attempt and retains that recovery when fresh Git evidence still fails.
- FR-3 / AC-3.5: policy tests require no side-effect fixture, and public results are domain directives rather than partial `RunCheckpoint` values.

**Consumes:** `WaitingRecovery` and `AttemptReference` from `cli/src/state/checkpoint.ts`.

**Produces:** `decideRecovery(recovery: WaitingRecovery, evidence: RecoveryEvidence): RecoveryDirective` from `cli/src/execution/recovery-policy.ts`.
