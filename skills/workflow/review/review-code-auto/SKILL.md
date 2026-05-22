---
name: review-code-auto
description: Read a CODE REFERENCE (a git ref, diff, file path, or directory path) and write a findings-first code review report to the active thread's inbox — covering quality, safety, idioms, and testability — end-to-end with no clarifying questions. Use when you want a lightweight autonomous code review independent of any source artifact (spec, proposal, plan, or issue).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.0
---

# Review Code Auto

Read a CODE REFERENCE READ-ONLY and emit a findings-first review report to the active thread's `inbox/open/` folder. This skill runs end-to-end: it reads the code, drafts the report, and writes one record per review run. It does not ask clarifying questions, does not walk findings with the user one at a time, and does not commit anything.

This is GENERAL-PURPOSE code review — no source artifact (spec, proposal, plan, or issue) is required or expected. The review evaluates code on its own merits: quality, safety, idioms, and testability. It does not check whether the code fulfills an upstream document's intent — that is a separate fidelity check. If the user has a source artifact and wants to verify the code delivers what the source promised, redirect them to the appropriate implementation-review skill instead. If findings trace back to upstream artifact ambiguity, note that in `## Next Actions`.

## Inputs

This skill accepts ONE required input: a CODE REFERENCE. No source artifact is needed. Accepted forms:

1. **A git ref** — a commit SHA (full or short), a branch name, a tag, or a commit range. Examples: `abc1234`, `feature/auth-rollout`, `v1.2.0`, `main..feature-branch`, `HEAD~5..HEAD`.
2. **A diff** — a unified diff passed inline or via a path to a saved `.diff` / `.patch` file.
3. **A file path** — a single file under review (absolute or relative to the repo root).
4. **A directory path** — a directory under review (absolute or relative to the repo root).

The code reference is READ-ONLY. This skill does NOT check out a branch, does NOT run tests, does NOT modify the working tree, and does NOT mutate any git state.

**The skill MAY accept freeform user concerns or focus areas as ADDITIONAL input** — but does NOT block on their absence. Examples: "look for race conditions in the new caching layer", "check for missing error handling in the auth endpoints". If focus areas are supplied, the skill emphasizes those areas. If not, it runs the default general-purpose pass across all axes.

### Ambiguity fallback

If the code reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. Do not pick by recency or by sort order. Examples of ambiguity that warrant asking: "review my changes" without naming a branch or file, a file path that resolves to multiple files, a directory path that does not exist as written.

## What This Skill Reviews

This skill runs four general-purpose review axes. Each axis carries severity heuristics tethered to downstream impact.

### Axis 1: Quality

Readability, maintainability, naming, structure, code smells, dead code, duplication.

- **Unreadable code** — a function whose intent is opaque without significant time investment is an `issue` or `nit` depending on how central the function is.
- **Poor naming** — variables, functions, classes, or modules whose names do not reflect their purpose or conflict with visible conventions are `nit` or `issue` depending on whether the misleading name affects downstream callers.
- **Tangled structure** — a long function that should have been decomposed, a class with too many responsibilities, or control flow that requires holding many branches in mind is an `issue`.
- **Code smells** — duplicated logic, dead code, commented-out blocks, magic numbers without named constants, deeply nested conditionals, premature abstraction — are `nit` to `issue` depending on extent and impact.

### Axis 2: Safety

Bug risks, edge cases, error handling, race conditions, security issues, resource leaks, undefined behavior.

- **Bug risks** — off-by-one errors, missing null checks, unhandled return values, incorrect ordering of operations, broken invariants — are `issue` or `blocker` depending on whether the bug is triggered by realistic inputs.
- **Edge cases** — empty inputs, boundary values, error paths, concurrent access, partial failure modes — that the code does not handle are `issue` or `blocker` depending on whether the edge case is reachable in production.
- **Error handling** — silently swallowed exceptions, errors logged but not propagated, error messages that lose context, panics in code that should return errors — are `issue` or `blocker` depending on the operational consequence.
- **Race conditions** — shared mutable state without synchronization, time-of-check-to-time-of-use bugs, ordering assumptions the runtime does not guarantee — are typically `blocker` because they manifest non-deterministically in production.
- **Security issues** — input validation gaps, injection vectors (SQL / shell / HTML / path), secrets in code or logs, authorization checks bypassable by direct API access, cryptographic missteps, deserialization risks — are typically `blocker`.
- **Resource leaks** — file handles, network sockets, database connections, mutex locks, memory — not released on all paths are `issue` or `blocker` depending on whether the leak compounds.

### Axis 3: Idioms

Language and framework idioms; project conventions if observable from surrounding code.

- **Non-idiomatic language usage** — code that ignores standard library helpers in favor of hand-rolled equivalents, control flow that fights the language's intended grain, type system misuse — is a `nit` or `issue` depending on whether the deviation affects readability or correctness.
- **Non-idiomatic framework usage** — bypassing the framework's intended extension points, manually doing what the framework provides, fighting the framework's lifecycle — is an `issue` because future maintainers expecting the framework's grain will be surprised.
- **Project convention violations** — when surrounding code reveals a clear convention (naming, layout, error type, logging interface) and the new code does not honor it without a stated reason, the violation is a `nit` or `issue` depending on how widely the convention is followed.
- **API ergonomics** — newly added public functions, methods, or types whose signatures fight the language's grain or surprise callers are `nit` or `issue`.

### Axis 4: Testability

Test coverage, test quality, edge cases tested, integration vs unit balance.

- **Untestable code** — code hard to test because of tight coupling to globals, hidden side effects, hard-to-mock dependencies, or non-deterministic behavior — is an `issue` (the cost of testing compounds; the code becomes a maintenance hazard).
- **Missing tests for new behavior** — observable new behavior introduced by the diff without a test covering it is a `nit` or `issue` depending on the project's test convention. When the change is doc-only, comment-only, or trivially refactor-only, this finding does NOT apply.
- **Weak tests** — tests that assert on incidental output, tests that mock so heavily they cannot fail, tests with no failure mode the code under test could produce — are `nit` or `issue`.
- **Integration vs unit balance** — a tower of mocked unit tests where one integration test would catch real failures, or one giant integration test where targeted unit tests would localize failures — is a `nit` to `issue` depending on the project's observable testing philosophy.

### Optional additional axes

The executor MAY add other axes when warranted by the code under review:

- **Performance characteristics** — algorithmic complexity, hot-path allocations, unnecessary database round-trips, missing indexes, N+1 query patterns.
- **Dependency hygiene** — new third-party dependencies added; license / supply-chain implications; version pinning; transitive footprint.
- **API design** — newly added public surface downstream callers will depend on; backwards-compatibility implications; breaking-change risk.
- **Accessibility** — UI code that does not honor a11y conventions (labels, focus management, contrast, semantic markup).
- **Documentation drift** — public API changes whose docstrings, README, or external references were not updated alongside the code.

These additional axes are NOT mandatory. The four primary axes (quality / safety / idioms / testability) are the baseline for this skill; everything else is territory the executor uses judgment to include or omit.

### What this skill does NOT review

This skill does NOT check "does the code implement what was intended" — that is a code-vs-original-intent fidelity question. If the user has a source artifact (spec, proposal, plan, issue, or inbox item) AND wants to check whether the code delivers what the source promised, redirect them to the appropriate implementation-review skill. That redirection should also surface in `## Next Actions` when this review surfaces concerns that would benefit from a fidelity check.

This skill also does NOT review the upstream proposal, spec, or plan that may have driven the code. If review findings trace back to upstream artifact ambiguity, surface that in `## Next Actions` with a pointer to the appropriate upstream review.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized findings-first. The body MUST cover the following six sections in this order:

1. **`## Verdict`** — overall judgment on the code under review against the general-purpose axes. Suggested vocabulary (executor MAY refine): `solid` (the code passes the review on its own merits; no blockers, issues at most), `mixed` (some findings need addressing; specify which axis), `weak` (one or more axes is substantially deficient; the code needs revision before it is ready to merge or land). One overall verdict plus a one-line tether to the highest-impact finding below.
2. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit`). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which axis it concerns, (b) what is wrong (specific code smell, bug risk, idiom violation, or testability concern), (c) why it matters for whoever picks up the code next.
3. **`## Evidence`** — for each finding above, cite the file:line in the code under review. Reference, do not recite — quoting entire functions is noise. Cite by file path plus line numbers; for diffs, cite the diff hunk header plus line numbers.
4. **`## References`** — list every artifact the review reads or depends on: the code reference (absolute path or commit SHA / range / branch name with the repo identifier), any related decision logs by absolute path, any prior review-findings on the same code by absolute path. External documentation consulted may also be cited when load-bearing.
5. **`## Open Questions`** — clarifications worth confirming with the code author, surrounding maintainers, or downstream operators. Frame as questions, not gaps to autofill. If a finding's severity depends on context the reviewer could not infer ("is this hot path actually hot?", "is this endpoint reachable from untrusted input?"), surface as an Open Question rather than guessing at the severity.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: re-implement to address `blocker` findings, run an implementation-fidelity review when the user has a source artifact, escalate to an upstream review when findings trace back to artifact ambiguity, open a discussion to settle a specific design question surfaced by the review, or merge / land the code if the verdict is `solid`. One action per finding cluster; do not pad.

Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. Do NOT collapse two sections into one; the explicit separation lets a downstream reader scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one code reference; emitting one file per finding would clutter `inbox/open/`.

## Output Artifact

Write the review artifact to:

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

Filename rules:
- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time and never re-derived.
- `<kebab-desc>` is a short description of what this review is about — typically `<code-reference-summary>-code-review` (e.g., `auth-module-code-review`, `pr-42-code-review`, `caching-layer-code-review`) or a phrase capturing the highest-impact finding.
- The `review-finding` artifact-type suffix is MANDATORY. Do not use any other suffix, and do not use a versioned form (`v<N>`) — reviews are records, not versioned artifacts.
- The `inbox/open/` folder is created on-demand if it does not exist. Do not pre-create empty folders.

Example filename:

```text
260521101212Z-auth-module-code-review-finding.md
```

The review body is plain markdown — no YAML frontmatter on the review artifact itself. Lineage between the review-finding and the code it reviews lives in the `## References` section, not in metadata on the file.

The artifact lives in `inbox/open/` rather than a separate reviews folder. Review findings are inbox items; their open / processed / dropped status is reflected by folder, not by frontmatter. Once a finding has been addressed, the review-finding is moved from `inbox/open/` to `inbox/processed/` — that lifecycle is manual and out of scope for this skill.

### Thread resolution

If `cwd` already sits inside a thread root (`docs/threads/<YYMMDDHHMMSSZ-slug>/`), that is the active thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

If NO thread exists, or if the code under review has no natural thread context, either (a) ask the user to confirm where to write the review, or (b) auto-create a thread when the code reference's slug is obvious enough to derive a thread name (e.g., reviewing `src/auth/` suggests an `auth-code-review` thread slug). Prefer to write the artifact to a thread; treat the no-thread case as a prompt for the user, not a silent fall-through.

## Workflow

1. **Resolve the active thread.** Identify the thread root. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp. If no thread exists, see the no-thread fallback under `## Output Artifact`.

2. **Resolve the code reference.** Detect the code reference from the user's invocation. If the reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. Do not pick by recency, sort order, or ref order.

3. **Capture any user-provided focus areas.** If the user named specific concerns, record them for emphasis. If not, run the default general-purpose pass across all axes. Do NOT block on missing focus.

4. **Read the code reference READ-ONLY.** This skill READS the code but does NOT edit it, does NOT rewrite it, does NOT modify source code, and does NOT mutate any git state — no `git checkout`, no `git reset`, no `git stash`, no `git rebase`. Do NOT check out the branch and run it. Do NOT modify the working tree. Do NOT run tests against the code. Code modifications belong to an implementation skill on a fresh invocation; this skill never crosses into implementation territory.

5. **Inspect the code: walk it once end-to-end before noting findings.** Read every file (for a directory or commit range) or every hunk (for a diff). Build a picture of what the code does and what the surrounding code expects before tagging findings. A premature finding from a partial read is a worse signal than a slower review that walks the code first.

6. **Run the four general-purpose review axes in order.** Apply each axis: quality → safety → idioms → testability. For each candidate finding, tag the axis and assign a severity (`blocker` / `issue` / `nit`). If the user supplied focus areas, emphasize findings that fall under those areas. Add optional additional-axis findings when warranted. Cluster related findings rather than fragmenting into many small bullets.

7. **Draft the findings-first report.** Compose the six sections in order: `## Verdict` → `## Findings` → `## Evidence` → `## References` → `## Open Questions` → `## Next Actions`. Skip a section entirely if it has nothing real to add. Order findings within `## Findings` by impact (severity first, then by axis sequence, then by location in the code).

8. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

9. **Write the review artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. The `inbox/open/` folder is created on-demand if it does not exist. The review body is plain markdown — no YAML frontmatter.

10. **Confirm.** Tell the user: `Review written: <relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review-finding artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision. Do not stage, do not commit, do not push, do not branch.

This skill also does not modify the code under review. Code modifications are an implementation skill's job. If the review surfaces findings that require code changes, surface them in `## Next Actions` and let the surrounding session invoke the appropriate implementation skill separately on a fresh invocation.

## Immutability

Emitted review-finding artifacts are immutable once written. A typo discovered in an emitted review-finding means writing a NEW review-finding record (new UTC stamp, new kebab-desc) — not an in-place edit. A revision to a review-finding is a NEW artifact, not an in-place edit.

Drafts under a thread's `.wip/` folder are editable during the session but are never committed by this skill.
