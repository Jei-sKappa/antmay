---
version: 1
---

# Spec: Modular Agentic Workflow V2 — in-repo build contract

This spec is the buildable contract for the two in-repo deliverables of Workflow
V2 (proposal §16 items 2–3): **(A)** the `docs/workflow/v2/` reference-doc set and
**(B)** the skill changes implied by proposal §14, with the repo upkeep they
require. It derives entirely from the approved, frozen proposal
(`proposals/001/proposal.md`, version 2, `approved`) and this thread's decision
log (`proposals/001/discussions/260612201354Z-proposal-v1-review-findings-decision-log.md`,
P1–P21). It re-decides nothing: every requirement traces to a proposal section or
a decision-log entry (§Traceability); anything not so traceable is marked a Degree
of Freedom (§Degrees of freedom) or surfaced for the owner (§Flagged for owner
review).

It dogfoods V2: it lives in a lineage folder (`specs/001/`); its frontmatter
carries `version` only, so its derived condition is **Draft** (no `approved`
latch); within-thread references are thread-relative; cross-location references
(skills, `docs/workflow/`) are repo-relative; all timestamps use the
`YYMMDDHHMMSSZ` UTC grammar.

**Scope boundary.** "Build" here = author the nine reference docs and edit/author
the skills + three upkeep files listed below. It does **not** include: building
the freeze-guard tooling, the future status CLI, the PR-enforcement CI gate,
postmortem/decision-index templates, the skillrouter unification, or any
external-workspace action (`EXAMPLE-WORKFLOW/` retirement). Each exclusion is
named and justified in §Out of scope. The implementation phase that consumes this
spec is the phase **after** this spec is approved.

---

## 1. Functional requirements and acceptance criteria

Three FR groups: **FR-D** (the `docs/workflow/v2/` set), **FR-S** (skill changes),
**FR-R** (repo upkeep). Each FR states the required behavior; each AC is a single
mechanically verifiable check (a file exists, a doc states a rule, a skill body
instructs X, a `version` is greater than its baseline, a JSON/array contains an
entry). A reviewer can confirm every AC by reading/grepping one file.

Conventions used by the ACs:

- "**states R**" / "**instructs Z**" = the doc/skill body contains language that
  unambiguously establishes rule R / instructs behavior Z (confirmable by reading
  that file; no inference from other files needed).
- "**version bumped**" = `metadata.version` in the skill's frontmatter is strictly
  greater than the baseline recorded in §3 (the bump floor and semver-level policy
  are in §FR-S0 and §Degrees of freedom).
- Within-thread paths in emitted artifacts are thread-relative; cross-location
  paths are repo-relative; never absolute (FR-D2, FR-D10).

---

### FR-D — the `docs/workflow/v2/` reference-doc set (deliverable A)

**Pinned decomposition.** The set is **nine** Markdown docs under
`docs/workflow/v2/`. This count and split is the spec's normative default; the
implementer may merge or split docs **provided every rule below has a home and
every cross-reference resolves** (§Degrees of freedom). Mapping of doc → proposal
section it realizes is given per FR and consolidated in §Traceability.

V1 docs (`docs/workflow/v1/`) are **grandfathered**: never edited, never migrated,
never mixed (proposal §16 item 2; P21). The V2 set is a new ruleset, not edits to
V1. The V1 README already anticipates `docs/workflow/v2/`, so no V1 file changes.

> **AC-D0 (cross-cutting on the set):**
> - **AC-D0.1** `docs/workflow/v2/` contains exactly the nine files named in
>   FR-D1…FR-D9 (or the implementer's documented merge/split that still covers
>   every rule — see §DoF), and no V1 file under `docs/workflow/v1/` is modified
>   (git shows no diff to any `docs/workflow/v1/*` file).
> - **AC-D0.2** Each V2 doc carries a provenance line naming the proposal
>   section(s) it realizes — analogous to the V1 docs' `**Codifies:** D…` line
>   (e.g. `**Realizes:** §3, §4`). Exact format is a DoF; presence is required.
>   (Realizes: proposal §17 traceability discipline; V1 doc shape.)
> - **AC-D0.3** No V2 doc carries lifecycle/status YAML frontmatter — reference
>   docs are living docs, not thread artifacts, and are immutable-by-convention
>   like the V1 set. (Realizes: §5 two-document model; §16; V1 README "Versioning".)

---

#### FR-D1 — `README.md` (index + entry points + versioning)

The set's entry doc, mirroring the V1 README's job. (Realizes: §16 item 2.)

- **AC-D1.1** `docs/workflow/v2/README.md` exists and states that this directory
  is the single source of truth for the V2 workflow ruleset.
- **AC-D1.2** States a reading order linking each of the other eight docs.
- **AC-D1.3** States that V2 is a new ruleset that does **not** edit or replace V1
  in place; V1 lives on at `docs/workflow/v1/` and pre-V2 threads are grandfathered
  (never migrated). (Realizes: §16; P21.)
- **AC-D1.4** States that the V2 reference docs are themselves immutable by
  convention.
- **AC-D1.5** States the self-containment relationship: published skills **restate
  inline** the V2 rules they depend on (per the repo's skill self-containment
  convention) rather than linking to these docs at runtime; these docs are the
  authoring/maintenance source of truth. (Realizes: AGENTS.md self-containment;
  handoff record "V2 rules must be restated plainly inside each skill body". See
  §Flagged item F-10.)

#### FR-D2 — `thread-layout.md` (folder set, lineage folders, ledger location, paths)

The V2 successor to `v1/thread-layout.md`. (Realizes: §3; parts of §4, §5; P1, P4,
P12, P17, P21.)

- **AC-D2.1** States the thread root `docs/threads/<YYMMDDHHMMSSZ-slug>/` and the
  V2 folder set: a thread-root lifecycle ledger; `seed/` (with `discussions/`);
  `proposals/`, `specs/`, `plans/` (each holding lineage folders); `implementation/`
  (with `discussions/`, `reviews/`); `.wip/` (gitignored). (Realizes: §3 tree.)
- **AC-D2.2** States lineage folders are named `NNN[-<desc>]/` — mandatory
  zero-padded 3-digit sequence from `001`, optional kebab slug added only to
  distinguish lineages; the folder `NNN` is the stable identifier and the full path
  is the unit of reference (`proposal.md`/`spec.md`/`plan.md` are meaningless bare,
  by design); adding a slug to a later lineage never renames an earlier one; no
  type suffix, no mandatory descriptor, no `v<N>` folder names. (Realizes: §3; P1.)
- **AC-D2.3** States records attach to the spine node they serve (a review of the
  spec → the spec's `reviews/`; a discussion *of* that review → still the spec's
  `discussions/`); targets form a graph; nesting is capped at this one level by
  rule. (Realizes: §3; review F-… one-level cap.)
- **AC-D2.4** States the lifecycle ledger lives at the **thread root** (not in
  `seed/`). (Realizes: §4; P12.)
- **AC-D2.5** States `seed/` is the genesis bucket and may hold exactly three kinds
  of thing — the one seed, genesis source material (records under the record
  grammar, e.g. `notes`), and `discussions/` — and carries no `reviews/`.
  (Realizes: §6; P12.)
- **AC-D2.6** States `inbox/` and its `open/processed/dropped` subfolders are
  **removed** in V2 (no skill writes them). (Realizes: §3 "Removed from V1"; §5; P2.)
- **AC-D2.7** States the multiple-lineages-vs-variants distinction: different
  subjects to keep → sibling `NNN[-<desc>]/` folders; competing drafts of one
  subject (the bake-off) → `.wip/` only, with exactly one canonical artifact
  emitted and the rationale in a decision log. (Realizes: §3; P4.)
- **AC-D2.8** States the path-reference rule: within-thread references are
  thread-relative (`proposals/001/discussions/…`); cross-thread/external references
  are repo-relative (`docs/threads/<other>/…`, `docs/workflow/v1/…`); never
  absolute. (Realizes: §3 "Path references"; P17.)
- **AC-D2.9** States on-demand folder creation (no pre-created empty folders).
  (Realizes: §3 "Unchanged from V1".)
- **AC-D2.10** States `implementation/` is **flat** (records directly inside, no
  lineage folders), with the documented revisit condition "if implementations
  multiply per thread." (Realizes: §15 DoF — pinned to the proposal's stated default.)

#### FR-D3 — `filename-grammar.md` (two forms, token vocabulary, ambiguity)

The V2 successor to `v1/filename-grammar.md`. (Realizes: §3 filename grammar; §16
item 2; P11, P18.)

- **AC-D3.1** States the UTC stamp grammar `YYMMDDHHMMSSZ` (12 chars, trailing `Z`),
  used in every filename stamp and every frontmatter timestamp, and that every
  timestamp marks an *event*; there are no extended-format dates and no standalone
  creation-date fields. (Realizes: §3 "One timestamp standard"; P18.)
- **AC-D3.2** States the **versioned-artifact** form: proposal/spec/plan carry NO
  stamp and NO `v<N>` in the filename — the file is `<type>.md` inside its lineage
  folder; the version lives in frontmatter (`version`; plans carry none). The entire
  V1 `v<N>[-descriptor]` machinery is removed. (Realizes: §3; P11; P3.)
- **AC-D3.3** States the **record** form is unchanged from V1:
  `<YYMMDDHHMMSSZ>-<kebab-desc>-<artifact-type>.md`, UTC stamp + mandatory type
  token preserved. (Realizes: §3; P11.)
- **AC-D3.4** States the lifecycle ledger is a fixed-name append-only file at the
  thread root and points to `lifecycle.md` (FR-D4) for its name and line grammar.
  (Realizes: §3; §4.)
- **AC-D3.5** States the V2 token vocabulary: **keep** `proposal`, `spec`, `plan`
  (now the whole short filename `<token>.md`), `discussion`, `decision-log`;
  **add** `seed`, `review` (replacing `review-finding`), `implementation-report`,
  `notes`; **remove** `inbox-item` and `review-finding`; the list is
  documented-but-not-exhaustive and a new token is declared by the skill that owns
  it. (Realizes: §3 token vocabulary; §16 "replaces the V1 token list"; P11.)
- **AC-D3.6** States the shrunk ambiguous-reference rule (V1 D49 successor): V2
  structurally removes "which version/variant is current" (one alive `<type>.md`
  per lineage, version in frontmatter; variants live in `.wip/`); what still
  requires asking the user is multiple lineages of one type in a thread
  (`specs/001-api/` vs `specs/002-cli/`) and cross-thread references. (Realizes:
  §3 "Ambiguous-reference resolution shrinks"; P11.)

#### FR-D4 — `lifecycle.md` (artifact lifecycle, immutability, freeze, the ledger)

The V2 successor to `v1/immutability.md`, substantially expanded. It is the home of
§4 and the §5 status principle, **including the thread lifecycle ledger spec**.
(Realizes: §4, §5; P2, P3, P5 (Decision A), P7, P8, P19, P20.)

Core lifecycle/immutability:

- **AC-D4.1** States the two artifact classes plus the ledger: **records**
  (discussions, decision logs, reviews, implementation reports, seeds, notes,
  postmortems), **versioned artifacts** (proposals, specs, plans), and the
  **lifecycle ledger**. (Realizes: §4.)
- **AC-D4.2** States record immutability: a record's *body* is frozen at emission;
  a follow-up is a new record; append-only logs may be appended to but never
  rewritten. Records are immutable by default — no agent edits one on its own — but
  the owner may authorize an in-place correction, which MUST be visibly marked
  (erratum/edit note), never silent. (Realizes: §4; P5 Decision A.)
- **AC-D4.3** States the stored-latch / derived-condition split and the per-type
  table: Proposal latches `approved | rejected`; Spec latches `approved` then
  `implemented`; Plan has **no** latches and **no** `version`. (Realizes: §4; P3.)
- **AC-D4.4** States the **authoritative condition-derivation function** verbatim
  in intent: `implemented` present → Implemented; else `approved` present →
  Approved (+ "has open findings" if an undisposed review exists); else an
  undisposed review exists → In Review; else → Draft. The condition is never
  stored. (Realizes: §4; P3.)
- **AC-D4.5** States latches are sticky (`approved` does not revert to In Review
  when a later review opens — that is the derived "Approved + has open findings").
  (Realizes: §4; P3.)
- **AC-D4.6** States `version` is a completed-review→revise-cycle counter (not an
  edit counter), record-backed by construction; editorial fixes never bump it.
  (Realizes: §4; P3.)
- **AC-D4.7** States the proposal-freezes-at-`approved` vs spec-freezes-at-
  `implemented` asymmetry and its reason (the spec stays alive `approved`→
  `implemented` for owner-approved, record-backed amendments routed back from
  downstream; the proposal has no such loop); and that `rejected` is an
  artifact-level latch independent of thread disposition. (Realizes: §4; P3.)
- **AC-D4.8** States the body-vs-frontmatter rule: a record's body obeys
  immutability while its frontmatter status is a live surface until terminal (a
  review until `disposed`), then frozen; versioned artifacts keep body+frontmatter
  alive together until their latch, then freeze; disposition is set-once.
  (Realizes: §4; P7.)
- **AC-D4.9** States the frontmatter status contract and the D44 carve-out:
  frontmatter stores **only** non-derivable lifecycle latches/events plus
  `version`; a record with no lifecycle status carries **no frontmatter at all**;
  everything else (references, targets, cross-links, agendas) lives in prose;
  anything derivable from the artifact's own location is never stored;
  lifecycle-status frontmatter is **allowed**, source-relation/lineage frontmatter
  (`Supersedes:`, `Forked from:`, …) stays **banned**. (Realizes: §3 frontmatter
  rule; §4; §5; P7, P19, P20.)
- **AC-D4.10** States the when-an-edit-needs-a-backing-record table: Draft/In
  Review (pre-`approved`) → no per-edit record (git + feeding discussions);
  Approved→not-yet-Implemented → record-backed + owner-approved amendment for
  substantive change (editorial = git, marked); Implemented → frozen. (Realizes:
  §4 "When an edit needs a backing record"; P8.)
- **AC-D4.11** States the pinned frontmatter field spelling defaults: `version: <int>`;
  proposal/spec `approved: <stamp>`, proposal `rejected: <stamp>`, spec
  `implemented: <stamp>`; review `disposed: <stamp>`, `disposition: accepted | rejected`,
  optional `rationale: <thread-relative path>`. Exact spelling is a DoF (the
  proposal tables show intent); the build pins these so skills agree. (Realizes:
  §4, §10 tables; §15 DoF — pinned; see §Flagged item F-8.)

Event sourcing + the freeze model:

- **AC-D4.12** States "status is derived, never stored — the workflow is
  event-sourced": truth is append-only events (frontmatter latches, ledger events,
  records), current state is a projection folded on demand; never store a derivable
  mutable current-state; `STATE.md`, a separate `events.jsonl`, and a materialized
  `state.json` are all rejected (with the §12 reasons), `state.json` merely
  deferred. (Realizes: §5; P7.)
- **AC-D4.13** States the two-layer freeze: (1) artifact latch — a spec at
  `implemented` or a proposal at `approved`/`rejected` is frozen even inside an
  open thread; (2) thread disposition — the ledger's last event seals the thread.
  (Realizes: §4 "The freeze model"; P2, P3.)
- **AC-D4.14** States the guard's enforcement rules: `closed:` → reject ALL diffs
  (frontmatter and ledger included); `deferred` → reject all diffs EXCEPT a
  ledger-only append of `resumed` or `deferred`; `resumed`/none → allow everything;
  the guard checks the **pre-image** (the diff that *adds* a freezing line is
  itself allowed); closed-by-mistake is a `git revert`; changing a deferred
  thread's tier requires a `resumed` first. (Realizes: §4; P2.)
- **AC-D4.15** States that the freeze is **prevention, not detection**, that the
  content-hash idea is rejected (git is tamper-evident), and that the guard's
  concrete mechanism (pre-commit hook / CI / both) is **not part of this build** —
  these docs specify the rules the guard must enforce; the tooling is deferred
  (§Out of scope; §Flagged item F-2). (Realizes: §4; §13; §15 DoF.)

The thread lifecycle ledger (pinned resolution of the §15 ledger DoF — see
§Flagged item F-1):

- **AC-D4.16** States the ledger holds ONLY the two non-derivable facts **tier**
  and **disposition**, and reproduces the litmus test verbatim in intent (derivable
  → derive it; PM/coordination fact → tracker; neither, and only then → ledger may
  hold it). (Realizes: §4, §5; P2.)
- **AC-D4.17** States the ledger is append-only with a strict line grammar; the
  current value of each key is its last line; only transitions are written, never
  the resting default. (Realizes: §4; P2.)
- **AC-D4.18** States the **pinned filename**: the ledger is `lifecycle.md` at the
  thread root (ratifying the file this thread already dogfoods). (Realizes: §15
  ledger-filename DoF — pinned; P21; see §Flagged item F-1.)
- **AC-D4.19** States the **pinned line grammar**: every event line is
  `<event> @ <YYMMDDHHMMSSZ> — <justification>`, where `<event>` is one of
  `tier: <0–3>`, `deferred`, `resumed`, `closed: done`, `closed: dropped`; tier
  lines update the `tier` key, the other four update the `disposition` key; a free
  Markdown header above the event lines is permitted (parsers read only
  grammar-matching lines); the `— <justification>` is mandatory on every line.
  (Realizes: §15 ledger-line-grammar DoF — pinned; §4, §7; P2; see §Flagged item F-1.)
- **AC-D4.20** States the disposition vocabulary and derivation: `(none)/resumed →
  active` (the resting default, never written), `deferred → paused` (reversible),
  `closed: done`/`closed: dropped → terminal` (sealed); no `open` event, no
  `implemented` disposition, no bare `closed`, no `reopened` (resurrection = a new
  thread). (Realizes: §4 disposition vocabulary; P2.)
- **AC-D4.21** States that a re-`deferred` (reason update) **is permitted** — the
  guard's deferred branch already admits a ledger-only `deferred` append (AC-D4.14).
  (Resolves the §15 "whether re-deferred is permitted" DoF, pinned to the §4 guard
  text — see §Flagged item F-3.)

#### FR-D5 — `tiers.md` (the tier system + Definition of Done + PR discipline)

(Realizes: §7, §13; P10, P15.)

- **AC-D5.1** States the four tiers with entry criteria and required artifacts:
  0 chore (no behavior change, reversible in one commit; none — the commit is the
  record), 1 patch (small/low-blast-radius/no open design question; seed + ledger +
  implementation report; discussion only if a decision arises), 2 feature (any
  design decision — the default; seed → discussion(s) → spec reviewed+approved →
  plan → implement → impl report + code review), 3 initiative (multi-week/
  architectural/hard-to-reverse; tier 2 + proposal stage + adversarial reviews +
  phased roadmap). (Realizes: §7.)
- **AC-D5.2** States the tier numbers are normative and the names
  (chore/patch/feature/initiative) are suggestions. (Realizes: §15 DoF — names left
  open; numbers pinned.)
- **AC-D5.3** States the three safety rules: tier recorded in the ledger with a
  one-line justification; escalation and de-escalation both cheap, explicit,
  symmetric (a dated, justified appended tier line); quality gates scale with tier.
  (Realizes: §7.)
- **AC-D5.4** States tier 0 leaves no trace beyond the commit (Conventional-Commits
  `type(scope)` is the mineable record; a behavior-changing dependency bump is tier
  1, not tier 0). (Realizes: §7; P15 (F-17); §18 Q2.)
- **AC-D5.5** States the Definition of Done per tier: 0 = green CI; 1 = +
  implementation report; 2 = + approved spec, AC coverage, code review (and a
  lossless-mapping review as a recommendation before approval); 3 = + adversarial
  review pass. (Realizes: §13.)
- **AC-D5.6** States PR discipline scaled by tier as a strong recommendation (not a
  forced rule): none@0, recommended@1, strongly-recommended@≥2; CI enforcement is a
  deferred option that would read the ledger tier. (Realizes: §13; P10.)

#### FR-D6 — `tracker-integration.md` (the three-layer status model)

(Realizes: §8; P2 Decision 3.)

- **AC-D6.1** States the three layers — work-item/PM status (owned by the external
  tracker; exists only if a ticket exists), thread lifecycle (owned by the repo's
  ledger; always at tier ≥1), spine position (derived from the folder; always) —
  and that they are distinct by granularity, cardinality, and existence, not the
  same fact stored twice. (Realizes: §8.)
- **AC-D6.2** States exactly one system owns work-item status and it is never the
  filesystem; GitHub Issues for solo/OSS, the company tracker where stakeholders
  need visibility; never mirror into a second tracker. (Realizes: §8.)
- **AC-D6.3** States the seed's `External:` line is the join point; the two layers
  link at the seed and shake hands exactly once, at finish (spec → `implemented`,
  ticket closed, ledger `closed: done`); they never continuously mirror;
  `External: none` is allowed for tier 0–1 personal work, tier ≥2 team work should
  have a ticket. (Realizes: §8.)

#### FR-D7 — `spine.md` (the stages, the seed format, the spec obligations)

(Realizes: §9, §6; P6, P14, P16.)

- **AC-D7.1** States the spine `seed → discussion(s) → [proposal] → spec → plan →
  implement → verify → finish` and that every spine stage is optional/tier-gated.
  (Realizes: §9.)
- **AC-D7.2** States the **seed** stage: mandatory at tier ≥1; format = a title,
  an `External:` line (tracker URL | "none" + why), and 1–5 lines of trigger
  narrative; frozen narrative record; no owner field; the rest of the format is
  free. (Realizes: §6; §15 DoF — seed format beyond the two mandatory lines left
  open; §18 Q3.)
- **AC-D7.3** States supersession is an optional, plain-language forward link in a
  successor thread's seed (no fixed format/location; an optional soft-keyword
  breadcrumb is offered, not mandated). (Realizes: §5; P2 Decision 6.)
- **AC-D7.4** States the **proposal** stage is optional and tier-3 (the
  "should we, and in which direction?" stage). (Realizes: §9.)
- **AC-D7.5** States the **spec** stage is the last artifact the human reads and
  approves, keeps the name "spec", and carries two new obligations: (1)
  machine-checkable acceptance criteria for tier ≥2 (FR/AC + coverage +
  traceability), (2) a "Degrees of freedom" section. (Realizes: §9.)
- **AC-D7.6** States the spec **lossless authoring constraint**: the spec commits
  to no decision or assumption the user did not see and accept in discussions
  unless the spec explicitly marks it a Degree of Freedom; the unit is a
  decision/assumption, never a sentence (a spec freely elaborates discussed
  decisions into prose, structure, and derived ACs). (Realizes: §9; §10; P9.)
- **AC-D7.7** States **plan autonomy is the recommended default, not a law**: when
  the spec carries machine-checkable ACs and a DoF section, `plan-*-auto` can
  produce the plan and a machine adherence review can clear it without the human
  reading it; human-in-the-loop planning stays supported. (Realizes: §9; P6.)
- **AC-D7.8** States the plan is a disposable compiler-IR (the spec + its ACs are
  the contract), which is why the plan carries no stored status. (Realizes: §9; §4;
  P3, P6.)
- **AC-D7.9** States the four-outcome, mode-agnostic plan adherence review: (1)
  adheres → implement; (2) deviates from spec → auto-fix, loop until adherent; (3)
  deviates because the spec is ambiguous/incomplete; (4) ambiguous because the spec
  is ambiguous — outcomes 3 & 4 route to the human and **fix the spec**, never
  patch the plan (whether 3 & 4 merge is a DoF). (Realizes: §9; §15 DoF; P6.)
- **AC-D7.10** States the **implement** stage emits an implementation report
  (record, immutable) capturing deviations-with-justification, surprises, problems,
  follow-ups; follow-ups route to seeds of future threads or, in tier-3 phased
  work, to the next phase's discussion (the roadmap is a living list, not a frozen
  contract). (Realizes: §9; §13.)
- **AC-D7.11** States the **verify** stage checks the implementation against the
  spec's acceptance criteria, not against the plan; the human may review the
  implementation but never needs to review the plan. (Realizes: §9.)
- **AC-D7.12** States the **finish** stage: living docs updated; the human's
  approval already set the spec's `approved` latch; the finish action sets the
  spec's `implemented` latch and appends `closed: done` to the ledger in one
  action; the ticket is closed; the freeze guard is active from that commit and
  never *sets* status. (Realizes: §9; §18 Q1; P16.)

#### FR-D8 — `discussions.md` (the discussion conventions)

(Realizes: §11; P7.)

- **AC-D8.1** States two modes — creative (present multiple options) and practical
  (present a single well-argued Proposed solution) — picked per discussion,
  defaulting by context. (Realizes: §11.)
- **AC-D8.2** States recommendation-first is legitimate (the loop does not force an
  options list when one well-explained recommendation serves better). (Realizes:
  §11.)
- **AC-D8.3** States options are lettered (A/B/C) for terse reference. (Realizes:
  §11.)
- **AC-D8.4** States P-numbering is scoped to the discussion's target; off-target
  points are left unlogged by rule or logged under a distinct prefix. (Realizes:
  §11.)
- **AC-D8.5** States log headers carry full context (target artifact path, thread,
  what is being discussed) — never a vague title. (Realizes: §11.)
- **AC-D8.6** States the optional pause after "What you need to know" (the user may
  answer directly, add context, or skip before options/recommendation). (Realizes:
  §11.)
- **AC-D8.7** States the peer-framing contract (neither side defers to or blindly
  accepts the other; both seek the best decision together). (Realizes: §11.)
- **AC-D8.8** States a discussion log is written only when it carries information
  useful to a future reader about its target (no ceremony logs). (Realizes: §11.)
- **AC-D8.9** States a discussion no longer owns review disposition; a
  practical-mode discussion, when written, is the optional linked `rationale`, not
  the authoritative status. (Realizes: §10, §11; P7.)

#### FR-D9 — `reviews.md` (review placement, disposition, formats, the new review)

(Realizes: §10, §13; P7, P9.)

- **AC-D9.1** States review placement: in the target's `reviews/` folder; there is
  no open/processed lifecycle. (Realizes: §10; §3.)
- **AC-D9.2** States disposition is recorded in the review's own YAML frontmatter
  (`disposed`, `disposition: accepted | rejected`, optional `rationale`), set once;
  a review with no `disposed` field is open by parse; accept-and-revise sets the
  frontmatter directly (the revision is the record) and reject sets it with no
  document at all — no separate disposing record required. (Realizes: §10; P7.)
- **AC-D9.3** States the report format: a **References-first** section
  (`- <description>: <path>`, within-thread thread-relative, cross-thread
  repo-relative, never absolute, never a bare path list) naming the artifact under
  review before any verdict; then Verdict → Findings → Evidence → Open Questions →
  Next Actions. (Realizes: §10.)
- **AC-D9.4** Defines the **lossless-mapping review**: given a set of discussions
  and the document produced from them, verify the mapping is lossless and
  additive-free; the unit is a decision or an assumption, never a sentence
  (restatement, organization, derived ACs, formatting never flagged); a flaggable
  item is content that commits to a choice among alternatives, or presupposes
  something not established, that the user neither saw-and-accepted in discussions
  nor the document marks a Degree of Freedom (the DoF section is the pressure
  valve); two output sections, empty = pass: (a) decisions/assumptions in the
  document the user never accepted (and not DoF); (b) decisions the user made the
  document failed to capture. (Realizes: §10; P9.)
- **AC-D9.5** States the lossless-mapping review's cadence: a strong recommendation
  at tier ≥2, run before the spec is `approved` (it earns the approval), part of
  the tier-2 Definition of Done as a recommendation — not mechanically forced; on
  demand otherwise. (Realizes: §9, §10, §13; §18 Q4.)
- **AC-D9.6** States the consistency-with-decision-logs check is part of the
  standard spec/proposal review. (Realizes: §10.)
- **AC-D9.7** States adversarial reviews (pre-mortem, red-team) are tier-3 stages
  run against approved specs. (Realizes: §10; §13.)

---

### FR-S — skill changes (deliverable B)

Baseline versions are in §3. Every FR-S below requires the named skill's body to
instruct the listed behavior **and** its `metadata.version` to be bumped above its
baseline. New skills start at `1.0.0`. New/changed skills must conform to the
repo's SKILL.md frontmatter + body conventions (AGENTS.md). Each changed skill
**restates inline** the V2 rules it depends on (self-containment, AGENTS.md), not
by linking to `docs/workflow/v2/`.

#### FR-S0 — cross-cutting "all" row + version-bump policy

(Realizes: §14 "all" row; AGENTS.md version-bump + self-containment conventions.)

- **AC-S0.1** Every skill that writes or reads thread paths adopts the V2
  thread-layout paths (FR-D2); every skill that opens a thread reads the ledger
  (tier + disposition) and proposes the tier when opening; every status-bearing
  skill obeys the frontmatter status contract (FR-D4). (Realizes: §14 "all".)
- **AC-S0.2** Every skill whose body changes under this spec has its
  `metadata.version` bumped above its §3 baseline; a skill whose body does not
  change is not bumped. The bump floor is a MINOR increment; whether the most-
  changed skills take a MAJOR (cutover) bump is at the maintainer's discretion
  (§DoF; §Flagged item F-9).
- **AC-S0.3** Each changed/new skill restates inline the V2 rules it relies on and
  does not link to files outside its own skill directory (AGENTS.md
  self-containment). (Realizes: AGENTS.md; handoff record.)

The per-skill FRs below are the concrete instantiations; FR-S0 is the umbrella.

#### FR-S1 — `discussion`, `seeded-discussion`

(Realizes: §14 row 1; §11; §10; §4; P5 Decision A, P7.)

- **AC-S1.1** Both bodies instruct output to the **target's `discussions/`** inside
  the thread (genesis discussions → `seed/discussions/`) and enforce the stamped
  record filename grammar. (Realizes: §11; §3; addresses the V1 drift bugs.)
- **AC-S1.2** Both bodies instruct: two modes, lettered options, target-scoped
  P-numbering + off-target rule, context-rich headers, optional pause, peer
  framing, write-only-if-useful. (Realizes: §11.)
- **AC-S1.3** Both bodies instruct that a discussion may carry an optional
  `rationale` cross-link but no longer owns review disposition. (Realizes: §10; P7.)
- **AC-S1.4** Both bodies instruct records-immutable-by-default with
  owner-authorized in-place corrections visibly marked. (Realizes: §4; P5 Decision A.)
- **AC-S1.5** Both `metadata.version` bumped.
- *Note (not a blocker):* the "update past logs on explicit user request" behavior
  referenced in decision-log P5 lives in the **deprecated** `discussion-loop`
  (`skills/deprecated/`), not in the active `discussion`/`seeded-discussion`; the
  AC-S1.4 rule is the active-skill encoding of that behavior. The deprecated skill
  is out of scope. (See §Flagged item F-7.)

#### FR-S2 — `propose-auto`, `propose-interactive`

(Realizes: §14 row 2; §4; P3; tier awareness.)

- **AC-S2.1** Both bodies instruct lineage-folder output `proposals/NNN[-<desc>]/proposal.md`.
- **AC-S2.2** Both bodies instruct the `approved` / `rejected` frontmatter latch
  contract (set-once, stamped; condition derived).
- **AC-S2.3** Both bodies instruct tier awareness (read the ledger; the proposal
  stage is tier-3).
- **AC-S2.4** Both `metadata.version` bumped.

#### FR-S3 — `spec-auto`, `spec-interactive`

(Realizes: §14 row "spec-*"; §9; §4; P3, P9, P14.)

- **AC-S3.1** Both bodies instruct lineage-folder output `specs/NNN[-<desc>]/spec.md`.
- **AC-S3.2** Both bodies instruct the `approved` then `implemented` latch contract.
- **AC-S3.3** Both bodies require a "Degrees of freedom" section in the emitted spec.
- **AC-S3.4** Both bodies require machine-checkable acceptance criteria (FR/AC +
  coverage + traceability) at tier ≥2.
- **AC-S3.5** Both bodies instruct the lossless authoring constraint at the
  decisions/assumptions level with the discuss-or-mark-DoF escape. (Realizes: §9; P9.)
- **AC-S3.6** Both `metadata.version` bumped.

#### FR-S4 — `plan-loose-auto`, `plan-loose-interactive`, `plan-strict-auto`, `plan-strict-interactive`

All four **retained** (none removed). (Realizes: §14 plan row; §4; P6.)

- **AC-S4.1** All four bodies instruct lineage-folder output `plans/NNN[-<desc>]/plan.md`.
- **AC-S4.2** All four bodies instruct alive-in-place editing (no version files)
  and that the plan carries **no stored status and no `version`** header.
- **AC-S4.3** All four retain their self-review step and adopt thread-V2 paths +
  tier awareness.
- **AC-S4.4** All four `metadata.version` bumped.

#### FR-S5 — `adjust-plan-granularity-auto`, `adjust-plan-granularity-interactive`

**Retained, not retired** (its input is an existing plan, not a spec). (Realizes:
§14; P6.)

- **AC-S5.1** Both bodies instruct the only V2 change is output-mechanics: edit the
  living plan in place, record-backed, instead of emitting a new version file;
  thread-V2 paths.
- **AC-S5.2** Both `metadata.version` bumped.

#### FR-S6 — `review-proposal-auto`, `review-proposal-interactive`

(Realizes: §14 row 3; §10; P7.)

- **AC-S6.1** Both bodies instruct output to the **proposal's `reviews/`**.
- **AC-S6.2** Both bodies instruct the references-first report format.
- **AC-S6.3** Both bodies instruct the consistency-with-decision-logs check.
- **AC-S6.4** Both bodies instruct setting/reading disposition via frontmatter.
- **AC-S6.5** Both `metadata.version` bumped.

#### FR-S7 — `review-spec-auto`, `review-spec-interactive`

(Realizes: §14 row 4; §10; P7.)

- **AC-S7.1** Both bodies instruct output to the **spec's `reviews/`**.
- **AC-S7.2** Both bodies instruct the references-first format with thread-relative
  within-thread paths.
- **AC-S7.3** Both bodies add the consistency-with-decision-logs check.
- **AC-S7.4** Both bodies remove open/processed lifecycle language and record
  disposition via frontmatter.
- **AC-S7.5** Both `metadata.version` bumped.

#### FR-S8 — `review-plan-auto`, `review-plan-interactive`

(Realizes: §14 row 5; §9; P6.)

- **AC-S8.1** Both bodies instruct the four-outcome, mode-agnostic adherence review
  (plan-vs-spec however the plan was authored).
- **AC-S8.2** Both bodies instruct honoring the spec's Degrees-of-freedom section
  (to distinguish "deviated" from "chose within granted freedom").
- **AC-S8.3** Both bodies instruct that outcomes 3 & 4 (spec-fault) route to the
  human and fix the spec, never patch the plan; disposition via frontmatter.
- **AC-S8.4** Both `metadata.version` bumped.

#### FR-S9 — `review-implementation-auto`, `review-implementation-interactive`, `review-code-auto`, `review-code-interactive`

(Realizes: §14 row 6; §9; §10.)

- **AC-S9.1** All four bodies instruct verification against the **spec's acceptance
  criteria**.
- **AC-S9.2** All four bodies instruct output to `implementation/reviews/` and
  thread-V2 paths.
- **AC-S9.3** All four bodies instruct disposition via frontmatter.
- **AC-S9.4** All four `metadata.version` bumped.

#### FR-S10 — NEW: `review-lossless-mapping-auto`, `review-lossless-mapping-interactive`

The highest-value new skill, created as a review-family pair to honor the
`-auto`/`-interactive` discipline. (Realizes: §14 "new: lossless-mapping review";
§10; P9. Names + the need for an interactive variant are flagged — §Flagged item F-4.)

- **AC-S10.1** `skills/workflow/review/review-lossless-mapping-auto/SKILL.md` and
  `…/review-lossless-mapping-interactive/SKILL.md` exist, each with `name:` equal to
  its leaf directory and `metadata.version: 1.0.0`.
- **AC-S10.2** Both bodies implement the lossless-mapping review per FR-D9.4: the
  decisions/assumptions bar, the DoF pressure valve, the two-section output (empty =
  pass).
- **AC-S10.3** Both bodies state the cadence (tier ≥2 recommendation, run before
  the spec is `approved`; on demand otherwise) and record disposition via
  frontmatter.
- **AC-S10.4** Both bodies follow the references-first report format and the
  thread-relative path rule.

#### FR-S11 — implement family: `implement-auto`, `implement-interactive`, `implement-plan-auto`, `implement-plan-interactive`, `implement-plan-with-subagents-auto`, `implement-plan-with-subagents-interactive`

(Realizes: §14 `implement-*`; §9.)

- **AC-S11.1** All six bodies instruct emitting an **implementation report** record
  (`implementation/<UTC>-<desc>-implementation-report.md`) capturing deviations +
  justification, surprises, problems, follow-ups.
- **AC-S11.2** All six bodies instruct follow-up routing (to seeds of future
  threads or, in tier-3 phased work, the next phase's discussion).
- **AC-S11.3** All six adopt thread-V2 paths + tier awareness.
- **AC-S11.4** All six `metadata.version` bumped.

#### FR-S12 — `merge-artifacts-auto`, `merge-artifacts-interactive`

(Realizes: §14 row; §3 variant rule; P4.)

- **AC-S12.1** Both bodies instruct: no version-file bump (none exist); merge
  authors/revises the canonical `NNN/<artifact>.md` from candidate inputs — or a
  record-backed in-place revision if alive, or a new thread if the target is
  frozen.
- **AC-S12.2** Both bodies instruct that the rationale goes in a decision log and
  that competing drafts live in `.wip/` (only the canonical artifact is emitted).
- **AC-S12.3** Both `metadata.version` bumped.

#### FR-S13 — `finish` (substantive new behavior)

(Realizes: §14 `finish`; §9; §4; §5; P16.)

- **AC-S13.1** Body instructs setting the spec's `implemented` latch.
- **AC-S13.2** Body instructs appending `closed: done` to the ledger (in the pinned
  line grammar, FR-D4.19) in the same finish action.
- **AC-S13.3** Body instructs updating the living docs (§5 two-document model).
- **AC-S13.4** Body instructs closing the ticket (the single terminal handshake).
- **AC-S13.5** `metadata.version` bumped.

#### FR-S14 — `whats-next` (derived-status reader)

(Realizes: §14 `whats-next`; §4, §5; P2, P3. The future CLI itself is deferred —
§Flagged item F-6.)

- **AC-S14.1** Body instructs reading the ledger (tier + disposition) and folding
  spine position + open findings to answer "what now / what next / is it closed".
- **AC-S14.2** Body states it is the derived-status reader (a CLI precursor); the
  CLI/materialized projection is not built here.
- **AC-S14.3** `metadata.version` bumped.

#### FR-S15 — `capture-inbox` → replaced by NEW `seed-capture`

(Realizes: §14 `capture-inbox`; §5, §6; P2. New-skill name + the deprecation move
are flagged — §Flagged item F-5.)

- **AC-S15.1** `skills/workflow/capture-discussion/seed-capture/SKILL.md` exists,
  `name: seed-capture`, `metadata.version: 1.0.0`, following the SKILL.md
  conventions.
- **AC-S15.2** Its body instructs writing a seed for a new/future thread (per the
  seed format, FR-D7.2) or a tracker ticket — not an inbox item.
- **AC-S15.3** `capture-inbox` is moved to `skills/deprecated/capture-inbox/`
  (kept on disk so existing installs do not break), and no V2 spine path references
  the inbox.

#### FR-S16 — `take-snapshot`, `brief-the-recipient`, `consult-the-expert`, `report-to-the-owner`, `afk-exploration`, `the-librarian`, `meta-prompting`

The §14 "all"-row skills — tier awareness + thread-V2 paths where they touch
threads; likely no deeper change. (Realizes: §14 "all" + last two rows.)

- **AC-S16.1** Each body that currently references V1 thread paths, the inbox, or
  stored status is updated to the V2 thread-layout paths + frontmatter contract;
  each that opens a thread gains tier awareness.
- **AC-S16.2** A skill in this set whose body genuinely needs no change is left
  unchanged and not bumped; one that changes is bumped. (The per-skill
  determination is a bounded DoF — apply where the body touches threads/status;
  §DoF.)

---

### FR-R — repo upkeep (deliverable B, per AGENTS.md)

(Realizes: AGENTS.md "When adding a new skill" / commit-scope / marketplace rules.)

#### FR-R1 — `README.md`

- **AC-R1.1** A `seed-capture` entry is added under "Capture & Discussion" with its
  description and install snippet, linking the full nested path.
- **AC-R1.2** `review-lossless-mapping-auto` and `review-lossless-mapping-interactive`
  entries are added under "Review".
- **AC-R1.3** `capture-inbox` is moved from "Capture & Discussion" to the "Retired
  skills" section (path updated to `skills/deprecated/capture-inbox`).
- **AC-R1.4** Any skill whose `description` frontmatter changed has its README
  description updated to match.

#### FR-R2 — `.claude-plugin/marketplace.json`

- **AC-R2.1** `./skills/workflow/capture-discussion/seed-capture` is added to the
  `JeisKappa-capture-discussion` plugin's `skills` array.
- **AC-R2.2** `./skills/workflow/review/review-lossless-mapping-auto` and
  `…/review-lossless-mapping-interactive` are added to the `JeisKappa-review`
  plugin's `skills` array.
- **AC-R2.3** `./skills/workflow/capture-discussion/capture-inbox` is removed from
  `JeisKappa-capture-discussion` and added to `JeisKappa-deprecated`.
- **AC-R2.4** The `plugins` array stays sorted alphabetically by `name` with
  `JeisKappa-deprecated` last (unchanged by this edit).

#### FR-R3 — `.vscode/settings.json`

- **AC-R3.1** `seed-capture`, `review-lossless-mapping-auto`, and
  `review-lossless-mapping-interactive` are added to `conventionalCommits.scopes`,
  preserving alphabetical order.
- **AC-R3.2** `capture-inbox` **remains** in the scopes array (the folder still
  exists, under `deprecated/`), consistent with `discussion-loop` /
  `review-decision-document` already being present.

#### FR-R4 — `AGENTS.md` (optional, flagged)

- **AC-R4.1** *(Optional — see §Flagged item F-10.)* If adopted, AGENTS.md gains a
  "V2 Workflow Conventions" pointer section to `docs/workflow/v2/` mirroring the
  existing "V1 Workflow Conventions" pointer; the proposal does not mandate this,
  so it is left as an owner decision rather than a hard AC.

---

## 2. Coverage

Two coverage proofs: every proposal §14 skill row maps to an FR-S (so deliverable B
is complete), and every V2 rule-area named in the build brief maps to an FR-D (so
deliverable A is complete).

### 2.1 §14 rows → FR-S (skill coverage)

| Proposal §14 row | FR | Disposition |
|---|---|---|
| `discussion` / `seeded-discussion` | FR-S1 | changed |
| `propose-*` | FR-S2 | changed |
| `review-proposal-*` | FR-S6 | changed |
| `review-spec-*` | FR-S7 | changed |
| `review-plan-*` | FR-S8 | changed |
| `review-implementation-*` / `review-code-*` | FR-S9 | changed |
| **new:** lossless-mapping review | FR-S10 | new |
| `plan-loose-*`, `plan-strict-*` | FR-S4 | all retained, changed |
| `adjust-plan-granularity-*` | FR-S5 | retained, output-mechanics change |
| `implement-*` | FR-S11 | changed |
| `merge-artifacts-*` | FR-S12 | changed |
| `finish` | FR-S13 | substantive new behavior |
| `whats-next` | FR-S14 | changed (derived-status reader) |
| `capture-inbox` | FR-S15 | replaced by `seed-capture` + deprecated |
| `spec-*` | FR-S3 | changed |
| `take-snapshot`, handoff, research | FR-S16 | "all"-row only |
| all | FR-S0 | cross-cutting umbrella |

No §14 row is unmapped. Every changed skill on disk (§3) is covered.

### 2.2 V2 rule-areas → FR-D (doc coverage)

| Rule-area (build brief) | Doc / FR | Proposal § |
|---|---|---|
| Thread layout incl. lifecycle ledger location | `thread-layout.md` / FR-D2 | §3, §4 |
| Two-form filename grammar + token vocabulary, no `v<N>` | `filename-grammar.md` / FR-D3 | §3 |
| Lifecycle/immutability: latches + derived condition | `lifecycle.md` / FR-D4 | §4 |
| Body-vs-frontmatter; frontmatter status contract | `lifecycle.md` / FR-D4 | §3, §4 |
| The freeze model + guard rules | `lifecycle.md` / FR-D4 | §4 |
| The lifecycle ledger (filename + line grammar, pinned) | `lifecycle.md` / FR-D4.16–21 | §4, §15 |
| Event sourcing ("derive, don't store") | `lifecycle.md` / FR-D4.12 | §5 |
| Tiers | `tiers.md` / FR-D5 | §7 |
| Definition of Done + PR discipline | `tiers.md` / FR-D5 | §13 |
| Tracker integration | `tracker-integration.md` / FR-D6 | §8 |
| The spine (stages) + seed format + spec obligations | `spine.md` / FR-D7 | §9, §6 |
| Discussions | `discussions.md` / FR-D8 | §11 |
| Reviews incl. the lossless-mapping check | `reviews.md` / FR-D9 | §10 |
| Index / versioning / grandfathering / self-containment | `README.md` / FR-D1 | §16 |

Every rule-area has a documented home. Rules that the proposal places in more than
one section (e.g. the frontmatter contract spans §3 + §4) land in a single doc and
are cross-referenced from the others.

### 2.3 Repo-upkeep coverage

| Upkeep target | FR |
|---|---|
| `README.md` index | FR-R1 |
| `.claude-plugin/marketplace.json` | FR-R2 |
| `.vscode/settings.json` scopes | FR-R3 |
| `AGENTS.md` V2 pointer (optional) | FR-R4 |

---

## 3. Skill baseline versions (AC anchor for "version bumped")

Baselines as of this spec, for the FR-S "version bumped above baseline" ACs. New
skills (FR-S10, FR-S15) have no baseline and start at `1.0.0`.

| Skill | Path | Baseline |
|---|---|---|
| discussion | `skills/workflow/capture-discussion/discussion` | 1.0.2 |
| seeded-discussion | `skills/workflow/capture-discussion/seeded-discussion` | 1.0.2 |
| capture-inbox | `skills/workflow/capture-discussion/capture-inbox` | 1.0.2 (→ deprecated) |
| propose-auto | `skills/workflow/propose/propose-auto` | 1.0.2 |
| propose-interactive | `skills/workflow/propose/propose-interactive` | 1.0.2 |
| spec-auto | `skills/workflow/spec/spec-auto` | 1.0.2 |
| spec-interactive | `skills/workflow/spec/spec-interactive` | 1.0.2 |
| plan-loose-auto | `skills/workflow/plan/plan-loose-auto` | 1.0.2 |
| plan-loose-interactive | `skills/workflow/plan/plan-loose-interactive` | 1.0.2 |
| plan-strict-auto | `skills/workflow/plan/plan-strict-auto` | 1.0.2 |
| plan-strict-interactive | `skills/workflow/plan/plan-strict-interactive` | 1.0.2 |
| adjust-plan-granularity-auto | `skills/workflow/plan/adjust-plan-granularity-auto` | 1.1.1 |
| adjust-plan-granularity-interactive | `skills/workflow/plan/adjust-plan-granularity-interactive` | 1.0.2 |
| review-proposal-auto | `skills/workflow/review/review-proposal-auto` | 1.0.2 |
| review-proposal-interactive | `skills/workflow/review/review-proposal-interactive` | 1.0.2 |
| review-spec-auto | `skills/workflow/review/review-spec-auto` | 1.1.1 |
| review-spec-interactive | `skills/workflow/review/review-spec-interactive` | 1.0.2 |
| review-plan-auto | `skills/workflow/review/review-plan-auto` | 1.0.2 |
| review-plan-interactive | `skills/workflow/review/review-plan-interactive` | 1.0.2 |
| review-implementation-auto | `skills/workflow/review/review-implementation-auto` | 1.1.1 |
| review-implementation-interactive | `skills/workflow/review/review-implementation-interactive` | 1.1.1 |
| review-code-auto | `skills/workflow/review/review-code-auto` | 1.1.1 |
| review-code-interactive | `skills/workflow/review/review-code-interactive` | 1.1.1 |
| implement-auto | `skills/workflow/implement/implement-auto` | 1.1.1 |
| implement-interactive | `skills/workflow/implement/implement-interactive` | 1.0.2 |
| implement-plan-auto | `skills/workflow/implement/implement-plan-auto` | 1.1.1 |
| implement-plan-interactive | `skills/workflow/implement/implement-plan-interactive` | 1.0.2 |
| implement-plan-with-subagents-auto | `skills/workflow/implement/implement-plan-with-subagents-auto` | 1.0.2 |
| implement-plan-with-subagents-interactive | `skills/workflow/implement/implement-plan-with-subagents-interactive` | 1.0.2 |
| merge-artifacts-auto | `skills/workflow/merge/merge-artifacts-auto` | 1.1.1 |
| merge-artifacts-interactive | `skills/workflow/merge/merge-artifacts-interactive` | 1.0.2 |
| finish | `skills/workflow/finish-navigate/finish` | 1.1.1 |
| whats-next | `skills/workflow/finish-navigate/whats-next` | 1.1.1 |
| take-snapshot | `skills/workflow/documentation/take-snapshot` | 1.2.1 |
| brief-the-recipient | `skills/workflow/handoff/brief-the-recipient` | 2.0.0 |
| consult-the-expert | `skills/workflow/handoff/consult-the-expert` | 1.2.2 |
| report-to-the-owner | `skills/workflow/handoff/report-to-the-owner` | 1.3.2 |
| afk-exploration | `skills/workflow/research/afk-exploration` | 1.4.3 |
| the-librarian | `skills/workflow/research/the-librarian` | 1.4.1 |
| meta-prompting | `skills/workflow/support/meta-prompting` | 1.3.1 |

---

## 4. Traceability

Every FR traces to a proposal section and/or decision-log entry, or to a named
repo convention (AGENTS.md). No FR is sourced from anywhere else; where the build
needs a fact the proposal left open, it is a pinned §15 DoF (flagged) or a DoF, not
an invention.

| FR | Proposal § | Decision log | Other source |
|---|---|---|---|
| FR-D0 | §16, §17, §5 | P21 | V1 doc shape |
| FR-D1 | §16 | P21 | V1 README; AGENTS.md (self-containment); handoff |
| FR-D2 | §3, §4, §5, §6 | P1, P4, P12, P17, P21 | — |
| FR-D3 | §3, §16 | P11, P18 | — |
| FR-D4 (core) | §4, §5 | P2, P3, P5, P7, P8, P19, P20 | — |
| FR-D4.16–21 (ledger) | §4, §7, §15 | P2, P21 | dogfooded `lifecycle.md` |
| FR-D5 | §7, §13 | P10, P15 | — |
| FR-D6 | §8 | P2 | — |
| FR-D7 | §9, §6, §5 | P6, P14, P16 | — |
| FR-D8 | §11 | P7 | — |
| FR-D9 | §10, §13 | P7, P9 | — |
| FR-S0 | §14 | — | AGENTS.md (version bump, self-containment) |
| FR-S1 | §14, §11, §10, §4 | P5, P7 | — |
| FR-S2 | §14, §4 | P3 | — |
| FR-S3 | §14, §9, §4 | P3, P9, P14 | — |
| FR-S4 | §14, §4 | P6 | — |
| FR-S5 | §14 | P6 | — |
| FR-S6 | §14, §10 | P7 | — |
| FR-S7 | §14, §10 | P7 | — |
| FR-S8 | §14, §9 | P6 | — |
| FR-S9 | §14, §9, §10 | — | — |
| FR-S10 | §14, §10 | P9 | `-auto`/`-interactive` discipline (D30) |
| FR-S11 | §14, §9 | — | — |
| FR-S12 | §14, §3 | P4 | — |
| FR-S13 | §14, §9, §4, §5 | P16 | — |
| FR-S14 | §14, §4, §5 | P2, P3 | — |
| FR-S15 | §14, §5, §6 | P2 | repo deprecation pattern |
| FR-S16 | §14 | — | — |
| FR-R1–R3 | §16 | — | AGENTS.md "When adding a new skill" |
| FR-R4 | §5 | — | AGENTS.md (optional; flagged) |

---

## 5. Degrees of freedom

Deliberately left to the implementer (and, where the proposal already declared
them, to the maintainer at review). These are the things this spec does **not**
pin; choosing any of them does not violate the contract.

1. **Exact prose wording** of every reference doc and every skill body. The ACs
   require rules to be *stated/instructed*, never verbatim text.
2. **Doc-set decomposition granularity.** The nine-doc split (FR-D) is the default;
   the implementer may merge or split docs (e.g. fold the ledger spec out of
   `lifecycle.md` into its own file, or merge `discussions.md` into `spine.md`)
   **provided every rule in FR-D has a home and every cross-reference resolves**.
3. **Semver level of each bump.** AC-S0.2 requires a bump above baseline (MINOR
   floor); whether the most-changed skills (`finish`, `spec-*`, the layout
   adopters) take a MAJOR cutover bump is the maintainer's call. (Flagged F-9.)
4. **The provenance-line format** in V2 docs (AC-D0.2) — analogous to V1's
   `**Codifies:** D…` line; presence required, format free.
5. **Whether `review-lossless-mapping` needs an interactive variant.** FR-S10
   specifies the pair for family consistency; the maintainer may collapse it to
   auto-only. (Flagged F-4.)
6. **Exact seed format** beyond its two mandatory lines (`External:` + 1–5 line
   trigger). (Proposal §15.)
7. **Tier label names** (numbers are normative; chore/patch/feature/initiative are
   suggestions). (Proposal §15.)
8. **Whether plan-review outcomes 3 and 4 merge** into one (the spec needs only
   "spec-fault routes to the human and fixes the spec"). (Proposal §15.)
9. **Whether the supersession forward-link uses a soft-keyword breadcrumb.**
   (Proposal §15.)
10. **Whether V2 docs/headers render a non-authoritative derived-condition word**
    for human legibility (latches-only is the default). (Proposal §15.)
11. **Exact frontmatter field spelling/syntax** for latches and disposition. The
    build pins working defaults (AC-D4.11) so the skills agree; renaming them
    consistently across docs + skills is permitted. (Proposal §15; Flagged F-8.)
12. **Per-skill applicability of the "all" row** to thread-agnostic deliverable
    skills (FR-S16): apply where the body actually touches thread paths/status;
    leave genuinely thread-agnostic skills unchanged.
13. **`implementation/` flat vs lineage folders.** Flat is pinned (AC-D2.10) per
    the proposal's stated default; revisiting if implementations multiply per
    thread is left open. (Proposal §15.)
14. **Implementation sequencing and commit batching** (which docs/skills first,
    one commit vs several) — left to the implementer / the plan phase.

---

## 6. Out of scope (deferred, with reasons)

Named so a reviewer sees they were considered, not missed. Each is either an
external action or a deliberately deferred mechanism.

- **Freeze-guard tooling** (pre-commit hook / CI job). The docs specify the rules
  the guard enforces (FR-D4.13–15); building the tooling is deferred. The proposal
  commits to the guard as V2's one mechanical guard but leaves its mechanism a §15
  DoF; it is neither a doc nor a skill, so it is outside §16 items 2–3. (Flagged F-2.)
- **The future status CLI / materialized `state.json` projection.** `whats-next`
  gains the derived-status reader behavior (FR-S14); the CLI itself and any
  materialized projection are deferred per §5 ("buys nothing today").
- **PR-enforcement CI gate.** §13/P10 ship the recommendation; the
  tier-reading CI gate is a deferred option.
- **Postmortem and decision-index templates.** §13 builds them on first trigger;
  not now.
- **`EXAMPLE-WORKFLOW/` retirement.** An external-workspace action, not a step in
  this repo's rollout (§16 item 4; P13).
- **skillrouter unification** (collapsing `plan-loose-*`/`plan-strict-*` behind a
  flag, etc.). Deferred to the skillrouter project (P6).
- **V1 thread migration.** V1 threads are grandfathered — never migrated (§16; P21).

---

## 7. Flagged for owner review

Items where this spec **pins a resolution the build needs** to a degree of freedom
the proposal left open, or makes a build call the proposal does not settle. Each is
a proposal-and-flag (per the build brief), not a silent decision — please confirm
or redirect. None re-opens a frozen proposal decision; each fills a declared gap.

- **F-1 — Lifecycle ledger filename + line grammar (pins §15 ledger DoF).**
  *Pinned:* filename `lifecycle.md` at the thread root (ratifying the file this
  thread already dogfoods, P21); line grammar
  `<event> @ <YYMMDDHHMMSSZ> — <justification>` with `<event>` ∈
  {`tier: <0–3>`, `deferred`, `resumed`, `closed: done`, `closed: dropped`},
  `tier` and `disposition` as the two keys, last line wins, mandatory
  justification, optional free Markdown header (AC-D4.18–19). *Flag:* the basename
  echoes the rules doc `docs/workflow/v2/lifecycle.md`; they live in different
  trees and one is a rules doc, one a data file, so this is acceptable, but if you
  prefer zero overlap the ledger file could be `ledger.md` instead. Your call.

- **F-2 — Freeze-guard mechanism (pins §15 guard DoF as deferred).** *Pinned:* the
  docs fully specify the guard's rules; **building** the guard is deferred (out of
  §16 items 2–3). *Proposed-for-when-built:* both a pre-commit hook (local
  prevention, matching "prevention beats detection") and a CI check (the
  non-bypassable backstop). Confirm deferral, or ask me to fold the guard build
  into this spec's scope.

- **F-3 — Re-`deferred` permitted (resolves a §15 DoF via the §4 guard text).**
  *Pinned:* a re-`deferred` reason-update is allowed, because §4's guard already
  admits a ledger-only `deferred` append on a deferred thread (AC-D4.14, AC-D4.21).
  This resolves the §15 "whether re-deferred is permitted, or one must resume
  first" DoF in favor of what §4 already states. Flagging since §15 listed it open.

- **F-4 — New review skill name + interactive variant.** *Pinned:*
  `review-lossless-mapping-{auto,interactive}` (review-family naming + the
  `-auto`/`-interactive` discipline). *Flag:* the proposal says "the
  lossless-mapping review" (singular); if you want it auto-only, drop the
  interactive half (DoF #5). Confirm the name and whether both variants are wanted.

- **F-5 — `capture-inbox` → `seed-capture` + deprecation.** *Pinned:* new skill
  `seed-capture` in the `capture-discussion` group; `capture-inbox` moved to
  `skills/deprecated/` (repo pattern for retired skills; "replaced" in §14). *Flag:*
  the proposal's literal word is "seed-capture", but the sibling is `capture-inbox`
  (verb-first) — `capture-seed` would be more consistent. Confirm the name and the
  deprecation move.

- **F-6 — `whats-next` skill change vs the CLI.** *Pinned:* the skill gains the
  derived-status reader behavior now (FR-S14); the actual CLI is deferred (§Out of
  scope). Flagging the split so the deferral is explicit.

- **F-7 — `discussion` skill version reference.** The decision-log P5 "update past
  logs on explicit user request (v1.3.0)" behavior actually lived in the
  **deprecated** `discussion-loop` (v1.5.0), not the active `discussion` (v1.0.2)
  that §14 targets. This spec encodes the rule (records immutable-by-default +
  marked owner correction) in the active `discussion`/`seeded-discussion`
  (AC-S1.4); the deprecated skill stays out of scope. Not a blocker — flagged so
  the version mismatch in the log doesn't read as a gap.

- **F-8 — Frontmatter field spelling.** *Pinned working defaults:* `version`,
  `approved`, `rejected`, `implemented`, `disposed`, `disposition`, `rationale`
  (AC-D4.11). The proposal calls exact spelling a §15 DoF; pinned only so docs +
  skills agree. Rename consistently if you prefer different spellings.

- **F-9 — Version-bump semver level.** *Pinned floor:* MINOR per changed skill
  (AC-S0.2). The V2 cutover changes output contracts, so a MAJOR (e.g. `2.0.0`)
  cutover for the most-changed skills is defensible — your discretion (DoF #3).

- **F-10 — Doc-set scope + AGENTS.md pointer.** *(a)* Proposal §16 explicitly names
  only a filename-grammar doc and an immutability/lifecycle doc; this spec
  interprets "codify the V2 ruleset" to also cover tiers, tracker, spine,
  discussions, and reviews as reference docs (per the build brief and the V1
  precedent of a central ruleset). Confirm that broader scope. *(b)* AGENTS.md
  currently points to `docs/workflow/v1/`; FR-R4 offers an optional V2 pointer
  section. The proposal doesn't mandate it, so it's left as your decision.

---

## 8. Self-review (authoring check before emission)

- **Coverage of §14:** every §14 row maps to an FR-S (§2.1) — confirmed complete,
  including the "all" row (FR-S0/FR-S16), the new skill (FR-S10), the replacement
  (FR-S15), and the substantive `finish` change (FR-S13).
- **Coverage of the doc set:** every V2 rule-area in the build brief maps to an
  FR-D (§2.2) — confirmed; the ledger's pinned filename/grammar and the freeze
  model both have homes in `lifecycle.md`.
- **Lossless authoring:** every FR carries a traceability tag (§4); no requirement
  originates outside the proposal + decision log + named repo conventions; each
  build-needed gap is a pinned §15 DoF surfaced in §7 or a DoF in §5 — nothing
  smuggled.
- **No frozen-decision re-opening:** the spec realizes P1–P21 and the proposal as
  written; it does not contradict them. The one place the proposal's §15 listed an
  item still open that §4 already answers (re-`deferred`) is resolved toward §4 and
  flagged (F-3).
- **Machine-checkability:** every AC is a single read/grep/parse check against one
  file (file exists / doc states R / skill instructs Z / version > baseline / array
  contains entry).
- **Dogfooding:** frontmatter is `version: 1` only (Draft derived, no `approved`
  latch); lineage folder `specs/001/`; thread-relative within-thread paths;
  `YYMMDDHHMMSSZ` timestamps; status-only frontmatter.

The next step for this artifact is a lossless-mapping review against the proposal +
decision log, then the owner's `approved` latch.
