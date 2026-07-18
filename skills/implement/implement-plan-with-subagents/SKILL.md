---
name: implement-plan-with-subagents
description: Execute a strict multi-file plan artifact — a thread-root `plan.md` index plus its `plan-tasks/` briefs — through an implementer and a merged two-lane reviewer subagent loop with per-cycle commits; use when a plan needs the heavier review path and the runtime supports subagents.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.1.0
---

# Implement Plan With Subagents

Orchestrate the autonomous, plan-driven, multi-subagent implementation of a plan artifact. This skill is the orchestrator role: it does not write code itself — it reads the plan's index READ-ONLY (and the artifact its `Source:` line names), walks the index's task list in order, dispatches an **implementer subagent** for each task, dispatches ONE **merged reviewer subagent** that loads both review method files and returns two lane verdicts (plan-compliance and code-quality) judged independently, respawns a NEW implementer subagent whenever either lane surfaces issues, re-reviews every fix before advancing, commits per orchestration cycle, appends every attempted task's factual progress block to the run's progress file (cycle-gated, not commit-gated), and updates the thread's singleton **implementation report** on the way out. It does not pause for clarifying questions at each step and does not ask before committing; the execution posture is identical whether or not a person is present. It does not rewrite history.

## Subagent Capability Precondition

**This skill REQUIRES subagent capability** (e.g., a runtime primitive that lets the orchestrator spawn an independent subagent with its own context window and have it write files to disk before replying with an acknowledgment). The orchestrator role this skill defines is meaningful only when implementer and reviewer subagents are real, separate-context dispatches.

**This skill does NOT fall back to inline execution.** There is no "if subagents are unavailable, do it yourself" branch. The orchestrator does not write code in-session, does not run reviews in-session, and does not collapse the two subagent roles (implementer; merged reviewer) back into a single agent — that defeats the two-lane review separation and the fresh-context-per-fix discipline. Subagent topology is a precondition of this skill, not a feature toggle. If the runtime does not support subagents, stop and tell the user this run cannot proceed, ending with `Outcome: REFUSED — runtime does not support subagents`.

## No Worktree Isolation

The subagents this skill dispatches run sequentially on the SAME working tree as the orchestrator. This skill does NOT use `git worktree add` isolation, parallel-worktree topology, or separate per-subagent working directories. Each subagent's writes to the working tree are observable to the next subagent — the merged reviewer reads what the implementer just wrote; the next implementer (on a fix iteration) reads the previous implementer's diff and the reviewer's findings; the re-review reads the same post-fix state. Subagents run sequentially, on the same tree, in the order this skill's `## Procedure` defines.

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

A plan that does not match this multi-file shape — a missing index, a `plan-tasks/` folder that disagrees with the index, a task file missing its mandatory fields — fails the mechanical pre-flight (see `## Procedure`); the remedy is recompiling the plan from its source, not tolerating a mismatched shape. The orchestrator does not infer missing structure.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the orchestrator runs the dispatch loop only for the named task(s); when omitted, it runs every task the index lists, in order.

## Subagent return contracts (skill-local)

This orchestrator dispatches subagents, so it needs a fixed vocabulary to route each returned result quickly. These return tokens are LOCAL to this skill's subagent topology — they are untrusted routing inputs the orchestrator consumes to decide what to do next, NOT the run's terminal outcome and NOT a per-cycle status protocol. The only terminal outcome this skill emits is the run's closing `Outcome:` line (`## Procedure`, final step), which is one of `DONE`, `BLOCKED`, or `REFUSED`. The tokens below never appear in the terminal outcome and are never promoted into a durable artifact as a status.

**Implementer reply tokens (untrusted claim).** The implementer subagent CLOSES its reply with exactly one uppercase token — `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`. This token is the implementer's self-report, not a verdict: the orchestrator validates each implementer reply against the working tree (`git status --porcelain`, `git diff`) and the outcome file read from disk before acting, and never trusts the reply's prose. What each validated token routes to:

- `DONE` / `DONE_WITH_CONCERNS` with a non-empty diff → proceed to the merged review dispatch; a `DONE_WITH_CONCERNS` token is factual concern input carried into the progress block.
- `DONE` with an empty diff → confirm the task's expected outcome ALREADY holds (run its verification block, else check the objective's post-conditions), record the cycle with `Commit: none`, and advance; an empty diff yields no commit.
- `BLOCKED` / `NEEDS_CONTEXT` → an untrusted terminal claim; the orchestrator FIRST confirms the blocker is real and MAY dispatch ONE fresh implementer when the claim looks like premature give-up. If it holds, route per `## Blocked` and stop the run; if the fresh implementer clears it, fall back into the positive path. A `NEEDS_CONTEXT` token that reflects genuinely missing human intent queues a decision bundle; an operational `BLOCKED` token ends the run with a diagnosis and no bundle.

**Reviewer lane tokens (untrusted, per lane).** The merged reviewer returns TWO named lane verdicts on every dispatch — a **plan-compliance** verdict and a **code-quality** verdict — each one of `PASS`, `ISSUES`, `BLOCKED`, or `NEEDS_CONTEXT`, judged strictly within its own lane with no cross-lane trust. A reply missing either verdict is not accepted — re-dispatch. The orchestrator validates each lane verdict against the review file the reviewer wrote (read from disk, not the reply prose):

- BOTH lanes `PASS` → the task passes review; proceed to commit. A lane `PASS` MAY still carry non-blocking concerns in the review file — those become factual concern input.
- EITHER lane `ISSUES` → enter the fix loop (`## Procedure` step c); an `ISSUES` verdict NEVER becomes a run `BLOCKED` directly.
- A rare lane `BLOCKED` / `NEEDS_CONTEXT` (a can't-assess escape) → the reviewer cannot assess the work; route per `## Blocked` as an operational halt and stop the run.

**Malformed or incomplete replies stay inside the dispatch loop.** A missing token, a missing lane verdict, or a reply that contradicts the working tree is handled by re-dispatching or by the orchestrator's own inspection of the working tree and the review file — it never surfaces in the terminal outcome. The run's terminal outcome is synthesized by the orchestrator from validated facts, independent of the reply vocabulary above.

## Factual progress records

Each attempted plan task is recorded as an ordinary factual progress block — plain prose or ordinary structured fields, never a status token (`## Subagent return contracts (skill-local)`).

One append-only block per attempted task is **appended to the run progress file** (see `## Run workspace`) and — for a committed cycle — carried in that task's commit message body minus its own SHA. Chat output shrinks to a one-line summary per task; the full block lives in the progress file. Because this skill dispatches subagents, each block records the subagent audit as facts. Each block records:

- **Task attempted** — which plan task (`NN`), named from the index.
- **Implementer reply tokens and dispatch count** — the token(s) the implementer subagent(s) returned for this cycle and how many implementer dispatches ran, recorded as facts.
- **Reviewer lane verdicts and fix-iteration counts** — the merged reviewer's final plan-compliance and code-quality verdicts and how many fix iterations ran per lane; the merged reviewer is ONE subagent, so one reviewer line carries both lanes.
- **Changes made** — what the diff did.
- **Verification** — the task file's verification block and any project gate actually run, and their results, including failures and justified skips.
- **Concerns** — non-blocking concerns to surface (a reviewer concern ridden on a lane `PASS`, an implementer assumption or known risk worth carrying, a judgment call, a deviation applied per `## Plan Deviation Policy`), verbatim, or `none`; resolved findings are counted, not restated.
- **Commit** — the SHA + subject for a committed cycle, else `none`.
- **Next action** — the suggested follow-up ("ready for next task", "ready for review", "stop and surface this finding", etc.).

Suggested block shape (exact wording is at the orchestrator's discretion):

```
Task <NN> — <short label>
Dispatches: implementer <N>; merged reviewer <N>
Reply tokens: implementer <…>; reviewer plan-compliance <…>, code-quality <…>
Fix iterations: plan-compliance <N>, code-quality <N>
Changes made: <what the diff did>
Verification: <checks run and their results>
Concerns: <non-blocking concerns verbatim, or "none">
Commit: <SHA + subject, or "none">   # committed cycles: SHA + subject in the progress file, omitted from the commit body; non-committing cycles: none
Next action: <suggested follow-up>
```

The final out-message folds every attempted plan task from the progress file re-read from disk, plus the commit SHA + subject for every commit made during the run. This is the implementation audit trail; the user reads it to understand what the plan accomplished and what to do next.

## Dirty Worktree Handling

**The orchestrator runs the dirty-worktree check** — NOT the implementer subagent. This skill runs on the current working tree and uses no `git worktree` isolation, so the worktree state is the FIRST safety preflight — checked ONCE at the very start of the run, before reading the plan artifact and before spawning any subagent. The implementer subagent assumes a clean tree per the orchestrator's verification; reviewer subagents inspect `git diff` against the cycle's starting state and trust that the diff is the implementer's work, not pre-existing noise. The check is non-skippable and is not delegated to any subagent.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed to the rest of preflight.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), proceed only when the invocation carries advance authorization that explicitly acknowledges the existing changes will be preserved and may enter this skill's implementation commits. A bare instruction to ignore the dirty tree does not satisfy the gate.
4. Otherwise refuse immediately: write nothing, spawn no subagent, name the dirty paths, give the exact authorization needed to re-invoke, and end with `Outcome: REFUSED — worktree dirty (<dirty paths>); re-invoke with authorization acknowledging the existing changes will be preserved and may enter this skill's commits`. Do not ask, do not wait, do not auto-stash, do not auto-commit the pre-existing changes.

When authorization is present, the pre-existing dirty changes are unavoidably picked up by the first `git commit` the orchestrator makes once staged; the authorization is consent to that outcome. Subagents share that working tree per the no-worktree-isolation rule above.

## Procedure

Steps 1–5 are preflight. They complete in full — with no workflow artifact written, no run workspace allocated, no project file edited, no subagent dispatched, and no commit made — before execution begins at step 6. Any preflight failure ends the run `Outcome: REFUSED — <reason and how to re-invoke>` and writes nothing.

1. **Safety preflight: dirty worktree.** Per `## Dirty Worktree Handling`, the orchestrator runs this check first. On a dirty tree without valid advance authorization, refuse now — write nothing, spawn no subagent, name the dirty paths, give the exact re-invocation authorization, and end `Outcome: REFUSED — <…>`. Do not ask, do not wait.

2. **Resolve the active thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If the plan path the user passed is already thread-rooted, the thread is implicit. If no thread resolves, or multiple thread roots exist and which one the plan path belongs to is ambiguous, refuse — write nothing and end `Outcome: REFUSED — <reason>`. This is the one situation a pending bundle is physically impossible, because `.pending-decisions/` would live inside the very thread that failed to resolve; never silently pick the most recent timestamp.

3. **Resolve the plan artifact path.** The plan is the thread-root `plan.md` index and its `plan-tasks/` folder; the thread root and the index path resolve to the same artifact. If the thread holds no `plan.md`, there is no plan to implement: refuse — write nothing and end `Outcome: REFUSED — no plan.md in the resolved thread`.

4. **Run the mechanical pre-flight, verify required tooling, then read the index and its source READ-ONLY.** The plan artifact is IMMUTABLE — open everything for reading only. Verify the index and the `plan-tasks/` folder agree: (a) every task-list entry in the index resolves to an existing file under `plan-tasks/`; (b) every file under `plan-tasks/` is listed in the index; (c) the ordinals are contiguous and match the filenames. If any check fails, end `Outcome: REFUSED — malformed plan artifact: <mismatch>` before any subagent is dispatched — this is a malformed plan artifact, not a `BLOCKED` task; the remedy is recompiling the plan from its source, and the orchestrator does not repair the folder or infer missing structure. Also confirm any tooling and credentials the run explicitly requires are present; a missing required tool or credential caught here is likewise a preflight refusal. Then read the index (`plan.md`) for the plan-level objective/context, the `Source:` line, the Global Constraints block, and the ordered task list; the index is authoritative for task count and order. When the `Source:` line names an artifact (anything other than `none — raw prompt`), the orchestrator ALSO reads that source artifact — the orchestrator holds the intent, the subagents hold the mechanics. Task files are read LAZILY: a task's `Files modified` list is read at staging time, and a judgment call MAY open a task file on demand; no step requires reading all task files up front. If the user passed a specific task identifier, narrow the run to that subset of the index's task list; otherwise execute every task the index lists, in order.

5. **Allocate the run workspace.** Preflight has passed; allocate this run's workspace directory per `## Run workspace`. Keep a running task list and its state so progress stays legible. Do not dispatch any subagent until the workspace is allocated.

6. **For each plan task IN ORDER — the orchestration cycle:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first". Subagents within a cycle run sequentially on the same working tree per `## No Worktree Isolation`. The orchestrator pre-computes this cycle's scratch paths per `## Run workspace` — the two-digit dispatch ordinal `SS` is shared across roles and assigned at dispatch time — so every brief carries exact paths.)

   a. **Spawn the implementer subagent** with a self-contained brief from `## Subagent Briefs`. Pass the current task's file path (`plan-tasks/NN-<kebab-slug>.md`) + the index path + (on a fix iteration) the findings-file path + the pre-computed outcome-file path the implementer is to use IF it writes one. The brief states that nothing else *from the plan* is to be read, and affirmatively grants on-demand reading of the index's `Source:` artifact when the task file and index leave a question open. Wait for the implementer to return. The implementer writes code changes directly to the working tree, lists the paths of modified files, and — only when there is diff-blind content to persist — writes ONE outcome file at the named path and cites it in the reply. It CLOSES its reply with ONE uppercase implementer reply token plus a 1–3 sentence summary. The orchestrator inspects the working tree itself (`git status --porcelain`, `git diff`) and reads the outcome file from disk when present, rather than trusting the reply's prose — the working tree is the completion signal; the token and the outcome file are untrusted routing inputs the orchestrator validates. If an outcome file is present, carry forward its `Assumptions` / `Known risks` for injection — unclassified — into the merged reviewer brief of THIS dispatch's review pass (step b).

   **Gate on the implementer reply token per `## Subagent return contracts (skill-local)`**, which owns which validated token drives which action. Two operational nuances that routing depends on and the section does not repeat:
   - **Empty-diff `DONE`** — do NOT route the empty diff to the diff-centric review lanes; answering "does the diff implement the task," they would read the empty diff as `MISSING` and misfire the fix loop. Confirm instead that the task's expected outcome ALREADY holds against the working tree — run the task's verification block if it has one, else check the objective's post-conditions; the confirmation mechanism is the orchestrator's judgment.
   - **Terminal `BLOCKED` / `NEEDS_CONTEXT`** — do NOT run the reviewer on incomplete work. The orchestrator MAY dispatch ONE fresh implementer when the token looks like premature give-up rather than true impossibility; the sanity-check heuristic is its judgment. If the fresh implementer clears it, fall back into the positive path; otherwise route per `## Blocked` and stop.

   Each non-committing branch appends this cycle's factual progress block with `Commit: none` (per `## Run workspace`) before advancing or stopping.

   b. **Spawn the merged reviewer subagent.** ONE reviewer subagent per review pass. Use a self-contained brief from `## Subagent Briefs` that loads BOTH method-file paths — `references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md` — together with the shared lane policy `references/reviewer-policy.md`, resolved relative to this skill's directory (absolute paths computed by the orchestrator), and passes the current task's file path + the index path. Inject — unclassified — any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch so the reviewer assesses them within whichever lane they fall. The reviewer inspects the diff itself (`git diff` from the cycle's starting commit, or file-by-file) and returns BOTH verdicts SEPARATELY in its reply — a **plan-compliance** verdict and a **code-quality** verdict, each named per lane, each one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, each judged strictly within its own lane with no cross-lane trust. A reply missing either verdict is NOT accepted — re-dispatch. The reviewer writes ONE `SS-review.md` file (containing both lanes' sections) at the pre-computed scratch path ONLY when there is content — any lane `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, a lane `PASS` carrying non-blocking concerns, or an out-of-task observation; a both-lanes-clean pass with nothing to report writes no file. Wait for the reviewer to return; read the review file from disk when one was written, and do not trust the reply's prose. Route the two lane verdicts per `## Subagent return contracts (skill-local)` — both clean advances to the commit (step d); either lane's `ISSUES` enters the fix loop (step c); a rare lane `BLOCKED` / `NEEDS_CONTEXT` can't-assess escape appends this cycle's block with `Commit: none` (per `## Run workspace`) and routes per `## Blocked` as an operational halt that stops the run.

   c. **If EITHER lane returned `ISSUES`**, enter the fix loop. Spawn a NEW implementer subagent — always respawn a fresh implementer for the fix; the original implementer's context is gone. Include in the fix brief: the task file path + the index path, the findings file (path to the `SS-review.md` under the run directory), the next pre-computed outcome-file path the fix implementer is to use IF it writes one, and a clear directive that the fix MUST address the surfaced issues without re-introducing prior reviewer-approved behavior. Wait for the fix implementer to return. RE-REVIEW the fix — spawn a NEW merged reviewer subagent with a fresh brief that points at the new diff and loads BOTH method files and the shared lane policy again; it returns BOTH lane verdicts (the diff changed, so BOTH lanes are re-judged). Because the fix implementer is a fresh dispatch, carry its assumptions forward exactly as in step a — if it wrote its own outcome file, inject its `Assumptions` / `Known risks` (unclassified) into THIS re-review's brief. The orchestrator tracks fix iterations **per verdict lane**. Loop the fix-and-re-review pattern until BOTH lanes PASS. Each iteration costs one implementer + one merged reviewer subagent. A lane `ISSUES` NEVER becomes a `BLOCKED` outcome directly — it drives this fix loop; the SOLE fix-loop exit to `BLOCKED` is demonstrated non-convergence. If the loop fails to close (the reviewer keeps surfacing the same or escalating issues across iterations and the orchestrator's audit shows the fix loop is not converging), the run has hit an operational defect: the orchestrator appends this cycle's block with `Commit: none` (per `## Run workspace`) describing the loop state, and stops the run `BLOCKED` per `## Blocked` with no decision bundle.

   d. **The orchestrator commits per `## Commit Policy`.** Commit cadence is per orchestration cycle — one commit per task after BOTH lane verdicts are clean. The orchestrator stages the task's files (the task file's `Files modified` list is authoritative) and runs the commit itself. The implementer subagent does not commit; the reviewer subagent does not commit. If the commit succeeds, capture the SHA + subject. If the commit fails, follow the failed-commit branch in `## Commit Policy` — diagnose and fix in-authority causes within the retry cap; only when it cannot be resolved does the run hit an operational defect: append this cycle's block with `Commit: none` (per `## Run workspace`) recording the diagnosis, and stop the entire run `BLOCKED` per `## Blocked`.

   e. **Append the committed cycle's factual progress block to the run progress file.** The progress-file append is cycle-gated, not commit-gated (per `## Run workspace`): this committed-cycle case appends its block once its commit lands, while the non-committing cycles (empty-diff `DONE` in step a, the terminal exits in steps a–d, and the failed-commit branch of `## Commit Policy`) each append their own block with `Commit: none` at the point they advance or stop. Record the cycle's facts in the block shape `## Factual progress records` defines. The orchestrator MAY escalate a non-blocking concern into a fix, but NEVER silently downgrades a blocking finding into a concern. Emit ONE chat line for the task (e.g. `Task 04: done, commit abc1234`); the full block lives in the progress file and the commit message body.

7. **Update the implementation report.** Once every plan task has run (or the run was halted per `## Blocked`), the ORCHESTRATOR updates the thread's singleton implementation report per `## Implementation report` — folded from the progress file re-read from disk, together with the git history; it is NOT delegated to a subagent.

8. **Final out-message.** Emit a final summary folding every attempted plan task from the progress file re-read from disk — each named with its factual cycle block, the per-task subagent audit, and the commit SHA + subject for each commit made — plus the thread-relative path of the implementation report just updated. If follow-ups were discovered, name where they were routed per `## Implementation report`. Close the summary with exactly one terminal line from the closed vocabulary — `Outcome: DONE — <implementation-report pointer>` when the requested work completed (including completion with non-blocking concerns), `Outcome: BLOCKED — <diagnosis or bundle path>` when substantive execution began but the run halted (a missing-intent bundle per `## Blocked`, a non-converging fix loop, a reviewer can't-assess escape, or a failed commit past the retry cap), or `Outcome: REFUSED — <reason>` when preflight prevented execution (steps 1–5). The line is added to — it never replaces — the summary above.

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

**The progress file.** The per-task factual progress block lives in a durable run progress file at `progress.md`. It is the run's working memory: it survives context compaction within a run.

- **Append-only, one block per attempted task — cycle-gated, not commit-gated.** Every orchestration cycle that reaches an outcome appends exactly one block (shape in `## Factual progress records`): a committed cycle appends its block once its commit lands; an empty-diff `DONE` cycle and a halted cycle (a routed terminal token, a reviewer can't-assess escape, a non-converging fix loop, or a failed commit) append their block with `Commit: none` before advancing or stopping. A pre-flight halt appends nothing — no task cycle ever started. The progress file is never rewritten or reordered.
- **Block content:** the field set and block shape are defined once in `## Factual progress records`.
- **The commit message body carries the same block** for committed cycles, omitting the SHA of the commit itself (it is not known until the commit lands); a non-committing cycle has no commit body, so its block lives only in the progress file.
- **Chat shrinks to one line per task** (e.g. `Task 04: done, commit abc1234`); the full block lives in the progress file and the commit body.
- **Compaction recovery.** The progress file + `git log` are the run's resume state — never conversation recollection. If context was compacted mid-run, re-read `progress.md` and `git log` to recover where the run stands; do not reconstruct from memory. The implementation report is folded from the progress file RE-READ from disk at the end, not from what the orchestrator remembers.

## Implementation report

On EVERY normal terminal outcome — every plan task completed, a partial run, a `BLOCKED` halt, or a no-op where the requested state already held — the ORCHESTRATOR updates the thread's singleton `implementation-report.md` at the thread root by invoking `/update-implementation-report` with the verified current outcome: which plan tasks were completed, partially completed, blocked, or found already satisfied; the resulting code, test, and configuration changes; the checks actually run and their results, including failures and justified skips; every place the implementation diverged from what a plan task called for, each with a one-or-two-sentence reason; remaining concerns; and follow-ups. The report reflects only the CURRENT outcome — the primitive merges in place, replacing stale content and dropping now-resolved concerns — so pass it the run's end state, folded from `progress.md` re-read from disk, not a running log of earlier passes. The orchestrator writes this itself; it is not delegated to a subagent, and the orchestrator does not load any subagent reply as the report's content.

The per-task reviews this run performs are deliberately task-scoped gates — each checks one task's diff against that task, not the change as a whole — and the implementation is expected to receive a broader review afterward, so write this report to be that review's starting point. The verify stage that may follow checks the implementation against the spec's acceptance criteria — not against the plan — so the report's account of where the implementation diverged from the plan matters. Pull the deviations from the concerns fields of the factual progress blocks in the progress file, together with the assumptions / known-risks the implementer subagents surfaced in their outcome files and the deviations the reviewer flagged in either lane.

## Blocked

Two situations stop the run once substantive execution has begun (step 6 onward), and both end `BLOCKED`. Neither is reachable from preflight — a dirty-tree, thread, plan-resolution, mechanical, or tooling failure caught in steps 1–5 is a `REFUSED`, not this path. Distinguish a genuine missing-intent question from an operational defect before choosing between them.

**Missing human intent.** This applies whenever completing a plan task requires a genuine human decision the run cannot settle on its own from the plan and the observed code state (an implementer `NEEDS_CONTEXT` token the orchestrator validated as genuinely missing intent). There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat. First finish everything the run can safely derive without that decision, then hand the indispensable open decision(s) to `/emit-pending-decisions`, giving it `/implement-plan-with-subagents` as the producer, the thread's `implementation-report.md` as the target, the context you gathered as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the plan. Update the implementation report per `## Implementation report` to reflect the blocked outcome, then stop with a concise notification naming where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

**Operational defect.** An unfixable in-run failure the run cannot repair on its own — an implementer `BLOCKED` token confirming a real operational impossibility, a reviewer can't-assess escape (a lane `BLOCKED` / `NEEDS_CONTEXT`), a non-converging fix loop, an exhausted commit retry (per `### Failed commit`), an inaccessible external dependency, or a runtime failure — ends the run `BLOCKED` with a diagnosis and NO decision bundle. Finish any safe work first, update the implementation report per `## Implementation report`, and end with `Outcome: BLOCKED — <diagnosis>`. A structural plan mismatch that the mechanical preflight catches remains a preflight `REFUSED`, not this path.

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

- routing token(s) — the implementer's single reply token, or the merged reviewer's two named lane verdicts (skill-local, untrusted, per `## Subagent return contracts (skill-local)`);
- files touched;
- one-line verification result;
- a concerns flag (whether diff-blind concerns were written);
- the scratch-file path IF one was written.

Replies never paste the diff or the review body back — the orchestrator reads those from the working tree and the run-directory file.

### Implementer subagent

- **Scope** — the current orchestration cycle's context: the current task's file path (`plan-tasks/NN-<kebab-slug>.md`) and the index path. On a fix iteration, also the reviewer's findings (path to the `SS-review.md` under the run directory). Nothing else *from the plan* is to be read; the index's `Source:` artifact is readable context to consult on demand when the task file and index leave a question open.
- **Input paths** — the task file path and the index path (both READ-ONLY); on fix iterations, the prior `SS-review.md` findings file (READ-ONLY); the index's `Source:` artifact is readable context (READ-ONLY) when a question is left open.
- **Output path** — the implementer writes code changes DIRECTLY to the working tree at the file paths the task file's `Files modified` list names; the working tree IS the primary output. ADDITIONALLY, ONLY when there is diff-blind content to persist (assumptions, blockers / open questions, deliberately-skipped validation, known risks), the implementer writes ONE outcome file at the orchestrator-named, pre-computed path — `docs/threads/<thread>/.implementation-runs/<UTC>[-<desc>]/task-NN/SS-implementer-outcome.md` (the orchestrator names it in this brief; write-once; fix-loop dispatches get a fresh `SS`). A plain `DONE` with nothing to flag writes NO file — the reply alone carries the signal.
- **Return contract — reply token (skill-local, untrusted).** The reply uses the fixed shape under the 15-line cap (`### Reply shape and cap`): the paths of modified files and — when an outcome file was written — that file's path, CLOSING with EXACTLY ONE uppercase token from this skill's implementer reply vocabulary — `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` — plus a 1–3 sentence summary. This token is a skill-local, untrusted routing input the orchestrator validates against the working tree (`## Subagent return contracts (skill-local)`); there is no other token. A task found ALREADY satisfied (empty diff) is reported `DONE` with a note stating no change was needed and why — there is no separate no-op token. Before claiming `DONE`, run the project's standing required gates on your changes (per the baseline-gate clause in `## Commit Policy`; a project may define none) and resolve failures, recording any such runs in the outcome file's `Validation` `Ran` bucket. Do NOT paste the diff back. Do NOT commit (the orchestrator commits per `## Commit Policy`). Do NOT run `git commit`, `git add` outside of standard staging, or any history-rewriting operation.
- **Outcome-file content (when written).** The file carries the core fields `Status`, `Summary`, `Assumptions`, `Blockers & open questions`, and the optional fields `Validation` and `Known risks` only where they apply. It contains NO modified-files list and NO requirements-addressed list — the working tree and the plan already carry those. When `Validation` is present it carries ONLY a `Ran` bucket (checks performed BEYOND the plan task's verification block, with their results) and a `Not run` bucket (deliberately-skipped checks, with reasons); it NEVER restates the plan's prescribed verification. Match the pinned heading, the greppable `Status:` line, and the fixed section order exactly; OMIT empty optional sections rather than writing them as "none". The file is Markdown with NO YAML frontmatter.
- **Hard constraints** — do NOT modify the plan artifact (it is immutable — read-only); stay within the working tree and the named outcome path; do NOT commit; do NOT rewrite history; do NOT spawn further subagents; do NOT use `git worktree`; on a fix iteration, do NOT re-introduce behavior the prior reviewer approved while addressing the new findings.

**Pinned outcome-file template** (write only when diff-blind content exists; match the heading, the greppable `Status:` line, and the section order exactly; omit empty optional sections rather than writing them as "none"). The `Status:` line uses this skill's local implementer reply token (`## Subagent return contracts (skill-local)`):

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

- **Scope** — review the diff for BOTH lanes at once. This ONE dispatch loads both method files and the shared lane policy, and produces two INDEPENDENT lane verdicts: **plan-compliance** ("Does the diff implement what the task said it would?") and **code-quality** ("Is the diff well-structured, safe, idiomatic given the codebase?"). Each lane is judged strictly within its own scope, with NO cross-lane trust — a diff may fail plan-compliance and still receive code-quality findings in the same report. The orchestrator injects — unclassified — any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch; the reviewer assesses those within whichever lane they fall, per the method files.
- **Input paths** — the task file path and the index path (both READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection of the modified paths — on a fix re-review the diff reflects the original work plus the fix iterations); BOTH method references — `references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md` — and the shared lane policy `references/reviewer-policy.md`, resolved relative to this skill's directory (absolute paths computed by the orchestrator). The repo is readable context, and the index's `Source:` artifact may be consulted on demand.
- **Output path** — ONE `SS-review.md` at the pre-computed scratch path `docs/threads/<thread>/.implementation-runs/<UTC>[-<desc>]/task-NN/SS-review.md`, containing one section per lane. The reviewer writes it ONLY when there is content — any lane `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, a lane `PASS` carrying non-blocking concerns, or an out-of-task observation; a both-lanes-clean pass with nothing to report writes no file. Write-once — never overwrite or append a prior dispatch's file.
- **Return contract (skill-local, untrusted).** Return BOTH lane verdicts on EVERY dispatch, using the fixed reply shape under the 15-line cap (`### Reply shape and cap`): a named **plan-compliance** verdict and a named **code-quality** verdict, each one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`; a reply missing either verdict is not accepted. These are skill-local routing inputs the orchestrator validates against the review file (`## Subagent return contracts (skill-local)`). When a review file was written, name its path. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT run tests beyond what the task's verification block prescribes (running the prescribed verification is in scope and expected); do NOT commit.

## Commit Policy

The orchestrator commits.

- **Cadence:** ONE commit **per orchestration cycle** — one commit per plan task after BOTH lane verdicts (plan-compliance and code-quality) are clean. The boundary is the orchestration cycle; subagents within the cycle do NOT commit. The orchestrator stages and commits the task's files: the task file's `Files modified` list is authoritative.
- **Baseline gate (before each commit):** A plan task's verification block is task-specific — it confirms THAT task's objective, and it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the plan's verification and this clause is a no-op. When the project DOES define standing gates, the orchestrator confirms they pass on the changed code BEFORE committing the cycle — independent of, and even when omitted by, the plan task's verification block. The orchestrator does not write code, so a standing-gate failure is routed through the fix loop: spawn a fresh implementer to resolve it, then — because that fix is a NEW code change the reviewer has not seen — re-run the merged reviewer on the fix (both lane verdicts again) before re-confirming the gate, so nothing reaches the commit that skipped a review. Only then commit. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this cycle. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.
- **Override:** If the user's invocation contains an EXPLICIT Git instruction (for example, "commit at the end as one commit", "do not commit, just leave the changes staged"), honor the explicit instruction over the default per-orchestration-cycle cadence. The user's explicit instruction wins.

Commits use the repository's existing commit convention when it is discoverable from recent history or local tooling. If no convention is obvious, use a short imperative subject that describes the plan task's objective, not its substeps. Stage only the files the orchestration cycle touched. Never run `git add -A` blindly. Commit message bodies carry the orchestration cycle's factual progress block (the subagent audit and facts, per `## Run workspace`, omitting the SHA of the commit itself), so the audit trail lives in git history as well as the progress file.

### Failed commit

A failed commit is diagnosed and fixed within the current orchestration cycle before it is ever treated as blocking — it is not an automatic halt.

- **Diagnose first.** The orchestrator reads the actual error the commit emitted; never retry blind. What failed — a pre-commit hook, a lint or format check, a test, a commit-message linter, a missing sign-off — determines whether it is the cycle's to fix.
- **Fix in-authority causes as part of the current cycle.** When the cause sits inside the task's own footprint — a lint or format violation in the task's files, a hook that auto-modified files that now need re-staging, a test the task's own diff broke, a commit subject a message linter rejected — the orchestrator fixes it: re-staging hook-modified files itself, or dispatching a fresh implementer for a code-level fix that is then re-reviewed by the merged reviewer (as the baseline-gate clause requires). Then re-run the failed check and retry the commit.
- **Bounded retries.** Make at most 3 fix-and-retry attempts for the cycle. Past the cap, or when the cause is outside the task's authority (missing sign-off configuration, credentials, failures in files the task does not own, infrastructure errors), the run has hit an operational defect: the orchestrator appends this cycle's block to the run progress file with `Commit: none` (per `## Run workspace`) recording the diagnosis — the specific failure and what was tried, not a bare "commit failed" — and stops the entire run `BLOCKED` per `## Blocked`. Subsequent plan tasks are NOT attempted.
- **Guardrails (never traded for a green commit).** Never bypass hooks (`--no-verify` or any equivalent), never weaken, delete, or skip a check to make it pass, and never stash-and-retry. A fix addresses the real cause inside the task's footprint, or the cycle stops the run `BLOCKED`.
- **Audit trail.** The cycle's progress block and the commit body note that the commit failed N times and what was fixed, so the retries stay visible in the history.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The orchestrator does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the orchestrator made earlier in the same run. Subagents are also forbidden from history rewriting; the orchestrator's brief to each subagent names this constraint. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

The policy is judgment-based and surfaced via the factual progress block — not pre-clearance, not blanket permission.

- **Follow the plan.** The plan is the contract; the orchestrator dispatches one implementer per plan task in plan order. The implementer applies the task file's substeps. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If the plan task is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, the implementer applies the obvious correction and surfaces the deviation in its reply summary; the orchestrator captures the deviation in the cycle's factual progress block.
- **Surface deviations in the factual progress block.** Every deviation goes into the task's factual progress block (with the subagent audit) in the progress file and the commit body as a plain concern — no status token is assigned. Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the plan did not specify) are recorded with a one-sentence note and the run continues. A deviation that would require inventing genuine human intent — a structural choice the plan did not anticipate, a sub-step unsafe to apply blindly, a read of the observed code that conflicts with the plan task's input field — is never applied silently: finish what is safely derivable, then route the open decision per `## Blocked`.
- **Reviewer-surfaced deviations.** The merged reviewer may surface a deviation in either lane's findings — including a *plan-mandated* finding (the diff faithfully implements something the plan itself got wrong). The orchestrator weighs the finding against the fix-loop convergence: if a fresh implementer can address the finding, do so; if the finding is structural and no fix iteration would close it, the orchestrator finishes what is safely derivable and routes the required human decision per `## Blocked`. The orchestrator never silently accepts a plan-mandated defect and never patches the plan mid-run.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the orchestrator does NOT revise the plan as a side effect of this run — plan revision happens upstream. The orchestrator surfaces the finding, captures it in the implementation report, routes the required human decision per `## Blocked`, and stops the run. A **plan fault** (the plan is internally wrong but the spec is sound) is resolved by revising the living plan — re-running planning against the same source, or editing the plan in place as a living document — then handing the corrected plan back on a fresh run. A **spec fault** (the plan deviates because the spec is ambiguous or incomplete) routes to the human to fix the spec and recompile the plan from it, never a silent plan patch. Either way, resolving it is outside this run's mandate; surface it and stop.

## Immutability

Plan artifacts are IMMUTABLE. The orchestrator reads them READ-ONLY; the implementer subagent reads them READ-ONLY; the merged reviewer subagent reads them READ-ONLY. The plan is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

If during the orchestration cycle the implementer or the reviewer discovers that the plan is wrong (a plan task contradicts the observed code state, a plan task references a file that has been renamed, a plan task's verification block is built on a wrong assumption), the correct move is to surface the finding in the cycle's factual progress block as a concern (if the implementer routed around the issue and finished the task and both lanes passed), or to route the required human decision per `## Blocked` (if the issue is structural and the fix loop did not converge), and record it in the implementation report. The orchestrator does not revise the plan inside this run; plan revision happens upstream — the living plan is revised (re-run planning, or edit it in place as a living document) or its spec is fixed and the plan recompiled — and handed back on a fresh run.

What the subagents DO modify is source code (the implementer subagent) or the run's scratch files (the merged reviewer writes its `SS-review.md`; the implementer writes its `SS-implementer-outcome.md`), which live under the run's workspace directory per `## Run workspace`. The ORCHESTRATOR additionally updates the thread's singleton implementation report per `## Implementation report`. Neither the orchestrator nor any subagent creates new spec, proposal, plan, or decision-log artifacts inside this run; those require a separate authoring pass.
