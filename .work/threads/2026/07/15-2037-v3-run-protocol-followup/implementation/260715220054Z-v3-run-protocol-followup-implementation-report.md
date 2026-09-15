# Implementation report — V3 run-protocol and status-layer follow-up

Plan executed: `plans/001/` (`docs/threads/260715203715Z-v3-run-protocol-followup/plans/001/`)
Source: `docs/threads/260715094144Z-v3-workflow-fixes/implementation/discussions/260715200148Z-implementation-review-findings-decision-log.md` (P1, P2)
Run topology: `implement-plan-with-subagents` — Opus implementer + Opus merged reviewer per cycle (per invocation).

## Summary of outcome

All five plan tasks ran in order and committed. Every task passed both review lanes (plan-compliance and code-quality) on the first review pass — zero fix iterations across the whole run, and no `BLOCKED` / `NEEDS_CONTEXT` / `REFUSED` outcomes.

| Task | Verified verdict | Commit |
|------|------------------|--------|
| 01 Correct canonical V3 run-protocol docs | DONE | `261ce4b` |
| 02 Reclassify thread handshakes as dialogue-driven | DONE | `5935d32` |
| 03 Apply refusal-vs-blocking preflight to completion skills | DONE_WITH_CONCERNS | `a0c4ab5` |
| 04 Replace single-agent task statuses with factual progress | DONE_WITH_CONCERNS | `5ec0cba` |
| 05 Localize subagent executor return contracts | DONE | `c34ad55` |

Per-task subagent audit: each task = 1 implementer dispatch + 1 merged reviewer dispatch; fix iterations plan-compliance 0 / code-quality 0 in every cycle.

## 1. Deviations from the plan, with justification

- **Task 03 — `spec` in-run `## Blocked` line reworded.** Step 4's literal wording ("change ambiguous source references from `## Blocked` to preflight refusal") collided with the task's own no-match verification grep pattern `route (…) per .*Blocked`, which also matched a *legitimate* pre-existing in-run reference in `spec` (routing an unsettled decision discovered while drafting). The implementer reworded that line from "route it per `## Blocked`" to "queue it as a pending decision per `## Blocked`" — mirroring adjacent phrasing — to satisfy the grep without altering the in-run blocking semantics. The merged reviewer independently confirmed the change is behavior-preserving and the legitimate in-run block path remains intact.
- **Task 04 — `implement` input-reference ambiguity now REFUSES instead of bundling.** The implementer changed input-reference ambiguity from a pending-decisions bundle to a preflight `Outcome: REFUSED`. This goes beyond the literal step wording but is mandated by task step 4 ("resolve and validate the input … Any failure ends `REFUSED`") and by canonical `docs/project/v3/skill-authoring.md`, which lists an ambiguous artifact reference among preflight refusals. The reviewer judged it correct and required, not a stretch.

## 2. Surprises

- **No fix loops anywhere.** All ten subagent dispatches (5 implementer + 5 reviewer) settled cleanly on the first pass. For a corrective change touching canonical docs plus ten skill bodies, zero re-review is notable and reflects the tightly-scoped, decision-log-anchored plan.
- **`open-ticket` has no in-run blocking path at all.** The Task 03 implementer surfaced (and the reviewer confirmed) that ticket creation is a single act with no post-start human intent to discover, so its only terminal outcomes are `REFUSED` (preflight) and `DONE` — it never reaches `BLOCKED`.

## 3. Problems hit

None. No blocked cycles, no non-converging fix loops, no failed commits, no malformed-artifact halts. The worktree was clean at start and the pre-flight (index/tasks agreement) passed.

## 4. Follow-ups

None discovered during implementation. The Task 05 step-13 suite-wide audit was run as part of the plan and came back clean (the whole active `skills/workflow/` suite uses only `DONE` / `BLOCKED` / `REFUSED` as run outcomes; `open-thread` and `archive-thread` carry no `Outcome:` line; no `Four-State Status Protocol` heading remains under `implement/`; every Task 2–5 version bump is present), so there is no residual-drift follow-up to route.

## Notes for the broader review

This run's per-task reviews were deliberately task-scoped gates (each checked one task's diff against that task, not the change as a whole). The natural next step is a spec-level verification of the change as a whole against the source decision log's P1 and P2, plus a coherence read across the five canonical V3 docs and the ten edited skill bodies now that they land together. The two recorded `DONE_WITH_CONCERNS` deviations above are the primary items worth a second look, both already independently reviewer-confirmed as behavior-preserving / plan-mandated.
