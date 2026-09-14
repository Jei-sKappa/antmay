---
name: implement-plan
description: Execute a strict plan folder task by task on the current working tree, committing per task.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Implement Plan

Execute a strict plan folder end to end on the current working tree. You gather the thread's context, create this invocation's implementation folder, read the plan's index, walk its task list in order, implement each task, self-review after each task, auto-commit per plan task, record a factual progress block per plan task, and write the folder's report on the way out. Do not pause for clarifying questions at each step and do not ask before committing; the execution posture is identical whether or not a person is present. Do not rewrite history.

This skill is single-agent: the current session is the implementer and runs the self-review pass after each plan task. No subagents are spawned.

## Inputs

Gather all of these before executing the first task; everything below works from what you gather here.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the plan.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- The thread's `spec.md` — the thread's design truth, and what the implementation answers to.
- **The plan folder to execute** — the primary input and the artifact this run carries to code, in one of two accepted forms. When the invocation **names a folder** under `plans/`, that folder is the form; otherwise the form is the **newest folder under `plans/` by stamp**. It resolves to `plans/<folder>/plan.md` — the index, authoritative for task count and order — together with the `plan-tasks/NN-<kebab-slug>.md` brief each index entry points at. When the index's `Source:` line names an artifact other than the thread's `spec.md`, read that artifact too: it holds the intent the plan was compiled from.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer, which inside the thread takes precedence over the project records; these are the records the spec cites by stem.
- Every `implementations/*/report.md` whose `Plan:` line names that same plan folder — the record of what earlier passes over the plan already delivered; a task one of them records as completed is skipped once it is verified against the code.

The plan folder's shape is strict: an index named exactly `plan.md` at the folder root; a `plan-tasks/` folder beside it; a two-digit ordinal `NN` on every brief matching the index's ordered task list; and on every brief the six mandatory fields — Objective; Input / context; Steps / substeps; Files modified; Verification; Acceptance criteria — plus the two hand-off lines `Consumes:` (what this task uses from earlier tasks) and `Produces:` (what later tasks rely on), where `none` is a legal value for either. Every task is sequential, isolated, independently implementable, and independently reviewable, and the tasks run in index order. A plan folder that does not match this shape — a missing index, a `plan-tasks/` folder that disagrees with the index, a brief missing its mandatory fields — fails preflight (`## Procedure`); the remedy is to correct the plan upstream, and this run infers no missing structure.

The invocation MAY carry a SPECIFIC plan task identifier alongside the plan reference (for example, "task 3" or "tasks 2 and 4"). When it does, execute only the named task(s); when it does not, execute every task the index lists, in order. A single named task runs under every rule below unchanged — read the plan READ-ONLY, implement the task, self-review, commit per `## Commit Policy`, and append the factual progress block.

If which input is meant is ambiguous — an invocation naming a plan folder that is not under `plans/`, or a plan reference with no clear referent — that is a preflight failure, not an in-run decision: refuse before executing anything, name the ambiguous reference and how to disambiguate it, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the ambiguous reference and how to re-invoke. Never silently pick by recency; the newest-by-stamp resolution applies only to an invocation that points at `plans/` without naming a folder.

## Implementation folder

Every invocation writes into its own new folder `implementations/<yymmddhhmm>[-<slug>]/` under the thread root, creating `implementations/` on demand. The stamp is the folder's creation time in UTC at minute resolution. Append `-<slug>`, a short kebab-case name for the implementation's purpose, when the invocation names one, or when a folder carrying that stamp already exists. The folder holds this run's `report.md` and its run state under `.runs/`.

Every invocation allocates its own folder and is that folder's only writer; a folder an earlier invocation created is read, never written.

## Factual progress records

This skill defines no per-task status token. The run's terminal outcome (`## Procedure`, final step) is the only closing signal it emits. Each attempted plan task is recorded as an ordinary factual progress block — plain prose or ordinary structured fields, never a status token.

One append-only block per attempted plan task lives in the run workspace's `progress.md` (see `## Run workspace`), and — for a committed task — the same facts ride in the commit message body. Chat output carries only a one-line summary per task. The progress blocks and the git history together are the audit trail. Each block records:

- **Task attempted** — which plan task (`NN`), named from the index.
- **Changes made** — what the diff did.
- **Verification** — the brief's verification block and any project gate actually run, and their results, including failures and justified skips.
- **Concerns** — non-blocking concerns to surface (partial coverage, a code smell, a judgment call on an ambiguous area of the brief, a possible-but-unverified edge case, a deviation applied per `## Deviations`), or `none`.
- **Commit** — the SHA + subject for a committed task, else `none`.
- **Next action** — the suggested follow-up ("ready for next task", "ready for review", "stop and surface this finding", etc.).

Suggested block shape (exact wording is at the implementer's discretion; keep it in the 5–10 line range):

```
Task <NN> — <short label>
Changes made: <what the diff did>
Verification: <checks run and their results>
Concerns: <non-blocking concerns, or "none">
Commit: <SHA + subject, or "none">
Next action: <suggested follow-up>
```

The one-line chat summary per task names the task and the commit (e.g. `Task 04: done, commit abc1234`).

## Dirty worktree handling

This skill runs on the current working tree and uses no `git worktree` isolation, so the worktree state is the FIRST safety preflight — checked ONCE at the very start of the run, before any other work. The check is non-skippable.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed to the rest of preflight.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), proceed only when the invocation carries advance authorization that explicitly acknowledges the existing changes will be preserved and may enter this skill's implementation commits. A bare instruction to ignore the dirty tree does not satisfy the gate.
4. Otherwise refuse immediately: write nothing, name the dirty paths, give the exact authorization needed to re-invoke, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and `worktree dirty (<dirty paths>); re-invoke with authorization acknowledging the existing changes will be preserved and may enter this skill's commits`. Do not ask, do not wait, do not auto-stash, do not auto-commit the pre-existing changes.

When authorization is present, the pre-existing dirty changes are unavoidably picked up by the first `git commit` this skill makes once staged; the authorization is consent to that outcome.

## Procedure

Steps 1–3 are preflight. They complete in full — with no thread artifact written, no implementation folder allocated, no project file edited, and no commit made — before execution begins at step 4. Any preflight failure follows `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the reason and how to re-invoke, and writes nothing.

1. **Safety preflight: dirty worktree.** Run the `## Dirty worktree handling` check first, before any other preflight step; it refuses a dirty tree that lacks valid advance authorization.

2. **Gather the inputs.** Read everything under `## Inputs` now, in that order, READ-ONLY. The index is read in full here; each `plan-tasks/NN-<kebab-slug>.md` brief is read when the run reaches its task (step 6a), because the session that reads a brief is the one that implements it. If several plausible plan folders match the reference, that is a preflight failure — refuse per `## Inputs` rather than picking by recency.

3. **Run the structural preflight and verify required tooling.** Confirm the plan folder matches the strict shape `## Inputs` defines: (a) every task-list entry in the index resolves to an existing `plan-tasks/NN-<kebab-slug>.md` file; (b) every file under `plan-tasks/` is listed in the index; (c) ordinals are contiguous and match the filenames. If any check fails, follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and `malformed plan folder: <mismatch>` before beginning the run — no task was attempted, and the remedy is correcting the plan upstream. Also confirm any tooling and credentials the run explicitly requires are present; a missing required tool or credential caught here is likewise a preflight refusal. If the invocation named a task identifier, narrow the run to that subset of the index's task list; otherwise execute every task the index lists, in order.

4. **Allocate the implementation folder.** Preflight has passed; create this invocation's folder per `## Implementation folder`, allocate its run workspace per `## Run workspace`, and record the task list to execute and its state in `progress.md` so progress stays legible.

5. **Honour the earlier reports of the same plan.** Take the reports gathered per `## Inputs` — every `implementations/*/report.md` whose `Plan:` line names this plan folder — and mark as already done each plan task they record as completed, after verifying against the code that the change is actually in place. A task a report claims but the code does not carry is implemented in this run; note the discrepancy in its factual progress block. Record which tasks were skipped and why in `progress.md`.

6. **For each plan task still to do, IN ORDER:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first".)

   a. **Read the brief and implement.** Read this task's `plan-tasks/NN-<kebab-slug>.md` READ-ONLY, then execute its Steps / substeps literally. Make the code changes the task calls for. Use judgment if the brief is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — surface the deviation in the factual progress block per `## Deviations`.

   b. **Self-review the implementation.** Re-read the diff against the brief's stated objective, verification, and acceptance criteria. Check that the change is coherent with the task, does not break adjacent code paths you can see, and matches the project's conventions. The diff is the review *target*; the rest of the repo is readable *context* — reading unchanged code to confirm a criterion is in-scope and expected. If the brief has a mechanical verification block (a `grep` check, a `test -f` check, a test invocation), run it and record the result. As a first-class input to this pass — not an afterthought — explicitly surface the assumptions you made, the forced judgment calls you took, and any known risks the diff alone would not reveal; carry them into the factual progress block and the report. Two rules shape this pass:
      - **Unverified concerns.** A criterion you cannot verify from within the run — external config, runtime-only behavior, credentials nobody has — is recorded as a named "unverified" concern. It is non-blocking by default and stays factual in the progress block; escalate to `## Blocked` only where a genuine human decision is required or proceeding without the answer would be reckless (your judgment).
      - **Positive focus.** The current task's diff is the focus of this pass. Record discoveries outside it — in the factual progress block, and as report follow-ups — without letting them stop THIS task; blocking stays defined against the current task.

      Self-review is in-session — no review artifact file is written.

   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, follow `### Failed commit` under `## Commit Policy` — diagnose and fix in-authority causes within the retry cap; only when it cannot be resolved does the run hit an operational defect: append this task's block with `Commit: none` recording the diagnosis, and stop the entire run `BLOCKED` per `## Blocked`.

   d. **Append the factual progress block.** Append exactly one block for this attempted task to `progress.md` per `## Factual progress records` — after the commit for a committed task (carrying its SHA + subject), or with `Commit: none` for an empty-diff completion or a task stopped per `## Blocked`. Emit the one-line chat summary for the task.

7. **Write the report.** Once every plan task has run (or the run stopped early per `## Blocked`), write this folder's report per `## Implementation report`.

8. **Final out-message.** Emit a final summary folding the factual progress blocks from `progress.md`: name each attempted plan task, the tasks skipped because an earlier report already carried them, the commit SHA + subject for each commit made, and the report that was written. Name any parent-level discovery surfaced per `## Discoveries`. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `<report path>` when the requested operation completed, including completion with non-blocking concerns; `<diagnosis or bundle path>` when substantive execution began but could not finish (per `## Blocked`); `<reason>` when preflight prevented execution (steps 1–3).

## Run workspace

Keep all operational progress for a run inside this invocation's implementation folder:

```text
implementations/<yymmddhhmm>[-<slug>]/.runs/progress.md
```

Create `.runs/` inside the folder allocated per `## Implementation folder` and name the progress file `progress.md`. Write to it by appending as the run proceeds — the task list to execute first, then one factual progress block per attempted task — so an interrupted run leaves everything it had reached. Recovery within an invocation, after a compaction or any other loss of context, reads only this folder's own `.runs/progress.md` together with `git log`, and resumes from the last block it holds; it never reads another folder's run state and never relies on conversation recollection.

`.runs/` is operational, not durable: no durable artifact — not the report, not a commit message, nothing — ever cites a path inside it. Anything a durable record needs (a concern, a deviation, a finding) is copied into that record. It stays in place after the run as the run's trace.

## Implementation report

At every terminal outcome an executing run reaches — every plan task completed, a partial run, a `BLOCKED` halt, or a no-op where the requested state already held — follow `<skill_path>/references/instructions/write-implementation-report.md` once, drawing the outcome material from `progress.md` re-read from disk, and the deviations per `## Deviations`.

The per-task self-review is deliberately a task-scoped gate: it confirms each task against its own objective and verification, not the whole change, and the implementation as a whole is expected to receive a broader review afterward — so write this report to be that review's starting point. The assumptions, forced judgment calls, and known risks your per-task self-review surfaced feed this material: assumptions and forced judgment calls into the deviations, each with what it departs from and why; known risks into remaining concerns, or into problems already hit where the risk was realized during the run.

## Deviations

The policy is judgment-based and surfaced through the factual progress block and the report — not pre-clearance, not blanket permission.

- **Follow the plan.** The plan is the contract; execute the tasks in index order, applying each brief's substeps literally. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If a brief is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the task's objective. A blocked import path, a missing helper the brief assumed existed, a renamed dependency the plan did not know about: fix and continue.
- **A deviation that stays within accepted intent proceeds, and is recorded.** It goes into the task's factual progress block as it happens, and into the report's `## Deviations`, one entry naming what was built, the spec section or ADR stem it departs from, and why. Minor deviations (a missing import added, a `Map` chosen where the brief named no structure) carry a one-sentence entry and the run continues. This run is autonomous; it does not stop to pre-clear a judgment call, and the progress block and the report are where the user reads the trail.
- **A contradiction of a thread ADR or of a spec decision is a change of intent, and is never applied.** Finish everything safely derivable without it, then route it per `## Blocked`: the run ends `BLOCKED` once the report is written.
- **A fault in the plan is surfaced, never patched.** If a task contradicts the observed code, rests on a wrong premise, or names a target that has gone, record it in the factual progress block and in the report and route the required human decision per `## Blocked`. Correcting the plan happens upstream, per `## Immutability`.

## Discoveries

**A discovery with parent- or sibling-level impact** — something that would change a project decision, or that belongs to a direction wider than this thread — is a proposed ADR or a proposed roadmap entry. Surface it to the user in chat and carry it into the report's follow-ups. Proposing it is the whole action.

**Write boundary.** You write the project's code, tests, configuration, and living documentation within this implementation's scope, and this invocation's implementation folder with its `report.md` and its `.runs/`. Nothing else you touch is written — `spec.md`, `docs/adr/`, `docs/glossary.md`, the thread's `adr/`, `glossary.md`, and `plans/`, other implementation folders, and any other thread are read here and never written.

## Blocked

Three situations stop the run once substantive execution has begun (step 4 onward), and all three end `BLOCKED`. None is reachable from preflight — a dirty-tree, plan-resolution, structural, or tooling failure caught in steps 1–3 is a `REFUSED`, not this path. Distinguish a genuine missing-intent question, a change of intent, and an operational defect before choosing between them.

**Missing human intent.** This applies whenever completing a plan task requires a genuine human decision you cannot settle yourself from the gathered inputs and the observed code state. Per the run's autonomous posture, do not invent the intent and do not stall waiting in chat.

**A change of intent.** This applies to a contradiction of a thread ADR or of a spec decision, per `## Deviations`. An unnoticed conflict between the implementation's material and a project ADR or a project glossary term is the same situation: classify it as `/consult-adrs` instructs, and route it here rather than overriding the project record.

Both take the same route. First finish everything the run can safely derive without the decision, then write the report per `## Implementation report` reflecting the blocked outcome, and follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, this invocation's implementation folder's `report.md` as the target, and the originating user request. Then stop with a concise notification naming where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`.

**Operational defect.** An unfixable in-run failure the run cannot repair on its own — an exhausted commit retry (per `### Failed commit`), an inaccessible external dependency, a runtime failure, or malformed task detail not covered by the structural preflight and discovered only when the brief is read — ends the run `BLOCKED` with a diagnosis and NO decision bundle. Finish any safe work first, write the report per `## Implementation report`, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and the diagnosis. A structural plan problem that preflight should have caught is a preflight `REFUSED`, not this path.

## Commit Policy

This skill auto-commits.

- **Cadence:** ONE commit per plan task that the run executes — one commit per successful plan task. The boundary is the plan task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple plan tasks into one commit. Do not split one plan task across multiple commits.
- **Override:** If the user's invocation contains an EXPLICIT Git instruction (for example, "commit at the end as one commit", "do not commit, just leave the changes staged"), honor the explicit instruction over the default per-plan-task cadence. The user's explicit instruction wins.
- **Baseline gate (before each commit):** A brief's verification block is task-specific — it confirms THAT task's objective, and it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the brief's verification and this clause is a no-op. When the project DOES define standing gates, run them on the changed code and resolve any failure BEFORE committing the task — independent of, and even when omitted by, the brief's verification block. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this task. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.

Commits use the project's conventional-commit shape where applicable; follow the project's contribution guidelines for scope rules. Stage only the files the plan task touched — the brief's `Files modified` list is unconditionally authoritative; use it. Never run `git add -A` blindly. Commit subjects are descriptive of the plan task's objective, not its substeps. Commit message bodies carry the task's factual progress block from `## Factual progress records` — minus the commit's own SHA — so the audit trail lives in git history as well as the progress file.

### Failed commit

A failed commit is diagnosed and fixed within the current plan task before it is ever treated as blocking — it is not an automatic halt.

- **Diagnose first.** Read the actual error the commit emitted; never retry blind. What failed — a pre-commit hook, a lint or format check, a test, a commit-message linter, a missing sign-off — determines whether it is yours to fix.
- **Fix in-authority causes as part of the current task.** When the cause sits inside the task's own footprint — a lint or format violation in the task's files, a hook that auto-modified files that now need re-staging, a test the task's own diff broke, a commit subject a message linter rejected — fix it, re-run the failed check, and retry the commit.
- **Bounded retries.** Make at most 3 fix-and-retry attempts for the task. Past the cap, or when the cause is outside the task's authority (missing sign-off configuration, credentials, failures in files the task does not own, infrastructure errors), the run has hit an operational defect: append this task's block to `progress.md` with `Commit: none` (per `## Run workspace`), recording the diagnosis in the block — the specific failure and what was tried, not a bare "commit failed" — and stop the entire run `BLOCKED` per `## Blocked`. Subsequent plan tasks are NOT attempted.
- **Guardrails (never traded for a green commit).** Never bypass hooks (`--no-verify` or any equivalent), never weaken, delete, or skip a check to make it pass, and never stash-and-retry. A fix addresses the real cause inside the task's footprint, or the run stops `BLOCKED`.
- **Audit trail.** The task's progress block and the commit body note that the commit failed N times and what was fixed, so the retries stay visible in the history.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase in any form, does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Immutability

The plan folder is IMMUTABLE. Read its index and every brief READ-ONLY. Nothing inside it is edited in place — not for typo fixes, not to add a missing acceptance criterion, not to mark tasks as done, not for any reason. Implementation output goes to source code and to this invocation's implementation folder, per the write boundary in `## Discoveries`.

When the plan itself needs revision — it calls for an outdated approach, a target file has gone, a whole task rests on a wrong premise — this run's mandate is to surface the fault and stop, per `## Deviations`. A **spec fault** (the plan faithfully implements an ambiguous or incomplete spec) is fixed by amending the spec and writing a fresh plan from it. A **plan fault** (the plan is wrong while the spec is sound) is fixed by running the plan check against the plan folder, or by writing a fresh plan. Either way the corrected plan is handed to a fresh run.
