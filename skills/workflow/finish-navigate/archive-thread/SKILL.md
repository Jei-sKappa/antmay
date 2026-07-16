---
name: archive-thread
description: Relocate a workflow thread into docs/threads/archive/ so the active docs/threads/ listing shows only live work; use when the user explicitly asks to archive a finished or abandoned thread and declutter the listing.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.2.0
disable-model-invocation: true
---

# Archive Thread

Archive a workflow thread by relocating its folder from the active `docs/threads/` listing into `docs/threads/archive/`. This is the act that ends a thread's active lifecycle: once its folder sits under `archive/`, the thread is no longer live work.

Archiving happens on **explicit user intent only**. Never scan for archivable threads on your own initiative, and run **no completion checks of any kind** — you do not inspect any status or report to decide whether the thread "deserves" archival. If the user asks to archive a thread, that intent is the whole authorization.

This is a dialogue-driven handshake: obtaining human input is part of its normal job, so its questions and confirmations are expected output rather than a stalled or failed run. Disambiguating which thread the user means, asking for one confirmation before archiving over a non-empty workspace folder, and suggesting the user first record an abandonment are all ordinary execution of this handshake — none of them is a blocked or refused path.

## Resolve the target thread

The user names the thread to archive (by slug or by path). A thread root is a folder directly under `docs/threads/` named with a UTC-timestamp slug (e.g. `docs/threads/250522143000Z-my-feature/`). If which thread the user means is ambiguous, ASK — never silently pick one. `docs/threads/archive/` is the archive container, not a thread; ignore it when resolving a target.

## Pre-move inspection

Before moving, look inside the target thread for three workspace folders that hold unfinished state:

- **`.pending-decisions/`** — bundles of decisions awaiting a human.
- **`.pending-reviews/`** — recorded review findings not yet acted on.
- **`.implementation-runs/`** — interrupted or abandoned run state.

If any of these is non-empty, **name what it contains** — the bundle titles or headers in `.pending-decisions/` and `.pending-reviews/`, the interrupted run identifiers in `.implementation-runs/` — and ask the user for **one** confirmation to archive anyway. This is an advisory signal so the user archives with eyes open, not a gate: a single confirmation is enough, and the user may always proceed.

On confirmed archival these folders move along with the thread, **untouched**. Never delete them or anything inside them, and never empty them "to tidy up" — inside an archived thread they are inert residue with no remaining workflow meaning, and removing them destroys durable record for no benefit.

## Recording an abandonment first

When the user is archiving work that was never finished, suggest they first record the abandonment as a decision in the thread's `decisions.md` — what was abandoned and why. This is guidance, not a requirement: the user may decline and you archive regardless. Its purpose is that the thread's own durable content then distinguishes a completed thread from an abandoned one, rather than leaving the reason to memory.

## The move

Relocate the thread folder into the archive container, creating the container on demand:

```sh
mkdir -p docs/threads/archive
git mv docs/threads/<thread-folder> docs/threads/archive/<thread-folder>
```

The archive is flat — no year/month/day sub-buckets. The slug is preserved unchanged; `archive/` is only added as a path prefix. Report the thread's new path together with the accepted warning that references pointing at the thread may break (see the limitation below). Keep the successful response focused on those two facts; emit no terminal outcome line and no outcome token — this dialogue-driven handshake has no terminal outcome.

## Accepted limitation: references may break

Any repo-relative reference that points *at* this thread — a parent/child thread link, a decision reference from elsewhere — embeds the old `docs/threads/<thread-folder>/…` path and will no longer resolve once the folder moves under `docs/threads/archive/`. Tell the user this may happen; it is an accepted cost of archival. Do **not** attempt to discover, rewrite, redirect, or repair those references, and do not edit any file inside another thread to fix them.
