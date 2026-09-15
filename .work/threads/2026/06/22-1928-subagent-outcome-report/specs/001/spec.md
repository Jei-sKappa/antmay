---
version: 2
status:
  approved: 260622214418Z
  implemented: 260623090207Z
---

# Spec: Structured implementer-subagent outcome report (verification index) for the subagent-driven implement skills

This spec defines a delta to the existing implement skills. It does not rewrite them; it adds a structured implementer→orchestrator outcome report and the verification behavior around it, and ports a lighter discipline to the single-agent variants. All existing invariants of the affected skills (no-worktree isolation, sequential subagents, orchestrator-commits-per-cycle, plan immutability, no history rewriting) remain in force unless an acceptance criterion below changes them.

**Source decision log** (cited throughout as `DL P<N>`): `seed/discussions/260622200031Z-outcome-report-design-decision-log.md`. **Genesis context**: `seed/seed.md`. Both are thread-relative to `docs/threads/260622192813Z-subagent-outcome-report/`.

## Intended outcome

When implemented, the two subagent-driven implement skills treat the implementer subagent's return as a **structured claim set — a verification index, not a verdict**: the implementer reports an untrusted status claim and, when warranted, a small structured outcome file carrying only what the diff cannot reveal (assumptions, blockers, open questions, deliberately-skipped validation, known risks). The orchestrator verifies positive claims and routes negative ones, synthesizes its own verified verdict, and feeds the implementer's surfaced assumptions to the reviewers so a forced judgment call can no longer hide from review. The reviewers gain a richer contract (can't-assess escape verdicts, an assumption-assessment step, and a non-blocking-concern channel). The four single-agent implement skills gain only the lightweight content discipline of surfacing assumptions explicitly — no apparatus.

The net effect: the implementer→orchestrator handshake stops being free-form prose the orchestrator must trust, and becomes a claim→verify loop that preserves "verify, don't trust" while carrying the epistemic state a `git diff` is blind to.

## Context

The subagent-driven implement skills dispatch, per plan task, a fresh implementer subagent plus two reviewer subagents (plan-compliance then code-quality), looping fix-and-re-review until both pass. Today the implementer's only return is a 2–3 sentence prose summary plus a modified-files list, which the orchestrator treats as acknowledgment only — it inspects the working tree itself and synthesizes a four-state status. The gap: disk is ground truth for **what** changed but blind to **why** it changed, what was assumed, what was attempted, and what uncertainty remains. A blind external consultation independently confirmed and sharpened the framing — the implementer's return should be "evidence of claims, uncertainty, and attempted validation, not evidence of correctness" — and a genesis discussion settled the full design across twelve decisions (`DL P1`–`P12`). This spec forward-designs that settled design into a buildable contract.

## Scope

### In scope

- Behavioral edits to `implement-plan-with-subagents-auto/SKILL.md` and `implement-plan-with-subagents-interactive/SKILL.md` (the orchestrator role, the implementer brief, the four-state protocol, the workflow gating).
- Edits to the four reviewer reference prompts these two skills own: `references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md` under **each** of the two subagent skills (each skill carries its own copy; both copies are edited).
- A content-discipline-only edit to the four single-agent implement skills: `implement-auto`, `implement-interactive`, `implement-plan-auto`, `implement-plan-interactive`.

### Out of scope (non-scope)

- The single-agent skills do **not** receive the outcome-file artifact, the claim/verify gating, or the untrusted-claim status machinery (`DL P9`). Only the assumptions discipline is ported.
- No new committed thread artifact is introduced. The outcome file is a transient `.wip/` scratch file; durable content folds into the existing implementation report (`DL P5`, genesis premise).
- The YAML-frontmatter serialization (`DL P4` option B) is **not** adopted here. Markdown is the format; the frontmatter upgrade is reserved for a future trigger (see Constraints).
- No change to commit cadence, worktree topology, plan immutability, or history-rewriting rules.
- The exact prose of every edit is not pinned (see Degrees of freedom).

## Constraints

- **Repository nature.** This is a content repo of `SKILL.md` files with no build/test/lint pipeline; validation is by reading for coherence. Edits are to Markdown instruction files only.
- **Per-skill self-containment.** The reviewer reference prompts are duplicated per skill; an edit to reviewer behavior MUST be applied to every copy under both subagent skills, not centralized.
- **Additive, not destructive.** The design adds a claim layer and gating on top of the existing orchestrator/reviewer loop; it must not remove the existing working-tree-is-ground-truth inspection. The report directs verification; it never replaces it (genesis premise; `DL P3` razor).
- **Transient location.** The outcome file lives under `docs/threads/<thread>/.wip/`, which is recursively gitignored; it is never committed and never emitted as a reviewable artifact (`DL P10`).
- **Format latch.** The outcome file is Markdown with a greppable `Status:` line and no YAML frontmatter (`DL P4`). The frontmatter upgrade (option B) is taken only if/when a deterministic orchestrator/CLI must parse more than `status`; until then it is explicitly not built.
- **Vocabulary is shared and uppercase.** `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` are uppercase tokens used verbatim, shared between the implementer's claim and the orchestrator's verdict (`DL P1`).
- **Version bumps.** Per repo convention, bump the `version` in the frontmatter of every edited `SKILL.md`.

## Expected behavior

Organized by actor. Settled decisions are inlined with citations; the checkable form is in the next section.

**Implementer subagent.** On every dispatch (initial or fix), the implementer ends its reply with one uppercase status token from the shared four-state vocabulary plus a 1–3 sentence summary (`DL P1`). The token is an **untrusted claim**, explicitly distinct from the orchestrator's same-named verdict and free to diverge from it (`DL P1`). A task found already satisfied (empty diff) is reported as `DONE` with a note stating no change was needed and why — there is no separate no-op token (`DL P1`). The implementer writes a `.wip/` outcome file **only when there is diff-blind content to persist**; a plain `DONE` with nothing to flag writes no file, and the reply alone carries the signal (`DL P5`). When a file is written, the reply cites its path (`DL P5`). The file carries the core fields and, when relevant, the optional fields, in the pinned template (`DL P3`, `DL P11`).

**Orchestrator.** It reads the status token from the reply and, when present, the outcome file from disk — both as untrusted claims it must verify. A **positive claim** (`DONE` / `DONE_WITH_CONCERNS`) routes to verification: the orchestrator runs the reviewers against the diff (genesis gating premise). An **empty-diff `DONE`** is a special positive claim: rather than routing the empty diff to the diff-centric reviewers (which, answering "does the diff implement the task," would read it as `MISSING` and misfire the fix loop), the orchestrator confirms the task's expected outcome already holds in the working tree before recording `DONE`; the confirmation mechanism is its own judgment (`DL P1`). A **terminal claim** (`BLOCKED` / `NEEDS_CONTEXT`) routes the signal and does not run the reviewers on incomplete work — but, because the claim is untrusted, the orchestrator first confirms the blocker is real and may dispatch one fresh implementer when the claim looks like premature give-up rather than true impossibility (`DL P2`). A reviewer `ISSUES` result drives the existing fix loop and never becomes a `BLOCKED` verdict directly; the only fix-loop exit to `BLOCKED` is demonstrated non-convergence (`DL P2`). For each dispatch carrying assumptions or known-risks, the orchestrator injects them — unclassified — into **both** reviewer briefs, per-dispatch (`DL P8`). It synthesizes the verified four-state verdict, aggregating non-blocking concerns into `DONE_WITH_CONCERNS` and recording both the claimed and the verified status in its per-task audit so a divergence is visible (`DL P1`, `DL P12`).

**Reviewers (plan-compliance, code-quality).** Each reviewer's verdict is one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, the last two being rare can't-assess escapes that route to the orchestrator's matching terminal verdicts (`DL P6`). Each assesses any implementer-supplied assumptions that fall within its lens (`DL P8`). Each classifies what it finds as **blocking** (→ `ISSUES`, fix loop) or **non-blocking concern** (recorded, no fix), defaulting to blocking when uncertain; non-blocking concerns ride a `PASS` in a `Concerns:` section (`DL P12`). A reviewer returns its verdict token in its reply always and writes a review file only when there is content — `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, or a `PASS` carrying concerns; a no-findings `PASS` writes no file (`DL P7`, `DL P12`).

**Single-agent implement skills.** Each surfaces assumptions / judgment-calls / known-risks explicitly as an input to its self-review pass and as content in its implementation report — and nothing more (`DL P9`).

## Functional requirements and acceptance criteria

Every acceptance criterion is a pass/fail check; each traces to its requirement and to the decision it enforces. Coverage: every behavior in the section above is checked by at least one AC below.

### FR-1 — Implementer status claim

- **AC-1.1** (`DL P1`) — On every implementer dispatch, the reply ends with exactly one of `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT`, uppercase, plus a 1–3 sentence summary.
- **AC-1.2** (`DL P1`) — No other status token exists; an already-satisfied task (empty diff) is reported `DONE` with a note stating no change was needed and why.
- **AC-1.3** (`DL P1`) — The subagent skill text states explicitly that the implementer's token is an untrusted claim, that the orchestrator's same-named four-state is the verified verdict, and that the two may differ.

### FR-2 — Outcome report content and template

- **AC-2.1** (`DL P3`) — When written, the outcome file's **epistemic field set** is the core fields `Status`, `Summary`, `Assumptions`, `Blockers & open questions`, plus the optional fields `Validation` and `Known risks` only where they apply. Beyond these, the file carries a `References` navigational pointer (the plan task, for human orientation per the pinned template in AC-2.4 / `DL P11`) — `References` is not one of P3's diff-blind content fields and adds no field beyond this set.
- **AC-2.2** (`DL P3`) — The outcome file contains no modified-files list and no requirements-addressed list.
- **AC-2.3** (`DL P3`) — When `Validation` is present, it carries only diff-blind content: a `Ran` bucket (checks beyond the plan's verification block, with results) and a `Not run` bucket (deliberately-skipped checks, with reasons); it does not restate the plan's prescribed verification.
- **AC-2.4** (`DL P11`) — The file matches the pinned template: an `# Implementer Outcome — Task <N>` heading, a greppable `Status:` line, the fixed section order (Status, Summary, Assumptions, Blockers & open questions, Validation, Known risks, References), and empty optional sections omitted rather than written as "none".

### FR-3 — Outcome file format, existence, and location

- **AC-3.1** (`DL P4`) — The outcome file is Markdown with `status` on a greppable `Status:` line and carries no YAML frontmatter.
- **AC-3.2** (`DL P5`) — The status token appears in the implementer's reply on every dispatch; an outcome file is written only when there is diff-blind content; a plain `DONE` with nothing to flag writes no file; when a file is written the reply cites its path.
- **AC-3.3** (`DL P10`) — When written, the file path is `docs/threads/<thread>/.wip/<UTC>-task-<N>-implementer-outcome.md`, with the path named by the orchestrator in the implementer's brief and the 12-char UTC stamp captured at write time; fix-loop dispatches are disambiguated by the stamp, with no separate iteration index.

### FR-4 — Verification gating and verdict behavior

- **AC-4.1** (genesis premise; `DL P2`) — A positive claim (`DONE` / `DONE_WITH_CONCERNS`) with a non-empty diff causes the orchestrator to run the reviewers (the empty-diff `DONE` case is handled by AC-4.6 and does not run the reviewers); a terminal claim (`BLOCKED` / `NEEDS_CONTEXT`) routes the signal and does not run the reviewers on incomplete work.
- **AC-4.2** (`DL P2`) — A reviewer `ISSUES` result drives the fix loop (fresh implementer + re-review until `PASS`); it never produces a `BLOCKED` verdict directly; the sole fix-loop exit to `BLOCKED` is demonstrated non-convergence.
- **AC-4.3** (`DL P2`) — The skill text scopes the terminal verdicts as rare: `BLOCKED` = a hard external impossibility; `NEEDS_CONTEXT` = a judgment call neither implementer nor orchestrator can make alone.
- **AC-4.4** (`DL P2`) — A claimed `BLOCKED` / `NEEDS_CONTEXT` is treated as untrusted: before halting the run the orchestrator confirms the blocker is real, and may dispatch one fresh implementer when the claim looks like premature give-up rather than true impossibility.
- **AC-4.5** (`DL P1`) — The orchestrator's per-task audit records both the implementer's claimed status and the verified verdict, so a claim↔verdict divergence is visible.
- **AC-4.6** (`DL P1`) — On a `DONE` claim whose diff is empty, the skill text directs the orchestrator to confirm the task's expected outcome already holds against the working tree (running the task's verification block if it has one, else checking the objective's post-conditions) rather than treating the empty diff as a `MISSING` reviewer result that trips the fix loop.

### FR-5 — Reviewer verdict contract

- **AC-5.1** (`DL P6`) — Each reviewer prompt defines its verdict as one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, documenting `BLOCKED` and `NEEDS_CONTEXT` as rare can't-assess escapes that route to the orchestrator's matching terminal verdicts.
- **AC-5.2** (`DL P7`) — Each reviewer returns its verdict token in its reply on every dispatch and writes a review file only on `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, or on a `PASS` carrying non-blocking concerns; a no-findings `PASS` writes no file.

### FR-6 — Assumption routing and finding classification

- **AC-6.1** (`DL P8`) — For each implementer dispatch carrying assumptions / known-risks, the orchestrator injects them, without pre-classifying them, into both reviewer briefs; routing is per-dispatch, so a fix dispatch's new assumptions reach the review that checks that fix.
- **AC-6.2** (`DL P8`) — Each reviewer method instructs the reviewer to assess supplied assumptions within its lens: an unsound or unverifiable one becomes a finding; one that needs a judgment call it cannot make becomes `NEEDS_CONTEXT`.
- **AC-6.3** (`DL P12`) — Each reviewer classifies findings as blocking or non-blocking, defaulting to blocking when uncertain; the verdict is `ISSUES` iff at least one blocking finding exists; non-blocking concerns ride a `PASS` in a `Concerns:` section.
- **AC-6.4** (`DL P12`) — The orchestrator aggregates non-blocking concerns (reviewer concerns plus forwarded implementer assumptions/risks it judges worth carrying) into a `DONE_WITH_CONCERNS` verdict, with all-clear → `DONE`; it may escalate a non-blocking concern into a fix but never silently downgrades a blocking finding into a concern.

### FR-7 — Scope across the implement skills

- **AC-7.1** (`DL P9`) — FR-1 through FR-6 are applied to both `implement-plan-with-subagents-auto` and `implement-plan-with-subagents-interactive` and to both reviewer reference prompts under each.
- **AC-7.2** (`DL P9`) — Each of `implement-auto`, `implement-interactive`, `implement-plan-auto`, `implement-plan-interactive` gains only the content discipline — assumptions / judgment-calls / known-risks surfaced into its self-review pass and its implementation report — with no outcome file, no claim/verify gating, and no untrusted-claim status machinery.

## Degrees of freedom

The *what* above is pinned; these *hows* are deliberately left to the implementer:

1. **The exact prose** of every `SKILL.md` and reviewer-reference edit — wording, where in each file a clause lands, and how the new rules are woven into existing sections — provided the criteria above hold.
2. **The orchestrator's sanity-check mechanism** for a claimed `BLOCKED` / `NEEDS_CONTEXT` (AC-4.4) and its **confirmation mechanism for an empty-diff `DONE`** (AC-4.6): how it confirms a blocker is real, the heuristic for deciding a claim is premature give-up worth one fresh-implementer retry, and how it confirms an already-satisfied task's outcome holds, are left to the orchestrator's judgment (`DL P2` and `DL P1` granted the judgment, not a fixed procedure).
3. **The exact format of the per-task audit block** that surfaces claimed-vs-verified status (AC-4.5) — the existing skill already leaves this block's wording to orchestrator discretion; only the requirement that both statuses appear is pinned.
4. **The integration points within each single-agent skill** (AC-7.2) — exactly where in the self-review pass and the implementation-report structure the assumptions discipline is attached.
5. **How non-blocking concerns are presented inside the durable implementation report** — the genesis premise pins that durable content folds into the implementation report, and the report already has deviation/surprise/follow-up categories; the precise mapping of aggregated concerns onto those categories is open (this specific was not settled in discussion, so it is granted here rather than pinned).
6. **The finer per-tier expectation of which optional fields appear** — `DL P3` settled the scaling principle (optional fields scale by tier and plan granularity; loose plans lean on `assumptions`/`validation`, strict plans need neither coverage-style field). Translating that principle into a per-tier checklist beyond the stated direction is left open.

## Unresolved questions

None block emission. Two items are flagged as forward-looking, both already handled as granted freedoms rather than open blockers:

- The Markdown→YAML-frontmatter format migration (`DL P4` option B) has a known future trigger (a deterministic orchestrator/CLI needing to parse more than `status`) but is intentionally not built now; revisiting it is future work, not a gap in this spec.
- The precise presentation of aggregated `DONE_WITH_CONCERNS` concerns within the implementation report is a granted Degree of freedom (#5), not a question that must be answered before building.
