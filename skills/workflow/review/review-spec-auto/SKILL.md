---
name: review-spec-auto
description: Read a spec artifact and write a findings-first report checking all eight semantic-contract elements against the handoff-grade bar when the user wants an autonomous spec quality review.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.1
---

# Review Spec Auto

Read a spec artifact READ-ONLY and emit a findings-first review report to the active thread's `inbox/open/` folder. This skill reads the spec, checks every one of the eight semantic-contract elements against the handoff-grade bar, drafts the report end-to-end, and writes one record per review run. It does not ask clarifying questions and it does not walk findings with the user one-at-a-time. It does not commit.

## Inputs

This skill accepts ONE input: the path to a spec artifact. The path may be passed absolute or relative to the repo root.

If the path is not supplied, ASK the user which spec to review — do not pick by recency. If multiple plausible spec artifacts exist and the user's reference is vague ("the spec", "the latest spec", "v2", "the auth spec"), ASK the user which artifact is intended. There is NO global "latest spec" algorithm and no fallback to the highest version number. Silently picking by version or recency would hide a real decision — which spec variant the user intends to review, which version branch survived discussion — behind a sort order. If `v2-onboarding-spec.md` and `v2-spec.md` coexist, ASK.

## Eight Semantic-Contract Elements

A spec MUST cover all EIGHT of the following elements in its body. This skill checks every one of them against the handoff-grade bar:

1. **Intended outcome** — what the spec, when implemented, produces for the user. The "what gets built" statement that grounds the rest of the document.
2. **Context** — why this is being built; what came before; what triggered the spec. Without this, a downstream reader has to reconstruct motivation from inference.
3. **Scope / non-scope** — the boundary statement, INCLUDING what is explicitly out. A spec without an explicit non-scope statement leaves the boundary open to the implementer's interpretation — that is precisely the failure mode the handoff-grade bar guards against.
4. **Expected behavior** — the observable behaviors a future executor needs. State changes, return values, error surfaces, side effects. The downstream's contract.
5. **Constraints** — tech, repo, harness, and safety constraints that bind the implementation. Constraints that are only implied (e.g., "obviously we keep the same stack") are findings — the bar requires them stated.
6. **Explicit decisions** — settled trade-offs inlined where operative (in scope notes, in constraint statements, in expected-behavior caveats, in acceptance preconditions). A spec that references a decision but does not include or point at its resolution fails the bar at this element.
7. **Unresolved questions** — open issues that do NOT block emission. Present and named openly. A spec with no unresolved-questions section and no signal that it is fully closed is suspect — either the author thought through all questions (and the spec is fully closed), or some remain (and they belong here).
8. **Acceptance guidance** — how a reviewer will know the implementation is right. Without this, the downstream cannot self-verify; review of the implementation is forced back to the author for every ambiguous case. The bar requires this stated.

The spec body's structure, section names, and ordering are at the spec author's discretion — what is NOT at their discretion is that every one of the eight elements must appear in the body so the spec reads as handoff-grade. This skill's job is to verify that obligation has been met.

**Severity mapping** (suggested; executor may refine):

- A **missing** element is a `blocker` — the spec cannot reasonably be handed downstream without it.
- A **partially-covered** element is an `issue` — the spec can be handed downstream, but the implementer will hit a wall on the missing sub-aspect (e.g., scope is named but non-scope is silent; expected behavior covers happy-path but not error handling).
- A **vague-but-present** element is a `nit` — the element is named but the prose is soft enough that two implementers would translate it differently (false precision: "robust", "scalable", "modern", "clean", "appropriate", "as needed" — common red flags).

## What This Skill Reviews

The check is: a downstream reader with no prior context can read the spec alone and know what to build. That bar means the eight elements above must all be present AND coherent.

Beyond the per-element check, the broader pass surfaces:

- **Gaps** — required information the spec is silent on, especially at element boundaries (scope element silent on what's out; constraints element silent on the harness; acceptance silent on observable side effects).
- **Ambiguities** — statements that admit more than one reasonable reading. Soft language is the most common signal — "robust", "scalable", "modern", "clean", "appropriate", "as needed", "where appropriate", "if needed". Each one of these in a spec is a candidate `nit` finding because two implementers will resolve it two different ways.
- **Contradictions** — places where two parts of the spec point in different directions. The scope statement promises one thing; the constraints exclude that thing. The intended outcome says A; the acceptance guidance only checks for B.
- **Hidden assumptions** — things the spec takes for granted but never articulates. Ask: would a downstream implementer arrive at the same assumption, or would they have to guess?
- **False precision** — passages that *sound* decided but don't actually pin down enough to act on. The soft words above are the surface signal; the deeper test is whether a downstream implementer would have to guess between two reasonable interpretations.
- **Unjustified absolutes** — every "must / never / only / always" claim deserves a check. Is the boundary precise? What happens at the edge? Is the absolute actually necessary or accidental over-commitment?

Tether every finding to **downstream impact**. "This is vague" is not a finding — "this is vague, and a downstream implementer would have to guess whether X means A or B" is. A finding without a downstream tether is noise; cut it or sharpen it.

This skill does NOT promise: source-spec adherence checks for a derived plan, code-vs-original-intent fidelity checks, general-purpose code review, or adversarial pressure on the spec. For adversarial devil's-advocate pressure, recommend a separate adversarial review pass. A finding that escalates beyond the handoff-grade-bar check is out of scope here — flag it as a suggestion to escalate rather than performing the heavier check inline.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized findings-first. The body MUST cover the following six sections in this order:

1. **`## Verdict`** — overall judgment on the spec against the handoff-grade bar. Suggested vocabulary (executor MAY refine): `ready` (the spec passes the bar; downstream can act on it), `partially ready` (some elements need addressing first; specify which), `not ready` (one or more elements is missing or substantially incoherent; the spec needs a new version before downstream work). One overall verdict plus a one-line tether to the highest-impact finding below.
2. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit` per the mapping above). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which of the eight elements it concerns (or whether it is a cross-element finding such as a contradiction), (b) what is wrong (missing / partial / vague / contradictory / false-precision / unjustified-absolute / hidden-assumption), (c) why it matters for whoever picks up the spec next.
3. **`## Evidence`** — for each finding above, cite the spec section heading or a short quote (≤ one sentence). Reference, do not recite — quoting the spec back to the author is noise. Cite by section heading where possible.
4. **`## References`** — list every artifact the review reads or depends on: the spec path being reviewed (absolute path), any decision logs the spec cites (by absolute path plus decision identifier for specific operative decisions), and any prior review-findings on the same spec (also by absolute path). If a spec cites a decision log and that decision contradicts the spec body, the contradiction is one of the findings above and the reference here is what backs it.
5. **`## Open Questions`** — clarifications worth confirming with the spec author or downstream reader. Frame as questions, not as gaps to autofill. If a question can only be answered by the author, say so. If a question would normally surface in subsequent planning or implementation, say that too.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: emit a new spec version (an emitted spec is immutable; the revision is a new version artifact), open a discussion to settle a specific finding, run an adversarial review pass for a specific risk surface, or escalate to planning once findings are addressed. One action per finding cluster; do not pad.

Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. Do NOT collapse two sections into one; the explicit separation lets a downstream reader scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one spec; emitting one file per finding would clutter the inbox.

## Output Artifact

Write the review artifact to:

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

The `review-finding` artifact-type token is MANDATORY — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form because reviews are records, not versioned artifacts.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<spec-slug>-v<N>-review` (capturing which spec version was reviewed) or `<spec-slug>-review` followed by a phrase capturing the highest-impact finding.
- The `inbox/open/` folder is created on-demand if it does not yet exist. Do not pre-create empty folders.

Example filename:

```text
260521101212Z-auth-spec-v1-review-finding.md
```

The artifact lives in `inbox/open/` rather than a separate `reviews/` folder. Review findings are inbox items, and their open/processed/dropped status is reflected by folder. Once a finding has been addressed (typically by emitting a new spec version), the review-finding is moved from `inbox/open/` to `inbox/processed/` — that lifecycle is manual and out of scope for this skill.

The review body is plain markdown — no YAML frontmatter on the review artifact itself.

## Adversarial Review

Adversarial pressure on a spec — pre-mortem analysis, devil's-advocate cross-examination, "what's missing that would kill this" framing — is outside the scope of this skill. This skill performs the handoff-grade-bar check only.

If the user wants an adversarial review in addition to (or instead of) the handoff-grade-bar pass, run a separate adversarial review pass against the spec. The resulting adversarial findings may be cited under `## References` in a subsequent review run if the user wants them folded into the standard review-finding artifact.

A spec that has had a handoff-grade-bar pass but not an adversarial pass is still missing the adversarial layer — flag that in `## Next Actions` if the spec is high-stakes enough to warrant it.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the spec artifact.** Detect the spec path from the user's invocation. If the path is unsupplied, vague ("the spec", "v2"), or multiple plausible specs exist, ASK the user which is intended. Do not pick by recency or version number. Confirm the resolved path before reading.

3. **Read the spec READ-ONLY.** Emitted spec artifacts are immutable — this skill reads the spec but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the spec body. The review report is the deliverable, not a rewritten spec. Read end-to-end at least once before noting findings.

4. **Check each of the eight elements.** For each element (intended outcome / context / scope-non-scope / expected behavior / constraints / explicit decisions / unresolved questions / acceptance guidance), confirm it is present and coherent. Apply the severity mapping: a missing element is `blocker`; a partially-covered element is `issue`; a vague-but-present element is `nit`.

5. **Apply the broader gaps/ambiguities/false-precision/unjustified-absolutes pass.** Beyond the per-element check, surface contradictions, hidden assumptions, soft language (red-flag words), unjustified absolutes, and any cross-element coherence issues. Tether every finding to downstream impact — what would a future implementer have to guess about?

6. **Draft the findings-first report.** Compose the six sections in order: `## Verdict` → `## Findings` → `## Evidence` → `## References` → `## Open Questions` → `## Next Actions`. Skip a section entirely if it has nothing real to add. Order findings within `## Findings` by impact (severity then by element index), not by where they appear in the spec.

7. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

8. **Write the review artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. The `review-finding` artifact-type suffix is MANDATORY. The `inbox/open/` folder is created on-demand if it does not yet exist.

9. **Confirm.** Tell the user: `Review written: <relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review-finding artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit flow. Do not stage, do not commit, do not push, do not branch.

## Immutability

Emitted review-finding artifacts are immutable. Once the file is written into `inbox/open/`, it is part of the thread's reviewable history and is NOT edited. A typo discovered in an emitted review-finding means writing a NEW review-finding record (new UTC stamp, new kebab-desc) — not an in-place edit.

The spec under review is ALSO IMMUTABLE. The reviewer reads READ-ONLY and does NOT edit the spec. Findings that warrant revisions to the spec are surfaced under `## Next Actions` with the explicit recommendation to emit a NEW version of the spec — never an instruction to edit the existing spec in place.

No source-relation YAML frontmatter is added to the review body — lineage between a review-finding and the spec it reviews lives in the `## References` section (by absolute path), not in metadata on the file. The filename alone cannot tell you which spec a review reviewed — that mapping is recovered from the body's references section.
