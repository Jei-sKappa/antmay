# Plan: make the implementation report the single completion account

This plan removes the `implement-plan` skill from the suite and reshapes how the two remaining implement skills, `implement` and `implement-plan-with-subagents`, account for a finished run. After it lands, the implementation report is the one place a reader learns whether the run completed, where it departed from something pinned, and which judgment calls it made. The report's `## Changes` becomes a task ledger that points at the plan rather than restating it. The run progress file becomes an append-only log of typed one-line entries the report is folded from. The final chat message restates nothing. The implementer outcome file in `implement-plan-with-subagents` goes away, and `review-implementation` reads the reshaped report.

Context a reader needs before opening a task file:

- All paths below are repo-relative. Suite scripts run from `suite/`, as `suite/AGENTS.md` states.
- The report format and the report-writing instruction are shared references. Edit them only at `suite/shared/references/`, then mirror them with `node scripts/sync-shared-references.mjs`. Never hand-edit a copy under a skill's `references/`.
- The thread's delta lands two project-layer changes at close: the `task ledger` term (`delta/docs/glossary.md`) and the `implement/` layout line in `suite/AGENTS.md` (`delta/suite/AGENTS.md`). No task edits `docs/glossary.md` or `suite/AGENTS.md`. Until the thread closes, the layout line in `suite/AGENTS.md` still names `implement-plan`, and it is the only such hit outside `cli/` and `.work/`.
- `cli/` is on hold (root `AGENTS.md`, `### The CLI is on hold`). The CLI still names `implement-plan` in `cli/src/pipeline/catalog.ts`, `cli/src/pipeline/stage-id.ts`, their tests, `cli/README.md`, `cli/AGENTS.md`, and its demo and scenario scripts. That drift is not fixed here. The implementation report carries it under `## Follow-ups`.
- The implementation report should also name, under `## Follow-ups`, three places the constraints keep out of scope that still read the old shape. `suite/authoring/interaction-posture.md` (`## Internal progress and local return tokens`) describes progress as per-task fields. `suite/skills/review/review-code/SKILL.md` reads `## Changes` as the place that locates the code. `suite/shared/references/instructions/search-for-thread-references.md` reads the files `## Changes` names.
- Every file written under `suite/skills/` or `suite/shared/references/` has to pass `node scripts/check-skill-text.mjs`. In practice that means: a `references/` path always carries the `<skill_path>/` prefix, write "following `<skill_path>/…`" rather than "per `<skill_path>/…`", and no fence line has leading whitespace, even inside a numbered list.

Source: spec.md

## Global Constraints

- Only `implement`, `implement-plan-with-subagents`, `review-implementation`, the report format and its writing instruction are reshaped, because only those remain once `implement-plan` is removed (`log.md`).
- Nothing under `cli/` is edited, per the root `AGENTS.md` rule that the CLI is on hold; the drift is named in this spec and carried into the report's follow-ups.
- The terminal outcome line stays exactly as the protocol defines it, because the CLI and every caller classify runs by it.
- The report still never cites a path under `.runs/`, and a report is still written at every terminal outcome an executing run reaches.
- The glossary distinction between a deviation and a judgment call holds in every report, because the closing currency check reads deviations as departures from the spec.
- Shared references are edited at their canonical source under `suite/shared/references/` and mirrored with `node scripts/sync-shared-references.mjs`. Both suite gates (`node scripts/check-marketplace-skills.mjs`, `node scripts/check-skill-text.mjs`) pass on the finished change (`suite/AGENTS.md`).

## Tasks

1. **Remove the `implement-plan` skill** — delete the skill folder and every registration and mention of it outside `cli/` and `.work/`. → `plan-tasks/01-remove-implement-plan.md`
2. **Reshape the report format and its writing instruction** — give the report its new section order, the judgment-calls section, the task ledger, and the exception-only verification, and fold it from typed progress entries. → `plan-tasks/02-reshape-report-format-and-instruction.md`
3. **Reshape the `implement` completion account** — switch `implement` to typed progress entries, ledger-based resume, and a final message that restates nothing. → `plan-tasks/03-reshape-implement.md`
4. **Reshape the `implement-plan-with-subagents` completion account** — switch the orchestrator to typed progress entries, ledger-based resume, and a final message that restates nothing. → `plan-tasks/04-reshape-subagents-progress-and-message.md`
5. **Drop the implementer outcome file** — move the implementer's assumptions, known risks and skipped checks into its reply, and from there into the reviewer brief and the progress file. → `plan-tasks/05-drop-implementer-outcome-file.md`
6. **Teach `review-implementation` the reshaped report** — locate code through the ledger's commits, and test ledger lines, judgment calls and verification exceptions as claims; then run the whole-change checks. → `plan-tasks/06-reshape-review-implementation.md`
