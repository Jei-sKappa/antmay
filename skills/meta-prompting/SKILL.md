---
name: meta-prompting
description: Refines a draft prompt for a fresh AI session. Use only when the user mentions "meta-prompt" or "meta-prompting" — do not infer the request from context.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.2.1
---

# Meta-Prompting

Take the user's raw prompt — usually quickly typed, possibly rambling, missing structure — and rewrite it as a polished prompt that can be pasted into a fresh AI agent session.

## Principles

- **Self-contained** — the new session has no memory of this conversation. Every fact, file path, constraint, or goal needs to be in the rewritten prompt.
- **Faithful** — do not invent requirements, technologies, or assumptions the user didn't state. If something important is missing, name it as an open question rather than guessing.
- **Structured** — group information by purpose (context, goal, constraints, deliverables) instead of preserving the order it was typed in.
- **Specific** — replace vague gestures ("the thing", "that issue") with concrete names. If the draft is too vague to specify without inventing, ask before rewriting.
- **Actionable** — the new session should know what to do next without re-asking the user.
- **Tone-neutral** — drop filler ("please could you maybe…"), keep substance.

## Structure (when it fits)

Adapt to the content. A typical refined prompt has, in roughly this order:

1. **Context** — what the project is, the relevant component, current state
2. **Goal** — what the user wants the agent to achieve
3. **Constraints / preferences** — must-haves, must-avoids, stack choices, style
4. **Steps already taken** — so the new session doesn't redo work
5. **Deliverable** — what the agent should produce (code, plan, review, doc)

Skip sections that don't apply. Don't pad.

## Output format

A single block of plain markdown delivered directly in chat. Headings and lists *inside* the prompt are fine where they aid clarity.

No preamble, no chat framing, no closing remark. No "Sure, here is…", no "Hope this helps." The response IS the deliverable — anything wrapped around it is fluff.

## Workflow

1. Read the user's raw draft.
2. Generate the refined prompt following the principles above.
3. Output the refined prompt directly in chat. The response IS the deliverable — no preamble, no closing remark.

## When the draft is too thin

Don't guess. If the raw prompt lacks the project context, the goal, or the specifics needed to refine without inventing, list the missing pieces back to the user as a short bullet list and wait for them to fill in before generating the refined version.
