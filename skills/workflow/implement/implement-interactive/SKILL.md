---
name: implement-interactive
description: Implement a less-structured input on the current working tree collaboratively, walking implicit tasks with the user, self-reviewing after each task, and asking before each commit when the user wants implementation decisions kept in-loop.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.2.1
---

# Implement Interactive

Walk the user through a less-structured-input implementation on the current working tree, accept freeform answers per implicit task, push back on weak reasoning per the `## Anti-Sycophancy Stance`, run a self-review pass after each implicit task, ASK before each commit, report a four-state status per implicit task, and emit a single immutable **implementation report** record on the way out. This skill is the collaborative variant: it interviews, it disagrees when warranted, it surfaces what the user did not ask about, and it never lets a commit land without the user's explicit go-ahead. Bad commits become expensive to rewind — the cheap moment to push back is BEFORE the commit lands, because commit history is sacred (no `--amend`, no rebase, no force-push). Once a commit lands, this skill will not revise it; the recovery path is a follow-up commit.

This skill is SINGLE-AGENT. The current session is the implementer; the same session runs the self-review pass after each implicit task and conducts the walk with the user. No subagent dispatch.

## Anti-Sycophancy Stance

Your job is to help the user reach an implementation that survives later scrutiny, not to make them feel good about whatever the input or their walk-through prompts call for. Treat the walk as a mutual attempt to land good code: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode at execution time because **bad commits become expensive to rewind** — the cheap moment to push back is BEFORE the commit lands, because commit history is sacred (no `--amend`, no rebase, no force-push). Once a commit lands, this skill will not revise it; the recovery path is a follow-up commit, and that follow-up is more expensive than catching the issue before the original commit was made.

Hold these together:

- **Disagree when you disagree.** If the user's proposed implementation approach, ordering, or scope conflicts with the evidence, your read of the input, or the codebase reality, say so plainly before they commit it to the diff or the commit message. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user's proposed implicit task rests on an unexamined assumption, ignores a known constraint, or skips a risk or trade-off that the implementation will pay for, name the gap and bring it into the conversation before writing the code.
- **Surface what they didn't ask about.** Risks, hidden costs, ordering pitfalls, alternatives they dismissed too fast, missing prerequisite tasks, files the change should touch but the user did not mention, acceptance criteria the input implied but did not state — raise them, even if it slows the walk down.
- **Take the user's input seriously.** If they push back, add context, or challenge your framing, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never soften your read of a task just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see an implicit task differently, identify the exact assumption or value judgment causing the split, then resolve it before writing the code or the commit.
- **Refuse to log a task or commit you believe is wrong without flagging it.** If the user insists on a task as stated, implement it, but surface the dissent in the four-state task report (`DONE_WITH_CONCERNS` with a one-sentence note, or `NEEDS_CONTEXT` if the dissent is structural and the implementer thinks the user has not yet seen the consequence). If the user insists on a commit subject or boundary you believe is wrong, ASK once more before committing; if they confirm, write the commit message with the dissent in the message body.
- **Keep the implementation owned by the evidence.** The goal is not for either side to win. The goal is to land a change that survives later scrutiny because the relevant context, objections, and trade-offs were actually considered before commits hit history.

If you believe the user is about to ASK you to commit something that is wrong, refuse to commit silently. Either resolve the disagreement first, or commit with the dissent included in the commit message body and in the four-state task report. The implementation phase is where unflagged bad calls become expensive — and unlike planning, execution-time bad calls cost real commit hashes that this skill will not rewind.

## Inputs

This skill accepts ONE of the following SEVEN input forms. Detect which form was passed before opening the walk:

1. **A spec artifact path** — a Markdown file capturing a semantic contract with acceptance guidance. The spec's semantic-contract elements drive the implicit task list directly. If the spec has acceptance guidance, every implicit task should trace to a piece of it; if a piece of acceptance has no implicit task covering it, that is a coverage gap to surface during the walk.
2. **A proposal artifact path** — a Markdown file capturing a rough proposal. The proposal's shape becomes the starting implicit task list; the proposal's open questions become items the walk either resolves or surfaces in the four-state task report.
3. **A decision-log artifact path** — a Markdown file carrying one or more settled decisions with sequential `## P<N>: <Title>` headings. Each settled decision may map to an implicit task (or constrain one); cite the source log by path + `P<N>` in the task report where the decision is operative.
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL or the short `owner/repo#NNN` form. The issue body becomes the starting context; treat the issue title and labels as additional framing.
5. **A seed artifact path** — the thread's genesis record at `seed/seed.md`. Its trigger narrative names the intended outcome and sketches the work. A seed input typically means tier-1 work — read the thread's `ledger.md` to confirm the tier before opening the walk.
6. **A code context reference** — a file path, directory, or git ref. The implementer reads the referenced context and walks the implicit task list with the user from the observed state.
7. **A raw user prompt**. When no artifact or code reference is passed, the user's prompt is itself the input; the walk derives the implicit task list directly from the conversation.

If the input is ambiguous — for example, the thread holds multiple lineages of one type (`specs/001-api/` vs `specs/002-cli/`) and "the spec" has no clear referent, or it is unclear which artifact was intended — ASK the user which input is intended. There is no global "latest input" algorithm. Do not silently pick by recency or by highest `NNN`.

## Four-State Status Protocol

Every task report carries one of FOUR statuses. Use the names verbatim — downstream reviewers match against these tokens.

- `DONE` — the implicit task was completed and the implementer has no concerns to surface. The expected behavior is in place, the self-review pass found nothing to flag, and the project's standing required gates — if the project defines any (see `## Commit Policy`) — pass on the changed code. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the implicit task was completed but at least one concern was surfaced during the walk: partial test coverage, a code smell the user accepted, an ambiguous input area the user made a judgment call on, a possible-but-unverified edge case, a deviation the implementer applied (or that the user accepted live during the walk). The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the implicit task could not be completed. Includes failed commits (see `## Commit Policy`), missing dependencies, inaccessible files, contradictory inputs, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent implicit tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the implicit task cannot proceed without information the implementer does not have. Includes "user clarification needed during the walk", "access to file outside repo needed", "external system credentials needed", "the input contradicts the observed code state and the implementer cannot pick the right side without further input". Distinct from `BLOCKED`: `BLOCKED` hit a hard error during execution; `NEEDS_CONTEXT` did not start because the missing input was a precondition.

### Task report block shape

The four-state status appears as a structured block in chat output and/or the commit message body for the task's commit (where applicable). The four-state status is NOT written to a separate artifact file — the chat output and the commit history together are the audit trail.

Suggested format (exact wording is at the implementer's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 5–10 line range):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Notes: <1–3 sentences explaining the rationale or surfaced concerns. Cite settled decisions by thread-relative path + P<N> when relevant. Note any live dissents from the walk per the Anti-Sycophancy Stance.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY implicit task by its four-state status, plus the commit SHA + subject for every commit made during the run. This is the implementation audit trail.

## Dirty Worktree Handling

This skill OWNS the dirty-worktree check. Run the check ONCE at the start of the run, BEFORE reading the input or opening the walk.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the input-resolution and walk-opening steps.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill asks to make) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit this skill makes once the user approves it (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not open the walk, do not modify the worktree.

This skill does not use `git worktree` isolation — every implementation runs on the current working tree, so the dirty-worktree check is non-skippable.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. If clean, proceed. If dirty, ASK; on abort, stop.

2. **Resolve the thread and read the ledger.** If the input is a path under a thread root (`docs/threads/<YYMMDDHHMMSSZ-slug>/`), the thread root is implicit. If the input is a raw prompt or a code context reference, identify the active thread root — the run will produce thread-scoped artifacts (the implementation report, and optionally a decision log per `## Decision Log`). If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent one. Once the thread root is known, read its `ledger.md` (append-only; the current value of each key is its last matching line) for the **tier** and **disposition**. If the disposition is `closed: …`, the thread is sealed — stop and tell the user; do not write into a closed thread.

3. **Resolve and read the input.** Detect which of the seven `## Inputs` forms was passed. For a path input, read the file (path inputs are IMMUTABLE per `## Immutability` — the implementer reads them READ-ONLY). For a GitHub issue, fetch the body and title. For a seed, read its trigger narrative. For a code context reference, read the referenced files. For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended.

4. **Walk the implicit task list with the user.** This is the COLLABORATIVE element of this skill. Open the conversation with the input's intended outcome restated in one or two sentences. Propose the first implicit task — its objective and observable verification — and ask the user to confirm or adjust. Push back per the `## Anti-Sycophancy Stance` when the user's framing has gaps, hidden assumptions, or weak reasoning. Adjust scope in conversation (split if the task is too large, fold if it's trivial, defer if it belongs outside this run per `## Scope Drift`). Move to the next implicit task. The task list emerges through the walk, not from a pre-built checklist. Keep a running task list of the tasks you derive and their state as you work, so progress stays legible.

5. **For each implicit task, in order:**
   a. **Confirm the task with the user before implementing.** Re-state the objective and observable verification. If the user wants to adjust, adjust. If the implementer disagrees with the user's adjustment, push back per the `## Anti-Sycophancy Stance`.
   b. **Implement.** Make the code changes the task calls for. Use judgment if the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — but during the walk, prefer to SURFACE the deviation LIVE to the user before applying it, per `## Plan Deviation Policy`. After the user has decided, write the code.
   c. **Self-review.** Re-read the diff against the implicit task's stated objective. Check that the change is coherent, does not break adjacent code paths, and matches the project's conventions. As a first-class input to this pass — not an afterthought — explicitly surface the assumptions you made, the forced judgment calls you took, and any known risks the diff alone would not reveal; carry them into the task report and the implementation report. Self-review is in-session — no artifact file is written.
   d. **ASK before committing.** Show the user the proposed commit (subject + body + the changed-files list). ASK the user before committing: "Commit these changes as `<proposed subject>`? Or adjust the subject / body / boundary before committing? Or skip the commit and continue making changes?". Wait for the user's answer. On confirm, commit per `## Commit Policy`. On adjust, revise per the user's instruction and re-ASK. On skip, do not commit; continue.
   e. **Commit or skip.** If the user confirmed, commit. If the commit succeeds, capture the SHA + subject. If commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this implicit task and stop the entire run.
   f. **Write the task report.** Use the four-state status block from `## Four-State Status Protocol`. The state goes in chat output and/or (if a commit was made) the commit message body.

6. **Emit the implementation report.** Once all implicit tasks have run (or the run was halted at a `BLOCKED` task or by user decision), write the implementation report per `## Implementation Report`. This is the run's durable record and is part of the Definition of Done.

7. **Final out-message.** Emit a final summary listing every implicit task by its four-state status, the commit SHA + subject for each commit made, and the thread-relative path of the implementation report just written. If follow-ups were discovered, name where they were routed per `## Implementation Report`.

## Implementation Report

Every run emits exactly one **implementation report** — a record, immutable from the moment it is written (the industry analog is a PR description). It is the durable artifact this run produces; the four-state task blocks and the git history are the in-flight trail, the report is the summary that survives.

**Where it lands.** Write it to the active thread's flat `implementation/` folder:

```text
implementation/<YYMMDDHHMMSSZ>-<kebab-desc>-implementation-report.md
```

`implementation/` is FLAT — records sit directly inside it, with no lineage (`NNN/`) subfolders and no `v<N>` folders. The filename uses the 12-character UTC stamp (no separators, trailing `Z`), a short kebab description, and the mandatory `implementation-report` artifact-type token. Reference the report path thread-relative (relative to the thread root), never absolute; reference anything in another thread repo-relative (`docs/threads/<other>/…`).

**It carries no frontmatter.** The report is a record with no lifecycle status of its own — so no YAML frontmatter at all. Its body is frozen at emission: never edit it after writing. If something needs correcting later, that is a NEW record, not an edit to this one.

**What it captures** — four content categories, all four present (write "none" where a category is empty):

1. **Deviations from the input, with justification.** Every place the implementation diverged from what the input called for, each with a one-or-two-sentence reason — including the live deviations the user signed off on during the walk and any dissents flagged per the `## Anti-Sycophancy Stance`. Pull these from the `DONE_WITH_CONCERNS` and `NEEDS_CONTEXT` task blocks.
2. **Surprises.** Things the codebase or the task turned out to be that the input did not anticipate.
3. **Problems hit.** Blockers, failures, and anything that forced a `BLOCKED` status or a mid-run course change.
4. **Follow-ups.** Work this run discovered but intentionally did not do — including scope-drift branches the user chose to defer during the walk.

The assumptions, forced judgment calls, and known risks the per-task self-review surfaced fold into these existing categories rather than a new section: assumptions and forced judgment calls into Deviations (1), each with its justification; known risks into Follow-ups (4), or Problems hit (3) where the risk was already realized during the run.

**Follow-up routing.** Follow-ups discovered during implementation are NOT parked in any inbox — there is no inbox in this workflow. Route them one of two ways:

- **Default — seeds of future threads.** Capture each follow-up as a seed for a new thread (its own genesis record), or surface it in the report as a clearly-labelled candidate seed for the user to open later. This is the default for any standalone follow-up.
- **Tier-3 phased work — the next phase's discussion.** If the active thread is tier-3 phased work with a living roadmap, a follow-up that belongs to a later phase routes to that next phase's `discussions/` folder (the roadmap is a living list, not a frozen contract — a phase may welcome or defer the follow-ups appended to it). Confirm the thread is tier-3 phased work (per the ledger) before routing this way.

Name the routing decision for each follow-up in the report so the trail is explicit.

## Commit Policy

This skill ASKS before each commit. The per-commit gate is non-skippable.

- **Default boundary granularity:** One commit per implicit task that the agent derives from the input. The boundary is the implicit task; after the implement → self-review pair for a task succeeds, ASK the user whether to commit the diff that constitutes the task.
- **Override boundary:** When the user's invocation or in-walk instruction contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default cadence.
- **ASK the user before committing at every equivalent checkpoint.** Before EVERY commit boundary the skill would otherwise cross, ASK the user: present the proposed subject, body, and changed-files list; wait for confirm / adjust / skip. Do NOT commit silently. Do NOT commit on a sensible-looking default if the user has been silent.
- **Baseline gate (before the per-commit ASK):** A task's self-review confirms THAT task's objective; it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the self-review and this clause is a no-op. When the project DOES define standing gates, run them on the changed code and resolve any failure BEFORE presenting the per-commit ASK, so the user is asked to confirm a commit that already clears the project's bar — even when the task's own verification omits it. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this task. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.

Commits use the repository's existing commit convention when it is discoverable from recent history or local tooling. If no convention is obvious, use a short imperative subject that describes the implicit task's objective. Stage only the files the implicit task touched; never run `git add -A` blindly. Commit message bodies MAY include the four-state task report block.

### Failed commit

**If a commit fails, report `BLOCKED` and stop. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), then stop the entire run. Subsequent implicit tasks are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject. Each of those is the project telling the implementer to stop and let the user diagnose. `BLOCKED` is the correct response in this interactive run — the user can choose to resolve the underlying issue and start a fresh run, but this skill does not iterate on a failed commit autonomously inside the same run.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even when the user asks for a typo fix on a commit that already landed; the recovery path is a follow-up commit), does not rebase, does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

The rationale ties back to the `## Anti-Sycophancy Stance`: bad commits become expensive to rewind. Because this skill will not rewrite history, the per-commit ASK gate is the place where mistakes are cheapest to catch. Use the gate — push back during the walk, push back during the ASK, refuse to silently land a commit you believe is wrong.

## Plan Deviation Policy

- **Follow the input or the implicit task list derived from it.** The input is the contract; the implicit task list is the implementer's interpretation, refined through the walk.
- **Use judgment when warranted.** If the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, surface the deviation LIVE to the user before applying it — push back per the `## Anti-Sycophancy Stance`. Get the user's call before writing code that deviates from the literal input.
- **Surface deviations in the task report.** Every deviation also goes into the four-state status block at task end. Minor deviations are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations the user signed off on during the walk are also `DONE_WITH_CONCERNS` with a note that the user explicitly agreed. Major deviations the implementer flagged but did not resolve are `NEEDS_CONTEXT`.
- **The walk is the live push-back channel.** This skill has the user in-loop for every implicit task. Use the walk to raise deviations early, not just at task end. Pre-commit ASK is the second checkpoint where the user has the chance to reject.

## Decision Log

The default behavior of this skill is to NOT auto-write a separate decision log. Most implementation-time decisions are captured fully in commit messages and in the four-state task report — settled decisions cited inline, dissents flagged where they emerged, scope deviations surfaced and signed off live during the walk. A standalone decision log is written ONLY when durable trade-offs or rejected alternatives emerge during the walk that cannot reasonably be captured in commit messages or the task report — for example, a structural choice the user weighed multiple alternatives for and explicitly rejected the others, with rationale that downstream readers will need to understand independently of any specific commit.

When such a decision log IS warranted, write it to the implementation node's discussions folder — `implementation/discussions/<UTC>-<kebab-desc>-decision-log.md` (a record: UTC stamp, kebab description, the mandatory `decision-log` artifact-type token, no frontmatter). Discussions attach to the spine node they serve, and a decision that emerged while implementing serves the implementation node. Use an append-only single-record shape with sequential `## P<N>: <Title>` headings, each containing `Decision:` and `Rationale:` lines. If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim. The four-state task report and the implementation report cite the new log by thread-relative path + `P<N>` at the location where its decisions are operative.

When in doubt about whether a side-conversation rises to "durable trade-off" status, ASK the user. The default is no decision log.

## Scope Drift

When the user introduces a branch that is outside the implementation being walked, do not silently follow them and do not let the run grow into a different shape than the one being implemented. Propose ONE of:

1. **Capture as a follow-up for the implementation report** (PREFERRED for non-blocking side-findings). Note the side-finding so it lands in the report's follow-ups section and routes per `## Implementation Report` — to a seed of a future thread (the default), or, in tier-3 phased work, to the next phase's `discussions/`. There is no inbox in this workflow.
2. **Split into its own thread.** When the branch is itself worth a dedicated spec or a separate discussion, hand it off — capture it as a seed for a new thread rather than expanding the current run beyond its intent.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in the walk and let it pass.

ASK the user which. Do not pick silently.

## Immutability

Input artifacts are IMMUTABLE. The implementer reads them READ-ONLY. A spec, a proposal, a decision log, a seed, a plan artifact the user may pass through, and any other emitted record or latched versioned artifact under a thread directory is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not for any reason. (A spec that is `approved` but not yet `implemented` may be amended only through a separate owner-approved, record-backed amendment pass — never as a side effect of this run.)

If during the walk the user proposes editing the input in place (e.g., "fix the typo in the spec while you're at it"), refuse per the immutability rule and per the `## Anti-Sycophancy Stance`. A revised spec is a fresh review→revise cycle on that spec; a revised decision is a NEW decision-log record. The implementer does not perform that revision inside this run.

What the implementer DOES modify is SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository. The implementer also writes exactly one implementation report per `## Implementation Report` (the run's durable thread artifact), MAY write a decision log per `## Decision Log` when the user signs off on the durable-trade-off threshold, and MAY capture a discovered follow-up or a scope-drift branch as a seed for a future thread (or, in tier-3 phased work, append it to the next phase's `discussions/`) per the follow-up-routing rule. There is no inbox in this workflow.

Thread artifacts produced by this skill follow the thread's folder conventions — flat `implementation/` for the report, the appropriate spine-node folder for any decision log, a `YYMMDDHHMMSSZ`-prefixed record filename with the mandatory artifact-type token, within-thread paths written thread-relative. Thread folders are created on demand (a folder appears only when its first artifact lands). The `.wip/` folder is recursively gitignored and for in-progress drafts only; never emit artifacts into `.wip/` as final output.
