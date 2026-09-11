# Roadmap-index format

A roadmap index holds one direction: where it is going and the entries that get there. It is a project-level file at `docs/roadmaps/<yymmddhhmm>-<slug>.md`, where the stamp is the index's creation time in UTC at minute resolution.

## Index shape

```markdown
# Roadmap: <title>

## Destination

<what reaching this direction means, and how it will be recognised>

## Entries

### <kebab-slug>

<a one-paragraph sketch of the work this entry covers>

Scope: <the boundary of this entry — what it includes and where it stops>

### <next-kebab-slug>

…

## Out of scope

- <something deliberately excluded from the direction>

## Not yet specified

<what cannot yet be seen well enough to become an entry>
```

## Rules

- An entry's heading text is a short kebab-case slug, unique within the index, and that slug is the entry's identifier: the seed of a thread opened from the entry records the index path and the slug.
- An entry is pinned once a thread is opened from it, and its slug is never renamed after that.
- Unstarted entries may be reordered, merged, or dropped by the index's owner, who edits the file in place. Merging two entries keeps one slug and drops the other.
- When a thread opened from an entry closes, the closing skill writes `Closed: <archive folder name> — <one-line outcome>` as the first line beneath that entry's heading.
- Entries carry no status field and no checkbox, and the index holds no child briefs. Constraints that bind the threads opened from these entries are ADRs.
- When the destination is reached or abandoned, the owner deletes the index; the outcome lives in the code, the ADRs, and the archived threads.
