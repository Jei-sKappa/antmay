# Seed: Document-deliverable and initiative threads
External: none — repo-internal workflow-design work; the V2 ruleset is owned by this repo, so there is nothing external to drift against.

Running a tier-3 initiative thread for a new project (joppler — a remote orchestrator
for AI coding-agent pipelines) surfaced a gap in V2 itself: the workflow does not
support initiative/umbrella threads whose deliverable is a **document** (an approved
proposal + a phased roadmap, with the actual build delegated to tier-2 child threads)
rather than code. The thread's shape is exactly what `tiers.md` prescribes for tier 3 —
a proposal setting direction, a phased roadmap, then per-phase child threads each with
its own spec → plan → implement — yet running it by the book breaks against three rules.

## The three gaps

1. **The tier-3 phased roadmap has no legal home.** `tiers.md` lists a phased roadmap as
   a *required* tier-3 artifact, and `spine.md` describes it as "a living list inside the
   open thread, not a frozen contract" — phases welcome or defer follow-ups over time, so
   it must stay editable for the life of the initiative. But nothing in the folder set
   can hold it: `thread-layout.md` has no slot, `seed/` admits exactly three kinds of
   thing, records freeze at emission, proposals/specs freeze at their latches, and
   `.wip/` is gitignored so it cannot hold a durable artifact. A living document cannot
   exist inside a V2 thread without breaking some rule — yet tier 3 requires one. The fix
   is a defined artifact type for the roadmap with an explicit physics carve-out (a third
   class alongside records and versioned artifacts, or a named exception such as a
   root-level `roadmap.md` sibling to `ledger.md`).

2. **`finish` and the Definition of Done assume every thread ends in code.** Every tier
   ≥1 DoD row includes an implementation report, and the finish handshake sets
   `status.implemented` on a spec. An initiative thread whose own deliverable is an
   approved proposal + roadmap (implementation delegated to child threads) has no legal
   way to close — and the same applies to research/investigation threads generally. The
   ledger grammar itself is fine (`closed: done @ <UTC> — <justification>` parses
   regardless), so the gap is the **skill and the DoD table**, not the ledger: there is
   no doc-deliverable terminal handshake and no DoD row for non-code deliverables.

3. **Parent/child linking for phased initiatives is unspecified.** `spine.md` says
   follow-ups route "to seeds of future threads" and supersession is an optional prose
   forward-link, but there is no convention for a phase thread's seed naming its
   initiative, or the roadmap naming its children. It works by grep today; it is just not
   written down anywhere.

## The workaround being lived on the joppler thread

A living `roadmap.md` at the thread root next to `ledger.md`, declared in one line of the
proposal body as deliberately off-book; child-thread seeds name the initiative thread in
prose; and the umbrella's eventual close is a hand-appended `closed: done` ledger line
pointing at the child threads.

## Intended scope of this thread

Grow into: (1) a defined living-roadmap artifact with a home and a physics carve-out;
(2) a doc-deliverable terminal handshake plus DoD rows for non-code deliverables; and
(3) a parent/child linking convention. Nothing is being built at open time — the joppler
thread is the first live test case and will be better evidence once the pattern has been
lived end-to-end. The joppler thread will be attached later as reference material.
