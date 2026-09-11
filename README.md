[![skills.sh](https://skills.sh/b/Jei-sKappa/antmay)](https://skills.sh/Jei-sKappa/antmay)

<p align="center">
  <img src="./assets/antmay-banner.png" alt="Antmay" width="100%">
</p>

# Antmay

**Antmay** optimizes Spec Driven Development. It offers a thread-based method for SDD, a suite of skills that support that method, and a CLI that automates it.

The method is simple: every unit of work lives in its own thread under `docs/threads/<thread>/`, holding a self-contained seed, a running decision log, and whatever artifacts the work produces. Intent is written down before it is built, and it is written where a teammate reviewing a PR and a fresh agent session resuming work both read the same durable truth — reviewable Markdown on disk, not a chat log.

The **skills** are composable and harness-agnostic `SKILL.md` files that work inside Claude Code, Codex, Gemini CLI, OpenCode, or any harness that loads them. They are not a runtime or a project-local state file: they are individual capabilities you install and compose — either one at a time for a single job, or arranged into one of three built-in recipes that walk a change end-to-end.

The **CLI** (`antmay`) runs a **pipeline** unattended, stage by stage, against one thread — with durable checkpoints, workspace locking, and per-stage Git boundaries. A pipeline automates the automatable core of a recipe. See [`cli/`](./cli/README.md).

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

## Recipes

A **recipe** is a named, ordered path through the skills. The three differ only by **process shape** — how much ceremony a change earns. They are subject-neutral: you pick the shape that fits the work, not a router that maps bugs, features, or docs to a category. Every step is a suggestion, never a rule; skipping or adding one never invalidates a thread. A lighter path can grow into a heavier one in place, in the same thread, without starting over.

| Recipe | Process shape |
| --- | --- |
| [**Quick**](./docs/recipes/quick.md) | The smallest delivery path — carry one change from a clarified start straight to implemented code and a recorded outcome, with the fewest artifacts that still leave a durable trail. |
| [**Standard**](./docs/recipes/standard.md) | The full spec-driven path — thread a handoff-grade specification and a prescriptive plan between thread genesis and delivery, kept faithful to the decisions by reconciliation. |
| [**Roadmap**](./docs/recipes/roadmap.md) | Direction and decomposition — explore a larger direction, write it down as a decomposition, and materialize independently executable child threads; then it is done. |

The canonical method documentation — the glossary, the thread model, the seed and decision-log contracts, the recipes, and the skill-authoring rules — lives under [`docs/`](./docs/README.md). That is the active reference for all new threads. Read it before opening a thread or writing any thread artifact.

## Terminal outcomes

Every completion-oriented skill ends its final message with exactly one **terminal outcome** line, so a human or a calling harness can read a run's end state at a glance:

```text
Outcome: <DONE | BLOCKED | REFUSED> — <one-line reason or pointer>
```

`DONE` means the requested job completed (non-blocking concerns included), `BLOCKED` means substantive execution started but stopped — on queued pending decisions or an unfixable defect — and `REFUSED` means preflight prevented the run from starting. This three-token protocol is the suite's only shared status vocabulary. A skill may define **skill-local return tokens** for its own internals — such as the subagent reply tokens and reviewer lane verdicts inside `implement-plan-with-subagents` — but those are private routing inputs, never terminal outcomes, and never appear outside the skill that defines them. Dialogue-driven skills (such as `discussion` and `open-thread`) and the primitives emit no terminal outcome — their questions or their narrow written artifact are the output.

## Skills

Every skill below is **user-invoked**: you (or your harness, routing on the skill's description) start it directly. The [Primitives](#primitives) further down are a separate class — invoked by other skills or the model, never chosen directly.

### Capture & Discussion

#### [`open-thread`](./suite/skills/capture-discussion/open-thread/SKILL.md)

Open a durable thread on disk — interpret the user's idea and an optional tracker ticket, then compose the seed and hand normalized creation to the thread-creation primitive — use when a unit of work needs a home before any proposal, spec, or plan exists.

```sh
npx skills add Jei-sKappa/antmay --skill open-thread
```

#### [`open-ticket`](./suite/skills/capture-discussion/open-ticket/SKILL.md)

Turn a rough idea into a tracker ticket whose body reads as a thread's genesis narrative — use when an idea should be captured in the tracker rather than started now.

```sh
npx skills add Jei-sKappa/antmay --skill open-ticket
```

#### [`discussion`](./suite/skills/capture-discussion/discussion/SKILL.md)

Conduct an open-ended interview that discovers decision points live and records each settled decision to the thread's decision log — use when the user wants to think a topic through without knowing every question up front.

```sh
npx skills add Jei-sKappa/antmay --skill discussion
```

#### [`resolve-pending-decisions`](./suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md)

Settle the thread's queued pending decisions interactively and record the outcomes — use when a queue of pending-decision bundles is waiting for a human to work through their open questions and turn each settled choice into a durable decision record.

```sh
npx skills add Jei-sKappa/antmay --skill resolve-pending-decisions
```

### Spec

#### [`spec`](./suite/skills/spec/spec/SKILL.md)

Forward-design a thread's durable inputs (seed, decisions, an optional proposal) or a referenced artifact into a handoff-grade spec.md at a thread root; use when an upstream input needs designing into a complete spec a downstream planner or implementer can build from.

```sh
npx skills add Jei-sKappa/antmay --skill spec
```

### Plan

#### [`plan-brief`](./suite/skills/plan/plan-brief/SKILL.md)

Turn a thread's durable inputs or a referenced artifact into a one-screen plan.md at a thread root — an outcome, a small ordered list of steps, and overall verification; use when lightweight work needs a sensible implementation order without the ceremony of a full multi-file plan.

```sh
npx skills add Jei-sKappa/antmay --skill plan-brief
```

#### [`plan-strict`](./suite/skills/plan/plan-strict/SKILL.md)

Turn a spec, proposal, decisions, GitHub issue, or raw prompt into a strict-granularity plan — a thread-root plan.md index plus one dispatchable brief per task under plan-tasks/, each with explicit substeps, files modified, verification, and acceptance criteria; use when the downstream implementer is agent-leaning and needs a prescriptive plan.

```sh
npx skills add Jei-sKappa/antmay --skill plan-strict
```

#### [`check-plan`](./suite/skills/plan/check-plan/SKILL.md)

Check the newest or a named plan folder against the thread's spec and correct in place every fault the spec settles, queueing the rest as pending decisions; use when a plan has been written and must be made to match the spec before implementation starts.

```sh
npx skills add Jei-sKappa/antmay --skill check-plan
```

### Roadmap

#### [`roadmap`](./suite/skills/roadmap/roadmap/SKILL.md)

Decompose a settled larger initiative into self-contained child-thread briefs — author a thread-root roadmap.md and an eager roadmap-feedback.md — creating no child threads; use when a thread's direction is agreed and needs breaking into independently executable children.

```sh
npx skills add Jei-sKappa/antmay --skill roadmap
```

### Implement

#### [`implement`](./suite/skills/implement/implement/SKILL.md)

Implement a brief plan or a less-structured input (`plan.md`, a seed with its decisions, a code or issue reference, or a raw prompt) end-to-end on the current working tree, deriving implicit tasks, self-reviewing after each task, and auto-committing per task; use when the input needs to be carried to working code in a single agent.

```sh
npx skills add Jei-sKappa/antmay --skill implement
```

#### [`implement-plan`](./suite/skills/implement/implement-plan/SKILL.md)

Execute a strict multi-file plan artifact — a thread-root `plan.md` index plus its `plan-tasks/` briefs — end-to-end on the current working tree, reading the index then each task file in order, self-reviewing after each task, and auto-committing per task; use when a plan needs to be carried to working code in a single agent.

```sh
npx skills add Jei-sKappa/antmay --skill implement-plan
```

#### [`implement-plan-with-subagents`](./suite/skills/implement/implement-plan-with-subagents/SKILL.md)

Execute a strict multi-file plan artifact — a thread-root `plan.md` index plus its `plan-tasks/` briefs — through an implementer and a merged two-lane reviewer subagent loop with per-cycle commits; use when a plan needs the heavier review path and the runtime supports subagents.

```sh
npx skills add Jei-sKappa/antmay --skill implement-plan-with-subagents
```

### Review

Reviews are strictly read-only. A clean review passes in chat and writes nothing; a review with findings records a single pending-review bundle for later attention.

#### [`review-spec`](./suite/skills/review/review-spec/SKILL.md)

Read a thread-root spec.md as a downstream handoff and judge whether another agent could plan and implement from it without hidden conversational context, reporting any findings as a single pending-review bundle; use when a spec should be checked for planning readiness before downstream work.

```sh
npx skills add Jei-sKappa/antmay --skill review-spec
```

#### [`review-implementation`](./suite/skills/review/review-implementation/SKILL.md)

Check delivered work against the thread's durable intent and confirm the implementation report honestly describes what exists — reviewing strictly read-only and recording any findings as a single pending-review bundle; use when an implementation needs a fidelity review before it is accepted.

```sh
npx skills add Jei-sKappa/antmay --skill review-implementation
```

#### [`review-code`](./suite/skills/review/review-code/SKILL.md)

Judge code on its own intrinsic merits — quality, safety, idioms, and testability — anchored to the thread's durable intent only where intent decides what "right" means, reviewing strictly read-only and recording any findings as a single pending-review bundle; use when code needs a quality review.

```sh
npx skills add Jei-sKappa/antmay --skill review-code
```

### Finish & Navigate

#### [`close-thread`](./suite/skills/finish-navigate/close-thread/SKILL.md)

Close the active thread by checking it, landing its draft ADRs and glossary entries into the project layer, updating its roadmap entry, and archiving it; use when a thread's work is delivered and its records are ready to become the project's current decisions.

```sh
npx skills add Jei-sKappa/antmay --skill close-thread
```

#### [`finish`](./suite/skills/finish-navigate/finish/SKILL.md)

Inspect what a thread has produced, surface any unresolved delivery signals, then hand the current branch off the way the user chooses — create a PR, merge into a confirmed target, or leave as-is; use when work is ready to deliver and you want an evidence-backed branch handoff.

```sh
npx skills add Jei-sKappa/antmay --skill finish
```

#### [`whats-next`](./suite/skills/finish-navigate/whats-next/SKILL.md)

Read a thread's observable state — its location, seed, decisions, canonical artifacts, pending bundles, run state, and branch — then advise plausible next actions without inferring hidden operations or writing anything; use when you want a quick, evidence-based read on where a thread stands and what to do next.

```sh
npx skills add Jei-sKappa/antmay --skill whats-next
```

## Primitives

Primitives are **model-invoked**, not user-invoked: another skill or the model itself calls them to perform one narrow, shared operation — you never reach for them directly. They ship as dependencies of the suite, so installing the skills that call them installs these too; the snippets below are here only for completeness.

#### [`emit-pending-decisions`](./suite/skills/primitives/emit-pending-decisions/SKILL.md)

Queue a producing caller's genuine open human decisions for later — allocate a uniquely named bundle under the active thread's `.pending-decisions/` folder, write its routing header and advisory follow-up, and normalize each decision into a canonical discussion point.

```sh
npx skills add Jei-sKappa/antmay --skill emit-pending-decisions
```

#### [`emit-pending-review`](./suite/skills/primitives/emit-pending-review/SKILL.md)

Record a read-only reviewer's already-validated, evidenced, categorized findings — allocate a uniquely named bundle under the active thread's `.pending-reviews/` folder and write its routing header and severity-ordered findings.

```sh
npx skills add Jei-sKappa/antmay --skill emit-pending-review
```

#### [`allocate-thread`](./suite/skills/primitives/allocate-thread/SKILL.md)

Allocate a normalized thread folder from a caller's complete authorization block — create `docs/threads/<YYMMDDHHMMSSZ-slug>/`, write `seed.md` from the supplied fields, and eagerly create a header-only `decisions.md`.

```sh
npx skills add Jei-sKappa/antmay --skill allocate-thread
```

#### [`update-implementation-report`](./suite/skills/primitives/update-implementation-report/SKILL.md)

Create or merge the thread's singleton `implementation-report.md` in place to describe an implementation caller's verified current outcome — the changes made, checks performed, deviations, remaining concerns, and follow-ups.

```sh
npx skills add Jei-sKappa/antmay --skill update-implementation-report
```

For the method — the glossary, the thread model, the seed and decision-log contracts, the three recipes, and the skill-authoring rules — see [`docs/`](./docs/README.md), the reference for all new threads.
