# Reconciliation Matrix

This record front-loads the reconcile-vs-keep judgment for every drifted or
duplicated boilerplate section across the 29 active `skills/workflow/**`
skills, so the shared-partial set and the per-skill version bumps are decided
before any skill is rebaselined. It is the auditable input to partial authoring
and to the rebaseline's per-hunk diff review; it is reviewed before the
rebaseline runs.

This file is inert to the renderer: it is not a `.jastrgroup`, not a
`templates/*` entry, and is not included by any template. It only documents the
catalog beside it.

## Criterion

A section is reconciled into a shared partial **only when its cross-skill
differences are incidental** — wording drift (`incidental`) **or** an artifact
noun absorbable by interpolation (`artifact-noun`). A section whose differences
are **semantic** stays skill-specific (`keep-specific`). **When in doubt, keep
it separate**: a false merge silently corrupts a skill, whereas a missed merge
only leaves harmless duplication. The tie-breaker is applied explicitly below —
every section whose cross-skill differences are semantic is `keep-specific`.

## Scope of rows

Coverage is the 19 candidates reported by
`python3 scripts/skill_header_stats.py --drift --bucket workflow` **plus** the
two spec-named sections that the tool scores *divergent* (too many
low-similarity variants) and therefore omits from the `--drift` view —
`Commit Policy` (20 skills) and `Immutability` (15 skills). 21 rows total: 19
drift candidates + 2 divergent.

## Fields

- **Candidate section** — the section heading as the drift/body tool reports it.
- **Decision** — `partial` (reconcile into one shared `partials/<name>.md`) or
  `keep-specific` (stays inline, per skill).
- **Reason** — `incidental` | `artifact-noun` | `semantic`.
- **Affected skills** — every skill that carries the section.
- **Expected version-bump set** — the skills whose **rendered content changes**
  if the section is reconciled, i.e. the skills that will show a
  category-(a) (deliberate reconciliation) hunk at rebaseline review and must be
  version-bumped. For a `keep-specific` row this is empty (the section is
  reproduced verbatim into each template, so its content does not change). For a
  `partial` row it is every affected skill **except** the one whose wording the
  canonical partial adopts (that skill renders byte-identical to its old
  content, so it is not bumped). The canonical-wording choice is named per row.

---

## Drift candidates (19)

### 1. Disposition Frontmatter

- **Decision:** `partial`
- **Reason:** `artifact-noun`
- **Affected skills:** review-code, review-implementation, review-lossless-mapping, review-plan, review-spec
- **Expected version-bump set:** review-implementation, review-lossless-mapping, review-plan, review-spec
- **Canonical wording:** review-code (the most generic variant; "for a `<finding>` finding, the `<disposing act>` is the record").
- **Absorption mechanism:** a defaulted template input `{{disposition-record}}` interpolated into the accept-and-revise bullet — review-code "a code-quality finding, the fix in a fresh implementation pass is the record"; review-implementation "an implementation finding, the fix in a fresh implementation pass"; review-plan "a spec-fault finding, the owner-approved amendment of the spec"; review-spec "the revision of the spec"; review-lossless-mapping "the revision of the document". The set-once / accept-revise-reject / open-by-parse / rationale machinery (86% identical) is plain shared prose. The two skills with a trailing lineage sentence (review-implementation, review-lossless-mapping) take it via an `::::if{condition=…}` block in the partial rather than a per-skill copy.
- **Note (reviewer attention):** this row is the closest `artifact-noun` call to a `semantic` reading. The disposing **act** differs (a fresh implementation pass vs an owner-approved spec amendment vs a follow-on discussion). It is judged `artifact-noun` because the act is *named* as a noun phrase inside an otherwise identical mechanism, not a different procedure the reviewer performs. If the rebaseline diff shows the absorbed clause changing a skill's instruction (not just its noun), demote this to `keep-specific`.

### 2. Lineage Folder and Filename

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** plan-loose, plan-strict, propose, spec
- **Expected version-bump set:** (none)
- **Why:** the plan variants assert the plan is "a versioned-artifact type, but the disposable one … carries no frontmatter at all"; propose and spec assert the opposite — "the version lives in frontmatter." The filename path token (`plan.md` / `proposal.md` / `spec.md`) is a noun, but the surrounding claims about frontmatter, versioning, and per-revision files are genuinely different facts per artifact type. More than a noun — keep separate.

### 3. Tier Awareness

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** plan-loose, plan-strict, propose, spec
- **Expected version-bump set:** (none)
- **Why:** the four-tier table is similar prose, but each skill draws a different conclusion from it: propose declares "the proposal stage is a tier-3 stage" and gives tier-3 escalation rules; spec declares "machine-checkable acceptance criteria are mandatory" at tier 2/3; plan-loose vs plan-strict differ on what makes "autonomous (strict) planning safe." The escalation instruction and the per-tier qualifiers are skill-specific behavior, not wording drift.

### 4. Failed commit

- **Decision:** `partial`
- **Reason:** `artifact-noun`
- **Affected skills:** implement, implement-plan, implement-plan-with-subagents
- **Expected version-bump set:** implement, implement-plan-with-subagents
- **Canonical wording:** implement-plan (the implementer-role, plan-task variant — closest to the median of the three at 92% similarity).
- **Absorption mechanism:** a defaulted `{{actor}}` input ("implementer" / "orchestrator") and `{{task-noun}}` ("implicit tasks" / "plan tasks") interpolated into the otherwise-identical BLOCKED-and-stop body. The subagents variant's one extra trailing sentence ("the `<actor>`'s job ends at the report; the user starts a fresh run after resolving the underlying issue") is gated by an `::::if{condition="${actor} == 'orchestrator'"}` block in the partial.
- **Note:** the 92% body is the BLOCKED/stop/do-not-retry rule, which is identical in substance across all three; only the actor and task nouns vary. Solidly `artifact-noun`.

### 5. Implementation Report

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** implement, implement-plan, implement-plan-with-subagents
- **Expected version-bump set:** (none)
- **Why:** the differences are substantive instructions, not nouns: the subagents variant adds "the orchestrator writes it directly … not delegated to a subagent," adds the `.wip/`-is-not-the-report clarification, rewrites the "what it captures" categories to fold in reviewer-surfaced deviations, and **drops** implement's assumptions-fold paragraph entirely. implement-plan adds the verify-stage-checks-against-spec clause. These change what the agent does, not just what an artifact is called.

### 6. No history rewriting

- **Decision:** `partial`
- **Reason:** `artifact-noun`
- **Affected skills:** implement, implement-plan, implement-plan-with-subagents
- **Expected version-bump set:** implement, implement-plan-with-subagents
- **Canonical wording:** implement-plan (carries the fuller phrasing — "even when the remote is behind," "not within this skill's mandate" — that the other two converge toward).
- **Absorption mechanism:** a defaulted `{{actor}}` input ("implementer" / "orchestrator") interpolated into the append-only / no-`--amend` / no-rebase / no-force-push body. The subagents-only sentence ("Subagents are also forbidden from history rewriting; the orchestrator's brief to each subagent names this constraint") is gated by an `::::if{condition="${actor} == 'orchestrator'"}` block.
- **Note (reviewer attention):** implement's variant is *slightly weaker* than the canonical wording it would adopt ("does not rebase in any form" vs "no `rebase` invocation in any form, even to clean up the local branch"). This is a wording strengthening, not a behavior change — both forbid all rebasing — so it is a category-(a) reconciliation hunk and implement is bumped. If a reviewer reads the strengthening as adding a new prohibition, re-confirm before bumping.

### 7. Dirty Worktree Handling

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** implement, implement-plan, implement-plan-with-subagents
- **Expected version-bump set:** (none)
- **Why:** the subagents variant restructures the rule around orchestration roles — "the orchestrator runs the check, NOT the implementer subagent," the implementer subagent assumes a clean tree, reviewer subagents trust the diff, subagents share the working tree. Those are whole added paragraphs assigning behavior to distinct roles, not a noun swap. The check ownership genuinely differs.

### 8. Plan Artifact Contract

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** adjust-plan-granularity, plan-loose, plan-strict
- **Expected version-bump set:** (none)
- **Why:** the four-property contract list (sequential / isolated / implementable / reviewable) is shared, but the framing and closing rules differ semantically: adjust-plan-granularity wraps it in granularity-shift logic ("a `looser` shift may collapse … a `stricter` shift may expand …") absent from the other two, and each of plan-loose / plan-strict closes with its own claim about how loose vs strict tasks satisfy the contract (substep prescriptiveness, per-task fields). The per-property bodies also carry shift-specific clauses in adjust-plan-granularity. More than a noun.

### 9. No Parallelization

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** adjust-plan-granularity, plan-loose, plan-strict
- **Expected version-bump set:** (none)
- **Why:** the forbidden-construct list is shared, but the behavior differs: adjust-plan-granularity adds a REFUSE-the-instruction rule for a target instruction that asks for parallelization; plan-loose/plan-strict instead say "loop back to the spec phase or open a separate discussion"; plan-strict adds a worked-example negative-test note. Different agent behavior, not wording drift.

### 10. Plan Deviation Policy

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** implement, implement-plan, implement-plan-with-subagents
- **Expected version-bump set:** (none)
- **Why:** the contract noun differs structurally — implement follows "the input or the implicit task list derived from it"; implement-plan follows "the plan"; the subagents variant adds an entire "Reviewer-surfaced deviations" bullet and the orchestrator-dispatch model, plus a plan-revision-routing paragraph that the bare `implement` variant lacks. These are different procedures, not a single artifact noun.

### 11. Task report block shape

- **Decision:** `partial`
- **Reason:** `artifact-noun`
- **Affected skills:** implement, implement-plan
- **Expected version-bump set:** implement-plan
- **Canonical wording:** implement (the implicit-task variant).
- **Absorption mechanism:** a defaulted `{{task-noun}}` input ("implicit task" / "plan task") interpolated into the final-out-message sentence and the closing tether ("understand what was done" / "understand what the plan accomplished"). At 97.5% similarity the only difference is the task noun and its one knock-on phrase; pure `artifact-noun`.

### 12. Log What Serves the Target

- **Decision:** `partial`
- **Reason:** `artifact-noun`
- **Affected skills:** discussion, seeded-discussion
- **Expected version-bump set:** seeded-discussion
- **Canonical wording:** discussion (uses "discussion" throughout).
- **Absorption mechanism:** a defaulted `{{session-noun}}` input ("discussion" / "walk") interpolated wherever the section names the session. At 96.4% similarity the sole difference is the discussion↔walk terminology for the same concept; the on-target/off-target logging rule is identical. Pure `artifact-noun` (terminology noun).

### 13. Scope Drift

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** discussion, seeded-discussion
- **Expected version-bump set:** (none)
- **Why:** the trigger differs by behavior, not noun: discussion fires on "a branch outside the topic this log is settling"; seeded-discussion fires on "a branch NOT in the seeded point list" and additionally forbids re-ordering the walk. The seeded variant is anchored to the seeded-point-list concept that only exists in seeded mode. Different condition — keep separate.

### 14. Two Modes

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** discussion, seeded-discussion
- **Expected version-bump set:** (none)
- **Why:** beyond the discussion↔walk noun, the cross-reference target differs (`## Decision Point Format` vs `## Loop`) and the seeded variant adds a behavioral note ("Disposing review findings … is usually practical mode") that ties mode selection to the seeded driver. The differing cross-ref would break if forced into one partial, and the added note is seeded-specific behavior.

### 15. Target-Scoped P-Numbering

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** discussion, seeded-discussion
- **Expected version-bump set:** (none)
- **Why:** the seeded variant adds a behavioral cross-reference ("A mid-walk tangent that is itself a real decision for a *different* target is handled by `## Scope Drift`, not folded in here") absent from discussion. The added routing rule is a real instruction, not the walk/discussion noun alone — keep separate per the tie-breaker.

### 16. Finish

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** discussion, seeded-discussion
- **Expected version-bump set:** (none)
- **Why:** the trigger condition differs semantically: discussion fires "when the user signals they want to stop"; seeded-discussion fires "when no seeded points remain (or the user wants to stop)" — the seeded-points-exhausted condition is specific to seeded mode. The summary/defer steps also differ ("deferred branches" vs "unresolved branches or out-of-scope items raised during the walk"). Different completion logic — keep separate.

### 17. Context-Rich Headers

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** discussion, seeded-discussion
- **Expected version-bump set:** (none)
- **Why:** lowest similarity of this family (73.8%). The MUST-name list is shared, but the embedded worked example differs in substance — discussion's example resolves "the token-refresh strategy"; seeded-discussion's example is "disposing the findings raised in the spec review," and its reference paths point at `reviews/` rather than generic cross-links. The example is load-bearing illustrative content tied to each mode's purpose. Under "when in doubt, keep separate," keep specific.

### 18. Review Record Shape — References-First

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** review-code, review-implementation
- **Expected version-bump set:** (none)
- **Why:** the six-section skeleton is shared, but the contents are different review disciplines: review-code judges against code-quality axes with `solid`/`mixed`/`weak` verdicts and single-citation evidence; review-implementation judges against five fidelity axes (acceptance-criteria coverage / constraint adherence / scope adherence / behavior fidelity / test coverage) with `delivers`/`partially delivers`/`does not deliver` verdicts and a mandatory two-citation evidence rule. These are genuinely different instructions, not nouns. (61.4% similarity.)

### 19. Frontmatter Status Contract

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** propose, spec
- **Expected version-bump set:** (none)
- **Why:** the lifecycle physics differ: a proposal has two terminal latches (`approved` / `rejected`) and **freezes at `approved`**; a spec has sequential latches (`approved` **then** `implemented`), **stays alive from `approved` until `implemented`**, counts `version` as completed review→revise cycles, and permits owner-approved record-backed amendments post-approval. Different state machines — the lowest-similarity drift candidate (57.6%). Keep separate.

---

## Divergent spec-named sections (2)

These two are named as headline partial candidates in the spec's Intended
outcome and Illustrative example, but the drift tool scores them *divergent*
(too many low-similarity variants) and omits them from `--drift`. They are
judged here against the same criterion, over the *full* set of skills that carry
them.

### 20. Commit Policy

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** open-thread, open-ticket, finish, record-verdict, whats-next, implement, implement-plan, implement-plan-with-subagents, merge-artifacts, adjust-plan-granularity, plan-loose, plan-strict, propose, review-code, review-implementation, review-lossless-mapping, review-plan, review-proposal, review-spec, spec
- **Expected version-bump set:** (none)
- **Why:** across all 20 skills this section encodes *opposite policies*, not one policy with a varying noun. The implement trio say "This skill auto-commits" and carry full cadence, baseline-gate, failed-commit, and no-history-rewriting subsections; the author/review/capture skills say "This skill NEVER auto-commits"; `finish` is a third policy ("does NOT auto-commit but DOES run git within the branch-disposition flow … never force-pushes"); `whats-next` writes nothing and commits nothing; `open-ticket` "never touches git" and writes no files; review skills add "this skill also does not modify the code under review." A single 20-skill partial would have to absorb auto-commit-vs-never-commit, which is semantic by definition. Keep specific.
- **Discrepancy flagged (important):** the plan and the Task-3 brief call `Commit Policy` "the canonical `artifact-noun` case" that "differs only by 'the spec artifact' / 'the emitted plan' / 'the review artifact'." That is true **only of a sub-family** — the author skills that "NEVER auto-commit … writing the `<artifact>` is where the skill stops" (propose → "the proposal artifact"; spec → "the spec artifact"; plan-loose / plan-strict → "the emitted plan"; the review skills → "the review artifact / review record"; merge-artifacts and adjust-plan-granularity also fit). That sub-family **is** an `artifact-noun` reconciliation and Task 5 may author a *narrower* shared partial (e.g. `never-commit-author.md`) covering only those skills, leaving the implement trio, `finish`, `whats-next`, `open-thread`, and `open-ticket` with their own inline Commit Policy. As a single section over all 20 it is `keep-specific`/`semantic`; the narrower never-commit-author partial is the actionable extraction.
- **If the narrower never-commit-author partial is authored** (a Task-5 decision, recorded here so the bump set is pre-computed): candidate members are propose, spec, plan-loose, plan-strict, adjust-plan-granularity, merge-artifacts, review-code, review-implementation, review-lossless-mapping, review-plan, review-proposal, review-spec. Several of these carry an extra trailing sentence that is genuinely skill-specific (review-code/-implementation: "does not modify the code under review"; merge-artifacts: the `.wip/` candidate-drafts clause; review-implementation/-plan/-proposal: their own `.wip/` notes) — those tails stay inline or behind a conditional. Canonical wording would be the bare "This skill NEVER auto-commits `{{commit-artifact}}`. Writing the file is where the skill stops. Any commit is the surrounding session's decision …" sentence (review-spec / review-lossless-mapping carry it cleanest), with `{{commit-artifact}}` defaulted per template. Bump set would be every member except the one whose exact wording the partial adopts. This is left for Task 5 to finalize against the actual partial.

### 21. Immutability

- **Decision:** `keep-specific`
- **Reason:** `semantic`
- **Affected skills:** open-thread, finish, record-verdict, implement, implement-plan, implement-plan-with-subagents, merge-artifacts, propose, review-code, review-implementation, review-lossless-mapping, review-plan, review-proposal, review-spec, spec
- **Expected version-bump set:** (none)
- **Why:** each skill's Immutability section states which artifacts *that skill* freezes and the mechanism, and these are genuinely different rules: open-thread freezes the seed (frozen narrative record) and the append-only ledger; finish freezes the spec via the `status.implemented` latch and appends one ledger line; record-verdict sets exactly one set-once lifecycle latch; the implement trio make *input artifacts* read-only and emit only an implementation report; merge-artifacts treats `.wip/` candidates read-only and obeys lifecycle physics on the canonical artifact; propose/spec describe their own alive-in-place-then-freeze lifecycle (proposal freezes at `approved`, spec at `implemented`); the review skills freeze the review *record* body at emission while keeping the disposition frontmatter live. There is no shared sentence to extract — the topic is identical but the content is per-skill. Semantic; keep specific.

---

## Summary

- **`partial` rows (5):** Disposition Frontmatter, Failed commit, No history rewriting, Task report block shape, Log What Serves the Target — all `artifact-noun`.
- **`keep-specific` rows (16):** Lineage Folder and Filename, Tier Awareness, Implementation Report, Dirty Worktree Handling, Plan Artifact Contract, No Parallelization, Plan Deviation Policy, Scope Drift, Two Modes, Target-Scoped P-Numbering, Finish, Context-Rich Headers, Review Record Shape — References-First, Frontmatter Status Contract, Commit Policy, Immutability — all `semantic`.
- **No row is `partial` with reason `semantic`** (the tie-breaker holds: every semantic section is `keep-specific`).
- **Note for Task 5:** the `Commit Policy` row, though `keep-specific` as a 20-skill section, identifies an actionable narrower `artifact-noun` sub-family (the never-commit author skills) that Task 5 may extract as a separate partial; see that row.
