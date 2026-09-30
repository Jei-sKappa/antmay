### Task 1: Remove the `implement-plan` skill

**Objective:** Take `implement-plan` out of the suite, so that only `implement` and `implement-plan-with-subagents` remain as implement skills for the rest of the plan to reshape.

**Input / context:**
- `spec.md`, `### Removing implement-plan`, lists what is removed: the skill folder, its marketplace entry, its README section, its manifest block, and its commit scope.
- The sixth item on that list, the `implement/` line of the layout in `suite/AGENTS.md`, is landed by `delta/suite/AGENTS.md` at close. Do **not** edit `suite/AGENTS.md`: the delta document records the current blob hash of that file, and a hand edit would break the landing.
- `spec.md`, `## Scope and non-scope`: `cli/` and thread history under `.work/` keep naming `implement-plan`. Leave both alone.
- `suite/AGENTS.md` `## Rules`: after you remove a skill, run `node scripts/check-marketplace-skills.mjs` from `suite/`. The manifest header in `suite/shared/manifest.yaml` notes that removing an entry does not delete its generated copies. Here the whole skill folder is deleted, so no orphan copies are left behind.
- This is the first task. It starts from a clean working tree.

**Steps:**
1. Delete the directory `suite/skills/implement/implement-plan/` with everything in it (`git rm -r suite/skills/implement/implement-plan`).
2. In `.claude-plugin/marketplace.json`, remove the line `"./skills/implement/implement-plan",` from the `skills` array. Keep `"./skills/implement/implement-plan-with-subagents"` and the array's JSON validity. The trailing-comma layout of the neighbouring lines stays as it is.
3. In `suite/shared/manifest.yaml`, remove the whole `skills/implement/implement-plan:` block: its key line, its seven list lines, and the blank line that separates it from the next block. Keep the `skills/implement/implement-plan-with-subagents:` block unchanged.
4. In `.vscode/settings.json`, remove `"implement-plan",` from `conventionalCommits.scopes`. The array stays sorted, and `"implement-plan-with-subagents"` stays.
5. In `README.md`, under `### Implement`, remove the whole `#### [`implement-plan`](./suite/skills/implement/implement-plan/SKILL.md)` section: its heading, its one-paragraph description, its `npx skills add Jei-sKappa/antmay --skill implement-plan` code block, and the blank line after it. Keep the `implement` and `implement-plan-with-subagents` sections. The latter keeps its sentence "Expects a strict plan folder and a runtime that supports subagents; …".
6. From `suite/`, run `node scripts/sync-shared-references.mjs`. It should succeed and change nothing outside the deleted folder, because the manifest no longer declares it.
7. From `suite/`, run `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`. Resolve any failure within this task's files.

**Files modified:**
- `suite/skills/implement/implement-plan/` (DELETED, with every file under it: `SKILL.md`, `agents/openai.yaml`, `references/formats/*`, `references/instructions/*`)
- `.claude-plugin/marketplace.json`
- `suite/shared/manifest.yaml`
- `.vscode/settings.json`
- `README.md`

**Verification:**
- `test ! -e suite/skills/implement/implement-plan` succeeds.
- `rg -n --hidden -P 'implement-plan(?!-with)' -g '!.work/**' -g '!cli/**' -g '!.git/**' .` prints exactly one hit: `suite/AGENTS.md`, the layout line that `delta/suite/AGENTS.md` lands at close.
- `jq -e '.plugins[0].skills | (index("./skills/implement/implement-plan") == null) and (index("./skills/implement/implement-plan-with-subagents") != null)' .claude-plugin/marketplace.json` prints `true`.
- `jq -e '.["conventionalCommits.scopes"] | (index("implement-plan") == null) and (index("implement-plan-with-subagents") != null) and (. == sort)' .vscode/settings.json` prints `true`.
- `grep -c '^skills/implement/implement-plan-with-subagents:$' suite/shared/manifest.yaml` prints `1`, and `grep -c '^skills/implement/implement-plan:$' suite/shared/manifest.yaml` prints `0`.
- ``grep -n '^#### \[`implement' README.md`` prints exactly two lines: `implement` and `implement-plan-with-subagents`.
- From `suite/`, `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs` both exit 0.
- `git status --porcelain -- cli suite/AGENTS.md docs/glossary.md` prints nothing.

**Acceptance criteria:**
- `suite/skills/implement/implement-plan/` no longer exists.
- No file outside `cli/` and `.work/` names `implement-plan` as a skill.
- As of this task, the one remaining hit outside `cli/` and `.work/` is the `suite/AGENTS.md` layout line. `delta/suite/AGENTS.md` removes it when the thread closes.
- `.claude-plugin/marketplace.json`, `suite/shared/manifest.yaml` and `.vscode/settings.json` carry no `implement-plan` entry, while their `implement-plan-with-subagents` entries remain.
- `README.md` has no `implement-plan` section under `### Implement`, and still has the `implement` and `implement-plan-with-subagents` sections.
- `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`, run from `suite/`, both pass.
- No file under `cli/` is modified.
- `suite/AGENTS.md` and `docs/glossary.md` are unmodified.

**Consumes:** none

**Produces:** a suite whose implement group holds only `suite/skills/implement/implement/` and `suite/skills/implement/implement-plan-with-subagents/`, and a `suite/shared/manifest.yaml` with no `skills/implement/implement-plan:` key. From here on, `node scripts/sync-shared-references.mjs` mirrors the report format and instruction only into the skills that remain.
