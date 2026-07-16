---
name: implement-plan
description: Execute a strict multi-file plan artifact — a thread-root `plan.md` index plus its `plan-tasks/` briefs — end-to-end on the current working tree, reading the index then each task file in order, self-reviewing after each task, and auto-committing per task; use when a plan needs to be carried to working code in a single agent.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 5.2.1
---

# Implement Plan

Execute a plan artifact end-to-end on the current working tree. This skill reads the plan artifact READ-ONLY, reads the plan index, walks its task files in plan order, implements each task, self-reviews after each task, auto-commits per plan task, records a factual progress block per plan task in a run progress file, and updates the thread's singleton **implementation report** on the way out. It does not pause for clarifying questions at each step and does not ask before committing; the execution posture is identical whether or not a person is present. It does not rewrite history.

## Inputs

This skill accepts a plan artifact. The plan is a **multi-file** artifact rooted in the active thread folder:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── plan.md                 # the index, at the thread root
└── plan-tasks/
    ├── 01-<kebab-slug>.md
    ├── 02-<kebab-slug>.md
    └── …
```

The index plus its `plan-tasks/` folder together are the plan artifact. `plan.md` is the **index**: it carries the plan-level objective and context, a `Source:` line naming the upstream artifact the plan was compiled from (a thread-relative pointer, a repo-relative path, an issue URL, or `none — raw prompt`), a Global Constraints block, and an **ordered task list** that is authoritative for task count and order. Each `plan-tasks/NN-<kebab-slug>.md` file is one task, carrying the six mandatory fields — Objective; Input / context; Steps / substeps; Files modified; Verification; Acceptance criteria — plus two hand-off lines, `Consumes:` (what this task uses from earlier tasks) and `Produces:` (what later tasks rely on), where `none` is a legal value for either. Every task must be **sequential, isolated, independently implementable, and independently reviewable**, and the tasks are executed in index order.

`NN` is a two-digit task ordinal matching the index's task list. The index is named exactly `plan.md` at the thread root, and neither it nor the task files carry a UTC stamp or `v<N>`. The user MAY pass either the thread root or the index path — both resolve to the same artifact.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the skill executes only the named task(s); when omitted, the skill executes every task in the index in order. Even when only one task is named, the rule still applies — read the plan READ-ONLY, run the task, self-review, commit per `## Commit Policy`, and append the factual progress block.

A plan that does not match this shape — a missing index, a `plan-tasks/` folder that disagrees with the index, a task file missing its mandatory fields — fails the mechanical preflight (`## Procedure`). The remedy is to recompile the plan from its source, not to tolerate the mismatched shape.

## Factual progress records

This skill defines no formal per-task status token. The only status protocol is the run's terminal outcome (`## Procedure`, final step). Each attempted plan task is recorded as an ordinary factual progress block — plain prose or ordinary structured fields, never a status token.

One append-only block per attempted plan task is **appended to the run progress file** (see `## Run workspace`), and — for a committed cycle — carried in that task's commit message body per `## Run workspace`. Chat output carries only a one-line summary per task; the full block lives in the progress file, not a per-task artifact file. The progress file and the git history together are the audit trail. Each block records:

- **Task attempted** — which plan task (`NN`), named from the index.
- **Changes made** — what the diff did.
- **Verification** — the task file's verification block and any project gate actually run, and their results, including failures and justified skips.
- **Concerns** — non-blocking concerns to surface (partial coverage, a code smell, a judgment call on an ambiguous plan area, a possible-but-unverified edge case, a deviation applied per `## Plan Deviation Policy`), verbatim, or `none`; resolved findings are not restated.
- **Commit** — the SHA + subject for a committed cycle, else `none`.
- **Next action** — the suggested follow-up ("ready for next task", "ready for review", "stop and surface this finding", etc.).

Suggested block shape (exact wording is at the implementer's discretion; keep it in the 5–10 line range):

```
Task <NN> — <short label>
Changes made: <what the diff did>
Verification: <checks run and their results>
Concerns: <non-blocking concerns verbatim, or "none">
Commit: <SHA + subject for a committed cycle, else "none">
Next action: <suggested follow-up>
```

The one-line chat summary per task names the task and the commit (e.g. `Task 04: done, commit abc1234`). The final out-message folds every attempted plan task from the progress file, plus the commit SHA + subject for every commit made during the run. This is the implementation audit trail; the user reads it to understand what the plan accomplished and what to do next.

## Run workspace

Keep all operational progress for a run inside an invocation-scoped directory in the active thread:

```text
docs/threads/<thread>/.implementation-runs/<UTC>[-<desc>]/
└── progress.md
```

`<UTC>` is the run's start timestamp and is a valid directory name on its own; `<desc>` is an optional short kebab slug of the run's objective, taken from the plan's title purely for human scannability. Allocate a fresh directory unique to THIS invocation — never silently adopt or reuse an existing run directory. `progress.md` is the only file in the directory. Recovery within an invocation reads only this run's own directory. If a previous run was interrupted, its directory survives so it can be resumed later, but only when the user explicitly identifies it; you never adopt it on your own. This directory is invocation-scoped in meaning: no durable artifact — not the implementation report, not a commit message, nothing — ever references a path inside it. The directory remains in place after the run as the run's operational trace.

**The progress file.** `progress.md` is the authoritative in-flight record for the blocks defined in `## Factual progress records`; chat carries only a one-line summary per task. The commit message body carries the same block for committed cycles, minus the cycle's own SHA — the body is composed before the commit lands, so the cycle's SHA is not yet known and is present only in the progress file, appended post-commit.

**Append discipline (cycle-gated, not commit-gated).** Here a cycle is the work of one plan task. The progress file is append-only. Every cycle that reaches an outcome appends its block — a committed cycle appends once the commit lands (carrying that commit's SHA + subject); a cycle that produces no commit (an empty-diff completion, or a run stopped per `## Blocked`) appends with `Commit: none` before advancing or stopping. A preflight halt appends nothing — no cycle started.

**Compaction recovery.** The progress file plus `git log` are the resume state after a context compaction — never conversation recollection. The implementation report is folded from the progress file re-read from disk at the end of the run, not from memory.

## Dirty worktree handling

This skill runs on the current working tree and uses no `git worktree` isolation, so the worktree state is the FIRST safety preflight — checked ONCE at the very start of the run, before reading the plan artifact. The check is non-skippable.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed to the rest of preflight.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), proceed only when the invocation carries advance authorization that explicitly acknowledges the existing changes will be preserved and may enter this skill's implementation commits. A bare instruction to ignore the dirty tree does not satisfy the gate.
4. Otherwise refuse immediately: write nothing, name the dirty paths, give the exact authorization needed to re-invoke, and end with `Outcome: REFUSED — worktree dirty (<dirty paths>); re-invoke with authorization acknowledging the existing changes will be preserved and may enter this skill's commits`. Do not ask, do not wait, do not auto-stash, do not auto-commit the pre-existing changes.

When authorization is present, the pre-existing dirty changes are unavoidably picked up by the first `git commit` this skill makes once staged; the authorization is consent to that outcome.

## Single-Agent Topology

This skill is SINGLE-AGENT. The current session reads the plan, executes each plan task in order, and self-reviews after each task. NO subagents are spawned. There is no `Task` tool invocation, no implementer/reviewer separation, no orchestrator role distinct from the implementer role — the single session IS both, and the self-review pass after each task is the only review layer in this topology.

## Procedure

Steps 1–4 are preflight. They complete in full — with no workflow artifact written, no run workspace allocated, no project file edited, and no commit made — before execution begins at step 5. Any preflight failure ends the run `Outcome: REFUSED — <reason and how to re-invoke>` and writes nothing.

1. **Safety preflight: dirty worktree.** Per `## Dirty worktree handling`, run this check first. On a dirty tree without valid advance authorization, refuse now — write nothing, name the dirty paths, give the exact re-invocation authorization, and end `Outcome: REFUSED — <…>`. Do not ask, do not wait.

2. **Resolve the active thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If the plan path the user passed is already thread-rooted, the thread is implicit. If no thread resolves, or multiple thread roots exist and which one the plan path belongs to is ambiguous, refuse — write nothing and end `Outcome: REFUSED — <reason>`. This is the one situation a pending bundle is physically impossible, because `.pending-decisions/` would live inside the very thread that failed to resolve; never silently pick the most recent timestamp.

3. **Resolve the plan artifact path.** The plan is the thread-root `plan.md` index and its `plan-tasks/` folder; the thread root and the index path resolve to the same artifact. If the thread holds no `plan.md`, there is no plan to implement: refuse — write nothing and end `Outcome: REFUSED — no plan.md in the resolved thread`.

4. **Run the structural preflight, verify required tooling, then read the index and its `Source:` artifact.** The plan artifact is IMMUTABLE — open everything READ-ONLY. Run the **structural preflight** on the plan:

   a. every task-list entry in the index resolves to an existing `plan-tasks/NN-<kebab-slug>.md` file;
   b. every file under `plan-tasks/` is listed in the index;
   c. ordinals are contiguous and match the filenames.

   If any check fails, the plan is a **malformed artifact**: end `Outcome: REFUSED — malformed plan artifact: <mismatch>` before beginning the run. No task was attempted; the remedy is recompiling the plan from its source. Also confirm any tooling and credentials the run explicitly requires are present; a missing required tool or credential caught here is likewise a preflight refusal.

   Then read the **index** (`plan.md`) and, when its `Source:` line names an artifact (anything other than `none — raw prompt`), read that source artifact too — it holds the intent the plan was compiled from. The individual task files are read **lazily**: the session itself reads each `plan-tasks/NN-<kebab-slug>.md` as it reaches that task — it IS the implementer, so there is no dispatch indirection. If the user passed a specific task identifier, narrow to that subset; otherwise execute every task in index order.

5. **Allocate the run workspace.** Preflight has passed; allocate this run's workspace directory per `## Run workspace`. Keep a running task list of the tasks to execute and their state, so progress stays legible.

6. **For each plan task IN ORDER:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first".)

   a. **Read the task file and implement.** Read this task's `plan-tasks/NN-<kebab-slug>.md` READ-ONLY, then execute its Steps / substeps literally. Make the code changes the task calls for. Use judgment if the task file is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — surface the deviation in the factual progress block per `## Plan Deviation Policy`.

   b. **Self-review the implementation.** Re-read the diff against the task file's stated objective + verification + acceptance criteria. Check that the change is coherent with the task, does not break adjacent code paths the implementer can see, and matches the project's conventions. The diff is the review *target*; the rest of the repo is readable *context* — reading unchanged code to confirm a criterion is in-scope and expected. If the task has a mechanical verification block (a `grep` check, a `test -f` check, a `npm test` invocation), run it and record the result. As a first-class input to this pass — not an afterthought — explicitly surface the assumptions you made, the forced judgment calls you took, and any known risks the diff alone would not reveal; carry them into the factual progress block and the implementation report. Two rules shape this pass:
      - **Unverified concerns.** A criterion you cannot verify from within the run — external config, runtime-only behavior, credentials nobody has — is recorded as a named "unverified" concern. It is non-blocking by default and stays factual in the progress block; escalate to `## Blocked` only where a genuine human decision is required or proceeding without the answer would be reckless (your judgment).
      - **Positive focus.** The current task's diff is the focus of this pass. Discoveries outside it are not prohibited — record them (in the factual progress block, and as implementation-report follow-ups) without letting them stop THIS task; blocking stays defined against the current task. There is no out-of-task prohibition.

      Self-review is in-session — no separate review artifact file is written.

   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, follow the failed-commit branch in `## Commit Policy` — diagnose and fix in-authority causes within the retry cap; only when it cannot be resolved does the run hit an operational defect: append this cycle's block to the run progress file with `Commit: none` (per `## Run workspace`) recording the diagnosis, and stop the entire run `BLOCKED` per `## Blocked`.

   d. **Append the factual progress block.** Per `## Run workspace` and `## Factual progress records`, append exactly one block for this attempted task — after the commit for a committed cycle (carrying its SHA + subject), or with `Commit: none` for an empty-diff completion or a cycle stopped per `## Blocked` — then emit the one-line chat summary for the task. The commit message body carries the same block for committed cycles per `## Run workspace`.

7. **Update the implementation report.** Once every plan task has run (or the run stopped early per `## Blocked`), re-read `progress.md` from disk and fold it into the implementation report per `## Implementation report`.

8. **Final out-message.** Emit a final summary folding the factual progress blocks from `progress.md`: name each attempted plan task (one line per task), the commit SHA + subject for each commit made, and the thread-relative path of the implementation report just written. If follow-ups were discovered, name where they were routed per `## Implementation report`. Close with exactly one terminal line from the closed vocabulary — `Outcome: DONE — <implementation-report pointer>` when the requested operation completed, including completion with non-blocking concerns; `Outcome: BLOCKED — <diagnosis or bundle path>` when substantive execution began but could not finish (per `## Blocked`); `Outcome: REFUSED — <reason>` when preflight prevented execution (steps 1–4). The line is added to — it never replaces — the summary above.

## Implementation report

On EVERY normal terminal outcome — every plan task completed, a partial run, a `BLOCKED` halt, or a no-op where the requested state already existed — update the thread's singleton `implementation-report.md` at the thread root by invoking `/update-implementation-report` with the verified current outcome: which plan tasks were completed, partially completed, blocked, or found already satisfied; the resulting code, test, and configuration changes; the checks you actually ran and their results, including failures and justified skips; every place the implementation diverged from what a plan task called for, each with a one-or-two-sentence reason; remaining concerns; and follow-ups. The report reflects only the CURRENT outcome — the primitive merges in place, replacing stale content and dropping now-resolved concerns — so pass it the run's end state, folded from `progress.md` re-read from disk, not a running log of earlier passes.

The per-task self-review is deliberately a task-scoped gate: it confirms each task against its own objective and verification, not the whole change, and the implementation as a whole is expected to receive a broader review afterward — so write this report to be that review's starting point. The assumptions, forced judgment calls, and known risks the per-task self-review surfaced feed this outcome: assumptions and forced judgment calls into the deviations content, each with its justification; known risks into remaining concerns, or into problems already hit where the risk was realized during the run. Pull the deviations from the factual progress blocks where they were surfaced.

## Blocked

Two situations stop the run once substantive execution has begun (step 5 onward), and both end `BLOCKED`. Neither is reachable from preflight — a dirty-tree, thread, plan-resolution, structural, or tooling failure caught in steps 1–4 is a `REFUSED`, not this path. Distinguish a genuine missing-intent question from an operational defect before choosing between them.

**Missing human intent.** This applies whenever completing a plan task requires a genuine human decision you cannot settle yourself from the plan and the observed code state. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat. First finish everything the run can safely derive without that decision, then hand the indispensable open decision(s) to `/emit-pending-decisions`, giving it `/implement-plan` as the producer, the thread's `implementation-report.md` as the target, the context you gathered as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the plan. Update the implementation report per `## Implementation report` to reflect the blocked outcome, then stop with a concise notification naming where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

**Operational defect.** An unfixable in-run failure the run cannot repair on its own — an exhausted commit retry (per `### Failed commit`), an inaccessible external dependency, a runtime failure, or malformed task detail not covered by the completed structural preflight and discovered only during lazy execution — ends the run `BLOCKED` with a diagnosis and NO decision bundle. Finish any safe work first, update the implementation report per `## Implementation report`, and end with `Outcome: BLOCKED — <diagnosis>`.

## Roadmap-descendant feedback

When the run's thread carries a `Parent:` roadmap reference in its seed and you discover something with parent- or sibling-level impact, route it to the parent through `/append-roadmap-feedback`; `references/shared/roadmap-descendant-feedback.md` spells out what qualifies as parent-level impact, what to hand the primitive, and what stays local in this run's implementation report.

## Commit Policy

This skill auto-commits.

- **Cadence:** ONE commit per plan task that the agent executes from the plan — **per plan task** (one commit per successful plan task). The boundary is the plan task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple plan tasks into one commit. Do not split one plan task across multiple commits.
- **Override:** If the user's invocation contains an EXPLICIT Git instruction (for example, "commit at the end as one commit", "do not commit, just leave the changes staged"), honor the explicit instruction over the default per-plan-task cadence. The user's explicit instruction wins.
- **Baseline gate (before each commit):** A plan task's verification block is task-specific — it confirms THAT task's objective, and it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the plan's verification and this clause is a no-op. When the project DOES define standing gates, run them on the changed code and resolve any failure BEFORE committing the task — independent of, and even when omitted by, the plan task's verification block. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this task. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.

Commits use the project's conventional-commit shape where applicable; follow the project's contribution guidelines for scope rules. Stage only the files the plan task touched — the task file's `Files modified` list is unconditionally authoritative; use it. Never run `git add -A` blindly. Commit subjects are descriptive of the plan task's objective, not its substeps. Commit message bodies carry the task's progress-file block per `## Run workspace`, so the audit trail lives in git history as well as the progress file.

### Failed commit

A failed commit is diagnosed and fixed within the current plan task before it is ever treated as blocking — it is not an automatic halt.

- **Diagnose first.** Read the actual error the commit emitted; never retry blind. What failed — a pre-commit hook, a lint or format check, a test, a commit-message linter, a missing sign-off — determines whether it is yours to fix.
- **Fix in-authority causes as part of the current task.** When the cause sits inside the task's own footprint — a lint or format violation in the task's files, a hook that auto-modified files that now need re-staging, a test the task's own diff broke, a commit subject a message linter rejected — fix it, re-run the failed check, and retry the commit.
- **Bounded retries.** Make at most 3 fix-and-retry attempts for the task. Past the cap, or when the cause is outside the task's authority (missing sign-off configuration, credentials, failures in files the task does not own, infrastructure errors), the run has hit an operational defect: append this cycle's block to the run progress file with `Commit: none` (per `## Run workspace`), recording the diagnosis in the block — the specific failure and what was tried, not a bare "commit failed" — and stop the entire run `BLOCKED` per `## Blocked`. Subsequent plan tasks are NOT attempted.
- **Guardrails (never traded for a green commit).** Never bypass hooks (`--no-verify` or any equivalent), never weaken, delete, or skip a check to make it pass, and never stash-and-retry. A fix addresses the real cause inside the task's footprint, or the task becomes a `BLOCKED` report.
- **Audit trail.** The task's progress block and the commit body note that the commit failed N times and what was fixed, so the retries stay visible in the history.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

The policy is judgment-based and surfaced via the factual progress block — not pre-clearance, not blanket permission.

- **Follow the plan.** The plan is the contract; the implementer executes the tasks in index order, applying each task file's substeps literally. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If the plan task is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the plan task's objective. A blocked import path, a missing helper the plan assumed existed, a renamed dependency the plan did not know about: fix and continue.
- **Surface deviations in the factual progress block.** Every deviation, assumption, forced judgment call, and unverified check goes into the block's Concerns as plain facts — no status token is assigned. Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the plan did not specify) are recorded with a one-sentence note and the run continues. A deviation that would require inventing genuine human intent — a structural choice the plan did not anticipate, a sub-step unsafe to apply blindly, a read of the observed code that conflicts with the plan task's input field — is never applied silently: finish what is safely derivable, then route the open decision per `## Blocked`.
- **Do not pre-clear minor deviations.** This run is autonomous; it does not stop for every judgment call. The factual progress block is where the user reads the trail.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the implementer does NOT edit the plan artifact as a side effect of this run. The implementer records the finding in the factual progress block, captures it in the implementation report, routes the required human decision per `## Blocked`, and stops the run — plan revision happens upstream, not inside this run. A **spec fault** (the plan faithfully implements an ambiguous or incomplete spec) is fixed by correcting the spec and recompiling the plan from it. A **plan fault** (the plan itself is wrong while its source is sound) is fixed by revising the living plan — re-running planning against the source, or editing the plan in place as a living document. Either way the revised plan is handed back on a fresh run; this run's mandate is to surface the fault and stop, never to silently patch the plan.

## Immutability

Plan artifacts are IMMUTABLE. The implementer reads the index and every task file READ-ONLY. Nothing in the plan is edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

What the implementer DOES modify is source code, plus the thread's singleton implementation report per `## Implementation report`; it also writes the run progress file per `## Run workspace`. The implementer does NOT create new spec, proposal, plan, or decision-log artifacts inside this run; those require a separate authoring pass.
