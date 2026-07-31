# Task 9: Establish the execution engine

**Objective:** Move the runnable stage loop and its checkpoint persistence boundary into an execution-domain engine entered by both commands through typed allocation or resume values.

**Input / context:** Artifact operations from Task 1, checkpoint evidence from Task 2, recovery directives from Task 3, semantic Git finalization from Task 4, `ExecutionDisplay` from Task 5, and resolved runtime data from Task 7; `spec.md` section 1 and FR-1; `decisions.md DR1` and `DR10` require a single transition owner after command preflight and lock acquisition.

**Steps:**
1. Create `cli/src/execution/engine.ts` and move the existing generic stage loop out of `cli/src/runner/runner.ts` into it, preserving attempt allocation, log creation, prompt rendering, harness invocation, session capture, queue scans, artifact gates, finalization, pauses, advancement, completion, and signal handling.
2. Define `ExecutionEntry` as a discriminated command handoff with `allocated` and `resume` variants and define `ExecutionResult` with closed `kind` values for completed, paused, interrupted, and fatal-checkpoint results; avoid a second run-state or terminal-outcome vocabulary.
3. Keep the engine as the only owner of its `persistCheckpoint` function and complete checkpoint stamping; collaborators return facts or directives and never receive the writer.
4. Ensure the engine coordinates the artifact, Git, harness, state/log, queue, recovery-policy, and execution-display seams instead of reproducing their validators, decision tables, Git sequences, runtime selection, or terminal prose.
5. Move and rename the runner integration suite to `cli/src/execution/engine.test.ts`, preserve its concurrent fixture/teardown discipline, and adapt its helpers to `ExecutionEntry`, `ExecutionResult`, `ExecutionDisplay`, and resolved runtime inputs.
6. Change run and resume to call `executeEngine`; at this stage resume passes its already validated/recovered cursor through the `resume` entry, while Task 10 moves recovery-sensitive work behind that entry.
7. Remove `cli/src/runner/runner.ts` and its old test after every import has moved; retain `runner/classify.ts`, `runner/outcome.ts`, and `runner/signals.ts` as focused helpers.
8. Add command-integration spies proving both commands invoke the same engine export and map all four structured engine results to the established exit codes.
9. Run the engine and command tests, then run the complete CLI gate.

**Files modified:**
- `cli/src/execution/engine.ts` (NEW)
- `cli/src/execution/engine.test.ts` (NEW)
- `cli/src/runner/runner.ts` (DELETED)
- `cli/src/runner/runner.test.ts` (DELETED)
- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`

**Verification:**
- `npm --prefix cli run test -- src/execution/engine.test.ts src/commands/run.test.ts src/commands/resume.test.ts`
- `test ! -e cli/src/runner/runner.ts && test ! -e cli/src/runner/runner.test.ts`
- `rg -n "executeEngine" cli/src/commands/run.ts cli/src/commands/resume.ts cli/src/execution/engine.ts`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-1 / AC-1.1 command-entry portion: both allocated and resume command paths call the same execution engine and retain exit-code mappings.
- FR-1 / AC-1.4 runnable-loop portion: engine integration tests cover pre-attempt queues/artifacts, attempt allocation/settlement, post-DONE contracts, finalization, pause persistence, advancement, and completion.
- The engine owns complete checkpoint rewrites for every runnable-stage transition and depends only on the narrow execution display.
- No obsolete runner implementation or duplicate runner test remains.

**Consumes:** `ExecutionEntry` inputs contain a validated checkpoint, held lock context, resolved runtime invoker/versions, signal, execution display, run directory, and state root; the engine calls the artifact, recovery-policy, Git-boundary, queue, log, and persistence seams established earlier.

**Produces:** `executeEngine(context): Promise<ExecutionResult>` and its integration suite under `cli/src/execution/`.
