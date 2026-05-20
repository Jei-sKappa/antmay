# Codebase Concerns

**Analysis Date:** 2026-05-20

## Tech Debt

**AGENTS.md deliverable-skill list is stale:**
- Issue: The "Deliverable skills — no preamble" section in `AGENTS.md` lists only four skills (`meta-prompting`, `consult-the-expert`, `report-to-the-owner`, `brief-the-implementer`), but `review-decision-document` also encodes and enforces the no-preamble rule ("The response IS the deliverable") in its Workflow step 5.
- Files: `AGENTS.md` (line 51), `skills/review-decision-document/SKILL.md` (line 80)
- Impact: A contributor adding or editing a skill consults `AGENTS.md` to understand the deliverable-skill convention, gets an incomplete list, and may not apply the pattern to a new skill that qualifies.
- Fix approach: Add `review-decision-document` to the parenthetical list in `AGENTS.md`. Audit other skills for the same gap when adding future deliverable skills.

**`derive-spec` survey-subagent contradiction (mandatory vs. optional):**
- Issue: Phase 2 of `derive-spec` states the survey subagent is dispatched "always, regardless of repo size" (line 216), but the `## Subagent briefs` section labels the same subagent "Survey subagent (Phase 2, optional) — Used only for large repos" (line 259).
- Files: `skills/derive-spec/SKILL.md` (lines 216 and 259)
- Impact: A model executing the skill receives contradictory instructions. Depending on how it resolves the conflict, it may skip the survey for small repos (violating the orchestrator discipline rule that forbids the orchestrator from reading the source directly) or always run it (correct behavior but not what the brief section says).
- Fix approach: Remove "optional" from the subagent-briefs heading and drop the "used only for large repos" qualifier. The phase description is the authoritative instruction; the briefs section should align.

**`afk-exploration` references an external skill (`the-fool`) not present in this repo:**
- Issue: `skills/afk-exploration/SKILL.md` (line 198) states that the reference files in `references/` "are adapted from the `the-fool` skill — see those files for the canonical method." `the-fool` skill does not exist in this repository; it lives in `.library/sources/Jeffallan_claude-skills/skills/the-fool`, which is a local reference-only clone excluded from distribution.
- Files: `skills/afk-exploration/SKILL.md` (line 198)
- Impact: A user reading the skill or a subagent receiving the brief cannot follow the "see those files" pointer. The four reference files in `skills/afk-exploration/references/` are self-contained, so the reference is only a documentation inaccuracy rather than a runtime breakage — but it is misleading.
- Fix approach: Remove or reword the pointer to `the-fool`. State that the references are self-contained adaptations with no external dependency.

**Skill output artifacts not gitignored — `docs/` pollution risk:**
- Issue: `discussion-loop` writes logs to `docs/discussions/`, `derive-spec` writes runs to `docs/derive-spec/`, and `afk-exploration` writes runs to `docs/afk-exploration/`. None of these paths appear in `.gitignore`. The `temp/` path is gitignored, and `temp/docs/discussions/` contains a real test artifact (`2026-05-16_03_test_review_discussion.md`), suggesting that at some point the output path was redirected into `temp/` to avoid committing it — but the canonical output paths in the skill bodies still point to `docs/`.
- Files: `.gitignore`, `skills/discussion-loop/SKILL.md` (line 31), `skills/derive-spec/SKILL.md` (line 42), `skills/afk-exploration/SKILL.md` (lines 29–53)
- Impact: Running any of these skills in a project's working directory risks accidentally committing generated research notes, discussion logs, or spec artifacts. For an end user, this is expected (the docs are deliberate deliverables); for this skills repo itself, test runs would pollute the commit history.
- Fix approach: Add `docs/discussions/`, `docs/derive-spec/`, and `docs/afk-exploration/` to `.gitignore` if they are not meant to be committed to this repo, or document explicitly that they are intentionally excluded from the repo's own `.gitignore` since end users manage their own repos.

**`temp/` directory contains development artifacts that may contain sensitive private notes:**
- Issue: `temp/` is gitignored, but it contains `private-notes/`, `scratchpad.md`, `session.txt`, and in-progress workflow design files. These are working notes with no formal lifecycle.
- Files: `temp/` (all contents)
- Impact: Low, since `temp/` is gitignored. Risk is limited to local exposure or accidental removal of useful working material. No security risk to published content.
- Fix approach: Periodic manual cleanup. Consider moving durable design decisions from `temp/` to the tracked `docs/threads/` structure defined by the agentic-workflow design decision.

## Known Bugs

**`afk-exploration` — `<skill-base>` path resolution is implicit:**
- Symptoms: The skill instructs the orchestrator to pass critique subagents an "absolute path" to reference files under `<skill-base>/references/`. However, `<skill-base>` is a placeholder — neither the skill body nor the harness defines how the orchestrator learns the skill's installation directory.
- Files: `skills/afk-exploration/SKILL.md` (lines 190–193, 222)
- Trigger: Any run where the orchestrator does not correctly infer or receive the install path of the `afk-exploration` skill. This is particularly risky when the skill is installed into a user project via `npx skills add` and the install path differs from the skill author's local layout.
- Workaround: The orchestrator can search for the reference files using a `find` call, but this is not instructed anywhere in the skill.

## Security Considerations

**No concerns identified.** This is a content-only repository (markdown skill definitions). There is no executable code, no secret handling, no API calls, and no build pipeline. The `.gitignore` correctly excludes `.library/`, which may contain cloned third-party repositories.

## Performance Bottlenecks

**Not applicable.** There is no runtime system; skills are prompt documents consumed by AI agents at invocation time. Latency is a model-execution concern, not a codebase concern.

## Fragile Areas

**`the-librarian` — thin SKILL.md delegates all logic to reference files:**
- Files: `skills/the-librarian/SKILL.md`
- Why fragile: The entire skill body is three bullet points that redirect the agent to `references/stock.md`, `references/consult.md`, and `references/research.md`. If a user installs only `the-librarian` via `npx skills add` and those reference files are not bundled correctly, the skill is non-functional with no fallback behavior described in the SKILL.md itself.
- Safe modification: Any behavior change requires editing the reference files; the SKILL.md itself cannot be the only file updated.
- Test coverage: No automated validation — correctness depends on reading the reference files and confirming they are coherent.

**`derive-spec` — global FR/NFR ID uniqueness depends on single-writer serialization:**
- Files: `skills/derive-spec/SKILL.md` (lines 35, 159–165, 240)
- Why fragile: The skill explicitly prohibits delegating the writing phase to subagents because "global ID consistency depends on a single writer." If a model ignores this constraint and parallelizes writing, FR/NFR IDs will collide or be non-sequential, breaking cross-references and open-question back-references.
- Safe modification: Writing must remain in the orchestrator's own context. The constraint is stated clearly, but it relies on model compliance rather than any structural enforcement.
- Test coverage: None. Correctness verified only by reading the generated spec.

## Scaling Limits

**Single `marketplace.json` plugin group:**
- Current capacity: All 9 skills are in a single `JeisKappa-skills` plugin group in `.claude-plugin/marketplace.json`.
- Limit: As the skill count grows, the single group will make `npx skills list` less navigable. The agentic-workflow design discussion (`docs/threads/260520095223Z-agentic-workflow/`) anticipates a bundled workflow set of skills that would benefit from their own group (e.g., `JeisKappa-workflow`).
- Scaling path: Add a second plugin entry to `marketplace.json` when workflow spine skills (planned in V1 workflow spec) are published. The AGENTS.md already documents the multi-group mechanism.

## Dependencies at Risk

**No external package dependencies.** This repo has no `package.json`, no lockfile, and no runtime dependencies. The only external dependency is the `skills.sh` / `vercel-labs/skills` distribution harness, which is consumed by end users, not by the repo itself.

## Missing Critical Features

**No validation or CI for skill coherence:**
- Problem: AGENTS.md explicitly states "There is no build, test, or lint pipeline — this is a content repository." Correctness is checked only by human review. Internal contradictions (e.g., the `derive-spec` survey-subagent "always vs. optional" conflict) can ship undetected.
- Blocks: Confident, automated detection of: name/directory mismatches, skills missing from `marketplace.json`, skills missing from README, frontmatter schema violations, version not bumped after a meaningful change.
- Priority: Medium — the skill set is small enough that manual review is feasible now, but this will become a reliability gap as the catalog grows.

**No documented install-verification procedure for `afk-exploration` reference files:**
- Problem: `afk-exploration` requires four reference files (`references/pre-mortem-analysis.md`, `references/red-team-adversarial.md`, `references/socratic-questioning.md`, `references/throwaway-prototyping.md`) to be installed alongside `SKILL.md`. There is no documentation in `AGENTS.md` or `README.md` confirming that the `npx skills add` harness bundles an entire skill directory (including subdirectories).
- Blocks: A user who installs `afk-exploration` and the harness does not bundle the `references/` subdirectory will get a skill that instructs subagents to read files that don't exist.
- Priority: High — silent failure mode at runtime with no error surfaced to the user.

## Test Coverage Gaps

**No automated tests of any kind:**
- What's not tested: Frontmatter schema validity, name/directory alignment, marketplace registration completeness, README completeness, version bump enforcement, internal cross-reference validity (links between sections within a skill).
- Files: All `skills/*/SKILL.md` files
- Risk: Regressions (duplicate skill names, skills missing from marketplace, internal contradictions) are caught only on manual review or at runtime when a user invokes the skill.
- Priority: Medium. A lightweight CI script checking frontmatter fields, directory-name/name-field alignment, and marketplace registration coverage would close the most likely failure modes without heavy tooling.

---

*Concerns audit: 2026-05-20*
