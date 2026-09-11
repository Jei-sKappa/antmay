# The Antmay method

Antmay is a thread-based method for Spec Driven Development. It carries one unit
of work from a rough idea to shipped code through reviewable Markdown artifacts
on disk, and it ships a suite of independently invokable skills that perform the
steps of that path.

## What the method is

**One unit of work lives in one thread.** A thread is a folder on disk that
holds everything a single change or direction settled: why it exists, what was
decided, what the design is, how it was planned, and what was delivered. Nothing
about a thread lives in a tool's database or in a chat transcript.

**Intent is written down before it is built.** The thread talks its way to a
settled design, writes that design as the thread's one truth, plans against that
truth, and implements against the plan. Each artifact is plain Markdown a person
can read, review, and correct at any point.

**The design truth is singular.** A thread has exactly one place that says what
is currently intended — its `spec.md` — and exactly one place that remembers how
it got there — its `log.md`. Decisions that outlive the thread leave it entirely
and become project-level records.

**Conventions guide; they never govern.** There is no evaluator, obligation
graph, state machine, or enforcement engine anywhere in the suite. A recipe is a
recommendation the user follows, adapts, or departs from at will. Skipping a
suggested step, adding an unlisted one, or running the steps out of order never
makes a thread invalid or in need of reclassification. Where a departure changes
intent worth keeping, it becomes an ordinary record; minor adaptation needs no
bookkeeping at all.

**Recipes describe how you want to work, not what the work is about.** Nothing
routes a bug, feature, refactor, security change, or documentation effort to a
recipe by its subject. A bug may use Quick or Standard; a large documentation
effort may use Roadmap. The suite predefines no investigation, bugfix, audit,
security, or documentation-only category.

## Thread layout

A thread is a folder `docs/threads/<YYMMDDHHMMSSZ-slug>/`, where the stamp is its
opening time in UTC. An archived thread lives under `docs/threads/archive/` with
the same folder name. Design truth sits at the thread root; execution lives in
stamped folders beneath it:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── seed.md                          eager; written once when the thread opens
├── log.md                           eager; the thread's memory
├── spec.md                          the thread's design truth once authored
├── adr/                             thread ADR delta, lazy
├── glossary.md                      thread glossary delta, lazy
├── plans/
│   └── <yymmddhhmm>[-<slug>]/       one folder per plan
│       ├── plan.md                  brief plan, or strict-plan index
│       └── plan-tasks/              strict plan only
├── implementations/
│   └── <yymmddhhmm>[-<slug>]/       one folder per implementation
│       ├── report.md                that implementation's outcome, with a deviations section
│       └── .runs/                   gitignored run state
├── .pending-decisions/              gitignored
└── .pending-reviews/                gitignored
```

**The seed.** `seed.md` is written once, when the thread opens, by the
thread-opening operation alone. It carries a title and a self-contained genesis
narrative explaining what triggered the work and its intended outcome, so a
reader who was not there knows why the thread exists. Metadata is sparse and
contextual: a field appears only when it carries real information — an
`External:` line when a tracker ticket is linked, the roadmap index path and
entry slug when the thread was opened from a roadmap entry. The folder stamp
records the opening time, so the seed does not repeat it, and the seed carries
no owner, status, or recipe name.

**The log.** `log.md` is the thread's memory, and never its truth. It is created
with a one-line header when the thread opens, and every skill that settles a
point appends one line the moment it settles, before acting on it. Each entry is
one line of the form `- (type) gist with the reason folded in` — no identifiers,
no timestamps, order in the file the only structure. The vocabulary is exactly
seven types: `decision`, `constraint`, `assumption`, `question`, `capability`,
`direction`, `event`; there is no catch-all. The file is append-only, so a later
entry supersedes an earlier one on the same point and the history stays intact,
and a terminal moment is an `event` entry rather than a status field. The log has
exactly two readers: the `discussion` skill reads it once at session start when
it has entries, and the `spec` skill reads it as an input when the live
conversation is gone and again, from the last spec `event` line onward, during an
amendment pass. No planning, implementation, review, or closing skill reads it,
and no artifact cites it.

**The spec.** `spec.md` is the thread's single design truth. The `spec` skill
authors it once, after the discussion — normally from the live conversation of
the same session, and from the log when that session is gone. Authoring includes
an audit pass that walks the thread's material claim by claim: anything the spec
states that the thread did not settle is labelled inline as an assumption or an
open question rather than deleted or quietly kept, and a spec with an open
question is not finished. The spec cites the thread's ADRs where they are
operative instead of restating them, and writes out in full every piece of
thread-local design no record carries, the thread's direction included. After
authoring, every change to the design amends the file in place: the superseded
text stays, marked as superseded and annotated with the date and the reason, and
the same change is appended to the log as one line.

**The delta.** A thread carries a delta of the project layer in `adr/` and
`glossary.md`, both created lazily. A settled point earns an ADR when it passes
the **binding test**: a later thread could build against it incorrectly if not
told, and could not read it off the code. When a point passes that test, the
discussing agent proposes a record and the user confirms or redirects its text
before it is written; the user may also ask for one directly, and every skill
that settles a project-level point mid-thread does the same. New or changed
project terms go to the thread's `glossary.md` the same way. A record in the
thread's `adr/` is a draft, authoritative for that thread from the moment it is
written, and editable in place until the thread closes — the only in-place
editing of a record the method permits. The whole delta lands in the project
layer when the thread closes.

**Plans and implementations.** Each is one folder per pass, stamped
`<yymmddhhmm>` at UTC minute resolution, with an optional slug added when the
invocation names a purpose or when a folder with that stamp already exists. A
plan skill writes a new folder under `plans/` on every invocation: a brief plan
is contained entirely in its `plan.md`, and a strict plan uses `plan.md` as its
index and adds dispatchable briefs under `plan-tasks/`. An implementation skill
creates a new folder under `implementations/` on every invocation, unless the
invocation says explicitly to continue, which reuses the newest one. Each
implementation folder holds one `report.md`, written at every terminal outcome,
whose header names the plan folder executed or states that none was used and
whose deviations section records each departure — what was built, the spec
section or ADR stem it departs from, and why. There is no thread-level plan and
no thread-level report: the spec is the current design and the code is the
current outcome.

**The workspaces.** `.pending-decisions/` and `.pending-reviews/` are gitignored
folders that hold thread-local operational state, each created on demand, and
`.runs/` inside an implementation folder holds that implementation's run state.
They carry communication between runs, not durable record; a thread with none of
them present has nothing waiting.

## The project layer

The method owns four paths in every project. All of them are created lazily, by
the operation that first needs to write one, and none is ever a prerequisite for
starting work:

- `docs/adr/` — the current project ADRs. These files are the whole
  authoritative surface for project-level decisions.
- `docs/adr/superseded/` — records that have been superseded or retired.
- `docs/glossary.md` — the project's terms.
- `docs/roadmaps/<yymmddhhmm>-<slug>.md` — one roadmap index per direction.

**The ADR file.** One record, one file, named `<yymmddhhmm>-<slug>.md`. Its stem
— the filename without its extension — is the record's global identifier,
assigned when the record is first written into a thread's `adr/`, and it never
changes; closing the thread moves the file unaltered. The file opens with YAML
frontmatter carrying `name` (a short title written as a full decision sentence),
`description` (one sentence for the catalog), and optionally `supersedes` (the
stems of the project records this one replaces or retires). There is no status
key: location is the status. The body is free in form and required in content —
the context needed to understand the decision without the thread, the decision
in full, and the reason. `docs/adr/` carries no index file; a single shell
command prints the catalog of stems, names, and descriptions straight from the
frontmatter. That command, and the full record format, ship inside every skill
that reads or writes a record, as `references/formats/adr.md`.

**Living documentation.** READMEs, architecture references, API docs, and
runbooks stay in whatever shape the project chose. The method defines no
living-spec format and performs no structural merge into one. Living
documentation is project-owned and changes within implementation scope, as part
of the implementation that changes the behavior it describes.

**Citing.** Code, tests, commit messages, and living documentation may cite an
ADR by its stem, never by path, and are never required to cite one at all.
Thread-local material — log entries, spec sections, plan tasks, plan and
implementation folders — is never cited outside its thread, because a thread's
own identifiers do not survive the move to the archive and mean nothing to a
reader who is not in that thread.

**The project's `AGENTS.md`.** A project carries a short method section in its
own `AGENTS.md`, for sessions that run without invoking any Antmay skill. It
holds pointers to `docs/adr/` and `docs/glossary.md`, the ADR catalog command,
and the list of the project's authoritative living documents by path. That
section is written by the project's humans and by no skill; it is not a managed
block, and no setup skill exists to create or refresh it.

## The lifecycle

A thread runs from open to close. Each step is a skill the user invokes
deliberately; nothing runs on its own initiative.

1. **Open** — `open-thread` creates the thread folder, writes `seed.md` from the
   handshake, and creates `log.md`. Given a roadmap index path and an entry slug
   it records both in the seed.
2. **Discuss** — `discussion` settles the open questions. It appends a log line
   the moment each point settles, writes draft ADRs and glossary entries into the
   thread's delta with the user's confirmation, and raises any contradiction with
   an existing project record. It writes no spec.
3. **Spec** — `spec` authors the thread's design truth, or amends an authored one
   in place, and appends an `event` line each time it does. `review-spec` is an
   optional read-only check on whether the spec stands alone for a fresh agent.
4. **Plan and check** — `plan-brief` or `plan-strict` writes a new plan folder
   from the spec. `check-plan` then runs in a fresh context against the newest
   plan, or a named one, with the spec as its sole authority: it corrects in
   place every fault that follows from the spec — a task contradicting it, an
   acceptance criterion no task covers, an ambiguous step, a wrong target path —
   without removing detail the plan added and without inventing a task to fill a
   gap.
5. **Implement** — `implement`, `implement-plan`, or
   `implement-plan-with-subagents` creates a new implementation folder, delivers
   the change, updates the living documentation the change affects, and writes
   that folder's `report.md`. When a new implementation targets a plan that
   earlier reports already name, it reads those reports and verifies against the
   code before treating a task as done.
6. **Review** — `review-implementation` and `review-code` are optional,
   read-only, and aimed at the newest implementation unless one is named. A
   review writes findings and edits nothing.
7. **Finish** — `finish` inspects readiness, recommends closing the thread first
   so its landed records travel with the delivery, and offers the branch
   dispositions for handing the work off.
8. **Close** — `close-thread` ends the thread. Before its first write it runs a
   currency check scaled to what the thread holds, a landing preflight over every
   draft record, a check that the roadmap entry the seed names exists, and a
   workspace check. Once the checks pass it moves the thread's `adr/` files into
   `docs/adr/` unaltered, moves every record they supersede into
   `docs/adr/superseded/`, merges the thread's `glossary.md` into
   `docs/glossary.md`, writes the outcome beneath the roadmap entry's heading
   when the seed names one, appends the closing `event` line, and moves the
   thread into `docs/threads/archive/`. It alone writes `docs/adr/` and
   `docs/glossary.md`, and it alone writes an outcome beneath a roadmap entry;
   apart from the index `roadmap` authors, every other skill only reads the
   project layer. It does not stage, commit, or push.

`whats-next` reads the thread as it stands at any moment and advises what to
reach for next.

**Two queues.** Work that cannot finish leaves something behind rather than
waiting in chat. `.pending-decisions/` holds bundles of genuine missing human
intent: a completion-oriented skill first finishes everything it can safely
derive, then queues the irreducible judgment and stops. `resolve-pending-decisions`
works through a bundle live with the user and writes each settled point where it
belongs — a log line, an in-place spec amendment, a draft record when the point
is project-level — then removes the settled points and deletes the emptied
bundle. `.pending-reviews/` holds review findings: a review that finds nothing
actionable returns a concise pass in chat and writes no file, and a bundle that
is written is an ordinary self-contained input any capable agent can be asked to
address. Neither queue is a status system, and neither opens an automatic loop.

**Terminal outcome.** Every completion-oriented skill ends its final chat message
with one line, `Outcome: <TOKEN> — <one-line reason or pointer>`, whose
vocabulary is closed to three tokens. `DONE` means the skill completed its
requested job, non-blocking concerns included; a review that emitted a findings
bundle is `DONE`. `BLOCKED` means substantive execution started and then stopped
— it queued missing intent, or it hit an operational defect it could not repair.
`REFUSED` means a preflight prevented the run from starting at all: an unresolved
thread or target, an unmet prerequisite, or a failed safety gate, with no
artifact written.

**Historical against living.** Thread artifacts — the seed, the log, the spec,
the plans, the reports — record how one change was understood and delivered at a
particular moment. They are not the current description of the product. The
project's current description lives in its code, its ADRs, its glossary, and its
living documentation, all of which evolve across threads.

**Branches.** The method defines no thread-to-branch mapping. Thread identity
lives entirely in the thread folder. No skill creates, switches, or names a
branch on its own initiative; implementation commits land on the current branch
as found, and the branch disposition at delivery is the user's choice. Working
directly on the default branch, one branch per thread, and one branch across
several threads are all equally fine.

**External references stay passive.** Supplying a tracker ticket authorizes a
skill to read it for context and to record its URL in the seed. It authorizes no
comment, transition, or closure. A tracker write requires explicit user intent
and is offered by the operation the user invoked for that purpose — filing a
ticket from a rough idea, or linking and closing one at delivery — which
confirms the specific write before performing it. A decline leaves the tracker
untouched.

## The three recipes

A recipe is a documented composition over the skills: a named, human-readable
path a person follows. Composition lives here, in documentation, not in
orchestration hidden inside a skill, and the same skill is reused across recipes
without renamed copies.

### Quick

The smallest delivery path for one change, for work whose direction is already
clear enough that a full spec and a prescriptive plan would cost more than they
return.

1. Open the thread with `open-thread`.
2. Discuss the change with `discussion` if clarification is needed. *(optional)*
3. Write the thread's design truth with `spec` if the change deserves one. *(optional)*
4. Write a brief implementation plan with `plan-brief` if useful. *(optional)*
5. Implement the change with `implement`, which writes its own folder under `implementations/`.
6. Review the delivered work with `review-implementation` if the risk warrants it. *(optional)*
7. Review the code quality with `review-code` if the risk warrants it. *(optional)*
8. Finish the thread with `finish` and choose how to handle the branch.
9. Close the thread with `close-thread`.

A Quick thread that turns out to need the fuller treatment grows into Standard in
place, in the same thread: write the spec, then plan and check against it.

### Standard

The normal spec-driven path for one change, for work substantial enough that
writing down what to build — and checking that the plan stays faithful to it —
earns its ceremony.

1. Open the thread with `open-thread`.
2. Discuss the change with `discussion` to settle open questions.
3. Write the thread's design truth with `spec`.
4. Review the specification with `review-spec` before downstream work. *(optional)*
5. Produce the plan with `plan-strict`, or with `plan-brief` when the work fits on one screen.
6. Check the plan against the specification with `check-plan`.
7. Implement the plan with `implement-plan`.
8. Review the delivered work with `review-implementation` if the risk warrants it. *(optional)*
9. Review the code quality with `review-code` if the risk warrants it. *(optional)*
10. Finish the thread with `finish` and choose how to handle the branch.
11. Close the thread with `close-thread`.

Steps 5 to 7 may run more than once in one thread. Each further plan is a new
folder under `plans/`, and each further implementation is a new folder under
`implementations/`.

### Roadmap

A Roadmap thread structures a larger direction. It is an ordinary thread whose
deliverable is the index at `docs/roadmaps/` plus the ADRs the direction rests
on, and it authors no spec unless its owner wants one.

1. Open the thread with `open-thread`.
2. Discuss the direction with `discussion`, settling its constraints as draft ADRs and glossary entries in the thread's delta.
3. Author the index at `docs/roadmaps/<yymmddhhmm>-<slug>.md` with `roadmap`.
4. Finish the thread with `finish` and choose how to handle the branch.
5. Close the thread with `close-thread`.

The Roadmap thread closes like any other thread, before any entry is worked, so
the direction's records land in `docs/adr/` and bind every thread that follows.

The index holds the destination, ordered entries, an out-of-scope list, and a
note for what cannot yet be seen. Each entry is a heading whose text is a short
kebab-case slug unique within the index, followed by a one-paragraph sketch and a
scope boundary; the slug is the entry's identifier. The index carries no shared
constraints, no statuses, and no checkboxes — constraints on the work ahead are
ADRs.

No thread is created up front. When the frontier reaches an entry, the user opens
a thread for it with `open-thread`, giving the index path and the entry's slug,
which the seed records; that thread then follows the Quick or the Standard
recipe against the project layer as it stands. An entry is **pinned** once a
thread has been opened from it, and its slug is never renamed after that;
unstarted entries may still be reordered, merged, or dropped by the owner, and
merging two keeps one slug and drops the other. When such a thread closes,
`close-thread` writes a one-line outcome and the thread's archive folder name
beneath that entry's heading. A discovery that changes the direction travels as a
superseding draft record in the thread that found it; a discovery implying new
work is an entry the user adds to the index. When the destination is reached or
abandoned, the owner deletes the index — the outcome lives in the code, the ADRs,
and the archived threads.

### Admitting a future recipe

A fourth recipe is added only when actual use demonstrates all three of the
following, none of which is a subject label:

1. a **distinct purpose** that the existing recipes do not already serve;
2. a **durable artifact structure** genuinely different from the artifacts an
   existing recipe produces; and
3. a **natural completion shape** — a final deliverable that would be distorted
   if expressed as a variant of an existing recipe.

A candidate that merely renames an existing path for a particular kind of subject
does not qualify.
