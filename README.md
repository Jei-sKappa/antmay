[![skills.sh](https://skills.sh/b/Jei-sKappa/skills)](https://skills.sh/Jei-sKappa/skills)

# Jei-sKappa's Skills

A personal collection of refined `SKILL.md` files — composable, harness-agnostic skills that carry a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk. Every unit of work lives in its own thread under `docs/threads/<thread>/`, holding a self-contained seed, a running decision log, and whatever artifacts the work produces — so a teammate reviewing a PR or a fresh agent session resuming work reads the same durable truth. Skills work inside Claude Code, Codex, Gemini CLI, OpenCode, or any harness that loads `SKILL.md` files.

Skills are not a CLI, a runtime, or a project-local state file. They are individual capabilities you install and compose — either one at a time for a single job, or arranged into one of three built-in workflows that walk a change end-to-end.

## Workflows

The three workflows differ only by **process shape** — how much ceremony a change earns. They are subject-neutral: you pick the shape that fits the work, not a router that maps bugs, features, or docs to a track. Every step is a suggestion, never a rule; skipping or adding one never invalidates a thread. A lighter path can grow into a heavier one in place, in the same thread, without starting over.

| Workflow | Process shape |
| --- | --- |
| [**Quick**](./docs/project/v3/workflows/quick.md) | The smallest delivery path — carry one change from a clarified start straight to implemented code and a recorded outcome, with the fewest artifacts that still leave a durable trail. |
| [**Standard**](./docs/project/v3/workflows/standard.md) | The full spec-driven path — thread a handoff-grade specification and a prescriptive plan between thread genesis and delivery, kept faithful to the decisions by reconciliation. |
| [**Roadmap**](./docs/project/v3/workflows/roadmap.md) | Direction and decomposition — explore a larger direction, write it down as a decomposition, and materialize independently executable child threads; then it is done. |

The canonical methodology documentation — the thread model, the seed and decision-log contracts, the workflow paths, and the skill-authoring rules — lives under [`docs/project/v3/`](./docs/project/v3/README.md). That is the active reference for all new threads. Read it before opening a thread or writing any workflow artifact.

## Skills

Every skill below is **user-invoked**: you (or your harness, routing on the skill's description) start it directly. The [Primitives](#primitives) further down are a separate class — invoked by other skills or the model, never chosen directly.

### Capture & Discussion

#### [`open-thread`](./skills/workflow/capture-discussion/open-thread/SKILL.md)

Open a durable workflow thread on disk — interpret the user's idea, an optional tracker ticket, and a chosen workflow, then compose the seed and hand normalized creation to the thread-creation primitive — use when a unit of work needs a home before any proposal, spec, or plan exists.

```sh
npx skills add Jei-sKappa/skills --skill open-thread
```

#### [`open-ticket`](./skills/workflow/capture-discussion/open-ticket/SKILL.md)

Create a remote tracker ticket (GitHub Issues, Jira, Linear, ClickUp, …) from a brand-new idea — use when an idea needs a work-item home in the team's tracker before (or instead of) a local thread, so a later thread can link it as read-context.

```sh
npx skills add Jei-sKappa/skills --skill open-ticket
```

#### [`discussion`](./skills/workflow/capture-discussion/discussion/SKILL.md)

Conduct an open-ended interview that discovers decision points live and records each settled decision to the thread's decision log — use when the user wants to think a topic through without knowing every question up front.

```sh
npx skills add Jei-sKappa/skills --skill discussion
```

#### [`resolve-pending-decisions`](./skills/workflow/capture-discussion/resolve-pending-decisions/SKILL.md)

Settle the thread's queued pending decisions interactively and record the outcomes — use when a queue of pending-decision bundles is waiting for a human to work through their open questions and turn each settled choice into a durable decision record.

```sh
npx skills add Jei-sKappa/skills --skill resolve-pending-decisions
```

### Propose

#### [`propose`](./skills/workflow/propose/propose/SKILL.md)

Turn a rough prompt or referenced artifact into a freeform, direction-setting proposal.md at a thread root; use when a unit of work needs its direction sketched and written down before it is specified.

```sh
npx skills add Jei-sKappa/skills --skill propose
```

### Spec

#### [`spec`](./skills/workflow/spec/spec/SKILL.md)

Forward-design a thread's durable inputs (seed, decisions, an optional proposal) or a referenced artifact into a handoff-grade spec.md at a thread root; use when an upstream input needs designing into a complete spec a downstream planner or implementer can build from.

```sh
npx skills add Jei-sKappa/skills --skill spec
```

### Plan

#### [`plan-brief`](./skills/workflow/plan/plan-brief/SKILL.md)

Turn a thread's durable inputs or a referenced artifact into a one-screen plan.md at a thread root — an outcome, a small ordered list of steps, and overall verification; use when lightweight work needs a sensible implementation order without the ceremony of a full multi-file plan.

```sh
npx skills add Jei-sKappa/skills --skill plan-brief
```

#### [`plan-strict`](./skills/workflow/plan/plan-strict/SKILL.md)

Turn a spec, proposal, decisions, GitHub issue, or raw prompt into a strict-granularity plan — a thread-root plan.md index plus one dispatchable brief per task under plan-tasks/, each with explicit substeps, files modified, verification, and acceptance criteria; use when the downstream implementer is agent-leaning and needs a prescriptive plan.

```sh
npx skills add Jei-sKappa/skills --skill plan-strict
```

### Reconcile

Reconciliation makes an authored artifact faithful to the decisions or spec that govern it — correcting supported discrepancies in place and queueing anything that needs a fresh human decision. It is ordinary maintenance, not a review, and produces no review report.

#### [`reconcile-proposal`](./skills/workflow/reconcile/reconcile-proposal/SKILL.md)

Align a thread-root proposal.md with the decisions that govern it — correcting supported discrepancies in place and queueing anything that needs a fresh human decision; use when a proposal should be made faithful to its thread's established intent.

```sh
npx skills add Jei-sKappa/skills --skill reconcile-proposal
```

#### [`reconcile-spec`](./skills/workflow/reconcile/reconcile-spec/SKILL.md)

Make a thread-root spec.md a lossless, additive-free expression of the decisions that govern it — adding omitted decisions, correcting contradictions, removing invented commitments, and queueing anything that needs a fresh human decision; use when a spec should be made faithful to its thread's established intent.

```sh
npx skills add Jei-sKappa/skills --skill reconcile-spec
```

#### [`reconcile-plan`](./skills/workflow/reconcile/reconcile-plan/SKILL.md)

Make a thread's strict plan — its plan.md index and plan-tasks/ briefs — faithfully executable against the spec that governs it, repairing plan faults in place and queueing anything that needs a fresh human decision; use when a plan should be made to satisfy its spec.

```sh
npx skills add Jei-sKappa/skills --skill reconcile-plan
```

#### [`reconcile-roadmap`](./skills/workflow/reconcile/reconcile-roadmap/SKILL.md)

Make a thread-root roadmap.md and its decomposition faithful to the decisions that govern the thread — correcting contradictions, adding omitted decisions, removing unsupported commitments, repairing incomplete child briefs, and queueing any decomposition change that alters human intent; use when a roadmap should be brought back in line with its thread's established intent.

```sh
npx skills add Jei-sKappa/skills --skill reconcile-roadmap
```

### Roadmap

#### [`roadmap`](./skills/workflow/roadmap/roadmap/SKILL.md)

Decompose a settled larger initiative into self-contained child-thread briefs — author a thread-root roadmap.md and an eager roadmap-feedback.md — creating no child threads; use when a thread's direction is agreed and needs breaking into independently executable children.

```sh
npx skills add Jei-sKappa/skills --skill roadmap
```

#### [`materialize-roadmap-threads`](./skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md)

Turn a roadmap's child briefs into child threads idempotently — create a thread for each brief that has no materialized reference, skip and verify the ones that do, and stamp each new thread's reference back into its brief; use when a roadmap.md is settled and its children need opening on disk.

```sh
npx skills add Jei-sKappa/skills --skill materialize-roadmap-threads
```

### Implement

#### [`implement`](./skills/workflow/implement/implement/SKILL.md)

Implement a brief plan or a less-structured input (`plan.md`, a seed with its decisions, a code or issue reference, or a raw prompt) end-to-end on the current working tree, deriving implicit tasks, self-reviewing after each task, and auto-committing per task; use when the input needs to be carried to working code in a single agent.

```sh
npx skills add Jei-sKappa/skills --skill implement
```

#### [`implement-plan`](./skills/workflow/implement/implement-plan/SKILL.md)

Execute a strict multi-file plan artifact — a thread-root `plan.md` index plus its `plan-tasks/` briefs — end-to-end on the current working tree, reading the index then each task file in order, self-reviewing after each task, and auto-committing per task; use when a plan needs to be carried to working code in a single agent.

```sh
npx skills add Jei-sKappa/skills --skill implement-plan
```

#### [`implement-plan-with-subagents`](./skills/workflow/implement/implement-plan-with-subagents/SKILL.md)

Execute a strict multi-file plan artifact — a thread-root `plan.md` index plus its `plan-tasks/` briefs — through an implementer and a merged two-lane reviewer subagent loop with per-cycle commits; use when a plan needs the heavier review path and the runtime supports subagents.

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-with-subagents
```

### Review

Reviews are strictly read-only. A clean review passes in chat and writes nothing; a review with findings records a single pending-review bundle for later attention.

#### [`review-spec`](./skills/workflow/review/review-spec/SKILL.md)

Read a thread-root spec.md as a downstream handoff and judge whether another agent could plan and implement from it without hidden conversational context, reporting any findings as a single pending-review bundle; use when a spec should be checked for planning readiness before downstream work.

```sh
npx skills add Jei-sKappa/skills --skill review-spec
```

#### [`review-roadmap`](./skills/workflow/review/review-roadmap/SKILL.md)

Read a thread-root roadmap.md as a decomposition handoff and judge whether each child brief could become an independently executable thread without inventing intent, reporting any findings as a single pending-review bundle; use when a roadmap should be checked for handoff readiness before its children are materialized.

```sh
npx skills add Jei-sKappa/skills --skill review-roadmap
```

#### [`review-implementation`](./skills/workflow/review/review-implementation/SKILL.md)

Check delivered work against the thread's durable intent and confirm the implementation report honestly describes what exists — reviewing strictly read-only and recording any findings as a single pending-review bundle; use when an implementation needs a fidelity review before it is accepted.

```sh
npx skills add Jei-sKappa/skills --skill review-implementation
```

#### [`review-code`](./skills/workflow/review/review-code/SKILL.md)

Judge code on its own intrinsic merits — quality, safety, idioms, and testability — anchored to the thread's durable intent only where intent decides what "right" means, reviewing strictly read-only and recording any findings as a single pending-review bundle; use when code needs a quality review.

```sh
npx skills add Jei-sKappa/skills --skill review-code
```

### Merge

#### [`merge-artifacts`](./skills/workflow/merge/merge-artifacts/SKILL.md)

Reconcile two or more competing candidate drafts of one artifact into a single canonical thread-root artifact, folding every candidate's unique content and settling genuine design divergences as recorded decisions; use when a multi-draft bake-off must be collapsed into one artifact.

```sh
npx skills add Jei-sKappa/skills --skill merge-artifacts
```

### Finish & Navigate

#### [`finish`](./skills/workflow/finish-navigate/finish/SKILL.md)

Inspect what a thread has produced, surface any unresolved delivery signals, then hand the current branch off the way the user chooses — create a PR, merge into a confirmed target, or leave as-is; use when work is ready to deliver and you want an evidence-backed branch handoff.

```sh
npx skills add Jei-sKappa/skills --skill finish
```

#### [`whats-next`](./skills/workflow/finish-navigate/whats-next/SKILL.md)

Read a thread's observable state — its location, seed suggestion, decisions, canonical artifacts, pending bundles, run state, and branch — then advise plausible next actions without inferring hidden operations or writing anything; use when you want a quick, evidence-based read on where a thread stands and what to do next.

```sh
npx skills add Jei-sKappa/skills --skill whats-next
```

#### [`archive-thread`](./skills/workflow/finish-navigate/archive-thread/SKILL.md)

Relocate a workflow thread into docs/threads/archive/ so the active docs/threads/ listing shows only live work; use when the user explicitly asks to archive a finished or abandoned thread and declutter the listing.

```sh
npx skills add Jei-sKappa/skills --skill archive-thread
```

### Research

#### [`afk-exploration`](./skills/workflow/research/afk-exploration/SKILL.md)

Start AFK exploration on a topic only when the user explicitly asks for AFK research or exploration.

```sh
npx skills add Jei-sKappa/skills --skill afk-exploration
```

#### [`the-librarian`](./skills/workflow/research/the-librarian/SKILL.md)

Route local reference-repository work to stock, consult, or research flows when the user wants to clone repos into the library, consult stocked repos, or produce in-depth reports from them.

```sh
npx skills add Jei-sKappa/skills --skill the-librarian
```

### Documentation

#### [`take-snapshot`](./skills/workflow/documentation/take-snapshot/SKILL.md)

Derive a comprehensive, stack-agnostic snapshot document of an existing codebase when the user wants a hybrid SRS and PRD for a 1:1 rebuild, rewrite, port, or documentation pass without migration or target-stack guidance.

```sh
npx skills add Jei-sKappa/skills --skill take-snapshot
```

### Handoff

#### [`brief-the-recipient`](./skills/workflow/handoff/brief-the-recipient/SKILL.md)

Draft a self-contained outcome briefing — verdict, rationale, caveats, and pointers — when the user wants the conclusion of the current discussion packaged as a paste-ready handoff for a fresh AI session, a follow-up task, or a teammate (manager, reviewer, future-you, anyone receiving the conclusion).

```sh
npx skills add Jei-sKappa/skills --skill brief-the-recipient
```

#### [`consult-the-expert`](./skills/workflow/handoff/consult-the-expert/SKILL.md)

Draft a casual, context-rich message to consult a more experienced developer when the user needs help framing a technical problem, decision, or blocker for someone with no prior context.

```sh
npx skills add Jei-sKappa/skills --skill consult-the-expert
```

#### [`report-to-the-owner`](./skills/workflow/handoff/report-to-the-owner/SKILL.md)

Draft a casual, context-rich message to a code owner when the user has hit a blocker in code owned elsewhere and wants to hand off the issue with a proposed change rather than ask for advice.

```sh
npx skills add Jei-sKappa/skills --skill report-to-the-owner
```

### Support

#### [`meta-prompting`](./skills/workflow/support/meta-prompting/SKILL.md)

Refine a draft prompt for a fresh AI session only when the user explicitly mentions "meta-prompt" or "meta-prompting".

```sh
npx skills add Jei-sKappa/skills --skill meta-prompting
```

## Primitives

Primitives are **model-invoked**, not user-invoked: another skill or the model itself calls them to perform one narrow, shared operation — you never reach for them directly. They ship as dependencies of the suite, so installing the skills that call them installs these too; the snippets below are here only for completeness.

#### [`discussion-point`](./skills/workflow/primitives/discussion-point/SKILL.md)

Frame exactly one concrete decision fork or finding — a title, the point, what you need to know, options or a proposed solution, and a recommendation — and either present it interactively in chat or emit it into a caller-provided file, one point at a time.

```sh
npx skills add Jei-sKappa/skills --skill discussion-point
```

#### [`emit-pending-decisions`](./skills/workflow/primitives/emit-pending-decisions/SKILL.md)

Queue a producing caller's genuine open human decisions for later — allocate a uniquely named bundle under the active thread's `.pending-decisions/` folder, write its routing header and advisory follow-up, and normalize each decision into a canonical discussion point.

```sh
npx skills add Jei-sKappa/skills --skill emit-pending-decisions
```

#### [`emit-pending-review`](./skills/workflow/primitives/emit-pending-review/SKILL.md)

Record a read-only reviewer's already-validated, evidenced, categorized findings — allocate a uniquely named bundle under the active thread's `.pending-reviews/` folder and write its routing header and severity-ordered findings.

```sh
npx skills add Jei-sKappa/skills --skill emit-pending-review
```

#### [`create-thread`](./skills/workflow/primitives/create-thread/SKILL.md)

Allocate a normalized thread folder from a caller's complete authorization block — create `docs/threads/<YYMMDDHHMMSSZ-slug>/`, write `seed.md` from the supplied fields, and eagerly create a header-only `decisions.md`.

```sh
npx skills add Jei-sKappa/skills --skill create-thread
```

#### [`update-implementation-report`](./skills/workflow/primitives/update-implementation-report/SKILL.md)

Create or merge the thread's singleton `implementation-report.md` in place to describe an implementation caller's verified current outcome — the changes made, checks performed, deviations, remaining concerns, and follow-ups.

```sh
npx skills add Jei-sKappa/skills --skill update-implementation-report
```

#### [`append-roadmap-feedback`](./skills/workflow/primitives/append-roadmap-feedback/SKILL.md)

Record a descendant thread's parent- or sibling-level discovery — the affected briefs or direction, self-contained evidence, the impact, and a recommendation — as the next append-only record in the parent thread's `roadmap-feedback.md`.

```sh
npx skills add Jei-sKappa/skills --skill append-roadmap-feedback
```

## Retired skills

These skills have left the active suite. Each legacy folder remains on disk under `skills/deprecated/<name>` so existing installs do not break; new installs should pick the replacement noted below.

- **`adjust-plan-granularity`** — a plan that no longer fits is now edited alive in place or recompiled from its inputs, so there is no separate granularity-adjustment step. Kept at `skills/deprecated/adjust-plan-granularity`.
- **`capture-inbox`** — there is no inbox concept: a unit of work gets its durable home by opening a thread directly with `open-thread` (local) or a tracker work-item with `open-ticket` (remote). Kept at `skills/deprecated/capture-inbox`.
- **`discussion-loop`** — split into `discussion` (open-ended interviews) and the `discussion-point` primitive (framing a single point). Kept at `skills/deprecated/discussion-loop`.
- **`record-verdict`** — human decisions and verdicts are now recorded directly as records in the thread's `decisions.md`; there is no separate status latch to stamp. Kept at `skills/deprecated/record-verdict`.
- **`review-decision-document`** — evolved into `review-spec`, which checks a spec's planning readiness. Kept at `skills/deprecated/review-decision-document`.
- **`review-lossless-mapping`** — its lossless, additive-free fidelity check folded into the reconcile skills (`reconcile-spec` makes a spec a lossless, additive-free expression of its decisions). Kept at `skills/deprecated/review-lossless-mapping`.
- **`seeded-discussion`** — superseded by `discussion` composed with the `discussion-point` primitive for walking a predetermined list of points. Kept at `skills/deprecated/seeded-discussion`.

## Installation

Install any skill individually via:

```sh
npx skills add Jei-sKappa/skills --skill <skill-name>
```

For example, to install the spec generator:

```sh
npx skills add Jei-sKappa/skills --skill spec
```

Skills are grouped under one marketplace plugin per `skills/workflow/` folder — for example `JeisKappa-plan` (rendered as **`JeisKappa Plan`**), `JeisKappa-reconcile` (**`JeisKappa Reconcile`**), `JeisKappa-roadmap` (**`JeisKappa Roadmap`**), `JeisKappa-primitives` (**`JeisKappa Primitives`**), and so on. Retired skills live under `JeisKappa-deprecated`. Dashes in the plugin name are split into spaces and each segment capitalized in `npx skills list`.

For the workflow methodology — the thread model, the seed and decision-log contracts, the three workflow paths, and the skill-authoring rules — see [`docs/project/v3/`](./docs/project/v3/README.md), the active reference for all new threads. The earlier `docs/workflow/v2/` and `docs/workflow/v1/` document sets remain on disk as grandfathered history for pre-V3 threads only (never migrated, never mixed).

## Raycast extension

The Raycast extension under [`raycast-extension/`](./raycast-extension) turns each skill into a paste-ready prompt. Pick a skill from the search list, type your prompt, and the wrapped output lands on your clipboard:

```
<instruction>
<references>
<reference path="references/foo.md">…</reference>
</references>

…skill body…
</instruction>

…your prompt…
```

Skills that have a `references/` folder get their reference files inlined automatically at the top of `<instruction>` (long static documents first, instructions next, the user's prompt last — the layout LLMs handle best). For those skills, the picker shows a paperclip accessory with the file count, and an opt-out "Copy Without References" action is available for cases where you want a slimmer instruction.

It is useful in three distinct cases — not just the first one:

- **No bulk install.** The catalog is large and still growing. Instead of running `npx skills add …` for every skill you might one day need, keep the source of truth here and pull only the skill you actually need, when you need it.
- **Maximum control over which skill runs.** A harness that auto-routes on skill descriptions can pick one you did not intend. Wrapping a skill into a copied prompt makes skills strictly opt-in — nothing fires until you paste it.
- **Cross-harness portability.** Works with any chat-style agent, including ones that have no notion of skills at all, because the output is just a wrapped instruction plus your prompt.

The extension is purely derived: `raycast-extension/assets/skills.json` is regenerated from `skills/**/SKILL.md` by [`raycast-extension/scripts/sync-skills-to-raycast.mjs`](./raycast-extension/scripts/sync-skills-to-raycast.mjs) and the sync runs automatically as part of `npm run dev` / `npm run build` inside the extension folder.

```sh
cd raycast-extension
npm install
npm run dev    # syncs skills, then starts Raycast dev mode
```

See [`raycast-extension/README.md`](./raycast-extension/README.md) for details.
