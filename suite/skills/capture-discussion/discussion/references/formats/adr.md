# ADR format

An ADR records one project-level decision in one file, named `<yymmddhhmm>-<slug>.md`, where the stamp is the record's creation time in UTC at minute resolution and the slug is a short kebab-case name for the decision. The stem — the filename without its extension — is the record's global identifier. Before closing, a record in a thread's `adr/` is a draft; after closing, that copy is the thread's historical snapshot. Project-layer location carries the decision's state: a record in `docs/adr/` is current, and a record in `docs/adr/superseded/` has been superseded or retired.

## Shape

```markdown
---
name: <a short title, written as a full decision sentence>
description: <one sentence for the catalog>
supersedes:
  - <stem of a project ADR this record replaces or retires>
---

<the context needed to understand the decision without the thread, the decision in full, and the reason>
```

## Rules

- `name` and `description` are always present: `name` states the decision as a full sentence, `description` summarises it in one sentence.
- `supersedes` is optional: omit the key entirely when the record replaces nothing, and list one stem per project ADR the record replaces or retires.
- There is no status key, because project-layer location carries whether the decision is current or superseded, while the thread's closing event distinguishes a draft from a historical snapshot.
- The stem is assigned when the record is first written into the thread's `adr/` and never changes; the record is copied into `docs/adr/` unaltered when the thread closes, and the thread copy remains in place.
- A draft in the thread's `adr/` is authoritative for that thread from the moment it is written and editable in place until the thread closes; after closing, it is an immutable historical snapshot of the record that landed.
- The body is free in form and required in content: it gives the context needed to understand the decision without the thread, states the decision in full, and gives the reason. A single paragraph satisfies that.
- Further sections — considered options, consequences, and scope are the usual candidates — appear only when they carry something the required content does not, under headings chosen to fit the record.
