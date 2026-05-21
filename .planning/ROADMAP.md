# Roadmap: Modular Agentic Workflow V1

## Overview

This roadmap delivers the V1 Modular Agentic Workflow as a bundle of `SKILL.md` files inside the `Jei-sKappa/skills` content repo. The journey starts with the *foundational primitives* every spine skill depends on — thread folder set, filename grammars, immutability rules — and the registration plumbing that makes a new skill installable (`marketplace.json`, `conventionalCommits.scopes`). It then layers in the *cross-cutting capture and discussion infrastructure* that all other skills compose with (Inbox + discussion / seeded-discussion, replacing the legacy `discussion-loop`). On that foundation we build the *forward spine artifacts* upstream of code — proposal → spec — and then the planning catalog, the implementation catalog (with and without subagents), and the review catalog (which also evolves the legacy `review-decision-document`). The final phase closes the catalog with merge, finish, navigation, and the public distribution surface: README hybrid, `JeisKappa-workflow` marketplace plugin, installability check. There is no build/test/lint pipeline — "implementation" of each phase means authoring SKILL.md files (plus optional `references/`) and updating the three registration files per the project skill rules in `CLAUDE.md`.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundations** - Thread folder set, filename grammars, immutability, gitignore rule, registration baseline (completed 2026-05-21)
- [x] **Phase 2: Capture & Discussion Infrastructure** - `capture-inbox`, `discussion`, `seeded-discussion` (legacy `discussion-loop` migration) (completed 2026-05-21)
- [x] **Phase 3: Forward Spine — Propose & Spec** - `propose-*` and `spec-*` skill pairs delivering the upstream spine artifacts (completed 2026-05-21)
- [ ] **Phase 4: Plan Family** - `plan-loose-*`, `plan-strict-*`, and `adjust-plan-granularity-*` with self-review and sequential-only contract
- [ ] **Phase 5: Implementation Family** - `implement-*`, `implement-plan-*`, and `implement-plan-with-subagents-*` with four-state status protocol and embedded reviewer prompts
- [ ] **Phase 6: Review Family** - `review-proposal/-spec/-plan/-implementation/-code-*` with findings-to-Inbox routing (evolves legacy `review-decision-document`)
- [ ] **Phase 7: Merge, Finish, Navigation & Distribution Surface** - `merge-artifacts-*`, `finish`, `whats-next`, README hybrid, `JeisKappa-workflow` marketplace plugin

## Phase Details

### Phase 1: Foundations
**Goal**: The thread storage contract every other V1 skill depends on exists on disk and in the registration files, so future skills can write artifacts to a predictable, immutable folder layout without re-defining filename grammars or marketplace plumbing.
**Depends on**: Nothing (first phase)
**Requirements**: THRD-01, THRD-02, THRD-03, THRD-04, THRD-05, THRD-06, THRD-07, THRD-08, DIST-04
**Success Criteria** (what must be TRUE):
  1. User can create a thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` and find a documented, canonical V1 folder set (`proposals/`, `specs/`, `plans/`, `discussions/`, `inbox/{open,processed,dropped}/`, `.wip/`) referenced from a single source of truth that all subsequent skills cite.
  2. User's repo gitignores `docs/threads/**/.wip/` recursively, so any thread's WIP scratch is excluded by default.
  3. A reader looking at any artifact filename can tell from the name alone whether it is a record (`<UTC>-<kebab-desc>-<type>.md`) or a versioned artifact (`<UTC>-v<N>[-<descriptor>]-<type>.md`), and which artifact-type it is, because the grammar is documented and referenced by every emitting skill in this phase's deliverables.
  4. User can rely on the registration baseline being correct: the V1 marketplace plugin `JeisKappa-workflow` exists in `.claude-plugin/marketplace.json` (empty `skills` array OK at this point) and the `conventionalCommits.scopes` array in `.vscode/settings.json` is ready to receive new skill folder names per CLAUDE.md rules.
  5. There is an explicit written statement (e.g. in a foundational reference doc / shared CONVENTIONS section) that emitted versioned and record artifacts are immutable, that lineage frontmatter is forbidden, and that ambiguous artifact references must be resolved by asking the user — not by a global "latest" algorithm.
**Plans**: 3 plans
  - [x] 01-01-PLAN.md — Create V1 workflow reference doc tree: index + thread-layout.md
  - [x] 01-02-PLAN.md — Add filename-grammar.md + immutability.md to complete the reference doc set
  - [x] 01-03-PLAN.md — Wire registration baseline: .gitignore .wip rule + JeisKappa-workflow marketplace plugin + AGENTS.md pointer

### Phase 2: Capture & Discussion Infrastructure
**Goal**: Users have a working capture-and-decide layer underneath the rest of the workflow: any agent or user can capture a thread-local Inbox item with an explicit "why", and both open-ended and seeded discussion skills produce sequentially-numbered decision logs under `discussions/`. The legacy `discussion-loop` is retired in favor of the new discussion / seeded-discussion split.
**Depends on**: Phase 1
**Requirements**: INBX-01, INBX-02, INBX-03, INBX-04, DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09
**Success Criteria** (what must be TRUE):
  1. User can invoke `capture-inbox` from any context and produce a short markdown file under the active thread's `inbox/open/` directory that explicitly states *why* the item is being captured, with no rigid section template imposed.
  2. User can rely on Inbox state being reflected by the `open/processed/dropped` subfolders only — there is no Backlog primitive, no priority field, no owner field anywhere in `capture-inbox`'s output.
  3. User can invoke `discussion` for open-ended interviews (questions discovered live, options + recommendation surfaced only when a real decision point emerges) and `seeded-discussion` for a predetermined point list (walked one at a time, options + recommendation default-on), and the resulting decision logs land in `docs/threads/<thread>/discussions/` named with the mandatory artifact-type suffix `-discussion.md` from Phase 1's grammar.
  4. User can reference any decision from a discussion log using sequential `## D<N>` headings (starting at D1) from any downstream artifact, and discussion skills append decisions incrementally so an interrupted session leaves a usable partial log.
  5. Discussion skills propose to split or park non-blocking branches instead of dragging the current discussion sideways, do not impose a hard question cap, and can resolve thread location with light judgment (ask the user, or auto-create when obvious) without a pre-existing thread.
  6. The legacy `skills/discussion-loop/` is either evolved into `skills/discussion/` + `skills/seeded-discussion/` or explicitly retired with a note documenting the migration; the public `name`, folder, `marketplace.json` entry, `.vscode/settings.json` scope, and `README.md` index all reflect the new state.
**Plans**: 3 plans
  - [x] 02-01-PLAN.md — Author capture-inbox skill + register in marketplace/scopes/README
  - [x] 02-02-PLAN.md — Author discussion + seeded-discussion skills + register in marketplace/scopes/README
  - [x] 02-03-PLAN.md — Retire legacy discussion-loop: rewrite SKILL.md as deprecation notice + remove from marketplace/scopes/README + add Retired skills subsection

### Phase 3: Forward Spine — Propose & Spec
**Goal**: Users have the upstream artifact-producing half of the spine. `propose-*` turns a rough prompt into a freeform proposal; `spec-*` turns a proposal / discussion / issue / prompt into a handoff-grade implementation spec, kept separate from the existing reverse-engineering `derive-spec` skill.
**Depends on**: Phase 2
**Requirements**: PROP-01, PROP-02, PROP-03, SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05
**Success Criteria** (what must be TRUE):
  1. User can invoke `propose-auto` from a rough prompt and find an emitted proposal artifact under the thread's `proposals/` folder using the Phase 1 filename grammar, with body content that is freeform markdown but visibly *suggests* (without enforcing) structure such as intent / context / rough shape / open questions.
  2. User can invoke `propose-interactive` and walk through the same proposal collaboratively, with the skill body explicitly stating its interaction mode in the description and never auto-committing.
  3. User can invoke `spec-auto` or `spec-interactive` and receive an emitted spec artifact under `specs/` that visibly satisfies the handoff-grade semantic contract — intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance — by reading the artifact alone.
  4. User can rely on `spec-*` skills referencing source decision logs by path + `D<N>` (and inlining settled decisions in the spec body) rather than forcing a dedicated "Decisions" section, and rely on emitted spec artifacts being immutable while in-session drafts remain editable.
  5. User can see in `README.md` that `derive-spec` (reverse) and the new `spec-*` skills (forward) are documented as separate skills with non-overlapping triggers; both remain installable individually via `npx skills add`.
**Plans**: 2 plans
  - [x] 03-01-PLAN.md — Ship propose-auto + propose-interactive + register touchpoints
  - [x] 03-02-PLAN.md — Ship spec-auto + spec-interactive + register touchpoints + SPEC-04 README clarifier

### Phase 4: Plan Family
**Goal**: Users have the full V1 planning catalog: loose and strict granularities, auto and interactive modes, and a granularity-shifting helper. Plans are sequential, isolated, independently implementable/reviewable, never auto-committed, and self-reviewed before emission.
**Depends on**: Phase 3
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, PLAN-09
**Success Criteria** (what must be TRUE):
  1. User can invoke any of `plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, `plan-strict-interactive` from a source artifact (spec, proposal, discussion, prompt) and receive an emitted plan artifact in `plans/` whose tasks are sequential, isolated, and independently implementable + reviewable — verifiable by reading the plan alone.
  2. User can invoke `adjust-plan-granularity-auto` or `adjust-plan-granularity-interactive` against an existing plan and receive a re-versioned plan artifact at a different granularity (looser / stricter / more implementation-ready / more high-level) without losing the original version.
  3. User can rely on V1 plan artifacts containing **no** parallelization markers, wave numbers, dependency arrays, or task-graph notation — the absence is observable by reading any emitted plan.
  4. User can rely on plan skills self-reviewing their output before emission (coherence, granularity fit, no under/over-splitting), with the self-review step explicitly documented in each plan skill's body.
  5. User can rely on every plan skill never auto-committing the plan artifact — commits happen only if explicitly requested by the surrounding session.
**Plans**: TBD

### Phase 5: Implementation Family
**Goal**: Users have the full V1 implementation catalog covering both less-structured input (`implement-*`) and plan-driven input (`implement-plan-*`), with subagent-driven variants (`implement-plan-with-subagents-*`) providing the heavier review loop. The four-state status protocol and commit/dirty-worktree behavior are honored uniformly.
**Depends on**: Phase 4
**Requirements**: IMPL-01, IMPL-02, IMPL-03, IMPL-04, IMPL-05, IMPL-06, IMPL-07, IMPL-08, IMPL-09, IMPL-10, IMPL-11, IMPL-12, IMPL-13, IMPL-14
**Success Criteria** (what must be TRUE):
  1. User can invoke `implement-auto` or `implement-interactive` from less-structured input (spec, proposal, issue, Inbox item, code context, direct prompt) and get an end-to-end implementation outcome, while invoking `implement-plan-auto` or `implement-plan-interactive` runs a plan or single plan-task using the current agent + self-review with no subagents spawned.
  2. User can invoke `implement-plan-with-subagents-auto` or `implement-plan-with-subagents-interactive` and have the orchestrator run the full subagent loop (implementer → spec-compliance reviewer → code-quality reviewer; respawn a *new* implementer for fixes; re-review every fix before advancing) using reviewer prompts that live as embedded supporting files inside the skill folder — not as standalone V1 skills.
  3. User can read any implementation skill's report and find one of the four states `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT` clearly stated, with `BLOCKED` reported whenever an expected commit fails.
  4. User can rely on `implement-*-auto` skills auto-committing at the documented granularity (per plan task; per orchestration cycle; per implicit task or explicit Git instruction in `implement-auto`) without rewriting history, while `implement-*-interactive` skills ask before committing at each equivalent checkpoint.
  5. User can rely on implementation skills checking for a dirty worktree and asking before proceeding (in the subagent variants the orchestrator owns the check), and on `implement-plan-with-subagents-*` skill bodies stating subagent capability as a precondition with no inline fallback.
**Plans**: TBD

### Phase 6: Review Family
**Goal**: Users have a target-specific review catalog covering proposal, spec, plan, implementation, and code — each with auto (findings-first report to `inbox/open/`) and interactive (decision log to `discussions/` + only-unresolved-actionable findings dumped to `inbox/open/`) variants. The legacy `review-decision-document` is evolved into `review-spec-*` against the handoff-grade bar; verification is covered by `review-implementation-*` rather than a separate `verify-*` skill; adversarial review is delegated to `the-fool`.
**Depends on**: Phase 5
**Requirements**: REVW-01, REVW-02, REVW-03, REVW-04, REVW-05, REVW-06, REVW-07, REVW-08, REVW-09
**Success Criteria** (what must be TRUE):
  1. User can invoke any of `review-proposal-auto/-interactive`, `review-spec-auto/-interactive`, `review-plan-auto/-interactive`, `review-implementation-auto/-interactive`, `review-code-auto/-interactive` and receive the right shape of output for that target (lightweight for proposal; handoff-grade bar for spec; granularity-and-ambiguity for plan — especially strict; implementation-against-original-intent covering verification; spec-independent code review for code).
  2. User can rely on every `review-*-auto` writing a findings-first report under `inbox/open/` containing verdict, findings, evidence, references, open questions, and next actions.
  3. User can rely on every `review-*-interactive` walking one topic / component / finding at a time, asking the user for their view when useful, testing user explanations against the artifact, writing a decision log under `discussions/`, and *only* dumping unresolved actionable findings to `inbox/open/` (no Inbox file when nothing remains).
  4. The legacy `skills/review-decision-document/` is evolved into `skills/review-spec-auto/` and `skills/review-spec-interactive/` (or explicitly retired with a documented migration), and `review-spec-auto` enforces the handoff-grade bar defined in Phase 3.
  5. Users see in `README.md` that adversarial review is delegated to the external `the-fool` skill (no native V1 adversarial-review skill) and that verification of implementations is covered by `review-implementation-*` rather than a separate `verify-*` skill.
**Plans**: TBD

### Phase 7: Merge, Finish, Navigation & Distribution Surface
**Goal**: Users have the closing skills of the V1 catalog — merge for reconciling artifact variants, `finish` for closing the thread, `whats-next` for advisory navigation — plus the public-facing distribution surface that makes the workflow discoverable: hybrid README, `JeisKappa-workflow` marketplace plugin populated with every V1 skill, and per-skill installability confirmed.
**Depends on**: Phase 6
**Requirements**: MERG-01, MERG-02, MERG-03, MERG-04, MERG-05, MERG-06, FNSH-01, FNSH-02, FNSH-03, NAV-01, NAV-02, NAV-03, DIST-01, DIST-02, DIST-03, DIST-05
**Success Criteria** (what must be TRUE):
  1. User can invoke `merge-artifacts-auto` or `merge-artifacts-interactive` to merge two or more same-type artifacts (default) or cross-type when the target is explicitly stated, with the output landing in the target type's normal folder as the next mainline integer version; interactive merge writes a decision log and resolves conflicts via the user, auto merge writes no log and preserves conflicts explicitly when it cannot confidently resolve.
  2. User can invoke the single `finish` skill (no auto/interactive split — intentional exception to the variant convention) and have it perform a lightweight thread check (final artifacts, open Inbox items, implementation commits/status, obvious unresolved concerns) before asking the closure question with four choices: merge-into-main, merge-into-other-branch, create PR, leave-as-is.
  3. User can invoke `whats-next` and receive a chat-first advisory answer rooted in the current thread context plus optional Inbox capture of meaningful deferred actions; the V1 body is allowed to be thin (e.g., point the agent to the canonical README guidance) per D33.
  4. User opening `README.md` sees the hybrid layout — toolbox model framing, layered workflow map, recommended common paths, per-module catalog — and can install any V1 skill individually via `npx skills add Jei-sKappa/skills --skill <name>` with no nested directories and no name prefixes; every new V1 skill description explicitly states its interaction mode and there are no unsuffixed convenience aliases in V1.
  5. User running `npx skills list` sees every V1 workflow skill grouped under a single marketplace plugin rendered as `JeisKappa Workflow` (from the `JeisKappa-workflow` plugin name in `.claude-plugin/marketplace.json`), and every new skill folder is registered in `marketplace.json` and `.vscode/settings.json` `conventionalCommits.scopes` per CLAUDE.md rules.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundations | 3/3 | Complete   | 2026-05-21 |
| 2. Capture & Discussion Infrastructure | 3/3 | Complete   | 2026-05-21 |
| 3. Forward Spine — Propose & Spec | 2/2 | Complete   | 2026-05-21 |
| 4. Plan Family | 0/TBD | Not started | - |
| 5. Implementation Family | 0/TBD | Not started | - |
| 6. Review Family | 0/TBD | Not started | - |
| 7. Merge, Finish, Navigation & Distribution Surface | 0/TBD | Not started | - |
