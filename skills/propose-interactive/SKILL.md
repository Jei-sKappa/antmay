---
name: propose-interactive
description: Walk the user through the four suggested elements of a proposal — intent, context, rough shape, open questions — one at a time, then assemble and write a freeform proposal markdown file under the active V1 thread's `proposals/` folder. Use when you want to think the proposal through together with the agent, surface open questions live, and have the resulting artifact written for you — not when you already have the prompt fully shaped (use `propose-auto` for that).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Propose Interactive

Walk the user through the four suggested proposal elements one at a time — intent, context, rough shape, open questions — accept freeform answers per element, assemble the body, and write the artifact to the active thread's `proposals/` folder using the V1 record-form filename grammar. This skill is the collaborative half of the V1 propose pair: it interviews, it pushes back on weak reasoning, and it leaves a freeform proposal behind. For end-to-end generation from a rough prompt with no clarifying questions, use the sibling skill `propose-auto` instead.

## Anti-Sycophancy Stance

Your job is to help the user reach a proposal that survives later scrutiny, not to make them feel good about whatever rough shape they walk in with. Treat proposal authoring as a mutual attempt to get closer to the right framing: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a failure mode here — it produces a proposal whose `## Open questions` section is empty because nobody pushed.

Hold these together:

- **Disagree when you disagree.** If the user's intent conflicts with the evidence, your read of the context, or the codebase reality, say so plainly before they commit it to the proposal body. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user's rough shape rests on an unexamined assumption, ignores a known constraint, or skips an important risk or trade-off, name the gap and bring it into the conversation before writing.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, alternatives they dismissed too fast — raise them, even if it slows the loop down. Better captured as an Open question now than rediscovered during spec or implementation.
- **Take the user's input seriously.** If they push back, add context, or challenge your framing, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never soften your read of the proposal just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the proposal differently, identify the exact assumption or value judgment causing the split, then resolve it before writing the relevant element into the body.
- **Refuse to log a proposal element you believe is wrong without flagging it.** If the user insists, write it, but note the dissent in the proposal body — either inline next to the relevant element or in `## Open questions`. Example: `Open question: recommended <other shape> because <why>; user proceeded with <chosen shape> — flagged for spec phase to revisit.`
- **Keep the proposal owned by the evidence.** The goal is not for either side to win. The goal is to emit a proposal that survives the spec phase because the relevant context, objections, and trade-offs were actually considered.

If you believe the user is about to commit a framing into the proposal that is wrong, refuse to log it silently. Either resolve the disagreement first, or write it with the dissent included in the proposal body's open questions or alongside the relevant element.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp. If no thread exists, ASK the user where to create one OR auto-create when the calling context makes the slug obvious.

2. **Confirm or derive the slug.** Propose a kebab-case slug derived from the user's opening prompt and read it back for confirmation, or ask the user to supply one. Re-naming after the file is emitted is not possible (per `docs/workflow/v1/immutability.md`), so settling the slug before writing is cheaper than fixing it later.

3. **Walk the four suggested elements, one at a time.** Ask about each element, accept the user's freeform answer, push back per the `## Anti-Sycophancy Stance` when warranted, then move on. The four elements:

   1. **Intent** — what this proposal is trying to do, in one or two sentences. What outcome would make this proposal worth shipping?
   2. **Context** — why it is being raised now. What came before? What triggered the idea? What is the user reacting to?
   3. **Rough shape** — an early sketch of what the change might look like. Not a spec. Not a design. A first sketch worth reacting to.
   4. **Open questions** — what is unresolved, what needs a decision later, what is worth flagging upfront so a reader does not assume it is settled. Add to this list anything that surfaced during the walk and was not closed.

   The four-element structure is SUGGESTED, not enforced. The user may add a fifth element (constraints, prior art, alternatives weighed), drop an element that does not apply (e.g., no open questions yet), reorder them, or reshape them entirely. Adapt to what the conversation produces. This is freeform proposal authoring, not a template fill-in. The skill body is the scaffold; the proposal does not have to be.

4. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

5. **Assemble and write the artifact.** Compose the proposal body from the user's answers, then write to `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. The `proposal` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `proposals/` folder is created on-demand per `docs/workflow/v1/thread-layout.md`. The proposal body is plain markdown — no YAML frontmatter on the proposal itself.

6. **Confirm.** Tell the user: `Proposal written: <relative-path-to-the-file>`. No closing remark, no summary.

## Decision Log

This skill does NOT auto-write a separate decision log. The default behavior is to capture the proposal artifact only. A decision log is written ONLY if durable trade-offs or rejected alternatives emerge during the walk that cannot reasonably be captured in the proposal body itself — for example, a major design alternative the user considered and rejected with rationale that downstream readers will need to understand.

When such a log IS warranted, write it to `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md` per `docs/workflow/v1/filename-grammar.md` (record form, `decision-log` artifact-type token). Use the append-only single-record shape from the `discussion` and `seeded-discussion` skill bodies — sequential per-log `## D<N>: <Title>` headings with `Decision:` and `Rationale:` lines. If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim.

When in doubt about whether a side-conversation rises to "durable trade-off" status, ASK the user. The default is no decision log — most proposal authoring is captured fully in the proposal body's `## Open questions` and `## Rough shape` sections.

## Scope Drift

When the user introduces a branch that is outside the proposal being authored, do not silently follow them and do not let the proposal grow into a different shape than the one being discussed. Propose ONE of:

1. **Park as an Inbox item** via the `capture-inbox` skill (PREFERRED for non-blocking side-findings). Captures a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this proposal.
2. **Split into its own proposal or discussion thread.** When the branch is itself worth a dedicated proposal or a multi-decision discussion, start a new artifact rather than expand the current proposal beyond its intent.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Filename and Folder

The proposal artifact uses the V1 record-form filename grammar:

```text
<YYMMDDHHMMSSZ>-<kebab-desc>-proposal.md
```

The 12-character UTC stamp comes first, followed by a kebab-case description, followed by the literal `proposal` artifact-type token, followed by `.md`. See `docs/workflow/v1/filename-grammar.md` for the canonical grammar and the recognized artifact-type list.

Example:

```text
260521120000Z-onboarding-friction-proposal.md
```

The file lands at `docs/threads/<thread>/proposals/<filename>` per `docs/workflow/v1/thread-layout.md`. The `proposals/` folder is created on-demand on the first proposal written for the thread.

## Commit Policy

This skill NEVER auto-commits the proposal artifact (or the optional decision log). Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

## Immutability

Emitted proposal artifacts are immutable per `docs/workflow/v1/immutability.md`. Once the file is written into `proposals/`, it is part of the thread's reviewable history and is not edited. Revisions emit a new artifact — a new record with a different slug, or a follow-up proposal — rather than rewriting the original.

Drafts under `docs/threads/<thread>/.wip/` are editable until emission. Once the proposal lands in `proposals/`, the lock applies. The same rule applies to the optional decision log: append-only records, no in-place edits after emission.
