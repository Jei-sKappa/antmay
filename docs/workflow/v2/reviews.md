# V2 Reviews
**Realizes:** §10 (review placement, disposition, the report format, the lossless-mapping review, consistency-with-decision-logs); §13 (the adversarial reviews and the lossless-mapping cadence)

A review is a record that nests under the artifact it serves and records its own
disposition in frontmatter — there is no folder-move lifecycle. V2 also defines the
**lossless-mapping review**, the highest-value new review, which protects the human in
the world where they stop reading plans.

## Placement

A review lands in the **target's `reviews/` folder** (the spec's `reviews/`, the
proposal's `reviews/`, `plans/NNN/reviews/`, `implementation/reviews/`; see
[`./thread-layout.md`](./thread-layout.md)). **There is no open/processed lifecycle** —
no folder moves.

## Disposition via Frontmatter

Disposition is recorded **in the review's own YAML frontmatter, under the `status:`
map**, set once:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>   # optional
```

- A review with **no `status.disposed` field is open**, mechanically, by parse — no
  folder move and no separate record needed.
- **Accept-and-revise** sets the frontmatter directly — the **revision of the target is
  the record.**
- **Reject** sets the frontmatter with **no document at all** — no separate disposing
  record is required.

Disposition is **set-once**: changing your mind is a new review or a thread reopen, not
a frontmatter flip-flop (see [`./lifecycle.md`](./lifecycle.md)). A discussion, if one
happens, is the **optional linked `rationale`**, never the authoritative status (see
[`./discussions.md`](./discussions.md)).

## Report Format — References-First

A review report **opens with a References-first section** that names the artifact under
review **before any verdict**:

```text
References
- <description>: <path>
- <description>: <path>
```

Paths are **within-thread thread-relative, cross-thread repo-relative, never absolute,
and never a bare path list** (each path carries a description). After References, the
report runs:

```text
References → Verdict → Findings → Evidence → Open Questions → Next Actions
```

## The Lossless-Mapping Review

Given **a set of discussions and the document produced from them** (typically a spec),
the lossless-mapping review verifies the mapping is **lossless and additive-free.**

- **The unit is a decision or an assumption — never a sentence.** Restatement,
  organization, derived acceptance criteria, and formatting are **never flagged.**
- **A flaggable item** is document content that **commits to a choice among
  alternatives**, or **presupposes something not established**, that the user **neither
  saw-and-accepted in the discussions nor the document marks a Degree of Freedom.** The
  **DoF section is the pressure valve** — it turns "nagging" into a forcing function
  rather than noise.
- **Two output sections, empty = pass:**
  - **(a)** decisions/assumptions in the document the user **never accepted** (and not
    declared a DoF);
  - **(b)** decisions the user **made** that the document **failed to capture.**

It is the same invariant the spec's authoring constraint enforces from the prevention
side (see [`./spine.md`](./spine.md)).

### Cadence

The lossless-mapping review is a **strong recommendation at tier ≥2**, run **before the
spec is `approved`** (it earns the approval), and is **part of the tier-2 Definition of
Done as a recommendation — not mechanically forced** (see [`./tiers.md`](./tiers.md)).
**On demand otherwise.**

## Consistency-with-Decision-Logs

The **consistency-with-decision-logs check** is part of the **standard spec/proposal
review**: the reviewer confirms the artifact is consistent with the thread's decision
logs, not just internally coherent.

## Adversarial Reviews

**Adversarial reviews — pre-mortem and red-team — are tier-3 stages, run against
approved specs.** They are part of the tier-3 Definition of Done (see
[`./tiers.md`](./tiers.md)).

## Companion Docs

- [`./lifecycle.md`](./lifecycle.md) — the `status:` map, set-once disposition, and
  record immutability.
- [`./discussions.md`](./discussions.md) — the optional `rationale` discussion and why a
  discussion no longer owns disposition.
- [`./spine.md`](./spine.md) — the spec's lossless authoring constraint, the plan
  adherence review, and verify-against-ACs.
- [`./tiers.md`](./tiers.md) — the per-tier Definition of Done that names the code
  review, the lossless-mapping recommendation, and the adversarial reviews.
- [`./thread-layout.md`](./thread-layout.md) — where each `reviews/` folder lives.
