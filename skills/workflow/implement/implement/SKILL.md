---
name: implement
description: Implement a brief plan or a less-structured input (`plan.md`, a seed with its decisions, a code or issue reference, or a raw prompt) end-to-end on the current working tree, deriving implicit tasks, self-reviewing after each task, and auto-committing per task; use when the input needs to be carried to working code in a single agent.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.2.1
---

# Implement

Execute an input end-to-end on the current working tree. Read the input, derive implicit tasks if the input does not already enumerate them, implement each task, self-review, auto-commit per implicit task or per explicit Git instruction the user passes through, record a factual progress block per implicit task, and update the thread's singleton implementation report on the way out. Do not pause for clarifying questions at each step and do not ask before committing; the execution posture is identical whether or not a person is present. Do not rewrite history.

This skill is single-agent: the current session is the implementer and runs the self-review pass after each implicit task. No subagents are spawned.

## Inputs

This skill accepts ONE of the following input forms. Detect which form was passed before deriving implicit tasks:

1. **The thread-root `plan.md`** — a brief plan whose numbered steps ARE the implementation steps. Treat each numbered step as an implicit task, in order; you have the freedom to derive the obvious substeps a step implies. This is the most structured input this skill takes.
2. **The thread's `seed.md` plus `decisions.md`** — when no plan exists, the seed's trigger narrative names the intended outcome and `decisions.md` carries the settled decisions that constrain it. Derive the implicit task list from the two together; a settled decision may map to an implicit task or constrain one.
3. **An explicit code or issue reference** — a file path, directory, or git ref, or a GitHub issue (full URL, or the short `owner/repo#NNN` form). For a code reference, read the referenced context and derive implicit tasks from the observed state ("look at this and do the obvious thing"). For an issue, the body becomes the input and the title and labels are additional framing.
4. **A raw user prompt** — when no artifact or reference is passed, the user's prompt is itself the input; derive implicit tasks directly from its stated intent.

If which input is meant is ambiguous — an incomplete issue identifier, a code reference pointing at a directory with multiple in-progress changes, or a prompt naming an artifact with no clear referent — that is a preflight failure, not an in-run decision: refuse before deriving tasks, name the ambiguous reference and how to disambiguate it, write nothing, and end with `Outcome: REFUSED — <the ambiguity and how to re-invoke>`. Never silently pick by recency; there is no global "latest input" algorithm. (Which *thread* is meant is resolved the same way — an unresolvable or ambiguous thread also refuses in preflight.)

## Factual progress records

This skill defines no formal per-task status token. The only status protocol is the run's terminal outcome (`## Procedure`, final step). Each attempted implicit task is recorded as an ordinary factual progress block — plain prose or ordinary structured fields, never a status token.

One append-only block per attempted implicit task lives in the run workspace's `progress.md` (see `## Run workspace`). Each block records:

- **Task attempted** — which implicit task, named from the derived task list.
- **Changes made** — what the diff did.
- **Verification** — the checks actually run and their results, including failures and justified skips.
- **Concerns** — non-blocking concerns to surface (partial coverage, a code smell, a judgment call, a possible-but-unverified edge case, a deviation applied per `## Plan Deviation Policy`), or `none`.
- **Commit** — the SHA + subject for a committed task, else `none`.
- **Next action** — the suggested follow-up ("ready for next task", "ready for review", "stop and surface this finding", etc.).

Suggested block shape (exact wording is at the implementer's discretion; keep it in the 5–10 line range):

```
Task <N> — <short label>
Changes made: <what the diff did>
Verification: <checks run and their results>
Concerns: <non-blocking concerns, or "none">
Commit: <SHA + subject, or "none">
Next action: <suggested follow-up>
```

For a committed task, the same facts — with no status field, which does not exist — ride in the commit message body where applicable. The `progress.md` blocks and the git history together are the audit trail; no separate per-task status artifact is written.

## Dirty worktree handling

This skill runs on the current working tree and uses no `git worktree` isolation, so the worktree state is the FIRST safety preflight — checked ONCE at the very start of the run, before any other work.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed to the rest of preflight.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), proceed only when the invocation carries advance authorization that explicitly acknowledges the existing changes will be preserved and may enter this skill's implementation commits. A bare instruction to ignore the dirty tree does not satisfy the gate.
4. Otherwise refuse immediately: write nothing, name the dirty paths, give the exact authorization needed to re-invoke, and end with `Outcome: REFUSED — worktree dirty (<dirty paths>); re-invoke with authorization acknowledging the existing changes will be preserved and may enter this skill's commits`. Do not ask, do not wait, do not auto-stash, do not auto-commit the pre-existing changes.

When authorization is present, the pre-existing dirty changes are unavoidably picked up by the first `git commit` this skill makes once staged; the authorization is consent to that outcome.

## Procedure

Steps 1–4 are preflight. They complete in full — with no workflow artifact written, no run workspace allocated, no project file edited, and no commit made — before execution begins at step 5. Any preflight failure ends the run `Outcome: REFUSED — <reason and how to re-invoke>` and writes nothing.

1. **Safety preflight: dirty worktree.** Run the `## Dirty worktree handling` check first, before any other preflight step; it refuses a dirty tree that lacks valid advance authorization.

2. **Resolve the active thread.** If the input is a path under a thread folder, the thread root (`docs/threads/<thread>/`) is implicit. If the input is a raw prompt or a code reference, identify the active thread root the run's workspace and report will live under. If no active thread resolves, or several thread roots plausibly apply and which is active is ambiguous, that is a preflight failure — refuse, naming what was ambiguous, and never silently pick the most recent. This is the one situation a pending bundle is physically impossible, because `.pending-decisions/` would live inside the very thread that failed to resolve.

3. **Resolve and read the input.** Detect which `## Inputs` form was passed and read it READ-ONLY. For a GitHub issue, fetch the body and title. For a code reference, read the referenced files. For a raw prompt, the prompt itself is the input. If several plausible inputs match a reference, that is a preflight failure — refuse per `## Inputs` rather than picking by recency.

4. **Validate the input and required tooling, and derive the implicit tasks.** Translate the input into an ordered list of implicit tasks. Each implicit task should be implementable in one sitting, observable on completion (a file written, a test passing, a behavior visible), and small enough that the self-review pass after it is meaningful. If the input is fully resolved (e.g., "do X to file Y, then add a test"), the implicit task list may be one or two tasks; if broader, one entry per cohesive implementation unit. Avoid both under-splitting (a single "do the whole thing" task) and over-splitting (a separate task per line touched). Confirm the input is coherent enough to derive tasks from and that any tooling and credentials the run explicitly requires are present. A structural input problem, a garbled invocation, or missing required tooling or credentials caught here is a preflight refusal.

5. **Allocate the run workspace.** Preflight has passed; allocate a fresh run directory per `## Run workspace` and record the derived implicit task list and their state in `progress.md` so progress stays legible.

6. **For each implicit task, in order:**
   a. **Implement.** Make the code changes the task calls for. Use judgment if the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — surface the deviation in the factual progress block per `## Plan Deviation Policy`.
   b. **Self-review.** Re-read the diff against the implicit task's stated objective. Check that the change is coherent with the input, does not break adjacent code paths the implementer can see, and matches the project's conventions. As a first-class input to this pass — not an afterthought — explicitly surface the assumptions you made, the forced judgment calls you took, and any known risks the diff alone would not reveal; carry them into the factual progress block and the implementation report. Self-review is in-session — no artifact file is written.
   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, follow `### Failed commit` under `## Commit Policy` — diagnose and fix in-authority causes within the retry cap; only when it cannot be resolved does the run hit an operational defect: record the diagnosis and end the run `BLOCKED` per `## Blocked`.
   d. **Append the factual progress block.** Append exactly one block for this attempted task to `progress.md` per `## Factual progress records` — after the commit for a committed task (carrying its SHA + subject), or with `Commit: none` otherwise. Emit a one-line chat summary for the task.

7. **Update the implementation report.** Once all implicit tasks have run (or the run stopped early per `## Blocked`), update the thread's singleton implementation report per `## Implementation report`.

8. **Final out-message.** Emit a final summary folding the factual progress blocks from `progress.md`: name each attempted implicit task, the commit SHA + subject for each commit made, and the implementation report that was written or updated. If a discovery with parent-level impact was routed to the parent roadmap, name that too. Close with exactly one terminal line from the closed vocabulary — `Outcome: DONE — <implementation-report pointer>` when the requested operation completed, including completion with non-blocking concerns; `Outcome: BLOCKED — <diagnosis or bundle path>` when substantive execution began but could not finish (per `## Blocked`); `Outcome: REFUSED — <reason>` when preflight prevented execution (steps 1–4). The line is added to — it never replaces — the summary above.

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

Two situations stop the run once substantive execution has begun (step 5 onward), and both end `BLOCKED`. Neither is reachable from preflight — an invocation, thread, input, or tooling failure caught in steps 1–4 is a `REFUSED`, not this path. Distinguish a genuine missing-intent question from an operational defect before choosing between them.

**Missing human intent.** This applies whenever completing an implicit task requires a genuine human decision you cannot settle yourself from the input and the observed code state. Per the run's autonomous posture, do not invent the intent and do not stall waiting in chat. First finish everything the run can safely derive without that decision, then hand the indispensable open decision(s) to `/emit-pending-decisions`, giving it `/implement` as the producer, the thread's `implementation-report.md` as the target, the context you gathered as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the implementation. Update the implementation report per `## Implementation report` to reflect the blocked outcome, then stop with a concise notification naming where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

**Operational defect.** An unfixable in-run failure the run cannot repair on its own — an exhausted commit retry (per `### Failed commit`), an inaccessible external dependency, a runtime failure, or malformed input detail not caught by preflight and discovered only during lazy execution — ends the run `BLOCKED` with a diagnosis and NO decision bundle. Finish any safe work first, update the implementation report per `## Implementation report`, and end with `Outcome: BLOCKED — <diagnosis>`. A structural input problem that preflight should have caught is a preflight `REFUSED`, not this path.

## Roadmap-descendant feedback

When the run's thread carries a `Parent:` roadmap reference in its seed and you discover something with parent- or sibling-level impact, route it to the parent through `/append-roadmap-feedback`; `references/shared/roadmap-descendant-feedback.md` spells out what qualifies as parent-level impact, what to hand the primitive, and what stays local in this run's implementation report.

## Commit Policy

This skill auto-commits.

- **Default cadence:** ONE commit per implicit task. The boundary is the implicit task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple implicit tasks into one commit. Do not split one implicit task across multiple commits.
- **Override cadence:** When the user's invocation contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default cadence. The user's explicit instruction wins.
- **Judgment:** When the implicit task list is one task (a fully-resolved input), the default cadence and "one commit at the end" produce the same outcome — one commit. When the implicit task list is many tasks, the default cadence is many commits.
- **Baseline gate (before each commit):** A task's self-review confirms THAT task's objective; it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the self-review and this clause is a no-op. When the project DOES define standing gates, run them on the changed code and resolve any failure BEFORE committing the task — even when the task's own verification omits it. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this task. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.

Commits use the project's conventional-commit shape where applicable. Stage only the files the implicit task touched; never run `git add -A` blindly. Commit subjects are descriptive of the implicit task's objective, not its substeps. Commit message bodies MAY carry the task's factual progress block from `## Factual progress records` — minus the commit's own SHA — so the audit trail lives in git history as well as the progress file.

### Failed commit

A failed commit is diagnosed and fixed within the current task before it is ever treated as blocking — it is not an automatic halt.

- **Diagnose first.** Read the actual error the commit emitted; never retry blind. What failed — a pre-commit hook, a lint or format check, a test, a commit-message linter, a missing sign-off — determines whether it is yours to fix.
- **Fix in-authority causes as part of the current task.** When the cause sits inside the task's own footprint — a lint or format violation in the task's files, a hook that auto-modified files that now need re-staging, a test the task's own diff broke, a commit subject a message linter rejected — fix it, re-run the failed check, and retry the commit.
- **Bounded retries.** Make at most 3 fix-and-retry attempts for the task. Past the cap, or when the cause is outside the task's authority (missing sign-off configuration, credentials, failures in files the task does not own, infrastructure errors), the run has hit an operational defect: record the diagnosis in the factual progress block — the specific failure and what was tried, not a bare "commit failed" — and stop the entire run `BLOCKED` per `## Blocked`. Subsequent implicit tasks are NOT attempted.
- **Guardrails (never traded for a green commit).** Never bypass hooks (`--no-verify` or any equivalent), never weaken, delete, or skip a check to make it pass, and never stash-and-retry. A fix addresses the real cause inside the task's footprint, or the run stops `BLOCKED`.
- **Audit trail.** The factual progress block and the commit body note that the commit failed N times and what was fixed, so the retries stay visible in the history.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase in any form, does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

The policy is judgment-based and surfaced via the factual progress block — not pre-clearance, not blanket permission.

- **Follow the input or the implicit task list derived from it.** The input is the contract; the implicit task list is the implementer's interpretation. Do not silently invent tasks the input does not call for. Do not silently skip tasks the input does call for.
- **Use judgment when warranted.** If the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the input's intent. A blocked import path, a missing helper the input assumed existed, a renamed dependency the input did not know about: fix and continue.
- **Surface deviations in the factual progress block.** Every deviation, assumption, forced judgment call, and unverified check goes into the block's Concerns as plain facts — no status token is assigned. Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the input did not specify) are recorded with a one-sentence note and the run continues. A deviation that would require inventing genuine human intent is never applied silently: finish what is safely derivable, then route the open decision per `## Blocked`.
- **Do not pre-clear minor deviations.** This run is autonomous; it does not stop for every judgment call. The factual progress block is where the user reads the trail.
- **Never edit the input to justify the run.** If you discover the input itself is wrong — a step contradicts the observed code, a decision names a change already applied — surface it in the factual progress block and in the implementation report and let the surrounding session decide. The implementer modifies source code, configuration, tests, and build files; it does not edit the spec, plan, seed, decision log, or issue it was handed, and it does not author new such artifacts inside this run.
