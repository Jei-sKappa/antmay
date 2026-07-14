---
name: append-roadmap-feedback
description: Use only when a descendant-thread caller supplies the parent roadmap reference and a discovery with parent- or sibling-level impact — the affected briefs or direction, self-contained evidence, the impact, and a recommendation — and that discovery must be recorded as the next append-only record in the parent thread's `roadmap-feedback.md`.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Append Roadmap Feedback

Record one descendant discovery as the next append-only record in the parent thread's `roadmap-feedback.md`. You own only this bounded side effect: allocating the next record number, validating the record shape, and appending without disturbing anything already in the file. The caller owns the evidence and the judgment that the discovery matters; you own the numbering, the shape, and the impact gate below.

## Precondition and refusal

Act only when the caller supplies all of:

- **Parent roadmap reference** — the parent Roadmap thread whose `roadmap-feedback.md` receives the record.
- **Source** — the child thread that produced the discovery.
- **Affects** — the named future child briefs, shared constraints, overall direction, or a possible new child the discovery bears on.
- **Context** — self-contained evidence and the assumption or boundary the discovery challenges.
- **Impact** — why later work may need to change.
- **Recommendation** — an advisory next action.

If any field is missing, refuse, name exactly what is missing, and write nothing. Never fabricate a field to complete a record.

## The impact gate

Append only a discovery that may affect the Roadmap direction, the shared constraints, another child, or the need for an additional child. Reject content that is only a local implementation note, a local surprise, or report material with no such cross-child or direction-level bearing — tell the caller that material belongs in the child's own implementation report, and write nothing. A `Recommendation` is an advisory next action only; if the supplied recommendation asserts a new human decision, a parent-level commitment, or that another child is blocked or complete, reject it.

## Record shape

`roadmap-feedback.md` starts with the header `# Roadmap Feedback` and accrues records in this shape, each under its own `### F<N>: <short title>` heading:

```markdown
### F<N>: <short title>

Source: <the child thread that produced the discovery>

Affects: <named future child briefs, shared constraints, overall direction, or a possible new child>

Context: <self-contained evidence and the assumption or boundary challenged>

Impact: <why later work may need to change>

Recommendation: <advisory next action>
```

## Numbering and append discipline

Read the existing `roadmap-feedback.md` only to find the highest existing `F<N>`; the new record takes the next sequential number, starting at `F1` in an empty file. Append the new record at the end of the file.

Never rewrite, renumber, reorder, or edit any existing record, and never touch the `# Roadmap Feedback` header. Your single mutation is the appended record.

## Authority boundary

Appending this record is legitimate even when the parent Roadmap thread sits under `docs/threads/archive/` — this append is the one narrow write permitted into an archived thread, and it neither reactivates the thread nor turns it into a coordinator. The append grants no other write into the parent: never edit the parent's `roadmap.md` or `decisions.md`, and never modify any sibling thread's seed, spec, plan, or other artifact.
