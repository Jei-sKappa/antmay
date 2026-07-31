# Task 6: Separate scripted cases from the provider adapter

**Objective:** Keep the scripted provider-facing invoker small by moving its fixed case definitions and deterministic filesystem effects into a separate internal catalog.

**Input / context:** `spec.md` section 5 and FR-5; `decisions.md DR6` requires provider-adapter separation without changing any case name, compatibility rule, deterministic effect, progress/session behavior, or failure mapping.

**Steps:**
1. Create `cli/src/harness/scripted/cases.ts` and move the fixed content constants, case handlers, safe thread-file effect helpers, transcript construction, and case dispatch table out of the provider adapter.
2. Expose one typed case-execution seam from `cases.ts` that receives the validated scripted case plus the request/effect context and returns the transcript and ending data the adapter needs.
3. Reduce `cli/src/harness/scripted/invoker.ts` to provider-facing request validation, case selection, progress-event delivery, session capture, log/event bridging, abort handling, and `HarnessInvoker` construction.
4. Move case/effect-specific tests and imports to `cli/src/harness/scripted/cases.test.ts`; leave provider-boundary, event-order, session, abort, and outcome-normalization tests in `invoker.test.ts`.
5. Add parity assertions over `SCRIPTED_CASE_NAMES` so every accepted scenario case has exactly one handler and stage compatibility remains owned by the scenario validator.
6. Run scripted scenario, case, invoker, probe, and timing tests, then run the complete CLI gate.

**Files modified:**
- `cli/src/harness/scripted/cases.ts` (NEW)
- `cli/src/harness/scripted/cases.test.ts` (NEW)
- `cli/src/harness/scripted/invoker.ts`
- `cli/src/harness/scripted/invoker.test.ts`

**Verification:**
- `npm --prefix cli run test -- src/harness/scripted/cases.test.ts src/harness/scripted/invoker.test.ts src/harness/scripted/scenario.test.ts src/harness/scripted/probe.test.ts src/harness/scripted/demo-timing.test.ts`
- `test "$(wc -l < cli/src/harness/scripted/invoker.ts)" -lt 450`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-5 / AC-5.7: all existing scripted cases, compatibility rules, deterministic effects, prompt observations, progress events, synthetic sessions, attempt logs, and failure normalization retain their behavior.
- The provider adapter contains no fixed case/effect catalog and remains behind the existing provider-neutral harness boundary.
- The catalog and adapter introduce no new case name, scenario field, runtime dependency, or supported provider.

**Consumes:** none

**Produces:** The fixed scripted case/effect catalog in `cli/src/harness/scripted/cases.ts` and the small provider adapter in `cli/src/harness/scripted/invoker.ts`.
