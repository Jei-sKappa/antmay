---
name: reconcile-roadmap
description: Make a thread-root roadmap.md and its decomposition faithful to the decisions that govern the thread — correcting contradictions, adding omitted decisions, removing unsupported commitments, repairing incomplete child briefs, and queueing any decomposition change that alters human intent; use when a roadmap should be brought back in line with its thread's established intent.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Reconcile Roadmap

Make the thread-root `roadmap.md` and its decomposition a faithful expression of the decisions that govern the thread. You read the thread's authoritative inputs and the roadmap, correct the roadmap wherever the fix follows from those inputs, recheck what you changed, and hand any decomposition change that would alter human intent to `/emit-pending-decisions`. You edit only the roadmap; you never touch its authority sources, and you produce no separate report. Writing the corrected roadmap is where you stop — do not stage, commit, or push.

The question you answer throughout: **does this roadmap, and the way it divides the initiative into children, follow from the decisions that govern the thread?** A faithful roadmap carries every governing decision, contradicts none, invents no commitment, and hands off children complete enough to open.

## Operation

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp.

2. **Load the authority.** Read the thread's `decisions.md` (what has been settled), `seed.md` (why the thread exists and its intended outcome), and `proposal.md` when present (the sketched direction the roadmap refines). These are your authoritative inputs — the standard the roadmap is measured against. Then read the thread-root `roadmap.md`, your one editable target. If no `roadmap.md` exists at the thread root, tell the user there is nothing to reconcile and stop.

3. **Inventory what the roadmap must reflect.** Walk the authoritative inputs and list every decision the roadmap and its briefs are obligated to express — the intended outcome, the settled direction, the scope boundaries, the shared constraints. Then read the roadmap against that inventory once, end to end.

4. **Correct what the authority settles.** Edit `roadmap.md` in place for every discrepancy whose fix follows directly from the authoritative inputs:
   - **Omitted decisions** — add the substance of a governing decision the roadmap fails to express.
   - **Contradictions** — resolve a roadmap statement that conflicts with the settled direction or a settled boundary toward the settled decision.
   - **Unsupported commitments** — remove a choice, constraint, or commitment the roadmap invented that no decision, seed, or proposal authorizes.
   - **Incomplete or inconsistent child briefs** — repair a brief that fails the roadmap contract: a missing field; a dependency that names a child without describing the input consumed from it; a `Suggested workflow` left as a bare workflow name (for example `Quick` or `Standard`) where a complete expanded sequence is required. Fill these from what the authority already settles.

   Preserve legitimate elaboration — decomposition detail that extends the decisions without contradicting them is not an error and must survive untouched.

5. **Recheck.** After editing, read the roadmap against the decision inventory again to confirm each correction holds, no governing decision is still omitted, every brief satisfies the contract, and no new discrepancy was introduced.

6. **Queue irreducible intent.** A decomposition change that would alter human intent — splitting or merging children, adding or dropping a child, changing an outcome or boundary the user settled — is not yours to make silently. Where the authority does not settle how the initiative should divide, inventing the answer would smuggle in intent the user never made. Hand the open decision(s) to `/emit-pending-decisions` (see `## Queueing decisions`), and never guess. A genuinely unresolved question about how the work divides is itself such a decision, never a silent edit.

7. **Confirm.** Report concisely in chat what you checked, what you corrected, and whether any decisions were queued and where. If the roadmap already followed its governing decisions and every brief was complete, say so — a clean pass writes no file. No preamble, no closing remark.

## Authority boundary

The roadmap is the only artifact you may edit. Never edit `decisions.md`, `seed.md`, or the proposal to make the roadmap appear consistent: if the roadmap is right and a source is wrong, or two sources conflict, that mismatch is itself a decision a human must make — queue it, do not patch the source. You correct the artifact toward its authority, never the authority toward the artifact.

You do not open, seed, or otherwise materialize the child threads the briefs describe — you only repair the briefs. Leave the thread-root `roadmap-feedback.md` and its records untouched; that channel is not yours to edit.

## Queueing decisions

Hand open decisions to `/emit-pending-decisions` as one coherent bundle, giving it: `/reconcile-roadmap` as the producer, `roadmap.md` as the target, the discrepancy and the inputs you weighed as evidence, the open decision(s) it must settle, and a suggested follow-up (settle the decisions, then reconcile the roadmap again). One invocation queues one bundle; the primitive writes the file and reports its path.

## Nothing else is produced

You have exactly one behavior: reconcile the roadmap against its authority. You do not emit a review report or a findings file, and you offer no report-only, check-only, or approval variant selectable at invocation. A clean pass leaves the working tree untouched and produces no file — the chat summary is the whole output.
