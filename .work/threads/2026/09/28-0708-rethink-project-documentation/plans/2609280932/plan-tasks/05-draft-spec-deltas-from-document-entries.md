### Task 5: Draft `spec` deltas from `document` entries only

**Objective:** Make `spec` draft a project-layer delta document only from a `document` entry still in force. Its audit then flags any entry without a delta and any delta without an entry, and the skill stops reading or drafting the descriptive kinds.

**Input / context:**
- `spec.md`, `## The change` → `### Suite: skills`, the `spec` bullet and its sub-bullets. Also `formats/spec.md` bullet under `### Suite: formats and instructions`, for the one rule the skill restates.
- The reasons are settled in `delta/docs/pdr/2609280900-project-layer-documents-enter-by-user-acceptance.md` (spec is the only drafter; a document entry the user accepted is not re-tested) and `delta/docs/pdr/2609280900-project-layer-holds-no-descriptive-kinds.md`.
- Starts from the repository as task 4 left it. Task 3 put the new routing table and one rule in `spec`'s copy of `formats/spec.md`. Task 1 gave `spec` a copy of `formats/agents-file.md`. Task 2 added the `document` type to its `formats/log-line.md` copy.
- The file to edit is `suite/skills/spec/spec/SKILL.md`. Read it whole before editing.

**Steps:**
1. `## Inputs`: delete the `docs/architecture/<module>.md …` and `docs/product/<capability>.md …` items.
2. The opening paragraphs:
   - First paragraph: change `draft the spec body and the delta documents that carry everything standing` to `draft the spec body and the delta documents that carry what the thread lands in the project layer`.
   - Second paragraph (`A spec a downstream reader…`): change its closing clause to `— with every project-layer document the change lands carried by a delta document and cited rather than restated.`
3. `## The spec`, the paragraph beginning `One rule governs every sentence`: change the rule to `every project-layer document the change lands is carried by a delta document and cited from here, never restated in the body.` Keep the `What stays in the body is what is thread-only…` sentence that follows.
4. Rewrite `## Draft the delta documents`:
   - First paragraph: draft one delta document, or one operation within one, for each `document` entry of the log still in force, and from no other log line. An entry is in force until a later `document` entry on the same document supersedes it. The user accepted each entry when the discussion closed, so do not apply the decision test to it again. The entry's gist names what the document records; its text is drafted from the settled points the gist covers. The routing table in `<skill_path>/references/formats/spec.md` gives each entry its home.
   - Bullets, replacing the current five:
     - An ADR or PDR entry becomes a `create` delta document under `delta/docs/adr/` or `delta/docs/pdr/`, following `<skill_path>/references/formats/decision-record.md`. File it by the question it answers rather than by how it is enforced, and assign the stem when you first write it; the stem never changes after that.
     - A glossary entry becomes an `edit`, or a `create` when the file is absent, for `delta/docs/glossary.md`, following `<skill_path>/references/formats/glossary.md`.
     - An agents-file entry becomes an `edit`, a `create` or a `delete` at that agents file's mirrored path under `delta/` (for example `delta/AGENTS.md`), following `<skill_path>/references/formats/agents-file.md`.
     - Keep the current roadmap bullet unchanged: behavior settled but not built gets no delta document, and its home is the roadmap entry.
   - Keep the paragraph on `<skill_path>/references/formats/delta-document.md`, reading targets and `git hash-object` unchanged.
   - Delete the paragraph `A delta document the user asked for directly is drafted the same way, without the decision test — the request is what settles the point.`
   - Last paragraph: change `Where the body cites a decision record, a description or a roadmap entry instead` to `Where the body cites a decision record or a roadmap entry instead`.
5. `## Audit pass`, the paragraph beginning `Walk the primary input claim by claim`:
   - Rewrite the second check: `document` entries and delta documents correspond one to one. Every `document` entry in force has its delta document, or its operation within one, and no delta document stands without a `document` entry in force. Name each failure of either kind and repair the draft before writing: draft the missing document, and leave the unwarranted one out.
   - Rewrite the third check: no passage of the body restates a project-layer document the delta carries.
   - Keep the first check (`That it landed somewhere…`).
6. `## Amendment pass`: replace `A new point whose home is a delta document the thread does not have yet gets one drafted now, cited from the body and added to the delta index.` with `A new document entry whose document the thread's delta does not hold yet gets its delta document drafted now, cited from the body and added to the delta index.`, with `document` in backticks.
7. `## Procedure` step 5: change the repo-relative example `docs/product/<capability>.md` to `docs/adr/<stem>.md`.
8. The write-boundary paragraph after `## Procedure`: the never-written list becomes `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, every agents file, the roadmap index, and every file a delta document targets.
9. Edit `suite/shared/manifest.yaml`: remove `formats/product-behavior.md` and `formats/architecture-description.md` from the `skills/spec/spec` list.
10. Delete the orphaned generated copies `suite/skills/spec/spec/references/formats/product-behavior.md` and `suite/skills/spec/spec/references/formats/architecture-description.md` with `rm`. The manifest header says to delete an orphan by hand once its entry is removed.
11. From `suite/`, run `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/spec/spec/SKILL.md`
- `suite/shared/manifest.yaml`
- `suite/skills/spec/spec/references/formats/product-behavior.md` (DELETED)
- `suite/skills/spec/spec/references/formats/architecture-description.md` (DELETED)

**Verification:**
- `(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-skill-text.mjs && node scripts/check-marketplace-skills.mjs)` exits 0.
- `grep -n -E 'consult-descriptions|docs/product|docs/architecture|product-behavior|architecture-description|a description|descriptions|standing behavior|asked for directly' suite/skills/spec/spec/SKILL.md` prints nothing.
- `` grep -c '`document` entr' suite/skills/spec/spec/SKILL.md `` prints at least `3`, and `grep -n 'formats/agents-file.md' suite/skills/spec/spec/SKILL.md` finds the agents-file bullet.
- `test ! -e suite/skills/spec/spec/references/formats/product-behavior.md && test ! -e suite/skills/spec/spec/references/formats/architecture-description.md` exits 0. `awk '/^skills\/spec\/spec:/{f=1;next} /^[^ ]/{f=0} f' suite/shared/manifest.yaml | grep -c -E 'product-behavior|architecture-description'` prints `0`.
- Every pointer resolves: `(cd suite/skills/spec/spec && grep -o '<skill_path>/references/[A-Za-z0-9_./-]*' SKILL.md | sed 's|^<skill_path>/||; s|[.,;:]*$||' | sort -u | while read -r p; do test -f "$p" || echo "missing: $p"; done)` prints nothing.
- Code review: `## Draft the delta documents` names no source for a delta other than a `document` entry and does not re-apply the decision test. `## Audit pass` names both failure kinds.
- `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr cli` exits 0.

**Acceptance criteria:**
- `spec` drafts a project-layer delta document only from `document` entries still in force, and its audit reports a `document` entry with no delta and a delta document with no `document` entry.
- `spec`'s one rule matches the spec format's: every project-layer document the change lands is carried by a delta document and cited, never restated in the body.
- `spec` reads no description input, drafts no product-behavior or architecture-description delta, and its write boundary lists every agents file among the files it never writes.
- The manifest no longer declares `formats/product-behavior.md` or `formats/architecture-description.md` for `spec`, and neither copy exists in `spec`'s `references/`.
- The three suite gates pass, and no delta target and nothing under `cli/` has changed.

**Consumes:**
- The routing table and one rule in `suite/skills/spec/spec/references/formats/spec.md` (task 3).
- `suite/skills/spec/spec/references/formats/agents-file.md` (task 1).
- The `document` type in `suite/skills/spec/spec/references/formats/log-line.md` (task 2).

**Produces:** The `skills/spec/spec` manifest entry no longer declares `formats/product-behavior.md` or `formats/architecture-description.md`. Task 10 relies on this when it deletes the canonical formats.
