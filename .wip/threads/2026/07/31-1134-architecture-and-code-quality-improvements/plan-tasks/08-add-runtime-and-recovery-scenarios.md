# Task 8: Add runtime and recovery scenarios

**Objective:** Exercise the immutable-runtime refusal and saved-DONE recovery through the built CLI as distinct, ordered executable-UI scenarios.

**Input / context:** The required checkpoint schema from Task 2, focused refusal rendering from Task 5, and lazy runtime resolver from Task 7; `spec.md` AC-7.4 and AC-8.3; `decisions.md DR5`, `DR8`, and `DR12` require the new actionable refusal while preserving scenario ordering and existing visual states.

**Steps:**
1. Add `11-real-runtime-scripted-toggle-refusal.mjs`; seed a valid real-runtime checkpoint, invoke resume with the demo's exact scripted toggle, require exit `1`, and leave probe, lock, harness, and checkpoint bytes untouched.
2. Add `19-saved-done-recovery.mjs`; use the existing `outcome-done` scripted case to produce a contract pause, repair the promised artifact in a scenario-owned action, resume, and prove the saved exact attempt finalizes without a second harness invocation.
3. Keep each scenario focused on its final visual state, add a note explaining any setup invocation/action, and introduce no scripted case or scenario-schema field.
4. Renumber the existing scenario files listed below so the runtime mismatch sits with preflight refusals and saved-DONE recovery sits beside its contract pause; update the README's numbered demo example.
5. Run the demo catalog listing and both new scenarios with and without color, then run the complete CLI gate.

**Files modified:**
- `cli/scripts/scenarios/11-real-runtime-scripted-toggle-refusal.mjs` (NEW)
- `cli/scripts/scenarios/11-blocked.mjs` (DELETED) → `cli/scripts/scenarios/12-blocked.mjs` (NEW)
- `cli/scripts/scenarios/12-refused.mjs` (DELETED) → `cli/scripts/scenarios/13-refused.mjs` (NEW)
- `cli/scripts/scenarios/13-waiting-for-user.mjs` (DELETED) → `cli/scripts/scenarios/14-waiting-for-user.mjs` (NEW)
- `cli/scripts/scenarios/14-multiple-reasons.mjs` (DELETED) → `cli/scripts/scenarios/15-multiple-reasons.mjs` (NEW)
- `cli/scripts/scenarios/15-retry.mjs` (DELETED) → `cli/scripts/scenarios/16-retry.mjs` (NEW)
- `cli/scripts/scenarios/16-runtime-prerequisite.mjs` (DELETED) → `cli/scripts/scenarios/17-runtime-prerequisite.mjs` (NEW)
- `cli/scripts/scenarios/17-stage-contract-violation.mjs` (DELETED) → `cli/scripts/scenarios/18-stage-contract-violation.mjs` (NEW)
- `cli/scripts/scenarios/19-saved-done-recovery.mjs` (NEW)
- `cli/scripts/scenarios/18-failed-no-outcome.mjs` (DELETED) → `cli/scripts/scenarios/20-failed-no-outcome.mjs` (NEW)
- `cli/scripts/scenarios/19-failed-harness-error.mjs` (DELETED) → `cli/scripts/scenarios/21-failed-harness-error.mjs` (NEW)
- `cli/scripts/scenarios/20-failed-idle-timeout.mjs` (DELETED) → `cli/scripts/scenarios/22-failed-idle-timeout.mjs` (NEW)
- `cli/scripts/scenarios/21-failed-git-policy.mjs` (DELETED) → `cli/scripts/scenarios/23-failed-git-policy.mjs` (NEW)
- `cli/scripts/scenarios/22-failed-commit.mjs` (DELETED) → `cli/scripts/scenarios/24-failed-commit.mjs` (NEW)
- `cli/scripts/scenarios/23-failed-queue-scan.mjs` (DELETED) → `cli/scripts/scenarios/25-failed-queue-scan.mjs` (NEW)
- `cli/scripts/scenarios/24-interrupted.mjs` (DELETED) → `cli/scripts/scenarios/26-interrupted.mjs` (NEW)
- `cli/scripts/scenarios/25-checkpoint-write-failure.mjs` (DELETED) → `cli/scripts/scenarios/27-checkpoint-write-failure.mjs` (NEW)
- `cli/scripts/scenarios/26-permissions-warning.mjs` (DELETED) → `cli/scripts/scenarios/28-permissions-warning.mjs` (NEW)
- `cli/scripts/scenarios/27-heartbeat.mjs` (DELETED) → `cli/scripts/scenarios/29-heartbeat.mjs` (NEW)
- `cli/scripts/scenarios/28-long-content.mjs` (DELETED) → `cli/scripts/scenarios/30-long-content.mjs` (NEW)
- `cli/scripts/scenarios/29-list.mjs` (DELETED) → `cli/scripts/scenarios/31-list.mjs` (NEW)
- `cli/README.md`

**Verification:**
- `npm --prefix cli run demo -- --list`
- `npm --prefix cli run demo -- --scenario 11-real-runtime-scripted-toggle-refusal`
- `npm --prefix cli run demo -- --scenario 11-real-runtime-scripted-toggle-refusal --no-color`
- `npm --prefix cli run demo -- --scenario 19-saved-done-recovery`
- `npm --prefix cli run demo -- --scenario 19-saved-done-recovery --no-color`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-7 / AC-7.4: the mismatch scenario identifies the immutable real runtime, refuses provider switching, gives an actionable correction, exits `1`, and reaches no probe, lock, harness, or mutation.
- FR-8 / AC-8.3 saved-DONE evidence: the repaired saved-DONE scenario finalizes the referenced attempt and completes without another harness invocation.
- Scenario IDs are contiguous and ordered by reading flow, every existing label and declared exit code remains paired with its renamed file, and the README example names the new identifier.
- Both new visual states remain understandable without color and use no new scripted case.

**Consumes:** The real-runtime mismatch refusal and resolver from Task 7, the version-zero checkpoint shape from Task 2, and the fixed `outcome-done` scripted case preserved in the catalog from Task 6.

**Produces:** Scenario `11-real-runtime-scripted-toggle-refusal`, scenario `19-saved-done-recovery`, and the ordered `01`–`31` scenario catalog.
