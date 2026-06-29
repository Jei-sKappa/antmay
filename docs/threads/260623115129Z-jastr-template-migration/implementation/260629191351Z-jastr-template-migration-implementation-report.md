# Implementation Report — Migrate the workflow skill suite to composable jastr templates

Compiles `plans/001/plan.md` (16 tasks), which in turn compiles `specs/001/spec.md` (approved, tier 3). Implemented via the orchestrated multi-subagent flow: one implementer + a plan-compliance reviewer + a code-quality reviewer per task, fresh-context per fix, all subagents run on Opus. Reviewer method references were materialized to `/tmp` and supplied to each reviewer (the catalog reference files were not yet on a stable path during the run).

## Outcome at a glance

All 16 plan tasks completed. The 29 active `skills/workflow/**/SKILL.md` are now GENERATED outputs, materialized from a committed `.jastr/workflow/` catalog (29 one-per-skill templates, 5 shared partials, 9 reference files), driven by `scripts/generate-skills.sh` (regenerate + `--check` freshness gate). The one-time rebaseline is proven content-preserving per skill. Every gate in the final sweep passes EXCEPT AC-3.2 under a literal rendered-tree reading — see **Problems hit / P1**, which needs a human decision.

### Per-task verified verdicts (+ subagent audit + commit)

| Task | Verified verdict | Implementer dispatches | Fix iterations (pc / cq) | Commit |
|---|---|---|---|---|
| T1 Relocate drift tool → scripts/ | DONE | 1 | 0 / 0 | `6677cbb` |
| T2 Establish JASTR_BIN | DONE | 1 | 0 / 0 | (none — empty-diff verify) |
| T3 Reconciliation matrix | DONE_WITH_CONCERNS | 2 | 0 / 1 | `b2a6560` |
| T4 Scaffold catalog skeleton | DONE | 1 | 0 / 0 | `b2c375d` |
| T5 Author shared partials | DONE_WITH_CONCERNS | 3 | 2 / 0 | `5c0a598` |
| T6 Pilot review-spec | DONE_WITH_CONCERNS | 2 (1 BLOCKED→cleared) | 0 / 0 | `3c9f0c2` |
| T7 Generation/check script | DONE_WITH_CONCERNS | 1 | 0 / 0 | `0952195` |
| T8 Templates: review+spec+propose | DONE | 1 | 0 / 0 | `88daeb5` |
| T9 Templates: plan+implement | DONE_WITH_CONCERNS | 2 (1 surfaced a partial defect) | 0 / 0 | `84aa787` |
| T10 Templates: capture+finish | DONE | 1 | 0 / 0 | `b97dc79` |
| T11 Templates: handoff+research+merge+doc+support | DONE | 1 | 0 / 0 | `bac7068` |
| T12 Reference files → catalog | DONE | 1 | 0 / 0 | `a2edc86` |
| T13 One-time rebaseline | DONE | 1 | 0 / 0 | `0475aa1` |
| T14 Diff review + version bumps | DONE | 1 | 0 / 0 | `d3116ca` |
| T15 Update AGENTS.md | DONE_WITH_CONCERNS | 1 | 0 / 0 | `ab2ec4b` |
| T16 Final verification sweep | DONE_WITH_CONCERNS | 1 | 0 / 0 | (none — empty-diff verify) |

Every dispatched reviewer returned `PASS` (after the fix iterations noted). The two BLOCKED-style claims (T6, T9) were clearable defects in already-committed Task-5 partials, resolved within their own cycles by a fresh implementer with expanded scope — not terminal blockers.

## 1. Deviations from the plan, with justification

- **D1 — Commit Policy & Immutability NOT reconciled; only 5 partials (vs the spec's headline list).** The plan/spec named Commit Policy and Immutability as headline partial candidates, and the plan's Task-5 input listed `commit-policy`, `immutability`, `tier-awareness`, `lineage`, `disposition` as the "high-confidence" partial set. The Task-3 matrix (the authoritative gate) classified Commit Policy, Immutability, Tier Awareness, and Lineage as `keep-specific`/`semantic` per DL P10, because their cross-skill differences are genuinely semantic (e.g. the implement trio auto-commit vs the never-commit author family vs `finish`/`whats-next`/`open-ticket` — opposite policies, not a varying noun). Final partial set = 5 (Disposition Frontmatter, Failed commit, No history rewriting, Task report block shape, Log What Serves the Target). Justification: the plan explicitly makes "the matrix authoritative; the list is a starting point, not a fixed set," and DL P10's tie-breaker is "when in doubt, keep separate." Both reviewers confirmed the classifications sound and AC-13.2-clean.
- **D2 — The optional `never-commit-author` sub-family partial was DECLINED (T5).** The matrix flagged a narrower never-commit-author extraction as a Task-5 option. The implementer declined it: the 12 candidate members' Commit Policy sentence varies along 4 independent axes (verb, an inserted second sentence, the stop-clause, the decision tail) plus skill-specific trailing paragraphs — not a single absorbable noun. DL P10 + FR-7 govern; no acceptance criterion requires it (AC-3.2 covers only the 5 partial-row sections). Commit Policy stays inline per skill.
- **D3 — review-spec's interpolated partial is `disposition-frontmatter`, not Commit Policy (T6).** The plan's Task-6 rationale assumed review-spec exercises an interpolated Commit Policy partial. Per the matrix, Commit Policy is keep-specific; review-spec's interpolated partial is disposition-frontmatter. The pilot's goal (validate interpolated-partial resolution) was met via disposition-frontmatter instead.
- **D4 — Disposition Frontmatter kept as a partial via 6 interpolation inputs (T5/T6), not demoted.** It was the closest artifact-noun→semantic call (matrix demotion trigger). Rather than demote, the implementer absorbed the per-skill tail (disposing aside, rationale bullet, lineage clause, trailing sentence, "no"/"with no") verbatim via 6 defaulted inputs + boolean gates, sharing the ~86% core mechanism. Verified content-preserving for all 5 review skills. Code-quality flagged this as the upper maintainability boundary (non-blocking).
- **D5 — Two Task-5 partials were corrected downstream (new commits, not history rewrites).** (a) T6: `disposition-frontmatter` reworked to boolean-gate its empty-capable asides because the jastr binary rejects empty-string interpolation. (b) T9: `task-report-block-shape`'s input renamed `{{task-noun}}`→`{{report-task-noun}}` because it collided (singular vs plural) with `failed-commit`'s `{{task-noun}}` in the `implement`/`implement-plan` templates and jastr has no per-include input scoping. Both are corrections the pilot-style verify surfaced; prose unchanged in both.
- **D6 — Empirical version-bump set (3) is smaller than the matrix predicted (8) (T14).** The matrix predicted bumps for the disposition review skills (review-implementation/-lossless-mapping/-plan/-spec) and for task-report-block-shape (implement-plan). Those rendered byte-identical (per-skill-default artifact-noun absorption preserves each member's original text) → no content change → correctly NOT bumped (AC-8.1). Materialized bumps: `seeded-discussion` 2.0.0→2.0.1, `implement` 3.0.0→3.0.1, `implement-plan-with-subagents` 3.0.0→3.0.1 (all PATCH wording reconciliations). This is the plan's sanctioned "a predicted bump that did not materialize" reconciliation.

## 2. Surprises

- **S1 — jastr forbids empty-string interpolation.** `default: ''` is rejected at validate; an absent optional fails at render (`absent_optional_interpolation`). Any interpolated input that must render empty for some member has to be boolean-gated instead. (Surfaced by the T6 pilot — exactly what a pilot is for.)
- **S2 — jastr has no per-include input scoping.** A template's `inputs:` are shared across ALL its `::include`s, so two partials referencing the same input name in one template collide on a single value. (Surfaced by the T9 verify; fixed by distinct input names.)
- **S3 — Artifact-noun absorption with per-skill defaults renders byte-identical.** Each member renders its own original noun → no rendered change → no version bump AND no rendered-drift collapse. This is the root of both D6 and P1.
- **S4 — `jastr validate` does NOT catch dropped prose; the per-batch verify-generate-diff did.** Three of the four template batches had a silently-dropped fragment caught and fixed before commit (a body paragraph in review-spec/T6; "(code reviews, verifications)" in whats-next/T10; "separated by `_`" in take-snapshot/T11). Front-loading a generate-diff content check per skill (rather than deferring all content verification to T13/T14) was decisive for content-preservation.

## 3. Problems hit

- **P1 — AC-3.2 (drift collapse) is NOT satisfied under a literal rendered-tree reading. NEEDS A HUMAN DECISION.** The final sweep re-ran `scripts/skill_header_stats.py --drift --bucket workflow` over the regenerated tree: it still reports **19 drift candidates — unchanged from the pre-migration baseline** — and all 5 partial-reconciled sections still appear. This is a structural, unavoidable consequence of combining inline rendering with content-preservation (FR-7): because each reconciled section is absorbed via per-skill artifact-noun values, the RENDERED sections still differ per skill, so a tool that measures the rendered tree still sees them as near-identical variants. AC-3.2 IS satisfied under a **source-dedup reading** (each reconciled section is now exactly one `.jastr/workflow/partials/<name>.md` — no hand-maintained duplication, the FR-3 goal), but NOT under the plan's literal "over the regenerated tree … no longer report multiple near-identical variants." The spec mandates BOTH content-preservation (FR-7) and rendered-tree drift collapse (AC-3.2), and for artifact-noun sections these are mutually exclusive. This is a spec-internal tension, not an implementation defect — the implementation correctly prioritized content-preservation. **Resolution is outside this run's mandate** (a spec/AC fault routes to the human). The owner must choose one of: (a) accept AC-3.2 under the source-dedup reading and amend the AC wording; (b) accept that artifact-noun sections legitimately retain rendered drift; or (c) if rendered-tree drift collapse is truly required, adopt a non-content-preserving reconciliation (members adopt the canonical wording) — which would re-open FR-7 and the version-bump set.
- **No other problems.** The two clearable blockers (T6 empty-interpolation, T9 input-collision) were resolved within their cycles. No commit failed; no fix loop failed to converge.

## 4. Follow-ups

Routed as **candidate seeds** for the owner to open as future threads (this thread is tier 3 but not a roadmap-bearing phased thread, so standalone follow-ups default to candidate seeds — none were parked in any inbox). Listed most-important first:

- **FU1 (headline) — Resolve the AC-3.2 interpretation (see P1).** Needs the spec owner: accept the source-dedup reading + amend AC-3.2, or decide rendered drift is acceptable for artifact-noun sections, or change the reconciliation strategy. This is the one open question gating "the spec's acceptance criteria are fully met."
- **FU2 — `AGENTS.md` repo-purpose blurb polish.** Line ~18 still reads "a personal collection of refined `SKILL.md` files authored by Jei-sKappa," slightly awkward next to the new generated-artifact framing. Cosmetic.
- **FU3 — `scripts/generate-skills.sh` minor polish.** The `--help` handler over-reads its header block (leaks `set -u` + a comment into help output); one `mkdir -p` is unchecked (its failure still propagates via the checked rsync). Both non-blocking.
- **FU4 — Watch disposition-frontmatter's 6-input absorption.** It is at the upper maintainability boundary; if its per-skill tail variation grows, consider demoting it to `keep-specific` (the matrix's own demotion trigger).
- **FU5 — Optional simplification.** The nested if/else in `disposition-frontmatter.md` could flatten to a compound-operator (`&&`/`||`) else-if chain that jastr supports; preference, not a defect.

## References

- Plan executed: `plans/001/plan.md` (16 tasks).
- Spec: `specs/001/spec.md` (tier 3, approved). The verify stage, when run, checks the implementation against the spec's acceptance criteria — note P1/AC-3.2.
- Reconciliation matrix (the rebaseline gate): `.jastr/workflow/RECONCILIATION.md`.
- Migration commits (oldest→newest): `6677cbb`, `b2a6560`, `b2c375d`, `5c0a598`, `3c9f0c2`, `0952195`, `88daeb5`, `84aa787`, `b97dc79`, `bac7068`, `a2edc86`, `0475aa1`, `d3116ca`, `ab2ec4b`.
