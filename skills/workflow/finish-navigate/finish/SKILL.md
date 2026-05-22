---
name: finish
description: Close a thread by checking final artifacts, open inbox items, recent commits, and unresolved concerns, then asking the user whether to merge into main, merge into another branch, create a PR, or leave the branch as-is when the work is complete or needs a stop-and-decide closure.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.1
---

# Finish

Close a thread by running a lightweight 4-item thread check, surfacing the inspection results to the user, and ASKING the closure question with four enumerated options — `merge into main` / `merge into other branch` / `create PR` / `leave as is`. On the user's choice, execute the corresponding flow with explicit per-command confirmation. NEVER force-push, NEVER rewrite history.

Branch disposition is inherently user-directed. The closure question requires a human choice — there is no autonomous default that would be safe across users (some prefer PR-only flows; others merge locally and push), across repos (some have protected `main` branches that reject direct merges; others do not), or across branch contexts (a long-lived feature branch with multiple collaborators is not the same as a single-author sandbox). Picking silently would hide a real decision behind a heuristic, and the cheapest way to surface that decision is to ASK every time.

## Anti-Sycophancy Stance

Your job is to help the user reach the right closure choice for the thread, not to make them feel good about whatever they pick first. Treat the closure decision as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **branch operations are hard to undo, push back if the user picks an option that would lose work**. A closure that silently merges a half-finished branch into `main` because the user said "merge it" without addressing the open Inbox findings has produced an outcome the user will regret — the cheap moment to push back is during the closure question, before any git command runs. Once a merge lands on `main` and is pushed, undoing it is expensive (`git revert`, force-push to a protected branch is forbidden, coordinated rollback with collaborators); once a discard happens, work is gone. The cheap moment for the closure decision to do its job is BEFORE the choice is locked in.

Push back hard on weak reasoning or hidden assumptions; never soften a recommended pause just because the user wants to move on. A finish flow whose only effect is to execute whatever the user asked for without surfacing the open Inbox items, the uncommitted changes, or the pending review-finding records has stopped finishing and started rubber-stamping. The thread check exists precisely to give the closure conversation evidence to work with.

Hold these together:

- **Disagree when you disagree.** If the user's closure choice conflicts with the evidence the thread check surfaced (open inbox items that look blocking, pending review-finding records, uncommitted changes that suggest mid-flight work), say so plainly before executing any git command. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user picks `merge into main` for a reason that doesn't hold up — "it's fine", "we'll address the inbox later", "the open review-findings are nits", "the uncommitted changes don't matter" — name the gap, surface the substance of the open signal, and bring it into the conversation before the git command runs. A future reader of `main` will not have you to ask follow-ups. This is the last cheap moment.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences — raise them, even if the user wants to move on. Branch operations are hard to undo. Better captured as a question NOW than rediscovered when a teammate runs `git log` next week.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the thread check, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument. ("The open inbox items are future deferrals, not blockers for this thread's closure" is real information.)
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never proceed with a closure command just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the closure differently, identify the exact assumption or value judgment causing the split (e.g., "is this inbox item a blocker or a parked deferral?"), then resolve THAT before the git command runs.
- **Refuse to log silently a closure you believe is wrong.** If the user insists on a closure option you believe will lose work (e.g., `merge into main` while the thread check surfaced unresolved review-finding records, or `leave as is` while uncommitted changes look genuinely lost), execute the choice they made BUT include the dissent in the final message: state the option they chose, state the signal you flagged, and state that the user accepted the trade-off. The closure goes through — but the trail records the dissent for whoever reads the thread next. Branch operations are hard to undo — push back if the user picks an option that would lose work.
- **Keep the closure owned by the evidence.** The goal is not for either side to win. The goal is to record a closure that survives later scrutiny because the thread's signals, the open work, and the trade-offs were actually considered.

If you believe a closure option would silently lose work — uncommitted changes folded into a merge the user did not realize would pick them up, open review-findings ignored at merge time, a discard the user has not confirmed they want — refuse to execute it silently. Either resolve the disagreement first, OR execute the closure with the dissent surfaced in the final message. The cheap moment for the closure to do its job is during the question — once the branch operation lands, the cost compounds.

## Thread Check

Before the closure question, this skill runs a LIGHTWEIGHT inspection pass and reports the results to the user. The check is INFORMATIONAL — it does NOT block closure; the user decides whether the signals warrant closing now or pausing. Empty inspection items are skipped silently in the report (do not enumerate "no inbox items" as a line; just omit). For each non-empty item, report what was found with enough detail that the user can decide whether it changes their closure choice.

The thread root is a folder under `docs/threads/` named with a UTC timestamp slug (e.g., `docs/threads/250522143000Z-my-feature/`). If the current working directory already sits inside a thread root, use that. If multiple thread roots exist and the active one is ambiguous, ASK the user — do not silently pick the most recent timestamp.

The thread root contains a standard set of subfolders:

- `proposals/` — emitted proposal artifacts
- `specs/` — emitted spec artifacts
- `plans/` — emitted plan artifacts
- `discussions/` — emitted discussion and decision-log artifacts
- `inbox/open/` — unaddressed findings and follow-ups (record files with artifact-type suffixes such as `-inbox-item.md` or `-review-finding.md`)
- `inbox/processed/` and `inbox/dropped/` — items that have been triaged out of open

**Inspection items:**

1. **Final artifacts present.** Inspect the thread root and report which of the four content folders have content:
   - `proposals/` — emitted proposal artifacts (any version count)
   - `specs/` — emitted spec artifacts (any version count)
   - `plans/` — emitted plan artifacts (any version count)
   - `discussions/` — emitted discussion and decision-log artifacts (any count)

   Report each non-empty folder by name and artifact count (e.g., `proposals/: 2 files`, `specs/: 1 file`, `plans/: 1 file`, `discussions/: 4 files`). If none of the four folders have content, say so explicitly (`No final artifacts under proposals/, specs/, plans/, discussions/`) — that itself is a signal worth surfacing before closure.

2. **Open Inbox items.** Inspect `inbox/open/` and report any items present:
   - Enumerate by filename and artifact-type suffix (`-inbox-item.md` vs `-review-finding.md` — both are valid record artifacts in `inbox/open/`).
   - Open items represent unaddressed findings or follow-ups — they have not yet been moved to `inbox/processed/` or `inbox/dropped/`. Inbox state is expressed by which subfolder the file lives in, not by any field inside the file. Each open item is a signal that some work the thread surfaced has not been triaged. The user may legitimately decide an open item is a parked deferral and not a blocker — but the closure conversation needs to see them.
   - If `inbox/open/` is empty or does not exist, skip this report line entirely.

3. **Implementation commits / status.** Inspect recent commits on the current branch and report the branch state. Suggested invocation:
   - `git status --short` (working-tree state — staged, unstaged, untracked)
   - `git log --oneline -20` (or equivalent — last commits on the current branch)
   - `git rev-parse --abbrev-ref HEAD` (current branch name)

   Report the branch name, whether the branch has uncommitted changes (and a short summary of the dirty paths if dirty), and a brief 1–2 line summary of the recent commit subjects so the user can recognize whether the thread's implementation has actually landed in commits or whether changes are still in flight.

4. **Obvious unresolved workflow concerns.** Inspect for signals that suggest closure may be premature. Includes:
   - **Uncommitted changes** in the worktree (`git status --short` non-empty) — folding mid-flight changes into a merge or discarding them on `leave as is` is a closure trade-off the user should see explicitly.
   - **Pending review-finding records** under `inbox/open/` with a `-review-finding.md` suffix — these have not yet been addressed in a follow-up version of the artifact they reviewed. Closing the thread while review-findings sit open is legitimate (they may be deferred or parked), but it is a trade-off worth surfacing.
   - **Conflict markers in merged artifacts** — if any artifact under `proposals/` / `specs/` / `plans/` contains a literal `<!-- CONFLICT:` marker, the conflict has not yet been resolved into a successor version. Surface as a concern.
   - **Other obvious signals** at the executor's discretion — e.g., a thread that has `plans/` but no recent commits suggests the plan has not been implemented; a thread with `specs/` but no `plans/` may be ready for a planning pass before finish; a thread with two competing spec versions at the same mainline integer without a promoted successor suggests a merge step was skipped.

   Empty concerns are skipped silently. Surface only concerns that were actually detected.

After surfacing the inspection results, ASK the closure question (next section). The thread check is INFORMATIONAL — the user decides whether the signals warrant closing now or pausing.

## Closure Question

After the thread check report, ASK the user the closure question. The FOUR options are enumerated below by literal option-name label — the EXACT phrasing the user can choose from:

1. **`merge into main`** — checkout `main` (or the repo's default branch — detect via `git symbolic-ref refs/remotes/origin/HEAD` or equivalent; if unclear, ASK the user which branch is the integration target). Merge the current branch into the target. Push the result.
2. **`merge into other branch`** — same flow as `merge into main` but the target is a USER-SUPPLIED branch name. ASK the user for the target branch before running any git command.
3. **`create PR`** — push the current branch to its remote, then invoke `gh pr create` (or instruct the user manually if `gh` is unavailable in the runtime). The skill MAY draft a suggested PR title and body based on the thread's artifacts (e.g., title from the thread slug, body summarizing recent commits and citing artifacts) — the user reviews and confirms before submission.
4. **`leave as is`** — report the current branch state (branch name, commit count, file count, working-tree state) and STOP. No git operation runs. The skill exits cleanly.

Present the four options to the user as the closure question. Suggested phrasing (the four option-name labels are NOT optional — they must appear verbatim so a downstream reader of this skill body can grep them out):

```text
Thread check complete. How do you want to close this thread?

1. merge into main           — checkout the default branch, merge, push
2. merge into other branch   — same flow with a target branch you supply
3. create PR                 — push the current branch and open a pull request
4. leave as is               — report the current state and stop

Pick one.
```

Wait for the user's choice. Do NOT pick silently. Do NOT default to one if the user is ambiguous — ASK again with the option list re-presented.

## Branch Operations

This section documents per-option behaviors. For each non-leave option, the skill MUST ask for user confirmation BEFORE running each git command. The skill does NOT batch confirmations — each git command is its own confirmation gate. If a git command fails, REPORT the failure verbatim, STOP the run, do NOT retry, and do NOT attempt recovery via history rewriting.

### Option 1: `merge into main`

1. Detect the integration target (`main`, `master`, or the repo's default branch — detected via `git symbolic-ref refs/remotes/origin/HEAD`, or by reading the repo's CI configuration / project README, or by ASKING the user). Confirm the detected target with the user before proceeding.
2. ASK confirmation: "Checkout `<target>` and merge `<current-branch>`? This will run: `git checkout <target>; git pull; git merge <current-branch>; git push`."
3. On user confirmation, run the four commands in sequence. Surface the output of each command. If any command fails, STOP and report the failure.
4. Do NOT use `git push --force` or `git push --force-with-lease`. Do NOT use `git merge --no-ff` unless the user explicitly requests it. Do NOT use `git rebase` to "clean up" before merge. Do NOT use `git commit --amend` to fix the merge commit. None of those.

### Option 2: `merge into other branch`

Same as Option 1 with the target branch supplied by the user. ASK for the target branch name BEFORE detecting / pulling / merging. The rest of the flow is identical:

1. ASK the user for the target branch name.
2. ASK confirmation: "Checkout `<user-supplied-target>` and merge `<current-branch>`? This will run: `git checkout <target>; git pull; git merge <current-branch>; git push`."
3. On confirmation, run the four commands in sequence. Same failure-handling and same forbidden-construct list as Option 1.

### Option 3: `create PR`

1. Detect or ASK the integration base branch (typically `main`) — the PR will target this branch.
2. ASK confirmation: "Push `<current-branch>` to `origin` and open a PR against `<base>`?"
3. On confirmation, push: `git push -u origin <current-branch>`. If `gh` is available in the runtime, invoke `gh pr create --base <base> --title "<draft-title>" --body "<draft-body>"`. If `gh` is NOT available, REPORT the push result and instruct the user how to open the PR manually (e.g., "Push complete. Open the PR at <repo-url>/pull/new/<current-branch>"). Do NOT silently fail if `gh` is missing — surface the missing tool to the user.
4. Cite the PR URL (if returned by `gh`) in the final message. Do NOT clean up the working tree, do NOT delete the branch, do NOT switch off the current branch — the user typically needs the branch alive to iterate on PR feedback.

### Option 4: `leave as is`

Report the current state and STOP. Do not run any git command. The report includes:

- Current branch name.
- Commit count on the current branch since the merge-base with `main` (or the detected default branch) — surfaces "how much work lives on this branch".
- Working-tree state summary (clean vs dirty; if dirty, list the modified paths from `git status --short`).
- A one-sentence reminder that the thread is left in place; nothing was committed, merged, pushed, or discarded.

### NEVER force-push, NEVER rewrite history

This skill NEVER force-pushes and NEVER rewrites history. Forbidden constructs — enumerated explicitly so a downstream reader can grep them out:

- `git commit --amend` — NEVER. Even for typos in the merge commit subject. The user can amend manually outside this skill if they want; this skill does not amend.
- `git rebase` (in ANY flavor — `rebase`, `rebase -i`, `rebase --onto`, `rebase --interactive`, autosquash, autostash) — NEVER. Not before a merge, not to clean up the local branch, not for any reason.
- `git push --force` and `git push --force-with-lease` (and the `-f` shorthand for either) — NEVER. Not to any remote, not to any branch, not even when the remote is "behind". A force-push silently overwrites the remote's history; the user's collaborators see commits disappear without warning.
- `git reset --hard` against history that has been pushed — NEVER. Rewinding pushed history is force-push by another name once the user next pushes.
- `git filter-branch` and `git filter-repo` — NEVER. Both are history-rewriting tools. Out of scope for this skill regardless of intent.

The history this skill produces is append-only: merges and pushes add commits; the skill does NOT modify, amend, rebase, or delete commits that already exist.

If a merge or push needs revising after the fact (a wrong merge target, a merge that broke a downstream build, a commit subject typo on the merge commit), that is the surrounding session's decision and the user's command — not this skill's responsibility, and not recoverable via any history-rewriting construct from inside this run. If a git command fails (merge conflict, pre-receive hook rejection, lint failure, protected-branch rejection), the skill STOPS and reports — the user resolves the failure explicitly. There is no failure-recovery path that rewrites history inside this skill.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Run the Thread Check.** Walk the four inspection items from `## Thread Check`. Skip empty items silently. Compose the inspection report.

3. **Surface the inspection results.** Present the report to the user. If any item raised an obvious concern (open inbox items, uncommitted changes, pending review-findings, conflict markers in artifacts), flag it explicitly in the report so the closure conversation has the evidence visible.

4. **ASK the closure question.** Present the FOUR options per `## Closure Question` (`merge into main` / `merge into other branch` / `create PR` / `leave as is`). Wait for the user's choice. Do NOT pick silently.

5. **Branch on the user's choice.** Execute the corresponding flow per `## Branch Operations`. ASK for confirmation BEFORE each git command. Report each command's output verbatim. STOP and report on any command failure — do NOT retry, do NOT attempt recovery via history rewriting.

6. **Push back per the Anti-Sycophancy Stance when warranted.** If the user's closure choice conflicts with what the thread check surfaced (open inbox items, uncommitted changes, pending review-findings, conflict markers), push back BEFORE the git command runs. If the user accepts the trade-off after the push-back, execute the choice and include the dissent in the final message. If the user provides new context that resolves the concern, execute the choice without dissent.

7. **Final message.** Report the outcome. Examples — exact wording at executor discretion:
   - `Merged into main and pushed.` (cite the merge commit SHA if useful)
   - `PR created: <pr-url>` (or the manual instruction if `gh` was unavailable)
   - `Left as is. Current branch: <branch>, <N> commits ahead of <base>.`

   If the closure executed AFTER an anti-sycophancy dissent, append the dissent: `Note: flagged <signal>; user accepted the trade-off.`

   No closing remark.

## Commit Policy

This skill does NOT auto-commit any artifact that this skill itself produces — the skill produces no artifacts (no spec, no plan, no proposal, no decision log, no inbox item, no review-finding). What the skill DOES run is git commands within the user-chosen flow — `git checkout`, `git pull`, `git merge`, `git push`, `git push -u origin <branch>`, `gh pr create`. Those commands produce commits or merges (e.g., `git merge` produces a merge commit on the target branch). The user MUST confirm each command BEFORE execution per `## Branch Operations`. The skill does NOT stage files, does NOT run `git add`, does NOT run `git commit` directly, and does NOT push without the user's explicit choice of an option that requires a push (Options 1, 2, 3).

The skill does NOT rewrite history. See `## Branch Operations` → `### NEVER force-push, NEVER rewrite history` for the forbidden-constructs list.

## Immutability

This skill reads thread artifacts READ-ONLY. The Thread Check inspection reads artifacts under `proposals/`, `specs/`, `plans/`, `discussions/`, and `inbox/open/` but does NOT edit them, does NOT rewrite them, does NOT add frontmatter to them, and does NOT propose edits to their bodies during the inspection.

The skill does NOT add or remove items under `inbox/open/` — items stay in `open/` (they were emitted by a review pass or by an inbox-capture step and are part of the thread's reviewable history). Inbox state transitions (`open/` → `processed/` or `open/` → `dropped/`) are manual file moves performed outside this skill, by design. Inbox state is expressed by which subfolder a file lives in, not by any field inside the file itself.

The skill does NOT modify the spec / plan / proposal / discussion / decision-log artifacts it inspects. If the closure conversation surfaces a finding that warrants a revision to one of those artifacts (e.g., the user realizes the spec is incomplete and needs a follow-up version), the revision is a NEW version of that artifact produced in a separate authoring pass — NOT an in-place edit by this skill.

No closure metadata is added by this skill to any artifact — there is no `Closed:`, no `Finished:`, no `Merged:` field added. Closure is recorded in git history (via the merge commit, the push, or the PR), not in metadata on the thread artifacts.
