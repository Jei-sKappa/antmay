---
name: review-proposal-interactive
description: Walk a V1 proposal artifact at `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md` one finding at a time — ASKING the user for their view AND TESTING that view against the proposal — and write a decision log to `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`, dumping ONLY unresolved actionable findings to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` at the END of the session (no Inbox file if nothing remains). Use when you want to think the proposal review through collaboratively with the agent and have the resolved-vs-unresolved split captured for you — not when you want autonomous end-to-end review (use `review-proposal-auto` for that), and not when you want adversarial pressure on the proposal (delegate to the external `the-fool` skill per V1 review-family policy).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Proposal Interactive

Walk a V1 proposal artifact READ-ONLY one finding at a time with the user, ASK the user for their view on each finding AND TEST that view against the proposal, settle each finding as resolved / rejected / accepted / deferred / parked, append per-finding records to a decision log under the active thread's `discussions/` folder, and — only if unresolved actionable findings remain at the end of the session — dump those to an `inbox/open/` review-finding artifact. This skill is the collaborative half of the V1 proposal-review pair. For end-to-end autonomous review with no per-finding walk, use the sibling skill `review-proposal-auto` instead.

`review-proposal-interactive` is one of TEN V1 review skills, paired across five review targets — proposal, spec, plan, implementation, code — each with an `-auto` and an `-interactive` variant. Two axes are independent: the REVIEW TARGET (proposal here; spec / plan / implementation / code in the other four pairs) and the AUTONOMY axis (collaborative here; autonomous in the sibling). The review target this skill addresses is the PROPOSAL — a freeform artifact under the thread's `proposals/` folder emitted by `skills/propose-auto/SKILL.md` or `skills/propose-interactive/SKILL.md`. The stricter bar for a spec ready to be handed downstream lives in `review-spec-auto` and `review-spec-interactive` — NOT here; this skill performs a LIGHTWEIGHT proposal review per V1 review-family policy [D81].

The LIGHTWEIGHT framing matters: a proposal is an early sketch, not a downstream handoff document. The walk checks for the three things a proposal can plausibly miss at its stage — gaps, risks, ambiguities — and stops there. Missing semantic-contract elements (intended outcome, scope/non-scope, acceptance guidance) are not findings against a proposal because a proposal does not promise to carry them; those surface against the SPEC that comes after, in `review-spec-*`.

## Anti-Sycophancy Stance

Your job is to help the user reach the right verdict on the proposal, not to make them feel good about whatever it currently says. Treat the per-finding walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **a review is most valuable when it disagrees with the author**. A review whose only effect is to validate the proposal because the author defends it has produced nothing useful; the cheap moment to push back is during the walk, before the proposal is escalated to spec or planning.

This is the V1 review stance: push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back. A reviewer who waters down a real finding when the author objects has stopped reviewing and started agreeing. The walk's value sits in the disagreement, not the consensus.

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

This skill accepts ONE input: a V1 proposal artifact path under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md` per the V1 record-form grammar at `docs/workflow/v1/filename-grammar.md`. The path may be passed absolute or relative to the repo root.

If the path is not supplied, ASK the user which proposal to review — do not pick by recency. If multiple plausible proposal artifacts exist in `docs/threads/<thread>/proposals/` and the user's reference is vague ("the proposal", "the latest proposal", "the auth one"), ASK the user which artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is NO global "latest proposal" algorithm. Silently picking the most recent file would hide a real decision — which proposal won, which variant survived discussion — behind a sort order.

The literal folder `docs/threads/<thread>/proposals/` is the only V1 location proposal artifacts land in per `docs/workflow/v1/thread-layout.md`. If the path passed is not under that folder, refuse and ASK the user to confirm — a proposal not in `proposals/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a V1 proposal.

## What This Skill Reviews

A V1 proposal-review pass surfaces three categories of finding per V1 review-family policy [D81]:

- **Gaps** — missing intent (what the proposal is trying to do is unclear), missing context (why the proposal is being raised now is unclear), or a rough shape so under-specified that a downstream reader cannot react to it.
- **Risks** — named or unnamed downstream consequences the proposal commits to without acknowledging. Cost, complexity, scope creep, dependency surprises, security or correctness pitfalls implied by the rough shape, breakages of existing behavior the proposal does not flag.
- **Ambiguities** — statements that admit more than one reasonable reading. Soft language ("robust", "scalable", "modern", "clean", "appropriate", "as needed") and any rough shape two different implementers would translate into two different artifacts.

This is the LIGHTWEIGHT review of the five V1 review targets — gaps, risks, ambiguities only. Heavier checks (semantic-contract coverage against the Phase 3 spec contract, source-spec adherence, code-vs-original-intent fidelity, general-purpose code quality) belong to `review-spec-*`, `review-plan-*`, `review-implementation-*`, and `review-code-*` respectively. A finding that escalates beyond gaps/risks/ambiguities is out of scope here — flag it as a suggestion to escalate to one of the other review skills rather than performing the heavier check inline.

## Walk Format

The walk presents the candidate findings list to the user up front (after the skill identifies it), then walks one finding at a time. The per-finding loop is modeled on `skills/seeded-discussion/SKILL.md`'s four-element Decision / What you need to know / Options / Recommendation pattern, adapted for review settlements:

For each finding (or topic, or component — grain is the executor's discretion, but each loop iteration must settle ONE thing):

1. **Surface the finding.** State the finding with its severity tag — suggested vocabulary `blocker` (the proposal cannot reasonably escalate downstream without addressing this), `issue` (the proposal can escalate, but a downstream reader will hit confusion), `nit` (worth flagging but not blocking). State its category (gap / risk / ambiguity). State why it matters for whoever picks up the proposal next.
2. **Cite the evidence.** Quote the proposal section heading or a short passage (≤ one sentence) the finding is grounded in. Reference, do not recite — do not paste large blocks of the proposal back.
3. **ASK the user for their view.** Open the loop with a question that gives the user room to answer: "What's your read on this?" / "Does the proposal already cover this somewhere I missed?" / "How does this land for you?". Accept the user's freeform answer.
4. **TEST the user's explanation against the proposal artifact.** Re-read the cited section. Check whether the user's framing actually resolves the finding or merely defends it. Look for: (a) a section of the proposal you missed that genuinely covers the finding, (b) an upstream decision log the proposal cites that the user can point to, (c) context the user has but the proposal does not record. ASK the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that resolves the finding IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails.
5. **Settle the finding.** Together, settle as one of:
   - `resolved` — the proposal already covers the finding (a section the reviewer missed), OR the user's clarification points to an upstream artifact (a decision log, prior proposal, settled context) that genuinely resolves it. Settlement stays in the decision log only.
   - `rejected` — the finding is not actually a finding (false positive from the candidate-list draft). Settlement stays in the decision log only.
   - `accepted` — the finding is genuine and actionable; it will need to be addressed (typically by re-versioning the proposal, opening a discussion, or escalating to spec). Dumps to the inbox-open review-finding artifact at end-of-session.
   - `deferred` — the finding is genuine but the user wants to park it for later (out of scope for this review run; address in a future version or a future review). Dumps to the inbox-open review-finding artifact at end-of-session.
   - `parked` — same as deferred but the user has explicitly asked to capture as an Inbox item rather than treat as a review-finding. The walk may route via `skills/capture-inbox/SKILL.md` instead of (or in addition to) the inbox-open dump.
6. **Append a record to the decision log.** Use the `## D<N>: <Finding title>` shape from `skills/discussion/SKILL.md` and `skills/seeded-discussion/SKILL.md`. `Decision: <settlement>` and `Rationale: <one or two sentences>`. Include the severity tag and category in the title or rationale so the decision log carries the per-finding outcome legibly. If the settlement included a dissent per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim.
7. **Move to the next finding.** Do not move on while the current finding is still ambiguous — settle it cleanly first. Silence is not a settlement.

If a finding splits into sub-findings during the walk (e.g., a "risk" that turns out to be two unrelated risks once examined), settle each sub-finding as its own `## D<N>` record rather than collapsing them.

## Output Artifacts

This skill produces UP TO TWO artifacts. The decision log is the primary deliverable; the inbox-open review-finding dump is conditional.

### Decision Log (primary, written when the walk produces at least one settlement)

```text
docs/threads/<thread>/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

per `docs/workflow/v1/filename-grammar.md` (record form, `decision-log` artifact-type token) and the routing in `docs/workflow/v1/thread-layout.md`. The `decision-log` artifact-type suffix is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (decision logs are records, not versioned artifacts).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `<proposal-slug>-review` or `proposal-review-<topic>` capturing the review topic. Confirm the slug with the user before the first settlement.
- The `discussions/` folder is created on-demand per `docs/workflow/v1/thread-layout.md`. Do not pre-create empty folders.

The decision log is **append-only**. Each settled finding is appended as one record with a sequential per-log local heading:

```markdown
## D<N>: <Finding title> (<severity> · <category>)

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

This artifact is written ONLY at the END of the walk, and ONLY if at least one `accepted` / `deferred` / `parked` finding remains. **No Inbox file if nothing remains.** If every finding was settled as `resolved` or `rejected`, no inbox-open dump is written — the decision log is the only artifact, and the closing message states explicitly that no unresolved findings remain. The same rule reads as "no Inbox dump if all findings resolved" or "no Inbox file when nothing remains" — capturing nothing produces nothing.

When written, the inbox-open dump carries ONLY the unresolved actionable findings, in the same six-section findings-first shape used by the autonomous sibling:

1. **`## Verdict`** — overall judgment on what remains (typically `partially ready` or `not ready` if findings remain; the dump itself never carries a `ready` verdict because nothing would land in it in that case).
2. **`## Findings`** — only the `accepted` / `deferred` / `parked` findings, each carrying its severity tag and category.
3. **`## Evidence`** — proposal section heading or short quote for each finding.
4. **`## References`** — the proposal path under review (absolute path), the decision log path emitted by this same walk (absolute path), and any related decision logs or prior review-findings by absolute path.
5. **`## Open Questions`** — clarifications worth confirming. Frame as questions, not as gaps to autofill.
6. **`## Next Actions`** — what to do next for each unresolved finding. Typically: re-version the proposal, open a discussion via `skills/discussion/SKILL.md`, escalate to spec via `skills/spec-auto/SKILL.md` / `skills/spec-interactive/SKILL.md`, or invoke `the-fool` for adversarial pressure (see `## The Fool Delegation`).

Resolved and rejected findings are NOT repeated in the inbox-open dump — they are already settled in the decision log and require no further triage.

## The Fool Delegation

Adversarial pressure on a proposal — pre-mortem analysis, devil's-advocate cross-examination, "what's missing that would kill this" framing — is DELEGATED to the external `the-fool` skill per V1 review-family policy. There is no native V1 adversarial-review skill, and this skill (`review-proposal-interactive`) does NOT perform an adversarial pass during the walk.

If during the walk the user wants to surface adversarial findings beyond the standard gaps/risks/ambiguities pass, the skill MAY suggest delegating to `the-fool` mid-walk or after the walk closes. The walk continues with the standard settlements; `the-fool` runs as a separate invocation outside this skill. Cite any resulting `the-fool` artifact under `## References` in a subsequent review run if the user wants the adversarial findings folded into a future review-finding artifact.

This skill does NOT reimplement `the-fool`'s logic, does NOT pre-empt its findings, and does NOT mark a proposal as "fully reviewed" just because the walk produced settlements. A proposal that has had a `review-proposal-*` pass but not a `the-fool` pass is still missing the adversarial layer — flag that in `## Next Actions` if the proposal is high-stakes enough to warrant it.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Resolve the proposal artifact.** Detect the proposal path from the user's invocation. If the path is unsupplied, vague ("the proposal"), or multiple plausible proposals exist in `docs/threads/<thread>/proposals/`, ASK the user which is intended. Do not pick by recency. Confirm the resolved path before reading.

3. **Read the proposal READ-ONLY.** Per `docs/workflow/v1/immutability.md`, emitted proposal artifacts are immutable. This skill reads the proposal but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the proposal body during the walk.

4. **Identify the candidate findings list.** Walk the proposal once end-to-end and draft a candidate list of findings tagged gap / risk / ambiguity with suggested severity. Cluster related findings rather than fragmenting. Aim for fewer, higher-quality candidates over many minor ones.

5. **Confirm the candidate findings list with the user before walking.** List the candidates by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing settlements later. If the user adds findings the candidate list missed, fold them in. If the user removes findings as not worth walking, drop them.

6. **For each finding IN ORDER, run the per-finding loop from `## Walk Format`.** Surface → cite evidence → ASK the user → TEST the user's explanation against the artifact (do not just accept) → settle → log. Push back per the `## Anti-Sycophancy Stance` when warranted.

7. **Capture the UTC stamp.** When the FIRST settlement lands and the decision log needs to be created, compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing. The decision log is created LAZILY on the first settlement (per `## Decision Log Lazy Creation`).

8. **Append per-settlement records to the decision log.** After each settlement, append a `## D<N>: <Finding title>` record per `## Walk Format` step 6. Tell the user: `Decision saved: <short summary>.`

9. **At the END of the walk: write the inbox-open dump IF unresolved findings remain.** If at least one `accepted` / `deferred` / `parked` finding remains, capture the UTC stamp for the dump (separate from the decision log's stamp), draft the six-section findings-first report covering only the unresolved findings, and write the artifact to `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. If ALL findings were settled as `resolved` or `rejected`, do NOT write an inbox-open file — capturing nothing produces nothing, and the closing message says so explicitly.

10. **Final message.** Cite the decision log path. If the inbox-open dump was written, cite its path too. If the dump was NOT written, state explicitly: `No unresolved findings — no inbox file written.` No closing remark.

## Decision Log Lazy Creation

The decision log is created LAZILY at the FIRST settled finding — not proactively in step 4 or 5. If the candidate-list confirmation produces no walk (user decides the candidates are all false positives and aborts) and no findings are settled, NO decision log is written. An interrupted walk with no settled findings leaves no artifact.

This matches the lazy-creation rule in `skills/discussion/SKILL.md` and `skills/seeded-discussion/SKILL.md`: a discussion or walk that produces no decisions produces no log. The skill keeps state in-session until the first settlement, then creates the log at write time of the first `## D<N>` record.

If the user pauses mid-walk after at least one settlement has landed, the partial decision log is durable: every settlement up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## D<N+k>` record), per the resumption pattern in `skills/seeded-discussion/SKILL.md`.

## Scope Drift

When the user introduces a branch that is outside the proposal-review walk — a finding about a different proposal, a tangent about the V1 workflow itself, a refactor idea unrelated to the proposal's intent — do not silently follow them and do not let the walk grow into a different shape than the one being discussed. Propose ONE of:

1. **Park as an Inbox item** via `skills/capture-inbox/SKILL.md` (PREFERRED for non-blocking side-findings). Captures a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this review's decision log.
2. **Split into its own decision log.** When the branch is itself a multi-finding discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` in `discussions/` for it via `skills/discussion/SKILL.md` or `skills/seeded-discussion/SKILL.md`.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the decision log nor the (conditional) inbox-open review-finding dump. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session (per `docs/workflow/v1/immutability.md`, "Drafts Are Editable") but are never committed by this skill.

## Immutability

Emitted decision logs are append-only per `docs/workflow/v1/immutability.md`. Once a `## D<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a decision settles as a NEW `## D<N+k>` record explaining the change — never an in-place edit of an earlier record. The log itself is the state — there is no separate state file, no progress tracker.

Emitted review-finding artifacts (the conditional inbox-open dump) are also immutable per `docs/workflow/v1/immutability.md`. Once written into `inbox/open/`, the review-finding is part of the thread's reviewable history and is NOT edited. A revision to a review-finding is a NEW review-finding record (new UTC stamp, new kebab-desc), not an in-place edit.

The proposal under review is ALSO IMMUTABLE per the same rules. The reviewer reads READ-ONLY and does NOT edit the proposal. Findings that warrant revisions to the proposal are surfaced under `## Next Actions` in the inbox-open dump (or noted in the decision log) with the explicit recommendation to emit a NEW proposal record (or to escalate via `skills/spec-auto/SKILL.md` / `skills/spec-interactive/SKILL.md` if the proposal is ready for spec) — never an instruction to edit the existing proposal.

No source-relation YAML frontmatter is added to any emitted artifact — lineage between the decision log, the review-finding dump, and the proposal they review lives in the `## References` section (by absolute path), not in metadata on the files. Per `docs/workflow/v1/immutability.md`, that history is recovered from the body's references, not from the filename.
