# Spec: Redesign the Antmay method and skill suite from the Leitspace field report

## Intended outcome

The Antmay method and the `suite/` skills are redesigned so that the failure modes documented in `leitspace-field-report.md` cannot recur by construction: a thread has exactly one design truth, decisions that outlive a thread have a project-level home with stable identifiers, historical material is separated from authoritative material mechanically rather than by annotation, downstream artifacts are derived from complete sources with at most one faithfulness check each, and a Roadmap is a coarse index that never goes stale against its children. When this spec is implemented, the `docs/` method reference, the skills under `suite/skills/`, the shared references under `suite/shared/`, and the repository's distribution and maintenance files describe and implement the redesigned method as the current state, with no trace of the replaced design.

## Context

The field report copied into this thread documents how the method behaved on a real application over thirteen days: the current truth leaked into four disagreeing places, roadmap briefs were wrong before the second child opened and the feedback channel was never read, agents could not tell historical from authoritative artifacts, artifacts restated each other and a reconcile family existed to fight that, and a non-thread artifact became authoritative by footnote. The report's section 3 lists what worked and must survive: a complete decision trail with rationale, superseding records rather than rewrites, the seed-to-report chain per thread, pending decisions and pending reviews, preflight refusals, and the terminal-outcome protocol.

Five research reports under `researches/` surveyed comparable toolkits. Their convergent findings drive this spec: every serious toolkit has a project-level durable layer; the infer-then-strip loop between a spec generator and a reconcile agent over a decisions-only log is information-theoretic, not a prompt defect; historical-versus-authoritative works by shrinking the authoritative surface, not by banners; and nobody writes downstream briefs up front.

Eighteen decisions in `decisions.md` settle the redesign. This spec is their handoff-grade projection. The CLI is excluded from this thread and may go stale against the suite (per decisions.md DR1).

## Scope and non-scope

**In scope**

- The method reference under `docs/`: `README.md`, `glossary.md`, `thread-model.md`, `skill-authoring.md`, the three recipe documents under `docs/recipes/`.
- Every skill under `suite/skills/`: new skills, changed skills, retired skills, as enumerated in `## Skill inventory`.
- Shared references under `suite/shared/references/` and the sync manifest `suite/shared/manifest.yaml`.
- Repository files that distribute or index the suite: `.claude-plugin/marketplace.json`, the root `README.md`, `conventionalCommits.scopes` in `.vscode/settings.json`, and `suite/AGENTS.md`.
- The root `AGENTS.md` rule about thread identifiers in code, which changes because ADR identifiers are citable (per decisions.md DR7).

**Out of scope**

- The `cli/` module in its entirety, including its stage catalog, `cli/README.md`'s stage support table, and `cli/src/pipeline/documentation.test.ts`. These may fail against the redesigned suite until a later thread realigns them (per decisions.md DR1). The root `AGENTS.md` rule requiring that table to be updated in the same change is explicitly suspended for this thread by DR1.
- Migration of existing threads in any project, including this repository's own `docs/threads/`. Threads opened under the previous method keep their layout; this thread itself keeps its `decisions.md` in the `DR<N>` shape until it finishes (per decisions.md DR2 point 6).
- Any tooling that enforces the method mechanically (hooks, filesystem permissions). Every rule in this spec is a convention realized through skill bodies and documentation.
- Whether the repository's `docs/` reference becomes the source the method skill is rendered from or shrinks to developer-facing material. DR13 leaves this open for implementation; see `## Risks and open items`.

## The redesigned method

Every rule below is the current state to be documented and implemented. Documentation written from this spec must describe this state as if the replaced design had never existed, per the root `AGENTS.md` rule "Describe the current state, never the diff".

### Thread layout

A thread is a folder `docs/threads/<YYMMDDHHMMSSZ-slug>/`; an archived thread lives under `docs/threads/archive/` with the same folder name. The layout separates design truth at the root from execution residue under `rounds/` (per decisions.md DR11):

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── seed.md                     eager; written once by the thread-opening operation
├── log.md                      eager; the thread's memory (DR3)
├── spec.md                     the thread's design truth once authored (DR2)
├── adr/                        thread ADR delta, lazy (DR6, DR7, DR10)
├── glossary.md                 thread glossary delta, lazy (DR6, DR9)
├── rounds/
│   └── <yymmddhhmm>-<slug>/    one folder per plan-then-implement pass (DR11)
│       ├── plan.md             brief plan, or strict-plan index
│       ├── plan-tasks/         strict plan only
│       ├── implementation-report.md
│       └── .implementation-runs/   gitignored
├── .pending-decisions/         gitignored
└── .pending-reviews/           gitignored
```

There is no `decisions.md`, no `proposal.md`, no `roadmap-feedback.md`, and no thread-level `plan.md` or `implementation-report.md`. The seed keeps its current two requirements (a title and a self-contained genesis narrative) and sparse metadata; a thread opened from a roadmap entry additionally references the roadmap index file and the entry it was opened from (per decisions.md DR18).

A round is one plan-then-implement sequence against the spec as it stands when the round opens. The first skill that writes into it creates it: normally a plan skill, or an implementation skill when the round has no plan. Every thread that implements anything has at least one round. Each round's `implementation-report.md` describes that round's outcome and carries a dedicated deviations section (per decisions.md DR8, DR11). There is no thread-level summary report: the spec is the current design and the code is the current outcome.

### The thread log

`log.md` is created eagerly by the thread-opening operation with a one-line header. It is memory, never truth (per decisions.md DR2 point 1, DR3):

- Each entry is one line of the form `- (type) gist with the reason folded in`. No identifiers, no timestamps; order in the file is the only structure.
- The vocabulary is fixed, identical in every skill, exactly seven types: `decision`, `constraint`, `assumption`, `question`, `capability`, `direction`, `event`. There is no catch-all type.
- Any skill that settles a point appends its line the moment the point settles, before acting on it. The write is blind: the log is never re-read during the session that writes it. It is read only when a session resumes after context loss and when the spec is authored.
- Append-only. A later entry supersedes an earlier one on the same point; history stays intact. A terminal moment is an `event` entry; there is no lifecycle status field.
- A skill appends by a shell append (`>>`) of a single line and never opens the file with a file-editing tool. One writer per session: a skill that fans out to subagents does all appending from the orchestrator.
- The log is never cited from any artifact and never read by planning, implementation, or review skills.

### The spec as design truth

`spec.md` is the single in-thread design truth (per decisions.md DR2):

- It is authored once by the `spec` skill, which the user invokes after the discussion (per decisions.md DR17). In the normal case the same session that ran the discussion invokes it, so the live conversation is the primary input; if the session was lost, a fresh session authors it from the log, which is complete enough to do so. Inputs: the live conversation when present, otherwise `log.md`; `seed.md`; the thread's `adr/` and `glossary.md`; and the project layer per the read order.
- Authoring includes one audit pass that walks the log claim by claim and confirms each landed. Anything the spec states that the log and seed do not support is labelled inline as an assumption or an open question, never deleted and never silently kept as settled. A spec is not complete while an open question remains.
- The spec cites the thread's ADRs where they are operative and does not restate them (per decisions.md DR6). Thread-local design that is not an ADR is written in the spec in full.
- After authoring, every change to the design amends `spec.md` in place: the superseded text is kept, marked as superseded, and annotated with the date and the reason; the same change is appended to the log as one line. Any skill that obtains a new human decision mid-run appends the log line and amends the spec before acting on it.
- No skill measures the spec against the log after authoring. A regenerated spec never replaces an authored one.
- The discussion skill writes no spec, does not hand off to the spec skill, and states no context budget or split rule; the user manages session context (per decisions.md DR17).

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

Living documentation (READMEs, architecture references, API docs, runbooks) stays in whatever shape the project chooses. The method defines no living-spec format and performs no structural merge. Living documentation changes within implementation scope, as part of the round that changes the behavior it describes (per decisions.md DR5).

The project's `AGENTS.md` carries, written by the project's humans and not by any skill: one line stating that the project follows the Antmay method and that the method skill is to be loaded before working under `docs/threads/`, `docs/adr/`, or `docs/glossary.md`; and the list of the project's authoritative living documents by path (per decisions.md DR9, DR13). Neither is a managed block, and no setup skill exists.

Identifiers (per decisions.md DR7): code, tests, commit messages, and living documentation may cite an ADR by its stem, never by path, and are never required to. Nothing thread-local (log entries, spec sections, plan tasks, round folders) is ever cited outside its thread. The `DR<N>` term exists only in threads opened under the previous method; the redesigned method has no thread-local decision numbering.

### Read order and conflicts

Every skill that reads context follows one order, stated in the method skill and honored by every skill (per decisions.md DR12, DR18):

1. The project layer: list the ADR catalog, open the relevant records, read the glossary.
2. The active thread: `spec.md`, the thread's `adr/` and `glossary.md`, and whichever round artifacts the skill needs.
3. Nothing else. No skill reads another thread's files. A thread opened from a roadmap entry reads the roadmap index at `docs/roadmaps/`, which is a project-level file, not a thread artifact (per decisions.md DR18). An archived thread is read only when the user names it in the invocation, and then as history, never as authority.

A contradiction between the thread's material and a project ADR or glossary term is **intentional**, and raised by no skill, when the thread's `adr/` holds a draft naming that ADR in `supersedes` or the thread's `glossary.md` redefines the term. Every other contradiction is an **unnoticed conflict**: an interactive skill puts it to the user; a completion-oriented skill queues a pending decision; no skill resolves it by overriding the project record. The user's confirmation that a change is intended is recorded by writing the superseding draft, which makes it intentional from then on.

### The method skill

One dedicated skill, invocable by the model on its own initiative, holds the method's common rules once (per decisions.md DR13): the thread layout, the read order, the ADR catalog command, the citation rule, the log and spec roles, the ADR file format and binding test, and the conflict rule. Every other skill:

- makes loading the method skill a hard step of its preflight;
- refers to the method skill for the common rules instead of restating them;
- keeps inline only the rules that protect artifacts if that load were skipped, above all its own write boundary.

### The closing skill

One dedicated skill closes a thread. It is the only writer of `docs/adr/`, `docs/glossary.md`, and, for the entry update below, `docs/roadmaps/`; every other skill reads them and states that boundary in its own body. It performs exactly four moves in order (per decisions.md DR5, DR7, DR9, DR10, DR18):

1. **Currency check.** Read every round's `implementation-report.md`, its deviations section first, and the delivered changes, against the spec's design claims and the thread's ADRs. Put every divergence to the human. From the answers, amend `spec.md` in place per the spec rules and edit the affected draft ADRs, appending the log lines. Refuse to proceed while a divergence is unresolved. If the human chooses to change the code rather than the spec, the skill stops so that a new round can run; it does not implement.
2. **ADR landing.** Move every file in the thread's `adr/` into `docs/adr/` unaltered. For each landed record whose `supersedes` names project ADRs, move those files into `docs/adr/superseded/`, content untouched, in the same act.
3. **Glossary merge.** Merge the thread's `glossary.md` into `docs/glossary.md` semantically; a term already present is updated to the thread's definition, and nothing present before the merge is lost.
4. **Archive.** Inspect the thread's temporary workspaces (`.pending-decisions/`, `.pending-reviews/`, every round's `.implementation-runs/`), name any non-empty contents, ask once whether to archive anyway, then move the thread into `docs/threads/archive/`, carrying the workspaces untouched. When the thread's seed references a roadmap index entry, update that entry in the index file with a one-line outcome and the thread's folder name before the move. No skill writes another thread's files under any circumstance.

No operation forces the closing skill to run; the thread-opening operation does not check for unclosed threads (per decisions.md DR5). The closing skill does not stage, commit, or push. `finish` keeps its branch-handoff scope and recommends closing the thread first so landed ADRs travel with the delivery.

### Planning, the plan check, and implementation

- **Plan skills** (`plan-brief`, `plan-strict`) read the spec per the read order and write into the current round, creating the round folder when it does not exist. Their existing end-of-authoring self-check is extended with a coverage rule modelled on the spec's audit: every acceptance criterion in the spec maps to at least one task, and a criterion the plan cannot cover is labelled as a gap for the human, never silently dropped and never satisfied by an invented task (per decisions.md DR15). Their accepted inputs are the thread's spec or a referenced artifact or prompt; `decisions.md` and `proposal.md` are not inputs.
- **Plan check.** One skill runs in a fresh context against the current round's plan with the spec as its sole authority (per decisions.md DR15). It corrects in place every fault that follows from the spec: a task contradicting the spec, an acceptance criterion no task covers, an ambiguous or wrong step, a wrong target path. It never removes implementation detail the plan added and never satisfies a gap by inventing a task. Anything it cannot fix from the spec becomes a pending decision. It edits only the round's plan artifacts.
- **Wrong ADR or spec decision discovered downstream** (per decisions.md DR8). During planning: queue a pending decision; planning does not proceed on it; resolving the bundle edits the draft ADR and amends the spec before planning resumes. During implementation: a deviation that stays within accepted intent proceeds and is recorded in the round report's deviations section, each entry naming what was built, the spec section or ADR stem it departs from, and why; a contradiction of a thread ADR or of a spec decision is a change of intent and is queued as a pending decision, ending the run blocked.
- **Implementation skills** (`implement`, `implement-plan`, `implement-plan-with-subagents`) read the spec and the round's plan per the read order, keep their run state under the round's `.implementation-runs/`, write the round's `implementation-report.md` with the deviations section, update living documentation within implementation scope, and never write `docs/adr/` or `docs/glossary.md`. They append log lines only from the orchestrator. They no longer append roadmap feedback; a parent-level discovery is a proposed ADR or a proposed roadmap entry surfaced to the user, never a silent write.
- **`update-implementation-report`** targets the current round's report and carries the deviations section.

### Pending decisions and their resolution

A pending-decision bundle (per decisions.md DR16) keeps a routing header naming the producing skill, the target, the originating request, the creation time, and the point count. Each point is half finding, half decision: what is blocked, why the producer could not derive the answer, and the evidence it weighed, in the producer's own words. A point may add a free-text suggestion when the producer sees an immediate fix; nothing requires one. A point carries no options, no recommendation, and no discussion-point structure. There is no bundle-level suggested-action paragraph.

`resolve-pending-decisions` frames each point as a discussion would, live with the user, and writes each settled point per the spec and delta rules: it appends the log line, amends `spec.md` in place with superseded text kept and dated, and writes or edits a draft ADR when the point is project-level (per decisions.md DR15). It writes no `DR<N>` record. It still removes settled points and deletes an emptied bundle.

The `emit-pending-decisions` primitive writes the reshaped bundle and nothing more.

### Roadmap

A Roadmap thread structures a larger direction. It is an ordinary thread (per decisions.md DR18): it discusses the direction, writes its ADRs and glossary entries in its delta, authors the roadmap index, and closes through the closing skill like any other thread, so its ADRs land in `docs/adr/` before any child opens.

- The index is a project-level file at `docs/roadmaps/<yymmddhhmm>-<slug>.md`, stamp in UTC at minute resolution, authored by the `roadmap` skill and edited in place by its owner (per decisions.md DR14, DR18). It holds the destination, ordered entries each with a stable identifier, a one-paragraph sketch, and a scope boundary; an out-of-scope list; and a not-yet-specified note for what cannot yet be seen. It carries no shared-constraints section, no statuses, no checkboxes, and no child briefs. Constraints on children are ADRs.
- No child thread is created up front. When the frontier reaches an entry, the user opens a thread with `open-thread`, whose seed references the index file and the entry. That thread runs a normal discussion against the project layer as it stands, and reads the index as a project-level file.
- An entry is pinned once a thread is opened from it; unstarted entries may be reordered, merged, or dropped by the owner.
- When a thread opened from an entry closes, the closing skill updates that entry in the index with a one-line outcome and the thread's folder name. This is a write to a project-level file within the closing skill's write authority; there is no cross-thread write.
- A direction-level discovery in a child travels as a superseding draft ADR in the child's `adr/`, landed at the child's close. A discovery implying new work is a proposed entry the user adds to the index.
- When the destination is reached or abandoned, the owner deletes the index; the outcome lives in the code, the ADRs, and the archived threads.
- The `roadmap` skill authors the index and no feedback file. `review-roadmap`, `materialize-roadmap-threads`, `reconcile-roadmap`, and `append-roadmap-feedback` do not exist.

### Reviews

`review-spec` stays, optional and read-only, aimed at whether the spec stands alone for a fresh agent. `review-implementation` and `review-code` are unchanged in mandate; they read per the read order and review the current round. Every review writes findings only; a review may flag a spec criterion as a finding and never edits it. `review-roadmap` is retired (per decisions.md DR15).

### Skill inventory

**New skills** (names are a degree of freedom; see `## Degrees of freedom`):

- The method skill (per decisions.md DR13), model-invocable.
- The closing skill (per decisions.md DR5).
- The plan check (per decisions.md DR15).

**Retired skills**, removed from `suite/skills/`, `marketplace.json`, the root `README.md`, and `conventionalCommits.scopes`: `propose`, `reconcile-proposal`, `reconcile-spec`, `reconcile-plan`, `reconcile-roadmap`, `review-roadmap`, `materialize-roadmap-threads`, `append-roadmap-feedback`, `archive-thread` (absorbed into the closing skill).

**Changed skills**: `open-thread` (creates `log.md`, not `decisions.md`; a seed opened from a roadmap entry references the index file and the entry), `allocate-thread` (same), `discussion` (appends log lines; writes draft ADRs and glossary entries with user confirmation; writes no `DR<N>` records; no spec, no handoff, no budget), `spec` (inputs and audit per `### The spec as design truth`; cites thread ADRs), `plan-brief`, `plan-strict`, `implement`, `implement-plan`, `implement-plan-with-subagents`, `update-implementation-report`, `emit-pending-decisions`, `resolve-pending-decisions`, `emit-pending-review` (round-aware target naming), `review-spec`, `review-implementation`, `review-code` (read order, round target), `roadmap` (writes the index at `docs/roadmaps/`, no feedback file), `finish` (readiness inspection covers rounds and recommends closing; offers no archive), `whats-next` (advises from the new layout; no feedback listing), `merge-artifacts` (targets the new layout), `open-ticket` (unchanged in mandate; read order).

Every remaining skill's body states the method-skill load in preflight, its own write boundary, and, where it reads context, that it follows the read order.

### Documentation and repository maintenance

- `docs/thread-model.md`, `docs/README.md`, `docs/glossary.md`, `docs/skill-authoring.md`, and the three recipe documents describe the redesigned method as current state. The Roadmap recipe describes an ordinary thread whose deliverable is the index at `docs/roadmaps/` plus its ADRs, and the lazy opening of threads from entries; the Standard and Quick recipes describe discussion, spec, rounds, and close; the glossary gains or fixes the terms ADR, thread log, round, closing, delta, binding test, read order, and retires `DR<N>`, feedback record, child brief, proposal, and reconcile as method terms. The root `AGENTS.md` rule on thread identifiers is rewritten to say that thread-local material is never cited outside its thread and that ADR stems may be.
- `suite/shared/references/`: `formats/decision-record.md` and `roadmap-descendant-feedback.md` are removed; `formats/discussion-point.md` stays for the discussion skill's transient framing; a format reference for the ADR file and one for the pending-decision bundle are added where more than one skill needs them; `manifest.yaml` is updated accordingly and `sync-shared-references.mjs` is rerun.
- `suite/AGENTS.md` describes the new layout, invocation roles, and composition; the "When adding a new skill" checklist is followed for each new skill and its inverse for each retired one. `check-marketplace-skills.mjs` passes.

## Constraints

- **CLI staleness is accepted** (per decisions.md DR1). No decision in this spec is constrained by the CLI's stage catalog, target resolution, or outcome protocol; `cli/README.md`'s stage table and `documentation.test.ts` may fail until a later thread.
- **Describe the current state, never the diff.** Every document and skill body written under this spec describes the redesigned method with no negation or contrast whose only referent is the replaced design.
- **Conventions are the enforcement.** No hook, script, or permission mechanism is introduced; DR3 forbids shipping a log-append script and DR9 forbids a listing script or index file.
- **Skill format.** Skills keep the existing `SKILL.md` frontmatter conventions (`name`, `description`, `metadata`, `disable-model-invocation` where user-invoked). The method skill is the one new skill without `disable-model-invocation: true`.
- **Terminal-outcome protocol and preflight refusals are preserved** for every completion-oriented skill: `REFUSED` before any artifact is written, `BLOCKED` with a pending bundle, `DONE` otherwise.
- **Write authority** as stated per skill: only the thread-opening operation writes `seed.md`; any settling skill appends `log.md`; the discussion, `resolve-pending-decisions`, and other settling skills write the thread's `adr/` and `glossary.md`; the spec skill and settling skills amend `spec.md`; plan skills and the plan check write the round's plan; implementation skills write the round's report and runs and living documentation; the closing skill alone writes `docs/adr/`, `docs/glossary.md`, a roadmap index entry under `docs/roadmaps/`, and performs the archive move; the `roadmap` skill alone creates an index file.
- **Vocabulary.** `docs/glossary.md` in this repository is the naming authority; every new term introduced by this spec is added there in the same change.
- **Commits.** Nothing in this spec authorizes a commit; the implementer follows the repository's Conventional Commits rules when the user asks.

## Acceptance criteria

**FR-1 Thread layout (DR11, DR3, DR6)**
- AC-1.1 `docs/thread-model.md` shows the layout in `### Thread layout` verbatim in structure: `seed.md`, `log.md`, `spec.md`, `adr/`, `glossary.md`, `rounds/<yymmddhhmm>-<slug>/{plan.md, plan-tasks/, implementation-report.md, .implementation-runs/}`, `.pending-decisions/`, `.pending-reviews/`.
- AC-1.2 `grep -rn "decisions.md\|proposal.md\|roadmap-feedback.md" docs/ suite/` returns no match outside `docs/threads/`, and `grep -rn "roadmap.md" docs/*.md docs/recipes suite/` matches only the recipe document's own filename and references to `docs/roadmaps/`.
- AC-1.3 `open-thread` and `allocate-thread` create `seed.md` and `log.md` eagerly and nothing else.

**FR-2 Thread log (DR3)**
- AC-2.1 The method skill lists exactly the seven entry types `decision`, `constraint`, `assumption`, `question`, `capability`, `direction`, `event` and the entry form `- (type) gist`.
- AC-2.2 Every skill that settles a point (`discussion`, `resolve-pending-decisions`, `spec`, the closing skill, the implementation skills) instructs a single-line shell append and forbids opening `log.md` with an editing tool.
- AC-2.3 `implement-plan-with-subagents` states that only the orchestrator appends to `log.md`.
- AC-2.4 No skill other than `spec` (and a resuming session) reads `log.md`; `grep -rln "log.md" suite/skills/*/*/SKILL.md` lists only skills whose mention is an append instruction or the spec skill's input.

**FR-3 Spec as design truth (DR2, DR17)**
- AC-3.1 The `spec` skill's inputs are the live conversation or `log.md`, `seed.md`, the thread's `adr/` and `glossary.md`, and the project layer; its body contains an audit step that labels unsupported claims as assumptions or open questions and forbids deleting them.
- AC-3.2 The `spec` skill states that it cites thread ADRs and does not restate them.
- AC-3.3 The method skill states the in-place amendment rule: superseded text kept, marked, dated, with reason, plus a log line.
- AC-3.4 No skill named `reconcile-spec` exists, and no skill body describes measuring the spec against the log after authoring.
- AC-3.5 The `discussion` skill body contains no spec-writing step, no handoff to `spec`, and no context budget.

**FR-4 Thread ADR delta (DR6, DR7, DR10)**
- AC-4.1 The `discussion` skill proposes an ADR when a settled point passes the binding test as worded in `### The thread's ADR and glossary delta`, requires user confirmation of the text, and accepts a direct user request for one.
- AC-4.2 The ADR format reference specifies the file name `<yymmddhhmm>-<slug>.md`, UTC minute stamp, frontmatter keys `name`, `description`, optional `supersedes`, no status key, and the required body content (context, decision, reason) with free form.
- AC-4.3 The method skill states that a thread ADR is authoritative within the thread from creation, is a draft editable in place until close, and that its stem never changes.
- AC-4.4 The `discussion` and `resolve-pending-decisions` skills also write glossary entries to the thread's `glossary.md`.

**FR-5 Project layer (DR4, DR7, DR9)**
- AC-5.1 The method skill fixes `docs/adr/`, `docs/adr/superseded/`, `docs/glossary.md`, and `docs/roadmaps/` as the layer's paths and states they are created lazily.
- AC-5.2 The method skill contains a single shell command that prints stem, `name`, and `description` for every file in `docs/adr/`, and no skill creates or maintains an index file or a script.
- AC-5.3 The method skill states the citation rule: ADR stems may be cited from code, tests, commits, and living docs, never by path and never required; thread-local material is never cited outside its thread.
- AC-5.4 The method skill states the two human-written `AGENTS.md` items (the pointer line and the living-documents list) and that no skill writes them.
- AC-5.5 `grep -rn "DR<N>\|bare \`DR" AGENTS.md docs/*.md suite/` shows the root `AGENTS.md` rule rewritten per `### Documentation and repository maintenance` and no other occurrence outside `docs/threads/`.

**FR-6 Read order and conflicts (DR12, DR18)**
- AC-6.1 The method skill states the three-step read order verbatim in substance and the archived-thread rule.
- AC-6.2 The method skill defines an intentional contradiction by the `supersedes` key or a glossary redefinition, and the surfacing rule for unnoticed conflicts (interactive: ask; completion-oriented: pending decision; never override).
- AC-6.3 Every skill that reads context references the read order and none lists another thread's artifacts as an input; a roadmap index under `docs/roadmaps/` is the only non-thread, non-ADR, non-glossary input any skill names.

**FR-7 Method skill (DR13)**
- AC-7.1 A skill exists under `suite/skills/` without `disable-model-invocation: true` whose body holds the common rules enumerated in `### The method skill`.
- AC-7.2 Every other skill's preflight names loading the method skill as a hard step.
- AC-7.3 No other skill restates the read order, the layout, the log vocabulary, the ADR format, or the conflict rule; each states its own write boundary inline.
- AC-7.4 No setup skill exists and no skill writes the project's `AGENTS.md`.

**FR-8 Closing skill (DR5, DR7, DR9, DR18)**
- AC-8.1 The closing skill body performs the four moves in the order currency check, ADR landing, glossary merge, archive, and refuses to proceed past the currency check while a divergence is unresolved.
- AC-8.2 The closing skill moves `adr/*` into `docs/adr/` unaltered and moves each project ADR named in a landed record's `supersedes` into `docs/adr/superseded/` with content untouched.
- AC-8.3 The closing skill states that nothing present in `docs/glossary.md` before the merge is absent after it.
- AC-8.4 The closing skill inspects the temporary workspaces, asks once, and carries them untouched into `docs/threads/archive/`.
- AC-8.5 The closing skill updates the referenced entry in `docs/roadmaps/<index>.md` when the seed references one, and no skill body writes another thread's files.
- AC-8.6 The closing skill does not stage, commit, or push, and `open-thread` contains no check for unclosed threads.
- AC-8.7 No skill named `archive-thread` exists, and `finish` recommends the closing skill and offers no archive action.

**FR-9 Rounds, plans, plan check, implementation (DR8, DR11, DR15)**
- AC-9.1 `plan-brief` and `plan-strict` write into `rounds/<yymmddhhmm>-<slug>/`, create the folder when absent, list only the spec or a referenced artifact or prompt as inputs, and carry the coverage rule with its label-never-invent clause.
- AC-9.2 A plan-check skill exists whose sole authority is the spec, whose edit target is the current round's plan artifacts, whose body forbids removing plan-added detail and inventing tasks, and which queues a pending decision for anything it cannot fix from the spec.
- AC-9.3 No skill named `reconcile-plan` or `reconcile-proposal` exists; no skill named `propose` exists.
- AC-9.4 Each implementation skill writes `implementation-report.md` inside the round with a deviations section whose entries name what was built, the spec section or ADR stem departed from, and why; keeps runs under the round's `.implementation-runs/`; and states that a contradiction of a thread ADR or spec decision is queued as a pending decision.
- AC-9.5 No implementation skill references roadmap feedback; `suite/shared/references/roadmap-descendant-feedback.md` does not exist and is absent from `manifest.yaml`.
- AC-9.6 `update-implementation-report` targets the round's report and includes the deviations section.

**FR-10 Pending decisions (DR16, DR15)**
- AC-10.1 The pending-decision bundle format specifies the routing header fields (producer, target, originating request, creation time, point count) and a point consisting of blocker, reason it could not be derived, evidence, and an optional free-text suggestion; it contains no options, recommendation, or suggested-action paragraph.
- AC-10.2 `emit-pending-decisions` writes that shape and nothing else.
- AC-10.3 `resolve-pending-decisions` frames each point live, and for each settled point appends a log line, amends `spec.md` in place, and writes or edits a draft ADR when project-level; its body contains no `DR<N>` record writing.
- AC-10.4 `suite/shared/references/formats/decision-record.md` does not exist and is absent from `manifest.yaml`.

**FR-11 Roadmap (DR14, DR18)**
- AC-11.1 The `roadmap` skill writes `docs/roadmaps/<yymmddhhmm>-<slug>.md` with destination, identified entries each with a one-paragraph sketch and scope boundary, out-of-scope list, and not-yet-specified note, and writes no shared-constraints section, statuses, child briefs, or feedback file.
- AC-11.2 `docs/recipes/roadmap.md` states that the Roadmap thread closes like any thread before entries are worked, that threads are opened by the user from an entry when the frontier reaches it, that entries are pinned on open, that the closing skill updates the entry, and that the owner deletes the index when the destination is reached.
- AC-11.3 No skill named `materialize-roadmap-threads`, `append-roadmap-feedback`, `reconcile-roadmap`, or `review-roadmap` exists.
- AC-11.4 `open-thread` accepts a roadmap index file and entry reference and writes both into the seed.

**FR-12 Reviews (DR15)**
- AC-12.1 `review-spec`, `review-implementation`, and `review-code` exist, read per the read order, target the current round where applicable, and write findings only.

**FR-13 Distribution and maintenance**
- AC-13.1 `.claude-plugin/marketplace.json`, the root `README.md`, and `conventionalCommits.scopes` list exactly the skills present under `suite/skills/`, and `node suite/scripts/check-marketplace-skills.mjs` passes.
- AC-13.2 `node suite/scripts/sync-shared-references.mjs` produces no diff after the manifest update.
- AC-13.3 `docs/glossary.md` defines ADR, thread log, round, closing, delta, binding test, and read order, and contains no method definition of `DR<N>`, feedback record, child brief, proposal, or reconcile.
- AC-13.4 `grep -rn "no longer\|anymore\|unlike before\|previously" docs/*.md docs/recipes/ suite/skills suite/shared suite/AGENTS.md AGENTS.md` returns no match that contrasts with the replaced design.

## Degrees of freedom

The following are left to the implementer; every admissible choice satisfies the acceptance criteria unchanged.

- The names of the three new skills (the method skill, the closing skill, the plan check), the folder group each sits in under `suite/skills/`, and the corresponding Conventional Commits scopes.
- The exact wording of the ADR catalog command, provided it is a single shell command reading only frontmatter.
- The one-line header text of `log.md` and the wording of the round-folder slug rule.
- The section headings and ordering inside each rewritten skill body and document, provided the required content is present.
- Whether ADR and pending-decision formats live as shared references synced into skills or as skill-local references, provided each format is authored in exactly one source.
- How the closing skill performs the semantic glossary merge, provided the loss check in AC-8.3 holds.
- Order of implementation across skills and documents.

## Risks and open items

- **`docs/` versus the method skill as the method's source** (per decisions.md DR13, explicitly open). Two documents would otherwise state the same rules. Before restructuring `docs/`, the implementer queues a pending decision offering the two shapes; until it is settled, `docs/` is updated to describe the redesigned method and the method skill is written from it.
- **Convention-only enforcement.** The rules against editing `log.md` with a tool, against subagent appends, and against reading other threads are stated, not enforced. This is accepted (per decisions.md DR3).
- **Optional close.** With no forcing function, an unclosed thread leaves its ADRs unlanded and its folder active. Accepted (per decisions.md DR5); `whats-next` and `finish` recommend closing.
- **CLI drift.** Accepted (per decisions.md DR1); a later thread realigns the CLI.
