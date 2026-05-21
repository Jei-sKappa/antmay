# Phase 5: Implementation Family - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning
**Mode:** Auto (smart-discuss batched — 6 new user-facing skills with substantial cross-skill protocol decisions)

<domain>
## Phase Boundary

Ship the V1 implementation catalog covering both less-structured input (`implement-*`) and plan-driven input (`implement-plan-*`), with subagent-driven variants (`implement-plan-with-subagents-*`) providing the heavier review loop. The four-state status protocol (D74) and commit / dirty-worktree behavior (D75–D79) are honored uniformly. Embedded reviewer prompts (D87) live as supporting files inside the subagent-driven skill folders.

**In scope (Phase 5):**
- `skills/implement-auto/SKILL.md` — NEW [IMPL-01, IMPL-10..14]
- `skills/implement-interactive/SKILL.md` — NEW [IMPL-02, IMPL-10..14]
- `skills/implement-plan-auto/SKILL.md` — NEW [IMPL-03, IMPL-10..14]
- `skills/implement-plan-interactive/SKILL.md` — NEW [IMPL-04, IMPL-10..14]
- `skills/implement-plan-with-subagents-auto/SKILL.md` — NEW [IMPL-05, IMPL-07..14]
- `skills/implement-plan-with-subagents-auto/references/spec-compliance-reviewer.md` — NEW [IMPL-08]
- `skills/implement-plan-with-subagents-auto/references/code-quality-reviewer.md` — NEW [IMPL-08]
- `skills/implement-plan-with-subagents-interactive/SKILL.md` — NEW [IMPL-06, IMPL-07..14]
- `skills/implement-plan-with-subagents-interactive/references/spec-compliance-reviewer.md` — NEW [IMPL-08]
- `skills/implement-plan-with-subagents-interactive/references/code-quality-reviewer.md` — NEW [IMPL-08]
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` 13 → 19
- `.vscode/settings.json` — `."conventionalCommits.scopes"` 21 → 27 (alphabetically sorted)
- `README.md` — "Available skills" 21 → 27

**Out of scope (Phase 5):**
- Review skills (Phase 6) — including `review-implementation-*` (the verification-intent role per D85), `review-code-*`
- Merge / Finish / Navigation / Distribution surface (Phase 7)
- README hybrid (Phase 7)
- `diagnose-blocker-auto`/`diagnose-blocker-interactive` — deferred V2 [D73]
- Persistent-subagent fix loop — explicitly NOT V1 [D71]; V1 ALWAYS respawns a new implementer for fixes
- Git worktree-based implementation flows — out of scope V1 [D78]
- Plan deviation policy specification — out of scope V1 [D80]; agent uses normal judgment
- Subagent capability fallback inside `*-with-subagents-*` — explicitly NOT V1 [D69]

</domain>

<decisions>
## Implementation Decisions

### Two axes: input shape × subagent topology [D64, D65, D66]
- **Input shape axis:** less-structured (raw prompt / spec / proposal / issue / Inbox item / code context) vs. plan-driven (a `plan-*` artifact path).
- **Subagent topology axis:** single-agent (current agent + self-review) vs. multi-subagent (orchestrator + implementer subagent + reviewer subagents).
- **Crossing the axes per D66:** ONLY plan-driven input gets a `*-with-subagents-*` variant. The 6 V1 skills are:
  - `implement-{auto,interactive}` — less-structured input, single-agent
  - `implement-plan-{auto,interactive}` — plan-driven input, single-agent
  - `implement-plan-with-subagents-{auto,interactive}` — plan-driven input, multi-subagent

### Four-state status protocol [D74, IMPL-10]
- **States:**
  - `DONE` — task completed; no concerns to surface
  - `DONE_WITH_CONCERNS` — task completed but flagged issues (partial coverage, code smells, ambiguous spec areas, possible-but-unverified-edge-cases). The task IS done; the concerns are signals for follow-up review or future work.
  - `BLOCKED` — task could not be completed. Includes failed commits per D77, missing dependencies, inaccessible files, contradictory plan, runtime errors.
  - `NEEDS_CONTEXT` — task cannot proceed without additional information the agent does not have. Includes "user clarification needed", "access to file outside repo needed", "external system credentials needed".
- **Where the state appears:** Every implementation skill body documents a small structured "task report" block the agent writes for each task (or each orchestration cycle for the subagent variants). The block contains the four-state status, a 1–3 sentence rationale, and a suggested next action.
- **Reading the state:** Users read the state from the agent's chat output and / or from commit messages (when applicable). The state is NOT written to a separate artifact file in V1.

### Single-agent skills: implement-* and implement-plan-* [D67, D75, D76]
- **implement-auto:** Reads input → derives implicit tasks if needed → executes end-to-end → auto-commits per implicit task or per explicit Git instruction the user passes through. Self-reviews after each implicit task.
- **implement-interactive:** Same as implement-auto but ASKS the user before committing at each equivalent checkpoint.
- **implement-plan-auto:** Reads a structured plan (loose or strict) → executes tasks sequentially → auto-commits per plan task → self-reviews after each task.
- **implement-plan-interactive:** Same as implement-plan-auto but ASKS the user before committing at each task boundary.

### Subagent skills: implement-plan-with-subagents-* [D66, D68, D69, D70, D71, D72]
- **Loop shape (auto):**
  1. Orchestrator reads plan
  2. Orchestrator checks worktree (D79 — owns the dirty-worktree check, NOT the implementer subagent)
  3. For each task:
     a. Spawn implementer subagent → wait for completion
     b. Spawn spec-compliance reviewer subagent (D70 — first review pass) → wait
     c. If spec-compliance issues found: spawn a NEW implementer subagent for fix (D71 — no persistent subagent assumption) → re-review (D72) → loop until pass
     d. Spawn code-quality reviewer subagent (D70 — second review pass) → wait
     e. If code-quality issues found: same new-implementer + re-review loop (D71, D72)
     f. Orchestrator commits per orchestration cycle (D75 cadence)
- **Loop shape (interactive):** Same as auto, but orchestrator ASKS the user before committing each cycle (D76).
- **Subagent capability as precondition [D69]:** Skill body declares "This skill REQUIRES subagent capability (e.g., Claude Code Task tool). It does NOT fall back to inline execution. If your runtime does not support subagents, use `implement-plan-auto` / `implement-plan-interactive` instead."
- **Embedded reviewer prompts [D87, IMPL-08]:** Reviewer prompts live as supporting files inside the skill folder, NOT as standalone skills. Both subagent skills (`implement-plan-with-subagents-auto` and `implement-plan-with-subagents-interactive`) get a `references/` subfolder containing:
  - `spec-compliance-reviewer.md` — reviewer prompt for the first pass (D70)
  - `code-quality-reviewer.md` — reviewer prompt for the second pass (D70)
- **Reviewer content reuse:** The two skills MAY share identical reviewer prompts (auto vs interactive differ in orchestrator behavior, not in reviewer prompts). Duplicate the files across folders for the V1 self-contained-skill discipline; DRY refactoring is deferred V2 per D28.

### Commit behavior [D75, D76, D77, IMPL-11, IMPL-12, IMPL-13]
- **Auto-mode cadence (D75):**
  - `implement-plan-auto`: per plan task (one commit per successful task)
  - `implement-plan-with-subagents-auto`: per orchestration cycle (one commit per task-after-all-reviews-pass)
  - `implement-auto`: per implicit task IF the agent derives them, OR per explicit Git instruction in the user's prompt; agent uses judgment
- **Interactive-mode cadence (D76):** Same boundaries as auto, but ASK the user before each commit.
- **Failed commit [D77]:** Report `BLOCKED` status, stop the implementation flow. Do NOT retry the commit without explicit user instruction. Skill body documents this verbatim.
- **No history rewriting:** Skill body explicitly states "this skill does NOT rewrite history (no `--amend`, no rebase, no force-push)." Failed-commit handling is to surface the error and stop, not to recover by rewriting.

### Dirty worktree [D79, IMPL-14]
- **Single-agent skills:** Check at start. If dirty, ASK the user "Worktree has uncommitted changes. Continue (and let them be picked up by the next commit) / abort?". Skill body documents the check and the prompt.
- **Subagent skills:** The ORCHESTRATOR (the calling agent / current session) owns the check, NOT the implementer subagent. The implementer subagent assumes a clean tree per orchestrator's verification. Skill body explicitly says "the orchestrator runs the dirty-worktree check BEFORE spawning the first implementer subagent".

### No worktree support [D78]
- All implementation skills run on the current working tree. No `git worktree add`, no isolation directories. The subagent variants spawn subagents on the SAME tree, sequentially, NOT in parallel worktrees. Skill body documents this for the subagent variants ("subagents run sequentially on the main working tree — V1 does not use git worktree isolation").

### Plan deviation policy [D80]
- Not specified. Skill body says "follow the plan; use judgment if the plan is unclear, contradicts the observed code state, or omits an obvious step that blocks progress. Surface deviations in the task report (state = DONE_WITH_CONCERNS if minor, NEEDS_CONTEXT if major)." NO mandatory pre-clearance, NO blanket permission.

### Skill body voice and structure
- **Voice:** Match Phase 4 plan skills' density and citation discipline.
- **Anti-sycophancy stance:** All 3 interactive skills (`implement-interactive`, `implement-plan-interactive`, `implement-plan-with-subagents-interactive`) preserve the 4 markers from `discussion/SKILL.md`. The execution-time stakes amplifier ("bad commits become expensive to rewind") replaces the planning-stage amplifier.
- **D93 applies to interactive variants:** No auto-write of separate decision logs.
- **Citations:** Each skill body cites Phase 1 canonical docs by absolute path on first invocation. Plan-driven skills cite Phase 4 plan family docs by absolute path (e.g., `skills/plan-loose-auto/SKILL.md` referenced for "expected input shape").
- **Frontmatter:** Standard V1 — `name`, `description` with explicit "Use when…" + mode, `metadata.author: https://github.com/Jei-sKappa`, `metadata.version: 1.0.0`.

### Plan grouping (meta — for this phase's plans)
- **3-plan proposal (pairs):**
  - Plan 05-01: `implement-auto` + `implement-interactive` + 3 shared registration touchpoints (marketplace, scopes, README)
  - Plan 05-02: `implement-plan-auto` + `implement-plan-interactive` + 3 shared registration touchpoints
  - Plan 05-03: `implement-plan-with-subagents-auto` + `implement-plan-with-subagents-interactive` + their `references/` subfolders (with `spec-compliance-reviewer.md` + `code-quality-reviewer.md` for each) + 3 shared registration touchpoints
- Sequential waves (parallelization=false, shared-file deps on marketplace/scopes/README).
- Plan 05-03 is the largest plan in Phase 5 (2 skills + 4 reference files = 6 markdown files + 3 registration touchpoints). Planner may split into 05-03a (skills + references) and 05-03b (registration) if scope-sanity finds it cleaner; default is single plan.

### Claude's Discretion
- Exact wording of the four-state task report block, exact reviewer prompt text (covering spec-compliance vs code-quality concerns), exact dirty-worktree prompt wording, and the exact format of the failed-commit BLOCKED report are at executor's discretion during execute.
- Whether to duplicate the reviewer files exactly across the two subagent skill folders or vary them slightly to match auto-vs-interactive behavior is at executor's discretion, provided both subagent skills satisfy IMPL-08.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 4 plan family skills (`plan-loose-{auto,interactive}`, `plan-strict-{auto,interactive}`, `adjust-plan-granularity-{auto,interactive}`) — pattern source for V1 spine skill bodies and the D93 no-auto-decision-log rule application.
- Phase 3 forward spine skills (`spec-auto`, `spec-interactive`, `propose-auto`, `propose-interactive`) — pattern source for the V1 skill body voice.
- `skills/afk-exploration/SKILL.md` and `skills/afk-exploration/references/*.md` — existing orchestrator + supporting-files pattern. The `references/` folder pattern for subagent prompts is already established in the repo (`afk-exploration/references/pre-mortem-analysis.md`, etc.). Phase 5 reuses this convention.
- `skills/the-librarian/SKILL.md` and `skills/the-librarian/references/*.md` — second example of the references/ pattern.
- `docs/workflow/v1/immutability.md` — emitted artifacts immutable; no source-relation frontmatter; ambiguous references resolved by asking. Implementation skills MUST honor immutability when reading plans (D39 applies to plans as versioned artifacts).
- `docs/workflow/v1/filename-grammar.md` — V1 grammar for any artifacts the implementation skills emit (typically none — implementation skills modify source files, not workflow artifacts).
- `skills/discussion/SKILL.md` lines 13–24 — anti-sycophancy stance source (4 marker phrases).

### Established Patterns
- One directory per skill, name matches folder, four registration touchpoints per CLAUDE.md.
- References folder pattern: `skills/<skill-name>/references/<topic>.md` for supporting files loaded by subagents.
- V1 spine skills under `JeisKappa-workflow` plugin.
- Interactive skills carry anti-sycophancy stance; auto skills do not.
- Frontmatter version starts at 1.0.0 for new skills.

### Integration Points
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` currently has 13 entries (Phase 4 end). Phase 5 adds 6 → final 19.
- `.vscode/settings.json` — 21 scopes (Phase 4 end). Phase 5 adds 6 → final 27, alphabetically sorted.
- `README.md` — 21 "Available skills" (Phase 4 end). Phase 5 adds 6 → final 27. Retired skills subsection from Phase 2 preserved.

</code_context>

<specifics>
## Specific Ideas

- The four-state status protocol block should fit in ~5–10 lines per task report. Format suggestion:
  ```
  Task <N> status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
  Notes: <1–3 sentences>
  Next: <suggested action or "ready for next task">
  ```
- The reviewer prompts (`spec-compliance-reviewer.md`, `code-quality-reviewer.md`) should be ~50–100 lines each. Spec-compliance reviewer focuses on "does the diff implement what the task said it would?". Code-quality reviewer focuses on "is the diff well-structured, safe, idiomatic given the codebase?".
- Skill body examples should NOT show committed work that doesn't exist in this repo — use realistic but generic placeholders for diffs and file paths.
- For the subagent skills, the orchestrator's task report should explicitly list: which subagent ran, how many fix iterations occurred, final state per task. This makes the audit trail visible without a separate state file.

</specifics>

<deferred>
## Deferred Ideas

- `diagnose-blocker-auto`/`diagnose-blocker-interactive` — V2 [D73]
- Persistent-subagent fix loop — explicitly out of scope V1 [D71]
- Git worktree-based implementation flows — V2 [D78]
- Subagent capability fallback inside `*-with-subagents-*` — V2 [D69]
- Plan deviation policy specification — V2 [D80]
- `review-implementation-*` (verification-role) — Phase 6 [D85]
- `review-code-*` — Phase 6 [D86]
- Cross-thread implementation orchestration — out of scope V1 [D14]

</deferred>
