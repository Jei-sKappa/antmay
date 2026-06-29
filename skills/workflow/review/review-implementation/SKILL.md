---
name: review-implementation
description: Verify an implementation against its spec's acceptance criteria and
  write a references-first review record capturing acceptance, constraint,
  scope, behavior, and test-coverage findings; use when an implementation needs
  to be checked against the spec it was meant to deliver.
metadata:
  author: https://github.com/Jei-sKappa
  version: 3.0.0
---

# Review Implementation

Read an implementation reference READ-ONLY (a git ref, a diff, or a commit range) ALONGSIDE the **spec it was supposed to deliver** and emit a references-first review record to the active thread's `implementation/reviews/` folder. This skill reads both inputs, maps each of the spec's acceptance criteria to the matching diff hunks, runs the five fidelity axes against the pair, drafts the report end-to-end, and writes one record per review run. By default it runs end-to-end without walking findings with the user one at a time, but it honors an invocation that asks it to check in or walk the findings interactively; it does not commit.

## What This Review Verifies — the Spec's Acceptance Criteria, Not the Plan

The implementation is checked against the **spec's acceptance criteria — the contract — NOT against the plan.** The plan is a disposable compiler-IR that the human never needs to read; the spec plus its acceptance criteria are the audited artifact. The human may review the implementation, but they never need to review the plan. So every finding traces back to one question: **"does the implementation deliver what the spec's acceptance criteria promised?"** A finding tethered to the plan rather than the spec is the wrong contract — re-anchor it to the spec's acceptance criteria or cut it.

If the implementation was produced from a plan, the plan is at most a navigational aid for locating which diff hunks map to which acceptance criterion. It is never the bar. Where the plan and the spec diverge, the spec wins — the divergence is a plan fault that the plan adherence review owns, not a finding this skill should raise against the implementation.

## Inputs

This skill requires TWO inputs. Both are mandatory.

### Input 1: An implementation reference

The implementation reference is the code output being reviewed. Accepted forms:

1. **A git ref** — a commit SHA (full or short), a branch name, or a tag. Example: `abc1234`, `feature/auth-rollout`, `v1.2.0`.
2. **A commit range** — `main..feature-branch`, `HEAD~5..HEAD`, `<base-sha>..<head-sha>`. The range identifies the set of commits constituting the implementation under review.
3. **A diff text** — a unified diff passed inline or via a path to a saved `.diff` / `.patch` file. Useful when the implementation has not yet been committed to a branch this skill can resolve, or when the diff was exported for review separately.

The implementation reference is READ-ONLY. This skill does NOT check out a branch, does NOT run tests, does NOT modify the working tree, and does NOT mutate any git state. The review is read-only against the diff.

### Input 2: The spec

The spec is the contract the implementation was supposed to deliver. A spec lives at `specs/NNN[-<desc>]/spec.md` inside the thread root; the path may be passed thread-relative or repo-relative. The spec's acceptance criteria (and intended outcomes, scope, expected behavior, constraints) drive the fidelity axes — every acceptance criterion should have a corresponding change in the diff; every constraint should be honored; every expected behavior should be visible.

The implementation report (a record under `implementation/`) may also be supplied as additional context — it captures the implementer's own account of deviations, surprises, and follow-ups. It is context, not the contract: read it to understand what the implementer did, but judge the result against the spec's acceptance criteria, never against the report's self-assessment.

### Ambiguity fallback

If EITHER input is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. There is no global "latest implementation" or "latest spec" algorithm. Do not pick by recency, by `NNN`, or by sort order — silently picking hides a real decision behind a sort order. Each spec lineage holds exactly one alive `spec.md` whose version lives in its frontmatter, so "which version" never arises; but if the thread holds multiple spec lineages (`specs/001-api/`, `specs/002-cli/`) and the user's reference is vague ("the spec"), ASK which lineage is intended. If the reference could point at a spec in another thread, ASK which thread. Two competing branches both named after the spec is the same kind of ambiguity on the implementation side — ASK.

The literal folder `specs/NNN[-<desc>]/` is the canonical location spec artifacts land in. If the supplied spec path is not a `spec.md` under a `specs/` lineage folder, refuse and ASK the user to confirm. If the thread genuinely holds no spec to verify against, point the user at a general-purpose code review instead — the fidelity axes have no contract to check the implementation against without a spec.

## What This Skill Reviews

This skill runs **five implementation-vs-spec fidelity axes**. The check question is "does the implementation deliver what the spec's acceptance criteria said it would?". Findings tether to that question; findings that drift into general-purpose code review (style, idioms, regression risk independent of the spec) are outside this skill's scope and should be surfaced as escalation suggestions under `## Next Actions`.

### Axis 1: Acceptance-criteria coverage

Does every one of the spec's acceptance criteria (and intended outcomes) have a corresponding change in the diff?

- **Total gap** — an acceptance criterion that no diff hunk addresses is a `blocker` (the implementation has not delivered what the spec promised; the contract is unmet).
- **Partial gap** — an acceptance criterion that the diff covers partially (e.g., the spec says "add endpoint X that returns Y and persists Z" and the diff adds endpoint X with return Y but omits the persistence) is an `issue` or `blocker` depending on whether the missing piece is integral to the criterion.
- **Misaligned coverage** — the diff implements something that LOOKS like the acceptance criterion but operates differently (e.g., the spec says "return a JSON object with fields A/B/C" and the diff returns a list of those values) is an `issue`.

Map each acceptance criterion to the diff hunk(s) that satisfy it. An acceptance criterion with no corresponding diff hunk is a coverage gap.

### Axis 2: Constraint adherence

Does the implementation respect the spec's constraints? Constraints are the spec's "must not" / "must use" / "must avoid" / "tech-stack" / "API contract" / "safety" / "repo layout" statements.

- **Tech-stack violation** — the spec says "use library X" and the diff uses library Y instead is an `issue` or `blocker` depending on whether the substitution is benign (functionally equivalent) or substantive (different API surface, different operational characteristics).
- **API contract violation** — the spec says "the endpoint returns X with shape Y" and the diff returns X with shape Z is a `blocker` (downstream callers will break).
- **Safety constraint violation** — the spec says "must not log secret values" and the diff logs them is a `blocker`.
- **Repo-layout violation** — the spec says "place this module at `src/foo/`" and the diff places it at `src/bar/` is an `issue` (future readers will not find it where the spec said it would land).

Before flagging a choice as a deviation, check the spec's **Degrees of freedom** section: a choice the spec explicitly left to the implementer's discretion is NOT a constraint violation — it is the implementer exercising granted freedom, and it must never be flagged as drift.

### Axis 3: Scope adherence

Is the implementation INSIDE the spec's stated scope? Out-of-scope changes — scope drift — are findings even when they look like improvements.

- **Scope drift** — the diff modifies files or behavior the spec did not call for is an `issue` (the implementer added work the spec did not require; the review session needs to evaluate whether the addition is wanted).
- **Out-of-scope refactor** — the diff refactors code the spec did not say to touch is an `issue`. A refactor done in service of the spec's actual work (e.g., extracting a helper to make the spec's behavior implementable) is in-scope; a refactor done because the implementer "thought it would be cleaner" is out-of-scope.
- **Scope expansion** — the diff implements a feature the spec named only as a possibility or explicitly placed out of scope is an `issue`. The cheap moment to surface this is the review; the diff has not yet been merged or released.

### Axis 4: Behavior fidelity

Does the implementation exhibit the expected behaviors the spec named? Missing behaviors are findings; unexpected new behaviors are findings.

- **Missing behavior** — the spec says "the system should do X" and the diff does not implement X is a `blocker`.
- **Different behavior** — the spec says "the system should do X" and the diff implements something that LOOKS LIKE X but operates differently (different inputs, different outputs, different side effects, different error handling) is an `issue` or `blocker` depending on whether downstream callers / users would notice.
- **Unexpected new behavior** — the diff introduces a behavior the spec did not call for (e.g., the spec says "add logging to module M" and the diff adds logging plus a new metric collection path) is an `issue` (the spec did not call for the metric path; even if useful, it should be a separate decision).
- **Error-handling drift** — the spec says "on failure, return a 4xx with reason X" and the diff returns a 5xx or swallows the failure is an `issue` or `blocker` depending on the spec's stated severity.

### Axis 5: Test coverage

Does the implementation add tests (or update existing tests) consistent with the spec's acceptance criteria? Test coverage is a fidelity axis when the spec's acceptance criteria name testable behavior — most do.

- **Missing tests for new behavior** — the diff introduces a behavior the spec's acceptance criteria named, but no test covers that behavior, is an `issue` (the acceptance criterion is observable per the project's test convention, and the diff did not record the observation).
- **Tests do not exercise the spec's acceptance criteria** — the diff added tests, but they cover incidental behavior rather than the behavior the spec promised, is an `issue` (the test suite carries less assurance than the test count suggests).
- **No-test-required acceptance** — when the spec's acceptance criteria describe doc-only or configuration-only outcomes, or a refactor explicitly not affecting observable behavior, the test-coverage axis may be SKIPPED with a note under `## Open Questions`. Do not flag missing tests when the spec did not call for testable behavior.

This skill does NOT promise general-purpose code review independent of the spec. If the spec is unavailable or the user wants source-independent code review (style, idioms, safety, testability beyond what the spec's acceptance criteria named, regression risk), escalate under `## Next Actions` rather than performing the heavier general-purpose check inline.

## Review Record Shape — References-First

The emitted review artifact is ONE record per review run, organized **references-first**. The body MUST cover the following six sections in this order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`.

1. **`## References`** — FIRST, before any verdict. List every artifact the review reads or depends on, naming the implementation under review AND the spec it is judged against at the top. One entry per line as `- <description>: <path>`; each path carries a description, never a bare path list. Within-thread paths are **thread-relative** (e.g. `specs/001/spec.md`, `implementation/<UTC>-<desc>-implementation-report.md`); cross-thread paths are **repo-relative** (e.g. `docs/threads/<other>/...`); **never absolute**. The implementation reference is named by commit SHA / range / branch name with the repo identifier, or by repo-relative path to a saved diff file. Include the spec path, the implementation report if one was read, any decision logs the finding traces to, and any prior reviews on the same implementation.
2. **`## Verdict`** — overall judgment on the implementation against the spec's acceptance criteria. Suggested vocabulary (executor MAY refine): `delivers` (the implementation matches the spec's contract; no blockers, issues at most), `partially delivers` (some findings need addressing; specify which axis), `does not deliver` (one or more axes is substantially unmet; the implementation needs revision before the spec's contract is satisfied). One overall verdict plus a one-line tether to the highest-impact finding below.
3. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit`). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which of the five axes it concerns (acceptance-criteria coverage / constraint adherence / scope adherence / behavior fidelity / test coverage), (b) what is wrong (gap / drift / violation / etc.), (c) why it matters for whoever picks up the implementation next (the next reviewer, the next implementer for a fix, or the user merging the change).
4. **`## Evidence`** — for each finding above, cite BOTH the file:line in the diff AND the spec section (by section heading or acceptance-criterion identifier). The two-citation requirement is the implementation-review-specific shape — a fidelity finding without both citations is unverifiable. Reference, do not recite — quoting the entire diff hunk or the entire spec section is noise.
5. **`## Open Questions`** — clarifications worth confirming with the implementer, the spec owner, or the downstream reader. Frame as questions, not as gaps to autofill. If the test-coverage axis was SKIPPED (e.g., doc-only acceptance), this section EXPLICITLY notes the skip.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: re-implement to address `blocker` findings, escalate to a general-purpose code review tool for findings outside the five fidelity axes, route a spec-fault finding back to the human if a finding traces to spec ambiguity (the spec is fixed via an owner-approved, record-backed amendment — never an edit this skill makes), open a discussion to settle a specific design question the implementation surfaced, or merge / land the implementation if the verdict is `delivers`. One action per finding cluster; do not pad.

Skip a downstream section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. Never skip `## References` (the implementation and spec are always named). Do NOT collapse two sections into one; the explicit separation lets a downstream reader scan each layer independently. Multiple findings live in ONE file — one record per review run.

## Output Artifact

A review is a **record** that nests inside the implementation it serves. Write it to the flat `implementation/reviews/` folder:

```text
implementation/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

`implementation/` is a flat, records-only spine node: the implementation report and its `discussions/` and `reviews/` live directly inside it — there are no lineage folders under `implementation/`. Both implementation reviews and code reviews land in `implementation/reviews/`.

The filename rules:

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<spec-slug>-implementation-review` or `<commit-sha-short>-vs-<spec-slug>-review`.
- The `review` artifact-type token is MANDATORY — no other suffix is permitted. The artifact MUST NOT use a versioned form (`v<N>`) and carries no `version` — reviews are records, not versioned artifacts.
- The `implementation/reviews/` folder is created on-demand if it does not exist. Do not pre-create empty folders.

Example path:

```text
implementation/reviews/260521101212Z-auth-rollout-implementation-review.md
```

There is **no open/processed/dropped lifecycle and NO folder move** to express status. A review's disposition is not expressed by where it lives — it lives in the review's own frontmatter.

### Disposition Frontmatter

A review records its own disposition in its YAML frontmatter, under a `status:` map. **This skill emits the review with NO `status.disposed` field** — a review with no `status.disposed` is **open, mechanically, by parse**. The absence of the latch is the open state; there is no separate "open" marker to set.

When the review is later acted on, its disposition is recorded directly in this same frontmatter, set once:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>   # optional
```

- **Accept-and-revise** sets the frontmatter directly — for an implementation finding, the **fix in a fresh implementation pass is the record**; no separate disposing document is written.
- **Reject** sets the frontmatter with **no document at all** — no separate disposing record is required.
- The optional `rationale` is a thread-relative path to a discussion, if one happened. A discussion never owns the disposition — the frontmatter does.
- Disposition is **set-once**: changing your mind is a new review or a thread reopen, not a frontmatter flip-flop.

This skill only EMITS the review (open, no `status.disposed`). Disposing it is a downstream act, out of scope for this skill. The only frontmatter a review carries is its lifecycle `status:` map (and only once disposed); lineage between the review, the implementation reference, and the spec lives in the `## References` section, not in metadata.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the implementation reference.** Detect the implementation reference from the user's invocation (git ref / commit range / branch / saved diff path / inline diff body). If the reference is unsupplied, vague ("the diff", "what I just did", "the feature branch" with no name), or matches multiple plausible candidates (two competing feature branches), ASK the user which is intended. Do not pick by recency or by ref order.

3. **Resolve the spec.** Detect the spec path from the user's invocation. The spec lives at `specs/NNN[-<desc>]/spec.md`. If unsupplied, vague, or the thread holds multiple spec lineages, ASK which lineage is intended. Do not pick by recency or `NNN`. The spec is MANDATORY — without it, the fidelity axes have nothing to check against, and the user should be directed to a general-purpose code review instead. Optionally read the implementation report under `implementation/` for context.

4. **Read the spec READ-ONLY.** The spec is the contract — this skill reads it but does NOT edit it, does NOT rewrite it, does NOT add or change frontmatter, and does NOT propose edits to the spec body. Read the spec's `## Degrees of freedom` section carefully — a choice the spec granted is never a deviation. Findings that trace to spec ambiguity (the implementation could not have resolved an ambiguity without inventing details) are surfaced under `## Next Actions` with the recommendation to amend the spec through an owner-approved, record-backed amendment — never an instruction to edit the spec in place.

5. **Inspect the implementation reference READ-ONLY.** Read the diff (`git diff <range>` or read the saved diff file). DO NOT check out the branch and run it. DO NOT modify the working tree. DO NOT run tests against the implementation. DO NOT mutate any git state — no `git checkout`, no `git reset`, no `git stash`, no `git rebase`. The review is read-only against the diff text.

6. **Map the spec's acceptance criteria to diff hunks.** For each acceptance criterion, intended outcome, expected behavior, and constraint in the spec, locate the matching change(s) in the diff. Note coverage gaps (acceptance criteria with no matching diff hunk) — these become candidate findings under Axis 1.

7. **Run the five fidelity axes in order.** Apply each axis: acceptance-criteria coverage → constraint adherence → scope adherence → behavior fidelity → test coverage. Tether every finding to "what does the spec's acceptance criteria promise that the implementation either misses, misimplements, exceeds, or fails to test for?". Honor the spec's Degrees-of-freedom section — a granted choice is never a deviation.

8. **Draft the references-first report.** Compose the six sections in order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`. Skip a downstream section entirely if it has nothing real to add; never skip `## References`. Order findings within `## Findings` by impact (severity first, then by axis sequence, then by location in the diff). Each finding's `## Evidence` cites BOTH the diff (file:line) AND the spec section.

9. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

10. **Write the review record.** Create `implementation/reviews/<UTC>-<kebab-desc>-review.md`. The `review` artifact-type token is MANDATORY. Emit with NO `status.disposed` field (open by parse). The `implementation/reviews/` folder is created on-demand.

11. **Confirm.** Tell the user: `Review written: <thread-relative path>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review record. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under the thread's `.wip/` folder — drafts are editable during the session but are never committed by this skill.

This skill ALSO does not modify the implementation under review. Code modifications belong in a separate implementation pass. If the review surfaces findings that require code changes, surface them in `## Next Actions` — let the surrounding session handle implementation separately.

## Immutability

A review is a record. Its **body is frozen at emission** — once written into `implementation/reviews/`, the body is part of the thread's reviewable history and is NOT rewritten. A typo discovered in an emitted review's body means writing a NEW review record (new UTC stamp, new kebab-desc), not an in-place body edit. The review's **frontmatter `status:` map is a live surface** until the review is disposed: `status.disposed` / `status.disposition` / optional `status.rationale` may be set once when the review is acted on (this skill does not set them — it emits the review open). Once `status.disposed` is set, the frontmatter freezes too.

The spec under review is reviewed READ-ONLY by this skill. Spec-fault findings are surfaced under `## Next Actions` as items the human must address by an owner-approved, record-backed spec amendment — never an edit this skill makes to the spec.

The implementation reference is ALSO READ-ONLY for this skill. This skill does NOT modify source code, does NOT check out branches, does NOT mutate git state, and does NOT run tests against the implementation. If the review surfaces findings that require code changes, the surrounding session handles them in a fresh implementation pass — this skill never crosses into implementation territory.

No source-relation or lineage frontmatter (`Supersedes:`, `Forked from:`, etc.) is added — lineage between the review, the implementation reference, and the spec lives in the `## References` section, not in metadata.
