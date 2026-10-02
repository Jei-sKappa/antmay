### Task 1: Rewrite the delta-document format

**Objective:** Make the canonical delta-document format describe a `create` as the literal target file and an `edit` or `delete` as an Edit-model JSON document, so every skill that reads the format gets one unambiguous shape.

**Input / context:**
- `spec.md`, `### The delta-document format`, is the authority for every rule below. `### Formats and authoring convention` covers the two example edits.
- Why: `delta/docs/adr/2610021413-delta-document-format.md`.
- The format skeleton every format file follows (title, one paragraph, `## Shape`, `## Rules`, nothing else) is in `suite/authoring/shared-references.md`, `## The canonical folder`. A format never carries a command or procedure, so the scripts are not named in it.
- Documentation rule (Global Constraints): write the format as if no other format ever existed. Do not write "no longer", and do not contrast with an earlier shape.
- The format's declarers are `close-thread`, `spec` and `review-spec`. Their bodies are updated in Tasks 5–7, so the bodies still describe the old shape until then. That is expected.

**Steps:**
1. Rewrite `suite/shared/references/formats/delta-document.md` in full. Keep the title `# Delta-document format`.
2. Write the opening paragraph:
   - A **delta document** is one file in a thread's `delta/` naming one project-layer file as its target, with one of three types.
   - A `create` is the whole new file, written literally at the target's mirrored path. An `edit` is a JSON document of ordered exact-text edits at the mirrored path plus `.json`. A `delete` is a JSON document carrying its type alone, at the same `.json` path.
   - The path names the target. Example: `delta/suite/AGENTS.md` creates `suite/AGENTS.md`, and `delta/suite/AGENTS.md.json` edits or deletes it.
   - Keep the closing sentence defining the thread's **delta** as the whole folder: authoritative inside the thread from the moment a document is written, and applied to the project layer only when the thread closes.
3. Write `## Shape` with three skeletons, each introduced by one short line naming its path form:
   - A `create` at `delta/<target path>`: a fenced `markdown` block holding `<the whole new file, in the format of the kind it targets>` and nothing else. It has no wrapper frontmatter.
   - An `edit` at `delta/<target path>.json`: a fenced `json` block with `"type": "edit"` and an `edits` array of two example objects. One shows an addition: `old_string` is a neighboring line, and `new_string` is that line plus the added line. The other shows `old_string`, `new_string` and `"replace_all": false`. Use realistic agents-file text, for example the `npm test` → `npm run check` rule the current skeleton uses.
   - A `delete` at `delta/<target path>.json`: a fenced `json` block holding `{ "type": "delete" }`.
4. Write `## Rules`, one rule per bullet, carrying every rule in `spec.md` `### The delta-document format`:
   - One delta document per target per thread. A `delta/<target>` and a `delta/<target>.json` for the same target together are malformed.
   - The project layer holds only `.md` files, so the `.json` suffix alone tells an edit or delete document from a `create`. A `create` is never JSON.
   - A `create` targets a file that does not exist. For `docs/adr/` or `docs/pdr/` it is the decision-record format and carries only the record's own frontmatter. The stem is assigned when the document is first written and never changes. For `docs/glossary.md` or an agents file it is the whole file in that kind's format.
   - An `edit` or `delete` targets a project-layer file that exists, an agents file included.
   - `type` is always present and is `"edit"` or `"delete"`. An edit document carries `type` and a non-empty `edits` array. A delete carries `type` alone.
   - Each edit carries a non-empty `old_string`, a `new_string` that may be empty, and an optional boolean `replace_all` that defaults to `false`. No other key is allowed, at either level.
   - `old_string` occurs exactly once in the target, unless `replace_all` is `true`. Then it occurs at least once, and every occurrence is replaced.
   - An addition is an edit whose `old_string` is neighboring text and whose `new_string` is that text plus the addition. A removal is an edit with an empty `new_string`.
   - Edits apply in order, each against the result of the previous one. The document lands all or nothing.
   - An edit counts as already done, and changes nothing, when its `new_string` occurs in the target and every occurrence of its `old_string` lies inside an occurrence of `new_string`. That covers an absent `old_string` with a present `new_string`, and an addition already landed. The test comes before the occurrence count, and it holds for a `replace_all` edit too.
   - Exact means exact after normalizing line ends and trailing spaces.
   - Every edit carries literal text. An instruction-style `new_string` such as "update the grading section to say X" is not an edit, and the change review rejects it.
5. Make sure no word of the file mentions a hash, `## add` / `## replace` / `## remove` sections, or an `under` / `after` / `end` anchor.
6. In `suite/shared/references/formats/thread.md`, change the comment beside `delta/` so its examples show both path forms. Example: `mirrors the target path, e.g. delta/docs/adr/<stem>.md,` on one line and `delta/docs/glossary.md.json, delta/AGENTS.md.json` on the next, keeping the comment column aligned.
7. In `suite/shared/references/formats/spec.md`, change the delta-index example line `` - `delta/docs/glossary.md` — edit `` to `` - `delta/docs/glossary.md.json` — edit ``.
8. From `suite/`, run `node scripts/sync-shared-references.mjs`. It regenerates every declaring skill's copy of the three files.

**Files modified:**
- `suite/shared/references/formats/delta-document.md`
- `suite/shared/references/formats/thread.md`
- `suite/shared/references/formats/spec.md`
- Generated by the sync, not hand-edited:
  - `suite/skills/close/close-thread/references/formats/delta-document.md`
  - `suite/skills/spec/spec/references/formats/delta-document.md`
  - `suite/skills/review/review-spec/references/formats/delta-document.md`
  - every declaring skill's `references/formats/thread.md` and `references/formats/spec.md`

**Verification** (from `suite/`):
- `node scripts/check-skill-text.mjs` exits 0.
- `node scripts/check-marketplace-skills.mjs` exits 0.
- `grep -n -i -E 'hash|## add|## replace|## remove|under:|after:|anchor|no longer' shared/references/formats/delta-document.md` prints nothing.
- `grep -c '\.json' shared/references/formats/delta-document.md` prints a number ≥ 3.
- `grep -n 'delta/docs/glossary.md.json' shared/references/formats/thread.md shared/references/formats/spec.md` prints one line for each file.
- `for f in skills/*/*/references/formats/{delta-document,thread,spec}.md; do cmp shared/references/formats/$(basename "$f") "$f" || echo "DIFF $f"; done` prints no `DIFF` line.
- `git status --porcelain -- ../cli` prints nothing.

**Acceptance criteria:**
- `suite/shared/references/formats/delta-document.md` describes a `create` as the literal target file at its mirrored path, and an `edit` or `delete` as a JSON document at the mirrored path plus `.json`, and describes no Markdown operation sections, anchors or hash.
- A `create` delta document for a decision record has exactly one frontmatter block, the record's own.
- `formats/thread.md` and `formats/spec.md` show edit delta paths with the `.json` suffix.
- The format file holds exactly a title, one paragraph, `## Shape` and `## Rules`.
- Every mirrored copy of the three files is byte-identical to its canonical source.

**Consumes:** none

**Produces:** the canonical format `suite/shared/references/formats/delta-document.md` (Markdown), whose rules Tasks 2–7 implement and cite. Its path forms: `delta/<target path>` for a `create`, `delta/<target path>.json` for an `edit` or `delete`.
