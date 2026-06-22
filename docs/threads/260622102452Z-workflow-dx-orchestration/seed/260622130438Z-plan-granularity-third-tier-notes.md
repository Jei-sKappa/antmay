# Notes: a third, max-prescription plan granularity tier (and "granularity is a dial, not N skills")

Extends the sibling note `260622122450Z-plan-granularity-by-capability-notes.md`.
A consideration for this thread's plan-family design — captured, not decided.

## The idea

Add a **third granularity level, more prescriptive than the current strict** —
matching the maintainer's old reference plan prompt (`temp/plan.md`): complete
**inline code per step**, a **TDD micro-step cycle** (write failing test → run →
implement → run → commit), **commit steps**, exact commands with expected output,
and a hard "no placeholders" rule. Used when implementation is handed to a
**known-small-and-dumb model that needs full hand-holding**.

That yields a three-level ladder over implementer capability:

- **loose** — prose tasks (1–3 sentences); a frontier/capable implementer infers
  the rest.
- **strict (current)** — six fields, prescriptive substeps, *describe the action,
  don't write the code* (code only when load-bearing); an agent-leaning implementer.
- **ultra-strict / verbose (new)** — max prescription: the code itself is in the
  plan; a weak implementer transcribes rather than authors.

## Why it earns its place — and the real framing

The current "strict" is *describe-don't-code*, which assumes the implementer can
write good code from a clear description. That assumption **fails for a genuinely
weak model** — so a more-prescriptive tier is a real, distinct need, not a
duplicate. It is literally the maintainer's proven old reference.

The sharper framing: **ultra-strict is a division-of-labor / economic play, not
merely "for dumb models."** When the plan carries the actual code, the *planner*
(a capable, expensive model) does the authoring and the *implementer* (a
cheap/weak model, or a fleet) just transcribes. So the tier's real justification is
**plan once with the smart model, execute cheaply** — and it doubles as a
**reviewable artifact**: the code can be reviewed in the plan *before* the cheap
executors run it. That clarifies *when* to reach for it (an expensive-plan /
cheap-execute split), beyond "the implementer is weak."

## Reframe: three levels on a dial, not "every scenario"

"Three variants capture basically any implementation scenario" slightly overstates
it. Capability is **one** axis; granularity is also pulled by
**determinism/reviewability/blast-radius** (a high-risk change with a frontier
implementer might still want maximum prescription for a pre-reviewable, reproducible
plan). So this is best understood as **three useful levels on the prescriptiveness
dial** — likely enough in practice, but not a complete partition of all scenarios.

## The design question this sharpens (the one that matters)

A third level means **3 granularity levels × 2 modes (auto/interactive) = up to six
near-duplicate plan-authoring skills**, and the names are already straining
("stricter than strict"). That awkwardness is the tell: **granularity is
fundamentally a *parameter*, not N separate skills.** This is the skillrouter
direction — `plan-auto --granularity loose | strict | verbose` rather than six
files.

So the item to carry forward is **not** "add a third plan skill"; it is:

- treat plan **granularity as a dial** with (provisionally) three levels —
  loose / strict / verbose;
- decide **skill-vs-parameter** packaging (near-term, pre-skillrouter, levels are
  separate SKILL.md files; the target is a `--granularity` flag on one skill);
- avoid hand-authoring a third near-duplicate skill *now* if it just grows the
  surface skillrouter will later unify — unless the verbose level is needed before
  the flag mechanism exists.

## Relationship

Builds directly on the loose/strict-by-capability note in this thread, and on this
thread's idea that an orchestrator could **default the granularity from declared
implementer capability + change risk**. It is a concrete candidate use of the
**skillrouter variant-unification** follow-up recorded in the
`docs/threads/260612174045Z-agentic-workflow-v2/` implementation report. If the
plan-family redesign grows into its own effort, this plus the capability note are
its seed.
