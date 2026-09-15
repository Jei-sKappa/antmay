---
name: review-implementation
description: Check delivered work against the thread's durable intent and test the report's account of it.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Review Implementation

Assess delivered work against the intent it was meant to satisfy, strictly read-only. The one question you answer: **does the delivered work match the thread's durable intent, and does the implementation's report honestly describe what actually exists?** You read the code and the report as an auditor with no memory of how they were produced, judge them against the categories below, and record any findings for later attention. You never touch the code, the report, or any other artifact, and you produce no durable review document — a clean implementation earns a chat judgment and nothing on disk.

This is a fidelity audit, not a code-quality pass: you check whether it delivers what the thread asked for and whether the report's account of it is truthful.

## Inputs

Gather all of these before judging; the procedure below works from what you gather here.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the reviewed work.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- **The implementation folder under review** — the primary input, in one of two accepted forms. When the invocation **names a folder** under `implementations/`, that folder is the form; otherwise the form is the **newest folder under `implementations/` by stamp**. It is the boundary of what this review covers.
- That folder's `report.md` — the implementer's account of the delivered work and the claim under test, in the shape `<skill_path>/references/formats/implementation-report.md` defines.
- The plan folder the report's `Plan:` line names, when present — `plans/<folder>/plan.md`, together with the `plan-tasks/` briefs the index points at for a strict plan.
- The thread's `spec.md`, when the file exists — the thread's design truth; its acceptance criteria are the contract the delivered work answers to.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer and the constraint sources delivered work must not contradict; inside the thread they take precedence over the project records.
- The thread's `seed.md` — the thread's founding intent, and the anchor when the thread holds neither a spec nor a plan.
- The delivered code — the files and changes the implementation produced, as the user names them (a git ref, a commit range, a saved or inline diff, or a file or directory path) or as the report's `## Changes` describes them. Read the diff or the files; never check out a branch, run tests, modify the working tree, or mutate any git state.

## The authority anchor

The definition of intended behavior is the most specific durable intent the thread records. Resolve it in this order and use the first that exists:

1. `spec.md` at the thread root — its acceptance criteria are the contract.
2. else the plan folder the report's `Plan:` line names — `plans/<folder>/plan.md`, a one-screen brief or a strict index paired with the per-task briefs under `plan-tasks/`.
3. else `seed.md` — the thread's founding intent.

The thread's `adr/` applies on top of the resolved anchor as a binding constraint source: delivered work that contradicts a thread ADR is a finding no matter which anchor you resolved, and so is work that contradicts a project ADR or a project glossary term the thread's delta does not redefine. Whether such a contradiction is intentional or a finding is classified as `/consult-adrs` instructs.

When the resolved anchor is coarse — `seed.md` only, with no acceptance criteria the thread ever recorded — name it explicitly in the bundle's `## Context` and scope every finding to what that anchor actually says. Never invent acceptance criteria the thread never recorded and then fault the work for missing them.

## The report is the claim under test

`implementations/<folder>/report.md` is the implementer's account of the work — its `## Outcome`, `## Changes`, and `## Verification`, plus any deviations, remaining concerns, and follow-ups. You test that account against the actual delivered work: a report that claims an outcome the code does not show, describes changes that are not there, or records a verification check the diff gives no sign was run is itself a finding.

Each entry under the report's `## Deviations` is a claim of its own — that something was built differently on purpose, departing from the spec section or ADR stem it names, for the reason it states. Test each one against the code and against the anchor: a deviation the code does not show, one that misdescribes what the anchor it names actually says, or one presented as deliberate where the work simply misses the anchor is a finding.

Read the report to learn what the implementer claims, then judge the claim, not just the code. When the folder holds no report, note its absence and judge the code against the anchor directly.

## Procedure

1. **Resolve the implementation folder under review.** When the invocation names a folder under `implementations/`, that folder is the target. When it names none, the target is the newest folder under `implementations/` by stamp; when several folders exist, say in chat which one you resolved before judging, so the user can redirect you. If the thread holds no implementation folder, or the invocation names one that does not exist, there is nothing to review: say so, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the reason.

2. **Gather the inputs.** Read everything under `## Inputs` now, in that order, read-only, and resolve the authority anchor (`## The authority anchor`) from what you gathered. If the user named a code reference that is vague ("my changes", "the branch" with no name) or matches several plausible candidates, the review has no resolvable target: say so, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the ambiguity; never pick by recency or sort order.

3. **Judge against the categories.** Walk the delivered work against each category below (`## What you judge`). For every real gap, form a finding: what is wrong, where in the code or report it shows, why it would harm whoever picks up the work next, and a severity — `blocker` (the work does not deliver the intent, or the report materially misstates what exists), `issue` (a real gap that will cause rework or a wrong assumption), or `nit` (minor and survivable). Tether every finding to concrete downstream impact.

4. **Report.** A clean review returns a concise fidelity judgment in chat and writes no file; a review with findings records exactly one bundle (`## Recording findings`) and reports its path. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and the fidelity judgment for a clean review, or `DONE` and `findings at <bundle path>` when a bundle was written. No preamble, no closing remark.

## What you judge

These categories are your own; adapt or extend them when the work warrants, but cover this ground:

- **Acceptance** — every acceptance criterion the anchor records has a corresponding change in the delivered work. A criterion nothing addresses is a total gap; a criterion covered only in part, or covered by something that resembles it but behaves differently, is a partial or misaligned gap. When the anchor records no acceptance criteria, this category narrows to whether the work delivers the intent the anchor does state.
- **Constraints** — the "must" / "must not" / "must use" / "must avoid" statements of the anchor and of the thread's `adr/` are honored: technology choices, API and data-shape contracts, safety limits, repository layout. Before flagging a choice as a violation, check whether the anchor explicitly left that choice to the implementer's discretion — a granted freedom is never drift.
- **Scope** — the work stays inside the intended boundary. Changes to files or behavior the anchor did not call for, refactors done because they seemed cleaner rather than to make the intended work possible, and features named only as a possibility or placed out of scope are findings even when they look like improvements.
- **Behavior** — the observable behaviors the anchor named are present and correct: state changes, outputs, error surfaces, and side effects. A missing behavior, a behavior that resembles the intended one but differs in inputs, outputs, side effects, or error handling, and an unrequested new behavior are all findings.
- **Test coverage** — tests exist and exercise the behavior the intent names, at the granularity the surrounding project conventions expect. Behavior the anchor named but no test covers, and tests that assert incidental output rather than the promised behavior, are findings. When the intent is doc-only, configuration-only, or an explicitly behavior-preserving refactor, this category does not apply — say so rather than inventing a missing-test finding.

Findings that are purely about code quality on its own merits — readability, naming, idioms, testability independent of the intent — are out of scope here; note under the bundle or in chat that a separate code-quality review would cover them.

## Recording findings

When you hold one or more findings, record them by following `<skill_path>/references/instructions/emit-pending-review.md`, with yourself as the reviewer and the implementation folder you reviewed, `implementations/<folder>/`, as the target. When the resolved anchor is coarse, add a `## Context` note naming that anchor so a reader knows what the findings are scoped to.

Your category vocabulary is `acceptance`, `constraints`, `scope`, `behavior`, `test-coverage`, or the variation you used, and the evidence for a finding is the code location together with the anchor section or report claim it fails against. You emit one bundle per review run: that bundle is the only place findings go, and recording them there is where your job ends.

That bundle is the one thing a review run writes, and only when it holds findings. Everything else you touch is read and never written: the delivered code, the implementation folder and its `report.md`, the plan folder the report names, `spec.md`, `seed.md`, the thread's `adr/` and `glossary.md`, `docs/adr/`, and `docs/glossary.md`. A criterion, constraint, or record you judge to be wrong is a finding you record in the bundle, never an edit you make.

## After the review

Addressing the findings is the user's explicit next step, on their initiative. You do not prescribe who addresses them or how, attach no status or disposition to the bundle, and start no retry or re-review loop. If the user later wants an independent recheck, they rerun this review explicitly — a fresh run judges the work again from scratch and, if it still finds problems, emits a new bundle.
