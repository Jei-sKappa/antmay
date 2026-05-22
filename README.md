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

#### [`capture-inbox`](./skills/workflow/capture-discussion/capture-inbox/SKILL.md)

Captures a short markdown note into the active V1 thread's `inbox/open/` folder, with a mandatory `**Why:**` first line and free-form body after it. Useful when a side-finding, follow-up, or deferred idea surfaces while working on something else and you want it parked under the current thread — without derailing the task at hand — knowing the agent will ask first in interactive sessions and auto-capture in AFK / autonomous runs. **Single skill** (cross-cutting capture protocol — no auto/interactive split; trigger encoded in the body).

```sh
npx skills add Jei-sKappa/skills --skill capture-inbox
```

#### [`discussion`](./skills/workflow/capture-discussion/discussion/SKILL.md)

Conducts an open-ended **interactive** interview where questions are discovered live as the conversation unfolds, surfaces options and a recommendation only when a concrete decision point emerges, and appends each decided point to a sequentially-numbered, append-only decision log under the active thread's `discussions/` folder. Useful when you want to think a topic through with the agent — not knowing yet what every question is — and have the resulting decisions captured as a referenceable, thread-local artifact you can point downstream skills at.

```sh
npx skills add Jei-sKappa/skills --skill discussion
```

#### [`seeded-discussion`](./skills/workflow/capture-discussion/seeded-discussion/SKILL.md)

Walks a predetermined list of points one at a time **interactively** — passed as a markdown file or pasted inline — using the Decision / What you need to know / Options / Recommendation loop default-on for every point, then appends each decided point to an append-only decision log under the active thread's `discussions/` folder. Useful when you already have a concrete list to settle (findings, open questions, review comments, design points, a plan to walk) and want options plus a recommendation surfaced for every point by default.

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

**Autonomous** plan-granularity shift — reads an existing v1+ plan markdown file under the active V1 thread's `plans/` folder and emits a NEW versioned plan whose body matches a requested granularity target (looser / stricter / more-implementation-ready / more-high-level OR a specific phrase like "split task 3 into substeps"), end-to-end, with no clarifying questions. The source plan is NEVER modified — the original stays immutable per D39 and the new artifact lands alongside it as `<UTC>-v<N+1>-<descriptor>-plan.md` in the same `plans/` folder. Useful when you already started with the wrong granularity, or when you need to adapt an existing plan for a different implementer.

```sh
npx skills add Jei-sKappa/skills --skill adjust-plan-granularity-auto
```

#### [`adjust-plan-granularity-interactive`](./skills/workflow/plan/adjust-plan-granularity-interactive/SKILL.md)

**Interactive** plan-granularity shift — walks the user through an existing v1+ plan task-by-task — deciding per task whether to SPLIT / MERGE / EXPAND / CONTRACT / LEAVE — pushing back on weak reasoning, then assembles and writes a NEW versioned plan whose body matches the requested granularity target. The source plan is NEVER modified — the original stays immutable per D39 and the new artifact lands alongside it as `<UTC>-v<N+1>-<descriptor>-plan.md`. Useful when you want to think the granularity shift through together with the agent and have the resulting adjusted artifact written for you.

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

**Autonomous** end-to-end proposal review — reads an emitted V1 proposal artifact under the active thread's `proposals/` folder and writes a findings-first review report to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` with no clarifying questions — surfacing gaps, risks, and ambiguities (lightweight proposal review only; the stricter bar for handing a spec downstream lives in `review-spec-*`). The six-section report covers Verdict / Findings (severity-tagged) / Evidence / References / Open Questions / Next Actions. Adversarial pressure on a proposal is delegated to the external `the-fool` skill — no native V1 adversarial-review skill.

```sh
npx skills add Jei-sKappa/skills --skill review-proposal-auto
```

#### [`review-proposal-interactive`](./skills/workflow/review/review-proposal-interactive/SKILL.md)

**Interactive** proposal review — walks an emitted V1 proposal artifact one finding at a time, ASKING the user for their view AND TESTING that view against the proposal, settling each finding as resolved / rejected / accepted / deferred / parked and appending per-finding records to a decision log under `discussions/`. At the end of the session, ONLY unresolved actionable findings dump to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` (no Inbox file when nothing remains). Carries the 4-marker anti-sycophancy stance plus a review-stance amplifier. Adversarial pressure on a proposal is delegated to the external `the-fool` skill.

```sh
npx skills add Jei-sKappa/skills --skill review-proposal-interactive
```

#### [`review-spec-auto`](./skills/workflow/review/review-spec-auto/SKILL.md)

**Autonomous** end-to-end spec review against the handoff-grade bar — reads an emitted V1 spec artifact under the active thread's `specs/` folder and writes a findings-first review report to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` with no clarifying questions — checking all EIGHT D50 semantic-contract elements (intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance) present and coherent. Adversarial pressure on a spec is delegated to the external `the-fool` skill.

```sh
npx skills add Jei-sKappa/skills --skill review-spec-auto
```

#### [`review-spec-interactive`](./skills/workflow/review/review-spec-interactive/SKILL.md)

**Interactive** spec review against the handoff-grade bar — walks an emitted V1 spec artifact one D50 element (or one finding) at a time, ASKING the user for their view AND TESTING that view against the spec, settling each finding and appending per-finding records to a decision log under `discussions/`. At end-of-session, ONLY unresolved actionable findings dump to `inbox/open/`. Carries the 4-marker anti-sycophancy stance plus a review-stance amplifier. Adversarial pressure on a spec is delegated to the external `the-fool` skill.

```sh
npx skills add Jei-sKappa/skills --skill review-spec-interactive
```

#### [`review-plan-auto`](./skills/workflow/review/review-plan-auto/SKILL.md)

**Autonomous** end-to-end plan review — reads an emitted V1 plan artifact under the active thread's `plans/` folder (loose OR strict granularity) and writes a findings-first review report to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` with no clarifying questions — checking four review axes per D83: source-spec adherence (when an optional source artifact is supplied), project conventions, granularity fit, and per-task ambiguity (mandatory for strict plans; granularity-fit signal for loose plans). Detects loose-vs-strict granularity from the plan body. Honors the D59 sequential-isolated-independent contract and the D60 no-parallelization rule as review criteria.

```sh
npx skills add Jei-sKappa/skills --skill review-plan-auto
```

#### [`review-plan-interactive`](./skills/workflow/review/review-plan-interactive/SKILL.md)

**Interactive** plan review — walks an emitted V1 plan artifact one finding (or one task) at a time, ASKING the user for their view AND TESTING that view against the plan, checking four review axes per D83 (source-spec adherence, project conventions, granularity fit, per-task ambiguity). Settles each finding and appends per-finding records to a decision log under `discussions/`. At end-of-session, ONLY unresolved actionable findings dump to `inbox/open/`. Carries the 4-marker anti-sycophancy stance plus a review-stance amplifier. Honors the D59 sequential-isolated-independent contract and the D60 no-parallelization rule.

```sh
npx skills add Jei-sKappa/skills --skill review-plan-interactive
```

#### [`review-implementation-auto`](./skills/workflow/review/review-implementation-auto/SKILL.md)

**Autonomous** end-to-end implementation review against original intent (V1 verification coverage) — reads a V1 implementation reference (a git ref / diff / commit range — typically the output of one of the Phase 5 `implement-*` skills) ALONGSIDE the source artifact it was supposed to deliver (spec / proposal / plan / GitHub issue / Inbox item) and writes a findings-first review report to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` with no clarifying questions — checking five code-vs-original-intent fidelity axes per D85: acceptance/outcome coverage, constraint adherence, scope adherence, behavior fidelity, and test coverage. **This skill covers V1 verification of implementations — there is no separate `verify-*` skill in V1** (per D85, REVW-09).

```sh
npx skills add Jei-sKappa/skills --skill review-implementation-auto
```

#### [`review-implementation-interactive`](./skills/workflow/review/review-implementation-interactive/SKILL.md)

**Interactive** implementation review against original intent (V1 verification coverage) — walks a V1 implementation reference ALONGSIDE its source artifact one finding (or one diff hunk / one source acceptance item / one plan task) at a time, ASKING the user for their view AND TESTING that view against BOTH the diff AND the source artifact, checking the same five D85 fidelity axes. Settles each finding and appends per-finding records to a decision log under `discussions/`. At end-of-session, ONLY unresolved actionable findings dump to `inbox/open/`. Carries the 4-marker anti-sycophancy stance plus a review-stance amplifier and an implementation-stage stakes amplifier. **This skill covers V1 verification of implementations — there is no separate `verify-*` skill in V1** (per D85, REVW-09).

```sh
npx skills add Jei-sKappa/skills --skill review-implementation-interactive
```

#### [`review-code-auto`](./skills/workflow/review/review-code-auto/SKILL.md)

**Autonomous** end-to-end general-purpose code review — reads a CODE REFERENCE (a git ref / diff / file path / directory path) and writes a general-purpose findings-first code review to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` with no clarifying questions — covering quality / safety / idioms / testability per D86 (plus optional axes: performance / dependency hygiene / API design / accessibility / documentation drift when warranted). **NO source artifact required** — that is what distinguishes this skill from `review-implementation-*`. If you have a source artifact AND want code-vs-original-intent fidelity, use `review-implementation-auto` / `review-implementation-interactive` instead.

```sh
npx skills add Jei-sKappa/skills --skill review-code-auto
```

#### [`review-code-interactive`](./skills/workflow/review/review-code-interactive/SKILL.md)

**Interactive** general-purpose code review — walks a CODE REFERENCE one finding (or one file / one hunk) at a time, ASKING the user for their view AND TESTING that view against the code, covering quality / safety / idioms / testability per D86. Settles each finding and appends per-finding records to a decision log under `discussions/`. At end-of-session, ONLY unresolved actionable findings dump to `inbox/open/`. Carries the 4-marker anti-sycophancy stance plus a review-stance amplifier. **NO source artifact required** — that is what distinguishes this skill from `review-implementation-*`. If you have a source artifact AND want code-vs-original-intent fidelity, use `review-implementation-auto` / `review-implementation-interactive` instead.

```sh
npx skills add Jei-sKappa/skills --skill review-code-interactive
```

### Merge

#### [`merge-artifacts-auto`](./skills/workflow/merge/merge-artifacts-auto/SKILL.md)

**Autonomous** artifact merge — reconciles two or more V1 artifacts (same-type default; cross-type allowed only when the user EXPLICITLY states the target type) into ONE merged artifact at the next mainline integer of the TARGET TYPE's normal folder (`proposals/` / `specs/` / `plans/` / `discussions/` / `inbox/open/` — NEVER a separate `merges/` folder per D101) with no clarifying questions. Preserves unresolvable subjective conflicts EXPLICITLY in the merged body via a `<!-- CONFLICT: <description> -->` HTML-comment marker per D103 so a downstream reader can grep them out, and writes NO decision log per D102 (the autonomous merge is a pure generator).

```sh
npx skills add Jei-sKappa/skills --skill merge-artifacts-auto
```

#### [`merge-artifacts-interactive`](./skills/workflow/merge/merge-artifacts-interactive/SKILL.md)

**Interactive** artifact merge — reconciles two or more V1 artifacts (same-type default; cross-type when the user EXPLICITLY states the target type) into ONE merged artifact at the next mainline integer of the TARGET TYPE's normal folder (NEVER `merges/` per D101) by walking each subjective conflict ONE AT A TIME — ASKING the user for the resolution AND TESTING that resolution against BOTH input artifacts. Writes a MANDATORY decision log per D102 (explicit exception to D93's "interactive may or may not log" default — merge interactions ARE the durable trade-offs). Carries the 4-marker anti-sycophancy stance plus a merge-stance amplifier.

```sh
npx skills add Jei-sKappa/skills --skill merge-artifacts-interactive
```

### Finish & Navigate

#### [`finish`](./skills/workflow/finish-navigate/finish/SKILL.md)

Closes a V1 workflow thread by running a lightweight 4-item thread check (final artifacts, open Inbox items, recent implementation commits, obvious unresolved concerns) and then ASKING the user the closure question with FOUR options — `merge into main` / `merge into other branch` / `create PR` / `leave as is` — confirming each git command BEFORE execution and NEVER force-pushing, NEVER rewriting history. **Single skill** — this is the SINGLE V1 skill with NO `-auto` / `-interactive` sibling, an intentional V1 EXCEPTION to the mode-variant convention per D97, because branch disposition is inherently user-directed and there is no autonomous default that would be safe across users / repos / branch contexts. Carries the 4-marker anti-sycophancy stance plus a closure-stance amplifier.

```sh
npx skills add Jei-sKappa/skills --skill finish
```

#### [`whats-next`](./skills/workflow/finish-navigate/whats-next/SKILL.md)

**Advisory** chat-first V1 navigation — inspects the current thread context (artifacts present under `proposals/` / `specs/` / `plans/` / `discussions/` / `inbox/open/` and recent commits on the current branch, all READ-ONLY) and suggests 2–4 coherent next actions in chat, each citing the V1 skill that would execute the action. The primary output is the chat reply; the skill NEVER writes an artifact by default. AFTER the suggestions land, the skill MAY ask whether to save any suggestion as an Inbox item — ONLY on EXPLICIT user opt-in does the skill route to `capture-inbox`. The V1 body MAY be thin per D33 and point the agent at this README hybrid for the full workflow map. Carries the 4-marker anti-sycophancy stance — NO stage-specific amplifier (the skill is advisory, not opinion-driven).

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

#### [`brief-the-implementer`](./skills/workflow/handoff/brief-the-implementer/SKILL.md)

Drafts a self-contained outcome briefing — the verdict, why, caveats, and pointers — that someone who wasn't part of the discussion can pick up and act on. Useful when you want to hand off the conclusion of a discussion (a decision, answer, diagnosis, or recommendation) to a separate context: a fresh AI session, a follow-up task, or a teammate catching up.

```sh
npx skills add Jei-sKappa/skills --skill brief-the-implementer
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
