---
name: check-plan
description: Check a plan folder against the thread's spec and correct in place every fault that document settles.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Check Plan

Check one plan folder against the thread's spec and correct it in place, end to end. You gather the thread's context, walk the plan task by task against the spec, fix every fault whose fix follows from it, hand what it does not settle to a pending-decision bundle, and report what you changed. You work from the gathered inputs alone, without walking the user fault-by-fault. Editing the plan folder is where you stop — do not stage, commit, or push.

## Inputs

Gather all of these before checking; everything below works from what you gather here.

- The project's `AGENTS.md`, when the file exists — the project's standing guidance for agents working in it.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be used in everything you write.
- `docs/architecture/<module>.md` for each module the work touches, read via `/consult-descriptions` — how the system is structured now.
- `docs/product/<capability>.md` for each capability the work touches, read via `/consult-descriptions` — what the product does now.
- `docs/adr/` and `docs/pdr/`, read via `/consult-decisions` — the project decisions bearing on the plan.
- The roadmap entry named by the seed frontmatter's `roadmap` mapping, when the seed carries one — the entry this thread answers: its sketch, its scope boundary and its planned behavior, found as the heading whose text is `roadmap.entry` in the index at `roadmap.path`.
- The thread's **`spec.md`** — the spec, the sole authority for every correction you make; it comes in the shape `<skill_path>/references/formats/spec.md` defines. A fault is a fault only because the spec says so, and a fix is available only because the spec settles it. Required: the check does not run on a thread that holds no `spec.md`.
- **The plan folder to check** — the edit target, in one of two accepted forms. When the invocation **names a folder** under `plans/`, that folder is the form. Otherwise the form is the **newest folder under `plans/` by stamp**. Read everything in it: its index `plan.md`, and the task briefs under `plan-tasks/` when the plan is strict.
- The thread's `delta/`, when present — the thread's delta of the project layer, which inside the thread takes precedence over the project records; these are the documents the spec cites, by path for a delta document and by stem for a decision record, in the forms `<skill_path>/references/instructions/read-and-cite-the-project-layer.md` fixes.

Any other thread is history: it records how its own work was understood at the time, not what holds now, so do not read it unless the user or this thread's seed names it.

If the thread holds no `spec.md`, or the plan folder does not resolve — `plans/` is absent or empty, or the invocation names a folder that is not there — that is a preflight failure, not an in-run decision: refuse before editing anything, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming what is missing and how to supply it.

## What is corrected

Five kinds of fault, each corrected only when the correction follows from the spec:

- **A task that contradicts the spec** — it builds something the spec's account of the change, its scope, or its constraints rule out. Edit the task so it matches.
- **A criterion of the spec that no task quotes and delivers** — nothing in the plan produces or checks it. Add the missing coverage to the task whose deliverable it belongs to, carrying the criterion across as a verbatim quotation.
- **A criterion paraphrased, numbered or labelled instead of quoted** — a task that restates a criterion in its own words, or hangs an `FR-`, `AC-` or other identifier on it. Correct it to the spec's verbatim wording, with no identifier.
- **An ambiguous or wrong step** — a step an implementer could read two ways, or one whose stated action does not achieve what the task's objective requires. Rewrite it into the single action the spec supports.
- **A wrong target** — a file, folder, or artifact path that is not the one the spec designates, or a citation reaching into another thread. Correct the path; a cross-thread citation is corrected to the spec or the delta document the task meant, because a plan cites no other thread.

Every correction edits the task the fault sits in, or adds the missing coverage to the task whose deliverable carries it. Where the spec leaves the point open — its degrees of freedom included — the plan's choice stands.

## What is never done

- **Removing detail the plan added beyond the spec.** A plan legitimately elaborates: substeps, verification commands, file lists, and sequencing the spec never mentions are the plan's own work, and they stay.
- **Inventing a task the spec does not imply.** A gap is satisfied by adding coverage to an existing task, never by conjuring a task the spec gives no basis for. When the coverage belongs to no task that exists, that is a decision for a human, per `## Blocked`.
- **Editing anything outside the plan folder.**
- **Editing the spec or any delta document.**

## Write boundary

You write files inside the checked plan folder only: its `plan.md`, and its `plan-tasks/NN-<kebab-slug>.md` files when the plan is strict. Nothing else you touch is written — the thread's `spec.md` and its `delta/`, other plan folders, the thread's implementations, and the project layer (`docs/adr/`, `docs/pdr/`, `docs/product/`, `docs/architecture/`, `docs/glossary.md`, and the roadmap indexes under `.work/roadmaps/`) — are read here and never written.

## Procedure

1. **Preflight before any editing (substantive execution).** A preflight failure writes nothing and follows `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the reason and how to re-invoke — never a pending bundle — refuse when `spec.md` or the plan folder does not resolve per `## Inputs`.
2. **Gather the inputs.** Read everything under `## Inputs` now, in that order. This picture is what lets you tell a fault from a choice the spec granted.
3. **Walk the plan against the spec, task by task.** Take the tasks in plan order. For each, hold it against the spec's goal, scope, account of the change, constraints, and the decisions its delta documents carry, and record the faults of `## What is corrected` you find. Then walk the spec's acceptance checklist and record each criterion no task quotes and delivers. Distinguish a fault from an elaboration the plan is entitled to and from a choice the spec's degrees of freedom leave open; neither is a fault.
4. **Apply the corrections in place.** Edit the plan folder's files directly, per `## What is corrected` and within `## Write boundary`. Keep each edit to the smallest change that makes the plan match the spec.
5. **Keep a strict plan self-consistent.** When the plan has an index plus task briefs, every correction lands in both places it shows: a task's objective, ordinal, or title changed in a brief is changed in the index's ordered task list too, and coverage added to a brief is reflected in whatever index line describes it. The index stays authoritative for task count and order.
6. **Report.** List the corrections you applied, one line each, naming the file and what changed; say plainly when the plan needed none.
7. **Confirm.** Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `Plan checked: plans/<folder>/`. That is the outcome whether you corrected many faults or none.

## Blocked

This path is reachable only after preflight has passed and checking against otherwise-valid inputs has begun — substantive execution. Invocation, spec, and plan-folder failures are preflight refusals (`## Procedure` step 1), not this path. It applies to anything the spec does not settle: a fault whose fix it gives no basis for, a gap whose coverage belongs to no task the plan has, or a contradiction between two readings of it that you cannot resolve from the gathered inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat.

A task resting on a delta document or a decision of the spec that you find wrong is one of these: the check does not correct that task, and the document is corrected before it does. An unnoticed conflict between the plan's material and a project decision record or a project glossary term is another: classify it as `/consult-decisions` instructs, and queue it rather than overriding the project record.

Apply every derivable correction first, then follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, the plan folder as the target, and the originating user request. Then stop with a concise notification of where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`.
