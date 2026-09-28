### Task 9: Remove the descriptive kinds from the remaining skills

**Objective:** Remove every mention of `consult-descriptions`, `docs/product/`, `docs/architecture/` and the product-behavior format from the nine skills not yet rewritten. Make `resolve-pending-decisions` state that it writes no `document` line.

**Input / context:**
- `spec.md`, `## The change` → `### Suite: skills`, the bullet naming `plan-brief`, `plan-strict`, `check-plan`, `review-implementation`, `review-code`, `open-thread`, `open-ticket`, `resolve-pending-decisions` and `roadmap`. Also `formats/roadmap-index.md` bullet under `### Suite: formats and instructions`, for the planned-behavior wording `roadmap` restates.
- `spec.md` `## Inferences`: `resolve-pending-decisions` writes no `document` entry, because a discussion's closing offer is that type's only writer (`suite/shared/references/formats/log-line.md`, task 2).
- Starts from the repository as task 8 left it. Task 3 rewrote the roadmap-index format that `roadmap` points at.

**Steps:**
1. In each of these seven files, under `## Inputs`, delete the `docs/architecture/<module>.md …` and `docs/product/<capability>.md …` items. In the file's never-written project-layer list, delete `docs/product/` and `docs/architecture/`, and fix the commas that remain.
   - `suite/skills/plan/plan-brief/SKILL.md`
   - `suite/skills/plan/plan-strict/SKILL.md`
   - `suite/skills/plan/check-plan/SKILL.md`
   - `suite/skills/review/review-implementation/SKILL.md`
   - `suite/skills/review/review-code/SKILL.md`
   - `suite/skills/capture-discussion/open-thread/SKILL.md`
   - `suite/skills/capture-discussion/open-ticket/SKILL.md`. This body is hard-wrapped at about 80 columns. Delete the four wrapped lines of the two items, and re-wrap the never-written list paragraph near the top of the body to the same width.
2. `suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md`:
   - Apply step 1's two edits: the Inputs items and the never-written list.
   - In `## Writing a settled point`, replace the sentence `A point that changes the design, fixes a term or earns a decision record reaches the spec and the thread's delta/ through the spec authoring's amendment pass, which works from the log entries appended since the spec last stood current;` with content that says three things. First, a point that changes the design, or the content of a document the log already carries a `document` entry for, reaches the spec and the thread's `delta/` through the spec authoring's amendment pass, which works from the log entries appended since the spec last stood current. Second, the line you append is never a `document` line. Third, a document enters the project layer only through a discussion's closing offer. Keep the `## Follow-through is where you recommend that pass.` clause and the sentence after it.
3. `suite/skills/roadmap/roadmap/SKILL.md`:
   - Apply step 1's two edits: the Inputs items and the never-written list after `**You create the index file and write nothing else.**`.
   - In the `delta/` item under `## Inputs`, change `the direction's settled records and descriptions as the thread drafted them` to `the direction's settled records, glossary terms and agents-file changes as the thread drafted them`.
   - In the entries bullet, replace ``each written in the form `<skill_path>/references/formats/product-behavior.md` fixes for a statement of what the product does`` with `each one present-tense statement of what the product does once built`.
   - Change `Where an entry's text names a decision record or a description, cite it` to `Where an entry's text names a decision record, cite it`.
4. `suite/shared/manifest.yaml`: remove `formats/product-behavior.md` from the `skills/roadmap/roadmap` list.
5. Delete the orphaned generated copy `suite/skills/roadmap/roadmap/references/formats/product-behavior.md` with `rm`. The manifest header says to delete an orphan by hand once its entry is removed.
6. From `suite/`, run `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/plan/plan-brief/SKILL.md`
- `suite/skills/plan/plan-strict/SKILL.md`
- `suite/skills/plan/check-plan/SKILL.md`
- `suite/skills/review/review-implementation/SKILL.md`
- `suite/skills/review/review-code/SKILL.md`
- `suite/skills/capture-discussion/open-thread/SKILL.md`
- `suite/skills/capture-discussion/open-ticket/SKILL.md`
- `suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md`
- `suite/skills/roadmap/roadmap/SKILL.md`
- `suite/shared/manifest.yaml`
- `suite/skills/roadmap/roadmap/references/formats/product-behavior.md` (DELETED)

**Verification:**
- `(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-skill-text.mjs && node scripts/check-marketplace-skills.mjs)` exits 0.
- `grep -rn -E 'consult-descriptions|docs/product|docs/architecture|product-behavior|architecture-description|product behavior|architecture description|descriptions|or a description' --include=SKILL.md suite/skills` prints matches only in `suite/skills/model-invoked/consult-descriptions/SKILL.md`, which task 10 deletes.
- `` grep -n '`document`' suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md `` finds the sentence saying the appended line is never a `document` line.
- `test ! -e suite/skills/roadmap/roadmap/references/formats/product-behavior.md` exits 0. `grep -n 'product-behavior' suite/shared/manifest.yaml` shows only the `skills/model-invoked/consult-descriptions` entry.
- Every pointer in the nine bodies resolves: `for d in plan/plan-brief plan/plan-strict plan/check-plan review/review-implementation review/review-code capture-discussion/open-thread capture-discussion/open-ticket capture-discussion/resolve-pending-decisions roadmap/roadmap; do (cd suite/skills/$d && grep -o '<skill_path>/references/[A-Za-z0-9_./-]*' SKILL.md | sed 's|^<skill_path>/||; s|[.,;:]*$||' | sort -u | while read -r p; do test -f "$p" || echo "missing: $d/$p"; done); done` prints nothing.
- `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr cli` exits 0.

**Acceptance criteria:**
- None of the nine skills names `consult-descriptions`, `docs/product/`, `docs/architecture/` or the product-behavior format, and every `<skill_path>/` pointer in their bodies resolves.
- `resolve-pending-decisions` states that the line it appends is never a `document` line, and that a document enters the project layer only through a discussion's closing offer.
- `roadmap` describes a planned-behavior line as a present-tense statement of what the product does once built, without pointing at a product-behavior format.
- The manifest no longer declares `formats/product-behavior.md` for `roadmap`, and no copy of it remains in `roadmap`'s `references/`.
- The three suite gates pass, and no delta target and nothing under `cli/` has changed.

**Consumes:** The rewritten `formats/roadmap-index.md` (task 3), which `roadmap`'s planned-behavior wording now matches.

**Produces:** No skill body under `suite/skills/` other than `consult-descriptions` names `consult-descriptions` or the two descriptive formats. The only manifest entry still declaring them is `skills/model-invoked/consult-descriptions`. Task 10 relies on both.
