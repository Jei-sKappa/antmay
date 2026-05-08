# AGENTS.md

This file provides guidance to AI Agents when working with code in this
repository.

## Update rule

Update `AGENTS.md` when:

- You make significant changes that needs to be remembered across session.
- You made a mistake that should not be repeated.
- The user told you a new rule that should be remembered.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## Repository purpose

A personal collection of refined `SKILL.md` files authored by Jei-sKappa. Skills are distributed via [skills.sh](https://skills.sh) and installed by end users with:

```sh
npx skills add Jei-sKappa/skills --skill <skill-name>
```
There is no build, test, or lint pipeline — this is a content repository. Validation happens by reading the markdown and confirming the skill's instructions are coherent and progressively disclosed.

## Layout

- `<skill-name>/SKILL.md` — one directory per skill at the repo root. The directory name MUST match the `name:` field in the frontmatter.
- `README.md` — index of available skills; update when adding/removing a skill.
- `.claude-plugin/marketplace.json` — registers this repo as a `vercel-labs/skills` plugin so installs are grouped under a named heading (e.g. `JeisKappa Skills`) instead of `General` in `npx skills list`. Every skill folder MUST be listed in the appropriate plugin's `skills` array. To introduce a new group/heading, add another entry to the `plugins` array with its own `name` and `skills` list. Display rule: the CLI splits `name` on `-`, uppercases the first char of each segment, then joins with spaces — so `JeisKappa-skills` renders as `JeisKappa Skills`. Dashes cannot survive into the displayed title.

## SKILL.md format

Every skill file starts with YAML frontmatter, then the skill body. Mirror the structure of `consult-the-expert/SKILL.md`:

```yaml
---
name: <kebab-case, matches directory name>
description: <one sentence: what it does + when to use it. The "use when…" trigger is what the harness matches against, so make it concrete.>
metadata:
  author: https://github.com/Jei-sKappa
  version: <semver>
---
```

There is no specific format for the skill body: every skill is different.

Bump `version` in the frontmatter on any meaningful change to a skill's behavior.


## When adding a new skill

1. Create `<skill-name>/SKILL.md` with the frontmatter shown above (start at `version: 1.0.0`).
2. Add a section to `README.md` under "Available skills" with the description and the `npx skills add …` install snippet.
3. Register the skill folder in `.claude-plugin/marketplace.json` under the appropriate plugin's `skills` array (default: `JeisKappa-skills`).

## Commits

Never commit unless explicitly asked to do so.
Make sure to follow the commit message guidelines of the project.
