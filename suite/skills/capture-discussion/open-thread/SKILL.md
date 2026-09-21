---
name: open-thread
description: Open a durable thread on disk from a rough idea, a tracker ticket, or a roadmap entry.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Open Thread

Turn a user's starting point into a durable thread on disk. You interpret the raw input, compose the seed's fields, and create the thread — in one pass, without stopping to confirm anything.

## Inputs

Gather the following before composing any field; the composition below works from what you gather here.

- The project's `AGENTS.md`, when the file exists — the project's standing guidance for agents working in it.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be used in everything you write.
- `docs/architecture/<module>.md` for each module the work touches, read via `/consult-descriptions` — how the system is structured now.
- `docs/product/<capability>.md` for each capability the work touches, read via `/consult-descriptions` — what the product does now.
- `docs/adr/` and `docs/pdr/`, read via `/consult-decisions` — the project decisions bearing on the starting point.
- The roadmap index under `.work/roadmaps/`, when supplied — a project-level file for composing the seed. Find the entry in it as a heading whose text is the supplied slug, in the shape `<skill_path>/references/formats/roadmap-index.md` defines, and read that entry's sketch and scope boundary. When the index carries no heading with that slug, create nothing: tell the user the slug is absent and name the slugs the index does carry, so they can correct the invocation.
- The ticket, when supplied — material for composing the seed; read it as `<skill_path>/references/supplied-ticket.md` directs.

The starting point itself comes with the invocation, in any combination of three forms, at least one of which is present:

- A **rough idea** in prose, describing what the work is.
- An **external ticket reference** — a tracker URL or identifier.
- A **roadmap entry** — an index path under `.work/roadmaps/` together with the entry's slug.

## Compose the seed fields

The seed records why the work exists: it carries frontmatter for the relationships that apply, the thread's title, and the genesis narrative, and nothing besides.

From the user's input, and from the ticket or roadmap entry when one is linked, assemble these fields:

- **Slug** — a short kebab-case description of the subject (`auth-boundary`, `rate-limit-fix`). When a ticket is linked, derive it from that ticket's subject the same way, and keep the ticket's number out of it: the identifier belongs in the frontmatter's `external` field, which is what links the thread to the ticket, so a thread opened from a ticket is named exactly like one opened from prose. When a roadmap entry is linked, the entry's own slug is the natural choice.
- **Title** — a human-readable one-line title for the thread.
- **Genesis narrative** — an account of what triggered the work and its intended goal, meant to stand on its own so a reader with no chat history understands why the thread exists. It is carried by up to two pieces, at least one of which is always present:
  - **The ticket's body**, when a ticket is linked — carried through unchanged, for the create instruction to quote under its own heading, with nothing of your own composed around it.
  - **The composed intent**, for everything else the invocation supplied: the user's prose, the context they added alongside a linked ticket, or a linked roadmap entry's sketch and scope boundary. Restructure that material into standalone prose and write it impersonally — the seed speaks about the work, never as the user in the first person. The rewrite changes voice, not certainty: what the invocation supplied tentatively stays tentative, restated as tentativeness in impersonal words — "is an option under consideration", "is a possible approach", phrasings like these rather than fixed wording — and a question or an alternative the user mentioned is never restated as a settled direction.

  The composed intent adds nothing. It reorganizes what the invocation supplied and never supplies a motivation, a constraint, a scope boundary, or an open question of its own; a claim the user did not make does not become true by appearing in a file the work downstream reads as intent. The one permitted extension is a linked roadmap entry, where you may inline what the index's surrounding frame supplied so the thread stands on its own without the index open.

  A thin invocation therefore yields a thin seed. Where the whole starting point is one sentence, the composed intent is that sentence restated, even when it says little more than the title does; write it, create the thread, and say nothing anywhere about the seed being sparse. A near-empty seed is the accurate record of a near-empty starting point, and it is read as one.
- **Frontmatter** — include a relationship only when it carries real information:
  - `external` — only when a real tracker URL exists; its value is that URL.
  - `roadmap` — only when the invocation names a roadmap entry. It is a mapping whose `path` is the index path in the form `.work/roadmaps/<yymmddhhmm>-<slug>.md` and whose `entry` is the entry slug as it reads in that index. Both values are always present together; they are what later work uses to find the entry this thread answers.

  Add no owner field and no empty or placeholder fields. When no relationship applies, the seed carries no frontmatter block.

## Create the thread

Follow `<skill_path>/references/instructions/create-thread.md` with those fields as soon as they are composed. Do not show them for approval first and do not ask anything on the way: a thread is a folder in the user's own repository that nothing has read yet, so a field that came out wrong is an edit to `seed.md` or a rename of the folder, and a confirming pass costs more than it saves. Nothing here leaves the repository, which is what a write to a tracker could not say.

## What you write

The new thread folder with its `seed.md` and `log.md` is the whole result; `<skill_path>/references/formats/thread.md` fixes the layout it belongs to. Nothing else you touch is written: the ticket is read through its tracker with no tracker writes at all, and `docs/adr/`, `docs/glossary.md`, and the roadmap index are read here and never written.

## Report

Report the created thread's path, and with it the composed slug, the title, and the frontmatter fields the seed carries. Where the ticket already had a thread, name that thread's path too.

Do not print the genesis narrative. A linked ticket's body is text the user already holds in the tracker and can read in `seed.md`, and the composed intent carries nothing the user did not supply, so reciting either back spends output on words the user already has. The report names what you chose, not what you restated.
