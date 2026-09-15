---
name: review-spec
description: Judge a thread's spec.md as a downstream handoff and record any findings.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Review Spec

Assess a thread-root `spec.md` as a downstream handoff, strictly read-only. The one question you answer: **could another agent plan and implement from this spec alone, without any hidden conversational context?** You read the spec as that downstream agent would, judge it against the axes below, and record any findings for later attention. You never touch the spec or any other artifact, and you produce no durable report — a clean spec earns a chat judgment and nothing on disk.

This is a quality-of-handoff and planning-readiness review; your concern is whether the document, as written, is fit for someone else to act on safely.

## Inputs

Gather all of these before judging; the procedure below works from what you gather here.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the spec's subject.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- The thread's `spec.md` — the reviewed target, and the review's only target; it comes in that one form, at the thread root. Read it end to end at least once, as a downstream planner with no memory of the conversation that produced it.
- The thread's `seed.md` — why the thread exists.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer and the constraint sources a spec must not contradict; inside the thread they take precedence over the project records.

## Procedure

1. **Gather the inputs.** Read everything under `## Inputs` now, in that order. If the thread holds no `spec.md`, tell the user there is nothing to review, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and `no spec.md to review`.

2. **Judge against the readiness axes.** Assess the spec on each axis below (`## What you judge`). For every real weakness, form a finding: what is wrong, where in the spec it shows, why it would leave a downstream agent guessing or blocked, and a severity — `blocker` (planning cannot proceed safely), `issue` (a real gap that will cause rework or a wrong guess), or `nit` (soft or imprecise, but survivable). Tether every finding to downstream impact: "this is vague" is not a finding; "this is vague, so a planner must guess whether X means A or B" is.

3. **Decide the outcome.** If the spec passes the bar — a downstream agent could plan and implement from it without hidden context — the review is clean. Otherwise you hold one or more findings to record.

4. **Report.** A clean review returns a concise readiness judgment in chat and writes no file; a review with findings records exactly one bundle (`## Recording findings`) and reports its path. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and the readiness judgment for a clean review, or `DONE` and `findings at <bundle path>` when a bundle was written. No preamble, no closing remark.

## What you judge

Read the spec against these axes; each weakness you find maps to the axis it concerns:

- **Clarity** — the prose says one thing, not several. Soft language ("robust", "scalable", "clean", "appropriate", "as needed") is the common signal that two agents would read a passage two different ways.
- **Completeness** — the information a planner needs is present, not left to inference at the boundaries (what is out of scope, which constraints bind, what "done" looks like).
- **Internal consistency** — no two parts of the spec point in different directions; the intended goal, scope, constraints, and acceptance guidance agree.
- **Scope boundaries** — what is in and, explicitly, what is out. An open boundary is an invitation to interpretation.
- **Observable behavior** — the state changes, outputs, error surfaces, and side effects a downstream executor must produce are stated, not implied.
- **Constraints** — the technical, repository, harness, and safety limits that bind the work are written down, not assumed obvious.
- **Degrees of freedom** — where the spec deliberately leaves choices open, it says so, so a planner knows what is free versus pinned.
- **Inferences** — every item in the spec's `## Inferences` section is really an inference: a point that follows from the settled material or has one plainly sensible answer. An item reasonable people could settle differently, whose answer would change what a reviewer checks or what the user experiences, is a fork the spec settled on its own, and a finding — a planner would build on a decision nobody made.
- **Acceptance guidance** — how a reviewer will know the result is right, so the downstream can self-verify without returning to the author for every ambiguous case.
- **Planning readiness** — taken as a whole, the spec is something a planner or implementer can act on directly.

A spec's section names, ordering, and structure are the author's discretion; what you check is that the substance behind these axes is present and coherent.

You do not perform an exhaustive claim-by-claim fidelity mapping between the spec and the records that bind it. You may, however, report an **obvious contradiction** with the thread's `adr/` or `glossary.md`, or with a project ADR or a project glossary term, when you notice one, because a spec that visibly commits to the opposite of a record authoritative over it harms readiness — a downstream agent would act on a claim that has already been overruled. A contradiction the thread has deliberately taken on is not one of these; classify it as `/consult-adrs` instructs. Treat this as a readiness finding when it is plain on the page, not as a mandate to audit fidelity line by line.

## Recording findings

When you hold one or more findings, record them by following `<skill_path>/references/instructions/emit-pending-review.md`, with yourself as the reviewer and `spec.md` as the target.

Use the readiness axes above as your category vocabulary — `clarity`, `completeness`, `consistency`, `scope`, `behavior`, `constraints`, `freedom`, `inference`, `acceptance`, `readiness` — assigning each finding the axis it concerns. You emit one bundle per review run: that bundle is the only place findings go, and recording them there is where your job ends.

That bundle is the one thing a review run writes, and only when it holds findings. Nothing else you touch is written: `spec.md` itself, `seed.md`, the thread's `adr/` and `glossary.md`, `docs/adr/`, and `docs/glossary.md` are read here and never written.

## After the review

Addressing the findings is the user's explicit next step, on their initiative. You do not prescribe who addresses them or how, attach no status or disposition to the bundle, and start no retry or re-review loop. If the user later wants an independent recheck, they rerun this review explicitly — a fresh run judges the spec again from scratch and, if it still finds problems, emits a new bundle.
