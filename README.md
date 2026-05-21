[![skills.sh](https://skills.sh/b/Jei-sKappa/skills)](https://skills.sh/Jei-sKappa/skills)

# Jei-sKappa's Skills

A personal collection of refined and custom SKILL.md files for software engineering and everyday AI-assisted work.

## Available skills

### [`consult-the-expert`](./skills/consult-the-expert/SKILL.md)

Drafts a casual, context-rich message to consult a more experienced developer about a technical problem, decision, or blocker. Useful when you want help framing a question for a senior teammate, mentor, or domain expert who has zero context on what you're working on.

```sh
npx skills add Jei-sKappa/skills --skill consult-the-expert
```

### [`discussion-loop`](./skills/discussion-loop/SKILL.md)

Walks through existing discussion points one at a time, always presenting options and a recommendation, then appends each decision to a simple log. Useful when you have findings, open questions, review comments, design points, or a concrete plan you want to discuss and decide interactively.

```sh
npx skills add Jei-sKappa/skills --skill discussion-loop
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
