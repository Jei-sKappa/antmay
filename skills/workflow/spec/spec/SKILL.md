---
name: spec
description: Forward-design a thread's durable inputs (seed, decisions, an optional proposal) or a referenced artifact into a handoff-grade spec.md at a thread root; use when an upstream input needs designing into a complete spec a downstream planner or implementer can build from.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.2.0
---

# Spec

Forward-design a handoff-grade spec from a thread's durable inputs, end-to-end. You read the thread's context, draft a spec body that covers all seven required semantic-contract elements plus the two spec obligations, write the single thread-root `spec.md`, and confirm its path. You work straight from the durable inputs without interviewing the user element by element. Writing the file is where you stop — do not stage, commit, or push.

A handoff-grade spec is one a downstream reader with no prior context can read alone and know what to build: what the outcome is, what is in and out of scope, how it must behave, what binds it, what is deliberately left free, and how a reviewer will know it is right.

## Inputs

The spec is forward-designed from the thread's durable inputs plus whatever the invocation points you at:

- **`seed.md`** — why the thread exists and what triggered it; the source of the spec's context.
- **`decisions.md`** — the settled `D<N>` decisions the spec must encode and must not contradict.
- **`proposal.md`** (when present) — the direction-setting sketch the spec elaborates into expected behavior, constraints, and acceptance guidance.
- **A referenced artifact or the user's prompt** — an explicit path, a GitHub issue, or the prompt itself when nothing else is referenced. Treat an issue's title and labels as additional context.

If which input is meant is ambiguous — a reference names "the proposal" or "the spec" with no clear referent, or several artifacts could be intended — that is a preflight failure, not an in-run decision: refuse before drafting, name the ambiguous reference and how to disambiguate it, write nothing, and end with `Outcome: REFUSED — <the ambiguity and how to re-invoke>`. Never silently pick by recency.

## Semantic contract

The emitted spec MUST cover all SEVEN of the following elements in its body, regardless of the section names used:

1. **Intended outcome** — what this spec, when implemented, produces for the user.
2. **Context** — why this is being built; what came before; what triggered the spec.
3. **Scope / non-scope** — the boundary statement, INCLUDING what is explicitly out.
4. **Expected behavior** — the observable behaviors a future executor needs.
5. **Constraints** — tech, repo, harness, and safety constraints that bind the implementation.
6. **Explicit decisions** — settled trade-offs INLINED into the body where they are operative (in scope, in constraints, in expected behavior, in acceptance). When a settled decision comes from `decisions.md`, cite the source `D<N>` at the inline location where it becomes operative — e.g. `(per decisions.md D3)` — rather than copying the decision text.
7. **Acceptance guidance** — how a reviewer will know the implementation is right (see `## Acceptance guidance and degrees of freedom`).

The seven elements MAY be presented as a copy-paste template OR interleaved into a freeform structure appropriate to the input — section names and ordering are yours to choose. What is not yours to choose: every one of the seven must appear, the two obligations below must appear, and the spec must read as handoff-grade.

There is no mandatory `## Decisions` heading. A separate decisions section is redundant clutter — settled decisions belong inlined into the elements they govern, each carrying a citation back to its `D<N>` record. Do not add such a section to satisfy an implicit template.

## Acceptance guidance and degrees of freedom

Two obligations beyond the seven elements make downstream plan autonomy safe rather than hopeful:

1. **Machine-checkable acceptance criteria (wherever the work carries a design decision).** Express the acceptance guidance as machine-checkable acceptance criteria following the FR/AC + coverage + traceability model:
   - **FR/AC** — enumerate functional requirements as `FR-<id>` and, under each, one or more acceptance criteria as `AC-<id>.<n>`, each phrased as a concrete, checkable assertion — an observable outcome a reviewer or a test can verify pass/fail, not a vague aspiration.
   - **Coverage** — every expected behavior in the spec body is covered by at least one AC; nothing observable is left without a check.
   - **Traceability** — each AC traces back to the requirement (and, where relevant, the settled decision) it enforces, so a reviewer can follow each check to its origin.

   This is what lets an automated adherence review clear the downstream plan without the human re-reading it. For trivial work with no design decision the criteria may be lighter prose, but write machine-checkable criteria whenever the work carries a design decision.

2. **A `## Degrees of freedom` section (every spec).** List the *hows* deliberately left to the implementer's free choice. The *what* is handoff-grade and pinned; the listed *hows* are explicitly granted as open. This section is what lets an automated adherence review distinguish "the plan deviated from the spec" from "the plan chose within granted freedom." If there are genuinely no degrees of freedom, say so explicitly rather than omitting the section.

   A listed freedom must clear an eligibility bar: it is an implementation-level *how* where (a) every admissible choice satisfies all acceptance criteria unchanged, (b) no choice produces a user-visible behavioral difference the user would plausibly want to weigh in on, and (c) the choice is reversible later without revising the spec. Shorthand: if the choice would change what a reviewer checks or what the user experiences, it is not a degree of freedom — it is an unsettled decision, routed per `## Blocked`.

## Lossless authoring

The spec must commit to **no decision or assumption** the user did not see and accept in the durable inputs, **unless the spec explicitly marks it a degree of freedom.** The unit of this bar is a decision or an assumption — never a sentence: a spec freely elaborates settled decisions into prose, structure, and derived acceptance criteria. Elaboration is allowed and expected; introducing a new decision or assumption the user never saw is forbidden.

When forward-designing surfaces a specific the input did not settle, there are exactly two legal moves — never silently bake it in:

1. **Mark it a degree of freedom** — if the specific passes the `## Degrees of freedom` eligibility bar, record it there as a *how* left open to the implementer, so it is visibly granted rather than smuggled in as a pinned commitment.
2. **Queue it as a decision** — otherwise it is human intent the input never settled: emit a pending-decisions bundle per `## Blocked` and report the run blocked, so the decision is made before it is committed.

Context worth flagging that is neither intent nor freedom lives in the spec body as a stated constraint or risk note — information, not a question.

Pinning an undiscussed decision into expected behavior or a constraint as if it were settled is the failure this prevents.

## Procedure

1. **Preflight before any drafting (substantive execution).** Resolve the thread: work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`; if `cwd` already sits inside a thread root, that is the thread. A preflight failure writes nothing and ends `Outcome: REFUSED — <reason and how to re-invoke>`, never a pending bundle — refuse when no thread exists yet (a thread must be opened before a spec can be written; do not create the thread or its seed yourself), when several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp), or when which input is meant is ambiguous per `## Inputs`.

2. **Load context.** Read the thread's `seed.md` and `decisions.md`, any `proposal.md`, and whatever artifact or prompt the invocation points you at. `decisions.md` says what has already been settled, so the spec neither re-litigates a closed decision nor contradicts one without noticing.

3. **Draft the body.** Cover all seven semantic-contract elements, inline settled decisions where operative and cite their `D<N>` records, and add the two obligations. Honor the lossless constraint: for any specific the input did not settle, either mark it a degree of freedom if it clears the eligibility bar or queue it as a pending decision per `## Blocked`; never bake it in silently. Keep the spec readable end-to-end by a stranger with no prior context. Adapt length to what the input warrants — a tight spec is better than a padded one.

4. **Write the artifact.** Write the single file `docs/threads/<thread>/spec.md` — literally that name at the thread root, with no frontmatter. If `spec.md` already exists, revise it in place: the same file is the stable reference through any review-and-revise cycles. Within-thread references in the body are thread-relative (e.g. `decisions.md`, `proposal.md`), never repo-rooted or absolute; cross-thread references are repo-relative (`docs/threads/<other>/…`).

5. **Confirm.** End with exactly this line, and nothing before it — no preamble, no summary, no closing remark: `Outcome: DONE — Spec written: spec.md`.

## Blocked

This path is reachable only after preflight has passed and forward-designing from otherwise-valid inputs has begun — substantive execution. Invocation, thread-resolution, and input-reference failures are preflight refusals (`## Procedure` step 1), not this path. It applies whenever a human decision is genuinely indispensable to a sound spec — one you cannot settle yourself from the durable inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat. Finish everything safely derivable first, then hand the open decision(s) to `/emit-pending-decisions`, giving it `/spec` as the producer, `spec.md` as the target, the context you gathered as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the spec. Then stop with a concise notification of where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

A blocked run still writes `spec.md` as complete as the settled inputs allow — every section fully elaborated, each blocked specific marked inline at its exact location pointing at the pending bundle. The only permitted gaps are those marked ones tied to queued decisions.
