---
name: allocate-thread
description: Use only when an invoking caller supplies a complete caller-authorization block for a new thread and a normalized thread folder must be allocated — create `docs/threads/<YYMMDDHHMMSSZ-slug>/`, write `seed.md` from the supplied fields, and eagerly create a header-only `decisions.md`.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.1
---

# Allocate Thread

Perform normalized thread-folder creation on behalf of a user-facing operation. You allocate the thread folder, write `seed.md` from fields the caller hands you, and eagerly create a header-only `decisions.md`. You own only this bounded filesystem side effect and the refusal below.

## Precondition and refusal

Act only when the caller supplies a complete **caller-authorization block** containing all of:

- **Operation** — the invoking user-facing operation, named as `/<skill-name>`.
- **Slug** — a kebab-case slug for the folder name.
- **Title** — the human-readable thread title.
- **Genesis narrative** — the complete, self-contained text explaining what triggered the work and its intended outcome.
- **Suggested workflow** — the complete `## Suggested workflow` section text, ready to copy verbatim.
- **Conditional metadata** — zero or more of `External:`, `Parent:`, `Roadmap brief:`, `Supersedes:`, each with its value; the block states which apply and which do not.

If any required field above is missing, refuse: create nothing, name what is absent, and direct the user to `/open-thread`. You never interpret a rough idea, choose or infer a workflow, or compose title, narrative, or workflow text yourself — a caller that cannot supply the complete block must route through `/open-thread` instead.

## Thread allocation

Capture the current UTC time and format it as `YYMMDDHHMMSSZ` (two-digit year, month, day, hour, minute, second, then a literal `Z`). Compose the folder name as that timestamp, a hyphen, and the supplied slug, and create the folder at `docs/threads/<YYMMDDHHMMSSZ-slug>/`.

Create exactly two files inside it — `seed.md` and `decisions.md` — and nothing else. Create no other folders and no placeholder files.

## seed.md

Write `seed.md` in this order:

```markdown
# <supplied title>

<supplied genesis narrative, verbatim>

<applicable conditional metadata lines, one per line>

## Suggested workflow

<supplied suggested-workflow text, verbatim>
```

Reproduce the genesis narrative and the `## Suggested workflow` section exactly as supplied, including that heading; do not rewrite, summarize, or add to them. Include only the conditional metadata lines the block marks as applicable, each following the rules below; when none apply, omit the metadata region entirely. The seed carries nothing beyond the title heading, the genesis narrative, the applicable conditional metadata lines, and the suggested-workflow section — add no other fields and no empty placeholders.

### Conditional metadata rules

- `External:` — write only when a real external URL was supplied; use that URL as the value.
- `Parent:` — write the supplied reference as a repo-relative thread-root directory path pointing at the parent thread's folder, never at a file inside it (for example `Parent: docs/threads/260714093000Z-auth-boundary/`).
- `Roadmap brief:` — write the supplied parent-roadmap brief identifier in its `C<N>` form.
- `Supersedes:` — write only when the caller supplied a known supersession relationship worth recording; use the supplied reference as the value.

Absent metadata is simply absent — no line, no `none`, no justification for its absence.

## decisions.md

Create `decisions.md` eagerly as a header-only file: a single top-level heading naming the thread's decision log and no records. It exists from thread creation onward even though no decision has been recorded yet.

## Report back

Report the created thread's folder path to the caller so it can continue its own work against the new thread.
