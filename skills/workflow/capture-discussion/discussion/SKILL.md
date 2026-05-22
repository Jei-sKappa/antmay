---
name: discussion
description: Conduct an open-ended interview where questions are discovered live as the conversation unfolds; surface options and a recommendation only when a concrete decision point emerges, then append the decision to a thread-local append-only decision log under the active thread's `discussions/` folder. Use when you want to think a topic through with the agent — not knowing yet what every question is — and have the resulting decisions captured as a referenceable, sequentially-numbered log.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.1
---

# Discussion

Drive an open-ended interview about a topic the user wants to think through. Discover the questions live as the conversation unfolds — do not seed them up front, do not impose a point list. When a concrete decision point emerges, surface options and a recommendation; otherwise stay conversational. Each decided point is appended to a per-thread decision log; the log is the durable artifact.

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

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If no thread exists, ASK the user where to create one OR auto-create a thread when context makes the slug obvious (e.g., the user opens with `Let me think through <topic>`). If multiple thread roots exist and which is "active" is ambiguous, ASK — do not silently pick the most recent UTC stamp.

2. **Do NOT create the decision log proactively.** Keep state in-session until the FIRST decision is reached. An open-ended interview that produces no decisions produces no artifact.

3. **At the first decision, resolve the target log.** Look inside `docs/threads/<thread>/discussions/` for an existing decision log on this topic — identify it by the topic encoded in the filename slug, by the `# <Topic>` document heading, or by the per-decision IDs already present. If one is found, RESUME it: append. If none is found, CREATE a new log at `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`. The 12-character `YYMMDDHHMMSSZ` UTC stamp is captured once at write time and never re-derived. The `decision-log` artifact-type suffix is MANDATORY. If multiple plausible existing logs exist for the same topic, ASK the user which to resume — do not pick the latest by UTC stamp.

4. **Ask one question at a time.** Stay conversational. Let questions emerge from the user's answers, not from a pre-built checklist. If codebase context would help, inspect the relevant files before asking.

5. **Recognize when a concrete decision point emerges.** Signals: the user asks "what should I do?", you notice concrete alternatives are being weighed, the conversation has narrowed to a fork. When the signal lands, SURFACE options and a recommendation per `## Decision Point Format`. Otherwise stay conversational — do NOT force the four-element format on every question.

6. **After the user decides, append to the log.** Use the shape in `## Logging Format`. Then tell the user: `Decision saved: <short summary>.`

7. **Continue until the user signals closure or a natural pause appears.** See `## Question Budget` and `## Finish`.

## Decision Point Format

When a concrete decision point emerges (and ONLY then — this format is opt-in, not the default for every exchange), present it as:

1. **Decision** — what this point is about.
2. **What you need to know** — just enough background to answer.
3. **Options** — concrete choices, each with real pros and cons.
4. **Recommendation** — your recommended choice and why.

If the point or its options would benefit from codebase context, inspect the relevant files before presenting the options.

Continue discussing the current decision point until the user decides. Do not log a decision while it is still ambiguous.

## Logging Format

The decision log is **append-only**. Each decided point is appended as one record with a sequential per-log local heading:

```markdown
## D<N>: <Title>

Decision: <what the user chose>

Rationale: <why the choice made sense, including the main trade-off; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first decision in this log and increments by `1` per decision IN THIS LOG. The `## D<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's path.

Do NOT rewrite earlier records. If a decision changes later, APPEND a new record (`## D<N+k>: <Title>` for the same or revised title) explaining the change — emitted decision-log records are immutable: they evolve only by appending new records, never by editing prior ones. An interrupted session leaves a usable partial log: every decision recorded up to the interruption is durable.

If you believe the decision the user is about to settle on is wrong, refuse to log it silently. Either resolve the disagreement first, or log it with the dissent included in the `Rationale` line.

## Scope Drift

When the user introduces a branch that is outside the topic this log is settling, do not silently follow them. Propose ONE of:

1. **Park as an Inbox item** (PREFERRED for non-blocking side-findings). Captures a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this log.
2. **Split into its own decision log.** When the branch is itself worth a dedicated open-ended interview, start a new `<UTC>-<kebab-desc>-decision-log.md` in `discussions/` for it.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Question Budget

There is NO fixed limit on questions or decisions. Ask "shall we keep going or finish here?" whenever you sense natural closure: the user's pace slows, the topic feels exhausted, roughly 10–15 decisions have been logged, or the conversation starts repeating itself. The decision is the user's; the prompt is your job.

## Finish

When the user signals they want to stop:

1. Say so plainly.
2. Summarize what was decided in this session by `## D<N>` ID: `D1: <Title> → <decision>`, `D2: <Title> → <decision>`, …
3. Offer to capture any deferred branches as Inbox items.
4. Tell the user where the decision log lives: `Decision log: docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`.

No closing remark.
