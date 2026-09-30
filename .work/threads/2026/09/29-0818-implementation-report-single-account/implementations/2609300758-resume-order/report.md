# Implementation report

Plan: none — the spec amendment of 2026-09-30 to recovery within an invocation.

## Outcome

The run completed: both implement skills now resume at the first task with no `done` entry. The changes are left uncommitted at the user's request.

## Judgment calls

- Task 1: the recovery text in both skills states why the last `done` entry is not the resume point — fills the prose freedom the spec grants the skill bodies — so a later edit does not restore the old rule by instinct.
- Task 1: `implement-plan-with-subagents` names the order as "the index's order" — fills the spec's inference on task order — because that skill always runs from a plan index, while `implement` keeps "task order", which covers a derived task list too.
- This report uses the suite's reshaped format — fills the silence on which format a run applies when the installed skill predates the suite's own change — because `review-implementation` in this repository reads the reshaped shape.

## Changes

- 1. Recovery resumes at the first task with no `done` entry, in `suite/skills/implement/implement/SKILL.md` and `suite/skills/implement/implement-plan-with-subagents/SKILL.md` — uncommitted; judgment calls: Task 1.

## Verification

- From `suite/`: `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs` both pass on the final state.
- `node scripts/sync-shared-references.mjs` leaves no mirror changed.
- No check was skipped.

## Acceptance

| Criterion | Method | Evidence |
| --- | --- | --- |
| Both skills state that recovery within an invocation resumes at the first task, in task order, that has no `done` entry in the progress file, read together with `git log`. | code review | `implement/SKILL.md:118` and `implement-plan-with-subagents/SKILL.md:179` each state it, together with reading `git log`. `rg 'resumes after the last \`done\`'` over `suite/` finds nothing. |

The spec's other criteria were delivered by the earlier report of this thread and are untouched by this change.

## Remaining concerns

- The two concerns the earlier report raised and this amendment did not take up still stand: neither implement skill says when a run appends a `check` or a `follow-up` entry, and the implementer Scope bullet of `implement-plan-with-subagents` still places the findings file under `.runs/` rather than `.runs/task-NN/`.
