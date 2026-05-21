---
phase: 07-merge-finish-navigation-distribution
plan: 03
subsystem: distribution-surface
tags: [readme-hybrid, v1-distribution-surface, toolbox-model, layered-workflow-map, recommended-paths, per-module-catalog, dist-01, dist-02, dist-03, dist-05, v1-milestone-complete]

# Dependency graph
requires:
  - phase: 01-foundations
    provides: PROJECT.md Core Value statement (source for the Toolbox Model narrative); JeisKappa-workflow marketplace plugin name (Installation note references); docs/workflow/v1/README.md (Installation note pointer)
  - phase: 02-capture-discussion
    provides: capture-inbox + discussion + seeded-discussion entries surfaced in the Per-Module Catalog Capture & Discussion family
  - phase: 03-propose-spec
    provides: propose-{auto,interactive} + spec-{auto,interactive} entries surfaced in the Per-Module Catalog Propose and Spec families
  - phase: 04-plan-family
    provides: plan-{loose,strict}-{auto,interactive} + adjust-plan-granularity-{auto,interactive} entries surfaced in the Per-Module Catalog Plan family
  - phase: 05-implementation-family
    provides: implement-{auto,interactive} + implement-plan-{auto,interactive} + implement-plan-with-subagents-{auto,interactive} entries surfaced in the Per-Module Catalog Implement family
  - phase: 06-review-family
    provides: review-{proposal,spec,plan,implementation,code}-{auto,interactive} entries surfaced in the Per-Module Catalog Review family; verification-coverage note (D85) + the-fool delegation note (D88) preserved as Review module callouts
  - phase: 07-merge-finish-navigation-distribution (intra-phase)
    provides: Plans 07-01 (merge-artifacts-{auto,interactive}) + 07-02 (finish + whats-next) — sequential serialization; 07-03 depends on README state after 07-02 (40 Available skills entries) before REPLACING the simple-list with the hybrid layout
provides:
  - README.md (full hybrid redesign — simple-list "Available skills" REPLACED with 7-section hybrid layout: title + 1-sentence value statement; Toolbox Model; Layered Workflow Map; Recommended Common Paths; Skills by Module catalog with 9 module families covering all 33 V1 + 7 non-V1 skills; Retired skills subsection; Installation note documenting JeisKappa Workflow plugin grouping rendering)
  - DIST-01 (hybrid README layout) — COMPLETE
  - DIST-02 (plugin grouping renders JeisKappa Workflow) — COMPLETE
  - DIST-03 (per-skill installability via flat `npx skills add` commands) — COMPLETE
  - DIST-05 (every V1 skill description states interaction mode; no unsuffixed convenience aliases) — COMPLETE
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "V1 distribution surface — hybrid README layout (toolbox model + layered workflow map + recommended common paths + per-module catalog + retired skills + installation note) per D34, D109; REPLACES simple-list Available skills structure used through Phases 1–7 plan groups"
    - "Per-Module Catalog with 9 module families — Capture & Discussion / Propose / Spec / Plan / Implement / Review / Merge / Finish & Navigate / Other (non-V1); each skill entry has H4 heading linking to SKILL.md + description stating interaction mode + fenced install snippet"
    - "Interaction-mode discipline made visible in each catalog entry — explicit **Autonomous** / **Interactive** / **Single skill** / **Advisory** prefix anchors DIST-05 verifiability for downstream readers"
    - "Documentation notes integration — verification-coverage (D85) + the-fool delegation (D88) integrated as Review module callouts (verification near review-implementation-*; the-fool inside Review header AND as a Propose-module callout for early adversarial pass)"
    - "Skills-only V1 surface — no CLI/runtime in V1 per D1; the README is the canonical entry point and Installation note documents the JeisKappa Workflow plugin display rule (dashes split into spaces, segments capitalized)"

key-files:
  created:
    - .planning/phases/07-merge-finish-navigation-distribution/07-03-SUMMARY.md
  modified:
    - README.md

key-decisions:
  - "README title kept as `# Jei-sKappa's Skills` rather than promoted to `# Modular Agentic Workflow V1` — the repository is a personal skills collection that HOSTS the V1 workflow; the V1 framing is in the 1-sentence value statement and the Toolbox Model narrative. Promoting the title would imply the repo IS the workflow (it is not — the non-V1 skills under JeisKappa-skills predate V1 and remain installable independently)."
  - "Layered Workflow Map uses BOTH a markdown table AND an ASCII diagram — table is the canonical machine-readable form (each row names a layer + its members); ASCII diagram is the orientation aid (spine horizontal, overlays attaching from above). Belt-and-suspenders for readers with different preferences."
  - "Recommended Common Paths ships with 5 paths (the maximum permitted by the plan) rather than 3 — the canonical full workflow path explicitly names every skill in the spine including the subagent-driven implementation variant; the other 4 paths cover the practical entry points (bug fix, idea exploration, plan refinement, merge reconciliation). Each path is a one-liner."
  - "Interaction-mode prefix bolded in EVERY V1 catalog entry — **Autonomous** / **Interactive** / **Single skill** (for finish + capture-inbox + discussion + seeded-discussion) / **Advisory** (for whats-next). Makes DIST-05 visually scannable for a reader skimming the catalog. Anchored at the start of the description sentence so it lands before any other framing."
  - "the-fool delegation note placed BOTH as a Propose module callout (early adversarial pass on proposals/specs per CONTEXT.md `before the spec / plan / implementation phases`) AND inside the Review module header (alongside the verification-coverage note as paired V1 review-family caveats). Two placements maximize discoverability — a user exploring proposal authoring sees the note inline; a user exploring review skills sees both V1 review caveats together."
  - "Module family ordering follows the spine flow + cross-cutting overlays + Other at the end: Capture & Discussion (cross-cutting input layer) → Propose → Spec → Plan → Implement (spine forward order) → Review (cross-cutting overlay) → Merge (cross-cutting overlay) → Finish & Navigate (closure overlay) → Other (non-V1). This matches the Layered Workflow Map's reading order."
  - "Installation note documents BOTH plugin renderings (`JeisKappa Workflow` for V1; `JeisKappa Skills` for non-V1) explicitly — DIST-02 only requires the V1 rendering, but documenting both prevents reader confusion when they see two different group headings in `npx skills list`. Closes a discoverability gap that would otherwise rely on the user noticing the marketplace.json source."

patterns-established:
  - "V1 distribution-surface README pattern — title + 1-sentence value statement (substantive, not generic) + Toolbox Model narrative (composable, harness-agnostic, every spine phase optional, every artifact reviewable markdown, cross-cutting overlays) + Layered Workflow Map (table + ASCII; NO NFA/state-machine notation) + Recommended Common Paths (3–5 onboarding paths including the canonical full workflow) + Per-Module Catalog with 9 module families + Retired skills + Installation. Each catalog entry: H4 heading linking to SKILL.md + interaction-mode-prefixed description + fenced `npx skills add` snippet. Pattern is V1-final — any future V2 README evolution can build on this scaffold."
  - "Interaction-mode prefix convention — every V1 catalog entry opens its description with a bolded **Autonomous** / **Interactive** / **Single skill** / **Advisory** token before any other framing. Makes DIST-05 visually scannable AND survives partial reads (a reader skimming the first sentence still gets the mode). Pattern reusable for any future V1 skill catalog."
  - "Two-placement documentation-note pattern — when a V1 design decision subsumes what users might expect as a separate skill (verification, adversarial review), place the SHORT explanatory note at TWO discoverable locations: (a) inside the Review module family header where the affected siblings live, AND (b) as a callout near the upstream family where users might first ask 'where's the X skill?' (e.g., the-fool callout near Propose). Doubles discoverability without bloating the catalog."

requirements-completed: [DIST-01, DIST-02, DIST-03, DIST-05]

# Metrics
duration: 4min
completed: 2026-05-21
---

# Phase 07 Plan 03: README Hybrid Redesign Summary

**README.md fully redesigned with the V1 hybrid layout per DIST-01, D34, D109 — REPLACING the simple-list "Available skills" structure with the 7-section hybrid layout (title + 1-sentence value statement; Toolbox Model; Layered Workflow Map; Recommended Common Paths; Per-Module Catalog covering all 33 V1 workflow skills + 7 non-V1 skills across 9 module families; Retired Skills subsection; Installation note documenting JeisKappa Workflow plugin grouping rendering). DIST-01/02/03/05 acceptance criteria all met. PHASE 7 MILESTONE COMPLETE — V1 catalog fully shipped and discoverable.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-21T15:16:58Z
- **Completed:** 2026-05-21T15:20:36Z
- **Tasks:** 2 (1 modifying README.md + 1 verification-only)
- **Files modified:** 1 (README.md — full hybrid redesign)

## Accomplishments

- **`README.md`** redesigned end-to-end (~400 lines) — REPLACED the simple-list "Available skills" structure (which had grown to 40 entries through Phases 2–7) with the V1 hybrid layout in 7 sections:
  1. **Title + 1-sentence value statement.** Kept `# Jei-sKappa's Skills` as the H1 (the repo hosts but is not synonymous with the V1 workflow; non-V1 skills remain). The value-statement sentence below the H1 explicitly names the V1 workflow as the anchor: "A personal collection of refined `SKILL.md` files — anchored by the **Modular Agentic Workflow V1**, a composable, harness-agnostic, spec-driven toolbox that drives a feature end-to-end through reviewable Markdown artifacts on disk."
  2. **`## Toolbox Model`** — 5-sentence narrative drawing from PROJECT.md Core Value. Names V1 as a TOOLBOX (not CLI / runtime / state file); every spine phase OPTIONAL; spine = propose → spec → plan → implementation → finish; artifacts reviewable Markdown on disk under `docs/threads/<thread>/`; harness-agnostic (Claude Code, Codex, Gemini CLI, OpenCode); cross-cutting modules (discussion, review, merge, inbox, navigation) attach anywhere.
  3. **`## Layered Workflow Map`** — markdown table (Layer × Members) showing spine layer + 5 overlay layers (Discussion / Review / Merge / Inbox / Navigation) + ASCII diagram showing spine horizontal with overlay modules attaching from above. NO NFA/state-machine notation (V2 per D34). Both representations are plain-text-readable; no external image.
  4. **`## Recommended Common Paths`** — 5-row table with onboarding paths: full workflow (canonical, citing every spine + overlay skill), bug fix, idea exploration, plan refinement, merge reconciliation. Each path is a one-line skill sequence with arrows.
  5. **`## Skills by Module`** — Per-Module Catalog with 9 module families: Capture & Discussion (3 skills) / Propose (2) / Spec (2) / Plan (6) / Implement (6) / Review (10) / Merge (2) / Finish & Navigate (2) / Other non-V1 (7). Every catalog entry has: H4 heading linking to SKILL.md (`#### [\`<skill-name>\`](./skills/<skill-name>/SKILL.md)`), description sentence opening with bolded interaction-mode prefix (**Autonomous** / **Interactive** / **Single skill** / **Advisory**) per DIST-05, and fenced `npx skills add Jei-sKappa/skills --skill <name>` install snippet per DIST-03.
  6. **`## Retired skills`** — PRESERVED both existing bullets verbatim (`discussion-loop` retired 2026-05-21 → split into `discussion` + `seeded-discussion`; `review-decision-document` retired 2026-05-21 → evolved into `review-spec-auto` + `review-spec-interactive`). No rewriting; copied byte-for-byte from the pre-redesign README.
  7. **`## Installation`** — Generic `npx skills add Jei-sKappa/skills --skill <skill-name>` pattern + concrete example (`spec-auto`) + ONE-LINE note documenting plugin grouping rendering: `JeisKappa-workflow` renders as **`JeisKappa Workflow`** in `npx skills list` (dashes split into spaces, segments capitalized — per DIST-02); non-V1 stays under `JeisKappa-skills` rendering as **`JeisKappa Skills`**. Optional pointer to `docs/workflow/v1/README.md` for V1 reference docs.

- **Documentation notes from Phase 6 preserved AND placed for maximum discoverability:**
  - **verification-coverage note (Plan 06-04, D85)** — placed inside the Review module header as a 1-line blockquote, immediately findable by any reader exploring review skills.
  - **the-fool delegation note (Plan 06-05, D88)** — placed in TWO locations: (a) inside the Review module header alongside the verification-coverage note (the two V1 review-family caveats now sit together), AND (b) as a callout below the Propose family (where users encountering propose-* skills might ask "where's the adversarial-review skill?"). Two-placement pattern documented in `key-decisions` and `patterns-established`.

- **All 33 V1 workflow skill names + 7 non-V1 skill names present in the catalog** with their flat `npx skills add Jei-sKappa/skills --skill <name>` install snippets (verified by per-skill grep loop in Task 1 and Task 2 verifications; 40-row catalog confirmed via `grep -cE '^#### \[`' README.md`).

- **Task 2 (verification-only)** ran the full DIST-01/02/03/05 sanity check:
  - `JeisKappa-workflow` plugin = 33 skills (jq verified).
  - `JeisKappa-skills` plugin = 7 skills (jq verified).
  - `.vscode/settings.json` `conventionalCommits.scopes` = 40 entries (jq verified) and alphabetically sorted (`jq -e '."conventionalCommits.scopes" == (."conventionalCommits.scopes" | sort)'`).
  - All 33 V1 skills present in marketplace AND scopes (jq index loops, both pass).
  - `JeisKappa Workflow` literal phrase present in README.md (DIST-02 confirmed).
  - the-fool, verification-coverage, discussion-loop, review-decision-document all present (preservation confirmed).
  - NO nested install paths (`--skill ./skills/`), NO prefixed install paths (`--skill JeisKappa-workflow/`).
  - NO prohibited V2 notation (NFA / state machine / graphviz / finite automaton).

## Task Commits

Each task was committed atomically:

1. **Task 1: Redesign README.md with the hybrid layout** — `61756c1` (docs)
2. **Task 2: Verify DIST-01/02/03/05 satisfaction + Phase 7 completion sanity check** — verification-only, no file modifications, no commit.

**Plan metadata commit:** Pending after this SUMMARY is written.

## Files Created/Modified

- **`README.md`** (modified, ~400 lines after redesign — net +79 lines vs pre-redesign: `1 file changed, 203 insertions(+), 124 deletions(-)`) — Full hybrid redesign. Pre-redesign state had the skills.sh badge + `# Jei-sKappa's Skills` H1 + 1-sentence repo description + `## Available skills` H2 with 40 `### [\`<name>\`](./skills/...)` entries (an unstructured topical list) + 2 doc notes (verification-coverage + the-fool delegation as blockquotes) + `## Retired skills` H2 with 2 bullets. Post-redesign state has the skills.sh badge + `# Jei-sKappa's Skills` H1 + 1-sentence V1-anchored value statement + `## Toolbox Model` + `## Layered Workflow Map` + `## Recommended Common Paths` + `## Skills by Module` (replacing the simple-list `## Available skills`) with 9 `### <family-name>` subsections each containing `#### [\`<name>\`](./skills/...)` entries (40 entries total, same set, restructured) + `## Retired skills` (preserved verbatim) + `## Installation` (new — DIST-02 documentation). Both Phase 6 doc notes preserved (verification-coverage in Review header; the-fool in BOTH Review header AND Propose family).

- **`.planning/phases/07-merge-finish-navigation-distribution/07-03-SUMMARY.md`** (created — this file).

## Decisions Made

- **README title kept as `# Jei-sKappa's Skills`** rather than promoted to `# Modular Agentic Workflow V1`. The repo is a personal skills collection that hosts V1, not the workflow itself — the 7 non-V1 skills under `JeisKappa-skills` predate V1 and remain installable. Promoting the title would imply identity (repo = workflow), which is false. The V1 framing now lives in the 1-sentence value statement (`anchored by the **Modular Agentic Workflow V1**`) and the Toolbox Model narrative.

- **Layered Workflow Map uses BOTH a table AND an ASCII diagram.** The table is the canonical machine-readable form (each row names a layer + its members; greppable). The ASCII diagram is the orientation aid (spine horizontal, overlays attaching from above). Belt-and-suspenders accommodates readers with different preferences without violating D34's NO-NFA-notation rule — both representations are plain-text-readable and no external image is referenced.

- **5 Recommended Common Paths shipped (the plan's maximum).** The canonical full-workflow path is the first row, and it names every skill in the spine including the subagent-driven implementation variant (`implement-plan-with-subagents-auto`) and the interactive review variant (`review-implementation-interactive`). The other 4 paths cover the most common practical entry points: bug fix (less-structured input + code review + finish), idea exploration (discussion + propose only, no further commitment), plan refinement (plan-strict + review-plan-interactive + adjust-plan-granularity + implement-plan), and merge reconciliation (merge-artifacts-interactive + review-spec-interactive + finish). Each path is a one-liner — the README points to the per-module catalog for skill details.

- **Interaction-mode prefix bolded in every V1 catalog entry.** Every V1 description opens with a bolded **Autonomous** / **Interactive** / **Single skill** / **Advisory** token before any other framing. Makes DIST-05 visually scannable for a reader skimming the catalog and survives partial reads. The convention is uniform across the 33 V1 entries; non-V1 entries do not carry the prefix (they don't have the V1 mode-variant contract).

- **The-fool delegation note placed in TWO locations** (Review header + Propose family callout). The plan permits executor discretion on placement. Single-placement (Review only) is the minimal correct choice; two-placement (Review + Propose) is the maximum-discoverability choice. The CONTEXT.md guidance — `Use the-fool against a proposal or spec draft to surface adversarial risks before the spec / plan / implementation phases` — explicitly suggests the upstream framing, so a Propose-family callout matches that framing. Two placements maximize the chance a user encountering propose-* or review-* skills sees the note without bloating the catalog (the note is 2 lines).

- **Module family ordering follows the spine flow + cross-cutting overlays + Other at the end.** Capture & Discussion (cross-cutting input layer) → Propose → Spec → Plan → Implement (spine forward order) → Review (cross-cutting overlay) → Merge (cross-cutting overlay) → Finish & Navigate (closure overlay) → Other (non-V1). This matches the Layered Workflow Map's reading order so a reader scrolling from the map into the catalog encounters the same conceptual sequence.

- **Installation note documents BOTH plugin renderings** (`JeisKappa Workflow` for V1 + `JeisKappa Skills` for non-V1). DIST-02 only requires the V1 rendering, but a reader who runs `npx skills list` after installing one V1 + one non-V1 skill will see two group headings. Documenting both prevents reader confusion that would otherwise require them to inspect `.claude-plugin/marketplace.json` to understand the difference. Closes a discoverability gap with one extra sentence.

## Deviations from Plan

None — plan executed exactly as written.

The plan was unusually thorough: the action block enumerated every section, every required content element (toolbox-model 5 concepts, layered-workflow-map representation rules, recommended-common-paths constraints, per-module catalog 9 families with skill counts, retired-skills preservation rule, installation-note content), every hard constraint (REPLACE not append, PRESERVE retired + doc notes, EVERY skill present with install snippet, EVERY V1 description states mode, NO NFA notation, NO external image). The verifier block was exhaustive (40-skill name grep loop + 40-install-command grep loop + 6 section presence checks + JeisKappa Workflow phrase + retired bullets + no V2 notation). All checks passed on the first attempt. No Rule 1/2/3 auto-fixes were needed.

The plan's allowance for executor discretion on three points (Toolbox Model exact wording, Recommended Common Paths exact composition, doc-note placement) was exercised but stayed within the documented ranges — Toolbox Model expressed all 5 required concepts as a 5-sentence narrative, Recommended Common Paths shipped 5 paths (max allowed), doc notes integrated in Review module (verification-coverage + the-fool) and Propose module (the-fool also).

## Issues Encountered

None. The plan's verifier blocks ran clean on the first attempt for both Task 1 and Task 2:

- **Task 1 verifier:** 18 grep patterns for section headings + 40 skill names + 40 install commands + 5 doc-note presence + JeisKappa Workflow phrase + retired bullets + no V2 notation. All OK on first run.
- **Task 2 verifier:** 4 jq length/sort assertions on marketplace.json + .vscode/settings.json + 33 jq index assertions for V1 skill presence in marketplace + 33 jq index assertions for V1 scope presence + 5 doc-note grep checks + 2 negative grep checks (no nested install path, no V2 notation). All OK on first run, terminating with `PHASE_7_OK`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **V1 MILESTONE COMPLETE.** All 78 V1 requirements satisfied. The complete catalog (33 V1 workflow skills + 7 non-V1 skills) is shipped, registered, and discoverable. The README hybrid layout is the V1-final entry point — a user arriving at the repo gets oriented via the Toolbox Model, sees the workflow via the Layered Workflow Map, picks an entry path via Recommended Common Paths, and finds every installable skill via the Per-Module Catalog.

- **ROADMAP Phase 7 entry ready to flip to Complete.** All 3 plans (07-01 merge-artifacts pair; 07-02 finish + whats-next; 07-03 README hybrid) shipped. Phase 7 V1 final-state targets all reached: JeisKappa-workflow = 33 skills, JeisKappa-skills = 7 skills, `.vscode/settings.json` scopes = 40 entries.

- **No blockers or concerns.** The V1 milestone closes cleanly.

## Self-Check: PASSED

- `README.md` — FOUND (post-redesign), 6 H2 sections in correct order (Toolbox Model → Layered Workflow Map → Recommended Common Paths → Skills by Module → Retired skills → Installation), 9 H3 module subsections, 40 H4 catalog entries (33 V1 + 7 non-V1), all 40 `npx skills add Jei-sKappa/skills --skill <name>` install snippets present, JeisKappa Workflow literal phrase present (DIST-02), the-fool note present (D88), verification-coverage note present (D85), discussion-loop + review-decision-document Retired bullets present (verbatim), NO NFA/state-machine notation (V2 deferral honored per D34).
- Commit `61756c1` (docs(07-03): redesign README with V1 hybrid layout) — FOUND in `git log --oneline -3`.
- marketplace.json JeisKappa-workflow length 33 + JeisKappa-skills length 7 — confirmed by `jq -e '.plugins[] | select(.name=="JeisKappa-workflow") | .skills | length == 33'` and matching jq for skills plugin.
- .vscode/settings.json scopes length 40 + alphabetical — confirmed via `jq -e '."conventionalCommits.scopes" == (."conventionalCommits.scopes" | sort)'`.
- All 33 V1 workflow skill folders present in BOTH the marketplace plugin AND the .vscode scopes — confirmed by jq index loops.
- README contains NO nested install paths (`--skill ./skills/`) and NO prefixed install paths (`--skill JeisKappa-workflow/`) — confirmed by negative grep.
- README contains NO prohibited V2 notation (NFA / state machine / graphviz / finite automaton) — confirmed by case-insensitive negative grep.

---
*Phase: 07-merge-finish-navigation-distribution*
*Completed: 2026-05-21*
*V1 MILESTONE COMPLETE*
