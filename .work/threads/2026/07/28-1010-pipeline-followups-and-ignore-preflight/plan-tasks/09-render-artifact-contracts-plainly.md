### Task 9: Render artifact contracts in plain language

**Objective:** Describe every unmet artifact prerequisite and promise through concrete thread files and shapes, with one exhaustive table behind both detail sentences and terminal rows.

**Input / context:** `spec.md` FR-9; `decisions.md DR9`, `decisions.md DR10`, and `decisions.md DR15`; the artifact dimensions in `cli/src/pipeline/types.ts`; the mismatch owner in `cli/src/thread/artifacts.ts`; and the explicit source constraint that relocating and rewriting `describeContractSide` is one task.

**Steps:**
1. Add focused table and formatter cases to `cli/src/thread/artifacts.test.ts` first, and update the display, runner, and resume expectations for the required concrete phrases and prerequisite action line. Cover every boolean value of `validThread`, `proposal`, `spec`, and `implementationReport`, and every `plan` value (`absent`, `brief`, `strict`, `malformed`); require each phrase to name the concrete file or folder and the structural shape. Run the focused suites and observe the new expectations fail against the raw dimension/value rendering and incomplete action line.
2. In `cli/src/thread/artifacts.ts`, define one table whose type is exhaustive over every `ArtifactState` dimension and every value legal for that dimension. Export formatters for one dimension/value, one mismatch row, and one contract side; implement `describeContractSide` here rather than in a consumer.
3. Make the table's phrases suitable for reuse verbatim in both a sentence and a list. Do not expose a raw-value fallback and do not render a bare dimension key or `JSON.stringify` value on an unmet-contract path.
4. Delete `describeContractSide` from `runner.ts` and `resume.ts`; import the artifact-owned formatter for prerequisite, postcondition, and resume-recheck messages so their expected and observed clauses draw on the table.
5. Make `display/terminal.ts` import the mismatch-row formatter and render each `Artifacts:` bullet from it. Leave the display responsible only for list structure and styling, not artifact names, shapes, or dimension values.
6. Change the one static prerequisite action constant to exactly `Restore the artifacts listed above and leave the worktree clean, then resume.` Keep `CONTRACT_REPAIR_NOTE` for `stage-contract-violation` byte-for-byte unchanged.
7. Confirm the artifact, display, runner, and resume expectations now pass. Assert both prerequisite and promised-state banners use the concrete phrases, that the `Detail` and `Artifacts:` text share the same table phrases, and that terminal code contains no raw dimension/value formatting.
8. Prove exhaustiveness non-vacuously: temporarily add one artifact-state dimension in `cli/src/pipeline/types.ts`, run typecheck and observe failure at the description table, then restore the file exactly before continuing.
9. Run the focused suites, full CLI gate, and scenarios `07-runtime-prerequisite` and `08-stage-contract-violation` with color disabled.

**Files modified:**

- `cli/src/thread/artifacts.ts`
- `cli/src/thread/artifacts.test.ts`
- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/display/terminal.ts`
- `cli/src/display/terminal.test.ts`
- `cli/src/pipeline/types.ts` (temporary exhaustiveness mutation; restored before completion)

**Verification:**

- `npm --prefix cli run test -- src/thread/artifacts.test.ts src/display/terminal.test.ts src/runner/runner.test.ts src/commands/resume.test.ts` exits `0`.
- The temporary extra `ArtifactState` dimension makes `npm --prefix cli run typecheck` exit non-zero at the description table; restoring it makes typecheck exit `0`.
- `rg -n 'mismatch\.dimension|JSON\.stringify\(mismatch' cli/src/display/terminal.ts` returns no matches (it matches the row-rendering line before the change).
- `npm --prefix cli run demo -- --scenario 07-runtime-prerequisite --no-color` reports `[PASS]` and shows concrete artifact phrases.
- `npm --prefix cli run demo -- --scenario 08-stage-contract-violation --no-color` reports `[PASS]` and shows concrete artifact phrases.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- One table in `thread/artifacts.ts` exhaustively describes every dimension/value pair with concrete files, folders, and shapes.
- `describeContractSide` exists only in `thread/artifacts.ts` and both runner and resume import it.
- The prerequisite and contract-violation detail sentences and `Artifacts:` rows reuse the same table wording.
- `display/terminal.ts` contains no artifact-specific phrase or raw dimension/value renderer.
- The prerequisite `Next:` line names artifact restoration, a clean worktree, and resume; the contract-repair line is unchanged.
- Both existing artifact-contract demos pass at their declared exit codes.

**Consumes:** the classifier-owned queue-reason helpers produced by Task 8 and the reduced runner/resume cursor code produced by Task 5.

**Produces:** exhaustive artifact-description table and `describeContractSide(...)`/mismatch formatting exports from `cli/src/thread/artifacts.ts`; concrete artifact-contract terminal output.
