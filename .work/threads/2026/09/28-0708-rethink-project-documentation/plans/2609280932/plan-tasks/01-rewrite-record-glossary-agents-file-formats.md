### Task 1: Rewrite the record and glossary formats, add the agents-file format

**Objective:** Give the project layer's three document kinds their shapes: short two-part decision records, a gated glossary, and a new agents-file format. Make `consult-decisions` read the record frontmatter that results.

**Input / context:**
- `spec.md`, `## The change` → `### Suite: formats and instructions (suite/shared/references/)`, the bullets for `formats/agents-file.md`, `formats/decision-record.md` and `formats/glossary.md`; `### Suite: skills`, the `consult-decisions` bullet; `### Suite: registration and maintainer text`, the `suite/shared/manifest.yaml` bullet.
- The reasons are settled in `delta/docs/pdr/2609280900-project-layer-holds-no-descriptive-kinds.md` (agents files join the project layer and hold three kinds of content) and `delta/docs/pdr/2609280900-project-layer-documents-enter-by-user-acceptance.md` (a document enters only as a `document` entry the user accepted).
- The format skeleton in `suite/authoring/shared-references.md`: a `# <Artifact> format` title, one paragraph, `## Shape` holding a fenced skeleton, and `## Rules` with one rule per bullet. A format holds no command and no procedure.
- The spec leaves two choices to the implementer. This task settles the first: `discussion` gets the decision test and the glossary admission test from manifest-declared copies of the two formats. The second, the wording and section order of the new format, stays yours.
- This is the first task. It starts from the repository as committed.

**Steps:**
1. Create `suite/shared/references/formats/agents-file.md` in the format skeleton:
   - Title: `# Agents-file format`.
   - One paragraph stating four things. An agents file is every `AGENTS.md` or `CLAUDE.md` in the project. A `CLAUDE.md` that is a symlink to an `AGENTS.md` is one agents file with it, counted once. The agent loads the file at the start of every session. It belongs to the project layer.
   - `## Shape`: a fenced `markdown` skeleton that shows the three kinds of content as placeholders and fixes no section heading. For example: a critical rule the agent must follow and would not infer from the code; how the repository or module is structured and where to find things; `When <a trigger the agent can observe>, read <path>.`
   - `## Rules`, one bullet each:
     - The file holds only three kinds of content: critical rules; how the repository is structured and where to find things; and pointers.
     - Every pointer names a trigger the agent can observe, and the document to read when it fires.
     - No heading is fixed, so a file written by hand fits the format unchanged.
     - The file changes only through the delta documents a thread drafts and `close-thread` lands, whether `edit`, `create` or `delete`.
     - The budget is 1,000 words per agents file, counted as `wc -w` counts them. A landing that would leave an agents file over 1,000 words and longer than it was is refused, so a file over budget can only shrink or keep its length.
   - Write no rule about cited paths.
2. Rewrite `suite/shared/references/formats/decision-record.md`:
   - Opening paragraph: delete the clause `, and that boundary belongs to the architecture description`, so the sentence ends after `…even where a database boundary enforces it`. Keep the rest of the paragraph.
   - `## Shape`: the frontmatter carries `description:` and the `supersedes:` list, and no `name:` line. The body placeholder becomes `<the decision and its reason, in at most three sentences>`. Keep `## Rejected alternatives` with its `- <an alternative that was argued> — <the reason it lost>` line. Delete the `## Consequences` heading and its placeholder.
   - `## Rules`:
     - Replace the `name`/`description` rule. `description` is always present and is the record's one summary, written in enough detail that a reader of the catalog can judge whether the body is worth opening.
     - Add: a record has exactly two parts, its body and `## Rejected alternatives`.
     - Add: the body states the decision and its reason in at most three sentences. Context appears only where the decision is unreadable without it, and it counts within the three. A revisit condition, when the discussion argued one, is one of the three.
     - Keep the `## Rejected alternatives` rule: mandatory, one line per alternative with the reason it lost.
     - Delete the `## Consequences` rule.
     - Replace the decision-test rule with four clauses. A settled point is offered as a record only when all four clauses of the **decision test** hold: a real alternative was argued against and is named with the reason it lost; the reason for the choice cannot be read off the code; the choice is hard to reverse; and missing it is costly, because a later thread could build against it incorrectly. Keep the mixed-point sentence.
     - Add: a record is drafted only from a `document` log entry.
     - Delete the rule `The record is concise and limited to what a new reader needs…`; the three-sentence limit replaces it.
     - Keep the remaining rules unchanged: `supersedes`, present tense with no implementation state, no status key, the stem, supersede on landing, and editing a landed record.
3. Rewrite `suite/shared/references/formats/glossary.md`:
   - `## Shape`: the row placeholder becomes one sentence fixing what the term means, followed by the synonyms it fixes or rules out.
   - `## Rules`:
     - Keep: one row per term and one meaning per term; the optional `##` sections; changes only through delta documents.
     - Add the admission rule. A term gets a row only when the project gives the word a meaning a competent reader would not assume, or fixes one word among synonyms in use. An ordinary word in its ordinary sense never gets a row, however central it is.
     - Add the content rule. The row holds one sentence of meaning plus the synonyms it fixes or rules out, and never value constraints, formats or limits.
     - Replace the `A term leaves the vocabulary…` rule: a retired term's row is removed, and nothing is written in its place.
     - Replace the reserved-word rule. A row that reserves a word, rather than defining it, is kept for a word a fresh reader would plausibly use in a sense the project rules out. It states which sense is reserved and what to write for the sense it rules out.
4. Edit `suite/skills/model-invoked/consult-decisions/SKILL.md`:
   - In `## Print the catalog`, change `Print the folder, stem, name, and description` to `Print the folder, stem, and description`.
   - Replace the fenced catalog command with exactly this block:

```sh
find docs/adr docs/pdr -maxdepth 1 -name '*.md' 2>/dev/null | sort | while read -r f; do awk -v dir="$(dirname "$f")" -v stem="$(basename "$f" .md)" '/^---$/{n++; next} n==1 && /^description: /{sub(/^description: /,""); desc=$0} n==2{print dir "\t" stem "\t" desc; exit}' "$f"; done
```

   - In `## How a record is cited and binds`, change the second sentence to: `What the system does now is never cited from a record: that is read from the code.`
5. Edit `suite/shared/manifest.yaml`, appending each new list item to the end of the skill's list:
   - `skills/capture-discussion/discussion`: add `formats/decision-record.md`, `formats/glossary.md` and `formats/agents-file.md`.
   - `skills/spec/spec`: add `formats/agents-file.md`. Leave its `product-behavior.md` and `architecture-description.md` items; task 5 removes them.
   - `skills/review/review-spec`: add `formats/agents-file.md`.
   - `skills/close/close-thread`: add `formats/agents-file.md`.
6. From `suite/`, run `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/shared/references/formats/agents-file.md` (NEW)
- `suite/shared/references/formats/decision-record.md`
- `suite/shared/references/formats/glossary.md`
- `suite/shared/manifest.yaml`
- `suite/skills/model-invoked/consult-decisions/SKILL.md`
- Generated by the sync script:
  - `suite/skills/capture-discussion/discussion/references/formats/agents-file.md` (NEW)
  - `suite/skills/capture-discussion/discussion/references/formats/decision-record.md` (NEW)
  - `suite/skills/capture-discussion/discussion/references/formats/glossary.md` (NEW)
  - `suite/skills/spec/spec/references/formats/agents-file.md` (NEW)
  - `suite/skills/spec/spec/references/formats/decision-record.md`
  - `suite/skills/spec/spec/references/formats/glossary.md`
  - `suite/skills/review/review-spec/references/formats/agents-file.md` (NEW)
  - `suite/skills/review/review-spec/references/formats/decision-record.md`
  - `suite/skills/close/close-thread/references/formats/agents-file.md` (NEW)
  - `suite/skills/close/close-thread/references/formats/decision-record.md`
  - `suite/skills/model-invoked/consult-decisions/references/formats/decision-record.md`

**Verification:**
- `(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-skill-text.mjs && node scripts/check-marketplace-skills.mjs)` exits 0.
- `head -n 1 suite/shared/references/formats/agents-file.md` prints `# Agents-file format`. `grep -c -E '^## (Shape|Rules)$' suite/shared/references/formats/agents-file.md` prints `2`. `grep -n -E '1,000|symlink|trigger|wc -w' suite/shared/references/formats/agents-file.md` shows all four terms.
- `grep -n -E '^name:|Consequences|architecture description' suite/shared/references/formats/decision-record.md` prints nothing. `` grep -n -E 'three sentences|## Rejected alternatives|hard to reverse|costly|`document`' suite/shared/references/formats/decision-record.md `` shows each term.
- `grep -n -E 'competent reader|value constraints|retired|fresh reader' suite/shared/references/formats/glossary.md` shows each term.
- Run from the repository root, the catalog command from step 4 prints one line per record in `docs/adr/` and `docs/pdr/`. Piping it into `awk -F'\t' '{print NF}'` prints `3` on every line.
- `grep -c 'agents-file.md' suite/shared/manifest.yaml` prints `4`. `cmp suite/shared/references/formats/agents-file.md suite/skills/close/close-thread/references/formats/agents-file.md` exits 0.
- `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr cli` exits 0.

**Acceptance criteria:**
- `suite/shared/references/formats/agents-file.md` exists in the format skeleton, and states that an agents file is every `AGENTS.md` or `CLAUDE.md` in the project with a symlink counted once, its three kinds of content, that pointers name a trigger the agent can observe, that it changes only through delta documents landed at close, and the 1,000-word ratchet.
- The decision-record format's frontmatter has `description` and an optional `supersedes`, and no `name`.
- The decision-record format limits the body to the decision and its reason in at most three sentences, requires `## Rejected alternatives` with one line per alternative, and has no `## Consequences` section.
- The decision test in the decision-record format has four clauses: a named argued alternative, a reason not readable off the code, hard to reverse, and a costly miss.
- The glossary format admits a row only for a meaning a competent reader would not assume or for fixing one word among synonyms in use, limits the row to one sentence of meaning plus the synonyms it fixes or rules out, and excludes value constraints, formats and limits.
- The glossary format states that a retired term's row is removed with nothing in its place, and that a reserved-word row is kept for a word a fresh reader would plausibly use in a sense the project rules out.
- `consult-decisions` prints each record's folder, stem and `description` without opening any body.
- The manifest declares `formats/agents-file.md` for `discussion`, `spec`, `review-spec` and `close-thread`, and declares `formats/decision-record.md` and `formats/glossary.md` for `discussion`. Each generated copy is byte-identical to its canonical source.
- The three suite gates pass, and no delta target and nothing under `cli/` has changed.

**Consumes:** none

**Produces:**
- `suite/shared/references/formats/agents-file.md` (Markdown format). Skill bodies point at it as `<skill_path>/references/formats/agents-file.md` from `discussion`, `spec`, `review-spec` and `close-thread`.
- The four-clause decision test in `formats/decision-record.md` and the admission test in `formats/glossary.md`, both present as copies under `suite/skills/capture-discussion/discussion/references/formats/`.
- The record frontmatter shape `description` plus optional `supersedes`.
