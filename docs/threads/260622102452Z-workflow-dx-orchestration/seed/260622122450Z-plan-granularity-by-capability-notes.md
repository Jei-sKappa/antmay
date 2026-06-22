# Notes: plan granularity (loose vs strict) as a function of implementer capability

A consideration captured for this thread's eventual design work. It is a note, not
a settled decision — it feeds the plan-family / driving-experience design, it does
not pre-decide it.

## The observation

The loose/strict plan split is currently framed as **human-leaning (loose) vs
agent-leaning (strict)**. The maintainer proposed a sharper axis: **implementer
*capability*** — strict for a smaller/dumber model that needs every substep spelled
out, loose for a bigger/frontier/smarter model that can infer the substeps itself.

The supporting argument: a frontier model handed a **loose plan + the spec** can
deliver good work, because *if you had asked it for the strict plan it would have
written those substeps anyway* — so it is plainly capable of doing that same
decomposition at implement time. Strict, for such a model, is largely materializing
inference it would do on the fly.

## Assessment (from the discussion)

**The capability reframe is valid and better than "human vs agent."** Plan
granularity is fundamentally *how much inference is pushed onto the implementer*:
strict pre-computes the decomposition, loose defers it. A more capable implementer
needs less pre-computation, so **loose + spec is the efficient default for a frontier
model**, and the "it would have written the strict plan anyway" logic holds *on
capability*.

**But capability is not the only axis** — and the part it misses is exactly the
property this whole workflow optimizes for. Strict is not *only* a crutch for weak
implementers; it is also a **pre-execution contract**, and that value is independent
of how smart the model is:

- **Reviewability before code exists.** A strict plan's files-modified / verification
  / acceptance fields are what the adherence review checks *before* anything is built.
  Loose + frontier defers gap-discovery to the diff — the first reviewable artifact is
  the code.
- **Determinism / reproducibility.** A frontier model's on-the-fly inference is
  *unpinned* — re-run it (or run a different model) and the substeps may differ. Strict
  pins them, making the build a stable, re-runnable contract — the
  resumable/automatable property the workflow is built around.
- **Captured vs evaporated decomposition.** Loose + frontier does the same inference
  but leaves *no record of it* — it lives in the model's head and is gone, leaving only
  the diff. Strict writes it to disk, auditable.
- **Blast radius.** Even a frontier model on a wide/risky change benefits from a
  pre-reviewed step-by-step; loose-run errors surface only once spread across files.

## The real selector

Not a fixed model→granularity mapping ("smart → loose, dumb → strict"), but a
per-change judgment:

> **capability** (can the implementer infer reliably?) × **do I want the decomposition
> pinned and reviewed before code?** × **blast radius.**

A frontier model makes **loose the efficient default**; reach for **strict even with a
frontier model** when the change is high-risk/wide, when the plan should be audited
before implementation, or when reproducibility matters.

## Tie-in: this is the spec's Degrees of Freedom in another form

Loose-plan + frontier-model = *granting the implementer freedom over the "how."*
Strict = *pinning the hows.* The spec's `## Degrees of freedom` section is where that
freedom is actually declared — so the loose/strict choice should **track the spec's
DoF**: a high-DoF spec → loose is coherent; a locked-down (low-DoF) spec → strict pins
what the spec already constrained.

## Implications for this thread

- The plan-granularity default could be **driven by declared implementer capability +
  change risk**, not chosen blindly — something an orchestrating CLI could even default
  for you (e.g. propose loose for a frontier implementer on a low-risk change, strict
  otherwise), with the spec's DoF as a further input.
- This reinforces the skillrouter angle: granularity (and maybe an implementer-capability
  hint) as a *flag/parameter* on a single plan skill rather than separate loose/strict
  skills.
- Whatever the default, the determinism/reviewability/audit value of strict must not be
  silently traded away for efficiency on high-stakes changes.
