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

### [`review-proposal-auto`](./skills/review-proposal-auto/SKILL.md)

Reads an emitted V1 proposal artifact under the active thread's `proposals/` folder and writes a findings-first review report to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` end-to-end, with no clarifying questions — surfacing gaps, risks, and ambiguities (lightweight proposal review only; the stricter bar for handing a spec downstream lives in `review-spec-*`). The six-section report covers Verdict / Findings (severity-tagged) / Evidence / References / Open Questions / Next Actions. Adversarial pressure on a proposal is delegated to the external `the-fool` skill — no native V1 adversarial-review skill. Useful when you want autonomous end-to-end proposal review — not when you want to walk findings together one at a time (use `review-proposal-interactive` for that).

```sh
npx skills add Jei-sKappa/skills --skill review-proposal-auto
```

### [`review-proposal-interactive`](./skills/review-proposal-interactive/SKILL.md)

Walks an emitted V1 proposal artifact one finding at a time — ASKING the user for their view AND TESTING that view against the proposal (do not just accept) — settling each finding as resolved / rejected / accepted / deferred / parked and appending per-finding records to a decision log under `discussions/`. At the end of the session, ONLY unresolved actionable findings dump to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` (no Inbox file when nothing remains). Carries the 4-marker anti-sycophancy stance from `discussion` verbatim plus a review-stance amplifier — a review is most valuable when it disagrees with the author; push back hard on weak reasoning, never soften findings just because the user pushes back. Adversarial pressure on a proposal is delegated to the external `the-fool` skill. Useful when you want to think the proposal review through collaboratively with the agent and have the resolved-vs-unresolved split captured for you — not when you want autonomous end-to-end review (use `review-proposal-auto` for that).

```sh
npx skills add Jei-sKappa/skills --skill review-proposal-interactive
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

### [`adjust-plan-granularity-auto`](./skills/adjust-plan-granularity-auto/SKILL.md)

Reads an existing v1+ plan markdown file under the active V1 thread's `plans/` folder and emits a NEW versioned plan whose body matches a requested granularity target (looser / stricter / more-implementation-ready / more-high-level OR a specific phrase like "split task 3 into substeps"), end-to-end, with no clarifying questions. The source plan is NEVER modified — the original stays immutable per D39 and the new artifact lands alongside it as `<UTC>-v<N+1>-<descriptor>-plan.md` in the same `plans/` folder. V1 plans are sequential, isolated, independently implementable, self-reviewed before emission, and NEVER auto-committed. Useful when you already started with the wrong granularity, or when you need to adapt an existing plan for a different implementer (e.g., handing a loose human-authored plan to an agent-leaning implementer) — not when you want to walk the source plan task-by-task together (use `adjust-plan-granularity-interactive`), and not when you are authoring a plan from scratch (use the `plan-loose-*` or `plan-strict-*` pair).

```sh
npx skills add Jei-sKappa/skills --skill adjust-plan-granularity-auto
```

### [`adjust-plan-granularity-interactive`](./skills/adjust-plan-granularity-interactive/SKILL.md)

Walks the user through an existing v1+ plan task-by-task — deciding per task whether to SPLIT (break into substeps) / MERGE (combine with adjacent task) / EXPAND (add files-modified / verification / acceptance) / CONTRACT (remove substeps or per-task fields) / LEAVE (keep as-is) — pushing back on weak reasoning, then assembles and writes a NEW versioned plan whose body matches the requested granularity target. The source plan is NEVER modified — the original stays immutable per D39 and the new artifact lands alongside it as `<UTC>-v<N+1>-<descriptor>-plan.md` in the same `plans/` folder. V1 plans are sequential, isolated, independently implementable, self-reviewed before emission, and NEVER auto-committed. Useful when you want to think the granularity shift through together with the agent and have the resulting adjusted artifact written for you — not when you already have the source plan and target instruction fully shaped (use `adjust-plan-granularity-auto` for that), and not when you are authoring a plan from scratch (use the `plan-loose-*` or `plan-strict-*` pair).

```sh
npx skills add Jei-sKappa/skills --skill adjust-plan-granularity-interactive
```

### [`implement-auto`](./skills/implement-auto/SKILL.md)

Takes a less-structured input (spec, proposal, decision log, GitHub issue, Inbox item, code context, or raw prompt) and implements it end-to-end on the current working tree — autonomously deriving implicit tasks from the input itself, self-reviewing after each task, and auto-committing per implicit task or per explicit Git instruction. Single-agent (current session + self-review); no subagents are spawned. Reports each implicit task by the V1 four-state status protocol (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`). Never rewrites history — no `--amend`, no rebase, no force-push; a failed commit reports `BLOCKED` and stops. Useful when you have a less-structured input in hand and want autonomous end-to-end implementation without an element-by-element walk — not when you want to ASK before each commit (use `implement-interactive`), and not when the input is a plan artifact under `docs/threads/<thread>/plans/` (use one of the `implement-plan-*` skills).

```sh
npx skills add Jei-sKappa/skills --skill implement-auto
```

### [`implement-interactive`](./skills/implement-interactive/SKILL.md)

Takes a less-structured input (spec, proposal, decision log, GitHub issue, Inbox item, code context, or raw prompt) and implements it collaboratively on the current working tree — walking the implicit task list with the user, pushing back per the anti-sycophancy stance, self-reviewing after each task, and ASKING the user before each commit at every equivalent checkpoint to the autonomous sibling. Single-agent (current session + self-review); no subagents are spawned. Reports each implicit task by the V1 four-state status protocol. Never rewrites history; a failed commit reports `BLOCKED` and stops. Useful when you want to think the implementation through with the agent and have it ASK before each commit lands — not when you want autonomous end-to-end execution (use `implement-auto`), and not when the input is a plan artifact under `docs/threads/<thread>/plans/` (use one of the `implement-plan-*` skills).

```sh
npx skills add Jei-sKappa/skills --skill implement-interactive
```

### [`implement-plan-auto`](./skills/implement-plan-auto/SKILL.md)

Takes a V1 plan artifact path (loose or strict granularity, produced by any of the Phase 4 `plan-*` skills) and executes every plan task in order on the current working tree — autonomously, self-reviewing after each task, and auto-committing per plan task. Single-agent (current session + self-review); no subagents are spawned. Reports each plan task by the V1 four-state status protocol (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`). Never rewrites history — no `--amend`, no rebase, no force-push; a failed commit reports `BLOCKED` and stops. Useful when you have a plan artifact under `docs/threads/<thread>/plans/` and want it executed end-to-end without a per-commit ASK — not when you want to confirm each commit (use `implement-plan-interactive`), not when the input is less-structured rather than a plan artifact (use `implement-auto` or `implement-interactive`), and not when you want a heavier subagent-driven review loop on each task (use `implement-plan-with-subagents-auto` or `implement-plan-with-subagents-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-auto
```

### [`implement-plan-interactive`](./skills/implement-plan-interactive/SKILL.md)

Takes a V1 plan artifact path (loose or strict granularity, produced by any of the Phase 4 `plan-*` skills) and executes its tasks in order on the current working tree COLLABORATIVELY — presenting each plan task to the user, pushing back per the anti-sycophancy stance, self-reviewing after each task, and ASKING the user before committing at each plan-task boundary. Single-agent (current session + self-review); no subagents are spawned. Reports each plan task by the V1 four-state status protocol. Never rewrites history; a failed commit reports `BLOCKED` and stops. Useful when you have a plan artifact under `docs/threads/<thread>/plans/` and want the agent to ASK before each commit — not when you want autonomous end-to-end execution (use `implement-plan-auto`), not when the input is less-structured rather than a plan artifact (use `implement-auto` or `implement-interactive`), and not when you want a heavier subagent-driven review loop on each task (use `implement-plan-with-subagents-auto` or `implement-plan-with-subagents-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-interactive
```

### [`implement-plan-with-subagents-auto`](./skills/implement-plan-with-subagents-auto/SKILL.md)

Takes a V1 plan artifact path (loose or strict granularity, produced by any of the Phase 4 `plan-*` skills) and executes every plan task in order on the current working tree by orchestrating a dispatch loop — implementer subagent → spec-compliance reviewer subagent (first pass) → fix loop respawning a NEW implementer on issues with re-review until pass → code-quality reviewer subagent (second pass) → same fix loop — and auto-commits per orchestration cycle. Autonomous (no per-commit ASK). REQUIRES subagent capability — this skill does NOT fall back to inline execution; if your runtime does not support subagents, use `implement-plan-auto` or `implement-plan-interactive` instead. Reports each plan task by the V1 four-state status protocol (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`) with the subagent audit (which subagents ran, fix iteration counts). Never rewrites history — no `--amend`, no rebase, no force-push; a failed commit reports `BLOCKED` and stops. Useful when you have a plan artifact under `docs/threads/<thread>/plans/` and want the heavier dual-reviewer loop applied per task without a per-commit ASK — not when you want the same subagent loop with ASK-before-commit (use `implement-plan-with-subagents-interactive`), not when you want single-agent execution (use `implement-plan-auto` or `implement-plan-interactive`), and not when the input is less-structured rather than a plan artifact (use `implement-auto` or `implement-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-with-subagents-auto
```

### [`implement-plan-with-subagents-interactive`](./skills/implement-plan-with-subagents-interactive/SKILL.md)

Takes a V1 plan artifact path (loose or strict granularity, produced by any of the Phase 4 `plan-*` skills) and executes every plan task in order on the current working tree by orchestrating the same dual-reviewer dispatch loop as `implement-plan-with-subagents-auto` (implementer → spec-compliance reviewer FIRST pass → fix loop respawning a NEW implementer with re-review → code-quality reviewer SECOND pass → same fix loop) — and ASKS the user before committing each orchestration cycle. Collaborative (per-commit ASK; live anti-sycophancy push-back during the walk surfaces reviewer findings to the user as they emerge). REQUIRES subagent capability — this skill does NOT fall back to inline execution; if your runtime does not support subagents, use `implement-plan-auto` or `implement-plan-interactive` instead. Reports each plan task by the V1 four-state status protocol with the subagent audit. Never rewrites history; a failed commit reports `BLOCKED` and stops. Useful when you have a plan artifact under `docs/threads/<thread>/plans/` and want the heavier dual-reviewer loop applied per task WITH the user in-loop at every commit boundary — not when you want autonomous end-to-end execution with the same subagent loop (use `implement-plan-with-subagents-auto`), not when you want single-agent execution (use `implement-plan-auto` or `implement-plan-interactive`), and not when the input is less-structured rather than a plan artifact (use `implement-auto` or `implement-interactive`).

```sh
npx skills add Jei-sKappa/skills --skill implement-plan-with-subagents-interactive
```

## Retired skills

- **`discussion-loop`** — retired 2026-05-21. Split into `discussion` (open-ended interviews) and `seeded-discussion` (predetermined point walks) when V1's thread layout shipped. The legacy folder remains on disk so existing installs do not break; new installs should pick the relevant replacement skill. Pre-existing logs at `docs/discussions/*-discussion.md` are valid as-is and require no migration.
