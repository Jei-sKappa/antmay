---
name: consult-glossary
description: Read the project's glossary before writing any prose, name, or identifier in a project that holds `docs/glossary.md`, and whenever a term's meaning is in doubt. Do not invoke it when `docs/glossary.md` is absent or empty, it would be pointless.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Consult Glossary

`docs/glossary.md` is the project's naming authority: it fixes one meaning per term so that every document and every agent writes the same word for the same thing. Read it before you write, and read it again whenever a term's meaning is in doubt. The table shape is in `<skill_path>/references/formats/glossary.md`.

## Write the fixed term

Where the glossary fixes a term, write that term rather than a synonym, a paraphrase, or a near-miss of your own — in prose, in headings, in file and folder names, and in identifiers. Where it fixes a meaning, use the term only for that meaning.

## Inside a thread

When you are working inside a thread, that thread's own `glossary.md` is authoritative for the terms it defines and takes precedence over the project glossary for the whole of the work in that thread. Terms the thread's glossary does not touch keep their project meaning.
