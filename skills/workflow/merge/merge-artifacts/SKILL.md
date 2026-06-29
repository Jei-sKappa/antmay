---
name: merge-artifacts
description: Reconcile two or more competing candidate drafts of one artifact
  into the single canonical artifact, folding non-conflicting content and
  preserving unresolvable subjective conflicts via HTML-comment markers; use
  when a multi-draft bake-off needs to be collapsed into one canonical artifact.
metadata:
  author: https://github.com/Jei-sKappa
  version: 3.0.0
---

# Merge Artifacts

Reads two or more candidate drafts READ-ONLY and produces ONE canonical artifact for the target lineage; by default it folds without a per-conflict walk or clarifying questions, but it honors an invocation that asks it to work through the conflicts interactively. Non-conflicting content is folded automatically; unresolvable subjective conflicts are preserved explicitly via an HTML-comment marker. The rationale for the merge is captured in a decision log; the candidate drafts stay in `.wip/`.

## The Merge Is a Bake-Off Collapse

The inputs to this skill are **competing candidate drafts of ONE subject** — the multi-model bake-off (e.g. opus vs sonnet vs codex drafting the same spec, or two parallel attempts at the same proposal). They are pre-emission draft work and live in **`.wip/`** (gitignored, editable). They are NOT emitted siblings, and merging them does NOT produce another sibling artifact.

The invariant: **one subject = one lineage folder = exactly one canonical artifact.** The merge collapses the candidate set into that single canonical artifact and records WHY the winner won (which parts of which candidate prevailed) in a decision log. The losing drafts vanish from the reviewable record by design — they remain only in `.wip/`, which is never emitted.

Distinguish this from multiple LINEAGES. Different subjects you intend to KEEP (an API spec *and* a CLI spec) get sibling `NNN[-<desc>]/` lineage folders and are NOT a merge. This skill only collapses competing drafts of one subject. If the user is actually trying to keep several distinct subjects, this is not a merge — do not flatten distinct subjects into one artifact.

## No Version Files — There Are None

There are **no version files** and no `v<N>` filename machinery. Proposals, specs, and plans are single canonical artifacts living at a fixed short filename inside their lineage folder:

```text
proposals/NNN[-<desc>]/proposal.md
specs/NNN[-<desc>]/spec.md
plans/NNN[-<desc>]/plan.md
```

The lineage folder `NNN[-<desc>]/` is the stable identifier and the unit of reference. `proposal.md` / `spec.md` / `plan.md` are meaningless bare, by design — the path already carries the type (parent folder) and the subject (thread slug). `NNN` is a mandatory zero-padded 3-digit sequence starting at `001`; `-<desc>` is an optional kebab slug added only to distinguish one lineage from another. For versioned artifacts the version lives in frontmatter (`version`), not in the filename; plans carry no `version` at all. There is therefore NO version file to "bump": the merge AUTHORS or REVISES the canonical `NNN/<artifact>.md`, it does not emit a `-v<N>-` file.

## Inputs

This skill accepts TWO OR MORE candidate-draft paths, normally living under the active thread's `.wip/` (the bake-off area). The candidates are competing drafts of one artifact type — every candidate is a draft of a spec, or every candidate is a draft of a proposal, etc.

Same-type default: candidates are drafts of a single target type. A bake-off of three spec drafts produces one spec; a bake-off of two proposal drafts produces one proposal. No target-type statement is required.

Cross-type rule: if the user wants candidates of DIFFERENT artifact types reconciled into a single target of yet another type (e.g. a proposal draft plus a discussion together yielding a spec), the user MUST EXPLICITLY state the target type. Phrasings such as "merge X and Y into a spec" satisfy the rule; context that places the user inside the target lineage and clearly directs cross-type output also satisfies it. This skill NEVER infers a cross-type target from the inputs alone. If the inputs are mixed-type and the target type is not stated, this skill refuses and asks the user to state the target type before proceeding — this is the one place this skill takes a clarifying question, because the alternative (silent inference) would hide a real routing decision.

Ambiguity fallback: if the candidate references are vague ("the drafts", "the two attempts") and multiple plausible candidate sets exist, ASK the user which candidates are intended. Do NOT pick by recency, do NOT pick by sort order. Silently picking would hide a real decision (which candidates the user intends to reconcile) behind a sort order.

If multiple lineages of the target type exist in the thread (`specs/001-api/` vs `specs/002-cli/`), a bare "the spec" is ambiguous — ASK which lineage the merge targets. There is no "most recent `NNN`" or "highest number" fallback.

This skill reads inputs READ-ONLY. It does NOT edit, rewrite, or add frontmatter to any candidate draft. The candidate drafts remain untouched in `.wip/`.

## Output: The Single Canonical Artifact

The merge emits exactly ONE reviewable artifact: the canonical `<artifact>.md` for the target lineage. Where that artifact lands depends on whether the merge is creating the canonical artifact for the first time, revising one that is still alive, or — if the target is frozen — opening a new thread.

### Decide: alive vs frozen target

Determine the state of the canonical artifact the merge targets.

- **No canonical artifact yet** — the lineage folder has no emitted `<artifact>.md`. The merge AUTHORS it for the first time at `<target-type-folder>/NNN[-<desc>]/<artifact>.md`. Pick or confirm the lineage number `NNN` (next zero-padded 3-digit sequence; the folder is created on-demand).

- **Target is alive** — the canonical artifact exists and is still in flight. Versioned artifacts are alive while editable in place: a proposal at Draft / In Review, a spec at Draft / In Review / Approved-but-not-yet-Implemented, or a plan in an active thread. In this case the merge is a **record-backed in-place revision** of the canonical `<artifact>.md` — fold the candidates into the existing canonical artifact at the same path, in place. Two sub-cases:
  - **Pre-`approved` (Draft / In Review)** — this is authoring. Revise the canonical artifact in place; git holds the evolution. The decision log this skill writes is the backing record for the merge rationale.
  - **Approved but not yet Implemented** — the artifact is a human-signed contract. A substantive change is editable ONLY via an owner-approved, record-backed amendment. This skill does NOT obtain owner approval on its own; if the target is in this state and the merge would change it substantively, REFUSE and tell the user the approved artifact needs an owner-approved amendment — do not silently edit an approved contract.

- **Target is frozen** — the canonical artifact has latched terminal: a proposal at `status.approved` or `status.rejected`, or a spec at `status.implemented`, or the thread is closed (`closed: done` / `closed: dropped` in the ledger). Frozen artifacts are NOT edited. The merge does NOT touch the frozen artifact — instead it opens a **new thread** (or, where appropriate and the subject differs, a new lineage) and authors the canonical artifact there. This skill does NOT silently create a new thread on a guess; if the target is frozen, REFUSE and tell the user the target is frozen and a new thread (or new lineage) is required, so the user directs where the merged result lands.

A latch records an event and is sticky — an `approved` spec does not fall back when a later review opens; it is still frozen-against-edit only at `implemented`, but a substantive post-approval change still requires the owner-approved amendment route above.

### Path rules

- Within-thread references in the artifact body are **thread-relative** (`specs/001/spec.md`, `.wip/<draft>`), never repo-relative and never absolute.
- Cross-thread and external references are **repo-relative** (`docs/threads/<other>/…`).
- **Never absolute.**

The canonical artifact is the ONLY reviewable artifact emitted. The candidate drafts are NOT re-emitted as siblings; there is no `merges/` folder; there is no `-v<N>-` variant file.

## Decision Log (rationale)

The rationale for the merge — why these parts of which candidate won — goes in a **decision log**, a record:

```text
docs/threads/<thread>/<target-lineage>/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

Place the decision log in the `discussions/` folder of the lineage it serves (the spec's lineage for a spec merge, the proposal's lineage for a proposal merge). Use the thread-relative path in any reference inside an artifact body.

- The `decision-log` artifact-type token is MANDATORY. The decision log is a record — it uses the record filename form (`<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md`), never a versioned form.
- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derived after writing.
- A record with no lifecycle status of its own carries NO frontmatter at all — a decision log has none.
- The decision log is a record: its body is frozen at emission. A later correction is a NEW record, not an in-place rewrite.

The decision log captures, per resolved difference, which candidate's content prevailed and a one- or two-sentence rationale. Any conflict this merge could NOT confidently resolve is preserved in the canonical artifact body via the `<!-- CONFLICT: -->` marker (below) AND noted in the decision log as unresolved.

The candidate drafts themselves stay in `.wip/`. Only the canonical artifact and the decision log are emitted; the losing drafts are NOT re-emitted as reviewable artifacts.

## Conflict Handling

When this skill can confidently resolve a difference between candidates, it folds the result into the canonical artifact body normally; when it CANNOT confidently resolve a difference, it PRESERVES THE CONFLICT EXPLICITLY in the body via an HTML-comment marker.

What confidently-resolvable looks like:

- **Objective additions** — one candidate includes a section the others do not. Fold the addition in. No conflict.
- **Non-overlapping content** — candidates cover disjoint topics. Concatenate or interleave by section. No conflict.
- **Identical statements** — candidates say the same thing in similar prose. Use the clearer phrasing. No conflict.
- **Strictly-superseding content** — one candidate restates another verbatim with additions only. Use the fuller candidate. No conflict.

What is NOT confidently-resolvable and MUST be preserved as a conflict:

- **Subjective disagreements** — two candidates make different claims about the same subject (different design choices, different scope boundaries, different acceptance bars).
- **Contradictory statements** — one candidate says A, the other says NOT-A.
- **Divergent design choices** — candidates propose mutually-exclusive architectures, APIs, or behaviors.
- **Anything where guessing would substitute the merger's judgment for the author's** — when in doubt, preserve as a conflict.

The conflict-preservation marker pattern:

```markdown
<!-- CONFLICT: <one-sentence description of the disagreement> -->

<merged body still proceeds — both perspectives included verbatim or summarized side-by-side immediately below the marker so a downstream reader can see what is in tension>
```

Inline illustration (one short example, not a template — adapt to the actual disagreement):

```markdown
## Authentication strategy

<!-- CONFLICT: candidate A proposes JWT-only; candidate B proposes JWT + session fallback. Both perspectives below; pick one before escalating. -->

**Candidate A position:** JWT-only — simpler client, no server-side session storage.

**Candidate B position:** JWT + session fallback — improves UX for token-expiry edge cases at the cost of a small server-side session store.
```

The marker MUST NOT be silently dropped. Explicit preservation is the contract: a downstream reader scanning the canonical artifact MUST be able to find every unresolved conflict by grepping for `<!-- CONFLICT:` in the file. Folding the conflict into one side or the other without the marker would substitute the merger's judgment for the author's. If a conflict is genuinely resolvable by reading both candidates more carefully, this skill MAY resolve it; if there is any doubt, preserve via the marker and note it in the decision log.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the candidate-draft paths.** Detect every candidate path from the user's invocation (normally under `.wip/`). If the references are vague, ASK the user which candidates are intended. Do NOT pick by recency or sort order. Confirm the resolved paths before reading.

3. **Read all candidates READ-ONLY.** This skill reads each candidate but does NOT edit, rewrite, or add frontmatter to any candidate. Read each end-to-end before composing the merged body.

4. **Determine the target type.** If every candidate is a draft of the same type, the target type matches (same-type default). If the candidates are mixed-type, the user MUST have EXPLICITLY stated the target type; if no explicit target-type direction is present, REFUSE and ask the user to state the target type before proceeding.

5. **Determine the target lineage and its state.** Identify the target lineage folder (`<target-type-folder>/NNN[-<desc>]/`). If multiple lineages of the type exist, ASK which is meant — no highest-`NNN` fallback. Then decide alive vs frozen per `## Output: The Single Canonical Artifact`:
   - No canonical artifact yet → author it for the first time at `NNN[-<desc>]/<artifact>.md`.
   - Alive (Draft / In Review) → record-backed in-place revision of the canonical artifact.
   - Approved-but-not-Implemented and the merge is substantive → REFUSE; an owner-approved, record-backed amendment is required.
   - Frozen (`approved`/`rejected` proposal, `implemented` spec, or closed thread) → REFUSE; a new thread (or new lineage) is required and the user must direct where it lands.

6. **Compose the merged body.** Fold non-conflicting content (objective additions, non-overlapping sections, identical statements, strictly-superseding content). Preserve unresolvable subjective conflicts via the `<!-- CONFLICT: <description> -->` marker per `## Conflict Handling`. Do NOT silently drop conflicts. Do NOT add source-relation frontmatter — supersession and lineage are forward-links in prose, never metadata.

7. **Write the canonical artifact.** Either author the new `NNN[-<desc>]/<artifact>.md` or revise the existing canonical `<artifact>.md` in place at the same path. The lineage folder is created on-demand if new. Do NOT create a `merges/` folder. Do NOT write any `-v<N>-` file. If the target is alive and versioned, set/keep its frontmatter `version` per the review-cycle counter (a record-backed revision that completed a cycle bumps it; pure authoring before the first review starts at `version: 1`).

8. **Write the decision log.** Capture the merge rationale (which candidate parts won and why; any unresolved conflicts) at `<target-lineage>/discussions/<UTC>-<kebab-desc>-decision-log.md`. Capture its own 12-character UTC stamp at write time. No frontmatter on the decision log.

9. **Confirm.** Tell the user the canonical artifact path (thread-relative) and the decision log path. If unresolved conflicts were preserved, mention the count: `Canonical artifact written: <path>. Decision log: <path>. <N> unresolved conflict(s) preserved via <!-- CONFLICT: --> marker — grep the file to review.` No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the canonical artifact, the decision log, or any draft material. Writing the files is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to candidate drafts under `docs/threads/<thread>/.wip/` — drafts are editable during the session but are never committed by this skill, and `.wip/` is gitignored.

## Immutability

Candidate drafts in `.wip/` are READ-ONLY to this skill. It does NOT edit, rewrite, or add frontmatter to any candidate. They remain untouched in `.wip/`, which is never emitted as a reviewable artifact.

The canonical artifact obeys the lifecycle physics. While the target is alive (Draft / In Review), it is edited in place — that is exactly what a record-backed in-place merge revision is, and git holds the evolution. Once the artifact latches (a proposal at `approved` / `rejected`, a spec at `implemented`) it is FROZEN: it is not edited; reconciling further candidate work against it means a new thread (or new lineage), not an in-place rewrite. A substantive change to an Approved-but-not-Implemented spec is editable ONLY via an owner-approved, record-backed amendment.

The decision log is a record — its body is frozen at emission and carries no frontmatter. A later correction is a NEW decision-log record, never an in-place rewrite.

No source-relation YAML frontmatter is added to any emitted artifact — no `Supersedes:`, no `Alternative to:`, no `Forked from:`, no `Merged from:`. Which candidates the merge consumed and why the winner won lives in the decision log's prose and the artifact body's references (thread-relative paths), not in metadata on the file.
