# Rework the Antmay artifact model around distinct durable homes

This spec is authored under the method as it stands today, so it is a `spec.md` with numbered criteria. The method it describes replaces both: the thread's design document becomes the **change document** and criteria lose their numbers. Every term in bold below is fixed in this thread's `glossary.md`, which takes precedence over `docs/glossary.md` inside this thread.

## Intended goal

After this work, the Antmay method gives each durable kind of information exactly one home with one lifecycle, one drafter, one landing and one citation form, so that:

- a decision, a description of what exists, a planned behavior, a rule for agents and a term never share a container;
- nothing thread-local can be mistaken for a standing requirement, by name, by shape or by identifier;
- an agent knows from a path how to read a file and whether it may cite it;
- the reference project (this repository) runs the reworked method on itself.

## Context

Two independent audits and an engineering-terms overview, produced on the Leitspace project and copied unchanged into `reports/`, were synthesised in `researches/audit-synthesis.md`. The method had produced 96 decision records that a hand pass cut to 46 at roadmap entry 2; 29 of the 46 carried implementation status, 34 listed schema objects, 19 named no rejected alternative, and all 46 were edited in one day to track reality. 515 lines of `FR-`/`AC-`/task-number citations had to be scrubbed from code and tests by hand. Both audits located the cause in the method, not in the authors: the project layer had three containers (ADR, glossary, roadmap index), the binding test selected for "durable and non-obvious" rather than "decision", the spec was the single design truth and historical at close, traceability was demanded with no named home, and "living documentation" was a term with no path, no format and no writer.

The discussion recorded in `log.md` settled the rework. This spec is its projection. Project-level records for these decisions are deferred until the reworked method has been exercised on Leitspace; this thread drafts none, by the user's instruction.

## Scope and non-scope

**In scope**

- The artifact model: kinds, paths, lifecycles, admission rules, drafters, landing, citation and read order.
- The thread layout and the shape of every method-owned artifact this model touches: the change document, delta documents, decision records, product behavior, architecture description, the roadmap entry, the implementation report, the closing event.
- The role, inputs and write boundary of every affected skill in `suite/`, and the retirement or renaming of skills the model makes obsolete.
- The maintainer and user documents of this repository that state the citation rule or describe the method (`docs/documentation-rules.md`, `docs/working-with-threads.md`, `README.md`, `docs/glossary.md` through this thread's delta).
- This repository's own adoption of the model.

**Out of scope**

- The wording of skill bodies beyond what the roles, inputs and boundaries below require; the implementer writes the bodies to `suite/authoring/` conventions.
- Anything under `cli/`. The CLI is on hold; every drift this work causes there is recorded in the implementation report and the code is left alone.
- What a project's `AGENTS.md` holds, where guidelines live, how normative strength is marked, and any handbook kind. Deferred to a thread of their own. `suite/authoring/` and the `AGENTS.md` paragraph of `docs/documentation-rules.md` are untouched for the same reason.
- Migrating Leitspace or any project's existing records.
- A staleness preflight before implementing, a decision tree inside the discussion skill, and per-project path mapping. Deferred branches, named at the end.
- Landing this thread's own decisions as ADRs or PDRs.

## The project layer

The **project layer** is what the method owns at fixed paths in every project, created lazily and never a prerequisite. Its only writer is `close-thread`, except the roadmap index, whose owner also edits it in place through the `roadmap` skill.

| Kind | Path | Holds | Lifecycle | Cited as |
| --- | --- | --- | --- | --- |
| **ADR** | `docs/adr/<yymmddhhmm>-<slug>.md`, `docs/adr/superseded/` | one decision about how the system is structured or built | current in the folder, superseded in `superseded/`; no state in the file | stem, for the reason behind a choice, never for what the system does |
| **PDR** (product decision record) | `docs/pdr/<yymmddhhmm>-<slug>.md`, `docs/pdr/superseded/` | one decision about what the product does or for whom | same as ADR | stem, same rule |
| **product behavior** | `docs/product/<capability>.md` | present-tense statements of what the product does now, one per behavior, FR and NFR alike, only where the code does not make it obvious | living; changed only by delta documents landed at close | path and heading |
| **architecture description** | `docs/architecture/<module>.md` | how the system is structured now, only where no single file makes it obvious | living; same as product behavior | path and heading |
| glossary | `docs/glossary.md` | one meaning per term | living; changed only by delta documents landed at close | by term |
| roadmap index | `.work/roadmaps/<yymmddhhmm>-<slug>.md` | a direction, its entries, and the planned behavior each entry will build | living while open; deleted when the destination is reached or abandoned | index path and entry slug, from thread artifacts only |

**Description** is the collective name for product behavior and architecture description. **Living documentation** names only what the project owns outside the project layer (READMEs, runbooks, the project's own conventions); the implementer may edit it within implementation scope.

### Admission rules for descriptions

- A statement enters a description only when it is built and only when reading the code would not make it obvious. A description never describes behavior or structure that does not exist.
- One statement per line, present tense, concise. A product behavior statement may carry a one-clause reason when no decision record holds it *(Inference: rationale beside a statement)*.
- Behavior that is settled but not built has exactly one home: the roadmap entry that will build it. Behavior with no entry to own it is not planned; it either becomes an entry or stays in the settling thread's log as history.
- When a description and the code disagree, the agent identifies which of three it is, a bug, a stale description, or an authorised change, and never assumes the code or the prose is right *(Inference: conflict rule)*.
- Document shape: a title naming the capability or module, `##` headings per area, one statement per bullet line beneath *(Inference: description shape; the exact heading scheme is the implementer's within this)*.

### Decision records

An ADR and a PDR share one format, one test and one landing; only the folder differs. A record is filed by the question it answers: "how is the system structured or built" is an ADR, "what does the product do, or for whom" is a PDR. Enforcement never decides the folder: "learning data is private" is a PDR even when a database boundary enforces it, and the boundary is described in the architecture description. A mixed point is split; the structural half becomes an ADR only if it passes the test on its own.

The **decision test**. A settled point becomes a record only when all three hold:

1. a real alternative was argued against and is named, with the reason it lost;
2. the reason for the choice cannot be read off the code, the product behavior or the architecture description;
3. a later thread could build against it incorrectly if not told.

Format changes to `suite/shared/references/formats/adr.md`, applied identically to a new PDR format or to one shared format covering both *(Inference: one shared "decision record" format with the folder as a parameter is the sensible shape)*:

- A `## Rejected alternatives` section is mandatory: one line per alternative, with the reason it lost. A record with no alternative records no choice.
- `## Consequences` stays optional. Where the discussion argued about a revisit condition for a deferral, that condition goes here.
- The body states a choice in the present tense and carries no implementation state: no "not yet built", no "binds the thread that", no version in name, stem or body. Whether the choice is built is read from the code and the roadmap; whether it is current is read from the folder.
- The record is concise and limited to what a new reader needs.
- `supersedes` keeps its meaning; landing a record that names it moves each named record to the folder's `superseded/`.
- The format carries one short note that editing or deleting a landed record is generally poor practice. It carries no prohibition: the delta primitives below may target a landed record.

The **binding test** leaves the vocabulary.

### The roadmap entry

`suite/shared/references/formats/roadmap-index.md` changes so that an entry can be the home of planned behavior:

- After the `Scope:` line, an entry carries a `Planned behavior:` list, one statement per line, of the behavior the thread opened from it will build *(Inference: block name and position)*. Statements are written in the same form a product behavior statement will take once built.
- Rule 5 ("Constraints that bind the threads opened from these entries are ADRs") becomes: constraints that bind the threads opened from an entry are written in the entry, as planned behavior or as a decision the thread will record.
- Rule 6's closing sentence names where the outcome lives: the code, the descriptions, the decision records and the threads.
- The index stays under `.work/roadmaps/`. `.work/` holds work, current while open and gone or historical after; `docs/` holds standing truth about the system.
- Release scope lives in the index's `## Out of scope` list and dies with the index. There is no release brief *(Inference)*.

## The thread

### Layout

```text
.work/threads/yyyy/mm/dd-hhmm-slug/
├── seed.md
├── log.md
├── change.md                               the change document, once authored
├── delta/                                  the thread's delta: one delta document per target
│   └── docs/…                              mirrors the target path, e.g. delta/docs/adr/<stem>.md,
│                                           delta/docs/pdr/<stem>.md, delta/docs/product/<capability>.md,
│                                           delta/docs/architecture/<module>.md, delta/docs/glossary.md
├── plans/<yymmddhhmm>[-<slug>]/
├── implementations/<yymmddhhmm>[-<slug>]/
│   ├── report.md
│   └── .runs/
├── .pending-decisions/
└── .pending-reviews/
```

`spec.md`, `adr/` and the thread-root `glossary.md` are no longer part of the layout. `suite/shared/references/formats/thread.md` rule 4 reads: before closing, `delta/` is the thread's delta of the project layer and is authoritative inside the thread. After closing, `delta/` stays in place as the historical snapshot of what landed. The seed gains nothing; no commit hash is recorded at open.

### Delta documents

The **delta** is everything one thread drafts for the project layer: the folder `delta/`. A **delta document** is one file in it, naming one project-layer file as its target and one of three types:

- `create`: the body is the whole new file. Landing refuses if the target exists.
- `edit`: the body is literal `add`, `replace` and `remove` operations against the target's recorded blob hash.
- `delete`: names the target and its hash and nothing else.

Rules:

- One delta document per target per thread. Its path under `delta/` mirrors the target's path, so the target is the path; the frontmatter carries `type` and, for `edit` and `delete`, `hash`, and nothing else *(Inference: frontmatter fields)*.
- `hash` is the git blob hash of the target as it stood when the document was drafted, obtained with `git hash-object <target>` on the working tree *(Inference: hash command)*. Amending a delta document after the target changed re-records the hash.
- Every operation carries literal text. Instruction-style operations ("update the grading section to say X") are not operations and the change review rejects them.
- `add` carries the text and an anchor: the exact heading it goes under, the exact line it follows, or `end` *(Inference: anchor forms)*. `replace` carries the exact existing text and the new text. `remove` carries the exact existing text.
- Exact means exact after whitespace normalisation of line ends and trailing spaces *(Inference)*.
- A delta document targeting `docs/adr/` or `docs/pdr/` of type `create` has the record's format as its body; the stem is assigned when the document is first written and never changes.
- Reference shape of an `edit` body *(Inference: the operation syntax within the rules above is pinned here so every skill writes the same thing)*:

````markdown
---
type: edit
hash: <git blob hash>
---

## add
under: `## Saving`
```
- Saving a card that is already saved is a no-op and shows no error.
```

## replace
```
- Reset codes expire after 30 minutes.
```
```
- Reset codes expire after 15 minutes.
```

## remove
```
- Explore shows a second feed.
```
````

### The change document

`change.md` is **the change document**: the thread's design of one change, historical once the thread closes, written by the skill that replaces `spec` and cited from every downstream skill. It holds only what is thread-only. Its one rule: a sentence that describes standing behavior of the product or standing structure of the system is written in a delta document and cited from the change document, never written in its body.

Its body covers, under headings of the author's choosing *(Inference: heading names)*:

- **Goal**, **Context**, **Scope and non-scope**, **Constraints**, as today.
- **The change**: what the deltas add, replace and remove, cited by delta document path, plus any one-off work such as a migration or a data fix.
- **Acceptance**: a flat checklist of behavior statements, one per line, covering everything the implementer builds including what is obvious from the code. No `FR-` or `AC-` identifier or any other numbering. A plan task, a report row or a review finding references a criterion by quoting it verbatim.
- **Degrees of freedom** and **Inferences**, as today.
- **Delta index**: every delta document of the thread by path, with its type. This replaces the "Living documents" practice.

The change authoring drafts every delta document, decision records included, from the log or the live conversation, and cites them from the change document. It reads each target at drafting time to quote exact text and record the hash. It routes one settled point per the table under `## Routing` below. Amendment stays as today: superseded text kept and marked with date and reason; a delta document amended with its change.

A point settled after the change document exists (`resolve-pending-decisions`) is appended to the log only; its record or delta lands through a change amendment.

A term the discussion introduces, changes or retires is a `decision` log line stating the term and its meaning; the change authoring drafts the glossary delta from those lines *(Inference: how terms reach the glossary now that the discussion writes only the log)*.

### Routing

One table, kind by kind, carried by the change document format so every author applies the same sort *(Inference: where the table lives)*:

| A settled sentence that… | goes to | drafted by | lands |
| --- | --- | --- | --- |
| records a choice with a named rejected alternative about how the system is built | ADR (`create` delta) | change authoring | close |
| records such a choice about what the product does or for whom | PDR (`create` delta) | change authoring | close |
| describes built behavior the code does not make obvious | product behavior (`edit`/`create` delta) | change authoring | close |
| describes built structure no single file makes obvious | architecture description (`edit`/`create` delta) | change authoring | close |
| fixes a term | glossary (`edit`/`create` delta) | change authoring | close |
| describes behavior settled but not yet built | the roadmap entry that will build it | `roadmap` skill or its owner | in place |
| is thread-only design, a criterion, a constraint of this change | the change document body | change authoring | never |
| is a rule or guideline for agents | out of scope of this thread | — | — |

### The implementation report

`suite/shared/references/formats/implementation-report.md` gains a mandatory `## Acceptance` section: a table with one row per criterion of the change document, columns **Criterion** (quoted verbatim), **Method** (`automated test`, `manual check` or `code review`), **Evidence** (test name and file, or what was walked through and observed). A criterion without a row fails `review-implementation`. The report is the only home of traceability. `## Deviations` entries name the change document section or the record stem departed from.

### Citation and read order

The citation rule, replacing the paragraph in `docs/documentation-rules.md` and stated in the shared instruction every skill mirrors *(Inference: it lives in a shared instruction so it is stated once)*:

- Nothing under `.work/` is cited from `docs/` or from code. A thread path appears outside its thread only as commit provenance.
- A decision record is cited by stem, for the reason behind a choice, never for what the system does.
- A description is cited by path and heading.
- A roadmap entry is cited by index path and entry slug, from thread artifacts only.
- Code, comments, test names and migrations carry no thread path and no reference to a thread artifact; a test is named for the behavior it proves.
- A commit message explains the change concisely in its own words, may name the thread path once as provenance, and never carries a task number, a criterion, a progress block or a thread artifact as the explanation.

The read order every entry-point skill lists by path in its own `## Inputs`, never through another skill:

1. the project's `AGENTS.md`;
2. `docs/glossary.md`;
3. the architecture description of the touched module;
4. the product behavior of the touched capability;
5. `docs/adr/` and `docs/pdr/`, listed, opening what touches the work;
6. the roadmap entry, when the thread was opened from one;
7. the thread.

Two model-invoked skills remain: **consult-decisions** (lists `docs/adr/` and `docs/pdr/` without loading every record, opens what touches the work, states stem citation and that a record binds until superseded) and **consult-descriptions** (opens the descriptions for what the work touches, states path-and-heading citation and the built-only reading). Each carries the listing command that avoids loading every file and two or three lines on how the kind binds. **consult-adrs** and **consult-glossary** retire.

### Landing

`close-thread` lands the delta. Its pre-write checks and its landing, in order:

1. Currency check, extended: every `## Deviations` entry across the thread's reports is read against the delta documents; a deviation touching a delta document's target blocks the close until the change document and that delta are amended.
2. Thread-reference search: the fixed pattern (`.work/threads/` and the closing thread's own identifier) *(Inference: pattern)* is searched over the repository outside `.work/`; a hit is put to the user before any write.
3. For each delta document: `create` refuses an existing target and asks; `edit` and `delete` compare the recorded hash with the target's current blob hash and, on mismatch, stop for that file and ask. On match, operations apply in document order; an operation whose new text is already present is treated as done; an operation whose quoted text is not found stops and asks.
4. A `create` under `docs/adr/` or `docs/pdr/` whose frontmatter names `supersedes` moves each named record to that folder's `superseded/`.
5. `Closed:` line under the roadmap entry, as today.
6. Closing event: `- (event) thread closed; delta: <landed|none>` *(Inference: the event's shape, replacing the two-category form)*.

"Blocks" and "asks" mean the agent puts the mismatch to the user and proceeds only as the user decides. `delta/` stays in place after close.

## Skills whose roles change

| Skill | Role after this work |
| --- | --- |
| `discussion` | Writes exactly one thing: `log.md`. Drafts no record, no glossary entry, no delta document; the decision test is applied by the change authoring when it drafts, from log lines that already carry the reason and every rejected alternative. The direct-request bypass is kept: the user may ask for any delta document directly, and the change authoring drafts it *(Inference)*. Closure list unchanged. |
| `resolve-pending-decisions` | Appends log lines only; no drafting. |
| `open-thread`, `open-ticket` | Read order in `## Inputs`; layout per the new thread format; seed unchanged. |
| `roadmap` | Writes planned behavior into entries; reads decisions and descriptions in the fixed order; rule 5 rewritten. |
| `spec` → **`change`** *(Inference: skill name follows the term)* | Authors `change.md` and every delta document under `delta/`; reads targets for exact text and hashes; applies the routing table; audit pass unchanged in spirit; amendment pass covers delta documents. |
| `review-spec` → **`review-change`** *(Inference: name)* | Read-only. Adds: no standing-behavior sentence in the body; every citation resolves inside the thread or in the project layer; every delta document is well-formed (type, hash where required, literal operations, one per target, path mirrors target); every `create` under `docs/adr/` or `docs/pdr/` passes the three clauses against the log, a rejected alternative never argued in the log being a finding; criteria carry no identifiers. |
| `plan-brief`, `plan-strict`, `check-plan` | Reference criteria by verbatim quotation; cite the change document and delta documents, never another thread; the strict plan's per-task criteria quote the change document's. |
| `implement`, `implement-plan`, `implement-plan-with-subagents` | Write boundary: code, tests, configuration, living documentation, and this run's implementation folder; nothing in the project layer (`docs/adr/`, `docs/pdr/`, `docs/product/`, `docs/architecture/`, `docs/glossary.md`, `.work/roadmaps/`), nothing in `change.md` or `delta/`. Commit messages per the citation rule; the progress block leaves the commit body. Report with `## Acceptance`. A discovery is reported under `## Follow-ups`, not drafted as a record or entry *(Inference)*. The plan-compliance reviewer lane matches criteria by verbatim text. |
| `review-implementation` | Reads the report's `## Acceptance` table for its acceptance category; runs the thread-reference search over the delivered code, comments, test names and migrations and reports each hit as a finding. |
| `review-code` | Unchanged in role; inputs read order. |
| `close-thread` | Per `### Landing`. |
| `consult-adrs` → `consult-decisions`, `consult-glossary` retired, `consult-descriptions` new | Per `### Citation and read order`. |

~~`suite/authoring/skill-roles.md` and `body-structure.md` change only where they name the retired skills or the `## Inputs` opening pair *(Inference: minimal touch, since `suite/authoring/` is otherwise out of scope)*.~~ *(superseded 2026-09-21: the write-boundary map in `side-effects.md` describes what the skills write, not a rule for authors, and is brought to the model in this thread)*

`suite/authoring/skill-roles.md` and `body-structure.md` change only where they name the retired skills or the `## Inputs` opening pair; `side-effects.md` changes only in its `## The suite-wide write boundaries` map and the paragraph beneath it, where a line names a retired skill, a retired thread file (`spec.md`, the thread's `adr/`, the thread-root `glossary.md`) or a write that this work moves; `interaction-posture.md` changes only where it names the retired skill *(Inference: minimal touch, since `suite/authoring/` is otherwise out of scope)*.

## This repository's adoption

The reference project adopts the model as written, with the admission rules applied honestly:

- `docs/adr/` and `docs/pdr/` are created lazily by the first thread whose decision passes the test. Here the sort is: "how the suite is built" is an ADR, "what the method does for its users" is a PDR.
- `docs/product/` holds one method-level overview, `docs/product/method.md` *(Inference: file name)*: how the method works, how the skills relate, what each produces, the thread shape cited from `suite/shared/references/formats/thread.md` rather than restated. It absorbs the method-level content of `docs/working-with-threads.md`, which is removed, and of `README.md`, which keeps installation, the skill index and the terminal-outcome protocol.
- `docs/architecture/` appears only for what no single file makes readable; the one expected candidate is how shared references are declared in `suite/shared/manifest.yaml` and mirrored by the sync script.
- `suite/authoring/` is untouched beyond the references to retired skills, the `## Inputs` opening pair and the write-boundary map named under `## Skills whose roles change` ~~(was: `suite/authoring/` is untouched.)~~ *(superseded 2026-09-21: the write-boundary map in `side-effects.md` describes what the skills write, not a rule for authors, and is brought to the model in this thread)*. `docs/documentation-rules.md` stays a maintainer document, edited only where its citation paragraph changes; its three-kinds section gains `docs/product/` and `docs/architecture/` as maintainer documentation of this repository *(Inference)*; its `AGENTS.md` paragraph is untouched.
- The root `AGENTS.md` table of governing documents points at the new files *(Inference)*.
- The published one-line search recipe for a project gate is stated once, in the README's project-layer section *(Inference: location)*.

## Constraints

- No hook, script or permission mechanism enforces any boundary; conventions realised by skill design are the enforcement, and the search recipe is published for projects that want a hard gate.
- Shared references are edited under `suite/shared/references/` and synced; mirrored copies are never hand-edited.
- Shipped content stays project-free: no thread path of this repository, no decision identifier.
- Documents describe the current state, never the diff, per `docs/documentation-rules.md`.
- Nothing under `cli/` is edited. The implementation report records each drift it causes: at least the stage catalog naming `spec`, the thread paths `spec.md` and `adr/`, and the stage-support table in `cli/README.md`.
- The thread's `glossary.md` here is authoritative for every term this spec uses; its rows land in `docs/glossary.md` when this thread closes under the current `close-thread`.
- No project-level record is drafted for this thread's decisions.

## Degrees of freedom

- The heading names and ordering inside the change document, provided every element above appears.
- The exact heading scheme inside a product behavior or architecture description document, within "title, `##` per area, one statement per bullet".
- The listing commands inside `consult-decisions` and `consult-descriptions`.
- The wording of the poor-practice note on editing landed records.
- Whether ADR and PDR share one format file or two, provided the content rules are identical.
- The prose of every skill body, format and instruction, to `suite/authoring/` conventions.

## Inferences

Each is marked inline where it shapes the text.

- Rationale beside a statement: a product behavior statement may carry a one-clause reason when no record holds it.
- Conflict rule: description versus code disagreement is identified as bug, stale description or authorised change; never "code wins".
- Description shape: title, `##` per area, one statement per bullet.
- One shared decision-record format with the folder as parameter.
- `Planned behavior:` block name and position in the roadmap entry; release scope has no brief.
- Delta document frontmatter carries `type` and `hash` only; target is the mirrored path.
- `git hash-object` on the working tree as the hash source.
- `add` anchors: `under:` a heading, `after:` an exact line, or `end`; whitespace-normalised matching; the reference `edit` syntax.
- Change document heading names free; routing table lives in the change document format.
- Terms reach the glossary as `decision` log lines stating term and meaning, drafted into the glossary delta by the change authoring.
- Citation rule and read order live in one shared instruction mirrored into skills.
- Thread-reference search pattern: `.work/threads/` plus the closing thread's identifier.
- Closing event shape `thread closed; delta: <landed|none>`.
- Direct-request bypass kept; user may request any delta document.
- Skill names `change` and `review-change`; `consult-decisions`, `consult-descriptions`.
- Implementer discoveries go to `## Follow-ups`.
- `suite/authoring/` touched only where it names retired skills, the inputs opening pair, or — in `side-effects.md` — a write-boundary map line that names a retired skill, a retired thread file or a write this work moves ~~(was: touched only where it names retired skills or the inputs opening pair)~~ *(superseded 2026-09-21: the write-boundary map in `side-effects.md` describes what the skills write, not a rule for authors, and is brought to the model in this thread)*.
- `docs/product/method.md` as the overview's name; `docs/documentation-rules.md` three-kinds section lists the new maintainer paths; root `AGENTS.md` table updated; search recipe published in the README.
- Version-scoped statements: present-tense stance, revisit condition in optional consequences, deferred part in the roadmap's out-of-scope list.
- A record whose kind changes is a `delete` plus a `create` in the new home; git is the history.
- Folder is kind; no frontmatter kind or status field on any project-layer file.

## Acceptance criteria

Thread-local, as the current method requires; a reviewer checks each against the files named.

**FR-1 — Project layer kinds and paths**
- AC-1.1 `suite/shared/references/formats/` holds a format for product behavior and one for architecture description, each stating the fixed path, built-only admission, one statement per line, and change only through delta documents landed at close.
- AC-1.2 The ADR format (or the shared decision-record format) names `docs/pdr/` and its `superseded/` with the same rules as `docs/adr/`, states the filing rule by question answered, and carries the three-clause decision test.
- AC-1.3 The record format requires `## Rejected alternatives`, keeps `## Consequences` optional, forbids implementation state and version tags in name, stem and body, and carries the short poor-practice note without a prohibition.
- AC-1.4 `docs/glossary.md` after this thread closes carries the rows of this thread's `glossary.md`, including the retirements of **spec**, **binding test**, **consult-adrs** and **consult-glossary**.

**FR-2 — Roadmap entry as the home of planned behavior**
- AC-2.1 `formats/roadmap-index.md` shows a `Planned behavior:` list in the entry shape and no longer states that constraints binding threads are ADRs.
- AC-2.2 The `roadmap` skill writes planned behavior into entries and reads decisions and descriptions in its `## Inputs`.
- AC-2.3 The index path remains `.work/roadmaps/`.

**FR-3 — Thread layout and delta documents**
- AC-3.1 `formats/thread.md` shows `change.md` and `delta/` mirroring project-layer paths, and shows no `spec.md`, `adr/` or thread-root `glossary.md`.
- AC-3.2 A delta-document format exists stating the three types, the one-per-target rule, the mirrored path, the frontmatter fields, the hash source, the literal-text rule, the `add` anchors, and the reference `edit` syntax.
- AC-3.3 `create-thread.md` produces `seed.md` and `log.md` only, with no commit hash in the seed.

**FR-4 — The change document**
- AC-4.1 The skill replacing `spec` writes `change.md` and delta documents under `delta/`, and its body states the one rule: no standing behavior or structure in the body.
- AC-4.2 Its acceptance section is a flat checklist with no `FR-`/`AC-` or other identifiers, and its body says criteria are referenced by verbatim quotation downstream.
- AC-4.3 It carries the routing table and the delta index.
- AC-4.4 It reads each target at drafting time and records the blob hash; its amendment pass covers delta documents.

**FR-5 — Discussion writes only the log**
- AC-5.1 `discussion` and `resolve-pending-decisions` list `log.md` as their only written file; neither creates `adr/`, `delta/` or a glossary entry.
- AC-5.2 `discussion` states that a term settled is recorded as a `decision` log line naming term and meaning.

**FR-6 — Implementation boundary and report**
- AC-6.1 Each of `implement`, `implement-plan`, `implement-plan-with-subagents` names the closed deny-list: `docs/adr/`, `docs/pdr/`, `docs/product/`, `docs/architecture/`, `docs/glossary.md`, `.work/roadmaps/`, `change.md`, `delta/`.
- AC-6.2 `formats/implementation-report.md` requires `## Acceptance` with Criterion, Method, Evidence and the three method values.
- AC-6.3 The commit policy of each implement skill drops the progress block from commit bodies and states the provenance rule.
- AC-6.4 The write boundary of each implement skill forbids thread paths and thread artifact references in code, comments, test names and migrations, and names tests for behavior.

**FR-7 — Reviews**
- AC-7.1 `review-implementation` reads the `## Acceptance` table and runs the thread-reference search, each hit a finding.
- AC-7.2 The skill replacing `review-spec` checks the five points listed for it in `## Skills whose roles change`.
- AC-7.3 `plan-strict`, `plan-brief` and `check-plan` quote criteria verbatim and cite no other thread.

**FR-8 — Landing**
- AC-8.1 `close-thread` performs steps 1 to 6 of `### Landing` in that order, and its `## Writes` lists the project-layer files it lands, the `Closed:` line and the closing event, nothing else.
- AC-8.2 On a hash mismatch, a missing quoted text or an existing `create` target, it asks and does not write that file.
- AC-8.3 The closing event reads `thread closed; delta: <landed|none>`.

**FR-9 — Citation, read order, consult skills**
- AC-9.1 One shared instruction states the citation rule and the seven-step read order; every entry-point skill's `## Inputs` opens with the project-layer reads by path in that order.
- AC-9.2 `suite/skills/model-invoked/` holds `consult-decisions` and `consult-descriptions` and no `consult-adrs` or `consult-glossary`; `README.md` lists the two.
- AC-9.3 `docs/documentation-rules.md` states the citation rule by direction and names PDR, path-and-heading citation and the commit provenance exception; its `AGENTS.md` paragraph is byte-identical to today's.

**FR-10 — Reference-project adoption**
- AC-10.1 `docs/product/method.md` exists, covers how the method works, how the skills relate, what each produces, and cites the thread format rather than restating it; `docs/working-with-threads.md` is gone; `README.md` keeps installation, the skill index and the terminal-outcome protocol.
- AC-10.2 `suite/authoring/` differs from today only in references to retired skills, the inputs opening pair, and the write-boundary map of `side-effects.md` where a line names a retired skill, a retired thread file or a write this work moves ~~(was: only in references to retired skills or the inputs opening pair)~~ *(superseded 2026-09-21: the write-boundary map in `side-effects.md` describes what the skills write, not a rule for authors, and is brought to the model in this thread)*.
- AC-10.3 No file under `cli/` differs from today; the implementation report lists the drift.
- AC-10.4 The root `AGENTS.md` governing-documents table names the new files, and the README's project-layer section carries the one-line search recipe.

**FR-11 — No volume signal, no state**
- AC-11.1 No skill or format states a count threshold for records or reports record counts.
- AC-11.2 No format defines a status, lifecycle or kind frontmatter field on any project-layer file.

## Deferred branches

Recorded so they are not lost; none is part of this work.

- A scoped staleness check before implementing: whether files the change document or plan cite changed since they were written.
- The discussion skill carrying a decision tree natively.
- What a project's `AGENTS.md` holds, where guidelines live, how normative strength is marked, and whether a handbook kind exists.
- Per-project mapping of the fixed paths, should they ever hurt an adopting project.
- Landing this thread's twenty-four decisions as records once the method has run on Leitspace.
