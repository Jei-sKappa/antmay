# Requirements: Modular Agentic Workflow V1

**Defined:** 2026-05-20
**Core Value:** A user picking up any single skill or composing the whole spine can drive a feature end-to-end without depending on a CLI, runtime, or project-local state file — every artifact is reviewable Markdown on disk under `docs/threads/<thread>/`.

**Source of decisions:** `docs/threads/260520095223Z-agentic-workflow/discussions/260518200115Z-agentic-workflow-design-discussion.md` (D1–D110). REQ-IDs reference D-IDs in brackets.

## v1 Requirements

### Thread Storage (THRD)

- [x] **THRD-01**: User can create thread roots at `docs/threads/<YYMMDDHHMMSSZ-slug>/` and the workflow treats that path as the durable artifact root [D7]
- [x] **THRD-02**: User can rely on the V1 thread folder set (`proposals/`, `specs/`, `plans/`, `discussions/`, `inbox/{open,processed,dropped}/`, `.wip/`) being recognized everywhere skills write artifacts [D107]
- [x] **THRD-03**: User's repo gitignores thread-local WIP scratch via a recursive rule `docs/threads/**/.wip/` [D8]
- [x] **THRD-04**: Workflow skills emit record artifacts as `<YYMMDDHHMMSSZ>-<kebab-description>-<artifact-type>.md` with mandatory artifact-type suffix [D11, D12, D43]
- [x] **THRD-05**: Workflow skills emit versioned artifacts as `<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-<artifact-type>.md` with target-version semantics and N starting at 1 [D42, D46, D47]
- [x] **THRD-06**: Workflow skills treat emitted versioned and record artifacts as immutable; in-session drafts are editable until emission [D39, D40, D41]
- [x] **THRD-07**: Workflow skills do not use lineage frontmatter or `Supersedes:`/`Alternative to:`/`Forked from:` source-relation metadata [D44]
- [x] **THRD-08**: Workflow skills resolve ambiguous artifact references by asking the user, not via a global "latest artifact" algorithm [D49]

### Inbox (INBX)

- [x] **INBX-01**: User can invoke a standalone `capture-inbox` skill to write a thread-local Inbox item from any context [D26]
- [x] **INBX-02**: User can rely on `capture-inbox` items being short markdown notes that always explain *why* the item is captured, without a rigid section template [D25]
- [x] **INBX-03**: Workflow skills use `inbox/{open,processed,dropped}/` subfolders to reflect Inbox item status; no Backlog primitives in V1 [D24]
- [x] **INBX-04**: Workflow skills decide whether to ask before capturing or auto-capture based on whether the run is user-active or autonomous/AFK [D27]

### Discussion (DISC)

- [x] **DISC-01**: User can invoke a `discussion` skill for open-ended interviews where the agent discovers questions live [D16, D17]
- [x] **DISC-02**: User can invoke a `seeded-discussion` skill that walks predetermined points one at a time with options + recommendation default-on [D16, D17, D21]
- [x] **DISC-03**: User can invoke `discussion` and get options + recommendation only when a concrete decision point emerges (opt-in) [D21]
- [x] **DISC-04**: User can rely on discussion logs being appended incrementally to `discussions/` as decisions are made, surviving interruptions [D18, D19]
- [x] **DISC-05**: User can reference discussion decisions by sequential local IDs (`## D1`, `## D2`, …) in downstream artifacts [D53]
- [x] **DISC-06**: User can invoke discussion skills without a pre-existing thread and have the skill resolve thread location with light judgment (ask or auto-create when obvious) [D18]
- [x] **DISC-07**: User can interview indefinitely — discussion skills do not impose a hard question cap [D22]
- [x] **DISC-08**: User can rely on discussion skills proposing to split or park non-blocking branches instead of dragging the current discussion sideways [D23]
- [x] **DISC-09**: User understands the durable output of `discussion`/`seeded-discussion` is named "decision log" / "decision record" [D94]

### Propose (PROP)

- [x] **PROP-01**: User can invoke `propose-auto` to produce a freeform-markdown proposal artifact from a rough prompt [D35, D36]
- [x] **PROP-02**: User can invoke `propose-interactive` to produce a proposal collaboratively [D35]
- [x] **PROP-03**: User can rely on proposal skills suggesting structure (intent/context/rough shape/open questions) without enforcing a template [D36, D37]

### Spec (SPEC)

- [x] **SPEC-01**: User can invoke `spec-auto` to produce a forward-looking implementation spec from a proposal, discussion, issue, or user prompt [D38]
- [x] **SPEC-02**: User can invoke `spec-interactive` to author a spec collaboratively [D38]
- [x] **SPEC-03**: User can rely on official spec skills meeting the handoff-grade semantic contract: intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance [D50]
- [x] **SPEC-04**: User keeps `derive-spec` separate from the V1 forward spec skills [D38]
- [x] **SPEC-05**: User can rely on spec skills referencing source decision logs (by path + `D<N>`) and inlining settled decisions in the spec body — no mandatory decisions section [D52]

### Plan (PLAN)

- [x] **PLAN-01**: User can invoke `plan-loose-auto` to produce a goal-oriented sequential plan from an input artifact [D55, D56, D59]
- [x] **PLAN-02**: User can invoke `plan-loose-interactive` to produce the same plan collaboratively [D56]
- [x] **PLAN-03**: User can invoke `plan-strict-auto` to produce a detailed, task/phase-oriented sequential plan with steps/substeps and verification notes [D55, D56, D59]
- [x] **PLAN-04**: User can invoke `plan-strict-interactive` to produce a strict plan collaboratively [D56]
- [x] **PLAN-05**: User can invoke `adjust-plan-granularity-auto` / `adjust-plan-granularity-interactive` to shift an existing plan's granularity (looser / stricter / more implementation-ready / more high-level) [D57]
- [x] **PLAN-06**: User can rely on plan tasks being sequential, isolated, independently implementable, and independently reviewable [D59]
- [x] **PLAN-07**: User can rely on V1 plan artifacts containing no parallelization, wave markers, dependency arrays, or task graph notation [D60]
- [x] **PLAN-08**: User can rely on plan skills self-reviewing output before emission (coherence, granularity fit, no under/over-splitting) [D61]
- [x] **PLAN-09**: User can rely on plan skills never auto-committing; commits only happen if explicitly asked in the surrounding session [D62]

### Implementation (IMPL)

- [x] **IMPL-01**: User can invoke `implement-auto` to implement from less structured input (spec, proposal, issue, Inbox item, code context, direct prompt) [D64, D65]
- [x] **IMPL-02**: User can invoke `implement-interactive` to implement less structured input collaboratively [D64, D65]
- [x] **IMPL-03**: User can invoke `implement-plan-auto` to execute a plan or specific plan task without spawning subagents, relying on the current agent + self-review [D65, D67]
- [x] **IMPL-04**: User can invoke `implement-plan-interactive` to execute a plan with user-confirmed transitions [D65, D67]
- [ ] **IMPL-05**: User can invoke `implement-plan-with-subagents-auto` to run the full subagent loop (implementer → spec-compliance reviewer → code-quality reviewer; respawn fixer + re-review until pass) [D66, D68, D70, D71, D72]
- [ ] **IMPL-06**: User can invoke `implement-plan-with-subagents-interactive` to run the subagent loop with a human-confirmed checkpoint at every transition [D68]
- [ ] **IMPL-07**: User can rely on `implement-plan-with-subagents-*` skills declaring subagent capability as a precondition (no inline fallback) [D69]
- [ ] **IMPL-08**: User can rely on the reviewer prompts inside `implement-plan-with-subagents-*` being embedded supporting files in the skill folder, not standalone V1 skills [D87]
- [ ] **IMPL-09**: User can rely on every fix from a reviewer issue being re-reviewed before the workflow advances [D72]
- [x] **IMPL-10**: User can read implementation outcomes using the four-state status protocol `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` [D74]
- [x] **IMPL-11**: User can rely on `implement-*-auto` skills auto-committing per the granularity rule (per plan task; per orchestration cycle; per implicit task or explicit Git instruction in `implement-auto`) without rewriting history or manipulating commits [D75, D76]
- [x] **IMPL-12**: User can rely on `implement-*-interactive` skills asking before committing at each equivalent checkpoint [D75, D76]
- [x] **IMPL-13**: User can rely on implementation skills reporting `BLOCKED` when an expected commit fails [D77]
- [x] **IMPL-14**: User can rely on implementation skills asking before proceeding when the worktree is dirty (orchestrator owns the check in subagent variants) [D79]

### Review (REVW)

- [ ] **REVW-01**: User can invoke `review-proposal-auto` / `review-proposal-interactive` for lightweight proposal review (gaps, risks, ambiguities, optional adversarial pressure) [D81, D84]
- [ ] **REVW-02**: User can invoke `review-spec-auto` (evolved `review-decision-document`) / `review-spec-interactive` against the handoff-grade bar [D81, D82]
- [ ] **REVW-03**: User can invoke `review-plan-auto` / `review-plan-interactive` to check plan adherence to source artifact, project conventions, granularity fit, and ambiguity (esp. for strict plans) [D81, D83]
- [ ] **REVW-04**: User can invoke `review-implementation-auto` / `review-implementation-interactive` to check implemented code against original intent (covers V1 verification role) [D81, D85]
- [ ] **REVW-05**: User can invoke `review-code-auto` / `review-code-interactive` as a general-purpose code review independent of a spec or implementation [D81, D86]
- [ ] **REVW-06**: User can rely on `review-*-auto` writing findings-first reports to `inbox/open/` with verdict, findings, evidence, references, open questions, next actions [D90, D91]
- [ ] **REVW-07**: User can rely on `review-*-interactive` walking one topic/component/finding at a time, asking the user for their view when useful, and testing the user's explanation against the artifact [D89]
- [ ] **REVW-08**: User can rely on `review-*-interactive` writing a decision log to `discussions/` and dumping only unresolved actionable findings to `inbox/open/` (no Inbox file when nothing remains) [D92, D95]
- [ ] **REVW-09**: User can invoke `the-fool` for adversarial passes (no native adversarial skill in V1) [D88]

### Merge (MERG)

- [ ] **MERG-01**: User can invoke `merge-artifacts-auto` to merge two or more same-type artifacts into the next mainline integer version [D45, D99, D100]
- [ ] **MERG-02**: User can invoke `merge-artifacts-interactive` to merge artifacts with user-resolved conflicts [D99, D103]
- [ ] **MERG-03**: User can merge cross-type when the desired output type is explicitly stated or obvious from context [D100]
- [ ] **MERG-04**: User can rely on merge output landing in the target artifact type's normal folder [D101]
- [ ] **MERG-05**: User can rely on `merge-artifacts-interactive` writing a decision log; `merge-artifacts-auto` writing no separate log [D102]
- [ ] **MERG-06**: User can rely on `merge-artifacts-auto` preserving conflicts explicitly when it cannot confidently resolve [D103]

### Finish (FNSH)

- [ ] **FNSH-01**: User can invoke a single `finish` skill (no auto/interactive split) [D97]
- [ ] **FNSH-02**: User can rely on `finish` performing a lightweight thread check (final artifacts, open Inbox items, implementation commits/status, obvious unresolved concerns) before asking the closure question [D98]
- [ ] **FNSH-03**: User can choose from merge-into-main, merge-into-other-branch, create PR, or leave-as-is at `finish` [D98]

### Navigation (NAV)

- [ ] **NAV-01**: User can invoke `whats-next` for advisory navigation that inspects current thread context/artifacts and suggests coherent next actions in chat [D33, D105, D106]
- [ ] **NAV-02**: User can rely on `whats-next` capturing meaningful deferred actions to Inbox when appropriate [D105]
- [ ] **NAV-03**: User accepts that V1 `whats-next` may be thin (e.g., point the agent to the canonical README guidance) [D33]

### Distribution Surface (DIST)

- [ ] **DIST-01**: User sees a hybrid README explaining the toolbox model, layered workflow map, recommended common paths, and per-module catalog [D109, D34]
- [ ] **DIST-02**: User can rely on V1 workflow skills being grouped under one marketplace plugin (e.g. `JeisKappa-workflow`) [D110]
- [ ] **DIST-03**: User can install any V1 skill individually via `npx skills add Jei-sKappa/skills --skill <name>` (no nested directories, no name prefixes) [D3]
- [x] **DIST-04**: User can rely on every new V1 skill folder being registered in `.claude-plugin/marketplace.json` and `.vscode/settings.json` conventional-commit scopes per CLAUDE.md rules
- [ ] **DIST-05**: User can rely on every V1 skill body explicitly stating its interaction mode in its description, with no unsuffixed convenience aliases in V1 [D29, D30]

## v2 Requirements

Deferred to future releases.

### CLI / Runtime

- **CLI-V2-01**: Optional CLI or runtime to enforce gates, only if real V1 usage proves it is needed [D1]

### Summary / Synthesis

- **SUMM-V2-01**: General-purpose summary/synthesis skill (discussions, reviews, Inbox items, code findings, thread state) [D20, D104]

### Review

- **REVW-V2-01**: Native adversarial-review skill replacing the `the-fool` recommendation [D88]
- **REVW-V2-02**: `review-plan-with-subagents-*` (multi-angle specialist reviewers) [D83]

### Diagnosis

- **DIAG-V2-01**: `diagnose-blocker-auto` / `diagnose-blocker-interactive` [D73]

### Implementation

- **IMPL-V2-01**: Git worktree-based implementation flows [D78]

### Templating / Configuration

- **TMPL-V2-01**: User-selectable templating or configurable output shapes for artifact contracts [D37]

### Convenience

- **CONV-V2-01**: Unsuffixed convenience aliases, router skills, or generated mode variants [D30, D108]
- **CONV-V2-02**: Commit-helper skills [D108]
- **CONV-V2-03**: Backlog (priority/owner/grooming) [D24, D108]

### Discoverability

- **DISC-V2-01**: Generated cross-thread index if usage proves stale-bookkeeping risk is acceptable [D13]

### Workflow Model

- **MODL-V2-01**: NFA/state-machine notation for the workflow if the toolbox map becomes hard to reason about [D34]

## Out of Scope

| Feature | Reason |
|---------|--------|
| Required CLI / runtime / harness in V1 | Skills-only V1; rely on skill instructions + reviewable artifacts [D1] |
| Nested skill directories | Preserve flat distribution layout [D3] |
| Skill-name prefixes | Keep names clean; visible workflow identity comes from marketplace grouping + README [D3] |
| Frontmatter "core/support" metadata | No tooling consumes it yet; would create maintenance burden [D4] |
| `reviews/`, `verifications/`, `merges/`, `adrs/` thread folders | Route to `inbox/open/`, `discussions/`, or target-type folder instead [D96, D101, D107] |
| Per-thread `README.md` / `thread.md` / `STATE.md` | Stale-bookkeeping risk; artifacts are the source of truth [D15] |
| Required cross-thread index | Folders + timestamps + search are sufficient in V1 [D13] |
| Cross-project memory | Outside workflow contract; harness-native memory remains available [D14] |
| Source-relation frontmatter (`Supersedes:`, `Alternative to:`, `Forked from:`) | Lineage lives in filenames only [D44] |
| Plan parallelization / wave markers / dependency graphs | V1 planning is sequential by contract [D60] |
| Subagent capability fallback inside `*-with-subagents-*` | Name explicitly declares the dependency [D69] |
| Persistent-subagent fix loop | Not portable across harnesses; always respawn a new implementer [D71] |
| Verification phase distinct from review | `review-implementation-*` covers V1 verification [D85] |
| `verify-*` skills | Replaced by `review-implementation-*` [D85] |
| Backlog primitives in Inbox | Inbox is capture; no priority/owner/grooming [D24] |
| Worktree-managed implementation flows | Orchestration overhead outside V1 [D78] |
| Plan deviation policy specification | Agent uses normal judgment; refine after real usage [D80] |
| Strict-as-better or loose-as-better opinion | Granularity is a user/context choice [D58] |
| Commit-helper skills | Defer; not part of V1 plan/spec/proposal skill contracts [D108] |
| Router aliases / unsuffixed convenience names | Explicit mode names beat hidden defaults [D30] |
| Skill-body DRY abstractions for variant pairs | V1 may duplicate; DRY deferred until catalog stabilizes [D28] |

## Traceability

Every v1 requirement is mapped to exactly one phase. See `.planning/ROADMAP.md` for phase details.

| Requirement | Phase | Status |
|-------------|-------|--------|
| THRD-01 | Phase 1: Foundations | Complete |
| THRD-02 | Phase 1: Foundations | Complete |
| THRD-03 | Phase 1: Foundations | Complete |
| THRD-04 | Phase 1: Foundations | Complete |
| THRD-05 | Phase 1: Foundations | Complete |
| THRD-06 | Phase 1: Foundations | Complete |
| THRD-07 | Phase 1: Foundations | Complete |
| THRD-08 | Phase 1: Foundations | Complete |
| DIST-04 | Phase 1: Foundations | Complete |
| INBX-01 | Phase 2: Capture & Discussion Infrastructure | Complete |
| INBX-02 | Phase 2: Capture & Discussion Infrastructure | Complete |
| INBX-03 | Phase 2: Capture & Discussion Infrastructure | Complete |
| INBX-04 | Phase 2: Capture & Discussion Infrastructure | Complete |
| DISC-01 | Phase 2: Capture & Discussion Infrastructure | Complete |
| DISC-02 | Phase 2: Capture & Discussion Infrastructure | Complete |
| DISC-03 | Phase 2: Capture & Discussion Infrastructure | Complete |
| DISC-04 | Phase 2: Capture & Discussion Infrastructure | Complete |
| DISC-05 | Phase 2: Capture & Discussion Infrastructure | Complete |
| DISC-06 | Phase 2: Capture & Discussion Infrastructure | Complete |
| DISC-07 | Phase 2: Capture & Discussion Infrastructure | Complete |
| DISC-08 | Phase 2: Capture & Discussion Infrastructure | Complete |
| DISC-09 | Phase 2: Capture & Discussion Infrastructure | Complete |
| PROP-01 | Phase 3: Forward Spine — Propose & Spec | Complete |
| PROP-02 | Phase 3: Forward Spine — Propose & Spec | Complete |
| PROP-03 | Phase 3: Forward Spine — Propose & Spec | Complete |
| SPEC-01 | Phase 3: Forward Spine — Propose & Spec | Complete |
| SPEC-02 | Phase 3: Forward Spine — Propose & Spec | Complete |
| SPEC-03 | Phase 3: Forward Spine — Propose & Spec | Complete |
| SPEC-04 | Phase 3: Forward Spine — Propose & Spec | Complete |
| SPEC-05 | Phase 3: Forward Spine — Propose & Spec | Complete |
| PLAN-01 | Phase 4: Plan Family | Complete |
| PLAN-02 | Phase 4: Plan Family | Complete |
| PLAN-03 | Phase 4: Plan Family | Complete |
| PLAN-04 | Phase 4: Plan Family | Complete |
| PLAN-05 | Phase 4: Plan Family | Complete |
| PLAN-06 | Phase 4: Plan Family | Complete |
| PLAN-07 | Phase 4: Plan Family | Complete |
| PLAN-08 | Phase 4: Plan Family | Complete |
| PLAN-09 | Phase 4: Plan Family | Complete |
| IMPL-01 | Phase 5: Implementation Family | Complete |
| IMPL-02 | Phase 5: Implementation Family | Complete |
| IMPL-03 | Phase 5: Implementation Family | Complete |
| IMPL-04 | Phase 5: Implementation Family | Complete |
| IMPL-05 | Phase 5: Implementation Family | Pending |
| IMPL-06 | Phase 5: Implementation Family | Pending |
| IMPL-07 | Phase 5: Implementation Family | Pending |
| IMPL-08 | Phase 5: Implementation Family | Pending |
| IMPL-09 | Phase 5: Implementation Family | Pending |
| IMPL-10 | Phase 5: Implementation Family | Complete |
| IMPL-11 | Phase 5: Implementation Family | Complete |
| IMPL-12 | Phase 5: Implementation Family | Complete |
| IMPL-13 | Phase 5: Implementation Family | Complete |
| IMPL-14 | Phase 5: Implementation Family | Complete |
| REVW-01 | Phase 6: Review Family | Pending |
| REVW-02 | Phase 6: Review Family | Pending |
| REVW-03 | Phase 6: Review Family | Pending |
| REVW-04 | Phase 6: Review Family | Pending |
| REVW-05 | Phase 6: Review Family | Pending |
| REVW-06 | Phase 6: Review Family | Pending |
| REVW-07 | Phase 6: Review Family | Pending |
| REVW-08 | Phase 6: Review Family | Pending |
| REVW-09 | Phase 6: Review Family | Pending |
| MERG-01 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| MERG-02 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| MERG-03 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| MERG-04 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| MERG-05 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| MERG-06 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| FNSH-01 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| FNSH-02 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| FNSH-03 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| NAV-01 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| NAV-02 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| NAV-03 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| DIST-01 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| DIST-02 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| DIST-03 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |
| DIST-05 | Phase 7: Merge, Finish, Navigation & Distribution Surface | Pending |

**Coverage:**
- v1 requirements: 78 total (re-counted from checkboxes; the original "73 total" line was stale)
- Mapped to phases: 78
- Unmapped: 0 ✓

**Per-phase counts:**

| Phase | Requirements |
|-------|-------------:|
| Phase 1: Foundations | 9 (THRD-01..08, DIST-04) |
| Phase 2: Capture & Discussion Infrastructure | 13 (INBX-01..04, DISC-01..09) |
| Phase 3: Forward Spine — Propose & Spec | 8 (PROP-01..03, SPEC-01..05) |
| Phase 4: Plan Family | 9 (PLAN-01..09) |
| Phase 5: Implementation Family | 14 (IMPL-01..14) |
| Phase 6: Review Family | 9 (REVW-01..09) |
| Phase 7: Merge, Finish, Navigation & Distribution Surface | 16 (MERG-01..06, FNSH-01..03, NAV-01..03, DIST-01, DIST-02, DIST-03, DIST-05) |
| **Total** | **78** |

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 — Traceability populated by gsd-roadmapper; v1 count corrected from 73 → 78 (re-counted from checkboxes).*
