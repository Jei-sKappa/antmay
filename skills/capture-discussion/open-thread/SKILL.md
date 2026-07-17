---
name: open-thread
description: Open a durable workflow thread on disk from a rough idea and an optional tracker ticket — use when a unit of work needs a home before any proposal, spec, or plan exists.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 3.0.1
---

# Open Thread

Turn a user's starting point into a durable thread on disk. You interpret the raw input, compose the seed's fields, and delegate the actual folder-and-file creation to `/allocate-thread`. You do the judgment; the primitive does the normalized write.

## Inputs you accept

A single invocation supplies a **rough idea** in prose, and/or an **external ticket reference** (a tracker URL or identifier), describing what the work is. The seed records why the work exists: persist no workflow name, no progress markers, and no lifecycle values anywhere in it.

## Compose the seed fields

From the user's input (and, when a ticket is linked, its content), assemble the fields `/allocate-thread` needs:

- **Slug** — a short kebab-case description of the subject (`auth-boundary`, `rate-limit-fix`).
- **Title** — a human-readable one-line title for the thread.
- **Genesis narrative** — a self-contained account of what triggered the work and its intended outcome, written so a reader with no chat history understands why the thread exists. When a ticket is linked, draw this from the ticket's title and body.
- **Conditional metadata** — include a line only when it carries real information:
  - `External:` — only when a real tracker URL exists; its value is that URL. Never write `External: none` or any absence marker.
  - `Supersedes:` — only when a known supersession relationship is worth recording.

  Add no owner field and no empty or placeholder fields. Absent metadata is simply absent.

## Delegate creation to `/allocate-thread`

Invoke `/allocate-thread` with a complete **caller-authorization block** so it can allocate the thread. The block names the invoking operation and every normalized field:

- **Operation** — `/open-thread`.
- **Slug** and **Title** — as composed above.
- **Genesis narrative** — the full self-contained text.
- **Conditional metadata** — the `External:` and/or `Supersedes:` lines that apply, and an explicit statement that the others do not.

Before delegating, show the user the composed slug, title, and any `External:`/`Supersedes:` values, and invite a single round of corrections. Fold any adjustment into the field values, then delegate. This is a brief confirmation, not a drawn-out dialogue — one pass is enough.

`/allocate-thread` allocates the timestamped folder, writes `seed.md` from these fields, and eagerly creates a header-only `decisions.md`. Supply the whole block in exactly one invocation; do not fabricate the folder path or write the files yourself. `/allocate-thread` has no update path — a second invocation would mint a separate thread folder, so all corrections must land before this single call.

## External references are passive

A linked ticket is read for context only, and its URL is recorded in `External:`. Perform no tracker writes — no backlink comments, no status transitions, no closures — and never make thread creation depend on tracker access. If a supplied ticket must be read to build a self-contained genesis narrative and read access is unavailable, ask the user to paste the relevant title and body rather than failing or partially creating state.

## Report

After `/allocate-thread` returns, report the created thread's folder path to the user, and keep the successful response focused on that path. Do not re-run the delegation to fold in a change the user raises after the report.
