---
name: review-plan-interactive
description: Walk a V1 plan artifact at `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md` (loose OR strict granularity from any of the Phase 4 plan-* skills) one finding (or one task) at a time — ASKING the user for their view AND TESTING that view against the plan (and against the optional source artifact when supplied) — checking four review axes per D83 (source-spec adherence, project conventions, granularity fit, per-task ambiguity), writing a decision log to `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`, and dumping ONLY unresolved actionable findings to `inbox/open/<UTC>-<kebab-desc>-review-finding.md` at the END of the session (no Inbox file if nothing remains). Use when you want to think the plan review through collaboratively with the agent and have the resolved-vs-unresolved split captured for you — not when you want autonomous end-to-end review (use `review-plan-auto` for that), and not when you want to review the upstream spec (use `review-spec-auto` / `review-spec-interactive`) or the downstream implementation (use `review-implementation-auto` / `review-implementation-interactive`).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Plan Interactive

Walk a V1 plan artifact READ-ONLY one finding (or one task) at a time with the user, ASK the user for their view on each finding AND TEST that view against the plan (and against the optional source artifact when supplied), settle each finding as resolved / rejected / accepted / deferred / parked, append per-finding records to a decision log under the active thread's `discussions/` folder, and — only if unresolved actionable findings remain at the end of the session — dump those to an `inbox/open/` review-finding artifact. This skill is the collaborative half of the V1 plan-review pair. For end-to-end autonomous review with no per-finding walk, use the sibling skill `review-plan-auto` instead.

`review-plan-interactive` is one of TEN V1 review skills, paired across five review targets — proposal, spec, plan, implementation, code — each with an `-auto` and an `-interactive` variant. Two axes are independent: the REVIEW TARGET (plan here; proposal / spec / implementation / code in the other four pairs) and the AUTONOMY axis (collaborative here; autonomous in the sibling). The review target this skill addresses is the PLAN — a versioned-form artifact under the thread's `plans/` folder emitted by ONE of the Phase 4 plan-authoring skills: `skills/plan-loose-auto/SKILL.md`, `skills/plan-loose-interactive/SKILL.md`, `skills/plan-strict-auto/SKILL.md`, `skills/plan-strict-interactive/SKILL.md`, `skills/adjust-plan-granularity-auto/SKILL.md`, or `skills/adjust-plan-granularity-interactive/SKILL.md`. Plans accepted as input come in two granularities — loose and strict — and this skill consumes BOTH (the detection step is documented below). The handoff-grade bar for an upstream spec lives in `review-spec-auto` / `review-spec-interactive`; code-vs-original-intent fidelity for a downstream implementation lives in `review-implementation-auto` / `review-implementation-interactive`.

The four review axes carried by this skill (per D83) — source-spec adherence, project conventions, granularity fit, per-task ambiguity — give the plan target a structurally richer review than the lightweight proposal-review pair, while staying scoped to the plan's distinctive risk surface: a plan that does not deliver what its source artifact promised, a plan that drifts from project conventions, a plan whose granularity is mis-fit to its expected implementer, or a strict-plan task that hides inference an agent-leaning implementer would need spelled out. Per-task ambiguity is MANDATORY on strict plans because the six-field block (`Objective` / `Input` / `Steps` / `Files modified` / `Verification` / `Acceptance criteria`) per `skills/plan-strict-auto/SKILL.md` is supposed to leave NO inference required — a vague substep or fuzzy acceptance criterion in a strict plan is precisely the failure mode this axis catches. On a loose plan the same ambiguity check becomes a granularity-fit signal instead: a loose task that hides too much inference suggests the plan should have been strict for this implementer, and the walk may recommend `skills/adjust-plan-granularity-auto/SKILL.md` (or `skills/adjust-plan-granularity-interactive/SKILL.md`) accordingly. The cheap moment to push back is during this walk — once the plan is escalated to implementation, the cost of unflagged ambiguity, drift, or granularity mis-fit compounds in commits the user may not want to rewind.

## Anti-Sycophancy Stance

Your job is to help the user reach the right verdict on the plan against the four review axes, not to make them feel good about whatever the plan currently says. Treat the per-finding walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **a review is most valuable when it disagrees with the author**. A review whose only effect is to validate the plan because the author defends it has produced nothing useful; the cheap moment to push back is during the walk, before the plan is escalated to implementation. Bad design captured in the plan becomes expensive during implementation because the implementer — human or agent — will not have you in the loop to ask follow-ups. Push back hard on weak reasoning, hidden assumptions, or granularity mis-fit; never soften findings just because the user pushes back.

This is the V1 review stance: push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back. A reviewer who waters down a real finding when the author objects has stopped reviewing and started agreeing. The walk's value sits in the disagreement, not the consensus.

Hold these together:

- **Disagree when you disagree.** If the user's view of a finding conflicts with the evidence in the plan, your read of the plan's source artifact, or the codebase / project-conventions reality, say so plainly before settling. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user dismisses a finding for a reason that doesn't hold up — "the implementer will figure it out", "it's obvious from the source", "we'll deal with it in implementation" — name the gap, surface the assumption, and bring it into the conversation before the finding is settled as `rejected` or `resolved`. A future implementer who has never seen this conversation will not "figure it out" — that is precisely what the per-task ambiguity axis enforces.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, granularity mis-fit, project-convention drift — raise them, even if the user wants to move on. Better captured as a finding now than rediscovered during implementation, where the cost compounds in commits.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the plan, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument (e.g., the user names a project-convention exception you were not aware of).
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a finding's severity, settlement, or wording just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a finding differently, identify the exact assumption or value judgment causing the split, then resolve it before settling the finding.
- **Refuse to log a finding settlement you believe is wrong without flagging it.** If the user insists on settling a finding as `resolved` or `rejected` when you believe it remains actionable, log the settlement they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other settlement> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the review owned by the evidence.** The goal is not for either side to win. The goal is to record settlements that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered. Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back.

If you believe a finding is being dismissed without real reason, refuse to log it silently as `rejected`. Either resolve the disagreement first, or log the dissent verbatim in the rationale line. The cheap moment for the review to do its job is during the walk — once the plan is escalated to implementation, the cost of unflagged findings compounds, and once commits land in the working tree V1 implementation skills will not rewind them.

## Inputs

This skill accepts ONE required input and ONE optional input:

1. **(Required) A V1 plan artifact path** under `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md` per the V1 versioned-form grammar at `docs/workflow/v1/filename-grammar.md`. The path may be passed absolute or relative to the repo root. Loose-granularity plans and strict-granularity plans are both accepted — the `## Loose vs Strict Detection` step below selects which ambiguity check applies.
2. **(Optional) A source-artifact path** — the spec, proposal, decision-log, GitHub issue, or raw prompt the plan was derived from. When supplied, this drives the `source-spec adherence` axis below. Accepted forms include a path to a V1 spec at `docs/threads/<thread>/specs/<UTC>-v<N>[-<descriptor>]-spec.md`, a path to a V1 proposal at `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`, a path to a V1 decision log at `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`, a full GitHub issue URL, or a free-form quoted prompt. When NOT supplied, the source-adherence axis is skipped with an `## Open Questions` note — the other three axes still run.

If the plan path is not supplied, ASK the user which plan to review — do not pick by recency. If multiple plausible plan artifacts exist in `docs/threads/<thread>/plans/` and the user's reference is vague ("the plan", "the latest plan", "v2", "the auth plan"), ASK the user which artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is NO global "latest plan" algorithm. There is no fallback to the highest version number. Silently picking by version or recency would hide a real decision — which plan variant the user intends to review, which version branch survived discussion — behind a sort order.

The literal folder `docs/threads/<thread>/plans/` is the only V1 location plan artifacts land in per `docs/workflow/v1/thread-layout.md`. If the path passed is not under that folder, refuse and ASK the user to confirm — a plan not in `plans/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a V1 plan. The same applies to the optional source artifact: if supplied, its path should resolve to one of the V1 thread folders (`specs/`, `proposals/`, `discussions/`) or be a recognizable GitHub issue URL; otherwise ASK the user to confirm.

## Loose vs Strict Detection

Before applying the four review axes, this skill DETECTS the plan's granularity by reading the plan body. The detection determines which ambiguity check applies in the per-task axis and informs the granularity-fit axis.

- A plan is **loose-granularity** (per `skills/plan-loose-auto/SKILL.md` and `skills/plan-loose-interactive/SKILL.md`) when its task list is composed of brief 1–3 sentence task descriptions. Each task carries at minimum an objective sentence and an observable-verification sentence (the loose contract is: short, narrative, optimized for a human-leaning implementer who will infer obvious substeps from context).
- A plan is **strict-granularity** (per `skills/plan-strict-auto/SKILL.md` and `skills/plan-strict-interactive/SKILL.md`) when each task block carries the SIX labeled fields: `Objective`, `Input` (or `Input / context`), `Steps` (or `Steps / substeps`), `Files modified`, `Verification`, `Acceptance criteria`. The strict contract is: prescriptive, mechanical, optimized for an agent-leaning implementer who follows substeps literally with no inference.
- A plan that is a granularity-shift variant emitted by `skills/adjust-plan-granularity-auto/SKILL.md` or `skills/adjust-plan-granularity-interactive/SKILL.md` (whose filenames carry a mandatory descriptor like `<UTC>-v2-stricter-plan.md` or `<UTC>-v2-impl-ready-plan.md`) is treated by the OUTCOME granularity — read the body, not the descriptor.

If the body mixes both styles — some tasks have a six-field block and others have 1–3 sentence prose — flag this as an `issue` finding under the `granularity fit` axis: V1 plans hold to one granularity per artifact. Do not silently average; surface the inconsistency to the user during the walk.

The detection result determines:

- The `per-task ambiguity` axis switches between MANDATORY-strict mode (where every six-field block must leave no inference required) and granularity-fit-signal-loose mode (where ambiguity in a loose task is a recommendation to switch to strict, not a finding against the loose task itself).
- The `granularity fit` axis weighs whether the chosen granularity is appropriate for the source artifact and the expected implementer (D58 places this choice with the user; the review CHECKS the fit, it does not impose a default).

## What This Skill Reviews

This is the **four-axis plan review** per D83. The walk runs each axis in order during candidate-list assembly, then settles findings task-by-task (or finding-by-finding — see `## Walk Format`). Every finding tethers to downstream impact — "what does the implementer (or the next reviewer) have to guess about, work around, or rediscover?". Findings that do not tether to a downstream consequence are noise; cut them or sharpen them before surfacing.

### Axis 1: Source-spec adherence

Does the plan, executed end-to-end, deliver what the source artifact promised? When a source artifact path was supplied as the optional second input, this axis maps each plan task to the source's expected outcomes / acceptance items.

- **Coverage gaps** — a piece of the source's intended outcome (or acceptance guidance, or expected behavior) that no plan task addresses is a `blocker` or `issue` depending on whether the gap is total or partial.
- **Drift** — a plan task that does work the source did not call for, or that re-interprets a settled decision differently from how the source operates it, is an `issue` (the implementer will deliver something the source did not promise).
- **Order-of-operations** — the plan's task sequence must be implementable in order; a task that depends on output from a later task is a `blocker`.
- **Unresolved source questions carried forward** — if the source artifact had open questions and the plan neither resolves them nor flags them as carried-forward, that is an `issue`.

When NO source artifact was supplied, the source-adherence axis is SKIPPED, and `## Open Questions` carries an explicit note that this axis was not run — the walk still proceeds with the remaining three axes.

### Axis 2: Project conventions

Does the plan follow the project's coding / testing / structural patterns? A plan that emits work against a path the project does not use, a build tool the project does not use, a testing convention the project does not follow, or a directory layout that contradicts the project's established structure is drifting from the project's conventions.

- **Path drift** — the plan creates a new module at a path the project does not use.
- **Tool drift** — the plan uses a build tool, linter, package manager, or test framework the project does not use, or replaces one the project actively uses without flagging the switch.
- **Style drift** — the plan calls for code style that contradicts the project's documented conventions; cite the project rule the plan contradicts.
- **Test-shape drift** — the plan calls for tests in a shape the project does not use.

### Axis 3: Granularity fit

Is the chosen granularity (loose / strict) appropriate for THIS source artifact and THIS expected implementer? Per D58 the user picks granularity — there is no "default" or "better" — but the walk CHECKS whether the choice fits.

- **Loose plan handed to an agent-leaning implementer** — recommend `skills/adjust-plan-granularity-auto/SKILL.md` with a `stricter` direction during the walk.
- **Strict plan for a simple twenty-minute change** — recommend `skills/adjust-plan-granularity-auto/SKILL.md` with a `looser` direction during the walk.
- **Mixed-granularity plan** — surface as a finding.
- **Granularity mismatch with the source artifact's substance** — flag and recommend the shift during the walk.

### Axis 4: Per-task ambiguity

The granularity-conditional axis.

**On a strict plan, this axis is MANDATORY.** For each task, check that every one of the six fields leaves no inference required by an agent-leaning implementer:

- **Objective** is one concrete sentence stating what the task accomplishes — not a sub-objective, not aspirational.
- **Input / context** names specific artifacts, files, or upstream state. Settled decisions cited by absolute path + `D<N>` where they constrain the task.
- **Steps / substeps** are prescriptive, concrete actions. A substep that reads as a sub-objective is too vague.
- **Files modified** lists every file by relative path with `(NEW)` / `(DELETED)` markers where appropriate.
- **Verification** is mechanical, not interpretive — a concrete command, `grep`, `jq`, `test -f`, or named test.
- **Acceptance criteria** is observable post-conditions, not aspirational.

**On a loose plan, this axis is a granularity-fit signal.** A loose task whose 1–3 sentence description hides so much inference that the implementer would have to ask follow-up questions before starting is not a finding against the loose task directly — loose tasks expect inference — but it IS a signal that the plan should be strict for this implementer. Surface as an `issue` under the `granularity fit` axis with a recommendation to `skills/adjust-plan-granularity-auto/SKILL.md` with a `stricter` direction.

### D59 Contract: Sequential, Isolated, Independently Implementable

The plan-content contract from D59 — every task must be **sequential, isolated, independently implementable, and independently reviewable** — applies regardless of granularity per `skills/plan-loose-auto/SKILL.md` and `skills/plan-strict-auto/SKILL.md`. The walk enforces it:

- A task that requires shared state with the next task beyond what is captured in its description fails the **isolated** part — `blocker`.
- A task that cannot be reviewed without running the previous task first fails the **independently reviewable** part — `blocker`.
- A task that requires more than one sitting fails the **independently implementable** part — `issue` if split is obvious, `blocker` if the task is fundamentally too large.

### D60 No-Parallelization Contract

V1 plans MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently. ANY such construct in the plan body is a `blocker` finding — V1 implementation skills (Phase 5) execute tasks in plan order, and parallelization markers mislead downstream readers about what V1 supports.

When naming the forbidden constructs during the walk, use DESCRIPTIVE PROSE phrases — "bracketed wave prefixes on tasks", "dependency arrays", "depends_on fields", "task-graph notation", "fork/join syntax", "parallelization markers" — so the conversation references the construct by name without re-typing the literal forbidden token in walk prose. Citing the offending passage from the plan in evidence is fine; the prose guidance is about how the walk discusses the constructs.

This skill does NOT promise: handoff-grade-bar coverage of an upstream spec (that lives in `review-spec-*`), code-vs-original-intent fidelity for an implementation (that lives in `review-implementation-*`), general-purpose code review (that lives in `review-code-*`), or the lightweight proposal review for an early sketch (that lives in `review-proposal-*`).

## Walk Format

The walk presents the candidate findings list (or the per-task walk order) to the user up front, then walks one finding (or one task) at a time. The grain of the walk — per-finding (closer to `skills/seeded-discussion/SKILL.md`'s per-point walk) or per-task (closer to `skills/plan-strict-interactive/SKILL.md`'s element-by-element walk through the six fields of each task) — is the executor's discretion; the requirement is that each loop iteration settles ONE thing. The per-finding grain is the recommended default when findings cluster around the four axes (cross-task drift, granularity-fit issues, D59/D60 violations); the per-task grain is the recommended default when most findings are per-task ambiguity on a strict plan (because walking task-by-task surfaces each task's six-field block in order and exhausts the per-task-ambiguity axis cleanly).

For each iteration (finding, or task):

1. **Surface the finding (or task).** State the finding with its severity tag — `blocker` / `issue` / `nit`. State which axis it concerns (source adherence / project conventions / granularity fit / per-task ambiguity) or whether it is a D59 / D60 contract violation. State why it matters for whoever picks up the plan next (the implementer in Phase 5, or the next reviewer).
2. **Cite the evidence.** Quote the plan's section heading, task number, or a short passage (≤ one sentence) the finding is grounded in. For per-task findings, cite by task number plus field name. Reference, do not recite — do not paste large blocks of the plan back. If the finding is "missing files-modified field on Task 3", state explicitly what the substeps in Task 3 imply should be in the files-modified list.
3. **ASK the user for their view.** Open the loop with a question that gives the user room to answer: "What's your read on this?" / "Does the source artifact already cover this somewhere I missed?" / "Is the implementer expected to infer this, or should it be explicit?" / "Does this match a project convention I'm not aware of?". Accept the user's freeform answer.
4. **TEST the user's explanation against the plan artifact (and the source artifact when supplied).** Re-read the cited section (or the section the user points to). Check whether the user's framing actually resolves the finding or merely defends it. Look for: (a) a section of the plan you missed that genuinely covers the finding, (b) a section of the source artifact (when supplied) that backs the user's framing, (c) a `D<N>` decision-log citation that genuinely settles the question, (d) a project-convention reality (a documented rule, an existing module the user can point at) that resolves the project-conventions axis finding. ASK the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that resolves the finding IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails.
5. **Settle the finding.** Together, settle as one of:
   - `resolved` — the plan already covers the finding (a section the reviewer missed), OR the source artifact resolves it, OR the user's clarification points to an upstream artifact (a decision log cited by `D<N>`, a prior plan version, a project-convention rule) that genuinely resolves it. Settlement stays in the decision log only.
   - `rejected` — the finding is not actually a finding (false positive from the candidate-list draft; e.g., the reviewer misread the granularity as mixed when the body was loose throughout). Settlement stays in the decision log only.
   - `accepted` — the finding is genuine and actionable; it will need to be addressed (typically by emitting a `v<N+1>` plan via the upstream Phase 4 plan-* skill, by invoking `skills/adjust-plan-granularity-auto/SKILL.md` / `skills/adjust-plan-granularity-interactive/SKILL.md` for granularity shifts, or by re-reviewing an upstream spec via `skills/review-spec-auto/SKILL.md` / `skills/review-spec-interactive/SKILL.md` when source-adherence findings trace back to spec ambiguity). Dumps to the inbox-open review-finding artifact at end-of-session.
   - `deferred` — the finding is genuine but the user wants to park it for later (out of scope for this review run; address in a future version or a future review). Dumps to the inbox-open review-finding artifact at end-of-session.
   - `parked` — same as deferred but the user has explicitly asked to capture as an Inbox item rather than treat as a review-finding. The walk may route via `skills/capture-inbox/SKILL.md` instead of (or in addition to) the inbox-open dump.
6. **Append a record to the decision log.** Use the `## D<N>: <Finding title>` shape from `skills/discussion/SKILL.md` and `skills/seeded-discussion/SKILL.md`. `Decision: <settlement>` and `Rationale: <one or two sentences>`. Include the severity tag and the axis (or D59 / D60 violation) in the title or rationale so the decision log carries the per-finding outcome legibly. If the settlement included a dissent per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim.
7. **Move to the next finding (or task).** Do not move on while the current finding is still ambiguous — settle it cleanly first. Silence is not a settlement.

If a finding splits into sub-findings during the walk (e.g., a "Task 3 per-task ambiguity" finding turns out to be one vague-Verification sub-finding plus one missing-Files-modified sub-finding), settle each sub-finding as its own `## D<N>` record rather than collapsing them.

## Output Artifacts

This skill produces UP TO TWO artifacts. The decision log is the primary deliverable; the inbox-open review-finding dump is conditional.

### Decision Log (primary, written when the walk produces at least one settlement)

```text
docs/threads/<thread>/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

per `docs/workflow/v1/filename-grammar.md` (record form, `decision-log` artifact-type token) and the routing in `docs/workflow/v1/thread-layout.md`. The `decision-log` artifact-type suffix is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (decision logs are records, not versioned artifacts).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `<plan-slug>-v<N>-review` (capturing which plan version was reviewed) or `plan-review-<topic>` capturing the review topic. Confirm the slug with the user before the first settlement.
- The `discussions/` folder is created on-demand per `docs/workflow/v1/thread-layout.md`. Do not pre-create empty folders.

The decision log is **append-only**. Each settled finding is appended as one record with a sequential per-log local heading:

```markdown
## D<N>: <Finding title> (<severity> · <axis or contract>)

Decision: <settlement: resolved / rejected / accepted / deferred / parked>

Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first settlement in this log and increments by `1` per settlement IN THIS LOG. The `## D<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's path.

Resolved AND rejected findings remain in the decision log only. They are NOT written to the inbox-open dump — they are already settled and need no further action.

### Inbox-Open Review-Finding Dump (conditional, written ONLY if unresolved actionable findings remain)

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

per `docs/workflow/v1/filename-grammar.md` (record form, `review-finding` artifact-type token) and the routing in `docs/workflow/v1/thread-layout.md`. The `review-finding` artifact-type suffix is MANDATORY.

This artifact is written ONLY at the END of the walk, and ONLY if at least one `accepted` / `deferred` / `parked` finding remains. **No Inbox file if nothing remains.** If every finding was settled as `resolved` or `rejected`, no inbox-open dump is written — the decision log is the only artifact, and the closing message states explicitly that no unresolved findings remain. The same rule reads as "no Inbox dump if all findings resolved" or "no Inbox file when nothing remains" — capturing nothing produces nothing.

When written, the inbox-open dump carries ONLY the unresolved actionable findings, in the same six-section findings-first shape used by the autonomous sibling:

1. **`## Verdict`** — overall judgment on what remains against the four axes (typically `partially ready` or `not ready` if findings remain; the dump itself never carries a `ready` verdict because nothing would land in it in that case).
2. **`## Findings`** — only the `accepted` / `deferred` / `parked` findings, each carrying its severity tag and axis (or D59 / D60 violation).
3. **`## Evidence`** — plan section heading, task number, or short quote for each finding.
4. **`## References`** — the plan path under review (absolute path), the decision log path emitted by this same walk (absolute path), the source artifact path (when supplied, absolute path), any related decision logs or prior review-findings by absolute path, and a citation to the relevant Phase 4 plan-* skill (`skills/plan-loose-auto/SKILL.md` or `skills/plan-strict-auto/SKILL.md`) when a finding is about the granularity contract.
5. **`## Open Questions`** — clarifications worth confirming. Frame as questions, not as gaps to autofill. If the source artifact was NOT supplied, this section explicitly notes that the source-adherence axis was skipped.
6. **`## Next Actions`** — what to do next for each unresolved finding. Typical actions: emit a `v<N+1>` plan via the upstream Phase 4 plan-* skill, shift granularity via `skills/adjust-plan-granularity-auto/SKILL.md` / `skills/adjust-plan-granularity-interactive/SKILL.md`, re-review the upstream spec via `skills/review-spec-auto/SKILL.md` / `skills/review-spec-interactive/SKILL.md` if findings trace back to spec ambiguity, or escalate to implementation via one of the `implement-*` skills once findings are addressed.

Resolved and rejected findings are NOT repeated in the inbox-open dump — they are already settled in the decision log and require no further triage.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Resolve the plan artifact.** Detect the plan path from the user's invocation. If the path is unsupplied, vague ("the plan", "v2"), or multiple plausible plans exist in `docs/threads/<thread>/plans/`, ASK the user which is intended. Do not pick by recency or version number. Confirm the resolved path before reading.

3. **Resolve the optional source artifact.** If the user supplied a source-artifact path (spec / proposal / decision-log / GitHub issue / raw prompt), confirm it and prepare to read it. If not supplied, note that the source-spec-adherence axis will be SKIPPED with an `## Open Questions` entry — do not invent a source artifact, do not silently pick the most recent spec in the thread, and do not run the axis without a confirmed source.

4. **Read the plan READ-ONLY.** Per `docs/workflow/v1/immutability.md`, emitted plan artifacts are immutable. This skill reads the plan but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the plan body during the walk.

5. **Detect loose vs strict granularity per `## Loose vs Strict Detection`.** Set the per-task-ambiguity axis to MANDATORY-strict mode or granularity-fit-signal-loose mode. Flag mixed-granularity bodies as a candidate finding under the `granularity fit` axis.

6. **If a source artifact was supplied, read it READ-ONLY too.** Per `docs/workflow/v1/immutability.md`, the source artifact is immutable as well.

7. **Identify the candidate findings list (or pick the per-task walk order).** Walk the plan once end-to-end and draft a candidate list of findings tagged by axis (source adherence / project conventions / granularity fit / per-task ambiguity) plus D59 / D60 contract violations, each with suggested severity. OR pick the per-task walk order (each task in plan order). The grain is executor's discretion — see `## Walk Format`. Cluster related findings rather than fragmenting. Aim for fewer, higher-quality candidates over many minor ones.

8. **Confirm the candidate list (or walk order) with the user before walking.** List the candidates (or the task walk order) by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing settlements later. If the user adds findings the candidate list missed, fold them in. If the user removes findings as not worth walking, drop them.

9. **For each finding (or task) IN ORDER, run the per-iteration loop from `## Walk Format`.** Surface → cite evidence → ASK the user → TEST the user's explanation against the artifact (do not just accept) → settle → log. Push back per the `## Anti-Sycophancy Stance` when warranted.

10. **Capture the UTC stamp.** When the FIRST settlement lands and the decision log needs to be created, compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing. The decision log is created LAZILY on the first settlement (per `## Decision Log Lazy Creation`).

11. **Append per-settlement records to the decision log.** After each settlement, append a `## D<N>: <Finding title>` record per `## Walk Format` step 6. Tell the user: `Decision saved: <short summary>.`

12. **At the END of the walk: write the inbox-open dump IF unresolved findings remain.** If at least one `accepted` / `deferred` / `parked` finding remains, capture the UTC stamp for the dump (separate from the decision log's stamp), draft the six-section findings-first report covering only the unresolved findings, and write the artifact to `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. If ALL findings were settled as `resolved` or `rejected`, do NOT write an inbox-open file — capturing nothing produces nothing, and no Inbox file when nothing remains.

13. **Final message.** Cite the decision log path. If the inbox-open dump was written, cite its path too. If the dump was NOT written, state explicitly: `No unresolved findings — no inbox file written.` No closing remark.

## Decision Log Lazy Creation

The decision log is created LAZILY at the FIRST settled finding — not proactively in step 7 or 8. If the candidate-list confirmation produces no walk (user decides the candidates are all false positives and aborts) and no findings are settled, NO decision log is written. An interrupted walk with no settled findings leaves no artifact.

This matches the lazy-creation rule in `skills/discussion/SKILL.md` and `skills/seeded-discussion/SKILL.md`: a discussion or walk that produces no decisions produces no log. The skill keeps state in-session until the first settlement, then creates the log at write time of the first `## D<N>` record.

If the user pauses mid-walk after at least one settlement has landed, the partial decision log is durable: every settlement up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## D<N+k>` record), per the resumption pattern in `skills/seeded-discussion/SKILL.md`.

## Scope Drift

When the user introduces a branch that is outside the plan-review walk — a finding about a different plan, a tangent about the V1 workflow itself, a refactor idea unrelated to the plan's intent, a critique of the upstream spec — do not silently follow them and do not let the walk grow into a different shape than the one being discussed. Propose ONE of:

1. **Park as an Inbox item** via `skills/capture-inbox/SKILL.md` (PREFERRED for non-blocking side-findings). Captures a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this review's decision log.
2. **Split into its own decision log.** When the branch is itself a multi-finding discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` in `discussions/` for it via `skills/discussion/SKILL.md` or `skills/seeded-discussion/SKILL.md`. If the branch is "the upstream spec has the same problem", recommend invoking `skills/review-spec-interactive/SKILL.md` against the source artifact in a separate session.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the decision log nor the (conditional) inbox-open review-finding dump. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session (per `docs/workflow/v1/immutability.md`, "Drafts Are Editable") but are never committed by this skill.

## Immutability

Emitted decision logs are append-only per `docs/workflow/v1/immutability.md`. Once a `## D<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a decision settles as a NEW `## D<N+k>` record explaining the change — never an in-place edit of an earlier record. The log itself is the state — there is no separate state file, no progress tracker.

Emitted review-finding artifacts (the conditional inbox-open dump) are also immutable per `docs/workflow/v1/immutability.md`. Once written into `inbox/open/`, the review-finding is part of the thread's reviewable history and is NOT edited. A revision to a review-finding is a NEW review-finding record (new UTC stamp, new kebab-desc), not an in-place edit.

The plan under review is ALSO IMMUTABLE per the same rules. The reviewer reads READ-ONLY and does NOT edit the plan. Findings that warrant revisions to the plan are surfaced under `## Next Actions` in the inbox-open dump (or noted in the decision log) with the explicit recommendation to emit a NEW `v<N+1>` plan record — typically via `skills/adjust-plan-granularity-auto/SKILL.md` / `skills/adjust-plan-granularity-interactive/SKILL.md` for granularity shifts, or via re-emission from the upstream Phase 4 plan-* skill for content revisions — never an instruction to edit the existing plan in place.

When the optional source artifact was supplied, it is ALSO IMMUTABLE per the same rules — the source spec, proposal, or decision-log is read READ-ONLY and is not edited by this skill regardless of what findings the walk surfaces. Findings against the source artifact belong to `skills/review-spec-auto/SKILL.md` / `skills/review-spec-interactive/SKILL.md` or `skills/review-proposal-auto/SKILL.md` / `skills/review-proposal-interactive/SKILL.md` for the appropriate target — flag those in `## Next Actions` and let the user invoke the upstream-target review skill separately.

No source-relation YAML frontmatter is added to any emitted artifact — lineage between the decision log, the review-finding dump, and the plan they review lives in the `## References` section (by absolute path), not in metadata on the files. Per `docs/workflow/v1/immutability.md`, that history is recovered from the body's references, not from the filename.
