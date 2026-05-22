---
name: review-proposal-auto
description: Read a proposal artifact and write a findings-first review report (gaps, risks, ambiguities) to the active thread's inbox — end-to-end, no clarifying questions, no per-finding walk. Use when you want a lightweight autonomous review of a proposal.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.1
---

# Review Proposal Auto

Read a proposal artifact READ-ONLY and emit a findings-first review report to the active thread's `inbox/open/` folder. This skill reads the proposal, drafts the report end-to-end, and writes one record per review run. It does not ask clarifying questions, it does not walk findings with the user one-at-a-time, and it does not commit.

The LIGHTWEIGHT framing matters: a proposal is an early sketch, not a downstream handoff document. The review checks for the three things a proposal can plausibly miss at its stage — gaps, risks, ambiguities — and stops there. Do NOT treat a proposal review like a spec review; missing semantic-contract elements (intended outcome, scope/non-scope, acceptance guidance) are not findings against a proposal because a proposal does not promise to carry them. Those are findings a downstream spec review surfaces against the spec that comes after the proposal.

## Inputs

This skill accepts ONE input: a proposal artifact path under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`.

If the path is not supplied, ASK the user which proposal to review — do not pick by recency. If multiple plausible proposal artifacts exist in `docs/threads/<thread>/proposals/` and the user's reference is vague ("the proposal", "the latest proposal", "the auth one"), ASK the user which artifact is intended. There is NO global "latest proposal" algorithm. Silently picking the most recent file would hide a real decision — which proposal won, which variant survived discussion — behind a sort order.

The literal folder `docs/threads/<thread>/proposals/` is the only location proposal artifacts land in. If the path passed is not under that folder, refuse and ASK the user to confirm — a proposal not in `proposals/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a proposal artifact.

## What This Skill Reviews

A proposal-review pass surfaces three categories of finding:

- **Gaps** — missing intent (what the proposal is trying to do is unclear), missing context (why the proposal is being raised now is unclear), or a rough shape so under-specified that a downstream reader cannot react to it. A proposal does NOT need a spec's full semantic contract — but it does need enough that a downstream reader could decide whether to escalate it to spec, discussion, or implementation.
- **Risks** — named or unnamed downstream consequences the proposal commits to without acknowledging. Risks include cost, complexity, scope creep into adjacent work, dependency surprises, security or correctness pitfalls implied by the rough shape, and breakages of existing behavior that the proposal does not flag.
- **Ambiguities** — statements that admit more than one reasonable reading. Soft language ("robust", "scalable", "modern", "clean", "appropriate", "as needed") is a common signal; so is a "rough shape" sketch that two different implementers would translate into two different artifacts.

This is a LIGHTWEIGHT review. It does NOT promise semantic-contract coverage, source-spec adherence checks, code-vs-original-intent fidelity, or general-purpose code quality. A proposal review that escalates beyond gaps/risks/ambiguities is out of scope here — flag it as a suggestion to escalate to a heavier review pass rather than performing the heavier check inline.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized findings-first. The body MUST cover the following six sections in this order:

1. **`## Verdict`** — overall judgment on the proposal as it stands. Suggested vocabulary (executor MAY refine): `ready` (the proposal is solid enough to escalate to spec / plan / discussion as-is), `partially ready` (some findings need addressing first; specify which), `not ready` (the proposal needs substantial revision before downstream work). One overall verdict plus a one-line tether to the highest-impact finding below.
2. **`## Findings`** — each finding carries a SEVERITY tag. Suggested vocabulary (executor MAY adopt or refine): `blocker` (the proposal cannot reasonably escalate downstream without addressing this), `issue` (the proposal can escalate, but a downstream reader will hit confusion), `nit` (worth flagging but not blocking). One finding per bullet (or per `### <title>` heading for longer findings). Each finding states what is wrong, what category it belongs to (gap / risk / ambiguity), and why it matters for whoever picks up the proposal next.
3. **`## Evidence`** — for each finding above, cite the proposal section heading or a short quote (≤ one sentence). Reference, do not recite — quoting the proposal back to the author is noise. Cite by section heading where possible.
4. **`## References`** — list every artifact the review reads or depends on: the proposal path being reviewed (absolute path), any related decision logs by absolute path, and any prior review-findings on the same proposal (also by absolute path). If a referenced decision log carries a settled decision that the proposal contradicts or ignores, that contradiction is one of the findings above and the reference here is what backs it.
5. **`## Open Questions`** — clarifications worth confirming with the proposal author or downstream reader. Frame as questions, not as gaps to autofill. If a question can only be answered by the author, say so. If a question would normally surface in a subsequent spec or discussion, say that too — and recommend the downstream phase that should pick it up.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: re-version the proposal as a new record (an emitted proposal is immutable; revision means a new artifact with a new UTC-stamped filename), open a discussion to settle a specific finding, escalate the proposal to spec once findings are addressed, or invoke an adversarial-reasoning pass for additional pressure on a specific risk surface. One action per finding cluster; do not pad.

The six section headings are the standard for the findings-first report shape. Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. Do NOT collapse two sections into one; the explicit separation lets a downstream reader scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one proposal; emitting one file per finding would clutter `inbox/open/` and break the "one record per review run" convention.

## Output Artifact

Write the review artifact to:

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

The `review-finding` artifact-type token is MANDATORY — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form (`v<N>`) because reviews are records, not versioned artifacts.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` uses the format: 2-digit year, 2-digit month, 2-digit day, 2-digit hour, 2-digit minute, 2-digit second, `Z`. Capture it ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<proposal-slug>-review` or a phrase capturing the highest-impact finding. The slug is part of the filename and is not user-confirmed in auto mode; the proposal slug is treated as authoritative.
- The `inbox/open/` folder is created on-demand if it does not exist. Do not pre-create empty folders.

Example filename:

```text
260521101212Z-auth-flow-review-finding.md
```

The review artifact body is plain markdown — no YAML frontmatter.

The artifact lives in `inbox/open/` rather than a `reviews/` folder. Review findings are inbox items, and their open/processed/dropped status is reflected by which subfolder they occupy (`inbox/open/`, `inbox/processed/`, `inbox/dropped/`). Once a finding has been addressed, it is moved from `inbox/open/` to `inbox/processed/` (or to `inbox/dropped/` if intentionally discarded after triage) — that lifecycle is manual and out of scope for this skill.

## Adversarial Review Delegation

Adversarial pressure on a proposal — pre-mortem analysis, devil's-advocate cross-examination, "what's missing that would kill this" framing — is NOT performed by this skill. If the user wants an adversarial review of a proposal in addition to (or instead of) the standard gaps/risks/ambiguities pass, invoke an adversarial reasoning pass (e.g. a tool specialized in structured critical reasoning) separately against the proposal. If that adversarial pass produces a deliverable, cite it under `## References` in a subsequent review-finding run if the user wants the adversarial findings folded into the standard report.

This skill does NOT reimplement adversarial logic and does NOT mark a proposal as "fully reviewed" just because the standard pass produced findings. A proposal that has had a review-proposal pass but not an adversarial pass is still missing the adversarial layer — flag that in `## Next Actions` if the proposal is high-stakes enough to warrant it.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the proposal artifact.** Detect the proposal path from the user's invocation. If the path is unsupplied, vague ("the proposal"), or multiple plausible proposals exist in `docs/threads/<thread>/proposals/`, ASK the user which is intended. Do not pick by recency. Confirm the resolved path before reading.

3. **Read the proposal READ-ONLY.** Emitted proposal artifacts are immutable. This skill reads the proposal but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the proposal body. The review report is the deliverable, not a rewritten proposal.

4. **Identify findings per `## What This Skill Reviews`.** Walk the proposal once end-to-end before noting findings. For each candidate finding, tag it as gap / risk / ambiguity, assign a severity (`blocker` / `issue` / `nit`), and capture the evidence (section heading or short quote) it cites. Cluster related findings rather than fragmenting them into many small bullets. Aim for fewer, higher-quality findings over many minor ones — a short honest review beats a padded one.

5. **Draft the findings-first report.** Compose the six sections in order: `## Verdict` → `## Findings` → `## Evidence` → `## References` → `## Open Questions` → `## Next Actions`. Skip a section entirely if it has nothing real to add. Order findings within `## Findings` by impact (severity then by category), not by where they appear in the proposal.

6. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

7. **Write the review artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. The `review-finding` artifact-type suffix is MANDATORY. The `inbox/open/` folder is created on-demand. The review body is plain markdown — no YAML frontmatter on the review artifact itself.

8. **Confirm.** Tell the user: `Review written: <relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review-finding artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session but are never committed by this skill.

## Immutability

Emitted review-finding artifacts are immutable. Once the file is written into `inbox/open/`, it is part of the thread's reviewable history and is NOT edited. A typo discovered in an emitted review-finding means writing a NEW review-finding record (new UTC stamp, new kebab-desc) — not an in-place edit. A revision to a review-finding is a NEW review-finding artifact, not an in-place edit.

The proposal under review is ALSO IMMUTABLE. The reviewer reads READ-ONLY and does NOT edit the proposal. Findings that warrant revisions to the proposal are surfaced under `## Next Actions` with the explicit recommendation to emit a NEW proposal record (or to escalate to spec if the proposal is ready for that) — never an instruction to edit the existing proposal.

No source-relation YAML frontmatter is added to the review body — lineage between a review-finding and the proposal it reviews lives in the `## References` section (by absolute path), not in metadata on the file. The accepted trade-off is that the filename alone cannot tell you which proposal a review reviewed — that mapping is recovered from the body's references section.
