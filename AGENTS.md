# AGENTS.md

This file provides guidance to AI Agents when working with code in this
repository.

## Update rule

Update `AGENTS.md` when:

- You make significant changes that needs to be remembered across session.
- You made a mistake that should not be repeated.
- The user told you a new rule that should be remembered.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## Repository purpose

A personal collection of refined `SKILL.md` files authored by Jei-sKappa. Skills are distributed via [skills.sh](https://skills.sh) and installed by end users with:

```sh
npx skills add Jei-sKappa/skills --skill <skill-name>
```
There is no build, test, or lint pipeline — this is a content repository. Validation happens by reading the markdown and confirming the skill's instructions are coherent and progressively disclosed.

## Layout

- `skills/<skill-name>/SKILL.md` — one directory per skill under the top-level `skills/` folder. The directory name MUST match the `name:` field in the frontmatter.
- `README.md` — index of available skills; update when adding/removing a skill.
- `.claude-plugin/marketplace.json` — registers this repo as a `vercel-labs/skills` plugin so installs are grouped under a named heading (e.g. `JeisKappa Skills`) instead of `General` in `npx skills list`. Every skill folder MUST be listed in the appropriate plugin's `skills` array as `./skills/<skill-name>`. To introduce a new group/heading, add another entry to the `plugins` array with its own `name` and `skills` list. Display rule: the CLI splits `name` on `-`, uppercases the first char of each segment, then joins with spaces — so `JeisKappa-skills` renders as `JeisKappa Skills`. Dashes cannot survive into the displayed title.

## SKILL.md format

Every skill file starts with YAML frontmatter, then the skill body. Mirror the structure of `skills/consult-the-expert/SKILL.md`:

```yaml
---
name: <kebab-case, matches directory name>
description: <one sentence: what it does + when to use it. The "use when…" trigger is what the harness matches against, so make it concrete.>
metadata:
  author: https://github.com/Jei-sKappa
  version: <semver>
---
```

There is no specific format for the skill body: every skill is different.

Bump `version` in the frontmatter on any meaningful change to a skill's behavior.

## Deliverable skills — no preamble

Skills whose job is to produce a deliverable for the user to copy, paste, or hand off elsewhere (currently: `meta-prompting`, `consult-the-expert`, `report-to-the-owner`, `brief-the-implementer`) must enforce that the chat response IS the deliverable. No "Sure, here is…", no chat-style framing, no closing remark like "Hope this helps." Encode the rule explicitly in the skill's Tone or Output format section so a fresh model session honors it without relying on the harness picking up convention.

## When adding a new skill

1. Create `skills/<skill-name>/SKILL.md` with the frontmatter shown above (start at `version: 1.0.0`).
2. Add a section to `README.md` under "Available skills" with the description and the `npx skills add …` install snippet.
3. Register the skill folder in `.claude-plugin/marketplace.json` under the appropriate plugin's `skills` array as `./skills/<skill-name>` (default plugin: `JeisKappa-skills`).
4. Add the skill's folder name to `conventionalCommits.scopes` in `.vscode/settings.json` (keep the array sorted alphabetically) so it shows up as a commit scope.

## Commits

Never commit unless explicitly asked to do so.

This repo follows [Conventional Commits](https://www.conventionalcommits.org/). When the change is scoped to a single skill, the commit scope MUST be that skill's folder name — e.g. `refactor(brief-the-implementer): …`, `fix(report-to-the-owner): …`. The list of valid skill scopes lives in `conventionalCommits.scopes` inside `.vscode/settings.json`; if a new skill exists on disk but is missing from that array, add it there in the same commit (see "When adding a new skill" above).

Repo-wide changes (touching multiple skills, `README.md`, `.claude-plugin/`, `AGENTS.md`, etc.) should omit the scope: `chore: …`, `docs: …`, `feat: …`.

## V1 Workflow Conventions

This repo is the home of the Modular Agentic Workflow V1. The canonical reference for V1 workflow rules — thread layout, filename grammars, immutability — lives at `docs/workflow/v1/README.md`. Read it before writing or editing any workflow artifact under `docs/threads/<thread>/`.

Three things follow from V1:

1. **Thread storage** — All V1 workflow artifacts live under `docs/threads/<YYMMDDHHMMSSZ-slug>/` using the folder set defined in `docs/workflow/v1/thread-layout.md`. Nothing else writes there.
2. **Filename grammar** — Every artifact filename uses the record or versioned grammar in `docs/workflow/v1/filename-grammar.md`, including a mandatory artifact-type suffix.
3. **Immutability** — Emitted versioned and record artifacts are not edited; produce a new version or new record instead. See `docs/workflow/v1/immutability.md` for the ambiguous-reference resolution rule (ask the user — never silently pick "latest").

Drafts under any thread's `.wip/` folder are gitignored and editable until the owning skill emits them.

This section is a POINTER — it intentionally does NOT duplicate the rules. Edit the canonical docs under `docs/workflow/v1/` for any rule change; this section only changes if the V1 reference doc set itself moves or splits.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Modular Agentic Workflow V1**

A lightweight, modular, harness-agnostic, spec-driven agentic workflow distributed as a bundle of `SKILL.md` files inside the existing `Jei-sKappa/skills` repository. The workflow exposes a composable spine — `propose → spec → plan → implementation → finish` — with cross-cutting modules (discussion, review, merge, inbox, navigation) that can attach to any phase. Users install one or many of its skills via `npx skills add Jei-sKappa/skills --skill <name>` and run them inside their existing harness (Claude Code, Codex, Gemini, OpenCode, etc.).

**Core Value:** A user picking up any single skill or composing the whole spine can drive a feature end-to-end without depending on a CLI, runtime, or project-local state file — every artifact is reviewable Markdown on disk under `docs/threads/<thread>/`.

### Constraints

- **Tech stack**: Markdown-only skill files; YAML frontmatter (`name`, `description`, `metadata.author`, `metadata.version`); no scripts or runtime required by V1 (D1).
- **Harness compatibility**: Skill instructions must work across Claude Code, Codex, Gemini CLI, OpenCode (D29) — `*-with-subagents-*` skills are the only V1 skills allowed to assume subagent capability (D69).
- **Repository shape**: Keep skills flat under `skills/<skill-name>/` — no nested directories, no name prefixes (D3).
- **Naming**: Kebab-case skill names matching directory; `-auto` / `-interactive` suffix discipline (D29, D30); skill name MUST equal `name:` frontmatter and marketplace entry.
- **Artifact storage**: All workflow artifacts live under `docs/threads/<thread>/` per the V1 folder set; nothing else writes there (D7, D107).
- **Filename grammar**: All artifacts UTC-prefixed `YYMMDDHHMMSSZ`; artifact type suffix mandatory; versioned artifacts use target-version semantics (D11, D42, D43, D47, D46).
- **Immutability**: Emitted artifacts are not edited — new versions or new records only (D39, D40, D41).
- **Composition**: Every spine phase is optional; downstream skills accept explicit artifact inputs and ask when ambiguous (D32, D49).
- **Self-review**: Plan skills self-review before emission (D61); implementation reports use the four-state status protocol (D74).
- **Commits**: Plan/spec/proposal/discussion/review skills never auto-commit; `implement-*-auto` may commit per task or per cycle but never rewrite history (D62, D75, D76).
- **No new frontmatter metadata** beyond what existing skill schema requires (D4, D44).
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Markdown (YAML frontmatter + body) - All skill definitions under `skills/*/SKILL.md`
- JavaScript (CommonJS, Node.js) - GSD workflow tooling under `.claude/get-shit-done/bin/` and `.claude/hooks/`
- Bash - GSD lifecycle hooks under `.claude/hooks/*.sh` and `.claude/get-shit-done/bin/`
- JSON - Configuration files (`marketplace.json`, `model-catalog.json`, `config.json`, `settings.json`)
## Runtime
- Node.js v26 (detected on dev machine via `/opt/homebrew/bin/node`)
- npm 11.12.1
- No `package.json` or lockfile at the repo root — this is a content repository with no installable dependencies
- A minimal `.claude/package.json` exists solely to declare `{"type":"commonjs"}` for the GSD tooling
## Frameworks
- None — the primary content is plain Markdown; no application framework is used
- `vercel-labs/skills` CLI — skills are installed by end users via `npx skills add Jei-sKappa/skills --skill <name>`
- `skills.sh` — public index/badge host at `https://skills.sh/Jei-sKappa/skills`
- `get-shit-done-cc` npm package version `1.42.3` — provides Claude Code slash-commands, agents, hooks, and CLI utilities
- Installed under `.claude/get-shit-done/` (project-scoped install)
- Node.js CommonJS modules in `.claude/get-shit-done/bin/lib/*.cjs`
- No build pipeline — content repository
- VSCode `Conventional Commits` extension (configured via `.vscode/settings.json`) for structured commit messages
## Key Dependencies
- `get-shit-done-cc` v1.42.3 — the entire Claude Code workflow layer (commands, agents, hooks, CLI)
- Node.js standard library (`fs`, `path`, `os`, `child_process`) — used throughout GSD hooks and bin scripts; no third-party npm dependencies in the hooks themselves
## Configuration
- No `.env` files — environment variables are passed at runtime
- Key optional vars used by GSD tooling:
- `.planning/config.json` — project-level GSD settings (model profile: `quality`, branching strategy: `none`, brave search: `false`, firecrawl: `false`, exa search: `false`)
- `.vscode/settings.json` — conventional commit scopes (one entry per skill directory, kept sorted)
- `.claude/settings.json` — Claude Code hook registrations (SessionStart, PreToolUse, PostToolUse)
- `.claude-plugin/marketplace.json` — registers this repo as a `vercel-labs/skills` plugin named `JeisKappa-skills`; lists all nine skill folders
## Platform Requirements
- Node.js (v26+ observed on dev machine; no `.nvmrc` or `.node-version` present)
- npm (for `npx skills` install command used by consumers)
- macOS (developer machine is darwin 25.4.0; no Windows-specific tooling in repo root)
- Claude Code (for GSD slash-commands and agent hooks)
- Content is distributed via GitHub; no server deployment
- End-user installs skills locally via `npx skills add Jei-sKappa/skills --skill <name>`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Repository Nature
## File Naming Patterns
- Each skill lives at `skills/<skill-name>/SKILL.md`
- Directory name MUST match the `name:` field in the YAML frontmatter
- Directory names use kebab-case (e.g., `afk-exploration`, `brief-the-implementer`, `consult-the-expert`)
- Sub-references live at `skills/<skill-name>/references/*.md` (only for skills with supporting reference material)
- `README.md` — index of all skills; updated when skills are added or removed
- `AGENTS.md` — authoritative agent guidance (symlinked as `CLAUDE.md`)
- `.claude-plugin/marketplace.json` — plugin registry for `vercel-labs/skills` CLI
- `.vscode/settings.json` — `conventionalCommits.scopes` array (alphabetically sorted); every skill folder name must appear here
## SKILL.md Frontmatter
- `name` and directory name must match exactly
- `description` must include a concrete "Use when…" or "use only when…" trigger phrase
- `version` starts at `1.0.0` for new skills; bump on any meaningful behavioral change
- All existing skills use `https://github.com/Jei-sKappa` as the author value
## Skill Body Structure
- `## Tone` — voice and register guidelines
- `## Structure` — ordered list of output sections (verbatim section name requirement)
- `## Guidelines` — authoring principles and edge-case rules
- `## Output format` — shape of the deliverable
- `## Workflow` — numbered phases the agent follows
- `## When context is thin` — graceful degradation instructions
- `## Discipline` — hard constraints on the orchestrator
- `## Subagent briefs` — per-subagent prompt specs for multi-agent skills
## Deliverable Skills Rule
- Forbidden: "Sure, here is…", "Hope this helps.", chat-style framing, closing remarks
- Required: "The response IS the deliverable — no preamble, no closing remark."
- Example: `skills/consult-the-expert/SKILL.md` lines 40–41 and 44–46
## Multi-agent Skills
- Orchestrator never reads source directly — all reads go through subagents
- Subagents write to disk; orchestrator reads from disk (never from subagent reply)
- Subagent reply is acknowledgment only — file on disk is the only completion signal
- Each subagent gets a `## Subagent briefs` section with a self-contained brief per agent type
- Return contracts are explicit: subagent writes file, replies with 2–3 sentence summary + path only
- Hard constraints listed per subagent brief
## Output Paths Convention
- Date and per-day index separated by `_` (not `-`) — `_` makes the index visually distinct
- Zero-padded 2-digit day index (`01`, `02`, …)
- Existing topic subfolders use zero-padded 4-digit prefix for `afk-exploration` (`0001-<slug>/`)
## Version Bumping
## Import Organization
## Error Handling
## Logging
## Comments
## Commit Conventions
## Checklist for Adding a New Skill
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
```
## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| Skill unit | Self-contained agent instruction set | `skills/<skill-name>/SKILL.md` |
| YAML frontmatter | Identity, trigger description, version | first block of each `SKILL.md` |
| Reference files | Methodology documents read by subagents | `skills/<skill-name>/references/*.md` |
| Marketplace registry | Plugin grouping for `npx skills list` | `.claude-plugin/marketplace.json` |
| Agent guidance | Session-persistent rules for this repo | `AGENTS.md` (symlinked as `CLAUDE.md`) |
| Commit scopes | Valid conventional-commit scopes per skill | `.vscode/settings.json` |
| Skill index | Human-readable catalog with install commands | `README.md` |
## Pattern Overview
- Each skill is a standalone Markdown file with YAML frontmatter; no inter-skill imports or shared runtime.
- Validation is editorial: a human (or reviewing agent) reads the skill and confirms instructions are coherent.
- Distribution is via `npx skills add`; the marketplace registry (`marketplace.json`) controls grouping in `npx skills list`.
- Skills are versioned in their own frontmatter (`metadata.version`), not through the repo's git tags.
## Layers
- Purpose: Machine-readable identity consumed by the `skills` CLI harness.
- Location: Top of every `skills/<skill-name>/SKILL.md`
- Contains: `name` (kebab-case, matches directory), `description` (trigger sentence for harness matching), `metadata.author`, `metadata.version` (semver).
- Depends on: Nothing — self-contained.
- Used by: `npx skills` CLI during install and listing.
- Purpose: Human and agent instructions for how to execute the skill.
- Location: Body of `skills/<skill-name>/SKILL.md` (after frontmatter).
- Contains: Tone, structure, workflow phases, subagent briefs, constraints.
- Depends on: Optionally, `references/*.md` files in the same skill directory.
- Used by: The AI agent session that invokes the skill.
- Purpose: Reusable methodology documents too long or too specialized to embed in the main skill body. Loaded by dispatched subagents, not by the orchestrator.
- Location: `skills/afk-exploration/references/` and `skills/the-librarian/references/`
- Contains: `pre-mortem-analysis.md`, `red-team-adversarial.md`, `socratic-questioning.md`, `throwaway-prototyping.md` (afk-exploration); `stock.md`, `consult.md`, `research.md` (the-librarian).
- Depends on: Nothing.
- Used by: Critique and prototype subagents dispatched by `afk-exploration`; flow subagents dispatched by `the-librarian`.
- Purpose: Plugin manifest so the `skills.sh` marketplace groups this repo's skills under a named heading.
- Location: `.claude-plugin/marketplace.json`
- Contains: Plugin `name` (display-name encoded in dash-separated segments), `source`, `skills` array of relative paths.
- Depends on: Each entry must have a matching `skills/<skill-name>/` directory on disk.
- Used by: `npx skills` CLI during install listing.
## Data Flow
### Skill installation
### Skill invocation (deliverable skills)
### Skill invocation (orchestrator skills: afk-exploration, derive-spec)
### Skill invocation (router skill: the-librarian)
### Skill invocation (interactive skill: discussion-loop)
- No in-process state. Orchestrator skills persist state on disk (run folders, `.metadata.json`, note files). Interactive skills persist state in a log file under `docs/discussions/`. All other skills are stateless.
## Key Abstractions
- Purpose: An atomic, self-contained agent instruction set. Installed independently; invoked by trigger description.
- Examples: `skills/consult-the-expert/SKILL.md`, `skills/afk-exploration/SKILL.md`
- Pattern: YAML frontmatter block followed by a Markdown body. No imports.
- Purpose: Skills whose chat response IS the output — no file written, no preamble.
- Examples: `skills/meta-prompting/SKILL.md`, `skills/consult-the-expert/SKILL.md`, `skills/report-to-the-owner/SKILL.md`, `skills/brief-the-implementer/SKILL.md`
- Pattern: "Output format" section explicitly states "no preamble, no closing remark. The response IS the deliverable."
- Purpose: Skills that dispatch parallel subagents, wait for disk artifacts, and synthesize a final document. Never read source code directly.
- Examples: `skills/afk-exploration/SKILL.md`, `skills/derive-spec/SKILL.md`
- Pattern: Numbered workflow phases; subagent briefs defined in-skill; file-on-disk as the only completion signal; reply from subagent is acknowledgment only.
- Purpose: Methodology document too detailed or reusable to embed inline. Passed to subagents as an absolute path.
- Examples: `skills/afk-exploration/references/pre-mortem-analysis.md`, `skills/the-librarian/references/stock.md`
- Pattern: Plain Markdown; loaded by subagents, never by the orchestrator itself.
## Entry Points
- Location: `description` field in each `skills/<skill-name>/SKILL.md`
- Triggers: Pattern-matched by the `skills` CLI / agent harness against user intent.
- Responsibilities: Route the user's session to the correct skill.
- Location: `.claude-plugin/marketplace.json`
- Triggers: `npx skills add` or `npx skills list`.
- Responsibilities: Declare skill paths and the plugin display group (`JeisKappa Skills`).
- Location: `AGENTS.md` (symlinked as `CLAUDE.md`)
- Triggers: Loaded at the start of every agent session in this repo.
- Responsibilities: Enforce commit conventions, skill file format, and repo maintenance rules.
## Architectural Constraints
- **No build pipeline:** There is no compilation, bundling, linting, or test runner. The repo is a content repository; "deployment" is `npx skills add`.
- **No inter-skill dependencies at runtime:** Skills do not import or call each other. Each `SKILL.md` is completely standalone.
- **Orchestrator context isolation:** Orchestrator skills (`afk-exploration`, `derive-spec`) must never read source files inline — all reads go through subagents. This is a documented discipline constraint enforced by the skill itself, not tooling.
- **Single-file per skill:** Each skill is exactly one `SKILL.md`. No skill spans multiple files except via the `references/` pattern.
- **name field must match directory name:** The `name:` YAML field and the `skills/<name>/` directory name must be identical. Mismatch breaks the CLI install.
- **Marketplace registration is manual:** Adding a skill requires manually updating `.claude-plugin/marketplace.json`, `README.md`, and `.vscode/settings.json`. There is no automation.
## Anti-Patterns
### Embedding method docs in the skill body when they belong in references
### Having the orchestrator read subagent replies as content
### Omitting "no preamble" from deliverable skill output sections
## Error Handling
- Mismatched `name` field → CLI install fails silently or routes to wrong skill. Caught by human review.
- Missing marketplace entry → Skill not visible in `npx skills list`. Caught by following the "When adding a new skill" checklist in `AGENTS.md`.
- Orchestrator reading source inline → Context pollution and potential hallucination in orchestrator skills. Prevented by the explicit discipline constraint in `afk-exploration` and `derive-spec` skill bodies.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
