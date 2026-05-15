---
name: review-decision-document
description: Reviews a decision document — spec, plan, design proposal, anything that captures an idea before someone acts on it — and stress-tests it against the bar that a recipient could deliver the same work the author had in mind. Use when the user has a document they want stress-tested for clarity, internal consistency, gaps, hidden assumptions, and readiness to be built upon.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Decision Document

Stress-test a decision document against this bar: **if the author handed it to someone else, that person should be able to deliver the same work the author had in mind.** Surface where the document falls short of that bar before anyone builds on it.

## What this skill is — and isn't

This is a **review-and-discussion pass**, not an editing pass.

- **Do:** read the document, identify what's missing, ambiguous, implied, or still open, and report it back.
- **Don't:** rewrite the document, invent requirements, propose wording, or implement anything described in it. If the user later asks for a rewrite or for specific edits, that's a separate task.

The document is an **artifact to validate**, not work to do. Assume it's intended as foundation for whatever comes next — further documents, planning, implementation, handoff — even if the user doesn't enumerate what. The reviewer's job is to judge the doc as if someone will act on it next, and test whether it's load-bearing enough for that — not to fix it.

## What to look for

Across the document, surface:

- **Gaps** — required information the doc is silent on.
- **Ambiguities** — statements that admit more than one reasonable reading.
- **Contradictions** — places where two parts of the doc point in different directions.
- **Hidden assumptions** — things the doc takes for granted but never articulates. Ask: would a downstream implementer arrive at the same assumption, or would they have to guess?
- **False precision** — passages that *sound* decided but don't actually pin down enough to act on. Soft words like "robust", "scalable", "modern", "clean", "appropriate", "as needed" are common red flags.
- **Unjustified absolutes** — every "must / never / only / always" claim deserves a check. Is the boundary precise? What happens at the edge? Is the absolute actually necessary or is it accidental over-commitment?

Pay special attention to:

- **Boundaries** — what's in scope, what's out of scope, what owns what.
- **Behaviors** — how something is supposed to act, including under failure or edge conditions.
- **Restrictions, constraints, invariants** — what cannot change, must hold, or is forbidden.
- **Defaults** — what happens when something isn't specified.
- **Interfaces** — contracts between components, modules, teams, or layers.

## Separate three layers in your findings

Every issue falls into one of three layers. Make the layer explicit so the author can act on each appropriately:

- **Explicit** — the document *says* something, but the claim is imprecise, contradictory, or worth challenging. Quote or cite the exact passage.
- **Implied** — the document seems to *assume* something without saying it. The downstream artifacts would need this assumption to be true. Surface it so the author can confirm, deny, or write it down.
- **Open decision** — the document neither says nor implies an answer; the author still has to choose. Frame these as decisions, not gaps to autofill.

Never collapse the three. Treating an implied assumption as if it were explicit, or an open decision as if it were already implied, lets shaky foundations through.

## Output

Markdown document with explicit `##` headings. Order findings by impact, not by where they appear in the doc.

Use these sections, in this order:

1. **Headline findings** — the highest-impact issues first. For each: a short title, the section/heading of the doc it concerns, which layer (Explicit / Implied / Open decision), what's wrong or missing, and **why it matters for someone trying to act on this doc.** A finding without a "why it matters" tether is noise — cut it or sharpen it.
2. **Explicit claims worth flagging** — passages the doc commits to that the author should re-examine: must/never/only/always statements, defaults, boundaries, interface contracts. For each, note whether it's genuinely precise or only sounds decided.
3. **Implied but not stated** — assumptions the doc rests on without articulating. One bullet per assumption, with the section that depends on it.
4. **Open decisions** — what the author still has to choose. Frame as decisions, not edits.
5. **Readiness verdict** — one overall verdict (e.g. *Ready / Partially ready / Not ready* to be built upon) plus a one-line "what's blocking it" tied to the findings above.
6. **Clarifications to answer before proceeding** — a numbered list of specific questions the author should answer next. Each should be answerable in 1–3 sentences. "What's your overall vision" is too broad; "when call X fails, do we retry, fall back to Y, or surface the error to the caller?" is the right grain.

Skip a section entirely rather than padding it. If `Implied but not stated` has nothing real to say, drop the section — don't fill it with weak filler.

## Discipline

- **Reference, don't recite.** Cite section headings or short quotes; don't recap the document back to the user.
- **Tether every finding to downstream impact.** "This is vague" isn't a finding — "This is vague, and a downstream reader would have to guess whether X means A or B" is.
- **Don't fix it.** Resist the urge to write the missing paragraph or the corrected sentence. The user can ask for that in a separate pass. Mixing review with rewriting muddies what the author still owes the document.
- **Don't manufacture findings to seem thorough.** If the doc is genuinely solid for the named downstream artifacts, say so — and still list any clarifications worth confirming. A short, honest review is more useful than a padded one.

## Workflow

1. Check inputs: document path, anchoring context. Ask for whatever's missing before reading.
2. Read any prerequisite docs the user pointed to (project conventions, related context).
3. Read the document under review carefully — at least once end-to-end before noting findings.
4. Draft the review following the structure above. Order by impact, separate the three layers, tether each finding to what would break when someone acts on the doc.
5. Output the review directly. The response IS the deliverable — no preamble, no chat framing, no "Sure, here is…", no closing remark.

## When the document is genuinely solid

If, after a careful read, the document holds up as foundation for the work that would follow: say so plainly in `Readiness verdict`, drop the sections that would be empty, and still surface any specific clarifications worth confirming. Don't invent issues to justify the review.
