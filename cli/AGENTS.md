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
  declared boundary commit.
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
