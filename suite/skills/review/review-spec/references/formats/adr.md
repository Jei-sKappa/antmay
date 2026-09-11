# ADR format

An ADR records one project-level decision in one file.

## File and identifier

The file is named `<yymmddhhmm>-<slug>.md`, where the stamp is the record's creation time in UTC at minute resolution and the slug is a short kebab-case name for the decision. The stem — the filename without its extension — is the record's global identifier. It is assigned when the record is first written into the thread's `adr/` and never changes; closing the thread moves the file unaltered.

Location is the status:

- A record in the thread's `adr/` is a draft. It is authoritative for that thread from the moment it is written, and it is editable in place until the thread closes, which is the only in-place editing of a record the method permits.
- A record in `docs/adr/` has landed and is current for the project.
- A record in `docs/adr/superseded/` has been superseded or retired.

## Frontmatter and body

The file opens with a YAML frontmatter block:

```yaml
---
name: <a short title, written as a full decision sentence>
description: <one sentence for the catalog>
supersedes:
  - <stem of a project ADR this record replaces or retires>
---
```

`name` and `description` are always present. `supersedes` is optional: omit the key entirely when the record replaces nothing, and list more than one stem when it replaces or retires more than one. There is no status key, because location is the status.

The body is free in form and required in content: it gives the context needed to understand the decision without the thread, states the decision in full, and gives the reason. A single paragraph satisfies that. Further sections appear only when they carry something the required content does not — considered options, consequences, and scope are the usual candidates — under headings chosen to fit the record.

## Citing

Code, tests, commit messages, and living documentation may cite an ADR by its stem, never by path, and are never required to cite one at all. Thread-local material — log entries, spec sections, plan tasks, plan and implementation folders — is never cited outside its thread.

## Catalog

`docs/adr/` is the whole authoritative surface for project decisions and carries no index file. Print the catalog of stems, names, and descriptions with this command:

```sh
for f in docs/adr/*.md; do awk -v stem="$(basename "$f" .md)" '/^---$/{n++; next} n==1 && /^name: /{sub(/^name: /,""); name=$0} n==1 && /^description: /{sub(/^description: /,""); desc=$0} n==2{print stem "\t" name "\t" desc; exit}' "$f"; done
```

## Conflicts

A contradiction between the thread's material and a project ADR or glossary term is **intentional**, and raised by no skill, when the thread's `adr/` holds a draft naming that ADR in `supersedes`, or when the thread's `glossary.md` redefines the term. Writing that superseding draft is how the user's confirmation is recorded, and the contradiction is intentional from then on.

Every other contradiction is an **unnoticed conflict**. An interactive skill puts it to the user; a completion-oriented skill queues a pending decision. No skill resolves it by overriding the project record.
