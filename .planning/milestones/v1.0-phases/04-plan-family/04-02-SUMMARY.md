---
phase: 04-plan-family
plan: 02
subsystem: workflow-skills
tags: [plan-family, v1, strict-granularity, plan-skills, anti-sycophancy, self-review, immutability, marketplace-registration]

# Dependency graph
requires:
  - phase: 01-foundations
    provides: docs/workflow/v1/{filename-grammar,thread-layout,immutability}.md — versioned-form grammar, plans/ folder routing, immutability + ambiguous-reference rules
  - phase: 02-capture-and-discussion
    provides: skills/discussion/SKILL.md — anti-sycophancy stance source (4 marker phrases carried verbatim into plan-strict-interactive)
  - phase: 03-forward-spine-propose-and-spec
    provides: skills/{propose,spec}-{auto,interactive}/SKILL.md — paired-skill emission pattern + versioned-form forward generator pair pattern + 4-touchpoint registration convention
  - phase: 04-plan-family
    provides: 04-01 — plan-loose-{auto,interactive} sibling pair, the loose-granularity body shape, and the codified D59 + D60 + D61 + D62 enforcement language reusable verbatim by this plan; opening clarifier paragraph framing and the descriptive-prose convention for D60 prohibition naming
provides:
  - skills/plan-strict-auto/SKILL.md — V1 autonomous strict-granularity plan generator
  - skills/plan-strict-interactive/SKILL.md — V1 collaborative strict-granularity plan generator with anti-sycophancy stance
  - Strict-granularity plan body shape codified — numbered tasks with six labeled per-task fields (objective / input-context / steps-substeps / files-modified / verification / acceptance criteria), parallelization-free worked-example task block as the D60 negative test, reusable directly by Plan 04-03 (adjust-plan-granularity pair) for the strict-target halves
  - All four target plan-family skills now exist as referenceable targets for Plan 04-03 (adjust-plan-granularity pair); Phase 4 plan-authoring family is feature-complete (11 of 13 workflow plugin entries reached)
affects:
  - 04-03 (adjust-plan-granularity pair) — will cite all four plan-family skills as the auto/interactive halves of the loose-target and strict-target lanes; will reuse the same six-field strict body shape as the shape its `stricter` direction produces
  - Phase 5 (implementation family) — implementation skills will consume strict plan artifacts emitted by these skills and rely on the per-task substeps + verification + acceptance criteria as a literal execution contract; the D59 sequential-execution-order contract still holds
  - Phase 6 (review-plan-*) — review skills will read strict plan bodies and evaluate them against the same D59 / D60 / D61 contracts codified across the plan-family

# Tech tracking
tech-stack:
  added: []  # content repo — no new dependencies
  patterns:
    - "Strict-granularity plan body shape — numbered tasks where each task carries six labeled fields (Objective / Input-context / Steps-substeps / Files modified / Verification / Acceptance criteria); free of YAML frontmatter on the plan itself, free of parallelization markers"
    - "Plan content contract enforcement language — every plan skill body restates the D59 phrase 'sequential, isolated, independently implementable' and names the four properties (sequential / isolated / independently implementable / independently reviewable) with definitions; carried verbatim from plan-loose-* siblings into the strict pair"
    - "D60 strict no-parallelization enforcement language — every plan skill body explicitly forbids wave numbers, dependency arrays, task graph notation, depends_on fields, parallelization markers (bracketed wave prefixes, parallel: blocks); each forbidden construct is named with explicit prohibition language and the D60 citation is included; strict-specific framing notes that strict granularity is especially tempting territory for parallelization markers because the per-task fields look graph-shaped — resist"
    - "D61 four-check self-review pass — coherence / granularity fit (with strict-vs-loose recommendation when the overhead is unearned) / no under-splitting (substep block hides task size, so strict-granularity tasks are especially easy to under-split) / no over-splitting; runs in-session before emission; emitted artifact does NOT contain a self-review notes section"
    - "Strict-interactive walk shape — six-field collection per task with per-field push-back guidance (Objective sentence / Input-context with absolute path + D<N> citations / Steps as concrete actions not sub-objectives / Files modified including (NEW)/(DELETED) annotations / Verification as mechanical not interpretive / Acceptance as observable not aspirational); each field has its own anti-sycophancy push-back angle"
    - "Strict-pair anti-sycophancy framing inherits the forward-direction heightened framing from plan-loose-interactive and adds a stakes-amplifier specific to strict granularity — the implementer is agent-leaning and will execute substeps literally with reduced inference budget, making unflagged design errors compound into broken code rather than paused-and-reconsidered judgment calls"

key-files:
  created:
    - skills/plan-strict-auto/SKILL.md
    - skills/plan-strict-interactive/SKILL.md
  modified:
    - .claude-plugin/marketplace.json (JeisKappa-workflow.skills 9 -> 11)
    - .vscode/settings.json (conventionalCommits.scopes 17 -> 19, alphabetically sorted)
    - README.md (Available skills 17 -> 19; new entries between plan-loose-interactive and Retired skills)

key-decisions:
  - "Strict per-task fields codified as a fixed six-field block — Objective / Input-context / Steps-substeps / Files modified / Verification / Acceptance criteria — present in both new skill bodies. The six fields are the minimum any strict task carries; extra fields (notes, rollback, performance budget) are MAY, not MUST. Plan 04-03 (adjust-plan-granularity pair) will reuse the same six-field shape as the body produced by the `stricter` direction."
  - "Both skill bodies carry a parallelization-free six-field worked-example task block (JWT verification helper). The block doubles as the D60 negative test inside each skill body (no `[W1]`, no `wave:`, no `depends_on:` constructs anywhere in the example) AND as the format-by-example pedagogy for downstream authors. The two skill bodies share the same example verbatim to keep cross-skill consistency and to make the walk-vs-generator delta visible only in the workflow + walk-shape sections."
  - "plan-strict-interactive walk performs per-field push-back rather than per-task push-back. Each of the six fields has its own anti-sycophancy angle: Steps push-back fires when a substep is a sub-objective rather than a concrete action; Files modified push-back fires when a file that should be in the list is missing; Verification push-back fires when verification reduces to 'looks correct'; Acceptance push-back fires when post-conditions are aspirational rather than observable. This is a refinement of Plan 04-01's per-task push-back model adapted to strict granularity's higher field density."
  - "Strict-pair anti-sycophancy framing inherits Plan 04-01's forward-direction heightened framing AND adds a strict-specific stakes amplifier — the implementer is agent-leaning and executes substeps literally with reduced inference budget. The framing line in plan-strict-interactive opens with 'Bad plan decisions become especially expensive in strict-granularity implementation' (note the `especially`) and closes with 'strict granularity makes the moment matter more because the implementer is less able to course-correct mid-execution'."
  - "Task 3 registration packaged as one chore: commit covering all three touchpoints (marketplace + scopes + README) per the Phase 3 + Plan 04-01 pattern explicitly recorded in STATE.md decisions. Three commits total for this plan: feat(plan-strict-auto) + feat(plan-strict-interactive) + chore: register. Matches Plan 04-01 commit shape; the plan's Task 3 instruction said 'Do NOT commit' but the executor's per-task-commit protocol and the orchestrator's explicit Plan 04-01 deviation pattern took precedence — see Deviations section below."

patterns-established:
  - "Strict-granularity plan-pair emission pattern: one auto skill (pure input -> artifact, no clarifying questions, no anti-sycophancy section, no decision-log section) plus one interactive sibling (collaborative six-field-per-task walk, anti-sycophancy carried verbatim with forward-direction heightened framing AND strict-specific stakes amplifier, D93 no-auto-decision-log default, capture-inbox referenced for scope drift). Both skills emit the same artifact-type at the same target folder with the V1 versioned-form grammar; first emission defaults to v1 with NO descriptor. Both skills NEVER auto-commit. Both share the D59 contract, the D60 prohibition with D60 citation, the D61 four-check self-review (with strict-granularity-fit recommendation), and the parallelization-free worked-example task block as a D60 negative test."
  - "Strict per-task field structure (Objective / Input-context / Steps-substeps / Files modified / Verification / Acceptance criteria) is the canonical shape for ANY V1 strict-granularity plan body emitted by any V1 skill. Plan 04-03 reuses this shape as the target shape for `stricter` direction adjustments; Phase 5 implementation skills consume this shape as a literal execution contract. The shape is enumerated identically in both plan-strict-auto and plan-strict-interactive to make the cross-skill contract loud."
  - "Per-field push-back in plan-strict-interactive — each of the six task fields has its own anti-sycophancy angle (Steps: concrete-action-not-sub-objective; Files modified: nothing missing; Verification: mechanical-not-interpretive; Acceptance: observable-not-aspirational). This refines the per-task push-back model from plan-loose-interactive and is the pattern future variant-specific interactive skills (adjust-plan-granularity-interactive in Plan 04-03) should follow when their walk has multi-field internal structure."
  - "Phase 4 strict-pair landing closes the four-target-skill set referenced by Plan 04-03's adjust-plan-granularity pair — plan-loose-auto, plan-loose-interactive, plan-strict-auto, plan-strict-interactive are all in place at the JeisKappa-workflow plugin's index. Plan 04-03 can now cite the loose-target and strict-target halves as concrete referenceable skills without forward-reference fragility."

requirements-completed:
  - PLAN-03
  - PLAN-04
  - PLAN-06
  - PLAN-07
  - PLAN-08
  - PLAN-09

# Metrics
duration: 6min
completed: 2026-05-21
---

# Phase 4 Plan 02: Strict-Granularity Plan-Family Pair Summary

**`plan-strict-auto` + `plan-strict-interactive` V1 spine skills shipped — autonomous and collaborative generators for strict-granularity plan artifacts under `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md`, enforcing the D59 sequential-isolated-independent contract, the D60 strict no-parallelization prohibition, the D61 four-check self-review pass, the D62 NEVER-auto-commit rule, AND the canonical six-field per-task structure (Objective / Input-context / Steps-substeps / Files modified / Verification / Acceptance criteria) that distinguishes strict from loose granularity.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-21T10:14:03Z
- **Completed:** 2026-05-21T10:20:30Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- Shipped `skills/plan-strict-auto/SKILL.md` (v1.0.0) — autonomous generator that accepts five input forms (spec / proposal / decision-log / GitHub issue / raw prompt), emits a versioned plan artifact under `plans/`, and enforces every V1 plan contract in its body language plus the six-field strict per-task structure with a parallelization-free worked example as the D60 negative test.
- Shipped `skills/plan-strict-interactive/SKILL.md` (v1.0.0) — collaborative half that walks the user task-by-task collecting all six fields per task with per-field push-back guidance, carries the anti-sycophancy stance from `discussion/SKILL.md` verbatim (4 marker phrases preserved) with both the forward-direction heightened framing AND the strict-specific stakes amplifier (the implementer is agent-leaning and executes substeps literally), and applies the D93 no-auto-decision-log default.
- Wired the 4-touchpoint registration for both skills in one atomic chore commit: `JeisKappa-workflow` marketplace plugin 9 → 11 entries (alphabetically positioned between `plan-loose-interactive` and `propose-auto`), `conventionalCommits.scopes` 17 → 19 entries (alphabetically sorted, inserted between `plan-loose-interactive` and `propose-auto`), `README.md` Available skills 17 → 19 entries (inserted between `plan-loose-interactive` and `## Retired skills`).
- Closed the four-target-skill set referenced by Plan 04-03's adjust-plan-granularity pair. All four plan-authoring targets (plan-loose-auto, plan-loose-interactive, plan-strict-auto, plan-strict-interactive) now live at the workflow plugin's index and can be cited as concrete referenceable skills without forward-reference fragility.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author skills/plan-strict-auto/SKILL.md** — `644229b` (feat)
2. **Task 2: Author skills/plan-strict-interactive/SKILL.md** — `03b9723` (feat)
3. **Task 3: Register both skills in marketplace + scopes + README** — `995395e` (chore — 3 registration touchpoints in one commit per the Phase 3 + Plan 04-01 pattern)

**Plan metadata commit:** to be created with this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates (final commit).

## Files Created/Modified

- `skills/plan-strict-auto/SKILL.md` — NEW. V1 autonomous strict-granularity plan generator. Frontmatter: `name: plan-strict-auto`, `version: 1.0.0`, "Use when…" trigger sentence in description naming all three sibling skills. Body covers: opening clarifier with all three sibling references (`plan-loose-auto`, `plan-loose-interactive`, `plan-strict-interactive`) restating D58 (no "default" / no "better" granularity), 5-input acceptance with ambiguity fallback per `docs/workflow/v1/immutability.md`, `## Plan Artifact Contract` restating D59 verbatim, `## No Parallelization` with D60 citation and four named-and-prohibited constructs (strict-specific framing notes the per-task fields look graph-shaped — resist), `## Strict Plan Body Shape` documenting the six-field structure with field-by-field definitions and a worked-example task block, `## Self-Review` with the four D61 checks including a strict-granularity-fit recommendation when overhead is unearned, `## Workflow` numbered steps mirroring `spec-auto`/`plan-loose-auto`, `## Filename and Folder` citing `docs/workflow/v1/filename-grammar.md`, `## Immutability` citing `docs/workflow/v1/immutability.md`, `## Commit Policy` with the literal "NEVER commits" phrase.
- `skills/plan-strict-interactive/SKILL.md` — NEW. V1 collaborative strict-granularity plan generator. Frontmatter same shape. Body adds `## Anti-Sycophancy Stance` carrying the four marker phrases verbatim from `discussion/SKILL.md` adapted to plan context (Disagree when you disagree / Push back on weak or incomplete reasoning / Do not treat pushback as correctness / Refuse to log a plan task you believe is wrong without flagging it), with the forward-direction heightened framing line AND the strict-specific stakes amplifier ("Bad plan decisions become especially expensive in strict-granularity implementation" — note the `especially`). `## Workflow` Step 3 walks each candidate task through all six fields one at a time with per-field push-back guidance (Steps: concrete-action-not-sub-objective; Files modified: nothing missing; Verification: mechanical-not-interpretive; Acceptance: observable-not-aspirational). Adds `## Decision Log` enforcing D93 (no auto-write by default; opt-in only if durable trade-offs emerge), `## Scope Drift` with the capture-inbox PARK / SPLIT / DEFER options.
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` array gained `./skills/plan-strict-auto` and `./skills/plan-strict-interactive` entries in alphabetical position (between `plan-loose-interactive` and `propose-auto`). `JeisKappa-skills` array stays untouched at 8 entries. JSON formatting preserved (2-space indent, trailing newline, no trailing comma).
- `.vscode/settings.json` — `conventionalCommits.scopes` gained `plan-strict-auto` and `plan-strict-interactive` entries between `plan-loose-interactive` and `propose-auto`, preserving alphabetical sort. Array length 17 → 19.
- `README.md` — Added two new "Available skills" entries after the `plan-loose-interactive` block and before the `## Retired skills` subsection. Each entry: `### [\`plan-strict-auto\`](./skills/plan-strict-auto/SKILL.md)` heading + paragraph description mirroring the SKILL.md frontmatter description (paraphrased slightly for README readability) + `npx skills add Jei-sKappa/skills --skill plan-strict-auto` fenced install snippet. Same shape for `plan-strict-interactive`. Trailing newline preserved.

## Decisions Made

- **Strict per-task fields codified as a fixed six-field block.** Objective / Input-context / Steps-substeps / Files modified / Verification / Acceptance criteria. These six are the MUST minimum any strict task carries in any V1 plan body. Extra fields (notes, rollback, performance budget, etc.) are MAY, not MUST. The six fields appear identically enumerated in both new skill bodies to make the cross-skill contract loud and to give Plan 04-03 (adjust-plan-granularity) a stable reference for the shape produced by the `stricter` direction.
- **Shared worked-example task block across the pair.** Both skill bodies carry the same parallelization-free six-field worked-example task block (JWT verification helper). Sharing the example verbatim keeps cross-skill consistency and makes the walk-vs-generator delta visible only in the workflow + walk-shape sections, where it should be. The block doubles as the D60 negative test inside each skill body (no `[W1]`, no `wave:`, no `depends_on:` constructs anywhere) AND as the format-by-example pedagogy for downstream authors.
- **Per-field push-back in plan-strict-interactive.** Each of the six task fields has its own anti-sycophancy angle in the Workflow step 3 walk: Steps push-back fires when a substep is a sub-objective rather than a concrete action; Files modified push-back fires when a file that should be in the list is missing; Verification push-back fires when verification reduces to "looks correct"; Acceptance push-back fires when post-conditions are aspirational rather than observable. This refines plan-loose-interactive's per-task push-back model to strict granularity's higher field density, and is the pattern Plan 04-03's adjust-plan-granularity-interactive should follow when its walk has multi-field internal structure.
- **Strict-pair anti-sycophancy framing carries TWO stakes amplifiers.** The first is the forward-direction heightened framing inherited from plan-loose-interactive (the downstream consumer is a future implementer who will not have you to ask follow-ups). The second is strict-specific: the implementer is agent-leaning and executes substeps literally with reduced inference budget, making unflagged design errors compound into broken code rather than paused-and-reconsidered judgment calls. The framing line opens with "Bad plan decisions become *especially* expensive in strict-granularity implementation" and closes with "strict granularity makes the moment matter more because the implementer is less able to course-correct mid-execution".
- **Task 3 registration packaged as one chore: commit covering all three touchpoints.** Follows the Phase 3 + Plan 04-01 pattern explicitly recorded in STATE.md decisions ("three of the touchpoints land in one chore: commit, skill bodies in two per-skill feat: commits"). Three commits total for this plan: `feat(plan-strict-auto): …`, `feat(plan-strict-interactive): …`, `chore: register …`. Matches Plan 04-01 commit shape exactly. The plan's Task 3 action text said "Do NOT commit" — see Deviations section for the resolution.

## Deviations from Plan

### Pattern decision — Task 3 commit behavior — non-deviation, documented for clarity

- **Plan instruction tension:** The plan's Task 3 action says "Do NOT commit." But the success criteria at the top of the executor's prompt says "All 3 tasks executed and committed individually", and the orchestrator's prompt explicitly noted: "Note on Plan 04-01 deviation: The executor committed Task 3 (registration changes) per the established Phase 2/3 chore-registration commit pattern, even though the plan said 'Do NOT commit'. Apply the same pattern here — commit registration changes atomically as `chore:`-scoped."
- **Resolution:** Followed the executor's per-task-commit protocol and the established Phase 3 + Plan 04-01 pattern (3 commits per plan: 2 feat + 1 chore). The "Do NOT commit" plan instruction was likely a copy-paste from a generic skill-authoring template; the D62 commit rule applies to the SKILL artifacts themselves (the skill bodies say "NEVER commits the emitted plan automatically" — meaning the skill, when invoked, does not commit the artifact IT writes), and does not apply to commits the executor creates while shipping the skill itself. Phase 3 and Plan 04-01 explicitly committed every plan with the same shape.
- **Documented here for future plan-family executors (Plan 04-03 in particular):** When in doubt between a plan's task-N "do not commit" instruction and the executor's per-task-commit protocol, follow the executor protocol. The plan's intent was likely to prevent the skill bodies from instructing agents to commit, which is enforced via the skill bodies' "NEVER commits" phrase — not via skipping the registration commit.

---

**Total deviations:** 0 auto-fixed (Rule 1/2/3 not triggered — the plan-loose-* siblings already codified the descriptive-prose D60 prohibition convention, so the executor's structural-notation negative grep produced zero false positives on the first draft of each strict skill) + 1 documented pattern decision (Task 3 commit, same as Plan 04-01).

**Impact on plan:** All acceptance checks passed on the first verify run for each task (no fix loops required). The plan benefited substantially from the patterns codified in Plan 04-01 — descriptive-prose forbidden-construct mentions, verbatim D59 phrase, four-check self-review structure, "NEVER commits" wording, and the 3-commits-per-plan registration convention all transferred without modification. Pattern decision documented for Plan 04-03 so it can reuse the same approach.

## Issues Encountered

None blocking. The one Task 3 commit-pattern note above is documented under "Deviations from Plan" for clarity, not as a blocker.

## User Setup Required

None — this is a content repo with no runtime dependencies. The two new skills are installable via `npx skills add Jei-sKappa/skills --skill plan-strict-{auto,interactive}` once this work merges.

## Next Phase Readiness

- **Plan 04-03 (`adjust-plan-granularity-auto` + `adjust-plan-granularity-interactive`)**: ready to start. All four target plan-family skills now exist as referenceable concrete artifacts (`plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, `plan-strict-interactive`); the `stricter` direction's target shape is exactly the six-field per-task block codified in this plan; the `looser` direction's target shape is the 1–3 sentence shape codified in Plan 04-01. Reusable verbatim from this plan: opening clarifier paragraph framing (loose/strict + auto/interactive as independent axes per D58), the D59 phrase, the `## No Parallelization` section text (D60 citation + 4 named-and-prohibited constructs), the `## Self-Review` 4-check pass (D61), the `## Commit Policy` "NEVER commits" phrase (D62), the anti-sycophancy stance with forward-direction heightened framing (interactive sibling only), the 4-input acceptance with ambiguity fallback, the V1 versioned-form filename grammar section, and the six-field strict per-task structure as the strict-target shape reference.
- **Phase 5 (implementation family)**: implementation skills can consume strict plan artifacts emitted by these skills with confidence the D59 contract is enforced AND the six-field per-task structure is reliable. The Steps / Files modified / Verification / Acceptance criteria fields are designed to be executed as a literal contract by an agent-leaning implementer — Phase 5 should reference this six-field shape as the strict-input contract.
- **Phase 6 (review-plan-*)**: review skills will read strict plan bodies and evaluate them against the same D59 / D60 / D61 contracts plus the six-field structure. A strict plan task missing the Files modified or Acceptance criteria field is a review finding the review-plan-* skills should flag.

## Known Stubs

None. Both new skills are complete and self-contained; the worked-example task block is illustrative-only (no live wire-up needed).

## Self-Check: PASSED

Files verified on disk:
- `skills/plan-strict-auto/SKILL.md`
- `skills/plan-strict-interactive/SKILL.md`
- `.claude-plugin/marketplace.json` (workflow plugin = 11 entries)
- `.vscode/settings.json` (scopes = 19 entries, sorted)
- `README.md` (Available skills += 2 entries between plan-loose-interactive and Retired skills)
- `.planning/phases/04-plan-family/04-02-SUMMARY.md`

Commits verified in git log:
- `644229b` (Task 1: feat(plan-strict-auto))
- `03b9723` (Task 2: feat(plan-strict-interactive))
- `995395e` (Task 3: chore: register 4-touchpoint)

---
*Phase: 04-plan-family*
*Completed: 2026-05-21*
