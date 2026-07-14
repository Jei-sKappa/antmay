---
name: review-roadmap
description: Read a thread-root roadmap.md as a decomposition handoff and judge whether each child brief could become an independently executable thread without inventing intent, reporting any findings as a single pending-review bundle; use when a roadmap should be checked for handoff readiness before its children are materialized.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Roadmap

Assess a thread-root `roadmap.md` as a decomposition handoff, strictly read-only. The one question you answer: **could each child brief become an independently executable thread without inventing intent?** You read the roadmap as the agent who will open and run each child would, judge it against the axes below, and record any findings for later attention. You never touch the roadmap or any other artifact, and you produce no durable report — a clean roadmap earns a chat judgment and nothing on disk.

This is a handoff-quality review: whether the decomposition, briefs, and dependencies are safe to hand off as written. You do not re-decide how the work should divide, and you do not confirm the roadmap faithfully carries each governing decision — that fidelity check is a separate operation.

## Operation

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp.

2. **Read the roadmap read-only.** The target is the thread-root `roadmap.md`. Read it end to end at least once, as the agent who will materialize and execute each child with no memory of the conversation that produced it. If no `roadmap.md` exists at the thread root, tell the user there is nothing to review and stop. You do not edit it, rewrite it, or propose edits into it — your output is a judgment, never a changed roadmap.

3. **Judge against the readiness axes.** Assess the roadmap on each axis below (`## What you judge`). For every real weakness, form a finding: what is wrong, where in the roadmap it shows, why it would force whoever opens a child to invent intent or hit a wall, and a severity — `blocker` (a child cannot be opened or run safely as briefed), `issue` (a real gap that will cause rework or a wrong guess), or `nit` (soft or imprecise, but survivable). Tether every finding to that downstream impact: "this brief is thin" is not a finding; "this brief omits its outcome, so whoever opens the child must guess what result it should produce" is.

4. **Decide the outcome.** If the roadmap passes the bar — every child could be opened and run as an independent thread without inventing intent — the review is clean. Otherwise you hold one or more findings to record.

5. **Report.** A clean review returns a concise readiness judgment in chat and writes no file. A review with findings emits exactly one bundle (`## Recording findings`) and reports its path. No preamble, no closing remark.

## What you judge

Read the roadmap against these axes; each weakness you find maps to the axis it concerns:

- **Decomposition quality** — each child produces an independently valuable outcome, and the boundaries hold: no child's scope silently expands to swallow work another child owns or the roadmap left out, and no valuable outcome falls between the children unclaimed.
- **Brief self-containment** — each child brief carries every field it needs and each field says enough: a reader with only that brief can understand the child's outcome, its self-contained context, its in- and out-of-scope boundaries, what it consumes from its dependencies, the shared constraints that bind it, and the workflow to follow. A present-but-empty field is not self-contained.
- **Dependency soundness** — every dependency is described as a consumed input (what outcome or information the child takes from the one it names), not a bare cross-reference; dependencies form no cycle; and the stated dependencies imply no impossible ordering, such as a child needing an output that nothing produces.
- **Shared-constraint placement** — constraints that bind multiple children sit in the roadmap's shared section, and a constraint that touches only one child sits in that child's brief. A misplaced constraint either gets lost or gets wrongly applied to children it should not bind.
- **Workflow completeness** — each brief's suggested workflow is a complete, expanded sequence of steps a reader can follow directly, not a bare workflow name left for someone downstream to resolve.

A roadmap's section names, ordering, and structure are the author's discretion; what you check is that the substance behind these axes is present and coherent.

You do not perform a decision-by-decision fidelity mapping between the roadmap and the thread's `decisions.md`. You may, however, report an **obvious contradiction** with `decisions.md` when you notice one, because a roadmap that visibly commits to the opposite of a settled decision harms readiness — whoever opens the child would act on intent the thread has already overruled. Treat this as a readiness finding when it is plain on the page, not as a mandate to audit fidelity line by line.

## Recording findings

When you hold one or more findings, hand them to `/emit-pending-review` as a single bundle. Give it:

- `review-roadmap` as the reviewer.
- `roadmap.md` as the target.
- Each finding with its severity (`blocker` / `issue` / `nit`), a category, the finding statement, the evidence (the child ID or roadmap section and a short quote showing the weakness), and the downstream impact.

Use the readiness axes above as your category vocabulary — `decomposition`, `self-containment`, `dependencies`, `shared-constraints`, `workflow-completeness`, and `fidelity` for an obvious `decisions.md` contradiction — assigning each finding the axis it concerns. The primitive allocates one uniquely named file under the thread's `.pending-reviews/` folder, orders the findings, and reports the path; you emit one bundle per review run — that bundle is the only place findings go, and recording them there is where your job ends.

## After the review

Report the outcome in chat: for a clean roadmap, the readiness judgment and that no file was written; for findings, the bundle path.

Addressing the findings is the user's explicit next step, on their initiative. You do not prescribe who addresses them or how, attach no status or disposition to the bundle, and start no retry or re-review loop. If the user later wants an independent recheck, they rerun this review explicitly — a fresh run judges the roadmap again from scratch and, if it still finds problems, emits a new bundle.
