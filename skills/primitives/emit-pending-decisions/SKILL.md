---
name: emit-pending-decisions
description: Use only when an invoking caller supplies open human decisions with their producing context and needs them queued as a `.pending-decisions/` bundle for a human to settle later; never for defects, observations, or report material — only genuine open human decisions.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.1.0
---

# Emit Pending Decisions

Queue genuine human decisions that a caller cannot settle on its own. You take the decisions the caller hands you, allocate a uniquely named bundle file, write its routing header and advisory follow-up, and normalize each decision into a canonical discussion point inside that file. You do not decide the questions, judge whether they truly need a human, vouch for the correctness of their evidence, or apply their outcomes — you own only the bundle's allocation, shape, and the refusals below.

## Precondition and refusal

Act only when the caller supplies all of:

- **Producer** — the invoking operation, named as `/<skill-name>`.
- **Target** — the thread-relative artifact or operation the decisions serve.
- **Originating request** — the user request that triggered the producing run, so a later clarification is answerable from the bundle file alone.
- **Evidence** — the source references or context behind the decisions.
- **Points** — one or more genuine open human decisions.
- **Suggested follow-up** — the advisory action the caller recommends once the decisions are settled.

Refuse, naming exactly what is missing or wrong, and write no file, when:

- the caller supplies no decision at all — an empty bundle is never written;
- any supplied point is not a genuine human decision. A plain defect, an observation, or material meant for a report is not a decision merely because the caller lacks authority to act on it; do not disguise such content as a decision point;
- the producer, target, originating request, points, or suggested follow-up is absent.

You do not fabricate a missing field or invent a decision to fill a bundle.

## Bundle allocation

Write one bundle file per invocation under the active thread's `.pending-decisions/` folder, creating the folder on demand. Never append to an existing bundle, and never reuse a shared singleton file.

Each filename must be unique even when several producers finish within the same second, and must stay human-readable. Compose it from a UTC timestamp, a short unique suffix, and a kebab-case slug summarizing the bundle — for example `260712142301Z-a3f9-retry-ownership.md`. Concurrent producers therefore always allocate distinct files.

## Bundle shape

Write the file in this order: a routing header, the advisory follow-up section, then the canonical points.

The routing header contains exactly these fields:

```markdown
# Pending decisions: <bundle title>

Producer: /<skill-name>
Target: <thread-relative artifact or operation>
Request: <the originating user request that triggered the producing run, quoted or tightly summarized so a clarification is answerable from this file alone>
Created: <UTC>
Points: <count>
Summary: <one-line description of the contained questions>
```

Immediately after the header, write:

```markdown
## Suggested action after resolving the decisions

<self-contained advisory follow-up>
```

The follow-up is a natural-language paragraph, built from the caller's supplied suggestion, describing a useful next step such as applying the resulting decisions to the target and rechecking it. It is advice a human reads and chooses to act on — never an executable command, never workflow state, and never a promise that a named skill can be invoked automatically. Write it so it stands on its own without the originating chat.

Then, for each unresolved human decision, write one canonical discussion point into the bundle file per the format in `references/formats/discussion-point.md`, normalizing the caller's raw material into that structure without changing which decision is being made or inventing evidence the caller did not supply. Every point in the bundle shares the header's producer, target, and follow-up boundary.

## Bundle invariant

One bundle holds one producer, one coherent target, and one follow-up action. When a caller's questions split across different targets or call for different follow-up actions, the caller decides the grouping and may request several separate bundles; produce one file per group it hands you, each independently and uniquely named.
