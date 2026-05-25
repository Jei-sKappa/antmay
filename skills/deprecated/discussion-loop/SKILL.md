---
name: discussion-loop
description: Walk through existing discussion points one at a time, always presenting options and a recommendation, then append each user decision to a simple log. Use when the user has findings, open questions, review comments, design points, or a concrete plan they want to discuss and decide interactively.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.2.0
---

# Discussion Loop

Drive a focused discussion over points that already exist in the user's prompt, recent context, a review, a plan, or a document. For each point: surface it, discuss until the user decides, append the decision to a log, then move to the next point.

Your job is to help the user reach the best decision, not to make them feel good about whatever they say. Treat the discussion as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a failure mode here — it corrupts the log with decisions the user will regret.

Hold these together:

- **Disagree when you disagree.** If the user's leaning conflicts with the evidence, your recommendation, or the codebase reality, say so plainly before they decide. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user picks an option for a reason that doesn't hold up, or proposes a choice without considering an important risk, dependency, trade-off, or alternative, name the gap and bring it into the discussion before logging.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, and alternatives they dismissed too fast — raise them even if it slows the loop down.
- **Take the user's input seriously.** If they push back, add context, or challenge your recommendation, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change your recommendation just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the situation differently, identify the exact assumption or value judgment causing the split, then resolve that before logging the decision.
- **Refuse to log a decision you believe is wrong without flagging it.** If the user insists, log it, but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other option> because <why>; user accepted the trade-off.`
- **Keep the decision owned by the evidence.** The goal is not for either side to win. The goal is to record a decision that survives later scrutiny because the relevant context, objections, and trade-offs were actually considered.

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

For each point, open with a level-2 heading containing a concise title for the point — this title is reused verbatim in the log. Then ask one question at a time and always include:

1. **Point** — what this point is about.
2. **What you need to know** — just enough background to answer.
3. **Options** — concrete choices, each with real pros and cons.
4. **Recommendation** — your recommended choice and why.

If the point or its options would benefit from codebase context, inspect the relevant files before presenting the options.

Continue discussing the current point until the user decides. Do not move on while the current decision is still ambiguous.

## Logging

After the user decides, append one record that mirrors what the user saw during the interview, so the log carries enough context to reconstruct what was discussed later without re-reading the chat:

```markdown
## <the concise title for the point, verbatim>

Point: <the Point line you presented, verbatim>

What you need to know: <the background block you presented, verbatim — keep multi-paragraph context as paragraphs, keep file paths and line numbers, do not summarize or compress>

Choice: <what the user chose>

Rationale: <why the choice made sense, including the main trade-off; if you logged a choice you disagreed with, note your dissent and the option you recommended here>
```

Note: Options and Recommendation are intentionally not part of the log record; the goal is to recover what was discussed and chosen, not the full menu the user navigated. If your recommendation matters to the rationale (for example, because the user chose against it), capture that in the Rationale line instead.

Then tell the user: `Decision saved: <short summary>.`

The log is append-only, during the discussion avoid re-reading it.
Do not rewrite earlier records. If a choice changes later, append a new record explaining the change.

## Finish

When there are no points left, say so and ask what the user wants to do next. If there is an obvious next step from the decisions, propose it briefly.
