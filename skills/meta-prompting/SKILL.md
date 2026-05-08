---
name: meta-prompting
description: Refines a quickly written, unstructured draft prompt into a clean, self-contained version ready to feed to a fresh AI agent session, then copies the result to the system clipboard. Use when the user wants to upgrade a draft prompt before kicking off a new AI conversation, says "meta-prompt this" / "improve this prompt for a new session", or invokes the meta-prompting skill explicitly.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Meta-Prompting

Take the user's raw prompt — usually quickly typed, possibly rambling, missing structure — and rewrite it as a polished prompt that can be pasted into a fresh AI agent session. Deliver the rewritten prompt on the system clipboard via the bundled script.

## When to use

The user has a draft prompt (often pasted in or just typed inline) and wants the refined version. Common cues: "meta-prompt this", "improve this prompt for a new session", "clean this up before I start a new chat", or an explicit skill invocation.

The output is going to a *new* AI session with zero context. Whatever the user assumed in their head must end up explicitly written in the refined prompt, or the new session will flounder.

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

A single block of plain markdown — no surrounding commentary, no "here's your prompt" preamble. Headings and lists *inside* the prompt are fine where they aid clarity.

## Workflow

1. Read the user's raw draft.
2. Generate the refined prompt following the principles above.
3. Pipe it straight into the clipboard script via stdin — no temp file:

   ```bash
   python3 scripts/copy-to-clipboard.py <<'__meta-prompting-skill_EOF__'
   <refined prompt here>
   __meta-prompting-skill_EOF__
   ```

   Use a quoted heredoc (`<<'__meta-prompting-skill_EOF__'`) so backticks, `$`, and other shell metacharacters in the prompt are preserved verbatim. The sentinel is deliberately unusual so it won't appear at the start of a line inside the prompt and prematurely close the heredoc.
4. Show the refined prompt inline in chat so the user can review, and confirm the clipboard now holds it.

## When the draft is too thin

Don't guess. If the raw prompt lacks the project context, the goal, or the specifics needed to refine without inventing, list the missing pieces back to the user as a short bullet list and wait for them to fill in before generating the refined version.
