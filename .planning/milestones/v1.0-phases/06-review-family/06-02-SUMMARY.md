---
phase: 06-review-family
plan: 02
subsystem: skills
tags: [review-family, spec-review, handoff-grade-bar, anti-sycophancy, v1-skill-pair, soft-retire, decision-log, review-finding, the-fool-delegation, inbox-open, semver-major-bump]

requires:
  - phase: 01-foundations
    provides: V1 thread layout, record-form + versioned-form filename grammar, immutability + ambiguous-reference rules
  - phase: 02-capture-discussion
    provides: discussion + seeded-discussion anti-sycophancy stance (4 markers), capture-inbox for scope-drift parking, lazy decision-log creation, soft-retire ritual precedent (Phase 2 discussion-loop)
  - phase: 03-forward-spine
    provides: spec-auto + spec-interactive — emit the spec artifacts this pair reviews; the locked 8 D50 semantic-contract elements (intended outcome / context / scope-non-scope / expected behavior / constraints / explicit decisions / unresolved questions / acceptance guidance) that the handoff-grade bar checks against per D82
  - plan: 06-01
    provides: V1 review-pair body shape (auto + interactive); 6-section findings-first report (Verdict / Findings / Evidence / References / Open Questions / Next Actions); per-finding walk loop with D89 ASK-AND-TEST; 4-marker anti-sycophancy carry-over + review-stance amplifier pattern; D92/D95 conditional inbox-dump rule; the-fool delegation note (D88)
  - legacy: skills/review-decision-document (retired in THIS plan)
    provides: handoff-grade-bar review framing — evolved into review-spec-* against the locked Phase 3 spec contract per D82

provides:
  - skills/review-spec-auto/SKILL.md (autonomous spec review against all 8 D50 elements; 6-section findings-first report emitted to inbox/open/<UTC>-<kebab-desc>-review-finding.md; the-fool delegation note; severity mapping missing=blocker / partial=issue / vague=nit)
  - skills/review-spec-interactive/SKILL.md (collaborative spec review with per-element or per-finding walk; 4 anti-sycophancy markers verbatim + review-stance amplifier + handoff-grade heightened framing; D89 ASK-AND-TEST; decision log at discussions/<UTC>-<kebab-desc>-decision-log.md + conditional inbox dump at inbox/open/<UTC>-<kebab-desc>-review-finding.md per D92/D95)
  - skills/review-decision-document/SKILL.md (RETIRED — body rewritten as ≤60-line deprecation notice; version bumped 1.1.0 → 2.0.0 MAJOR; folder kept on disk per soft-retire pattern)
  - Severity mapping for review-spec-* findings (missing D50 element = blocker; partially-covered = issue; vague-but-present = nit) — V1 standard per CONTEXT.md
  - Soft-retire pattern reusable for any future legacy-skill retirement (Phase 2 discussion-loop precedent + this plan's review-decision-document retirement)

affects: [phase-06-plan-03-review-plan, phase-06-plan-04-review-implementation, phase-06-plan-05-review-code, phase-07-merge-finish-navigation]

tech-stack:
  added: []
  patterns:
    - "Handoff-grade bar applied to V1 spec artifacts per D82 — review-spec-* checks all 8 D50 semantic-contract elements present and coherent against the Phase 3 spec contract"
    - "Citation by absolute path of skills/spec-auto/SKILL.md + skills/spec-interactive/SKILL.md as the source of the 8 D50 contract elements (the Phase 3 spec skills own the contract; review-spec-* checks against it)"
    - "Severity mapping for spec reviews: missing D50 element = blocker; partially-covered = issue; vague-but-present = nit (V1 standard per CONTEXT.md ## Specific Ideas)"
    - "Per-element walk grain for interactive spec review — recommended default is the 8 D50 elements in canonical sequence (closer to skills/spec-interactive/SKILL.md's element-by-element walk); per-finding walk grain available as alternative (closer to seeded-discussion's per-point walk). Grain is executor's discretion; the requirement is that each iteration settles ONE thing"
    - "Handoff-grade heightened framing in review-spec-interactive's anti-sycophancy stance: bad design captured in the spec becomes expensive in implementation phase, so the cheap moment to push back is during the walk — review-skill equivalent of plan-strict-interactive's strict-stakes amplifier and implement-interactive's execution-time amplifier"
    - "Soft-retire ritual for legacy skills (Phase 2 discussion-loop precedent + this plan's review-decision-document): SKILL.md body rewrite to ≤60-line deprecation notice naming both replacements with install snippets + frontmatter version MAJOR bump (1.1.0 → 2.0.0) + drop from marketplace plugin + drop from .vscode scopes + remove from README Available skills + add to README Retired skills subsection (legacy folder kept on disk so existing installs do not break)"
    - "Reverse-registration touchpoints for retired skills mirror the four-touchpoint rule for new skills — same files (marketplace.json, .vscode/settings.json, README.md) touched in reverse direction (REMOVE not ADD)"

key-files:
  created:
    - skills/review-spec-auto/SKILL.md
    - skills/review-spec-interactive/SKILL.md
  modified:
    - skills/review-decision-document/SKILL.md (entire body rewritten; legacy active-skill structure removed; version bumped 1.1.0 → 2.0.0 MAJOR)
    - .claude-plugin/marketplace.json (JeisKappa-workflow.skills 21 → 23 with review-spec-* ADDED alphabetically; JeisKappa-skills.skills 8 → 7 with review-decision-document REMOVED)
    - .vscode/settings.json (conventionalCommits.scopes 29 → 30 net; review-spec-* ADDED, review-decision-document REMOVED; alphabetical)
    - README.md (Available skills 29 → 30 net: review-spec-* ADDED between review-proposal-interactive and spec-auto, review-decision-document REMOVED; Retired skills subsection gains a 2nd bullet for review-decision-document alongside the existing discussion-loop bullet)

key-decisions:
  - "Handoff-grade bar evolves from legacy review-decision-document per D82 — preserved framing (a recipient could deliver the same work the author had in mind) but the bar is now the locked Phase 3 spec contract (the 8 D50 elements). Both new skill bodies acknowledge the evolution explicitly with a backreference to the retired skill."
  - "Severity mapping `blocker | issue | nit` for spec reviews — adopted CONTEXT.md's suggested mapping verbatim: missing element = blocker (spec cannot be handed downstream), partially-covered = issue (downstream implementer will hit a wall), vague-but-present = nit (false precision / soft language)."
  - "Per-element walk as recommended default for review-spec-interactive — closer to skills/spec-interactive/SKILL.md's authoring walk; produces a natural cross-reference between the original authoring conversation and the review walk. Per-finding walk grain is also documented as an executor-discretion alternative."
  - "Handoff-grade heightened framing in review-spec-interactive's anti-sycophancy stance — 'bad design captured in the spec becomes expensive in the implementation phase because the downstream consumers — humans and agents — will not have you to ask follow-ups'. This is the spec-review equivalent of plan-strict-interactive's strict-stakes amplifier; states explicitly that this is the last cheap moment to push back."
  - "review-decision-document retirement frontmatter version bump 1.1.0 → 2.0.0 (MAJOR) — matches Phase 2 discussion-loop retirement precedent; semver MAJOR justified by behavioral removal (the active skill no longer functions; the body is now a notice). AGENTS.md ## Version Bumping rule honored ('bump on any meaningful behavioral change')."
  - "Deprecation notice body length: 31 lines (≤60 line budget per plan; ≤50 lines body content per CONTEXT.md) — short, dense, mirrors the discussion-loop retirement notice structure exactly. No legacy active-skill sections (## What to look for / ## Output / ## Discipline / ## Workflow) survive."
  - "Soft retire: folder kept on disk so existing installs do not break — only marketplace registration, .vscode scope, and README Available-skills entry are pulled (mirrors Phase 2 precedent). New installs see no review-decision-document option; existing installs still resolve the folder and find the deprecation notice."
  - "Retired skills README bullet for review-decision-document mirrors the existing discussion-loop bullet structure exactly: literal date 2026-05-21 + skill name in backticks + replacement names in backticks + one-sentence migration note + 'legacy folder remains on disk' clause + 'no migration' clause."

patterns-established:
  - "review-spec-* body shape: opening clarifier naming sibling + family + lightweight-vs-handoff-grade-vs-other-targets framing + acknowledgment of legacy review-decision-document evolution per D82; Inputs naming specs/ versioned-form path with ambiguity fallback; Eight Semantic-Contract Elements section enumerating all 8 D50 elements by name with citations to skills/spec-auto/SKILL.md AND skills/spec-interactive/SKILL.md by absolute path; What This Skill Reviews enumerating spec-specific gaps/ambiguities/contradictions/false-precision/unjustified-absolutes; Findings Report Shape with 6 required sections; Output Artifact naming inbox/open/<UTC>-<kebab-desc>-review-finding.md; The Fool Delegation (D88); Workflow with read-only-spec + per-element-check + write-review; Commit Policy NEVER auto-commits; Immutability. Interactive sibling adds Anti-Sycophancy Stance (4 markers + review-stance amplifier + handoff-grade heightened framing) + Walk Format (per-element OR per-finding; default per-element) + Output Artifacts (always decision-log; conditional review-finding) + Decision Log Lazy Creation + Scope Drift. Pattern reusable verbatim by Plans 06-03/06-04/06-05 with the appropriate target-specific severity mapping and contract source."
  - "Soft-retire ritual (Phase 2 discussion-loop + Phase 6 review-decision-document): (1) SKILL.md body rewritten to ≤60-line deprecation notice with frontmatter version MAJOR bump and description rewritten to a RETIRED sentence naming both replacements with install snippets; (2) marketplace.json plugin loses the retired skill entry; (3) .vscode/settings.json conventionalCommits.scopes loses the retired skill entry; (4) README.md Available skills loses the retired skill entry; (5) README.md Retired skills subsection gains a new bullet (date + name + replacements + no-migration). Reusable for any future legacy-skill retirement."

requirements-completed: [REVW-02, REVW-06, REVW-07, REVW-08, REVW-09]

duration: 8min
completed: 2026-05-21
---

# Phase 6 Plan 02: Review-Spec Pair + review-decision-document Retirement Summary

**`review-spec-auto` (autonomous handoff-grade-bar review against all 8 D50 elements; 6-section findings-first report to inbox/open/) + `review-spec-interactive` (per-element or per-finding ASK-and-TEST walk with anti-sycophancy + decision log + conditional inbox dump) shipped, AND legacy `review-decision-document` soft-retired (SKILL.md body rewritten as a 31-line deprecation notice; frontmatter version 1.1.0 → 2.0.0; folder kept on disk; reverse-registered from marketplace + .vscode scopes + README Available skills; new bullet added to README Retired skills subsection alongside the existing discussion-loop bullet).**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-21T13:19:55Z
- **Completed:** 2026-05-21T13:28:08Z
- **Tasks:** 4
- **Files modified:** 6 (2 created, 1 rewritten, 3 modified)

## Accomplishments

- `review-spec-auto/SKILL.md` ships the autonomous spec review per D82: applies the handoff-grade bar by checking all 8 D50 semantic-contract elements (intended outcome / context / scope-non-scope / expected behavior / constraints / explicit decisions / unresolved questions / acceptance guidance) present and coherent against the Phase 3 spec contract; emits a 6-section findings-first report (Verdict / Findings with severity tags `blocker | issue | nit` mapped from `missing | partial | vague` / Evidence / References / Open Questions / Next Actions) to `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. Cites `skills/spec-auto/SKILL.md` and `skills/spec-interactive/SKILL.md` by absolute path as the contract source. Explicitly acknowledges the legacy `review-decision-document` evolution.
- `review-spec-interactive/SKILL.md` ships the collaborative spec review: per-element walk (recommended default — the 8 D50 elements in canonical sequence) OR per-finding walk (alternative, closer to seeded-discussion); ASKs the user for their view AND TESTs the user's explanation against the spec (D89; explicit "do not just accept" phrasing); five-way settlement (resolved / rejected / accepted / deferred / parked); 4 anti-sycophancy markers carried verbatim from `skills/discussion/SKILL.md` + review-stance amplifier ("a review is most valuable when it disagrees with the author") + handoff-grade heightened framing (bad design captured in the spec becomes expensive in the implementation phase; this is the last cheap moment to push back); decision log at `discussions/<UTC>-<kebab-desc>-decision-log.md` (lazy creation at first settlement); conditional inbox dump at `inbox/open/<UTC>-<kebab-desc>-review-finding.md` per D92/D95 ("no Inbox file when nothing remains"). Cites the Phase 3 spec skills by absolute path.
- Both new skills carry the optional `the-fool` delegation note (D88) — adversarial pressure on a spec is delegated to the external `the-fool` skill; this skill performs the handoff-grade-bar check, NOT the adversarial pass.
- `review-decision-document/SKILL.md` rewritten ENTIRELY as a 31-line deprecation notice: frontmatter `name` unchanged, `description` rewritten to a RETIRED sentence, `metadata.version` bumped 1.1.0 → 2.0.0 (MAJOR per AGENTS.md and Phase 2 discussion-loop precedent); body explicitly states the skill is `retired`, names both replacements (`review-spec-auto` and `review-spec-interactive`) with install snippets, notes that pre-existing review outputs remain valid as-is (no migration), and states that the handoff-grade-bar logic now lives in `review-spec-*` against the locked Phase 3 spec contract. Legacy active-skill body sections (## What to look for / ## Output / ## Discipline / ## Workflow) are gone. The folder remains on disk per the soft-retire pattern.
- All three V1 registration touchpoints updated atomically (six edits total):
  - `marketplace.json`: `JeisKappa-workflow.skills` 21 → 23 (review-spec-auto + review-spec-interactive inserted alphabetically between `review-proposal-interactive` and `seeded-discussion`); `JeisKappa-skills.skills` 8 → 7 (review-decision-document removed). JSON validity preserved.
  - `.vscode/settings.json`: `conventionalCommits.scopes` net 29 → 30 (review-spec-auto + review-spec-interactive added alphabetically; review-decision-document removed; full array remains alphabetically sorted).
  - `README.md`: Available skills 29 → 30 net (review-spec-auto + review-spec-interactive inserted between `review-proposal-interactive` and `spec-auto` heading; review-decision-document block removed); Retired skills subsection gains a new bullet for review-decision-document alongside the existing discussion-loop bullet — both bullets share the same shape (date 2026-05-21 + name in backticks + replacement names in backticks + migration note + soft-retire clause).

## Task Commits

Each task was committed atomically:

1. **Task 1: Author skills/review-spec-auto/SKILL.md** — `605894f` (feat)
2. **Task 2: Author skills/review-spec-interactive/SKILL.md** — `a2fa4d3` (feat)
3. **Task 3: Rewrite skills/review-decision-document/SKILL.md as deprecation notice** — `1de5e7c` (chore)
4. **Task 4: Register review-spec-* (3 touchpoints) + reverse-register review-decision-document** — `a4d7216` (chore)

## Files Created/Modified

- `skills/review-spec-auto/SKILL.md` — autonomous V1 spec review skill; checks all 8 D50 elements; emits 6-section findings-first report to `inbox/open/<UTC>-<kebab-desc>-review-finding.md`; evolves the legacy review-decision-document handoff-grade-bar logic per D82
- `skills/review-spec-interactive/SKILL.md` — collaborative V1 spec review skill; per-element or per-finding ASK-and-TEST walk; emits decision log at `discussions/` + conditional inbox dump at `inbox/open/`; carries the 4 anti-sycophancy markers verbatim from `discussion` + review-stance amplifier + handoff-grade heightened framing
- `skills/review-decision-document/SKILL.md` — REWRITTEN as a 31-line deprecation notice (≤60 line budget); frontmatter `metadata.version` bumped 1.1.0 → 2.0.0 (MAJOR); names both replacements with install snippets; folder kept on disk (soft retire)
- `.claude-plugin/marketplace.json` — JeisKappa-workflow.skills 21 → 23 (review-spec-* added alphabetically); JeisKappa-skills.skills 8 → 7 (review-decision-document removed)
- `.vscode/settings.json` — conventionalCommits.scopes net 29 → 30 (review-spec-* added, review-decision-document removed; alphabetical)
- `README.md` — Available skills net 29 → 30 (review-spec-* inserted before Retired skills subsection; review-decision-document block removed); Retired skills subsection gains a bullet for review-decision-document alongside the existing discussion-loop bullet

## Decisions Made

- **Handoff-grade bar evolves from legacy review-decision-document per D82** — both new skill bodies preserve the legacy framing (a recipient could deliver the same work the author had in mind) but rebind the bar to the locked Phase 3 spec contract (the 8 D50 elements). Both skill bodies explicitly acknowledge the legacy evolution with a backreference to the retired skill so a downstream reader understands the lineage. The literal phrase "evolves" appears in both new skill bodies, satisfying the verify rule on legacy-acknowledgment.
- **Severity mapping `blocker | issue | nit` for spec reviews** — adopted CONTEXT.md's suggested mapping verbatim: missing D50 element = `blocker` (spec cannot be handed downstream without it), partially-covered = `issue` (downstream implementer will hit a wall on the missing sub-aspect), vague-but-present = `nit` (false precision / soft language). All three severity tags appear in both new skill bodies. The same vocabulary was established by Plan 06-01 for review-proposal-* — same shape, different per-target meaning of each severity.
- **Per-element walk as recommended default for review-spec-interactive** — the recommended grain is the 8 D50 elements in canonical sequence, closer to `skills/spec-interactive/SKILL.md`'s element-by-element authoring walk. This produces a natural cross-reference: the spec-interactive authoring conversation walks element 1 → 2 → ... → 8; the review-spec-interactive walk inspects element 1 → 2 → ... → 8 in the emitted artifact. Per-finding walk grain is also documented as an executor-discretion alternative, closer to seeded-discussion's per-point walk; both grain options are explicit so the user can pick.
- **Handoff-grade heightened framing in review-spec-interactive's anti-sycophancy stance** — added explicit prose stating: "Bad design captured in the spec becomes expensive in the implementation phase because the downstream consumers — humans and agents — will not have you to ask follow-ups. This is the last cheap moment to push back." This is the spec-review equivalent of `plan-strict-interactive`'s strict-stakes amplifier and `implement-interactive`'s execution-time amplifier — a heightened framing tied to where in the workflow this review sits (just before planning / implementation; once the spec is escalated, unflagged findings compound).
- **Frontmatter version bump 1.1.0 → 2.0.0 for review-decision-document retirement** — matches Phase 2 discussion-loop precedent (1.0.0 → 2.0.0 was the discussion-loop bump; this one starts at 1.1.0 because review-decision-document had received a prior minor bump). MAJOR justified by SemVer convention for behavioral removal (the active skill is gone; the body is now a notice).
- **Deprecation notice body length: 31 lines** — well within the ≤60 total-lines budget per plan and the ≤50 body-content lines per CONTEXT.md. Mirrors the discussion-loop retirement notice structure exactly: top heading explicitly stating retired + 1-paragraph WHY (the handoff-grade-bar logic now lives in review-spec-*) + 2 replacement headings each with a 1-sentence description + an `sh` code fence with the install snippet + a "Pre-existing review outputs" section + a final pointer to V1 reference docs. No legacy active-skill body sections (## What to look for / ## Output / ## Discipline / ## Workflow / ## When the document is genuinely solid) survive.
- **Soft retire: folder kept on disk** — only marketplace registration, .vscode scope, and README Available-skills entry are pulled. New installs see no review-decision-document option in `npx skills list`. Existing installs still resolve the folder and find the deprecation notice with install snippets pointing to the replacements. This matches Phase 2's discussion-loop soft-retire shape exactly.
- **Retired skills README bullet structure mirrors discussion-loop's bullet exactly** — same shape: `**` + name in backticks + `**` + " — retired " + literal date + ". " + 1-sentence "evolved into <new>" + soft-retire clause ("legacy folder remains on disk") + no-migration clause. The two retired bullets now share the same structural template, which makes the Retired subsection scannable.

## Deviations from Plan

None — both new skill authoring tasks landed cleanly on the first verify pass; the retirement rewrite landed at 31 lines (well under the 60-line budget); Task 4's six atomic edits across marketplace.json + .vscode/settings.json + README.md all passed every automated verify check (workflow plugin count, skills plugin count, scope count, scope alphabetical sort, README heading counts, install-snippet counts, removed-block absence, Retired-skills subsection content, position-before-Retired ordering, folder-still-on-disk soft-retire) on the first run.

The plan instructed that "[the executor MAY adopt or refine]" the severity mapping suggestion `missing = blocker / partial = issue / vague = nit`. Both new skill bodies adopt it verbatim — the same mapping as Plan 06-01's review-proposal-* (though the per-target meaning differs: review-proposal-* uses blocker for "cannot escalate downstream" findings; review-spec-* uses blocker for "missing D50 element"). The shared severity vocabulary across the review family is V1 standard.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 06-03 (review-plan-* pair) is unblocked. The V1 review-pair body shape codified by Plans 06-01 and 06-02 is now solidly reusable; the only deltas for Plan 06-03 are (a) the target-specific finding categories (loose-vs-strict plan granularity-fit, per-task ambiguity check for strict plans, source-spec adherence — per D83 / REVW-03), (b) the citation source (Phase 4 `plan-loose-*` / `plan-strict-*` skills instead of Phase 3 spec-* skills), and (c) the loose-vs-strict detection logic in the skill body.
- Plans 06-04 (review-implementation-* + verification note) and 06-05 (review-code-* + adversarial-delegation note) are also unblocked on the shape — both can be drafted from the same anchor pattern.
- After this plan: JeisKappa-workflow plugin sits at 23 entries (Phase 6 target 29 — D85's review-implementation-* + D86's review-code-* + REVW-03's review-plan-* still to ship across Plans 06-03/06-04/06-05); JeisKappa-skills plugin sits at 7 entries (Phase 6 target 7 — final, no further changes to this plugin in Phase 6); .vscode scopes at 30; README Available skills at 30; README Retired skills has 2 entries (discussion-loop from Phase 2 + review-decision-document from THIS plan).
- The handoff-grade-bar evolution is now CLOSED at the registration layer — legacy review-decision-document no longer appears anywhere except the deprecation notice and the Retired-skills bullet, and the new review-spec-* skills carry the same conceptual logic explicitly tethered to the Phase 3 contract. Downstream readers landing in a legacy install via the retired folder find a clear forward pointer; downstream readers landing in a fresh install via `npx skills list` see only the new pair.

---
*Phase: 06-review-family*
*Completed: 2026-05-21*

## Self-Check: PASSED

- Files created: skills/review-spec-auto/SKILL.md, skills/review-spec-interactive/SKILL.md — both FOUND on disk.
- File rewritten: skills/review-decision-document/SKILL.md — FOUND on disk (31 lines; version 2.0.0).
- Files modified: .claude-plugin/marketplace.json, .vscode/settings.json, README.md, .planning/phases/06-review-family/06-02-SUMMARY.md — all FOUND on disk.
- Commits 605894f (feat: review-spec-auto), a2fa4d3 (feat: review-spec-interactive), 1de5e7c (chore: review-decision-document retirement), a4d7216 (chore: 6-edit registration update) — all FOUND in git log.
