# Plan: Modular Agentic Workflow V2 — in-repo build

This plan sequences the build of the two in-repo deliverables of Workflow V2 from
the approved build contract `specs/001/spec.md` (`version: 2`, `status.approved`
set). The spec — its FR groups (FR-D docs, FR-S skills, FR-R repo upkeep) and their
machine-checkable acceptance criteria — **is** the contract. This plan only
*orders* and *references* that contract: each task names an objective, the FR(s) it
implements, the files to touch, and acceptance = the spec's AC IDs for those FRs
(referenced, never restated). It re-decides nothing and duplicates no AC. Where the
spec leaves something to the implementer it is a Degree of Freedom (spec §5); where
the spec settled a question it is cited, not re-opened.

The one thing the spec explicitly delegates to this phase is sequencing and commit
batching (spec §5 DoF item 12). That is what this document supplies.

Dogfooding V2: this plan lives in a lineage folder (`plans/001/`); it is a
disposable compiler-IR (spec AC-D7.8), so it carries **no `version` and no
`status` frontmatter** — none at all; within-thread references are thread-relative;
cross-location references (skills, `docs/workflow/`) are repo-relative; timestamps
use `YYMMDDHHMMSSZ`.

---

## Source of truth and inputs

- **Contract:** `specs/001/spec.md` (`version: 2`, Approved) — every task traces here.
- **Frozen design (reference only, do not edit):** `proposals/001/proposal.md`.
- **Background (why the spec is shaped as it is):**
  `proposals/001/discussions/260612201354Z-proposal-v1-review-findings-decision-log.md`
  (P1–P21) and
  `specs/001/discussions/260620171014Z-spec-review-and-flags-decision-log.md`
  (SR-P1–P9).
- **Repo conventions:** `AGENTS.md` (skill format, self-containment, version-bump,
  "When adding a new skill", commit scopes) and the V1 reference-doc shape at
  `docs/workflow/v1/` (the shape the V2 set succeeds — provenance line, companion-doc
  links, immutable-by-convention).

---

## How to read a task

Each task carries five fields:

- **Objective** — one line, derived from the FR (not a re-statement of its ACs).
- **Implements** — the FR(s).
- **Files** — create/edit/move targets (repo-relative).
- **Acceptance** — the spec AC IDs that prove the task done. A reviewer confirms the
  task by checking those ACs against the listed files; the AC text lives in the spec.
- **Depends on** — predecessor tasks / phases.

Tasks are independently implementable and independently reviewable. Acceptance is
always "the cited ACs hold" — this plan adds no acceptance bar of its own.

---

## Phase order and the dependency spine

```
Phase 1 — Reference docs (FR-D)      the ruleset everything else restates
        │  (docs/workflow/v2/)        must exist first
        ▼
Phase 2 — Skills (FR-S)               skills restate the V2 rules inline
        │  (skills/**/SKILL.md)        (self-containment) → docs first
        ▼
Phase 3 — Repo upkeep (FR-R)          indexes/registers/points at the
           (README, marketplace,       skills + docs that now exist
            scopes, AGENTS.md)
```

Why this order:

1. **Docs first.** The V2 reference set is the canonical ruleset. Skills do **not**
   link to it at runtime (self-containment, AC-S0.3) — they *restate* the rules
   inline — so the docs must be pinned first to keep every skill's restatement
   consistent. This is an authoring dependency, not a runtime one.
2. **Skills next.** Each changed/new skill body encodes V2 behavior (paths, the
   status-map contract, tiers, the ledger) that the Phase-1 docs define.
3. **Repo upkeep last.** README entries, the marketplace registry, and the commit
   scopes can only point at skill folders that exist (and at `capture-inbox` after
   it has moved); the AGENTS.md V2 pointer can only point at `docs/workflow/v2/`
   after Phase 1. (FR-R4 in fact depends only on Phase 1 — see its task — but it is
   grouped here with the rest of the upkeep per the spec's FR-R framing.)

**Commit batching (spec §5 DoF item 12 — a recommendation, not part of the
contract).** A reasonable default: one commit per task (or per skill-family task) so
each is independently reviewable and revertable; the Phase-3 upkeep edits may land
as one commit. Per `AGENTS.md`, a task scoped to a single skill uses that skill's
folder as the Conventional-Commits scope; multi-skill, doc, and repo-wide tasks omit
the scope (`feat:` / `docs:` / `chore:`). Do not commit anything until the owner
asks. No task in this plan sets an approval/status latch — latches are owner/finish
actions, out of this build's scope.

---

## Phase 1 — Reference docs (FR-D, deliverable A)

**Cross-cutting on the whole set — FR-D0 (AC-D0.1, AC-D0.2, AC-D0.3).** Every doc
task below inherits three set-level rules: the set is the nine files of FR-D1…FR-D9
(or a documented merge/split that still houses every rule and resolves every
cross-reference — spec §5 DoF item 2), and **no `docs/workflow/v1/*` file is
edited** (AC-D0.1); each doc carries a provenance line naming the proposal
section(s) it realizes — analogous to the V1 docs' `**Codifies:** D…` line, format
free (AC-D0.2); no doc carries lifecycle/status YAML frontmatter (AC-D0.3). These
are the **Phase-1 exit gate**: confirm AC-D0.1–0.3 once all nine docs exist.

**Execution order within the phase.** The eight rule docs are each independently
authorable from the spec and may be written in parallel; the only hard intra-phase
ordering is that the **README (Task 1.9) comes last** because it links the other
eight (AC-D1.2). Recommended order otherwise is foundational-first
(`thread-layout` + `lifecycle` before the docs that cross-reference them), and
`filename-grammar` after `lifecycle` because it points at the lifecycle doc for the
ledger line grammar (AC-D3.4).

### Task 1.1 — `thread-layout.md`
- **Objective:** Author the V2 thread folder set, lineage folders, ledger location,
  records-attach-to-target rule, the inbox removal, lineages-vs-variants, the
  path-reference rule, on-demand creation, and flat `implementation/`.
- **Implements:** FR-D2.
- **Files:** create `docs/workflow/v2/thread-layout.md`.
- **Acceptance:** AC-D2.1–AC-D2.10; plus set rules AC-D0.2, AC-D0.3.
- **Depends on:** Phase 0 (none) — foundational.

### Task 1.2 — `lifecycle.md`
- **Objective:** Author the artifact-lifecycle/immutability rules: the two artifact
  classes plus the ledger, record immutability + marked owner correction, the
  stored-latch/derived-condition split and the authoritative derivation function,
  sticky latches, the `version` review-cycle counter, the proposal/spec freeze
  asymmetry, body-vs-frontmatter, the frontmatter status contract + the D44
  carve-out and pinned field defaults (all latches under the `status:` map), event
  sourcing, the two-layer freeze + guard rules, and the thread lifecycle ledger
  (pinned `ledger.md` filename + pinned line grammar + disposition vocabulary +
  re-`deferred`).
- **Implements:** FR-D4 (core + event-sourcing/freeze + ledger).
- **Files:** create `docs/workflow/v2/lifecycle.md`.
- **Acceptance:** AC-D4.1–AC-D4.21; plus AC-D0.2, AC-D0.3.
- **Depends on:** Phase 0 (none) — foundational. (Authors the status-map model that
  Tasks 1.3, 1.5, 1.6, 1.8 and most of Phase 2 reference.)

### Task 1.3 — `filename-grammar.md`
- **Objective:** Author the two filename forms (versioned `<type>.md` with no
  stamp/no `v<N>`; the unchanged record form), the UTC stamp grammar, the ledger
  fixed-name pointer, the V2 token vocabulary (keep/add/remove), and the shrunk
  ambiguous-reference rule.
- **Implements:** FR-D3.
- **Files:** create `docs/workflow/v2/filename-grammar.md`.
- **Acceptance:** AC-D3.1–AC-D3.6; plus AC-D0.2, AC-D0.3.
- **Depends on:** Task 1.2 — AC-D3.4 points to `lifecycle.md` for the ledger line
  grammar, so that doc's name/contents must be settled for the cross-reference to
  resolve.

### Task 1.4 — `tiers.md`
- **Objective:** Author the four tiers (entry criteria + required artifacts),
  normative numbers / suggested names, the three safety rules, tier-0-leaves-no-trace,
  the per-tier Definition of Done, tier-scaled PR discipline, and the
  prerequisite-preflight practice.
- **Implements:** FR-D5.
- **Files:** create `docs/workflow/v2/tiers.md`.
- **Acceptance:** AC-D5.1–AC-D5.7; plus AC-D0.2, AC-D0.3.
- **Depends on:** Task 1.2 (references the ledger for the recorded tier).

### Task 1.5 — `tracker-integration.md`
- **Objective:** Author the three-layer status model, single-owner-of-work-item-status
  rule, the seed `External:` join point + single finish handshake, the ticket-backlink
  convention, and the commit/PR reference convention.
- **Implements:** FR-D6.
- **Files:** create `docs/workflow/v2/tracker-integration.md`.
- **Acceptance:** AC-D6.1–AC-D6.5; plus AC-D0.2, AC-D0.3.
- **Depends on:** Task 1.2 (ledger as the thread-lifecycle layer), Task 1.1 (seed
  location). May be authored alongside 1.4/1.6.

### Task 1.6 — `spine.md`
- **Objective:** Author the spine stages (all optional/tier-gated), the seed format
  + supersession forward-link, the proposal/spec stages and the spec's two new
  obligations + the lossless authoring constraint, plan-autonomy-as-default + the
  plan-as-compiler-IR, the four-outcome adherence review, and the implement / verify
  / finish stages (incl. finish setting `status.implemented`, appending `closed:
  done`, closing the ticket, ensuring the backlink).
- **Implements:** FR-D7.
- **Files:** create `docs/workflow/v2/spine.md`.
- **Acceptance:** AC-D7.1–AC-D7.12; plus AC-D0.2, AC-D0.3.
- **Depends on:** Tasks 1.1, 1.2, 1.5 (references thread layout, the latches/ledger,
  and the tracker handshake).

### Task 1.7 — `discussions.md`
- **Objective:** Author the discussion conventions: two modes, recommendation-first
  legitimacy, lettered options, target-scoped P-numbering + off-target rule,
  context-rich headers, the optional pause, peer framing, write-only-if-useful, and
  that a discussion no longer owns review disposition (it is the optional linked
  `rationale`).
- **Implements:** FR-D8.
- **Files:** create `docs/workflow/v2/discussions.md`.
- **Acceptance:** AC-D8.1–AC-D8.9; plus AC-D0.2, AC-D0.3.
- **Depends on:** Task 1.2 (the disposition-via-frontmatter point it defers to).

### Task 1.8 — `reviews.md`
- **Objective:** Author review placement, disposition-via-frontmatter-`status:`-map,
  the references-first report format, the lossless-mapping review definition + its
  cadence, the consistency-with-decision-logs check, and the tier-3 adversarial
  reviews.
- **Implements:** FR-D9.
- **Files:** create `docs/workflow/v2/reviews.md`.
- **Acceptance:** AC-D9.1–AC-D9.7; plus AC-D0.2, AC-D0.3.
- **Depends on:** Task 1.2 (the `status:` map model for disposition), Task 1.7
  (discussion-as-rationale).

### Task 1.9 — `README.md` (index + entry points + versioning) — LAST
- **Objective:** Author the set's entry doc: source-of-truth statement, a reading
  order linking the other eight docs, the "V2 is a new ruleset, does not edit V1 /
  pre-V2 threads grandfathered" statement, the docs-are-immutable-by-convention
  statement, and the self-containment relationship (skills restate inline; these
  docs are the authoring source of truth).
- **Implements:** FR-D1.
- **Files:** create `docs/workflow/v2/README.md`.
- **Acceptance:** AC-D1.1–AC-D1.5; plus AC-D0.2, AC-D0.3.
- **Depends on:** Tasks 1.1–1.8 (it links each of them; reading order must resolve).

> **Phase-1 exit gate:** AC-D0.1 holds (exactly the nine docs exist — or a documented
> merge/split with full coverage — and `git` shows no diff to any
> `docs/workflow/v1/*` file); every doc satisfies AC-D0.2 and AC-D0.3.

---

## Phase 2 — Skills (FR-S, deliverable B)

**Binding cross-cutting contract — FR-S0 (AC-S0.1–AC-S0.5).** This is the umbrella;
the per-skill tasks below are its concrete instantiations (spec wording). Every
Phase-2 task MUST satisfy, for each skill it touches:

- **AC-S0.1** — adopt V2 thread-layout paths (FR-D2); a skill that opens a thread
  reads the ledger (tier + disposition) and proposes the tier; a status-bearing
  skill obeys the frontmatter status contract (FR-D4).
- **AC-S0.2** — bump `metadata.version` by honest per-skill semver (MAJOR where the
  output/behavior contract breaks, MINOR additive, no bump if the body is unchanged;
  new skills start `1.0.0`); baselines are in spec §3.
- **AC-S0.3** — restate the relied-on V2 rules inline; do not link outside the
  skill's own directory.
- **AC-S0.4** — new skills default to auto-only (no `-auto`/`-interactive` pair);
  existing pairs are retained.
- **AC-S0.5** — a skill requiring a binary/sibling skill applies the
  prerequisite-preflight rule (FR-D5.7).

FR-S0 is therefore **covered transversally** by every task in this phase; it is
verified collectively at the Phase-2 exit gate (confirm AC-S0.1–0.5 across all
touched skills). It produces no standalone file.

**Execution order within the phase.** All Phase-2 tasks depend on Phase 1 being
complete (skills restate the docs' rules). They are otherwise mutually independent —
each edits or creates its own skill folder — and may proceed in parallel. Two
runtime *compositions* worth noting (neither is a build-time dependency): `finish`
(2.13) and `open-thread` (2.15) share the ticket-backlink rule (FR-D6.4), and
`open-ticket` (2.16) / `open-thread` (2.15) compose ticket-first at runtime.

### Task 2.1 — `discussion`, `seeded-discussion`
- **Objective:** Update both bodies to the V2 discussion conventions: output to the
  target's `discussions/` (genesis → `seed/discussions/`) with stamped record
  filenames; two modes, lettered options, target-scoped P-numbering + off-target
  rule, context-rich headers, optional pause, peer framing, write-only-if-useful;
  optional `rationale` cross-link but no longer owns disposition;
  records-immutable-by-default with marked owner corrections.
- **Implements:** FR-S1 (+ FR-S0).
- **Files:** edit `skills/workflow/capture-discussion/discussion/SKILL.md`,
  `skills/workflow/capture-discussion/seeded-discussion/SKILL.md`.
- **Acceptance:** AC-S1.1–AC-S1.5; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.7, 1.8, 1.2, 1.1, 1.3).

### Task 2.2 — `propose-auto`, `propose-interactive`
- **Objective:** Lineage-folder output `proposals/NNN[-<desc>]/proposal.md`; the
  `status.approved`/`status.rejected` latch contract (under `status:`, set-once,
  stamped, condition derived); tier awareness (proposal stage is tier-3).
- **Implements:** FR-S2 (+ FR-S0).
- **Files:** edit `skills/workflow/propose/propose-auto/SKILL.md`,
  `skills/workflow/propose/propose-interactive/SKILL.md`.
- **Acceptance:** AC-S2.1–AC-S2.4; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.1, 1.2, 1.3, 1.4).

### Task 2.3 — `spec-auto`, `spec-interactive`
- **Objective:** Lineage-folder output `specs/NNN[-<desc>]/spec.md`; the
  `status.approved` then `status.implemented` latch contract; required "Degrees of
  freedom" section; machine-checkable AC obligation at tier ≥2; the lossless
  authoring constraint with the discuss-or-mark-DoF escape.
- **Implements:** FR-S3 (+ FR-S0).
- **Files:** edit `skills/workflow/spec/spec-auto/SKILL.md`,
  `skills/workflow/spec/spec-interactive/SKILL.md`.
- **Acceptance:** AC-S3.1–AC-S3.6; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.6, 1.2, 1.1, 1.3, 1.4).

### Task 2.4 — plan family: `plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, `plan-strict-interactive`
- **Objective:** All four → lineage-folder output `plans/NNN[-<desc>]/plan.md`;
  alive-in-place editing (no version files); plan carries no stored status and no
  `version` header; retain the self-review step; adopt thread-V2 paths + tier
  awareness.
- **Implements:** FR-S4 (+ FR-S0).
- **Files:** edit the four `SKILL.md` under `skills/workflow/plan/plan-loose-auto/`,
  `…/plan-loose-interactive/`, `…/plan-strict-auto/`, `…/plan-strict-interactive/`.
- **Acceptance:** AC-S4.1–AC-S4.4; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.6, 1.2, 1.1, 1.3).

### Task 2.5 — `adjust-plan-granularity-auto`, `adjust-plan-granularity-interactive`
- **Objective:** Single V2 change is output-mechanics — edit the living plan in
  place, record-backed, instead of emitting a new version file; thread-V2 paths.
- **Implements:** FR-S5 (+ FR-S0).
- **Files:** edit `skills/workflow/plan/adjust-plan-granularity-auto/SKILL.md`,
  `skills/workflow/plan/adjust-plan-granularity-interactive/SKILL.md`.
- **Acceptance:** AC-S5.1–AC-S5.2; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.1, 1.2, 1.3).

### Task 2.6 — `review-proposal-auto`, `review-proposal-interactive`
- **Objective:** Output to the proposal's `reviews/`; references-first report
  format; consistency-with-decision-logs check; set/read disposition via frontmatter.
- **Implements:** FR-S6 (+ FR-S0).
- **Files:** edit `skills/workflow/review/review-proposal-auto/SKILL.md`,
  `skills/workflow/review/review-proposal-interactive/SKILL.md`.
- **Acceptance:** AC-S6.1–AC-S6.5; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.8, 1.2, 1.1, 1.3).

### Task 2.7 — `review-spec-auto`, `review-spec-interactive`
- **Objective:** Output to the spec's `reviews/`; references-first format with
  thread-relative within-thread paths; add the consistency-with-decision-logs check;
  remove open/processed lifecycle language; disposition via frontmatter.
- **Implements:** FR-S7 (+ FR-S0).
- **Files:** edit `skills/workflow/review/review-spec-auto/SKILL.md`,
  `skills/workflow/review/review-spec-interactive/SKILL.md`.
- **Acceptance:** AC-S7.1–AC-S7.5; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.8, 1.2, 1.1, 1.3).

### Task 2.8 — `review-plan-auto`, `review-plan-interactive`
- **Objective:** The four-outcome, mode-agnostic adherence review (plan-vs-spec
  however authored); honor the spec's Degrees-of-freedom section; outcomes 3 & 4
  (spec-fault) route to the human and fix the spec, never patch the plan;
  disposition via frontmatter.
- **Implements:** FR-S8 (+ FR-S0).
- **Files:** edit `skills/workflow/review/review-plan-auto/SKILL.md`,
  `skills/workflow/review/review-plan-interactive/SKILL.md`.
- **Acceptance:** AC-S8.1–AC-S8.4; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.8, 1.6, 1.2).

### Task 2.9 — `review-implementation-auto`, `review-implementation-interactive`, `review-code-auto`, `review-code-interactive`
- **Objective:** All four verify against the spec's acceptance criteria; output to
  `implementation/reviews/` with thread-V2 paths; disposition via frontmatter.
- **Implements:** FR-S9 (+ FR-S0).
- **Files:** edit the four `SKILL.md` under
  `skills/workflow/review/review-implementation-auto/`,
  `…/review-implementation-interactive/`, `…/review-code-auto/`,
  `…/review-code-interactive/`.
- **Acceptance:** AC-S9.1–AC-S9.4; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.8, 1.6, 1.1, 1.2).

### Task 2.10 — NEW `review-lossless-mapping` (single auto-mode skill)
- **Objective:** Create the lossless-mapping review skill: implement the
  decisions/assumptions bar + the DoF pressure valve + the two-section output
  (empty = pass) per FR-D9.4; state the cadence (tier ≥2 recommendation, run before
  the spec is `approved`; on demand otherwise) and record disposition via the
  review's frontmatter `status:` map; references-first format + thread-relative
  paths. Single auto-mode skill, no `-interactive` variant (AC-S0.4); single-mode
  skills take no suffix.
- **Implements:** FR-S10 (+ FR-S0, esp. AC-S0.4).
- **Files:** create
  `skills/workflow/review/review-lossless-mapping/SKILL.md` (`name:
  review-lossless-mapping`, `metadata.version: 1.0.0`).
- **Acceptance:** AC-S10.1–AC-S10.4; AC-S0.3, AC-S0.4.
- **Depends on:** Phase 1 (esp. Task 1.8; also 1.6, 1.4 for cadence/DoF).

### Task 2.11 — implement family: `implement-auto`, `implement-interactive`, `implement-plan-auto`, `implement-plan-interactive`, `implement-plan-with-subagents-auto`, `implement-plan-with-subagents-interactive`
- **Objective:** All six emit an implementation-report record
  (`implementation/<UTC>-<desc>-implementation-report.md`) capturing
  deviations+justification, surprises, problems, follow-ups; instruct follow-up
  routing (seeds of future threads, or — tier-3 phased — the next phase's
  discussion); adopt thread-V2 paths + tier awareness.
- **Implements:** FR-S11 (+ FR-S0).
- **Files:** edit the six `SKILL.md` under `skills/workflow/implement/` (the four
  `implement-…` and the two `implement-plan-with-subagents-…`).
- **Acceptance:** AC-S11.1–AC-S11.4; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.6, 1.1, 1.2, 1.3).

### Task 2.12 — `merge-artifacts-auto`, `merge-artifacts-interactive`
- **Objective:** No version-file bump (none exist); merge authors/revises the
  canonical `NNN/<artifact>.md` from candidates — or a record-backed in-place
  revision if alive, or a new thread if frozen; rationale in a decision log;
  competing drafts in `.wip/` (only the canonical artifact emitted).
- **Implements:** FR-S12 (+ FR-S0).
- **Files:** edit `skills/workflow/merge/merge-artifacts-auto/SKILL.md`,
  `skills/workflow/merge/merge-artifacts-interactive/SKILL.md`.
- **Acceptance:** AC-S12.1–AC-S12.3; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.1, 1.2, 1.3).

### Task 2.13 — `finish` (substantive new behavior)
- **Objective:** Set the spec's `status.implemented` latch (under `status:`); append
  `closed: done` to the ledger (`ledger.md`, pinned line grammar) in the same finish
  action; update the living docs; close the ticket (the single terminal handshake);
  ensure the linked ticket carries the one permalink backlink comment (posting it at
  finish if `open-thread` did not), per FR-D6.4.
- **Implements:** FR-S13 (+ FR-S0).
- **Files:** edit `skills/workflow/finish-navigate/finish/SKILL.md`.
- **Acceptance:** AC-S13.1–AC-S13.6; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.6, 1.2, 1.5).

### Task 2.14 — `whats-next` (derived-status reader)
- **Objective:** Read the ledger (tier + disposition) and fold spine position + open
  findings to answer "what now / what next / is it closed"; state it is the
  derived-status reader (a CLI precursor) and that the CLI/materialized projection is
  not built here.
- **Implements:** FR-S14 (+ FR-S0).
- **Files:** edit `skills/workflow/finish-navigate/whats-next/SKILL.md`.
- **Acceptance:** AC-S14.1–AC-S14.3; AC-S0.1–S0.3.
- **Depends on:** Phase 1 (esp. Tasks 1.2, 1.4, 1.1).

### Task 2.15 — NEW `open-thread` + deprecate `capture-inbox`
- **Objective:** Create `open-thread` — opens a local thread (writes the thread
  folder, the one seed per FR-D7.2, and the `ledger.md` with an initial `tier:`
  line); two input modes within the one skill (brand-new idea OR existing ticket);
  posts the one permalink backlink comment when it links a ticket (FR-D6.4). Move
  `capture-inbox` to `skills/deprecated/capture-inbox/` (kept on disk so installs do
  not break); no V2 spine path references the inbox. Single auto-style skill, no
  `-interactive` variant (AC-S0.4).
- **Implements:** FR-S15 (+ FR-S0, esp. AC-S0.4).
- **Files:** create
  `skills/workflow/capture-discussion/open-thread/SKILL.md` (`name: open-thread`,
  `metadata.version: 1.0.0`); `git mv`
  `skills/workflow/capture-discussion/capture-inbox/` →
  `skills/deprecated/capture-inbox/`.
- **Acceptance:** AC-S15.1–AC-S15.5; AC-S0.3, AC-S0.4.
- **Depends on:** Phase 1 (esp. Tasks 1.1, 1.6, 1.5, 1.2, 1.3).

### Task 2.16 — NEW `open-ticket` (remote tracker ticket)
- **Objective:** Create `open-ticket` — creates a remote tracker ticket from a
  brand-new idea (a one-time creation, never the ongoing sync §8 forbids; the only
  tracker-writing skill); apply the prerequisite-preflight rule (check the tracker
  CLI/API is available first; fail cleanly with a clear warning if missing). Single
  auto-style skill, no `-interactive` variant (AC-S0.4).
- **Implements:** FR-S16 (+ FR-S0, esp. AC-S0.4, AC-S0.5).
- **Files:** create
  `skills/workflow/capture-discussion/open-ticket/SKILL.md` (`name: open-ticket`,
  `metadata.version: 1.0.0`).
- **Acceptance:** AC-S16.1–AC-S16.3; AC-S0.3, AC-S0.4, AC-S0.5.
- **Depends on:** Phase 1 (esp. Tasks 1.5, 1.4 preflight; 1.1).

### Task 2.17 — "all"-row skills: `take-snapshot`, `brief-the-recipient`, `consult-the-expert`, `report-to-the-owner`, `afk-exploration`, `the-librarian`, `meta-prompting`
- **Objective:** For each skill whose body references V1 thread paths, the inbox, or
  stored status, update to V2 thread-layout paths + the frontmatter status contract
  and add tier awareness where it opens a thread; leave a genuinely thread-agnostic
  skill unchanged and unbumped, bump one that changes (per-skill applicability is a
  bounded DoF — spec §5 item 10).
- **Implements:** FR-S17 (+ FR-S0).
- **Files:** edit, as needed, `skills/workflow/documentation/take-snapshot/SKILL.md`,
  `skills/workflow/handoff/brief-the-recipient/SKILL.md`,
  `skills/workflow/handoff/consult-the-expert/SKILL.md`,
  `skills/workflow/handoff/report-to-the-owner/SKILL.md`,
  `skills/workflow/research/afk-exploration/SKILL.md`,
  `skills/workflow/research/the-librarian/SKILL.md`,
  `skills/workflow/support/meta-prompting/SKILL.md`.
- **Acceptance:** AC-S17.1–AC-S17.2; AC-S0.1–S0.3 where a skill changes.
- **Depends on:** Phase 1 (esp. Tasks 1.1, 1.2, 1.3).

> **Phase-2 exit gate:** AC-S0.1–AC-S0.5 hold across every touched skill (V2 paths,
> honest version bumps vs spec §3 baselines, inline self-containment, new-skills
> auto-only, preflight where required); every per-skill FR's ACs hold; `capture-inbox`
> now lives under `skills/deprecated/` and no V2 spine path references the inbox.

---

## Phase 3 — Repo upkeep (FR-R, per AGENTS.md)

These point at the skills and docs created in Phases 1–2, so they come after.

### Task 3.1 — `README.md` index
- **Objective:** Add `open-thread` and `open-ticket` entries under "Capture &
  Discussion" (description + install snippet + full nested-path link); add a
  `review-lossless-mapping` entry under "Review"; move `capture-inbox` to the
  "Retired skills" section with its path updated to `skills/deprecated/capture-inbox`;
  update the README description of any skill whose `description` frontmatter changed.
- **Implements:** FR-R1.
- **Files:** edit `README.md`.
- **Acceptance:** AC-R1.1–AC-R1.4.
- **Depends on:** Tasks 2.10, 2.15, 2.16 (the skills must exist; `capture-inbox`
  must have moved); and any Phase-2 task that changed a skill's `description`.

### Task 3.2 — `.claude-plugin/marketplace.json`
- **Objective:** Add `./skills/workflow/capture-discussion/open-thread` and
  `./skills/workflow/capture-discussion/open-ticket` to the
  `JeisKappa-capture-discussion` plugin; add
  `./skills/workflow/review/review-lossless-mapping` to `JeisKappa-review`; move
  `./skills/workflow/capture-discussion/capture-inbox` from
  `JeisKappa-capture-discussion` to `JeisKappa-deprecated`; keep `plugins` sorted
  alphabetically with `JeisKappa-deprecated` last.
- **Implements:** FR-R2.
- **Files:** edit `.claude-plugin/marketplace.json`.
- **Acceptance:** AC-R2.1–AC-R2.4.
- **Depends on:** Tasks 2.10, 2.15 (the `capture-inbox` move), 2.16.

### Task 3.3 — `.vscode/settings.json` scopes
- **Objective:** Add `open-thread`, `open-ticket`, and `review-lossless-mapping` to
  `conventionalCommits.scopes`, preserving alphabetical order; leave `capture-inbox`
  in the array (the folder still exists, now under `deprecated/`).
- **Implements:** FR-R3.
- **Files:** edit `.vscode/settings.json`.
- **Acceptance:** AC-R3.1–AC-R3.2.
- **Depends on:** Tasks 2.10, 2.15, 2.16.

### Task 3.4 — `AGENTS.md` V2 pointer
- **Objective:** Add a "V2 Workflow Conventions" pointer section to
  `docs/workflow/v2/` (a pointer, not a duplication, mirroring the existing V1
  pointer) that marks V2 the active ruleset for new threads, with one line noting V1
  remains the grandfathered reference for pre-V2 threads (never migrated).
- **Implements:** FR-R4.
- **Files:** edit `AGENTS.md` (`CLAUDE.md` is a symlink and follows automatically).
- **Acceptance:** AC-R4.1.
- **Depends on:** Phase 1 only (the section points at `docs/workflow/v2/`, which must
  exist). Grouped here per the spec's FR-R framing; it has no dependency on Phase 2
  and may be done immediately after Phase 1 if convenient.

---

## FR coverage matrix (every FR has a task)

| FR | Group | Task |
|---|---|---|
| FR-D0 | docs (set-wide) | cross-cutting on all Phase-1 tasks; Phase-1 exit gate |
| FR-D1 | docs | 1.9 |
| FR-D2 | docs | 1.1 |
| FR-D3 | docs | 1.3 |
| FR-D4 | docs | 1.2 |
| FR-D5 | docs | 1.4 |
| FR-D6 | docs | 1.5 |
| FR-D7 | docs | 1.6 |
| FR-D8 | docs | 1.7 |
| FR-D9 | docs | 1.8 |
| FR-S0 | skills (umbrella) | cross-cutting on all Phase-2 tasks; Phase-2 exit gate |
| FR-S1 | skills | 2.1 |
| FR-S2 | skills | 2.2 |
| FR-S3 | skills | 2.3 |
| FR-S4 | skills | 2.4 |
| FR-S5 | skills | 2.5 |
| FR-S6 | skills | 2.6 |
| FR-S7 | skills | 2.7 |
| FR-S8 | skills | 2.8 |
| FR-S9 | skills | 2.9 |
| FR-S10 | skills | 2.10 |
| FR-S11 | skills | 2.11 |
| FR-S12 | skills | 2.12 |
| FR-S13 | skills | 2.13 |
| FR-S14 | skills | 2.14 |
| FR-S15 | skills | 2.15 |
| FR-S16 | skills | 2.16 |
| FR-S17 | skills | 2.17 |
| FR-R1 | upkeep | 3.1 |
| FR-R2 | upkeep | 3.2 |
| FR-R3 | upkeep | 3.3 |
| FR-R4 | upkeep | 3.4 |

Every FR-D, FR-S, and FR-R in the spec maps to a task. The two umbrella FRs (FR-D0,
FR-S0) are covered transversally by their phase's tasks and confirmed at that
phase's exit gate, exactly as the spec frames them.

## Spec gaps flagged

None. The spec is `version: 2` (one completed review→revise cycle), Approved, and
its ACs are mechanically checkable with each FR traced to the proposal + the two
decision logs. Sequencing and commit batching — the only thing the spec delegates to
this phase (spec §5 DoF item 12) — are supplied above. No ambiguity or gap blocked
planning, so nothing routes back to the spec.
