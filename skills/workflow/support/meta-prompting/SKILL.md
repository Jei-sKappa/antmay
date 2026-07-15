---
name: meta-prompting
description: Refine a draft prompt for a fresh AI session only when the user explicitly mentions "meta-prompt" or "meta-prompting".
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.3.2
---

# Meta-Prompting

Take the user's raw prompt — usually quickly typed, possibly rambling, missing structure — and rewrite it as a polished prompt that can be pasted into a fresh AI agent session.

## Principles

- **Self-contained** — the next session has zero memory. Write so an agent picking this up in a fresh window can follow it without re-asking the user.
- **Faithful** — never invent requirements, technologies, or assumptions the user didn't state. If something important is missing, see the clarification section below.
- **Well-shaped** — pick whatever shape serves the draft — a one-line ask, a paragraph, or sections — whichever a fresh agent will follow most easily. No template, no padding, no empty headings.
- **Tone-neutral** — drop filler ("please could you maybe…"), keep substance. Fix obvious typos silently as part of the rewrite.

## Output format

A single block of plain markdown delivered directly in chat. Headings and lists *inside* the prompt are fine where they aid clarity.

No preamble, no chat framing, no closing remark. No "Sure, here is…", no "Hope this helps." The response IS the deliverable — anything wrapped around it is fluff.

## Workflow

1. Read the user's raw draft.
2. Decide: clarify or rewrite.
3. Either ask the user about the missing pieces, or output the refined prompt directly in chat.

## Ask for context and clarification

Stop and ask the user when the draft is missing required context, internally contradictory, or ambiguous enough that you'd have to guess what they meant. A typo that creates ambiguity (e.g. a misspelled library name that could be one of two packages) is a clarification trigger, not a silent fix. Never invent. Otherwise rewrite without asking.

When you do ask, list the missing pieces as a short bullet list and wait for the user to fill in before generating the refined version.
