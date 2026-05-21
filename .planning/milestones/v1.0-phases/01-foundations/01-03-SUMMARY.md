---
phase: 01-foundations
plan: 03
subsystem: registration
tags: [v1-workflow, gitignore, marketplace, agents-pointer, registration-baseline, foundations]

# Dependency graph
requires:
  - 01-01
  - 01-02
provides:
  - "Recursive ignore for thread-local WIP scratch (docs/threads/**/.wip/) at repo root"
  - "Second marketplace plugin entry (JeisKappa-workflow) with empty skills array — ready for Phase 2+ to append"
  - "AGENTS.md pointer section directing agents to docs/workflow/v1/README.md as the canonical V1 reference"
  - "CLAUDE.md automatically reflects the AGENTS.md change via symlink"
  - "Phase 1 Foundations milestone complete — all V1 thread storage primitives are codified and registered"
affects: [phase-2, phase-3, phase-4, phase-5, phase-6, phase-7]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Second marketplace plugin entry pattern: name kebab-case (rendered with capitalization per CLI display rule), source './', skills array appended per-phase"
    - "AGENTS.md pointer sections live OUTSIDE every <!-- GSD:*-start/-end --> auto-managed block to survive regeneration"

key-files:
  created: []
  modified:
    - .gitignore
    - .claude-plugin/marketplace.json
    - AGENTS.md

key-decisions:
  - "Used commit type `chore` for .gitignore edit (build/config tooling), `feat` for marketplace.json (new plugin registration is a new capability), `docs` for AGENTS.md (pure pointer/documentation addition)"
  - "Placed the AGENTS.md pointer section immediately after ## Commits and immediately before the GSD:project-start auto-managed marker — keeps it in the human-authored portion that GSD regeneration leaves untouched"
  - ".vscode/settings.json was intentionally NOT modified — per CONTEXT.md and CLAUDE.md, conventionalCommits.scopes entries land when each new skill folder ships; the existing alphabetical-sort convention satisfies DIST-04's 'ready to receive' bar"
  - "Empty skills array on JeisKappa-workflow plugin is the intentional shape for Phase 1 — the plugin must exist so Phase 2 can append to it, but no V1 spine skill folders ship in this phase"

patterns-established:
  - "Pattern: Recursive `.wip/` ignore uses the path-qualified form `docs/threads/**/.wip/` (NOT the broader `**/.wip/`) so unrelated `.wip/` folders elsewhere in the repo are not accidentally ignored"
  - "Pattern: New marketplace plugin entries preserve every prior plugin verbatim; Edit (not Write) is the correct tool so the existing 9-skill JeisKappa-skills entry is untouched"
  - "Pattern: When AGENTS.md needs a new section, locate the insertion point by anchor strings (existing section heading on one side, GSD auto-managed marker on the other) rather than line numbers"

requirements-completed:
  - THRD-03
  - DIST-04

# Metrics
duration: ~2min
completed: 2026-05-21
---

# Phase 01 Plan 03: Wire Registration Baseline Summary

**Registration baseline wired: `.gitignore` excludes thread-local WIP scratch, `.claude-plugin/marketplace.json` carries an empty `JeisKappa-workflow` plugin entry ready for Phase 2 skills, and `AGENTS.md` points agents at `docs/workflow/v1/README.md` as the canonical V1 reference — completing Phase 1 Foundations.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-21T07:26:36Z
- **Completed:** 2026-05-21T07:28:15Z
- **Tasks:** 3
- **Files modified:** 3 (all edited in place)

## Accomplishments

- Appended `docs/threads/**/.wip/` to `.gitignore` (preceded by an explanatory comment linking to `docs/workflow/v1/thread-layout.md`), preserving every existing rule (`temp/`, `.library/`, `.claude/`, `.codex/`, `.cursor/`) verbatim. Codifies THRD-03.
- Added a second plugin entry `JeisKappa-workflow` to `.claude-plugin/marketplace.json` with `source: "./"` and an empty `skills` array. The existing `JeisKappa-skills` plugin (and its nine skill paths) remained byte-for-byte unchanged. Codifies DIST-04.
- Inserted a `## V1 Workflow Conventions` pointer section into `AGENTS.md` between the existing `## Commits` section and the `<!-- GSD:project-start ... -->` auto-managed marker. The section links all four canonical V1 reference docs (`README.md`, `thread-layout.md`, `filename-grammar.md`, `immutability.md`) and explicitly states it is a POINTER that does not duplicate the rules.
- Confirmed `CLAUDE.md` (symlink to `AGENTS.md`) automatically reflects the new section — no separate edit needed.
- Phase 1 Foundations milestone is now complete: four reference docs (Plans 01 + 02) + one gitignore rule + one marketplace plugin entry + one AGENTS.md pointer section all on disk.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add recursive `.wip/` ignore rule to `.gitignore`** — `1cb6756` (chore)
2. **Task 2: Add `JeisKappa-workflow` plugin entry to `.claude-plugin/marketplace.json`** — `350d4ce` (feat)
3. **Task 3: Add V1 Workflow Conventions pointer section to `AGENTS.md`** — `1bba51e` (docs)

**Plan metadata:** *(this commit — see final commit below)*

## Files Created/Modified

- `.gitignore` — Appended a one-line comment (`# Thread-local WIP scratch (per docs/workflow/v1/thread-layout.md)`) and the rule `docs/threads/**/.wip/`. Three new lines; no existing rule reordered or removed.
- `.claude-plugin/marketplace.json` — Spliced a second plugin object `{ "name": "JeisKappa-workflow", "source": "./", "skills": [] }` after the existing `JeisKappa-skills` plugin, inside the `plugins` array. Five new lines; the `JeisKappa-skills` plugin and all nine skill paths preserved verbatim.
- `AGENTS.md` — Inserted a `## V1 Workflow Conventions` section (14 new lines including spacing) between the existing `## Commits` section and the `<!-- GSD:project-start ... -->` marker. The section contains the four canonical doc references and an explicit POINTER-not-duplication statement.

## Decisions Made

- **Commit type per task.** `chore` for `.gitignore` (tooling/build config), `feat` for `marketplace.json` (new plugin registration is a new install-time capability), `docs` for `AGENTS.md` (pure pointer/documentation addition with no behavior change). All three are repo-wide changes per CLAUDE.md rules and therefore omit a scope.
- **Insertion location for the AGENTS.md pointer.** Placed immediately after `## Commits` and immediately before the `<!-- GSD:project-start source:PROJECT.md -->` marker so the section lives in the human-authored portion of the file. The CONTEXT.md "no rule duplication" constraint was honored — the section summarizes and links but never restates concrete folder names, UTC patterns, version syntax, or the frontmatter forbidden list.
- **`.vscode/settings.json` left untouched.** Per the Phase 1 CONTEXT.md decision and the existing CLAUDE.md alphabetical-sort convention, `conventionalCommits.scopes` entries land when each new skill folder ships in Phase 2+. The file is "ready to receive" per DIST-04 by virtue of the documented convention, not by a Phase 1 edit. The success criterion `.vscode/settings.json UNCHANGED` was satisfied.
- **`README.md` left untouched.** The root README hybrid is Phase 7 work per the Phase 1 scope decision (deferred item). The success criterion `README.md UNCHANGED` was satisfied.
- **Path-qualified `.wip/` ignore form.** Used `docs/threads/**/.wip/` instead of the broader `**/.wip/` per the Plan 03 instructions and THRD-03 — the broader form could accidentally ignore unrelated `.wip/` folders elsewhere in the repo.

## Deviations from Plan

None — plan executed exactly as written.

All three tasks' `<verify>` blocks passed on first run. The plan-level verification suite (T1 + T2 + T3 paths + T3 ordering + T3 outside-GSD-blocks + CLAUDE.md symlink reflection) all reported OK. No rule was duplicated, no existing entry was disturbed, and no GSD auto-managed block was touched.

## Issues Encountered

None.

## Next Phase Readiness

- Phase 2 (`Capture & Discussion Infrastructure`) can now begin. The `JeisKappa-workflow` plugin entry awaits its first appended skill folder (e.g. `./skills/capture-inbox`); the `.gitignore` rule already protects any thread's `.wip/` drafts created during early discussion authoring; and the `AGENTS.md` pointer ensures any agent starting a Phase 2 session is signposted to the canonical V1 doc set.
- All Phase 1 deliverables are on disk: four reference docs at `docs/workflow/v1/` (Plans 01 + 02), one gitignore rule (this plan), one marketplace plugin entry (this plan), one AGENTS.md pointer section (this plan).
- Downstream phases (2–7) can cite `docs/workflow/v1/README.md`, `thread-layout.md`, `filename-grammar.md`, and `immutability.md` from any V1 spine skill body without re-deriving the contracts — and can register their new skill folders by appending to the existing `JeisKappa-workflow.skills` array plus the existing `conventionalCommits.scopes` array.
- Phase 1 success criterion #2 (gitignore recursive rule), #4 (registration baseline correct), and #5 (immutability + ambiguous-reference-resolution rules explicitly written and discoverable via the pointer) are satisfied. Phase 1 milestone closure is ready.

## Self-Check: PASSED

- `.gitignore` contains the literal line `docs/threads/**/.wip/` — verified with `grep -qxF`.
- All five pre-existing `.gitignore` entries (`temp/`, `.library/`, `.claude/`, `.codex/`, `.cursor/`) preserved — verified with `grep -qF` for each.
- `.claude-plugin/marketplace.json` parses as valid JSON with exactly two plugins, `JeisKappa-skills` first with all nine skills, `JeisKappa-workflow` second with empty `skills` array and `source: "./"` — verified with `node -e`.
- `AGENTS.md` contains `## V1 Workflow Conventions` heading and all four canonical doc paths as literal strings — verified with `grep -qF` for each.
- The new section sits BEFORE the first `<!-- GSD:project-start -->` marker — verified with `awk`.
- The new section sits OUTSIDE every `<!-- GSD:*-start/-end -->` block — verified with `awk`.
- `CLAUDE.md` is a symlink to `AGENTS.md` and reflects the change automatically — verified with `[ -L ]`, `readlink`, and `grep -qF`.
- Commit `1cb6756` (Task 1) exists — verified with `git log`.
- Commit `350d4ce` (Task 2) exists — verified with `git log`.
- Commit `1bba51e` (Task 3) exists — verified with `git log`.

---
*Phase: 01-foundations*
*Completed: 2026-05-21*
