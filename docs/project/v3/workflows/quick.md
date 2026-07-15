# Quick

Quick is the smallest delivery path for one change. It carries a single unit of work from a clarified starting point straight to implemented code and a recorded outcome, with the fewest artifacts that still leave a durable trail. It suits a change whose direction is already clear enough that a full specification and a prescriptive plan would cost more than they return — while keeping the option, at any moment, to grow into the fuller [Standard](standard.md) path without restarting.

## Sequence

Quick has no reconciliation step by design; there is no specification or strict plan for a reconciliation pass to keep faithful. The documented normal path is a short core path, and most of the surrounding steps are suggested when the situation warrants them:

1. Open the thread with `open-thread`, which writes the seed and the eager decision log.
2. Discuss the change with `discussion` when clarification is needed. *(optional)*
3. Write a brief implementation plan with `plan-brief` when a one-screen plan would help. *(optional)*
4. Implement the change with `implement`, which produces or updates the implementation report. `implement` runs straight from the seed, decisions, and any code or issue reference, or takes the brief `plan.md` as input when one exists.
5. Review the delivered work with `review-implementation` when the risk warrants it. *(optional)*
6. Review the code quality with `review-code` when the risk warrants it. *(optional)*
7. Finish the thread with `finish` and choose how to handle the branch.
8. Archive the thread with `archive-thread` once it no longer needs to remain active. *(optional)*

The single unbracketed core path — open, implement, finish — is the documented normal path, not a rule the thread is measured against. The bracketed steps are suggestions to reach for when they earn their keep. Skipping an optional activity or adding an unlisted one never makes the thread invalid.

## Durable outputs

- `seed.md` and `decisions.md`, written when the thread opens.
- An optional brief `plan.md`, when `plan-brief` runs.
- The project changes themselves — code, tests, and any affected living documentation.
- `implementation-report.md`, the singleton current-outcome record of what was delivered.

## Resolving pending decisions

`resolve-pending-decisions` is reactive infrastructure, not a stage in the sequence. Whenever an AFK-oriented operation cannot settle human intent on its own, it leaves a pending-decision bundle in the thread's queue and stops. Running `resolve-pending-decisions` at that point works through the queued points, records each settled outcome in `decisions.md`, and hands back a recommended next action. It has no fixed position in the path; it exists to be used whenever a queue is present, and does nothing when the queue is empty.

## User involvement

The user chooses the change and its direction, answers whatever `discussion` surfaces, and settles any pending decision a step could not resolve. Implementation proceeds from the durable inputs; the user is asked only when judgment is genuinely required. At the end the user picks the branch disposition `finish` offers and decides whether to archive.

## Terminal outcome

A Quick thread completes at `finish`, with the implementation report standing as its terminal outcome. Archiving afterward is optional housekeeping that moves the thread out of active work; it is not required for the thread to be considered done.

## Escalating to Standard

When a change turns out to need the fuller treatment, a Quick thread grows into Standard in place, in the same thread, without starting over:

1. Write the specification with `spec`, creating `spec.md`.
2. Reconcile the specification against the thread's decisions with `reconcile-spec`.
3. Produce the strict plan with `plan-strict`, which replaces the brief `plan.md` with the strict index and creates `plan-tasks/` atomically.

From that point the thread continues with the complete Standard tail: reconcile the plan with `reconcile-plan`, execute it with `implement-plan`, run the optional reviews, and finish. An escalated thread is indistinguishable from one born on the Standard path from the specification stage onward. The reverse move — replacing a strict plan with a brief one — happens only on an explicit instruction, never on its own.

## Template

The exact recommended sequence a Quick thread records at opening time comes from the canonical Quick template. See [`shared/references/workflows/quick.md`](../../../../shared/references/workflows/quick.md) for the seed text; this document describes the path rather than reproducing that section.
