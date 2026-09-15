---
name: open-thread
description: Open a durable thread on disk from a rough idea, a tracker ticket, or a roadmap entry.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Open Thread

Turn a user's starting point into a durable thread on disk. You interpret the raw input, compose the seed's fields, confirm them with the user in one pass, and create the thread.

## Inputs

Gather the following before composing any field; the composition below works from what you gather here.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the starting point.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- The ticket, when supplied — material for composing the seed; read it as `<skill_path>/references/supplied-ticket.md` directs.
- The roadmap index under `.wip/roadmaps/`, when supplied — a project-level file for composing the seed. Find the entry in it as a heading whose text is the supplied slug, in the shape `<skill_path>/references/formats/roadmap-index.md` defines, and read that entry's sketch and scope boundary. When the index carries no heading with that slug, create nothing: tell the user the slug is absent and name the slugs the index does carry, so they can correct the invocation.

The starting point itself comes with the invocation, in any combination of three forms, at least one of which is present:

- A **rough idea** in prose, describing what the work is.
- An **external ticket reference** — a tracker URL or identifier.
- A **roadmap entry** — an index path under `.wip/roadmaps/` together with the entry's slug.

## Compose the seed fields

The seed records why the work exists: it carries the thread's title, the genesis narrative, and the metadata lines that apply, and nothing besides.

From the user's input, and from the ticket or roadmap entry when one is linked, assemble these fields:

- **Slug** — a short kebab-case description of the subject (`auth-boundary`, `rate-limit-fix`). When a ticket is linked, derive it from that ticket's subject the same way, and keep the ticket's number out of it: the identifier belongs in `External:`, which is what links the thread to the ticket, so a thread opened from a ticket is named exactly like one opened from prose. When a roadmap entry is linked, the entry's own slug is the natural choice.
- **Title** — a human-readable one-line title for the thread.
- **Genesis narrative** — a self-contained account of what triggered the work and its intended goal, written so a reader with no chat history understands why the thread exists. When a ticket is linked, draw this from the ticket's title and body. When a roadmap entry is linked, draw it from the entry's sketch and scope boundary, written out so the thread stands on its own without the index open.
- **Conditional metadata** — include a line only when it carries real information:
  - `External:` — only when a real tracker URL exists; its value is that URL. Never write `External: none` or any absence marker.
  - `Roadmap:` and `Entry:` — only when the invocation names a roadmap entry, and then both together: `Roadmap:` carries the index path in the form `.wip/roadmaps/<yymmddhhmm>-<slug>.md`, and `Entry:` carries the entry slug as it reads in that index. They are what later work uses to find the entry this thread answers.
  - `Supersedes:` — only when a known supersession relationship is worth recording.

  Add no owner field and no empty or placeholder fields. Absent metadata is simply absent.

## Create the thread

Show the user the composed slug, title, genesis narrative, and any `External:`, `Roadmap:`/`Entry:`, or `Supersedes:` values, and invite a single round of corrections. This is a brief confirmation, not a drawn-out dialogue — one pass is enough. Fold any adjustment into the field values before writing anything: creating the thread a second time would mint a separate folder rather than correct the first, so every correction lands here.

Then follow `<skill_path>/references/instructions/create-thread.md` with those fields.

## What you write

The new thread folder with its `seed.md` and `log.md` is the whole result; `<skill_path>/references/formats/thread.md` fixes the layout it belongs to. Nothing else you touch is written: the ticket is read through its tracker with no tracker writes at all, and `docs/adr/`, `docs/glossary.md`, and the roadmap index are read here and never written.

## Report

Report the created thread's path to the user, and keep the successful response focused on that path.
