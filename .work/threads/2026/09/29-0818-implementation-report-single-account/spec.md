# Make the implementation report the single completion account

## Goal

After an implement run, the reader should need exactly one place to learn whether the work completed, where it departed from what was pinned, and what calls it made on its own: the implementation report. The report points to the plan instead of restating it. The final chat message only tells the reader whether the report is worth opening now. `implement-plan` is removed, so the reshaped completion account covers only the two implement skills that remain.

## Context

Today every implement skill ends with two overlapping accounts, both folded from the run progress file. The final chat message reprints every per-task progress block. For `implement-plan-with-subagents` that includes reply tokens, dispatch counts and fix-loop counts. The report's `## Changes` and `## Outcome` then mostly restate the plan index. Judgment calls have no home in the report format, so they are lost or pushed into `## Deviations`, which blurs the distinction `docs/glossary.md` draws between the two. The user reports never reading a report because of this clutter. What they wanted to know was whether the plan completed and whether there were deviations or judgment calls.

The ticket (`seed.md`) suggested compact run metadata such as the subagent spawn and fix-loop table might stay useful in chat. The discussion settled otherwise: dispatch counts and reply tokens leave the progress file, and the final chat message restates nothing (`log.md`).

The report has machine-like readers besides the user. `implement-plan-with-subagents` resumes a plan by reading earlier reports of the same plan to learn which tasks already completed. `review-implementation` finds the delivered code from the report's `## Changes` and tests every report section as a claim. `close-thread`'s currency check reads `## Deviations` as departures from the spec. The new shape keeps what each of them needs.

`implement-plan` was the single-agent executor for strict plans. Harnesses without subagent support are outside the suite's intended use, and reshaping the report for a skill the next thread would delete would be wasted work, so the removal happens here.

## Scope and non-scope

In scope:

- the implementation-report format and the instruction that writes the report;
- the run progress file, the report fold, the final chat message, and the resume-from-earlier-reports step in `implement` and `implement-plan-with-subagents`;
- dropping the implementer outcome file in `implement-plan-with-subagents`;
- how `review-implementation` reads the reshaped report;
- removing `implement-plan` from the suite and from every registration and mention outside `cli/` and `.work/`.

Out of scope:

- `cli/`, which is on hold. The CLI names `implement-plan` in `cli/src/pipeline/catalog.ts`, `cli/src/pipeline/stage-id.ts`, their tests, `cli/README.md`, `cli/AGENTS.md` and its demo and scenario scripts. That drift is recorded here and left for the realignment thread.
- `close-thread`, whose currency check keeps reading `## Deviations` only and needs no edit. *(Inference: the discussion's closing list, accepted without promotion.)*
- The merged reviewer, its lanes, its findings file, the fix loop, the commit policy and the per-task chat one-liner, all unchanged apart from what the implementer outcome file's removal touches.
- Thread history under `.work/`, which keeps naming `implement-plan` as it did at the time.

## Constraints

- Only `implement`, `implement-plan-with-subagents`, `review-implementation`, the report format and its writing instruction are reshaped, because only those remain once `implement-plan` is removed (`log.md`).
- Nothing under `cli/` is edited, per the root `AGENTS.md` rule that the CLI is on hold; the drift is named in this spec and carried into the report's follow-ups.
- The terminal outcome line stays exactly as the protocol defines it, because the CLI and every caller classify runs by it.
- The report still never cites a path under `.runs/`, and a report is still written at every terminal outcome an executing run reaches.
- The glossary distinction between a deviation and a judgment call holds in every report, because the closing currency check reads deviations as departures from the spec.
- Shared references are edited at their canonical source under `suite/shared/references/` and mirrored with `node scripts/sync-shared-references.mjs`. Both suite gates (`node scripts/check-marketplace-skills.mjs`, `node scripts/check-skill-text.mjs`) pass on the finished change (`suite/AGENTS.md`).

## The change

### The report format

`suite/shared/references/formats/implementation-report.md` is reshaped. Its sections, in order:

1. `Plan:`, unchanged.
2. `## Outcome`: one or two sentences saying whether the run completed, or at which task it stopped and why. A no-op says the requested state already held and how that was checked. *(Inference: the discussion's closing list, accepted without promotion.)*
3. `## Deviations`, optional: unchanged entry shape, departures from something pinned only.
4. `## Judgment calls`, new and optional. Each entry names the choice, the degree of freedom or the silence it filled, and why. *(Inference: the entry reads `<the choice> — fills <the degree of freedom or the spec's silence it filled> — <why>`, mirroring the deviation entry.)*
5. `## Changes`, the task ledger: one line per task the run covered. A plan task carries its ordinal and its title as the index gives it. An implicit task (no plan) carries a one-line description of what it did. Each line then gives the task's commit, or `not run` or `blocked`, plus a pointer to each deviation or judgment call it carries. A task that followed its brief is listed, never described. *(Inference: two more ledger states follow from the resume and no-op rules: `already done`, for a task an earlier report of the same plan carried, with the commit that report records; and `no change needed`, for a task whose requested state already held.)* *(Inference: the pointer names the entry by the task ordinal it carries, since both sections sit in the same report and entries carry no identifier of their own.)*
6. `## Verification`: only the checks run against the final state, such as the project's standing gates and whole-change suites or builds, plus every check that failed or was deliberately skipped, with its reason. A per-task check that passed is not listed, because every commit in the ledger passed the baseline gate by rule.
7. `## Acceptance`, unchanged: one row per spec criterion, quoted verbatim, with method and evidence.
8. `## Remaining concerns` and `## Follow-ups`, optional, unchanged. *(Inference: they keep their relative order at the end of the report, since the discussion moved only the two sections that answer the reader's first question.)*

Optional sections are left out entirely when empty, so a clean run reads as the outcome followed directly by the ledger. The term the ledger introduces is landed by `delta/docs/glossary.md`.

`suite/shared/references/instructions/write-implementation-report.md` is reshaped to match. The report is folded from the progress file's typed entries. Judgment calls go to `## Judgment calls` and never to `## Deviations`. `## Changes` is written as the ledger. `## Verification` is written by the exception rule above. The existing rules stay: never claim a check that was not run, and keep out transcripts, dispatch counts, fix-loop detail and `.runs/` paths.

### The run progress file

In both remaining skills, `.runs/progress.md` becomes an append-only file of typed one-line entries. It replaces the per-task factual progress blocks and the list of tasks to execute written at allocation. *(Inference: the task list goes too, because the plan index or the derived task list already gives the order, and recovery needs only the last `done` entry.)* The file exists to carry deviations, judgment calls and concerns through context compaction to the report written at the end. Reply tokens and dispatch counts leave it.

*(Inference: the entry types are `done`, carrying the task ordinal and its commit or `no change needed`; `blocked`, carrying the task ordinal and the diagnosis; `deviation`; `judgment`; `concern`; `check`, for a whole-change check run and for a failed or deliberately skipped check, with its result or reason; `discovery`; and `follow-up`. Each entry names its task ordinal where one applies. `check` is added beyond the discussion's closing list because `## Verification` is folded from this file and needs a source for failures and skips.)* *(Inference: an entry reads `- (<type>) <task ordinal, where one applies> <content>`, borrowing the shape of a thread log entry.)*

Recovery within an invocation reads the progress file and `git log` and resumes after the last `done` entry. *(Inference: the discussion's closing list, accepted without promotion.)*

### Resume from earlier reports

Across invocations, the only resume source is the ledger of each earlier report whose `Plan:` line names the same plan folder. A task a ledger records with a commit, or as `already done` or `no change needed`, counts as completed once it is verified against the code. A task the code does not carry is implemented in this run, and the discrepancy is recorded as a `concern` entry. *(Inference: the discussion's closing list, accepted without promotion; it replaces reading each report for "completed tasks" with reading its ledger.)*

### The final chat message

In both remaining skills, the final message restates nothing from the report. It gives one sentence of outcome, the number of deviations and judgment calls the report records, any discovery with parent-level impact, the report path and the closing report commit (or that the report was left uncommitted, and why), and then the terminal outcome line. A preflight refusal writes no report and keeps its current message: the reason and how to re-invoke. *(Inference: preflight runs are untouched by this change, since no report exists for them to point at.)*

### The implementer handoff

In `implement-plan-with-subagents`, the implementer subagent no longer writes an outcome file. The pinned outcome-file template, the outcome-file output path and every reference to reading that file are removed. The implementer's reply carries its assumptions, its known risks and any check it deliberately skipped. The orchestrator passes the assumptions and known risks, unclassified, into the reviewer brief, and records each as the matching progress entry. *(Inference: the reply's 15-line ceiling stays, with one line per assumption, risk or skipped check counted within it, because the discussion kept the content in the reply on the ground that it is small.)* *(Inference: skipped checks travel in the reply too, since the outcome file's `Not run` bucket was their only other carrier.)*

The merged reviewer keeps writing its findings file at `.runs/task-NN/SS-review.md`, and a fix implementer still receives it by path. *(Inference: the `SS` dispatch ordinal stays shared across roles, so gaps where an implementer dispatch wrote nothing are normal, as they already are.)*

### The fidelity review

`review-implementation` reads the reshaped report. It finds the delivered code through the ledger's commits. It tests each ledger line as a claim: the commit exists and carries that task's change, and a `not run`, `blocked`, `already done` or `no change needed` state is borne out by the code. It tests each `## Judgment calls` entry as a claim that the spec pinned nothing at that point; an entry departing from something the spec pins is a finding, as an undeclared deviation. It tests `## Verification` against the rule that failures and skips are listed. *(Inference: testing the new sections follows the review's existing rule that every report section is a claim under test.)*

### Removing `implement-plan`

The following are removed *(Inference: the discussion's closing list, accepted without promotion)*:

- `suite/skills/implement/implement-plan/`;
- its entry in the `skills` array of `.claude-plugin/marketplace.json`;
- its section under `### Implement` in `README.md`;
- its block in `suite/shared/manifest.yaml`;
- its scope in `conventionalCommits.scopes` in `.vscode/settings.json`;
- its name on the `implement/` line of the layout in `suite/AGENTS.md`, landed by `delta/suite/AGENTS.md`.

The `README.md` section for `implement-plan-with-subagents` stays and keeps stating that it needs a runtime supporting subagents.

## Acceptance

- `suite/skills/implement/implement-plan/` no longer exists.
- No file outside `cli/` and `.work/` names `implement-plan` as a skill.
- `.claude-plugin/marketplace.json`, `suite/shared/manifest.yaml` and `.vscode/settings.json` carry no `implement-plan` entry, while their `implement-plan-with-subagents` entries remain.
- `README.md` has no `implement-plan` section under `### Implement`, and still has the `implement` and `implement-plan-with-subagents` sections.
- `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`, run from `suite/`, both pass.
- Every mirrored copy of the implementation-report format and of the report-writing instruction matches its canonical source after `node scripts/sync-shared-references.mjs`.
- The implementation-report format orders its sections as `Plan:`, `## Outcome`, `## Deviations`, `## Judgment calls`, `## Changes`, `## Verification`, `## Acceptance`, `## Remaining concerns`, `## Follow-ups`.
- The format marks `## Deviations`, `## Judgment calls`, `## Remaining concerns` and `## Follow-ups` as optional sections left out when empty, and `Plan:`, `## Outcome`, `## Changes`, `## Verification` and `## Acceptance` as always present.
- The format defines `## Outcome` as one or two sentences saying whether the run completed or at which task it stopped and why, and for a no-op, that the requested state already held and how that was checked.
- The format defines a judgment-call entry as naming the choice, the degree of freedom or the silence it filled, and why, and states that a judgment call is never recorded under `## Deviations`.
- The format defines `## Changes` as a task ledger of one line per task the run covered, carrying the plan task's ordinal and index title or the implicit task's one-line description, then its commit or one of `not run`, `blocked`, `already done`, `no change needed`, plus a pointer to each deviation or judgment call it carries.
- The format states that a ledger line never describes a task that followed its brief.
- The format defines `## Verification` as the checks run against the final state plus every failed or deliberately skipped check with its reason, and states that a passed per-task check is not listed.
- The report-writing instruction folds the report from the progress file's typed entries and names the section each entry type feeds.
- In `implement` and `implement-plan-with-subagents`, the run progress file is described as append-only typed one-line entries of the types `done`, `blocked`, `deviation`, `judgment`, `concern`, `check`, `discovery` and `follow-up`, and neither skill describes a per-task progress block.
- Neither `implement` nor `implement-plan-with-subagents` records reply tokens, dispatch counts or fix-iteration counts in the progress file.
- Both skills state that recovery within an invocation resumes after the last `done` entry of the progress file, read together with `git log`.
- Both skills take earlier reports of the same plan as the only cross-invocation resume source, reading their ledgers and verifying each completed task against the code.
- Both skills' final message carries one sentence of outcome, the counts of deviations and judgment calls, any parent-level discovery, the report path and the closing report commit or why the report stayed uncommitted, then the terminal outcome line, and restates no progress entry and no report section.
- `implement-plan-with-subagents` defines no implementer outcome file: no template, no output path, and no step reading one.
- The implementer brief in `implement-plan-with-subagents` asks for assumptions, known risks and deliberately skipped checks in the reply, within the 15-line reply ceiling.
- The orchestrator in `implement-plan-with-subagents` injects the implementer's reported assumptions and known risks unclassified into the reviewer brief.
- The merged reviewer in `implement-plan-with-subagents` still writes its findings file under `.runs/task-NN/`, and a fix implementer still receives it by path.
- `review-implementation` locates the delivered code through the report ledger's commits and tests each ledger line against the code.
- `review-implementation` tests each `## Judgment calls` entry against the spec, and treats an entry departing from something the spec pins as a finding.
- `close-thread` is unchanged.
- No file under `cli/` is modified.

## Degrees of freedom

- The prose of the skill bodies, the format and the instruction, as long as every rule above is stated.
- Whether the ledger renders as a list or a table in the format's shape block.
- The exact wording of the final chat message's outcome sentence.
- How each skill's `## Procedure` steps are renumbered or merged once the progress blocks and the outcome file are gone.

## Inferences

- `## Outcome` reads as one or two sentences, and a no-op names the state that held and how it was checked. Shapes: The report format.
- A judgment-call entry reads `<the choice> — fills <the degree of freedom or the spec's silence it filled> — <why>`. Shapes: The report format.
- The ledger gains the states `already done` and `no change needed`. Shapes: The report format; Resume from earlier reports.
- A ledger pointer names its deviation or judgment call by task ordinal. Shapes: The report format.
- `## Remaining concerns` and `## Follow-ups` keep their place at the end. Shapes: The report format.
- The progress entry types are `done`, `blocked`, `deviation`, `judgment`, `concern`, `check`, `discovery` and `follow-up`, and `check` is added so that `## Verification` has a source. Shapes: The run progress file.
- A progress entry is shaped like a thread log entry. Shapes: The run progress file.
- Recovery within an invocation resumes after the last `done` entry. Shapes: The run progress file.
- The progress file no longer opens with the list of tasks to execute. Shapes: The run progress file.
- Earlier reports' ledgers are the only cross-invocation resume source, each completed task verified against the code. Shapes: Resume from earlier reports.
- A preflight refusal keeps its current final message. Shapes: The final chat message.
- The 15-line reply ceiling stays, with assumptions, risks and skipped checks counted within it. Shapes: The implementer handoff.
- Skipped checks travel in the implementer reply. Shapes: The implementer handoff.
- The `SS` dispatch ordinal stays shared across roles. Shapes: The implementer handoff.
- `review-implementation` tests the ledger, the judgment calls and the verification exceptions as claims. Shapes: The fidelity review.
- The `implement-plan` removal covers the skill folder, the marketplace entry, the README section, the manifest block, the commit scope and the `suite/AGENTS.md` layout line. Shapes: Removing `implement-plan`.
- `close-thread` needs no edit. Shapes: Scope and non-scope.

## Delta index

- `delta/docs/glossary.md` — edit
- `delta/suite/AGENTS.md` — edit
