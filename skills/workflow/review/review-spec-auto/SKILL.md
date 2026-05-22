---
name: review-spec-auto
description: Read an emitted V1 spec artifact at `docs/threads/<thread>/specs/<UTC>-v<N>[-<descriptor>]-spec.md` and write a findings-first review report to the active thread's `inbox/open/<UTC>-<kebab-desc>-review-finding.md` that explicitly checks all EIGHT D50 semantic-contract elements (intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance) against the handoff-grade bar — end-to-end, with no clarifying questions and no per-finding chat walk. Use when you want a lightweight autonomous handoff-grade-bar review of a spec — not when you want to walk findings together one at a time (use `review-spec-interactive` for that), and not when you want adversarial pressure on the spec (delegate to the external `the-fool` skill per V1 review-family policy). This skill evolves the legacy `review-decision-document` handoff-grade-bar logic against Phase 3's locked spec contract.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Spec Auto

Read a V1 spec artifact READ-ONLY and emit a findings-first review report to the active thread's `inbox/open/` folder under the V1 record-form filename grammar with the `review-finding` artifact-type token. This skill is the autonomous half of the V1 spec-review pair — it reads the spec, checks every one of the eight D50 semantic-contract elements against the handoff-grade bar, drafts the report end-to-end, and writes one record per review run. It does not ask clarifying questions, it does not walk findings with the user one-at-a-time, and it does not commit. For the collaborative per-element / per-finding walk with anti-sycophancy push-back, use the sibling skill `review-spec-interactive` instead.

`review-spec-auto` is one of TEN V1 review skills, paired across five review targets — proposal, spec, plan, implementation, code — each with an `-auto` and an `-interactive` variant. Two axes are independent: the REVIEW TARGET (spec here; proposal / plan / implementation / code in the other four pairs) and the AUTONOMY axis (autonomous here; collaborative in the sibling). The review target this skill addresses is the SPEC — a handoff-grade artifact under the thread's `specs/` folder emitted by `skills/workflow/spec/spec-auto/SKILL.md` or `skills/workflow/spec/spec-interactive/SKILL.md`. The lighter check for an early proposal sketch lives in `review-proposal-auto` / `review-proposal-interactive`; the granularity-and-ambiguity check for a plan lives in `review-plan-auto` / `review-plan-interactive`.

This skill applies the **HANDOFF-GRADE BAR** per D82 — the bar that a downstream implementer with no prior context can deliver the same work the author had in mind by reading the spec alone. That is the V1 spec contract owned by Phase 3: the eight semantic-contract elements enumerated below. A spec that does not cover one of them — or covers it ambiguously enough that two different implementers would build two different things — fails the bar.

This skill **evolves** the legacy `skills/deprecated/review-decision-document/SKILL.md` (now retired — see that file for the deprecation notice). The legacy framing — "stress-test against the bar that a recipient could deliver the same work the author had in mind" — is preserved. What changed: the bar is now the locked Phase 3 spec contract (the eight D50 elements), and the review target is now scoped specifically to V1 spec artifacts under `specs/`, not freeform decision documents.

## Inputs

This skill accepts ONE input: a V1 spec artifact path under `docs/threads/<thread>/specs/<UTC>-v<N>[-<descriptor>]-spec.md` per the V1 versioned-form grammar at `docs/workflow/v1/filename-grammar.md`. The path may be passed absolute or relative to the repo root.

If the path is not supplied, ASK the user which spec to review — do not pick by recency. If multiple plausible spec artifacts exist in `docs/threads/<thread>/specs/` and the user's reference is vague ("the spec", "the latest spec", "v2", "the auth spec"), ASK the user which artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is NO global "latest spec" algorithm. There is no fallback to the highest version number. Silently picking by version or recency would hide a real decision — which spec variant the user intends to review, which version branch survived discussion — behind a sort order. If `v2-onboarding-spec.md` and `v2-spec.md` coexist, ASK.

The literal folder `docs/threads/<thread>/specs/` is the only V1 location spec artifacts land in per `docs/workflow/v1/thread-layout.md`. If the path passed is not under that folder, refuse and ASK the user to confirm — a spec not in `specs/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a V1 spec.

## Eight Semantic-Contract Elements

A V1 spec MUST cover all EIGHT of the following elements in its body, per the contract owned by `skills/workflow/spec/spec-auto/SKILL.md` and `skills/workflow/spec/spec-interactive/SKILL.md`. This skill checks every one of them against the handoff-grade bar:

1. **Intended outcome** — what the spec, when implemented, produces for the user. The "what gets built" statement that grounds the rest of the document.
2. **Context** — why this is being built; what came before; what triggered the spec. Without this, a downstream reader has to reconstruct motivation from inference.
3. **Scope / non-scope** — the boundary statement, INCLUDING what is explicitly out. A spec without an explicit non-scope statement leaves the boundary open to the implementer's interpretation — that is precisely the failure mode the handoff-grade bar guards against.
4. **Expected behavior** — the observable behaviors a future executor needs. State changes, return values, error surfaces, side effects. The downstream's contract.
5. **Constraints** — tech, repo, harness, and safety constraints that bind the implementation. Constraints that are only implied (e.g., "obviously we keep the same stack") are findings — the bar requires them stated.
6. **Explicit decisions** — settled trade-offs INLINED where operative (in scope notes, in constraint statements, in expected-behavior caveats, in acceptance preconditions). When the spec cites a decision log by `D<N>` ID, follow the reference and confirm the decision is actually settled there. A spec that promises a decision but does not point at its source fails the bar at this element.
7. **Unresolved questions** — open issues that do NOT block emission. Present and named openly. A spec with no unresolved-questions section and no signal that it is fully closed is suspect — by the bar, either the author thought through all questions (and the spec is fully closed), or some remain (and they belong here).
8. **Acceptance guidance** — how a reviewer will know the implementation is right. Without this, the downstream cannot self-verify; review of the implementation is forced back to the author for every ambiguous case. The bar requires this stated.

The contract is owned by Phase 3: the spec body's structure, section names, and ordering are at the spec author's discretion per `skills/workflow/spec/spec-auto/SKILL.md` and `skills/workflow/spec/spec-interactive/SKILL.md` — what is NOT at their discretion is that every one of the eight elements must appear in the body so the spec reads as handoff-grade. This skill's job is to verify that obligation has been met.

**Severity mapping** (suggested; executor may refine):

- A **missing** element is a `blocker` — the spec cannot reasonably be handed downstream without it.
- A **partially-covered** element is an `issue` — the spec can be handed downstream, but the implementer will hit a wall on the missing sub-aspect (e.g., scope is named but non-scope is silent; expected behavior covers happy-path but not error handling).
- A **vague-but-present** element is a `nit` — the element is named but the prose is soft enough that two implementers would translate it differently (false precision: "robust", "scalable", "modern", "clean", "appropriate", "as needed" — common red flags).

These three severity tags — `blocker`, `issue`, `nit` — are the V1 standard for the findings-first report, established in Plan 06-01.

## What This Skill Reviews

This is the **handoff-grade bar** review of the five V1 review targets. The check is: a downstream reader with no prior context can read the spec alone and know what to build. That bar means the eight elements above must all be present AND coherent.

Beyond the per-element check, the broader pass surfaces:

- **Gaps** — required information the spec is silent on, especially at element boundaries (scope element silent on what's out; constraints element silent on the harness; acceptance silent on observable side effects).
- **Ambiguities** — statements that admit more than one reasonable reading. Soft language is the most common signal — "robust", "scalable", "modern", "clean", "appropriate", "as needed", "where appropriate", "if needed". Each one of these in a spec is a candidate `nit` finding because two implementers will resolve it two different ways.
- **Contradictions** — places where two parts of the spec point in different directions. The scope statement promises one thing; the constraints exclude that thing. The intended outcome says A; the acceptance guidance only checks for B.
- **Hidden assumptions** — things the spec takes for granted but never articulates. Ask: would a downstream implementer arrive at the same assumption, or would they have to guess?
- **False precision** — passages that *sound* decided but don't actually pin down enough to act on. The soft words above are the surface signal; the deeper test is whether a downstream implementer would have to guess between two reasonable interpretations.
- **Unjustified absolutes** — every "must / never / only / always" claim deserves a check. Is the boundary precise? What happens at the edge? Is the absolute actually necessary or accidental over-commitment? The legacy `review-decision-document` flagged these directly; the same prose-density carries here.

Tether every finding to **downstream impact**. "This is vague" is not a finding — "this is vague, and a downstream implementer would have to guess whether X means A or B" is. A finding without a downstream tether is noise; cut it or sharpen it.

This skill does NOT promise: source-spec adherence checks (that lives in `review-plan-*` against the spec the plan was built from), code-vs-original-intent fidelity (that lives in `review-implementation-*`), general-purpose code review (that lives in `review-code-*`), or the lightweight proposal review for an early sketch (that lives in `review-proposal-*`). A finding that escalates beyond the handoff-grade-bar check is out of scope here — flag it as a suggestion to escalate to one of the other review skills rather than performing the heavier check inline.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized findings-first per V1 review-family policy. The body MUST cover the following six sections in this order:

1. **`## Verdict`** — overall judgment on the spec against the handoff-grade bar. Suggested vocabulary (executor MAY refine): `ready` (the spec passes the bar; downstream can act on it), `partially ready` (some elements need addressing first; specify which), `not ready` (one or more elements is missing or substantially incoherent; the spec needs a `v<N+1>` before downstream work). One overall verdict plus a one-line tether to the highest-impact finding below.
2. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit` per the mapping above). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which of the eight D50 elements it concerns (or whether it is a cross-element finding such as a contradiction), (b) what is wrong (missing / partial / vague / contradictory / false-precision / unjustified-absolute / hidden-assumption), (c) why it matters for whoever picks up the spec next.
3. **`## Evidence`** — for each finding above, cite the spec section heading or a short quote (≤ one sentence). Reference, do not recite — quoting the spec back to the author is noise. Cite by section heading where possible.
4. **`## References`** — list every artifact the review reads or depends on: the spec path being reviewed (absolute path under `docs/threads/<thread>/specs/`), any decision logs the spec cites by absolute path plus `D<N>` for specific operative decisions, and any prior review-findings on the same spec (also by absolute path). If a spec cites a decision log by `D<N>` and that decision contradicts the spec body, the contradiction is one of the findings above and the reference here is what backs it.
5. **`## Open Questions`** — clarifications worth confirming with the spec author or downstream reader. Frame as questions, not as gaps to autofill. If a question can only be answered by the author, say so. If a question would normally surface in subsequent planning or implementation, say that too — and recommend the downstream skill that should pick it up.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: emit a new spec version (per `docs/workflow/v1/immutability.md`, an emitted spec is immutable; the revision is a new `v<N+1>` artifact), open a discussion via `skills/workflow/capture-discussion/discussion/SKILL.md` or `skills/workflow/capture-discussion/seeded-discussion/SKILL.md` to settle a specific finding, invoke `the-fool` for adversarial pressure on a specific risk surface (see `## The Fool Delegation`), or escalate to planning via `skills/workflow/plan/plan-loose-auto/SKILL.md` / `skills/workflow/plan/plan-strict-auto/SKILL.md` once findings are addressed. One action per finding cluster; do not pad.

The six section headings are the V1 standard for the findings-first report shape per the V1 review-family CONTEXT (established in Plan 06-01). Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. Do NOT collapse two sections into one; the explicit separation lets a downstream reader (or the interactive sibling resuming the same review topic) scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one spec; emitting one file per finding would clutter `inbox/open/` and break the "one record per review run" V1 review-family convention.

## Output Artifact

Write the review artifact to:

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

per the V1 record-form grammar at `docs/workflow/v1/filename-grammar.md` and the inbox routing rule at `docs/workflow/v1/thread-layout.md`. The `review-finding` artifact-type token is MANDATORY — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form (`v<N>`) because reviews are records, not versioned artifacts.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<spec-slug>-v<N>-review` (capturing which spec version was reviewed) or `<spec-slug>-review` followed by a phrase capturing the highest-impact finding. The slug is part of the filename and is not user-confirmed in auto mode; the spec slug + version is treated as authoritative.
- The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation"). Do not pre-create empty folders.

Example filename:

```text
260521101212Z-auth-spec-v1-review-finding.md
```

For the full record-form grammar and the recognized V1 artifact-type list (which includes `review-finding` alongside `proposal`, `spec`, `plan`, `discussion`, `decision-log`, `inbox-item`), see `docs/workflow/v1/filename-grammar.md`.

The artifact lives in `inbox/open/` rather than `reviews/` — per `docs/workflow/v1/thread-layout.md`, V1 explicitly excludes a top-level `reviews/` folder; review findings ARE inbox items, and the inbox open/processed/dropped status is reflected by folder, not by frontmatter. Once a finding has been addressed (typically by emitting a `v<N+1>` spec), the review-finding is moved from `inbox/open/` to `inbox/processed/` — that lifecycle is manual in V1 and out of scope for this skill.

## The Fool Delegation

Adversarial pressure on a spec — pre-mortem analysis, devil's-advocate cross-examination, "what's missing that would kill this" framing — is DELEGATED to the external `the-fool` skill per V1 review-family policy (D88). There is no native V1 adversarial-review skill, and this skill (`review-spec-auto`) does NOT perform an adversarial pass.

If the user wants an adversarial review of a spec in addition to (or instead of) the handoff-grade-bar pass:

- Invoke `the-fool` separately against the spec — it operates outside the V1 review-family skill set and produces its own adversarial deliverable.
- Cite the resulting `the-fool` artifact (if any) under `## References` in a subsequent `review-spec-*` run if the user wants the adversarial findings folded into the standard review-finding artifact.

This skill performs the handoff-grade-bar check, NOT the adversarial pass. A spec that has had a `review-spec-*` pass but not a `the-fool` pass is still missing the adversarial layer — flag that in `## Next Actions` if the spec is high-stakes enough to warrant it.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Resolve the spec artifact.** Detect the spec path from the user's invocation. If the path is unsupplied, vague ("the spec", "v2"), or multiple plausible specs exist in `docs/threads/<thread>/specs/`, ASK the user which is intended. Do not pick by recency or version number. Confirm the resolved path before reading.

3. **Read the spec READ-ONLY.** Per `docs/workflow/v1/immutability.md`, emitted spec artifacts are immutable. This skill reads the spec but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the spec body. The review report is the deliverable, not a rewritten spec. Read end-to-end at least once before noting findings.

4. **Check each of the eight D50 elements.** For each element (intended outcome / context / scope-non-scope / expected behavior / constraints / explicit decisions / unresolved questions / acceptance guidance), confirm it is present and coherent. Apply the severity mapping: a missing element is `blocker`; a partially-covered element is `issue`; a vague-but-present element is `nit`. Follow any `D<N>` decision-log citations to verify the cited decision is actually settled there.

5. **Apply the broader gaps/ambiguities/false-precision/unjustified-absolutes pass.** Beyond the per-element check, surface contradictions, hidden assumptions, soft language (red-flag words), unjustified absolutes, and any cross-element coherence issues. Tether every finding to downstream impact — what would a future implementer have to guess about?

6. **Draft the findings-first report.** Compose the six sections in order: `## Verdict` → `## Findings` → `## Evidence` → `## References` → `## Open Questions` → `## Next Actions`. Skip a section entirely if it has nothing real to add. Order findings within `## Findings` by impact (severity then by D50-element index), not by where they appear in the spec.

7. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

8. **Write the review artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. The `review-finding` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md`. The review body is plain markdown — no YAML frontmatter on the review artifact itself.

9. **Confirm.** Tell the user: `Review written: <relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review-finding artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session (per `docs/workflow/v1/immutability.md`, "Drafts Are Editable") but are never committed by this skill.

## Immutability

Emitted review-finding artifacts are immutable per `docs/workflow/v1/immutability.md`. Once the file is written into `inbox/open/`, it is part of the thread's reviewable history and is NOT edited. A typo discovered in an emitted review-finding means writing a NEW review-finding record (new UTC stamp, new kebab-desc) — not an in-place edit. A revision to a review-finding is a NEW review-finding artifact, not an in-place edit.

The spec under review is ALSO IMMUTABLE per the same rules. The reviewer reads READ-ONLY and does NOT edit the spec. Findings that warrant revisions to the spec are surfaced under `## Next Actions` with the explicit recommendation to emit a NEW `v<N+1>` spec record — never an instruction to edit the existing spec in place.

No source-relation YAML frontmatter is added to the review body — lineage between a review-finding and the spec it reviews lives in the `## References` section (by absolute path), not in metadata on the file. Per `docs/workflow/v1/immutability.md`, the accepted trade-off is that the filename alone cannot tell you which spec a review reviewed — that mapping is recovered from the body's references section.
