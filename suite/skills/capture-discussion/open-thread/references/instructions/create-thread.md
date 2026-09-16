# Create a thread

Allocate a new thread folder, write its `seed.md` from the fields supplied with the request, and create its `log.md`. The layout this act writes into is fixed in `<skill_path>/references/formats/thread.md`.

## Compose the path and create the folder

Capture the current UTC time. Compose the folder path `.work/threads/yyyy/mm/dd-hhmm-slug/`: a four-digit year folder, a two-digit month folder, and a leaf made of the two-digit day, a hyphen, the hour and minute in UTC, a hyphen, and the supplied kebab-case slug. When a folder with that leaf already exists, the slug must differ — pick a more specific slug rather than adding a suffix.

Create that folder and, inside it, exactly two files: `seed.md` and `log.md`. Create nothing else — no other folder, no placeholder file.

## seed.md

Write `seed.md` in this order:

```markdown
# <supplied title>

<the genesis narrative, composed as below>

<applicable conditional metadata lines, one per line>
```

The seed carries nothing beyond the title heading, the narrative, and the metadata lines that apply.

### The genesis narrative

When the request supplies a ticket's body, the narrative is that body under its own heading, reproduced exactly as it reads in the tracker — every line, every list, every code fence, unedited:

```markdown
## Ticket

<the ticket's body, unchanged>
```

Do not rewrite it, summarize it, correct it, or trim it, and write no sentence of your own inside the block. When the request also supplies context the invocation carried alongside the ticket, that context follows the block as ordinary prose, beneath everything the block holds, so a reader can always tell the ticket's words from anything added to them. When the request supplies a ticket's body and nothing else, the block is the whole narrative and the seed carries no prose besides it.

When the request supplies no ticket body, the narrative is the composed account supplied with the request, reproduced exactly as supplied — do not rewrite it, summarize it, or add to it.

### Metadata

Write a metadata line only when its value was supplied, in this order:

- `External:` — the real external URL the work comes from.
- `Roadmap:` and `Entry:` — written together, on consecutive lines and in that order, when the thread is opened from a roadmap entry. `Roadmap:` takes the index path in the form `.work/roadmaps/<yymmddhhmm>-<slug>.md`; `Entry:` takes the entry slug exactly as it reads in that index.
- `Supersedes:` — the supplied reference to the work this thread replaces.

Absent metadata is simply absent: no line, no `none`, no sentence explaining the absence.

## log.md

Create `log.md` with a single shell write carrying only its header line and no entry:

```sh
printf '%s\n' '# Thread log' > <thread root>/log.md
```

The file exists from thread creation onward, ready for the first entry.

## Report the identifier

Report the created path relative to `.work/threads/` — `yyyy/mm/dd-hhmm-slug` — as the thread's identifier, so the work that follows continues against it.
