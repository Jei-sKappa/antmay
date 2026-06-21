# V2 Tracker Integration
**Realizes:** §8 (the three-layer status model, single ownership, the seed bridge, the backlink and commit/PR conventions)

"Status" is one word doing three different jobs. Separating them is what lets the
filesystem and an external tracker (Jira, Linear, ClickUp, GitHub Issues) coexist
without dual-tracking. V2's integration is deliberately thin: **a single link at the
seed and a single handshake at finish** — never continuous mirroring, which always
rots.

## The Three Status Layers

| Layer | Question it answers | Owner | Exists when |
|---|---|---|---|
| **Work-item / PM status** | priority, assignee, In Progress / Blocked / Done (the stakeholder view) | the external tracker | only if a ticket exists |
| **Thread lifecycle** | is this repo work-unit active / paused / terminal, and is it frozen? | the **repo** — the lifecycle ledger | always, at tier ≥1 |
| **Spine position** | which artifacts exist; what is the next one | **derived** from the folder | always |

These layers are **distinct by granularity, cardinality, and existence** — not the
same fact stored twice:

- **Granularity** — a ticket "In Progress" spans seed→plan and never tells you what is
  next; spine position does.
- **Cardinality** — one tier-3 epic ticket can map to many threads.
- **Existence** — there are threads without tickets, and tickets without threads.

## Exactly One System Owns Work-Item Status

Work-item status is owned by **exactly one system, and it is never the filesystem**:

- **Solo / personal / OSS:** GitHub Issues — adjacent to the code, auto-links commits
  and PRs, zero process cost.
- **Company contexts with PM/stakeholder visibility:** the company tracker owns status,
  because that is where non-engineers look.

**Never mirror into a second tracker** (e.g. into GitHub Issues alongside a company
tracker) — dual-tracking always rots. The repo holds the *truth*, the tracker holds the
*PM state*, and threads hold the *thinking*.

## The Seed Is the Join Point

The seed's **`External:` line** is the single join point between the repo and the
tracker. It carries the ticket URL (or `none` + why). The two layers **link at the seed
and shake hands exactly once, at finish**: the spec reaches `implemented`, the ticket
is closed, and the ledger gains `closed: done` — one terminal handshake (see
[`./spine.md`](./spine.md)). They **never continuously mirror**; continuous mirroring
is exactly what "dual-tracking rots" means, while a single terminal handshake is not.

`External: none` is allowed for **tier 0–1 personal work** (the repo is the sole owner
and there is nothing to drift against); **tier ≥2 team work should have a ticket**
(visibility and audit are the point of a team tracker).

## The Ticket-Backlink Convention

When a thread links a ticket, the ticket gets **one** comment carrying a **permalink
back to the thread folder** — a **one-time backlink**, not continuous mirroring. The
comment is posted by `open-thread` when it links the ticket, and/or by `finish` (which
posts it at finish if `open-thread` did not already do so), so a linked ticket always
ends up with exactly one backlink to its thread.

## The Commit/PR Reference Convention

**Commits and PRs reference the ticket**, so the tracker's native auto-linking surfaces
the work in the ticket's timeline. This completes the seed↔ticket bridge alongside the
seed's `External:` line and the one backlink comment — three thin, one-directional
links, no sync loop.

## Companion Docs

- [`./spine.md`](./spine.md) — the seed's `External:` line and the finish handshake
  (spec `implemented`, ticket closed, ledger `closed: done`).
- [`./lifecycle.md`](./lifecycle.md) — the ledger that owns the thread-lifecycle layer
  and why work-item/PM status never lives in it (the litmus test).
- [`./tiers.md`](./tiers.md) — why tier ≥2 team work should carry a ticket, and the
  preflight rule for the one tracker-writing skill.
