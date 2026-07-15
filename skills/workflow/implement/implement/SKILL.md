---
name: implement
description: Implement a brief plan or a less-structured input (`plan.md`, a seed with its decisions, a code or issue reference, or a raw prompt) end-to-end on the current working tree, deriving implicit tasks, self-reviewing after each task, and auto-committing per task; use when the input needs to be carried to working code in a single agent.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.0.0
---

# Implement

Execute an input end-to-end on the current working tree. Read the input, derive implicit tasks if the input does not already enumerate them, implement each task, self-review, auto-commit per implicit task or per explicit Git instruction the user passes through, report a four-state status per implicit task, and update the thread's singleton implementation report on the way out. By default, do not pause for clarifying questions at each step or ask before committing — but honor an invocation that asks you to check in or work through the tasks interactively; do not rewrite history.

This skill is single-agent: the current session is the implementer and runs the self-review pass after each implicit task. No subagents are spawned.

## Inputs

This skill accepts ONE of the following input forms. Detect which form was passed before deriving implicit tasks:

1. **The thread-root `plan.md`** — a brief plan whose numbered steps ARE the implementation steps. Treat each numbered step as an implicit task, in order; you have the freedom to derive the obvious substeps a step implies. This is the most structured input this skill takes.
2. **The thread's `seed.md` plus `decisions.md`** — when no plan exists, the seed's trigger narrative names the intended outcome and `decisions.md` carries the settled decisions that constrain it. Derive the implicit task list from the two together; a settled decision may map to an implicit task or constrain one.
3. **An explicit code or issue reference** — a file path, directory, or git ref, or a GitHub issue (full URL, or the short `owner/repo#NNN` form). For a code reference, read the referenced context and derive implicit tasks from the observed state ("look at this and do the obvious thing"). For an issue, the body becomes the input and the title and labels are additional framing.
4. **A raw user prompt** — when no artifact or reference is passed, the user's prompt is itself the input; derive implicit tasks directly from its stated intent.

If which input is meant is ambiguous — an incomplete issue identifier, a code reference pointing at a directory with multiple in-progress changes, or a prompt naming an artifact with no clear referent — this is a clarification inside a resolved thread, not a free choice: route it per `## Blocked` as a pending-decisions bundle rather than silently picking by recency. There is no global "latest input" algorithm. (Which *thread* is meant is different — an unresolvable thread is the one case a bundle is physically impossible, so the thread-resolution step refuses in chat instead.)

## Four-State Status Protocol

Every task report carries one of FOUR statuses. Use the names verbatim — downstream readers match against these tokens exactly.

- **`DONE`** — the implicit task was completed and the implementer has no concerns to surface. The expected behavior is in place, the self-review pass found nothing to flag, and the project's standing required gates — if the project defines any (see `## Commit Policy`) — pass on the changed code. This is the only state that means "ready for next task with no follow-up".
- **`DONE_WITH_CONCERNS`** — the implicit task was completed but the implementer has at least one concern to surface: partial test coverage, a code smell that did not warrant blocking the task, an ambiguous area the implementer made a judgment call on, a possible-but-unverified edge case, a deviation from the input that the implementer applied per `## Plan Deviation Policy`. The task IS done; the concerns are signals for downstream review or future work.
- **`BLOCKED`** — the implicit task could not be completed. Includes a failed commit the bounded fix loop could not resolve (see `## Commit Policy`), missing dependencies, inaccessible files, contradictory inputs, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent implicit tasks are NOT attempted.
- **`NEEDS_CONTEXT`** — the implicit task cannot proceed without information the implementer does not have. Includes "user clarification needed", "access to file outside repo needed", "external system credentials needed", "the input contradicts the observed code state and the implementer cannot pick the right side without input". `NEEDS_CONTEXT` is distinct from `BLOCKED`: a `BLOCKED` task hit a hard error during execution; a `NEEDS_CONTEXT` task did not start because the missing input was a precondition.

### Task report block shape

The four-state status appears as a structured block in chat output and/or the commit message body for the task's commit (where applicable). The four-state status is NOT written to a separate artifact file — the chat output and the commit history together are the audit trail.

Suggested format (exact wording is at the implementer's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 5–10 line range):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Notes: <1–3 sentences explaining the rationale or surfaced concerns.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY implicit task by its four-state status, plus the commit SHA + subject for every commit made during the run. This is the implementation audit trail; the user reads it to understand what was done and what to do next.

## Dirty Worktree Handling

This skill owns the dirty-worktree check. Run the check ONCE at the start of the run, BEFORE reading the input.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the input-resolution step.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill makes) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit this skill makes (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not derive implicit tasks, do not commit, do not modify the worktree further, and end with `Outcome: REFUSED — worktree dirty; run aborted at the user's request`.

This skill does not use `git worktree` isolation — every implementation runs on the current working tree, so the dirty-worktree check is non-skippable.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. If the worktree is clean, proceed. If dirty, ASK; on abort, stop.

2. **Identify the active thread root.** If the input is a path under a thread folder, the thread root (`docs/threads/<thread>/`) is implicit. If the input is a raw prompt or a code reference, identify the active thread root the run's workspace and report will live under. If no active thread resolves, or several thread roots plausibly apply and which is active is ambiguous, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>` — this is the one situation a pending bundle is physically impossible, because `.pending-decisions/` would live inside the very thread that failed to resolve; never silently pick the most recent.

3. **Resolve and read the input.** Detect which `## Inputs` form was passed and read it READ-ONLY. For a GitHub issue, fetch the body and title. For a code reference, read the referenced files. For a raw prompt, the prompt itself is the input. If several plausible inputs match a reference inside the resolved thread, that is a clarification, not a refusal — route it per `## Blocked` as a pending-decisions bundle rather than picking by recency.

4. **Derive implicit tasks from the input.** Translate the input into an ordered list of implicit tasks. Each implicit task should be implementable in one sitting, observable on completion (a file written, a test passing, a behavior visible), and small enough that the self-review pass after it is meaningful. If the input is fully resolved (e.g., "do X to file Y, then add a test"), the implicit task list may be one or two tasks. If the input is broader, the implicit task list will have one entry per cohesive implementation unit. Avoid both under-splitting (a single "do the whole thing" task) and over-splitting (a separate task for every line touched). Keep a running task list of the tasks you derive and their state as you work, recording it in the run workspace's `progress.md` (see `## Run workspace`) so progress stays legible.

5. **For each implicit task, in order:**
   a. **Implement.** Make the code changes the task calls for. Use judgment if the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — surface the deviation in the task report per `## Plan Deviation Policy`.
   b. **Self-review.** Re-read the diff against the implicit task's stated objective. Check that the change is coherent with the input, does not break adjacent code paths the implementer can see, and matches the project's conventions. As a first-class input to this pass — not an afterthought — explicitly surface the assumptions you made, the forced judgment calls you took, and any known risks the diff alone would not reveal; carry them into the task report and the implementation report. Self-review is in-session — no artifact file is written.
   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, follow `### Failed commit` under `## Commit Policy` — diagnose and fix in-authority causes within the retry cap; only when it cannot be resolved report `BLOCKED` for this implicit task and stop the entire run.
   d. **Write the task report.** Use the four-state status block from `## Four-State Status Protocol`. The state goes in chat output and/or the commit message body.

6. **Update the implementation report.** Once all implicit tasks have run (or the run halted at a `BLOCKED` task), update the thread's singleton implementation report per `## Implementation report`.

7. **Final out-message.** Emit a final summary listing every implicit task by its four-state status and the commit SHA + subject for each commit made, and name the implementation report that was written or updated. If a discovery with parent-level impact was routed to the parent roadmap, name that too. Close the summary with exactly one terminal line from the closed vocabulary — `Outcome: DONE — <implementation-report pointer>` when every implicit task ran, or `Outcome: BLOCKED — <diagnosis>` when the run halted at a failed commit past the retry cap (per `### Failed commit`). A run blocked on a genuine open decision emits its terminal line from `## Blocked`, naming the bundle path; an input-resolution refusal emits `Outcome: REFUSED — <reason>` from the resolution step. The line is added to — it never replaces — the summary above.

## Run workspace

Keep all operational progress for a run inside an invocation-scoped directory in the active thread:

```text
.implementation-runs/<UTC>[-<desc>]/
```

`<UTC>` is the run's start timestamp and is a valid directory name on its own; `<desc>` is an optional short kebab slug of the run's objective, taken from the input's subject purely for human scannability. Allocate a fresh directory unique to THIS invocation — never silently adopt or reuse an existing run directory. Recovery within an invocation reads only this run's own directory. If a previous run was interrupted, its directory survives so it can be resumed later, but only when the user explicitly identifies it; you never adopt it on your own. Name any progress file `progress.md`. This directory is invocation-scoped in meaning: no durable artifact — not the implementation report, not a commit message, nothing — ever references a path inside it. The directory remains in place after the run as the run's operational trace.

## Implementation report

On EVERY normal terminal outcome — success, partial completion, a `BLOCKED` halt, or a no-op where the requested state already existed — update the thread's singleton `implementation-report.md` at the thread root by invoking `/update-implementation-report` with the verified current outcome: what was completed, partially completed, blocked, or found already satisfied; the resulting code, test, and configuration changes; the checks you actually ran and their results, including failures and justified skips; and any deviations, remaining concerns, and follow-ups. The report reflects only the CURRENT outcome — the primitive merges in place, replacing stale content and dropping now-resolved concerns — so pass it the run's end state, not a running log of earlier passes.

The assumptions, forced judgment calls, and known risks your per-task self-review surfaced feed this outcome: assumptions and forced judgment calls into the deviations content, each with its justification; known risks into remaining concerns, or into problems already hit where the risk was realized during the run.

## Blocked

This path applies whenever completing an implicit task requires a genuine human decision you cannot settle yourself from the input and the observed code state. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat. First finish everything the run can safely derive without that decision, then hand the indispensable open decision(s) to `/emit-pending-decisions`, giving it `/implement` as the producer, the thread's `implementation-report.md` as the target, the context you gathered as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the implementation. Update the implementation report per `## Implementation report` to reflect the blocked outcome, then stop with a concise notification naming where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

## Roadmap-descendant feedback

When the run's thread carries a `Parent:` roadmap reference in its seed and you discover something with parent- or sibling-level impact, route it to the parent through `/append-roadmap-feedback`; `references/shared/roadmap-descendant-feedback.md` spells out what qualifies as parent-level impact, what to hand the primitive, and what stays local in this run's implementation report.

## Commit Policy

This skill auto-commits.

- **Default cadence:** ONE commit per implicit task. The boundary is the implicit task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple implicit tasks into one commit. Do not split one implicit task across multiple commits.
- **Override cadence:** When the user's invocation contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default cadence. The user's explicit instruction wins.
- **Judgment:** When the implicit task list is one task (a fully-resolved input), the default cadence and "one commit at the end" produce the same outcome — one commit. When the implicit task list is many tasks, the default cadence is many commits.
- **Baseline gate (before each commit):** A task's self-review confirms THAT task's objective; it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the self-review and this clause is a no-op. When the project DOES define standing gates, run them on the changed code and resolve any failure BEFORE committing the task — even when the task's own verification omits it. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this task. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.

Commits use the project's conventional-commit shape where applicable. Stage only the files the implicit task touched; never run `git add -A` blindly. Commit subjects are descriptive of the implicit task's objective, not its substeps. Commit message bodies MAY include the four-state task report block from `## Four-State Status Protocol` so the audit trail lives in git history as well as chat output.

### Failed commit

A failed commit is diagnosed and fixed within the current task before it is ever treated as blocking — it is not an automatic halt.

- **Diagnose first.** Read the actual error the commit emitted; never retry blind. What failed — a pre-commit hook, a lint or format check, a test, a commit-message linter, a missing sign-off — determines whether it is yours to fix.
- **Fix in-authority causes as part of the current task.** When the cause sits inside the task's own footprint — a lint or format violation in the task's files, a hook that auto-modified files that now need re-staging, a test the task's own diff broke, a commit subject a message linter rejected — fix it, re-run the failed check, and retry the commit.
- **Bounded retries.** Make at most 3 fix-and-retry attempts for the task. Past the cap, or when the cause is outside the task's authority (missing sign-off configuration, credentials, failures in files the task does not own, infrastructure errors), report `BLOCKED` for this implicit task with the diagnosis in the notes — the specific failure and what was tried, not a bare "commit failed" — and stop the entire run. Subsequent implicit tasks are NOT attempted.
- **Guardrails (never traded for a green commit).** Never bypass hooks (`--no-verify` or any equivalent), never weaken, delete, or skip a check to make it pass, and never stash-and-retry. A fix addresses the real cause inside the task's footprint, or the task becomes a `BLOCKED` report.
- **Audit trail.** The four-state task report and the commit body note that the commit failed N times and what was fixed, so the retries stay visible in the history.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase in any form, does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

The policy is judgment-based and surfaced via task report — not pre-clearance, not blanket permission.

- **Follow the input or the implicit task list derived from it.** The input is the contract; the implicit task list is the implementer's interpretation. Do not silently invent tasks the input does not call for. Do not silently skip tasks the input does call for.
- **Use judgment when warranted.** If the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the input's intent. A blocked import path, a missing helper the input assumed existed, a renamed dependency the input did not know about: fix and continue.
- **Surface deviations in the task report.** Every deviation goes into the four-state status block. Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the input did not specify) are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations (the implementer made a structural choice the input did not anticipate, the implementer skipped a sub-step because it was unsafe to apply blindly) are `NEEDS_CONTEXT` with a clear "user clarification on X" next-action.
- **Do not pre-clear minor deviations.** This run is autonomous; it does not stop for every judgment call. The four-state report is where the user reads the trail.
- **Never edit the input to justify the run.** If you discover the input itself is wrong — a step contradicts the observed code, a decision names a change already applied — surface it in the task report and in the implementation report and let the surrounding session decide. The implementer modifies source code, configuration, tests, and build files; it does not edit the spec, plan, seed, decision log, or issue it was handed, and it does not author new such artifacts inside this run.
