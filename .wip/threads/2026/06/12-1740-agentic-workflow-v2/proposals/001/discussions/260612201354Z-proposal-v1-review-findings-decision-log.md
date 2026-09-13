# Decision log: disposing the V2 proposal review findings

Append-only decision log of the discussion loop between the maintainer and the
agent session of 2026-06-12, run in practical mode. Each `P<N>` disposes one or
more findings; the proposal is then revised in place per its own §4 rules,
citing these entries.

- Target: `docs/threads/260612174045Z-agentic-workflow-v2/proposals/001/proposal.md` (Status: Draft, Version: 1)
- Disposes: `docs/threads/260612174045Z-agentic-workflow-v2/proposals/001/reviews/260612200042Z-proposal-v1-review.md` (findings F-1…F-19 + carried §18 open questions)
- Header paths updated in place per decision P1 (lineage folder renamed after this log's emission).
- Thread: `docs/threads/260612174045Z-agentic-workflow-v2/`
- Agenda: majors F-1…F-6, then moderates F-7…F-16, then nits F-17…F-19 and the proposal's §18 open questions.

---

## P1 — Lineage-folder naming: `NNN[-<desc>]/` (disposes F-1)

**Context:** §3 named lineage folders `<desc>-proposal/`; the folder on disk
was `proposals/agentic-workflow-v2/`; the handoff record links to the §3 form.
F-1 demanded disk and grammar converge. The maintainer challenged both the type
suffix (parent folder `proposals/` and the inner `proposal.md` already carry
it) and the mandatory descriptor (in the common single-lineage case it just
repeats the thread slug), and floated `001`/`002` or `v1`/`v2` instead.

**Decision (user — option C):** lineage folders are named `NNN[-<desc>]/` —
mandatory zero-padded 3-digit sequence number starting at `001`, plus an
optional kebab slug added only when it distinguishes (multi-lineage threads,
variants). Applies uniformly to `proposals/`, `specs/`, `plans/`.

**Rationale:** the type suffix and mandatory descriptor defend a property V2
already gave up — under the lineage model the full path is the unit of
reference (`proposal.md` is meaningless bare by design), and the full path
already carries the type (`proposals/`) and the subject (thread slug). The
optional slug keeps the multi-lineage case legible (`specs/001-api/`,
`specs/002-cli/`); adding a slug to a later lineage never renames an earlier
one, so links stay stable; numbered folders sort in creation order; repo
precedent exists (`afk-exploration`'s `0001-<slug>/`). `v1`/`v2/` was rejected
outright: "v" reads as *version*, and under V2 versions live in the document
header — a second lineage is a different artifact, not a revision, and `vN`
folders would resurrect at folder level the exact confusion V2 removes at file
level.

**Consequences applied with this entry:**

- `proposals/agentic-workflow-v2/` renamed to `proposals/001/`.
- The handoff record's three links to `proposals/agentic-workflow-v2-proposal/…`
  are permanently broken (that record is immutable); this entry is their
  disposition — a reader following a dead link resolves it here.
- With the maintainer's explicit authorization, forward-pointing paths in the
  two records this session emitted minutes earlier were fixed in place (the
  review's References and Next-actions paths; this log's header), each fix
  marked inline. F-1's narrative body was left untouched — it describes
  review-time state.
- Correction on the record: review F-1 overstated the blast radius — only the
  handoff record references the `-proposal/` path; the proposal's §16/§17 never
  name the lineage folder.
- Proposal revision required (backed by this entry): §3's lineage-folder
  grammar rewritten to `NNN[-<desc>]/`; §3's example tree updated accordingly.

## P2 — The thread lifecycle ledger: tier + disposition, derived status, and the freeze model (disposes F-2; substantially resolves F-3; partially resolves F-4; resolves F-9)

This point opened on F-2 (seed immutability vs tier escalation) and grew into
the keystone of the whole review. It is logged in full because everything
downstream (freeze, guard, closure, CLI) leans on it. Read top to bottom; the
reasoning is preserved deliberately, not just the conclusions.

### The problem, as it widened

F-2's narrow clash: §4 calls the seed a record ("immutable from emission"), but
§7 says tier escalation makes "the seed gain a line" — a record can't be edited.
Pulling that thread exposed three deeper questions the proposal never settled:
(1) is the tier even necessary, and if so why store it; (2) how do we express
"a thread is closed / dropped / deferred" at all — derived status answers "is
this review disposed?" but cannot tell "not done yet" from "never will be";
(3) where does any of this live without reinventing a tracker in the
filesystem (the §8/§12 fear) or duplicating a real tracker's state.

### Decision 1 — the tier is necessary, and must be stored (not derived)

The grounding is the maintainer's stated goal: a future CLI that, per thread,
answers "what do I do now / what's next / is it closed?" The next step is a
function: `next_step = expected_spine(tier) − artifacts_present`. The CLI can
*derive* position (scan the folder), but the destination — how much spine this
thread owes — is the tier, and it cannot be derived: deriving tier from
artifacts present is circular and gameable (skip the spec, then "derive" tier-1
from the spec's absence, and the ceremony vanished with no trace). The tier is
the **intent that makes absence meaningful** — the yardstick derived reality is
checked against ("seed says tier 2, where's the Approved spec?"). So: stored.
De-escalation is allowed symmetrically with escalation (both are dated,
justified lines — the visibility that makes downgrades safe is the whole point).

### Decision 2 — a thread **lifecycle ledger**: a separate, append-only file holding ONLY non-derivable facts (tier + disposition)

- **Separate file, not in the seed.** The seed answers "why does this thread
  exist" (frozen narrative — a pure record, never touched after creation). The
  ledger answers "where is this thread in its life" (tier + disposition,
  evolving). Different questions, different physics. Splitting them keeps the
  seed a clean immutable record needing **no mutability carve-out at all**, and
  gives the CLI a predictable parse target. (This reverses the agent's earlier
  in-session proposal of a seed-as-ledger; the maintainer's repeated instinct
  for a separate file was correct — the agent's objection had only ever applied
  to a *mutable* file, which an append-only ledger is not.)
- **Append-only with a strict line grammar.** Current value of each key = the
  last line for that key. Append-only ⇒ history preserved, no silent downgrade
  (you can only *append* a visible, dated, justified line), record physics
  intact. Exact filename/location and exact line grammar are degrees of freedom
  (see end of entry).
- **It holds ONLY what is non-derivable and non-PM** — tier and disposition.
  This is the line that keeps it from becoming a mini-Jira and the answer to the
  §12 STATE.md rejection: STATE.md was rejected because it *duplicated*
  artifact-derivable state and therefore drifts. The ledger duplicates nothing —
  it IS the sole source of two facts that exist nowhere else and cannot be
  derived, so it cannot drift. The instant it stored derivable things
  (`spec: approved`, `plan: done`) it would become drift-prone STATE.md.

**The litmus test (record this verbatim — it is the structural guardrail
against bloat):** before any field is added to the ledger, ask — *Can I derive
it from the artifacts?* → derive it, don't store it. *Is it a PM/coordination
fact a stakeholder cares about?* → it belongs to the tracker. *Neither — and
only then?* → the ledger may hold it. By this test the ledger can only ever hold
tier + disposition.

### Decision 3 — the three-layer status model (this is why the ledger is NOT a mini-Jira)

"Status" was one word doing three jobs. They are distinct by granularity,
cardinality, and existence — not the same fact stored twice:

| Layer | Question | Owner | Exists when |
|---|---|---|---|
| Work-item / PM status | priority, assignee, In Progress / Blocked / Done (stakeholder view) | the tracker (Jira/Linear/ClickUp/GH Issues) | only if a ticket exists |
| Thread lifecycle | is this repo work-unit live / paused / terminal, and is it frozen? | the **repo** (the ledger), always at tier ≥1 | always (tier ≥1) |
| Spine position | which artifacts exist; what's the next one | **derived** from the folder | always |

- Different granularity (a ticket "In Progress" spans seed→plan and never tells
  you what's next); different cardinality (one tier-3 epic ticket → many
  threads, so thread lifecycle provably ≠ ticket status); different existence
  (threads without tickets; tickets without threads).
- The two link at the seed's `External:` line and **shake hands exactly once**,
  at finish (§9: spec→Implemented, ticket closed, thread closed). They never
  continuously mirror — continuous mirroring is what §8 means by "dual-tracking
  rots"; a single terminal handshake is not that.
- When there is **no ticket** (tier 0–1 personal work, `External: none`), DRY is
  trivially satisfied: the repo is the sole owner, nothing to drift against. The
  duplication fear only even arises when a ticket also exists, and there the two
  are different layers.
- This is what big teams already do implicitly: the tracker owns PM status; the
  VCS side (branch/PR/merge) owns the engineering lifecycle; auto-transition
  integrations exist precisely *because* they are two systems being bridged.
  The ledger is that VCS-side lifecycle made explicit and grep-able for threads.

### Decision 4 — the disposition vocabulary, and what is deliberately NOT in it

Events ever written to the ledger (transitions only — never the resting
default): **`deferred`**, **`resumed`**, **`closed: done`**, **`closed: dropped`**.

Derived condition from the last event:

```
(none) / resumed → active     (being worked)
deferred         → paused      (intentionally on hold; content frozen, reversible)
closed: <reason> → terminal    (sealed; irreversible)
```

Explicitly excluded, with reasons:

- **No `open` event.** `open`/`live` is the *resting default condition*, derived
  from "folder exists && no terminal/pause event." You never write a default.
  (Maintainer's correction; it separates the derived *condition* `open` from the
  *event* of returning to life, `resumed`.)
- **No `implemented` disposition.** Implementation is a *spine position*
  (derivable) and/or the *spec's* artifact status — NOT the thread's terminal.
  An implementation is never the end: verify, review, docs, ticket-close follow.
  The thread terminal is `closed`, meaning the *whole* spine finished
  (maintainer's point). Bonus: this removes the word "implemented" from the
  thread axis entirely, so spec-status `Implemented` and thread disposition can
  never collide (this is what dissolves part of F-4).
- **No bare `closed` / no implicit default reason.** Every terminal is a
  deliberate choice; `closed: done` is written explicitly, symmetric with
  `closed: dropped`. Reason field is mandatory ⇒ uniform parse, no "if absent
  assume done" branch (maintainer's call).
- **No `reopened` event for closed threads.** Closed is sealed; "reopening"
  means **opening a NEW thread** to address the work (see Decision 5). The only
  return-to-life event is `resumed`, and it applies solely to `deferred`, so it
  is unambiguous. (Maintainer chose `resumed` over `reopened` for exactly this
  non-confusion.)
- **Closing reasons collapse to `done` and `dropped`.** `superseded` was never
  really a *closing* reason — a thread abandoned mid-flight in favour of a
  successor is `dropped` with the successor named in the reason text; a thread
  that was already `closed: done` cannot retroactively become "superseded"
  because it is frozen (see Decision 6).

### Decision 5 — the two-level freeze, both hard-guard-enforced

```
deferred         → content frozen; ledger accepts ONLY a `resumed` (or a
                   re-`deferred` to update the reason). Reversible — one door.
closed: <reason> → everything frozen, ledger included. Irreversible — sealed.
                   Resurrection = a new thread (NOT a ledger event).
```

- **Both enforced by the CI/pre-commit guard, not by convention** (maintainer's
  call, for a uniform "frozen means the guard backs it" principle — relying on
  politeness for one freeze and the guard for the other is its own
  inconsistency). The agent had leaned convention-for-deferred; overruled in
  favour of consistency.
- **"Consistency" is at the enforcement-principle level, not the mechanism
  level** — and this distinction must be remembered: a reversible freeze
  (deferred) *must* keep a door (`resumed`/re-`deferred` ledger appends) or it
  is a roach motel; an irreversible freeze (closed) *must* have no door. So the
  guard has branches:
  - last event `closed:` → reject ALL diffs (incl. ledger).
  - last event `deferred` → reject all diffs EXCEPT a ledger-only append of
    `resumed` or `deferred`.
  - last event `resumed`/none → allow everything.
- **The guard checks the pre-image:** a diff is rejected if the thread was
  *already* closed before it; the diff that *adds* the `closed:` line is the act
  of closing, so it is allowed. No chicken-and-egg.
- **Closed-by-mistake is a `git revert`** of the closing commit — a VCS undo,
  not a workflow-level reopen. Workflow `closed` stays cleanly terminal.
- **"Resurrection = new thread" is the proposal's own philosophy extended**, not
  a new idea: §4 already rejects spec-deltas with "a post-implementation change
  is a new thread whose spec supersedes the old one." Decision 5 applies that
  same rule to all closed threads. It also makes the guard's hardest case dead
  simple (closed → reject all, no carve-out) and dissolves the agent's earlier
  F-12 worry (no edit to a frozen artifact is ever needed).
- **Changing a deferred thread's tier requires `resumed` first** (the door only
  passes state events). Tier changes are active-work decisions, so this is fine.

### Decision 6 — `Superseded` dropped from the spec status lifecycle; supersession becomes an optional, plain-language forward link

Spec status lifecycle becomes: **Draft → In Review → Approved → Implemented**
(no `Superseded`).

- Under completely-frozen-closed (Decision 5), `Superseded` was **unreachable**:
  the spec freezes at `Implemented`; supersession happens months later when a new
  thread replaces it, by which time the old thread is sealed and the line can
  never be written. `Superseded` was also a *stored mutable status on a frozen
  doc* — exactly the thing §5's "status is derived, never stored" should have
  killed but didn't. Removing it makes §4 consistent with §5.
- **Supersession is a derived, forward-linked relationship:** the *successor*
  thread's seed may name what it replaces. This forward link is an **optional
  convention** — plain language, no fixed format or location (maintainer's
  call). Rationale: after 100+ threads you often do not *know* at authoring time
  that you are superseding an old thread, so a mandatory structured field would
  be mostly empty or wrong; optionality is honest about authoring-time
  knowledge.
- This is consistent with §13 already **deferring the global decision index**
  until a known decision can't be found — supersession-discoverability is the
  same problem with the same answer. Eyes-open accepted cost: plain prose is not
  machine-mineable, so a future index would need manual retrofit; given the
  knowledge often isn't there at write time, a structured field wouldn't have
  captured much anyway. An optional soft-keyword breadcrumb (a line *starting*
  with "Supersedes"/"Invalidates") was offered as a free future-grep aid but not
  mandated — author's discretion.
- Brushes against the carried-over D44 ban on `Supersedes:` source-relation
  frontmatter; clean resolution to confirm at F-14 (seed format): D44 bans
  *lineage frontmatter on frozen versioned artifacts*; a new, live seed naming
  its predecessor in prose is genesis info, not frontmatter.

### The second, nested freeze survives (NOT dropped by P2) — flagged for F-4

P2 defines the **thread-level** freeze (closed → sealed). The **spec-level**
freeze from §4 ("never edit an `Implemented` spec") is separate and still
needed, because it bites in a window the thread freeze doesn't cover: a spec
hits `Implemented` at finish, but the thread can stay *active* afterward
(verify, code review, follow-ups) — during that window the thread is open
(edits generally allowed) but the spec is already the frozen historical contract
of what was built. So two guard rules coexist: (i) thread `closed:` → seal
everything; (ii) spec status `Implemented` → freeze that spec even inside an open
thread. Full treatment of which statuses freeze which artifact types is **F-4**.

### Rejected alternatives (so they are not re-litigated)

- *Mutable tier/state file (overwritten on change):* loses in-file history,
  reintroduces the silent-downgrade hole. Append-only ledger chosen instead.
- *A dedicated tier file separate from a (mutable) state file:* fragments
  genesis and/or reinvents the ledger twice; one append-only ledger holds both.
- *Conditional ownership (tracker owns lifecycle when present, else local):*
  fragile, network-dependent CLI, non-uniform offline guard; a single permanent
  local owner is simpler to reason about. The repo always owns thread lifecycle.
- *Derive-maximally / store only the truly-irreducible bit (option ii):*
  rejected in favour of ledger-authoritative (option i). (ii) saves writing one
  line at finish at the cost of git/PR introspection in the two places (guard,
  CLI) that most need to stay dumb and offline.
- *Appendable ledger / `reopened` event on closed threads:* rejected — closed is
  completely sealed; resurrection is a new thread.
- *`Superseded` as a stored spec status:* rejected (unreachable + violates
  derived-status).

### Proposal revisions required (to apply in the batched revision pass, all backed by this entry)

- **§3** — add the lifecycle ledger to the thread layout (a separate file;
  location is a DoF).
- **§4** — recast the records-vs-versioned split to cover seed (frozen narrative
  record) + ledger (append-only, carries the live non-derivable facts); drop
  `Superseded` from the spec lifecycle; define the two-level freeze and the
  guard's pre-image check + git-revert-for-mistakes note.
- **§5** — name the lifecycle ledger as the deliberate, litmus-test-bounded
  exception to "status is derived, never stored"; add the litmus test; state
  supersession is a derived forward-link.
- **§6** — seed = frozen narrative only; ledger is a separate artifact; tier and
  disposition live in the ledger, not the seed.
- **§7** — tier is declared and recorded in the ledger; escalation AND
  de-escalation are appended, dated, justified tier lines.
- **§8** — add the three-layer status model; link at the seed, handshake once at
  finish, never continuously mirror.
- **§9 / §14** — the finish skill gains the duty of appending `closed: done` to
  the ledger (feeds F-5).
- **§12** — amend the STATE.md rejection: it stands for *duplicated/derivable*
  state; the minimal non-derivable lifecycle ledger (tier + disposition only) is
  permitted and is not what was rejected.

### Degrees of freedom left open by P2 (decisions welcome later, not blockers)

- Exact ledger filename and location (`seed/` vs thread root).
- Exact line grammar (`tier: <0–3> @ <stamp> — <why>`,
  `closed: done @ <stamp>`, etc.).
- Whether a re-`deferred` (reason update) is permitted, or one must `resumed`
  then `deferred`.
- Whether the optional supersession forward link uses a soft keyword breadcrumb.

## P3 — Per-artifact lifecycle: stored latches + derived condition; `Version:` kept as a cycle counter (fully disposes F-4)

**Context:** §4 only defined "the spec lifecycle." F-4 asked which statuses each
of the three versioned types (proposal, spec, plan) carries, when each freezes,
and what the header `Version:` integer counts. The maintainer then pushed a
sharper question — *do we need a status lifecycle at all, what does it unlock?* —
which reframed the answer.

### The reframe: "status" splits into latches (store) and conditions (derive)

Applying P2's litmus test to the spec status line itself:

- **`Draft` vs `In Review` are derivable** — In Review ⟺ an open (undisposed)
  review exists in the artifact's `reviews/`; otherwise Draft. That is literally
  §5's derived-status rule. Storing them duplicates derivable state.
- **`Approved` is NOT derivable** — a human sign-off event with no other home. It
  is the single most load-bearing fact in V2: the whole plan-autonomy thesis
  ("the spec is the last human-approved artifact → plans auto-derive → I never
  read the plan") is *gated* on a recorded approval. `plan-*-auto`'s prerequisite
  check, the four-outcome adherence review's baseline, and "this is now the
  contract" all key on it.
- **`Implemented` is the artifact-level freeze latch** — the spec becomes the
  frozen historical contract even while the thread stays open for verify/review.

### Decision (maintainer — "pure latch + fully derived condition")

**Authoritative stored state = latches only. The in-flight condition is always
derived, never stored.**

| Artifact | Stored latches (write-once, record-backed, with `@ <stamp>`) | Derived condition | Freezes at |
|---|---|---|---|
| **Proposal** | `Approved` \| `Rejected` | Draft / In Review (from `reviews/`) | the latch (Approved or Rejected) |
| **Spec** | `Approved`, then `Implemented` | Draft / In Review / "+ open findings" | `Implemented` latch |
| **Plan** | *none* | adherence verdict (from `plans/NNN/reviews/`) | thread close only |

**Condition derivation (precise, for the CLI — this is the authoritative rule):**

```
Implemented latch present        → Implemented
else Approved latch present      → Approved  (+ "has open findings" if an
                                              undisposed review exists)
else an undisposed review exists → In Review
else                             → Draft
```

The condition is a pure function of (latches present) + (undisposed reviews
present). Nothing about the condition is stored.

### Why this shape

- **Symmetry with the thread ledger (P2):** freeze always keys on *explicit
  stored facts* — the ledger's `closed:` event, and now the artifact latches
  `Approved`/`Implemented`/`Rejected`. Conditions (active/paused, Draft/In
  Review) are *always derived*. One uniform principle across both layers; you
  never freeze on a fuzzy derived value.
- **§5 held hard:** even an artifact's *self*-status stores only the
  non-derivable. The litmus test now applies everywhere without exception.
- **Latches are sticky:** `Approved` does not revert to In Review when a later
  review opens during planning — that state is derived as "Approved + has open
  findings." Approval is an event that happened; it is not un-happened by new
  findings.
- **Plan carries no status** because no human approves it (§9: disposable
  compiler-IR). Its quality state is the derived machine-adherence verdict, not
  a stored header status. It is edited in place (the auto-fix loop) while the
  thread is active and freezes when the thread closes.

### The proposal-freezes-at-Approved vs spec-freezes-at-Implemented asymmetry (principled, recorded so it is not "fixed" later)

After a spec is `Approved`, downstream stages can still surface spec faults that
route *back and edit the spec* (§9 outcomes 3/4) — so the spec must stay alive
Approved→Implemented, editable ONLY via owner-approved, record-backed amendments
(the outcome-3/4 route is the *only* legal post-Approved spec edit; never "edit
the spec to match the code"). A proposal has no such downstream loop editing it:
once the direction is `Approved`, the spec carries forward and any later "the
proposal was wrong" becomes spec content or a new thread. So the proposal has
nothing left to do after Approved and freezes there.

### `Rejected` is a real artifact-level latch, independent of thread disposition

In a multi-lineage thread (proposal `001` rejected, proposal `002` approved) the
thread is not `dropped` while proposal `001` is definitively `Rejected`. The
artifact latch and the thread disposition (P2) are different axes. (First place
F-6's multi-lineage case bites.)

### `Version:` integer — kept (maintainer agreed)

Counts **completed review→revise cycles**, not individual edits. `Version: 1` =
first content put up for review; after a review's findings are disposed (a
decision log) and the doc is revised in place, it becomes `Version: 2`. Answers
"how many times has this been through the wringer?" Editorial fixes don't bump
it. Each bump is record-backed by construction (a review + its disposing log is
exactly what a cycle is). Git holds fine-grained diffs; `Version:` is the coarse
human milestone marker (matches the pilot's round-counting, minus the abolished
filename encoding).

### Accepted cost / benefit

- **Cost:** a human reading the *raw* file cannot see the in-flight condition at
  a glance — it must be derived (by tooling, or by checking `reviews/`). The
  maintainer accepted this for principle-consistency.
- **Benefit:** zero drift on the condition (a derived value cannot lie), uniform
  §5 across ledger and artifacts, and freeze keyed only on explicit latches.

### Completes the nested freeze (P2's deferred item)

Two layered guard rules, both keyed on explicit facts: (i) artifact latch —
spec `Implemented` / proposal `Approved`|`Rejected` → that artifact frozen *even
inside an open thread*; (ii) thread ledger `closed:` → seal the whole thread
(outer layer).

### Flagged, not resolved here

This thread's own proposal is headed for Approved-then-implement; F-16 asks
whether it doubles as the spec. If the proposal freezes at Approved (rule above)
*and* must serve as the build contract, that is a tension — left for F-16.

### Proposal revisions required (backed by this entry)

- **§4** — express proposal/spec lifecycles as stored latches + derived
  condition (with the derivation rule above); plan carries no status; define the
  two freeze latches; state `Version:` = review-cycle counter; record the
  proposal-at-Approved vs spec-at-Implemented asymmetry and its reason.
- **§5** — state that "derive, don't store" applies uniformly, *including* to an
  artifact's own status: only non-derivable latches are stored; the displayed
  condition is always derived.

### Degree of freedom left open

- Exact header rendering: whether to also show a derived condition word in the
  raw header for human legibility and, if so, how to mark it non-authoritative
  (vs. latches-only and let tooling compute the rest). Presentation detail.

## P4 — Variant and merge semantics under the lineage-folder model (disposes F-6; feeds the `merge-artifacts-*` row of F-5)

**Context:** §3 asserts "multiple lineages and variants remain expressible
without layout changes," but V1 expressed variants in filenames
(`v1-opus-spec.md` → promoted `v1-spec.md`), and V2 abolished that grammar
(versions live in the header; artifacts are `NNN/spec.md`). The assertion was
unbacked: where does a variant live, and what does merge produce with no version
files to bump?

### Decision (maintainer agreed)

**Separate the two needs V1's filename grammar conflated, then route each to
existing machinery:**

1. **Multiple lineages ≠ variants.** *Multiple lineages* = different subjects you
   want to keep (an API spec AND a CLI spec) → sibling `NNN[-desc]/` folders
   (handled by P1; not variants). *Variants/candidates* = competing drafts of
   ONE subject meant to collapse to a single winner (the multi-model bake-off:
   opus vs sonnet vs codex drafting the same spec) → this is the only real
   "variant" concept, and it is draft-stage exploration.

2. **Variants live in `.wip/`, never as emitted siblings.** A bake-off is
   pre-emission draft work — exactly what `.wip/` is for (gitignored, editable).
   Spin up candidates in `.wip/` (`.wip/spec-opus.md`, …), compare, and emit
   ONLY the chosen-or-merged result once as `specs/NNN/spec.md`. Losing drafts
   stay gitignored and vanish from the reviewable record by design.

3. **The rationale is recorded in a decision log** ("compared three drafts, chose
   / merged X because Y"). That is the durable provenance; the losing drafts are
   not immortalized (that was V1's clutter). Git + the log remember the bake-off
   happened and why the winner won.

4. **Merge semantics (also answers F-5's `merge-artifacts-*`):** V1 merge
   produced "the next mainline integer version file." V2 has no version files, so
   merge produces the emitted `NNN/<artifact>.md` from the candidate inputs — or,
   if the canonical artifact already exists, a record-backed in-place revision
   (alive) or a new thread (if frozen, per P2). There is no "next version file."
   Merge = author the canonical artifact from multiple candidate inputs and log
   why; inputs and reasoning live in the disposing decision log / merge record.

### Why this shape

It *removes* machinery (no variant filename grammar, no version-file-per-merge)
by leaning on `.wip/` (transient drafts) + decision logs (rationale). It keeps
the invariant clean: **one subject = one lineage folder; the folder holds exactly
one canonical artifact; competing drafts never pollute the emitted record.**

### Rejected alternative

Emitted candidate files inside the lineage folder (e.g.
`001/spec.candidate-opus.md`): re-imports the clutter and "which is canonical?"
ambiguity the lineage model removes. If preserving a full losing draft is ever
truly needed, quote the relevant part into the decision log rather than blessing
a candidate-file naming convention.

### Proposal revisions required (backed by this entry)

- **§3** — replace the unbacked "variants remain expressible" assertion with the
  lineage-vs-variant distinction; state variants are `.wip/` draft-stage and only
  the canonical artifact is emitted.
- **§14** — `merge-artifacts-*` row: merge emits/revises the canonical
  `NNN/<artifact>.md` (no version-file bump); rationale to a decision log.

## P5 — Completing the §14 skill-change list (partially disposes F-5: Decision A settled; the plan-family question spun out to P6)

**Context:** §14 is a sketch, not a complete list. Cross-referencing the actual
skill inventory on disk surfaced missing rows and two embedded decisions that
cannot be deferred to mechanical implementation.

### Bookkeeping gaps (to be folded into the revised §14 — mechanical, no debate)

These rows are missing or incomplete and will be added; most need only
"thread-V2 paths + tier awareness + output to the target's `reviews/`":

- `propose-*` — lineage-folder output (`proposals/NNN/`); `Approved`/`Rejected`
  latch (P3); tier awareness.
- `review-proposal-*` — output → proposal's `reviews/`; references-first format;
  consistency-with-decision-logs check (same upgrade as `review-spec-*`).
- `review-code-*` — output → `implementation/reviews/`; thread-V2 paths.
- `merge-artifacts-*` — P4's resolution.
- `finish` — **substantive new behavior, not just paths:** append `closed: done`
  to the ledger (P2); set the spec's `Implemented` latch (P3); update living docs
  (§5); close the ticket.
- `whats-next` — becomes the derived-status reader (the CLI precursor): reads the
  ledger (tier + disposition) and derives spine position + open findings to
  answer "what now / what next / is it closed" (P2/P3).
- `take-snapshot`, handoff skills, research skills — "all"-row only (tier
  awareness + thread paths where they touch threads); likely no deeper change.

### Decision A (settled — maintainer agreed): records immutable by default, human-authorized in-place edits permitted but visibly marked

Reconciles the `discussion` skill's v1.3.0 "update past logs on explicit user
request" with §4's append-only rule. **Records are immutable by default — no
agent edits them on its own — but the human owner may authorize an in-place
correction, which MUST be visibly marked (an erratum/edit note) so the change is
auditable, never silent.** This is exactly what was done in P1 (the
owner-authorized, inline-marked path fixes). The append-only discussion-loop log
keeps its stricter rule (append `P<N>` entries; never rewrite prior ones) except
under that same marked, owner-authorized correction.

Proposal revision: §4 — state the immutable-by-default + marked-owner-correction
rule for records; §14 — `discussion`/`seeded-discussion` row notes it.

### Decision B (deferred to P6 by maintainer's choice): the plan skill family

The inventory has six plan skills: `plan-loose-{auto,interactive}`,
`plan-strict-{auto,interactive}`, `adjust-plan-granularity-{auto,interactive}`.
The agent proposed: (B1) remove all `-interactive` plan skills (executes §9's
"a plan needing human input means the spec is at fault"); (B2) collapse
`plan-loose-auto` + `plan-strict-auto` into one `plan-auto` governed by the
spec's Degrees-of-freedom section (which is the loose/strict dial, now per-spec
instead of per-skill); (B3) retire `adjust-plan-granularity-*` (granularity
follows the spec's DoF; wrong granularity is a regenerate or a spec-clarity issue
the four-outcome review routes back). Noted asymmetry: `plan-*-interactive` dies
but `implement-interactive` lives (human-driven implementation is legitimate;
human-driven planning is not). **The maintainer chose to take the whole plan
family (B1+B2+B3) as its own deep-dive point — P6 — rather than settle it here.**

## P6 — The plan skill family (deep dive; completes F-5; reframes §1/§9/§12)

**Empirical grounding (agent read all three `-auto` skills first):**
`plan-loose-auto` and `plan-strict-auto` are ~90% identical — same Inputs, Plan
Artifact Contract, No-Parallelization rules, Self-Review, Workflow, filename
grammar — differing ONLY in the "Body Shape" section (loose = 1–3 sentence
tasks for a human-leaning implementer; strict = six fields per task for an
agent-leaning implementer). `adjust-plan-granularity-auto` takes an EXISTING
plan + a target instruction (looser/stricter/etc.) and emits a granularity-
shifted plan; its V1 design centers on immutability (read-only source, emit a
new `v<N+1>` version).

### Decisions (maintainer overruled all three of the agent's proposals)

**B1 — KEEP `plan-*-interactive` (reverses §9/§1.6/§12).** The system is usable
by two people. "The spec is the last artifact the human authorizes" is the
maintainer's *personal* default, not a rule to force on a second user. So plan
autonomy is reframed from a **law** to a **recommended default**: the workflow
is optimized for spec-as-last-approval (and the machine-checkable-AC +
Degrees-of-freedom preconditions make autonomy *safe* when chosen), but
human-in-the-loop planning remains a supported option. The four-outcome
machine adherence review is mode-agnostic (it checks plan-vs-spec however the
plan was authored), so it is unaffected.

**B2 — KEEP `plan-loose-*` and `plan-strict-*` separate.** They are
parameter-like (differ in one section), and unifying two skills into one via a
flag is exactly what the maintainer's "skillrouter" project was built to do —
that is a deliberate *next step*, not a V2-now change. The current architecture
has no flag mechanism; collapsing now would mean inventing one or losing a
capability. Defer unification to skillrouter.

**B3 — KEEP `adjust-plan-granularity-*`. The agent's proposal to retire it was
wrong; the maintainer corrected it.** Agent error: conflated "where the output
lands" (V2 *does* change this — in-place edit of a living plan, not a new
immutable version file) with "is the skill needed" (yes). The decisive point:
`adjust-plan-granularity`'s **input is an existing plan, not a spec** —
`plan-auto`/`plan-interactive` generate a plan FROM a spec; `adjust-...`
TRANSFORMS an existing plan. Regenerating from the spec is a different operation
that discards the existing plan's structure. Different inputs, different jobs,
two skills. The only V2 change is mechanical (edit the living plan in place,
record-backed, instead of emitting `v<N+1>-<descriptor>-plan.md`).

### Net disposition

All SIX plan skills retained: `plan-loose-{auto,interactive}`,
`plan-strict-{auto,interactive}`, `adjust-plan-granularity-{auto,interactive}`.
Every one gets the V2 mechanics: lineage-folder output (`plans/NNN/plan.md`),
alive-in-place (not immutable version files), no stored status and no `Version`
header (P3 — plan is the one type with neither), thread-V2 paths, tier
awareness.

### Proposal revisions required (backed by this entry)

- **§1 (item 6)** and **§9** — soften plan autonomy from "plans are reviewed by
  machine, never by the human; `plan-*-interactive` removed" to "plan autonomy
  is the recommended default (with its AC + DoF preconditions); interactive
  planning is retained as a supported option." Keep the four-outcome adherence
  review as mode-agnostic.
- **§12** — remove the `plan-*-interactive` rejection row.
- **§14** — plan rows: all six skills retained (not "removed"); each gains V2
  mechanics; `adjust-plan-granularity-*` changes output-mechanics only (in-place
  edit of the living plan, record-backed) and is explicitly NOT retired.

This completes F-5 (the deferred plan-family half of it) and P6.

## P7 — Derived status as event sourcing; the frontmatter status contract (disposes F-7; revises P3 and the original P7 mechanism)

This point started as F-7 ("make derived status mechanically checkable") and,
through several rounds of maintainer pushback, became the second keystone of the
review (after P2). Logged in full, journey included, because it sets the
status/immutability contract every artifact obeys.

### The journey (why the conclusion is what it is)

1. Agent's first proposal: a disposing record carries `Disposes: <review-path>`;
   "open = no record names it." Mechanical-ish, but tied disposition to a
   *disposing record* (a decision log).
2. Maintainer pushback #1: *"What if I reject a review? What if I accept and fix
   it without a discussion log?"* — exposed that the disposing-record approach
   was too narrow: rejection and direct-fix produce no decision log, so the
   review would look eternally open.
3. Agent broadened: "disposing record" ≠ "discussion log"; it can be a one-line
   reject note or the revision's backing record; recommended (not enforced)
   naming + a timestamp heuristic fallback.
4. Maintainer pushback #2: *"Fully mechanical or drop tracking entirely — the
   heuristic middle is unacceptable for a CLI-managed system. Is STATE.md really
   bad? What about an event log? What's the common practice?"*
5. Agent named the pattern: **event sourcing / CQRS.** Truth = append-only
   events; current state = a projection (left-fold); never store a mutable
   current-state you can derive. V2 is *already* event-sourced — the events are
   distributed across the ledger (P2), the latches (P3), and the records. Only
   ONE event type (review disposition) lacked a home.
6. Maintainer's decisive insight: the spec carries its own status (latches),
   but a review's status lived in a *different* document — an asymmetry. Plus
   "I don't always want a discussion." Proposed: put the status on the artifact
   itself, and use **frontmatter** so that a locked document keeps an immutable
   body but a still-updatable status surface.

### The architecture (settled): event sourcing, no materialized state file

- **Truth is append-only events; current state is a projection (fold); never
  store a derivable mutable current-state** (that is the drift disease). V2
  already follows this — "status is derived, never stored" (§5) IS event
  sourcing stated as a principle.
- **STATE.md/json stays rejected** as a *stored, authoritative, mutable
  current-state* (it materializes derivable state → two sources → drift). The
  append-only ledger (P2) is NOT STATE.md (append-only events, non-derivable
  facts only). A separate `events.jsonl` is also rejected: V2's specs/plans are
  *authored primary documents*, not event projections, so a parallel log would
  duplicate the lifecycle facts they already carry → drift.
- **`state.json` skipped for now** (maintainer): the projection is useful only
  to the future CLI, which computes it in memory; materializing a file buys
  nothing today. The CQRS read-side (generate a projection on demand) remains
  available later if ever needed, but is not built now.

### The decision: the frontmatter status contract

**Every artifact carries its own lifecycle status in YAML frontmatter. The
frontmatter stores ONLY non-derivable latches/events — never the derived
condition.** So P3's and P7's "derive, don't store" holds; we relocate *where
latches are stored* and make storage uniform across artifact types.

| Artifact | Frontmatter (stored latches/events — the only stored status) | Still DERIVED (never stored) |
|---|---|---|
| Spec | `approved: <stamp>`, `implemented: <stamp>` | Draft / In Review / has-open-findings |
| Proposal | `approved` \| `rejected` (with stamp) | Draft / In Review |
| **Review** | `disposed: <stamp>`, `disposition: accepted \| rejected`, optional `rationale: <repo-relative-path>` | — |
| Plan | none | machine adherence verdict |

Exact field names/syntax are a §15 degree of freedom; the table is the intent.

### What this revises

- **Revises P3:** the spec/proposal latches move from the prose `Status: …`
  header to **YAML frontmatter**. Same principle ("the artifact carries its own
  latches"), better location (machine-parseable; conventional — SKILL.md files
  already use frontmatter). Still latches-only; the condition is still derived.
- **Revises the original P7 mechanism:** disposition moves from `Disposes:` in
  the disposing record to **`disposed` in the review's own frontmatter.** The
  review becomes self-contained; **no discussion is required to dispose a
  review** — set its frontmatter directly. A discussion, if one exists, is
  optional rationale (linked via `rationale:`), never the authoritative status.
  One source, no drift. The fuzzy "findings appear in a decision log" derivation
  (§5) is gone — disposition is now a parsed frontmatter field.

### How the two cases the maintainer raised now work

- **Accept + revise (no discussion wanted):** revise the target (record-backed
  per §4/F-8), then set the review's frontmatter `disposed: <stamp>`,
  `disposition: accepted`, optionally `rationale:` → the revision/commit. No
  separate discussion document.
- **Reject:** set the review's frontmatter `disposed: <stamp>`,
  `disposition: rejected` (rationale optional). The review is closed; no separate
  document. (A rejection remains a decision; the optional `rationale` link or a
  one-line note preserves the "why" for a future reader when it matters.)
- **CLI:** "open review?" = a review whose frontmatter has no `disposed` field.
  Fully mechanical — parse frontmatter, no grep of prose, no heuristic.

### The immutability refinement this requires (§4) — body vs frontmatter

> **Body obeys immutability; frontmatter is the status surface.** A *record's*
> body (finding text, decision text) is frozen at emission — history, never
> rewritten. Its *frontmatter status* is mutable until the record reaches its
> terminal status (a review: until `disposed`), then frozen. *Versioned
> artifacts* (spec/proposal) keep body + frontmatter alive together until
> `Approved`/`Implemented`, then freeze.

- The one genuinely new concept is narrow: a record's frontmatter status can be
  set (e.g. `disposed`) even though its body is frozen. The "don't rewrite
  history" guarantee holds for content; only the lifecycle bit updates, and git
  tracks that change.
- **Disposition is set-once** (maintainer's call, confirmed): changing your mind
  = a new review or a thread reopen, not a frontmatter flip-flop.
- **Guard unaffected:** closed thread → no edits (frontmatter included);
  record-body immutability stays the convention + marked-owner-correction rule
  (P5); frontmatter status updates are normal edits allowed in an open thread.

### D44 carve-out

- **Lifecycle-status frontmatter is now ALLOWED** (it is the status surface):
  the closed-vocabulary fields above.
- **Source-relation / lineage frontmatter stays BANNED** (`Supersedes:`,
  `Forked from:`, etc.) — P2 already relocated supersession to forward-links.
  The carve-out is precise: status latches yes, lineage no.

### Bonus: dissolves the plan-review wrinkle flagged in the WHERE discussion

The earlier worry — "plan reviews have no `discussions/` folder to hold their
`Disposes:`" — disappears. A plan review carries its disposition in *its own
frontmatter*, independent of what folders its target has. Strictly more uniform.

### Proposal revisions required (backed by this entry)

- **§3** — artifacts and records carry a YAML frontmatter status block; note the
  D44 carve-out (status frontmatter allowed, lineage frontmatter banned).
- **§4** — the body-vs-frontmatter immutability rule; latch storage = frontmatter;
  disposition set-once; guard unaffected.
- **§5** — derived status is event-sourced: state is a projection folded from
  append-only events (latches in frontmatter, ledger events, records);
  disposition is the review's `disposed` frontmatter field (mechanical), not a
  fuzzy content match; STATE.md and separate event-log both rejected with
  reasons; `state.json` projection deferred.
- **§9 / §10** — review disposition is recorded on the review's frontmatter
  (accepted/rejected), not by folder moves or a mandatory disposing record;
  reviews remain in the target's `reviews/`.
- **§14** — `review-*` skills set/read frontmatter status and may emit a review
  pre-stamped for disposition; `discussion`/`seeded-discussion` may carry an
  optional `rationale` cross-link but no longer own disposition status; all
  status-bearing skills read/write the frontmatter contract.

### Dogfooding note (no mid-flight action)

Under this contract, this thread's review
(`proposals/001/reviews/260612200042Z-proposal-v1-review.md`) gets `disposed:`
frontmatter once all its findings are resolved. The decision log's existing
`Disposes:` header line becomes harmless rationale cross-linking, not the
authoritative status. Applied at the end of the loop, not now.

### Degree of freedom left open

- Exact frontmatter field names and syntax (the table above is intent, not
  normative spelling).

## P8 — Calibrating "every revision must be driven by a record" (disposes F-8)

**Context:** §4's "every revision must be driven by a record," read literally,
makes a typo fix in a Draft spec require a decision-log entry — absurd and
heavier than V1. The rule has a real purpose (capture the *why* of changes to
something that matters), so it is calibrated, not deleted.

### Decision (maintainer agreed): the record obligation keys on the `approved` latch + substance

| Stage | Substantive change | Editorial change (typo/formatting, no semantic shift) |
|---|---|---|
| Draft / In Review (pre-`approved`) | no per-edit record — it is *authoring*; git holds the evolution, what goes *in* is justified by the feeding discussions, and review-driven revisions have the review as their context | git alone |
| Approved → not yet Implemented | **record-backed + owner-approved amendment** | git alone, **marked** per P5's owner-correction rule |
| Implemented | frozen — no edits (P7) | frozen |

**Logic:** before `approved` an artifact is not a contract — it is authored;
the rationale for its Draft content lives in the **feeding discussions**, not in
per-edit records, and review cycles already produce reviews + dispositions (P7)
as the records for review-driven changes. After `approved` the artifact is a
human-signed contract, so a *substantive* change needs its why captured and
re-approved (§4's existing "owner-approved, record-backed amendment", scoped
precisely). Editorial fixes never need a record; past `approved` they are marked
per P5 so the touch is auditable.

**Preserves §4's auditability selling point** rather than weakening it:
"record-backed changes beat mute version files" applies to the *contract regime*
(post-`approved`) — exactly where V1 did version-file-per-revision. Before
approval there was never a version to audit anyway.

### Proposal revision required (backed by this entry)

- **§4** — scope "every revision driven by a record" to *substantive changes of
  an Approved (not-yet-Implemented) artifact*; Draft/In-Review authoring rides on
  git + feeding discussions; editorial fixes ride on git (marked if
  post-Approved); Implemented is frozen.

## P9 — Calibrating the lossless-mapping review's bar (disposes F-10)

**Context:** §9's authoring constraint and §10's lossless-mapping review, read at
*sentence* level, would flag every derived AC, restatement, and structural
choice — pure noise. The TODO names the right unit: decisions and assumptions.

### Decision (maintainer agreed)

1. **The unit is a decision or an assumption — never a sentence.** A spec
   legitimately elaborates discussed decisions into prose, structure, and derived
   ACs; restatement/organization/formatting are never flagged.
2. **Flaggable item test:** spec content that commits to a choice among
   alternatives (a decision) or presupposes something not established (an
   assumption) that the user *neither* saw-and-accepted in the discussions *nor*
   the spec explicitly declares a **Degree of Freedom.**
3. **The DoF section is the pressure valve** — anything marked a granted Degree
   of Freedom is "not decided here," so it cannot be a smuggled decision. The
   writer's escape for any specific they don't want to pin down: discuss it, or
   mark it DoF. This is why F-10 binds §9 (prevention: discuss-or-free) and §10
   (detection: flag the rest) as one invariant from two sides.
4. **Output (per TODO), empty = pass:** (a) decisions/assumptions in the document
   the user never explicitly saw and accepted (and not declared DoF);
   (b) decisions the user made in discussions that the document failed to capture.

**Worked illustration recorded:** spec says "returns 429 after 100 req/min" but
the user discussed only "rate limiting" → the review flags those two smuggled
specifics; the writer confirms them with the user or moves them to DoF. That
"nagging" is the forcing function, not noise — at sentence-level it is useless,
at decision-level it is the one check protecting the human in the world where
they stop reading plans (§10).

**Scope:** the review is general (any document produced from discussions, not
just specs); the DoF valve applies wherever the document has a DoF section,
otherwise the bar is decisions/assumptions vs discussed content.

### Proposal revisions required (backed by this entry)

- **§9** — state the spec authoring constraint at the decisions/assumptions level
  with the discuss-or-mark-DoF escape.
- **§10** — define the lossless-mapping review's bar as decisions/assumptions (not
  sentences), with the DoF pressure-valve and the two-section output.

## P10 — PR-per-thread reconciled with tiers; enforcement deferred (disposes F-11)

**Context:** §13's "PR-per-thread discipline, even solo" collides with the tier
system — tier 0 has no thread, tier 1 is near-zero ceremony. (Per the review,
this came from session 2's terse summary, so calibrating it is fair game.)

### Decision (maintainer): scale the PR by tier; do NOT mechanically force it for now

| Tier | PR |
|---|---|
| 0 — chore | none (no thread; the commit is the record) |
| 1 — patch | recommended |
| 2 — feature | **strongly recommended** (it is where code review + AC-coverage verification live — the §13 tier-2 DoD) |
| 3 — initiative | strongly recommended (often several, for phased work) |

The "even solo" spirit is preserved: the point is *don't skip the PR at the
tiers where review matters just because you are working alone* — not "every
chore gets a PR."

**Enforcement: deferred.** The maintainer explicitly does NOT want to force the
PR now — it is a **strong recommendation** (prose / Definition-of-Done), not a
mechanically blocked requirement. CI forcing can be added later if it proves
needed (same "build mechanism when the pain is real" posture as §13's deferred
decision index and postmortems).

### Recorded for when/if forcing is wanted later

- **The differentiator:** a *requirement* is machine-checked (guard/CI blocks
  merge); a *recommendation* lives only in prose. RFC-2119 keywords
  (MUST/SHOULD/MAY) are available terminology to mark which is which, with MUSTs
  backed by the guard where mechanically checkable. (Not adopted workflow-wide
  now — the maintainer did not ask for that; noted as available.)
- **How forcing would work:** branch protection (no direct push to `main`) + a
  required CI check that **reads the thread's tier from the ledger** and fails
  the merge if a tier-≥2 thread's change is not in a reviewed PR. The skills
  cannot force anything (they are instructions); teeth come from the VCS
  platform. In a bare solo repo with no protection, even a forced rule degrades
  to a bypassable local flag — so the workflow provides the *check*, the repo
  provides the *teeth*.
- **Connection to P2:** this is *why* the tier is stored in the ledger — a
  tier-aware CI gate needs to read it; a derived tier could not gate anything.
  Same stored fact, second consumer.
- **Distinction worth keeping:** V2's one committed mechanical guard is the
  closed-thread freeze guard (P2 — protects *correctness*, i.e. don't corrupt
  frozen records). The PR gate is *process* hygiene and is deferred. V2
  mechanically guards correctness, treats process as recommendation (for now).

### Proposal revisions required (backed by this entry)

- **§13** — reframe "PR-per-thread, even solo" as a tier-scaled **strong
  recommendation** (none@0, recommended@1, strongly-recommended@≥2), not a forced
  rule; note CI forcing is a deferred option that would read the ledger tier.

## P11 — V2 filename grammar, token vocabulary, and ambiguity resolution (disposes F-13)

**Context:** V1's `v<N>` versioned-form grammar (D42/D46/D47) is dead under V2
(P1/P3/P4); `inbox-item` and `review-finding` lost their homes (P2/P7); new
tokens are in use. This codifies the successor for `docs/workflow/v2/`.

### Decision (maintainer fully agreed, incl. token names)

**Filename grammar — two forms:**

- **Versioned artifacts** (proposal/spec/plan): NO stamp, NO `v<N>` in the
  filename. The file is `<type>.md` inside its lineage folder
  `<types>/NNN[-<desc>]/` (P1, P4). The folder `NNN` is the stable identifier;
  the version lives in the frontmatter `version` field (P3; plans carry none).
  The entire `v<N>[-descriptor]` filename machinery (D42/D46/D47) is removed.
- **Records** (discussion/decision-log/review/seed/implementation-report/…):
  unchanged from V1 — `<YYMMDDHHMMSSZ>-<kebab-desc>-<artifact-type>.md`, mandatory
  type token, in the appropriate folder.
- **Lifecycle ledger** (P2): a fixed-name append-only file; exact name/location
  remains the P2 degree of freedom.

**Token vocabulary:**

- Keep: `proposal`, `spec`, `plan` (now the whole short filename `<token>.md`),
  `discussion`, `decision-log`.
- Add: `seed`, `review` (replaces `review-finding`), `implementation-report`,
  `notes`. (Token names `review` and `implementation-report` confirmed.)
- Remove: `inbox-item` (inbox deleted, P2), `review-finding` (→ `review`).
- The list stays "documented but not exhaustive"; new tokens declared by the
  owning skill. Dogfooding check: this thread already uses `seed`, `notes`,
  `discussion`, `review`, `decision-log` correctly.

**Ambiguity resolution — D49 shrinks:** V1's "ask the user; no 'latest'
algorithm" existed mostly to resolve which version/variant is current. V2
structurally eliminates that: "which version is current?" is gone (one alive
`spec.md` per lineage, version in frontmatter); "which variant won?" is gone
(variants are `.wip/` drafts, only the winner emitted, P4). **What survives:**
genuinely multiple lineages of one type in a thread (`specs/001-api/` vs
`specs/002-cli/`) → "the spec" is ambiguous → ask. And cross-thread references.

### Proposal revisions required (backed by this entry)

- **§3** — versioned artifacts are `<type>.md` in lineage folders (no `v<N>`);
  records keep the stamped form; the token vocabulary above.
- **§16 / implementation** — `docs/workflow/v2/` codifies the filename-grammar
  successor doc + the immutability/lifecycle doc reflecting all of the above;
  the V2 token list replaces V1's.
- (D49 successor) — state the shrunk ask-on-ambiguity rule (multi-lineage only).

## P12 — What may live in `seed/`; ledger location resolved (disposes F-14; resolves the P2 ledger-location DoF)

**Context:** this thread's `seed/` holds the seed, a `…-notes.md` (TODO copy), and
`discussions/` (the handoff), but §3's tree showed only seed + `discussions/`, so
the notes file had no covering rule.

### Decision (maintainer agreed)

**`seed/` is the genesis bucket; it may contain exactly three kinds of thing:**

1. **The seed** — `<UTC>-<desc>-seed.md`, exactly one (the mandatory genesis
   artifact).
2. **Genesis source material** — immutable records carrying the raw
   inputs/provenance the thread was born from (copied notes, external doc,
   handoff brief). Record grammar, appropriate token (`notes`, `discussion`, …).
   Exists because "a discussion can't start from nothing" (§6).
3. **`discussions/`** — genesis discussions targeting the seed.

No `reviews/` under `seed/` (the seed is a 3-line genesis record, not a reviewed
artifact). This is exactly what the thread already dogfoods.

**Ledger location (resolves the P2 DoF): the lifecycle ledger lives at the THREAD
ROOT, not in `seed/`.** It is thread-level state evolving over the whole thread's
life (tier + disposition), not genesis — so it belongs where it is most
discoverable and where a CLI looks first (`<thread>/<ledger>`).

### Proposal revisions required (backed by this entry)

- **§3** — `seed/` may hold the seed + genesis source material + `discussions/`
  (no `reviews/`); the lifecycle ledger sits at the thread root.
- **§6** — note genesis source material may accompany the seed.

## P13 — `EXAMPLE-WORKFLOW/` retirement is an external-workspace action (disposes F-15)

**Context:** `EXAMPLE-WORKFLOW/` is NOT in this repo (confirmed — untracked in the
external `appaltiav2` workspace). §2 cites it as Exhibit A (quoted evidence,
fine), but §14/§16 schedule its "retirement" as if it were a step in this repo's
rollout.

**Decision (maintainer agreed):** §16 clarifies that retiring
`EXAMPLE-WORKFLOW/` is an action in the `appaltiav2` workspace, not in the skills
repo; this repo's rollout is "author `docs/workflow/v2/` + update skills."

**Proposal revision:** §16 — note the retirement is external-workspace scoped.

## P14 — This thread runs the full tier-3 spine: the proposal is the design, a SPEC is the build contract (disposes F-16)

**Context:** the seed declares tier 3; §7's tier-3 row lists proposal → spec →
plan; the handoff's stated plan was proposal → Approved → implement directly,
skipping the spec. First V2 thread → precedent-setting. Two options were weighed:
(A) produce a spec (full spine); (B) the proposal doubles as the build contract,
declared explicitly (tier artifacts as a ceiling).

### Decision (maintainer — option A; agent agreed, reversing its initial B lean)

**The proposal and the spec are different altitudes, not the same content
twice:**

- **Proposal** = the argued *design* (why V2, what changes, evidence, rejected
  alternatives, traceability) — rationale-heavy.
- **Spec** = the *build contract* (exactly which `docs/workflow/v2/` files to
  author with what rules; exactly which skills change with what behavior +
  version bumps; acceptance criteria; degrees of freedom) — flat, checkable,
  handoff-grade.

The maintainer's reframe — *"the goal of this conversation is to discuss the
proposal and its review to create a final spec"* — is the spine's
`[proposal] → discussion → spec` path exactly. A is chosen because it:

1. consolidates the 14 scattered decision-log entries (several reversing proposal
   claims — P6, P7) into one coherent contract, instead of a patched-palimpsest
   proposal;
2. dogfoods the full tier-3 spine and gives the lossless-mapping review (§10) its
   natural first target (spec vs proposal+log);
3. follows §7 as written — no "collapse" loophole or declaration machinery; A is
   the lower-change, simpler-rule option.

**Discipline (so A is not duplication):** the spec must be the *buildable
contract* (concrete file/skill checklist + ACs + DoF), translating the design —
not re-narrating the proposal's argument.

### Resulting path (sets the thread's remaining sequence)

```
finish discussion (nits F-17–19 + §18)
  → revise proposal in place per this log → mark Approved (proposal freezes, P3)
  → author the SPEC (build contract) from the approved proposal + decision log
  → lossless-mapping review of the spec vs proposal+log
  → spec Approved
  → implement: author docs/workflow/v2/ + update skills per the spec
```

### No proposal revision required for the tier rule

A follows §7 as written; no change to the tier-artifact rule. (Had B been chosen,
§7 would have needed a "collapse" clause.) The proposal's §16 rollout may note
this thread itself produces a spec as the build contract.

## P15 — The three nits (disposes F-17; F-18 and F-19 confirmed pre-resolved)

**F-17 (real fix):** §7's tier-0 criterion "no behavior change" contradicts its
example "dep bump" (dep bumps routinely change behavior). Keep the criterion;
swap the example to genuine no-ops (typo, comment, formatting, local rename). A
behavior-changing dep bump is tier 1. → **§7 example edit.**

**F-18 (mooted by P6):** the finding assumed plan-interactive was removed
("plan is auto-only — does `-auto` still discriminate?"). P6 KEPT
`plan-*-interactive`, so plan is not auto-only and the `-auto`/`-interactive`
suffix discipline stays as-is. No action.

**F-19 (resolved by P1):** the worry that stampless lineage folders sort
alphabetically is resolved by P1 making them `NNN[-<desc>]/` — numbered, sorting
in creation order. The folder carries no UTC stamp by design (it is the stable
identifier; records inside carry stamps). No action.

**Proposal revision:** §7 — swap the tier-0 example for a true no-op.

## P16 — The proposal's §18 open questions (all four disposed)

All four follow from prior decisions; no new tensions.

**Q1 — who flips `Approved → Implemented`:** the **human** sets `Approved` (the one
human-gated latch); the **finish skill** sets `Implemented` together with the
ledger `closed: done` (one finish action, §9). The CI guard never *sets* status —
it reads latches/ledger to enforce freeze. (From P2/P3.)

**Q2 — tier-0 trace:** none beyond the commit. This repo uses Conventional
Commits, so the commit `type(scope)` is the lightweight mineable trace; adding a
thread/ledger to tier 0 defeats its purpose. Build mining only if it becomes
painful.

**Q3 — seed owner field:** no. Ownership is work-management → the tracker's job
(ticket assignee); the seed's `External:` links it. Solo owner is trivially the
user. An owner field would duplicate the tracker (drift) and fail the ledger
litmus test (P2's three-layer model).

**Q4 — lossless-mapping review cadence:** a **strong recommendation at tier ≥2,
run before the spec is `Approved`** (it earns the approval), part of the tier-2
Definition of Done as a recommendation — NOT mechanically forced (consistent with
P10's posture). On demand otherwise. Dogfooded by P14.

**Proposal revisions required (backed by this entry)**

- **§18** — replace the open questions with these resolutions (or fold them into
  the relevant sections: Q1→§4/§9, Q2→§7, Q3→§6/§8, Q4→§9/§10/§13).

---

## Discussion complete

P1–P16 dispose every review finding (F-1…F-19) and the proposal's §18 open
questions. Keystones: **P2** (thread lifecycle ledger; derived status; freeze
model) and **P7** (event-sourced status; the frontmatter contract). Next per
**P14**: revise the proposal in place per this log → mark Approved → author the
spec (build contract) → lossless-mapping review → spec Approved → implement
(`docs/workflow/v2/` + skill updates).

Dogfooding cleanup pending (P7): once the proposal-revision phase begins, this
thread's review gets `disposed:` frontmatter, and the decision log's `Disposes:`
header is reclassified as rationale cross-linking (not authoritative status).

---

## Post-revision convention cleanup (P17–P20)

Small convention refinements the maintainer raised before the first commit, while
finalizing the thread's artifacts. Nothing is committed yet (the whole thread is
untracked), so this is draft-finalization, not a rewrite of emitted history — the
immutability clock effectively starts at the first commit. All four are Draft-stage
proposal edits (P8: no per-edit record obligation pre-`approved`); recorded here for
traceability and applied across the thread's artifacts in one pass.

### P17 — Within-thread path references are thread-relative

Refines §10's "repo-relative" (from the TODO) to: **within-thread references are
relative to the thread root** (`proposals/001/discussions/…`), so a thread can be
moved or archived without breaking its internal links; **cross-thread / external
references are repo-relative** (`docs/threads/<other>/…`, `docs/workflow/v1/…`),
never absolute. The maintainer's reasoning: a full-from-`docs/` path breaks if the
thread is relocated (e.g. archived), but a thread-relative one survives because a
thread's internal structure is stable. Applied: the review's `rationale` frontmatter
and its `## References` within-thread paths normalized; the v1-docs references left
repo-relative (correct — cross-location). **Proposal:** §3 (new "Path references"
rule) + §10.

### P18 — One timestamp standard: `YYMMDDHHMMSSZ` everywhere

Every timestamp — filename or frontmatter — uses the `YYMMDDHHMMSSZ` UTC stamp
grammar and always marks an *event*; no extended-format dates, no standalone
creation-date fields. The single viable standard, since filenames cannot carry
extended ISO. Applied: the proposal's `date: 2026-06-12` dropped (see P19); the
review's `disposed: 260615213117Z` already conformed. **Proposal:** §3 (new "One
timestamp standard" rule).

### P19 — Frontmatter holds status + `version` only; nothing derivable

The `thread:` field is dropped from the proposal frontmatter — it is derivable from
the file's own path (the §5 litmus test: derivable ⇒ not stored) and a stored copy
would drift on a thread move. `date:` is dropped too (creation *order* is the `NNN`
lineage number, precise time is git — P18). The proposal's frontmatter is now
`version: 2` only. **Proposal:** §3 (frontmatter rule tightened). *(These were
carried over unscrutinized by the revision session from the original prose header;
neither was a decided field.)*

### P20 — Prose-vs-frontmatter split made explicit (already implied by §3 / P7)

Frontmatter is the **status surface only**: lifecycle latches
(`approved` / `implemented` / `disposed` / `disposition`) plus `version` on
versioned artifacts. A record with no lifecycle status (decision log, seed, genesis
notes, discussion) carries **no frontmatter at all** — confirming this very log is
correct to have none. Everything non-status (references, targets, cross-links,
agendas) lives in prose. **Proposal:** §3 (made explicit).

> Note: this decision log's own in-body path references predate P17 and are left
> as-is — normalizing an 1100-line append-only record would be churn for no value.
> P17 governs new references.

### P21 — This thread self-migrated to the V2 ledger model (the standard-setting exception)

The maintainer confirmed the §16 grandfather policy: **old (pre-V2) threads are
never migrated — they stay in V1 format, and that is fine.** The one exception is
**this** thread, the one that establishes the V2 standard, brought into full V2
conformance for clarity and as the worked example. Applied (pre-commit
draft-finalization):

- Created the thread lifecycle ledger `lifecycle.md` at the thread root (§4),
  carrying `tier: 3 @ 260612174045Z — …`; disposition is `active` (the default,
  unwritten). Filename/grammar are provisional (the §15 DoF), to be ratified by
  the V2 spec.
- Removed the `Tier: 3` line from the seed, so the seed is now a clean V2
  frozen-narrative record (§6) — tier lives only in the ledger; the genesis
  narrative is otherwise untouched.

Bonus: this exercises the ledger format on a real thread before the spec codifies
it — dogfooding feedback for the spec phase.
