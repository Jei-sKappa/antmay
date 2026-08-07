### Task 2: Extract run selection and runtime preparation

**Objective:** Make pipeline composition, immutable stage snapshotting, and harness-runtime resolution explicit ordered steps in `run.ts`.

**Input / context:** Task 1's dependency types, early run steps, and ordered facts; `spec.md`; `decisions.md DR2`, `decisions.md DR3`, `decisions.md DR4`, and `decisions.md DR5`; existing composition, binding, runtime, snapshot, and startup assertions in `run.test.ts`.

**Steps:**

1. Create `cli/src/commands/run/preflight/compose-pipeline.ts` exporting `composeRunPipeline`; accept the loaded pipeline, artifact state, thread path, and optional entry point, and return the selected prepared suffix or existing structured composition failure without rendering.
2. Create `cli/src/commands/run/preflight/snapshot-stages.ts` exporting `snapshotRunStages`; resolve one complete binding per selected stage and build the immutable stage snapshots, profile selection, and optional `fromStage` from facts already established.
3. Create `cli/src/commands/run/preflight/resolve-runtime.ts` exporting `resolveRunRuntime`; resolve exactly one adapter family, probe selected harnesses, preserve scripted-prompt observation, and return invoker, runtime identity, observed versions, non-empty process-local version map, and optional scenario path or the existing structured runtime refusal.
4. Replace the corresponding inline blocks in `run.ts` with direct calls in this order after artifact inspection: `composeRunPipeline`, `snapshotRunStages`, then `resolveRunRuntime`.
5. Keep rich composition/runtime rendering, plain binding failures, scripted-prompt presentation, and all lifecycle responsibilities in `run.ts`; leave the later Git and queue safety gates inline for task 3.
6. Ensure none of the three steps calls another preflight step, reaches an orchestrator, or owns exit selection, signal lifecycle, engine handoff, or successful-lock cleanup.
7. Run the existing run suite as the oracle for composition, entry-point selection, bindings, snapshots, runtime selection/probing, version maps, and scripted prompt/startup behavior, then run the full gate.

**Files modified:**

- `cli/src/commands/run/types.ts`
- `cli/src/commands/run/preflight/compose-pipeline.ts` (NEW)
- `cli/src/commands/run/preflight/snapshot-stages.ts` (NEW)
- `cli/src/commands/run/preflight/resolve-runtime.ts` (NEW)
- `cli/src/commands/run.ts`

**Verification:** `npm --prefix cli run test -- src/commands/run.test.ts` exits 0; `npm --prefix cli run check` exits 0; `rg -n 'Preflight [0-9]+' cli/src/commands/run.ts` returns no matches.

**Acceptance criteria:**

- `run.ts` directly sequences composition, stage snapshotting, and runtime resolution after task 1's artifact inspection.
- Snapshot results preserve selected suffix, bindings, targets, instructions, profile selection, and optional entry point.
- Runtime results preserve adapter-family selection, selected-harness probing, scripted-prompt observation, immutable runtime identity, and version-map semantics.
- Composition and runtime refusals remain structured data rendered by `run.ts`; binding errors retain their existing text and failure code.
- Focused and full gates pass without weakening or moving command-boundary assertions.

**Consumes:** Task 1's pipeline document/source, profile/settings, thread identity, and concrete artifact state.

**Produces:** `composeRunPipeline`, `snapshotRunStages`, and `resolveRunRuntime`; selected immutable stages, profile/entry-point facts, runtime identity, invoker, scenario path, and harness-version maps in `run.ts`.
