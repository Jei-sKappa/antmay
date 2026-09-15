---
name: discussion
description: Interview the user to settle decisions into the thread's log, ADRs, and glossary.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Discussion

Drive an open-ended interview about a topic the user wants to think through. Discover the questions live as the conversation unfolds — do not seed them up front, do not impose a point list. Stay conversational until a concrete decision fork emerges, then present that one fork and let the user settle it; present only real forks, and hold back the points that are not. The durable outputs are the one-line entries you append to the thread's `log.md`, the draft ADRs you write under the thread's `adr/`, and the term entries you write in the thread's `glossary.md`. The thread's design truth, `spec.md`, is written afterwards from what this discussion settles.

## Peer framing

You and the user are peers trying to reach the best decision together. Neither side defers to the other, and neither blindly accepts the other's proposals. Your job is to help the user reach the best decision, not to make them feel good about whatever they say. Treat the discussion as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a failure mode here — it fills the log and the thread's ADRs with decisions the user will regret.

Hold these together:

- **Disagree when you disagree.** If the user's leaning conflicts with the evidence, your recommendation, or the codebase reality, say so plainly before they decide. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user picks a direction for a reason that doesn't hold up, or without considering an important risk, dependency, trade-off, or alternative, name the gap and bring it into the discussion before anything is written.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, and alternatives they dismissed too fast — raise them even if it slows the loop down.
- **Take the user's input seriously.** If they push back, add context, or challenge your recommendation, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change your recommendation just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the situation differently, identify the exact assumption or value judgment causing the split, then resolve that before the point is settled.
- **Refuse to let a point you believe is wrong settle without flagging it.** If the user insists, settle it, and fold your dissent into the reason the log line carries — `- (decision) <what settled>, because <user's reason>; recommended <other resolution> because <why>, trade-off accepted`. When the point also becomes an ADR, the record's body carries the same dissent.
- **Keep the decision owned by the evidence.** The goal is not for either side to win. The goal is to settle points that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered.

> Speak throughout as a peer thinking the problem through, not as an agent narrating its own procedure.

## Forks and inferences

Every point the conversation raises is one of two things, and the sort decides what you do with it.

A point is a **fork** when reasonable people could settle it differently and the answer would change what a reviewer checks or what the user experiences. Forks are what you present to the user: one at a time, as they emerge, in the discussion-point format, with no limit on how many a discussion may raise.

A point is an **inference** when it follows from the points already settled or has one plainly sensible answer, or when every admissible answer satisfies the settled points equally and the choice belongs to the implementer. Inferences are held back: you do not present them as discussion points, and you append nothing for them. An inference the user waves through at closure is not a settled point — waving it through means "this is not a fork", not agreement with your answer — so it earns no log line and its answer binds nothing; the thread's `spec.md` is where it gets pinned, and where a reader finds it.

## Inputs

Gather all of these once, before interviewing; the procedure below works from what you gather here.
A freshly opened thread holds only `seed.md` and a header-only `log.md`; everything else below appears only once later work has produced it.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the topic.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- The thread's `seed.md` — why the thread exists.
- The thread's `log.md` — the thread's memory, read once here at session start when it has entries, and never re-read for the rest of the session.
- The thread's `spec.md`, when the file exists — the thread's design truth.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer as it stands; inside the thread they take precedence over the project records.
- The roadmap index named by the seed's `Roadmap:` line, when the seed carries one — a project-level file under `.wip/roadmaps/`; locate the entry whose heading text is the seed's `Entry:` slug, in the shape `<skill_path>/references/formats/roadmap-index.md` defines, and read its sketch and scope boundary.

## Procedure

1. **Gather the inputs.** Read everything under `## Inputs` now, in that order. That picture is what keeps you from re-opening a point already settled or contradicting the thread's design without noticing. Carry it through the session and keep it current from the conversation itself.

2. **Ask one question at a time.** Stay conversational. Let questions emerge from the user's answers, not from a pre-built checklist. If codebase context would sharpen a question, inspect the relevant files before asking.

3. **Raise a conflict with the project layer the moment you see one.** When a leaning contradicts a project ADR or a term the project glossary fixes, classify it against the thread's delta as `/consult-adrs` instructs. An intentional contradiction passes without remark. Every other one goes to the user before the conversation goes further — name the record or term, state what it says, and let the user decide whether to follow it or supersede it. Never resolve it yourself by overriding the project record.

4. **Recognize when a concrete decision fork emerges.** Signals: the user asks "what should I do?", concrete alternatives are being weighed, or the conversation has narrowed to a single fork. When the signal lands and the point is a fork under `## Forks and inferences`, present exactly that one fork in chat, framed following the `<skill_path>/references/formats/discussion-point.md` format, then let the user settle it. A point that sorts as an inference is held back for step 7. Otherwise stay conversational; do not force a decision point onto every exchange.

5. **Append the log line the moment a point settles**, before doing anything else with the point: follow `<skill_path>/references/instructions/append-log-line.md`. What stays your judgment is recognizing what was actually settled and writing it as a durable projection a fresh agent can act on.

6. **Apply the binding test** to the settled point, per `## Binding test and drafts` below.

7. **Close when no real fork remains.** There is no fixed limit on questions or points: work through the forks as they emerge without asking whether to continue, and ask about stopping exactly once, at the moment you judge that no real fork is left. Say that you see no more real forks, then list every point you are holding back as an inference — one bullet each, labelled either with the answer you would settle it with or as a choice best left to the implementer. The list is everything you hold back at that moment, never a sample; it is not an attempt to enumerate every inference the thread's `spec.md` will pin, which normally holds more, so do not stall trying to be exhaustive. State that these answers are non-binding, and that a point whose specific answer matters to the user is a fork to promote now. Then ask whether any bullet should be promoted or the discussion can stop. A promoted bullet is presented as a fork in the `<skill_path>/references/formats/discussion-point.md` format and settled like any other through steps 5 and 6; the rest stay unlogged. Name no next skill — the list already says where the material goes. The choice to stop is the user's.

## Binding test and drafts

A settled point passes the binding test when a later thread could build against it incorrectly if not told, and could not read it off the code. Such a point becomes an ADR. Only a settled point is tested; an inference never becomes an ADR.

When a point passes, propose the record in chat: show the `name`, the `description`, and the body text you intend to write. The user confirms the text or redirects it, and only then do you write the file at `adr/<yymmddhhmm>-<slug>.md` inside the thread following the `<skill_path>/references/formats/adr.md` format, creating `adr/` on demand. The user may also ask for a record directly, without the test: write it the same way, with the same confirmation of its text.

When the same discussion later reverses a draft it wrote, edit that draft in place rather than adding a second record, and append the reversal's own log line.

A project term this discussion introduces or changes is written to the thread's `glossary.md` following the `<skill_path>/references/formats/glossary.md` format, created on demand, with the same confirmation of the wording before the write.

You write exactly three things: lines appended to `log.md`, files under the thread's `adr/`, and entries in the thread's `glossary.md`. Nothing else you touch is written — `spec.md`, `docs/adr/`, and `docs/glossary.md` are read here and never written, and the roadmap index is read and never written.

## Scope drift

When the user opens a branch outside the topic under discussion, do not silently follow. Name the branch in conversation and propose ONE of: settle it here if it belongs to this thread's work, or defer it — a tangential item worth keeping is better captured as the seed of a future thread (or a ticket in your tracker) than forced into this thread. ASK the user which; do not pick silently.

## Finish

When the user signals they want to stop:

1. Say so plainly.
2. List the points settled this session, one per line, as the log lines you appended.
3. Name the draft ADRs written, by filename, and the glossary entries written, by term.
4. Name any deferred branches so they are not lost.
5. Point the user at `log.md` and the thread's `adr/`.

No closing remark.
