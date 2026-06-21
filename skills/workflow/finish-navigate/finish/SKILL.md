---
name: finish
description: Perform a thread's terminal handshake — set the spec's implemented latch, append closed:done to the ledger, update the living docs, close the linked ticket with its backlink — then run a lightweight thread check and ask the user how to dispose of the branch (merge into main, merge into another branch, create a PR, or leave as-is) when the work is complete.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Finish

Finish performs the workflow's single terminal handshake, then disposes of the branch. In ONE finish action it: (1) updates the living docs so the canonical project documentation reflects how the system now works; (2) sets the spec's `status.implemented` latch in the spec's frontmatter `status:` map; (3) appends `closed: done` to the thread's `ledger.md`; and (4) closes the linked ticket, ensuring the ticket carries the one permalink backlink to the thread. After the handshake, it runs a lightweight thread check, surfaces the results, and ASKS the closure question with four enumerated options — `merge into main` / `merge into other branch` / `create PR` / `leave as is` — executing the chosen flow with explicit per-command confirmation. NEVER force-push, NEVER rewrite history.

This skill restates the rules it relies on inline; it does not depend on any document outside its own folder.

Branch disposition is inherently user-directed. The closure question requires a human choice — there is no autonomous default that would be safe across users (some prefer PR-only flows; others merge locally and push), across repos (some have protected `main` branches that reject direct merges; others do not), or across branch contexts (a long-lived feature branch with multiple collaborators is not the same as a single-author sandbox). Picking silently would hide a real decision behind a heuristic, and the cheapest way to surface that decision is to ASK every time.

## Anti-Sycophancy Stance

Your job is to help the user reach the right closure choice for the thread, not to make them feel good about whatever they pick first. Treat the closure decision as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **branch operations are hard to undo, push back if the user picks an option that would lose work**. A closure that silently merges a half-finished branch into `main` because the user said "merge it" without addressing the open review findings has produced an outcome the user will regret — the cheap moment to push back is during the closure question, before any git command runs. Once a merge lands on `main` and is pushed, undoing it is expensive (`git revert`, force-push to a protected branch is forbidden, coordinated rollback with collaborators); once a discard happens, work is gone. The cheap moment for the closure decision to do its job is BEFORE the choice is locked in.

Push back hard on weak reasoning or hidden assumptions; never soften a recommended pause just because the user wants to move on. A finish flow whose only effect is to execute whatever the user asked for without surfacing the open review findings, the uncommitted changes, or an unimplemented spec has stopped finishing and started rubber-stamping. The thread check exists precisely to give the closure conversation evidence to work with.

Hold these together:

- **Disagree when you disagree.** If the user's closure choice conflicts with the evidence the thread check surfaced (undisposed reviews that look blocking, an unimplemented spec at tier ≥2, uncommitted changes that suggest mid-flight work), say so plainly before executing any git command. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user picks `merge into main` for a reason that doesn't hold up — "it's fine", "we'll handle the open reviews later", "the open findings are nits", "the uncommitted changes don't matter" — name the gap, surface the substance of the open signal, and bring it into the conversation before the git command runs. A future reader of `main` will not have you to ask follow-ups. This is the last cheap moment.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences — raise them, even if the user wants to move on. Branch operations are hard to undo. Better captured as a question NOW than rediscovered when a teammate runs `git log` next week.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the thread check, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument. ("The open findings are future deferrals, not blockers for this thread's closure" is real information.)
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never proceed with a closure command just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the closure differently, identify the exact assumption or value judgment causing the split (e.g., "is this open review finding a blocker or a parked deferral?"), then resolve THAT before the git command runs.
- **Refuse to log silently a closure you believe is wrong.** If the user insists on a closure option you believe will lose work (e.g., `merge into main` while the thread check surfaced undisposed reviews, or `leave as is` while uncommitted changes look genuinely lost), execute the choice they made BUT include the dissent in the final message: state the option they chose, state the signal you flagged, and state that the user accepted the trade-off. The closure goes through — but the trail records the dissent for whoever reads the thread next. Branch operations are hard to undo — push back if the user picks an option that would lose work.
- **Keep the closure owned by the evidence.** The goal is not for either side to win. The goal is to record a closure that survives later scrutiny because the thread's signals, the open work, and the trade-offs were actually considered.

If you believe a closure option would silently lose work — uncommitted changes folded into a merge the user did not realize would pick them up, undisposed reviews ignored at merge time, a discard the user has not confirmed they want — refuse to execute it silently. Either resolve the disagreement first, OR execute the closure with the dissent surfaced in the final message. The cheap moment for the closure to do its job is during the question — once the branch operation lands, the cost compounds.

## The Terminal Handshake

Finish is the workflow's single terminal handshake. The repo's thread lifecycle and the external tracker's work-item status link once — at the seed (`External:` line) — and shake hands exactly ONCE, here, at finish. They never continuously mirror; continuous mirroring is exactly the dual-tracking that rots. The handshake closes three things together in ONE finish action:

- the **spec** → `implemented` (its frontmatter latch),
- the **ledger** → `closed: done`,
- the **ticket** → closed (when one is linked).

Run the handshake before the closure question, once the user has confirmed the work is complete and ready to seal. It applies to a thread that carries a spec to seal (tier ≥2 work). For a tier-0/1 thread with no spec, there is no spec latch to set; still append `closed: done` to the ledger and close the ticket if one is linked. Each step below is idempotent in spirit — if a step is already done (latch already present, `closed: done` already the ledger's last disposition, ticket already closed, backlink already posted), do not redo or duplicate it; report it as already done.

Path references throughout: within-thread paths are **thread-relative** (`specs/001/spec.md`, `ledger.md`); cross-thread and external paths are **repo-relative** (`docs/threads/<other>/…`); **never absolute.** The ticket backlink's permalink is the exception — it points at the thread folder from an external system, so it uses whatever stable URL/permalink the tracker requires.

### 1. Update the living docs

Update the canonical project documentation that describes how the system now works — the **living docs** of the two-document model. The spec is **frozen history**: a snapshot of what was agreed and built, sealed at `implemented`. The living docs are the **evergreen description** of how the system currently works. To reflect what this thread changed, **update the living docs — never edit the implemented (now frozen) spec.** Identify the project's living documentation (e.g. the architecture docs, the README, the component/reference docs the project maintains) and bring it current with what landed in this thread. If the project has no living docs to update, say so in the final report and continue — do not invent a document model the project does not have.

### 2. Set the spec's `status.implemented` latch

In the spec's YAML frontmatter `status:` map, set the **`implemented` latch**, stamped with a 12-character `YYMMDDHHMMSSZ` UTC stamp computed at write time. This is **set-once**: if `status.implemented` is already present, do not re-stamp it. The human's earlier approval already set `status.approved`; finish adds `status.implemented` beneath it. The latch lives **inside** the `status:` map — never as a loose top-level key, never collapsed into a single status value. Setting this latch **freezes the spec**: after `implemented`, the spec's body and frontmatter are frozen history and are not edited.

The intended frontmatter shape after finish:

```yaml
version: <int>

status:
  approved: <YYMMDDHHMMSSZ>      # the human's earlier sign-off
  implemented: <YYMMDDHHMMSSZ>   # set here, at finish
```

The exact YAML spelling is free as long as both latches nest under `status:`. The derived condition (Draft → In Review → Approved → Implemented) is never written down — once `status.implemented` is present, the spec's condition derives to Implemented.

### 3. Append `closed: done` to the ledger

In the **same finish action**, append `closed: done` to the thread's lifecycle ledger. The ledger is the file **`ledger.md`** at the **thread root** (not in `seed/`). It is **append-only** with a strict line grammar — only transitions are written, never the resting default, and the current value of each key is its last line.

Every ledger event line is exactly:

```text
<event> @ <YYMMDDHHMMSSZ> — <justification>
```

The disposition events are `deferred`, `resumed`, `closed: done`, `closed: dropped`. The `— <justification>` is **mandatory on every line**. Finish appends the disposition event `closed: done` with a stamp and a justification, e.g.:

```text
closed: done @ 260625120000Z — spec implemented, verified, ticket closed
```

Do not rewrite earlier ledger lines; only append. If the ledger's last disposition is already `closed: done`, the thread is already sealed — do not append a duplicate.

### 4. Close the ticket (the terminal handshake) and ensure the backlink

Read the seed's **`External:` line** — the single join point between the repo and the tracker. If it carries `none` (no ticket — allowed for tier 0–1 personal work where the repo is the sole owner), there is **no ticket to close**: skip this step cleanly. If it carries a ticket URL, close the ticket and ensure its backlink:

- **Preflight the tracker first.** Closing the ticket and posting the backlink need the tracker's CLI/API. Before touching the ticket, check the tracker tool is available. If it is **missing**, do NOT fail mid-way: warn cleanly, tell the user the ticket could not be closed (and which ticket), and continue the rest of finish — leave the ticket-touching step for the user to do manually. Preflight comes before any side-effecting ticket step.
- **Ensure exactly one backlink comment (FR-D6.4).** A linked ticket must carry **one** comment with a **permalink back to the thread folder** — a one-time backlink, not continuous mirroring. `open-thread` posts this when it links the ticket; if it did **not** already do so, post it now. First check whether a backlink comment already exists; post one only if none does. Ensure **exactly one** such backlink exists — **do not double-post.**
- **Close the ticket** (transition its work-item status to closed/done in the tracker).

After this step the three layers have shaken hands exactly once: spec → `implemented`, ledger → `closed: done`, ticket → closed.

### The freeze guard is downstream, and finish never relies on it

From the finish commit forward, a freeze guard enforces the freeze (`closed:` rejects further diffs; an `implemented` spec is frozen even inside an open thread). **The guard never SETS status — finish sets it; the guard only reads the latches and the ledger to enforce the freeze afterward.** Finish writes the latch and the ledger line itself; it does not wait for or depend on any guard to do so. The diff that *adds* the `closed: done` line and *sets* the `implemented` latch is the act of freezing, so it is permitted — there is no chicken-and-egg.

## Thread Check

Before the closure question, this skill runs a LIGHTWEIGHT inspection pass and reports the results to the user. The check is INFORMATIONAL — it does NOT block closure; the user decides whether the signals warrant closing now or pausing. Empty inspection items are skipped silently in the report (do not enumerate "no open findings" as a line; just omit). For each non-empty item, report what was found with enough detail that the user can decide whether it changes their closure choice.

The thread root is a folder under `docs/threads/` named with a UTC timestamp slug (e.g., `docs/threads/250522143000Z-my-feature/`). If the current working directory already sits inside a thread root, use that. If multiple thread roots exist and the active one is ambiguous, ASK the user — do not silently pick the most recent timestamp.

The thread root holds `ledger.md` (the append-only tier + disposition ledger) plus a standard set of subfolders:

- `seed/` — the genesis bucket: the seed record, optional genesis source material, and genesis discussions
- `proposals/`, `specs/`, `plans/` — each holds **lineage folders** named `NNN[-<desc>]/` (e.g. `specs/001/`, `specs/002-cli/`); the artifact inside is `proposal.md` / `spec.md` / `plan.md`, with its own `discussions/` and `reviews/`
- `implementation/` — flat, records-only: implementation reports, plus `discussions/` and `reviews/`

There is no inbox — status is derived from the artifacts and the ledger, not from folder moves.

**Inspection items:**

1. **Final artifacts present.** Inspect the thread root and report which spine folders have content:
   - `proposals/` — emitted proposal lineage(s)
   - `specs/` — emitted spec lineage(s)
   - `plans/` — emitted plan lineage(s)
   - `implementation/` — emitted implementation reports
   - discussion / decision-log / review records (under the relevant `discussions/` and `reviews/` subfolders)

   Report each non-empty folder by name and artifact count (e.g., `specs/: 1 lineage`, `plans/: 1 lineage`, `implementation/: 1 report`). If none of the spine folders have content, say so explicitly — that itself is a signal worth surfacing before closure.

2. **Ledger state.** Read `ledger.md` at the thread root. Report the current **tier** (the last `tier:` line wins) and the current **disposition** (the last of `deferred` / `resumed` / `closed: done` / `closed: dropped`; absence of any disposition line means the thread is active). If the ledger already records `closed: done` or `closed: dropped` the thread is already sealed — surface that before doing anything else, because the handshake's ledger step would be a no-op and a branch operation on a sealed thread may be unintended.

3. **Open review findings.** Inspect the `reviews/` subfolders for review records whose frontmatter `status:` map has **no `disposed` entry** — an undisposed review is an open finding. Report any present: an open finding means some surfaced concern has not been resolved into a revised artifact. The user may legitimately decide an open finding is a parked deferral and not a blocker — but the closure conversation needs to see them. If there are none, skip this report line entirely.

4. **Implementation commits / status.** Inspect recent commits on the current branch and report the branch state. Suggested invocation:
   - `git status --short` (working-tree state — staged, unstaged, untracked)
   - `git log --oneline -20` (or equivalent — last commits on the current branch)
   - `git rev-parse --abbrev-ref HEAD` (current branch name)

   Report the branch name, whether the branch has uncommitted changes (and a short summary of the dirty paths if dirty), and a brief 1–2 line summary of the recent commit subjects so the user can recognize whether the thread's implementation has actually landed in commits or whether changes are still in flight.

5. **Obvious unresolved workflow concerns.** Inspect for signals that suggest closure may be premature. Includes:
   - **Uncommitted changes** in the worktree (`git status --short` non-empty) — folding mid-flight changes into a merge or discarding them on `leave as is` is a closure trade-off the user should see explicitly.
   - **Undisposed reviews** under any `reviews/` subfolder (a review record with no `status.disposed` entry) — its finding has not yet been resolved into a revised artifact. Closing the thread while findings sit open is legitimate (they may be deferred or parked), but it is a trade-off worth surfacing.
   - **Conflict markers in artifacts** — if any artifact under `proposals/` / `specs/` / `plans/` contains a literal `<!-- CONFLICT:` marker, the conflict has not yet been resolved. Surface as a concern.
   - **An unapproved or unimplemented spec at tier ≥2** — a spec lineage whose frontmatter carries no `status.approved` (never signed off), or `status.approved` but not yet `status.implemented` while you are about to seal the thread (finish itself sets `implemented`, so this is a flag only when finish's handshake has not yet run). The tier comes from the ledger; tier ≥2 work is expected to carry an approved spec.
   - **Other obvious signals** at the executor's discretion — e.g., a thread that has `plans/` but no recent commits suggests the plan has not been implemented; a thread with `specs/` but no `plans/` may be ready for a planning pass before finish.

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

2. **Run the Thread Check.** Walk the inspection items from `## Thread Check` (final artifacts, ledger state, open review findings, branch commits/status, unresolved concerns). Read `ledger.md` for the current tier and disposition. Skip empty items silently. Compose the inspection report.

3. **Surface the inspection results.** Present the report to the user. If any item raised an obvious concern (uncommitted changes, undisposed reviews, conflict markers, an unapproved/unimplemented spec at tier ≥2, an already-sealed ledger), flag it explicitly so the closure conversation has the evidence visible.

4. **Confirm the thread is ready to seal, then perform the terminal handshake.** Once the user confirms the work is complete and ready to finish, run the four handshake steps from `## The Terminal Handshake` in ONE finish action: (1) update the living docs; (2) set the spec's `status.implemented` latch (set-once, stamped); (3) append `closed: done @ <UTC> — <justification>` to `ledger.md`; (4) close the linked ticket and ensure its one permalink backlink (preflight the tracker first; skip cleanly if `External: none`; warn and continue if the tracker is unavailable). Skip any step already done; do not duplicate. For a tier-0/1 thread with no spec, there is no spec latch — still write the ledger line and close any linked ticket.

5. **ASK the closure question.** Present the FOUR options per `## Closure Question` (`merge into main` / `merge into other branch` / `create PR` / `leave as is`). Wait for the user's choice. Do NOT pick silently.

6. **Branch on the user's choice.** Execute the corresponding flow per `## Branch Operations`. ASK for confirmation BEFORE each git command. Report each command's output verbatim. STOP and report on any command failure — do NOT retry, do NOT attempt recovery via history rewriting. Commits and PRs SHOULD reference the linked ticket (in the merge/PR body) so the tracker's native auto-linking surfaces the work in the ticket's timeline.

7. **Push back per the Anti-Sycophancy Stance when warranted.** If the user's closure choice conflicts with what the thread check surfaced (uncommitted changes, undisposed reviews, conflict markers, an unimplemented spec), push back BEFORE the git command runs. If the user accepts the trade-off after the push-back, execute the choice and include the dissent in the final message. If the user provides new context that resolves the concern, execute the choice without dissent.

8. **Final message.** Report the outcome of both the handshake and the branch disposition. Examples — exact wording at executor discretion:
   - `Handshake done: spec implemented, ledger closed: done, ticket closed, living docs updated.` (or note any step skipped — e.g. `no ticket (External: none)`, `tracker unavailable — ticket not closed`)
   - `Merged into main and pushed.` (cite the merge commit SHA if useful)
   - `PR created: <pr-url>` (or the manual instruction if `gh` was unavailable)
   - `Left as is. Current branch: <branch>, <N> commits ahead of <base>.`

   If the closure executed AFTER an anti-sycophancy dissent, append the dissent: `Note: flagged <signal>; user accepted the trade-off.`

   No closing remark.

## Commit Policy

This skill does NOT auto-commit. It writes finish-handshake changes to disk — the living docs, the spec's `status.implemented` latch, and the `closed: done` ledger line — but it does NOT stage, `git add`, or `git commit` them itself; committing those changes is the surrounding session's decision (the user, an orchestrator, or a separate commit flow). The skill DOES run git commands within the user-chosen branch-disposition flow — `git checkout`, `git pull`, `git merge`, `git push`, `git push -u origin <branch>`, `gh pr create`. Those commands produce commits or merges (e.g., `git merge` produces a merge commit on the target branch). The user MUST confirm each command BEFORE execution per `## Branch Operations`. The skill does NOT push without the user's explicit choice of an option that requires a push (Options 1, 2, 3).

The skill does NOT rewrite history. See `## Branch Operations` → `### NEVER force-push, NEVER rewrite history` for the forbidden-constructs list.

## Immutability

Finish writes exactly the handshake artifacts and nothing else. It WRITES: the living docs (the evergreen project documentation); the spec's `status.implemented` latch (set-once, in the spec's frontmatter `status:` map); the `closed: done` line appended to `ledger.md`; and — on the linked ticket — the closed status and the one backlink comment. All other thread reads are READ-ONLY.

Setting `status.implemented` **freezes the spec**: from then on the spec's body and frontmatter are frozen history and are not edited. The ledger is **append-only** — finish appends one disposition line and never rewrites earlier lines. To change how the system works after finish, **update the living docs — never edit the implemented spec.** If the closure conversation surfaces a finding that warrants revising a spec/plan/proposal, that is a separate authoring pass (a new lineage or an owner-approved, record-backed amendment of a still-alive artifact), NOT an in-place edit by this skill.

The skill does NOT add ad-hoc closure metadata to artifacts — there is no `Closed:`, `Finished:`, or `Merged:` field. The only status it writes is the spec's `status.implemented` latch and the ledger's `closed: done` line, both per the contracts above. Branch-level closure (the merge, push, or PR) is recorded in git history, not as metadata on the thread artifacts.

The freeze guard activates from the finish commit forward and only ENFORCES the freeze; it never SETS status. Finish sets the latch and the ledger line itself — it does not depend on the guard to do so.
