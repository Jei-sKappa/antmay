---
name: implement-plan-with-subagents-interactive
description: Execute every task in a plan artifact through an implementer and dual-reviewer subagent loop, asking before each commit when the user wants the heavier review path kept in-loop and the runtime supports subagents.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.1
---

# Implement Plan With Subagents Interactive

Orchestrate the collaborative, plan-driven, multi-subagent implementation of a plan artifact. This skill is the orchestrator role: it does not write code itself — it reads the plan artifact READ-ONLY, walks the numbered task list in plan order, dispatches an **implementer subagent** for each task, dispatches a **spec-compliance reviewer subagent** (first pass), dispatches a **code-quality reviewer subagent** (second pass), respawns a NEW implementer subagent on review failure, re-reviews every fix before advancing, pushes back per the `## Anti-Sycophancy Stance` LIVE during the walk, ASKS the user before committing each orchestration cycle, commits on confirm, reports a four-state status per plan task, and emits a single immutable **implementation report** record on the way out. Bad commits become expensive to rewind — the cheap moment to push back is BEFORE the commit lands, because commit history is sacred (no `--amend`, no rebase, no force-push).

## Subagent Capability Precondition

**This skill REQUIRES subagent capability** (e.g., a `Task` tool or equivalent agent dispatch primitive that lets the orchestrator spawn an independent subagent with its own context window and have it write files to disk before replying with an acknowledgment). The orchestrator role this skill defines is meaningful only when implementer and reviewer subagents are real, separate-context dispatches.

**This skill does NOT fall back to inline execution.** There is no "if subagents are unavailable, do it yourself" branch. The orchestrator does not write code in-session, does not run reviews in-session, and does not collapse the three subagent roles back into a single agent — that defeats the dual-reviewer separation and the fresh-context-per-fix discipline. If your runtime does not support subagents, use a single-agent plan-execution skill instead.

Subagent topology is a precondition of THIS skill, not a feature toggle.

## Anti-Sycophancy Stance

Your job is to help the user reach an implementation that survives later scrutiny, not to make them feel good about whatever the plan task, the reviewer findings, or the commit-boundary proposal calls for. Treat the walk as a mutual attempt to land good code: the user may be missing consequences, the plan author may have missed something the working tree reveals, the reviewer subagents may surface findings the user disagrees with, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode at execution time because **bad commits become expensive to rewind** — the cheap moment to push back is BEFORE the commit lands, because commit history is sacred (no `--amend`, no rebase, no force-push). Once a commit lands, this skill will not revise it; the recovery path is a follow-up commit, and that follow-up is more expensive than catching the issue before the original commit was made.

Hold these together:

- **Disagree when you disagree.** If the user's framing of the plan task, their proposed adjustment to a reviewer finding, the proposed commit boundary, or the proposed commit subject conflicts with the evidence, your read of the plan, the reviewer subagents' findings, or the codebase reality, say so plainly before they commit it to the diff or the commit message. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user's read of a plan task, their dismissal of a reviewer finding, or their proposal to skip a fix iteration rests on an unexamined assumption, ignores a known constraint, or skips a risk or trade-off that the implementation will pay for, name the gap and bring it into the conversation before dispatching the next subagent or committing the cycle.
- **Surface what they didn't ask about.** Risks, hidden costs, ordering pitfalls, alternatives the reviewers dismissed too fast, missing prerequisite work, files the change should touch but the plan task did not mention, acceptance criteria the plan implied but did not state — raise them, even if the reviewer subagents' findings missed them. The reviewers are scoped to their respective concerns; you are not.
- **Take the user's input seriously.** If they push back, add context, or challenge your framing of a reviewer finding or your proposal to loop the fix, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never soften your read of a reviewer finding or a plan-task concern just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a plan task or a reviewer finding differently, identify the exact assumption or value judgment causing the split, then resolve it before dispatching the next subagent or proposing a commit.
- **Refuse to log a task or commit you believe is wrong without flagging it.** If the user insists on accepting a reviewer's findings without a fix iteration despite your read that the fix matters, or insists on committing a cycle with the dissent unresolved, ASK once more before committing; if they confirm, surface the dissent in the four-state task report (`DONE_WITH_CONCERNS` with a one-sentence note, or `NEEDS_CONTEXT` if the dissent is structural and the user has not yet seen the consequence) and write the commit message with the dissent in the body.
- **Keep the implementation owned by the evidence.** The goal is not for either side to win. The goal is to land a change that survives later scrutiny because the relevant context, objections, reviewer findings, and trade-offs were actually considered before commits hit history.

If you believe the user is about to ask you to commit a cycle that is wrong, refuse to commit silently. Either resolve the disagreement first, or commit with the dissent included in the commit message body and in the four-state task report. The implementation phase is where unflagged bad calls become expensive — and unlike planning, execution-time bad calls cost real commit hashes that this skill will not rewind.

## No Worktree Isolation

The subagents this skill dispatches run sequentially on the SAME working tree as the orchestrator. This skill does NOT use `git worktree add` isolation, parallel-worktree topology, or separate per-subagent working directories. Each subagent's writes to the working tree are observable to the next subagent — the spec-compliance reviewer reads what the implementer just wrote; the next implementer (on a fix iteration) reads the previous implementer's diff and the reviewer's findings; the code-quality reviewer reads the same final post-fix state. Subagents run sequentially, on the same tree, in the order this skill's `## Workflow` defines.

No parallel implementer dispatch. No per-task worktree branch. The orchestration cycle (one task) ends with one commit on the current working tree once the user confirms; the next cycle starts from that committed state on the same tree.

## Inputs

This skill accepts a plan artifact path. The plan lives in a lineage folder under the thread root — `docs/threads/<YYMMDDHHMMSSZ-slug>/plans/NNN[-<desc>]/plan.md`. The plan file is simply `plan.md` inside its lineage folder `NNN[-<desc>]/`; it carries no UTC stamp and no `v<N>` in its name — the lineage folder is the stable identifier and the unit of reference. The plan is a numbered-task Markdown document produced by a prior plan-authoring pass — both loose-granularity and strict-granularity formats are valid input. Both honor the contract that every plan task is **sequential, isolated, independently implementable, and independently reviewable**, and both are executed in plan order by this skill. Strict-granularity plans give the implementer subagent and the spec-compliance reviewer subagent more to match against (a six-field per-task block: objective, files modified, substeps, verification, acceptance criteria, rollback notes). Loose-granularity plans require the implementer to infer the obvious substeps from the objective and verification sentence. Either granularity is valid input — the granularity is a property of the plan, not a switch on this skill.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the walk covers only the named task(s); when omitted, the walk covers every numbered task in the plan in order.

If the input is ambiguous — the thread holds multiple plan lineages (`plans/001/`, `plans/002-cli/`) and the user named "the plan" without a specific path — ASK the user which plan lineage is intended. There is no global "latest plan" algorithm. Do not silently pick by recency, by highest `NNN`, or by sort order. (There is exactly one `plan.md` per lineage; competing drafts never become emitted siblings — they live in `.wip/`.)

## Four-State Status Protocol

Every orchestration cycle's task report carries one of FOUR statuses. Use the names verbatim — downstream readers match against these tokens.

- `DONE` — the plan task was completed and BOTH reviewers (spec-compliance and code-quality) passed without surfaced issues, or with issues that the subsequent fix iterations fully resolved. The user confirmed the commit at the per-cycle ASK gate. The orchestrator has no concerns to surface. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the plan task was completed but at least one concern was surfaced — by one of the reviewer subagents, by the orchestrator's own audit of the cycle, or by a live dissent during the walk that the user signed off on. Examples: a code-quality reviewer flagged a code smell the user accepted, the user agreed to skip a non-blocking fix iteration, the implementer made a judgment call on an ambiguous plan area the user signed off on, a possible-but-unverified edge case the reviewers could not exercise. The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the orchestration cycle could not complete. Includes failed commits (see `## Commit Policy`), missing dependencies the implementer subagent could not resolve, inaccessible files, contradictory plan tasks, repeated review failures the fix loop could not close, the user aborting the walk mid-cycle. A `BLOCKED` report ends the flow at this task — subsequent plan tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the orchestration cycle cannot proceed without information neither the orchestrator nor the implementer subagent has — including dissents flagged live per the `## Anti-Sycophancy Stance` that the user has not yet resolved. Distinct from `BLOCKED`: a `BLOCKED` cycle hit a hard error during execution; a `NEEDS_CONTEXT` cycle did not start (or did not progress past initial setup) because the missing input was a precondition.

### Task report block shape (with subagent audit)

The four-state status appears as a structured block in chat output and / or the commit message body for the orchestration cycle's commit (where applicable). The four-state status is NOT written to a separate artifact file — the chat output and the commit history together are the audit trail. Because this skill dispatches subagents, the task report MUST explicitly list (a) which subagents ran, (b) how many fix iterations occurred per review pass, and (c) the final state per task — this is the audit trail without a separate state file.

Suggested format (exact wording is at the orchestrator's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 8–15 line range to accommodate the subagent audit):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Subagents ran:
  - implementer: <N> dispatch(es)
  - spec-compliance reviewer: <N> dispatch(es), <N> fix iteration(s)
  - code-quality reviewer: <N> dispatch(es), <N> fix iteration(s)
Notes: <1–3 sentences explaining the rationale or surfaced concerns. Note any live dissents from the walk per the Anti-Sycophancy Stance.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY plan task by its four-state status, plus the per-task subagent audit and the commit SHA + subject for every commit made during the run. Include the plan artifact path so the user has the audit trail anchored to the source plan.

## Dirty Worktree Handling

**The orchestrator runs the dirty-worktree check** — NOT the implementer subagent. The check is owned by the orchestrator role this skill defines, and the orchestrator runs it BEFORE spawning the first implementer subagent. The implementer subagent assumes a clean tree per the orchestrator's verification; reviewer subagents inspect `git diff` against the cycle's starting state and trust that the diff is the implementer's work, not pre-existing noise.

The check is non-skippable. Run it ONCE at the start of the run, BEFORE reading the plan artifact or opening the walk:

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the plan-resolution step.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill asks to make) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently. Do NOT delegate this check to the implementer subagent.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit the orchestrator makes once the user approves it (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not read the plan, do not open the walk, do not spawn any subagent, do not modify the worktree.

Because this skill runs every implementation on the current working tree without worktree isolation, the orchestrator-owned dirty-worktree check is non-skippable. Subagents share that working tree per the no-worktree-isolation rule above.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. The orchestrator runs the dirty-worktree check at the very start. If clean, proceed. If dirty, ASK; on abort, stop. Do not dispatch any subagent until the check is satisfied.

2. **Resolve the active thread and read the ledger.** Identify the thread root directory (`docs/threads/<YYMMDDHHMMSSZ-slug>/`) that contains the plan artifact. If the plan path is already thread-rooted, the thread is implicit. If multiple thread roots exist and the plan path is ambiguous about which thread it belongs to, ASK the user — do not silently pick the most recent timestamp. Once the thread root is known, the orchestrator reads its `ledger.md` (append-only; the current value of each key is its last matching line) for the **tier** and **disposition**. A plan input means tier ≥2 work, so the implementation report is part of this thread's Definition of Done. If the disposition is `closed: …`, the thread is sealed — stop and tell the user; do not write into a closed thread, do not spawn any subagent.

3. **Resolve the plan artifact path.** Detect the plan path from the user's invocation. If multiple plan lineages could plausibly match the user's reference (`plans/001/`, `plans/002-cli/`, "the plan" with no clear referent), ASK the user which plan lineage is intended. Do not pick by recency, by highest `NNN`, or by descriptor match.

4. **Read the plan READ-ONLY.** The plan artifact is IMMUTABLE — open it for reading only. Parse the numbered task list. For each task, record its objective, its verification block (if present), its acceptance criteria (if present in strict-granularity plans), and its files-modified list (if present in strict-granularity plans). If the user passed a specific task identifier, narrow the task list to that subset; otherwise walk every numbered task in plan order.

5. **For each plan task IN ORDER — the orchestration cycle:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first". Subagents within a cycle run sequentially on the same working tree per `## No Worktree Isolation`.)

   a. **PRESENT the task to the user.** Re-state the objective, the verification expectation, and the acceptance criteria if present. Surface ambiguity, contradictions with the observed code state, or under-specified inputs LIVE — push back per the `## Anti-Sycophancy Stance` if the task as written appears wrong for the current code state. The user may have additional context the orchestrator does not have; the orchestrator may have observed evidence (from the working tree, the plan, the prior cycle's outcome) the user has not yet seen. Wait for the user to confirm the task framing or adjust it. If the user adjusts, capture the adjustment as a live deviation per `## Plan Deviation Policy`.

   b. **Spawn the implementer subagent** with a self-contained brief from `## Subagent Briefs`. Pass the plan artifact path + the current plan task identifier + (optionally) the plan-level context the orchestrator extracted in step 4 + any live walk adjustments the user signed off on in step a. Wait for the implementer subagent to return. The implementer writes code changes directly to the working tree and replies with a 2–3 sentence summary plus the paths of modified files. The orchestrator inspects the working tree itself (`git status --porcelain`, `git diff`) rather than trusting the reply's prose — the working tree is the completion signal; the reply is only acknowledgment.

   c. **Spawn the spec-compliance reviewer subagent — the FIRST review pass.** Use a self-contained brief from `## Subagent Briefs` that loads the reviewer prompt at `references/spec-compliance-reviewer.md` (resolved relative to this skill's directory) and points the reviewer at the current plan task's verification block + acceptance criteria. The reviewer reads `git diff` (or the modified files file-by-file) against the plan task and writes its structured review output to a designated `.wip/` scratch path the orchestrator chooses — `.wip/` is recursively gitignored so the review output does not pollute the working tree's commit history. Wait for the reviewer to return. Read the structured review file from disk; do not trust the reply's prose. Surface the findings LIVE to the user per the `## Anti-Sycophancy Stance`.

   d. **If the spec-compliance reviewer surfaced ISSUES**, the orchestrator weighs them WITH the user. Push back if the user proposes to skip a fix iteration on findings the orchestrator's read says matter. On the user's confirm-to-fix decision, enter the fix loop: spawn a NEW implementer subagent (always respawn a fresh implementer for the fix; the original implementer's context is gone). Include in the fix brief: the original plan task, the spec-compliance reviewer's findings (path to the review file), the user's live walk adjustments if any, and a clear directive that the fix MUST address the surfaced issues without re-introducing prior reviewer-approved behavior. Wait for the fix implementer to return. RE-REVIEW the fix — spawn a NEW spec-compliance reviewer subagent with a fresh brief that points at the fix's diff and the same reviewer prompt. Loop the fix-and-re-review pattern until spec-compliance PASSES OR the user explicitly accepts the remaining findings (recorded as `DONE_WITH_CONCERNS`). Each iteration costs one implementer + one reviewer subagent.

   e. **Spawn the code-quality reviewer subagent — the SECOND review pass.** Use a self-contained brief that loads the reviewer prompt at `references/code-quality-reviewer.md` (resolved relative to this skill's directory) and points the reviewer at the final post-fix diff (the diff at this point reflects the implementer's original work plus any spec-compliance fix iterations). Wait for the reviewer to return. Read the structured review file from disk. Surface the findings LIVE to the user per the `## Anti-Sycophancy Stance`.

   f. **If the code-quality reviewer surfaced ISSUES**, the orchestrator weighs them WITH the user. Same anti-sycophancy push-back. On the user's confirm-to-fix decision, enter the same fix loop as step d — spawn a NEW implementer per fix, spawn a NEW code-quality reviewer per re-review. Loop until code-quality PASSES OR the user explicitly accepts the remaining findings.

   g. **ASK the user before committing — per orchestration cycle.** Show the user the proposed commit (subject + body + the changed-files list + the four-state task report block with the subagent audit). ASK: "Commit task `<N>` now as `<proposed subject>`? Or adjust the subject / body / boundary before committing? Or skip the commit and continue making changes?". Wait for the user's answer. On confirm, commit per `## Commit Policy`. On adjust, revise per the user's instruction and re-ASK. On skip, do not commit; continue.

   h. **Commit or skip.** If the user confirmed, the orchestrator commits per `## Commit Policy`. Commit cadence is per orchestration cycle — one commit per task after all reviews pass. The orchestrator stages and commits the task-related files (the strict-granularity plan's `Files modified` list is authoritative; loose-granularity plans require the orchestrator to track touched files across the cycle's implementer dispatches) and runs the commit itself. The implementer subagent does not commit; the reviewer subagents do not commit. If the commit succeeds, capture the SHA + subject. If the commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this task and stop the entire run.

   i. **Write the orchestration cycle task report.** Use the four-state status block (with the subagent audit) from `## Four-State Status Protocol`. The state goes in chat output and / or (if a commit was made) the commit message body. Note any live dissents from the walk.

6. **The orchestrator emits the implementation report.** Once every plan task has run (or the run was halted at a `BLOCKED` task or by user decision), the ORCHESTRATOR writes the implementation report per `## Implementation Report` — this is a synthesis the orchestrator owns, folded from the per-cycle task reports, the subagent audit, and the live walk decisions it already holds; it is NOT delegated to a subagent. This is the run's durable record and part of the Definition of Done.

7. **Final out-message.** Emit a final summary listing every plan task by its four-state status, the per-task subagent audit, the commit SHA + subject for each commit made, the plan lineage path the run executed (so the user has the audit trail anchored to the source plan), and the thread-relative path of the implementation report just written. If follow-ups were discovered, name where they were routed per `## Implementation Report`.

## Implementation Report

The ORCHESTRATOR emits exactly one **implementation report** per run — a record, immutable from the moment it is written (the industry analog is a PR description). The orchestrator writes it directly (it is a synthesis of the per-cycle task reports, the subagent audits, and the live walk decisions the orchestrator already holds); it is not delegated to a subagent, and the orchestrator does not load any subagent reply as the report's content. The four-state task blocks, the subagent audit, and the git history are the in-flight trail; the report is the summary that survives. The verify stage that may follow checks the implementation against the spec's acceptance criteria — not against the plan — so the report's account of where the implementation diverged from the plan matters.

**Where it lands.** Write it to the active thread's flat `implementation/` folder:

```text
implementation/<YYMMDDHHMMSSZ>-<kebab-desc>-implementation-report.md
```

`implementation/` is FLAT — records sit directly inside it, with no lineage (`NNN/`) subfolders and no `v<N>` folders (unlike `plans/`, which uses lineage folders). The filename uses the 12-character UTC stamp (no separators, trailing `Z`), a short kebab description, and the mandatory `implementation-report` artifact-type token. Reference the report path thread-relative (relative to the thread root), never absolute; reference anything in another thread repo-relative (`docs/threads/<other>/…`). The report is NOT a `.wip/` scratch file — `.wip/` holds the recursively-gitignored reviewer review files; the implementation report is an emitted, version-controlled record under `implementation/`.

**It carries no frontmatter.** The report is a record with no lifecycle status of its own — so no YAML frontmatter at all. Its body is frozen at emission: never edit it after writing. If something needs correcting later, that is a NEW record, not an edit to this one.

**What it captures** — four content categories, all four present (write "none" where a category is empty):

1. **Deviations from the plan, with justification.** Every place the implementation diverged from what the plan task called for, each with a one-or-two-sentence reason — including the live deviations the user signed off on during the walk, dissents flagged per the `## Anti-Sycophancy Stance`, deviations the implementer subagents surfaced, and deviations either reviewer subagent flagged. Pull these from the `DONE_WITH_CONCERNS` and `NEEDS_CONTEXT` cycle reports.
2. **Surprises.** Things the codebase or the task turned out to be that the plan did not anticipate.
3. **Problems hit.** Blockers, failures, non-converging fix loops, and anything that forced a `BLOCKED` status.
4. **Follow-ups.** Work this run discovered but intentionally did not do — including scope-drift branches the user chose to defer during the walk.

**Follow-up routing.** Follow-ups discovered during implementation are NOT parked in any inbox — there is no inbox in this workflow. Route them one of two ways:

- **Default — seeds of future threads.** Capture each follow-up as a seed for a new thread (its own genesis record), or surface it in the report as a clearly-labelled candidate seed for the user to open later. This is the default for any standalone follow-up.
- **Tier-3 phased work — the next phase's discussion.** If the active thread is tier-3 phased work with a living roadmap, a follow-up that belongs to a later phase routes to that next phase's `discussions/` folder (the roadmap is a living list, not a frozen contract — a phase may welcome or defer the follow-ups appended to it). Confirm the thread is tier-3 phased work (per the ledger) before routing this way.

Name the routing decision for each follow-up in the report so the trail is explicit.

## Subagent Briefs

Each dispatched agent gets a self-contained brief. The orchestrator never inherits the agent's session and never loads the agent's output back into its own context. Each brief contains: scope, input paths, output path, return contract, and hard constraints. The orchestrator reads files the subagent wrote (the working tree, the review output file under `.wip/`); the reply is acknowledgment only.

### Implementer subagent

- **Scope** — the current orchestration cycle's context: the plan artifact path, the current plan task identifier, (optionally) the plan-level context the orchestrator extracted at step 4 of `## Workflow`, and any live walk adjustments the user signed off on in step a. On a fix iteration, also include the reviewer's findings (path to the structured review file under `.wip/`) and any user-signed-off adjustments to those findings.
- **Input paths** — the plan artifact path (READ-ONLY); on fix iterations, the prior reviewer's structured review output file (READ-ONLY).
- **Output path** — the implementer writes code changes DIRECTLY to the working tree at the file paths the plan task names (strict-granularity) or the implementer infers (loose-granularity). No notes file; the working tree IS the output.
- **Return contract** — write the source-code changes to the working tree; reply to the orchestrator with ONLY a 2–3 sentence summary plus the paths of modified files. Do NOT paste the diff back. Do NOT commit (the orchestrator commits per `## Commit Policy` after the user confirms at the ASK gate). Do NOT run `git commit`, `git add` outside of standard staging, or any history-rewriting operation.
- **Hard constraints** — do NOT modify the plan artifact (it is immutable — read-only); stay within the working tree; do NOT commit; do NOT rewrite history; do NOT spawn further subagents; do NOT use `git worktree`; on a fix iteration, do NOT re-introduce behavior the prior reviewer approved while addressing the new findings.

### Spec-compliance reviewer subagent (first pass)

- **Scope** — review the diff against the plan task's verification block and acceptance criteria. The single question this reviewer answers: "Does the diff implement what the task said it would?" Codebase quality, style, refactor opportunities, and idiomatic-fit are OUT of scope here — those belong to the code-quality reviewer (second pass).
- **Input paths** — the plan artifact path (READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection of the modified paths); the method reference at `references/spec-compliance-reviewer.md` resolved relative to this skill's directory (absolute path computed by the orchestrator).
- **Output path** — a designated `.wip/` scratch file the orchestrator names (e.g., `docs/threads/<thread>/.wip/<UTC>-task-<N>-spec-compliance-review.md`). The reviewer writes its structured review (Verdict + findings + references) to this path.
- **Return contract** — write the review file directly; reply to the orchestrator with ONLY a 2–3 sentence summary plus the path of the review file. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT run tests beyond what the plan task's verification block prescribes (running the prescribed verification is in scope and expected); do NOT commit.

### Code-quality reviewer subagent (second pass)

- **Scope** — review the diff for readability, safety, idiomatic patterns given the codebase, and regression risk. The single question this reviewer answers: "Is the diff well-structured, safe, idiomatic given the codebase?" Spec compliance (does the diff implement what the task said it would?) is OUT of scope here — that was the first pass.
- **Input paths** — the plan artifact path (READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection — note that the diff at this point reflects the implementer's original work plus any spec-compliance fix iterations); the method reference at `references/code-quality-reviewer.md` resolved relative to this skill's directory (absolute path computed by the orchestrator).
- **Output path** — a designated `.wip/` scratch file the orchestrator names (e.g., `docs/threads/<thread>/.wip/<UTC>-task-<N>-code-quality-review.md`). The reviewer writes its structured review (Verdict + findings + references) to this path.
- **Return contract** — write the review file directly; reply to the orchestrator with ONLY a 2–3 sentence summary plus the path of the review file. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT commit.

## Commit Policy

The orchestrator commits AFTER the user confirms at the per-cycle ASK gate. The per-commit ASK gate is non-skippable.

- **Default boundary granularity:** One commit **per orchestration cycle** (one commit per plan task after BOTH reviewers PASS or after the user explicitly accepts remaining findings). The boundary is the orchestration cycle; subagents within the cycle do NOT commit. The orchestrator stages and commits the task-related files (strict-granularity plans state the files explicitly under `Files modified`; loose-granularity plans require the orchestrator to track which files the implementer dispatches touched across the cycle).
- **Override boundary:** When the user's invocation or in-walk instruction contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default per-orchestration-cycle cadence.
- **ASK the user before committing at every orchestration cycle.** Before EVERY commit boundary the skill would otherwise cross, ASK the user: present the proposed subject, body, changed-files list, and the four-state task report block (with the subagent audit); wait for confirm / adjust / skip. Do NOT commit silently. Do NOT commit on a sensible-looking default if the user has been silent.

Commits use the project's conventional-commit shape where applicable; follow the project's contribution guidelines for scope rules. Stage only the files the orchestration cycle touched. Never run `git add -A` blindly. Commit subjects describe the plan task's objective; commit message bodies MAY include the four-state task report block.

### Failed commit

**If a commit fails, the orchestrator reports `BLOCKED` and stops. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), then stop the entire run. Subsequent plan tasks are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject. Each of those is the project telling the orchestrator to stop and let the user diagnose. `BLOCKED` is the correct response in this interactive run — the user can choose to resolve the underlying issue and start a fresh run, but this skill does not iterate on a failed commit autonomously inside the same run.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The orchestrator does not amend commits (no `commit --amend`, even when the user asks for a typo fix on a commit that already landed; the recovery path is a follow-up commit), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the orchestrator made earlier in the same run. Subagents are also forbidden from history rewriting; the orchestrator's brief to each subagent names this constraint. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

The rationale ties back to the `## Anti-Sycophancy Stance`: bad commits become expensive to rewind. Because this skill will not rewrite history, the per-cycle ASK gate is the place where mistakes are cheapest to catch. Use the gate — push back during the walk, push back during the ASK, refuse to silently land a commit you believe is wrong.

## Plan Deviation Policy

- **Follow the plan.** The plan is the contract; the orchestrator dispatches one implementer per plan task in plan order. The implementer applies substeps where stated (strict-granularity) and infers them where loose. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If the plan task is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, surface the deviation LIVE to the user before dispatching the implementer subagent — push back per the `## Anti-Sycophancy Stance`. Get the user's call before writing code that deviates from the literal plan.
- **Surface deviations in the task report.** Every deviation also goes into the four-state status block (with the subagent audit) at task end. Minor deviations the user signed off on during the walk are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations the user signed off on are also `DONE_WITH_CONCERNS` with a note that the user explicitly agreed. Major deviations the orchestrator flagged but did not resolve are `NEEDS_CONTEXT`.
- **Reviewer-surfaced deviations.** Either reviewer (spec-compliance first, code-quality second) may surface a deviation in its findings. The orchestrator surfaces those LIVE to the user. Per the `## Anti-Sycophancy Stance`, the orchestrator MAY honor the user's choice to skip a fix iteration but reports `DONE_WITH_CONCERNS` for the task in that case — with the dissent named in the task report and (if applicable) in the commit message body.
- **The walk is the live push-back channel.** This skill has the user in-loop for every orchestration cycle. Use the walk to raise deviations early — before the implementer subagent is dispatched, before the reviewer subagents are dispatched, and before the ASK gate at commit time. The ASK gate is the second checkpoint where the user has the chance to reject.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the orchestrator does NOT re-shape the plan as a side effect of this run. Surface the finding live during the walk, capture it in the implementation report, propose stopping the run, and recommend the user re-shape the plan in a separate plan-adjustment pass (a plan is a disposable compiler-IR edited in place by its own authoring/adherence loop). The re-shaped plan is then handed back on a fresh run. If the plan deviates because the SPEC is ambiguous or incomplete, that is a spec fault — it routes to the human to fix the spec, never to a silent plan patch — but resolving it is outside this run's mandate; surface it and stop.

## Decision Log

The default behavior of this skill is to NOT auto-write a separate decision log. Most implementation-time decisions are captured fully in commit messages and in the four-state task report — settled decisions cited inline, dissents flagged where they emerged, reviewer findings surfaced and resolved live during the walk, deviations the user signed off on documented in the task report. A standalone decision log is written ONLY when durable trade-offs or rejected alternatives emerge during the walk that cannot reasonably be captured in commit messages or the task report — for example, a structural choice the user weighed multiple alternatives for and explicitly rejected the others, with rationale that downstream readers will need to understand independently of any specific commit.

When such a decision log IS warranted, the orchestrator writes it to the implementation node's discussions folder — `implementation/discussions/<UTC>-<kebab-desc>-decision-log.md` (a record: UTC stamp, kebab description, the mandatory `decision-log` artifact-type token, no frontmatter). Discussions attach to the spine node they serve, and a decision that emerged while implementing serves the implementation node. Use sequential `## P<N>: <Title>` headings with `Decision:` and `Rationale:` lines. If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim. Reference the log thread-relative.

When in doubt about whether a side-conversation rises to "durable trade-off" status, ASK the user. The default is no decision log.

## Scope Drift

When the user introduces a branch that is outside the plan being walked, do not silently follow them and do not let the run grow into a different shape than the one the plan defines. Propose ONE of:

1. **Capture as a follow-up for the implementation report** (PREFERRED for non-blocking side-findings). Note the side-finding so it lands in the report's follow-ups section and routes per `## Implementation Report` — to a seed of a future thread (the default), or, in tier-3 phased work, to the next phase's `discussions/`. There is no inbox in this workflow.
2. **Split into its own thread.** When the branch is itself worth a dedicated spec or a separate discussion, hand it off — capture it as a seed for a new thread rather than expanding the current run beyond the plan's intent.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in the walk and let it pass.

ASK the user which. Do not pick silently.

## Immutability

Plan artifacts are IMMUTABLE. The orchestrator reads them READ-ONLY; the implementer subagent reads them READ-ONLY; both reviewer subagents read them READ-ONLY. The plan file is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

If during the walk the user proposes editing the plan in place (e.g., "fix the typo in task 2 while you're at it", "remove task 5 because we already did it"), refuse per the immutability rule and per the `## Anti-Sycophancy Stance`. A revised plan is a new plan version produced in a separate plan-authoring pass, then handed back on a fresh run. The orchestrator does not perform that revision inside this run.

What the subagents DO modify is source code (the implementer subagent) or `.wip/` review scratch files (the reviewer subagents). Review scratch files are written under the thread's `.wip/` folder — `.wip/` is recursively gitignored, so the review output does not enter version control. The ORCHESTRATOR additionally emits exactly one implementation report per `## Implementation Report` (the run's durable thread artifact, under `implementation/`) and MAY ALSO (a) capture a discovered follow-up or a scope-drift branch as a seed for a future thread (or, in tier-3 phased work, append it to the next phase's `discussions/`) per the follow-up-routing rule, and (b) write a decision log per `## Decision Log` when the user signs off on the durable-trade-off threshold. There is no inbox in this workflow. Neither the orchestrator nor any subagent creates new spec, proposal, or plan artifacts inside this run; those require a separate authoring pass. Thread folders are created on demand (a folder appears only when its first artifact lands); within-thread paths are written thread-relative, cross-thread paths repo-relative, never absolute.
