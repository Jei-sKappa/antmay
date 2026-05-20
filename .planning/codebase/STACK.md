# Technology Stack

**Analysis Date:** 2026-05-20

## Languages

**Primary:**
- Markdown (YAML frontmatter + body) - All skill definitions under `skills/*/SKILL.md`

**Secondary:**
- JavaScript (CommonJS, Node.js) - GSD workflow tooling under `.claude/get-shit-done/bin/` and `.claude/hooks/`
- Bash - GSD lifecycle hooks under `.claude/hooks/*.sh` and `.claude/get-shit-done/bin/`
- JSON - Configuration files (`marketplace.json`, `model-catalog.json`, `config.json`, `settings.json`)

## Runtime

**Environment:**
- Node.js v26 (detected on dev machine via `/opt/homebrew/bin/node`)

**Package Manager:**
- npm 11.12.1
- No `package.json` or lockfile at the repo root — this is a content repository with no installable dependencies
- A minimal `.claude/package.json` exists solely to declare `{"type":"commonjs"}` for the GSD tooling

## Frameworks

**Core:**
- None — the primary content is plain Markdown; no application framework is used

**Skill Distribution Platform:**
- `vercel-labs/skills` CLI — skills are installed by end users via `npx skills add Jei-sKappa/skills --skill <name>`
- `skills.sh` — public index/badge host at `https://skills.sh/Jei-sKappa/skills`

**Workflow Tooling (GSD — "Get Shit Done"):**
- `get-shit-done-cc` npm package version `1.42.3` — provides Claude Code slash-commands, agents, hooks, and CLI utilities
- Installed under `.claude/get-shit-done/` (project-scoped install)
- Node.js CommonJS modules in `.claude/get-shit-done/bin/lib/*.cjs`

**Build/Dev:**
- No build pipeline — content repository
- VSCode `Conventional Commits` extension (configured via `.vscode/settings.json`) for structured commit messages

## Key Dependencies

**Critical:**
- `get-shit-done-cc` v1.42.3 — the entire Claude Code workflow layer (commands, agents, hooks, CLI)
  - Entry: `.claude/get-shit-done/bin/gsd-tools.cjs`
  - Hooks runtime: `.claude/hooks/*.js` and `.claude/hooks/*.sh`

**Infrastructure:**
- Node.js standard library (`fs`, `path`, `os`, `child_process`) — used throughout GSD hooks and bin scripts; no third-party npm dependencies in the hooks themselves

## Configuration

**Environment:**
- No `.env` files — environment variables are passed at runtime
- Key optional vars used by GSD tooling:
  - `BRAVE_API_KEY` — enables Brave web search (currently `false` in `.planning/config.json`)
  - `CLAUDE_CONFIG_DIR` — override for multi-account Claude setups
  - `GSD_MODEL_CATALOG` — override path for model catalog JSON
  - `GSD_CACHE_FILE`, `GSD_PROJECT_VERSION_FILE`, `GSD_GLOBAL_VERSION_FILE` — update-check cache paths

**GSD Project Config:**
- `.planning/config.json` — project-level GSD settings (model profile: `quality`, branching strategy: `none`, brave search: `false`, firecrawl: `false`, exa search: `false`)

**Build:**
- `.vscode/settings.json` — conventional commit scopes (one entry per skill directory, kept sorted)
- `.claude/settings.json` — Claude Code hook registrations (SessionStart, PreToolUse, PostToolUse)

**Plugin Registry:**
- `.claude-plugin/marketplace.json` — registers this repo as a `vercel-labs/skills` plugin named `JeisKappa-skills`; lists all nine skill folders

## Platform Requirements

**Development:**
- Node.js (v26+ observed on dev machine; no `.nvmrc` or `.node-version` present)
- npm (for `npx skills` install command used by consumers)
- macOS (developer machine is darwin 25.4.0; no Windows-specific tooling in repo root)
- Claude Code (for GSD slash-commands and agent hooks)

**Production:**
- Content is distributed via GitHub; no server deployment
- End-user installs skills locally via `npx skills add Jei-sKappa/skills --skill <name>`

---

*Stack analysis: 2026-05-20*
