### Task 3: Route and cite the project layer through `document` entries

**Objective:** Rewrite the shared references that say what the project layer holds, how a spec routes into it, and how its documents are read and cited. With them rewritten, the project layer is decision records, the glossary, the agents files and the roadmap indexes, and every project-layer delta answers a `document` entry.

**Input / context:**
- `spec.md`, `## The change` → `### Suite: formats and instructions`, these bullets: `formats/spec.md`, `formats/delta-document.md`, `formats/roadmap-index.md` together with `formats/thread.md`, and `instructions/read-and-cite-the-project-layer.md`.
- The reason is settled in `delta/docs/pdr/2609280900-project-layer-holds-no-descriptive-kinds.md`.
- Starts from the repository as task 2 left it: `suite/shared/references/formats/log-line.md` defines the `document` type the routing table names.

**Steps:**
1. Edit `suite/shared/references/formats/spec.md`:
   - Opening paragraph, last sentence: change to `Every project-layer document the change lands lives in the thread's delta documents and is cited from here.`
   - `## Shape`, delta index example: replace ``- `delta/docs/product/<capability>.md` — edit`` with ``- `delta/docs/glossary.md` — edit``.
   - `## Rules`, first bullet: change to `The one rule: every project-layer document the change lands is carried by a delta document and cited from the spec, never restated in the body.`
   - `### Routing`: replace the whole table with this one (you may reword a cell, but the rows and where they route must stay):

```markdown
| A settled point that… | goes to | drafted by | lands |
| --- | --- | --- | --- |
| is a `document` entry naming an ADR | ADR (`create` delta) | the spec authoring | close |
| is a `document` entry naming a PDR | PDR (`create` delta) | the spec authoring | close |
| is a `document` entry naming the glossary | glossary (`edit`/`create` delta) | the spec authoring | close |
| is a `document` entry naming an agents file | that agents file (`edit`/`create`/`delete` delta) | the spec authoring | close |
| is a rule or guideline for agents | an agents file, through a `document` entry naming it | the spec authoring | close |
| describes behavior settled but not yet built | the roadmap entry that will build it | the `roadmap` skill or its owner | in place |
| is thread-only design, a criterion, a constraint of this change | the spec body | the spec authoring | never |
```

2. Edit `suite/shared/references/formats/delta-document.md`:
   - Opening paragraph: change the mirroring example to `so a document at delta/suite/AGENTS.md targets suite/AGENTS.md`, keeping the backticks around both paths.
   - `## Shape`, the `edit` example: replace the three product-behavior sample operations (`Saving a card…`, `Reset codes expire…`, `Explore shows a second feed.`) with agents-file sample text of the same structure. Keep one `## add` with an `under:` anchor, one `## replace` with two blocks, and one `## remove`. For example, layout lines and a check command. No sample may read as a statement of product behavior.
   - `## Rules`: rewrite the `create` rule so its second half reads `for docs/glossary.md or an agents file its body is the whole file in that kind's format`, with the paths in backticks. Add a rule: an `edit` or a `delete` targets a project-layer file that exists, an agents file included.
3. Edit `suite/shared/references/formats/thread.md`: in the `## Shape` tree, rewrite the `delta/` child line and its continuation. They now read as `└── …` mirroring the target path, e.g. `delta/docs/adr/<stem>.md`, `delta/docs/pdr/<stem>.md`, `delta/docs/glossary.md`, `delta/AGENTS.md`. Keep the tree's column alignment. Nothing else in the file names a retired kind; leave it.
4. Edit `suite/shared/references/formats/roadmap-index.md`:
   - The `Planned behavior:` rule: replace `one present-tense statement per line, each written in the form a product behavior statement takes once the behavior is built` with `one present-tense statement per line, each stating what the product does once built`.
   - The last rule: change `the outcome lives in the code, the descriptions, the decision records and the threads` to `the outcome lives in the code, the decision records and the threads`.
5. Edit `suite/shared/references/instructions/read-and-cite-the-project-layer.md`:
   - Opening paragraph: the project-layer list becomes `docs/adr/` and `docs/pdr/` for its decision records, `docs/glossary.md` for its terms, the agents files (every `AGENTS.md` or `CLAUDE.md`) for its standing guidance to agents, and the roadmap indexes under `.work/roadmaps/`. The lead-in `what the method owns at fixed paths in every project` no longer fits a list holding files found anywhere in the project; reword it so it does not claim every path is fixed.
   - `## Read in this order`: delete items 3 (architecture description) and 4 (product behavior), and renumber the rest 1–5.
   - `## Cite by kind`: delete the bullet `A description is cited by path and heading.`
6. From `suite/`, run `node scripts/sync-shared-references.mjs`, then `node scripts/check-skill-text.mjs`, then `node scripts/check-marketplace-skills.mjs`.

**Files modified:**
- `suite/shared/references/formats/spec.md`
- `suite/shared/references/formats/delta-document.md`
- `suite/shared/references/formats/thread.md`
- `suite/shared/references/formats/roadmap-index.md`
- `suite/shared/references/instructions/read-and-cite-the-project-layer.md`
- Generated by the sync script, copies of `formats/spec.md`:
  - `suite/skills/spec/spec/references/formats/spec.md`
  - `suite/skills/plan/plan-brief/references/formats/spec.md`
  - `suite/skills/plan/plan-strict/references/formats/spec.md`
  - `suite/skills/plan/check-plan/references/formats/spec.md`
  - `suite/skills/review/review-spec/references/formats/spec.md`
  - `suite/skills/review/review-implementation/references/formats/spec.md`
  - `suite/skills/review/review-code/references/formats/spec.md`
- Generated by the sync script, copies of `formats/delta-document.md`:
  - `suite/skills/close/close-thread/references/formats/delta-document.md`
  - `suite/skills/spec/spec/references/formats/delta-document.md`
  - `suite/skills/review/review-spec/references/formats/delta-document.md`
- Generated by the sync script, copies of `formats/thread.md`:
  - `suite/skills/close/close-thread/references/formats/thread.md`
  - `suite/skills/capture-discussion/open-thread/references/formats/thread.md`
- Generated by the sync script, copies of `formats/roadmap-index.md`:
  - `suite/skills/close/close-thread/references/formats/roadmap-index.md`
  - `suite/skills/capture-discussion/open-thread/references/formats/roadmap-index.md`
  - `suite/skills/capture-discussion/discussion/references/formats/roadmap-index.md`
  - `suite/skills/roadmap/roadmap/references/formats/roadmap-index.md`
- Generated by the sync script, copies of `instructions/read-and-cite-the-project-layer.md`:
  - `suite/skills/close/close-thread/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/spec/spec/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/plan/plan-brief/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/plan/plan-strict/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/plan/check-plan/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/implement/implement/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/implement/implement-plan/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/implement/implement-plan-with-subagents/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/review/review-spec/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/review/review-implementation/references/instructions/read-and-cite-the-project-layer.md`
  - `suite/skills/roadmap/roadmap/references/instructions/read-and-cite-the-project-layer.md`

**Verification:**
- `(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-skill-text.mjs && node scripts/check-marketplace-skills.mjs)` exits 0.
- `grep -rn -E 'docs/product|docs/architecture|product behavior|architecture description|product-behavior|architecture-description|descriptions' suite/shared/references --exclude=product-behavior.md --exclude=architecture-description.md` prints nothing.
- `` grep -c '`document` entry' suite/shared/references/formats/spec.md `` prints at least `5`. `grep -n 'rule or guideline for agents' suite/shared/references/formats/spec.md` shows the agents-file route.
- `awk '/^## Read in this order/{f=1;next} /^## /{f=0} f && /^[0-9]+\. /{n++} END{print n}' suite/shared/references/instructions/read-and-cite-the-project-layer.md` prints `5`.
- `grep -n 'agents file' suite/shared/references/formats/delta-document.md` shows both the `create` rule and the `edit`/`delete` rule.
- `cmp suite/shared/references/formats/spec.md suite/skills/review/review-code/references/formats/spec.md` exits 0.
- `B=$(git log --diff-filter=A --format=%H -- .work/threads/2026/09/28-0708-rethink-project-documentation/seed.md | tail -n 1); git diff --quiet "$B" -- AGENTS.md CLAUDE.md suite/AGENTS.md suite/CLAUDE.md docs/glossary.md docs/product docs/architecture docs/adr docs/pdr cli` exits 0.

**Acceptance criteria:**
- The spec format's routing table has no product-behavior or architecture-description row, routes ADRs, PDRs, glossary terms and agents-file changes from `document` entries, and routes a rule or guideline for agents to the agents file.
- The roadmap-index format describes a planned-behavior line without referring to a product-behavior format.
- The spec format's one rule reads that every project-layer document the change lands is carried by a delta document and cited, never restated in the body, and its delta index example names no `docs/product/` path.
- The delta-document format lets a `create` target an agents file and an `edit` or `delete` target one, and its examples name no `docs/product/` path.
- The read-and-cite instruction lists `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, the agents files and the roadmap indexes as the project layer, has a five-step read order, and has no rule for citing a description.
- Apart from the two formats task 10 deletes, no file under `suite/shared/references/` names a retired kind.
- The three suite gates pass, and no delta target and nothing under `cli/` has changed.

**Consumes:** The `document` log entry type defined in `suite/shared/references/formats/log-line.md` (task 2).

**Produces:**
- The routing table in `suite/shared/references/formats/spec.md`, which `spec` (task 5) sorts `document` entries by.
- The project-layer list and five-step read order in `instructions/read-and-cite-the-project-layer.md`.
- The agents-file `create`/`edit`/`delete` target rules in `formats/delta-document.md`, which `close-thread` (task 7) lands against.
