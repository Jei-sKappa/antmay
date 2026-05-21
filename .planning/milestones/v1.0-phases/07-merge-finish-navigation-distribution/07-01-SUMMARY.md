---
phase: 07-merge-finish-navigation-distribution
plan: 01
subsystem: skills
tags: [merge-artifacts, v1-workflow, anti-sycophancy, decision-log, conflict-marker, target-type-folder]

# Dependency graph
requires:
  - phase: 01-foundations
    provides: V1 workflow canonical docs (thread-layout.md, filename-grammar.md, immutability.md, README.md) cited by both new skills
  - phase: 02-capture-discussion
    provides: skills/discussion/SKILL.md (4 anti-sycophancy markers carried verbatim into merge-artifacts-interactive), skills/seeded-discussion/SKILL.md (per-point walk pattern source for the per-conflict walk), skills/capture-inbox/SKILL.md (scope-drift fallback)
  - phase: 06-review-family
    provides: review-spec-{auto,interactive} + review-proposal-interactive body shape (autonomous pure-generator + collaborative ASK+TEST+settle+decision-log + scope-drift patterns mirrored into the merge pair)
provides:
  - skills/merge-artifacts-auto/SKILL.md (V1 autonomous merge — same-type default + cross-type explicit + target-type folder routing + next-mainline-integer filename + <!-- CONFLICT: --> marker preservation + no decision log)
  - skills/merge-artifacts-interactive/SKILL.md (V1 collaborative merge — per-conflict ASK+TEST+settle walk + 4 anti-sycophancy markers verbatim + merge-stance amplifier + MANDATORY decision log per D102 exception to D93)
  - JeisKappa-workflow plugin grown 29 -> 31
  - .vscode conventionalCommits.scopes grown 36 -> 38 alphabetically
  - README Available skills grown 36 -> 38 (entries inserted before Retired skills; existing verification-coverage note + the-fool delegation note + Retired entries preserved untouched)
affects: [07-02-finish-whats-next, 07-03-readme-hybrid-redesign]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "V1 cross-cutting merge family — auto/interactive pair with shared registration touchpoints (matches Phase 3/4/5/6 pair-plan convention)"
    - "Auto skill is pure generator — NO Anti-Sycophancy Stance section, NO decision log; conflict preservation via HTML-comment marker is the auto-merge equivalent of capturing trade-offs"
    - "Interactive skill is decision-log-mandatory — explicit exception to D93's interactive-may-or-may-not-log default per D102; merge interactions ARE the durable trade-offs"
    - "Target-type folder routing — D101 + thread-layout excluded-folder-names rule forbids `merges/` folder uniformly across all five candidate target folders"
    - "Next-mainline-integer versioned form — merged output consumes variants/predecessors and produces next mainline integer with NO descriptor"

key-files:
  created:
    - skills/merge-artifacts-auto/SKILL.md
    - skills/merge-artifacts-interactive/SKILL.md
  modified:
    - .claude-plugin/marketplace.json
    - .vscode/settings.json
    - README.md

key-decisions:
  - "Auto skill explicitly refuses cross-type inference — if inputs are mixed-type without explicit target-type direction, the autonomous skill takes its one clarifying question rather than guessing (silent inference would hide a real routing decision)"
  - "Auto skill preserves conflicts via inline <!-- CONFLICT: <description> --> HTML-comment marker pattern per D103; both perspectives surface side-by-side immediately below the marker so a downstream reader can grep for unresolved conflicts"
  - "Interactive skill does NOT use the <!-- CONFLICT: --> marker — conflicts are resolved in-place during the walk and only the resolution remains visible in the merged body; the decision log is the only place the conflict-and-resolution mapping is recoverable"
  - "Both skills place README entries at end of Available skills list (before Retired) to follow the existing topical-then-alphabetical grouping convention; Plan 07-03 will restructure everything into the hybrid layout"
  - "Both skills cite all four Phase 1 canonical docs (README.md + thread-layout.md + filename-grammar.md + immutability.md) by absolute path on first invocation, matching Phase 6 review-* citation-first voice"

patterns-established:
  - "Cross-cutting merge family pair: shared body shape (Inputs/Output Location/Output Filename/Workflow/Commit Policy/Immutability) with mode-specific divergence (Anti-Sycophancy Stance + Walk Format + Decision Log + Output Artifacts + Scope Drift only in interactive; Conflict Handling + No Decision Log only in auto)"
  - "D102 exception-to-D93 citation pattern — when an interactive skill's decision log is mandatory by spec, the skill body must explicitly cite both D-IDs and explain why the exception holds (merge interactions ARE the durable trade-offs)"

requirements-completed: [MERG-01, MERG-02, MERG-03, MERG-04, MERG-05, MERG-06]

# Metrics
duration: 8min
completed: 2026-05-21
---

# Phase 07 Plan 01: Merge Artifacts Pair Summary

**V1 merge family shipped — autonomous `merge-artifacts-auto` (same-type default + cross-type explicit + target-type folder routing + next-mainline-integer filename + `<!-- CONFLICT: -->` marker preservation per D103 + no decision log per D102) and collaborative `merge-artifacts-interactive` (per-conflict ASK+TEST+settle walk + 4 anti-sycophancy markers verbatim from `skills/discussion/SKILL.md` + merge-stance amplifier + MANDATORY decision log per D102 exception to D93); JeisKappa-workflow plugin 29 -> 31; .vscode scopes 36 -> 38; README Available skills 36 -> 38.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-21T14:42:28Z
- **Completed:** 2026-05-21T14:50:11Z
- **Tasks:** 3
- **Files modified:** 5 (2 created + 3 registration files updated)

## Accomplishments

- **`skills/merge-artifacts-auto/SKILL.md`** authored (152 lines) — autonomous V1 merge skill: reconciles two or more V1 artifacts of the same type by default (with cross-type allowed only when the user explicitly states the target type per D100), writes ONE merged artifact at the next mainline integer of the target type's folder per D45/D101 (NEVER a separate `merges/` folder per the thread-layout excluded-folder-names rule), preserves unresolvable subjective conflicts EXPLICITLY in the body via a `<!-- CONFLICT: <description> -->` HTML-comment marker per D103, writes NO decision log per D102, and never auto-commits.
- **`skills/merge-artifacts-interactive/SKILL.md`** authored (207 lines) — collaborative V1 merge skill: same routing rules as the auto sibling (same-type default + cross-type explicit + target-type folder + next-mainline-integer filename), but walks each subjective conflict ONE AT A TIME with the user, applies the four anti-sycophancy markers from `skills/discussion/SKILL.md` verbatim plus the merge-stance amplifier ("When inputs disagree, push back on the user's first instinct — the merged artifact must survive later review"), runs the D89 ASK+TEST+settle loop against BOTH input artifacts (do not just accept), writes a MANDATORY decision log per D102 (explicit exception to D93's "interactive may or may not log" default — merge interactions ARE the durable trade-offs), and resolves conflicts in-place rather than using the `<!-- CONFLICT: -->` marker.
- **Registration files updated atomically:** `.claude-plugin/marketplace.json` JeisKappa-workflow array grew 29 -> 31 (alphabetical position between `implement-plan-with-subagents-interactive` and `plan-loose-auto`); `.vscode/settings.json` `conventionalCommits.scopes` grew 36 -> 38 alphabetically (between `meta-prompting` and `plan-loose-auto` — note `mer` < `met` so merge-* entries fall BEFORE `meta-prompting`); `README.md` "Available skills" section grew 36 -> 38 with both entries inserted before `## Retired skills`, preserving the verification-coverage note from Plan 06-04, the-fool delegation note from Plan 06-05, and the two existing Retired entries (`discussion-loop`, `review-decision-document`) untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author `skills/merge-artifacts-auto/SKILL.md`** — `332872f` (feat)
2. **Task 2: Author `skills/merge-artifacts-interactive/SKILL.md`** — `3c9205d` (feat)
3. **Task 3: Register merge-artifacts-* in marketplace.json, .vscode/settings.json, README.md** — `3b73d20` (chore)

**Plan metadata commit:** Pending after this SUMMARY is written.

## Files Created/Modified

- **`skills/merge-artifacts-auto/SKILL.md`** (created, 152 lines) — V1 autonomous merge skill body covering: opening clarifier naming sibling + D99 auto/interactive split + D100 same-type default + cross-type explicit rule; Inputs section (2+ artifacts under any V1 folder; READ-ONLY per `docs/workflow/v1/immutability.md`; ambiguity fallback ASK rule); Output Location section (TARGET TYPE folder mapping for all five target folders; NEVER `merges/` per `docs/workflow/v1/thread-layout.md` excluded-folder-names rule); Output Filename section (V1 versioned-form grammar at `docs/workflow/v1/filename-grammar.md`; next mainline integer; ALWAYS no descriptor; three examples); Conflict Handling section (D103 marker pattern with inline illustration; explicit list of confidently-resolvable vs preserve-as-conflict cases); No Decision Log section (per D102; the auto half is a pure generator); Workflow (10 numbered steps from thread resolution through final confirmation message); Commit Policy NEVER auto-commits; Immutability section (no source-relation frontmatter; lineage in body's `## References` by absolute path). NO Anti-Sycophancy Stance section.
- **`skills/merge-artifacts-interactive/SKILL.md`** (created, 207 lines) — V1 collaborative merge skill body covering: opening clarifier naming sibling + D99 auto/interactive split + D100 same-type default + cross-type explicit rule; Anti-Sycophancy Stance section with all four verbatim markers from `skills/discussion/SKILL.md` ("Disagree when you disagree", "Push back on weak or incomplete reasoning", "Do not treat pushback as correctness", "Refuse to log") PLUS the merge-stance amplifier ("When inputs disagree, push back on the user's first instinct — the merged artifact must survive later review"); Inputs section (same shape as auto + ambiguity fallback); Output Location section (same target-type folder mapping + same NEVER `merges/` exclusion); Output Filename section (same next-mainline-integer grammar); Walk Format section (per-conflict ASK + TEST against BOTH inputs + apply + log loop modeled on `skills/seeded-discussion/SKILL.md`); Decision Log section (MANDATORY per D102 explicit exception to D93 default; lazy-creation rule from `discussion`/`seeded-discussion`; `## D<N>:` append-only shape); Output Artifacts section (TWO outputs: merged artifact + decision log; one output when zero conflicts settled); Scope Drift section (mirrors Phase 6 review-* pattern with `capture-inbox` PARK + `discussion`/`seeded-discussion` SPLIT + DEFER options); Workflow (12 numbered steps); Commit Policy NEVER auto-commits; Immutability section.
- **`.claude-plugin/marketplace.json`** (modified) — `JeisKappa-workflow.skills` array length 29 -> 31; `merge-artifacts-auto` + `merge-artifacts-interactive` inserted alphabetically between `implement-plan-with-subagents-interactive` and `plan-loose-auto`; `JeisKappa-skills` unchanged at 7.
- **`.vscode/settings.json`** (modified) — `conventionalCommits.scopes` array length 36 -> 38; `merge-artifacts-auto` + `merge-artifacts-interactive` inserted alphabetically between `implement-plan-with-subagents-interactive` and `meta-prompting`; whole array confirmed sorted via `jq -e '."conventionalCommits.scopes" == (."conventionalCommits.scopes" | sort)'`.
- **`README.md`** (modified) — Two new entries (`### [\`merge-artifacts-auto\`]` + `### [\`merge-artifacts-interactive\`]`) inserted before `## Retired skills`; each entry has substantive description sentence stating interaction mode explicitly per DIST-05, same-type default + cross-type explicit per D100, target-type folder routing per D101, sibling reference, anti-sycophancy framing (interactive only), conflict-preservation marker (auto only), decision-log-mandatory exception (interactive only) + fenced `npx skills add Jei-sKappa/skills --skill <name>` install snippet; total `### [\`...\`]` count grew 36 -> 38; the-fool delegation note + verification-coverage note from Phase 6 preserved untouched; `## Retired skills` subsection (`discussion-loop` + `review-decision-document`) preserved untouched.

## Decisions Made

- **Auto skill refuses cross-type inference explicitly.** When the inputs are mixed-type and the user has not stated the target type per D100, the autonomous skill takes one clarifying question rather than guessing. This is the one place autonomous merge breaks the "no clarifying questions" pattern — the alternative (silent inference) would hide a real routing decision (which artifact type the merge should produce) behind a guess. The skill body states this exception explicitly.
- **`<!-- CONFLICT: -->` marker pattern documented with inline illustration.** Rather than a heavyweight schema or YAML block, the marker is an HTML comment with a one-sentence description that placeholds the disagreement; immediately below it both perspectives appear side-by-side verbatim or summarized. A downstream reader can find every unresolved conflict by grepping `<!-- CONFLICT:` in the merged file. The body shows one short example to anchor the pattern.
- **Interactive skill resolves conflicts in-place (not via marker).** The auto and interactive variants take fundamentally different approaches to unresolvable conflicts: auto preserves them inline so a downstream reader can grep them out; interactive resolves them with the user during the walk and only the resolution remains visible in the merged body. The decision log is therefore the ONLY place the conflict-and-resolution mapping is recoverable from interactive merge — that is precisely why D102 makes the log mandatory (explicit exception to D93's default).
- **README entries placed at end of Available skills list (before Retired) rather than strictly alphabetically.** Inspection of the existing list showed it is grouped topically rather than strictly alphabetical (capture/discussion → propose → review → spec → plan → adjust-plan → implement). Merge is a new cross-cutting family not in any existing group, so end-of-list-before-Retired follows the existing convention. Plan 07-03 will restructure everything into the hybrid layout regardless.
- **Both skills cite all four Phase 1 canonical docs by absolute path on first invocation.** Matches the citation-first voice established in Phase 6 review-* skills. Auto skill cites `docs/workflow/v1/README.md`, `docs/workflow/v1/thread-layout.md`, `docs/workflow/v1/filename-grammar.md`, `docs/workflow/v1/immutability.md`. Interactive skill cites the same four plus `skills/discussion/SKILL.md` (anti-sycophancy source), `skills/seeded-discussion/SKILL.md` (per-point walk pattern source), and `skills/capture-inbox/SKILL.md` (scope-drift PARK option).

## Deviations from Plan

None — plan executed exactly as written.

The plan was unusually thorough: the action blocks enumerated the exact behavioral tokens both skill bodies needed to carry, the registration counts were stated up front (29 -> 31, 36 -> 38, 36 -> 38), and the alphabetical-position rule was stated verbatim for each file. No Rule 1/2/3 auto-fixes were needed. The `merges/` exclusion was enforced uniformly in both skill bodies. The 4 anti-sycophancy markers and merge-stance amplifier landed verbatim in the interactive skill. The D102 exception to D93 was cited explicitly. The autonomous skill has no Anti-Sycophancy section (confirmed by verifier grep). All three Phase 1 canonical docs (thread-layout.md, filename-grammar.md, immutability.md) cited by both skills.

## Issues Encountered

None. The plan's verifier blocks ran clean on the first attempt for all three tasks. The full plan-level verification at the end of execution returned all 19 OK lines (skill files exist, auto behavioral tokens, interactive 4 markers + merge-stance amplifier + D89 + D102 + D93 exception, registration counts at 31/7/38/38, documentation preservation across the-fool + verification-coverage + discussion-loop + review-decision-document).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 07-02 (finish + whats-next + 3 shared registration touchpoints) unblocked.** It will grow JeisKappa-workflow from 31 -> 33, .vscode scopes from 38 -> 40, and README Available skills from 38 -> 40 by adding two new entries (`### [\`finish\`]` and `### [\`whats-next\`]`) to the existing simple list.
- **Plan 07-03 (README hybrid redesign) remains blocked until 07-02 completes.** Per the phase context, 07-03 has a shared-file dependency on README.md (the redesign is a full restructure that will INCLUDE the finish + whats-next entries added by 07-02). Running 07-03 before 07-02 would either omit the closing skills from the hybrid catalog or require a second pass after 07-02 lands.
- **No blockers or concerns.** The merge family is closed; Phase 7 has only the closing skills (07-02) and the README redesign (07-03) ahead before V1 ships.

## Self-Check: PASSED

- `skills/merge-artifacts-auto/SKILL.md` — FOUND (152 lines, 17653 bytes)
- `skills/merge-artifacts-interactive/SKILL.md` — FOUND (207 lines, 29243 bytes)
- Commit `332872f` (feat(merge-artifacts-auto): add V1 autonomous merge skill) — FOUND in `git log --oneline -3`
- Commit `3c9205d` (feat(merge-artifacts-interactive): add V1 collaborative merge skill) — FOUND
- Commit `3b73d20` (chore: register merge-artifacts-* skills) — FOUND
- marketplace.json JeisKappa-workflow length 31 — confirmed by `jq -e '.plugins[] | select(.name=="JeisKappa-workflow") | .skills | length == 31'`
- .vscode/settings.json scopes length 38 + alphabetical — confirmed
- README.md `^### \[` count 38 — confirmed
- Documentation notes preserved (the-fool, verification-coverage, discussion-loop, review-decision-document) — confirmed

---
*Phase: 07-merge-finish-navigation-distribution*
*Completed: 2026-05-21*
