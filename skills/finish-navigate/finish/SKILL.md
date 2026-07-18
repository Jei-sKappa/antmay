---
name: finish
description: Inspect what a thread has produced, surface any unresolved delivery signals, then hand the current branch off the way the user chooses — create a PR, merge into a confirmed target, or leave as-is; use when work is ready to deliver and you want an evidence-backed branch handoff.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.1.0
disable-model-invocation: true
---

# Finish

Finish is the interactive delivery handoff. Its job is to inspect what the thread has actually produced, surface any unresolved signals, and let the user decide how to deliver the current branch. It does not judge whether the thread is objectively complete, and it changes no thread artifacts — the inspection is read-only and the only mutations it performs are the git operations the user explicitly selects.

Run it in three moves: inspect readiness and report the signals, ask how to dispose of the branch, then execute the chosen disposition. Branch delivery is inherently user-directed — no autonomous default is safe across users, repositories, or branch contexts — so the disposition is always the user's explicit choice.

## Resolve the active thread

The thread root is a folder under `docs/threads/` named with a UTC-timestamp slug (e.g. `docs/threads/250522143000Z-my-feature/`). If the current working directory already sits inside a thread root, that is the thread. If several thread roots exist and which one is active is ambiguous, ASK the user — never silently pick the most recent timestamp. All within-thread paths below are thread-relative; git and branch state come from the current branch as found.

## Readiness inspection

Run a lightweight, read-only inspection pass and report what it finds. Inspect:

- **The apparent principal outcome.** For implemented work, whether `implementation-report.md` exists at the thread root. For Roadmap work, whether `roadmap.md` exists and whether its child threads show evidence of having been materialized.
- **`.pending-decisions/`** — bundles of unresolved decisions awaiting a human.
- **`.pending-reviews/`** — recorded review findings not yet acted on.
- **`.implementation-runs/`** — abandoned or interrupted run state.
- **Obvious unresolved conflict markers** in the thread's artifacts (e.g. a literal `<!-- CONFLICT:` left in `spec.md`, `plan.md`, or a candidate).
- **Living documentation currency** — whether the project's evergreen docs appear to still reflect how the system works after this thread's changes.
- **Git state** — the current branch name, a brief summary of recent commits, and the working-tree state (`git status --short`, `git log --oneline`, `git rev-parse --abbrev-ref HEAD` or equivalents).
- **Verification evidence already recorded** by implementation.

The report is signal-only: report only the categories that are NON-EMPTY, and omit the rest silently — do not produce a ceremonial list of `none` results. Do not rerun the test suite and do not repeat implementation or code review; verification and review belong to their own operations, and finish only reads the evidence they already left.

## Advice never gates

The findings are recommendations, never gates. Finish may recommend pausing when a pending decision, an open review finding, an unmaterialized Roadmap child, a dirty worktree, a missing outcome artifact, or another consequential signal suggests delivery is premature — and when a chosen disposition would deliver or discard work against what the inspection surfaced, say so plainly before the git command runs; branch operations are hard to undo, so this is the cheap moment to raise it. But the user may explicitly accept the trade-off and continue, and once they do, proceed.

Finish NEVER manufactures readiness. It does not approve or version documents, delete pending bundles, rewrite the spec or plan, create a missing implementation report, mark reviews resolved, update living documentation, or add any completion status. If the inspection surfaces a gap, the fix is a separate authoring pass by the user or another operation — never an in-place edit here.

## Branch disposition

After reporting the inspection, ASK the user which of exactly three dispositions to perform:

1. **create PR** — push the current branch to its remote and open a pull request against a base branch (confirm the base). If `gh` is available, invoke `gh pr create` with a title and body you may draft from the thread's artifacts and recent commits; if `gh` is unavailable, report the push result and tell the user how to open the PR manually. Cite the PR URL in the final report. Leave the branch checked out.
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

## Tracker references stay passive

A linked external ticket is context, not a mutation target. Finish may place a NON-closing reference such as `Related to <ticket>` in a pull-request body. It does NOT use auto-closing keywords, comment on the ticket, transition its status, close it, or post a backlink — any of those require an explicit user request.

## After the branch action

Report the outcome of the disposition, then offer `/archive-thread` as the normal optional next action for a thread whose work has been delivered. Never archive automatically — finish owns the repository handoff, and archival is a separate act the user chooses. No closing remark.
