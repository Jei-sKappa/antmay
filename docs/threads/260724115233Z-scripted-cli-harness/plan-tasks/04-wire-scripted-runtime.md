# Task 4: Wire scripted mode into run and resume

## Objective

Make real `antmay afk run` and `antmay afk resume` commands select the scripted invoker and probe together, enforce fail-closed resume safety, and prove the complete Standard flow through existing runner semantics.

## Input / context

Start from the outputs of Tasks 1–3. Use the full `spec.md` command, checkpoint, display, and verification contract, especially FR-1, FR-2.3–2.4, FR-5, FR-6, FR-7, and FR-8; honor `decisions.md` DR1, DR5–DR9. Existing marker-less schema-version-1 checkpoints and all ordinary real-mode paths remain valid.

## Steps

1. Extend `RunCheckpoint` with one optional strictly validated marker whose only valid present value records that the run started in scripted mode; keep `schemaVersion: 1`, accept old marker-less checkpoints, reject malformed marker values, and rely on typed checkpoint spreads so every transition preserves it.
2. Extend the `runCommand` dependency boundary to receive the scripted invoker factory and scripted probe alongside the existing real seams, without changing `HarnessId`, settings, stage profiles, or public command arguments.
3. In `run`, interpret the toggle only after the command has been selected; retain ordinary settings/profile resolution; when enabled, resolve and load the fixed scenario once against selected recipe stage IDs before probe and allocation, select both scripted seams as one runtime, and set the marker in the initial checkpoint. Invalid toggle/scenario input must exit `1` with no allocated run.
4. In `resume`, load the checkpoint before selecting a runtime. Reject a marked scripted checkpoint unless the toggle is exactly `1` before provider probe, lock acquisition, or checkpoint mutation; for an unmarked checkpoint, select scripted mode only for exact `1` and otherwise preserve state-root-only real resume behavior.
5. For scripted resume, lazily resolve the config root, load the live file once against `checkpoint.stages.map(stage => stage.id)`, select both scripted seams, and retain the loaded object for every attempt launched by that invocation, including queue/boundary paths that ultimately make no harness call.
6. Update `program.ts` so only the selected `run` or `resume` handler dynamically imports and injects the scripted factory/probe; keep help, version, grammar errors, and `list` free of scripted-toggle, config, scenario, state, Git, and harness work.
7. Add a conspicuous scripted-mode startup renderer containing the resolved scenario path, and invoke it on both new-run and resume paths before a possible harness call while preserving the logical harness/model in ordinary summaries and attempt headers.
8. Extend checkpoint tests for absent/present/invalid marker values and round-trip preservation across representative ready, executing, waiting, interrupted, and completed transitions.
9. Extend `run` command tests for exact toggle interpretation, fixed-path failure before allocation, scripted initial marking, paired seam replacement, startup output, complete Standard happy behavior and boundary commit subjects, required-change rejection of no-op DONE, and unchanged real mode.
10. Extend `resume` command tests for marked fail-closed rejection before probe/lock/mutation, unmarked real/scripted selection, live scenario rereading, snapshot-stage validation without settings/recipe reads, BLOCKED attempt 1 followed by `spec-correct` attempt 2, exhausted arrays, startup output, and no-call queue/boundary resume paths that still require valid scripted configuration.
11. Add or update display and lazy-dispatch regression tests to prove no rendered live line begins with `Outcome:`, scripted startup is prominent, neither real Sandcastle invocation nor real executable probing runs in scripted mode, and help/version/grammar/list stay side-effect-free.
12. Update `cli/AGENTS.md` with the exact toggle and fixed filename, logical Codex/Claude Code profile rule, paired seam replacement, optional fail-closed checkpoint marker, live rereading, and built-in-case-only/no-arbitrary-code safety boundary.
13. Run the focused checkpoint, display, run, and resume suites, then run the complete CLI gate.

## Files modified

- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/display/terminal.ts`
- `cli/src/display/terminal.test.ts`
- `cli/src/program.ts`
- `cli/src/state/checkpoint.ts`
- `cli/src/state/checkpoint.test.ts`
- `cli/AGENTS.md`

## Verification

Run `npm --prefix cli run test -- src/state/checkpoint.test.ts src/display/terminal.test.ts src/commands/run.test.ts src/commands/resume.test.ts` and confirm it exits `0`. Run `rg -n 'scripted|ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS' cli/src/cli cli/src/config/settings.ts cli/src/commands/list.ts cli/src/cli/help.ts` and confirm no public grammar, help, settings, provider ID, or list behavior was added. Then run `npm --prefix cli run check` and confirm typecheck, all Vitest tests, and the production build exit `0`.

## Acceptance criteria

- Exact toggle `1` makes `run` and eligible `resume` use both scripted seams; every other non-empty value fails, and unset/empty preserves real mode where allowed.
- Scripted `run` validates before allocation and records the optional marker; old marker-less checkpoints remain valid and all checkpoint transitions preserve a present marker.
- Marked resume without exact toggle `1` fails before probe, lock, or mutation with an actionable command instruction.
- Scripted resume rereads and validates the live fixed-path scenario against snapshotted stage IDs without rereading settings or recipe definitions.
- Startup output on both commands identifies scripted test mode and the resolved scenario path before invocation while logical harness/model/profile data remain unchanged.
- Command tests demonstrate complete Standard success, ordinary boundary commits, durable second-attempt selection after resume, provider-error exhaustion, generic pause exit codes, and unchanged real runner classification.
- No CLI flag, help entry, settings field, provider ID, dependency, scenario snapshot, convenience fixture, E2E directory, CI change, or package-release change is introduced.
- `cli/AGENTS.md` preserves the new architecture and safety rules for later sessions.
- The focused tests and `npm --prefix cli run check` pass without starting Codex, Claude Code, or a provider executable.

**Consumes:** the runner-supplied attempt context from Task 1, strict scenario runtime from Task 2, and scripted invoker/probe from Task 3.

**Produces:** production-reachable paired scripted runtime selection for `antmay afk run` and `antmay afk resume`, plus the optional fail-closed checkpoint marker and documented safety contract.
