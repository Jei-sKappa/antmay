### Task 4: Add the closing offer to `discussion`

**Objective:** Make `discussion` the one gate through which a document enters the project layer. It proposes records, agents-file changes and glossary terms only once the user agrees to stop, and logs one `document` line per candidate the user accepts.

**Input / context:**
- `spec.md`, `## The change` → `### Suite: skills`, the `discussion` bullet and its sub-bullets.
- The reason is settled in `delta/docs/pdr/2609280900-project-layer-documents-enter-by-user-acceptance.md`: the gate is the user saying yes to each document.
- The spec leaves the closing offer's position free, provided it follows the user's agreement to stop and comes before Finish. This task settles it as a new step 8.
- Starts from the repository as task 3 left it. Task 1 gave `discussion` copies of `formats/decision-record.md`, `formats/glossary.md` and `formats/agents-file.md`, and task 2 gave its `formats/log-line.md` copy the `document` type.
- The file to edit is `suite/skills/capture-discussion/discussion/SKILL.md`. Read it whole before editing.

**Steps:**
1. `## Inputs`: delete the two list items that read `docs/architecture/<module>.md …` and `docs/product/<capability>.md …`.
2. Opening paragraph: change its last sentence to `The spec and every delta document under the thread's delta/ are written afterwards, from what this discussion settles and the documents it accepts.`, with `delta/` in backticks.
3. `## Procedure` step 5: keep it. Add a clause saying a point that only fixes a term is the exception step 6 holds back.
4. `## Procedure` step 6: replace it with a step headed along the lines of **Hold every document for the closing offer.** It says two things:
   - A point that fixes a term, whether it introduces one, changes a meaning or retires one, gets no log line when it settles. The term becomes a glossary candidate for the closing offer. A point that settles something else as well is logged for that part under step 5, and its line does not state the term.
   - A document the user asks for directly during the discussion (a record, a glossary term, an agents-file change) joins the closing offer's list and is not logged when asked.
5. `## Procedure` step 7: keep it. Where it says a promoted bullet is settled `through steps 5 and 6`, keep that. After `The choice to stop is the user's.`, add that once the user agrees to stop, the discussion moves to step 8.
6. Add `## Procedure` step 8, headed along the lines of **Offer the documents.** It runs only after the user has agreed to stop at the inference list, and it says:
   - Propose the candidates the thread would land in the project layer, in three groups:
     - records: each ADR or PDR named with a concise gist of what it records, the settled points it covers, and its kind;
     - agents-file changes: each a short gist naming the file;
     - glossary terms: a bare list of the terms, with no meanings.
   - A record candidate passes the decision test `<skill_path>/references/formats/decision-record.md` states. A term candidate passes the admission test `<skill_path>/references/formats/glossary.md` states. An agents-file candidate holds only the content `<skill_path>/references/formats/agents-file.md` admits.
   - Candidates cover additions, rewrites and removals of what the project layer holds. The list includes every document the user asked for directly.
   - Few or no candidates is a valid proposal. Propose nothing just to fill a group.
   - The user accepts, merges or rejects each candidate. For each accepted candidate, counting a merge as one, append one `document` line by following `<skill_path>/references/instructions/append-log-line.md`, in the shape `<skill_path>/references/formats/log-line.md` fixes. A rejected candidate is logged nowhere. The line carries the gist only; the document's text is drafted by the spec authoring.
   - Then state that the discussion is finished.
7. `## What you write`: change the project-layer list to `docs/adr/`, `docs/pdr/`, `docs/glossary.md` and every agents file, keeping the rest of the sentence.
8. `## Finish`, item 2: the list of points settled this session includes the `document` lines appended at the closing offer, one per line, as appended.
9. From `suite/`, run `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/capture-discussion/discussion/SKILL.md`

**Verification:**
- `(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-skill-text.mjs && node scripts/check-marketplace-skills.mjs)` exits 0, and `git status --porcelain suite/skills/capture-discussion/discussion/references` prints nothing.
- `grep -n -E 'consult-descriptions|docs/product|docs/architecture' suite/skills/capture-discussion/discussion/SKILL.md` prints nothing.
- `` grep -n -E 'formats/decision-record.md|formats/glossary.md|formats/agents-file.md|`document`' suite/skills/capture-discussion/discussion/SKILL.md `` shows the three format pointers and the `document` line.
- Every pointer resolves: `(cd suite/skills/capture-discussion/discussion && grep -o '<skill_path>/references/[A-Za-z0-9_./-]*' SKILL.md | sed 's|^<skill_path>/||; s|[.,;:]*$||' | sort -u | while read -r p; do test -f "$p" || echo "missing: $p"; done)` prints nothing.
- Code review: read steps 5–8 and `## Finish` in order. Confirm the offer comes after the agreement to stop and before Finish, that it has the three groups in the shapes above, and that no step logs a term as it settles.
- `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr cli` exits 0.

**Acceptance criteria:**
- `discussion` proposes records, agents-file changes and glossary terms only after the user agrees to stop at the inference list, with records as gist, kind and covered points, agents-file changes as gist and file, and terms as a bare list.
- `discussion` logs one `document` line for each candidate the user accepts, logs nothing for a rejected one, and then states that the discussion is finished.
- `discussion` logs no line when a term settles mid-conversation.
- `discussion`'s Inputs carry no product-behavior or architecture-description item, and every `<skill_path>/` pointer in its body resolves to a file in its own `references/`.
- The three suite gates pass, and no delta target and nothing under `cli/` has changed.

**Consumes:**
- `suite/skills/capture-discussion/discussion/references/formats/decision-record.md`, `…/formats/glossary.md` and `…/formats/agents-file.md` (task 1).
- The `document` type in `suite/skills/capture-discussion/discussion/references/formats/log-line.md` (task 2).

**Produces:** `discussion` writes `- (document) <ADR|PDR|glossary|agents-file path>: <gist>` lines, one per accepted candidate. They are the only log lines `spec` drafts project-layer delta documents from (task 5), and the entries `review-spec` checks coverage against (task 6).
