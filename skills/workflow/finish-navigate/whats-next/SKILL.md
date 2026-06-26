---
name: whats-next
description: Read a thread's state — ledger, lineage folders, and frontmatter status latches — and fold it on demand to answer "what now / what next / is it closed", then suggest coherent next actions when the user wants a quick map after completing work, hitting uncertainty, or getting stuck.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.1
---

# What's Next

Read the active thread's state READ-ONLY — its ledger, its lineage folders, the
frontmatter `status:` latches on its artifacts, and recent commits — then FOLD that
state on demand to answer three questions IN CHAT: **what now**, **what next**, and
**is it closed**. Then suggest 2–4 coherent next actions. The chat reply IS the
deliverable. The skill writes NO artifact and never modifies anything it reads.

## This Skill Is the Derived-Status Reader (a CLI Precursor)

This skill is the workflow's **derived-status reader**. State in this workflow is
**derived, never stored — the workflow is event-sourced.** Truth lives in append-only
events (each artifact's frontmatter `status:`-map latches, the thread's ledger, and
the records themselves); current state is a **projection folded from those events on
demand**, never a stored mutable current-state file. There is NO `STATE.md`, no
`events.jsonl`, and no materialized `state.json` to read — those were all considered
and rejected as drift-prone stores of derivable state. `whats-next` IS the on-demand
fold, done for a human reader.

State this plainly when you answer: a future status CLI (and its in-memory
`state.json` projection) that would generalize this fold is **deferred and is NOT
built here**. `whats-next` is the human-facing on-demand reader that such a CLI would
later generalize. You compute the answer by parsing the thread every time — you do not
read or write any cached state.

## Anti-Sycophancy Stance

Your job is to help the user identify the right next action given the current thread
state, not to make them feel good about whatever they suggest. Treat the advisory pass
as a mutual attempt to get closer to the truth: you may be missing context, the user
may be missing consequences, and either side may notice something the other
overlooked. Sycophancy is a costly failure mode here — recommending a "next action"
that ignores an open review finding, an unaddressed blocker, or a spine stage that has
not been done yet is worse than admitting the thread is stuck and the user needs to
address those signals first.

The skill is ADVISORY, not opinion-driven: there is NO stage-specific amplifier. The
skill's role is to read, fold, recognize, and suggest — not to argue against settled
work. The cheap moment to push back is when the user is about to take a next action
that ignores a clear signal in the thread (an open review finding, an uncommitted
change, an unresolved conflict marker, a spine stage that has not happened yet, or a
ledger disposition that says the thread is paused or closed).

Hold these together:

- **Disagree when you disagree.** If the user's hint or implicit assumption about what
  to do next conflicts with the folded state (e.g., "I think we should implement the
  plan" while no plan lineage folder exists yet, or "let's move to review" while the
  implementation has not been committed), say so plainly before suggesting next
  actions. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user dismisses an obvious
  signal — "the open review doesn't matter", "those findings are nits", "we'll address
  the conflict marker later" — name the gap, surface the substance, and bring it into
  the suggestions. An undisposed review is open for a reason.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream
  consequences, the spine stage the user skipped — raise them, even if the user wants
  to move on.
- **Take the user's input seriously.** If they push back, add context, or challenge
  your reading of the thread, evaluate the substance. Update your view when they
  provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not
  itself evidence. Separate useful new information from preference, frustration,
  momentum, or wishful thinking. Never drop a suggestion just because the user pushed
  back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the next action
  differently, identify the exact assumption or value judgment causing the split, then
  resolve THAT before settling on a suggestion list.
- **Keep the advice owned by the evidence.** The goal is not for either side to win.
  The goal is to surface suggestions that survive later scrutiny because the thread's
  actual state was folded and considered. The advisory pass is cheap — the next stage
  the user enters is not.

The skill is ADVISORY. It does NOT have an opinion on settled work (frozen artifacts,
settled decision logs, already-committed implementations). What it has an opinion on is
the GAP between what the thread has done and what it could do next.

## Inputs

This skill accepts an OPTIONAL hint from the user as input. Examples:

- "I just finished the spec — what's next?"
- "Thread feels stuck — what should I look at?"
- "Is this thread closed?"
- "Where are we?"
- (no input — the user starts without a hint)

The hint shapes the advisory framing but does NOT replace the read-and-fold pass. If no
hint is provided, run the default pass and answer all three questions tied to the
folded thread state.

**Ambiguity fallback:** if the active thread is ambiguous (multiple thread roots exist,
none clearly active; or `cwd` is not inside any thread root and multiple plausible
candidates live in `docs/threads/`), ASK the user which thread to read. Do NOT pick by
recency. Do NOT pick by sort order. Do NOT pick by any heuristic — silently picking
would hide a real navigation decision (which thread the user is actually in) behind a
sort order.

The thread itself is the input — its ledger, its lineage folders, its artifacts'
frontmatter latches, where the commits sit. The hint is supplementary.

## What to Read and Fold

This skill reads the active thread READ-ONLY and folds its state. Nothing is edited —
no ledger line, no artifact frontmatter, no artifact body, no folder structure. Read
these sources and fold them into an answer:

### 1. The thread root and the ledger

The active thread root is `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits
inside a thread root, that is the thread. If the thread is ambiguous, ASK per
`## Inputs`.

Read the thread's **`ledger.md` at the thread root**. The ledger is append-only and
carries the only two facts a thread cannot derive from its artifacts: its **tier** and
its **disposition**. Its line grammar is `<event> @ <YYMMDDHHMMSSZ> — <justification>`,
where `<event>` is one of `tier: <0–3>`, `deferred`, `resumed`, `closed: done`, or
`closed: dropped`. Only transitions are written; the resting default is never recorded.
The **current value of each key is its last matching line**:

- **Tier** — the value of the **last `tier:` line**. Tiers: 0 = chore, 1 = patch,
  2 = feature (the default), 3 = initiative. The tier scales what artifacts the thread
  is expected to carry, so it shapes "what next."
- **Disposition** — the **last** of the disposition events (`deferred` / `resumed` /
  `closed: done` / `closed: dropped`). Absence of any such event (or a last value of
  `resumed`) means **active**:
  - `(none)` or `resumed` → **active** (being worked — the resting default)
  - `deferred` → **paused** (intentionally on hold; content frozen, reversible)
  - `closed: done` → **terminal** (the whole spine finished; sealed)
  - `closed: dropped` → **terminal** (abandoned; any successor is named in the reason)

A thread with no `ledger.md` at all is a thread that never recorded a tier — treat tier
as unknown and say so.

### 2. The spine position — derived from which lineage folders/artifacts exist

The spine is `seed → discussion(s) → [proposal] → spec → plan → implement → verify →
finish`. Derive the spine position from **which folders and artifacts exist** under the
thread root and from their frontmatter latches. Folders are created on demand — a folder
appears only once a skill has written its first artifact there, so presence is itself
signal. The folder set:

- **`seed/`** — the genesis bucket: `seed.md` (exactly one, a fixed-name frozen
  narrative), optional genesis notes, and `seed/discussions/`.
- **`proposals/NNN[-<desc>]/`** — lineage folders, each holding `proposal.md`,
  `discussions/`, `reviews/`. (Optional, a tier-3 stage.)
- **`specs/NNN[-<desc>]/`** — lineage folders, each holding `spec.md`, `discussions/`,
  `reviews/`.
- **`plans/NNN[-<desc>]/`** — lineage folders, each holding `plan.md` and `reviews/`
  (machine-adherence reviews). The plan carries NO `version` and NO `status:` map — it
  is a disposable compiler-IR, not an audited contract; do not look for a latch on it.
- **`implementation/`** — flat, records-only: the `<UTC>-<desc>-implementation-report.md`
  plus `discussions/` and `reviews/` (code reviews, verifications) directly inside.

`NNN` is a zero-padded 3-digit sequence (`001`, `002`, …) and is the stable lineage
identifier. **Multiple lineage folders are distinct subjects you intend to keep** (an
API spec and a CLI spec), NOT competing variants — variants live in `.wip/` and are not
emitted. If two lineages exist where you'd expect one subject, that itself is a signal
worth surfacing.

### 3. The derived condition of each versioned artifact

For a proposal or a spec, do NOT look for a stored condition — derive it from the
frontmatter `status:` map plus undisposed reviews, by this precedence (the
authoritative derivation):

```text
status.implemented present        → Implemented
else status.approved present      → Approved   (+ "has open findings" if an
                                                 undisposed review exists)
else an undisposed review exists  → In Review
else                              → Draft
```

Read linearly, a spec moves Draft → In Review → Approved → Implemented. Latches are
**sticky** — they record an event that happened and do not revert. A new review opening
against an `approved` spec does NOT drop it back to In Review; the condition is
"Approved + has open findings." Condition is ALWAYS derived this way and is never stored
anywhere.

### 4. Open findings — undisposed reviews

A **review with no `status.disposed` field in its frontmatter is open**, mechanically,
by parse — there is no open/processed folder move and no separate record. Scan the
`reviews/` folders (under each spec/proposal lineage, under `plans/NNN/`, and under
`implementation/`) for reviews whose frontmatter `status:` map lacks `disposed`. Each
such review is an open finding. An undisposed review against an `approved` spec is the
"+ has open findings" rider; an undisposed review against an un-approved artifact is
what makes its condition In Review.

### 5. Recent commits on the current branch

Suggested invocation: `git log --oneline -5` (or `-10`; the cap is at executor
discretion — the purpose is signal, not audit). Commit history is the implementation
audit trail; recent commits tell you whether implementation work has landed since the
last plan was emitted.

Everything above is read READ-ONLY. The freeze model means frozen artifacts (a spec at
`implemented`, a proposal at `approved`/`rejected`, anything in a `closed:` thread) are
immutable — but this skill never edits anything regardless, so it cannot run afoul of
the freeze.

## The Three Questions

Fold the sources above into answers to all three:

- **What now** — the current state: the **tier** (from the ledger), the **spine
  position** (which stages have artifacts), the **derived condition** of the relevant
  versioned artifact(s) (Draft / In Review / Approved [+ open findings] / Implemented),
  any **open findings** (undisposed reviews), and the **disposition** (from the ledger).
- **What next** — the recommended next spine step given that state. Walk the spine:
  if there's a seed and discussions but no spec, the next step is the spec; if there's
  an `approved` spec but no plan, the next step is the plan; if there's an undisposed
  review, the next step is disposing it (revise the target, or reject in the review's
  frontmatter); if the implementation has landed but not been verified, the next step
  is verify-against-the-spec's-acceptance-criteria; if everything is done, the next step
  is finish (update living docs, set the spec's `status.implemented`, append
  `closed: done` to the ledger). Scale the recommendation to the tier — a tier-1 patch
  may legitimately skip the spec/plan stages; a tier-2 feature expects an approved spec.
- **Is it closed** — read the ledger disposition directly: **active** (being worked),
  **paused** (`deferred`), or **terminal** (`closed: done` / `closed: dropped`). If
  paused, the only forward move recorded is `resumed`; if terminal, the thread is sealed
  and resurrecting the work means opening a NEW thread, not reopening this one.

## Chat-First Answer

The skill's PRIMARY output is a CHAT reply:

- The chat reply IS the deliverable.
- The skill NEVER writes an artifact and never modifies anything. The default — and
  only — behavior is zero file writes.
- Open with the folded answer to the three questions (what now / what next / is it
  closed), then give **2–4 suggested next actions**.
- Each suggestion SHOULD name the action that would execute it (e.g., "draft the
  spec", "run a spec review", "dispose the open review by revising the spec", "walk the
  closure question"). Naming the action gives the user a concrete handle.
- The chat answer is FREEFORM markdown — no rigid template, no required length. The
  suggestion count cap is 2–4 to keep the advisory pass narrow and decision-shaped;
  suggesting 10 next actions defeats the purpose.

Each suggestion follows a loose shape (executor discretion on prose; the substance is
what matters):

- A one-sentence statement of the suggested action, tied to an observed thread signal
  (NOT speculative — "you have an `approved` spec at `specs/001/spec.md` and no plan
  lineage folder yet — consider drafting the plan").
- The action that would execute it.
- A one-clause justification — what in the folded state supports this suggestion.

Example chat suggestions (illustrative — produce NEW suggestions tied to the actual
folded state, not these examples; paths shown are thread-relative):

- "You have a spec at `specs/001/spec.md` whose frontmatter carries `status.approved`
  and no `plans/` folder yet — its derived condition is Approved and the next spine step
  is the plan; consider drafting it."
- "`specs/001/reviews/` holds a review with no `status.disposed` in its frontmatter —
  the spec's condition is In Review (an open finding); consider disposing it by revising
  the spec, or by setting `disposition: rejected` in the review's frontmatter."
- "Implementation commits land on `<current-branch>` and an implementation report sits
  in `implementation/`, but no verification review exists — consider verifying the
  implementation against the spec's acceptance criteria before finishing."
- "The ledger's last disposition line is `deferred` — this thread is paused; the only
  recorded way forward is to append a `resumed` line to `ledger.md` before continuing."
- "Everything is implemented and verified — consider the finish step: update the living
  docs, set the spec's `status.implemented` latch, and append `closed: done` to the
  ledger."

The chat reply may include one or two clarifying questions if the fold surfaces
ambiguity the skill cannot resolve from the thread alone — but the primary content is
the three-question answer plus the 2–4 suggestions.

## Path References

When citing artifacts in the chat reply:

- **Within-thread references are thread-relative** — written relative to the thread
  root (`specs/001/spec.md`, `plans/001/reviews/…`), never from the repo root.
- **Cross-thread references are repo-relative** — (`docs/threads/<other>/…`).
- **Never absolute.**

## Workflow

1. **Resolve the active thread.** Identify the thread root at
   `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root,
   that is the thread. If the thread is ambiguous, ASK the user per `## Inputs`. Do NOT
   pick silently.

2. **Capture any user hint.** If the user passed an explicit hint, hold it as
   supplementary framing. If no hint was passed, run the default pass.

3. **Read and fold the state per `## What to Read and Fold`.** Read READ-ONLY: the
   ledger (last `tier:` line → tier; last disposition event → disposition); the lineage
   folders that exist (→ spine position); the frontmatter `status:` map of each
   proposal/spec (→ derived condition); the `reviews/` folders (undisposed = open
   findings); recent commits on the current branch.

4. **Answer the three questions per `## The Three Questions`** — what now, what next, is
   it closed — and **compose 2–4 next-action suggestions** tied to the folded state.
   Apply the Anti-Sycophancy Stance when the user's hint conflicts with the folded
   state.

5. **Present the answer in chat.** The chat reply is the deliverable. No artifact is
   written. No closing remark.

## Commit Policy

This skill writes no artifacts and so does NOT commit anything. It does NOT stage,
commit, push, branch, or merge. It runs entirely in advisory, read-only mode.

## Read-Only Discipline

The read-and-fold pass reads the ledger, the seed, proposals, specs, plans,
implementation records, and reviews READ-ONLY — it does NOT edit them, does NOT rewrite
them, does NOT add or change frontmatter, does NOT append a ledger line, does NOT
propose edits to their bodies.

The chat reply with the three-question answer and the suggestions is EPHEMERAL — not a
committed artifact, not part of the thread's reviewable history. State in this workflow
is derived, never stored: this skill folds the existing events into an answer and writes
nothing back. If the user wants a derivable fact recorded, the durable mechanisms are
the workflow's own append-only surfaces (the ledger, a new record, an artifact's
frontmatter latch) written by the skills that own them — never by this reader.
