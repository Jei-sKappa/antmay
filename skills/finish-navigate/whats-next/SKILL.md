---
name: whats-next
description: Read a thread's observable state, then advise plausible next actions without inferring hidden operations or writing anything; use when you want a quick, evidence-based read on where a thread stands and what to do next.
metadata:
  author: https://github.com/Jei-sKappa
  version: 3.1.0
disable-model-invocation: true
---

# What's Next

What's Next is a read-only, evidence-based navigation advisor. It reports what can be observed in a thread, which unresolved signals exist, and which next actions are plausible given the artifacts observed and the published workflows. The chat reply is the whole deliverable: this skill writes no file, edits nothing it reads, and marks nothing complete.

Advice is grounded only in what the filesystem and git actually show. Some normal operations — reconciliation above all — leave no success artifact, so their having run cannot be observed. Never invent that state: do not claim to know the last operation that executed, and never treat a thread that diverges from a published workflow as being in error — no thread carries a chosen workflow, and none is ever inferred as a fact about the thread.

## Resolve the thread

The thread root is a folder under `docs/threads/` named with a UTC-timestamp slug (e.g. `docs/threads/250522143000Z-my-feature/`), or under `docs/threads/archive/` if it has been archived. If the current working directory already sits inside a thread root, that is the thread. If several candidate roots exist and which one is meant is ambiguous, ASK the user — never pick by recency, sort order, or any other heuristic; which thread the user is in is a real navigation fact, not something to guess.

Location is itself a signal:

- A thread under `docs/threads/archive/` is **terminal** from the workflow's perspective; forward work means opening a new thread, not reopening this one.
- A thread in the active tree is merely unarchived. It may already have completed implementation and delivery. You may say an active thread appears ready for finish or archival, but never label it mechanically complete.

All within-thread paths below are thread-relative; branch and worktree state come from the current branch as found.

## Evidence to read

Read all of the following read-only:

- **Location** — active tree versus `docs/threads/archive/` (above).
- **`seed.md`** — why the thread exists and its intended outcome.
- **`decisions.md`** — the settled human decisions.
- **The published workflows** — `references/shared/workflows/quick.md`, `references/shared/workflows/standard.md`, and `references/shared/workflows/roadmap.md` — the known-good progressions to orient advice against. They are advisory orientation, not a checklist and not a compliance standard.
- **Existing canonical artifacts** — `proposal.md`, `spec.md`, `plan.md` (and `plan-tasks/` if present), `roadmap.md`. Each present artifact proves that its authoring step occurred; an absent one does not prove a step failed to run — it may simply not have been reached.
- **Roadmap child briefs and their `Materialized thread:` references** — see `## Roadmap threads`.
- **`.pending-decisions/` bundle headers** — each bundle records genuine human decisions queued for later resolution.
- **`.pending-reviews/` bundle headers** — each bundle records review findings recorded for later attention.
- **`.implementation-runs/`** — surviving directories from interrupted implementation runs that can be resumed.
- **`implementation-report.md`** at the thread root — the merged record of implementation outcomes.
- **Current branch and working-tree state** — branch name, recent commits, `git status --short`.
- **An optional user hint** such as "I just reconciled the spec." Use it to shape the current answer only. If the user states that an unobservable operation already ran, take that at face value for this answer and never write a completion marker anywhere.

## Prioritize signals

Weigh the observable signals in this order and let the highest-priority live signal drive the recommendation:

1. **Pending human intent relevant to downstream work** — unresolved `.pending-decisions/` bundles that gate what comes next.
2. **Explicitly resumable interrupted implementation runs** — a surviving `.implementation-runs/` directory the user can choose to resume.
3. **Known pending-review findings** — `.pending-reviews/` bundles, presented as findings to address, dismiss, or supersede, not as automatic blockers.
4. **Comparison of observable artifacts with the closest published workflow** — match what is present against the published progressions (`roadmap.md` → Roadmap, `spec.md` or `plan-tasks/` → Standard, lighter traces → Quick) and read where the thread sits along that sequence, always offered as generic guidance rather than a sequence the thread committed to.
5. **Reasonable alternatives** — for example an optional review, escalating a lighter path to a spec-driven one, direct implementation, finish, or archival.

## Conditional advice for evidence-less operations

When the next plausible step is an operation that leaves no success evidence — reconciliation is the clearest case — phrase the advice conditionally rather than asserting whether it ran:

```text
Observed:
- spec.md exists.
- No plan.md exists.
- No pending decision or review bundles are present.

Suggested path:
spec → reconcile-spec → [review-spec] → plan-strict

Recommended next:
- If reconcile-spec has not run, run it now.
- If it has already run, plan-strict is the next normal step.
- review-spec remains an optional second opinion before planning.
```

Anchor each such recommendation to the closest published workflow, presented as generic guidance, and always leave both branches ("if X has not run…" / "if it has…") open so the user resolves which one is true.

## Roadmap threads

For a thread that carries a `roadmap.md`, surface these and nothing more:

- **Child briefs lacking a `Materialized thread:` reference** — briefs not yet turned into child threads.
- **Dangling references** — a `Materialized thread:` value whose target folder does not exist on disk.
- **Feedback relevant to future children** — records in `roadmap-feedback.md` that affect briefs or shared constraints not yet acted on.

Never aggregate or report child completion, and never treat descendant feedback as reactivating an archived roadmap.

## Response shape

Answer in chat with a concise, signal-oriented reply using these sections:

```text
Observed:
...

Signals:
...

Recommended next:
...

Alternatives:
...
```

Omit any section that would be empty, and suggest at most two to four concrete actions. Each suggested action names what would execute it and ties to an observed signal. The reply may include a clarifying question when the evidence leaves something genuinely unresolvable. End on the last signal-oriented line, with no closing remark.
