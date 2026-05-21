---
phase: 03-forward-spine-propose-and-spec
plan: 01
status: complete
subsystem: forward-spine
tags: [propose, v1-workflow, spine, freeform-proposal, anti-sycophancy]
requirements:
  - PROP-01
  - PROP-02
  - PROP-03
dependency_graph:
  requires:
    - "Phase 1 canonical docs: docs/workflow/v1/{README,thread-layout,filename-grammar,immutability}.md"
    - "Phase 2 pattern source: skills/discussion/SKILL.md, skills/seeded-discussion/SKILL.md, skills/capture-inbox/SKILL.md"
    - "JeisKappa-workflow marketplace plugin baseline (Phase 1 Plan 03)"
  provides:
    - "skills/propose-auto/SKILL.md — V1 spine forward propose generator (autonomous)"
    - "skills/propose-interactive/SKILL.md — V1 spine forward propose generator (interactive, anti-sycophancy)"
    - "Registration touchpoints completed: 4-touchpoint rule satisfied per CLAUDE.md"
  affects:
    - "Plan 03-02 will follow this same paired-skill emission pattern for spec-auto + spec-interactive"
    - "Plan 04 plan-* family can chain off proposals as input (`propose → spec → plan`)"
tech_stack:
  added: []
  patterns:
    - "Forward-spine paired emission (auto + interactive in one plan)"
    - "Suggested-not-enforced 4-element structure for freeform artifact authoring"
    - "Anti-sycophancy stance carried verbatim from discussion/SKILL.md (4 marker phrases preserved)"
    - "D93 no-auto-decision-log default for artifact-producing interactive skills"
key_files:
  created:
    - skills/propose-auto/SKILL.md
    - skills/propose-interactive/SKILL.md
  modified:
    - .claude-plugin/marketplace.json
    - .vscode/settings.json
    - README.md
decisions:
  - id: SKILL-VOICE-MIRROR-DISCUSSION
    decision: "propose-interactive's Anti-Sycophancy Stance mirrors the 8-bullet structure from discussion/SKILL.md verbatim with all 4 marker phrases preserved; prefatory paragraph adapted to reference proposal authoring instead of decision logging"
    rationale: "Per CONTEXT.md decisions section — both interactive forward-spine skills MUST carry the V1 anti-sycophancy stance from Phase 2; consistency across discussion + propose-interactive makes the voice recognizable and the discipline reusable"
  - id: REFUSE-TO-LOG-DUAL-CASE
    decision: "propose-interactive includes both the capital-R bullet 'Refuse to log…' and a lowercase 'refuse to log it silently' sentence (mirroring discussion/SKILL.md lines 25 + 73)"
    rationale: "Source discussion skill carries both forms; preserves the discipline cleanly and matches the case-sensitive grep gate in the plan's acceptance criteria"
  - id: D93-WARRANT-LANGUAGE
    decision: "propose-interactive's Decision Log section explicitly states the default is NO decision log, with a warrant-based escape valve when durable trade-offs or rejected alternatives emerge"
    rationale: "Per D93 — interactive artifact-producing skills do not auto-write a separate decision log; most authoring is captured in the proposal body's Open questions and Rough shape sections"
  - id: SUGGESTED-STRUCTURE-FRAMING
    decision: "Both skills frame the 4-element structure (intent / context / rough shape / open questions) as 'suggested — adapt as needed; not a template; not mandatory; not enforced' with explicit examples of dropping, adding, or reordering elements"
    rationale: "Per PROP-03 and D36+D37 — proposal artifact format is freeform markdown; semantic contract only, no template enforcement; users can ship a 2-element proposal or a 5-element one"
metrics:
  duration: 6min
  completed: 2026-05-21
  tasks_completed: 3
  files_changed: 5
  commits: 3
patterns_established: |
  Paired-skill V1 spine emission for forward-direction artifact generators: one auto skill (pure generator from input → artifact, no clarifying questions, no anti-sycophancy section) plus one interactive sibling (collaborative element-by-element walk, anti-sycophancy carried verbatim from discussion/SKILL.md, D93 no-auto-decision-log default, capture-inbox referenced for scope drift). Both skills emit the same single artifact-type (proposal in this plan; spec/plan/etc. in downstream plans) under the same target folder using the V1 record-form or versioned-form filename grammar with mandatory artifact-type suffix. Both skills cite all three Phase 1 canonical docs by absolute path. Both skills NEVER auto-commit. Registration follows the 4-touchpoint rule (skill folder + marketplace.json under JeisKappa-workflow + .vscode scopes + README Available skills entry) — three of those touchpoints land in a single registration commit, the skill bodies in two prior per-skill commits. This pattern applies directly to Plan 03-02 (spec-auto + spec-interactive under specs/) and to Plan 4 (plan-loose-* + plan-strict-* under plans/) and to any future paired forward-direction skill emission.
---

# Phase 3 Plan 01: Propose-* Family (Forward Spine — Upstream Half) Summary

Two new V1 spine skills shipped — `propose-auto` (pure freeform proposal generator) and `propose-interactive` (collaborative 4-element walk-through) — plus the three shared registration touchpoints (marketplace.json, .vscode/settings.json, README.md). After this plan, a V1 user can drive "rough idea → freeform proposal" entirely with V1 spine skills.

## What Was Built

### `skills/propose-auto/SKILL.md` (new)

Autonomous generator: reads a rough prompt (or referenced artifact), resolves the active V1 thread per `docs/workflow/v1/thread-layout.md`, derives a kebab-case slug from the prompt, captures a 12-character UTC stamp at write time per `docs/workflow/v1/filename-grammar.md`, drafts the proposal body using the SUGGESTED 4-element structure (intent / context / rough shape / open questions) framed as adapt-as-needed-not-enforced, then writes `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md` (proposal artifact-type suffix mandatory) and confirms with the artifact path. No clarifying questions. Never auto-commits. No Anti-Sycophancy section (the interactive sibling owns that discipline — auto skills are pure generators with no decision-influencing interaction).

Sections: top heading, `## Workflow` (6 numbered steps), `## Suggested Structure`, `## Filename and Folder`, `## Commit Policy`, `## Immutability`. 66 lines including frontmatter.

### `skills/propose-interactive/SKILL.md` (new)

Collaborative generator: same thread-resolution and filename-grammar rules as `propose-auto`, but walks the user through the 4 suggested elements one at a time, accepts freeform answers per element, pushes back per the carried-over anti-sycophancy stance, then assembles the body and writes the artifact. Anti-Sycophancy Stance section reproduces the 8-bullet structure from `skills/discussion/SKILL.md` with the prefatory paragraph adapted for proposal authoring; all 4 marker phrases are preserved verbatim:

| Marker phrase                  | grep count in propose-interactive |
| ------------------------------ | --------------------------------- |
| `make them feel good`          | 1                                 |
| `Disagree when you disagree`   | 1                                 |
| `pushback as correctness`      | 1                                 |
| `refuse to log`                | 1                                 |

D93 compliance: a separate decision log is NOT auto-written — only emerges when durable trade-offs or rejected alternatives surface during the walk that cannot reasonably live in the proposal body's Open questions or Rough shape sections. Decision logs, when warranted, follow the same record-form grammar and the append-only single-record shape from `discussion` / `seeded-discussion`. Scope drift section references `capture-inbox` for parking off-topic branches (preferred), splitting into a new proposal/discussion (when warranted), or deferring.

Sections: top heading, `## Anti-Sycophancy Stance`, `## Workflow` (6 numbered steps), `## Decision Log`, `## Scope Drift`, `## Filename and Folder`, `## Commit Policy`, `## Immutability`. 95 lines including frontmatter.

### Registration touchpoints (modified)

| File                              | Before | After | Change                                                                          |
| --------------------------------- | ------ | ----- | ------------------------------------------------------------------------------- |
| `.claude-plugin/marketplace.json` | 3      | 5     | JeisKappa-workflow.skills gains propose-auto + propose-interactive (alphabetical) |
| `.vscode/settings.json` (scopes)  | 11     | 13    | conventionalCommits.scopes gains both scopes (alphabetical)                     |
| `README.md` (Available skills)    | 11     | 13    | Two new entries appended after seeded-discussion, before Retired skills         |

JeisKappa-skills plugin remains at 8 entries (unchanged). README's `## Retired skills` subsection with the `discussion-loop` bullet is preserved.

## Anti-Sycophancy Preservation (PROP-02)

Confirmed via case-sensitive grep against `skills/propose-interactive/SKILL.md`. All four marker phrases from the canonical `skills/discussion/SKILL.md` source appear verbatim. propose-auto, by contrast, contains zero matches for "Anti-Sycophancy" — the discipline belongs to the interactive variant only (auto skills do not influence design decisions and so do not need the stance).

## derive-spec Boundary (Phase 3 Scope)

`skills/derive-spec/SKILL.md` was NOT modified. The SPEC-04 README clarifier note distinguishing forward `spec-*` (proposal → spec) from reverse `derive-spec` (codebase → spec) lands in Plan 03-02, which owns the spec-* skill emission AND the README forward-vs-reverse note in the same scope. This plan establishes the propose-only half; spec-* + the directionality note follow in the next plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Verification gate fix] Removed literal `Supersedes:` token from propose-auto body**
- **Found during:** Task 1 acceptance gate run (check #18: `grep -iE "Supersedes:|Alternative to:|Forked from:"` returned `1`)
- **Issue:** My initial draft included a sentence "(not by lineage frontmatter — there is no `Supersedes:` field)" which mentioned the literal `Supersedes:` token in a negative context. The acceptance grep does not distinguish positive from negative use — the plan's prohibited-content rule forbids the literal token entirely.
- **Fix:** Rewrote the sentence to: "No source-relation frontmatter is added — lineage lives in filenames and the surrounding thread, not in metadata on the file." Conveys the same prohibition without naming the literal token.
- **Files modified:** `skills/propose-auto/SKILL.md`
- **Commit:** Folded into `876f81f` before commit

**2. [Rule 1 — Verification gate fix] Added lowercase "refuse to log" line in propose-interactive**
- **Found during:** Task 2 acceptance gate run (check #9: `grep -c "refuse to log"` returned `0`)
- **Issue:** My initial draft included only the capital-R bullet `**Refuse to log a proposal element you believe is wrong without flagging it.**` (mirroring `discussion/SKILL.md` line 25). The acceptance criterion was case-sensitive lowercase substring match.
- **Fix:** Added an additional sentence at the end of the Anti-Sycophancy Stance section mirroring `discussion/SKILL.md` line 73's phrasing: "If you believe the user is about to commit a framing into the proposal that is wrong, refuse to log it silently…" The source discussion skill carries both forms; preserving both keeps the discipline parallel.
- **Files modified:** `skills/propose-interactive/SKILL.md`
- **Commit:** Folded into `107006b` before commit

No architectural deviations. No auth gates. No checkpoints.

## Self-Check: PASSED

Verified post-write:

| Claim                                          | Verification                                                        | Result |
| ---------------------------------------------- | ------------------------------------------------------------------- | ------ |
| `skills/propose-auto/SKILL.md` exists          | `test -f skills/propose-auto/SKILL.md`                              | FOUND  |
| `skills/propose-interactive/SKILL.md` exists   | `test -f skills/propose-interactive/SKILL.md`                       | FOUND  |
| Commit `876f81f` exists                        | `git log --oneline --all \| grep 876f81f`                           | FOUND  |
| Commit `107006b` exists                        | `git log --oneline --all \| grep 107006b`                           | FOUND  |
| Commit `d3a91c7` exists                        | `git log --oneline --all \| grep d3a91c7`                           | FOUND  |
| marketplace.json JeisKappa-workflow == 5       | `jq '... \| length'` returns 5                                      | OK     |
| marketplace.json JeisKappa-skills == 8         | `jq '... \| length'` returns 8 (unchanged)                          | OK     |
| .vscode scopes == 13, alphabetical             | `jq '. \| length'` + diff against sorted                            | OK     |
| README has propose-auto + propose-interactive  | `grep -c '^### \[\`propose-(auto\|interactive)\`\]'` returns 2 total | OK     |
| README Retired skills subsection intact        | `grep -c '^## Retired skills$'` returns 1; discussion-loop preserved | OK     |
| All 4 anti-syco markers in propose-interactive | grep each marker                                                    | OK     |
| Zero anti-syco mentions in propose-auto        | `grep -i 'Anti-Sycophancy' skills/propose-auto/SKILL.md` returns 0  | OK     |
| All 3 Phase 1 docs cited in both skills        | grep each absolute path                                             | OK     |
| derive-spec untouched                          | no commit in this plan modifies `skills/derive-spec/SKILL.md`       | OK     |
