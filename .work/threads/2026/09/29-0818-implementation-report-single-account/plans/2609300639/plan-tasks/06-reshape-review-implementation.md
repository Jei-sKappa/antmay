### Task 6: Teach `review-implementation` the reshaped report

**Objective:** Make `review-implementation` find the delivered code through the report ledger's commits, and test each ledger line, each judgment call and the verification exceptions as claims. Then confirm, over the whole change, that `close-thread` and `cli/` stayed untouched.

**Input / context:**
- `spec.md`, `### The fidelity review`, is the authority. Its inference, that the ledger, the judgment calls and the verification exceptions are tested as claims, is settled for this plan.
- `docs/glossary.md`, **deviation** and **judgment call**: a judgment call fills a degree of freedom or the spec's silence, and a deviation departs from something pinned.
- Task 2 produced the reshaped report format. It is mirrored at `suite/skills/review/review-implementation/references/formats/implementation-report.md`, with `## Judgment calls`, the `## Changes` task ledger and its states, and the exception-only `## Verification`.
- The file to reshape is `suite/skills/review/review-implementation/SKILL.md`. These are the places that read the old report shape today:
  - `## Inputs`: the delivered-code bullet, "as the report's `## Changes` describes them";
  - `## The report is the claim under test`: the list of sections and the "describes changes that are not there" wording.
- `suite/skills/close/close-thread/SKILL.md` stays unchanged (`spec.md`, `## Scope and non-scope`). Its mirrored copy of the format was regenerated in Task 2, and that is expected.
- Starts from Task 5's committed state.

**Steps:**
1. In `## Inputs`, rewrite the delivered-code bullet. The delivered code is what the user names, or else the commits the report's `## Changes` ledger records. Keep the read-only rule: never check out, run tests, modify the working tree or mutate git state. Reading a commit with `git show` stays allowed.
2. In `## The report is the claim under test`, rewrite the first paragraph to name the reshaped sections: `## Outcome`, the `## Changes` task ledger, `## Verification`, plus any deviations, judgment calls, remaining concerns and follow-ups.
3. Add a paragraph testing each ledger line as a claim, and each of the following as a finding:
   - a line whose commit does not exist, or does not carry that task's change;
   - a `not run`, `blocked`, `already done` or `no change needed` state the code does not bear out;
   - a ledger that omits a task the run's plan or scope covers;
   - a line that describes a task that followed its brief.
4. Add a paragraph testing each `## Judgment calls` entry against the spec. An entry claims the spec pinned nothing at that point: a granted degree of freedom, or its silence. An entry that departs from something the spec or a delta document pins is a finding, as an undeclared deviation. An entry the code does not show is a finding too. Keep the existing `## Deviations` paragraph as it is.
5. Add a sentence testing `## Verification` against its rule: it lists the checks run against the final state and every failed or deliberately skipped check with its reason. A failure or skip the report or the code shows elsewhere but `## Verification` does not list is a finding. So is a listed check the work gives no sign was run.
6. Leave `## The authority anchor`, `## What you judge`, `## Recording findings` and `## After the review` unchanged, except for any sentence that still reads `## Changes` as a description of changes by area or path.
7. From `suite/`, run `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs`.
8. Run the whole-change checks over the finished plan:
   - Set `BASE` to the commit before Task 1:
     `BASE=$(git rev-parse "$(git log --diff-filter=D --format=%H -1 -- suite/skills/implement/implement-plan/SKILL.md)^")`
   - Then run each check in this task's `Verification` that names `$BASE`.

**Files modified:**
- `suite/skills/review/review-implementation/SKILL.md`

**Verification:**
- `rg -n 'ledger' suite/skills/review/review-implementation/SKILL.md` matches in `## Inputs` and in `## The report is the claim under test`.
- `rg -n 'Judgment calls' suite/skills/review/review-implementation/SKILL.md` matches the paragraph that treats a departure from something pinned as a finding.
- `rg -n 'not run|already done|no change needed' suite/skills/review/review-implementation/SKILL.md` matches the ledger paragraph.
- From `suite/`, `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` both exit 0.
- Whole-change checks, with `BASE` set as in step 8:
  - `git diff --quiet "$BASE" -- suite/skills/close/close-thread/SKILL.md` exits 0.
  - `git diff --name-only "$BASE" -- cli` prints nothing, and `git status --porcelain -- cli` prints nothing.
  - `git diff --name-only "$BASE" -- suite/AGENTS.md docs/glossary.md` prints nothing.
  - `rg -n --hidden -P 'implement-plan(?!-with)' -g '!.work/**' -g '!cli/**' -g '!.git/**' .` prints only the `suite/AGENTS.md` layout line, which `delta/suite/AGENTS.md` lands at close.
  - From `suite/`, `node scripts/sync-shared-references.mjs` followed by `git status --porcelain -- suite/skills` prints nothing, so every mirror is already in step.

**Acceptance criteria:**
- `review-implementation` locates the delivered code through the report ledger's commits and tests each ledger line against the code.
- `review-implementation` tests each `## Judgment calls` entry against the spec, and treats an entry departing from something the spec pins as a finding.
- `review-implementation` treats a failed or skipped check missing from `## Verification` as a finding.
- `close-thread` is unchanged.
- No file under `cli/` is modified.
- `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`, run from `suite/`, both pass.

**Consumes:** from Task 2, the reshaped report format: `## Judgment calls`, the `## Changes` task ledger with its states `not run` / `blocked` / `already done` / `no change needed`, and the `## Verification` exception rule.

**Produces:** none
