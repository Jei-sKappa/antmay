## References

- Implementation under review: `skills.v3` commit range `c6ad673..60f70bb`
- User-authorized contract baseline (used in place of a canonical spec): `seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md`
- Implementer's outcome account: `implementation/260715190847Z-v3-workflow-fixes-implementation-report.md`
- Navigational plan index: `plans/001/plan.md`
- Navigational task brief for the spec contract: `plans/001/tasks/04-spec-skill-contract.md`
- Navigational task brief for completion-oriented skills: `plans/001/tasks/05-completion-skills-blocked-protocol.md`
- Navigational task brief for the implement trio: `plans/001/tasks/06-implement-trio-overhaul.md`
- Navigational task brief for suite-wide sweeps: `plans/001/tasks/07-suite-wide-sweeps.md`

## Verdict

**Partially delivers.** The implementation covers P2–P17 substantially, but the unified blocked protocol promised by P1/P18 remains incomplete across completion-oriented entry points, and some `NEEDS_CONTEXT` exits do not map unambiguously to P19's closed terminal-outcome vocabulary.

## Findings

- **[blocker] Acceptance-criteria coverage / behavior fidelity — P1 and P18 are not implemented suite-wide.** Completion-oriented skills still contain attended chat pauses, resolvable artifact ambiguities that refuse instead of queueing a clarification, and explicit “no bundle” exceptions for trivial clarifications. The implement trio also says an invocation may opt into interactive check-ins. These paths recreate the availability-dependent stalls and invisible open questions P1 was specifically intended to eliminate, so a filesystem-driven orchestrator cannot rely on `.pending-decisions/` as the durable signal for every answerable clarification.

- **[issue] Behavior fidelity — `NEEDS_CONTEXT` does not consistently resolve to P19's terminal outcomes.** The implement trio retains task/cycle-level `NEEDS_CONTEXT` for user clarification and structural plan faults, but the single-agent final-message rules specify `DONE`, failed-commit/open-decision `BLOCKED`, and input-resolution `REFUSED` without defining the terminal line for every `NEEDS_CONTEXT` stop. In `implement`, a run can even reach the “every task ran” `DONE` rule with incomplete `NEEDS_CONTEXT` tasks. A downstream orchestrator therefore cannot determine consistently whether these runs are blocked, refused, or done.

## Evidence

### Finding 1 — unified blocked protocol gaps

- Contract: P1 requires completion-oriented skills to lose attended asks entirely, behave identically regardless of invoker, and durably bundle clarifications (`seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md`, P1 `Decision:`). P18 narrows chat refusal to no-thread or ambiguous-thread cases and requires every other pre-run ambiguity inside a resolved thread to emit a pending-decisions bundle (same log, P18 `Decision:`).
- Implement trio: `skills/workflow/implement/implement/SKILL.md:12`, `:56`, and `:64`; `skills/workflow/implement/implement-plan/SKILL.md:12`, `:94`, and `:106`; `skills/workflow/implement/implement-plan-with-subagents/SKILL.md:12`, `:86`, and `:94` preserve invocation-controlled interaction and dirty-worktree `ASK`/wait branches.
- Reviews: `skills/workflow/review/review-code/SKILL.md:30` and `skills/workflow/review/review-implementation/SKILL.md:36` refuse when a code reference is vague or matches multiple candidates even after the thread has resolved, rather than emitting the P18 clarification bundle.
- Other completion-oriented paths: `skills/workflow/merge/merge-artifacts/SKILL.md:55`, `skills/workflow/roadmap/roadmap/SKILL.md:128`, and `skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md:54` explicitly say trivial input clarifications need no bundle; `skills/workflow/capture-discussion/open-ticket/SKILL.md:42` and `:82` still ask in chat when tracker ownership is unclear.
- The implementation does encode the intended rule canonically at `docs/project/v3/skill-authoring.md:15-19`, which makes the remaining runtime bodies internally inconsistent with the suite convention introduced by the same diff.

### Finding 2 — unmapped `NEEDS_CONTEXT` terminal paths

- Contract: P19 requires exactly one final `Outcome:` line for every completion-oriented run, using only `DONE`, `BLOCKED`, or `REFUSED`; an in-run stop is `BLOCKED` and a run that completed its job is `DONE` (`seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md`, P19 `Decision:`).
- `implement`: `skills/workflow/implement/implement/SKILL.md:34` defines user clarification as `NEEDS_CONTEXT`, while `:78-80` only names halted `BLOCKED` tasks and gives no terminal mapping for a `NEEDS_CONTEXT` task before applying the “every implicit task ran” `DONE` branch.
- `implement-plan`: `skills/workflow/implement/implement-plan/SKILL.md:44` defines `NEEDS_CONTEXT`; `:127`, `:134`, and `:189` create stopping/reporting paths for it, while `:136-138` specifies final outcomes only for all-tasks-ran, failed-commit, queued-decision, and input-refusal cases.
- `implement-plan-with-subagents`: `skills/workflow/implement/implement-plan-with-subagents/SKILL.md:58`, `:111`, and `:273` preserve terminal `NEEDS_CONTEXT`; `:123` collapses any stopping cycle into `BLOCKED`, unlike the less explicit single-agent executors. The three implementations therefore do not share one deterministic mapping.

### Decision coverage summary

- **Partial:** P1 and P18 (Finding 1); P19 (Finding 2).
- **Delivered:** P2's bounded failed-commit loop is present in all three implement skills (`skills/workflow/implement/implement/SKILL.md:117-125`, `skills/workflow/implement/implement-plan/SKILL.md:164-172`, `skills/workflow/implement/implement-plan-with-subagents/SKILL.md:248-256`).
- **Delivered:** P3 and P4 are reflected in the seven-element spec contract, degrees-of-freedom bar, two legal lossless-authoring moves, and fullest-derivable blocked emission (`skills/workflow/spec/spec/SKILL.md:27-87`).
- **Delivered as revised:** P5–P10 are represented by the shared decision/discussion formats, five retained behavioral primitives, `allocate-thread` rename, exclusive primitive descriptions, and creative/practical discussion-point rules (`shared/manifest.yaml:22-31`, `docs/project/v3/skill-authoring.md:58-70`, `shared/references/formats/discussion-point.md:7-20`).
- **Delivered:** P11 and P12 move roadmap feedback and the plan-strict worked example behind natural reference pointers (`shared/manifest.yaml:33-40`, `skills/workflow/plan/plan-strict/SKILL.md:122`).
- **Delivered:** P13–P15 are encoded as `## Procedure`, persistent run workspaces, and `.implementation-runs/<UTC>[-<desc>]` (`docs/project/v3/skill-authoring.md:85-99`, `skills/workflow/implement/implement/SKILL.md:82-90`).
- **No implementation change required:** P16 retains the singleton current-state implementation report.
- **Delivered:** P17 adds interface metadata to all 37 active skills with role policy separated from picker metadata (`docs/project/v3/skill-authoring.md:47-56`; 37 `SKILL.md` files and 37 `agents/openai.yaml` files are present in the reviewed tree).

## Open Questions

- Should `open-thread` and `archive-thread` be canonically classified as dialogue-driven or completion-oriented? The implementation adds P19 outcome lines while preserving their normal-path user questions; the decision log defines posture behavior but does not enumerate these edge cases.
- Should a structural plan fault remain a report-only `NEEDS_CONTEXT` concept, or should it map to P19 `BLOCKED` with a diagnosis? P2 says plain defects should not emit decision bundles, but P19 provides no `NEEDS_CONTEXT` terminal token.
- Test coverage was skipped: this repository is content-only and defines no build, test, or lint pipeline; the reviewed decisions describe Markdown, metadata, and configuration outcomes rather than executable behavior requiring tests.

## Next Actions

- Run a fresh implementation pass that removes attended chat waits from completion-oriented entry points and routes every resolvable clarification through `/emit-pending-decisions`, including dirty-worktree consent, ambiguous review targets, tracker ownership, and the trivial-clarification exceptions.
- Normalize every `NEEDS_CONTEXT` exit: genuine human intent or request repair should emit a bundle and end `BLOCKED`; non-decision in-run defects should end `BLOCKED` with a diagnosis; unmet preconditions before work starts should end `REFUSED`.
- Record the posture classification for question-asking edge skills, then re-review the corrective commit range against P1, P18, and P19 before landing it.
