---
name: review-spec-interactive
description: Walk a spec artifact one element or finding at a time with the user, testing it against all eight semantic-contract elements and consistency with the thread's decision logs, and capturing the resolved-vs-unresolved split when the user wants a collaborative spec review.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.1
---

# Review Spec Interactive

Walk a spec artifact READ-ONLY one element (or one candidate finding) at a time with the user, ASK the user for their view on each element/finding AND TEST that view against the spec, settle each finding as resolved / rejected / accepted / deferred, append per-finding records to a decision log under the active thread's `discussions/` folder, and — only if unresolved actionable findings remain at the end of the session — emit a references-first review record into the target spec's `reviews/` folder.

This skill applies the **HANDOFF-GRADE BAR** — the bar that a downstream implementer with no prior context can deliver the same work the author had in mind by reading the spec alone. The spec must cover the eight semantic-contract elements enumerated below AND stay consistent with the thread's decision logs. A spec that does not cover one of the elements — or covers it ambiguously enough that two different implementers would build two different things, or contradicts a settled decision — fails the bar. The cheap moment to push back is during this walk — bad design captured into the spec becomes expensive in the implementation phase, where unflagged ambiguity compounds.

## Anti-Sycophancy Stance

Your job is to help the user reach the right verdict on the spec against the handoff-grade bar, not to make them feel good about whatever the spec currently says. Treat the per-finding walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **a review is most valuable when it disagrees with the author**. A review whose only effect is to validate the spec because the author defends it has produced nothing useful; the cheap moment to push back is during the walk, before the spec is escalated to planning or implementation. Bad design captured in the spec becomes expensive in the implementation phase because the downstream consumers — humans and agents — will not have you to ask follow-ups. This is the last cheap moment.

This is the review stance: push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back. A reviewer who waters down a real finding when the author objects has stopped reviewing and started agreeing. The walk's value sits in the disagreement, not the consensus.

Hold these together:

- **Disagree when you disagree.** If the user's view of a finding conflicts with the evidence in the spec, your read of the spec's intended outcome, the thread's decision logs, or the codebase reality, say so plainly before settling. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user dismisses a finding for a reason that doesn't hold up — "the implementer will figure it out", "it's obvious", "we'll deal with it later" — name the gap, surface the assumption, and bring it into the conversation before the finding is settled as `rejected` or `resolved`. A future implementer who has never seen this conversation will not "figure it out" — that is precisely the bar this review enforces.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, alternatives the spec dismissed too fast — raise them, even if the user wants to move on. Better captured as a finding now than rediscovered during implementation, where the cost compounds.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the spec, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a finding's severity, settlement, or wording just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a finding differently, identify the exact assumption or value judgment causing the split, then resolve it before settling the finding.
- **Refuse to log a finding settlement you believe is wrong without flagging it.** If the user insists on settling a finding as `resolved` or `rejected` when you believe it remains actionable, log the settlement they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other settlement> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the review owned by the evidence.** The goal is not for either side to win. The goal is to record settlements that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered. Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back.

If you believe a finding is being dismissed without real reason, refuse to log it silently as `rejected`. Either resolve the disagreement first, or log the dissent verbatim in the rationale line. The cheap moment for the review to do its job is during the walk — once the spec is escalated to planning, the cost of unflagged findings compounds, and once it is escalated to implementation, the cost becomes irreversible.

## Inputs

This skill accepts ONE input: a spec artifact path. A spec lives at `specs/NNN[-<desc>]/spec.md` inside the thread root. The path may be passed thread-relative or repo-relative.

If the path is not supplied, ASK the user which spec to review — do not pick by recency. If the thread holds multiple spec lineages (`specs/001-api/`, `specs/002-cli/`) and the user's reference is vague ("the spec", "the auth spec"), ASK which lineage is intended — never silently pick the lowest or highest `NNN`. Each lineage holds exactly one alive `spec.md` whose version lives in its frontmatter, so "which version" never arises — but "which lineage" can, and silently picking would hide a real decision (which lineage variant the user intends to review) behind a sort order. If the reference could point at a spec in another thread, ASK which thread.

The literal folder `specs/NNN[-<desc>]/` is the canonical location spec artifacts land in. If the path passed is not a `spec.md` under a `specs/` lineage folder, refuse and ASK the user to confirm — a spec not in `specs/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually an emitted spec.

## Eight Semantic-Contract Elements

A spec MUST cover all EIGHT of the following elements in its body. This skill checks every one of them against the handoff-grade bar:

1. **Intended outcome** — what the spec, when implemented, produces for the user.
2. **Context** — why this is being built; what came before; what triggered the spec.
3. **Scope / non-scope** — the boundary statement, INCLUDING what is explicitly out.
4. **Expected behavior** — the observable behaviors a future executor needs.
5. **Constraints** — tech, repo, harness, and safety constraints that bind the implementation.
6. **Explicit decisions** — settled trade-offs INLINED where operative, with citations back to source decision logs by decision identifier.
7. **Unresolved questions** — open issues that do NOT block emission. Present and named openly.
8. **Acceptance guidance** — how a reviewer will know the implementation is right.

The spec body's structure, section names, and ordering are at the spec author's discretion — what is NOT at their discretion is that every one of the eight elements must appear in the body so the spec reads as handoff-grade. This skill's job is to verify that obligation has been met during the walk.

**Severity mapping** (suggested; executor may refine):

- A **missing** element is a `blocker` — the spec cannot reasonably be handed downstream without it.
- A **partially-covered** element is an `issue` — the spec can be handed downstream, but the implementer will hit a wall on the missing sub-aspect.
- A **vague-but-present** element is a `nit` — the element is named but the prose is soft enough that two implementers would translate it differently (false precision: "robust", "scalable", "modern", "clean", "appropriate", "as needed" — common red flags).

These three severity tags — `blocker`, `issue`, `nit` — are the standard for the references-first report.

## What This Skill Reviews

Beyond the per-element check, the broader pass surfaces gaps, ambiguities, contradictions, hidden assumptions, false precision, and unjustified absolutes. Tether every finding to **downstream impact**. "This is vague" is not a finding — "this is vague, and a downstream implementer would have to guess whether X means A or B" is.

Part of the standard review is also the **consistency-with-decision-logs check** (see `## Consistency With Decision Logs` below): the spec must be consistent with the thread's decision logs, not just internally coherent.

This skill does NOT promise: source-spec adherence checks on a plan, code-vs-original-intent fidelity checks on an implementation, general-purpose code review, or the lightweight review for an early proposal sketch.

## Consistency With Decision Logs

Part of the standard spec review is verifying that the spec is consistent with the thread's decision logs — not just internally coherent. Read the thread's decision-log records (typically under `specs/<lineage>/discussions/`, `proposals/<lineage>/discussions/`, or `seed/discussions/`; filename token `decision-log`) and, during the walk, raise as candidate findings any place where:

- **A settled decision is contradicted.** If a decision log settled a trade-off one way and the spec commits to the opposite, that contradiction is a candidate finding (typically `blocker` or `issue`).
- **A settled point is silently reversed.** If the spec quietly drops or inverts something the thread already decided, without naming the reversal, that is a candidate finding. A reversal may be legitimate, but it must be explicit and traceable.

Walk each such candidate like any other finding (surface → cite evidence → ASK → TEST → settle). The user may point to a decision the reviewer missed, or confirm the inconsistency is real. Cite the specific decision-log record and decision identifier in the evidence and references.

## Walk Format

The walk presents the candidate findings list (or the per-element walk order) to the user up front, then walks one finding (or one element) at a time. The grain of the walk — per-finding or per-element — is the executor's discretion; the requirement is that each loop iteration settles ONE thing. The recommended default is per-element (the eight semantic-contract elements in order, plus any decision-log-consistency findings), because that order matches the spec author's walk shape and produces a natural cross-reference between the original spec authoring conversation and the review walk.

For each iteration (finding, or element):

1. **Surface the finding (or element).** State the finding with its severity tag — `blocker` (the spec cannot reasonably be handed downstream without addressing this; typically a missing semantic-contract element or a contradicted decision), `issue` (the spec can be handed downstream, but a downstream implementer will hit a wall on the missing sub-aspect; typically a partially-covered element), `nit` (worth flagging but not blocking; typically a vague-but-present element or soft language). State which of the eight elements it concerns (or whether it is a cross-element finding such as a contradiction or a decision-log inconsistency). State why it matters for whoever picks up the spec next.
2. **Cite the evidence.** Quote the spec section heading or a short passage (≤ one sentence) the finding is grounded in. Reference, do not recite — do not paste large blocks of the spec back. If the finding is "missing element X", state explicitly which sections of the spec WOULD have housed it. For a decision-log inconsistency, cite both the spec passage and the conflicting decision-log record.
3. **ASK the user for their view.** Open the loop with a question that gives the user room to answer: "What's your read on this?" / "Does the spec already cover this somewhere I missed?" / "Is this an unresolved-question worth flagging, or is it already settled elsewhere?". Accept the user's freeform answer.
4. **TEST the user's explanation against the spec artifact (and the decision logs).** Re-read the cited section (or the section the user points to). Check whether the user's framing actually resolves the finding or merely defends it. Look for: (a) a section of the spec you missed that genuinely covers the element, (b) a decision-log citation that genuinely settles the question, (c) context the user has but the spec does not record (which is itself a finding: the spec did not capture it, so a downstream implementer cannot recover it). ASK the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that resolves the finding IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails.
5. **Settle the finding.** Together, settle as one of:
   - `resolved` — the spec already covers the element / finding (a section the reviewer missed), OR the user's clarification points to an upstream artifact (a decision log cited by its decision identifier, a settled discussion) that genuinely resolves it. Settlement stays in the decision log only.
   - `rejected` — the finding is not actually a finding (false positive from the candidate-list draft; e.g., the reviewer misread the element as missing when it was present under an unconventional section name). Settlement stays in the decision log only.
   - `accepted` — the finding is genuine and actionable; it will need to be addressed (typically by revising the spec in place, opening a discussion to settle the open question, or running an adversarial review pass). Lands in the review record emitted at end-of-session.
   - `deferred` — the finding is genuine but the user wants to park it for later (out of scope for this review run; address in a future revision or a future review). Lands in the review record emitted at end-of-session.
6. **Append a record to the decision log.** Use the `## P<N>: <Finding title>` shape. `Decision: <settlement>` and `Rationale: <one or two sentences>`. Include the severity tag and the element (or category) in the title or rationale so the decision log carries the per-finding outcome legibly. If the settlement included a dissent per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim.
7. **Move to the next finding (or element).** Do not move on while the current finding is still ambiguous — settle it cleanly first. Silence is not a settlement.

If a finding splits into sub-findings during the walk (e.g., the "scope/non-scope" element finding turns out to be one missing-non-scope sub-finding plus one false-precision-in-scope sub-finding), settle each sub-finding as its own `## P<N>` record rather than collapsing them.

## Output Artifacts

This skill produces UP TO TWO artifacts. The decision log is the primary deliverable; the review record is conditional.

### Decision Log (primary, written when the walk produces at least one settlement)

A decision log is a **record**. Write it to the spec's `discussions/` folder:

```text
specs/NNN[-<desc>]/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

The `decision-log` artifact-type suffix is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (decision logs are records, not versioned artifacts; they carry no `version`).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `<spec-slug>-review` or `spec-review-<topic>` capturing the review topic. Confirm the slug with the user before the first settlement.
- The spec's `discussions/` folder is created on-demand. Do not pre-create empty folders.

The decision log is **append-only**. Each settled finding is appended as one record with a sequential per-log local heading:

```markdown
## P<N>: <Finding title> (<severity> · <element or category>)

Decision: <settlement: resolved / rejected / accepted / deferred>

Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first settlement in this log and increments by `1` per settlement IN THIS LOG. The `## P<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's path.

Resolved AND rejected findings remain in the decision log only. They are NOT carried into the review record — they are already settled and need no further action.

### Review Record (conditional, written ONLY if unresolved actionable findings remain)

A review is a **record** that nests inside the spec it serves. Write it to the target spec's `reviews/` folder:

```text
specs/NNN[-<desc>]/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

The `review` artifact-type suffix is MANDATORY (it carries no `version` — reviews are records). The `reviews/` folder is created on-demand.

This artifact is written ONLY at the END of the walk, and ONLY if at least one `accepted` / `deferred` finding remains. **No review record if nothing remains.** If every finding was settled as `resolved` or `rejected`, no review record is written — the decision log is the only artifact, and the closing message states explicitly that no unresolved findings remain. Capturing nothing produces nothing.

When written, the review record carries ONLY the unresolved actionable findings, references-first, in this section order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`.

1. **`## References`** — FIRST, before any verdict, naming the spec under review at the top. One entry per line as `- <description>: <path>`; each path carries a description, never a bare path list. Within-thread paths are **thread-relative** (e.g. `specs/001/spec.md`, `specs/001/discussions/<UTC>-<desc>-decision-log.md`); cross-thread paths are **repo-relative** (e.g. `docs/threads/<other>/...`); **never absolute**. Include the spec path under review, the decision log emitted by this same walk, any decision logs the spec was checked against (with decision identifiers), and any prior reviews on the same spec.
2. **`## Verdict`** — overall judgment on what remains against the handoff-grade bar (typically `partially ready` or `not ready` if findings remain; the record never carries a `ready` verdict because nothing would land in it in that case).
3. **`## Findings`** — only the `accepted` / `deferred` findings, each carrying its severity tag and element (or category).
4. **`## Evidence`** — spec section heading or short quote for each finding; for a decision-log inconsistency, cite both the spec passage and the conflicting decision-log record.
5. **`## Open Questions`** — clarifications worth confirming. Frame as questions, not as gaps to autofill.
6. **`## Next Actions`** — what to do next for each unresolved finding. Typically: revise the spec in place to address the findings, open a discussion to settle open questions, or run a separate adversarial review pass for high-stakes specs.

Resolved and rejected findings are NOT repeated in the review record — they are already settled in the decision log and require no further triage. Never skip `## References`; the spec under review is always named.

#### Disposition Frontmatter

A review records its own disposition in its YAML frontmatter, under a `status:` map. **This skill emits the review with NO `status.disposed` field** — a review with no `status.disposed` is **open, mechanically, by parse**. There is no separate "open" marker to set; the absence of the latch is the open state.

When the review is later acted on, its disposition is recorded directly in this same frontmatter, set once:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>   # optional
```

- **Accept-and-revise** sets the frontmatter directly — the **revision of the spec is the record**; no separate disposing document is written.
- **Reject** sets the frontmatter with **no document at all** — no separate disposing record is required.
- The optional `rationale` is a thread-relative path to a discussion, if one happened. A discussion never owns the disposition — the frontmatter does.
- Disposition is **set-once**: changing your mind is a new review or a thread reopen, not a frontmatter flip-flop.

This skill only EMITS the review (open, with no `status.disposed`). Disposing it is a downstream act, out of scope for this skill.

## Adversarial Review

Adversarial pressure on a spec — pre-mortem analysis, devil's-advocate cross-examination, "what's missing that would kill this" framing — is outside this walk. This skill does NOT perform an adversarial pass during the walk.

If during the walk the user wants to surface adversarial findings beyond the standard pass, suggest handling that as a separate review pass after the walk closes. Cite any resulting adversarial-review artifact under `## References` in a subsequent review run if the user wants those findings folded into a future review record.

This skill does NOT reimplement adversarial-review logic and does NOT mark a spec as "fully reviewed" just because the walk produced settlements. A spec that has had a standard review pass but not an adversarial pass is still missing that layer — flag it in `## Next Actions` if the spec is high-stakes enough to warrant it.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the spec artifact.** Detect the spec path from the user's invocation. If the path is unsupplied, vague ("the spec"), or the thread holds multiple spec lineages, ASK the user which lineage is intended. Do not pick by recency or `NNN`. Confirm the resolved path before reading.

3. **Read the spec READ-ONLY.** This skill reads the spec but does NOT edit it, does NOT rewrite it, does NOT add or change its frontmatter, and does NOT propose edits to the spec body during the walk.

4. **Read the thread's decision logs READ-ONLY.** Locate the thread's `decision-log` records and read them so the consistency-with-decision-logs check can contribute candidate findings. If no decision logs exist, note that and skip the check.

5. **Identify the candidate findings list (or pick the per-element walk order).** Walk the spec once end-to-end and draft a candidate list of findings tagged by element with suggested severity (including any decision-log-consistency findings), OR pick the per-element walk order (the eight semantic-contract elements in their canonical sequence, plus the decision-log-consistency check). The recommended default is per-element. Cluster related findings rather than fragmenting. Aim for fewer, higher-quality candidates over many minor ones.

6. **Confirm the candidate list (or walk order) with the user before walking.** List the candidates (or the element walk order) by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing settlements later. If the user adds findings the candidate list missed, fold them in. If the user removes findings as not worth walking, drop them.

7. **For each finding (or element) IN ORDER, run the per-iteration loop from `## Walk Format`.** Surface → cite evidence → ASK the user → TEST the user's explanation against the artifact (do not just accept) → settle → log. Push back per the `## Anti-Sycophancy Stance` when warranted.

8. **Capture the UTC stamp for the decision log.** When the FIRST settlement lands and the decision log needs to be created, compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing. The decision log is created LAZILY on the first settlement (per `## Decision Log Lazy Creation`).

9. **Append per-settlement records to the decision log.** After each settlement, append a `## P<N>: <Finding title>` record per `## Walk Format` step 6. Tell the user: `Decision saved: <short summary>.`

10. **At the END of the walk: write the review record IF unresolved findings remain.** If at least one `accepted` / `deferred` finding remains, capture the UTC stamp for the review (separate from the decision log's stamp), draft the references-first report covering only the unresolved findings, and write the artifact to `specs/NNN[-<desc>]/reviews/<UTC>-<kebab-desc>-review.md` under the target spec's lineage folder, with NO `status.disposed` field (open by parse). If ALL findings were settled as `resolved` or `rejected`, do NOT write a review record — capturing nothing produces nothing.

11. **Final message.** Cite the decision log path (thread-relative). If the review record was written, cite its path too (thread-relative). If it was NOT written, state explicitly: `No unresolved findings — no review record written.` No closing remark.

## Decision Log Lazy Creation

The decision log is created LAZILY at the FIRST settled finding — not proactively in steps 5 or 6. If the candidate-list confirmation produces no walk (the user decides the candidates are all false positives and aborts) and no findings are settled, NO decision log is written. An interrupted walk with no settled findings leaves no artifact.

A walk that produces no decisions produces no log. The skill keeps state in-session until the first settlement, then creates the log at write time of the first `## P<N>` record.

If the user pauses mid-walk after at least one settlement has landed, the partial decision log is durable: every settlement up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## P<N+k>` record) — the log itself is the state.

## Scope Drift

When the user introduces a branch that is outside the spec-review walk — a finding about a different spec, a tangent about the process being used, a refactor idea unrelated to the spec's intent — do not silently follow them and do not let the walk grow into a different shape than the one being discussed. Propose ONE of:

1. **Split into its own decision log.** When the branch is itself a multi-finding discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` in the appropriate `discussions/` folder for it.
2. **Capture it as a seed for a future thread.** When the branch is a genuinely separate piece of work, name it so it can be opened as its own thread later rather than polluting this review's decision log.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the decision log nor the (conditional) review record. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under the thread's `.wip/` folder — drafts are editable during the session but are never committed by this skill.

## Immutability

A decision log is a record; it is **append-only**. Once a `## P<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a decision settles as a NEW `## P<N+k>` record explaining the change — never an in-place edit of an earlier record. The log itself is the state — there is no separate state file, no progress tracker.

A review is a record. Its **body is frozen at emission** — once written into the spec's `reviews/` folder, the body is part of the thread's reviewable history and is NOT rewritten. A revision to a review's body is a NEW review record (new UTC stamp, new kebab-desc), not an in-place body edit. The review's **frontmatter `status:` map is a live surface** until the review is disposed: the `status.disposed` / `status.disposition` / optional `status.rationale` entries may be set once when the review is acted on (this skill does not set them — it emits the review open). Once `status.disposed` is set, the frontmatter freezes too.

The spec under review is reviewed READ-ONLY by this skill. Findings that warrant changes to the spec are surfaced under `## Next Actions`; whether and how the spec is revised in place is a downstream decision recorded by setting the review's disposition frontmatter (accept-and-revise) — never an edit this skill makes to the spec.

No source-relation or lineage frontmatter (`Supersedes:`, `Forked from:`, etc.) is added to any emitted artifact — lineage between the decision log, the review record, and the spec they reference lives in the `## References` section, not in metadata. The only frontmatter a review carries is its lifecycle `status:` map (and only once disposed); the decision log carries no frontmatter at all.
