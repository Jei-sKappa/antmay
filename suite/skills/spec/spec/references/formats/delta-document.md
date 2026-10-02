# Delta-document format

A **delta document** is one file in a thread's `delta/`, naming one project-layer file as its target and carrying one of three types: `create`, the whole new file written literally at the target's mirrored path; `edit`, a JSON document of ordered exact-text edits at the mirrored path plus `.json`; or `delete`, a JSON document carrying its type alone at the same `.json` path. The path names the target, so `delta/suite/AGENTS.md` creates `suite/AGENTS.md`, and `delta/suite/AGENTS.md.json` edits or deletes it. The thread's **delta** is the whole folder: authoritative inside the thread from the moment a document is written, and applied to the project layer only when the thread closes.

## Shape

A `create`, at `delta/<target path>`:

```markdown
<the whole new file, in the format of the kind it targets>
```

An `edit`, at `delta/<target path>.json`:

```json
{
  "type": "edit",
  "edits": [
    {
      "old_string": "- `docs/` holds the user guides.",
      "new_string": "- `docs/` holds the user guides.\n- `scripts/` holds the release helpers."
    },
    {
      "old_string": "- Run `npm test` before every commit.",
      "new_string": "- Run `npm run check` before every commit.",
      "replace_all": false
    }
  ]
}
```

A `delete`, at `delta/<target path>.json`:

```json
{ "type": "delete" }
```

## Rules

- One delta document per target per thread. A `delta/<target>` and a `delta/<target>.json` for the same target together are malformed.
- The project layer holds only `.md` files, so the `.json` suffix alone tells an edit or delete document from a `create`. A `create` is never JSON.
- A `create` is the target file itself, with no wrapper and no frontmatter of its own.
- A `create` targets a file that does not exist. For `docs/adr/` or `docs/pdr/` it is the decision-record format and carries only the record's own frontmatter, and the record's stem is assigned when the document is first written and never changes. For `docs/glossary.md` or an agents file it is the whole file in that kind's format.
- An `edit` or a `delete` targets a project-layer file that exists, an agents file included.
- `type` is always present and is `"edit"` or `"delete"`. An edit document carries `type` and a non-empty `edits` array. A delete document carries `type` alone.
- Each edit carries a non-empty `old_string`, a `new_string` that may be empty, and an optional boolean `replace_all` that defaults to `false`. No other key is allowed, at either level.
- `old_string` occurs exactly once in the target, unless `replace_all` is `true`. Then it occurs at least once, and every occurrence is replaced.
- An addition is an edit whose `old_string` is neighboring text and whose `new_string` is that text plus the addition. A removal is an edit with an empty `new_string`.
- Edits apply in order, each against the result of the previous one. The document lands all or nothing.
- An edit counts as already done, and changes nothing, when its `new_string` occurs in the target and every occurrence of its `old_string` lies inside an occurrence of `new_string`. That covers an absent `old_string` with a present `new_string`, and an addition already landed. The test comes before the occurrence count, so an edit already done is never applied and never a conflict, and it holds for a `replace_all` edit too.
- Exact means exact after normalizing line ends and trailing spaces.
- Every edit carries literal text. An instruction-style `new_string` such as "update the grading section to say X" is not an edit, and the change review rejects it.
