### Task 11: Update the maintainer and user-facing documents, then verify the whole change

**Objective:** Remove the retired kinds and the two deleted documents from the authoring conventions, `README.md`, `CONTRIBUTING.md` and `docs/documentation-rules.md`. Then show that the whole change holds: gates, sync idempotence, the repository-wide name sweep, an untouched `cli/`, and a delta ready to land.

**Input / context:**
- `spec.md`, `## The change` → `### Suite: registration and maintainer text`: the `suite/authoring/body-structure.md` and `suite/authoring/side-effects.md` bullet, the `README.md` / `CONTRIBUTING.md` / `docs/documentation-rules.md` bullet, and the last bullet, which runs the three scripts from `suite/` last.
- `docs/product/method.md` and `docs/architecture/suite.md` are deleted at close by `delta/docs/product/method.md` and `delta/docs/architecture/suite.md`, so no document may keep pointing at them. `docs/documentation-rules.md` and `CONTRIBUTING.md` are maintainer documents, not project layer, so this task edits them directly.
- The files the delta edits or deletes at close still name the retired kinds until then: `AGENTS.md`, `suite/AGENTS.md`, `docs/glossary.md` and `docs/product/method.md`. They are the exceptions the name-sweep criterion allows (`where a delta document … requires it`). This task does not touch them.
- Starts from the repository as task 10 left it: every suite file is already rewritten.

**Steps:**
1. `suite/authoring/body-structure.md`: in the fenced Inputs template under `The list opens with the project layer…`, delete the two lines `- docs/architecture/<module>.md …` and `- docs/product/<capability>.md …`.
2. `suite/authoring/side-effects.md`, the `close-thread` bullet under `## The suite-wide write boundaries`: change the landed list to `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, the agents files, and the `superseded/` folders records move into. Keep the wrapped line width.
3. `README.md`:
   - Under `## Threads and the project layer`, in the project-layer bullet list, delete the `docs/product/` and `docs/architecture/` bullets. After the `docs/glossary.md` bullet, add one for the agents files, at the overview level of its neighbours: every `AGENTS.md` or `CLAUDE.md`, holding critical rules, how the repository is structured and where to find things, and pointers, each kept under 1,000 words. Adjust the lead-in sentence if `always at the same paths` no longer fits a list that includes files found anywhere in the project.
   - Delete the paragraph that points at `docs/product/method.md` (`… describes the whole method: how the skills relate…`).
   - The `discussion` entry: change `leaves one log line per settled point.` to also say it leaves one `document` line per project-layer document you accept when the discussion closes.
   - `## Contributing`: delete the clause `[docs/product/method.md](./docs/product/method.md) is the method it runs on itself,` and fix the list punctuation.
4. `CONTRIBUTING.md`, `## Working in the repository`: delete the sentence fragment `[docs/product/method.md](./docs/product/method.md) explains how this repository carries its own work in the threads the suite defines, and`. The paragraph then reads on to the `suite/authoring/` sentence; re-wrap to the file's width. Leave `product-behavior outcome` and `product behavior` in the issue-classification text: they use the ordinary sense and name no retired kind.
5. `docs/documentation-rules.md`:
   - The **Maintainer documentation** paragraph: delete the segment from `` `docs/product/method.md` describes the method as this repository runs it `` through `…architecture-description formats define;`. The list reads on from `docs/documentation-rules.md is this file;` to `suite/authoring/ holds…`. Re-wrap.
   - The citation paragraph: delete the sentence `A description is cited by path and heading.` Change `through the record or the description it landed in` to `through the record, the glossary row or the agents file it landed in`.
6. From `suite/`, run the gates last: `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.
7. Run the whole-change checks under **Verification** and record each result in the implementation report.

**Files modified:**
- `suite/authoring/body-structure.md`
- `suite/authoring/side-effects.md`
- `README.md`
- `CONTRIBUTING.md`
- `docs/documentation-rules.md`

**Verification:**
- Gates: `(cd suite && node scripts/check-marketplace-skills.mjs && node scripts/check-skill-text.mjs)` exits 0.
- Sync idempotence: `(cd suite && node scripts/sync-shared-references.mjs) && S1=$(git status --porcelain; git diff | shasum) && (cd suite && node scripts/sync-shared-references.mjs) && S2=$(git status --porcelain; git diff | shasum) && [ "$S1" = "$S2" ]` exits 0. Separately, `git status --porcelain suite/skills` shows no generated copy changed by this task's sync run.
- Name sweep: `git grep -l -I --untracked -E 'consult-descriptions|docs/product/|docs/architecture/|product-behavior\.md|architecture-description\.md' -- ':!.work' ':!cli'` prints exactly `AGENTS.md`, `docs/glossary.md`, `docs/product/method.md` and `suite/AGENTS.md`. Every one is a target the thread's delta edits or deletes at close.
- `cli/` untouched: `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- cli && [ -z "$(git status --porcelain cli)" ]` exits 0.
- Delta ready to land: every `edit` and `delete` delta document's recorded hash still matches its target, and every `create` target is absent. Check with `T=.work/threads/2026/09/28-0708-rethink-project-documentation; (cd $T/delta && find . -type f | sed 's|^\./||') | while read -r d; do h=$(awk '/^hash: /{print $2; exit}' "$T/delta/$d"); if [ -n "$h" ]; then [ "$h" = "$(git hash-object "$d")" ] || echo "stale: $d"; else [ ! -e "$d" ] || echo "exists: $d"; fi; done`, which prints nothing.
- The PDR delete is a plain delete, not a supersede. `awk '/^type: /{print $2; exit}' .work/threads/2026/09/28-0708-rethink-project-documentation/delta/docs/pdr/2609230721-thread-design-document-is-the-spec.md` prints `delete`. `grep -l supersedes .work/threads/2026/09/28-0708-rethink-project-documentation/delta/docs/pdr/2609280900-*.md` prints nothing, so the landing moves no record into `superseded/`.
- The delta targets are untouched: `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr` exits 0.
- `grep -n -E 'docs/product|docs/architecture|a description is cited|or the description' README.md CONTRIBUTING.md docs/documentation-rules.md suite/authoring/*.md` prints nothing.

**Acceptance criteria:**
- Outside `.work/` and `cli/`, no file names `consult-descriptions`, `docs/product/`, `docs/architecture/`, `product-behavior.md` or `architecture-description.md`, except where a delta document or this repository's own history requires it.
- `node suite/scripts/check-marketplace-skills.mjs` and `node suite/scripts/check-skill-text.mjs` pass from `suite/`, and rerunning `node suite/scripts/sync-shared-references.mjs` changes no file.
- Nothing under `cli/` is modified.
- `docs/pdr/2609230721-thread-design-document-is-the-spec.md` does not exist after close, and no `superseded/` copy of it exists.
- The README describes the project layer as decision records, the glossary, the agents files and the roadmap indexes, and says `discussion` leaves `document` lines. Neither the README nor `CONTRIBUTING.md` points at `docs/product/method.md`.
- `docs/documentation-rules.md` names neither deleted document and carries no citation rule for a description.
- The authoring Inputs template carries no description item, and `side-effects.md` lists the agents files among what `close-thread` lands.
- Every delta document still lands cleanly: each recorded hash matches its target, and each `create` target is absent.

The PDR criterion is met when `close-thread` lands the delta. This task shows the delta is ready for that. Record the criterion in the implementation report as verified by manual check of the delta, not as delivered by the implementation.

**Consumes:** Every suite file as tasks 1–10 left it. The name sweep and the sync-idempotence check read the whole repository.

**Produces:** none
