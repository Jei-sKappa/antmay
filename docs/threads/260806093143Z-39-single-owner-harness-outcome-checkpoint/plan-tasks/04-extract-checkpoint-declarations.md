### Task 4: Extract checkpoint declarations

**Objective:** Isolate the durable checkpoint vocabulary in a declarations-only module and make every type consumer depend directly on that owner.

**Input / context:** The repository state after Task 3; `seed.md`; `decisions.md DR2`, `decisions.md DR3`, `decisions.md DR4`, and `decisions.md DR5`; `TerminalOutcome` from Task 1; `HarnessId` from Task 2; and the aggregate-validation test from Task 3. This task moves declarations only: checkpoint validation and filesystem reading remain executable exports of `cli/src/state/checkpoint.ts` until their later tasks.

**Steps:**

1. Create `cli/src/state/checkpoint/types.ts` and move these sixteen exported declarations into it without semantic changes: `RunCondition`, `AttemptResult`, `WaitingKind`, `WaitingDiagnostics`, `WaitingReason`, `WaitingReasons`, `HarnessRuntimeIdentity`, `AttemptReference`, `WaitingRecovery`, `WaitingInfo`, `TerminalResult`, `AttemptRecord`, `SnapshottedStage`, `ProfileSelection`, `RunCheckpoint`, and `CheckpointResult`.
2. Give `types.ts` only `import type` statements for the types it names, including `TerminalOutcome` from `runner/outcome.ts` and `HarnessId` from `harness/id.ts`. Add no runtime constant, predicate, validator, function, re-export, or import from `execution/` or `display/`.
3. Remove the declarations from `cli/src/state/checkpoint.ts` and import the exact types its validator and reader use from `checkpoint/types.ts`; do not re-export any of them.
4. Retarget every production type consumer to `state/checkpoint/types.ts`, including command, display, execution, harness-runtime, runner-classifier, persistence, and test-helper modules.
5. Retarget all test type imports to `state/checkpoint/types.ts`. Update the source-text purity expectations in `execution/recovery.test.ts` and `execution/recovery-policy.test.ts` to name the new type module while preserving their type-only import assertions.
6. Extend `cli/src/architecture.test.ts` with a guard that strips comments and accepts only `import type` plus `export type` / `export interface` declarations in `state/checkpoint/types.ts`, rejects every value import, `const`, and function, and separately rejects references to `execution/` or `display/`.
7. Apply the three Task-4 architecture retargets settled by `decisions.md DR3`: the atomic writer's sole target becomes `state/checkpoint/types.ts`, the pause-shape declaration exemption becomes `state/checkpoint/types.ts`, and the durable-transition schema reference becomes `state/checkpoint/types.ts`. Leave the recovery-kind validator exemption pointed at `state/checkpoint.ts` for Task 5.
8. Run focused architecture, checkpoint, persistence, recovery, classifier, display, and execution tests, then run the full CLI gate.

**Files modified:**

- `cli/src/state/checkpoint/types.ts` (NEW)
- `cli/src/state/checkpoint.ts`
- `cli/src/architecture.test.ts`
- `cli/src/commands/list.test.ts`
- `cli/src/commands/list.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/commands/run.ts`
- `cli/src/display/execution.ts`
- `cli/src/display/list.ts`
- `cli/src/display/startup.ts`
- `cli/src/display/types.ts`
- `cli/src/execution/attempts.ts`
- `cli/src/execution/context.ts`
- `cli/src/execution/engine.test.ts`
- `cli/src/execution/entry/evidence.ts`
- `cli/src/execution/entry/finalize.ts`
- `cli/src/execution/entry/recover.ts`
- `cli/src/execution/entry/refresh.ts`
- `cli/src/execution/interruption.ts`
- `cli/src/execution/pause.test.ts`
- `cli/src/execution/pause.ts`
- `cli/src/execution/phases/attempt.ts`
- `cli/src/execution/phases/prerequisite.ts`
- `cli/src/execution/phases/queue-gate.ts`
- `cli/src/execution/phases/settlement.ts`
- `cli/src/execution/phases/verify-promise.ts`
- `cli/src/execution/recovery-policy.test.ts`
- `cli/src/execution/recovery-policy.ts`
- `cli/src/execution/recovery.test.ts`
- `cli/src/execution/recovery.ts`
- `cli/src/execution/result.ts`
- `cli/src/execution/run-state.test.ts`
- `cli/src/execution/run-state.ts`
- `cli/src/harness/runtime.ts`
- `cli/src/runner/classify.test.ts`
- `cli/src/runner/classify.ts`
- `cli/src/state/checkpoint.test.ts`
- `cli/src/state/persist.test.ts`
- `cli/src/state/persist.ts`
- `cli/src/test-helpers/waiting.ts`

**Verification:** From the repository root, run `npm --prefix cli run test -- src/architecture.test.ts src/state/checkpoint.test.ts src/state/persist.test.ts src/execution/recovery.test.ts src/execution/recovery-policy.test.ts src/execution/run-state.test.ts src/execution/pause.test.ts src/runner/classify.test.ts`, then `npm --prefix cli run check`; both commands exit `0`. Run `rg -n -U "import type\\s+\\{[^}]*\\}\\s+from\\s+['\"][^'\"]*checkpoint\\.js['\"]" cli/src` and confirm it prints nothing, and inspect `cli/src/state/checkpoint/types.ts` to confirm it contains only type imports and exported declarations.

**Acceptance criteria:**

- `cli/src/state/checkpoint/types.ts` owns all sixteen checkpoint declarations and contains no runtime code.
- The type module references neither `execution/` nor `display/`, and the architecture test mechanically enforces both the declarations-only and direction properties.
- Every production and test type consumer imports directly from `state/checkpoint/types.ts`; no compatibility barrel or type re-export exists.
- `state/checkpoint.ts` contains executable validation and reading behavior and imports its document types from the new owner.
- The three applicable architecture references point to `state/checkpoint/types.ts`, the aggregate-validation test passes, and the full CLI gate passes.

**Consumes:** `TerminalOutcome` from `cli/src/runner/outcome.ts`; `HarnessId` from `cli/src/harness/id.ts`; the aggregate-error regression test in `cli/src/state/checkpoint.test.ts`.

**Produces:** `cli/src/state/checkpoint/types.ts` as the declarations-only owner of the checkpoint type family; direct type imports throughout `cli/src`.
