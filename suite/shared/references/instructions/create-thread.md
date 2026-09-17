# Create a thread

Allocate a new thread folder, write its `seed.md` from the fields supplied with the request, and create its `log.md`. The layout this act writes into is fixed in `<skill_path>/references/formats/thread.md`.

## Compose the path and create the folder

Capture the current UTC time. Compose the folder path `.work/threads/yyyy/mm/dd-hhmm-slug/`: a four-digit year folder, a two-digit month folder, and a leaf made of the two-digit day, a hyphen, the hour and minute in UTC, a hyphen, and the supplied kebab-case slug. When a folder with that leaf already exists, the slug must differ — pick a more specific slug rather than adding a suffix.

Create that folder and, inside it, exactly two files: `seed.md` and `log.md`. Create nothing else — no other folder, no placeholder file.

## seed.md

Write `seed.md` in this order:

```markdown
---
external: "<real external URL>"
roadmap:
  path: "<.work/roadmaps/yymmddhhmm-slug.md>"
  entry: "<entry-slug>"
---
# <supplied title>

<the genesis narrative: the ticket section, the intent section, or both>
```

The frontmatter block is present only when at least one relationship applies. The seed carries nothing beyond that block when present, the title heading, and the genesis narrative.

### The genesis narrative

The genesis narrative is carried by up to two sections, and at least one of them is always present. `## Ticket` carries the words of a linked ticket; `## Intent` carries the work as it was composed for this request. When the request supplies both, `## Ticket` comes first and `## Intent` follows it. When it supplies a ticket body and no composed intent, `## Ticket` is the whole narrative. When it supplies composed intent and no ticket body, `## Intent` is.

#### The ticket section

Write the ticket's body under its heading with every line quote-prefixed:

```markdown
## Ticket

> <the ticket's body, content unchanged, every line prefixed>
```

The content is unchanged — every line, every list, every code fence, exactly as it reads in the tracker. The quote prefix is the only thing added: prefix each line with `> `, write a bare `>` for a blank line inside the body, and nest a blockquote the body already carries as `> >`. Do not rewrite the body, summarize it, correct it, or trim it, and write no sentence of your own inside the quote.

The prefix is what makes the quotation self-terminating: the first line without it ends the ticket's words, whatever headings or code fences the body itself carries. Nothing outside the quote is ever the ticket's.

#### The intent section

Write the composed intent under its heading, as ordinary prose, reproduced exactly as supplied:

```markdown
## Intent

<the composed intent, as supplied>
```

Do not rewrite it, summarize it, or add to it, and never quote-prefix it — the absence of the prefix is what tells a reader these words were composed rather than quoted.

### Frontmatter

Write frontmatter only when at least one value was supplied. Use lowercase keys in this order, and quote every value:

- `external` — the real external URL the work comes from.
- `roadmap` — a mapping written when the thread is opened from a roadmap entry. Its `path` value is the index path in the form `.work/roadmaps/<yymmddhhmm>-<slug>.md`, and its `entry` value is the entry slug exactly as it reads in that index. Both child keys are always present together, in that order.

When both relationships apply, `external` comes before `roadmap`. When neither applies, the file starts with the title heading: write no delimiters, empty mapping, `null`, or sentence explaining the absence.

## log.md

Create `log.md` as an empty file:

```sh
touch <thread root>/log.md
```

The file exists from thread creation onward, ready for the first entry.

## Report the identifier

Report the created path relative to `.work/threads/` — `yyyy/mm/dd-hhmm-slug` — as the thread's identifier, so the work that follows continues against it.
