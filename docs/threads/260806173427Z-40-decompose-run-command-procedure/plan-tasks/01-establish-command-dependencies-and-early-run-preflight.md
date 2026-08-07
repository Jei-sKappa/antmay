### Task 1: Establish shared command dependencies and early run preparation

**Objective:** Establish the neutral command dependency boundary and replace the first half of `runCommand`'s inline preflight with explicit, typed run-specific steps.

**Input / context:** `spec.md`; `decisions.md DR1`, `decisions.md DR2`, `decisions.md DR3`, and `decisions.md DR5`; the current `run.ts` and `resume.ts`; the standing gate and concurrent-test constraints in `cli/AGENTS.md`.

**Steps:**

1. Create `cli/src/commands/deps.ts` and move the dependencies genuinely shared by both commands into an exported `CommandDeps`: environment, working directory, home directory, runtime loader, streams, color, optional clock, abort-controller factory, and signal-installer seam.
2. Create `cli/src/commands/run/types.ts` with the run argument type, a `RunDeps` extension of `CommandDeps` that owns candidate-ID generation, and the typed success/refusal vocabulary required by run preflight. Refusals contain facts only: no renderer callback or exit code.
3. Change `resumeCommand` to accept `CommandDeps`; update command-test type imports and fixtures so resume obtains no dependency contract from `run.ts`.
4. Create `commands/run/preflight/resolve-roots.ts` exporting `resolveRunRoots`, returning both roots or a structured refusal.
5. Create `load-pipeline.ts`, `load-profile.ts`, and `load-settings.ts`, exporting `loadRunPipeline`, `loadRunProfile`, and `loadRunSettings`; preserve reference resolution, strict whole-document validation, optional-profile identity, and missing-settings behavior.
6. Create `resolve-thread.ts` and `inspect-artifacts.ts`, exporting `resolveRunThread` and `inspectRunArtifacts`; keep repository/thread validation and concrete artifact inspection as separate facts.
7. Replace the corresponding inline blocks in `run.ts` with those six direct calls in order. Keep refusal rendering, streams, exit mapping, signals, and every later command step in `run.ts`.
8. Ensure none of the six steps imports another preflight step, either orchestrator, exit codes, concrete renderers, signal handling, or the engine.
9. Run the focused command tests and the full CLI gate, correcting only extraction and type/import fallout.

**Files modified:**

- `cli/src/commands/deps.ts` (NEW)
- `cli/src/commands/run/types.ts` (NEW)
- `cli/src/commands/run/preflight/resolve-roots.ts` (NEW)
- `cli/src/commands/run/preflight/load-pipeline.ts` (NEW)
- `cli/src/commands/run/preflight/load-profile.ts` (NEW)
- `cli/src/commands/run/preflight/load-settings.ts` (NEW)
- `cli/src/commands/run/preflight/resolve-thread.ts` (NEW)
- `cli/src/commands/run/preflight/inspect-artifacts.ts` (NEW)
- `cli/src/commands/run.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.test.ts`

**Verification:** `npm --prefix cli run test -- src/commands/run.test.ts src/commands/resume.test.ts` exits 0; `npm --prefix cli run check` exits 0; `rg -n 'from "\./run\.js"' cli/src/commands/resume.ts` returns no matches.

**Acceptance criteria:**

- `CommandDeps` is exported from `commands/deps.ts`; candidate-ID generation exists only on `RunDeps`.
- `resume.ts` does not import its dependency contract from `run.ts`.
- The six named step functions exist and are called directly by `run.ts` in the specified order.
- Steps return typed facts or inert refusals and own no presentation, exit selection, signals, engine handoff, or successful-lock cleanup.
- Existing command-boundary behavior assertions pass without weakening or relocation.

**Consumes:** none

**Produces:** `CommandDeps`; `RunDeps`; `resolveRunRoots`, `loadRunPipeline`, `loadRunProfile`, `loadRunSettings`, `resolveRunThread`, and `inspectRunArtifacts`; their ordered roots, document, thread, and artifact-state facts in `run.ts`.
