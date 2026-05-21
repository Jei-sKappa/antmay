---
name: finish
description: Close a V1 workflow thread by running a lightweight 4-item thread check (final artifacts present in `proposals/` / `specs/` / `plans/` / `discussions/`, open Inbox items in `inbox/open/`, recent implementation commits on the current branch, obvious unresolved workflow concerns) and then ASKING the user the closure question with FOUR options — `merge into main` / `merge into other branch` / `create PR` / `leave as is` — confirming each git command BEFORE execution and NEVER force-pushing, NEVER rewriting history (no `--amend`, no `rebase` in any flavor, no `git push --force` / `--force-with-lease`, no `git reset --hard` against pushed history, no `git filter-branch`, no `git filter-repo`). This is the SINGLE V1 skill with NO `-auto` / `-interactive` sibling — an intentional EXCEPTION to the V1 mode-variant convention per D97 because branch disposition is inherently user-directed and there is no autonomous default that would be safe across users / repos / branch contexts. Carries the 4-marker anti-sycophancy stance from `discussion` verbatim plus a closure-stance amplifier — branch operations are hard to undo, push back if the user picks an option that would lose work. Use when implementation is complete (or the thread is otherwise in a stop-and-decide state) and you want the agent to surface the thread's signals and walk the user through the closure choice without picking by default.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Finish

Close a V1 workflow thread by running a lightweight 4-item thread check, surfacing the inspection results to the user, and ASKING the closure question with four enumerated options — `merge into main` / `merge into other branch` / `create PR` / `leave as is`. On the user's choice, execute the corresponding flow with explicit per-command confirmation. NEVER force-push, NEVER rewrite history.

This skill is the SINGLE V1 workflow skill WITHOUT `-auto` / `-interactive` siblings — the ONLY V1 skill where the mode-variant convention does NOT apply. This is an intentional EXCEPTION per D97. The reason: branch disposition is inherently user-directed. The closure question requires a human choice — there is no autonomous default that would be safe across users (some prefer PR-only flows; others merge locally and push), across repos (some have protected `main` branches that reject direct merges; others do not), or across branch contexts (a long-lived feature branch with multiple collaborators is not the same as a single-author sandbox). Picking silently would hide a real decision behind a heuristic, and the cheapest way to surface that decision is to ASK every time. The skill body and the description both acknowledge this single-skill V1 exception explicitly.

Citations: V1 thread layout, filename grammar, and immutability rules are owned by Phase 1 and live at `docs/workflow/v1/thread-layout.md`, `docs/workflow/v1/filename-grammar.md`, and `docs/workflow/v1/immutability.md`. The companion overview lives at `docs/workflow/v1/README.md`. This skill cites each of those by absolute path the first time it invokes a rule from them; later citations are by short reference. Anti-sycophancy stance is carried verbatim from `skills/discussion/SKILL.md`. The 4-option closure menu and the do-not-force-push / do-not-rewrite-history discipline are inspired by `.library/sources/obra_superpowers/skills/finishing-a-development-branch/SKILL.md` per D97; that skill is design inspiration only and is not loaded or referenced at runtime.

## Anti-Sycophancy Stance

Your job is to help the user reach the right closure choice for the thread, not to make them feel good about whatever they pick first. Treat the closure decision as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **branch operations are hard to undo, push back if the user picks an option that would lose work**. A closure that silently merges a half-finished branch into `main` because the user said "merge it" without addressing the open Inbox findings has produced an outcome the user will regret — the cheap moment to push back is during the closure question, before any git command runs. Once a merge lands on `main` and is pushed, undoing it is expensive (`git revert`, force-push to a protected branch is forbidden, coordinated rollback with collaborators); once a discard happens, work is gone. The cheap moment for the closure decision to do its job is BEFORE the choice is locked in.

This is the V1 review stance, sharpened for closure: push back hard on weak reasoning or hidden assumptions; never soften a recommended pause just because the user wants to move on. A finish flow whose only effect is to execute whatever the user asked for without surfacing the open Inbox items, the uncommitted changes, or the pending review-finding records has stopped finishing and started rubber-stamping. The thread check exists precisely to give the closure conversation evidence to work with.

Hold these together:

- **Disagree when you disagree.** If the user's closure choice conflicts with the evidence the thread check surfaced (open inbox items that look blocking, pending review-finding records, uncommitted changes that suggest mid-flight work), say so plainly before executing any git command. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user picks `merge into main` for a reason that doesn't hold up — "it's fine", "we'll address the inbox later", "the open review-findings are nits", "the uncommitted changes don't matter" — name the gap, surface the substance of the open signal, and bring it into the conversation before the git command runs. A future reader of `main` will not have you to ask follow-ups. This is the last cheap moment.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences — raise them, even if the user wants to move on. Branch operations are hard to undo. Better captured as a question NOW than rediscovered when a teammate runs `git log` next week.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the thread check, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument. ("The open inbox items are V2 deferrals, not blockers for this thread's closure" is real information.)
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never proceed with a closure command just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the closure differently, identify the exact assumption or value judgment causing the split (e.g., "is this inbox item a blocker or a parked deferral?"), then resolve THAT before the git command runs.
- **Refuse to log silently a closure you believe is wrong.** If the user insists on a closure option you believe will lose work (e.g., `merge into main` while the thread check surfaced unresolved review-finding records, or `leave as is` while uncommitted changes look genuinely lost), execute the choice they made BUT include the dissent in the final message: state the option they chose, state the signal you flagged, and state that the user accepted the trade-off. The closure goes through — but the trail records the dissent for whoever reads the thread next. Branch operations are hard to undo — push back if the user picks an option that would lose work.
- **Keep the closure owned by the evidence.** The goal is not for either side to win. The goal is to record a closure that survives later scrutiny because the thread's signals, the open work, and the trade-offs were actually considered.

If you believe a closure option would silently lose work — uncommitted changes folded into a merge the user did not realize would pick them up, open review-findings ignored at merge time, a discard the user has not confirmed they want — refuse to execute it silently. Either resolve the disagreement first, OR execute the closure with the dissent surfaced in the final message. The cheap moment for the closure to do its job is during the question — once the branch operation lands, the cost compounds.

## Thread Check

Before the closure question, this skill runs a LIGHTWEIGHT inspection pass and reports the results to the user. The check is INFORMATIONAL — it does NOT block closure; the user decides whether the signals warrant closing now or pausing. The check surfaces FOUR inspection items per D98, FNSH-02. Empty inspection items are skipped silently in the report (do not enumerate "no inbox items" as a line; just omit). For each non-empty item, report what was found with enough detail that the user can decide whether it changes their closure choice.

1. **Final artifacts present.** Inspect the active thread root at `docs/threads/<thread>/` per `docs/workflow/v1/thread-layout.md` and report which of the V1 folders have content:
   - `proposals/` — emitted proposal artifacts (any version count)
   - `specs/` — emitted spec artifacts (any version count)
   - `plans/` — emitted plan artifacts (any version count)
   - `discussions/` — emitted discussion and decision-log artifacts (any count)

   Report each non-empty folder by name and artifact count (e.g., `proposals/: 2 files`, `specs/: 1 file`, `plans/: 1 file`, `discussions/: 4 files`). If none of the four folders have content, say so explicitly (`No final artifacts under proposals/, specs/, plans/, discussions/`) — that itself is a signal worth surfacing before closure.

2. **Open Inbox items.** Inspect `docs/threads/<thread>/inbox/open/` per `docs/workflow/v1/thread-layout.md` and report any items present:
   - Enumerate by filename (relative to `inbox/open/`) and the artifact-type suffix (`inbox-item` vs `review-finding` — per `docs/workflow/v1/filename-grammar.md` "Recognized V1 Artifact-Type Tokens", both are valid record artifacts in `inbox/open/`).
   - Open items represent UNADDRESSED findings or follow-ups — they have not yet been moved to `inbox/processed/` or `inbox/dropped/` per the state-by-folder rule in `docs/workflow/v1/thread-layout.md`. Each open item is a signal that some work the thread surfaced has not been triaged. The user may legitimately decide an open item is a parked V2 deferral and not a blocker — but the closure conversation needs to see them.
   - If `inbox/open/` is empty or does not exist, skip this report line entirely. Empty inspection items are NOT enumerated.

3. **Implementation commits / status.** Inspect recent commits on the current branch and report the branch state. Suggested invocation:
   - `git status --short` (working-tree state — staged, unstaged, untracked)
   - `git log --oneline -20` (or equivalent — last commits on the current branch)
   - `git rev-parse --abbrev-ref HEAD` (current branch name)

   Report the branch name, whether the branch has uncommitted changes (and a short summary of the dirty paths if dirty), and a brief 1–2 line summary of the recent commit subjects so the user can recognize whether the thread's implementation has actually landed in commits or whether changes are still in flight. The audit trail of WHAT happened during the thread is what the user is weighing closure against — surfacing it cheaply here is the point of the check.

4. **Obvious unresolved workflow concerns.** Inspect for signals that suggest closure may be premature. Includes:
   - **Uncommitted changes** in the worktree (`git status --short` non-empty) — folding mid-flight changes into a merge or discarding them on `leave as is` is a closure trade-off the user should see explicitly.
   - **Pending review-finding records** under `inbox/open/<UTC>-<kebab-desc>-review-finding.md` — these were emitted by a `review-*` skill and have not yet been addressed in a follow-up version of the artifact they reviewed. Closing the thread while review-findings sit open is legitimate (they may be `deferred` or `parked`), but it is a trade-off worth surfacing.
   - **Conflict markers in merged artifacts** — if any artifact under `proposals/` / `specs/` / `plans/` contains a literal `<!-- CONFLICT:` marker preserved by `merge-artifacts-auto` per D103, the conflict has not yet been resolved into a successor version. Surface as a concern.
   - **Other obvious signals** at the executor's discretion — e.g., a thread that has `plans/` but no recent commits suggests the plan has not been implemented; a thread with `specs/` but no `plans/` may be ready for a planning pass before finish; a thread with two competing spec versions at the same mainline integer (`v2-stricter` + `v2-impl-ready` without a promoted `v2`) suggests a merge step was skipped.

   Empty concerns are skipped silently. Surface only concerns that were actually detected.

After surfacing the inspection results, ASK the closure question (next section). The thread check is INFORMATIONAL — the user decides whether the signals warrant closing now or pausing.

## Closure Question

After the thread check report, ASK the user the closure question. The FOUR options per D98, FNSH-03 are enumerated below by literal option-name label — the EXACT phrasing the user can choose from:

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

This is the same git-discipline language carried by `skills/implement-plan-auto/SKILL.md` and `skills/implement-plan-interactive/SKILL.md` (the Phase 5 plan-driven implementation pair). The history this skill produces is append-only: merges and pushes add commits; the skill does NOT modify, amend, rebase, or delete commits that already exist.

If a merge or push needs revising after the fact (a wrong merge target, a merge that broke a downstream build, a commit subject typo on the merge commit), that is the surrounding session's decision and the user's command — not this skill's responsibility, not within this skill's mandate, and not recoverable via any history-rewriting construct from inside this skill's run. If a git command fails (merge conflict, pre-receive hook rejection, lint failure, protected-branch rejection), the skill STOPS and reports — the user resolves the failure explicitly. There is no failure-recovery path that rewrites history inside this skill.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

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

This skill reads thread artifacts READ-ONLY per `docs/workflow/v1/immutability.md`. The Thread Check inspection reads artifacts under `proposals/`, `specs/`, `plans/`, `discussions/`, and `inbox/open/` but does NOT edit them, does NOT rewrite them, does NOT add frontmatter to them, and does NOT propose edits to their bodies during the inspection.

The skill does NOT add or remove items under `inbox/open/` — items stay in `open/` (they were emitted by `review-*-auto` or by `capture-inbox` and are part of the thread's reviewable history). Inbox state transitions (`open/` → `processed/` or `open/` → `dropped/`) are manual file moves performed outside this skill, by design per `docs/workflow/v1/thread-layout.md` and `docs/workflow/v1/immutability.md` ("emitted artifacts are immutable; status is a property of the folder, not of the file").

The skill does NOT modify the spec / plan / proposal / discussion / decision-log artifacts it inspects. If the closure conversation surfaces a finding that warrants a revision to one of those artifacts (e.g., the user realizes the spec is incomplete and needs a follow-up version), the revision is a NEW version of that artifact authored by the appropriate authoring skill (`spec-auto` / `spec-interactive` / `plan-loose-*` / `plan-strict-*` / `adjust-plan-granularity-*` / `discussion` / `seeded-discussion` / `merge-artifacts-*`) — NOT an in-place edit by this skill.

No source-relation YAML frontmatter is added by this skill to any artifact — there is no `Closed:`, no `Finished:`, no `Merged:` field added to any V1 artifact. Closure is recorded in git history (via the merge commit, the push, or the PR), not in metadata on the workflow artifacts per `docs/workflow/v1/immutability.md` ("No Source-Relation Frontmatter").
