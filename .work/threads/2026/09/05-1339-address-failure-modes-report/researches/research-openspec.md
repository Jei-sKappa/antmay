# Research: `Fission-AI/OpenSpec` — changes vs. specs, delta merge, archive

**Summary.** OpenSpec splits the world in two: `openspec/changes/<name>/` holds one unit of work
(proposal → delta specs → design → tasks), and `openspec/specs/<capability>/spec.md` is a **living,
project-level behavior contract** that changes never edit directly. A change writes *deltas*
(`## ADDED / MODIFIED / REMOVED / RENAMED Requirements`); archiving merges them into the living spec
and moves the change folder to `changes/archive/YYYY-MM-DD-<name>/`. This is a real,
many-releases-deep implementation of "thread artifacts are historical, the project layer is
authoritative," and it does answer our failure modes (3) and (5) *for behavior* — at a cost the
project has been paying in public. There is **no decision log**: the discussion skill says "Track
decisions in the conversation, not in files," and users report the predictable result — decisions
made in `/opsx:explore` are "lost" ([#738](https://github.com/Fission-AI/OpenSpec/issues/738)).
Rationale lives in a *conditional* (46% of their own changes), *never-validated* `design.md`
`## Decisions` section, edited in place with no supersession. There is **no reconcile step** of any
kind, and users have asked for one ([discussion #169](https://github.com/Fission-AI/OpenSpec/discussions/169)).
Archiving is neither mandatory nor enforced, and skipping it is the documented root cause of agents
treating a change folder as canonical ([#1112](https://github.com/Fission-AI/OpenSpec/issues/1112),
[#1683](https://github.com/Fission-AI/OpenSpec/issues/1683)). The single most useful datum in this
study is [#1697](https://github.com/Fission-AI/OpenSpec/issues/1697): a replay of 75 archived
changes found the structural loss-guard would block **39%** of them, and **62%** of the omissions it
flagged were *deliberate* — "intent is not recoverable from structure."

## Artifacts and lifetimes

| Artifact | Location | Created | Authority | Lifetime / end state |
| --- | --- | --- | --- | --- |
| `proposal.md` | `changes/<name>/` | Eagerly, first artifact (`requires: []`) | Why + what + the **Capabilities contract** naming which specs will change | Frozen in the archive |
| Delta specs | `changes/<name>/specs/<capability-path>/spec.md` | After proposal; mandatory unless `.openspec.yaml` sets `skip_specs: true` | What must be true, as ADDED/MODIFIED/REMOVED/RENAMED | **Consumed** by archive into the living spec, then frozen |
| `design.md` | `changes/<name>/` | **Conditional** — "create only if any apply" (cross-cutting, new dependency, migration complexity, ambiguity) | How; the only rationale record (`## Decisions`) | Frozen; never validated, never merged |
| `tasks.md` | `changes/<name>/` | After specs **and** design | Implementation checklist; `- [x]` is the progress substrate | Frozen |
| `.openspec.yaml` | `changes/<name>/` | By `openspec new change` | `schema`, `created`, `skip_specs`, `retire_capabilities` | Moves with the folder |
| **Living spec** | `openspec/specs/<capability-path>/spec.md` | Lazily, by the first change declaring the capability | **"Source of truth… the current, agreed-upon behavior"** (`docs/glossary.md`) | Permanent; deleted only on capability retirement |
| `openspec/config.yaml` | project root | At `openspec init` | Project `context:` (stack, conventions) + per-artifact `rules:`, injected into every planning request | Permanent, hand-maintained |
| Archived change | `changes/archive/YYYY-MM-DD-<name>/` | On archive | History only | Permanent, inert |

In their own 83 archived changes: 83/83 have `tasks.md`, 75/83 have delta specs, **38/83 (46%) have
a `design.md`**. The conditional artifact really is conditional.

## Artifact model

Build order is data, not prose: `schemas/spec-driven/schema.yaml` declares `requires:` edges
(`proposal → specs`, `proposal → design`, `specs + design → tasks`, `apply: requires: [tasks]`); the
CLI walks it via `openspec status --change <n> --json`. The published framing is "**Dependencies are
enablers, not gates**" (`docs/concepts.md`) — the graph says what is *possible* next, not required.
That flexibility has a cost: because `design` becomes `ready` at the same time as `specs`, agents
routinely write it first ([#1173](https://github.com/Fission-AI/OpenSpec/issues/1173),
[#731](https://github.com/Fission-AI/OpenSpec/issues/731)).

The one hard structural rule is the proposal→specs handoff: "IMPORTANT: The Capabilities section is
critical. It creates the contract between proposal and specs phases." Backed mechanically —
`openspec validate` rejects a zero-delta change unless `skip_specs: true`
(`src/core/validation/validator.ts:456-476`) — plus an anti-gaming line: "Do not invent a
requirement just to satisfy validation."

## Decision capture

**There is no decision log, deliberately.** `skills/openspec-explore/SKILL.md`:

> "**Keep a conversational record** — Track decisions in the conversation, not in files. Separate
> confirmed decisions from proposed defaults and unresolved questions. Silence is not acceptance."

Explore writes nothing by default ("Don't auto-capture… Answers to design or clarifying questions
are never consent to write"). When a decision does land, its own table routes it to a *destination
artifact*, not a log: design decision → `design.md`; requirement change → the delta spec; scope
change → `proposal.md`.

Users hit exactly the failure this implies.
[#738](https://github.com/Fission-AI/OpenSpec/issues/738) (closed into
[discussion #1564](https://github.com/Fission-AI/OpenSpec/discussions/1564)): after an explore
session "it just told me to run `opsx:continue` and did not write anything to disk… those decisions
… would be 'lost'." An ADR layer was requested in
[#557](https://github.com/Fission-AI/OpenSpec/issues/557) and deferred to user-defined schema
artifacts rather than shipped as a default; the requester's framing was that OpenSpec "defines the
Plan/Apply workflow but is missing the **Research phase**."

Where rationale does land, the shape is prescribed by the schema — "**Decisions**: Key technical
choices with rationale (why X over Y?). Include alternatives considered for each decision" — and in
practice (`archive/2026-07-28-fix-schema-init-force-validation-order/design.md`) it is a
`### <decision title>` per decision with the choice, the reasoning, and a one-line rejected
alternative. Written **once, at the end**, as a document — not incrementally, not append-only.

Three consequences:

- **A reversed decision is handled by editing the file.** `docs/editing-changes.md`: "Realized the
  design is wrong mid-implementation? Fix `design.md` and keep going." No supersession, no history.
- **`design.md` is never validated.** `src/core/validation/` contains no reference to it; only
  delta-spec structure, task numbering, and purpose placeholders are checked.
- **Open questions are pushed back, not deferred:** "Open questions are for genuinely deferrable
  unknowns, not decisions you skipped. If a question would change the specs, the chosen approach, or
  the task breakdown, resolve it now — ask the user instead of guessing."

[#1382](https://github.com/Fission-AI/OpenSpec/issues/1382) judged the Decisions section
*under*-specified and asked for alternatives and trade-offs to be first-class; nothing since reports
whether the fix worked. I found **no issue or discussion evaluating whether the section is useful,
whether rationale survives, or how a reversed decision is handled** — a real no-evidence finding.

## Spec ↔ decisions, and session boundaries

The spec is **not derived from a decision record**. It is drafted in the same session as the
proposal, from the conversation plus a mandatory codebase read
(`skills/openspec-propose/SKILL.md`): "**Inspect the relevant project before drafting**… Ground
scope, approach, and tasks in what you find. Distinguish observed behavior from assumptions and
proposed additions; surface conflicts with existing specs instead of silently deciding which is
correct."

**There is no reconcile step, and users want one.**
[Discussion #169](https://github.com/Fission-AI/OpenSpec/discussions/169), maintainer @TabishB: "up
till then this process has to be manual unfortunately." A community reply names the gap precisely:
"The manual approach works but relies on the developer remembering to reconcile which is the weak
link. what I think is missing is **detection**… By the time you open the next session, the specs are
stale and the agent is working from outdated context." A `/opsx:reconcile` command is requested
there; [#880](https://github.com/Fission-AI/OpenSpec/issues/880) (code↔spec validation) is still
open.

The nearest shipped thing, `/opsx:verify`, checks the *other* direction — code vs. artifacts on
Completeness / Correctness / Coherence — and is explicitly non-blocking. Its remedy for a design
mismatch is symmetric: "Update implementation **or revise design.md to match reality**."

Session boundaries are handled by making the files, not the transcript, the carrier: "Because the
plan lives in files (not only in chat history), you can clear your context, start a fresh AI session,
and pick up with `/opsx:apply`" (`docs/faq.md`). The propose skill hard-codes distrust of its own
context — "always re-read them from disk, even if you saw them earlier in the conversation."

## Historical versus authoritative

**Location is the only marker, exactly as in our model.** Archiving writes nothing into the change
folder — no status field, no banner, no `archivedAt`. What stops an agent reading an old change as
current is purely **mechanical filtering**: `openspec list` filters `entry.name !== 'archive'`
(`src/core/list.ts:104-107`), `src/utils/item-discovery.ts` excludes "the archive and hidden
directories," and every skill's context step is `openspec list --json` / `openspec status`, never a
filesystem walk. Maintainer position ([#802](https://github.com/Fission-AI/OpenSpec/issues/802)):
"the single source of truth … is its *main spec* … **not the archive**."

That works only when the change was actually archived, and this is where the model leaks:

- [#1112](https://github.com/Fission-AI/OpenSpec/issues/1112), Case 2 — "Change A's implementing PR
  had already merged and shipped to production, but Change A itself was never archived — so the
  requirement lived in `openspec/changes/<A>/specs/…`, not in canonical `openspec/specs/…`. Change
  B's agent wrote `## MODIFIED Requirements` against that. Archive aborted weeks later."
- [#1683](https://github.com/Fission-AI/OpenSpec/issues/1683) — "without enforcement `specs/`
  silently drifts from shipped reality — someone merges a change, forgets the archive step, and the
  living specs quietly stop describing the system." It proposes un-welding "shipped" from directory
  position via an explicit `lifecycle: status`. Its CI-gate variant is rejected as "red as its
  resting state — red on every PR."
- [#1689](https://github.com/Fission-AI/OpenSpec/issues/1689) — the durable layer is barely read:
  `openspec list --json` (the *change* list) appears in 10 generated skills, `openspec list --specs`
  (the *spec* inventory) in **zero**, so "the step *succeeds against the wrong object*, silently."
- [#1652](https://github.com/Fission-AI/OpenSpec/issues/1652) — archive merges on self-reported
  status: "`tasks.md` checkboxes … record an *intention to have finished*, not evidence of it."

The **merge** itself (`src/core/specs-apply.ts:buildUpdatedSpec`, applied RENAMED → REMOVED →
MODIFIED → ADDED): ADDED appends (identical collision = no-op, differing = hard error); MODIFIED
*replaces the whole requirement block*, so the delta must carry the full new requirement and its
header must match exactly; REMOVED deletes, treating a missing target as already-applied unless a
case/whitespace near-miss exists; RENAMED rewrites the header in place. Removing a capability's last
requirement retires it — deleting the file — which needs opt-in `retire_capabilities: true` plus a
guard that every non-blank line is accounted for (`unaccountedContent`, whose comment records the
guard "for seven rounds… looked for requirement-SHAPED text and was beaten by a new disguise each
time"). That guard is still not right:
[#1780](https://github.com/Fission-AI/OpenSpec/issues/1780) reports it "unusable when a scenario
bullet wraps: the continuation line counts as unaccounted content."

Archiving is not gated. Incomplete tasks warn and confirm, not block; `--skip-specs` archives
without merging; `--no-validate` skips validation — and `--no-validate` is the community's universal
escape hatch, cited as the workaround in #1697, #1750 and #1793.

## Project-level durable layer

`openspec/specs/` is the durable layer, one directory per **capability**, each a single `spec.md` of
`## Purpose` + `## Requirements` + `### Requirement:` + `#### Scenario:`. It is brownfield-lazy:
"your `openspec/specs/` directory doesn't start full and complete. It starts nearly empty and
accumulates" (`docs/existing-projects.md`). **Only the archive/sync path writes it**, with two narrow
hand-edit exceptions (changing an existing `## Purpose`, clearing a `TBD` placeholder — the
placeholder is 65 chars, so it clears `MIN_PURPOSE_LENGTH` and passes `--strict` while a genuine
short Purpose fails; [#1670](https://github.com/Fission-AI/OpenSpec/issues/1670) found four specs
that "carried the placeholder since July").

Identifiers are **names, not IDs**: the requirement header text is the join key, normalized for case
and interior whitespace. Stable `Requirement ID: <uuid>` markers are proposed as "Phase 3 —
Long-Term" in `openspec-parallel-merge-plan.md` and have not shipped (no `meta.json`, no fingerprint
code, no `change sync`/`rebase` in `src/`).

Two scaling problems are reported. **Bloat**:
[#1675](https://github.com/Fission-AI/OpenSpec/issues/1675) — "the set of specs grew quite a lot. We
have hundreds if not thousands of spec files," asking for a skill to merge and drop redundant ones;
[#901](https://github.com/Fission-AI/OpenSpec/issues/901) — "a project with 20+ capabilities would
dump thousands of lines into context just to decide which are relevant." And **residue of the diff**:
[#678](https://github.com/Fission-AI/OpenSpec/issues/678) — merged specs inherit evolutionary
language, "saying 'no Monte Carlo tab exists' is a strange thing to assert as a permanent
requirement… main specs would accumulate lots of negations about things that used to exist." That is
our own "describe the current state, never the diff" rule failing under mechanical merge.

**There is no project-level glossary or ADR log in the product.** The closest thing is
`config.yaml`'s `context:` block (50KB cap, injected into every planning request) plus per-artifact
`rules:` — durable *constraints*, not durable *decisions*. Tellingly, the maintainers needed one and
built it outside the product: `openspec/initiatives/context-store-and-initiatives/decisions.md` (225
lines) with `## YYYY-MM-DD: <Title>` / `Decision:` / `Why:` / `Implications:` records, and a
`questions.md` split `## Open` / `## Resolved` where resolved items **move, not append**.

Conflicts between two in-flight changes touching one spec are handled three ways, all after the fact.
(1) Documented as acceptable — "resolve it like any merge conflict… This is rare, and it's a feature"
(`docs/team-workflow.md`) — which [#1669](https://github.com/Fission-AI/OpenSpec/issues/1669)
disputes: "Two open changes can each be individually valid while claiming the same requirement.
Nothing surfaces the collision until one of them archives — at which point the other author has
already implemented against stale context." (2) A refusal at archive time,
`findMissingCurrentScenarios` (`src/core/parsers/requirement-blocks.ts:347`), multiplicity-aware,
also run by `validate` since #1482. (3) Agentic resolution by **reading the code**:
`skills/openspec-bulk-archive-change/SKILL.md` detects "2+ selected changes [with] delta specs for
the exact same `<capability-path>`" and investigates the codebase to see what was actually
implemented, applying implemented deltas chronologically and excluding unimplemented ones.

## Large-effort decomposition

The published answer is **don't decompose — right-size instead** (`docs/writing-specs.md`: "A good
change has one intent you can say in a sentence… Signs a change is too big: … half the tasks could
ship on their own"), and the split rule is "update when it's the same work refined; start new when
the intent fundamentally changed."

There is **no first-class multi-change model**, and its absence is well documented.
`openspec/changes/IMPLEMENTATION_ORDER.md` is a hand-written, root-level sequencing document that
nothing reads. `openspec/changes/add-change-stacking-awareness/` is an **active, unimplemented**
change (`created: 2026-02-21`) proposing `dependsOn` / `provides` / `requires` / `touches` / `parent`
metadata and `openspec change graph|next|split`; its Why states the problem exactly — "teams cannot
tell which change should land first; large changes are hard to split into safe mergeable slices;
**parallel work can accidentally reintroduce assumptions already removed by another change**." A
team shipped an external CLI (`concord`) doing drift / removed-upstream / name-collision / overlap
detection and offered it upstream ([#1387](https://github.com/Fission-AI/OpenSpec/issues/1387),
unanswered for a month).

Most relevant to us, `openspec/work/README.md` is a **parallel replacement model** being dogfooded:
`goal.md → roadmap.md → slices/<id>/{spec,plan,result,log}.md`. Its rules are directly on point for
our roadmap failure mode:

> "The roadmap is a living sequence of likely slices, not a promise to execute everything in order…
> 1. Explore and interview until the slice has a useful `spec.md`. 2. **Generate `plan.md` only when
> the spec is clear enough to implement.** … 5. **Update `roadmap.md` when the result changes the
> path forward.**"

It separates the three tenses cleanly — "spec.md says what must be true. plan.md says how we intend
to get there. result.md says what actually happened" — with "Do not use [result.md] as the source of
truth for current intent," and an optional `log.md` "only when important changes need a short
explanation of what changed, why, and what downstream artifacts were affected." The earlier
initiatives model is explicitly superseded ("It is not the active product roadmap"), collapsing to
"**Specs are what is true. Work is what is in motion.**"

## Duplication

Downstream artifacts are told to **cite, not restate**: design — "Reference the proposal for
motivation instead of restating it (e.g., 'See proposal.md — Why')… if a section would only restate
them, point to them instead"; tasks — "Reference specs for what needs to be built, design for how to
build it"; and injected context — "**IMPORTANT**: `context` and `rules` are constraints for YOU, not
content for the file." Those lines exist *because* of a report:
[#1382](https://github.com/Fission-AI/OpenSpec/issues/1382), "`proposal.md` and `design.md` can
substantially repeat one another… two documents containing the same problem statement and rationale."

In practice one decision still gets re-expressed **four times** before code. Measured on
`archive/2026-07-28-fix-schema-init-force-validation-order/` (208 words proposal, 198 spec delta, 240
tasks, plus design): "validate artifact IDs before deleting the existing schema" appears as a
proposal bullet, a spec requirement plus three scenarios, a design decision with its rejected
alternative, and tasks 2.1–2.2. Only the design copy carries rationale; only the spec copy survives
archive. The delta format adds a fifth restatement by construction — MODIFIED must carry every
scenario it is *not* changing, which is why PR #980 had to add `openspec show <change> --diff`
("reviewers could not see what a change actually altered without diffing files by hand").

Notably, I found **no evidence** of the complaint "agents rewrite all four artifacts for a small
change," and no token-cost-per-change grievances. What OpenSpec ships instead is a dedicated
re-propagation operation, `skills/openspec-update-change/SKILL.md`, whose two interesting rules are
that it is **bidirectional** and **non-advancing**:

> "Apply the requested edit. Then check every other existing artifact against it — **in ANY
> direction**: an edit to a later artifact may require revising an earlier one, not only the other
> way around. **Build order is a useful reading order, not a constraint on which artifacts may be
> revised.**"
>
> "Do not advance the build frontier: no new artifacts, no new files under glob artifacts."

It accepts a bare "make this coherent" as a full contradiction sweep, confirms each revision
separately, never edits code, and refuses when the request changes *intent* rather than refining it.

## Known failure modes

`openspec-parallel-merge-plan.md`, at the repo root, is a maintainer root-cause analysis of the
delta-merge pattern's core break:

> "When two changes touch the same requirement, the second archive overwrites the first and
> **silently drops scenarios**… There is no warning, diff, or conflict indicator—the archive
> completes successfully, and the source-of-truth spec now omits a shipped scenario."

Its named root causes generalize to any delta-into-living-document scheme: **replace-only
semantics**, **missing base fingerprint** ("changes do not persist the requirement content they were
authored against, so the archive step cannot tell if the live spec diverged"), **single-level
granularity**, and **no conflict UX** ("no equivalent of `git merge`, `git rebase`, or conflict
markers"). Its Phases 0–3 have **not shipped**. What shipped is a fail-closed refusal, hardened
across at least five releases in `CHANGELOG.md` — each one a *shipped silent-data-loss bug*: #1475
(multiplicity blind spot; fenced examples parsed as real requirements), #1482 (move the check into
`validate`), #1490 ("a requirement absorbs anything below it… so removing or modifying that
requirement took the note with it, silently"), and an unnumbered fix for unlabeled scenarios being
"permanently deleted by archive with no warning." A whole family of *silent* parser-level loss is
still open: #1793, #1801, #1803, #1799, #1805, #954.

The decisive measurement is [#1697](https://github.com/Fission-AI/OpenSpec/issues/1697), a replay of
the 75 archived changes carrying MODIFIED: "**29 of 75 archived changes (39%) would be blocked**" by
the scenario-currency guard; of 26 hand-classified findings, "**16 of 26 (62%) were intended**" (9
supersessions, 7 deliberate deletions), 6 were genuine accidental losses (2 shipped and needed
repair by a later change), and 4 were "**stale base** — delta authored before another change added
the scenario." Its conclusion: **"intent is not recoverable from structure."**

Finally, **stale change folders, dogfooded**: at HEAD (2026-09-03) the repo has 25 active change
folders with `created:` dates back to 2026-01-20, and the newest archive is 2026-07-28. Some are
zombies by decision — `initiatives/…/decisions.md`, 2026-05-21: "**Keep Deferred Workspace Changes
As Reference Placeholders**… Treat their current proposals as historical/deferred direction."
Nothing on disk distinguishes those from live work; the disposition lives in a directory the CLI
does not read.

## Verdict for Antmay

### Assessment of "delta spec merged into a living spec on archive"

**It fully solves (5).** `openspec/specs/` is a genuinely durable, capability-scoped contract that
outlives every thread, bootstraps lazily from real work, and — critically — has **exactly one
writer**. That single-writer rule is why the living specs stay coherent despite everything else
being loose. Our thread model asserts living documentation exists and that "where no separate living
documentation exists, none is invented"; OpenSpec shows the version where the method *creates* it as
a by-product at near-zero marginal authoring cost, because the delta the thread already wrote **is**
the update.

**It substantially solves (3)** — not via a status field (there is none; location is the only marker,
identically to us) but because **consumption of a thread artifact is destructive**. After archive the
delta's content lives in the living spec; the archived copy is a duplicate with no consumer, and
every agent entry point mechanically excludes `archive/`. A stale archived spec is not authoritative
because the authoritative copy is elsewhere and newer. That is stronger than a banner and costs
nothing to maintain. **But it only holds if archiving actually happens** — #1112 and #1683 are
precisely the leak, and their own repo is the proof.

**It does not solve (1),** and shows a different shape of the same problem: with no decision record
and a conditional, unvalidated `design.md`, rationale is simply unrecoverable after a context
boundary (#738). They avoid our specific pathology only because they never built the adversarial
generate/strip pair that produces it.

**Where it breaks, and we would inherit all of it:** name-as-identifier (the join key is header text;
their own guard was "beaten by a new disguise each time"); replace-only granularity with no recorded
base, which is silent loss under concurrency (#1669, #1246); MODIFIED carrying unchanged content,
which *is* our failure mode (2) one level down; retirement needing an opt-in flag and a whole-file
accounting guard that still misfires on wrapped bullets (#1780); parser fragility that produced at
least five shipped data-loss bugs; merged specs accumulating diff-residue negations (#678); and
bloat at scale (#1675, #901). And #1697 is the fatal one: a purely structural currency guard blocks
39% of real changes while 62% of what it flags is deliberate.

### What to take — option D, not A/B/C

**Keep the thread trace thin and make it *consumed*; put the durable weight in a project-level layer
the thread emits into.** Concretely:

- **Reject (A) again**, with their evidence: nobody in this literature maintains a design document
  during a live session. Both OpenSpec and Superpowers write it *from* the conversation, at the end.
- **Do not adopt (C) wholesale.** OpenSpec *is* C at the thread level plus a strong project layer,
  and #738 is the receipt: decisions made in discussion evaporate. C's core insight — a decision's
  durable home should be where it is consumed, not a parallel log — is right; its omission of any
  in-thread record is not.
- **Take destructive consumption as the fix for (3).** Make the thread's spec the *input* to a living
  layer and let archive consume it. No banner, no status field needed. But pair it with the lesson
  from #1112/#1683: **the merge must be the same act as shipping**, not a separate step someone can
  forget. If our archive stays advisory, we reproduce their 25 stale folders exactly.
- **Take the single-writer rule for the durable layer**, verbatim.
- **Take `## Purpose`-style laziness**: the project layer accumulates one thread at a time,
  brownfield-first; it is never a prerequisite.
- **Take the bidirectional coherence sweep as the honest answer to (2).** If N copies exist, one
  operation must own re-propagating across them, explicitly direction-free — "an edit to a later
  artifact may require revising an earlier one… Build order is a useful reading order, not a
  constraint on which artifacts may be revised." Their split is the useful one: a revise operation
  that never advances the build frontier and never touches code, separate from an implement
  operation that never revises planning artifacts.
- **Take the `openspec/work/` slice model for our roadmap failure mode (4), nearly wholesale**: the
  roadmap is a living sequence, not a promise; a child's plan is generated **only when its spec is
  clear enough to implement** (lazy, not up-front); and updating the roadmap is a **duty of the child
  at completion**, not an optional append to a write-only file.
- **Take code-as-tiebreaker.** When two threads disagree about the durable layer, the shipped code
  arbitrates — not the older artifact, not the newer one.

### What to avoid

- **Do not adopt requirement-name-keyed structural merge.** We would inherit their parser bugs for a
  benefit obtainable more cheaply. If we adopt a living layer, prefer an agent-driven semantic merge
  (which is what their newer skill path does — `openspec-sync-specs` is "an **agent-driven**
  operation… This allows intelligent merging (e.g., adding a scenario without copying the entire
  requirement)") guarded by a *mechanical loss check*. The one piece of machinery worth stealing is
  `findMissingCurrentScenarios`: a cheap, multiplicity-aware assertion that nothing present before
  the merge is absent after it. **Steal the assertion, not the merger.**
- **If we ever guard a merge, record the base and let the author declare intent.** #1697 proves both
  halves are required: without a recorded base you cannot tell a stale delta from a deliberate
  deletion, and without declared intent a structural guard blocks 39% of work to catch a 23% real-loss
  rate. This is the single most transferable lesson in the study.
- **Do not require a delta to carry unchanged content.** That rule causes both the restatement burden
  and the concurrency loss.
- **Do not build a spec↔decisions reconcile step in its current shape.** OpenSpec has none by choice,
  and its `verify` deliberately permits updating the *artifact* to match reality. Our (1) comes from
  pairing a generative agent with an adversarial stripping agent over a lossy input; the literature's
  answer is to remove one side of that pair, not to tune it.
- **Do not let a merged living document keep the diff's voice.** #678 is our own "describe the
  current state, never the diff" rule failing mechanically — a merged requirement that says what no
  longer exists. Any merge we adopt needs an explicit rewrite-to-present-tense obligation.
- **Do not put lifecycle disposition anywhere but in the thread, on disk.** Their
  `initiatives/…/decisions.md` records that several active change folders are "historical/deferred
  direction," and no tool or agent will ever see it.
- **Do not let archive be optional in practice.** 25 active folders, oldest seven months, in the repo
  of the people who built the tool.
