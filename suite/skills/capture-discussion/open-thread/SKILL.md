---
name: open-thread
description: Open a durable thread on disk from a rough idea and an optional tracker ticket — use when a unit of work needs a home before any proposal, spec, or plan exists.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.2.0
---

# Open Thread

Turn a user's starting point into a durable thread on disk. You interpret the raw input, compose the seed's fields, and delegate the actual folder-and-file creation to `/allocate-thread`. You do the judgment; the primitive does the normalized write.

## Inputs you accept

A single invocation supplies a **rough idea** in prose, and/or an **external ticket reference** (a tracker URL or identifier), describing what the work is. The seed records why the work exists: persist no recipe name, no progress markers, and no lifecycle values anywhere in it.

## Read a supplied ticket

When the invocation carries a ticket reference, read that ticket before composing anything.

Determine which tracker the reference belongs to from its host, then read the matching reference under `references/trackers/` — for a `github.com` ticket that is `references/trackers/github.md`. It carries the availability check, the read command, and the reference forms for that tracker.

Take any ticket the user hands you. A ticket carries no marker or label that this operation checks, and there is no separate mode for one kind of ticket over another: a reference is a reference.

Read the ticket for context only. Perform no tracker writes of any kind — no backlink comments, no label changes, no status transitions, no closures — and never make thread creation depend on tracker access. If the tracker is unavailable or unauthenticated, ask the user to paste the ticket's title and body, then continue from what they supply. Never fail the invocation and never create partial state over a read that did not work.

## Check for an existing thread on the same ticket

Once you hold a ticket reference, search the seeds of existing threads under `docs/threads/` — including `docs/threads/archive/` — for an `External:` value denoting the same ticket. Compare references by their meaning rather than as raw strings: per the tracker reference, a full URL, the same URL with a trailing slash, and a short `#<number>` form all denote one ticket.

When a thread already exists for the ticket, name that thread's folder path and ask the user whether to continue. A confirmed continue proceeds through the ordinary path below, unchanged — a second thread on one ticket is legitimate for follow-up or superseding work. This check informs the user; it never blocks the operation.

## Compose the seed fields

From the user's input (and, when a ticket is linked, its content), assemble the fields `/allocate-thread` needs:

- **Slug** — a short kebab-case description of the subject (`auth-boundary`, `rate-limit-fix`). When a ticket is linked, derive it from that ticket's subject the same way, and keep the ticket's number out of it: the identifier belongs in `External:`, which is what links the thread to the ticket, so a thread opened from a ticket is named exactly like one opened from prose.
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

## Report

After `/allocate-thread` returns, report the created thread's folder path to the user, and keep the successful response focused on that path. Do not re-run the delegation to fold in a change the user raises after the report.
