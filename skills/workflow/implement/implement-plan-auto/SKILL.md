---
name: implement-plan-auto
description: Take a V1 plan artifact path (loose or strict granularity, produced by any of the Phase 4 plan-* skills) and execute every plan task in order on the current working tree — self-reviewing after each task and auto-committing per plan task. Single-agent (current session + self-review); no subagents are spawned. Use when you have a plan artifact under `docs/threads/<thread>/plans/` and want it executed end-to-end without a per-task ASK — not when you want to confirm each commit (use `implement-plan-interactive`), not when the input is less-structured rather than a plan artifact (use `implement-auto` or `implement-interactive`), and not when you want a heavier subagent-driven review loop on each task (use `implement-plan-with-subagents-auto` or `implement-plan-with-subagents-interactive`).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Implement Plan Auto

Execute a V1 plan artifact end-to-end on the current working tree. This skill is the autonomous half of the V1 plan-driven single-agent implementation pair — it reads the plan artifact READ-ONLY, walks the numbered task list in plan order, implements each task, self-reviews after each task, auto-commits per plan task, and reports a four-state status per plan task on the way out. It does not ask clarifying questions at each step, it does not ask before committing, and it does not rewrite history.

`implement-plan-auto` is one of six V1 implementation skills. The two implementation axes are independent — input shape (less-structured vs plan-driven) and execution mode (auto vs interactive) — with a third axis (single-agent vs subagent-driven) crossing the plan-driven half per D66. The six skills are:

- `implement-auto` — less-structured input, autonomous, single-agent. Use when you do NOT yet have a plan artifact; the skill derives implicit tasks from the input itself.
- `implement-interactive` — less-structured input, collaborative, single-agent.
- `implement-plan-auto` (this skill) — plan-driven input, autonomous, single-agent.
- `implement-plan-interactive` — plan-driven input, collaborative, single-agent. Use when you want the agent to ASK before each commit and push back per the anti-sycophancy stance during the walk.
- `implement-plan-with-subagents-auto` — plan-driven input, autonomous, multi-subagent (orchestrator + implementer subagent + spec-compliance reviewer + code-quality reviewer per D70). Use when you want the heavier review loop on each task.
- `implement-plan-with-subagents-interactive` — plan-driven input, collaborative, multi-subagent.

The TWO axes for picking among these skills are:

- **INPUT-SHAPE axis** — plan-driven (this skill) vs. less-structured input. Plan-driven means the input is a V1 plan artifact path produced by one of the Phase 4 plan family skills (`plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, `plan-strict-interactive`, `adjust-plan-granularity-auto`, `adjust-plan-granularity-interactive`). Less-structured input is anything else — a spec, a proposal, a decision log, a GitHub issue, an Inbox item, a code context reference, or a raw prompt. If you do not have a plan artifact path, use `implement-auto` or `implement-interactive` and the plan-driven family does not apply.
- **TOPOLOGY axis** — single-agent (this skill) vs. multi-subagent. Single-agent means the CURRENT session both implements and self-reviews; no `Task` tool spawn, no subagent dispatch, no orchestrator handoff. Multi-subagent means a separate implementer subagent runs each task, a spec-compliance reviewer subagent grades it (D70), a code-quality reviewer subagent grades it again (D70), and on review failure a NEW implementer subagent is spawned for the fix (D71). If you want the heavier review loop, switch to `implement-plan-with-subagents-auto` or `implement-plan-with-subagents-interactive`.

The two axes cross per D66 — and ONLY plan-driven input gets a `*-with-subagents-*` variant in V1. There is no `implement-with-subagents-*`. If you want subagent review on a less-structured input, the right move is to first shape a plan artifact via the Phase 4 family and then hand that plan to one of the subagent skills.

V1 stance per the Phase 5 context: this skill is SINGLE-AGENT. The current session is the implementer; the same session runs the self-review pass after each plan task. No `Task` tool spawn, no subagent dispatch, no orchestrator handoff. If your runtime supports subagents and you want a heavier review loop, switch to `implement-plan-with-subagents-auto` instead.

## Inputs

`implement-plan-auto` accepts a V1 plan artifact path. The plan artifact lives under:

```text
docs/threads/<thread>/plans/<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-plan.md
```

per the V1 versioned-form filename grammar in `docs/workflow/v1/filename-grammar.md`. The plan was produced by one of the Phase 4 plan-family skills — `plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, `plan-strict-interactive`, `adjust-plan-granularity-auto`, or `adjust-plan-granularity-interactive`. Both LOOSE and STRICT granularities are valid input — both honor the D59 contract (every plan task is **sequential, isolated, independently implementable, and independently reviewable**), and both are executed in plan order by this skill.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the skill executes only the named task(s); when omitted, the skill executes every numbered task in the plan in order. Even when only one task is named, the rule still applies — read the plan READ-ONLY, run the task, self-review, commit per the `## Commit Policy`, and write the four-state status report.

If the input is ambiguous — multiple plan artifacts exist in the thread and the user named "the plan" without a specific path, the user pointed at a `plans/` folder containing two competing versions for the same target version, or the user passed a descriptor that matches multiple files — ASK the user which plan artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest plan" algorithm. Do not silently pick by recency, by highest version number, or by sort order.

The plan artifact's task fields drive execution. Loose-granularity plans give one or two task sentences per task — the implementer infers the obvious substeps from the objective + verification statement. Strict-granularity plans give a six-field block per task (objective / input-context / steps-substeps / files-modified / verification / acceptance criteria — see `skills/workflow/plan/plan-strict-auto/SKILL.md` for the contract) — the implementer follows the substeps literally with no inference required. Either granularity is valid input; treat the granularity as a property of the plan, not a switch on this skill.

## Four-State Status Protocol

Per D74 (IMPL-10), every task report carries one of FOUR statuses. The states are named exactly as listed below; downstream readers (and downstream skills, particularly `review-implementation-*` in Phase 6) match against these tokens. Use the names verbatim.

- The state DONE — `DONE` — means the plan task was completed and the implementer has no concerns to surface. The objective and acceptance criteria are met, the self-review pass found nothing to flag, and the verification block from the plan task (if any) passes mechanically. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the plan task was completed but the implementer has at least one concern to surface: partial test coverage, a code smell that did not warrant blocking the task, an ambiguous plan area the implementer made a judgment call on, a possible-but-unverified edge case, a minor deviation from the plan that the implementer applied per `## Plan Deviation Policy`. The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the plan task could not be completed. Includes failed commits per D77 (see `## Commit Policy`), missing dependencies, inaccessible files, contradictory plan tasks, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent plan tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the plan task cannot proceed without information the implementer does not have. Includes "user clarification needed", "access to file outside repo needed", "external system credentials needed", "the plan task contradicts the observed code state and the implementer cannot pick the right side without input". `NEEDS_CONTEXT` is distinct from `BLOCKED`: a `BLOCKED` task hit a hard error during execution; a `NEEDS_CONTEXT` task did not start because the missing input was a precondition.

### Task report block shape

The four-state status appears as a structured block in chat output and/or the commit message body for the task's commit (where applicable). The four-state status is NOT written to a separate artifact file in V1 — the chat output and the commit history together are the audit trail.

Suggested format (exact wording is at the implementer's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 5–10 line range):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Notes: <1–3 sentences explaining the rationale or surfaced concerns. Cite settled decisions by absolute path + D<N> when relevant.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY plan task by its four-state status, plus the commit SHA + subject for every commit made during the run. This is the implementation audit trail; the user reads it to understand what the plan accomplished and what to do next.

## Dirty Worktree Handling

Per D79 (IMPL-14), this skill OWNS the dirty-worktree check — there is no orchestrator separate from this skill in the single-agent variant. The check is non-skippable. Run it ONCE at the start of the run, BEFORE reading the plan artifact.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the plan-resolution step.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill makes) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit this skill makes (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not read the plan, do not commit, do not modify the worktree further.

In V1, this skill does not use `git worktree` isolation per D78 — every implementation runs on the current working tree, so the dirty-worktree check is non-skippable.

## Single-Agent Topology

This skill is SINGLE-AGENT. The current session reads the plan, executes each plan task in order, and self-reviews after each task. NO subagents are spawned. There is no `Task` tool invocation, no implementer / reviewer separation, no orchestrator role distinct from the implementer role — the single session IS both, and the self-review pass after each task is the only review layer in V1's single-agent topology.

If the user wants subagent-driven execution (orchestrator + implementer subagent + spec-compliance reviewer subagent + code-quality reviewer subagent per D70, with re-spawn of a NEW implementer subagent on review failure per D71, and re-review of the fix per D72), they should pick `implement-plan-with-subagents-auto` (for autonomous orchestration) or `implement-plan-with-subagents-interactive` (for ASK-before-commit orchestration) instead. The subagent skills also re-locate the dirty-worktree check to the orchestrator role per D79 — that delta does not apply here because in this single-agent skill, the orchestrator role does not exist.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. If the worktree is clean, proceed. If dirty, ASK; on abort, stop.

2. **Resolve the active thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If the plan artifact path the user passed is already absolute or thread-rooted, the thread is implicit. If multiple thread roots exist and the plan path is ambiguous about which thread it belongs to, ASK per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

3. **Resolve the plan artifact path.** Detect the plan path from the user's invocation. If multiple plan artifacts could plausibly match the user's reference (multiple versions, candidate variants with descriptors, "the plan" with no clear referent), ASK the user which plan is intended per `docs/workflow/v1/immutability.md`. Do not pick by recency, by highest version number, or by descriptor match.

4. **Read the plan READ-ONLY.** Per `docs/workflow/v1/immutability.md`, the plan artifact is IMMUTABLE — open it for reading only. Parse the numbered task list. For each task, record its objective, its verification block (if present), its acceptance criteria (if present in strict-granularity plans), and its files-modified list (if present in strict-granularity plans). If the user passed a specific task identifier, narrow the task list to that subset; otherwise execute every numbered task in plan order.

5. **For each plan task IN ORDER:** (Sequential execution per the D59 contract — there are no waves; the implicit dependency is "the previous numbered plan task ran first".)

   a. **Implement the task.** Apply the substeps if the plan is strict-granularity — follow the steps block literally. Infer the obvious substeps if the plan is loose-granularity — read the objective sentence and the verification statement, derive the substeps the human-leaning author left implicit. Make the code changes the task calls for. Use judgment if the plan is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — surface the deviation in the task report per `## Plan Deviation Policy`.

   b. **Self-review the implementation.** Re-read the diff against the plan task's stated objective + verification + acceptance criteria. Check that the change is coherent with the plan, does not break adjacent code paths the implementer can see, and matches the project's conventions. If the plan task has a mechanical verification block (a `grep` check, a `test -f` check, a `npm test` invocation), run it and record the result. Self-review is in-session — no artifact file is written.

   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this plan task and stop the entire run.

   d. **Write the task report.** Use the four-state status block from `## Four-State Status Protocol`. The state goes in chat output and / or the commit message body.

6. **Final out-message.** Once every plan task has run (or the run was halted at a `BLOCKED` task), emit a final summary listing every plan task by its four-state status plus the commit SHA + subject for each commit made. Include the plan artifact path (relative to repository root) so the user has the audit trail anchored to the source plan.

## Commit Policy

This skill auto-commits. Cadence is governed by D75 — and only by D75.

- **Cadence:** ONE commit per plan task that the agent executes from the plan — **per plan task** (one commit per successful plan task). The boundary is the plan task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple plan tasks into one commit. Do not split one plan task across multiple commits.
- **Override:** If the user's invocation contains an EXPLICIT Git instruction (for example, "commit at the end as one commit", "do not commit, just leave the changes staged"), honor the explicit instruction over the default per-plan-task cadence. The user's explicit instruction wins.

Commits use the project's conventional-commit shape where applicable; follow the project's `AGENTS.md` for scope rules. Stage only the files the plan task touched (strict-granularity plans state the file list explicitly under `Files modified` — use it; loose-granularity plans require the implementer to track touched files during implementation). Never run `git add -A` blindly. Commit subjects are descriptive of the plan task's objective, not its substeps. Commit message bodies MAY include the four-state task report block from `## Four-State Status Protocol` so the audit trail lives in git history as well as chat output.

### Failed commit

Per D77: **If a commit fails, report `BLOCKED` and stop. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), then stop the entire run. Subsequent plan tasks are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject, a sign-off was missing. Each of those is the project telling the implementer to stop and let the user diagnose. `BLOCKED` is the correct response.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

Per D80, the policy is judgment-based and surfaced-via-task-report — not pre-clearance, not blanket permission.

- **Follow the plan.** The plan is the contract; the implementer executes the tasks in plan order, applying substeps where stated and inferring them where loose. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If the plan task is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the plan task's objective. A blocked import path, a missing helper the plan assumed existed, a renamed dependency the plan did not know about: fix and continue.
- **Surface deviations in the task report.** Every deviation goes into the four-state status block. Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the plan did not specify) are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations (the implementer made a structural choice the plan did not anticipate, the implementer skipped a sub-step because it was unsafe to apply blindly, the implementer's read of the observed code conflicts with the plan task's input field) are `NEEDS_CONTEXT` with a clear "user clarification on X" next-action.
- **Do not pre-clear minor deviations.** The skill is `*-auto`; the autonomous half does not stop for every judgment call. The four-state report is where the user reads the trail.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the implementer does NOT edit the plan artifact in place — the plan is immutable per `docs/workflow/v1/immutability.md`. The implementer surfaces the finding with `NEEDS_CONTEXT`, stops the run, and the user re-shapes the plan via `adjust-plan-granularity-auto` or `adjust-plan-granularity-interactive` (Phase 4) to emit a NEW versioned plan. The new plan is then re-handed to this skill (or its interactive sibling) on a fresh invocation.

## Immutability

Plan artifacts are IMMUTABLE per `docs/workflow/v1/immutability.md`. The implementer reads them READ-ONLY. The plan file is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

If during implementation the implementer discovers that the plan is wrong (a plan task contradicts the observed code state, a plan task references a file that has been renamed, a plan task's verification block is built on a wrong assumption), the correct move is to surface the finding in the four-state task report with `DONE_WITH_CONCERNS` (if the implementer routed around the issue and finished the task) or `NEEDS_CONTEXT` (if the issue is structural and the implementer cannot pick the right side). The plan artifact stays as it was. A revised plan is a new plan version — the user invokes `adjust-plan-granularity-auto` or `adjust-plan-granularity-interactive` to emit `<UTC>-v<N+1>-<descriptor>-plan.md`, and the new plan is re-handed to this skill on a fresh invocation.

What the implementer DOES modify is source code and, optionally, (a) a new Inbox item via the `capture-inbox` skill if a side-finding emerges that should be parked rather than implemented during this run. The implementer does NOT create new spec / proposal / plan / decision-log artifacts inside this skill's run; those are the responsibility of dedicated authoring skills (`spec-*`, `propose-*`, `plan-*`, `discussion`, `seeded-discussion`, `adjust-plan-granularity-*`).

The thread layout itself follows `docs/workflow/v1/thread-layout.md` — the folder set, the `.wip/` discipline (recursively gitignored, never used for emitted artifacts), and the on-demand creation rule are all binding on any thread-scoped file this skill touches.
