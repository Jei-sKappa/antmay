---
name: finish
description: Inspect what a thread has produced, surface any unresolved delivery signals, then hand the current branch off the way the user chooses — create a PR, merge into a confirmed target, or leave as-is; use when work is ready to deliver and you want an evidence-backed branch handoff.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.4.1
disable-model-invocation: true
---

# Finish

Finish is the interactive delivery handoff. Its job is to inspect what the thread has actually produced, surface any unresolved signals, and let the user decide how to deliver the current branch. It does not judge whether the thread is objectively complete.

Run it in three moves: inspect readiness and report the signals, ask how to dispose of the branch, then execute the chosen disposition. Branch delivery is inherently user-directed — no autonomous default is safe across users, repositories, or branch contexts — so the disposition is always the user's explicit choice.

Finish writes no thread artifact: the inspection is read-only, `docs/adr/` and `docs/glossary.md` are read and never written, and the only mutations it performs are the git operations the user explicitly selects.

## Inputs

Resolve the thread first: work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`; if `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which one is active is ambiguous, ASK the user — never silently pick the most recent stamp. Then gather all of these; everything below works from what you gather here. All within-thread paths are thread-relative.

- `docs/adr/` — the project ADR catalog, listed with the command in `references/formats/adr.md`; open the records relevant to what this thread delivered. Authoritative.
- `docs/glossary.md` — the project's terms. Authoritative.
- The thread's `seed.md` — why the thread exists and what it set out to reach; an `External:` value names the tracker ticket the thread answers. Authoritative for intent.
- The thread's `spec.md`, when the thread holds one — its design truth, and one of the two places an unresolved conflict marker can survive. Authoritative.
- The thread's `adr/` and `glossary.md` — the thread's draft records and terms. Material: drafts sitting here have not reached the project layer, which is a reason to close the thread before delivering.
- Every `implementations/<folder>/report.md` the thread holds — what each implementation delivered, in the shape `references/formats/implementation-report.md` defines. Material: the newest folder by stamp carries the principal outcome, and the earlier ones carry what previous passes recorded.
- The plans under `plans/` — each folder's `plan.md` and, for a strict plan, its `plan-tasks/` briefs. Material, and the other place an unresolved conflict marker can survive.
- The contents of `.pending-decisions/`, `.pending-reviews/`, and every `implementations/<folder>/.runs/` — the thread's workspaces, inspected by listing what each holds. You need their names and whether they are empty, not their contents.
- The index under `docs/roadmaps/` whose file stem ends in the thread's slug, when one exists — the direction this thread authored, whose shape `references/formats/roadmap-index.md` describes. Material: for such a thread it is the principal outcome.
- `references/repository-conventions.md`, and `references/trackers/github.md` when the remote or the ticket is on GitHub — what this project prescribes for a commit message and a pull-request body, and the tracker's linking and closing mechanics. Material.
- Git state — the current branch name, its recent commits, and the working tree (`git rev-parse --abbrev-ref HEAD`, `git log --oneline`, `git status --short` or equivalents), taken from the current branch as found. Material.

## Readiness inspection

Work from what you gathered and report what it shows.

- **The principal outcome.** The newest folder under `implementations/` and its `report.md`: what it says was delivered, whether it completed or stopped, and what its deviations, remaining concerns, and follow-ups carry. For a thread whose deliverable is a direction, the principal outcome is the index under `docs/roadmaps/` instead.
- **Unlanded thread records.** Drafts in the thread's `adr/` and terms in its `glossary.md` — the thread's delta of the project layer, still inside the thread.
- **`.pending-decisions/`** — bundles of unresolved decisions awaiting a human.
- **`.pending-reviews/`** — recorded review findings not yet acted on.
- **Surviving run state** — `implementations/<folder>/.runs/` directories left by interrupted runs.
- **Living documentation currency** — whether the project's evergreen docs appear to still reflect how the system works after this thread's changes.
- **Git state** — the current branch name, a brief summary of recent commits, and the working-tree state.
- **Verification evidence already recorded** — what the reports say was run and what it showed.

The report is signal-only: report only the categories that are NON-EMPTY, and omit the rest silently — do not produce a ceremonial list of `none` results. Do not rerun the test suite and do not repeat implementation or code review; verification and review belong to their own operations, and finish only reads the evidence they already left.

## Closing comes first

`close-thread` is what turns the thread's draft ADRs and glossary entries into the project's current records, writes the thread's outcome onto the roadmap entry it answers, and moves the thread into `docs/threads/archive/`. All of that is changes to files in the repository, so running it before the branch is delivered is what makes those records travel with the branch rather than trail behind it.

When the inspection found drafts in the thread's `adr/` or terms in its `glossary.md`, say so and recommend `/close-thread` before the disposition is chosen. Like every other finding this is a recommendation the user may decline, and finish performs no part of the closing itself.

## Advice never gates

The findings are recommendations, never gates. Finish may recommend pausing when a pending decision, an open review finding, surviving run state, a dirty worktree, a missing outcome artifact, or another consequential signal suggests delivery is premature — and when a chosen disposition would deliver or discard work against what the inspection surfaced, say so plainly before the git command runs; branch operations are hard to undo, so this is the cheap moment to raise it. But the user may explicitly accept the trade-off and continue, and once they do, proceed.

Finish NEVER manufactures readiness. It does not approve or version documents, rewrite the spec or a plan, write a missing implementation report, mark reviews resolved, update living documentation, or add any completion marker. If the inspection surfaces a gap, the fix is a separate authoring pass by the user or another operation — never an in-place edit here.

## The ticket step

When the thread's `seed.md` carries an `External:` value naming a tracker ticket, read `references/ticket-step.md` and follow it alongside the disposition you execute — it covers when the step applies and what to offer for each disposition. Read it before executing the chosen disposition, because one branch has to be settled before a pull-request body is drafted.

## Branch disposition

After reporting the inspection, ASK the user which of exactly three dispositions to perform:

1. **create PR** — push the current branch to its remote and open a pull request against a base branch (confirm the base). If `gh` is available, invoke `gh pr create` with a title and body you may draft from the thread's artifacts and recent commits, shaped by what `references/repository-conventions.md` finds the project prescribes for a pull request; where the remote is GitHub, `references/trackers/github.md` also names the body template that passing a body would otherwise bypass. If `gh` is unavailable, report the push result and tell the user how to open the PR manually. Cite the PR URL in the final report. Leave the branch checked out.
2. **merge into a confirmed target branch** — ask for or confirm the target branch, then check it out, integrate the current branch, and push (e.g. `git checkout <target>; git pull; git merge <current>; git push`).
3. **leave as-is** — report the current branch state (branch name, how many commits it carries, working-tree state) and stop. No git command runs. This is a fully valid result, not a failure.

The user's selected option authorizes that branch operation: do NOT ask for redundant confirmation before every ordinary git command within the chosen flow. Do resolve any missing consequential parameter (an unconfirmed target or base branch) by asking. If a git command fails — a merge conflict, a hook or protected-branch rejection, a push failure — STOP, report the failure verbatim, and let the user resolve it; do not improvise recovery.

Finish operates only on the current branch as found. It NEVER rebases, amends, force-pushes, or otherwise rewrites history, and it NEVER creates, switches to, or names a branch on its own initiative — the only branch it checks out is a merge target the user chose.

## Committing before delivery

Creating a PR or merging requires the relevant work to be committed. Finish must NOT silently commit a dirty worktree — unrelated user changes may be present. When the chosen disposition needs a commit but uncommitted changes exist, ask the user which they want:

- authorize a commit of an **explicitly identified file set** (name the files; commit only those), or
- **return** so the user can prepare the commits themselves, or
- **leave as-is**.

This is a deliberate authorization of a specific mutation, obtained before any commit is made.

Draft the message for an authorized commit from what those files change, following whatever `references/repository-conventions.md` finds the project prescribes for a commit message, and show it alongside the file set the user is authorizing — the message is part of what they are approving.

## After the branch action

Report the outcome of the disposition, including what happened to a linked ticket — that it was closed, that a closing keyword will close it when the PR merges, that it was linked without closing, or that the user declined. Then, when the thread is still open, name `/close-thread` as the next action for a thread whose work has been delivered. No closing remark.
