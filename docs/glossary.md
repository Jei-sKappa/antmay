# Glossary

The canonical vocabulary of the Antmay method. Every term below has exactly one
meaning across this repository — the skill suite, the CLI, and these documents.
When a term also has an ordinary English sense, the entry says which sense is
reserved and what to write instead.

This document is the naming authority. A term's full rules live in the document
that owns the concept — [thread-model.md](thread-model.md),
[skill-authoring.md](skill-authoring.md), or a recipe document under
[recipes/](recipes/) — and this glossary points there.

## The method and its shape

| Term | Meaning |
| --- | --- |
| **Antmay** | The whole thing this repository provides: a thread-based method for Spec Driven Development, the skill suite that supports it, and the CLI that automates it. |
| **the Antmay method** | The way of working itself — carrying a unit of work from a rough idea to shipped code through reviewable Markdown artifacts in a thread. Singular and uncountable. Use this where the whole approach is meant, never "the Antmay workflow". |
| **Spec Driven Development (SDD)** | The broader practice the method serves: deciding and writing down what to build before building it, so the written intent — not a chat log — is what downstream work reads. |
| **suite** | The installable set of skills under `suite/`, the reference implementation of the method. One coherently installed set, never a partial mix. |
| **CLI** | The `antmay` executable under `cli/`, which runs a pipeline unattended against one thread. |
| **suite/CLI contract** | The only coupling between the two modules: the skill names a pipeline invokes and the terminal-outcome protocol it classifies. They share no files, so breaking this contract changes no path in the other module — which is what makes it worth naming. `[contract]` is its issue-title scope prefix ([CONTRIBUTING.md](../CONTRIBUTING.md)). |

## Recipes and pipelines

| Term | Meaning |
| --- | --- |
| **recipe** | A named, ordered path through the skills, written for a human to follow: the complete advisory sequence in `docs/recipes/<name>.md`, optional steps included. Countable — the method ships three. A recipe guides and never governs. Defined in [README.md](README.md). |
| **Quick / Standard / Roadmap** | The three shipped recipes, distinguished only by process shape — how much ceremony a change earns — never by subject matter. |
| **step** | One numbered entry in a recipe, naming the skill to invoke. Always a suggestion. |
| **pipeline** | A named, ordered sequence of stages the CLI executes unattended, carried in a document the user authors or saves — `cli/README.md` publishes a ready-made Standard one. A pipeline automates the automatable core of a recipe, and enforces what a recipe only suggests: Git boundaries, queue gates, and a required outcome per stage. `cli/src/pipeline/`. |
| **stage** | One entry in a pipeline: an id, a skill name, a target, the artifact prerequisite it needs, the artifact-state transition it promises, a Git policy, and a queue resolution. A recipe has steps; a pipeline has stages. |
| **process shape** | How much ceremony a recipe applies. The only axis the three recipes differ on. |

A pipeline is deliberately **not** a transcription of a recipe, and the two are
never spoken of as one thing. The Standard pipeline document published in
`cli/README.md` begins at a thread that already exists, omits every recipe step
that needs a person (discussion, finishing, archival), and runs
`implement-plan-with-subagents` where the Standard recipe's step 9 names
`implement-plan`. The sharpest difference is authority: a recipe is a
recommendation a user may ignore, while a pipeline refuses to advance when a
stage leaves the wrong files changed or a pending queue is non-empty.

## Threads and artifacts

| Term | Meaning |
| --- | --- |
| **thread** | One unit of work at one moment, as a durable folder under `docs/threads/<YYMMDDHHMMSSZ-slug>/`. The method's central object. [thread-model.md](thread-model.md) |
| **unit of work** | The scope one thread covers: a single coherent change (Quick, Standard) or a single direction to decompose (Roadmap). |
| **thread artifact** | A durable file inside a thread recording how one change was understood and delivered at a moment — the seed, the decision log, a proposal, spec, plan, roadmap, or report. Historical by nature. Use this where the artifact domain is meant, in contrast to source code. |
| **living project documentation** | Documentation describing the system as it currently exists — READMEs, architecture references, runbooks, conventions. Evolves across threads; updating it is part of the implementation that changes documented behavior. |
| **seed** | `seed.md`, written once when the thread opens: a title plus a self-contained genesis narrative. |
| **genesis narrative** | The seed's self-contained explanation of what triggered the work and its intended goal. |
| **decision** | A settled answer that fixes product or process intent, recorded as a `DR<N>` record in `decisions.md`. A trivial input clarification is not a decision. |
| **decision log** | `decisions.md`, the one thread-wide append-only record of decisions. A changed decision appends a superseding record; prior records are never rewritten. |
| **proposal** | `proposal.md`, a freeform sketch of the direction, written before the work is specified. |
| **spec** | `spec.md`, the handoff-grade description of what to build — complete enough that a downstream planner or implementer needs no conversational context. |
| **plan** | `plan.md`, the prescriptive implementation plan. A **brief plan** is contained entirely in `plan.md`; a **strict plan** uses `plan.md` as an index plus one dispatchable task brief per task under `plan-tasks/`. |
| **roadmap** | `roadmap.md`, the decomposition contract: intended outcome, context, scope, shared constraints, rationale, and one `CB<N>` child brief each. Holds no statuses or progress. |
| **roadmap feedback** | `roadmap-feedback.md`, the append-only `FBK<N>` channel where a descendant records a discovery with parent- or sibling-level impact. |
| **implementation report** | `implementation-report.md`, the singleton artifact describing the current delivered outcome. Not a per-run history. |
| **final deliverable** | What a completed *thread* leaves behind — the implementation report for Quick and Standard, the roadmap and its materialized children for Roadmap. Distinct from a terminal outcome. |

## Trackers and tickets

| Term | Meaning |
| --- | --- |
| **tracker** | The external issue tracker a project's work is filed in. GitHub is the one implemented tracker; the vocabulary and the skills stay tracker-neutral, and a skill resolves which tracker applies from a reference's host. |
| **ticket** | One entry in a tracker. The reserved word for the concept across the suite, the CLI, and these documents — on GitHub a ticket is an issue, and only tracker-specific reference material says so. |
| **ticket reference** | A ticket's identity as recorded in the seed's `External:` field: its real URL. Two references denote one ticket when their parts match, so references are compared by meaning rather than as raw strings. |
| **tracker mutation** | Any write to a tracker — filing a ticket, labelling, commenting, transitioning, closing. Authorized only by a deliberate user-invoked operation that confirms the specific write, never by holding a reference. [thread-model.md](thread-model.md) |

## Running and reporting

| Term | Meaning |
| --- | --- |
| **run** | One invocation of one skill, from preflight to its terminal outcome. Scoped to a single invocation, never to a thread's whole life. |
| **preflight** | The mandatory validation every completion-oriented skill performs before substantive execution: which thread and target, which inputs, which artifacts and tooling. Failure writes nothing and ends the run `REFUSED`. |
| **terminal outcome** | The protocol name for the single closing line `Outcome: <DONE \| BLOCKED \| REFUSED> — <reason>` and its closed three-token vocabulary. Always a *run's* end state. Never called a run status, stage status, or completion status. [skill-authoring.md](skill-authoring.md) |
| **skill-local return tokens** | A vocabulary a skill defines purely for its own caller/callee topology, such as an orchestrator's subagent reply tokens. Never a status, never an outcome, never emitted outside the owning skill. |
| **interaction posture** | The authoring-level classification of whether obtaining human input is a skill's normal job: **dialogue-driven**, **completion-oriented**, or **one-shot deliverable**. |
| **write authority** | The narrow, purpose-shaped set of files a given skill may write. A convention realized by skill design, not by filesystem controls. |

## Skills

| Term | Meaning |
| --- | --- |
| **skill** | One self-contained capability with a fixed output contract, as a `SKILL.md` file. A skill never inspects which recipe it is running under. |
| **entry point** | A user-invoked skill owning a complete user-visible operation. Carries `disable-model-invocation: true`. |
| **primitive** | A model-invoked skill performing one narrow, shared, side-effecting discipline on a caller's behalf. Never invokes an entry point. |
| **caller** | The entry point or model that invokes a primitive. It retains ownership of its own inputs, paths, side effects, and completion criteria. |
| **caller-authorization block** | The complete set of fields a caller must supply for a primitive to act. A primitive refuses without it. |
| **shared reference** | Passive canonical material under `suite/shared/references/`, declared in `suite/shared/manifest.yaml` and mirrored into each declaring skill by the sync script. The mirrored copies are generated, never hand-edited. |
| **reconciliation** | An operation that inspects a thread artifact and edits its declared target where the correction follows from authoritative existing decisions, routing irreducible intent to `.pending-decisions/`. Produces no review report. |
| **review** | A strictly read-only assessment of delivered work. Never edits its target. Its only output is a findings bundle when issues exist, and a concise pass in chat when clean. |
| **subagent** | An agent an orchestrating skill dispatches for a bounded task, whose reply the orchestrator classifies rather than trusts. |

## Queues and workspaces

| Term | Meaning |
| --- | --- |
| **temporary workspace** | One of the three gitignored dot-folders holding thread-local operational state: `.pending-decisions/`, `.pending-reviews/`, `.implementation-runs/`. |
| **bundle** | One file in a pending queue. A **resumption bundle** in `.pending-decisions/` carries open human decisions; a **findings bundle** in `.pending-reviews/` carries `FND<N>` review findings. Always qualify which. |
| **pending decision** | Missing human intent discovered *after* substantive execution began, queued rather than asked in chat or invented. Emitting one ends the run `BLOCKED`. Distinct from a preflight refusal, which queues nothing. |
| **queue** | The contents of `.pending-decisions/` or `.pending-reviews/` for one thread. A non-empty queue blocks unattended advancement. |

## CLI execution

| Term | Meaning |
| --- | --- |
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
| **scripted harness** | The developer-only test seam that replaces the real harness, enabled solely by `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS=1`. |
| **case** | One entry from the scripted harness's fixed built-in catalog, describing what a single stage attempt should do. Reserved for the scripted harness — a test case is called a test. |
| **scenario** | One scripted-harness document mapping stage ids to ordered cases. A demo file that also carries invocation steps is a **demo scenario**. |

## Reserved and avoided words

| Word | Rule |
| --- | --- |
| **workflow** | Not a term of art here. Write **method** for the whole approach, **recipe** for one of the three named paths, **thread artifact** for the artifact domain, and **process** for process-level intent. |
| **issue** | Two unrelated senses, both live. GitHub's word for a **ticket**: write **ticket** for the concept, and `issue` only where a GitHub-specific reference, command, or accepted input form is being named. Also the middle **review severity** (`blocker`, `issue`, `nit`), which keeps its name. |
| **contract** | Generic on its own, and used in three senses. Always qualify which: the **suite/CLI contract** between the modules, a skill's **output contract**, or a roadmap as the **decomposition contract**. Bare "contract" is unqualified only as the `[contract]` issue prefix, where the scope list supplies the sense. |
| **status** | Never used for a run's end state. That is the **terminal outcome**. There is no status field, status token, or status layer anywhere in the method. |
| **outcome** | On its own, means the terminal outcome. For a thread's lasting artifact write **final deliverable**; for the seed's goal write **intended goal**; for the delivered result write **implementation report**. |
| **recipe** vs **pipeline** | A **recipe** is the documented advisory path; a **pipeline** is the CLI's enforced stage sequence. They are not two fidelities of one thing — never use either name for the other. |
| **stage** vs **step** | A recipe has **steps**; a pipeline has **stages**. Never swap them. |
| **`## Workflow`, `## Recipe`** | Never section headings in a skill body. A skill's end-to-end sequence lives under `## Procedure`. |
