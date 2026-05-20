# External Integrations

**Analysis Date:** 2026-05-20

## APIs & External Services

**Web Search (optional):**
- Brave Search API — used by GSD `websearch` command to search the web during research phases
  - SDK/Client: Node.js native `fetch` in `.claude/get-shit-done/bin/lib/commands.cjs` (line ~516)
  - Endpoint: `https://api.search.brave.com/res/v1/web/search`
  - Auth: `BRAVE_API_KEY` environment variable (or `~/.gsd/brave_api_key` file)
  - Status: disabled in this project (`.planning/config.json` → `"brave_search": false`)

**Package Registry:**
- npm registry — checked for GSD update version via `npm view get-shit-done-cc version`
  - Called by: `.claude/hooks/gsd-check-update-worker.js` at session start
  - Package: `get-shit-done-cc` (hardcoded constant, not parameterised)
  - No auth required; public registry read only

**AI Model Providers (via Claude Code runtime — not called directly by this repo):**
- Anthropic (Claude): `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`
- OpenAI (Codex runtime): `gpt-5.4`, `gpt-5.3-codex`, `gpt-5.4-mini`
- Google (Gemini runtime): `gemini-3-pro`, `gemini-3-flash`, `gemini-2.5-flash-lite`
- Alibaba (Qwen runtime): `qwen3-max-2026-01-23`, `qwen3-coder-plus`, `qwen3-coder-next`
- Model selection catalog: `.claude/get-shit-done/bin/shared/model-catalog.json`
- Model dispatch handled by GSD tooling (`gsd-tools.cjs resolve-model`), not by this repo directly

## Data Storage

**Databases:**
- None — this is a content repository with no database layer

**File Storage:**
- Local filesystem only
  - Skills content: `skills/*/SKILL.md`
  - Library of cloned reference repos: `.library/` (gitignored)
  - GSD planning state: `.planning/`
  - Temporary work: `temp/` (gitignored)

**Caching:**
- GSD update-check cache: `~/.cache/gsd/gsd-update-check.json` (tool-agnostic, written by `.claude/hooks/gsd-check-update-worker.js`)
- Context metrics bridge: `/tmp/claude-ctx-{session_id}.json` (written by statusline hook, read by context monitor hook)

## Authentication & Identity

**Auth Provider:**
- None — no user authentication in this repo
- API keys for external services (Brave Search) are read from environment variable `BRAVE_API_KEY` or `~/.gsd/brave_api_key` file
- AI model auth is handled transparently by the Claude Code / Codex / Gemini / OpenCode runtime environments

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- GSD hooks write to stdout/stderr (captured by Claude Code hook system)
- Context utilisation warnings are injected as `additionalContext` by `.claude/hooks/gsd-context-monitor.js` when remaining context drops below 35% (warning) or 25% (critical)
- GSD update check results are written to `~/.cache/gsd/gsd-update-check.json` and surfaced via status-line

## CI/CD & Deployment

**Hosting:**
- GitHub — source repository at `https://github.com/Jei-sKappa/skills`
- skills.sh — public index/badge host, reads from GitHub

**CI Pipeline:**
- None — no automated tests, no CI configuration files detected

**Distribution:**
- `vercel-labs/skills` CLI reads `.claude-plugin/marketplace.json` to discover skill folders
- End users install via: `npx skills add Jei-sKappa/skills --skill <skill-name>`

## Environment Configuration

**Required env vars:**
- None are strictly required for core skill content delivery

**Optional env vars used by GSD tooling:**
- `BRAVE_API_KEY` — enables Brave web search (disabled in `.planning/config.json`)
- `CLAUDE_CONFIG_DIR` — override default config directory (for multi-account setups)
- `GSD_MODEL_CATALOG` — override path to `model-catalog.json`

**Secrets location:**
- No secrets stored in the repository
- API keys are read from environment variables or user-local files (`~/.gsd/brave_api_key`)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None — no webhook emission in this repo

---

*Integration audit: 2026-05-20*
