### Task 5: Extract checkpoint validation

**Objective:** Give all untrusted checkpoint validation and cross-field invariants one executable module separate from both the schema and filesystem reading.

**Input / context:** The repository state after Task 4; `seed.md`; `decisions.md DR1`, `decisions.md DR3`, `decisions.md DR4`, and `decisions.md DR6`; the declarations in `cli/src/state/checkpoint/types.ts`; `isTerminalOutcome` from Task 1; `isHarnessId` from Task 2; and the aggregate-validation regression from Task 3. Preserve the validator as one concern; decomposing its body by document section is out of scope.

**Steps:**

1. Create `cli/src/state/checkpoint/validate.ts` and move the complete validation layer from `cli/src/state/checkpoint.ts`: all validation constants, regular expressions, private helpers, section checks, cross-field checks, and the exported `validateCheckpoint(doc: unknown): CheckpointResult`.
2. Import checkpoint types from `checkpoint/types.ts`, terminal-token narrowing from `runner/outcome.ts`, harness-id narrowing from `harness/id.ts`, and the existing catalog, shared-validation, thread-artifact, path, and workspace collaborators directly. Preserve error order, wording, field validation, cross-field invariants, and aggregate error collection exactly.
3. Keep `validateCheckpoint` intact as the coordinating validator. Add no per-section module split, migration, compatibility shim, or re-export from the old path.
4. Reduce `cli/src/state/checkpoint.ts` to the filesystem reader, importing `CheckpointResult` from `checkpoint/types.ts` and `validateCheckpoint` from `checkpoint/validate.ts`.
5. Retarget the direct validator consumers in `cli/src/state/checkpoint.test.ts`, `cli/src/execution/run-state.test.ts`, and `cli/src/commands/list.test.ts` to `state/checkpoint/validate.ts`.
6. Apply the remaining architecture retarget from `decisions.md DR3`: point the recovery-kind comparison exemption at `state/checkpoint/validate.ts`. Do not change `PAUSE_LITERAL`, delete an exemption, or widen any guard.
7. Run focused architecture, validation, run-state, listing, persistence, and command tests, then run the full CLI gate.

**Files modified:**

- `cli/src/state/checkpoint/validate.ts` (NEW)
- `cli/src/state/checkpoint.ts`
- `cli/src/architecture.test.ts`
- `cli/src/state/checkpoint.test.ts`
- `cli/src/execution/run-state.test.ts`
- `cli/src/commands/list.test.ts`

**Verification:** From the repository root, run `npm --prefix cli run test -- src/architecture.test.ts src/state/checkpoint.test.ts src/execution/run-state.test.ts src/commands/list.test.ts src/state/persist.test.ts src/commands/run.test.ts src/commands/resume.test.ts`, then `npm --prefix cli run check`; both commands exit `0`. Run `rg -n 'validateCheckpoint' cli/src --glob '!**/*.test.ts'` and confirm the declaration is in `state/checkpoint/validate.ts`, the reader imports it, and no compatibility re-export exists.

**Acceptance criteria:**

- `cli/src/state/checkpoint/validate.ts` owns all checkpoint validation and exports `validateCheckpoint`.
- The aggregate-error regression proves validation continues to report every independent problem in one call.
- Validation uses the shared terminal-outcome and harness-id predicates and preserves all diagnostics and invariants.
- The recovery-kind exemption names `state/checkpoint/validate.ts`; all four architecture references settled by `decisions.md DR3` now target their purpose-specific modules and none was deleted.
- `state/checkpoint.ts` contains filesystem reading only, and the full CLI gate passes.

**Consumes:** the checkpoint type family from `cli/src/state/checkpoint/types.ts`; `isTerminalOutcome(value: unknown): value is TerminalOutcome`; `isHarnessId(value: unknown): value is HarnessId`; the aggregate-error regression test in `cli/src/state/checkpoint.test.ts`.

**Produces:** `validateCheckpoint(doc: unknown): CheckpointResult` from `cli/src/state/checkpoint/validate.ts`.
