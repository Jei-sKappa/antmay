---
name: brief-the-implementer
description: Drafts a self-contained outcome briefing — the verdict, why, caveats, and pointers — that someone who wasn't part of the discussion can pick up and act on. Use when the user wants the conclusion of the current discussion packaged as a paste-ready handoff for a separate context — a fresh AI session, a follow-up task, or a teammate catching up.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.4.0
---

# Brief the Implementer

Transform the conclusion of a discussion into a tight, paste-ready briefing that someone picking up the work — a fresh AI session, a teammate catching up, a future-you — can read once and act on, without sitting through the discussion that got there.

## When to use

The user explicitly asks for the outcome of the current discussion to be packaged as a paste-ready briefing for a separate context — another AI session, a follow-up task, a teammate catching up. The trigger is the user's request, not a judgment about whether the conversation has reached a "good enough" conclusion: if they're asking for the briefing, draft it from whatever the discussion has produced. The recipient already knows their own work; what they're missing is the conclusion of *this* discussion and the reasoning behind it. They are not stepping into the user's shoes — they're receiving a reply they can act on.

Recipient knowledge profile, in one line: **full project context, zero session context.** They have the codebase, the repo docs, the conventions, the tooling. They do not have the chat that produced this brief.

## Tone

- Structured, briefing-style — not casual prose. The recipient is parsing the artifact to extend their working context, not reading a chat ping.
- Verdict-first. The bottom line goes at the top; a skim of the first two sections should reveal the answer.
- Direct, no preamble or sign-off. No "hope this helps."
- Confident about what was concluded; honest about what wasn't (caveats, open questions).

## Structure (in this order)

The output is a markdown document with explicit headings. Use the section names below verbatim, as `##`-level headings, so the recipient can index by role.

1. **What was asked** — one-line restatement of the question or problem this briefing answers. Anchors the recipient: they should recognize the question they (or the user) sent in.
2. **Verdict** — the conclusion in 1–3 sentences. Front-loaded. If a reader stops after this section they should still know the bottom line.
3. **Why** — the rationale: the reasoning that supports the verdict, alternatives weighed, why they lost. As long as needed; no padding.
4. **Caveats** — known gotchas, edge cases, assumptions made, things that could invalidate the verdict. Bullet list.
5. **Pointers** — suggestions, leads, and cues for the implementer to weigh: things worth checking, options to consider, questions to resolve before settling on an approach. Bullet list. Suggestive voice ("worth checking whether X", "consider Y") — not imperative. The implementer's session is where the *how* gets decided; this section feeds that discussion, it doesn't replace it. Omit the section if no useful leads came up.
6. **Worth knowing** — bonus context that *came up during the discussion* that the asker didn't explicitly ask about but matters. Discussion-specific only — not project-level facts the recipient can read out of the codebase or top-level docs. Optional — omit the section entirely if nothing fits.

## Guidelines

- Verdict before justification. The structure is non-negotiable: `What was asked` → `Verdict` → everything else. Don't bury the conclusion under setup.
- Self-contain every session-specific reference. The recipient cannot see the discussion that produced this brief, so anything that only exists *because* of the session — alternatives weighed and rejected, ideas coined or dropped, shorthand terms, "the runner-up," "drop the X idea," "as discussed" — must be defined inline the first time it appears, or cut. If you can't briefly explain what X is and why it's relevant without referring back to the chat, the recipient won't be able to either. Test each noun: does this term make sense to someone who only has the project, not the conversation?
- Don't restate what the recipient already knows about the project. Build/test/lint commands, language/runtime conventions, repo layout, project maturity, file paths the recipient owns — anything readable from the codebase or top-level docs (`AGENTS.md`/`CLAUDE.md`, `README`, `package.json`, etc.) is noise. The brief delivers what's *new* to the recipient: this session's verdict, reasoning, and the discussion-specific facts behind them — not the project's standing context.
- Reference, don't duplicate. If the discussion produced or relied on a concrete artifact (a written plan, a PR, an ADR, a file in the repo, an issue link), point to it by path or URL — don't reproduce it inline. Saves the recipient's token budget and prevents drift.
- Keep `Why` proportional to the surprise of the verdict. An obvious answer needs one line of justification; a counterintuitive one needs the full reasoning chain.
- Be honest about caveats. If the verdict only holds under specific conditions, say so. If a discarded alternative had a real argument going for it, flag it. The recipient should be able to sanity-check the conclusion, not take it on faith.
- Pointers are leads, not orders. Surface what the implementer should weigh — open questions, options worth considering, gotchas to watch for — but leave the actual "how" decisions to the next session. "Worth checking whether the migration can run online" beats "run the migration on staging first." The implementer needs the inputs to plan, not a plan baked in this session that may be poorly thought out.
- If the user passed an argument when invoking the skill, treat it as the focus the implementer cares about and weight `Pointers` and `Worth knowing` toward that focus. The other sections stay structured the same way.

## Output format

- Markdown document with explicit `##` headings using the exact names listed above.
- Bullet lists where the structure says so; short paragraphs otherwise.
- Code blocks, file paths, and links are encouraged when they make the briefing concrete.
- No preamble, no chat framing, no closing remark. No "Sure, here is…", no "Hope this helps." The response IS the deliverable — anything wrapped around it is fluff. The artifact is a document, not a message.
- No artificial length cap — let the content determine the length. A simple verdict can fit in 10 lines; a subtle one might need 50.

## Workflow

1. Identify the conclusion the current session has reached and the question it was answering. If the user passed an argument when invoking the skill, treat it as the focus the implementer will be acting on, and weight the briefing accordingly.
2. Draft the briefing following the structure and guidelines above.
3. Output the drafted briefing directly in chat. The response IS the deliverable — no preamble, no closing remark.

## When context is thin

Don't fabricate verdicts, rationale, caveats, or pointers. The skill packages a conclusion that already exists in the discussion — it doesn't manufacture one. If the current session hasn't actually reached a clear conclusion, say so: list what's still unresolved, what would need to be settled before a useful briefing could be written, and wait for the user to either continue the discussion or confirm a partial conclusion before drafting.
