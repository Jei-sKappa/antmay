# Implementation report

Plan: none

## Outcome

Implemented the seed metadata decisions recorded in the thread's `log.md`. Newly created seeds now place their applicable relationships in YAML frontmatter before the title, thread-level supersession metadata is no longer offered, and roadmap consumers read the nested frontmatter shape.

## Changes

- `suite/shared/references/instructions/create-thread.md` and its generated `open-thread` copy now define optional frontmatter with a quoted `external` scalar and an atomic `roadmap` mapping containing `path` and `entry`; seeds without either relationship start with their title.
- `suite/skills/capture-discussion/open-thread/` now composes and reports the frontmatter schema, and supplied-ticket lookup searches the `external` field.
- `suite/skills/capture-discussion/discussion/SKILL.md` and `suite/skills/close/close-thread/SKILL.md` now resolve roadmap context through `roadmap.path` and `roadmap.entry`.
- Existing seeds and the CLI were left unchanged, matching the thread boundary and repository scope rules.

## Verification

- `git diff --check` passed before both task commits.
- `node scripts/check-skill-text.mjs` passed across 113 skill and shared-reference files.
- `node scripts/check-marketplace-skills.mjs` passed across all 18 declared skills.
- A targeted suite-wide search found no remaining references to the legacy seed keys `External:`, `Roadmap:`, `Entry:`, or `Supersedes:` in live suite prose.

