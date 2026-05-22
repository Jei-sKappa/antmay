---
name: review-implementation-interactive
description: Walk a V1 implementation reference (a git ref / diff / commit range — typically the output of one of the Phase 5 `implement-*` skills) PLUS the source artifact it was supposed to deliver (spec / proposal / plan / GitHub issue / Inbox item — the 4–5 input forms accepted by Phase 5's `implement-*` skills) one finding (or one diff hunk / one source acceptance item) at a time — ASKING the user for their view AND TESTING that view against BOTH the diff AND the source artifact — checking five code-vs-original-intent fidelity axes per D85 (acceptance/outcome coverage, constraint adherence, scope adherence, behavior fidelity, test coverage). Settles each finding as resolved / rejected / accepted / deferred / parked; writes a decision log to `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`; dumps ONLY unresolved actionable findings to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` at the END of the session (no Inbox file when nothing remains). This skill covers V1 verification of implementations — there is no separate `verify-*` skill in V1. Use when you want to think the implementation review through collaboratively with the agent and have the resolved-vs-unresolved split captured for you — not when you want autonomous end-to-end review (use `review-implementation-auto` for that), and not when you want general-purpose code review independent of a source artifact (use `review-code-auto` / `review-code-interactive`) or when you want to review the upstream spec / proposal / plan (use `review-spec-*` / `review-proposal-*` / `review-plan-*`).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Implementation Interactive

Walk a V1 implementation reference (a git ref / diff / commit range produced by one of the Phase 5 `implement-*` skills) READ-ONLY one finding (or one diff hunk / one source acceptance item) at a time with the user, ASK the user for their view on each finding AND TEST that view against BOTH the diff AND the source artifact, settle each finding as resolved / rejected / accepted / deferred / parked, append per-finding records to a decision log under the active thread's `discussions/` folder, and — only if unresolved actionable findings remain at the end of the session — dump those to an `inbox/open/` review-finding artifact. This skill is the collaborative half of the V1 implementation-review pair. For end-to-end autonomous review with no per-finding walk, use the sibling skill `review-implementation-auto` instead.

`review-implementation-interactive` is one of TEN V1 review skills, paired across five review targets — proposal, spec, plan, implementation, code — each with an `-auto` and an `-interactive` variant. Two axes are independent: the REVIEW TARGET (implementation here; proposal / spec / plan / code in the other four pairs) and the AUTONOMY axis (collaborative here; autonomous in the sibling). The review target this skill addresses is the IMPLEMENTATION — the CODE DIFF / commit range produced (typically) by one of the Phase 5 implement-* skills, namely `skills/workflow/implement/implement-auto/SKILL.md`, `skills/workflow/implement/implement-interactive/SKILL.md`, `skills/workflow/implement/implement-plan-auto/SKILL.md`, `skills/workflow/implement/implement-plan-interactive/SKILL.md`, `skills/workflow/implement/implement-plan-with-subagents-auto/SKILL.md`, or `skills/workflow/implement/implement-plan-with-subagents-interactive/SKILL.md`. The handoff-grade bar for the upstream spec lives in `review-spec-auto` / `review-spec-interactive`; the plan-shape review lives in `review-plan-auto` / `review-plan-interactive`; general-purpose code review independent of a source artifact lives in `review-code-auto` / `review-code-interactive`. The cheap moment to push back is during this walk — once the implementation is merged or released, the cost of unflagged fidelity gaps compounds, and V1 implementation skills do not rewind commits per D77.

## Anti-Sycophancy Stance

Your job is to help the user reach the right verdict on the implementation against the five code-vs-original-intent fidelity axes, not to make them feel good about whatever the diff currently does. Treat the per-finding walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **a review is most valuable when it disagrees with the author**. A review whose only effect is to validate the diff because the implementer (or the user) defends it has produced nothing useful; the cheap moment to push back is during the walk, before the implementation is merged or released, before downstream callers depend on the not-quite-right shape. The implementation-stage stakes are particularly sharp because the code is already written — every unflagged fidelity gap becomes a future "but the source said X" conversation that lives somewhere between a bug report and a feature request, with no clean way to recover. Push back hard on weak reasoning, hidden assumptions, or "the implementer used judgment" handwaves; never soften findings just because the user pushes back.

This is the V1 review stance: push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back. A reviewer who waters down a real finding when the author objects has stopped reviewing and started agreeing. The walk's value sits in the disagreement, not the consensus.

Hold these together:

- **Disagree when you disagree.** If the user's view of a finding conflicts with the evidence in the diff, your read of the source artifact, or the relationship between the two, say so plainly before settling. Don't soften it into ambiguity. If the user says "the source did say to do X" and the source clearly says Y, surface that gap before logging.
- **Push back on weak or incomplete reasoning.** If the user dismisses a finding for a reason that doesn't hold up — "the implementer used judgment", "it's obvious from the source", "the diff is close enough", "the four-state status report said DONE_WITH_CONCERNS so it's covered", "we'll fix it in a follow-up" — name the gap, surface the assumption, and bring it into the conversation before the finding is settled as `rejected` or `resolved`. A future maintainer or downstream caller who has never seen this conversation will not "use judgment" — that is precisely what the acceptance / outcome coverage axis enforces.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, fidelity gaps the user is willing to absorb, scope drift the implementer added — raise them, even if the user wants to move on. Better captured as a finding now than rediscovered after merge or release, where the cost compounds in additional commits or operational surprise.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the diff or the source artifact, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument (e.g., the user names a decision-log entry that genuinely settled the constraint differently than your read of the source suggested).
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a finding's severity, settlement, or wording just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a finding differently, identify the exact assumption or value judgment causing the split, then resolve it before settling the finding.
- **Refuse to log a finding settlement you believe is wrong without flagging it.** If the user insists on settling a finding as `resolved` or `rejected` when you believe it remains actionable, log the settlement they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other settlement> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the review owned by the evidence.** The goal is not for either side to win. The goal is to record settlements that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered. Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back.

If you believe a finding is being dismissed without real reason, refuse to log it silently as `rejected`. Either resolve the disagreement first, or log the dissent verbatim in the rationale line. The cheap moment for the review to do its job is during the walk — once the implementation is merged or released, the cost of unflagged fidelity gaps compounds, and V1 implementation skills will not rewind the commits.

## V1 Verification Role

**This skill covers V1 verification of implementations. There is NO separate `verify-*` skill in V1 — verification is subsumed by implementation review per D85 (REVW-04 / REVW-09).** A user looking for a "verify the implementation" skill should land here (or the autonomous sibling `review-implementation-auto`). The V1 review-family decision is that the verification question — "does the code that was just written do what the source artifact promised it would do?" — is the same question implementation-review answers, and splitting it into a separate `verify-*` skill would duplicate logic and confuse users about which skill to invoke. Verification-of-implementation in V1 is `review-implementation-auto` (autonomous) and `review-implementation-interactive` (collaborative). No separate verify.

This is the distinguishing trait of the implementation target relative to the other four review targets: the INPUT shape is different — the implementation is a CODE DIFF / commit range / git ref rather than a markdown artifact — but the REVIEW QUESTION is still "does the input deliver what the SOURCE artifact promised?". The source-artifact requirement is what keeps the walk tethered to the original intent and what makes the verification claim coherent: a code walk without the source artifact is `review-code-*`'s general-purpose territory, not this skill's.

## Inputs

This skill requires TWO inputs. Both are mandatory.

### Input 1: An implementation reference

The implementation reference is the CODE OUTPUT being reviewed — typically the work produced by one of the Phase 5 implement-* skills listed above. Accepted forms:

1. **A git ref** — a commit SHA (full or short), a branch name, or a tag. Example: `abc1234`, `feature/auth-rollout`, `v1.2.0`.
2. **A commit range** — `main..feature-branch`, `HEAD~5..HEAD`, `<base-sha>..<head-sha>`. The range identifies the set of commits constituting the implementation under review.
3. **A diff text** — a unified diff passed inline or via a path to a saved `.diff` / `.patch` file. Useful when the implementation has not yet been committed to a branch this skill can resolve, or when the diff was exported for review separately.

The implementation reference is READ-ONLY. This skill does NOT check out a branch, does NOT run tests, does NOT modify the working tree, and does NOT mutate any git state. The walk is read-only against the diff.

### Input 2: A source artifact

The source artifact is the MARKDOWN ARTIFACT the implementation was supposed to deliver. The five accepted forms match the input shapes named in Phase 5's `implement-*` skills — see `skills/workflow/implement/implement-auto/SKILL.md` (the canonical less-structured-input implement skill, which enumerates seven input forms) and `skills/workflow/implement/implement-plan-auto/SKILL.md` (the plan-driven implement skill, which takes a plan artifact).

Accepted forms:

1. **A spec artifact path** under `docs/threads/<thread>/specs/<UTC>-v<N>[-<descriptor>]-spec.md`. The spec's eight D50 semantic-contract elements drive the fidelity axes — every acceptance item should have a corresponding change in the diff; every constraint should be honored; every expected behavior should be visible.
2. **A proposal artifact path** under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. The proposal's rough shape and open questions drive the fidelity axes.
3. **A plan artifact path** under `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md` (loose or strict granularity). Each plan task should have a corresponding commit / diff hunk; see the plan-driven-specific checks below. Plan-driven implementations get the per-plan-task cadence and four-state status alignment checks in addition to the standard fidelity axes.
4. **A GitHub issue URL or `owner/repo#NNN` identifier**. Accepted as a full URL or the short form. The issue body becomes the source-of-intent.
5. **An Inbox item path** under `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` or `docs/threads/<thread>/inbox/processed/<UTC>-<kebab-desc>-inbox-item.md`. The Inbox item's `**Why:**` line names the intended outcome and the body sketches the work.

### Ambiguity fallback

If EITHER input is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest implementation" or "latest source" algorithm. Do not pick by recency, by highest version number, or by sort order. Silently picking would hide a real decision — which input the user intends to review — behind a sort order.

The literal folders `docs/threads/<thread>/specs/`, `docs/threads/<thread>/proposals/`, `docs/threads/<thread>/plans/`, and `docs/threads/<thread>/inbox/open/` (or `inbox/processed/`) are the only V1 locations for source-artifact paths per `docs/workflow/v1/thread-layout.md`. If a source-artifact path is supplied but does not resolve to one of those folders or to a recognizable GitHub issue URL, refuse and ASK the user to confirm.

## What This Skill Reviews

This skill runs the **five code-vs-original-intent fidelity axes** per D85. The walk runs each axis in order during candidate-list assembly, then settles findings finding-by-finding (or source-acceptance-item-by-source-acceptance-item — see `## Walk Format`). Every finding tethers to the question "does the IMPLEMENTATION deliver what the SOURCE ARTIFACT said it would?". Findings that drift into general-purpose code review (style, idioms, regression risk independent of the source) belong to `skills/workflow/review/review-code-auto/SKILL.md` / `skills/workflow/review/review-code-interactive/SKILL.md` and should be surfaced as escalation suggestions under `## Next Actions` rather than walked inline here.

### Axis 1: Acceptance / outcome coverage

Does every acceptance item (spec acceptance guidance / plan task / GitHub issue acceptance criterion / Inbox item resolution / proposal intended outcome) have a corresponding change in the diff?

- **Total gap** — an acceptance item that no diff hunk addresses is a `blocker` (the source's contract is unmet).
- **Partial gap** — an acceptance item that the diff covers partially is an `issue` or `blocker`.
- **Misaligned coverage** — the diff implements something that LOOKS like the acceptance item but operates differently is an `issue`.

When the source is a plan, the plan's tasks are the acceptance vocabulary — every plan task should have at least one commit / diff hunk that traces to it.

### Axis 2: Constraint adherence

Does the implementation respect the source's CONSTRAINTS — tech-stack / API contract / safety / repo-layout constraints?

- **Tech-stack violation** — the source says "use library X" and the diff uses library Y is an `issue` or `blocker` depending on equivalence.
- **API contract violation** — the source says "the endpoint returns X with shape Y" and the diff returns X with shape Z is a `blocker`.
- **Safety constraint violation** — the source says "must not log secret values" and the diff logs them is a `blocker`.
- **Repo-layout violation** — the source says "place at `src/foo/`" and the diff places at `src/bar/` is an `issue`.

### Axis 3: Scope adherence

Is the implementation INSIDE the source's stated scope? Out-of-scope changes — scope drift — are findings even when they look like improvements.

- **Scope drift** — the diff modifies files or behavior the source did not call for is an `issue`.
- **Out-of-scope refactor** — the diff refactors code the source did not say to touch is an `issue`. A refactor in service of the source's actual work is in-scope; "I thought it would be cleaner" is out-of-scope.
- **Scope expansion** — the diff implements a feature the source mentioned only as a possibility without confirming the decision is an `issue`.

### Axis 4: Behavior fidelity

Does the implementation exhibit the EXPECTED BEHAVIORS the source named?

- **Missing behavior** — the source says "should do X", the diff does not — `blocker`.
- **Different behavior** — looks like X but operates differently — `issue` or `blocker`.
- **Unexpected new behavior** — the diff introduces behavior the source did not call for — `issue`.
- **Error-handling drift** — the source says "on failure return 4xx with reason X", the diff returns 5xx or swallows — `issue` or `blocker`.

### Axis 5: Test coverage

Does the implementation add tests (or update existing tests) consistent with the source's acceptance guidance?

- **Missing tests for new behavior** — source acceptance named a testable behavior, diff did not add a test — `issue`.
- **Tests do not exercise the source's acceptance** — tests added but they cover incidental behavior — `issue`.
- **No-test-required source** — doc-only Inbox item, configuration-only proposal, or refactor-only source — this axis MAY be SKIPPED with a note under `## Open Questions`. Do not flag missing tests when the source did not call for testable behavior.

### Plan-driven implementations: additional checks

When the source artifact is a PLAN under `docs/threads/<thread>/plans/`, the review additionally checks:

- **Per-plan-task commit cadence** — per D75 (the Phase 5 cadence rule honored by `skills/workflow/implement/implement-plan-auto/SKILL.md` and `skills/workflow/implement/implement-plan-interactive/SKILL.md`), each plan task should have a corresponding commit. A commit-range lumping multiple plan tasks into one commit is an `issue`. A plan task split across multiple commits is also an `issue`. When the source artifact was passed to `skills/workflow/implement/implement-auto/SKILL.md` or `skills/workflow/implement/implement-interactive/SKILL.md` instead (less-structured-input pair), this check does NOT apply — the cadence is per implicit task, not per plan task.
- **Four-state status alignment** — per D74, each task report carries one of `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`. The walk can read those reports (typically from chat output of the implementation session OR from commit message bodies) and check that the four-state status MATCHES the diff state. A task reported `DONE` whose diff is incomplete is an `issue` or `blocker`. A task reported `DONE_WITH_CONCERNS` whose concerns are not surfaced in the commit message body is an `issue`. A task reported `BLOCKED` whose subsequent tasks have commits is a `blocker`.

This skill does NOT promise general-purpose code review independent of source artifacts — that is `review-code-auto` / `review-code-interactive`'s territory per D86. If the user wants spec-independent code review (style, idioms, safety, testability beyond what the source acceptance named, regression risk), point at `skills/workflow/review/review-code-auto/SKILL.md` or `skills/workflow/review/review-code-interactive/SKILL.md` under `## Next Actions` rather than performing the heavier general-purpose check inline.

## Walk Format

The walk presents the candidate findings list (or the per-source-acceptance-item walk order) to the user up front, then walks one finding (or one source acceptance item with its matching diff hunks) at a time. The grain of the walk — per-finding (closer to `skills/workflow/capture-discussion/seeded-discussion/SKILL.md`'s per-point walk) or per-source-acceptance-item (closer to `skills/workflow/review/review-spec-interactive/SKILL.md`'s element-by-element walk) — is the executor's discretion; the requirement is that each loop iteration settles ONE thing. The per-finding grain is the recommended default when findings cluster across the five fidelity axes (e.g., a few coverage gaps PLUS a constraint violation PLUS a scope drift); the per-source-acceptance-item grain is the recommended default when most findings concern coverage / behavior fidelity on a source artifact with many discrete acceptance items (because walking acceptance-item-by-acceptance-item exhausts the coverage and behavior-fidelity axes cleanly). When the source is a plan, the per-plan-task walk is also a natural grain — each plan task surfaces alongside its matching commits / diff hunks.

For each iteration (finding, or source acceptance item, or plan task):

1. **Surface the finding (or the source item + matching diff hunks).** State the finding with its severity tag — `blocker` / `issue` / `nit`. State which axis it concerns (acceptance coverage / constraint adherence / scope adherence / behavior fidelity / test coverage) or whether it is a plan-driven check (per-task commit cadence / four-state status alignment). State why it matters for whoever picks up the implementation next (the next reviewer, the next implementer for a fix, the user merging the change, downstream callers / users).
2. **Cite the evidence.** Quote the diff at file:line AND the source-artifact section. The two-citation requirement is the implementation-review-specific shape — a fidelity finding without both citations is unverifiable. For per-task findings on a plan-driven implementation, cite the plan task number plus the file:line in the diff. Reference, do not recite — do not paste large blocks of either input back. If the finding is "missing acceptance coverage for source acceptance item X", state explicitly which diff hunks should have covered it and what the source said.
3. **ASK the user for their view.** Open the loop with a question that gives the user room to answer: "What's your read on this gap?" / "Did the source actually call for this, or am I misreading it?" / "Was this an intentional out-of-scope add, or scope drift?" / "Does the source's constraint here permit the substitution the diff made?". Accept the user's freeform answer.
4. **TEST the user's explanation against BOTH the diff AND the source artifact.** Re-read the cited diff hunk (or the diff hunk the user points to) AND the cited source section (or the source section the user points to). Check whether the user's framing actually resolves the finding or merely defends it. Look for: (a) a diff hunk you missed that genuinely covers the source acceptance, (b) a section of the source artifact you missed that backs the user's framing (e.g., the source did include "OR equivalent" language that justifies the library substitution), (c) a `D<N>` decision-log citation that genuinely settles the question (a decision log entry resolving the constraint differently), (d) a four-state status report (for plan-driven implementations) that already flagged the gap as `DONE_WITH_CONCERNS` with the explicit deviation note. ASK the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that resolves the finding IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails.
5. **Settle the finding.** Together, settle as one of:
   - `resolved` — the diff already covers the finding (a hunk the reviewer missed), OR the source artifact resolves it (a section the reviewer missed or misread), OR the user's clarification points to an upstream artifact (a decision log cited by `D<N>`, a four-state status report that already flagged the deviation, a project-convention rule) that genuinely resolves it. Settlement stays in the decision log only.
   - `rejected` — the finding is not actually a finding (false positive from the candidate-list draft; e.g., the reviewer misread the source acceptance, or the reviewer confused two diff hunks). Settlement stays in the decision log only.
   - `accepted` — the finding is genuine and actionable; it will need to be addressed (typically by re-implementing via one of the `implement-*` skills, by re-reviewing the upstream artifact via `review-spec-*` / `review-proposal-*` / `review-plan-*` when the finding traces back to upstream ambiguity, or by escalating to `review-code-*` when the finding is outside the five fidelity axes). Dumps to the inbox-open review-finding artifact at end-of-session.
   - `deferred` — the finding is genuine but the user wants to park it for later. Dumps to the inbox-open review-finding artifact at end-of-session.
   - `parked` — same as deferred but the user has explicitly asked to capture as an Inbox item rather than treat as a review-finding. The walk may route via `skills/workflow/capture-discussion/capture-inbox/SKILL.md` instead of (or in addition to) the inbox-open dump.
6. **Append a record to the decision log.** Use the `## D<N>: <Finding title>` shape from `skills/workflow/capture-discussion/discussion/SKILL.md` and `skills/workflow/capture-discussion/seeded-discussion/SKILL.md`. `Decision: <settlement>` and `Rationale: <one or two sentences>`. Include the severity tag and the axis (or plan-driven check) in the title or rationale so the decision log carries the per-finding outcome legibly. If the settlement included a dissent per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim.
7. **Move to the next finding (or source acceptance item, or plan task).** Do not move on while the current finding is still ambiguous — settle it cleanly first. Silence is not a settlement.

If a finding splits into sub-findings during the walk (e.g., a "scope drift in Task 3's diff hunks" finding turns out to be one out-of-scope refactor sub-finding plus one scope-expansion sub-finding), settle each sub-finding as its own `## D<N>` record rather than collapsing them.

## Output Artifacts

This skill produces UP TO TWO artifacts. The decision log is the primary deliverable; the inbox-open review-finding dump is conditional.

### Decision Log (primary, written when the walk produces at least one settlement)

```text
docs/threads/<thread>/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

per `docs/workflow/v1/filename-grammar.md` (record form, `decision-log` artifact-type token) and the routing in `docs/workflow/v1/thread-layout.md`. The `decision-log` artifact-type suffix is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (decision logs are records, not versioned artifacts).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `<source-slug>-implementation-review` (capturing which source artifact the implementation was checked against) or `<commit-sha-short>-vs-<source-slug>-review` (capturing the implementation reference plus the source). Confirm the slug with the user before the first settlement.
- The `discussions/` folder is created on-demand per `docs/workflow/v1/thread-layout.md`. Do not pre-create empty folders.

The decision log is **append-only**. Each settled finding is appended as one record with a sequential per-log local heading:

```markdown
## D<N>: <Finding title> (<severity> · <axis or plan-driven check>)

Decision: <settlement: resolved / rejected / accepted / deferred / parked>

Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first settlement in this log and increments by `1` per settlement IN THIS LOG. The `## D<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's path.

Resolved AND rejected findings remain in the decision log only. They are NOT written to the inbox-open dump — they are already settled and need no further action.

### Inbox-Open Review-Finding Dump (conditional, written ONLY if unresolved actionable findings remain)

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

per `docs/workflow/v1/filename-grammar.md` (record form, `review-finding` artifact-type token) and the routing in `docs/workflow/v1/thread-layout.md`. The `review-finding` artifact-type suffix is MANDATORY.

This artifact is written ONLY at the END of the walk, and ONLY if at least one `accepted` / `deferred` / `parked` finding remains. **No Inbox file when nothing remains.** If every finding was settled as `resolved` or `rejected`, no inbox-open dump is written — the decision log is the only artifact, and the closing message states explicitly that no unresolved findings remain. The same rule reads as "no Inbox dump if all findings resolved" or "no Inbox file when nothing remains" — capturing nothing produces nothing.

When written, the inbox-open dump carries ONLY the unresolved actionable findings, in the same six-section findings-first shape used by the autonomous sibling:

1. **`## Verdict`** — overall judgment on what remains against the five fidelity axes (typically `partially delivers` or `does not deliver` if findings remain; the dump itself never carries a `delivers` verdict because nothing would land in it in that case).
2. **`## Findings`** — only the `accepted` / `deferred` / `parked` findings, each carrying its severity tag and axis (or plan-driven check).
3. **`## Evidence`** — for each finding, cite BOTH the diff (file:line) AND the source-artifact section. The two-citation requirement carries forward from the autonomous sibling.
4. **`## References`** — the implementation reference (commit SHA / range / branch name with repo identifier, or absolute path to a saved diff file), the source artifact path (absolute path), the decision log path emitted by this same walk (absolute path), any related decision logs or prior review-findings by absolute path, and a citation to the relevant Phase 5 implement-* skill (typically `skills/workflow/implement/implement-plan-auto/SKILL.md` or `skills/workflow/implement/implement-auto/SKILL.md`) when a finding is about the implementer's contract.
5. **`## Open Questions`** — clarifications worth confirming. Frame as questions, not as gaps to autofill. If the test-coverage axis was SKIPPED (e.g., doc-only Inbox item resolution), this section explicitly notes the skip.
6. **`## Next Actions`** — what to do next for each unresolved finding. Typical actions: re-implement via one of the `implement-*` skills (typically `skills/workflow/implement/implement-plan-auto/SKILL.md` for plan-driven re-implementation, or `skills/workflow/implement/implement-auto/SKILL.md` for less-structured-input re-implementation) to address `blocker` findings, escalate to `skills/workflow/review/review-code-auto/SKILL.md` / `skills/workflow/review/review-code-interactive/SKILL.md` for findings outside the five fidelity axes, re-review the upstream spec / proposal / plan via the appropriate `review-spec-*` / `review-proposal-*` / `review-plan-*` skill if findings trace back to upstream ambiguity, or open a discussion via `skills/workflow/capture-discussion/discussion/SKILL.md` to settle a specific design question the implementation surfaced.

Resolved and rejected findings are NOT repeated in the inbox-open dump — they are already settled in the decision log and require no further triage.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Resolve the implementation reference.** Detect the implementation reference from the user's invocation (git ref / commit range / branch / saved diff path / inline diff body). If the reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. Do not pick by recency or by ref order.

3. **Resolve the source artifact.** Detect the source-artifact path from the user's invocation. The five accepted forms are listed under `## Inputs`. If the source artifact is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). Do not pick by recency. The source artifact is MANDATORY — without it, the fidelity axes have nothing to check against, and the user should be directed to `skills/workflow/review/review-code-auto/SKILL.md` / `skills/workflow/review/review-code-interactive/SKILL.md` for source-independent code review instead.

4. **Read the source artifact READ-ONLY.** Per `docs/workflow/v1/immutability.md`, emitted source artifacts are immutable. This skill reads the source but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the source body during the walk.

5. **Inspect the implementation reference READ-ONLY.** Read the diff. DO NOT check out the branch, DO NOT run tests, DO NOT modify the working tree, DO NOT mutate any git state. The walk is read-only against the diff text.

6. **Identify the candidate findings list (or pick the per-source-acceptance-item / per-plan-task walk order).** Walk the diff and source artifact once end-to-end and draft a candidate list of findings tagged by axis (acceptance coverage / constraint adherence / scope adherence / behavior fidelity / test coverage) plus plan-driven checks (per-task commit cadence / four-state status alignment) when applicable, each with suggested severity. OR pick the per-source-acceptance-item walk order (each acceptance item from the source in order) OR the per-plan-task walk order (each plan task from the source in order, when the source is a plan). The grain is executor's discretion — see `## Walk Format`. Cluster related findings rather than fragmenting. Aim for fewer, higher-quality candidates over many minor ones.

7. **Confirm the candidate list (or walk order) with the user before walking.** List the candidates (or the walk order) by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing settlements later. If the user adds findings the candidate list missed, fold them in. If the user removes findings as not worth walking, drop them.

8. **For each finding (or source acceptance item / plan task) IN ORDER, run the per-iteration loop from `## Walk Format`.** Surface → cite evidence (BOTH diff and source) → ASK the user → TEST the user's explanation against BOTH the diff AND the source (do not just accept) → settle → log. Push back per the `## Anti-Sycophancy Stance` when warranted.

9. **Capture the UTC stamp.** When the FIRST settlement lands and the decision log needs to be created, compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing. The decision log is created LAZILY on the first settlement (per `## Decision Log Lazy Creation`).

10. **Append per-settlement records to the decision log.** After each settlement, append a `## D<N>: <Finding title>` record per `## Walk Format` step 6. Tell the user: `Decision saved: <short summary>.`

11. **At the END of the walk: write the inbox-open dump IF unresolved findings remain.** If at least one `accepted` / `deferred` / `parked` finding remains, capture the UTC stamp for the dump (separate from the decision log's stamp), draft the six-section findings-first report covering only the unresolved findings, and write the artifact to `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. If ALL findings were settled as `resolved` or `rejected`, do NOT write an inbox-open file — capturing nothing produces nothing, and no Inbox file when nothing remains.

12. **Final message.** Cite the decision log path. If the inbox-open dump was written, cite its path too. If the dump was NOT written, state explicitly: `No unresolved findings — no inbox file written.` No closing remark.

## Decision Log Lazy Creation

The decision log is created LAZILY at the FIRST settled finding — not proactively in step 6 or 7. If the candidate-list confirmation produces no walk (user decides the candidates are all false positives and aborts) and no findings are settled, NO decision log is written. An interrupted walk with no settled findings leaves no artifact.

This matches the lazy-creation rule in `skills/workflow/capture-discussion/discussion/SKILL.md` and `skills/workflow/capture-discussion/seeded-discussion/SKILL.md`: a discussion or walk that produces no decisions produces no log. The skill keeps state in-session until the first settlement, then creates the log at write time of the first `## D<N>` record.

If the user pauses mid-walk after at least one settlement has landed, the partial decision log is durable: every settlement up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## D<N+k>` record), per the resumption pattern in `skills/workflow/capture-discussion/seeded-discussion/SKILL.md`.

## Scope Drift

When the user introduces a branch that is outside the implementation-review walk — a finding about a different implementation, a tangent about the V1 workflow itself, a critique of the upstream spec, a general code-quality observation that doesn't trace to a source-artifact promise — do not silently follow them and do not let the walk grow into a different shape than the one being discussed. Propose ONE of:

1. **Park as an Inbox item** via `skills/workflow/capture-discussion/capture-inbox/SKILL.md` (PREFERRED for non-blocking side-findings). Captures a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this review's decision log.
2. **Split into its own decision log.** When the branch is itself a multi-finding discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` in `discussions/` for it via `skills/workflow/capture-discussion/discussion/SKILL.md` or `skills/workflow/capture-discussion/seeded-discussion/SKILL.md`. If the branch is "the upstream spec has the same problem", recommend invoking `skills/workflow/review/review-spec-interactive/SKILL.md` against the source artifact in a separate session. If the branch is "this code has quality issues independent of the source", recommend invoking `skills/workflow/review/review-code-interactive/SKILL.md` instead.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the decision log nor the (conditional) inbox-open review-finding dump. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session (per `docs/workflow/v1/immutability.md`, "Drafts Are Editable") but are never committed by this skill.

This skill ALSO does not modify the implementation under review. Code modifications are an `implement-*` skill's job per the Phase 5 contract. If the walk surfaces findings that require code changes, surface them in `## Next Actions` of the inbox-open dump (when written) or note them in the decision log with a pointer to one of the `implement-*` skills (typically `skills/workflow/implement/implement-plan-auto/SKILL.md` for plan-driven re-implementation, or `skills/workflow/implement/implement-auto/SKILL.md` for less-structured-input re-implementation) — let the surrounding session invoke the implement skill separately on a fresh invocation.

## Immutability

Emitted decision logs are append-only per `docs/workflow/v1/immutability.md`. Once a `## D<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a decision settles as a NEW `## D<N+k>` record explaining the change — never an in-place edit of an earlier record. The log itself is the state — there is no separate state file, no progress tracker.

Emitted review-finding artifacts (the conditional inbox-open dump) are also immutable per `docs/workflow/v1/immutability.md`. Once written into `inbox/open/`, the review-finding is part of the thread's reviewable history and is NOT edited. A revision to a review-finding is a NEW review-finding record (new UTC stamp, new kebab-desc), not an in-place edit.

The source artifact under review is ALSO IMMUTABLE per the same rules. The reviewer reads READ-ONLY and does NOT edit the source. Findings that warrant revisions to the source artifact (e.g., source ambiguity that the implementation could not have resolved without inventing details) are surfaced under `## Next Actions` in the inbox-open dump (or noted in the decision log) with the explicit recommendation to re-review the upstream artifact via the appropriate review skill and emit a new versioned source via the appropriate authoring skill — never an instruction to edit the existing source in place.

The implementation reference (the diff / git ref / commit range) is ALSO READ-ONLY for this skill. This skill does NOT modify source code, does NOT check out branches, does NOT mutate git state, and does NOT run tests against the implementation. Code modifications are an `implement-*` skill's job per Phase 5; this skill's role is review only. If the walk surfaces findings that require code changes, the surrounding session invokes the appropriate `implement-*` skill on a fresh invocation — this skill never crosses into implementation territory.

No source-relation YAML frontmatter is added to any emitted artifact — lineage between the decision log, the review-finding dump, the implementation reference, and the source artifact lives in the `## References` section (by absolute path for the source artifact, by commit SHA / range / branch name with repo identifier for the implementation), not in metadata on the files. Per `docs/workflow/v1/immutability.md`, that history is recovered from the body's references, not from the filename.
