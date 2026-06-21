# V2 Tiers, Definition of Done, and Preflight
**Realizes:** §7 (the tier system); §13 (Definition of Done, PR discipline, prerequisite preflight)

Large organizations do not run every change through the full process; they have
thresholds. V2 makes the threshold explicit: **the agent chooses a tier and the user
confirms it**, replacing V1's implicit "every change deserves the full spine"
assumption. The tier is recorded in the thread's ledger and scales the required
artifacts and quality gates.

## The Four Tiers

| Tier | Entry criteria | Required artifacts |
|---|---|---|
| **0 — chore** | no behavior change; reversible in one commit | **none** — the commit message is the record |
| **1 — patch** | small fix/feature; low blast radius; no open design question | thread: seed + ledger + implementation report; a discussion only if a decision actually arises |
| **2 — feature** | anything with a design decision (**the default**) | seed → discussion(s) → spec (reviewed, **approved**) → plan → implement → implementation report + code review |
| **3 — initiative** | multi-week, architectural, or hard to reverse | tier 2 + a proposal stage + adversarial reviews (pre-mortem) + a phased roadmap |

Examples: tier 0 — a typo, a comment, formatting, a local rename; tier 1 — a one-line
default fix; tier 2 — a new pipeline facet; tier 3 — a full rewrite.

## Tier Numbers Are Normative; Names Are Suggestions

The **tier numbers (0–3) are normative** — skills, the ledger, and any future CI gate
key off the number. The **names** (chore / patch / feature / initiative) are
**suggestions** for human legibility; a project may relabel them without changing the
contract.

## Three Safety Rules

These keep tiers a calibration tool rather than a loophole:

1. **The tier is recorded in the ledger with a one-line justification** — auditable,
   and an agent cannot silently downgrade, because the ledger is append-only (see
   [`./lifecycle.md`](./lifecycle.md)).
2. **Escalation and de-escalation are both cheap, explicit, and symmetric.** A tier-1
   that surfaces a real decision mid-flight stops, the ledger gains a dated, justified
   `tier:` line, and the spec stage begins; a downgrade is the same — a dated, justified
   appended `tier:` line. The visibility is the whole point.
3. **Quality gates scale with tier** (see Definition of Done below): tier 0 needs green
   CI; tier 3 needs an adversarial review pass.

## Tier 0 Leaves No Trace Beyond the Commit

Tier 0 is genuine no-ops. It leaves **no thread and no ledger** — this repo uses
Conventional Commits, so the commit `type(scope)` is the lightweight mineable record;
adding a thread or ledger to tier 0 would defeat its purpose. Build heavier mining only
if it ever becomes painful.

A **behavior-changing dependency bump is tier 1, not tier 0** — the "reversible in one
commit, no behavior change" bar is strict.

## Definition of Done per Tier

Each tier's DoD is cumulative:

- **Tier 0** — green CI.
- **Tier 1** — green CI **+** an implementation report.
- **Tier 2** — the above **+** an approved spec, acceptance-criteria coverage, and a
  code review. A **lossless-mapping review** is a **recommendation** before the spec is
  approved (see [`./reviews.md`](./reviews.md)) — recommended, not mechanically forced.
- **Tier 3** — the above **+** an adversarial review pass (pre-mortem / red-team).

## PR Discipline, Scaled by Tier

PR discipline is a **strong recommendation, not a forced rule**:

- **Tier 0** — none (no thread; the commit is the record).
- **Tier 1** — recommended.
- **Tier ≥2** — strongly recommended (it is where code review and AC-coverage
  verification live — the tier-2 DoD).

The "even solo" spirit holds: do not skip the PR at the tiers where review matters just
because you are working alone. **CI enforcement is a deferred option** — a CI check that
reads the thread's tier from the ledger and blocks an unreviewed tier-≥2 merge — not
built here; V2 ships the recommendation and leaves the gate for when the pain proves
real. (This is a second consumer of the stored tier: a *derived* tier could gate
nothing.)

## Prerequisite Preflight

A skill whose instructions require a **binary or a sibling skill** checks the
prerequisite's availability **first** and **fails the whole instruction with a clear
warning** when the prerequisite is missing — it never runs until something breaks
mid-flight. Preflight comes before any side-effecting step.

The first concrete application is `open-ticket`, which needs the tracker's CLI/API: it
checks the tool is available up front and fails cleanly with a clear warning if it is
not, rather than partially creating state and then erroring.

## Companion Docs

- [`./lifecycle.md`](./lifecycle.md) — the ledger that stores the tier and the
  append-only `tier:` line grammar.
- [`./reviews.md`](./reviews.md) — the code review, adversarial reviews, and the
  lossless-mapping review named in the Definition of Done.
- [`./spine.md`](./spine.md) — the stages the tiers gate.
- [`./tracker-integration.md`](./tracker-integration.md) — the tracker dependency that
  makes `open-ticket` a preflight case.
