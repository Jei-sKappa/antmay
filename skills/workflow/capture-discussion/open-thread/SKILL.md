---
name: open-thread
description: Open a durable workflow thread on disk — interpret the user's idea, an optional tracker ticket, and a chosen workflow, then compose the seed and hand normalized creation to the thread-creation primitive — use when a unit of work needs a home before any proposal, spec, or plan exists.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.1.0
---

# Open Thread

Turn a user's starting point into a durable thread on disk. You interpret the raw input, resolve the workflow the thread starts from, compose the seed's fields, and delegate the actual folder-and-file creation to `/allocate-thread`. You do the judgment; the primitive does the normalized write.

## Inputs you accept

A single invocation supplies:

1. A **rough idea** in prose, and/or an **external ticket reference** (a tracker URL or identifier), describing what the work is.
2. **A workflow** the thread starts from — supplied as **either**:
   - a **built-in template name**: `Quick`, `Standard`, or `Roadmap`; or
   - a **complete custom `## Suggested workflow`** section written out in full.

The workflow name is invocation input only. A thread is opened *from* a workflow; it does not carry a workflow type. Persist no workflow name, no progress markers, and no lifecycle values anywhere in the seed.

## Resolve the workflow

- **Built-in name** — resolve it against this skill's own references and copy that file's `## Suggested workflow` section **verbatim**:
  - `Quick` → `references/shared/workflows/quick.md`
  - `Standard` → `references/shared/workflows/standard.md`
  - `Roadmap` → `references/shared/workflows/roadmap.md`

  Use the resolved section exactly as written — do not paraphrase, trim, or reorder it.
- **Complete custom suggestion** — use the text the user supplied, as given.
- **Neither supplied** — **ask** the user which workflow to start from. Never infer a workflow from the task's subject, apparent size, or complexity, and never substitute a default.

## Compose the seed fields

From the user's input (and, when a ticket is linked, its content), assemble the fields `/allocate-thread` needs:

- **Slug** — a short kebab-case description of the subject (`auth-boundary`, `rate-limit-fix`).
- **Title** — a human-readable one-line title for the thread.
- **Genesis narrative** — a self-contained account of what triggered the work and its intended outcome, written so a reader with no chat history understands why the thread exists. When a ticket is linked, draw this from the ticket's title and body.
- **Suggested workflow** — the resolved `## Suggested workflow` text from the step above.
- **Conditional metadata** — include a line only when it carries real information:
  - `External:` — only when a real tracker URL exists; its value is that URL. Never write `External: none` or any absence marker.
  - `Supersedes:` — only when a known supersession relationship is worth recording.

  Add no owner field and no empty or placeholder fields. Absent metadata is simply absent.

## Delegate creation to `/allocate-thread`

Invoke `/allocate-thread` with a complete **caller-authorization block** so it can allocate the thread. The block names the invoking operation and every normalized field:

- **Operation** — `/open-thread`.
- **Slug** and **Title** — as composed above.
- **Genesis narrative** — the full self-contained text.
- **Suggested workflow** — the complete `## Suggested workflow` text, verbatim.
- **Conditional metadata** — the `External:` and/or `Supersedes:` lines that apply, and an explicit statement that the others do not.

Before delegating, show the user the composed slug, title, `## Suggested workflow`, and any `External:`/`Supersedes:` values, and invite a single round of corrections. Fold any adjustment into the field values, then delegate. This is a brief confirmation, not a drawn-out dialogue — one pass is enough.

`/allocate-thread` allocates the timestamped folder, writes `seed.md` from these fields, and eagerly creates a header-only `decisions.md`. Supply the whole block in exactly one invocation; do not fabricate the folder path or write the files yourself. `/allocate-thread` has no update path — a second invocation would mint a separate thread folder, so all corrections must land before this single call.

## External references are passive

A linked ticket is read for context only, and its URL is recorded in `External:`. Perform no tracker writes — no backlink comments, no status transitions, no closures — and never make thread creation depend on tracker access. If a supplied ticket must be read to build a self-contained genesis narrative and read access is unavailable, ask the user to paste the relevant title and body rather than failing or partially creating state.

## Report

This is a completion-oriented operation, not a dialogue. After `/allocate-thread` returns, report the created thread's folder path to the user. Corrections are gathered before delegation, not after — do not re-run the delegation.

End with exactly this line, nothing before it — no preamble, no closing remark: `Outcome: DONE — Thread opened: <folder path>`.
