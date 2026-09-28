### Task 8: Keep the implement skills off the agents files

**Objective:** Put every agents file into the project-layer list that the three implement skills never write, and remove the descriptive kinds from their inputs and boundaries.

**Input / context:**
- `spec.md`, `## The change` → `### Suite: skills`, the bullet for `implement`, `implement-plan` and `implement-plan-with-subagents`.
- The reason is settled in `delta/docs/pdr/2609280900-project-layer-holds-no-descriptive-kinds.md`: agents files belong to the project layer, so an implementer no longer edits them as living documentation.
- Starts from the repository as task 7 left it. Nothing from an earlier task is read here beyond the rewritten read-and-cite copies these skills carry (task 3).
- The files to edit are `suite/skills/implement/implement/SKILL.md`, `suite/skills/implement/implement-plan/SKILL.md` and `suite/skills/implement/implement-plan-with-subagents/SKILL.md`.

**Steps:**
1. In each of the three files, under `## Inputs`, delete the `docs/architecture/<module>.md …` and `docs/product/<capability>.md …` items.
2. In each of the three files, in the `delta/` item under `## Inputs`, replace `and holds the standing behavior and structure the change adds` with `and holds the decision records, glossary terms and agents-file changes the change lands`. Keep the rest of the item, including the citation clause in `implement-plan` and `implement-plan-with-subagents`.
3. In each of the three files, in the `**Write boundary.**` paragraph, change the project-layer list to `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, every agents file (each `AGENTS.md` or `CLAUDE.md` in the project), and `.work/roadmaps/`. Keep the rest of the sentence.
4. From `suite/`, run `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/implement/implement/SKILL.md`
- `suite/skills/implement/implement-plan/SKILL.md`
- `suite/skills/implement/implement-plan-with-subagents/SKILL.md`

**Verification:**
- `(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-skill-text.mjs && node scripts/check-marketplace-skills.mjs)` exits 0.
- `grep -n -E 'consult-descriptions|docs/product|docs/architecture|standing behavior' suite/skills/implement/*/SKILL.md` prints nothing.
- `grep -c 'every agents file' suite/skills/implement/implement/SKILL.md suite/skills/implement/implement-plan/SKILL.md suite/skills/implement/implement-plan-with-subagents/SKILL.md` prints `1` or more for each file, and on each file the match is inside the `**Write boundary.**` paragraph. Check with `grep -n '^\*\*Write boundary\.\*\*.*every agents file'`.
- `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr cli` exits 0.

**Acceptance criteria:**
- The write boundary of each implement skill lists every agents file among the files it never writes.
- None of the three implement skills reads a description input or names `docs/product/` or `docs/architecture/`.
- The three suite gates pass, and no delta target and nothing under `cli/` has changed.

**Consumes:** none

**Produces:** none
