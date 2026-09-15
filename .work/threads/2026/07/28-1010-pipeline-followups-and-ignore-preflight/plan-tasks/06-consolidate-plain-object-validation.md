### Task 6: Consolidate plain-object validation

**Objective:** Give every JSON validator one low-level plain-object guard without changing accepted inputs or diagnostics.

**Input / context:** `spec.md` FR-8 AC-8.5 and AC-8.6; `decisions.md DR9`; the four byte-identical `isPlainObject` definitions; and the reduced checkpoint validator produced by Task 5.

**Steps:**
1. Create `cli/src/shared/validation.ts` exporting the existing `isPlainObject(value): value is Record<string, unknown>` predicate without changing its semantics.
2. Replace the local definitions in `config/execution.ts`, `pipeline/documents.ts`, `harness/scripted/scenario.ts`, and `state/checkpoint.ts` with imports from the shared module. Keep every validator's ordering, error collection, and strict-field behavior unchanged.
3. Add `shared/` to the `cli/AGENTS.md` module-layout section in this same task, describing it narrowly as low-level reusable validation primitives rather than a general dumping ground.
4. Run all validator-focused tests and the full CLI gate, then mechanically confirm one predicate definition remains.

**Files modified:**

- `cli/src/shared/validation.ts` (NEW)
- `cli/src/config/execution.ts`
- `cli/src/pipeline/documents.ts`
- `cli/src/harness/scripted/scenario.ts`
- `cli/src/state/checkpoint.ts`
- `cli/AGENTS.md`

**Verification:**

- `npm --prefix cli run test -- src/config/execution.test.ts src/pipeline/documents.test.ts src/harness/scripted/scenario.test.ts src/state/checkpoint.test.ts` exits `0`.
- `test "$(rg -l 'function isPlainObject' cli/src | wc -l | tr -d ' ')" -eq 1` exits `0`.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- `isPlainObject` is defined once under `cli/src/shared/` and all four validators import it.
- Existing validator tests retain their accepted and rejected documents, error collection order, and user-visible error text.
- `cli/AGENTS.md` names the new directory and its narrow purpose.

**Consumes:** `RunCheckpoint.gitCursor = { stageIndex, observedHead }` and its validator shape produced by Task 5.

**Produces:** `isPlainObject(value: unknown): value is Record<string, unknown>` from `cli/src/shared/validation.ts`, its four validator imports, and the `shared/` module-layout entry in `cli/AGENTS.md`.
