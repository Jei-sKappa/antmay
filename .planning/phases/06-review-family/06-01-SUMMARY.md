---
phase: 06-review-family
plan: 01
subsystem: skills
tags: [review-family, proposal-review, anti-sycophancy, v1-skill-pair, decision-log, review-finding, the-fool-delegation, inbox-open]

requires:
  - phase: 01-foundations
    provides: V1 thread layout, record-form filename grammar (review-finding + decision-log artifact-type tokens), immutability + ambiguous-reference rules
  - phase: 02-capture-discussion
    provides: discussion + seeded-discussion anti-sycophancy stance (4 markers), capture-inbox for scope-drift parking, lazy decision-log creation pattern
  - phase: 03-forward-spine
    provides: propose-auto + propose-interactive — emit the proposal artifacts this pair reviews; paired auto+interactive skill body shape

provides:
  - skills/review-proposal-auto/SKILL.md (autonomous proposal review; findings-first 6-section report; emits to inbox/open/<UTC>-<kebab-desc>-review-finding.md)
  - skills/review-proposal-interactive/SKILL.md (collaborative proposal review; per-finding ASK-and-TEST walk; emits decision log + conditional inbox dump)
  - V1 review-pair body shape (lightweight proposal review per D81) reusable by 06-02..06-05
  - 6-section findings-first report shape (Verdict / Findings / Evidence / References / Open Questions / Next Actions) per D90/D91/REVW-06
  - Per-finding walk loop (surface -> cite -> ASK -> TEST -> settle -> log) per D89/REVW-07
  - Conditional inbox-dump rule per D92/D95 (no Inbox file when nothing remains; resolved+rejected stay in decision log only)
  - 4-marker anti-sycophancy carry-over + review-stance amplifier pattern for interactive review siblings
  - The-fool delegation note per D88/REVW-09 — adversarial pass delegated to external the-fool skill

affects: [phase-06-plan-02-review-spec, phase-06-plan-03-review-plan, phase-06-plan-04-review-implementation, phase-06-plan-05-review-code, phase-07-merge-finish-navigation]

tech-stack:
  added: []
  patterns:
    - "V1 review-pair body shape (auto + interactive) — first instance, applies to all 5 review targets in Phase 6"
    - "6-section findings-first report (Verdict / Findings (severity blocker|issue|nit) / Evidence / References / Open Questions / Next Actions) — established here as the V1 standard"
    - "Per-finding walk loop in interactive review siblings — modeled on seeded-discussion's four-element pattern (Decision / What you need to know / Options / Recommendation), adapted as surface → cite-evidence → ASK → TEST → settle → log"
    - "D89 ASK-AND-TEST phrasing (ask user's view AND test that view against the artifact; do not just accept) in every interactive review sibling"
    - "Five-way settlement vocabulary: resolved / rejected / accepted / deferred / parked — resolved+rejected stay in decision log only; accepted/deferred/parked dump to inbox/open/ at end-of-session"
    - "D92/D95 conditional inbox dump (no Inbox file when nothing remains) — emit only when at least one unresolved actionable finding remains; final message states explicitly whether the dump was written"
    - "4-marker anti-sycophancy stance carried verbatim from skills/discussion/SKILL.md into interactive review siblings"
    - "Review-stance amplifier in interactive review siblings (a review is most valuable when it disagrees with the author; push back hard on weak reasoning; never soften findings because user pushes back) — review-skill equivalent of plan-strict-interactive's strict-stakes amplifier and implement-interactive's execution-time amplifier"
    - "The-fool delegation note per D88 — adversarial pressure on V1 review artifacts delegated to the external the-fool skill; no native V1 adversarial-review skill"
    - "Lightweight review per D81 — proposal review surfaces gaps/risks/ambiguities ONLY; semantic-contract coverage stays in review-spec-* etc."

key-files:
  created:
    - skills/review-proposal-auto/SKILL.md
    - skills/review-proposal-interactive/SKILL.md
  modified:
    - .claude-plugin/marketplace.json (JeisKappa-workflow.skills 19 → 21)
    - .vscode/settings.json (conventionalCommits.scopes 27 → 29, alphabetically sorted)
    - README.md (Available skills 27 → 29; both new entries inserted before Retired skills subsection)

key-decisions:
  - "Lightweight proposal review only (D81): gaps/risks/ambiguities — explicitly does NOT promise the stricter bar reserved for review-spec-* (that lives in Plan 06-02), source-spec adherence (Plan 06-03), code-vs-original-intent fidelity (Plan 06-04), or general-purpose code review (Plan 06-05)"
  - "The-fool delegation note carried in BOTH skill bodies per D88 + README inline is Plan 06-05's territory — kept short here (executor discretion)"
  - "Severity vocabulary: blocker|issue|nit (lowercase, simple, sortable) — suggested in CONTEXT.md, adopted verbatim in both skill bodies"
  - "Settlement vocabulary: resolved / rejected / accepted / deferred / parked — 5-way split (CONTEXT mentioned 4; added parked as the route to capture-inbox to keep the inbox-only path visible)"
  - "Decision log file naming: <UTC>-<kebab-desc>-decision-log.md where kebab-desc = <proposal-slug>-review or proposal-review-<topic> (executor discretion)"
  - "Review-stance amplifier wording: a review is most valuable when it disagrees with the author; push back hard on weak reasoning; never soften findings just because the user pushes back"

patterns-established:
  - "V1 review-pair body shape established for Phase 6 — opening clarifier with sibling reference + lightweight-vs-stricter-bar framing; Inputs section naming the target artifact path under its canonical folder with ambiguity fallback per docs/workflow/v1/immutability.md; What This Skill Reviews enumerating the target-specific finding categories; Findings Report Shape with all 6 required sections (Verdict / Findings / Evidence / References / Open Questions / Next Actions) in auto siblings + the same 6 sections in conditional inbox-dump of interactive siblings; Output Artifact naming the canonical folder + artifact-type token (review-finding for auto + inbox-dump of interactive; decision-log for primary output of interactive); The Fool delegation note (D88); Workflow with READ-ONLY-input + write-output steps; Commit Policy NEVER auto-commits; Immutability citing Phase 1 docs by absolute path. Interactive variants add Anti-Sycophancy Stance with 4 markers verbatim + review-stance amplifier + Walk Format (per-finding loop modeled on seeded-discussion) + Decision Log Lazy Creation rule + Scope Drift section (capture-inbox / split / defer). Pattern reusable verbatim by Plans 06-02..06-05 — only the review-target-specific finding categories and the optional stricter-bar / adversarial-delegation hint differ."
  - "Per-finding walk grammar for interactive review siblings: 1. Surface (severity + category + why-it-matters); 2. Cite evidence (section heading or short quote, ≤ one sentence); 3. ASK user's view; 4. TEST user's explanation against the artifact (re-read cited section; check whether framing genuinely resolves the finding or only defends it; D89 ASK-AND-TEST do-not-just-accept phrasing); 5. Settle (resolved / rejected / accepted / deferred / parked); 6. Append per-settlement record (## D<N>: <Title> (<severity> · <category>) with Decision: and Rationale: lines; dissent flagged verbatim per anti-sycophancy stance). Reusable by Plans 06-02..06-05 with target-specific severity mappings (e.g., D50-element missing = blocker for review-spec-*, etc.)."
  - "Conditional inbox-dump emission rule (D92/D95): the inbox-open review-finding artifact is written ONLY at end-of-session, ONLY if at least one accepted/deferred/parked finding remains. resolved + rejected findings stay in decision log only. closing message ALWAYS states whether the dump was written (cite path) OR explicitly that no unresolved findings remain (no inbox file written). Reusable by Plans 06-02..06-05."

requirements-completed: [REVW-01, REVW-06, REVW-07, REVW-08]

duration: 6min
completed: 2026-05-21
---

# Phase 6 Plan 01: Review-Proposal Pair Summary

**`review-proposal-auto` (findings-first 6-section report to inbox/open/) + `review-proposal-interactive` (per-finding ASK-and-TEST walk with anti-sycophancy + decision log + conditional inbox dump) shipped as the V1 review-pair pattern anchor for Phase 6's four remaining target-specific plans.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-21T13:08:30Z
- **Completed:** 2026-05-21T13:15:00Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `review-proposal-auto/SKILL.md` ships the autonomous proposal review: 6-section findings-first report (Verdict / Findings with severity tags blocker|issue|nit / Evidence / References / Open Questions / Next Actions) emitted to `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md` per the V1 record-form grammar.
- `review-proposal-interactive/SKILL.md` ships the collaborative proposal review: per-finding walk with the 4 anti-sycophancy markers carried verbatim from `skills/discussion/SKILL.md` + a review-stance amplifier ("a review is most valuable when it disagrees with the author"); D89 ASK-AND-TEST phrasing (`ASK the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept`); five-way settlement (resolved/rejected/accepted/deferred/parked); decision log at `discussions/<UTC>-<kebab-desc>-decision-log.md` (lazy creation at first settlement) + conditional inbox dump at `inbox/open/<UTC>-<kebab-desc>-review-finding.md` (D92/D95: no Inbox file when nothing remains).
- Both skills carry the optional `the-fool` delegation note per D88 — adversarial pressure on a proposal is delegated to the external `the-fool` skill; no native V1 adversarial-review skill.
- All three V1 registration touchpoints updated: marketplace JeisKappa-workflow plugin 19 → 21 entries (both skills inserted alphabetically between `propose-interactive` and `seeded-discussion`); `.vscode/settings.json` conventionalCommits.scopes 27 → 29 (inserted alphabetically, full list remains sorted); README.md Available skills 27 → 29 (both entries inserted between `propose-interactive` and `spec-auto`, above the Retired skills subsection).
- Pattern anchor established: the V1 review-pair body shape codified by these two files is reusable verbatim by Plans 06-02 (review-spec-*), 06-03 (review-plan-*), 06-04 (review-implementation-*), and 06-05 (review-code-*) — only the target-specific finding categories and optional adversarial-delegation hint differ.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author skills/review-proposal-auto/SKILL.md** — `ef71830` (feat)
2. **Task 2: Author skills/review-proposal-interactive/SKILL.md** — `a60318d` (feat)
3. **Task 3: Register review-proposal-auto + review-proposal-interactive (3 touchpoints)** — `eb14197` (chore)

## Files Created/Modified

- `skills/review-proposal-auto/SKILL.md` — autonomous V1 proposal review skill; emits 6-section findings-first report to `inbox/open/<UTC>-<kebab-desc>-review-finding.md`
- `skills/review-proposal-interactive/SKILL.md` — collaborative V1 proposal review skill; per-finding ASK-and-TEST walk; emits decision log at `discussions/` + conditional inbox dump at `inbox/open/`
- `.claude-plugin/marketplace.json` — JeisKappa-workflow.skills 19 → 21 (both new skills inserted alphabetically); JeisKappa-skills unchanged at 8
- `.vscode/settings.json` — conventionalCommits.scopes 27 → 29 (alphabetically sorted)
- `README.md` — Available skills 27 → 29 (both entries inserted between `propose-interactive` and `spec-auto`, above `## Retired skills`)

## Decisions Made

- **Lightweight proposal review only per D81** — both skill bodies explicitly state that semantic-contract coverage, source-spec adherence, code-vs-original-intent fidelity, and general-purpose code review are out of scope here (those live in the four other review-* pairs Plans 06-02..06-05 ship). The plan instructed the executor to AVOID the literal phrase "handoff-grade" to keep the negative grep happy; both skill bodies use "the stricter bar for handing a spec downstream" instead, which carries the same semantic without tripping the verify rule.
- **Severity vocabulary `blocker | issue | nit`** — CONTEXT.md suggested it; both skill bodies adopt it verbatim. The mapping is informally executor's discretion (e.g., blocker = the proposal cannot reasonably escalate downstream without addressing this) so individual reviews can adapt without changing the vocabulary.
- **Settlement vocabulary `resolved | rejected | accepted | deferred | parked` (5-way)** — CONTEXT.md mentioned 4 (resolved/rejected/accepted/deferred). Added `parked` as a settlement that explicitly routes via `skills/capture-inbox/SKILL.md` rather than the inbox-open dump — this keeps the capture-inbox path visible in the walk format without forcing a separate skill invocation for every accepted finding. Resolved+rejected findings stay in the decision log; accepted+deferred+parked dump to inbox/open/ at end-of-session.
- **`<kebab-desc>` slug for decision log** — recommended `<proposal-slug>-review` or `proposal-review-<topic>`; skill body asks executor to confirm with the user before the first settlement. Same shape applies for the inbox-open dump's slug.
- **Review-stance amplifier wording** — adopted CONTEXT.md's verbatim recommendation: "a review is most valuable when it disagrees with the author; push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back". Stated twice in the anti-sycophancy stance section to give the amplifier prominence (once at the top of the stance opening, once at the end of the closing bullet on evidence-owned settlements).
- **`the-fool` delegation note kept short in BOTH skill bodies** — README.md inline note about adversarial delegation is Plan 06-05's territory per CONTEXT.md; this plan only adds the per-skill body notes. Both skill bodies have a dedicated `## The Fool Delegation` section (short, one-paragraph) plus a cross-reference in `## Next Actions` of the auto sibling and in the workflow of the interactive sibling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Verify-rule conformance] Removed "handoff-grade" mentions from `review-proposal-auto/SKILL.md`**

- **Found during:** Task 1 verification pass
- **Issue:** The plan's automated verify rule includes `! grep -qiE 'handoff-grade' skills/review-proposal-auto/SKILL.md` — meaning ANY mention of "handoff-grade" trips the rule. The initial draft included two mentions, both NEGATIVE statements ("the handoff-grade bar lives in `review-spec-*`, NOT here", and "does NOT promise a handoff-grade bar"). Both were intended to differentiate from `review-spec-*` per the plan's discipline instruction "Do NOT promise handoff-grade-bar coverage". Verify rule did not distinguish positive vs negative mentions.
- **Fix:** Replaced "handoff-grade bar" with "the stricter bar for handing a spec downstream" (line 11) and "semantic-contract coverage against the Phase 3 spec contract" (line 33). Both rephrasings carry the same semantic differentiation (this skill is lighter; the stricter check lives in `review-spec-*`) without tripping the verify rule. The interactive sibling also uses "the stricter bar for handing a spec downstream" for consistency.
- **Files modified:** `skills/review-proposal-auto/SKILL.md`
- **Verification:** Verify rule passes — `! grep -qiE 'handoff-grade' skills/review-proposal-auto/SKILL.md` succeeds; the auto skill differentiates from review-spec-* using "stricter bar" / "semantic-contract coverage" phrasing instead.
- **Committed in:** `ef71830` (Task 1 commit — the fix happened before the commit landed)

---

**Total deviations:** 1 auto-fixed (1 verify-rule conformance)
**Impact on plan:** Minor wording adjustment. No semantic change — both skill bodies still clearly differentiate the lightweight proposal review (this plan) from the stricter spec review (Plan 06-02's territory). No scope creep.

## Issues Encountered

None — both skill body authoring tasks landed cleanly after the Task 1 wording fix above; Task 3 registration touched all three files atomically and passed every automated verify check on the first run.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 06-02 (review-spec-* pair + review-decision-document retirement) is unblocked. The V1 review-pair body shape codified here is reusable verbatim; the only deltas are (a) the target-specific finding categories (Plan 06-02 reviews against the 8 D50 semantic-contract elements with the suggested severity mapping `missing = blocker / partially-covered = issue / vague-but-present = nit` per CONTEXT.md ## Specific Ideas), (b) the addition of explicit citations to `skills/spec-auto/SKILL.md` and `skills/spec-interactive/SKILL.md` as the spec-contract source, and (c) the legacy `review-decision-document` soft-retirement (3 reverse-registration touchpoints + Retired-skills subsection update) attached to the same plan per CONTEXT.md plan grouping.
- Plans 06-03, 06-04, 06-05 are also unblocked on the shape — they can be drafted in parallel from the same anchor pattern.
- After this plan: JeisKappa-workflow plugin sits at 21 entries (Phase 6 target 29; 8 more to ship across Plans 06-02..06-05); .vscode scopes at 29 (Phase 6 target 36 = 27 + 10 new - 1 retired); README Available skills at 29 (same target).

---
*Phase: 06-review-family*
*Completed: 2026-05-21*

## Self-Check: PASSED

- Files created: skills/review-proposal-auto/SKILL.md, skills/review-proposal-interactive/SKILL.md — both FOUND on disk.
- Files modified: .claude-plugin/marketplace.json, .vscode/settings.json, README.md, .planning/phases/06-review-family/06-01-SUMMARY.md — all FOUND on disk.
- Commits ef71830 (feat: review-proposal-auto), a60318d (feat: review-proposal-interactive), eb14197 (chore: register 3 touchpoints) — all FOUND in git log.
