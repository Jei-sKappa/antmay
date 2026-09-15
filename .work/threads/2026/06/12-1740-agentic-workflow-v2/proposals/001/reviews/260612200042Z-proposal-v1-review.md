---
disposed: 260615213117Z
disposition: accepted
rationale: proposals/001/discussions/260612201354Z-proposal-v1-review-findings-decision-log.md
---

# Review: Workflow V2 Proposal (v1, Draft)

Record. Critical review of the V2 proposal at handoff-grade bar, plus a
lossless-mapping pass against the on-disk sources. Reviewer: agent session of
2026-06-12, at the maintainer's request. Artifact-type token `review` is
provisionally registered per the open-token rule (V1 shipped `review-finding`;
the V2 token list is itself finding F-13 below).

## References

- Artifact under review: `proposals/001/proposal.md` (Status: Draft, Version: 1)
  (path updated in place per decision P1 — folder renamed after emission; original emission path was `proposals/agentic-workflow-v2/`; within-thread paths normalized to thread-relative per P17)
- Thread seed: `seed/seed.md`
- Source — maintainer TODO (verbatim copy): `seed/260612175420Z-maintainer-workflow-todo-notes.md`
- Source — consultation handoff: `seed/discussions/260612175420Z-workflow-v2-consultation-handoff-discussion.md`
- Ruleset being revised: `docs/workflow/v1/README.md`, `docs/workflow/v1/thread-layout.md`, `docs/workflow/v1/filename-grammar.md`, `docs/workflow/v1/immutability.md`

## Verdict

**Sound direction; not yet Approved-ready.** The core moves — lifecycle
immutability, derived status, record nesting under targets, seeds, tiers, plan
autonomy — are well-evidenced and internally coherent as principles. What blocks
Approved is a set of consistency gaps and underspecifications: two places where
the proposal contradicts itself or its own thread, one missing definition
(thread closure) that the freeze/guard mechanism silently depends on, and a §14
skill-change list with real gaps. All are fixable by in-place revision; none
undermines the design.

## Findings

### Major — internal contradictions and missing definitions

- **F-1. The thread violates the proposal's own lineage-folder grammar.** §3
  names lineage folders `<desc>-proposal/`, and both the handoff record and the
  proposal's own §16/§17 reference `proposals/agentic-workflow-v2-proposal/`,
  but the folder on disk is `proposals/agentic-workflow-v2/` — so the immutable
  handoff record's link is broken today. Resolve by renaming the folder to match
  grammar + records, or by changing the grammar to `<desc>/` (which would orphan
  the handoff's path and §16/§17's self-references).

- **F-2. Seed immutability contradicts tier escalation.** §4 classifies seeds as
  records ("immutable from the moment of emission"); §7 rule 2 says on
  escalation "the seed gains a line". Both cannot hold. Options: make the seed
  append-only like loop logs; or allow a record-backed amendment of the
  `Tier:` line only; or log escalation as a separate record and leave the seed
  untouched (weakens "an agent cannot silently downgrade" auditing-in-one-place).

- **F-3. "Thread closed" is undefined, and the freeze depends on it.** §4 keys
  aliveness to "while the thread is open" and the guard to "a thread whose spec
  is `Implemented`". But tier-1 threads have no spec (never frozen?); a thread
  may hold multiple spec lineages (§3 explicitly supports this — closed when
  all are Implemented? any?); and the "one closed-thread list" has no stated
  owner or trigger. V2 needs an explicit thread-closure definition independent
  of the single-spec assumption, and a named actor/step (presumably Finish) that
  updates the list.

- **F-4. Lifecycle scope beyond specs is unstated.** §4 defines "the spec
  lifecycle"; this proposal itself carries Draft/Approved status, and plans
  presumably need no human statuses at all (machine IR). State explicitly which
  statuses each versioned type carries (proposal: same five? plan: none/derived?)
  and when the header `Version:` integer increments (per revision round? per
  review cycle?).

- **F-5. §14 skill-change list has gaps.** Not covered: `finish` (gains new
  duties from §9 — flip to Implemented, update living docs, close ticket, update
  the closed-thread guard list — these are new behavior, not just path changes);
  `whats-next` (must answer "what is open?" via derived status now);
  `merge-artifacts-*` (V1 merge semantics produce next-version files, which V2
  abolishes — what does merge mean now? see F-6); `propose-*`,
  `review-proposal-*`, `review-code-*` (presumably "all"-row only, but propose-*
  at least gains lineage-folder output and status lifecycle). Also reconcile the
  discussion skill's recent "update past logs under explicit user request"
  behavior (v1.3.0+) with §4's "appended to but never rewritten".

- **F-6. Variant semantics are asserted but not specified.** §3 claims
  "Multiple lineages ... and variants remain expressible without layout changes"
  — but the V1 variant grammar (`v2-no-oauth-auth-spec.md`) lived in filenames
  that V2 removes. Where does a variant live now (sibling file in the lineage
  folder? sibling lineage folder?) and how does merge dispose of losers?

### Moderate — design tensions to resolve or explicitly accept

- **F-7. Derived status needs a checkability rule.** "A review whose findings
  appear in a decision log is processed" makes disposition a fuzzy content
  match. One cheap rule makes it mechanical: a disposing record MUST name the
  review it disposes by repo-relative path. Then "open = no record names it"
  is grep-derivable, which is the property the inbox deletion is sold on.

- **F-8. Record-per-edit is heavier than V1 for trivial edits.** §4: "every
  revision must be driven by a record" — read literally, fixing a typo in a
  Draft spec requires a decision-log entry. Calibrate: e.g. substantive changes
  need records; editorial/typo fixes need only the git diff — or make the
  record obligation start at `Approved` (pre-Approved Draft edits are the
  authoring process; git holds them).

- **F-9. The spec status line is stored status — the principle's own
  exception.** §5: "status is derived, never stored"; §4 stores
  Draft/In Review/Approved/Implemented in the header. Defensible (approval is a
  human event that must be captured somewhere, and one header line is the
  cheapest record of it), but the proposal should name the exception and its
  rationale, or someone will "fix" it later by deriving spec status too.

- **F-10. Lossless-mapping bar needs calibration.** §9's authoring constraint
  ("include nothing the user did not see and accept") taken at sentence level
  flags every derived AC, every restatement, all boilerplate. The TODO's own
  framing is the right bar — *decisions and assumptions*, not sentences. State
  it, or the §10 review nags about everything (the exact failure mode the
  Degrees-of-freedom section exists to prevent on the plan side).

- **F-11. PR-per-thread vs tiers is unreconciled.** §13 adopts "PR-per-thread
  discipline, even solo"; tier 0 has no thread and tier-1 ceremony is meant to
  be near-zero. Scale it explicitly (e.g. PR required tier ≥1? ≥2?), and note
  this is also unverifiable against the handoff's terse mention — sessions were
  richer than their summary.

- **F-12. The guard must permit the one legal frozen-spec edit.** §4 allows the
  `Superseded` status-line flip on a frozen spec; §4's guard "fails any diff
  touching a thread whose spec is Implemented". The guard spec needs the
  carve-out. Relatedly, the optional "one line naming the superseding thread" is
  source-relation metadata — name it as the explicit exception to the
  frontmatter ban §3 carries over from V1 (D44).

- **F-13. The V2 reference-doc set needs a filename-grammar successor, and
  the token list changes.** V1's versioned-form grammar (`v<N>` in filenames,
  target-version semantics, D42/D46/D47) is dead under V2; tokens `inbox-item`
  and `review-finding` lose their homes; new tokens are implied (`seed`,
  `implementation-report`, `review`, the provisional `notes`). Also restate
  what survives of D49 ask-on-ambiguity (lineage folders + status lines resolve
  most "which spec?" cases mechanically — say which residual cases still ask).

- **F-14. `seed/` holds a non-seed artifact with no rule covering it.** The
  TODO-notes copy lives in `seed/` beside the seed. Reasonable (genesis source
  material), but §3 shows only `<UTC>-<desc>-seed.md` + `discussions/` there.
  Define what may live in `seed/`.

- **F-15. `EXAMPLE-WORKFLOW/` is not in this repo.** §2 cites its files as
  Exhibit A and §14/§16 schedule its retirement, but it lives untracked in the
  external appaltiav2 workspace. The evidence is unverifiable from this repo
  (acceptable — quoted in §2), but the retirement step belongs to that
  workspace, not this repo's rollout; §16 should say so.

- **F-16. This thread's own spine skips the spec stage.** The seed declares
  tier 3; §7 tier-3 requires proposal → spec → plan; the stated intent is
  proposal → Approved → implement directly. Either the proposal doubles as the
  spec for docs+skills work (then say a tier-3 thread may collapse
  proposal/spec when the deliverable is documents, or that the tier table's
  artifact column is a ceiling not a checklist), or this thread should produce
  a spec after the proposal is Approved. Decide deliberately — this is the
  first V2 thread and it sets precedent.

### Minor — nits

- **F-17.** §7 tier-0 entry criterion "no behavior change" vs example "dep
  bump" — dep bumps routinely change behavior. Pick a cleaner example (comment
  fix, rename) or soften the criterion.
- **F-18.** With `plan-*-interactive` removed, plan skills are auto-only — state
  whether the `-auto` suffix stays (uniformity) or drops (no longer
  discriminating).
- **F-19.** Lineage folders carry no UTC stamp (`<desc>-spec/`), unlike every
  other artifact name. Deliberate? Multiple lineages in one thread then sort
  alphabetically, not chronologically. Probably fine — but say it.

## Lossless-mapping pass (proposal vs on-disk sources)

Performed as §10 defines, against the two available sources (TODO copy +
handoff record; the consultation sessions themselves exist only as the handoff
summary, so full verification against them is impossible by construction —
worth one acknowledging line in §17).

- **(a) Content in the proposal not traceable to the sources:** nothing
  substantive found. §17's line-number citations all resolve correctly against
  the TODO copy (constant offset, spot-checked across all 17 citations).
  Sub-details of §8 (ticket gets one permalink comment; tier-thresholds for
  `External: none`) and §13 (PR-per-thread phrasing) are elaborations beyond
  the handoff's summary level — consistent with it, attributable to session 2,
  unverifiable in detail. Not violations; noted for honesty.
- **(b) Source decisions the proposal failed to capture:** none found. Every
  TODO item disposes into §17's map; the handoff's "adopted / on-trigger /
  rejected" lists all reappear in §§12–13.

## Open questions (carried from §18, plus review's own)

- §18's four questions stand and should be disposed in the discussion
  (Approved→Implemented actor; tier-0 trace; seed owner field; lossless-review
  cadence).
- New from this review: thread-closure definition and owner (F-3); lifecycle
  scope per artifact type (F-4); variant/merge semantics (F-6); disposition
  checkability rule (F-7).

## Next actions

1. Discussion loop over the findings (decision log →
   `proposals/001/discussions/`; path updated in place per decision P1), majors first (F-1…F-6),
   then moderates, then nits and §18.
2. Revise the proposal in place per its own §4 rules, every change backed by
   the decision log.
3. Re-check status → `Approved` when the majors are disposed.
