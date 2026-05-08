---
name: brief-the-implementer
description: Drafts a self-contained outcome briefing — the verdict, why, caveats, and next steps — that someone who wasn't part of the discussion can pick up and act on, then copies it to the system clipboard. Use when the user asks for a handoff, briefing, or paste-ready outcome to relay the conclusion of the current discussion to a separate context (a fresh AI session, a follow-up task, a teammate), says "brief this for the other session" / "wrap this up to paste back" / "pack the outcome", or invokes the brief-the-implementer skill explicitly.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Brief the Implementer

Transform the conclusion of a discussion into a tight, paste-ready briefing that someone picking up the work — a fresh AI session, a teammate catching up, a future-you — can read once and act on, without sitting through the discussion that got there.

## When to use

The user explicitly asks for the outcome of the current discussion to be packaged as a paste-ready briefing for a separate context — another AI session, a follow-up task, a teammate catching up. The trigger is the user's request, not a judgment about whether the conversation has reached a "good enough" conclusion: if they're asking for the briefing, draft it from whatever the discussion has produced. The recipient already knows their own work; what they're missing is the conclusion of *this* discussion and the reasoning behind it. They are not stepping into the user's shoes — they're receiving a reply they can act on.

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
5. **Next steps** — concrete actions for the implementer, ordered. Bullet list. Imperative voice ("do X", not "you should do X").
6. **Worth knowing** — bonus context that came up during the discussion that the asker didn't explicitly ask about but matters. Optional — omit the section entirely if nothing fits.

## Guidelines

- Verdict before justification. The structure is non-negotiable: `What was asked` → `Verdict` → everything else. Don't bury the conclusion under setup.
- Reference, don't duplicate. If the discussion produced or relied on a concrete artifact (a written plan, a PR, an ADR, a file in the repo, an issue link), point to it by path or URL — don't reproduce it inline. Saves the recipient's token budget and prevents drift.
- Keep `Why` proportional to the surprise of the verdict. An obvious answer needs one line of justification; a counterintuitive one needs the full reasoning chain.
- Be honest about caveats. If the verdict only holds under specific conditions, say so. If a discarded alternative had a real argument going for it, flag it. The recipient should be able to sanity-check the conclusion, not take it on faith.
- Next steps are actions, not advice. "Run the migration on staging first" beats "you might want to consider running it on staging." The implementer needs a plan, not a discussion.
- If the user passed an argument when invoking the skill, treat it as the focus the implementer cares about and weight `Next steps` and `Worth knowing` toward that focus. The other sections stay structured the same way.

## Output format

- Markdown document with explicit `##` headings using the exact names listed above.
- Bullet lists where the structure says so; short paragraphs otherwise.
- Code blocks, file paths, and links are encouraged when they make the briefing concrete.
- No greeting, no sign-off, no chat-style framing. The artifact is a document, not a message.
- No artificial length cap — let the content determine the length. A simple verdict can fit in 10 lines; a subtle one might need 50.

## Workflow

1. Identify the conclusion the current session has reached and the question it was answering. If the user passed an argument when invoking the skill, treat it as the focus the implementer will be acting on, and weight the briefing accordingly.
2. Draft the briefing following the structure and guidelines above.
3. Pipe it straight into the clipboard script via stdin — no temp file:

   ```bash
   python3 scripts/copy-to-clipboard.py <<'__brief-the-implementer-skill_EOF__'
   <drafted briefing here>
   __brief-the-implementer-skill_EOF__
   ```

   Use a quoted heredoc (`<<'__brief-the-implementer-skill_EOF__'`) so backticks, `$`, and other shell metacharacters in the briefing are preserved verbatim. The sentinel is deliberately unusual so it won't appear at the start of a line inside the briefing and prematurely close the heredoc.
4. Show the drafted briefing inline in chat so the user can review, and confirm the clipboard now holds it.

## When context is thin

Don't fabricate verdicts, rationale, caveats, or next steps. The skill packages a conclusion that already exists in the discussion — it doesn't manufacture one. If the current session hasn't actually reached a clear conclusion, say so: list what's still unresolved, what would need to be settled before a useful briefing could be written, and wait for the user to either continue the discussion or confirm a partial conclusion before drafting.
