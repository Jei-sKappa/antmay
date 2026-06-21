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
points** — e.g. an end-of-loop "what should I do next?" exchange — are either **left
unlogged by rule** or **logged under a distinct prefix.** Polluting a target's log with
non-target decisions is a known failure mode.

## Context-Rich Headers

A log header carries **full context** — the **target artifact path, the thread, and what
is being discussed** — **never just a vague title.** A future reader must be able to tell
what the discussion was about and what it served from the header alone.

## The Optional Pause

After the **"What you need to know"** framing, there is an **optional pause**: the user
may answer directly, provide additional context, or skip — **before** the
options/recommendation are generated. The pause lets the user redirect early, rather
than reacting to a fully-formed proposal.

## Peer Framing

The loop's contract is **peer framing**: neither side defers to the other, and neither
blindly accepts the other's proposals; both are trying to reach the **best decision
together.** This joins the existing anti-sycophancy rules.

## Write Only If Useful

A discussion log is written **only when it carries information useful to a future reader
about its target** — **no ceremony logs.** A loop that surfaced nothing worth preserving
leaves no artifact.

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
