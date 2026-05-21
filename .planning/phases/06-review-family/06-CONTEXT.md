# Phase 6: Review Family - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning
**Mode:** Auto (smart-discuss batched — 10 new user-facing skills + legacy retirement; shared structural decisions)

<domain>
## Phase Boundary

Ship a target-specific review catalog covering 5 review targets — proposal, spec, plan, implementation, code — each with an `-auto` and `-interactive` variant (10 new skills). The legacy `review-decision-document` is retired with documented migration toward `review-spec-*` which inherits the handoff-grade bar from Phase 3. Adversarial review is delegated to the external `the-fool` skill — no native V1 adversarial-review skill. Verification of implementations is covered by `review-implementation-*`, replacing the V1 `verify-*` role.

**In scope (Phase 6):**
- `skills/review-proposal-auto/SKILL.md` — NEW [REVW-01, REVW-06]
- `skills/review-proposal-interactive/SKILL.md` — NEW [REVW-01, REVW-07, REVW-08]
- `skills/review-spec-auto/SKILL.md` — NEW [REVW-02, REVW-06] — evolves the handoff-grade-bar logic from legacy `review-decision-document`
- `skills/review-spec-interactive/SKILL.md` — NEW [REVW-02, REVW-07, REVW-08]
- `skills/review-plan-auto/SKILL.md` — NEW [REVW-03, REVW-06]
- `skills/review-plan-interactive/SKILL.md` — NEW [REVW-03, REVW-07, REVW-08]
- `skills/review-implementation-auto/SKILL.md` — NEW [REVW-04, REVW-06]
- `skills/review-implementation-interactive/SKILL.md` — NEW [REVW-04, REVW-07, REVW-08]
- `skills/review-code-auto/SKILL.md` — NEW [REVW-05, REVW-06]
- `skills/review-code-interactive/SKILL.md` — NEW [REVW-05, REVW-07, REVW-08]
- `skills/review-decision-document/SKILL.md` — RETIRED (rewritten as deprecation notice; folder kept on disk; removed from `JeisKappa-skills.skills`, `.vscode/settings.json` scopes, and `README.md` "Available skills"; added to "Retired skills" subsection with date and forward pointer to `review-spec-auto`/`review-spec-interactive`)
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` 19 → 29 (gains 10); `JeisKappa-skills.skills` 8 → 7 (loses review-decision-document)
- `.vscode/settings.json` — `."conventionalCommits.scopes"` 27 + 10 − 1 = 36 (alphabetically sorted)
- `README.md` — "Available skills" 27 + 10 − 1 = 36 entries; "Retired skills" subsection gains `review-decision-document` bullet alongside existing `discussion-loop`
- `README.md` — adds two short documentation notes:
  - One inside (or near) `review-implementation-*` entries stating `review-implementation-*` covers the V1 verification role (no separate `verify-*` skill) per D85, REVW-09 contract
  - One next to the review entries noting that adversarial review is delegated to the external `the-fool` skill (no native V1 adversarial review) per D88, REVW-09 contract

**Out of scope (Phase 6):**
- Merge / Finish / Navigation / Distribution surface (Phase 7)
- README hybrid (Phase 7) — Phase 6 keeps the simple-list shape and only adds the two short documentation notes
- Native adversarial-review skill — V2 [D88]
- `review-plan-with-subagents-*` (multi-angle specialist reviewers) — V2 [D83]
- Cross-thread review aggregation — out of scope V1

</domain>

<decisions>
## Implementation Decisions

### Common review skill shape (all 10 new skills)
- **Auto variants** produce findings-first reports written to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` (record form per Phase 1 grammar) [D90, D91, REVW-06].
  - Body structure: `## Verdict` → `## Findings` (with severity tag per finding: e.g. blocker/issue/nit) → `## Evidence` (cite file:line where applicable) → `## References` (the artifact reviewed + any related decision logs by path + D<N>) → `## Open Questions` → `## Next Actions`.
  - Always emit ONE record per review run. Multiple findings live in one file.
- **Interactive variants** produce a decision log written to `discussions/<UTC>-<kebab-desc>-decision-log.md` (record form per Phase 1 grammar + `decision-log` artifact-type token per D94) [D89, D92, REVW-07, REVW-08].
  - Walk one finding/topic/component at a time. Per D89, the skill body explicitly says "ask the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept".
  - Per D92/D95: resolved or rejected findings remain in the decision log only. Unresolved actionable findings (accepted/deferred/parked) are dumped to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` at the END of the session — and ONLY if there are unresolved findings. NO Inbox file if nothing remains.
  - Anti-sycophancy stance (4 markers from `discussion/SKILL.md`) preserved verbatim in all 5 interactive skills.

### Target-specific review logic [D81]
- **review-proposal-***: lightweight check — gaps, risks, ambiguities, optional adversarial pressure (delegate to external `the-fool` skill per D88) [REVW-01].
- **review-spec-***: handoff-grade bar — verify all 8 D50 semantic-contract elements present and coherent (intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance). The skill body cites Phase 3's `spec-auto/SKILL.md` and `spec-interactive/SKILL.md` by absolute path as the "specification of what a handoff-grade spec must contain". This is the evolved logic from legacy `review-decision-document` [D82, REVW-02].
- **review-plan-***: source-spec adherence + project conventions + granularity-fit + (for strict plans) per-task ambiguity check [D83, REVW-03]. The skill body explains how to detect loose-vs-strict from the input plan and apply the appropriate checks.
- **review-implementation-***: code-vs-original-intent fidelity check — does the implementation deliver what the source artifact (spec / proposal / plan / issue) said it would? Replaces V1 `verify-*` per D85 [REVW-04].
- **review-code-***: general-purpose code review independent of spec/plan — quality, safety, idioms, testability. [D86, REVW-05].

### Legacy `review-decision-document` retirement [REVW-02, REVW-09, D82]
- **SOFT retire** — same pattern as Phase 2's discussion-loop retirement.
- `skills/review-decision-document/SKILL.md` body REWRITTEN to a short deprecation notice (≤50 lines):
  - Names both replacements (`review-spec-auto`, `review-spec-interactive`) with install snippets
  - Notes that pre-existing review notes / documents reviewed by the legacy skill remain valid — no migration of past artifacts
  - States that the legacy skill's "handoff-grade bar" logic now lives in `review-spec-*` against Phase 3's locked spec contract
  - Frontmatter `version` bump from `1.1.0` → `2.0.0` (semver MAJOR for behavioral removal)
- `.claude-plugin/marketplace.json` — `./skills/review-decision-document` REMOVED from `JeisKappa-skills.skills`.
- `.vscode/settings.json` — `review-decision-document` REMOVED from `."conventionalCommits.scopes"`.
- `README.md` — `### review-decision-document` block REMOVED from "Available skills"; an entry added to the existing "Retired skills" subsection naming `review-decision-document` and pointing to the replacements with retirement date `2026-05-21`.

### README documentation notes [REVW-09]
- ONE short note (≤3 lines) inline with the `review-implementation-*` README entries (or in a small subsection above them): "V1 verification of implementations is covered by `review-implementation-*` — there is no separate `verify-*` skill."
- ONE short note (≤3 lines) near the review entries OR inline with the proposal/spec entries: "V1 adversarial review is delegated to the external `the-fool` skill — no native V1 adversarial-review skill. Use `the-fool` against a spec or proposal draft to surface adversarial risks."
- Both notes are SHORT and non-disruptive — the full README hybrid (toolbox model, layered map, recommended paths) is still Phase 7.

### Skill body voice and structure
- **Voice:** Match Phase 4/5 spine skills. Dense, declarative, citation-first, no preamble.
- **Anti-sycophancy stance:** All 5 interactive skills (`review-proposal-interactive`, `review-spec-interactive`, `review-plan-interactive`, `review-implementation-interactive`, `review-code-interactive`) carry the 4 markers from `discussion/SKILL.md` verbatim. Review stance amplifier: "A review is most valuable when it disagrees with the author — push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back."
- **D93 application:** Already covered above — interactive variants write the decision log (because they ARE conversational review skills, this is core, not a side artifact).
- **Citations:** Each skill body cites Phase 1 canonical docs by absolute path (`docs/workflow/v1/filename-grammar.md` for the filename grammar of the artifact it WRITES; `docs/workflow/v1/thread-layout.md` for the inbox/open/ and discussions/ targets). `review-spec-*` skills additionally cite `skills/spec-auto/SKILL.md` and `skills/spec-interactive/SKILL.md` by absolute path as the spec contract source.
- **Frontmatter:** Standard V1 — `name`, `description` with "Use when…" + mode, `metadata.author: https://github.com/Jei-sKappa`, `metadata.version: 1.0.0`.

### Plan grouping (meta — for this phase's plans)
- **5-plan proposal (paired per target type):**
  - Plan 06-01: `review-proposal-auto` + `review-proposal-interactive` + 3 shared registration touchpoints
  - Plan 06-02: `review-spec-auto` + `review-spec-interactive` + 3 shared registration touchpoints + `review-decision-document` retirement (SKILL.md rewrite + 3 reverse-registration touchpoints + 1 Retired-skills subsection update)
  - Plan 06-03: `review-plan-auto` + `review-plan-interactive` + 3 shared registration touchpoints
  - Plan 06-04: `review-implementation-auto` + `review-implementation-interactive` + 3 shared registration touchpoints + the SHORT verification-note added to README
  - Plan 06-05: `review-code-auto` + `review-code-interactive` + 3 shared registration touchpoints + the SHORT adversarial-review-delegation note added to README
- Plan 06-02 is the largest (it ships the new spec-review pair AND retires the legacy skill in one atomic plan since the migration is conceptually tied to the replacement).
- The README short documentation notes are distributed across plans 06-04 (verification note) and 06-05 (adversarial note) to keep each plan's README work minimal.
- Sequential waves (parallelization=false; shared-file deps on marketplace/scopes/README).
- **Alternative 6-plan version:** Split Plan 06-02 into 06-02a (new spec review pair) and 06-02b (legacy retirement). Default is 5-plan version.

### Claude's Discretion
- Exact wording of findings-first report sections, severity tag values, decision-log walk format, anti-sycophancy stance amplifier — at executor's discretion.
- Whether to inline the verification note and adversarial-review note as separate small subsections in README or attach them inline to the relevant skill descriptions — at executor's discretion, provided REVW-09 visibility is satisfied.
- Whether to include a 1-line "delegate to the-fool" hint inside `review-proposal-*` and `review-spec-*` skill bodies in addition to the README note — recommended yes (the skill body is where the user reading the description will look), but optional.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `skills/review-decision-document/SKILL.md` — direct prior art for `review-spec-*`. The "stress-tests against the bar that a recipient could deliver the same work the author had in mind" framing is what D82 evolves into the handoff-grade bar.
- `skills/discussion/SKILL.md` — anti-sycophancy stance source for all 5 interactive variants.
- `skills/seeded-discussion/SKILL.md` — Loop/Logging pattern source for interactive review's per-finding walk (parallels seeded-discussion's per-point walk).
- Phase 3 `skills/spec-auto/SKILL.md` and `skills/spec-interactive/SKILL.md` — the 8-element handoff-grade semantic contract `review-spec-*` checks against.
- Phase 4 `skills/plan-loose-auto/SKILL.md` and `skills/plan-strict-auto/SKILL.md` — the loose/strict plan shape `review-plan-*` evaluates.
- Phase 5 `implement-*` SKILL.md files — implementation outcomes `review-implementation-*` reviews.
- `docs/workflow/v1/filename-grammar.md` — review artifact filename grammar (review-finding for auto outputs; decision-log for interactive outputs).
- `docs/workflow/v1/thread-layout.md` — inbox/open/ and discussions/ folders.

### Established Patterns
- Pair plans (auto + interactive) with shared registration touchpoints — proven across Phase 3/4/5.
- Soft retire pattern — proven in Phase 2's `discussion-loop` retirement.
- V1 spine skills under `JeisKappa-workflow`; legacy skills under `JeisKappa-skills`.
- New skill folder = four touchpoints per CLAUDE.md.
- Frontmatter version 1.0.0 for new skills; legacy soft-retire bumps semver MAJOR.

### Integration Points
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` currently 19 entries; Phase 6 adds 10 → final 29. `JeisKappa-skills.skills` currently 8; Phase 6 loses review-decision-document → final 7.
- `.vscode/settings.json` `."conventionalCommits.scopes"` — currently 27 entries; Phase 6 adds 10, removes 1 → final 36. Alphabetical sort.
- `README.md` "Available skills" — currently 27 entries; Phase 6 adds 10, removes 1 → final 36. "Retired skills" subsection currently has `discussion-loop` entry; Phase 6 adds `review-decision-document` entry alongside.

</code_context>

<specifics>
## Specific Ideas

- Findings-first report severity tags: suggest `blocker` / `issue` / `nit` as the V1 standard (lowercase, sortable, simple). Skill body MAY specify these or leave to executor.
- Interactive review's per-finding walk should reuse the four-element option presentation from `seeded-discussion`: Decision / What you need to know / Options / Recommendation. This is the V1 standard for "we have concrete alternatives at a decision point".
- `review-implementation-*` body should explicitly cite the source artifact types it reviews against: spec / proposal / plan / issue / Inbox item — same 4–5 input forms as Phase 5's `implement-*` skills. The review's job is "does the diff implement what THIS source artifact said it would?".
- `review-code-*` body should NOT require a source artifact — it's general-purpose code review per D86. The skill body asks the user for any specific concerns/areas but does not block on missing spec/plan input.
- Severity tag for `review-spec-*` findings against the 8 D50 elements: missing element = `blocker`; partially-covered element = `issue`; vague-but-present element = `nit`. Skill body suggests this mapping.

</specifics>

<deferred>
## Deferred Ideas

- Native adversarial-review skill — V2 [D88]
- `review-plan-with-subagents-*` (multi-angle specialist reviewers) — V2 [D83]
- Cross-thread review aggregation — V2
- Auto-fix from review findings (chain review-*-auto → implement-*) — out of scope V1
- Review-finding lifecycle skills (move from open → processed/dropped) — out of scope V1 (lifecycle is manual)

</deferred>
