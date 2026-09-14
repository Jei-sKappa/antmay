---
name: implement-plan-with-subagents
description: Execute a strict plan folder task by task through implementer and reviewer subagents, committing per task.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Implement Plan With Subagents

Orchestrate the autonomous, plan-driven, multi-subagent implementation of a strict plan folder. This skill is the orchestrator role: it does not write code itself — it gathers the thread's context, creates this invocation's implementation folder, walks the plan index's task list in order, dispatches an **implementer subagent** for each task, dispatches ONE **merged reviewer subagent** that loads both review method files and returns two lane verdicts (plan-compliance and code-quality) judged independently, respawns a NEW implementer subagent whenever either lane surfaces issues, re-reviews every fix before advancing, commits per orchestration cycle, appends every attempted task's factual progress block to the run's progress file (cycle-gated, not commit-gated), and writes the folder's report on the way out. It does not pause for clarifying questions at each step and does not ask before committing; the execution posture is identical whether or not a person is present. It does not rewrite history.

## Subagent Capability Precondition

**This skill REQUIRES subagent capability** (e.g., a runtime capability that lets the orchestrator spawn an independent subagent with its own context window and have it write files to disk before replying with an acknowledgment). The orchestrator role this skill defines is meaningful only when implementer and reviewer subagents are real, separate-context dispatches.

**This skill does NOT fall back to inline execution.** There is no "if subagents are unavailable, do it yourself" branch. The orchestrator does not write code in-session, does not run reviews in-session, and does not collapse the two subagent roles (implementer; merged reviewer) back into a single agent — that defeats the two-lane review separation and the fresh-context-per-fix discipline. Subagent topology is a precondition of this skill, not a feature toggle. If the runtime does not support subagents, stop and tell the user this run cannot proceed, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and `runtime does not support subagents`.

## No Worktree Isolation

The subagents this skill dispatches run sequentially on the SAME working tree as the orchestrator. This skill does NOT use `git worktree add` isolation, parallel-worktree topology, or separate per-subagent working directories. Each subagent's writes to the working tree are observable to the next subagent — the merged reviewer reads what the implementer just wrote; the next implementer (on a fix iteration) reads the previous implementer's diff and the reviewer's findings; the re-review reads the same post-fix state. Subagents run sequentially, on the same tree, in the order this skill's `## Procedure` defines.

No parallel implementer dispatch. No per-task worktree branch. The orchestration cycle (one task) ends with one commit on the current working tree; the next cycle starts from that committed state on the same tree.

## Inputs

The orchestrator gathers all of these before dispatching the first subagent; everything below works from what it gathers here.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the plan.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- The thread's `spec.md` — the thread's design truth, and what the implementation answers to.
- **The plan folder to execute** — the primary input and the artifact this run carries to code, in one of two accepted forms. When the invocation **names a folder** under `plans/`, that folder is the form; otherwise the form is the **newest folder under `plans/` by stamp**. It resolves to `plans/<folder>/plan.md` — the index, authoritative for task count and order — together with the `plan-tasks/NN-<kebab-slug>.md` brief each index entry points at. When the index's `Source:` line names an artifact other than the thread's `spec.md`, the orchestrator reads that artifact too: it holds the intent the plan was compiled from, and the orchestrator holds the intent while the subagents hold the mechanics.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer, which inside the thread takes precedence over the project records; these are the records the spec cites by stem.
- Every `implementations/*/report.md` whose `Plan:` line names that same plan folder — the record of what earlier passes over the plan already delivered; a task one of them records as completed is skipped once it is verified against the code.

The plan folder's shape is strict: an index named exactly `plan.md` at the folder root; a `plan-tasks/` folder beside it; a two-digit ordinal `NN` on every brief matching the index's ordered task list; and on every brief the per-task fields — Objective; Input / context; Steps / substeps; Files modified; Verification; Acceptance criteria — plus the two hand-off lines `Consumes:` (exact things this task uses from earlier tasks) and `Produces:` (exact things later tasks rely on), where `none` is a legal value for either. Each brief is directly dispatchable to an implementer subagent on its own. Every task is sequential, isolated, independently implementable, and independently reviewable, and the tasks run in index order. A plan folder that does not match this shape — a missing index, a `plan-tasks/` folder that disagrees with the index, a brief missing its mandatory fields — fails the mechanical pre-flight (`## Procedure`); the remedy is to correct the plan upstream, and the orchestrator infers no missing structure.

The invocation MAY carry a SPECIFIC plan task identifier alongside the plan reference (for example, "task 3" or "tasks 2 and 4"). When it does, the orchestrator runs the dispatch loop only for the named task(s); when it does not, it runs every task the index lists, in order.

If which input is meant is ambiguous — an invocation naming a plan folder that is not under `plans/`, or a plan reference with no clear referent — that is a preflight failure, not an in-run decision: refuse before dispatching anything, name the ambiguous reference and how to disambiguate it, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the ambiguous reference and how to re-invoke. Never silently pick by recency; the newest-by-stamp resolution applies only to an invocation that points at `plans/` without naming a folder.

## Implementation folder

Every invocation writes into its own new folder `implementations/<yymmddhhmm>[-<slug>]/` under the thread root, creating `implementations/` on demand. The stamp is the folder's creation time in UTC at minute resolution. Append `-<slug>`, a short kebab-case name for the implementation's purpose, when the invocation names one, or when a folder carrying that stamp already exists. The folder holds this run's `report.md` and its run state — the progress file and every subagent scratch file — under `.runs/`.

Every invocation allocates its own folder and is that folder's only writer; a folder an earlier invocation created is read, never written.

## Subagent return contracts (skill-local)

This orchestrator dispatches subagents, so it needs a fixed vocabulary to route each returned result quickly. These return tokens are LOCAL to this skill's subagent topology — they are untrusted routing inputs the orchestrator consumes to decide what to do next, NOT the run's terminal outcome and NOT a per-cycle status protocol. The only terminal outcome this skill emits is the run's closing line, emitted at the final step of `## Procedure` by following `<skill_path>/references/instructions/emit-terminal-outcome.md`. The tokens below never appear in the terminal outcome and are never promoted into a durable artifact as a status.

**Implementer reply tokens (untrusted claim).** The implementer subagent CLOSES its reply with exactly one uppercase token — `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`. This token is the implementer's self-report, not a verdict: the orchestrator validates each implementer reply against the working tree (`git status --porcelain`, `git diff`) and the outcome file read from disk before acting, and never trusts the reply's prose. What each validated token routes to:

- `DONE` / `DONE_WITH_CONCERNS` with a non-empty diff → proceed to the merged review dispatch; a `DONE_WITH_CONCERNS` token is factual concern input carried into the progress block.
- `DONE` with an empty diff → confirm the task's expected outcome ALREADY holds (run its verification block, else check the objective's post-conditions), record the cycle with `Commit: none`, and advance; an empty diff yields no commit.
- `BLOCKED` / `NEEDS_CONTEXT` → an untrusted terminal claim; the orchestrator FIRST confirms the blocker is real and MAY dispatch ONE fresh implementer when the claim looks like premature give-up. If it holds, route per `## Blocked` and stop the run; if the fresh implementer clears it, fall back into the positive path. A `NEEDS_CONTEXT` token that reflects genuinely missing human intent queues a decision bundle; an operational `BLOCKED` token ends the run with a diagnosis and no bundle.

**Reviewer lane tokens (untrusted, per lane).** The merged reviewer returns TWO named lane verdicts on every dispatch — a **plan-compliance** verdict and a **code-quality** verdict — each one of `PASS`, `ISSUES`, `BLOCKED`, or `NEEDS_CONTEXT`, judged strictly within its own lane with no cross-lane trust. A reply missing either verdict is not accepted — re-dispatch. The orchestrator validates each lane verdict against the review file the reviewer wrote (read from disk, not the reply prose):

- BOTH lanes `PASS` → the task passes review; proceed to commit. A lane `PASS` MAY still carry non-blocking concerns in the review file — those become factual concern input.
- EITHER lane `ISSUES` → enter the fix loop (`## Procedure` step 6c); an `ISSUES` verdict NEVER becomes a run `BLOCKED` directly.
- A rare lane `BLOCKED` / `NEEDS_CONTEXT` (a can't-assess escape) → the reviewer cannot assess the work; route per `## Blocked` as an operational halt and stop the run.

**Malformed or incomplete replies stay inside the dispatch loop.** A missing token, a missing lane verdict, or a reply that contradicts the working tree is handled by re-dispatching or by the orchestrator's own inspection of the working tree and the review file — it never surfaces in the terminal outcome. The run's terminal outcome is synthesized by the orchestrator from validated facts, independent of the reply vocabulary above.

## Factual progress records

Each attempted plan task is recorded as an ordinary factual progress block — plain prose or ordinary structured fields, never a status token (`## Subagent return contracts (skill-local)`).

One append-only block per attempted task is **appended to the run progress file** (see `## Run workspace`) and — for a committed cycle — carried in that task's commit message body minus its own SHA. Chat output shrinks to a one-line summary per task; the full block lives in the progress file. Because this skill dispatches subagents, each block records the subagent audit as facts. Each block records:

- **Task attempted** — which plan task (`NN`), named from the index.
- **Implementer reply tokens and dispatch count** — the token(s) the implementer subagent(s) returned for this cycle and how many implementer dispatches ran, recorded as facts.
- **Reviewer lane verdicts and fix-iteration counts** — the merged reviewer's final plan-compliance and code-quality verdicts and how many fix iterations ran per lane; the merged reviewer is ONE subagent, so one reviewer line carries both lanes.
- **Changes made** — what the diff did.
- **Verification** — the brief's verification block and any project gate actually run, and their results, including failures and justified skips.
- **Concerns** — non-blocking concerns to surface (a reviewer concern ridden on a lane `PASS`, an implementer assumption or known risk worth carrying, a judgment call, a deviation applied per `## Deviations`), verbatim, or `none`; resolved findings are counted, not restated.
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

**The orchestrator runs the dirty-worktree check** — NOT the implementer subagent. This skill runs on the current working tree and uses no `git worktree` isolation, so the worktree state is the FIRST safety preflight — checked ONCE at the very start of the run, before gathering the inputs and before spawning any subagent. The implementer subagent assumes a clean tree per the orchestrator's verification; reviewer subagents inspect `git diff` against the cycle's starting state and trust that the diff is the implementer's work, not pre-existing noise. The check is non-skippable and is not delegated to any subagent.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed to the rest of preflight.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), proceed only when the invocation carries advance authorization that explicitly acknowledges the existing changes will be preserved and may enter this skill's implementation commits. A bare instruction to ignore the dirty tree does not satisfy the gate.
4. Otherwise refuse immediately: write nothing, spawn no subagent, name the dirty paths, give the exact authorization needed to re-invoke, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and `worktree dirty (<dirty paths>); re-invoke with authorization acknowledging the existing changes will be preserved and may enter this skill's commits`. Do not ask, do not wait, do not auto-stash, do not auto-commit the pre-existing changes.

When authorization is present, the pre-existing dirty changes are unavoidably picked up by the first `git commit` the orchestrator makes once staged; the authorization is consent to that outcome. Subagents share that working tree per the no-worktree-isolation rule above.

## Procedure

Steps 1–3 are preflight. They complete in full — with no thread artifact written, no implementation folder allocated, no project file edited, no subagent dispatched, and no commit made — before execution begins at step 4. Any preflight failure follows `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the reason and how to re-invoke, and writes nothing.

1. **Safety preflight: dirty worktree.** Per `## Dirty Worktree Handling`, the orchestrator runs this check first. On a dirty tree without valid advance authorization, refuse now — write nothing, spawn no subagent, name the dirty paths, give the exact re-invocation authorization, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`. Do not ask, do not wait.

2. **Gather the inputs.** The orchestrator reads everything under `## Inputs` now, in that order, READ-ONLY. The index is read in full here; the `plan-tasks/` briefs are read LAZILY — a brief's `Files modified` list is read at staging time, and a judgment call MAY open a brief on demand, while the dispatched subagents read the brief they are handed. If several plausible plan folders match the reference, that is a preflight failure — refuse per `## Inputs` rather than picking by recency.

3. **Run the mechanical pre-flight and verify required tooling.** Confirm the plan folder matches the strict shape `## Inputs` defines: (a) every task-list entry in the index resolves to an existing file under `plan-tasks/`; (b) every file under `plan-tasks/` is listed in the index; (c) the ordinals are contiguous and match the filenames. If any check fails, follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and `malformed plan folder: <mismatch>` before any subagent is dispatched — the remedy is correcting the plan upstream, and the orchestrator does not repair the folder. Also confirm any tooling and credentials the run explicitly requires are present; a missing required tool or credential caught here is likewise a preflight refusal. If the invocation named a task identifier, narrow the run to that subset of the index's task list; otherwise execute every task the index lists, in order.

4. **Allocate the implementation folder.** Preflight has passed; create this invocation's folder per `## Implementation folder`, allocate its run workspace per `## Run workspace`, and record the task list to execute and its state in `progress.md` so progress stays legible. Do not dispatch any subagent until the folder and its workspace exist.

5. **Honour the earlier reports of the same plan.** Take the reports gathered per `## Inputs` — every `implementations/*/report.md` whose `Plan:` line names this plan folder — and mark as already done each plan task they record as completed, verifying against the code that the change is actually in place before skipping it. A task a report claims but the code does not carry is dispatched normally in this run; note the discrepancy in its factual progress block. Record which tasks were skipped and why in `progress.md`.

6. **For each plan task still to do, IN ORDER — the orchestration cycle:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first". Subagents within a cycle run sequentially on the same working tree per `## No Worktree Isolation`. The orchestrator pre-computes this cycle's scratch paths per `## Run workspace` — the two-digit dispatch ordinal `SS` is shared across roles and assigned at dispatch time — so every brief carries exact paths.)

   a. **Spawn the implementer subagent** with a self-contained brief from `## Subagent Briefs`. Pass the current task's brief path (`plans/<folder>/plan-tasks/NN-<kebab-slug>.md`) + the index path + the thread's `spec.md` and `adr/` as the constraint sources + (on a fix iteration) the findings-file path + the pre-computed outcome-file path the implementer is to use IF it writes one. The dispatch brief states that nothing else *from the plan* is to be read, and affirmatively grants on-demand reading of the artifact the index's `Source:` line names when the task brief and index leave a question open. Wait for the implementer to return. The implementer writes code changes directly to the working tree, lists the paths of modified files, and — only when there is diff-blind content to persist — writes ONE outcome file at the named path and cites it in the reply. It CLOSES its reply with ONE uppercase implementer reply token plus a 1–3 sentence summary. The orchestrator inspects the working tree itself (`git status --porcelain`, `git diff`) and reads the outcome file from disk when present, rather than trusting the reply's prose — the working tree is the completion signal; the token and the outcome file are untrusted routing inputs the orchestrator validates. If an outcome file is present, carry forward its `Assumptions` / `Known risks` for injection — unclassified — into the merged reviewer brief of THIS dispatch's review pass (step b).

   **Gate on the implementer reply token per `## Subagent return contracts (skill-local)`**, which owns which validated token drives which action. Two operational nuances that routing depends on and the section does not repeat:
   - **Empty-diff `DONE`** — do NOT route the empty diff to the diff-centric review lanes; answering "does the diff implement the task," they would read the empty diff as `MISSING` and misfire the fix loop. Confirm instead that the task's expected outcome ALREADY holds against the working tree — run the task's verification block if it has one, else check the objective's post-conditions; the confirmation mechanism is the orchestrator's judgment.
   - **Terminal `BLOCKED` / `NEEDS_CONTEXT`** — do NOT run the reviewer on incomplete work. The orchestrator MAY dispatch ONE fresh implementer when the token looks like premature give-up rather than true impossibility; the sanity-check heuristic is its judgment. If the fresh implementer clears it, fall back into the positive path; otherwise route per `## Blocked` and stop.

   Each non-committing branch appends this cycle's factual progress block with `Commit: none` (per `## Run workspace`) before advancing or stopping.

   b. **Spawn the merged reviewer subagent.** ONE reviewer subagent per review pass. Use a self-contained brief from `## Subagent Briefs` that loads BOTH method-file paths — `<skill_path>/references/plan-compliance-reviewer.md` and `<skill_path>/references/code-quality-reviewer.md` — together with the shared lane policy `<skill_path>/references/reviewer-policy.md`, resolved relative to this skill's directory (absolute paths computed by the orchestrator), and passes the current task's brief path, the index path, and the thread's `spec.md` and `adr/` as the constraint sources. Inject — unclassified — any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch so the reviewer assesses them within whichever lane they fall. The reviewer inspects the diff itself (`git diff` from the cycle's starting commit, or file-by-file) and returns BOTH verdicts SEPARATELY in its reply — a **plan-compliance** verdict and a **code-quality** verdict, each named per lane, each one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, each judged strictly within its own lane with no cross-lane trust. A reply missing either verdict is NOT accepted — re-dispatch. The reviewer writes ONE `SS-review.md` file (containing both lanes' sections) at the pre-computed scratch path ONLY when there is content — any lane `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, a lane `PASS` carrying non-blocking concerns, or an out-of-task observation; a both-lanes-clean pass with nothing to report writes no file. Wait for the reviewer to return; read the review file from disk when one was written, and do not trust the reply's prose. Route the two lane verdicts per `## Subagent return contracts (skill-local)` — both clean advances to the commit (step d); either lane's `ISSUES` enters the fix loop (step c); a rare lane `BLOCKED` / `NEEDS_CONTEXT` can't-assess escape appends this cycle's block with `Commit: none` (per `## Run workspace`) and routes per `## Blocked` as an operational halt that stops the run.

   c. **If EITHER lane returned `ISSUES`**, enter the fix loop. Spawn a NEW implementer subagent — always respawn a fresh implementer for the fix; the original implementer's context is gone. Include in the fix brief: the task's brief path + the index path + the constraint sources, the findings file (path to the `SS-review.md` under this implementation folder's `.runs/`), the next pre-computed outcome-file path the fix implementer is to use IF it writes one, and a clear directive that the fix MUST address the surfaced issues without re-introducing prior reviewer-approved behavior. Wait for the fix implementer to return. RE-REVIEW the fix — spawn a NEW merged reviewer subagent with a fresh brief that points at the new diff and loads BOTH method files and the shared lane policy again; it returns BOTH lane verdicts (the diff changed, so BOTH lanes are re-judged). Because the fix implementer is a fresh dispatch, carry its assumptions forward exactly as in step a — if it wrote its own outcome file, inject its `Assumptions` / `Known risks` (unclassified) into THIS re-review's brief. The orchestrator tracks fix iterations **per verdict lane**. Loop the fix-and-re-review pattern until BOTH lanes PASS. Each iteration costs one implementer + one merged reviewer subagent. A lane `ISSUES` NEVER becomes a `BLOCKED` outcome directly — it drives this fix loop; the SOLE fix-loop exit to `BLOCKED` is demonstrated non-convergence. If the loop fails to close (the reviewer keeps surfacing the same or escalating issues across iterations and the orchestrator's audit shows the fix loop is not converging), the run has hit an operational defect: the orchestrator appends this cycle's block with `Commit: none` (per `## Run workspace`) describing the loop state, and stops the run `BLOCKED` per `## Blocked` with no decision bundle.

   d. **The orchestrator commits per `## Commit Policy`.** Commit cadence is per orchestration cycle — one commit per task after BOTH lane verdicts are clean. The orchestrator stages the task's files (the brief's `Files modified` list is authoritative) and runs the commit itself. The implementer subagent does not commit; the reviewer subagent does not commit. If the commit succeeds, capture the SHA + subject. If the commit fails, follow the failed-commit branch in `## Commit Policy` — diagnose and fix in-authority causes within the retry cap; only when it cannot be resolved does the run hit an operational defect: append this cycle's block with `Commit: none` (per `## Run workspace`) recording the diagnosis, and stop the entire run `BLOCKED` per `## Blocked`.

   e. **Append the committed cycle's factual progress block to the run progress file.** The progress-file append is cycle-gated, not commit-gated (per `## Run workspace`): this committed-cycle case appends its block once its commit lands, while the non-committing cycles (empty-diff `DONE` in step a, the terminal exits in steps a–d, and the failed-commit branch of `## Commit Policy`) each append their own block with `Commit: none` at the point they advance or stop. Record the cycle's facts in the block shape `## Factual progress records` defines. The orchestrator MAY escalate a non-blocking concern into a fix, but NEVER silently downgrades a blocking finding into a concern. Emit ONE chat line for the task (e.g. `Task 04: done, commit abc1234`); the full block lives in the progress file and the commit message body.

7. **Write the report.** Once every plan task has run (or the run was halted per `## Blocked`), the ORCHESTRATOR writes this folder's report per `## Implementation report` — folded from the progress file re-read from disk, together with the git history; it is NOT delegated to a subagent.

8. **Final out-message.** Emit a final summary folding every attempted plan task from the progress file re-read from disk — each named with its factual cycle block, the per-task subagent audit, and the commit SHA + subject for each commit made — plus the tasks skipped because an earlier report already carried them and the path of the report just written. Name any parent-level discovery surfaced per `## Discoveries`. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `<report path>` when the requested work completed (including completion with non-blocking concerns), with `<diagnosis or bundle path>` as the reason when substantive execution began but the run halted (a missing-intent bundle per `## Blocked`, a non-converging fix loop, a reviewer can't-assess escape, or a failed commit past the retry cap), and with `<reason>` when preflight prevented execution (steps 1–3).

## Run workspace

Keep all subagent scratch and operational progress for a run inside this invocation's implementation folder:

```text
implementations/<yymmddhhmm>[-<slug>]/.runs/
├── progress.md                 # the run progress file (see below)
└── task-NN/                    # NN = the plan's task ordinal, matching plan-tasks/NN-<slug>.md
    ├── 01-implementer-outcome.md
    ├── 02-review.md
    └── …                       # SS = two-digit dispatch ordinal within the task, shared across roles
```

Create `.runs/` inside the folder allocated per `## Implementation folder`. Recovery within an invocation, after a compaction or any other loss of context, reads only this folder's own `.runs/` together with `git log`, and never relies on conversation recollection.

`.runs/` is operational, not durable: no durable artifact — not the report, not a commit message — ever references a path inside it. Anything a durable record needs (a concern, a deviation, a finding) is COPIED into that record, never referenced by a run-state path. The folder remains in place after the run as the run's operational trace.

- **`task-NN/`** matches the plan's task ordinal (`plan-tasks/NN-<slug>.md`).
- **`SS` is the two-digit dispatch ordinal within the task, shared across roles**, assigned by the orchestrator AT DISPATCH TIME so every brief carries exact, pre-computed paths. The task's first dispatch is `01`, the next `02`, and so on across BOTH implementer and reviewer dispatches. After a recovery within the invocation, the next `SS` is max-existing + 1. Because the files are conditional (below), gaps in the `SS` sequence are normal — NEVER renumber existing files to close them.
- **Write-once.** Every dispatch writes to a NEW file; never overwrite or append a prior dispatch's file. The implementer writes `SS-implementer-outcome.md` only when there is diff-blind content to persist; the merged reviewer writes ONE `SS-review.md` (both lane sections) only when there is content; a clean pass with no concerns writes no file.

**The progress file.** The per-task factual progress block lives in the durable-within-the-run progress file at `.runs/progress.md`. It is the run's working memory: it survives context compaction within a run.

- **Append-only, one block per attempted task — cycle-gated, not commit-gated.** Every orchestration cycle that reaches an outcome appends exactly one block (shape in `## Factual progress records`): a committed cycle appends its block once its commit lands; an empty-diff `DONE` cycle and a halted cycle (a routed terminal token, a reviewer can't-assess escape, a non-converging fix loop, or a failed commit) append their block with `Commit: none` before advancing or stopping. A pre-flight halt appends nothing — no task cycle ever started. The progress file is never rewritten or reordered.
- **Block content:** the field set and block shape are defined once in `## Factual progress records`.
- **The commit message body carries the same block** for committed cycles, omitting the SHA of the commit itself (it is not known until the commit lands); a non-committing cycle has no commit body, so its block lives only in the progress file.
- **Chat shrinks to one line per task** (e.g. `Task 04: done, commit abc1234`); the full block lives in the progress file and the commit body.
- **Compaction recovery.** The progress file + `git log` are the run's resume state. If context was compacted mid-run, re-read `progress.md` and `git log` to recover where the run stands. The report is folded from the progress file RE-READ from disk at the end.

## Implementation report

At every terminal outcome an executing run reaches — every plan task completed, a partial run, a `BLOCKED` halt, or a no-op where the requested state already held — the ORCHESTRATOR follows `<skill_path>/references/instructions/write-implementation-report.md` once, drawing the outcome material from `progress.md` re-read from disk, and the deviations per `## Deviations`.

The orchestrator supplies this material itself; it is not delegated to a subagent, and no subagent reply is loaded as the report's content.

The per-task reviews this run performs are deliberately task-scoped gates — each checks one task's diff against that task, not the change as a whole — and the implementation is expected to receive a broader review afterward, so write this report to be that review's starting point. Pull the deviations from the concerns fields of the factual progress blocks, together with the assumptions and known risks the implementer subagents surfaced in their outcome files and the deviations the reviewer flagged in either lane.

## Deviations

The policy is judgment-based and surfaced through the factual progress block and the report — not pre-clearance, not blanket permission.

- **Follow the plan.** The plan is the contract; the orchestrator dispatches one implementer per plan task in index order, and the implementer applies the brief's substeps. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If a brief is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, the implementer applies the obvious correction and surfaces the deviation in its reply summary; the orchestrator captures it in the cycle's factual progress block.
- **A deviation that stays within accepted intent proceeds, and is recorded.** It goes into the task's factual progress block (with the subagent audit) as it happens, and into the report's `## Deviations`, one entry naming what was built, the spec section or ADR stem it departs from, and why. Minor deviations (a missing import added, a `Map` chosen where the brief named no structure) carry a one-sentence entry and the run continues. This run is autonomous; it does not stop to pre-clear a judgment call, and the progress block and the report are where the user reads the trail.
- **A contradiction of a thread ADR or of a spec decision is a change of intent, and is never applied.** Finish everything safely derivable without it, then route it per `## Blocked`: the run ends `BLOCKED` once the report is written.
- **Reviewer-surfaced deviations.** The merged reviewer may surface a deviation in either lane's findings — including a *plan-mandated* finding (the diff faithfully implements something the plan itself got wrong). The orchestrator weighs the finding against the fix-loop convergence: if a fresh implementer can address the finding, do so; if the finding is structural and no fix iteration would close it, the orchestrator finishes what is safely derivable and routes the required human decision per `## Blocked`. The orchestrator never silently accepts a plan-mandated defect.
- **A fault in the plan is surfaced, never patched.** If a task contradicts the observed code, rests on a wrong premise, or names a target that has gone, the orchestrator records it in the cycle's factual progress block and in the report and routes the required human decision per `## Blocked`. Correcting the plan happens upstream, per `## Immutability`.

## Discoveries

**A discovery with parent- or sibling-level impact** — something that would change a project decision, or that belongs to a direction wider than this thread — is a proposed ADR or a proposed roadmap entry. The orchestrator surfaces it to the user in chat and carries it into the report's follow-ups. Proposing it is the whole action.

**Write boundary.** This run writes the project's code, tests, configuration, and living documentation within this implementation's scope (through the implementer subagents), and this invocation's implementation folder with its `report.md` and its `.runs/`. Nothing else it touches is written — `spec.md`, `docs/adr/`, `docs/glossary.md`, the thread's `adr/`, `glossary.md`, and `plans/`, other implementation folders, and any other thread are read here and never written.

## Blocked

Three situations stop the run once substantive execution has begun (step 4 onward), and all three end `BLOCKED`. None is reachable from preflight — a dirty-tree, plan-resolution, mechanical, or tooling failure caught in steps 1–3 is a `REFUSED`, not this path. Distinguish a genuine missing-intent question, a change of intent, and an operational defect before choosing between them.

**Missing human intent.** This applies whenever completing a plan task requires a genuine human decision the run cannot settle on its own from the gathered inputs and the observed code state (an implementer `NEEDS_CONTEXT` token the orchestrator validated as genuinely missing intent). Per the run's autonomous posture, do not invent the intent and do not stall waiting in chat.

**A change of intent.** This applies to a contradiction of a thread ADR or of a spec decision, per `## Deviations`. An unnoticed conflict between the implementation's material and a project ADR or a project glossary term is the same situation: classify it as `/consult-adrs` instructs, and route it here rather than overriding the project record.

Both take the same route. First finish everything the run can safely derive without the decision, then the orchestrator writes the report per `## Implementation report` reflecting the blocked outcome, and follows `<skill_path>/references/instructions/emit-pending-decisions.md` with itself as the producer, this invocation's implementation folder's `report.md` as the target, and the originating user request. Then stop with a concise notification naming where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`.

**Operational defect.** An unfixable in-run failure the run cannot repair on its own — an implementer `BLOCKED` token confirming a real operational impossibility, a reviewer can't-assess escape (a lane `BLOCKED` / `NEEDS_CONTEXT`), a non-converging fix loop, an exhausted commit retry (per `### Failed commit`), an inaccessible external dependency, or a runtime failure — ends the run `BLOCKED` with a diagnosis and NO decision bundle. Finish any safe work first, write the report per `## Implementation report`, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and the diagnosis. A structural plan mismatch that the mechanical preflight catches remains a preflight `REFUSED`, not this path.

## Subagent Briefs

Each dispatched agent gets a self-contained brief. The orchestrator never inherits the agent's session and never loads the agent's output back into its own context. Each brief contains: scope, input paths, output path, return contract, and hard constraints. The orchestrator reads files the subagent wrote (the working tree, the review output file under this implementation folder's `.runs/`); the reply is acknowledgment only. The orchestrator pre-computes every brief's exact scratch paths up front (per `## Run workspace`), so each brief carries write-once, pre-assigned paths.

### Brief-construction rules

The orchestrator writes the briefs, and a badly-shaped brief biases the review. A reviewer brief must NEVER pre-rate a finding's severity, exclude a category of findings, or declare a question already settled. Red-flag phrasings to keep OUT of any reviewer brief:

- "do not flag …" / "ignore …" — excluding a category of findings the reviewer is supposed to weigh.
- "at most minor …" / "this is low-severity" — pre-rating severity the reviewer is supposed to judge.
- "already decided" / "the plan chose X, so don't question it" — declaring a question settled.

The ONLY content the orchestrator injects into a reviewer brief beyond paths and scope is the implementer's surfaced `Assumptions` / `Known risks`, and it injects them **unclassified** — handed over as things to assess, never pre-judged as fine or as problems. That unclassified injection is the pattern every brief follows: give the reviewer the material and let it reach its own verdict.

### Reply shape and cap

Every subagent reply is acknowledgment only and uses a fixed short shape under a HARD CEILING of 15 lines:

- routing token(s) — the implementer's single reply token, or the merged reviewer's two named lane verdicts (skill-local, untrusted, per `## Subagent return contracts (skill-local)`);
- files touched;
- one-line verification result;
- a concerns flag (whether diff-blind concerns were written);
- the scratch-file path IF one was written.

Replies never paste the diff or the review body back — the orchestrator reads those from the working tree and the run-state file.

### Implementer subagent

- **Scope** — the current orchestration cycle's context: the current task's brief path (`plans/<folder>/plan-tasks/NN-<kebab-slug>.md`) and the index path (`plans/<folder>/plan.md`). On a fix iteration, also the reviewer's findings (path to the `SS-review.md` under this implementation folder's `.runs/`). Nothing else *from the plan* is to be read; the thread's `spec.md` and `adr/` are the constraint sources the work answers to, and the artifact the index's `Source:` line names is readable context to consult on demand when the task brief and index leave a question open.
- **Input paths** — the task brief path and the index path (both READ-ONLY); the thread's `spec.md` and `adr/` as the constraint sources (READ-ONLY); on fix iterations, the prior `SS-review.md` findings file (READ-ONLY); the artifact the index's `Source:` line names is readable context (READ-ONLY) when a question is left open.
- **Output path** — the implementer writes code changes DIRECTLY to the working tree at the file paths the task brief's `Files modified` list names; the working tree IS the primary output. ADDITIONALLY, ONLY when there is diff-blind content to persist (assumptions, blockers / open questions, deliberately-skipped validation, known risks), the implementer writes ONE outcome file at the orchestrator-named, pre-computed path — `implementations/<yymmddhhmm>[-<slug>]/.runs/task-NN/SS-implementer-outcome.md` (the orchestrator names it in this brief; write-once; fix-loop dispatches get a fresh `SS`). A plain `DONE` with nothing to flag writes NO file — the reply alone carries the signal.
- **Return contract — reply token (skill-local, untrusted).** The reply uses the fixed shape under the 15-line cap (`### Reply shape and cap`): the paths of modified files and — when an outcome file was written — that file's path, CLOSING with EXACTLY ONE uppercase token from this skill's implementer reply vocabulary — `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` — plus a 1–3 sentence summary. This token is a skill-local, untrusted routing input the orchestrator validates against the working tree (`## Subagent return contracts (skill-local)`); there is no other token. A task found ALREADY satisfied (empty diff) is reported `DONE` with a note stating no change was needed and why — there is no separate no-op token. Before claiming `DONE`, run the project's standing required gates on your changes (per the baseline-gate clause in `## Commit Policy`; a project may define none) and resolve failures, recording any such runs in the outcome file's `Validation` `Ran` bucket. A discovery with parent- or sibling-level impact is returned in the reply for the orchestrator to record. Do NOT paste the diff back. Do NOT commit (the orchestrator commits per `## Commit Policy`). Do NOT run `git commit`, `git add` outside of standard staging, or any history-rewriting operation.
- **Outcome-file content (when written).** The file carries the core fields `Status`, `Summary`, `Assumptions`, `Blockers & open questions`, and the optional fields `Validation` and `Known risks` only where they apply. It contains NO modified-files list and NO requirements-addressed list — the working tree and the plan already carry those. When `Validation` is present it carries ONLY a `Ran` bucket (checks performed BEYOND the plan task's verification block, with their results) and a `Not run` bucket (deliberately-skipped checks, with reasons); it NEVER restates the plan's prescribed verification. Match the pinned heading, the greppable `Status:` line, and the fixed section order exactly; OMIT empty optional sections rather than writing them as "none". The file is Markdown with NO YAML frontmatter.
- **Hard constraints** — do NOT modify the plan folder (it is immutable — read-only); stay within the working tree and the named outcome path; do NOT commit; do NOT rewrite history; do NOT spawn further subagents; do NOT use `git worktree`; on a fix iteration, do NOT re-introduce behavior the prior reviewer approved while addressing the new findings.

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
- **Input paths** — the task brief path and the index path (both READ-ONLY); the thread's `spec.md` and `adr/` as the constraint sources (READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection of the modified paths — on a fix re-review the diff reflects the original work plus the fix iterations); BOTH method references — `<skill_path>/references/plan-compliance-reviewer.md` and `<skill_path>/references/code-quality-reviewer.md` — and the shared lane policy `<skill_path>/references/reviewer-policy.md`, resolved relative to this skill's directory (absolute paths computed by the orchestrator). The repo is readable context, and the artifact the index's `Source:` line names may be consulted on demand.
- **Output path** — ONE `SS-review.md` at the pre-computed scratch path `implementations/<yymmddhhmm>[-<slug>]/.runs/task-NN/SS-review.md`, containing one section per lane. The reviewer writes it ONLY when there is content — any lane `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, a lane `PASS` carrying non-blocking concerns, or an out-of-task observation; a both-lanes-clean pass with nothing to report writes no file. Write-once — never overwrite or append a prior dispatch's file.
- **Return contract (skill-local, untrusted).** Return BOTH lane verdicts on EVERY dispatch, using the fixed reply shape under the 15-line cap (`### Reply shape and cap`): a named **plan-compliance** verdict and a named **code-quality** verdict, each one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`; a reply missing either verdict is not accepted. These are skill-local routing inputs the orchestrator validates against the review file (`## Subagent return contracts (skill-local)`). When a review file was written, name its path. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan folder; read `git diff` and source code but ONLY produce findings; do NOT run tests beyond what the task brief's verification block prescribes (running the prescribed verification is in scope and expected); do NOT commit.

## Commit Policy

The orchestrator commits.

- **Cadence:** ONE commit **per orchestration cycle** — one commit per plan task after BOTH lane verdicts (plan-compliance and code-quality) are clean. The boundary is the orchestration cycle; subagents within the cycle do NOT commit. The orchestrator stages and commits the task's files: the brief's `Files modified` list is authoritative.
- **Baseline gate (before each commit):** A brief's verification block is task-specific — it confirms THAT task's objective, and it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the brief's verification and this clause is a no-op. When the project DOES define standing gates, the orchestrator confirms they pass on the changed code BEFORE committing the cycle — independent of, and even when omitted by, the brief's verification block. The orchestrator does not write code, so a standing-gate failure is routed through the fix loop: spawn a fresh implementer to resolve it, then — because that fix is a NEW code change the reviewer has not seen — re-run the merged reviewer on the fix (both lane verdicts again) before re-confirming the gate, so nothing reaches the commit that skipped a review. Only then commit. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this cycle. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.
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

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The orchestrator does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase in any form, does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote), and does not delete commits the orchestrator made earlier in the same run. Subagents are also forbidden from history rewriting; the orchestrator's brief to each subagent names this constraint. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Immutability

The plan folder is IMMUTABLE. The orchestrator reads it READ-ONLY; the implementer subagent reads it READ-ONLY; the merged reviewer subagent reads it READ-ONLY. Nothing inside it is edited in place — not for typo fixes, not to add a missing acceptance criterion, not to mark tasks as done, not for any reason. Implementation output goes to source code and to this invocation's implementation folder, per the write boundary in `## Discoveries`.

When the plan itself needs revision — a task contradicts the observed code state, a task references a file that has been renamed, a task's verification block rests on a wrong assumption — this run's mandate is to surface the fault and stop, per `## Deviations`. A **spec fault** (the plan faithfully implements an ambiguous or incomplete spec) is fixed by amending the spec and writing a fresh plan from it. A **plan fault** (the plan is wrong while the spec is sound) is fixed by running the plan check against the plan folder, or by writing a fresh plan. Either way the corrected plan is handed to a fresh run.
