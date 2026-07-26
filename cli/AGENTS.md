# AGENTS.md — Antmay CLI

This file provides guidance to AI Agents working on the CLI under `cli/`. Paths
below are `cli/`-relative, and the npm scripts are meant to run from `cli/`.

## Update rule

This file is the memory for the CLI. While working under `cli/`, update this
file — not the root one, not the skill suite's — when:

- You make significant changes that needs to be remembered across session.
- You made a mistake that should not be repeated.
- The user told you a new rule that should be remembered.

A fact that holds for the skill suite too, or for the repository as a whole,
belongs in the root `AGENTS.md` instead. Every fact lives in exactly one of the
three files.

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

### ⚠️ Pre-release: no backward-compatibility obligation

**The CLI is in active development and has no users.** The author is the only
person running it, on throwaway state they can delete at any time. Until it is
marked released and stable, nothing it writes to disk is a compatibility
surface, and no past version has to keep working.

So design each change for the shape the code should have now:

- **Redesign any schema, config key, or on-disk format outright.** Every schema
  sits at `schemaVersion: 0` and stays there while it is unstable. Renumber it
  only once the format actually settles.
- **Write no migrations, no compatibility shims, no deprecation windows.** An
  executor that reads a document it does not recognize reports that clearly and
  stops. That is the intended behavior, not a gap to fill.
- **Add required fields as required.** Never weaken a field to optional just so
  a previously written checkpoint still validates. Such a checkpoint is one
  `rm -rf` away and is worth nothing next to a type that states the truth.
- **Rename and remove freely.** Settings keys, fields, and state layout are all
  fair game.

Treat "but this might invalidate existing state" as a non-argument, and spend no
design budget on hypothetical users who do not exist. A change that makes
existing run directories unreadable is fine — say so plainly in the commit
message and move on. When this notice is removed, all of the above reverses at
once.

**This licenses redesign, never disrepair.** `npm run check` must pass on every
change: no failing tests, no type errors, no half-migrated code left behind, no
scenario left red. Freedom from old formats is not freedom from a working build.

This section covers the CLI only. The skills under `suite/skills/` **are** published
and installed by real users through `npx skills add`, so their formats and
behavior stay stable.

### Toolchain

- TypeScript, ESM, Node `>=22`. Bundled with `tsup`, tested with `vitest`.
- The sole runtime dependency is `@ai-hero/sandcastle`, which supplies the
  agentic harness invoker.
- Commands: `npm --prefix cli run check` (typecheck + test + build) is the full
  gate; `npm run build`, `npm run typecheck`, `npm run test` run the pieces.
  `npm run demo` builds without tests and executes one scripted scenario in a
  unique disposable repository under `/tmp`.
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
- `scripts/demo.mjs` + `scripts/demo/` + `scripts/scenarios/` —
  dependency-free developer demo: a generic driver, its step/fixture/recipe
  helpers, and one self-contained file per scenario, driving a selected scripted
  scenario through a unique `/tmp` repository.

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
- **Every distinct terminal rendering has a demo scenario.** Give the terminal
  something new to draw and you add or extend one in the same change — see
  "Keep the scenario catalog current" below.

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

A scripted `run` writes `startedScripted: true` on the initial checkpoint; a run
started against a real harness omits it. Resume is fail-closed: a marked
checkpoint refuses to continue unless the toggle
is exactly `1`, before probe, lock acquisition, or mutation. Scripted resume
still requires a valid live scenario even on queue/boundary paths that make no
harness call.

Built-in scripted cases only — no arbitrary code, shell commands, or
scenario-supplied operations outside the fixed catalog in
`harness/scripted/scenario.ts`. Help, version, grammar errors, and `list` never
interpret the toggle or touch scenario/state/Git/harness modules.

Scripted output imitates an ordinary attempt rather than announcing itself. Each
case reports a transcript of progress lines plus how it ended; the invoker
streams every line through `onEvent` (so the terminal renders them like real
agent output) and appends the same lines to the attempt log under a
`Scripted Harness Run` frame naming the agent, case, and attempt. A progress line
is either prose or a tool call, and describes only filesystem work the case
genuinely performs; the frame fabricates no sandbox, branch, or timing. Scripted
mode announces itself in exactly one dim line printed ahead of the run details
block.

A case ends in one of three ways. Most report a `finalText` carrying the terminal
outcome line. A case may instead report a `CaseEnding`: `failed` returns a
normalized `idle-timeout` or `provider-error` outcome, and `await-abort` settles
only when the attempt is aborted — the seam that lets a signal land mid-attempt.
`await-abort` holds a referenced timer open while it waits, because an abort
listener alone keeps nothing alive and the process would otherwise drain its
event loop and exit before any signal arrived.

The `npm run demo` helper is intentionally outside the CLI grammar and check/CI
gate. It exists to exhibit the terminal interface: each scenario drives the run
to one distinct visual state — a closing block, a reason banner, a stage
disposition — and stops there, so the state under inspection is the last thing on
screen and needs no scrolling to find. Scenarios are therefore organized by what
the renderer draws, not by what the executor can do; two behaviors that render
identically do not need two scenarios, and one behavior that renders four ways
needs four.

The driver is generic and holds no scenario-specific knowledge. It builds the
CLI, stands up the fixture, executes an ordered step list, and compares exit
codes. The step vocabulary lives in `scripts/demo/steps.mjs`: `run`, `resume` and
`list` are invocations checked against an expected exit code, and `action` runs
scenario-owned code against the fixture between invocations. A `run` or `resume`
step may carry a `during` hook fired once the child has been alive for `afterMs`,
which is how a scenario signals a live run or changes the world underneath one.
Anything a single scenario needs — a rejecting Git hook, an unreadable queue, a
revoked permission — belongs in that scenario's own file, never in the driver.
`scripts/demo/fixture.mjs` holds the helpers those actions share, and
`scripts/demo/recipe.mjs` supplies the all-correct scripted document a scenario
overrides one stage of, so each file reads as "the standard run, except this".

Besides `label`, `scenario` and `steps`, a scenario may declare `note` — printed
before the run, for a scenario whose shape is not self-evident, so a reader
learns why it takes two invocations without opening the file — and
`settingsDefaults`, merged over `afk.defaults` in the copied settings file. A
scenario that needs different executor configuration uses that field rather than
a demo-only hook, so the demo exercises the same path a user would. `scenario`
itself is optional: a scenario that drives no attempt declares no scripted
document and is given no scripted-harness file.

Most scenarios reach their rendering by running the executor. A rendering that
draws an aggregate over many runs cannot be reached that way — one invocation
produces one run, and conditions like `ready` survive only microseconds between
two checkpoint writes — so such a scenario seeds checkpoints into `ctx.stateRoot`
from an `action` instead. Seed from one shape with per-row overrides, so a schema
change is one edit rather than one per row, and require the exit code the command
returns when every checkpoint is valid: the executor validates each one it reads
and fails on an invalid document, which is what stops a seeded fixture from
quietly drifting away from the schema it imitates.

Scenarios are checked in under `scripts/scenarios/`, one file per scenario; the
id is the filename stem and discovery is automatic, so a new scenario is a new
file and nothing else. Each id carries a zero-padded ordering prefix
(`03-refused`), which is what puts the catalog in reading order everywhere it
appears — on disk, in `--list`, and in the prompt — rather than in the
alphabetical order the names alone would give. A new scenario is numbered where
it belongs in that order; renumbering neighbours to make room is expected and
costs nothing. `01-all-done` leads, and is what the selection prompt takes when
answered with Enter. A scenario is selectable by number, by name without the
prefix, or by full id, so nobody has to memorize a number. That prompt reads a
whole line confirmed with Enter, so the catalog has no size limit. Each demo run
allocates a unique `/tmp` directory holding an isolated
config root, an isolated state root, and the disposable repository, and injects
`ANTMAY_CONFIG_HOME`, `ANTMAY_STATE_HOME`, and the scripted toggle only into the
child CLI processes. The developer's real `settings.json` is copied in so their
harness and model profiles are exercised; that copy is the only read of real
config, and nothing under the developer's real config or state root is written.
Everything temporary is preserved for inspection.

The demo verifies exactly one thing per invocation — the exit code — as a single
`[PASS]`/`[FAIL]` line, and stops at the first `[FAIL]`. Broader behavioral
assertions belong in the `*.test.ts` suite, which already covers the scripted
seams end to end. `ANTMAY DEMO STARTED` / `ANTMAY DEMO FINISHED` separator
lines bracket each child CLI's terminal stream, and an `[SETUP]` line names each
action step so the transcript says what changed between two invocations.
`--show-demo-summary` adds a closing summary printing the commit list, the
working-tree state, and the paths and environment needed to keep driving the
result by hand; without the flag the demo ends at the last `[PASS]`/`[FAIL]`
line. `--no-color` strips color from the child's output, which is the way to
check that the rendering still reads correctly when color carries nothing.

### Keep the scenario catalog current

**A change that gives the terminal something new to draw is not finished until a
scenario shows it.** The catalog is how a human sees this tool's output without
running a real harness; a rendering no scenario reaches is a rendering nobody
ever looks at, and it rots unnoticed.

Ask one question of every change: *can the terminal now produce output that no
existing scenario already produces?* A new pause kind, banner, closing block,
stage disposition, startup block, sub-line, or a new shape of an existing one —
all yes. Then:

- **If an existing scenario nearly covers it, extend that one.** Two scenarios
  that end on renderings a reader cannot tell apart are one scenario too many.
- **Otherwise add a file**, and give it a number that places it where it belongs
  in the reading order — routine before rare, and after anything it builds on.
  Renumbering neighbours to open a slot is expected and costs nothing; appending
  to the end merely to dodge that is what puts the catalog back in arbitrary
  order.
- **Keep the scenario at one visual state.** It stops as soon as it has shown
  what it exists to show, so that thing is the last output on screen and needs no
  scrolling to find. Add a `note` if its shape needs explaining, such as needing
  a second invocation.
- **Update the table in `README.md`** in the same change, and run the scenario to
  confirm the exit code it declares.

This obligation covers renderings only. Behavior with no visible output belongs
in the `*.test.ts` suite, which is the actual correctness gate — the demo checks
one exit code per invocation and nothing more, and is no substitute for a test.

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
