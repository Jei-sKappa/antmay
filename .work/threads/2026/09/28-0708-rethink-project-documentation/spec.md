# Keep the project layer small: decisions, glossary and agents files, gated by the user

## Goal

Make writing a project document the exception rather than the default. The project layer keeps only what earns its context cost: short decision records, a glossary of real project terms, and lean agents files. Nothing enters it unless the user accepted it at the end of a discussion, and the only drift the layer can still suffer (paths in agents files, their size) is caught mechanically at close.

## Context

`seed.md` names three failures: documents are too easy to create, too long and descriptive, and they drift from the code. The research in `research/003-synthesis.md` found the same pattern in eight projects: descriptive prose drifts first, prose admission gates do not bound volume, and only mechanical checks on pointers, copies and counts held. The discussion (`log.md`) settled the design below. In this repository, `docs/product/method.md` and `docs/architecture/suite.md` mostly restate the README, `suite/AGENTS.md` and the scripts.

## Scope and non-scope

In scope:

- the suite's shared formats, instructions and skills that define or read the project layer;
- the suite's registrations (manifest, marketplace, editor scopes);
- this repository's maintainer documents that name the retired kinds;
- this repository's own project layer, through the delta below.

Out of scope:

- `cli/`, which is on hold. Drift is recorded under `## Constraints` and the code is left alone.
- A migration or audit path for existing project layers in other projects. The method ships none (`log.md`).
- A retired-term sweep or any new suite check script. The research raised it and the discussion never took it up.
- Records already landed in this repository keep their current shape.

## Constraints

- `cli/` is not touched (root `AGENTS.md`, `## The CLI is on hold`). Removing `consult-descriptions` changes the published skill list that `cli/src/pipeline/documentation.test.ts` holds the `cli/README.md` stage table to. That is drift for the realignment pass to handle, and nothing in `cli/` is edited here.
- Hand-edited copies under a skill's `references/` are never written. Canonical sources change under `suite/shared/references/`, and `node suite/scripts/sync-shared-references.mjs` regenerates the copies.
- Shipped content stays project-free and describes the current state only, with no "Y, not X" contrast (`docs/documentation-rules.md`).
- ~~The two existing records, 2609230721-thread-reading-rule-in-every-skill-inputs and 2609230721-thread-design-document-is-the-spec, stay where they are. The second one's stated reason is affected by this change and is queued (see `## The change`, closing).~~ *(Superseded 2026-09-28: the user settled that 2609230721-thread-design-document-is-the-spec is deleted outright so the spec's naming starts fresh.)*
- 2609230721-thread-reading-rule-in-every-skill-inputs stays where it is. 2609230721-thread-design-document-is-the-spec is deleted by `delta/docs/pdr/2609230721-thread-design-document-is-the-spec.md`, because its stated reason rests on standing behavior living in the delta, which this change removes.

## The change

### What the delta lands in this repository

- Two PDRs record the decisions behind the change: `delta/docs/pdr/2609280900-project-layer-holds-no-descriptive-kinds.md` and `delta/docs/pdr/2609280900-project-layer-documents-enter-by-user-acceptance.md`. Both are written in the record shape this change introduces. *(Inference: records drafted by this thread follow the new format, because they land after the implementation that introduces it.)*
- `delta/docs/glossary.md`:
  - adds **agents file**;
  - rewrites **project layer**, **ADR**, **decision test**, **log entry type** and **thread log**;
  - drops the "replaces `consult-adrs`" clause from **consult-decisions**;
  - removes **description**, **product behavior**, **capability**, **architecture description**, **change document**, **binding test**, **consult-adrs**, **consult-glossary** and **consult-descriptions**.
- `delta/AGENTS.md`:
  - removes the layout lines and table rows for `docs/product/`, `docs/architecture/` and their two documents;
  - reduces the consult instruction to `/consult-decisions`;
  - says terms, decisions and the agents files are settled through threads;
  - adds the `.work/` dot-folder line;
  - makes the update rule route changes through a thread's delta. *(Inference: once every agents file is in the project layer, "update this file" by hand contradicts "do not edit the project layer by hand".)*
  - restructures the file under the agents-file format's three headings: the update rule, the rules and the two CLI sections, as `###` subsections, go under `## Rules`; the repository paragraph, the layout tree and the `CLAUDE.md` note go under `## Layout`; the governing-documents table becomes trigger pointers under `## Where to look`. The subsection `### Keep the CLI stage support reference current` keeps the heading text `cli/src/pipeline/documentation.test.ts` looks for.

  The file goes from 1,093 to 1,033 words, so the ratchet lets it land.
- `delta/suite/AGENTS.md` drops `consult-descriptions` from the layout, routes its update rule the same way, and restructures the file under the same three headings: the update rule and the `## Before anything else` rules under `## Rules`, the suite paragraph and the tree under `## Layout`, the authoring conventions as trigger pointers under `## Where to look` (835 → 806 words, under budget). *(Inference: same reason as the root file.)*
- `cli/AGENTS.md` is not restructured and stays outside the format, over budget at 7,052 words, because the CLI is on hold; the realignment thread brings it in.
- `delta/docs/pdr/2609230721-thread-design-document-is-the-spec.md` deletes that PDR outright rather than superseding it, so the spec's naming starts with no record behind it.
- `delta/docs/product/method.md` and `delta/docs/architecture/suite.md` delete both documents. The one fact neither the code nor another file carries, the `.work/` dot-folder rationale, moves into the root `AGENTS.md`. *(Inference: the rest restates the README, `suite/AGENTS.md` and the scripts.)*

### Suite: formats and instructions (`suite/shared/references/`)

- `formats/product-behavior.md` and `formats/architecture-description.md` are deleted.
- New `formats/agents-file.md`, in the format skeleton:
  - what an agents file is: every `AGENTS.md` or `CLAUDE.md` in the project, with a symlink counted once;
  - its three kinds of content: critical rules, how the repository is structured and where to find things, pointers that name a trigger the agent can observe;
  - the three fixed headings that hold them, `## Rules`, `## Layout` and `## Where to look`, with the rules and the pointers written as lists;
  - it changes only through delta documents landed at close;
  - the 1,000-word budget and the ratchet;
  - ~~the rule on cited paths, which is pending (see closing).~~ *(Superseded 2026-09-28: the user replaced the literal path rule with a judgment check at close, which lives in `close-thread`, so the format carries no path rule.)*

  ~~*(Inference: the format fixes the three kinds of content and no section headings, so a hand-written file can meet it unchanged.)*~~ *(Superseded 2026-09-28: the user fixed the three headings, so a file meets the format only under them.)*
- `formats/decision-record.md`:
  - frontmatter is `description` plus optional `supersedes`, and `name` is dropped. `description` is written so a reader of the catalog can judge whether the body is worth opening;
  - the body is the decision and its reason in at most three sentences, with context only where the decision is unreadable without it, counted within the three, and a revisit condition, when argued, as one of them;
  - `## Rejected alternatives` is mandatory, one line per alternative. `## Consequences` is dropped;
  - the decision test has four clauses: an argued alternative is named, the reason cannot be read off the code, the choice is hard to reverse, and a miss is costly;
  - a record is drafted only from a `document` log entry.

  The example "that boundary belongs to the architecture description" goes. *(Inference: it names a retired kind.)*
- `formats/glossary.md`:
  - a term gets a row only when the project gives the word a meaning a competent reader would not assume, or fixes one word among synonyms in use;
  - the row is one sentence of meaning plus the synonyms it fixes or rules out, never value constraints, formats or limits;
  - a retired term's row is removed and nothing says what to write instead;
  - a reserved-word row stays for a word a fresh reader would plausibly use in a sense the project rules out.
- `formats/log-line.md` adds an eighth type, `document`, with the shape `- (document) <ADR|PDR|glossary|agents-file path>: <gist>`. It is written only by a discussion's closing offer, for a candidate the user accepted. Every count of the vocabulary becomes eight.
- `formats/spec.md` changes in three places:
  - The routing table loses the product-behavior and architecture-description rows. Its ADR, PDR and glossary rows, plus a new agents-file row, read "a `document` entry naming …". "A rule or guideline for agents" routes to the agents file through a `document` entry.
  - The one rule becomes: every project-layer document the change lands is carried by a delta document and cited from the spec, never restated in the body. *(Inference: with the descriptive kinds gone, standing behavior lives in code, so the old "standing behavior sentences go to a delta" rule has no home left.)*
  - The delta index example drops `docs/product/`.
- `formats/delta-document.md`:
  - `create` targets list `docs/adr/`, `docs/pdr/`, `docs/glossary.md` and an agents file;
  - `edit` and `delete` may target an agents file;
  - the `docs/product/onboarding.md` example becomes a glossary or agents-file example.
- `formats/roadmap-index.md` asks for a planned-behavior line as "one present-tense statement of what the product does once built" and stops referring to the product-behavior form. `formats/thread.md` drops any reference to the retired kinds. *(Inference: the entry keeps its planned behavior, and only the pointer to a retired format goes.)*
- `instructions/read-and-cite-the-project-layer.md`:
  - the project-layer list becomes `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, the agents files and the roadmap indexes;
  - the read order loses the architecture and product steps;
  - "A description is cited by path and heading" goes.

### Suite: skills

- `discussion`:
  - The Inputs drop the two description lines.
  - Step 6 stops logging a fixed term as it settles.
  - Closing (step 7): after the user agrees to stop at the inference list, the agent proposes candidates in three groups:
    - ADRs and PDRs, each named with a concise gist of what it records, the settled points it covers, and its kind;
    - agents-file changes, each a short gist naming the file;
    - glossary terms, as a bare list with no meanings.

    Candidates cover additions, rewrites and removals *(Inference: the offer covers "everything that would land", and a removal lands too.)*. Few or none is a valid proposal. The user accepts, merges or rejects each one. Each accepted candidate becomes one `document` line, and the agent then states that the discussion is finished.
  - A document the user asks for directly during the discussion joins that list, and is not logged as it is asked. *(Inference: `spec` drafts from `document` entries only, so a direct request has to reach the log the same way.)*
  - Finish lists the `document` lines with the settled points.
  - `discussion` reads the decision test and the glossary admission test from the `decision-record` and `glossary` formats.
- `spec`:
  - The Inputs drop the two description lines.
  - `## Draft the delta documents` drafts one delta document, or one operation within one, for each `document` entry still in force, and from no other log line. The decision test is not re-applied, because the user already accepted the entry. *(Inference: re-applying it would let `spec` veto an accepted document.)*
  - The product-behavior and architecture bullets go, an agents-file bullet is added, and the "requested directly" paragraph goes.
  - The audit pass checks that every `document` entry in force has its delta, and that no delta document lacks one. The descriptions clause goes.
- `review-spec`:
  - holds each drafted record to the three-sentence body and the two-part shape;
  - checks that every `document` entry in force has its delta and that no delta document lacks one;
  - never checks the agents-file budget;
  - drops its description checks.
- `close-thread`:
  - lands agents-file delta documents and stops expecting description targets;
  - after its dry run, counts each agents file the landing changes with an inline `wc -w < <file>`, before and after, and refuses when a file would end over 1,000 words and longer than it was, naming the file and both counts;
  - ~~runs the path check, and refuses naming every missing path. Its scope and what counts as a path are pending (see closing).~~ *(Superseded 2026-09-28: the user replaced the literal path check with a judgment check scoped to what the thread changed.)*
  - builds the list of what the thread changed (paths removed or renamed, files and folders touched), searches every agents file for mentions of them, and reads only the matching passages;
  - judges in natural language whether the thread's work made each matching passage false, and refuses to close on each false passage, quoting it with the change that falsified it, until a `spec` edit delta fixes it;
  - never judges a passage the thread did not touch, and never proposes an addition.
- `consult-decisions`:
  - its catalog prints folder, stem and `description`, with no `name`;
  - "what the system does now" is read from the code;
  - the description paths go.
- `consult-descriptions`: the skill folder is deleted.
- `implement`, `implement-plan` and `implement-plan-with-subagents`: each write boundary lists every agents file among the project-layer files never written, and drops `docs/product/` and `docs/architecture/`.
- `plan-brief`, `plan-strict`, `check-plan`, `review-implementation`, `review-code`, `open-thread`, `open-ticket`, `resolve-pending-decisions` and `roadmap`: every mention of `consult-descriptions`, `docs/product/`, `docs/architecture/` or the product-behavior format goes. `resolve-pending-decisions` writes no `document` entry. *(Inference: the settled points give that type one writer only.)*

### Suite: registration and maintainer text

- `suite/shared/manifest.yaml` drops every product-behavior and architecture-description declaration and the `consult-descriptions` entry. It declares `formats/agents-file.md` for `discussion`, `spec`, `review-spec` and `close-thread`, plus whatever `discussion` needs for the two tests.
- `.claude-plugin/marketplace.json` drops `consult-descriptions` from `skills`, and `.vscode/settings.json` drops it from `conventionalCommits.scopes`.
- `suite/authoring/body-structure.md` and `suite/authoring/side-effects.md` drop references to the retired kinds and skill.
- `README.md` drops the `consult-descriptions` section and describes the project layer as decision records, glossary, agents files and roadmap indexes. `CONTRIBUTING.md` and `docs/documentation-rules.md` drop their references to `docs/product/method.md`, `docs/architecture/suite.md` and the descriptive kinds.
- `node suite/scripts/sync-shared-references.mjs`, `node suite/scripts/check-marketplace-skills.mjs` and `node suite/scripts/check-skill-text.mjs` are run from `suite/` last.

### ~~Pending~~

~~Two points are queued in `.pending-decisions/260928090219Z-c4e2-agents-path-check-and-spec-pdr.md`: the scope of the close-time path check and what counts as a path, and whether 2609230721-thread-design-document-is-the-spec is superseded.~~ *(Superseded 2026-09-28: both points were settled through `resolve-pending-decisions` and the bundle is gone; see the `close-thread` bullet and the PDR delete above.)*

## Acceptance

- `suite/shared/references/formats/product-behavior.md` and `suite/shared/references/formats/architecture-description.md` do not exist, and no skill folder carries a copy of either.
- `suite/skills/model-invoked/consult-descriptions/` does not exist, and neither `.claude-plugin/marketplace.json`, `.vscode/settings.json`, `suite/shared/manifest.yaml` nor `README.md` names `consult-descriptions`.
- Outside `.work/` and `cli/`, no file names `consult-descriptions`, `docs/product/`, `docs/architecture/`, `product-behavior.md` or `architecture-description.md`, except where a delta document or this repository's own history requires it.
- `suite/shared/references/formats/agents-file.md` exists in the format skeleton, and states that an agents file is every `AGENTS.md` or `CLAUDE.md` in the project with a symlink counted once, its three kinds of content under the fixed headings `## Rules`, `## Layout` and `## Where to look`, that pointers name a trigger the agent can observe, that it changes only through delta documents landed at close, and the 1,000-word ratchet.
- The decision-record format's frontmatter has `description` and an optional `supersedes`, and no `name`.
- The decision-record format limits the body to the decision and its reason in at most three sentences, requires `## Rejected alternatives` with one line per alternative, and has no `## Consequences` section.
- The decision test in the decision-record format has four clauses: a named argued alternative, a reason not readable off the code, hard to reverse, and a costly miss.
- The glossary format admits a row only for a meaning a competent reader would not assume or for fixing one word among synonyms in use, limits the row to one sentence of meaning plus the synonyms it fixes or rules out, and excludes value constraints, formats and limits.
- The glossary format states that a retired term's row is removed with nothing in its place, and that a reserved-word row is kept for a word a fresh reader would plausibly use in a sense the project rules out.
- The log-line format lists eight types including `document`, gives its shape as `- (document) <ADR|PDR|glossary|agents-file path>: <gist>`, and says only a discussion's closing offer writes it.
- The spec format's routing table has no product-behavior or architecture-description row, routes ADRs, PDRs, glossary terms and agents-file changes from `document` entries, and routes a rule or guideline for agents to the agents file.
- `discussion` proposes records, agents-file changes and glossary terms only after the user agrees to stop at the inference list, with records as gist, kind and covered points, agents-file changes as gist and file, and terms as a bare list.
- `discussion` logs one `document` line for each candidate the user accepts, logs nothing for a rejected one, and then states that the discussion is finished.
- `discussion` logs no line when a term settles mid-conversation.
- `spec` drafts a project-layer delta document only from `document` entries still in force, and its audit reports a `document` entry with no delta and a delta document with no `document` entry.
- `review-spec` reports a drafted record whose body exceeds three sentences, or that lacks `## Rejected alternatives`, and does not check any agents-file word count.
- `close-thread` refuses to land when an agents file the landing changes would end over 1,000 words and longer than before, names the file with both counts, and measures with an inline `wc -w`.
- ~~`close-thread` refuses to close while a path the path check covers does not resolve, and names every missing path. *(Pending: which files and spans are covered.)*~~ *(Superseded 2026-09-28: the literal path check was replaced by a judgment check.)*
- `close-thread` searches every agents file for mentions of the paths, files and folders the thread removed, renamed or touched, and reads only the matching passages.
- `close-thread` refuses to close on each matching passage the thread's work made false, quoting it with the change that falsified it.
- `close-thread` makes no finding about a passage that mentions nothing the thread changed, and proposes no addition to any agents file.
- `docs/pdr/2609230721-thread-design-document-is-the-spec.md` does not exist after close, and no `superseded/` copy of it exists.
- `consult-decisions` prints each record's folder, stem and `description` without opening any body.
- The write boundary of each implement skill lists every agents file among the files it never writes.
- The roadmap-index format describes a planned-behavior line without referring to a product-behavior format.
- `node suite/scripts/check-marketplace-skills.mjs` and `node suite/scripts/check-skill-text.mjs` pass from `suite/`, and rerunning `node suite/scripts/sync-shared-references.mjs` changes no file.
- Nothing under `cli/` is modified.

## Degrees of freedom

- How `discussion` gets the decision test and the glossary admission test: manifest-declared copies of the two formats, or an instruction holding both.
- The wording and the order of sections in the new agents-file format and in every rewritten skill passage, within the format skeleton and the authoring conventions.
- ~~Whether the close-time path check is written inline in `close-thread` or as a script under the skill's `references/`.~~ *(Superseded 2026-09-28: the check is now an agent judgment over matched passages, not a script.)*
- How `close-thread` derives what the thread changed (the implementation reports, the commits since the thread began, or the working tree), as long as removed, renamed and touched paths are all covered.
- Where the closing offer sits within `discussion`'s procedure (an extended step 7 or a new step), as long as it follows the user's agreement to stop and comes before Finish.

## Inferences

- This thread's two PDRs use the new record shape, because they land after the implementation that introduces it (`## The change`, first bullet).
- The root and suite agents files route their update rules through a thread's delta, because agents files are now project layer, which is not edited by hand (`delta/AGENTS.md`, `delta/suite/AGENTS.md`).
- Only the `.work/` rationale moves out of the two deleted documents, because the rest restates the README, `suite/AGENTS.md` and the scripts (the delete bullet).
- ~~The agents-file format fixes three kinds of content and no headings, so a hand-written file fits (the `formats/agents-file.md` bullet).~~ *(Superseded 2026-09-28: the user fixed the three headings.)*
- The decision-record format drops its example that names the architecture description (the `formats/decision-record.md` bullet).
- The spec format's one rule is narrowed to "project-layer documents live in the delta and are cited", because standing behavior now lives in code (the `formats/spec.md` bullet).
- A roadmap entry keeps its planned behavior, and only the pointer to the product-behavior form goes (the `formats/roadmap-index.md` bullet).
- The closing offer covers removals and rewrites as well as additions (the `discussion` bullet).
- A document asked for directly during a discussion joins the closing list instead of being logged at once (the `discussion` bullet).
- `spec` does not re-apply the decision test to an accepted `document` entry (the `spec` bullet).
- `resolve-pending-decisions` writes no `document` entry (the skills bullet).
- The ratchet and the word count apply to the agents files the landing changes, because an untouched file cannot grow (the `close-thread` bullet).
- A symlinked `CLAUDE.md` and its `AGENTS.md` count as one file (the `formats/agents-file.md` bullet).

## Delta index

- `delta/docs/pdr/2609280900-project-layer-holds-no-descriptive-kinds.md` — create
- `delta/docs/pdr/2609280900-project-layer-documents-enter-by-user-acceptance.md` — create
- `delta/docs/glossary.md` — edit
- `delta/AGENTS.md` — edit
- `delta/suite/AGENTS.md` — edit
- `delta/docs/pdr/2609230721-thread-design-document-is-the-spec.md` — delete
- `delta/docs/product/method.md` — delete
- `delta/docs/architecture/suite.md` — delete
