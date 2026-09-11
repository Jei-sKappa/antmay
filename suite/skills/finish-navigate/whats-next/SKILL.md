---
name: whats-next
description: Read a thread's observable state, then advise plausible next actions without inferring hidden operations or writing anything; use when you want a quick, evidence-based read on where a thread stands and what to do next.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.2.0
disable-model-invocation: true
---

# What's Next

What's Next is a read-only, evidence-based navigation advisor. It reports what can be observed in a thread, which unresolved signals exist, and which next actions are plausible given the artifacts observed and the published recipes. The chat reply is the whole deliverable: this skill writes no file, edits nothing it reads, marks nothing complete, and reads `docs/adr/` and `docs/glossary.md` without ever writing them.

Advice is grounded only in what the filesystem and git actually show. Some normal operations leave no success artifact — a plan check that found nothing to correct, a clean review — so their having run cannot be observed. Never invent that state: do not claim to know the last operation that executed, and never treat a thread that diverges from a published recipe as being in error.

## Resolve the thread

The thread root is a folder under `docs/threads/` named with a UTC-timestamp slug (e.g. `docs/threads/250522143000Z-my-feature/`), or under `docs/threads/archive/` once the thread has closed. If the current working directory already sits inside a thread root, that is the thread. If several candidate roots exist and which one is meant is ambiguous, ASK the user — never pick by recency, sort order, or any other heuristic; which thread the user is in is a real navigation fact, not something to guess.

Location is itself a signal:

- A thread under `docs/threads/archive/` is **terminal**: its records have landed in the project layer and forward work means opening a new thread, not reopening this one.
- A thread in the active tree is still open. It may already have completed implementation and delivery. You may say an active thread appears ready for `finish` or for `close-thread`, but never label it mechanically complete.

All within-thread paths below are thread-relative; branch and worktree state come from the current branch as found.

## Inputs

Gather all of these read-only; the advice below works from what you gather here.

- `docs/adr/` — the project ADR catalog, listed with the command in `references/formats/adr.md`; open the records relevant to what the thread is doing. Authoritative.
- `docs/glossary.md` — the project's terms. Authoritative.
- **Location** — whether the thread root sits in the active tree or under `docs/threads/archive/`, as above. Material, and the signal that decides whether any forward action applies at all.
- The thread's `seed.md` — why the thread exists and its intended outcome. A `Roadmap:` line and an `Entry:` line name the roadmap index the thread was opened from and the slug of its entry. Authoritative for intent.
- The thread's `spec.md`, when present — the thread's design truth. Authoritative. Its presence proves the spec was authored; its absence proves nothing, since a thread may not have reached that step or may not need one.
- The thread's `adr/` and `glossary.md` — the thread's draft delta of the project layer, which reaches the project at close. Material.
- The folders under `plans/` — one per plan, newest by stamp; a `plan-tasks/` folder beside `plan.md` marks a strict plan, and its absence a brief one. Material.
- The folders under `implementations/` and each one's `report.md` — what each implementation delivered and whether it completed or stopped, in the shape `references/formats/implementation-report.md` defines. Material; the newest folder by stamp is where the thread stands.
- The header lines of each bundle in `.pending-decisions/` — the producer, target, and point count that `references/formats/pending-decision-bundle.md` defines. Material: each bundle holds genuine human decisions queued for later resolution.
- `.pending-reviews/` — the bundles it holds, listed by file name. Material: each records review findings kept for later attention.
- Every `implementations/<folder>/.runs/` directory — surviving state from an interrupted implementation run, listed by name. Material.
- The published recipes — `references/recipes/quick.md`, `references/recipes/standard.md`, and `references/recipes/roadmap.md` — the known-good progressions to orient advice against. Advisory: orientation, never a checklist and never a compliance standard.
- The roadmap index the seed's `Roadmap:` line names, or, when the thread authored one, the index under `docs/roadmaps/` whose file stem ends in the thread's slug — a project-level file whose shape `references/formats/roadmap-index.md` describes. Material.
- Git state — the current branch name, recent commits, `git status --short`. Material.
- An optional user hint such as "I just checked the plan." Material: use it to shape the current answer only. If the user states that an unobservable operation already ran, take that at face value for this answer and write no marker of it anywhere.

## Prioritize signals

Weigh the observable signals in this order and let the highest-priority live signal drive the recommendation:

1. **Pending human intent relevant to downstream work** — unresolved `.pending-decisions/` bundles that gate what comes next.
2. **Explicitly resumable interrupted implementation runs** — a surviving `.runs/` directory under an implementation folder that the user can choose to resume.
3. **Known pending-review findings** — `.pending-reviews/` bundles, presented as findings to address, dismiss, or supersede, not as automatic blockers.
4. **Comparison of observable artifacts with the closest published recipe** — match what is present against the published progressions (an index under `docs/roadmaps/` this thread authored → Roadmap; a `spec.md`, or a plan folder carrying `plan-tasks/` → Standard; lighter traces → Quick) and read where the thread sits along that sequence, always offered as generic guidance.
5. **Delivery and closing** — a thread whose newest implementation reports a completed outcome, or whose direction index is authored, has reached its end: `finish` hands the branch off, and `close-thread` is the last action, landing the thread's draft ADRs and glossary entries into the project layer and archiving the thread.
6. **Reasonable alternatives** — for example an optional review, escalating a lighter path to a spec-driven one, a further plan or implementation pass, or direct implementation.

## Conditional advice for evidence-less operations

When the next plausible step is an operation that leaves no success evidence — a plan check that found nothing to correct is the clearest case — phrase the advice conditionally rather than asserting whether it ran:

```text
Observed:
- spec.md exists.
- plans/2605221430/ holds a strict plan.
- No implementation folder exists.
- No pending decision or review bundles are present.

Suggested path:
spec → [review-spec] → plan-strict → check-plan → implement-plan

Recommended next:
- If check-plan has not run against plans/2605221430/, run it now.
- If it has already run, implement-plan is the next normal step.
```

Anchor each such recommendation to the closest published recipe, presented as generic guidance, and always leave both branches ("if X has not run…" / "if it has…") open so the user resolves which one is true.

## Roadmap threads

For a thread that authored a direction — an index under `docs/roadmaps/` whose file stem ends in the thread's slug — surface two things and nothing more: whether that index exists on disk, and whether the thread has closed. Closing is what lands the direction's ADRs in the project layer, and entries are opened from the index afterwards, one at a time as the frontier reaches each. Say so where it is the live signal; the index's entries carry no status to read and their progress is not yours to aggregate.

For a thread opened from an entry — its `seed.md` carries the `Roadmap:` and `Entry:` pair — name the entry the thread answers, and flag a `Roadmap:` path that does not exist on disk. Read the named entry for its scope boundary when the advice turns on what the thread is meant to cover.

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
