# V2 Workflow Reference
**Realizes:** §16 (codify the V2 conventions as `docs/workflow/v2/`)

This directory is the **single source of truth for the V2 modular agentic workflow
ruleset** — thread storage, artifact lifecycle and immutability, the
threads-vs-living-docs model, process tiers, remote-tracker integration, the spine
stages, discussions, and reviews. V2 revises the V1 conventions to fix their two
load-bearing mistakes: file-level immutability (which pushed mutability into folder
moves and broke links) and status-by-folder. V2 replaces both with **lifecycle-based
immutability** and **derived, event-sourced status**.

## Reading Order

Each doc is short and self-contained. Read in this order:

1. [`thread-layout.md`](./thread-layout.md) — the thread root, the V2 folder set,
   lineage folders, the `seed/` genesis bucket, the ledger's location, records
   attaching to their target, the inbox removal, lineages-vs-variants, and path
   references.
2. [`filename-grammar.md`](./filename-grammar.md) — the two filename forms (versioned
   `<type>.md` with no stamp/no `v<N>`; the unchanged record form), the UTC stamp, the
   ledger's fixed name, the V2 token vocabulary, and the shrunk ambiguity rule.
3. [`lifecycle.md`](./lifecycle.md) — the two artifact classes plus the ledger, record
   immutability, stored latches vs derived condition, the freeze model and its guard,
   the frontmatter status contract, event sourcing, and the thread lifecycle ledger
   spec.
4. [`tiers.md`](./tiers.md) — the four tiers, the safety rules, the per-tier Definition
   of Done, PR discipline, and the prerequisite-preflight practice.
5. [`tracker-integration.md`](./tracker-integration.md) — the three-layer status model,
   single ownership of work-item status, the seed `External:` bridge, the finish
   handshake, the backlink, and the commit/PR reference convention.
6. [`spine.md`](./spine.md) — the stages (`seed → discussion(s) → [proposal] → spec →
   plan → implement → verify → finish`), the seed format, the spec obligations and the
   lossless authoring constraint, plan autonomy and the plan-as-compiler-IR, the
   four-outcome adherence review, and finish.
7. [`discussions.md`](./discussions.md) — the two modes, recommendation-first
   legitimacy, lettered options, target-scoped P-numbering, context-rich headers, the
   optional pause, peer framing, and write-only-if-useful.
8. [`reviews.md`](./reviews.md) — review placement, disposition via frontmatter, the
   references-first report format, the lossless-mapping review and its cadence, the
   consistency-with-decision-logs check, and the tier-3 adversarial reviews.

## V2 Is a New Ruleset — V1 Is Grandfathered

V2 is a **new ruleset that does not edit or replace V1 in place.** V1 lives on at
[`docs/workflow/v1/`](../v1/) for the threads written under it. **Pre-V2 threads are
grandfathered: never migrated, never mixed.** New threads follow V2; old threads keep
citing V1. The two sets coexist under `docs/workflow/` precisely so a V1 reader running
against an older skill bundle can always cite a stable rule.

## These Docs Are Immutable by Convention

Like the V1 set, the **V2 reference docs are themselves immutable by convention** — by
convention, not by enforcement. A future ruleset would live at its own
`docs/workflow/<version>/` rather than as in-place edits here, so a reader can always
cite a stable rule.

## Self-Containment: Skills Restate, Docs Are the Source of Truth

These docs are the **authoring and maintenance source of truth** for the V2 rules.
**Published skills do not link to these docs at runtime** — per the repo's skill
self-containment convention, each skill body **restates inline** the V2 rules it
depends on. When a rule here changes, the skills that rely on it are updated to match;
this directory is where the canonical statement of each rule lives so every skill's
restatement stays consistent.
