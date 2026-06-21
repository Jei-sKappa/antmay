---
name: merge-artifacts-interactive
description: Reconcile two or more competing candidate drafts of one artifact into the single canonical artifact by walking each subjective conflict with the user and capturing each resolution in a mandatory decision log, when the user wants an interactive merge.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Merge Artifacts Interactive

Reconcile two or more candidate drafts READ-ONLY by walking each subjective conflict ONE AT A TIME with the user, ASK the user for the resolution AND TEST that resolution against the candidate drafts, fold objective additions automatically, append per-conflict records to a MANDATORY decision log, and produce ONE canonical artifact for the target lineage. The candidate drafts stay in `.wip/`; only the canonical artifact and the decision log are emitted.

SAME-TYPE merge is the DEFAULT — competing spec drafts become one spec, competing plan drafts become one plan, competing proposal drafts become one proposal, and no target-type statement is required. CROSS-TYPE merge is allowed ONLY when the user EXPLICITLY states the target type (e.g. "merge proposal + discussion into a spec") or context makes the target obvious. If the inputs are mixed-type and the target type is not stated, ASK the user to state the target type before proceeding.

## The Merge Is a Bake-Off Collapse

The inputs to this skill are **competing candidate drafts of ONE subject** — the multi-model bake-off (e.g. opus vs sonnet vs codex drafting the same spec, or two parallel attempts at the same proposal). They are pre-emission draft work and live in **`.wip/`** (gitignored, editable). They are NOT emitted siblings, and merging them does NOT produce another sibling artifact.

The invariant: **one subject = one lineage folder = exactly one canonical artifact.** The merge collapses the candidate set into that single canonical artifact and records each resolution — which candidate's content won and why — in the decision log. The losing drafts vanish from the reviewable record by design — they remain only in `.wip/`, which is never emitted.

Distinguish this from multiple LINEAGES. Different subjects you intend to KEEP (an API spec *and* a CLI spec) get sibling `NNN[-<desc>]/` lineage folders and are NOT a merge. This skill only collapses competing drafts of one subject. If the user is actually trying to keep several distinct subjects, this is not a merge — surface that rather than flattening distinct subjects into one artifact.

## No Version Files — There Are None

There are **no version files** and no `v<N>` filename machinery. Proposals, specs, and plans are single canonical artifacts living at a fixed short filename inside their lineage folder:

```text
proposals/NNN[-<desc>]/proposal.md
specs/NNN[-<desc>]/spec.md
plans/NNN[-<desc>]/plan.md
```

The lineage folder `NNN[-<desc>]/` is the stable identifier and the unit of reference. `proposal.md` / `spec.md` / `plan.md` are meaningless bare, by design — the path already carries the type (parent folder) and the subject (thread slug). `NNN` is a mandatory zero-padded 3-digit sequence starting at `001`; `-<desc>` is an optional kebab slug added only to distinguish one lineage from another. For versioned artifacts the version lives in frontmatter (`version`), not in the filename; plans carry no `version` at all. There is therefore NO version file to "bump": the merge AUTHORS or REVISES the canonical `NNN/<artifact>.md`, it does not emit a `-v<N>-` file.

## Anti-Sycophancy Stance

Your job is to help the user reach the right resolution on each conflict between the candidate drafts, not to make them feel good about whatever they pick first. Treat the per-conflict walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **when candidates disagree, push back on the user's first instinct — the canonical artifact must survive later review**. A merge whose only effect is to flatten one candidate on top of the other because the user defended that choice has produced nothing useful; the cheap moment to push back is during the walk, before the canonical artifact is escalated to whatever phase comes next.

Push back hard on weak reasoning or hidden assumptions; never soften a resolution just because the user pushes back. A merger who picks candidate A "because it's newer" or "because it sounds cleaner" without engaging the substance of what candidate B argued has stopped merging and started copying. The walk's value sits in the disagreement, not the consensus.

Hold these together:

- **Disagree when you disagree.** If the user's leaning on a conflict resolution conflicts with the evidence in one candidate, your read of the candidates' intent, or the codebase reality, say so plainly before settling. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user picks candidate A's position for a reason that doesn't hold up — "it's newer", "it sounds better", "we'll deal with B's concern later", "the implementer will figure it out" — name the gap, surface the substance of candidate B's position, and bring it into the conversation before the conflict is settled. A future reader of the canonical artifact will not have you to ask follow-ups — this is the last cheap moment.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, alternatives one of the candidates dismissed too fast — raise them, even if the user wants to move on. Better captured as part of the conflict's resolution now than rediscovered when the canonical artifact is escalated.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of a candidate, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a conflict's resolution just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a conflict's resolution differently, identify the exact assumption or value judgment causing the split, then resolve THAT before settling the merge resolution.
- **Refuse to log** a resolution you believe is wrong without flagging it. If the user insists on resolving a conflict in a way you believe leaves the canonical artifact worse off, log the resolution they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other resolution> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the resolution owned by the evidence.** The goal is not for either candidate to win. The goal is to record resolutions that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered. When candidates disagree, push back on the user's first instinct — the canonical artifact must survive later review.

If you believe a conflict is being resolved without real reason — the user picking one candidate over the other on momentum, preference, or "it's newer" — refuse to log it silently. Either resolve the disagreement first, or log the resolution with the dissent included in the `Rationale` line. The cheap moment for the merge to do its job is during the walk — once the canonical artifact is escalated to whatever phase comes next, the cost of an unflagged bad resolution compounds.

## Inputs

This skill accepts TWO OR MORE candidate-draft paths, normally living under the active thread's `.wip/` (the bake-off area). The candidates are competing drafts of one artifact type — every candidate is a draft of a spec, or every candidate is a draft of a proposal, etc.

Same-type default: candidates are drafts of a single target type. A bake-off of three spec drafts produces one spec; a bake-off of two proposal drafts produces one proposal. No target-type statement is required.

Cross-type: if the user wants candidates of DIFFERENT artifact types reconciled into a single target of yet another type (e.g. a proposal draft plus a discussion together yielding a spec), the user MUST EXPLICITLY state the target type. Phrasings such as "merge X and Y into a spec" satisfy the rule; context that places the user inside the target lineage and clearly directs cross-type output also satisfies it. Interactive merge does NOT infer a cross-type target from the inputs alone — if the inputs are mixed-type and the target type is not stated, ASK the user to state the target type before proceeding.

Ambiguity fallback: if the candidate references are vague ("the drafts", "the two attempts") and multiple plausible candidate sets exist, ASK the user which candidates are intended. Do NOT pick by recency, do NOT pick by sort order.

If multiple lineages of the target type exist in the thread (`specs/001-api/` vs `specs/002-cli/`), a bare "the spec" is ambiguous — ASK which lineage the merge targets. There is no "most recent `NNN`" or "highest number" fallback.

This skill reads inputs READ-ONLY. It does NOT edit, rewrite, or add frontmatter to any candidate draft. The candidate drafts remain untouched in `.wip/`.

## Output: The Single Canonical Artifact

The merge emits the canonical `<artifact>.md` for the target lineage plus the mandatory decision log. Where the canonical artifact lands depends on whether the merge is creating it for the first time, revising one that is still alive, or — if the target is frozen — opening a new thread.

### Decide: alive vs frozen target

Determine the state of the canonical artifact the merge targets, and confirm it with the user before walking.

- **No canonical artifact yet** — the lineage folder has no emitted `<artifact>.md`. The merge AUTHORS it for the first time at `<target-type-folder>/NNN[-<desc>]/<artifact>.md`. Confirm the lineage number `NNN` with the user (next zero-padded 3-digit sequence; the folder is created on-demand).

- **Target is alive** — the canonical artifact exists and is still in flight. Versioned artifacts are alive while editable in place: a proposal at Draft / In Review, a spec at Draft / In Review / Approved-but-not-yet-Implemented, or a plan in an active thread. In this case the merge is a **record-backed in-place revision** of the canonical `<artifact>.md` — fold the candidates and the walk's resolutions into the existing canonical artifact at the same path, in place. Two sub-cases:
  - **Pre-`approved` (Draft / In Review)** — this is authoring. Revise the canonical artifact in place; git holds the evolution. The mandatory decision log is the backing record for the resolutions.
  - **Approved but not yet Implemented** — the artifact is a human-signed contract. A substantive change is editable ONLY via an owner-approved, record-backed amendment. Confirm with the user that they (the owner) approve the amendment before making a substantive in-place change; the decision log is the backing record. Do not edit an approved contract without that owner sign-off.

- **Target is frozen** — the canonical artifact has latched terminal: a proposal at `status.approved` or `status.rejected`, or a spec at `status.implemented`, or the thread is closed (`closed: done` / `closed: dropped` in the ledger). Frozen artifacts are NOT edited. Tell the user the target is frozen and ASK where the merged result should land — a **new thread** (or, where the subject differs, a new lineage). The merge does NOT touch the frozen artifact.

A latch records an event and is sticky — an `approved` spec does not fall back when a later review opens; it is still frozen-against-edit only at `implemented`, but a substantive post-approval change still requires the owner-approved amendment route above.

### Path rules

- Within-thread references in the artifact body and decision log are **thread-relative** (`specs/001/spec.md`, `.wip/<draft>`), never repo-relative and never absolute.
- Cross-thread and external references are **repo-relative** (`docs/threads/<other>/…`).
- **Never absolute.**

The canonical artifact is the ONLY reviewable artifact emitted besides the decision log. The candidate drafts are NOT re-emitted as siblings; there is no `merges/` folder; there is no `-v<N>-` variant file.

## Walk Format

The walk identifies all candidate conflicts in the inputs up front, confirms the list with the user before walking, then walks one conflict at a time. Objective additions (sections one candidate has that the others do not; non-overlapping content; identical statements in similar prose; strictly-superseding content) are NOT conflicts — they fold into the canonical artifact automatically and are not walked. Only subjective disagreements, contradictory statements, and divergent design choices ARE conflicts.

The per-conflict loop is adapted for merge resolutions:

For each conflict IN ORDER:

1. **Surface the conflict.** Name the candidates that disagree (by thread-relative path and section heading). Quote the divergent passages (≤ one sentence each — reference, do not recite). State why the disagreement matters for whoever picks up the canonical artifact next.
2. **Cite evidence from the candidates.** Reference each candidate by thread-relative path and the specific section heading where the disagreement lives. If a candidate cites a decision log by `D<N>` ID, follow the reference and confirm the cited decision is actually settled there before assessing it.
3. **ASK the user for the resolution.** Open the loop with a question that gives the user room to answer: "How do you want to resolve this?" / "Which candidate wins, or is there a synthesis?" / "What's the right call here?". Accept the user's freeform answer.
4. **TEST the user's resolution against the candidate drafts (do not just accept).** Does the user's resolution actually fit the surrounding context in the candidates, or does it merely close down candidate B's argument? Look for: (a) a passage in candidate B the user's resolution does not account for, (b) a downstream consequence candidate B's position guards against that candidate A's position does not, (c) context the user has but no candidate records — which is itself worth capturing in the rationale. ASK the user for their view when useful AND TEST the user's resolution against the candidates — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that genuinely settles the conflict IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails — especially when the user's resolution looks weak (picking candidate A "because it's newer" without addressing the substance of candidate B). The merge-stance amplifier applies here.
5. **Apply the resolution to the canonical artifact draft.** Fold the chosen text (or the user's synthesis) into the canonical body at the appropriate section.
6. **Append a record to the decision log.** Use the `## D<N>: <Conflict title>` shape. `Decision: <which candidate wins, or synthesis description>` and `Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>`. Include the conflict's category (subjective disagreement / contradictory statement / divergent design choice) in the title or rationale so the decision log carries the per-conflict outcome legibly.
7. **Move to the next conflict.** Do not move on while the current conflict is still ambiguous — settle it cleanly first. Silence is not a resolution.

If a conflict splits into sub-conflicts during the walk (e.g. a "scope conflict" turns out to be one scope-boundary sub-conflict plus one in-scope contradiction sub-conflict), settle each sub-conflict as its own `## D<N>` record rather than collapsing them.

## Decision Log

The decision log is MANDATORY for interactive merge — it is the record that captures WHY the winner won, the rationale for the merge. It lives in the `discussions/` folder of the lineage it serves:

```text
docs/threads/<thread>/<target-lineage>/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

Place the decision log under the target lineage's `discussions/` (the spec's lineage for a spec merge, the proposal's lineage for a proposal merge). The `decision-log` artifact-type token is MANDATORY — no other token is permitted, and the decision log uses the record filename form, never a versioned form (decision logs are records, not versioned artifacts).

The decision log is NOT optional for this skill. Merge interactions ARE the durable trade-offs — the chosen resolutions are exactly the cheap-now-vs-expensive-later record that downstream readers need to understand WHY the canonical artifact looks the way it does. The conflict-and-resolution mapping CANNOT be recovered from the canonical artifact alone (conflicts are resolved in-place during the walk, and only the resolution remains visible in the body). The decision log is the only place those resolutions live; omitting it would erase the trail. The candidate drafts stay in `.wip/`; only the canonical artifact and the decision log are emitted.

The decision log is created LAZILY at the FIRST settled conflict, NOT proactively. If the candidate-conflict-list confirmation produces no walk (user decides there are no real conflicts and the merge is automatic), NO decision log is written and only the canonical artifact is emitted. An interrupted walk with no settled conflicts leaves no decision log. A walk that produces no decisions produces no log.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` typically captures the merge topic (e.g. `<topic>-merge`). Confirm the slug with the user before the first settlement.
- The `discussions/` folder is created on-demand.
- A decision log is a record with no lifecycle status of its own — it carries NO frontmatter.

The decision log is **append-only**. Each settled conflict is appended as one record with a sequential per-log local heading:

```markdown
## D<N>: <Conflict title>

Decision: <which candidate wins, or synthesis description>

Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first settlement in this log and increments by `1` per settlement IN THIS LOG. The `## D<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's thread-relative path.

If the user pauses mid-walk after at least one resolution has landed, the partial decision log is durable: every resolution up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## D<N+k>` record).

## Output Artifacts

This skill produces TWO outputs per merge run when the walk settles at least one conflict, or ONE output when the candidates have no real conflicts.

### Canonical artifact (PRIMARY, always written)

The single canonical `<artifact>.md` for the target lineage — either authored for the first time at `<target-type-folder>/NNN[-<desc>]/<artifact>.md`, or revised in place if the target is alive (a record-backed in-place revision). Composed by folding non-conflicting content (objective additions, non-overlapping sections, identical statements, strictly-superseding content) and applying every conflict resolution from the walk. Interactive merge does NOT preserve conflicts via the `<!-- CONFLICT: -->` marker — conflicts are resolved in-place during the walk, and only the resolution remains visible in the body. The corresponding rationale lives in the decision log.

### Decision log (MANDATORY, written when the walk settles at least one conflict)

The decision log under the target lineage's `discussions/` (record form, `decision-log` token, no frontmatter). Captures every settled conflict with its resolution and rationale. See `## Decision Log` above for shape and lazy-creation rule. The decision log is the only place the conflict-and-resolution mapping is recoverable — the canonical artifact alone does not carry that history.

If the walk settles zero conflicts (the candidate-list confirmation produced no walk; the candidates reconciled without subjective disagreement), the decision log is NOT written and only the canonical artifact is emitted. The closing message states explicitly that no conflicts required user resolution.

## Scope Drift

When the user introduces a branch that is OUTSIDE the merge walk — a new design idea unrelated to either candidate, a tangent about a different artifact in the thread, a refactor proposal that does not address either candidate's content — do not silently follow them and do not let the walk grow into a different shape than the one being discussed. Propose ONE of:

1. **Capture it for a future thread.** When the side-finding is non-blocking and unrelated, name it so it can become the seed of a future thread (or a tracker ticket) rather than polluting this merge's decision log. The thread layout has no inbox — tangential items route to future-thread seeds or the tracker.
2. **Split into its own decision log.** When the branch is itself a multi-conflict discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` under the appropriate lineage's `discussions/` for it.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the candidate-draft paths.** Detect every candidate path from the user's invocation (normally under `.wip/`). If the references are vague, ASK the user which candidates are intended. Do NOT pick by recency or sort order. Confirm the resolved paths before reading.

3. **Read all candidates READ-ONLY.** This skill reads each candidate but does NOT edit, rewrite, or add frontmatter to any candidate. Read each end-to-end before identifying candidate conflicts.

4. **Determine the target type.** Same-type default if every candidate is a draft of the same type. Cross-type only when the user EXPLICITLY stated the target type; if no explicit direction is present and the inputs are mixed-type, ASK the user to state the target type.

5. **Determine the target lineage and its state.** Identify the target lineage folder (`<target-type-folder>/NNN[-<desc>]/`). If multiple lineages of the type exist, ASK which is meant — no highest-`NNN` fallback. Then decide alive vs frozen per `## Output: The Single Canonical Artifact` and confirm with the user:
   - No canonical artifact yet → author it for the first time at `NNN[-<desc>]/<artifact>.md`.
   - Alive (Draft / In Review) → record-backed in-place revision of the canonical artifact.
   - Approved-but-not-Implemented and the merge is substantive → confirm owner approval for a record-backed amendment before editing in place.
   - Frozen (`approved`/`rejected` proposal, `implemented` spec, or closed thread) → ASK where the merged result lands; a new thread (or new lineage) is required.

6. **Identify candidate conflicts.** Walk the candidates end-to-end and draft a candidate list of subjective disagreements, contradictory statements, and divergent design choices. Objective additions, non-overlapping sections, identical statements, and strictly-superseding content are NOT conflicts — fold them into the canonical draft automatically and do not walk them. Cluster related conflicts rather than fragmenting; aim for fewer, higher-quality candidates over many minor ones.

7. **Confirm the candidate conflict list with the user before walking.** List the candidates by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing resolutions later. If the user adds conflicts the candidate list missed, fold them in. If the user removes candidates as not worth walking ("those aren't really in tension"), drop them. If the user concludes the list is empty (no real conflicts; the candidates reconcile automatically), the walk produces no decision log and only the canonical artifact is emitted at step 9.

8. **Per-conflict loop.** For each conflict IN ORDER, run the loop from `## Walk Format`. Surface → cite evidence from the candidates → ASK the user → TEST the user's resolution against the candidates (do not just accept) → apply the resolution to the canonical draft → log. Push back per the `## Anti-Sycophancy Stance` when the user's resolution looks weak; the merge-stance amplifier applies — when candidates disagree, push back on the user's first instinct because the canonical artifact must survive later review.

9. **Compose and write the canonical artifact.** Fold non-conflicting content (already drafted in step 6) and apply every resolution from the walk (already drafted incrementally through step 8). Either author the new `NNN[-<desc>]/<artifact>.md` or revise the existing canonical `<artifact>.md` in place at the same path; the lineage folder is created on-demand if new. Reference candidates and the decision log by thread-relative path in the body where useful — supersession and lineage are forward-links in prose, never frontmatter. Do NOT create a `merges/` folder. Do NOT write any `-v<N>-` file. If the target is alive and versioned, set/keep its frontmatter `version` per the review-cycle counter. Capture the canonical artifact's own UTC context for any record references at write time.

10. **Final message.** Cite the canonical artifact path (thread-relative). If the decision log was written (the walk settled at least one conflict), cite the decision log path too. If no decision log was written (zero conflicts settled), state explicitly: `No conflicts required user resolution — no decision log written.` No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the canonical artifact nor the decision log. Writing the files is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to candidate drafts under `docs/threads/<thread>/.wip/` — drafts are editable during the session but are never committed by this skill, and `.wip/` is gitignored.

## Immutability

Candidate drafts in `.wip/` are READ-ONLY to this skill. It does NOT edit, rewrite, or add frontmatter to any candidate. They remain untouched in `.wip/`, which is never emitted as a reviewable artifact.

The canonical artifact obeys the lifecycle physics. While the target is alive (Draft / In Review), it is edited in place — that is exactly what a record-backed in-place merge revision is, and git holds the evolution. Once the artifact latches (a proposal at `approved` / `rejected`, a spec at `implemented`) it is FROZEN: it is not edited; reconciling further candidate work against it means a new thread (or new lineage), not an in-place rewrite. A substantive change to an Approved-but-not-Implemented spec is editable ONLY via an owner-approved, record-backed amendment.

The decision log is APPEND-ONLY and is a record — its body is frozen at emission and carries no frontmatter. Once a `## D<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a resolution settles as a NEW `## D<N+k>` record explaining the change — never an in-place edit of an earlier record. The log itself IS the state — there is no separate state file, no progress tracker.

No source-relation YAML frontmatter is added to any emitted artifact — no `Supersedes:`, no `Alternative to:`, no `Forked from:`, no `Merged from:`. Which candidates the merge consumed, why each resolution won, and where the decision log lives all live in prose — the decision log's records and the artifact body's references (thread-relative paths) — not in metadata on the file.
