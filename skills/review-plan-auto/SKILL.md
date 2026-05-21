---
name: review-plan-auto
description: Read an emitted V1 plan artifact at `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md` (loose OR strict granularity from any of the Phase 4 plan-* skills) and write a findings-first review report to the active thread's `inbox/open/<UTC>-<kebab-desc>-review-finding.md` covering four review axes per D83 — source-spec adherence, project conventions, granularity fit, and per-task ambiguity (mandatory for strict plans; granularity-fit signal for loose plans) — end-to-end, with no clarifying questions and no per-finding chat walk. Use when you want a lightweight autonomous review of a plan — not when you want to walk findings together one at a time (use `review-plan-interactive` for that), and not when you want to review the upstream spec (use `review-spec-auto` / `review-spec-interactive`) or the downstream implementation (use `review-implementation-auto` / `review-implementation-interactive`).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Review Plan Auto

Read a V1 plan artifact READ-ONLY and emit a findings-first review report to the active thread's `inbox/open/` folder under the V1 record-form filename grammar with the `review-finding` artifact-type token. This skill is the autonomous half of the V1 plan-review pair — it reads the plan, detects whether the plan is loose-granularity or strict-granularity, runs the four review axes from D83 against it, drafts the report end-to-end, and writes one record per review run. It does not ask clarifying questions, it does not walk findings with the user one-at-a-time, and it does not commit. For the collaborative per-finding (or per-task) walk with anti-sycophancy push-back, use the sibling skill `review-plan-interactive` instead.

`review-plan-auto` is one of TEN V1 review skills, paired across five review targets — proposal, spec, plan, implementation, code — each with an `-auto` and an `-interactive` variant. Two axes are independent: the REVIEW TARGET (plan here; proposal / spec / implementation / code in the other four pairs) and the AUTONOMY axis (autonomous here; collaborative in the sibling). The review target this skill addresses is the PLAN — a versioned-form artifact under the thread's `plans/` folder emitted by ONE of the Phase 4 plan-authoring skills: `skills/plan-loose-auto/SKILL.md`, `skills/plan-loose-interactive/SKILL.md`, `skills/plan-strict-auto/SKILL.md`, `skills/plan-strict-interactive/SKILL.md`, `skills/adjust-plan-granularity-auto/SKILL.md`, or `skills/adjust-plan-granularity-interactive/SKILL.md`. Plans accepted as input come in two granularities — loose and strict — and this skill consumes BOTH (the detection step is documented below). The handoff-grade bar for an upstream spec lives in `review-spec-auto` / `review-spec-interactive`; code-vs-original-intent fidelity for a downstream implementation lives in `review-implementation-auto` / `review-implementation-interactive`.

The four review axes carried by this skill (per D83) — source-spec adherence, project conventions, granularity fit, per-task ambiguity — give the plan target a structurally richer review than the lightweight proposal-review pair, while staying scoped to the plan's distinctive risk surface: a plan that does not deliver what its source artifact promised, a plan that drifts from project conventions, a plan whose granularity is mis-fit to its expected implementer, or a strict-plan task that hides inference an agent-leaning implementer would need spelled out. Per-task ambiguity is MANDATORY on strict plans because the six-field block (`Objective` / `Input` / `Steps` / `Files modified` / `Verification` / `Acceptance criteria`) per `skills/plan-strict-auto/SKILL.md` is supposed to leave NO inference required — a vague substep or fuzzy acceptance criterion in a strict plan is precisely the failure mode this axis catches. On a loose plan the same ambiguity check becomes a granularity-fit signal instead: a loose task that hides too much inference suggests the plan should have been strict, and the review may recommend `skills/adjust-plan-granularity-auto/SKILL.md` (or `skills/adjust-plan-granularity-interactive/SKILL.md`) accordingly.

## Inputs

This skill accepts ONE required input and ONE optional input:

1. **(Required) A V1 plan artifact path** under `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md` per the V1 versioned-form grammar at `docs/workflow/v1/filename-grammar.md`. The path may be passed absolute or relative to the repo root. Loose-granularity plans and strict-granularity plans are both accepted — the `## Loose vs Strict Detection` step below selects which ambiguity check applies.
2. **(Optional) A source-artifact path** — the spec, proposal, decision-log, GitHub issue, or raw prompt the plan was derived from. When supplied, this drives the `source-spec adherence` axis below. Accepted forms include a path to a V1 spec at `docs/threads/<thread>/specs/<UTC>-v<N>[-<descriptor>]-spec.md`, a path to a V1 proposal at `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`, a path to a V1 decision log at `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`, a full GitHub issue URL, or a free-form quoted prompt. When NOT supplied, the source-adherence axis is skipped with an `## Open Questions` note — the other three axes still run.

If the plan path is not supplied, ASK the user which plan to review — do not pick by recency. If multiple plausible plan artifacts exist in `docs/threads/<thread>/plans/` and the user's reference is vague ("the plan", "the latest plan", "v2", "the auth plan"), ASK the user which artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is NO global "latest plan" algorithm. There is no fallback to the highest version number. Silently picking by version or recency would hide a real decision — which plan variant the user intends to review, which version branch survived discussion — behind a sort order. If `v2-stricter-plan.md` and `v2-plan.md` coexist, ASK which is intended; the granularity-shift descriptor (per `skills/adjust-plan-granularity-auto/SKILL.md`) carries operative information the reader cannot recover from the filename alone.

The literal folder `docs/threads/<thread>/plans/` is the only V1 location plan artifacts land in per `docs/workflow/v1/thread-layout.md`. If the path passed is not under that folder, refuse and ASK the user to confirm — a plan not in `plans/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a V1 plan. The same applies to the optional source artifact: if supplied, its path should resolve to one of the V1 thread folders (`specs/`, `proposals/`, `discussions/`) or be a recognizable GitHub issue URL; otherwise ASK the user to confirm.

## Loose vs Strict Detection

Before applying the four review axes, this skill DETECTS the plan's granularity by reading the plan body. The detection determines which ambiguity check applies in the per-task axis and informs the granularity-fit axis.

- A plan is **loose-granularity** (per `skills/plan-loose-auto/SKILL.md` and `skills/plan-loose-interactive/SKILL.md`) when its task list is composed of brief 1–3 sentence task descriptions. Each task carries at minimum an objective sentence and an observable-verification sentence (the loose contract is: short, narrative, optimized for a human-leaning implementer who will infer obvious substeps from context).
- A plan is **strict-granularity** (per `skills/plan-strict-auto/SKILL.md` and `skills/plan-strict-interactive/SKILL.md`) when each task block carries the SIX labeled fields: `Objective`, `Input` (or `Input / context`), `Steps` (or `Steps / substeps`), `Files modified`, `Verification`, `Acceptance criteria`. The strict contract is: prescriptive, mechanical, optimized for an agent-leaning implementer who follows substeps literally with no inference.
- A plan that is a granularity-shift variant emitted by `skills/adjust-plan-granularity-auto/SKILL.md` or `skills/adjust-plan-granularity-interactive/SKILL.md` (whose filenames carry a mandatory descriptor like `<UTC>-v2-stricter-plan.md` or `<UTC>-v2-impl-ready-plan.md`) is treated by the OUTCOME granularity — read the body, not the descriptor.

If the body mixes both styles — some tasks have a six-field block and others have 1–3 sentence prose — flag this as an `issue` finding under the `granularity fit` axis: V1 plans hold to one granularity per artifact. Do not silently average; surface the inconsistency.

The detection result determines:

- The `per-task ambiguity` axis switches between MANDATORY-strict mode (where every six-field block must leave no inference required) and granularity-fit-signal-loose mode (where ambiguity in a loose task is a recommendation to switch to strict, not a finding against the loose task itself).
- The `granularity fit` axis weighs whether the chosen granularity is appropriate for the source artifact and the expected implementer (D58 places this choice with the user; the review CHECKS the fit, it does not impose a default).

## What This Skill Reviews

This is the **four-axis plan review** per D83. The check runs each axis in order and tethers every finding to downstream impact — "what does the implementer (or the next reviewer) have to guess about, work around, or rediscover?". Findings that do not tether to a downstream consequence are noise; cut them or sharpen them.

### Axis 1: Source-spec adherence

Does the plan, executed end-to-end, deliver what the source artifact promised? When a source artifact path was supplied as the optional second input, this axis maps each plan task to the source's expected outcomes / acceptance items.

- **Coverage gaps** — a piece of the source's intended outcome (or acceptance guidance, or expected behavior) that no plan task addresses is a `blocker` or `issue` depending on whether the gap is total (no task touches it) or partial (the plan covers part but leaves a hole).
- **Drift** — a plan task that does work the source did not call for, or that re-interprets a settled decision from the source's decision-log citations differently from how the source operates that decision, is an `issue` (the implementer will deliver something the source did not promise).
- **Order-of-operations** — the plan's task sequence must be implementable in order; a task that depends on output from a later task is a `blocker`. The plan's only execution graph is its task numbering (per the no-parallelization contract below).
- **Unresolved source questions carried forward** — if the source artifact had open questions and the plan neither resolves them nor flags them as carried-forward, that is an `issue`.

When NO source artifact was supplied, the source-adherence axis is SKIPPED, and `## Open Questions` carries an explicit note that this axis was not run — the review still proceeds with the remaining three axes.

### Axis 2: Project conventions

Does the plan follow the project's coding / testing / structural patterns? A plan that emits work against a path the project does not use, a build tool the project does not use, a testing convention the project does not follow, or a directory layout that contradicts the project's established structure is drifting from the project's conventions.

- **Path drift** — the plan creates a new module at a path the project does not use (e.g., the project keeps libraries under `src/lib/` but the plan adds them under `lib/` at the repo root).
- **Tool drift** — the plan uses a build tool, linter, package manager, or test framework the project does not use, or replaces one the project actively uses without flagging the switch.
- **Style drift** — the plan calls for code style that contradicts the project's documented conventions (formatter rules, import-organization rules, naming conventions). This is project-conventions, not personal taste; cite the project rule the plan contradicts.
- **Test-shape drift** — the plan calls for tests in a shape the project does not use (e.g., the project uses integration tests under `tests/` but the plan calls for inline unit tests in the source files).

A `nit` here is "this differs from convention by a small margin and may be acceptable"; an `issue` is "this differs from convention enough that the implementer will produce work that does not fit"; a `blocker` is "this differs from convention enough that the result will not function in the project's existing layout / build / test setup".

### Axis 3: Granularity fit

Is the chosen granularity (loose / strict) appropriate for THIS source artifact and THIS expected implementer? Per D58 the user picks granularity — there is no "default" or "better" — but the review CHECKS whether the choice fits.

- **Loose plan handed to an agent-leaning implementer** — a loose plan whose 1–3 sentence task descriptions assume the implementer will infer substeps, but the expected implementer is an agent that needs prescriptive steps, is a fit issue. Recommend `skills/adjust-plan-granularity-auto/SKILL.md` with a `stricter` direction.
- **Strict plan for a simple twenty-minute change** — a strict plan whose six-field per-task overhead bloats a small change a human implementer could finish quickly is a fit issue. Recommend `skills/adjust-plan-granularity-auto/SKILL.md` with a `looser` direction.
- **Mixed-granularity plan** — a plan body that mixes loose and strict styles task-to-task is an `issue` here too (a plan should pick one granularity).
- **Granularity mismatch with the source artifact's substance** — a thin proposal turned into a strict plan, or a richly-detailed spec turned into a one-line loose plan, suggests the granularity does not match the source's substance. Flag and recommend the shift.

### Axis 4: Per-task ambiguity

The granularity-conditional axis.

**On a strict plan, this axis is MANDATORY.** For each task, check that every one of the six fields leaves no inference required by an agent-leaning implementer:

- **Objective** is one concrete sentence stating what the task accomplishes — not a sub-objective ("improve auth"), not aspirational ("make it robust").
- **Input / context** names specific artifacts, files, or upstream state the task depends on, with absolute paths and `D<N>` citations where settled decisions constrain the task. If the task starts from the previous numbered task's output, that should be stated explicitly.
- **Steps / substeps** are prescriptive, concrete actions ("create file X", "add function Y to module Z", "run command Q"). A substep that reads as a sub-objective ("ensure the system handles edge cases") is too vague — `issue` or `blocker` depending on how much the implementer would have to guess.
- **Files modified** lists every file by relative path with `(NEW)` / `(DELETED)` markers where appropriate. A missing file here that the substeps imply touching is an `issue`; a substep that contradicts the files-modified list is a `blocker`.
- **Verification** is mechanical, not interpretive — a concrete command, `grep`, `jq`, `test -f` check, or named test, not "looks correct" or "manually inspect". Verification that the implementer cannot run without further inference is an `issue`.
- **Acceptance criteria** is observable post-conditions ("function X exists at module Y", "test Z passes", "config K has value V"), not aspirational ("the system is now reliable"). Aspirational acceptance is an `issue` or `nit` depending on whether the implementer could plausibly check it.

**On a loose plan, this axis is a granularity-fit signal.** A loose task whose 1–3 sentence description hides so much inference that the implementer would have to ask follow-up questions before starting is not a finding against the loose task directly — loose tasks expect inference — but it IS a signal that the plan should be strict for this implementer. Surface as an `issue` under the `granularity fit` axis with a recommendation to `skills/adjust-plan-granularity-auto/SKILL.md` with a `stricter` direction.

### D59 Contract: Sequential, Isolated, Independently Implementable

The plan-content contract from D59 — every task must be **sequential, isolated, independently implementable, and independently reviewable** — applies regardless of granularity per `skills/plan-loose-auto/SKILL.md` and `skills/plan-strict-auto/SKILL.md`. The review enforces it:

- A task that requires shared state with the next task beyond what is captured in its description fails the **isolated** part — `blocker`.
- A task that cannot be reviewed without running the previous task first (e.g., verification step that just reuses the previous task's output without an external observable) fails the **independently reviewable** part — `blocker`.
- A task that requires more than one sitting (the implementer has to pause and resume) fails the **independently implementable** part — `issue` if split is obvious, `blocker` if the task is fundamentally too large.

A finding against the D59 contract is a `blocker` by default — the plan cannot reasonably reach implementation in its current shape.

### D60 No-Parallelization Contract

V1 plans MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently. The Phase 4 plan skills enforce this at authoring time; this skill enforces it at review time. ANY such construct in the plan body is a `blocker` finding — V1 implementation skills (Phase 5) execute tasks in plan order, and parallelization markers mislead downstream readers about what V1 supports.

When naming the forbidden constructs in the review report, use DESCRIPTIVE PROSE phrases — "bracketed wave prefixes on tasks", "dependency arrays", "depends_on fields", "task-graph notation", "fork/join syntax", "parallelization markers" — to keep the review's own evidence quotations readable. Cite the offending passage by section heading or short quote, not by re-typing the literal forbidden token in prose (the literal token in the review body is fine when it is being cited as evidence; this guidance is about review prose around the citation).

This skill does NOT promise: handoff-grade-bar coverage of an upstream spec (that lives in `review-spec-*`), code-vs-original-intent fidelity for an implementation (that lives in `review-implementation-*`), general-purpose code review (that lives in `review-code-*`), or the lightweight proposal review for an early sketch (that lives in `review-proposal-*`). A finding that escalates beyond the four plan-review axes is out of scope here — flag it as a suggestion to escalate to one of the other review skills rather than performing the heavier check inline.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized findings-first per V1 review-family policy. The body MUST cover the following six sections in this order:

1. **`## Verdict`** — overall judgment on the plan against the four axes. Suggested vocabulary (executor MAY refine): `ready` (the plan passes the four axes; downstream implementation can act on it), `partially ready` (some findings need addressing first; specify which axis), `not ready` (one or more axes is missing or substantially incoherent; the plan needs a `v<N+1>` before downstream work — typically via `skills/adjust-plan-granularity-auto/SKILL.md` for granularity shifts or via re-emission from the upstream `plan-*` skill for content revisions). One overall verdict plus a one-line tether to the highest-impact finding below.
2. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit`). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which of the four axes it concerns (source adherence / project conventions / granularity fit / per-task ambiguity) or whether it is a D59 / D60 contract violation, (b) what is wrong (coverage gap / drift / order-of-operations / vague substep / missing files-modified / aspirational acceptance / parallelization marker / shared-state coupling / etc.), (c) why it matters for whoever picks up the plan next (the implementer in Phase 5, or the next reviewer).
3. **`## Evidence`** — for each finding above, cite the plan's section heading, task number, or a short quote (≤ one sentence). Reference, do not recite — quoting the plan back to the author is noise. For per-task findings, cite by task number plus field name (e.g., "Task 3 / Verification field").
4. **`## References`** — list every artifact the review reads or depends on: the plan path being reviewed (absolute path under `docs/threads/<thread>/plans/`), the source artifact path (absolute path) if one was supplied, any decision logs the plan cites by absolute path plus `D<N>` for specific operative decisions, and any prior review-findings on the same plan (also by absolute path). If the plan cites a decision log by `D<N>` and that decision contradicts the plan body, the contradiction is one of the findings above and the reference here is what backs it. Cite the relevant Phase 4 plan-* skill (`skills/plan-loose-auto/SKILL.md` or `skills/plan-strict-auto/SKILL.md`) when a finding is about the granularity contract.
5. **`## Open Questions`** — clarifications worth confirming with the plan author or downstream reader. Frame as questions, not as gaps to autofill. If the source artifact was not supplied, this section EXPLICITLY notes that the source-adherence axis was skipped. If a question can only be answered by the author, say so. If a question would normally surface in implementation, say that too — and recommend the downstream skill that should pick it up (typically one of the `implement-*` family).
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: emit a new plan version via the same Phase 4 plan-* skill that produced this one (per `docs/workflow/v1/immutability.md`, an emitted plan is immutable; the revision is a new `v<N+1>` artifact), shift granularity via `skills/adjust-plan-granularity-auto/SKILL.md` or `skills/adjust-plan-granularity-interactive/SKILL.md`, open a discussion via `skills/discussion/SKILL.md` or `skills/seeded-discussion/SKILL.md` to settle a specific finding, re-review the upstream spec via `skills/review-spec-auto/SKILL.md` / `skills/review-spec-interactive/SKILL.md` if the source-adherence findings trace back to spec ambiguity, or escalate to implementation via one of the `implement-*` skills once findings are addressed. One action per finding cluster; do not pad.

The six section headings are the V1 standard for the findings-first report shape per the V1 review-family CONTEXT (established in Plan 06-01). Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add (and the source-adherence axis WAS run), drop the heading. Do NOT collapse two sections into one; the explicit separation lets a downstream reader (or the interactive sibling resuming the same review topic) scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one plan; emitting one file per finding would clutter `inbox/open/` and break the "one record per review run" V1 review-family convention.

## Output Artifact

Write the review artifact to:

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

per the V1 record-form grammar at `docs/workflow/v1/filename-grammar.md` and the inbox routing rule at `docs/workflow/v1/thread-layout.md`. The `review-finding` artifact-type token is MANDATORY — no other suffix is permitted for this artifact, and the artifact MUST NOT use a versioned form (`v<N>`) because reviews are records, not versioned artifacts.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<plan-slug>-v<N>-review` (capturing which plan version was reviewed) or `<plan-slug>-review` followed by a phrase capturing the highest-impact axis or finding. The slug is part of the filename and is not user-confirmed in auto mode; the plan slug + version is treated as authoritative.
- The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation"). Do not pre-create empty folders.

Example filename:

```text
260521101212Z-auth-rollout-plan-v1-review-finding.md
```

For the full record-form grammar and the recognized V1 artifact-type list (which includes `review-finding` alongside `proposal`, `spec`, `plan`, `discussion`, `decision-log`, `inbox-item`), see `docs/workflow/v1/filename-grammar.md`.

The artifact lives in `inbox/open/` rather than `reviews/` — per `docs/workflow/v1/thread-layout.md`, V1 explicitly excludes a top-level `reviews/` folder; review findings ARE inbox items, and the inbox open/processed/dropped status is reflected by folder, not by frontmatter. Once a finding has been addressed (typically by emitting a `v<N+1>` plan or by shifting granularity via `adjust-plan-granularity-*`), the review-finding is moved from `inbox/open/` to `inbox/processed/` — that lifecycle is manual in V1 and out of scope for this skill.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Resolve the plan artifact.** Detect the plan path from the user's invocation. If the path is unsupplied, vague ("the plan", "v2"), or multiple plausible plans exist in `docs/threads/<thread>/plans/`, ASK the user which is intended. Do not pick by recency or version number. Confirm the resolved path before reading.

3. **Resolve the optional source artifact.** If the user supplied a source-artifact path (spec / proposal / decision-log / GitHub issue / raw prompt), confirm it and prepare to read it. If not supplied, note that the source-spec-adherence axis will be SKIPPED with an `## Open Questions` entry — do not invent a source artifact, do not silently pick the most recent spec in the thread, and do not run the axis without a confirmed source.

4. **Read the plan READ-ONLY.** Per `docs/workflow/v1/immutability.md`, emitted plan artifacts are immutable. This skill reads the plan but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the plan body. The review report is the deliverable, not a rewritten plan. Read end-to-end at least once before noting findings.

5. **Detect loose vs strict granularity per `## Loose vs Strict Detection`.** Set the per-task-ambiguity axis to MANDATORY-strict mode or granularity-fit-signal-loose mode based on the detection. Flag mixed-granularity bodies as a finding under the `granularity fit` axis.

6. **If a source artifact was supplied, read it READ-ONLY too.** Per `docs/workflow/v1/immutability.md`, the source artifact is immutable as well. Treat any decision logs cited by `D<N>` in the source as further READ-ONLY inputs that may need to be consulted; follow citations as needed but do not edit any cited log.

7. **Run the four review axes from `## What This Skill Reviews`.** Apply each axis in order: source-spec adherence (skip if no source supplied) → project conventions → granularity fit → per-task ambiguity. Tether every finding to downstream impact.

8. **Check the D59 contract on every task.** For each task in the plan, confirm it is sequential (numbered in execution order), isolated (no implicit cross-task state), independently implementable (one sitting), and independently reviewable (observable success). A failure here is typically a `blocker`.

9. **Check the D60 no-parallelization rule across the plan body.** Scan for wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, or any parallelization markers. ANY such construct is a `blocker` finding.

10. **Draft the findings-first report.** Compose the six sections in order: `## Verdict` → `## Findings` → `## Evidence` → `## References` → `## Open Questions` → `## Next Actions`. Skip a section entirely if it has nothing real to add (with the caveat that `## Open Questions` MUST carry the source-adherence-skipped note if applicable). Order findings within `## Findings` by impact (severity, then by axis sequence, then by task number for per-task findings).

11. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

12. **Write the review artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. The `review-finding` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `inbox/open/` folder is created on-demand per `docs/workflow/v1/thread-layout.md`. The review body is plain markdown — no YAML frontmatter on the review artifact itself.

13. **Confirm.** Tell the user: `Review written: <relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review-finding artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session (per `docs/workflow/v1/immutability.md`, "Drafts Are Editable") but are never committed by this skill.

## Immutability

Emitted review-finding artifacts are immutable per `docs/workflow/v1/immutability.md`. Once the file is written into `inbox/open/`, it is part of the thread's reviewable history and is NOT edited. A typo discovered in an emitted review-finding means writing a NEW review-finding record (new UTC stamp, new kebab-desc) — not an in-place edit. A revision to a review-finding is a NEW review-finding artifact, not an in-place edit.

The plan under review is ALSO IMMUTABLE per the same rules. The reviewer reads READ-ONLY and does NOT edit the plan. Findings that warrant revisions to the plan are surfaced under `## Next Actions` with the explicit recommendation to emit a NEW `v<N+1>` plan record — typically via `skills/adjust-plan-granularity-auto/SKILL.md` / `skills/adjust-plan-granularity-interactive/SKILL.md` for granularity shifts, or via re-emission from the upstream Phase 4 plan-* skill for content revisions — never an instruction to edit the existing plan in place.

When the optional source artifact was supplied, it is ALSO IMMUTABLE per the same rules — the source spec, proposal, or decision-log is read READ-ONLY and is not edited by this skill regardless of what findings the review surfaces. Findings against the source artifact (e.g., source-adherence findings that trace back to spec ambiguity) belong to `skills/review-spec-auto/SKILL.md` / `skills/review-spec-interactive/SKILL.md` or to `skills/review-proposal-auto/SKILL.md` / `skills/review-proposal-interactive/SKILL.md` for the appropriate target — flag those in `## Next Actions` and let the user invoke the upstream-target review skill separately.

No source-relation YAML frontmatter is added to the review body — lineage between a review-finding and the plan it reviews lives in the `## References` section (by absolute path), not in metadata on the file. Per `docs/workflow/v1/immutability.md`, the accepted trade-off is that the filename alone cannot tell you which plan a review reviewed — that mapping is recovered from the body's references section.
