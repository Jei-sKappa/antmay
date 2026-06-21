---
name: review-implementation-interactive
description: Walk an implementation against its spec's acceptance criteria one finding at a time and capture the resolved-vs-unresolved split when the user wants implementation fidelity verified collaboratively.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.1
---

# Review Implementation Interactive

Walk an implementation reference (a git ref / diff / commit range) READ-ONLY one finding (or one diff hunk / one spec acceptance criterion) at a time with the user, ASK the user for their view on each finding AND TEST that view against BOTH the diff AND the spec's acceptance criteria, settle each finding as resolved / rejected / accepted / deferred, append per-finding records to a decision log under the implementation's `discussions/` folder, and — only if unresolved actionable findings remain at the end of the session — emit a references-first review record into the active thread's `implementation/reviews/` folder.

## What This Review Verifies — the Spec's Acceptance Criteria, Not the Plan

The implementation is verified against the **spec's acceptance criteria — the contract — NOT against the plan.** The plan is a disposable compiler-IR the human never needs to read; the spec plus its acceptance criteria are the audited artifact. The human may review the implementation, but they never need to review the plan. So the walk's recurring question is: **"does the implementation deliver what the spec's acceptance criteria promised?"** Where a plan and the spec diverge, the spec wins — that divergence is a plan fault owned by the plan adherence review, not a finding to raise against the implementation here. Re-anchor any plan-tethered finding to the spec's acceptance criteria, or drop it.

## Anti-Sycophancy Stance

Your job is to help the user reach the right verdict on the implementation against the five implementation-vs-spec fidelity axes, not to make them feel good about whatever the diff currently does. Treat the per-finding walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **a review is most valuable when it disagrees with the author**. A review whose only effect is to validate the diff because the implementer (or the user) defends it has produced nothing useful; the cheap moment to push back is during the walk, before the implementation is merged or released, before downstream callers depend on the not-quite-right shape. The implementation-stage stakes are particularly sharp because the code is already written — every unflagged fidelity gap becomes a future "but the spec said X" conversation that lives somewhere between a bug report and a feature request, with no clean way to recover. Push back hard on weak reasoning, hidden assumptions, or "the implementer used judgment" handwaves; never soften findings just because the user pushes back.

Hold these together:

- **Disagree when you disagree.** If the user's view of a finding conflicts with the evidence in the diff, your read of the spec's acceptance criteria, or the relationship between the two, say so plainly before settling. Don't soften it into ambiguity. If the user says "the spec did say to do X" and the spec clearly says Y, surface that gap before logging.
- **Push back on weak or incomplete reasoning.** If the user dismisses a finding for a reason that doesn't hold up — "the implementer used judgment", "it's obvious from the spec", "the diff is close enough", "we'll fix it in a follow-up" — name the gap, surface the assumption, and bring it into the conversation before the finding is settled as `rejected` or `resolved`. A future maintainer or downstream caller who has never seen this conversation will not "use judgment" — that is precisely what the acceptance-criteria coverage axis enforces.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, fidelity gaps the user is willing to absorb, scope drift the implementer added — raise them, even if the user wants to move on. Better captured as a finding now than rediscovered after merge or release, where the cost compounds.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the diff or the spec, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument (e.g., the user points at the spec's Degrees-of-freedom section that genuinely granted the choice the diff made).
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a finding's severity, settlement, or wording just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a finding differently, identify the exact assumption or value judgment causing the split, then resolve it before settling the finding.
- **Refuse to log a finding settlement you believe is wrong without flagging it.** If the user insists on settling a finding as `resolved` or `rejected` when you believe it remains actionable, log the settlement they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other settlement> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the review owned by the evidence.** The goal is not for either side to win. The goal is to record settlements that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered.

If you believe a finding is being dismissed without real reason, refuse to log it silently as `rejected`. Either resolve the disagreement first, or log the dissent verbatim in the rationale line. The cheap moment for the review to do its job is during the walk — once the implementation is merged or released, the cost of unflagged fidelity gaps compounds.

## Verification Role

**This skill covers verification of implementations.** The verification question — "does the code that was just written do what the spec's acceptance criteria promised it would do?" — is the same question this review answers, so do not split verification into a separate concept during the walk.

This is the distinguishing trait of the implementation target relative to other review targets: the input shape is different — the implementation is a code diff / commit range / git ref rather than a markdown artifact — but the review question is still "does the input deliver what the spec's acceptance criteria promised?". The spec requirement is what keeps the walk tethered to the contract and what makes the verification claim coherent: a code walk without the spec is general-purpose code review territory, not this skill's.

## Inputs

This skill requires TWO inputs. Both are mandatory.

### Input 1: An implementation reference

The implementation reference is the code output being reviewed. Accepted forms:

1. **A git ref** — a commit SHA (full or short), a branch name, or a tag. Example: `abc1234`, `feature/auth-rollout`, `v1.2.0`.
2. **A commit range** — `main..feature-branch`, `HEAD~5..HEAD`, `<base-sha>..<head-sha>`. The range identifies the set of commits constituting the implementation under review.
3. **A diff text** — a unified diff passed inline or via a path to a saved `.diff` / `.patch` file. Useful when the implementation has not yet been committed to a branch this skill can resolve, or when the diff was exported for review separately.

The implementation reference is READ-ONLY. This skill does NOT check out a branch, does NOT run tests, does NOT modify the working tree, and does NOT mutate any git state. The walk is read-only against the diff.

### Input 2: The spec

The spec is the contract the implementation was supposed to deliver. A spec lives at `specs/NNN[-<desc>]/spec.md` inside the thread root; the path may be passed thread-relative or repo-relative. The spec's acceptance criteria and constraints drive the fidelity axes — every acceptance criterion should have a corresponding change in the diff; every constraint should be honored; every expected behavior should be visible.

The implementation report (a record under `implementation/`) may be supplied as additional context — it captures the implementer's account of deviations, surprises, and follow-ups. It is context, not the contract: read it to understand what the implementer did, but judge the result against the spec's acceptance criteria.

### Ambiguity fallback

If EITHER input is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. There is no global "latest implementation" or "latest spec" algorithm. Do not pick by recency, by `NNN`, or by sort order — silently picking would hide a real decision behind a sort order. If the thread holds multiple spec lineages (`specs/001-api/`, `specs/002-cli/`) and the user's reference is vague ("the spec"), ASK which lineage is intended. If the reference could point at a spec in another thread, ASK which thread. Two competing branches both named after the spec is the same kind of ambiguity on the implementation side — ASK.

The literal folder `specs/NNN[-<desc>]/` is the canonical location spec artifacts land in. If the supplied spec path is not a `spec.md` under a `specs/` lineage folder, refuse and ASK the user to confirm. If the thread genuinely holds no spec to verify against, point the user at a general-purpose code review instead.

## What This Skill Reviews

This skill runs the **five implementation-vs-spec fidelity axes**. The walk runs each axis in order during candidate-list assembly, then settles findings one at a time. Every finding tethers to the question "does the implementation deliver what the spec's acceptance criteria said it would?". Findings that drift into general-purpose code review (style, idioms, regression risk independent of the spec) should be surfaced as escalation suggestions under `## Next Actions` rather than walked inline here.

### Axis 1: Acceptance-criteria coverage

Does every one of the spec's acceptance criteria (and intended outcomes) have a corresponding change in the diff?

- **Total gap** — an acceptance criterion that no diff hunk addresses is a `blocker` (the spec's contract is unmet).
- **Partial gap** — an acceptance criterion that the diff covers partially is an `issue` or `blocker`.
- **Misaligned coverage** — the diff implements something that LOOKS like the acceptance criterion but operates differently is an `issue`.

### Axis 2: Constraint adherence

Does the implementation respect the spec's constraints — tech-stack / API contract / safety / repo-layout constraints?

- **Tech-stack violation** — the spec says "use library X" and the diff uses library Y is an `issue` or `blocker` depending on equivalence.
- **API contract violation** — the spec says "the endpoint returns X with shape Y" and the diff returns X with shape Z is a `blocker`.
- **Safety constraint violation** — the spec says "must not log secret values" and the diff logs them is a `blocker`.
- **Repo-layout violation** — the spec says "place at `src/foo/`" and the diff places at `src/bar/` is an `issue`.

Before flagging a choice as a deviation, check the spec's **Degrees of freedom** section: a choice the spec explicitly left open is NOT a violation — it is the implementer exercising granted freedom.

### Axis 3: Scope adherence

Is the implementation INSIDE the spec's stated scope? Out-of-scope changes — scope drift — are findings even when they look like improvements.

- **Scope drift** — the diff modifies files or behavior the spec did not call for is an `issue`.
- **Out-of-scope refactor** — the diff refactors code the spec did not say to touch is an `issue`. A refactor in service of the spec's actual work is in-scope; "I thought it would be cleaner" is out-of-scope.
- **Scope expansion** — the diff implements a feature the spec named only as a possibility, or explicitly placed out of scope, is an `issue`.

### Axis 4: Behavior fidelity

Does the implementation exhibit the expected behaviors the spec named?

- **Missing behavior** — the spec says "should do X", the diff does not — `blocker`.
- **Different behavior** — looks like X but operates differently — `issue` or `blocker`.
- **Unexpected new behavior** — the diff introduces behavior the spec did not call for — `issue`.
- **Error-handling drift** — the spec says "on failure return 4xx with reason X", the diff returns 5xx or swallows — `issue` or `blocker`.

### Axis 5: Test coverage

Does the implementation add tests (or update existing tests) consistent with the spec's acceptance criteria?

- **Missing tests for new behavior** — the spec's acceptance criteria named a testable behavior, diff did not add a test — `issue`.
- **Tests do not exercise the spec's acceptance criteria** — tests added but they cover incidental behavior — `issue`.
- **No-test-required acceptance** — when the spec's acceptance criteria describe doc-only or configuration-only outcomes, or a refactor not affecting observable behavior — this axis MAY be SKIPPED with a note under `## Open Questions`. Do not flag missing tests when the spec did not call for testable behavior.

This skill does NOT promise general-purpose code review independent of the spec. If the user wants source-independent code review (style, idioms, safety, testability beyond what the spec's acceptance criteria named, regression risk), point at a separate general-purpose code review under `## Next Actions` rather than performing the heavier check inline.

## Walk Format

The walk presents the candidate findings list (or the per-acceptance-criterion walk order) to the user up front, then walks one finding (or one acceptance criterion with its matching diff hunks) at a time. The grain of the walk — per-finding or per-acceptance-criterion — is the executor's discretion; the requirement is that each loop iteration settles ONE thing. The per-finding grain is the recommended default when findings cluster across the five fidelity axes; the per-acceptance-criterion grain is the recommended default when most findings concern coverage / behavior fidelity on a spec with many discrete acceptance criteria.

For each iteration (finding, or acceptance criterion):

1. **Surface the finding (or the acceptance criterion + matching diff hunks).** State the finding with its severity tag — `blocker` / `issue` / `nit`. State which axis it concerns. State why it matters for whoever picks up the implementation next.
2. **Cite the evidence.** Quote the diff at file:line AND the spec section (by section heading or acceptance-criterion identifier). The two-citation requirement is the implementation-review-specific shape — a fidelity finding without both citations is unverifiable. Reference, do not recite — do not paste large blocks of either input back. If the finding is "missing acceptance coverage for criterion X", state explicitly which diff hunks should have covered it and what the spec said.
3. **ASK the user for their view.** Open the loop with a question that gives the user room to answer: "What's your read on this gap?" / "Did the spec actually call for this, or am I misreading it?" / "Was this an intentional out-of-scope add, or scope drift?" / "Does the spec's Degrees-of-freedom section permit the substitution the diff made?". Accept the user's freeform answer.
4. **TEST the user's explanation against BOTH the diff AND the spec.** Re-read the cited diff hunk AND the cited spec section. Check whether the user's framing actually resolves the finding or merely defends it. Look for: (a) a diff hunk you missed that genuinely covers the acceptance criterion, (b) a section of the spec you missed that backs the user's framing (e.g., the spec's Degrees-of-freedom section granted the choice), (c) a decision-log citation that genuinely settles the question. ASK the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that resolves the finding IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails.
5. **Settle the finding.** Together, settle as one of:
   - `resolved` — the diff already covers the finding (a hunk the reviewer missed), OR the spec resolves it (a section the reviewer missed or misread, or a Degree of freedom that granted the choice), OR the user's clarification points to an upstream artifact that genuinely resolves it. Settlement stays in the decision log only.
   - `rejected` — the finding is not actually a finding (false positive; e.g., the reviewer misread the acceptance criterion, or confused two diff hunks). Settlement stays in the decision log only.
   - `accepted` — the finding is genuine and actionable; it will need to be addressed. Lands in the review record at end-of-session.
   - `deferred` — the finding is genuine but the user wants to park it for later. Lands in the review record at end-of-session.
6. **Append a record to the decision log.** Use the `## P<N>: <Finding title>` shape. `Decision: <settlement>` and `Rationale: <one or two sentences>`. Include the severity tag and axis in the title or rationale so the decision log carries the per-finding outcome legibly. If the settlement included a dissent per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim.
7. **Move to the next finding (or acceptance criterion).** Do not move on while the current finding is still ambiguous — settle it cleanly first. Silence is not a settlement.

If a finding splits into sub-findings during the walk, settle each sub-finding as its own `## P<N>` record rather than collapsing them.

## Output Artifacts

This skill produces UP TO TWO artifacts. The decision log is the primary deliverable; the review record is conditional.

### Decision Log (primary, written when the walk produces at least one settlement)

A decision log is a **record**. Write it to the implementation's `discussions/` folder:

```text
implementation/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

`implementation/` is a flat, records-only spine node: its `discussions/` and `reviews/` live directly inside it — no lineage folders. The `decision-log` artifact-type suffix is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (decision logs are records; they carry no `version`).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `<spec-slug>-implementation-review` or `<commit-sha-short>-vs-<spec-slug>-review`. Confirm the slug with the user before the first settlement.
- The `discussions/` folder is created on-demand. Do not pre-create empty folders.

The decision log is **append-only**. Each settled finding is appended as one record with a sequential per-log local heading:

```markdown
## P<N>: <Finding title> (<severity> · <axis>)

Decision: <settlement: resolved / rejected / accepted / deferred>

Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first settlement in this log and increments by `1` per settlement IN THIS LOG. The `## P<N>:` IDs are LOCAL to this decision log — not thread-global, not project-global. Cross-log references must include the source log's path.

Resolved AND rejected findings remain in the decision log only. They are NOT carried into the review record — they are already settled and need no further action.

### Review Record (conditional, written ONLY if unresolved actionable findings remain)

A review is a **record** that nests inside the implementation it serves. Write it to the flat `implementation/reviews/` folder:

```text
implementation/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

The `review` artifact-type suffix is MANDATORY (it carries no `version` — reviews are records). The `reviews/` folder is created on-demand.

This artifact is written ONLY at the END of the walk, and ONLY if at least one `accepted` / `deferred` finding remains. **No review record when nothing remains.** If every finding was settled as `resolved` or `rejected`, no review record is written — the decision log is the only artifact, and the closing message states explicitly that no unresolved findings remain.

When written, the review record carries ONLY the unresolved actionable findings, references-first, in this section order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`.

1. **`## References`** — FIRST, before any verdict, naming the implementation under review AND the spec it was judged against at the top. One entry per line as `- <description>: <path>`; each path carries a description, never a bare path list. Within-thread paths are **thread-relative** (e.g. `specs/001/spec.md`, `implementation/discussions/<UTC>-<desc>-decision-log.md`); cross-thread paths are **repo-relative** (e.g. `docs/threads/<other>/...`); **never absolute**. The implementation reference is named by commit SHA / range / branch name with the repo identifier, or by repo-relative path to a saved diff file. Include the spec path, the decision log emitted by this same walk, any decision logs the finding traces to, and any prior reviews on the same implementation.
2. **`## Verdict`** — overall judgment on what remains against the five fidelity axes (typically `partially delivers` or `does not deliver` if findings remain; the record itself never carries a `delivers` verdict because nothing would land in it in that case).
3. **`## Findings`** — only the `accepted` / `deferred` findings, each carrying its severity tag and axis.
4. **`## Evidence`** — for each finding, cite BOTH the diff (file:line) AND the spec section.
5. **`## Open Questions`** — clarifications worth confirming. Frame as questions, not as gaps to autofill. If the test-coverage axis was SKIPPED, this section explicitly notes the skip.
6. **`## Next Actions`** — what to do next for each unresolved finding. Typical actions: re-implement to address `blocker` findings, escalate to general-purpose code review for findings outside the five fidelity axes, route a spec-fault finding back to the human if it traces to spec ambiguity (the spec is fixed via an owner-approved, record-backed amendment — never an edit this skill makes), or open a discussion to settle a specific design question the implementation surfaced.

Resolved and rejected findings are NOT repeated in the review record — they are already settled in the decision log and require no further triage. Never skip `## References`; the implementation and spec are always named.

#### Disposition Frontmatter

A review records its own disposition in its YAML frontmatter, under a `status:` map. **This skill emits the review with NO `status.disposed` field** — a review with no `status.disposed` is **open, mechanically, by parse**. There is no separate "open" marker to set; the absence of the latch is the open state.

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

This skill only EMITS the review (open, with no `status.disposed`). Disposing it is a downstream act, out of scope for this skill.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the implementation reference.** Detect the implementation reference from the user's invocation (git ref / commit range / branch / saved diff path / inline diff body). If the reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. Do not pick by recency or by ref order.

3. **Resolve the spec.** Detect the spec path from the user's request. The spec lives at `specs/NNN[-<desc>]/spec.md`. If unsupplied, vague, or the thread holds multiple spec lineages, ASK which lineage is intended. Do not pick by recency or `NNN`. The spec is MANDATORY — without it, the fidelity axes have nothing to check against, and the user should be directed to a general-purpose code review instead. Optionally read the implementation report under `implementation/` for context.

4. **Read the spec READ-ONLY.** The spec is the contract — this skill reads it but does NOT edit it, does NOT rewrite it, does NOT add or change frontmatter, and does NOT propose edits to the spec body during the walk. Read the spec's `## Degrees of freedom` section — a granted choice is never a deviation.

5. **Inspect the implementation reference READ-ONLY.** Read the diff. DO NOT check out the branch, DO NOT run tests, DO NOT modify the working tree, DO NOT mutate any git state. The walk is read-only against the diff text.

6. **Identify the candidate findings list (or pick the per-acceptance-criterion walk order).** Walk the diff and spec once end-to-end and draft a candidate list of findings tagged by axis (acceptance-criteria coverage / constraint adherence / scope adherence / behavior fidelity / test coverage), each with suggested severity. Cluster related findings rather than fragmenting. Aim for fewer, higher-quality candidates over many minor ones.

7. **Confirm the candidate list (or walk order) with the user before walking.** List the candidates by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing settlements later. If the user adds findings the candidate list missed, fold them in. If the user removes findings as not worth walking, drop them.

8. **For each finding (or acceptance criterion) IN ORDER, run the per-iteration loop from `## Walk Format`.** Surface → cite evidence (BOTH diff and spec) → ASK the user → TEST the user's explanation against BOTH the diff AND the spec (do not just accept) → settle → log. Push back per the `## Anti-Sycophancy Stance` when warranted.

9. **Capture the UTC stamp for the decision log.** When the FIRST settlement lands and the decision log needs to be created, compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing. The decision log is created LAZILY on the first settlement (per `## Decision Log Lazy Creation`).

10. **Append per-settlement records to the decision log.** After each settlement, append a `## P<N>: <Finding title>` record per `## Walk Format` step 6. Tell the user: `Decision saved: <short summary>.`

11. **At the END of the walk: write the review record IF unresolved findings remain.** If at least one `accepted` / `deferred` finding remains, capture the UTC stamp for the review (separate from the decision log's stamp), draft the references-first report covering only the unresolved findings, and write the artifact to `implementation/reviews/<UTC>-<kebab-desc>-review.md`, with NO `status.disposed` field (open by parse). If ALL findings were settled as `resolved` or `rejected`, do NOT write a review record — capturing nothing produces nothing.

12. **Final message.** Cite the decision log path (thread-relative). If the review record was written, cite its path too (thread-relative). If it was NOT written, state explicitly: `No unresolved findings — no review record written.` No closing remark.

## Decision Log Lazy Creation

The decision log is created LAZILY at the FIRST settled finding — not proactively in steps 6 or 7. If the candidate-list confirmation produces no walk (the user decides the candidates are all false positives and aborts) and no findings are settled, NO decision log is written. An interrupted walk with no settled findings leaves no artifact.

A walk that produces no decisions produces no log. The skill keeps state in-session until the first settlement, then creates the log at write time of the first `## P<N>` record.

If the user pauses mid-walk after at least one settlement has landed, the partial decision log is durable: every settlement up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## P<N+k>` record) — the log itself is the state.

## Scope Drift

When the user introduces a branch that is outside the implementation-review walk — a finding about a different implementation, a critique of the upstream spec, a general code-quality observation that doesn't trace to a spec acceptance criterion — do not silently follow them. Propose ONE of:

1. **Split into its own decision log.** When the branch is itself a multi-finding discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` in the appropriate `discussions/` folder. If the branch is "the upstream spec has the same problem", recommend reviewing the spec in a separate session. If the branch is "this code has quality issues independent of the spec", recommend a general-purpose code review instead.
2. **Capture it as a seed for a future thread.** When the branch is a genuinely separate piece of work, name it so it can be opened as its own thread later rather than polluting this review's decision log. Tangential items mid-work route to the implementation report or to a future thread's seed.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the decision log nor the conditional review record. Writing the file is where the skill stops. Any commit is the surrounding session's decision. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under the thread's `.wip/` folder — drafts are editable during the session but are never committed by this skill.

This skill ALSO does not modify the implementation under review. Code modifications belong in a separate implementation pass. If the walk surfaces findings that require code changes, surface them in `## Next Actions` of the review record (when written) or note them in the decision log with a pointer to the needed implementation work — let the surrounding session handle implementation separately on a fresh run.

## Immutability

A decision log is a record; it is **append-only**. Once a `## P<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a decision settles as a NEW `## P<N+k>` record explaining the change — never an in-place edit of an earlier record.

A review is a record. Its **body is frozen at emission** — once written into `implementation/reviews/`, the body is part of the thread's reviewable history and is NOT rewritten. A revision to a review's body is a NEW review record (new UTC stamp, new kebab-desc), not an in-place body edit. The review's **frontmatter `status:` map is a live surface** until the review is disposed: `status.disposed` / `status.disposition` / optional `status.rationale` may be set once when the review is acted on (this skill does not set them — it emits the review open). Once `status.disposed` is set, the frontmatter freezes too.

The spec under review is reviewed READ-ONLY by this skill. Findings that warrant changes to the spec (e.g., spec ambiguity the implementation could not have resolved without inventing details) are surfaced under `## Next Actions` with the recommendation to amend the spec through an owner-approved, record-backed amendment — never an edit this skill makes to the spec.

The implementation reference (the diff / git ref / commit range) is ALSO READ-ONLY for this skill. This skill does NOT modify source code, does NOT check out branches, does NOT mutate git state, and does NOT run tests. Code modifications belong in a separate implementation pass; this skill's role is review only.

No source-relation or lineage frontmatter (`Supersedes:`, `Forked from:`, etc.) is added to any emitted artifact — lineage between the decision log, the review record, the implementation reference, and the spec lives in the `## References` section, not in metadata. The only frontmatter a review carries is its lifecycle `status:` map (and only once disposed); the decision log carries no frontmatter at all.
