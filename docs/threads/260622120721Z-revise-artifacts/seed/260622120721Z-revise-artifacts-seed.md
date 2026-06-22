# Seed: A first-class way to revise an existing versioned artifact (proposal / spec / plan)

External: none — personal skills repo; no tracker ticket.

## What triggered this

While driving the workflow on a real spec, the maintainer hit the review→revise
cycle: a spec was reviewed and the findings were discussed, and then the spec had
to be **updated** to fold in the resolutions. There is **no clean, first-class way
to do that revision.** The authoring skills (`spec-auto` / `spec-interactive`,
and the `propose-*` / `plan-*` families) are written for **fresh authoring** —
their steps say "create the artifact" and "a fresh artifact carries `version: 1`."
So the two available paths to revise are both unsatisfying:

- **Re-run the authoring skill** — risks re-authoring the artifact from scratch
  (churning sections unrelated to the findings) and re-initializing `version` to
  1 instead of bumping the review-cycle counter to 2.
- **A bare hand-edit** — works (a Draft is alive and freely editable), but carries
  **no encoded discipline**: nothing enforces the in-place rules, the version
  bump, or the edit-eligibility matrix below.

## The idea (as proposed)

A dedicated **edit / revise capability** for the three versioned artifacts —
proposal, spec, plan — e.g. an `edit-spec` (or a generic `edit-artifact`) skill.
The maintainer noted that under the future **skillrouter** tool this could instead
be expressed as a flag on the authoring skill: `spec-auto --update`.

## Why it is (probably) needed — the real value

The value is NOT "let me edit a Draft" — a Draft is already freely editable. The
value is **encoding the edit-eligibility matrix and the in-place discipline**,
which are easy to get wrong by hand:

- **Draft / In Review** → revise in place, preserve the content that is still
  good, apply only the decided delta, **bump `version` 1 → 2** (a completed
  review→revise cycle; editorial fixes never bump).
- **Approved spec, not yet implemented** → the ONLY legal change is an
  **owner-approved, record-backed amendment** — never an ad-hoc edit.
- **Frozen** (implemented spec; approved-or-rejected proposal; sealed thread) →
  **refuse**.
- **Per-artifact differences**: a proposal freezes at `approved`/`rejected`; a
  spec stays alive from `approved` until `implemented`; a plan carries no version
  and no status at all (its only quality signal is the downstream adherence
  review).

A skill (or mode) that gets this matrix right every time is the thing worth
having.

## The central open design question

**Separate skill vs. a mode/flag of the authoring skill.** Authoring-fresh and
revising are arguably two *modes of the same act* (produce/maintain this
artifact), which is exactly what skillrouter is for — pointing at
`spec-auto --update` rather than a wholly separate `edit-spec`. The thread should
decide the near-term packaging (pre-skillrouter, modes are separate SKILL.md
files, so "update" would land as a separate skill or an explicit revise-branch in
the authoring skill) and the eventual skillrouter target. Do not pre-bake "a new
separate skill" before settling this.

## Other open questions to resolve

- **Generic `edit-<proposal|spec|plan>` vs per-type.** A generic reviser unifies,
  but the per-artifact lifecycle differences mean it still branches by type
  internally — is the unification worth it, or are per-type revisers (mirroring
  the per-type authoring skills) cleaner?
- **Draft-revision vs post-approval amendment vs refuse-when-frozen** — does one
  capability handle all three eligibility cases, or only the Draft-revision case
  (leaving amendments to a separate, heavier path)?
- **Overlap with existing skills.** `adjust-plan-granularity` already revises a
  living plan in place (for granularity), and `merge-artifacts` revises a
  canonical artifact from competing candidates. How does a general revise
  capability reconcile with / subsume / stay distinct from these?
- **Does a Draft revision even need a skill at all**, or is the encoded value only
  in the amendment + frozen-refusal cases? (Interrogate the need honestly rather
  than assuming a skill.)
- **Version-bump correctness** — the capability must reliably bump the
  review-cycle counter (and never re-initialize to 1), the exact failure mode that
  prompted this thread.

## Relationship to prior work

Part of the same developer-experience family as
`docs/threads/260622102452Z-workflow-dx-orchestration/` (lightening how the spine
is driven) — but distinct enough (a concrete revise capability vs an orchestration
layer) to track on its own. It also directly engages the **skillrouter
variant-unification** follow-up recorded in the
`docs/threads/260612174045Z-agentic-workflow-v2/` implementation report — the
`--update` mode is a candidate first application of that flag mechanism.
