---
name: reconcile-spec
description: Make a thread-root spec.md a lossless, additive-free expression of the decisions that govern it — adding omitted decisions, correcting contradictions, removing invented commitments, and queueing anything that needs a fresh human decision; use when a spec should be made faithful to its thread's established intent.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Reconcile Spec

Make the thread-root `spec.md` a faithful, complete expression of the decisions that govern it. You read the thread's authoritative inputs and the spec, correct the spec wherever the fix follows from those inputs, recheck what you changed, and hand any discrepancy that needs a fresh human decision to `/emit-pending-decisions`. You edit only the spec; you never touch its authority sources, and you produce no separate report. Writing the corrected spec is where you stop — do not stage, commit, or push.

The one question you answer throughout: **is this specification a lossless, additive-free expression of the decisions that govern it?** A lossless spec carries every governing decision and adds none of its own.

## Operation

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp.

2. **Load the authority.** Read the thread's `decisions.md` (what has been settled), `seed.md` (why the thread exists), and the relevant upstream artifacts the spec was built from (for example `proposal.md`), plus any artifact the invocation explicitly points you at. These are your authoritative inputs — the standard the spec is measured against. Then read the thread-root `spec.md`, your one editable target. If no `spec.md` exists at the thread root, tell the user there is nothing to reconcile and stop.

3. **Inventory the decisions the spec should carry.** Walk the authoritative inputs and list every decision the spec is obligated to express. Then read the spec against that inventory once, end to end, and locate three kinds of discrepancy:
   - **Omissions** — a governing decision the inventory holds that the spec fails to express.
   - **Contradictions** — a spec statement that conflicts with a settled decision.
   - **Unsupported additions** — a choice, commitment, or constraint the spec invented that no decision, seed, or upstream artifact authorizes.

4. **Correct what the authority settles.** Edit `spec.md` in place for every discrepancy whose fix follows directly from the authoritative inputs: add the substance of each omitted decision, resolve each contradiction toward the settled decision, and remove each unsupported addition the spec invented. **Preserve legitimate elaboration and mechanically derived acceptance criteria** — spec detail that extends the decisions without contradicting them, and acceptance criteria that follow mechanically from a settled decision, are not errors and must survive untouched.

5. **Recheck.** After editing, read the spec against the decision inventory again to confirm each correction holds, no governing decision is still omitted, and no new discrepancy was introduced.

6. **Queue irreducible intent.** Where resolving a discrepancy would require a NEW human decision — the authority does not settle it, and inventing an answer would smuggle in intent the user never made — do not edit the spec to paper over it. Hand the open decision(s) to `/emit-pending-decisions` (see `## Queueing decisions`), and never guess. A genuinely unresolved risk or ambiguity in the spec is itself such a decision, never a silent edit.

7. **Confirm.** Report concisely in chat what you checked, what you corrected, and whether any decisions were queued and where. If the spec already expressed its governing decisions losslessly and added nothing, say so — a clean pass writes no file. No preamble, no closing remark.

## Authority boundary

The spec is the only artifact you may edit. Never edit `decisions.md`, `seed.md`, or an upstream artifact to make the spec appear consistent: if the spec is right and a source is wrong, or two sources conflict, that mismatch is itself a decision a human must make — queue it, do not patch the source. You correct the artifact toward its authority, never the authority toward the artifact.

## Queueing decisions

Hand open decisions to `/emit-pending-decisions` as one coherent bundle, giving it: `/reconcile-spec` as the producer, `spec.md` as the target, the discrepancy and the inputs you weighed as evidence, the open decision(s) it must settle, and a suggested follow-up (settle the decisions, then reconcile the spec again). One invocation queues one bundle; the primitive writes the file and reports its path.

## Nothing else is produced

You have exactly one behavior: reconcile the spec against its authority. You do not emit a review report or a findings file, and you offer no report-only, check-only, or approval variant selectable at invocation. A clean pass leaves the working tree untouched and produces no file — the chat summary is the whole output.
