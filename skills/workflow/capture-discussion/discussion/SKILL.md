---
name: discussion
description: Conduct an open-ended interview that discovers decision points live and records each settled decision to the thread's decision log — use when the user wants to think a topic through without knowing every question up front.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 3.0.0
---

# Discussion

Drive an open-ended interview about a topic the user wants to think through. Discover the questions live as the conversation unfolds — do not seed them up front, do not impose a point list. Stay conversational until a concrete decision fork emerges; then present that one fork through `/discussion-point` and, once the user settles it, append a self-contained `D<N>` record to the thread's `decisions.md`. The seed plus `decisions.md` are the durable artifact: they must let a later agent author the next piece of work without this conversation.

## Peer framing

You and the user are peers trying to reach the best decision together. Neither side defers to the other, and neither blindly accepts the other's proposals. Your job is to help the user reach the best decision, not to make them feel good about whatever they say. Treat the discussion as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a failure mode here — it fills `decisions.md` with decisions the user will regret.

Hold these together:

- **Disagree when you disagree.** If the user's leaning conflicts with the evidence, your recommendation, or the codebase reality, say so plainly before they decide. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user picks a direction for a reason that doesn't hold up, or without considering an important risk, dependency, trade-off, or alternative, name the gap and bring it into the discussion before recording.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, and alternatives they dismissed too fast — raise them even if it slows the loop down.
- **Take the user's input seriously.** If they push back, add context, or challenge your recommendation, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change your recommendation just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the situation differently, identify the exact assumption or value judgment causing the split, then resolve that before recording the decision.
- **Refuse to record a decision you believe is wrong without flagging it.** If the user insists, record it, but include the dissent in the `Rationale`. Example: `Rationale: <user's reason>. Note: recommended <other resolution> because <why>; user accepted the trade-off.`
- **Keep the decision owned by the evidence.** The goal is not for either side to win. The goal is to record a decision that survives later scrutiny because the relevant context, objections, and trade-offs were actually considered.

## Operation

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp. If no thread exists yet, tell the user a thread must be opened before decisions can be recorded, and stop; do not create the thread or its seed yourself.

2. **Load context.** Read the thread's `seed.md` and `decisions.md` before interviewing, and re-read `decisions.md` whenever you need the current state. They tell you why the thread exists and what has already been settled, so you neither re-litigate a closed decision nor contradict one without noticing.

3. **Ask one question at a time.** Stay conversational. Let questions emerge from the user's answers, not from a pre-built checklist. If codebase context would sharpen a question, inspect the relevant files before asking.

4. **Recognize when a concrete decision fork emerges.** Signals: the user asks "what should I do?", concrete alternatives are being weighed, or the conversation has narrowed to a single fork. When the signal lands, hand exactly that one fork to `/discussion-point` for interactive presentation — one point at a time, established facts separated from the genuine choice, framed as lettered creative options or a single practical proposed solution, with a clear recommendation. Otherwise stay conversational; do not force a decision point onto every exchange.

5. **Record once the user settles the point.** Append a `D<N>` record to `decisions.md` per `## Recording decisions`, then tell the user: `Decision saved: <short summary>.` The discussion point itself is transient framing — its options menu, recommendation, and deliberation are not carried into the record.

6. **Continue until closure.** There is no fixed limit on questions or decisions. Ask "shall we keep going or finish here?" whenever you sense natural closure — the user's pace slows, the topic feels exhausted, or the conversation repeats itself. The choice to stop is the user's; the prompt is your job.

## Recording decisions

There is exactly one decision store: the thread-root `decisions.md`. Append every settled point to it as a self-contained `D<N>` record. Do not create per-artifact or per-topic logs, and do not keep decisions anywhere else.

Number records sequentially across the whole thread: scan `decisions.md` for the highest existing `D<N>` and use the next integer. If `decisions.md` is header-only, the first record is `D1`. (`decisions.md` already exists at the thread root; if it is somehow absent, create it with a short heading before appending.)

Each record is a durable projection of the outcome, not a transcript of how it was reached. Write it so a fresh agent understands what was decided, why, and where it applies without the chat or the discussion point's options menu:

```markdown
## D<N>: <Title>

Scope: <optional — omit this line entirely when the whole thread is the scope; otherwise name the stage, relationship, or thread-relative artifact path the decision applies to>

Context: <one short self-contained paragraph, written from the thread's perspective, stating the question and only the surrounding facts needed to understand the decision>

Decision: <the complete substantive resolution, written out in full>

Rationale: <why this resolution, its principal trade-off, and any facts that materially condition it>
```

Field rules:

- **Title** — a short line naming the decision.
- **Scope** — omit the line when the decision applies to the whole thread; otherwise name a stage, relationship, or thread-relative artifact path (e.g. `specs/001/spec.md`).
- **Context** — mandatory; normally one short paragraph. It states the question and only the facts necessary to understand it. Write it from the thread's perspective: never "in this chat", "as you said", or "the user chose B", and never rely on conversational memory. It may reference an earlier record by ID (e.g. `D3`) when that reference resolves within `decisions.md`, and may reference thread artifacts by thread-relative path. It must not introduce a new decision or assumption — normative choices belong in `Decision`. Include a rejected alternative only when the trade-off is needed to understand the rationale.
- **Decision** — states the complete substantive resolution. Never a bare option letter like "A"; write the substance of what was chosen.
- **Rationale** — records why the choice was made, its principal trade-off, and any materially conditioning facts. Flag any dissent here per the peer stance.

Do not copy the options menu, your recommendation, or general deliberation into the record.

## Supersession

Records are append-only. Never rewrite or delete an existing record. When a settled decision later changes, append a new `D<N>` record that names the record it supersedes (e.g. `Context: supersedes D4 …`) and states the new resolution. An interrupted session leaves a usable partial `decisions.md`: every record written up to the interruption is durable.

## Scope drift

When the user opens a branch outside the topic under discussion, do not silently follow. Name the branch in conversation and propose ONE of: settle it here if it belongs to this thread's work, or defer it — a tangential item worth keeping is better captured as the seed of a future thread (or a ticket in your tracker) than forced into this thread's decisions. ASK the user which; do not pick silently.

## Finish

When the user signals they want to stop:

1. Say so plainly.
2. Summarize what was settled this session by ID: `D<N>: <Title> → <decision>`, one per line.
3. Name any deferred branches so they are not lost.
4. Point the user at the decision store: `Decisions recorded in decisions.md` — or note that nothing was recorded if no point was settled.

No closing remark.
