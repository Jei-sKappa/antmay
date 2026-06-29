---
targets:
  agent-skill:
    frontmatter:
      name: review-proposal
      description: Read a proposal artifact and write a references-first review report into the proposal's reviews/ folder covering gaps, risks, ambiguities, and consistency with the thread's decision logs; use when a proposal needs a lightweight quality review.
      metadata:
        author: https://github.com/Jei-sKappa
        version: 3.0.0
---
# Review Proposal

Read a proposal artifact READ-ONLY and emit a references-first review report into the proposal's own `reviews/` folder. This skill reads the proposal, drafts the report end-to-end, and writes one review record per review run. By default it runs end-to-end without walking findings with the user one-at-a-time, but it honors an invocation that asks it to check in or walk the findings interactively; it does not commit.

The LIGHTWEIGHT framing matters: a proposal is an early sketch, not a downstream handoff document. The review checks for the things a proposal can plausibly miss at its stage — gaps, risks, ambiguities, and consistency with the thread's decision logs — and stops there. Do NOT treat a proposal review like a spec review; missing semantic-contract elements (intended outcome, scope/non-scope, acceptance guidance) are not findings against a proposal because a proposal does not promise to carry them. Those are findings a downstream spec review surfaces against the spec that comes after the proposal.

## Inputs

This skill accepts ONE input: a proposal artifact path. A proposal lives inside its **lineage folder** under the thread root:

```text
docs/threads/<thread>/proposals/NNN[-<desc>]/proposal.md
```

where `NNN` is a zero-padded 3-digit lineage sequence (`001`, `002`, …) and `-<desc>` is an optional kebab slug used only to distinguish one lineage from another. The lineage folder (the full path) is the unit of reference — `proposal.md` is meaningless bare.

If the path is not supplied, ASK the user which proposal to review — do not pick by recency or by highest lineage number. If a thread holds multiple proposal lineages (`proposals/001-api/`, `proposals/002-cli/`) and the user's reference is vague ("the proposal", "the latest proposal", "the auth one"), ASK which lineage is intended. There is NO "most recent `NNN`" or "highest number" fallback. Silently picking would hide a real decision — which proposal lineage is meant — behind a sort order.

A proposal lives only inside a `proposals/NNN[-<desc>]/` lineage folder. If the path passed is not a `proposal.md` under such a folder, refuse and ASK the user to confirm — a file elsewhere is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a proposal artifact.

## What This Skill Reviews

A proposal-review pass surfaces these categories of finding:

- **Gaps** — missing intent (what the proposal is trying to do is unclear), missing context (why the proposal is being raised now is unclear), or a rough shape so under-specified that a downstream reader cannot react to it. A proposal does NOT need a spec's full semantic contract — but it does need enough that a downstream reader could decide whether to escalate it to spec, discussion, or implementation.
- **Risks** — named or unnamed downstream consequences the proposal commits to without acknowledging. Risks include cost, complexity, scope creep into adjacent work, dependency surprises, security or correctness pitfalls implied by the rough shape, and breakages of existing behavior that the proposal does not flag.
- **Ambiguities** — statements that admit more than one reasonable reading. Soft language ("robust", "scalable", "modern", "clean", "appropriate", "as needed") is a common signal; so is a "rough shape" sketch that two different implementers would translate into two different artifacts.
- **Consistency with the thread's decision logs** — part of the standard proposal review. Verify the proposal is consistent with the decision logs already recorded in the thread: no settled decision contradicted, no previously-settled point silently reversed. A proposal that quietly walks back a decision the thread already settled is a finding, and the contradicting decision log is the evidence.

This is a LIGHTWEIGHT review. It does NOT promise semantic-contract coverage, source-spec adherence checks, code-vs-original-intent fidelity, or general-purpose code quality. A proposal review that escalates beyond gaps/risks/ambiguities/decision-log-consistency is out of scope here — flag it as a suggestion to escalate to a heavier review pass rather than performing the heavier check inline.

## Report Format — References-First

The emitted review artifact is ONE review record per review run, organized **references-first**: a `## References` section comes FIRST, naming the artifact under review BEFORE any verdict. The body MUST cover the following six sections in this exact order:

1. **`## References`** — list every artifact the review reads or depends on, naming the proposal under review FIRST. Format each entry as `- <description>: <path>`. Each path carries a description — never emit a bare path list. Use **thread-relative** paths for artifacts within the same thread (e.g. `proposals/001/proposal.md`, `proposals/001/discussions/<UTC>-<desc>-decision-log.md`), and **repo-relative** paths for cross-thread artifacts (e.g. `docs/threads/<other>/…`). **Never absolute.** Include the proposal path, any decision logs the consistency check relied on, and any prior reviews on the same proposal. If a referenced decision log carries a settled decision that the proposal contradicts or ignores, that contradiction is one of the findings below and the reference here is what backs it.
2. **`## Verdict`** — overall judgment on the proposal as it stands. Suggested vocabulary (executor MAY refine): `ready` (the proposal is solid enough to escalate to spec / plan / discussion as-is), `partially ready` (some findings need addressing first; specify which), `not ready` (the proposal needs substantial revision before downstream work). One overall verdict plus a one-line tether to the highest-impact finding below.
3. **`## Findings`** — each finding carries a SEVERITY tag. Suggested vocabulary (executor MAY adopt or refine): `blocker` (the proposal cannot reasonably escalate downstream without addressing this), `issue` (the proposal can escalate, but a downstream reader will hit confusion), `nit` (worth flagging but not blocking). One finding per bullet (or per `### <title>` heading for longer findings). Each finding states what is wrong, what category it belongs to (gap / risk / ambiguity / decision-log inconsistency), and why it matters for whoever picks up the proposal next.
4. **`## Evidence`** — for each finding above, cite the proposal section heading or a short quote (≤ one sentence); for a decision-log inconsistency, cite the contradicting decision log entry. Reference, do not recite — quoting the proposal back to the author is noise. Cite by section heading where possible.
5. **`## Open Questions`** — clarifications worth confirming with the proposal author or downstream reader. Frame as questions, not as gaps to autofill. If a question can only be answered by the author, say so. If a question would normally surface in a subsequent spec or discussion, say that too — and recommend the downstream phase that should pick it up.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: revise the proposal (it is a versioned artifact, edited in place while in flight — see `## Immutability`), open a discussion to settle a specific finding, escalate the proposal to spec once findings are addressed, or run an adversarial-reasoning pass for additional pressure on a specific risk surface. One action per finding cluster; do not pad.

Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. The single exception is `## References`, which is mandatory and always comes first: a review that names no artifact under review is not a review. Do NOT collapse two sections into one; the explicit separation lets a downstream reader scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one proposal; emitting one file per finding would clutter the `reviews/` folder and break the "one record per review run" convention.

## Output Artifact

A proposal review is a **record** that lands in the **target proposal's own `reviews/` folder**:

```text
docs/threads/<thread>/proposals/NNN[-<desc>]/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

The review nests inside the proposal lineage folder it serves — records attach to the spine node they serve. There is NO inbox and NO open/processed/dropped lifecycle; nothing is moved between folders to express status (see `## Disposition`).

- The `review` artifact-type token is MANDATORY — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form (`v<N>`) because reviews are records, not versioned artifacts.
- The 12-character UTC stamp `YYMMDDHHMMSSZ` uses the format: 2-digit year, 2-digit month, 2-digit day, 2-digit hour, 2-digit minute, 2-digit second, `Z`. Capture it ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<proposal-slug>-review` or a phrase capturing the highest-impact finding. The slug is part of the filename and is not user-confirmed; the proposal slug is treated as authoritative.
- The proposal's `reviews/` folder is created on-demand if it does not exist. Do not pre-create empty folders.

Example path:

```text
docs/threads/260518200115Z-auth/proposals/001/reviews/260521101212Z-auth-flow-review.md
```

## Disposition

A review carries its own **disposition** — accepted or rejected — in its YAML frontmatter, under a `status:` map. A review with **no `status.disposed` field is open**, mechanically, by parse. There is no folder move and no separate disposing record; status is read from frontmatter, never from a folder location.

**This skill writes the review OPEN** — it emits the report and does not set a disposition. When emitted with no `status.disposed`, the review carries **no frontmatter at all** (a record with no lifecycle status of its own carries no frontmatter); the disposition surface is added later, when someone disposes it. The frontmatter status shape, set once when the review is disposed, is:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>   # optional
```

- **Accept-and-revise** sets the frontmatter directly — the revision of the proposal IS the record; no separate accepting document is required.
- **Reject** sets the frontmatter with no document at all — no separate disposing record is required.
- The optional `rationale` is a thread-relative path to a discussion or decision log; a discussion no longer owns disposition, it is only the optional linked rationale.

Disposition is **set-once**: changing your mind is a new review or a thread reopen, not a frontmatter flip-flop. This skill does NOT dispose the review it writes — disposition is a later act by the surrounding session.

## Adversarial Review Delegation

Adversarial pressure on a proposal — pre-mortem analysis, devil's-advocate cross-examination, "what's missing that would kill this" framing — is NOT performed by this skill. If the user wants an adversarial review of a proposal in addition to (or instead of) the standard gaps/risks/ambiguities/decision-log pass, run a separate adversarial reasoning pass against the proposal. If that adversarial pass produces a deliverable, cite it under `## References` in a subsequent review run if the user wants the adversarial findings folded into the standard report.

This skill does NOT reimplement adversarial logic and does NOT mark a proposal as "fully reviewed" just because the standard pass produced findings. A proposal that has had a review-proposal pass but not an adversarial pass is still missing the adversarial layer — flag that in `## Next Actions` if the proposal is high-stakes enough to warrant it.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the proposal artifact.** Detect the proposal path from the user's invocation. If the path is unsupplied, vague ("the proposal"), or multiple proposal lineages exist under `docs/threads/<thread>/proposals/`, ASK the user which lineage is intended. Do not pick by recency or highest `NNN`. Confirm the resolved path before reading.

3. **Read the proposal READ-ONLY.** A proposal is a versioned artifact, alive in flight; this skill reviews it but does NOT edit it, does NOT rewrite it, does NOT touch its frontmatter, and does NOT propose edits to the proposal body. The review report is the deliverable, not a rewritten proposal.

4. **Read the thread's decision logs.** To run the consistency-with-decision-logs check, locate the relevant decision logs in the thread (the proposal lineage's `discussions/`, and any other discussions in the thread that settled decisions bearing on this proposal). Check whether the proposal contradicts or silently reverses any settled decision.

5. **Identify findings per `## What This Skill Reviews`.** Walk the proposal once end-to-end before noting findings. For each candidate finding, tag it as gap / risk / ambiguity / decision-log inconsistency, assign a severity (`blocker` / `issue` / `nit`), and capture the evidence (section heading, short quote, or contradicting decision-log entry) it cites. Cluster related findings rather than fragmenting them into many small bullets. Aim for fewer, higher-quality findings over many minor ones — a short honest review beats a padded one.

6. **Draft the references-first report.** Compose the six sections in order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`. References comes first and names the proposal under review before any verdict. Skip a section entirely (except `## References`) if it has nothing real to add. Order findings within `## Findings` by impact (severity then by category), not by where they appear in the proposal.

7. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

8. **Write the review artifact.** Create `docs/threads/<thread>/proposals/NNN[-<desc>]/reviews/<UTC>-<kebab-desc>-review.md`. The `review` artifact-type suffix is MANDATORY. The proposal's `reviews/` folder is created on-demand. The review is emitted OPEN — no `status.disposed`, no frontmatter at all (per `## Disposition`).

9. **Confirm.** Tell the user: `Review written: <thread-relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session but are never committed by this skill.

## Immutability

A review is a **record**. Its body is frozen at emission — once the file is written into the proposal's `reviews/` folder, the body is part of the thread's reviewable history and is NOT edited. A typo discovered in an emitted review body means writing a NEW review record (new UTC stamp, new kebab-desc) — not an in-place body edit. The one carve-out is the review's own frontmatter `status:` map: that is a live surface until the review is disposed (then it freezes too), and it is set by a later disposition act, never by this skill.

The proposal under review is a **versioned artifact** — alive while in flight, edited in place through review→revise cycles, and frozen only at its own `status.approved` (or `status.rejected`) latch. This reviewer reads READ-ONLY and does NOT edit the proposal. Findings that warrant revisions are surfaced under `## Next Actions` with the recommendation to revise the proposal in place (if still in flight) or, once it is `approved`/`rejected` and therefore frozen, to open a new lineage — never an instruction for this skill to edit the proposal itself.

No source-relation or lineage frontmatter is added to the review (no `Supersedes:`, `Reviews:`, etc.) — the only frontmatter a review ever carries is the lifecycle `status:` map once disposed. Lineage between a review and the proposal it reviews lives in the `## References` section (by thread-relative path) and in the review's location (inside that proposal's `reviews/` folder), not in metadata on the file.
