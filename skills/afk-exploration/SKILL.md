---
name: afk-exploration
description: Start AFK exploration on a topic. Use only when the user explicitly asks to start an AFK research or exploration on a topic.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# AFK Exploration

The user has a rough idea — a new project, a feature in an existing one, or a bug fix — and is stepping away from the computer. Use that gap to research the idea, build a knowledge base they can return to, and stop short of writing the spec. The artifact must be useful enough that on returning the user can write the spec from it without redoing the upfront thinking.

This is the unattended counterpart to `brainstorming`. There is no human to dialogue with mid-run; recorded assumptions replace clarifying questions.

## When to use

- The user has a rough idea and signals they're stepping away (or explicitly asks for unattended exploration / research).
- Triggers across three shapes: a new project, a feature in an existing project, or a bug fix.
- Don't use for interactive brainstorming or anywhere the user is at the keyboard waiting on each step.

The agent receiving the request becomes the **orchestrator**. The orchestrator does no first-hand research itself — it analyses the request, plans research angles, dispatches subagents in parallel, follows up each angle with three critique subagents, and never reads notes back into its own context. This keeps the orchestrator's window clear so it can track the clock and coordinate the run end-to-end.

## Anti-pattern: clarifying questions

The user is not at the keyboard. A clarifying question deadlocks the run. Instead:

- Make the most plausible assumption, write it explicitly into `00-brief.md` under `Assumptions`, and proceed.
- If an assumption is high-risk (picks the wrong stack, narrows scope significantly), surface it in the brief under `High-risk assumptions` so the user can resolve it on return — never mid-run.

## What you produce

A run folder under a project-scoped tree:

```
<cwd>/docs/afk-exploration/
├── 0001-<topic-slug>/                # one folder per topic; numeric prefix sorts by creation
│   ├── 2026-05-10_01/                # one folder per run; date + per-day index
│   │   ├── .metadata.json            # started_at, budget_seconds, topic, request
│   │   ├── 00-brief.md               # human-readable framing; no time data
│   │   ├── 01-<angle>.md             # initial research note (subagent)
│   │   ├── 01-<angle>-pre-mortem.md  # critique: failure narratives
│   │   ├── 01-<angle>-red-team.md    # critique: adversarial attack vectors
│   │   ├── 01-<angle>-socratic.md    # critique: assumption probes
│   │   ├── 02-<angle>.md
│   │   ├── 02-<angle>-pre-mortem.md
│   │   ├── ...
│   └── 2026-05-12_01/                # later run on the same topic, e.g. with different assumptions
└── 0002-<topic-slug>/                # different topic
```

Why this shape:

- **Project-scoped**: research lives next to the code it concerns, so it's discoverable from inside the project later.
- **Topic-numbered**: `0001`, `0002`, … sort topics by creation order at a glance.
- **Date + per-day run-index**: multiple runs on the same topic in a day are distinguishable; runs sort chronologically.
- **Four files per angle**: the initial research, plus three critique passes (pre-mortem, red team adversarial, Socratic) — every finding gets stress-tested.
- **No `INDEX.md`, no `SUMMARY.md`**: the user reads the notes directly; the orchestrator never synthesises into a single summary file. If a summary is wanted later, the user can ask for one in a follow-up.

Slug the topic from 2–4 keywords in the user's prompt, lowercase, hyphenated (e.g. "Add OAuth login to admin panel" → `oauth-admin-login`).

## Workflow

1. **Resolve the run folder.**
   - `ls <cwd>/docs/afk-exploration/` to find existing topics. If a topic with the same or near-identical slug exists and the request is clearly a continuation, reuse it; otherwise pick the next zero-padded 4-digit prefix (`0001`, `0002`, …).
   - Inside the topic folder, list runs matching `YYYY-MM-DD_NN`. Pick today's date with the next zero-padded 2-digit index (`01` if no runs today, otherwise `02`, `03`, …). Separate the date from the per-day index with `_`, not `-`, so the index is visually distinct from the date components.
   - `mkdir -p` the run folder.
2. **Write `.metadata.json`.**
   ```json
   {
     "topic": "<slug>",
     "request": "<the user's prompt, single line>",
     "started_at": <epoch seconds from `date +%s`>,
     "budget_seconds": <parsed from the prompt; null if no time hint>
   }
   ```
   This is the orchestrator's compact clock-checker — re-read it any time, never trust memory. Parse time hints like "30 min", "1h", "~45m" from the user's prompt; otherwise leave `budget_seconds: null`.
3. **Write `00-brief.md`** (before any subagent is dispatched). Sections:
   - `Request` — restate.
   - `Scope` and `Out of scope` — the contract every subagent honours.
   - `Assumptions` — explicit, including the most plausible answers to questions the user didn't address.
   - `High-risk assumptions` — assumptions that, if wrong, invalidate large parts of the research. Surface for the user on return.
   - `Missing pieces` (only if the request is genuinely thin) — questions that would unblock deeper research.
   - `Planned angles` — the 3–5 angles the orchestrator will dispatch.
4. **Plan research angles.** Pick 3–5 from the catalog below — the ones that earn their slot for *this* request.
5. **Dispatch initial angle subagents in parallel.** One per angle, all in a single tool call. See *Subagent briefs* below.
6. **For every initial angle that returns, dispatch its three critique subagents in parallel.** Pre-mortem, red team adversarial, Socratic. Issue them as a single tool call with all critiques for all returned angles — maximum parallelism. Each critique subagent reads the initial note from disk, applies the method from the corresponding reference file, and writes its critique file. Three more files per angle land on disk.
7. **Re-read `.metadata.json`. Check the clock.** Compute `elapsed = $(date +%s) - started_at`.
   - If a `budget_seconds` is set and `elapsed < budget_seconds`: plan one or two adjacent angles (e.g. alternative design, deeper dive on a high-leverage finding, steelman of a discarded option), then loop back to step 5 — but only for the new angles. Existing angles already have their critiques.
   - Otherwise: done. Proceed to the final message.
8. **Final message to the user** (under 10 lines): the run folder path, the list of angles explored, a one-line note that pre-mortem / red-team / Socratic passes were applied, and a pointer to `00-brief.md` for the assumptions and any missing pieces. No synthesis — the artifact is the deliverable.

## Choosing research angles

Pick the ones that earn their slot for *this* request. Don't run every item.

- **New project** — prior art and existing solutions; target users and core use cases; technical stack candidates; MVP scope and what to defer; risks and unknowns; architectural sketch.
- **Feature in an existing project** — current architecture and integration points; data model and migration impact; UX surface and existing patterns to mirror; edge cases and failure modes; alternative designs; observability and rollback story.
- **Bug fix** — reproducer and minimal failing case; root-cause hypotheses; blast radius and affected code paths; existing tests in the area; fix candidates with trade-offs; regression risk and required new coverage.

When the trigger is ambiguous, pick the closest category and note the choice under `Assumptions` in the brief.

## Subagent briefs

Each dispatched agent gets a self-contained prompt. The orchestrator never inherits the agent's session and never loads the agent's output back into its own context.

### Initial angle subagent

- **Scope** — paste the `Scope` and `Out of scope` sections from `00-brief.md`.
- **Angle** — the single angle this agent investigates, framed as one focused question.
- **Output path** — the absolute path to write the note to (e.g. `<run-folder>/01-existing-architecture.md`). Each subagent gets a different path so they cannot collide.
- **Output shape** — markdown with `## Findings`, `## Evidence` (file paths, doc URLs, snippets), `## Open questions`. No prose padding.
- **Sources** — codebase via direct read/grep; library docs via `find-docs` (Context7) or web search; prior art via web search. Whatever the angle needs.
- **Return contract** — write the note file directly; reply to the orchestrator with **only** a 2–3 sentence summary plus the file path. Do **not** paste the note back.
- **Hard constraints** — do not edit code, do not run destructive commands, stay inside the declared scope.

### Critique subagents (one per pass, three per angle)

For each returned initial angle, dispatch three critique subagents in parallel. Each gets:

- **Input note path** — the absolute path of the initial angle note to critique.
- **Method reference path** — the absolute path of the corresponding reference in this skill's `references/` folder. Resolve from this skill's base directory:
  - Pre-mortem → `<skill-base>/references/pre-mortem-analysis.md`
  - Red team adversarial → `<skill-base>/references/red-team-adversarial.md`
  - Socratic questioning → `<skill-base>/references/socratic-questioning.md`
- **Output path** — the absolute path to write the critique to (`<initial-note-stem>-pre-mortem.md`, `…-red-team.md`, `…-socratic.md`).
- **Return contract** — write the critique file directly; reply with **only** a 2–3 sentence summary. Do not paste the critique back.
- **Hard constraints** — read the input note and the reference; apply the reference's method to the *content* of the note (not to the abstract idea); do not edit code or other files.

The reference files describe each critique method in full (process, templates, output shape). They are adapted from the `the-fool` skill — see those files for the canonical method. The orchestrator itself does not read them; only the critique subagents do.

## Time budget — a floor, not a ceiling

The optional time budget exists only to prevent under-using the gap the user is away. It is **not** a deadline.

- **Never stop early to come in under budget.** If `elapsed < budget_seconds`, plan another angle and dispatch.
- **Never abort a wave to come in under budget.** If `elapsed >= budget_seconds` mid-run with critique subagents in flight, let them finish. It is forbidden to leave the workflow half-done — every dispatched initial angle gets all three of its critiques.
- **Never start a new initial angle after the budget is reached.** Once the loop's clock check fails, the next step is the final user message — not another wave.
- **No budget given**: do the 3–5 planned angles plus their critiques and stop. Cap at ~6 initial angles total to avoid drift even when generously paced.
- The orchestrator cannot watch a wall clock — every check is an explicit `date +%s` compared to `started_at` from `.metadata.json`.

If the user returns mid-run, they can interrupt manually. The folder is already useful (see *Resumability*).

## Resumability

The folder must be useful at every point during the run, not only at the end:

- `.metadata.json` and `00-brief.md` are written before any subagent is dispatched. Interruption between brief and the first dispatch still leaves the framing.
- Each subagent writes its file directly to disk. Mid-run interruption leaves whatever notes have been completed so far — initial angles only, or initial + partial critiques.
- There is no `SUMMARY.md` or `INDEX.md` to be missing. The notes themselves are the artifact.

If the same topic is invoked again later (the user wants more depth, has more time, or wants to retry under different assumptions), the orchestrator creates a new run folder under the existing topic folder (`YYYY-MM-DD_02`, the next day's `YYYY-MM-DD_01`, etc.) and starts fresh. Earlier runs are never overwritten.

## When the request is too thin

If the rough idea is too vague to pick angles without inventing requirements, **still produce the folder**. Write `00-brief.md` with:

- The request as stated.
- A `Missing pieces` section listing the questions that would unblock real research.
- The most defensible assumptions to proceed under, marked clearly as assumptions.

Then run a reduced set of angles (e.g. prior art, candidate framings, glossary of terms) — and still apply the three critique passes to each — so the user returns to *something* (even if it's a "we'd need X, Y, Z to go further" dossier) instead of an empty folder and an apology.
