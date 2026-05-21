# Modular Agentic Workflow

## What This Is

A lightweight, modular, harness-agnostic, spec-driven agentic workflow distributed as a bundle of `SKILL.md` files inside the `Jei-sKappa/skills` repository. The workflow exposes a composable spine — `propose → spec → plan → implementation → finish` — with cross-cutting modules (capture, discussion, review, merge, navigation) that attach to any phase. Users install one or many of its skills via `npx skills add Jei-sKappa/skills --skill <name>` and run them inside their existing harness (Claude Code, Codex, Gemini, OpenCode, etc.). **v1.0 shipped 2026-05-21** — 33 V1 workflow skills + 2 legacy skills retired.

## Current State

**Shipped milestone:** v1.0 — Modular Agentic Workflow V1 (2026-05-21)

- 33 V1 workflow skills installed under the `JeisKappa-workflow` marketplace plugin, alphabetically sorted
- 7 non-V1 existing skills preserved under the `JeisKappa-skills` plugin
- 2 legacy skills soft-retired (`discussion-loop` → `discussion` + `seeded-discussion`; `review-decision-document` → `review-spec-*`)
- 4 canonical reference docs at `docs/workflow/v1/` (README, thread-layout, filename-grammar, immutability) cited by every spine skill
- README hybrid layout shipped: toolbox model + layered workflow map + recommended common paths + per-module catalog covering all 40 active skills
- 78/78 v1 requirements satisfied (see `milestones/v1.0-REQUIREMENTS.md`)
- All 7 phases verified passed end-to-end (see `milestones/v1.0-MILESTONE-AUDIT.md`)

Archive: [`milestones/v1.0-ROADMAP.md`](./milestones/v1.0-ROADMAP.md) | [`milestones/v1.0-REQUIREMENTS.md`](./milestones/v1.0-REQUIREMENTS.md) | [`milestones/v1.0-MILESTONE-AUDIT.md`](./milestones/v1.0-MILESTONE-AUDIT.md)

## Core Value

A user picking up any single skill or composing the whole spine can drive a feature end-to-end without depending on a CLI, runtime, or project-local state file — every artifact is reviewable Markdown on disk under `docs/threads/<thread>/`.

## Requirements

### Validated

<!-- Existing skills already shipped under skills/ — these are the prior art the workflow lives alongside. -->

- ✓ Skill-as-Markdown distribution model — existing (`skills/<skill-name>/SKILL.md`, marketplace plugin grouping)
- ✓ `consult-the-expert`, `report-to-the-owner`, `brief-the-implementer`, `meta-prompting` (deliverable skills) — existing, untouched by V1
- ✓ `derive-spec` (reverse spec from codebase) — existing, kept separate from forward `spec-*` (D38)
- ✓ `the-librarian` (reference repo manager) — existing, untouched by V1
- ✓ `afk-exploration` (orchestrator skill) — existing, untouched by V1
- ✓ Codebase map at `.planning/codebase/` (ARCHITECTURE/STRUCTURE/STACK/etc.) — existing

**Shipped in v1.0** (all 78 v1 requirements satisfied — see `milestones/v1.0-REQUIREMENTS.md` for the full traceability table):

- ✓ Thread storage primitives (`docs/threads/<UTC>-slug/` + 7-folder set + filename grammars + immutability) — v1.0 Phase 1
- ✓ Capture + Discussion infrastructure (`capture-inbox`, `discussion`, `seeded-discussion`) + `discussion-loop` retirement — v1.0 Phase 2
- ✓ Forward spine: `propose-{auto,interactive}` + `spec-{auto,interactive}` with handoff-grade D50 semantic contract — v1.0 Phase 3
- ✓ Plan family: `plan-loose-{auto,interactive}` + `plan-strict-{auto,interactive}` + `adjust-plan-granularity-{auto,interactive}` — v1.0 Phase 4
- ✓ Implementation family: `implement-{auto,interactive}` + `implement-plan-{auto,interactive}` + `implement-plan-with-subagents-{auto,interactive}` with four-state status protocol — v1.0 Phase 5
- ✓ Review family: `review-{proposal,spec,plan,implementation,code}-{auto,interactive}` + `review-decision-document` retirement — v1.0 Phase 6
- ✓ Merge family: `merge-artifacts-{auto,interactive}` — v1.0 Phase 7
- ✓ Finish: single `finish` skill (D97 V1 exception) — v1.0 Phase 7
- ✓ Navigation: `whats-next` advisory skill — v1.0 Phase 7
- ✓ Distribution surface: hybrid README + `JeisKappa-workflow` marketplace plugin (33 entries) — v1.0 Phase 7

### Active

**v1.1+ candidates** (none committed; for the next milestone, run `/gsd:new-milestone` to define and prioritize):

- v1.0 ships with no remaining v1-scope work. Candidates for v1.1+ include:
  - Real-world usage validation — drive a real feature end-to-end through the V1 spine to surface friction
  - General-purpose summary/synthesis skill (deferred V1, D20, D104)
  - Native adversarial-review skill (deferred V1, D88; today users invoke `the-fool` manually)
  - `review-plan-with-subagents-*` (multi-angle specialist reviewers, deferred V1, D83)
  - `diagnose-blocker-{auto,interactive}` (deferred V1, D73)
  - Git worktree-based implementation flows (deferred V1, D78)
  - Optional CLI / runtime to enforce gates (deferred V1, D1) — only if real V1 usage proves the gate is needed
  - Cross-thread index file (deferred V1, D13) — only if stale-bookkeeping risk is acceptable
  - NFA/state-machine notation for the workflow map (deferred V1, D34) — only if the toolbox map becomes hard to reason about

### Out of Scope

- Nested skill directories, skill-name prefixes, skill-frontmatter "core/support" metadata (D3, D4)
- Backlog primitives (priority/owner/grooming) (D24)
- Cross-project memory (D14)
- Per-thread `README.md` / `thread.md` / `STATE.md` (D15)
- Source-relation frontmatter (`Supersedes:`, `Alternative to:`, `Forked from:`) — lineage lives in filenames only (D44)
- `reviews/`, `verifications/`, `merges/`, `adrs/` thread folders — routed to inbox/open/, discussions/, or target-type folder (D96, D107)
- Plan parallelization / wave markers / dependency graphs (D60)
- Commit-helper skills (D108)
- CLI/router aliases (D108)
- Persistent-subagent fix loops (D71) — V1 always spawns a new implementer for fixes
- Subagent capability fallback inside `*-with-subagents-*` (D69) — the precondition is declared, no inline fallback

## Context

**Shipped state (post-v1.0):**

- 40 active skill folders under `skills/` (33 V1 workflow + 7 non-V1 existing) + 2 retired skill folders kept on disk for install resilience (`discussion-loop`, `review-decision-document`)
- 4 V1 reference docs at `docs/workflow/v1/` cited by every spine skill
- 122 commits across the milestone; 14 days (2026-05-07 → 2026-05-21)
- Tech stack: Markdown skill files + YAML frontmatter + JSON config (marketplace.json, settings.json). No build, test, or lint pipeline — the repo is content-only.
- Distribution: `npx skills add Jei-sKappa/skills --skill <name>`; plugin grouping in `npx skills list` renders `JeisKappa Workflow` (from `JeisKappa-workflow`) and `JeisKappa Skills` (from `JeisKappa-skills`).

**Source of truth for V1 decisions:** `docs/threads/260520095223Z-agentic-workflow/discussions/260518200115Z-agentic-workflow-design-discussion.md` (110 decisions, IDs D1–D110). All V1 skill bodies cite these IDs where relevant.

**Prior art studied:** `obra/superpowers` — `subagent-driven-development` (heavier review loop inspiration for `implement-plan-with-subagents-*`), `finishing-a-development-branch` (basis for `finish` skill).

**Codebase map:** `.planning/codebase/` contains ARCHITECTURE, STRUCTURE, STACK, INTEGRATIONS, CONVENTIONS, TESTING, CONCERNS — written by `/gsd:map-codebase` 2026-05-20.

## Constraints

- **Tech stack:** Markdown-only skill files; YAML frontmatter (`name`, `description`, `metadata.author`, `metadata.version`); no scripts or runtime required by V1 (D1).
- **Harness compatibility:** Skill instructions must work across Claude Code, Codex, Gemini CLI, OpenCode (D29) — `*-with-subagents-*` skills are the only V1 skills allowed to assume subagent capability (D69).
- **Repository shape:** Keep skills flat under `skills/<skill-name>/` — no nested directories, no name prefixes (D3).
- **Naming:** Kebab-case skill names matching directory; `-auto` / `-interactive` suffix discipline (D29, D30); skill name MUST equal `name:` frontmatter and marketplace entry.
- **Artifact storage:** All workflow artifacts live under `docs/threads/<thread>/` per the V1 folder set; nothing else writes there (D7, D107).
- **Filename grammar:** All artifacts UTC-prefixed `YYMMDDHHMMSSZ`; artifact type suffix mandatory; versioned artifacts use target-version semantics (D11, D42, D43, D47, D46).
- **Immutability:** Emitted artifacts are not edited — new versions or new records only (D39, D40, D41).
- **Composition:** Every spine phase is optional; downstream skills accept explicit artifact inputs and ask when ambiguous (D32, D49).
- **Self-review:** Plan skills self-review before emission (D61); implementation reports use the four-state status protocol (D74).
- **Commits:** Plan/spec/proposal/discussion/review skills never auto-commit; `implement-*-auto` may commit per task or per cycle but never rewrite history (D62, D75, D76).
- **No new frontmatter metadata** beyond what existing skill schema requires (D4, D44).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Skills-only V1, CLI deferred (D1) | Preserve lightweight, harness-agnostic goal | ✓ Good — v1.0 shipped without CLI; reviewability proved sufficient |
| Single repo, plugin-grouped (D2, D3, D110) | Distribution simplicity, no premature split | ✓ Good — `JeisKappa-workflow` + `JeisKappa-skills` cleanly separate V1 from existing |
| Composable toolbox model — every phase optional (D32) | Differentiator vs heavier workflows; no CLI to enforce gates anyway | ✓ Good — recommended paths in README hybrid demonstrate flexibility |
| Spine = propose → spec → plan → implementation → finish (D31) | Mirrors how a user discusses work with a colleague | ✓ Good — full canonical path traced unbroken in integration audit |
| Full V1 catalog from day one (D5, D6, D108) | Composition contract is the production-ready surface | ✓ Good — 33 V1 skills shipped together; no sprawl |
| Thread-local durable artifacts at `docs/threads/<thread>/` (D7) | Locality + PR visibility | ✓ Good — folder set used uniformly across all spine + cross-cutting skills |
| Immutable emitted artifacts, target-version filenames (D40, D41, D46, D47) | Stable history without frontmatter | ✓ Good — all 33 V1 skills enforce the contract via skill-body language |
| Explicit auto/interactive variants, no unsuffixed aliases V1 (D29, D30) | Mode changes behavior materially; hidden defaults bad | ✓ Good — every V1 description states its mode |
| Two plan granularities — loose/strict (D55, D56) | Covers the main planning trade-off without sprawl | ✓ Good — `adjust-plan-granularity-*` lets users shift mid-stream |
| Subagent path only for plan input (D66) | Subagents need task boundaries; less structured inputs stay simpler | ✓ Good — 4 reviewer reference files codify the loop |
| Four-state implementation status protocol (D74) | Distinguish concerns, blockage, missing context without state file | ✓ Good — DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT carried by all 6 implementation skills |
| `review-implementation-*` replaces `verify-*` (D85) | Verification is a review variant, not a separate phase | ✓ Good — V1 ships without a separate verify-* skill; README note documents this |
| Auto-review outputs to `inbox/open/`, interactive-review to `discussions/` + Inbox dump (D91, D92, D95) | Surface findings that still need action; archive resolved ones with context | ✓ Good — uniform routing across all 10 review skills |
| Single `finish` skill (D97) | Branch disposition is inherently user-directed | ✓ Good — clean V1 exception; documented explicitly |
| Reuse `the-fool` for adversarial pass V1 (D88) | Avoid duplicating a working external skill | ✓ Good — review-proposal-* and review-spec-* delegate; native adversarial-review deferred V2 |
| Marketplace plugin `JeisKappa-workflow` (D110) | Visible workflow bundle while keeping skills installable individually | ✓ Good — `npx skills list` renders `JeisKappa Workflow` heading |
| Soft retire (folder kept on disk) for legacy skills | Existing `npx skills add` installs don't 404; users get migration notice in skill body | ⚠️ Revisit — works for V1; if more retirements pile up, may want a dedicated archive subfolder under skills/ |

## Next Milestone Goals

v1.0 is shipped — no committed plan for v1.1 yet. To define the next milestone:

```
/gsd:new-milestone
```

That command questions, researches, defines requirements, and creates the v1.1 roadmap. Recommended seed questions for v1.1 scoping:

- Has real-world V1 usage surfaced friction or missing pieces?
- Which of the deferred V2 candidates listed under Active above is most painful right now?
- Are there harness-compatibility issues (Codex, Gemini, OpenCode) that the V1 catalog didn't catch?
- Does the recommended-paths section of the README hybrid need more or different paths based on usage?

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-21 after v1.0 milestone shipped (33 V1 workflow skills + 2 legacy retired)*
