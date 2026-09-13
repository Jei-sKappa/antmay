# Task 4: Replace single-agent task statuses with factual progress

**Objective:** Remove the formal four-state task protocol from `implement` and `implement-plan`, preserve their audit trail as factual progress, and map every invocation deterministically to the universal run outcome.

**Input / context:** `docs/threads/260715094144Z-v3-workflow-fixes/implementation/discussions/260715200148Z-implementation-review-findings-decision-log.md P1` governs preflight and blocking; `P2` removes formal task statuses from single-agent executors and names the facts their progress records must retain. Start from the corrected completion-skill boundary produced by Task 3.

**Steps:**

1. In both skills, remove the `## Four-State Status Protocol` section, status-token templates, claimed/verified language, and every requirement to assign `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT` to an internal task.
2. Remove the invocation-controlled interactive-check-in behavior from each introduction and procedure; the execution posture is identical regardless of whether a person is present.
3. Rewrite dirty-worktree handling as the first safety preflight: proceed only from a clean tree or invocation-supplied advance authorization that explicitly acknowledges existing changes will be preserved and may enter implementation commits. Otherwise refuse immediately, name the dirty paths, and give the exact authorization needed to re-invoke; do not ask or wait.
4. Complete all remaining preflight before allocating `.implementation-runs/`, updating `implementation-report.md`, editing project files, or committing: resolve one thread, resolve and validate the input or strict plan, run the plan's structural checks, and verify explicitly required tooling and credentials. Any failure ends `REFUSED` and writes no workflow artifact.
5. Replace the per-task status block with an ordinary factual progress block carrying: task attempted, changes made, verification performed and result, concerns, commit SHA/subject or `none`, and next action. Keep one append-only block per attempted task in `progress.md`; use the same facts, without a status field, in commit bodies where applicable.
6. In each task loop, let completed work with non-blocking concerns continue and record those concerns factually. If missing human intent is discovered after execution starts, finish safe work, emit one pending-decision bundle, update the implementation report, and end the run `BLOCKED`.
7. Map an unfixable in-run operational defect — including an exhausted commit retry, an inaccessible external dependency, a runtime failure, or malformed task detail not covered by the completed structural preflight and discovered only during lazy execution — to `BLOCKED` with a diagnosis and no decision bundle. A structural plan mismatch detected by the mandatory preflight remains `REFUSED`. Distinguish a genuine missing-intent question from a defect before selecting the bundle path.
8. Rewrite plan-deviation and self-review guidance so assumptions, judgment calls, unverified checks, concerns, and deviations feed the factual progress block and implementation report without creating a task status.
9. Rewrite final summaries to fold the factual blocks from disk and end exactly once: `DONE` when the requested operation completed, including completion with non-blocking concerns; `BLOCKED` when substantive execution began but could not finish; `REFUSED` when preflight prevented execution.
10. Preserve the bounded failed-commit repair loop, per-task commit cadence, no-history-rewriting rule, roadmap-descendant feedback, run-workspace persistence, and `/update-implementation-report` behavior except where their prose refers to removed task statuses.
11. Bump `implement` from `4.1.0` to `4.2.0` and `implement-plan` from `5.1.0` to `5.2.0`.
12. Re-read both files end to end and remove dangling references to status blocks, interactive waiting, or `NEEDS_CONTEXT` terminal mapping.

**Files modified:**

- `skills/workflow/implement/implement/SKILL.md`
- `skills/workflow/implement/implement-plan/SKILL.md`

**Verification:** Run `rg -n "Four-State Status Protocol|DONE_WITH_CONCERNS|NEEDS_CONTEXT|Task .*status|four-state|verified status|claimed status|interactive check|ASK|Wait for the user's answer" skills/workflow/implement/{implement,implement-plan}/SKILL.md` and confirm it returns no matches. Run `rg -n "Task attempted|Changes made|Verification|Concerns|Commit|Next action" skills/workflow/implement/{implement,implement-plan}/SKILL.md` and confirm the factual progress shape is fully specified. Run `rg -n "advance authorization|preserved|may enter implementation commits|Outcome: DONE|Outcome: BLOCKED|Outcome: REFUSED" skills/workflow/implement/{implement,implement-plan}/SKILL.md` and confirm preflight and terminal mapping are explicit. Run `rg -n "version: (4\.2\.0|5\.2\.0)" skills/workflow/implement/{implement,implement-plan}/SKILL.md` and confirm the assigned version in each file.

**Acceptance criteria:**

- Neither single-agent skill defines or emits a formal internal task-status token.
- Progress and commit-body records retain the task, changes, verification, concerns, commit, and next-action facts.
- Dirty trees without sufficient advance authorization refuse without asking and without workflow-artifact writes.
- All input, structure, tooling, credential, and safety checks complete before the run workspace is allocated or execution starts.
- Missing in-run human intent queues a decision and blocks; operational failure blocks with diagnosis and no bundle.
- Completion with non-blocking concerns ends `DONE`.
- Both skills preserve their existing commit, report, feedback, and run-trace guarantees and carry the specified version bumps.

**Consumes:** Canonical run-protocol baseline — the preflight/refusal, in-run blocking, terminal-outcome, interaction-posture, and internal-progress rules in `docs/project/v3/skill-authoring.md`, `docs/project/v3/thread-model.md`, and the Quick, Standard, and Roadmap workflow documents; Completion-skill preflight baseline — refusal-versus-blocking behavior in `open-ticket`, `plan-brief`, `plan-strict`, `spec`, `merge-artifacts`, `roadmap`, and `materialize-roadmap-threads`, with atomic child-materialization preflight.

**Produces:** Single-agent factual-progress baseline — preflight ordering, factual progress fields, and universal run-outcome mapping in `skills/workflow/implement/implement/SKILL.md` and `skills/workflow/implement/implement-plan/SKILL.md`.
