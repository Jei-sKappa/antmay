---
name: report-to-the-owner
description: Drafts a casual, context-rich message to a code owner about something in their code that's blocking the user — a bug, missing capability, or design that doesn't extend to a new use case — along with a proposed change. Use when the user has hit a blocker in code owned by another developer or team and explicitly wants to hand off the work, not ask for advice.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.3.0
---

# Report to the Owner

Transform a blocker — a bug, a missing capability, or a design that doesn't extend to a new use case — into a ready-to-send message that gives a zero-context owner the situation, what's in the way, and the proposed change. Enough for them to act, without making them rediscover what the user already worked out.

## When to use

The user is blocked by code, a service, or a package owned by someone else — a bug, a missing feature, or a feature whose current design doesn't accommodate the user's use case. They are not asking for advice — they have a candidate change in mind. The intent is "FYI + please address," not "what do you think?" Recipient is a peer or owning team — chat/DM, not a public bug tracker or support channel.

## Tone

- Casual, direct, peer-to-peer — assume they saw each other earlier today.
- No greetings, sign-offs, or email-style formality.
- Confident but not accusatory — "here's what I'm seeing and why I think it's X," not "your code is broken."
- Leave room for the owner to disagree with the diagnosis or the proposed direction without making it awkward to walk back.
- Natural openers are fine: "Heads up — I think there's a bug in…", "Running into something in package X…", "Trying to use [X] for [use case] and I think the API needs [change]…", "Hit a wall extending [feature] for [use case]…"

## Structure (in this order)

1. **What the user is working on** — one or two sentences so the owner understands why the user hit this surface.
2. **The blocker** — what's stopping them. For a bug: the wrong behavior they're seeing. For a missing capability or inextensible design: the use case the current code can't accommodate.
3. **What they need or expected** — for a bug, the correct behavior. For a missing/inextensible case, the shape of API or behavior that would unblock them.
4. **Why the current code is the source** — for a bug, the suspected cause and how they localized it. For a missing/inextensible case, the specific design point that doesn't bend (hardcoded assumption, private API, missing extension point) and what they tried before concluding so.
5. **Proposed change** — fix, addition, or refactor — at the right level of detail; one line if obvious, more if the change is subtle.
6. **The ask** — explicit handoff: "could you take a look and patch?" or, if the user is willing, "happy to open a PR if you'd prefer."

## Guidelines

- Prioritize clarity and completeness over brevity. Length is whatever the content needs — no padding, no aggressive trimming. The owner needs enough to act without re-investigating.
- Cleanly separate the blocker from the proposed change. The owner should be able to confirm the bug is real (or the use case isn't supported) without first agreeing with the proposed solution.
- Include enough detail that they don't bounce back asking "how do I see this?" or "what are you trying to do?" — repro for a bug, a concrete use-case sketch for a missing or inextensible feature.
- Frame the proposed change as a candidate, not a mandate — the owner usually knows constraints the user doesn't.
- Show the work behind the conclusion that the current code is the source — for a bug, what was checked to localize it; for a missing/inextensible case, what was tried before concluding the current API doesn't support the use case. The owner shouldn't have to redo it.
- Include a short `Repro:` (for a bug) or `Use case:` (for a missing/inextensible feature) block when prose alone doesn't make the situation concrete. Skip when it would be redundant.
- If the issue is blocking the user's work, say so — matter-of-factly, not as pressure.

## Output format

- A ready-to-send chat/DM message.
- Plain prose, short paragraphs, no headers in the message itself.
- A small `Repro:`, `Use case:`, or code block is fine when it materially helps.
- No artificial length cap — let the content determine the length.
- No preamble, no chat framing, no closing remark. No "Sure, here is…", no "Hope this helps." The response IS the deliverable — anything wrapped around it is fluff.

## Workflow

1. Read the user's description of the blocker and proposed change.
2. Draft the report following the structure and guidelines above.
3. Output the drafted report directly in chat. The response IS the deliverable — no preamble, no closing remark.

## When context is thin

Don't fabricate code paths, error messages, line numbers, repro steps, or use-case details. If the user hasn't given enough to make the report actionable, list the missing pieces back to them as bullets — what they're trying to do, what's blocking them, what they tried or checked, why they think the current code is the source, and the proposed change — and wait for answers before drafting.
