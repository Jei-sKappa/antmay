---
name: merge-artifacts-auto
description: Reconcile two or more V1 artifacts (same-type by default — two specs become one spec, two plans become one plan, two proposals become one proposal — cross-type when the user EXPLICITLY states the target type, e.g. "merge proposal + discussion into a spec") into ONE merged artifact at the next mainline integer of the TARGET TYPE's normal folder (`proposals/` / `specs/` / `plans/` / `discussions/` / `inbox/open/` — NEVER a separate `merges/` folder), preserving unresolvable subjective conflicts EXPLICITLY in the output via a `<!-- CONFLICT: <description> -->` HTML-comment marker so a downstream reader can grep them out, end-to-end with NO clarifying questions and NO decision log. Use when you already know which artifacts you want to reconcile and just want the merged artifact written down autonomously — not when you want to walk conflicts one at a time with the agent and capture user resolutions in a decision log (use `merge-artifacts-interactive` for that).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Merge Artifacts Auto

Reconcile two or more V1 artifacts READ-ONLY into ONE merged artifact at the next mainline integer of the TARGET TYPE's folder, end-to-end with no clarifying questions, no per-conflict walk, and no decision log. This skill is the AUTONOMOUS half of the V1 merge pair — it reads the inputs, folds non-conflicting content automatically, preserves unresolvable subjective conflicts explicitly in the body via an HTML-comment marker, and writes ONE merged artifact per run. For the collaborative per-conflict walk with the user resolving subjective conflicts and a decision log capturing those resolutions, use the sibling skill `merge-artifacts-interactive` instead.

The two skills cover the V1 merge case per D99: when two or more artifacts of the same type (or, with explicit target-type direction, of different types) need to be reconciled into a single next-mainline-integer artifact, this pair is the V1 path. SAME-TYPE merge is the DEFAULT — two specs become one spec, two plans become one plan, two proposals become one proposal, and no target-type statement is required. CROSS-TYPE merge is allowed ONLY when the user EXPLICITLY states the target type (e.g., "merge proposal + discussion into a spec") or context makes the target obvious (e.g., the user invokes this skill from inside `specs/` with two non-spec inputs and clearly intends a spec output) per D100. Auto cannot infer a cross-type target from the inputs alone — defaulting silently is the failure mode this rule guards against.

Citations: V1 thread layout, filename grammar, and immutability rules are owned by Phase 1 and live at `docs/workflow/v1/thread-layout.md`, `docs/workflow/v1/filename-grammar.md`, and `docs/workflow/v1/immutability.md`. The companion overview lives at `docs/workflow/v1/README.md`. This skill cites each of those by absolute path the first time it invokes a rule from them; later citations are by short reference.

## Inputs

This skill accepts TWO OR MORE V1 artifact paths under `docs/threads/<thread>/`. The artifacts may live in any of the V1 folders documented in `docs/workflow/v1/thread-layout.md`: `proposals/`, `specs/`, `plans/`, `discussions/`, or `inbox/open/`. The paths may be passed absolute or relative to the repo root.

Same-type default: if every input shares the same artifact-type token (e.g., every input filename ends in `-spec.md`, or every input filename ends in `-plan.md`), the output type matches the inputs. No target-type statement is required. A merge of three specs produces one spec; a merge of two plans produces one plan.

Cross-type rule per D100: if the user wants to merge inputs of DIFFERENT artifact types (e.g., a proposal plus a discussion together yielding a spec, or a discussion plus an inbox-item together yielding a proposal), the user MUST EXPLICITLY state the target type. Phrasings such as "merge X and Y into a spec" or "merge proposal A + discussion B → spec" satisfy the rule; context that places the user inside the target folder and clearly directs cross-type output also satisfies it. Auto NEVER infers a cross-type target from the inputs alone. If the inputs are mixed-type and the target type is not stated, this skill refuses and asks the user to state the target type before proceeding — this is the one place autonomous merge takes a clarifying question, because the alternative (silent inference) would hide a real routing decision.

Ambiguity fallback per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"): if the input references are vague ("the specs", "the proposals", "v1 and v2", "the latest two plans") and multiple plausible artifacts exist under the candidate folders, ASK the user which artifacts are intended. Do NOT pick by recency, do NOT pick by version number, do NOT pick by sort order. There is no global "latest artifact" algorithm in V1, and silently picking by recency would hide a real decision (which variant the user intends to reconcile) behind a sort order.

This skill reads inputs READ-ONLY per `docs/workflow/v1/immutability.md`. It does NOT edit, rewrite, or add frontmatter to any input artifact. The merged output is a new artifact in its own file; the inputs remain untouched.

## Output Location

The merged artifact lands in the TARGET TYPE's NORMAL FOLDER under the active thread per `docs/workflow/v1/thread-layout.md`. The mapping is:

- merged proposal → `docs/threads/<thread>/proposals/`
- merged spec → `docs/threads/<thread>/specs/`
- merged plan → `docs/threads/<thread>/plans/`
- merged discussion → `docs/threads/<thread>/discussions/`
- merged inbox-item / review-finding → `docs/threads/<thread>/inbox/open/`

There is NEVER a `merges/` folder. `docs/workflow/v1/thread-layout.md` ("Excluded Folder Names") explicitly rejects a `merges/` folder name and routes merge output to the target artifact type's normal folder instead. Do NOT create `docs/threads/<thread>/merges/`, do NOT propose `merges/` as an alternative, do NOT write any merged artifact to a path containing the literal segment `/merges/`. A merged spec lands in `specs/`. A merged plan lands in `plans/`. The exclusion is uniform across all five candidate target folders.

The target folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation"). Do not pre-create empty folders; the folder appears the moment the merged artifact is written.

## Output Filename

The merged artifact uses the V1 versioned-form grammar per `docs/workflow/v1/filename-grammar.md`:

```text
docs/threads/<thread>/<target-type-folder>/<YYMMDDHHMMSSZ>-v<N>-<artifact-type>.md
```

Where:

- `<YYMMDDHHMMSSZ>` is the 12-character UTC stamp captured ONCE at write time per `docs/workflow/v1/filename-grammar.md` ("UTC Stamp"). Never re-derive after writing.
- `<N>` is the next mainline integer after the highest input version. If the inputs are at `v1` and `v2`, the merged output is `v3`. If the inputs are at `v1`, `v1-stricter`, and `v1-impl-ready` (three v1 variants), the merged output is `v2` (the merge consumes the variant set and produces the next promoted mainline version). If the inputs are at `v2-stricter` and `v2-impl-ready` (two v2 variants), the merged output is `v3` (mainline integer, no descriptor — the merge is the next promoted version, never another variant of the consumed mainline). The merged output is ALWAYS the mainline integer with NO descriptor — the merge IS the next mainline.
- `<artifact-type>` is the recognized V1 artifact-type token for the target type per `docs/workflow/v1/filename-grammar.md` ("Recognized V1 Artifact-Type Tokens"): `proposal`, `spec`, `plan`, `discussion`, `decision-log`, `inbox-item`, or `review-finding`. The artifact-type token is MANDATORY.

The `v<N>` segment names the TARGET version this merged artifact REPRESENTS — the version the merge is producing — NOT a predecessor it derives from per `docs/workflow/v1/filename-grammar.md` ("Target-Version Semantics"). A merged spec named `260521143000Z-v3-auth-spec.md` is the v3 the merge is producing, not an alternative carved out of an already-existing v3. There is no source-relation lineage encoded in the filename beyond the version number.

Examples (assume the active thread is `docs/threads/260520095223Z-agentic-workflow/`):

```text
# Two specs at v1 and v2 → merged v3 spec
docs/threads/260520095223Z-agentic-workflow/specs/260521143000Z-v3-auth-spec.md

# Two v2 spec variants (v2-stricter + v2-impl-ready) → merged v3 spec
docs/threads/260520095223Z-agentic-workflow/specs/260521143000Z-v3-auth-spec.md

# Two plans at v1 and v2 → merged v3 plan
docs/threads/260520095223Z-agentic-workflow/plans/260521143000Z-v3-auth-rollout-plan.md
```

## Conflict Handling

Conflict handling at the autonomous tier is governed by D103. The rule is: when this skill can confidently resolve a difference between inputs, it folds the result into the merged body normally; when it CANNOT confidently resolve a difference, it PRESERVES THE CONFLICT EXPLICITLY in the merged body via an HTML-comment marker.

What confidently-resolvable looks like:

- **Objective additions** — one input includes a section the other inputs do not. Fold the addition in. No conflict.
- **Non-overlapping content** — inputs cover disjoint topics. Concatenate or interleave by section. No conflict.
- **Identical statements** — inputs say the same thing in similar prose. Use the clearer phrasing. No conflict.
- **Strictly-superseding versions** — a later input version restates an earlier input verbatim with additions only. Use the later version. No conflict.

What is NOT confidently-resolvable and MUST be preserved as a conflict:

- **Subjective disagreements** — two inputs make different claims about the same subject (different design choices, different scope boundaries, different acceptance bars).
- **Contradictory statements** — one input says A, the other says NOT-A.
- **Divergent design choices** — inputs propose mutually-exclusive architectures, APIs, or behaviors.
- **Anything where guessing would substitute the merger's judgment for the author's** — when in doubt, preserve as a conflict.

The conflict-preservation marker pattern:

```markdown
<!-- CONFLICT: <one-sentence description of the disagreement> -->

<merged body still proceeds — both perspectives included verbatim or summarized side-by-side immediately below the marker so a downstream reader can see what is in tension>
```

Inline illustration (one short example, not a template — adapt to the actual disagreement):

```markdown
## Authentication strategy

<!-- CONFLICT: v1 spec proposes JWT-only; v2 spec proposes JWT + session fallback. Both perspectives below; pick one before escalating to planning. -->

**v1 position:** JWT-only — simpler client, no server-side session storage.

**v2 position:** JWT + session fallback — improves UX for token-expiry edge cases at the cost of a small server-side session store.
```

The marker MUST NOT be silently dropped. Explicit preservation is the contract: a downstream reader scanning the merged artifact MUST be able to find every unresolved conflict by grepping for `<!-- CONFLICT:` in the file. Folding the conflict into one side or the other without the marker would substitute the merger's judgment for the author's — that is the failure mode D103 guards against. If a conflict is genuinely resolvable by reading both inputs more carefully, this skill MAY resolve it; if there is any doubt, preserve via the marker.

## No Decision Log

This skill writes NO decision log per D102. The merged artifact itself is the only output. There is no separate `<UTC>-<kebab-desc>-decision-log.md` companion file, no `discussions/` write, no per-conflict record. The autonomous merge is a pure generator: it reads inputs and writes one output.

The interactive sibling `merge-artifacts-interactive` DOES write a decision log capturing user resolutions — that is by design, because interactive merge interactions ARE the durable trade-offs the log preserves. Auto merge has no user-resolution events to log; preserving conflicts via the marker is the auto-merge equivalent. Per D102, the auto half writes no separate log.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Resolve the input artifact paths.** Detect every input path from the user's invocation. If the references are vague ("the specs", "the latest two plans", "v1 and v2"), ASK the user which artifacts are intended. Do NOT pick by recency or version number. Confirm the resolved paths before reading.

3. **Read all inputs READ-ONLY.** Per `docs/workflow/v1/immutability.md`, emitted artifacts are immutable. This skill reads each input but does NOT edit, rewrite, or add frontmatter to any input. Read each input end-to-end before composing the merged body.

4. **Determine the target type.** If every input shares the same artifact-type token, the target type matches (same-type default). If the inputs are mixed-type, the user MUST have EXPLICITLY stated the target type per D100; if no explicit target-type direction is present, REFUSE and ask the user to state the target type before proceeding. Do NOT infer cross-type targets from the inputs alone.

5. **Determine the target version.** Compute the next mainline integer after the highest input version per `docs/workflow/v1/filename-grammar.md` ("Target-Version Semantics"). v1 + v2 → v3; v2-stricter + v2-impl-ready → v3; v1 + v1-variant → v2. The merged output is always the next mainline integer with NO descriptor.

6. **Compose the merged body.** Fold non-conflicting content (objective additions, non-overlapping sections, identical statements, strictly-superseding versions). Preserve unresolvable subjective conflicts via the `<!-- CONFLICT: <description> -->` marker per `## Conflict Handling`. Do NOT silently drop conflicts. Do NOT add source-relation frontmatter — lineage between the merged output and its inputs lives in the body's references (by absolute path), not in metadata on the file per `docs/workflow/v1/immutability.md` ("No Source-Relation Frontmatter").

7. **Reference the inputs in the body.** Cite every input by absolute path in a `## References` section (or equivalent — section name at executor discretion, but each input's absolute path MUST appear in the body so the merged artifact carries its own lineage). This satisfies the V1 rule that history is recovered from the body, not from metadata or the filename.

8. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md` ("UTC Stamp"). Stamp once and reuse — never re-derive after writing.

9. **Write the merged artifact.** Create `docs/threads/<thread>/<target-type-folder>/<UTC>-v<N>-<artifact-type>.md`. The target-type folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation"). Do NOT create `merges/`. Do NOT write the artifact to any path containing `/merges/`.

10. **Confirm.** Tell the user: `Merged artifact written: <relative-path-to-the-file>`. If unresolved conflicts were preserved, mention the count: `Merged artifact written: <path>. <N> unresolved conflict(s) preserved via <!-- CONFLICT: --> marker — grep the file to review.` No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the merged artifact or any draft material. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session per `docs/workflow/v1/immutability.md` ("Drafts Are Editable") but are never committed by this skill.

## Immutability

Inputs are READ-ONLY per `docs/workflow/v1/immutability.md`. This skill does NOT edit, rewrite, or add frontmatter to any input artifact. The merged output is a new artifact in its own file; the inputs remain untouched in their original locations under their original filenames.

The merged output is itself IMMUTABLE once emitted per the same rules. Once the merged artifact is written into the target-type folder under the canonical filename grammar, it is part of the thread's reviewable history and is NOT edited. If a downstream reader resolves the preserved conflicts and wants the resolved version captured, that is a NEW version (`v<N+1>`) — a new merged artifact, not an in-place edit of this one. A typo discovered in the merged output is also a NEW version, not an edit.

No source-relation YAML frontmatter is added to the merged artifact — no `Supersedes:`, no `Alternative to:`, no `Forked from:`, no `Merged from:` per `docs/workflow/v1/immutability.md` ("No Source-Relation Frontmatter"). Lineage between the merged output and its inputs lives in the body's `## References` section by absolute path, not in metadata on the file. Per the V1 trade-off, the filename alone cannot tell you which inputs the merge consumed — that mapping is recovered from the body's references section.
