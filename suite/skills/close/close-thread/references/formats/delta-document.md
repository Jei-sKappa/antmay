# Delta-document format

A **delta document** is one file in a thread's `delta/`, naming one project-layer file as its target and carrying one of three types: `create`, whose body is the whole new file; `edit`, whose body is literal `add`, `replace` and `remove` operations against the target's recorded blob hash; or `delete`, which names the target and its hash and nothing else. It names its target by mirroring the target's path under `delta/`, so a document at `delta/docs/product/onboarding.md` targets `docs/product/onboarding.md`. The thread's **delta** is the whole folder: authoritative inside the thread from the moment a document is written, and applied to the project layer only when the thread closes.

## Shape

A `create`:

````markdown
---
type: create
---

<the whole new file, in the format of the kind it targets>
````

An `edit`:

````markdown
---
type: edit
hash: <git blob hash>
---

## add
under: `## Saving`
```
- Saving a card that is already saved is a no-op and shows no error.
```

## replace
```
- Reset codes expire after 30 minutes.
```
```
- Reset codes expire after 15 minutes.
```

## remove
```
- Explore shows a second feed.
```
````

A `delete`:

````markdown
---
type: delete
hash: <git blob hash>
---
````

## Rules

- One delta document per target per thread. Its path under `delta/` mirrors the target's path, so the target is the path and no frontmatter key names it.
- The frontmatter carries `type` and, for `edit` and `delete`, `hash`, and nothing else.
- `hash` is the git blob hash of the target as it stood when the document was drafted, obtained with `git hash-object <target>` on the working tree. A delta document amended after its target changed re-records the hash.
- Every operation carries literal text. An instruction-style operation — "update the grading section to say X" — is not an operation, and the change review rejects it.
- An `add` carries the text and exactly one anchor: `under:` the exact heading the text goes under, `after:` the exact line it follows, or `end` for the end of the file.
- A `replace` carries two blocks: the exact existing text, then the new text. A `remove` carries one block: the exact existing text.
- Exact means exact after normalising line ends and trailing spaces.
- An `edit` may carry several `## add`, `## replace` and `## remove` sections; they apply in document order.
- A `create` targets a file that does not exist. For `docs/adr/` or `docs/pdr/` its body is the decision-record format, and the record's stem is assigned when the document is first written and never changes; for `docs/glossary.md`, `docs/product/<capability>.md` or `docs/architecture/<module>.md` its body is the whole file in that kind's format.
- A `delete` has no body: the frontmatter is the whole document.
