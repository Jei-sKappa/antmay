# Agents-file format

An agents file is every `AGENTS.md` or `CLAUDE.md` in the project, at the root or inside any module; a `CLAUDE.md` that is a symlink to an `AGENTS.md` is one agents file with it, counted once. The agent loads the file at the start of every session, so what it holds reaches every piece of work done under it. It is part of the project layer, living rather than historical.

## Shape

```markdown
## Rules

- <a critical rule the agent must follow and would not infer from the code>
- <another critical rule, as many as the project needs>

## Layout

<how the repository or module is structured, and where to find things>

## Where to look

- When <a trigger the agent can observe>, read <path>.
- When <another trigger>, read <path>.
```

## Rules

- The file holds only three kinds of content: critical rules; how the repository is structured and where to find things; and pointers.
- Every pointer names a trigger the agent can observe, and the document to read when it fires.
- The file changes only through the delta documents a thread drafts and `close-thread` lands, whether `edit`, `create` or `delete`.
- The budget is 1,000 words per agents file, counted as `wc -w` counts them. A landing that would leave an agents file over 1,000 words and longer than it was is refused, so a file over budget can only shrink or keep its length.
