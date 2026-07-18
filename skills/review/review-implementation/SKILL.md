---
name: review-implementation
description: Check delivered work against the thread's durable intent and confirm the implementation report honestly describes what exists — reviewing strictly read-only and recording any findings as a single pending-review bundle; use when an implementation needs a fidelity review before it is accepted.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.1.0
---

# Review Implementation

Assess delivered work against the intent it was meant to satisfy, strictly read-only. The one question you answer: **does the delivered work match the thread's durable intent, and does `implementation-report.md` honestly describe what actually exists?** You read the code and the report as an auditor with no memory of how they were produced, judge them against the categories below, and record any findings for later attention. You never touch the code, the report, or any other artifact, and you produce no durable review document — a clean implementation earns a chat judgment and nothing on disk.

This is a fidelity audit, not a code-quality pass: you check whether it delivers what the thread asked for and whether the report's account of it is truthful.

## The authority anchor

The definition of intended behavior is the most specific durable intent the thread records. Resolve it in this order and use the first that exists:

1. `spec.md` at the thread root — its acceptance criteria are the contract.
2. else `plan.md` at the thread root — a one-screen brief, or a strict index paired with the per-task briefs under `plan-tasks/`.
3. else `seed.md` — the thread's founding intent.

`decisions.md` at the thread root always applies on top of the resolved anchor as a binding constraint source; delivered work that contradicts a settled decision is a finding no matter which anchor you resolved.

When the resolved anchor is coarse — `seed.md` only, with no acceptance criteria the thread ever recorded — name it explicitly in the bundle's `## Context` and scope every finding to what that anchor actually says. Never invent acceptance criteria the thread never recorded and then fault the work for missing them.

## The report is the claim under test

`implementation-report.md` at the thread root is the implementer's account of the work — its `## Outcome`, `## Changes`, and `## Verification`, plus any deviations, remaining concerns, and follow-ups. You test that account against the actual delivered work: a report that claims an outcome the code does not show, describes changes that are not there, or records a verification check the diff gives no sign was run is itself a finding. Read the report to learn what the implementer claims, then judge the claim, not just the code. When no report exists, note its absence and judge the code against the anchor directly.

## Procedure

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. Two situations make a findings bundle physically impossible — `.pending-reviews/` would live inside the very thread that failed to resolve — so in both, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>`: no thread exists yet, or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp).

2. **Resolve the delivered work read-only.** The reviewed target is the code the user names — a git ref (commit SHA, branch, tag), a commit range, a saved or inline diff, or a file or directory path. If the reference is unsupplied, vague ("my changes", "the branch" with no name), or matches multiple plausible candidates, the review has no resolvable target: say so, write nothing, and end with `Outcome: REFUSED — <the ambiguity>`; never pick by recency or sort order. Read the diff or the files, but do not check out a branch, run tests, modify the working tree, or mutate any git state.

3. **Resolve the anchor and read the report.** Resolve the authority anchor (`## The authority anchor`) and read it read-only. Read `implementation-report.md` at the thread root, and `decisions.md`. Read everything read-only — you edit none of it and propose no edits into it.

4. **Judge against the categories.** Walk the delivered work against each category below (`## What you judge`). For every real gap, form a finding: what is wrong, where in the code or report it shows, why it would harm whoever picks up the work next, and a severity — `blocker` (the work does not deliver the intent, or the report materially misstates what exists), `issue` (a real gap that will cause rework or a wrong assumption), or `nit` (minor and survivable). Tether every finding to concrete downstream impact.

5. **Report.** A clean review returns a concise fidelity judgment in chat and writes no file, ending `Outcome: DONE — <the fidelity judgment>`. A review with findings emits exactly one bundle (`## Recording findings`), reports its path, and ends `Outcome: DONE — findings at <bundle path>`. No preamble, no closing remark.

## What you judge

These categories are your own; adapt or extend them when the work warrants, but cover this ground:

- **Acceptance** — every acceptance criterion the anchor records has a corresponding change in the delivered work. A criterion nothing addresses is a total gap; a criterion covered only in part, or covered by something that resembles it but behaves differently, is a partial or misaligned gap. When the anchor records no acceptance criteria, this category narrows to whether the work delivers the intent the anchor does state.
- **Constraints** — the anchor's and `decisions.md`'s "must" / "must not" / "must use" / "must avoid" statements are honored: technology choices, API and data-shape contracts, safety limits, repository layout. Before flagging a choice as a violation, check whether the anchor explicitly left that choice to the implementer's discretion — a granted freedom is never drift.
- **Scope** — the work stays inside the intended boundary. Changes to files or behavior the anchor did not call for, refactors done because they seemed cleaner rather than to make the intended work possible, and features named only as a possibility or placed out of scope are findings even when they look like improvements.
- **Behavior** — the observable behaviors the anchor named are present and correct: state changes, outputs, error surfaces, and side effects. A missing behavior, a behavior that resembles the intended one but differs in inputs, outputs, side effects, or error handling, and an unrequested new behavior are all findings.
- **Test coverage** — tests exist and exercise the behavior the intent names, at the granularity the surrounding project conventions expect. Behavior the anchor named but no test covers, and tests that assert incidental output rather than the promised behavior, are findings. When the intent is doc-only, configuration-only, or an explicitly behavior-preserving refactor, this category does not apply — say so rather than inventing a missing-test finding.

Findings that are purely about code quality on its own merits — readability, naming, idioms, testability independent of the intent — are out of scope here; note under the bundle or in chat that a separate code-quality review would cover them.

## Recording findings

When you hold one or more findings, hand them to `/emit-pending-review` as a single bundle. Give it:

- `review-implementation` as the reviewer.
- The delivered-work reference (the git ref, range, or path you reviewed) as the target.
- When the resolved anchor is coarse, a `## Context` note naming that anchor so a reader knows what the findings are scoped to.
- Each finding with its severity (`blocker` / `issue` / `nit`), a category (`acceptance`, `constraints`, `scope`, `behavior`, `test-coverage`, or the variation you used), the finding statement, the evidence (the code location and the anchor section or report claim it fails against), and the downstream impact.

The primitive allocates one uniquely named file under the thread's `.pending-reviews/` folder, orders the findings, and reports the path; you emit one bundle per review run — that bundle is the only place findings go, and recording them there is where your job ends.

## After the review

Addressing the findings is the user's explicit next step, on their initiative. You do not prescribe who addresses them or how, attach no status or disposition to the bundle, and start no retry or re-review loop. If the user later wants an independent recheck, they rerun this review explicitly — a fresh run judges the work again from scratch and, if it still finds problems, emits a new bundle.
