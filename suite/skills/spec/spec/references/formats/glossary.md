# Glossary format

The project's glossary lives at `docs/glossary.md` and is the project's naming authority: it fixes one meaning per term, so that every document and every agent writes the same word for the same thing. It is part of the project layer, living rather than historical.

## Shape

```markdown
| Term | Meaning |
| --- | --- |
| **<term>** | <one sentence fixing what the term means>, then the synonyms it fixes or rules out |
```

## Rules

- One row per term and one meaning per term; the term sits in the first column in bold, and its meaning is one sentence in the second.
- A term gets a row only when the project gives the word a meaning a competent reader would not assume, or fixes one word among synonyms in use. An ordinary word in its ordinary sense never gets a row, however central it is.
- The row holds one sentence of meaning plus the synonyms it fixes or rules out, and never value constraints, formats or limits.
- The glossary may group its rows under `##` sections when grouping helps a reader find a term; each section holds one table.
- The glossary changes only through the delta documents a thread drafts and `close-thread` lands.
- A retired term's row is removed, and nothing is written in its place.
- A row that reserves a word, rather than defining it, is kept for a word a fresh reader would plausibly use in a sense the project rules out. It states which sense is reserved and what to write for the sense it rules out.
