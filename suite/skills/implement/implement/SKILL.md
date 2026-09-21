---
name: implement
description: Carry a plan folder, an artifact, an issue, or a prompt to working code on the working tree, committing per derived task.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Implement

Execute an input end-to-end on the current working tree. You gather the thread's context, create this invocation's implementation folder, derive implicit tasks if the input does not already enumerate them, implement each task, self-review, auto-commit per implicit task or per explicit Git instruction the user passes through, record a factual progress block per implicit task, and write the folder's report on the way out. Do not pause for clarifying questions at each step and do not ask before committing; the execution posture is identical whether or not a person is present. Do not rewrite history.

This skill is single-agent: the current session is the implementer and runs the self-review pass after each implicit task. No subagents are spawned.

## Inputs

Gather all of these before deriving implicit tasks; everything below works from what you gather here.

- `docs/adr/`, read via `/consult-decisions` — the project decisions bearing on the implementation.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be used in everything you write.
- The thread's `spec.md`, when the file exists — the thread's design truth, and what the implementation answers to.
- The thread's `seed.md` — why the thread exists and what triggered it.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer, which inside the thread takes precedence over the project records.
- **The work to carry to code** — the primary input, in one of two accepted forms. When the invocation points at a **plan folder** under `plans/`, that folder is the form: the folder it names, or the newest folder under `plans/` by stamp when it points at `plans/` without naming one. Read its `plan.md`, whose ordered steps are what the run executes, together with the brief each step indexes under `plan-tasks/` when the folder holds them — a brief carries its step's files, verification, and acceptance criteria. Otherwise the form is a **referenced artifact or the user's prompt**: a repository path, a directory, a git ref, a GitHub issue (full URL or the short `owner/repo#NNN` form), another thread's artifact, read as history, or the user's prompt itself when nothing else is named; the run derives its implicit tasks from it either way.
- Every `implementations/*/report.md` whose `Plan:` line names the same plan folder, when present — the record of what earlier passes over that plan already delivered; a task one of them records as completed is skipped once it is verified against the code.

If which input is meant is ambiguous — an incomplete issue identifier, a code reference pointing at a directory with multiple in-progress changes, a prompt naming an artifact with no clear referent, or an invocation naming a plan folder that is not under `plans/` — that is a preflight failure, not an in-run decision: refuse before deriving tasks, name the ambiguous reference and how to disambiguate it, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the ambiguous reference and how to re-invoke. Never silently pick by recency; the newest-by-stamp resolution applies only to an invocation that points at `plans/` without naming a folder.

## Implementation folder

Every invocation writes into its own new folder `implementations/<yymmddhhmm>[-<slug>]/` under the thread root, creating `implementations/` on demand. The stamp is the folder's creation time in UTC at minute resolution. Append `-<slug>`, a short kebab-case name for the implementation's purpose, when the invocation names one, or when a folder carrying that stamp already exists. The folder holds this run's `report.md` and its run state under `.runs/`.

Every invocation allocates its own folder and is that folder's only writer; a folder an earlier invocation created is read, never written.

## Factual progress records

This skill defines no per-task status token. The run's terminal outcome (`## Procedure`, final step) is the only closing signal it emits. Each attempted implicit task is recorded as an ordinary factual progress block — plain prose or ordinary structured fields, never a status token.

One append-only block per attempted implicit task lives in the run workspace's `progress.md` (see `## Run workspace`). Each block records:

- **Task attempted** — which implicit task, named from the derived task list.
- **Changes made** — what the diff did.
- **Verification** — the checks actually run and their results, including failures and justified skips.
- **Concerns** — non-blocking concerns to surface (partial coverage, a code smell, a judgment call, a possible-but-unverified edge case, a deviation applied per `## Deviations`), or `none`.
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

For a committed task, the same facts — with no status field — ride in the commit message body where applicable. The `progress.md` blocks and the git history together are the audit trail; no separate per-task status artifact is written.

## Dirty worktree handling

This skill runs on the current working tree and uses no `git worktree` isolation, so the worktree state is the FIRST safety preflight — checked ONCE at the very start of the run, before any other work.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed to the rest of preflight.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), proceed only when the invocation carries advance authorization that explicitly acknowledges the existing changes will be preserved and may enter this skill's implementation commits. A bare instruction to ignore the dirty tree does not satisfy the gate.
4. Otherwise refuse immediately: write nothing, name the dirty paths, give the exact authorization needed to re-invoke, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and `worktree dirty (<dirty paths>); re-invoke with authorization acknowledging the existing changes will be preserved and may enter this skill's commits`. Do not ask, do not wait, do not auto-stash, do not auto-commit the pre-existing changes.

When authorization is present, the pre-existing dirty changes are unavoidably picked up by the first `git commit` this skill makes once staged; the authorization is consent to that outcome.

## Procedure

Steps 1–3 are preflight. They complete in full — with no thread artifact written, no implementation folder allocated, no project file edited, and no commit made — before execution begins at step 4. Any preflight failure follows `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the reason and how to re-invoke, and writes nothing.

1. **Safety preflight: dirty worktree.** Run the `## Dirty worktree handling` check first, before any other preflight step; it refuses a dirty tree that lacks valid advance authorization.

2. **Gather the inputs.** Read everything under `## Inputs` now, in that order, READ-ONLY. For a GitHub issue, fetch the body and title — the body becomes the input, the title and labels additional framing. For a code reference, read the referenced files. For a raw prompt, the prompt itself is the input. If several plausible inputs match a reference, that is a preflight failure — refuse per `## Inputs` rather than picking by recency.

3. **Validate the input and required tooling, and derive the implicit tasks.** Translate the primary input into an ordered list of implicit tasks. When the input is a plan folder, each of the `plan.md` steps is an implicit task, in order, detailed by the `plan-tasks/` brief it indexes where the folder holds one, and you have the freedom to derive the obvious substeps a step implies. Otherwise derive the tasks from the input's stated intent and the observed code state. Each implicit task should be implementable in one sitting, observable on completion (a file written, a test passing, a behavior visible), and small enough that the self-review pass after it is meaningful. If the input is fully resolved (e.g., "do X to file Y, then add a test"), the implicit task list may be one or two tasks; if broader, one entry per cohesive implementation unit. Avoid both under-splitting (a single "do the whole thing" task) and over-splitting (a separate task per line touched). Confirm the input is coherent enough to derive tasks from and that any tooling and credentials the run explicitly requires are present. A structural input problem, a garbled invocation, or missing required tooling or credentials caught here is a preflight refusal.

4. **Allocate the implementation folder.** Preflight has passed; create this invocation's folder per `## Implementation folder`, allocate its run workspace per `## Run workspace`, and record the derived implicit task list and its state in `progress.md` so progress stays legible.

5. **Honour the earlier reports of the same plan.** When a plan folder is the primary input, take the reports gathered per `## Inputs` — every `implementations/*/report.md` whose `Plan:` line names that folder — and mark as already done each implicit task they record as completed, after verifying against the code that the change is actually in place. A task a report claims but the code does not carry is implemented in this run; note the discrepancy in its factual progress block. Record which tasks were skipped and why in `progress.md`.

6. **For each implicit task still to do, in order:**
   a. **Implement.** Make the code changes the task calls for. Use judgment if the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — surface the deviation in the factual progress block per `## Deviations`.
   b. **Self-review.** Re-read the diff against the implicit task's stated objective. Check that the change is coherent with the input, does not break adjacent code paths the implementer can see, and matches the project's conventions. As a first-class input to this pass — not an afterthought — explicitly surface the assumptions you made, the forced judgment calls you took, and any known risks the diff alone would not reveal; carry them into the factual progress block and the report. Self-review is in-session — no artifact file is written.
   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, follow `### Failed commit` under `## Commit Policy` — diagnose and fix in-authority causes within the retry cap; only when it cannot be resolved does the run hit an operational defect: record the diagnosis and end the run `BLOCKED` per `## Blocked`.
   d. **Append the factual progress block.** Append exactly one block for this attempted task to `progress.md` per `## Factual progress records` — after the commit for a committed task (carrying its SHA + subject), or with `Commit: none` otherwise. Emit a one-line chat summary for the task.

7. **Write the report.** Once all implicit tasks have run (or the run stopped early per `## Blocked`), write this folder's report per `## Implementation report`.

8. **Commit the report.** With the report written, you make the closing report commit yourself by following `<skill_path>/references/instructions/commit-the-implementation-report.md`, at every terminal outcome step 7 was reached from. Skip it only when the invocation carries an explicit suppression instruction per `## Commit Policy`; the report then stays uncommitted and the terminal outcome reason carries the instruction's uncommitted marker. A closing report commit that fails past its cap never routes through `## Blocked` and never changes the token the run's work earned.

9. **Final out-message.** Emit a final summary folding the factual progress blocks from `progress.md`: name each attempted implicit task, the tasks skipped because an earlier report already carried them, the commit SHA + subject for each commit made, the report that was written, and the closing report commit's SHA + subject — or that the report was left uncommitted, and why. Name any parent-level discovery surfaced per `## Discoveries`. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `<report path>` when the requested operation completed, including completion with non-blocking concerns; `<diagnosis or bundle path>` when substantive execution began but could not finish (per `## Blocked`); `<reason>` when preflight prevented execution (steps 1–3).

## Run workspace

Keep all operational progress for a run inside this invocation's implementation folder:

```text
implementations/<yymmddhhmm>[-<slug>]/.runs/progress.md
```

Create `.runs/` inside the folder allocated per `## Implementation folder` and name the progress file `progress.md`. Write to it by appending as the run proceeds — the derived implicit task list first, then one factual progress block per attempted task — so an interrupted run leaves everything it had reached. Recovery within an invocation, after a compaction or any other loss of context, reads only this folder's own `.runs/progress.md` and resumes from the last block it holds; it never reads another folder's run state and never re-derives the task list from scratch while `progress.md` carries it.

`.runs/` is operational, not durable: no durable artifact — not the report, not a commit message, nothing — ever cites a path inside it. It stays in place after the run as the run's trace.

## Implementation report

At every terminal outcome an executing run reaches — completion, partial completion, a `BLOCKED` halt, or a no-op where the requested state already held — follow `<skill_path>/references/instructions/write-implementation-report.md` once, drawing the outcome material from `progress.md` re-read from disk, and the deviations per `## Deviations`.

The assumptions, forced judgment calls, and known risks your per-task self-review surfaced feed this material: assumptions and forced judgment calls into the deviations, each with what it departs from and why; known risks into remaining concerns, or into problems already hit where the risk was realized during the run.

## Deviations

The policy is judgment-based and surfaced through the factual progress block and the report — not pre-clearance, not blanket permission.

- **Follow the input or the implicit task list derived from it.** The input is the contract; the implicit task list is the implementer's interpretation. Do not silently invent tasks the input does not call for. Do not silently skip tasks the input does call for.
- **Use judgment when warranted.** If the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the input's intent. A blocked import path, a missing helper the input assumed existed, a renamed dependency the input did not know about: fix and continue.
- **A deviation that stays within accepted intent proceeds, and is recorded.** It goes into the task's factual progress block as it happens, and into the report's `## Deviations`, one entry naming what was built, the spec section or ADR stem it departs from, and why. Minor deviations (a missing import added, a `Map` chosen where the input named no structure) carry a one-sentence entry and the run continues. This run is autonomous; it does not stop to pre-clear a judgment call, and the progress block and the report are where the user reads the trail.
- **A contradiction of a thread ADR or of a spec decision is a change of intent, and is never applied.** Finish everything safely derivable without it, then route it per `## Blocked`: the run ends `BLOCKED` once the report is written.
- **Never edit the input to justify the run.** If you discover the input itself is wrong — a step contradicts the observed code, a settled decision names a change already applied — surface it in the factual progress block and in the report, and let the surrounding session decide. You modify source code, configuration, tests, build files, and the living documentation within this implementation's scope; you do not edit the spec, the seed, the plan folder, or the issue you were handed, and you author no new such artifact inside this run.

## Discoveries

**A discovery with parent- or sibling-level impact** — something that would change a project decision, or that belongs to a direction wider than this thread — is a proposed ADR or a proposed roadmap entry. Surface it to the user in chat and carry it into the report's follow-ups. Proposing it is the whole action.

**Write boundary.** You write the project's code, tests, configuration, and living documentation within this implementation's scope, and this invocation's implementation folder with its `report.md` and its `.runs/`. Nothing else you touch is written — `spec.md`, `docs/adr/`, `docs/glossary.md`, the thread's `adr/`, `glossary.md`, and `plans/`, other implementation folders, and any other thread are read here and never written.

## Blocked

Three situations stop the run once substantive execution has begun (step 4 onward), and all three end `BLOCKED`. None is reachable from preflight — an invocation, input, or tooling failure caught in steps 1–3 is a `REFUSED`, not this path. Distinguish a genuine missing-intent question, a change of intent, and an operational defect before choosing between them.

**Missing human intent.** This applies whenever completing an implicit task requires a genuine human decision you cannot settle yourself from the gathered inputs and the observed code state. Per the run's autonomous posture, do not invent the intent and do not stall waiting in chat.

**A change of intent.** This applies to a contradiction of a thread ADR or of a spec decision, per `## Deviations`. An unnoticed conflict between the implementation's material and a project ADR or a project glossary term is the same situation: classify it as `/consult-decisions` instructs, and route it here rather than overriding the project record.

Both take the same route. First finish everything the run can safely derive without the decision, then write the report per `## Implementation report` reflecting the blocked outcome, commit it (`## Procedure`, step 8), and follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, this invocation's implementation folder's `report.md` as the target, and the originating user request. Then stop with a concise notification naming where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`.

**Operational defect.** An unfixable in-run failure the run cannot repair on its own — an exhausted commit retry (per `### Failed commit`), an inaccessible external dependency, a runtime failure, or malformed input detail not caught by preflight and discovered only during lazy execution — ends the run `BLOCKED` with a diagnosis and NO decision bundle. Finish any safe work first, write the report per `## Implementation report`, commit it (`## Procedure`, step 8), and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and the diagnosis. A structural input problem that preflight should have caught is a preflight `REFUSED`, not this path.

## Commit Policy

This skill auto-commits.

- **Default cadence:** ONE commit per implicit task. The boundary is the implicit task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple implicit tasks into one commit. Do not split one implicit task across multiple commits.
- **Override cadence:** When the user's invocation contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default cadence. The user's explicit instruction wins.
- **Judgment:** When the implicit task list is one task (a fully-resolved input), the default cadence and "one commit at the end" produce the same outcome — one commit. When the implicit task list is many tasks, the default cadence is many commits.
- **Closing report commit:** the run's `report.md` is committed on its own at `## Procedure` step 8, after the last task commit has landed, and stands outside the task cadence. An explicit instruction reaches it according to its kind: a **suppression** instruction ("do not commit, just leave the changes staged") suppresses the closing report commit too, and the terminal outcome reason then carries the uncommitted marker; a **cadence** instruction ("commit at the end as one commit", "make one commit per file touched") does not reach it, because the closing report commit is not a member of the code commit cadence — such a run makes the instructed code commits plus the closing report commit.
- **Baseline gate (before each commit):** A task's self-review confirms THAT task's objective; it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the self-review and this clause is a no-op. When the project DOES define standing gates, run them on the changed code and resolve any failure BEFORE committing the task — even when the task's own verification omits it. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this task. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.

Commits use the project's conventional-commit shape where applicable. Stage only the files the implicit task touched — the closing report commit stages the report alone; never run `git add -A` blindly. Commit subjects are descriptive of the implicit task's objective, not its substeps. Commit message bodies MAY carry the task's factual progress block from `## Factual progress records` — minus the commit's own SHA — so the audit trail lives in git history as well as the progress file.

### Failed commit

A failed task commit is diagnosed and fixed within the current task before it is ever treated as blocking — it is not an automatic halt. The closing report commit carries its own failure handling and never reaches `## Blocked`.

- **Diagnose first.** Read the actual error the commit emitted; never retry blind. What failed — a pre-commit hook, a lint or format check, a test, a commit-message linter, a missing sign-off — determines whether it is yours to fix.
- **Fix in-authority causes as part of the current task.** When the cause sits inside the task's own footprint — a lint or format violation in the task's files, a hook that auto-modified files that now need re-staging, a test the task's own diff broke, a commit subject a message linter rejected — fix it, re-run the failed check, and retry the commit.
- **Bounded retries.** Make at most 3 fix-and-retry attempts for the task. Past the cap, or when the cause is outside the task's authority (missing sign-off configuration, credentials, failures in files the task does not own, infrastructure errors), the run has hit an operational defect: record the diagnosis in the factual progress block — the specific failure and what was tried, not a bare "commit failed" — and stop the entire run `BLOCKED` per `## Blocked`. Subsequent implicit tasks are NOT attempted.
- **Guardrails (never traded for a green commit).** Never bypass hooks (`--no-verify` or any equivalent), never weaken, delete, or skip a check to make it pass, and never stash-and-retry. A fix addresses the real cause inside the task's footprint, or the run stops `BLOCKED`.
- **Audit trail.** The factual progress block and the commit body note that the commit failed N times and what was fixed, so the retries stay visible in the history.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase in any form, does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.
