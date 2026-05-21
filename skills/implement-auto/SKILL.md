---
name: implement-auto
description: Take a less-structured input (spec, proposal, decision log, GitHub issue, Inbox item, code context, or raw prompt) and implement it end-to-end on the current working tree — deriving implicit tasks from the input itself when no plan artifact exists, self-reviewing after each implicit task, and auto-committing per implicit task or per explicit Git instruction the user passes through. Single-agent (current session + self-review); no subagents are spawned. Use when you have a less-structured input in hand and want autonomous end-to-end implementation without an element-by-element walk — not when you want to ASK before each commit (use `implement-interactive`), and not when the input is a plan artifact under `docs/threads/<thread>/plans/` (use `implement-plan-auto`, `implement-plan-interactive`, `implement-plan-with-subagents-auto`, or `implement-plan-with-subagents-interactive` instead).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Implement Auto

Execute a less-structured input end-to-end on the current working tree. This skill is the autonomous half of the V1 less-structured-input implementation pair — it reads the input, derives implicit tasks if the input does not already enumerate them, implements each task, self-reviews, auto-commits per implicit task or per explicit Git instruction the user passes through, and reports a four-state status per implicit task on its way out. It does not ask clarifying questions at each step, it does not ask before committing, and it does not rewrite history.

`implement-auto` is one of six V1 implementation skills. The two implementation axes are independent — input shape (less-structured vs plan-driven) and execution mode (auto vs interactive) — with a third axis (single-agent vs subagent-driven) crossing the plan-driven half per D66. The six skills are:

- `implement-auto` (this skill) — less-structured input, autonomous, single-agent.
- `implement-interactive` — less-structured input, collaborative, single-agent. Use when you want the agent to ASK before each commit and push back per the anti-sycophancy stance during the walk.
- `implement-plan-auto` — plan-driven input, autonomous, single-agent. Use when you have a v1+ plan artifact under `docs/threads/<thread>/plans/` and want it executed end-to-end without a per-task ASK.
- `implement-plan-interactive` — plan-driven input, collaborative, single-agent.
- `implement-plan-with-subagents-auto` — plan-driven input, autonomous, multi-subagent (orchestrator + implementer subagent + spec-compliance reviewer + code-quality reviewer per D70).
- `implement-plan-with-subagents-interactive` — plan-driven input, collaborative, multi-subagent.

Per D66, only the plan-driven half admits a `*-with-subagents-*` variant in V1 — there is no `implement-with-subagents-*`. If you find yourself wanting subagent review on a less-structured input, the right move is to first shape a plan artifact (`plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, or `plan-strict-interactive`) and then hand the plan to one of the four plan-driven implement skills.

V1 stance per the Phase 5 context: this skill is SINGLE-AGENT. The current session is the implementer; the same session runs the self-review pass after each implicit task. No `Task` tool spawn, no subagent dispatch, no orchestrator handoff. If your runtime supports subagents and you want a heavier review loop on the input, shape a plan and use `implement-plan-with-subagents-auto` instead.

## Inputs

`implement-auto` accepts ONE of the following SEVEN input forms (per D64, D65). Detect which form was passed before deriving implicit tasks:

1. **A spec artifact path** under `docs/threads/<thread>/specs/<UTC>-v<N>-spec.md`. The spec's semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the implicit task list directly. If the spec has acceptance guidance, every implicit task should trace to a piece of it; if a piece of acceptance has no implicit task covering it, that is a coverage gap to surface.
2. **A proposal artifact path** under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. The proposal's rough shape becomes the implicit task list; the proposal's open questions become either tasks the implementation resolves or `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` flags in the four-state report.
3. **A decision-log artifact path** under `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`. The log carries one or more settled decisions with sequential `## D<N>: <Title>` headings. Each settled decision may map to an implicit task (or constrain one); cite the source log by absolute path + `D<N>` in the task report where the decision is operative.
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the input; treat the issue title and labels as additional framing.
5. **An Inbox item path** under `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md`. The Inbox item's `**Why:**` line names the intended outcome and the body sketches the work. The implementer is implicitly moving the item from `inbox/open/` to `inbox/processed/` as part of completion — note this in the final task report so the inbox status reflects the work done.
6. **A code context reference** — a file path, directory, or git ref. The implementer reads the referenced context and derives implicit tasks from the observed state (e.g., "remove dead code in `src/legacy/`", "fix the import order in `src/foo.ts`"). Use when the user's intent is "look at this and do the obvious thing" rather than a written input.
7. **A raw user prompt**. When no artifact or code reference is passed, the user's prompt is itself the input. Derive implicit tasks directly from the prompt's stated intent.

If the input is ambiguous — multiple plausible specs share the same version number in the thread, multiple Inbox items match the same slug, the issue identifier is incomplete, the prompt references "the spec" with no clear referent, the code context reference points at a directory containing multiple in-progress changes — ASK the user which input is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest input" algorithm. Do not silently pick by recency.

## Four-State Status Protocol

Per D74 (IMPL-10), every task report carries one of FOUR statuses. The states are named exactly as listed below; downstream readers (and downstream skills, particularly `review-implementation-*` in Phase 6) match against these tokens. Use the names verbatim.

- The state DONE — `DONE` — means the implicit task was completed and the implementer has no concerns to surface. The expected behavior is in place and the self-review pass found nothing to flag. This is the only state that means "ready for next task with no follow-up".
- **`DONE_WITH_CONCERNS`** — the implicit task was completed but the implementer has at least one concern to surface: partial test coverage, a code smell that did not warrant blocking the task, an ambiguous spec area the implementer made a judgment call on, a possible-but-unverified edge case, a deviation from the input that the implementer applied per `## Plan Deviation Policy`. The task IS done; the concerns are signals for downstream review or future work.
- **`BLOCKED`** — the implicit task could not be completed. Includes failed commits per D77 (see `## Commit Policy`), missing dependencies, inaccessible files, contradictory inputs, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent implicit tasks are NOT attempted under `BLOCKED` cover.
- **`NEEDS_CONTEXT`** — the implicit task cannot proceed without information the implementer does not have. Includes "user clarification needed", "access to file outside repo needed", "external system credentials needed", "the input contradicts the observed code state and the implementer cannot pick the right side without input". `NEEDS_CONTEXT` is distinct from `BLOCKED`: a `BLOCKED` task hit a hard error during execution; a `NEEDS_CONTEXT` task did not start because the missing input was a precondition.

### Task report block shape

The four-state status appears as a structured block in chat output and/or the commit message body for the task's commit (where applicable). The four-state status is NOT written to a separate artifact file in V1 — the chat output and the commit history together are the audit trail.

Suggested format (exact wording is at the implementer's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 5–10 line range):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Notes: <1–3 sentences explaining the rationale or surfaced concerns. Cite settled decisions by absolute path + D<N> when relevant.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY implicit task by its four-state status, plus the commit SHA + subject for every commit made during the run. This is the implementation audit trail; the user reads it to understand what was done and what to do next.

## Dirty Worktree Handling

Per D79 (IMPL-14), this skill OWNS the dirty-worktree check — there is no orchestrator separate from this skill in the single-agent variant. Run the check ONCE at the start of the run, BEFORE reading the input.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the input-resolution step.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill makes) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit this skill makes (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not derive implicit tasks, do not commit, do not modify the worktree further.

In V1, this skill does not use `git worktree` isolation per D78 — every implementation runs on the current working tree, so the dirty-worktree check is non-skippable.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. If the worktree is clean, proceed. If dirty, ASK; on abort, stop.

2. **Resolve the thread (if relevant).** If the input is a path under `docs/threads/<thread>/...`, the thread root is implicit. If the input is a raw prompt or a code context reference and the run might produce thread-scoped artifacts (e.g., an Inbox item for a deferred finding), identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If multiple thread roots exist and which is "active" is ambiguous, ASK per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

3. **Resolve and read the input.** Detect which of the seven `## Inputs` forms was passed. For a path input, read the file (path inputs are IMMUTABLE per `## Immutability` — the implementer reads them READ-ONLY). For a GitHub issue, fetch the body and title. For an Inbox item, plan to move the item to `inbox/processed/` upon completion. For a code context reference, read the referenced files. For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended per `docs/workflow/v1/immutability.md`. Do not pick by recency.

4. **Derive implicit tasks from the input.** Translate the input into an ordered list of implicit tasks. Each implicit task should be implementable in one sitting, observable on completion (a file written, a test passing, a behavior visible), and small enough that the self-review pass after it is meaningful. If the input is fully resolved (e.g., "the user said do X to file Y, then add a test"), the implicit task list may be one or two tasks. If the input is broader (e.g., a spec with multiple acceptance items), the implicit task list will have one entry per acceptance item or per cohesive implementation unit. Avoid both under-splitting (a single "do the spec" task) and over-splitting (a separate task for every line touched).

5. **For each implicit task, in order:**
   a. **Implement.** Make the code changes the task calls for. Use judgment if the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — surface the deviation in the task report per `## Plan Deviation Policy`.
   b. **Self-review.** Re-read the diff against the implicit task's stated objective. Check that the change is coherent with the input, does not break adjacent code paths the implementer can see, and matches the project's conventions. Self-review is in-session — no artifact file is written.
   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this implicit task and stop the entire run.
   d. **Write the task report.** Use the four-state status block from `## Four-State Status Protocol`. The state goes in chat output and / or the commit message body.

6. **Final out-message.** Once all implicit tasks have run (or the run was halted at a `BLOCKED` task), emit a final summary listing every implicit task by its four-state status plus the commit SHA + subject for each commit made. If an Inbox item was the input, note that the item should be moved from `inbox/open/` to `inbox/processed/` to reflect the work done (the implementer may do the move as part of the final task, or surface it as a "Next" suggestion in the final out-message).

## Commit Policy

This skill auto-commits. Cadence is governed by D75 — and only by D75.

- **Default cadence:** ONE commit per implicit task that the agent derives from the input. The boundary is the implicit task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple implicit tasks into one commit. Do not split one implicit task across multiple commits.
- **Override cadence:** When the user's invocation contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default cadence. The user's explicit instruction wins.
- **Judgment:** When the implicit task list is one task (a fully-resolved input), the default cadence and "one commit at the end" produce the same outcome — one commit. When the implicit task list is many tasks (e.g., spec with several acceptance items), the default cadence is many commits.

Commits use the project's conventional-commit shape where applicable (this is a content repository — see the project's `AGENTS.md` for scope rules; in source-code repositories, follow the project's own conventions). Stage only the files the implicit task touched; never run `git add -A` blindly. Commit subjects are descriptive of the implicit task's objective, not its substeps. Commit message bodies MAY include the four-state task report block from `## Four-State Status Protocol` so the audit trail lives in git history as well as chat output.

### Failed commit

Per D77: **If a commit fails, report `BLOCKED` and stop. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), then stop the entire run. Subsequent implicit tasks are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject, a sign-off was missing. Each of those is the project telling the implementer to stop and let the user diagnose. `BLOCKED` is the correct response.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

Per D80, the policy is judgment-based and surfaced-via-task-report — not pre-clearance, not blanket permission.

- **Follow the input or the implicit task list derived from it.** The input is the contract; the implicit task list is the implementer's interpretation. Do not silently invent tasks the input does not call for. Do not silently skip tasks the input does call for.
- **Use judgment when warranted.** If the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the input's intent. A blocked import path, a missing helper the input assumed existed, a renamed dependency the input did not know about: fix and continue.
- **Surface deviations in the task report.** Every deviation goes into the four-state status block. Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the input did not specify) are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations (the implementer made a structural choice the input did not anticipate, the implementer skipped a sub-step because it was unsafe to apply blindly) are `NEEDS_CONTEXT` with a clear "user clarification on X" next-action.
- **Do not pre-clear minor deviations.** The skill is `*-auto`; the autonomous half does not stop for every judgment call. The four-state report is where the user reads the trail.

## Immutability

Input artifacts are IMMUTABLE per `docs/workflow/v1/immutability.md`. The implementer reads them READ-ONLY. Specs, proposals, decision logs, Inbox items, plan artifacts the user may pass through, and any other artifact under `docs/threads/<thread>/<folder>/` is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not for any reason.

If during implementation the implementer discovers that the input is wrong (a spec acceptance criterion contradicts the observed code state, an Inbox item names a fix that has already been applied), the correct move is to surface the finding in the four-state task report with a `DONE_WITH_CONCERNS` or `NEEDS_CONTEXT` status and let the surrounding session decide what to do. The input artifact stays as it was. A revised spec is a new spec version (`v2`); a revised Inbox item is a new Inbox item or a status-folder move. The implementer does not perform that revision as part of this run — that is the surrounding session's decision.

What the implementer DOES modify is SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository. The implementer also MAY (a) create a new Inbox item via the `capture-inbox` skill if a side-finding emerges that should be parked rather than implemented, and (b) move an Inbox item that was itself the input from `inbox/open/` to `inbox/processed/` as part of completion. The implementer does NOT create new spec / proposal / plan / decision-log artifacts inside this skill's run; those are the responsibility of dedicated authoring skills (`spec-*`, `propose-*`, `plan-*`, `discussion`, `seeded-discussion`).

The thread layout itself follows `docs/workflow/v1/thread-layout.md` — the folder set, the `.wip/` discipline (recursively gitignored, never used for emitted artifacts), and the on-demand creation rule are all binding on any thread-scoped file this skill touches.
