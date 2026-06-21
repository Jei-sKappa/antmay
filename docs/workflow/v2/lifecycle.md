# V2 Artifact Lifecycle, Immutability, and the Ledger
**Realizes:** §4, §5 (artifact lifecycle, immutability, the freeze model, event sourcing); §7, §15 (the thread lifecycle ledger)

This is the V2 successor to `v1/immutability.md`, substantially expanded. It defines
how artifacts are treated once they exist, how lifecycle status is stored and
derived, when an artifact freezes, and what the thread's own lifecycle ledger holds.
V1 replaced status with folder moves and replaced revision with new version files;
V2 replaces both with **lifecycle-based immutability** and **derived status**.

## Two Artifact Classes, Plus the Ledger

V2 recognizes two artifact classes and one auxiliary file, each with different
physics:

- **Records** — discussions, decision logs, reviews, implementation reports, seeds,
  notes, postmortems. Their *body* is frozen at emission.
- **Versioned artifacts** — proposals, specs, plans. They are *alive while in
  flight* — edited in place — and freeze at their own lifecycle latch, not at
  emission.
- **The lifecycle ledger** — a single append-only file at the thread root carrying
  the only two facts a thread cannot derive from its artifacts: its **tier** and its
  **disposition**.

## Records Are Immutable by Default

A record's body is immutable from the moment of emission, exactly as in V1 — a
follow-up is a **new record**, and append-only logs (a discussion-loop log) may be
appended to but never rewritten.

Records are immutable by default — no agent edits one on its own. The one exception
is that the human owner may authorize an **in-place correction**, which MUST be
visibly marked (an erratum or edit note) so the change is auditable — never silent.
The "don't rewrite history" guarantee holds for content; the one structural
refinement over V1 is that a record's *frontmatter status* is a live surface (see
"Body vs Frontmatter" below).

## Versioned Artifacts Are Alive While in Flight

Proposals, specs, and plans are edited in place — body and frontmatter together —
while in flight, and each freezes at its own lifecycle latch (below), not at
emission. This is the load-bearing change from V1: a spec is revised in place
through review→revise cycles rather than re-emitted as a new version file.

## Lifecycle Status: Stored Latches, Derived Condition

"Status" is two different things, and only one of them is stored.

A **latch** is a non-derivable event with no other home — a human approval, a freeze
event. It is stored write-once, record-backed, stamped, **inside the artifact's YAML
frontmatter `status:` map**. The in-flight **condition** (Draft, In Review,
Approved, Implemented) is *always derived* from the latches present plus the
artifact's open reviews — never stored.

Every latch lives **under the frontmatter `status:` map**, never as a loose
top-level key (see "The Frontmatter Status Contract"):

| Artifact | Frontmatter latches (the only stored status) | Derived condition | Freezes at |
|---|---|---|---|
| **Proposal** | `status.approved` \| `status.rejected` (with stamp) | Draft / In Review | the latch (`approved` or `rejected`) |
| **Spec** | `status.approved`, then `status.implemented` (with stamp) | Draft / In Review / Approved (+ open findings) | the `status.implemented` latch |
| **Plan** | *none* — and **no `version`** | machine adherence verdict | thread close only |

### The Authoritative Condition-Derivation Function

The condition is a pure function of the `status:` map plus undisposed reviews, with
nothing about it stored. Derive it by precedence:

```text
status.implemented present        → Implemented
else status.approved present      → Approved   (+ "has open findings" if an
                                                 undisposed review exists)
else an undisposed review exists  → In Review
else                              → Draft
```

Read linearly, a spec moves Draft → In Review → Approved → Implemented. The condition
is always derived from the `status:` map; it is never written down anywhere.

### Latches Are Sticky

A latch records an event that happened, so it does not revert. When a review opens
during planning, an `approved` spec does **not** fall back to In Review — that state
is the derived condition "Approved + has open findings." New findings do not un-happen
an approval.

### The Plan Carries No Status and No `version`

The plan is the one type with neither a latch nor a `version`. No human approves a
plan — it is a disposable compiler-IR (see `spine.md`); its quality state is the
derived machine-adherence verdict, and it is edited in place (the auto-fix loop)
while the thread is active, freezing only when the thread closes.

### `version` Is a Review-Cycle Counter

`version` counts **completed review→revise cycles**, not edits. `version: 1` is the
first content put up for review; after a review's findings are disposed and the
document is revised in place, it becomes `version: 2`. Editorial fixes never bump it.
Each bump is record-backed by construction — a review plus its disposition is exactly
one cycle. Git holds the fine-grained diffs; `version` is the coarse human milestone.

## The Proposal/Spec Freeze Asymmetry

A proposal freezes at `approved` (or `rejected`); a spec freezes only at
`implemented`. This asymmetry is deliberate.

After a spec is `approved`, downstream stages can still surface spec faults that
route *back and edit the spec* (the plan-adherence review's spec-fault outcomes — see
`spine.md`). So the spec must stay alive `approved`→`implemented`, editable ONLY via
owner-approved, record-backed amendments — that route is the *only* legal
post-approval spec edit (never "edit the spec to match the code"). A proposal has no
such downstream loop: once the direction is `approved` the spec carries it forward,
so the proposal has nothing left to do and freezes at approval.

`rejected` is a real **artifact-level** latch, independent of thread disposition: in
a multi-lineage thread, proposal `001` may be `rejected` while proposal `002` is
`approved` and the thread itself is very much alive.

## Body vs Frontmatter

> **The body obeys immutability; the frontmatter is the status surface.**

- A **record's** body is frozen at emission. Its frontmatter `status:` map is a live
  surface until the record reaches its terminal status (a review: until
  `status.disposed`), then it freezes too.
- A **versioned artifact** keeps body and frontmatter alive together until its latch
  (`status.approved` / `status.implemented`), then both freeze.

The one genuinely new concept is narrow: a record's frontmatter status can be set
(e.g. a review's `disposed`) even though its body is frozen. **Disposition is
set-once** — changing your mind is a new review or a thread reopen, not a frontmatter
flip-flop. Git tracks the lifecycle-bit change.

## The Frontmatter Status Contract

Frontmatter carries **at most two keys**:

1. `version` — the review-cycle counter (identity; versioned artifacts only; plans
   carry none).
2. `status:` — a **map** whose entries are lifecycle event → stamp (plus a review's
   `disposition` and optional `rationale`).

Rules:

- **Lifecycle latches live *inside* the `status:` map** — never as loose top-level
  keys, and never collapsed into a single status *value*. A single value would lose
  the intermediate stamps (e.g. *when* a spec was approved, once it is implemented)
  and would materialize the derived condition, which "derive, don't store" forbids.
- **A record with no lifecycle status of its own carries no frontmatter at all** — a
  seed, a discussion, a decision log, a notes file. Frontmatter appears only where
  there is a latch or a disposition to store.
- **Everything else lives in prose** — references, targets, cross-links, agendas are
  written in the body, never as frontmatter fields.
- **Anything derivable from the artifact's own location is never stored** — its
  thread, its lineage folder, and the derived condition are all read from the path or
  folded from the latches; a stored copy would only drift.

This refines V1's blanket frontmatter ban into a precise carve-out: **lifecycle-status
frontmatter is allowed** (it is the status surface); **source-relation / lineage
frontmatter stays banned** (`Supersedes:`, `Forked from:`, `Alternative to:`, …).
Supersession is a forward-link in prose (see `spine.md`), not metadata.

### Pinned Field Defaults

The **map model** is pinned so every skill agrees: each latch/event nests under
`status:`, not as a loose top-level key, not as a single collapsed value. The exact
YAML spelling/syntax remains free, provided it is applied consistently across the
docs and skills. The intended shape:

```yaml
version: <int>                       # top level; versioned artifacts only

status:
  approved: <YYMMDDHHMMSSZ>          # proposal & spec
  rejected: <YYMMDDHHMMSSZ>          # proposal (terminal alternative to approved)
  implemented: <YYMMDDHHMMSSZ>       # spec only

# a review's status map:
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>  # optional
```

## When an Edit Needs a Backing Record

V1 backed every revision with a new version file. V2 backs the *contract regime*
only — lighter for drafts, more auditable where it counts:

| Stage | Substantive change | Editorial change (typo/formatting, no semantic shift) |
|---|---|---|
| Draft / In Review (pre-`approved`) | no per-edit record — it is *authoring*; git holds the evolution and the feeding discussions justify what goes in | git alone |
| Approved → not yet Implemented | **record-backed + owner-approved amendment** | git alone, **marked** per the owner-correction rule above |
| Implemented | frozen — no edits | frozen |

Before `approved` an artifact is authored, not a contract; there was never a version
to audit. After `approved` it is a human-signed contract, so a *substantive* change
needs its *why* captured and re-approved.

## Status Is Derived, Never Stored — Event Sourcing

The unifying principle behind the inbox removal, the derived condition, and the
two-document model is **event sourcing**: truth is append-only events; current state
is a projection folded from them; you never store a derivable mutable current-state
(that is the drift disease).

V2's events are distributed across the frontmatter `status:`-map latches, the
ledger's events, and the records themselves. Current "state" is computed on demand —
a review with no `status.disposed` field *is* open, by parse; a spec with no
`status.approved` latch *is* Draft / In Review; "what is still open in this thread?"
is answerable by folding what exists.

The following were all considered and **rejected** as places to store derivable
current-state:

- A hand-written **`STATE.md`** per thread — materializes derivable state into a
  second source that drifts.
- A separate **`events.jsonl`** event-log file — would duplicate lifecycle facts the
  specs/plans/records already carry, so it too drifts.
- A materialized **`state.json`** projection — buys nothing today (its only consumer
  is the future status CLI, which folds the projection in memory); merely **deferred**,
  available later if a real need appears.

## The Freeze Model and Its Guard

Two freeze layers, both keyed on explicit *stored* facts (never on a fuzzy derived
value):

1. **Artifact latch** — a spec at `implemented`, or a proposal at
   `approved` / `rejected`, is frozen *even inside an open thread*. This is the window
   the thread freeze misses: a spec hits `implemented` at finish, but the thread can
   stay active afterward for verify / review / follow-ups.
2. **Thread disposition** — the ledger's last event seals the whole thread.

A guard enforces the freeze. Its enforcement rules:

- `closed:` → reject **ALL** diffs (frontmatter and ledger included).
- `deferred` → reject all diffs **EXCEPT** a ledger-only append of `resumed` or
  `deferred` (a reversible pause must keep one door open, or it is a roach motel).
- `resumed` / none → allow everything.

**The guard checks the pre-image:** a diff is rejected only if the thread (or
artifact) was *already* frozen *before* it; the diff that *adds* the `closed:` line or
*sets* a latch is the act of freezing, so it is allowed — no chicken-and-egg.
**Closed-by-mistake is a `git revert`** of the closing commit (a VCS undo, not a
workflow reopen), so `closed` stays cleanly terminal. **Changing a deferred thread's
tier requires a `resumed` first** — the door passes only state events.

**Enforcement is prevention, not detection.** The realistic threat is a
compliant-but-confused agent, which the guard stops *before* the commit. The
content-hash idea (hashing thread contents to detect post-close edits) is rejected —
git already provides tamper-evident history, and prevention beats detection.

**The guard's concrete mechanism (a pre-commit hook, a CI job, or both) is not part
of this build.** These docs specify the rules the guard must enforce; building the
tooling is deferred. Until it is built, V2's immutability/freeze is
**convention-enforced only** — nothing mechanically stops a confused agent from
editing a frozen artifact; because the rules are fully specified, the guard is
buildable whenever the pain is real.

## The Thread Lifecycle Ledger

The ledger answers "where is this thread in its life?" — a question no artifact can
answer, because a thread's *intended* scope (its tier) and its *disposition* (being
worked, paused, or sealed) are not derivable from the artifacts present. Deriving tier
from artifacts is circular and gameable (skip the spec, then "derive" tier-1 from the
spec's absence, and the ceremony vanished with no trace), so tier is stored — it is
the intent that makes absence meaningful ("ledger says tier 2, where is the approved
spec?").

### It Holds Only Tier + Disposition

The ledger holds **only the two non-derivable facts**: tier and disposition. It is
kept minimal by a litmus test applied before any field could ever be added:

> *Can I derive it from the artifacts?* → derive it, don't store it.
> *Is it a PM / coordination fact a stakeholder cares about?* → it belongs to the
> tracker (see `tracker-integration.md`).
> *Neither — and only then?* → the ledger may hold it.

By this test the ledger can only ever hold tier + disposition; the instant it stored a
derivable thing (`spec: approved`, `plan: done`) it would become a drift-prone
`STATE.md`.

### It Is Append-Only

The ledger is append-only with a strict line grammar. The **current value of each key
is its last line** for that key. Append-only means history is preserved and there is
no silent downgrade — you can only *append* a visible, dated, justified line. **Only
transitions are written, never the resting default.**

### Pinned Filename

The ledger is **`ledger.md`** at the thread root. (It is renamed from the provisional
`lifecycle.md` this thread first dogfooded, to free the basename `lifecycle.md` for
this rules doc, `docs/workflow/v2/lifecycle.md`, and remove the
data-file-vs-rules-doc collision.)

### Pinned Line Grammar

Every event line is:

```text
<event> @ <YYMMDDHHMMSSZ> — <justification>
```

where `<event>` is one of:

```text
tier: <0–3>        # updates the `tier` key
deferred           # updates the `disposition` key
resumed            # updates the `disposition` key
closed: done       # updates the `disposition` key
closed: dropped    # updates the `disposition` key
```

Tier lines update the `tier` key; the other four update the `disposition` key. A free
Markdown header above the event lines is permitted — parsers read only
grammar-matching lines. The `— <justification>` is **mandatory on every line**.

Example:

```text
# Lifecycle: <thread subject>

tier: 2 @ 260612174045Z — new pipeline facet; has a design decision
deferred @ 260615090000Z — blocked on an upstream API change
resumed @ 260620100000Z — upstream shipped; resuming
closed: done @ 260625120000Z — spec implemented, verified, ticket closed
```

### Disposition Vocabulary

Only transitions are ever written; the resting default is never recorded:

```text
(none) / resumed → active     (being worked — the resting default; never written)
deferred         → paused     (intentionally on hold; content frozen, reversible)
closed: done     → terminal   (the whole spine finished; sealed, irreversible)
closed: dropped  → terminal   (abandoned; any successor is named in the reason text)
```

- **No `open` event** — `active` is the resting default (folder exists && no
  pause/terminal event); a default is never written.
- **No `implemented` disposition** — implementation is a spine *position* (derived)
  and/or the spec's own latch, never the thread's terminal; removing the word from the
  thread axis means spec-status `implemented` and thread disposition can never collide.
- **No bare `closed`** — every terminal names its reason (`done` / `dropped`), so the
  parse is uniform with no "if absent assume done" branch.
- **No `reopened`** — closed is sealed; the only return-to-life event is `resumed`,
  which applies solely to `deferred`. Resurrecting closed work means opening a **new**
  thread.

### Re-`deferred` Is Permitted

A deferred thread may take **another `deferred` line** (a reason update) without a
`resumed` first — the guard's deferred branch already admits a ledger-only `deferred`
append.

## Companion Docs

- [`./thread-layout.md`](./thread-layout.md) — the thread folder set, lineage folders,
  the `.wip/` draft area, and the ledger's location at the thread root.
- [`./filename-grammar.md`](./filename-grammar.md) — the record and versioned-artifact
  filename forms, the UTC stamp, and the ledger's fixed-name pointer to this doc.
- [`./spine.md`](./spine.md) — the stages that set the latches (the human's
  `approved`, finish's `implemented` + `closed: done`) and the supersession
  forward-link.
- [`./reviews.md`](./reviews.md) — how a review's disposition is recorded in its own
  `status:` map.
- [`./tiers.md`](./tiers.md) — the tier values the ledger stores and the safety rules
  around recording them.
- [`./tracker-integration.md`](./tracker-integration.md) — the three-layer status
  model and why work-item/PM status never lives in the ledger.
