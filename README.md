[![skills.sh](https://skills.sh/b/Jei-sKappa/skills)](https://skills.sh/Jei-sKappa/skills)

# Jei-sKappa's Skills

A personal collection of refined and custom SKILL.md files for software engineering and everyday AI-assisted work.

## Available skills

### [`consult-the-expert`](./skills/consult-the-expert/SKILL.md)

Drafts a casual, context-rich message to consult a more experienced developer about a technical problem, decision, or blocker. Useful when you want help framing a question for a senior teammate, mentor, or domain expert who has zero context on what you're working on.

```sh
npx skills add Jei-sKappa/skills --skill consult-the-expert
```

### [`the-librarian`](./skills/the-librarian/SKILL.md)

Manages a local library of reference repositories: stocks new repos into `.library` for later use, and consults already-stored ones to answer the current task. Useful when you want external projects cloned locally as reference material before work begins, and again when the agent is researching, planning, debugging, implementing, or comparing approaches and those repos may help.

```sh
npx skills add Jei-sKappa/skills --skill the-librarian
```

### [`brief-the-implementer`](./skills/brief-the-implementer/SKILL.md)

Drafts a self-contained outcome briefing — the verdict, why, caveats, and pointers — that someone who wasn't part of the discussion can pick up and act on. Useful when you want to hand off the conclusion of a discussion (a decision, answer, diagnosis, or recommendation) to a separate context: a fresh AI session, a follow-up task, or a teammate catching up.

```sh
npx skills add Jei-sKappa/skills --skill brief-the-implementer
```

### [`report-to-the-owner`](./skills/report-to-the-owner/SKILL.md)

Drafts a casual, context-rich message to a code owner about something in their code that's blocking you — a bug, a missing capability, or a design that doesn't extend to a new use case — along with a proposed change. Useful when you've hit a blocker in code owned by another developer or team and want to hand off the work, not ask for advice.

```sh
npx skills add Jei-sKappa/skills --skill report-to-the-owner
```

### [`meta-prompting`](./skills/meta-prompting/SKILL.md)

Refines a quickly written, unstructured draft prompt into a clean, self-contained version ready to feed to a fresh AI agent session. Useful when you want to upgrade a draft prompt before kicking off a new AI conversation.

```sh
npx skills add Jei-sKappa/skills --skill meta-prompting
```

### [`afk-exploration`](./skills/afk-exploration/SKILL.md)

Researches a rough idea autonomously — new project, new feature, or bug fix — and writes a folder of research notes that lay the groundwork for a spec. Useful when you have a rough idea and are stepping away from the computer (cooking, errands, away from keyboard) and want the agent to develop it further unattended, so you return to a populated knowledge base instead of a stalled chat.

```sh
npx skills add Jei-sKappa/skills --skill afk-exploration
```

### [`review-decision-document`](./skills/review-decision-document/SKILL.md)

Reviews a decision document — spec, ADR, plan, design proposal, context doc, anything that captures an idea before someone acts on it — and stress-tests it against the bar that a recipient could deliver the same work the author had in mind. Useful when you have a document you want stress-tested for clarity, internal consistency, gaps, hidden assumptions, and readiness to be built upon — before anyone acts on it.

```sh
npx skills add Jei-sKappa/skills --skill review-decision-document
```

### [`derive-spec`](./skills/derive-spec/SKILL.md)

Derives a comprehensive, stack-agnostic specification document from an existing codebase — a hybrid SRS + PRD with append-only requirement IDs, traceability back to source files, and a consolidated open-questions list. Useful when you want to extract a single source of truth for a 1:1 rebuild (same stack or different), or to document an undocumented application, without baking any migration or target-stack guidance into the output.

```sh
npx skills add Jei-sKappa/skills --skill derive-spec
```

### [`capture-inbox`](./skills/capture-inbox/SKILL.md)

Captures a short markdown note into the active V1 thread's `inbox/open/` folder, with a mandatory `**Why:**` first line and free-form body after it. Useful when a side-finding, follow-up, or deferred idea surfaces while working on something else and you want it parked under the current thread — without derailing the task at hand — knowing the agent will ask first in interactive sessions and auto-capture in AFK / autonomous runs.

```sh
npx skills add Jei-sKappa/skills --skill capture-inbox
```

### [`discussion`](./skills/discussion/SKILL.md)

Conducts an open-ended interview where questions are discovered live as the conversation unfolds, surfaces options and a recommendation only when a concrete decision point emerges, and appends each decided point to a sequentially-numbered, append-only decision log under the active thread's `discussions/` folder. Useful when you want to think a topic through with the agent — not knowing yet what every question is — and have the resulting decisions captured as a referenceable, thread-local artifact you can point downstream skills at.

```sh
npx skills add Jei-sKappa/skills --skill discussion
```

### [`seeded-discussion`](./skills/seeded-discussion/SKILL.md)

Walks a predetermined list of points one at a time — passed as a markdown file or pasted inline — using the Decision / What you need to know / Options / Recommendation loop default-on for every point, then appends each decided point to an append-only decision log under the active thread's `discussions/` folder. Useful when you already have a concrete list to settle (findings, open questions, review comments, design points, a plan to walk) and want options plus a recommendation surfaced for every point by default.

```sh
npx skills add Jei-sKappa/skills --skill seeded-discussion
```

### [`propose-auto`](./skills/propose-auto/SKILL.md)

Turns a rough prompt (or a referenced artifact) into a freeform proposal markdown file under the active V1 thread's `proposals/` folder, end-to-end, with no clarifying questions. Useful when you already know what you want and just need the proposal written down — not when you want to think it through together (use `propose-interactive` for that).

```sh
npx skills add Jei-sKappa/skills --skill propose-auto
```

### [`propose-interactive`](./skills/propose-interactive/SKILL.md)

Walks the user through the four suggested elements of a proposal — intent, context, rough shape, open questions — one at a time, then assembles and writes a freeform proposal markdown file under the active V1 thread's `proposals/` folder. Useful when you want to think the proposal through together with the agent, surface open questions live, and have the resulting artifact written for you — not when you already have the prompt fully shaped (use `propose-auto` for that).

```sh
npx skills add Jei-sKappa/skills --skill propose-interactive
```

### [`spec-auto`](./skills/spec-auto/SKILL.md)

Turns a proposal, decision log, GitHub issue, or raw prompt into a handoff-grade v1 spec markdown file under the active V1 thread's `specs/` folder — end-to-end, with no clarifying questions, covering all eight semantic-contract elements (intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance). Forward-design only — for reverse-engineering a spec FROM an existing codebase use [`derive-spec`](./skills/derive-spec/SKILL.md) instead. Useful when you already have the upstream input in hand and just need the spec written down — not when you want to author it together (use `spec-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill spec-auto
```

### [`spec-interactive`](./skills/spec-interactive/SKILL.md)

Walks the user through the eight handoff-grade semantic-contract elements of a spec — intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance — one at a time, then assembles and writes a v1 spec markdown file under the active V1 thread's `specs/` folder. Forward-design only — for reverse-engineering a spec FROM an existing codebase use [`derive-spec`](./skills/derive-spec/SKILL.md) instead. Useful when you want to think the spec through together with the agent, push back on weak reasoning before it becomes expensive in implementation, and have the resulting artifact written for you — not when you already have the upstream input fully shaped (use `spec-auto` for that).

```sh
npx skills add Jei-sKappa/skills --skill spec-interactive
```

### [`plan-loose-auto`](./skills/plan-loose-auto/SKILL.md)

Turns a spec, proposal, decision log, GitHub issue, or raw prompt into a loose-granularity v1 plan markdown file under the active V1 thread's `plans/` folder, end-to-end, with no clarifying questions. Loose plans use brief 1–3 sentence task descriptions optimized for a human-leaning implementer who fills in details. V1 plans are sequential, isolated, independently implementable, self-reviewed before emission, and NEVER auto-committed. Useful when you already have the upstream input in hand and want a loose plan written down autonomously — not when you want to walk it together (use `plan-loose-interactive`), and not when the downstream implementer is agent-leaning and needs unambiguous prescriptive steps (use `plan-strict-auto` or `plan-strict-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill plan-loose-auto
```

### [`plan-loose-interactive`](./skills/plan-loose-interactive/SKILL.md)

Walks the user through a loose-granularity plan task-by-task — drafting numbered tasks with brief 1–3 sentence descriptions per task — pushing back on weak reasoning, then assembles and writes a v1 plan markdown file under the active V1 thread's `plans/` folder. Loose plans suit human-leaning implementers who fill in details. V1 plans are sequential, isolated, independently implementable, self-reviewed before emission, and NEVER auto-committed. Useful when you want to think the plan through together with the agent and have the resulting artifact written for you — not when you already have the upstream input fully shaped (use `plan-loose-auto` for that), and not when the downstream implementer is agent-leaning and needs unambiguous prescriptive steps (use `plan-strict-auto` or `plan-strict-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill plan-loose-interactive
```

### [`plan-strict-auto`](./skills/plan-strict-auto/SKILL.md)

Turns a spec, proposal, decision log, GitHub issue, or raw prompt into a strict-granularity v1 plan markdown file under the active V1 thread's `plans/` folder, end-to-end, with no clarifying questions. Strict plans carry explicit substeps, verification notes, files modified, and acceptance criteria per task — optimized for an agent-leaning implementer that needs unambiguous prescriptive steps. V1 plans are sequential, isolated, independently implementable, self-reviewed before emission, and NEVER auto-committed. Useful when you already have the upstream input in hand and want a strict plan written down autonomously — not when you want to walk it together (use `plan-strict-interactive`), and not when the downstream implementer is human-leaning and a brief task description suffices (use `plan-loose-auto` or `plan-loose-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill plan-strict-auto
```

### [`plan-strict-interactive`](./skills/plan-strict-interactive/SKILL.md)

Walks the user through a strict-granularity plan task-by-task — fleshing out each task's objective, input, substeps, files modified, verification, and acceptance criteria — pushing back on weak reasoning, then assembles and writes a v1 plan markdown file under the active V1 thread's `plans/` folder. Strict plans suit agent-leaning implementers and tighter handoff where ambiguity is expensive. V1 plans are sequential, isolated, independently implementable, self-reviewed before emission, and NEVER auto-committed. Useful when you want to think the strict plan through together with the agent and have the resulting artifact written for you — not when you already have the upstream input fully shaped (use `plan-strict-auto` for that), and not when the downstream implementer is human-leaning and a brief task description suffices (use `plan-loose-auto` or `plan-loose-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill plan-strict-interactive
```

## Retired skills

- **`discussion-loop`** — retired 2026-05-21. Split into `discussion` (open-ended interviews) and `seeded-discussion` (predetermined point walks) when V1's thread layout shipped. The legacy folder remains on disk so existing installs do not break; new installs should pick the relevant replacement skill. Pre-existing logs at `docs/discussions/*-discussion.md` are valid as-is and require no migration.
