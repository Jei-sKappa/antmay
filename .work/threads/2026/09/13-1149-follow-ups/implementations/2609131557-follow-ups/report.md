# Implementation report

Plan: `plan.md` (11 tasks) — Follow-ups: instructions, model-invoked skills, `.wip/` threads, and the deletions
Run: `implementations/2609131557-follow-ups/`, started 2026-09-13 15:57:29Z

## Outcome

Every one of the plan's eleven tasks is complete and committed. Each task ran as one
orchestration cycle — an implementer subagent, then a merged reviewer judging
plan-compliance and code quality in separate lanes — and landed as its own commit once
both lanes passed. Two cycles needed one fix iteration each; the other nine passed on the
first review. Every acceptance criterion of the spec, AC-1.1 through AC-11.1, holds.

The suite now ships eight groups and eighteen skills. Every format file follows one
skeleton; reusable acts live in a new `instructions/` shared-reference kind; two
model-invoked skills give any agent the project's decisions and terms; the primitives
group, the recipes, `whats-next`, `finish`, `suite/method.md` and `suite/skill-authoring.md`
are gone; the repository's documents are split by audience; and all thirty-five threads
live under `.wip/threads/` in the year/month layout.

`cli/` was not touched, by decision (DR14). Its own check is expected to fail until the
`[contract]` follow-up thread realigns it.

## Commits

| Commit | Task | Subject |
| --- | --- | --- |
| `e1ec54b` | 1 | bring every format to one skeleton and add thread and glossary |
| `92e1435` | 2 | add the instructions shared-reference kind |
| `80c20b0` | 3 | reshape the skill tree into eight groups and realign registrations |
| `a2e4602` | 4 | rewrite the capture-discussion bodies onto consults and instructions |
| `6129c21` | 5 | rewrite the spec, plan and roadmap bodies onto consults and instructions |
| `1bb1d2b` | 6 | drop the continuation-run mode from the implement bodies |
| `48d3b5b` | 7 | rewrite the review and close bodies onto consults and instructions |
| `3d1b169` | 8 | replace skill-authoring.md with suite/authoring/ and delete method.md |
| `6261e85` | 9 | split the repository documents by audience and draft the glossary delta |
| `6ad0b58` | 10 | move threads to .wip/threads/ in the year/month layout |
| `f7c21e2` | 11 | sweep every body and verify the whole change |

The migration is its own commit with no other change in it, as the spec requires.

## What changed

**Shared references.** The six existing format files were restructured to title /
paragraph / `## Shape` / `## Rules`, with behaviour stripped out: the ADR catalog command
and conflict rule moved to `consult-adrs`, the log append mechanics to
`instructions/append-log-line.md`, and the report's rewrite-in-place rule removed. New
`formats/thread.md` and `formats/glossary.md` were added. A new
`shared/references/instructions/` kind holds `create-thread`, `append-log-line`,
`emit-pending-decisions`, `emit-pending-review`, `write-implementation-report` and
`emit-terminal-outcome` — imperative, self-contained, naming no skill, with every
caller-precondition-and-refuse block dropped.

**Skill tree.** `model-invoked/consult-adrs` and `consult-glossary` created (interface
block only, no `disable-model-invocation`, no `policy`); `primitives/`, `finish`,
`whats-next` and `shared/references/recipes/` deleted; `finish-navigate/close-thread`
moved to `close/close-thread`; every `SKILL.md` set to `version: 0.0.0`; manifest,
marketplace and commit scopes realigned.

**Bodies.** All eighteen bodies now open `## Inputs` with `/consult-adrs` and
`/consult-glossary`, carry no thread-resolution step, and route reusable acts through
synced instruction pointers. Only `discussion`, `resolve-pending-decisions` and `spec`
write to `log.md`. The three implement skills lost the continuation-run mode — every
invocation allocates its own folder and is its only writer, and the report is written once
at the terminal outcome. `close-thread` leaves the thread folder in place and writes no
closing log line.

**Documents.** `suite/authoring/` (five files, one concern each) replaces
`suite/skill-authoring.md`; `suite/method.md` is deleted. `README.md` is written for an
external user with an expects/leaves line per skill; both `AGENTS.md` files are reduced to
a paragraph, a layout tree, one pointer per maintainer document and the
before-anything-else rules; `docs/documentation-rules.md` and `docs/working-with-threads.md`
are new.

**Migration.** All thirty-five thread folders moved to `.wip/threads/20YY/MM/DD-HHMM-slug/`
as 329 Git renames plus one add/delete pair. Eleven seeds had their references to other
threads rewritten; every other file inside every thread is byte-identical to its pre-move
content. `.gitignore`'s four workspace rules are re-anchored at `.wip/threads/**/`.

**Sweep.** All eighteen bodies and all six hand-authored skill-local references were read
in full, group by group, with every hit reported by file, line and class before any edit.
Nine hits were resolved across six groups, plus four out-of-sweep accuracy fixes. The
sweep report is at `.runs/task-11/sweep-report.md`.

## Checks run

From `suite/`, before every commit: `node scripts/sync-shared-references.mjs` (leaves the
tree unchanged) and `node scripts/check-marketplace-skills.mjs` (OK — 18 skills, all
declared). Each task's own verification block was run by its implementer and independently
re-run by its reviewer.

Every acceptance criterion AC-1.1 … AC-11.1 holds. Three pass only once a defect in the
criterion's own check line is filtered — see "Defects in the plan's own checks" below.

Nothing under `cli/` was run, per DR14.

## Where the implementation diverged from the plan

- **The sweep was not partitioned across subagents.** Task 11's brief partitions the sweep
  across subagents; a subagent cannot spawn subagents, so the orchestrator directed one
  implementer to perform the same partitioned sweep itself, group by group, to the same
  standard — every hit reported by file, line and class before any edit. Coverage was
  verified independently by the reviewer, which found no missed hit. The run workspace
  therefore holds no record of eight group dispatches; the sweep report is the evidence of
  coverage.
- **Eighteen skills, not twenty.** Two briefs (tasks 3 and 9) state twenty skill folders.
  Their own enumerated lists and the spec both give eighteen. The enumeration was followed.
- **`formats/adr.md` pruned from thirteen skills.** As each body stopped citing it, the
  declaration was dropped and the generated copy removed, following the precedent set in
  task 5 rather than leaving dead declarations behind.
- **One word changed outside a brief's step list.** "a runtime primitive" became "a runtime
  capability" in `implement-plan-with-subagents`, the last hit of that brief's `primitive`
  grep, since the word had no referent once the primitives group went.
- **`side-effects.md` describes the run workspace as it is.** Task 8's brief describes a
  UTC-stamped run directory; the suite gives each invocation an
  `implementations/<stamp>[-<slug>]/` folder with its state in `.runs/`. The document
  describes what exists.
- **`body-structure.md`'s `## Procedure` rule was reworded** to describe the convention the
  shipped bodies actually follow, because five carry their acts as named sections rather
  than one numbered list. Restructuring those five instead remains open.

## Defects in the plan's own checks

These are faults in verification lines, not in the work. Each was confirmed independently
by a reviewer.

- **AC-2.2's grep** matches `/(allocate-thread|emit-pending-decisions|emit-pending-review|update-implementation-report)\b`,
  which also matches the pointer paths `references/instructions/emit-pending-decisions.md`
  and `emit-pending-review.md` that the plan itself requires bodies to carry. No skill
  declaring those instructions can satisfy it literally. Thirteen suite-wide hits, all
  legitimate; filtered with `| grep -v 'references/instructions/'` it returns nothing.
- **AC-8.2's grep** excludes neither `.git` nor the untracked `temp/` scratch folder, which
  alone holds 132 stale `docs/threads` hits.
- **AC-9.5's grep** needs `docs/glossary.md` excluded, which the plan index already decides.
- **The `^## ` heading greps over `formats/`** cannot tell a document heading from a heading
  inside a fenced block. Three format files indent their `## Shape` fence by two spaces so
  their skeleton headings are not miscounted. This is sound CommonMark and renders
  identically, but the fence is the template an agent imitates. The fix belongs on the
  check — strip fenced blocks before counting — and both the task 1 and task 11 copies of
  the check must move together with it.
- **Task 2's `refus` grep** expects no output while its own step 6 mandates the closed token
  `REFUSED`. No precondition-and-refuse block exists in any instruction file.
- **Task 11's `ls` line** for the sweep report needs `*/.runs/task-11/`.

## Follow-ups

- **A coupling rule was lost and needs re-homing.** The rule that `CONTRIBUTING.md`'s issue
  classification tables and the workflow's `SCOPES`, `TYPES` and `EFFORTS` maps must be
  edited together is now stated nowhere in prose. It left the root `AGENTS.md` with the
  issue-classification section and was not re-homed. Its natural home is `CONTRIBUTING.md`,
  which is authoritative for issue classification. Verified directly: no prose file states
  it. This is the one substantive regression this run introduced.
- **`docs/glossary.md`'s header paragraph** still names `suite/method.md` and
  `suite/skill-authoring.md`. The plan places the project glossary outside this thread's
  writes; `close-thread` merges this thread's delta, and the header is not a term, so it
  needs `close-thread` or a follow-up to clear it.
- **`cli/` realignment.** The CLI still names deleted skills and `docs/threads` paths, and
  its check fails. The `[contract]` follow-up thread realigns its paths, the deleted skill
  names, `cli/README.md`, `cli/AGENTS.md`, and the pre-existing `reconcile-*` /
  `archive-thread` rows.
- **The glossary's `pipeline` and `stage` rows** are left for that same CLI thread to
  redefine on its own terms.
- **An empty thread folder.** `2026/07/30-1908-automate-issue-handling` is empty, and Git
  cannot record an empty directory, so a fresh clone shows thirty-four folders. Its content
  was parked in untracked `temp/old/` in July; nothing was lost in the move.
- **No instruction was extracted by the sweep.** The one candidate — the project-record
  block shared by `discussion` and `resolve-pending-decisions` — is left inline with its
  reasoning recorded in the sweep report. A later deliberate edit could still extract it.

## Remaining concerns

- `documentation-rules.md`'s absolute no-duplication clause sits against three
  brief-mandated before-anything-else restatements in the `AGENTS.md` files.
- The `terminal outcome` glossary row drops "stage status".
- The per-task reviews this run performed were task-scoped gates, each checking one task's
  diff against that task. The change as a whole has not been reviewed, and the verify stage
  checks the implementation against the spec's acceptance criteria rather than against the
  plan. This report's divergence section is written to be that review's starting point.
