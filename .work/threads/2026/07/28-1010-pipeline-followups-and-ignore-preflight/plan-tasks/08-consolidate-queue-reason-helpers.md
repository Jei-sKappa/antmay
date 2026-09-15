### Task 8: Consolidate queue-reason helpers

**Objective:** Make the classifier the sole owner of queue-reason wording, assembly, and gate-error-before-pending-queues precedence.

**Input / context:** `spec.md` FR-8 AC-8.1 and AC-8.7; `decisions.md DR9` and `decisions.md DR15`; the focused message expectations in `cli/src/runner/classify.test.ts`; the duplicate helpers in `classify.ts`, `runner.ts`, and `resume.ts`; and the reduced runner/resume cursor code produced by Task 5.

**Steps:**
1. Export `gateErrorMessage`, `pendingQueuesMessage`, and the queue-reason assembly function from `cli/src/runner/classify.ts`. Keep sorting, singular/plural wording, failure-before-pending precedence, and `pendingFiles` payloads byte-for-byte compatible.
2. Make `classifyAttempt` call the exported assembly so the public helper and classification cannot drift.
3. Delete `gateErrorMessage`, `pendingQueuesMessage`, and `queueReasonsFor` from `cli/src/runner/runner.ts`; import and use the classifier-owned functions for pre-scan pauses, post-attempt contract pauses, and ordinary classification.
4. Delete the identical `pendingQueuesMessage` definition from `cli/src/commands/resume.ts` and import the classifier-owned function for refreshed and newly created pending-queue reasons.
5. Do not alter any focused helper expectation, classification precedence, reason ordering, message text, exit code, or rendering. Run focused classifier, runner, and resume tests, then the full CLI gate.

**Files modified:**

- `cli/src/runner/classify.ts`
- `cli/src/runner/runner.ts`
- `cli/src/commands/resume.ts`

**Verification:**

- `npm --prefix cli run test -- src/runner/classify.test.ts src/runner/runner.test.ts src/commands/resume.test.ts` exits `0`.
- `test "$(rg -l '^function gateErrorMessage|^export function gateErrorMessage' cli/src | wc -l | tr -d ' ')" -eq 1` exits `0`.
- `test "$(rg -l '^function pendingQueuesMessage|^export function pendingQueuesMessage' cli/src | wc -l | tr -d ' ')" -eq 1` exits `0`.
- `rg -n 'function (gateErrorMessage|pendingQueuesMessage|queueReasonsFor)' cli/src/runner/runner.ts cli/src/commands/resume.ts` returns no matches.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- `classify.ts` exports and internally uses the shared queue-reason helpers.
- `runner.ts` and `resume.ts` import every queue-reason helper they use and define no copy.
- Gate errors still precede pending-queue reasons, and focused expected messages remain unchanged.
- Consolidation changes no user-visible text, reason classification, exit code, or terminal layout.

**Consumes:** `RunCheckpoint.gitCursor = { stageIndex, observedHead }` and the corresponding runner/resume cursor writes produced by Task 5.

**Produces:** classifier-owned `gateErrorMessage(...)`, `pendingQueuesMessage(...)`, and queue-reason assembly consumed by the runner and resume command.
