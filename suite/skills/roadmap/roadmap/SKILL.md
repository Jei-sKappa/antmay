---
name: roadmap
description: Author a settled direction into the project-level roadmap index under docs/roadmaps/ — a destination, ordered slug-headed entries with a sketch and a scope boundary, an out-of-scope list, and a not-yet-specified note — drawn from the thread's own discussion; use when a thread has agreed where a larger direction is going and it needs writing down as a map.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.2.0
---

# Roadmap

Turn a settled direction into a durable map. You read the thread's authoritative inputs, decide how the direction divides into entries that can each be picked up on their own, and write one project-level index file under `docs/roadmaps/`. Writing that file is where you stop — do not stage, commit, or push.

The index is a map, not a plan: it records where the direction is going and what gets there, at the coarsest grain that still tells someone what to pick up next.

## Inputs

Gather all of these before drafting; everything below works from what you gather here.

- `docs/adr/` — the project ADR catalog, listed with the command in `references/formats/adr.md`; open the records relevant to the direction. Authoritative.
- `docs/glossary.md` — the project's terms. Authoritative.
- The thread's `seed.md` — why the thread exists and what the direction is meant to reach. Authoritative for intent.
- The thread's `spec.md`, when the thread's owner authored one — the direction's design truth. Authoritative.
- The thread's `adr/` and `glossary.md` — the direction's settled constraints and terms, authoritative within the thread. These records are the constraints that bind the threads opened from the index's entries, and they reach those threads by landing in `docs/adr/` when this thread closes, so the index restates none of them.

Run a mandatory preflight before any substantive execution (authoring the index). Every preflight failure writes nothing, emits no bundle, and ends `Outcome: REFUSED — <reason and how to re-invoke>`. Resolve the thread first: work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`; if `cwd` already sits inside a thread root, that is the thread. Refuse when no thread exists yet, or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp). Then validate the inputs: refuse when a required authoritative input is missing, or when which input is meant is ambiguous — name the missing or ambiguous input and how to supply it rather than guessing or picking by recency.

## Author the index

Write one file, `docs/roadmaps/<yymmddhhmm>-<slug>.md`, in the shape `references/formats/roadmap-index.md` defines, creating `docs/roadmaps/` on demand.

- **The stamp** is the file's creation time in UTC at minute resolution.
- **The slug** is the thread's own slug, unless the invocation names one, in which case use that. Naming it from the thread is what lets `finish` and `whats-next` find the index a thread authored.
- **When a file of that name already exists**, write nothing and end `Outcome: REFUSED — <the existing path>`: an index is authored once and edited in place from then on.

What the file holds:

- **The destination** — what reaching this direction means, and how it will be recognised.
- **The entries**, in order, each a heading whose text is a short kebab-case slug unique within the index. That slug is the entry's identifier, recorded together with the index path in the seed of a thread opened from it, so choose slugs that read as names and keep them distinct. Beneath the heading goes a one-paragraph sketch of the work the entry covers, then a `Scope:` line drawing its boundary — what it includes and where it stops.
- **The out-of-scope list** — what the direction deliberately excludes.
- **The not-yet-specified note** — what cannot yet be seen well enough to become an entry.

The index carries no shared-constraints section, no status field or checkbox on an entry, no brief for the work an entry names, and no companion file for feedback from the threads its entries open. Constraints that bind those threads are ADRs, which reach them through `docs/adr/`; the detail of an entry's work is produced by the discussion in the thread opened from it; and an entry's outcome is written beneath its heading by `close-thread` when that thread closes.

## Boundaries

- **You create the index file and write nothing else.** Creating an index file is this skill's alone. Everything else you touch is read and never written: the thread's `seed.md`, `spec.md`, `adr/`, and `glossary.md`, and the project's `docs/adr/` and `docs/glossary.md`.
- **The index is the owner's to edit afterwards.** Reordering, merging, and dropping unstarted entries are hand edits its owner makes in the file.
- **Open no threads.** An entry becomes a thread when the frontier reaches it and the user invokes `open-thread`, naming this index's path and the entry's slug.

## Blocked

This path is reachable only after preflight has passed and authoring the index from otherwise-valid inputs has begun — substantive execution. Ambiguous inputs and missing required artifacts are preflight refusals (`## Inputs`), not this path. It applies to a genuine choice about the direction discovered during authoring that existing durable intent does not settle — an answer that settles product or process intent, such as where an entry's scope boundary falls or how the direction divides, that you cannot settle yourself from the gathered inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat.

Hand the open decision(s) to `/emit-pending-decisions` as one bundle, giving it:

- `/roadmap` as the producing skill.
- The index path you were authoring as the target.
- The originating user request.
- One point per open decision, each stating what the decision blocks, why you could not derive the answer from the gathered inputs, and the evidence you weighed — in your own words. Add a free-text suggestion to a point only when you see an immediate fix.

A blocked run leaves no index file behind, so the invocation that follows the settled decisions authors the whole map at once. Stop with a concise notification of where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

## Report

This is a completion-oriented operation, not a dialogue. After writing the file, report concisely where the index is and what it maps out, and recommend closing the thread with `close-thread`, so the direction's records land in `docs/adr/` before any entry is worked. End with `Outcome: DONE — Roadmap index written: docs/roadmaps/<file>`. No preamble, no closing remark.
