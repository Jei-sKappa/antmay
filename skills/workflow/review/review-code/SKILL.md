---
name: review-code
description: Judge code on its own intrinsic merits — quality, safety, idioms, and testability — anchored to the thread's durable intent only where intent decides what "right" means, reviewing strictly read-only and recording any findings as a single pending-review bundle; use when code needs a quality review.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.1.1
---

# Review Code

Assess code on its own intrinsic merits, strictly read-only. The one question you answer: **is the code any good?** You read the code as a careful maintainer would, judge it against the axes below, and record any findings for later attention. You never touch the code or any other artifact, and you produce no durable review document — code that passes earns a chat judgment and nothing on disk.

This is the quality pass. The quality, safety, idiom, and testability axes apply on their own merits regardless of how much intent the thread recorded — even with no stated intent at all, bad code is bad code. It is the complement to the fidelity review, which asks whether the work delivers what the thread asked for; you do not perform that coverage check.

## The authority anchor

Quality does not require intent to exist, but where a finding turns on what the code is *for* — whether an error path can be reached, whether an edge case is possible, whether a behavior is the intended one — you judge it against the most specific durable intent the thread records. Resolve that anchor in this order and use the first that exists:

1. `spec.md` at the thread root — its acceptance criteria define what the code is meant to do.
2. else `plan.md` at the thread root — a one-screen brief, or a strict index paired with the per-task briefs under `plan-tasks/`.
3. else `seed.md` — the thread's founding intent.

`decisions.md` at the thread root always applies on top of the resolved anchor as a binding constraint source. The anchor matters only at this margin where intent determines what "right" means; the four axes otherwise stand on their own. When the resolved anchor is coarse — `seed.md` only, with no acceptance criteria the thread ever recorded — name it explicitly in the bundle's `## Context` and scope any intent-dependent finding to what that anchor actually says. Never invent acceptance criteria the thread never recorded and then fault the code for missing them. When the thread records no anchor at all, run a pure quality pass and say so.

## Procedure

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. Two situations make a findings bundle physically impossible — `.pending-reviews/` would live inside the very thread that failed to resolve — so in both, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>`: no thread exists yet, or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp).

2. **Resolve the code read-only.** The reviewed target is the code the user names — a git ref (commit SHA, branch, tag), a commit range, a saved or inline diff, or a file or directory path. If the reference is unsupplied, vague ("my changes", "the branch" with no name), or matches multiple plausible candidates, the review has no resolvable target: say so, write nothing, and end with `Outcome: REFUSED — <the ambiguity>`; never pick by recency or sort order. Read the diff or the files, but do not check out a branch, run tests, modify the working tree, or mutate any git state.

3. **Resolve the anchor and any focus areas.** Resolve the authority anchor (`## The authority anchor`) and read it and `decisions.md` read-only, to anchor intent-dependent findings. Record any focus areas the user named ("look for race conditions in the caching layer", "check error handling in the auth endpoints") for emphasis. Do not block on a missing anchor or missing focus.

4. **Walk the code once, then judge.** Read every file or hunk end to end and build a picture of what the code does and what the surrounding code expects before tagging findings — a premature finding from a partial read is a worse signal than a slower review. Then judge against each axis below (`## What you judge`). For every real weakness, form a finding: what is wrong, where it shows, why it matters for whoever maintains the code next, and a severity — `blocker` (the code is unsafe or broken enough that it should not land as-is), `issue` (a real weakness that will cause bugs or maintenance pain), or `nit` (minor and survivable). Tether every finding to concrete downstream impact.

5. **Report.** A clean review returns a concise quality judgment in chat and writes no file, ending `Outcome: DONE — <the quality judgment>`. A review with findings emits exactly one bundle (`## Recording findings`), reports its path, and ends `Outcome: DONE — findings at <bundle path>`. No preamble, no closing remark.

## What you judge

Cover these four axes; add others (performance, dependency hygiene, public-API design, accessibility, documentation drift) when the code warrants, but do not pad.

- **Quality** — readability, maintainability, naming, structure. Opaque functions, misleading names, tangled control flow, over-large functions or classes, duplicated logic, dead or commented-out code, magic numbers, and premature abstraction are findings graded by how central and how impactful they are.
- **Safety** — bug risks and unhandled conditions. Off-by-one errors, missing null and boundary checks, unhandled return values and broken invariants, silently swallowed or context-losing errors, race conditions and time-of-check-to-time-of-use bugs, security gaps (injection, unvalidated input, secrets in code or logs, bypassable authorization, cryptographic missteps, unsafe deserialization), and resource leaks on some paths are findings — race conditions and security gaps typically severe because they surface non-deterministically or under attack. Whether an edge case is reachable, or an error path matters, is where you consult the anchor.
- **Idioms** — language, framework, and observable project conventions. Hand-rolled equivalents of standard-library helpers, control flow that fights the language grain, type-system misuse, bypassed framework extension points, and new code that ignores a convention visible in the surrounding code without a stated reason are findings, graded by how surprising the deviation is to a future maintainer.
- **Testability** — coverage, test quality, and structure. Code untestable because of tight coupling to globals, hidden side effects, or non-determinism; observable new behavior with no test covering it (raise this toward `issue` when the anchor named that behavior; it does not apply to doc-only, comment-only, or trivially refactor-only changes); tests that assert on incidental output or mock so heavily they cannot fail; and a badly skewed integration-versus-unit balance are findings.

Findings that are really about whether the code delivers the intended behavior — coverage of the anchor's acceptance criteria — are the fidelity review's territory, not this one; note them for that separate review rather than raising them here.

## Recording findings

When you hold one or more findings, hand them to `/emit-pending-review` as a single bundle. Give it:

- `review-code` as the reviewer.
- The code reference (the git ref, range, or path you reviewed) as the target.
- When the resolved anchor is coarse or absent and a finding depends on intent, a `## Context` note naming that anchor so a reader knows what those findings are scoped to.
- Each finding with its severity (`blocker` / `issue` / `nit`), a category (`quality`, `safety`, `idioms`, `testability`, or an additional axis you used), the finding statement, the evidence (the file-and-line location, plus the anchor section when the finding turns on intent), and the downstream impact.

The primitive allocates one uniquely named file under the thread's `.pending-reviews/` folder, orders the findings, and reports the path; you emit one bundle per review run — that bundle is the only place findings go, and recording them there is where your job ends.

## After the review

Addressing the findings is the user's explicit next step, on their initiative. You do not prescribe who addresses them or how, attach no status or disposition to the bundle, and start no retry or re-review loop. If the user later wants an independent recheck, they rerun this review explicitly — a fresh run judges the code again from scratch and, if it still finds problems, emits a new bundle.
