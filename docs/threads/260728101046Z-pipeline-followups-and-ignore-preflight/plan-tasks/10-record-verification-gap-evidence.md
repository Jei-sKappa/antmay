### Task 10: Close and document the inherited verification gaps

**Objective:** Turn the runtime-prerequisite timing relationship into executable evidence and record why the other three inherited gaps remain deliberate.

**Input / context:** `spec.md` FR-5 and FR-6; `decisions.md DR6` and `decisions.md DR7`; `SPEC_CORRECT_DELAY_MS` in `cli/src/harness/scripted/invoker.ts`; and the run step in `cli/scripts/scenarios/07-runtime-prerequisite.mjs`.

**Steps:**
1. Create `cli/src/harness/scripted/demo-timing.test.ts` and dynamically import `cli/scripts/scenarios/07-runtime-prerequisite.mjs` by URL at test runtime. Locate its one `run` step carrying `afterMs`, require the value to be numeric, and assert it is strictly less than the imported `SPEC_CORRECT_DELAY_MS`.
2. Rewrite the scenario's stale timing comment to state the actual two failure modes: firing before the delayed window makes preflight composition refuse at exit `1`, while firing after it lets both stages complete at exit `0`; either disagrees with the declared exit `2`, so the demo fails loudly. Claim no false-pass rendering.
3. Prove the binding test non-vacuous twice: temporarily raise the scenario's `afterMs` above `SPEC_CORRECT_DELAY_MS` and observe the focused test fail, restore it, then temporarily lower `SPEC_CORRECT_DELAY_MS` below `afterMs` and observe the same test fail. Restore both production values exactly.
4. Add a comment beside the runner's unverifiable-postcondition branch explaining that preflight rejects its only producible cause, the branch is structurally unreachable end to end, and pausing is the fail-closed direction. Add a concise pointer beside the resume-side reinspection-failure sibling or repeat the reasoning there.
5. Add a comment beside the checkpoint validator's catalog-stage-ID check explaining that structural validation intentionally does not compare the rest of the snapshotted descriptor with the current catalog, which keeps the generic runner provable with synthetic fixtures.
6. Expand the comment beside the documentation test's user-visible-reason threshold to state that it checks only structural length and punctuation because no expressible assertion can decide whether prose is genuinely user-facing.
7. Add no test for the unreachable branch, do not widen descriptor validation, and do not change the documentation threshold. Run the focused timing test and the full CLI gate.

**Files modified:**

- `cli/src/harness/scripted/demo-timing.test.ts` (NEW)
- `cli/scripts/scenarios/07-runtime-prerequisite.mjs`
- `cli/src/harness/scripted/invoker.ts` (temporary timing mutation; restored before completion)
- `cli/src/runner/runner.ts`
- `cli/src/commands/resume.ts`
- `cli/src/state/checkpoint.ts`
- `cli/src/pipeline/documentation.test.ts`

**Verification:**

- `npm --prefix cli run test -- src/harness/scripted/demo-timing.test.ts` exits `0` with restored values.
- Raising `afterMs` alone makes the focused test exit non-zero; lowering `SPEC_CORRECT_DELAY_MS` alone makes it exit non-zero; restoring each makes it pass.
- `npm --prefix cli run demo -- --scenario 07-runtime-prerequisite --no-color` reports `[PASS]`.
- `git diff -- cli/src/harness/scripted/invoker.ts` is empty after the temporary constant mutation is restored.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- A test under `npm run check` dynamically imports the exact runtime-prerequisite scenario and enforces `afterMs < SPEC_CORRECT_DELAY_MS`.
- Either side of that inequality drifting alone is observed to fail the test.
- The scenario comment describes exit `1` for too early and exit `0` for too late, with both mismatching declared exit `2`.
- The runner, checkpoint validator, and documentation assertion each carry the required local reasoning.
- No behavior, validator breadth, documentation threshold, demo driver, or demo step vocabulary changes.

**Consumes:** the concrete artifact-contract terminal output produced by Task 9 and exhibited by scenario `07-runtime-prerequisite`.

**Produces:** `cli/src/harness/scripted/demo-timing.test.ts` as the executable timing binding; local code comments documenting the three accepted gaps.
