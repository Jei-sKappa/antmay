# Roadmap-descendant feedback

This applies when the run's thread carries a `Parent:` roadmap reference in its seed and the run has discovered something with parent- or sibling-level impact. It spells out what qualifies as that impact, what to hand `/append-roadmap-feedback`, and what stays local.

## What qualifies as parent-level impact

A discovery reaches parent- or sibling-level impact when it is one of:

- a shared constraint that no longer holds;
- a direction that a sibling or future child brief must change;
- a needed additional child.

A discovery that is only a local surprise or a local implementation note is NOT roadmap feedback; it stays in this run's implementation report.

## What to supply to `/append-roadmap-feedback`

When the discovery qualifies, append it to the parent's roadmap feedback via `/append-roadmap-feedback`, supplying:

- the parent roadmap reference;
- this child as the source;
- what it affects;
- self-contained evidence;
- the impact;
- an advisory recommendation.
