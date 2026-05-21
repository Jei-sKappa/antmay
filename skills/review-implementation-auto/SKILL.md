---
name: review-implementation-auto
description: Read a V1 implementation reference (a git ref / diff / commit range — typically the output of one of the Phase 5 `implement-*` skills) PLUS the source artifact the implementation was supposed to deliver (spec / proposal / plan / GitHub issue / Inbox item — the 4–5 input forms accepted by Phase 5's `implement-*` skills) and write a findings-first review report to the active thread's `inbox/open/<UTC>-<kebab-desc>-review-finding.md` checking code-vs-original-intent fidelity per D85 — acceptance/outcome coverage, constraint adherence, scope adherence, behavior fidelity, and test coverage — end-to-end, with no clarifying questions and no per-finding chat walk. This skill covers V1 verification of implementations — there is no separate `verify-*` skill in V1. Use when you want a lightweight autonomous review of an implementation against its source artifact — not when you want to walk findings together one at a time (use `review-implementation-interactive` for that), and not when you want general-purpose code review independent of a source artifact (use `review-code-auto` / `review-code-interactive`) or when you want to review the upstream spec / proposal / plan (use `review-spec-*` / `review-proposal-*` / `review-plan-*`).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Implementation Auto

Read a V1 implementation artifact READ-ONLY (a git ref, a diff, or a commit range produced by one of the Phase 5 `implement-*` skills) ALONGSIDE the source artifact it was supposed to implement (a spec, a proposal, a plan, a GitHub issue, or an Inbox item) and emit a findings-first review report to the active thread's `inbox/open/` folder under the V1 record-form filename grammar with the `review-finding` artifact-type token. This skill is the autonomous half of the V1 implementation-review pair — it reads both inputs, maps each source acceptance item to the matching diff hunks, runs the five code-vs-original-intent fidelity axes from D85 against the pair, drafts the report end-to-end, and writes one record per review run. It does not ask clarifying questions, it does not walk findings with the user one-at-a-time, and it does not commit. For the collaborative per-finding (or per-source-acceptance-item) walk with anti-sycophancy push-back, use the sibling skill `review-implementation-interactive` instead.

`review-implementation-auto` is one of TEN V1 review skills, paired across five review targets — proposal, spec, plan, implementation, code — each with an `-auto` and an `-interactive` variant. Two axes are independent: the REVIEW TARGET (implementation here; proposal / spec / plan / code in the other four pairs) and the AUTONOMY axis (autonomous here; collaborative in the sibling). The review target this skill addresses is the IMPLEMENTATION — the CODE DIFF / commit range produced (typically) by one of the Phase 5 implement-* skills, namely `skills/implement-auto/SKILL.md`, `skills/implement-interactive/SKILL.md`, `skills/implement-plan-auto/SKILL.md`, `skills/implement-plan-interactive/SKILL.md`, `skills/implement-plan-with-subagents-auto/SKILL.md`, or `skills/implement-plan-with-subagents-interactive/SKILL.md`. The handoff-grade bar for the upstream spec lives in `review-spec-auto` / `review-spec-interactive`; the plan-shape review lives in `review-plan-auto` / `review-plan-interactive`; general-purpose code review independent of a source artifact lives in `review-code-auto` / `review-code-interactive`.

## V1 Verification Role

**This skill covers V1 verification of implementations. There is NO separate `verify-*` skill in V1 — verification is subsumed by implementation review per D85 (REVW-04 / REVW-09).** A user looking for a "verify the implementation" skill should land here. The V1 review-family decision is that the verification question — "does the code that was just written do what the source artifact promised it would do?" — is the same question implementation-review answers, and splitting it into a separate `verify-*` skill would duplicate logic and confuse users about which skill to invoke. Verification-of-implementation in V1 is `review-implementation-auto` (autonomous) and `review-implementation-interactive` (collaborative). No separate verify.

This is the distinguishing trait of the implementation target relative to the other four review targets: the INPUT shape is different — the implementation is a CODE DIFF / commit range / git ref rather than a markdown artifact — but the REVIEW QUESTION is still "does the input deliver what the SOURCE artifact promised?". The source-artifact requirement is what keeps the review tethered to the original intent and what makes the verification claim coherent: a code review without the source artifact is `review-code-*`'s general-purpose territory, not this skill's.

## Inputs

This skill requires TWO inputs. Both are mandatory.

### Input 1: An implementation reference

The implementation reference is the CODE OUTPUT being reviewed — typically the work produced by one of the Phase 5 implement-* skills listed above. Accepted forms:

1. **A git ref** — a commit SHA (full or short), a branch name, or a tag. Example: `abc1234`, `feature/auth-rollout`, `v1.2.0`.
2. **A commit range** — `main..feature-branch`, `HEAD~5..HEAD`, `<base-sha>..<head-sha>`. The range identifies the set of commits constituting the implementation under review.
3. **A diff text** — a unified diff passed inline or via a path to a saved `.diff` / `.patch` file. Useful when the implementation has not yet been committed to a branch this skill can resolve, or when the diff was exported for review separately.

The implementation reference is READ-ONLY. This skill does NOT check out a branch, does NOT run tests, does NOT modify the working tree, and does NOT mutate any git state. The review is read-only against the diff.

### Input 2: A source artifact

The source artifact is the MARKDOWN ARTIFACT the implementation was supposed to deliver. The five accepted forms match the input shapes named in Phase 5's `implement-*` skills — see `skills/implement-auto/SKILL.md` (the canonical less-structured-input implement skill, which enumerates seven input forms) and `skills/implement-plan-auto/SKILL.md` (the plan-driven implement skill, which takes a plan artifact).

Accepted forms:

1. **A spec artifact path** under `docs/threads/<thread>/specs/<UTC>-v<N>[-<descriptor>]-spec.md`. The spec's eight D50 semantic-contract elements (intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance) drive the fidelity axes — every acceptance item should have a corresponding change in the diff; every constraint should be honored; every expected behavior should be visible.
2. **A proposal artifact path** under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. The proposal's rough shape and open questions drive the fidelity axes — the diff should cover the proposal's intended outcome; the proposal's open questions should either be resolved by the diff or carried forward as `## Open Questions` in the review.
3. **A plan artifact path** under `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md` (loose or strict granularity). Each plan task should have a corresponding commit / diff hunk; see the plan-driven-specific checks below. Plan-driven implementations get the per-plan-task cadence and four-state status alignment checks in addition to the standard fidelity axes.
4. **A GitHub issue URL or `owner/repo#NNN` identifier**. Accepted as a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short form. The issue body becomes the source-of-intent; the issue's labels and title carry additional framing.
5. **An Inbox item path** under `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` or `docs/threads/<thread>/inbox/processed/<UTC>-<kebab-desc>-inbox-item.md`. The Inbox item's `**Why:**` line names the intended outcome and the body sketches the work the implementation was supposed to perform.

### Ambiguity fallback

If EITHER input is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest implementation" or "latest source" algorithm. Do not pick by recency, by highest version number, or by sort order. Multiple plausible candidates include: two competing branches both named after the source, two spec versions where the user's reference is "the spec", an Inbox item slug that matches several open items. Silently picking would hide a real decision — which input the user intends to review — behind a sort order.

The literal folders `docs/threads/<thread>/specs/`, `docs/threads/<thread>/proposals/`, `docs/threads/<thread>/plans/`, and `docs/threads/<thread>/inbox/open/` (or `inbox/processed/`) are the only V1 locations for source-artifact paths per `docs/workflow/v1/thread-layout.md`. If a source-artifact path is supplied but does not resolve to one of those folders or to a recognizable GitHub issue URL, refuse and ASK the user to confirm.

## What This Skill Reviews

This skill runs the **five code-vs-original-intent fidelity axes** per D85. The check question is "does the IMPLEMENTATION deliver what the SOURCE ARTIFACT said it would?". Findings tether to that question; findings that drift into general-purpose code review (style, idioms, regression risk independent of the source) belong to `skills/review-code-auto/SKILL.md` or `skills/review-code-interactive/SKILL.md` and should be surfaced as escalation suggestions under `## Next Actions` rather than reviewed inline here.

### Axis 1: Acceptance / outcome coverage

Does every acceptance item (spec acceptance guidance / plan task / GitHub issue acceptance criterion / Inbox item resolution / proposal intended outcome) have a corresponding change in the diff?

- **Total gap** — an acceptance item that no diff hunk addresses is a `blocker` (the implementation has not delivered what the source promised; the source's contract is unmet).
- **Partial gap** — an acceptance item that the diff covers partially (e.g., the source says "add endpoint X that returns Y and persists Z" and the diff adds endpoint X with return Y but omits the persistence) is an `issue` or `blocker` depending on whether the missing piece is integral to the acceptance.
- **Misaligned coverage** — the diff implements something that LOOKS like the acceptance item but operates differently (e.g., the source says "return a JSON object with fields A/B/C" and the diff returns a list of those values) is an `issue`.

When the source is a plan artifact, the plan's tasks are the acceptance vocabulary — every plan task should have at least one commit / diff hunk that traces to it. A plan task with no corresponding commit is a coverage gap.

### Axis 2: Constraint adherence

Does the implementation respect the source's CONSTRAINTS? Constraints are the source's "must not" / "must use" / "must avoid" / "tech-stack" / "API contract" / "safety" / "repo layout" statements.

- **Tech-stack violation** — the source says "use library X" and the diff uses library Y instead is an `issue` or `blocker` depending on whether the substitution is benign (functionally equivalent) or substantive (different API surface, different operational characteristics).
- **API contract violation** — the source says "the endpoint returns X with shape Y" and the diff returns X with shape Z is a `blocker` (downstream callers will break).
- **Safety constraint violation** — the source says "must not log secret values" and the diff logs them is a `blocker`.
- **Repo-layout violation** — the source says "place this module at `src/foo/`" and the diff places it at `src/bar/` is an `issue` (the file is in the wrong place; future readers will not find it where the source said it would land).

### Axis 3: Scope adherence

Is the implementation INSIDE the source's stated scope? Out-of-scope changes — scope drift — are findings even when they look like improvements.

- **Scope drift** — the diff modifies files or behavior the source did not call for is an `issue` (the implementer added work the user did not ask for; the surrounding review session needs to evaluate whether the addition is wanted).
- **Out-of-scope refactor** — the diff refactors code the source did not say to touch is an `issue`. A refactor done in service of the source's actual work (e.g., extracting a helper to make the source's behavior implementable) is in-scope; a refactor done because the implementer "thought it would be cleaner" is out-of-scope.
- **Scope expansion** — the diff implements a feature the source mentioned only as a possibility ("we might want X") without confirming X was decided is an `issue`. The cheap moment to surface this is the review; the diff has not yet been merged or released.

### Axis 4: Behavior fidelity

Does the implementation exhibit the EXPECTED BEHAVIORS the source named? Missing behaviors are findings; unexpected new behaviors are findings.

- **Missing behavior** — the source says "the system should do X" and the diff does not implement X is a `blocker`.
- **Different behavior** — the source says "the system should do X" and the diff implements something that LOOKS LIKE X but operates differently (different inputs, different outputs, different side effects, different error handling) is an `issue` or `blocker` depending on whether downstream callers / users would notice.
- **Unexpected new behavior** — the diff introduces a behavior the source did not call for (e.g., the source says "add logging to module M" and the diff adds logging plus a new metric collection path) is an `issue` (the user did not ask for the metric path; even if useful, it should be a separate decision).
- **Error-handling drift** — the source says "on failure, return a 4xx with reason X" and the diff returns a 5xx or swallows the failure is an `issue` or `blocker` depending on the source's stated severity.

### Axis 5: Test coverage

Does the implementation add tests (or update existing tests) consistent with the source's acceptance guidance? Test coverage is a fidelity axis when the source had acceptance guidance that names testability — most specs and plans do, most proposals do, most issues might, most Inbox items might not (a doc-only Inbox item resolution typically does not need tests).

- **Missing tests for new behavior** — the diff introduces a new behavior the source acceptance named, but no test covers that behavior, is an `issue` (the source's acceptance is observable per the project's test convention, and the diff did not record the observation).
- **Tests do not exercise the source's acceptance** — the diff added tests, but they cover incidental behavior rather than the behavior the source promised, is an `issue` (the test suite carries less assurance than the test count suggests).
- **No-test-required source** — when the source is a doc-only Inbox item, a configuration-only proposal, or a refactor task that explicitly does not affect observable behavior, the test-coverage axis may be SKIPPED with a note under `## Open Questions`. Do not flag missing tests when the source did not call for testable behavior.

### Plan-driven implementations: additional checks

When the source artifact is a PLAN under `docs/threads/<thread>/plans/`, the review additionally checks:

- **Per-plan-task commit cadence** — per D75 (the Phase 5 cadence rule honored by `skills/implement-plan-auto/SKILL.md` and `skills/implement-plan-interactive/SKILL.md`), each plan task should have a corresponding commit. A commit-range that lumps multiple plan tasks into one commit is an `issue` (the audit trail is harder to trace; partial reverts become surgery). A plan task split across multiple commits is also an `issue` (the boundary between commits no longer matches the plan boundary). When the source artifact was passed to `skills/implement-auto/SKILL.md` or `skills/implement-interactive/SKILL.md` instead (the less-structured-input pair), this check does not apply — the cadence is per implicit task, and the implicit-task boundary is the implementer's call, not the plan's.
- **Four-state status alignment** — per D74 (the four-state status protocol from `skills/implement-plan-auto/SKILL.md`), each task report carries one of `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`. The review can read those reports (typically in the chat output of the implementation session OR in the commit message bodies for the per-task commits) and check that the four-state status MATCHES the diff state. A task reported `DONE` whose diff is incomplete is an `issue` or `blocker` (the report is wrong). A task reported `DONE_WITH_CONCERNS` whose concerns are not surfaced in the commit message body is an `issue` (the audit trail is incomplete). A task reported `BLOCKED` whose subsequent tasks have commits is a `blocker` (the implementer should have stopped — the report contradicts the diff).

This skill does NOT promise general-purpose code review independent of source artifacts — that is `review-code-auto` / `review-code-interactive`'s territory per D86. If the source artifact is unavailable or the user wants spec-independent code review (style, idioms, safety, testability beyond what the source acceptance named, regression risk), point at `skills/review-code-auto/SKILL.md` or `skills/review-code-interactive/SKILL.md` under `## Next Actions` rather than performing the heavier general-purpose check inline. Findings that escalate beyond the five fidelity axes are out of scope here.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized findings-first per V1 review-family policy. The body MUST cover the following six sections in this order:

1. **`## Verdict`** — overall judgment on the implementation against the five fidelity axes. Suggested vocabulary (executor MAY refine): `delivers` (the implementation matches the source's contract; no blockers, issues at most), `partially delivers` (some findings need addressing; specify which axis), `does not deliver` (one or more axes is substantially unmet; the implementation needs revision before the source's contract is satisfied). One overall verdict plus a one-line tether to the highest-impact finding below.
2. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit`). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which of the five axes it concerns (acceptance coverage / constraint adherence / scope adherence / behavior fidelity / test coverage) or whether it is a plan-driven check (per-task commit cadence / four-state status alignment), (b) what is wrong (gap / drift / violation / aspirational acceptance / etc.), (c) why it matters for whoever picks up the implementation next (the next reviewer, the next implementer for a fix, or the user merging the change).
3. **`## Evidence`** — for each finding above, cite BOTH the file:line in the diff AND the source-artifact section. The two-citation requirement is the implementation-review-specific shape — a fidelity finding without both citations is unverifiable. For per-task findings on a plan-driven implementation, cite the plan task number plus the file:line in the diff. Reference, do not recite — quoting the entire diff hunk or the entire source section is noise.
4. **`## References`** — list every artifact the review reads or depends on: the implementation reference (absolute path to a saved diff file, or commit SHA / range with the repo identifier, or branch name with the repo identifier), the source artifact path (absolute path), any related decision logs by absolute path plus `D<N>` for specific operative decisions (especially when constraint-adherence findings trace back to settled decisions), any prior review-findings on the same implementation (also by absolute path). Cite the relevant Phase 5 implement-* skill (typically `skills/implement-plan-auto/SKILL.md` or `skills/implement-auto/SKILL.md`) when a finding is about the implementer's contract.
5. **`## Open Questions`** — clarifications worth confirming with the implementer, the source author, or the downstream reader. Frame as questions, not as gaps to autofill. If the test-coverage axis was SKIPPED (e.g., doc-only Inbox item resolution), this section EXPLICITLY notes the skip. If a question would normally surface in a future implementation cycle, say so — and recommend the downstream skill that should pick it up (typically one of the implement-* family for re-implementation, or `review-spec-*` / `review-proposal-*` / `review-plan-*` if the question traces back to upstream artifact ambiguity).
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: re-implement via one of the `implement-*` skills to address `blocker` findings, escalate to `skills/review-code-auto/SKILL.md` / `skills/review-code-interactive/SKILL.md` for findings outside the five fidelity axes, re-review the upstream spec via `skills/review-spec-auto/SKILL.md` / `skills/review-spec-interactive/SKILL.md` if findings trace back to spec ambiguity, re-review the upstream plan via `skills/review-plan-auto/SKILL.md` / `skills/review-plan-interactive/SKILL.md` if findings trace back to plan ambiguity, open a discussion via `skills/discussion/SKILL.md` to settle a specific design question that the implementation surfaced, or merge / land the implementation if the verdict is `delivers`. One action per finding cluster; do not pad.

The six section headings are the V1 standard for the findings-first report shape per the V1 review-family CONTEXT (established in Plan 06-01). Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. Do NOT collapse two sections into one; the explicit separation lets a downstream reader (or the interactive sibling resuming the same review topic) scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one implementation; emitting one file per finding would clutter `inbox/open/` and break the "one record per review run" V1 review-family convention.

## Output Artifact

Write the review artifact to:

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

per the V1 record-form grammar at `docs/workflow/v1/filename-grammar.md` and the inbox routing rule at `docs/workflow/v1/thread-layout.md`. The `review-finding` artifact-type token is MANDATORY — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form (`v<N>`) because reviews are records, not versioned artifacts.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<source-slug>-implementation-review` (capturing which source artifact the implementation was checked against) or `<commit-sha-short>-vs-<source-slug>-review` (capturing the implementation reference plus the source). The slug is part of the filename and is not user-confirmed in auto mode; the source-artifact slug plus the implementation-reference summary is treated as authoritative.
- The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation"). Do not pre-create empty folders.

Example filename:

```text
260521101212Z-auth-rollout-v1-plan-implementation-review-finding.md
```

For the full record-form grammar and the recognized V1 artifact-type list (which includes `review-finding` alongside `proposal`, `spec`, `plan`, `discussion`, `decision-log`, `inbox-item`), see `docs/workflow/v1/filename-grammar.md`.

The artifact lives in `inbox/open/` rather than `reviews/` — per `docs/workflow/v1/thread-layout.md`, V1 explicitly excludes a top-level `reviews/` folder; review findings ARE inbox items, and the inbox open/processed/dropped status is reflected by folder, not by frontmatter. Once a finding has been addressed (typically by emitting a new implementation cycle via one of the implement-* skills), the review-finding is moved from `inbox/open/` to `inbox/processed/` — that lifecycle is manual in V1 and out of scope for this skill.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Resolve the implementation reference.** Detect the implementation reference from the user's invocation. Accepted forms are a git ref (commit SHA, branch name, or commit range), a path to a saved diff file, or an inline diff body. If the reference is unsupplied, vague ("the diff", "what I just did", "the feature branch" with no name), or matches multiple plausible candidates (two competing feature branches), ASK the user which is intended. Do not pick by recency or by ref order.

3. **Resolve the source artifact.** Detect the source-artifact path from the user's invocation. The five accepted forms are listed under `## Inputs`. If the source artifact is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). Do not pick by recency. The source artifact is MANDATORY — without it, the fidelity axes have nothing to check against, and the user should be directed to `skills/review-code-auto/SKILL.md` / `skills/review-code-interactive/SKILL.md` for source-independent code review instead.

4. **Read the source artifact READ-ONLY.** Per `docs/workflow/v1/immutability.md`, emitted source artifacts (specs, proposals, plans, decision logs, Inbox items) are immutable. This skill reads the source but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the source body. Findings against the source artifact (e.g., source ambiguity that the implementation could not have resolved without inventing details) are surfaced under `## Next Actions` with the recommendation to re-review the upstream artifact via `review-spec-*` / `review-proposal-*` / `review-plan-*`.

5. **Inspect the implementation reference READ-ONLY.** Read the diff (`git diff <range>` or read the saved diff file). DO NOT check out the branch and run it. DO NOT modify the working tree. DO NOT run tests against the implementation. DO NOT mutate any git state — no `git checkout`, no `git reset`, no `git stash`, no `git rebase`. The review is read-only against the diff text.

6. **Map source acceptance items to diff hunks.** For each acceptance item / plan task / expected behavior / constraint in the source artifact, locate the matching change(s) in the diff. Note coverage gaps (acceptance items with no matching diff hunk) — these become candidate findings under Axis 1 (acceptance / outcome coverage).

7. **Run the five fidelity axes in order from `## What This Skill Reviews`.** Apply each axis: acceptance / outcome coverage → constraint adherence → scope adherence → behavior fidelity → test coverage. Tether every finding to "what does the source promise that the implementation either misses, misimplements, exceeds, or fails to test for?".

8. **For plan-driven implementations: also check per-plan-task commit cadence and four-state status alignment.** Read the commit history under the implementation reference. Verify per D75 that each plan task has at least one commit and that no commit spans multiple plan tasks. Read the four-state status reports (from commit message bodies or chat output if accessible) and verify per D74 that the reported status matches the diff state.

9. **Draft the findings-first report.** Compose the six sections in order: `## Verdict` → `## Findings` → `## Evidence` → `## References` → `## Open Questions` → `## Next Actions`. Skip a section entirely if it has nothing real to add. Order findings within `## Findings` by impact (severity first, then by axis sequence, then by location in the diff). Each finding's `## Evidence` cites BOTH the diff (file:line) AND the source-artifact section.

10. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

11. **Write the review artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. The `review-finding` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md`. The review body is plain markdown — no YAML frontmatter on the review artifact itself.

12. **Confirm.** Tell the user: `Review written: <relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review-finding artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session (per `docs/workflow/v1/immutability.md`, "Drafts Are Editable") but are never committed by this skill.

This skill ALSO does not modify the implementation under review. Code modifications are an `implement-*` skill's job per the Phase 5 contract. If the review surfaces findings that require code changes, surface them in `## Next Actions` with a pointer to one of the `implement-*` skills (typically `skills/implement-plan-auto/SKILL.md` for plan-driven re-implementation, or `skills/implement-auto/SKILL.md` for less-structured-input re-implementation) — let the surrounding session invoke the implement skill separately.

## Immutability

Emitted review-finding artifacts are immutable per `docs/workflow/v1/immutability.md`. Once the file is written into `inbox/open/`, it is part of the thread's reviewable history and is NOT edited. A typo discovered in an emitted review-finding means writing a NEW review-finding record (new UTC stamp, new kebab-desc) — not an in-place edit. A revision to a review-finding is a NEW review-finding artifact, not an in-place edit.

The source artifact under review is ALSO IMMUTABLE per the same rules. The reviewer reads READ-ONLY and does NOT edit the source. Findings that warrant revisions to the source artifact (e.g., source ambiguity that the implementation could not have resolved without inventing details) are surfaced under `## Next Actions` with the explicit recommendation to re-review the upstream artifact via the appropriate review skill and emit a new versioned source via the appropriate authoring skill — never an instruction to edit the existing source in place.

The implementation reference (the diff / git ref / commit range) is ALSO READ-ONLY for this skill. This skill does NOT modify source code, does NOT check out branches, does NOT mutate git state, and does NOT run tests against the implementation. Code modifications are an `implement-*` skill's job per Phase 5; this skill's role is review only. If the review surfaces findings that require code changes, the surrounding session invokes the appropriate `implement-*` skill on a fresh invocation — this skill never crosses into implementation territory.

No source-relation YAML frontmatter is added to the review body — lineage between a review-finding and the implementation / source it reviews lives in the `## References` section (by absolute path for the source artifact, by commit SHA / range / branch name with repo identifier for the implementation), not in metadata on the file. Per `docs/workflow/v1/immutability.md`, the accepted trade-off is that the filename alone cannot tell you which implementation a review reviewed — that mapping is recovered from the body's references section.
