# Codebase Structure

**Analysis Date:** 2026-05-20

## Directory Layout

```
skills/                             # Root of the repo
├── skills/                         # All skill units live here
│   ├── afk-exploration/            # AFK research orchestrator skill
│   │   ├── SKILL.md                # Skill instructions
│   │   └── references/             # Methodology docs for subagents
│   │       ├── pre-mortem-analysis.md
│   │       ├── red-team-adversarial.md
│   │       ├── socratic-questioning.md
│   │       └── throwaway-prototyping.md
│   ├── brief-the-implementer/      # Deliverable: handoff briefing
│   │   └── SKILL.md
│   ├── consult-the-expert/         # Deliverable: expert consultation message
│   │   └── SKILL.md
│   ├── derive-spec/                # Orchestrator: extract spec from codebase
│   │   └── SKILL.md
│   ├── discussion-loop/            # Interactive: decision log loop
│   │   └── SKILL.md
│   ├── meta-prompting/             # Deliverable: prompt refinement
│   │   └── SKILL.md
│   ├── report-to-the-owner/        # Deliverable: code owner blocker message
│   │   └── SKILL.md
│   ├── review-decision-document/   # Review: stress-test decision docs
│   │   └── SKILL.md
│   └── the-librarian/              # Router: reference repo management
│       ├── SKILL.md
│       └── references/
│           ├── consult.md
│           ├── research.md
│           └── stock.md
├── .claude-plugin/
│   └── marketplace.json            # Plugin registry for npx skills list
├── .planning/                      # GSD planning artifacts (not committed: threads/)
│   ├── codebase/                   # Codebase map documents (this directory)
│   ├── config.json                 # GSD configuration
│   └── threads/                    # Session threads (gitignored)
├── .library/                       # Local reference repos (gitignored)
│   ├── sources/
│   └── reports/
├── .vscode/
│   └── settings.json               # Conventional commit scopes per skill
├── docs/                           # Runtime outputs (discussion logs, afk runs, derive-spec runs)
│   ├── discussions/                # Created by discussion-loop skill
│   └── afk-exploration/            # Created by afk-exploration skill
│   └── derive-spec/                # Created by derive-spec skill
├── AGENTS.md                       # Agent guidance (symlinked as CLAUDE.md)
├── CLAUDE.md -> AGENTS.md          # Symlink — do not edit directly
├── README.md                       # Human index of all skills + install commands
└── LICENSE
```

## Directory Purposes

**`skills/`:**
- Purpose: Contains all published skill units. Each subdirectory is one skill.
- Contains: One directory per skill; directory name must match the `name:` frontmatter field.
- Key files: `skills/<skill-name>/SKILL.md` (the skill itself)

**`skills/<skill-name>/references/`:**
- Purpose: Methodology documents that are too long or reusable to embed in the skill body. Loaded by subagents at an absolute path — never by the orchestrator inline.
- Contains: Plain Markdown method guides.
- Key files: `pre-mortem-analysis.md`, `red-team-adversarial.md`, `socratic-questioning.md`, `throwaway-prototyping.md` (afk-exploration); `stock.md`, `consult.md`, `research.md` (the-librarian).

**`.claude-plugin/`:**
- Purpose: Registers this repo as a marketplace plugin for `npx skills list`.
- Contains: `marketplace.json` — the only file in this directory.
- Key constraint: Every skill folder in `skills/` must be listed in `marketplace.json`; the `name` field controls the display group heading.

**`.planning/codebase/`:**
- Purpose: GSD codebase-mapping artifacts. Written by `/gsd:map-codebase` and consumed by `/gsd:plan-phase` and `/gsd:execute-phase`.
- Contains: `ARCHITECTURE.md`, `STRUCTURE.md`, `STACK.md`, `INTEGRATIONS.md`, `CONVENTIONS.md`, `TESTING.md`, `CONCERNS.md` (whichever have been generated).
- Committed: Yes.

**`docs/`:**
- Purpose: Runtime output from skills that produce persistent artifacts. Grows during normal use.
- Contains: `discussions/` (decision logs from `discussion-loop`), `afk-exploration/` (research run folders), `derive-spec/` (spec run folders).
- Committed: Yes — these are durable research and decision artifacts.

**`.library/`:**
- Purpose: Local reference repository store managed by `the-librarian` skill.
- Contains: `sources/` (cloned repos), `reports/` (research reports).
- Committed: No — gitignored.

**`temp/`:**
- Purpose: Scratch space for transient work.
- Committed: No — gitignored.

**`.claude/`, `.codex/`, `.cursor/`:**
- Purpose: Agent harness configuration (GSD commands, agent definitions, hooks).
- Committed: No — gitignored.

## Key File Locations

**Entry Points:**
- `AGENTS.md`: Agent session rules — always loaded by agent harnesses in this repo. Defines layout, format, commit convention, and the checklist for adding skills.
- `CLAUDE.md`: Symlink to `AGENTS.md`. Do not edit directly.
- `README.md`: Human-readable skill index. Must be kept in sync with `skills/` contents.
- `.claude-plugin/marketplace.json`: CLI plugin manifest. Must list every skill in `skills/`.

**Skill definitions:**
- `skills/<skill-name>/SKILL.md`: The skill itself. One per skill directory.
- `skills/afk-exploration/references/`: Four methodology docs for afk-exploration subagents.
- `skills/the-librarian/references/`: Three flow docs for librarian subagents.

**Configuration:**
- `.vscode/settings.json`: `conventionalCommits.scopes` array — must include every skill's folder name, sorted alphabetically.
- `.planning/config.json`: GSD configuration.

## Naming Conventions

**Skill directories:**
- Pattern: kebab-case, matching the `name:` frontmatter field exactly.
- Examples: `afk-exploration`, `brief-the-implementer`, `the-librarian`

**SKILL.md files:**
- Pattern: Always `SKILL.md` — uppercase, no variation.
- One per skill directory; never split across multiple files.

**Reference files:**
- Pattern: kebab-case with descriptive names.
- Examples: `pre-mortem-analysis.md`, `socratic-questioning.md`, `stock.md`

**Runtime output folders (created by skills):**
- `docs/discussions/YYYY-MM-DD-<topic>-<purpose>-discussion.md` — discussion-loop.
- `docs/afk-exploration/<topic-slug>/<YYYY-MM-DD_NN>/` — afk-exploration run folders.
- `docs/derive-spec/<YYYY-MM-DD_NN>/` — derive-spec run folders.

**Commits:**
- Skill-scoped: `feat(brief-the-implementer): …`, `fix(consult-the-expert): …`
- Repo-wide: `chore: …`, `docs: …`, `feat: …` (no scope)

## Where to Add New Code

**New skill:**
1. Create `skills/<skill-name>/SKILL.md` — follow the frontmatter format in `skills/consult-the-expert/SKILL.md` as the canonical example.
2. If the skill uses methodology reference docs, create `skills/<skill-name>/references/<method>.md`.
3. Add a section to `README.md` under "Available skills" with the one-line description and `npx skills add` snippet.
4. Add `"./skills/<skill-name>"` to the `skills` array in `.claude-plugin/marketplace.json` (default plugin: `JeisKappa-skills`).
5. Add `"<skill-name>"` to `conventionalCommits.scopes` in `.vscode/settings.json` (keep sorted alphabetically).

**New reference file for an existing skill:**
- Place at `skills/<skill-name>/references/<descriptive-name>.md`.
- Update the skill body to pass the new reference's absolute path in the relevant subagent brief.

**Updating an existing skill:**
- Edit `skills/<skill-name>/SKILL.md`.
- Bump `metadata.version` in the frontmatter.
- No changes to `marketplace.json`, `README.md`, or `.vscode/settings.json` needed unless the skill name or description changes.

## Special Directories

**`.claude-plugin/`:**
- Purpose: Marketplace plugin registration.
- Generated: No — manually maintained.
- Committed: Yes.

**`.library/`:**
- Purpose: Local reference repository cache managed by `the-librarian` skill.
- Generated: Yes — populated at runtime by the skill.
- Committed: No (gitignored).

**`temp/`:**
- Purpose: Transient scratch space.
- Generated: Yes.
- Committed: No (gitignored).

**`docs/`:**
- Purpose: Durable runtime artifacts from skills (discussion logs, research runs, spec runs).
- Generated: Yes — populated at runtime by skills.
- Committed: Yes — these are intentional outputs.

---

*Structure analysis: 2026-05-20*
