---
name: review-plan-interactive
description: Walk a plan artifact one finding or task at a time with the user, checking the plan against its spec, classifying each deviation into one of four outcomes, and capturing the resolved-vs-unresolved split with spec faults routed to the human when the user wants a collaborative plan adherence review.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Review Plan Interactive

Walk a plan artifact one finding (or one task) at a time with the user, running a **plan adherence review** against the spec it was derived from. ASK the user for their view on each finding AND TEST that view against the plan and the spec, classify each deviation into one of four outcomes, settle each finding, append per-finding records to a decision log under the active thread's `discussions/` folder, and — only if unresolved actionable findings remain — emit a references-first review record into the target plan's `reviews/` folder. The review is **mode-agnostic** — it judges plan-against-spec however the plan was authored (autonomously or by a human).

The spec plus its acceptance criteria are the **contract**; the plan is a disposable compiler-IR derived from that contract. In this workflow the human reads and approves the spec, and a human may review the implementation — but the human never needs to read the plan. That is exactly why this adherence review must be trustworthy: if it clears a plan that silently drifted from the spec, the drift reaches implementation unseen. Every finding traces back to "does the plan deliver what the spec promised?". The cheap moment to push back is during this walk — drift captured into the plan becomes expensive in implementation, where unflagged ambiguity compounds.

## Anti-Sycophancy Stance

Your job is to help the user reach the right verdict on the plan against the spec, not to make them feel good about whatever the plan currently says. Treat the per-finding walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **a review is most valuable when it disagrees with the author**. A review whose only effect is to validate the plan because the author defends it has produced nothing useful; the cheap moment to push back is during the walk, before the plan is escalated to implementation. Bad design captured in the plan becomes expensive during implementation because the implementer — human or agent — will not have you in the loop to ask follow-ups. Push back hard on weak reasoning, hidden assumptions, or a deviation defended as "fine" when the spec says otherwise; never soften findings just because the user pushes back.

Hold these together:

- **Disagree when you disagree.** If the user's view of a finding conflicts with the evidence in the plan, your read of the spec, or the codebase / project-conventions reality, say so plainly before settling. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user dismisses a finding for a reason that doesn't hold up — "the implementer will figure it out", "it's obvious from the spec", "we'll deal with it in implementation" — name the gap, surface the assumption, and bring it into the conversation before the finding is settled. A future implementer who has never seen this conversation will not "figure it out".
- **Surface what they didn't ask about.** Coverage gaps against the spec's acceptance criteria, drift the spec did not call for, hidden assumptions, ambiguity that traces to a spec gap — raise them, even if the user wants to move on. Better captured as a finding now than rediscovered during implementation, where the cost compounds in commits.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the plan or spec, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument (e.g., they point at a spec degree-of-freedom you missed).
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a finding's severity, outcome classification, or settlement just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a finding differently, identify the exact assumption or value judgment causing the split, then resolve it before settling the finding.
- **Refuse to log a settlement you believe is wrong without flagging it.** If the user insists on settling a finding as `resolved` or `rejected` when you believe it remains actionable, log the settlement they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other settlement> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the review owned by the evidence.** The goal is not for either side to win. The goal is to record settlements that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered.

If you believe a finding is being dismissed without real reason, refuse to log it silently as `rejected`. Either resolve the disagreement first, or log the dissent verbatim in the rationale line. The cheap moment for the review to do its job is during the walk — once the plan is escalated to implementation, the cost of unflagged findings compounds, and once commits land they will not rewind themselves.

## Inputs

This skill accepts ONE required input and ONE strongly-recommended input:

1. **(Required) A plan artifact path** — `plans/NNN[-<desc>]/plan.md` inside the thread root. The path may be passed thread-relative or repo-relative. Loose-granularity plans and strict-granularity plans are both accepted — the `## Loose vs Strict Detection` step below selects which ambiguity check applies.
2. **(Strongly recommended) The spec path** the plan was derived from — `specs/NNN[-<desc>]/spec.md` inside the thread root. The spec is the contract this walk judges the plan against. When NOT supplied, ASK the user which spec the plan derives from before walking — an adherence review with no contract has nothing to check the plan against. Only if the thread genuinely holds no spec (a planning-without-spec exception the user confirms) does the walk fall back to the structural checks alone, with an `## Open Questions` note that adherence could not be assessed.

If the plan path is not supplied, ASK which plan to review — do not pick by recency. If the thread holds multiple plan lineages (`plans/001/`, `plans/002-cli/`) and the user's reference is vague ("the plan", "the auth plan"), ASK which lineage is intended. There is NO "most recent lineage" or "highest `NNN`" fallback. Each lineage holds exactly one alive `plan.md` (plans carry no `version`), so "which version" never arises; but "which lineage" can, and silently picking by number would hide a real decision behind a sort order. The same lineage-resolution rule applies to the spec input.

The literal folder `plans/NNN[-<desc>]/` is the canonical location plan artifacts land in. If the path passed is not a `plan.md` under a `plans/` lineage folder, refuse and ASK the user to confirm — a plan not under `plans/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a plan. If the supplied spec path is not a `spec.md` under a `specs/` lineage folder, ASK the user to confirm.

## Honor the Spec's Degrees-of-Freedom Section

The contract a spec hands the plan has two parts: the **what**, which is fixed, and an explicit **`## Degrees of freedom` section** that names the **hows** the spec deliberately left to the implementer's choice. Before classifying any deviation as a candidate finding, **read the spec's Degrees-of-freedom section.** A plan choice the spec explicitly left open is **NOT a deviation** — it is the plan exercising granted freedom, and it must never be raised as drift. This is the load-bearing distinction that separates outcome 2 (the plan deviated from a fixed point of the spec) from "the plan chose within granted freedom" (no finding). When a plan resolves something the spec marked a degree of freedom, that resolution is correct by construction — do not raise it as a finding just because you would have chosen differently, and during the walk, if the user points at a degree-of-freedom you missed, that resolves the candidate finding.

## The Four Outcomes

A plan adherence review checks the plan against the spec and sorts each candidate finding into one of four outcomes. This classification is the core of the walk — every finding is surfaced WITH its outcome:

1. **Plan adheres** — the point is covered, and any plan choice falls within the spec's granted degrees of freedom. Not a finding (or settled `resolved` if it was a candidate that turned out fine).
2. **Plan deviates from the spec (the plan is at fault)** — the spec is clear on a point, and the plan contradicts it, omits it, or adds work the spec did not call for (and did not mark a degree of freedom). The fix is to the PLAN: a new plan content state that adheres. In this interactive walk the plan is edited in place to fix it (the plan is a disposable compiler-IR with no `version` and no stored status), either during the walk if the user agrees on the spot or captured as an `accepted` finding to fix after the walk.
3. **Plan deviates because the spec is ambiguous or incomplete (the SPEC is at fault)** — the plan made a choice it could not avoid, because the spec did not pin the point down and did not mark it a degree of freedom.
4. **Plan is ambiguous because the spec is ambiguous or incomplete (the SPEC is at fault)** — the plan could not commit to a clear approach because the spec left the point under-determined and did not mark it a degree of freedom.

**Outcomes 3 and 4 are spec faults. They route to the HUMAN and FIX THE SPEC — they NEVER patch the plan to paper over a spec gap.** Whether you present outcomes 3 and 4 as two separate findings or merge them into one "spec-fault" finding is your discretion; the requirement is that every spec-fault finding clearly states that the fix is to the SPEC, not the plan. Fixing the spec is the only legal post-approval spec edit, and it happens via an owner-approved, record-backed amendment — not by editing the plan to pick a reasonable-looking value. During the walk, do not let the user settle a spec fault by "just having the plan choose something": name it a spec fault, log it as such, and route it to the spec.

Do not collapse a spec fault into a plan fix. The temptation — "let's just make the plan pick something reasonable" — is exactly the failure mode that lets an unmade decision reach implementation. If the spec is silent on a fixed point, the plan cannot legitimately fill the gap; the spec must.

## Loose vs Strict Detection

Detect the plan's granularity by reading the plan body. The detection determines which ambiguity check applies in the per-task adherence pass.

- A plan is **loose-granularity** when its task list is composed of brief 1–3 sentence task descriptions, each carrying at minimum an objective sentence and an observable-verification sentence.
- A plan is **strict-granularity** when each task block carries SIX labeled fields: `Objective`, `Input` (or `Input / context`), `Steps` (or `Steps / substeps`), `Files modified`, `Verification`, `Acceptance criteria`.

If the body mixes both styles, surface it as a candidate finding (a plan holds to one granularity per artifact) — a plan-authoring fault (outcome 2). On a strict plan the per-task ambiguity check is MANDATORY-strict: each six-field block must leave no inference required. On a loose plan, ambiguity in a task is a granularity-fit signal, not a finding against the loose task itself.

## What This Skill Reviews

Every finding tethers to the spec ("does the plan, executed end-to-end, deliver what the spec's acceptance criteria promised?") and to downstream impact ("what will the implementer build that the spec did not promise, or fail to build that it did?"). A finding that does not tether to the spec or a downstream consequence is noise; cut it or sharpen it before surfacing.

### Adherence to the spec (the core check)

Map each of the spec's acceptance criteria (and intended outcomes) to the plan tasks that satisfy them, then classify each candidate finding into one of the four outcomes:

- **Coverage gap** — a spec acceptance criterion or intended outcome no plan task addresses. Spec-clear omission → **outcome 2** (fix the plan). Spec silent/ambiguous on what is required → **outcome 3 or 4** (fix the spec).
- **Drift** — a plan task doing work the spec did not call for, or reinterpreting a settled point. Spec-clear contradiction → **outcome 2** (fix the plan). Drift because the spec was ambiguous → **outcome 3** (fix the spec). First confirm the drifted choice is NOT something the Degrees-of-freedom section granted.
- **Order-of-operations** — a task depending on a later task's output is a plan-authoring fault → **outcome 2** (fix the plan).
- **Ambiguity in the plan** — a plan task too vague to implement. Vagueness from a spec gap → **outcome 4** (fix the spec). Plan merely under-specifying a spec-clear point → **outcome 2** (fix the plan).

When no spec is available (the confirmed planning-without-spec exception), the adherence check cannot run; note this in `## Open Questions` and fall back to the structural checks below.

### Per-task ambiguity (granularity-conditional)

**On a strict plan, MANDATORY.** For each task, every one of the six fields must leave no inference required by an agent-leaning implementer: `Objective` (one concrete sentence, not a sub-objective), `Input / context` (specific artifacts/files/upstream state, including the spec acceptance criteria the task satisfies), `Steps / substeps` (prescriptive concrete actions, not sub-objectives), `Files modified` (every file by relative path with `(NEW)` / `(DELETED)` markers), `Verification` (mechanical — a command, `grep`, `jq`, `test -f`, or named test), `Acceptance criteria` (observable post-conditions tied where possible to the spec's acceptance criteria). A per-task ambiguity from the plan under-specifying a spec-clear point is **outcome 2**; one whose root cause is the spec leaving the point under-determined is **outcome 4**.

**On a loose plan, ambiguity is a granularity-fit signal**, not a finding against the loose task itself: a loose task hiding so much inference that the implementer would have to ask follow-up questions before starting is a signal the plan should be strict for this implementer.

### Sequential, Isolated, Independently Implementable Contract

Every task must be **sequential, isolated, independently implementable, and independently reviewable**, regardless of granularity. A task requiring shared state with the next beyond its description fails **isolated**; a task that cannot be reviewed without running the previous one fails **independently reviewable**; a task needing more than one sitting fails **independently implementable**. These are plan-authoring faults — **outcome 2**.

### No-Parallelization Contract

Plans MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any construct suggesting concurrent execution. Implementation follows tasks in plan order; ANY such construct is a plan-authoring fault — **outcome 2**. When naming the forbidden constructs during the walk, use DESCRIPTIVE PROSE phrases — "bracketed wave prefixes on tasks", "dependency arrays", "depends_on fields", "task-graph notation", "fork/join syntax", "parallelization markers". Citing the offending passage in evidence is fine.

This skill does NOT promise: handoff-grade-bar coverage of the spec itself (that is the spec review), code-vs-spec fidelity for an implementation, or general-purpose code review.

## Walk Format

The walk presents the candidate findings list (or the per-task walk order) to the user up front, then walks one finding (or one task) at a time. The grain — per-finding or per-task — is the executor's discretion; the requirement is that each loop iteration settles ONE thing AND classifies it into one of the four outcomes. The per-finding grain is the recommended default when findings cluster around adherence (coverage gaps, drift, spec faults); the per-task grain is the recommended default when most findings are per-task ambiguity on a strict plan (walking task-by-task surfaces each six-field block in order).

For each iteration (finding, or task):

1. **Surface the finding (or task) WITH its outcome.** State the finding with its severity tag — `blocker` / `issue` / `nit` — AND its candidate outcome classification (1 adheres / 2 plan-fault / 3 spec-ambiguous-deviation / 4 spec-ambiguous-plan-ambiguity). State whether it is a coverage gap, drift, ordering, per-task ambiguity, or a sequential-isolation / no-parallelization contract violation. State why it matters for whoever picks up the plan next (the implementer). For an outcome-3/4 finding, state explicitly that the fix would be to the SPEC.
2. **Cite the evidence.** Quote the spec section (or the missing/ambiguous spec point) AND the plan section heading, task number, or short passage (≤ one sentence) the finding is grounded in. For per-task findings, cite by task number plus field name. Reference, do not recite. If the finding is "missing files-modified on Task 3", state what the substeps imply should be listed.
3. **ASK the user for their view.** Open with a question that gives room to answer: "What's your read on this?" / "Does the spec already pin this down somewhere I missed?" / "Is this the plan deviating, or did the spec leave it open as a degree of freedom?" / "Should the implementer infer this, or is the spec silent on it?". Accept the freeform answer.
4. **TEST the user's explanation against the plan AND the spec.** Re-read the cited plan section and the relevant spec passage (including the Degrees-of-freedom section). Check whether the user's framing actually resolves the finding or merely defends it. Look for: (a) a plan section you missed that covers the spec point, (b) a spec passage that backs the user's framing or marks the point a degree of freedom, (c) a decision log that genuinely settles the question. The user disagreeing is not itself evidence; the user pointing at a spec passage or degree-of-freedom that resolves the finding IS evidence. Critically, TEST whether a defended deviation is really within granted freedom or actually a spec fault the user wants to wave through — push back per `## Anti-Sycophancy Stance` when the test fails.
5. **Settle the finding (and lock its outcome).** Together, settle as one of:
   - `resolved` — outcome 1: the plan adheres (a section the reviewer missed, OR a spec degree-of-freedom that grants the choice, OR an upstream artifact that genuinely resolves it). Settlement stays in the decision log only.
   - `rejected` — the finding is not actually a finding (false positive from the candidate-list draft). Settlement stays in the decision log only.
   - `accepted` — the finding is genuine and actionable. For an **outcome-2 plan fault**, the action is to fix the PLAN (edit the plan in place to adhere — either now during the walk if the user agrees, or after the walk). For an **outcome-3/4 spec fault**, the action is to fix the SPEC via an owner-approved, record-backed amendment, routed to the human — NEVER a plan patch. Lands in the review record at end-of-session.
   - `deferred` — genuine but the user wants to park it for later (a future plan re-check or a future spec amendment). Lands in the review record at end-of-session.
6. **Append a record to the decision log.** Use the `## D<N>: <Finding title>` shape. Include the severity tag AND the outcome classification (and whether the fix is plan or spec) in the title or rationale so the decision log carries the per-finding outcome legibly. If the settlement included a dissent per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim. If an outcome-2 plan fault was fixed in the plan in place during the walk, note that in the rationale.
7. **Move to the next finding (or task).** Do not move on while the current finding is still ambiguous — settle it cleanly first. Silence is not a settlement.

If a finding splits into sub-findings during the walk (e.g., a "Task 3 per-task ambiguity" finding turns out to be one vague-Verification sub-finding (outcome 2) plus one acceptance-criterion-the-spec-never-pinned sub-finding (outcome 4)), settle each as its own `## D<N>` record with its own outcome rather than collapsing them.

## Output Artifacts

This skill produces UP TO TWO artifacts. The decision log is the primary deliverable; the review record is conditional. (A separate, possible side effect is editing the plan in place to fix outcome-2 deviations — the plan is a disposable compiler-IR edited in place, not re-emitted as a new version.)

### Decision Log (primary, written when the walk produces at least one settlement)

A decision log is a **record**. Write it to the plan's `discussions/` folder:

```text
plans/NNN[-<desc>]/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

The `decision-log` artifact-type suffix is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (decision logs are records; they carry no `version`).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `<plan-slug>-adherence-review` or `plan-review-<topic>`. Confirm the slug with the user before the first settlement.
- The plan's `discussions/` folder is created on-demand. Do not pre-create empty folders.

The decision log is **append-only**. Each settled finding is appended as one record with a sequential per-log local heading:

```markdown
## D<N>: <Finding title> (<severity> · outcome <1–4> · <plan-fix | spec-fix>)

Decision: <settlement: resolved / rejected / accepted / deferred>

Rationale: <one or two sentences; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first settlement in this log and increments by `1` per settlement IN THIS LOG. The `## D<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's path.

Resolved AND rejected findings remain in the decision log only. They are NOT carried into the review record — they are already settled and need no further action.

### Review Record (conditional, written ONLY if unresolved actionable findings remain)

A review is a **record** that nests inside the plan it serves. Write it to the target plan's `reviews/` folder:

```text
plans/NNN[-<desc>]/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

The `review` artifact-type suffix is MANDATORY (it carries no `version` — reviews are records). The `reviews/` folder is created on-demand.

This artifact is written ONLY at the END of the walk, and ONLY if at least one `accepted` / `deferred` finding remains. **No review record if nothing remains.** If every finding was settled as `resolved` or `rejected` (and every outcome-2 plan fault was already fixed in the plan in place), no review record is written — the decision log is the only artifact, and the closing message states explicitly that no unresolved findings remain. Capturing nothing produces nothing.

When written, the review record carries ONLY the unresolved actionable findings, references-first, in this section order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`.

1. **`## References`** — FIRST, before any verdict, naming the plan under review AND the spec it was judged against at the top. One entry per line as `- <description>: <path>`; each path carries a description, never a bare path list. Within-thread paths are **thread-relative** (e.g. `plans/001/plan.md`, `specs/001/spec.md`, `plans/001/discussions/<UTC>-<desc>-decision-log.md`); cross-thread paths are **repo-relative** (e.g. `docs/threads/<other>/...`); **never absolute**. Include the plan path, the spec path, the decision log emitted by this same walk, any decision logs a finding traces to, and any prior reviews on the same plan.
2. **`## Verdict`** — overall judgment on what remains. State which unresolved findings are plan faults (still to be fixed in the plan) and which are spec faults (routed to the human to amend the spec). Suggested vocabulary (executor MAY refine): `not ready — spec-fault findings remain` when any outcome-3/4 finding is unresolved; `not ready — plan-fault findings remain` when only outcome-2 fixes are outstanding. The record never carries an "adheres" verdict because nothing would land in it in that case.
3. **`## Findings`** — only the `accepted` / `deferred` findings, each carrying its severity tag AND its outcome classification (and whether the fix is to the plan or the spec). Every spec-fault (outcome 3/4) finding states explicitly that the fix is to the SPEC, not the plan.
4. **`## Evidence`** — for each finding, cite the spec section (or the missing/ambiguous spec point) AND the plan task / section heading; for per-task findings, task number plus field name.
5. **`## Open Questions`** — clarifications worth confirming. Frame as questions, not as gaps to autofill. If no spec was available, this section EXPLICITLY notes that adherence could not be assessed.
6. **`## Next Actions`** — what to do next for each unresolved finding. For an outcome-2 plan fault: fix the plan in place to adhere. For an outcome-3/4 spec fault: amend the spec (owner-approved, record-backed amendment) to pin the ambiguous point down, then re-check the plan — never "edit the plan to pick something". One action per finding cluster.

Resolved and rejected findings are NOT repeated in the review record. Never skip `## References`; the plan and spec are always named.

#### Disposition Frontmatter

A review records its own disposition in its YAML frontmatter, under a `status:` map. **This skill emits the review with NO `status.disposed` field** — a review with no `status.disposed` is **open, mechanically, by parse**. The absence of the latch is the open state; there is no separate "open" marker to set.

When the review is later acted on, its disposition is recorded directly in this same frontmatter, set once:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>   # optional
```

- **Accept-and-revise** sets the frontmatter directly — for a spec fault, the **owner-approved amendment of the spec is the record**; for a plan fault, the in-place plan fix is the record. No separate disposing document is written.
- **Reject** sets the frontmatter with **no document at all** — no separate disposing record is required.
- The optional `rationale` is a thread-relative path to a discussion, if one happened. A discussion never owns the disposition — the frontmatter does.
- Disposition is **set-once**: changing your mind is a new review or a thread reopen, not a frontmatter flip-flop.

This skill only EMITS the review (open, no `status.disposed`). Disposing it — and amending the spec — is a downstream act, out of scope for this skill.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the plan artifact.** Detect the plan path. If unsupplied, vague, or the thread holds multiple plan lineages, ASK which lineage is intended. Do not pick by recency or `NNN`. Confirm the resolved path before reading.

3. **Resolve the spec the plan derives from.** The spec is the contract. If the user did not supply it, ASK which spec the plan derives from. Only fall back to structural-checks-only if the user confirms the thread genuinely has no spec, noting in `## Open Questions` that adherence could not be assessed.

4. **Read the plan and the spec READ-ONLY first.** Read both end-to-end before drafting candidate findings. Read the spec's `## Degrees of freedom` section carefully — it separates outcome 2 from "chose within granted freedom". The plan may be edited in place LATER to fix outcome-2 faults (it is a disposable compiler-IR), but the initial read is read-only.

5. **Detect loose vs strict granularity** per `## Loose vs Strict Detection`. Set the per-task ambiguity check to MANDATORY-strict or granularity-fit-signal mode. A mixed body is a candidate finding (outcome 2).

6. **Read the thread's decision logs READ-ONLY.** Locate `decision-log` records and read them so they can contribute candidate findings (a plan that contradicts a settled decision, a spec point a decision log already pinned down). If none exist, note that.

7. **Identify the candidate findings list (or pick the per-task walk order).** Walk the plan once end-to-end against the spec and draft a candidate list of findings, each tagged with its candidate outcome (1–4) and suggested severity, OR pick the per-task walk order. The grain is executor's discretion — see `## Walk Format`. Cluster related findings rather than fragmenting. Aim for fewer, higher-quality candidates.

8. **Confirm the candidate list (or walk order) with the user before walking.** List the candidates (or task walk order) by short title — with their candidate outcomes — back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop is cheaper than re-doing settlements. Fold in findings the user adds; drop findings the user removes as not worth walking.

9. **For each finding (or task) IN ORDER, run the per-iteration loop from `## Walk Format`.** Surface (with outcome) → cite evidence (plan + spec) → ASK → TEST against plan AND spec → settle (lock outcome) → log. Push back per the `## Anti-Sycophancy Stance` when warranted. When an outcome-2 plan fault is agreed on the spot, you MAY edit the plan in place to fix it during the walk; note the fix in the decision-log rationale.

10. **Capture the UTC stamp for the decision log.** When the FIRST settlement lands and the decision log needs to be created, compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse. The decision log is created LAZILY on the first settlement (per `## Decision Log Lazy Creation`).

11. **Append per-settlement records to the decision log.** After each settlement, append a `## D<N>:` record per `## Walk Format` step 6. Tell the user: `Decision saved: <short summary>.`

12. **At the END of the walk: write the review record IF unresolved findings remain.** If at least one `accepted` / `deferred` finding remains, capture the UTC stamp for the review (separate from the decision log's stamp), draft the references-first report covering only the unresolved findings, and write the artifact to `plans/NNN[-<desc>]/reviews/<UTC>-<kebab-desc>-review.md` under the target plan's lineage folder, with NO `status.disposed` field (open by parse). If ALL findings were settled as `resolved` or `rejected` (and any outcome-2 plan faults were fixed in the plan in place), do NOT write a review record — capturing nothing produces nothing.

13. **Final message.** Cite the decision log path (thread-relative). If the review record was written, cite its path too (thread-relative). If the plan was edited in place to fix outcome-2 faults, cite the plan path. If no review record was written, state explicitly: `No unresolved findings — no review record written.` No closing remark.

## Decision Log Lazy Creation

The decision log is created LAZILY at the FIRST settled finding — not proactively in step 7 or 8. If the candidate-list confirmation produces no walk (the user decides the candidates are all false positives and aborts) and no findings are settled, NO decision log is written. An interrupted walk with no settled findings leaves no artifact.

A walk that produces no decisions produces no log. The skill keeps state in-session until the first settlement, then creates the log at write time of the first `## D<N>` record.

If the user pauses mid-walk after at least one settlement has landed, the partial decision log is durable: every settlement up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## D<N+k>` record) — the log itself is the state.

## Scope Drift

When the user introduces a branch outside the plan-adherence walk — a finding about a different plan, a tangent about the process being used, a refactor idea unrelated to the plan's intent, a critique of the upstream spec that is broader than a single spec-fault finding — do not silently follow them and do not let the walk grow into a different shape. Propose ONE of:

1. **Split into its own decision log.** When the branch is itself a multi-finding discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` in the appropriate `discussions/` folder. If the branch is "the upstream spec has a deeper problem", recommend a separate spec review session.
2. **Capture it as a seed for a future thread.** When the branch is genuinely separate work, name it so it can be opened as its own thread later rather than polluting this review's decision log.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently. (A spec-fault finding (outcome 3/4) that surfaced from a plan task is NOT scope drift — it is a normal output of the adherence walk; route it to the spec via the review record, not here.)

## Commit Policy

This skill NEVER auto-commits any artifact — neither the decision log, the (conditional) review record, nor any in-place plan fix. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under the thread's `.wip/` folder — drafts are editable during the session but never committed by this skill.

## Immutability

A decision log is a record; it is **append-only**. Once a `## D<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a decision settles as a NEW `## D<N+k>` record explaining the change — never an in-place edit of an earlier record. The log itself is the state — there is no separate state file.

A review is a record. Its **body is frozen at emission** — once written into the plan's `reviews/` folder, the body is NOT rewritten. A revision to a review's body is a NEW review record (new UTC stamp, new kebab-desc). The review's **frontmatter `status:` map is a live surface** until the review is disposed: `status.disposed` / `status.disposition` / optional `status.rationale` may be set once when the review is acted on (this skill does not set them). Once `status.disposed` is set, the frontmatter freezes too.

The plan is a disposable compiler-IR with no stored status and no `version`; it is **edited in place** to fix outcome-2 plan faults while the thread is active, and freezes only when the thread closes. There is no new-version-file ceremony — git holds the diffs.

The spec is reviewed READ-ONLY by this skill. Spec-fault findings (outcome 3/4) are surfaced under `## Next Actions` as items the human must address by an owner-approved, record-backed spec amendment — never an edit this skill makes to the spec, and never a plan patch that papers over the gap.

No source-relation or lineage frontmatter (`Supersedes:`, `Forked from:`, etc.) is added to any emitted artifact — lineage between the decision log, the review record, the plan, and the spec lives in the `## References` section, not in metadata. The only frontmatter a review carries is its lifecycle `status:` map (and only once disposed); the decision log carries no frontmatter at all.
