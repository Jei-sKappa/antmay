[![skills.sh](https://skills.sh/b/Jei-sKappa/antmay)](https://skills.sh/Jei-sKappa/antmay)

<p align="center">
  <img src="./assets/antmay-banner.png" alt="Antmay" width="100%">
</p>

# Antmay

**Antmay** optimizes Spec Driven Development. It offers a thread-based method for SDD, a suite of skills that support that method, and a CLI that automates it.

The method is simple: every unit of work lives in its own thread under `.work/threads/`, holding a self-contained seed, a running log, the spec that is the work's design truth, the project decisions and terms the work settles, and one folder per plan and per implementation. Intent is written down before it is built, and it is written where a teammate reviewing a PR and a fresh agent session resuming work both read the same durable truth — reviewable Markdown on disk, not a chat log. When a thread closes, the decisions that outlive it land in the project's own layer at `docs/adr/` and `docs/glossary.md`.

The **skills** are composable and harness-agnostic `SKILL.md` files that work inside Claude Code, Codex, Gemini CLI, OpenCode, or any harness that loads them. They are not a runtime or a project-local state file: they are individual capabilities you install and compose, one at a time for a single job or one after another to carry a change end to end.

The **CLI** (`antmay`) runs a **pipeline** unattended, stage by stage, against one thread — an ordered sequence of skills executed with durable checkpoints, workspace locking, and per-stage Git boundaries. See [`cli/`](./cli/README.md).

> General-purpose, context-agnostic skills live in the companion repository [`Jei-sKappa/skills`](https://github.com/Jei-sKappa/skills).

## Installation

Install the entire suite in one command:

```sh
npx skills add Jei-sKappa/antmay
```

Or install any skill individually:

```sh
npx skills add Jei-sKappa/antmay --skill <skill-name>
```

## Threads and the project layer

A **thread** is one unit of work as a folder on disk, at `.work/threads/yyyy/mm/dd-hhmm-slug/` — a year, a month, and a leaf named by the day, the creation time, and a short slug. Inside it:

```text
seed.md            why the thread was opened
log.md             the thread's memory, one line per settled point
spec.md            what the work must do, once it is specified
adr/               this thread's draft project decisions
glossary.md        the terms this thread fixes, changes, or retires
plans/             one folder per plan
implementations/   one folder per implementation run
```

The **project layer** is what outlives any single thread: the project's current decisions as one file per record under `docs/adr/`, its terms at `docs/glossary.md`, and the roadmap indexes under `.work/roadmaps/` that larger directions are written down as. A thread's `adr/` and `glossary.md` are its draft of that layer, authoritative inside the thread from the moment they are written.

Closing a thread lands that draft: the records move into `docs/adr/`, the terms merge into `docs/glossary.md`, and a closing line goes under the roadmap entry the thread came from. The thread folder stays exactly where it is, as the record of how the work was understood while it was being done.

## Terminal outcomes

Every completion-oriented skill ends its final message with exactly one **terminal outcome** line, so a human or a calling harness can read a run's end state at a glance:

```text
Outcome: <DONE | BLOCKED | REFUSED> — <one-line reason or pointer>
```

`DONE` means the requested job completed (non-blocking concerns included), `BLOCKED` means substantive execution started but stopped — on queued pending decisions or an unfixable defect — and `REFUSED` means preflight prevented the run from starting. This three-token protocol is the one outcome vocabulary the whole suite shares. A skill may define **skill-local return tokens** for its own internals — such as the subagent reply tokens and reviewer lane verdicts inside `implement-plan-with-subagents` — but those are private routing inputs, never terminal outcomes, and never appear outside the skill that defines them. Dialogue-driven skills such as `discussion` emit no terminal outcome, and neither do the one-shot deliverables `open-thread` and `open-ticket`, nor the model-invoked skills below — their questions, their finished deliverable, or their narrow written artifact are the output.

## Skills

Every skill below is **user-invoked**: you start it directly, by name.

### Capture & Discussion

#### [`open-thread`](./suite/skills/capture-discussion/open-thread/SKILL.md)

Expects a rough idea, a tracker ticket reference, and/or a roadmap entry; leaves a new thread folder on disk holding its `seed.md` and an empty `log.md`, created without a confirming pass and carrying a linked ticket's own body rather than a rewrite of it.

```sh
npx skills add Jei-sKappa/antmay --skill open-thread
```

#### [`open-ticket`](./suite/skills/capture-discussion/open-ticket/SKILL.md)

Expects a rough idea worth capturing rather than starting now; leaves a ticket in your tracker whose body becomes, unchanged, the genesis narrative of any thread opened from it, and leaves nothing on disk.

```sh
npx skills add Jei-sKappa/antmay --skill open-ticket
```

#### [`discussion`](./suite/skills/capture-discussion/discussion/SKILL.md)

Expects a thread and a topic to think through; leaves one log line per settled point, draft records under the thread's `adr/`, and term entries in the thread's `glossary.md`.

```sh
npx skills add Jei-sKappa/antmay --skill discussion
```

#### [`resolve-pending-decisions`](./suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md)

Expects a thread whose `.pending-decisions/` queue holds bundles waiting on a human; leaves each answer written into the thread's log, spec, and delta, and leaves the exhausted bundle deleted.

```sh
npx skills add Jei-sKappa/antmay --skill resolve-pending-decisions
```

### Spec

#### [`spec`](./suite/skills/spec/spec/SKILL.md)

Expects a thread whose discussion has settled — the live conversation or `log.md`; leaves `spec.md` at the thread root and one `event` line in the log.

```sh
npx skills add Jei-sKappa/antmay --skill spec
```

### Plan

#### [`plan-brief`](./suite/skills/plan/plan-brief/SKILL.md)

Expects a thread holding a `spec.md`, or a referenced artifact to plan against; leaves a one-screen `plan.md` inside a fresh stamped folder under `plans/`.

```sh
npx skills add Jei-sKappa/antmay --skill plan-brief
```

#### [`plan-strict`](./suite/skills/plan/plan-strict/SKILL.md)

Expects a thread holding a `spec.md`, or a referenced artifact to plan against; leaves a fresh stamped folder under `plans/` holding a `plan.md` index and one dispatchable brief per task under `plan-tasks/`.

```sh
npx skills add Jei-sKappa/antmay --skill plan-strict
```

#### [`check-plan`](./suite/skills/plan/check-plan/SKILL.md)

Expects a thread holding both a `spec.md` and a plan folder; leaves that plan folder corrected in place, with whatever the spec does not settle queued as a pending decision.

```sh
npx skills add Jei-sKappa/antmay --skill check-plan
```

### Roadmap

#### [`roadmap`](./suite/skills/roadmap/roadmap/SKILL.md)

Expects a thread that has agreed where a larger direction is going; leaves a new roadmap index under `.work/roadmaps/` — a destination, ordered slug-headed entries, an out-of-scope list, and a note for what cannot yet be seen.

```sh
npx skills add Jei-sKappa/antmay --skill roadmap
```

### Implement

#### [`implement`](./suite/skills/implement/implement/SKILL.md)

Expects a plan folder, a referenced artifact, an issue, or your own prompt; leaves the code, tests, configuration, and living documentation it changed on the working tree, plus an implementation folder with its `report.md`, committing per derived task.

```sh
npx skills add Jei-sKappa/antmay --skill implement
```

#### [`implement-plan`](./suite/skills/implement/implement-plan/SKILL.md)

Expects a strict plan folder — a `plan.md` index plus its `plan-tasks/` briefs; leaves the delivered code on the working tree and a new implementation folder with its `report.md`, committing per task.

```sh
npx skills add Jei-sKappa/antmay --skill implement-plan
```

#### [`implement-plan-with-subagents`](./suite/skills/implement/implement-plan-with-subagents/SKILL.md)

Expects a strict plan folder and a runtime that supports subagents; leaves the delivered code on the working tree and a new implementation folder with its `report.md`, committing per reviewed task.

```sh
npx skills add Jei-sKappa/antmay --skill implement-plan-with-subagents
```

### Review

Reviews are strictly read-only. A clean review passes in chat and writes nothing; a review with findings records a single pending-review bundle for later attention.

#### [`review-spec`](./suite/skills/review/review-spec/SKILL.md)

Expects a thread holding a `spec.md` to judge as a downstream handoff; leaves nothing when the spec is ready to plan from, and one findings bundle under `.pending-reviews/` when it is not.

```sh
npx skills add Jei-sKappa/antmay --skill review-spec
```

#### [`review-implementation`](./suite/skills/review/review-implementation/SKILL.md)

Expects a thread holding an implementation folder and its `report.md`; leaves nothing when the delivered work matches the thread's durable intent and the report describes it honestly, and one findings bundle under `.pending-reviews/` when it does not.

```sh
npx skills add Jei-sKappa/antmay --skill review-implementation
```

#### [`review-code`](./suite/skills/review/review-code/SKILL.md)

Expects code to judge on its own merits — quality, safety, idioms, testability; leaves nothing when the code is clean, and one findings bundle under `.pending-reviews/` when it is not.

```sh
npx skills add Jei-sKappa/antmay --skill review-code
```

### Close

#### [`close-thread`](./suite/skills/close/close-thread/SKILL.md)

Expects a thread whose work is delivered and whose `adr/` and `glossary.md` drafts are ready to become the project's own; leaves the landed records in `docs/adr/`, the merged `docs/glossary.md`, a closing line beneath the thread's roadmap entry, and the thread folder in place.

```sh
npx skills add Jei-sKappa/antmay --skill close-thread
```

## Model-invoked skills

The two skills below are **model-invoked**: the model may reach for them on its own whenever they help, whether or not another skill is running, because what they read is useful in any situation. They ship as part of the suite, so installing it installs them too; the snippets are here for completeness.

#### [`consult-adrs`](./suite/skills/model-invoked/consult-adrs/SKILL.md)

Expects a project whose `docs/adr/` holds at least one record, and is not invoked otherwise; leaves nothing on disk — it prints the catalog of records, opens the ones that touch the work at hand, and says what to do when the work contradicts one.

```sh
npx skills add Jei-sKappa/antmay --skill consult-adrs
```

#### [`consult-glossary`](./suite/skills/model-invoked/consult-glossary/SKILL.md)

Expects a project holding `docs/glossary.md`, and is not invoked otherwise; leaves nothing on disk — it fixes which term to write for which meaning, so every document and every agent uses the same word for the same thing.

```sh
npx skills add Jei-sKappa/antmay --skill consult-glossary
```

## Contributing

[`CONTRIBUTING.md`](./CONTRIBUTING.md) covers how issues are classified and estimated, the commit and pull-request conventions, and the checks to run before proposing a change. Beyond it: [`docs/documentation-rules.md`](./docs/documentation-rules.md) is how this repository's documents are written, [`docs/working-with-threads.md`](./docs/working-with-threads.md) is how it uses the suite on itself, and [`suite/authoring/`](./suite/authoring/) holds the conventions every skill is authored to.
