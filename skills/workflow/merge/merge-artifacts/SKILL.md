---
name: merge-artifacts
description: Reconcile two or more competing candidate drafts of one artifact into a single canonical thread-root artifact, folding every candidate's unique content and settling genuine design divergences as recorded decisions; use when a multi-draft bake-off must be collapsed into one artifact.
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.0.0
disable-model-invocation: true
---

# Merge Artifacts

Reconcile several competing candidate drafts of ONE artifact into a single coherent result. The candidates are parallel attempts at the same subject — the same spec drafted by different models, two attempts at the same proposal, and so on. You compare them systematically, fold everything each one contributes, resolve their divergences, and write one canonical artifact at its thread root. You read the candidates but never edit them, and you never commit — writing the merged artifact is where you stop.

This is a bake-off collapse, not a way to keep distinct subjects. If the inputs are genuinely different subjects the user wants to keep separate (an API spec *and* a CLI spec), this is not a merge — say so and stop rather than flattening them into one artifact.

## Inputs

The caller supplies the candidate paths explicitly. The candidates may live anywhere — inside or outside the thread, any directory. There is no standard draft folder and you never scan the filesystem to discover candidates on your own; you merge exactly the paths you are given. If a reference is vague ("the drafts", "the two attempts") and more than one plausible set exists, ASK which candidates are intended. Never pick by recency or sort order — that would silently choose which drafts the user reconciles.

You read every candidate READ-ONLY: you do not edit, rewrite, reformat, or add frontmatter to any candidate. Read each one end-to-end before composing anything.

Determine the target artifact type:

- **Same-type default** — when every candidate is a draft of the same type, the merge produces that type. Three spec drafts yield one spec; two proposal drafts yield one proposal. No target-type statement is needed.
- **Cross-type** — when the candidates are of different types and the user wants them reconciled into a target of yet another type (e.g. a proposal draft plus a discussion together yielding a spec), the user MUST state the target type explicitly. If mixed-type candidates arrive with no stated target, refuse and ask for the target type before proceeding — never infer a cross-type target from the inputs alone.

## Merge discipline

Walk the candidates section by section so no divergence is missed. Every candidate's content is in scope; nothing unique to a single candidate is dropped silently.

Fold automatically, without asking, whatever is objectively resolvable:

- **Unique additions** — one candidate has a section the others lack. Include it.
- **Non-overlapping content** — candidates cover disjoint topics. Interleave them by section.
- **Restatements** — candidates say the same thing in different words. Keep the clearer phrasing.
- **Superseding content** — one candidate restates another verbatim and adds more. Keep the fuller one.

What is NOT yours to fold on your own is a genuine design divergence: two candidates make mutually-exclusive claims about the same thing (different design choices, different scope boundaries, different acceptance bars, one says A and another says not-A). Guessing there would substitute your judgment for the author's. Route every such divergence through `## Settling divergences`. When in doubt about whether a difference is objectively resolvable or a real choice, treat it as a real choice.

## Output artifact

Write the merged result to the single thread-root artifact for its type, replacing it if it already exists and creating it otherwise:

- a proposal → `docs/threads/<thread>/proposal.md`
- a spec → `docs/threads/<thread>/spec.md`
- a plan → `docs/threads/<thread>/plan.md` (a strict plan also carries its per-task briefs under `docs/threads/<thread>/plan-tasks/`; fold the candidates' task sets into that folder, keeping the index and the task files consistent)
- a roadmap → `docs/threads/<thread>/roadmap.md`

Compose the merged body in the target type's own format. Add no provenance or source-relation metadata — which candidates you consumed and why one side prevailed is not recorded on the file. Within-thread references in the body are thread-relative (e.g. `decisions.md`, `spec.md`); cross-thread references are repo-relative (`docs/threads/<other>/…`); never absolute.

## Settling divergences

A genuine design divergence is a human choice. Resolve it before the merged artifact depends on it:

- **Attended** — present the divergence to the user (its two sides and the trade-off), let them settle it, then fold the result per their choice.
- **Explicitly AFK** — you cannot ask. Hand the open choice(s) to `/emit-pending-decisions`, giving it `/merge-artifacts` as the producer, the target artifact (e.g. `spec.md`) as the target, the candidate context as evidence, the open decision(s), and a suggested follow-up (settle the decision, then resume the merge). Then stop and report concisely that the run is blocked on a queued decision and where the bundle was written — do not write a merged artifact that depends on an unsettled choice.

Every choice the user settles is appended to the thread-root `decisions.md` as a `D<N>` record BEFORE the merged artifact relies on it. There is one decision store: the thread-root `decisions.md`. Number records sequentially — scan for the highest existing `D<N>` and use the next integer; if `decisions.md` is somehow absent, create it with a short heading first. Each record is self-contained so a fresh agent understands it without the chat:

```markdown
## D<N>: <Title>

Scope: <optional — omit when the whole thread is the scope; otherwise name the stage or thread-relative artifact the decision applies to>

Context: <one short paragraph stating the divergence and the facts needed to understand it, written from the thread's perspective — never "as you said" or "the user chose">

Decision: <the complete substantive resolution, written out in full>

Rationale: <why this resolution and its principal trade-off>
```

Records are append-only: never rewrite or delete one. A trivial input clarification (which file a phrase meant) settles nothing and needs no record.

## Workflow

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp.
2. **Resolve the candidate paths.** Take the explicit paths from the invocation; if they are vague and ambiguous, ASK which candidates are intended. Confirm the resolved set before reading.
3. **Read all candidates READ-ONLY** end-to-end.
4. **Determine the target type** per `## Inputs` — same-type default, or an explicit target for mixed-type inputs (refuse and ask if mixed-type with no stated target).
5. **Compose the merged body.** Fold non-conflicting content per `## Merge discipline`; route every genuine divergence through `## Settling divergences`, recording each settled choice to `decisions.md` first (or, under AFK, emit the pending-decisions bundle and stop here).
6. **Write the artifact** to its thread-root path per `## Output artifact`, replacing or creating it in place.
7. **Confirm.** Tell the user the merged artifact path and, if any choices were settled, the `D<N>` records added: `Merged: <path>. Decisions recorded: <D<N> list, or "none">.` No preamble, no closing remark.

## Commit policy

Never stage, commit, push, or branch. Writing the merged artifact and any decision records is where you stop; any commit is the surrounding session's decision.
