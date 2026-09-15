# Handoff: the two consultation sessions behind the Workflow V2 proposal

Record of the 2026-06-12 consultation sessions (held in the `appaltiav2`
workspace, an external repo) that produced this thread's proposal. Written for a
recipient with full project context but zero session context — most likely the
fresh session that will drive Workflow V2 from Draft to implemented. The
authoritative design is the proposal
(`../../proposals/agentic-workflow-v2-proposal/proposal.md`); this record carries
the orientation, history, and reasoning texture the proposal deliberately
compresses. Read the seed, then this, then the proposal.

## Bottom line

Workflow V1's conventions were stress-tested by their largest real-world use to
date and two rules failed in the same way: **file-level immutability** and
**status-by-folder** both encode mutable state where links can't survive it. The
maintainer had already been overriding both in practice (see "Evidence" below).
The V2 proposal in this thread replaces them with **lifecycle-based
immutability** and **derived status**, restructures threads so records nest
under the artifact they target, adds seeds/tiers/tracker-integration, and
commits to a "spec is the last human-approved artifact" model. Every position in
the proposal traces to one of three sources — nothing was invented:

1. **Consultation session 1** — a critique of the V1 thread layout (summarized
   below).
2. **Consultation session 2** — a broader workflow consultation (summarized
   below).
3. **The maintainer's TODO notes** — copied verbatim into this thread at
   `../260612175420Z-maintainer-workflow-todo-notes.md`.

## Context the recipient needs

- **Workflow V1** is codified at `docs/workflow/v1/` in this repo (thread
  layout, filename grammar, immutability). Those docs are immutable by their own
  convention — V2 lands as `docs/workflow/v2/`, not as edits.
- **`EXAMPLE-WORKFLOW/`** (repo root, untracked) is a folder of prompt snippets
  the maintainer used to patch V1's skills at invocation time — forcing in-place
  spec updates, redirecting discussion output paths, adding a
  consistency-vs-discussions check to spec reviews. It is Exhibit A that the
  conventions diverged from practice; it gets retired when V2's skill changes
  land (proposal §14).
- **The `appaltiav2` pilot** is a thread in an *external private repo* (an
  Italian procurement-data pipeline rewrite; thread
  `docs/threads/260611150721Z-v2-design/` there). The recipient will likely NOT
  have that repo available — everything needed from it is summarized in the
  proposal's §2 and in "Evidence" below. Its significance: one spec taken
  through three review/revision rounds (a stress-test discussion loop, an
  external handoff-grade review, an adversarial pre-mortem), with three
  append-only decision logs and two review reports, all under one thread. The
  practices that *worked* there are the practices V2 canonizes; it also already
  uses the V2 folder shape (hand-migrated as the first pilot).

## Evidence (session 1 — layout critique)

- V1's blanket immutability (D39–D41) was violated three times on the pilot —
  the spec was revised in place v2 → v2.1 → v2.2 — and each violation was
  *correct*: new version files would have broken every cross-reference and
  duplicated a ~1000-line document per round. The maintainer's own
  `EXAMPLE-WORKFLOW/04` literally instructs "update it in place."
- V1's `inbox/open/ → processed/` lifecycle (D107) was abandoned on the pilot
  because the folder move invalidates links; review reports were moved to a
  `reviews/` folder instead. Root cause identified: records being immutable
  pushed status into folder paths — the one place links can't survive mutation.
- The replacement principle (proven on the pilot, and — pleasing symmetry — the
  same principle the pilot project's own architecture uses for its data
  pipeline): **status is derived from downstream artifacts, never stored.** A
  review with no disposing discussion is open, by definition.
- Records always have a *target* (the maintainer's observation): three
  discussions and two reviews on the pilot all orbited one spec but lived in
  scattered sibling folders. Hence V2's nesting — records inside the lineage
  folder of the artifact they serve, capped at one level because targets form a
  graph, not a tree (a discussion can target a review which targets a spec; it
  files under the *spec*, the spine node it serves).
- Session 1 also produced the seed concept (every thread starts from a 3-line
  genesis artifact; "a discussion can't start from nothing" — maintainer's
  words) and flagged two drift bugs to prevent via skills: non-grammar log
  filenames (`2026-06-10-…`) and a spec emitted without a lineage folder.

## Conclusions (session 2 — workflow consultation)

- **Spec lifecycle** (the maintainer had independently reached this in the TODO,
  lines 44–49): `Draft → In Review → Approved → Implemented (→ Superseded)`;
  alive and edited in place while open (every edit backed by a record); frozen
  forever at Implemented. This targets the *actual* fear behind V1 immutability:
  agents editing old closed specs to match new reality.
- **Two-document model**: thread artifacts describe a point in time; living docs
  (`docs/`, `AGENTS.md`, behavior/architecture docs) describe the present. The
  reason agents want to edit old specs is that no current-truth document exists;
  give them one and the urge has a legitimate outlet. Keep the name "spec"
  (ecosystem-aligned); reject "spec-delta" (a post-implementation change is a
  new thread that supersedes).
- **Tiers 0–3** (chore/patch/feature/initiative) with entry criteria, declared
  and justified in the seed, escalation cheap and explicit, quality gates
  scaling with tier. This is the documented-exceptions answer: simple fixes
  skip ceremony *by rule*, not by guilt.
- **Tracker integration**: exactly one system owns work-item status (GitHub
  Issues solo; the company tracker — ClickUp at the maintainer's employer — when
  stakeholders need visibility); the seed's `External:` line is the entire
  bridge; never dual-track, never auto-sync.
- **Plan autonomy** (the maintainer's goal: "the last thing I read and approve
  is the spec"): plans derive 100% from specs (`plan-*-interactive` removed),
  reviewed by machine via a four-outcome adherence check where spec-fault
  outcomes route to the human and fix the *spec*. Two preconditions make this
  safe: machine-checkable acceptance criteria (the FR/AC + coverage +
  owner-approval model proven on the pilot) and a "Degrees of freedom" section
  in every spec (deliberate ambiguity, granted explicitly — TODO lines 88–91).
- **Adopted from industry**: implementation reports (replace the inbox's last
  job), the lossless-mapping review (the document must contain nothing the human
  never saw and miss nothing the human decided — the highest-value new skill),
  Definition of Done per tier, PR-per-thread even solo. **On trigger, not now**:
  global decision index, postmortems. **Rejected with reasons** (proposal §12):
  hand-written STATE.md, content-hash tamper detection (git + a CI guard on
  closed threads is enough), auto-sync, deep nesting.
- Every TODO item received an explicit verdict; the dispositions are woven
  through the proposal and indexed in its §17.

## What exists in this thread right now

- `seed/seed.md` — the genesis (tier 3).
- `seed/260612175420Z-maintainer-workflow-todo-notes.md` — the TODO, verbatim,
  with provenance header (the proposal's §17 line references resolve against
  the original numbering, preserved below that file's header).
- `proposals/agentic-workflow-v2-proposal/proposal.md` — **the artifact**,
  Status: Draft, 18 sections. The thread itself already follows the layout the
  proposal defines (dogfooding; trivially re-shaped if rejected).
- This handoff record.

Nothing is committed — this repo's rule is never commit unless asked; the
maintainer decides when.

## Pointers for the next session (leads, not orders)

- The natural sequence is the workflow applied to itself: review the proposal
  (handoff-grade bar; the maintainer may also want the lossless-mapping check
  against this record + the TODO, since that review is itself a V2 invention),
  run a discussion loop over the findings (decision log →
  `proposals/agentic-workflow-v2-proposal/discussions/`), revise the proposal in
  place per its own lifecycle rules, get it to **Approved** — then implement:
  author `docs/workflow/v2/` reference docs and update the skills per proposal
  §14, bumping each skill's `metadata.version`.
- Proposal §15 lists the degrees of freedom deliberately left open (seed format
  details, tier labels, outcome-3/4 merge, CI-guard mechanism, …) and §18 the
  open questions (who flips Approved → Implemented; tier-0 traces; seed owner
  field; lossless-review cadence). These are review/discussion material, not
  blockers.
- Worth weighing during implementation: the skills are public and
  self-contained (see `AGENTS.md`'s self-containment rules) — V2 rules must be
  restated plainly inside each skill body, not referenced by path to
  `docs/workflow/v2/`.
- The pilot continues independently: the appaltiav2 project runs its build
  phases under these conventions; friction found there is input for V2's review,
  not something this thread must wait for.
