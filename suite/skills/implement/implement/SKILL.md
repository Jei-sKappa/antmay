---
name: implement
description: Carry a plan folder, an artifact, an issue, or a prompt to working code on the working tree, committing per derived task.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Implement

Execute an input end-to-end on the current working tree. You gather the thread's context, create this invocation's implementation folder, derive implicit tasks if the input does not already enumerate them, implement each task, self-review, auto-commit per implicit task or per explicit Git instruction the user passes through, append typed entries to the run progress file as the run proceeds, and write the folder's report on the way out. Do not pause for clarifying questions at each step and do not ask before committing; the execution posture is identical whether or not a person is present. Do not rewrite history.

This skill is single-agent: the current session is the implementer and runs the self-review pass after each implicit task. No subagents are spawned.

## Inputs

Gather all of these before deriving implicit tasks; everything below works from what you gather here.

- The project's `AGENTS.md`, when the file exists — the project's standing guidance for agents working in it.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be used in everything you write.
- `docs/adr/` and `docs/pdr/`, read via `/consult-decisions` — the project decisions bearing on the implementation.
- The roadmap entry named by the seed frontmatter's `roadmap` mapping, when the seed carries one — the entry this thread answers: its sketch, its scope boundary and its planned behavior, found as the heading whose text is `roadmap.entry` in the index at `roadmap.path`.
- The thread's `spec.md`, when the file exists — the spec, whose acceptance checklist the implementation answers to.
- The thread's `delta/`, when present — the thread's delta of the project layer, which inside the thread takes precedence over the project records and holds the decision records, glossary terms and agents-file changes the change lands.
- The thread's `seed.md` — why the thread exists and what triggered it.
- **The work to carry to code** — the primary input, in one of two accepted forms. When the invocation points at a **plan folder** under `plans/`, that folder is the form: the folder it names, or the newest folder under `plans/` by stamp when it points at `plans/` without naming one. Read its `plan.md`, whose ordered steps are what the run executes, together with the brief each step indexes under `plan-tasks/` when the folder holds them — a brief carries its step's files, verification, and acceptance criteria. Otherwise the form is a **referenced artifact or the user's prompt**: a repository path, a directory, a git ref, a GitHub issue (full URL or the short `owner/repo#NNN` form), or the user's prompt itself when nothing else is named; the run derives its implicit tasks from it either way.
- Every `implementations/*/report.md` whose `Plan:` line names the same plan folder, when present — its `## Changes` task ledger is the record of what earlier passes over that plan already delivered, and the only source this run resumes from across invocations; a task a ledger records as completed is skipped once it is verified against the code.

Any other thread is history: it records how its own work was understood at the time, not what holds now, so do not read it unless the user or this thread's seed names it.

If which input is meant is ambiguous — an incomplete issue identifier, a code reference pointing at a directory with multiple in-progress changes, a prompt naming an artifact with no clear referent, or an invocation naming a plan folder that is not under `plans/` — that is a preflight failure, not an in-run decision: refuse before deriving tasks, name the ambiguous reference and how to disambiguate it, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the ambiguous reference and how to re-invoke. Never silently pick by recency; the newest-by-stamp resolution applies only to an invocation that points at `plans/` without naming a folder.

## Implementation folder

Every invocation writes into its own new folder `implementations/<yymmddhhmm>[-<slug>]/` under the thread root, creating `implementations/` on demand. The stamp is the folder's creation time in UTC at minute resolution. Append `-<slug>`, a short kebab-case name for the implementation's purpose, when the invocation names one, or when a folder carrying that stamp already exists. The folder holds this run's `report.md` and its run state under `.runs/`.

Every invocation allocates its own folder and is that folder's only writer; a folder an earlier invocation created is read, never written.

## Run progress file

This skill defines no per-task status token. The run's terminal outcome (`## Procedure`, final step) is the only closing signal it emits. What the run must carry to its report is recorded in the run progress file, `.runs/progress.md` (see `## Run workspace`).

The file exists to carry deviations, judgment calls and concerns through context compaction to the report written at the end. It is append-only: one typed entry per line, of the shape

```text
- (<type>) <task ordinal, where one applies> <content>
```

and an entry once written is never rewritten or reordered. The file carries no per-task block, no list of tasks to execute, no status or return token, and no tally of dispatches, fix attempts or commit retries.

The entry types form a closed set:

- `done` — the task ordinal, then its commit as SHA and subject, `no change needed`, or `already done` with the commit an earlier report records.
- `blocked` — the task ordinal and the diagnosis.
- `deviation` — what was built, what it departs from, and why.
- `judgment` — the choice, the degree of freedom or the silence it filled, and why.
- `concern` — a non-blocking concern, a known risk, or a discrepancy between an earlier report and the code.
- `check` — a whole-change check run against the final state, with its result; or a check that failed and stayed unresolved, or was deliberately skipped, with its result or reason.
- `discovery` — a discovery with parent- or sibling-level impact.
- `follow-up` — work this implementation leaves for later.

An entry names its task ordinal wherever one applies; an implicit task's ordinal is its position in the derived task list. A per-task check that passed is not recorded, and neither is a failure fixed within its task before the task's commit. The progress file and the git history together are the audit trail; no separate per-task status artifact is written.

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

4. **Allocate the implementation folder.** Preflight has passed; create this invocation's folder per `## Implementation folder` and allocate its run workspace and `.runs/progress.md` per `## Run workspace`. Record no task list in it: the derived implicit task list is re-derivable from the input and is not stored.

5. **Honour the earlier reports of the same plan.** When a plan folder is the primary input, read the `## Changes` ledger of each report gathered per `## Inputs` — every `implementations/*/report.md` whose `Plan:` line names that folder; the ledgers are the only resume source across invocations. A task a ledger records with a commit, or as `already done` or `no change needed`, counts as completed once you verify against the code that the change is actually in place: append a `done` entry for it reading `already done` with that commit, or `no change needed`. A task a ledger claims but the code does not carry is implemented in this run, and the discrepancy is appended as a `concern` entry.

6. **For each implicit task still to do, in order:**
   a. **Implement.** Make the code changes the task calls for. Use judgment if the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — append each deviation you apply as a `deviation` entry as it happens, per `## Deviations`.
   b. **Self-review.** Re-read the diff against the implicit task's stated objective. Check that the change is coherent with the input, does not break adjacent code paths the implementer can see, and matches the project's conventions. As a first-class input to this pass — not an afterthought — explicitly surface the assumptions you made, the forced choices you took, and any known risks the diff alone would not reveal. Append each assumption or forced choice as a `judgment` entry where the input pins nothing at that point, or as a `deviation` entry where it departs from something pinned; append each known risk as a `concern` entry. Self-review is in-session — no artifact file is written.
   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, follow `### Failed commit` under `## Commit Policy` — diagnose and fix in-authority causes within the retry cap; only when it cannot be resolved does the run hit an operational defect: close the task with a `blocked` entry carrying the diagnosis, per step 6d, and end the run `BLOCKED` per `## Blocked`.
   d. **Close the task in the progress file.** Append exactly one closing entry for the task per `## Run progress file`: a `done` entry carrying its commit SHA and subject after the commit lands, a `done` entry reading `no change needed` when the task's diff is empty, or a `blocked` entry carrying the diagnosis when the task stops the run. Emit a one-line chat summary for the task.

7. **Write the report.** Once all implicit tasks have run (or the run stopped early per `## Blocked`), write this folder's report per `## Implementation report`.

8. **Commit the report.** With the report written, you make the closing report commit yourself by following `<skill_path>/references/instructions/commit-the-implementation-report.md`, at every terminal outcome step 7 was reached from. Skip it only when the invocation carries an explicit suppression instruction per `## Commit Policy`; the report then stays uncommitted and the terminal outcome reason carries the instruction's uncommitted marker. A closing report commit that fails past its cap never routes through `## Blocked` and never changes the token the run's work earned.

9. **Final out-message.** Once the report is written and committed, or left uncommitted, emit a short final message that says only whether the report is worth opening. It carries, in this order:
   - one sentence of outcome;
   - how many deviations and how many judgment calls the report records;
   - any discovery with parent-level impact surfaced per `## Discoveries`;
   - the report path;
   - the closing report commit's SHA and subject, or that the report was left uncommitted, and why;
   - then the terminal outcome line: follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `<report path>` when the requested operation completed, including completion with non-blocking concerns; `<diagnosis or bundle path>` when substantive execution began but could not finish (per `## Blocked`); `<reason>` when preflight prevented execution (steps 1–3).

   The message restates no progress entry and no report section: no per-task list, no commit list, no list of skipped tasks. A preflight refusal writes no report, so its message keeps to the reason and how to re-invoke.

## Run workspace

Keep all operational progress for a run inside this invocation's implementation folder:

```text
implementations/<yymmddhhmm>[-<slug>]/.runs/progress.md
```

Create `.runs/` inside the folder allocated per `## Implementation folder` and name the progress file `progress.md`. Write to it only by appending typed entries per `## Run progress file` as the run proceeds, so an interrupted run leaves everything it had reached. Recovery within an invocation, after a compaction or any other loss of context, re-derives the task list from the input, reads this folder's own `.runs/progress.md` together with `git log`, and resumes after the last `done` entry; it never reads another folder's run state.

`.runs/` is operational, not durable: no durable artifact — not the report, not a commit message, nothing — ever cites a path inside it. It stays in place after the run as the run's trace.

## Implementation report

At every terminal outcome an executing run reaches — completion, partial completion, a `BLOCKED` halt, or a no-op where the requested state already held — follow `<skill_path>/references/instructions/write-implementation-report.md` once, folding the report from the typed entries of `progress.md`, re-read from disk, together with `git log` for the commits the run made.

The report's acceptance rows are drawn from the spec's acceptance checklist, one row per criterion quoted verbatim; when the thread holds no spec, the criteria the plan or the input stated take their place. Each row's method and evidence come from the `check` entries, the ledger's commits and the code as it stands at the end of the run.

`deviation` entries go to `## Deviations`. `judgment` entries go to `## Judgment calls`, and never to `## Deviations`. `concern` entries go to `## Remaining concerns`.

## Deviations

The policy is judgment-based and surfaced through the progress file and the report — not pre-clearance, not blanket permission.

- **Follow the input or the implicit task list derived from it.** The input is the contract; the implicit task list is the implementer's interpretation. Do not silently invent tasks the input does not call for. Do not silently skip tasks the input does call for.
- **Use judgment when warranted.** If the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the input's intent. A blocked import path, a missing helper the input assumed existed, a renamed dependency the input did not know about: fix and continue.
- **A deviation that stays within accepted intent proceeds, and is recorded.** It is appended as a `deviation` entry as it happens, and lands in the report's `## Deviations`, one entry naming what was built, the spec section or the decision record stem it departs from, and why. A minor deviation (a missing import added) carries a one-sentence entry and the run continues.
- **A judgment call is not a deviation.** A choice made where the input pins nothing — inside a granted degree of freedom or in the input's silence, such as a `Map` chosen where the input named no structure — departs from nothing; it is appended as a `judgment` entry and lands in the report's `## Judgment calls`, never in `## Deviations`. This run is autonomous; it does not stop to pre-clear either, and the progress file and the report are where the user reads the trail.
- **A contradiction of a delta document or of a spec decision is a change of intent, and is never applied.** Finish everything safely derivable without it, then route it per `## Blocked`: the run ends `BLOCKED` once the report is written.
- **Never edit the input to justify the run.** If you discover the input itself is wrong — a step contradicts the observed code, a settled decision names a change already applied — append it as a `concern` entry, or as a `blocked` entry when it stops the run, so the report carries it, and let the surrounding session decide. You author no new such artifact inside this run, and you write only what the write boundary in `## Discoveries` allows.

## Discoveries

**A discovery with parent- or sibling-level impact** — something that would change a project decision, or that belongs to a direction wider than this thread — is appended as a `discovery` entry, surfaced to the user in chat, and reported under the report's `## Follow-ups`. It is never drafted as a decision record, a delta document or a roadmap entry; surfacing and reporting it is the whole action.

**Write boundary.** You write the project's code, tests, configuration and living documentation within this implementation's scope, plus this invocation's implementation folder with its `report.md` and its `.runs/`. You write nothing in the project layer — `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, every agents file (each `AGENTS.md` or `CLAUDE.md` in the project) and `.work/roadmaps/` — and nothing in `spec.md` or `delta/`, `plans/`, other implementation folders or any other thread; all of those are read here and never written.

**No thread reference in what you deliver.** Code, comments, test names and migrations carry no thread path and no reference to a thread artifact — no task number, no criterion text as a label, no plan or report path — and a test is named for the behavior it proves. Follow `<skill_path>/references/instructions/read-and-cite-the-project-layer.md` for the form each kind is cited by.

## Blocked

Three situations stop the run once substantive execution has begun (step 4 onward), and all three end `BLOCKED`. None is reachable from preflight — an invocation, input, or tooling failure caught in steps 1–3 is a `REFUSED`, not this path. Distinguish a genuine missing-intent question, a change of intent, and an operational defect before choosing between them.

**Missing human intent.** This applies whenever completing an implicit task requires a genuine human decision you cannot settle yourself from the gathered inputs and the observed code state. Per the run's autonomous posture, do not invent the intent and do not stall waiting in chat.

**A change of intent.** This applies to a contradiction of a delta document or of a spec decision, per `## Deviations`. An unnoticed conflict between the implementation's material and a project decision record or a project glossary term is the same situation: classify it as `/consult-decisions` instructs, and route it here rather than overriding the project record.

Both take the same route. First finish everything the run can safely derive without the decision, then write the report per `## Implementation report` reflecting the blocked outcome, commit it (`## Procedure`, step 8), and follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, this invocation's implementation folder's `report.md` as the target, and the originating user request. Then stop with a concise notification naming where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`.

**Operational defect.** An unfixable in-run failure the run cannot repair on its own — an exhausted commit retry (per `### Failed commit`), an inaccessible external dependency, a runtime failure, or malformed input detail not caught by preflight and discovered only during lazy execution — ends the run `BLOCKED` with a diagnosis and NO decision bundle. Finish any safe work first, write the report per `## Implementation report`, commit it (`## Procedure`, step 8), and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and the diagnosis. A structural input problem that preflight should have caught is a preflight `REFUSED`, not this path.

## Commit Policy

This skill auto-commits.

- **Default cadence:** ONE commit per implicit task. The boundary is the implicit task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple implicit tasks into one commit. Do not split one implicit task across multiple commits.
- **Override cadence:** When the user's invocation contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default cadence. The user's explicit instruction wins.
- **Judgment:** When the implicit task list is one task (a fully-resolved input), the default cadence and "one commit at the end" produce the same outcome — one commit. When the implicit task list is many tasks, the default cadence is many commits.
- **Closing report commit:** the run's `report.md` is committed on its own at `## Procedure` step 8, after the last task commit has landed, and stands outside the task cadence. An explicit instruction reaches it according to its kind: a **suppression** instruction ("do not commit, just leave the changes staged") suppresses the closing report commit too, and the terminal outcome reason then carries the uncommitted marker; a **cadence** instruction ("commit at the end as one commit", "make one commit per file touched") does not reach it, because the closing report commit is not a member of the code commit cadence — such a run makes the instructed code commits plus the closing report commit.
- **Baseline gate (before each commit):** A task's self-review confirms THAT task's objective; it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the self-review and this clause is a no-op. When the project DOES define standing gates, run them on the changed code and resolve any failure BEFORE committing the task — even when the task's own verification omits it. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this task. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.

Commits use the project's conventional-commit shape where applicable. Stage only the files the implicit task touched — the closing report commit stages the report alone; never run `git add -A` blindly. A commit message explains the change concisely in its own words, may name the thread path once as provenance, and never carries a task number, a criterion, a progress entry or a thread artifact as the explanation; the subject describes the implicit task's objective, not its substeps. Follow `<skill_path>/references/instructions/read-and-cite-the-project-layer.md` for that form.

### Failed commit

A failed task commit is diagnosed and fixed within the current task before it is ever treated as blocking — it is not an automatic halt. The closing report commit carries its own failure handling and never reaches `## Blocked`.

- **Diagnose first.** Read the actual error the commit emitted; never retry blind. What failed — a pre-commit hook, a lint or format check, a test, a commit-message linter, a missing sign-off — determines whether it is yours to fix.
- **Fix in-authority causes as part of the current task.** When the cause sits inside the task's own footprint — a lint or format violation in the task's files, a hook that auto-modified files that now need re-staging, a test the task's own diff broke, a commit subject a message linter rejected — fix it, re-run the failed check, and retry the commit.
- **Bounded retries.** Make at most 3 fix-and-retry attempts for the task. Past the cap, or when the cause is outside the task's authority (missing sign-off configuration, credentials, failures in files the task does not own, infrastructure errors), the run has hit an operational defect: append a `blocked` entry carrying the diagnosis — the specific failure and what was tried, not a bare "commit failed" — and stop the entire run `BLOCKED` per `## Blocked`. Subsequent implicit tasks are NOT attempted.
- **Guardrails (never traded for a green commit).** Never bypass hooks (`--no-verify` or any equivalent), never weaken, delete, or skip a check to make it pass, and never stash-and-retry. A fix addresses the real cause inside the task's footprint, or the run stops `BLOCKED`.
- **Audit trail.** A retry that succeeds leaves no entry: a failure fixed within the task before its commit is not recorded. Only a run that stops on the failed commit records it, in the `blocked` entry above.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase in any form, does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.
