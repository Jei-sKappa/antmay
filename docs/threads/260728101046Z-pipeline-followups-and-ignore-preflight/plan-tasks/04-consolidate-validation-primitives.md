### Task 4: Consolidate validator primitives and harness IDs

**Objective:** Give every JSON validator one low-level plain-object guard and every harness validator one authoritative harness-ID collection without changing accepted inputs or diagnostics.

**Input / context:** `spec.md` FR-8, especially AC-8.3 through AC-8.6; `decisions.md DR9`; the four byte-identical `isPlainObject` definitions; and the existing harness validation in `cli/src/config/execution.ts` and `cli/src/state/checkpoint.ts`.

**Steps:**
1. Create `cli/src/shared/validation.ts` exporting the existing `isPlainObject(value): value is Record<string, unknown>` predicate without changing its semantics.
2. Replace the local definitions in `config/execution.ts`, `pipeline/documents.ts`, `harness/scripted/scenario.ts`, and `state/checkpoint.ts` with imports from the shared module. Keep every validator's ordering, error collection, and strict-field behavior unchanged.
3. Export the readonly `HARNESS_IDS` array from `config/execution.ts`. Use it for agent validation without an `as HarnessId` cast inside the narrowing check, and derive the existing supported-harness diagnostic from the array while preserving its exact text.
4. Delete the checkpoint validator's separate harness `Set`; import `HARNESS_IDS` and use it for membership and the adjacent known-ID diagnostic without adding a second collection.
5. Add `shared/` to the `cli/AGENTS.md` module-layout section in this same task, describing it narrowly as low-level reusable validation primitives rather than a general dumping ground.
6. Run all validator-focused tests and the full CLI gate, then mechanically confirm one predicate definition and one harness-ID collection remain.

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
- `test "$(rg -l 'HARNESS_IDS.*\\[|HARNESS_IDS.*new Set' cli/src | wc -l | tr -d ' ')" -eq 1` exits `0`.
- `rg -n 'as HarnessId' cli/src/config/execution.ts` returns no matches.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- `isPlainObject` is defined once under `cli/src/shared/` and all four validators import it.
- `HARNESS_IDS` is defined once in `config/execution.ts`, exported, and consumed by checkpoint validation.
- The check that narrows a harness needs no `as HarnessId` cast, and the supported-ID message is derived from `HARNESS_IDS`.
- Existing validator tests retain their accepted/rejected documents and user-visible error text.
- `cli/AGENTS.md` names the new directory and its purpose.

**Consumes:** the reduced checkpoint validator shape from Task 3.

**Produces:** `isPlainObject(value: unknown): value is Record<string, unknown>` from `cli/src/shared/validation.ts`; exported `HARNESS_IDS` from `cli/src/config/execution.ts`.
