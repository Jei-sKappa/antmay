# Commit the implementation report as a closing step of an implement run

## Intended goal

When an auto-committing implement run finishes, that run's implementation report
is in Git history alongside the code it describes, and the workspace is left in a
state the user can push without any further manual Git work. A user who runs
implementation on a remote machine pushes from that machine and is done: nothing
durable the run produced is left sitting in the working tree waiting for a
hand-made commit.

## Context

The three implement skills — `implement`, `implement-plan`, and
`implement-plan-with-subagents` — each write their run's `report.md` at the
terminal outcome and then stop. Nothing commits it. Each skill's
`## Commit Policy` fixes the cadence at one commit per task and stages only that
task's own files, so the implementation report, which is written afterwards, is
never staged by any commit the run makes.

Two consequences follow. The run's own record never reaches Git history, so the
audit trail that the commit bodies and the report are meant to form together is
incomplete. And the run ends with a dirty worktree, which is exactly the
condition those same skills refuse in their `## Dirty worktree handling`
preflight — so each run leaves behind the condition that makes the next run
refuse, including the repeated-pass-over-one-plan flow that the skills' own
`## Inputs` and earlier-report reconciliation step are built for.

The thread was opened from the ticket at
`https://github.com/Jei-sKappa/antmay/issues/6`. What settled the design is
recorded in `log.md`; the term this work fixes is in `glossary.md`.

## Scope

In scope:

- A new shared instruction under `suite/shared/references/instructions/` carrying
  the closing-commit act, its manifest declarations, and the mirrored copies the
  sync script generates.
- The body edits in all three implement skills that trigger the act and make room
  for it in their commit policies.
- Recording, in this work's own implementation report, the CLI drift this change
  causes.

Out of scope:

- **Any change under `cli/`.** The CLI is on hold. Its stage catalog treats an
  uncommitted report as the implementation stage's required tracked change, an
  expectation this change invalidates — and one already stale against the current
  suite, which writes `implementations/<yymmddhhmm>[-slug]/report.md` rather than
  the thread-root `implementation-report.md` the catalog looks for. The drift is
  recorded for the realignment pass, never repaired here. The rule holding
  `cli/README.md`'s stage-support table in step with the suite is suspended while
  the hold stands, so that table is not edited either.
- **Pushing.** The run commits and stops. No skill in the suite touches a remote,
  and the user automates the push themselves.
- **Committing any other thread artifact.** Plan folders, specs, seeds, and logs
  keep their current handling; `plan-strict`, for one, never commits what it
  emits, and that stays true.
- **A general rule for user-instruction precedence across the suite.** The idea
  that a user instruction overrides a skill's defaults while an instruction
  conflicting with a skill's core ends the run `REFUSED` was raised and
  deliberately deferred to its own thread. This spec applies the existing
  override clause as written and introduces no general principle.

## Expected behavior

### The closing report commit

An auto-committing implement run, having written its implementation report,
commits that report before emitting its final out-message. This is the **closing
report commit**, and it is its own commit rather than part of any task's commit.
It cannot be otherwise: the report is written after the last task commit has
already landed, `### No history rewriting` forbids amending that commit, and a
run that stopped early may have no task commit at all.

The commit stages the run's own `report.md` and nothing else, so that the run's
operational trace under `.runs/` and any unrelated working-tree change stay out
of it.

The act runs at **every terminal outcome an executing run reaches** — completion,
partial completion, a `BLOCKED` halt, and a no-op where the requested state
already held — mirroring the points at which each body already writes the report
*(Inference: the thread settled that the workspace must be left pushable, and a
blocked run on a remote machine is when reading the report locally matters most;
attaching the act to the success path alone would leave that case dirty.)*

Under `implement-plan-with-subagents` the orchestrator performs the closing report
commit and never a subagent, consistent with the orchestrator being that skill's
only committer and the writer of the report. Under `implement` and
`implement-plan` the single-session implementer performs it.

### When the closing report commit fails

The failure is real and reachable: the guardrails forbid `--no-verify`, so a
pre-commit hook that rejects a commit touching only thread artifacts, or a
commit-message linter that rejects the closing subject, fails this commit while
every task commit succeeded.

The run's terminal outcome token does not degrade. It stays `DONE` when the
requested operation otherwise completed. Degrading it would misreport completed,
committed work as unfinished, and routing through `## Blocked` would additionally
invoke machinery built for a different situation — a pending-decision bundle or
an operational-defect diagnosis — for a failure that is neither.

The degradation is carried in the terminal outcome's reason string instead, which
names the report path, states that the report is uncommitted, and carries the
diagnosis of what failed. The reason string is the one surface an unattended
caller reads, so a silent `DONE` would let an automated push send an incomplete
stack while the remote machine keeps a dirty tree that refuses the next run.

The retry and guardrail policy is the one `### Failed commit` already fixes: at
most three fix-and-retry attempts, never bypassing a hook, never weakening or
skipping a check, never stashing and retrying *(Inference: reusing the existing
cap rather than introducing a second number; nothing in the thread called for a
different one.)* What is dropped for this commit alone is the escalation to
`BLOCKED` past the cap.

A failed closing report commit leaves the worktree dirty, and the next implement
run's `## Dirty worktree handling` preflight refuses accordingly. That refusal is
correct and gets no carve-out *(Inference: a carve-out would let the next run
sweep the previous run's report into one of its own task commits, muddying the
history worse than a refusal does.)*

### Interaction with an explicit Git instruction

Each body's `## Commit Policy` already lets an explicit Git instruction in the
invocation override the default cadence. That clause governs the closing report
commit as follows, and the two kinds of instruction it lists behave differently
because of what the closing commit is:

- A **suppression** instruction — "do not commit, just leave the changes staged"
  — reaches the closing report commit and suppresses it. The report is written,
  left uncommitted, and the terminal outcome reason carries the uncommitted
  marker exactly as it does after a failure.
- A **cadence** instruction — "commit at the end as one commit", "make one commit
  per file touched" — does not reach it, because the closing report commit is not
  a member of the code commit cadence. Such an invocation produces the instructed
  code commits plus the closing report commit.

### Where the act lives

The closing-commit act is written once as a new shared instruction,
`commit-the-implementation-report.md`, under
`suite/shared/references/instructions/`. It is not folded into the existing
`write-implementation-report.md`.

Two things decide this. Manifest declaration is per skill and per file, so a
future implement skill that does not auto-commit declares the write act and
simply does not declare the commit act; folding them together would require such
a skill to follow half a file, and a pointer is a directive to open a file and
act on it, not to act on part of it. And the instruction kind holds the procedure
for one act — writing a file and committing it are two.

The existing `write-implementation-report.md` keeps its scope boundary, including
its closing statement that `report.md` is the only file that act writes.

### What changes in each body

Each of the three `SKILL.md` bodies gains:

- A step between writing the report and the final out-message that follows the
  new instruction, carrying the skill-specific parameters the instruction leaves
  open — above all who performs it *(Inference: the seed places the act before the
  final out-message, and the trigger condition stays in the body because
  `body-structure.md` requires a moved block to leave its trigger behind.)*
- A clause in `## Commit Policy` making room for the closing report commit
  against the staging rule that currently forbids it. Each body's rule to stage
  only the files the task touched is stated for the code cadence; the closing
  report commit stages the report, and the body says so.
- The final out-message names the closing report commit's SHA and subject
  alongside the commit made for each task, or states that the report was left
  uncommitted *(Inference: each body already names the SHA and subject of every
  commit the run made; the closing commit is one of them.)*

## Constraints

- **The suite has no build.** Validation is the two mechanical text checks plus
  reading the Markdown.
- **A mirrored copy is never hand-edited.** The canonical file under
  `suite/shared/references/` is edited and `node scripts/sync-shared-references.mjs`
  is run from `suite/` to regenerate every declaring skill's copy. The generated
  copies are committed.
- **`node scripts/check-skill-text.mjs`** must pass after editing any body or any
  shared reference. It fails on a `references/` path not prefixed
  `<skill_path>/`, on `per` before a `<skill_path>` pointer, and on a fence line
  with leading whitespace.
- **The authoring conventions bind the new instruction.** It is written in the
  imperative to whoever performs it and names no skill; the bodies that point at
  it supply the parameters it leaves open and restate nothing it holds.
- **The terminal outcome line is fixed in shape.** `Outcome: <TOKEN> — <one-line
  reason or pointer>`, one per run, last line of the message, vocabulary closed
  to the three tokens. Only the reason part carries the uncommitted marker.
- **No new skill is created**, so the marketplace manifest, the root `README.md`
  skill index, and the commit-scope list are untouched, and no frontmatter
  changes.
- **The suite is published content.** Every file under `skills/` and
  `shared/references/` is written for an agent invoked in any project, so nothing
  added may assume this repository's own layout or tooling.

## Acceptance criteria

**FR-1 — An auto-committing implement run commits its implementation report.**

- AC-1.1 Each of `implement`, `implement-plan`, and
  `implement-plan-with-subagents` carries a procedure step, positioned after the
  step that writes the report and before the step that emits the final
  out-message, that follows the new closing-commit instruction.
- AC-1.2 The instruction produces one commit whose staged content is the run's
  own `report.md` and no other path.
- AC-1.3 The instruction produces a commit distinct from any task commit, and
  contains no amend, rebase, or force-push.

**FR-2 — The act covers every terminal path an executing run reaches.**

- AC-2.1 The instruction states that it is followed at completion, partial
  completion, a `BLOCKED` halt, and a no-op.
- AC-2.2 In each body, the `## Blocked` route reaches the closing report commit
  before the run stops, so a blocked run leaves no uncommitted report.

**FR-3 — A failed closing report commit does not degrade the terminal outcome
token, and is visible in the reason string.**

- AC-3.1 A run whose work otherwise completed and whose closing report commit
  failed emits `DONE`, not `BLOCKED`.
- AC-3.2 That run's terminal outcome reason names the report path, states that
  the report is uncommitted, and carries the diagnosis of what failed.
- AC-3.3 The instruction caps fix-and-retry attempts at three and carries the
  existing guardrails: no hook bypass, no weakening or skipping a check, no
  stash-and-retry.
- AC-3.4 No body routes a failed closing report commit into `## Blocked`, and no
  pending-decision bundle is written for one.
- AC-3.5 No body adds a `## Dirty worktree handling` exception for a leftover
  uncommitted report.

**FR-4 — The existing explicit-Git-instruction override governs the closing
report commit correctly.**

- AC-4.1 Each body states that a suppression instruction suppresses the closing
  report commit, and that the terminal outcome reason then carries the
  uncommitted marker.
- AC-4.2 Each body states that a cadence instruction does not reach the closing
  report commit.

**FR-5 — The act lives in its own shared instruction.**

- AC-5.1 `suite/shared/references/instructions/commit-the-implementation-report.md`
  exists and holds the closing-commit act.
- AC-5.2 `suite/shared/references/instructions/write-implementation-report.md`
  contains no commit, stage, or Git operation, and retains its statement that
  `report.md` is the only file that act writes.
- AC-5.3 `suite/shared/manifest.yaml` declares the new file for each of the three
  implement skills and for no other skill.
- AC-5.4 Running `node scripts/sync-shared-references.mjs` from `suite/` produces
  no diff, meaning every mirrored copy is present and matches its canonical
  source.
- AC-5.5 The new instruction names no skill and is written in the imperative to
  whoever performs it.

**FR-6 — Each body accommodates the new commit and reports it.**

- AC-6.1 Each body's `## Commit Policy` states that the closing report commit
  stages the report, so the staging rule for the code cadence no longer forbids
  it.
- AC-6.2 Each body's final out-message step names the closing report commit's SHA
  and subject, or states that the report was left uncommitted.
- AC-6.3 `implement-plan-with-subagents` states that the orchestrator performs the
  closing report commit and never a subagent.

**FR-7 — The mechanical checks pass and the CLI is untouched.**

- AC-7.1 `node scripts/check-skill-text.mjs` passes from `suite/`.
- AC-7.2 `git diff` for the change touches no path under `cli/`.
- AC-7.3 This work's own implementation report names the CLI drift: that
  `cli/src/pipeline/catalog.ts` expects the implementation stage's tracked change
  to be an uncommitted report, at a thread-root path the suite no longer writes.

## Degrees of freedom

Each item below is a *how* left to the implementer. Every admissible choice
satisfies the acceptance criteria unchanged, none produces a user-visible
difference worth weighing in on, and each is reversible without revising this
spec.

- **The literal phrasing of the uncommitted marker** in the terminal outcome
  reason. AC-3.2 fixes what it must convey, not its words. Consistency across the
  three skills is guaranteed structurally, because one shared instruction defines
  it for all of them.
- **The closing commit's subject and message body**, within whatever
  conventional-commit shape the host project uses. Nothing requires the closing
  commit to carry a progress block the way task commits do.
- **The name and numbering of the new procedure step** in each body, and the
  exact wording of the `## Commit Policy` clause.
- **Section structure inside the new instruction file**, subject to the
  instruction register the authoring conventions fix.
- **Where in each body the suppression and cadence distinction is worded**, so
  long as both are stated.

## Inferences

Each bullet is a specific this spec settles on its own, marked inline where it is
used. None was settled by the user as a decision.

- **Coverage of every terminal path** (`## Expected behavior`, the closing report
  commit) — follows from the settled constraint that the workspace be left
  pushable; a blocked run is when a locally readable report matters most.
- **Reuse of the existing three-attempt retry cap** (`## Expected behavior`, when
  the closing report commit fails) — the thread settled that the escalation to
  `BLOCKED` is dropped, not that the cap changes.
- **No dirty-worktree carve-out for a leftover report** (`## Expected behavior`,
  when the closing report commit fails) — a carve-out would let the next run
  sweep the previous run's report into one of its own task commits. The point was
  put to the user and passed without dispute.
- **Step placement before the final out-message, with the trigger left in each
  body** (`## Expected behavior`, what changes in each body) — the seed places the
  act there, and `body-structure.md` requires a moved block to leave its trigger
  condition behind.
- **The final out-message names the closing commit's SHA and subject**
  (`## Expected behavior`, what changes in each body) — each body already names
  the SHA and subject of every commit the run made.
- **The baseline gate does not run before the closing report commit** — that gate
  is the bar for code allowed to land, and this commit touches no code. It is
  therefore absent from the acceptance criteria rather than required by them.
- **The report never describes its own commit** — the report is written before
  the commit is attempted, so whether that commit succeeded is carried by the
  final out-message and the terminal outcome reason, never by the report body.
- **No version bump** — the suite's conventions fix a starting version for a new
  skill and require no bump for editing an existing one, so none is specified.
