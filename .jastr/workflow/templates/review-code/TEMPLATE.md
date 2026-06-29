---
targets:
  agent-skill:
    frontmatter:
      name: review-code
      description: Read a code reference and write a references-first code-quality review report covering quality, safety, idioms, and testability, anchored to the spec's acceptance criteria as the definition of right; use when code needs a quality review on its own merits.
      metadata:
        author: https://github.com/Jei-sKappa
        version: 3.0.0
inputs:
  open-by-parse-trailer:
    type: string
    required: false
    default: '**open, mechanically, by parse**. The absence of the latch is the open state; there is no separate "open" marker to set.'
  disposition-record:
    type: string
    required: false
    default: for a code-quality finding, the **fix in a fresh implementation pass is the record**
  rationale-bullet:
    type: string
    required: false
    default: The optional `rationale` is a thread-relative path to a discussion, if one happened. A discussion never owns the disposition — the frontmatter does.
  disposed-state:
    type: string
    required: false
    default: 'no'
  has-disposing-aside:
    type: boolean
    required: false
    default: false
  disposing-aside:
    type: string
    required: false
    default: ' — DISPOSING-ASIDE-PLACEHOLDER —'
  has-frontmatter-lineage-tail:
    type: boolean
    required: false
    default: true
  frontmatter-lineage-tail:
    type: string
    required: false
    default: ' The only frontmatter a review carries is its lifecycle `status:` map (and only once disposed).'
---
# Review Code

Read a CODE REFERENCE READ-ONLY and emit a references-first review report to the active thread's `implementation/reviews/` folder. This skill runs end-to-end: it reads the code, drafts the report, and writes one record per review run. By default it runs end-to-end without walking findings with the user one at a time, but it honors an invocation that asks it to check in or walk the findings interactively; it does not commit anything.

This is the CODE-QUALITY pass — it evaluates the code on its own merits: quality, safety, idioms, and testability. It is the complement to the implementation-fidelity review: that review asks "does the implementation deliver what the spec's acceptance criteria promised?"; this review asks "is the code any good?". The two stay distinct, but they share one anchor.

## Anchor "Right" to the Spec's Acceptance Criteria, Not the Plan

When a spec is available, this code review anchors its sense of "right" to the **spec's acceptance criteria — the contract — NOT to the plan.** The plan is a disposable compiler-IR the human never needs to read; the spec plus its acceptance criteria are the audited artifact, the definition of what the code is supposed to do. So when a code-quality finding turns on what the code is *for* — whether an error path matters, whether an edge case is reachable, whether a behavior is the intended one — judge it against the spec's acceptance criteria, never against the plan. Where the code and the spec's acceptance criteria diverge in a way that is a *fidelity* gap (the code does not deliver what the spec promised) rather than a *quality* gap, that is the implementation-fidelity review's territory — flag it under `## Next Actions` and keep this review on quality.

If no spec is available, this review runs as a pure general-purpose code-quality pass on the code's own merits, and `## Next Actions` notes that no spec was on hand to anchor "right".

## Inputs

This skill accepts ONE required input: a CODE REFERENCE. Accepted forms:

1. **A git ref** — a commit SHA (full or short), a branch name, a tag, or a commit range. Examples: `abc1234`, `feature/auth-rollout`, `v1.2.0`, `main..feature-branch`, `HEAD~5..HEAD`.
2. **A diff** — a unified diff passed inline or via a path to a saved `.diff` / `.patch` file.
3. **A file path** — a single file under review (absolute or relative to the repo root).
4. **A directory path** — a directory under review (absolute or relative to the repo root).

The code reference is READ-ONLY. This skill does NOT check out a branch, does NOT run tests, does NOT modify the working tree, and does NOT mutate any git state.

**The skill MAY accept the spec as ADDITIONAL input** to anchor "right" (a `spec.md` under `specs/NNN[-<desc>]/`), and MAY accept freeform user concerns or focus areas — but does NOT block on the absence of either. Examples of focus: "look for race conditions in the new caching layer", "check for missing error handling in the auth endpoints". If a spec is supplied, anchor "right" to its acceptance criteria; if focus areas are supplied, emphasize those areas. If neither, run the default general-purpose pass across all axes.

### Ambiguity fallback

If the code reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. Do not pick by recency or by sort order. Examples of ambiguity that warrant asking: "review my changes" without naming a branch or file, a file path that resolves to multiple files, a directory path that does not exist as written. If a spec is offered for anchoring and the thread holds multiple spec lineages, ASK which lineage is meant — do not pick by `NNN`.

## What This Skill Reviews

This skill runs four code-quality review axes. Each axis carries severity heuristics tethered to downstream impact.

### Axis 1: Quality

Readability, maintainability, naming, structure, code smells, dead code, duplication.

- **Unreadable code** — a function whose intent is opaque without significant time investment is an `issue` or `nit` depending on how central the function is.
- **Poor naming** — variables, functions, classes, or modules whose names do not reflect their purpose or conflict with visible conventions are `nit` or `issue` depending on whether the misleading name affects downstream callers.
- **Tangled structure** — a long function that should have been decomposed, a class with too many responsibilities, or control flow that requires holding many branches in mind is an `issue`.
- **Code smells** — duplicated logic, dead code, commented-out blocks, magic numbers without named constants, deeply nested conditionals, premature abstraction — are `nit` to `issue` depending on extent and impact.

### Axis 2: Safety

Bug risks, edge cases, error handling, race conditions, security issues, resource leaks, undefined behavior.

- **Bug risks** — off-by-one errors, missing null checks, unhandled return values, incorrect ordering of operations, broken invariants — are `issue` or `blocker` depending on whether the bug is triggered by realistic inputs.
- **Edge cases** — empty inputs, boundary values, error paths, concurrent access, partial failure modes — that the code does not handle are `issue` or `blocker` depending on whether the edge case is reachable in production (and, when a spec is available, whether the spec's acceptance criteria named it).
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
- **Missing tests for new behavior** — observable new behavior introduced by the diff without a test covering it is a `nit` or `issue` depending on the project's test convention (and, when a spec is available, raised toward `issue` when the spec's acceptance criteria named that behavior). When the change is doc-only, comment-only, or trivially refactor-only, this finding does NOT apply.
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

This skill does NOT check "does the implementation deliver what the spec's acceptance criteria promised" — that is the implementation-fidelity question, and it belongs in a separate implementation-fidelity review. This review uses the spec's acceptance criteria only to anchor what "right" means for a quality finding; it does not perform the fidelity coverage pass. When this review surfaces concerns that would benefit from a fidelity check, say so under `## Next Actions`.

This skill also does NOT review the upstream spec, proposal, or plan that may have driven the code. If review findings trace back to spec ambiguity, surface that in `## Next Actions` with a pointer to the appropriate upstream review (the spec, fixed via an owner-approved, record-backed amendment — never an edit this skill makes).

## Review Record Shape — References-First

The emitted review artifact is ONE record per review run, organized **references-first**. The body MUST cover the following six sections in this order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`.

1. **`## References`** — FIRST, before any verdict. List every artifact the review reads or depends on, naming the code under review at the top (and the spec it anchored "right" to, if one was supplied). One entry per line as `- <description>: <path>`; each path carries a description, never a bare path list. Within-thread paths are **thread-relative** (e.g. `specs/001/spec.md`); cross-thread paths are **repo-relative** (e.g. `docs/threads/<other>/...`); **never absolute**. The code reference is named by commit SHA / range / branch name with the repo identifier, or by repo-relative path to a file / directory / saved diff file. Include any decision logs the finding traces to, any prior reviews on the same code, and any load-bearing external documentation consulted.
2. **`## Verdict`** — overall judgment on the code under review against the code-quality axes. Suggested vocabulary (executor MAY refine): `solid` (the code passes the review on its own merits; no blockers, issues at most), `mixed` (some findings need addressing; specify which axis), `weak` (one or more axes is substantially deficient; the code needs revision before it is ready to merge or land). One overall verdict plus a one-line tether to the highest-impact finding below.
3. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit`). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which axis it concerns, (b) what is wrong (specific code smell, bug risk, idiom violation, or testability concern), (c) why it matters for whoever picks up the code next.
4. **`## Evidence`** — for each finding above, cite the file:line in the code under review. Reference, do not recite — quoting entire functions is noise. Cite by file path plus line numbers; for diffs, cite the diff hunk header plus line numbers. When a finding turns on the spec's acceptance criteria, cite the spec section too.
5. **`## Open Questions`** — clarifications worth confirming with the code author, surrounding maintainers, or downstream operators. Frame as questions, not gaps to autofill. If a finding's severity depends on context the reviewer could not infer ("is this hot path actually hot?", "is this endpoint reachable from untrusted input?"), surface as an Open Question rather than guessing at the severity.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: re-implement to address `blocker` findings, run an implementation-fidelity review when the user wants to check the code delivers what the spec's acceptance criteria promised, escalate to an upstream review when findings trace back to spec ambiguity, open a discussion to settle a specific design question surfaced by the review, or merge / land the code if the verdict is `solid`. One action per finding cluster; do not pad.

Skip a downstream section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. Never skip `## References` (the code under review is always named). Do NOT collapse two sections into one; the explicit separation lets a downstream reader scan each layer independently. Multiple findings live in ONE file — one record per review run.

## Output Artifact

A review is a **record** that nests inside the implementation it serves. Write it to the flat `implementation/reviews/` folder:

```text
implementation/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

`implementation/` is a flat, records-only spine node: the implementation report and its `discussions/` and `reviews/` live directly inside it — there are no lineage folders under `implementation/`. Both code reviews and implementation reviews land in `implementation/reviews/`.

Filename rules:
- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time and never re-derived.
- `<kebab-desc>` is a short description of what this review is about — typically `<code-reference-summary>-code-review` (e.g., `auth-module-code-review`, `pr-42-code-review`, `caching-layer-code-review`) or a phrase capturing the highest-impact finding.
- The `review` artifact-type token is MANDATORY — no other suffix is permitted. The artifact MUST NOT use a versioned form (`v<N>`) and carries no `version` — reviews are records, not versioned artifacts.
- The `implementation/reviews/` folder is created on-demand if it does not exist. Do not pre-create empty folders.

Example path:

```text
implementation/reviews/260521101212Z-auth-module-code-review.md
```

There is **no open/processed/dropped lifecycle and NO folder move** to express status. A review's disposition is not expressed by where it lives — it lives in the review's own frontmatter. Lineage between the review and the code it reviews lives in the `## References` section, not in metadata.

### Thread resolution

If `cwd` already sits inside a thread root (`docs/threads/<YYMMDDHHMMSSZ-slug>/`), that is the active thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

If NO thread exists, or if the code under review has no natural thread context, either (a) ask the user to confirm where to write the review, or (b) auto-create a thread when the code reference's slug is obvious enough to derive a thread name (e.g., reviewing `src/auth/` suggests an `auth-code-review` thread slug). Prefer to write the artifact to a thread; treat the no-thread case as a prompt for the user, not a silent fall-through.

::include{root="group", path="partials/disposition-frontmatter.md"}

## Workflow

1. **Resolve the active thread.** Identify the thread root. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp. If no thread exists, see the no-thread fallback under `## Output Artifact`.

2. **Resolve the code reference.** Detect the code reference from the user's invocation. If the reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. Do not pick by recency, sort order, or ref order.

3. **Capture the spec (for anchoring) and any user-provided focus areas.** If a spec is supplied, read it READ-ONLY to anchor what "right" means; if the user named specific concerns, record them for emphasis. If neither is provided, run the default general-purpose pass across all axes. Do NOT block on missing spec or missing focus.

4. **Read the code reference READ-ONLY.** This skill READS the code but does NOT edit it, does NOT rewrite it, does NOT modify source code, and does NOT mutate any git state — no `git checkout`, no `git reset`, no `git stash`, no `git rebase`. Do NOT check out the branch and run it. Do NOT modify the working tree. Do NOT run tests against the code. Code modifications belong in a separate implementation pass; this skill never crosses into implementation territory.

5. **Inspect the code: walk it once end-to-end before noting findings.** Read every file (for a directory or commit range) or every hunk (for a diff). Build a picture of what the code does and what the surrounding code expects before tagging findings. A premature finding from a partial read is a worse signal than a slower review that walks the code first.

6. **Run the four code-quality review axes in order.** Apply each axis: quality → safety → idioms → testability. For each candidate finding, tag the axis and assign a severity (`blocker` / `issue` / `nit`). When a spec is available, anchor "right" to its acceptance criteria. If the user supplied focus areas, emphasize findings that fall under those areas. Add optional additional-axis findings when warranted. Cluster related findings rather than fragmenting into many small bullets.

7. **Draft the references-first report.** Compose the six sections in order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`. Skip a downstream section entirely if it has nothing real to add; never skip `## References`. Order findings within `## Findings` by impact (severity first, then by axis sequence, then by location in the code).

8. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

9. **Write the review record.** Create `implementation/reviews/<UTC>-<kebab-desc>-review.md`. The `review` artifact-type token is MANDATORY. Emit with NO `status.disposed` field (open by parse). The `implementation/reviews/` folder is created on-demand if it does not exist.

10. **Confirm.** Tell the user: `Review written: <thread-relative path>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review record. Writing the file is where the skill stops. Any commit is the surrounding session's decision. Do not stage, do not commit, do not push, do not branch.

This skill also does not modify the code under review. Code modifications belong in a separate implementation pass. If the review surfaces findings that require code changes, surface them in `## Next Actions` and let the surrounding session handle implementation separately on a fresh run.

## Immutability

A review is a record. Its **body is frozen at emission** — once written into `implementation/reviews/`, the body is part of the thread's reviewable history and is NOT rewritten. A typo discovered in an emitted review's body means writing a NEW review record (new UTC stamp, new kebab-desc), not an in-place body edit. The review's **frontmatter `status:` map is a live surface** until the review is disposed: `status.disposed` / `status.disposition` / optional `status.rationale` may be set once when the review is acted on (this skill does not set them — it emits the review open). Once `status.disposed` is set, the frontmatter freezes too.

The spec, when read for anchoring, is read READ-ONLY — this skill never edits it. Spec-fault findings are surfaced under `## Next Actions` as items the human addresses via an owner-approved, record-backed amendment.

Drafts under the thread's `.wip/` folder are editable during the session but are never committed by this skill.

No source-relation or lineage frontmatter (`Supersedes:`, `Forked from:`, etc.) is added — lineage between the review and the code reference lives in the `## References` section, not in metadata.
