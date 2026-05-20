<!-- refreshed: 2026-05-20 -->
# Architecture

**Analysis Date:** 2026-05-20

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     Distribution Layer                               │
│   skills.sh registry + `npx skills add Jei-sKappa/skills --skill X` │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ installs
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Skill Units                                   │
│  `skills/<skill-name>/SKILL.md`  (one directory per skill)          │
│                                                                      │
│  Deliverable Skills         │  Orchestrator Skills                  │
│  (response IS the output)   │  (spawn + coordinate subagents)       │
│                             │                                        │
│  meta-prompting             │  afk-exploration                      │
│  consult-the-expert         │  derive-spec                          │
│  report-to-the-owner        │                                        │
│  brief-the-implementer      │                                        │
│                             │                                        │
│  Interactive Skills         │  Review Skills                        │
│  (stateful decision loop)   │  (read + validate, no edits)          │
│                             │                                        │
│  discussion-loop            │  review-decision-document             │
│                             │                                        │
│  Router Skills              │                                        │
│  (read reference → dispatch)│                                        │
│                             │                                        │
│  the-librarian              │                                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ uses
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Reference Files                                 │
│  `skills/<skill-name>/references/*.md`                              │
│  (method documents read by critique/prototype subagents)            │
└─────────────────────────────────────────────────────────────────────┘
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

**Overall:** Content repository — no build pipeline, no runtime, no test suite. The unit of architecture is the skill document, not a module or class.

**Key Characteristics:**
- Each skill is a standalone Markdown file with YAML frontmatter; no inter-skill imports or shared runtime.
- Validation is editorial: a human (or reviewing agent) reads the skill and confirms instructions are coherent.
- Distribution is via `npx skills add`; the marketplace registry (`marketplace.json`) controls grouping in `npx skills list`.
- Skills are versioned in their own frontmatter (`metadata.version`), not through the repo's git tags.

## Layers

**Frontmatter layer:**
- Purpose: Machine-readable identity consumed by the `skills` CLI harness.
- Location: Top of every `skills/<skill-name>/SKILL.md`
- Contains: `name` (kebab-case, matches directory), `description` (trigger sentence for harness matching), `metadata.author`, `metadata.version` (semver).
- Depends on: Nothing — self-contained.
- Used by: `npx skills` CLI during install and listing.

**Skill body layer:**
- Purpose: Human and agent instructions for how to execute the skill.
- Location: Body of `skills/<skill-name>/SKILL.md` (after frontmatter).
- Contains: Tone, structure, workflow phases, subagent briefs, constraints.
- Depends on: Optionally, `references/*.md` files in the same skill directory.
- Used by: The AI agent session that invokes the skill.

**Reference layer:**
- Purpose: Reusable methodology documents too long or too specialized to embed in the main skill body. Loaded by dispatched subagents, not by the orchestrator.
- Location: `skills/afk-exploration/references/` and `skills/the-librarian/references/`
- Contains: `pre-mortem-analysis.md`, `red-team-adversarial.md`, `socratic-questioning.md`, `throwaway-prototyping.md` (afk-exploration); `stock.md`, `consult.md`, `research.md` (the-librarian).
- Depends on: Nothing.
- Used by: Critique and prototype subagents dispatched by `afk-exploration`; flow subagents dispatched by `the-librarian`.

**Registry layer:**
- Purpose: Plugin manifest so the `skills.sh` marketplace groups this repo's skills under a named heading.
- Location: `.claude-plugin/marketplace.json`
- Contains: Plugin `name` (display-name encoded in dash-separated segments), `source`, `skills` array of relative paths.
- Depends on: Each entry must have a matching `skills/<skill-name>/` directory on disk.
- Used by: `npx skills` CLI during install listing.

## Data Flow

### Skill installation

1. User runs `npx skills add Jei-sKappa/skills --skill <name>`.
2. CLI reads `.claude-plugin/marketplace.json` to locate `./skills/<name>`.
3. CLI reads `skills/<name>/SKILL.md` and installs it into the user's agent harness.

### Skill invocation (deliverable skills)

1. User session matches trigger in `description` frontmatter field.
2. Agent reads `SKILL.md` body (Tone, Structure, Guidelines, Output format, Workflow).
3. Agent produces the deliverable directly as its chat response — no file output, no preamble.

### Skill invocation (orchestrator skills: afk-exploration, derive-spec)

1. Agent receives request and becomes orchestrator.
2. Orchestrator reads its own `SKILL.md` (never the source codebase or subagents' outputs directly at invocation time).
3. Orchestrator dispatches subagents in numbered phases; subagents write files to disk under a run folder.
4. Subagents load reference files from `skills/<skill-name>/references/` by absolute path passed in their brief.
5. Orchestrator reads files from disk (not from subagent replies) and produces the final document.

### Skill invocation (router skill: the-librarian)

1. Agent reads request intent (stock / consult / research).
2. Agent reads the corresponding reference file from `skills/the-librarian/references/`.
3. Agent executes the referenced flow.

### Skill invocation (interactive skill: discussion-loop)

1. Agent receives a set of discussion points.
2. Agent creates a decision log file at `docs/discussions/YYYY-MM-DD-<topic>-<purpose>-discussion.md`.
3. Agent walks points one-at-a-time, appends each decision to the log after user confirms.

**State management:**
- No in-process state. Orchestrator skills persist state on disk (run folders, `.metadata.json`, note files). Interactive skills persist state in a log file under `docs/discussions/`. All other skills are stateless.

## Key Abstractions

**Skill unit:**
- Purpose: An atomic, self-contained agent instruction set. Installed independently; invoked by trigger description.
- Examples: `skills/consult-the-expert/SKILL.md`, `skills/afk-exploration/SKILL.md`
- Pattern: YAML frontmatter block followed by a Markdown body. No imports.

**Deliverable skill:**
- Purpose: Skills whose chat response IS the output — no file written, no preamble.
- Examples: `skills/meta-prompting/SKILL.md`, `skills/consult-the-expert/SKILL.md`, `skills/report-to-the-owner/SKILL.md`, `skills/brief-the-implementer/SKILL.md`
- Pattern: "Output format" section explicitly states "no preamble, no closing remark. The response IS the deliverable."

**Orchestrator skill:**
- Purpose: Skills that dispatch parallel subagents, wait for disk artifacts, and synthesize a final document. Never read source code directly.
- Examples: `skills/afk-exploration/SKILL.md`, `skills/derive-spec/SKILL.md`
- Pattern: Numbered workflow phases; subagent briefs defined in-skill; file-on-disk as the only completion signal; reply from subagent is acknowledgment only.

**Reference file:**
- Purpose: Methodology document too detailed or reusable to embed inline. Passed to subagents as an absolute path.
- Examples: `skills/afk-exploration/references/pre-mortem-analysis.md`, `skills/the-librarian/references/stock.md`
- Pattern: Plain Markdown; loaded by subagents, never by the orchestrator itself.

## Entry Points

**Skill harness trigger:**
- Location: `description` field in each `skills/<skill-name>/SKILL.md`
- Triggers: Pattern-matched by the `skills` CLI / agent harness against user intent.
- Responsibilities: Route the user's session to the correct skill.

**Marketplace manifest:**
- Location: `.claude-plugin/marketplace.json`
- Triggers: `npx skills add` or `npx skills list`.
- Responsibilities: Declare skill paths and the plugin display group (`JeisKappa Skills`).

**Agent guidance:**
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

**What happens:** A long methodology (pre-mortem, red-team, prototyping guide) is written inline in the skill body instead of in a `references/` file.
**Why it's wrong:** Orchestrator skills pass reference paths to subagents; if the method is inline, the subagent cannot receive it as a file path. It also bloats the skill body, making the orchestration logic harder to follow.
**Do this instead:** Put long methodology documents in `skills/<skill-name>/references/<method>.md` and pass the absolute path in the subagent's brief. See `skills/afk-exploration/references/` for the pattern.

### Having the orchestrator read subagent replies as content

**What happens:** An orchestrator skill reads the text the subagent returns in its reply rather than reading the file the subagent wrote to disk.
**Why it's wrong:** Bypasses the file-on-disk handoff that keeps the orchestrator's context clean. A missing file is silently treated as successful, allowing half-complete runs to proceed.
**Do this instead:** Treat subagent replies as acknowledgment only. Verify the expected file exists on disk after each subagent returns. Re-spawn if the file is missing. See `skills/derive-spec/SKILL.md` Phase 3 and Phase 4 for the canonical pattern.

### Omitting "no preamble" from deliverable skill output sections

**What happens:** A deliverable skill does not explicitly forbid chat framing, so a fresh model session wraps the deliverable in "Sure, here is…" or "Hope this helps."
**Why it's wrong:** The deliverable is meant to be copy-pasted or handed off. Chat framing pollutes it.
**Do this instead:** Include an explicit statement in the `Output format` or `Tone` section: "No preamble, no chat framing, no closing remark. The response IS the deliverable." See `skills/consult-the-expert/SKILL.md` for the pattern.

## Error Handling

**Strategy:** No runtime errors exist — the repo has no executable code. "Errors" are editorial failures: missing fields, mismatched names, skills not registered in the marketplace, or skill instructions that are ambiguous.

**Patterns:**
- Mismatched `name` field → CLI install fails silently or routes to wrong skill. Caught by human review.
- Missing marketplace entry → Skill not visible in `npx skills list`. Caught by following the "When adding a new skill" checklist in `AGENTS.md`.
- Orchestrator reading source inline → Context pollution and potential hallucination in orchestrator skills. Prevented by the explicit discipline constraint in `afk-exploration` and `derive-spec` skill bodies.

## Cross-Cutting Concerns

**Versioning:** Each skill carries its own semver in `metadata.version` frontmatter. Bump on any meaningful behavior change.
**Commit conventions:** Conventional Commits with per-skill scopes defined in `.vscode/settings.json`. Repo-wide changes omit the scope.
**Documentation:** `README.md` is the human-readable index. `AGENTS.md` is the agent-session guide. Both must be kept in sync with the skills on disk.

---

*Architecture analysis: 2026-05-20*
