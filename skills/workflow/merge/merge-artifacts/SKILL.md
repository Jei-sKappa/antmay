---
name: merge-artifacts
description: Reconcile two or more competing candidate drafts of one artifact into a single canonical thread-root artifact, folding every candidate's unique content and queueing any genuine design divergence that needs a human decision; use when a multi-draft bake-off must be collapsed into one artifact.
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.2.0
disable-model-invocation: true
---

# Merge Artifacts

Reconcile several competing candidate drafts of ONE artifact into a single coherent result. The candidates are parallel attempts at the same subject — the same spec drafted by different models, two attempts at the same proposal, and so on. You compare them systematically, fold everything each one contributes, settle what is objectively resolvable and queue every genuine divergence for a human, and write one canonical artifact at its thread root. You read the candidates but never edit them, and you never commit — writing the merged artifact is where you stop.

This is a bake-off collapse, not a way to keep distinct subjects. If the inputs are genuinely different subjects the user wants to keep separate (an API spec *and* a CLI spec), this is not a merge — say so, write nothing, and end with `Outcome: REFUSED — inputs are distinct subjects, not competing drafts of one artifact`, rather than flattening them into one artifact.

## Inputs

The caller supplies the candidate paths explicitly. The candidates may live anywhere — inside or outside the thread, any directory. There is no standard draft folder and you never scan the filesystem to discover candidates on your own; you merge exactly the paths you are given. If a reference is vague ("the drafts", "the two attempts") and more than one plausible set exists, that is a preflight failure: refuse, name the vague reference and ask for the exact candidate paths, write nothing, and end with `Outcome: REFUSED — <the ambiguity and how to re-invoke>` rather than picking by recency or sort order — that would silently choose which drafts the user reconciles.

You read every candidate READ-ONLY: you do not edit, rewrite, reformat, or add frontmatter to any candidate. Read each one end-to-end before composing anything.

Determine the target artifact type:

- **Same-type default** — when every candidate is a draft of the same type, the merge produces that type. Three spec drafts yield one spec; two proposal drafts yield one proposal. No target-type statement is needed.
- **Cross-type** — when the candidates are of different types and the user wants them reconciled into a target of yet another type (e.g. a proposal draft plus a discussion together yielding a spec), the user MUST state the target type explicitly. If mixed-type candidates arrive with no stated target, do not infer a cross-type target from the inputs alone — that is a preflight failure: refuse, naming that a mixed-type merge needs an explicit target type, write nothing, and end with `Outcome: REFUSED — mixed-type candidates with no stated target; re-invoke with the target type`.

## Merge discipline

Walk the candidates section by section so no divergence is missed. Every candidate's content is in scope; nothing unique to a single candidate is dropped silently.

Fold automatically, without asking, whatever is objectively resolvable:

- **Unique additions** — one candidate has a section the others lack. Include it.
- **Non-overlapping content** — candidates cover disjoint topics. Interleave them by section.
- **Restatements** — candidates say the same thing in different words. Keep the clearer phrasing.
- **Superseding content** — one candidate restates another verbatim and adds more. Keep the fuller one.

What is NOT yours to fold on your own is a genuine design divergence: two candidates make mutually-exclusive claims about the same thing (different design choices, different scope boundaries, different acceptance bars, one says A and another says not-A). Guessing there would substitute your judgment for the author's. Route every such divergence per `## Blocked`. When in doubt about whether a difference is objectively resolvable or a real choice, treat it as a real choice.

## Output artifact

Write the merged result to the single thread-root artifact for its type, replacing it if it already exists and creating it otherwise:

- a proposal → `docs/threads/<thread>/proposal.md`
- a spec → `docs/threads/<thread>/spec.md`
- a plan → `docs/threads/<thread>/plan.md` (a strict plan also carries its per-task briefs under `docs/threads/<thread>/plan-tasks/`; fold the candidates' task sets into that folder, keeping the index and the task files consistent)
- a roadmap → `docs/threads/<thread>/roadmap.md`

Compose the merged body in the target type's own format. Add no provenance or source-relation metadata — which candidates you consumed and why one side prevailed is not recorded on the file. Within-thread references in the body are thread-relative (e.g. `decisions.md`, `spec.md`); cross-thread references are repo-relative (`docs/threads/<other>/…`); never absolute.

## Blocked

This path is reachable only after preflight has passed and composing the merge from otherwise-valid candidates has begun — substantive execution. Preflight failures (a vague candidate set, an unreadable path, distinct subjects, or mixed-type candidates with no stated target) are refusals per `## Inputs` and `## Procedure`, never this path and never a bundle.

A genuine design divergence — two candidates making mutually-exclusive claims about the same thing — is human intent the candidates never settled between, discovered while composing the merge, not something you may fold on your own. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not guess and do not stall waiting in chat. Fold everything objectively resolvable first, then hand the open choice(s) to `/emit-pending-decisions`, giving it `/merge-artifacts` as the producer, the target artifact (e.g. `spec.md`) as the target, the candidate context as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the merge. Then stop with a concise notification of where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`. Do not write a merged artifact that depends on an unsettled choice.

## Procedure

1. **Preflight before any composing (substantive execution).** Complete every check below before folding or writing anything; each failure writes nothing, emits no bundle, and ends `Outcome: REFUSED — <reason and how to re-invoke>`.
   - **Resolve the thread** — work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`; if `cwd` already sits inside a thread root, that is the thread. Refuse when no thread exists yet, or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp).
   - **Resolve the candidate set** — take the explicit paths from the invocation. Refuse a vague or ambiguous candidate set per `## Inputs` rather than picking a set.
   - **Read every candidate READ-ONLY, end-to-end** — reading them here makes the next two checks evidence-based. Refuse any path that is missing or unreadable, naming it.
   - **Confirm one shared subject** — the candidates must be competing drafts of one artifact. Refuse distinct subjects with `Outcome: REFUSED — inputs are distinct subjects, not competing drafts of one artifact`.
   - **Determine the target type** per `## Inputs` — same-type default, or an explicit target for mixed-type inputs. Refuse mixed-type candidates with no stated target rather than inferring one.
2. **Compose the merged body.** Fold non-conflicting content per `## Merge discipline`; route every genuine divergence discovered while composing per `## Blocked` — emit the pending-decisions bundle and stop rather than writing an artifact that depends on an unsettled choice.
3. **Write the artifact** to its thread-root path per `## Output artifact`, replacing or creating it in place.
4. **Confirm.** End with exactly this line, and nothing before it — no preamble, no closing remark: `Outcome: DONE — Merged: <path>`.

## Commit policy

Never stage, commit, push, or branch. Writing the merged artifact is where you stop; any commit is the surrounding session's decision.
