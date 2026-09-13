# ADR format

An ADR records one project-level decision in one file, named `<yymmddhhmm>-<slug>.md`, where the stamp is the record's creation time in UTC at minute resolution and the slug is a short kebab-case name for the decision. The stem — the filename without its extension — is the record's global identifier. Location is the status: a record in a thread's `adr/` is a draft, a record in `docs/adr/` is current for the project, and a record in `docs/adr/superseded/` has been superseded or retired.

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
- There is no status key, because location is the status.
- The stem is assigned when the record is first written into the thread's `adr/` and never changes; the record lands in `docs/adr/` unaltered when the thread closes.
- A draft in the thread's `adr/` is authoritative for that thread from the moment it is written, and it is editable in place until the thread closes, which is the only in-place editing of a record the method permits.
- The body is free in form and required in content: it gives the context needed to understand the decision without the thread, states the decision in full, and gives the reason. A single paragraph satisfies that.
- Further sections — considered options, consequences, and scope are the usual candidates — appear only when they carry something the required content does not, under headings chosen to fit the record.
