---
name: implement-plan-with-subagents-interactive
description: Take a V1 plan artifact path (loose or strict granularity, produced by any of the Phase 4 plan-* skills) and execute every plan task in order on the current working tree by orchestrating a dispatch loop — implementer subagent → spec-compliance reviewer subagent (first pass) → fix loop respawning a NEW implementer on issues with re-review until pass → code-quality reviewer subagent (second pass) → same fix loop — and ASK the user before committing each orchestration cycle. Collaborative (per-commit ASK; live anti-sycophancy push-back during the walk). REQUIRES subagent capability — this skill does NOT fall back to inline execution; if your runtime does not support subagents, use `implement-plan-auto` or `implement-plan-interactive` instead. Use when you have a plan artifact under `docs/threads/<thread>/plans/` and want the heavier dual-reviewer loop applied per task WITH the user in-loop at every commit boundary — not when you want the same subagent loop end-to-end without an ASK (use `implement-plan-with-subagents-auto`), not when you want single-agent execution (use `implement-plan-auto` or `implement-plan-interactive`), and not when the input is less-structured rather than a plan artifact (use `implement-auto` or `implement-interactive`).
metadata:
  author: https://github.com/Jei-sKappa

  version: 1.0.0
---

# Implement Plan With Subagents Interactive

Orchestrate the collaborative, plan-driven, multi-subagent implementation of a V1 plan artifact. This skill is the orchestrator role of the V1 plan-driven subagent-driven implementation pair: it does not write code itself — it reads the plan artifact READ-ONLY, walks the numbered task list in plan order, dispatches an **implementer subagent** for each task, dispatches a **spec-compliance reviewer subagent** (first pass per D70), dispatches a **code-quality reviewer subagent** (second pass per D70), respawns a NEW implementer subagent on review failure (D71), re-reviews every fix before advancing (D72), pushes back per the `## Anti-Sycophancy Stance` LIVE during the walk, ASKS the user before committing each orchestration cycle (D76), commits on confirm, and reports a four-state status per plan task on the way out. Bad commits become expensive to rewind — the cheap moment to push back is BEFORE the commit lands, because commit history is sacred (no `--amend`, no rebase, no force-push).

`implement-plan-with-subagents-interactive` is one of six V1 implementation skills. The two implementation axes are independent — input shape (less-structured vs plan-driven) and execution mode (auto vs interactive) — with a third axis (single-agent vs subagent-driven) crossing the plan-driven half per D66. The six skills are:

- `implement-auto` — less-structured input, autonomous, single-agent.
- `implement-interactive` — less-structured input, collaborative, single-agent.
- `implement-plan-auto` — plan-driven input, autonomous, single-agent. Use when you have a plan artifact and want end-to-end single-agent execution without the dual-reviewer loop.
- `implement-plan-interactive` — plan-driven input, collaborative, single-agent.
- `implement-plan-with-subagents-auto` — plan-driven input, autonomous, multi-subagent. Use when you want the same dual-reviewer loop as this skill but end-to-end execution without an ASK gate.
- `implement-plan-with-subagents-interactive` (this skill) — plan-driven input, collaborative, multi-subagent (orchestrator + implementer subagent + spec-compliance reviewer + code-quality reviewer per D70).

The TWO axes for picking among these skills are:

- **INPUT-SHAPE axis** — plan-driven (this skill) vs. less-structured. Plan-driven means the input is a V1 plan artifact path produced by one of the Phase 4 plan family skills (`plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, `plan-strict-interactive`, `adjust-plan-granularity-auto`, `adjust-plan-granularity-interactive`). Less-structured input is anything else. If you do not have a plan artifact path, use `implement-auto` or `implement-interactive`.
- **TOPOLOGY axis** — single-agent vs. multi-subagent (this skill). Multi-subagent means a separate implementer subagent runs each task, a spec-compliance reviewer subagent grades it FIRST (D70), a code-quality reviewer subagent grades it SECOND (D70), and on review failure a NEW implementer subagent is spawned for the fix (D71). If you want the lighter single-agent flow (current session + self-review only), switch to `implement-plan-auto` or `implement-plan-interactive`.

The two axes cross per D66 — and ONLY plan-driven input gets a `*-with-subagents-*` variant in V1.

## Subagent Capability Precondition

**This skill REQUIRES subagent capability** (e.g., Claude Code's `Task` tool, the equivalent agent dispatch primitive in Codex / Gemini / OpenCode, or any runtime primitive that lets the orchestrator spawn an independent subagent with its own context window and have it write files to disk before replying with an acknowledgment). The orchestrator role this skill defines is meaningful only when implementer and reviewer subagents are real, separate-context dispatches.

**This skill does NOT fall back to inline execution.** There is no "if subagents are unavailable, do it yourself" branch. The orchestrator does not write code in-session, does not run reviews in-session, and does not collapse the three subagent roles back into a single agent — that defeats the dual-reviewer separation per D70 and the fresh-context-per-fix discipline per D71. If your runtime does not support subagents, use `implement-plan-auto` (autonomous single-agent) or `implement-plan-interactive` (collaborative single-agent) from the Plan 05-02 pair instead. Those two siblings cover the plan-driven flow end-to-end without requiring subagents.

No inline fallback is V1-deliberate per D69 / IMPL-07. Subagent topology is a precondition of THIS skill, not a feature toggle.

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

If you believe the user is about to ASK you to commit a cycle that is wrong, refuse to commit silently. Either resolve the disagreement first, or commit with the dissent included in the commit message body and in the four-state task report. The implementation phase is where unflagged bad calls become expensive — and unlike planning, execution-time bad calls cost real commit hashes that this skill will not rewind.

## No Worktree Isolation

Per D78, the subagents this skill dispatches run sequentially on the SAME working tree as the orchestrator. V1 does NOT use `git worktree add` isolation, parallel-worktree topology, or separate per-subagent working directories. Each subagent's writes to the working tree are observable to the next subagent — the spec-compliance reviewer reads what the implementer just wrote; the next implementer (on a fix iteration) reads the previous implementer's diff and the reviewer's findings; the code-quality reviewer reads the same final post-fix state. Subagents run sequentially, on the same tree, in the order this skill's `## Workflow` defines.

No parallel implementer dispatch. No per-task worktree branch. The orchestration cycle (one task) ends with one commit on the current working tree once the user confirms; the next cycle starts from that committed state on the same tree.

## Inputs

`implement-plan-with-subagents-interactive` accepts a V1 plan artifact path. The plan artifact lives under:

```text
docs/threads/<thread>/plans/<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-plan.md
```

per the V1 versioned-form filename grammar in `docs/workflow/v1/filename-grammar.md`. The plan was produced by one of the Phase 4 plan-family skills — `plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, `plan-strict-interactive`, `adjust-plan-granularity-auto`, or `adjust-plan-granularity-interactive`. Both LOOSE and STRICT granularities are valid input — both honor the D59 contract (every plan task is **sequential, isolated, independently implementable, and independently reviewable**), and both are executed in plan order by this skill. Strict-granularity plans give the implementer subagent and the spec-compliance reviewer subagent more to match against (six-field per-task block — see `skills/workflow/plan/plan-strict-interactive/SKILL.md` for the contract). Loose-granularity plans require the implementer to infer the obvious substeps from the objective + verification sentence. Either granularity is valid input — the granularity is a property of the plan, not a switch on this skill.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the walk covers only the named task(s); when omitted, the walk covers every numbered task in the plan in order.

If the input is ambiguous — multiple plan artifacts exist in the thread and the user named "the plan" without a specific path, the user pointed at a `plans/` folder containing two competing versions for the same target version, or the user passed a descriptor that matches multiple files — ASK the user which plan artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest plan" algorithm. Do not silently pick by recency, by highest version number, or by sort order.

## Four-State Status Protocol

Per D74 (IMPL-10), every orchestration cycle's task report carries one of FOUR statuses. The states are named exactly as listed below; downstream readers (and downstream skills, particularly `review-implementation-*` in Phase 6) match against these tokens. Use the names verbatim.

- The state DONE — `DONE` — means the plan task was completed and BOTH reviewers (spec-compliance and code-quality) passed without surfaced issues, or with issues that the subsequent fix iterations fully resolved. The user confirmed the commit at the per-cycle ASK gate. The orchestrator has no concerns to surface. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the plan task was completed but at least one concern was surfaced — by one of the reviewer subagents, by the orchestrator's own audit of the cycle, or by a live dissent during the walk that the user signed off on. Examples: a code-quality reviewer flagged a code smell the user accepted, the user agreed to skip a non-blocking fix iteration, the implementer made a judgment call on an ambiguous plan area the user signed off on, a possible-but-unverified edge case the reviewers could not exercise. The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the orchestration cycle could not complete. Includes failed commits per D77 (see `## Commit Policy`), missing dependencies the implementer subagent could not resolve, inaccessible files, contradictory plan tasks, repeated review failures the fix loop could not close, the user aborting the walk mid-cycle. A `BLOCKED` report ends the flow at this task — subsequent plan tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the orchestration cycle cannot proceed without information neither the orchestrator nor the implementer subagent has — including dissents flagged live per the `## Anti-Sycophancy Stance` that the user has not yet resolved. Distinct from `BLOCKED`: a `BLOCKED` cycle hit a hard error during execution; a `NEEDS_CONTEXT` cycle did not start (or did not progress past initial setup) because the missing input was a precondition.

### Task report block shape (with subagent audit)

The four-state status appears as a structured block in chat output and / or the commit message body for the orchestration cycle's commit (where applicable). The four-state status is NOT written to a separate artifact file in V1 — the chat output and the commit history together are the audit trail. Because this skill dispatches subagents, the task report MUST explicitly list (a) which subagents ran, (b) how many fix iterations occurred per review pass, and (c) the final state per task — this is the audit trail without a separate state file.

Suggested format (exact wording is at the orchestrator's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 8–15 line range to accommodate the subagent audit):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Subagents ran:
  - implementer: <N> dispatch(es)
  - spec-compliance reviewer: <N> dispatch(es), <N> fix iteration(s)
  - code-quality reviewer: <N> dispatch(es), <N> fix iteration(s)
Notes: <1–3 sentences explaining the rationale or surfaced concerns. Cite settled decisions by absolute path + D<N> when relevant. Note any live dissents from the walk per the Anti-Sycophancy Stance.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY plan task by its four-state status, plus the per-task subagent audit and the commit SHA + subject for every commit made during the run. Include the plan artifact path so the user has the audit trail anchored to the source plan.

## Dirty Worktree Handling

Per D79 (IMPL-14), **the orchestrator runs the dirty-worktree check** — NOT the implementer subagent. The check is owned by the orchestrator role this skill defines, and the orchestrator runs it BEFORE spawning the first implementer subagent. The implementer subagent assumes a clean tree per the orchestrator's verification; reviewer subagents inspect `git diff` against the cycle's starting state and trust that the diff is the implementer's work, not pre-existing noise.

The check is non-skippable. Run it ONCE at the start of the run, BEFORE reading the plan artifact or opening the walk:

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the plan-resolution step.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill asks to make) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently. Do NOT delegate this check to the implementer subagent.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit the orchestrator makes once the user approves it (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not read the plan, do not open the walk, do not spawn any subagent, do not modify the worktree.

In V1, this skill does not use `git worktree` isolation per D78 — every implementation runs on the current working tree — so the orchestrator-owned dirty-worktree check is non-skippable. Subagents share that working tree per the no-worktree-isolation rule above.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. The orchestrator runs the dirty-worktree check at the very start. If clean, proceed. If dirty, ASK; on abort, stop. Do not dispatch any subagent until the check is satisfied.

2. **Resolve the active thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If the plan path is already absolute or thread-rooted, the thread is implicit. If multiple thread roots exist and the plan path is ambiguous about which thread it belongs to, ASK per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

3. **Resolve the plan artifact path.** Detect the plan path from the user's invocation. If multiple plan artifacts could plausibly match the user's reference (multiple versions, candidate variants with descriptors, "the plan" with no clear referent), ASK the user which plan is intended per `docs/workflow/v1/immutability.md`. Do not pick by recency, by highest version number, or by descriptor match.

4. **Read the plan READ-ONLY.** Per `docs/workflow/v1/immutability.md`, the plan artifact is IMMUTABLE — open it for reading only. Parse the numbered task list. For each task, record its objective, its verification block (if present), its acceptance criteria (if present in strict-granularity plans), and its files-modified list (if present in strict-granularity plans). If the user passed a specific task identifier, narrow the task list to that subset; otherwise walk every numbered task in plan order.

5. **For each plan task IN ORDER — the orchestration cycle:** (Sequential execution per the D59 contract — there are no waves; the implicit dependency is "the previous numbered plan task ran first". Subagents within a cycle run sequentially on the same working tree per `## No Worktree Isolation`.)

   a. **PRESENT the task to the user.** Re-state the objective, the verification expectation, and the acceptance criteria if present. Surface ambiguity, contradictions with the observed code state, or under-specified inputs LIVE — push back per the `## Anti-Sycophancy Stance` if the task as written appears wrong for the current code state. The user may have additional context the orchestrator does not have; the orchestrator may have observed evidence (from the working tree, the plan, the prior cycle's outcome) the user has not yet seen. Wait for the user to confirm the task framing or adjust it. If the user adjusts, capture the adjustment as a live deviation per `## Plan Deviation Policy`.

   b. **Spawn the implementer subagent** with a self-contained brief from `## Subagent Briefs`. Pass the plan artifact path + the current plan task identifier + (optionally) the plan-level context the orchestrator extracted in step 4 + any live walk adjustments the user signed off on in step a. Wait for the implementer subagent to return. The implementer writes code changes directly to the working tree and replies with a 2–3 sentence summary plus the paths of modified files. The orchestrator inspects the working tree itself (`git status --porcelain`, `git diff`) rather than trusting the reply's prose — the working tree is the completion signal; the reply is only acknowledgment.

   c. **Spawn the spec-compliance reviewer subagent — the FIRST review pass per D70.** Use a self-contained brief from `## Subagent Briefs` that loads the reviewer prompt at `references/spec-compliance-reviewer.md` (resolved by relative path from this skill's base directory) and points the reviewer at the current plan task's verification block + acceptance criteria. The reviewer reads `git diff` (or the modified files file-by-file) against the plan task and writes its structured review output to a designated `.wip/` scratch path the orchestrator chooses — `.wip/` is recursively gitignored per `docs/workflow/v1/thread-layout.md`, so the review output does not pollute the working tree's commit history. Wait for the reviewer to return. Read the structured review file from disk; do not trust the reply's prose. Surface the findings LIVE to the user per the `## Anti-Sycophancy Stance`.

   d. **If the spec-compliance reviewer surfaced ISSUES**, the orchestrator weighs them WITH the user. Push back if the user proposes to skip a fix iteration on findings the orchestrator's read says matter. On the user's confirm-to-fix decision, enter the fix loop: spawn a NEW implementer subagent (D71 — no persistent-subagent assumption; ALWAYS respawn a fresh implementer for the fix; the original implementer's context is gone). Include in the fix brief: the original plan task, the spec-compliance reviewer's findings (path to the review file), the user's live walk adjustments if any, and a clear directive that the fix MUST address the surfaced issues without re-introducing prior reviewer-approved behavior. Wait for the fix implementer to return. RE-REVIEW the fix (D72 / IMPL-09) — spawn a NEW spec-compliance reviewer subagent with a fresh brief that points at the fix's diff and the same reviewer prompt. Loop the fix-and-re-review pattern until spec-compliance PASSES OR the user explicitly accepts the remaining findings (recorded as `DONE_WITH_CONCERNS`). Each iteration costs one implementer + one reviewer subagent.

   e. **Spawn the code-quality reviewer subagent — the SECOND review pass per D70.** Use a self-contained brief that loads the reviewer prompt at `references/code-quality-reviewer.md` (resolved by relative path from this skill's base directory) and points the reviewer at the final post-fix diff (the diff at this point reflects the implementer's original work plus any spec-compliance fix iterations). Wait for the reviewer to return. Read the structured review file from disk. Surface the findings LIVE to the user per the `## Anti-Sycophancy Stance`.

   f. **If the code-quality reviewer surfaced ISSUES**, the orchestrator weighs them WITH the user. Same anti-sycophancy push-back. On the user's confirm-to-fix decision, enter the same fix loop as step d — spawn a NEW implementer per fix (D71), spawn a NEW code-quality reviewer per re-review (D72). Loop until code-quality PASSES OR the user explicitly accepts the remaining findings.

   g. **ASK the user before committing — per orchestration cycle (D76).** Show the user the proposed commit (subject + body + the changed-files list + the four-state task report block with the subagent audit). ASK: "Commit task `<N>` now as `<proposed subject>`? Or adjust the subject / body / boundary before committing? Or skip the commit and continue making changes?". Wait for the user's answer. On confirm, commit per `## Commit Policy`. On adjust, revise per the user's instruction and re-ASK. On skip, do not commit; continue.

   h. **Commit or skip.** If the user confirmed, the orchestrator commits per `## Commit Policy`. Commit cadence is per orchestration cycle — one commit per task-after-all-reviews-pass per D76 (the interactive variant of D75). The orchestrator stages and commits the task-related files (the strict-granularity plan's `Files modified` list is authoritative; loose-granularity plans require the orchestrator to track touched files across the cycle's implementer dispatches) and runs the commit itself. The implementer subagent does not commit; the reviewer subagents do not commit. If the commit succeeds, capture the SHA + subject. If the commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this task and stop the entire run.

   i. **Write the orchestration cycle task report.** Use the four-state status block (with the subagent audit) from `## Four-State Status Protocol`. The state goes in chat output and / or (if a commit was made) the commit message body. Note any live dissents from the walk.

6. **Final out-message.** Once every plan task has run (or the run was halted at a `BLOCKED` task or by user decision), emit a final summary listing every plan task by its four-state status, the per-task subagent audit, and the commit SHA + subject for each commit made. Include the plan artifact path (relative to repository root) so the user has the audit trail anchored to the source plan.

## Subagent Briefs

Each dispatched agent gets a self-contained brief. The orchestrator never inherits the agent's session and never loads the agent's output back into its own context. Each brief contains: scope, input paths, output path, return contract, and hard constraints. The orchestrator reads files the subagent wrote (the working tree, the review output file under `.wip/`); the reply is acknowledgment only.

### Implementer subagent

- **Scope** — the current orchestration cycle's context: the plan artifact path, the current plan task identifier, (optionally) the plan-level context the orchestrator extracted at step 4 of `## Workflow`, and any live walk adjustments the user signed off on in step a. On a fix iteration, also include the reviewer's findings (path to the structured review file under `.wip/`) and any user-signed-off adjustments to those findings.
- **Input paths** — the plan artifact path (READ-ONLY); on fix iterations, the prior reviewer's structured review output file (READ-ONLY).
- **Output path** — the implementer writes code changes DIRECTLY to the working tree at the file paths the plan task names (strict-granularity) or the implementer infers (loose-granularity). No notes file; the working tree IS the output.
- **Return contract** — write the source-code changes to the working tree; reply to the orchestrator with ONLY a 2–3 sentence summary plus the paths of modified files. Do NOT paste the diff back. Do NOT commit (the orchestrator commits per `## Commit Policy` after the user confirms at the ASK gate). Do NOT run `git commit`, `git add` outside of standard staging, or any history-rewriting operation.
- **Hard constraints** — do NOT modify the plan artifact (it is IMMUTABLE per `docs/workflow/v1/immutability.md`); stay within the working tree; do NOT commit; do NOT rewrite history; do NOT spawn further subagents; do NOT use `git worktree` (per D78); on a fix iteration, do NOT re-introduce behavior the prior reviewer approved while addressing the new findings.

### Spec-compliance reviewer subagent (first pass per D70)

- **Scope** — review the diff against the plan task's verification block and acceptance criteria. The single question this reviewer answers: "Does the diff implement what the task said it would?" Codebase quality, style, refactor opportunities, and idiomatic-fit are OUT of scope here — those belong to the code-quality reviewer (second pass).
- **Input paths** — the plan artifact path (READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection of the modified paths); the method reference at `references/spec-compliance-reviewer.md` resolved by relative path from this skill's base directory (absolute path computed by the orchestrator).
- **Output path** — a designated `.wip/` scratch file the orchestrator names (e.g., `docs/threads/<thread>/.wip/<UTC>-task-<N>-spec-compliance-review.md`). The reviewer writes its structured review (Verdict + findings + references) to this path.
- **Return contract** — write the review file directly; reply to the orchestrator with ONLY a 2–3 sentence summary plus the path of the review file. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT run tests beyond what the plan task's verification block prescribes (running the prescribed verification is in scope and expected); do NOT commit.

### Code-quality reviewer subagent (second pass per D70)

- **Scope** — review the diff for readability, safety, idiomatic patterns given the codebase, and regression risk. The single question this reviewer answers: "Is the diff well-structured, safe, idiomatic given the codebase?" Spec compliance (does the diff implement what the task said it would?) is OUT of scope here — that was the first pass.
- **Input paths** — the plan artifact path (READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection — note that the diff at this point reflects the implementer's original work plus any spec-compliance fix iterations); the method reference at `references/code-quality-reviewer.md` resolved by relative path from this skill's base directory (absolute path computed by the orchestrator).
- **Output path** — a designated `.wip/` scratch file the orchestrator names (e.g., `docs/threads/<thread>/.wip/<UTC>-task-<N>-code-quality-review.md`). The reviewer writes its structured review (Verdict + findings + references) to this path.
- **Return contract** — write the review file directly; reply to the orchestrator with ONLY a 2–3 sentence summary plus the path of the review file. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT commit.

## Commit Policy

The orchestrator commits, AFTER the user confirms at the per-cycle ASK gate. Cadence boundaries are governed by D76 — the interactive variant of D75 — and the per-commit ASK gate is non-skippable.

- **Default boundary granularity:** SAME as `implement-plan-with-subagents-auto` — one commit **per orchestration cycle** (one commit per plan task after BOTH reviewers PASS or after the user explicitly accepts remaining findings). The boundary is the orchestration cycle; subagents within the cycle do NOT commit. The orchestrator stages and commits the task-related files (strict-granularity plans state the files explicitly under `Files modified`; loose-granularity plans require the orchestrator to track which files the implementer dispatches touched across the cycle).
- **Override boundary:** When the user's invocation or in-walk instruction contains an EXPLICIT Git instruction — for example, "commit at the end as one commit", "make one commit per file touched", "do not commit, just leave the changes staged" — honor the explicit instruction over the default per-orchestration-cycle cadence.
- **ASK the user before committing at every orchestration cycle.** This is the per-commit gate that distinguishes this skill from `implement-plan-with-subagents-auto`. Before EVERY commit boundary the skill would otherwise cross, ASK the user: present the proposed subject, body, changed-files list, and the four-state task report block (with the subagent audit); wait for confirm / adjust / skip. Do NOT commit silently. Do NOT commit on a sensible-looking default if the user has been silent.

Commits use the project's conventional-commit shape where applicable; follow the project's `AGENTS.md` for scope rules. Stage only the files the orchestration cycle touched. Never run `git add -A` blindly. Commit subjects describe the plan task's objective; commit message bodies MAY include the four-state task report block.

### Failed commit

Per D77: **If a commit fails, the orchestrator reports `BLOCKED` and stops. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), then stop the entire run. Subsequent plan tasks are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject. Each of those is the project telling the orchestrator to stop and let the user diagnose. `BLOCKED` is the correct response, even in the interactive variant — the user can choose to resolve the underlying issue and re-invoke the skill, but this skill does not iterate on a failed commit autonomously inside the same run.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The orchestrator does not amend commits (no `commit --amend`, even when the user asks for a typo fix on a commit that already landed; the recovery path is a follow-up commit), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the orchestrator made earlier in the same run. Subagents are also forbidden from history rewriting; the orchestrator's brief to each subagent names this constraint. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

The rationale ties back to the `## Anti-Sycophancy Stance`: bad commits become expensive to rewind. Because this skill will not rewrite history, the per-cycle ASK gate is the place where mistakes are cheapest to catch. Use the gate — push back during the walk, push back during the ASK, refuse to silently land a commit you believe is wrong.

## Plan Deviation Policy

Per D80, the policy is judgment-based and surfaced — both in the task report and, importantly for this interactive skill, LIVE during the walk.

- **Follow the plan.** The plan is the contract; the orchestrator dispatches one implementer per plan task in plan order. The implementer applies substeps where stated (strict-granularity) and infers them where loose. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If the plan task is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, surface the deviation LIVE to the user before dispatching the implementer subagent — push back per the `## Anti-Sycophancy Stance`. Get the user's call before writing code that deviates from the literal plan.
- **Surface deviations in the task report.** Every deviation also goes into the four-state status block (with the subagent audit) at task end. Minor deviations the user signed off on during the walk are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations the user signed off on are also `DONE_WITH_CONCERNS` with a note that the user explicitly agreed. Major deviations the orchestrator flagged but did not resolve are `NEEDS_CONTEXT`.
- **Reviewer-surfaced deviations.** Either reviewer (spec-compliance first, code-quality second) may surface a deviation in its findings. The orchestrator surfaces those LIVE to the user. Per the `## Anti-Sycophancy Stance`, the orchestrator MAY honor the user's choice to skip a fix iteration but reports `DONE_WITH_CONCERNS` for the task in that case — with the dissent named in the task report and (if applicable) in the commit message body.
- **The walk is the live push-back channel.** Unlike the auto sibling, this skill has the user in-loop for every orchestration cycle. Use the walk to raise deviations early — before the implementer subagent is dispatched, before the reviewer subagents are dispatched, and before the ASK gate at commit time. The ASK gate is the second checkpoint where the user has the chance to reject.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the orchestrator does NOT edit the plan artifact in place — the plan is immutable per `docs/workflow/v1/immutability.md`. Surface the finding live during the walk, propose stopping the run, and recommend the user re-shape the plan via `adjust-plan-granularity-auto` or `adjust-plan-granularity-interactive` (Phase 4) to emit a NEW versioned plan. The new plan is then re-handed to this skill (or its autonomous sibling) on a fresh invocation.

## Decision Log

Per D93, the default behavior of this skill is to NOT auto-write a separate decision log. Most implementation-time decisions are captured fully in commit messages and in the four-state task report — settled decisions from the plan's input/context fields cited inline, dissents flagged where they emerged, reviewer findings surfaced and resolved live during the walk, deviations the user signed off on documented in the task report. A standalone decision log is written ONLY when durable trade-offs or rejected alternatives emerge during the walk that cannot reasonably be captured in commit messages or the task report — for example, a structural choice the user weighed multiple alternatives for and explicitly rejected the others, with rationale that downstream readers will need to understand independently of any specific commit.

When such a decision log IS warranted, write it to `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md` per `docs/workflow/v1/filename-grammar.md` (record form, `decision-log` artifact-type token). Use the append-only single-record shape from the `discussion` and `seeded-discussion` skill bodies — sequential per-log `## D<N>: <Title>` headings with `Decision:` and `Rationale:` lines. If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim. The four-state task report cites the new log by absolute path + `D<N>` at the location where its decisions are operative.

When in doubt about whether a side-conversation rises to "durable trade-off" status, ASK the user. The default is no decision log.

## Scope Drift

When the user introduces a branch that is outside the plan being walked, do not silently follow them and do not let the run grow into a different shape than the one the plan defines. Propose ONE of:

1. **Park as an Inbox item** via the `capture-inbox` skill (PREFERRED for non-blocking side-findings). Captures a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this run.
2. **Split into its own task / plan / discussion thread.** When the branch is itself worth a dedicated plan or a separate discussion, hand it off rather than expanding the current run beyond the plan's intent. A new plan is shaped via the Phase 4 plan family (`plan-loose-*` or `plan-strict-*`); a new discussion is shaped via `discussion` or `seeded-discussion`.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in the walk and let it pass.

ASK the user which. Do not pick silently.

## Immutability

Plan artifacts are IMMUTABLE per `docs/workflow/v1/immutability.md`. The orchestrator reads them READ-ONLY; the implementer subagent reads them READ-ONLY; both reviewer subagents read them READ-ONLY. The plan file is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

If during the walk the user proposes editing the plan in place (e.g., "fix the typo in task 2 while you're at it", "remove task 5 because we already did it"), refuse per the immutability rule and per the `## Anti-Sycophancy Stance`. A revised plan is a new plan version — the user invokes `adjust-plan-granularity-auto` or `adjust-plan-granularity-interactive` to emit `<UTC>-v<N+1>-<descriptor>-plan.md`, and the new plan is re-handed to this skill on a fresh invocation. The orchestrator does not perform that revision inside this skill's run; that is the surrounding session's decision.

What the subagents DO modify is source code (the implementer subagent) or `.wip/` review scratch files (the reviewer subagents). The reviewer scratch files live under `docs/threads/<thread>/.wip/` per `docs/workflow/v1/thread-layout.md` — `.wip/` is recursively gitignored, so the review output does not enter version control. The orchestrator MAY ALSO write (a) a new Inbox item via the `capture-inbox` skill if a scope-drift branch surfaces and the user picks "park", and (b) a decision log per `## Decision Log` when the user signs off on the durable-trade-off threshold. The implementer does NOT create new spec / proposal / plan artifacts inside this skill's run; those are the responsibility of dedicated authoring skills (`spec-*`, `propose-*`, `plan-*`, `adjust-plan-granularity-*`).

The thread layout itself follows `docs/workflow/v1/thread-layout.md` — the folder set, the `.wip/` discipline (recursively gitignored, never used for emitted artifacts), and the on-demand creation rule are all binding on any thread-scoped file this skill or its subagents touch.
