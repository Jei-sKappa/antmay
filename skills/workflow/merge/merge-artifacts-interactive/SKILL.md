---
name: merge-artifacts-interactive
description: Reconcile two or more artifacts into one merged artifact by walking each subjective conflict with the user and capturing each resolution in a mandatory decision log when the user wants an interactive merge.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.2
---

# Merge Artifacts Interactive

Reconcile two or more artifacts READ-ONLY by walking each subjective conflict ONE AT A TIME with the user, ASK the user for the resolution AND TEST that resolution against both input artifacts, fold objective additions automatically, append per-conflict records to a MANDATORY decision log under the active thread's `discussions/` folder, and write the merged artifact at the next mainline integer of the target type's folder.

SAME-TYPE merge is the DEFAULT — two specs become one spec, two plans become one plan, two proposals become one proposal, and no target-type statement is required. CROSS-TYPE merge is allowed ONLY when the user EXPLICITLY states the target type (e.g., "merge proposal + discussion into a spec") or context makes the target obvious. If the inputs are mixed-type and the target type is not stated, ASK the user to state the target type before proceeding.

## Anti-Sycophancy Stance

Your job is to help the user reach the right resolution on each conflict between the merge inputs, not to make them feel good about whatever they pick first. Treat the per-conflict walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **when inputs disagree, push back on the user's first instinct — the merged artifact must survive later review**. A merge whose only effect is to flatten one input on top of the other because the user defended that choice has produced nothing useful; the cheap moment to push back is during the walk, before the merged artifact is escalated to whatever phase comes next.

Push back hard on weak reasoning or hidden assumptions; never soften a resolution just because the user pushes back. A merger who picks input A "because it's newer" or "because it sounds cleaner" without engaging the substance of what input B argued has stopped merging and started copying. The walk's value sits in the disagreement, not the consensus.

Hold these together:

- **Disagree when you disagree.** If the user's leaning on a conflict resolution conflicts with the evidence in one input, your read of the inputs' intent, or the codebase reality, say so plainly before settling. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user picks input A's position for a reason that doesn't hold up — "it's newer", "it sounds better", "we'll deal with B's concern later", "the implementer will figure it out" — name the gap, surface the substance of input B's position, and bring it into the conversation before the conflict is settled. A future reader of the merged artifact will not have you to ask follow-ups — this is the last cheap moment.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, alternatives one of the inputs dismissed too fast — raise them, even if the user wants to move on. Better captured as part of the conflict's resolution now than rediscovered when the merged artifact is escalated.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of an input, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a conflict's resolution just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a conflict's resolution differently, identify the exact assumption or value judgment causing the split, then resolve THAT before settling the merge resolution.
- **Refuse to log** a resolution you believe is wrong without flagging it. If the user insists on resolving a conflict in a way you believe leaves the merged artifact worse off, log the resolution they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other resolution> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the resolution owned by the evidence.** The goal is not for either input to win. The goal is to record resolutions that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered. When inputs disagree, push back on the user's first instinct — the merged artifact must survive later review.

If you believe a conflict is being resolved without real reason — the user picking one input over the other on momentum, preference, or "it's newer" — refuse to log it silently. Either resolve the disagreement first, or log the resolution with the dissent included in the `Rationale` line. The cheap moment for the merge to do its job is during the walk — once the merged artifact is escalated to whatever phase comes next, the cost of an unflagged bad resolution compounds.

## Inputs

This skill accepts TWO OR MORE artifact paths under `docs/threads/<thread>/`. The artifacts may live in any of the following folders: `proposals/`, `specs/`, `plans/`, `discussions/`, or `inbox/open/`. The paths may be passed absolute or relative to the repo root.

Same-type default: if every input shares the same artifact-type token (e.g., every input filename ends in `-spec.md`, or every input filename ends in `-plan.md`), the output type matches the inputs. No target-type statement is required. A merge of three specs produces one spec; a merge of two plans produces one plan.

Cross-type: if the user wants to merge inputs of DIFFERENT artifact types (e.g., a proposal plus a discussion together yielding a spec), the user MUST EXPLICITLY state the target type. Phrasings such as "merge X and Y into a spec" satisfy the rule; context that places the user inside the target folder and clearly directs cross-type output also satisfies it. Interactive merge does NOT infer a cross-type target from the inputs alone — if the inputs are mixed-type and the target type is not stated, ASK the user to state the target type before proceeding.

Ambiguity fallback: if the input references are vague ("the specs", "the proposals", "v1 and v2", "the latest two plans") and multiple plausible artifacts exist under the candidate folders, ASK the user which artifacts are intended. Do NOT pick by recency, do NOT pick by version number, do NOT pick by sort order.

This skill reads inputs READ-ONLY. It does NOT edit, rewrite, or add frontmatter to any input artifact. The merged output is a new artifact in its own file; the inputs remain untouched.

## Output Location

The merged artifact lands in the TARGET TYPE's NORMAL FOLDER under the active thread. The mapping is:

- merged proposal → `docs/threads/<thread>/proposals/`
- merged spec → `docs/threads/<thread>/specs/`
- merged plan → `docs/threads/<thread>/plans/`
- merged discussion → `docs/threads/<thread>/discussions/`
- merged inbox-item / review-finding → `docs/threads/<thread>/inbox/open/`

There is NEVER a `merges/` folder. Do NOT create `docs/threads/<thread>/merges/`, do NOT propose `merges/` as an alternative, do NOT write any merged artifact to a path containing the literal segment `/merges/`. A merged spec lands in `specs/`. A merged plan lands in `plans/`. The exclusion is uniform across all five candidate target folders.

The target folder is created on-demand. Do not pre-create empty folders; the folder appears the moment the merged artifact is written.

## Output Filename

The merged artifact uses the versioned-form filename grammar:

```text
docs/threads/<thread>/<target-type-folder>/<YYMMDDHHMMSSZ>-v<N>-<artifact-type>.md
```

Where:

- `<YYMMDDHHMMSSZ>` is the 12-character UTC stamp captured ONCE at write time. Never re-derive after writing.
- `<N>` is the next mainline integer after the highest input version. If the inputs are at `v1` and `v2`, the merged output is `v3`. If the inputs are at `v2-stricter` and `v2-impl-ready` (two v2 variants), the merged output is `v3` (mainline integer, no descriptor — the merge consumes the variant set and produces the next promoted mainline version). The merged output is ALWAYS the mainline integer with NO descriptor — the merge IS the next mainline.
- `<artifact-type>` is the artifact-type token for the target type: `proposal`, `spec`, `plan`, `discussion`, `decision-log`, `inbox-item`, or `review-finding`. The artifact-type token is MANDATORY.

The `v<N>` segment names the TARGET version this merged artifact REPRESENTS — the version the merge is producing — NOT a predecessor it derives from.

Example (active thread `docs/threads/260520095223Z-agentic-workflow/`):

```text
# Two specs at v1 and v2 → merged v3 spec
docs/threads/260520095223Z-agentic-workflow/specs/260521143000Z-v3-auth-spec.md
```

## Walk Format

The walk identifies all candidate conflicts in the inputs up front, confirms the list with the user before walking, then walks one conflict at a time. Objective additions (sections one input has that the other does not; non-overlapping content; identical statements in similar prose; strictly-superseding versions) are NOT conflicts — they fold into the merged body automatically and are not walked. Only subjective disagreements, contradictory statements, and divergent design choices ARE conflicts.

The per-conflict loop is adapted for merge resolutions:

For each conflict IN ORDER:

1. **Surface the conflict.** Name the inputs that disagree (by absolute path and section heading). Quote the divergent passages (≤ one sentence each — reference, do not recite). State why the disagreement matters for whoever picks up the merged artifact next.
2. **Cite evidence from both inputs.** Reference each input by absolute path and the specific section heading where the disagreement lives. If one input cites a decision log by `D<N>` ID, follow the reference and confirm the cited decision is actually settled there before assessing it.
3. **ASK the user for the resolution.** Open the loop with a question that gives the user room to answer: "How do you want to resolve this?" / "Which input wins, or is there a synthesis?" / "What's the right call here?". Accept the user's freeform answer.
4. **TEST the user's resolution against BOTH input artifacts (do not just accept).** Does the user's resolution actually fit the surrounding context in BOTH inputs, or does it merely close down input B's argument? Look for: (a) a passage in input B the user's resolution does not account for, (b) a downstream consequence input B's position guards against that input A's position does not, (c) context the user has but neither input records — which is itself worth capturing in the rationale. ASK the user for their view when useful AND TEST the user's resolution against the artifacts — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that genuinely settles the conflict IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails — especially when the user's resolution looks weak (picking input A "because it's newer" without addressing the substance of input B). The merge-stance amplifier applies here.
5. **Apply the resolution to the merged output draft.** Fold the chosen text (or the user's synthesis) into the merged body at the appropriate section.
6. **Append a record to the decision log.** Use the `## D<N>: <Conflict title>` shape. `Decision: <which input wins, or synthesis description>` and `Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>`. Include the conflict's category (subjective disagreement / contradictory statement / divergent design choice) in the title or rationale so the decision log carries the per-conflict outcome legibly.
7. **Move to the next conflict.** Do not move on while the current conflict is still ambiguous — settle it cleanly first. Silence is not a resolution.

If a conflict splits into sub-conflicts during the walk (e.g., a "scope conflict" turns out to be one scope-boundary sub-conflict plus one in-scope contradiction sub-conflict), settle each sub-conflict as its own `## D<N>` record rather than collapsing them.

## Decision Log

The decision log is MANDATORY for interactive merge. It lives at:

```text
docs/threads/<thread>/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

The `decision-log` artifact-type suffix is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (decision logs are records, not versioned artifacts).

The decision log is NOT optional for this skill. Merge interactions ARE the durable trade-offs — the chosen resolutions are exactly the cheap-now-vs-expensive-later record that downstream readers need to understand WHY the merged artifact looks the way it does. The conflict-and-resolution mapping CANNOT be recovered from the merged artifact alone (conflicts are resolved in-place during the walk, and only the resolution remains visible in the merged body). The decision log is the only place those resolutions live; omitting it would erase the trail.

The decision log is created LAZILY at the FIRST settled conflict, NOT proactively. If the candidate-conflict-list confirmation produces no walk (user decides there are no real conflicts and the merge is automatic), NO decision log is written and only the merged artifact is emitted. An interrupted walk with no settled conflicts leaves no decision log. A walk that produces no decisions produces no log.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `merge-<target-type>-v<N>` (capturing what the merge produced) or `<topic>-merge` (capturing the merge topic). Confirm the slug with the user before the first settlement.
- The `discussions/` folder is created on-demand.

The decision log is **append-only**. Each settled conflict is appended as one record with a sequential per-log local heading:

```markdown
## D<N>: <Conflict title>

Decision: <which input wins, or synthesis description>

Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first settlement in this log and increments by `1` per settlement IN THIS LOG. The `## D<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's path.

If the user pauses mid-walk after at least one resolution has landed, the partial decision log is durable: every resolution up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## D<N+k>` record).

## Output Artifacts

This skill produces TWO outputs per merge run when the walk settles at least one conflict, or ONE output when the inputs have no real conflicts:

### Merged artifact (PRIMARY, always written)

```text
docs/threads/<thread>/<target-type-folder>/<YYMMDDHHMMSSZ>-v<N>-<artifact-type>.md
```

The next-mainline-integer versioned artifact at the target-type folder, composed by folding non-conflicting content (objective additions, non-overlapping sections, identical statements, strictly-superseding versions) and applying every conflict resolution from the walk. Interactive merge does NOT preserve conflicts via the `<!-- CONFLICT: -->` marker — conflicts are resolved in-place during the walk, and only the resolution remains visible in the merged body. The corresponding rationale lives in the decision log.

### Decision log (MANDATORY, written when the walk settles at least one conflict)

```text
docs/threads/<thread>/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

Captures every settled conflict with its resolution and rationale. See `## Decision Log` above for shape and lazy-creation rule. The decision log is the only place the conflict-and-resolution mapping is recoverable — the merged artifact alone does not carry that history.

If the walk settles zero conflicts (the candidate-list confirmation produced no walk; the inputs reconciled without subjective disagreement), the decision log is NOT written and only the merged artifact is emitted. The closing message states explicitly that no conflicts required user resolution.

## Scope Drift

When the user introduces a branch that is OUTSIDE the merge walk — a new design idea unrelated to either input, a tangent about a different artifact in the thread, a refactor proposal that does not address either input's content — do not silently follow them and do not let the walk grow into a different shape than the one being discussed. Propose ONE of:

1. **Park as an Inbox item** (PREFERRED for non-blocking side-findings). Captures a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this merge's decision log.
2. **Split into its own decision log.** When the branch is itself a multi-conflict discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` in `discussions/` for it.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the input artifact paths.** Detect every input path from the user's invocation. If the references are vague ("the specs", "the latest two plans", "v1 and v2"), ASK the user which artifacts are intended. Do NOT pick by recency or version number. Confirm the resolved paths before reading.

3. **Read all inputs READ-ONLY.** Emitted artifacts are immutable. This skill reads each input but does NOT edit, rewrite, or add frontmatter to any input. Read each input end-to-end before identifying candidate conflicts.

4. **Determine the target type.** Same-type default if every input shares the same artifact-type token. Cross-type only when the user EXPLICITLY stated the target type; if no explicit direction is present and the inputs are mixed-type, ASK the user to state the target type.

5. **Determine the target version.** Next mainline integer after the highest input version. v1 + v2 → v3; v2-stricter + v2-impl-ready → v3. The merged output is always the next mainline integer with NO descriptor.

6. **Identify candidate conflicts.** Walk the inputs end-to-end and draft a candidate list of subjective disagreements, contradictory statements, and divergent design choices. Objective additions, non-overlapping sections, identical statements, and strictly-superseding versions are NOT conflicts — fold them into the merged draft automatically and do not walk them. Cluster related conflicts rather than fragmenting; aim for fewer, higher-quality candidates over many minor ones.

7. **Confirm the candidate conflict list with the user before walking.** List the candidates by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing resolutions later. If the user adds conflicts the candidate list missed, fold them in. If the user removes candidates as not worth walking ("those aren't really in tension"), drop them. If the user concludes the list is empty (no real conflicts; the inputs reconcile automatically), the walk produces no decision log and only the merged artifact is emitted at step 9.

8. **Per-conflict loop.** For each conflict IN ORDER, run the loop from `## Walk Format`. Surface → cite evidence from both inputs → ASK the user → TEST the user's resolution against BOTH inputs (do not just accept) → apply the resolution to the merged draft → log. Push back per the `## Anti-Sycophancy Stance` when the user's resolution looks weak; the merge-stance amplifier applies — when inputs disagree, push back on the user's first instinct because the merged artifact must survive later review.

9. **Compose the merged body.** Fold non-conflicting content (already drafted in step 6) and apply every resolution from the walk (already drafted incrementally through step 8). Reference every input by absolute path in a `## References` section (or equivalent — section name at executor discretion, but each input's absolute path MUST appear in the body so the merged artifact carries its own lineage). Do NOT add source-relation frontmatter — lineage between the merged output, its inputs, and the decision log lives in the body's references (by absolute path), not in metadata on the file.

10. **Capture the UTC stamp for the merged artifact.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing. This stamp is separate from the decision log's stamp (each artifact gets its own stamp captured at its own write time).

11. **Write the merged artifact** to `docs/threads/<thread>/<target-type-folder>/<UTC>-v<N>-<artifact-type>.md`. The target-type folder is created on-demand. Do NOT create `merges/`. Do NOT write the artifact to any path containing `/merges/`.

12. **Final message.** Cite the merged artifact path. If the decision log was written (the walk settled at least one conflict), cite the decision log path too. If no decision log was written (zero conflicts settled), state explicitly: `No conflicts required user resolution — no decision log written.` No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the merged artifact nor the decision log. Writing the files is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session but are never committed by this skill.

## Immutability

Inputs are READ-ONLY. This skill does NOT edit, rewrite, or add frontmatter to any input artifact. The merged output is a new artifact in its own file; the inputs remain untouched in their original locations under their original filenames.

The merged output is itself IMMUTABLE once emitted. Once the merged artifact is written into the target-type folder under the canonical filename grammar, it is part of the thread's reviewable history and is NOT edited. If a downstream reader disagrees with one of the resolutions, that is a NEW version (`v<N+1>`) — a new merged artifact, not an in-place edit of this one. A typo discovered in the merged output is also a NEW version, not an edit.

The decision log is APPEND-ONLY. Once a `## D<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a resolution settles as a NEW `## D<N+k>` record explaining the change — never an in-place edit of an earlier record. The log itself IS the state — there is no separate state file, no progress tracker.

No source-relation YAML frontmatter is added to any emitted artifact — no `Supersedes:`, no `Alternative to:`, no `Forked from:`, no `Merged from:`. Lineage between the merged output, its inputs, and the decision log lives in the body's `## References` section (by absolute path), not in metadata on the file. The filename alone cannot tell you which inputs the merge consumed or which decision log captured the resolutions — that mapping is recovered from the body's references section.
