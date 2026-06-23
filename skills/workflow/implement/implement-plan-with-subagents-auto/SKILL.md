---
name: implement-plan-with-subagents-auto
description: Execute every task in a plan artifact through an autonomous implementer and dual-reviewer subagent loop with per-cycle commits when the user wants the heavier review path and the runtime supports subagents.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.1.0
---

# Implement Plan With Subagents Auto

Orchestrate the autonomous, plan-driven, multi-subagent implementation of a plan artifact. This skill is the orchestrator role: it does not write code itself — it reads the plan artifact READ-ONLY, walks the numbered task list in plan order, dispatches an **implementer subagent** for each task, dispatches a **plan-compliance reviewer subagent** (first pass), dispatches a **code-quality reviewer subagent** (second pass), respawns a NEW implementer subagent on review failure, re-reviews every fix before advancing, commits per orchestration cycle, reports a four-state status per plan task, and emits a single immutable **implementation report** record on the way out. It does not ask clarifying questions at each step, it does not ask before committing, and it does not rewrite history.

## Subagent Capability Precondition

**This skill REQUIRES subagent capability** (e.g., a runtime primitive that lets the orchestrator spawn an independent subagent with its own context window and have it write files to disk before replying with an acknowledgment). The orchestrator role this skill defines is meaningful only when implementer and reviewer subagents are real, separate-context dispatches.

**This skill does NOT fall back to inline execution.** There is no "if subagents are unavailable, do it yourself" branch. The orchestrator does not write code in-session, does not run reviews in-session, and does not collapse the three subagent roles back into a single agent — that defeats the dual-reviewer separation and the fresh-context-per-fix discipline. Subagent topology is a precondition of this skill, not a feature toggle. If the runtime does not support subagents, stop and tell the user this run cannot proceed.

## No Worktree Isolation

The subagents this skill dispatches run sequentially on the SAME working tree as the orchestrator. This skill does NOT use `git worktree add` isolation, parallel-worktree topology, or separate per-subagent working directories. Each subagent's writes to the working tree are observable to the next subagent — the plan-compliance reviewer reads what the implementer just wrote; the next implementer (on a fix iteration) reads the previous implementer's diff and the reviewer's findings; the code-quality reviewer reads the same final post-fix state. Subagents run sequentially, on the same tree, in the order this skill's `## Workflow` defines.

No parallel implementer dispatch. No per-task worktree branch. The orchestration cycle (one task) ends with one commit on the current working tree; the next cycle starts from that committed state on the same tree.

## Inputs

This skill accepts a plan artifact path. The plan artifact lives in a lineage folder under the thread root:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/plans/NNN[-<desc>]/plan.md
```

The plan file is simply `plan.md` inside its lineage folder `NNN[-<desc>]/` (`NNN` is a zero-padded 3-digit sequence starting at `001`); it carries no UTC stamp and no `v<N>` in its name — the lineage folder is the stable identifier and the unit of reference. Both LOOSE and STRICT granularity plans are valid input — both require every task to be sequential, isolated, independently implementable, and independently reviewable. Strict-granularity plans provide a six-field per-task block (objective / input-context / steps-substeps / files-modified / verification / acceptance criteria). Loose-granularity plans require the implementer to infer the obvious substeps from the objective + verification sentence; the plan-compliance reviewer adapts accordingly. The granularity is a property of the plan, not a switch on this skill.

The user MAY pass a SPECIFIC plan task identifier alongside the plan path (for example, "task 3" or "tasks 2 and 4"). When passed, the orchestrator runs the dispatch loop only for the named task(s); when omitted, it runs every numbered task in the plan in order.

If the input is ambiguous — the thread holds multiple plan lineages (`plans/001/`, `plans/002-cli/`) and the user named "the plan" without a specific path — ASK the user which plan lineage is intended. There is no global "latest plan" algorithm. Do not silently pick by recency, by highest `NNN`, or by sort order. (There is exactly one `plan.md` per lineage; competing drafts never become emitted siblings — they live in `.wip/`.)

## Four-State Status Protocol

Every orchestration cycle's task report carries one of FOUR statuses. Use the names verbatim; downstream readers match against these tokens exactly.

**Claim vs. verified verdict.** The implementer subagent ends its reply with one of these same four tokens, but that token is an **untrusted claim** — the implementer's self-report. The orchestrator's four-state below is the **verified verdict**, synthesized only after the orchestrator inspects the working tree, runs the gated reviewers, and confirms or refutes the claim. The claim and the verdict may differ: a claimed `DONE` whose diff fails review drives the fix loop and may settle at `DONE_WITH_CONCERNS`; a claimed `BLOCKED` the orchestrator judges premature may become a verified `DONE`. The orchestrator records BOTH the claimed status and the verified verdict in its per-task audit (see `### Task report block shape`).

Both terminal verdicts are rare. `BLOCKED` is a hard external impossibility — progress is genuinely halted and no fresh dispatch would change that. `NEEDS_CONTEXT` is a judgment call neither the implementer nor the orchestrator can make alone — it needs information from outside the run. A reviewer `ISSUES` is never one of these; it drives the fix loop (see below).

- `DONE` — the plan task was completed and BOTH reviewers (plan-compliance and code-quality) passed without surfaced issues, or with issues that the subsequent fix iterations fully resolved. The orchestrator has no concerns to surface. This is the only state that means "ready for next task with no follow-up".
- `DONE_WITH_CONCERNS` — the plan task was completed but at least one concern was surfaced by one of the reviewer subagents (or by the orchestrator's own audit of the cycle) and is being passed forward as a signal. Examples: a code-quality reviewer flagged a code smell the orchestrator judged non-blocking, the implementer made a judgment call on an ambiguous plan area, a possible-but-unverified edge case the reviewers could not exercise from the diff alone, a minor deviation from the plan that the implementer applied per `## Plan Deviation Policy`. The task IS done; the concerns are signals for downstream review or future work.
- `BLOCKED` — the orchestration cycle could not complete. Includes failed commits (see `## Commit Policy`), missing dependencies the implementer subagent could not resolve, inaccessible files, contradictory plan tasks, repeated review failures the fix loop could not close, runtime errors that the implementer did not have enough context to resolve, and any state where progress is genuinely halted. A `BLOCKED` report ends the flow at this task — subsequent plan tasks are NOT attempted under `BLOCKED` cover.
- `NEEDS_CONTEXT` — the orchestration cycle cannot proceed without information neither the orchestrator nor the implementer subagent has. Includes "user clarification needed", "access to file outside repo needed", "external system credentials needed", "the plan task contradicts the observed code state and the implementer cannot pick the right side without input". Distinct from `BLOCKED`: a `BLOCKED` cycle hit a hard error during execution; a `NEEDS_CONTEXT` cycle did not start (or did not progress past initial setup) because the missing input was a precondition.

### Task report block shape (with subagent audit)

The four-state status appears as a structured block in chat output and/or the commit message body for the orchestration cycle's commit (where applicable). The four-state status is NOT written to a separate artifact file — the chat output and the commit history together are the audit trail. Because this skill dispatches subagents, the task report MUST explicitly list (a) which subagents ran, (b) how many fix iterations occurred per review pass, and (c) the final state per task — this is the audit trail without a separate state file.

Suggested format (exact wording is at the orchestrator's discretion, but the four-state status TOKEN MUST appear verbatim, BOTH the implementer's claimed status and the orchestrator's verified verdict MUST appear so a claim↔verdict divergence is visible, and the block stays in the 8–15 line range to accommodate the subagent audit):

```
Task <N>: implementer claimed <…> / verified <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Subagents ran:
  - implementer: <N> dispatch(es)
  - plan-compliance reviewer: <N> dispatch(es), <N> fix iteration(s)
  - code-quality reviewer: <N> dispatch(es), <N> fix iteration(s)
Notes: <1–3 sentences explaining the rationale or surfaced concerns; call out any claim↔verdict divergence.>
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

2. **Resolve the active thread and read the ledger.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If the plan artifact path the user passed is already thread-rooted, the thread is implicit. If multiple thread roots exist and the plan path is ambiguous about which thread it belongs to, ASK — do not silently pick the most recent UTC stamp. Once the thread root is known, the orchestrator reads its `ledger.md` (append-only; the current value of each key is its last matching line) for the **tier** and **disposition**. A plan input means tier ≥2 work, so the implementation report is part of this thread's Definition of Done. If the disposition is `closed: …`, the thread is sealed — stop and tell the user; do not write into a closed thread, do not spawn any subagent.

3. **Resolve the plan artifact path.** Detect the plan path from the user's invocation. If multiple plan lineages could plausibly match the user's reference (`plans/001/`, `plans/002-cli/`, "the plan" with no clear referent), ASK the user which plan lineage is intended. Do not pick by recency, by highest `NNN`, or by descriptor match. When multiple lineages exist and the reference is ambiguous, that ambiguity is often a real decision in disguise (which lineage won) — surface it rather than resolving it silently.

4. **Read the plan READ-ONLY.** The plan artifact is IMMUTABLE — open it for reading only. Parse the numbered task list. For each task, record its objective, its verification block (if present), its acceptance criteria (if present in strict-granularity plans), and its files-modified list (if present in strict-granularity plans). If the user passed a specific task identifier, narrow the task list to that subset; otherwise execute every numbered task in plan order. Keep a running task list of these tasks and their state as the orchestrator works through them, so progress stays legible.

5. **For each plan task IN ORDER — the orchestration cycle:** (Sequential execution — there are no waves; the implicit dependency is "the previous numbered plan task ran first". Subagents within a cycle run sequentially on the same working tree per `## No Worktree Isolation`.)

   a. **Spawn the implementer subagent** with a self-contained brief from `## Subagent Briefs`. Pass the plan artifact path + the current plan task identifier + (optionally) the plan-level context the orchestrator extracted in step 4 + the `.wip/` outcome-file path the implementer is to use IF it writes one (`docs/threads/<thread>/.wip/<UTC>-task-<N>-implementer-outcome.md`, stamp captured by the implementer at write time). Wait for the implementer subagent to return. The implementer writes code changes directly to the working tree, ends its reply with ONE uppercase status token — its **untrusted claim** — plus a 1–3 sentence summary and the paths of modified files, and — only when there is diff-blind content to persist — writes the outcome file at the named `.wip/` path and cites it in the reply. The orchestrator inspects the working tree itself (`git status --porcelain`, `git diff`) and reads the outcome file from disk (when present) rather than trusting the reply's prose — the working tree is the completion signal; the status token and the outcome file are untrusted claims the orchestrator verifies. If an outcome file is present, carry forward its `Assumptions` / `Known risks` for injection — unclassified — into the reviewer briefs of THIS dispatch's review passes (steps b and d).

   **Gate on the claim before reviewing — every claim is untrusted (`## Four-State Status Protocol`):**
   - **Positive claim (`DONE` / `DONE_WITH_CONCERNS`) with a non-empty diff** → proceed to the review passes (steps b–e below). This is the existing path, now explicitly gated.
   - **Empty-diff `DONE`** → do NOT route the empty diff to the diff-centric reviewers (answering "does the diff implement the task," they would read the empty diff as `MISSING` and misfire the fix loop). Instead confirm the task's expected outcome ALREADY holds against the working tree — run the task's verification block if it has one, else check the objective's post-conditions — then record a verified `DONE` and advance (an empty diff yields no commit). The confirmation mechanism is the orchestrator's judgment.
   - **Terminal claim (`BLOCKED` / `NEEDS_CONTEXT`)** → route the signal and do NOT run the reviewers on incomplete work. Because the claim is untrusted, FIRST confirm the blocker is real; the orchestrator MAY dispatch ONE fresh implementer when the claim looks like premature give-up rather than true impossibility. If the blocker holds, record the matching verified terminal verdict and stop the run; if the fresh implementer clears it, fall back into the positive-claim path. The sanity-check heuristic is the orchestrator's judgment.

   b. **Spawn the plan-compliance reviewer subagent — the FIRST review pass.** Use a self-contained brief from `## Subagent Briefs` that loads the reviewer prompt at `references/plan-compliance-reviewer.md` (resolved relative to this skill's directory) and points the reviewer at the current plan task's verification block + acceptance criteria. Inject — unclassified — any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch so the reviewer assesses them within its lens. The reviewer reads `git diff` (or the modified files file-by-file) against the plan task and returns a verdict token — one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT` — in its reply; it writes a structured review file to a designated `.wip/` scratch path the orchestrator chooses ONLY when there is content (`ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, or a `PASS` carrying non-blocking concerns) — a no-findings `PASS` writes no file. `.wip/` is recursively gitignored, so the review output does not pollute the working tree's commit history. Wait for the reviewer to return. Read the structured review file from disk when one was written; do not trust the reply's prose. A reviewer `ISSUES` enters the fix loop (step c); a rare reviewer `BLOCKED` / `NEEDS_CONTEXT` (a can't-assess escape) routes to the orchestrator's matching terminal verdict and stops the run.

   c. **If the plan-compliance reviewer surfaced ISSUES**, enter the fix loop. Spawn a NEW implementer subagent — always respawn a fresh implementer for the fix; the original implementer's context is gone. Include in the fix brief: the original plan task, the plan-compliance reviewer's findings (path to the review file), and a clear directive that the fix MUST address the surfaced issues without re-introducing prior reviewer-approved behavior. Wait for the fix implementer to return. RE-REVIEW the fix — spawn a NEW plan-compliance reviewer subagent with a fresh brief that points at the fix's diff and the same reviewer prompt. Loop the fix-and-re-review pattern until plan-compliance PASSES. Each iteration costs one implementer + one reviewer subagent. A reviewer `ISSUES` NEVER becomes a `BLOCKED` verdict directly — it drives this fix loop; the SOLE fix-loop exit to `BLOCKED` is demonstrated non-convergence. If the loop fails to close (the reviewer keeps surfacing the same or escalating issues across iterations and the orchestrator's audit shows the fix loop is not converging), the orchestrator reports `BLOCKED` for this task with notes describing the loop state, and stops the run.

   d. **Spawn the code-quality reviewer subagent — the SECOND review pass.** Use a self-contained brief that loads the reviewer prompt at `references/code-quality-reviewer.md` (resolved relative to this skill's directory) and points the reviewer at the final post-fix diff (the diff at this point reflects the implementer's original work plus any plan-compliance fix iterations). Inject — unclassified — any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch so the reviewer assesses them within its lens. The reviewer returns a verdict token — one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT` — in its reply and writes a review file only when there is content (`ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, or a `PASS` carrying non-blocking concerns); a no-findings `PASS` writes no file. Wait for the reviewer to return. Read the structured review file from disk when one was written. A rare reviewer `BLOCKED` / `NEEDS_CONTEXT` routes to the orchestrator's matching terminal verdict and stops the run.

   e. **If the code-quality reviewer surfaced ISSUES**, enter the same fix loop as step c — spawn a NEW implementer per fix, spawn a NEW code-quality reviewer per re-review. Loop until code-quality PASSES. Same convergence rule applies: if the loop does not close, report `BLOCKED`.

   f. **The orchestrator commits per `## Commit Policy`.** Commit cadence is per orchestration cycle — one commit per task after BOTH reviewers pass. The orchestrator stages the task-related files (the strict-granularity plan's `Files modified` list is authoritative; loose-granularity plans require the orchestrator to track touched files across the cycle's implementer dispatches) and runs the commit itself. The implementer subagent does not commit; the reviewer subagents do not commit. If the commit succeeds, capture the SHA + subject. If the commit fails, jump to the failed-commit branch in `## Commit Policy` — report `BLOCKED` for this task and stop the entire run.

   g. **Synthesize the verified verdict and write the orchestration cycle task report.** Aggregate the cycle's non-blocking concerns — reviewer concerns ridden on a `PASS` plus any forwarded implementer assumptions / known-risks the orchestrator judges worth carrying — into a verified `DONE_WITH_CONCERNS`; an all-clear cycle is a verified `DONE`. The orchestrator MAY escalate a non-blocking concern into a fix, but NEVER silently downgrades a blocking finding into a concern. Use the four-state status block (with the subagent audit) from `## Four-State Status Protocol`, recording BOTH the implementer's claimed status and the verified verdict. The state goes in chat output and / or the commit message body. The audit line lists which subagents ran, how many fix iterations occurred per review pass, and the final verified verdict.

6. **The orchestrator emits the implementation report.** Once every plan task has run (or the run was halted at a `BLOCKED` task), the ORCHESTRATOR writes the implementation report per `## Implementation Report` — this is a synthesis the orchestrator owns, folded from the per-cycle task reports and the subagent audit it already holds; it is NOT delegated to a subagent. This is the run's durable record and part of the Definition of Done.

7. **Final out-message.** Emit a final summary listing every plan task by its four-state status, the per-task subagent audit, the commit SHA + subject for each commit made, the plan lineage path the run executed (so the user has the audit trail anchored to the source plan), and the thread-relative path of the implementation report just written. If follow-ups were discovered, name where they were routed per `## Implementation Report`.

## Implementation Report

The ORCHESTRATOR emits exactly one **implementation report** per run — a record, immutable from the moment it is written (the industry analog is a PR description). The orchestrator writes it directly (it is a synthesis of the per-cycle task reports and subagent audits the orchestrator already holds); it is not delegated to a subagent, and the orchestrator does not load any subagent reply as the report's content. The four-state task blocks, the subagent audit, and the git history are the in-flight trail; the report is the summary that survives. The verify stage that may follow checks the implementation against the spec's acceptance criteria — not against the plan — so the report's account of where the implementation diverged from the plan matters.

**Where it lands.** Write it to the active thread's flat `implementation/` folder:

```text
implementation/<YYMMDDHHMMSSZ>-<kebab-desc>-implementation-report.md
```

`implementation/` is FLAT — records sit directly inside it, with no lineage (`NNN/`) subfolders and no `v<N>` folders (unlike `plans/`, which uses lineage folders). The filename uses the 12-character UTC stamp (no separators, trailing `Z`), a short kebab description, and the mandatory `implementation-report` artifact-type token. Reference the report path thread-relative (relative to the thread root), never absolute; reference anything in another thread repo-relative (`docs/threads/<other>/…`). The report is NOT a `.wip/` scratch file — `.wip/` holds the recursively-gitignored reviewer review files; the implementation report is an emitted, version-controlled record under `implementation/`.

**It carries no frontmatter.** The report is a record with no lifecycle status of its own — so no YAML frontmatter at all. Its body is frozen at emission: never edit it after writing. If something needs correcting later, that is a NEW record, not an edit to this one.

**What it captures** — four content categories, all four present (write "none" where a category is empty):

1. **Deviations from the plan, with justification.** Every place the implementation diverged from what the plan task called for, each with a one-or-two-sentence reason — including deviations the implementer subagents surfaced in their reply summaries and deviations either reviewer subagent flagged. Pull these from the `DONE_WITH_CONCERNS` and `NEEDS_CONTEXT` cycle reports.
2. **Surprises.** Things the codebase or the task turned out to be that the plan did not anticipate.
3. **Problems hit.** Blockers, failures, non-converging fix loops, and anything that forced a `BLOCKED` status.
4. **Follow-ups.** Work this run discovered but intentionally did not do.

**Follow-up routing.** Follow-ups discovered during implementation are NOT parked in any inbox — there is no inbox in this workflow. Route them one of two ways:

- **Default — seeds of future threads.** Capture each follow-up as a seed for a new thread (its own genesis record), or surface it in the report as a clearly-labelled candidate seed for the user to open later. This is the default for any standalone follow-up.
- **Tier-3 phased work — the next phase's discussion.** If the active thread is tier-3 phased work with a living roadmap, a follow-up that belongs to a later phase routes to that next phase's `discussions/` folder (the roadmap is a living list, not a frozen contract — a phase may welcome or defer the follow-ups appended to it). Confirm the thread is tier-3 phased work (per the ledger) before routing this way.

Name the routing decision for each follow-up in the report so the trail is explicit.

## Subagent Briefs

Each dispatched agent gets a self-contained brief. The orchestrator never inherits the agent's session and never loads the agent's output back into its own context. Each brief contains: scope, input paths, output path, return contract, and hard constraints. The orchestrator reads files the subagent wrote (the working tree, the review output file under `.wip/`); the reply is acknowledgment only.

### Implementer subagent

- **Scope** — the current orchestration cycle's context: the plan artifact path, the current plan task identifier, and (optionally) the plan-level context the orchestrator extracted at step 4 of `## Workflow`. On a fix iteration, also include the reviewer's findings (path to the structured review file under `.wip/`).
- **Input paths** — the plan artifact path (READ-ONLY); on fix iterations, the prior reviewer's structured review output file (READ-ONLY).
- **Output path** — the implementer writes code changes DIRECTLY to the working tree at the file paths the plan task names (strict-granularity) or the implementer infers (loose-granularity); the working tree IS the primary output. ADDITIONALLY, ONLY when there is diff-blind content to persist (assumptions, blockers / open questions, deliberately-skipped validation, known risks), the implementer writes ONE outcome file at the orchestrator-named path — `docs/threads/<thread>/.wip/<UTC>-task-<N>-implementer-outcome.md` (the orchestrator names it in this brief; the 12-char UTC stamp is captured by the implementer at write time; fix-loop dispatches are disambiguated by the stamp alone, with no separate iteration index). A plain `DONE` with nothing to flag writes NO file — the reply alone carries the signal.
- **Return contract — status claim (untrusted).** End the reply with EXACTLY ONE uppercase status token from the shared four-state vocabulary — `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` — plus a 1–3 sentence summary. This token is the implementer's CLAIM, not a verdict — the orchestrator verifies it (see `## Four-State Status Protocol`); there is no other status token. A task found ALREADY satisfied (empty diff) is reported `DONE` with a note stating no change was needed and why — there is no separate no-op token. Reply with ONLY the summary, the status token, the paths of modified files, and — when an outcome file was written — that file's path. Do NOT paste the diff back. Do NOT commit (the orchestrator commits per `## Commit Policy`). Do NOT run `git commit`, `git add` outside of standard staging, or any history-rewriting operation.
- **Outcome-file content (when written).** The file carries the core fields `Status`, `Summary`, `Assumptions`, `Blockers & open questions`, and the optional fields `Validation` and `Known risks` only where they apply. It contains NO modified-files list and NO requirements-addressed list — the working tree and the plan already carry those. When `Validation` is present it carries ONLY a `Ran` bucket (checks performed BEYOND the plan task's verification block, with their results) and a `Not run` bucket (deliberately-skipped checks, with reasons); it NEVER restates the plan's prescribed verification. Match the pinned heading, the greppable `Status:` line, and the fixed section order exactly; OMIT empty optional sections rather than writing them as "none". The file is Markdown with NO YAML frontmatter.
- **Hard constraints** — do NOT modify the plan artifact (it is immutable — read-only); stay within the working tree and the named `.wip/` outcome path; do NOT commit; do NOT rewrite history; do NOT spawn further subagents; do NOT use `git worktree`; on a fix iteration, do NOT re-introduce behavior the prior reviewer approved while addressing the new findings.

**Pinned outcome-file template** (write only when diff-blind content exists; match the heading, the greppable `Status:` line, and the section order exactly; omit empty optional sections rather than writing them as "none"):

```markdown
# Implementer Outcome — Task <N>

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
- <paths / task ids the orchestrator or reviewers need>
```

### Plan-compliance reviewer subagent (first pass)

- **Scope** — review the diff against the plan task's verification block and acceptance criteria. The single question this reviewer answers: "Does the diff implement what the task said it would?" Codebase quality, style, refactor opportunities, and idiomatic-fit are OUT of scope here — those belong to the code-quality reviewer (second pass). Additionally, the orchestrator injects — unclassified — any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch's outcome file; the reviewer assesses those that fall within its lens per its method reference.
- **Input paths** — the plan artifact path (READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection of the modified paths); the method reference at `references/plan-compliance-reviewer.md` resolved relative to this skill's directory (absolute path computed by the orchestrator).
- **Output path** — a designated `.wip/` scratch file the orchestrator names (e.g., `docs/threads/<thread>/.wip/<UTC>-task-<N>-plan-compliance-review.md`). The reviewer writes its structured review (Verdict + findings + references) to this path ONLY when there is content — `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, or a `PASS` carrying non-blocking concerns; a no-findings `PASS` writes no file.
- **Return contract** — return the verdict token (`PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`) in the reply on EVERY dispatch; when a review file was written, reply with ONLY a 2–3 sentence summary plus the verdict and the path of the review file. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT run tests beyond what the plan task's verification block prescribes (running the prescribed verification is in scope and expected); do NOT commit.

### Code-quality reviewer subagent (second pass)

- **Scope** — review the diff for readability, safety, idiomatic patterns given the codebase, and regression risk. The single question this reviewer answers: "Is the diff well-structured, safe, idiomatic given the codebase?" Plan compliance (does the diff implement what the task said it would?) is OUT of scope here — that was the first pass. Additionally, the orchestrator injects — unclassified — any `Assumptions` / `Known risks` the implementer surfaced for THIS dispatch's outcome file; the reviewer assesses those that fall within its lens per its method reference.
- **Input paths** — the plan artifact path (READ-ONLY); the working tree's current state (`git diff` from the cycle's starting commit, or file-by-file inspection — note that the diff at this point reflects the implementer's original work plus any plan-compliance fix iterations); the method reference at `references/code-quality-reviewer.md` resolved relative to this skill's directory (absolute path computed by the orchestrator).
- **Output path** — a designated `.wip/` scratch file the orchestrator names (e.g., `docs/threads/<thread>/.wip/<UTC>-task-<N>-code-quality-review.md`). The reviewer writes its structured review (Verdict + findings + references) to this path ONLY when there is content — `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, or a `PASS` carrying non-blocking concerns; a no-findings `PASS` writes no file.
- **Return contract** — return the verdict token (`PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`) in the reply on EVERY dispatch; when a review file was written, reply with ONLY a 2–3 sentence summary plus the verdict and the path of the review file. Do NOT paste the review back.
- **Hard constraints** — do NOT modify code or any working-tree file; do NOT modify the plan artifact; read `git diff` and source code but ONLY produce findings; do NOT commit.

## Commit Policy

The orchestrator commits.

- **Cadence:** ONE commit **per orchestration cycle** — one commit per plan task after BOTH reviewers (plan-compliance and code-quality) PASS. The boundary is the orchestration cycle; subagents within the cycle do NOT commit. The orchestrator stages and commits the task-related files (strict-granularity plans state the files explicitly under `Files modified`; loose-granularity plans require the orchestrator to track which files the implementer dispatches touched across the cycle).
- **Override:** If the user's invocation contains an EXPLICIT Git instruction (for example, "commit at the end as one commit", "do not commit, just leave the changes staged"), honor the explicit instruction over the default per-orchestration-cycle cadence. The user's explicit instruction wins.

Commits use the repository's existing commit convention when it is discoverable from recent history or local tooling. If no convention is obvious, use a short imperative subject that describes the plan task's objective, not its substeps. Stage only the files the orchestration cycle touched. Never run `git add -A` blindly. Commit message bodies MAY include the orchestration cycle's four-state task report block (status + subagent audit) so the audit trail lives in git history as well as chat output.

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
- **Reviewer-surfaced deviations.** Either reviewer (plan-compliance first, code-quality second) may surface a deviation in its findings. The orchestrator weighs the finding against the fix-loop convergence: if a fresh implementer can address the finding, do so; if the finding is structural and no fix iteration would close it, report `NEEDS_CONTEXT` for the task.

If the plan itself needs revision (the plan calls for an outdated approach, a target file no longer exists, an entire task is built on a wrong premise), the orchestrator does NOT re-shape the plan as a side effect of this run. The orchestrator surfaces the finding with `NEEDS_CONTEXT`, captures it in the implementation report, stops the run, and the user re-shapes the plan in a separate plan-adjustment pass (a plan is a disposable compiler-IR edited in place by its own authoring/adherence loop) to hand back on a fresh run. If the plan deviates because the SPEC is ambiguous or incomplete, that is a spec fault — it routes to the human to fix the spec, never to a silent plan patch — but resolving it is outside this run's mandate; surface it and stop.

## Immutability

Plan artifacts are IMMUTABLE. The orchestrator reads them READ-ONLY; the implementer subagent reads them READ-ONLY; both reviewer subagents read them READ-ONLY. The plan file is not edited in place — not for typo fixes, not for "add a missing acceptance criterion", not to mark tasks as done, not for any reason. Implementation output goes to SOURCE CODE — application code, configuration files, tests, build files, any non-workflow file in the repository — not to the plan.

If during the orchestration cycle the implementer or a reviewer discovers that the plan is wrong (a plan task contradicts the observed code state, a plan task references a file that has been renamed, a plan task's verification block is built on a wrong assumption), the correct move is to surface the finding in the four-state task report with `DONE_WITH_CONCERNS` (if the implementer routed around the issue and finished the task and both reviewers passed) or `NEEDS_CONTEXT` (if the issue is structural and the fix loop did not converge), and record it in the implementation report. The orchestrator does not re-shape the plan inside this run; that is a separate plan-adjustment pass, handed back on a fresh run.

What the subagents DO modify is source code (the implementer subagent) or `.wip/` review scratch files (the reviewer subagents). The reviewer scratch files live under the thread's `.wip/` folder (`docs/threads/<thread>/.wip/`) — `.wip/` is recursively gitignored, so the review output does not enter version control. The ORCHESTRATOR additionally emits exactly one implementation report per `## Implementation Report` (the run's durable thread artifact, under `implementation/`) and MAY capture a discovered follow-up as a seed for a future thread (or, in tier-3 phased work, append it to the next phase's `discussions/`) per the follow-up-routing rule. There is no inbox in this workflow. Neither the orchestrator nor any subagent creates new spec, proposal, plan, or decision-log artifacts inside this run; those require a separate authoring pass.

The thread folder set uses the following structure (folders are created on-demand, not pre-created — a folder appears only when its first artifact lands):

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── ledger.md                              # thread root — append-only tier + disposition
├── seed/                                  # genesis bucket (exactly one seed)
├── proposals/
│   └── NNN[-<desc>]/                      # lineage folder
├── specs/
│   └── NNN[-<desc>]/
├── plans/
│   └── NNN[-<desc>]/                      # the plan this skill reads: plans/NNN/plan.md
├── implementation/                        # flat, records-only — the report lands here
│   └── <UTC>-<desc>-implementation-report.md
└── .wip/                                  # recursively gitignored scratch
```

There is no `inbox/`; the orchestrator never writes one. Within-thread references are written thread-relative; cross-thread references repo-relative; never absolute. The `.wip/` folder is recursively gitignored and is never used for emitted artifacts — only for in-progress scratch material such as the reviewer review files.
