---
phase: 06-review-family
plan: 03
subsystem: skills
tags: [review-family, plan-review, four-axis-review, loose-vs-strict-detection, anti-sycophancy, v1-skill-pair, decision-log, review-finding, inbox-open, d59-contract, d60-no-parallelization]

requires:
  - phase: 01-foundations
    provides: V1 thread layout, record-form + versioned-form filename grammar, immutability + ambiguous-reference rules
  - phase: 02-capture-discussion
    provides: discussion + seeded-discussion anti-sycophancy stance (4 markers verbatim), capture-inbox for scope-drift parking, lazy decision-log creation pattern
  - phase: 04-plan-family
    provides: plan-loose-auto + plan-loose-interactive + plan-strict-auto + plan-strict-interactive — emit the plan artifacts this pair reviews; the D58 user-choice-not-default loose-vs-strict framing; the D59 sequential-isolated-independent-implementable contract; the D60 no-parallelization rule; the strict six-field per-task contract (Objective / Input / Steps / Files modified / Verification / Acceptance criteria); adjust-plan-granularity-auto + adjust-plan-granularity-interactive for granularity-shift recommendations from review findings
  - plan: 06-01
    provides: V1 review-pair body shape (auto + interactive); 6-section findings-first report shape; per-finding walk loop with D89 ASK-AND-TEST do-not-just-accept phrasing; 4-marker anti-sycophancy carry-over + review-stance amplifier pattern; D92/D95 conditional inbox-dump rule
  - plan: 06-02
    provides: Per-element (or per-finding) walk grain choice in interactive review siblings; severity mapping (missing = blocker / partial = issue / vague = nit) reusable shape; handoff-grade-amplifier framing reusable for the plan-stage stakes amplifier (bad design captured in the plan becomes expensive during implementation)

provides:
  - skills/review-plan-auto/SKILL.md (autonomous V1 plan review against four D83 axes — source-spec adherence + project conventions + granularity fit + per-task ambiguity; loose-vs-strict detection step gates the per-task-ambiguity mode; 6-section findings-first report emitted to inbox/open/<UTC>-<kebab-desc>-review-finding.md; D59/D60 enforced)
  - skills/review-plan-interactive/SKILL.md (collaborative V1 plan review with per-finding or per-task walk against the same four D83 axes; 4 anti-sycophancy markers verbatim + review-stance amplifier + plan-stage stakes amplifier; D89 ASK-AND-TEST do-not-just-accept; decision log at discussions/<UTC>-<kebab-desc>-decision-log.md + conditional inbox dump at inbox/open/<UTC>-<kebab-desc>-review-finding.md per D92/D95)
  - Loose-vs-strict detection step in a review skill body — first instance in Phase 6; cited by absolute path to skills/plan-loose-auto/SKILL.md AND skills/plan-strict-auto/SKILL.md as the granularity-shape sources

affects: [phase-06-plan-04-review-implementation, phase-06-plan-05-review-code, phase-07-merge-finish-navigation]

tech-stack:
  added: []
  patterns:
    - "Four-axis plan review per D83 — source-spec adherence (with optional source-artifact input; skipped with Open-Questions note when not supplied) + project conventions + granularity fit + per-task ambiguity (mandatory for strict plans; granularity-fit signal for loose plans). Each axis carries explicit severity heuristics tethered to downstream impact (what does the implementer have to guess about?)"
    - "Loose-vs-strict detection step in a review skill body — reads the plan body, identifies whether tasks carry 1–3 sentence loose descriptions or six-field strict blocks (Objective / Input / Steps / Files modified / Verification / Acceptance criteria), and routes the per-task-ambiguity axis to MANDATORY-strict or granularity-fit-signal-loose mode. Mixed-granularity body is flagged as an issue under the granularity-fit axis. Cites skills/plan-loose-auto/SKILL.md AND skills/plan-strict-auto/SKILL.md by absolute path as the shape sources."
    - "D59 sequential-isolated-independent contract enforced as review criterion — failures (shared cross-task state, not-independently-reviewable, requires-multiple-sittings) are blocker findings; verbatim phrase 'sequential, isolated, independently implementable' carried in both skill bodies"
    - "D60 no-parallelization rule enforced as review criterion — ANY wave numbers / dependency arrays / depends_on fields / task-graph notation / fork-join syntax / bracketed wave prefixes on tasks in the plan body is a blocker finding. Both skill bodies use descriptive prose phrases ('bracketed wave prefixes on tasks', 'dependency arrays', 'depends_on fields') when naming the forbidden constructs in their own prose — no literal [Wn] / unquoted depends_on: tokens that would self-trigger the executor's structural-notation negative grep (Phase 4 lesson)"
    - "Optional source-artifact input — second input slot accepts a spec / proposal / decision-log / GitHub issue / raw prompt; drives the source-spec-adherence axis; when NOT supplied that axis is skipped with an explicit Open-Questions note. The other three axes still run. Same five input forms as Phase 4 plan-* skills."
    - "Plan-stage stakes amplifier in review-plan-interactive's anti-sycophancy stance: 'bad design captured in the plan becomes expensive during implementation because the implementer — human or agent — will not have you in the loop to ask follow-ups; commits land before the implementer asks follow-ups'. Plan-review equivalent of review-spec-interactive's handoff-grade heightened framing — the asymmetry is between cheap-now (push back during the walk) vs expensive-later (rewinding committed work in Phase 5)"
    - "Per-finding OR per-task walk grain choice in review-plan-interactive — executor's discretion; per-finding default when findings cluster across the four axes (cross-task drift, granularity mis-fit, D59/D60 violations); per-task default when most findings are per-task ambiguity on a strict plan. Same flexible-grain pattern established by review-spec-interactive (Plan 06-02) — only the recommended-default rationale differs."

key-files:
  created:
    - skills/review-plan-auto/SKILL.md
    - skills/review-plan-interactive/SKILL.md
  modified:
    - .claude-plugin/marketplace.json (JeisKappa-workflow.skills 23 → 25; both new skills inserted alphabetically between propose-interactive and review-proposal-auto; JeisKappa-skills unchanged at 7)
    - .vscode/settings.json (conventionalCommits.scopes 30 → 32; review-plan-auto + review-plan-interactive inserted alphabetically; array remains alphabetically sorted)
    - README.md (Available skills 30 → 32; both new entries inserted between propose-interactive and review-proposal-auto, above ## Retired skills)

key-decisions:
  - "Four-axis review per D83 — source-spec adherence + project conventions + granularity fit + per-task ambiguity. The per-task-ambiguity axis is MANDATORY on strict plans (where the six-field block must leave no inference required) and a granularity-fit signal on loose plans (where ambiguity hiding required inference suggests the plan should be strict). Both skill bodies enumerate the four axes by name with per-axis severity heuristics."
  - "Loose-vs-strict detection lives in a dedicated section in both skill bodies — citing skills/plan-loose-auto/SKILL.md AND skills/plan-strict-auto/SKILL.md by absolute path as the shape sources. The detection determines per-task-ambiguity mode and informs granularity-fit findings."
  - "Optional source-artifact input — when not supplied, the source-adherence axis is skipped with an explicit Open-Questions note rather than the skill inventing a source or silently picking the latest spec. Honors the docs/workflow/v1/immutability.md ambiguous-reference-resolution rule (ASK; do not pick by recency)."
  - "Severity vocabulary unchanged: `blocker | issue | nit`. Same shape as Plans 06-01 / 06-02. Per-target meaning of severity differs (e.g., blocker here is 'plan cannot reasonably reach implementation in this shape'; in 06-02 it was 'spec cannot be handed downstream')."
  - "Settlement vocabulary unchanged: `resolved | rejected | accepted | deferred | parked`. Same shape as Plans 06-01 / 06-02. Resolved+rejected stay in the decision log; accepted+deferred+parked dump to inbox/open/ at end-of-session per D92/D95."
  - "D60 no-parallelization rule enforced with descriptive prose only — both skill bodies name the forbidden constructs ('bracketed wave prefixes on tasks', 'dependency arrays', 'depends_on fields', 'task-graph notation', 'fork/join syntax', 'parallelization markers') without re-typing literal [Wn] / unquoted depends_on: tokens in skill prose. This is the Phase 4 regression guard — those tokens self-trigger the executor's structural-notation negative grep when they appear unquoted in the skill body itself (not just in evidence quotations)."
  - "Plan-stage stakes amplifier wording: 'bad design captured in the plan becomes expensive during implementation because the implementer — human or agent — will not have you in the loop to ask follow-ups; commits land before the implementer asks follow-ups'. Mirrors review-spec-interactive's handoff-grade amplifier in shape; the asymmetry is plan-stage-specific (the next stage is Phase 5 implementation where V1 implementers do not rewrite history — commits become expensive to rewind)."
  - "Walk grain flexibility — per-finding OR per-task walk in review-plan-interactive, executor's discretion. Per-finding default when findings cluster across axes; per-task default when most findings are per-task ambiguity on a strict plan (the per-task walk surfaces each task's six-field block in order). Same flexible-grain pattern as review-spec-interactive (per-element or per-finding); only the recommended-default rationale differs."
  - "Decision log file naming: <plan-slug>-v<N>-review or plan-review-<topic>; review-finding file naming: <plan-slug>-v<N>-review or <plan-slug>-review followed by a phrase capturing the highest-impact axis. Skill bodies ask the interactive sibling to confirm slug with user before first settlement; auto sibling treats plan slug + version as authoritative."

patterns-established:
  - "review-plan-* body shape: opening clarifier naming sibling + Phase 4 plan-* family (all 6 plan-authoring skills by name) + Phase 6 review siblings (review-spec-* upstream, review-implementation-* downstream); Inputs section naming required plan path + optional source-artifact path with ambiguity fallback per docs/workflow/v1/immutability.md; Loose vs Strict Detection section citing skills/plan-loose-auto/SKILL.md AND skills/plan-strict-auto/SKILL.md by absolute path; What This Skill Reviews enumerating the four D83 axes with per-axis severity heuristics + D59 contract acknowledgment with verbatim phrase + D60 no-parallelization acknowledgment with descriptive prose phrases; Findings Report Shape with 6 required sections (Verdict / Findings / Evidence / References / Open Questions / Next Actions); Output Artifact naming inbox/open/<UTC>-<kebab-desc>-review-finding.md per Phase 1 record-form grammar; Workflow with READ-ONLY-plan-read + optional-source-read + axis-sequence + D59/D60 checks + UTC-stamp + write; Commit Policy NEVER auto-commits; Immutability citing docs/workflow/v1/immutability.md by absolute path. Interactive sibling adds Anti-Sycophancy Stance (4 markers verbatim + review-stance amplifier + plan-stage stakes amplifier) + Walk Format (per-finding OR per-task, executor's discretion) + Output Artifacts (always decision-log; conditional review-finding per D92/D95) + Decision Log Lazy Creation + Scope Drift section. Pattern reusable verbatim by Plans 06-04 (review-implementation-*) and 06-05 (review-code-*) with the target-specific axis enumeration."
  - "Phase 4 regression guard reinforced in Phase 6 — descriptive prose phrases (NOT literal token strings) for D60 forbidden constructs in skill bodies. The executor's automated verify rule runs '! grep -qE \"\\[W[0-9]+\\]|^wave:|^depends_on:\"' against the entire skill body. Literal tokens like '[W1]', '[W2]', or unquoted 'depends_on:' in prose trigger false positives even when used to NAME the forbidden construct. The forbidden construct is still named, the D60 citation is still present, the prohibition language is unchanged — only the surface tokens differ. Important for Plans 06-04 and 06-05 if they also need to enforce D60-style contracts."
  - "Four-axis plan-review pattern reusable verbatim by review-implementation-* (Plan 06-04) and review-code-* (Plan 06-05) with the target-specific axis enumeration — review-implementation-* will check source-spec adherence (does the diff implement what the source artifact promised?) + project conventions + commit-cadence-vs-plan + per-commit ambiguity; review-code-* will check code quality + safety + idiomatic-fit + regression-risk axes (no source-artifact dependency per D86). The pattern of {open-clarifier + four-axis enumeration + D59/D60 contract acknowledgment + 6-section report + conditional-inbox dump} transfers verbatim; only the axis content differs."

requirements-completed: [REVW-03, REVW-06, REVW-07, REVW-08]

duration: 8min
completed: 2026-05-21
---

# Phase 6 Plan 03: Review-Plan Pair Summary

**`review-plan-auto` (autonomous four-axis plan review per D83 — source-spec adherence + project conventions + granularity fit + per-task ambiguity; loose-vs-strict detection routes the per-task-ambiguity axis to MANDATORY-strict or granularity-fit-signal-loose mode; 6-section findings-first report to inbox/open/) + `review-plan-interactive` (per-finding OR per-task ASK-and-TEST walk with anti-sycophancy 4 markers verbatim + review-stance amplifier + plan-stage stakes amplifier; decision log + conditional inbox dump per D92/D95) shipped as the third paired-review plan in Phase 6; pattern continuity with Plans 06-01 and 06-02 codified; loose-vs-strict detection step is the unique twist for the plan target.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-21T13:32:41Z
- **Completed:** 2026-05-21T13:40:46Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `review-plan-auto/SKILL.md` ships the autonomous V1 plan review per D83: detects loose-vs-strict granularity from the plan body (citing `skills/plan-loose-auto/SKILL.md` AND `skills/plan-strict-auto/SKILL.md` by absolute path as the shape sources), then runs the four review axes (source-spec adherence with optional source artifact / project conventions / granularity fit / per-task ambiguity — MANDATORY-strict mode for strict plans, granularity-fit-signal mode for loose plans) tethered to downstream impact. Emits a 6-section findings-first report (Verdict / Findings with severity tags `blocker | issue | nit` / Evidence / References / Open Questions / Next Actions) to `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. Enforces the D59 sequential-isolated-independent contract and the D60 no-parallelization rule as review criteria. When the optional source artifact is NOT supplied, the source-adherence axis is skipped with an explicit `## Open Questions` note rather than the skill silently inventing a source.
- `review-plan-interactive/SKILL.md` ships the collaborative V1 plan review: per-finding OR per-task walk (executor's discretion); ASKs the user for their view AND TESTs the user's explanation against the plan AND the optional source artifact (D89; explicit "do not just accept" phrasing); five-way settlement (resolved / rejected / accepted / deferred / parked); 4 anti-sycophancy markers carried verbatim from `skills/discussion/SKILL.md` + review-stance amplifier ("a review is most valuable when it disagrees with the author") + plan-stage stakes amplifier ("bad design captured in the plan becomes expensive during implementation because the implementer — human or agent — will not have you in the loop to ask follow-ups"); decision log at `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md` (lazy creation at first settlement); conditional inbox dump at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md` per D92/D95 ("no Inbox file when nothing remains").
- Both new skills cite `skills/plan-loose-auto/SKILL.md` AND `skills/plan-strict-auto/SKILL.md` by absolute path as the granularity-shape sources, and reference `skills/adjust-plan-granularity-auto/SKILL.md` / `skills/adjust-plan-granularity-interactive/SKILL.md` as the granularity-shift path when granularity-fit findings recommend a shift.
- Both new skills use DESCRIPTIVE PROSE PHRASES (not literal token strings) when naming the D60 forbidden constructs in their own prose — "bracketed wave prefixes on tasks", "dependency arrays", "depends_on fields", "task-graph notation", "fork/join syntax", "parallelization markers" — to avoid self-triggering the executor's structural-notation negative grep (Phase 4 regression guard). The D60 prohibition is still named, the D60 finding is still defined as a `blocker`, the contract is still in force; only the surface tokens used in skill prose differ.
- All three V1 registration touchpoints updated atomically:
  - `marketplace.json`: `JeisKappa-workflow.skills` 23 → 25 (review-plan-auto + review-plan-interactive inserted alphabetically between `./skills/propose-interactive` and `./skills/review-proposal-auto`); `JeisKappa-skills` unchanged at 7. JSON validity preserved.
  - `.vscode/settings.json`: `conventionalCommits.scopes` 30 → 32 (review-plan-auto + review-plan-interactive added; full array remains alphabetically sorted).
  - `README.md`: Available skills 30 → 32 (both new entries inserted between `propose-interactive` and `review-proposal-auto` heading, above the `## Retired skills` subsection); each entry has heading + description paragraph (with explicit interaction mode per DIST-05; mentions Phase 4 plan-* family by name; mentions four review axes per D83; mentions sibling review-* targets) + fenced `npx skills add` install snippet.
- Pattern continuity: the V1 review-pair body shape codified by Plans 06-01 and 06-02 is reused verbatim. The deltas for this plan are (a) the four-axis enumeration replaces the lightweight gaps/risks/ambiguities of Plan 06-01 and the 8 D50 elements of Plan 06-02, (b) the loose-vs-strict detection step is added as the unique twist for the plan target, (c) the citations point at the Phase 4 plan-* family instead of the Phase 3 spec-* skills, and (d) the optional source-artifact input is added (with explicit skip-axis behavior when not supplied).

## Task Commits

Each task was committed atomically:

1. **Task 1: Author skills/review-plan-auto/SKILL.md** — `5510f3e` (feat)
2. **Task 2: Author skills/review-plan-interactive/SKILL.md** — `c0a2e58` (feat)
3. **Task 3: Register review-plan-auto + review-plan-interactive (3 touchpoints)** — `c6c4536` (chore)

## Files Created/Modified

- `skills/review-plan-auto/SKILL.md` — autonomous V1 plan review skill; detects loose-vs-strict granularity; runs four D83 axes (source-spec adherence + project conventions + granularity fit + per-task ambiguity); enforces D59 sequential-isolated-independent contract + D60 no-parallelization rule; emits 6-section findings-first report to `inbox/open/<UTC>-<kebab-desc>-review-finding.md`.
- `skills/review-plan-interactive/SKILL.md` — collaborative V1 plan review skill; per-finding OR per-task ASK-and-TEST walk; emits decision log at `discussions/` + conditional inbox dump at `inbox/open/`; carries the 4 anti-sycophancy markers verbatim from `discussion` + review-stance amplifier + plan-stage stakes amplifier.
- `.claude-plugin/marketplace.json` — JeisKappa-workflow.skills 23 → 25 (review-plan-* added alphabetically); JeisKappa-skills unchanged at 7.
- `.vscode/settings.json` — conventionalCommits.scopes 30 → 32 (review-plan-* added alphabetically; full array remains alphabetical).
- `README.md` — Available skills 30 → 32 (review-plan-* inserted between `propose-interactive` and `review-proposal-auto` heading, above the `## Retired skills` subsection); each entry has heading + description paragraph + fenced install snippet.

## Decisions Made

- **Four-axis review per D83** — source-spec adherence + project conventions + granularity fit + per-task ambiguity. The per-task-ambiguity axis is MANDATORY on strict plans (where the six-field block must leave no inference required by an agent-leaning implementer) and a granularity-fit signal on loose plans (where ambiguity hiding required inference suggests the plan should be strict for this implementer). Both skill bodies enumerate the four axes by name in a `## What This Skill Reviews` section with per-axis severity heuristics tethered to downstream impact. The four-axis enumeration is the structurally richer review target than Plan 06-01's three-category proposal review (gaps / risks / ambiguities) and the per-element check of Plan 06-02's spec review (8 D50 elements) — appropriate for the plan target's distinctive risk surface.
- **Loose-vs-strict detection** — both skill bodies carry a dedicated `## Loose vs Strict Detection` section citing `skills/plan-loose-auto/SKILL.md` AND `skills/plan-strict-auto/SKILL.md` by absolute path as the granularity-shape sources. The detection reads the plan body and identifies whether tasks carry 1–3 sentence loose descriptions or six-field strict blocks (Objective / Input / Steps / Files modified / Verification / Acceptance criteria). Mixed-granularity bodies are flagged as an issue under the granularity-fit axis. The detection determines whether per-task-ambiguity runs in MANDATORY-strict mode or granularity-fit-signal-loose mode.
- **Optional source-artifact input** — second input slot accepts a spec / proposal / decision-log / GitHub issue / raw prompt. When supplied, drives the source-spec-adherence axis. When NOT supplied, that axis is SKIPPED with an explicit `## Open Questions` note (both skill bodies state this explicitly). The other three axes still run. This honors `docs/workflow/v1/immutability.md`'s ambiguous-reference-resolution rule — the skill does not invent a source artifact, does not silently pick the most recent spec in the thread, and does not run the axis without a confirmed source.
- **Severity vocabulary `blocker | issue | nit`** — adopted verbatim from Plans 06-01 and 06-02 (V1 review-family standard). The mapping is per-axis (e.g., for D59 contract violations, blocker by default; for project-conventions drift, blocker when result will not function in the project's layout, issue when implementer will produce work that does not fit, nit when difference is small and may be acceptable; for per-task ambiguity, severity scales with how much inference the implementer would have to do).
- **D60 no-parallelization rule enforced with descriptive prose phrases only** — both skill bodies name the forbidden constructs ("bracketed wave prefixes on tasks", "dependency arrays", "depends_on fields", "task-graph notation", "fork/join syntax", "parallelization markers") in their own prose without re-typing literal `[Wn]` or unquoted `depends_on:` tokens. The Phase 4 lesson is that the executor's automated verify rule (`! grep -qE '\[W[0-9]+\]|^wave:|^depends_on:'`) runs against the entire skill body, not just worked-example blocks; literal tokens in prose trigger false positives even when used to NAME the forbidden construct. The forbidden construct is still named, the D60 finding is still defined as a `blocker`, the contract is still in force.
- **Plan-stage stakes amplifier wording** — adopted: "bad design captured in the plan becomes expensive during implementation because the implementer — human or agent — will not have you in the loop to ask follow-ups; commits land before the implementer asks follow-ups". Plan-stage variant of `review-spec-interactive`'s handoff-grade amplifier; the asymmetry is plan-stage-specific (the next stage is Phase 5 implementation where V1 implementers do not rewrite history per D77 — once commits land they become expensive to rewind).
- **Walk grain flexibility — per-finding OR per-task** — both grains documented in `review-plan-interactive`'s `## Walk Format` section. Per-finding default when findings cluster across the four axes (cross-task drift, granularity mis-fit, D59/D60 violations); per-task default when most findings are per-task ambiguity on a strict plan (walking task-by-task surfaces each task's six-field block in order). Same flexible-grain pattern as `review-spec-interactive` (per-element or per-finding); only the recommended-default rationale differs.
- **`<kebab-desc>` slug for decision log + review-finding** — recommended `<plan-slug>-v<N>-review` (capturing the plan version reviewed) or `plan-review-<topic>`. The interactive sibling confirms slug with the user before first settlement; the auto sibling treats the plan slug + version as authoritative.
- **No `## The Fool Delegation` section** — per CONTEXT.md, the the-fool delegation hint is recommended only for `review-proposal-*` (Plan 06-01) and `review-spec-*` (Plan 06-02) where adversarial pressure is most useful at the early shape-defining stages. `review-plan-*` does not carry the delegation note in the skill body — the README-level adversarial-delegation note is Plan 06-05's territory. Neither skill body in this plan has a `## The Fool Delegation` section.

## Deviations from Plan

None — both new skill authoring tasks landed cleanly on the first verify pass; the registration task's three atomic edits across marketplace.json + .vscode/settings.json + README.md all passed every automated verify check (workflow plugin count = 25, skills plugin count = 7, scopes count = 32, scopes alphabetically sorted, README heading counts, install-snippet counts, position-before-Retired ordering) on the first run.

The plan's Phase 4 regression guard was honored: both skill bodies used DESCRIPTIVE PROSE PHRASES (e.g., "bracketed wave prefixes on tasks", "dependency arrays", "depends_on fields", "task-graph notation") when naming D60 forbidden constructs, instead of literal `[W1]` / unquoted `depends_on:` tokens. The executor's structural-notation negative grep (`! grep -qE '\[W[0-9]+\]|^wave:|^depends_on:' SKILL.md`) passed on both files on the first run.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 06-04 (review-implementation-* pair + verification note) is unblocked. The V1 review-pair body shape codified by Plans 06-01, 06-02, and 06-03 is now solidly reusable; the only deltas for Plan 06-04 are (a) the target-specific axis enumeration (code-vs-original-intent fidelity replacing source-spec adherence; verification-of-implementation axis subsuming the V1 verify-* role per D85; per-commit cadence vs the plan; project conventions retained; the per-task / per-commit / per-orchestration-cycle ambiguity axis adapted), (b) the citations point at the Phase 5 implement-* family as the source of the four input shapes the implementation review accepts, and (c) the short README verification note that names review-implementation-* as the V1 verification role per CONTEXT.md.
- Plan 06-05 (review-code-* pair + adversarial-delegation note) is also unblocked on the shape — it can be drafted from the same anchor pattern. The deltas for 06-05 are heavier (no source-artifact dependency per D86; general-purpose code review with no fixed source contract; ASK-user-for-areas-of-concern Inputs section), but the {open-clarifier + axis enumeration + 6-section report + conditional inbox dump + decision-log + anti-sycophancy stance (interactive only)} skeleton transfers verbatim.
- After this plan: JeisKappa-workflow plugin sits at 25 entries (Phase 6 target 29 — review-implementation-* + review-code-* still to ship across Plans 06-04 and 06-05); JeisKappa-skills plugin sits at 7 entries (Phase 6 target 7 — final, no further changes to this plugin in Phase 6); .vscode scopes at 32 (Phase 6 target 36 = 27 + 10 new - 1 retired); README Available skills at 32 (same target); README Retired skills subsection unchanged with 2 entries (discussion-loop from Phase 2 + review-decision-document from Plan 06-02).

---
*Phase: 06-review-family*
*Completed: 2026-05-21*

## Self-Check: PASSED

- Files created: skills/review-plan-auto/SKILL.md, skills/review-plan-interactive/SKILL.md — both FOUND on disk.
- Files modified: .claude-plugin/marketplace.json, .vscode/settings.json, README.md, .planning/phases/06-review-family/06-03-SUMMARY.md — all FOUND on disk.
- Commits 5510f3e (feat: review-plan-auto), c0a2e58 (feat: review-plan-interactive), c6c4536 (chore: register 3 touchpoints) — all FOUND in git log.
