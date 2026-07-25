# AGENTS.md

This file provides guidance to AI Agents when working with code in this
repository.

## Update rule

Update `AGENTS.md` when:

- You make significant changes that needs to be remembered across session.
- You made a mistake that should not be repeated.
- The user told you a new rule that should be remembered.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## Antmay CLI

`antmay` is a strict, non-interactive command-line executor that drives the
Modular Agentic Workflow unattended. It runs a built-in recipe stage by stage
against one selected thread through an agentic harness (Codex or Claude Code),
with durable checkpoints, workspace locking, and per-stage Git boundaries. See
`README.md` for the user-facing contract (settings, lock recovery, the manual
smoke checklist); this section is the map for agents editing the code.

> **Platform support (v0):** macOS only. Linux/Windows behavior is incidental
> and undocumented.

### Toolchain

- TypeScript, ESM, Node `>=22`. Bundled with `tsup`, tested with `vitest`.
- The sole runtime dependency is `@ai-hero/sandcastle`, which supplies the
  agentic harness invoker.
- Commands: `npm --prefix cli run check` (typecheck + test + build) is the full
  gate; `npm run build`, `npm run typecheck`, `npm run test` run the pieces.
  `npm run demo` builds without tests and executes the scripted Standard happy
  path in a unique disposable repository under `/tmp`.
  The binary is `dist/main.js`, exposed as `antmay` via the `bin` field.

### Command surface

One top-level namespace, three subcommands:

- `antmay afk run <recipe> --thread <path> [--dangerously-skip-permissions]`
- `antmay afk resume <run-id>`
- `antmay afk list`

All usage/help/version strings are pure constants in `src/cli/help.ts` and must
never touch config, state, Git, or harnesses.

### Execution model

- A **recipe** (`src/recipe/`) is an ordered array of serializable
  `StageDescriptor`s. V0 ships one built-in recipe, `standard`, whose six stages
  map to workflow skills (`spec`, `reconcile-spec`, `review-spec`,
  `plan-strict`, `reconcile-plan`, `implement-plan-with-subagents`).
- Each stage carries a declarative **target**, a three-part **Git policy**
  (`headMayChange`, `allowedChanges` selectors, `changeRequired`,
  `commitSubjectTemplate` with the literal `<thread-folder>` placeholder), and a
  **queue resolution** (`advance` vs `rerun`). Descriptors hold no functions so
  the checkpoint can persist them verbatim.
- The generic **runner** (`src/runner/`) drives a stage through the harness,
  classifies the session, and recognizes the skill's terminal `Outcome:` line.
  On a recognized `DONE`, the **boundary engine** (`src/gitops/`) validates that
  post-DONE changes fall within the stage's allowed selectors and produces the
  declared boundary commit. This includes the implement stage: the skill makes
  its own per-task code commits and leaves the thread's
  `implementation-report.md` uncommitted, and the stage boundary is what commits
  that report. Because the report is `changeRequired`, a DONE implement attempt
  that left none pauses rather than advancing silently.
- **Pauses** surface as exit code `2` (waiting): when a queue gate finds pending
  work (e.g. a file under the thread's `.pending-decisions/`), the run
  checkpoints and prints the exact `antmay afk resume <run-id>` command.

### Module layout (`src/`)

- `main.ts` — minimal bootstrap: enforces the Node `>=22` guard, then
  dynamically imports `program.js` so nothing heavy loads before the guard.
- `program.ts` — parses argv and dispatches; each real subcommand handler
  dynamically imports its own dependencies on selection, keeping the
  pre-dispatch import graph light (help/version/usage errors load nothing).
- `cli/` — argument parsing (`parse.ts`), help text (`help.ts`), and the fixed
  exit codes (`exit-codes.ts`).
- `commands/` — the three subcommand implementations (`run`, `resume`, `list`).
- `config/` — settings loading/validation (`settings.ts`) and root path
  resolution (`roots.ts`).
- `recipe/` — recipe/stage types, the `standard` recipe, and profile/target
  resolution.
- `runner/` — the generic stage runner, session classification, outcome
  recognition, and signal handling.
- `gitops/` — Git wrapper, working-tree status, and the boundary engine.
- `harness/` — the Sandcastle invoker, executable probing, and prompt assembly.
- `state/` — durable run state: checkpoints, logs, run records, and the
  exclusive workspace lock.
- `thread/`, `workspace/`, `display/` — thread resolution and queue gates,
  current-checkout detection, and the curated terminal stream.
- `test-helpers/` — a fake harness and Git fixtures for the co-located `*.test.ts`.
- `scripts/demo.mjs` + `scripts/scenarios/` — dependency-free developer demo
  that builds the CLI and drives a selected scripted scenario through a unique
  `/tmp` repository.

### Test suite shape

The suite drives real `git` subprocesses and real fsynced checkpoints, which
dominates its runtime on macOS. Two conventions keep it fast; both are load
bearing.

- `createRepoFixture` returns a **filesystem copy of a cached template
  repository**, built once per distinct set of fixture options. Do not
  reintroduce a per-test `init`/`config`/`add`/`commit` path — that was ~400 ms
  of subprocess time per test case.
- `commands/resume.test.ts`, `commands/run.test.ts`, and `runner/runner.test.ts`
  declare their suites with **`describe.concurrent`**, so their cases overlap.
  Each case owns an independent repository, config root, and state root, and
  every temporary resource is collected in a module-level array released by a
  single `afterAll`. In these files, teardown must never run between cases: an
  `afterEach` hook would delete a repository a still-running case is using, and
  `onTestFinished` is unusable because Vitest 2 attributes it to the wrong test
  when cases run concurrently. Any new case in these files allocates through the
  existing helpers and registers no teardown of its own.
- `testTimeout`/`hookTimeout` in `vitest.config.ts` are deliberately generous.
  A Git-backed case needs seconds of wall clock under concurrent load; the
  budget exists so contention alone never fails a test.

### Contracts to preserve

- **Exit codes** are fixed in `src/cli/exit-codes.ts` and must not be
  repurposed: `0` ok, `1` failure, `2` waiting/paused, `130`/`143`/`129` for
  SIGINT/SIGTERM/SIGHUP.
- **`VERSION` in `src/cli/help.ts` is kept in sync by hand** with the `version`
  field in `cli/package.json` — bump both together.
- **The dynamic-import discipline is deliberate**, not incidental: keep the
  Node guard, dispatch, and per-command dependency loading lazy so help,
  version, and grammar errors stay cheap.
- **The workspace lock is never reclaimed automatically.** Do not add logic
  that silently removes another executor's lock.

### Scripted test harness (developer-only)

Scripted mode is gated exclusively by the environment variable
`ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS`. Only the exact string `1` enables it;
unset or empty preserves ordinary real-harness behavior; every other non-empty
value is a configuration error that must not fall through to a real harness.

When enabled, `run` and eligible `resume` read the live scenario from
`<resolved-config-root>/scripted-harness.json` (fixed filename; never created by
the CLI). The scenario is validated once per command against the selected or
snapshotted stage IDs and reread on every resume — never copied into the
checkpoint.

Runtime selection replaces **both** seams together: the Sandcastle invoker and
the executable probe are swapped for `createScriptedInvoker` and
`probeScriptedHarnessExecutables`. Logical stage profiles (Codex / Claude Code
harness id and configured model) stay unchanged in settings, snapshots, prompts,
and attempt headers; only the provider contact is bypassed.

A scripted `run` may write optional `startedScripted: true` on the initial
checkpoint (`schemaVersion` stays `1`). Marker-less checkpoints remain valid.
Resume is fail-closed: a marked checkpoint refuses to continue unless the toggle
is exactly `1`, before probe, lock acquisition, or mutation. Scripted resume
still requires a valid live scenario even on queue/boundary paths that make no
harness call.

Built-in scripted cases only — no arbitrary code, shell commands, or
scenario-supplied operations outside the fixed catalog in
`harness/scripted/scenario.ts`. Help, version, grammar errors, and `list` never
interpret the toggle or touch scenario/state/Git/harness modules.

Scripted output imitates an ordinary attempt rather than announcing itself. Each
case reports a transcript of progress lines plus a final message ending in its
terminal outcome; the invoker streams every line through `onEvent` (so the
terminal renders them like real agent output) and appends the same lines to the
attempt log under a `Scripted Harness Run` frame naming the agent, case, and
attempt. Progress lines describe only filesystem work the case genuinely
performs, and the frame fabricates no sandbox, branch, or timing. Scripted mode
announces itself in exactly one dim line printed ahead of the run details block.

The `npm run demo` helper is intentionally outside the CLI grammar and check/CI
gate. Its scenarios are checked in under `scripts/scenarios/`, one file per
scenario declaring the scripted-harness document plus the ordered `run`/`resume`
invocations and the exit code each must produce; the id is the filename stem and
discovery is automatic, so a new scenario is a new file and nothing else.
`happy-path` sorts first wherever scenarios are listed and is what the
selection prompt takes when answered with Enter. That prompt reads a single
raw-mode keypress — a digit selects its listed scenario immediately, with no
Enter — so it supports at most nine listed scenarios. Each
demo run allocates a unique `/tmp` directory holding an isolated config root, an
isolated state root, and the disposable repository, and injects
`ANTMAY_CONFIG_HOME`, `ANTMAY_STATE_HOME`, and the scripted toggle only into the
child CLI processes. The developer's real `settings.json` is copied in so their
harness and model profiles are exercised; that copy is the only read of real
config, and nothing under the developer's real config or state root is written.
Everything temporary is preserved for inspection.

The demo verifies exactly one thing per invocation — the exit code — as a single
`[PASS]`/`[FAIL]` line, and stops at the first `[FAIL]`. Broader behavioral
assertions belong in the `*.test.ts` suite, which already covers the scripted
seams end to end. `ANTMAY DEMO STARTED` / `ANTMAY DEMO FINISHED` separator
lines bracket each child CLI's terminal stream. `--show-demo-summary` adds a
closing summary printing the commit list, the working-tree state, and the paths
and environment needed to keep driving the result by hand; without the flag the
demo ends at the last `[PASS]`/`[FAIL]` line.

## Engineering Principles

These principles guide all implementation decisions in this project:

- **Law of Demeter**: A module should know as little as possible about the internal structure of other modules. Reduce coupling.
- **Principle of Least Astonishment**: Code should behave in a way other developers would reasonably expect.
- **Separation of Concerns**: Split a system into distinct parts, each handling a specific concern.
- **Premature Optimization is the Root of All Evil**: Optimize only when there is evidence it matters. Readability and correctness come first.
- **Defensive Programming**: Assume inputs, dependencies, and environments may fail or misbehave. Validate and safeguard at system boundaries.
- **Design for Testability**: Structure code so it is easy to verify automatically. Testable code tends to be more modular and loosely coupled.
- **KISS**: Avoid unnecessary complexity. Simplicity is better than cleverness.
- **YAGNI**: Do not build features until they are actually needed.
- **DRY**: Avoid duplication. Code that repeats itself is harder to maintain.

## Behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions or explicit user requests as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
