# Glossary

This is the project glossary of the `antmay` repository and its naming
authority: every term below has exactly one meaning across the skill suite, the
CLI, and this repository's documents. Where a term also has an ordinary English
sense, the entry says which sense is reserved and what to write instead.

A term's full rules live in the document that owns the concept — the artifact
formats under [`suite/shared/references/formats/`](../suite/shared/references/formats/),
the authoring conventions under [`suite/authoring/`](../suite/authoring/), the
user-facing overview in [`README.md`](../README.md), or the CLI's
[`cli/README.md`](../cli/README.md) — and this glossary points there.

## The method and its shape

| Term | Meaning |
| --- | --- |
| **Antmay** | The whole thing this repository provides: a thread-based method for Spec Driven Development, the skill suite that supports it, and the CLI that automates it. |
| **the Antmay method** | The way of working itself — carrying a unit of work from a rough idea to shipped code through reviewable Markdown artifacts in a thread. Singular and uncountable. Use this where the whole approach is meant, never "the Antmay workflow". |
| **Spec Driven Development (SDD)** | The broader practice the method serves: deciding and writing down what to build before building it, so the written intent — not a chat log — is what downstream work reads. |
| **suite** | The installable set of skills under `suite/`, the reference implementation of the method. One coherently installed set, never a partial mix. |
| **CLI** | The `antmay` executable under `cli/`, which runs a pipeline unattended against one thread. |
| **suite/CLI contract** | The only coupling between the two modules: the skill names a pipeline invokes and the terminal-outcome protocol it classifies. They share no files, so breaking this contract changes no path in the other module — which is what makes it worth naming. `[contract]` is its issue-title scope prefix ([CONTRIBUTING.md](../CONTRIBUTING.md)). |

## Threads and artifacts

| Term | Meaning |
| --- | --- |
| **thread** | One unit of work at one moment, as a durable folder `.work/threads/yyyy/mm/dd-hhmm-slug/`; the thread's identifier is that path relative to `.work/threads/`. The method's central object. [suite/shared/references/formats/thread.md](../suite/shared/references/formats/thread.md) |
| **unit of work** | The scope one thread covers: a single coherent change, or a single direction to structure. |
| **thread artifact** | A durable file inside a thread recording how one change was understood and delivered at a moment — the seed, the log, the spec, a plan, an implementation's report. Historical by nature. Use this where the artifact domain is meant, in contrast to source code. |
| **seed** | `seed.md`, written once when the thread opens: a title, the genesis narrative, and sparse metadata. |
| **genesis narrative** | The seed's account of what triggered the work and its intended goal, meant to stand on its own without chat history, carried by up to two sections — `## Ticket` and `## Intent` — at least one of which is always present. |
| **ticket section** | The seed's `## Ticket` section: the linked ticket's body with its content unchanged and every line quote-prefixed, present only when the thread was opened from a ticket. |
| **intent section** | The seed's `## Intent` section: the work restructured from what the invocation supplied — the user's prose, their addition on top of a ticket, or a roadmap entry's sketch and scope boundary — written impersonally and never carrying material the agent added on its own. |
| **thread log** | `log.md`, the thread's append-only memory: `discussion` and `resolve-pending-decisions` record settled points, `spec` records authoring events, and `close-thread` records successful closure; later entries supersede earlier ones on the same point while history remains intact. |
| **log entry** | One line of the thread log, of the form `- (type) gist with the reason folded in`. It carries no identifier and no timestamp; order in the file is its only structure. |
| **log entry type** | The single word that opens a log entry, from a closed vocabulary of exactly seven: `decision`, `constraint`, `assumption`, `question`, `capability`, `direction`, `event`. |
| **rejected alternative** | An option someone argued against before a point settled, recorded inside that point's `decision` log entry; the trigger is the argument rather than the mention, so an option merely presented, compared, or left unselected is not one, whatever its provenance. |
| **assumption** | Something the user and the agent take as true without confirmation, recorded as a log entry of type `assumption` by a skill that settles points with the user, and which later work may need to revisit. |
| **spec** | `spec.md`, the thread's single design truth once authored — complete enough that a downstream planner or implementer needs no conversational context. Every later change amends it in place, keeping the superseded text marked, dated, and given a reason. |
| **inference** | A point the agent settles alone because it follows from the settled points or has one plainly sensible answer, non-binding until the spec pins it; it appears in the discussion's closure list, where the user may promote it to a fork, and in the spec's `## Inferences` section, whether the discussion listed it or the spec agent found it while writing. |
| **degree of freedom** | A *how* the spec deliberately leaves open to the implementer, listed in the spec's `## Degrees of freedom` section; every admissible choice satisfies the acceptance criteria unchanged, none produces a user-visible difference the user would want to weigh in on, and any is reversible without revising the spec. |
| **plan** | One folder `plans/<yymmddhhmm>[-<slug>]/` holding one prescriptive implementation plan. A **brief plan** is contained entirely in its `plan.md`; a **strict plan** uses `plan.md` as an index plus one dispatchable task brief per task under `plan-tasks/`. |
| **implementation** | One folder `implementations/<yymmddhhmm>[-<slug>]/` holding one execution of the work: its `report.md` and its run state under `.runs/`. |
| **implementation report** | `report.md` inside one implementation folder: what that implementation delivered, with a header naming the plan folder it executed or stating that none was used, and a deviations section whenever there is a deviation to record. [suite/shared/references/formats/implementation-report.md](../suite/shared/references/formats/implementation-report.md) |
| **closing report commit** | The single commit an auto-committing implement run makes on its way out, carrying that run's `report.md` alone and standing outside the code commit cadence. |
| **deviation** | One entry in a report's deviations section, naming what was built, the spec section or ADR stem it departs from, and why. A deviation stays within accepted intent; a contradiction of a thread ADR or a spec decision is a change of intent and becomes a pending decision instead. |
| **judgment call** | A choice an implementer makes where the spec pins nothing, inside a granted degree of freedom or in the spec's silence; distinct from a deviation, which departs from something pinned. |
| **delta** | The thread's own `adr/` and `glossary.md`: the project-level records drafted inside the thread, authoritative within it from the moment they are written, and merged into the project layer at close. |
| **closing** | The operation that ends a thread by checking it, landing its delta into the project layer, writing the closing line beneath its roadmap entry when one exists, and appending the closing event to its thread log; the folder stays where it is. |
| **final deliverable** | What a completed *thread* leaves behind: the code it delivered, the records its delta landed, and its own artifacts in place. Distinct from a terminal outcome. |

## The project layer

| Term | Meaning |
| --- | --- |
| **project layer** | What the method owns at fixed paths in every project, created lazily and never a prerequisite: `docs/adr/`, `docs/glossary.md`, and the roadmap indexes under `.work/roadmaps/`. |
| **ADR** | One project decision as a file `<yymmddhhmm>-<slug>.md`, carrying `name`, `description`, an optional `supersedes`, and a body giving the context, the decision, and the reason. Its stem is its global identifier and never changes. Files in `docs/adr/` are the whole authoritative surface for project decisions; the catalog is printed from the folder by `/consult-adrs` rather than kept in an index file. [suite/shared/references/formats/adr.md](../suite/shared/references/formats/adr.md) |
| **superseded ADR** | A record that a later ADR replaced or retired by naming its stem under `supersedes`, moved to `docs/adr/superseded/` with its content untouched. Location is the status — an ADR file carries no status key. |
| **binding test** | The test a settled point must pass to earn an ADR: a later thread could build against it incorrectly if not told, and could not read it off the code. |
| **roadmap index** | `.work/roadmaps/<yymmddhhmm>-<slug>.md`, one per direction: the destination, ordered entries, an out-of-scope list, and a note for what cannot yet be seen. Its owner edits it in place and deletes it when the destination is reached or abandoned. [suite/shared/references/formats/roadmap-index.md](../suite/shared/references/formats/roadmap-index.md) |
| **entry** | One item in a roadmap index: a heading whose text is a short kebab-case slug unique within that index, followed by a one-paragraph sketch and a scope boundary. The slug is the entry's identifier, and it is pinned once a thread has been opened from it. |
| **living documentation** | Documentation describing the system as it currently exists — READMEs, architecture references, runbooks, conventions. It changes within implementation scope, as part of the implementation that changes the behavior it describes. |

## Trackers and tickets

| Term | Meaning |
| --- | --- |
| **tracker** | The external issue tracker a project's work is filed in. GitHub is the one implemented tracker; the vocabulary and the skills stay tracker-neutral, and a skill resolves which tracker applies from a reference's host. |
| **ticket** | One entry in a tracker. The reserved word for the concept across the suite, the CLI, and these documents — on GitHub a ticket is an issue, and only tracker-specific reference material says so. |
| **ticket reference** | A ticket's identity as recorded in the seed: its real URL. Two references denote one ticket when their parts match, so references are compared by meaning rather than as raw strings. |
| **tracker mutation** | Any write to a tracker — filing a ticket, labelling, commenting, transitioning, closing. Authorized only by a deliberate user-invoked operation that confirms the specific write, never by holding a reference. |

## Running and reporting

| Term | Meaning |
| --- | --- |
| **run** | One invocation of one skill, from preflight to its terminal outcome. Scoped to a single invocation, never to a thread's whole life. |
| **preflight** | The mandatory validation every completion-oriented skill performs before substantive execution: the invocation's input, the artifacts it needs, and the tooling. Failure writes nothing and ends the run `REFUSED`. |
| **terminal outcome** | The protocol name for the single closing line `Outcome: <DONE \| BLOCKED \| REFUSED> — <reason>` and its closed three-token vocabulary. Always a *run's* end state. Never called a run status, stage status, or completion status. [suite/authoring/interaction-posture.md](../suite/authoring/interaction-posture.md) |
| **skill-local return tokens** | A vocabulary a skill defines purely for its own caller/callee topology, such as an orchestrator's subagent reply tokens. Never a status, never an outcome, never emitted outside the owning skill. |
| **interaction posture** | The authoring-level classification of whether obtaining human input is a skill's normal job: **dialogue-driven**, **completion-oriented**, or **one-shot deliverable**. |
| **write boundary** | The narrow, purpose-shaped set of files a given skill may write, stated in that skill's own body. A convention realized by skill design, not by filesystem controls. [suite/authoring/side-effects.md](../suite/authoring/side-effects.md) |

## Skills

| Term | Meaning |
| --- | --- |
| **skill** | One self-contained capability with a fixed output contract, as a `SKILL.md` file. A skill states everything it needs in its own body. |
| **entry point** | A user-invoked skill owning a complete user-visible operation, started by a person rather than by the model. Carries `disable-model-invocation: true`. [suite/authoring/skill-roles.md](../suite/authoring/skill-roles.md) |
| **model-invoked skill** | A skill the model may invoke at its own discretion, because what it does is useful to an agent in any situation, whether or not an entry point is running. Declared by omitting `disable-model-invocation`. [suite/authoring/skill-roles.md](../suite/authoring/skill-roles.md) |
| **shared reference** | Passive canonical material under `suite/shared/references/` — the formats, the instructions, and tracker material — declared in `suite/shared/manifest.yaml` and mirrored into each declaring skill by the sync script. The mirrored copies are generated, never hand-edited. [suite/authoring/shared-references.md](../suite/authoring/shared-references.md) |
| **format** | A shared reference describing one artifact — what it is, where it lives, and how it is shaped — under `suite/shared/references/formats/`, following one skeleton: a title, one paragraph, `## Shape`, and `## Rules`. A format says what an artifact is and never how an act is done. [suite/authoring/shared-references.md](../suite/authoring/shared-references.md) |
| **instruction** | A shared reference holding one self-contained procedure for a single act, written to whoever performs it and naming no skill, so that every skill performing the act performs it the same way. [suite/authoring/shared-references.md](../suite/authoring/shared-references.md) |
| **review** | A strictly read-only assessment of delivered work. Never edits its target. Its only output is a findings bundle when issues exist, and a concise pass in chat when clean. |
| **subagent** | An agent an orchestrating skill dispatches for a bounded task, whose reply the orchestrator classifies rather than trusts. |

## Queues and workspaces

| Term | Meaning |
| --- | --- |
| **temporary workspace** | One of the gitignored dot-folders holding thread-local operational state: `.pending-decisions/` and `.pending-reviews/` at the thread root, and `.runs/` inside each implementation folder. |
| **bundle** | One file in a pending queue. A **pending-decision bundle** in `.pending-decisions/` carries open human decisions; a **findings bundle** in `.pending-reviews/` carries review findings. Always qualify which. |
| **pending decision** | Missing human intent discovered *after* substantive execution began, queued rather than asked in chat or invented. Emitting one ends the run `BLOCKED`. Distinct from a preflight refusal, which queues nothing. |
| **queue** | The contents of `.pending-decisions/` or `.pending-reviews/` for one thread. A non-empty queue blocks unattended advancement. |

## CLI execution

| Term | Meaning |
| --- | --- |
| **pipeline** | A named, ordered sequence of stages the CLI executes unattended, carried in a document the user authors or saves. It enforces Git boundaries, queue gates, and a required outcome per stage. `cli/src/pipeline/`. |
| **stage** | One entry in a pipeline: an id, a skill name, a target, the artifact prerequisite it needs, the artifact-state transition it promises, a Git policy, and a queue resolution. |
| **executor** | The CLI process that holds the lock, drives the harness, writes the checkpoint, and makes boundary commits. |
| **harness** | The agentic provider the executor drives — Codex or Claude Code — behind an Antmay-owned invoker seam. |
| **attempt** | One harness invocation for one stage, with its own number, log file, and history record. |
| **checkpoint** | The durable `state.json` holding a run's whole cursor: stage snapshot, condition, attempts, waiting reasons, Git cursor. |
| **condition** | A run's high-level state: `ready`, `executing`, `waiting-for-user`, or `completed`. |
| **waiting** | A durable stop for a human. Recorded with every reason in precedence order; the first reason governs how `resume` proceeds. |
| **boundary** | The per-stage Git boundary: after a parsed `DONE`, worktree changes must fall inside the stage's allowed selectors, and the declared commit subject is then produced. |
| **boundary commit** | The single commit the executor makes at a stage boundary. |
| **lock** | The exclusive per-workspace lock file guarding one workspace against concurrent runs. Never reclaimed automatically. |
| **workspace** | The resolved place the harness runs. |
| **simulated harness** | The developer-only stand-in that replaces the real harness, enabled solely by `ANTMAY_SIMULATED_HARNESS=1`. `cli/src/harness/adapters/simulated/`. |
| **case** | One entry from the simulated harness's fixed built-in catalog, describing what a single stage attempt should do. Reserved for the simulated harness — a test case is called a test. |
| **scenario** | One simulated-harness document mapping stage ids to ordered cases. A demo file that also carries invocation steps is a **demo scenario**. |

## Reserved and avoided words

| Word | Rule |
| --- | --- |
| **workflow** | Not a term of art here. Write **method** for the whole approach, **thread artifact** for the artifact domain, and **process** for process-level intent. |
| **issue** | Two unrelated senses, both live. GitHub's word for a **ticket**: write **ticket** for the concept, and `issue` only where a GitHub-specific reference, command, or accepted input form is being named. Also the middle **review severity** (`blocker`, `issue`, `nit`), which keeps its name. |
| **contract** | Generic on its own, and used in two senses. Always qualify which: the **suite/CLI contract** between the modules, or a skill's **output contract**. Bare "contract" is unqualified only as the `[contract]` issue prefix, where the scope list supplies the sense. |
| **simulated** | Two live senses, both in the CLI. Always qualify which: the **simulated harness** that stands in for a provider, or the **simulated artifact state** composition projects a stage's promise onto before the run begins. Bare "simulated" names neither. |
| **status** | Never used for a run's end state. That is the **terminal outcome**. There is no status field, status token, or status layer anywhere in the method. |
| **outcome** | On its own, means the terminal outcome. For a thread's lasting artifact write **final deliverable**; for the seed's goal write **intended goal**; for what one implementation delivered write **implementation report**. |
| **decision** | Qualify the level. A project decision is an **ADR**, drafted in a thread's delta and landed at close. A point settled inside a thread and kept there is a **log entry** of type `decision`, and open human intent queued for later is a **pending decision**. |
| **entry** | Two senses. In a roadmap index it is a slug-headed **entry**; in the thread log it is a **log entry**. Write the qualified form wherever both could be read. |
| **`## Workflow`** | Never a section heading in a skill body. A skill's end-to-end sequence lives under `## Procedure`. |
