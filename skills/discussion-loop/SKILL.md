---
name: discussion-loop
description: Walk through existing discussion points one at a time, always presenting options and a recommendation, then append each user decision to a simple log. Use when the user has findings, open questions, review comments, design points, or a concrete plan they want to discuss and decide interactively.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Discussion Loop

Drive a focused discussion over points that already exist in the user's prompt, recent context, a review, a plan, or a document. For each point: surface it, discuss until the user decides, append the decision to a log, then move to the next point.

This is a decision loop, not a brainstorming session. Do not invent a new list from a vague idea. If there are no concrete points to discuss, ask the user for the points or suggest shaping the idea with a more appropriate skill first.

## Setup

Before the first point, create:

```text
docs/discussions/YYYY-MM-DD-<topic>-<purpose>-discussion.md
```

Use:
- <topic>: short kebab-case topic from the discussion.
- <purpose>: why the discussion is happening: `review`, `brainstorming`, `plan`, `design`, `implementation`, `testing`, `deployment`, `maintenance`, `support`, `documentation`, or another label that fits the surrounding context.

Start the file with a `#` heading and one sentence describing what is being discussed.

## Loop

For each point, ask one question at a time and always include:

1. **Decision** — what this point is about.
2. **What you need to know** — just enough background to answer.
3. **Options** — concrete choices, each with real pros and cons.
4. **Recommendation** — your recommended choice and why.

If the point or its options would benefit from codebase context, inspect the relevant files before presenting the options.

Continue discussing the current point until the user decides. Do not move on while the current decision is still ambiguous.

## Logging

After the user decides, append one record:

```markdown
## <Point title>

Decision: <what the user chose>

Rationale: <why the choice made sense, including the main trade-off>
```

Then tell the user: `Decision saved: <short summary>.`

The log is append-only, during the discussion avoid re-reading it.
Do not rewrite earlier records. If a decision changes later, append a new record explaining the change.

## Finish

When there are no points left, say so and ask what the user wants to do next. If there is an obvious next step from the decisions, propose it briefly.
