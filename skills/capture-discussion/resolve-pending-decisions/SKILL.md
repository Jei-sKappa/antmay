---
name: resolve-pending-decisions
description: Settle the thread's queued pending decisions interactively and record the outcomes — use when a queue of pending-decision bundles is waiting for a human to work through their open questions and turn each settled choice into a durable decision record.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.3
---

# Resolve Pending Decisions

Work through queued pending-decision bundles with the user, one bundle and one point at a time, turning each settled choice into a durable `DR<N>` record in the thread's `decisions.md`. Bundles are the transient queue of open human decisions an earlier operation could not settle on its own; you are the interactive bridge that empties them. You settle only genuine human decisions that a bundle already contains — you do not audit the repository, judge the quality of any artifact, or invent points a bundle does not hold.

## Resolve the thread

Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp. Bundles live under that thread's `.pending-decisions/` folder; decisions are recorded to that thread's root `decisions.md`.

## Select a bundle

- **With an explicit bundle path argument**, load only that bundle and go straight to the resolution loop.
- **Without a path**, list the files under the active thread's `.pending-decisions/` folder and read ONLY each file's routing header (`Producer`, `Target`, `Request`, `Created`, `Points`, `Summary`). Never open a bundle's point bodies just to build the queue.
  - If the folder is empty or absent, tell the user there are no pending decisions and stop.
  - If exactly one bundle exists, select it directly.
  - If several exist, present a compact queue — one row per bundle showing its title, producer, target, summary, and point count — and let the user choose which to resolve. Add a recommended order only when a dependency between bundles or genuine urgency makes one order materially preferable; otherwise present the queue without steering.

Load a single selected bundle's full body only once it is chosen. Resolve one bundle per run; the user reinvokes you for the next.

## Resolution loop

For the selected bundle, work its points one at a time:

1. Present the next unresolved point in chat, framed per the format in `references/shared/formats/discussion-point.md`, then let the user settle it. Take one point per turn; do not batch.
2. Once the user settles the point, record the outcome per `## Recording decisions` — which routes an answer carrying genuine new intent into a `DR<N>` record and leaves a mere request-repair clarification unrecorded.
3. Remove that settled point from the bundle file so the file always holds only unresolved points — the remaining body is the complete resumption state if the user pauses.
4. Repeat until no unresolved points remain, then delete the exhausted bundle file.

## Recording decisions

Route each settled point at resolution time. An answer that settles genuine new intent becomes a durable record: append it to the thread-root `decisions.md` as a self-contained `DR<N>` record, following the shape, sequential numbering, and append-only rules in `references/shared/formats/decision-record.md`. An answer that merely repairs which input the producer originally meant is a clarification, not new intent — it settles the point (so the point is still consumed from the queue) but is not recorded as a decision.

## Follow-through

Once the bundle's decisions are recorded and the bundle is deleted, handle its suggested follow-up:

1. Reassess the bundle's `## Suggested action after resolving the decisions` paragraph against the decisions just made and the current repository state — the suggestion was written before the decisions existed and may now be off.
2. Offer the user your own recommended next action, which may adopt, refine, or reject the producer's suggestion. State it as a recommendation, then WAIT for the user's choice — do not act first.
3. **If the user accepts**, perform the bounded application and recheck yourself, directly from the target, the new decision records, and the agreed action — once. Do not invoke another skill to do it unless the user explicitly names one. If this continuation uncovers genuinely new human judgment that only the user can settle, emit a new bundle via `/emit-pending-decisions` and stop.
4. **If the user declines or defers**, stop cleanly; the decisions are already recorded.

The continuation runs exactly once. Never automatically open, discuss, or consume a newly emitted bundle in the same run — the user reinvokes you when they are ready for it.
