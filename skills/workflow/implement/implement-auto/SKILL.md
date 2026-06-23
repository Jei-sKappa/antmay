---
name: implement-auto
description: Implement a less-structured input end-to-end on the current working tree, deriving implicit tasks, self-reviewing after each task, and auto-committing per task when the user wants autonomous implementation without per-step confirmation.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.1.0
---

# Implement Auto

Execute a less-structured input end-to-end on the current working tree. Read the input, derive implicit tasks if the input does not already enumerate them, implement each task, self-review, auto-commit per implicit task or per explicit Git instruction the user passes through, report a four-state status per implicit task, and emit a single immutable **implementation report** record on the way out. Do not ask clarifying questions at each step, do not ask before committing, and do not rewrite history.

This skill is single-agent: the current session is the implementer and runs the self-review pass after each implicit task. No subagents are spawned.

## Inputs

This skill accepts ONE of the following SEVEN input forms. Detect which form was passed before deriving implicit tasks:

1. **A spec artifact path** under a thread's `specs/` folder. The spec's semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the implicit task list directly. If the spec has acceptance guidance, every implicit task should trace to a piece of it; if a piece of acceptance has no implicit task covering it, that is a coverage gap to surface.
2. **A proposal artifact path** under a thread's `proposals/` folder. The proposal's rough shape becomes the implicit task list; the proposal's open questions become either tasks the implementation resolves or `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` flags in the four-state report.
3. **A decision-log artifact path** under a spine node's `discussions/` folder. The log carries one or more settled decisions. Each settled decision may map to an implicit task (or constrain one); cite the source log by path and decision identifier in the task report where the decision is operative.
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the input; treat the issue title and labels as additional framing.
5. **A seed artifact path** under a thread's `seed/` folder (`seed/<UTC>-<desc>-seed.md`). The seed is the thread's genesis record; its trigger narrative names the intended outcome and the body sketches the work. A seed input typically means tier-1 work — read the thread's `ledger.md` to confirm the tier before deriving tasks.
6. **A code context reference** — a file path, directory, or git ref. The implementer reads the referenced context and derives implicit tasks from the observed state (e.g., "remove dead code in `src/legacy/`", "fix the import order in `src/foo.ts`"). This input form fits requests where the user's intent is "look at this and do the obvious thing" rather than a written input.
7. **A raw user prompt**. When no artifact or code reference is passed, the user's prompt is itself the input. Derive implicit tasks directly from the prompt's stated intent.

If the input is ambiguous — a thread contains multiple lineages of the named type (e.g. `specs/001-api/` and `specs/002-cli/`) and "the spec" has no clear referent, the issue identifier is incomplete, the prompt references an artifact with no clear referent, the code context reference points at a directory containing multiple in-progress changes — ASK the user which input is intended. There is no global "latest input" algorithm. Do not silently pick by recency, and do not pick "highest `NNN`".

## Four-State Status Protocol

Every task report carries one of FOUR statuses. Use the names verbatim — downstream readers match against these tokens exactly.

- **`DONE`** — the implicit task was completed and the implementer has no concerns to surface. The expected behavior is in place and the self-review pass found nothing to flag. This is the only state that means "ready for next task with no follow-up".
- **`DONE_WITH_CONCERNS`** — the implicit task was completed but the implementer has at least one concern to surface: partial test coverage, a code smell that did not warrant blocking the task, an ambiguous area the implementer made a judgment call on, a possible-but-unverified edge case, a deviation from the input that the implementer applied per `## Plan Deviation Policy`. The task IS done; the concerns are signals for downstream review or future work.
- **`BLOCKED`** — the implicit task could not be completed. Includes failed commits (see `## Commit Policy`), missing dependencies, inaccessible files, contradictory inputs, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent implicit tasks are NOT attempted.
- **`NEEDS_CONTEXT`** — the implicit task cannot proceed without information the implementer does not have. Includes "user clarification needed", "access to file outside repo needed", "external system credentials needed", "the input contradicts the observed code state and the implementer cannot pick the right side without input". `NEEDS_CONTEXT` is distinct from `BLOCKED`: a `BLOCKED` task hit a hard error during execution; a `NEEDS_CONTEXT` task did not start because the missing input was a precondition.

### Task report block shape

The four-state status appears as a structured block in chat output and/or the commit message body for the task's commit (where applicable). The four-state status is NOT written to a separate artifact file — the chat output and the commit history together are the audit trail.

Suggested format (exact wording is at the implementer's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 5–10 line range):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Notes: <1–3 sentences explaining the rationale or surfaced concerns.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY implicit task by its four-state status, plus the commit SHA + subject for every commit made during the run. This is the implementation audit trail; the user reads it to understand what was done and what to do next.

## Dirty Worktree Handling

This skill owns the dirty-worktree check. Run the check ONCE at the start of the run, BEFORE reading the input.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the input-resolution step.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill makes) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit this skill makes (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not derive implicit tasks, do not commit, do not modify the worktree further.

This skill does not use `git worktree` isolation — every implementation runs on the current working tree, so the dirty-worktree check is non-skippable.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. If the worktree is clean, proceed. If dirty, ASK; on abort, stop.

2. **Resolve the thread and read the ledger.** If the input is a path under a thread folder, the thread root (`docs/threads/<YYMMDDHHMMSSZ-slug>/`) is implicit. If the input is a raw prompt or a code context reference and the run will produce thread-scoped artifacts (it will — the implementation report lands in the thread), identify the active thread root. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent. Once the thread root is known, read its `ledger.md` (append-only; the current value of each key is its last matching line) to learn the **tier** and **disposition**. The implementation report is part of the tier-1-and-up Definition of Done, so it is emitted regardless of tier here. If the ledger's disposition is `closed: …`, the thread is sealed — stop and tell the user; do not write into a closed thread.

3. **Resolve and read the input.** Detect which of the seven `## Inputs` forms was passed. For a path input, read the file READ-ONLY (input artifacts are immutable — see `## Immutability`). For a GitHub issue, fetch the body and title. For a seed, read its trigger narrative. For a code context reference, read the referenced files. For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended. Do not pick by recency.

4. **Derive implicit tasks from the input.** Translate the input into an ordered list of implicit tasks. Each implicit task should be implementable in one sitting, observable on completion (a file written, a test passing, a behavior visible), and small enough that the self-review pass after it is meaningful. If the input is fully resolved (e.g., "do X to file Y, then add a test"), the implicit task list may be one or two tasks. If the input is broader (e.g., a spec with multiple acceptance items), the implicit task list will have one entry per acceptance item or per cohesive implementation unit. Avoid both under-splitting (a single "do the spec" task) and over-splitting (a separate task for every line touched). Keep a running task list of the tasks you derive and their state as you work, so progress stays legible.

5. **For each implicit task, in order:**
   a. **Implement.** Make the code changes the task calls for. Use judgment if the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — surface the deviation in the task report per `## Plan Deviation Policy`.
   b. **Self-review.** Re-read the diff against the implicit task's stated objective. Check that the change is coherent with the input, does not break adjacent code paths the implementer can see, and matches the project's conventions. As a first-class input to this pass — not an afterthought — explicitly surface the assumptions you made, the forced judgment calls you took, and any known risks the diff alone would not reveal; carry them into the task report and the implementation report. Self-review is in-session — no artifact file is written.
   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, report `BLOCKED` for this implicit task and stop the entire run.
   d. **Write the task report.** Use the four-state status block from `## Four-State Status Protocol`. The state goes in chat output and/or the commit message body.

6. **Emit the implementation report.** Once all implicit tasks have run (or the run was halted at a `BLOCKED` task), write the implementation report per `## Implementation Report`. This is the run's durable record and is part of the Definition of Done.

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

1. **Deviations from the plan/input, with justification.** Every place the implementation diverged from what the input called for, each with a one-or-two-sentence reason. Pull these from the `DONE_WITH_CONCERNS` and `NEEDS_CONTEXT` task blocks where deviations were surfaced.
2. **Surprises.** Things the codebase or the task turned out to be that the input did not anticipate.
3. **Problems hit.** Blockers, failures, and anything that forced a `BLOCKED` status or a mid-run course change.
4. **Follow-ups.** Work this run discovered but intentionally did not do.

The assumptions, forced judgment calls, and known risks the per-task self-review surfaced fold into these existing categories rather than a new section: assumptions and forced judgment calls into Deviations (1), each with its justification; known risks into Follow-ups (4), or Problems hit (3) where the risk was already realized during the run.

**Follow-up routing.** Follow-ups discovered during implementation are NOT parked in any inbox — there is no inbox in this workflow. Route them one of two ways:

- **Default — seeds of future threads.** Capture each follow-up as a seed for a new thread (its own genesis record), or surface it in the report as a clearly-labelled candidate seed for the user to open later. This is the default for any standalone follow-up.
- **Tier-3 phased work — the next phase's discussion.** If the active thread is tier-3 phased work with a living roadmap, a follow-up that belongs to a later phase routes to that next phase's `discussions/` folder (the roadmap is a living list, not a frozen contract — a phase may welcome or defer the follow-ups appended to it). Confirm the thread is tier-3 phased work (per the ledger) before routing this way.

Name the routing decision for each follow-up in the report so the trail is explicit.

## Commit Policy

This skill auto-commits.

- **Default cadence:** ONE commit per implicit task. The boundary is the implicit task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple implicit tasks into one commit. Do not split one implicit task across multiple commits.
- **Override cadence:** When the user's invocation contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default cadence. The user's explicit instruction wins.
- **Judgment:** When the implicit task list is one task (a fully-resolved input), the default cadence and "one commit at the end" produce the same outcome — one commit. When the implicit task list is many tasks (e.g., spec with several acceptance items), the default cadence is many commits.

Commits use the project's conventional-commit shape where applicable. Stage only the files the implicit task touched; never run `git add -A` blindly. Commit subjects are descriptive of the implicit task's objective, not its substeps. Commit message bodies MAY include the four-state task report block from `## Four-State Status Protocol` so the audit trail lives in git history as well as chat output.

### Failed commit

**If a commit fails, report `BLOCKED` and stop. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), then stop the entire run. Subsequent implicit tasks are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject, a sign-off was missing. Each of those is the project telling the implementer to stop and let the user diagnose. `BLOCKED` is the correct response.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase in any form, does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

The policy is judgment-based and surfaced via task report — not pre-clearance, not blanket permission.

- **Follow the input or the implicit task list derived from it.** The input is the contract; the implicit task list is the implementer's interpretation. Do not silently invent tasks the input does not call for. Do not silently skip tasks the input does call for.
- **Use judgment when warranted.** If the input is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the input's intent. A blocked import path, a missing helper the input assumed existed, a renamed dependency the input did not know about: fix and continue.
- **Surface deviations in the task report.** Every deviation goes into the four-state status block. Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the input did not specify) are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations (the implementer made a structural choice the input did not anticipate, the implementer skipped a sub-step because it was unsafe to apply blindly) are `NEEDS_CONTEXT` with a clear "user clarification on X" next-action.
- **Do not pre-clear minor deviations.** This run is autonomous; it does not stop for every judgment call. The four-state report is where the user reads the trail.

## Immutability

Input artifacts are IMMUTABLE. The implementer reads them READ-ONLY. An approved spec, a proposal, a decision log, a seed, a plan artifact, and any other emitted record or latched versioned artifact under a thread's folders are not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not for any reason. (A spec that is still `approved` but not yet `implemented` may be amended only through a separate owner-approved, record-backed amendment pass — never as a side effect of this run.)

If during implementation the implementer discovers that the input is wrong (a spec acceptance criterion contradicts the observed code state, a seed names a fix that has already been applied), the correct move is to surface the finding in the four-state task report with a `DONE_WITH_CONCERNS` or `NEEDS_CONTEXT` status, capture it in the implementation report, and let the surrounding session decide what to do. The input artifact stays as it was. The implementer does not perform that revision as part of this run.

What the implementer DOES modify is SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository. The implementer also writes exactly one implementation report per `## Implementation Report` (the only thread artifact this run emits) and MAY capture a discovered follow-up as a seed for a future thread (or, in tier-3 phased work, append it to the next phase's `discussions/`) per the follow-up-routing rule. There is no inbox in this workflow — its residual job is served by the implementation report and by seeds of future threads. The implementer does NOT create new spec, proposal, plan, or decision-log artifacts inside this run; those require a separate authoring pass.
