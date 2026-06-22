---
name: implement-plan-interactive
description: Execute a structured plan artifact collaboratively on the current working tree, presenting each task, self-reviewing, and asking before each commit when the user wants plan implementation kept in-loop.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Implement Plan Interactive

Walk the user through a plan artifact's task list on the current working tree, push back on weak reasoning per the `## Anti-Sycophancy Stance`, run a self-review pass after each task, ASK before each commit at every plan-task boundary, report a four-state status per plan task, and emit a single immutable **implementation report** record on the way out. This skill is the collaborative single-agent implementation path for plan artifacts: it presents each task to the user, disagrees when warranted, surfaces what the plan did not anticipate, and never lets a commit land without the user's explicit go-ahead. Bad commits become expensive to rewind — the cheap moment to push back is BEFORE the commit lands, because commit history is sacred (no `--amend`, no rebase, no force-push).

This skill is SINGLE-AGENT. The current session is the implementer; the same session runs the self-review pass after each plan task and conducts the walk with the user. No subagents are spawned, no orchestrator role exists separate from the implementer role.

## Anti-Sycophancy Stance

Your job is to help the user reach an implementation that survives later scrutiny, not to make them feel good about whatever the plan task or their walk-through prompts call for. Treat the walk as a mutual attempt to land good code: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode at execution time because **bad commits become expensive to rewind** — the cheap moment to push back is BEFORE the commit lands, because commit history is sacred (no `--amend`, no rebase, no force-push). Once a commit lands, this skill will not revise it; the recovery path is a follow-up commit, and that follow-up is more expensive than catching the issue before the original commit was made.

Hold these together:

- **Disagree when you disagree.** If the user's framing of the plan task, their proposed implementation approach, the proposed commit boundary, or the proposed commit subject conflicts with the evidence, your read of the plan, or the codebase reality, say so plainly before they commit it to the diff or the commit message. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user's read of a plan task rests on an unexamined assumption, ignores a known constraint, or skips a risk or trade-off that the implementation will pay for, name the gap and bring it into the conversation before writing the code.
- **Surface what they didn't ask about.** Risks, hidden costs, ordering pitfalls, alternatives they dismissed too fast, missing prerequisite work, files the change should touch but the plan task did not mention, acceptance criteria the plan implied but did not state — raise them, even if it slows the walk down.
- **Take the user's input seriously.** If they push back, add context, or challenge your framing of the plan task, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never soften your read of a plan task just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a plan task differently, identify the exact assumption or value judgment causing the split, then resolve it before writing the code or the commit.
- **Refuse to log a task or commit you believe is wrong without flagging it.** If the user insists on executing a plan task as stated despite your read of the evidence, implement it, but surface the dissent in the four-state task report (`DONE_WITH_CONCERNS` with a one-sentence note, or `NEEDS_CONTEXT` if the dissent is structural and the implementer thinks the user has not yet seen the consequence). If the user insists on a commit subject or boundary you believe is wrong, ASK once more before committing; if they confirm, write the commit message with the dissent in the message body.
- **Keep the implementation owned by the evidence.** The goal is not for either side to win. The goal is to land a change that survives later scrutiny because the relevant context, objections, and trade-offs were actually considered before commits hit history.

If you believe the user is about to ASK you to commit something that is wrong, refuse to commit silently. Either resolve the disagreement first, or commit with the dissent included in the commit message body and in the four-state task report. The implementation phase is where unflagged bad calls become expensive — and unlike planning, execution-time bad calls cost real commit hashes that this skill will not rewind.

## Inputs

Accept a plan artifact path. The plan lives in a lineage folder under the thread root — `docs/threads/<YYMMDDHHMMSSZ-slug>/plans/NNN[-<desc>]/plan.md`. The plan file is simply `plan.md` inside its lineage folder `NNN[-<desc>]/`; it carries no UTC stamp and no `v<N>` in its name — the lineage folder is the stable identifier and the unit of reference. Both loose-granularity and strict-granularity plans are valid input — both require every plan task to be **sequential, isolated, independently implementable, and independently reviewable**, and both are executed in plan order by this skill.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the walk covers only the named task(s); when omitted, the walk covers every numbered task in the plan in order.

If the input is ambiguous — the thread holds multiple plan lineages (`plans/001/`, `plans/002-cli/`) and the user named "the plan" without a specific path — ASK the user which plan lineage is intended. There is no global "latest plan" algorithm. Do not silently pick by recency, by highest `NNN`, or by sort order. (There is exactly one `plan.md` per lineage; competing drafts never become emitted siblings — they live in `.wip/`.)

The plan artifact's task fields drive the walk. Loose-granularity plans give one or two task sentences per task — the walk surfaces the obvious substeps live with the user. Strict-granularity plans give a six-field block per task (objective / input-context / steps-substeps / files-modified / verification / acceptance criteria) — the walk presents each field, asks the user to confirm or adjust, then implements.

## Four-State Status Protocol

Every task report carries one of FOUR statuses. The states are named exactly as listed below; downstream readers match against these tokens. Use the names verbatim.

- The state DONE — `DONE` — means the plan task was completed and the implementer has no concerns to surface. The objective and acceptance criteria are met, the self-review pass found nothing to flag, and the verification block from the plan task (if any) passes mechanically. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the plan task was completed but at least one concern was surfaced during the walk: partial test coverage, a code smell the user accepted, an ambiguous plan area the user made a judgment call on, a possible-but-unverified edge case, a deviation the implementer applied per `## Plan Deviation Policy` (or that the user accepted live during the walk). The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the plan task could not be completed. Includes failed commits (see `## Commit Policy`), missing dependencies, inaccessible files, contradictory plan tasks, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent plan tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the plan task cannot proceed without information the implementer does not have. Includes "user clarification needed during the walk", "access to file outside repo needed", "external system credentials needed", "the plan task contradicts the observed code state and the implementer cannot pick the right side without further input". Distinct from `BLOCKED`: `BLOCKED` hit a hard error during execution; `NEEDS_CONTEXT` did not start because the missing input was a precondition.

### Task report block shape

The four-state status appears as a structured block in chat output and / or the commit message body for the task's commit (where applicable). The four-state status is NOT written to a separate artifact file — the chat output and the commit history together are the audit trail.

Suggested format (exact wording is at the implementer's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 5–10 line range):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Notes: <1–3 sentences explaining the rationale or surfaced concerns. Note any live dissents from the walk per the Anti-Sycophancy Stance.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY plan task by its four-state status, plus the commit SHA + subject for every commit made during the run. Include the plan artifact path so the user has the audit trail anchored to the source plan.

## Dirty Worktree Handling

This skill OWNS the dirty-worktree check — there is no orchestrator separate from this skill. The check is non-skippable. Run it ONCE at the start of the run, BEFORE reading the plan artifact or opening the walk.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the plan-resolution and walk-opening steps.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill asks to make) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit this skill makes once the user approves it (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not open the walk, do not modify the worktree.

This skill does not use `git worktree` isolation — every implementation runs on the current working tree, so the dirty-worktree check is non-skippable.

## Single-Agent Topology

This skill is SINGLE-AGENT. The current session reads the plan, walks the user through each plan task in order, implements each task, and self-reviews after each task. NO subagents are spawned. There is no `Task` tool invocation, no implementer / reviewer separation, no orchestrator role distinct from the implementer role — the single session IS all of those, and the self-review pass after each task plus the user's per-commit ASK gate are the only review layers in this single-agent topology.

If the user wants subagent-driven execution (orchestrator + implementer subagent + plan-compliance reviewer subagent + code-quality reviewer subagent, with re-spawn of a new implementer subagent on review failure), stop and tell them that this run is single-agent only. This skill does not spawn subagents and does not have an orchestrator role separate from the implementer role.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. If clean, proceed. If dirty, ASK; on abort, stop.

2. **Resolve the active thread and read the ledger.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If the plan path is already thread-rooted, the thread is implicit. If multiple thread roots exist and the plan path is ambiguous about which thread it belongs to, ASK — do not silently pick the most recent timestamp. Once the thread root is known, read its `ledger.md` (append-only; the current value of each key is its last matching line) for the **tier** and **disposition**. A plan input means tier ≥2 work, so the implementation report is part of this thread's Definition of Done. If the disposition is `closed: …`, the thread is sealed — stop and tell the user; do not write into a closed thread.

3. **Resolve the plan artifact path.** Detect the plan path from the user's invocation. If multiple plan lineages could plausibly match the user's reference (`plans/001/`, `plans/002-cli/`, "the plan" with no clear referent), ASK the user which plan lineage is intended. Do not pick by recency, by highest `NNN`, or by descriptor match.

4. **Read the plan READ-ONLY.** The plan artifact is IMMUTABLE — open it for reading only. Parse the numbered task list. For each task, record its objective, its verification block (if present), its acceptance criteria (if present in strict-granularity plans), and its files-modified list (if present in strict-granularity plans). If the user passed a specific task identifier, narrow the task list to that subset; otherwise walk every numbered task in plan order. Keep a running task list of these tasks and their state as you work, so progress stays legible.

5. **For each plan task IN ORDER:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first".)

   a. **PRESENT the task to the user.** Re-state the objective (one sentence paraphrased from the plan's objective field), the verification expectation, and the acceptance criteria if present. Surface ambiguity, contradictions with the observed code state, or under-specified inputs LIVE — push back per the `## Anti-Sycophancy Stance` if the task as written appears wrong for the current code state. Wait for the user to confirm the task framing or adjust it. If the user adjusts, capture the adjustment as a live deviation per `## Plan Deviation Policy`.

   b. **Implement the task.** Apply the substeps literally if strict-granularity; infer the obvious substeps if loose-granularity. Make the code changes the task calls for. Use judgment if the plan is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — but during the walk, prefer to SURFACE the deviation LIVE to the user before applying it, per `## Plan Deviation Policy`. After the user has decided, write the code.

   c. **Self-review the implementation.** Re-read the diff against the plan task's stated objective + verification + acceptance criteria. Check that the change is coherent with the plan, does not break adjacent code paths, and matches the project's conventions. If the plan task has a mechanical verification block (a `grep` check, a `test -f` check, a `npm test` invocation), run it and record the result. Self-review is in-session — no artifact file is written.

   d. **ASK the user before committing.** Show the user the proposed commit (subject + body + the changed-files list). ASK: "Commit task `<N>` now as `<proposed subject>`? Or adjust the subject / body / boundary before committing? Or skip the commit and continue making changes?". Wait for the user's answer. On confirm, commit per `## Commit Policy`. On adjust, revise per the user's instruction and re-ASK. On skip, do not commit; continue.

   e. **Commit or skip.** If the user confirmed, commit. If the commit succeeds, capture the SHA + subject. If the commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this plan task and stop the entire run.

   f. **Write the task report.** Use the four-state status block from `## Four-State Status Protocol`. The state goes in chat output and / or (if a commit was made) the commit message body.

6. **Emit the implementation report.** Once every plan task has run (or the run was halted at a `BLOCKED` task or by user decision), write the implementation report per `## Implementation Report`. This is the run's durable record and part of the Definition of Done.

7. **Final out-message.** Emit a final summary listing every plan task by its four-state status, the commit SHA + subject for each commit made, the plan lineage path the run executed (so the user has the audit trail anchored to the source plan), and the thread-relative path of the implementation report just written. If follow-ups were discovered, name where they were routed per `## Implementation Report`.

## Implementation Report

Every run emits exactly one **implementation report** — a record, immutable from the moment it is written (the industry analog is a PR description). It is the durable artifact this run produces; the four-state task blocks and the git history are the in-flight trail, the report is the summary that survives. The verify stage that may follow checks the implementation against the spec's acceptance criteria — not against the plan — so the report's account of where the implementation diverged from the plan matters.

**Where it lands.** Write it to the active thread's flat `implementation/` folder:

```text
implementation/<YYMMDDHHMMSSZ>-<kebab-desc>-implementation-report.md
```

`implementation/` is FLAT — records sit directly inside it, with no lineage (`NNN/`) subfolders and no `v<N>` folders (unlike `plans/`, which uses lineage folders). The filename uses the 12-character UTC stamp (no separators, trailing `Z`), a short kebab description, and the mandatory `implementation-report` artifact-type token. Reference the report path thread-relative (relative to the thread root), never absolute; reference anything in another thread repo-relative (`docs/threads/<other>/…`).

**It carries no frontmatter.** The report is a record with no lifecycle status of its own — so no YAML frontmatter at all. Its body is frozen at emission: never edit it after writing. If something needs correcting later, that is a NEW record, not an edit to this one.

**What it captures** — four content categories, all four present (write "none" where a category is empty):

1. **Deviations from the plan, with justification.** Every place the implementation diverged from what the plan task called for, each with a one-or-two-sentence reason — including the live deviations the user signed off on during the walk and any dissents flagged per the `## Anti-Sycophancy Stance`. Pull these from the `DONE_WITH_CONCERNS` and `NEEDS_CONTEXT` task blocks.
2. **Surprises.** Things the codebase or the task turned out to be that the plan did not anticipate.
3. **Problems hit.** Blockers, failures, and anything that forced a `BLOCKED` status or a mid-run course change.
4. **Follow-ups.** Work this run discovered but intentionally did not do — including scope-drift branches the user chose to defer during the walk.

**Follow-up routing.** Follow-ups discovered during implementation are NOT parked in any inbox — there is no inbox in this workflow. Route them one of two ways:

- **Default — seeds of future threads.** Capture each follow-up as a seed for a new thread (its own genesis record), or surface it in the report as a clearly-labelled candidate seed for the user to open later. This is the default for any standalone follow-up.
- **Tier-3 phased work — the next phase's discussion.** If the active thread is tier-3 phased work with a living roadmap, a follow-up that belongs to a later phase routes to that next phase's `discussions/` folder (the roadmap is a living list, not a frozen contract — a phase may welcome or defer the follow-ups appended to it). Confirm the thread is tier-3 phased work (per the ledger) before routing this way.

Name the routing decision for each follow-up in the report so the trail is explicit.

## Commit Policy

This skill ASKS before each commit. The per-commit gate is non-skippable.

- **Default boundary granularity:** One commit **per plan task** the agent executes from the plan. The boundary is the plan task; after the implement → self-review pair for a task succeeds, ASK the user whether to commit the diff that constitutes the task.
- **Override boundary:** When the user's invocation or in-walk instruction contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default per-plan-task cadence.
- **ASK the user before committing at every plan-task boundary.** Before EVERY commit boundary the skill would otherwise cross, ASK the user: present the proposed subject, body, and changed-files list; wait for confirm / adjust / skip. Do NOT commit silently. Do NOT commit on a sensible-looking default if the user has been silent.

Commits use the repository's existing commit convention when it is discoverable from recent history or local tooling. If no convention is obvious, use a short imperative subject that describes the plan task's objective. Stage only the files the plan task touched (strict-granularity plans state the file list explicitly under `Files modified` — use it; loose-granularity plans require the implementer to track touched files during implementation). Never run `git add -A` blindly. Commit message bodies MAY include the four-state task report block.

### Failed commit

**If a commit fails, report `BLOCKED` and stop. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), then stop the entire run. Subsequent plan tasks are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject. Each of those is the project telling the implementer to stop and let the user diagnose. `BLOCKED` is the correct response in this interactive run — the user can choose to resolve the underlying issue and start a fresh run, but this skill does not iterate on a failed commit autonomously inside the same run.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even when the user asks for a typo fix on a commit that already landed; the recovery path is a follow-up commit), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

The rationale ties back to the `## Anti-Sycophancy Stance`: bad commits become expensive to rewind. Because this skill will not rewrite history, the per-commit ASK gate is the place where mistakes are cheapest to catch. Use the gate — push back during the walk, push back during the ASK, refuse to silently land a commit you believe is wrong.

## Plan Deviation Policy

The policy is judgment-based and surfaced — both in the task report and, importantly for this interactive skill, LIVE during the walk.

- **Follow the plan.** The plan is the contract; the implementer executes the tasks in plan order, applying substeps where stated and inferring them where loose. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If the plan task is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, surface the deviation LIVE to the user before applying it — push back per the `## Anti-Sycophancy Stance`. Get the user's call before writing code that deviates from the literal plan.
- **Surface deviations in the task report.** Every deviation also goes into the four-state status block at task end. Minor deviations are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations the user signed off on during the walk are also `DONE_WITH_CONCERNS` with a note that the user explicitly agreed. Major deviations the implementer flagged but did not resolve are `NEEDS_CONTEXT`.
- **The walk is the live push-back channel.** This skill has the user in-loop for every plan task. Use the walk to raise deviations early, not just at task end. Pre-commit ASK is the second checkpoint where the user has the chance to reject.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the implementer does NOT re-shape the plan as a side effect of this run. Surface the finding live during the walk, capture it in the implementation report, propose stopping the run, and recommend the user re-shape the plan in a separate plan-adjustment pass (a plan is a disposable compiler-IR edited in place by its own authoring/adherence loop). The re-shaped plan is then handed back on a fresh run. If the plan deviates because the SPEC is ambiguous or incomplete, that is a spec fault — it routes to the human to fix the spec, never to a silent plan patch — but resolving it is outside this run's mandate; surface it and stop.

## Decision Log

The default behavior of this skill is to NOT auto-write a separate decision log. Most implementation-time decisions are captured fully in commit messages and in the four-state task report — settled decisions from the plan's input/context fields cited inline, dissents flagged where they emerged, deviations surfaced and signed off live during the walk. A standalone decision log is written ONLY when durable trade-offs or rejected alternatives emerge during the walk that cannot reasonably be captured in commit messages or the task report — for example, a structural choice the user weighed multiple alternatives for and explicitly rejected the others, with rationale that downstream readers will need to understand independently of any specific commit.

When such a decision log IS warranted, write it to the implementation node's discussions folder — `implementation/discussions/<UTC>-<kebab-desc>-decision-log.md` (a record: UTC stamp, kebab description, the mandatory `decision-log` artifact-type token, no frontmatter). Discussions attach to the spine node they serve, and a decision that emerged while implementing serves the implementation node. Use sequential `## P<N>: <Title>` headings with `Decision:` and `Rationale:` lines. If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim. The four-state task report and the implementation report cite the new log by thread-relative path at the location where its decisions are operative.

When in doubt about whether a side-conversation rises to "durable trade-off" status, ASK the user. The default is no decision log.

## Scope Drift

When the user introduces a branch that is outside the plan being walked, do not silently follow them and do not let the run grow into a different shape than the one the plan defines. Propose ONE of:

1. **Capture as a follow-up for the implementation report** (PREFERRED for non-blocking side-findings). Note the side-finding so it lands in the report's follow-ups section and routes per `## Implementation Report` — to a seed of a future thread (the default), or, in tier-3 phased work, to the next phase's `discussions/`. There is no inbox in this workflow.
2. **Split into its own thread.** When the branch is itself worth a dedicated spec or a separate discussion, hand it off — capture it as a seed for a new thread rather than expanding the current run beyond the plan's intent.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in the walk and let it pass.

ASK the user which. Do not pick silently.

## Immutability

Plan artifacts are IMMUTABLE. The implementer reads them READ-ONLY. The plan file is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

If during the walk the user proposes editing the plan as a side effect of this run (e.g., "fix the typo in task 2 while you're at it", "remove task 5 because we already did it"), refuse — re-shaping the plan is a separate plan-adjustment pass, then handed back on a fresh run. The implementer does not perform that revision inside this run.

What the implementer DOES modify is source code, plus exactly one implementation report per `## Implementation Report` (the run's durable thread artifact). The implementer MAY also (a) capture a discovered follow-up or a scope-drift branch as a seed for a future thread (or, in tier-3 phased work, append it to the next phase's `discussions/`) per the follow-up-routing rule, and (b) write a decision log per `## Decision Log` when the user signs off on the durable-trade-off threshold. There is no inbox in this workflow. The implementer does NOT create new spec / proposal / plan artifacts inside this run; those require a separate authoring pass.

The thread folder set's `.wip/` discipline (recursively gitignored, never used for emitted artifacts) and the on-demand folder creation rule (a folder appears only when its first artifact lands) are binding on any thread-scoped file this skill touches. Within-thread paths are written thread-relative; cross-thread paths repo-relative; never absolute.
