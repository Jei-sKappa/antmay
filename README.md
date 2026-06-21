[![skills.sh](https://skills.sh/b/Jei-sKappa/skills)](https://skills.sh/Jei-sKappa/skills)

# Jei-sKappa's Skills

A personal collection of refined `SKILL.md` files — anchored by the **Modular Agentic Workflow V1**, a composable, harness-agnostic, spec-driven toolbox that drives a feature end-to-end through reviewable Markdown artifacts on disk.

## Toolbox Model

V1 is a TOOLBOX of installable skills — not a CLI, not a runtime, not a project-local state file. Every spine phase is OPTIONAL: a user picking up a single skill or composing the whole spine (`propose → spec → plan → implementation → finish`) can drive a feature end-to-end. Every artifact is reviewable Markdown on disk under `docs/threads/<thread>/`, so a teammate reviewing a PR or a fresh agent session resuming work has the same view of the truth. Skills are HARNESS-AGNOSTIC — they work inside Claude Code, Codex, Gemini CLI, OpenCode, or any harness that loads `SKILL.md` files. Cross-cutting modules (discussion, review, merge, inbox, navigation) attach anywhere on the spine — pick the one you need at the moment you need it.

## Layered Workflow Map

The workflow has TWO layers: a forward spine of artifact-producing phases, and overlay modules that attach anywhere on that spine.

| Layer       | Members                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| **Spine**   | `propose → spec → plan → implementation → finish`                                                    |
| Discussion  | `discussion` / `seeded-discussion` / `capture-inbox`                                                 |
| Review      | `review-{proposal,spec,plan,implementation,code}-{auto,interactive}`                                 |
| Merge       | `merge-artifacts-{auto,interactive}`                                                                 |
| Inbox       | `capture-inbox` (write) + `inbox/{open,processed,dropped}/` (state)                                  |
| Navigation  | `whats-next`                                                                                         |

```
                  (overlay modules attach anywhere)
                  discussion / review / merge / inbox / navigation
                                   │
                                   ▼
   propose ────► spec ────► plan ────► implementation ────► finish
```

The spine is the typical forward order; you may skip phases, loop back, or invoke an overlay module between any two spine phases.

## Recommended Common Paths

| Use case                                | Path                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Implementing a feature from rough idea  | `discussion → propose-interactive → spec-interactive → plan-strict-interactive → implement-plan-with-subagents-auto → review-implementation-interactive → finish` (canonical full workflow) |
| Fixing a bug                            | `implement-auto → review-code-interactive → finish`                                                                               |
| Exploring an idea                       | `discussion → propose-auto` (no further commitment)                                                                               |
| Refining a plan                         | `plan-strict-auto → review-plan-interactive → adjust-plan-granularity-interactive → implement-plan-auto`                          |
| Reconciling two artifact variants       | `merge-artifacts-interactive → review-spec-interactive → finish`                                                                  |

Each path is one valid composition — not the only valid composition. Pick the entry point that matches what you have in hand and stop when you've shipped the outcome you wanted.

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

#### [`propose-auto`](./skills/workflow/propose/propose-auto/SKILL.md)

**Autonomous** end-to-end proposal generation — turns a rough prompt (or a referenced artifact) into a freeform proposal markdown file under the active V1 thread's `proposals/` folder, with no clarifying questions. Useful when you already know what you want and just need the proposal written down — not when you want to think it through together (use `propose-interactive` for that).

```sh
npx skills add Jei-sKappa/skills --skill propose-auto
```

#### [`propose-interactive`](./skills/workflow/propose/propose-interactive/SKILL.md)

**Interactive** proposal authoring — walks the user through the four suggested elements of a proposal (intent, context, rough shape, open questions) one at a time, then assembles and writes a freeform proposal markdown file under the active V1 thread's `proposals/` folder. Useful when you want to think the proposal through together with the agent, surface open questions live, and have the resulting artifact written for you — not when you already have the prompt fully shaped (use `propose-auto` for that).

```sh
npx skills add Jei-sKappa/skills --skill propose-interactive
```

> **Note:** V1 adversarial review is delegated to the external `the-fool` skill — no native V1 adversarial-review skill. Use `the-fool` against a proposal or spec draft to surface adversarial risks before the spec / plan / implementation phases (per D88, REVW-09).

### Spec

#### [`spec-auto`](./skills/workflow/spec/spec-auto/SKILL.md)

**Autonomous** end-to-end spec generation — turns a proposal, decision log, GitHub issue, or raw prompt into a handoff-grade v1 spec markdown file under the active V1 thread's `specs/` folder, covering all eight semantic-contract elements (intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance) with no clarifying questions. Forward-design only — for reverse-engineering a spec FROM an existing codebase use [`take-snapshot`](./skills/workflow/documentation/take-snapshot/SKILL.md) instead. Useful when you already have the upstream input in hand and just need the spec written down — not when you want to author it together (use `spec-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill spec-auto
```

#### [`spec-interactive`](./skills/workflow/spec/spec-interactive/SKILL.md)

**Interactive** spec authoring — walks the user through the eight handoff-grade semantic-contract elements of a spec one at a time, then assembles and writes a v1 spec markdown file under the active V1 thread's `specs/` folder. Forward-design only — for reverse-engineering a spec FROM an existing codebase use [`take-snapshot`](./skills/workflow/documentation/take-snapshot/SKILL.md) instead. Useful when you want to think the spec through together with the agent, push back on weak reasoning before it becomes expensive in implementation, and have the resulting artifact written for you — not when you already have the upstream input fully shaped (use `spec-auto` for that).

```sh
npx skills add Jei-sKappa/skills --skill spec-interactive
```

### Plan

#### [`plan-loose-auto`](./skills/workflow/plan/plan-loose-auto/SKILL.md)

**Autonomous** loose-granularity plan generation — turns a spec, proposal, decision log, GitHub issue, or raw prompt into a loose-granularity v1 plan markdown file under the active V1 thread's `plans/` folder, end-to-end, with no clarifying questions. Loose plans use brief 1–3 sentence task descriptions optimized for a human-leaning implementer who fills in details. V1 plans are sequential, isolated, independently implementable, self-reviewed before emission, and NEVER auto-committed. Useful when you already have the upstream input in hand and want a loose plan written down autonomously.

```sh
npx skills add Jei-sKappa/skills --skill plan-loose-auto
```

#### [`plan-loose-interactive`](./skills/workflow/plan/plan-loose-interactive/SKILL.md)

**Interactive** loose-granularity plan authoring — walks the user through a loose-granularity plan task-by-task, drafting numbered tasks with brief 1–3 sentence descriptions per task, pushing back on weak reasoning, then assembles and writes a v1 plan markdown file under the active V1 thread's `plans/` folder. Useful when you want to think the plan through together with the agent and have the resulting artifact written for you.

```sh
npx skills add Jei-sKappa/skills --skill plan-loose-interactive
```

#### [`plan-strict-auto`](./skills/workflow/plan/plan-strict-auto/SKILL.md)

**Autonomous** strict-granularity plan generation — turns a spec, proposal, decision log, GitHub issue, or raw prompt into a strict-granularity v1 plan markdown file under the active V1 thread's `plans/` folder, end-to-end, with no clarifying questions. Strict plans carry explicit substeps, verification notes, files modified, and acceptance criteria per task — optimized for an agent-leaning implementer that needs unambiguous prescriptive steps. Useful when you already have the upstream input in hand and want a strict plan written down autonomously.

```sh
npx skills add Jei-sKappa/skills --skill plan-strict-auto
```

#### [`plan-strict-interactive`](./skills/workflow/plan/plan-strict-interactive/SKILL.md)

**Interactive** strict-granularity plan authoring — walks the user through a strict-granularity plan task-by-task, fleshing out each task's objective, input, substeps, files modified, verification, and acceptance criteria, pushing back on weak reasoning, then assembles and writes a v1 plan markdown file under the active V1 thread's `plans/` folder. Useful when you want to think the strict plan through together with the agent and have the resulting artifact written for you.

```sh
npx skills add Jei-sKappa/skills --skill plan-strict-interactive
```

#### [`adjust-plan-granularity-auto`](./skills/workflow/plan/adjust-plan-granularity-auto/SKILL.md)

Adjust an existing living plan to a new granularity level autonomously by editing it in place when the current plan is too loose, too strict, or otherwise mismatched to the intended implementer.

```sh
npx skills add Jei-sKappa/skills --skill adjust-plan-granularity-auto
```

#### [`adjust-plan-granularity-interactive`](./skills/workflow/plan/adjust-plan-granularity-interactive/SKILL.md)

Walk an existing living plan task by task to decide whether to split, merge, expand, contract, or leave each task, then edit the plan in place when the user wants to think the granularity shift through collaboratively.

```sh
npx skills add Jei-sKappa/skills --skill adjust-plan-granularity-interactive
```

### Implement

#### [`implement-auto`](./skills/workflow/implement/implement-auto/SKILL.md)

**Autonomous** end-to-end implementation from less-structured input — takes a spec, proposal, decision log, GitHub issue, Inbox item, code context, or raw prompt and implements it on the current working tree, autonomously deriving implicit tasks from the input itself, self-reviewing after each task, and auto-committing per implicit task. Single-agent (current session + self-review); no subagents are spawned. Reports each implicit task by the V1 four-state status protocol (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`). Never rewrites history — no `--amend`, no rebase, no force-push.

```sh
npx skills add Jei-sKappa/skills --skill implement-auto
```

#### [`implement-interactive`](./skills/workflow/implement/implement-interactive/SKILL.md)

**Interactive** implementation from less-structured input — takes a spec, proposal, decision log, GitHub issue, Inbox item, code context, or raw prompt and implements it collaboratively on the current working tree, walking the implicit task list with the user, pushing back per the anti-sycophancy stance, self-reviewing after each task, and ASKING the user before each commit. Single-agent (current session + self-review); no subagents are spawned. Reports each implicit task by the V1 four-state status protocol. Never rewrites history.

```sh
npx skills add Jei-sKappa/skills --skill implement-interactive
```

#### [`implement-plan-auto`](./skills/workflow/implement/implement-plan-auto/SKILL.md)

**Autonomous** plan-driven implementation — takes a V1 plan artifact path (loose or strict granularity, produced by any of the Phase 4 `plan-*` skills) and executes every plan task in order on the current working tree, self-reviewing after each task and auto-committing per plan task. Single-agent (current session + self-review); no subagents are spawned. Reports each plan task by the V1 four-state status protocol. Never rewrites history.

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-auto
```

#### [`implement-plan-interactive`](./skills/workflow/implement/implement-plan-interactive/SKILL.md)

**Interactive** plan-driven implementation — takes a V1 plan artifact path (loose or strict granularity) and executes its tasks in order on the current working tree COLLABORATIVELY — presenting each plan task to the user, pushing back per the anti-sycophancy stance, self-reviewing after each task, and ASKING the user before committing at each plan-task boundary. Single-agent (current session + self-review); no subagents are spawned. Reports each plan task by the V1 four-state status protocol. Never rewrites history.

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-interactive
```

#### [`implement-plan-with-subagents-auto`](./skills/workflow/implement/implement-plan-with-subagents-auto/SKILL.md)

**Autonomous** plan-driven implementation with subagent dual-review loop — takes a V1 plan artifact path and executes every plan task in order by orchestrating a dispatch loop: implementer subagent → spec-compliance reviewer subagent (first pass) → fix loop respawning a NEW implementer with re-review until pass → code-quality reviewer subagent (second pass) → same fix loop — and auto-commits per orchestration cycle. REQUIRES subagent capability (no inline fallback). Reports each plan task by the V1 four-state status protocol with the subagent audit. Never rewrites history.

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-with-subagents-auto
```

#### [`implement-plan-with-subagents-interactive`](./skills/workflow/implement/implement-plan-with-subagents-interactive/SKILL.md)

**Interactive** plan-driven implementation with subagent dual-review loop — same dual-reviewer dispatch loop as `implement-plan-with-subagents-auto`, but ASKS the user before committing each orchestration cycle. Collaborative (per-commit ASK; live anti-sycophancy push-back during the walk surfaces reviewer findings to the user as they emerge). REQUIRES subagent capability (no inline fallback). Reports each plan task by the V1 four-state status protocol with the subagent audit. Never rewrites history.

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-with-subagents-interactive
```

### Review

> **Note:** V1 verification of implementations is covered by `review-implementation-auto` and `review-implementation-interactive` — there is no separate `verify-*` skill in V1 (per D85, REVW-09).
>
> **Note:** V1 adversarial review is delegated to the external `the-fool` skill — no native V1 adversarial-review skill. Use `the-fool` against a proposal or spec draft to surface adversarial risks before the spec / plan / implementation phases (per D88, REVW-09).

#### [`review-proposal-auto`](./skills/workflow/review/review-proposal-auto/SKILL.md)

Read a proposal artifact and write a references-first review report into the proposal's reviews/ folder, covering gaps, risks, ambiguities, and consistency with the thread's decision logs, when the user wants a lightweight autonomous proposal review.

```sh
npx skills add Jei-sKappa/skills --skill review-proposal-auto
```

#### [`review-proposal-interactive`](./skills/workflow/review/review-proposal-interactive/SKILL.md)

Walk a proposal artifact one finding at a time with the user, testing each finding and consistency with the thread's decision logs, then emit a references-first review record into the proposal's reviews/ folder when the user wants the proposal review kept collaborative.

```sh
npx skills add Jei-sKappa/skills --skill review-proposal-interactive
```

#### [`review-spec-auto`](./skills/workflow/review/review-spec-auto/SKILL.md)

Read a spec artifact and write a references-first review report checking all eight semantic-contract elements against the handoff-grade bar and consistency with the thread's decision logs when the user wants an autonomous spec quality review.

```sh
npx skills add Jei-sKappa/skills --skill review-spec-auto
```

#### [`review-spec-interactive`](./skills/workflow/review/review-spec-interactive/SKILL.md)

Walk a spec artifact one element or finding at a time with the user, testing it against all eight semantic-contract elements and consistency with the thread's decision logs, and capturing the resolved-vs-unresolved split when the user wants a collaborative spec review.

```sh
npx skills add Jei-sKappa/skills --skill review-spec-interactive
```

#### [`review-plan-auto`](./skills/workflow/review/review-plan-auto/SKILL.md)

Read a plan artifact and write a references-first adherence review that checks the plan against its spec, sorts the result into one of four outcomes, auto-fixes plan-fault deviations and routes spec-fault findings to the human when the user wants an autonomous plan adherence review.

```sh
npx skills add Jei-sKappa/skills --skill review-plan-auto
```

#### [`review-plan-interactive`](./skills/workflow/review/review-plan-interactive/SKILL.md)

Walk a plan artifact one finding or task at a time with the user, checking the plan against its spec, classifying each deviation into one of four outcomes, and capturing the resolved-vs-unresolved split with spec faults routed to the human when the user wants a collaborative plan adherence review.

```sh
npx skills add Jei-sKappa/skills --skill review-plan-interactive
```

#### [`review-implementation-auto`](./skills/workflow/review/review-implementation-auto/SKILL.md)

Autonomously verify an implementation against its spec's acceptance criteria and write a references-first review record capturing acceptance, constraint, scope, behavior, and test-coverage findings when the user wants the implementation checked without a per-finding walk.

```sh
npx skills add Jei-sKappa/skills --skill review-implementation-auto
```

#### [`review-implementation-interactive`](./skills/workflow/review/review-implementation-interactive/SKILL.md)

Walk an implementation against its spec's acceptance criteria one finding at a time and capture the resolved-vs-unresolved split when the user wants implementation fidelity verified collaboratively.

```sh
npx skills add Jei-sKappa/skills --skill review-implementation-interactive
```

#### [`review-code-auto`](./skills/workflow/review/review-code-auto/SKILL.md)

Read a code reference and write a references-first code-quality review report covering quality, safety, idioms, and testability, anchored to the spec's acceptance criteria as the definition of right, when the user wants a lightweight autonomous code review.

```sh
npx skills add Jei-sKappa/skills --skill review-code-auto
```

#### [`review-code-interactive`](./skills/workflow/review/review-code-interactive/SKILL.md)

Walk a code reference collaboratively one finding at a time, testing each finding against the code and anchoring right to the spec's acceptance criteria, and capturing the resolved-vs-unresolved split when the user wants a code-quality review kept in-loop.

```sh
npx skills add Jei-sKappa/skills --skill review-code-interactive
```

#### [`review-lossless-mapping`](./skills/workflow/review/review-lossless-mapping/SKILL.md)

Read a set of discussions and the document produced from them, then write a references-first review report verifying the mapping is lossless and additive-free — flagging only smuggled-in decisions/assumptions and dropped user decisions — when the user wants to confirm a document (typically a spec) committed to nothing the user did not see and accept and left nothing out.

```sh
npx skills add Jei-sKappa/skills --skill review-lossless-mapping
```

### Merge

#### [`merge-artifacts-auto`](./skills/workflow/merge/merge-artifacts-auto/SKILL.md)

Reconcile two or more competing candidate drafts of one artifact into the single canonical artifact, folding non-conflicting content automatically and preserving unresolvable subjective conflicts via HTML-comment markers, when the user wants an autonomous merge.

```sh
npx skills add Jei-sKappa/skills --skill merge-artifacts-auto
```

#### [`merge-artifacts-interactive`](./skills/workflow/merge/merge-artifacts-interactive/SKILL.md)

Reconcile two or more competing candidate drafts of one artifact into the single canonical artifact by walking each subjective conflict with the user and capturing each resolution in a mandatory decision log, when the user wants an interactive merge.

```sh
npx skills add Jei-sKappa/skills --skill merge-artifacts-interactive
```

### Finish & Navigate

#### [`finish`](./skills/workflow/finish-navigate/finish/SKILL.md)

Perform a thread's terminal handshake — set the spec's implemented latch, append closed:done to the ledger, update the living docs, close the linked ticket with its backlink — then run a lightweight thread check and ask the user how to dispose of the branch (merge into main, merge into another branch, create a PR, or leave as-is) when the work is complete.

```sh
npx skills add Jei-sKappa/skills --skill finish
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

Derives a comprehensive, stack-agnostic specification document from an existing codebase — a hybrid SRS + PRD with append-only requirement IDs, traceability back to source files, and a consolidated open-questions list. Useful when you want to extract a single source of truth for a 1:1 rebuild (same stack or different), or to document an undocumented application, without baking any migration or target-stack guidance into the output. **Reverse direction** — for forward-design spec authoring use `spec-auto` / `spec-interactive` instead.

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
- **`review-decision-document`** — retired 2026-05-21. Evolved into `review-spec-auto` (autonomous) and `review-spec-interactive` (collaborative) to check against the locked Phase 3 spec semantic contract (the 8 D50 handoff-grade-bar elements). The legacy folder remains on disk so existing installs do not break; new installs should pick the relevant replacement skill. Pre-existing review outputs produced by the legacy skill remain valid as-is and require no migration.

## Installation

Install any skill individually via:

```sh
npx skills add Jei-sKappa/skills --skill <skill-name>
```

For example, to install the autonomous spec generator:

```sh
npx skills add Jei-sKappa/skills --skill spec-auto
```

Skills are grouped under one marketplace plugin per `skills/workflow/` folder — for example `JeisKappa-plan` (rendered as **`JeisKappa Plan`**), `JeisKappa-handoff` (**`JeisKappa Handoff`**), `JeisKappa-research` (**`JeisKappa Research`**), and so on. Retired skills live under `JeisKappa-deprecated`. Dashes in the plugin name are split into spaces and each segment capitalized in `npx skills list`.

For the V1 reference docs (thread layout, filename grammar, immutability rules), see [`docs/workflow/v1/README.md`](./docs/workflow/v1/README.md).

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
