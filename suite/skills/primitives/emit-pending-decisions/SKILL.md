---
name: emit-pending-decisions
description: Use only when an invoking caller supplies open human decisions with their producing context and needs them queued as a `.pending-decisions/` bundle for a human to settle later; never for defects, observations, or report material — only genuine open human decisions.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.3.0
---

# Emit Pending Decisions

Queue genuine human decisions that a caller cannot settle on its own. You take the decisions the caller hands you, allocate a uniquely named bundle file, and write the caller's material into it in the bundle's format. You do not decide the questions, judge whether they truly need a human, vouch for the correctness of their evidence, or apply their outcomes — you own only the bundle's allocation, shape, and the refusals below.

## Precondition and refusal

Act only when the caller supplies all of:

- **Producer** — the invoking operation, named as `/<skill-name>`.
- **Target** — the thread-relative artifact or operation the decisions block.
- **Originating request** — the user request that triggered the producing run, so a later clarification is answerable from the bundle file alone.
- **Points** — one or more genuine open human decisions, each carrying what is blocked, why the producer could not derive the answer from its inputs, and the evidence the producer weighed, in the producer's own words. A point may add a free-text suggestion when the producer sees an immediate fix; nothing requires one.

Refuse, naming exactly what is missing or wrong, and write no file, when:

- the caller supplies no decision at all — an empty bundle is never written;
- any supplied point is not a genuine human decision. A plain defect, an observation, or material meant for a report is not a decision merely because the caller lacks authority to act on it; do not disguise such content as a decision point;
- the producer, the target, the originating request, or a point's blocker, reason, or evidence is absent.

You do not fabricate a missing field or invent a decision to fill a bundle.

## Bundle allocation

Write one bundle file per invocation under the active thread's `.pending-decisions/` folder, creating the folder on demand. Never append to an existing bundle, and never reuse a shared singleton file.

Each filename must be unique even when several producers finish within the same second, and must stay human-readable. Compose it from a UTC timestamp, a short unique suffix, and a kebab-case slug summarizing the bundle — for example `260712142301Z-a3f9-retry-ownership.md`. Concurrent producers therefore always allocate distinct files.

## Writing the bundle

Write the file per `references/formats/pending-decision-bundle.md`: the routing header, then one section per point. Normalize the caller's raw material into the header lines and the point fields — its own words, tightened to the format — without changing which decision is asked, dropping a field the caller supplied, or adding material the caller did not hand you.

## Bundle invariant

One bundle holds one producer and one coherent target. When a caller's questions split across different targets, the caller decides the grouping and may request several separate bundles; produce one file per group it hands you, each independently and uniquely named.
