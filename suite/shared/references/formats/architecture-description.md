# Architecture-description format

An **architecture description** holds present-tense statements of how the system is structured now for one **module** — one part of the system a reader can hold in mind at once — at `docs/architecture/<module>.md`. It is part of the project layer, so it is living rather than historical: it is changed only through the delta documents a thread drafts and `close-thread` lands. It is cited by path and heading.

## Shape

```markdown
# <Module>

## <area>

- <one statement of how the system is structured now>
- <another statement>

## <next area>

- <statement>
```

## Rules

- A statement enters only when the structure exists, and only when no single file makes it obvious; what one file shows a reader is read from that file instead. The document never describes structure that does not exist.
- One statement per bullet, in the present tense, concise.
- A statement may carry a one-clause reason when no decision record holds that reason; where a record holds it, the record is where the reason lives.
- Structure that is settled but not built has exactly one home: the roadmap entry that will build it.
- The file name is the module's kebab-case slug, and the title names the same module.
- Areas are `##` headings chosen to fit the module; a statement sits beneath the area it belongs to and nowhere else.
- The file carries no frontmatter and no status, lifecycle or kind field.
