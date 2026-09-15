---
name: roadmap
description: Author a settled direction into a project-level roadmap index of ordered entries.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Roadmap

Turn a settled direction into a durable map. You read the thread's authoritative inputs, decide how the direction divides into entries that can each be picked up on their own, and write one project-level index file under `.work/roadmaps/`. Writing that file is where you stop — do not stage, commit, or push.

The index is a map, not a plan: it records where the direction is going and what gets there, at the coarsest grain that still tells someone what to pick up next.

## Inputs

Gather all of these before drafting; everything below works from what you gather here.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the direction.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- The thread's `seed.md` — why the thread exists and what the direction is meant to reach.
- The thread's `spec.md`, when the file exists — the direction's design truth.
- The thread's `adr/` and `glossary.md` — the direction's settled constraints and terms, which inside the thread take precedence over the project records. These records are the constraints that bind the threads opened from the index's entries, and they reach those threads by landing in `docs/adr/` when this thread closes, so the index restates none of them.

Run a mandatory preflight before any substantive execution (authoring the index). Every preflight failure writes nothing, emits no bundle, and follows `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the reason and how to re-invoke. Validate the inputs: refuse when a required authoritative input is missing, or when which input is meant is ambiguous — name the missing or ambiguous input and how to supply it rather than guessing or picking by recency.

## Author the index

Write one file, `.work/roadmaps/<yymmddhhmm>-<slug>.md`, in the shape `<skill_path>/references/formats/roadmap-index.md` defines, creating `.work/roadmaps/` on demand.

- **The stamp** is the file's creation time in UTC at minute resolution.
- **The slug** is the thread's own slug, unless the invocation names one, in which case use that.
- **When a file of that name already exists**, write nothing and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and the existing path: an index is authored once and edited in place from then on.

What the file holds:

- **The destination** — what reaching this direction means, and how it will be recognised.
- **The entries**, in order, each a heading whose text is a short kebab-case slug unique within the index. That slug is the entry's identifier, recorded together with the index path in the seed of a thread opened from it, so choose slugs that read as names and keep them distinct. Beneath the heading goes a one-paragraph sketch of the work the entry covers, then a `Scope:` line drawing its boundary — what it includes and where it stops.
- **The out-of-scope list** — what the direction deliberately excludes.
- **The not-yet-specified note** — what cannot yet be seen well enough to become an entry.

## Boundaries

- **You create the index file and write nothing else.** Creating an index file is this skill's alone. Everything else you touch is read and never written: the thread's `seed.md`, `spec.md`, `adr/`, and `glossary.md`, and the project's `docs/adr/` and `docs/glossary.md`.
- **The index is the owner's to edit afterwards.** Reordering, merging, and dropping unstarted entries are hand edits its owner makes in the file.
- **Open no threads.** An entry becomes a thread when the frontier reaches it and the user invokes `open-thread`, naming this index's path and the entry's slug.

## Blocked

This path is reachable only after preflight has passed and authoring the index from otherwise-valid inputs has begun — substantive execution. Ambiguous inputs and missing required artifacts are preflight refusals (`## Inputs`), not this path. It applies to a genuine choice about the direction discovered during authoring that existing durable intent does not settle — an answer that settles product or process intent, such as where an entry's scope boundary falls or how the direction divides, that you cannot settle yourself from the gathered inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat.

Queue the open decision(s): follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, the index path you were authoring as the target, and the originating user request.

A blocked run leaves no index file behind, so the invocation that follows the settled decisions authors the whole map at once. Stop with a concise notification of where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`.

## Report

This is a completion-oriented operation, not a dialogue. After writing the file, report concisely where the index is and what it maps out, and recommend closing the thread with `close-thread`, so the direction's records land in `docs/adr/` before any entry is worked. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `Roadmap index written: .work/roadmaps/<file>`. No preamble, no closing remark.
