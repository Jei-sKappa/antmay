---
phase: 02-capture-and-discussion-infrastructure
plan: 03
subsystem: discussion
tags: [skill, retirement, deprecation, marketplace, conventional-commits, soft-retire]

requires:
  - phase: 02-capture-and-discussion-infrastructure
    plan: 01
    provides: capture-inbox skill (not directly referenced in retirement notice, but unblocks the wave-3 prerequisite chain)
  - phase: 02-capture-and-discussion-infrastructure
    plan: 02
    provides: discussion and seeded-discussion skills exist on disk so the retirement notice can name them with confidence
provides:
  - skills/discussion-loop/SKILL.md — rewritten as a short deprecation notice (v2.0.0) pointing legacy users at discussion and seeded-discussion
  - JeisKappa-skills marketplace plugin no longer advertises discussion-loop (9 → 8 entries)
  - .vscode/settings.json conventional-commit scopes no longer contains discussion-loop (12 → 11 entries, still alphabetical)
  - README.md no longer lists discussion-loop under Available skills; new Retired skills subsection documents the migration
affects: [every-future-skill-discussing-decision-flow, every-fresh-install-that-might-have-picked-discussion-loop]

tech-stack:
  added: []
  patterns:
    - "Soft-retire pattern for deprecated skills: keep the folder on disk so existing installs don't 404, rewrite SKILL.md body to a short deprecation notice that names replacements with install snippets, bump frontmatter version per CONVENTIONS.md, then pull the four registration touchpoints (marketplace plugin, .vscode scopes, README Available skills, plus a new README Retired skills subsection)"
    - "README.md Retired skills subsection format: level-2 heading, one bullet per retired skill carrying inline-code skill name, retirement date, replacement skill name(s), and a one-sentence migration/legacy-artifact note"
    - "Retirement-driven semver: MAJOR bump (1.x.x → 2.0.0) is the correct SemVer signal when a skill's active behavior is removed and replaced by a deprecation notice — fundamentally breaking for any caller that imported the old workflow"

key-files:
  created: []
  modified:
    - skills/discussion-loop/SKILL.md
    - .claude-plugin/marketplace.json
    - .vscode/settings.json
    - README.md

key-decisions:
  - "Used MAJOR semver bump (1.1.0 → 2.0.0) for the discussion-loop retirement rather than a 1.2.0 minor bump — the behavior fundamentally changed from active discussion driver to soft-retire deprecation notice, which is the textbook case for a major bump per SemVer + CONVENTIONS.md 'bump on any meaningful behavioral change'"
  - "Kept retirement notice intentionally short (31 lines total including frontmatter, well under the ≤60 cap) — a long deprecation notice tends to read like a skill body, which is exactly what readers should NOT see when they open a retired skill"
  - "Included the optional V1 thread reference (docs/workflow/v1/README.md) at the end of the body — readers landing on the retired skill from a stale link benefit from a pointer to the canonical V1 ruleset, and the path was verified to exist before inclusion"
  - "Placed the new Retired skills subsection at the END of README.md (after the last Available skill entry, seeded-discussion) — keeps Available skills as the primary surface; retired material is below the fold"
  - "Used inline-code (\`discussion-loop\`) in the Retired skills bullet rather than a level-3 heading — the bullet form is lighter, doesn't pollute the README's heading hierarchy, and signals that retired skills are NOT a parallel category to Available skills"

patterns-established:
  - "Skill retirement ritual (V1): rewrite SKILL.md body (don't delete the file), bump version to MAJOR, drop marketplace plugin entry, drop conventional-commit scope, replace README Available-skills entry with a Retired skills bullet — exactly 4 atomic commits, one per touchpoint"
  - "Retirement notice content shape: (1) `## <Skill Name> — RETIRED` heading, (2) one-paragraph WHY, (3) `## Replacements` section with one paragraph + install snippet per replacement, (4) `## Pre-existing logs` section reassuring legacy artifacts coexist without migration, (5) optional pointer to canonical V1 reference docs"

requirements-completed: [DISC-09]

duration: 2min
completed: 2026-05-21
---

# Phase 02 Plan 03: Retire discussion-loop Summary

**Soft-retires the legacy `discussion-loop` skill: rewrites `SKILL.md` to a 31-line deprecation notice (v2.0.0) pointing legacy users at `discussion` and `seeded-discussion` with install snippets, and removes the skill from all three registration surfaces (marketplace plugin, `.vscode/settings.json` scopes, README `## Available skills`) while adding a new `## Retired skills` subsection to README.md. The `skills/discussion-loop/` folder stays on disk so existing installs don't 404.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-21T08:27:29Z
- **Completed:** 2026-05-21T08:29:47Z
- **Tasks:** 4
- **Files modified:** 4 (0 created, 4 edited)

## Accomplishments

- Rewrote `skills/discussion-loop/SKILL.md` from a 73-line active-skill body (Setup / Loop / Logging / Finish) to a 31-line deprecation notice. Frontmatter bumped from `version: 1.1.0` to `version: 2.0.0` per SemVer MAJOR (active behavior removed). `description:` rewritten to `RETIRED — replaced by the `discussion` skill … and the `seeded-discussion` skill … Use when…` so the harness `Use when…` trigger still matches if a legacy invocation lands.
- Notice body contains all five required elements: (1) `# Discussion Loop — RETIRED` heading with explicit "retired" word, (2) one-paragraph WHY explaining the split, (3) `## Replacements` with one paragraph + `sh` install snippet per replacement (both `npx skills add Jei-sKappa/skills --skill discussion` and `… --skill seeded-discussion` present verbatim), (4) `## Pre-existing logs` section reassuring legacy artifacts at `docs/discussions/*-discussion.md` coexist without migration, (5) optional V1 reference pointer to `docs/workflow/v1/README.md` (verified-existing path).
- Removed `./skills/discussion-loop` from `.claude-plugin/marketplace.json` `JeisKappa-skills.skills` array (9 → 8 entries). `JeisKappa-workflow.skills` left untouched at 3 entries (capture-inbox, discussion, seeded-discussion). Remaining 8 JeisKappa-skills entries preserved in their existing alphabetical order.
- Removed `discussion-loop` from `.vscode/settings.json` `conventionalCommits.scopes` (12 → 11 entries). The remaining 11 entries stayed alphabetically sorted automatically — removing the entry between `discussion` and `meta-prompting` preserved the sort.
- Removed the `### [\`discussion-loop\`](./skills/discussion-loop/SKILL.md)` block from README.md `## Available skills` (the entry that sat between `consult-the-expert` and `the-librarian` — collapsed to a single blank line between the two now-adjacent entries). Removed the `npx skills add Jei-sKappa/skills --skill discussion-loop` snippet from the file in the same operation; that install command no longer appears anywhere in README.md.
- Appended a new level-2 `## Retired skills` subsection at the END of README.md (after the `seeded-discussion` block). One bullet for `discussion-loop`: inline-code skill name, retirement date `2026-05-21`, names both replacements (`discussion` and `seeded-discussion`), notes the legacy folder remains on disk for existing installs, and documents the no-migration guarantee for pre-existing `docs/discussions/*-discussion.md` logs.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite skills/discussion-loop/SKILL.md as deprecation notice** — `b35e862` (refactor)
2. **Task 2: Remove ./skills/discussion-loop from marketplace.json JeisKappa-skills** — `f2cea18` (chore)
3. **Task 3: Remove discussion-loop from .vscode/settings.json scopes** — `9e312e3` (chore)
4. **Task 4: Update README.md (remove Available-skills entry, add Retired skills subsection)** — `9589c39` (docs)

Plan metadata commit: pending after SUMMARY write.

## Files Created/Modified

- `skills/discussion-loop/SKILL.md` — body completely replaced (Setup/Loop/Logging/Finish → retirement notice); frontmatter `description:` rewritten, `metadata.version: 1.1.0 → 2.0.0`; line count 73 → 31
- `.claude-plugin/marketplace.json` — removed `./skills/discussion-loop` from `JeisKappa-skills.skills` (9 → 8 entries); `JeisKappa-workflow.skills` unchanged
- `.vscode/settings.json` — removed `discussion-loop` from `conventionalCommits.scopes` (12 → 11 entries, alphabetical sort preserved)
- `README.md` — removed `### [\`discussion-loop\`](./skills/discussion-loop/SKILL.md)` block from `## Available skills` (11 entries remain); appended new `## Retired skills` subsection at the end with one bullet for `discussion-loop`

## Decisions Made

- **MAJOR semver bump (1.1.0 → 2.0.0) for retirement:** The plan specified MAJOR explicitly per SemVer + CONVENTIONS.md ("bump on any meaningful behavioral change") — removing active behavior in favor of a deprecation notice is the textbook MAJOR case. A patch or minor bump would have understated the change for any consumer that pinned to a prior `discussion-loop` version.
- **Notice length: 31 lines (well under the ≤60 cap):** Kept the deprecation short and scannable. The CONTEXT.md `<specifics>` recommends "~10–20 lines"; 31 lines (which includes 7 lines of frontmatter and 24 lines of body) lands close to the recommendation while still carrying all five required content elements (RETIRED heading, WHY paragraph, two install snippets with one-line picks, legacy-log reassurance, V1 reference). A longer notice reads like a skill body, which is the opposite signal of "this skill is retired."
- **Included the optional V1 reference pointer:** The plan listed `docs/workflow/v1/README.md` as recommended-but-optional. Verified the path exists on disk before including. The pointer benefits readers who landed on the retired skill from a stale install and need to discover the canonical V1 ruleset the replacements produce against.
- **README Retired skills subsection placement (end of file):** Appended after the last Available skill (`seeded-discussion`) rather than inserting between Available skills and any other future section. Reasoning: (a) Available skills is the primary surface and stays at the top, (b) the Retired skills subsection at the bottom is "below the fold" and won't confuse new readers, (c) Phase 7 owns the README hybrid restructure so the current minimal placement is intentionally easy to relocate later.
- **Inline-code bullet (not level-3 heading) for the retired entry:** Used `**`discussion-loop`** — retired 2026-05-21…` as a bullet item rather than `### [\`discussion-loop\`](./skills/discussion-loop/SKILL.md)`. Reasoning: (a) the plan explicitly required this shape ("The `## Retired skills` bullet uses inline-code `` `discussion-loop` `` for the name — NOT a level-3 markdown heading"), (b) keeping retired skills as bullets prevents them from polluting the README's heading hierarchy or being mistaken for installable items, (c) the linked path would defeat the soft-retire intent by surfacing the retired SKILL.md as if it were a discoverable resource.
- **Commit type discipline:** Task 1 = `refactor(discussion-loop)` (single-skill scope, body rewritten so refactor is the closest type fit for "internal restructure that changes behavior in a documented way"). Tasks 2 & 3 = `chore:` (repo-wide registration changes, no single-skill scope applies since the skill is being unregistered). Task 4 = `docs:` (README is documentation, no single-skill scope since the change spans both Available skills removal and Retired skills addition).

## Deviations from Plan

None. Plan executed exactly as written.

- Task 1 verification grep set (12 individual checks: frontmatter shape, retirement word, both install snippets, both log-path references, absence of Setup/Loop sections, absence of forbidden frontmatter tokens, ≤60-line cap) passed cleanly on first run.
- Task 2 verification (node script: 2-plugin shape, JeisKappa-skills 8 entries with no discussion-loop, JeisKappa-workflow 3 entries unchanged) passed cleanly.
- Task 3 verification (node script: 11 scopes, no discussion-loop, alphabetical, top-level keys preserved) passed cleanly.
- Task 4 verification (grep set: removed entry/snippet, new Retired skills heading, all required tokens in the retired bullet, 5 sampled remaining Available entries) passed cleanly.
- No verifier-regex contradictions like Plan 02-01's "negation language flagged as forbidden" case; no `ugrep` argument-parsing nuances like Plan 02-02's `-decision-log.md` issue. The four verification steps were straightforward grep / node parses with no edge cases.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. After this plan ships:

- New installs of `discussion-loop` are NOT possible via `npx skills add Jei-sKappa/skills --skill discussion-loop` (the marketplace plugin no longer advertises it); legacy users who already installed the skill will still find the folder on disk but reading the SKILL.md will surface the retirement notice with install commands for the two replacements.
- Future commits MUST NOT use `discussion-loop` as a conventional-commit scope (it has been removed from `.vscode/settings.json` `conventionalCommits.scopes`); any future change to the retirement notice itself should use `refactor(discussion-loop):` only if the scope is temporarily re-added, or more practically use `chore:` / `docs:` since the skill is now repo-wide retired material.

## Next Phase Readiness

- **Phase 2 is now COMPLETE.** All six success criteria from CONTEXT.md `<domain>` are satisfied across Plans 02-01 / 02-02 / 02-03 collectively:
  1. `capture-inbox` shipped (Plan 02-01)
  2. `discussion` shipped (Plan 02-02)
  3. `seeded-discussion` shipped (Plan 02-02)
  4. `discussion-loop` retired with documented migration (this plan)
  5. Marketplace, .vscode scopes, and README all reflect the new state (this plan + 02-01 + 02-02)
  6. No legacy log migration performed (deferred per CONTEXT.md `<deferred>`)
- **Phase 3 (Forward Spine: propose-*, spec-*) is UNBLOCKED.** Capture and discussion infrastructure now exists for any future spine skill to cite — propose-* / spec-* skills can reference `capture-inbox` for side-finding parking and `discussion`/`seeded-discussion` for in-flight decision capture, with all decision-log artifacts already landing in the canonical `docs/threads/<thread>/discussions/` location.
- **No blockers.** All four CLAUDE.md "When adding a new skill" registration touchpoints have their corresponding REMOVAL applied for `discussion-loop`: SKILL.md (retirement notice replaces body), marketplace.json (entry removed), .vscode/settings.json (scope removed), README.md (Available entry removed + Retired skills entry added).

## Self-Check: PASSED

All five expected files exist on disk:

- `skills/discussion-loop/SKILL.md` (rewritten — 31 lines, version 2.0.0)
- `.claude-plugin/marketplace.json` (8 + 3 plugin shape)
- `.vscode/settings.json` (11 scopes, alphabetical)
- `README.md` (11 Available + 1 Retired)
- `.planning/phases/02-capture-and-discussion-infrastructure/02-03-SUMMARY.md`

All four task commits reachable in git log:

- `b35e862` (Task 1: refactor(discussion-loop))
- `f2cea18` (Task 2: chore — marketplace.json removal)
- `9e312e3` (Task 3: chore — .vscode scopes removal)
- `9589c39` (Task 4: docs — README rewrite)

The `skills/discussion-loop/` folder is still present on disk (soft retire confirmed by directory listing).

---
*Phase: 02-capture-and-discussion-infrastructure*
*Completed: 2026-05-21*
