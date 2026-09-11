[![skills.sh](https://skills.sh/b/Jei-sKappa/antmay)](https://skills.sh/Jei-sKappa/antmay)

<p align="center">
  <img src="./assets/antmay-banner.png" alt="Antmay" width="100%">
</p>

# Antmay

**Antmay** optimizes Spec Driven Development. It offers a thread-based method for SDD, a suite of skills that support that method, and a CLI that automates it.

The method is simple: every unit of work lives in its own thread under `docs/threads/<thread>/`, holding a self-contained seed, a running log, the spec that is the work's design truth, the project decisions and terms the work settles, and one folder per plan and per implementation. Intent is written down before it is built, and it is written where a teammate reviewing a PR and a fresh agent session resuming work both read the same durable truth — reviewable Markdown on disk, not a chat log. When a thread closes, the decisions that outlive it land in the project's own layer at `docs/adr/` and `docs/glossary.md`.

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
| [**Quick**](./suite/method.md#quick) | The smallest delivery path — carry one change from a clarified start straight to implemented code and a recorded outcome, with the fewest artifacts that still leave a durable trail. |
| [**Standard**](./suite/method.md#standard) | The full spec-driven path — write the design truth, plan against it, check the plan against it, and implement the plan. |
| [**Roadmap**](./suite/method.md#roadmap) | Direction and structure — explore a larger direction and write it down as an index of entries at `docs/roadmaps/`, from which threads are opened as the work reaches them. |

[`suite/method.md`](./suite/method.md) describes the method as a whole: the thread layout, the project layer, the lifecycle from open to close, and each recipe step by step. Read it before opening a thread or writing any thread artifact.

## Terminal outcomes

Every completion-oriented skill ends its final message with exactly one **terminal outcome** line, so a human or a calling harness can read a run's end state at a glance:

```text
Outcome: <DONE | BLOCKED | REFUSED> — <one-line reason or pointer>
```

`DONE` means the requested job completed (non-blocking concerns included), `BLOCKED` means substantive execution started but stopped — on queued pending decisions or an unfixable defect — and `REFUSED` means preflight prevented the run from starting. This three-token protocol is the one outcome vocabulary the whole suite shares. A skill may define **skill-local return tokens** for its own internals — such as the subagent reply tokens and reviewer lane verdicts inside `implement-plan-with-subagents` — but those are private routing inputs, never terminal outcomes, and never appear outside the skill that defines them. Dialogue-driven skills (such as `discussion` and `open-thread`) and the primitives emit no terminal outcome — their questions or their narrow written artifact are the output.

## Skills

Every skill below is **user-invoked**: you (or your harness, routing on the skill's description) start it directly. The [Primitives](#primitives) further down are a separate class — invoked by other skills or the model, never chosen directly.

### Capture & Discussion

#### [`open-thread`](./suite/skills/capture-discussion/open-thread/SKILL.md)

Open a durable thread on disk from a rough idea, a tracker ticket, and/or a roadmap entry — use when a unit of work needs a home before any spec or plan exists.

```sh
npx skills add Jei-sKappa/antmay --skill open-thread
```

#### [`open-ticket`](./suite/skills/capture-discussion/open-ticket/SKILL.md)

Turn a rough idea into a tracker ticket whose body reads as a thread's genesis narrative — use when an idea should be captured in the tracker rather than started now.

```sh
npx skills add Jei-sKappa/antmay --skill open-ticket
```

#### [`discussion`](./suite/skills/capture-discussion/discussion/SKILL.md)

Conduct an open-ended interview that discovers decision points live, appends each settled point to the thread log, and drafts the thread's ADRs and glossary entries with the user — use when the user wants to think a topic through without knowing every question up front.

```sh
npx skills add Jei-sKappa/antmay --skill discussion
```

#### [`resolve-pending-decisions`](./suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md)

Settle the thread's queued pending decisions live with the user and write each outcome into the thread's log, its spec, and its ADR and glossary delta — use when a queue of pending-decision bundles is waiting for a human to work through their open questions.

```sh
npx skills add Jei-sKappa/antmay --skill resolve-pending-decisions
```

### Spec

#### [`spec`](./suite/skills/spec/spec/SKILL.md)

Author a thread's design truth into a handoff-grade spec.md from the discussion's live conversation or the thread log, and amend an authored spec in place on re-invocation; use when a thread's design has settled enough to be written down, or when a later change must land in the spec that already exists.

```sh
npx skills add Jei-sKappa/antmay --skill spec
```

### Plan

#### [`plan-brief`](./suite/skills/plan/plan-brief/SKILL.md)

Turn a thread's spec or a referenced artifact into a one-screen plan.md inside a fresh stamped plan folder — an outcome, a small ordered list of steps, and overall verification; use when lightweight work needs a sensible implementation order without the ceremony of a full multi-file plan.

```sh
npx skills add Jei-sKappa/antmay --skill plan-brief
```

#### [`plan-strict`](./suite/skills/plan/plan-strict/SKILL.md)

Turn a thread's spec or a referenced artifact into a strict-granularity plan inside a fresh stamped plan folder — a plan.md index plus one dispatchable brief per task under plan-tasks/, each with explicit substeps, files modified, verification, and acceptance criteria; use when the downstream implementer is agent-leaning and needs a prescriptive plan.

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

Author a settled direction into the project-level roadmap index under docs/roadmaps/ — a destination, ordered slug-headed entries with a sketch and a scope boundary, an out-of-scope list, and a not-yet-specified note — drawn from the thread's own discussion; use when a thread has agreed where a larger direction is going and it needs writing down as a map.

```sh
npx skills add Jei-sKappa/antmay --skill roadmap
```

### Implement

#### [`implement`](./suite/skills/implement/implement/SKILL.md)

Implement a plan folder or a less-structured input (a referenced artifact, a code or issue reference, or a raw prompt) end-to-end on the current working tree, deriving implicit tasks, self-reviewing after each task, and auto-committing per task; use when the input needs to be carried to working code in a single agent.

```sh
npx skills add Jei-sKappa/antmay --skill implement
```

#### [`implement-plan`](./suite/skills/implement/implement-plan/SKILL.md)

Execute a strict plan folder — a `plans/<stamp>/plan.md` index plus its `plan-tasks/` briefs — end to end on the current working tree into a new implementation folder, walking the tasks in index order, self-reviewing after each, and auto-committing per task; use when a strict plan needs to be carried to working code in a single agent.

```sh
npx skills add Jei-sKappa/antmay --skill implement-plan
```

#### [`implement-plan-with-subagents`](./suite/skills/implement/implement-plan-with-subagents/SKILL.md)

Execute a strict plan folder — a `plans/<stamp>/plan.md` index plus its `plan-tasks/` briefs — into a new implementation folder through an implementer and a merged two-lane reviewer subagent loop with per-cycle commits; use when a strict plan needs the heavier review path and the runtime supports subagents.

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

Check delivered work against the thread's durable intent and confirm the implementation's report honestly describes what exists — reviewing strictly read-only and recording any findings as a single pending-review bundle; use when an implementation needs a fidelity review before it is accepted.

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

Read a thread's observable state, then advise plausible next actions without inferring hidden operations or writing anything; use when you want a quick, evidence-based read on where a thread stands and what to do next.

```sh
npx skills add Jei-sKappa/antmay --skill whats-next
```

## Primitives

Primitives are **model-invoked**, not user-invoked: another skill or the model itself calls them to perform one narrow, shared operation — you never reach for them directly. They ship as dependencies of the suite, so installing the skills that call them installs these too; the snippets below are here only for completeness.

#### [`allocate-thread`](./suite/skills/primitives/allocate-thread/SKILL.md)

Allocate a normalized thread folder from a caller's complete authorization block — create `docs/threads/<YYMMDDHHMMSSZ-slug>/`, write `seed.md` from the supplied fields, and eagerly create a header-only `log.md`.

```sh
npx skills add Jei-sKappa/antmay --skill allocate-thread
```

#### [`emit-pending-decisions`](./suite/skills/primitives/emit-pending-decisions/SKILL.md)

Queue a producing caller's genuine open human decisions for later — allocate a uniquely named bundle under the active thread's `.pending-decisions/` folder and write its routing header and its points.

```sh
npx skills add Jei-sKappa/antmay --skill emit-pending-decisions
```

#### [`emit-pending-review`](./suite/skills/primitives/emit-pending-review/SKILL.md)

Record a read-only reviewer's already-validated, evidenced findings for a target — allocate a uniquely named bundle under the active thread's `.pending-reviews/` folder and write its routing header and severity-ordered findings.

```sh
npx skills add Jei-sKappa/antmay --skill emit-pending-review
```

#### [`update-implementation-report`](./suite/skills/primitives/update-implementation-report/SKILL.md)

Create or merge one implementation folder's `report.md` in place to describe a caller's verified current outcome — what was delivered, the checks performed, the deviations, and what remains open.

```sh
npx skills add Jei-sKappa/antmay --skill update-implementation-report
```

For the method — the thread layout, the project layer, the lifecycle, and the three recipes — see [`suite/method.md`](./suite/method.md).
