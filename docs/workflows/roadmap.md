# Roadmap

Roadmap explores and structures a larger direction, then decomposes it into independently executable child threads — and then it is done. Its purpose is direction and decomposition, not ongoing coordination. A Roadmap thread is not a long-lived umbrella: once it has set the direction and materialized its children, it finishes like any other thread. It tracks no child status, aggregates no progress, holds no checkboxes or completion markers, and never becomes a coordinator its children report to. The children are ordinary threads that run their own workflows to completion on their own.

## Sequence

The documented normal path explores the direction, writes it down as a decomposition, keeps that decomposition faithful to the decisions, and materializes the children:

1. Open the thread with `open-thread`, which writes the seed and the eager decision log.
2. Discuss the direction with `discussion` to settle open questions.
3. Sketch the direction with `propose`, then align it against existing decisions with `reconcile-proposal`. *(optional)*
4. Author the roadmap with `roadmap`, which writes `roadmap.md` and the eager `roadmap-feedback.md`.
5. Reconcile the roadmap against the thread's decisions with `reconcile-roadmap`.
6. Review the roadmap decomposition with `review-roadmap` before materialization. *(optional)*
7. Materialize the child threads with `materialize-roadmap-threads`.
8. Finish the thread with `finish` and choose how to handle the branch.
9. Archive the thread with `archive-thread` once it no longer needs to remain active. *(optional)*

The unbracketed steps — including `reconcile-roadmap` — are the documented normal path, kept faithful as ordinary maintenance rather than mechanically enforced. The bracketed proposal and review steps are suggestions to reach for when they earn their keep. Skipping an optional activity or adding an unlisted one never makes the thread invalid.

## Artifacts

Roadmap authoring produces two artifacts:

- **`roadmap.md`** is the decomposition contract. It carries the intended outcome, context, scope and boundaries, shared constraints that apply across children, the decomposition rationale, and one `CB<N>` brief per child. Each `CB<N>` brief carries the child's outcome, context, scope and boundaries, its dependencies described as consumed inputs, and the relevant shared constraints. It holds no checkboxes, statuses, owners, or progress. A `Materialized thread:` reference is absent from a brief until materialization adds it as factual evidence that the child was created.
- **`roadmap-feedback.md`** is created eagerly at roadmap authoring, opens with a `# Roadmap Feedback` heading, and accrues append-only `FBK<N>` records — each with a title, source, the children or roadmap area it affects, context, impact, and recommendation.

## The descendant feedback loop

Feedback flows in both directions between a Roadmap and its descendants.

**Appending feedback (from a descendant upward).** A descendant that discovers something with parent- or sibling-level impact — a shared assumption that turned out wrong, a boundary that needs redrawing, a dependency the decomposition missed — appends an `FBK<N>` record to the parent's `roadmap-feedback.md`. This authority is deliberately narrow: a descendant may append a feedback record and nothing more. It may not rewrite `roadmap.md`, edit the parent's `decisions.md`, modify a sibling's artifacts, declare a new parent-level decision, or mark another child blocked or complete. Appending feedback does not reactivate an archived parent or turn it into a coordinator; the record simply waits to be read. Discoveries with only local impact stay in the descendant's own thread and are not appended.

**Consuming feedback (into a future child).** Feedback is read, not just written. Before a future child begins its work, its preflight reads its own seed and `decisions.md`, the parent `roadmap.md`, and the relevant `roadmap-feedback.md` records — never every sibling thread. A preflight that cannot resolve those inputs — a missing seed or roadmap, an unreadable feedback reference, or another unmet prerequisite — refuses before any work begins rather than guessing. Adjustments that follow mechanically from existing durable decisions are incorporated directly. An adjustment that changes human intent, discovered once execution is underway, is queued as a pending-decision bundle and recorded in that child's `decisions.md` when settled, before the work depends on it; the run never invents the intent. Feedback implying work outside the existing child briefs may lead to recommending an additional child thread — it never causes one to be created silently.

## Materialization

`materialize-roadmap-threads` creates the child threads from the `CB<N>` briefs. It is idempotent: it creates a thread for each brief that has no materialized reference yet, skips and verifies each brief already materialized, and adds each `Materialized thread:` reference immediately after creating the corresponding child.

A materialized child is an ordinary thread. When a child itself proves to need further decomposition, it may in turn follow the Roadmap workflow — but parent–child cycles are not meaningful and must never be created; a descendant never becomes an ancestor of its own parent.

## Resolving pending decisions

`resolve-pending-decisions` is reactive infrastructure, not a stage in the sequence. Whenever a completion-oriented operation — roadmap authoring, reconciliation, or a child incorporating parent feedback once its work is underway — discovers missing human intent it cannot settle on its own, it leaves a pending-decision bundle in that thread's queue and stops. Running `resolve-pending-decisions` then works through the queued points, records each settled outcome in `decisions.md`, and hands back a recommended next action. It has no fixed position in the path; it is available whenever a queue exists and does nothing when the queue is empty.

## Durable outputs

- `seed.md` and `decisions.md`, written when the thread opens.
- An optional `proposal.md`, when `propose` runs.
- `roadmap.md`, the decomposition contract with its `CB<N>` briefs.
- `roadmap-feedback.md`, the append-only channel from descendants.
- The materialized child threads, each referenced back from its `CB<N>` brief.

## User involvement

The user chooses the direction, answers what `discussion` surfaces, and settles any pending decision an authoring, reconciliation, or child feedback-consuming step could not resolve. The optional proposal and review are the user's call. The user decides whether a discovered gap becomes a new child thread. At the end the user picks the branch disposition `finish` offers and decides whether to archive.

## Terminal outcome

A Roadmap thread completes at `finish` once the direction is set and the children are materialized; the roadmap and its materialized children stand as its final deliverable. Archiving afterward is optional housekeeping. Because the parent tracks no child status, the children finishing their own work is unrelated to the Roadmap thread's own completion.

## Template

The exact recommended sequence is also published at [`shared/references/workflows/roadmap.md`](../../shared/references/workflows/roadmap.md), the canonical copy that workflow-aware skills mirror into their references; this document describes the path rather than reproducing that list.
