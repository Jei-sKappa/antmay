# Phase 4: Plan Family - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning
**Mode:** Auto (smart-discuss batched — 6 new user-facing skills with shared structural decisions)

<domain>
## Phase Boundary

Ship the V1 planning catalog: 4 plan-authoring skills (`plan-loose-auto/-interactive`, `plan-strict-auto/-interactive`) plus 2 granularity-shifting skills (`adjust-plan-granularity-auto/-interactive`). All plan artifacts are versioned, sequential, isolated, independently implementable, self-reviewed before emission, and NEVER auto-committed. V1 plans contain NO parallelization markers, NO wave numbers, NO dependency arrays — those constructs are explicitly out of scope per D60.

**In scope (Phase 4):**
- `skills/plan-loose-auto/SKILL.md` — NEW [PLAN-01, PLAN-06, PLAN-07, PLAN-08, PLAN-09]
- `skills/plan-loose-interactive/SKILL.md` — NEW [PLAN-02, PLAN-06, PLAN-07, PLAN-08, PLAN-09]
- `skills/plan-strict-auto/SKILL.md` — NEW [PLAN-03, PLAN-06, PLAN-07, PLAN-08, PLAN-09]
- `skills/plan-strict-interactive/SKILL.md` — NEW [PLAN-04, PLAN-06, PLAN-07, PLAN-08, PLAN-09]
- `skills/adjust-plan-granularity-auto/SKILL.md` — NEW [PLAN-05]
- `skills/adjust-plan-granularity-interactive/SKILL.md` — NEW [PLAN-05]
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` 7 → 13 (gains all 6)
- `.vscode/settings.json` — `conventionalCommits.scopes` 15 → 21 (alphabetically sorted)
- `README.md` — "Available skills" 15 → 21

**Out of scope (Phase 4):**
- Implementation skills (Phase 5)
- Review skills (Phase 6) — including `review-plan-*`
- Merge / Finish / Navigation / Distribution surface (Phase 7)
- README hybrid (Phase 7)
- Any change to existing skills (`propose-*`, `spec-*`, etc.)
- `review-plan-with-subagents-*` (multi-angle specialist reviewers) — deferred V2 [D83]

</domain>

<decisions>
## Implementation Decisions

### Plan artifact format and filename grammar
- **Versioned artifact** per D40. Filename grammar: `<UTC>-v<N>[-<kebab-descriptor>]-plan.md` per Phase 1's `docs/workflow/v1/filename-grammar.md`. First emission is `v1` with NO descriptor. Subsequent revisions are NEW versions (v2 etc.) — emitted plans are immutable per D39.
- **Output folder:** `docs/threads/<thread>/plans/` per D107.
- **NO YAML frontmatter required.** V1 plans are read-it-and-execute artifacts, not GSD-orchestrator-driven structured plans. Skill body MAY suggest a minimal frontmatter (e.g., `source:` field pointing to the input artifact) but it is NOT a contract requirement.

### Plan content contract [D59, PLAN-06]
- **Sequential, isolated, independently implementable + reviewable tasks** — this is the V1 plan contract. Every task in a plan must be:
  - Sequential: numbered in execution order
  - Isolated: doesn't read/write state from other in-progress tasks in the same plan beyond what's explicitly captured
  - Independently implementable: a single implementer (human or agent) can complete it in one sitting given the task's stated input
  - Independently reviewable: a reviewer can verify the task succeeded from observable evidence
- **The skill body must enforce this contract.** Concretely: each task in the emitted plan has (1) an objective sentence, (2) required input/context, (3) expected output/artifact change, (4) verification criteria.

### NO parallelization / wave / dependency-graph notation [D60, PLAN-07]
- **Strict prohibition.** V1 plan bodies MUST NOT contain wave numbers, parallelization markers, `depends_on` arrays, task-graph notation, or fork/join syntax. Sequential execution is the only V1 plan model.
- **Skill body language:** Each plan skill body explicitly states "V1 plans are sequential. Do not emit wave numbers, dependency arrays, or any parallelization markers — the implementation skills (Phase 5) execute tasks in plan order."

### Loose vs strict granularity [D55, D56, PLAN-01..04]
- **Loose plan body shape:** Numbered tasks with brief 1–3 sentence descriptions per task. Optimized for human-led execution where the implementer fills in details.
- **Strict plan body shape:** Numbered tasks with explicit substeps, verification notes, files modified per task, and acceptance criteria per task. Optimized for autonomous execution by an agent that needs unambiguous instructions.
- **No "better" granularity.** Per D58, loose vs strict is a user/context choice. Skill descriptions explicitly state this: neither is "the default" — the user picks based on whether the implementer is human-leaning (loose works) or agent-leaning (strict reduces ambiguity).
- **Both granularities honor the D59 sequential-isolated-independent contract.** Loose tasks are still verifiable; they're just less prescriptive.

### Self-review before emission [D61, PLAN-08]
- **Discipline, not output.** The skill body instructs the agent to run a self-review pass BEFORE writing the plan artifact to disk. The self-review checks: coherence (does the plan actually achieve the input artifact's goal?), granularity fit (is this loose-vs-strict appropriate for the input?), no under-splitting (each task is independently implementable?), no over-splitting (no trivial 1-line tasks bloating the plan).
- **In-session only.** The emitted plan does NOT contain a "self-review notes" section. Self-review is a quality discipline; the artifact is clean.
- **Skill body language:** A `## Self-Review` section in each skill body documents the 4 checks the agent runs before emission.

### Never auto-commit [D62, PLAN-09]
- **Skill body explicit:** Every plan skill body contains the literal phrase "This skill NEVER commits the emitted plan automatically. Commits happen only if the surrounding session explicitly requests one." (or near-verbatim equivalent).
- Same convention as `propose-*` and `spec-*` (carried from Phase 3).

### Input shape
- Accept ANY of: a spec artifact path (`docs/threads/<thread>/specs/...`), a proposal artifact path, a discussion/decision-log path, a GitHub issue URL/identifier, or a raw prompt. Skill body documents fallback when ambiguous → ask the user (per D49).
- When the input is a spec with citations to a decision log (per D52), plan skills MAY reference the same source decision log to preserve traceability.

### adjust-plan-granularity skills [D57, PLAN-05]
- **Inputs:** An existing plan artifact path + a target instruction.
- **Target instruction forms:** Either a coarse direction (`looser`, `stricter`, `more-implementation-ready`, `more-high-level`) OR a specific phrase ("split task 3 into substeps", "merge task 5 and 6"). Skill body documents both forms.
- **Output:** A NEW versioned plan artifact. The original plan stays immutable per D39. Filename uses Phase 1's descriptor form: `<UTC>-v<N>-<descriptor>-plan.md` where descriptor encodes the granularity shift (e.g., `v2-stricter-plan.md`, `v2-impl-ready-plan.md`). N starts at the next integer after the source plan's version.
- **auto vs interactive:** Same pattern as elsewhere. `auto` reads the plan + target instruction, produces the adjusted plan end-to-end. `interactive` walks the user task-by-task asking what to do with each (split / merge / expand / contract / leave).
- **Self-review applies.** Both `adjust-plan-granularity-*` skills run the same self-review checks before emission as the other plan skills.

### Skill body voice and structure
- **Voice:** Match the established Phase 2/3 pattern. Dense, declarative, citation-first.
- **Anti-sycophancy stance for interactive variants:** All 4 markers from Phase 2's `discussion/SKILL.md` preserved verbatim in `plan-loose-interactive`, `plan-strict-interactive`, `adjust-plan-granularity-interactive`. Plan decisions become expensive in implementation — the V1 stance applies.
- **D93 applies to interactive skills:** No auto-write of separate decision logs. Only write a log if durable trade-offs / rejected alternatives emerge that can't be captured in the plan itself.
- **Citations:** Each skill body cites Phase 1 canonical docs by absolute path on first invocation.
- **Frontmatter:** Standard V1 — `name`, `description` with "Use when…" trigger and mode, `metadata.author: https://github.com/Jei-sKappa`, `metadata.version: 1.0.0`.

### Plan grouping (meta — for this phase's plans)
- **3-plan proposal (pairs):**
  - Plan 04-01 — `plan-loose-auto` + `plan-loose-interactive` (pair sharing the loose body shape)
  - Plan 04-02 — `plan-strict-auto` + `plan-strict-interactive` (pair sharing the strict body shape)
  - Plan 04-03 — `adjust-plan-granularity-auto` + `adjust-plan-granularity-interactive` (pair sharing the granularity-shift behavior)
- Each plan ships 2 skills + the 3 shared registration touchpoints (marketplace + scopes + README). Same shape as Phase 3 Plan 03-01/03-02.
- Planner may merge 04-01 + 04-02 if loose/strict bodies share enough structure to justify it, but the granularity SHAPE is different enough that splitting is the cleaner default.

### Claude's Discretion
- Exact skill body wording, section names, length are at executor's discretion. Tasks should specify required section presence + required citations + required behavior tokens (e.g., "skill body must contain a `## Self-Review` section" or "skill body must contain the literal phrase 'NEVER commits'") — NOT paragraph-level content.
- Whether the loose plan suggests a section heading template (Goal / Tasks / Notes) vs lets the user choose is at the executor's discretion, provided the D59 contract is satisfied.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `skills/propose-auto/SKILL.md`, `skills/propose-interactive/SKILL.md` (Phase 3) — closest structural analog. Pattern source for: filename grammar inline summaries, citation discipline, scope drift, thread resolution.
- `skills/spec-auto/SKILL.md`, `skills/spec-interactive/SKILL.md` (Phase 3) — pattern source for handoff-grade-style multi-section artifact authoring (parallels strict-plan task structure).
- `skills/discussion/SKILL.md` (Phase 2) — anti-sycophancy stance source for interactive variants.
- `docs/workflow/v1/filename-grammar.md` — versioned-form grammar (plans use this).
- `docs/workflow/v1/immutability.md` — emitted plans are immutable; revisions go to v2+.

### Established Patterns
- Pair plans (auto + interactive) handle ~80% shared body content well — Plan 03-01 and 03-02 proved this pattern.
- New skill folder requires four touchpoints per CLAUDE.md.
- Versioned artifact filenames start at v1, no descriptor on first emission, descriptor used for variants (D42, D46, D47).

### Integration Points
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` currently has 7 entries after Phase 3. Phase 4 adds 6 → final 13.
- `.vscode/settings.json` — 15 scopes after Phase 3. Phase 4 adds 6 → final 21, alphabetically sorted.
- `README.md` — 15 "Available skills" entries after Phase 3. Phase 4 adds 6 → final 21. The Phase 3 SPEC-04 forward/reverse clarifier is preserved.

</code_context>

<specifics>
## Specific Ideas

- A short worked example in each `plan-*` skill body showing a tiny plan artifact would help authors copy-paste-adapt. Keep examples ≤ 10 lines.
- The strict plan example should explicitly show the per-task fields (objective / input / output / verification) without going overboard on prescriptiveness.
- The adjust-plan-granularity bodies should include a worked example showing original v1 → new v2-stricter or v2-impl-ready.
- All plan skills should explicitly cite D60 in the "no parallelization" language so the reader knows the constraint is project-level, not personal taste.
- Filename consistency: plans use `-plan.md` (singular) artifact-type suffix, matching the V1 token list in `docs/workflow/v1/filename-grammar.md`.

</specifics>

<deferred>
## Deferred Ideas

- `review-plan-with-subagents-*` (multi-angle specialist reviewers) — V2 [D83]
- Plan parallelization / wave markers / task graphs — out of scope V1 [D60]
- Plan deviation policy specification — out of scope V1 [D80]; agent uses normal judgment
- Strict-as-better or loose-as-better opinion — out of scope V1 [D58]
- Auto-mode commit behavior for plans — N/A; plans never auto-commit [D62]

</deferred>
