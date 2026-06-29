---
targets:
  agent-skill:
    frontmatter:
      name: seeded-discussion
      description: Walk a predetermined list of discussion points one at a time, presenting options or a single well-argued recommendation for each and appending each on-target decision to a target-scoped log when the user already has concrete points to settle.
      metadata:
        author: https://github.com/Jei-sKappa
        version: 2.0.0
inputs:
  session-noun:
    type: string
    required: false
    default: walk
---
# Seeded Discussion

Drive a focused walk over a predetermined list of points the user supplies up front. For each point, present it per `## Loop`, settle it, append each on-target decision to the log, then move to the next point. This skill knows the question set in advance and treats the structured decision-point format as the standard shape for every point — not an opt-in.

## Peer Framing

You and the user are peers trying to reach the best decision together. Neither side defers to the other, and neither blindly accepts the other's proposals. Your job is to help the user reach the best decision, not to make them feel good about whatever they say. Treat the discussion as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a failure mode here — it corrupts the log with decisions the user will regret.

Hold these together:

- **Disagree when you disagree.** If the user's leaning conflicts with the evidence, your recommendation, or the codebase reality, say so plainly before they decide. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user picks an option for a reason that doesn't hold up, or proposes a choice without considering an important risk, dependency, trade-off, or alternative, name the gap and bring it into the discussion before logging.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, and alternatives they dismissed too fast — raise them even if it slows the loop down.
- **Take the user's input seriously.** If they push back, add context, or challenge your recommendation, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change your recommendation just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the situation differently, identify the exact assumption or value judgment causing the split, then resolve that before logging the decision.
- **Refuse to log a decision you believe is wrong without flagging it.** If the user insists, log it, but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other option> because <why>; user accepted the trade-off.`
- **Keep the decision owned by the evidence.** The goal is not for either side to win. The goal is to record a decision that survives later scrutiny because the relevant context, objections, and trade-offs were actually considered.

## Two Modes

A discussion point runs in one of two modes, picked per point, defaulting by context:

- **Creative** — exploring a solution space. Present **multiple lettered options** (see `## Loop`).
- **Practical** — disposing review findings, fixing a concrete issue, or any point where one well-reasoned answer serves the reader better than a menu. Present a **single, well-argued Proposed solution** instead of an options list. Disposing review findings (a common driver of a seeded walk) is usually practical mode.

Do not force an options list when one clearly reasoned recommendation serves the reader better — options are a tool for genuine solution-space exploration, not a ceremony to perform every time. Pick the mode that fits the point in front of you; you may switch between points within one walk.

## Point List Input

This skill accepts a predetermined list of points in either form:

- **A markdown file** with a bullet or numbered list of points (e.g., review findings, design questions, plan steps). The user passes the file path as input.
- **An inline list** pasted into the prompt — bullets, numbered items, or simply paragraphs that read as a sequence of points to settle.

Detect which form the input takes before starting the walk. If the input is ambiguous (e.g., the file referenced is not a list, or the prompt mixes context with the list and the boundary is unclear), confirm with the user before starting — read back the points you identified, in order, and ask whether the list is complete and correctly ordered. Do not begin the walk on a misread input.

## Setup

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If no thread exists, ASK the user where to create one OR auto-create when context makes the slug obvious. If multiple thread roots exist and which is "active" is ambiguous, ASK the user to clarify — do not silently pick the most recent UTC stamp.

2. **Resolve the target.** A discussion serves exactly one target artifact and lands in **that target's `discussions/` folder**. Decide the target before the walk:
   - A **genesis** walk — held before any proposal/spec/plan exists — targets the **seed** and lands in `seed/discussions/`.
   - A walk over a proposal, spec, plan, or implementation targets that artifact and lands in its `discussions/` folder (`proposals/NNN/discussions/`, `specs/NNN/discussions/`, `implementation/discussions/`). A walk over **a review's findings** still targets the artifact that review serves and lands in **that artifact's** `discussions/` — its relationship to the review lives in the log body and header, not in a deeper folder. Nesting is capped at this one level: records never nest inside other records.
   - If the target is ambiguous (e.g., multiple lineages of one type exist), ASK the user which artifact this walk serves. Do not silently pick.

3. **Check for an existing decision log on this topic.** Look inside the target's `discussions/` folder for an existing decision log whose filename slug or document heading matches this point list. If one is found, RESUME it (see `## Resumption`). Otherwise the log will be created at the first on-target decision per `## Logging` — do NOT create it proactively.

4. **Confirm the point list with the user before walking.** When you intend to walk N points, list them by title back to the user and confirm the order. Re-ordering before the loop starts is cheaper than re-doing decisions later.

## Loop

For each point in order, present the structured decision-point format by default — this skill treats it as the standard shape, not an opt-in:

1. **Point** — what this point is about.
2. **What you need to know** — just enough background to answer.
3. **(Optional pause)** — after presenting "What you need to know", STOP and let the user respond before generating the options/recommendation. The user may answer directly, add context you were missing, or skip ahead. This pause lets the user redirect early rather than react to a fully-formed proposal. If the user skips or says "go on", proceed.
4. **Options or Proposed solution** — driven by the mode:
   - **Creative mode**: present concrete **lettered options (A / B / C)**, each with real pros and cons, so the user can reference them tersely ("go with B").
   - **Practical mode**: present a single, well-argued **Proposed solution** rather than a menu.
5. **Recommendation** — in creative mode, your recommended option and why; in practical mode, the Proposed solution already carries this.

If the point or its options would benefit from codebase context, inspect the relevant files before presenting them.

Continue discussing the current point until the user decides. Do NOT move on while the current decision is still ambiguous. The log shape (`## Logging`) demands a clear decision per recorded point — silence is not a decision.

## Target-Scoped P-Numbering

Decision points are P-numbered and **scoped to this walk's target** — the records logged here are about that one artifact. **Off-target exchanges** — for example an end-of-walk "what next?" exchange that is workflow navigation, not a decision about the target — are **never logged** (see `## Log What Serves the Target`). A mid-walk tangent that is itself a real decision for a *different* target is handled by `## Scope Drift`, not folded in here. Polluting a target's log with non-target decisions is a known failure mode: keep the log about its target.

## Context-Rich Headers

The log's document header carries **full context**, never just a vague title. A future reader must be able to tell, from the header alone, what the walk was about and what it served. The header MUST name:

- the **target artifact** (its thread-relative path, e.g. `specs/001/spec.md`, or "the seed" for a genesis walk);
- the **thread** (its `docs/threads/<...>` slug or root);
- **what is being discussed** — the actual subject, in a sentence.

Example header:

```markdown
# Decision log — auth cutover spec review findings (specs/001/spec.md)

Thread: docs/threads/260612174045Z-auth-cutover/
Target: specs/001/spec.md
Subject: disposing the findings raised in the spec review of the auth cutover spec.
```

Within-thread references (the target path, cross-links to other artifacts in this thread) are written **thread-relative** — relative to the thread root (`specs/001/spec.md`, `specs/001/reviews/...`), never repo-rooted and never absolute, so the thread can be moved or archived without breaking its internal links. Cross-thread references are repo-relative (`docs/threads/<other>/...`).

## Logging

The decision log lives in the target's `discussions/` folder at `<target-discussions-folder>/<UTC>-<kebab-desc>-decision-log.md` — e.g. `seed/discussions/<UTC>-<kebab-desc>-decision-log.md` for a genesis walk, or `specs/001/discussions/<UTC>-<kebab-desc>-decision-log.md` for a spec walk. Use a 12-character `YYMMDDHHMMSSZ` UTC stamp captured once at creation time (no separators, trailing `Z` for UTC, e.g. `260518200115Z`). The `decision-log` artifact-type suffix is MANDATORY.

The log is **append-only**. Create it lazily on the FIRST on-target decision in this walk (no proactive creation in `## Setup`; see `## Log What Serves the Target`). After the user settles each on-target point, append one record with a sequential per-log local heading. The record mirrors what the user saw at the point, so the log carries enough context to reconstruct what was discussed later without re-reading the chat:

```markdown
## P<N>: <Point title>

Point: <the Point line you presented, verbatim — what this decision point is about>

What you need to know: <the background block you presented, verbatim — keep multi-paragraph context as paragraphs, keep file paths and line numbers; do NOT summarize or compress>

Decision: <what the user chose>

Rationale: <why the choice made sense, including the main trade-off; flag any dissent per the Peer Framing stance>
```

Where `N` starts at `1` for the first decision logged in this walk and increments by `1` per recorded point. The `## P<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's (thread-relative) path.

After appending, tell the user: `Decision saved: <short summary>.`

A log is a record. **Records are immutable by default**: do NOT rewrite earlier records. If a decision changes later in the walk (or in a future session), APPEND a new record explaining the change — an append-only log evolves only by appending new records, never by editing prior ones. An interrupted session leaves a usable partial log: every decided point up to the interruption is durable, and `## Resumption` describes how the next session picks up.

The one exception to immutability is an **owner-authorized in-place correction**. If the human owner explicitly authorizes fixing an emitted record, the change MUST be **visibly marked** — an erratum or edit note alongside the original text — so the change is auditable. Never silently edit an emitted record.

If you believe the decision the user is about to settle on is wrong, refuse to log it silently. Either resolve the disagreement first, or log it with the dissent included in the `Rationale` line.

## Disposition Is Not Owned Here

A discussion does NOT own review disposition. When this walk disposes a review's findings, the review's disposition (accepted / rejected, when, and why) is recorded in **the review's own YAML frontmatter `status:` map** — not in this log. This log is, **when one is written**, only the **optional `rationale` cross-link** that the review's frontmatter may point to (a thread-relative path) — it is never the authoritative status, and a review does not require a discussion to be disposed. So: write a disposition log only if the reasoning is worth preserving for a future reader; otherwise let the review's frontmatter carry the disposition alone.

::include{root="group", path="partials/log-what-serves-the-target.md"}

## Scope Drift

When the user introduces a branch that is NOT in the seeded point list, do not silently follow them or re-order the walk. Propose ONE of:

1. **Split into its own decision log.** When the branch is itself a multi-point discussion AND serves a target, start a new `<UTC>-<kebab-desc>-decision-log.md` in the appropriate target's `discussions/` folder for it.
2. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass. A tangential item worth keeping is better captured as the seed of a future thread (or a ticket in your tracker) than forced into this log.

ASK the user which. Do not pick silently.

## Question Budget

There is NO fixed limit on questions or sub-questions within a point. The walk is bounded by the point list itself, not by a question count. Within a single point, ask "shall we keep digging or settle here?" whenever you sense the user has enough to decide and additional questions would be padding. The decision is the user's; the prompt is your job.

## Resumption

If the user pauses mid-walk, the skill resumes on next invocation by READING the existing decision log in the target's `discussions/` folder and identifying which seeded points have been logged versus remain. The log itself IS the state — there is no separate state file, no progress tracker, no `processed:` field. (Every on-target seeded point that was settled has a log entry, so the log maps cleanly back to the seeded list; reconcile against the seeded list and the conversation when a point was raised but left unsettled.)

1. Map each `## P<N>: <Point title>` heading in the log to its point in the seeded list.
2. Compute the remaining points: those in the seeded list with no matching log entry yet — an on-target settled point always has a log entry, so a point with no entry is one not yet settled (confirm with the user if unsure).
3. Ask the user which remaining point to take next (default: the next one in seeded order; the user may pick differently).

If the seeded list itself has changed since the previous session, confirm the new order with the user before continuing the walk.

## Finish

When no seeded points remain (or the user wants to stop):

1. Say so plainly.
2. Summarize what was decided in this session by `## P<N>` ID: `P1: <Point title> → <decision>`, `P2: <Point title> → <decision>`, …
3. Name any unresolved branches or out-of-scope items raised during the walk in conversation so they are not lost.
4. Tell the user where the decision log lives (its thread-relative path), e.g. `Decision log: specs/001/discussions/<UTC>-<kebab-desc>-decision-log.md` — or note that no log was written if no on-target decision was reached.

No closing remark.
