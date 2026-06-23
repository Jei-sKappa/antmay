---
status:
  disposed: 260623083743Z
  disposition: accepted
---

# Implementation Review — Outcome-report wiring vs. spec 001

## References

- Implementation under review: commits `b6e8f2f..3766e18` (range `8e3da68..3766e18`) on `Jei-sKappa/skills` — the three feat commits the implementation report maps to plan tasks 1–3 (Task 1 `b6e8f2f`, Task 2 `e1a95c1`, Task 3 `3766e18`). Read READ-ONLY via `git diff`.
- Spec (contract judged against): `specs/001/spec.md` (approved `260622214418Z`, version 1).
- Implementation report (context, not contract): `implementation/260623074310Z-outcome-report-wiring-implementation-report.md`.
- Source decision log the spec's ACs trace to: `seed/discussions/260622200031Z-outcome-report-design-decision-log.md`.
- Edited source files (repo-relative): `skills/workflow/implement/implement-plan-with-subagents-auto/SKILL.md`, `skills/workflow/implement/implement-plan-with-subagents-interactive/SKILL.md`, the four reviewer references `references/{plan-compliance,code-quality}-reviewer.md` under each of those two skills, and the four single-agent skills `skills/workflow/implement/implement-{auto,interactive,plan-auto,plan-interactive}/SKILL.md`.
- Prior reviews on this implementation: none found under `implementation/reviews/`.

## Verdict

**Delivers.** The diff faithfully implements the spec's contract across all five fidelity axes: every one of the 18 acceptance criteria (FR-1 through FR-7) maps to a corresponding change; all constraints are honored; scope is clean (exactly the 10 files the spec names, nothing more); the expected behaviors for all four actors are present. One `issue` and one `nit` are flagged as tightening worth a follow-up — neither is an unmet criterion. Highest-impact finding: the per-dispatch assumption injection that AC-6.1 names for the **fix loop** is encoded only in the generic subagent-brief templates, not reinforced in the workflow's fix-loop steps, which scope injection explicitly to the initial review passes only.

## Findings

### 1. `issue` — AC-6.1 fix-loop assumption injection is under-specified in the workflow narrative

- **Axis:** acceptance-criteria coverage (partial) / behavior fidelity.
- **What is wrong:** AC-6.1 requires per-dispatch routing "so a fix dispatch's new assumptions reach the review that checks that fix." In both subagent skills the workflow injection instruction is scoped explicitly to the **initial** review passes — auto step a says "into the reviewer briefs of THIS dispatch's review passes (steps b and d)"; interactive step b says "(steps c and e)". The fix loops (auto step c / interactive steps d and f) respawn a fresh implementer and a fresh reviewer but the workflow prose there says nothing about carrying the fix implementer's new outcome-file assumptions into the re-review. The behavior is recoverable only because the generic reviewer-brief scope bullet in `## Subagent Briefs` injects "any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch's outcome file" generically — but the workflow narrative a reader follows step-by-step does not echo it for the fix loop, and step a's parenthetical actively narrows it to the first-pass steps.
- **Why it matters:** the fix dispatch is the motivating example the spec calls out by name. A reader executing the workflow linearly could inject assumptions on the first review pass and silently skip it on every re-review, weakening exactly the "a forced judgment call can no longer hide from review" guarantee the spec set out to build. The fix is one clause in each fix-loop step.

### 2. `nit` — AC-1.1 implementer return-contract has an internal ordering wrinkle

- **Axis:** behavior fidelity.
- **What is wrong:** the implementer "Return contract — status claim" bullet says "End the reply with EXACTLY ONE uppercase status token … plus a 1–3 sentence summary," then in the same bullet says "Reply with ONLY the summary, the status token, the paths of modified files, and — when an outcome file was written — that file's path." The "ends with token + summary" framing and the "summary, token, paths…" contents-list framing are mildly inconsistent about where the token sits relative to the modified-files paths.
- **Why it matters:** AC-1.1 ("the reply ends with exactly one of … uppercase, plus a 1–3 sentence summary") is satisfied either way, so this is cosmetic — but a fresh implementer parsing the bullet literally gets two slightly different pictures of the reply's tail. Worth one wording pass; not blocking.

## Evidence

- **Finding 1** — diff: `skills/workflow/implement/implement-plan-with-subagents-auto/SKILL.md` `## Workflow` step 5a ("into the reviewer briefs of THIS dispatch's review passes (steps b and d)") and step 5c (the fix loop, silent on injection); `skills/workflow/implement/implement-plan-with-subagents-interactive/SKILL.md` step 5b ("(steps c and e)") and steps 5d/5f. Generic coverage lives in the `### Plan-compliance reviewer` and `### Code-quality reviewer` scope bullets under `## Subagent Briefs` in both skills ("for THIS dispatch's outcome file"). Spec: `specs/001/spec.md` FR-6 **AC-6.1** ("routing is per-dispatch, so a fix dispatch's new assumptions reach the review that checks that fix") and the Orchestrator paragraph under `## Expected behavior` (`DL P8`).
- **Finding 2** — diff: the "Return contract — status claim (untrusted)" bullet under `## Subagent Briefs → ### Implementer subagent` in both `implement-plan-with-subagents-{auto,interactive}/SKILL.md`. Spec: `specs/001/spec.md` FR-1 **AC-1.1**.

## Open Questions

- **Test-coverage axis (Axis 5) — SKIPPED.** This is a content repo of `SKILL.md`/reference Markdown with no build/test/lint pipeline; the spec's Constraints state validation is "by reading for coherence," and the spec's ACs describe instruction-file content, not executable behavior. There is no testable behavior for the diff to cover, so the test-coverage axis does not apply. (The implementation report's grep-for-token-presence + coherence reads are the project's coherence-validation equivalent.)
- **Spec-internal — does the outcome file's `References` section count as a field?** AC-2.1 enumerates the core fields (`Status`, `Summary`, `Assumptions`, `Blockers & open questions`) and the optional fields (`Validation`, `Known risks`) but does not mention `References`; AC-2.4's pinned template lists `References` last in the fixed section order. The implementation correctly followed the more specific AC-2.4 (the template includes `## References`), so this is not an implementation fault — but the two ACs are not self-consistent about whether `References` is a recognized field. A question for the spec owner, not a gap in the diff.

## Next Actions

- **Tighten Finding 1 in a fresh implementation pass** on `implement-plan-with-subagents-auto` and `-interactive`: add one clause to each fix-loop step making the per-dispatch injection explicit for re-reviews (the fix implementer may write its own outcome file; carry its new `Assumptions` / `Known risks` into the re-review brief), so the workflow narrative no longer relies solely on the generic brief template. Apply symmetrically to both skills per the spec's per-skill self-containment constraint.
- **Optionally fold Finding 2** (return-contract wording) into the same pass — a one-line coherence edit, no behavior change.
- **Route the `References`-field discrepancy** to the spec owner as a candidate record-backed spec amendment (reconcile AC-2.1 and AC-2.4); this skill does not edit the spec.
- **Otherwise the implementation is landable** — no blocker, scope clean, constraints honored, all ACs addressed. The two findings are refinements, not contract failures.
