---
name: review-implementation
description: Check delivered work against the thread's durable intent and confirm the implementation's report honestly describes what exists — reviewing strictly read-only and recording any findings as a single pending-review bundle; use when an implementation needs a fidelity review before it is accepted.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.2.0
---

# Review Implementation

Assess delivered work against the intent it was meant to satisfy, strictly read-only. The one question you answer: **does the delivered work match the thread's durable intent, and does the implementation's report honestly describe what actually exists?** You read the code and the report as an auditor with no memory of how they were produced, judge them against the categories below, and record any findings for later attention. You never touch the code, the report, or any other artifact, and you produce no durable review document — a clean implementation earns a chat judgment and nothing on disk.

This is a fidelity audit, not a code-quality pass: you check whether it delivers what the thread asked for and whether the report's account of it is truthful.

## Inputs

Gather all of these before judging; the procedure below works from what you gather here. Every one of them is read and none is written.

- `docs/adr/` — the project ADR catalog, listed with the command in `references/formats/adr.md`; open the records relevant to the reviewed work. Authoritative.
- `docs/glossary.md` — the project's terms. Authoritative.
- **The implementation folder under review** — the primary input, in one of two accepted forms. When the invocation **names a folder** under `implementations/`, that folder is the form; otherwise the form is the **newest folder under `implementations/` by stamp**. It is the boundary of what this review covers. Material.
- That folder's `report.md` — the implementer's account of the delivered work and the claim under test, in the shape `references/formats/implementation-report.md` defines. Material.
- The plan folder the report's `Plan:` line names, when it names one — `plans/<folder>/plan.md`, together with the `plan-tasks/` briefs the index points at for a strict plan. Authoritative for what this implementation set out to build.
- The thread's `spec.md`, when present — the thread's design truth; its acceptance criteria are the contract the delivered work answers to. Authoritative.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer and the constraint sources delivered work must not contradict. Authoritative within the thread.
- The thread's `seed.md` — the thread's founding intent, and the anchor when the thread holds neither a spec nor a plan. Authoritative for intent.
- The delivered code — the files and changes the implementation produced, as the user names them (a git ref, a commit range, a saved or inline diff, or a file or directory path) or as the report's `## Changes` describes them. Read the diff or the files; never check out a branch, run tests, modify the working tree, or mutate any git state. Material.

## The authority anchor

The definition of intended behavior is the most specific durable intent the thread records. Resolve it in this order and use the first that exists:

1. `spec.md` at the thread root — its acceptance criteria are the contract.
2. else the plan folder the report's `Plan:` line names — `plans/<folder>/plan.md`, a one-screen brief or a strict index paired with the per-task briefs under `plan-tasks/`.
3. else `seed.md` — the thread's founding intent.

The thread's `adr/` applies on top of the resolved anchor as a binding constraint source: delivered work that contradicts a thread ADR is a finding no matter which anchor you resolved, and so is work that contradicts a project ADR under `docs/adr/` or a term in `docs/glossary.md` that the thread's delta does not redefine. `references/formats/adr.md` states what makes a contradiction intentional.

When the resolved anchor is coarse — `seed.md` only, with no acceptance criteria the thread ever recorded — name it explicitly in the bundle's `## Context` and scope every finding to what that anchor actually says. Never invent acceptance criteria the thread never recorded and then fault the work for missing them.

## The report is the claim under test

`implementations/<folder>/report.md` is the implementer's account of the work — its `## Outcome`, `## Changes`, and `## Verification`, plus any deviations, remaining concerns, and follow-ups. You test that account against the actual delivered work: a report that claims an outcome the code does not show, describes changes that are not there, or records a verification check the diff gives no sign was run is itself a finding.

Each entry under the report's `## Deviations` is a claim of its own — that something was built differently on purpose, departing from the spec section or ADR stem it names, for the reason it states. Test each one against the code and against the anchor: a deviation the code does not show, one that misdescribes what the anchor it names actually says, or one presented as deliberate where the work simply misses the anchor is a finding.

Read the report to learn what the implementer claims, then judge the claim, not just the code. When the folder holds no report, note its absence and judge the code against the anchor directly.

## Procedure

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. Two situations make a findings bundle physically impossible — `.pending-reviews/` would live inside the very thread that failed to resolve — so in both, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>`: no thread exists yet, or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp).

2. **Resolve the implementation folder under review.** When the invocation names a folder under `implementations/`, that folder is the target. When it names none, the target is the newest folder under `implementations/` by stamp; when several folders exist, say in chat which one you resolved before judging, so the user can redirect you. If the thread holds no implementation folder, or the invocation names one that does not exist, there is nothing to review: say so, write nothing, and end with `Outcome: REFUSED — <reason>`.

3. **Gather the inputs.** Read everything under `## Inputs` now, in that order, read-only, and resolve the authority anchor (`## The authority anchor`) from what you gathered. If the user named a code reference that is vague ("my changes", "the branch" with no name) or matches several plausible candidates, the review has no resolvable target: say so, write nothing, and end with `Outcome: REFUSED — <the ambiguity>`; never pick by recency or sort order.

4. **Judge against the categories.** Walk the delivered work against each category below (`## What you judge`). For every real gap, form a finding: what is wrong, where in the code or report it shows, why it would harm whoever picks up the work next, and a severity — `blocker` (the work does not deliver the intent, or the report materially misstates what exists), `issue` (a real gap that will cause rework or a wrong assumption), or `nit` (minor and survivable). Tether every finding to concrete downstream impact.

5. **Report.** A clean review returns a concise fidelity judgment in chat and writes no file, ending `Outcome: DONE — <the fidelity judgment>`. A review with findings emits exactly one bundle (`## Recording findings`), reports its path, and ends `Outcome: DONE — findings at <bundle path>`. No preamble, no closing remark.

## What you judge

These categories are your own; adapt or extend them when the work warrants, but cover this ground:

- **Acceptance** — every acceptance criterion the anchor records has a corresponding change in the delivered work. A criterion nothing addresses is a total gap; a criterion covered only in part, or covered by something that resembles it but behaves differently, is a partial or misaligned gap. When the anchor records no acceptance criteria, this category narrows to whether the work delivers the intent the anchor does state.
- **Constraints** — the "must" / "must not" / "must use" / "must avoid" statements of the anchor and of the thread's `adr/` are honored: technology choices, API and data-shape contracts, safety limits, repository layout. Before flagging a choice as a violation, check whether the anchor explicitly left that choice to the implementer's discretion — a granted freedom is never drift.
- **Scope** — the work stays inside the intended boundary. Changes to files or behavior the anchor did not call for, refactors done because they seemed cleaner rather than to make the intended work possible, and features named only as a possibility or placed out of scope are findings even when they look like improvements.
- **Behavior** — the observable behaviors the anchor named are present and correct: state changes, outputs, error surfaces, and side effects. A missing behavior, a behavior that resembles the intended one but differs in inputs, outputs, side effects, or error handling, and an unrequested new behavior are all findings.
- **Test coverage** — tests exist and exercise the behavior the intent names, at the granularity the surrounding project conventions expect. Behavior the anchor named but no test covers, and tests that assert incidental output rather than the promised behavior, are findings. When the intent is doc-only, configuration-only, or an explicitly behavior-preserving refactor, this category does not apply — say so rather than inventing a missing-test finding.

Findings that are purely about code quality on its own merits — readability, naming, idioms, testability independent of the intent — are out of scope here; note under the bundle or in chat that a separate code-quality review would cover them.

## Recording findings

When you hold one or more findings, hand them to `/emit-pending-review` as a single bundle. Give it:

- `review-implementation` as the reviewer.
- The implementation folder you reviewed, `implementations/<folder>/`, as the target.
- When the resolved anchor is coarse, a `## Context` note naming that anchor so a reader knows what the findings are scoped to.
- Each finding with its severity (`blocker` / `issue` / `nit`), a category (`acceptance`, `constraints`, `scope`, `behavior`, `test-coverage`, or the variation you used), the finding statement, the evidence (the code location and the anchor section or report claim it fails against), and the downstream impact.

The primitive allocates one uniquely named file under the thread's `.pending-reviews/` folder, orders the findings, and reports the path; you emit one bundle per review run — that bundle is the only place findings go, and recording them there is where your job ends.

That bundle is the one thing a review run writes, and only when it holds findings. Everything else you touch is read and never written: the delivered code, the implementation folder and its `report.md`, the plan folder the report names, `spec.md`, `seed.md`, the thread's `adr/` and `glossary.md`, `docs/adr/`, and `docs/glossary.md`. A criterion, constraint, or record you judge to be wrong is a finding you record in the bundle, never an edit you make.

## After the review

Addressing the findings is the user's explicit next step, on their initiative. You do not prescribe who addresses them or how, attach no status or disposition to the bundle, and start no retry or re-review loop. If the user later wants an independent recheck, they rerun this review explicitly — a fresh run judges the work again from scratch and, if it still finds problems, emits a new bundle.
