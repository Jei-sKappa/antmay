# Seed: Lighten the developer experience of driving the workflow — orchestrate the spine, surface only the human gates

External: none — personal skills repo; no tracker ticket.

## What triggered this

While dogfooding the workflow on a real spec, the maintainer noticed that the
full tier-≥2 / tier-3 path is **heavy to drive by hand**. Walking it manually,
the ceiling sequence looks like:

```
open-thread
→ discuss the seed
→ (proposal skipped)
→ spec-auto
→ review-lossless-mapping → [discuss findings + revise spec]
→ review-spec            → [discuss findings + revise spec]
→ record-verdict: approve the spec
→ plan
→ review-plan → [fix plan / route spec faults]
→ implement
→ review-implementation
→ finish
```

That is ~15 discrete skill invocations for one feature, and it *feels* like a
lot of manual ceremony. The maintainer asked: **can we improve the
User/Developer experience of driving this flow** — without giving up the
properties the flow exists for?

## The goals that MUST be preserved

This thread is explicitly NOT about throwing away the structure. The flow must
keep:

1. **Organized like a company** — explicit, reviewable artifacts on disk; a real
   audit trail.
2. **Deterministic resume + "what's next"** — a future CLI must be able to tell
   you, per thread, *what to do now*, *what's next*, and *whether it's closed* —
   computed deterministically from the artifacts + ledger, not guessed.
3. **Automatable** — parts of the process should be safely automatable.

Any UX improvement is constrained by these three.

## What was proposed in the triggering discussion

### Reframe — a large share of the perceived heaviness is a misread

- **You approve the spec ONCE, not after each review.** The reviews run on the
  *Draft*; you dispose their findings and revise in place; `record-verdict →
  approve` happens a single time, at the end of the spec stage. (The triggering
  list mistakenly had "approve" three times.) Reviews are *disposed*; the spec is
  *approved* — different acts.
- **A clean review is a no-op — there is no gate.** If a review comes back with
  no findings, there is nothing to discuss or dispose (a clean interactive review
  doesn't even emit a record). The "review → discuss → dispose" overhead only
  materializes *when a review actually finds something* — which is real work, not
  ceremony.
- **The listed sequence is the CEILING, not the default.** Every stage is
  optional and tier-gated. A tier-1 fix is `open-thread → implement → finish`. A
  clear tier-2 feature can skip the seed discussion (go straight to `spec-auto`
  from the seed) and run a single review.

### The genuine human gates are few

Stripped to the genuinely human decision points, a clean tier-2 run is roughly:

- decide the discussion points — *only if the idea needs clarifying*;
- **approve the spec** — 1 act;
- dispose review findings — *only when a review finds something*;
- route plan/spec-fault outcomes — *only when `review-plan` surfaces a spec
  problem*;
- **finish** — 1 act.

Everything else — `spec-auto`, the reviews themselves, `plan-auto`,
`review-plan`, `implement`, `review-implementation` — is **machine work**. For a
clean run the irreducible human ceremony is roughly *approve + finish*. The flow
is therefore **heavy with machine steps currently invoked by hand, not with
human gates.** That distinction is the crux of this thread.

### Primary lever — a CLI / orchestrator over the toolbox

The biggest win, and the one that fits the "resume / what's-next / automate"
goal directly: a CLI (with `whats-next` as its precursor) that acts as an
**orchestrator over the toolbox of skills**:

- reads the ledger + artifacts and computes the next step deterministically;
- **runs the machine steps back-to-back** (`spec-auto` → `review-lossless` →
  `review-spec` → `plan-auto` → `review-plan` → `implement` →
  `review-implementation`);
- **pauses only at a human gate** — a discussion decision, the single spec
  approval, a non-empty review's findings, a plan-review spec-fault;
- **auto-passes clean reviews** — you never see a review that found nothing.

So the *experience* becomes: `next → [machine runs several steps] → "here's a
decision for you" → you decide → next → …`. A 15-artifact flow then *feels* like
3–4 touches. The heaviness is the absence of this orchestration layer, not the
flow itself. This belongs in the CLI layer (the workflow stays a toolbox of
independent skills; the CLI orchestrates over them), and it is the
highest-leverage thing to build.

### Optional design tweaks (smaller wins)

- **A combined spec-review entry point** — run the fidelity review and the
  quality review, merge their findings, dispose once, instead of two cycles.
  Preference: have the **CLI chain the two skills** (run both, merge findings,
  one disposition pass) rather than merging the two skills into one — keep the
  clean fidelity-vs-quality separation at the skill level.
- **Make tier-gating loud** — have `whats-next` state the tier's *expected* path
  and visibly mark optional stages, so the flow shrinks at low tiers instead of
  always looking maximal.
- **Auto-dispose clean reviews** — an explicit rule that a review with empty
  findings needs no `record-verdict`, so tooling never prompts for a pass.

### The honest constraint

You cannot have *both* "deterministic, resumable, company-grade audit trail" and
"no artifacts" — **the artifacts ARE the determinism.** So the win is NOT fewer
artifacts; it is **fewer manual touches to produce them.** Tier-gating shrinks
*which* artifacts exist; the CLI/orchestrator shrinks *how much you do by hand*.
Together they turn the ceiling path into a few decisions plus a lot of invisible
machine work.

## Candidate directions (captured, not yet decided)

- An orchestrating CLI / `whats-next` evolution: a deterministic "run until the
  next human gate" loop over the toolbox.
- A precise definition of the **human-gate set** (the only points the
  orchestrator pauses at) vs the machine steps it runs unattended.
- Auto-pass / auto-dispose rules for clean reviews.
- Loud tier-gating in the navigation/what's-next surface.
- A combined (chained) spec-review pass.
- How far automation may safely go before a human gate (especially around the
  human-gated spec approval and finding dispositions).

## Relationship to prior work

This thread **improves and extends** the workflow defined in
`docs/threads/260612174045Z-agentic-workflow-v2/` — it does not supersede it. It
directly picks up deferred follow-ups recorded in that thread's implementation
report, notably the **`whats-next` CLI / `state.json` projection** and the
**skillrouter variant unification**, and reframes them around the developer
experience of *driving* the spine.
