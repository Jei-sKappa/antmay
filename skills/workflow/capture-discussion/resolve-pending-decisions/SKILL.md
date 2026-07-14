---
name: resolve-pending-decisions
description: Settle the thread's queued pending decisions interactively and record the outcomes — use when a queue of pending-decision bundles is waiting for a human to work through their open questions and turn each settled choice into a durable decision record.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Resolve Pending Decisions

Work through queued pending-decision bundles with the user, one bundle and one point at a time, turning each settled choice into a durable `D<N>` record in the thread's `decisions.md`. Bundles are the transient queue of open human decisions an earlier operation could not settle on its own; you are the interactive bridge that empties them. You settle only genuine human decisions that a bundle already contains — you do not audit the repository, judge the quality of any artifact, or invent points a bundle does not hold.

## Resolve the thread

Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp. Bundles live under that thread's `.pending-decisions/` folder; decisions are recorded to that thread's root `decisions.md`.

## Select a bundle

- **With an explicit bundle path argument**, load only that bundle and go straight to the resolution loop.
- **Without a path**, list the files under the active thread's `.pending-decisions/` folder and read ONLY each file's routing header (`Producer`, `Target`, `Created`, `Points`, `Summary`). Never open a bundle's discussion-point bodies just to build the queue.
  - If the folder is empty or absent, tell the user there are no pending decisions and stop.
  - If exactly one bundle exists, select it directly.
  - If several exist, present a compact queue — one row per bundle showing its title, producer, target, summary, and point count — and let the user choose which to resolve. Add a recommended order only when a dependency between bundles or genuine urgency makes one order materially preferable; otherwise present the queue without steering.

Load a single selected bundle's full body only once it is chosen. Resolve one bundle per run; the user reinvokes you for the next.

## Resolution loop

For the selected bundle, work its points one at a time:

1. Present the next unresolved point through `/discussion-point`'s interactive presentation, then let the user settle it. Take one point per turn; do not batch.
2. Once the user settles the point, append a `D<N>` decision record to the thread-root `decisions.md`, using the record shape in `## Recording decisions`.
3. Remove that settled point from the bundle file so the file always holds only unresolved points — the remaining body is the complete resumption state if the user pauses.
4. Repeat until no unresolved points remain, then delete the exhausted bundle file.

## Recording decisions

Append every settled point to the thread-root `decisions.md` as a self-contained `D<N>` record. There is exactly one decision store; do not create per-bundle or per-topic logs.

Number records sequentially across the whole thread: scan `decisions.md` for the highest existing `D<N>` and use the next integer. If `decisions.md` is header-only, the first record is `D1`. (`decisions.md` already exists at the thread root; if it is somehow absent, create it with a short heading before appending.)

Each record is a durable projection of the outcome, not a transcript of the deliberation. Write it so a fresh agent understands what was decided, why, and where it applies without the chat or the bundle's discussion point:

```markdown
## D<N>: <Title>

Scope: <optional — omit this line entirely when the whole thread is the scope; otherwise name the stage, relationship, or thread-relative artifact path the decision applies to>

Context: <one short self-contained paragraph, written from the thread's perspective, stating the question and only the surrounding facts needed to understand the decision>

Decision: <the complete substantive resolution, written out in full>

Rationale: <why this resolution, its principal trade-off, and any facts that materially condition it>
```

Field rules:

- **Title** — a short line naming the decision.
- **Scope** — omit the line when the decision applies to the whole thread; otherwise name a stage, relationship, or thread-relative artifact path (e.g. `specs/001/spec.md`).
- **Context** — mandatory; normally one short paragraph stating the question and only the facts needed to understand it. Write it from the thread's perspective: never "in this chat", "as you said", or "the user chose B". It may reference an earlier record by ID (e.g. `D3`) when that reference resolves within `decisions.md`, and may reference thread artifacts by thread-relative path. It must not introduce a new decision or assumption.
- **Decision** — states the complete substantive resolution. Never a bare option letter like "A"; write the substance of what was chosen.
- **Rationale** — records why the choice was made, its principal trade-off, and any materially conditioning facts.

Do not copy the point's options menu, the recommendation, or general deliberation into the record. Records are append-only: never rewrite or delete an existing one. When a settled decision later changes, append a new record that names the record it supersedes and states the new resolution.

## Follow-through

Once the bundle's decisions are recorded and the bundle is deleted, handle its suggested follow-up:

1. Reassess the bundle's `## Suggested action after resolving the decisions` paragraph against the decisions just made and the current repository state — the suggestion was written before the decisions existed and may now be off.
2. Offer the user your own recommended next action, which may adopt, refine, or reject the producer's suggestion. State it as a recommendation, then WAIT for the user's choice — do not act first.
3. **If the user accepts**, perform the bounded application and recheck yourself, directly from the target, the new decision records, and the agreed action — once. Do not invoke another skill to do it unless the user explicitly names one. If this continuation uncovers genuinely new human judgment that only the user can settle, emit a new bundle via `/emit-pending-decisions` and stop.
4. **If the user declines or defers**, stop cleanly; the decisions are already recorded.

The continuation runs exactly once. Never automatically open, discuss, or consume a newly emitted bundle in the same run — the user reinvokes you when they are ready for it.
