# Glossary format

The project's glossary lives at `docs/glossary.md` and is the project's naming authority: it fixes one meaning per term, so that every document and every agent writes the same word for the same thing. It is part of the project layer, living rather than historical.

## Shape

```markdown
| Term | Meaning |
| --- | --- |
| **<term>** | <one sentence fixing what the term means> |
```

## Rules

- One row per term and one meaning per term; the term sits in the first column in bold, and its meaning is one sentence in the second.
- The glossary may group its rows under `##` sections when grouping helps a reader find a term; each section holds one table.
- The glossary changes only through the delta documents a thread drafts and `close-thread` lands.
- A term leaves the vocabulary through a `remove` or a `replace` operation on its row, so that the row either disappears or says what to write instead.
- A row may reserve a word rather than define it, by stating which sense is reserved and what to write for the sense it does not cover.
