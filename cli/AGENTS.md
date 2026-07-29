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
Antmay method unattended. It runs a user-authored pipeline document stage by
stage against one selected thread through an agentic harness (Codex or Claude
Code), with durable checkpoints, workspace locking, and per-stage Git
boundaries. See `README.md` for the user-facing contract (document schemas, the
stage-support reference, lock recovery); this section is the map for agents
editing the code.

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

- `antmay afk run <pipeline-ref> --thread <path> [--from <stage-id>] [--profile <profile-ref>] [--dangerously-skip-permissions]`
- `antmay afk resume <run-id>`
- `antmay afk list`

All usage/help/version strings are pure constants in `src/cli/help.ts` and must
never touch config, state, Git, or harnesses.

The surface is exactly these three subcommands. Stage discovery is documentation
(`README.md`), never a command, and the CLI provisions no configuration: it
creates no config root, no `settings.json`, and no pipeline or profile document.

### Execution model

- The **trusted catalog** (`src/pipeline/catalog.ts`) holds the nine stages the
  executor can run: `spec`, `reconcile-spec`, `review-spec`, `plan-brief`,
  `plan-strict`, `reconcile-plan`, `implement`, `implement-plan`, and
  `implement-plan-with-subagents`. Each entry is plain JSON — no functions — so
  a checkpoint persists it verbatim, and it owns everything safety-critical: the
  skill name the trigger renders from, the declarative **target rule**, the
  **artifact prerequisite** and promised **transition**, the three-part **Git
  policy** (`headMayChange`, `allowedChanges` selectors, `changeRequired`,
  `commitSubjectTemplate` with the literal `<thread-folder>` placeholder), and
  the **queue resolution** (`advance` vs `rerun`).
- A **pipeline document** is a user-authored JSON file: `schemaVersion`, a
  declared `name`, and an ordered `stages` array whose entries carry only a
  catalog `stage` ID and optional opaque `instructions`. An entry selects; it
  never defines. Widening what an entry may carry is what would let author text
  reach a contract the catalog owns, so unknown-field rejection in
  `pipeline/documents.ts` is load bearing.
- A pipeline automates the automatable core of a **recipe** — one of the three
  documented paths under `docs/recipes/`. The two are deliberately not 1:1, and
  `docs/glossary.md` owns how they differ. What binds the executor: a recipe
  guides and never governs, while a pipeline enforces Git boundaries and queue
  gates. Never call a pipeline a recipe.
- **Composition** (`pipeline/composition.ts`) walks the selected suffix against
  the thread's freshly inspected artifact state, checking each stage's
  prerequisite at its position, applying its promise for the stages after it, and
  resolving its concrete target from that simulated state. A refusal carries a
  structured dependency projection — the initial value, ordered earlier
  transitions, projected value, and requirement — which the terminal renderer
  explains without exposing the internal simulated-state vocabulary. A `--from`
  suffix credits nothing a skipped stage would have promised.
- **Local bindings** (`config/execution.ts`) supply the agent and timings the
  pipeline deliberately does not: one binding per selected stage, from the
  selected execution profile when it binds that stage and from `settings.json`
  otherwise. The whole binding comes from one document — fields never merge
  across the two — and only the intrinsic defaults fill an omitted timing.
- The generic **runner** (`src/runner/`) drives a stage through the harness,
  classifies the attempt, and recognizes the skill's terminal `Outcome:` line.
  It rechecks the stage's prerequisite against fresh concrete state immediately
  before every attempt, and verifies the promised artifact state after a
  recognized `DONE`. That verification runs **before** the Git boundary, so a
  `DONE` implement attempt that left no `implementation-report.md` reports
  `stage-contract-violation` and never reaches boundary evaluation.
- Once the promise holds, the **boundary engine** (`src/gitops/`) validates that
  post-DONE changes fall within the stage's allowed selectors and produces the
  declared boundary commit — the `git-policy-violation` path, which fires when
  changes fall outside the selectors, `HEAD` moved where the stage forbids it, or
  a `changeRequired` stage left nothing. This includes the implementation
  stages: the skill makes its own per-task code commits and leaves the thread's
  `implementation-report.md` uncommitted, and the stage boundary is what commits
  that report.
- **Pauses** surface as exit code `2` (waiting): when a queue gate finds pending
  work (e.g. a file under the thread's `.pending-decisions/`), the run
  checkpoints and prints the exact `antmay afk resume <run-id>` command.
- **Resume reads only the checkpoint.** Every resolved value a run needs — both
  document identities and their source paths, the selected stages with their
  catalog definitions, resolved targets, instructions, and bindings — is
  snapshotted at allocation, so `resume` rereads no pipeline, profile, or
  settings document. A `stage-contract-violation` pause is the one pause exempt
  from the clean-worktree rule, because the repair it waits for arrives
  uncommitted; its four recoveries (finalize the saved `DONE`, rerun the stage,
  stay paused dirty, stay paused uninspectable) are decided by rechecking the
  promise first.

### Module layout (`src/`)

- `main.ts` — minimal bootstrap: enforces the Node `>=22` guard, then
  dynamically imports `program.js` so nothing heavy loads before the guard.
- `program.ts` — parses argv and dispatches; each real subcommand handler
  dynamically imports its own dependencies on selection, keeping the
  pre-dispatch import graph light (help/version/usage errors load nothing).
- `cli/` — argument parsing (`parse.ts`), help text (`help.ts`), and the fixed
  exit codes (`exit-codes.ts`).
- `commands/` — the three subcommand implementations (`run`, `resume`, `list`).
- `config/` — root path resolution (`roots.ts`), syntax-directed pipeline/profile
  reference resolution (`references.ts`), and the local binding documents:
  settings and execution-profile loading plus per-stage binding resolution
  (`execution.ts`).
- `pipeline/` — the shared declarative types (`types.ts`), the trusted stage
  catalog (`catalog.ts`), pipeline-document loading and validation
  (`documents.ts`), suffix selection and artifact-state composition
  (`composition.ts`), and target-rule resolution (`targets.ts`).
- `runner/` — the generic stage runner, attempt classification, outcome
  recognition, and signal handling.
- `gitops/` — the Git wrapper and its NUL-output splitter (`git.ts`),
  working-tree status (`status.ts`), the temporary-workspace ignore and
  tracked-content preflight (`temporary-workspaces.ts`), and the boundary engine
  (`boundary.ts`).
- `harness/` — the Sandcastle invoker, executable probing, and prompt assembly.
- `state/` — durable run state: checkpoints, logs, run records, and the
  exclusive workspace lock.
- `thread/`, `workspace/`, `display/` — thread resolution, queue gates and
  bounded artifact-state inspection (`artifacts.ts`, shared by composition and
  the runtime contract checks), current-checkout detection, and the curated
  terminal stream, including structured pipeline-composition refusals.
- `shared/` — low-level validation primitives with no domain knowledge, used by
  more than one module: `validation.ts` holds the plain-object guard every
  document validator narrows parsed JSON with. Only a primitive that answers a
  question about a raw value belongs here; anything that knows about stages,
  threads, checkpoints, or configuration lives in the module that owns it.
- `test-helpers/` — a fake harness and Git fixtures for the co-located `*.test.ts`.
- `scripts/demo.mjs` + `scripts/demo/` + `scripts/scenarios/` —
  dependency-free developer demo: a generic driver, its step/fixture/pipeline
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
  "Scenarios are the executable UI contract" below.
- **Multiline operational diagnostics belong to `display/`.** Domain modules
  return structured facts, and commands add the run or resume context before
  calling a terminal renderer. A short single-line diagnostic may remain a
  message, but never assemble a paragraph/list/command wall in a checker and
  pass it through a command's generic failure printer.
- **Artifact-prerequisite diagnostics form one interface across execution
  phases.** Both a composition refusal and a runtime recheck identify the
  affected stage, show the concrete thread files found and required, explain
  why the requirement is not satisfied, and state the result. Preflight reports
  that no stages ran; runtime reports that the affected stage did not run,
  marks the pipeline as paused there, and closes with recovery and resume
  instructions.

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

Scripted output imitates an ordinary attempt rather than announcing itself:
progress lines stream through the invoker's event seam so the terminal renders
them like real agent output, and each describes only filesystem work the case
genuinely performs. Nothing written to the terminal or the attempt log fabricates
provider JSON, a sandbox, a branch, or a timing. The one announcement is a single
dim line ahead of the run details block.

A case ends in one of three ways. Most report a `finalText` carrying the terminal
outcome line. A case may instead report a `CaseEnding`: `failed` returns a
normalized `idle-timeout` or `provider-error` outcome, and `await-abort` settles
only when the attempt is aborted — the seam that lets a signal land mid-attempt.
`await-abort` holds a referenced timer open while it waits, because an abort
listener alone keeps nothing alive and the process would otherwise drain its
event loop and exit before any signal arrived.

Every launched scripted attempt reports a deterministic synthetic session ID on
every path a real capture would take. Its shape is deliberately
non-provider-like, which is what lets the demo cover the pause `Continue` line
and the list's `Latest session` field with no real harness and no per-scenario
session setup.

The demo driver is generic and holds no scenario-specific knowledge: it builds
the CLI, stands up the fixture, executes the scenario's ordered steps, and
compares exit codes. Anything a single scenario needs — a rejecting Git hook, an
unreadable queue, a revoked permission, a hook that changes the world while a
child is live — belongs in that scenario's own file, never in the driver. A
scenario needing different executor configuration declares its own pipeline,
profile, or per-stage binding overrides rather than reaching for a demo-only
hook, so the demo exercises the same path a user would.

Two rules about a scenario's scripted document are not apparent from a scenario
that happens to work. A scenario that invokes `run` or `resume` declares one even
when it stops before any attempt launches, because the document is loaded and
validated in preflight, ahead of the checks such a scenario ends on; a
`list`-only scenario declares none and is given no scripted-harness file. And the
document is keyed by exactly the stage IDs the run selects, which is what the
executor validates it against, so a `--from` suffix scenario names only its
suffix.

Most scenarios reach their rendering by running the executor. A rendering that
draws an aggregate over many runs cannot be reached that way — one invocation
produces one run, and conditions like `ready` survive only microseconds between
two checkpoint writes — so such a scenario seeds checkpoints into `ctx.stateRoot`
from an `action` instead. Seed from one shape with per-row overrides, so a schema
change is one edit rather than one per row, and require the exit code the command
returns when every checkpoint is valid: the executor validates each one it reads
and fails on an invalid document, which is what stops a seeded fixture from
quietly drifting away from the schema it imitates.

Discovery is automatic: a scenario's id is its filename stem under
`scripts/scenarios/`, so a new scenario is a new file and nothing else. The
zero-padded prefix each id carries (`12-refused`) is what puts the catalog in
reading order everywhere it appears — on disk, in `--list`, and in the prompt —
rather than in the alphabetical order the names alone would give.

Each demo run allocates a unique `/tmp` directory holding an isolated config
root, an isolated state root, and the disposable repository, and injects
`ANTMAY_CONFIG_HOME`, `ANTMAY_STATE_HOME`, and the scripted toggle only into the
child CLI processes. That config root is built from scratch out of the same
production-schema documents a user writes, so the demo depends on no
configuration of the developer's: nothing under their real config or state root
is read or written. Everything temporary is preserved for inspection.

### Scenarios are the executable UI contract

Real-harness runs cost time and money, so the scenario catalog is the developer
end-to-end suite for Antmay's terminal interface. A scenario drives the built CLI
through its public command surface against isolated configuration, state, and
repository fixtures, using the scripted harness whenever execution reaches an
agent.

Every change that introduces or modifies user-visible terminal output must be
exercised by a scenario that reaches that output. This applies to every command
and execution phase, including startup, success, pauses, failures, warnings,
preflight refusals, and listings. Output length, rarity, and whether an agent was
invoked do not affect the requirement. When an existing scenario already
exercises the changed rendering, run it; nothing needs editing.

A supported rendering without a scenario is a UI coverage gap: developers
cannot readily discover, run, or review an interface the CLI claims to support.
Close such a gap by adding a scenario or by removing or consolidating the
distinct rendering.

Use one scenario for each distinct visual or explanatory state. Outputs that
differ only in interpolated values may share a scenario; outputs with different
sections, ordering, causal explanations, corrections, wrapping-sensitive
content, or interaction paths require separate scenarios. Then:

- **If an existing scenario already covers it, run that scenario and change
  nothing.**
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
- **Keep the scenario's own `label` accurate**, naming the state it exists to
  show. That label is the catalog: `--list` and the selection prompt render every
  row from it, so no document repeats them. Then run the affected scenario to
  confirm the exit code it declares.

Run the scenario with `--no-color` as well whenever the rendering leans on color,
to confirm it still reads when color carries nothing.

`npm run demo` sits deliberately outside the CLI grammar and the check/CI gate.
Unit tests remain responsible for exact behavior, edge cases, and output
assertions. They complement scenarios but never substitute for running the built
CLI and inspecting its interface. Conversely, behavior with no visible output
belongs in the `*.test.ts` suite: the demo checks one exit code per invocation
and is not the correctness gate.

### What only a real harness proves

Every harness under test is fake: the `*.test.ts` suite drives a fake invoker and
the demo drives the scripted one, so no gate ever contacts Codex or Claude Code.
Four properties therefore rest on construction alone, and only a human driving
the built binary against real provider credentials in a throwaway repository can
establish them: that a stage attempt launches a real session on the harness its
binding names; that the curated live terminal stream agrees with the verbose
attempt log written for the same attempt; that a genuine `DONE` produces the
stage's declared boundary commit over the real worktree; and that native session
capture supports out-of-band continuation, the printed `codex resume` or
`claude --resume` command reopening the very conversation the attempt held. Nobody
runs that by hand periodically and no schedule asks anyone to — it is a standing
gap, worth spending a disposable repository on when a change reaches one of those
four paths.

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
