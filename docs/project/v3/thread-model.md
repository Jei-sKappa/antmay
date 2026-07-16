# Thread model

A thread is one unit of work at one moment: a durable home on disk for the decisions, artifacts, and outcome of a single change or direction. This document defines the substrate every workflow shares — the layout, the decision log, the archive lifecycle, write authority, cross-thread references, and the temporary workspaces.

## Layout

Every thread is a folder under `docs/threads/`, named `<YYMMDDHHMMSSZ-slug>` where the timestamp is the opening time in UTC. An archived thread lives under `docs/threads/archive/` with the same folder name. The authoritative layout is:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/        (archived: docs/threads/archive/<...>/)
├── seed.md                       eager
├── decisions.md                  eager
├── proposal.md                   optional
├── spec.md                       optional
├── plan.md                       optional; brief plan or strict-plan index
├── plan-tasks/                   strict plan only
├── implementation-report.md      singleton current outcome
├── roadmap.md                    Roadmap only
├── roadmap-feedback.md           Roadmap only, eager at roadmap authoring
├── .pending-decisions/           gitignored; pending human-decision bundles
├── .pending-reviews/             gitignored; review findings bundles
└── .implementation-runs/         gitignored; invocation-scoped implementation state
```

`seed.md` and `decisions.md` are created eagerly when the thread opens; everything else is created on demand. A brief plan is contained entirely in `plan.md`; a strict plan uses `plan.md` as its authoritative index and adds dispatchable task briefs under `plan-tasks/`. `implementation-report.md` is a single current-outcome artifact, not a per-run history. These are the only folders a thread has — there is no generic drafts or working-material folder.

## Seed

`seed.md` is written once, when the thread opens, by the thread-opening operation alone. It carries exactly three conceptual requirements:

1. a **title**;
2. a **self-contained genesis narrative** explaining what triggered the work and its intended outcome; and
3. a `## Suggested workflow` section containing the complete recommended sequence in human-readable numbered prose, with optional activities explicitly labelled optional.

A thread is opened **from** a workflow template; it does not **have** a workflow type. No workflow name is persisted. The `## Suggested workflow` section is the expanded sequence copied verbatim at opening time, never a workflow identifier resolved later against newer templates — so an existing thread stays understandable regardless of how a published workflow evolves afterward. It carries no progress checkboxes, completion markers, or lifecycle values; it is an opening-time recommendation, not a statement of current state.

Metadata is sparse and contextual: a field appears only when it carries real information. Absent optional metadata means "not applicable" and is never represented by a placeholder `none` value.

- `External:` appears only when an actual tracker ticket or other external source is linked.
- A materialized Roadmap child additionally carries a reference to its parent Roadmap and to the child brief it was created from.
- `Supersedes:` appears only when a known supersession relationship is useful.

The folder timestamp records opening time, so the seed does not duplicate it. No owner, workflow name, tier, disposition, or lifecycle status is added.

## Decisions

`decisions.md` is the one thread-wide log of human decisions. It is created eagerly when the thread opens (header-only is fine) and appended to as decisions are settled. Each record uses sequential thread-local `DR<N>` numbering and carries a Title, an optional Scope, a mandatory Context, the Decision, and its Rationale.

The log is append-only. A changed decision is recorded by appending a new superseding record that names the record it supersedes; prior records are never rewritten. `seed.md` plus `decisions.md` are designed to be sufficient on their own to author the next artifact without recovering the original chat.

Any skill — regardless of its interaction posture — that obtains a new human decision during execution appends it to `decisions.md` as an ordinary `DR<N>` record **before** acting on it. A genuine decision is an answer that settles product or workflow intent; trivial input clarifications (such as which file was meant) need no record. This holds equally whether the decision was elicited in an interactive dialogue or settled through a pending-decision bundle: every human decision that shapes an artifact exists in `decisions.md` before the artifact depends on it.

## Historical artifacts versus living documentation

Thread artifacts — the seed, `decisions.md`, any proposal, the spec, the plan, and implementation or outcome reports — record how one change was understood and delivered at a particular moment. They are not the current description of the product.

**Living project documentation** — README content, user documentation, architecture references, API or protocol documentation, operational runbooks, and repository conventions — describes the system as it currently exists and is expected to evolve across threads. When implementation changes documented behavior, updating the affected living documentation is part of that implementation. Where no separate living documentation exists, none is invented for the occasion; code and tests remain authoritative where appropriate.

## Write authority

Skills own narrow, purpose-shaped write boundaries. These are conventions realized through skill design rather than filesystem access controls:

- The thread-opening operation alone writes the current thread's `seed.md`.
- Decision-eliciting operations append to the current thread's `decisions.md`; a changed decision appends a superseding record rather than rewriting a prior one.
- Proposal, spec, and plan authoring operations may edit their respective current-thread target, as may a reconciliation or targeted fix operation when existing durable decisions make the correction mechanical.
- An implementation operation reads its input spec and plan but does not edit either to justify or retroactively describe its work; a plan is implementation input and is not rewritten after the fact to make completed work look planned. If implementation exposes a spec problem, it proceeds only within a granted degree of freedom, records an honest deviation that stays within accepted intent, or stops and surfaces a human decision when intended behavior must change.
- Implementation and outcome reports are written by the operation that performed the work.
- A skill does not modify other threads while working from the current thread. Archived threads are read-only.
- Current project code, tests, and living documentation change only within the current implementation scope.

Every skill writes only its declared outputs, current-thread targets it explicitly owns, and current project files within its authorized implementation scope.

There is a single exception to the no-other-threads rule: a Roadmap descendant may append a feedback record to its parent's `roadmap-feedback.md`. That authority is narrow — a descendant may append a feedback record but may not rewrite `roadmap.md`, edit the parent's `decisions.md`, modify a sibling's artifacts, declare a new parent-level decision, or mark another child blocked or complete. Appending feedback does not reactivate an archived Roadmap thread or turn it into a coordinator.

## Archive lifecycle

Archive location is the only terminal lifecycle signal. A thread directly under `docs/threads/` is active or unfinished; a thread under `docs/threads/archive/` is terminal and intentionally removed from active work. There are no deferred, paused, or resumed states, and no lifecycle ledger.

Completed and abandoned threads are distinguished by their durable content:

- **Completed** work carries its workflow's final deliverable — the implementation report for Quick and Standard, or the roadmap and its materialized children for Roadmap.
- **Abandonment** is recorded as a decision in `decisions.md`, with its rationale.

Archiving is the explicit act that ends a thread's active lifecycle. Before moving a thread, the archival operation inspects the three temporary workspaces and, if any are non-empty, names their contents — bundle titles or headers, interrupted run identifiers — and asks the user to confirm archival anyway. This is an advisory warning and a single meaningful confirmation, not a gate. On confirmed archival the workspaces are carried along untouched; archival never deletes them or their contents. In an archived thread these folders are inert local residue with no workflow meaning — the pending-state semantics below apply only to active threads. The user may delete the residue manually at any time.

## External references

External tracker references are passive. Supplying a ticket or other external source authorizes an operation to read it for context and to record its real URL in the seed's `External:` field. It does not authorize any ordinary thread operation to comment on, update, transition, or close the external item. Creating an external ticket, or any other tracker mutation, requires explicit user intent rather than being implied by the presence of an `External:` line. A delivery handoff may surface a linked reference and place a non-closing mention such as `Related to <ticket>` in a pull-request description, but does not use auto-closing syntax or close the ticket unless the user explicitly asks.

## Cross-thread references

Cross-thread references use plain repo-relative thread-root directory paths, for example `docs/threads/260714093000Z-auth-boundary/`. A materialized child seed's `Parent:` field uses the same repo-relative path form. `Roadmap brief:` uses the parent Roadmap's stable `CB<N>` identifier. References always point at the thread folder, never at a file inside it, so a thread's internal contents can change without invalidating references to it. There is no link-repair mechanism, indirection scheme, or stable-ID registry.

### Accepted limitation

Moving a thread into `docs/threads/archive/` changes its literal path, so parent, child, decision-record, external, and other repo-relative references to a thread may break when that thread is archived. This is a known and accepted limitation of Project V3. Archival performs a simple location move and does not attempt to preserve, discover, or rewrite cross-thread references, and this document promises no repair mechanism for it. The timestamp-and-slug embedded in every thread path keeps post-archival recovery a trivial search even when a literal path no longer resolves.

## Branch-agnosticism

Project V3 defines no thread-to-branch mapping. Thread identity lives entirely in the thread folder, never in a branch name. No workflow skill creates, switches, or names a branch on its own initiative. Implementation commits land on the current branch as found, and branch dispositions at delivery are user-selected. The user may work directly on the default branch, use one branch per thread, or share a branch across threads — the workflow neither knows nor cares.

## Temporary workspaces

Three gitignored, dot-prefixed workspaces hold thread-local operational state. Each is created on demand, and each producer allocates its own uniquely named file so concurrent producers never collide on a shared singleton.

### `.pending-decisions/`

The bridge from in-progress completion-oriented work back to human judgment. It holds only missing human intent discovered after substantive execution has begun — a genuine product or workflow decision the run cannot safely derive on its own. A completion-oriented operation first completes everything it can derive or fix safely, then queues the irreducible judgment here rather than waiting in chat or inventing an answer; emitting a bundle ends the run `BLOCKED`. This queue is distinct from the two situations that never write here: a preflight refusal — an unresolved thread or target, an unmet prerequisite, or a failed safety gate — ends the run `REFUSED` before any artifact is written, and an unfixable operational defect ends the run `BLOCKED` with a diagnosis and no decision bundle.

One file is a **resumption bundle**: one or more human decisions produced by the same operation that share a coherent target and should be settled before the same follow-up action runs once. The normal case is one bundle per producing invocation; an invocation emits separate bundles only when subsets of its questions have meaningfully different targets or follow-ups. Each bundle opens with a routing header naming the producing skill, the target artifact or operation, the originating user request, the creation time, the point count, and a one-line summary — the originating request is carried so a clarification is answerable from the file alone — followed by a required `## Suggested action after resolving the decisions` paragraph — advisory follow-up written by the producer while it still holds the domain context — and then one canonical discussion point per unresolved question. The bundle carries no executable resume contract.

Resolving a bundle is an interactive, user-invoked operation: it selects one bundle (reading only routing headers to choose when several exist), discusses its points one at a time, and records each point's outcome — appending genuine new intent to `decisions.md` as a decision, while a mere request-repair answer that only clarifies which input was meant settles the point without being recorded. The clarification-versus-decision call is made here, at resolution time, not when the bundle was emitted. It removes each settled point and deletes the bundle when no unresolved points remain. It then reassesses the producer's suggested action against the decisions just made, offers its own recommended next action, and waits for the user's choice; an accepted continuation runs once and does not open an automatic loop.

The absence of `.pending-decisions/` means there are no known pending human decisions. It is not a review-status system.

### `.pending-reviews/`

Read-only reviews write their findings here. A review that finds no actionable issue returns a concise pass in chat and creates no file. A review that finds one or more actionable issues writes exactly one uniquely named findings bundle for that run.

A bundle names the reviewer, the reviewed target, the creation time, and the finding count, has an optional `## Context` section for a short overall assessment, and lists findings under sequential bundle-local `FND<N>` numbering. Each finding carries a severity (blocker, issue, or nit), a review-specific category, a finding statement, evidence, an impact, and — only when useful and supported — a suggested action. Findings are ordered by severity and then by the reviewer's natural category order. A review never writes `.pending-decisions/` and never decides whether a finding is fixable, needs human intent, should be accepted, or should be rejected; its responsibility ends with an accurate bundle.

Consumption is manual composition. A pending-review bundle is an ordinary, self-contained input: the user may hand it to any capable agent with a direct instruction to read and address the findings, and no bundle prescribes a named addressing skill. The addressing agent assesses each finding rather than accepting it mechanically, applies supported corrections within its actual write authority, and routes genuine new human intent through `.pending-decisions/`. Re-review of the target is always an explicit user request, never an automatic loop; a re-review that still finds issues emits a fresh bundle, and a clean re-review emits no file. A bundle is removed once its findings are judged addressed, dismissed, or superseded by a newer bundle. There are no statuses, dispositions, or automatic retry loops.

### `.implementation-runs/`

Implementation-owned, invocation-scoped run state used for progress tracking, context-compaction recovery, and (for the subagent executor) cross-agent handoff. Every invocation receives its own uniquely named run directory, named `<UTC>[-<desc>]` — the UTC stamp is mandatory and by itself guarantees uniqueness, and `<desc>` is an optional short kebab descriptor of the run's objective, carried purely for human readability. There is no `plan-` infix and no reference to a plan lineage. Because each invocation gets its own directory, a later run against the same plan never inherits stale progress, and a new invocation never silently adopts an existing directory — resumption must identify the run explicitly. A run directory's progress file is named `progress.md`. That file records factual run traces — the task attempted, the changes made, the verification performed, any concerns, the commit, and the next action — as prose or ordinary structured fields; it is not a second status layer and defines no formal task-status tokens beside the run's terminal outcome.

At a terminal outcome, successful or blocked, the implementation operation writes or updates `implementation-report.md`, and its run directory stays in place afterward as the run's operational trace. A directory left behind by an unexpectedly interrupted run is likewise available for explicit resumption. No durable artifact refers to a path inside `.implementation-runs/`; run directories stay invocation-scoped in meaning even though they persist on disk, and durable information is synthesized into the implementation report or another canonical output.
