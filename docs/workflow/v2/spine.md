# V2 Spine — the Stages
**Realizes:** §9 (the spine stages, the spec obligations, plan autonomy, the adherence review); §6 (the seed); §5 (supersession as a forward-link)

The spine is V2's end-to-end shape for a unit of work. **Every stage is optional and
tier-gated** (see [`./tiers.md`](./tiers.md)) — only the seed is mandatory, and only at
tier ≥1. The centerpiece is the **spec**: the last artifact the human reads and
approves, written so that the plan can follow mechanically. **Every spine stage is
autonomous by default but steerable** — run a discussion before invoking it, or append a
steering instruction to the invocation.

## The Spine

```text
seed → discussion(s) → [proposal] → spec → plan → implement → verify → finish
```

Every stage is optional/tier-gated. Most work goes seed → discussion → spec → plan →
implement → verify → finish; tier 0 has no thread at all; tier 1 may be seed →
implement → report; tier 3 adds the proposal stage and adversarial reviews.

## Seed

**Mandatory at tier ≥1.** The seed is the thread's genesis record — written once, never
touched again (a **frozen narrative record**). Its format:

```markdown
# Seed: <title>
External: <tracker URL | "none" + why>

<1–5 lines: what triggered this — the idea, the bug, the request>
```

Two lines are mandatory — the title and the `External:` line (the tracker bridge; see
[`./tracker-integration.md`](./tracker-integration.md)) — plus 1–5 lines of trigger
narrative. The **rest of the format is free.** The seed has **no owner field**:
ownership is work-management and belongs to the tracker's assignee; the solo owner is
trivially the user, and an owner field would duplicate the tracker and drift. Tier and
disposition do not live in the seed — they live in the ledger (see
[`./lifecycle.md`](./lifecycle.md)).

### Supersession Is a Forward-Link

When a new thread replaces an old one, the **successor's seed may name what it
replaces, in plain language** — an **optional** convention with **no fixed format or
location.** After many threads you often do not *know* at authoring time that you are
superseding something, so a mandatory structured field would be mostly empty or wrong.
An optional **soft-keyword breadcrumb** — a line starting "Supersedes…" /
"Invalidates…" — is *offered* as a free future-grep aid, **not mandated.** Supersession
is never stored as frontmatter.

## Discussions

Discussions happen anywhere, any time — the connective tissue between user and agent
and the source of historical decisions. Genesis discussions target the seed; later ones
target the artifact they serve. See [`./discussions.md`](./discussions.md).

## Proposal

**Optional, and a tier-3 stage.** The proposal answers **"should we do this, and in
which direction?"** — the pitch/PRD stage that explores the solution space. The seed
answers "what triggered this?"; the spec answers "exactly what are we building?" — so
the proposal does not collide with either. Most work skips it (seed → discussion →
spec). The proposal's lifecycle (latches, freeze at `approved`/`rejected`) is in
[`./lifecycle.md`](./lifecycle.md).

## Spec

The spec is the centerpiece and **the last artifact the human reads and approves.** The
name "spec" is kept — it is the term the spec-driven-development ecosystem converged on;
renaming buys nothing and costs alignment. The spec carries **two new obligations**:

1. **Machine-checkable acceptance criteria for tier ≥2** — the FR/AC + coverage +
   traceability model. It is what makes plan autonomy *safe* rather than hopeful.
2. **A "Degrees of freedom" section** — the *what* is handoff-grade; the explicitly
   listed *hows* are the implementer's free choice. It is what lets an automated
   adherence review distinguish "plan deviated from spec" from "plan chose within
   granted freedom."

### The Lossless Authoring Constraint

The spec must commit to **no decision or assumption** the user did not see and accept in
the discussions **unless the spec explicitly marks it a Degree of Freedom.** The unit of
this bar is **a decision or an assumption — never a sentence**: a spec freely elaborates
discussed decisions into prose, structure, and derived acceptance criteria. The writer's
escape for any specific they do not want to pin down is to **discuss it or mark it a
DoF.** This is the prevention side of the lossless-mapping review (see
[`./reviews.md`](./reviews.md)).

## Plan

The plan is derived from the spec. **Plan autonomy is V2's recommended default, not a
law.** When the spec carries machine-checkable ACs and a Degrees-of-freedom section, the
plan follows mechanically — so the plan skills can produce it and a machine adherence
review can clear it **without the human ever reading it.** Those two spec preconditions
are what make that *safe*. **Human-in-the-loop planning stays supported** — run a
discussion before planning, or append a steering instruction to the invocation; autonomy
is a default, not a rule forced on a second user.

### The Plan Is a Disposable Compiler-IR

The plan is a **disposable intermediate — a compiler IR.** The **spec plus its
acceptance criteria are the contract.** This is exactly why the plan **carries no stored
status** (and no `version`): nothing about a plan needs auditing, because the spec it
compiles is the audited artifact (see [`./lifecycle.md`](./lifecycle.md)).

### The Plan Adherence Review (Four Outcomes)

The plan adherence review is **mode-agnostic** — it checks plan-against-spec however the
plan was authored — and **honors the spec's Degrees-of-freedom section** (to tell
"deviated" apart from "chose within granted freedom"). It has four outcomes:

1. **Plan adheres** → implement.
2. **Plan deviates from spec** → auto-fix, loop until adherent.
3. **Plan deviates because the spec is ambiguous / incomplete.**
4. **Plan is ambiguous because the spec is ambiguous.**

Outcomes 3 and 4 are **spec faults**: they **route to the human and fix the spec —
never patch the plan.** (Whether 3 and 4 are reported as one outcome or two is a degree
of freedom.) Fixing the spec is the only legal post-approval spec edit, via an
owner-approved, record-backed amendment (see [`./lifecycle.md`](./lifecycle.md)).

## Implement

Every implementation run emits an **implementation report** (a record, immutable; the
industry analog is the PR description) capturing:

- deviations from the plan, with justification;
- surprises;
- problems hit;
- follow-ups.

**Follow-ups route to seeds of future threads** or — in tier-3 phased work — to **the
next phase's discussion** (the roadmap is a living list inside the open thread, not a
frozen contract; phases may welcome or defer the follow-ups appended to them). The
report lands flat in `implementation/` (see [`./thread-layout.md`](./thread-layout.md)).

## Verify

The implementation is checked against the **spec's acceptance criteria — not against the
plan.** The human may review the implementation (their choice); **they never need to
review the plan.** See [`./reviews.md`](./reviews.md).

## Finish

The finish stage, in one action:

- **updates the living docs** (the two-document model: to change how the system works,
  update the living docs — never an `implemented` spec);
- **sets the spec's `status.implemented` latch** (the human's earlier approval already
  set `status.approved`);
- **appends `closed: done` to the ledger** (`ledger.md`, in the pinned line grammar);
- **closes the ticket** — the single terminal handshake (see
  [`./tracker-integration.md`](./tracker-integration.md)), **ensuring the linked ticket
  carries the one permalink backlink comment**, posting it now if `open-thread` did not.

The **freeze guard is active from that commit forward.** The guard never *sets* status —
it only reads the latches and the ledger to enforce the freeze (see
[`./lifecycle.md`](./lifecycle.md)).

## Companion Docs

- [`./tiers.md`](./tiers.md) — which stages each tier requires; the Definition of Done.
- [`./lifecycle.md`](./lifecycle.md) — the latches the spec/proposal carry, why the plan
  has none, the freeze model, and the ledger.
- [`./discussions.md`](./discussions.md) — the discussion conventions for every stage.
- [`./reviews.md`](./reviews.md) — the spec review, the lossless-mapping review, the
  plan adherence review, verify, and the tier-3 adversarial reviews.
- [`./tracker-integration.md`](./tracker-integration.md) — the seed's `External:` line,
  the backlink, and the finish handshake.
