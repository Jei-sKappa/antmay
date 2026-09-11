---
name: allocate-thread
description: Use only when an invoking caller supplies a complete caller-authorization block for a new thread and a normalized thread folder must be allocated — create `docs/threads/<YYMMDDHHMMSSZ-slug>/`, write `seed.md` from the supplied fields, and eagerly create a header-only `log.md`.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.2.0
---

# Allocate Thread

Perform normalized thread-folder creation on behalf of a user-facing operation. You allocate the thread folder, write `seed.md` from fields the caller hands you, and eagerly create a header-only `log.md`. You own only this bounded filesystem side effect and the refusal below.

## Precondition and refusal

Act only when the caller supplies a complete **caller-authorization block** containing all of:

- **Operation** — the invoking user-facing operation, named as `/<skill-name>`.
- **Slug** — a kebab-case slug for the folder name.
- **Title** — the human-readable thread title.
- **Genesis narrative** — the complete, self-contained text explaining what triggered the work and its intended outcome.
- **Conditional metadata** — zero or more of `External:`, the pair `Roadmap:` + `Entry:`, and `Supersedes:`, each with its value; the block states which apply and which do not.

If any required field above is missing, refuse: create nothing, name what is absent, and direct the user to `/open-thread`. You never interpret a rough idea or compose title or narrative text yourself — a caller that cannot supply the complete block must route through `/open-thread` instead.

## Thread allocation

Capture the current UTC time and format it as `YYMMDDHHMMSSZ` (two-digit year, month, day, hour, minute, second, then a literal `Z`). Compose the folder name as that timestamp, a hyphen, and the supplied slug, and create the folder at `docs/threads/<YYMMDDHHMMSSZ-slug>/`.

Create exactly two files inside it — `seed.md` and `log.md` — and nothing else. Create no other folders and no placeholder files.

## seed.md

Write `seed.md` in this order:

```markdown
# <supplied title>

<supplied genesis narrative, verbatim>

<applicable conditional metadata lines, one per line>
```

Reproduce the genesis narrative exactly as supplied; do not rewrite, summarize, or add to it. Include only the conditional metadata lines the block marks as applicable, each following the rules below and in the order the rules list them; when none apply, omit the metadata region entirely. The seed carries nothing beyond the title heading, the genesis narrative, and the applicable conditional metadata lines — add no other fields and no empty placeholders.

### Conditional metadata rules

- `External:` — write only when a real external URL was supplied; use that URL as the value.
- `Roadmap:` and `Entry:` — write this pair when the caller supplies a roadmap entry the thread is opened from. `Roadmap:` takes the supplied index path in the form `docs/roadmaps/<yymmddhhmm>-<slug>.md`; `Entry:` takes the supplied entry slug, exactly as it reads in that index. The two lines are written together or not at all, on consecutive lines in that order. A block supplying one without the other is incomplete: refuse as above.
- `Supersedes:` — write only when the caller supplied a known supersession relationship worth recording; use the supplied reference as the value.

Absent metadata is simply absent — no line, no `none`, no justification for its absence.

## log.md

Create `log.md` eagerly, carrying the header line fixed in `references/formats/log-line.md` and no entry. Write that single line with a shell write, so every touch of `log.md` stays on the shell path. The file exists from thread creation onward, ready for the first skill that settles a point to append to.

## Report back

Report the created thread's folder path to the caller so it can continue its own work against the new thread.
