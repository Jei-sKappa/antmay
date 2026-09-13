---
status:
  disposed: 260706141308Z
  disposition: accepted
  rationale: specs/001/discussions/260706141308Z-review-findings-disposition-decision-log.md
---

# Spec review — superpowers v6 sync (handoff-grade + decision-log consistency)

## References

- Spec under review: `specs/001/spec.md`
- Thread decision log (all P<N> citations): `seed/discussions/260706072854Z-superpowers-v6-adoption-decision-log.md`
- Thread ledger (tier 2): `ledger.md`
- Repo skill targeted by the spec — plan-strict: `skills/workflow/plan/plan-strict/SKILL.md`
- Repo skill targeted by the spec — review-plan: `skills/workflow/review/review-plan/SKILL.md`
- Repo skill targeted by the spec — implement-plan-with-subagents: `skills/workflow/implement/implement-plan-with-subagents/SKILL.md`
- Repo skill targeted by the spec — implement-plan: `skills/workflow/implement/implement-plan/SKILL.md`
- Reviewer method file — plan-compliance: `skills/workflow/implement/implement-plan-with-subagents/references/plan-compliance-reviewer.md`
- Reviewer method file — code-quality: `skills/workflow/implement/implement-plan-with-subagents/references/code-quality-reviewer.md`
- Registrations/docs targeted by the spec: `README.md`, `.claude-plugin/marketplace.json`, `AGENTS.md`, `docs/workflow/v2/thread-layout.md`, `docs/workflow/v2/filename-grammar.md`
- Prior reviews on this spec: none

## Verdict

**partially ready.** All eight semantic-contract elements are present, coherent, and unusually strong; every decision-log record (P1–P15) is compiled faithfully with no contradiction or silent reversal. Three `issue`-level findings concern the *derived behavior of dependent files* the spec commands to change but under-specifies — most sharply, the two reviewer method files still encode a sequential two-pass model that the spec's own merged-dispatch decision (P1) contradicts, and the spec's "lossless behavior surface" constraint would instruct an implementer to leave that stale framing in place. These are fixable in place; none blocks planning, but pinning them prevents a downstream implementer from shipping self-contradictory skill files.

## Findings

### 1. [issue] Merged reviewer contradicts the method files' sequential-pass framing — §5 (expected behavior) / P1 consistency

The spec (§4, FR-3.1–3.2; P1) merges the two per-task reviewers into ONE dispatch that loads both method files and returns both lane verdicts, each judged within its own lane, with a task passing only when both are clean — i.e. the lanes are no longer sequentially gated. But both method files are written for two *separate, ordered* dispatches: `code-quality-reviewer.md` opens "You are the SECOND review pass — the plan-compliance reviewer ran first and (by the time you are dispatched) has already PASSED on the diff" and "The first pass already passed; you trust that verdict"; `plan-compliance-reviewer.md` frames itself as "the FIRST review pass." The spec's §5 list of changes to the method files (read-permission, unverified-concern, out-of-task drop, plan-mandated label, loose removal, output-template merge) does **not** include reconciling this pass-ordering / "you trust that verdict" framing, and the "lossless behavior surface" constraint (Constraints section) affirmatively says unnamed behavior stays unchanged. A downstream implementer following the spec literally will produce a merged reviewer that reads, in one context, that a separate first pass "already passed" — false in the merged model, and it invites the code-quality lane to assume plan-compliance is settled rather than judging independently. Element 4 (expected behavior) for §5 is partially covered.

### 2. [issue] review-plan is not updated for the new mandatory task-file lines — §3 (expected behavior) / P6 consistency

P6/AC-1.3 make `Consumes:` and `Produces:` mandatory lines in every task file, and §3/AC-2.3 adds review-plan's cross-task *matching* check. But the spec never instructs review-plan to recognize the new task-file shape or to flag a task file that omits the hand-off lines entirely. review-plan today defines a strict task as one carrying "SIX labeled fields" and enumerates exactly those six in its per-task ambiguity check; the spec's loose-removal (§3) collapses the loose branch but leaves the six-field definition as the residual task-shape knowledge. Result: a `plan-strict`-emitted task file missing `Consumes:`/`Produces:` passes review-plan — the structural check (AC-2.2) only checks index↔folder correspondence and ordinals, and the matching check (AC-2.3) finds nothing to match when the lines are absent. The reviewer's own model of a valid strict task should be extended to the new shape.

### 3. [issue] The Global Constraints drift safety-net P15 relied on is unassigned — §3/§1 / P15 consistency

P15 accepts the verbatim-copied Global Constraints block on the explicit rationale that it is "verbatim-copied *and review-checked*," i.e. `review-plan` checking the plan against the spec would catch a stale copy. The spec mandates that `plan-strict` copies the block verbatim (§1, AC-1.2) but assigns `review-plan` no check that the index's Global Constraints block matches the source spec's Constraints. review-plan's general adherence check maps the spec's acceptance criteria and intended outcomes onto tasks — not the spec's Constraints element onto the index block — so the specific drift P15 fenced (a plan recompiled against a since-revised spec) is not guaranteed to be caught by any named consumer.

### 4. [nit] `grep -i "model"` is an over-broad proxy for the no-model-selection criterion — Acceptance guidance (element 8) / P10

AC-6.4 verifies "no model-selection guidance" via `grep -i "model" skills/workflow/implement/implement-plan-with-subagents/`. The substring match false-positives on innocuous prose ("mental model", "data model"); a literal reader could read a spurious hit as a failure, or contort wording to dodge the substring. The underlying criterion (no model-selection content, P10) is correct — only the mechanical proxy is imprecise. (Confirmed the current skill contains no `model` substring, so the proxy passes today, but the AC will govern the edited file.)

### 5. [nit] Scratch-folder token `plans-NNN` is ambiguous for descriptor-bearing lineages — §4 (expected behavior)

The scratch layout uses `.wip/implement/plans-NNN/` and states "`plans-NNN` names the plan lineage." Plan lineages may carry a descriptor (`plans/001-cli/`), and the spec does not say whether the scratch folder for that lineage is `plans-001` or `plans-001-cli`. Low blast radius (single-lineage threads dominate), but two implementers could pick different paths, and the same ambiguity would affect a resumed run trying to locate an existing ledger.

## Evidence

- Finding 1: spec §4 "Merged review dispatch (log P1)… ONE reviewer subagent per review pass, whose brief loads BOTH method files… returns the two verdicts separately… each judged strictly within its own lane"; §5 change list omits pass-ordering reconciliation; Constraints "Lossless behavior surface" clause. Method files: `code-quality-reviewer.md` "## Focus Area" ("You are the SECOND review pass…") and "## What Code-Quality Is NOT" ("The first pass already passed; you trust that verdict"); `plan-compliance-reviewer.md` "## What Plan-Compliance Is NOT" (lane-handoff to the second pass).
- Finding 2: spec §3 / FR-2 (AC-2.1–2.5) — no field-presence AC for the hand-off lines; `review-plan/SKILL.md` "## Loose vs Strict Detection" ("SIX labeled fields") and "### Per-task ambiguity" (six-field enumeration).
- Finding 3: decision log P15 rationale ("keeping the block verbatim-copied and review-checked"); spec §3 / FR-2 contains no Global-Constraints-vs-source check; spec §1 / AC-1.2 assigns only the copy to `plan-strict`.
- Finding 4: spec Acceptance Criteria, AC-6.4.
- Finding 5: spec §4 "Scratch workspace" block and the bullet "`plans-NNN` names the plan lineage".

## Open Questions

- For finding 1: does the author intend the merged reviewer to judge the two lanes truly independently (no ordering), in which case the method files' "first pass / second pass / you trust that verdict" language must be rewritten — or is the sequential mental model retained inside one dispatch? This is an author decision that should be pinned before the method files are edited.
- For finding 3: should `review-plan` gain an explicit "Global Constraints block matches the source's Constraints element" check, or is catching constraint drift considered adequately covered by the general adherence pass? Author/owner call.
- For finding 5: does `plans-NNN` include the lineage descriptor when one exists? A one-line rule settles it.

## Next Actions

- Address findings 1–3 by revising the spec in place: add to §5 an explicit instruction to rewrite the method files' sequential-pass / "you trust that verdict" framing for the merged single-dispatch model (and reconcile it with the "lossless behavior surface" constraint); add to §3/FR-2 that `review-plan` recognizes the new task-file shape and flags missing `Consumes:`/`Produces:` lines; and decide whether `review-plan` verifies the Global Constraints block against the source (finding 3).
- Address findings 4–5 with small edits: reword AC-6.4 to target model-selection *content* (or narrow the grep), and add a one-line rule fixing whether `plans-NNN` carries the lineage descriptor.
- This is a standard handoff-grade + decision-log-consistency pass only. Given the change reworks core orchestration and review contracts, consider a separate adversarial review pass (pre-mortem / "what would make the merged reviewer miss a defect") before planning if the stakes warrant it.
