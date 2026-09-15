# AGENTS.md — skill suite

This file provides guidance to AI Agents working on the skill suite under
`suite/`. Paths below are `suite/`-relative, and the scripts are meant to run
from `suite/`; the few files that live at the repository root say so explicitly.

## Update rule

This file is the memory for the skill suite. While working under `suite/`,
update this file — not the root one, not the CLI's — when:

- You make significant changes that needs to be remembered across session.
- You made a mistake that should not be repeated.
- The user told you a new rule that should be remembered.

A fact that holds for the CLI too, or for the repository as a whole, belongs in
the root `AGENTS.md` instead. Every fact lives in exactly one of the three
files.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## What the suite is

The suite is the reference implementation of the Antmay method: refined `SKILL.md` files that carry a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk, plus the shared references they ship with. It is published content — end users install it from [skills.sh](https://skills.sh) with `npx skills add Jei-sKappa/antmay --skill <skill-name>`, so every file under `skills/` and `shared/references/` is written for the invoked agent in any project. There is no build; `scripts/check-skill-text.mjs` is the one mechanical text check, and the rest of validation is reading the Markdown and confirming the instructions are coherent. General-purpose, context-agnostic skills live in the separate companion repository `Jei-sKappa/skills`, not here.

## Layout

```
skills/
├── capture-discussion/  discussion, open-thread, open-ticket, resolve-pending-decisions
├── close/               close-thread
├── implement/           implement, implement-plan, implement-plan-with-subagents
├── model-invoked/       consult-adrs, consult-glossary
├── plan/                check-plan, plan-brief, plan-strict
├── review/              review-code, review-implementation, review-spec
├── roadmap/             roadmap
└── spec/                spec
shared/
├── references/
│   ├── formats/                  the shape of every artifact more than one skill reads or writes
│   ├── instructions/             one self-contained procedure per act a skill performs
│   ├── trackers/                 github.md — tracker-specific reference material
│   └── repository-conventions.md
└── manifest.yaml                 flat map: skill path → the shared/references/ sources mirrored into it
scripts/
├── sync-shared-references.mjs    mirrors the canonical sources into each declaring skill's references/
├── check-marketplace-skills.mjs  asserts marketplace.json and skills/ agree, and that every frontmatter survives a YAML parser
└── check-skill-text.mjs          fails on a bare `references/` path, `per` before a `<skill_path>/` pointer, or an indented fence
authoring/                        the conventions every skill is authored to
```

## Authoring conventions

Read the file whose concern you are about to touch before changing any skill:

- `authoring/skill-roles.md` — the two roles, the metadata that declares each in both harnesses, the description rule per role, when a capability earns its own skill, and naming.
- `authoring/interaction-posture.md` — the postures, the terminal outcome and who mentions it, and internal progress and local return contracts.
- `authoring/body-structure.md` — section headings, the three-part body, what belongs in an instruction rather than inline, and the dead-concept test.
- `authoring/shared-references.md` — the manifest and sync contract, the format skeleton, the instruction kind and its register, and the rule that a skill never reads another skill's files.
- `authoring/side-effects.md` — write authority and the inline write boundary, the filesystem-deletion rule, and temporary workspaces.

## Before anything else

- Every skill lives at `skills/<group>/<skill-name>/SKILL.md`, and the leaf directory name MUST match the frontmatter `name:`.
- The repo-root `.claude-plugin/marketplace.json` holds exactly one plugin entry, `Antmay`, whose `skills` array lists every skill folder as `./skills/<group>/<skill-name>`. That array is what makes the skills installable at all: the `skills` CLI scans a fixed set of root-relative directories and then the parent of every path the array names, so nothing but the manifest finds a suite living under `suite/`. A skill missing from the array silently disappears from `npx skills add`, with no error.
- Run `node scripts/check-marketplace-skills.mjs` after adding, removing, renaming, or moving a skill, and after editing any frontmatter. It fails when the manifest and `skills/` disagree in either direction, when two skills share a frontmatter `name:` (discovery de-duplicates on that field and would silently drop one), and when a frontmatter value would not survive a YAML parser — above all an unquoted `: ` inside a description, which made the `skills` CLI skip `plan-strict` and then remove it as deleted upstream. Rephrase such a value rather than quoting it.
- Run `node scripts/check-skill-text.mjs` after editing any body or shared reference. It fails on a `references/` path not prefixed `<skill_path>/`, on ``per `<skill_path>``, and on a fence line with leading whitespace. `authoring/` is not walked, because those documents quote those forms as negative examples.
- NEVER hand-edit a copy under a skill's `references/` — any file `shared/manifest.yaml` declares for that skill. Edit the canonical source under `shared/references/` and run `node scripts/sync-shared-references.mjs`.
- A new skill starts at `version: 0.0.0` and is registered in three places besides the manifest: the `skills` array in `.claude-plugin/marketplace.json`, a section in the repo-root `README.md` under `## Skills` or `## Model-invoked skills`, and `conventionalCommits.scopes` in the repo-root `.vscode/settings.json` (leaf folder name, array kept sorted).
