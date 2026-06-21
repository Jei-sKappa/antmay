---
version: 2
status:
  approved: 260621080825Z
---

# Spec: Modular Agentic Workflow V2 — in-repo build contract

This spec is the buildable contract for the two in-repo deliverables of Workflow
V2 (proposal §16 items 2–3): **(A)** the `docs/workflow/v2/` reference-doc set and
**(B)** the skill changes implied by proposal §14, with the repo upkeep they
require. It derives entirely from the approved, frozen proposal
(`proposals/001/proposal.md`, version 2, `approved`), this thread's proposal
decision log (`proposals/001/discussions/260612201354Z-proposal-v1-review-findings-decision-log.md`,
P1–P21), and — for `version: 2` — the spec-review-and-flags decision log
(`specs/001/discussions/260620171014Z-spec-review-and-flags-decision-log.md`,
SR-P1–P9) that disposed the lossless-mapping review and settled the owner flags.
It re-decides nothing: every requirement traces to a proposal section or a
decision-log entry (§Traceability); anything not so traceable is marked a Degree of
Freedom (§Degrees of freedom) or recorded — now resolved — in §Owner flags.

It dogfoods V2: it lives in a lineage folder (`specs/001/`); its frontmatter
now carries a `status:` map with the `approved` latch set, so its derived
condition is **Approved** — it stays alive (amendable only via owner-approved,
record-backed amendments) until an `implemented` latch would freeze it (§4);
within-thread references are
thread-relative; cross-location references (skills, `docs/workflow/`) are
repo-relative; all timestamps use the `YYMMDDHHMMSSZ` UTC grammar. (`version: 2`
records that this spec has completed one review→revise cycle: the
lossless-mapping review and the discussion loop that disposed it.)

**Scope boundary.** "Build" here = author the nine reference docs and edit/author
the skills + the four upkeep files listed below (README, marketplace, scopes, and
the required AGENTS.md V2 pointer). It does **not** include: building
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
  greater than the baseline recorded in §3 (the honest-per-skill semver policy —
  MAJOR for a contract change, MINOR additive — is in FR-S0, AC-S0.2).
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
  handoff record "V2 rules must be restated plainly inside each skill body";
  §Owner flags F-10.)

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
- **AC-D3.4** States the lifecycle ledger is a fixed-name append-only file named
  `ledger.md` at the thread root, and points to the lifecycle doc (FR-D4, the
  reference doc `docs/workflow/v2/lifecycle.md`) for its line grammar. (Realizes:
  §3; §4.)
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
  table, with every latch stored **under the frontmatter `status:` map** (FR-D4.9,
  FR-D4.11): Proposal latches `status.approved | status.rejected`; Spec latches
  `status.approved` then `status.implemented`; Plan has **no** latches and **no**
  `version`. (Realizes: §4; P3.)
- **AC-D4.4** States the **authoritative condition-derivation function** verbatim
  in intent, derived from the `status:` map by precedence: `status.implemented`
  present → Implemented; else `status.approved` present → Approved (+ "has open
  findings" if an undisposed review exists); else an undisposed review exists → In
  Review; else → Draft. The condition is always derived from the `status` map,
  never stored. (Realizes: §4; P3; status-map model — §Owner flags F-8.)
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
  immutability while its frontmatter `status:` map is a live surface until terminal
  (a review until `status.disposed`), then frozen; versioned artifacts keep
  body+frontmatter alive together until their latch, then freeze; disposition is
  set-once. (Realizes: §4; P7.)
- **AC-D4.9** States the frontmatter status contract and the D44 carve-out:
  frontmatter carries at most **two keys** — `version` (identity) and a `status:`
  **map** whose entries are lifecycle event → stamp (plus the review's
  `disposition`/`rationale`); lifecycle latches live **inside** the `status:` map,
  never as loose top-level keys and never collapsed to a single status value; a
  record with no lifecycle status carries **no frontmatter at all**; everything
  else (references, targets, cross-links, agendas) lives in prose; anything
  derivable from the artifact's own location — including the derived condition — is
  never stored; lifecycle-status frontmatter is **allowed**, source-relation/lineage
  frontmatter (`Supersedes:`, `Forked from:`, …) stays **banned**. (Realizes: §3
  frontmatter rule; §4; §5; P7, P19, P20; status-map model — §Owner flags F-8.)
- **AC-D4.10** States the when-an-edit-needs-a-backing-record table: Draft/In
  Review (pre-`approved`) → no per-edit record (git + feeding discussions);
  Approved→not-yet-Implemented → record-backed + owner-approved amendment for
  substantive change (editorial = git, marked); Implemented → frozen. (Realizes:
  §4 "When an edit needs a backing record"; P8.)
- **AC-D4.11** States the pinned frontmatter field defaults, with every lifecycle
  latch/event nested **under the `status:` map**: `version: <int>` at top level;
  proposal/spec `status.approved: <stamp>`, proposal `status.rejected: <stamp>`,
  spec `status.implemented: <stamp>`; review `status: { disposed: <stamp>,
  disposition: accepted | rejected, rationale?: <thread-relative path> }`. The
  build pins the **map model** (latches under `status:`, not loose top-level keys,
  not a single collapsed value) so skills agree; the exact YAML shape/spelling
  stays a §15 DoF (the proposal tables show intent). (Realizes: §4, §10 tables;
  §15 DoF — shape pinned, spelling free; §Owner flags F-8.)

Event sourcing + the freeze model:

- **AC-D4.12** States "status is derived, never stored — the workflow is
  event-sourced": truth is append-only events (frontmatter `status:`-map latches,
  ledger events, records), current state is a projection folded on demand; never store a derivable
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
  (§Out of scope; §Owner flags F-2). (Realizes: §4; §13; §15 DoF.)

The thread lifecycle ledger (pinned resolution of the §15 ledger DoF — §Owner
flags F-1):

- **AC-D4.16** States the ledger holds ONLY the two non-derivable facts **tier**
  and **disposition**, and reproduces the litmus test verbatim in intent (derivable
  → derive it; PM/coordination fact → tracker; neither, and only then → ledger may
  hold it). (Realizes: §4, §5; P2.)
- **AC-D4.17** States the ledger is append-only with a strict line grammar; the
  current value of each key is its last line; only transitions are written, never
  the resting default. (Realizes: §4; P2.)
- **AC-D4.18** States the **pinned filename**: the ledger is `ledger.md` at the
  thread root — renamed from the provisional `lifecycle.md` this thread first
  dogfooded, to free the basename `lifecycle.md` for the rules doc
  (`docs/workflow/v2/lifecycle.md`, FR-D4) and remove the data-file-vs-rules-doc
  collision. (Realizes: §15 ledger-filename DoF — pinned; P21; §Owner flags F-1.)
- **AC-D4.19** States the **pinned line grammar**: every event line is
  `<event> @ <YYMMDDHHMMSSZ> — <justification>`, where `<event>` is one of
  `tier: <0–3>`, `deferred`, `resumed`, `closed: done`, `closed: dropped`; tier
  lines update the `tier` key, the other four update the `disposition` key; a free
  Markdown header above the event lines is permitted (parsers read only
  grammar-matching lines); the `— <justification>` is mandatory on every line.
  (Realizes: §15 ledger-line-grammar DoF — pinned; proposal §4, §7; P2; §Owner flags F-1.)
- **AC-D4.20** States the disposition vocabulary and derivation: `(none)/resumed →
  active` (the resting default, never written), `deferred → paused` (reversible),
  `closed: done`/`closed: dropped → terminal` (sealed); no `open` event, no
  `implemented` disposition, no bare `closed`, no `reopened` (resurrection = a new
  thread). (Realizes: §4 disposition vocabulary; P2.)
- **AC-D4.21** States that a re-`deferred` (reason update) **is permitted** — the
  guard's deferred branch already admits a ledger-only `deferred` append (AC-D4.14).
  (Resolves the §15 "whether re-deferred is permitted" DoF, pinned to the §4 guard
  text — §Owner flags F-3.)

#### FR-D5 — `tiers.md` (the tier system + Definition of Done + PR discipline + prerequisite preflight)

(Realizes: §7, §13; P10, P15; LM-G1.)

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
- **AC-D5.7** States the **prerequisite-preflight practice** (the §13 "Now" item): a
  skill whose instructions require a binary or a sibling skill checks the
  prerequisite's availability **first** and fails the whole instruction with a clear
  warning when it is missing — never running until something breaks mid-flight; cites
  `open-ticket` (FR-S16, which needs the tracker CLI/API) as its first concrete
  application. (Realizes: §13 "Now"; restores lossless gap LM-G1.)

#### FR-D6 — `tracker-integration.md` (the three-layer status model)

(Realizes: §8; P2 Decision 3; LM-G2.)

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
- **AC-D6.4** States the **ticket-backlink convention**: when a thread links a
  ticket, the ticket gets **one** comment carrying a permalink back to the thread
  folder (a one-time backlink, not continuous mirroring); the comment is posted by
  `open-thread` when it links the ticket and/or by `finish`. (Realizes: §8;
  restores lossless gap LM-G2.)
- **AC-D6.5** States the **commit/PR reference convention**: commits and PRs
  reference the ticket (so the tracker's native auto-linking surfaces the work),
  completing the seed↔ticket bridge alongside the `External:` line and the backlink
  comment. (Realizes: §8; restores lossless gap LM-G2.)

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
  approval already set the spec's `status.approved` latch; the finish action sets
  the spec's `status.implemented` latch and appends `closed: done` to the ledger
  (`ledger.md`) in one action; the ticket is closed (with its backlink ensured per
  FR-D6.4); the freeze guard is active from that commit and
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
  **under the `status:` map** (`status: { disposed: <stamp>, disposition: accepted |
  rejected, rationale?: <thread-relative path> }`), set once; a review with no
  `status.disposed` field is open by parse; accept-and-revise sets the frontmatter
  directly (the revision is the record) and reject sets it with no document at all —
  no separate disposing record required. (Realizes: §10; P7; status-map model —
  §Owner flags F-8.)
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

#### FR-S0 — cross-cutting "all" row + version-bump policy + preflight + variant guardrail

(Realizes: §14 "all" row; §13 preflight; AGENTS.md version-bump + self-containment
conventions; the variant-rationalization guardrail and the prerequisite-preflight
rule restored from §6 and LM-G1.)

- **AC-S0.1** Every skill that writes or reads thread paths adopts the V2
  thread-layout paths (FR-D2); every skill that opens a thread reads the ledger
  (tier + disposition) and proposes the tier when opening; every status-bearing
  skill obeys the frontmatter status contract (FR-D4). (Realizes: §14 "all".)
- **AC-S0.2** Every skill bumps `metadata.version` by **honest per-skill semver**:
  **MAJOR** where the skill's output/behavior contract changes (new lineage-folder
  output paths, frontmatter `status:`-map latches, derived status, the inbox
  removal, plan-output changes — the cutover breaks most spine skills); **MINOR**
  for additive-only changes; **no bump** if the body does not change. New skills
  start at `1.0.0`. The level is applied per-skill from the actual change, not
  hand-assigned. (Realizes: §14; AGENTS.md version-bump; §Owner flags F-9.)
- **AC-S0.3** Each changed/new skill restates inline the V2 rules it relies on and
  does not link to files outside its own skill directory (AGENTS.md
  self-containment). (Realizes: AGENTS.md; handoff record.)
- **AC-S0.4** New skills **default to auto-only** (a single skill, no
  `-auto`/`-interactive` pair) unless an interactive mode is genuinely distinct from
  a discussion loop followed by the auto variant; existing variant pairs are
  retained unchanged for this release. (Realizes: the variant-rationalization
  guardrail recorded in §Out of scope; all three new skills here —
  `review-lossless-mapping` (FR-S10), `open-thread`, and `open-ticket` (FR-S15/S16)
  — already satisfy it.)
- **AC-S0.5** A skill whose instructions require a binary or a sibling skill applies
  the **prerequisite-preflight rule** (FR-D5.7): it checks availability **first** and
  fails the whole instruction with a clear warning when the prerequisite is missing;
  `open-ticket` (FR-S16) is the first concrete application (it needs the tracker
  CLI/API). (Realizes: §13 "Now"; restores lossless gap LM-G1.)

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
  is out of scope. (§Owner flags F-7.)

#### FR-S2 — `propose-auto`, `propose-interactive`

(Realizes: §14 row 2; §4; P3; tier awareness.)

- **AC-S2.1** Both bodies instruct lineage-folder output `proposals/NNN[-<desc>]/proposal.md`.
- **AC-S2.2** Both bodies instruct the `status.approved` / `status.rejected`
  frontmatter latch contract — latches nested under the `status:` map (FR-D4.11),
  set-once, stamped; condition derived.
- **AC-S2.3** Both bodies instruct tier awareness (read the ledger; the proposal
  stage is tier-3).
- **AC-S2.4** Both `metadata.version` bumped.

#### FR-S3 — `spec-auto`, `spec-interactive`

(Realizes: §14 row "spec-*"; §9; §4; P3, P9, P14.)

- **AC-S3.1** Both bodies instruct lineage-folder output `specs/NNN[-<desc>]/spec.md`.
- **AC-S3.2** Both bodies instruct the `status.approved` then `status.implemented`
  latch contract (latches nested under the `status:` map, FR-D4.11).
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

#### FR-S10 — NEW: `review-lossless-mapping` (single auto-mode skill)

The highest-value new skill, created as a **single auto-mode skill** (no
`-interactive` variant). The check is a one-shot produce-the-report verification;
its human-judgment step lands in the follow-on discussion loop, so an interactive
variant would only re-implement that loop. The name follows the `review-<dimension>`
family; a single-mode skill takes **no suffix** (the `-auto`/`-interactive` suffixes
are reserved for genuine pairs). (Realizes: §14 "new: lossless-mapping review"; §10;
P9; the auto-only guardrail AC-S0.4 — §Owner flags F-4.)

- **AC-S10.1** `skills/workflow/review/review-lossless-mapping/SKILL.md` exists,
  with `name: review-lossless-mapping` and `metadata.version: 1.0.0`.
- **AC-S10.2** Its body implements the lossless-mapping review per FR-D9.4: the
  decisions/assumptions bar, the DoF pressure valve, the two-section output (empty =
  pass).
- **AC-S10.3** Its body states the cadence (tier ≥2 recommendation, run before the
  spec is `approved`; on demand otherwise) and records disposition via the review's
  frontmatter `status:` map.
- **AC-S10.4** Its body follows the references-first report format and the
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

(Realizes: §14 `finish`; §9; §8; §4; §5; P16; LM-G2.)

- **AC-S13.1** Body instructs setting the spec's `status.implemented` latch (under
  the frontmatter `status:` map, FR-D4.11).
- **AC-S13.2** Body instructs appending `closed: done` to the ledger (`ledger.md`,
  in the pinned line grammar, FR-D4.19) in the same finish action.
- **AC-S13.3** Body instructs updating the living docs (§5 two-document model).
- **AC-S13.4** Body instructs closing the ticket (the single terminal handshake).
- **AC-S13.5** Body instructs ensuring the linked ticket carries the one permalink
  backlink comment to the thread (posting it at finish if `open-thread` did not
  already do so), per FR-D6.4. (Restores lossless gap LM-G2.)
- **AC-S13.6** `metadata.version` bumped.

#### FR-S14 — `whats-next` (derived-status reader)

(Realizes: §14 `whats-next`; §4, §5; P2, P3. The future CLI itself is deferred —
§Owner flags F-6.)

- **AC-S14.1** Body instructs reading the ledger (tier + disposition) and folding
  spine position + open findings to answer "what now / what next / is it closed".
- **AC-S14.2** Body states it is the derived-status reader (a CLI precursor); the
  CLI/materialized projection is not built here.
- **AC-S14.3** `metadata.version` bumped.

#### FR-S15 — `capture-inbox` → replaced by NEW `open-thread` (local)

`open-thread` opens a **local** thread: it writes the thread folder, the seed, and
the lifecycle ledger. (Realizes: §14 `capture-inbox`; §5, §6, §8; P2, P6 — a
conscious expansion of proposal §14, see the note after FR-S16. §Owner flags F-5.)

- **AC-S15.1** `skills/workflow/capture-discussion/open-thread/SKILL.md` exists,
  `name: open-thread`, `metadata.version: 1.0.0`, following the SKILL.md
  conventions; it is a single auto-style skill (no `-interactive` variant) per
  AC-S0.4.
- **AC-S15.2** Its body instructs opening a local thread — writing the thread
  folder, the one seed (per the seed format, FR-D7.2), and the `ledger.md` lifecycle
  ledger (with an initial `tier:` line, FR-D4.16–21) — not an inbox item.
- **AC-S15.3** Its body instructs the two input modes **within the one skill**: a
  brand-new idea (`External: none` or a user-supplied tracker URL) OR an existing
  tracker ticket (the ticket's title/body seed the trigger narrative and its URL
  becomes the seed's `External:` line). Splitting by input form is rejected — the
  suite's `plan-*`/`spec-*` skills already take "raw idea OR issue URL" within one
  skill. (Operationalizes §8's ticket↔thread bridge.)
- **AC-S15.4** When `open-thread` links an existing or just-created ticket, its body
  instructs posting the one permalink backlink comment on that ticket (FR-D6.4).
  (Restores lossless gap LM-G2.)
- **AC-S15.5** `capture-inbox` is moved to `skills/deprecated/capture-inbox/` (kept
  on disk so existing installs do not break), and no V2 spine path references the
  inbox.

#### FR-S16 — NEW: `open-ticket` (remote tracker ticket)

`open-ticket` creates a **remote** tracker ticket from a brand-new idea — the one
genuinely-separate operation (remote output, tracker dependency, the only
tracker-touching skill). (Realizes: §14 `capture-inbox` (expanded); §8; §13
preflight; P6; LM-G1, LM-G2.)

- **AC-S16.1** `skills/workflow/capture-discussion/open-ticket/SKILL.md` exists,
  `name: open-ticket`, `metadata.version: 1.0.0`, following the SKILL.md
  conventions; it is a single auto-style skill (no `-interactive` variant) per
  AC-S0.4.
- **AC-S16.2** Its body instructs creating a remote tracker ticket from a brand-new
  idea — a one-time creation, never the ongoing sync §8 forbids; it is the only
  skill that writes to the tracker.
- **AC-S16.3** Its body applies the **prerequisite-preflight rule** (AC-S0.5,
  FR-D5.7): it checks the tracker CLI/API is available **first** and fails cleanly
  with a clear warning if the prerequisite is missing. (Restores lossless gap LM-G1.)

> **Note — conscious expansion of proposal §14.** Proposal §14 expressed the
> `capture-inbox` replacement as a single skill ("seed-capture") that "writes a seed
> for a new/future thread, or a tracker ticket." This spec realizes that capability
> as **two** skills — `open-thread` (local) and `open-ticket` (remote) — plus the
> thread-from-ticket input mode on `open-thread`. It is a deliberate spec-level
> structural decision of the same kind as the nine-doc scope (§Owner flags F-10a):
> it separates a filesystem write from a tracker-API write (different dependencies,
> the §8 boundary, the preflight requirement on only the ticket path), and the
> thread-from-ticket input mode operationalizes §8's ticket↔thread bridge. It
> extends §14's capability without contradicting the frozen proposal. The clean
> ordering is ticket-first (or pre-existing) so the seed's `External:` link is baked
> in at creation; a future skillrouter `open` skill with `--local`/`--remote`/
> `--from-ticket` flags is the natural later collapse (§Out of scope).

#### FR-S17 — `take-snapshot`, `brief-the-recipient`, `consult-the-expert`, `report-to-the-owner`, `afk-exploration`, `the-librarian`, `meta-prompting`

The §14 "all"-row skills — tier awareness + thread-V2 paths where they touch
threads; likely no deeper change. (Realizes: §14 "all" + last two rows.)

- **AC-S17.1** Each body that currently references V1 thread paths, the inbox, or
  stored status is updated to the V2 thread-layout paths + frontmatter contract;
  each that opens a thread gains tier awareness.
- **AC-S17.2** A skill in this set whose body genuinely needs no change is left
  unchanged and not bumped; one that changes is bumped. (The per-skill
  determination is a bounded DoF — apply where the body touches threads/status;
  §DoF.)

---

### FR-R — repo upkeep (deliverable B, per AGENTS.md)

(Realizes: AGENTS.md "When adding a new skill" / commit-scope / marketplace rules.)

#### FR-R1 — `README.md`

- **AC-R1.1** `open-thread` and `open-ticket` entries are added under "Capture &
  Discussion", each with its description and install snippet, linking the full
  nested path.
- **AC-R1.2** A `review-lossless-mapping` entry is added under "Review".
- **AC-R1.3** `capture-inbox` is moved from "Capture & Discussion" to the "Retired
  skills" section (path updated to `skills/deprecated/capture-inbox`).
- **AC-R1.4** Any skill whose `description` frontmatter changed has its README
  description updated to match.

#### FR-R2 — `.claude-plugin/marketplace.json`

- **AC-R2.1** `./skills/workflow/capture-discussion/open-thread` and
  `./skills/workflow/capture-discussion/open-ticket` are added to the
  `JeisKappa-capture-discussion` plugin's `skills` array.
- **AC-R2.2** `./skills/workflow/review/review-lossless-mapping` is added to the
  `JeisKappa-review` plugin's `skills` array.
- **AC-R2.3** `./skills/workflow/capture-discussion/capture-inbox` is removed from
  `JeisKappa-capture-discussion` and added to `JeisKappa-deprecated`.
- **AC-R2.4** The `plugins` array stays sorted alphabetically by `name` with
  `JeisKappa-deprecated` last (unchanged by this edit).

#### FR-R3 — `.vscode/settings.json`

- **AC-R3.1** `open-thread`, `open-ticket`, and `review-lossless-mapping` are added
  to `conventionalCommits.scopes`, preserving alphabetical order.
- **AC-R3.2** `capture-inbox` **remains** in the scopes array (the folder still
  exists, under `deprecated/`), consistent with `discussion-loop` /
  `review-decision-document` already being present.

#### FR-R4 — `AGENTS.md` (required)

- **AC-R4.1** AGENTS.md gains a "V2 Workflow Conventions" pointer section to
  `docs/workflow/v2/` — a pointer, not a duplication of the rules, mirroring the
  existing "V1 Workflow Conventions" pointer — that marks **V2 the active ruleset
  for new threads**, with one line noting **V1 remains the grandfathered reference
  for pre-V2 threads** (never migrated). This is an implementation-phase action,
  added once `docs/workflow/v2/` exists. (Realizes: §16; P21; §Owner flags F-10b.)

#### FR-R5 — `README.md` overview prose, `AGENTS.md` Layout block, and cross-skill V1 references

*(Added 2026-06-21 by owner-approved post-approval amendment (§4); recorded in the decision log as SR-P10. Closes a gap surfaced during Phase-3 implementation: FR-R1–R4 covered the skill-index mechanics but not the repo docs' workflow-overview prose, which still presented the workflow as V1 and described the removed inbox. Realizes: §16 — a V2-consistent repo.)*

- **AC-R5.1** `README.md`'s overview prose describes V2, not V1: the opening line, the "Toolbox Model", and the "Layered Workflow Map" no longer frame the workflow as "V1" and no longer list an inbox module / `capture-inbox` / `inbox/{open,processed,dropped}/` as a live part of the workflow (V2 removes the inbox; status is derived). The map reflects the V2 layout (the lifecycle ledger, lineage folders, `open-thread`/`open-ticket`).
- **AC-R5.2** No active-skill README entry describes its skill as producing "V1"/"v1" artifacts or writing to "the active V1 thread's" folder: the propose/spec/plan/implement entries (and any others) read as V2 (lineage-folder outputs, the V2 status model), matching the skills' actual V2 behavior. A grep of `README.md` for "V1"/"v1" returns only legitimate historical/grandfathered mentions (e.g. the `capture-inbox` retired entry, "grandfathered V1 threads"), never a description of the *active* workflow.
- **AC-R5.3** The `AGENTS.md` "Layout" block reflects the V2 skill set: `capture-discussion/` lists `open-thread`, `open-ticket`, `discussion`, `seeded-discussion` (no `capture-inbox`); `review/` includes `review-lossless-mapping`; `capture-inbox` is shown under the `deprecated/` bucket. No other hand-maintained AGENTS section is altered by this AC.
- **AC-R5.4** No active `README.md` note cites a retired V1 decision ID as current guidance: the `the-fool` / `verify-*` notes that referenced V1 `D…` IDs are reworded, or their stale `D…` citations removed.

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
| **new:** lossless-mapping review | FR-S10 | new (single auto-mode skill) |
| `plan-loose-*`, `plan-strict-*` | FR-S4 | all retained, changed |
| `adjust-plan-granularity-*` | FR-S5 | retained, output-mechanics change |
| `implement-*` | FR-S11 | changed |
| `merge-artifacts-*` | FR-S12 | changed |
| `finish` | FR-S13 | substantive new behavior |
| `whats-next` | FR-S14 | changed (derived-status reader) |
| `capture-inbox` | FR-S15, FR-S16 | replaced by `open-thread` + `open-ticket`; `capture-inbox` deprecated |
| `spec-*` | FR-S3 | changed |
| `take-snapshot`, handoff, research | FR-S17 | "all"-row only |
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
| Prerequisite preflight (CLI-backed skills) | `tiers.md` / FR-D5.7 + FR-S0.5 | §13 |
| Tracker integration incl. backlink + commit/PR reference | `tracker-integration.md` / FR-D6 (incl. AC-D6.4–.5) | §8 |
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
| `AGENTS.md` V2 pointer (required) | FR-R4 |
| README overview prose / AGENTS Layout block / cross-skill V1 refs (amendment) | FR-R5 |

---

## 3. Skill baseline versions (AC anchor for "version bumped")

Baselines as of this spec, for the FR-S "version bumped above baseline" ACs. New
skills (FR-S10 `review-lossless-mapping`, FR-S15 `open-thread`, FR-S16
`open-ticket`) have no baseline and start at `1.0.0`.

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
needs a fact the proposal left open, it is a pinned §15 DoF (now resolved in §Owner
flags) or a DoF, not an invention.

| FR | Proposal § | Decision log | Other source |
|---|---|---|---|
| FR-D0 | §16, §17, §5 | P21 | V1 doc shape |
| FR-D1 | §16 | P21 | V1 README; AGENTS.md (self-containment); handoff |
| FR-D2 | §3, §4, §5, §6 | P1, P4, P12, P17, P21 | — |
| FR-D3 | §3, §16 | P11, P18 | — |
| FR-D4 (core) | §4, §5 | P2, P3, P5, P7, P8, P19, P20; SR-P9 (status-map) | — |
| FR-D4.16–21 (ledger) | §4, §7, §15 | P2, P21; SR-P2 (→ `ledger.md`) | dogfooded `ledger.md` |
| FR-D5 | §7, §13 | P10, P15; SR-P8 | LM-G1 (preflight) |
| FR-D6 | §8 | P2; SR-P8 | LM-G2 (backlink, commit/PR ref) |
| FR-D7 | §9, §6, §5 | P6, P14, P16 | — |
| FR-D8 | §11 | P7 | — |
| FR-D9 | §10, §13 | P7, P9 | — |
| FR-S0 | §14, §13 | SR-P3 (semver), SR-P5 (guardrail) | AGENTS.md (version bump, self-containment); LM-G1 (preflight) |
| FR-S1 | §14, §11, §10, §4 | P5, P7 | — |
| FR-S2 | §14, §4 | P3 | — |
| FR-S3 | §14, §9, §4 | P3, P9, P14 | — |
| FR-S4 | §14, §4 | P6 | — |
| FR-S5 | §14 | P6 | — |
| FR-S6 | §14, §10 | P7 | — |
| FR-S7 | §14, §10 | P7 | — |
| FR-S8 | §14, §9 | P6 | — |
| FR-S9 | §14, §9, §10 | — | — |
| FR-S10 | §14, §10 | P9; SR-P4 (auto-only) | single-mode suffix convention |
| FR-S11 | §14, §9 | — | — |
| FR-S12 | §14, §3 | P4 | — |
| FR-S13 | §14, §9, §8, §4, §5 | P16 | LM-G2 (backlink) |
| FR-S14 | §14, §4, §5 | P2, P3 | — |
| FR-S15 (open-thread) | §14, §5, §6, §8 | P2; SR-P6 | repo deprecation pattern; LM-G2 (backlink) |
| FR-S16 (open-ticket) | §14 (expanded), §8, §13 | SR-P6 | LM-G1 (preflight) |
| FR-S17 | §14 | — | — |
| FR-R1–R3 | §16 | — | AGENTS.md "When adding a new skill" |
| FR-R4 | §16 | P21; SR-P7 | AGENTS.md V1 pointer pattern |

In this table, bare `P<n>` references the **proposal** decision log
(`proposals/001/discussions/260612201354Z-proposal-v1-review-findings-decision-log.md`,
P1–P21); `SR-P<n>` references the **spec-review-and-flags** decision log
(`specs/001/discussions/260620171014Z-spec-review-and-flags-decision-log.md`, P1–P9)
that produced `version: 2`; `LM-G<n>` references the disposed lossless-mapping review
(`specs/001/reviews/260620162523Z-spec-lossless-mapping-review.md`).

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
3. **The provenance-line format** in V2 docs (AC-D0.2) — analogous to V1's
   `**Codifies:** D…` line; presence required, format free.
4. **Exact seed format** beyond its two mandatory lines (`External:` + 1–5 line
   trigger). (Proposal §15.)
5. **Tier label names** (numbers are normative; chore/patch/feature/initiative are
   suggestions). (Proposal §15.)
6. **Whether plan-review outcomes 3 and 4 merge** into one (the spec needs only
   "spec-fault routes to the human and fixes the spec"). (Proposal §15.)
7. **Whether the supersession forward-link uses a soft-keyword breadcrumb.**
   (Proposal §15.)
8. **Whether V2 docs/headers render a non-authoritative derived-condition word**
   for human legibility (latches-only is the default). (Proposal §15.)
9. **Exact frontmatter field spelling/syntax** for latches and disposition. The
   **shape is now pinned** — every latch/event nests under a `status:` map
   (AC-D4.9, AC-D4.11) — but the exact YAML spelling/syntax remains free, provided
   it is applied consistently across docs + skills. (Proposal §15; the map shape
   resolves §Owner flags F-8.)
10. **Per-skill applicability of the "all" row** to thread-agnostic deliverable
    skills (FR-S17): apply where the body actually touches thread paths/status;
    leave genuinely thread-agnostic skills unchanged.
11. **`implementation/` flat vs lineage folders.** Flat is pinned (AC-D2.10) per
    the proposal's stated default; revisiting if implementations multiply per
    thread is left open. (Proposal §15.)
12. **Implementation sequencing and commit batching** (which docs/skills first,
    one commit vs several) — left to the implementer / the plan phase.

Two items that earlier drafts listed here are now **decided** and no longer
degrees of freedom: the **semver bump level** (now honest per-skill semver,
AC-S0.2 — §Owner flags F-9) and **whether the lossless-mapping review needs an
interactive variant** (now auto-only, FR-S10 — §Owner flags F-4). The
**ledger-filename** and the **frontmatter-status shape** are likewise pinned (to
`ledger.md` and the `status:` map), so neither is a DoF; only their exact spelling
remains free (item 9).

---

## 6. Out of scope (deferred, with reasons)

Named so a reviewer sees they were considered, not missed. Each is either an
external action or a deliberately deferred mechanism.

- **Freeze-guard tooling** (pre-commit hook / CI job). The docs specify the rules
  the guard enforces (FR-D4.13–15); building the tooling is deferred. The proposal
  commits to the guard as V2's one mechanical guard but leaves its mechanism a §15
  DoF; it is neither a doc nor a skill, so it is outside §16 items 2–3.
  **Consequence (eyes-open):** until the guard is built, V2's immutability/freeze is
  **convention-enforced only** — nothing mechanically stops a confused agent from
  editing a frozen artifact; the rules are fully specified, so the guard is buildable
  whenever the pain is real. (Resolved — §Owner flags F-2.)
- **The future status CLI / materialized `state.json` projection.** `whats-next`
  gains the derived-status reader behavior (FR-S14); the CLI itself and any
  materialized projection are deferred per §5 ("buys nothing today").
- **PR-enforcement CI gate.** §13/P10 ship the recommendation; the
  tier-reading CI gate is a deferred option.
- **Postmortem and decision-index templates.** §13 builds them on first trigger;
  not now.
- **Spec-creation UX orchestration** (the guided discuss → spec → review → discuss →
  update flow as one orchestration layer over the stages). A real need, but the
  proposal defers it until V2 stabilizes so today's seams don't get baked into it
  (§13 "On trigger"). (Restores lossless gap LM-G3.)
- **`EXAMPLE-WORKFLOW/` retirement.** An external-workspace action, not a step in
  this repo's rollout (§16 item 4; P13).
- **skillrouter unification and variant rationalization.** Deferred to the
  skillrouter project as a postponed future-release direction, covering two related
  collapses: (1) **flag-unification** of mode/variant pairs behind a single
  flag-differentiated skill (e.g. `plan-loose-*`/`plan-strict-*`, and the
  `open-thread`/`open-ticket` pair → an `open` skill with `--local`/`--remote`/
  `--from-ticket` flags); and (2) the deeper **"interactive ≈ discussion-loop + auto"
  redundancy** — that an `-interactive` variant is largely a discussion loop followed
  by the `-auto` variant, motivated by the maintainer's actual discussion-loop-first
  workflow (a discussion loop to clarify, then `*-auto` from the proposal + decision
  log, rather than `*-interactive`). No variant changes ship now; existing pairs are
  retained as independent skills with minimal investment, and the AC-S0.4 guardrail
  keeps **new** skills auto-only, so nothing built now blocks the later collapse.
  (P6; SR-P5.)
- **V1 thread migration.** V1 threads are grandfathered — never migrated (§16; P21).

---

## 7. Owner flags (resolved)

The flags this spec originally raised for owner review are all **resolved**. Each
resolution was settled in the spec-review-and-flags discussion loop and recorded in
`specs/001/discussions/260620171014Z-spec-review-and-flags-decision-log.md`
(decisions P1–P9 of that log; cited below as `SR-P<n>`). The Draft spec was revised
in place to reflect them — this is `version: 2`. No resolution re-opens a frozen
proposal decision; each fills a declared gap.

- **F-1 — Lifecycle ledger filename. Resolved (SR-P2).** The per-thread ledger is
  renamed `lifecycle.md` → **`ledger.md`** at the thread root, freeing the basename
  `lifecycle.md` for the rules doc (`docs/workflow/v2/lifecycle.md`) and removing the
  data-file-vs-rules-doc collision; the line grammar is unchanged (AC-D3.4, AC-D4.18,
  AC-D4.19). The thread's own ledger file is renamed to match.

- **F-2 — Freeze-guard tooling. Resolved (SR-P9), deferred eyes-open.** The docs
  fully specify the guard's rules (FR-D4.13–15); **building** the tooling stays out
  of scope (§Out of scope). *Consequence:* until the guard is built, immutability/
  freeze is **convention-enforced only** — nothing mechanically blocks a confused
  agent from editing a frozen artifact; the rules are specified, so the guard is
  buildable anytime.

- **F-3 — Re-`deferred` permitted. Resolved (SR-P9).** A re-`deferred` reason-update
  is allowed, per the §4 guard's deferred branch (AC-D4.14, AC-D4.21).

- **F-4 — Lossless-mapping review name + variant. Resolved (SR-P4).** A **single
  auto-mode skill `review-lossless-mapping`** (no `-interactive` variant; single-mode
  skills take no suffix). The human-judgment step lands in the follow-on discussion
  loop, so an interactive variant would only re-implement it (FR-S10, AC-S0.4).

- **F-5 — `capture-inbox` replacement. Resolved (SR-P6).** Replaced by **two** skills
  — `open-thread` (local) and `open-ticket` (remote) — superseding the single-skill
  "seed-capture" naming question; `capture-inbox` moves to `skills/deprecated/`
  (FR-S15, FR-S16). A conscious expansion of proposal §14 (see the note after FR-S16).

- **F-6 — `whats-next` vs the CLI. Resolved (SR-P9).** The skill gains the
  derived-status reader behavior now (FR-S14); the standalone CLI / materialized
  projection is deferred (§Out of scope).

- **F-7 — `discussion` skill version reference. Resolved (SR-P9), clarification.** The
  decision-log "update past logs on explicit request" behavior lived in the
  **deprecated** `discussion-loop` (v1.5.0), not the active `discussion` (v1.0.2);
  this spec encodes the rule (records immutable-by-default + marked owner correction)
  in the active `discussion`/`seeded-discussion` (AC-S1.4); the deprecated skill stays
  out of scope. No action.

- **F-8 — Frontmatter status model. Resolved (SR-P9), refined.** Lifecycle latches
  live under a **`status:` map** (event → stamp), never as loose top-level keys and
  never collapsed to a single value; the frontmatter contract is the two keys
  `version` + `status:`, and the condition is always derived from `status` by
  precedence (AC-D4.4, AC-D4.9, AC-D4.11; per-artifact mentions updated — e.g. review
  `status: { disposed, disposition, rationale }`, AC-D9.2; proposal/spec latches under
  `status.`, AC-S2.2/AC-S3.2). Exact YAML spelling stays a §15 DoF (§DoF item 9).

- **F-9 — Version-bump semver level. Resolved (SR-P3).** **Honest per-skill semver** —
  MAJOR where a skill's output/behavior contract changes, MINOR for additive-only, no
  bump if unchanged (AC-S0.2). Most spine skills land at a MAJOR cutover where their
  contracts genuinely break.

- **F-10 — Doc-set scope + AGENTS.md pointer. Resolved.** *(a, SR-P1)* the **nine-doc**
  `docs/workflow/v2/` set is confirmed ("includes" in §16 is non-exhaustive; the V1
  set is already multi-doc; decomposition stays a DoF). *(b, SR-P7)* the AGENTS.md "V2
  Workflow Conventions" pointer is now a **required** edit (FR-R4), marking V2 the
  active ruleset for new threads and V1 the grandfathered reference for pre-V2 threads.

---

## 8. Self-review (authoring check, version 2)

- **Coverage of §14:** every §14 row maps to an FR-S (§2.1) — confirmed complete,
  including the "all" row (FR-S0/FR-S17), the new skill (FR-S10), the two-skill
  replacement (FR-S15 `open-thread` + FR-S16 `open-ticket`), and the substantive
  `finish` change (FR-S13).
- **Coverage of the doc set:** every V2 rule-area in the build brief maps to an
  FR-D (§2.2) — confirmed; the ledger's pinned filename (`ledger.md`)/grammar and the
  freeze model both have homes in the `lifecycle.md` rules doc; the restored
  preflight rule (FR-D5.7/FR-S0.5) and the tracker backlink + commit/PR conventions
  (FR-D6.4–.5) each have rule-area rows.
- **Lossless authoring:** every FR carries a traceability tag (§4); no requirement
  originates outside the proposal + the two decision logs + named repo conventions;
  each build-needed gap is a pinned §15 DoF (item 9), a DoF in §5, or a resolution
  recorded in §Owner flags — nothing smuggled. The three lossless-mapping gaps
  (LM-G1/G2/G3) are restored (preflight, tracker backlink + commit/PR ref, deferred
  spec-creation UX).
- **No frozen-decision re-opening:** the spec realizes P1–P21 and the proposal as
  written, and the spec-review-and-flags decisions SR-P1–P9; it does not contradict
  the frozen proposal. The two-skill `capture-inbox` replacement and the nine-doc
  scope are recorded as conscious *expansions* of §14/§16, not contradictions.
- **Internal consistency:** no AC contradicts another; the status-map model is
  applied uniformly (AC-D4.3/.4/.8/.9/.11, AC-D9.2, AC-S2.2/AC-S3.2, AC-S13.1); the
  ledger filename is `ledger.md` everywhere it is named (AC-D3.4, AC-D4.18, AC-S13.2,
  AC-S15.2); the FR-S renumber (old FR-S16 → FR-S17) is reflected in §2.1, §4, §5,
  and here. No owner flag remains open — all of F-1…F-10 are resolved (§Owner flags).
- **Machine-checkability:** every AC is a single read/grep/parse check against one
  file (file exists / doc states R / skill instructs Z / version > baseline / array
  contains entry).
- **Dogfooding:** frontmatter is `version: 2` only, with no `status:` map yet (Draft
  derived, no `status.approved` latch); lineage folder `specs/001/`; thread-relative
  within-thread paths; `YYMMDDHHMMSSZ` timestamps; status-map frontmatter model.

The lossless-mapping review against the proposal + decision log has been run and
disposed (`accepted`); `version: 2` completes that review→revise cycle. The next
step for this artifact is the **owner's `status.approved` latch**, then
implementation.
