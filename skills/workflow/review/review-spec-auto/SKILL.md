---
name: review-spec-auto
description: Read a spec artifact and write a references-first review report checking all eight semantic-contract elements against the handoff-grade bar and consistency with the thread's decision logs when the user wants an autonomous spec quality review.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Review Spec Auto

Read a spec artifact READ-ONLY and emit a references-first review report into the target spec's `reviews/` folder. This skill reads the spec, checks every one of the eight semantic-contract elements against the handoff-grade bar, checks the spec for consistency with the thread's decision logs, drafts the report end-to-end, and writes one record per review run. It does not ask clarifying questions and it does not walk findings with the user one-at-a-time. It does not commit.

## Inputs

This skill accepts ONE input: the path to a spec artifact. A spec lives at `specs/NNN[-<desc>]/spec.md` inside the thread root. The path may be passed thread-relative or repo-relative.

If the path is not supplied, ASK the user which spec to review — do not pick by recency. If the thread holds multiple spec lineages (`specs/001-api/`, `specs/002-cli/`) and the user's reference is vague ("the spec", "the auth spec"), ASK which lineage is intended. There is NO "most recent lineage" or "highest `NNN`" fallback. Each lineage holds exactly one alive `spec.md` whose version lives in its frontmatter, so "which version" never arises — but "which lineage" can, and silently picking by number would hide a real decision (which lineage variant the user intends to review) behind a sort order. If the reference could point at a spec in another thread, ASK which thread.

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
- **Consistency with the thread's decision logs** — see `## Consistency With Decision Logs` below. This is part of the standard spec review.

Tether every finding to **downstream impact**. "This is vague" is not a finding — "this is vague, and a downstream implementer would have to guess whether X means A or B" is. A finding without a downstream tether is noise; cut it or sharpen it.

This skill does NOT promise: source-spec adherence checks for a derived plan, code-vs-original-intent fidelity checks, general-purpose code review, or adversarial pressure on the spec. For adversarial devil's-advocate pressure, recommend a separate adversarial review pass. A finding that escalates beyond the handoff-grade-bar check is out of scope here — flag it as a suggestion to escalate rather than performing the heavier check inline.

## Consistency With Decision Logs

Part of the standard spec review is verifying that the spec is consistent with the thread's decision logs — not just internally coherent. Read the thread's decision-log records (typically under `specs/<lineage>/discussions/`, `proposals/<lineage>/discussions/`, or `seed/discussions/`; filename token `decision-log`) and confirm that:

- **No settled decision is contradicted.** If a decision log settled a trade-off one way and the spec commits to the opposite, that contradiction is a finding (typically a `blocker` or `issue`).
- **No settled point is silently reversed.** If the spec quietly drops or inverts something the thread already decided, without naming the reversal, that is a finding. A reversal may be legitimate, but it must be explicit and traceable — silent reversal fails the bar.

Tie each such finding to the specific decision-log record and decision identifier that backs it, and cite that record under `## References`.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized references-first. The body MUST cover the following sections in this order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`.

1. **`## References`** — FIRST, before any verdict. List every artifact the review reads or depends on, naming the spec under review at the top. One entry per line as `- <description>: <path>`. Each path carries a description — never a bare path list. Paths to artifacts in THIS thread are **thread-relative** (written relative to the thread root, e.g. `specs/001/spec.md`, `specs/001/discussions/<UTC>-<desc>-decision-log.md`); cross-thread artifacts are **repo-relative** (e.g. `docs/threads/<other>/...`). **Never absolute.** Include the spec path being reviewed, any decision logs the spec is checked against (with the decision identifier for specific operative decisions), and any prior reviews on the same spec.
2. **`## Verdict`** — overall judgment on the spec against the handoff-grade bar. Suggested vocabulary (executor MAY refine): `ready` (the spec passes the bar; downstream can act on it), `partially ready` (some elements need addressing first; specify which), `not ready` (one or more elements is missing or substantially incoherent; the spec needs revision before downstream work). One overall verdict plus a one-line tether to the highest-impact finding below.
3. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit` per the mapping above). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which of the eight elements it concerns (or whether it is a cross-element finding such as a contradiction or a decision-log inconsistency), (b) what is wrong (missing / partial / vague / contradictory / false-precision / unjustified-absolute / hidden-assumption / decision-log-conflict), (c) why it matters for whoever picks up the spec next.
4. **`## Evidence`** — for each finding above, cite the spec section heading or a short quote (≤ one sentence). Reference, do not recite — quoting the spec back to the author is noise. Cite by section heading where possible. For a decision-log inconsistency, cite both the spec passage and the conflicting decision-log record.
5. **`## Open Questions`** — clarifications worth confirming with the spec author or downstream reader. Frame as questions, not as gaps to autofill. If a question can only be answered by the author, say so. If a question would normally surface in subsequent planning or implementation, say that too.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: revise the spec in place to address the findings, open a discussion to settle a specific finding, run an adversarial review pass for a specific risk surface, or escalate to planning once findings are addressed. One action per finding cluster; do not pad.

Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add, drop the heading. The only section that is never dropped is `## References` (the spec under review is always named). Do NOT collapse two sections into one; the explicit separation lets a downstream reader scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one spec.

## Output Artifact

A review is a **record** that nests inside the spec it serves. Write the review artifact to the target spec's `reviews/` folder:

```text
specs/NNN[-<desc>]/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

The `review` artifact-type token is MANDATORY — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form (reviews are records, not versioned artifacts; they carry no `version`).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<spec-slug>-review` followed by (or replaced with) a phrase capturing the highest-impact finding.
- The spec's `reviews/` folder is created on-demand if it does not yet exist. Do not pre-create empty folders.

Example path:

```text
specs/001/reviews/260521101212Z-auth-spec-review.md
```

There is NO open/processed/dropped lifecycle and NO folder-move to express status. A review's disposition is not expressed by where it lives.

### Disposition Frontmatter

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

Adversarial pressure on a spec — pre-mortem analysis, devil's-advocate cross-examination, "what's missing that would kill this" framing — is outside the scope of this skill. This skill performs the handoff-grade-bar check and the decision-log consistency check only.

If the user wants an adversarial review in addition to (or instead of) the standard pass, run a separate adversarial review pass against the spec. The resulting adversarial findings may be cited under `## References` in a subsequent review run if the user wants them folded into the standard review artifact.

A spec that has had a standard review pass but not an adversarial pass is still missing the adversarial layer — flag that in `## Next Actions` if the spec is high-stakes enough to warrant it.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the spec artifact.** Detect the spec path from the user's invocation. If the path is unsupplied, vague ("the spec"), or the thread holds multiple spec lineages, ASK the user which lineage is intended. Do not pick by recency or `NNN`. Confirm the resolved path before reading.

3. **Read the spec READ-ONLY.** This skill reads the spec but does NOT edit it, does NOT rewrite it, does NOT add or change its frontmatter, and does NOT propose edits to the spec body. The review report is the deliverable, not a rewritten spec. Read end-to-end at least once before noting findings.

4. **Read the thread's decision logs READ-ONLY.** Locate the thread's `decision-log` records and read them so the consistency-with-decision-logs check can run. If no decision logs exist in the thread, note that and skip the check.

5. **Check each of the eight elements.** For each element (intended outcome / context / scope-non-scope / expected behavior / constraints / explicit decisions / unresolved questions / acceptance guidance), confirm it is present and coherent. Apply the severity mapping: a missing element is `blocker`; a partially-covered element is `issue`; a vague-but-present element is `nit`.

6. **Apply the broader gaps/ambiguities/false-precision/unjustified-absolutes pass AND the decision-log consistency check.** Beyond the per-element check, surface contradictions, hidden assumptions, soft language (red-flag words), unjustified absolutes, cross-element coherence issues, and any inconsistency between the spec and the thread's decision logs (no settled decision contradicted, no settled point silently reversed). Tether every finding to downstream impact — what would a future implementer have to guess about?

7. **Draft the references-first report.** Compose the sections in order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`. The `## References` section comes first and names the spec under review before any verdict, with within-thread paths thread-relative and cross-thread paths repo-relative (never absolute). Skip a downstream section if it has nothing real to add; never skip `## References`. Order findings within `## Findings` by impact (severity then by element index), not by where they appear in the spec.

8. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

9. **Write the review artifact.** Create `specs/NNN[-<desc>]/reviews/<UTC>-<kebab-desc>-review.md` under the target spec's lineage folder. The `review` artifact-type suffix is MANDATORY. Emit it with NO `status.disposed` field — it is open by parse. The `reviews/` folder is created on-demand if it does not yet exist.

10. **Confirm.** Tell the user: `Review written: <thread-relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit flow. Do not stage, do not commit, do not push, do not branch.

## Immutability

A review is a record. Its **body is frozen at emission** — once the file is written into the spec's `reviews/` folder, the body is part of the thread's reviewable history and is NOT rewritten. A typo discovered in an emitted review's body means writing a NEW review record (new UTC stamp, new kebab-desc), not an in-place body edit.

The review's **frontmatter `status:` map is a live surface** until the review is disposed: the `status.disposed` / `status.disposition` / optional `status.rationale` entries may be set once when the review is acted on (this skill does not set them — it emits the review open). Once `status.disposed` is set, the frontmatter freezes too.

The spec under review is reviewed READ-ONLY by this skill. Findings that warrant changes to the spec are surfaced under `## Next Actions`; whether and how the spec is revised in place is a downstream decision recorded by setting this review's disposition frontmatter (accept-and-revise) — never an instruction this skill executes against the spec.

No source-relation or lineage frontmatter (`Supersedes:`, `Forked from:`, etc.) is added — lineage between a review and the spec it reviews lives in the `## References` section, not in metadata. The only frontmatter a review carries is its lifecycle `status:` map (and only once disposed).
