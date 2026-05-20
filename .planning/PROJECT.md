# Modular Agentic Workflow V1

## What This Is

A lightweight, modular, harness-agnostic, spec-driven agentic workflow distributed as a bundle of `SKILL.md` files inside the existing `Jei-sKappa/skills` repository. The workflow exposes a composable spine — `propose → spec → plan → implementation → finish` — with cross-cutting modules (discussion, review, merge, inbox, navigation) that can attach to any phase. Users install one or many of its skills via `npx skills add Jei-sKappa/skills --skill <name>` and run them inside their existing harness (Claude Code, Codex, Gemini, OpenCode, etc.).

## Core Value

A user picking up any single skill or composing the whole spine can drive a feature end-to-end without depending on a CLI, runtime, or project-local state file — every artifact is reviewable Markdown on disk under `docs/threads/<thread>/`.

## Requirements

### Validated

<!-- Existing skills already shipped under skills/ — these are the prior art the workflow lives alongside. -->

- ✓ Skill-as-Markdown distribution model — existing (`skills/<skill-name>/SKILL.md`, marketplace plugin grouping)
- ✓ `discussion-loop` (seeded-discussion progenitor) — existing
- ✓ `review-decision-document` (spec-review progenitor) — existing
- ✓ `consult-the-expert`, `report-to-the-owner`, `brief-the-implementer`, `meta-prompting` (deliverable skills) — existing, untouched by V1
- ✓ `derive-spec` (reverse spec from codebase) — existing, kept separate from forward `spec-*` (D38)
- ✓ `the-librarian` (reference repo manager) — existing, untouched by V1
- ✓ `afk-exploration` (orchestrator skill) — existing, untouched by V1
- ✓ Codebase map at `.planning/codebase/` (ARCHITECTURE/STRUCTURE/STACK/etc.) — existing

### Active

<!-- V1 scope. Every Active item maps to a decision from the discussion log (D-IDs). -->

**Thread storage primitives (cross-cutting):**

- [ ] Thread root layout under `docs/threads/<YYMMDDHHMMSSZ-slug>/` (D7)
- [ ] V1 folder set: `proposals/`, `specs/`, `plans/`, `discussions/`, `inbox/{open,processed,dropped}/`, `.wip/` (D107)
- [ ] Recursive WIP ignore rule `docs/threads/**/.wip/` (D8)
- [ ] Artifact filename grammars (D11, D12, D42, D43, D47): versioned and record forms with mandatory artifact-type suffix
- [ ] Target-version semantics (D46): mainline `v<N>-<type>.md`, candidate/variant `v<N>-<descriptor>-<type>.md`, N starts at 1
- [ ] Artifact taxonomy enforcement (D40, D41): emitted versioned and record artifacts immutable; drafts editable until emission
- [ ] No source-relation metadata or frontmatter (D44)
- [ ] No global cross-thread index, no per-thread README/STATE, no cross-project memory in V1 (D13, D14, D15)

**Discussion family (cross-cutting):**

- [ ] `discussion` skill — open-ended interview, live question discovery (D17)
- [ ] `seeded-discussion` skill — predetermined points walked one at a time, options+recommendation default-on (D17, D21)
- [ ] Discussion logs written incrementally with sequential `D<N>` decision IDs (D19, D53)
- [ ] Discussion logs land in `docs/threads/<thread>/discussions/` with thread-resolution behavior (D18)
- [ ] Decision log naming convention reframed (D94) — the artifact is a "decision log"; skill names keep "discussion"

**Inbox family (cross-cutting):**

- [ ] `capture-inbox` skill — standalone capture protocol, reusable by other skills (D26)
- [ ] Inbox capture trigger rule: ask in user-active flows, auto-capture in autonomous/AFK flows (D27)
- [ ] Inbox item format: short markdown, mandatory "why this is captured" context, no rigid template (D25)
- [ ] Inbox status reflected through `open/processed/dropped` subfolders (D24)
- [ ] No Backlog in V1 (D24)

**Spine — Propose:**

- [ ] `propose-auto` / `propose-interactive` (D35)
- [ ] Proposal artifact = freeform markdown (D36); semantic contract only, no template enforcement (D37)

**Spine — Spec:**

- [ ] `spec-auto` / `spec-interactive` (D38)
- [ ] Spec semantic contract — handoff-grade (D50)
- [ ] Spec immutability after emission, drafts editable in-session (D39)
- [ ] No dedicated decisions section required; reference source decision logs and inline settled decisions (D52)

**Spine — Plan:**

- [ ] `plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, `plan-strict-interactive` (D55, D56)
- [ ] `adjust-plan-granularity-auto`, `adjust-plan-granularity-interactive` (D57)
- [ ] Plan artifact contract — sequential, isolated, independently implementable/reviewable tasks (D59)
- [ ] No parallelization/wave semantics in V1 plans (D60)
- [ ] Plan self-review before emission (D61)
- [ ] Plans never commit automatically (D62)

**Spine — Implementation:**

- [ ] `implement-auto`, `implement-interactive` (less structured input)
- [ ] `implement-plan-auto`, `implement-plan-interactive` (plan or plan-task input, no subagents) (D67)
- [ ] `implement-plan-with-subagents-auto`, `implement-plan-with-subagents-interactive` (D66, D68)
- [ ] Embedded subagent reviewer prompts colocated in subagent-driven skill folder (D87, D70: spec-compliance then code-quality)
- [ ] New implementer for fix loop (no persistent subagent assumption) (D71)
- [ ] Re-review every fix before continuing (D72)
- [ ] Four-state status protocol: `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT` (D74)
- [ ] Auto-mode implementation commits per plan task / per orchestration cycle; interactive asks at equivalent checkpoints (D75, D76)
- [ ] Failed commit ⇒ `BLOCKED` (D77)
- [ ] Dirty-worktree handling: ask user (orchestrator-owned in subagent variant) (D79)
- [ ] No worktree support in V1 (D78)
- [ ] No over-specified plan-deviation policy in V1 (D80)

**Spine — Finish:**

- [ ] Single `finish` skill (intentional exception to mode-variant convention) (D97)
- [ ] Lightweight thread check + branch-action choice (merge main, merge other, PR, leave) (D98)

**Review family (cross-cutting, target-specific):**

- [ ] `review-proposal-auto/-interactive`, `review-spec-auto/-interactive`, `review-plan-auto/-interactive`, `review-implementation-auto/-interactive`, `review-code-auto/-interactive` (D81)
- [ ] `review-spec-auto` adapts `review-decision-document` with handoff-grade bar (D82)
- [ ] `review-implementation-*` covers the verification-intent role (D85) — no separate `verify-*` phase in V1
- [ ] `review-*-auto` writes findings-first reports to `inbox/open/` (D90, D91)
- [ ] `review-*-interactive` writes a decision log to `discussions/`, dumps unresolved actionable findings to `inbox/open/` (D89, D92, D95)
- [ ] `the-fool` recommended for adversarial pass on specs (D88)

**Merge family (cross-cutting):**

- [ ] `merge-artifacts-auto`, `merge-artifacts-interactive` (D99)
- [ ] Default same-type merge; cross-type only with explicit target (D100)
- [ ] Output lands in the target-type folder (D101)
- [ ] Interactive merge writes decision log; auto merge writes none (D102)
- [ ] Interactive resolves conflicts via user; auto preserves conflicts explicitly (D103)
- [ ] Merge output = next mainline integer (D45, D46)

**Navigation:**

- [ ] `whats-next` skill — advisory, chat-first answer, optional Inbox capture (D105, D106)
- [ ] V1 `whats-next` may be thin: point agent to canonical README guidance (D33)

**Variants / mode discipline:**

- [ ] Explicit `-auto` / `-interactive` suffixes throughout (D29, D30)
- [ ] No unsuffixed convenience aliases in V1 (D30)
- [ ] Interactive artifact-producing skills log only when interaction yields durable material not already represented in the artifact (D93)

**Repository surface:**

- [ ] One marketplace plugin group `JeisKappa-workflow` for V1 workflow skills (D110)
- [ ] README hybrid: toolbox model + layered workflow map + recommended paths + module-family catalog (D34, D109)
- [ ] All new skills registered in `.claude-plugin/marketplace.json` and `.vscode/settings.json` conventional-commit scopes (CLAUDE.md rules)

### Out of Scope

- Required CLI / runtime / harness — postponed to V2 (D1) — relies on clear skill instructions and reviewable artifacts instead
- Nested skill directories, skill-name prefixes, skill-frontmatter "core/support" metadata (D3, D4)
- Backlog (priority/owner/grooming) (D24)
- Cross-thread index file (D13)
- Cross-project memory (D14)
- Per-thread `README.md` / `thread.md` / `STATE.md` (D15)
- Source-relation frontmatter (`Supersedes:`, `Alternative to:`, `Forked from:`) (D44)
- `reviews/`, `verifications/`, `merges/`, `adrs/` thread folders (D96, D107)
- Plan parallelization / wave markers / dependency graphs (D60)
- General-purpose summary/synthesis skill (D20, D104) — deferred V2
- Native adversarial-review skill (D88) — use `the-fool` for V1
- `diagnose-blocker-*` skill (D73)
- Commit-helper skills (D108)
- CLI/router aliases (D108)
- Git worktree flows (D78)
- Persistent subagent fix loops (D71) — V1 always spawns a new implementer
- Subagent capability fallback inside `*-with-subagents-*` skills (D69)

## Context

**Repo:** `Jei-sKappa/skills`, a content-only repository — no build, test, or lint pipeline. Validation is editorial. Distribution is `npx skills add`, grouped via `.claude-plugin/marketplace.json`. Skill versioning happens inside each `SKILL.md` frontmatter (`metadata.version`).

**Existing skills (Validated layer):** 9 skills live under `skills/`. Some (e.g. `discussion-loop`, `review-decision-document`) will be replaced or evolved by V1 (`seeded-discussion`, `review-spec-*`). Others (`consult-the-expert`, `meta-prompting`, `report-to-the-owner`, `brief-the-implementer`, `the-librarian`, `derive-spec`, `afk-exploration`) are out of scope for V1 work — they continue to ship as-is.

**Codebase map:** `.planning/codebase/` already contains ARCHITECTURE, STRUCTURE, STACK, INTEGRATIONS, CONVENTIONS, TESTING, CONCERNS — written by `/gsd:map-codebase` 2026-05-20.

**Source of truth for decisions:** `docs/threads/260520095223Z-agentic-workflow/discussions/260518200115Z-agentic-workflow-design-discussion.md` (110 decisions, IDs D1–D110). Future workflow skills should reference these IDs when relevant.

**Prior art studied:** `obra/superpowers` — `subagent-driven-development` (heavier review loop inspiration for `implement-plan-with-subagents-*`), `finishing-a-development-branch` (basis for `finish` skill).

**Distribution mechanics:** Plugin display name in `npx skills list` is the marketplace `name` split on `-`, with each segment capitalized — so `JeisKappa-workflow` renders `JeisKappa Workflow`.

## Constraints

- **Tech stack**: Markdown-only skill files; YAML frontmatter (`name`, `description`, `metadata.author`, `metadata.version`); no scripts or runtime required by V1 (D1).
- **Harness compatibility**: Skill instructions must work across Claude Code, Codex, Gemini CLI, OpenCode (D29) — `*-with-subagents-*` skills are the only V1 skills allowed to assume subagent capability (D69).
- **Repository shape**: Keep skills flat under `skills/<skill-name>/` — no nested directories, no name prefixes (D3).
- **Naming**: Kebab-case skill names matching directory; `-auto` / `-interactive` suffix discipline (D29, D30); skill name MUST equal `name:` frontmatter and marketplace entry.
- **Artifact storage**: All workflow artifacts live under `docs/threads/<thread>/` per the V1 folder set; nothing else writes there (D7, D107).
- **Filename grammar**: All artifacts UTC-prefixed `YYMMDDHHMMSSZ`; artifact type suffix mandatory; versioned artifacts use target-version semantics (D11, D42, D43, D47, D46).
- **Immutability**: Emitted artifacts are not edited — new versions or new records only (D39, D40, D41).
- **Composition**: Every spine phase is optional; downstream skills accept explicit artifact inputs and ask when ambiguous (D32, D49).
- **Self-review**: Plan skills self-review before emission (D61); implementation reports use the four-state status protocol (D74).
- **Commits**: Plan/spec/proposal/discussion/review skills never auto-commit; `implement-*-auto` may commit per task or per cycle but never rewrite history (D62, D75, D76).
- **No new frontmatter metadata** beyond what existing skill schema requires (D4, D44).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Skills-only V1, CLI deferred (D1) | Preserve lightweight, harness-agnostic goal | — Pending |
| Single repo, plugin-grouped (D2, D3, D110) | Distribution simplicity, no premature split | — Pending |
| Composable toolbox model — every phase optional (D32) | Differentiator vs heavier workflows; no CLI to enforce gates anyway | — Pending |
| Spine = propose → spec → plan → implementation → finish (D31) | Mirrors how a user discusses work with a colleague | — Pending |
| Full V1 catalog from day one, thin bodies OK (D5, D6, D108) | Composition contract is the production-ready surface | — Pending |
| Thread-local durable artifacts at `docs/threads/<thread>/` (D7) | Locality + PR visibility | — Pending |
| Immutable emitted artifacts, target-version filenames (D40, D41, D46, D47) | Stable history without frontmatter | — Pending |
| Explicit auto/interactive variants, no unsuffixed aliases V1 (D29, D30) | Mode changes behavior materially; hidden defaults bad | — Pending |
| Two plan granularities — loose/strict (D55, D56) | Covers the main planning trade-off without sprawl | — Pending |
| Subagent path only for plan input (D66) | Subagents need task boundaries; less structured inputs stay simpler | — Pending |
| Four-state implementation status protocol (D74) | Distinguish concerns, blockage, missing context without state file | — Pending |
| `review-implementation-*` replaces `verify-*` (D85) | Verification is a review variant, not a separate phase | — Pending |
| Auto-review outputs to `inbox/open/`, interactive-review to `discussions/` + Inbox dump (D91, D92, D95) | Surface findings that still need action; archive resolved ones with context | — Pending |
| Single `finish` skill (D97) | Branch disposition is inherently user-directed | — Pending |
| Reuse `the-fool` for adversarial pass V1 (D88) | Avoid duplicating a working external skill | — Pending |
| Marketplace plugin `JeisKappa-workflow` (D110) | Visible workflow bundle while keeping skills installable individually | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-20 after initialization*
