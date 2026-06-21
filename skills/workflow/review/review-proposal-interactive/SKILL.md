---
name: review-proposal-interactive
description: Walk a proposal artifact one finding at a time with the user, testing each finding and consistency with the thread's decision logs, then emit a references-first review record into the proposal's reviews/ folder when the user wants the proposal review kept collaborative.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Review Proposal Interactive

This is a LIGHTWEIGHT review — the walk checks for the things a proposal can plausibly miss at its early stage: gaps, risks, ambiguities, and consistency with the thread's decision logs. It stops there. Missing semantic-contract elements (intended outcome, scope/non-scope, acceptance guidance) are not findings against a proposal because a proposal is an early sketch and does not promise to carry them; those belong in a later, heavier review of the spec that follows.

## Anti-Sycophancy Stance

Your job is to help the user reach the right verdict on the proposal, not to make them feel good about whatever it currently says. Treat the per-finding walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **a review is most valuable when it disagrees with the author**. A review whose only effect is to validate the proposal because the author defends it has produced nothing useful; the cheap moment to push back is during the walk, before the proposal is escalated to spec or planning.

Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back. A reviewer who waters down a real finding when the author objects has stopped reviewing and started agreeing. The walk's value sits in the disagreement, not the consensus.

Hold these together:

- **Disagree when you disagree.** If the user's view of a finding conflicts with the evidence in the proposal, your read of the proposal's intent, or the codebase reality, say so plainly before settling. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user dismisses a finding for a reason that doesn't hold up — "the implementer will figure it out", "it's obvious", "we'll deal with it later" — name the gap, surface the assumption, and bring it into the conversation before the finding is settled as `rejected` or `resolved`.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, and alternatives the proposal dismissed too fast — raise them, even if the user wants to move on. Better captured as a finding now than rediscovered in implementation.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the proposal, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a finding's severity, settlement, or wording just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a finding differently, identify the exact assumption or value judgment causing the split, then resolve it before settling the finding.
- **Refuse to log a finding settlement you believe is wrong without flagging it.** If the user insists on settling a finding as `resolved` or `rejected` when you believe it remains actionable, log the settlement they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other settlement> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the review owned by the evidence.** The goal is not for either side to win. The goal is to record settlements that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered. Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back.

If you believe a finding is being dismissed without real reason, refuse to log it silently as `rejected`. Either resolve the disagreement first, or log the dissent verbatim in the rationale line. The cheap moment for the review to do its job is during the walk — once the proposal is escalated to spec or planning, the cost of unflagged findings compounds.

## Inputs

This skill accepts ONE input: a proposal artifact path. A proposal lives inside its **lineage folder** under the thread root:

```text
docs/threads/<thread>/proposals/NNN[-<desc>]/proposal.md
```

where `NNN` is a zero-padded 3-digit lineage sequence (`001`, `002`, …) and `-<desc>` is an optional kebab slug used only to distinguish one lineage from another. The lineage folder (the full path) is the unit of reference — `proposal.md` is meaningless bare. The path may be passed thread-relative or repo-relative.

If the path is not supplied, ASK the user which proposal to review — do not pick by recency or by highest lineage number. If a thread holds multiple proposal lineages (`proposals/001-api/`, `proposals/002-cli/`) and the user's reference is vague ("the proposal", "the latest proposal", "the auth one"), ASK which lineage is intended. There is NO "most recent `NNN`" or "highest number" fallback. Silently picking would hide a real decision — which proposal lineage is meant — behind a sort order.

A proposal lives only inside a `proposals/NNN[-<desc>]/` lineage folder. If the path passed is not a `proposal.md` under such a folder, refuse and ASK the user to confirm — a file elsewhere is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a proposal artifact.

## What This Skill Reviews

A proposal-review pass surfaces these categories of finding:

- **Gaps** — missing intent (what the proposal is trying to do is unclear), missing context (why the proposal is being raised now is unclear), or a rough shape so under-specified that a downstream reader cannot react to it.
- **Risks** — named or unnamed downstream consequences the proposal commits to without acknowledging. Cost, complexity, scope creep, dependency surprises, security or correctness pitfalls implied by the rough shape, breakages of existing behavior the proposal does not flag.
- **Ambiguities** — statements that admit more than one reasonable reading. Soft language ("robust", "scalable", "modern", "clean", "appropriate", "as needed") and any rough shape two different implementers would translate into two different artifacts.
- **Consistency with the thread's decision logs** — part of the standard proposal review. Verify the proposal is consistent with the decision logs already recorded in the thread: no settled decision contradicted, no previously-settled point silently reversed. A proposal that quietly walks back a decision the thread already settled is a finding, and the contradicting decision log is the evidence.

This is a LIGHTWEIGHT review — gaps, risks, ambiguities, and decision-log consistency only. Heavier checks (semantic-contract coverage, source-spec adherence, code-vs-original-intent fidelity, general-purpose code quality) belong in downstream reviews of the spec, plan, and implementation that follow. A finding that escalates beyond these categories is out of scope here — flag it as a suggestion for a later, heavier review rather than performing the heavier check inline.

## Walk Format

The walk presents the candidate findings list to the user up front (after the skill identifies it), then walks one finding at a time. The per-finding loop follows a four-element pattern — Surface / Evidence / Ask / Test — adapted for review settlements:

For each finding (or topic, or component — grain is the executor's discretion, but each loop iteration must settle ONE thing):

1. **Surface the finding.** State the finding with its severity tag — suggested vocabulary `blocker` (the proposal cannot reasonably escalate downstream without addressing this), `issue` (the proposal can escalate, but a downstream reader will hit confusion), `nit` (worth flagging but not blocking). State its category (gap / risk / ambiguity / decision-log inconsistency). State why it matters for whoever picks up the proposal next.
2. **Cite the evidence.** Quote the proposal section heading or a short passage (≤ one sentence) the finding is grounded in; for a decision-log inconsistency, cite the contradicting decision-log entry. Reference, do not recite — do not paste large blocks of the proposal back.
3. **ASK the user for their view.** Open the loop with a question that gives the user room to answer: "What's your read on this?" / "Does the proposal already cover this somewhere I missed?" / "How does this land for you?". Accept the user's freeform answer.
4. **TEST the user's explanation against the proposal artifact.** Re-read the cited section. Check whether the user's framing actually resolves the finding or merely defends it. Look for: (a) a section of the proposal you missed that genuinely covers the finding, (b) an upstream decision log the proposal cites that the user can point to, (c) context the user has but the proposal does not record. ASK the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that resolves the finding IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails.
5. **Settle the finding** as one of:
   - `resolved` — the proposal already covers the finding (a section the reviewer missed), OR the user's clarification points to an upstream artifact (a decision log, prior proposal, settled context) that genuinely resolves it. Does not appear in the emitted review report.
   - `rejected` — the finding is not actually a finding (false positive from the candidate-list draft). Does not appear in the emitted review report.
   - `actionable` — the finding is genuine and the proposal needs to address it (typically by revising the proposal, opening a discussion, or escalating to spec). Appears in the emitted review report.
   - `deferred` — the finding is genuine but the user wants to park it for later (out of scope for this review run; address in a future revision or a future review). Appears in the emitted review report, noted as deferred.
6. **Note the settlement in-session.** Keep the per-finding outcome (settlement, severity, category, rationale, any dissent per the `## Anti-Sycophancy Stance`) in working memory through the walk; it feeds the report's `## Findings` and `## Next Actions` at the end. Tell the user: `Settled: <finding title> — <settlement>.`
7. **Move to the next finding.** Do not move on while the current finding is still ambiguous — settle it cleanly first. Silence is not a settlement.

If a finding splits into sub-findings during the walk (e.g., a "risk" that turns out to be two unrelated risks once examined), settle each sub-finding separately rather than collapsing them.

## Report Format — References-First

This skill emits ONE review **record** at the end of the walk, organized **references-first**: a `## References` section comes FIRST, naming the artifact under review BEFORE any verdict. The review carries the settled walk: the actionable and deferred findings are the report's findings; resolved and rejected findings do not appear (they were settled away during the walk and need no further action). The body MUST cover the following six sections in this exact order:

1. **`## References`** — list every artifact the review reads or depends on, naming the proposal under review FIRST. Format each entry as `- <description>: <path>`. Each path carries a description — never emit a bare path list. Use **thread-relative** paths for artifacts within the same thread (e.g. `proposals/001/proposal.md`, `proposals/001/discussions/<UTC>-<desc>-decision-log.md`), and **repo-relative** paths for cross-thread artifacts (e.g. `docs/threads/<other>/…`). **Never absolute.** Include the proposal path, any decision logs the consistency check relied on, and any prior reviews on the same proposal.
2. **`## Verdict`** — overall judgment on the proposal given the walk's settlements. Suggested vocabulary (executor MAY refine): `ready` (no actionable findings remain; the proposal can escalate as-is), `partially ready` (some actionable findings remain; specify which), `not ready` (substantial revision needed first). One overall verdict plus a one-line tether to the highest-impact remaining finding.
3. **`## Findings`** — only the `actionable` and `deferred` findings from the walk, each carrying its severity tag and category. Mark deferred findings as such. Resolved and rejected findings are NOT included.
4. **`## Evidence`** — proposal section heading or short quote for each finding above; for a decision-log inconsistency, the contradicting decision-log entry.
5. **`## Open Questions`** — clarifications worth confirming. Frame as questions, not as gaps to autofill.
6. **`## Next Actions`** — what to do next for each remaining finding. Typically: revise the proposal in place (it is a versioned artifact, alive while in flight — see `## Immutability`), open a dedicated discussion, escalate to spec, or run a dedicated adversarial pressure pass (see `## Adversarial Pass Delegation`).

Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. The single exception is `## References`, which is mandatory and always comes first. Do NOT collapse two sections into one.

## Output Artifact

A proposal review is a **record** that lands in the **target proposal's own `reviews/` folder**:

```text
docs/threads/<thread>/proposals/NNN[-<desc>]/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

The review nests inside the proposal lineage folder it serves — records attach to the spine node they serve. There is NO inbox and NO open/processed/dropped lifecycle; nothing is moved between folders to express status (see `## Disposition`).

- The `review` artifact-type token is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (`v<N>`) because reviews are records, not versioned artifacts.
- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `<proposal-slug>-review` or a phrase capturing the review topic. Confirm the slug with the user before writing.
- The proposal's `reviews/` folder is created on-demand. Do not pre-create empty folders.

Example path:

```text
docs/threads/260518200115Z-auth/proposals/001/reviews/260521101212Z-auth-flow-review.md
```

The review record always carries the full six-section references-first report. If every finding was settled as `resolved` or `rejected` during the walk, the report still gets written: `## Verdict` reads `ready`, `## Findings` is empty (drop the heading), and the closing message states that no actionable findings remain. A walk that produces only resolved/rejected findings can be disposed `accepted` at emission (see `## Disposition`) — there is nothing left to act on.

## Disposition

A review carries its own **disposition** — accepted or rejected — in its YAML frontmatter, under a `status:` map. A review with **no `status.disposed` field is open**, mechanically, by parse. There is no folder move and no separate disposing record; status is read from frontmatter, never from a folder location. The shape, set once:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>   # optional
```

Because this walk reaches an agreed conclusion with the user, ASK whether to dispose the review at emission, or leave it open:

- **Leave open** (no `status.disposed`): emit the review with **no frontmatter at all** (a record with no lifecycle status of its own carries no frontmatter). Someone disposes it later. This is the right default when actionable findings remain that the user has not yet decided how to handle.
- **Accept-and-revise**: if the user accepts the review's findings and will revise the proposal, set `disposition: accepted` — the revision of the proposal IS the record; no separate accepting document is required.
- **Reject**: if the user rejects the review's findings, set `disposition: rejected` — no separate disposing document is required.

The optional `rationale` is a thread-relative path to a discussion or decision log capturing the reasoning; a discussion no longer owns disposition, it is only the optional linked rationale. If the walk warranted recording the settlement reasoning, emit a `decision-log` record in the proposal lineage's `discussions/` folder (`docs/threads/<thread>/proposals/NNN[-<desc>]/discussions/<UTC>-<kebab-desc>-decision-log.md`) and point `rationale` at it (thread-relative).

Disposition is **set-once**: changing your mind is a new review or a thread reopen, not a frontmatter flip-flop. Set it (or leave it open) once at emission; do not flip it on a later invocation.

## Adversarial Pass Delegation

Adversarial pressure on a proposal — pre-mortem analysis, devil's-advocate cross-examination, "what's missing that would kill this" framing — is out of scope for this skill. This skill does NOT perform an adversarial pass during the walk.

If during the walk the user wants to surface adversarial findings beyond the standard gaps/risks/ambiguities/decision-log pass, suggest running a separate adversarial pass after the walk closes. The walk continues with the standard settlements; any adversarial pass happens outside this walk. Cite any resulting adversarial artifact under `## References` in a subsequent review run if the user wants those findings folded into a future review record.

This skill does NOT mark a proposal as "fully reviewed" just because the walk produced settlements. A proposal that has had a collaborative review pass but not an adversarial pass is still missing that layer — flag that in `## Next Actions` if the proposal is high-stakes enough to warrant it.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the proposal artifact.** Detect the proposal path from the user's invocation. If the path is unsupplied, vague ("the proposal"), or multiple proposal lineages exist under `docs/threads/<thread>/proposals/`, ASK the user which lineage is intended. Do not pick by recency or highest `NNN`. Confirm the resolved path before reading.

3. **Read the proposal READ-ONLY.** A proposal is a versioned artifact, alive in flight; this skill reviews it but does NOT edit it, does NOT rewrite it, does NOT touch its frontmatter, and does NOT propose edits to the proposal body during the walk.

4. **Read the thread's decision logs.** To run the consistency-with-decision-logs check, locate the relevant decision logs in the thread (the proposal lineage's `discussions/`, and any other discussions that settled decisions bearing on this proposal). Note any contradiction or silent reversal as a candidate finding.

5. **Identify the candidate findings list.** Walk the proposal once end-to-end and draft a candidate list of findings tagged gap / risk / ambiguity / decision-log inconsistency with suggested severity. Cluster related findings rather than fragmenting. Aim for fewer, higher-quality candidates over many minor ones.

6. **Confirm the candidate findings list with the user before walking.** List the candidates by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing settlements later. If the user adds findings the candidate list missed, fold them in. If the user removes findings as not worth walking, drop them.

7. **For each finding IN ORDER, run the per-finding loop from `## Walk Format`.** Surface → cite evidence → ASK the user → TEST the user's explanation against the artifact (do not just accept) → settle → note in-session. Push back per the `## Anti-Sycophancy Stance` when warranted.

8. **At the END of the walk: draft the references-first review report.** Capture the 12-character `YYMMDDHHMMSSZ` stamp at write time (stamp once, never re-derive). Compose the six sections in order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`. References comes first and names the proposal under review before any verdict. The report carries only the `actionable` and `deferred` findings; resolved and rejected findings do not appear.

9. **Decide disposition.** ASK whether to dispose the review at emission (`accepted` / `rejected`) or leave it open, per `## Disposition`. If a `rationale` discussion/decision-log is warranted, emit it in the proposal lineage's `discussions/` folder and point `rationale` at it (thread-relative).

10. **Write the review artifact.** Create `docs/threads/<thread>/proposals/NNN[-<desc>]/reviews/<UTC>-<kebab-desc>-review.md`. The `review` artifact-type suffix is MANDATORY. The proposal's `reviews/` folder is created on-demand. If left open, the review carries no frontmatter; if disposed, it carries the `status:` map per `## Disposition`.

11. **Final message.** Cite the review path (thread-relative). If a rationale decision log was written, cite its path too. State the disposition (open / accepted / rejected). If no actionable findings remained, say so explicitly: `No actionable findings — proposal review is clean.` No closing remark.

## Scope Drift

When the user introduces a branch that is outside the proposal-review walk — a finding about a different proposal lineage, a tangent about the process being used, a refactor idea unrelated to the proposal's intent — do not silently follow them and do not let the walk grow into a different shape than the one being discussed. Propose ONE of:

1. **Capture as a seed for a future thread** (PREFERRED for non-blocking side-findings unrelated to this proposal). A tangential item that deserves its own work later becomes the genesis of a separate thread, not clutter in this review. (There is no inbox; tangential items are served by a future thread's seed or by a tracker ticket.)
2. **Split into its own discussion.** When the branch is itself a multi-point discussion that deserves its own walk, start a new `decision-log` discussion in the proposal lineage's `discussions/` folder for it.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the review record nor any rationale decision log it writes. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session but are never committed by this skill.

## Immutability

A review is a **record**. Its body is frozen at emission — once written into the proposal's `reviews/` folder, the body is part of the thread's reviewable history and is NOT edited. A revision to a review's findings is a NEW review record (new UTC stamp, new kebab-desc), not an in-place body edit. The one carve-out is the review's own frontmatter `status:` map: it is a live surface until the review is disposed (then it freezes too), and **disposition is set-once** — changing your mind is a new review or a thread reopen, never a frontmatter flip-flop.

Any rationale `decision-log` this skill emits is also a record: append-only and immutable. Once a decision record is written, it is NOT edited; a revision settles as a NEW record explaining the change.

The proposal under review is a **versioned artifact** — alive while in flight, edited in place through review→revise cycles, and frozen only at its own `status.approved` (or `status.rejected`) latch. The reviewer reads READ-ONLY and does NOT edit the proposal. Findings that warrant revisions are surfaced under `## Next Actions` with the recommendation to revise the proposal in place (if still in flight) or, once it is `approved`/`rejected` and therefore frozen, to open a new lineage — never an instruction for this skill to edit the proposal itself.

No source-relation or lineage frontmatter is added to any emitted artifact (no `Supersedes:`, `Reviews:`, etc.) — the only frontmatter a review ever carries is the lifecycle `status:` map once disposed, and a decision log carries none. Lineage between the review, any rationale decision log, and the proposal they serve lives in the `## References` section (by thread-relative path) and in the artifacts' locations (inside that proposal lineage's folders), not in metadata on the files.
