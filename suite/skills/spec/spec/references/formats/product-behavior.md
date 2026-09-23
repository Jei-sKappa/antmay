# Product-behavior format

A **product behavior** document holds present-tense statements of what the product does now for one **capability** — one coherent user-facing ability — at `docs/product/<capability>.md`. Functional and non-functional statements sit side by side there; a response-time budget the product meets is as much a statement of what it does as the screen it draws. It is part of the project layer, so it is living rather than historical: it is changed only through the delta documents a thread drafts and `close-thread` lands. It is cited by path and heading.

## Shape

```markdown
# <Capability>

## <area>

- <one statement of what the product does now>
- <another statement>

## <next area>

- <statement>
```

## Rules

- A statement enters only when the behavior is built, and only when reading the code would not make it obvious. The document never describes behavior that does not exist.
- One statement per bullet, in the present tense, concise.
- A statement may carry a one-clause reason when no decision record holds that reason; where a record holds it, the record is where the reason lives.
- Behavior that is settled but not built has exactly one home: the roadmap entry that will build it.
- The file name is the capability's kebab-case slug, and the title names the same capability.
- Areas are `##` headings chosen to fit the capability; a statement sits beneath the area it belongs to and nowhere else.
- The file carries no frontmatter and no status, lifecycle or kind field.
