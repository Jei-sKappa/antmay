### Task 10: Retire `consult-descriptions` and the two descriptive formats

**Objective:** Remove the `consult-descriptions` skill and every registration of it, then delete the canonical product-behavior and architecture-description formats. Nothing declares or points at either format by this point.

**Input / context:**
- `spec.md`, `## The change`, these bullets: `consult-descriptions: the skill folder is deleted`; `formats/product-behavior.md and formats/architecture-description.md are deleted`; under `### Suite: registration and maintainer text`, the manifest, `.claude-plugin/marketplace.json`, `.vscode/settings.json` and `README.md` bullets.
- The reason is settled in `delta/docs/pdr/2609280900-project-layer-holds-no-descriptive-kinds.md`.
- The registrations to undo are listed in `suite/AGENTS.md`, `## Before anything else`: the marketplace `skills` array, a README section under `## Model-invoked skills`, and `conventionalCommits.scopes` in `.vscode/settings.json`.
- Global Constraint on `cli/`: `cli/src/pipeline/documentation.test.ts` reads the suite's skill folders. Removing a skill is drift that gets recorded, and `cli/` is not edited.
- Starts from the repository as task 9 left it. After tasks 5 and 9, only the `skills/model-invoked/consult-descriptions` manifest entry still declares the two formats, and no other skill body names `consult-descriptions`.

**Steps:**
1. Confirm the precondition: `grep -rln -E 'consult-descriptions|product-behavior\.md|architecture-description\.md' --include=SKILL.md suite/skills` lists only `suite/skills/model-invoked/consult-descriptions/SKILL.md`. If it lists any other file, stop: that is a defect of task 4, 5, 6, 7, 8 or 9, not something to fix here.
2. Delete the folder `suite/skills/model-invoked/consult-descriptions/` with `rm -r`. It holds `SKILL.md`, `agents/openai.yaml`, `references/formats/product-behavior.md` and `references/formats/architecture-description.md`.
3. `suite/shared/manifest.yaml`: remove the `skills/model-invoked/consult-descriptions:` key and its two list items, and the blank line before it.
4. Delete `suite/shared/references/formats/product-behavior.md` and `suite/shared/references/formats/architecture-description.md` with `rm`.
5. `.claude-plugin/marketplace.json`: remove the line `"./skills/model-invoked/consult-descriptions",` from the `skills` array and keep the JSON valid.
6. `.vscode/settings.json`: remove `"consult-descriptions",` from `conventionalCommits.scopes`, keeping the array sorted and valid.
7. `README.md`:
   - Delete the `#### [consult-descriptions](…)` section: its heading, its paragraph, and its `sh` install block.
   - `## Model-invoked skills`: change `The two skills below are **model-invoked**: the model may reach for them on its own…, because what they read is useful in any situation` to the singular, for example `The skill below is **model-invoked**: the model may reach for it on its own…, because what it reads is useful in any situation`. Keep the rest of the paragraph in the singular too.
   - `## Terminal outcomes`: change `nor the two model-invoked skills below` to `nor the model-invoked skill below`.
8. Add this line to the implementation report's `## Follow-ups`: removing `consult-descriptions` changes the skill list `cli/src/pipeline/documentation.test.ts` holds `cli/README.md`'s stage table to; that drift is left for the CLI realignment pass, and `cli/` is untouched. The report is the implement skill's own output, not a file this task lists.
9. From `suite/`, run `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/model-invoked/consult-descriptions/SKILL.md` (DELETED)
- `suite/skills/model-invoked/consult-descriptions/agents/openai.yaml` (DELETED)
- `suite/skills/model-invoked/consult-descriptions/references/formats/product-behavior.md` (DELETED)
- `suite/skills/model-invoked/consult-descriptions/references/formats/architecture-description.md` (DELETED)
- `suite/shared/references/formats/product-behavior.md` (DELETED)
- `suite/shared/references/formats/architecture-description.md` (DELETED)
- `suite/shared/manifest.yaml`
- `.claude-plugin/marketplace.json`
- `.vscode/settings.json`
- `README.md`

**Verification:**
- `(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-skill-text.mjs && node scripts/check-marketplace-skills.mjs)` exits 0, and the marketplace check reports 17 skills.
- `test ! -e suite/skills/model-invoked/consult-descriptions && test ! -e suite/shared/references/formats/product-behavior.md && test ! -e suite/shared/references/formats/architecture-description.md` exits 0.
- `find suite/skills -name product-behavior.md -o -name architecture-description.md` prints nothing.
- `grep -n consult-descriptions .claude-plugin/marketplace.json .vscode/settings.json suite/shared/manifest.yaml README.md` prints nothing.
- `node -e 'JSON.parse(require("fs").readFileSync(".claude-plugin/marketplace.json","utf8")); JSON.parse(require("fs").readFileSync(".vscode/settings.json","utf8"))'` exits 0.
- `grep -n -E 'two model-invoked|two skills below' README.md` prints nothing.
- `git status --porcelain cli` prints nothing.
- `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr cli` exits 0.

**Acceptance criteria:**
- `suite/shared/references/formats/product-behavior.md` and `suite/shared/references/formats/architecture-description.md` do not exist, and no skill folder carries a copy of either.
- `suite/skills/model-invoked/consult-descriptions/` does not exist, and neither `.claude-plugin/marketplace.json`, `.vscode/settings.json`, `suite/shared/manifest.yaml` nor `README.md` names `consult-descriptions`.
- The README describes one model-invoked skill, `consult-decisions`, and says so in the singular wherever it counts them.
- The implementation report records the CLI stage-table drift as a follow-up, and `cli/` is unchanged.
- The three suite gates pass, and no delta target and nothing under `cli/` has changed.

**Consumes:**
- The `skills/spec/spec` manifest entry without the two formats (task 5).
- The `skills/roadmap/roadmap` manifest entry without `formats/product-behavior.md`, and no other skill body naming `consult-descriptions` (task 9).

**Produces:** The suite ships 17 skills with one model-invoked skill, and neither retired format exists anywhere under `suite/`.
