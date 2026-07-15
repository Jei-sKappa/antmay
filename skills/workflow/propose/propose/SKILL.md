---
name: propose
description: Turn a rough prompt or referenced artifact into a freeform, direction-setting proposal.md at a thread root; use when a unit of work needs its direction sketched and written down before it is specified.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.0.0
---

# Propose

Turn a rough prompt or a referenced input into a freeform proposal that answers "should we do this, and in which direction?" You read the thread's context, write the proposal end-to-end as a single thread-root `proposal.md`, and confirm its path. You work straight from the durable inputs without interviewing the user point by point. Writing the file is where you stop — do not stage, commit, or push.

## Operation

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. Two situations make a pending bundle physically impossible — `.pending-decisions/` would live inside the very thread that failed to resolve — so in both, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>`: no thread exists yet (a thread must be opened before a proposal can be written; do not create the thread or its seed yourself), or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp).

2. **Load context.** Read the thread's `seed.md` and `decisions.md`, plus any artifact or prompt the invocation points you at. `seed.md` says why the thread exists; `decisions.md` says what has already been settled, so the proposal neither re-litigates a closed decision nor contradicts one without noticing.

3. **Draft the body.** Write freeform markdown using the suggested shape below (see `## Suggested shape`). Adapt to what the input warrants — a short proposal is better than a padded one. The proposal must be self-contained: a later reader understands the direction, what was weighed, and what is still open without this chat.

4. **Write the artifact.** Write the single file `docs/threads/<thread>/proposal.md` — literally that name at the thread root. If `proposal.md` already exists, revise it in place: the same file is the stable reference through any review-and-revise cycles. Within-thread references in the body are thread-relative (e.g. `decisions.md`, `spec.md`), never repo-rooted or absolute.

5. **Confirm.** End with exactly this line, and nothing before it — no preamble, no summary, no closing remark: `Outcome: DONE — Proposal written: proposal.md`.

## Suggested shape

The body is freeform markdown with no required template and no required heading set. Four elements tend to make a proposal useful to a downstream reader; they are suggested, not enforced — include only those the input supports, and add others when they help:

1. **Intent** — what this proposal is trying to do, in one or two sentences.
2. **Context** — why it is being raised now, what came before, what triggered it.
3. **Rough shape** — an early sketch of what the change might look like. Not a spec, not a design — a first sketch worth reacting to. Where you weighed alternatives, name the ones considered and why the sketched direction wins.
4. **Open questions** — what is unresolved, what needs a decision later, what is worth flagging so a reader does not assume it is settled.

A proposal capturing only intent and rough shape is fine. Your job is to write what is useful, not to fill out a form.

## Blocked

This path applies whenever a human decision is genuinely indispensable to a sound proposal — one you cannot settle yourself from the durable inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat. Finish everything safely derivable first, then hand the open decision(s) to `/emit-pending-decisions`, giving it `/propose` as the producer, `proposal.md` as the target, the context you gathered as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the proposal. Then stop with a concise notification of where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

A blocked run still writes `proposal.md` as complete as the settled inputs allow — every element the inputs support in place, each blocked specific marked inline at its exact location pointing at the pending bundle. The only permitted gaps are those marked ones tied to queued decisions.
