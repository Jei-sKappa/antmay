### Task 3: Reshape the `implement` completion account

**Objective:** Make `implement` record its run as append-only typed progress entries, resume from earlier reports' ledgers, fold its report through the reshaped instruction, and end with a final message that only says whether the report is worth opening.

**Input / context:**
- These `spec.md` sections are the authority for what `implement` must now say:
  - `### The run progress file`
  - `### Resume from earlier reports`
  - `### The final chat message`
- `spec.md`, `## Degrees of freedom`, leaves open how `## Procedure` steps are renumbered or merged, and the exact wording of the final message's outcome sentence.
- `docs/glossary.md`, **deviation** and **judgment call**: a choice made where the input pins nothing is a judgment call, and is never a deviation.
- Task 2 produced the reshaped `suite/shared/references/formats/implementation-report.md` and `suite/shared/references/instructions/write-implementation-report.md`. Their mirrored copies are under `suite/skills/implement/implement/references/`. The entry-type names used below must match the instruction's names exactly.
- The file to reshape is `suite/skills/implement/implement/SKILL.md`. Today it defines per-task "factual progress blocks" in `## Factual progress records`, and refers to them from these places:
  - the opening paragraph;
  - `## Procedure` steps 4, 5, 6a, 6b, 6d and 9;
  - `## Run workspace`;
  - `## Implementation report`;
  - `## Deviations`;
  - `### Failed commit`.
- Out of scope, and left as they are: dirty-worktree handling, commit cadence, the baseline gate, history rules, the blocked paths' routing and every terminal outcome reason. The per-task one-line chat summary also stays.
- Starts from Task 2's committed state.

**Steps:**
1. Replace `## Factual progress records` with a section defining the run progress file. Keep a heading of your choice, for example `## Run progress file`. It must state:
   - `.runs/progress.md` is append-only, one typed entry per line, of the shape `- (<type>) <task ordinal, where one applies> <content>`, and it is never rewritten or reordered.
   - It exists to carry deviations, judgment calls and concerns through context compaction to the report written at the end.
   - It carries no per-task block, no list of tasks to execute, and no reply tokens, dispatch counts or fix-iteration counts.
   - The closed set of entry types, each with what it carries:
     - `done` — the task ordinal, then its commit (SHA and subject), `no change needed`, or `already done` with the commit an earlier report records.
     - `blocked` — the task ordinal and the diagnosis.
     - `deviation` — what was built, what it departs from, and why.
     - `judgment` — the choice, the degree of freedom or silence it filled, and why.
     - `concern` — a non-blocking concern, a known risk, or a discrepancy between an earlier report and the code.
     - `check` — a whole-change check run against the final state, with its result; or a check that failed and stayed unresolved, or was deliberately skipped, with its result or reason.
     - `discovery` — a discovery with parent- or sibling-level impact.
     - `follow-up` — work this implementation leaves for later.
   - An entry names its task ordinal wherever one applies. The implicit task's ordinal is its position in the derived task list.
   - A per-task check that passed is not recorded. A failure fixed within its task before the task's commit is not recorded either.
   - The per-task `### Failed commit` retry trail therefore leaves no entry, unless the run stops on it. In that case the `blocked` entry carries the diagnosis: the specific failure and what was tried.
2. Update the opening paragraph: replace "record a factual progress block per implicit task" with appending typed entries to the run progress file.
3. Rewrite `## Procedure` step 4 so the folder and its `.runs/progress.md` are allocated, with no task list recorded in it. The derived task list is re-derivable from the input and is not stored.
4. Rewrite step 5, and the matching `## Inputs` bullet on earlier reports. The only cross-invocation resume source is the `## Changes` ledger of each earlier report whose `Plan:` line names the same plan folder.
   - A task a ledger records with a commit, or as `already done` or `no change needed`, counts as completed once it is verified against the code. Record it as a `done` entry reading `already done` with that commit, or `no change needed`.
   - A task the ledger claims but the code does not carry is implemented in this run, and the discrepancy is recorded as a `concern` entry.
5. Rewrite steps 6a, 6b and 6d so that each task records only typed entries:
   - an applied deviation becomes a `deviation` entry as it happens;
   - self-review's assumptions and forced choices become `judgment` entries where the input pins nothing, or `deviation` entries where they depart from something pinned;
   - known risks become `concern` entries;
   - the task ends with one `done` entry after its commit, or `no change needed` for an empty diff, or a `blocked` entry when it stops the run;
   - the one-line chat summary per task stays.
6. Rewrite `## Run workspace`. The file is written by appending typed entries as the run proceeds. Recovery within an invocation reads `.runs/progress.md` together with `git log`, and resumes after the last `done` entry. It never reads another folder's run state.
7. Rewrite `## Implementation report` to follow `<skill_path>/references/instructions/write-implementation-report.md`, folding from `progress.md` re-read from disk together with `git log`:
   - the acceptance rows' method and evidence come from `check` entries, the ledger's commits and the code;
   - `judgment` entries go to `## Judgment calls` and never to `## Deviations`;
   - `concern` entries go to `## Remaining concerns`.

   Remove the sentence that folds assumptions and forced judgment calls into the deviations.
8. In `## Deviations` and `## Discoveries`, replace every mention of the factual progress block:
   - a deviation is recorded as a `deviation` entry;
   - a judgment call as a `judgment` entry;
   - a discovered input fault as a `concern` entry, or as a `blocked` entry when it stops the run;
   - a parent-level discovery as a `discovery` entry, still surfaced in chat.
9. In `### Failed commit`, rewrite the bounded-retries and audit-trail bullets to match step 1's rule: past the cap, record a `blocked` entry carrying the diagnosis; successful retries leave no entry.
10. Rewrite step 9, the final out-message. It carries, in this order:
    - one sentence of outcome;
    - how many deviations and how many judgment calls the report records;
    - any discovery with parent-level impact;
    - the report path;
    - the closing report commit's SHA and subject, or that the report was left uncommitted, and why;
    - then the terminal outcome line, following `<skill_path>/references/instructions/emit-terminal-outcome.md` with the same tokens and reasons as today.

    It restates no progress entry and no report section: no per-task list, no commit list, no skipped-task list. A preflight refusal writes no report and keeps its current message: the reason and how to re-invoke.
11. Renumber or merge `## Procedure` steps as needed, and fix every cross-reference to a step number (for example, "`## Procedure`, step 8") to point at the right step.
12. From `suite/`, run `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/implement/implement/SKILL.md`

**Verification:**
- `rg -n -i 'progress block|Commit: none|Next action' suite/skills/implement/implement/SKILL.md` prints nothing.
- `rg -n -i 'reply token|dispatch count|fix-iteration|fix iteration' suite/skills/implement/implement/SKILL.md` prints nothing.
- `for t in done blocked deviation judgment concern check discovery follow-up; do grep -q "\`$t\`" suite/skills/implement/implement/SKILL.md || echo "MISSING $t"; done` prints nothing.
- `grep -n 'last `done` entry' suite/skills/implement/implement/SKILL.md` matches, and the matching sentence also names `git log`.
- `grep -n 'ledger' suite/skills/implement/implement/SKILL.md` matches in both `## Inputs` and the resume step.
- `grep -n 'Judgment calls' suite/skills/implement/implement/SKILL.md` matches in `## Implementation report`.
- `grep -n 'Outcome: \|emit-terminal-outcome.md' suite/skills/implement/implement/SKILL.md` shows that the terminal outcome reasons (`<report path>`, `<diagnosis or bundle path>`, `<reason>`) are unchanged.
- From `suite/`, `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` both exit 0.
- `git status --porcelain -- cli` prints nothing.

**Acceptance criteria:**

The first five criteria below cover both remaining skills. This task delivers each of them for `implement`; Task 4 delivers them for `implement-plan-with-subagents`, which completes them.

- In `implement` and `implement-plan-with-subagents`, the run progress file is described as append-only typed one-line entries of the types `done`, `blocked`, `deviation`, `judgment`, `concern`, `check`, `discovery` and `follow-up`, and neither skill describes a per-task progress block.
- Neither `implement` nor `implement-plan-with-subagents` records reply tokens, dispatch counts or fix-iteration counts in the progress file.
- Both skills state that recovery within an invocation resumes after the last `done` entry of the progress file, read together with `git log`.
- Both skills take earlier reports of the same plan as the only cross-invocation resume source, reading their ledgers and verifying each completed task against the code.
- Both skills' final message carries one sentence of outcome, the counts of deviations and judgment calls, any parent-level discovery, the report path and the closing report commit or why the report stayed uncommitted, then the terminal outcome line, and restates no progress entry and no report section.
- `implement` sends judgment calls to `## Judgment calls` and never to `## Deviations`.
- The terminal outcome tokens and reasons `implement` emits are unchanged.
- `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`, run from `suite/`, both pass.
- No file under `cli/` is modified.

**Consumes:**
- From Task 2, the entry-type names `done`, `blocked`, `deviation`, `judgment`, `concern`, `check`, `discovery` and `follow-up`, as named in `suite/shared/references/instructions/write-implementation-report.md`.
- From Task 2, the ledger states `not run`, `blocked`, `already done` and `no change needed`, as defined in `suite/shared/references/formats/implementation-report.md`.

**Produces:** the run-progress-file definition in `suite/skills/implement/implement/SKILL.md`: entry shape, eight types, recovery rule and resume rule. Task 4 mirrors it into `implement-plan-with-subagents` so the two skills describe the file the same way.
