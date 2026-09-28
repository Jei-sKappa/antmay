### Task 7: Land agents files in `close-thread` under the budget and passage checks

**Objective:** Make `close-thread` land agents-file delta documents and refuse two kinds of landing. It refuses one that would leave an agents file over 1,000 words and longer than before. It refuses to close while an agents-file passage the thread's work touched has become false. Its description inputs and targets go.

**Input / context:**
- `spec.md`, `## The change` → `### Suite: skills`, the `close-thread` bullet and its sub-bullets. The superseded path-check bullet is not in force.
- The reasons are settled in `delta/docs/pdr/2609280900-project-layer-holds-no-descriptive-kinds.md`: agents files are project layer, bounded and reviewed.
- `spec.md` `## Degrees of freedom` leaves open how `close-thread` works out what the thread changed. This task settles it with git: the diff from the parent of the commit that added the thread's `seed.md` to the working tree, plus untracked files, plus the targets of the thread's `delete` delta documents. That covers removed, renamed and touched paths.
- Why the word count is arithmetic: every check runs before the first write, so the "after" count is worked out without applying the landing. Blocks are whole lines, so each operation changes the count by exactly the words of its blocks. Applying the arithmetic to this thread's `delta/AGENTS.md` gives 1,093 → 1,068, and to `delta/suite/AGENTS.md` 835 → 844, the counts `spec.md` states.
- Starts from the repository as task 6 left it. Task 1 gave `close-thread` a copy of `formats/agents-file.md`. Task 3 let its `formats/delta-document.md` copy target agents files.
- The file to edit is `suite/skills/close/close-thread/SKILL.md`. Read it whole before editing. Every command in the new text is inline code: `check-skill-text` rejects a fence with leading whitespace, and a fence inside a list item would need one.

**Steps:**
1. `## Inputs`:
   - Delete the `docs/architecture/<module>.md …` and `docs/product/<capability>.md …` items.
   - After the `docs/adr/` and `docs/pdr/` item, add an item for every agents file in the project, in the shape `<skill_path>/references/formats/agents-file.md` defines. It says how they are listed: `git ls-files --cached --others --exclude-standard -- ':(glob)**/AGENTS.md' ':(glob)**/CLAUDE.md' ':(exclude).work'`, with a `CLAUDE.md` that is a symlink (`test -L`) counted once with the file it links to. Each file is never read whole; it is what the budget check counts and what the passage check searches.
   - In the `delta/` item, add that a delta document whose target is an agents file carries content in the shape `<skill_path>/references/formats/agents-file.md` defines.
2. `## Checks before any write`: change `Run all six, in order` to `Run all eight, in order`.
3. Insert this check as the new check 5, directly after the delta dry run (check 4):
   - **Agents-file budget.** For each agents file a `create` or an `edit` delta document targets, count its words before and after the landing, without reading the file:
     - Before is `wc -w < <file>`, or zero for a `create`.
     - After, for a `create`, is the word count of its body.
     - After, for an `edit`, is the before count, minus the words of every block the operations take out (each `remove` block, and each `replace` block's existing text), plus the words of every block they put in (each `add` block, and each `replace` block's new text). Skip any operation the dry run found already done.
     - Count each block by passing it to `wc -w` through a quoted heredoc.
     - A `delete` is never over budget.
     - When a file's after count is over 1,000 and greater than its before count, refuse per `## Refusals`, naming the file and both counts.
4. Insert this check as the new check 6, headed along the lines of **Agents-file passages**. It asks whether an agents file still says something true after the thread's work:
   - List what the thread changed, outside `.work/`:
     - Take the base commit as `git log --diff-filter=A --format=%H -- <thread>/seed.md | tail -n 1`.
     - Collect `git diff --name-status -M <base>^ -- . ':(exclude).work'`. This covers the thread's commits and the working tree together. When the seed has no commit, use `git diff --name-status -M HEAD -- . ':(exclude).work'` instead.
     - Add the untracked files from `git ls-files --others --exclude-standard -- . ':(exclude).work'` and the target of every `delete` delta document.
     - The list holds the paths removed, both sides of each rename, and the paths added or modified. A folder counts as removed when no file under it remains.
   - Search each agents file for mentions with `grep -n -F`. Search for every listed path, both repo-relative and relative to that agents file's folder. Also search for the last segment of every removed or renamed path and every removed folder.
   - Read only the matching passages, meaning the paragraph, list item or table row around each hit. Read them as they will stand once the landing applies. Where one of this thread's agents-file delta documents replaces or removes a passage, judge its new text. Search the text such a document adds as well.
   - Judge in natural language whether the thread's work made each passage false. Refuse per `## Refusals` on every false passage, quoting it together with the change that falsified it.
   - Make no finding about a passage that mentions nothing the thread changed. Propose no addition to any agents file: new content enters only through a discussion's closing offer.
5. Renumber the roadmap-reference check to 7 and the workspaces check to 8.
6. `## Refusals`: add two bullets.
   - An agents file the landing changes would end over 1,000 words and longer than it was. Name the file with both counts. Re-invoke once an `edit` delta document for that file, drafted through `spec` from an accepted `document` entry, brings it within budget or no longer than it was.
   - An agents-file passage the thread's work made false. Quote each such passage with the change that falsified it. Re-invoke once an `edit` delta document for that agents file, drafted through `spec` from an accepted `document` entry, corrects it.
7. `## Write boundary`: change the target list to `under docs/adr/, docs/pdr/, docs/glossary.md, and every agents file`, keeping the backticks and the rest of the paragraph.
8. From `suite/`, run `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/close/close-thread/SKILL.md`

**Verification:**
- `(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-skill-text.mjs && node scripts/check-marketplace-skills.mjs)` exits 0, and `git status --porcelain suite/skills/close/close-thread/references` prints nothing.
- `grep -n -E 'consult-descriptions|docs/product|docs/architecture|product delta|architecture delta' suite/skills/close/close-thread/SKILL.md` prints nothing.
- `grep -n -E 'Run all eight|wc -w|1,000|grep -n -F|git ls-files|formats/agents-file.md|every agents file' suite/skills/close/close-thread/SKILL.md` shows each term.
- `awk '/^## Checks before any write/{f=1;next} /^## /{f=0} f && /^[0-9]+\. \*\*/{n++} END{print n}' suite/skills/close/close-thread/SKILL.md` prints `8`.
- The commands the skill now carries work on this repository. From the root, the `git ls-files` listing prints `AGENTS.md`, `CLAUDE.md`, `cli/AGENTS.md`, `cli/CLAUDE.md`, `suite/AGENTS.md` and `suite/CLAUDE.md`, and nothing under `.work/`. The base-commit command, with `<thread>` set to `.work/threads/2026/09/28-0708-rethink-project-documentation`, prints one 40-character hash. `wc -w < AGENTS.md` prints `1093`.
- Manual check: apply the check-5 arithmetic to `.work/threads/2026/09/28-0708-rethink-project-documentation/delta/AGENTS.md`. The after count comes to 1,068, which is not greater than 1,093, so the landing passes the budget.
- Every pointer resolves: `(cd suite/skills/close/close-thread && grep -o '<skill_path>/references/[A-Za-z0-9_./-]*' SKILL.md | sed 's|^<skill_path>/||; s|[.,;:]*$||' | sort -u | while read -r p; do test -f "$p" || echo "missing: $p"; done)` prints nothing.
- `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr cli` exits 0.

**Acceptance criteria:**
- `close-thread` refuses to land when an agents file the landing changes would end over 1,000 words and longer than before, names the file with both counts, and measures with an inline `wc -w`.
- `close-thread` searches every agents file for mentions of the paths, files and folders the thread removed, renamed or touched, and reads only the matching passages.
- `close-thread` refuses to close on each matching passage the thread's work made false, quoting it with the change that falsified it.
- `close-thread` makes no finding about a passage that mentions nothing the thread changed, and proposes no addition to any agents file.
- `close-thread` reads no description input, and its write boundary lists every agents file among the project-layer files it lands.
- Both new checks run before the first write, and the checks section counts eight.
- The three suite gates pass, and no delta target and nothing under `cli/` has changed.

**Consumes:**
- `suite/skills/close/close-thread/references/formats/agents-file.md` (task 1).
- The agents-file target rules in `suite/skills/close/close-thread/references/formats/delta-document.md` (task 3).

**Produces:** none
