---
name: propose
description: Turn a rough prompt or referenced artifact into a freeform, direction-setting proposal.md at a thread root; use when a unit of work needs its direction sketched and written down before it is specified.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.0.0
---

# Propose

Turn a rough prompt or a referenced input into a freeform proposal that answers "should we do this, and in which direction?" You read the thread's context, write the proposal end-to-end as a single thread-root `proposal.md`, and confirm its path. By default you work straight from the durable inputs without interviewing the user point by point; you honor an invocation that asks you to check in or work through the proposal interactively. Writing the file is where you stop — do not stage, commit, or push.

## Operation

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp. If no thread exists yet, tell the user a thread must be opened before a proposal can be written, and stop; do not create the thread or its seed yourself.

2. **Load context.** Read the thread's `seed.md` and `decisions.md`, plus any artifact or prompt the invocation points you at. `seed.md` says why the thread exists; `decisions.md` says what has already been settled, so the proposal neither re-litigates a closed decision nor contradicts one without noticing.

3. **Draft the body.** Write freeform markdown using the suggested shape below (see `## Suggested shape`). Adapt to what the input warrants — a short proposal is better than a padded one. The proposal must be self-contained: a later reader understands the direction, what was weighed, and what is still open without this chat.

4. **Write the artifact.** Write the single file `docs/threads/<thread>/proposal.md` — literally that name at the thread root. If `proposal.md` already exists, revise it in place: the same file is the stable reference through any review-and-revise cycles. Within-thread references in the body are thread-relative (e.g. `decisions.md`, `spec.md`), never repo-rooted or absolute.

5. **Confirm.** Tell the user exactly: `Proposal written: proposal.md`. Nothing else — no preamble, no summary, no closing remark.

## Suggested shape

The body is freeform markdown with no required template and no required heading set. Four elements tend to make a proposal useful to a downstream reader; they are suggested, not enforced — include only those the input supports, and add others when they help:

1. **Intent** — what this proposal is trying to do, in one or two sentences.
2. **Context** — why it is being raised now, what came before, what triggered it.
3. **Rough shape** — an early sketch of what the change might look like. Not a spec, not a design — a first sketch worth reacting to. Where you weighed alternatives, name the ones considered and why the sketched direction wins.
4. **Open questions** — what is unresolved, what needs a decision later, what is worth flagging so a reader does not assume it is settled.

A proposal capturing only intent and rough shape is fine. Your job is to write what is useful, not to fill out a form.

## Recording elicited decisions

If writing the proposal requires asking the user a question that settles product or workflow intent — a direction the proposal will then depend on — append the answer to the thread-root `decisions.md` as a `D<N>` record before the proposal relies on it. Trivial clarifications about the input (what a phrase meant, which file was intended) settle nothing and need no record.

Number records sequentially across the thread: scan `decisions.md` for the highest existing `D<N>` and use the next integer. Each record is self-contained so a fresh agent understands what was decided without the chat:

```markdown
## D<N>: <Title>

Scope: <optional — omit when the whole thread is the scope; otherwise name the stage or thread-relative artifact the decision applies to>

Context: <one short paragraph stating the question and the surrounding facts needed to understand it, written from the thread's perspective — never "as you said" or "the user chose">

Decision: <the complete substantive resolution, written out in full>

Rationale: <why this resolution and its principal trade-off>
```

Records are append-only: never rewrite or delete one. When a settled decision later changes, append a new record naming the one it supersedes.

## Blocked under an AFK invocation

When the invocation is explicitly AFK (no human is available to answer) and a human decision is genuinely indispensable to write a sound proposal — one you cannot settle yourself from the durable inputs — do not invent the intent and do not stall waiting in chat. Hand the open decision to `/emit-pending-decisions`, giving it `/propose` as the producer, `proposal.md` as the target, the context you gathered as evidence, the open decision(s), and a suggested follow-up (settle the decision, then resume the proposal). Then stop and report concisely that the run is blocked on a queued decision and where the bundle was written.
