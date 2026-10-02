---
type: create
---

---
description: A create delta document is the target file itself at its mirrored path, and an edit or delete is a JSON document whose edits follow Claude Code's Edit tool — an exact old_string unique in the target, applied in order, all or nothing — with no recorded base hash.
---

A `create` delta document is the target file written literally at its mirrored path, and an `edit` or `delete` is a JSON document beside it whose edits follow the model of Claude Code's `Edit` tool: an `old_string` that occurs exactly once in the target unless `replace_all` is set, and a `new_string`, applied in order against the result of the previous edit and landing all or nothing. A delta document wrapped in Markdown made one file carry two documents, with two frontmatter blocks on every created record, and its anchored operations were ambiguous about placement and never required quoted text to be unique. No base hash is recorded, because a conflict is exactly an `old_string` that no longer matches, a hash says only that something changed, and the landed diff is reviewed before anyone commits it.

## Rejected alternatives

- Markdown `add`, `replace` and `remove` sections with `under`, `after` and `end` anchors — they nest one Markdown document inside another, leave placement under a heading ambiguous, and never require quoted text to be unique.
- The whole new file as an edit — it hides which text the edit changes, and a conflict with parallel work cannot be read from two full snapshots.
- YAML operations — Node has no YAML parser, and block-scalar chomping and indentation are where an exact `old_string` silently stops matching.
- Search/replace marker blocks — a line of `=` under text is a Markdown setext heading, and the format has no place for document-level fields.
- A strict base-hash gate — it blocks the close on every unrelated parallel change to the glossary or an agents file, and each block costs a spec amendment.
