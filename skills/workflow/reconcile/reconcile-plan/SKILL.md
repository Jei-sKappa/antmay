---
name: reconcile-plan
description: Make a thread's strict plan — its plan.md index and plan-tasks/ briefs — faithfully executable against the spec that governs it, repairing plan faults in place and queueing anything that needs a fresh human decision; use when a plan should be made to satisfy its spec.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 5.0.0
---

# Reconcile Plan

Make the thread's plan a faithful, executable expression of the spec that governs it. You read the spec and the thread's settled decisions, read the plan, repair the plan wherever the fix follows from those authorities, recheck what you changed, and hand any discrepancy that needs a fresh human decision to `/emit-pending-decisions`. You edit only the plan — its index and its task briefs; you never touch the spec or the decisions, and you produce no separate report. Writing the corrected plan is where you stop — do not stage, commit, or push.

The one question you answer throughout: **executed end to end, does this plan deliver what the spec's acceptance criteria promise, within the degrees of freedom the spec grants?** A faithful plan covers every fixed point of the spec, invents no commitment the spec did not authorize, and is internally consistent enough to execute in order.

## The plan artifact

The plan is a multi-file artifact: the index `plan.md` at the thread root plus one brief per task at `plan-tasks/NN-<kebab-slug>.md` (two-digit zero-padded ordinal, one file per task). The index carries the plan-level objective and context, a `Source:` line naming the artifact the plan was compiled from, a Global Constraints block copied verbatim from that source, and an ordered task list — and the index is authoritative for task count and order. Each brief carries its objective, input/context, steps, files modified, verification, acceptance criteria, and the `Consumes:` / `Produces:` hand-off lines. Your editable target is this whole artifact: you may edit the index, any brief, or both.

## Operation

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp.

2. **Load the authority and the target.** Read the thread-root `spec.md` (the contract the plan must satisfy) and `decisions.md` (the settled decisions), plus any artifact the invocation explicitly points you at. Then read the plan end to end — the index first, then each brief in index order — your one editable target. Also resolve and read the artifact named by the index's `Source:` line; you need it to check the Global Constraints block. If no plan exists at the thread root, tell the user there is nothing to reconcile and stop.

3. **Check adherence.** Run the check in `## The adherence check` to locate every discrepancy between the plan and its authority, and to decide, for each, whether the fault lies in the plan or in the source.

4. **Repair what the authority settles.** Edit the index and/or briefs in place for every discrepancy whose fix follows directly from the spec and the decisions (see `## Repairing plan faults`).

5. **Recheck.** After editing, run the adherence check again to confirm each repair holds, no fixed point of the spec is still unmet, and no new discrepancy was introduced.

6. **Queue irreducible intent.** Where resolving a discrepancy would require a NEW human decision — the spec does not settle the point, and inventing an answer would smuggle in intent the user never made — do not edit the plan to paper over it. Hand the open decision(s) to `/emit-pending-decisions` (see `## Queueing decisions`), and never guess.

7. **Confirm.** Report concisely in chat what you checked, what you repaired, and whether any decisions were queued and where. If the plan already satisfied the spec, say so — a clean pass writes no file. No preamble, no closing remark.

## The adherence check

Start from the spec's `## Degrees of freedom` section: a plan choice the spec explicitly left to the implementer is never a deviation — do not flag it, and do not "correct" it toward your own preference. Everything else the spec pins is fixed.

Map each of the spec's acceptance criteria and intended outcomes onto the plan's tasks, then look for these discrepancies:

- **Coverage gap** — a spec acceptance criterion or intended outcome that no task delivers.
- **Contradiction** — a task that contradicts a point the spec pins.
- **Invented commitment** — a task that adds work, direction, or a constraint the spec did not call for and no decision authorizes.
- **Structural inconsistency** — the index and the `plan-tasks/` folder disagree: an index entry with no file, a file not listed in the index, or ordinals that skip or collide. The index is authoritative for count and order.
- **Broken hand-off** — a task's non-`none` `Consumes:` names something no earlier task `Produces:`. (A `Produces:` that nothing later consumes is a smell, not a fault — a final task may legitimately produce for the world outside the plan; note it, do not repair it.)
- **Stale Global Constraints** — the index's Global Constraints block drifts from the `Source:` artifact it must copy verbatim (a stale, missing, or reworded entry). If the `Source:` artifact cannot be read, say so in the chat summary rather than assuming the block is faithful.
- **Under-specified task** — a field too vague for an implementer to follow literally: a step that reads as a sub-objective, a Verification that says "looks correct" instead of a concrete check, or a Files-modified list that contradicts the steps.
- **Mis-sized or concurrent structure** — a task bundling independently-reviewable deliverables that should split, pure-setup work with no reviewable deliverable that should fold into its consumer, or any parallelization construct (wave numbers, dependency arrays, `depends_on` fields, task-graph notation, fork/join syntax). The plan executes in order; linearize.

For each discrepancy, decide its origin. If the spec and decisions settle the point, the plan is at fault — repair it (`## Repairing plan faults`). If resolving it would require a decision the spec never made, the fault is in the source or the intent is irreducible — queue it (`## Queueing decisions`), never invent the answer.

## Repairing plan faults

Edit the plan in place to bring it into adherence: add a missing task and its index entry, rewrite a contradicting step, delete an invented commitment, sharpen an under-specified field, add a missing `Consumes:`/`Produces:` line, recopy a drifted Global Constraints entry verbatim from the `Source:` artifact, reconcile an index↔folder mismatch, split or merge a mis-sized task, or linearize a parallelization construct. After each repair, re-run the adherence check — a fix that introduces a new discrepancy must itself be caught and corrected. Loop until the plan adheres or the only discrepancies left are ones the authority cannot settle.

Preserve legitimate elaboration: plan detail that extends the spec without contradicting it, and acceptance criteria that follow mechanically from a settled point, are correct and must survive untouched.

## Authority boundary

The plan is the only artifact you may edit. Never edit `spec.md` or `decisions.md` to make the plan look consistent. If the plan is right and the spec is wrong, or the spec is silent on a fixed point the plan could only guess at, that mismatch is itself a decision a human must make — queue it; do not patch the source, and do not patch the plan around a source fault. You correct the plan toward its authority, never the authority toward the plan.

## Queueing decisions

Hand open decisions to `/emit-pending-decisions` as one coherent bundle, giving it: `/reconcile-plan` as the producer, the plan as the target, the discrepancy and the inputs you weighed as evidence, the open decision(s) it must settle, and a suggested follow-up (settle the decisions, then reconcile the plan again). One invocation queues one bundle; the primitive writes the file and reports its path.

## Nothing else is produced

You have exactly one behavior: reconcile the plan against its authority. You do not emit a review report or a findings file, and you offer no report-only, check-only, or approval variant selectable at invocation. A clean pass leaves the working tree untouched and produces no file — the chat summary is the whole output.
