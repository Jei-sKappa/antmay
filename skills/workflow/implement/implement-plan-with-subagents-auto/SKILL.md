---
name: implement-plan-with-subagents-auto
description: Execute every task in a plan artifact through an autonomous implementer and dual-reviewer subagent loop with per-cycle commits when the user wants the heavier review path and the runtime supports subagents.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.2
---

# Implement Plan With Subagents Auto

Orchestrate the autonomous, plan-driven, multi-subagent implementation of a plan artifact. This skill is the orchestrator role: it does not write code itself — it reads the plan artifact READ-ONLY, walks the numbered task list in plan order, dispatches an **implementer subagent** for each task, dispatches a **spec-compliance reviewer subagent** (first pass), dispatches a **code-quality reviewer subagent** (second pass), respawns a NEW implementer subagent on review failure, re-reviews every fix before advancing, commits per orchestration cycle, and reports a four-state status per plan task on the way out. It does not ask clarifying questions at each step, it does not ask before committing, and it does not rewrite history.

## Subagent Capability Precondition

**This skill REQUIRES subagent capability** (e.g., a runtime primitive that lets the orchestrator spawn an independent subagent with its own context window and have it write files to disk before replying with an acknowledgment). The orchestrator role this skill defines is meaningful only when implementer and reviewer subagents are real, separate-context dispatches.

**This skill does NOT fall back to inline execution.** There is no "if subagents are unavailable, do it yourself" branch. The orchestrator does not write code in-session, does not run reviews in-session, and does not collapse the three subagent roles back into a single agent — that defeats the dual-reviewer separation and the fresh-context-per-fix discipline. Subagent topology is a precondition of this skill, not a feature toggle. If the runtime does not support subagents, stop and tell the user this run cannot proceed.

## No Worktree Isolation

The subagents this skill dispatches run sequentially on the SAME working tree as the orchestrator. This skill does NOT use `git worktree add` isolation, parallel-worktree topology, or separate per-subagent working directories. Each subagent's writes to the working tree are observable to the next subagent — the spec-compliance reviewer reads what the implementer just wrote; the next implementer (on a fix iteration) reads the previous implementer's diff and the reviewer's findings; the code-quality reviewer reads the same final post-fix state. Subagents run sequentially, on the same tree, in the order this skill's `## Workflow` defines.

No parallel implementer dispatch. No per-task worktree branch. The orchestration cycle (one task) ends with one commit on the current working tree; the next cycle starts from that committed state on the same tree.

## Inputs

This skill accepts a plan artifact path. The plan artifact lives under:

```text
docs/threads/<thread>/plans/<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-plan.md
```

Plan artifacts use a UTC-prefixed versioned filename: `YYMMDDHHMMSSZ` (12-character UTC stamp, no separators, trailing `Z`), followed by `-v<N>`, an optional kebab descriptor, and the `-plan.md` suffix. Both LOOSE and STRICT granularity plans are valid input — both require every task to be sequential, isolated, independently implementable, and independently reviewable. Strict-granularity plans provide a six-field per-task block (objective / input-context / steps-substeps / files-modified / verification / acceptance criteria). Loose-granularity plans require the implementer to infer the obvious substeps from the objective + verification sentence; the spec-compliance reviewer adapts accordingly. The granularity is a property of the plan, not a switch on this skill.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the orchestrator runs the dispatch loop only for the named task(s); when omitted, it runs every numbered task in the plan in order.

If the input is ambiguous — multiple plan artifacts exist in the thread and the user named "the plan" without a specific path, the user pointed at a `plans/` folder containing two competing versions for the same target version, or the user passed a descriptor that matches multiple files — ASK the user which plan artifact is intended. There is no global "latest plan" algorithm. Do not silently pick by recency, by highest version number, or by sort order.

## Four-State Status Protocol

Every orchestration cycle's task report carries one of FOUR statuses. Use the names verbatim; downstream readers match against these tokens exactly.

- `DONE` — the plan task was completed and BOTH reviewers (spec-compliance and code-quality) passed without surfaced issues, or with issues that the subsequent fix iterations fully resolved. The orchestrator has no concerns to surface. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the plan task was completed but at least one concern was surfaced by one of the reviewer subagents (or by the orchestrator's own audit of the cycle) and is being passed forward as a signal. Examples: a code-quality reviewer flagged a code smell the orchestrator judged non-blocking, the implementer made a judgment call on an ambiguous plan area, a possible-but-unverified edge case the reviewers could not exercise from the diff alone, a minor deviation from the plan that the implementer applied per `## Plan Deviation Policy`. The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the orchestration cycle could not complete. Includes failed commits (see `## Commit Policy`), missing dependencies the implementer subagent could not resolve, inaccessible files, contradictory plan tasks, repeated review failures the fix loop could not close, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent plan tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the orchestration cycle cannot proceed without information neither the orchestrator nor the implementer subagent has. Includes "user clarification needed", "access to file outside repo needed", "external system credentials needed", "the plan task contradicts the observed code state and the implementer cannot pick the right side without input". Distinct from `BLOCKED`: a `BLOCKED` cycle hit a hard error during execution; a `NEEDS_CONTEXT` cycle did not start (or did not progress past initial setup) because the missing input was a precondition.

### Task report block shape (with subagent audit)

The four-state status appears as a structured block in chat output and/or the commit message body for the orchestration cycle's commit (where applicable). The four-state status is NOT written to a separate artifact file — the chat output and the commit history together are the audit trail. Because this skill dispatches subagents, the task report MUST explicitly list (a) which subagents ran, (b) how many fix iterations occurred per review pass, and (c) the final state per task — this is the audit trail without a separate state file.

Suggested format (exact wording is at the orchestrator's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 8–15 line range to accommodate the subagent audit):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Subagents ran:
  - implementer: <N> dispatch(es)
  - spec-compliance reviewer: <N> dispatch(es), <N> fix iteration(s)
  - code-quality reviewer: <N> dispatch(es), <N> fix iteration(s)
Notes: <1–3 sentences explaining the rationale or surfaced concerns.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY plan task by its four-state status, plus the per-task subagent audit and the commit SHA + subject for every commit made during the run. This is the implementation audit trail; the user reads it to understand what the plan accomplished and what to do next.

## Dirty Worktree Handling

**The orchestrator runs the dirty-worktree check** — NOT the implementer subagent. The check is owned by the orchestrator role this skill defines, and the orchestrator runs it BEFORE spawning the first implementer subagent. The implementer subagent assumes a clean tree per the orchestrator's verification; reviewer subagents inspect `git diff` against the cycle's starting state and trust that the diff is the implementer's work, not pre-existing noise.

The check is non-skippable. Run it ONCE at the start of the run, BEFORE reading the plan artifact:

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the plan-resolution step.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill makes) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently. Do NOT delegate this check to the implementer subagent.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit the orchestrator makes (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not read the plan, do not spawn any subagent, do not modify the worktree.

This skill does not use `git worktree` isolation — every implementation runs on the current working tree — so the orchestrator-owned dirty-worktree check is non-skippable. Subagents share that working tree per the no-worktree-isolation rule above.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. The orchestrator runs the dirty-worktree check at the very start. If clean, proceed. If dirty, ASK; on abort, stop. Do not dispatch any subagent until the check is satisfied.

2. **Resolve the active thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If the plan artifact path the user passed is already absolute or thread-rooted, the thread is implicit. If multiple thread roots exist and the plan path is ambiguous about which thread it belongs to, ASK — do not silently pick the most recent UTC stamp.

3. **Resolve the plan artifact path.** Detect the plan path from the user's invocation. If multiple plan artifacts could plausibly match the user's reference (multiple versions, candidate variants with descriptors, "the plan" with no clear referent), ASK the user which plan is intended. Do not pick by recency, by highest version number, or by descriptor match. When multiple candidates exist and the reference is ambiguous, that ambiguity is often a real decision in disguise — surface it rather than resolving it silently.

4. **Read the plan READ-ONLY.** The plan artifact is IMMUTABLE — open it for reading only. Parse the numbered task list. For each task, record its objective, its verification block (if present), its acceptance criteria (if present in strict-granularity plans), and its files-modified list (if present in strict-granularity plans). If the user passed a specific task identifier, narrow the task list to that subset; otherwise execute every numbered task in plan order.

5. **For each plan task IN ORDER — the orchestration cycle:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first". Subagents within a cycle run sequentially on the same working tree per `## No Worktree Isolation`.)

   a. **Spawn the implementer subagent** with a self-contained brief from `## Subagent Briefs`. Pass the plan artifact path + the current plan task identifier + (optionally) the plan-level context the orchestrator extracted in step 4. Wait for the implementer subagent to return. The implementer writes code changes directly to the working tree and replies with a 2–3 sentence summary plus the paths of modified files. The orchestrator inspects the working tree itself (`git status --porcelain`, `git diff`) rather than trusting the reply's prose — the working tree is the completion signal; the reply is only acknowledgment.

   b. **Spawn the spec-compliance reviewer subagent — the FIRST review pass.** Use a self-contained brief from `## Subagent Briefs` that loads the reviewer prompt at `references/spec-compliance-reviewer.md` (resolved relative to this skill's base directory) and points the reviewer at the current plan task's verification block + acceptance criteria. The reviewer reads `git diff` (or the modified files file-by-file) against the plan task and writes its structured review output to a designated `.wip/` scratch path the orchestrator chooses — `.wip/` is recursively gitignored, so the review output does not pollute the working tree's commit history. Wait for the reviewer to return. Read the structured review file from disk; do not trust the reply's prose.

   c. **If the spec-compliance reviewer surfaced ISSUES**, enter the fix loop. Spawn a NEW implementer subagent — always respawn a fresh implementer for the fix; the original implementer's context is gone. Include in the fix brief: the original plan task, the spec-compliance reviewer's findings (path to the review file), and a clear directive that the fix MUST address the surfaced issues without re-introducing prior reviewer-approved behavior. Wait for the fix implementer to return. RE-REVIEW the fix — spawn a NEW spec-compliance reviewer subagent with a fresh brief that points at the fix's diff and the same reviewer prompt. Loop the fix-and-re-review pattern until spec-compliance PASSES. Each iteration costs one implementer + one reviewer subagent. If the loop fails to close (the reviewer keeps surfacing the same or escalating issues across iterations and the orchestrator's audit shows the fix loop is not converging), the orchestrator reports `BLOCKED` for this task with notes describing the loop state, and stops the run.

   d. **Spawn the code-quality reviewer subagent — the SECOND review pass.** Use a self-contained brief that loads the reviewer prompt at `references/code-quality-reviewer.md` (resolved relative to this skill's base directory) and points the reviewer at the final post-fix diff (the diff at this point reflects the implementer's original work plus any spec-compliance fix iterations). Wait for the reviewer to return. Read the structured review file from disk.

   e. **If the code-quality reviewer surfaced ISSUES**, enter the same fix loop as step c — spawn a NEW implementer per fix, spawn a NEW code-quality reviewer per re-review. Loop until code-quality PASSES. Same convergence rule applies: if the loop does not close, report `BLOCKED`.

   f. **The orchestrator commits per `## Commit Policy`.** Commit cadence is per orchestration cycle — one commit per task after BOTH reviewers pass. The orchestrator stages the task-related files (the strict-granularity plan's `Files modified` list is authoritative; loose-granularity plans require the orchestrator to track touched files across the cycle's implementer dispatches) and runs the commit itself. The implementer subagent does not commit; the reviewer subagents do not commit. If the commit succeeds, capture the SHA + subject. If the commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this task and stop the entire run.

   g. **Write the orchestration cycle task report.** Use the four-state status block (with the subagent audit) from `## Four-State Status Protocol`. The state goes in chat output and / or the commit message body. The audit line lists which subagents ran, how many fix iterations occurred per review pass, and the final state.

6. **Final out-message.** Once every plan task has run (or the run was halted at a `BLOCKED` task), emit a final summary listing every plan task by its four-state status, the per-task subagent audit, and the commit SHA + subject for each commit made. Include the plan artifact path (relative to repository root) so the user has the audit trail anchored to the source plan.

## Subagent Briefs

Each dispatched agent gets a self-contained brief. The orchestrator never inherits the agent's session and never loads the agent's output back into its own context. Each brief contains: scope, input paths, output path, return contract, and hard constraints. The orchestrator reads files the subagent wrote (the working tree, the review output file under `.wip/`); the reply is acknowledgment only.

### Implementer subagent

- **Scope** — the current orchestration cycle's context: the plan artifact path, the current plan task identifier, and (optionally) the plan-level context the orchestrator extracted at step 4 of `## Workflow`. On a fix iteration, also include the reviewer's findings (path to the structured review file under `.wip/`).
- **Input paths** — the plan artifact path (READ-ONLY); on fix iterations, the prior reviewer's structured review output file (READ-ONLY).
- **Output path** — the implementer writes code changes DIRECTLY to the working tree at the file paths the plan task names (strict-granularity) or the implementer infers (loose-granularity). No notes file; the working tree IS the output.
- **Return contract** — write the source-code changes to the working tree; reply to the orchestrator with ONLY a 2–3 sentence summary plus the paths of modified files. Do NOT paste the diff back. Do NOT commit (the orchestrator commits per `## Commit Policy`). Do NOT run `git commit`, `git add` outside of standard staging, or any history-rewriting operation.
- **Hard constraints** — do NOT modify the plan artifact (it is IMMUTABLE — read it only); stay within the working tree; do NOT commit; do NOT rewrite history; do NOT spawn further subagents; do NOT use `git worktree`; on a fix iteration, do NOT re-introduce behavior the prior reviewer approved while addressing the new findings.

### Spec-compliance reviewer subagent (first pass)

- **Scope** — review the diff against the plan task's verification block and acceptance criteria. The single question this reviewer answers: "Does the diff implement what the task said it would?" Codebase quality, style, refactor opportunities, and idiomatic-fit are OUT of scope here — those belong to the code-quality reviewer (second pass).
- **Input paths** — the plan artifact path (READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection of the modified paths); the method reference at `references/spec-compliance-reviewer.md` resolved relative to this skill's base directory (absolute path computed by the orchestrator).
- **Output path** — a designated `.wip/` scratch file the orchestrator names (e.g., `docs/threads/<thread>/.wip/<UTC>-task-<N>-spec-compliance-review.md`). The reviewer writes its structured review (Verdict + findings + references) to this path.
- **Return contract** — write the review file directly; reply to the orchestrator with ONLY a 2–3 sentence summary plus the path of the review file. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT run tests beyond what the plan task's verification block prescribes (running the prescribed verification is in scope and expected); do NOT commit.

### Code-quality reviewer subagent (second pass)

- **Scope** — review the diff for readability, safety, idiomatic patterns given the codebase, and regression risk. The single question this reviewer answers: "Is the diff well-structured, safe, idiomatic given the codebase?" Spec compliance (does the diff implement what the task said it would?) is OUT of scope here — that was the first pass.
- **Input paths** — the plan artifact path (READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection — note that the diff at this point reflects the implementer's original work plus any spec-compliance fix iterations); the method reference at `references/code-quality-reviewer.md` resolved relative to this skill's base directory (absolute path computed by the orchestrator).
- **Output path** — a designated `.wip/` scratch file the orchestrator names (e.g., `docs/threads/<thread>/.wip/<UTC>-task-<N>-code-quality-review.md`). The reviewer writes its structured review (Verdict + findings + references) to this path.
- **Return contract** — write the review file directly; reply to the orchestrator with ONLY a 2–3 sentence summary plus the path of the review file. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT commit.

## Commit Policy

The orchestrator commits.

- **Cadence:** ONE commit **per orchestration cycle** — one commit per plan task after BOTH reviewers (spec-compliance and code-quality) PASS. The boundary is the orchestration cycle; subagents within the cycle do NOT commit. The orchestrator stages and commits the task-related files (strict-granularity plans state the files explicitly under `Files modified`; loose-granularity plans require the orchestrator to track which files the implementer dispatches touched across the cycle).
- **Override:** If the user's invocation contains an EXPLICIT Git instruction (for example, "commit at the end as one commit", "do not commit, just leave the changes staged"), honor the explicit instruction over the default per-orchestration-cycle cadence. The user's explicit instruction wins.

Commits use the project's conventional-commit shape where applicable; follow the project's `AGENTS.md` for scope rules. Stage only the files the orchestration cycle touched. Never run `git add -A` blindly. Commit subjects are descriptive of the plan task's objective, not its substeps. Commit message bodies MAY include the orchestration cycle's four-state task report block (status + subagent audit) so the audit trail lives in git history as well as chat output.

### Failed commit

**If a commit fails, the orchestrator reports `BLOCKED` and stops. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), then stop the entire run. Subsequent plan tasks are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject. Each of those is the project telling the orchestrator to stop and let the user diagnose. `BLOCKED` is the correct response, and the orchestrator's job ends at the report; the user starts a fresh run after resolving the underlying issue.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The orchestrator does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the orchestrator made earlier in the same run. Subagents are also forbidden from history rewriting; the orchestrator's brief to each subagent names this constraint. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

The policy is judgment-based and surfaced-via-task-report — not pre-clearance, not blanket permission.

- **Follow the plan.** The plan is the contract; the orchestrator dispatches one implementer per plan task in plan order. The implementer applies substeps where stated (strict-granularity) and infers them where loose. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If the plan task is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, the implementer applies the obvious correction and surfaces the deviation in its reply summary; the orchestrator captures the deviation in the cycle's task report.
- **Surface deviations in the task report.** Every deviation goes into the four-state status block (with the subagent audit). Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the plan did not specify) are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations (the implementer made a structural choice the plan did not anticipate, the implementer skipped a sub-step because it was unsafe to apply blindly, the implementer's read of the observed code conflicts with the plan task's input field) are `NEEDS_CONTEXT` with a clear "user clarification on X" next-action.
- **Reviewer-surfaced deviations.** Either reviewer (spec-compliance first, code-quality second) may surface a deviation in its findings. The orchestrator weighs the finding against the fix-loop convergence: if a fresh implementer can address the finding, do so; if the finding is structural and no fix iteration would close it, report `NEEDS_CONTEXT` for the task.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the orchestrator does NOT edit the plan artifact in place — the plan is immutable. The orchestrator surfaces the finding with `NEEDS_CONTEXT`, stops the run, and the user re-shapes the plan by producing a new versioned plan artifact to hand back on a fresh run.

## Immutability

Plan artifacts are IMMUTABLE. The orchestrator reads them READ-ONLY; the implementer subagent reads them READ-ONLY; both reviewer subagents read them READ-ONLY. The plan file is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

If during the orchestration cycle the implementer or a reviewer discovers that the plan is wrong (a plan task contradicts the observed code state, a plan task references a file that has been renamed, a plan task's verification block is built on a wrong assumption), the correct move is to surface the finding in the four-state task report with `DONE_WITH_CONCERNS` (if the implementer routed around the issue and finished the task and both reviewers passed) or `NEEDS_CONTEXT` (if the issue is structural and the fix loop did not converge). The plan artifact stays as it was. A revised plan is a new plan version produced in a separate plan-authoring flow, then handed back on a fresh run.

What the subagents DO modify is source code (the implementer subagent) or `.wip/` review scratch files (the reviewer subagents). The reviewer scratch files live under `docs/threads/<thread>/.wip/` — `.wip/` is recursively gitignored, so the review output does not enter version control. The implementer does NOT create new spec, proposal, plan, or decision-log artifacts inside this run; those require a separate authoring pass.

The thread folder set uses the following structure (folders are created on-demand, not pre-created):

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── proposals/
├── specs/
├── plans/
├── discussions/
├── inbox/
│   ├── open/
│   ├── processed/
│   └── dropped/
└── .wip/
```

The `.wip/` folder is recursively gitignored and is never used for emitted artifacts — only for in-progress scratch material.
