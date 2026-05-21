---
name: review-code-auto
description: Read a CODE REFERENCE (a git ref / diff / file path / directory path) and write a general-purpose findings-first code review to the active thread's `inbox/open/<UTC>-<kebab-desc>-review-finding.md`, end-to-end, with no clarifying questions and no per-finding chat walk — covering quality / safety / idioms / testability per D86. This is GENERAL-PURPOSE code review — NO source artifact (spec / proposal / plan / GitHub issue / Inbox item) is required, and that is what distinguishes this skill from `review-implementation-*`. Use when you want a lightweight autonomous code review independent of a source artifact — not when you want to walk findings together one at a time (use `review-code-interactive` for that), and not when you have a source artifact and want to check code-vs-original-intent fidelity (use `review-implementation-auto` / `review-implementation-interactive` for that), and not when you want to review the upstream proposal / spec / plan (use `review-proposal-*` / `review-spec-*` / `review-plan-*`).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Code Auto

Read a CODE REFERENCE (a git ref, a diff, a file path, or a directory path) READ-ONLY and emit a findings-first review report to the active thread's `inbox/open/` folder under the V1 record-form filename grammar with the `review-finding` artifact-type token. This skill is the autonomous half of the V1 code-review pair — it reads the code, drafts the report end-to-end, and writes one record per review run. It does not ask clarifying questions, it does not walk findings with the user one-at-a-time, and it does not commit. For the collaborative per-finding walk with anti-sycophancy push-back, use the sibling skill `review-code-interactive` instead.

`review-code-auto` is one of TEN V1 review skills, paired across five review targets — proposal, spec, plan, implementation, code — each with an `-auto` and an `-interactive` variant. Two axes are independent: the REVIEW TARGET (code here; proposal / spec / plan / implementation in the other four pairs) and the AUTONOMY axis (autonomous here; collaborative in the sibling). The review target this skill addresses is the CODE — a git ref, a diff, a file, or a directory — independent of any source artifact. This is GENERAL-PURPOSE code review per D86: NO mandatory source artifact, NO fidelity-to-source check, and NO promise to verify that the code implements what some upstream document said it would.

**This is the distinguishing trait of this skill versus `review-implementation-auto` and `review-implementation-interactive`.** If the user HAS a source artifact (a spec under `docs/threads/<thread>/specs/`, a proposal under `docs/threads/<thread>/proposals/`, a plan under `docs/threads/<thread>/plans/`, a GitHub issue, or an Inbox item) AND they want to check whether the code delivers what the source promised — code-vs-original-intent fidelity — they should use `skills/review-implementation-auto/SKILL.md` or `skills/review-implementation-interactive/SKILL.md` instead. This skill performs SPEC-INDEPENDENT review on the code's own merits — its quality, safety, idioms, and testability — and stops there. The two review targets are complementary, not competing: `review-implementation-*` answers "does the code do what the source said?", this skill answers "is the code any good on its own terms?".

## Inputs

This skill accepts ONE input: a CODE REFERENCE. NO source artifact is required — this skill performs general-purpose code review without a spec, proposal, plan, GitHub issue, or Inbox item. Accepted forms of the code reference:

1. **A git ref** — a commit SHA (full or short), a branch name, a tag, or a commit range. Examples: `abc1234`, `feature/auth-rollout`, `v1.2.0`, `main..feature-branch`, `HEAD~5..HEAD`. The git ref identifies what code is under review.
2. **A diff** — a unified diff passed inline or via a path to a saved `.diff` / `.patch` file. Useful when the code has not been committed to a branch this skill can resolve, or when the diff was exported for review separately.
3. **A file path** — a single file under review (absolute or relative to the repo root). Useful for reviewing one file in isolation.
4. **A directory path** — a directory under review (absolute or relative to the repo root). Useful for reviewing a module, package, subsystem, or any code grouping the user wants reviewed as a unit.

The code reference is READ-ONLY. This skill does NOT check out a branch, does NOT run tests, does NOT modify the working tree, does NOT modify any source code, and does NOT mutate any git state. The review is read-only against the code text.

**The skill MAY ACCEPT freeform user concerns or focus areas as ADDITIONAL input** — but does NOT block on their absence. Examples: "look for race conditions in the new caching layer", "check for missing error handling in the auth endpoints", "review the new module for testability", "I'm worried about performance in this hot path". If the user provides focus, this skill emphasizes those areas in the review. If the user provides no focus, this skill runs the default general-purpose pass across all axes.

### Ambiguity fallback

If the code reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest code" algorithm. Do not pick by recency. Examples of ambiguity that warrant ASKing: "review my changes" without naming a branch / commit / file, "the recent stuff" without a ref, a file path that resolves to multiple files under different folders, a directory path that does not exist as written. Silently picking by recency or by sort order would hide a real decision behind a sort order.

## What This Skill Reviews

This skill runs the **general-purpose code-review axes** per D86. Each axis carries its own severity heuristics tethered to downstream impact: what does the next reader / next maintainer / next caller find broken, fragile, surprising, or untestable about this code?

### Axis 1: Quality

Readability, maintainability, naming, structure, code smells, dead code, duplication.

- **Unreadable code** — a function whose intent is opaque without significant time investment from the reader is an `issue` or `nit` depending on how central the function is to the codebase.
- **Poor naming** — variables, functions, classes, or modules whose names do not reflect their purpose or that conflict with conventions visible elsewhere in the surrounding code are `nit` or `issue` depending on whether the misleading name affects downstream callers.
- **Tangled structure** — a long function that should have been decomposed, a class with too many responsibilities, or control flow that requires the reader to hold many branches in their head is an `issue`.
- **Code smells** — duplicated logic, dead code, commented-out blocks, magic numbers without named constants, deeply nested conditionals, premature abstraction — are `nit` to `issue` depending on extent and impact.

### Axis 2: Safety

Bug risks, edge cases, error handling, race conditions, security issues, resource leaks, undefined behavior.

- **Bug risks** — off-by-one errors, missing null checks, unhandled return values, incorrect ordering of operations, broken invariants — are `issue` or `blocker` depending on whether the bug is triggered by realistic inputs.
- **Edge cases** — empty inputs, boundary values, error paths, concurrent access, partial failure modes — that the code does not handle are `issue` or `blocker` depending on whether the edge case is reachable in production.
- **Error handling** — silently swallowed exceptions, errors logged but not propagated, error messages that lose context, panics in code that should return errors — are `issue` or `blocker` depending on the operational consequence.
- **Race conditions** — shared mutable state without synchronization, time-of-check-to-time-of-use bugs, ordering assumptions that the runtime does not guarantee — are typically `blocker` because they manifest non-deterministically in production.
- **Security issues** — input validation gaps, injection vectors (SQL / shell / HTML / path), secrets in code or logs, authorization checks bypassable by direct API access, cryptographic missteps, deserialization risks — are typically `blocker`.
- **Resource leaks** — file handles, network sockets, database connections, mutex locks, memory — not released on all paths are `issue` or `blocker` depending on whether the leak compounds.

### Axis 3: Idioms

Language and framework idioms; project conventions if observable from surrounding code.

- **Non-idiomatic language usage** — code that ignores standard library helpers in favor of hand-rolled equivalents, control flow that fights the language's intended grain, type system misuse — is a `nit` or `issue` depending on whether the deviation affects readability or correctness.
- **Non-idiomatic framework usage** — bypassing the framework's intended extension points, manually doing what the framework provides as a feature, fighting the framework's lifecycle — is an `issue` because future maintainers expecting the framework's grain will be surprised.
- **Project convention violations** — when the surrounding code reveals a clear convention (naming, layout, error type, logging interface) and the new code does not honor it without a stated reason, the violation is a `nit` or `issue` depending on how widely the convention is followed.
- **API ergonomics** — newly added public functions, methods, or types whose signatures fight the language's grain or surprise callers (e.g., booleans where an enum would be clearer, positional parameters that should be named) are `nit` or `issue`.

### Axis 4: Testability

Test coverage, test quality, edge cases tested, integration vs unit balance.

- **Untestable code** — code that is hard to test because of tight coupling to globals, hidden side effects, hard-to-mock dependencies, or non-deterministic behavior — is an `issue` (the cost of testing compounds; the code becomes a maintenance hazard).
- **Missing tests for new behavior** — observable new behavior introduced by the diff without a test covering it is a `nit` or `issue` depending on the project's test convention (a project with strong test coverage culture takes this as a stronger signal). When the change is doc-only, comment-only, or trivially refactor-only, this finding does NOT apply.
- **Weak tests** — tests that assert on incidental output, tests that mock so heavily they cannot fail, tests with no failure mode the code under test could produce — are `nit` or `issue`.
- **Integration vs unit balance** — a tower of mocked unit tests where one integration test would catch real failures, or one giant integration test where a few targeted unit tests would localize failures — is a `nit` to `issue` depending on the project's testing philosophy if observable.

### Optional additional axes

Executor MAY add other general-purpose axes when warranted by the code under review:

- **Performance characteristics** — algorithmic complexity, hot-path allocations, unnecessary database round-trips, missing indexes, N+1 query patterns.
- **Dependency hygiene** — new third-party dependencies added; license / supply-chain implications; version pinning; transitive footprint.
- **API design** — newly added public surface that downstream callers will depend on; backwards-compatibility implications; breaking-change risk.
- **Accessibility** — UI code that does not honor a11y conventions (labels, focus management, contrast, semantic markup).
- **Documentation drift** — public API changes whose docstrings, README, or external references were not updated alongside the code.

These additional axes are NOT mandatory. The four primary axes (quality / safety / idioms / testability) are the V1 standard for `review-code-*`; everything else is review territory the executor uses judgment to include or omit.

### What this skill does NOT review

This skill does NOT check "does the code implement what was intended" — that is the code-vs-original-intent fidelity question owned by `skills/review-implementation-auto/SKILL.md` and `skills/review-implementation-interactive/SKILL.md`. This skill's findings are about code QUALITY, not code FIDELITY. **If the user has a source artifact (spec / proposal / plan / GitHub issue / Inbox item) AND wants to check whether the code delivers what the source promised, redirect them to `review-implementation-*` instead.** That redirection should also surface in `## Next Actions` when this skill's review surfaces concerns that would benefit from a fidelity check (e.g., the code looks fine on its own merits, but the user mentioned a spec — the next step is `review-implementation-*` against that spec).

This skill ALSO does NOT review the upstream proposal, spec, or plan that may have driven the code. Those reviews live in `skills/review-proposal-auto/SKILL.md`, `skills/review-spec-auto/SKILL.md`, and `skills/review-plan-auto/SKILL.md` respectively. If review findings trace back to upstream artifact ambiguity (the code looks reasonable but the surrounding context suggests the upstream artifact was vague), surface that in `## Next Actions` with a pointer to the appropriate upstream review skill.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized findings-first per V1 review-family policy. The body MUST cover the following six sections in this order:

1. **`## Verdict`** — overall judgment on the code under review against the general-purpose axes. Suggested vocabulary (executor MAY refine): `solid` (the code passes the review on its own merits; no blockers, issues at most), `mixed` (some findings need addressing; specify which axis), `weak` (one or more axes is substantially deficient; the code needs revision before it is ready to merge or land). One overall verdict plus a one-line tether to the highest-impact finding below.
2. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit`). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which axis it concerns (quality / safety / idioms / testability — or one of the optional axes if used), (b) what is wrong (specific code smell, specific bug risk, specific idiom violation, specific testability concern), (c) why it matters for whoever picks up the code next (the next reader, the next maintainer, the next caller, the next operator).
3. **`## Evidence`** — for each finding above, cite the file:line in the code under review. Reference, do not recite — quoting the entire function or the entire file back is noise. Cite by file path plus line numbers; for diffs, cite the diff hunk header plus line numbers.
4. **`## References`** — list every artifact the review reads or depends on: the code reference (absolute path to a file, directory, or saved diff file, OR commit SHA / range / branch name with the repo identifier), any related decision logs by absolute path plus `D<N>` for specific operative decisions (especially when idiom findings trace back to settled project conventions), any prior review-findings on the same code (also by absolute path). External documentation the reviewer consulted (language docs, framework docs, project README) may also be cited here when load-bearing.
5. **`## Open Questions`** — clarifications worth confirming with the code author, the surrounding maintainers, or downstream operators. Frame as questions, not as gaps to autofill. If a finding's severity depends on context the reviewer could not infer (e.g., "is this hot path actually hot?", "is this endpoint reachable from untrusted input?"), surface as an Open Question rather than guessing at the severity.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: re-implement via one of the `implement-*` skills to address `blocker` findings, escalate to `skills/review-implementation-auto/SKILL.md` / `skills/review-implementation-interactive/SKILL.md` when the user has a source artifact and wants a fidelity check, escalate to `skills/review-spec-*` / `skills/review-proposal-*` / `skills/review-plan-*` when findings trace back to upstream artifact ambiguity, open a discussion via `skills/discussion/SKILL.md` to settle a specific design question the review surfaced, or merge / land the code if the verdict is `solid`. One action per finding cluster; do not pad.

The six section headings are the V1 standard for the findings-first report shape per the V1 review-family CONTEXT (established in Plan 06-01). Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. Do NOT collapse two sections into one; the explicit separation lets a downstream reader (or the interactive sibling resuming the same review topic) scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one code reference; emitting one file per finding would clutter `inbox/open/` and break the "one record per review run" V1 review-family convention.

## Output Artifact

Write the review artifact to:

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

per the V1 record-form grammar at `docs/workflow/v1/filename-grammar.md` and the inbox routing rule at `docs/workflow/v1/thread-layout.md`. The `review-finding` artifact-type token is MANDATORY — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form (`v<N>`) because reviews are records, not versioned artifacts.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<code-reference-summary>-code-review` (capturing what was reviewed — e.g., `auth-module-code-review`, `pr-42-code-review`, `caching-layer-code-review`) or a phrase capturing the highest-impact finding. The slug is part of the filename and is not user-confirmed in auto mode; the code-reference summary is treated as authoritative.
- The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation"). Do not pre-create empty folders.

Example filename:

```text
260521101212Z-auth-module-code-review-finding.md
```

For the full record-form grammar and the recognized V1 artifact-type list (which includes `review-finding` alongside `proposal`, `spec`, `plan`, `discussion`, `decision-log`, `inbox-item`), see `docs/workflow/v1/filename-grammar.md`.

The artifact lives in `inbox/open/` rather than `reviews/` — per `docs/workflow/v1/thread-layout.md`, V1 explicitly excludes a top-level `reviews/` folder; review findings ARE inbox items, and the inbox open/processed/dropped status is reflected by folder, not by frontmatter. Once a finding has been addressed (typically by emitting a new implementation cycle via one of the `implement-*` skills), the review-finding is moved from `inbox/open/` to `inbox/processed/` — that lifecycle is manual in V1 and out of scope for this skill.

### Thread resolution

If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

If NO thread exists, OR if the code under review has no natural thread context (a one-off code review independent of any thread), the skill MAY do one of the following at executor discretion: (a) ASK the user to confirm where to write the review (typically a fresh thread root the user names), (b) auto-create a thread when the code reference's slug is obvious enough to derive a thread name (e.g., reviewing `src/auth/` suggests an `auth-code-review` thread slug). Prefer to write the artifact to a thread; treat the no-thread case as a prompt for the user, not a silent fall-through.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp. If no thread exists, see the no-thread fallback under `## Output Artifact` — ASK the user where to write the review or auto-create a thread when the code reference's slug is obvious.

2. **Resolve the code reference.** Detect the code reference from the user's invocation. Accepted forms are a git ref (commit SHA, branch name, tag, or commit range), a path to a saved diff file, an inline diff body, a file path, or a directory path. If the reference is unsupplied, vague ("review my changes", "the recent stuff"), or matches multiple plausible candidates (two competing feature branches, a file path that resolves to multiple files under different folders, a directory path that does not exist as written), ASK the user which is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). Do not pick by recency, by sort order, or by ref order.

3. **Capture any user-provided focus areas.** If the user named specific concerns ("look for race conditions", "review the new caching layer", "check for missing error handling"), record them for emphasis during the review. If the user provided no focus, run the default general-purpose pass across all axes. Do NOT block on missing focus — this skill performs general-purpose code review without ANY required input beyond the code reference itself.

4. **Read the code reference READ-ONLY.** Per `docs/workflow/v1/immutability.md`, this skill READS the code but does NOT edit it, does NOT rewrite it, does NOT modify source code, and does NOT mutate any git state — no `git checkout`, no `git reset`, no `git stash`, no `git rebase`. The review is read-only against the code text. DO NOT check out the branch and run it. DO NOT modify the working tree. DO NOT run tests against the code. Code modifications belong to the `implement-*` skill family (Phase 5) on a fresh invocation; this skill never crosses into implementation territory.

5. **Inspect the code: walk it once end-to-end before noting findings.** Read every file (for a directory or commit range) or every hunk (for a diff). Build a picture of what the code does and what the surrounding code expects before tagging findings. A premature finding from a partial read is a worse signal than a slower review that walks the code first.

6. **Run the four general-purpose review axes in order from `## What This Skill Reviews`.** Apply each axis: quality → safety → idioms → testability. For each candidate finding, tag the axis and assign a severity (`blocker` / `issue` / `nit`). If the user supplied focus areas, emphasize findings that fall under those areas. Add optional additional-axis findings (performance / dependency / API design / accessibility / documentation drift) when warranted by the code under review. Cluster related findings rather than fragmenting into many small bullets.

7. **Draft the findings-first report.** Compose the six sections in order: `## Verdict` → `## Findings` → `## Evidence` → `## References` → `## Open Questions` → `## Next Actions`. Skip a section entirely if it has nothing real to add. Order findings within `## Findings` by impact (severity first, then by axis sequence, then by location in the code). Each finding's `## Evidence` cites file:line in the code under review.

8. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

9. **Write the review artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. The `review-finding` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md`. The review body is plain markdown — no YAML frontmatter on the review artifact itself.

10. **Confirm.** Tell the user: `Review written: <relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review-finding artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session (per `docs/workflow/v1/immutability.md`, "Drafts Are Editable") but are never committed by this skill.

This skill ALSO does not modify the code under review. Code modifications are an `implement-*` skill's job per the Phase 5 contract. If the review surfaces findings that require code changes, surface them in `## Next Actions` with a pointer to one of the `implement-*` skills (typically `skills/implement-auto/SKILL.md` for less-structured-input re-implementation, or `skills/implement-plan-auto/SKILL.md` when the fix has been formalized into a plan) — let the surrounding session invoke the implement skill separately on a fresh invocation.

## Immutability

Emitted review-finding artifacts are immutable per `docs/workflow/v1/immutability.md`. Once the file is written into `inbox/open/`, it is part of the thread's reviewable history and is NOT edited. A typo discovered in an emitted review-finding means writing a NEW review-finding record (new UTC stamp, new kebab-desc) — not an in-place edit. A revision to a review-finding is a NEW review-finding artifact, not an in-place edit.

The code under review is READ-ONLY for this skill. This skill does NOT modify source code, does NOT check out branches, does NOT mutate git state, and does NOT run tests against the code. Code modifications are an `implement-*` skill's job per Phase 5; this skill's role is review only. If the review surfaces findings that require code changes, the surrounding session invokes the appropriate `implement-*` skill on a fresh invocation — this skill never crosses into implementation territory. See `docs/workflow/v1/immutability.md` for the full V1 immutability contract.

No source-relation YAML frontmatter is added to the review body — lineage between a review-finding and the code it reviews lives in the `## References` section (by absolute path for files / directories / saved diff files, by commit SHA / range / branch name with the repo identifier for git refs), not in metadata on the file. Per `docs/workflow/v1/immutability.md`, the accepted trade-off is that the filename alone cannot tell you which code reference a review reviewed — that mapping is recovered from the body's references section.
