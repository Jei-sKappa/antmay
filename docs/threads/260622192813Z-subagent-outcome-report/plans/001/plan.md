# Plan: Wire the structured implementer-subagent outcome report (verification index) into the implement skills

## Goal

Apply the approved spec as a behavioral delta to the implement skills: turn the
implementer subagent's free-form return into an **untrusted structured claim**
(a status token + an optional `.wip/` outcome file carrying only diff-blind
content), give the orchestrator a claim→verify→route loop, enrich both reviewer
contracts (can't-assess verdicts, assumption assessment, blocking/non-blocking
classification), and port the lightweight assumptions discipline to the four
single-agent implement skills. No new committed thread artifact; the existing
working-tree-is-ground-truth inspection is preserved, never replaced.

## Source

- Spec (the contract): `specs/001/spec.md` (approved). Acceptance criteria AC-1.1 … AC-7.2 are the per-task acceptance backbone below.
- Decision log: `seed/discussions/260622200031Z-outcome-report-design-decision-log.md` (cited as `DL P<N>`).
- Genesis seed: `seed/260622192813Z-subagent-outcome-report-seed.md`.

All three are thread-relative to `docs/threads/260622192813Z-subagent-outcome-report/`. The source-code files being edited live outside the thread, so they are cited repo-relative under `skills/workflow/implement/`.

## Shared constants (referenced by Task 1 and Task 2 — pin verbatim, do not paraphrase)

These are load-bearing and pinned by the spec; both subagent skills must use them identically.

**Shared four-state vocabulary (uppercase tokens, used verbatim — `DL P1`):**
- Implementer *claim* and orchestrator *verified verdict* share the names `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`. The claim is untrusted and may differ from the verdict.
- Reviewer *verdict* is one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT` (the last two are rare can't-assess escapes).

**Pinned outcome-file template (AC-2.1 – AC-2.4, `DL P3`, `DL P11`).** The file is written only when there is diff-blind content; it contains NO modified-files list and NO requirements-addressed list; empty *optional* sections (`Validation`, `Known risks`) are omitted, never written as "none":

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

**Pinned outcome-file path (AC-3.3, `DL P10`):**
`docs/threads/<thread>/.wip/<UTC>-task-<N>-implementer-outcome.md` — Markdown, no YAML frontmatter, the status carried on a greppable `Status:` line (AC-3.1, `DL P4`). The orchestrator names the path in the implementer's brief; the 12-char UTC stamp is captured at write time; fix-loop dispatches are disambiguated by the stamp alone, with no separate iteration index.

## Tasks

### Task 1: Wire the outcome-report contract into `implement-plan-with-subagents-auto` (SKILL.md + both reviewer references)

**Objective:** Make the autonomous subagent orchestrator treat the implementer's return as an untrusted structured claim it verifies and routes, and enrich its two reviewer prompts with the new verdict/assumption/classification contract — establishing the full apparatus on the auto skill (FR-1…FR-6 for this skill, half of FR-7 AC-7.1).

**Input / context:**
- The contract is `specs/001/spec.md` FR-1 through FR-6 and their ACs; the operative decisions are `DL P1`–`P8`, `P10`–`P12`.
- Use the **Shared constants** block above verbatim (vocabulary, outcome-file template, outcome-file path).
- Files to edit (current state): `skills/workflow/implement/implement-plan-with-subagents-auto/SKILL.md` (v2.0.1), and its two reviewer references `references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md` (no frontmatter, no version of their own).
- The edit is **additive**: it adds the claim layer and gating ON TOP of the existing orchestrator/reviewer loop and MUST NOT remove the existing working-tree-is-ground-truth inspection (`git status --porcelain` / `git diff`). The report directs verification; it never replaces it (`DL P3` razor).

**Steps:**

1. **Implementer brief — add the status claim and the outcome-file rule (FR-1, FR-2, FR-3).** In `SKILL.md` `## Subagent Briefs` → *Implementer subagent*, change the return contract so the implementer ends its reply with exactly one uppercase token from the shared four-state vocabulary plus a 1–3 sentence summary (AC-1.1). State that an already-satisfied task (empty diff) is reported `DONE` with a note saying no change was needed and why — there is no separate no-op token (AC-1.2). Direct the implementer to write the pinned outcome file **only when there is diff-blind content to persist** (assumptions, blockers/open questions, deliberately-skipped validation, known risks); a plain `DONE` with nothing to flag writes no file, and the reply alone carries the signal; when a file is written, the reply cites its path (AC-3.2, `DL P5`). Give the implementer the pinned template and the pinned path (orchestrator-named, stamp at write time). Update the matching return-contract sentence in `## Workflow` step 5a so the two descriptions agree.
2. **Implementer brief — pin the template constraints (FR-2).** State that the outcome file carries the core fields `Status`, `Summary`, `Assumptions`, `Blockers & open questions` and the optional `Validation` / `Known risks` only where they apply (AC-2.1); contains no modified-files list and no requirements-addressed list (AC-2.2); when `Validation` is present it carries only a `Ran` bucket (checks beyond the plan's verification block, with results) and a `Not run` bucket (skipped checks, with reasons), never restating the plan's prescribed verification (AC-2.3); and matches the pinned heading / greppable `Status:` line / fixed section order, with empty optional sections omitted rather than written as "none" (AC-2.4, AC-3.1).
3. **Four-State Status Protocol — claim vs. verified verdict (FR-1, FR-4).** In `## Four-State Status Protocol`, add explicit text that the implementer's token is an **untrusted claim**, that the orchestrator's same-named four-state is the **verified verdict**, and that the two may differ (AC-1.3). Scope the terminal verdicts as rare: `BLOCKED` = a hard external impossibility; `NEEDS_CONTEXT` = a judgment call neither implementer nor orchestrator can make alone (AC-4.3).
4. **Workflow gating — positive vs. terminal vs. empty-diff (FR-4).** In `## Workflow` step 5, route by the claim, all claims untrusted:
   - A **positive claim** (`DONE` / `DONE_WITH_CONCERNS`) with a non-empty diff runs the reviewers (existing behavior, now explicitly gated) (AC-4.1).
   - An **empty-diff `DONE`** does NOT route the empty diff to the diff-centric reviewers; instead the orchestrator confirms the task's expected outcome already holds against the working tree — running the task's verification block if it has one, else checking the objective's post-conditions — before recording `DONE`, rather than letting the empty diff read as `MISSING` and trip the fix loop (AC-4.6, `DL P1`). Leave the exact confirmation mechanism to the orchestrator's judgment (Degrees of freedom #2 — do not pin a procedure).
   - A **terminal claim** (`BLOCKED` / `NEEDS_CONTEXT`) routes the signal and does NOT run the reviewers on incomplete work; but because the claim is untrusted, the orchestrator first confirms the blocker is real and MAY dispatch one fresh implementer when the claim looks like premature give-up rather than true impossibility (AC-4.1, AC-4.4, `DL P2`). Leave the sanity-check heuristic to orchestrator judgment (Degrees of freedom #2).
   - Preserve the existing rule that a reviewer `ISSUES` drives the fix loop and never becomes a `BLOCKED` verdict directly; the sole fix-loop exit to `BLOCKED` is demonstrated non-convergence (AC-4.2, `DL P2`).
5. **Orchestrator assumption routing + concern aggregation (FR-6).** In `## Workflow` and the two reviewer entries of `## Subagent Briefs`, direct the orchestrator to read the outcome file (when present) as an untrusted claim and, for each dispatch carrying assumptions or known-risks, inject them **unclassified** into **both** reviewer briefs, per-dispatch (so a fix dispatch's new assumptions reach the review that checks that fix) (AC-6.1, `DL P8`). State that the orchestrator aggregates non-blocking concerns (reviewer concerns plus forwarded implementer assumptions/risks it judges worth carrying) into a `DONE_WITH_CONCERNS` verdict, all-clear → `DONE`, and may escalate a concern into a fix but never silently downgrades a blocking finding into a concern (AC-6.4, `DL P12`).
6. **Per-task audit — claimed vs. verified (FR-4).** In the `### Task report block shape` audit block, add a line that records BOTH the implementer's claimed status and the orchestrator's verified verdict so a claim↔verdict divergence is visible (AC-4.5, `DL P1`). Pin only that both statuses appear; leave the exact wording to orchestrator discretion (Degrees of freedom #3).
7. **Plan-compliance reviewer reference — verdict + assumption + classification (FR-5, FR-6).** In `references/plan-compliance-reviewer.md`: define the verdict as one of `PASS` / `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, documenting `BLOCKED` / `NEEDS_CONTEXT` as rare can't-assess escapes that route to the orchestrator's matching terminal verdicts (AC-5.1, `DL P6`). State the reviewer returns its verdict token in its reply on every dispatch and writes a review file only on `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, or on a `PASS` carrying non-blocking concerns; a no-findings `PASS` writes no file (AC-5.2, `DL P7`). Add an assumption-assessment step: assess any implementer-supplied assumptions that fall within this reviewer's lens — an unsound or unverifiable one becomes a finding; one needing a judgment call it cannot make becomes `NEEDS_CONTEXT` (AC-6.2, `DL P8`). Add finding classification: classify each finding blocking (→ `ISSUES`, fix loop) or non-blocking concern, defaulting to blocking when uncertain; the verdict is `ISSUES` iff at least one blocking finding exists; non-blocking concerns ride a `PASS` in a `Concerns:` section (AC-6.3, `DL P12`). Update the `## Output Template` to add the `NEEDS_CONTEXT` / `BLOCKED` verdict shapes and the `Concerns:` section on a `PASS`.
8. **Code-quality reviewer reference — same contract (FR-5, FR-6).** Apply the identical verdict-vocabulary, file-write rule, assumption-assessment, and blocking/non-blocking classification edits to `references/code-quality-reviewer.md`, scoped to its lens (readability / safety / idiomatic-fit / regression-risk). Update its `## Output Template` the same way (add `NEEDS_CONTEXT` / `BLOCKED` shapes and the `Concerns:` `PASS` section).
9. **Version bump.** Bump the `version` in the `SKILL.md` frontmatter from `2.0.1` to `2.1.0` (a behavioral change to the skill, including its bundled reviewer references). The reviewer reference files carry no frontmatter, so they get no version of their own.

**Files modified:**
- `skills/workflow/implement/implement-plan-with-subagents-auto/SKILL.md`
- `skills/workflow/implement/implement-plan-with-subagents-auto/references/plan-compliance-reviewer.md`
- `skills/workflow/implement/implement-plan-with-subagents-auto/references/code-quality-reviewer.md`

**Verification:** (run from repo root; `D=skills/workflow/implement/implement-plan-with-subagents-auto`)
- `grep -q "Implementer Outcome — Task" "$D/SKILL.md"` and `grep -q "task-<N>-implementer-outcome.md\|implementer-outcome" "$D/SKILL.md"` — the outcome template heading and path appear in the implementer brief.
- `grep -qiE "untrusted claim" "$D/SKILL.md"` and that the same passage names the orchestrator's verdict and says the two may differ — AC-1.3.
- `grep -qiE "empty[ -]diff" "$D/SKILL.md"` and the surrounding text directs confirming the outcome already holds rather than tripping the fix loop — AC-4.6.
- `grep -qiE "claim" "$D/SKILL.md"` in the audit block alongside "verified"/"verdict" — AC-4.5.
- For each of the two reviewer references: `grep -qE "NEEDS_CONTEXT" "$D/references/plan-compliance-reviewer.md"` and `… "$D/references/code-quality-reviewer.md"` (AC-5.1), `grep -qi "Concerns:" …` each (AC-6.3), `grep -qi "assumption" …` each (AC-6.2).
- `grep -q "version: 2.1.0" "$D/SKILL.md"` — version bumped.
- Coherence read: walk AC-1.1 … AC-6.4 against the three edited files and confirm each is satisfied for this skill; confirm the existing `git status`/`git diff` ground-truth inspection in `## Workflow` step 5a is still present (additive, not destructive).

**Acceptance criteria:**
- AC-1.1, AC-1.2, AC-1.3 hold in the auto `SKILL.md`: reply ends with one of the four uppercase tokens + 1–3 sentence summary; empty-diff reported `DONE` with a no-change note; the untrusted-claim-vs-verified-verdict distinction is stated.
- AC-2.1 – AC-2.4 hold: the outcome-file template (core + optional fields, no modified-files/requirements lists, `Validation` Ran/Not-run buckets, pinned heading/order/`Status:` line, omit-empty-optional) is pinned in the implementer brief.
- AC-3.1, AC-3.2, AC-3.3 hold: Markdown + greppable `Status:` line + no frontmatter; status in every reply, file only when diff-blind content exists, path cited when written; the pinned `.wip/<UTC>-task-<N>-implementer-outcome.md` path is orchestrator-named with the stamp captured at write time.
- AC-4.1 – AC-4.6 hold: positive→reviewers, terminal→route-without-reviewers + untrusted sanity-check + optional one fresh implementer, `ISSUES`→fix-loop (never direct `BLOCKED`), terminal verdicts scoped rare, claimed-vs-verified recorded in the audit, empty-diff `DONE` confirmation directed.
- AC-5.1, AC-5.2 hold in BOTH reviewer references: four-token verdict with rare can't-assess escapes; verdict in every reply, review file only on `ISSUES`/`BLOCKED`/`NEEDS_CONTEXT` or a concern-carrying `PASS`.
- AC-6.1 – AC-6.4 hold: per-dispatch unclassified assumption injection into both reviewer briefs; each reviewer assesses in-lens assumptions; blocking/non-blocking classification with blocking-when-uncertain default and `Concerns:` section on `PASS`; orchestrator aggregates concerns into `DONE_WITH_CONCERNS` without downgrading blocking findings.
- The auto `SKILL.md` `version` is `2.1.0`.

### Task 2: Mirror the outcome-report contract into `implement-plan-with-subagents-interactive` (SKILL.md + both reviewer references)

**Objective:** Apply the same FR-1…FR-6 apparatus to the interactive subagent skill, adapted to its live walk / anti-sycophancy / per-cycle ASK-gate model, completing FR-7 AC-7.1 across both subagent skills and both reviewer copies under each.

**Input / context:**
- Same contract (`specs/001/spec.md` FR-1…FR-6, `DL P1`–`P8`, `P10`–`P12`) and the same **Shared constants** block as Task 1.
- **Depends on Task 1's output:** Task 1 has already edited the auto skill's `SKILL.md` and its two reviewer references on this same working tree. Use those edited auto files as the reference implementation to mirror; the behavioral additions to the reviewer references MUST match across both skills (per-skill self-containment requires every reviewer copy to carry the same edit) — they differ only in the existing walk-related sentences already present in the interactive copies.
- Files to edit (current state): `skills/workflow/implement/implement-plan-with-subagents-interactive/SKILL.md` (v2.0.1) and its `references/plan-compliance-reviewer.md` + `references/code-quality-reviewer.md`.

**Steps:**

1. **Implementer brief + workflow return (FR-1, FR-2, FR-3).** Apply the Task 1 step 1–2 edits to the interactive `SKILL.md` `## Subagent Briefs` → *Implementer subagent* and `## Workflow` step b: same status-token + summary return, same diff-blind-only outcome-file rule, same pinned template and pinned path. Keep the interactive skill's existing "any live walk adjustments the user signed off on" scope wording intact while adding the claim contract.
2. **Four-state claim vs. verdict + rare terminals (FR-1, FR-4).** Apply the Task 1 step 3 edits to `## Four-State Status Protocol`: untrusted-claim-vs-verified-verdict distinction (AC-1.3) and rare-terminal scoping (AC-4.3), woven alongside the interactive skill's existing dissent-related `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` language.
3. **Workflow gating (FR-4).** Apply the Task 1 step 4 routing to `## Workflow` step 5 (steps c–f): positive-claim→reviewers (AC-4.1); empty-diff `DONE`→confirm outcome holds, don't trip the fix loop (AC-4.6); terminal claim→route without reviewers + untrusted sanity-check + optional one fresh implementer (AC-4.4); preserve `ISSUES`→fix-loop / non-convergence→`BLOCKED` (AC-4.2). Honor the interactive model: surface these routings LIVE to the user per the existing `## Anti-Sycophancy Stance` where the skill already does so, but the gating logic itself is the same. Leave mechanisms to orchestrator judgment (Degrees of freedom #2).
4. **Assumption routing + concern aggregation (FR-6).** Apply the Task 1 step 5 edits: per-dispatch unclassified assumption injection into both reviewer briefs (AC-6.1); concern aggregation into `DONE_WITH_CONCERNS`, never downgrading a blocking finding (AC-6.4). Fold these in next to the interactive skill's existing live-dissent handling.
5. **Per-task audit claimed vs. verified (FR-4).** Apply the Task 1 step 6 edit to the interactive `### Task report block shape`: record both claimed status and verified verdict (AC-4.5); pin only that both appear (Degrees of freedom #3).
6. **Both reviewer references (FR-5, FR-6).** Apply the Task 1 step 7–8 edits to the interactive `references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md`: four-token verdict with rare can't-assess escapes (AC-5.1), reply-always / file-on-content-only rule (AC-5.2), assumption assessment (AC-6.2), blocking/non-blocking classification + `Concerns:` `PASS` section (AC-6.3), and the matching `## Output Template` additions. Preserve the existing walk-related sentences unique to the interactive copies (the "surfaced to the user LIVE during the walk" notes and the "AND the user confirms at the per-cycle ASK gate" commit clause). After editing, diff each interactive reviewer copy against the corresponding auto copy edited in Task 1 and confirm the behavioral additions are identical, differing only in those walk-related sentences.
7. **Version bump.** Bump the interactive `SKILL.md` `version` from `2.0.1` to `2.1.0`.

**Files modified:**
- `skills/workflow/implement/implement-plan-with-subagents-interactive/SKILL.md`
- `skills/workflow/implement/implement-plan-with-subagents-interactive/references/plan-compliance-reviewer.md`
- `skills/workflow/implement/implement-plan-with-subagents-interactive/references/code-quality-reviewer.md`

**Verification:** (run from repo root; `D=skills/workflow/implement/implement-plan-with-subagents-interactive`, `A=skills/workflow/implement/implement-plan-with-subagents-auto`)
- The same grep battery as Task 1, run against `$D/SKILL.md` and the two `$D/references/*.md` files (outcome heading/path, untrusted-claim text, empty-diff text, claim/verdict audit line, reviewer `NEEDS_CONTEXT` / `Concerns:` / `assumption`).
- Cross-skill consistency: `diff "$A/references/plan-compliance-reviewer.md" "$D/references/plan-compliance-reviewer.md"` and the code-quality equivalent show ONLY walk-related differences (the live-surfacing note, the ASK-gate commit clause) — no divergence in the new verdict/assumption/classification behavior.
- `grep -q "version: 2.1.0" "$D/SKILL.md"`.
- Coherence read: AC-1.1 … AC-6.4 hold for the interactive skill; the existing anti-sycophancy / live-walk / per-cycle ASK-gate behavior is intact (additive).

**Acceptance criteria:**
- All AC-1.x, AC-2.x, AC-3.x, AC-4.x, AC-5.x, AC-6.x hold for the interactive skill's three files, exactly as enumerated in Task 1's acceptance criteria.
- AC-7.1 is now fully satisfied: FR-1 through FR-6 are applied to BOTH `implement-plan-with-subagents-auto` and `implement-plan-with-subagents-interactive` and to BOTH reviewer references under each.
- The new reviewer behavior is identical across all four reviewer references; the only cross-skill differences are the pre-existing walk-related sentences.
- The interactive `SKILL.md` `version` is `2.1.0`.

### Task 3: Port the assumptions content discipline to the four single-agent implement skills

**Objective:** Give each single-agent implement skill ONLY the lightweight content discipline — surface assumptions / judgment-calls / known-risks explicitly into its self-review pass and its implementation report — with none of the outcome-file, claim/verify gating, or untrusted-claim status machinery (FR-7 AC-7.2).

**Input / context:**
- The contract is `specs/001/spec.md` FR-7 AC-7.2 and the *Single-agent implement skills* paragraph of Expected behavior; the operative decision is `DL P9`.
- This is content-discipline-only. Do NOT add the outcome-file artifact, the `.wip/` path, the status-claim/verify gating, the untrusted-claim distinction, or any reviewer apparatus to these skills (out of scope, `DL P9`).
- Files to edit (current state, all v2.0.0):
  - `skills/workflow/implement/implement-auto/SKILL.md` — self-review is `## Workflow` step b ("Self-review").
  - `skills/workflow/implement/implement-interactive/SKILL.md` — self-review is `## Workflow` step c ("Self-review").
  - `skills/workflow/implement/implement-plan-auto/SKILL.md` — self-review is `## Workflow` step b ("Self-review the implementation").
  - `skills/workflow/implement/implement-plan-interactive/SKILL.md` — self-review is `## Workflow` step c ("Self-review the implementation").
  - Each skill has an `## Implementation Report` section.

**Steps:**

1. **Self-review pass — add the discipline (each of the four skills).** In each skill's per-task self-review workflow step (the locations listed above), add an instruction that the self-review explicitly surfaces the assumptions made, forced judgment calls taken, and known risks the diff alone would not reveal — as an input to the self-review, not merely an afterthought. Keep it to a sentence or two woven into the existing step; do not introduce a new artifact file (self-review stays in-session, as the existing text states). The exact integration point within the step is left open (Degrees of freedom #4).
2. **Implementation report — add the discipline (each of the four skills).** In each skill's `## Implementation Report` section, direct the report to capture the surfaced assumptions / judgment-calls / known-risks as content. Map them onto the report's existing content categories (these skills' reports already carry deviation / surprise / problem / follow-up categories) rather than inventing a new top-level section; the precise mapping is left open (Degrees of freedom #5). Do not add an outcome-file reference.
3. **Confirm nothing else leaks in.** Re-read each edited skill to confirm it gained ONLY the assumptions discipline — no `Status:` outcome file, no `.wip/<UTC>-task-<N>-implementer-outcome.md` path, no untrusted-claim/verify gating, no reviewer references (AC-7.2 negative half).
4. **Version bumps.** Bump each of the four skills' `version` from `2.0.0` to `2.1.0`.

**Files modified:**
- `skills/workflow/implement/implement-auto/SKILL.md`
- `skills/workflow/implement/implement-interactive/SKILL.md`
- `skills/workflow/implement/implement-plan-auto/SKILL.md`
- `skills/workflow/implement/implement-plan-interactive/SKILL.md`

**Verification:** (run from repo root)
- For each of the four files: `grep -qiE "assumption" <file>` returns success in BOTH the self-review workflow step region and the `## Implementation Report` section (confirm by reading, not just a global match).
- Negative check — none of the four single-agent files gained the apparatus: `! grep -q "implementer-outcome.md" <file>`, `! grep -qi "untrusted claim" <file>`, `! grep -q "plan-compliance-reviewer\|code-quality-reviewer" <file>` for each.
- `grep -q "version: 2.1.0" <file>` for each of the four.
- Coherence read: each skill's self-review step and implementation report now name assumptions/judgment-calls/known-risks, and nothing else changed.

**Acceptance criteria:**
- AC-7.2 holds for all four: `implement-auto`, `implement-interactive`, `implement-plan-auto`, `implement-plan-interactive` each surface assumptions / judgment-calls / known-risks into the self-review pass AND the implementation report.
- None of the four gained an outcome file, the `.wip/` outcome path, claim/verify gating, the untrusted-claim status machinery, or any reviewer apparatus.
- Each of the four `SKILL.md` files has `version: 2.1.0`.

## Notes

- **Sequence rationale.** Task 1 (auto) builds the apparatus first so Task 2 (interactive) can mirror its reviewer-reference edits exactly, keeping all four reviewer copies behaviorally identical per the spec's per-skill self-containment constraint. Task 3 is independent of Tasks 1–2 and is sequenced last only because it is the lightest.
- **No build/test/lint pipeline.** This is a content repo; verification is grep-for-token-presence plus a coherence read against the cited ACs (spec Constraints).
- **Format latch.** Markdown with a greppable `Status:` line; the YAML-frontmatter serialization (`DL P4` option B) is explicitly NOT built here.
- **No new committed thread artifact.** The outcome file is a transient `.wip/` scratch file (recursively gitignored); durable content folds into the existing implementation report (`DL P5`, `DL P10`).
- **Out of scope (do not touch):** commit cadence, worktree topology, plan immutability, history-rewriting rules; and the single-agent skills get nothing beyond the assumptions discipline.
