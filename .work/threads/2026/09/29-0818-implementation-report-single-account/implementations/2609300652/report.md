# Implementation report

Plan: plans/2609300639/

## Outcome

All six plan tasks completed, each in its own commit. `implement-plan` is gone from the suite. The implementation-report format and its writing instruction now have the new section order, a `## Judgment calls` section, a `## Changes` task ledger and exception-only verification. `implement` and `implement-plan-with-subagents` record their runs as typed one-line progress entries, resume from earlier reports' ledgers, and end with a final message that restates nothing. The implementer outcome file is gone. `review-implementation` reads the reshaped report. No deviation from the spec. A few judgment calls and non-blocking concerns are listed below.

## Changes

- Removal of `implement-plan` (2e9e27f): deleted `suite/skills/implement/implement-plan/`, and removed its entries from `.claude-plugin/marketplace.json`, `suite/shared/manifest.yaml`, `.vscode/settings.json` (`conventionalCommits.scopes`) and `README.md` (`### Implement`).
- Report format and writing instruction (ddf66f3): `suite/shared/references/formats/implementation-report.md` and `suite/shared/references/instructions/write-implementation-report.md`, mirrored by `node scripts/sync-shared-references.mjs` into `close-thread`, `implement`, `implement-plan-with-subagents`, `review-implementation` and `review-code`.
- `implement` (49a73c2): `suite/skills/implement/implement/SKILL.md`, covering the run progress file, resume, report fold and final message.
- `implement-plan-with-subagents`, progress and final message (23b28ab): `suite/skills/implement/implement-plan-with-subagents/SKILL.md`. `## Factual progress records` is replaced by `## Run progress file`.
- `implement-plan-with-subagents`, implementer handoff (1248ea1): the same file. The outcome-file template, its path and every read of it are removed. The implementer reply now carries assumptions, known risks and skipped checks.
- `review-implementation` (b71790a): `suite/skills/review/review-implementation/SKILL.md`, covering `## Inputs` and `## The report is the claim under test`.

## Verification

- Before every commit, from `suite/`: `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`. Both passed each time.
- Each task's own verification block ran and passed: the `rg` and `grep` checks, the `jq` validity checks, and the section-order and entry-type checks.
- Against the final state, compared with the pre-change commit 1e5e372:
  - `close-thread/SKILL.md`, everything under `cli/`, `suite/AGENTS.md` and `docs/glossary.md` are unchanged.
  - `rg -n --hidden -P 'implement-plan(?!-with)'` (excluding `.work/`, `cli/`, `.git/`) finds only the `suite/AGENTS.md` layout line that `delta/suite/AGENTS.md` lands at close.
  - `node scripts/sync-shared-references.mjs` leaves `git status` clean, so every mirror matches its source.
- No check was skipped.

## Acceptance

| Criterion | Method | Evidence |
| --- | --- | --- |
| `suite/skills/implement/implement-plan/` no longer exists. | manual check | `test ! -e suite/skills/implement/implement-plan` succeeds. |
| No file outside `cli/` and `.work/` names `implement-plan` as a skill. | manual check | The `rg` sweep finds only the `suite/AGENTS.md:35` layout line. `delta/suite/AGENTS.md` lands it at close, and the plan barred editing it by hand. |
| `.claude-plugin/marketplace.json`, `suite/shared/manifest.yaml` and `.vscode/settings.json` carry no `implement-plan` entry, while their `implement-plan-with-subagents` entries remain. | manual check | `grep -c implement-plan` gives 1 in each file, and that one hit is the `-with-subagents` entry. The `jq` checks pass. |
| `README.md` has no `implement-plan` section under `### Implement`, and still has the `implement` and `implement-plan-with-subagents` sections. | manual check | The `####` headings under `### Implement` are only `implement` and `implement-plan-with-subagents`. |
| `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`, run from `suite/`, both pass. | automated test | Both exit 0 on the final state. |
| Every mirrored copy of the implementation-report format and of the report-writing instruction matches its canonical source after `node scripts/sync-shared-references.mjs`. | automated test | After running the sync script on the final state, `git status --porcelain` prints nothing. |
| The implementation-report format orders its sections as `Plan:`, `## Outcome`, `## Deviations`, `## Judgment calls`, `## Changes`, `## Verification`, `## Acceptance`, `## Remaining concerns`, `## Follow-ups`. | code review | In the format's shape block the headings appear in exactly this order, before `## Rules`. |
| The format marks `## Deviations`, `## Judgment calls`, `## Remaining concerns` and `## Follow-ups` as optional sections left out when empty, and `Plan:`, `## Outcome`, `## Changes`, `## Verification` and `## Acceptance` as always present. | code review | Stated in the format's `## Rules`. The task's reviewer confirmed it. |
| The format defines `## Outcome` as one or two sentences saying whether the run completed or at which task it stopped and why, and for a no-op, that the requested state already held and how that was checked. | code review | The format's shape and rules. The task's reviewer confirmed it. |
| The format defines a judgment-call entry as naming the choice, the degree of freedom or the silence it filled, and why, and states that a judgment call is never recorded under `## Deviations`. | code review | The format's `## Judgment calls` entry shape and its rule. |
| The format defines `## Changes` as a task ledger of one line per task the run covered, carrying the plan task's ordinal and index title or the implicit task's one-line description, then its commit or one of `not run`, `blocked`, `already done`, `no change needed`, plus a pointer to each deviation or judgment call it carries. | code review | The format's ledger shape and rules. The states `already done` and `no change needed` are present. |
| The format states that a ledger line never describes a task that followed its brief. | code review | The format's ledger rule. |
| The format defines `## Verification` as the checks run against the final state plus every failed or deliberately skipped check with its reason, and states that a passed per-task check is not listed. | code review | The format's `## Verification` rule. |
| The report-writing instruction folds the report from the progress file's typed entries and names the section each entry type feeds. | code review | The instruction maps each of the eight types, in backticks, to its section. |
| In `implement` and `implement-plan-with-subagents`, the run progress file is described as append-only typed one-line entries of the types `done`, `blocked`, `deviation`, `judgment`, `concern`, `check`, `discovery` and `follow-up`, and neither skill describes a per-task progress block. | code review | `implement` defines them in its `## Run progress file` material, and `implement-plan-with-subagents` in `## Run progress file`. The old progress-block terms return no hits. |
| Neither `implement` nor `implement-plan-with-subagents` records reply tokens, dispatch counts or fix-iteration counts in the progress file. | code review | `implement-plan-with-subagents` `## Run progress file` says the file carries "no reply tokens or lane verdicts, no dispatch counts, no fix-iteration counts". `implement` says it carries "no status or return token, and no tally of dispatches, fix attempts or commit retries". |
| Both skills state that recovery within an invocation resumes after the last `done` entry of the progress file, read together with `git log`. | code review | `implement` `## Run workspace`. The compaction-recovery bullet in `implement-plan-with-subagents`. |
| Both skills take earlier reports of the same plan as the only cross-invocation resume source, reading their ledgers and verifying each completed task against the code. | code review | `ledger` appears in `## Inputs` and step 5 of both skills. |
| Both skills' final message carries one sentence of outcome, the counts of deviations and judgment calls, any parent-level discovery, the report path and the closing report commit or why the report stayed uncommitted, then the terminal outcome line, and restates no progress entry and no report section. | code review | The final-message step in each skill. `implement` step 9 and `implement-plan-with-subagents` step 9 both say "The message restates no progress entry and no report section". |
| `implement-plan-with-subagents` defines no implementer outcome file: no template, no output path, and no step reading one. | automated test | `rg 'outcome file\|outcome-file\|implementer-outcome\|Implementer Outcome'` over the skill folder returns nothing. |
| The implementer brief in `implement-plan-with-subagents` asks for assumptions, known risks and deliberately skipped checks in the reply, within the 15-line reply ceiling. | code review | `### Implementer subagent` Return contract and `### Reply shape and cap`. |
| The orchestrator in `implement-plan-with-subagents` injects the implementer's reported assumptions and known risks unclassified into the reviewer brief. | code review | Steps 6a, 6b and 6c, `### Brief-construction rules` and `### Merged reviewer subagent` each name the reply as the source, unclassified. |
| The merged reviewer in `implement-plan-with-subagents` still writes its findings file under `.runs/task-NN/`, and a fix implementer still receives it by path. | code review | `SS-review.md` matches the reviewer output path and the step 6c fix brief. |
| `review-implementation` locates the delivered code through the report ledger's commits and tests each ledger line against the code. | code review | `## Inputs` and the ledger paragraph of `## The report is the claim under test`. |
| `review-implementation` tests each `## Judgment calls` entry against the spec, and treats an entry departing from something the spec pins as a finding. | code review | The `## Judgment calls` paragraph of `## The report is the claim under test`. |
| `close-thread` is unchanged. | automated test | `git diff --quiet 1e5e372 -- suite/skills/close/close-thread/SKILL.md` exits 0. Only its mirrored report-format copy was regenerated, as the plan's Task 2 lists. |
| No file under `cli/` is modified. | automated test | `git diff --name-only 1e5e372 -- cli` and `git status --porcelain -- cli` print nothing. |

## Remaining concerns

- `implement` cannot use the literal words "reply tokens, dispatch counts or fix-iteration counts". The plan's brief asked the text to say them, but its own verification forbids them, so the text reads "no status or return token, and no tally of dispatches, fix attempts or commit retries". The meaning is the same. The two skills now word this rule differently.
- "Resume after the last `done` entry" can skip a task. Both skills follow the spec's wording, but the resume step appends `done` entries up front for tasks that earlier ledgers mark completed. Such an entry can come after a task this run still has to do, so a literal reading would skip that task after a compaction. "Resume at the first task with no `done` or `blocked` entry" would close the gap.
- Neither implement skill says when a run appends a `check` or a `follow-up` entry, yet the report folds `## Verification` and acceptance evidence from `check` entries.
- In `implement-plan-with-subagents`, the implementer Scope bullet still places the findings file under `.runs/`, while step 6c places it under `.runs/task-NN/`.
- Judgment calls made during the run. They are recorded here because this run's own report format predates the `## Judgment calls` section:
  - In `implement` and `implement-plan-with-subagents`, the `Map` example moved out of the minor-deviation example into a new "a judgment call is not a deviation" bullet. This fills the spec's silence on where judgment calls are described, in line with the glossary.
  - `implement`'s commit-failure path defers to the next step, so a stopped task gets exactly one `blocked` entry. Recovery re-derives the task list from the input, because the list is no longer stored.
  - In `implement-plan-with-subagents`, fix-iteration counts stay in the orchestrator's working state and are rebuilt from the per-task review files after a compaction. This fills the silence on how the fix loop survives compaction once counts leave the progress file.
  - A plan fault in `implement-plan-with-subagents` `## Deviations` is recorded as a `blocked` entry, because it routes to `## Blocked`.

## Follow-ups

- `cli/` still names `implement-plan` in `cli/src/pipeline/catalog.ts`, `cli/src/pipeline/stage-id.ts`, their tests, `cli/README.md`, `cli/AGENTS.md` and its demo and scenario scripts. The CLI is on hold, so this is left for the realignment `[contract]` thread.
- Three places outside this change's scope still read the old shape:
  - `suite/authoring/interaction-posture.md` (`## Internal progress and local return tokens`) describes progress as per-task fields.
  - `suite/skills/review/review-code/SKILL.md` reads `## Changes` as the place that locates the code.
  - `suite/shared/references/instructions/search-for-thread-references.md` reads the files `## Changes` names.
- The resume wording and the missing point for appending `check` and `follow-up` entries, both under `## Remaining concerns`, could be settled in the spec and both implement skills.
