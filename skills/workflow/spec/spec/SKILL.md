---
name: spec
description: Forward-design a thread's durable inputs (seed, decisions, an optional proposal) or a referenced artifact into a handoff-grade spec.md at a thread root; use when an upstream input needs designing into a complete spec a downstream planner or implementer can build from.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.0.0
---

# Spec

Forward-design a handoff-grade spec from a thread's durable inputs, end-to-end. You read the thread's context, draft a spec body that covers all eight required semantic-contract elements plus the two spec obligations, write the single thread-root `spec.md`, and confirm its path. By default you work straight from the durable inputs without interviewing the user element by element; you honor an invocation that asks you to check in or work through the spec interactively. Writing the file is where you stop — do not stage, commit, or push.

A handoff-grade spec is one a downstream reader with no prior context can read alone and know what to build: what the outcome is, what is in and out of scope, how it must behave, what binds it, what is deliberately left free, and how a reviewer will know it is right.

## Inputs

The spec is forward-designed from the thread's durable inputs plus whatever the invocation points you at:

- **`seed.md`** — why the thread exists and what triggered it; the source of the spec's context.
- **`decisions.md`** — the settled `D<N>` decisions the spec must encode and must not contradict.
- **`proposal.md`** (when present) — the direction-setting sketch the spec elaborates into expected behavior, constraints, and acceptance guidance.
- **A referenced artifact or the user's prompt** — an explicit path, a GitHub issue, or the prompt itself when nothing else is referenced. Treat an issue's title and labels as additional context.

If which input is meant is ambiguous — a reference names "the proposal" or "the spec" with no clear referent, or several artifacts could be intended — ask the user which is intended. Do not silently pick by recency.

## Semantic contract

The emitted spec MUST cover all EIGHT of the following elements in its body, regardless of the section names used:

1. **Intended outcome** — what this spec, when implemented, produces for the user.
2. **Context** — why this is being built; what came before; what triggered the spec.
3. **Scope / non-scope** — the boundary statement, INCLUDING what is explicitly out.
4. **Expected behavior** — the observable behaviors a future executor needs.
5. **Constraints** — tech, repo, harness, and safety constraints that bind the implementation.
6. **Explicit decisions** — settled trade-offs INLINED into the body where they are operative (in scope, in constraints, in expected behavior, in acceptance). When a settled decision comes from `decisions.md`, cite the source `D<N>` at the inline location where it becomes operative — e.g. `(per decisions.md D3)` — rather than copying the decision text.
7. **Unresolved questions** — open issues that do NOT block emission; the spec is shipped with these flagged.
8. **Acceptance guidance** — how a reviewer will know the implementation is right (see `## Acceptance guidance and degrees of freedom`).

The eight elements MAY be presented as a copy-paste template OR interleaved into a freeform structure appropriate to the input — section names and ordering are yours to choose. What is not yours to choose: every one of the eight must appear, the two obligations below must appear, and the spec must read as handoff-grade.

There is no mandatory `## Decisions` heading. A separate decisions section is dead weight — settled decisions belong inlined into the elements they govern, each carrying a citation back to its `D<N>` record. Do not add such a section to satisfy an implicit template.

## Acceptance guidance and degrees of freedom

Two obligations beyond the eight elements make downstream plan autonomy safe rather than hopeful:

1. **Machine-checkable acceptance criteria (wherever the work carries a design decision).** Express the acceptance guidance as machine-checkable acceptance criteria following the FR/AC + coverage + traceability model:
   - **FR/AC** — enumerate functional requirements as `FR-<id>` and, under each, one or more acceptance criteria as `AC-<id>.<n>`, each phrased as a concrete, checkable assertion — an observable outcome a reviewer or a test can verify pass/fail, not a vague aspiration.
   - **Coverage** — every expected behavior in the spec body is covered by at least one AC; nothing observable is left without a check.
   - **Traceability** — each AC traces back to the requirement (and, where relevant, the settled decision) it enforces, so a reviewer can follow each check to its origin.

   This is what lets an automated adherence review clear the downstream plan without the human re-reading it. For trivial work with no design decision the criteria may be lighter prose, but write machine-checkable criteria whenever the work carries a design decision.

2. **A `## Degrees of freedom` section (every spec).** List the *hows* deliberately left to the implementer's free choice. The *what* is handoff-grade and pinned; the listed *hows* are explicitly granted as open. This section is what lets an automated adherence review distinguish "the plan deviated from the spec" from "the plan chose within granted freedom." If there are genuinely no degrees of freedom, say so explicitly rather than omitting the section.

## Lossless authoring

The spec must commit to **no decision or assumption** the user did not see and accept in the durable inputs, **unless the spec explicitly marks it a degree of freedom.** The unit of this bar is a decision or an assumption — never a sentence: a spec freely elaborates settled decisions into prose, structure, and derived acceptance criteria. Elaboration is allowed and expected; introducing a new decision or assumption the user never saw is forbidden.

When forward-designing surfaces a specific the input did not settle, there are exactly two legal moves — never silently bake it in:

1. **Take it back to the user** — leave the gap as an `## Unresolved question`, or stop and flag that the spec cannot be completed without the user settling it, so the decision is made before it is committed. A settled answer is recorded per `## Recording elicited decisions`.
2. **Mark it a degree of freedom** — record it in the `## Degrees of freedom` section as a *how* left open to the implementer, so it is visibly granted rather than smuggled in as a pinned commitment.

Pinning an undiscussed decision into expected behavior or a constraint as if it were settled is the failure this prevents.

## Operation

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp. If no thread exists yet, tell the user a thread must be opened before a spec can be written, and stop; do not create the thread or its seed yourself.

2. **Load context.** Read the thread's `seed.md` and `decisions.md`, any `proposal.md`, and whatever artifact or prompt the invocation points you at. `decisions.md` says what has already been settled, so the spec neither re-litigates a closed decision nor contradicts one without noticing.

3. **Draft the body.** Cover all eight semantic-contract elements, inline settled decisions where operative and cite their `D<N>` records, and add the two obligations. Honor the lossless constraint: for any specific the input did not settle, either leave it an `## Unresolved question` or mark it a degree of freedom; never bake it in silently. Keep the spec readable end-to-end by a stranger with no prior context. Adapt length to what the input warrants — a tight spec is better than a padded one.

4. **Write the artifact.** Write the single file `docs/threads/<thread>/spec.md` — literally that name at the thread root, with no frontmatter. If `spec.md` already exists, revise it in place: the same file is the stable reference through any review-and-revise cycles. Within-thread references in the body are thread-relative (e.g. `decisions.md`, `proposal.md`), never repo-rooted or absolute; cross-thread references are repo-relative (`docs/threads/<other>/…`).

5. **Confirm.** Tell the user exactly: `Spec written: spec.md`. Nothing else — no preamble, no summary, no closing remark.

## Recording elicited decisions

If writing the spec requires asking the user a question that settles product or workflow intent — a direction the spec will then depend on — append the answer to the thread-root `decisions.md` as a `D<N>` record **before** the spec relies on it. Trivial clarifications about the input (what a phrase meant, which file was intended) settle nothing and need no record.

Number records sequentially across the thread: scan `decisions.md` for the highest existing `D<N>` and use the next integer. Each record is self-contained so a fresh agent understands what was decided without the chat:

```markdown
## D<N>: <Title>

Scope: <optional — omit when the whole thread is the scope; otherwise name the stage or thread-relative artifact the decision applies to>

Context: <one short paragraph stating the question and the surrounding facts needed to understand it, written from the thread's perspective — never "as you said" or "the user chose">

Decision: <the complete substantive resolution, written out in full>

Rationale: <why this resolution and its principal trade-off>
```

Records are append-only: never rewrite or delete one. When a settled decision later changes, append a new record naming the one it supersedes.

## Blocked under an AFK invocation

When the invocation is explicitly AFK (no human is available to answer) and a human decision is genuinely indispensable to write a sound spec — one you cannot settle yourself from the durable inputs — do not invent the intent and do not stall waiting in chat. Hand the open decision to `/emit-pending-decisions`, giving it `/spec` as the producer, `spec.md` as the target, the context you gathered as evidence, the open decision(s), and a suggested follow-up (settle the decision, then resume the spec). Then stop and report concisely that the run is blocked on a queued decision and where the bundle was written.
