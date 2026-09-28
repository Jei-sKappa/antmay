---
type: edit
hash: 018f2039e6ccefea4efcc423fb060cfba72a882f
---

## replace
```
## Update rule
```
```
## Rules
```

## replace
```
update this file — not the root one, not the CLI's — when:
```
```
change this file — not the root one, not the CLI's — through a delta document a thread drafts and `close-thread` lands, when:
```

## replace
```
files.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## What the suite is
```
```
files.

- Every skill lives at `skills/<group>/<skill-name>/SKILL.md`, and the leaf directory name MUST match the frontmatter `name:`.
- The repo-root `.claude-plugin/marketplace.json` holds exactly one plugin entry, `Antmay`, whose `skills` array lists every skill folder as `./skills/<group>/<skill-name>`. That array is what makes the skills installable at all: the `skills` CLI scans a fixed set of root-relative directories and then the parent of every path the array names, so nothing but the manifest finds a suite living under `suite/`. A skill missing from the array silently disappears from `npx skills add`, with no error.
- Run `node scripts/check-marketplace-skills.mjs` after adding, removing, renaming, or moving a skill, and after editing any frontmatter. It fails when the manifest and `skills/` disagree in either direction, when two skills share a frontmatter `name:` (discovery de-duplicates on that field and would silently drop one), and when a frontmatter value would not survive a YAML parser — above all an unquoted `: ` inside a description, which made the `skills` CLI skip `plan-strict` and then remove it as deleted upstream. Rephrase such a value rather than quoting it.
- Run `node scripts/check-skill-text.mjs` after editing any body or shared reference. It fails on a `references/` path not prefixed `<skill_path>/`, on ``per `<skill_path>``, and on a fence line with leading whitespace. `authoring/` is not walked, because those documents quote those forms as negative examples.
- NEVER hand-edit a copy under a skill's `references/` — any file `shared/manifest.yaml` declares for that skill. Edit the canonical source under `shared/references/` and run `node scripts/sync-shared-references.mjs`.
- A new skill starts at `version: 0.0.0` and is registered in three places besides the manifest: the `skills` array in `.claude-plugin/marketplace.json`, a section in the repo-root `README.md` under `## Skills` or `## Model-invoked skills`, and `conventionalCommits.scopes` in the repo-root `.vscode/settings.json` (leaf folder name, array kept sorted).

## Layout
```

## replace
````
not here.

## Layout

```
skills/
````
````
not here.

```
skills/
````

## replace
```
├── model-invoked/       consult-decisions, consult-descriptions
```
```
├── model-invoked/       consult-decisions
```

## replace
```
## Authoring conventions

Read the file whose concern you are about to touch before changing any skill:

- `authoring/skill-roles.md` — the two roles, the metadata that declares each in both harnesses, the description rule per role, when a capability earns its own skill, and naming.
- `authoring/interaction-posture.md` — the postures, the terminal outcome and who mentions it, and internal progress and local return contracts.
- `authoring/body-structure.md` — section headings, the three-part body, what belongs in an instruction rather than inline, and the dead-concept test.
- `authoring/shared-references.md` — the manifest and sync contract, the format skeleton, the instruction kind and its register, and the rule that a skill never reads another skill's files.
- `authoring/side-effects.md` — write authority and the inline write boundary, the filesystem-deletion rule, and temporary workspaces.
```
```
> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## Where to look

- When you change a skill's role, its metadata, its description or its name, or weigh whether a capability earns its own skill, read `authoring/skill-roles.md`.
- When you change a skill's posture, its terminal outcome, or its progress and return contracts, read `authoring/interaction-posture.md`.
- When you change a body's sections or structure, or decide what belongs in an instruction rather than inline, read `authoring/body-structure.md`.
- When you change a shared reference, the manifest or the sync, read `authoring/shared-references.md`.
- When you change what a skill writes or deletes, or give it a temporary workspace, read `authoring/side-effects.md`.
```

## remove
```
## Before anything else

- Every skill lives at `skills/<group>/<skill-name>/SKILL.md`, and the leaf directory name MUST match the frontmatter `name:`.
- The repo-root `.claude-plugin/marketplace.json` holds exactly one plugin entry, `Antmay`, whose `skills` array lists every skill folder as `./skills/<group>/<skill-name>`. That array is what makes the skills installable at all: the `skills` CLI scans a fixed set of root-relative directories and then the parent of every path the array names, so nothing but the manifest finds a suite living under `suite/`. A skill missing from the array silently disappears from `npx skills add`, with no error.
- Run `node scripts/check-marketplace-skills.mjs` after adding, removing, renaming, or moving a skill, and after editing any frontmatter. It fails when the manifest and `skills/` disagree in either direction, when two skills share a frontmatter `name:` (discovery de-duplicates on that field and would silently drop one), and when a frontmatter value would not survive a YAML parser — above all an unquoted `: ` inside a description, which made the `skills` CLI skip `plan-strict` and then remove it as deleted upstream. Rephrase such a value rather than quoting it.
- Run `node scripts/check-skill-text.mjs` after editing any body or shared reference. It fails on a `references/` path not prefixed `<skill_path>/`, on ``per `<skill_path>``, and on a fence line with leading whitespace. `authoring/` is not walked, because those documents quote those forms as negative examples.
- NEVER hand-edit a copy under a skill's `references/` — any file `shared/manifest.yaml` declares for that skill. Edit the canonical source under `shared/references/` and run `node scripts/sync-shared-references.mjs`.
- A new skill starts at `version: 0.0.0` and is registered in three places besides the manifest: the `skills` array in `.claude-plugin/marketplace.json`, a section in the repo-root `README.md` under `## Skills` or `## Model-invoked skills`, and `conventionalCommits.scopes` in the repo-root `.vscode/settings.json` (leaf folder name, array kept sorted).
```
