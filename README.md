[![skills.sh](https://skills.sh/b/Jei-sKappa/skills)](https://skills.sh/Jei-sKappa/skills)

# Jei-sKappa's Skills

A personal collection of refined `SKILL.md` files — anchored by the **Modular Agentic Workflow V2**, a composable, harness-agnostic, spec-driven toolbox that drives a feature end-to-end through reviewable Markdown artifacts on disk.

## Toolbox Model

The workflow is a TOOLBOX of installable skills — not a CLI, not a runtime, not a project-local state file. Every spine stage is OPTIONAL and tier-gated: a user picking up a single skill or composing the whole spine (`seed → discussion(s) → [proposal] → spec → plan → implement → verify → finish`) can drive a feature end-to-end. Every artifact is reviewable Markdown on disk under `docs/threads/<thread>/` — spine artifacts in lineage folders (`specs/NNN/spec.md`), an append-only `ledger.md` at the thread root, and status that is **derived** on demand (event-sourced from the ledger and frontmatter latches) rather than stored in a state file or encoded in a folder name — so a teammate reviewing a PR or a fresh agent session resuming work has the same view of the truth. Skills are HARNESS-AGNOSTIC — they work inside Claude Code, Codex, Gemini CLI, OpenCode, or any harness that loads `SKILL.md` files. Cross-cutting modules (capture, discussion, review, merge, navigation) attach anywhere on the spine — pick the one you need at the moment you need it.

## Layered Workflow Map

The workflow has TWO layers: a forward spine of artifact-producing stages, and overlay modules that attach anywhere on that spine.

| Layer      | Members                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------ |
| **Spine**  | `seed → discussion(s) → [proposal] → spec → plan → implement → verify → finish`                  |
| Capture    | `open-thread` (local thread + seed + ledger) / `open-ticket` (remote tracker ticket)             |
| Discussion | `discussion` / `seeded-discussion`                                                               |
| Review     | `review-{proposal,spec,plan,implementation,code}` / `review-lossless-mapping`                    |
| Merge      | `merge-artifacts`                                                                                 |
| Navigation | `whats-next` (derived-status reader)                                                             |

```
                  (overlay modules attach anywhere)
                  capture / discussion / review / merge / navigation
                                   │
                                   ▼
   seed ─► discussion(s) ─► [proposal] ─► spec ─► plan ─► implement ─► verify ─► finish
```

Each thread lives at `docs/threads/<YYMMDDHHMMSSZ-slug>/`: an append-only `ledger.md` at the root tracks the thread's tier and disposition, spine artifacts live in lineage folders (`specs/NNN/spec.md`), and records (discussions, reviews, implementation reports) attach to the spine node they serve. There is **no inbox** — a unit of work gets its durable home by opening a thread (`open-thread`) or a tracker work-item (`open-ticket`), and status is **derived** on demand from the ledger and frontmatter latches rather than stored. The spine is the typical forward order; you may skip stages, loop back, or invoke an overlay module between any two spine stages.

## Recommended Common Paths

| Use case                                | Path                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Implementing a feature from rough idea  | `discussion → propose → spec → plan-strict → implement-plan-with-subagents → review-implementation → finish` (canonical full workflow) |
| Fixing a bug                            | `implement → review-code → finish`                                                                                                |
| Exploring an idea                       | `discussion → propose` (no further commitment)                                                                                    |
| Refining a plan                         | `plan-strict → review-plan → adjust-plan-granularity → implement-plan`                                                            |
| Reconciling two artifact variants       | `merge-artifacts → review-spec → finish`                                                                                          |

Each path is one valid composition — not the only valid composition. Pick the entry point that matches what you have in hand and stop when you've shipped the outcome you wanted.

## Steering interactivity

Every spine skill runs autonomously by default but stays steerable — interactivity is a usage pattern, not a separate skill. To keep a human in the loop, run a `discussion` (or `seeded-discussion`) before invoking the skill, or append a steering instruction to the invocation (for example, asking it to check in at each step or walk the findings with you). The skill honors that steer instead of running straight through.

## Skills by Module

### Capture & Discussion

#### [`open-thread`](./skills/workflow/capture-discussion/open-thread/SKILL.md)

Open a local workflow thread from either a brand-new idea or an existing tracker ticket — writing the thread folder, the one frozen seed, and the lifecycle ledger with its initial tier line — use when a unit of work needs a durable home on disk before any proposal, spec, or plan exists.

```sh
npx skills add Jei-sKappa/skills --skill open-thread
```

#### [`open-ticket`](./skills/workflow/capture-discussion/open-ticket/SKILL.md)

Create a remote tracker ticket (GitHub Issues, Jira, Linear, ClickUp, …) from a brand-new idea — the only skill in the workflow that writes to the tracker — use when an idea needs a work-item home in the team's tracker before (or instead of) a local thread, so a later thread can link it from its seed.

```sh
npx skills add Jei-sKappa/skills --skill open-ticket
```

#### [`discussion`](./skills/workflow/capture-discussion/discussion/SKILL.md)

Conduct an open-ended interview where questions are discovered live, surfacing options or a recommendation only at concrete decision points and appending decisions to a target-scoped log when the user wants to think a topic through without knowing every question up front.

```sh
npx skills add Jei-sKappa/skills --skill discussion
```

#### [`seeded-discussion`](./skills/workflow/capture-discussion/seeded-discussion/SKILL.md)

Walk a predetermined list of discussion points one at a time, presenting options or a single well-argued recommendation for each and appending decisions worth keeping to a target-scoped log when the user already has concrete points to settle.

```sh
npx skills add Jei-sKappa/skills --skill seeded-discussion
```

### Propose

#### [`propose`](./skills/workflow/propose/propose/SKILL.md)

End-to-end proposal generation — turns a rough prompt (or a referenced artifact) into a freeform proposal artifact in its lineage folder (`proposals/NNN/proposal.md`); the proposal carries its lifecycle in a frontmatter `status:` map (`approved` / `rejected` latches) and its condition is derived. Useful when a tier-3 initiative needs its direction sketched and written down.

```sh
npx skills add Jei-sKappa/skills --skill propose
```

> **Note:** Adversarial review (pre-mortem, red-team) is delegated to the external `the-fool` skill — there is no native adversarial-review skill in this suite. Use `the-fool` against a proposal or spec draft to surface adversarial risks before the spec / plan / implementation stages.

### Spec

#### [`spec`](./skills/workflow/spec/spec/SKILL.md)

End-to-end spec generation — turns a proposal, decision log, GitHub issue, or raw prompt into a handoff-grade spec artifact in its lineage folder (`specs/NNN/spec.md`), covering all eight semantic-contract elements (intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance) — plus a Degrees-of-freedom section and, at tier ≥2, machine-checkable acceptance criteria; the spec's lifecycle lives in a frontmatter `status:` map (`approved` then `implemented` latches). Forward-design only — for reverse-engineering a spec FROM an existing codebase use [`take-snapshot`](./skills/workflow/documentation/take-snapshot/SKILL.md) instead.

```sh
npx skills add Jei-sKappa/skills --skill spec
```

### Plan

#### [`plan-loose`](./skills/workflow/plan/plan-loose/SKILL.md)

Loose-granularity plan generation — turns a spec, proposal, decision log, GitHub issue, or raw prompt into a loose-granularity plan artifact in its lineage folder (`plans/NNN/plan.md`), end-to-end. Loose plans use brief 1–3 sentence task descriptions optimized for a human-leaning implementer who fills in details. Plans are sequential, isolated, independently implementable, self-reviewed before emission, carry no stored status (the plan is a disposable compiler-IR — the spec and its acceptance criteria are the contract), are edited alive in place rather than re-versioned, and are NEVER auto-committed.

```sh
npx skills add Jei-sKappa/skills --skill plan-loose
```

#### [`plan-strict`](./skills/workflow/plan/plan-strict/SKILL.md)

Strict-granularity plan generation — turns a spec, proposal, decision log, GitHub issue, or raw prompt into a strict-granularity plan artifact in its lineage folder (`plans/NNN/plan.md`), end-to-end. Strict plans carry explicit substeps, verification notes, files modified, and acceptance criteria per task — optimized for an agent-leaning implementer that needs unambiguous prescriptive steps; the plan carries no stored status and is edited alive in place.

```sh
npx skills add Jei-sKappa/skills --skill plan-strict
```

#### [`adjust-plan-granularity`](./skills/workflow/plan/adjust-plan-granularity/SKILL.md)

Adjust an existing living plan to a new granularity level by editing it in place when the current plan is too loose, too strict, or otherwise mismatched to the intended implementer.

```sh
npx skills add Jei-sKappa/skills --skill adjust-plan-granularity
```

### Implement

#### [`implement`](./skills/workflow/implement/implement/SKILL.md)

End-to-end implementation from less-structured input — takes a spec, proposal, decision log, GitHub issue, code context, or raw prompt and implements it on the current working tree, deriving implicit tasks from the input itself, self-reviewing after each task, and auto-committing per implicit task. Single-agent (current session + self-review); no subagents are spawned. Reads the thread ledger for tier and disposition, reports each implicit task by the four-state status protocol (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`), and emits a single immutable implementation report record on the way out. Never rewrites history — no `--amend`, no rebase, no force-push.

```sh
npx skills add Jei-sKappa/skills --skill implement
```

#### [`implement-plan`](./skills/workflow/implement/implement-plan/SKILL.md)

Plan-driven implementation — takes a plan artifact path (loose or strict granularity, produced by any of the `plan-*` skills) and executes every plan task in order on the current working tree, self-reviewing after each task and auto-committing per plan task. Single-agent (current session + self-review); no subagents are spawned. Reports each plan task by the four-state status protocol and emits a single immutable implementation report record on the way out. Never rewrites history.

```sh
npx skills add Jei-sKappa/skills --skill implement-plan
```

#### [`implement-plan-with-subagents`](./skills/workflow/implement/implement-plan-with-subagents/SKILL.md)

Plan-driven implementation with subagent dual-review loop — takes a plan artifact path and executes every plan task in order by orchestrating a dispatch loop: implementer subagent → plan-compliance reviewer subagent (first pass) → fix loop respawning a NEW implementer with re-review until pass → code-quality reviewer subagent (second pass) → same fix loop — and auto-commits per orchestration cycle. REQUIRES subagent capability (no inline fallback). Reports each plan task by the four-state status protocol with the subagent audit and emits a single immutable implementation report record on the way out. Never rewrites history.

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-with-subagents
```

### Review

> **Note:** Verification of implementations is covered by `review-implementation`, which checks the implementation against the spec's acceptance criteria — there is no separate `verify-*` skill in this suite.
>
> **Note:** Adversarial review (pre-mortem, red-team) is delegated to the external `the-fool` skill — there is no native adversarial-review skill in this suite. Use `the-fool` against a proposal or spec draft to surface adversarial risks before the spec / plan / implementation stages.

#### [`review-proposal`](./skills/workflow/review/review-proposal/SKILL.md)

Read a proposal artifact and write a references-first review report into the proposal's reviews/ folder, covering gaps, risks, ambiguities, and consistency with the thread's decision logs.

```sh
npx skills add Jei-sKappa/skills --skill review-proposal
```

#### [`review-spec`](./skills/workflow/review/review-spec/SKILL.md)

Read a spec artifact and write a references-first review report checking all eight semantic-contract elements against the handoff-grade bar and consistency with the thread's decision logs.

```sh
npx skills add Jei-sKappa/skills --skill review-spec
```

#### [`review-plan`](./skills/workflow/review/review-plan/SKILL.md)

Read a plan artifact and write a references-first adherence review that checks the plan against its spec, sorts the result into one of four outcomes, auto-fixes plan-fault deviations, and routes spec-fault findings to the human.

```sh
npx skills add Jei-sKappa/skills --skill review-plan
```

#### [`review-implementation`](./skills/workflow/review/review-implementation/SKILL.md)

Verify an implementation against its spec's acceptance criteria and write a references-first review record capturing acceptance, constraint, scope, behavior, and test-coverage findings.

```sh
npx skills add Jei-sKappa/skills --skill review-implementation
```

#### [`review-code`](./skills/workflow/review/review-code/SKILL.md)

Read a code reference and write a references-first code-quality review report covering quality, safety, idioms, and testability, anchored to the spec's acceptance criteria as the definition of right.

```sh
npx skills add Jei-sKappa/skills --skill review-code
```

#### [`review-lossless-mapping`](./skills/workflow/review/review-lossless-mapping/SKILL.md)

Read a set of discussions and the document produced from them, then write a references-first review report verifying the mapping is lossless and additive-free — flagging only smuggled-in decisions/assumptions and dropped user decisions — when the user wants to confirm a document (typically a spec) committed to nothing the user did not see and accept and left nothing out.

```sh
npx skills add Jei-sKappa/skills --skill review-lossless-mapping
```

### Merge

#### [`merge-artifacts`](./skills/workflow/merge/merge-artifacts/SKILL.md)

Reconcile two or more competing candidate drafts of one artifact into the single canonical artifact, folding non-conflicting content and preserving unresolvable subjective conflicts via HTML-comment markers.

```sh
npx skills add Jei-sKappa/skills --skill merge-artifacts
```

### Finish & Navigate

#### [`finish`](./skills/workflow/finish-navigate/finish/SKILL.md)

Perform a thread's terminal handshake — set the spec's implemented latch, append closed:done to the ledger, update the living docs, close the linked ticket with its backlink — then run a lightweight thread check and ask the user how to dispose of the branch (merge into main, merge into another branch, create a PR, or leave as-is) when the work is complete.

```sh
npx skills add Jei-sKappa/skills --skill finish
```

#### [`record-verdict`](./skills/workflow/finish-navigate/record-verdict/SKILL.md)

Record a human's explicit lifecycle verdict on a thread artifact by setting the matching set-once frontmatter status latch — approve or reject a proposal, approve a spec, or accept or reject a review — when the user has explicitly decided an artifact's fate and wants that decision stamped into the artifact's status map, never to evaluate or judge the artifact itself.

```sh
npx skills add Jei-sKappa/skills --skill record-verdict
```

#### [`whats-next`](./skills/workflow/finish-navigate/whats-next/SKILL.md)

Read a thread's state — ledger, lineage folders, and frontmatter status latches — and fold it on demand to answer "what now / what next / is it closed", then suggest coherent next actions when the user wants a quick map after completing work, hitting uncertainty, or getting stuck.

```sh
npx skills add Jei-sKappa/skills --skill whats-next
```

### Research

#### [`afk-exploration`](./skills/workflow/research/afk-exploration/SKILL.md)

Researches a rough idea autonomously — new project, new feature, or bug fix — and writes a folder of research notes that lay the groundwork for a spec. Useful when you have a rough idea and are stepping away from the computer (cooking, errands, away from keyboard) and want the agent to develop it further unattended, so you return to a populated knowledge base instead of a stalled chat.

```sh
npx skills add Jei-sKappa/skills --skill afk-exploration
```

#### [`the-librarian`](./skills/workflow/research/the-librarian/SKILL.md)

Manages a local library of reference repositories: stocks new repos into `.library` for later use, and consults already-stored ones to answer the current task. Useful when you want external projects cloned locally as reference material before work begins, and again when the agent is researching, planning, debugging, implementing, or comparing approaches and those repos may help.

```sh
npx skills add Jei-sKappa/skills --skill the-librarian
```

### Documentation

#### [`take-snapshot`](./skills/workflow/documentation/take-snapshot/SKILL.md)

Derives a comprehensive, stack-agnostic specification document from an existing codebase — a hybrid SRS + PRD with append-only requirement IDs, traceability back to source files, and a consolidated open-questions list. Useful when you want to extract a single source of truth for a 1:1 rebuild (same stack or different), or to document an undocumented application, without baking any migration or target-stack guidance into the output. **Reverse direction** — for forward-design spec authoring use `spec` instead.

```sh
npx skills add Jei-sKappa/skills --skill take-snapshot
```

### Handoff

#### [`brief-the-recipient`](./skills/workflow/handoff/brief-the-recipient/SKILL.md)

Drafts a self-contained outcome briefing — the verdict, why, caveats, and pointers — that someone who wasn't part of the discussion can pick up and act on. Useful when you want to hand off the conclusion of a discussion (a decision, answer, diagnosis, or recommendation) to a separate context: a fresh AI session, a follow-up task, or a teammate catching up — whether they'll implement, review, escalate, prioritize, or just keep the thread moving.

```sh
npx skills add Jei-sKappa/skills --skill brief-the-recipient
```

#### [`consult-the-expert`](./skills/workflow/handoff/consult-the-expert/SKILL.md)

Drafts a casual, context-rich message to consult a more experienced developer about a technical problem, decision, or blocker. Useful when you want help framing a question for a senior teammate, mentor, or domain expert who has zero context on what you're working on.

```sh
npx skills add Jei-sKappa/skills --skill consult-the-expert
```

#### [`report-to-the-owner`](./skills/workflow/handoff/report-to-the-owner/SKILL.md)

Drafts a casual, context-rich message to a code owner about something in their code that's blocking you — a bug, a missing capability, or a design that doesn't extend to a new use case — along with a proposed change. Useful when you've hit a blocker in code owned by another developer or team and want to hand off the work, not ask for advice.

```sh
npx skills add Jei-sKappa/skills --skill report-to-the-owner
```

### Support

#### [`meta-prompting`](./skills/workflow/support/meta-prompting/SKILL.md)

Refines a quickly written, unstructured draft prompt into a clean, self-contained version ready to feed to a fresh AI agent session. Useful when you want to upgrade a draft prompt before kicking off a new AI conversation.

```sh
npx skills add Jei-sKappa/skills --skill meta-prompting
```

## Retired skills

- **`capture-inbox`** — retired 2026-06-21. The V2 workflow removes the inbox concept: a unit of work now gets a durable home by opening a thread directly with `open-thread` (local) or a tracker work-item with `open-ticket` (remote), and no V2 spine path writes to an inbox. The legacy folder remains on disk at `skills/deprecated/capture-inbox` so existing installs do not break; new installs should pick `open-thread` / `open-ticket`. Pre-existing `inbox/` captures under older threads remain valid as-is and require no migration.
- **`discussion-loop`** — retired 2026-05-21. Split into `discussion` (open-ended interviews) and `seeded-discussion` (predetermined point walks) when V1's thread layout shipped. The legacy folder remains on disk so existing installs do not break; new installs should pick the relevant replacement skill. Pre-existing logs at `docs/discussions/*-discussion.md` are valid as-is and require no migration.
- **`review-decision-document`** — retired 2026-05-21. Evolved into `review-spec`, which checks a spec against its acceptance criteria. The legacy folder remains on disk so existing installs do not break; new installs should pick the relevant replacement skill. Pre-existing review outputs produced by the legacy skill remain valid as-is and require no migration.

## Installation

Install any skill individually via:

```sh
npx skills add Jei-sKappa/skills --skill <skill-name>
```

For example, to install the spec generator:

```sh
npx skills add Jei-sKappa/skills --skill spec
```

Skills are grouped under one marketplace plugin per `skills/workflow/` folder — for example `JeisKappa-plan` (rendered as **`JeisKappa Plan`**), `JeisKappa-handoff` (**`JeisKappa Handoff`**), `JeisKappa-research` (**`JeisKappa Research`**), and so on. Retired skills live under `JeisKappa-deprecated`. Dashes in the plugin name are split into spaces and each segment capitalized in `npx skills list`.

For the workflow reference docs — thread layout, filename grammar, the artifact lifecycle, tiers, the spine, discussions, and reviews — see [`docs/workflow/v2/README.md`](./docs/workflow/v2/README.md), the active ruleset for all new threads. The earlier [`docs/workflow/v1/`](./docs/workflow/v1/README.md) set remains on disk as the grandfathered reference for pre-V2 threads (never migrated, never mixed).

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
