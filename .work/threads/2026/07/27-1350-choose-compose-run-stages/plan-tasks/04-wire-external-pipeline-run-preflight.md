### Task 4: Wire external pipelines into new-run preflight and checkpoints

**Objective:** Make `antmay afk run` allocate and execute only a fully resolved external pipeline selection whose local bindings and safety contracts are durably snapshotted.

**Input / context:** Start from the current built-in-pipeline `run` flow, then consume the loaders/composer from Tasks 2–3. Honor `spec.md` run grammar, pre-allocation ordering, snapshot, prompt, and resume requirements, together with `decisions.md DR2`, `DR3`, `DR4`, `DR7`, `DR8`, `DR11`, and `DR15`. The CLI is pre-release: replace schema shapes directly and add no migration or deprecated alias.

**Steps:**
1. Change the pure CLI grammar to `antmay afk run <pipeline-ref> --thread <path> [--from <stage-id>] [--profile <profile-ref>] [--dangerously-skip-permissions]`. Reject missing values, parser-level duplicates, unknown flags, and extra positionals; keep help/version/grammar paths free of config, state, Git, or harness I/O.
2. Pass the parsed pipeline reference, optional entry stage, and optional profile reference through lazy dispatch into `runCommand` without adding imports to the pre-dispatch graph.
3. Replace built-in pipeline lookup in `cli/src/commands/run.ts` with this ordered preflight: resolve roots; resolve and load the required pipeline source; resolve/load the optional execution profile; load optional settings; resolve/validate the thread; inspect concrete artifact state; compose the selected suffix and concrete targets; resolve every selected binding; validate scripted scenarios against selected IDs; probe selected harnesses; then apply the existing worktree, queue, unfinished-run, signal, lock, and allocation checks.
4. Keep every document/reference/thread/artifact/composition/target/binding/harness/worktree/queue/unfinished-run failure before run-directory creation. Preserve the existing under-lock queue recheck as part of allocation.
5. Redesign the checkpoint at `schemaVersion: 0` to retain pipeline declared name and resolved source, selected-profile declared name/source or the explicit settings-only selection, optional `--from`, and only the selected stages. Each snapshotted stage must include the complete catalog descriptor and artifact contract, resolved repository-relative target, portable instructions, and fully resolved local binding.
6. Remove the local prompt field from checkpoint bindings. Update prompt rendering so the catalog-owned skill trigger and concrete target come first and the portable pipeline instructions are appended only when present.
7. Update checkpoint validation and every checkpoint fixture to require and round-trip the new provenance, selection, contracts, target, instructions, and binding fields. Preserve `list`'s user-facing behavior while teaching its reads the new checkpoint shape.
8. Preserve resume's state-only behavior: it must consume only checkpoint data and reread neither pipeline, execution profile, nor settings. Add a resume test that edits or removes all three source documents after allocation and proves the snapshotted execution is unchanged.
9. Remove the runnable built-in Standard pipeline and the old catch-all settings/profile merge modules and tests. Update catalog consumers, scripted scenario validation, harness contexts, Git-boundary fixtures, and runner tests to use the selected checkpoint stages rather than importing a bundled pipeline.
10. Add run-command coverage for named and explicit document references, a complete profile with no settings file, settings fallback, all failure classes creating no run, selected-stage-only scripted validation/probing/snapshotting, source provenance, instructions in prompts, `--from` success/refusal, and impossible composition.

**Files modified:**

- `cli/src/cli/help.ts`
- `cli/src/cli/parse.ts`
- `cli/src/cli/parse.test.ts`
- `cli/src/program.ts`
- `cli/src/program.test.ts`
- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/commands/list.test.ts`
- `cli/src/config/settings.ts` (DELETED)
- `cli/src/config/settings.test.ts` (DELETED)
- `cli/src/gitops/boundary.test.ts`
- `cli/src/harness/native-session.ts`
- `cli/src/harness/probe.ts`
- `cli/src/harness/probe.test.ts`
- `cli/src/harness/prompt.ts`
- `cli/src/harness/prompt.test.ts`
- `cli/src/harness/sandcastle.ts`
- `cli/src/harness/sandcastle.test.ts`
- `cli/src/harness/scripted/invoker.ts`
- `cli/src/harness/scripted/invoker.test.ts`
- `cli/src/harness/scripted/probe.ts`
- `cli/src/harness/scripted/probe.test.ts`
- `cli/src/harness/scripted/scenario.test.ts`
- `cli/src/harness/types.ts`
- `cli/src/pipeline/profiles.ts` (DELETED)
- `cli/src/pipeline/profiles.test.ts` (DELETED)
- `cli/src/pipeline/standard.ts` (DELETED)
- `cli/src/pipeline/standard.test.ts` (DELETED)
- `cli/src/pipeline/types.ts`
- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`
- `cli/src/state/checkpoint.ts`
- `cli/src/state/checkpoint.test.ts`
- `cli/src/state/persist.test.ts`

**Verification:**

1. Run `npm --prefix cli run test -- src/cli/parse.test.ts src/program.test.ts src/commands/run.test.ts src/commands/resume.test.ts src/state/checkpoint.test.ts src/harness/prompt.test.ts src/harness/scripted/scenario.test.ts`.
2. Run `rg -n "builtInPipelines|standardPipeline|afk\\.defaults|profilePrompt" cli/src` and require no production-code match.
3. Run `npm --prefix cli run check`.

**Acceptance criteria:**

- The parser/help surface exposes the exact required pipeline reference plus optional `--from` and `--profile` grammar, without an `afk stages` or initialization command.
- Every run loads a successfully validated external pipeline; no runnable built-in pipeline remains.
- All preflight failures named in the spec leave no run directory or checkpoint.
- Only selected stages are probed, scripted-validated, assigned run positions, and snapshotted; skipped stages are never recorded as completed.
- A complete selected profile can run without settings; omitted profile entries fall back to whole settings bindings; missing selected bindings refuse before allocation.
- Checkpoints retain pipeline/profile identity and source provenance, optional entry point, catalog contracts, concrete targets, portable instructions, and resolved local bindings.
- Stage prompts append portable instructions after the catalog trigger and target, and local settings/profile documents supply no prompt.
- Resume remains independent of later pipeline, profile, and settings edits or removal.
- Existing exit codes, lazy dispatch, clean-worktree guard, queue gates, lock ownership, Git-boundary behavior, and `list` presentation remain intact.
- The targeted tests and the full CLI gate pass.

**Consumes:** `loadStageSettings`, `loadExecutionProfile`, `resolveStageBindings`, `loadPipelineDocument`, `inspectArtifactState`, and `composePipeline` from Tasks 1–3.

**Produces:** the documented `antmay afk run <pipeline-ref> --thread <path> [--from <stage-id>] [--profile <profile-ref>] [--dangerously-skip-permissions]` invocation; `state.json` snapshots containing only the fully resolved selected execution; checkpoint-only resume inputs with no source-document rereads.
