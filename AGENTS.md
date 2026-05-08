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

- `skills/<skill-name>/SKILL.md` — one directory per skill under the top-level `skills/` folder. The directory name MUST match the `name:` field in the frontmatter.
- `README.md` — index of available skills; update when adding/removing a skill.
- `.claude-plugin/marketplace.json` — registers this repo as a `vercel-labs/skills` plugin so installs are grouped under a named heading (e.g. `JeisKappa Skills`) instead of `General` in `npx skills list`. Every skill folder MUST be listed in the appropriate plugin's `skills` array as `./skills/<skill-name>`. To introduce a new group/heading, add another entry to the `plugins` array with its own `name` and `skills` list. Display rule: the CLI splits `name` on `-`, uppercases the first char of each segment, then joins with spaces — so `JeisKappa-skills` renders as `JeisKappa Skills`. Dashes cannot survive into the displayed title.
- `bundled-scripts/` — canonical sources for helper scripts that get bundled into skills (e.g. `copy-to-clipboard.py`). These are the single source of truth.
- `tools/sync-bundled-scripts.sh` — manually-invoked sync that copies every helper from `bundled-scripts/` into the `scripts/` folder of each consuming skill. Idempotent. The list of consuming skills is a hardcoded array inside the script.
- `justfile` — [`just`](https://github.com/casey/just) recipes for repo maintenance tasks. Run `just --list` to see them; current recipes wrap the scripts under `tools/`.

## Bundled helper scripts

Skills are installed individually with `npx skills add Jei-sKappa/skills --skill <skill-name>`, so each skill folder must be self-contained — the installer does not pull `bundled-scripts/`. To stay DRY, helpers live canonically under `bundled-scripts/` and are mirrored into each consuming skill's own `scripts/` folder. Those mirrored copies ARE checked into git so installs work without running any tooling.

When changing a bundled helper:

1. Edit the canonical file in `bundled-scripts/`.
2. Run `just sync-scripts` (or `tools/sync-bundled-scripts.sh` directly) from anywhere in the repo to propagate the change to every consuming skill's `scripts/` folder.
3. Bump the `version` in the frontmatter of any skill whose user-visible behavior changes as a result.

When a new skill starts using a bundled helper, add its folder name to the relevant `_CONSUMERS` array inside `tools/sync-bundled-scripts.sh` and rerun the sync.

## SKILL.md format

Every skill file starts with YAML frontmatter, then the skill body. Mirror the structure of `skills/consult-the-expert/SKILL.md`:

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

1. Create `skills/<skill-name>/SKILL.md` with the frontmatter shown above (start at `version: 1.0.0`).
2. Add a section to `README.md` under "Available skills" with the description and the `npx skills add …` install snippet.
3. Register the skill folder in `.claude-plugin/marketplace.json` under the appropriate plugin's `skills` array as `./skills/<skill-name>` (default plugin: `JeisKappa-skills`).
4. Add the skill's folder name to `conventionalCommits.scopes` in `.vscode/settings.json` (keep the array sorted alphabetically) so it shows up as a commit scope.

## Commits

Never commit unless explicitly asked to do so.

This repo follows [Conventional Commits](https://www.conventionalcommits.org/). When the change is scoped to a single skill, the commit scope MUST be that skill's folder name — e.g. `refactor(brief-the-implementer): …`, `fix(report-to-the-owner): …`. The list of valid skill scopes lives in `conventionalCommits.scopes` inside `.vscode/settings.json`; if a new skill exists on disk but is missing from that array, add it there in the same commit (see "When adding a new skill" above).

Repo-wide changes (touching multiple skills, tooling under `tools/`, `bundled-scripts/`, `README.md`, `.claude-plugin/`, `AGENTS.md`, etc.) should omit the scope: `chore: …`, `docs: …`, `feat: …`.
