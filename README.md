[![skills.sh](https://skills.sh/b/Jei-sKappa/antmay)](https://skills.sh/Jei-sKappa/antmay)

<p align="center">
  <img src="./assets/antmay-banner.png" alt="Antmay" width="100%">
</p>

# Antmay

**antmay** is the reference repository for the Modular Agentic Workflow — a collection of composable, harness-agnostic `SKILL.md` skills that carry a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk. Every unit of work lives in its own thread under `docs/threads/<thread>/`, holding a self-contained seed, a running decision log, and whatever artifacts the work produces — so a teammate reviewing a PR or a fresh agent session resuming work reads the same durable truth. Skills work inside Claude Code, Codex, Gemini CLI, OpenCode, or any harness that loads `SKILL.md` files.

Skills are not a CLI, a runtime, or a project-local state file. They are individual capabilities you install and compose — either one at a time for a single job, or arranged into one of three built-in workflows that walk a change end-to-end.

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

## Workflows

The three workflows differ only by **process shape** — how much ceremony a change earns. They are subject-neutral: you pick the shape that fits the work, not a router that maps bugs, features, or docs to a track. Every step is a suggestion, never a rule; skipping or adding one never invalidates a thread. A lighter path can grow into a heavier one in place, in the same thread, without starting over.

| Workflow | Process shape |
| --- | --- |
| [**Quick**](./docs/workflows/quick.md) | The smallest delivery path — carry one change from a clarified start straight to implemented code and a recorded outcome, with the fewest artifacts that still leave a durable trail. |
| [**Standard**](./docs/workflows/standard.md) | The full spec-driven path — thread a handoff-grade specification and a prescriptive plan between thread genesis and delivery, kept faithful to the decisions by reconciliation. |
| [**Roadmap**](./docs/workflows/roadmap.md) | Direction and decomposition — explore a larger direction, write it down as a decomposition, and materialize independently executable child threads; then it is done. |

The canonical methodology documentation — the thread model, the seed and decision-log contracts, the workflow paths, and the skill-authoring rules — lives under [`docs/`](./docs/README.md). That is the active reference for all new threads. Read it before opening a thread or writing any workflow artifact.

## Terminal outcomes

Every completion-oriented skill ends its final message with exactly one **terminal outcome** line, so a human or a calling harness can read a run's end state at a glance:

```text
Outcome: <DONE | BLOCKED | REFUSED> — <one-line reason or pointer>
```

`DONE` means the requested job completed (non-blocking concerns included), `BLOCKED` means substantive execution started but stopped — on queued pending decisions or an unfixable defect — and `REFUSED` means preflight prevented the run from starting. This three-token protocol is the suite's only shared status vocabulary. A skill may define **skill-local return tokens** for its own internals — such as the subagent reply tokens and reviewer lane verdicts inside `implement-plan-with-subagents` — but those are private routing inputs, never terminal outcomes, and never appear outside the skill that defines them. Dialogue-driven skills (such as `discussion`, `open-thread`, and `archive-thread`) and the primitives emit no terminal outcome — their questions or their narrow written artifact are the output.

## Skills

Every skill below is **user-invoked**: you (or your harness, routing on the skill's description) start it directly. The [Primitives](#primitives) further down are a separate class — invoked by other skills or the model, never chosen directly.

### Capture & Discussion

#### [`open-thread`](./skills/capture-discussion/open-thread/SKILL.md)

Open a durable workflow thread on disk — interpret the user's idea and an optional tracker ticket, then compose the seed and hand normalized creation to the thread-creation primitive — use when a unit of work needs a home before any proposal, spec, or plan exists.

```sh
npx skills add Jei-sKappa/antmay --skill open-thread
```

#### [`discussion`](./skills/capture-discussion/discussion/SKILL.md)

Conduct an open-ended interview that discovers decision points live and records each settled decision to the thread's decision log — use when the user wants to think a topic through without knowing every question up front.

```sh
npx skills add Jei-sKappa/antmay --skill discussion
```

#### [`resolve-pending-decisions`](./skills/capture-discussion/resolve-pending-decisions/SKILL.md)

Settle the thread's queued pending decisions interactively and record the outcomes — use when a queue of pending-decision bundles is waiting for a human to work through their open questions and turn each settled choice into a durable decision record.

```sh
npx skills add Jei-sKappa/antmay --skill resolve-pending-decisions
```

### Propose

#### [`propose`](./skills/propose/propose/SKILL.md)

Turn a rough prompt or referenced artifact into a freeform, direction-setting proposal.md at a thread root; use when a unit of work needs its direction sketched and written down before it is specified.

```sh
npx skills add Jei-sKappa/antmay --skill propose
```

### Spec

#### [`spec`](./skills/spec/spec/SKILL.md)

Forward-design a thread's durable inputs (seed, decisions, an optional proposal) or a referenced artifact into a handoff-grade spec.md at a thread root; use when an upstream input needs designing into a complete spec a downstream planner or implementer can build from.

```sh
npx skills add Jei-sKappa/antmay --skill spec
```

### Plan

#### [`plan-brief`](./skills/plan/plan-brief/SKILL.md)

Turn a thread's durable inputs or a referenced artifact into a one-screen plan.md at a thread root — an outcome, a small ordered list of steps, and overall verification; use when lightweight work needs a sensible implementation order without the ceremony of a full multi-file plan.

```sh
npx skills add Jei-sKappa/antmay --skill plan-brief
```

#### [`plan-strict`](./skills/plan/plan-strict/SKILL.md)

Turn a spec, proposal, decisions, GitHub issue, or raw prompt into a strict-granularity plan — a thread-root plan.md index plus one dispatchable brief per task under plan-tasks/, each with explicit substeps, files modified, verification, and acceptance criteria; use when the downstream implementer is agent-leaning and needs a prescriptive plan.

```sh
npx skills add Jei-sKappa/antmay --skill plan-strict
```

### Reconcile

Reconciliation makes an authored artifact faithful to the decisions or spec that govern it — correcting supported discrepancies in place and queueing anything that needs a fresh human decision. It is ordinary maintenance, not a review, and produces no review report.

#### [`reconcile-proposal`](./skills/reconcile/reconcile-proposal/SKILL.md)

Align a thread-root proposal.md with the decisions that govern it — correcting supported discrepancies in place and queueing anything that needs a fresh human decision; use when a proposal should be made faithful to its thread's established intent.

```sh
npx skills add Jei-sKappa/antmay --skill reconcile-proposal
```

#### [`reconcile-spec`](./skills/reconcile/reconcile-spec/SKILL.md)

Make a thread-root spec.md a lossless, additive-free expression of the decisions that govern it — adding omitted decisions, correcting contradictions, removing invented commitments, and queueing anything that needs a fresh human decision; use when a spec should be made faithful to its thread's established intent.

```sh
npx skills add Jei-sKappa/antmay --skill reconcile-spec
```

#### [`reconcile-plan`](./skills/reconcile/reconcile-plan/SKILL.md)

Make a thread's strict plan — its plan.md index and plan-tasks/ briefs — faithfully executable against the spec that governs it, repairing plan faults in place and queueing anything that needs a fresh human decision; use when a plan should be made to satisfy its spec.

```sh
npx skills add Jei-sKappa/antmay --skill reconcile-plan
```

#### [`reconcile-roadmap`](./skills/reconcile/reconcile-roadmap/SKILL.md)

Make a thread-root roadmap.md and its decomposition faithful to the decisions that govern the thread — correcting contradictions, adding omitted decisions, removing unsupported commitments, repairing incomplete child briefs, and queueing any decomposition change that alters human intent; use when a roadmap should be brought back in line with its thread's established intent.

```sh
npx skills add Jei-sKappa/antmay --skill reconcile-roadmap
```

### Roadmap

#### [`roadmap`](./skills/roadmap/roadmap/SKILL.md)

Decompose a settled larger initiative into self-contained child-thread briefs — author a thread-root roadmap.md and an eager roadmap-feedback.md — creating no child threads; use when a thread's direction is agreed and needs breaking into independently executable children.

```sh
npx skills add Jei-sKappa/antmay --skill roadmap
```

#### [`materialize-roadmap-threads`](./skills/roadmap/materialize-roadmap-threads/SKILL.md)

Turn a roadmap's child briefs into child threads idempotently — create a thread for each brief that has no materialized reference, skip and verify the ones that do, and stamp each new thread's reference back into its brief; use when a roadmap.md is settled and its children need opening on disk.

```sh
npx skills add Jei-sKappa/antmay --skill materialize-roadmap-threads
```

### Implement

#### [`implement`](./skills/implement/implement/SKILL.md)

Implement a brief plan or a less-structured input (`plan.md`, a seed with its decisions, a code or issue reference, or a raw prompt) end-to-end on the current working tree, deriving implicit tasks, self-reviewing after each task, and auto-committing per task; use when the input needs to be carried to working code in a single agent.

```sh
npx skills add Jei-sKappa/antmay --skill implement
```

#### [`implement-plan`](./skills/implement/implement-plan/SKILL.md)

Execute a strict multi-file plan artifact — a thread-root `plan.md` index plus its `plan-tasks/` briefs — end-to-end on the current working tree, reading the index then each task file in order, self-reviewing after each task, and auto-committing per task; use when a plan needs to be carried to working code in a single agent.

```sh
npx skills add Jei-sKappa/antmay --skill implement-plan
```

#### [`implement-plan-with-subagents`](./skills/implement/implement-plan-with-subagents/SKILL.md)

Execute a strict multi-file plan artifact — a thread-root `plan.md` index plus its `plan-tasks/` briefs — through an implementer and a merged two-lane reviewer subagent loop with per-cycle commits; use when a plan needs the heavier review path and the runtime supports subagents.

```sh
npx skills add Jei-sKappa/antmay --skill implement-plan-with-subagents
```

### Review

Reviews are strictly read-only. A clean review passes in chat and writes nothing; a review with findings records a single pending-review bundle for later attention.

#### [`review-spec`](./skills/review/review-spec/SKILL.md)

Read a thread-root spec.md as a downstream handoff and judge whether another agent could plan and implement from it without hidden conversational context, reporting any findings as a single pending-review bundle; use when a spec should be checked for planning readiness before downstream work.

```sh
npx skills add Jei-sKappa/antmay --skill review-spec
```

#### [`review-roadmap`](./skills/review/review-roadmap/SKILL.md)

Read a thread-root roadmap.md as a decomposition handoff and judge whether each child brief could become an independently executable thread without inventing intent, reporting any findings as a single pending-review bundle; use when a roadmap should be checked for handoff readiness before its children are materialized.

```sh
npx skills add Jei-sKappa/antmay --skill review-roadmap
```

#### [`review-implementation`](./skills/review/review-implementation/SKILL.md)

Check delivered work against the thread's durable intent and confirm the implementation report honestly describes what exists — reviewing strictly read-only and recording any findings as a single pending-review bundle; use when an implementation needs a fidelity review before it is accepted.

```sh
npx skills add Jei-sKappa/antmay --skill review-implementation
```

#### [`review-code`](./skills/review/review-code/SKILL.md)

Judge code on its own intrinsic merits — quality, safety, idioms, and testability — anchored to the thread's durable intent only where intent decides what "right" means, reviewing strictly read-only and recording any findings as a single pending-review bundle; use when code needs a quality review.

```sh
npx skills add Jei-sKappa/antmay --skill review-code
```

### Merge

#### [`merge-artifacts`](./skills/merge/merge-artifacts/SKILL.md)

Reconcile two or more competing candidate drafts of one artifact into a single canonical thread-root artifact, folding every candidate's unique content and settling genuine design divergences as recorded decisions; use when a multi-draft bake-off must be collapsed into one artifact.

```sh
npx skills add Jei-sKappa/antmay --skill merge-artifacts
```

### Finish & Navigate

#### [`finish`](./skills/finish-navigate/finish/SKILL.md)

Inspect what a thread has produced, surface any unresolved delivery signals, then hand the current branch off the way the user chooses — create a PR, merge into a confirmed target, or leave as-is; use when work is ready to deliver and you want an evidence-backed branch handoff.

```sh
npx skills add Jei-sKappa/antmay --skill finish
```

#### [`whats-next`](./skills/finish-navigate/whats-next/SKILL.md)

Read a thread's observable state — its location, seed, decisions, canonical artifacts, pending bundles, run state, and branch — then advise plausible next actions without inferring hidden operations or writing anything; use when you want a quick, evidence-based read on where a thread stands and what to do next.

```sh
npx skills add Jei-sKappa/antmay --skill whats-next
```

#### [`archive-thread`](./skills/finish-navigate/archive-thread/SKILL.md)

Relocate a workflow thread into docs/threads/archive/ so the active docs/threads/ listing shows only live work; use when the user explicitly asks to archive a finished or abandoned thread and declutter the listing.

```sh
npx skills add Jei-sKappa/antmay --skill archive-thread
```

## Primitives

Primitives are **model-invoked**, not user-invoked: another skill or the model itself calls them to perform one narrow, shared operation — you never reach for them directly. They ship as dependencies of the suite, so installing the skills that call them installs these too; the snippets below are here only for completeness.

#### [`emit-pending-decisions`](./skills/primitives/emit-pending-decisions/SKILL.md)

Queue a producing caller's genuine open human decisions for later — allocate a uniquely named bundle under the active thread's `.pending-decisions/` folder, write its routing header and advisory follow-up, and normalize each decision into a canonical discussion point.

```sh
npx skills add Jei-sKappa/antmay --skill emit-pending-decisions
```

#### [`emit-pending-review`](./skills/primitives/emit-pending-review/SKILL.md)

Record a read-only reviewer's already-validated, evidenced, categorized findings — allocate a uniquely named bundle under the active thread's `.pending-reviews/` folder and write its routing header and severity-ordered findings.

```sh
npx skills add Jei-sKappa/antmay --skill emit-pending-review
```

#### [`allocate-thread`](./skills/primitives/allocate-thread/SKILL.md)

Allocate a normalized thread folder from a caller's complete authorization block — create `docs/threads/<YYMMDDHHMMSSZ-slug>/`, write `seed.md` from the supplied fields, and eagerly create a header-only `decisions.md`.

```sh
npx skills add Jei-sKappa/antmay --skill allocate-thread
```

#### [`update-implementation-report`](./skills/primitives/update-implementation-report/SKILL.md)

Create or merge the thread's singleton `implementation-report.md` in place to describe an implementation caller's verified current outcome — the changes made, checks performed, deviations, remaining concerns, and follow-ups.

```sh
npx skills add Jei-sKappa/antmay --skill update-implementation-report
```

#### [`append-roadmap-feedback`](./skills/primitives/append-roadmap-feedback/SKILL.md)

Record a descendant thread's parent- or sibling-level discovery — the affected briefs or direction, self-contained evidence, the impact, and a recommendation — as the next append-only record in the parent thread's `roadmap-feedback.md`.

```sh
npx skills add Jei-sKappa/antmay --skill append-roadmap-feedback
```

For the workflow methodology — the thread model, the seed and decision-log contracts, the three workflow paths, and the skill-authoring rules — see [`docs/`](./docs/README.md), the reference for all new threads.
