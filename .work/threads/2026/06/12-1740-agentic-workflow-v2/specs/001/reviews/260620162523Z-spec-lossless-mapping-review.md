---
status:
  disposed: 260620214136Z
  disposition: accepted
  rationale: specs/001/discussions/260620171014Z-spec-review-and-flags-decision-log.md
---

# Review: Workflow V2 spec lossless mapping (v1, Draft)

## References

- Artifact under review: `specs/001/spec.md`
- Source 1 - approved proposal: `proposals/001/proposal.md`
- Source 2 - proposal decision log: `proposals/001/discussions/260612201354Z-proposal-v1-review-findings-decision-log.md`
- Context - original proposal review: `proposals/001/reviews/260612200042Z-proposal-v1-review.md`
- Repo convention - agent guidance: `AGENTS.md`
- Repo convention - V1 reference index: `docs/workflow/v1/README.md`
- Repo convention - V1 thread layout: `docs/workflow/v1/thread-layout.md`
- Repo convention - V1 filename grammar: `docs/workflow/v1/filename-grammar.md`
- Repo convention - V1 immutability: `docs/workflow/v1/immutability.md`

## Verdict

**Issues: lossless mapping does not pass as written.**

I found no unflagged additive decisions or assumptions: the spec's substantive
pins that go beyond the proposal are either genuine proposal section 15 degrees of
freedom, flagged for owner review, out of scope, or traceable to AGENTS.md / the
V1 reference shape.

I found three lossless gaps. Two are current build-contract omissions from
proposal sections 8 and 13; the third is a deferred source decision from proposal
section 13 that the spec does not name in its out-of-scope list. The spec's
section 2 coverage claims are therefore incomplete: the tracker-integration row
drops part of the tracker bridge, and the V2 rule-area map does not account for
the adopted CLI-preflight rule or the deferred spec-creation UX orchestration.

## Additive: spec decisions or assumptions not traceable to sources and not declared DoF/flag/out-of-scope

No findings.

I spot-checked the spec's pinned degree-of-freedom claims against the approved
proposal section 15:

- Ledger filename and line grammar: proposal section 15 leaves both open; P21
  dogfoods `lifecycle.md`, and spec flagged item F-1 surfaces the pin.
- Freeze-guard mechanism: proposal section 15 leaves pre-commit vs CI vs both
  open; spec flagged item F-2 defers the tooling while keeping the rules.
- Re-`deferred`: proposal section 15 leaves it open; proposal section 4's guard
  text already admits a ledger-only `deferred` append, and spec flagged item F-3
  calls out the resolution.
- Lossless review naming / interactive variant, `seed-capture` naming, exact
  frontmatter spelling, semver bump level, and AGENTS.md V2 pointer are all
  explicitly flagged or scoped as degrees of freedom.

## Lossless gaps: in-scope source decisions the spec failed to capture

### LM-G1 - Proposal section 13's prerequisite-preflight rule is missing

**Source decision:** proposal section 13, under "Industry practices adopted /
Now", adopts a prerequisite-preflight rule: a skill whose instructions require a
binary or sibling skill checks availability first and fails the whole instruction
with a clear warning when the prerequisite is missing.

**Spec coverage checked:** no FR-D, FR-S, coverage row, degree of freedom, owner
flag, or out-of-scope entry captures this. A repo search of the spec finds no
`preflight` / prerequisite-equivalent rule.

**Why this is a gap:** this is not prose elaboration or a future option; it is in
the proposal's "Now" list and directly affects skill behavior. It belongs either
in the V2 reference docs and in the relevant changed skills, or the spec must
explicitly defer it with a source-backed reason. As written, section 2.2's
rule-area coverage is incomplete.

### LM-G2 - Proposal section 8's tracker backlink and commit/PR reference convention is only partially mapped

**Source decision:** proposal section 8 defines the tracker bridge as more than
the seed's `External:` line. It states that the ticket gets one comment with a
permalink to the thread folder, and commits / PRs reference the ticket.

**Spec coverage checked:** AC-D6.3 captures the seed `External:` line, the
terminal handshake, `External: none`, and the "never continuously mirror" rule.
It does not capture the ticket-backlink comment or the commits/PRs-reference-
the-ticket convention. No other FR/AC, degree of freedom, owner flag, or
out-of-scope item captures it.

**Why this is a gap:** this is a concrete integration decision in the approved
proposal, not an implementation detail invented later. It is in scope for the
`tracker-integration.md` reference doc at minimum; it may also imply skill
instructions for whatever opens a thread or performs finish/PR handoff.

### LM-G3 - Proposal section 13's deferred spec-creation UX orchestration is not accounted for

**Source decision:** proposal section 13 explicitly lists "Spec-creation UX
orchestration" as an on-trigger item: a guided discuss -> spec -> review ->
discuss -> update flow, to be built only after V2 stabilizes.

**Spec coverage checked:** section 6 names other deferred section 13 mechanisms
such as postmortem and decision-index templates, PR-enforcement CI, the future
status CLI, and skillrouter unification. It does not name the spec-creation UX
orchestration. No FR/AC, degree of freedom, or owner flag captures it.

**Why this is a gap:** this is not a requirement to build the orchestration now.
It is a source decision to defer it. Because the spec's out-of-scope section is
the pressure valve for "considered, not missed" deferred work, omitting this
item makes the mapping lossy at the deferral-accounting level.
