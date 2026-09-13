# Plan adherence review — plans/001 against the seed decision log

## References

- Plan under review (index): plans/001/plan.md
- Contract the plan is judged against (also the index's `Source:` artifact — this thread holds no spec; the index records planning-without-spec as the owner's instruction, with the log's `Decision:` fields authoritative): seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md
- Task file the finding traces to (encodes the two-case rule into canonical docs): plans/001/tasks/01-canonical-docs-conventions.md
- Task file the finding traces to (applies the two-case rule to `spec`): plans/001/tasks/04-spec-skill-contract.md
- Task file the finding traces to (applies the two-case rewrite suite-wide): plans/001/tasks/05-completion-skills-blocked-protocol.md
- Task files read for the full adherence pass: plans/001/tasks/02-format-shared-references.md, plans/001/tasks/03-allocate-thread-and-primitive-descriptions.md, plans/001/tasks/06-implement-trio-overhaul.md, plans/001/tasks/07-suite-wide-sweeps.md
- Thread seed, read for context: seed/seed.md
- Thread ledger, read for context: ledger.md
- Current canonical convention doc, consulted to confirm the two-case rule is not standing convention: docs/project/v3/skill-authoring.md
- Current primitive body, consulted for the format-derivation checks in task 2: skills/workflow/primitives/discussion-point/SKILL.md

## Verdict

spec-fault — needs human. One outcome-3 finding remains: the "two-case rule" for pre-run input ambiguity that tasks 1, 4, and 5 encode is a protocol decision the decision log never made, and the plan cannot adhere on this point until the source settles it. All plan-fault (outcome-2) deviations found in the same run were auto-fixed in the plan in place: task 5's audit-file count corrected from ten to nine, the index's two P14 Global Constraints entries recopied verbatim in full, and the dangling `Consumes:`/`Produces:` hand-offs on tasks 2, 4, 5, and 6 closed. Everything else in the plan maps cleanly onto P1–P17.

## Findings

1. **[blocker] Outcome 3 — the plan resolves pre-run input-ambiguity handling, a point the decision log left open, and resolves it in a direction the log's own design arguably points away from. The fix is to the SOURCE (the decision log), not the plan.** Task 1 step 1 writes a "two-case rule" into `docs/project/v3/skill-authoring.md` as canonical convention: (a) pre-run resolution ambiguity (which thread, which artifact is meant) → concise refusal in chat, stop, **no bundle**; (b) mid-run missing human intent → the bundle protocol. Task 4 step 6 and task 5 steps 1–2 then propagate that rule across `spec` and roughly seventeen more completion-oriented skills. But P1's `Decision:` field states a single universal blocked protocol (finish what's safely derivable → `/emit-pending-decisions` → notification → stop) and explicitly handles clarifications *inside* the bundle: no `.pending-clarifications/` folder, clarification-vs-decision distinguished at resolution time, the bundle header gaining the originating user request "so a clarification is answerable from the file alone". The rule appears nowhere in the log and nowhere in the current canonical docs or suite — it originates in this plan. The choice was partly unavoidable (a which-THREAD ambiguity mechanically cannot be bundled, since `.pending-decisions/` lives inside the thread folder that failed to resolve), but the plan generalized it to which-ARTIFACT ambiguities too, which *could* be bundled — and P1's driving rationale ("the filesystem queue is the interface, so every open question must be durable by construction") cuts against a chat-only refusal that leaves no durable trace for the planned orchestrator. Why it matters: task 1 makes this canonical convention and tasks 4–5 spread it suite-wide; if the owner disagrees after implementation, the rework spans the convention docs plus most of the suite, and an orchestrator built against "pending files are the ping signal" would silently miss every input-ambiguity stall. The spec-side fix is an owner-approved amendment of the source — a new appended decision record settling pre-run ambiguity handling — not a plan edit that picks an answer.

## Evidence

- Source, P1 `Decision:` field: "the bundle shape gains the originating user request so a clarification is answerable from the file alone" — clarifications route through the bundle, distinguished at resolution time.
- Source, P1 `Rationale:` field: "every open question must be durable by construction and skill behavior must be identical regardless of invoker."
- Plan, task 01 (`tasks/01-canonical-docs-conventions.md`), Steps, step 1: "(a) pre-run resolution ambiguity (which thread, which artifact is meant) → concise refusal in chat naming the ambiguity, stop, no bundle" — a durability carve-out P1 never states.
- Plan, task 04 (`tasks/04-spec-skill-contract.md`), Steps, step 6: "thread-resolution ambiguity (step 1) becomes a concise refusal that names the ambiguity and stops (no waiting in chat, no bundle)."
- Plan, task 05 (`tasks/05-completion-skills-blocked-protocol.md`), Steps, steps 1–2: "Rewrite ask-language per the two-case rule … pre-run resolution ambiguity … → concise refusal naming the ambiguity, stop."
- Absence check: `grep -rn "two-case" docs/ skills/` matches nothing outside this thread; the current `skill-authoring.md` interaction-posture section carries no refusal branch for input ambiguity.

## Open Questions

- This thread holds no spec; per the index's own declaration ("This plan deliberately compiles from a decision log rather than a spec (owner's instruction)"), the seed decision log was used as the contract for the full adherence check rather than falling back to structural checks only. Is that arrangement confirmed? Only the spec owner can say.
- For the spec owner: when a completion-oriented skill cannot resolve its inputs before starting, what is the intended behavior? Which-thread ambiguity cannot produce a bundle (no thread folder resolved) — should that lone case refuse in chat while which-artifact ambiguity inside a resolved thread still bundles (preserving durability-by-construction), or is the plan's broader chat-refusal rule for all pre-run ambiguity actually what the owner wants?

## Next Actions

- Amend the source: append a new owner-approved decision record to seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md settling pre-run input-ambiguity handling for completion-oriented skills (refuse vs bundle, and where the which-thread carve-out sits). Then re-check tasks 1, 4, and 5 against the settled wording and re-run this adherence review. Do not edit the plan to pick an answer in the meantime.
