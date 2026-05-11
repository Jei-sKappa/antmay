---
name: afk-exploration
description: Start AFK exploration on a topic. Use only when the user explicitly asks to start an AFK research or exploration on a topic.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.0
---

# AFK Exploration

The user has a rough idea — a new project, a feature in an existing one, or a bug fix — and is stepping away from the computer. Use that gap to research the idea, build a knowledge base they can return to, and stop short of writing the spec. The artifact must be useful enough that on returning the user can write the spec from it without redoing the upfront thinking.

This is the unattended counterpart to `brainstorming`. There is no human to dialogue with mid-run; recorded assumptions replace clarifying questions.

## When to use

- The user has a rough idea and signals they're stepping away (or explicitly asks for unattended exploration / research).
- Triggers across three shapes: a new project, a feature in an existing project, or a bug fix.
- Don't use for interactive brainstorming or anywhere the user is at the keyboard waiting on each step.

The agent receiving the request becomes the **orchestrator**. The orchestrator does no first-hand research itself — it analyses the request, plans research angles, dispatches subagents in parallel, follows up each angle with three critique subagents and a per-angle synthesiser, and never reads notes back into its own context. This keeps the orchestrator's window clear so it can track the clock and coordinate the run end-to-end.

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
│   │   ├── 01-<angle>-synthesis.md   # per-angle synthesis of the four files above
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
- **Five files per angle**: the initial research, three critique passes (pre-mortem, red team adversarial, Socratic), and a per-angle synthesis that distils all four into a single digestible note.
- **Per-angle synthesis, no whole-run digest**: each angle ends in a synthesis file so the reader can act on the angle without opening the other four. There is no top-level full exploration summary — the orchestrator never combines angles into a run-wide summary. If a cross-angle digest is wanted later, the user can ask for one in a follow-up.

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
7. **Once an angle's three critiques have returned, dispatch its synthesiser subagent.** Synthesisers across angles run in parallel — issue them as a single tool call covering every angle whose critiques are in. Each synthesiser reads its angle's initial note plus the three critiques from disk and writes `NN-<angle>-synthesis.md` — a single digestible note that captures the load-bearing points and adds the conclusions that fall out of reading all four files together. See *Subagent briefs* below.
8. **Re-read `.metadata.json`. Check the clock.** Compute `elapsed = $(date +%s) - started_at`.
   - **If a `budget_seconds` is set and `elapsed < budget_seconds`, the loop is not done.** Pick one or two concrete moves from the list below and loop back to step 5 with the new angles. Existing angles already have their critiques and synthesis.
     - An unpicked angle from the catalog above for the request's trigger shape.
     - A deeper-dive subagent on a high-leverage finding, open question, or evidence pointer inside an existing `NN-<angle>.md`.
     - A rerun of a high-stakes angle under an alternative assumption — pick an entry from `High-risk assumptions` in `00-brief.md`, flip it, and re-explore.
     - A steelman of an option the initial angles discarded or argued against.
     - An adjacent angle the request implies but didn't explicitly request (alternative design, observability story, migration plan, rollback strategy, etc.).
     If you find yourself thinking "I'm done" while `elapsed < budget_seconds`, that thought is the signal to pick from this list — not to wrap up.
   - Otherwise: done. Proceed to the final message.
9. **Final message to the user** (under 10 lines): the run folder path, the list of angles explored, a one-line note that each angle has pre-mortem / red-team / Socratic passes plus a per-angle synthesis, a pointer to `NN-<angle>-synthesis.md` as the entry point per angle (four source files remain for drill-down), and a pointer to `00-brief.md` for the assumptions and any missing pieces. No whole-run synthesis — the per-angle notes are the deliverable.

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

### Synthesiser subagent (one per angle)

After the three critiques for an angle have all returned, dispatch one synthesiser for that angle. Synthesisers for different angles in the same wave run in parallel.

- **Input note paths** — the four absolute paths for this angle: `NN-<angle>.md`, `NN-<angle>-pre-mortem.md`, `NN-<angle>-red-team.md`, `NN-<angle>-socratic.md`.
- **Output path** — the absolute path to write the synthesis to: `<run-folder>/NN-<angle>-synthesis.md`.
- **Output shape** — markdown distilling the angle into a single digestible note. Suggested sections (adapt to what the four files actually hold):
  - `## What this angle covers` — one or two sentences framing the angle.
  - `## Key findings` — the load-bearing points from the initial note, kept or revised in light of the critiques.
  - `## What the critiques changed` — concrete adjustments: which initial findings were invalidated, weakened, or reinforced; which attack vectors, failure narratives, or assumption probes mattered.
  - `## Recommendations` — the synthesiser's own judgement calls falling out of reading all four files together (e.g. "the red-team's attack vector X invalidates the initial finding Y, so pursue Z instead"). This is the part that makes the file more than a summary.
  - `## Open questions` — anything still unresolved after the critiques.
  The file must be materially shorter than the four source files combined; the point is digestibility.
- **Return contract** — write the synthesis file directly; reply to the orchestrator with **only** a 2–3 sentence summary plus the file path. Do **not** paste the synthesis back.
- **Hard constraints** — read all four input files before writing; do not invent findings that aren't grounded in at least one of them; do not edit code or other files. A reader must be able to act on the angle from the synthesis alone, with the four source files available only when they want to drill deeper.

## Time budget — a floor, not a ceiling

The optional time budget exists only to prevent under-using the gap the user is away. It is **not** a deadline — coming in under budget is a failure, not a success.

- **As long as `elapsed < budget_seconds`, there is always more useful work to do.** Treat that inequality as a standing instruction to dispatch another wave, not as permission to consider finishing. The thought "I've covered the angles" is not a stop signal — it is a prompt to pick one of the moves below.
- **Concrete moves when you can't think of more original angles** (any of these earns the next wave; combine as needed):
  - An unpicked angle from the catalog above for the request's trigger shape.
  - A deeper-dive subagent on a high-leverage finding, open question, or evidence pointer inside an existing `NN-<angle>.md`.
  - A rerun of a high-stakes angle under an alternative assumption — pick an entry from `High-risk assumptions` in `00-brief.md`, flip it, and re-explore.
  - A steelman of an option the initial angles discarded or argued against.
  - An adjacent angle the request implies but didn't explicitly request (alternative design, observability story, migration plan, rollback strategy, etc.).
- **Never abort a wave to come in under budget.** If `elapsed >= budget_seconds` mid-run with critique or synthesis subagents in flight, let them finish. It is forbidden to leave the workflow half-done — every dispatched initial angle gets all three of its critiques **and** its synthesis.
- **Never start a new initial angle after the budget is reached.** Once the loop's clock check fails (after letting in-flight subagents finish), the next step is the final user message — not another wave.
- **No budget given**: do the 3–5 planned angles plus their critiques and syntheses and stop. Cap at ~6 initial angles total to avoid drift even when generously paced.
- The orchestrator cannot watch a wall clock — every check is an explicit `date +%s` compared to `started_at` from `.metadata.json`.

If the user returns mid-run, they can interrupt manually. The folder is already useful (see *Resumability*).

## Resumability

The folder must be useful at every point during the run, not only at the end:

- `.metadata.json` and `00-brief.md` are written before any subagent is dispatched. Interruption between brief and the first dispatch still leaves the framing.
- Each subagent writes its file directly to disk. Mid-run interruption leaves whatever notes have been completed so far — initial angles only, initial + partial critiques, or critiques + partial syntheses.
- Per-angle synthesis is always the last step for that angle. A missing synthesis file just means the reader falls back to the four source files for that angle; it is still actionable.
- There is no `SUMMARY.md` or `INDEX.md` to be missing. The per-angle notes (and their syntheses, where present) are the artifact.

If the same topic is invoked again later (the user wants more depth, has more time, or wants to retry under different assumptions), the orchestrator creates a new run folder under the existing topic folder (`YYYY-MM-DD_02`, the next day's `YYYY-MM-DD_01`, etc.) and starts fresh. Earlier runs are never overwritten.

## When the request is too thin

If the rough idea is too vague to pick angles without inventing requirements, **still produce the folder**. Write `00-brief.md` with:

- The request as stated.
- A `Missing pieces` section listing the questions that would unblock real research.
- The most defensible assumptions to proceed under, marked clearly as assumptions.

Then run a reduced set of angles (e.g. prior art, candidate framings, glossary of terms) — and still apply the three critique passes and the per-angle synthesis to each — so the user returns to *something* (even if it's a "we'd need X, Y, Z to go further" dossier) instead of an empty folder and an apology.
