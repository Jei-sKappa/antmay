---
name: plan-brief
description: Turn a thread's durable inputs or a referenced artifact into a one-screen plan.md at a thread root — an outcome, a small ordered list of steps, and overall verification; use when lightweight work needs a sensible implementation order without the ceremony of a full multi-file plan.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.2.1
---

# Plan Brief

Turn the thread's durable inputs into a short, one-screen plan that gives implementation a sensible order and a way to check the result. You read the thread's context, draft the plan body, write the single thread-root `plan.md`, and confirm its path. Writing the file is where you stop — do not stage, commit, or push.

A brief plan trades depth for speed: it orders the work and records overall verification. When the work genuinely needs more rigor than that, recommend `plan-strict` instead of inflating the brief plan (see `## When to recommend plan-strict`).

## Inputs

Draft the plan from the thread's durable inputs plus whatever the invocation points you at:

- **`seed.md`** — why the thread exists and what triggered it.
- **`decisions.md`** — the settled decisions the plan must honor and must not contradict.
- **An explicit code or issue reference** — a path, a GitHub issue, or the user's prompt when nothing else is referenced.

The emitted `plan.md` must be self-contained: a fresh reader with only the plan and the thread's durable inputs can execute it. It must not depend on the originating chat.

If which input is meant is ambiguous — a reference names "the spec" or "the decisions" with no clear referent, or several artifacts could be intended — that is a preflight failure, not an in-run decision: refuse before drafting, name the ambiguous reference and how to disambiguate it, write nothing, and end with `Outcome: REFUSED — <the ambiguity and how to re-invoke>`. Never silently pick by recency.

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
- The plan should normally fit on one screen: a single flat markdown file containing only the sections above.

## When to recommend plan-strict

When safe planning requires detailed substeps, per-task verification, explicit file ownership, or acceptance criteria, do not stretch the brief plan to carry them. Tell the user that the work warrants `plan-strict`, write nothing, and end with `Outcome: REFUSED — work warrants plan-strict; no brief plan written`, rather than emitting an over-inflated brief plan.

## Reverse-transition guard

If `plan-tasks/` already exists alongside `plan.md`, a fuller plan is in force. Do NOT silently downgrade it or delete those tasks. Require an explicit instruction from the user to replace the fuller plan with a brief one; without that explicit instruction, write nothing and end with `Outcome: REFUSED — a fuller plan is in force; an explicit instruction is required to replace it`. Only after that explicit instruction: write the brief `plan.md` and remove the now-obsolete `plan-tasks/`.

## Procedure

1. **Preflight before any drafting (substantive execution).** Resolve the thread: work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`; if `cwd` already sits inside a thread root, that is the thread. A preflight failure writes nothing and ends `Outcome: REFUSED — <reason and how to re-invoke>`, never a pending bundle — refuse when no thread exists yet (a thread must be opened before a plan can be written), when several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp), or when which input is meant is ambiguous per `## Inputs`.
2. **Load context.** Read `seed.md` and `decisions.md`, and whatever code or issue reference the invocation points you at. If `plan-tasks/` already exists, apply the reverse-transition guard above before writing anything.
3. **Draft the body.** Compose the plan per `## Plan shape`: a title, `Source`, `## Outcome`, a small ordered `## Steps` list, `## Verification`, and `## Notes` only when needed. Keep it to roughly one screen. If the work warrants more rigor, recommend `plan-strict` instead.
4. **Write the artifact.** Write the single file `docs/threads/<thread>/plan.md` — literally that name at the thread root, no frontmatter. If a brief `plan.md` already exists, revise it in place. Within-thread references in the body are thread-relative (e.g. `decisions.md`, `spec.md`); cross-thread references are repo-relative (`docs/threads/<other>/…`).
5. **Confirm.** End with exactly this line, and nothing before it — no preamble, no summary, no closing remark: `Outcome: DONE — Plan written: plan.md`.

## Blocked

This path is reachable only after preflight has passed and drafting from otherwise-valid inputs has begun — substantive execution. Invocation, thread-resolution, and input-reference failures are preflight refusals (`## Procedure` step 1), not this path. It applies whenever a human decision is genuinely indispensable to a sound plan — one you cannot settle yourself from the durable inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat. Finish everything safely derivable first, then hand the open decision(s) to `/emit-pending-decisions`, giving it `/plan-brief` as the producer, `plan.md` as the target, the context you gathered as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the plan. Then stop with a concise notification of where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

A blocked run still writes `plan.md` as complete as the settled inputs allow — every derivable step and the overall verification in place, each blocked specific marked inline at its exact location pointing at the pending bundle. The only permitted gaps are those marked ones tied to queued decisions.
