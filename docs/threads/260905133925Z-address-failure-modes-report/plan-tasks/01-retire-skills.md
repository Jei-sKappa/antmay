### Task 1: Retire the ten skills and their distribution entries

**Objective:** Remove the ten retired skills from `suite/skills/` and from every file that distributes, indexes, or scopes them, so later tasks work on the twenty skills that remain.

**Input / context:** `spec.md` `### Skill inventory` (retired skills) and `### Documentation and repository maintenance`; decisions.md DR15 (proposal and reconcile family removed, `review-roadmap` goes), DR14 (materialization and the feedback channel retired), DR25 (`merge-artifacts` retired), DR5 (`archive-thread` absorbed into the closing skill). The suite's distribution contract lives in `suite/AGENTS.md` `## Layout`: every skill folder must appear in the `Antmay` plugin's `skills` array of `.claude-plugin/marketplace.json`, and `node scripts/check-marketplace-skills.mjs` fails when `marketplace.json` and `skills/` disagree in either direction. `suite/AGENTS.md` itself is rewritten in task 16; do not edit it here.

**Steps:**

1. From the repository root, remove the retired skill folders with `git rm -r`: `suite/skills/propose/`, `suite/skills/reconcile/`, `suite/skills/merge/` (each whole group folder), `suite/skills/roadmap/materialize-roadmap-threads/`, `suite/skills/review/review-roadmap/`, `suite/skills/primitives/append-roadmap-feedback/`, `suite/skills/finish-navigate/archive-thread/`.
2. In `.claude-plugin/marketplace.json`, delete the ten array entries whose leaf is one of `propose`, `reconcile-plan`, `reconcile-proposal`, `reconcile-roadmap`, `reconcile-spec`, `merge-artifacts`, `materialize-roadmap-threads`, `review-roadmap`, `append-roadmap-feedback`, `archive-thread`. Keep the remaining twenty entries in their existing order.
3. In the root `README.md`, delete the `### Propose`, `### Reconcile`, and `### Merge` sections in full, and delete the `#### materialize-roadmap-threads`, `#### review-roadmap`, `#### archive-thread`, and `#### append-roadmap-feedback` subsections (heading, description, install snippet). Leave every other line of `README.md` unchanged; its prose is rewritten in task 16.
4. In `.vscode/settings.json`, remove the same ten names from `conventionalCommits.scopes`, keeping the array sorted.
5. Run `node scripts/check-marketplace-skills.mjs` from `suite/`.

**Files modified:** `suite/skills/propose/propose/**` (DELETED), `suite/skills/reconcile/reconcile-plan/**` (DELETED), `suite/skills/reconcile/reconcile-proposal/**` (DELETED), `suite/skills/reconcile/reconcile-roadmap/**` (DELETED), `suite/skills/reconcile/reconcile-spec/**` (DELETED), `suite/skills/merge/merge-artifacts/**` (DELETED), `suite/skills/roadmap/materialize-roadmap-threads/**` (DELETED), `suite/skills/review/review-roadmap/**` (DELETED), `suite/skills/primitives/append-roadmap-feedback/**` (DELETED), `suite/skills/finish-navigate/archive-thread/**` (DELETED), `.claude-plugin/marketplace.json`, `README.md`, `.vscode/settings.json`

**Verification:**

```sh
ls suite/skills                       # exactly: capture-discussion finish-navigate implement plan primitives review roadmap spec
find suite/skills -name SKILL.md | wc -l    # 20
grep -c '"./skills/' .claude-plugin/marketplace.json     # 20
grep -n "propose\|reconcile\|merge-artifacts\|materialize-roadmap-threads\|review-roadmap\|archive-thread\|append-roadmap-feedback" .claude-plugin/marketplace.json .vscode/settings.json   # no output
grep -n "skills/propose\|skills/reconcile\|skills/merge\|materialize-roadmap-threads\|review-roadmap\|archive-thread\|append-roadmap-feedback" README.md   # no output
(cd suite && node scripts/check-marketplace-skills.mjs)  # exit 0
```

**Acceptance criteria:**

- None of the ten retired skill folders exists under `suite/skills/`; the `propose/`, `reconcile/`, and `merge/` group folders are gone.
- `marketplace.json`, the root `README.md` skill index, and `conventionalCommits.scopes` name none of the ten.
- `check-marketplace-skills.mjs` passes.

**Consumes:** none

**Produces:** a `suite/skills/` tree of twenty skills in eight groups (`capture-discussion`, `finish-navigate`, `implement`, `plan`, `primitives`, `review`, `roadmap`, `spec`) that every later task edits, and a `marketplace.json` / `README.md` / scopes triple that lists exactly those twenty.
