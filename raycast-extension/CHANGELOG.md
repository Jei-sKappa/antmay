# Jeiskappa Skills Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add the **Select Skill** command: browse the bundled catalog of Jei-sKappa workflow skills, attach a prompt, and copy or paste the result.
- Wrap the chosen skill body inside an `<instruction>` envelope with the user's prompt appended outside, so the output drops cleanly into any chat-style agent.
- Inline each skill's `references/` folder at the top of `<instruction>` so the wrapped output remains self-contained when the destination agent has no filesystem access.
- Two-step picker UX: searchable list grouped by capability module with a Markdown preview panel, followed by a form to attach the prompt.
- Provide copy/paste actions both with and without inlined references (`⌘⌥↵` / `⌘⌥⇧↵`) for skills that ship reference files.
