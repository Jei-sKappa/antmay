### Task 7: Consolidate harness IDs

**Objective:** Give settings and checkpoint validation one authoritative harness-ID collection without changing accepted inputs or diagnostics.

**Input / context:** `spec.md` FR-8 AC-8.3 and AC-8.4; `decisions.md DR9`; the harness validation in `cli/src/config/execution.ts` and `cli/src/state/checkpoint.ts`; and the validator imports produced by Task 6.

**Steps:**
1. Export the readonly `HARNESS_IDS` array from `config/execution.ts`. Use it for agent validation without an `as HarnessId` cast inside the narrowing check, and derive the existing supported-harness diagnostic from the array while preserving its exact text.
2. Delete the checkpoint validator's separate harness `Set`; import `HARNESS_IDS` and use it for membership and the adjacent known-ID diagnostic without adding a second collection.
3. Run the settings and checkpoint validator suites and the full CLI gate, then mechanically confirm one harness-ID collection remains.

**Files modified:**

- `cli/src/config/execution.ts`
- `cli/src/state/checkpoint.ts`

**Verification:**

- `npm --prefix cli run test -- src/config/execution.test.ts src/state/checkpoint.test.ts` exits `0`.
- `test "$(rg -l 'HARNESS_IDS.*\\[|HARNESS_IDS.*new Set' cli/src | wc -l | tr -d ' ')" -eq 1` exits `0`.
- `rg -n 'as HarnessId' cli/src/config/execution.ts` returns no matches.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- `HARNESS_IDS` is defined once in `config/execution.ts`, exported, and consumed by checkpoint validation.
- The check that narrows a harness needs no `as HarnessId` cast, and both supported-ID diagnostics derive from `HARNESS_IDS`.
- Existing validator tests retain their accepted and rejected documents and exact user-visible error text.

**Consumes:** the shared-validator imports produced by Task 6.

**Produces:** one exported `HARNESS_IDS` collection from `cli/src/config/execution.ts`, consumed by both settings and checkpoint validation.
