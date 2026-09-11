# Log-line format

`log.md` sits at the thread root and is the thread's memory. It opens with the single header line `# Thread log`, and everything after it is a flat sequence of one-line entries.

## The line

Each entry is exactly one line:

```text
- (type) gist with the reason folded in
```

The gist states what settled and carries its reason in the same sentence. A line has no identifier and no timestamp; order in the file is the only structure.

## The seven types

The vocabulary is exactly these seven, and every line uses one of them:

- `decision` — a choice that has been settled and that later work rests on.
- `constraint` — a boundary the work must respect, whether external or chosen.
- `assumption` — something taken as true without confirmation, which later work may need to revisit.
- `question` — something open that still needs an answer.
- `capability` — something the work can now do, or that the surrounding system offers.
- `direction` — where the work is heading, above the level of any single choice.
- `event` — a moment in the thread's life, such as an artifact being authored or the thread closing.

One example line per type:

```text
- (decision) exports go through the queue worker, because the request path cannot hold a multi-minute job
- (constraint) the public API shape stays as published, since three external clients depend on it
- (assumption) the nightly batch runs under ten minutes, based on last quarter's timings
- (question) whether partial exports should be retained or discarded when a run fails
- (capability) the storage layer can already stream large objects, so no new transport is needed
- (direction) the thread is moving the whole reporting surface off the synchronous path
- (event) spec authored from the conversation
```

A terminal moment — an artifact authored, a run blocked, the thread closed — is an `event` line; the log carries no lifecycle status field.

## Appending

The file is append-only. An earlier entry on the same point is superseded by a later one and stays where it is, so the history remains intact.

Append with a single-line shell append:

```sh
printf '%s\n' '- (decision) exports go through the queue worker, because the request path cannot hold a multi-minute job' >> docs/threads/<thread>/log.md
```

Use the shell append (`>>`); never open `log.md` with a file-editing tool. There is one writer per session: a skill that fans out to subagents appends only from the orchestrator.
