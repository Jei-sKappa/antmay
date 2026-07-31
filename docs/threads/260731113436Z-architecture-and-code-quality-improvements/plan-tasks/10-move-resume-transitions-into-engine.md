# Task 10: Move resume transitions into the engine

**Objective:** Make resume command preflight checkpoint-read-only and make the execution engine the exclusive owner of abandoned-attempt recovery, recovery-sensitive gates, and every subsequent durable transition.

**Input / context:** The typed execution engine produced by Task 9 and all earlier recovery, Git, artifact, runtime, and display seams; `spec.md` section 1, section 3, and FR-1; `decisions.md DR1`, `DR4`, `DR10`, `DR11`, and `DR12` require recovery under the held lock with no command dispatch on reasons or recovery variants.

**Steps:**
1. Limit `resumeCommand` to state-root/run lookup, checkpoint validation, completed-run rejection, recorded thread/repository/workspace revalidation, immutable runtime resolution, signal lifecycle, temporary-workspace safety, recorded lock acquisition/release, startup/preflight rendering, engine invocation, and result-to-exit-code mapping.
2. Remove from resume command every branch on recovery or diagnostic reason kind, recovery-sensitive clean-worktree exemption, queue scan/refresh, artifact promise reinspection, Git finalization, attempt replacement, stage advancement/completion, pause rendering, and checkpoint write.
3. Make the engine's `resume` entry recover an abandoned executing attempt by observing its post-attempt HEAD, marking that exact attempt interrupted, constructing `retry-stage`, and persisting the complete transition before continuing.
4. Under the held lock, collect fresh queue, artifact, and worktree evidence for the checkpoint's validated `WaitingRecovery`, call `decideRecovery`, and translate exactly one directive into a complete checkpoint transition.
5. Implement all four engine recovery paths: `retry-stage` enters the normal pre-attempt gates; `resume-finalized-done` applies its snapshotted queue resolution exactly once; `recheck-stage-contract` finalizes the referenced saved DONE, safely retries, or remains paused from fresh evidence; `retry-git-finalization` retries the exact attempt without harness invocation.
6. On queue scan failure or still-pending files, refresh diagnostic queue reasons while preserving the same recovery value. On repeated Git failure, persist returned attempt/recovery HEAD evidence and retain the same exact reference for the next resume.
7. Move recovery pause and lifecycle emission to the engine's `ExecutionDisplay`; keep all terminal prose in focused display modules and all Git sequencing in `finalizeGitBoundary`.
8. Extend engine integration tests across abandoned execution, all four recoveries, reason reordering, queue hold/release, clean/dirty/uninspectable contract recheck, finalized-DONE advance/rerun, Git retry without invocation, repeat failure, signals, and fatal checkpoint writes.
9. Extend resume command tests with a byte-for-byte persistence spy for malformed, completed, identity mismatch, runtime mismatch, probe failure, temporary-workspace refusal, workspace mismatch, and lock refusal; add a source-level assertion that resume imports none of the engine's collaborators or checkpoint writer.
10. Run engine, run-command, and resume-command tests, both recovery demo scenarios, then run the complete CLI gate.

**Files modified:**
- `cli/src/execution/engine.ts`
- `cli/src/execution/engine.test.ts`
- `cli/src/execution/recovery-policy.ts`
- `cli/src/execution/recovery-policy.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/test-helpers/waiting.ts`

**Verification:**
- `npm --prefix cli run test -- src/execution/engine.test.ts src/execution/recovery-policy.test.ts src/commands/run.test.ts src/commands/resume.test.ts`
- `! rg -n "WaitingRecovery|recovery-policy|gitops/boundary|state/persist|scanPendingQueues|evaluatePromisedState|finalizeGitBoundary" cli/src/commands/resume.ts`
- `npm --prefix cli run demo -- --scenario 16-retry`
- `npm --prefix cli run demo -- --scenario 19-saved-done-recovery`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-1 / AC-1.1: allocated ready checkpoints and validated resumes enter the same engine and all established results map to unchanged exit codes.
- FR-1 / AC-1.2: every enumerated resume preflight refusal leaves checkpoint bytes unchanged.
- FR-1 / AC-1.3: resume imports/calls no recovery dispatcher, reason-control helper, Git finalizer, attempt mutation, stage advancement, or checkpoint writer; the engine is the post-allocation writer.
- FR-1 / AC-1.4: engine tests cover abandoned recovery, gates, attempt lifecycle, contracts, finalization, pauses, advancement, and completion under the lock.
- FR-1 / AC-1.5: no command-owned persistence, pause, boundary, attempt-replacement, or advancement implementation remains.
- FR-3 / AC-3.3 and AC-3.4 integration portion: finalized-DONE resolutions happen exactly once after queues clear, and Git retry finalizes the referenced attempt without a harness call.
- Every engine recovery uses the required attempt-local and pause-local Git evidence and never derives control from diagnostic reason order.

**Consumes:** `executeEngine`, `decideRecovery`, `finalizeGitBoundary`, `WaitingRecovery`, resolved harness runtime, thread-artifact operations, queue scans, and `ExecutionDisplay`.

**Produces:** A read-only resume preflight adapter and one execution engine owning all existing-checkpoint transitions.
