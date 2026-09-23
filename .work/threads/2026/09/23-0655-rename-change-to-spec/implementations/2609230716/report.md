# Implementation report

Plan: none

## Outcome

The "another thread is history" rule is now stated in the `## Inputs` of every skill that gathers thread inputs, in the wording the shared read-and-cite instruction carries, which answers the question the earlier implementation left queued. With it, everything this thread settled that lives outside the project layer is in the working tree. The glossary and `docs/product/method.md` still carry the old term; they change only through the thread's delta and its landing at close. Nothing was committed.

## Changes

- `## Inputs` of `discussion`, `resolve-pending-decisions`, `spec`, `plan-brief`, `plan-strict`, `check-plan`, `implement`, `implement-plan`, `implement-plan-with-subagents`, `review-spec`, `review-implementation`, `review-code`, `close-thread` and `roadmap` under `suite/skills/`: one closing paragraph, "Any other thread is history: it records how its own work was understood at the time, not what holds now, so do not read it unless the user or this thread's seed names it."

## Verification

- `node scripts/check-skill-text.mjs` (from `suite/`): OK, 146 files.
- `node scripts/check-marketplace-skills.mjs`: OK, 18 skills.
- Diff read for the `discussion` insertion; every insertion lands after the inputs list and before the next paragraph.

## Acceptance

The thread holds no spec; the criterion is the settled log line.

| Criterion | Method | Evidence |
| --- | --- | --- |
| the "another thread is history; read it only when the user or this thread's seed names it" rule is stated in the ## Inputs of every skill that gathers thread inputs, with the line in read-and-cite-the-project-layer.md kept as the canonical wording | code review | the sentence is present in the 14 skills listed under Changes, identical to the instruction's line |

## Deviations

- Ran on a worktree dirty with the earlier implementation's uncommitted work and without a commit — departs from the implement skill's dirty-worktree gate and default commit cadence — the user's standing instruction for this work is not to commit, so no pre-existing change could enter a commit.

## Remaining concerns

- The pending-decision bundle `.pending-decisions/260923071500Z-k7q2-history-line-reach.md` is answered by the log but still on disk; clearing it is outside this run's write boundary.

## Follow-ups

- Run `spec` to draft the delta for `docs/glossary.md` and `docs/product/method.md`, then `close-thread` to land it.
