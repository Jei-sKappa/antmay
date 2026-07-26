---
name: roadmap
description: Decompose a settled larger initiative into self-contained child-thread briefs — author a thread-root roadmap.md and an eager roadmap-feedback.md — creating no child threads; use when a thread's direction is agreed and needs breaking into independently executable children.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.1.0
---

# Roadmap

Turn a settled larger direction into a durable decomposition. You read the thread's authoritative inputs, decide how the initiative divides into independently valuable children, and write two artifacts at the thread root: `roadmap.md`, holding the direction and one self-contained brief per child, and `roadmap-feedback.md`, an eager append-only channel for later descendant discoveries. Writing the two artifacts is where you stop — do not stage, commit, or push.

The roadmap is a thinking and handoff artifact.

## Inputs

Run a mandatory preflight before any substantive execution (authoring the artifacts). Every preflight failure writes nothing, emits no bundle, and ends `Outcome: REFUSED — <reason and how to re-invoke>`. Resolve the thread first: work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`; if `cwd` already sits inside a thread root, that is the thread. Refuse when no thread exists yet, or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp). Then validate the inputs: refuse when a required authoritative input is missing, or when which input is meant is ambiguous — name the missing or ambiguous input and how to supply it rather than guessing or picking by recency.

Read the thread's authoritative inputs and let them drive the decomposition:

- `seed.md` — why the thread exists and its intended outcome.
- `decisions.md` — every settled human decision that governs the direction.
- `proposal.md`, when present — the sketched direction the roadmap refines.

## Author `roadmap.md`

Write the thread-root `roadmap.md` in this shape:

```markdown
# Roadmap: <title>

## Intended outcome

<what completing the overall initiative should accomplish>

## Context

<why the initiative exists and the surrounding project context, self-contained
so the artifact is understandable without the originating chat>

## Scope and boundaries

### In scope

...

### Out of scope

...

## Shared constraints

<only constraints that apply across multiple children; a constraint touching a
single child belongs in that child's brief, not here>

## Decomposition rationale

<why the work divides into these children and boundaries, including important
sequencing or ownership boundaries>

## Child threads

### CB1: <child title>

Outcome: <the independently valuable result this child should produce>

Context: <self-contained background needed to open the child>

Scope and boundaries:
- In scope: ...
- Out of scope: ...

Dependencies:
- CB<N> — <what outcome or information this child consumes from that one>
- or: None

Relevant shared constraints:
- <the parent constraints that materially apply to this child>

### CB2: <child title>

...
```

Rules for the contents:

- **Child IDs are stable local references.** `CB1`, `CB2`, … name children inside this roadmap; dependencies cite these IDs, never titles. Numeric order is organizational only — it is not sequencing state, lifecycle, or a guarantee of execution order — and an ID never changes once written.
- **Each brief is self-contained enough to become a seed.** It must stand on its own: a reader with only the brief can understand the child's outcome, context, boundaries, what it consumes from its dependencies, and the shared constraints that apply. The roadmap defines independently discussable outcomes; it does not pre-write each child's specification.
- **Describe every dependency as a consumed input**, not a bare cross-reference — e.g. `CB1 — consume the finalized authentication boundary and token-ownership rules`. When a child depends on nothing, write `None`.
- **Do not write a `Materialized thread:` field.** At authoring time no child exists, so that factual reference is simply absent — never `none`, never `pending`. A separate materialization operation adds it later, after a child is created.

## Author `roadmap-feedback.md`

Eagerly create the thread-root `roadmap-feedback.md` in the same run, containing exactly its header and nothing else:

```markdown
# Roadmap Feedback
```

You write only the header. Records accrue later, appended by descendants for discoveries that carry parent- or sibling-level impact.

## Boundaries

- **Create no child threads.** You write briefs; the threads they describe are opened by a separate operation. Opening, seeding, or otherwise materializing any child is outside this skill.
- **No tracking machinery.** The roadmap and its briefs carry no checkboxes, status fields, progress percentages, owners, completion markers, or approval state. You do not become a long-lived coordinator that watches children after authoring.
- **No cycles.** A child may itself warrant further decomposition and may follow the Roadmap workflow when that is genuinely required, but a child is never made to point back at an ancestor — parent–child cycles are not meaningful and must not be created.

## Blocked

This path is reachable only after preflight has passed and authoring the decomposition from otherwise-valid inputs has begun — substantive execution. Ambiguous inputs and missing required artifacts are preflight refusals (`## Inputs`), not this path. It applies to a genuine decomposition choice discovered during authoring that existing durable intent does not settle — an answer that settles product or workflow intent, such as where a scope boundary falls or how the work should divide, that you cannot settle yourself from the authoritative inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat. Finish everything safely derivable first, then hand the open decision(s) to `/emit-pending-decisions` as one bundle — giving it `/roadmap` as the producer, `roadmap.md` as the target, the evidence you weighed, the originating user request, the open decision(s), and a suggested follow-up (settle the decisions, then author the roadmap again). Then stop with a concise notification of where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

## Report

This is a completion-oriented operation, not a dialogue. After writing the two artifacts, report concisely what you decomposed and the paths you wrote, ending with `Outcome: DONE — Roadmap written: roadmap.md, roadmap-feedback.md`. No preamble, no closing remark.
