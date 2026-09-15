# Task 1: Restructure the skill tree

**Objective:** Perform every rename, promotion, and retirement move so `skills/` has its final V3 folder shape, with file history preserved through `git mv`.

**Input / context:** The cutover spec `specs/001/spec.md` § "Skill migration inventory" (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`), settled by `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P51 and P59. The moves are pure relocations: folder contents are NOT edited here. Moved skills temporarily carry a frontmatter `name:` that no longer matches their folder; later tasks rewriting each skill fix that. Retired skills keep their folder names and their content untouched — retirement is by location only.

**Steps:**

1. `git mv skills/workflow/review/review-proposal skills/workflow/reconcile/reconcile-proposal` (create `skills/workflow/reconcile/` as part of the move).
2. `git mv skills/workflow/review/review-plan skills/workflow/reconcile/reconcile-plan`.
3. `git mv skills/deprecated/plan-loose skills/workflow/plan/plan-brief`.
4. `git mv skills/workflow/capture-discussion/seeded-discussion skills/deprecated/seeded-discussion`.
5. `git mv skills/workflow/finish-navigate/record-verdict skills/deprecated/record-verdict`.
6. `git mv skills/workflow/review/review-lossless-mapping skills/deprecated/review-lossless-mapping`.
7. Do NOT pre-create `skills/workflow/roadmap/` or `skills/workflow/primitives/` — those group folders come into existence when later tasks write their first skill.

**Files modified:** the six folders above (moved wholesale; no content edits): `skills/workflow/reconcile/reconcile-proposal/` (MOVED IN), `skills/workflow/reconcile/reconcile-plan/` (MOVED IN), `skills/workflow/plan/plan-brief/` (MOVED IN), `skills/deprecated/seeded-discussion/` (MOVED IN), `skills/deprecated/record-verdict/` (MOVED IN), `skills/deprecated/review-lossless-mapping/` (MOVED IN).

**Verification:**

```sh
# Old paths gone (each must fail):
for p in skills/workflow/review/review-proposal skills/workflow/review/review-plan \
         skills/workflow/review/review-lossless-mapping skills/workflow/capture-discussion/seeded-discussion \
         skills/workflow/finish-navigate/record-verdict skills/deprecated/plan-loose; do test ! -e "$p" || echo "FAIL $p"; done
# New paths present (each must pass):
for p in skills/workflow/reconcile/reconcile-proposal skills/workflow/reconcile/reconcile-plan \
         skills/workflow/plan/plan-brief skills/deprecated/seeded-discussion \
         skills/deprecated/record-verdict skills/deprecated/review-lossless-mapping; do test -f "$p/SKILL.md" || echo "FAIL $p"; done
# Deprecated bucket is exactly the seven retired skills:
ls skills/deprecated/   # expect: adjust-plan-granularity capture-inbox discussion-loop record-verdict review-decision-document review-lossless-mapping seeded-discussion
# Moves recorded as renames:
git status --short
```

**Acceptance criteria:**

- None of these paths exist: `skills/workflow/review/review-proposal/`, `skills/workflow/review/review-plan/`, `skills/workflow/review/review-lossless-mapping/`, `skills/workflow/capture-discussion/seeded-discussion/`, `skills/workflow/finish-navigate/record-verdict/`, `skills/deprecated/plan-loose/` (spec AC-1.2).
- `skills/deprecated/` contains exactly: `adjust-plan-granularity`, `capture-inbox`, `discussion-loop`, `record-verdict`, `review-decision-document`, `review-lossless-mapping`, `seeded-discussion` (spec AC-1.3).
- `skills/workflow/reconcile/` contains `reconcile-proposal/` and `reconcile-plan/`; `skills/workflow/plan/` contains `plan-strict/` and `plan-brief/`; `skills/workflow/review/` contains exactly `review-spec/`, `review-implementation/`, `review-code/`.
- Every moved folder's content is byte-identical to before the move (no edits in this task).

**Consumes:** none

**Produces:** the final V3 folder locations for `reconcile-proposal`, `reconcile-plan`, `plan-brief`, and the seven-skill `skills/deprecated/` set; all later tasks address skills at these paths.
