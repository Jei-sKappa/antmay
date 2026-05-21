# Phase 1: Foundations - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning
**Mode:** Auto (smart-discuss batched — pure-infrastructure phase with low-stakes documentation choices)

<domain>
## Phase Boundary

Lay the thread storage contract every other V1 skill depends on: a canonical, single-source-of-truth reference set describing the V1 thread folder layout, artifact filename grammars (record + versioned forms), immutability rules, and reference-resolution behavior, plus the registration baseline (`docs/threads/**/.wip/` gitignore rule, `JeisKappa-workflow` marketplace plugin entry) so subsequent phases can write skills that cite this contract without re-defining anything.

**In scope (Phase 1):**
- A canonical V1 workflow reference doc set under `docs/workflow/v1/`
- `.gitignore` update for `docs/threads/**/.wip/`
- Empty `JeisKappa-workflow` plugin entry in `.claude-plugin/marketplace.json`
- Short pointer section in `AGENTS.md` so agents discover the canonical reference
- `README.md` does NOT change in Phase 1 (full README hybrid lands in Phase 7)
- `.vscode/settings.json` `conventionalCommits.scopes` does NOT change in Phase 1 (entries land when each new skill folder ships)

**Out of scope (Phase 1):**
- Any new `SKILL.md` (no V1 spine skills authored here)
- Migration of the existing `docs/threads/260520095223Z-agentic-workflow/` thread (already conforms — `discussions/` folder + `260518200115Z-agentic-workflow-design-discussion.md` matches the record grammar)
- README hybrid (Phase 7)
- Replacement/retirement of `discussion-loop` or `review-decision-document` (Phases 2 / 6)

</domain>

<decisions>
## Implementation Decisions

### Canonical Reference Doc Location
- The single source of truth lives at `docs/workflow/v1/` — visible (committed `docs/` already exists in the repo), parallel to `docs/threads/`, and clearly tagged as V1-versioned.
- Future-proof: a future V2 set of rules can live at `docs/workflow/v2/` without disturbing V1 readers.

### Canonical Reference Doc Organization
- Multi-file, one concept per file, with an index:
  - `docs/workflow/v1/README.md` — short index linking to each rules doc and naming the entry points
  - `docs/workflow/v1/thread-layout.md` — V1 thread root path + V1 folder set [D7, D107]
  - `docs/workflow/v1/filename-grammar.md` — record + versioned grammars, mandatory artifact-type suffix, target-version semantics, N starting at 1 [D11, D12, D42, D43, D46, D47]
  - `docs/workflow/v1/immutability.md` — emitted artifacts immutable, drafts editable until emission, no source-relation frontmatter, ambiguous references resolved by asking [D39, D40, D41, D44, D49]
- Rationale: focused files are easier to link from a skill body's "Reference" line; an index keeps discoverability without forcing a single 400-line file.

### V1 Skill Rule Reuse Convention
- Every future V1 spine skill body inlines a one-sentence summary of the relevant rule AND links to the canonical doc (e.g. "Writes a record-form artifact `<UTC>-<kebab-desc>-<artifact-type>.md` per `docs/workflow/v1/filename-grammar.md`.").
- This preserves the existing "self-contained skill" pattern while keeping the source of truth singular.

### Registration Baseline
- `.claude-plugin/marketplace.json` gains a second plugin entry `JeisKappa-workflow` with an empty `skills` array. Subsequent phases append to it.
- `.vscode/settings.json` is NOT changed in Phase 1 — `conventionalCommits.scopes` is populated when each new skill folder ships in later phases.
- `.gitignore` gains `docs/threads/**/.wip/` at the repo root.

### Agent Discoverability
- `AGENTS.md` (and therefore `CLAUDE.md` via symlink) gains a short "V1 Workflow Conventions" section that points to `docs/workflow/v1/README.md` as the canonical entry point. No duplication of rules — just a pointer.

### Existing Thread Migration
- No migration. The existing `docs/threads/260520095223Z-agentic-workflow/` thread already conforms (`discussions/<UTC>-<desc>-discussion.md`). Other V1 folders (`proposals/`, `specs/`, etc.) are not created proactively — they appear when an artifact lands there. The canonical doc explicitly states folders are created on-demand.

### Filename Grammar Concrete Specification (codified in `filename-grammar.md`)
- UTC stamp prefix grammar: `YYMMDDHHMMSSZ` (12-character, no separators) — matches existing repo pattern.
- Record form: `<UTC>-<kebab-desc>-<artifact-type>.md`. `artifact-type` MUST appear (e.g. `discussion`, `decision-log`, `inbox-item`, `review-finding`). Examples and a list of recognized artifact-type tokens are part of the doc.
- Versioned form: `<UTC>-v<N>[-<kebab-descriptor>]-<artifact-type>.md`. `N` starts at 1. `<descriptor>` distinguishes candidate / variant from the mainline integer-only file. Artifact-type token mandatory.
- Recognized artifact-type tokens for V1 (documented but not exhaustive): `proposal`, `spec`, `plan`, `discussion`, `decision-log`, `inbox-item`, `review-finding`.

### Immutability + Resolution Concrete Specification (codified in `immutability.md`)
- Emitted versioned artifacts and record artifacts are NEVER edited after emission. New version (next integer or descriptor) or a new record is produced instead.
- Drafts live under `.wip/` and remain editable until emitted.
- No `Supersedes:`, `Alternative to:`, `Forked from:`, or any source-relation frontmatter. Lineage lives in filenames only.
- No global "latest artifact" algorithm. Each skill resolves ambiguous inputs by asking the user.

### Claude's Discretion
- Exact wording, doc length, and example artifact filenames inside each reference doc are at Claude's discretion during plan/execute. Plan must verify each doc covers the corresponding decision IDs from PROJECT.md / REQUIREMENTS.md.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.planning/codebase/CONVENTIONS.md` and `STRUCTURE.md` already describe repo-level patterns — the new `docs/workflow/v1/` docs SHOULD be written in a similar voice and section style for consistency.
- `skills/<skill-name>/references/*.md` pattern already exists (`afk-exploration/references/`, `the-librarian/references/`) — confirms multi-file reference docs are an accepted shape in this repo.
- `.claude-plugin/marketplace.json` currently has one plugin (`JeisKappa-skills`); Phase 1 adds a second alongside it.
- `AGENTS.md` already lists per-skill rules and is the natural place to point agents at the new canonical doc.

### Established Patterns
- Markdown-only repo. No build, no tests, no lint. Validation is editorial.
- Repository conventions live under `.planning/codebase/` (analysis) and `AGENTS.md` / `CLAUDE.md` (rules). The new workflow reference docs are a sibling concept: rules for the V1 workflow specifically.
- Kebab-case for files and directories.
- UTC timestamps in filenames use `YYMMDDHHMMSSZ` (no separators) — consistent across existing threads and seed materials.

### Integration Points
- `.gitignore` at repo root — add the WIP rule there.
- `.claude-plugin/marketplace.json` — add the second plugin entry, preserving the existing `JeisKappa-skills` plugin unchanged.
- `AGENTS.md` — add the short "V1 Workflow Conventions" pointer section near the top (after "Project" or before "Commits").
- `docs/` already contains `threads/` — adding `docs/workflow/v1/` slots in cleanly.

</code_context>

<specifics>
## Specific Ideas

- The V1 thread folder set in the canonical doc MUST exactly match D107 (no `reviews/`, `verifications/`, `merges/`, `adrs/`).
- Each rules doc should open with the bracketed D-IDs it codifies (e.g. `**Codifies:** D7, D107`) — gives downstream readers a trail back to the source decision log.
- The reference docs should be short and dense. Aim for ~50–100 lines each, not a 400-line monolith.
- Examples in each doc should use realistic filenames (UTC, kebab description, artifact-type) so authors of subsequent V1 skills can copy-paste-adapt.

</specifics>

<deferred>
## Deferred Ideas

- README hybrid (toolbox model + layered workflow map + recommended paths + module catalog) — Phase 7 [D34, D109]
- V1 skill catalog grouping under the `JeisKappa-workflow` plugin — added per-phase as skills land, finalized in Phase 7 [D110]
- Cross-thread index — out of scope V1 [D13]
- Per-thread `README.md` / `STATE.md` — out of scope V1 [D15]
- Generated cross-thread index — deferred to V2 if needed [D13]

</deferred>
