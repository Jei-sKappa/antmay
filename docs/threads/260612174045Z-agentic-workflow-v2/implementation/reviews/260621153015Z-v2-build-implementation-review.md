---
status:
  disposed: 260621155003Z
  disposition: accepted
---

# Implementation Review — Modular Agentic Workflow V2 build vs the approved spec

Independent VERIFY-stage review of the committed V2 build (branch `workflow-v2`)
against its approved build contract. Every acceptance criterion in the spec was
checked against the actual files on disk — file existence and token/version strings
by grep, substantive "doc states rule R / skill instructs behavior Z" ACs by full
reads. The linchpin docs and skills (the lifecycle derivation function, the ledger
grammar, and `finish`) were read directly by the reviewer, not accepted on summary.

## References

Within-thread references are thread-relative; deliverables outside the thread are
repo-relative; none absolute.

- The contract under verification — spec `version: 2`, Approved: `specs/001/spec.md`
- The build plan (FR→file mapping, context only): `plans/001/plan.md`
- Deliverable A — the nine V2 reference docs: `docs/workflow/v2/README.md`,
  `thread-layout.md`, `filename-grammar.md`, `lifecycle.md`, `tiers.md`,
  `tracker-integration.md`, `spine.md`, `discussions.md`, `reviews.md`
- Deliverable B — skills: `skills/workflow/**/SKILL.md` (all spine + overlay
  skills), the three new skills `skills/workflow/capture-discussion/open-thread`,
  `skills/workflow/capture-discussion/open-ticket`,
  `skills/workflow/review/review-lossless-mapping`, and the relocated
  `skills/deprecated/capture-inbox/SKILL.md`
- Repo upkeep: `README.md`, `.claude-plugin/marketplace.json`,
  `.vscode/settings.json`, `AGENTS.md`
- Repo conventions used to judge the "per AGENTS.md" ACs: `AGENTS.md`

## Verdict

**PASS.** Every acceptance criterion in the spec — FR-D0–D9, FR-S0–S17, FR-R1–R5 —
holds on disk. No gaps were found in any FR group. One non-blocking advisory
(prose use of "V1"/"V2" in some skill bodies) is recorded in Open Questions; it is
outside every AC and breaks no deliverable, so it does not affect the verdict.

## Findings

### FR-D — the `docs/workflow/v2/` reference-doc set (deliverable A)

**Set-wide (FR-D0): all satisfied.**
- AC-D0.1 — `docs/workflow/v2/` contains exactly the nine named files (README,
  thread-layout, filename-grammar, lifecycle, tiers, tracker-integration, spine,
  discussions, reviews); `git diff main...HEAD -- docs/workflow/v1/` is empty (no V1
  doc modified).
- AC-D0.2 — every doc carries a provenance line on line 2 (`**Realizes:** …`),
  confirmed for all nine.
- AC-D0.3 — no V2 doc begins with a `---` block; line 1 of each is a `#` heading. No
  lifecycle/status YAML frontmatter anywhere in the set.

**FR-D1 `README.md` (AC-D1.1–1.5): all satisfied.** Source-of-truth statement
(README.md:5); reading order links each of the other eight docs and all resolve
(README.md:14-41); "V2 is a new ruleset, does not edit/replace V1; pre-V2 threads
grandfathered, never migrated" (README.md:45-46); docs immutable by convention
(README.md:53); self-containment relationship — skills restate inline, do not link
these docs at runtime (README.md:61-62).

**FR-D2 `thread-layout.md` (AC-D2.1–2.10): all satisfied.** Thread root + folder set
incl. root ledger, `seed/`+`discussions/`, lineage-holding `proposals/`/`specs/`/
`plans/`, `implementation/`, gitignored `.wip/` (lines 14, 26-51); lineage grammar
`NNN[-<desc>]/` with the "no type suffix / no `v<N>` folder names / path is the unit
of reference" rules (61-82); records-attach-to-target + one-level nesting cap
(86-94); ledger at thread root not in `seed/` (98); `seed/` three-kinds rule, no
`reviews/` (106-116); inbox + `open/processed/dropped` removed (118-121);
lineages-vs-variants (128-140); path-reference rule (144-149); on-demand creation
(153-156); flat `implementation/` with the verbatim "if implementations multiply per
thread" revisit condition (160-163).

**FR-D3 `filename-grammar.md` (AC-D3.1–3.6): all satisfied.** UTC stamp grammar +
"every timestamp marks an event", no extended dates / no creation-date fields
(12-22); versioned form `<type>.md`, no stamp/no `v<N>`, version in frontmatter, V1
machinery removed (26-45); record form unchanged (48-64); ledger fixed-name pointer —
names `ledger.md` at the thread root AND delegates the line grammar to
`./lifecycle.md` (78-82, satisfies AC-D3.4); token vocab keep/add/remove with
`inbox-item` + `review-finding` removed, list non-exhaustive (86-104); shrunk
ambiguous-reference rule (106-123).

**FR-D4 `lifecycle.md` (AC-D4.1–4.21): all satisfied (reviewer-read).** Two artifact
classes + ledger (15-22); record immutability + marked owner correction (26-32);
per-type latch table under `status:` (57-61); the authoritative condition-derivation
function verbatim by precedence — `status.implemented`→Implemented; else
`status.approved`→Approved (+"has open findings" if undisposed review); else
undisposed review→In Review; else Draft, "never written down anywhere" (68-77);
sticky latches (81-84); `version` review-cycle counter (95-99); proposal/spec freeze
asymmetry + `rejected` artifact-level latch (101-116); body-vs-frontmatter, set-once
disposition (118-131); the two-key frontmatter contract — `version` + a `status:`
**map**, latches never loose/never collapsed, a record with no lifecycle status
carries no frontmatter, derivables never stored, lineage frontmatter still banned
(135-160); pinned map-model field defaults, spelling free (162-182); when-an-edit-
needs-a-record table (189-193); event sourcing with `STATE.md`/`events.jsonl`
rejected and `state.json` merely deferred (199-221); two-layer freeze (225-232);
guard rules — `closed:`→reject all, `deferred`→reject all except a ledger-only
`resumed`/`deferred` append, pre-image check (236-246); prevention-not-detection,
content-hash rejected, mechanism out of build (248-258); ledger holds only tier +
disposition with the verbatim litmus test (270-282); append-only (284-289); pinned
filename `ledger.md` (291-296); pinned line grammar `<event> @ <YYMMDDHHMMSSZ> —
<justification>` + the five events (298-318); disposition vocabulary + the negations
(no `open`, no `implemented` disposition, no bare `closed`, no `reopened`) (331-351);
re-`deferred` permitted (353-357).

**FR-D5 `tiers.md` (AC-D5.1–5.7): all satisfied.** Four tiers + entry criteria +
required artifacts (12-17); normative numbers / suggested names (22-27); three safety
rules (32-41); tier-0-leaves-no-trace + behavior-changing dep bump is tier 1 (45-51);
per-tier Definition of Done incl. lossless-mapping recommendation (57-62); tier-scaled
PR discipline + deferred CI option (66-78); prerequisite-preflight practice citing
`open-ticket` (82-89).

**FR-D6 `tracker-integration.md` (AC-D6.1–6.5): all satisfied.** Three layers distinct
by granularity/cardinality/existence (12-24); single owner, never the filesystem,
never a second tracker (28-37); `External:` join point, single finish handshake,
`External: none` allowed at tier 0–1 (41-50); one-comment permalink backlink posted by
`open-thread` and/or `finish` (54-58); commit/PR reference convention (62-65).

**FR-D7 `spine.md` (AC-D7.1–7.12): all satisfied.** Spine + all-stages-optional/tier-
gated (4, 12); seed format (title + `External:` + 1–5 line trigger), frozen, no owner
field (21-33); supersession optional forward-link (42-46); proposal optional/tier-3
(57); spec is the last human-approved artifact, keeps name, two new obligations
(66-75); lossless authoring constraint at decision/assumption unit (79-81); plan
autonomy default-not-law (89-93); plan as disposable compiler-IR, no stored status
(98-101); four-outcome mode-agnostic adherence review, outcomes 3&4 route to human and
fix the spec, never patch the plan (106-118); implement report record + follow-up
routing (122-132); verify against the spec's ACs, never need to review the plan
(137-139); finish sets `status.implemented` + appends `closed: done` in one action,
closes ticket, ensures backlink, guard never sets status (143-156).

**FR-D8 `discussions.md` (AC-D8.1–8.9): all satisfied.** Two modes (12-17);
recommendation-first legitimate (21-24); lettered options (29-30); target-scoped
P-numbering + off-target rule (33-36); context-rich headers (41-42); optional pause
(46-49); peer framing (53-55); write-only-if-useful (59-61); discussion no longer owns
disposition, is the optional linked `rationale` (64-69).

**FR-D9 `reviews.md` (AC-D9.1–9.7): all satisfied.** Placement in target's `reviews/`,
no open/processed lifecycle (11-14); disposition in the review's own frontmatter
`status:` map, set-once, open-by-parse (17-37); references-first report format with
the full section order (42-57); lossless-mapping review definition — decision/
assumption unit, DoF pressure valve, two-section output, empty=pass (59-77); cadence
(81-84); consistency-with-decision-logs in the standard review (87-90); tier-3
adversarial reviews against approved specs (93-95).

### FR-S — skill changes (deliverable B)

**Cross-cutting FR-S0 (AC-S0.1–0.5): all satisfied across every touched skill.**
- AC-S0.1 — every thread-touching skill uses V2 lineage-folder / `discussions/` /
  `reviews/` / `implementation/` paths; thread-opening skills read `ledger.md` (tier +
  disposition) and propose the tier; status-bearing skills use the frontmatter status
  contract.
- AC-S0.2 — honest per-skill semver verified against the §3 baselines: all changed
  spine skills bumped to `2.0.0` (a genuine MAJOR cutover — lineage paths + status-map
  latches + inbox removal break their contracts), strictly above every baseline (incl.
  the `1.1.1` baselines for adjust-plan-granularity-auto, review-spec-auto, the four
  review-implementation/code skills, implement-auto, implement-plan-auto,
  merge-artifacts-auto, finish, whats-next). New skills at `1.0.0`.
- AC-S0.3 — repo-wide grep of active skill bodies for `docs/workflow/v[0-9]` returns
  zero hits; each changed/new skill restates its relied-on V2 rules inline.
- AC-S0.4 — the three new skills (`open-thread`, `open-ticket`,
  `review-lossless-mapping`) are each single auto-only skills with no `-interactive`
  sibling; existing variant pairs retained unchanged.
- AC-S0.5 — `open-ticket` applies the prerequisite-preflight rule (tracker CLI/API
  checked first, clean failure if missing); `finish`'s ticket step preflights too.

**Per-skill FRs — all satisfied** (version → confirmed `> baseline`, or `== 1.0.0`
for new skills):
- FR-S1 `discussion`, `seeded-discussion` (both 2.0.0) — AC-S1.1–1.5: output to the
  target's `discussions/` (genesis → `seed/discussions/`) with stamped record
  filenames; two modes/lettered options/target-scoped P-numbering/context-rich
  headers/optional pause/peer framing/write-only-if-useful; optional `rationale`,
  no longer owns disposition; records-immutable-by-default + marked owner correction.
- FR-S2 `propose-auto`, `propose-interactive` (both 2.0.0) — AC-S2.1–2.4:
  `proposals/NNN[-<desc>]/proposal.md`; `status.approved`/`status.rejected` nested
  under the `status:` map ("never as a loose top-level key"), set-once, condition
  derived; tier awareness (reads ledger; proposal stage is tier-3).
- FR-S3 `spec-auto`, `spec-interactive` (both 2.0.0) — AC-S3.1–3.6:
  `specs/NNN[-<desc>]/spec.md`; `status.approved` then `status.implemented` under the
  map; required "Degrees of freedom" section; machine-checkable AC (FR/AC + coverage +
  traceability) at tier ≥2; lossless authoring constraint at decision/assumption
  granularity with the discuss-or-mark-DoF escape.
- FR-S4 plan family ×4 (all 2.0.0) — AC-S4.1–4.4: `plans/NNN[-<desc>]/plan.md`;
  alive-in-place editing, plan carries no stored status and no `version` header;
  self-review step retained; V2 paths + tier awareness.
- FR-S5 `adjust-plan-granularity-*` (both 2.0.0) — AC-S5.1–5.2: only V2 change is
  output-mechanics (edit the living plan in place, record-backed); V2 paths.
- FR-S6 `review-proposal-*` (both 2.0.0) — AC-S6.1–6.5: output to the proposal's
  `reviews/`; references-first format; consistency-with-decision-logs check;
  disposition via frontmatter status map.
- FR-S7 `review-spec-*` (both 2.0.0) — AC-S7.1–7.5: spec's `reviews/`; references-first
  with thread-relative paths; decision-log consistency check added; open/processed
  lifecycle language removed, disposition via frontmatter.
- FR-S8 `review-plan-*` (both 2.0.0) — AC-S8.1–8.4: four-outcome mode-agnostic
  adherence review; honors the spec's DoF section; outcomes 3&4 (spec-fault) route to
  the human and fix the spec, never patch the plan; disposition via frontmatter.
- FR-S9 `review-implementation-*` + `review-code-*` ×4 (all 2.0.0) — AC-S9.1–9.4: all
  anchor/verify "right" to the spec's acceptance criteria, NOT the plan; output to
  flat `implementation/reviews/`; disposition via frontmatter. (`review-code-*` are
  quality passes that *anchor* correctness to the spec's ACs while delegating
  fidelity coverage to the implementation reviews — this matches FR-S9's intent that
  correctness be anchored to the spec's ACs and not the plan.)
- FR-S10 NEW `review-lossless-mapping` (1.0.0) — AC-S10.1–10.4: exists,
  `name: review-lossless-mapping`, single auto-only (body states "no interactive
  variant"); implements the decision/assumption bar + DoF pressure valve + two-section
  output (empty=pass); cadence (tier ≥2 recommendation, before `approved`; on demand)
  + frontmatter disposition; references-first + thread-relative paths.
- FR-S11 implement family ×6 (all 2.0.0) — AC-S11.1–11.4: each emits an immutable
  implementation-report record capturing deviations+justification/surprises/problems/
  follow-ups; follow-up routing (future-thread seeds, or tier-3 next-phase
  `discussions/`); V2 paths + tier awareness.
- FR-S12 `merge-artifacts-*` (both 2.0.0) — AC-S12.1–12.3: no version-file bump;
  authors/revises the canonical `NNN/<artifact>.md` (record-backed in place if alive,
  new thread if frozen); rationale in a decision log; competing drafts in `.wip/`,
  only the canonical artifact emitted.
- FR-S13 `finish` (2.0.0) — AC-S13.1–13.6 (reviewer-read): sets `status.implemented`
  under the map, set-once (SKILL.md:52-66); appends `closed: done` to `ledger.md` in
  the same action, in the pinned line grammar (68-84); updates living docs (48-50);
  closes the ticket (86-94); ensures exactly one permalink backlink (FR-D6.4),
  posting at finish if `open-thread` did not, no double-post (91); guard never sets
  status (98).
- FR-S14 `whats-next` (2.0.0) — AC-S14.1–14.3: reads the ledger (tier + disposition)
  and folds spine position + open findings to answer what now / next / closed; states
  it is the derived-status reader (CLI precursor); the CLI/materialized projection is
  not built here.
- FR-S15 NEW `open-thread` (1.0.0) — AC-S15.1–15.5: exists, `name: open-thread`,
  single auto-only; writes the thread folder + the one seed (per the seed format) +
  `ledger.md` with an initial `tier:` line, "never an inbox item"; two input modes in
  one skill (brand-new idea OR existing ticket); posts the one permalink backlink when
  linking a ticket; `capture-inbox` moved to `skills/deprecated/capture-inbox/` (clean
  `git` rename R100, content identical) and no V2 spine path references an inbox (all
  active-skill `inbox` strings are negations — "there is no inbox", "never an inbox
  item").
- FR-S16 NEW `open-ticket` (1.0.0) — AC-S16.1–16.3: exists, `name: open-ticket`,
  single auto-only; creates a remote tracker ticket from a brand-new idea as a
  one-time creation (never the ongoing sync §8 forbids), the only tracker-writing
  skill; applies the prerequisite-preflight rule (checks the tracker CLI/API first,
  fails cleanly with a clear warning if missing).
- FR-S17 "all"-row skills — AC-S17.1–17.2: the seven deliverable/research/handoff
  skills (`take-snapshot`, `brief-the-recipient`, `consult-the-expert`,
  `report-to-the-owner`, `afk-exploration`, `the-librarian`, `meta-prompting`) are
  genuinely thread-agnostic — grep finds no V1 thread paths, no inbox, no stored-status
  references in any of them — so each is correctly left unchanged and unbumped (their
  `metadata.version` equals the §3 baseline; none appears in `git diff main...HEAD`).

### FR-R — repo upkeep (deliverable B, per AGENTS.md)

**FR-R1 `README.md` index (AC-R1.1–1.4): all satisfied.** `open-thread`
(README.md:50-56) and `open-ticket` (58-64) added under "Capture & Discussion" with
descriptions + install snippets + full nested-path links; `review-lossless-mapping`
under "Review" (306-312); `capture-inbox` moved to "Retired skills" with the path
`skills/deprecated/capture-inbox` (416); every skill whose frontmatter `description`
changed has a README entry whose text matches the current frontmatter verbatim
(checked for all 21 changed-description skills + the three new skills).

**FR-R2 `.claude-plugin/marketplace.json` (AC-R2.1–2.4): all satisfied.** Valid JSON;
`open-thread`/`open-ticket` in `JeisKappa-capture-discussion` (lines 8-9);
`review-lossless-mapping` in `JeisKappa-review` (99); `capture-inbox` removed from
capture-discussion and present under `JeisKappa-deprecated` (121); `plugins` is
alphabetical by `name` with `JeisKappa-deprecated` last.

**FR-R3 `.vscode/settings.json` (AC-R3.1–3.2): all satisfied.** Valid JSON;
`open-thread` (23), `open-ticket` (24), `review-lossless-mapping` (37) added in
alphabetical position; `capture-inbox` retained (9), alongside the other deprecated
scopes.

**FR-R4 `AGENTS.md` V2 pointer (AC-R4.1): satisfied.** A "V2 Workflow Conventions"
pointer section (AGENTS.md:123-129) points at `docs/workflow/v2/`, marks V2 the active
ruleset for new threads, and notes V1 remains the grandfathered reference for pre-V2
threads (never migrated); it is a pointer, not a duplication, mirroring the V1 pointer.

**FR-R5 README overview prose / AGENTS Layout / cross-skill V1 refs (AC-R5.1–5.4): all
satisfied.** Opener (README.md:5), "Toolbox Model" (9), and "Layered Workflow Map"
(11-32) describe V2 — lifecycle ledger, lineage folders, `open-thread`/`open-ticket`,
derived status — with an explicit "no inbox" (32) and no `capture-inbox`/inbox-subfolder
as a live module (AC-R5.1); a README grep for "V1"/"v1" returns only the
`discussion-loop` retired entry (417) and the grandfathered `docs/workflow/v1/` pointer
(436) — no active-workflow description frames itself as V1 (AC-R5.2); the AGENTS.md
"Layout" block lists `capture-discussion/` as open-thread/open-ticket/discussion/
seeded-discussion (no capture-inbox), `review/` includes review-lossless-mapping, and
`capture-inbox` appears under `deprecated/` (AGENTS.md:30-44, AC-R5.3); README carries
no `D<n>` decision-ID citation, and the `the-fool`/`verify` notes cite none (AC-R5.4).

## Open Questions

1. **Advisory, not a gap — prose use of "V1"/"V2" in skill bodies.** Twelve active
   skills name "V1" and/or "V2" in prose (`open-thread`, `open-ticket`, `finish`,
   the four plan-driven/subagent `implement-*`, both `merge-artifacts-*`, both
   `adjust-plan-granularity-*`, `review-proposal-interactive`) — e.g.
   "the only V2 change", "V1's inbox is removed in V2". AGENTS.md's skill
   self-containment convention discourages naming V1/V2 in skills ("restate it
   plainly as behavior"). This is **outside every spec AC**: AC-S0.3 requires only
   inline restatement of the relied-on rules (holds) and no link to files outside the
   skill's own directory (holds — zero `docs/workflow/v*` links). The skills remain
   self-contained and functional, so this breaks no deliverable and is recorded only
   so the owner can decide whether to scrub the V1/V2 naming in a later editorial
   pass. It does not affect the verdict. (Note that AC-S5.1 itself frames the change
   as "the only V2 change", so the adjust-plan-granularity wording tracks the spec.)

## Next Actions

- Owner: dispose this review (accept / reject). On accept, no build change is
  required — the verdict is PASS with no gaps.
- If the owner wants AGENTS.md-strict skill prose, scrub the advisory's V1/V2 naming
  as an editorial (non-version-bumping) pass; this is optional and outside the spec.
- On disposition + finish: set the spec's `status.implemented` latch and append
  `closed: done` to `ledger.md` (owner/finish actions, deliberately not performed by
  this review).
