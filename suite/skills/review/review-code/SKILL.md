---
name: review-code
description: Judge code on its own intrinsic merits — quality, safety, idioms, and testability — anchored to the thread's durable intent only where intent decides what "right" means, reviewing strictly read-only and recording any findings as a single pending-review bundle; use when code needs a quality review.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Review Code

Assess code on its own intrinsic merits, strictly read-only. The one question you answer: **is the code any good?** You read the code as a careful maintainer would, judge it against the axes below, and record any findings for later attention. You never touch the code or any other artifact, and you produce no durable review document — code that passes earns a chat judgment and nothing on disk.

This is the quality pass. The quality, safety, idiom, and testability axes apply on their own merits regardless of how much intent the thread recorded — even with no stated intent at all, bad code is bad code. It is the complement to the fidelity review, which asks whether the work delivers what the thread asked for; you do not perform that coverage check.

## Inputs

Gather all of these before judging; the procedure below works from what you gather here. Every one of them is read and none is written.

- `docs/adr/` — the project ADR catalog, listed with the command in `references/formats/adr.md`; open the records relevant to the code under review. Authoritative.
- `docs/glossary.md` — the project's terms. Authoritative.
- **The implementation folder under review** — the primary input, in one of two accepted forms. When the invocation **names a folder** under `implementations/`, that folder is the form; otherwise the form is the **newest folder under `implementations/` by stamp**. It is the boundary of what this review covers. Material.
- That folder's `report.md` — the implementer's account of the delivered work, in the shape `references/formats/implementation-report.md` defines; its `## Changes` locates the code and its `## Deviations` says which departures were deliberate. Material.
- The plan folder the report's `Plan:` line names, when it names one — `plans/<folder>/plan.md`, together with the `plan-tasks/` briefs the index points at for a strict plan. Authoritative for what the code was meant to do.
- The thread's `spec.md`, when present — the thread's design truth; its acceptance criteria define what the code is meant to do, which is what an intent-dependent finding rests on. Authoritative.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer and the constraint sources the code must not contradict. Authoritative within the thread.
- The thread's `seed.md` — the thread's founding intent, and the anchor when the thread holds neither a spec nor a plan. Authoritative for intent.
- The code under review — as the user names it (a git ref, a commit range, a saved or inline diff, or a file or directory path) or as the report's `## Changes` describes it, plus the surrounding code it must live with. Read the diff or the files; never check out a branch, run tests, modify the working tree, or mutate any git state. Material.

## The authority anchor

Quality does not require intent to exist, but where a finding turns on what the code is *for* — whether an error path can be reached, whether an edge case is possible, whether a behavior is the intended one — you judge it against the most specific durable intent the thread records. Resolve that anchor in this order and use the first that exists:

1. `spec.md` at the thread root — its acceptance criteria define what the code is meant to do.
2. else the plan folder the report's `Plan:` line names — `plans/<folder>/plan.md`, a one-screen brief or a strict index paired with the per-task briefs under `plan-tasks/`.
3. else `seed.md` — the thread's founding intent.

The thread's `adr/` applies on top of the resolved anchor as a binding constraint source, alongside the project ADRs under `docs/adr/` and the terms in `docs/glossary.md` that the thread's delta does not redefine; code that contradicts one of those records is a finding. `references/formats/adr.md` states what makes a contradiction intentional.

The anchor matters only at this margin where intent determines what "right" means; the four axes otherwise stand on their own. When the resolved anchor is coarse — `seed.md` only, with no acceptance criteria the thread ever recorded — name it explicitly in the bundle's `## Context` and scope any intent-dependent finding to what that anchor actually says. Never invent acceptance criteria the thread never recorded and then fault the code for missing them. When the thread records no anchor at all, run a pure quality pass and say so.

## Procedure

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. Two situations make a findings bundle physically impossible — `.pending-reviews/` would live inside the very thread that failed to resolve — so in both, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>`: no thread exists yet, or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp).

2. **Resolve the implementation folder under review.** When the invocation names a folder under `implementations/`, that folder is the target. When it names none, the target is the newest folder under `implementations/` by stamp; when several folders exist, say in chat which one you resolved before judging, so the user can redirect you. If the thread holds no implementation folder, or the invocation names one that does not exist, there is nothing to review: say so, write nothing, and end with `Outcome: REFUSED — <reason>`.

3. **Gather the inputs and any focus areas.** Read everything under `## Inputs` now, in that order, read-only, and resolve the authority anchor (`## The authority anchor`) from what you gathered. If the user named a code reference that is vague ("my changes", "the branch" with no name) or matches several plausible candidates, the review has no resolvable target: say so, write nothing, and end with `Outcome: REFUSED — <the ambiguity>`; never pick by recency or sort order. Record any focus areas the user named ("look for race conditions in the caching layer", "check error handling in the auth endpoints") for emphasis. Do not block on a missing anchor or missing focus.

4. **Walk the code once, then judge.** Read every file or hunk end to end and build a picture of what the code does and what the surrounding code expects before tagging findings — a premature finding from a partial read is a worse signal than a slower review. Then judge against each axis below (`## What you judge`). For every real weakness, form a finding: what is wrong, where it shows, why it matters for whoever maintains the code next, and a severity — `blocker` (the code is unsafe or broken enough that it should not land as-is), `issue` (a real weakness that will cause bugs or maintenance pain), or `nit` (minor and survivable). Tether every finding to concrete downstream impact.

5. **Report.** A clean review returns a concise quality judgment in chat and writes no file, ending `Outcome: DONE — <the quality judgment>`. A review with findings emits exactly one bundle (`## Recording findings`), reports its path, and ends `Outcome: DONE — findings at <bundle path>`. No preamble, no closing remark.

## What you judge

Cover these four axes; add others (performance, dependency hygiene, public-API design, accessibility, documentation drift) when the code warrants, but do not pad.

- **Quality** — readability, maintainability, naming, structure. Opaque functions, misleading names, tangled control flow, over-large functions or classes, duplicated logic, dead or commented-out code, magic numbers, and premature abstraction are findings graded by how central and how impactful they are.
- **Safety** — bug risks and unhandled conditions. Off-by-one errors, missing null and boundary checks, unhandled return values and broken invariants, silently swallowed or context-losing errors, race conditions and time-of-check-to-time-of-use bugs, security gaps (injection, unvalidated input, secrets in code or logs, bypassable authorization, cryptographic missteps, unsafe deserialization), and resource leaks on some paths are findings — race conditions and security gaps typically severe because they surface non-deterministically or under attack. Whether an edge case is reachable, or an error path matters, is where you consult the anchor.
- **Idioms** — language, framework, and observable project conventions. Hand-rolled equivalents of standard-library helpers, control flow that fights the language grain, type-system misuse, bypassed framework extension points, and new code that ignores a convention visible in the surrounding code without a stated reason are findings, graded by how surprising the deviation is to a future maintainer.
- **Testability** — coverage, test quality, and structure. Code untestable because of tight coupling to globals, hidden side effects, or non-determinism; observable new behavior with no test covering it (raise this toward `issue` when the anchor named that behavior; it does not apply to doc-only, comment-only, or trivially refactor-only changes); tests that assert on incidental output or mock so heavily they cannot fail; and a badly skewed integration-versus-unit balance are findings.

Findings that are really about whether the code delivers the intended behavior — coverage of the anchor's acceptance criteria, or whether the report's account of the work is truthful — are the fidelity review's territory, not this one; note them for that separate review rather than raising them here.

## Recording findings

When you hold one or more findings, hand them to `/emit-pending-review` as a single bundle. Give it:

- `review-code` as the reviewer.
- The implementation folder whose code you reviewed, `implementations/<folder>/`, as the target.
- When the resolved anchor is coarse or absent and a finding depends on intent, a `## Context` note naming that anchor so a reader knows what those findings are scoped to.
- Each finding with its severity (`blocker` / `issue` / `nit`), a category (`quality`, `safety`, `idioms`, `testability`, or an additional axis you used), the finding statement, the evidence (the file-and-line location, plus the anchor section when the finding turns on intent), and the downstream impact.

The primitive allocates one uniquely named file under the thread's `.pending-reviews/` folder, orders the findings, and reports the path; you emit one bundle per review run — that bundle is the only place findings go, and recording them there is where your job ends.

That bundle is the one thing a review run writes, and only when it holds findings. Everything else you touch is read and never written: the code, the implementation folder and its `report.md`, the plan folder the report names, `spec.md`, `seed.md`, the thread's `adr/` and `glossary.md`, `docs/adr/`, and `docs/glossary.md`. A criterion, constraint, or record you judge to be wrong is a finding you record in the bundle, never an edit you make.

## After the review

Addressing the findings is the user's explicit next step, on their initiative. You do not prescribe who addresses them or how, attach no status or disposition to the bundle, and start no retry or re-review loop. If the user later wants an independent recheck, they rerun this review explicitly — a fresh run judges the code again from scratch and, if it still finds problems, emits a new bundle.
