---
name: review-proposal-auto
description: Read an emitted V1 proposal artifact at `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md` and write a findings-first review report to the active thread's `inbox/open/<UTC>-<kebab-desc>-review-finding.md`, end-to-end, with no clarifying questions and no per-finding chat walk. Use when you want a lightweight autonomous review of a proposal — gaps, risks, ambiguities — not when you want to walk findings together one at a time (use `review-proposal-interactive` for that), and not when you want adversarial pressure on the proposal (delegate to the external `the-fool` skill per V1 review-family policy).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Proposal Auto

Read a V1 proposal artifact READ-ONLY and emit a findings-first review report to the active thread's `inbox/open/` folder under the V1 record-form filename grammar with the `review-finding` artifact-type token. This skill is the autonomous half of the V1 proposal-review pair — it reads the proposal, drafts the report end-to-end, and writes one record per review run. It does not ask clarifying questions, it does not walk findings with the user one-at-a-time, and it does not commit. For the collaborative per-finding walk with anti-sycophancy push-back, use the sibling skill `review-proposal-interactive` instead.

`review-proposal-auto` is one of TEN V1 review skills, paired across five review targets — proposal, spec, plan, implementation, code — each with an `-auto` and an `-interactive` variant. Two axes are independent: the REVIEW TARGET (proposal here; spec / plan / implementation / code in the other four pairs) and the AUTONOMY axis (autonomous here; collaborative in the sibling). The review target this skill addresses is the PROPOSAL — a freeform artifact under the thread's `proposals/` folder emitted by `skills/workflow/propose/propose-auto/SKILL.md` or `skills/workflow/propose/propose-interactive/SKILL.md`. The stricter bar for a spec ready to be handed downstream lives in `review-spec-auto` and `review-spec-interactive` — NOT here; this skill performs a LIGHTWEIGHT proposal review only.

The LIGHTWEIGHT framing matters: a proposal is an early sketch, not a downstream handoff document. The review checks for the three things a proposal can plausibly miss at its stage — gaps, risks, ambiguities — and stops there. Do NOT treat a proposal review like a spec review; missing semantic-contract elements (intended outcome, scope/non-scope, acceptance guidance) are not findings against a proposal because a proposal does not promise to carry them. Those are findings the downstream `review-spec-*` pair surfaces against the SPEC that comes after the proposal.

## Inputs

This skill accepts ONE input: a V1 proposal artifact path under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md` per the V1 record-form grammar at `docs/workflow/v1/filename-grammar.md`. The path may be passed absolute or relative to the repo root.

If the path is not supplied, ASK the user which proposal to review — do not pick by recency. If multiple plausible proposal artifacts exist in `docs/threads/<thread>/proposals/` and the user's reference is vague ("the proposal", "the latest proposal", "the auth one"), ASK the user which artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is NO global "latest proposal" algorithm. There is no fallback to the highest UTC stamp. Silently picking the most recent file would hide a real decision — which proposal won, which variant survived discussion — behind a sort order.

The literal folder `docs/threads/<thread>/proposals/` is the only V1 location proposal artifacts land in per `docs/workflow/v1/thread-layout.md`. If the path passed is not under that folder, refuse and ASK the user to confirm — a proposal not in `proposals/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a V1 proposal.

## What This Skill Reviews

A V1 proposal-review pass surfaces three categories of finding per V1 review-family policy [D81]:

- **Gaps** — missing intent (what the proposal is trying to do is unclear), missing context (why the proposal is being raised now is unclear), or a rough shape so under-specified that a downstream reader cannot react to it. A proposal does NOT need a spec's full semantic contract — but it does need enough that a downstream reader could decide whether to escalate it to spec, discussion, or implementation.
- **Risks** — named or unnamed downstream consequences the proposal commits to without acknowledging. Risks include cost, complexity, scope creep into adjacent work, dependency surprises, security or correctness pitfalls implied by the rough shape, and breakages of existing behavior that the proposal does not flag.
- **Ambiguities** — statements that admit more than one reasonable reading. Soft language ("robust", "scalable", "modern", "clean", "appropriate", "as needed") is a common signal; so is a "rough shape" sketch that two different implementers would translate into two different artifacts.

This is the LIGHTWEIGHT review of the five V1 review targets. It does NOT promise semantic-contract coverage against the Phase 3 spec contract, source-spec adherence checks, code-vs-original-intent fidelity, or general-purpose code quality — those belong to `review-spec-*` (the stricter bar for handing a spec downstream, against Phase 3's locked spec contract), `review-plan-*` (source-spec adherence + granularity-fit), `review-implementation-*` (verification of code against the source artifact, replacing the V1 `verify-*` role), and `review-code-*` (general-purpose code review) respectively. A proposal review that escalates beyond gaps/risks/ambiguities is out of scope here — flag it as a suggestion to escalate to one of the other review skills rather than performing the heavier check inline.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized findings-first per V1 review-family policy. The body MUST cover the following six sections in this order:

1. **`## Verdict`** — overall judgment on the proposal as it stands. Suggested vocabulary (executor MAY refine): `ready` (the proposal is solid enough to escalate to spec / plan / discussion as-is), `partially ready` (some findings need addressing first; specify which), `not ready` (the proposal needs substantial revision before downstream work). One overall verdict plus a one-line tether to the highest-impact finding below.
2. **`## Findings`** — each finding carries a SEVERITY tag. Suggested vocabulary (executor MAY adopt or refine): `blocker` (the proposal cannot reasonably escalate downstream without addressing this), `issue` (the proposal can escalate, but a downstream reader will hit confusion), `nit` (worth flagging but not blocking). One finding per bullet (or per `### <title>` heading for longer findings). Each finding states what is wrong, what category it belongs to (gap / risk / ambiguity), and why it matters for whoever picks up the proposal next.
3. **`## Evidence`** — for each finding above, cite the proposal section heading or a short quote (≤ one sentence). Reference, do not recite — quoting the proposal back to the author is noise. Cite by section heading where possible.
4. **`## References`** — list every artifact the review reads or depends on: the proposal path being reviewed (absolute path under `docs/threads/<thread>/proposals/`), any related decision logs by absolute path plus `D<N>` for specific operative decisions, and any prior review-findings on the same proposal (also by absolute path). If a referenced decision log carries a settled `D<N>` that the proposal contradicts or ignores, that contradiction is one of the findings above and the reference here is what backs it.
5. **`## Open Questions`** — clarifications worth confirming with the proposal author or downstream reader. Frame as questions, not as gaps to autofill. If a question can only be answered by the author, say so. If a question would normally surface in a subsequent spec or discussion, say that too — and recommend the downstream skill that should pick it up.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: re-version the proposal as a new record (per `docs/workflow/v1/immutability.md`, an emitted proposal is immutable; the revision is a new artifact), open a discussion via `skills/workflow/capture-discussion/discussion/SKILL.md` or `skills/workflow/capture-discussion/seeded-discussion/SKILL.md` to settle a specific finding, escalate the proposal to spec via `skills/workflow/spec/spec-auto/SKILL.md` or `skills/workflow/spec/spec-interactive/SKILL.md` once findings are addressed, or invoke `the-fool` for adversarial pressure on a specific risk surface (see `## The Fool Delegation`). One action per finding cluster; do not pad.

The six section headings are the V1 standard for the findings-first report shape per the V1 review-family CONTEXT. Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. Do NOT collapse two sections into one; the explicit separation lets a downstream reader (or the interactive sibling resuming the same review topic) scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one proposal; emitting one file per finding would clutter `inbox/open/` and break the "one record per review run" V1 review-family convention.

## Output Artifact

Write the review artifact to:

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

per the V1 record-form grammar at `docs/workflow/v1/filename-grammar.md` and the inbox routing rule at `docs/workflow/v1/thread-layout.md`. The `review-finding` artifact-type token is MANDATORY — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form (`v<N>`) because reviews are records, not versioned artifacts.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<proposal-slug>-review` or a phrase capturing the highest-impact finding. The slug is part of the filename and is not user-confirmed in auto mode; the proposal slug is treated as authoritative.
- The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation"). Do not pre-create empty folders.

Example filename:

```text
260521101212Z-auth-flow-review-finding.md
```

For the full record-form grammar and the recognized V1 artifact-type list (which includes `review-finding` alongside `proposal`, `spec`, `plan`, `discussion`, `decision-log`, `inbox-item`), see `docs/workflow/v1/filename-grammar.md`.

The artifact lives in `inbox/open/` rather than `reviews/` — per `docs/workflow/v1/thread-layout.md`, V1 explicitly excludes a top-level `reviews/` folder; review findings ARE inbox items, and the inbox open/processed/dropped status is reflected by folder, not by frontmatter. Once a finding has been addressed, it is moved from `inbox/open/` to `inbox/processed/` (or to `inbox/dropped/` if intentionally discarded after triage) — that lifecycle is manual in V1 and out of scope for this skill.

## The Fool Delegation

Adversarial pressure on a proposal — pre-mortem analysis, devil's-advocate cross-examination, "what's missing that would kill this" framing — is DELEGATED to the external `the-fool` skill per V1 review-family policy. There is no native V1 adversarial-review skill, and this skill (`review-proposal-auto`) does NOT perform an adversarial pass.

If the user wants an adversarial review of a proposal in addition to (or instead of) the standard gaps/risks/ambiguities pass:

- Invoke `the-fool` separately against the proposal — it operates outside the V1 review-family skill set and produces its own adversarial deliverable.
- Cite the resulting `the-fool` artifact (if any) under `## References` in a subsequent `review-proposal-*` run if the user wants the adversarial findings folded into the standard review-finding artifact.

This skill does NOT reimplement `the-fool`'s logic, does NOT pre-empt its findings, and does NOT mark a proposal as "fully reviewed" just because the standard pass produced findings. A proposal that has had a `review-proposal-*` pass but not a `the-fool` pass is still missing the adversarial layer — flag that in `## Next Actions` if the proposal is high-stakes enough to warrant it.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Resolve the proposal artifact.** Detect the proposal path from the user's invocation. If the path is unsupplied, vague ("the proposal"), or multiple plausible proposals exist in `docs/threads/<thread>/proposals/`, ASK the user which is intended. Do not pick by recency. Confirm the resolved path before reading.

3. **Read the proposal READ-ONLY.** Per `docs/workflow/v1/immutability.md`, emitted proposal artifacts are immutable. This skill reads the proposal but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the proposal body. The review report is the deliverable, not a rewritten proposal.

4. **Identify findings per `## What This Skill Reviews`.** Walk the proposal once end-to-end before noting findings. For each candidate finding, tag it as gap / risk / ambiguity, assign a severity (`blocker` / `issue` / `nit`), and capture the evidence (section heading or short quote) it cites. Cluster related findings rather than fragmenting them into many small bullets. Aim for fewer, higher-quality findings over many minor ones — a short honest review beats a padded one.

5. **Draft the findings-first report.** Compose the six sections in order: `## Verdict` → `## Findings` → `## Evidence` → `## References` → `## Open Questions` → `## Next Actions`. Skip a section entirely if it has nothing real to add. Order findings within `## Findings` by impact (severity then by category), not by where they appear in the proposal.

6. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

7. **Write the review artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. The `review-finding` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md`. The review body is plain markdown — no YAML frontmatter on the review artifact itself.

8. **Confirm.** Tell the user: `Review written: <relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review-finding artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session (per `docs/workflow/v1/immutability.md`, "Drafts Are Editable") but are never committed by this skill.

## Immutability

Emitted review-finding artifacts are immutable per `docs/workflow/v1/immutability.md`. Once the file is written into `inbox/open/`, it is part of the thread's reviewable history and is NOT edited. A typo discovered in an emitted review-finding means writing a NEW review-finding record (new UTC stamp, new kebab-desc) — not an in-place edit. A revision to a review-finding is a NEW review-finding artifact, not an in-place edit.

The proposal under review is ALSO IMMUTABLE per the same rules. The reviewer reads READ-ONLY and does NOT edit the proposal. Findings that warrant revisions to the proposal are surfaced under `## Next Actions` with the explicit recommendation to emit a NEW proposal record (or to escalate via `skills/workflow/spec/spec-auto/SKILL.md` / `skills/workflow/spec/spec-interactive/SKILL.md` if the proposal is ready for spec) — never an instruction to edit the existing proposal.

No source-relation YAML frontmatter is added to the review body — lineage between a review-finding and the proposal it reviews lives in the `## References` section (by absolute path), not in metadata on the file. Per `docs/workflow/v1/immutability.md`, the accepted trade-off is that the filename alone cannot tell you which proposal a review reviewed — that mapping is recovered from the body's references section.
