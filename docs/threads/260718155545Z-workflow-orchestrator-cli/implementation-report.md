# Implementation report

Source: plan.md (compiled from spec.md)

## Outcome

All 13 plan tasks completed and committed. The `antmay` v0 interactive skill-run orchestrator is implemented end to end as a strict TypeScript ESM Bun workspace and is mechanically green: `bun run build`, `bun run typecheck`, `bun run test` (275 unit tests), `bun run test:cli:e2e` (73 E2E tests), and `bun run check` all exit 0.

Delivered:

- A publishable two-package workspace (`@antmay/core`, `antmay`) with the `antmay` binary exposing exactly the public commands `spawn`, `status`, and `attach`; the observer worker is a private packaged module absent from `--help`.
- The multiplexer-neutral core domain: run identity/classification, the exact 18-entry v0 skill catalog with request postures, idempotent terminal-transition semantics, pending-bundle attention, and the exact `StatusDocumentV1` projection.
- Atomic per-user run state (three-level state-root precedence, canonical repository keying, O_EXCL lock with bounded stale recovery, write-sibling-then-rename replacement, load-time validation).
- Side-effect-free spawn preflight (canonical worktree, exact thread-form resolution, catalog/posture validation, harness-specific skill availability, harness + herdr executable checks, active-run guard).
- Structured transcript detection (anchored `Outcome:` grammar in core; harness-neutral four-state transcript evidence for Claude and Codex in the CLI) that rejects the specified false positives.
- The thin external herdr adapter and Claude/Codex harness launchers, a common `attachRun()`, per-run reconciliation, and a detached private observer worker.
- The three commands' full transactions and output contracts, and a real-CLI E2E acceptance matrix with automated traceability across FR-1–FR-11 plus named structural assertions for every architecture-review criterion.
- User/maintainer documentation (`docs/antmay-cli.md`, README entry point, `AGENTS.md` workspace section) and a real-herdr scripted-harness smoke that was executed against live herdr 0.7.4.

## Changes

- **Workspace/build:** root `package.json` Bun workspace, shared strict `tsconfig`, Biome, Vitest (separate `unit`/`e2e` projects), six root scripts, `.gitignore` for generated artifacts, `bun.lock`.
- **`packages/core/src`:** `run.ts`, `catalog.ts`, `status.ts`, `registry.ts`, `outcome.ts`, `reconcile.ts`, `attention.ts`, and an `index.ts` exporting only the intended public API. A source-level architecture test forbids pane/multiplexer/herdr/process/transcript-path coupling in core.
- **`packages/cli/src`:** `state/` (root resolution + `FilesystemRegistryStore`), `process/` (injectable `ProcessRunner`), `preflight/` (repository/thread/skill-availability/spawn), `transcripts/` (Claude/Codex readers), `adapters/` (`ExecutionAdapter` + `HerdrAdapter`), `harnesses/` (invocation rendering + Claude/Codex launchers), `attach/` (common operation + contextual selection), `observer/` (`reconcileRun`, `launchObserver`, `ensureObserver`), `commands/` (spawn/status/attach), `prompts.ts`, `worker.ts` + `worker-env.ts`, and `program.ts`. The build emits `dist/index.js` and the private `dist/worker.js`.
- **Tests:** unit tests per module plus architecture-boundary and public-contract structural assertions; a real-CLI E2E harness under `packages/cli/test/e2e/` (strict YAML requirement + case-manifest loaders, per-case isolated runner, checked-in herdr/Claude/Codex Node shims, traceability gate) with requirement files and declarative cases for FR-1–FR-11.
- **Docs:** `docs/antmay-cli.md` (operating contract + smoke procedures), a README CLI entry point, and an `AGENTS.md` `## The antmay CLI workspace` section; existing workflow-authoring rules preserved.

## Verification

Standing gates, run from the workspace root, all exit 0 at the final state: `bun run build`, `bun run typecheck`, `bun run test` (275 unit tests), `bun run test:cli:e2e` (73 E2E tests), `bun run check` (one non-failing Biome config-migration INFO). The E2E traceability gate reports that every behavioral acceptance criterion in FR-1–FR-11 has at least one passing declarative real-CLI case and every architecture-review criterion has a named passing structural assertion; it fails on unknown/missing/mis-kinded references. `git diff --exit-code -- skills shared .claude-plugin` is clean after the test and smoke runs (running the CLI/tests changes no workflow skill or harness configuration). E2E cases invoke the built `dist/index.js` as a real subprocess with external boundaries swapped only through injectable environment variables and checked-in shims — no in-product dry-run or fake-harness branch.

The real-herdr scripted-harness smoke was executed against live herdr 0.7.4: real pane creation and scripted-harness launch through real herdr pane verbs, with the built `antmay status --json` classifying `done`/`blocked`/`refused` (retained live panes, attach available) and `unknown` (pending transcript with a positively-ended pane); all smoke-created panes were cleaned up and no developer process was touched.

Not run: the interactive TTY E2E cases require `python3` (present on macOS and typical Linux CI); the automated suite was exercised on macOS only (not Linux) in this environment; the optional real-Claude/real-Codex smoke is documented but not run; the full `antmay spawn` / interactive-attach join was not driven through real herdr in the manual smoke (see Remaining concerns).

## Deviations and judgment calls

- The public run ID is a random UUID via an injectable seam (the spec fixes only that the ID be printable, unique, and opaque).
- Injectable boundary env-var names chosen and reused across the CLI: `ANTMAY_CLAUDE_SKILL_ROOTS`, `ANTMAY_CODEX_SKILL_ROOTS`, `ANTMAY_CLAUDE_BIN`, `ANTMAY_CODEX_BIN` (alongside the spec-named `ANTMAY_STATE_HOME`, `ANTMAY_HERDR_BIN`, `ANTMAY_CLAUDE_TRANSCRIPT_ROOT`, `ANTMAY_CODEX_SESSION_ROOT`).
- Commander renders the adapter flag help as `--adapter <herdr>`; only the literal value `herdr` is accepted (validated in preflight), so the non-interactive command shape is preserved and the difference is cosmetic.
- herdr adapter CLI verbs/JSON shapes are modeled on herdr's real CLI (a spec degree of freedom); only the adapter's parsing would change if actual keys differ.
- Transcript field conventions (Claude `forkedFrom` shape; Codex `task_complete.last_agent_message`, `thread_source`, spawn-time discovery heuristic) are fixture-driven and were not validated against live harness output; the parsers are deliberately lenient, so field drift degrades to `pending`/`unavailable` (the run stays active) rather than producing a false terminal.
- Interactive-TTY E2E cases are driven via a `python3` PTY (node-pty's native addon is unusable on this Node runtime and BSD `script(1)` refuses non-TTY stdio); those steps assert cleaned combined-stream substrings with quiescence-based completion, while all non-TTY steps assert exact exit code, stdout, and stderr.

## Remaining concerns

- **Spec §5 vs. the harness idle gate (plan/spec fault):** spec §5 premises that the scripted fake harness can drive a full `antmay spawn` / `spawn --attach` through real herdr without spending an agent run, but the herdr adapter issues `herdr wait agent-status --status idle` before submitting the invocation, and real herdr never reports the non-agent scripted shims as idle — so the scripted-harness path cannot complete a full `spawn` end to end. The manual smoke therefore exercised herdr pane verbs plus `antmay status --json` classification, and the full spawn/attach lifecycle is covered by the deterministic E2E cases and the optional real-agent smoke. `docs/antmay-cli.md` now discloses this honestly, but the §5-vs-adapter-gate tension is a genuine upstream fault to resolve.
- Two internal duplications await extraction: the worker's private `buildEvidenceReader`/`readCodexSpawnedAtMs` is duplicated in `commands/status.ts`, and the interactive inherit-stdio `InteractiveProcessRunner` is re-declared in both `commands/spawn.ts` and `commands/attach.ts`.
- `status --all` derives its repository set from registry run records, so a repository with pending bundles but zero registered runs is not enumerated (consistent with spec §4.3, but a latent gap).
- Non-blocking hygiene: the registry stale-lock recovery keys on lock-file age rather than process liveness and is not exercised by a real multi-process test; the TTY E2E step's declared `exitCode` is a dead assertion and `runTty` lacks a `python3`-absent error handler; `bun run check` emits a non-failing Biome config-migration INFO.

## Follow-ups

- Resolve the spec §5 / herdr idle-gate tension upstream: either relax or relocate the `wait agent-status --status idle` step so the scripted-harness smoke can drive a full `spawn` as §5 intends, or amend §5's scripted-smoke premise; then reconcile `docs/antmay-cli.md` accordingly.
- Run the automated suite (including the `python3`-dependent TTY cases) on Linux to close the macOS/Linux platform claim, and run the optional real-Claude/real-Codex smoke as additional evidence.
- Extract the shared observer evidence-reader and the interactive process runner into single modules to remove the noted duplications.
- Confirm the transcript field conventions against live Claude Code / Codex output and add `.jsonl.zst` Codex rollout handling if needed.
- Confirm the release/publish path for `antmay` given its `workspace:*` dependency on the private `@antmay/core` (bundled into `dist`).
