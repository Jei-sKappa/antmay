### Task 6: Check record shape and document coverage in `review-spec`

**Objective:** Make `review-spec` hold every drafted record to the short two-part shape and every delta document to a `document` entry. It stops checking descriptions and never checks an agents file's word count.

**Input / context:**
- `spec.md`, `## The change` → `### Suite: skills`, the `review-spec` bullet.
- This task drops the check that a drafted record passes the decision test. The reason is settled in `delta/docs/pdr/2609280900-project-layer-documents-enter-by-user-acceptance.md`: a document enters because the user accepted it, and an agent re-applying the test afterwards is the rejected alternative. The folder check and the argued-alternative check stay, because they judge the draft's fidelity rather than whether it should exist.
- Starts from the repository as task 5 left it. Task 1 gave `review-spec` a copy of `formats/agents-file.md` and rewrote its `formats/decision-record.md` copy. Task 3 rewrote its `formats/spec.md` copy with the new one rule.
- The file to edit is `suite/skills/review/review-spec/SKILL.md`. Read it whole before editing.

**Steps:**
1. `## Inputs`:
   - Delete the `docs/architecture/<module>.md …` and `docs/product/<capability>.md …` items.
   - In the `delta/` item, after the decision-record clause, add that each delta document targeting an agents file is also read against the shape `<skill_path>/references/formats/agents-file.md` defines.
   - The `log.md` item becomes: the points the thread settled, the alternatives it rejected, and its `document` entries, which the record and coverage checks read the delta against.
2. `### Spec checks`: change `Run these five checks as well.` to `Run these six checks as well.` Make the list:
   1. **No restated document in the body.** No passage of the spec's body restates a project-layer document the change lands: a record's text, a glossary row, an agents-file passage. That text belongs in its delta document and is cited from the body. Finding it in the body is the failure, whether or not a delta document also carries it.
   2. **Citations resolve.** Keep the current check, but delete the sentence `A description cited by path and heading resolves to that heading in a file under delta/ or under docs/.`
   3. **Every delta document is well-formed.** Unchanged.
   4. **Every drafted record is short and two-part.** Each `create` under `delta/docs/adr/` or `delta/docs/pdr/` has frontmatter carrying `description`, plus `supersedes` when it replaces a record, and nothing else. It has a body of at most three sentences, `## Rejected alternatives` with one line per alternative, and no other section. A body over three sentences is a finding, and so is a missing `## Rejected alternatives`. Keep the two current findings: a rejected alternative no line of the log argued, and a record filed in the wrong folder, with the PDR/ADR folder rule as written.
   5. **Every `document` entry has its delta, and only those.** Each `document` entry in force in `log.md` has its delta document, or its operation within one, and every delta document answers a `document` entry in force. An entry without a delta document is a finding, and so is a delta document without an entry.
   6. **Criteria carry no identifiers.** The current check 5, unchanged.
3. Directly after the six checks, add one sentence: an agents file's word count is not this review's to check.
4. The `obvious contradiction` paragraph: change `a project decision record, a project description or a project glossary term` to `a project decision record or a project glossary term`.
5. `## Recording findings`, the never-written list: delete `docs/product/` and `docs/architecture/`.
6. From `suite/`, run `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/skills/review/review-spec/SKILL.md`

**Verification:**
- `(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-skill-text.mjs && node scripts/check-marketplace-skills.mjs)` exits 0, and `git status --porcelain suite/skills/review/review-spec/references` prints nothing.
- `grep -n -E 'consult-descriptions|docs/product|docs/architecture|descriptions|project description|decision test|standing behavior' suite/skills/review/review-spec/SKILL.md` prints nothing.
- `` grep -n -E 'three sentences|## Rejected alternatives|`document` entr|word count|formats/agents-file.md' suite/skills/review/review-spec/SKILL.md `` shows each term.
- `awk '/^### Spec checks/{f=1;next} /^## /{f=0} f && /^[0-9]+\. \*\*/{n++} END{print n}' suite/skills/review/review-spec/SKILL.md` prints `6`.
- Every pointer resolves: `(cd suite/skills/review/review-spec && grep -o '<skill_path>/references/[A-Za-z0-9_./-]*' SKILL.md | sed 's|^<skill_path>/||; s|[.,;:]*$||' | sort -u | while read -r p; do test -f "$p" || echo "missing: $p"; done)` prints nothing.
- `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr cli` exits 0.

**Acceptance criteria:**
- `review-spec` reports a drafted record whose body exceeds three sentences, or that lacks `## Rejected alternatives`, and does not check any agents-file word count.
- `review-spec` reports a `document` entry in force that has no delta document, and a delta document that answers no `document` entry.
- `review-spec` reads no description input and carries no check or citation rule for a description.
- The three suite gates pass, and no delta target and nothing under `cli/` has changed.

**Consumes:**
- `suite/skills/review/review-spec/references/formats/agents-file.md` and the rewritten `…/formats/decision-record.md` (task 1).
- The `document` entry shape in `suite/shared/references/formats/log-line.md` (task 2), which `discussion` writes (task 4).

**Produces:** none
