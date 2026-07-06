---
name: implement-plan
description: Execute a structured multi-file plan artifact end-to-end on the current working tree, reading the index then each task file in order, self-reviewing after each task, and auto-committing per task; use when a plan needs to be carried to working code in a single agent.
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.0.0
---

# Implement Plan

Execute a plan artifact end-to-end on the current working tree. This skill reads the plan artifact READ-ONLY, reads the plan index, walks its task files in plan order, implements each task, self-reviews after each task, auto-commits per plan task, records a four-state status per plan task in a durable run ledger, and emits a single immutable **implementation report** record on the way out. By default it does not pause for clarifying questions at each step or ask before committing, but it honors an invocation that asks it to check in or work through the tasks interactively; it does not rewrite history.

This skill is SINGLE-AGENT. The current session is the implementer; the same session runs the self-review pass after each plan task. No subagents are spawned — there is no implementer/reviewer separation, no orchestrator role distinct from the implementer role. The self-review pass after each task is the only review layer in this topology.

## Inputs

This skill accepts a plan artifact. The plan is a **multi-file** lineage folder under a structured thread folder:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/plans/NNN[-<desc>]/
├── plan.md                 # the index
└── tasks/
    ├── 01-<kebab-slug>.md
    ├── 02-<kebab-slug>.md
    └── …
```

The whole folder is the plan artifact. `plan.md` is the **index**: it carries the plan-level objective and context, a `Source:` line naming the upstream artifact the plan was compiled from (a thread-relative pointer, a repo-relative path, an issue URL, or `none — raw prompt`), a Global Constraints block, and an **ordered task list** that is authoritative for task count and order. Each `tasks/NN-<kebab-slug>.md` file is one task, carrying the six mandatory fields — Objective; Input / context; Steps / substeps; Files modified; Verification; Acceptance criteria — plus two hand-off lines, `Consumes:` (what this task uses from earlier tasks) and `Produces:` (what later tasks rely on), where `none` is a legal value for either. Every task must be **sequential, isolated, independently implementable, and independently reviewable**, and the tasks are executed in index order.

`NNN` is a zero-padded 3-digit lineage sequence starting at `001`; `NN` is a two-digit task ordinal matching the index's task list. The lineage folder is the stable identifier and the unit of reference; neither `plan.md` nor the task files carry a UTC stamp or `v<N>`. The user MAY pass either the lineage folder path or the index path — both resolve to the same artifact.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the skill executes only the named task(s); when omitted, the skill executes every task in the index in order. Even when only one task is named, the rule still applies — read the plan READ-ONLY, run the task, self-review, commit per `## Commit Policy`, and record the four-state status.

If the input is ambiguous — the thread holds multiple plan lineages (`plans/001/` and `plans/002-cli/`) and the user named "the plan" without a specific path, or the reference matches multiple lineages — ASK the user which plan lineage is intended. There is no global "latest plan" algorithm. Do not silently pick by recency, by highest `NNN`, or by sort order. (There is exactly one index per lineage; competing drafts never become emitted siblings — they live in `.wip/`.)

A plan that does not match this shape — a missing index, a `tasks/` folder that disagrees with the index, a task file missing its mandatory fields — fails the mechanical pre-flight (`## Workflow`). The remedy is to recompile the plan from its source, not to tolerate the mismatched shape.

## Four-State Status Protocol

Every task report carries one of FOUR statuses. The states are named exactly as listed below; downstream consumers match against these tokens. Use the names verbatim.

- The state DONE — `DONE` — means the plan task was completed and the implementer has no concerns to surface. The objective and acceptance criteria are met, the self-review pass found nothing to flag, the task file's verification block passes mechanically, and the project's standing required gates — if the project defines any (see `## Commit Policy`) — pass on the changed code. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the plan task was completed but the implementer has at least one concern to surface: partial test coverage, a code smell that did not warrant blocking the task, an ambiguous plan area the implementer made a judgment call on, a possible-but-unverified edge case, a minor deviation from the plan that the implementer applied per `## Plan Deviation Policy`. The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the plan task could not be completed. Includes failed commits (see `## Commit Policy`), missing dependencies, inaccessible files, contradictory plan tasks, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent plan tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the plan task cannot proceed without information the implementer does not have. Includes "user clarification needed", "access to file outside repo needed", "external system credentials needed", "the plan task contradicts the observed code state and the implementer cannot pick the right side without input". `NEEDS_CONTEXT` is distinct from `BLOCKED`: a `BLOCKED` task hit a hard error during execution; a `NEEDS_CONTEXT` task did not start because the missing input was a precondition.

### Task report block shape

The four-state status is captured as a structured block **appended to the run ledger** (see `## Run Progress Ledger`), and — for a committed cycle — carried in that task's commit message body **minus its own SHA** (the commit body is composed before the commit lands, so the cycle's own SHA is not yet known; it is present only in the ledger, appended post-commit). Chat output carries only a one-line summary per task; the full block lives in the ledger, not a per-task artifact file. The ledger and the git history together are the audit trail.

Suggested block format (exact wording is at the implementer's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 5–10 line range):

```
Task <NN> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Notes: <1–3 sentences explaining the rationale or surfaced concerns.>
Deviations: <deviations applied per ## Plan Deviation Policy, or "none".>
Concerns: <unresolved concerns verbatim, or "none".>
Commit: <SHA + subject, or "none">   # committed cycles: SHA + subject present in the ledger, omitted from the commit body; non-committing cycles: none
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The one-line chat summary per task names the verified status and the commit (e.g. `Task 04: verified DONE, commit abc1234`). The final out-message summarizes EVERY plan task by its four-state status, plus the commit SHA + subject for every commit made during the run. This is the implementation audit trail; the user reads it to understand what the plan accomplished and what to do next.

## Run Progress Ledger

Every attempted task appends exactly one block to a durable run ledger. The ledger is the authoritative in-flight record; chat carries only a one-line summary per task, and the commit message body carries the same block for committed cycles — omitting the cycle's own SHA, which is not known until the commit lands, so that SHA is present only in the ledger.

**Where it lives.** The ledger is a single file under the thread's gitignored `.wip/`:

```text
docs/threads/<thread>/.wip/implement/plans-NNN[-<desc>]/progress.md
```

The folder name mirrors the FULL plan lineage folder name (`plans/001-cli/` → `plans-001-cli`). No other file lives in this layout — this single-agent skill dispatches nothing, so there are no per-dispatch scratch files, only `progress.md`.

**Append discipline (cycle-gated, not commit-gated).** Here a cycle is the work of one plan task. The ledger is append-only: **one block per attempted task**. Every cycle that reaches a verified outcome appends exactly one block — a committed cycle appends its block once the commit lands (carrying that commit's SHA + subject); an empty-diff `DONE`, a `BLOCKED`, or a `NEEDS_CONTEXT` cycle that produces no commit appends its block with `Commit: none` before advancing or stopping. A pre-flight halt appends nothing — no cycle started.

**Block content.** Because this single-agent topology spawns no subagents and dispatches nothing, the block carries NO subagent-audit lines. Each block records:

- the task's verified four-state status — claimed status equals verified status here, since the same session implements and self-reviews, so there is a single verified status line;
- deviations applied, per `## Plan Deviation Policy`;
- unresolved concerns, verbatim (resolved findings are not restated);
- the commit SHA + subject for a committed cycle, else `Commit: none`;
- brief notes.

**Durability rule.** `.wip/` is disposable, so no durable artifact (a commit message, the implementation report) may point INTO it — anything a durable record needs is copied into that record.

**Compaction recovery.** The ledger file plus `git log` are the resume state after a context compaction — never conversation recollection. The implementation report is folded from the ledger re-read from disk at the end of the run, not from memory.

## Dirty Worktree Handling

This skill owns the dirty-worktree check. The check is non-skippable. Run it ONCE at the start of the run, BEFORE reading the plan artifact.

1. Inspect the worktree (`git status --porcelain` or equivalent).
2. If clean, proceed silently to the plan-resolution step.
3. If dirty (any untracked, unstaged, or staged-but-uncommitted changes), ASK the user: "The worktree has uncommitted changes — `<short summary of the dirty paths>`. Continue (and let the uncommitted changes be picked up by the next commit this skill makes) or abort?". Wait for the user's answer. Do NOT pick silently. Do NOT auto-stash, do NOT auto-commit the pre-existing changes, do NOT abort silently.

If the user says continue, the pre-existing dirty changes WILL be folded into the first commit this skill makes (they are unavoidably picked up by `git commit` once staged). The user is consenting to that outcome by saying continue. If the user says abort, stop the run; do not read the plan, do not commit, do not modify the worktree further.

Every implementation runs on the current working tree, so the dirty-worktree check is non-skippable.

## Single-Agent Topology

This skill is SINGLE-AGENT. The current session reads the plan, executes each plan task in order, and self-reviews after each task. NO subagents are spawned. There is no `Task` tool invocation, no implementer/reviewer separation, no orchestrator role distinct from the implementer role — the single session IS both, and the self-review pass after each task is the only review layer in this topology.

## Workflow

1. **Run the dirty-worktree check.** Per `## Dirty Worktree Handling`. If the worktree is clean, proceed. If dirty, ASK; on abort, stop.

2. **Resolve the active thread and read the ledger.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If the plan artifact path the user passed is already thread-rooted, the thread is implicit. If multiple thread roots exist and the plan path is ambiguous about which thread it belongs to, ASK — do not silently pick the most recent timestamp. Once the thread root is known, read its `ledger.md` (append-only; the current value of each key is its last matching line) for the **tier** and **disposition**. A plan input means tier ≥2 work, so the implementation report is part of this thread's Definition of Done. If the disposition is `closed: …`, the thread is sealed — stop and tell the user; do not write into a closed thread.

3. **Resolve the plan artifact path.** Detect the plan path from the user's invocation; the lineage-folder path and the index path resolve to the same artifact. If multiple plan lineages could plausibly match the user's reference (`plans/001/`, `plans/002-cli/`, "the plan" with no clear referent), ASK the user which plan lineage is intended. Do not pick by recency, by highest `NNN`, or by descriptor match.

4. **Run the mechanical pre-flight, then read the index and its `Source:` artifact.** The plan artifact is IMMUTABLE — open everything READ-ONLY. Before executing any task, run the **mechanical pre-flight** on the resolved plan folder:

   a. every task-list entry in the index resolves to an existing `tasks/NN-<kebab-slug>.md` file;
   b. every file under `tasks/` is listed in the index;
   c. ordinals are contiguous and match the filenames.

   If any check fails, the plan is a **malformed artifact**: halt with a clear message *before executing any task* and do not begin the run. This is NOT a `BLOCKED` task report — no task was attempted; the remedy is recompiling the plan from its source.

   Then read the **index** (`plan.md`) and, when its `Source:` line names an artifact (anything other than `none — raw prompt`), read that source artifact too — it holds the intent the plan was compiled from. The individual task files are read **lazily**: the session itself reads each `tasks/NN-<kebab-slug>.md` as it reaches that task — it IS the implementer, so there is no dispatch indirection. If the user passed a specific task identifier, narrow to that subset; otherwise execute every task in index order. Keep a running task list of these tasks and their state as you work, so progress stays legible.

5. **For each plan task IN ORDER:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first".)

   a. **Read the task file and implement.** Read this task's `tasks/NN-<kebab-slug>.md` READ-ONLY, then execute its Steps / substeps literally. Make the code changes the task calls for. Use judgment if the task file is unclear, contradicts the observed code state, or omits an obvious step that blocks progress — surface the deviation in the task report per `## Plan Deviation Policy`.

   b. **Self-review the implementation.** Re-read the diff against the task file's stated objective + verification + acceptance criteria. Check that the change is coherent with the task, does not break adjacent code paths the implementer can see, and matches the project's conventions. The diff is the review *target*; the rest of the repo is readable *context* — reading unchanged code to confirm a criterion is in-scope and expected. If the task has a mechanical verification block (a `grep` check, a `test -f` check, a `npm test` invocation), run it and record the result. As a first-class input to this pass — not an afterthought — explicitly surface the assumptions you made, the forced judgment calls you took, and any known risks the diff alone would not reveal; carry them into the task report and the implementation report. Two rules shape this pass:
      - **Unverified concerns.** A criterion you cannot verify from within the run — external config, runtime-only behavior, credentials nobody has — is recorded as a named "unverified" concern. It is non-blocking by default and rides into `DONE_WITH_CONCERNS`; reserve `NEEDS_CONTEXT` for the case where proceeding without the answer would be reckless (your judgment).
      - **Positive focus.** The current task's diff is the focus of this pass. Discoveries outside it are not prohibited — record them (in the task report, and as implementation-report follow-ups) without letting them drive THIS task's status; blocking stays defined against the current task. There is no out-of-task prohibition.

      Self-review is in-session — no separate review artifact file is written.

   c. **Commit per `## Commit Policy`.** If commit succeeds, capture the SHA + subject. If commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this plan task, append this cycle's block to the run ledger with `Commit: none` (per `## Run Progress Ledger`), and stop the entire run.

   d. **Append the run-ledger block.** Per `## Run Progress Ledger`, append exactly one block for this attempted task — after the commit for a committed cycle (carrying its SHA + subject), or with `Commit: none` for an empty-diff `DONE` / `BLOCKED` / `NEEDS_CONTEXT` cycle — then emit the one-line chat summary for the task. The commit message body carries the same block for committed cycles, minus the cycle's own SHA (present only in the ledger, appended post-commit).

6. **Emit the implementation report.** Once every plan task has run (or the run was halted at a `BLOCKED` task), re-read `progress.md` from disk and fold it into the implementation report per `## Implementation Report`. This is the run's durable record and part of the Definition of Done.

7. **Final out-message.** Emit a final summary listing every plan task by its four-state status (one line per task), the commit SHA + subject for each commit made, the plan lineage path the run executed (so the user has the audit trail anchored to the source plan), and the thread-relative path of the implementation report just written. If follow-ups were discovered, name where they were routed per `## Implementation Report`.

## Implementation Report

Every run emits exactly one **implementation report** — a record, immutable from the moment it is written (the industry analog is a PR description). It is the durable artifact this run produces; the run ledger and the git history are the in-flight trail, and the report is the summary that survives — folded from the ledger re-read from disk on the way out, never from conversation recollection. The per-task self-review is deliberately a task-scoped gate: it confirms each task against its own objective and verification, not the whole change, and the implementation as a whole is expected to receive a broader review afterward. The verify stage that may follow checks the implementation against the spec's acceptance criteria — not against the plan — so the report's account of where the implementation diverged from the plan matters.

**Where it lands.** Write it to the active thread's flat `implementation/` folder:

```text
implementation/<YYMMDDHHMMSSZ>-<kebab-desc>-implementation-report.md
```

`implementation/` is FLAT — records sit directly inside it, with no lineage (`NNN/`) subfolders and no `v<N>` folders (unlike `plans/`, which uses lineage folders). The filename uses the 12-character UTC stamp (no separators, trailing `Z`), a short kebab description, and the mandatory `implementation-report` artifact-type token. Reference the report path thread-relative (relative to the thread root), never absolute; reference anything in another thread repo-relative (`docs/threads/<other>/…`).

**It carries no frontmatter.** The report is a record with no lifecycle status of its own — so no YAML frontmatter at all. Its body is frozen at emission: never edit it after writing. If something needs correcting later, that is a NEW record, not an edit to this one.

**What it captures** — four content categories, all four present (write "none" where a category is empty):

1. **Deviations from the plan, with justification.** Every place the implementation diverged from what the plan task called for, each with a one-or-two-sentence reason. Pull these from the `DONE_WITH_CONCERNS` and `NEEDS_CONTEXT` task blocks where deviations were surfaced.
2. **Surprises.** Things the codebase or the task turned out to be that the plan did not anticipate.
3. **Problems hit.** Blockers, failures, and anything that forced a `BLOCKED` status or a mid-run course change.
4. **Follow-ups.** Work this run discovered but intentionally did not do.

The assumptions, forced judgment calls, and known risks the per-task self-review surfaced fold into these existing categories rather than a new section: assumptions and forced judgment calls into Deviations (1), each with its justification; known risks into Follow-ups (4), or Problems hit (3) where the risk was already realized during the run.

**Follow-up routing.** Follow-ups discovered during implementation are NOT parked in any inbox — there is no inbox in this workflow. Route them one of two ways:

- **Default — seeds of future threads.** Capture each follow-up as a seed for a new thread (its own genesis record), or surface it in the report as a clearly-labelled candidate seed for the user to open later. This is the default for any standalone follow-up.
- **Tier-3 phased work — the next phase's discussion.** If the active thread is tier-3 phased work with a living roadmap, a follow-up that belongs to a later phase routes to that next phase's `discussions/` folder (the roadmap is a living list, not a frozen contract — a phase may welcome or defer the follow-ups appended to it). Confirm the thread is tier-3 phased work (per the ledger) before routing this way.

Name the routing decision for each follow-up in the report so the trail is explicit.

## Commit Policy

This skill auto-commits.

- **Cadence:** ONE commit per plan task that the agent executes from the plan — **per plan task** (one commit per successful plan task). The boundary is the plan task; after the implement → self-review pair for a task succeeds, commit the diff that constitutes the task. Do not bundle multiple plan tasks into one commit. Do not split one plan task across multiple commits.
- **Override:** If the user's invocation contains an EXPLICIT Git instruction (for example, "commit at the end as one commit", "do not commit, just leave the changes staged"), honor the explicit instruction over the default per-plan-task cadence. The user's explicit instruction wins.
- **Baseline gate (before each commit):** A plan task's verification block is task-specific — it confirms THAT task's objective, and it does not necessarily capture the project's *standing* required gates: the bar a project enforces on any code allowed to land (discoverable from the project's tooling or conventions — for example a `check` / `lint` / `format` / `typecheck` script, a documented pre-commit command, or a CI gate). **A project may define no such gate**, in which case there is nothing to run beyond the plan's verification and this clause is a no-op. When the project DOES define standing gates, run them on the changed code and resolve any failure BEFORE committing the task — independent of, and even when omitted by, the plan task's verification block. Scope the gate to the changed code where the project's tooling allows it, so an unrelated pre-existing failure elsewhere does not block this task. Only genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) are legitimately deferred to a closing task — a cheap standing commit-gate is not one of those and is not deferred.

Commits use the project's conventional-commit shape where applicable; follow the project's contribution guidelines for scope rules. Stage only the files the plan task touched — the task file's `Files modified` list is unconditionally authoritative; use it. Never run `git add -A` blindly. Commit subjects are descriptive of the plan task's objective, not its substeps. Commit message bodies carry the task's run-ledger block (per `## Run Progress Ledger`), minus the commit's own SHA — the body is composed before the commit lands, so the cycle's SHA is present only in the ledger — so the audit trail lives in git history as well as the ledger.

### Failed commit

**If a commit fails, report `BLOCKED` and stop. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), append this cycle's block to the run ledger with `Commit: none` (per `## Run Progress Ledger`), then stop the entire run. Subsequent plan tasks are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject, a sign-off was missing. Each of those is the project telling the implementer to stop and let the user diagnose. `BLOCKED` is the correct response.

### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The implementer does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.

## Plan Deviation Policy

The policy is judgment-based and surfaced-via-task-report — not pre-clearance, not blanket permission.

- **Follow the plan.** The plan is the contract; the implementer executes the tasks in index order, applying each task file's substeps literally. Do not silently invent plan tasks the plan does not call for. Do not silently skip plan tasks the plan does call for. Do not silently re-order plan tasks.
- **Use judgment when warranted.** If the plan task is unclear, contradicts the observed code state, or omits an obvious step that blocks progress, apply the obvious correction and move on — DO NOT stop to ask if the correction is trivially in service of the plan task's objective. A blocked import path, a missing helper the plan assumed existed, a renamed dependency the plan did not know about: fix and continue.
- **Surface deviations in the task report.** Every deviation goes into the four-state status block. Minor deviations (the implementer added a missing import, the implementer used `Map` instead of an object literal because the plan did not specify) are `DONE_WITH_CONCERNS` with a one-sentence note. Major deviations (the implementer made a structural choice the plan did not anticipate, the implementer skipped a sub-step because it was unsafe to apply blindly, the implementer's read of the observed code conflicts with the plan task's input field) are `NEEDS_CONTEXT` with a clear "user clarification on X" next-action.
- **Do not pre-clear minor deviations.** This run is autonomous; it does not stop for every judgment call. The four-state report is where the user reads the trail.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the implementer does NOT edit the plan artifact as a side effect of this run. The implementer surfaces the finding with `NEEDS_CONTEXT`, captures it in the implementation report, and stops the run — plan revision happens upstream, not inside this run. A **spec fault** (the plan faithfully implements an ambiguous or incomplete spec) is fixed by correcting the spec and recompiling the plan from it. A **plan fault** (the plan itself is wrong while its source is sound) is fixed by revising the living plan — re-running planning against the source, or editing the plan in place under the Plan Artifact Contract that governs it. Either way the revised plan is handed back on a fresh run; this run's mandate is to surface the fault and stop, never to silently patch the plan.

## Immutability

Plan artifacts are IMMUTABLE. The implementer reads the whole lineage folder — the index and every task file — READ-ONLY. Nothing in the plan folder is edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

If during implementation the implementer discovers that the plan is wrong (a task file contradicts the observed code state, a task references a file that has been renamed, a task's verification block is built on a wrong assumption), the correct move is to surface the finding in the four-state task report with `DONE_WITH_CONCERNS` (if the implementer routed around the issue and finished the task) or `NEEDS_CONTEXT` (if the issue is structural and the implementer cannot pick the right side), and record it in the implementation report. The implementer does not revise the plan inside this run; plan revision happens upstream — a spec fault is fixed by correcting the spec and recompiling the plan, a plan fault by revising the living plan in place under its Plan Artifact Contract or re-running planning — and the revised plan is handed back on a fresh run.

What the implementer DOES modify is source code, plus exactly one implementation report per `## Implementation Report` (the run's durable thread artifact); it also appends to the run ledger under the thread's gitignored, disposable `.wip/` (per `## Run Progress Ledger`). The implementer MAY capture a discovered follow-up as a seed for a future thread (or, in tier-3 phased work, append it to the next phase's `discussions/`) per the follow-up-routing rule. There is no inbox in this workflow. The implementer does NOT create new spec, proposal, plan, or decision-log artifacts inside this run; those require a separate authoring pass.
