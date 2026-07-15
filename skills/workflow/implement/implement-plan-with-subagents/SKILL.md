---
name: implement-plan-with-subagents
description: Execute a strict multi-file plan artifact — a thread-root `plan.md` index plus its `plan-tasks/` briefs — through an implementer and a merged two-lane reviewer subagent loop with per-cycle commits; use when a plan needs the heavier review path and the runtime supports subagents.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 5.0.0
---

# Implement Plan With Subagents

Orchestrate the autonomous, plan-driven, multi-subagent implementation of a plan artifact. This skill is the orchestrator role: it does not write code itself — it reads the plan's index READ-ONLY (and the artifact its `Source:` line names), walks the index's task list in order, dispatches an **implementer subagent** for each task, dispatches ONE **merged reviewer subagent** that loads both review method files and returns two lane verdicts (plan-compliance and code-quality) judged independently, respawns a NEW implementer subagent whenever either lane surfaces issues, re-reviews every fix before advancing, commits per orchestration cycle, appends every attempted task's block to the run's progress file (cycle-gated, not commit-gated), reports a four-state status per plan task, and updates the thread's singleton **implementation report** on the way out. By default it does not pause for clarifying questions at each step or ask before committing, but it honors an invocation that asks it to check in or work through the tasks interactively; it does not rewrite history.

## Subagent Capability Precondition

**This skill REQUIRES subagent capability** (e.g., a runtime primitive that lets the orchestrator spawn an independent subagent with its own context window and have it write files to disk before replying with an acknowledgment). The orchestrator role this skill defines is meaningful only when implementer and reviewer subagents are real, separate-context dispatches.

**This skill does NOT fall back to inline execution.** There is no "if subagents are unavailable, do it yourself" branch. The orchestrator does not write code in-session, does not run reviews in-session, and does not collapse the two subagent roles (implementer; merged reviewer) back into a single agent — that defeats the two-lane review separation and the fresh-context-per-fix discipline. Subagent topology is a precondition of this skill, not a feature toggle. If the runtime does not support subagents, stop and tell the user this run cannot proceed, ending with `Outcome: REFUSED — runtime does not support subagents`.

## No Worktree Isolation

The subagents this skill dispatches run sequentially on the SAME working tree as the orchestrator. This skill does NOT use `git worktree add` isolation, parallel-worktree topology, or separate per-subagent working directories. Each subagent's writes to the working tree are observable to the next subagent — the merged reviewer reads what the implementer just wrote; the next implementer (on a fix iteration) reads the previous implementer's diff and the reviewer's findings; the re-review reads the same post-fix state. Subagents run sequentially, on the same tree, in the order this skill's `## Workflow` defines.

No parallel implementer dispatch. No per-task worktree branch. The orchestration cycle (one task) ends with one commit on the current working tree; the next cycle starts from that committed state on the same tree.

## Inputs

This skill accepts a plan artifact. The plan is a **multi-file** artifact rooted in the active thread folder:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── plan.md                 # the index, at the thread root
└── plan-tasks/
    ├── 01-<kebab-slug>.md
    ├── 02-<kebab-slug>.md
    └── …
```

The index plus its `plan-tasks/` folder together are the plan artifact. `plan.md` is the **index**: it carries the plan-level objective and context, a `Source:` line naming the upstream artifact the plan was compiled from (a thread-relative pointer, a repo-relative path, an issue URL, or `none — raw prompt`), a **Global Constraints** block, and an **ordered task list** (number, title, one-line objective, relative pointer per task) that is authoritative for task count and order. Each `plan-tasks/NN-<kebab-slug>.md` file is a directly dispatchable brief carrying the per-task fields — Objective; Input / context; Steps / substeps; Files modified; Verification; Acceptance criteria — plus two hand-off lines: `Consumes:` (exact things this task uses from earlier tasks) and `Produces:` (exact things later tasks rely on), where `none` is a legal value for either.

`NN` is a two-digit task ordinal matching the index's task list. The index is named exactly `plan.md` at the thread root, and neither it nor the task files carry a UTC stamp or `v<N>`. Every task in the plan is sequential, isolated, independently implementable, and independently reviewable, and the tasks are executed in index order. The user MAY pass either the thread root or the index path — both resolve to the same artifact.

A plan that does not match this multi-file shape — a missing index, a `plan-tasks/` folder that disagrees with the index, a task file missing its mandatory fields — fails the mechanical pre-flight (see `## Workflow`); the remedy is recompiling the plan from its source, not tolerating a mismatched shape. The orchestrator does not infer missing structure.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the orchestrator runs the dispatch loop only for the named task(s); when omitted, it runs every task the index lists, in order.

## Four-State Status Protocol

Every orchestration cycle's task report carries one of FOUR statuses. Use the names verbatim; downstream readers match against these tokens exactly.

**Claim vs. verified verdict.** The implementer subagent ends its reply with one of these same four tokens, but that token is an **untrusted claim** — the implementer's self-report. The orchestrator's four-state below is the **verified verdict**, synthesized only after the orchestrator inspects the working tree, runs the gated reviewer, and confirms or refutes the claim. The claim and the verdict may differ: a claimed `DONE` whose diff fails review drives the fix loop and may settle at `DONE_WITH_CONCERNS`; a claimed `BLOCKED` the orchestrator judges premature may become a verified `DONE`. The orchestrator records BOTH the claimed status and the verified verdict in its per-task audit (see `### Task report block shape`).

Both terminal verdicts are rare. `BLOCKED` is a hard external impossibility — progress is genuinely halted and no fresh dispatch would change that. `NEEDS_CONTEXT` is a judgment call neither the implementer nor the orchestrator can make alone — it needs information from outside the run. A reviewer `ISSUES` is never one of these; it drives the fix loop (see below).

- `DONE` — the plan task was completed, BOTH review lanes (plan-compliance and code-quality) passed without surfaced issues (or with issues that the subsequent fix iterations fully resolved), and the project's standing required gates — if the project defines any — pass on the changed code (see the baseline-gate clause in `## Commit Policy`). The orchestrator has no concerns to surface. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the plan task was completed but at least one concern was surfaced by the reviewer subagent (in either lane) or by the orchestrator's own audit of the cycle, and is being passed forward as a signal. Examples: the code-quality lane flagged a code smell the orchestrator judged non-blocking, the implementer made a judgment call on an ambiguous plan area, a possible-but-unverified edge case the review could not exercise from the diff alone, a minor deviation from the plan that the implementer applied per `## Plan Deviation Policy`. The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the orchestration cycle could not complete. Includes a failed commit the bounded fix loop could not resolve (see `## Commit Policy`), missing dependencies the implementer subagent could not resolve, inaccessible files, contradictory plan tasks, repeated review failures the fix loop could not close, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent plan tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the orchestration cycle cannot proceed without information neither the orchestrator nor the implementer subagent has. Includes "user clarification needed", "access to file outside repo needed", "external system credentials needed", "the plan task contradicts the observed code state and the implementer cannot pick the right side without input". Distinct from `BLOCKED`: a `BLOCKED` cycle hit a hard error during execution; a `NEEDS_CONTEXT` cycle did not start (or did not progress past initial setup) because the missing input was a precondition.

### Task report block shape (with subagent audit)

The four-state status appears as a structured block that is appended to the run's `progress.md` progress file (see `## Run workspace`) for every attempted task AND — for committed cycles only — carried in the orchestration cycle's commit message body; per-task chat output shrinks to a single line. The block is the audit trail without a separate state file. Because this skill dispatches subagents, the block MUST explicitly record (a) which subagents ran and their dispatch counts, (b) how many fix iterations occurred per verdict lane, and (c) the verified verdict per task. The merged reviewer is ONE subagent that returns two lane verdicts, so the audit carries one reviewer line with fix iterations broken out per lane.

Suggested format (exact wording is at the orchestrator's discretion, but the four-state status TOKEN MUST appear verbatim, BOTH the implementer's claimed status and the orchestrator's verified verdict MUST appear so a claim↔verdict divergence is visible):

```
Task <NN>: claimed <…> / verified <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Dispatches: implementer <N>; merged reviewer <N>
Fix iterations: plan-compliance <N>, code-quality <N>
Deviations: <none | one line each>
Unresolved concerns: <none | verbatim; resolved findings are counted, not restated>
Commit: <SHA> <subject>        # committed cycles: SHA+subject present in the progress file, omitted from the commit body; non-committing cycles: `Commit: none`
Notes: <1–3 sentences explaining rationale or surfaced concerns; call out any claim↔verdict divergence>
```

The final out-message from the skill summarizes EVERY plan task by its verified four-state status, plus the per-task subagent audit and the commit SHA + subject for every commit made during the run — folded from the progress file re-read from disk. This is the implementation audit trail; the user reads it to understand what the plan accomplished and what to do next.

## Dirty Worktree Handling

**The orchestrator runs the dirty-worktree check** — NOT the implementer subagent. The check is owned by the orchestrator role this skill defines, and the orchestrator runs it BEFORE spawning the first implementer subagent. The implementer subagent assumes a clean tree per the orchestrator's verification; reviewer subagents inspect `git diff` against the cycle's starting state and trust that the diff is the implementer's work, not pre-existing noise.

The check is non-skippable. Run it ONCE at the start of the run, BEFORE reading the plan artifact:

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the plan-resolution step.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill makes) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently. Do NOT delegate this check to the implementer subagent.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit the orchestrator makes (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not read the plan, do not spawn any subagent, do not modify the worktree, and end with `Outcome: REFUSED — worktree dirty; run aborted at the user's request`.

This skill does not use `git worktree` isolation — every implementation runs on the current working tree — so the orchestrator-owned dirty-worktree check is non-skippable. Subagents share that working tree per the no-worktree-isolation rule above.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. The orchestrator runs the dirty-worktree check at the very start. If clean, proceed. If dirty, ASK; on abort, stop. Do not dispatch any subagent until the check is satisfied.

2. **Resolve the active thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If the plan path the user passed is already thread-rooted, the thread is implicit. If no thread resolves, or multiple thread roots exist and which one the plan path belongs to is ambiguous, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>` — this is the one situation a pending bundle is physically impossible, because `.pending-decisions/` would live inside the very thread that failed to resolve; never silently pick the most recent timestamp. Allocate this run's workspace directory per `## Run workspace`. Do not dispatch any subagent until the workspace is allocated.

3. **Resolve the plan artifact path.** The plan is the thread-root `plan.md` index and its `plan-tasks/` folder; the thread root and the index path resolve to the same artifact. If the thread holds no `plan.md`, there is no plan to implement: refuse in chat, write nothing, and end with `Outcome: REFUSED — no plan.md in the resolved thread`.

4. **Run the mechanical pre-flight.** After the plan is resolved and BEFORE any dispatch, verify the index and the `plan-tasks/` folder agree: (a) every task-list entry in the index resolves to an existing file under `plan-tasks/`; (b) every file under `plan-tasks/` is listed in the index; (c) the ordinals are contiguous and match the filenames. If any check fails, HALT with a clear malformed-artifact message naming the mismatch and end with `Outcome: REFUSED — malformed plan artifact: <mismatch>` — this is a malformed plan artifact, not a `BLOCKED` task, and it is surfaced *before any subagent is dispatched*. The remedy is recompiling the plan from its source; the orchestrator does not repair the folder or infer missing structure.

5. **Read the index and its source, READ-ONLY.** The plan artifact is IMMUTABLE — open it for reading only. Read the index (`plan.md`) for the plan-level objective/context, the `Source:` line, the Global Constraints block, and the ordered task list; the index is authoritative for task count and order. When the `Source:` line names an artifact (anything other than `none — raw prompt`), the orchestrator ALSO reads that source artifact — the orchestrator holds the intent, the subagents hold the mechanics. Task files are read LAZILY: a task's `Files modified` list is read at staging time, and a judgment call MAY open a task file on demand; no step requires reading all task files up front. If the user passed a specific task identifier, narrow the run to that subset of the index's task list; otherwise execute every task the index lists, in order. Keep a running task list and its state so progress stays legible.

6. **For each plan task IN ORDER — the orchestration cycle:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first". Subagents within a cycle run sequentially on the same working tree per `## No Worktree Isolation`. The orchestrator pre-computes this cycle's scratch paths per `## Run workspace` — the two-digit dispatch ordinal `SS` is shared across roles and assigned at dispatch time — so every brief carries exact paths.)

   a. **Spawn the implementer subagent** with a self-contained brief from `## Subagent Briefs`. Pass the current task's file path (`plan-tasks/NN-<kebab-slug>.md`) + the index path + (on a fix iteration) the findings-file path + the pre-computed outcome-file path the implementer is to use IF it writes one. The brief states that nothing else *from the plan* is to be read, and affirmatively grants on-demand reading of the index's `Source:` artifact when the task file and index leave a question open. Wait for the implementer to return. The implementer writes code changes directly to the working tree, lists the paths of modified files, and — only when there is diff-blind content to persist — writes ONE outcome file at the named path and cites it in the reply. It CLOSES its reply with ONE uppercase status token — its **untrusted claim** — plus a 1–3 sentence summary. The orchestrator inspects the working tree itself (`git status --porcelain`, `git diff`) and reads the outcome file from disk when present, rather than trusting the reply's prose — the working tree is the completion signal; the status token and the outcome file are untrusted claims the orchestrator verifies. If an outcome file is present, carry forward its `Assumptions` / `Known risks` for injection — unclassified — into the merged reviewer brief of THIS dispatch's review pass (step b).

   **Gate on the claim before reviewing — every claim is untrusted (`## Four-State Status Protocol`):**
   - **Positive claim (`DONE` / `DONE_WITH_CONCERNS`) with a non-empty diff** → proceed to the merged review dispatch (step b below). This is the existing path, now explicitly gated.
   - **Empty-diff `DONE`** → do NOT route the empty diff to the diff-centric review lanes (answering "does the diff implement the task," they would read the empty diff as `MISSING` and misfire the fix loop). Instead confirm the task's expected outcome ALREADY holds against the working tree — run the task's verification block if it has one, else check the objective's post-conditions — then record a verified `DONE`, append this cycle's block to the run progress file with `Commit: none` (per `## Run workspace`), and advance (an empty diff yields no commit). The confirmation mechanism is the orchestrator's judgment.
   - **Terminal claim (`BLOCKED` / `NEEDS_CONTEXT`)** → route the signal and do NOT run the reviewer on incomplete work. Because the claim is untrusted, FIRST confirm the blocker is real; the orchestrator MAY dispatch ONE fresh implementer when the claim looks like premature give-up rather than true impossibility. If the blocker holds, record the matching verified terminal verdict, append this cycle's block to the run progress file with `Commit: none` (per `## Run workspace`), and stop the run; if the fresh implementer clears it, fall back into the positive-claim path. The sanity-check heuristic is the orchestrator's judgment.

   b. **Spawn the merged reviewer subagent.** ONE reviewer subagent per review pass. Use a self-contained brief from `## Subagent Briefs` that loads BOTH method-file paths — `references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md`, resolved relative to this skill's directory (absolute paths computed by the orchestrator) — and passes the current task's file path + the index path. Inject — unclassified — any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch so the reviewer assesses them within whichever lane they fall. The reviewer inspects the diff itself (`git diff` from the cycle's starting commit, or file-by-file) and returns BOTH verdicts SEPARATELY in its reply — a **plan-compliance** verdict and a **code-quality** verdict, each named per lane, each one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, each judged strictly within its own lane with no cross-lane trust. A reply missing either verdict is NOT accepted — re-dispatch. The reviewer writes ONE `SS-review.md` file (containing both lanes' sections) at the pre-computed scratch path ONLY when there is content — any lane `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, a lane `PASS` carrying non-blocking concerns, or an out-of-task observation; a both-lanes-clean pass with nothing to report writes no file. Wait for the reviewer to return; read the review file from disk when one was written, and do not trust the reply's prose. A task PASSES only when BOTH lane verdicts are clean. Either lane's `ISSUES` enters the fix loop (step c); a rare lane `BLOCKED` / `NEEDS_CONTEXT` (a can't-assess escape) routes to the orchestrator's matching terminal verdict; the orchestrator appends this cycle's block with `Commit: none` (per `## Run workspace`) and stops the run.

   c. **If EITHER lane returned `ISSUES`**, enter the fix loop. Spawn a NEW implementer subagent — always respawn a fresh implementer for the fix; the original implementer's context is gone. Include in the fix brief: the task file path + the index path, the findings file (path to the `SS-review.md` under the run directory), the next pre-computed outcome-file path the fix implementer is to use IF it writes one, and a clear directive that the fix MUST address the surfaced issues without re-introducing prior reviewer-approved behavior. Wait for the fix implementer to return. RE-REVIEW the fix — spawn a NEW merged reviewer subagent with a fresh brief that points at the new diff and loads BOTH method files again; it returns BOTH lane verdicts (the diff changed, so BOTH lanes are re-judged). Because the fix implementer is a fresh dispatch, carry its assumptions forward exactly as in step a — if it wrote its own outcome file, inject its `Assumptions` / `Known risks` (unclassified) into THIS re-review's brief. The orchestrator tracks fix iterations **per verdict lane**. Loop the fix-and-re-review pattern until BOTH lanes PASS. Each iteration costs one implementer + one merged reviewer subagent. A lane `ISSUES` NEVER becomes a `BLOCKED` verdict directly — it drives this fix loop; the SOLE fix-loop exit to `BLOCKED` is demonstrated non-convergence. If the loop fails to close (the reviewer keeps surfacing the same or escalating issues across iterations and the orchestrator's audit shows the fix loop is not converging), the orchestrator reports `BLOCKED` for this task with notes describing the loop state, appends this cycle's block with `Commit: none` (per `## Run workspace`), and stops the run.

   d. **The orchestrator commits per `## Commit Policy`.** Commit cadence is per orchestration cycle — one commit per task after BOTH lane verdicts are clean. The orchestrator stages the task's files (the task file's `Files modified` list is authoritative) and runs the commit itself. The implementer subagent does not commit; the reviewer subagent does not commit. If the commit succeeds, capture the SHA + subject. If the commit fails, follow the failed-commit branch in `## Commit Policy` — diagnose and fix in-authority causes within the retry cap; only when it cannot be resolved report `BLOCKED` for this task, append this cycle's block with `Commit: none` (per `## Run workspace`), and stop the entire run.

   e. **Append the committed cycle's block to the run progress file and synthesize the verified verdict.** The progress-file append is cycle-gated, not commit-gated (per `## Run workspace`): this committed-cycle case appends its block once its commit lands, while the non-committing cycles (empty-diff `DONE` in step a, the terminal `BLOCKED` / `NEEDS_CONTEXT` exits in steps a–d, and the failed-commit branch of `## Commit Policy`) each append their own block with `Commit: none` at the point they advance or stop. Aggregate the cycle's non-blocking concerns — reviewer concerns ridden on a lane `PASS` plus any forwarded implementer assumptions / known-risks the orchestrator judges worth carrying — into a verified `DONE_WITH_CONCERNS`; an all-clear cycle is a verified `DONE`. The orchestrator MAY escalate a non-blocking concern into a fix, but NEVER silently downgrades a blocking finding into a concern. Record BOTH the implementer's claimed status and the verified verdict in the block. Emit ONE chat line for the task (e.g. `Task 04: verified DONE, commit abc1234`); the full block lives in the progress file and the commit message body.

7. **Update the implementation report.** Once every plan task has run (or the run was halted at a `BLOCKED` task), the ORCHESTRATOR updates the thread's singleton implementation report per `## Implementation report` — folded from the progress file re-read from disk, together with the git history; it is NOT delegated to a subagent.

8. **Final out-message.** Emit a final summary listing every plan task by its verified four-state status, the per-task subagent audit, the commit SHA + subject for each commit made, and the thread-relative path of the implementation report just updated. If follow-ups were discovered, name where they were routed per `## Implementation report`. Close the summary with exactly one terminal line from the closed vocabulary — `Outcome: DONE — <implementation-report pointer>` when every plan task ran, or `Outcome: BLOCKED — <diagnosis>` when the run halted (a failed commit past the retry cap per `### Failed commit`, or a cycle whose verified verdict stopped the run). A run blocked on a genuine open decision emits its terminal line from `## Blocked`, naming the bundle path; an input-resolution refusal emits `Outcome: REFUSED — <reason>` from the resolution steps. The line is added to — it never replaces — the summary above.

## Run workspace

Keep all subagent scratch and operational progress for a run inside an invocation-scoped directory in the active thread:

```text
docs/threads/<thread>/.implementation-runs/<UTC>[-<desc>]/
├── progress.md                 # the run progress file (see below)
└── task-NN/                    # NN = the plan's task ordinal, matching plan-tasks/NN-<slug>.md
    ├── 01-implementer-outcome.md
    ├── 02-review.md
    └── …                       # SS = two-digit dispatch ordinal within the task, shared across roles
```

`<UTC>` is the run's start timestamp and is a valid directory name on its own; `<desc>` is an optional short kebab slug of the run's objective, taken from the plan's title purely for human scannability. Allocate a fresh directory unique to THIS invocation — never silently adopt or reuse an existing run directory. Recovery within an invocation reads only this run's own directory. If a previous run was interrupted, its directory survives so it can be resumed later, but only when the user explicitly identifies it; you never adopt it on your own. This directory is invocation-scoped in meaning: no durable artifact — not the implementation report, not a commit message — ever references a path inside it. Anything a durable record needs (a concern, a deviation, a finding) is COPIED into that record, never referenced by a run-directory path. The directory remains in place after the run as the run's operational trace.

- **`task-NN/`** matches the plan's task ordinal (`plan-tasks/NN-<slug>.md`).
- **`SS` is the two-digit dispatch ordinal within the task, shared across roles**, assigned by the orchestrator AT DISPATCH TIME so every brief carries exact, pre-computed paths. The task's first dispatch is `01`, the next `02`, and so on across BOTH implementer and reviewer dispatches. On a RESUMED run, the next `SS` is max-existing + 1. Because the files are conditional (below), gaps in the `SS` sequence are normal — NEVER renumber existing files to close them.
- **Write-once.** Every dispatch writes to a NEW file; never overwrite or append a prior dispatch's file. The implementer writes `SS-implementer-outcome.md` only when there is diff-blind content to persist; the merged reviewer writes ONE `SS-review.md` (both lane sections) only when there is content; a clean pass with no concerns writes no file.

**The progress file.** The per-task report block lives in a durable run progress file at `progress.md`. It is the run's working memory: it survives context compaction within a run.

- **Append-only, one block per attempted task — cycle-gated, not commit-gated.** Every orchestration cycle that reaches a verified outcome appends exactly one block (shape in `### Task report block shape`): a committed cycle appends its block once its commit lands; an empty-diff `DONE` cycle and a terminal `BLOCKED` / `NEEDS_CONTEXT` cycle (neither commits, including a failed-commit `BLOCKED`) append their block with `Commit: none` before advancing or stopping. A pre-flight halt appends nothing — no task cycle ever started. The progress file is never rewritten or reordered.
- **Block content:** claimed status vs verified verdict, dispatch counts, fix iterations per verdict lane, deviations, unresolved concerns verbatim (resolved findings are COUNTED, never restated), the commit SHA + subject for committed cycles (else `Commit: none`), and brief notes.
- **The commit message body carries the same block** for committed cycles, omitting the SHA of the commit itself (it is not known until the commit lands); a non-committing cycle has no commit body, so its block lives only in the progress file.
- **Chat shrinks to one line per task** (e.g. `Task 04: verified DONE, commit abc1234`); the full block lives in the progress file and the commit body.
- **Compaction recovery.** The progress file + `git log` are the run's resume state — never conversation recollection. If context was compacted mid-run, re-read `progress.md` and `git log` to recover where the run stands; do not reconstruct from memory. The implementation report is folded from the progress file RE-READ from disk at the end, not from what the orchestrator remembers.

## Implementation report

On EVERY normal terminal outcome — every plan task completed, a partial run, a `BLOCKED` halt, or a no-op where the requested state already held — the ORCHESTRATOR updates the thread's singleton `implementation-report.md` at the thread root by invoking `/update-implementation-report` with the verified current outcome: which plan tasks were completed, partially completed, blocked, or found already satisfied; the resulting code, test, and configuration changes; the checks actually run and their results, including failures and justified skips; every place the implementation diverged from what a plan task called for, each with a one-or-two-sentence reason; remaining concerns; and follow-ups. The report reflects only the CURRENT outcome — the primitive merges in place, replacing stale content and dropping now-resolved concerns — so pass it the run's end state, folded from `progress.md` re-read from disk, not a running log of earlier passes. The orchestrator writes this itself; it is not delegated to a subagent, and the orchestrator does not load any subagent reply as the report's content.

The per-task reviews this run performs are deliberately task-scoped gates — each checks one task's diff against that task, not the change as a whole — and the implementation is expected to receive a broader review afterward, so write this report to be that review's starting point. The verify stage that may follow checks the implementation against the spec's acceptance criteria — not against the plan — so the report's account of where the implementation diverged from the plan matters. Pull the deviations from the `DONE_WITH_CONCERNS` and `NEEDS_CONTEXT` cycle blocks in the progress file, together with the assumptions / known-risks the implementer subagents surfaced in their outcome files and the deviations the reviewer flagged in either lane.

## Blocked

This path applies whenever completing a plan task requires a genuine human decision the run cannot settle on its own from the plan and the observed code state. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat. First finish everything the run can safely derive without that decision, then hand the indispensable open decision(s) to `/emit-pending-decisions`, giving it `/implement-plan-with-subagents` as the producer, the thread's `implementation-report.md` as the target, the context you gathered as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the plan. Update the implementation report per `## Implementation report` to reflect the blocked outcome, then stop with a concise notification naming where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

## Roadmap-descendant feedback

When the run's thread carries a `Parent:` roadmap reference in its seed and the run discovers something with parent- or sibling-level impact, route it to the parent through `/append-roadmap-feedback`; `references/shared/roadmap-descendant-feedback.md` spells out what qualifies as parent-level impact, what to hand the primitive, and what stays local in this run's implementation report.

## Subagent Briefs

Each dispatched agent gets a self-contained brief. The orchestrator never inherits the agent's session and never loads the agent's output back into its own context. Each brief contains: scope, input paths, output path, return contract, and hard constraints. The orchestrator reads files the subagent wrote (the working tree, the review output file under the run directory); the reply is acknowledgment only. The orchestrator pre-computes every brief's exact scratch paths up front (per `## Run workspace`), so each brief carries write-once, pre-assigned paths.

### Brief-construction rules

The orchestrator writes the briefs, and a badly-shaped brief biases the review. A reviewer brief must NEVER pre-rate a finding's severity, exclude a category of findings, or declare a question already settled. Red-flag phrasings to keep OUT of any reviewer brief:

- "do not flag …" / "ignore …" — excluding a category of findings the reviewer is supposed to weigh.
- "at most minor …" / "this is low-severity" — pre-rating severity the reviewer is supposed to judge.
- "already decided" / "the plan chose X, so don't question it" — declaring a question settled.

The ONLY content the orchestrator injects into a reviewer brief beyond paths and scope is the implementer's surfaced `Assumptions` / `Known risks`, and it injects them **unclassified** — handed over as things to assess, never pre-judged as fine or as problems. That existing unclassified injection is the pattern every brief follows: give the reviewer the material and let it reach its own verdict.

### Reply shape and cap

Every subagent reply is acknowledgment only and uses a fixed short shape under a HARD CEILING of 15 lines:

- status/verdict token(s) — the implementer's single claim token, or the merged reviewer's two named lane verdicts;
- files touched;
- one-line verification result;
- a concerns flag (whether diff-blind concerns were written);
- the scratch-file path IF one was written.

Replies never paste the diff or the review body back — the orchestrator reads those from the working tree and the run-directory file.

### Implementer subagent

- **Scope** — the current orchestration cycle's context: the current task's file path (`plan-tasks/NN-<kebab-slug>.md`) and the index path. On a fix iteration, also the reviewer's findings (path to the `SS-review.md` under the run directory). Nothing else *from the plan* is to be read; the index's `Source:` artifact is readable context to consult on demand when the task file and index leave a question open.
- **Input paths** — the task file path and the index path (both READ-ONLY); on fix iterations, the prior `SS-review.md` findings file (READ-ONLY); the index's `Source:` artifact is readable context (READ-ONLY) when a question is left open.
- **Output path** — the implementer writes code changes DIRECTLY to the working tree at the file paths the task file's `Files modified` list names; the working tree IS the primary output. ADDITIONALLY, ONLY when there is diff-blind content to persist (assumptions, blockers / open questions, deliberately-skipped validation, known risks), the implementer writes ONE outcome file at the orchestrator-named, pre-computed path — `docs/threads/<thread>/.implementation-runs/<UTC>[-<desc>]/task-NN/SS-implementer-outcome.md` (the orchestrator names it in this brief; write-once; fix-loop dispatches get a fresh `SS`). A plain `DONE` with nothing to flag writes NO file — the reply alone carries the signal.
- **Return contract — status claim (untrusted).** The reply uses the fixed shape under the 15-line cap (`### Reply shape and cap`): the paths of modified files and — when an outcome file was written — that file's path, CLOSING with EXACTLY ONE uppercase status token from the shared four-state vocabulary — `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` — plus a 1–3 sentence summary. This token is the implementer's CLAIM, not a verdict — the orchestrator verifies it (see `## Four-State Status Protocol`); there is no other status token. A task found ALREADY satisfied (empty diff) is reported `DONE` with a note stating no change was needed and why — there is no separate no-op token. Before claiming `DONE`, run the project's standing required gates on your changes (per the baseline-gate clause in `## Commit Policy`; a project may define none) and resolve failures, recording any such runs in the outcome file's `Validation` `Ran` bucket. Do NOT paste the diff back. Do NOT commit (the orchestrator commits per `## Commit Policy`). Do NOT run `git commit`, `git add` outside of standard staging, or any history-rewriting operation.
- **Outcome-file content (when written).** The file carries the core fields `Status`, `Summary`, `Assumptions`, `Blockers & open questions`, and the optional fields `Validation` and `Known risks` only where they apply. It contains NO modified-files list and NO requirements-addressed list — the working tree and the plan already carry those. When `Validation` is present it carries ONLY a `Ran` bucket (checks performed BEYOND the plan task's verification block, with their results) and a `Not run` bucket (deliberately-skipped checks, with reasons); it NEVER restates the plan's prescribed verification. Match the pinned heading, the greppable `Status:` line, and the fixed section order exactly; OMIT empty optional sections rather than writing them as "none". The file is Markdown with NO YAML frontmatter.
- **Hard constraints** — do NOT modify the plan artifact (it is immutable — read-only); stay within the working tree and the named outcome path; do NOT commit; do NOT rewrite history; do NOT spawn further subagents; do NOT use `git worktree`; on a fix iteration, do NOT re-introduce behavior the prior reviewer approved while addressing the new findings.

**Pinned outcome-file template** (write only when diff-blind content exists; match the heading, the greppable `Status:` line, and the section order exactly; omit empty optional sections rather than writing them as "none"):

```markdown
# Implementer Outcome — Task <NN>

Status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>

## Summary
<1–3 sentences>

## Assumptions
- <assumption or forced judgment call, and what it rests on>

## Blockers & open questions
- <blocker / open question; the section is present, its bullets may be empty when there are none>

## Validation        <!-- optional: include only when present -->
Ran:
- <check performed BEYOND the plan task's verification block> — <result>
Not run:
- <deliberately-skipped check> — <reason>

## Known risks        <!-- optional: include only when present -->
- <risk the diff alone would not reveal>

## References
- <paths / task ids the orchestrator or reviewer need>
```

### Merged reviewer subagent

- **Scope** — review the diff for BOTH lanes at once. This ONE dispatch loads both method files and produces two INDEPENDENT lane verdicts: **plan-compliance** ("Does the diff implement what the task said it would?") and **code-quality** ("Is the diff well-structured, safe, idiomatic given the codebase?"). Each lane is judged strictly within its own scope, with NO cross-lane trust — a diff may fail plan-compliance and still receive code-quality findings in the same report. The orchestrator injects — unclassified — any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch; the reviewer assesses those within whichever lane they fall, per the method files.
- **Input paths** — the task file path and the index path (both READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection of the modified paths — on a fix re-review the diff reflects the original work plus the fix iterations); BOTH method references — `references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md` — resolved relative to this skill's directory (absolute paths computed by the orchestrator). The repo is readable context, and the index's `Source:` artifact may be consulted on demand.
- **Output path** — ONE `SS-review.md` at the pre-computed scratch path `docs/threads/<thread>/.implementation-runs/<UTC>[-<desc>]/task-NN/SS-review.md`, containing one section per lane. The reviewer writes it ONLY when there is content — any lane `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, a lane `PASS` carrying non-blocking concerns, or an out-of-task observation; a both-lanes-clean pass with nothing to report writes no file. Write-once — never overwrite or append a prior dispatch's file.
- **Return contract** — return BOTH lane verdicts on EVERY dispatch, using the fixed reply shape under the 15-line cap (`### Reply shape and cap`): a named **plan-compliance** verdict and a named **code-quality** verdict, each one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`; a reply missing either verdict is not accepted. When a review file was written, name its path. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT run tests beyond what the task's verification block prescribes (running the prescribed verification is in scope and expected); do NOT commit.

## Commit Policy

The orchestrator commits.

- **Cadence:** ONE commit **per orchestration cycle** — one commit per plan task after BOTH lane verdicts (plan-compliance and code-quality) are clean. The boundary is the orchestration cycle; subagents within the cycle do NOT commit. The orchestrator stages and commits the task's files: the task file's `Files modified` list is authoritative.
- **Baseline gate (before each commit):** A plan task's verification block is task-specific — it confirms THAT task's objective, and it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the plan's verification and this clause is a no-op. When the project DOES define standing gates, the orchestrator confirms they pass on the changed code BEFORE committing the cycle — independent of, and even when omitted by, the plan task's verification block. The orchestrator does not write code, so a standing-gate failure is routed through the fix loop: spawn a fresh implementer to resolve it, then — because that fix is a NEW code change the reviewer has not seen — re-run the merged reviewer on the fix (both lane verdicts again) before re-confirming the gate, so nothing reaches the commit that skipped a review. Only then commit. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this cycle. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.
- **Override:** If the user's invocation contains an EXPLICIT Git instruction (for example, "commit at the end as one commit", "do not commit, just leave the changes staged"), honor the explicit instruction over the default per-orchestration-cycle cadence. The user's explicit instruction wins.

Commits use the repository's existing commit convention when it is discoverable from recent history or local tooling. If no convention is obvious, use a short imperative subject that describes the plan task's objective, not its substeps. Stage only the files the orchestration cycle touched. Never run `git add -A` blindly. Commit message bodies carry the orchestration cycle's task report block (status + subagent audit, per `## Run workspace`, omitting the SHA of the commit itself), so the audit trail lives in git history as well as the progress file.

### Failed commit

A failed commit is diagnosed and fixed within the current orchestration cycle before it is ever treated as blocking — it is not an automatic halt.

- **Diagnose first.** The orchestrator reads the actual error the commit emitted; never retry blind. What failed — a pre-commit hook, a lint or format check, a test, a commit-message linter, a missing sign-off — determines whether it is the cycle's to fix.
- **Fix in-authority causes as part of the current cycle.** When the cause sits inside the task's own footprint — a lint or format violation in the task's files, a hook that auto-modified files that now need re-staging, a test the task's own diff broke, a commit subject a message linter rejected — the orchestrator fixes it: re-staging hook-modified files itself, or dispatching a fresh implementer for a code-level fix that is then re-reviewed by the merged reviewer (as the baseline-gate clause requires). Then re-run the failed check and retry the commit.
- **Bounded retries.** Make at most 3 fix-and-retry attempts for the cycle. Past the cap, or when the cause is outside the task's authority (missing sign-off configuration, credentials, failures in files the task does not own, infrastructure errors), the orchestrator reports `BLOCKED` for this task with the diagnosis in the notes — the specific failure and what was tried, not a bare "commit failed" — appends this cycle's block to the run progress file with `Commit: none` (per `## Run workspace`), and stops the entire run. Subsequent plan tasks are NOT attempted.
- **Guardrails (never traded for a green commit).** Never bypass hooks (`--no-verify` or any equivalent), never weaken, delete, or skip a check to make it pass, and never stash-and-retry. A fix addresses the real cause inside the task's footprint, or the cycle becomes a `BLOCKED` report.
- **Audit trail.** The cycle's progress block and the commit body note that the commit failed N times and what was fixed, so the retries stay visible in the history.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The orchestrator does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the orchestrator made earlier in the same run. Subagents are also forbidden from history rewriting; the orchestrator's brief to each subagent names this constraint. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

The policy is judgment-based and surfaced-via-task-report — not pre-clearance, not blanket permission.

- **Follow the plan.** The plan is the contract; the orchestrator dispatches one implementer per plan task in plan order. The implementer applies the task file's substeps. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If the plan task is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, the implementer applies the obvious correction and surfaces the deviation in its reply summary; the orchestrator captures the deviation in the cycle's task report.
- **Surface deviations in the task report.** Every deviation goes into the task's report block (with the subagent audit) in the progress file and the commit body. Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the plan did not specify) are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations (the implementer made a structural choice the plan did not anticipate, the implementer skipped a sub-step because it was unsafe to apply blindly, the implementer's read of the observed code conflicts with the plan task's input field) are `NEEDS_CONTEXT` with a clear "user clarification on X" next-action.
- **Reviewer-surfaced deviations.** The merged reviewer may surface a deviation in either lane's findings — including a *plan-mandated* finding (the diff faithfully implements something the plan itself got wrong). The orchestrator weighs the finding against the fix-loop convergence: if a fresh implementer can address the finding, do so; if the finding is structural and no fix iteration would close it, report `NEEDS_CONTEXT` for the task. The orchestrator never silently accepts a plan-mandated defect and never patches the plan mid-run.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the orchestrator does NOT revise the plan as a side effect of this run — plan revision happens upstream. The orchestrator surfaces the finding with `NEEDS_CONTEXT`, captures it in the implementation report, and stops the run. A **plan fault** (the plan is internally wrong but the spec is sound) is resolved by revising the living plan — re-running planning against the same source, or editing the plan in place as a living document — then handing the corrected plan back on a fresh run. A **spec fault** (the plan deviates because the spec is ambiguous or incomplete) routes to the human to fix the spec and recompile the plan from it, never a silent plan patch. Either way, resolving it is outside this run's mandate; surface it and stop.

## Immutability

Plan artifacts are IMMUTABLE. The orchestrator reads them READ-ONLY; the implementer subagent reads them READ-ONLY; the merged reviewer subagent reads them READ-ONLY. The plan is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

If during the orchestration cycle the implementer or the reviewer discovers that the plan is wrong (a plan task contradicts the observed code state, a plan task references a file that has been renamed, a plan task's verification block is built on a wrong assumption), the correct move is to surface the finding in the four-state task report with `DONE_WITH_CONCERNS` (if the implementer routed around the issue and finished the task and both lanes passed) or `NEEDS_CONTEXT` (if the issue is structural and the fix loop did not converge), and record it in the implementation report. The orchestrator does not revise the plan inside this run; plan revision happens upstream — the living plan is revised (re-run planning, or edit it in place as a living document) or its spec is fixed and the plan recompiled — and handed back on a fresh run.

What the subagents DO modify is source code (the implementer subagent) or the run's scratch files (the merged reviewer writes its `SS-review.md`; the implementer writes its `SS-implementer-outcome.md`), which live under the run's workspace directory per `## Run workspace`. The ORCHESTRATOR additionally updates the thread's singleton implementation report per `## Implementation report`. Neither the orchestrator nor any subagent creates new spec, proposal, plan, or decision-log artifacts inside this run; those require a separate authoring pass.
