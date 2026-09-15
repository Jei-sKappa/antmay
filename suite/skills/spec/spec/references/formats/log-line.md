# Log-line format

`log.md` sits at the thread root and is the thread's memory: the running record of what settled as the work was understood. It has no identifier of its own beyond the thread that holds it.

## Shape

```text
# Thread log

- (type) gist with the reason folded in
```

### Types

- `decision` — a choice that has been settled and that later work rests on.
  Example: `- (decision) exports go through the queue worker, because the request path cannot hold a multi-minute job`
- `constraint` — a boundary the work must respect, whether external or chosen.
  Example: `- (constraint) the public API shape stays as published, since three external clients depend on it`
- `assumption` — something the user and the agent take as true without confirmation, which later work may need to revisit.
  Example: `- (assumption) the nightly batch runs under ten minutes, based on last quarter's timings`
- `question` — something open that still needs an answer.
  Example: `- (question) whether partial exports should be retained or discarded when a run fails`
- `capability` — something the work can now do, or that the surrounding system offers.
  Example: `- (capability) the storage layer can already stream large objects, so no new transport is needed`
- `direction` — where the work is heading, above the level of any single choice.
  Example: `- (direction) the thread is moving the whole reporting surface off the synchronous path`
- `event` — a moment in the thread's life, such as an artifact being authored or the thread closing.
  Example: `- (event) spec authored from the conversation`

## Rules

- The file opens with the single header line `# Thread log`, and everything after it is a flat sequence of one-line entries.
- Each entry is exactly one line, and its gist states what settled and carries its reason in the same sentence.
- A line has no identifier and no timestamp; order in the file is the only structure.
- Every line uses one of the seven types listed under `### Types`.
- A thought that fits none of the seven types is not a log entry and is left out of the file.
- A terminal moment — an artifact authored, a run blocked, the thread closed — is an `event` line; the log carries no lifecycle status field.
- The file is append-only: a later entry supersedes an earlier one on the same point, and the earlier one stays where it is, so the history remains intact.
