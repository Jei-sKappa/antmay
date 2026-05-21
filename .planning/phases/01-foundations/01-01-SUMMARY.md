---
phase: 01-foundations
plan: 01
subsystem: docs
tags: [v1-workflow, thread-layout, reference-docs, markdown, foundations]

# Dependency graph
requires: []
provides:
  - "Canonical V1 thread root path codified at docs/workflow/v1/thread-layout.md"
  - "Canonical V1 thread folder set (proposals/specs/plans/discussions/inbox/{open,processed,dropped}/.wip) codified in a fenced tree"
  - "Index entry point at docs/workflow/v1/README.md linking the V1 workflow reference doc set"
  - "Forward-link slots for filename-grammar.md and immutability.md (resolved by Plan 02)"
affects: [01-02, 01-03, phase-2, phase-3, phase-4, phase-5, phase-6, phase-7]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reference doc set under docs/workflow/v<N>/ (versioned ruleset directory)"
    - "Reference docs open with **Codifies:** D<N> line for source-decision traceability"
    - "Forward references via plain relative markdown links — files resolve later in same phase"

key-files:
  created:
    - docs/workflow/v1/thread-layout.md
    - docs/workflow/v1/README.md
  modified: []

key-decisions:
  - "Reference doc directory is docs/workflow/v1/ (versioned; v2 will live at docs/workflow/v2/ without disturbing v1 readers)"
  - "Thread-layout doc is a single source of truth for thread root + folder set, with on-demand folder creation explicitly stated"
  - "Excluded folder names (reviews/, verifications/, merges/, adrs/) are routed in this doc, not silently dropped — so future readers know where the material lands"
  - "Reference docs carry no YAML frontmatter — they are docs, not skills"

patterns-established:
  - "Pattern: Source-decision traceability via **Codifies:** D<N> header on every reference doc"
  - "Pattern: Realistic UTC stamps in examples — reuse stamps already present under docs/threads/, never invent new ones"
  - "Pattern: README.md per reference-doc set, listing each doc with one-line description + 'Created by Plan NN' marker"

requirements-completed:
  - THRD-01
  - THRD-02

# Metrics
duration: ~9min
completed: 2026-05-21
---

# Phase 01 Plan 01: Create V1 Workflow Reference Doc Tree Summary

**V1 thread storage contract codified at docs/workflow/v1/ — index plus thread-layout.md (D7, D107) — so every downstream V1 skill can cite the folder set without re-deriving it.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-05-21T09:11:00Z (approx — STATE.md activity timestamp)
- **Completed:** 2026-05-21T09:20:00Z (approx)
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- Created `docs/workflow/v1/thread-layout.md` codifying D7 (durable artifact root) and D107 (V1 folder set) — opens with `**Codifies:** D7, D107` and contains the exact V1 folder tree in a fenced block.
- Created `docs/workflow/v1/README.md` as the index of the V1 workflow reference doc set, with three bullets covering `thread-layout.md` (created here) plus forward references to `filename-grammar.md` and `immutability.md` (which Plan 02 will create).
- Documented on-demand folder creation explicitly so readers do not pre-create empty folders.
- Documented the four explicitly-rejected folder names (`reviews/`, `verifications/`, `merges/`, `adrs/`) and their V1 destinations, so future readers cannot accidentally reintroduce them.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create `docs/workflow/v1/thread-layout.md` codifying D7 and D107** — `5c25cf0` (feat)
2. **Task 2: Create `docs/workflow/v1/README.md` as the index of V1 workflow reference docs** — `89aa518` (feat)

**Plan metadata:** *(this commit — see final commit below)*

## Files Created/Modified

- `docs/workflow/v1/thread-layout.md` — V1 thread root path (`docs/threads/<YYMMDDHHMMSSZ-slug>/`) and full V1 folder set as a fenced tree, with one-line per folder, an on-demand-creation section, and an excluded-folder-names section. 66 lines.
- `docs/workflow/v1/README.md` — Index entry point linking `thread-layout.md`, `filename-grammar.md` (forward), and `immutability.md` (forward); includes Entry Points and Versioning sections. 23 lines.

## Decisions Made

- **Reference doc directory location.** The set lives at `docs/workflow/v1/` (a versioned, top-level workflow rules directory) — already locked in `01-CONTEXT.md`; reaffirmed here by writing both seed files there.
- **No YAML frontmatter on reference docs.** Reference docs are not skills and carry no `name`/`description`/`metadata` block — the plan and the on-disk SKILL.md conventions disagree about file shape, and the reference-doc shape wins.
- **Explicit excluded-folder routing.** Rather than silently leaving `reviews/`, `verifications/`, `merges/`, `adrs/` out of the doc, the thread-layout doc lists them and points each to its V1 destination (`inbox/open/`, target-type folder, `discussions/`). This makes the negation actionable for readers who arrive with prior expectations.

## Deviations from Plan

None — plan executed exactly as written.

The `README.md` length (23 lines) sits below the plan's `~30-50 lines` soft target. The target is approximate and the file covers every required section with substantive content (no padding). All automated `<verify>` checks pass. No corrective action needed.

## Issues Encountered

None.

## Next Phase Readiness

- Plan 02 of Phase 1 can create `docs/workflow/v1/filename-grammar.md` and `docs/workflow/v1/immutability.md` against the index entries already in place — the README's bullets already advertise both files with one-line descriptions.
- Plan 03 of Phase 1 can author the `AGENTS.md` pointer section that links to `docs/workflow/v1/README.md` as the canonical V1 workflow entry point.
- Downstream phases (2–7) can reference `docs/workflow/v1/thread-layout.md` from any V1 spine skill body without re-deriving the folder set.

## Self-Check: PASSED

- `docs/workflow/v1/thread-layout.md` exists — verified with `test -f`.
- `docs/workflow/v1/README.md` exists — verified with `test -f`.
- Commit `5c25cf0` (Task 1) exists — verified with `git log`.
- Commit `89aa518` (Task 2) exists — verified with `git log`.
- All plan-level automated verification checks pass (see `<verification>` block in `01-01-PLAN.md`).

---
*Phase: 01-foundations*
*Completed: 2026-05-21*
