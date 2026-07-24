# Task 2: Implement strict scripted scenario loading

## Objective

Provide one dependency-free boundary that interprets the test toggle, resolves the fixed scenario path, and returns a fully validated immutable scenario for the selected or snapshotted stages.

## Input / context

Use `spec.md` FR-1, FR-2, and FR-4.1, constrained by `decisions.md` DR3, DR4, DR6, and DR7. The selected command supplies the expected stage IDs after resolving the built-in recipe for `run` or reading the checkpoint snapshot for `resume`; the loader must not inspect settings, recipe definitions, or checkpoints itself.

## Steps

1. Create `cli/src/harness/scripted/scenario.ts` and define the exact seven-name `ScriptedCaseName` catalog plus compatibility metadata: the three `outcome-*` names accept every supplied stage, while each of the four effectful names accepts only its identically named stage.
2. Add a pure toggle interpreter for `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS`: missing or empty returns real mode, exact `1` returns scripted mode, and every other non-empty value returns an actionable error naming the variable and accepted value.
3. Add fixed-path resolution that joins the already resolved config root with exactly `scripted-harness.json` and performs no filesystem mutation.
4. Add an asynchronous loader that reads the file once, reports missing/unreadable and JSON syntax failures with the resolved path, and manually validates a plain-object root containing exactly `schemaVersion` and `stages`.
5. Validate numeric `schemaVersion: 1`; a plain `stages` object with exactly the supplied stage IDs; non-empty arrays of non-empty strings; catalog membership; and stage compatibility. Reject unknown fields, missing/unknown stages, coercion, defaults, aliases, merging, and ignored values.
6. Return one typed validated scenario object whose stage arrays preserve input order, and expose the scenario path separately so startup display and diagnostics use the same resolved value.
7. Add exhaustive table-driven tests for toggle values, config-root path resolution, valid Standard input, every invalid shape class named by AC-2.2, duplicate/unknown expected stage handling, compatibility failures, unreadable/malformed files, and single-read behavior.
8. Run the focused scenario suite, then the complete CLI gate.

## Files modified

- `cli/src/harness/scripted/scenario.ts` (NEW)
- `cli/src/harness/scripted/scenario.test.ts` (NEW)

## Verification

Run `npm --prefix cli run test -- src/harness/scripted/scenario.test.ts` and confirm it exits `0`. Then run `npm --prefix cli run check` and confirm typecheck, all Vitest tests, and the production build exit `0`.

## Acceptance criteria

- The toggle has exactly the three behaviors specified by AC-1.1 and AC-1.3, with no second test-mode variable.
- The resolved file is exactly `<config-root>/scripted-harness.json`, and the loader never creates or rewrites it.
- The accepted schema has only `schemaVersion: 1` and exact stage-to-non-empty-case-array mappings.
- The case catalog exposes exactly the seven DR4 names and rejects every incompatible stage-specific assignment.
- All invalid schema classes produce deterministic actionable failures without a new dependency.
- One load reads and parses the scenario once and returns an object reusable for every attempt in that command.
- The focused tests and `npm --prefix cli run check` pass.

**Consumes:** none

**Produces:** `ScriptedScenario`, the exact seven-case catalog, toggle interpretation, fixed scenario-path resolution, and one-read strict scenario loading from `cli/src/harness/scripted/scenario.ts`.
