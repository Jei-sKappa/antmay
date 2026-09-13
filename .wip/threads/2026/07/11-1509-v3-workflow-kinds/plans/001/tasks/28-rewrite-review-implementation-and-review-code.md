# Task 28: Rewrite review-implementation and review-code

**Objective:** Rewrite both delivered-work reviews as strictly read-only operations sharing the fixed authority-anchor precedence.

**Input / context:** The cutover spec `specs/001/spec.md` § "Reconciliation versus review" (Review authority anchors) and AC-7.1/AC-7.3/AC-7.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P56 (anchor precedence `spec.md` → `plan.md` → `seed.md`; `decisions.md` always binding; `review-implementation` treats `implementation-report.md` as the claim under test; a coarse anchor is named in the bundle's `## Context` and findings scoped to it — never invent acceptance criteria), P36 (bundle output; example categories: implementation review — acceptance, constraints, scope, behavior, test coverage; code review — quality, safety, idioms, testability), P38 (manual consumption), P35 (read-only category). Current files: `skills/workflow/review/review-implementation/SKILL.md` (195 lines) and `skills/workflow/review/review-code/SKILL.md` (197 lines) — V2 spec-anchored, durable references-first reports; replace wholesale, carrying over each skill's review axes.

**Skill-body hygiene** — binding for BOTH `SKILL.md` files this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine; both skills legitimately anchor to the THREAD's spec and its acceptance criteria — that is their job.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. For each skill — frontmatter: keep its `name:`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version`. Create `agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false` in both folders.
2. Both bodies — shared anchor rule (P56, stated once per skill, in its authority section): the definition of intended behavior is the most specific durable intent in the thread — `spec.md` if present, else `plan.md` (brief, or strict index plus `plan-tasks/`), else `seed.md`; `decisions.md` always applies as a binding constraint source. When the resolved anchor is coarse (seed-only), name the anchor explicitly in the bundle's `## Context` and scope findings to it; never invent acceptance criteria the thread never recorded.
3. Both bodies — read-only output contract: never edit the reviewed code, artifacts, or report. Clean → concise chat pass, NO file. Findings → exactly one uniquely named `.pending-reviews/` bundle via `/emit-pending-review`. Never write `.pending-decisions/`. No `Address with:`, statuses, or retry loops; addressing is the user's explicit follow-up.
4. `review-implementation` — the fidelity question: does the delivered work match durable intent, and does `implementation-report.md` (the claim under test) honestly describe what exists — outcome, changes, and verification included? Categories: acceptance, constraints, scope, behavior, test coverage (or a justified variation — categories are this reviewer's own).
5. `review-code` — the intrinsic-quality question: quality, safety, idioms, testability axes apply regardless of anchor depth; the anchor matters only at the margin where intent determines what "right" means.
6. Both — carry over each current skill's useful review axes/heuristics stripped of V2 machinery (no durable reports, no `reviews/` folders, no verdict latches, no `.wip/`).

**Files modified:** `skills/workflow/review/review-implementation/SKILL.md` (rewritten), `skills/workflow/review/review-implementation/agents/openai.yaml` (NEW), `skills/workflow/review/review-code/SKILL.md` (rewritten), `skills/workflow/review/review-code/agents/openai.yaml` (NEW).

**Verification:**

```sh
for s in review-implementation review-code; do
  grep -n 'disable-model-invocation: true' skills/workflow/review/$s/SKILL.md
  grep -n 'allow_implicit_invocation: false' skills/workflow/review/$s/agents/openai.yaml
  grep -n 'emit-pending-review' skills/workflow/review/$s/SKILL.md
  grep -n 'pending-decisions' skills/workflow/review/$s/SKILL.md    # expect no hits
  grep -nE 'spec.md|plan.md|seed.md' skills/workflow/review/$s/SKILL.md   # anchor precedence present
  grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/review/$s/ ; \
  grep -riwE 'tier|ledger' skills/workflow/review/$s/    # both must return nothing
done
grep -n 'implementation-report.md' skills/workflow/review/review-implementation/SKILL.md   # claim under test
```

**Acceptance criteria:**

- Both bodies: never edit the reviewed target; concise chat pass and no file when clean; on findings exactly one uniquely named bundle via `/emit-pending-review`; never write `.pending-decisions/` (spec AC-7.1).
- Both state the anchor precedence (`spec.md` → `plan.md` → `seed.md`; `decisions.md` always binding) and require naming a coarse anchor in the bundle's `## Context`; `review-implementation` treats `implementation-report.md` as the claim under test (spec AC-7.3).
- No `Address with:` field, statuses, dispositions, or automatic retry loops in either body (spec AC-7.4).
- Frontmatter/metadata per the P48 pair in both; semver bumps.
- Hygiene (both): greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; the anchor rule stated once per skill, not repeated across sections.

**Consumes:** `/emit-pending-review` contract (Task 4); the `implementation-report.md` shape (Task 6).

**Produces:** the V3 `review-implementation` and `review-code` skills.
