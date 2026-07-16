---
name: brief-the-recipient
description: Draft a self-contained outcome briefing — verdict, rationale, caveats, and pointers — when the user wants the conclusion of the current discussion packaged as a paste-ready handoff for a fresh AI session, a follow-up task, or a teammate (manager, reviewer, future-you, anyone receiving the conclusion).
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.1.1
---

# Brief the Recipient

Transform the conclusion of a discussion into a tight, paste-ready briefing that someone picking up next — a fresh AI session, a teammate catching up, a future-you — can read once and act on, without sitting through the discussion that got there. The recipient may be the person who will implement the work, but just as often they're a manager weighing the verdict, a reviewer triaging findings, or another agent taking the next turn — the brief stays useful regardless.

## Recipient

Recipient knowledge profile, in one line: **full project context, zero session context.** They have the codebase, the repo docs, the conventions, the tooling. They do not have the chat that produced this brief. They are not stepping into the user's shoes — they're receiving a reply they can act on, discuss, escalate, or plan around.

## Tone

- Structured, briefing-style — not casual prose. The recipient is parsing the artifact to extend their working context, not reading a chat ping.
- Direct — no hedging, no filler.
- Confident about what was concluded; honest about what wasn't (caveats, open questions).

## Structure (in this order)

The output is a markdown document with explicit headings. Use the section names below verbatim, as `##`-level headings, so the recipient can index by role.

1. **What was asked** — one-line restatement of the question or problem this briefing answers. Anchors the recipient: they should recognize the question they (or the user) sent in.
2. **Verdict** — the conclusion in 1–3 sentences. Front-loaded. If a reader stops after this section they should still know the bottom line.
3. **Why** — the rationale: the reasoning that supports the verdict, alternatives weighed, why they lost. As long as needed; no padding.
4. **Caveats** — known gotchas, edge cases, assumptions made, things that could invalidate the verdict. Bullet list.
5. **Pointers** — suggestions, leads, and cues for the recipient to weigh: things worth checking, options to consider, questions to resolve before they settle on their next move. Bullet list. Suggestive voice, not imperative: "worth checking whether the migration can run online" beats "run the migration on staging first." The recipient's next move — whether that's acting, deciding, discussing, escalating, prioritizing, or planning — is where the *how* gets settled; this section feeds that step, it doesn't replace it. Omit the section if no useful leads came up.
6. **Worth knowing** — bonus context that *came up during the discussion* that the asker didn't explicitly ask about but matters. Discussion-specific only. Optional — omit the section entirely if nothing fits.

## Guidelines

- Self-contain every session-specific reference. The recipient cannot see the discussion that produced this brief, so anything that only exists *because* of the session — alternatives weighed and rejected, ideas coined or dropped, shorthand terms, "the runner-up," "drop the X idea," "as discussed" — must be defined inline the first time it appears, or cut. If you can't briefly explain what X is and why it's relevant without referring back to the chat, the recipient won't be able to either. Test each noun: does this term make sense to someone who only has the project, not the conversation?
- Don't restate what the recipient already knows about the project. Build/test/lint commands, language/runtime conventions, repo layout, project maturity, file paths the recipient owns — anything readable from the codebase or top-level docs (`AGENTS.md`/`CLAUDE.md`, `README`, `package.json`, etc.) is noise. The brief delivers what's *new* to the recipient: this session's verdict, reasoning, and the discussion-specific facts behind them — not the project's standing context.
- Reference, don't duplicate. If the discussion produced or relied on a concrete artifact (a written plan, a PR, an ADR, a file in the repo, an issue link), point to it by path or URL — don't reproduce it inline. Saves the recipient's token budget and prevents drift.
- Keep `Why` proportional to the surprise of the verdict. An obvious answer needs one line of justification; a counterintuitive one needs the full reasoning chain.
- Be honest about caveats. If the verdict only holds under specific conditions, say so. If a discarded alternative had a real argument going for it, flag it. The recipient should be able to sanity-check the conclusion, not take it on faith.
- If the user passed an argument, treat it as the focus the recipient cares about and weight `Pointers` and `Worth knowing` toward that focus. The other sections stay structured the same way.

## Output format

- Markdown document with explicit `##` headings using the exact names listed above.
- Bullet lists where the structure says so; short paragraphs otherwise.
- Code blocks, file paths, and links are encouraged when they make the briefing concrete.
- No preamble, no chat framing, no closing remark. No "Sure, here is…", no "Hope this helps." The response IS the deliverable — anything wrapped around it is fluff. The artifact is a document, not a message.
- No artificial length cap — let the content determine the length. A simple verdict can fit in 10 lines; a subtle one might need 50.

## When context is thin

Don't fabricate verdicts, rationale, caveats, or pointers. The skill packages a conclusion that already exists in the discussion — it doesn't manufacture one. If the current session hasn't actually reached a clear conclusion, say so: list what's still unresolved, what would need to be settled before a useful briefing could be written, and wait for the user to either continue the discussion or confirm a partial conclusion before drafting.
