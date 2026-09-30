### Task 5: Drop the implementer outcome file

**Objective:** Remove the implementer outcome file from `implement-plan-with-subagents`, so the implementer's assumptions, known risks and deliberately skipped checks travel in its reply. From there they go unclassified into the reviewer brief and into the run progress file.

**Input / context:**
- `spec.md`, `### The implementer handoff`, is the authority. Its inferences are settled for this plan:
  - the 15-line reply ceiling stays, with one line per assumption, risk or skipped check counted within it;
  - skipped checks travel in the reply;
  - the `SS` dispatch ordinal stays shared across roles, and gaps are normal.
- `spec.md`, `## Scope and non-scope`: the merged reviewer's findings file and the fix loop are unchanged.
- Task 4 produced the run-progress-file section of `suite/skills/implement/implement-plan-with-subagents/SKILL.md`, with its eight entry types.
- These places in that file mention the outcome file today:
  - `## Subagent return contracts (skill-local)`: validation "and the outcome file read from disk";
  - `## Procedure` step 6a: the pre-computed outcome-file path, writing and reading the file, and carrying forward its `Assumptions` / `Known risks`;
  - step 6b's injection sentence;
  - step 6c: the next outcome-file path, and "if it wrote its own outcome file";
  - `## Run workspace`: the `01-implementer-outcome.md` tree line and the write-once bullet;
  - `### Brief-construction rules`: "surfaced `Assumptions` / `Known risks`";
  - `### Reply shape and cap`: the concerns flag, and the scratch-file path;
  - `### Implementer subagent`: the scope, the output path, the return contract's "recording any such runs in the outcome file's `Validation` `Ran` bucket", and the outcome-file content bullet;
  - the **Pinned outcome-file template** block;
  - `### Merged reviewer subagent`: the scope's injection sentence.
- `suite/skills/implement/implement-plan-with-subagents/references/reviewer-policy.md` (`### Assess supplied assumptions`) already expects assumptions and known risks injected unclassified. It is a skill-local, hand-authored reference and needs no edit. Confirm this, and edit it only if it names the outcome file, which it does not today.
- Starts from Task 4's committed state.

**Steps:**
1. Delete the **Pinned outcome-file template** paragraph and its fenced template block from `### Implementer subagent`.
2. Delete the **Outcome-file content (when written)** bullet from `### Implementer subagent`.
3. Rewrite `### Implementer subagent`'s **Output path** bullet. The implementer writes code changes directly to the working tree at the paths the brief's `Files modified` list names, and writes no other file.
4. Rewrite `### Implementer subagent`'s **Return contract** bullet. The reply lists the modified files, then one line per assumption it made, one line per known risk the diff alone would not reveal, and one line per check it deliberately skipped with the reason, all within the 15-line ceiling. It closes with the one reply token and a 1–3 sentence summary. The implementer still runs the project's standing gates before claiming `DONE`. Drop the clause about recording them in an outcome file's `Validation` bucket.
5. Rewrite `### Reply shape and cap`. The fixed shape has these parts, under the unchanged HARD CEILING of 15 lines:
   - the routing token or tokens;
   - files touched;
   - a one-line verification result;
   - for the implementer, one line per assumption, known risk and deliberately skipped check;
   - for the merged reviewer, the `SS-review.md` path if one was written.

   Remove the concerns-flag bullet.
6. In `## Subagent return contracts (skill-local)`, validate implementer replies against the working tree (`git status --porcelain`, `git diff`) only. Remove "and the outcome file read from disk".
7. Rewrite step 6a:
   - drop the outcome-file path from the brief;
   - drop the outcome-file writing and reading;
   - the orchestrator takes the assumptions and known risks from the implementer's reply, and passes them unclassified into the merged reviewer brief of this dispatch's review pass.

   Add a sentence recording each reported item as its matching progress entry:
   - an assumption becomes a `judgment` entry where the brief and spec pin nothing at that point, or a `deviation` entry where it departs from something pinned;
   - a known risk becomes a `concern` entry;
   - a deliberately skipped check becomes a `check` entry with its reason.
8. Rewrite step 6b's and `### Merged reviewer subagent`'s injection sentences to say "the assumptions and known risks the implementer reported in its reply", still unclassified. Rewrite `### Brief-construction rules` the same way.
9. Rewrite step 6c. The fix brief carries no outcome-file path. The fix implementer's reply is handled exactly as in step 6a: its assumptions and known risks go unclassified into the re-review brief, and each is recorded as a progress entry. The findings file (`SS-review.md` under `.runs/task-NN/`) is still passed to the fix implementer by path.
10. Rewrite `## Run workspace`:
    - remove the `01-implementer-outcome.md` line from the tree, and show `SS-review.md` as the only per-dispatch file;
    - the write-once bullet names only the merged reviewer's `SS-review.md`;
    - the `SS` bullet keeps `SS` shared across roles and assigned at dispatch time, and states that gaps are normal because implementer dispatches write no file and a clean review writes none.
11. Search `suite/skills/implement/implement-plan-with-subagents/` for any remaining `outcome file`, `outcome-file` or `implementer-outcome` mention, and remove or rewrite each one consistently with the steps above.
12. From `suite/`, run `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/implement/implement-plan-with-subagents/SKILL.md`
- `suite/skills/implement/implement-plan-with-subagents/references/reviewer-policy.md`, only if step 11's search finds an outcome-file mention there. None is expected.

**Verification:**
- `rg -n -i 'outcome file|outcome-file|implementer-outcome|Implementer Outcome' suite/skills/implement/implement-plan-with-subagents/` prints nothing.
- `rg -n '15 lines' suite/skills/implement/implement-plan-with-subagents/SKILL.md` matches `### Reply shape and cap`, and the implementer's return contract names assumptions, known risks and deliberately skipped checks.
- `rg -n -i 'unclassified' suite/skills/implement/implement-plan-with-subagents/SKILL.md` matches in step 6a or 6b, in `### Brief-construction rules`, and in `### Merged reviewer subagent`. Each matching sentence names the implementer's reply as the source.
- `rg -n 'SS-review.md' suite/skills/implement/implement-plan-with-subagents/SKILL.md` matches the merged reviewer's output path under `.runs/task-NN/` and the fix brief's findings-file path.
- From `suite/`, `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` both exit 0.
- `git status --porcelain -- cli` prints nothing.

**Acceptance criteria:**
- `implement-plan-with-subagents` defines no implementer outcome file: no template, no output path, and no step reading one.
- The implementer brief in `implement-plan-with-subagents` asks for assumptions, known risks and deliberately skipped checks in the reply, within the 15-line reply ceiling.
- The orchestrator in `implement-plan-with-subagents` injects the implementer's reported assumptions and known risks unclassified into the reviewer brief.
- The merged reviewer in `implement-plan-with-subagents` still writes its findings file under `.runs/task-NN/`, and a fix implementer still receives it by path.
- Each assumption, known risk and skipped check an implementer reports is recorded as a `judgment` or `deviation`, `concern` or `check` progress entry.
- `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`, run from `suite/`, both pass.
- No file under `cli/` is modified.

**Consumes:** from Task 4, the run-progress-file section of `suite/skills/implement/implement-plan-with-subagents/SKILL.md` and its entry types `judgment`, `deviation`, `concern` and `check`.

**Produces:** none
