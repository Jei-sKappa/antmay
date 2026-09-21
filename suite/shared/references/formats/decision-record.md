# Decision-record format

A decision record holds one project decision in one file, named `<yymmddhhmm>-<slug>.md`, where the stamp is the record's creation time in UTC at minute resolution and the slug is a short kebab-case name for the decision; the stem — the filename without its extension — is the record's global identifier. An **ADR** lives at `docs/adr/` and records how the system is structured or built; a **product decision record (PDR)** lives at `docs/pdr/` and records what the product does or for whom. The two share this format, and each folder has its own `superseded/`. A record is filed by the question it answers, never by how it is enforced: "learning data is private" is a PDR even where a database boundary enforces it, and that boundary belongs to the architecture description. Location carries the state: a record sitting in `docs/adr/` or `docs/pdr/` is current, and a record in that folder's `superseded/` has been superseded or retired. A record is drafted in a thread as a `create` delta document at `delta/docs/adr/<stem>.md` or `delta/docs/pdr/<stem>.md`, and lands in the project layer when the thread closes.

## Shape

```markdown
---
name: <the decision as a full sentence>
description: <one sentence for the catalog>
supersedes:
  - <stem of a record in the same folder this one replaces or retires>
---

<the context needed to understand the decision without the thread, the decision in full, and the reason for it>

## Rejected alternatives

- <an alternative that was argued> — <the reason it lost>

## Consequences

<what the decision commits the project to, and the condition under which it is revisited>
```

## Rules

- `name` and `description` are always present: `name` states the decision as a full sentence, `description` summarises it in one sentence for the catalog.
- `supersedes` is optional: omit the key entirely when the record replaces nothing, and list one stem per record it replaces or retires. Every stem it names lives in the same folder as the record itself; a record whose kind changes is a `delete` delta document against its old home plus a `create` delta document in the other folder.
- `## Rejected alternatives` is mandatory, one line per alternative with the reason it lost. A record with no alternative records no choice.
- `## Consequences` is optional. Where the discussion argued a revisit condition for a deferral, that condition goes here.
- A settled point becomes a record only when all three clauses of the **decision test** hold: a real alternative was argued against and is named with the reason it lost; the reason for the choice cannot be read off the code, the product behavior or the architecture description; and a later thread could build against it incorrectly if not told. A mixed point is split, and its structural half becomes an ADR only if it passes the test on its own.
- The body states the choice in the present tense and carries no implementation state: no "not yet built", no "binds the thread that", no version in name, stem or body. Whether the choice is built is read from the code and the roadmap; whether it is current is read from the folder.
- The record is concise and limited to what a new reader needs to understand the decision and work with it.
- The file carries no status, lifecycle or kind key: the folder is the kind, and the location within it is the state.
- The stem is assigned when the delta document is first written and never changes.
- Landing a record that names `supersedes` moves each record it names into that folder's `superseded/`, content untouched.
- Editing or deleting a landed record is generally poor practice: the record says what was decided at the time, and a changed decision is usually a new record that supersedes it.
