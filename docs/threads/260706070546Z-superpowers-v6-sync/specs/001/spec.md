---
version: 2
status:
  approved: 260706142220Z
---

# Spec: Superpowers v6 sync — multi-file strict plans and hardened plan execution

## Context

This repo's plan/implement skills were partially inspired by obra/superpowers v5.1.0. Upstream released v6 (v6.1.1 checkout at `.library/sources/obra_superpowers`), revising its "Subagent-Driven Development" and "Writing Plans" skills based on at-scale usage. The thread's seed (`seed/seed.md`) asked which of those lessons to adopt. A 15-record genesis discussion settled the adoption inventory; this spec compiles those decisions into one buildable change. All settled decisions below cite `seed/discussions/260706072854Z-superpowers-v6-adoption-decision-log.md` (hereafter "the log") by `P<N>`.

The headline changes: the strict plan becomes a **multi-file artifact** (an index plus one file per task) so plans are born pre-briefed for isolated subagents (log P5); `plan-loose` and `adjust-plan-granularity` are **deprecated** (log P3, P4); and the two implement skills adopt a set of orchestration-hardening rules — merged reviewer dispatch, deterministic scratch conventions, a durable run ledger, a mechanical pre-flight, and reviewer-freedom rules (log P1, P7–P9, P11–P15).

## Intended Outcome

After implementation:

- `plan-strict` emits multi-file plans whose task files are directly dispatchable briefs; no runtime brief extraction exists anywhere.
- `implement-plan-with-subagents` runs one reviewer dispatch per review pass (two lane verdicts), keeps a durable per-run progress ledger that survives context compaction, uses deterministic scratch paths, and starts with a mechanical integrity pre-flight plus an intent-level read of the plan's source artifact.
- `implement-plan` (single-agent) handles the same plan format with the same durability mechanisms, minus subagent machinery.
- `review-plan` checks the new format, including two new mechanical checks (index↔tasks consistency, `Consumes:`/`Produces:` cross-task matching) and the Task Right-Sizing rubric.
- `plan-loose` and `adjust-plan-granularity` live in `skills/deprecated/`, with all registrations updated.
- A reader of any updated skill alone can execute it correctly with no knowledge of this thread.

## Scope

**In scope (the complete file set):**

- `skills/workflow/plan/plan-strict/SKILL.md`
- `skills/workflow/review/review-plan/SKILL.md` (and any files under its `references/`, if affected)
- `skills/workflow/implement/implement-plan-with-subagents/SKILL.md` + `references/plan-compliance-reviewer.md` + `references/code-quality-reviewer.md`
- `skills/workflow/implement/implement-plan/SKILL.md`
- Moves: `skills/workflow/plan/plan-loose/` → `skills/deprecated/plan-loose/`; `skills/workflow/plan/adjust-plan-granularity/` → `skills/deprecated/adjust-plan-granularity/`
- Registrations/docs: `README.md`, `.claude-plugin/marketplace.json`, `AGENTS.md` (Layout section), `docs/workflow/v2/thread-layout.md`, `docs/workflow/v2/filename-grammar.md` (only if it constrains plan-folder contents), plus a repo-wide reference sweep (FR-10).

**Out of scope / explicitly rejected (decided, not deferred):**

- No internal broad final review inside either implement skill — broad review stays externalized in the workflow's separate review skills; only an awareness sentence is added (log P2).
- No model-selection content of any kind in any skill — not even a "model choice belongs to the user" guard (log P10).
- No semantic pre-flight plan scan and no batched-questions step in the implement skills — that is the plan-review stage's lane (log P11).
- No reviewer "cannot-verify relay" protocol and no new orchestrator-must-resolve step (log P12).
- No mandatory implementer report files — outcome/review scratch files stay conditional (log P7).
- No successor skill to `adjust-plan-granularity` (log P4).
- No changes to `implement`, `spec`, `review-implementation`, `review-code`, or any other skill not named above.
- No migration of existing plan artifacts in other threads (plans are disposable compiler-IR; an old single-file plan handed to an updated consumer fails the mechanical pre-flight as malformed, and the remedy is recompiling the plan from its source with the updated `plan-strict`).
- No Raycast extension changes (`raycast-extension/assets/skills.json` is generated; the sync script picks up skill changes automatically).
- No edits to V1 workflow docs.

## Expected Behavior

### 1. The strict plan artifact — new multi-file format

A plan lineage `docs/threads/<thread>/plans/NNN[-<desc>]/` now contains (log P5):

```text
plans/NNN[-<desc>]/
├── plan.md                  # the INDEX — authoritative for task count and order
└── tasks/
    ├── 01-<kebab-slug>.md   # one file per task, two-digit ordinal
    ├── 02-<kebab-slug>.md
    └── …
```

**The index (`plan.md`)** must contain (log P5, P11, P15):

- Plan-level objective and context.
- A `Source:` line — a thread-relative pointer to the upstream artifact the plan was compiled from (spec, proposal, decision log), a repo-relative path for a cross-thread artifact, an issue URL, or `none — raw prompt` (log P11).
- A **Global Constraints** block: project-wide requirements copied **verbatim** from the source artifact's constraints, one line each; when the source states no constraints (or there is no source), the block says so explicitly rather than being omitted (log P5, P15).
- An **ordered task list**: number, title, one-line objective, and a relative pointer to each task file (log P5).

**Task files (`tasks/NN-<kebab-slug>.md`)** each carry the full strict field set — the six existing mandatory fields (Objective; Input/context; Steps/substeps; Files modified; Verification; Acceptance criteria) **plus** the two hand-off lines (log P6):

- `Consumes:` — exact things this task uses from earlier tasks; `Produces:` — exact things later tasks rely on. No "Interfaces" umbrella heading. `none` is an explicit legal value for either. The rule is **precision, not notation**: each entry names the exact thing in whatever notation is native to it (a function in the target language's own signature style, a CLI invocation as the literal command line, an HTTP endpoint as method + path, a file as path + format); natural-language entries are fine as long as a later implementer could use the named thing without guessing its name or shape.

**Invariants** (log P5): no frontmatter and no status markers anywhere in the plan folder (execution state lives in commits + the implementation report; the index never needs updating mid-run); alive-in-place editing and git-as-history apply to the whole folder; task ordering is implicit in the numbering; the no-parallelization contract is unchanged; the index is the source of truth for task count and order, and consumers must flag index↔folder mismatches.

### 2. `plan-strict`

- Emits the multi-file format of §1 instead of a single `plan.md` (log P5).
- The self-review pass folds upstream's **Task Right-Sizing** rubric into its existing over/under-splitting checks: a task is the smallest unit that carries its own test cycle and is worth a fresh reviewer's gate; setup, configuration, scaffolding, and documentation steps fold into the task whose deliverable needs them; split only where a reviewer could meaningfully reject one task while approving its neighbor (log P4).
- All references to loose granularity / `plan-loose` as an alternative are removed; the granularity-fit self-review check survives but its remedy no longer recommends a loose plan (log P3; exact rewording is a degree of freedom).
- Unchanged: input forms, lineage-folder grammar, no-frontmatter rule, no-parallelization contract, tier awareness, commit policy.

### 3. `review-plan`

- Reads the index first, then task files one at a time (log P5).
- Verifies the §1 structural invariants: index↔tasks consistency (every index entry resolves to an existing task file, every task file is listed, ordinals contiguous and matching filenames) (log P5, P11).
- New mechanical cross-task check: every non-`none` `Consumes:` entry must correspond to some earlier task's `Produces:` entry; a dangling `Produces:` entry nothing later consumes is flagged as a smell, not an error (a final task legitimately produces for the world outside the plan) (log P6).
- Applies the Task Right-Sizing rubric (§2 wording) as a checking rubric (log P4).
- Its definition of a valid strict task is the seven-element shape of §1 (six fields plus the two hand-off lines); a task file lacking either `Consumes:` or `Produces:` is flagged (per specs/001/discussions/260706141308Z-review-findings-disposition-decision-log.md P2).
- Verifies the index's Global Constraints block against the source artifact named by `Source:`: the block's entries must match the source's stated constraints verbatim; drift (stale, missing, or altered entries) is flagged. This is the review-side half of the verbatim-copy contract (log P15; per specs/001/discussions/260706141308Z-review-findings-disposition-decision-log.md P3).
- Loose-granularity branches are removed (log P3).
- Unchanged: its adherence-review contract (check plan against spec, auto-fix plan faults, route spec faults to the human).

### 4. `implement-plan-with-subagents`

**Startup (before any dispatch):** in addition to the existing gates (dirty-worktree check, ledger read, plan-lineage resolution):

- **Mechanical pre-flight** (log P11): verify the index and `tasks/` folder agree (same three checks as §3). On failure, halt with a clear message *before any dispatch* — this is a malformed artifact, not a `BLOCKED` task.
- **Source read** (log P11): read the index AND the artifact named by its `Source:` line when one exists — the orchestrator holds the intent; subagents hold the mechanics. Task files are read lazily (each task's `Files modified` list is needed at staging time; a judgment call may read a task file on demand). The orchestrator does not read all task files up front.

**The orchestration cycle** (per task, in order):

- **Implementer dispatch** = task file path + index path (+ the findings-file path on fix-loop respawns). Implementers read nothing else *from the plan* (log P5); the brief affirmatively states that the index's `Source:` artifact is readable context to consult when the task file and index leave a question open (log P15).
- **Merged review dispatch** (log P1): ONE reviewer subagent per review pass, whose brief loads BOTH method files (`references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md`). It returns the two verdicts **separately** — plan-compliance and code-quality, each `PASS`/`ISSUES`/`BLOCKED`/`NEEDS_CONTEXT`, each judged strictly within its own lane. Reviewer dispatch = task file path + index path; the reviewer inspects the diff itself as today. A task passes only when BOTH verdicts are clean.
- **Fix loop** (log P1): if either verdict is `ISSUES`, respawn a fresh implementer with the findings file, then a fresh merged reviewer (both verdicts again — the diff changed). The orchestrator tracks fix iterations **per verdict lane**. Convergence and `BLOCKED` rules are unchanged. A baseline-gate fix before commit re-runs the merged reviewer (replacing the old "re-run the code-quality pass" rule).
- **Commit**: unchanged cadence (one commit per cycle after both verdicts pass); staging always uses the task's `Files modified` list as authoritative — the loose-plan "track touched files" fallback is removed (log P3).

**Scratch workspace** (log P7, P8): subagent scratch stays under the thread's gitignored `.wip/`, now at:

```text
docs/threads/<thread>/.wip/implement/plans-NNN/
├── progress.md              # the run ledger (below)
└── task-NN/                 # NN = the plan's task ordinal
    ├── 01-implementer-outcome.md
    ├── 02-review.md
    └── …                    # SS = dispatch ordinal within the task, shared across roles
```

- The scratch folder mirrors the **full lineage folder name**: `.wip/implement/plans-NNN[-<desc>]/` (`plans/001-cli/` → `plans-001-cli`); the shorthand `plans-NNN` elsewhere in this spec denotes this mirrored name (per specs/001/discussions/260706141308Z-review-findings-disposition-decision-log.md P5). `task-NN` matches `tasks/NN-<slug>.md`. `SS` is assigned by the orchestrator at dispatch time, so every brief carries exact, pre-computable paths; on a resumed run the next `SS` is max-existing + 1. Because files are conditional (below), gaps in the `SS` sequence are normal — never renumber existing files to close them (log P8).
- Every dispatch writes to a NEW file, write-once — never overwrite or append a prior dispatch's file (log P7).
- Files remain **conditional**: the implementer writes its outcome file only when there is diff-blind content to persist; the reviewer writes `SS-review.md` (one file, containing both lanes' sections) only when there is content; a no-findings clean pass writes no file (log P7, P1).
- Because `.wip/` is disposable, no durable artifact (commit message, implementation report) may point into it — anything a durable record needs is copied into that record (log P7, P9).

**Reply cap** (log P7): implementer and reviewer replies use a fixed short return shape — status/verdict token(s), files touched, one-line verification result, concerns flag, scratch-file path if one was written — under a hard line ceiling stated in the skill.

**Run progress ledger** (log P9): the per-task report block moves to `.wip/implement/plans-NNN/progress.md`:

- Immediately after each cycle's commit, append that task's block — append-only, one block per completed task. Block content: claimed status vs verified verdict, dispatch counts, fix iterations per verdict lane, deviations, unresolved concerns verbatim (resolved findings counted, never restated), the commit SHA + subject, and brief notes.
- The commit message body keeps carrying the block (it omits the SHA of the commit itself).
- Chat shrinks to one line per task (e.g. `Task 04: verified DONE, commit abc1234`).
- The implementation report is folded from the ledger file re-read from disk at the end. Compaction recovery: the ledger + `git log` are the resume state, never conversation recollection.

**Brief-construction rules** (log P13): a reviewer brief must never pre-rate a finding's severity, exclude categories of findings, or declare a question settled — with red-flag phrasings listed as examples ("do not flag…", "at most minor…", "already decided / the plan chose…"); the existing "unclassified" assumption-injection stays and is cited as the pattern to follow.

**Deviation-policy rewording** (log P4): the two "plan-adjustment pass" passages (currently SKILL.md:236 and :242) are reworded: plan revision happens upstream — a spec fault means fix the spec and recompile the plan; a plan fault means revise the living plan by re-running planning or editing it in place under the Plan Artifact Contract — removing the "the user re-shapes the plan in a separate plan-adjustment pass" framing. No skill is referenced by name.

**Awareness sentence** (log P2): one natural-language sentence, in or near the implementation-report section, noting that per-task reviews are deliberately task-scoped gates and the implementation as a whole is expected to receive a broader review afterward — no skill named.

**Loose-plan removal** (log P3): all loose-granularity branches go (granularity tolerance statements, loose inference paths, per-granularity instructions).

### 5. The two reviewer method files

Both `references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md` (which stay separate files, both loaded by the single merged reviewer — log P1) receive:

- **Explicit read permission** (log P12): the diff is the review *target*; the repo is readable *context* — reading unchanged code to verify a criterion is in-scope and expected.
- **Unverified-concern rule** (log P12): a criterion unverifiable from within the run (external config, runtime-only behavior, credentials nobody has) is recorded as a named "unverified" concern — non-blocking by default, riding into `DONE_WITH_CONCERNS` — with `NEEDS_CONTEXT` reserved for when proceeding without the answer would be reckless (reviewer's judgment).
- **Out-of-task ban dropped** (log P12): the "DO NOT make findings outside the current plan task" constraint is replaced with positive framing — a plan is being implemented in task batches and the reviewer's focus is the current task's diff, with no prohibition on reporting other discoveries. Out-of-task observations go in a distinct section of the findings file, never drive the current task's fix loop or blocking classification (blocking stays defined against the current task), and the orchestrator routes them through the existing concern/follow-up mechanisms.
- **Plan-mandated label** (log P13): a finding that traces to the plan's own text (the diff faithfully implements something defective the plan mandated) is labeled *plan-mandated*; the orchestrator routes it through the existing plan-fault path (deviation policy — `DONE_WITH_CONCERNS`/`NEEDS_CONTEXT` per severity), never silently accepting it and never patching the plan mid-run.
- **Merged-dispatch reframing** (log P1; per specs/001/discussions/260706141308Z-review-findings-disposition-decision-log.md P1): all sequential-pass framing — "FIRST review pass", "SECOND review pass", "the plan-compliance reviewer ran first and has already PASSED", "you trust that verdict" — is rewritten for the merged single-dispatch model: one reviewer produces two lane verdicts, each lane judged independently, with no cross-lane trust. A diff may fail plan-compliance and still receive code-quality findings in the same report.
- Loose-granularity branches removed (log P3); output templates updated for the merged single review file (two lane sections in `SS-review.md`).

### 6. `implement-plan` (single-agent) — carry-over per log P14

- **Mandatory:** multi-file plan handling (parse index, read task files itself — it is the implementer), the mechanical pre-flight, the `Source:` read at startup, loose-granularity removal, and the same deviation-policy rewording (currently at its SKILL.md:155 and :161).
- **With adaptation:** the P12 self-review changes (unverified-concern classification; positive focus framing instead of any out-of-task ban) and the P2 awareness sentence (its per-task self-review is a task-scoped gate; broader review happens downstream).
- **Ledger:** same `.wip/implement/plans-NNN/progress.md`, appended after each cycle's commit, chat one-liner per task, implementation report folded from disk — without the subagent-audit lines (nothing is dispatched).
- **Excluded:** merged-reviewer machinery, dispatch scratch files (only the ledger lives in the `.wip/implement/plans-NNN/` layout), brief-construction rules, model-selection content.

### 7. Deprecations and registrations

- Move `skills/workflow/plan/plan-loose/` and `skills/workflow/plan/adjust-plan-granularity/` to `skills/deprecated/` with their `SKILL.md` bodies **unmodified** (retired skills are kept on disk, frozen) (log P3, P4).
- `README.md`: remove both from the plan group under "Available skills" (handle per the repo's existing convention for deprecated skills), and update the workflow-recipe table — the "Refining a plan" row currently referencing `adjust-plan-granularity` (README.md:41) must be removed or rewritten without it.
- `.claude-plugin/marketplace.json`: move both skill paths from the `JeisKappa-plan` plugin's `skills` array to `JeisKappa-deprecated`'s (which stays last in the `plugins` array).
- `AGENTS.md` Layout section: update the `deprecated/` line (add both skills) and the `plan/` group line (leaving `plan-strict` only).
- `.vscode/settings.json` commit scopes: unchanged — the leaf folder names still exist on disk.

### 8. Documentation ripples

- `docs/workflow/v2/thread-layout.md`: the plans lineage-folder tree (currently showing only `plan.md` + `reviews/`) gains the `tasks/NN-<kebab-slug>.md` shape of §1 (log P5).
- `docs/workflow/v2/filename-grammar.md`: only if its rules constrain plan-folder contents in a way that would forbid task files, add the task-file grammar; otherwise untouched.

## Constraints

- **Skill self-containment** (repo rule): no skill may reference another skill by name, command, or path; natural-language awareness only. The P2 awareness sentence and the P4 rewording must honor this.
- **Harness-agnosticism** (log P10): no model names, no model-selection guidance, no assumption that a per-dispatch model parameter exists — in any touched file.
- **Lossless behavior surface:** everything in the current skills not named in this spec stays behaviorally unchanged (four-state protocol, claim-vs-verified gating, commit policy incl. no-history-rewriting, dirty-worktree handling, immutability rules, implementation-report shape and follow-up routing, no-worktree rule, tier awareness). Where this clause and an enumerated change in this spec conflict, **the enumerated change wins** — e.g. the method files' sequential-pass framing is rewritten per §5, not preserved (per specs/001/discussions/260706141308Z-review-findings-disposition-decision-log.md P1).
- **Version bumps:** the four modified skills (`plan-strict`, `review-plan`, `implement-plan`, `implement-plan-with-subagents`) get a major version bump (breaking artifact-format / orchestration-contract change under the repo's "bump on meaningful change" rule; magnitude ratified per specs/001/discussions/260706141308Z-review-findings-disposition-decision-log.md P6). Deprecated skills' versions are untouched.
- **Frontmatter descriptions** stay one sentence (what + when); any description updates (e.g. removing "both granularities" phrasing) keep that shape.
- **No commits:** this change is written to the working tree only; committing is the surrounding session's decision (repo rule).
- The decision log itself, the seed, and the thread ledger are records — not edited by this implementation.

## Acceptance Criteria

Traceability: each AC cites the log record(s) it enforces.

**FR-1 — Plan artifact format (emitted by `plan-strict`)**
- AC-1.1: `plan-strict/SKILL.md` specifies the lineage layout as `plans/NNN[-<desc>]/plan.md` (index) plus `plans/NNN[-<desc>]/tasks/NN-<kebab-slug>.md`, two-digit ordinals, one file per task. (P5)
- AC-1.2: The index spec mandates: plan-level objective/context, a `Source:` line with the four legal value forms, a Global Constraints block copied verbatim (with an explicit "none" statement when the source states none), and an ordered task list with number, title, one-line objective, and relative pointer per task. (P5, P11, P15)
- AC-1.3: The task-file spec mandates the six existing fields plus `Consumes:` and `Produces:` lines with `none` legal, no "Interfaces" heading, and the precision-not-notation rule stated with notation-native examples. (P6)
- AC-1.4: The skill states: no frontmatter and no status markers anywhere in the plan folder; index is authoritative for task count/order; alive-in-place applies to the whole folder; no-parallelization contract retained. (P5)
- AC-1.5: `grep -ri "loose" skills/workflow/plan/plan-strict/` returns no granularity-alternative references. (P3)
- AC-1.6: The self-review section contains the Task Right-Sizing rubric (smallest unit with its own test cycle, worth a fresh reviewer's gate; fold setup/scaffolding/docs into the deliverable's task; split only where a reviewer could reject one task while approving its neighbor). (P4)

**FR-2 — `review-plan` checks**
- AC-2.1: The skill instructs reading the index first, then task files one at a time. (P5)
- AC-2.2: It mandates the structural check: every index entry resolves to an existing task file, every task file is listed in the index, ordinals contiguous and matching filenames. (P5, P11)
- AC-2.3: It mandates the cross-task check: every non-`none` `Consumes:` matches an earlier task's `Produces:`; dangling `Produces:` is a smell, not an error. (P6)
- AC-2.4: It contains the Task Right-Sizing rubric as a checking rubric. (P4)
- AC-2.5: No loose-granularity branches remain. (P3)
- AC-2.6: Its valid-task definition is the seven-element shape, and a task file lacking either `Consumes:` or `Produces:` is flagged as a finding. (P6; disposition log P2)
- AC-2.7: It verifies the index's Global Constraints block matches the source artifact's stated constraints verbatim and flags drift. (P15; disposition log P3)

**FR-3 — Merged reviewer dispatch (`implement-plan-with-subagents`)**
- AC-3.1: Each review pass dispatches exactly ONE reviewer subagent whose brief loads BOTH method-file paths; the workflow contains no separate plan-compliance-then-code-quality dispatch sequence. (P1)
- AC-3.2: The reviewer's return contract requires BOTH verdicts, named per lane, each one of `PASS`/`ISSUES`/`BLOCKED`/`NEEDS_CONTEXT`; a report missing either verdict is not accepted. (P1)
- AC-3.3: A task is committed only after both verdicts are clean; fix iterations are tracked per verdict lane; fix loops respawn a fresh implementer and a fresh merged reviewer returning both verdicts. (P1)
- AC-3.4: The baseline-gate-fix path re-runs the merged reviewer (no reference to re-running only the code-quality pass remains). (P1)
- AC-3.5: The skill contains a sentence noting per-task reviews are task-scoped gates and a broader review of the whole implementation is expected afterward, naming no skill. (P2)

**FR-4 — Dispatch content and scratch conventions (`implement-plan-with-subagents`)**
- AC-4.1: Implementer briefs pass the task file path + index path (+ findings path on fix respawns) and state that nothing else from the plan is to be read; reviewer briefs pass the same two plan paths. (P5)
- AC-4.2: Both brief templates affirmatively grant on-demand reading of the index's `Source:` artifact when the task file and index leave a question open. (P15)
- AC-4.3: Scratch paths follow `.wip/implement/plans-NNN[-<desc>]/task-NN/SS-implementer-outcome.md` / `SS-review.md`, where the scratch folder mirrors the full lineage folder name (`plans/001-cli/` → `plans-001-cli`), with `SS` orchestrator-assigned at dispatch time, shared across roles, resume rule max-existing + 1. (P8; disposition log P5)
- AC-4.4: Every dispatch writes to a new write-once file; outcome/review files remain conditional (content-only); a clean pass writes no file; there is ONE review file per review dispatch carrying both lanes. (P7, P1)
- AC-4.5: Reply shapes for implementer and reviewer are fixed (token(s), files touched, one-line verification result, concerns flag, scratch path if written) under an explicit hard line ceiling. (P7)
- AC-4.6: The skill states that no durable artifact may point into `.wip/`. (P7, P9)
- AC-4.7: The Subagent Briefs section forbids pre-rating severity, excluding finding categories, or declaring questions settled in reviewer briefs, listing the red-flag phrasings, and cites the existing unclassified-injection as the pattern. (P13)

**FR-5 — Run ledger and reporting (`implement-plan-with-subagents`)**
- AC-5.1: After each cycle's commit, the orchestrator appends the task's report block to `.wip/implement/plans-NNN/progress.md` (append-only), with content: claimed vs verified status, dispatch counts, fix iterations per verdict lane, deviations, unresolved concerns verbatim, resolved findings counted not restated, commit SHA + subject, notes. (P9)
- AC-5.2: The commit message body carries the block; per-task chat output is one line. (P9)
- AC-5.3: The implementation report is folded from the ledger re-read from disk; the skill names the ledger + `git log` as the compaction-recovery state. (P9)

**FR-6 — Startup behavior (`implement-plan-with-subagents`)**
- AC-6.1: A mechanical pre-flight (the three structural checks) runs after plan resolution and halts with a malformed-artifact message before any dispatch on failure; it is not reported as a `BLOCKED` task. (P11)
- AC-6.2: The orchestrator reads the index and the `Source:` artifact (when not `none`) at startup; task files are read lazily; no step requires reading all task files up front. (P11)
- AC-6.3: The deviation-policy passages no longer contain "plan-adjustment pass" or "the user re-shapes the plan"; they route spec faults to fix-spec-and-recompile and plan faults to revising the living plan (re-run planning or edit in place), naming no skill. (P4)
- AC-6.4: The skill contains no model-selection content — no guidance on which model to run a dispatch on, no tier advice, no mandate to specify a model. `grep -ri "model" skills/workflow/implement/implement-plan-with-subagents/` serves as a starting probe; any hit is adjudicated against this criterion (innocuous uses like "mental model" pass), not counted as a failure. (P10; disposition log P4)
- AC-6.5: No loose-granularity handling remains anywhere in the skill (including the commit-staging fallback); `Files modified` is unconditionally authoritative for staging. (P3)

**FR-7 — Reviewer method files**
- AC-7.1: Both files state the diff-is-target / repo-is-readable-context permission. (P12)
- AC-7.2: Both files define the "unverified" concern (non-blocking by default → `DONE_WITH_CONCERNS`; `NEEDS_CONTEXT` only when proceeding would be reckless). (P12)
- AC-7.3: Neither file contains a "DO NOT make findings outside the current plan task" ban; both contain the task-batch focus framing and a distinct out-of-task section in the output template, with the rule that such items never drive the current task's fix loop or blocking classification. (P12)
- AC-7.4: Both files define the *plan-mandated* finding label and its routing through the deviation policy. (P13)
- AC-7.5: Loose-granularity inference branches are removed from both files; output templates match the single merged review file with two lane sections. (P3, P1)
- AC-7.6: Neither file contains first-pass/second-pass ordering or trust-the-other-verdict framing; both frame the review as one dispatch producing two lane verdicts, each judged independently. (P1; disposition log P1)

**FR-8 — `implement-plan` (single-agent)**
- AC-8.1: Multi-file plan handling: parse index, mechanical pre-flight (same three checks, same halt semantics), `Source:` read at startup, task files read by the session itself. (P14, P11)
- AC-8.2: Deviation passages reworded identically to AC-6.3. (P4)
- AC-8.3: Self-review adopts the unverified-concern classification and positive focus framing (no out-of-task ban); the P2 awareness sentence is present. (P14, P12, P2)
- AC-8.4: The run ledger at `.wip/implement/plans-NNN/progress.md` is appended after each cycle's commit, without subagent-audit lines; chat is one line per task; the implementation report folds from the ledger re-read from disk. (P14, P9)
- AC-8.5: No loose-granularity handling remains; no merged-reviewer or brief-construction machinery is added. (P3, P14)

**FR-9 — Deprecations and registrations**
- AC-9.1: `skills/deprecated/plan-loose/SKILL.md` and `skills/deprecated/adjust-plan-granularity/SKILL.md` exist with bodies unmodified (`git diff` shows pure renames); the old paths are gone. (P3, P4)
- AC-9.2: `marketplace.json`: both paths appear in `JeisKappa-deprecated`'s `skills` array and in no other plugin; plugin ordering rules hold (alphabetical, deprecated last). (P3, P4)
- AC-9.3: `README.md` no longer lists either skill under the plan group, and no workflow-recipe row references `adjust-plan-granularity` or `plan-loose`. (P3, P4)
- AC-9.4: `AGENTS.md` Layout section shows both skills under `deprecated/` and only `plan-strict` under `plan/`. (P3, P4)

**FR-10 — Repo-wide consistency**
- AC-10.1: `grep -rn "plan-loose\|adjust-plan-granularity" README.md AGENTS.md .claude-plugin/ skills/workflow/` returns no hits (deprecated folder and thread records excluded). (P3, P4)
- AC-10.2: `docs/workflow/v2/thread-layout.md` shows the plans lineage folder containing `plan.md` + `tasks/NN-<kebab-slug>.md` (+ `reviews/`). (P5)
- AC-10.3: No text in the four updated skills or two method files assumes a single-file plan (e.g. "the plan file", "parse the numbered task list from the plan artifact") without the index/tasks framing. (P5)
- AC-10.4: The four updated skills carry a major version bump in frontmatter; the two deprecated skills' versions are unchanged. (repo rule)

## Degrees of Freedom

Granted as free implementer choices (the *what* above is pinned):

1. All exact prose, sentence placement, and section naming inside the skills and method files — the spec pins substance and named tokens (`Source:`, `Consumes:`, `Produces:`, `progress.md`, path shapes, verdict/status vocabularies), not wording.
2. The exact hard line ceiling for subagent replies (upstream used ≤15; any value of that order works) and the exact fixed reply template.
3. Placement of the `Consumes:`/`Produces:` lines within the task-file field order, and the index's internal section ordering/headings.
4. The exact formatting of index task-list entries, the progress-ledger block, and the review file's two-lane layout, within the stated content contracts.
5. Task-file kebab slugs (chosen by `plan-strict` at authoring time).
6. The rewording of `plan-strict`'s granularity-fit self-review remedy, provided it recommends no loose plan and introduces no new mechanism.
7. How `README.md` presents deprecated skills (drop vs. deprecated section), following whatever convention the README already uses for the existing deprecated skills.
8. Whether `docs/workflow/v2/filename-grammar.md` needs a task-file grammar note (touch it only if its current rules would forbid task files).

## Unresolved Questions

None. All fifteen discussion records are compiled above; no open decision blocks implementation.
