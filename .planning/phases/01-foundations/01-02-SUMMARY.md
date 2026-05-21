---
phase: 01-foundations
plan: 02
subsystem: docs
tags: [v1-workflow, filename-grammar, immutability, reference-docs, markdown, foundations]

# Dependency graph
requires:
  - 01-01
provides:
  - "V1 record + versioned filename grammars codified at docs/workflow/v1/filename-grammar.md"
  - "V1 emitted-artifact immutability + reference-resolution rules codified at docs/workflow/v1/immutability.md"
  - "Plan 01's README forward references to filename-grammar.md and immutability.md now resolve"
  - "Canonical V1 workflow reference doc tree (README + thread-layout + filename-grammar + immutability) complete"
affects: [01-03, phase-2, phase-3, phase-4, phase-5, phase-6, phase-7]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reference docs open with **Codifies:** D<N> line for source-decision traceability (continued from Plan 01)"
    - "Realistic UTC stamps in examples — reuse existing thread stamp 260518200115Z rather than inventing new ones"
    - "Cross-doc links use relative paths (./other-doc.md) so the doc tree is self-contained"

key-files:
  created:
    - docs/workflow/v1/filename-grammar.md
    - docs/workflow/v1/immutability.md
  modified: []

key-decisions:
  - "filename-grammar.md target length (~70-110 lines) hit at 92 lines; immutability.md target (~60-90 lines) came in at 40 lines — accepted as dense-prose-no-padding per Plan 01 precedent"
  - "Cited Plan 01's thread-layout.md and the just-created filename-grammar.md via relative links from immutability.md, completing the cross-doc reference graph"
  - "Recognized V1 artifact-type tokens list documented as the canonical V1 starting set; future skills extend it inside their own bodies and re-list here on stabilization"
  - "Examples table in filename-grammar.md ties each artifact-type token to its target folder per thread-layout.md, so a future skill author can see the full record-form/folder/type triangle at one glance"

patterns-established:
  - "Pattern: Versioned artifact filenames use target-version semantics (vN = the version being produced, not the predecessor)"
  - "Pattern: Source-relation frontmatter (Supersedes:/Alternative to:/Forked from:) is explicitly forbidden and named so a future reader cannot reintroduce them as 'optional'"
  - "Pattern: Reference docs include a Related/Companion Docs section linking sibling docs in the same reference set"

requirements-completed:
  - THRD-04
  - THRD-05
  - THRD-06
  - THRD-07
  - THRD-08

# Metrics
duration: ~2min
completed: 2026-05-21
---

# Phase 01 Plan 02: Add filename-grammar.md + immutability.md Reference Docs Summary

**V1 reference doc tree completed at docs/workflow/v1/ — filename-grammar.md (D11, D12, D42, D43, D46, D47) and immutability.md (D39, D40, D41, D44, D49) — so every downstream V1 skill can cite filename grammars and immutability rules without re-deriving them.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-21T07:20:56Z
- **Completed:** 2026-05-21T07:22:48Z (approx)
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- Created `docs/workflow/v1/filename-grammar.md` codifying D11 (UTC stamp), D12 (record form description), D42 (versioned grammar), D43 (mandatory artifact-type suffix), D46 (target-version semantics), D47 (N starts at 1).
- Created `docs/workflow/v1/immutability.md` codifying D39 (spec immutability — generalized to all emitted artifacts), D40 (artifact taxonomy + draft editability), D41 (versioned artifact evolution), D44 (no source-relation frontmatter), D49 (ambiguous reference resolution by asking).
- Resolved both forward references in Plan 01's `docs/workflow/v1/README.md`; the V1 reference doc tree (`README.md` + `thread-layout.md` + `filename-grammar.md` + `immutability.md`) is now complete.
- Provided an examples table in `filename-grammar.md` mapping each recognized artifact-type token to its target folder per Plan 01's `thread-layout.md`, so a future skill author sees the full record-form/folder/type triangle at one glance.
- Documented in `immutability.md` that the reference docs themselves are immutable by convention — V2 lives at `docs/workflow/v2/` rather than as in-place edits here.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create `docs/workflow/v1/filename-grammar.md` codifying D11, D12, D42, D43, D46, D47** — `a82ba4c` (docs)
2. **Task 2: Create `docs/workflow/v1/immutability.md` codifying D39, D40, D41, D44, D49** — `cfe82ff` (docs)

**Plan metadata:** *(this commit — see final commit below)*

## Files Created/Modified

- `docs/workflow/v1/filename-grammar.md` — UTC stamp pattern, record form (with labeled grammar block), versioned form (with mainline + descriptor examples), target-version semantics, recognized V1 artifact-type tokens list, and an examples table mapping each token to its target folder. 92 lines.
- `docs/workflow/v1/immutability.md` — Emitted-artifact immutability rule, `.wip/` draft editability exception, explicit forbidden frontmatter list (`Supersedes:`, `Alternative to:`, `Forked from:`), ambiguous-reference resolution via asking the user, no global "latest artifact" algorithm, plus six "What This Means In Practice" consequences. 40 lines.

## Decisions Made

- **Used `docs:` as commit type** for both task commits rather than `feat:` — these are documentation artifacts under `docs/`, not skill or feature code; `docs:` is the more accurate Conventional Commits type per AGENTS.md repo-wide change rules.
- **Cited just-created `filename-grammar.md` from `immutability.md`** via the `./filename-grammar.md` relative link — completes the cross-doc reference graph so a reader who lands on `immutability.md` can navigate sideways to the grammar that "produce a new version" depends on.
- **Examples table in `filename-grammar.md` includes folder routing** (e.g. `proposal` → `proposals/`, `review-finding` → `inbox/open/`) — duplicates one column from `thread-layout.md` but the cost is low and the payoff for a copy-paste-adapting skill author is high.
- **Accepted 40-line `immutability.md` length** (vs. ~60–90 soft target) per the precedent Plan 01 set with its 23-line README. The content is dense and covers every required item; the soft target is approximate and no padding was warranted.

## Deviations from Plan

None — plan executed exactly as written.

The `immutability.md` length (40 lines) sits below the plan's `~60-90 lines` soft target. The target is approximate; the file covers every required section with substantive content (no padding) and all automated `<verify>` checks pass. This matches the Plan 01 precedent where the README came in at 23 lines vs. its 30-50 target. No corrective action needed.

## Issues Encountered

None.

## Next Phase Readiness

- Plan 03 of Phase 1 can now create the `.gitignore` `docs/threads/**/.wip/` rule, add the empty `JeisKappa-workflow` plugin entry in `.claude-plugin/marketplace.json`, and author the `AGENTS.md` pointer section that links to `docs/workflow/v1/README.md`. All four reference docs the pointer will direct readers to (`README.md`, `thread-layout.md`, `filename-grammar.md`, `immutability.md`) now exist on disk.
- Downstream phases (2–7) can reference both `docs/workflow/v1/filename-grammar.md` and `docs/workflow/v1/immutability.md` from any V1 spine skill body without re-deriving the grammars or immutability rules.
- Phase 2's `discussion` and `seeded-discussion` skills can cite the `discussion` token from `filename-grammar.md`'s recognized-tokens list directly when emitting decision logs.
- Phase 6's `review-*` skills can cite the `review-finding` token + the `inbox/open/` folder routing from the examples table when emitting findings reports.

## Self-Check: PASSED

- `docs/workflow/v1/filename-grammar.md` exists — verified with `test -f`.
- `docs/workflow/v1/immutability.md` exists — verified with `test -f`.
- Commit `a82ba4c` (Task 1) exists — verified with `git log --oneline`.
- Commit `cfe82ff` (Task 2) exists — verified with `git log --oneline`.
- All plan-level automated verification checks pass (see `<verify>` blocks in `01-02-PLAN.md` and the plan-level verification run before Summary creation).
- Plan 01's `README.md` forward references (`./filename-grammar.md`, `./immutability.md`) now resolve to existing files.
- All seven recognized V1 artifact-type tokens (proposal, spec, plan, discussion, decision-log, inbox-item, review-finding) appear in `filename-grammar.md`.
- All three explicitly-forbidden frontmatter fields (`Supersedes:`, `Alternative to:`, `Forked from:`) are named in `immutability.md`.

---
*Phase: 01-foundations*
*Completed: 2026-05-21*
