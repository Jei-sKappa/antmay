---
name: archive-thread
description: Relocate finished or intentionally-abandoned workflow threads into docs/threads/archive/ (or move one back out) as a pure git mv that keeps cross-thread references resolvable; use when the docs/threads/ listing is cluttered with closed threads and you want to declutter it without breaking links.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Archive Thread

Move a closed workflow thread out of the crowded active `docs/threads/` listing into `docs/threads/archive/`, so active threads are easy to tell apart from finished or abandoned ones. Archiving is nothing more than **relocating the thread's folder** — one `git mv`. The inverse (moving a thread back out of the archive) is the same move reversed.

This skill restates the rules it relies on inline; it does not depend on any document outside its own folder.

## What "closed" means

A thread's disposition is the **last disposition line** in its `ledger.md` (the append-only file at the thread root). The line grammar is `<event> @ <YYMMDDHHMMSSZ> — <justification>`; the disposition events are `deferred`, `resumed`, `closed: done`, `closed: dropped`. A thread is **closed** iff its last disposition line is `closed: done` or `closed: dropped`.

A thread whose last disposition is `deferred` is **not** closed — `deferred` is a reversible pause, not a finished state. A thread with **no** disposition line at all is **active** (the resting default). Only `closed: done` / `closed: dropped` threads are archival candidates.

## Two input modes

- **Explicit-target mode** — the user names one thread or a list of threads (by slug or by path). Archive each named thread. A list is how you archive several at once (e.g. "all of this week's closed threads" is just the list of their slugs) — there is no separate date-range selector.
- **No-input mode** — no thread is named. Scan every thread under `docs/threads/`, collect the ones that are closed (per "What 'closed' means"), present that list to the user, and archive only the ones the user confirms.

When scanning, **skip the reserved `docs/threads/archive/` folder and everything beneath it** — those threads are already archived, and `archive/` is not itself a thread. Real thread folders always begin with a digit (their UTC stamp), so `archive/` is easy to exclude.

## The confirm-on-non-closed guard

In explicit-target mode, if a named thread is **not** closed (it is active, or `deferred`), do **not** archive it silently and do **not** flatly refuse. **Warn** the user that the thread is not closed and **require explicit confirmation** before moving it. A deliberate override is legitimate (e.g. shelving a thread you have abandoned but never marked `closed: dropped`) — but it must be a seen, confirmed choice.

## The move

Archiving is a pure folder move that git records as a rename:

```sh
# create the archive container once, if it does not exist yet
mkdir -p docs/threads/archive
git mv docs/threads/<slug> docs/threads/archive/<slug>
```

The archive is **flat** — no year/month/day sub-buckets. The slug is preserved unchanged; `archive/` is only a prefix.

Un-archiving is the same move reversed:

```sh
git mv docs/threads/archive/<slug> docs/threads/<slug>
```

## What this skill does NOT do

- **No link rewriting.** Do **not** scan for, edit, or rewrite any inbound `docs/threads/<slug>/…` reference, and do **not** edit any file inside any other thread. Link integrity is preserved by **resolvability**, not by literal-path validity: because a thread's slug is globally unique and travels with its folder (archiving only *prefixes* the path with `archive/`, it never renames the slug), any now-stale `docs/threads/<slug>/…` reference still contains that unique slug and is found in a single grep under `archive/`. Rewriting inbound links would mean editing frozen records inside closed threads — which this skill deliberately never touches. Do not "helpfully" re-add rewriting.
- **No writes into the thread.** Archiving is a location change, not a lifecycle transition. Write **nothing** into the moved thread: no "archived" ledger event (the ledger grammar has no such event), no marker file, no frontmatter change. Git's rename tracking is the only record needed.
- **No commit.** Perform the `git mv` (leaving the rename staged) and stop. Do **not** stage-and-commit, push, or branch — committing the move is the surrounding session's decision. Never rewrite history and never force-push.

## Judgment over machinery

Keep the operation simple and trust your own judgment for the obvious mistakes rather than expecting elaborate guards: don't re-archive a thread that is already under `archive/`, and don't un-archive a thread that is not in `archive/`. If something looks wrong (a slug that matches nothing, a thread that is already where it would be moved), say so and stop rather than moving blindly. The essential job is one `git mv`.

## Workflow

1. **Determine the targets.** If the user named thread(s), use explicit-target mode. If not, scan `docs/threads/` (skipping `archive/`), collect the closed threads, present the list, and let the user pick.
2. **Apply the confirm-on-non-closed guard** for any explicitly-named thread that is not closed.
3. **Move each confirmed target** with `git mv` into (or, for un-archiving, out of) `docs/threads/archive/<slug>/`, creating `docs/threads/archive/` first if needed. Write nothing else.
4. **Report** what was moved (and to where), and note that the moves are staged but not committed.

No closing remark.
