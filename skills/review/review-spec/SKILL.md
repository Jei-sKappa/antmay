---
name: review-spec
description: Read a thread-root spec.md as a downstream handoff and judge whether another agent could plan and implement from it without hidden conversational context, reporting any findings as a single pending-review bundle; use when a spec should be checked for planning readiness before downstream work.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.1.0
---

# Review Spec

Assess a thread-root `spec.md` as a downstream handoff, strictly read-only. The one question you answer: **could another agent plan and implement from this spec alone, without any hidden conversational context?** You read the spec as that downstream agent would, judge it against the axes below, and record any findings for later attention. You never touch the spec or any other artifact, and you produce no durable report — a clean spec earns a chat judgment and nothing on disk.

This is a quality-of-handoff and planning-readiness review; your concern is whether the document, as written, is fit for someone else to act on safely.

## Procedure

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. Two situations make a findings bundle physically impossible — `.pending-reviews/` would live inside the very thread that failed to resolve — so in both, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>`: no thread exists yet, or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp).

2. **Read the spec read-only.** The target is the thread-root `spec.md`. Read it end to end at least once, as a downstream planner with no memory of the conversation that produced it. If no `spec.md` exists at the thread root, tell the user there is nothing to review, write nothing, and end with `Outcome: REFUSED — no spec.md to review`.

3. **Judge against the readiness axes.** Assess the spec on each axis below (`## What you judge`). For every real weakness, form a finding: what is wrong, where in the spec it shows, why it would leave a downstream agent guessing or blocked, and a severity — `blocker` (planning cannot proceed safely), `issue` (a real gap that will cause rework or a wrong guess), or `nit` (soft or imprecise, but survivable). Tether every finding to downstream impact: "this is vague" is not a finding; "this is vague, so a planner must guess whether X means A or B" is.

4. **Decide the outcome.** If the spec passes the bar — a downstream agent could plan and implement from it without hidden context — the review is clean. Otherwise you hold one or more findings to record.

5. **Report.** A clean review returns a concise readiness judgment in chat and writes no file, ending `Outcome: DONE — <the readiness judgment>`. A review with findings emits exactly one bundle (`## Recording findings`), reports its path, and ends `Outcome: DONE — findings at <bundle path>`. No preamble, no closing remark.

## What you judge

Read the spec against these axes; each weakness you find maps to the axis it concerns:

- **Clarity** — the prose says one thing, not several. Soft language ("robust", "scalable", "clean", "appropriate", "as needed") is the common signal that two agents would read a passage two different ways.
- **Completeness** — the information a planner needs is present, not left to inference at the boundaries (what is out of scope, which constraints bind, what "done" looks like).
- **Internal consistency** — no two parts of the spec point in different directions; the intended outcome, scope, constraints, and acceptance guidance agree.
- **Scope boundaries** — what is in and, explicitly, what is out. An open boundary is an invitation to interpretation.
- **Observable behavior** — the state changes, outputs, error surfaces, and side effects a downstream executor must produce are stated, not implied.
- **Constraints** — the technical, repository, harness, and safety limits that bind the work are written down, not assumed obvious.
- **Degrees of freedom** — where the spec deliberately leaves choices open, it says so, so a planner knows what is free versus pinned.
- **Acceptance guidance** — how a reviewer will know the result is right, so the downstream can self-verify without returning to the author for every ambiguous case.
- **Planning readiness** — taken as a whole, the spec is something a planner or implementer can act on directly.

A spec's section names, ordering, and structure are the author's discretion; what you check is that the substance behind these axes is present and coherent.

You do not perform an exhaustive decision-by-decision fidelity mapping between the spec and the thread's `decisions.md`. You may, however, report an **obvious contradiction** with `decisions.md` when you notice one, because a spec that visibly commits to the opposite of a settled decision harms readiness — a downstream agent would act on a claim the thread has already overruled. Treat this as a readiness finding when it is plain on the page, not as a mandate to audit fidelity line by line.

## Recording findings

When you hold one or more findings, hand them to `/emit-pending-review` as a single bundle. Give it:

- `review-spec` as the reviewer.
- `spec.md` as the target.
- Each finding with its severity (`blocker` / `issue` / `nit`), a category, the finding statement, the evidence (the spec section or a short quote showing the weakness), and the downstream impact.

Use the readiness axes above as your category vocabulary — `clarity`, `completeness`, `consistency`, `scope`, `behavior`, `constraints`, `freedom`, `acceptance`, `readiness` — assigning each finding the axis it concerns. The primitive allocates one uniquely named file under the thread's `.pending-reviews/` folder, orders the findings, and reports the path; you emit one bundle per review run — that bundle is the only place findings go, and recording them there is where your job ends.

## After the review

Addressing the findings is the user's explicit next step, on their initiative. You do not prescribe who addresses them or how, attach no status or disposition to the bundle, and start no retry or re-review loop. If the user later wants an independent recheck, they rerun this review explicitly — a fresh run judges the spec again from scratch and, if it still finds problems, emits a new bundle.
