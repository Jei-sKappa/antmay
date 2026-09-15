---
version: 2
status:
  approved: 260714190939Z
---

# Spec: Project V3 workflow cutover

This spec defines the complete cutover of this repository to **Project V3** — a conventions-first workflow methodology built from reusable capability skills composed into three documented workflows — and the repository work required to land it: the skill migration, the six model-invoked primitives, the canonical documentation under `docs/project/v3/`, the derived-file updates (marketplace, README, `AGENTS.md`, `.gitignore`, `.vscode`), and the shared-reference sync tooling.

All `P<N>` citations below refer to records in this thread's decision log, `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md`. The log is append-only: 64 records, later records superseding earlier ones. A downstream planner or implementer must treat **this spec plus the cited records** as the authority; the supersession map in the Context section identifies which records are dead so no obsolete decision is re-derived from the log.

## Intended outcome

When this spec is implemented, the repository offers Project V3 as the active ruleset for all newly opened threads:

- A migrated, self-consistent skill suite under `skills/workflow/` — renamed, retired, added, and rewritten per the P51/P59 inventory — with every skill carrying synchronized Claude/Codex invocation-role metadata (P48) and no residual V2 thread semantics (tiers, ledgers, lineage folders, status latches, `.wip/`, durable reviews).
- Six model-invoked primitives under `skills/workflow/primitives/` (P49).
- Canonical Project V3 documentation at `docs/project/v3/` (P17), with the root `README.md`, `AGENTS.md`, `.claude-plugin/marketplace.json`, `.vscode/settings.json`, and `.gitignore` updated to match.
- The P64 shared-reference sync system: `shared/references/`, `shared/manifest.yaml`, and `scripts/sync-shared-references.mjs`, with committed generated copies under each declaring skill's `references/shared/`.
- V1/V2 documentation and pre-V3 threads left untouched as historical record (P14).

A user can then open a V3 thread, follow the Quick, Standard, or Roadmap workflow, and reach delivery entirely through the new suite.

## Context

The repository's primary purpose is better thinking with AI — clarifying intent, surfacing missing decisions, and producing reliable implementation handoffs — with continuity a secondary benefit of lightweight durable artifacts; machine orchestration is not a goal (P7). Real V2 usage showed that mechanical lifecycle bookkeeping (tiers, ledgers, approval latches, review dispositions, artifact versions) was routinely bypassed and did not improve thinking quality. Project V3 therefore replaces V2's enforcement-shaped machinery with documented conventions (P10) and cuts over cleanly: existing V1/V2 threads are not migrated or supported, and no compatibility branches are kept in any skill (P14).

This design thread (`docs/threads/260711150919Z-v3-workflow-kinds/`) is itself structurally V2 per P14: this spec is authored under current V2 conventions while its *content* defines V3.

### How to read the decision log — supersession map

The log's later records win. The following earlier records or clauses are **dead** and must not leak into the implementation:

| Superseded record / clause | Superseded by | Surviving rule |
|---|---|---|
| P1, P2 — kind profiles and variants | P17, P18 | "Kind" terminology retired; user-facing model is Skills + Workflows (Quick / Standard / Roadmap); workflows have optional activities, never variants |
| P4, P5, P6 — obligation graph, evaluator, versioned contracts | P10 | Conventions-first: no executable workflow semantics, evaluator, CLI, or contract lockfile |
| P8, P19, P29, P31 — pre-P35 "review" semantics (auto-fixing reviews, reviews routing into the decision queue) | P54 (per P35, P36, P37, P39) | Mutating fixes belong to reconciliation operations; read-only reviews emit `.pending-reviews/` bundles and never write `.pending-decisions/` |
| P13 — `.wip/needs-decision.md` AFK handoff | P31 | `.pending-decisions/` queue (P13's interaction-posture taxonomy survives) |
| P15 — Quick Direct/Planned variant language | P18 | One Quick workflow with optional activities |
| P18 `Workflow:` seed line; P22 child-brief workflow selection | P24 | Seeds and child briefs carry a complete expanded `## Suggested workflow`, never a workflow name |
| P19 — workflow sequences and finish enumeration | P43, P42 | P43's sequences and P42's finish contract are authoritative |
| P23 — layout tree (as depiction; still shows `.wip/`) | P62 | P62's consolidated tree is the authoritative layout |
| P26 — "reference syntax deferred" | P53 | Day-one syntax decided: repo-relative thread-root paths |
| P28 — `.drafts/` and generic `.runs/` | P40 | Only `.implementation-runs/`; `.wip/` retired entirely |
| P32 — one pending-decision file per question | P33 | Resumption bundles (one producer + one coherent target + one resumption action) |
| P33 `Resume:` header; P34 automatic producer resumption | P47 | Bundles carry an advisory `## Suggested action after resolving the decisions`; the resolver offers an interactive choice, never auto-invokes |
| P25 "no other copy of the sequences"; P55 "open-thread copy is canonical / hand-sync" | P55, P64 | Canonical templates live in `shared/references/`; skill copies are script-generated mirrors under `references/shared/` |
| P44's escalation list read as a reduced workflow | P58 | Escalated Quick threads adopt the complete Standard tail, including `reconcile-plan` |

## Scope

### In scope

- The full V3 skill migration: renames, retirements, additions, deep rewrites, retained-skill metadata updates, and the new group layout (P51, P59).
- The six model-invoked primitives and the invocation-role metadata scheme across both harnesses (P48, P49).
- Canonical documentation at `docs/project/v3/` and the root `README.md` workflow/skill index (P17).
- Derived repository files: `.claude-plugin/marketplace.json`, `.vscode/settings.json` commit scopes, `.gitignore` rules for the three thread-local workspaces, and `AGENTS.md` (P51).
- The shared-reference sync system: `shared/references/`, `shared/manifest.yaml`, `scripts/sync-shared-references.mjs`, committed generated copies (P64).
- Regeneration of the Raycast manifest through the existing generator (P51).

### Out of scope

- **Archival-link repair or rewrite behavior** (P52, P53). A dedicated future thread owns it. V3 knowingly accepts that repo-relative references may break when a referenced thread moves under `docs/threads/archive/`; the implementation must name this limitation where archival is documented and must NOT design repair, indirection, or an ID registry.
- **The future public rebaseline** — presenting a mature methodology as a fresh public v1 and deleting experimental docs (P14). Not a commitment of V3.
- **Dependency-aware installation** — dependency metadata, closure installs, call-graph validation, repair (P30). A missing invoked skill is an installation error; V3 is designed and tested as a coherent installed suite.
- **Any change to implementation/commit mechanics beyond what P50 permits.** `implement`, `implement-plan`, and `implement-plan-with-subagents` keep their current execution, subagent, review-loop, and auto-commit semantics; only the P50-enumerated migrations apply.
- **Migrating, supporting, or editing V1/V2 threads and documentation** (P14). `docs/workflow/v1/` and `docs/workflow/v2/` remain unchanged.
- **Any evaluator, CLI, enforcement engine, or machine-authoritative workflow state** (P10). The only executable code this cutover ships is the P64 sync script.

## Target design

This section is the normative description of what the migrated skills and new documentation must encode. It is expected behavior for the produced artifacts: each rule below must be expressed by the owning skill's instructions and/or the owning `docs/project/v3/` document.

### Design principles

- Conventions over enforcement: workflows guide, never govern; skipped steps do not invalidate a thread (P10, P43).
- Subject-neutral workflows: the user chooses process shape; nothing routes bugs/features/docs to a workflow by subject (P15).
- Exactly three workflows to start. A future workflow is admitted only when actual use demonstrates a distinct purpose, durable artifact structure, and natural completion shape that an existing workflow would distort; a subject label alone never justifies one (P15).
- Reusable capability skills composed by documentation, not by orchestrators or prefixed per-workflow suites (P16).
- Better thinking and reliable handoff over continuity and orchestration (P7).

### Thread model

#### Layout

The authoritative V3 thread layout (P62 — reproduce this tree, not P23's):

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/        (archive: docs/threads/archive/<...>/, P11)
├── seed.md                       eager (P23, P26)
├── decisions.md                  eager (P9, P23)
├── proposal.md                   optional (P23)
├── spec.md                       optional (P23)
├── plan.md                       optional; brief plan or strict-plan index (P23, P44)
├── plan-tasks/                   strict plan only (P23)
├── implementation-report.md      singleton current outcome (P23, P45)
├── roadmap.md                    Roadmap only (P41)
├── roadmap-feedback.md           Roadmap only, eager at roadmap authoring (P21)
├── .pending-decisions/           gitignored; AFK→human decision bundles (P31–P34, P47)
├── .pending-reviews/             gitignored; review findings bundles (P36)
└── .implementation-runs/         gitignored; invocation-scoped implementation state (P40)
```

`seed.md` and `decisions.md` are created eagerly when a thread opens; everything else on demand. There are no lineage folders, artifact versions, `reports/` directories, artifact-local `discussions/`/`reviews/` folders, or `.wip/` (P23, P40, P62).

#### Seed contract

- Every seed carries exactly three conceptual requirements: a title, a self-contained genesis narrative, and a complete `## Suggested workflow` section (P26).
- The suggested workflow is the full expanded sequence in human-readable prose with optional steps explicitly labelled — copied verbatim from a template or supplied complete by the user. No workflow name, progress markers, or lifecycle values are persisted; a thread is opened *from* a template, it does not *have* a workflow type (P24).
- `open-thread` accepts a built-in template name (Quick, Standard, Roadmap) or a complete custom suggestion; a name is invocation input only and is resolved against the skill's local seed-ready references. If neither is supplied, it asks — it never infers a workflow from the subject (P25).
- Optional metadata appears only when it carries information: `External:` only when a real external source exists (never `none`), parent/brief references only on materialized Roadmap children, `Supersedes:` only when useful. No owner, tier, disposition, or placeholder fields (P26).

#### decisions.md

- Exactly one thread-wide `decisions.md`, created eagerly with the seed; header-only when no decisions exist. Settled decisions are recorded as self-contained `D<N>` records with Title, optional `Scope`, mandatory `Context`, `Decision`, `Rationale`, following the field rules in P9. Changed decisions append superseding records naming the record they replace; history is never rewritten (P9).
- The seed plus `decisions.md` must suffice to author the next artifact without the chat (P9).
- **Any skill, regardless of posture, that elicits a new human decision mid-run appends it to `decisions.md` before acting on it.** Decision-append authority attaches to the act of eliciting, not to a class of skills. Trivial input clarifications need no record (P57).

#### Lifecycle and archive

- No ledger. A thread under `docs/threads/` is active or unfinished; a thread under `docs/threads/archive/` is terminal. No deferred/resumed states. Abandonment is recorded as a decision with rationale in `decisions.md`; completion is evidenced by the workflow's terminal artifact — that durable content is what distinguishes completed from abandoned archived threads. Archiving is the explicit act that ends the active lifecycle (P11).
- Before moving a thread, `archive-thread` inspects the three temporary workspaces; if any are non-empty it names their contents and asks for one confirmation. It never deletes them — on confirmed archival they are carried along as inert residue with no workflow meaning. Pending-state semantics apply only to active threads (P60).
- Archival is by explicit user intent; no ledger or latch checks (P51). Cross-thread references may break on archival — accepted limitation, named but not solved (P52).

#### Write authority

Explicit skill write authority replaces versions, latches, and freeze rules (P12): the thread-opening operation alone writes the seed; decision-eliciting operations append to `decisions.md`; authoring and reconciliation operations edit their declared current-thread target; implementation reads spec/plan but never edits them to justify work; reports are written by the operation that did the work; no skill modifies other active threads; archived threads are read-only — with exactly one exception: a Roadmap descendant may append records to its parent's `roadmap-feedback.md` (P21).

Living project documentation (README content, user docs, architecture references, runbooks, repository conventions) describes the current system and evolves across threads; thread artifacts are historical. When implementation changes documented behavior, updating the affected living documentation is part of implementation; where no living documentation exists, none is invented — code and tests remain authoritative (P12).

#### External references and branches

- External tracker references are passive: linking a ticket authorizes reading it and recording its URL in `External:`, never commenting, transitioning, or closing. When a supplied ticket must be read to build a self-contained seed and read access is unavailable, `open-thread` asks the user to provide the relevant content rather than failing or partially performing external operations. `open-ticket` remains the only skill whose invocation authorizes creating a ticket; any other tracker mutation requires an explicit user request. `finish` may include a non-closing `Related to <ticket>` reference in a PR body (P27).
- Project V3 is branch-agnostic: no thread-to-branch mapping exists, no workflow skill creates, switches, or names a branch on its own initiative; thread identity lives in the thread folder only (P61).

#### Cross-thread reference syntax

Repo-relative thread-root directory paths, always pointing at the thread folder, never a file inside it — e.g. `Materialized thread: docs/threads/260714093000Z-auth-boundary/`. `Parent:` in a child seed uses the same form; `Roadmap brief:` uses the parent's stable `C<N>` identifier. No link-repair mechanism or ID registry (P53).

#### Temporary workspaces

Three gitignored, dot-prefixed, on-demand folders — nothing else (P40, P62):

- **`.pending-decisions/`** — the universal bridge from AFK-oriented work to human judgment (P31). One uniquely named file per *resumption bundle*: one producer + one coherent target + one resumption action, holding one or more canonical discussion points (P33). Bundles carry the P33 routing header (Producer, Target, Created, Points, Summary) **without a `Resume:` line**, plus a required advisory `## Suggested action after resolving the decisions` paragraph (P47). Only genuine human decisions enter the queue.
- **`.pending-reviews/`** — findings bundles from read-only reviews (P36). A clean review returns a chat pass and creates **no file**; a review with findings writes one uniquely named bundle per run using P36's schema (routing header; optional `## Context`; `F<N>` findings each with Severity blocker/issue/nit, review-specific Category, Finding, Evidence, Impact, optional Suggested action; ordered by severity then category). Consumption is manual composition: any capable agent addresses findings on explicit instruction; no `Address with:` field, no statuses, no auto-retry loops; the bundle is removed when judged addressed, dismissed, or superseded (P38).
- **`.implementation-runs/`** — invocation-scoped implementation state: `<UTC>-plan-<ref>/progress.md` plus subagent outcome/review files for the subagent skill. Unique run directory per invocation; normal terminal outcomes write/update `implementation-report.md` then remove the run directory; interrupted runs survive for explicit resumption only; no durable artifact ever references a path inside it (P40).

### Workflows

Three built-in, subject-neutral workflows (P15), documented as compositions of capability skills (P16), with optional activities instead of variants (P18). Bracketed = suggested when useful; unbracketed = documented normal path, never mechanically enforced; reconciliation is unbracketed normal maintenance, independent reviews are optional (P43). `resolve-pending-decisions` is reactive infrastructure available whenever a queue exists, not a stage repeated in the diagrams (P43). The sequences (P43):

```text
Quick
open-thread → [discussion] → [plan-brief] → implement
→ [review-implementation] → [review-code] → finish → [archive-thread]

Standard
open-thread → discussion → [proposal → reconcile-proposal] → spec → reconcile-spec
→ [review-spec] → plan-strict → reconcile-plan → implement-plan
→ [review-implementation] → [review-code] → finish → [archive-thread]

Roadmap
open-thread → discussion → [proposal → reconcile-proposal] → roadmap → reconcile-roadmap
→ [review-roadmap] → materialize-roadmap-threads → finish → [archive-thread]
```

- Quick has no reconciliation step by design (P43). `implement` accepts `plan.md` as input or runs straight from seed/decisions/reference/prompt (P44).
- **Escalation** (Quick→Standard, in place, same thread): create `spec.md` → `reconcile-spec` → `plan-strict` replaces the brief `plan.md` with the strict index and creates `plan-tasks/` atomically (P44) — then the thread continues with **the complete Standard tail**: `reconcile-plan` → `implement-plan` → optional reviews → `finish`. An escalated thread and a born-Standard thread are indistinguishable from the specification stage onward (P58). The reverse transition requires an explicit instruction to replace a strict plan (P44).
- Roadmap finishes after decomposition and materialization; it is not a long-lived umbrella, tracks no child status, aggregates no progress. A child may itself be opened from the Roadmap template when further decomposition is genuinely required; parent–child cycles are not meaningful and must not be created (P20).
- Workflow diagrams list user-invoked operations, not emitted artifacts; there is no separate `report` step (P19 as retained by P43).

### Roadmap artifacts

- `roadmap.md` follows P41's contract: Intended outcome, Context, Scope and boundaries, Shared constraints (multi-child rules only; child-specific constraints stay in the brief), Decomposition rationale, and `C<N>` child briefs each carrying Outcome, Context, Scope and boundaries, Dependencies (described as consumed inputs), Relevant shared constraints, and a **complete expanded suggested workflow** (never a bare name — P24). No checkboxes, statuses, owners, progress, or latches. `Materialized thread:` is absent until materialization adds the factual repo-relative reference (P41, P53).
- `roadmap-feedback.md` is created eagerly at roadmap authoring, starts with `# Roadmap Feedback`, and accrues append-only `F<N>` records (Title, Source, Affects, Context, Impact, Recommendation) from descendants only for discoveries with parent- or sibling-level impact (P21). Descendants may append; they may not rewrite `roadmap.md`, parent decisions, or sibling artifacts (P21).
- **Descendant feedback is consumed, not just produced** (P21): a future child's preflight reads its own seed and `decisions.md`, the parent `roadmap.md`, and the relevant `roadmap-feedback.md` records — never every sibling thread. Adjustments that follow mechanically from existing durable decisions are incorporated; an adjustment that changes human intent is asked interactively and recorded in the child's `decisions.md` (P57); under an explicit AFK invocation the operation emits a `.pending-decisions/` bundle and stops rather than inventing intent (P31); feedback implying work outside existing child briefs may lead to recommending an additional child thread, never creating one silently. `whats-next` surfaces feedback relevant to future children (P46).
- Authoring and materialization are separate capabilities: `roadmap` writes the two artifacts and creates no threads; `materialize-roadmap-threads` creates children from briefs idempotently — creating unreferenced briefs, skipping and verifying referenced ones, adding each reference immediately after creation (P22, P41). It copies already-expanded suggestions verbatim, never resolving a name against newer templates; a brief lacking a usable suggestion is asked about interactively, or recorded and skipped under AFK (P24).

### Reconciliation versus review

Two fixed operation categories; each skill has one predetermined mutation contract, never invocation-time modes (P35):

- **Reconciliation** (mutating): inspects a workflow artifact, corrects it where the fix follows from authoritative existing decisions, rechecks, routes irreducible human intent into `.pending-decisions/` bundles, never edits its authority source (a source fault becomes a pending decision, never a patch around it), produces no review report (P35). `reconcile-spec` absorbs lossless-mapping: it enforces a lossless, additive-free expression of the governing decisions — adding omitted decisions, correcting contradictions, removing invented commitments, preserving legitimate elaboration (P37, P39).
- **Review** (read-only): independently assesses a consequential handoff or delivered work; never edits the target; clean pass → chat only; findings → one `.pending-reviews/` bundle (P35, P36). `review-spec` judges handoff quality and planning readiness, not exhaustive decision fidelity (P37).
- The taxonomy (P39): `reconcile-proposal` (rename of `review-proposal`), `reconcile-spec` (new; successor of `review-lossless-mapping`), `reconcile-plan` (rename of `review-plan`), `reconcile-roadmap` (new), plus read-only `review-spec`, `review-implementation`, `review-code`, `review-roadmap` (new). No read-only proposal or plan reviews are retained.
- **Review authority anchors** (P56): both implementation-facing reviews anchor to the most specific durable intent available — `spec.md`, else `plan.md` (brief, or strict index plus tasks), else `seed.md` — with `decisions.md` always binding. `review-implementation` additionally treats `implementation-report.md` as the claim under test. A coarse anchor is named explicitly in the bundle's `## Context` and findings are scoped to it; acceptance criteria are never invented. `review-code`'s intrinsic quality axes apply regardless of anchor depth.

### Implementation outcome

- `implementation-report.md` is the singleton current-outcome artifact following P45's contract: required `Source`, `Outcome`, `Changes`, `Verification`; optional `Deviations and judgment calls`, `Remaining concerns`, `Follow-ups` (no `none` placeholders). Updated in place across passes, including blocked and no-op outcomes; stale content removed; no run transcripts, no `.implementation-runs/` references, no retroactive spec/plan edits; verification records only checks actually performed, including failures and justified skips (P45).
- Implementation and commit mechanics are preserved exactly (P50): per-task/per-cycle auto-commits, the explicit Git-instruction override, and `implement-plan-with-subagents`' checkpoints, loops, and boundaries. V3 changes to the three implementation skills are limited to: shallow layout paths (`plan.md`, `plan-tasks/`), `.implementation-runs/` in place of `.wip/`, the singleton report via `update-implementation-report`, `.pending-decisions/` and Roadmap-feedback behavior, removal of tier/ledger/latch/lineage assumptions, and P48 metadata.

### Planning

- `plan-brief` (successor of deprecated `plan-loose`, with a substantially smaller contract) writes the thread-root `plan.md`: required `Source` line, `## Outcome`, `## Steps` (short numbered paragraphs), `## Verification` (overall, not per-step), optional `## Notes`; normally one screen; no task files, per-step criteria, file inventories, frontmatter, or state. It normally reads `seed.md`, `decisions.md`, and any explicit code or issue reference, and emits a plan independent of the chat. It recommends `plan-strict` when safe planning needs more (P44).
- `plan-strict` writes `plan.md` as the authoritative index plus dispatchable briefs under `plan-tasks/01-<kebab-slug>.md`… (P23), shedding all lineage/tier/`.wip/` rules (P51).

### Finish, navigation, archival

- `finish` is an interactive, advisory delivery handoff per P42: a signal-only readiness inspection (principal outcome, the three workspaces, conflict markers, living docs, branch/worktree state, recorded verification — empty categories omitted); advice never gates; then exactly three branch dispositions — create PR, merge into a confirmed target, or leave as-is. It never silently commits a dirty worktree (asks to authorize an explicitly identified file set, or returns), never rebases/amends/force-pushes, never mutates trackers, and afterwards offers `archive-thread` as optional housekeeping. It sets no latches, appends no closures, updates no living docs itself (P42).
- `whats-next` is a read-only, evidence-based advisor per P46: reads location (active vs archive), seed suggestion, decisions, artifacts, workspace headers, branch state, and optional user hints; gives conditional advice for operations that leave no success evidence (reconciliation); prioritizes pending intent → resumable runs → review findings → suggested-path comparison → alternatives; writes nothing, marks nothing complete, never treats divergence as error.
- `archive-thread` behavior per P60 (see Lifecycle above), plus the named P52 limitation.

### Skill architecture

- **Interaction posture** is an authoring principle, not runtime schema: no `interaction:` field or mandatory mode sections. Dialogue-driven skills converse; completion-oriented skills finish from durable inputs and ask only when judgment is indispensable; one-shot deliverables return their payload. An explicit AFK invocation overrides posture; a blocked AFK repository-writing operation emits a `.pending-decisions/` bundle (P13 as amended by P31) rather than asking (P13, P31).
- **One-way composition** (P29): user-invoked entry points may invoke model-invoked primitives via `/skill-name` prose; primitives never invoke entry points; no cycles; primitives own behavior, references own passive formats. **A skill may never read another skill's `references/`** — invocation is the only permitted cross-skill coupling (P55). Missing dependencies are installation errors (P30).
- **Invocation roles enforced on both harnesses** (P48): every user-invoked skill sets `disable-model-invocation: true` in `SKILL.md` frontmatter AND ships `agents/openai.yaml` containing `policy: allow_implicit_invocation: false`; the two must never diverge. User-invoked descriptions are concise human-facing summaries; primitives omit both restrictions — omission is the model-invocable configuration — and carry model-routing descriptions that open with their bounded precondition (P48, P49).
- **The six primitives** (P49) — `discussion-point` (canonical point structure and one-point-at-a-time discipline), `emit-pending-decisions` (bundle allocation, P33/P47 shape, advisory follow-up, refuses non-human-decision content), `emit-pending-review` (P36 path allocation, schema, `F<N>` numbering, no-file-on-clean), `create-thread` (normalized folder/seed/decisions creation; requires an explicit caller-authorization block naming the invoking operation and every normalized field, else refuses and directs to `open-thread`; never interprets ideas or chooses workflows), `update-implementation-report` (P45 merge semantics, keeps transcripts and run paths out), `append-roadmap-feedback` (next `F<N>`, P21 shape, rejects local-only notes). Callers own domain judgment; primitives own the bounded shared side effect.
- **No V2-awareness** (P63): V3 skills contain no detection heuristic, refusal protocol, or mention of earlier thread layouts. Each skill precisely states the V3 inputs it expects; a mismatched input (a V2 thread, a spreadsheet) is handled by ordinary agent judgment — notice and ask.

## Cutover work

### Skill migration inventory (P51, completed by P59)

**Renames / promotions** (no compatibility wrappers or aliases):

| Current | V3 | Notes |
|---|---|---|
| `skills/workflow/review/review-proposal` | `skills/workflow/reconcile/reconcile-proposal` | Read-only review behavior replaced with reconciliation |
| `skills/workflow/review/review-plan` | `skills/workflow/reconcile/reconcile-plan` | Corrective plan-adherence behavior preserved and simplified |
| `skills/deprecated/plan-loose` | `skills/workflow/plan/plan-brief` | Rewritten to P44's smaller contract |

**Retire into `skills/deprecated/`** (folders keep their names; historical, out of active docs and active plugin groups):

| Skill | Reason |
|---|---|
| `seeded-discussion` | Replaced by `.pending-decisions/` + `resolve-pending-decisions` |
| `record-verdict` | No latches exist to record |
| `review-lossless-mapping` | Succeeded by `reconcile-spec` (P37, P39) |

**New user-invoked skills** (placements per P59): `plan-brief` → `plan/`; `resolve-pending-decisions` → `capture-discussion/`; `roadmap`, `materialize-roadmap-threads` → `roadmap/`; `reconcile-proposal`, `reconcile-spec`, `reconcile-plan`, `reconcile-roadmap` → `reconcile/`; `review-roadmap` → `review/`.

**New model-invoked primitives** → `skills/workflow/primitives/`: `discussion-point`, `emit-pending-decisions`, `emit-pending-review`, `create-thread`, `update-implementation-report`, `append-roadmap-feedback`.

**Deep rewrites** (per P51, encoding the Target design above): `open-thread` (delegates to `create-thread`; shallow seed + eager `decisions.md`; template resolution per P25/P64; no tier/ledger), `discussion` (uses `discussion-point`; writes `D<N>` records to singleton `decisions.md`), `propose` (root `proposal.md`; no versions/latches/lineage/`.wip/`), `spec` (root `spec.md`; same removals; pending-decision primitive when blocked), `plan-strict`, `implement` / `implement-plan` / `implement-plan-with-subagents` (P50 boundary), `review-spec` / `review-implementation` / `review-code` (strictly read-only via `emit-pending-review`; nothing on clean; P56 anchors), `merge-artifacts` (explicit candidate paths regardless of location; root artifacts and singleton decision log; newly settled human choices recorded per P57; no V2 freeze/lineage/status assumptions), `finish` (P42), `whats-next` (P46), `archive-thread` (P60, P52).

**Retain with small or metadata-only changes**: `open-ticket` (note: its P27 alignment is a substantive wording edit, not metadata-only — the current body references ledgers, latches, and finish-closing-the-ticket behavior, all of which must go), `afk-exploration`, `the-librarian`, `take-snapshot`, `brief-the-recipient`, `consult-the-expert`, `report-to-the-owner`, `meta-prompting` — functional behavior preserved unless a direct V3 contradiction is found; all receive P48 metadata and concise human-facing descriptions, and any residual V2 thread vocabulary is removed (AC-1.4 applies to retained skills too).

**Final group layout** (P51):

```text
skills/workflow/
├── capture-discussion/   open-thread, open-ticket, discussion, resolve-pending-decisions
├── propose/              propose
├── spec/                 spec
├── plan/                 plan-strict, plan-brief
├── roadmap/              roadmap, materialize-roadmap-threads
├── reconcile/            reconcile-proposal, reconcile-spec, reconcile-plan, reconcile-roadmap
├── implement/            implement, implement-plan, implement-plan-with-subagents
├── review/               review-spec, review-implementation, review-code, review-roadmap
├── primitives/           discussion-point, emit-pending-decisions, emit-pending-review,
│                         create-thread, update-implementation-report, append-roadmap-feedback
├── merge/                merge-artifacts
├── finish-navigate/      archive-thread, finish, whats-next
├── research/             afk-exploration, the-librarian
├── documentation/        take-snapshot
├── handoff/              brief-the-recipient, consult-the-expert, report-to-the-owner
└── support/              meta-prompting
```

`skills/deprecated/` afterwards holds: `adjust-plan-granularity`, `capture-inbox`, `discussion-loop`, `record-verdict`, `review-decision-document`, `review-lossless-mapping`, `seeded-discussion` (`plan-loose` has moved out).

### Canonical documentation (P17)

Create `docs/project/v3/`:

```text
docs/project/v3/
├── README.md            architecture: reusable capability skills composed into workflows
├── thread-model.md      shared thread substrate
├── skill-authoring.md   cross-skill authoring conventions
└── workflows/
    ├── quick.md
    ├── standard.md
    └── roadmap.md
```

Required content mapping:

- `README.md` — the architecture (capability skills composed into separately documented workflows), the conventions-first stance, and the P15 admission bar for any future workflow.
- `thread-model.md` — the P62 layout; seed contract (P24–P26); `decisions.md` and the P57 recording rule (P9, P57); archive lifecycle, the P11 abandonment-decision convention, and the P60 warning behavior; write authority (P12) with the P21 exception; the living-documentation distinction and the update-during-implementation rule (P12); passive external references (P27); the P53 reference syntax; branch-agnosticism (P61); the three temporary workspaces and their bundle contracts (P31/P33/P47, P36/P38, P40); the named P52 archival-link limitation.
- `skill-authoring.md` — interaction posture (P13 as amended), one-way composition and the no-reference-reads rule (P29, P55), the coherent-suite dependency assumption (P30), invocation-role metadata (P48), primitive-extraction bar (P49), reconciliation-vs-review semantics (P35), when a materially different capability earns a separate skill (P16), no V2-awareness (P63), the shared-reference authoring rule (P64).
- Each `workflows/*.md` — the workflow's purpose, P43 sequence, optional activities, durable outputs, user involvement, and natural terminal outcome, with `resolve-pending-decisions` presented as reactive infrastructure rather than a stage (P43); Quick and Standard documents cover the P44/P58 escalation; the Roadmap document covers the P41/P21 artifacts, the P21 descendant feedback loop in both directions (the narrow append authority and the child preflight/consumption rules), and P22 materialization. Workflow documents point to the canonical templates for the exact seed text and do not duplicate the `## Suggested workflow` sections verbatim (P25).

### Shared-reference sync tooling (P64)

- `shared/references/` at the repo root holds the canonical shared files — initially the three seed-ready workflow templates `shared/references/workflows/{quick,standard,roadmap}.md`, each containing the complete canonical `## Suggested workflow` section expressing the P43 sequence in P24's labelled-prose format.
- `shared/manifest.yaml` — a flat map of skill path → list of shared file paths, deliberately restricted so a dependency-free parser suffices. Initial declarations: `open-thread` and `roadmap`, each listing the three workflow templates (P55).
- `scripts/sync-shared-references.mjs` — dependency-free Node in the style of `raycast-extension/scripts/sync-skills-to-raycast.mjs`; on each run it wipes and re-creates each declaring skill's `references/shared/` from the canonical sources (deletion authority confined to that generated folder — malformed input must never result in deletion outside it); run manually after editing shared sources.
- Generated copies land at `references/shared/…` inside each declaring skill, are **committed**, and flow into distribution and the Raycast manifest unchanged. Never hand-edited; the rule is documented in `AGENTS.md`.

### Derived repository files

- **`.claude-plugin/marketplace.json`** — add plugins `JeisKappa-roadmap`, `JeisKappa-reconcile`, `JeisKappa-primitives`; update every group's `skills` array to the final layout (including moving retired skills into `JeisKappa-deprecated` and removing `plan-loose` from it); keep `plugins` alphabetical by `name` with `JeisKappa-deprecated` last (P51 + existing repo rule).
- **Root `README.md`** — a compact, subject-neutral workflow table linking directly to each `docs/project/v3/workflows/*.md` and describing only process shape (P17); the skill index updated to the final inventory, distinguishing user-invoked skills from model-invoked primitives (P48); install snippets per existing repo convention.
- **`AGENTS.md`** — updated to reflect the decided V3 state, including at minimum: the new layout; a V3 pointer section making `docs/project/v3/` the active ruleset for new threads (with V2 joining V1 as grandfathered, per P14); the P48 metadata pair and its Claude/Codex synchronization requirement; replacement of the V2 skill self-containment prohibition with the P29/P55 composition rules; the P64 authoring rule (edit `shared/references/`, run the script, never hand-edit `references/shared/`); and "when adding a new skill" steps matching the new groups and metadata. V1/V2 pointer sections and canonical docs remain intact (P14).
- **`.gitignore`** — add explicit rules ignoring `docs/threads/**/.pending-decisions/`, `docs/threads/**/.pending-reviews/`, and `docs/threads/**/.implementation-runs/` (dot-prefixing alone does not ignore — P28 as refined by P31/P36/P40).
- **`.vscode/settings.json`** — `conventionalCommits.scopes` updated to exactly the set of skill leaf folder names on disk, sorted alphabetically: remove `plan-loose`, `review-plan`, `review-proposal`; add `plan-brief`, `reconcile-plan`, `reconcile-proposal`, `reconcile-roadmap`, `reconcile-spec`, `resolve-pending-decisions`, `review-roadmap`, `roadmap`, `materialize-roadmap-threads`, and the six primitive names.
- **Raycast** — regenerate `raycast-extension/assets/skills.json` through the existing sync script only; no manual manifest edits, no generator redesign. If the migrated layout breaks the existing script, the minimal adjustment that restores a successful run is permitted — entailed by P51's requirement that regeneration happen through the existing generator (P51; matches AC-14.1).

## Constraints

- **Conventions-first**: no evaluator, CLI, obligation graph, contract lockfile, enforcement, or machine-authoritative state anywhere in the deliverables; the P64 script is the only executable code shipped (P10, P64). Absence of a bundle or artifact never proves an operation ran unless that artifact is the operation's declared durable output (P36, P46).
- **Clean cutover, no compatibility**: no V1/V2 branches inside skills, no legacy skill distribution, no old-thread migration; `docs/workflow/v1/` and `docs/workflow/v2/` and all pre-V3 threads are not modified (P14). This design thread stays structurally V2; its own artifacts (including this spec) follow V2 conventions (P14).
- **No residual V2 vocabulary in active skills**: no tiers, ledgers, lineage folders, frontmatter status latches, artifact versions, `.wip/`, durable review records, or mention of earlier thread layouts (P51, P63).
- **P50 boundary**: implementation skills' execution and commit mechanics are out of bounds beyond the enumerated migrations.
- **Metadata synchronization**: a skill must never be user-only in one harness and implicitly invocable in the other (P48).
- **Composition rules**: one-way invocation only, named via `/skill-name` prose; no cycles; no cross-skill `references/` reads (P29, P55).
- **Concurrency safety**: temporary bundle and run-directory allocation must be safe for concurrent producers — unique paths, never a shared singleton (P33, P36, P40).
- **Existing repo conventions stand where V3 does not supersede them**: leaf directory name matches frontmatter `name:`; `metadata.author`/`metadata.version` frontmatter with semver bumps on meaningful change and new skills starting at `1.0.0`; marketplace alphabetical order with deprecated last; the Raycast manifest is generated, never hand-edited; deliverable skills keep their no-preamble rule.
- **Lossless boundary for skill rewrites**: rewrites encode the cited decisions; retained skills change only what P51 names unless a direct V3 contradiction is discovered.

## Unresolved questions

None. Every specific surfaced while authoring this spec is either settled by the decision log (through P64), listed as out of scope with its owning future decision (P14, P30, P52), or explicitly granted below as a degree of freedom.

## Degrees of freedom

The *what* above is pinned; the following *hows* are the implementer's free choice:

1. **Prose and structure of skill bodies and documentation.** Section names, ordering, examples, and wording of every `SKILL.md` and `docs/project/v3/` file are free, provided each document encodes the contracts and rules mapped to it in this spec.
2. **Exact wording of the three canonical `## Suggested workflow` templates**, provided each expresses its P43 sequence completely, in human-readable numbered prose with optional steps explicitly labelled per P24, ready for verbatim seed insertion.
3. **Skill `description` phrasing**, within P48's posture split (human-facing summaries for user-invoked skills; routing descriptions opening with the bounded precondition for primitives).
4. **`metadata.version` values** assigned to renamed and rewritten skills (subject to the existing semver-bump convention; new skills start at `1.0.0`).
5. **Sync-script internals** — manifest parsing approach, validation and diagnostic behavior, logging, ordering, CLI ergonomics — within P64's constraints (dependency-free Node, restricted flat-map manifest, wipe-and-recreate and all deletion confined to `references/shared/`).
6. **Filename slug and collision-suffix scheme** for pending-decision bundles, pending-review bundles, and implementation-run directories, provided names are unique under concurrency and human-readable per P32/P33's conceptual shape.
7. **Git mechanics and sequencing of the cutover** — how renames/moves are performed, the order of work, and commit segmentation.
8. **README presentation details** (table layout, grouping, snippet formatting), provided the P17 table and the P48 role distinction are present.
9. **The fate of the legacy `docs/threads/**/.wip/` ignore rule** — it may be kept (it still serves untouched pre-V3 threads, consistent with P14) or removed; keeping it is recommended.
10. **Which retained-skill wording tweaks count as "direct V3 contradictions"** under P51's retain clause — resolved by the implementer's judgment, with anything touching product behavior routed through `.pending-decisions/`.
11. **Realizing P48's intent on Codex if omission proves insufficient.** P48 defines omission of both restrictions as the model-invocable configuration for primitives. If a harness's actual default makes omission insufficient (a primitive would not be implicitly invocable), the implementer may add the minimal positive setting that realizes P48's intent — primitives reachable by both model and user — keeping the Claude and Codex configurations synchronized.

## Acceptance criteria

Per the tier-2 machine-checkable requirement, each criterion is a concrete pass/fail assertion. Verification is by filesystem inspection, by grep, or by a reviewer reading the named file against the stated rule — the last category is checkable but not grep-automatable. Traceability is given per FR (and per AC where narrower); the coverage table at the end maps every expected-behavior area to its criteria.

### FR-1 — Final skill inventory and layout (P51, P59)

- **AC-1.1** `skills/workflow/` contains exactly the fifteen groups and per-group skill folders shown in "Final group layout"; each leaf folder contains a `SKILL.md` whose frontmatter `name:` equals the folder name and which carries `metadata.author` and a semver `metadata.version` per the existing repo convention.
- **AC-1.2** None of these paths exist: `skills/workflow/review/review-proposal/`, `skills/workflow/review/review-plan/`, `skills/workflow/review/review-lossless-mapping/`, `skills/workflow/capture-discussion/seeded-discussion/`, `skills/workflow/finish-navigate/record-verdict/`, `skills/deprecated/plan-loose/`.
- **AC-1.3** `skills/deprecated/` contains exactly: `adjust-plan-granularity`, `capture-inbox`, `discussion-loop`, `record-verdict`, `review-decision-document`, `review-lossless-mapping`, `seeded-discussion`.
- **AC-1.4** Case-insensitive greps across ALL files under `skills/workflow/` (skill bodies, `references/`, `agents/`) return no matches for the fixed strings `.wip`, `ledger.md`, `status.approved`, `status.implemented`, `record-verdict`, nor for the word-boundary regexes `\btier\b` and `\bledger\b` — the `.implementation-runs/` progress file is named and described as `progress.md`, never as a "ledger". No active skill file references V1/V2 thread layouts or instructs any V2-detection behavior (P51, P63).

### FR-2 — Invocation-role and interaction metadata (P48, P49, P13)

- **AC-2.1** Every `SKILL.md` under `skills/workflow/` EXCEPT the six under `primitives/` contains `disable-model-invocation: true` in frontmatter.
- **AC-2.2** Every such skill folder contains `agents/openai.yaml` with `policy.allow_implicit_invocation: false`.
- **AC-2.3** None of the six primitives contains either restriction — omission is the model-invocable configuration per P48 (see Degrees of freedom #11 if a harness default contradicts this) — and each primitive's `description` opens with its bounded caller precondition.
- **AC-2.4** For every skill, the Claude and Codex settings agree (no skill restricted in one harness only).
- **AC-2.5** No `SKILL.md` under `skills/workflow/` contains an `interaction:` frontmatter key or a mandatory interaction-mode section; interaction posture is conveyed by each skill's purpose, description, and operating instructions, with an explicit per-skill rule only where behavior would otherwise be surprising (P13).

### FR-3 — Thread genesis (P24–P27, P49, P53)

- **AC-3.1** `open-thread/SKILL.md` instructs: accept a built-in template name or a complete custom suggestion; resolve names against its local `references/shared/workflows/` copies; copy the `## Suggested workflow` verbatim into `seed.md`; persist no workflow name; ask when neither input is supplied and never infer a workflow from the subject or apparent complexity; create `decisions.md` eagerly (header-only allowed); write `External:` only when a real source exists.
- **AC-3.2** `open-thread` performs no tracker writes and does not fail thread creation on missing tracker access; when a supplied ticket must be read and read access is unavailable, it asks the user for the relevant content rather than partially performing external operations (P27); no tier or ledger behavior remains.
- **AC-3.3** `primitives/create-thread/SKILL.md` requires an explicit caller-authorization block naming the invoking operation and every normalized field, refuses without it directing the user to `open-thread`, and never chooses a workflow or interprets a rough idea.
- **AC-3.4** `open-ticket/SKILL.md` still creates exactly one ticket on explicit invocation and its wording matches P27's passive `External:` semantics.

### FR-4 — Decision capture (P9, P29, P31, P33, P47, P49, P57)

- **AC-4.1** `discussion/SKILL.md` invokes `/discussion-point` for concrete forks and appends `D<N>` records (Title, optional Scope, mandatory Context, Decision, Rationale, per P9's field rules) to the thread-root `decisions.md`; superseding records are appended naming the superseded record, never rewritten.
- **AC-4.2** `resolve-pending-decisions/SKILL.md` implements P33 selection — list bundle routing headers without loading unrelated bodies; select a sole bundle directly; present a compact queue for choice when several exist, recommending an order only when dependency or urgency materially favors one — and P47 follow-through (discuss one point at a time; record each decision to `decisions.md`; remove settled points; delete exhausted bundles; reassess the producer's suggested action; offer a recommendation; wait for the user's choice; one bounded continuation if accepted; no automatic skill invocation, no recursive consumption of a newly emitted bundle).
- **AC-4.3** `primitives/emit-pending-decisions/SKILL.md` owns unique bundle allocation and the P33/P47 shape — routing header without any `Resume:` line, required `## Suggested action after resolving the decisions`, canonical points via `/discussion-point` — and refuses empty or non-human-decision content.
- **AC-4.4** The P57 rule — every elicited human decision is appended to `decisions.md` before it is used — appears in `docs/project/v3/` (thread-model or skill-authoring) and in the instructions of the completion-oriented skills that may legitimately ask (`propose`, `spec`, `plan-strict`, `plan-brief`, `roadmap`, the implement skills, `merge-artifacts`, `materialize-roadmap-threads`).
- **AC-4.5** `primitives/discussion-point/SKILL.md` owns the canonical discussion-point discipline (P29, P49): Title, Point, What you need to know, creative options or a practical proposed solution, Recommendation, the facts-versus-human-decisions separation, and one-point-at-a-time presentation; it supports both interactive presentation and normalization/emission of a point into a caller-provided path.

### FR-5 — Authoring skills and layout paths (P23, P44, P62)

- **AC-5.1** `propose`, `spec`, `plan-strict`, and `plan-brief` write thread-root `proposal.md`, `spec.md`, and `plan.md` (+ `plan-tasks/` for strict) respectively; no lineage folders, `NNN` numbering, frontmatter version/status contracts, or `.wip/` references remain in any of them.
- **AC-5.2** `plan-brief/SKILL.md` matches P44: the required/optional section set, one-screen guidance, the recommend-`plan-strict` rule, the explicit-instruction requirement before replacing an existing strict plan, and removal of obsolete `plan-tasks/` in that case.
- **AC-5.3** `implement/SKILL.md` explicitly accepts `plan.md` as input and supports running from seed/decisions/reference/prompt when no plan exists (P44).
- **AC-5.4** `merge-artifacts/SKILL.md` accepts explicit candidate paths regardless of their storage location, requires no standard draft folder, and writes root artifacts and the singleton decision log with no V2 freeze/lineage/status assumptions.

### FR-6 — Reconciliation suite (P35, P37, P39, P43)

- **AC-6.1** `reconcile-proposal`, `reconcile-spec`, `reconcile-plan`, `reconcile-roadmap` each: edit their declared target when corrections follow from existing decisions; recheck after fixing; emit `.pending-decisions/` bundles (via `/emit-pending-decisions`) for irreducible human intent; never edit their authority source; produce no review report.
- **AC-6.2** `reconcile-spec/SKILL.md` states both lossless directions from P39: add governing decisions the spec omitted; remove or correct contradictions and unsupported additions; preserve legitimate elaboration and derived acceptance criteria.
- **AC-6.3** No skill offers invocation-time report-only/auto-fix mode switches (P35).

### FR-7 — Read-only reviews (P36, P38, P56)

- **AC-7.1** `review-spec`, `review-implementation`, `review-code`, `review-roadmap` each: never edit the reviewed target; return a concise chat pass and create no file when clean; on findings, write exactly one uniquely named bundle under `.pending-reviews/` via `/emit-pending-review`; never write `.pending-decisions/`.
- **AC-7.2** `primitives/emit-pending-review/SKILL.md` owns the P36 schema: routing header (Reviewer, Target, Created, Findings count), optional `## Context`, `F<N>` findings with Severity (blocker/issue/nit), Category, Finding, Evidence, Impact, optional Suggested action, ordered by severity then category.
- **AC-7.3** `review-implementation` and `review-code` state the P56 anchor precedence (`spec.md` → `plan.md` → `seed.md`; `decisions.md` always binding), `review-implementation` treats `implementation-report.md` as the claim under test, and both require naming a coarse anchor in the bundle's `## Context`.
- **AC-7.4** No bundle format or skill prescribes an `Address with:` field, statuses, dispositions, or automatic retry loops; addressing is documented as manual user-directed composition with explicit re-review and temporary-bundle cleanup (P38).

### FR-8 — Roadmap suite (P20–P22, P41, P49, P53)

- **AC-8.1** `roadmap/SKILL.md` emits `roadmap.md` per P41's contract and an eager `roadmap-feedback.md` headed `# Roadmap Feedback`; child briefs carry all P41 fields including a complete expanded suggested workflow; built-in names are expanded during authoring using the skill's local `references/shared/workflows/` copies; no child threads are created.
- **AC-8.2** `materialize-roadmap-threads/SKILL.md` implements idempotent materialization (create unreferenced briefs; skip-and-verify referenced ones; add `Materialized thread:` immediately after each creation), copies suggestions verbatim without template re-resolution, asks on a missing suggestion interactively, records-and-skips under AFK, writes `Parent:` as a repo-relative thread-root path and `Roadmap brief:` as `C<N>` (P53), and delegates creation to `/create-thread`.
- **AC-8.3** `primitives/append-roadmap-feedback/SKILL.md` allocates the next `F<N>`, validates P21's record shape (Title, Source, Affects, Context, Impact, Recommendation), appends without rewriting, works under the narrow archived-parent exception, and rejects local-only implementation notes.
- **AC-8.4** No Roadmap skill or document adds child status tracking, progress aggregation, checkboxes, or a long-lived coordinator role; parent–child cycles are named as never to be created (P20, P41).
- **AC-8.5** `docs/project/v3/workflows/roadmap.md` documents the descendant feedback loop in BOTH directions (P21): the append side (cross-child impact only, narrow write authority) and the consumption side — a child's preflight reads the parent `roadmap.md` and relevant `roadmap-feedback.md` records rather than sibling threads; mechanical adjustments are incorporated; intent-changing adjustments are asked and recorded in the child's `decisions.md`; under AFK a `.pending-decisions/` bundle is emitted and the operation stops; out-of-brief work is recommended as a new child thread, never silently created.

### FR-9 — Implementation skills (P40, P45, P50)

- **AC-9.1** All three implement skills use invocation-scoped `.implementation-runs/<UTC>-…/` directories per P40's rules (unique per invocation; recovery within an invocation; report-then-remove at normal terminal outcomes; interrupted runs resumable only by explicit identification; no durable references into the workspace). No `.wip/` usage remains.
- **AC-9.2** All three produce/update the singleton `implementation-report.md` via `/update-implementation-report` on every normal terminal outcome — including blocked and no-op outcomes — matching P45 (required Source/Outcome/Changes/Verification; optional sections without `none` placeholders; in-place updates removing stale content; honest verification including failures and justified skips; deviations recorded, never retro-edited into spec/plan).
- **AC-9.3** Per-task/per-cycle auto-commit defaults, the explicit Git-instruction override, and `implement-plan-with-subagents`' orchestration semantics are textually preserved from the current skills (P50).
- **AC-9.4** Descendant implement runs append parent-level discoveries via `/append-roadmap-feedback` only when P21's cross-child-impact rule is met.
- **AC-9.5** `primitives/update-implementation-report/SKILL.md` owns P45's singleton contract: merging a caller-supplied verified current outcome into the existing report, removing resolved or obsolete concerns, and keeping task transcripts and `.implementation-runs/` references out of the durable report; it does not inspect code or decide whether implementation succeeded (P45, P49).

### FR-10 — Finish, navigation, archival (P11, P42, P46, P52, P60, P61)

- **AC-10.1** `finish/SKILL.md` implements P42: the signal-only inspection list; advisory (non-gating) findings; exactly three branch dispositions with "leave as-is" valid; commit authorization only for an explicitly identified file set; no rebase/amend/force-push; passive tracker behavior (non-closing `Related to` only); offers `archive-thread` afterwards; sets no latches, closes no ledgers, updates no living docs itself.
- **AC-10.2** `whats-next/SKILL.md` implements P46: the read-only evidence list, conditional advice for evidence-less operations, the five-level prioritization, the concise Observed/Signals/Recommended/Alternatives shape with empty sections omitted and at most two to four suggested actions, and no writes or compliance judgments.
- **AC-10.3** `archive-thread/SKILL.md` implements P60: pre-move inspection of the three workspaces, named contents, single confirmation, no deletion; archives on explicit user intent with no ledger/latch checks; states P11's abandonment convention (abandoned work carries a `decisions.md` record with rationale) as guidance, not a gate; and names (without solving) the P52 link-breakage limitation.
- **AC-10.4** No V3 skill or document defines a thread-to-branch mapping or creates/switches/names branches on its own initiative (P61).

### FR-11 — Canonical documentation (P17 + mapped records)

- **AC-11.1** The six files of the P17 tree exist under `docs/project/v3/` with their assigned responsibilities; `docs/project/v3/README.md` states the P15 admission bar for future workflows.
- **AC-11.2** `thread-model.md` contains every element mapped to it in "Canonical documentation", including the P62 tree (with `.pending-decisions/`, `.pending-reviews/`, `.implementation-runs/`; no `.wip/`), the P11 abandonment convention, the P12 living-documentation rule, and the named P52 limitation.
- **AC-11.3** `skill-authoring.md` contains every element mapped to it, including the P48 metadata pair, the P55 no-reference-reads rule, and the P63 no-legacy-awareness rule.
- **AC-11.4** Each workflow document presents its P43 sequence with reconciliation unbracketed and reviews bracketed; Quick/Standard cover P44/P58 escalation; workflow documents link to the canonical templates instead of duplicating the seed text (P25).

### FR-12 — Derived repository files

- **AC-12.1** `.claude-plugin/marketplace.json` parses as JSON; contains plugins `JeisKappa-primitives`, `JeisKappa-reconcile`, `JeisKappa-roadmap`; every skill folder on disk appears exactly once under its group's plugin; entries are alphabetical by `name` with `JeisKappa-deprecated` last; `JeisKappa-deprecated` lists exactly the seven retired skills of AC-1.3.
- **AC-12.2** Root `README.md` contains a subject-neutral workflow table linking to the three `docs/project/v3/workflows/*.md` files, describes only process shape (P17), and distinguishes user-invoked skills from model-invoked primitives (P48); no retired skill appears among active skills.
- **AC-12.3** `AGENTS.md` documents: the new layout; `docs/project/v3/` as the active ruleset for new threads with V1 and V2 both grandfathered (V1/V2 pointer sections retained); the P48 metadata pair and synchronization requirement; the P29/P55 composition rules replacing the V2 self-containment prohibition; the P64 authoring rule; and "when adding a new skill" steps matching the new groups and metadata.
- **AC-12.4** `.gitignore` contains rules ignoring `docs/threads/**/.pending-decisions/`, `docs/threads/**/.pending-reviews/`, and `docs/threads/**/.implementation-runs/`.
- **AC-12.5** `.vscode/settings.json` `conventionalCommits.scopes` equals exactly the alphabetically sorted set of skill leaf folder names on disk (workflow + deprecated), including the six primitives, and excludes `plan-loose`, `review-plan`, `review-proposal`.

### FR-13 — Shared-reference sync tooling (P64, P55, P25)

- **AC-13.1** `shared/references/workflows/quick.md`, `standard.md`, and `roadmap.md` exist, each containing a complete `## Suggested workflow` section expressing its P43 sequence in P24's format (numbered prose, optional steps explicitly labelled).
- **AC-13.2** `shared/manifest.yaml` exists as a flat map (skill path → list of file paths, no anchors/nesting/multiline) declaring at least `open-thread` and `roadmap`, each with the three workflow templates.
- **AC-13.3** `scripts/sync-shared-references.mjs` exists, runs with no dependencies beyond Node, wipes and re-creates each declaring skill's `references/shared/` from `shared/references/`, and touches nothing outside those generated folders.
- **AC-13.4** After a script run, `open-thread/references/shared/workflows/` and `roadmap/references/shared/workflows/` are byte-identical to `shared/references/workflows/`, and those generated copies are committed (not gitignored).
- **AC-13.5** No skill instructs reading a path under another skill's folder (P55); `open-thread` and `roadmap` reference only their own `references/shared/` copies.
- **AC-13.6** Running the script twice in a row produces no second-run diff (deterministic output); on a malformed manifest or a missing declared source or skill path, the script fails without deleting or modifying anything outside declared `references/shared/` folders — hand-authored references are never touched (P64's deletion-authority confinement; diagnostics wording is free per Degrees of freedom #5).

### FR-14 — Raycast derivation (P51)

- **AC-14.1** `raycast-extension/scripts/sync-skills-to-raycast.mjs` is functionally unchanged (or minimally adjusted only if the new layout breaks it), and a fresh sync run succeeds against the migrated `skills/` tree with the new groups present in its output.
- **AC-14.2** `raycast-extension/assets/skills.json` remains gitignored and hand-unedited.

### FR-15 — Non-interference (P14)

- **AC-15.1** `git diff` for the cutover change shows no modifications under `docs/workflow/v1/`, `docs/workflow/v2/`, or any pre-existing thread under `docs/threads/` other than this thread's own V2-conventional artifacts (this spec lineage and downstream plan/report artifacts).
- **AC-15.2** No V3 skill or `docs/project/v3/` document instructs migrating, interpreting, or detecting pre-V3 threads (P14, P63).

### Coverage

Every expected behavior in "Target design" and every deliverable in "Cutover work" is enforced by at least one criterion:

| Expected-behavior / deliverable area | Covered by |
|---|---|
| Skill inventory, groups, no residual V2 vocabulary | FR-1 |
| Invocation-role metadata on both harnesses; interaction posture as prose, no runtime schema | FR-2 |
| Seed contract, thread genesis, external-reference passivity | FR-3 |
| decisions.md, discussion-point discipline, pending-decision queue, P57 | FR-4 |
| Authoring skills, shallow layout paths, plan depths, merge-artifacts | FR-5 |
| Reconciliation semantics and taxonomy | FR-6 |
| Read-only reviews, findings bundles, authority anchors, manual addressing | FR-7 |
| Roadmap artifacts, materialization, feedback loop both directions | FR-8 |
| Implementation runs, singleton report, preserved P50 mechanics | FR-9 |
| Finish, whats-next, archival, abandonment, branch-agnosticism | FR-10 |
| Canonical docs content, workflow sequences, escalation | FR-11 |
| Marketplace, README, AGENTS.md, .gitignore, .vscode | FR-12 |
| Shared-reference tooling and self-contained mirrors | FR-13 |
| Raycast derivation | FR-14 |
| V1/V2 non-interference and no legacy awareness | FR-15 |
