# Research how other projects handle documentation, to rethink docs in the Antmay method

## Context

This repository (`antmay`) defines the **Antmay method**. It is a thread-based way of carrying a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk. It also holds a skill suite (`suite/`) that implements the method. Part of the method manages project documentation: decisions (`docs/adr/`, `docs/pdr/`), product behavior (`docs/product/`), architecture descriptions (`docs/architecture/`), a glossary, and the delta documents that threads land at close.

I'm not happy with how the method handles docs:

- **Creating documents is too easy**, so projects end up with a lot of them.
- **The documents are too long and too descriptive for no good reason.** An agent that reads them fills its context with material it may not need.
- **The docs drift out of sync with the source of truth.** That is usually the code, or in this repository the skills.

## The direction I'm leaning toward (one idea, not a settled decision)

- Docs managed by Antmay should mainly help keep a user's `AGENTS.md` / `CLAUDE.md` lean. Those files should stay small and point to other documents only when such documents exist and are needed.
- A doc is justified only when it records something **hard to tell from the codebase alone** or **hard to find in the codebase**. An example is helping an AI or a new developer explore a part of the code that is difficult to navigate. Anything the code already makes clear should not be written down.

I'm open to other ideas. That's why I want the research below.

## Task

1. **Read this codebase first**, before spawning anything, so you understand what we are dealing with. At minimum read:
   - the root `AGENTS.md`
   - `suite/AGENTS.md`
   - `docs/documentation-rules.md`
   - `docs/product/method.md`
   - `docs/architecture/`
   - `docs/glossary.md`
   - the suite's authoring conventions in `suite/authoring/`
   - the skills that create, consult, or land documents (for example `consult-decisions`, `consult-descriptions`, `close-thread`, and any that draft delta documents)

   `cli/` is on hold and out of scope.
2. **List every project cloned in `.library/sources/`.**
3. **Spawn one subagent per project, all running in parallel.** Give each one its own report file (one file per project, in a single research folder) and a self-contained brief. Each brief should include a short summary of how Antmay currently handles docs and what I dislike about it, so the subagent knows what to look for. Each subagent should look at **both the project's code and its docs** (where docs exist) and report:
   - What documentation exists, where it lives, and how it is organized.
   - How documentation is created: what triggers a new doc, who or what writes it, and how much friction there is.
   - How long and how dense the docs are, and whether they are aimed at humans, AI agents, or both.
   - How the docs are kept in sync with the code or other source of truth, if at all: generation from code, tests or checks, review rules, or deletion policies.
   - How agent-facing files (`AGENTS.md`, `CLAUDE.md`, rules files, skills, prompts) are kept lean, and how they point to deeper material.
   - How the project captures things that are hard to learn from the code alone: decisions, invariants, non-obvious navigation.
   - How the project structures and records work in general (plans, specs, tasks, changelogs), if it does.
   - Concrete ideas Antmay could borrow, and anti-patterns to avoid. Cite file paths from the project for each.
4. **When all subagents finish, read every report and write a synthesis.** It should cover:
   - the patterns that recur across projects
   - the strongest ideas for Antmay, weighed against the direction above
   - any ideas that argue against or refine that direction

## Constraints

- This is research only. Do not change the suite, the `docs/` project layer, or any `AGENTS.md`. Changes to the method will go through a thread later.
- Do not commit.
