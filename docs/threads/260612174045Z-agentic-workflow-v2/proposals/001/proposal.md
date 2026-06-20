---
version: 2
approved: 260620152152Z
---

# Modular Agentic Workflow V2 — Proposal

This proposal defines Workflow V2: a revision of the V1 conventions
(`docs/workflow/v1/`) covering the thread layout, artifact lifecycle and
immutability, the relationship between threads and living documentation, process
tiers, remote-tracker integration, the spine stages, and the skill changes all of
this implies. Nothing in it is invented: every position traces to the two
consultation sessions of 2026-06-12, the maintainer's `TODO.md`, or the
`appaltiav2` pilot thread — the traceability map is §17.

This document dogfoods its own rules. Its lifecycle status lives as latches in the
YAML frontmatter above (§4): the `approved` latch is set (`260620152152Z`), so its condition derives to
**Approved** (and the document is now frozen, §4). It lives in a lineage folder (§3), declares its degrees of freedom
(§15), and stays alive — edited in place — until its approval latch is set, at
which point it freezes (§4). The frontmatter `version` counts completed
review→revise cycles (§4): `version: 2` is this document after its first review and
the discussion loop that disposed every finding.

---

## 1. Summary

V2 makes six changes to V1, each correcting a rule that lost contact with
practice:

1. **Immutability becomes a function of lifecycle status, not of emission.** A
   record's *body* stays immutable forever; only its lifecycle status — carried in
   YAML frontmatter — updates, until the record reaches its terminal state and
   freezes whole. Versioned artifacts (proposals, specs, plans) are *alive* while
   in flight — edited in place — and *freeze at their lifecycle latch*: a proposal
   at `approved`/`rejected`, a spec at `implemented`, a plan when its thread closes.
2. **Records attach to their target.** Reviews and discussions nest inside the
   spine artifact they serve, instead of sibling type-folders that hide the
   relationships.
3. **Status is derived, never stored — the workflow is event-sourced.** The inbox
   (open/processed/dropped) is deleted; a review with no disposition *is* open, by
   definition. The one fact a thread cannot derive from its own artifacts — its
   tier and its disposition (active/paused/closed) — lives in a single append-only
   **thread lifecycle ledger** at the thread root; everything else is a projection
   folded from the artifacts. Work-item status lives in exactly one external
   tracker, linked from the seed.
4. **Every thread starts from a seed.** A mandatory genesis record — a few lines
   naming what triggered the thread and its external ticket (if any). Tier and
   disposition live in the ledger beside it, not in the seed.
5. **Process is tiered.** Four tiers (chore → patch → feature → initiative) with
   explicit entry criteria, declared in the ledger, replacing the implicit "every
   change deserves the full spine" assumption.
6. **The spec is the recommended last human-approved artifact.** Plan autonomy is
   V2's *recommended default*, not a law: when the spec carries machine-checkable
   acceptance criteria and an explicit degrees-of-freedom section, the plan follows
   mechanically and a machine adherence review can clear it without the human
   reading it. Human-in-the-loop planning stays a supported option.

## 2. Evidence — why V1 needs revision

**The `EXAMPLE-WORKFLOW/` folder is a patch list for V1.** (It lives untracked in
the external `appaltiav2` workspace, not this repo — quoted here as evidence; its
retirement is scoped to that workspace, §16.) Each file in it overrides a
convention that practice rejected:

- `04-fix-spec-after-discussing-review-findings.md` says *"Please update it in
  place"* — a direct, deliberate violation of D39–D41 (emitted-artifact
  immutability), repeated by the maintainer on every revision round because new
  version files would have broken every cross-reference and duplicated a
  ~1000-line document per round.
- `03-discuss-review-findings.md` overrides the discussion skill's output path
  (`docs/discussions/` → the thread's `discussions/`) — the skill predates the
  thread convention and was never reconciled.
- `02-review-spec.md` appends "check it is correct relative to the discussions" —
  the eight-element handoff bar does not include consistency-with-decision-logs,
  which practice showed is the check that matters most.
- The `appaltiav2` thread moved review reports out of `inbox/open/` into a
  `reviews/` folder — violating D107 — because the open→processed folder move
  invalidates links.

**The `appaltiav2` v2-design pilot** (three discussion logs, two review reports,
one spec revised in place through v2 → v2.1 → v2.2, all under one thread) is the
largest live test of these conventions. The practices that *worked* there —
in-place revision driven by append-only decision logs, reviews disposed by their
own status rather than folder moves, derived status — are the practices V2
canonizes. It also exposed two drift bugs V2's skills must prevent: discussion
logs named `2026-06-10-…` instead of the stamp grammar, and a spec at
`specs/spec.md` with no lineage folder.

**The diagnosis in one sentence:** V1's two load-bearing mistakes are file-level
immutability (which pushed mutability into folder moves and broke links) and
status-by-folder (the same mistake from the other side); V2 replaces both with
lifecycle-based immutability and derived status.

## 3. Thread layout

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── <lifecycle-ledger>                        # thread root — append-only tier + disposition (§4)
├── seed/                                     # genesis bucket (§6)
│   ├── <UTC>-<desc>-seed.md                  # exactly one — frozen genesis narrative
│   ├── <UTC>-<desc>-notes.md                 # optional — genesis source material
│   └── discussions/                          # pre-artifact discussions target the seed
├── proposals/
│   └── NNN[-<desc>]/                         # lineage folder — the stable link target
│       ├── proposal.md
│       ├── discussions/
│       └── reviews/
├── specs/
│   └── NNN[-<desc>]/
│       ├── spec.md                           # alive until Implemented (§4)
│       ├── discussions/
│       └── reviews/
├── plans/
│   └── NNN[-<desc>]/
│       ├── plan.md                           # alive until the thread closes; no stored status (§4)
│       └── reviews/                          # machine adherence reviews (§9)
├── implementation/                           # records-only spine node
│   ├── <UTC>-<desc>-implementation-report.md
│   ├── discussions/
│   └── reviews/                              # code reviews, verifications
└── .wip/                                     # gitignored, editable drafts — variant bake-offs live here
```

**Lineage folders are named `NNN[-<desc>]/`** — a mandatory zero-padded 3-digit
sequence number starting at `001`, plus an optional kebab slug added only when it
distinguishes one lineage from another. The number is the stable identifier; the
full path is the unit of reference (`proposal.md` / `spec.md` / `plan.md` are
meaningless bare, by design — the path already carries the type via the parent
folder and the subject via the thread slug). A type suffix on the folder or a
mandatory descriptor would defend a property the lineage model gave up, so both
are dropped. The optional slug keeps multi-lineage threads legible
(`specs/001-api/`, `specs/002-cli/`); adding a slug to a later lineage never
renames an earlier one, so links stay stable; numbered folders sort in creation
order. `v1/` / `v2/` folder names were rejected outright — "v" reads as *version*,
and under V2 versions live in frontmatter; a second lineage is a different
artifact, not a revision, and `vN` folders would resurrect at folder level the
exact confusion V2 removes at file level.

**Records attach to the spine node they serve, never to other records.** A review
of the spec → the spec's `reviews/`. A discussion *of that review* → still the
spec's `discussions/` (it serves the spec; its relationship to the review lives in
its body and filename). Targets form a graph, not a tree — forcing deeper nesting
would mean re-litigating "which parent" forever, so nesting is capped at this one
level by rule.

**Multiple lineages are not variants — keep the two apart.** *Multiple lineages*
are different subjects you intend to keep (an API spec **and** a CLI spec) → they
get sibling `NNN[-<desc>]/` folders. *Variants / candidates* are competing drafts
of **one** subject meant to collapse to a single winner (the multi-model bake-off:
opus vs sonnet vs codex drafting the same spec) → they are pre-emission draft work
and live in `.wip/` (gitignored, editable), never as emitted siblings. Spin up the
candidates in `.wip/`, compare, and emit only the chosen-or-merged result once as
`specs/NNN/spec.md`; the losing drafts vanish from the reviewable record by design,
and a decision log records why the winner won. The invariant stays clean: **one
subject = one lineage folder = exactly one canonical artifact**, competing drafts
never pollute the emitted record.

**Lifecycle status lives in YAML frontmatter — the sole place it is stored** (§4).
Its *status* fields hold *only* non-derivable latches and events (a human approval,
a freeze, a disposition), never the derived condition. A record or artifact with no
lifecycle status of its own (a seed, a discussion, a decision log) carries **no
frontmatter at all**; the one non-status field frontmatter may carry is `version`
(the review-cycle counter, on versioned artifacts). Everything else — references,
targets, cross-links, agendas — lives in **prose**, never frontmatter; and anything
**derivable from an artifact's own location** (its thread, its lineage folder) is
never stored, because the path already carries it and a stored copy would only
drift. This refines V1's
blanket frontmatter ban (D44) into a precise carve-out: **lifecycle-status
frontmatter is allowed** (it is the status surface); **source-relation / lineage
frontmatter stays banned** (`Supersedes:`, `Forked from:`, …) — supersession is a
forward-link in prose (§5), not metadata.

**One timestamp standard.** Every timestamp — in a filename or in frontmatter —
uses the `YYMMDDHHMMSSZ` UTC stamp grammar, and always marks an *event* (a record's
creation = its filename stamp; a latch = its frontmatter stamp). There are no
extended-format dates and no standalone creation-date fields: a versioned
artifact's creation *order* is its `NNN` lineage number and its precise time is git.

**Path references.** Within-thread references are written **relative to the thread
root** (`proposals/001/discussions/…`), never from the repo root and never absolute
— so a thread can be moved or archived without breaking its internal links.
Cross-thread and external references are **repo-relative** (`docs/threads/<other>/…`,
`docs/workflow/v1/…`).

**Filename grammar — two forms:**

- **Versioned artifacts** (proposal / spec / plan) carry NO stamp and NO `v<N>` in
  the filename. The file is `<type>.md` inside its lineage folder. The folder `NNN`
  is the stable identifier; the version lives in frontmatter (`version`; plans
  carry none, §4). The entire V1 `v<N>[-descriptor]` filename machinery is removed.
- **Records** (discussion / decision-log / review / seed / implementation-report /
  notes) are unchanged from V1: `<YYMMDDHHMMSSZ>-<kebab-desc>-<artifact-type>.md`,
  the UTC stamp and the mandatory type token both preserved (the type token is what
  keeps grep useful once files nest).
- **The lifecycle ledger** (§4) is a fixed-name append-only file at the thread
  root; its exact filename is a degree of freedom (§15).

**Artifact-type token vocabulary:** keep `proposal`, `spec`, `plan` (now the whole
short filename `<token>.md`), `discussion`, `decision-log`; add `seed`, `review`
(replacing V1's `review-finding`), `implementation-report`, `notes`; remove
`inbox-item` (the inbox is gone, §5) and `review-finding`. The list stays
documented-but-not-exhaustive; a new token is declared by the skill that owns it.

**Ambiguous-reference resolution shrinks (V1's D49 successor).** V1's "ask the
user; no 'latest' algorithm" rule existed mostly to resolve *which version or
variant is current*. V2 structurally removes that question: there is one alive
`<type>.md` per lineage with its version in frontmatter, and variants are `.wip/`
drafts of which only the winner is emitted. What still genuinely requires asking:
multiple lineages of one type in a thread (`specs/001-api/` vs `specs/002-cli/`) —
"the spec" is then ambiguous — and cross-thread references.

**Unchanged from V1:** the UTC stamp grammar `YYMMDDHHMMSSZ` on record filenames;
the mandatory artifact-type token; on-demand folder creation (no pre-created empty
folders); `.wip/` gitignored and editable.

**Removed from V1:** `inbox/` and all three of its subfolders (§5); the
`v<N>[-descriptor]` versioned-filename machinery (§4).

## 4. Artifact lifecycle and immutability

V2 keeps two artifact classes, plus the thread's own ledger, and gives each
different physics.

**Records** — discussions, decision logs, reviews, implementation reports, seeds,
postmortems. The *body* is immutable from the moment of emission, exactly as in V1
— a follow-up is a new record, and append-only logs (the discussion-loop log) may
be appended to but never rewritten. Records are immutable by default — no agent
edits one on its own — but the human owner may authorize an in-place correction,
which MUST be visibly marked (an erratum / edit note) so the change is auditable,
never silent. The one structural refinement is that a record's *frontmatter status*
is a live surface (see "Body vs frontmatter" below).

**Versioned artifacts** — proposals, specs, plans. **Alive while in flight**: body
and frontmatter edited in place. Each freezes at its own lifecycle latch (below),
not at emission.

**The lifecycle ledger** — a single append-only file at the thread root carrying
the only two facts a thread cannot derive from its artifacts: its **tier** and its
**disposition**. It is not a status file (those drift); it is an append-only event
log of non-derivable facts. Full treatment further down.

### Lifecycle status: stored latches, derived condition

"Status" is two different things, and only one of them is stored. A **latch** is a
non-derivable event (a human approval, a freeze) with no other home; it is stored,
write-once, record-backed, stamped, **in the artifact's YAML frontmatter**. The
in-flight **condition** (Draft, In Review, …) is *always derived* from the latches
present plus the artifact's open reviews — never stored.

| Artifact | Frontmatter latches (the only stored status) | Derived condition | Freezes at |
|---|---|---|---|
| **Proposal** | `approved` \| `rejected` (with stamp) | Draft / In Review | the latch (`approved` or `rejected`) |
| **Spec** | `approved`, then `implemented` (with stamp) | Draft / In Review / Approved + open findings | the `implemented` latch |
| **Plan** | *none* | machine adherence verdict | thread close only |

Condition derivation — the authoritative rule, a pure function of latches +
undisposed reviews, with nothing about it stored:

```text
implemented latch present        → Implemented
else approved latch present      → Approved  (+ "has open findings" if an
                                              undisposed review exists)
else an undisposed review exists → In Review
else                             → Draft
```

Read linearly, a spec moves Draft → In Review → Approved → Implemented;
`Superseded` is gone (see Rejected alternatives).

- **Latches are sticky.** `approved` does not revert to In Review when a review
  opens during planning — that state is the derived condition "Approved + has open
  findings." Approval is an event that happened; new findings do not un-happen it.
- **The plan carries no status and no `version`** — it is the one type with
  neither. No human approves a plan (§9: it is a disposable compiler-IR); its
  quality state is the derived machine-adherence verdict, and it is edited in place
  (the auto-fix loop) while the thread is active, freezing only when the thread
  closes.
- **`version` is a review-cycle counter, kept.** It counts *completed
  review→revise cycles*, not edits: `version: 1` is the first content put up for
  review; after a review's findings are disposed and the document is revised in
  place it becomes `version: 2`. Editorial fixes never bump it; each bump is
  record-backed by construction (a review plus its disposition is exactly one
  cycle). Git holds the fine-grained diffs; `version` is the coarse human
  milestone.

**The proposal-freezes-at-`approved` vs spec-freezes-at-`implemented` asymmetry is
deliberate.** After a spec is `approved`, downstream stages can still surface spec
faults that route *back and edit the spec* (§9 outcomes 3/4) — so the spec must
stay alive `approved`→`implemented`, editable ONLY via owner-approved,
record-backed amendments (that route is the *only* legal post-approval spec edit;
never "edit the spec to match the code"). A proposal has no such downstream loop:
once the direction is `approved` the spec carries it forward, and any later "the
proposal was wrong" becomes spec content or a new thread. So the proposal has
nothing left to do after approval and freezes there. `rejected` is a real
artifact-level latch independent of thread disposition: in a multi-lineage thread,
proposal `001` may be `rejected` while proposal `002` is `approved` and the thread
itself is very much alive.

### Body vs frontmatter immutability

> **The body obeys immutability; the frontmatter is the status surface.** A
> *record's* body (finding text, decision text) is frozen at emission — history,
> never rewritten. Its *frontmatter status* is mutable until the record reaches its
> terminal status (a review: until `disposed`), then frozen. *Versioned artifacts*
> keep body and frontmatter alive together until their latch
> (`approved` / `implemented`), then freeze.

The one genuinely new concept is narrow: a record's frontmatter status can be set
(e.g. a review's `disposed`) even though its body is frozen. The "don't rewrite
history" guarantee holds for content; only the lifecycle bit updates, and git
tracks that change. **Disposition is set-once** — changing your mind is a new
review or a thread reopen, not a frontmatter flip-flop.

### When an edit needs a backing record

V1 backed every revision with a new version file. V2 backs the *contract regime*
only, which is both lighter for drafts and more auditable where it counts:

| Stage | Substantive change | Editorial change (typo/formatting, no semantic shift) |
|---|---|---|
| Draft / In Review (pre-`approved`) | no per-edit record — it is *authoring*; git holds the evolution, the feeding discussions justify what goes in, and review-driven revisions have the review as their context | git alone |
| Approved → not yet Implemented | **record-backed + owner-approved amendment** | git alone, **marked** per the owner-correction rule above |
| Implemented | frozen — no edits | frozen |

Before `approved` an artifact is authored, not a contract; there was never a
version to audit anyway. After `approved` it is a human-signed contract, so a
*substantive* change needs its *why* captured and re-approved. This preserves §4's
auditability selling point — record-backed changes beat mute version files —
exactly where V1 used version-file-per-revision.

### The thread lifecycle ledger

The ledger answers "where is this thread in its life?" — a question no artifact can
answer, because a thread's *intended* scope (its tier) and its *disposition* (being
worked, paused, or sealed?) are not derivable from the artifacts present. Deriving
tier from artifacts is circular and gameable (skip the spec, then "derive" tier-1
from the spec's absence, and the ceremony vanished with no trace). So tier is
stored — it is the intent that makes absence meaningful ("ledger says tier 2,
where's the approved spec?").

- **It is separate from the seed.** The seed answers "why does this thread exist"
  (frozen narrative); the ledger answers "where is it now" (evolving). Different
  questions, different physics — splitting them keeps the seed a clean immutable
  record and gives tooling a predictable parse target at the thread root.
- **Append-only, with a strict line grammar.** The current value of each key is the
  last line for that key. Append-only ⇒ history preserved and no silent downgrade
  (you can only *append* a visible, dated, justified line). Exact filename and line
  grammar are degrees of freedom (§15).
- **It holds ONLY tier + disposition** — the non-derivable, non-PM minimum. The
  litmus test that keeps it from becoming a mini-tracker is in §5.

**Disposition vocabulary** — only transitions are ever written, never the resting
default:

```text
(none) / resumed → active     (being worked — the resting default; never written)
deferred         → paused      (intentionally on hold; content frozen, reversible)
closed: done     → terminal    (the whole spine finished; sealed, irreversible)
closed: dropped  → terminal    (abandoned; any successor is named in the reason text)
```

- **No `open` event** — `active` is the resting default condition (folder exists &&
  no pause/terminal event); you never write a default.
- **No `implemented` disposition** — implementation is a spine *position* (derived)
  and/or the spec's own latch, never the thread's terminal; verify, review, docs,
  and ticket-close still follow it. Removing the word from the thread axis means
  spec-status `implemented` and thread disposition can never collide.
- **No bare `closed`** — every terminal names its reason (`done` / `dropped`), so
  the parse is uniform with no "if absent assume done" branch.
- **No `reopened`** — closed is sealed; the only return-to-life event is `resumed`,
  which applies solely to `deferred`, so it is unambiguous. Resurrecting closed work
  means opening a **new** thread.

### The freeze model and its guard

Two freeze layers, both keyed on explicit *stored* facts (never on a fuzzy derived
value), both enforced by a pre-commit / CI guard rather than by politeness:

1. **Artifact latch** — a spec at `implemented`, or a proposal at
   `approved` / `rejected`, is frozen *even inside an open thread*. This is the
   window the thread freeze misses: a spec hits `implemented` at finish, but the
   thread can stay active afterward for verify / review / follow-ups.
2. **Thread disposition** — the ledger's last event seals the whole thread:
   - `closed:` → reject ALL diffs (frontmatter and ledger included).
   - `deferred` → reject all diffs EXCEPT a ledger-only append of `resumed` or
     `deferred` (a reversible pause must keep one door, or it is a roach motel).
   - `resumed` / none → allow everything.

The "consistency" here is at the *enforcement-principle* level (frozen means the
guard backs it), not the mechanism level — a reversible freeze keeps a door, an
irreversible one does not. **The guard checks the pre-image:** a diff is rejected
if the thread (or artifact) was *already* frozen before it; the diff that *adds* the
`closed:` line or sets a latch is the act of freezing, so it is allowed — no
chicken-and-egg. **Closed-by-mistake is a `git revert`** of the closing commit, a
VCS undo, not a workflow reopen — so `closed` stays cleanly terminal. Changing a
deferred thread's tier requires a `resumed` first (the door passes only state
events).

Enforcement is prevention, not detection: the realistic threat is a
compliant-but-confused agent, which the guard stops *before* the commit. The TODO's
content-hash idea (hash thread contents to detect post-close edits) is rejected —
git already provides tamper-evident history, and prevention beats detection.

**Rejected alternatives, recorded so they are not re-litigated:**

- *V1 status quo (version files per revision):* breaks references on every
  revision, duplicates jumbo files, makes grep multi-hit, and forces the
  ask-the-user ceremony for "which is current". Practice overrode it every time.
- *Lineage folder + immutable version files inside it, folder as stable link
  target:* the honest fallback if disk-only history (no git dependency) were
  sacred. Preserves true file-level immutability at the cost of duplication and
  multi-hit greps forever. Not chosen: every real project lives in git, and the
  marginal benefit does not cover the permanent cost.
- *Spec-delta records appended to frozen specs:* rejected — a post-implementation
  change is a **new thread** whose spec supersedes the old one; deltas bolted onto
  frozen documents recreate mutable history through the back door.
- *A mutable tier / state file (overwritten on change):* loses in-file history and
  reopens the silent-downgrade hole; the append-only ledger is chosen instead.
- *`Superseded` as a stored spec status:* dropped — under the closed-thread freeze
  it is unreachable (the old thread is sealed by the time a successor appears), and
  it stored mutable status on a frozen doc, the exact thing §5 forbids.
  Supersession becomes an optional forward-link (§5).

## 5. Threads vs living documentation — the two-document model

The reason agents want to edit old specs is that *something* must describe current
behavior, and if specs are the only documents that exist, old specs are the only
candidates. V2 names the missing counterpart:

| | Thread artifacts (specs, plans, logs) | Living docs (`docs/`, `AGENTS.md`, `README`, behavior/architecture docs) |
|---|---|---|
| Describes | what was decided/built *at a point in time* | how the system works *now* |
| Mutability | alive while in flight; frozen at its latch | always current; updated as part of every change |
| When new work contradicts an old spec | **nothing happens to the old spec** | the living doc is updated; the new thread's spec records the change |

Agent rule, stated once and enforced everywhere: *to change how the system works,
update the living docs and open a new thread — never touch an `implemented` spec.*
Living docs may cite thread decision logs as provenance (the `appaltiav2`
`AGENTS.md` → spec → P-records chain is the model).

**Supersession is a derived, forward-linked relationship, not stored status.** When
a new thread replaces an old one, the *successor's* seed may name what it replaces,
in plain language — an optional convention, no fixed format or location. After
100+ threads you often do not *know* at authoring time that you are superseding
something, so a mandatory structured field would be mostly empty or wrong;
optionality is honest about authoring-time knowledge. (An optional soft-keyword
breadcrumb — a line starting "Supersedes…" / "Invalidates…" — is offered as a free
future-grep aid, not mandated.) This is the same answer as §13's deferred decision
index: build machine-mineable structure when a real lookup fails, not before.

### Status is derived, never stored — the workflow is event-sourced

This is the unifying principle behind the inbox removal, the derived condition
(§4), and the two-document model — and it is exactly event sourcing: **truth is
append-only events; current state is a projection folded from them; you never store
a derivable mutable current-state** (that is the drift disease). V2's events are
distributed across the frontmatter latches (§4), the ledger (§4), and the records;
the "state" is computed on demand.

- A review with no `disposed` frontmatter **is open**, by definition, with zero
  moving parts — a parsed field, not a fuzzy content match. A spec with no
  `approved` latch is Draft / In Review. "What is still open in this thread?" is
  answerable by folding what exists.
- **The inbox is deleted.** Its residual job — capturing tangential items mid-work
  — is served by the implementation report (§9) and by seeds of *future* threads
  (or tickets in the real tracker, where triage state belongs). `dropped/` was
  audit theater; git remembers deletions.

**"Derive, don't store" applies uniformly — including to an artifact's own
status.** Only the non-derivable latch is stored (§4); the displayed condition is
always derived. The lone permitted store of non-derivable state is the **lifecycle
ledger** (§4), and it earns the exception by a strict litmus test applied before
*any* field could ever be added to it:

> *Can I derive it from the artifacts?* → derive it, don't store it.
> *Is it a PM / coordination fact a stakeholder cares about?* → it belongs to the
> tracker (§8).
> *Neither — and only then?* → the ledger may hold it.

By this test the ledger can only ever hold tier + disposition; the instant it
stored a derivable thing (`spec: approved`, `plan: done`) it would become a
drift-prone `STATE.md`. That is the precise line between the ledger and the rejected
alternatives: a **hand-written `STATE.md`** materializes derivable state into a
second source that drifts (rejected, §12); a **separate `events.jsonl`** would
duplicate the lifecycle facts the specs / plans / records already carry, so it too
is rejected; a materialized **`state.json` projection** buys nothing today (the only
consumer is the future CLI, which folds the projection in memory) and is deferred,
available later if a real need appears.

## 6. The seed

Every thread of tier ≥1 starts with one mandatory genesis record:

```markdown
# Seed: <title>
External: <tracker URL | "none" + why>

<1–5 lines: what triggered this — the idea, the bug, the request>
```

The seed is a **frozen narrative record**: written once, never touched again. It no
longer carries the tier — tier and disposition live in the thread's lifecycle
ledger (§4), which evolves over the thread's life while the seed stays a clean
immutable record needing no mutability carve-out. The seed keeps two jobs: the
genesis narrative, and **the tracker bridge** (§8) via its `External:` line.

`seed/` is the **genesis bucket**, and it may hold exactly three kinds of thing:

1. **The seed** — `<UTC>-<desc>-seed.md`, exactly one.
2. **Genesis source material** — immutable records carrying the raw inputs /
   provenance the thread was born from (copied notes, an external doc, a handoff
   brief), under the record grammar with the appropriate token (`notes`,
   `discussion`, …). This exists because "a discussion cannot start from nothing"
   (the maintainer's words).
3. **`discussions/`** — genesis discussions targeting the seed.

No `reviews/` under `seed/` — the seed is a few-line genesis record, not a reviewed
artifact. Writing the seed first costs nothing, gives every thread a stable anchor,
and gives genesis discussions a target. "Seed" is already in the workflow
vocabulary (`seeded-discussion`). The seed has **no owner field**: ownership is
work-management and belongs to the tracker's assignee (§8); the solo owner is
trivially the user, and an owner field would duplicate the tracker and drift.

## 7. Tiers — calibrated process instead of one-size ceremony

Large organizations do not run every change through the full process; they have
thresholds. V2 makes the threshold explicit, chosen by the agent and confirmed by
the user:

| Tier | Entry criteria | Required artifacts | Example |
|---|---|---|---|
| **0 — chore** | no behavior change; reversible in one commit | none — the commit message is the record | typo, comment, formatting, local rename |
| **1 — patch** | small fix/feature; low blast radius; no open design question | thread: seed + ledger + implementation report; discussion only if a decision actually arises | one-line default fix |
| **2 — feature** | anything with a design decision (the default) | seed → discussion(s) → spec (reviewed, **approved**) → plan → implement → impl report + code review | a new pipeline facet |
| **3 — initiative** | multi-week, architectural, or hard to reverse | tier 2 + proposal stage + adversarial reviews (pre-mortem) + phased roadmap | a full rewrite |

Three rules keep tiers safe rather than a loophole:

1. **The tier is recorded in the ledger with a one-line justification** —
   auditable, and an agent cannot silently downgrade (the ledger is append-only).
2. **Escalation and de-escalation are both cheap, explicit, and symmetric**: a
   tier-1 that surfaces a real decision mid-flight stops, the ledger gains a dated,
   justified tier line, and the spec stage begins; a downgrade is the same — a
   dated, justified appended line. The visibility is the whole point.
3. **Quality gates scale with tier** (§13): tier 0 needs green CI; tier 3 needs a
   pre-mortem.

The example column is right-sized deliberately: tier 0 is genuine no-ops (a
behavior-changing dependency bump is tier 1, not tier 0). **Tier 0 leaves no trace
beyond the commit** — this repo uses Conventional Commits, so the commit
`type(scope)` is the lightweight mineable record; adding a thread or ledger to
tier 0 would defeat its purpose. Build heavier mining only if it ever becomes
painful.

## 8. Remote tracker integration

"Status" is one word doing three different jobs. Separating them is what lets the
filesystem and an external tracker coexist without dual-tracking:

| Layer | Question | Owner | Exists when |
|---|---|---|---|
| Work-item / PM status | priority, assignee, In Progress / Blocked / Done (the stakeholder view) | the tracker (Jira / Linear / ClickUp / GH Issues) | only if a ticket exists |
| Thread lifecycle | is this repo work-unit active / paused / terminal, and is it frozen? | the **repo** — the lifecycle ledger (§4) | always, at tier ≥1 |
| Spine position | which artifacts exist; what is the next one | **derived** from the folder | always |

These layers are distinct by granularity (a ticket "In Progress" spans seed→plan
and never tells you what is next), cardinality (one tier-3 epic ticket → many
threads), and existence (threads without tickets; tickets without threads) — not
the same fact stored twice. **Exactly one system owns work-item status, and it is
never the filesystem:**

- **Solo / personal / OSS:** GitHub Issues — adjacent to the code, auto-links
  commits and PRs, zero process cost.
- **Company contexts with PM/stakeholder visibility (e.g. ClickUp at the
  maintainer's employer):** the company tracker owns status, because that is where
  non-engineers look. **Never mirror into GitHub Issues — dual-tracking always
  rots.**

The convention stays tracker-agnostic because **the seed is the join point**: the
seed's `External:` line carries the ticket URL, the ticket gets one comment with a
permalink to the thread folder, and commits / PRs reference the ticket. The two
layers **link at the seed and shake hands exactly once, at finish** (§9: spec →
`implemented`, ticket closed, ledger `closed: done`). They never continuously mirror
— continuous mirroring is what "dual-tracking rots" means; a single terminal
handshake is not. When there is no ticket (tier 0–1 personal work, `External:
none`), the repo is the sole owner and there is nothing to drift against. Threads
hold the *thinking*, the tracker holds the *PM state*, the repo holds the *truth*.
Tier 0–1 personal work may have `External: none`; tier ≥2 team work should have a
ticket (visibility and audit are the point of a team tracker).

## 9. The spine, stage by stage

`seed → discussion(s) → [proposal] → spec → plan → implement → verify → finish`

- **Seed** (§6): always, tier ≥1.
- **Discussions**: anywhere, any time — the connective tissue between user and agent
  and the source of historical decisions, captured as much as possible (§11).
  Genesis discussions target the seed; later ones target the artifact they serve.
- **Proposal** — *optional, tier-3*: answers "should we do this, and in which
  direction?" (the corporate pitch/PRD stage, exploring the solution space). The
  seed answers "what triggered this?"; the spec answers "exactly what are we
  building?". No collision — proposal was only ever awkward because it looked
  mandatory. Most work goes seed → discussion → spec.
- **Spec** — the centerpiece, and **the last artifact the human reads and
  approves**. Keep the name "spec": it is the term the spec-driven-development
  ecosystem converged on; renaming buys nothing and costs alignment. Two new
  obligations:
  1. **Machine-checkable acceptance criteria** for tier ≥2 — the FR/AC +
     e2e-coverage + traceability model proven in `appaltiav2`'s testing design,
     promoted from project practice to workflow practice. It is what makes plan
     autonomy *safe* rather than hopeful.
  2. **A "Degrees of freedom" section**: the *what* is handoff-grade; the explicitly
     listed *hows* are the implementer's free choice. It is what lets an automated
     adherence review distinguish "plan deviated from spec" from "plan chose within
     granted freedom" — without it the reviewer either nags about everything or
     rubber-stamps everything.
  Authoring constraint (the prevention side of §10's lossless-mapping review): the
  spec must commit to **no decision or assumption** the user did not see and accept
  in the discussions *unless* the spec explicitly marks it a Degree of Freedom. The
  bar is decisions and assumptions, never sentences — a spec freely elaborates
  discussed decisions into prose, structure, and derived ACs. The writer's escape
  for any specific they do not want to pin down is to discuss it or mark it DoF.
- **Plan** — derived from the spec. **Plan autonomy is V2's recommended default,
  not a law:** when the spec is right the plan follows mechanically, so
  `plan-*-auto` can produce it and a machine adherence review can clear it without
  the human ever reading it — and the two spec preconditions (machine-checkable ACs
  and the Degrees-of-freedom section) make that *safe*. This is the maintainer's
  personal default, not a rule forced on a second user: **human-in-the-loop
  planning stays supported** (`plan-*-interactive` is retained). The plan adherence
  review is **mode-agnostic** — it checks plan-against-spec however the plan was
  authored — and has four outcomes:
  1. plan adheres → implement;
  2. plan deviates from spec → auto-fix, loop until adherent;
  3. plan deviates because the spec is ambiguous / incomplete;
  4. plan is ambiguous because the spec is ambiguous.
  Outcomes 3 and 4 (merge or keep split — degree of freedom, §15) route to the human
  and **fix the spec**, never patch the plan. The plan is a disposable intermediate
  — a compiler IR; the spec plus its acceptance criteria are the contract, which is
  why the plan carries no stored status (§4).
- **Implement** — `implement-*` skills, per plan. Every implementation run emits an
  **implementation report** (record, immutable; the industry analog is the PR
  description): deviations from plan with justification, surprises, problems hit,
  and follow-ups. Follow-ups route to seeds of future threads or — in tier-3 phased
  work — to the next phase's discussion (the roadmap is a living list inside the
  open thread, not a frozen contract; phases may welcome or defer the follow-ups
  appended to them).
- **Verify** — the implementation is checked against the **spec's acceptance
  criteria**, not against the plan. The human may review the implementation (their
  choice); they never need to review the plan.
- **Finish** — living docs updated (§5); the **human's** approval already set the
  spec's `approved` latch, and the **finish skill** now sets the spec's
  `implemented` latch and appends `closed: done` to the ledger in one action; ticket
  closed. The freeze guard (§4) is active from that commit forward; the CI guard
  never *sets* status — it only reads latches and the ledger to enforce the freeze.

## 10. Reviews

- **Placement:** in the target's `reviews/` folder (§3). There is no open/processed
  lifecycle — disposition is recorded **in the review's own YAML frontmatter**
  (`disposed: <stamp>`, `disposition: accepted | rejected`, optional
  `rationale: <thread-relative path>`), set once (§4). A review with no `disposed`
  field is open, mechanically, by parse — no folder move — and **no separate
  disposing record is required**: accept-and-revise sets the frontmatter directly
  (the revision is the record), and reject sets it with no document at all. A
  discussion, if one happens, is optional linked rationale, never the authoritative
  status.
- **Report format:** reports open with a **References-first** section —
  `- <description>: <path>` (within-thread references thread-relative, cross-thread
  repo-relative, never absolute, never a bare path list) — naming the artifact under review before any verdict; then Verdict →
  Findings → Evidence → Open Questions → Next Actions.
- **The lossless-mapping review** — the highest-value new skill: given a set of
  discussions and the document produced from them, verify the mapping is lossless
  and additive-free. **The unit is a decision or an assumption — never a sentence**;
  restatement, organization, derived ACs, and formatting are never flagged. A
  flaggable item is document content that commits to a choice among alternatives, or
  presupposes something not established, that the user *neither* saw-and-accepted in
  the discussions *nor* the document explicitly marks a **Degree of Freedom** — the
  DoF section is the pressure valve that turns "nagging" into a forcing function
  instead of noise. Two output sections, empty = pass: (a) decisions/assumptions in
  the document the user never explicitly accepted (and not declared DoF); (b)
  decisions the user made that the document failed to capture. It is the same
  invariant §9's authoring constraint enforces from the prevention side, and the
  only review that protects the human in the world where they stop reading plans.
  **Cadence:** a strong recommendation at tier ≥2, run *before* the spec is
  `approved` (it earns the approval) and part of the tier-2 Definition of Done as a
  recommendation — not mechanically forced (§13); on demand otherwise.
- **Consistency-with-decision-logs** joins the standard spec review's checks
  (codifying `02-review-spec.md`'s footer).
- **Adversarial reviews** (pre-mortem, red-team) are tier-3 stages, run against
  approved specs (the `appaltiav2` sequence — handoff review, then pre-mortem — is
  the template).

## 11. Discussions

- **Two modes:** *creative* (exploring a solution space — present multiple options)
  and *practical* (disposing review findings, fixing issues — present a single
  well-argued **Proposed solution** instead of an option menu; observed to be how
  strong models naturally drive these loops). Mode picked per discussion, defaulting
  by context.
- **Recommendation-first is legitimate:** the loop no longer *forces* an options
  list when one well-explained recommendation serves better.
- **Options are lettered** (A/B/C) so the user can reference them tersely.
- **A discussion no longer owns review disposition.** Disposition is a frontmatter
  flip on the review itself (§10); a practical-mode discussion, when one is written,
  is the optional linked `rationale`, not the authoritative status. Disposing a
  review no longer requires a discussion at all.
- **P-numbering is scoped to the discussion's target.** Off-target points (e.g. the
  end-of-loop "what should I do next?" exchange) are either left unlogged by rule or
  logged under a distinct prefix — polluting the log with non-target decisions is a
  known failure mode.
- **Log headers carry full context:** target artifact path, thread, and what is
  being discussed — never just a vague title.
- **Optional pause after "What you need to know":** the user may answer directly,
  provide context, or skip — before the options/recommendation are generated.
- **Peer framing in the loop's contract:** neither side defers to the other; neither
  blindly accepts the other's proposals; both are trying to reach the best decision
  together (joining the existing anti-sycophancy rules).
- A discussion log is written **only when it contains information useful to a future
  reader about its target** — no ceremony logs.

## 12. Explicitly rejected (so they are not re-proposed)

| Rejected | Why |
|---|---|
| `inbox/` (open/processed/dropped) | status-by-folder breaks links; status is derived (§5); capture jobs reassigned to implementation reports and seeds |
| Hand-written `STATE.md` per thread | materializes *derivable* state into a second source that drifts. The lifecycle ledger (§4) is **not** this — it is append-only and holds only the two *non-derivable* facts (tier + disposition), so it cannot drift; the litmus test (§5) keeps it minimal |
| Separate `events.jsonl` event-log file | would duplicate lifecycle facts the specs/plans/records already carry → drift; the events are already distributed across frontmatter latches, the ledger, and records (§5) |
| Content hashes for closed-thread tamper detection | git is enough; prevention (the freeze guard) beats detection |
| Spec-delta records on frozen specs | new thread + supersede instead; deltas recreate mutable history |
| `Superseded` as a stored spec status | unreachable under the closed-thread freeze, and stored mutable status on a frozen doc; supersession is an optional forward-link (§5) |
| Auto-sync between tracker and threads | dual-tracking rots; the seed link is the whole integration (§8) |
| Recursive record nesting (discussion under review under spec) | targets form a graph; one-level cap; relationships live in bodies |
| Version-files-per-revision immutability (V1 D39–D41 as written) | replaced by lifecycle immutability (§4) |
| Renaming "spec" | lifecycle was the problem, not vocabulary; the ecosystem term stays |

## 13. Industry practices adopted

**Now:**

- **Definition of Done per tier**, written into the workflow: tier 0 = green CI;
  tier 1 = + implementation report; tier 2 = + approved spec, AC coverage, code
  review (and a lossless-mapping review as a recommendation before approval, §10);
  tier 3 = + adversarial review pass. (Already lived in `appaltiav2` —
  ruff/basedpyright/pytest gates; now workflow-level.)
- **PR discipline, scaled by tier — a strong recommendation, not a forced rule:**
  none at tier 0 (no thread; the commit is the record), recommended at tier 1,
  **strongly recommended at tier ≥2** (it is where code review and AC-coverage
  verification live — the tier-2 DoD). The "even solo" spirit is preserved: do not
  skip the PR at the tiers where review matters just because you are working alone.
  Enforcement is deliberately deferred — a *requirement* is machine-checked (branch
  protection + a CI check that reads the thread's tier from the ledger and blocks an
  unreviewed tier-≥2 merge), a *recommendation* lives in prose; V2 ships the
  recommendation and leaves the CI gate as a later option if the pain proves real.
  (This is a second consumer of the stored tier — a derived tier could gate
  nothing.)
- **Implementation reports** (§9).
- **Prerequisite preflight for CLI-backed skills:** a skill whose instructions
  require a binary or a sibling skill checks availability *first* and fails the
  whole instruction with a clear warning when the prerequisite is missing — never
  lets the agent run until something breaks mid-flight.

V2's one committed mechanical guard is the freeze guard (§4), which protects
*correctness* (do not corrupt frozen records). Process hygiene like the PR gate
stays a recommendation for now.

**On trigger (deliberately not now):**

- **Global decision index** (`docs/decisions.md`, one line per major decision +
  link to the thread log): per-thread decision logs are *richer* than classic ADRs
  but are buried by thread. First mitigation is the living-docs-cite-logs pattern
  (§5); build the index the first time a known decision cannot be found.
- **Postmortems**: a blameless record type (timeline, contributing causes, actions)
  for production incidents; a thread whose seed *is* the incident. Add at the first
  real incident.
- **Spec-creation UX orchestration** (the discuss → spec → review → discuss →
  update loop as one guided flow): a real need, but an orchestration layer over the
  stages — build it only after V2 stabilizes, or today's seams get baked into it.

## 14. Skill-change list implied by this proposal

| Skill | Change |
|---|---|
| `discussion` / `seeded-discussion` | output path → target's `discussions/` inside the thread; stamp-grammar filenames enforced; modes, lettered options, P-scoping, off-target rule, context-rich headers, optional pause, peer framing (§11); may carry an optional `rationale` cross-link but no longer owns review disposition (§10); records immutable by default with owner-authorized in-place corrections visibly marked (§4) |
| `propose-*` | lineage-folder output (`proposals/NNN/`); `approved` / `rejected` frontmatter latch (§4); tier awareness |
| `review-proposal-*` | output → proposal's `reviews/`; references-first format; consistency-with-decision-logs check; sets/reads frontmatter disposition |
| `review-spec-*` | output → spec's `reviews/`; references-first format with thread-relative within-thread paths; consistency-with-decision-logs check added; open/processed lifecycle language removed; disposition via frontmatter |
| `review-plan-*` | the four-outcome, mode-agnostic adherence review (§9); honors the spec's Degrees-of-freedom section; disposition via frontmatter |
| `review-implementation-*` / `review-code-*` | verify against spec ACs; output → `implementation/reviews/`; disposition via frontmatter |
| **new:** lossless-mapping review | §10; decisions/assumptions bar with the DoF pressure valve; two-section output; runs after a document is produced from discussions (tier ≥2 recommendation, before approval) |
| `plan-loose-{auto,interactive}`, `plan-strict-{auto,interactive}` | **all retained** (none removed); output → `plans/NNN/plan.md`; alive-in-place (no version files); no stored status and no `version` header (§4); self-review retained; thread-V2 paths; tier awareness |
| `adjust-plan-granularity-{auto,interactive}` | **retained, not retired** — its input is an existing plan, not a spec, so it is a distinct operation from generating a plan; the only V2 change is output mechanics (edit the living plan in place, record-backed, instead of emitting a new version file) |
| `implement-*` | emit implementation report (§9); follow-up routing |
| `merge-artifacts-*` | no version-file bump (none exist); merge authors/revises the canonical `NNN/<artifact>.md` from candidate inputs (or a record-backed in-place revision, or a new thread if the target is frozen), with the rationale in a decision log (§3 variant rule) |
| `finish` | **substantive new behavior:** set the spec's `implemented` latch (§4); append `closed: done` to the ledger (§4); update living docs (§5); close the ticket (§9) |
| `whats-next` | becomes the derived-status reader (CLI precursor): reads the ledger (tier + disposition) and folds spine position + open findings to answer "what now / what next / is it closed" (§4/§5) |
| `capture-inbox` | **replaced** by seed-capture (writes a seed for a new/future thread, or a tracker ticket) |
| `spec-*` | frontmatter `approved` / `implemented` latches; Degrees-of-freedom section; FR/AC obligation at tier ≥2; lossless authoring constraint at the decisions/assumptions level; lineage-folder output path |
| `take-snapshot`, handoff skills, research skills | "all"-row only — tier awareness + thread-V2 paths where they touch threads; likely no deeper change |
| all | thread-layout V2 paths; tier awareness (read the ledger; propose the tier when opening a thread); the frontmatter status contract (§4) for status-bearing skills |

## 15. Degrees of freedom (this proposal's own)

Deliberately left to the implementer of V2 (decisions welcome at review, not
blockers):

- Exact seed format beyond its two mandatory lines (`External:` + trigger
  description).
- Tier labels (the numbers are normative; chore/patch/feature/initiative are
  suggestions).
- Whether plan-review outcomes 3 and 4 merge into one (the proposal needs only
  "spec-fault routes to the human and fixes the spec").
- The freeze guard's mechanism (pre-commit hook vs CI job vs both).
- Postmortem and decision-index templates (defined when their triggers fire).
- Whether `implementation/` warrants lineage folders like the versioned types or
  stays flat (flat proposed; revisit if implementations multiply per thread).
- The lifecycle ledger's exact filename (its location is the thread root, §4) and
  its exact line grammar (e.g. `tier: <0–3> @ <stamp> — <why>`,
  `closed: done @ <stamp>`).
- Whether a re-`deferred` (reason update) is permitted, or one must `resumed` then
  `deferred`.
- Whether the optional supersession forward-link uses a soft-keyword breadcrumb.
- The exact frontmatter field names and syntax for latches and disposition (the §4
  tables show intent, not normative spelling), and whether the raw header also
  renders a derived condition word for human legibility (and if so, how to mark it
  non-authoritative).

## 16. Migration and rollout

1. **Pilot first** (already underway): the `appaltiav2` v2-design thread is the live
   pilot — its layout was hand-migrated to the V2 shape (specs/, discussions/,
   reviews/ under the thread) and its spec already carries a version header. Run
   AppaltIA phase 1 under these conventions before codifying.
2. **Codify as `docs/workflow/v2/`** in the skills repo — V1 reference docs are
   themselves immutable by convention; V2 is a new ruleset, not edits to v1. The set
   includes a filename-grammar successor (versioned artifacts as `<type>.md` in
   `NNN[-<desc>]/` lineage folders, no `v<N>`; records keep the stamped form) and an
   immutability/lifecycle doc (latches + derived condition, the body-vs-frontmatter
   rule, the ledger, the freeze guard), and replaces the V1 token list with the V2
   vocabulary (§3). V1 threads are grandfathered: never migrated, never mixed.
3. **Update the skills** per §14, bumping each skill's `metadata.version`.
4. **Retire `EXAMPLE-WORKFLOW/`** — this is an action in the external `appaltiav2`
   workspace where the folder lives (untracked), **not** a step in this repo's
   rollout; this repo's rollout is items 2–3 above.
5. **This thread runs the full tier-3 spine and produces a spec.** The proposal is
   the argued *design* (why V2, what changes, evidence, rejected alternatives,
   traceability); once it is approved (and frozen, §4), a **spec** — the buildable
   contract: exactly which `docs/workflow/v2/` files to author with what rules,
   exactly which skills change with what behavior and version bumps, acceptance
   criteria, and degrees of freedom — is authored from the approved proposal and
   this thread's decision log, gets a lossless-mapping review (§10) against the
   proposal + log, and is approved before implementation. The spec, not the
   proposal, is the build contract.
6. **Done** — the two consultation sessions are captured as a handoff record at
   `seed/discussions/260612175420Z-workflow-v2-consultation-handoff-discussion.md`,
   and the maintainer's TODO notes are copied verbatim (with provenance header) to
   `seed/260612175420Z-maintainer-workflow-todo-notes.md`, closing this proposal's
   traceability loop on disk.

## 17. Sources and traceability

Per the lossless-mapping invariant this proposal itself advocates: every position
above traces to one of these sources, and nothing here was invented outside them.
One honest caveat: the two consultation sessions survive only as the handoff
summary on disk — they were not transcribed — so detailed verification against the
raw sessions is impossible by construction; their elaborations are attributable to
the summary, not independently checkable.

Both consultation sessions are captured on disk in this thread:
`seed/discussions/260612175420Z-workflow-v2-consultation-handoff-discussion.md`.

- **Consultation session 1 (2026-06-12, appaltiav2 workspace) — thread-layout
  critique:** §2 (patch-list evidence), §3 (layout, nesting rules, one-level cap),
  §4 (records-vs-versioned split, rejected alternatives), §5 (derived status, inbox
  removal), §6 (seed).
- **Consultation session 2 (2026-06-12) — workflow consultation:** §4 (status
  lifecycle), §5 (two-document model), §7 (tiers), §8 (tracker), §9 (spine, plan
  autonomy, preconditions), §13 (industry practices, adopt/defer/skip).
- **TODO notes** (maintainer's accumulated notes; verbatim in-thread copy at
  `seed/260612175420Z-maintainer-workflow-todo-notes.md` — line numbers below refer
  to the original numbering, preserved beneath that file's provenance header):
  lossless-mapping review (lines 1–14), peer framing (17), discussion targets and
  P-scoping (19–22), recommendation-first (25–27), STATE.md question (30, answered
  no), closed-thread hash question (33, answered git+guard), CLI preflight (37–38),
  lettered options (41), update-spec / lifecycle insight (44–49 — the seed of §4),
  roadmap flexibility (52–53), spec-UX orchestration (56–64, deferred), log headers
  (67–73), review references format (76–85), deliberate ambiguity (88–91 — §9's
  Degrees of freedom), implementation report (94), no plan-interactive + four
  outcomes (97–105), pause-after-context (108).
- **`appaltiav2` pilot thread** (`docs/threads/260611150721Z-v2-design/` in that
  repo): the in-place revision practice, the derived-status practice, the
  reviews-folder move, the FR/AC approval rule, and the wipe-test/derived-state
  principle that §5 generalizes.

The review-cycle decisions that produced `version: 2` (lineage-folder naming, the
thread lifecycle ledger, the event-sourced frontmatter status contract, the
variant/merge model, the retained plan family, the calibrated record and
lossless-mapping bars, the V2 filename grammar) are recorded in this thread's
decision log at
`proposals/001/discussions/260612201354Z-proposal-v1-review-findings-decision-log.md`,
disposing the review at `proposals/001/reviews/260612200042Z-proposal-v1-review.md`.

## 18. Resolved questions

The four questions §18 originally left open are now disposed (and folded into the
sections noted); recorded here as a consolidated answer:

- **Who flips a spec to `implemented`?** The **human** sets the `approved` latch —
  the one human-gated event; the **finish skill** sets `implemented` together with
  the ledger `closed: done`, in one finish action; the CI guard never *sets* status,
  it only reads latches/ledger to enforce the freeze. (§4, §9.)
- **Does tier 0 leave any trace beyond the commit?** No — the Conventional-Commits
  `type(scope)` is the lightweight mineable trace; a thread or ledger would defeat
  tier 0's purpose. Build mining only if it becomes painful. (§7.)
- **Does the seed need an owner field?** No — ownership is work-management and
  belongs to the tracker's assignee; the seed's `External:` line links to it, and a
  solo owner is trivially the user. An owner field would duplicate the tracker and
  fail the ledger litmus test. (§6, §8.)
- **When does the lossless-mapping review run?** A strong recommendation at tier ≥2,
  run before the spec is `approved` (part of the tier-2 Definition of Done as a
  recommendation, not mechanically forced); on demand otherwise. (§9, §10, §13.)
