---
name: seeded-discussion
description: Walk a predetermined list of discussion points one at a time, presenting options and a recommendation for each by default and appending decisions to a log when the user already has concrete points to settle.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.2
---

# Seeded Discussion

Drive a focused walk over a predetermined list of points the user supplies up front. For each point, surface the Decision / What you need to know / Options / Recommendation loop by default, settle it, append the decision to the log, then move to the next point. This skill knows the question set in advance and treats the four-element format as the standard shape for every point — not an opt-in.

## Anti-Sycophancy Stance

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

## Point List Input

This skill accepts a predetermined list of points in either form:

- **A markdown file** with a bullet or numbered list of points (e.g., review findings, design questions, plan steps). The user passes the file path as input.
- **An inline list** pasted into the prompt — bullets, numbered items, or simply paragraphs that read as a sequence of points to settle.

Detect which form the input takes before starting the walk. If the input is ambiguous (e.g., the file referenced is not a list, or the prompt mixes context with the list and the boundary is unclear), confirm with the user before starting — read back the points you identified, in order, and ask whether the list is complete and correctly ordered. Do not begin the walk on a misread input.

## Setup

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If no thread exists, ASK the user where to create one OR auto-create when context makes the slug obvious. If multiple thread roots exist and which is "active" is ambiguous, ASK the user to clarify — do not silently pick the most recent UTC stamp.

2. **Check for an existing decision log on this topic.** Look inside `docs/threads/<thread>/discussions/` for an existing decision log whose filename slug or document heading matches this point list. If one is found, RESUME it (see `## Resumption`). Otherwise the log will be created at the first decision per `## Logging` — do NOT create it proactively.

3. **Confirm the point list with the user before walking.** When you intend to walk N points, list them by title back to the user and confirm the order. Re-ordering before the loop starts is cheaper than re-doing decisions later.

## Loop

For each point in order, present the four-element format by default — options and recommendation are DEFAULT-ON for every point. This skill treats the four-element format as the standard shape, not an opt-in.

1. **Decision** — what this point is about.
2. **What you need to know** — just enough background to answer.
3. **Options** — concrete choices, each with real pros and cons.
4. **Recommendation** — your recommended choice and why.

If the point or its options would benefit from codebase context, inspect the relevant files before presenting the options.

Continue discussing the current point until the user decides. Do NOT move on while the current decision is still ambiguous. The log shape (`## Logging`) demands a clear decision per point — silence is not a decision.

## Logging

The decision log lives at `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`. Use a 12-character `YYMMDDHHMMSSZ` UTC stamp captured once at creation time. The `decision-log` artifact-type suffix is MANDATORY.

The log is **append-only**. Create it lazily on the FIRST decision in this walk (no proactive creation in `## Setup`). After the user decides each point, append one record with a sequential per-log local heading:

```markdown
## D<N>: <Point title>

Decision: <what the user chose>

Rationale: <why the choice made sense, including the main trade-off; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first decision logged in this walk and increments by `1` per decided point. The `## D<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's path.

After appending, tell the user: `Decision saved: <short summary>.`

Do NOT rewrite earlier records. If a decision changes later in the walk (or in a future session), APPEND a new record explaining the change — decision logs evolve only by appending new records, never by editing prior ones. An interrupted session leaves a usable partial log: every decided point up to the interruption is durable, and `## Resumption` describes how the next session picks up.

If you believe the decision the user is about to settle on is wrong, refuse to log it silently. Either resolve the disagreement first, or log it with the dissent included in the `Rationale` line.

## Scope Drift

When the user introduces a branch that is NOT in the seeded point list, do not silently follow them or re-order the walk. Propose ONE of:

1. **Park as an Inbox item** (PREFERRED for non-blocking side-findings). Capture a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this log or disrupting the walk.
2. **Split into its own decision log.** When the branch is itself a multi-point discussion, start a new `<UTC>-<kebab-desc>-decision-log.md` in `discussions/` for it.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Question Budget

There is NO fixed limit on questions or sub-questions within a point. The walk is bounded by the point list itself, not by a question count. Within a single point, ask "shall we keep digging or settle here?" whenever you sense the user has enough to decide and additional questions would be padding. The decision is the user's; the prompt is your job.

## Resumption

If the user pauses mid-walk, the skill resumes on next invocation by READING the existing decision log at `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md` and identifying which seeded points have been logged versus remain. The log itself IS the state — there is no separate state file, no progress tracker, no `processed:` field.

1. Map each `## D<N>: <Point title>` heading in the log to its point in the seeded list.
2. Compute the remaining points: those in the seeded list with no matching log entry yet.
3. Ask the user which remaining point to take next (default: the next one in seeded order; the user may pick differently).

If the seeded list itself has changed since the previous session, confirm the new order with the user before continuing the walk.

## Finish

When no seeded points remain (or the user wants to stop):

1. Say so plainly.
2. Summarize what was decided in this session by `## D<N>` ID: `D1: <Point title> → <decision>`, `D2: <Point title> → <decision>`, …
3. Offer to capture any unresolved branches or out-of-scope items raised during the walk as Inbox items at `docs/threads/<thread>/inbox/open/`.
4. Tell the user where the decision log lives: `Decision log: docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`.

No closing remark.
