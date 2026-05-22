---
name: implement-interactive
description: Implement a less-structured input on the current working tree collaboratively, walking implicit tasks with the user, self-reviewing after each task, and asking before each commit when the user wants implementation decisions kept in-loop.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.2
---

# Implement Interactive

Walk the user through a less-structured-input implementation on the current working tree, accept freeform answers per implicit task, push back on weak reasoning per the `## Anti-Sycophancy Stance`, run a self-review pass after each implicit task, ASK before each commit, and report a four-state status per implicit task on the way out. This skill is the collaborative variant: it interviews, it disagrees when warranted, it surfaces what the user did not ask about, and it never lets a commit land without the user's explicit go-ahead. Bad commits become expensive to rewind — the cheap moment to push back is BEFORE the commit lands, because commit history is sacred (no `--amend`, no rebase, no force-push). Once a commit lands, this skill will not revise it; the recovery path is a follow-up commit.

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
3. **A decision-log artifact path** — a Markdown file carrying one or more settled decisions with sequential `## D<N>: <Title>` headings. Each settled decision may map to an implicit task (or constrain one); cite the source log by absolute path + `D<N>` in the task report where the decision is operative.
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL or the short `owner/repo#NNN` form. The issue body becomes the starting context; treat the issue title and labels as additional framing.
5. **An inbox item path** — a Markdown file with a `**Why:**` line naming the intended outcome and a body sketching the work. As part of completion, plan to move the item from its open location to a processed location.
6. **A code context reference** — a file path, directory, or git ref. The implementer reads the referenced context and walks the implicit task list with the user from the observed state.
7. **A raw user prompt**. When no artifact or code reference is passed, the user's prompt is itself the input; the walk derives the implicit task list directly from the conversation.

If the input is ambiguous — for example, multiple files match the reference or it is unclear which artifact was intended — ASK the user which input is intended. There is no global "latest input" algorithm. Do not silently pick by recency.

## Four-State Status Protocol

Every task report carries one of FOUR statuses. Use the names verbatim — downstream reviewers match against these tokens.

- `DONE` — the implicit task was completed and the implementer has no concerns to surface. The expected behavior is in place and the self-review pass found nothing to flag. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the implicit task was completed but at least one concern was surfaced during the walk: partial test coverage, a code smell the user accepted, an ambiguous input area the user made a judgment call on, a possible-but-unverified edge case, a deviation the implementer applied (or that the user accepted live during the walk). The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the implicit task could not be completed. Includes failed commits (see `## Commit Policy`), missing dependencies, inaccessible files, contradictory inputs, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent implicit tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the implicit task cannot proceed without information the implementer does not have. Includes "user clarification needed during the walk", "access to file outside repo needed", "external system credentials needed", "the input contradicts the observed code state and the implementer cannot pick the right side without further input". Distinct from `BLOCKED`: `BLOCKED` hit a hard error during execution; `NEEDS_CONTEXT` did not start because the missing input was a precondition.

### Task report block shape

The four-state status appears as a structured block in chat output and/or the commit message body for the task's commit (where applicable). The four-state status is NOT written to a separate artifact file — the chat output and the commit history together are the audit trail.

Suggested format (exact wording is at the implementer's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 5–10 line range):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Notes: <1–3 sentences explaining the rationale or surfaced concerns. Cite settled decisions by absolute path + D<N> when relevant. Note any live dissents from the walk per the Anti-Sycophancy Stance.>
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

2. **Resolve the thread (if relevant).** If the input is a path under a thread root, the thread root is implicit. If the input is a raw prompt or a code context reference and the run might produce thread-scoped artifacts (e.g., an inbox item for a deferred finding, a decision log per `## Decision Log`), identify the active thread root. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent one.

3. **Resolve and read the input.** Detect which of the seven `## Inputs` forms was passed. For a path input, read the file (path inputs are IMMUTABLE per `## Immutability` — the implementer reads them READ-ONLY). For a GitHub issue, fetch the body and title. For an inbox item, plan to move the item to a processed location upon completion. For a code context reference, read the referenced files. For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended.

4. **Walk the implicit task list with the user.** This is the COLLABORATIVE element of this skill. Open the conversation with the input's intended outcome restated in one or two sentences. Propose the first implicit task — its objective and observable verification — and ask the user to confirm or adjust. Push back per the `## Anti-Sycophancy Stance` when the user's framing has gaps, hidden assumptions, or weak reasoning. Adjust scope in conversation (split if the task is too large, fold if it's trivial, defer if it belongs outside this run per `## Scope Drift`). Move to the next implicit task. The task list emerges through the walk, not from a pre-built checklist.

5. **For each implicit task, in order:**
   a. **Confirm the task with the user before implementing.** Re-state the objective and observable verification. If the user wants to adjust, adjust. If the implementer disagrees with the user's adjustment, push back per the `## Anti-Sycophancy Stance`.
   b. **Implement.** Make the code changes the task calls for. Use judgment if the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — but during the walk, prefer to SURFACE the deviation LIVE to the user before applying it, per `## Plan Deviation Policy`. After the user has decided, write the code.
   c. **Self-review.** Re-read the diff against the implicit task's stated objective. Check that the change is coherent, does not break adjacent code paths, and matches the project's conventions.
   d. **ASK before committing.** Show the user the proposed commit (subject + body + the changed-files list). ASK the user before committing: "Commit these changes as `<proposed subject>`? Or adjust the subject / body / boundary before committing? Or skip the commit and continue making changes?". Wait for the user's answer. On confirm, commit per `## Commit Policy`. On adjust, revise per the user's instruction and re-ASK. On skip, do not commit; continue.
   e. **Commit or skip.** If the user confirmed, commit. If the commit succeeds, capture the SHA + subject. If commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this implicit task and stop the entire run.
   f. **Write the task report.** Use the four-state status block from `## Four-State Status Protocol`. The state goes in chat output and/or (if a commit was made) the commit message body.

6. **Final out-message.** Once all implicit tasks have run (or the run was halted at a `BLOCKED` task or by user decision), emit a final summary listing every implicit task by its four-state status plus the commit SHA + subject for each commit made. If an inbox item was the input, note that the item should be moved to its processed location.

## Commit Policy

This skill ASKS before each commit. The per-commit gate is non-skippable.

- **Default boundary granularity:** One commit per implicit task that the agent derives from the input. The boundary is the implicit task; after the implement → self-review pair for a task succeeds, ASK the user whether to commit the diff that constitutes the task.
- **Override boundary:** When the user's invocation or in-walk instruction contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default cadence.
- **ASK the user before committing at every equivalent checkpoint.** Before EVERY commit boundary the skill would otherwise cross, ASK the user: present the proposed subject, body, and changed-files list; wait for confirm / adjust / skip. Do NOT commit silently. Do NOT commit on a sensible-looking default if the user has been silent.

Commits use the project's conventional-commit shape where applicable; follow the project's `AGENTS.md` for scope rules. Stage only the files the implicit task touched; never run `git add -A` blindly. Commit subjects describe the implicit task's objective; commit message bodies MAY include the four-state task report block.

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

When such a decision log IS warranted, write it to the thread's `discussions/` folder using a UTC-prefixed filename and a `decision-log` artifact-type suffix. Use an append-only single-record shape with sequential `## D<N>: <Title>` headings, each containing `Decision:` and `Rationale:` lines. If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim. The four-state task report cites the new log by absolute path + `D<N>` at the location where its decisions are operative.

When in doubt about whether a side-conversation rises to "durable trade-off" status, ASK the user. The default is no decision log.

## Scope Drift

When the user introduces a branch that is outside the implementation being walked, do not silently follow them and do not let the run grow into a different shape than the one being implemented. Propose ONE of:

1. **Park as an inbox item** (PREFERRED for non-blocking side-findings). Capture a short markdown record in the thread's inbox so the side-finding survives without polluting this run.
2. **Split into its own task / plan / discussion thread.** When the branch is itself worth a dedicated plan or a separate discussion, hand it off rather than expanding the current run beyond its intent.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in the walk and let it pass.

ASK the user which. Do not pick silently.

## Immutability

Input artifacts are IMMUTABLE. The implementer reads them READ-ONLY. Specs, proposals, decision logs, inbox items, plan artifacts the user may pass through, and any other workflow artifact under a thread directory is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not for any reason.

If during the walk the user proposes editing the input in place (e.g., "fix the typo in the spec while you're at it"), refuse per the immutability rule and per the `## Anti-Sycophancy Stance`. A revised input is a new version (a new spec `v2`, a new inbox item, a new decision log record). The implementer does not perform that revision inside this run.

What the implementer DOES modify is SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository. The implementer also MAY (a) create a new inbox item if a scope-drift branch surfaces and the user picks "park", (b) move an inbox item that was itself the input from its open location to a processed location as part of completion, and (c) write a decision log per `## Decision Log` when the user signs off on the durable-trade-off threshold.

Thread artifacts produced by this skill follow the thread's folder conventions — a `YYMMDDHHMMSSZ`-prefixed filename with the appropriate artifact-type suffix. The `.wip/` folder is gitignored and for in-progress drafts only; never emit artifacts into `.wip/` as final output.
