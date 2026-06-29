---
targets:
  agent-skill:
    frontmatter:
      name: review-lossless-mapping
      description: Read a set of discussions and the document produced from them, then write a references-first review report verifying the mapping is lossless and additive-free — flagging only smuggled-in decisions/assumptions and dropped user decisions — when the user wants to confirm a document (typically a spec) committed to nothing the user did not see and accept and left nothing out.
      metadata:
        author: https://github.com/Jei-sKappa
        version: 1.0.0
inputs:
  open-by-parse-trailer:
    type: string
    required: false
    default: '**open, mechanically, by parse.** There is no separate "open" marker; the absence of the latch is the open state.'
  disposition-record:
    type: string
    required: false
    default: the **revision of the document is the record**
  rationale-bullet:
    type: string
    required: false
    default: The optional `rationale` is a thread-relative path to the follow-on discussion, if one happened. **The discussion that disposes the findings is the optional linked `rationale` — it never owns the disposition.** The frontmatter does.
  disposed-state:
    type: string
    required: false
    default: with no
  has-disposing-aside:
    type: boolean
    required: false
    default: true
  disposing-aside:
    type: string
    required: false
    default: ' — in the follow-on discussion where the human judgment lands —'
  has-frontmatter-lineage-tail:
    type: boolean
    required: false
    default: true
  frontmatter-lineage-tail:
    type: string
    required: false
    default: ' The only frontmatter a review carries is its lifecycle `status:` map (and only once disposed); no source-relation or lineage frontmatter (`Supersedes:`, `Forked from:`, etc.) — the link between the review and the document/discussions lives in `## References`, not in metadata.'
---
# Review Lossless Mapping

Read a document and the discussions it was produced from, READ-ONLY, and emit a references-first review report into the reviewed document's `reviews/` folder. This skill verifies that the document is a **lossless and additive-free** mapping of what the user actually saw and accepted in the discussions: nothing the user never agreed to was smuggled in, and nothing the user decided was dropped. It does not edit the document, it does not ask clarifying questions one-at-a-time, and it does not walk findings with the user. It does not commit.

This is the **detection side** of the document's own authoring constraint: a document (typically a spec) is supposed to commit to no decision or assumption the user did not see and accept in the discussions, unless the document explicitly marks it a Degree of Freedom. This review confirms that obligation was met. This skill produces the findings; a separate discussion disposes them.

## Inputs

This skill accepts two kinds of input:

1. **The document under review** — the artifact produced from the discussions. Typically a spec at `specs/NNN[-<desc>]/spec.md` inside the thread root, but it may be ANY document produced from discussions (a proposal, a plan, or another artifact). The path may be passed thread-relative or repo-relative.
2. **The discussions (and/or upstream input) the document maps from** — the source decisions the document is supposed to faithfully carry. These are typically the thread's discussion and decision-log records under the document's `discussions/` folder (or `seed/discussions/` for genesis discussions, or an upstream proposal's `discussions/`).

If the document path is not supplied, ASK the user which document to review — do not pick by recency. If the thread holds multiple lineages of the same type (`specs/001-api/`, `specs/002-cli/`) and the user's reference is vague ("the spec"), ASK which lineage is intended. There is NO "most recent lineage" or "highest `NNN`" fallback — silently picking by number would hide a real decision (which lineage the user means) behind a sort order. If the reference could point at a document in another thread, ASK which thread.

If the discussions are not explicitly named, locate them under the document's `discussions/` folder and the thread's genesis discussions, and confirm the resolved set with the user before reading. Mapping against the wrong set of discussions invalidates the whole review.

## What "Lossless and Additive-Free" Means

Given a set of discussions (and/or upstream input) and the document produced from them, the mapping is lossless and additive-free when **every decision and assumption in the document traces to something the user saw and accepted in the discussions** (or is explicitly marked a Degree of Freedom), **and every decision the user made in the discussions is captured in the document.**

### The Unit Is a Decision or an Assumption — Never a Sentence

The unit of this check is **a decision or an assumption — NEVER a sentence.** A document freely elaborates discussed decisions into prose, structure, and derived content. The following are **NEVER flagged**:

- **Restatement** — the same decision said in different words.
- **Organization** — grouping, ordering, sectioning the discussed material.
- **Derived acceptance criteria** — machine-checkable ACs that follow mechanically from a discussed decision.
- **Formatting** — headings, lists, tables, emphasis.

Flagging restatement, organization, derived ACs, or formatting is the failure mode of this review — it turns a forcing function into noise. Do not do it.

### What IS Flaggable

A flaggable item is document content that:

- **(a) commits to a choice among alternatives** — it picks one option where the discussions left several open or never raised the choice at all; OR
- **(b) presupposes something not established** — it takes for granted a fact, constraint, or premise the discussions never settled,

**that the user NEITHER saw-and-accepted in the discussions NOR the document marks as a Degree of Freedom.**

### The Degrees-of-Freedom Section Is the Pressure Valve

A decision left to the implementer and recorded in the document's `## Degrees of freedom` section is **legitimately not-flagged.** The DoF section is the document author's explicit escape hatch: any specific they do not want to pin down is either discussed with the user OR marked a Degree of Freedom. An item that would otherwise be flaggable additive content under (a) or (b) is NOT a finding when the document explicitly declares it a Degree of freedom — the author has openly handed that choice to the implementer rather than silently committing to it. This is what turns the review into a forcing function rather than nagging: the author always has a legitimate way to say "I am deliberately not deciding this here."

## The Two-Section Output — Empty = Pass

The core of the report is exactly **two sections**:

- **(a) decisions/assumptions in the document the user never accepted** (and not marked DoF) — additive content smuggled in. Each item: what the document commits to or presupposes, the discussions' silence or different position on it, and the fact that it is not declared a Degree of freedom.
- **(b) decisions the user made that the document failed to capture** — lossy omissions. Each item: the decision the user made in the discussions (cite the discussion / decision-log record), and where the document should carry it but does not.

**If both sections are empty, the mapping is lossless and the review passes.** An empty pair is the success state, not a missing report — say so explicitly in the verdict. Do not pad either section with restatement-level observations to look thorough; a clean pass is a real, valuable result.

## Cadence

This review is a **strong recommendation when the work carries a design decision and is run with an approved, reviewed spec (tier ≥2)**, and it is run **before the spec is `approved` — it earns the approval.** It is part of the tier-2 Definition of Done **as a recommendation — not mechanically forced.** A spec the user is about to sign off on should pass this review first, so the human's approval is an approval of a document that faithfully carries what they actually decided.

**On demand otherwise** — the user may invoke it against any document produced from discussions at any time, regardless of tier or stage. When the reviewed document is a spec, prefer running it while the spec is still in Draft / In Review, before the `status.approved` latch is set.

## Findings Report Shape — References-First

The emitted review artifact is ONE record per review run, organized **references-first**. The body MUST cover the following sections in this order: `## References` → `## Verdict` → `## Findings` → `## Open Questions` → `## Next Actions`.

1. **`## References`** — FIRST, before any verdict. It names **the document under review** AND **every discussion (and/or upstream input) the document is mapped against** — the review is meaningless without both. One entry per line as `- <description>: <path>`. Every path carries a description — **never a bare path list.** Paths to artifacts in THIS thread are **thread-relative** (relative to the thread root, e.g. `specs/001/spec.md`, `specs/001/discussions/<UTC>-<desc>-decision-log.md`); cross-thread artifacts are **repo-relative** (e.g. `docs/threads/<other>/...`). **Never absolute.** Cite specific decision identifiers from the decision logs where a finding hinges on one.
2. **`## Verdict`** — overall judgment: the mapping is **lossless** (both sections below empty — the review passes) or **not lossless** (one or both sections have findings — name which). One line, plus a one-line tether to the highest-impact finding if any.
3. **`## Findings`** — the two-section core, in this exact order:
   - **`### (a) Smuggled-in — decisions/assumptions the user never accepted`** — additive content not seen-and-accepted and not marked DoF. One finding per bullet. State what the document commits to / presupposes, what the discussions actually established (or that they were silent), and confirm it is not declared a Degree of freedom.
   - **`### (b) Dropped — decisions the user made that the document failed to capture`** — lossy omissions. One finding per bullet. State the decision the user made (cite the source discussion / decision-log record and identifier), and where the document fails to carry it.
   - If a section has no findings, keep the heading and state "None — " plus the one-line reason, so a reader sees the section was checked and came up clean rather than dropped.
4. **`## Open Questions`** — items where it is genuinely unclear whether a document statement is a faithful restatement or a smuggled-in decision, OR whether a discussion point rose to the level of a "decision the user made." Frame as questions for the user to settle in the follow-on discussion, not as gaps to autofill. Drop the section if there is nothing real.
5. **`## Next Actions`** — what to do given the verdict. A clean pass: note the document is ready to carry the user's decisions forward (for a spec: ready to be approved on the lossless-mapping axis). Findings present: open a discussion to dispose them — add the missed decisions, remove or mark-as-DoF the smuggled ones — then re-run. One action per finding cluster; do not pad.

Skip a downstream section rather than padding it; the only section never dropped is `## References` (the document and its discussions are always named) and the two-section Findings core (whose empty state is the pass signal).

## Output Artifact

A review is a **record** that nests inside the document it serves. Write the review artifact to the reviewed document's `reviews/` folder — records attach to the spine node they serve. When the document is a spec, that is `specs/NNN[-<desc>]/reviews/`; for another document type it is that document's own `reviews/` folder (`proposals/NNN[-<desc>]/reviews/`, `plans/NNN[-<desc>]/reviews/`, `implementation/reviews/`).

```text
specs/NNN[-<desc>]/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

The `review` artifact-type token is **MANDATORY** — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form (reviews are records, not versioned artifacts; they carry no `version`).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` (literal pattern, trailing `Z` for UTC) is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<doc-slug>-lossless-mapping` or a phrase capturing the highest-impact finding.
- The document's `reviews/` folder is created on-demand if it does not yet exist. Do not pre-create empty folders.

Example path:

```text
specs/001/reviews/260521101212Z-spec-lossless-mapping-review.md
```

There is NO open/processed/dropped lifecycle and NO folder-move to express status — a review's disposition is never expressed by where it lives.

::include{root="group", path="partials/disposition-frontmatter.md"}

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the document under review.** Detect the document path from the user's invocation. If unsupplied, vague ("the spec"), or the thread holds multiple lineages of that type, ASK which lineage is intended. Do not pick by recency or `NNN`. Confirm the resolved path before reading.

3. **Resolve the discussions it maps from.** Locate the discussion and decision-log records the document was produced from — typically the document's `discussions/` folder plus the thread's genesis discussions under `seed/discussions/`. If the source set is not obvious, ASK the user to confirm which discussions are in scope. Mapping against the wrong source set invalidates the review.

4. **Read everything READ-ONLY.** Read the document end-to-end at least once, and read every in-scope discussion and decision-log record. This skill does NOT edit the document, does NOT rewrite it, does NOT add or change its frontmatter, and does NOT propose edits to its body. The review report is the deliverable, not a rewritten document.

5. **Build the decision/assumption inventory of the document.** Walk the document and extract every place it (a) commits to a choice among alternatives or (b) presupposes something. Treat restatement, organization, derived acceptance criteria, and formatting as NON-items — they are never flagged. Note which items the document explicitly declares in its `## Degrees of freedom` section.

6. **Map each document item against the discussions (section (a)).** For each committed choice or presupposition, check whether the user saw-and-accepted it in the discussions OR the document marks it a Degree of freedom. Anything that is NEITHER is a section-(a) finding — additive content smuggled in.

7. **Map each user decision against the document (section (b)).** For each decision the user made in the discussions, check whether the document captures it. Any decision the user made that the document failed to carry is a section-(b) finding — a lossy omission.

8. **Draft the references-first report.** Compose the sections in order: `## References` → `## Verdict` → `## Findings` (the two-section core (a)/(b)) → `## Open Questions` → `## Next Actions`. `## References` comes first and names both the document and its discussions, within-thread paths thread-relative and cross-thread paths repo-relative (never absolute, never a bare path list). If both Findings sections are empty, set the verdict to **lossless / passes** and say so explicitly.

9. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

10. **Write the review artifact.** Create `<document-lineage>/reviews/<UTC>-<kebab-desc>-review.md` under the reviewed document's `reviews/` folder. The `review` artifact-type suffix is MANDATORY. Emit it with NO `status.disposed` field — it is open by parse. The `reviews/` folder is created on-demand if it does not yet exist.

11. **Confirm.** Tell the user: `Review written: <thread-relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit flow. Do not stage, do not commit, do not push, do not branch.

## Immutability

A review is a record. Its **body is frozen at emission** — once written into the document's `reviews/` folder, the body is part of the thread's reviewable history and is NOT rewritten. A typo discovered in an emitted review's body means writing a NEW review record (new UTC stamp, new kebab-desc), not an in-place body edit.

The review's **frontmatter `status:` map is a live surface** until the review is disposed: the `status.disposed` / `status.disposition` / optional `status.rationale` entries may be set once when the review is acted on (this skill does not set them — it emits the review open). Once `status.disposed` is set, the frontmatter freezes too.

The document under review is reviewed READ-ONLY by this skill. Findings that warrant changes to the document are surfaced under `## Next Actions` and disposed downstream (in the follow-on discussion, then a revision of the document) — never an instruction this skill executes against the document.
