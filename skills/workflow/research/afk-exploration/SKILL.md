---
name: afk-exploration
description: Start AFK exploration on a topic only when the user explicitly asks for AFK research or exploration.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.4.4
---

# AFK Exploration

The user has a rough idea — a new project, a feature in an existing one, or a bug fix — and is stepping away from the computer. Use that gap to research the idea, build a knowledge base they can return to, and stop short of writing the spec. The artifact must be useful enough that on returning the user can write the spec from it without redoing the upfront thinking.

This is the unattended counterpart to an interactive ideation session. There is no human to dialogue with mid-run; recorded assumptions replace clarifying questions.

## Orchestrator role

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
│   │   ├── workflow-notes.md         # append-only journal of orchestrator decisions
│   │   ├── 01-<angle>/               # research angle
│   │   │   ├── research.md           # initial research note (subagent)
│   │   │   ├── pre-mortem.md         # critique: failure narratives
│   │   │   ├── red-team.md           # critique: adversarial attack vectors
│   │   │   ├── socratic.md           # critique: assumption probes
│   │   │   └── synthesis.md          # per-angle synthesis of the four files above
│   │   ├── 02-<angle>/               # prototype angle (same shape, different artifacts)
│   │   │   ├── prototype-pointer.md  # /tmp path + how to run + status; written before deps
│   │   │   ├── findings.md           # what the prototype taught (in place of research.md)
│   │   │   ├── <materials>           # optional: load-bearing files preserved outside /tmp
│   │   │   ├── pre-mortem.md
│   │   │   ├── red-team.md
│   │   │   ├── socratic.md
│   │   │   └── synthesis.md
│   └── 2026-05-12_01/                # later run on the same topic, e.g. with different assumptions
└── 0002-<topic-slug>/                # different topic
```

Why this shape:

- **Project-scoped**: research lives next to the code it concerns, so it's discoverable from inside the project later.
- **Topic-numbered**: `0001`, `0002`, … sort topics by creation order at a glance.
- **Date + per-day run-index**: multiple runs on the same topic in a day are distinguishable; runs sort chronologically.
- **Decision journal**: `workflow-notes.md` is an append-only log of the orchestrator's choices — which angles were picked at Step 2, what each Step 6 clock check decided (continue or wrap, which moves, picked or invented), and the rationale. The user can audit the run's choices without reading the research notes themselves.
- **One subfolder per angle**: research angles hold `research.md` plus three critique files (pre-mortem, red team adversarial, Socratic) and a per-angle synthesis. Prototype angles swap `research.md` for `findings.md`, add `prototype-pointer.md` (and optionally auxiliary materials preserved outside `/tmp`), and otherwise share the same critique-and-synthesis structure. Grouping by folder keeps `00-brief.md` and `workflow-notes.md` legible at the run root even when a wave or two of follow-ups push the angle count into the double digits.
- **Per-angle synthesis, no whole-run digest**: each angle ends in a synthesis file so the reader can act on the angle without opening the other four. There is no top-level full exploration summary — the orchestrator never combines angles into a run-wide summary. If a cross-angle digest is wanted later, the user can ask for one in a follow-up.

Slug the topic from 2–4 keywords in the user's prompt, lowercase, hyphenated (e.g. "Add OAuth login to admin panel" → `oauth-admin-login`).

## Workflow

Run the process as numbered steps. **Steps run in order**; *inside a step*, every subagent the step dispatches runs in parallel and the orchestrator waits for them all to return before advancing to the next step. If a single tool call would dispatch too many subagents to run reliably in parallel, fall back to smaller batches **inside the same step** (e.g. split Step 3's angles into two batches, waiting for the first to return before issuing the second) — never collapse steps into each other or change their order.

### Step 1 — Bootstrap

1. **Resolve the run folder.**
   - `ls <cwd>/docs/afk-exploration/` to find existing topics. If a topic with the same or near-identical slug exists and the request is clearly a continuation, reuse it; otherwise pick the next zero-padded 4-digit prefix (`0001`, `0002`, …).
   - Inside the topic folder, list runs matching `YYYY-MM-DD_NN`. Pick today's date with the next zero-padded 2-digit index (`01` if no runs today, otherwise `02`, `03`, …). Separate the date from the per-day index with `_`, not `-`, so the index is visually distinct from the date components.
   - `mkdir -p` the run folder. Per-angle subfolders are **not** pre-created here — each initial-angle subagent creates its own (`NN-<angle>/`) when it writes `research.md`, which keeps creation uniform across both Step 3 and any Step 6 follow-up waves where new angles are decided on the fly.
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
4. **Create `workflow-notes.md`** with a placeholder header (e.g. `# Workflow notes`). This is the append-only decision journal — every orchestrator choice (Step 2 angle picks, Step 6 clock-check outcomes, invented moves) gets a new entry with its rationale. Subsequent steps append; never rewrite earlier entries.

### Step 2 — Plan

Pick 3–5 angles from the catalog below — the ones that earn their slot for *this* request. An angle may be a **prototype angle** if the hypothesis is already sharp from the request and research wouldn't refine it; otherwise defer prototypes to Step 6 once research has surfaced what's worth testing in code (see *When to spawn a prototype*). Append an entry to `workflow-notes.md` recording the picks, what was considered and skipped, and the rationale — including the prototype/research decision for any prototype angle.

### Step 3 — Initial research

Dispatch one subagent per planned angle, all in a single parallel tool call, and wait for **every** angle to return before moving to Step 4. Research angles get the initial-angle subagent; prototype angles get the prototyper subagent. See *Subagent briefs* below.

### Step 4 — Critiques

Process angles **one at a time** so this step never has more than three subagents in flight at once. For each returned angle in turn, dispatch its three critique subagents (pre-mortem, red team adversarial, Socratic) in a single parallel tool call, wait for all three to return, then move to the next angle. Each critique subagent reads the angle's note from disk (`research.md` for research angles, `findings.md` for prototype angles), applies the method from the corresponding reference file, and writes its critique file. Three more files per angle land on disk. Only advance to Step 5 once **every** angle in the wave has its three critique files on disk.

### Step 5 — Synthesis

Dispatch one synthesiser subagent per angle in a single parallel tool call covering every angle in the wave, and wait for **every** synthesis to return before moving to Step 6. Each synthesiser reads its angle's note (`research.md` or `findings.md`) plus the three critiques from disk and writes `NN-<angle>/synthesis.md` — a single digestible note that captures the load-bearing points and adds the conclusions that fall out of reading all four files together. See *Subagent briefs* below.

### Step 6 — Clock check

Re-read `.metadata.json`. Compute `elapsed = $(date +%s) - started_at`.

- **If a `budget_seconds` is set and `elapsed < budget_seconds`, the loop is not done.** Pick one or two concrete moves and **loop back to Step 3** with the new angles — they go through Step 4 (critiques) and Step 5 (synthesis) like the first wave. Existing angles already have their critiques and synthesis. The moves below are a starting point, not a checklist — invented moves outside this list are encouraged when the request calls for them, and especially when **plenty** of budget remains, step back and ask "what would the user most value next?" before defaulting to the catalog.
  - An unpicked angle from the catalog above for the request's trigger shape.
  - A deeper-dive subagent on a high-leverage finding, open question, or evidence pointer inside an existing `NN-<angle>/research.md` or `NN-<angle>/findings.md`.
  - A rerun of a high-stakes angle under an alternative assumption — pick an entry from `High-risk assumptions` in `00-brief.md`, flip it, and re-explore.
  - A steelman of an option the initial angles discarded or argued against.
  - An adjacent angle the request implies but didn't explicitly request (alternative design, observability story, migration plan, rollback strategy, etc.).
  - A prototype angle to test a sharp hypothesis the research has surfaced (see *When to spawn a prototype*). Usually the right move when an earlier synthesis flagged a load-bearing question better answered with code than more reading. Budget-aware: a prototype angle costs ~3–5× a research angle.
  If you find yourself thinking "I'm done" while `elapsed < budget_seconds`, that thought is the signal to pick a move — not to wrap up.
- Otherwise: done. Proceed to Step 7.

**Log every Step 6 outcome to `workflow-notes.md`** before continuing — what was decided (continue or wrap), which moves were picked or invented, and the rationale. No wave happens silently.

### Step 7 — Final message

Send a message to the user (under 10 lines): the run folder path, the list of angles explored (flag prototype angles inline, e.g. `02 oauth-flow [prototype]`), a one-line note that each angle has pre-mortem / red-team / Socratic passes plus a per-angle synthesis, a pointer to `NN-<angle>/synthesis.md` as the entry point per angle (the four source files in the same folder remain for drill-down; prototype angles also have `prototype-pointer.md` recording the temp-directory location while it still exists in `/tmp`), a pointer to `00-brief.md` for the assumptions and any missing pieces, and a pointer to `workflow-notes.md` for the orchestrator's decision log. No whole-run synthesis — the per-angle notes are the deliverable.

End with exactly one terminal line: `Outcome: DONE — Exploration written: <run-folder path>`.

## Choosing research angles

The catalog below is a starting point, not a checklist. Pick the angles that earn their slot for *this* request — choose from the catalog, invent fresh angles the catalog doesn't list, or mix both. Never run an angle just because it appears here, and never feel limited to what's listed when the request calls for something else.

- **New project** — prior art and existing solutions; target users and core use cases; technical stack candidates; MVP scope and what to defer; risks and unknowns; architectural sketch.
- **Feature in an existing project** — current architecture and integration points; data model and migration impact; UX surface and existing patterns to mirror; edge cases and failure modes; alternative designs; observability and rollback story.
- **Bug fix** — reproducer and minimal failing case; root-cause hypotheses; blast radius and affected code paths; existing tests in the area; fix candidates with trade-offs; regression risk and required new coverage.

When the trigger is ambiguous, pick the closest category as a starting point and note the choice under `Assumptions` in the brief. Borrow angles from another category, or invent fresh ones, whenever the request calls for them.

## When to spawn a prototype

A **prototype angle** builds a disposable codebase that exercises a hypothesis in actual code, in place of (not alongside) the standard research note. Its value is what it teaches — a research note can describe an API, but only running real code against it tells you whether the API actually feels right. Size the prototype to the hypothesis, not to a notion of "small": a feel-check of one API call might be 50 lines; a multi-subsystem integration check might reasonably be several hundred. The constraint is on *unnecessary* code (scaffolding, polish, error handling the question doesn't need), not on *total* code.

Spawn a prototype when the request involves any of:

- **Library or SDK ergonomics** — only running real code with an API tells you whether it fits.
- **Performance claims worth measuring** — latency, throughput, memory; benchmark, don't argue.
- **Integration end-to-end behavior** — OAuth flows, webhooks, payments; "should work on paper" until it doesn't.
- **UX or DX feel** — animation APIs, state-machine libraries, validation syntax; only writing with it reveals the feel.
- **Comparison by measurement** — library A vs library B, DuckDB vs Postgres on representative data.

Skip a prototype when:

- The question is purely organizational (rename, refactor strategy, team process).
- The answer is documentable from docs and prior art alone.
- Required credentials or infrastructure aren't available.
- The request is too vague to pick a sharp hypothesis.

**When to fire**:

- **Step 2** — only when the hypothesis is already sharp from the request itself and research wouldn't refine it. (E.g. "does Auth.js feel right for our session model?" is sharp on day one.)
- **Step 6** — the default. Research first, then pick a prototype to test the load-bearing question the research surfaced.

Log the decision in `workflow-notes.md` either way, including the explicit hypothesis the prototype is testing.

**Cap**: 1 prototype per run by default. Up to 2 when the request is genuinely comparative (A vs B). Beyond that requires explicit rationale in `workflow-notes.md`.

**Cost**: a prototype angle eats roughly 3–5× a research angle's wall-clock and gates whatever wave it's in. Factor this into Step 2 / Step 6 planning, especially under a tight `budget_seconds`.

## Subagent briefs

Each dispatched agent gets a self-contained prompt. The orchestrator never inherits the agent's session and never loads the agent's output back into its own context.

### Initial angle subagent

- **Scope** — paste the `Scope` and `Out of scope` sections from `00-brief.md`.
- **Angle** — the single angle this agent investigates, framed as one focused question.
- **Output path** — the absolute path to write the note to (e.g. `<run-folder>/01-existing-architecture/research.md`). Each subagent gets a different angle folder so they cannot collide. The subagent must `mkdir -p` the angle subfolder before writing — it does not exist yet.
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
- **Output path** — the absolute path to write the critique to, inside the same angle subfolder as the initial note (`<angle-folder>/pre-mortem.md`, `<angle-folder>/red-team.md`, `<angle-folder>/socratic.md`). The folder already exists — the initial-angle subagent created it.
- **Return contract** — write the critique file directly; reply with **only** a 2–3 sentence summary. Do not paste the critique back.
- **Hard constraints** — read the input note and the reference; apply the reference's method to the *content* of the note (not to the abstract idea); do not edit code or other files.

The reference files describe each critique method in full (process, templates, output shape). The orchestrator itself does not read them; only the critique subagents do.

### Synthesiser subagent (one per angle)

After the three critiques for an angle have all returned, dispatch one synthesiser for that angle. Synthesisers for different angles in the same wave run in parallel.

- **Input note paths** — the four absolute paths for this angle, all inside the same angle subfolder: `NN-<angle>/research.md`, `NN-<angle>/pre-mortem.md`, `NN-<angle>/red-team.md`, `NN-<angle>/socratic.md`.
- **Output path** — the absolute path to write the synthesis to, alongside the four source files: `<run-folder>/NN-<angle>/synthesis.md`.
- **Output shape** — markdown distilling the angle into a single digestible note. Suggested sections (adapt to what the four files actually hold):
  - `## What this angle covers` — one or two sentences framing the angle.
  - `## Key findings` — the load-bearing points from the initial note, kept or revised in light of the critiques.
  - `## What the critiques changed` — concrete adjustments: which initial findings were invalidated, weakened, or reinforced; which attack vectors, failure narratives, or assumption probes mattered.
  - `## Recommendations` — the synthesiser's own judgement calls falling out of reading all four files together (e.g. "the red-team's attack vector X invalidates the initial finding Y, so pursue Z instead"). This is the part that makes the file more than a summary.
  - `## Open questions` — anything still unresolved after the critiques.
  The file must be materially shorter than the four source files combined; the point is digestibility.
- **Return contract** — write the synthesis file directly; reply to the orchestrator with **only** a 2–3 sentence summary plus the file path. Do **not** paste the synthesis back.
- **Hard constraints** — read all four input files before writing; do not invent findings that aren't grounded in at least one of them; do not edit code or other files. A reader must be able to act on the angle from the synthesis alone, with the four source files available only when they want to drill deeper.

### Prototyper subagent

When a prototype angle is dispatched (Step 3 or Step 6), use one prototyper subagent. The detailed method — step ordering, `mktemp` invocation, codebase-copy options, `findings.md` template, materials guidance, and the full hard-constraints list — lives in the reference file; the orchestrator does not read it.

- **Scope** — paste the `Scope` and `Out of scope` sections from `00-brief.md`.
- **Hypothesis** — the single question the prototype is built to answer, framed as one sentence (e.g. "does Auth.js's OAuth flow integrate cleanly with our session middleware?").
- **Method reference path** — the absolute path of the prototyping reference: `<skill-base>/references/throwaway-prototyping.md`. Resolve from this skill's base directory.
- **Topic slug** — the run's topic slug, used by the agent to compose `mktemp -d /tmp/afkprt.<topic-slug>.XXXXXX`.
- **Angle folder** — the absolute path of the angle folder (e.g. `<run-folder>/02-oauth-flow/`). The prototyper `mkdir -p`s this; auxiliary materials (load-bearing artifacts too bulky for inline in `findings.md`) may also be written here.
- **Findings output path** — the absolute path to write the findings note to: `<angle-folder>/findings.md`.
- **Pointer output path** — the absolute path to write the temp-directory pointer to: `<angle-folder>/prototype-pointer.md`. The reference requires this to be written **before** any heavy work (dependency installation, code copying) so an interrupted run still leaves a record.
- **Codebase context** — for incremental prototypes (the experiment modifies the user's existing project), the absolute path of the user's project to copy from; null for from-scratch prototypes. The reference describes the copy methods.
- **Return contract** — write the findings file, the pointer file, the prototype code (inside `/tmp`), and any auxiliary materials; reply to the orchestrator with **only** a 2–3 sentence summary plus the findings path and the temp directory path. Do **not** paste findings or code back.
- **Hard constraints** — see the reference for the full list. Summary: writes confined to the temp directory + the two named files in the angle folder + any auxiliary materials in the angle folder; the user's actual project is read-only; no sudo; no global installs; no long-running background processes; dependency-install failure is a finding, not an abort.

## Time budget — a floor, not a ceiling

The optional time budget exists only to prevent under-using the gap the user is away. It is **not** a deadline — coming in under budget is a failure, not a success.

- **As long as `elapsed < budget_seconds`, there is always more useful work to do.** Treat that inequality as a standing instruction to dispatch another wave, not as permission to consider finishing. The thought "I've covered the angles" is not a stop signal — it is a prompt to pick one of the moves below.
- **Concrete moves when you can't think of more original angles** (any of these earns the next wave; combine as needed):
  - An unpicked angle from the catalog above for the request's trigger shape.
  - A deeper-dive subagent on a high-leverage finding, open question, or evidence pointer inside an existing `NN-<angle>/research.md` or `NN-<angle>/findings.md`.
  - A rerun of a high-stakes angle under an alternative assumption — pick an entry from `High-risk assumptions` in `00-brief.md`, flip it, and re-explore.
  - A steelman of an option the initial angles discarded or argued against.
  - An adjacent angle the request implies but didn't explicitly request (alternative design, observability story, migration plan, rollback strategy, etc.).
  - A prototype angle to test a sharp hypothesis surfaced by earlier waves (see *When to spawn a prototype*). Budget-aware: a prototype angle costs ~3–5× a research angle.
- **Never abort a wave to come in under budget.** If `elapsed >= budget_seconds` mid-run with critique or synthesis subagents in flight, let them finish. It is forbidden to leave the exploration half-done — every dispatched initial angle gets all three of its critiques **and** its synthesis.
- **Never start a new initial angle after the budget is reached.** Once the loop's clock check fails (after letting in-flight subagents finish), the next step is the final user message — not another wave.
- **No budget given**: do the 3–5 planned angles plus their critiques and syntheses and stop. Cap at ~6 initial angles total to avoid drift even when generously paced.
- The orchestrator cannot watch a wall clock — every check is an explicit `date +%s` compared to `started_at` from `.metadata.json`.

If the user returns mid-run, they can interrupt manually. The folder is already useful (see *Resumability*).

## Resumability

The folder must be useful at every point during the run, not only at the end:

- `.metadata.json`, `00-brief.md`, and `workflow-notes.md` are written before any subagent is dispatched. Interruption between bootstrap and the first dispatch still leaves the framing and an empty journal.
- `workflow-notes.md` is appended to as decisions are made (Step 2 angle picks, every Step 6 clock check). Mid-run interruption leaves the entries that were already written, so the user can still see which decisions had been made up to that point.
- Each subagent writes its file directly to disk. Mid-run interruption leaves whatever notes have been completed so far — initial angles only, initial + partial critiques, or critiques + partial syntheses.
- Per-angle synthesis is always the last step for that angle. A missing synthesis file just means the reader falls back to the four source files for that angle; it is still actionable.
- Prototype angles write `prototype-pointer.md` **before** any dependency installation or codebase copy, so an interrupted prototype still leaves a record of the temp-directory location for the user to inspect manually. A missing `findings.md` for a prototype angle is the same signal as a missing `research.md` for a research angle — the angle didn't finish. The temp directory in `/tmp` is volatile; the angle folder is the durable record.
- There is no `SUMMARY.md` or `INDEX.md` to be missing. The per-angle notes (and their syntheses, where present) are the artifact; `workflow-notes.md` records the reasoning behind them.

If the same topic is invoked again later (the user wants more depth, has more time, or wants to retry under different assumptions), the orchestrator creates a new run folder under the existing topic folder (`YYYY-MM-DD_02`, the next day's `YYYY-MM-DD_01`, etc.) and starts fresh. Earlier runs are never overwritten.

## When the request is too thin

If the rough idea is too vague to pick angles without inventing requirements, **still produce the folder**. Write `00-brief.md` with:

- The request as stated.
- A `Missing pieces` section listing the questions that would unblock real research.
- The most defensible assumptions to proceed under, marked clearly as assumptions.

Then run a reduced set of angles (e.g. prior art, candidate framings, glossary of terms) — and still apply the three critique passes and the per-angle synthesis to each — so the user returns to *something* (even if it's a "we'd need X, Y, Z to go further" dossier) instead of an empty folder and an apology.
