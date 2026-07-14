---
name: plan-brief
description: Turn a thread's durable inputs or a referenced artifact into a one-screen plan.md at a thread root — an outcome, a small ordered list of steps, and overall verification; use when lightweight work needs a sensible implementation order without the ceremony of a full multi-file plan.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.0.0
---

# Plan Brief

Turn the thread's durable inputs into a short, one-screen plan that gives implementation a sensible order and a way to check the result. You read the thread's context, draft the plan body, write the single thread-root `plan.md`, and confirm its path. Writing the file is where you stop — do not stage, commit, or push.

A brief plan trades depth for speed: it orders the work and records overall verification, and it delegates the finer implementation judgment to whoever executes it. When the work genuinely needs more rigor than that, recommend `plan-strict` instead of inflating the brief plan (see `## When to recommend plan-strict`).

## Inputs

Draft the plan from the thread's durable inputs plus whatever the invocation points you at:

- **`seed.md`** — why the thread exists and what triggered it.
- **`decisions.md`** — the settled decisions the plan must honor and must not contradict.
- **An explicit code or issue reference** — a path, a GitHub issue, or the user's prompt when nothing else is referenced.

The emitted `plan.md` must be self-contained: a fresh reader with only the plan and the thread's durable inputs can execute it. It must not depend on the originating chat.

If which input is meant is ambiguous — a reference names "the spec" or "the decisions" with no clear referent, or several artifacts could be intended — ask the user which is intended. Do not silently pick by recency.

## Plan shape

Always write the thread-root `plan.md` in this shape:

```markdown
# Plan: <title>

Source: <thread-relative source>

## Outcome

<the result this implementation should produce>

## Steps

1. <short implementation step>
2. <short implementation step>
3. <short implementation step>

## Verification

<the small set of checks that demonstrates the overall change works>

## Notes

<only constraints, assumptions, or cautions genuinely needed by the implementer>
```

- **`Source`** and the **`## Outcome`**, **`## Steps`**, and **`## Verification`** sections are required. **`## Notes`** is optional — include it only for constraints, assumptions, or cautions the implementer genuinely needs.
- **Steps** are a small numbered list in execution order, each step one short paragraph. They order the work; the implementer derives the obvious substeps.
- **Verification** records the overall checks that demonstrate the change works — not a separate verification contract for every step.
- The plan should normally fit on one screen. It has no per-task files, no per-step acceptance criteria, no file inventories, no frontmatter, and no stored state.

## When to recommend plan-strict

When safe planning requires detailed substeps, per-task verification, explicit file ownership, or acceptance criteria, do not stretch the brief plan to carry them. Tell the user that the work warrants `plan-strict` and stop, rather than emitting an over-inflated brief plan.

## Reverse-transition guard

If `plan-tasks/` already exists alongside `plan.md`, a fuller plan is in force. Do NOT silently downgrade it or delete those tasks. Require an explicit instruction from the user to replace the fuller plan with a brief one. Only after that explicit instruction: write the brief `plan.md` and remove the now-obsolete `plan-tasks/`.

## Operation

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ask — never silently pick the most recent stamp. If no thread exists yet, tell the user a thread must be opened before a plan can be written, and stop.
2. **Load context.** Read `seed.md` and `decisions.md`, and whatever code or issue reference the invocation points you at. If `plan-tasks/` already exists, apply the reverse-transition guard above before writing anything.
3. **Draft the body.** Compose the plan per `## Plan shape`: a title, `Source`, `## Outcome`, a small ordered `## Steps` list, `## Verification`, and `## Notes` only when needed. Keep it to roughly one screen. If the work warrants more rigor, recommend `plan-strict` instead.
4. **Write the artifact.** Write the single file `docs/threads/<thread>/plan.md` — literally that name at the thread root, no frontmatter. If a brief `plan.md` already exists, revise it in place. Within-thread references in the body are thread-relative (e.g. `decisions.md`, `spec.md`); cross-thread references are repo-relative (`docs/threads/<other>/…`).
5. **Confirm.** Tell the user exactly: `Plan written: plan.md`. Nothing else — no preamble, no summary, no closing remark.

## Recording elicited decisions

If drafting the plan requires asking the user a question that settles product or workflow intent — a direction the plan will then depend on — append the answer to the thread-root `decisions.md` as a `D<N>` record **before** the plan relies on it. Trivial clarifications about the input (what a phrase meant, which file was intended) settle nothing and need no record.

Number records sequentially across the thread: scan `decisions.md` for the highest existing `D<N>` and use the next integer. Write each record self-contained so a fresh agent understands it without the chat:

```markdown
## D<N>: <Title>

Scope: <optional — omit when the whole thread is the scope; otherwise name the stage or thread-relative artifact the decision applies to>

Context: <one short paragraph stating the question and the surrounding facts, written from the thread's perspective — never "as you said" or "the user chose">

Decision: <the complete substantive resolution, written out in full>

Rationale: <why this resolution and its principal trade-off>
```

Records are append-only: never rewrite or delete one. When a settled decision later changes, append a new record naming the one it supersedes.

## Blocked under an AFK invocation

When the invocation is explicitly AFK (no human is available to answer) and a human decision is genuinely indispensable to write a sound plan — one you cannot settle yourself from the durable inputs — do not invent the intent and do not stall waiting in chat. Hand the open decision to `/emit-pending-decisions`, giving it `/plan-brief` as the producer, `plan.md` as the target, the context you gathered as evidence, the open decision(s), and a suggested follow-up (settle the decision, then resume the plan). Then stop and report concisely that the run is blocked on a queued decision and where the bundle was written.
