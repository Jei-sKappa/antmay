---
name: reconcile-proposal
description: Align a thread-root proposal.md with the decisions that govern it — correcting supported discrepancies in place and queueing anything that needs a fresh human decision; use when a proposal should be made faithful to its thread's established intent.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.1.0
---

# Reconcile Proposal

Make the thread-root `proposal.md` faithfully reflect the decisions that govern it. You read the thread's authoritative inputs and the proposal, correct the proposal wherever the fix follows from those inputs, recheck what you changed, and hand any discrepancy that needs a fresh human decision to `/emit-pending-decisions`. You edit only the proposal; you never touch its authority sources, and you produce no separate report. Writing the corrected proposal is where you stop — do not stage, commit, or push.

## Procedure

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. Two situations make a pending bundle physically impossible — `.pending-decisions/` would live inside the very thread that failed to resolve — so in both, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>`: no thread exists yet, or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp).

2. **Load the authority.** Read the thread's `seed.md` (why the thread exists) and `decisions.md` (what has been settled), plus any artifact the invocation explicitly points you at. These are your authoritative inputs — the standard the proposal is measured against. Then read the thread-root `proposal.md`, your one editable target. If no `proposal.md` exists at the thread root, tell the user there is nothing to reconcile, write nothing, and end with `Outcome: REFUSED — no proposal.md to reconcile`.

3. **Find the discrepancies.** Read the proposal against the authority once, end to end, and identify where they disagree:
   - **Omissions** — a settled decision the proposal should reflect but does not.
   - **Contradictions** — a proposal statement that conflicts with a settled decision.
   - **Unsupported additions** — a commitment, direction, or constraint the proposal asserts that neither the seed nor any decision authorizes.

4. **Correct what the authority settles.** Edit `proposal.md` in place for every discrepancy whose fix follows directly from the authoritative inputs: fold in the omitted decision's substance, resolve the contradiction toward the settled decision, and remove or walk back the unsupported addition. Preserve legitimate elaboration — proposal detail that extends the decisions without contradicting them is not an error.

5. **Recheck.** After editing, read the proposal against the authority again to confirm each correction holds and introduced no new discrepancy.

6. **Queue irreducible intent.** Where resolving a discrepancy would require a NEW human decision — the authority does not settle it, and inventing an answer would smuggle in intent the user never made — do not edit the proposal to paper over it. Hand the open decision(s) to `/emit-pending-decisions` (see `## Queueing decisions`). A genuinely unresolved risk or ambiguity in the proposal is itself such a decision, never a silent edit.

7. **Confirm.** Report concisely in chat what you checked, what you corrected, and whether any decisions were queued and where. If the proposal already agreed with the authority, say so — a clean pass writes no file. No preamble, no closing remark. End with the standard terminal line: `Outcome: BLOCKED — pending decisions at <bundle path>` when a decision was queued per `## Queueing decisions`, otherwise `Outcome: DONE — <one-line summary of what was reconciled>`.

## Authority boundary

The proposal is the only artifact you may edit. Never edit `decisions.md` or `seed.md` to make the proposal look consistent: if the proposal is right and a source is wrong, or two sources conflict, that mismatch is itself a decision a human must make — queue it, do not patch the source. You correct the artifact toward its authority, never the authority toward the artifact.

## Queueing decisions

Hand open decisions to `/emit-pending-decisions` as one coherent bundle, giving it: `/reconcile-proposal` as the producer, `proposal.md` as the target, the discrepancy and the inputs you weighed as evidence, the originating user request, the open decision(s) it must settle, and a suggested follow-up (settle the decisions, then reconcile the proposal again). One invocation queues one bundle; the primitive writes the file and reports its path, and the run ends `Outcome: BLOCKED — pending decisions at <bundle path>`.

## Nothing else is produced

You have exactly one behavior: reconcile the proposal against its authority. You do not emit a review report or a findings file, and you offer no report-only, check-only, or approval variant selectable at invocation. A clean pass leaves the working tree untouched and produces no file — the chat summary is the whole output.
