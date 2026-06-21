# V2 Discussions
**Realizes:** §11 (the discussion conventions); §10 (a discussion no longer owns review disposition)

Discussions are the connective tissue between user and agent — the source of the
historical decisions the spec is later held against (see the lossless authoring
constraint in [`./spine.md`](./spine.md)). They are captured as much as possible, as
append-only logs, and they target the artifact they serve (genesis discussions target
the seed; later ones target the proposal, spec, plan, or implementation).

## Two Modes

A discussion runs in one of two modes, **picked per discussion, defaulting by context**:

- **Creative** — exploring a solution space: present **multiple options**.
- **Practical** — disposing review findings, fixing a concrete issue: present a
  **single well-argued Proposed solution** instead of an option menu (observed to be how
  strong models naturally drive these loops).

## Recommendation-First Is Legitimate

The loop does **not force an options list** when one well-explained recommendation
serves the reader better. A single, clearly reasoned recommendation is a legitimate
shape — options are a tool for genuine solution-space exploration, not a ceremony to
perform every time.

## Lettered Options

When options are presented, they are **lettered (A / B / C)** so the user can reference
them tersely ("go with B").

## Target-Scoped P-Numbering

Decision points are **P-numbered, scoped to the discussion's target.** **Off-target
exchanges** — e.g. an end-of-discussion "what should I do next?" navigation exchange — are
**never logged.** Polluting a target's log with non-target decisions is a known failure
mode.

## Context-Rich Headers

A log header carries **full context** — the **target artifact path, the thread, and what
is being discussed** — **never just a vague title.** A future reader must be able to tell
what the discussion was about and what it served from the header alone.

## The Discussion Record

Each on-target decided point is appended as one **append-only**, P-numbered record that
**mirrors what the user saw**, so a future reader can reconstruct the decision without the
chat. A discussion record carries **four fields**:

- **Point** — the framing line presented, verbatim (what the decision point is about).
- **What you need to know** — the background block presented, verbatim, kept whole (file
  paths, line numbers, and multi-paragraph context preserved, not summarized or compressed).
- **Decision** — what the user chose.
- **Rationale** — why it made sense, including the main trade-off; any dissent is flagged
  per peer framing.

This four-field shape is specific to the discussion logs. Decision logs emitted by other
phases (proposal, spec, plan, review, merge, implementation) keep their lighter
`Decision` / `Rationale` records under the same `## P<N>:` heading.

## The Optional Pause

After the **"What you need to know"** framing, there is an **optional pause**: the user
may answer directly, provide additional context, or skip — **before** the
options/recommendation are generated. The pause lets the user redirect early, rather
than reacting to a fully-formed proposal.

## Peer Framing

The loop's contract is **peer framing**: neither side defers to the other, and neither
blindly accepts the other's proposals; both are trying to reach the **best decision
together.** This joins the existing anti-sycophancy rules.

## Log What Serves the Target

Log **every on-target decision** — every point the user settles that is **about the
discussion's target** is recorded. The filter is **target-relevance, not importance**: an
on-target decision is never skipped for being small or self-evident.

**Off-target exchanges are never logged.** The canonical example is the end-of-discussion
**"what should I do next?"** exchange — write a spec, discard the work, push, commit. That
is workflow navigation, not a decision about the target; it is handled in conversation and
leaves no record.

The log is still created **lazily**: a discussion that settles no on-target decision
leaves no artifact. But from the first on-target decision onward, every on-target decision
is recorded — there is no "too trivial to log" discretion.

## A Discussion No Longer Owns Review Disposition

A discussion **no longer owns review disposition.** Disposition is recorded directly in
the review's own frontmatter `status:` map (see [`./reviews.md`](./reviews.md)).
A practical-mode discussion, **when one is written**, is the **optional linked
`rationale`** for a disposition — not the authoritative status, and not required to
dispose a review at all.

## Companion Docs

- [`./reviews.md`](./reviews.md) — how a review's disposition is recorded in its
  frontmatter, and the optional `rationale` link to a discussion.
- [`./spine.md`](./spine.md) — where discussions sit in the spine and the lossless
  authoring constraint the discussions feed.
- [`./lifecycle.md`](./lifecycle.md) — record immutability (an append-only discussion
  log is appended to, never rewritten) and owner-marked corrections.
- [`./thread-layout.md`](./thread-layout.md) — the `discussions/` folder under each
  target and the genesis `seed/discussions/`.
