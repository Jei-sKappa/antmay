# Glossary format

A glossary fixes one meaning per term, so that every document and every agent writes the same word for the same thing. The project's glossary lives at `docs/glossary.md` and is the naming authority; a thread's own glossary is `glossary.md` at the thread root and holds the terms that thread adds, changes, or retires.

## Shape

```markdown
| Term | Meaning |
| --- | --- |
| **<term>** | <one sentence fixing what the term means> |
```

## Rules

- One row per term and one meaning per term; the term sits in the first column in bold, and its meaning is one sentence in the second.
- The project glossary may group its rows under `##` sections when grouping helps a reader find a term; each section holds one table.
- A thread's glossary is authoritative inside that thread: where a row differs from the project glossary, the thread's row is what the work in that thread follows.
- A thread's rows merge into the project glossary when the thread closes.
- A retirement is recorded in a thread's glossary as a row whose meaning states that the term leaves the vocabulary and what to write instead, so that the merge removes or rewrites the project row.
