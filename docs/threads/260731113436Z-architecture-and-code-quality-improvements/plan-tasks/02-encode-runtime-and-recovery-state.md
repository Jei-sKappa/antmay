# Task 2: Encode runtime and recovery state

**Objective:** Make every accepted checkpoint carry the exact runtime, recovery action, attempt reference, and Git evidence required for safe continuation.

**Input / context:** The thread-artifact validators produced by Task 1; `spec.md` sections 2 and FR-2; `decisions.md DR2`, `DR5`, `DR11`, and `DR12` require a replacement version-zero schema with four recovery variants, immutable runtime identity, attempt-local HEAD observations, and no compatibility path.

**Steps:**
1. Define required checkpoint types in `cli/src/state/checkpoint.ts` with these exact semantic shapes: `HarnessRuntimeIdentity` discriminated as `{ kind: "real" } | { kind: "scripted" }`; `AttemptReference` carrying `stageIndex` and `attempt`; and `WaitingRecovery` discriminated as `retry-stage`, `resume-finalized-done`, `recheck-stage-contract`, or `retry-git-finalization`.
2. Give `resume-finalized-done` an exact attempt reference plus the snapshotted `advance` or `rerun` resolution; give `recheck-stage-contract` and `retry-git-finalization` an exact attempt reference plus `pausedAtHead`; permit neither field on `retry-stage`.
3. Add required `headAtStart` to every `AttemptRecord`, require `headAfterAttempt` on every settled attempt, and permit it to be absent only while the attempt result is `executing`.
4. Add required `runtime` and required waiting recovery data to `RunCheckpoint`; remove `gitCursor`, `startedScripted`, `governingReason`, and `headAtAttemptStart` from diagnostic reasons.
5. Extend checkpoint validation across condition, recovery, current stage, exact attempt number, terminal token, attempt result, queue resolution, required/forbidden HEAD evidence, non-empty diagnostic reasons, and settled-attempt evidence. Reject representative old version-zero documents rather than migrating or weakening the schema.
6. Update run allocation, the current stage loop, and the current resume path to write and preserve the new schema on every transition. Runtime selection must persist real for an unset/empty toggle and scripted for exact `1`; resume must refuse a real checkpoint when exact `1` is present and refuse a scripted checkpoint unless exact `1` is present.
7. Update all TypeScript checkpoint fixtures and the seeded list scenario to carry the required runtime, attempt HEAD observations, and recovery values and to omit the removed fields.
8. Add table-driven checkpoint tests for one round trip per recovery variant and every rejection named by AC-2.2, plus the accepted audit fixtures containing a `BLOCKED` attempt or no referenced attempt. In resume tests, spy on lock acquisition and persistence to prove those invalid documents are rejected first.
9. Run the checkpoint, persistence, command, runner, and list tests, then run the complete CLI gate.

**Files modified:**
- `cli/src/state/checkpoint.ts`
- `cli/src/state/checkpoint.test.ts`
- `cli/src/state/persist.test.ts`
- `cli/src/test-helpers/waiting.ts`
- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/commands/list.test.ts`
- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`
- `cli/scripts/scenarios/29-list.mjs`

**Verification:**
- `npm --prefix cli run test -- src/state/checkpoint.test.ts src/state/persist.test.ts src/commands/run.test.ts src/commands/resume.test.ts src/commands/list.test.ts src/runner/runner.test.ts`
- `! rg -n "startedScripted|gitCursor|governingReason|headAtAttemptStart" cli/src cli/scripts`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-2 / AC-2.1: valid examples of all four recoveries round-trip with reason order and recovery data unchanged.
- FR-2 / AC-2.2: every invalid recovery, reference, result, resolution, condition, reason-list, and HEAD-evidence case enumerated by the specification is rejected independently.
- FR-2 / AC-2.3: the `BLOCKED`-attempt and no-attempt regression fixtures fail validation before lock acquisition or persistence and cannot advance.
- FR-2 / AC-2.5: every attempt carries start HEAD evidence, every settled attempt carries post-attempt HEAD evidence, and references bind the exact `(stageIndex, attempt)` pair.
- FR-2 / AC-2.6: the accepted schema requires runtime and recovery, contains no global Git cursor, remains `schemaVersion: 0`, and rejects old documents without a migration branch.
- FR-5 / AC-5.1 and AC-5.2 schema portion: allocation records the selected runtime and resume cannot switch an existing checkpoint between real and scripted identities.

**Consumes:** Artifact pattern and mismatch validators exported from `cli/src/thread/artifacts.ts`.

**Produces:** `HarnessRuntimeIdentity`, `AttemptReference`, `WaitingRecovery`, attempt-local HEAD fields, and the required version-zero `RunCheckpoint` schema in `cli/src/state/checkpoint.ts`.
