---
name: plan-brief
description: Turn the thread's design into a one-screen plan.md inside a fresh stamped plan folder.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Plan Brief

Turn the thread's design into a short, one-screen plan that gives implementation a sensible order and a way to check the result. You gather the thread's context, draft the plan body, create this invocation's plan folder, write its `plan.md`, and confirm the path. Writing the file is where you stop — do not stage, commit, or push.

A brief plan trades depth for speed: it orders the work and records overall verification. When the work genuinely needs more rigor than that, recommend `plan-strict` instead of inflating the brief plan (see `## When to recommend plan-strict`).

## Inputs

Gather all of these before drafting; everything below works from what you gather here.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the design.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- **The design the plan implements** — the primary input, in one of two accepted forms. The thread's **`spec.md`** is the form when the file exists, and it is the plan's authority. When the invocation names a **referenced artifact** instead — a repository path, a GitHub issue, another thread's artifact read as history, or the user's own prompt when nothing else is named — that reference is the form; it is material, and it carries no authority over a `spec.md` the thread holds.
- The thread's `seed.md` — why the thread exists and what triggered it.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer, which inside the thread takes precedence over the project records. The plan cites a record by its stem where a step rests on it, rather than restating it.

The emitted `plan.md` must be self-contained: a fresh reader with only the plan and the thread's durable inputs can execute it, with no dependency on the originating chat.

If which input is meant is ambiguous — a reference names "the spec" with no clear referent, or several artifacts could be intended — that is a preflight failure, not an in-run decision: refuse before drafting, name the ambiguous reference and how to disambiguate it, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the ambiguous reference and how to re-invoke. Never silently pick by recency.

## Plan folder

Every invocation writes into its own new folder `plans/<yymmddhhmm>[-<slug>]/` under the thread root, creating `plans/` on demand. The stamp is the folder's creation time in UTC at minute resolution. Append `-<slug>`, a short kebab-case name for the plan's purpose, when the invocation names one, or when a folder carrying that stamp already exists. Inside that folder you write `plan.md`, and nothing else; never write into a plan folder an earlier invocation created.

You write exactly one file: `plan.md` inside the plan folder you created. Nothing else you touch is written — the thread's `spec.md`, `adr/`, and `glossary.md`, and the project's `docs/adr/` and `docs/glossary.md`, are read here and never written.

## Plan shape

Always write the plan folder's `plan.md` in this shape:

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
- Within-thread references in the body are thread-relative (`spec.md`, `adr/<stem>.md`); cross-thread and project-level references are repo-relative (`docs/adr/<stem>.md`, `.wip/threads/<other>/…`).

## When to recommend plan-strict

When safe planning requires detailed substeps, per-task verification, explicit file ownership, or acceptance criteria, do not stretch the brief plan to carry them. Tell the user that the work warrants `plan-strict`, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and `work warrants plan-strict; no brief plan written`, rather than emitting an over-inflated brief plan.

## Procedure

1. **Preflight before any drafting (substantive execution).** A preflight failure writes nothing and follows `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the reason and how to re-invoke — never a pending bundle — refuse when which input is meant is ambiguous per `## Inputs`.
2. **Gather the inputs.** Read everything under `## Inputs` now, in that order. That picture is what keeps the plan from contradicting a project record or a record the thread has already settled.
3. **Draft the body.** Compose the plan per `## Plan shape`: a title, `Source`, `## Outcome`, a small ordered `## Steps` list, `## Verification`, and `## Notes` only when needed. Keep it to roughly one screen. If the work warrants more rigor, recommend `plan-strict` instead.
4. **Write the artifact.** Create this invocation's plan folder per `## Plan folder` and write `plan.md` inside it — literally that name, no frontmatter.
5. **Confirm.** Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `Plan written: plans/<folder>/plan.md`, and nothing before it — no preamble, no summary, no closing remark.

## Blocked

This path is reachable only after preflight has passed and drafting from otherwise-valid inputs has begun — substantive execution. Invocation and input-reference failures are preflight refusals (`## Procedure` step 1), not this path. It applies whenever a human decision is genuinely indispensable to a sound plan — one you cannot settle yourself from the gathered inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat.

A step that would rest on a thread ADR or a spec decision you find wrong is one of these decisions: planning does not proceed on that step, and the record is corrected before it does. An unnoticed conflict between the plan's material and a project ADR or a project glossary term is another: classify it as `/consult-adrs` instructs, and queue it rather than overriding the project record.

Finish everything safely derivable first, then follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, the plan folder as the target, and the originating user request. Then stop with a concise notification of where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`.

A blocked run still writes `plan.md` as complete as the settled inputs allow — every derivable step and the overall verification in place, each blocked specific marked inline at its exact location pointing at the pending bundle. The only permitted gaps are those marked ones tied to queued decisions.
