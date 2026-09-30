### Task 2: Reshape the report format and its writing instruction

**Objective:** Redefine the implementation report so that a reader learns completion, deviations and judgment calls from its top, and finds a ledger that points at the plan instead of restating it. Redefine the report-writing instruction so it folds that report from the run progress file's typed entries.

**Input / context:**
- `spec.md`, `### The report format`, is the authority for section order, which sections are optional, and each section's content. The inferences it marks are settled for this plan:
  - the judgment-call entry shape;
  - the ledger states `already done` and `no change needed`;
  - the ledger pointer by task ordinal;
  - `## Remaining concerns` and `## Follow-ups` staying at the end.
- `spec.md`, `### The run progress file`, gives the entry types this instruction maps to sections: `done`, `blocked`, `deviation`, `judgment`, `concern`, `check`, `discovery`, `follow-up`. It also gives the entry shape `- (<type>) <task ordinal, where one applies> <content>`.
- `spec.md`, `### Resume from earlier reports`: a task an earlier report already carried is recorded as a `done` entry reading `already done` with the commit that report records. Its ledger line reads `already done`.
- `delta/docs/glossary.md` adds the term **task ledger**, which the format's rules use. `docs/glossary.md` defines **deviation** and **judgment call**, and the format must keep them distinct.
- Canonical sources:
  - `suite/shared/references/formats/implementation-report.md`
  - `suite/shared/references/instructions/write-implementation-report.md`
- After Task 1, `suite/shared/manifest.yaml` mirrors the format into `close-thread`, `implement`, `implement-plan-with-subagents`, `review-implementation` and `review-code`. It mirrors the instruction into `implement` and `implement-plan-with-subagents`.
- Starts from Task 1's committed state.

**Steps:**
1. In `suite/shared/references/formats/implementation-report.md`, keep the title and the opening paragraph. Replace the `## Shape` block with the block below. This exact section order and these entry shapes are what the fidelity review and resume read, so do not reorder or rename anything:

   ````markdown
   # Implementation report

   Plan: plans/<yymmddhhmm>[-<slug>]/

   ## Outcome

   <one or two sentences: whether the run completed, or at which task it stopped and why>

   ## Deviations

   - Task <NN> — <what was built> — departs from <the spec section or the decision record stem> — <why>

   ## Judgment calls

   - Task <NN> — <the choice> — fills <the degree of freedom or the spec's silence it filled> — <why>

   ## Changes

   - <NN> <task title as the plan index gives it, or a one-line description of an implicit task> — <commit SHA and subject | not run | blocked | already done, <commit SHA and subject the earlier report records> | no change needed>[ — deviation][ — judgment call]

   ## Verification

   - <a check run against the final state, or a check that failed or was deliberately skipped> — <its result, or the reason>

   ## Acceptance

   | Criterion | Method | Evidence |
   | --- | --- | --- |
   | <one criterion of the spec, quoted verbatim> | <automated test \| manual check \| code review> | <the test name and file, or what was walked through and what was observed> |

   ## Remaining concerns

   - <something that holds but is not settled>

   ## Follow-ups

   - <work this implementation leaves for later>
   ````

   The fences above are indented only because they sit inside this list. In the format file, write the shape block with its fence lines at column 0.
2. In the same file, rewrite `## Rules`. It must state each of the following, in prose you choose:
   - The `Plan:` line names the plan folder executed, or reads `Plan: none`. This rule is unchanged.
   - `Plan:`, `## Outcome`, `## Changes`, `## Verification` and `## Acceptance` are always present.
   - `## Deviations`, `## Judgment calls`, `## Remaining concerns` and `## Follow-ups` are optional, and are left out entirely, heading included, when empty. A clean run therefore reads as the outcome followed directly by the ledger.
   - `## Outcome` is one or two sentences saying whether the run completed, or at which task it stopped and why. For a no-op it says that the requested state already held and how that was checked.
   - A deviation entry names what was built, the spec section or decision record stem it departs from, and why, and it departs from something pinned. A judgment-call entry names the choice, the degree of freedom or the spec's silence it filled, and why. A judgment call is never recorded under `## Deviations`. An entry opens with the task ordinal it belongs to (`Task <NN> —`) whenever it belongs to one.
   - `## Changes` is the task ledger: one line per task the run covered.
     - A plan task carries its ordinal and its title as the plan index gives it. An implicit task carries its ordinal in the derived task list and a one-line description of what it did.
     - Each line then gives the task's commit (SHA and subject), or one of `not run`, `blocked`, `already done` (with the commit the earlier report records) and `no change needed`.
     - A line ends with a pointer to each deviation or judgment call the task carries. The pointer names the kind, and the reader finds the entry by the task ordinal it opens with.
     - A ledger line never describes a task that followed its brief: such a task is listed, never described.
   - `## Verification` lists only the checks run against the final state (the project's standing gates, whole-change suites or builds), plus every check that failed or was deliberately skipped, with its result or reason. A per-task check that passed is not listed, because every commit in the ledger passed the baseline gate.
   - The `## Acceptance` rules and the no-spec rule stay as they are today.
   - The report cites durable artifacts by path, and never a path under `.runs/`. This rule is unchanged.
3. In `suite/shared/references/instructions/write-implementation-report.md`, keep the title, the opening paragraph and the `Plan:` sentence. Replace `## What the report folds in` so that it says the report is folded from the run progress file's typed entries, re-read from disk, together with `git log`. Name the section each entry type feeds:
   - `done` feeds a `## Changes` ledger line: the commit, `no change needed`, or `already done` with the earlier commit.
   - `blocked` feeds a `## Changes` line reading `blocked`, and `## Outcome` names that task and the diagnosis.
   - A task in the run's scope with neither a `done` nor a `blocked` entry is listed in `## Changes` as `not run`.
   - `deviation` feeds `## Deviations`.
   - `judgment` feeds `## Judgment calls`, and never `## Deviations`.
   - `concern` feeds `## Remaining concerns`.
   - `check` feeds `## Verification`.
   - `discovery` and `follow-up` feed `## Follow-ups`.
   - `## Acceptance` rows come from the spec's checklist, quoted verbatim. Their method and evidence come from the `check` entries, the ledger's commits, and the code as it stands at the end of the run.
4. In the same file, keep the paragraph that says partial, blocked and no-op outcomes are stated plainly. Align it with the one-or-two-sentence `## Outcome`. Then rewrite `## Rules` so that it keeps these rules:
   - never claim a check that was not run;
   - keep out of the report transcripts, reply tokens, dispatch counts, fix-loop detail and any path under `.runs/`;
   - `report.md` is the only file this act writes.

   Also add a rule that no progress entry is copied into the report verbatim as a log line: each is rewritten into its section's entry shape.
5. From `suite/`, run `node scripts/sync-shared-references.mjs`.
6. From `suite/`, run `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs`. Resolve any failure in the two canonical sources, then re-sync.

**Files modified:**
- `suite/shared/references/formats/implementation-report.md`
- `suite/shared/references/instructions/write-implementation-report.md`
- Mirrored copies, regenerated by the sync script and never hand-edited:
  - `suite/skills/close/close-thread/references/formats/implementation-report.md`
  - `suite/skills/implement/implement/references/formats/implementation-report.md`
  - `suite/skills/implement/implement/references/instructions/write-implementation-report.md`
  - `suite/skills/implement/implement-plan-with-subagents/references/formats/implementation-report.md`
  - `suite/skills/implement/implement-plan-with-subagents/references/instructions/write-implementation-report.md`
  - `suite/skills/review/review-implementation/references/formats/implementation-report.md`
  - `suite/skills/review/review-code/references/formats/implementation-report.md`

**Verification:**
- Section order: `grep -nE '^(Plan:|## )' suite/shared/references/formats/implementation-report.md` lists, inside the shape block and in this order, `Plan:`, `## Outcome`, `## Deviations`, `## Judgment calls`, `## Changes`, `## Verification`, `## Acceptance`, `## Remaining concerns`, `## Follow-ups`. The shape block is the first match run, before `## Rules`.
- Mirrors match their sources:
  - `for f in $(find suite/skills -path '*/references/formats/implementation-report.md'); do cmp "$f" suite/shared/references/formats/implementation-report.md || echo "DRIFT $f"; done` prints no `DRIFT` line.
  - The same loop with `instructions/write-implementation-report.md` prints no `DRIFT` line.
- `grep -c 'Judgment calls' suite/shared/references/instructions/write-implementation-report.md` is at least `1`.
- `for t in done blocked deviation judgment concern check discovery follow-up; do grep -q "\`$t\`" suite/shared/references/instructions/write-implementation-report.md || echo "MISSING $t"; done` prints nothing. Each entry type is named in backticks.
- `grep -n 'already done' suite/shared/references/formats/implementation-report.md` and `grep -n 'no change needed' suite/shared/references/formats/implementation-report.md` each match.
- From `suite/`, `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` both exit 0.
- `git status --porcelain -- cli suite/skills/close/close-thread/SKILL.md` prints nothing.

**Acceptance criteria:**
- Every mirrored copy of the implementation-report format and of the report-writing instruction matches its canonical source after `node scripts/sync-shared-references.mjs`.
- The implementation-report format orders its sections as `Plan:`, `## Outcome`, `## Deviations`, `## Judgment calls`, `## Changes`, `## Verification`, `## Acceptance`, `## Remaining concerns`, `## Follow-ups`.
- The format marks `## Deviations`, `## Judgment calls`, `## Remaining concerns` and `## Follow-ups` as optional sections left out when empty, and `Plan:`, `## Outcome`, `## Changes`, `## Verification` and `## Acceptance` as always present.
- The format defines `## Outcome` as one or two sentences saying whether the run completed or at which task it stopped and why, and for a no-op, that the requested state already held and how that was checked.
- The format defines a judgment-call entry as naming the choice, the degree of freedom or the silence it filled, and why, and states that a judgment call is never recorded under `## Deviations`.
- The format defines `## Changes` as a task ledger of one line per task the run covered, carrying the plan task's ordinal and index title or the implicit task's one-line description, then its commit or one of `not run`, `blocked`, `already done`, `no change needed`, plus a pointer to each deviation or judgment call it carries.
- The format states that a ledger line never describes a task that followed its brief.
- The format defines `## Verification` as the checks run against the final state plus every failed or deliberately skipped check with its reason, and states that a passed per-task check is not listed.
- The report-writing instruction folds the report from the progress file's typed entries and names the section each entry type feeds.
- `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`, run from `suite/`, both pass.
- The format still forbids any `.runs/` path in the report, and the instruction still forbids claiming a check that was not run.
- No file under `cli/` is modified.

**Consumes:** the post-Task-1 `suite/shared/manifest.yaml`, which no longer declares `skills/implement/implement-plan`.

**Produces:**
- `suite/shared/references/formats/implementation-report.md` (Markdown) with the section order and entry shapes above. Tasks 3–6 refer to its section names: `## Judgment calls`, the `## Changes` task ledger, and its states `not run` / `blocked` / `already done` / `no change needed`.
- `suite/shared/references/instructions/write-implementation-report.md` (Markdown), which maps the entry types `done`, `blocked`, `deviation`, `judgment`, `concern`, `check`, `discovery` and `follow-up` to report sections. Tasks 3–5 define the progress file in those exact type names.
