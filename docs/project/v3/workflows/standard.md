# Standard

Standard is the normal spec-driven path for one change. It carries a single unit of work from clarified decisions through a handoff-grade specification, a prescriptive plan, implementation, and a recorded outcome. It suits a change substantial enough that writing down what to build — and checking that the plan and the build stay faithful to it — is worth the ceremony, while still targeting one coherent change rather than a larger direction that needs decomposition.

## Sequence

The documented normal path threads a specification and a strict plan between the shared thread genesis and the delivered work, with reconciliation as ordinary maintenance and independent reviews as suggestions:

1. Open the thread with `open-thread`, which writes the seed and the eager decision log.
2. Discuss the change with `discussion` to settle open questions.
3. Sketch the direction with `propose`, then align it against existing decisions with `reconcile-proposal`. *(optional)*
4. Write the specification with `spec`, creating `spec.md`.
5. Reconcile the specification against the thread's decisions with `reconcile-spec`.
6. Review the specification with `review-spec` before downstream work. *(optional)*
7. Produce the strict plan with `plan-strict`, creating `plan.md` as its index and dispatchable briefs under `plan-tasks/`.
8. Reconcile the plan against the specification with `reconcile-plan`.
9. Implement the plan with `implement-plan`, which produces or updates the implementation report.
10. Review the delivered work with `review-implementation` when the risk warrants it. *(optional)*
11. Review the code quality with `review-code` when the risk warrants it. *(optional)*
12. Finish the thread with `finish` and choose how to handle the branch.
13. Archive the thread with `archive-thread` once it no longer needs to remain active. *(optional)*

The unbracketed steps — including `reconcile-spec` and `reconcile-plan` — are the documented normal path, kept faithful as ordinary maintenance rather than mechanically enforced. Reconciliation corrects a specification or plan where the fix follows from authoritative decisions and routes irreducible human intent into the pending-decision queue; it produces no review report. The bracketed proposal and review steps are suggestions to reach for when they earn their keep. Skipping an optional activity or adding an unlisted one never makes the thread invalid.

## Durable outputs

- `seed.md` and `decisions.md`, written when the thread opens.
- An optional `proposal.md`, when `propose` runs.
- `spec.md`, the handoff-grade specification.
- `plan.md` and the task briefs under `plan-tasks/`.
- The project changes themselves — code, tests, and any affected living documentation.
- `implementation-report.md`, the singleton current-outcome record of what was delivered.

## Resolving pending decisions

`resolve-pending-decisions` is reactive infrastructure, not a stage in the sequence. Whenever a completion-oriented operation discovers missing human intent it cannot settle on its own once its work is underway — an authoring or reconciliation step that hits an irreducible question — it leaves a pending-decision bundle in the thread's queue and stops. Running `resolve-pending-decisions` then works through the queued points, records each settled outcome in `decisions.md`, and hands back a recommended next action. It has no fixed position in the path; it is available whenever a queue exists and does nothing when the queue is empty.

## User involvement

The user chooses the change, answers what `discussion` surfaces, and settles any pending decision a step could not resolve. The optional reviews are the user's call based on risk. Implementation proceeds from the specification and plan; the user is asked only when intended behavior must change. At the end the user picks the branch disposition `finish` offers and decides whether to archive.

## Terminal outcome

A Standard thread completes at `finish`, with the implementation report standing as its terminal outcome. Archiving afterward is optional housekeeping that moves the thread out of active work; it is not required for the thread to be considered done.

## Threads that arrive by escalation

A [Quick](quick.md) thread that outgrows its lighter path joins Standard at the specification stage — writing `spec.md`, reconciling it, then replacing the brief plan with a strict one — and from there follows this path in full: plan reconciliation, plan execution, the optional reviews, and finish. Such a thread is indistinguishable from one born on the Standard path from the specification stage onward.

## Template

The exact recommended sequence a Standard thread records at opening time comes from the canonical Standard template. See [`shared/references/workflows/standard.md`](../../../../shared/references/workflows/standard.md) for the seed text; this document describes the path rather than reproducing that section.
