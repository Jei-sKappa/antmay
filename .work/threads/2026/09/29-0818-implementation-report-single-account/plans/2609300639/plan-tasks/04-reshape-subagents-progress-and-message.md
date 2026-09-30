### Task 4: Reshape the `implement-plan-with-subagents` completion account

**Objective:** Make the `implement-plan-with-subagents` orchestrator record its run as the same append-only typed progress entries as `implement`, resume from earlier reports' ledgers, fold its report through the reshaped instruction, and end with a final message that restates nothing.

**Input / context:**
- These `spec.md` sections are the authority:
  - `### The run progress file`
  - `### Resume from earlier reports`
  - `### The final chat message`
- `spec.md`, `## Scope and non-scope`, keeps these unchanged: the merged reviewer, its lanes, its findings file, the fix loop, the commit policy and the per-task chat one-liner.
- `spec.md`, `## Degrees of freedom`, leaves open step renumbering and the wording of the outcome sentence.
- Task 3 produced the run-progress-file definition in `suite/skills/implement/implement/SKILL.md`. Reuse its entry shape, its eight types and their meanings, its recovery rule and its resume rule. Adapt only what the orchestrator topology needs.
- The file to reshape is `suite/skills/implement/implement-plan-with-subagents/SKILL.md`. Today its per-task factual progress blocks are defined in `## Factual progress records`, and referred to from these places:
  - the opening paragraph;
  - `## Subagent return contracts (skill-local)`;
  - `## Procedure` steps 4, 5, 6a–6e, 7 and 9;
  - `## Run workspace`;
  - `## Implementation report`;
  - `## Deviations`;
  - `### Failed commit`.
- The implementer outcome file is **not** this task's concern: leave every outcome-file mention for Task 5. The one exception is the last paragraph of `## Implementation report`, which step 6 below rewrites whole.
- Starts from Task 3's committed state.

**Steps:**
1. Replace `## Factual progress records`, including its suggested block shape, with a run-progress-file section equivalent to Task 3's. It must state:
   - the `- (<type>) <task ordinal, where one applies> <content>` shape;
   - the same eight types and what each carries;
   - append-only, never rewritten;
   - no per-task block, no list of tasks to execute, and no reply tokens, dispatch counts or fix-iteration counts;
   - passed per-task checks, and failures fixed before the task's commit, are not recorded.

   Add one orchestrator-specific rule. The orchestrator writes every entry itself. A reviewer's non-blocking concern carried on a lane `PASS` becomes a `concern` entry. A `DONE_WITH_CONCERNS` concern becomes a `concern` entry. A reviewer-flagged deviation that is accepted becomes a `deviation` entry.
2. In `## Subagent return contracts (skill-local)`, replace "carried into the progress block" with recording a `concern` entry. For the empty-diff `DONE` path, replace "record the cycle with `Commit: none`" with recording a `done` entry reading `no change needed`. The return tokens and their routing stay unchanged.
3. Update the opening paragraph: replace "appends every attempted task's factual progress block to the run's progress file (cycle-gated, not commit-gated)" with appending typed entries to the run progress file.
4. Rewrite `## Procedure` step 4: allocate the folder, its `.runs/` and an empty `progress.md`, recording no task list. Rewrite step 5, the resume step, and the matching `## Inputs` bullet on earlier reports, the same way as Task 3:
   - the ledgers of earlier reports naming the same plan folder are the only cross-invocation resume source;
   - each task they record with a commit, `already done` or `no change needed` is verified against the code, then recorded as a `done` entry (`already done` with that commit, or `no change needed`);
   - a task the code does not carry is dispatched normally, with a `concern` entry naming the discrepancy.
5. In steps 6a–6e, replace every instruction to append a block, with or without `Commit: none`:
   - a committed cycle appends one `done` entry with the SHA and subject once the commit lands;
   - an empty-diff `DONE` appends a `done` entry reading `no change needed`;
   - each halt path appends one `blocked` entry carrying its diagnosis: a routed terminal token, a reviewer can't-assess escape, a non-converging fix loop described by its state, or a failed commit past the cap described by the specific failure and what was tried;
   - deviations, judgment calls and concerns the cycle surfaces are appended as their own entries as they arise.

   Keep "Emit ONE chat line for the task" unchanged. Keep "The orchestrator tracks fix iterations per verdict lane", but state that this count lives in the orchestrator's working state and is not recorded in the progress file. After a compaction, it is reconstructed from the task's `SS-review.md` files under `.runs/task-NN/`.
6. Rewrite `## Implementation report`:
   - the report follows `<skill_path>/references/instructions/write-implementation-report.md`;
   - it is folded from `progress.md` re-read from disk, together with `git log`;
   - the acceptance rows' method and evidence come from `check` entries, the ledger's commits and the code;
   - the deviations, judgment calls and concerns come from their progress entries, with `judgment` entries going to `## Judgment calls` and never to `## Deviations`.

   Keep the paragraph saying the per-task reviews are task-scoped gates, so the report is the broader review's starting point.
7. Rewrite `## Run workspace`'s progress-file bullets:
   - "append-only, one block per attempted task — cycle-gated" becomes "append-only typed entries";
   - drop the block-content bullet;
   - keep the chat one-line-per-task bullet;
   - compaction recovery reads `progress.md` together with `git log` and resumes after the last `done` entry. The task's `.runs/task-NN/` review files restore an in-flight fix loop.
8. In `## Deviations`, `## Discoveries` and `### Failed commit`, replace every factual-progress-block mention with the matching entry type, as Task 3 did. The audit-trail bullet becomes: successful retries leave no entry, and a stop past the cap leaves a `blocked` entry with the diagnosis.
9. Rewrite step 9, the final out-message. It carries, in this order:
   - one sentence of outcome;
   - the counts of deviations and judgment calls the report records;
   - any parent-level discovery;
   - the report path;
   - the closing report commit's SHA and subject, or that the report was left uncommitted, and why;
   - then the terminal outcome line, with the same tokens and reasons as today.

   It restates no progress entry and no report section: no per-task blocks, no subagent audit, no commit list, no skipped-task list. A preflight refusal keeps its current message.
10. Renumber or merge `## Procedure` steps as needed, and fix every cross-reference to a step number.
11. From `suite/`, run `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/implement/implement-plan-with-subagents/SKILL.md`

**Verification:**
- `rg -n -i 'progress block|Commit: none|Next action|Dispatches:|Reply tokens:|Fix iterations:|subagent audit' suite/skills/implement/implement-plan-with-subagents/SKILL.md` prints nothing.
- `rg -n -i 'progress block' suite/skills/implement/implement/SKILL.md suite/skills/implement/implement-plan-with-subagents/SKILL.md` prints nothing.
- `for f in suite/skills/implement/implement/SKILL.md suite/skills/implement/implement-plan-with-subagents/SKILL.md; do for t in done blocked deviation judgment concern check discovery follow-up; do grep -q "\`$t\`" "$f" || echo "MISSING $t in $f"; done; done` prints nothing.
- `grep -n 'last `done` entry' suite/skills/implement/implement-plan-with-subagents/SKILL.md` matches, and the matching sentence also names `git log`.
- `grep -n 'ledger' suite/skills/implement/implement-plan-with-subagents/SKILL.md` matches in both `## Inputs` and the resume step.
- The sentence in the progress-file section that lists what the file does not carry names reply tokens, dispatch counts and fix-iteration counts. Confirm by reading that section.
- `grep -n 'SS-review.md' suite/skills/implement/implement-plan-with-subagents/SKILL.md` still matches the merged reviewer's output path and the fix brief.
- From `suite/`, `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` both exit 0.
- `git status --porcelain -- cli` prints nothing.

**Acceptance criteria:**
- In `implement` and `implement-plan-with-subagents`, the run progress file is described as append-only typed one-line entries of the types `done`, `blocked`, `deviation`, `judgment`, `concern`, `check`, `discovery` and `follow-up`, and neither skill describes a per-task progress block.
- Neither `implement` nor `implement-plan-with-subagents` records reply tokens, dispatch counts or fix-iteration counts in the progress file.
- Both skills state that recovery within an invocation resumes after the last `done` entry of the progress file, read together with `git log`.
- Both skills take earlier reports of the same plan as the only cross-invocation resume source, reading their ledgers and verifying each completed task against the code.
- Both skills' final message carries one sentence of outcome, the counts of deviations and judgment calls, any parent-level discovery, the report path and the closing report commit or why the report stayed uncommitted, then the terminal outcome line, and restates no progress entry and no report section.
- The skill-local return tokens, the lane verdicts, the fix loop, the commit policy and the per-task chat one-liner are unchanged in meaning.
- `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`, run from `suite/`, both pass.
- No file under `cli/` is modified.

**Consumes:**
- From Task 3, the run-progress-file definition in `suite/skills/implement/implement/SKILL.md`: entry shape, eight types, recovery rule and resume rule.
- From Task 2, the report section and ledger-state names.

**Produces:** a run-progress-file section in `suite/skills/implement/implement-plan-with-subagents/SKILL.md` naming the eight entry types. Task 5 records the implementer's reported assumptions, known risks and skipped checks into it as `judgment`/`deviation`, `concern` and `check` entries.
