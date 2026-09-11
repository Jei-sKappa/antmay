# Spec: Redesign the Antmay method and skill suite from the Leitspace field report

## Intended outcome

The Antmay method and the `suite/` skills are redesigned so that the failure modes documented in `leitspace-field-report.md` cannot recur by construction: a thread has exactly one design truth, decisions that outlive a thread have a project-level home with stable identifiers, historical material is separated from authoritative material mechanically rather than by annotation, downstream artifacts are derived from complete sources with at most one faithfulness check each, every skill is self-contained and declares everything it reads, and a Roadmap is a coarse index that never goes stale against its children. When this spec is implemented, the skills under `suite/skills/`, the shared format references under `suite/shared/`, the suite's user-facing method overview, the repository's distribution and maintenance files, and this repository's own `docs/` project layer describe and implement the redesigned method as the current state, with no trace of the replaced design.

## Context

The field report copied into this thread documents how the method behaved on a real application over thirteen days: the current truth leaked into four disagreeing places, roadmap briefs were wrong before the second child opened and the feedback channel was never read, agents could not tell historical from authoritative artifacts, artifacts restated each other and a reconcile family existed to fight that, and a non-thread artifact became authoritative by footnote. The report's section 3 lists what worked and must survive: a complete decision trail with rationale, superseding records rather than rewrites, the seed-to-report chain per thread, pending decisions and pending reviews, preflight refusals, and the terminal-outcome protocol.

Five research reports under `researches/` surveyed comparable toolkits. Their convergent findings drive this spec: every serious toolkit has a project-level durable layer; the infer-then-strip loop between a spec generator and a reconcile agent over a decisions-only log is information-theoretic, not a prompt defect; historical-versus-authoritative works by shrinking the authoritative surface, not by banners; nobody writes downstream briefs up front; and a skill that depends on another skill having been loaded fails silently when the load is skipped.

Twenty-eight records in `decisions.md` settle the redesign; DR19 is superseded by DR20 and DR13 by DR26. This spec is their handoff-grade projection. The CLI is excluded from this thread and may go stale against the suite (per decisions.md DR1).

## Scope and non-scope

**In scope**

- Every skill under `suite/skills/`: new skills, changed skills, retired skills, as enumerated in `## Skill inventory`.
- Shared format references under `suite/shared/references/formats/` and the sync manifest `suite/shared/manifest.yaml`.
- The suite's user-facing method overview and the developer-facing material that today lives under `docs/`, which move under `suite/` (per decisions.md DR24, DR26).
- This repository's `docs/` folder, which becomes the project layer: `docs/glossary.md` is rewritten as the project glossary with the method's canonical terms as its initial content, and the method reference documents are removed from `docs/` (per decisions.md DR24).
- Repository files that distribute, index, or govern the suite: `.claude-plugin/marketplace.json`, the root `README.md`, `conventionalCommits.scopes` in `.vscode/settings.json`, `.gitignore`, `suite/AGENTS.md`, and the root `AGENTS.md`, whose pointer to the `docs/` reference, vocabulary rule, and thread-identifier rule change (per decisions.md DR7, DR24, DR26).

**Out of scope**

- The `cli/` module in its entirety, including its stage catalog, `cli/README.md`'s stage support table, and `cli/src/pipeline/documentation.test.ts`. These may fail against the redesigned suite until a later thread realigns them (per decisions.md DR1). The root `AGENTS.md` rule requiring that table to be updated in the same change is explicitly suspended for this thread by DR1.
- Migration of existing threads in any project, including this repository's own `docs/threads/`. Threads opened under the previous method keep their layout; this thread itself keeps its `decisions.md` in the `DR<N>` shape until it finishes (per decisions.md DR2 point 6).
- Any tooling that enforces the method mechanically (hooks, filesystem permissions). Every rule in this spec is a convention realized through skill bodies and documentation.

## The redesigned method

Every rule below is the current state to be documented and implemented. Documentation written from this spec must describe this state as if the replaced design had never existed, per the root `AGENTS.md` rule "Describe the current state, never the diff".

### Thread layout

A thread is a folder `docs/threads/<YYMMDDHHMMSSZ-slug>/`; an archived thread lives under `docs/threads/archive/` with the same folder name. The layout separates design truth at the root from execution folders (per decisions.md DR11, DR20):

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── seed.md                          eager; written once by the thread-opening operation
├── log.md                           eager; the thread's memory (DR3)
├── spec.md                          the thread's design truth once authored (DR2)
├── adr/                             thread ADR delta, lazy (DR6, DR7, DR10)
├── glossary.md                      thread glossary delta, lazy (DR6, DR9)
├── plans/
│   └── <yymmddhhmm>[-<slug>]/       one folder per plan (DR20)
│       ├── plan.md                  brief plan, or strict-plan index
│       └── plan-tasks/              strict plan only
├── implementations/
│   └── <yymmddhhmm>[-<slug>]/       one folder per implementation (DR20)
│       ├── report.md                that implementation's outcome, with a deviations section
│       └── .runs/                   gitignored run state
├── .pending-decisions/              gitignored
└── .pending-reviews/                gitignored
```

The seed keeps its current two requirements (a title and a self-contained genesis narrative) and sparse metadata; a thread opened from a roadmap entry additionally records the roadmap index path and the entry's slug (per decisions.md DR18, DR28).

The stamp of a plan or implementation folder is its creation time in UTC at minute resolution. The slug is optional: it is added when the invoker names a purpose or when a same-minute folder already exists (per decisions.md DR20). A plan skill always creates a new plan folder. An implementation skill always creates a new implementation folder, unless the invocation explicitly says to continue, which reuses the newest implementation folder and its run state. The report's header names the plan folder executed, or states that none was used. There is no thread-level plan and no thread-level report: the spec is the current design, the code is the current outcome, and the closing skill reads every implementation's report.

### The thread log

`log.md` is created eagerly by the thread-opening operation with a one-line header. It is memory, never truth (per decisions.md DR2 point 1, DR3):

- Each entry is one line of the form `- (type) gist with the reason folded in`. No identifiers, no timestamps; order in the file is the only structure.
- The vocabulary is fixed, identical in every skill, exactly seven types: `decision`, `constraint`, `assumption`, `question`, `capability`, `direction`, `event`. There is no catch-all type.
- Any skill that settles a point appends its line the moment the point settles, before acting on it. The write is blind: the log is never re-read during the session that writes it.
- Append-only. A later entry supersedes an earlier one on the same point; history stays intact. A terminal moment is an `event` entry; there is no lifecycle status field.
- A skill appends by a shell append (`>>`) of a single line and never opens the file with a file-editing tool. One writer per session: a skill that fans out to subagents does all appending from the orchestrator.
- The log has exactly two readers (per decisions.md DR22, DR23): the discussion skill reads it once at session start, while loading the thread, when it has entries; the spec skill reads it as an input when the live conversation is absent, and reads the entries after the last spec `event` line in its amendment pass. Whenever the spec skill authors or amends the spec it appends one `event` line stating so. No planning, implementation, review, or closing skill reads the log, and the log is never cited from any artifact.

### The spec as design truth

`spec.md` is the single in-thread design truth (per decisions.md DR2, DR17, DR22):

- It is authored once by the `spec` skill, which the user invokes after the discussion. In the normal case the same session that ran the discussion invokes it, so the live conversation is the primary input; if the session was lost, a fresh session authors it from the log, which is complete enough to do so. Inputs: the live conversation when present, otherwise `log.md`; `seed.md`; the thread's `adr/` and `glossary.md`; and the project layer.
- Authoring includes one audit pass that walks the log claim by claim and confirms each landed. Anything the spec states that the log and seed do not support is labelled inline as an assumption or an open question, never deleted and never silently kept as settled. A spec is not complete while an open question remains.
- The spec cites the thread's ADRs where they are operative and does not restate them (per decisions.md DR6). Thread-local design that is not an ADR is written in the spec in full, including the thread's direction, which is settled in the discussion and has no artifact of its own (per decisions.md DR15).
- After authoring, every change to the design amends `spec.md` in place: the superseded text is kept, marked as superseded, and annotated with the date and the reason; the same change is appended to the log as one line. Any skill other than the discussion that obtains a new human decision mid-run appends the log line and amends the spec before acting on it.
- The discussion skill never writes or amends the spec. After a discussion on a thread whose spec exists, the spec is amended on the user's instruction, in one of two ways: the user re-invokes the `spec` skill, which, finding an authored spec, runs an amendment pass instead of authoring, taking the live conversation when present and otherwise the log entries after the last spec `event` line, and amends each affected passage in place; or the user asks the agent directly to amend the spec, under the same in-place rules and with a log line appended. A regenerated spec never replaces an authored one, and no skill measures the spec against the log after authoring.
- The discussion skill states no context budget or split rule; the user manages session context (per decisions.md DR17).

### The thread's ADR and glossary delta

A thread carries a delta of the project layer, written during the discussion and applied at close (per decisions.md DR6):

- **When a record is written.** When a settled point passes the binding test, meaning a later thread could build against it incorrectly if not told and could not read it off the code, the discussing agent proposes an ADR and the user confirms or redirects its text before it is written. The user may also request one directly. Every skill that settles a project-level point mid-thread does the same. Raising a contradiction with an existing project ADR or glossary term during the discussion, before any draft exists, is part of the discussion's job (per decisions.md DR12).
- **Authority inside the thread.** From the moment a thread ADR is written it is authoritative for that thread: the spec and every downstream skill rest on it and cite it.
- **Drafts.** Until close a thread ADR is a draft in the thread's `adr/`. If the same thread later reverses it, the settling operation edits it in place. That is the only in-place editing of a record the method permits.
- **Glossary delta.** New or changed project terms are written to the thread's `glossary.md` the same way.
- **Log entry.** Every settled point still receives its one-line log entry, since the log feeds spec authoring.

An ADR file (per decisions.md DR7, DR9, DR10):

- Is named `<yymmddhhmm>-<slug>.md`, where the stamp is the record's creation time in UTC at minute resolution. The stem is the record's global identifier, assigned when the record is first written into the thread's `adr/`, and it never changes. Closing the thread moves the file unaltered.
- Opens with a YAML frontmatter block carrying `name` (a short title written as a full decision sentence), `description` (one sentence for the catalog), and optionally `supersedes` (one or more stems of project ADRs this record replaces or retires). There is no status key: location is the status.
- Has a free-form body with required content: the context needed to understand the decision without the thread, the decision stated in full, and the reason. A single paragraph satisfies this. Further sections appear only when they carry something the required content does not; considered options, consequences, and scope are the usual candidates, under headings chosen to fit the record.

### The project layer

The method owns three things at fixed paths in every project, created lazily and never a prerequisite (per decisions.md DR4, DR7, DR9, DR18):

- `docs/adr/` holds current project ADRs; `docs/adr/superseded/` holds superseded and retired ones. Files in `docs/adr/` are the whole authoritative surface for project decisions. There is no maintained index file: a single shell command over the folder prints the catalog of stems, names, and descriptions from the frontmatter.
- `docs/glossary.md` holds the project's terms.
- `docs/roadmaps/<yymmddhhmm>-<slug>.md` holds one roadmap index per direction (per decisions.md DR18); see `### Roadmap`.

Living documentation (READMEs, architecture references, API docs, runbooks) stays in whatever shape the project chooses. The method defines no living-spec format and performs no structural merge. Living documentation changes within implementation scope, as part of the implementation that changes the behavior it describes (per decisions.md DR5).

The project's `AGENTS.md` carries a short method section, written by the project's humans and not by any skill, for sessions that run without invoking any Antmay skill: pointers to `docs/adr/` and `docs/glossary.md`, the ADR catalog command, and the list of the project's authoritative living documents by path (per decisions.md DR9, DR26). It is not a managed block, and no setup skill exists.

Identifiers (per decisions.md DR7): code, tests, commit messages, and living documentation may cite an ADR by its stem, never by path, and are never required to. Nothing thread-local (log entries, spec sections, plan tasks, plan or implementation folders) is ever cited outside its thread. The `DR<N>` term exists only in threads opened under the previous method; the redesigned method has no thread-local decision numbering.

### Self-contained skills, inputs, and conflicts

No skill carries or loads a statement of the method. A skill acts on inputs, outputs, and their formats, and each skill states everything it needs in its own body (per decisions.md DR26).

**The `## Inputs` section.** Every skill that reads anything carries a section headed exactly `## Inputs`, listing everything it reads as a list rather than prose. Each item is a path with one clause stating what it is for and whether it is authoritative or material. The list opens with the same two items in every skill: the project ADR catalog and the records relevant to the target, then `docs/glossary.md`; the thread files the skill needs follow. A skill with one primary input names it and its accepted forms in the same section. The procedure then starts from a gathered state and does not repeat the reads. Skills that read nothing carry no such section.

**What a skill may read** (per decisions.md DR12, DR18, DR25): the project layer, the active thread's files, and, for a thread opened from a roadmap entry, the roadmap index at `docs/roadmaps/`, which is a project-level file. No skill reads another thread's files. An archived thread is read only when the user names it in the invocation, and then as history, never as authority; a referenced artifact or prompt a plan or implementation skill accepts is likewise material, never authority.

**Conflicts** (per decisions.md DR12). A contradiction between the thread's material and a project ADR or glossary term is **intentional**, and raised by no skill, when the thread's `adr/` holds a draft naming that ADR in `supersedes` or the thread's `glossary.md` redefines the term. Every other contradiction is an **unnoticed conflict**: an interactive skill puts it to the user; a completion-oriented skill queues a pending decision; no skill resolves it by overriding the project record. The user's confirmation that a change is intended is recorded by writing the superseding draft, which makes it intentional from then on. This rule and the catalog command travel with the ADR format reference, since both are about how ADR files relate.

**Shared format references.** `suite/shared/references/formats/` holds, authored once and synced into every skill that reads or writes the artifact, the formats of: the log line, the ADR file, the pending-decision bundle, the discussion point, the roadmap index, the implementation report, and any other artifact more than one skill touches. Shared references carry formats and the two ADR behaviors above, nothing else. Each skill's own procedure and write boundary stay inline in its body.

**The method for humans.** One user-facing overview document in the suite describes the method as a whole: the thread layout, the project layer, the recipes, and the lifecycle from open to close. No skill loads it (per decisions.md DR24, DR26).

### The closing skill

One dedicated, completion-oriented skill closes a thread. It is the only writer of `docs/adr/`, `docs/glossary.md`, and, for the entry update below, `docs/roadmaps/`; every other skill reads them and states that boundary in its own body (per decisions.md DR5, DR7, DR9, DR10, DR18, DR21, DR27).

It runs every check before its first write:

1. **Currency check**, scaled to what the thread holds (per decisions.md DR21). With implementations and a spec: each report's deviations section and the delivered changes, read against the spec's claims and the draft ADRs. With a spec and no implementations: the draft ADRs against the spec. With implementations and no spec: the reports and delivered changes against the draft ADRs and the seed's intent. With neither: no divergence is possible. The check is narrow: it reads recorded deviations and delivered changes, and is not a review of the implementation at large.
2. **Landing preflight.** Every draft ADR carries `name` and `description`; every `supersedes` stem resolves to a file in `docs/adr/`; no draft contradicts a project ADR it does not supersede.
3. **Roadmap reference.** When the seed names a roadmap index and entry slug, the index file and the heading exist.
4. **Workspaces.** A non-empty `.pending-decisions/` blocks the close, naming the bundles, unless the invocation says explicitly to archive anyway. Non-empty `.pending-reviews/` and implementation run state are named in the report and carried into the archive untouched.

Anything a check cannot settle from the thread's material becomes a pending decision through `emit-pending-decisions`, and the run ends `BLOCKED` with the thread untouched except for the bundle. Once every check passes, the writes run without questions, in order:

1. **ADR landing.** Create `docs/adr/` lazily; move every file in the thread's `adr/` into it unaltered. For each landed record whose `supersedes` names project ADRs, move those files into `docs/adr/superseded/`, content untouched, in the same act.
2. **Glossary merge.** Create `docs/glossary.md` lazily; merge the thread's `glossary.md` into it semantically. A term already present is updated to the thread's definition; no term present before the merge is absent after it.
3. **Roadmap entry.** When the seed names an entry, write a one-line outcome and the thread's archive folder name beneath that entry's heading.
4. **Log event.** Append one `event` line stating the thread closed.
5. **Archive.** Move the thread into `docs/threads/archive/`, carrying the workspaces untouched.
6. **Report.** State what landed, what was superseded, what merged, which entry was updated, and recommend a commit.

Terminal outcomes: `DONE` with the archive path; `BLOCKED` with the bundle path or the open workspaces; `REFUSED` when no thread resolves or a draft ADR is structurally malformed. Re-invocation after a block is a plain re-run. No skill writes another thread's files under any circumstance. No operation forces the closing skill to run; the thread-opening operation does not check for unclosed threads (per decisions.md DR5). The closing skill does not stage, commit, or push. `finish` keeps its branch-handoff scope and recommends closing the thread first so landed ADRs travel with the delivery.

### Planning, the plan check, and implementation

- **Plan skills** (`plan-brief`, `plan-strict`) read the spec and write into a new folder `plans/<yymmddhhmm>[-<slug>]/` on every invocation (per decisions.md DR20). They keep their own end-of-authoring self-check (per decisions.md DR15). Their primary input is the thread's spec, or a referenced artifact or prompt.
- **Plan check.** One skill runs in a fresh context against the newest plan, or a named one, with the spec as its sole authority (per decisions.md DR15). It corrects in place every fault that follows from the spec: a task contradicting the spec, an acceptance criterion no task covers, an ambiguous or wrong step, a wrong target path. It never removes implementation detail the plan added and never satisfies a gap by inventing a task. Anything it cannot fix from the spec becomes a pending decision. It edits only that plan folder.
- **Implementation skills** (`implement`, `implement-plan`, `implement-plan-with-subagents`) read the spec and the plan they execute, the newest or a named one, or none for `implement` run from a seed, reference, or prompt. Each invocation creates a new folder `implementations/<yymmddhhmm>[-<slug>]/`, keeps its run state under that folder's `.runs/`, and writes that folder's `report.md` on every terminal outcome, with a header naming the plan folder executed or stating that none was used, and a dedicated deviations section (per decisions.md DR8, DR20). Only an explicit instruction to continue reuses the newest implementation folder and its run state. When a new implementation targets a plan that earlier reports already name, the skill reads those reports and treats the tasks they record as completed as done, verifying against the code before skipping. Implementation skills update living documentation within implementation scope and never write `docs/adr/` or `docs/glossary.md`. They append log lines only from the orchestrator. A parent-level discovery is a proposed ADR or a proposed roadmap entry surfaced to the user, never a silent write.
- **Wrong ADR or spec decision discovered downstream** (per decisions.md DR8). During planning: queue a pending decision; planning does not proceed on it; resolving the bundle edits the draft ADR and amends the spec before planning resumes. During implementation: a deviation that stays within accepted intent proceeds and is recorded in the report's deviations section, each entry naming what was built, the spec section or ADR stem it departs from, and why; a contradiction of a thread ADR or of a spec decision is a change of intent and is queued as a pending decision, ending the run blocked.
- **`update-implementation-report`** targets one implementation folder's `report.md` and carries the deviations section; whether the primitive keeps its name is a degree of freedom.

### Pending decisions and their resolution

A pending-decision bundle (per decisions.md DR16) keeps a routing header naming the producing skill, the target, the originating request, the creation time, and the point count. Each point is half finding, half decision: what is blocked, why the producer could not derive the answer, and the evidence it weighed, in the producer's own words. A point may add a free-text suggestion when the producer sees an immediate fix; nothing requires one. A point carries no options, no recommendation, and no discussion-point structure. There is no bundle-level suggested-action paragraph.

`resolve-pending-decisions` frames each point as a discussion would, live with the user, and writes each settled point per the spec and delta rules: it appends the log line, amends `spec.md` in place with superseded text kept and dated, and writes or edits a draft ADR when the point is project-level (per decisions.md DR15). When the human's answer is that the code and not the spec must change, it records the log line and leaves the spec as it stands; the user then runs an implementation (per decisions.md DR27). It writes no `DR<N>` record. It still removes settled points and deletes an emptied bundle.

The `emit-pending-decisions` primitive writes the reshaped bundle and nothing more.

### Roadmap

A Roadmap thread structures a larger direction. It is an ordinary thread (per decisions.md DR18): it discusses the direction, writes its ADRs and glossary entries in its delta, authors the roadmap index, and closes through the closing skill like any other thread, so its ADRs land in `docs/adr/` before any child opens. It authors no spec unless its owner wants one (per decisions.md DR21).

- The index is a project-level file at `docs/roadmaps/<yymmddhhmm>-<slug>.md`, stamp in UTC at minute resolution, authored by the `roadmap` skill and edited in place by its owner (per decisions.md DR14, DR18). It holds the destination, ordered entries, an out-of-scope list, and a not-yet-specified note for what cannot yet be seen. Each entry is a heading whose text is a short kebab-case slug unique within the index, followed by a one-paragraph sketch and a scope boundary; the slug is the entry's identifier (per decisions.md DR28). The index carries no shared-constraints section, no statuses, no checkboxes, and no child briefs. Constraints on children are ADRs.
- No child thread is created up front. When the frontier reaches an entry, the user opens a thread with `open-thread`, whose seed records the index path and the entry slug. That thread runs a normal discussion against the project layer as it stands, and reads the index as a project-level file.
- An entry is pinned once a thread is opened from it, and its slug is never renamed after that; unstarted entries may be reordered, merged, or dropped by the owner. Merging two entries keeps one slug and drops the other.
- When a thread opened from an entry closes, the closing skill writes a one-line outcome and the thread's folder name beneath that entry's heading. This is a write to a project-level file within the closing skill's write authority; there is no cross-thread write.
- A direction-level discovery in a child travels as a superseding draft ADR in the child's `adr/`, landed at the child's close. A discovery implying new work is a proposed entry the user adds to the index.
- When the destination is reached or abandoned, the owner deletes the index; the outcome lives in the code, the ADRs, and the archived threads.

### Reviews

`review-spec` stays, optional and read-only, aimed at whether the spec stands alone for a fresh agent. `review-implementation` and `review-code` are unchanged in mandate; they review the newest implementation unless one is named, reading its report and the plan it names. Every review writes findings only; a review may flag a spec criterion as a finding and never edits it (per decisions.md DR15).

### Skill inventory

**New skills** (names are a degree of freedom; see `## Degrees of freedom`):

- The closing skill (per decisions.md DR5, DR27), completion-oriented.
- The plan check (per decisions.md DR15), completion-oriented.

**Retired skills**, removed from `suite/skills/`, `marketplace.json`, the root `README.md`, and `conventionalCommits.scopes`: `propose`, `reconcile-proposal`, `reconcile-spec`, `reconcile-plan`, `reconcile-roadmap`, `review-roadmap`, `materialize-roadmap-threads`, `append-roadmap-feedback`, `merge-artifacts`, `archive-thread` (absorbed into the closing skill). The group folders `propose/`, `reconcile/`, and `merge/` go with them.

**Changed skills**: `open-thread` (creates `log.md`, not `decisions.md`; accepts a roadmap index path and entry slug and writes both into the seed), `allocate-thread` (same), `discussion` (reads `log.md` once at start and the spec when present; appends log lines; writes draft ADRs and glossary entries with user confirmation; writes no `DR<N>` records; no spec, no handoff, no budget), `spec` (inputs and audit per `### The spec as design truth`; amendment pass on an existing spec; appends the spec `event` line; cites thread ADRs), `plan-brief`, `plan-strict`, `implement`, `implement-plan`, `implement-plan-with-subagents`, `update-implementation-report`, `emit-pending-decisions`, `resolve-pending-decisions`, `emit-pending-review` (names the implementation folder it targets), `review-spec`, `review-implementation`, `review-code`, `roadmap` (writes the index at `docs/roadmaps/` with slug-headed entries, no feedback file), `finish` (readiness inspection covers implementations and recommends closing; offers no archive), `whats-next` (advises from the new layout; no feedback listing), `open-ticket` (unchanged in mandate).

Every remaining skill that reads anything carries the `## Inputs` section per `### Self-contained skills, inputs, and conflicts`, and every skill states its own write boundary inline.

### Documentation and repository maintenance

- **The suite's method text** (per decisions.md DR24, DR26). A user-facing overview document in the suite describes the redesigned method as current state: the thread layout, the project layer, the three recipes, and the lifecycle. The Roadmap recipe describes an ordinary thread whose deliverable is the index at `docs/roadmaps/` plus its ADRs, and the lazy opening of threads from entries; the Standard recipe describes discussion, spec, plans, implementations, and close; the Quick recipe describes open, implement, and close, with discussion, spec, and plan optional. Developer-facing material for people maintaining the suite, today `docs/skill-authoring.md` and the parts of `docs/README.md` and `docs/thread-model.md` that are not user-facing, moves under `suite/`, most naturally beside `suite/AGENTS.md`. `docs/README.md`, `docs/thread-model.md`, `docs/skill-authoring.md`, and `docs/recipes/` are removed from `docs/`.
- **This repository's project layer** (per decisions.md DR24). `docs/glossary.md` is rewritten as the project glossary. Its initial content is the method's canonical terms, written directly by the implementer because this thread carries no glossary delta: it defines ADR, thread log, plan, implementation, closing, delta, binding test, and the terms the vocabulary table in the root `AGENTS.md` carries today, and contains no method definition of `DR<N>`, round, feedback record, child brief, proposal, or reconcile. From then on only the closing skill writes it.
- **Root `AGENTS.md`** (per decisions.md DR7, DR24, DR26). The Method Conventions section becomes the human-written method section of `### The project layer` for this repository, pointing at `docs/adr/`, `docs/glossary.md`, the catalog command, and the repository's living documents. The vocabulary rule names `docs/glossary.md` as the project glossary and naming authority, written through threads and the closing skill. The rule on thread identifiers says that thread-local material is never cited outside its thread and that ADR stems may be. The root `README.md` indexes the remaining skills and points at the suite's method overview.
- **`.gitignore`** ignores `docs/threads/**/.runs/` alongside the two pending workspaces.
- **`suite/shared/references/`**: `formats/decision-record.md` and `roadmap-descendant-feedback.md` are removed; `formats/discussion-point.md` stays for the discussion skill's transient framing; format references for the log line, the ADR file (with the catalog command and conflict rule), the pending-decision bundle, the roadmap index, and the implementation report are added; `manifest.yaml` is updated accordingly and `sync-shared-references.mjs` is rerun.
- **`suite/AGENTS.md`** describes the new group layout, invocation roles, the `## Inputs` convention, and the shared-format composition; the "When adding a new skill" checklist is followed for each new skill and its inverse for each retired one. `check-marketplace-skills.mjs` passes.

## Constraints

- **CLI staleness is accepted** (per decisions.md DR1). No decision in this spec is constrained by the CLI's stage catalog, target resolution, or outcome protocol; `cli/README.md`'s stage table and `documentation.test.ts` may fail until a later thread.
- **Describe the current state, never the diff.** Every document and skill body written under this spec describes the redesigned method with no negation or contrast whose only referent is the replaced design.
- **Conventions are the enforcement.** No hook, script, or permission mechanism is introduced; DR3 forbids shipping a log-append script and DR9 forbids a listing script or index file.
- **Skill format.** Skills keep the existing `SKILL.md` frontmatter conventions (`name`, `description`, `metadata`, `disable-model-invocation: true` on every user-invoked entry point, omitted on primitives). No skill instructs loading another skill for rules; an entry point may still invoke a primitive by name.
- **Terminal-outcome protocol and preflight refusals are preserved** for every completion-oriented skill, the closing skill and the plan check included: `REFUSED` before any artifact is written, `BLOCKED` with a pending bundle, `DONE` otherwise.
- **Write authority** as stated per skill: only the thread-opening operation writes `seed.md`; any settling skill appends `log.md`; the discussion, `resolve-pending-decisions`, and other settling skills write the thread's `adr/` and `glossary.md`; the spec skill, `resolve-pending-decisions`, and any other settling skill amend `spec.md`, and the discussion never does; plan skills and the plan check write under `plans/`; implementation skills write under `implementations/` and living documentation; the closing skill alone writes `docs/adr/`, `docs/glossary.md`, a roadmap index entry under `docs/roadmaps/`, and performs the archive move; the `roadmap` skill alone creates an index file.
- **Vocabulary.** `docs/glossary.md` in this repository is the naming authority; every new term introduced by this spec is defined there in the same change.
- **Commits.** Nothing in this spec authorizes a commit; the implementer follows the repository's Conventional Commits rules when the user asks.

## Acceptance criteria

**FR-1 Thread layout (DR3, DR6, DR11, DR20)**
- AC-1.1 The suite's method overview shows the layout in `### Thread layout` verbatim in structure: `seed.md`, `log.md`, `spec.md`, `adr/`, `glossary.md`, `plans/<stamp>[-<slug>]/{plan.md, plan-tasks/}`, `implementations/<stamp>[-<slug>]/{report.md, .runs/}`, `.pending-decisions/`, `.pending-reviews/`.
- AC-1.2 `grep -rn "decisions.md\|proposal.md\|roadmap-feedback.md\|rounds/\|implementation-runs" suite/ docs/ AGENTS.md README.md .gitignore` returns no match outside `docs/threads/`.
- AC-1.3 `open-thread` and `allocate-thread` create `seed.md` and `log.md` eagerly and nothing else.
- AC-1.4 `.gitignore` ignores `docs/threads/**/.runs/`, `docs/threads/**/.pending-decisions/`, and `docs/threads/**/.pending-reviews/`.

**FR-2 Thread log (DR3, DR22, DR23)**
- AC-2.1 The log-line format reference lists exactly the seven entry types `decision`, `constraint`, `assumption`, `question`, `capability`, `direction`, `event` and the entry form `- (type) gist with the reason folded in`, and is synced into every skill that appends.
- AC-2.2 Every skill that settles a point (`discussion`, `resolve-pending-decisions`, `spec`, the closing skill, the implementation skills) instructs a single-line shell append and forbids opening `log.md` with an editing tool.
- AC-2.3 `implement-plan-with-subagents` states that only the orchestrator appends to `log.md`.
- AC-2.4 `grep -rln "log.md" suite/skills/*/*/SKILL.md` lists only skills whose mention is an append instruction, plus `discussion` for its start-of-session read and `spec` for its input and amendment-pass read.
- AC-2.5 The `spec` skill appends an `event` line whenever it authors or amends the spec.

**FR-3 Spec as design truth (DR2, DR17, DR22)**
- AC-3.1 The `spec` skill's `## Inputs` names the live conversation or `log.md`, `seed.md`, the thread's `adr/` and `glossary.md`, and the project layer; its body contains an audit step that labels unsupported claims as assumptions or open questions and forbids deleting them.
- AC-3.2 The `spec` skill states that it cites thread ADRs and does not restate them.
- AC-3.3 The `spec` skill, finding an authored `spec.md`, runs an amendment pass over the live conversation or the log entries after the last spec `event` line, and the in-place amendment rule (superseded text kept, marked, dated, with reason, plus a log line) is stated in the spec skill and in every completion-oriented skill that amends the spec.
- AC-3.4 No skill named `reconcile-spec` exists, and no skill body describes measuring the spec against the log after authoring or replacing an authored spec.
- AC-3.5 The `discussion` skill body contains no spec-writing or spec-amending step, no handoff to `spec`, and no context budget; it reads `spec.md` when present.

**FR-4 Thread ADR delta (DR6, DR7, DR10)**
- AC-4.1 The `discussion` skill proposes an ADR when a settled point passes the binding test as worded in `### The thread's ADR and glossary delta`, requires user confirmation of the text, and accepts a direct user request for one.
- AC-4.2 The ADR format reference specifies the file name `<yymmddhhmm>-<slug>.md`, UTC minute stamp, frontmatter keys `name`, `description`, optional `supersedes`, no status key, the required body content (context, decision, reason) with free form, that a thread ADR is authoritative within its thread from creation and editable in place until close, and that its stem never changes.
- AC-4.3 The `discussion` and `resolve-pending-decisions` skills also write glossary entries to the thread's `glossary.md`.

**FR-5 Project layer (DR4, DR7, DR9, DR26)**
- AC-5.1 The suite's method overview fixes `docs/adr/`, `docs/adr/superseded/`, `docs/glossary.md`, and `docs/roadmaps/` as the layer's paths and states they are created lazily.
- AC-5.2 The ADR format reference contains a single shell command that prints stem, `name`, and `description` for every file in `docs/adr/`; no skill creates or maintains an index file or a script.
- AC-5.3 The method overview states the citation rule: ADR stems may be cited from code, tests, commits, and living docs, never by path and never required; thread-local material is never cited outside its thread.
- AC-5.4 The method overview states the human-written `AGENTS.md` method section (pointers, catalog command, living-documents list) and that no skill writes it; no setup skill exists.
- AC-5.5 `grep -rn "DR<N>\|bare \`DR" AGENTS.md suite/ docs/*.md docs/adr docs/roadmaps` returns no match.

**FR-6 Inputs and conflicts (DR12, DR18, DR25, DR26)**
- AC-6.1 Every skill under `suite/skills/` that reads any file carries a section headed exactly `## Inputs`, whose first two items are the project ADR catalog and `docs/glossary.md`, followed by the thread files it reads, each item a path with a clause stating purpose and authority.
- AC-6.2 The ADR format reference defines an intentional contradiction by the `supersedes` key or a glossary redefinition, and the surfacing rule for unnoticed conflicts (interactive: ask; completion-oriented: pending decision; never override).
- AC-6.3 No `## Inputs` section names another thread's files; a roadmap index under `docs/roadmaps/`, a user-named archived thread, and a user-referenced artifact or prompt are the only inputs outside the project layer and the active thread any skill names, each marked as material rather than authority where applicable.

**FR-7 Self-contained skills (DR26)**
- AC-7.1 No skill under `suite/skills/` instructs loading another skill for rules; `grep -rn "method skill\|load the method" suite/` returns no match.
- AC-7.2 Every format under `suite/shared/references/formats/` is listed in `manifest.yaml` and synced into every skill whose body names it; `grep -rn "supersedes" suite/skills/*/*/SKILL.md suite/skills/*/*/references` finds the conflict rule only in synced copies of the ADR format reference.
- AC-7.3 A user-facing method overview exists in the suite covering the thread layout, the project layer, the three recipes, and the lifecycle, and no skill body references it.

**FR-8 Closing skill (DR5, DR7, DR9, DR18, DR21, DR27)**
- AC-8.1 The closing skill body runs the currency check, landing preflight, roadmap-reference check, and workspace check before any write, and states that a `BLOCKED` run leaves the thread untouched except for the bundle.
- AC-8.2 The currency check is stated for all four material combinations of `### The closing skill` and names each report's deviations section and the delivered changes as its inputs; the body does not require `spec.md` to exist.
- AC-8.3 The closing skill moves `adr/*` into `docs/adr/` unaltered and moves each project ADR named in a landed record's `supersedes` into `docs/adr/superseded/` with content untouched.
- AC-8.4 The closing skill states that no term present in `docs/glossary.md` before the merge is absent after it.
- AC-8.5 The closing skill blocks on a non-empty `.pending-decisions/` unless told to archive anyway, names non-empty `.pending-reviews/` and run state in its report, and carries all workspaces untouched into `docs/threads/archive/`.
- AC-8.6 The closing skill writes the outcome line beneath the referenced entry's heading in `docs/roadmaps/<index>.md` when the seed names one, and no skill body writes another thread's files.
- AC-8.7 The closing skill ends with `DONE`, `BLOCKED`, or `REFUSED` as defined in `### The closing skill`, does not stage, commit, or push, and `open-thread` contains no check for unclosed threads.
- AC-8.8 No skill named `archive-thread` exists, and `finish` recommends the closing skill and offers no archive action.

**FR-9 Plans, plan check, implementations (DR8, DR15, DR20)**
- AC-9.1 `plan-brief` and `plan-strict` create a new `plans/<stamp>[-<slug>]/` folder on every invocation, name the spec or a referenced artifact or prompt as primary input, and keep their own self-check.
- AC-9.2 A plan-check skill exists whose sole authority is the spec, whose edit target is the newest or a named plan folder, whose body forbids removing plan-added detail and inventing tasks, and which queues a pending decision for anything it cannot fix from the spec.
- AC-9.3 No skill named `reconcile-plan`, `reconcile-proposal`, `propose`, or `merge-artifacts` exists.
- AC-9.4 Each implementation skill creates a new `implementations/<stamp>[-<slug>]/` folder unless told to continue, keeps run state under its `.runs/`, writes its `report.md` on every terminal outcome with a header naming the plan folder executed or none, and a deviations section whose entries name what was built, the spec section or ADR stem departed from, and why; and states that a contradiction of a thread ADR or spec decision is queued as a pending decision.
- AC-9.5 Each implementation skill that executes a plan reads earlier reports naming the same plan and skips tasks they record as completed after verifying against the code.
- AC-9.6 No implementation skill references roadmap feedback; `suite/shared/references/roadmap-descendant-feedback.md` does not exist and is absent from `manifest.yaml`.
- AC-9.7 `update-implementation-report` targets one implementation folder's `report.md` and includes the deviations section.

**FR-10 Pending decisions (DR15, DR16, DR27)**
- AC-10.1 The pending-decision bundle format specifies the routing header fields (producer, target, originating request, creation time, point count) and a point consisting of blocker, reason it could not be derived, evidence, and an optional free-text suggestion; it contains no options, recommendation, or suggested-action paragraph.
- AC-10.2 `emit-pending-decisions` writes that shape and nothing else.
- AC-10.3 `resolve-pending-decisions` frames each point live, and for each settled point appends a log line, amends `spec.md` in place or leaves it when the answer is that the code must change, and writes or edits a draft ADR when project-level; its body contains no `DR<N>` record writing.
- AC-10.4 `suite/shared/references/formats/decision-record.md` does not exist and is absent from `manifest.yaml`.

**FR-11 Roadmap (DR14, DR18, DR21, DR28)**
- AC-11.1 The roadmap index format reference and the `roadmap` skill specify `docs/roadmaps/<yymmddhhmm>-<slug>.md` with destination, slug-headed entries each with a one-paragraph sketch and scope boundary, out-of-scope list, and not-yet-specified note, and no shared-constraints section, statuses, child briefs, or feedback file.
- AC-11.2 The method overview's Roadmap recipe states that the Roadmap thread closes like any thread before entries are worked and authors no spec unless wanted, that threads are opened by the user from an entry when the frontier reaches it, that an entry's slug is pinned on open, that the closing skill writes beneath the entry's heading, and that the owner deletes the index when the destination is reached.
- AC-11.3 No skill named `materialize-roadmap-threads`, `append-roadmap-feedback`, `reconcile-roadmap`, or `review-roadmap` exists.
- AC-11.4 `open-thread` and `allocate-thread` accept a roadmap index path and entry slug and write both into the seed.

**FR-12 Reviews (DR15, DR20)**
- AC-12.1 `review-spec`, `review-implementation`, and `review-code` exist, carry `## Inputs`, target the newest implementation unless one is named where applicable, and write findings only.

**FR-13 Distribution, repository layer, and maintenance (DR24, DR26)**
- AC-13.1 `.claude-plugin/marketplace.json`, the root `README.md`, and `conventionalCommits.scopes` list exactly the skills present under `suite/skills/`, and `node suite/scripts/check-marketplace-skills.mjs` passes.
- AC-13.2 `node suite/scripts/sync-shared-references.mjs` produces no diff after the manifest update.
- AC-13.3 `docs/` contains only `glossary.md`, `threads/`, and the lazily created `adr/` and `roadmaps/`; `docs/README.md`, `docs/thread-model.md`, `docs/skill-authoring.md`, and `docs/recipes/` do not exist, and their developer-facing content has a home under `suite/`.
- AC-13.4 `docs/glossary.md` defines ADR, thread log, plan, implementation, closing, delta, binding test, method, recipe, pipeline, step, stage, and thread artifact, and contains no method definition of `DR<N>`, round, feedback record, child brief, proposal, or reconcile.
- AC-13.5 The root `AGENTS.md` carries the human-written method section for this repository, names `docs/glossary.md` as the project glossary written through threads and the closing skill, and states the rewritten thread-identifier rule; no link into a removed `docs/` document remains in `AGENTS.md`, `README.md`, or `suite/`.
- AC-13.6 `grep -rn "no longer\|anymore\|unlike before\|previously" suite/ AGENTS.md README.md docs/glossary.md` returns no match that contrasts with the replaced design.

## Degrees of freedom

The following are left to the implementer; every admissible choice satisfies the acceptance criteria unchanged.

- The names of the two new skills (the closing skill, the plan check), the folder group each sits in under `suite/skills/`, and the corresponding Conventional Commits scopes.
- The exact wording of the ADR catalog command, provided it is a single shell command reading only frontmatter.
- The one-line header text of `log.md`, and the wording of the rule that adds a slug to a plan or implementation folder.
- Whether `update-implementation-report` keeps its name.
- The section headings and ordering inside each rewritten skill body and document, provided the required content is present and the inputs section is headed exactly `## Inputs`.
- Which artifacts beyond those named in `### Self-contained skills, inputs, and conflicts` earn a shared format reference, provided each format is authored in exactly one source and every artifact more than one skill touches has one.
- The name and location of the suite's method overview and of the developer-facing material under `suite/`.
- How the closing skill performs the semantic glossary merge, provided the loss check in AC-8.4 holds.
- Order of implementation across skills and documents.

## Risks and open items

- **Convention-only enforcement.** The rules against editing `log.md` with a tool, against subagent appends, against reading other threads, and against renaming a pinned roadmap slug are stated, not enforced. Accepted (per decisions.md DR3, DR28).
- **Optional close.** With no forcing function, an unclosed thread leaves its ADRs unlanded and its folder active. Accepted (per decisions.md DR5); `whats-next` and `finish` recommend closing.
- **Currency-check noise.** A closing skill whose check drifts from recorded deviations toward a general code review would block every real thread. The narrow scope in `### The closing skill` is the mitigation (per decisions.md DR27).
- **Format sync noise.** A format change lands as a diff in every skill folder that syncs it. Accepted (per decisions.md DR26).
- **Hand-maintained `AGENTS.md` section.** The living-documents list and the catalog command in a project's `AGENTS.md` depend on humans keeping them current. Accepted (per decisions.md DR9, DR26).
- **CLI drift.** Accepted (per decisions.md DR1); a later thread realigns the CLI.
