### Task 6: Extract checkpoint reading and retire the legacy module

**Objective:** Finish the checkpoint split by isolating filesystem loading, deleting the former mixed-concern module, and leaving every reader on the narrow final path.

**Input / context:** The repository state after Task 5; `seed.md`; `decisions.md DR2`, `decisions.md DR3`, and `decisions.md DR6`; `CheckpointResult` from `cli/src/state/checkpoint/types.ts`; and `validateCheckpoint` from `cli/src/state/checkpoint/validate.ts`. The final state has no `state/checkpoint.ts` file and no barrel over the three checkpoint modules.

**Steps:**

1. Create `cli/src/state/checkpoint/read.ts` and move `readCheckpoint(runDir: string): Promise<CheckpointResult>` plus its filesystem and path imports out of `cli/src/state/checkpoint.ts`.
2. Import `CheckpointResult` directly from `checkpoint/types.ts` and `validateCheckpoint` directly from `checkpoint/validate.ts`. Preserve `state.json` path construction, read and JSON error wording, leftover-temp-file behavior, and validation delegation exactly.
3. Retarget every reader to `state/checkpoint/read.ts`: `commands/list.ts`, `commands/resume.ts`, `commands/run.ts`, `commands/run.test.ts`, `commands/resume.test.ts`, `execution/engine.test.ts`, and `state/persist.test.ts`.
4. Delete `cli/src/state/checkpoint.ts`. Add no `checkpoint/index.ts`, re-export, forwarding module, compatibility import, migration, or schema change.
5. Update the `runner/`, `harness/`, and `state/` module-layout entries in `cli/AGENTS.md` to name the terminal-outcome leaf owner, the harness-id owner, and the three checkpoint modules. Extend the architecture-test contract summary with the terminal-outcome single-owner guard and declarations-only checkpoint-type guard; keep the prose scoped to these durable, mechanically enforced boundaries.
6. Search production and tests for imports of the deleted `state/checkpoint.js` path and retarget any missed consumer to exactly one of the three purpose-specific modules.
7. Run focused reader, persistence, command, engine, validator, and architecture tests, then run the full CLI gate.

**Files modified:**

- `cli/src/state/checkpoint/read.ts` (NEW)
- `cli/src/state/checkpoint.ts` (DELETED)
- `cli/src/commands/list.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/execution/engine.test.ts`
- `cli/src/state/persist.test.ts`
- `cli/AGENTS.md`

**Verification:** From the repository root, run `npm --prefix cli run test -- src/state/checkpoint.test.ts src/state/persist.test.ts src/commands/list.test.ts src/commands/run.test.ts src/commands/resume.test.ts src/execution/engine.test.ts src/architecture.test.ts`, then `npm --prefix cli run check`; both commands exit `0`. Run `test ! -e cli/src/state/checkpoint.ts`, `test -f cli/src/state/checkpoint/types.ts`, `test -f cli/src/state/checkpoint/validate.ts`, and `test -f cli/src/state/checkpoint/read.ts`; all checks succeed. Run `rg -n "from ['\"](?:\\.\\./)*state/checkpoint\\.js['\"]|from ['\"]\\./checkpoint\\.js['\"]" cli/src` and confirm it prints nothing.

**Acceptance criteria:**

- Checkpoint declarations, validation, and filesystem reading live exclusively in `state/checkpoint/types.ts`, `state/checkpoint/validate.ts`, and `state/checkpoint/read.ts`, respectively.
- `readCheckpoint` preserves its public behavior and delegates parsed data to the extracted validator.
- `cli/src/state/checkpoint.ts` is absent, and no barrel, forwarding export, compatibility shim, or stale import remains.
- `cli/AGENTS.md` describes the final terminal-outcome, harness-id, and checkpoint ownership boundaries plus their architecture guards without changelog language or transient implementation detail.
- The focused tests and full CLI gate pass.

**Consumes:** `CheckpointResult` from `cli/src/state/checkpoint/types.ts`; `validateCheckpoint(doc: unknown): CheckpointResult` from `cli/src/state/checkpoint/validate.ts`.

**Produces:** `readCheckpoint(runDir: string): Promise<CheckpointResult>` from `cli/src/state/checkpoint/read.ts`; the final three-module checkpoint boundary with no legacy import path.
