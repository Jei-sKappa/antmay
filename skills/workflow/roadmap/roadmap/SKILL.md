---
name: roadmap
description: Decompose a settled larger initiative into self-contained child-thread briefs — author a thread-root roadmap.md and an eager roadmap-feedback.md — creating no child threads; use when a thread's direction is agreed and needs breaking into independently executable children.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Roadmap

Turn a settled larger direction into a durable decomposition. You read the thread's authoritative inputs, decide how the initiative divides into independently valuable children, and write two artifacts at the thread root: `roadmap.md`, holding the direction and one self-contained brief per child, and `roadmap-feedback.md`, an eager append-only channel for later descendant discoveries. You author briefs; you do not open the child threads they describe. Writing the two artifacts is where you stop — do not stage, commit, or push.

The roadmap is a thinking and handoff artifact, not a project tracker. It carries no child status, no progress, no coordination state.

## Inputs

Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread; if several exist and which is active is ambiguous, ASK — never silently pick the most recent stamp.

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

### C1: <child title>

Outcome: <the independently valuable result this child should produce>

Context: <self-contained background needed to open the child>

Scope and boundaries:
- In scope: ...
- Out of scope: ...

Dependencies:
- C<N> — <what outcome or information this child consumes from that one>
- or: None

Relevant shared constraints:
- <the parent constraints that materially apply to this child>

Suggested workflow:
<the complete expanded workflow sequence — see "Expand each suggested workflow">

### C2: <child title>

...
```

Rules for the contents:

- **Child IDs are stable local references.** `C1`, `C2`, … name children inside this roadmap; dependencies cite these IDs, never titles. Numeric order is organizational only — it is not sequencing state, lifecycle, or a guarantee of execution order — and an ID never changes once written.
- **Each brief is self-contained enough to become a seed.** It must stand on its own: a reader with only the brief can understand the child's outcome, context, boundaries, what it consumes from its dependencies, the shared constraints that apply, and the complete workflow to follow. The roadmap defines independently discussable outcomes; it does not pre-write each child's specification.
- **Describe every dependency as a consumed input**, not a bare cross-reference — e.g. `C1 — consume the finalized authentication boundary and token-ownership rules`. When a child depends on nothing, write `None`.
- **Do not write a `Materialized thread:` field.** At authoring time no child exists, so that factual reference is simply absent — never `none`, never `pending`. A separate materialization operation adds it later, after a child is created.

## Expand each suggested workflow

Every child brief's `Suggested workflow` holds the complete recommended sequence in human-readable steps, with optional activities labelled optional — never a bare workflow name like `Quick` or `Standard`.

- When a brief follows a built-in workflow (Quick, Standard, or Roadmap), expand it now by copying the `## Suggested workflow` section **verbatim** from this skill's own reference for that workflow:
  - Quick → `references/shared/workflows/quick.md`
  - Standard → `references/shared/workflows/standard.md`
  - Roadmap → `references/shared/workflows/roadmap.md`

  Copy the steps exactly as written — do not paraphrase, trim, or reorder them.
- When the user supplies a complete custom suggestion for a child, embed that text as given.

The brief must carry the fully expanded sequence so nothing downstream has to resolve a name against a workflow reference again.

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

## Recording decisions and blocking

Any genuine human decision you obtain while authoring — an answer that settles product or workflow intent, such as where a scope boundary falls or how the work should divide — is appended to the thread's `decisions.md` as a normal Decision Record **before** you rely on it in the roadmap. Trivial input clarifications (which file, which name was meant) need no record.

Under an explicit AFK invocation, do not invent intent to fill a gap. When authoring is blocked on a decision only a human can settle, hand the open decision(s) to `/emit-pending-decisions` as one bundle — giving it `/roadmap` as the producer, `roadmap.md` as the target, the evidence you weighed, the open decision(s), and a suggested follow-up (settle the decisions, then author the roadmap again) — and stop rather than guessing.

## Report

This is a completion-oriented operation, not a dialogue. After writing the two artifacts, report concisely what you decomposed and the paths you wrote. No preamble, no closing remark.
