---
name: review-plan-auto
description: Read an emitted plan artifact and write a findings-first report covering source adherence, project conventions, granularity fit, and per-task ambiguity when the user wants an autonomous plan review.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.2
---

# Review Plan Auto

Read a plan artifact READ-ONLY and emit a findings-first review report to the active thread's `inbox/open/` folder. This skill detects whether the plan is loose-granularity or strict-granularity, runs four review axes against it, drafts the report end-to-end, and writes one record per review run. It does not ask clarifying questions, does not walk findings with the user one-at-a-time, and does not commit. For a collaborative per-finding walk with push-back, run that review interactively instead.

## Inputs

This skill accepts ONE required input and ONE optional input:

1. **(Required) A plan artifact path** under `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md`. The path may be passed absolute or relative to the repo root. Loose-granularity plans and strict-granularity plans are both accepted — the `## Loose vs Strict Detection` step below selects which ambiguity check applies.
2. **(Optional) A source-artifact path** — the spec, proposal, decision-log, GitHub issue, or raw prompt the plan was derived from. When supplied, this drives the `source-spec adherence` axis. Accepted forms: a path to a spec artifact, a path to a proposal artifact, a path to a decision log, a full GitHub issue URL, or a free-form quoted prompt. When NOT supplied, the source-adherence axis is skipped with an `## Open Questions` note — the other three axes still run.

If the plan path is not supplied, ASK the user which plan to review — do not pick by recency. If multiple plausible plan artifacts exist in the thread's `plans/` folder and the user's reference is vague ("the plan", "the latest plan", "v2", "the auth plan"), ASK the user which artifact is intended — do not silently pick by recency or version number. If `v2-stricter-plan.md` and `v2-plan.md` coexist, ASK which is intended; a granularity-shift descriptor in the filename carries operative information the reader cannot recover from the filename alone.

The `docs/threads/<thread>/plans/` folder is the only location plan artifacts land in. If the path passed is not under that folder, refuse and ASK the user to confirm — a plan not in `plans/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a plan. The same applies to the optional source artifact: if supplied, its path should resolve to one of the thread folders (`specs/`, `proposals/`, `discussions/`) or be a recognizable GitHub issue URL; otherwise ASK the user to confirm.

## Loose vs Strict Detection

Before applying the four review axes, detect the plan's granularity by reading the plan body. The detection determines which ambiguity check applies in the per-task axis and informs the granularity-fit axis.

- A plan is **loose-granularity** when its task list is composed of brief 1–3 sentence task descriptions. Each task carries at minimum an objective sentence and an observable-verification sentence (the loose contract is: short, narrative, optimized for a human-leaning implementer who will infer obvious substeps from context).
- A plan is **strict-granularity** when each task block carries SIX labeled fields: `Objective`, `Input` (or `Input / context`), `Steps` (or `Steps / substeps`), `Files modified`, `Verification`, `Acceptance criteria`. The strict contract is: prescriptive, mechanical, optimized for an agent-leaning implementer who follows substeps literally with no inference.
- A plan that is a granularity-shift variant (whose filenames carry a descriptor like `<UTC>-v2-stricter-plan.md` or `<UTC>-v2-impl-ready-plan.md`) is treated by the OUTCOME granularity — read the body, not the descriptor.

If the body mixes both styles — some tasks have a six-field block and others have 1–3 sentence prose — flag this as an `issue` finding under the `granularity fit` axis: plans hold to one granularity per artifact. Do not silently average; surface the inconsistency.

The detection result determines:

- The `per-task ambiguity` axis switches between MANDATORY-strict mode (where every six-field block must leave no inference required) and granularity-fit-signal-loose mode (where ambiguity in a loose task is a recommendation to switch to strict, not a finding against the loose task itself).
- The `granularity fit` axis weighs whether the chosen granularity is appropriate for the source artifact and the expected implementer. The user picks granularity — the review CHECKS the fit, it does not impose a default.

## What This Skill Reviews

This is the **four-axis plan review**. The check runs each axis in order and tethers every finding to downstream impact — "what does the implementer (or the next reviewer) have to guess about, work around, or rediscover?". Findings that do not tether to a downstream consequence are noise; cut them or sharpen them.

### Axis 1: Source-spec adherence

Does the plan, executed end-to-end, deliver what the source artifact promised? When a source artifact path was supplied, this axis maps each plan task to the source's expected outcomes and acceptance items.

- **Coverage gaps** — a piece of the source's intended outcome (or acceptance guidance, or expected behavior) that no plan task addresses is a `blocker` or `issue` depending on whether the gap is total (no task touches it) or partial (the plan covers part but leaves a hole).
- **Drift** — a plan task that does work the source did not call for, or that re-interprets a settled decision from the source's decision-log citations differently from how the source operates that decision, is an `issue` (the implementer will deliver something the source did not promise).
- **Order-of-operations** — the plan's task sequence must be implementable in order; a task that depends on output from a later task is a `blocker`. The plan's only execution graph is its task numbering (tasks run sequentially in order, never in parallel).
- **Unresolved source questions carried forward** — if the source artifact had open questions and the plan neither resolves them nor flags them as carried-forward, that is an `issue`.

When NO source artifact was supplied, the source-adherence axis is SKIPPED, and `## Open Questions` carries an explicit note that this axis was not run — the review still proceeds with the remaining three axes.

### Axis 2: Project conventions

Does the plan follow the project's coding, testing, and structural patterns? A plan that emits work against a path the project does not use, a build tool the project does not use, a testing convention the project does not follow, or a directory layout that contradicts the project's established structure is drifting from the project's conventions.

- **Path drift** — the plan creates a new module at a path the project does not use.
- **Tool drift** — the plan uses a build tool, linter, package manager, or test framework the project does not use, or replaces one the project actively uses without flagging the switch.
- **Style drift** — the plan calls for code style that contradicts the project's documented conventions (formatter rules, import-organization rules, naming conventions). Cite the project rule the plan contradicts.
- **Test-shape drift** — the plan calls for tests in a shape the project does not use.

A `nit` here is "this differs from convention by a small margin and may be acceptable"; an `issue` is "this differs from convention enough that the implementer will produce work that does not fit"; a `blocker` is "this differs from convention enough that the result will not function in the project's existing layout or build or test setup".

### Axis 3: Granularity fit

Is the chosen granularity (loose or strict) appropriate for this source artifact and this expected implementer? The user picks granularity — there is no "default" or "better" — but the review CHECKS whether the choice fits.

- **Loose plan handed to an agent-leaning implementer** — a loose plan whose 1–3 sentence task descriptions assume the implementer will infer substeps, but the expected implementer is an agent that needs prescriptive steps, is a fit issue. Recommend switching to strict granularity.
- **Strict plan for a simple twenty-minute change** — a strict plan whose six-field per-task overhead bloats a small change a human implementer could finish quickly is a fit issue. Recommend switching to loose granularity.
- **Mixed-granularity plan** — a plan body that mixes loose and strict styles task-to-task is an `issue` (a plan should pick one granularity).
- **Granularity mismatch with the source artifact's substance** — a thin proposal turned into a strict plan, or a richly-detailed spec turned into a one-line loose plan, suggests the granularity does not match the source's substance. Flag and recommend the shift.

### Axis 4: Per-task ambiguity

The granularity-conditional axis.

**On a strict plan, this axis is MANDATORY.** For each task, check that every one of the six fields leaves no inference required by an agent-leaning implementer:

- **Objective** is one concrete sentence stating what the task accomplishes — not a sub-objective ("improve auth"), not aspirational ("make it robust").
- **Input / context** names specific artifacts, files, or upstream state the task depends on, with absolute paths where settled decisions constrain the task. If the task starts from the previous numbered task's output, that should be stated explicitly.
- **Steps / substeps** are prescriptive, concrete actions ("create file X", "add function Y to module Z", "run command Q"). A substep that reads as a sub-objective ("ensure the system handles edge cases") is too vague — `issue` or `blocker` depending on how much the implementer would have to guess.
- **Files modified** lists every file by relative path with `(NEW)` / `(DELETED)` markers where appropriate. A missing file here that the substeps imply touching is an `issue`; a substep that contradicts the files-modified list is a `blocker`.
- **Verification** is mechanical, not interpretive — a concrete command, `grep`, `jq`, `test -f` check, or named test, not "looks correct" or "manually inspect". Verification that the implementer cannot run without further inference is an `issue`.
- **Acceptance criteria** is observable post-conditions ("function X exists at module Y", "test Z passes", "config K has value V"), not aspirational ("the system is now reliable"). Aspirational acceptance is an `issue` or `nit` depending on whether the implementer could plausibly check it.

**On a loose plan, this axis is a granularity-fit signal.** A loose task whose 1–3 sentence description hides so much inference that the implementer would have to ask follow-up questions before starting is not a finding against the loose task directly — loose tasks expect inference — but it IS a signal that the plan should be strict for this implementer. Surface as an `issue` under the `granularity fit` axis with a recommendation to shift to strict granularity.

### Sequential, Isolated, Independently Implementable Contract

Every task must be **sequential, isolated, independently implementable, and independently reviewable**, regardless of granularity. The review enforces it:

- A task that requires shared state with the next task beyond what is captured in its description fails the **isolated** part — `blocker`.
- A task that cannot be reviewed without running the previous task first (e.g., a verification step that just reuses the previous task's output without an external observable) fails the **independently reviewable** part — `blocker`.
- A task that requires more than one sitting (the implementer has to pause and resume) fails the **independently implementable** part — `issue` if split is obvious, `blocker` if the task is fundamentally too large.

A finding against this contract is a `blocker` by default — the plan cannot reasonably reach implementation in its current shape.

### No-Parallelization Contract

Plans MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently. Implementation executes tasks in plan order — parallelization markers mislead downstream readers. ANY such construct in the plan body is a `blocker` finding.

When naming the forbidden constructs in the review report, use descriptive prose phrases — "bracketed wave prefixes on tasks", "dependency arrays", "depends_on fields", "task-graph notation", "fork/join syntax", "parallelization markers" — to keep the review's own evidence quotations readable. Cite the offending passage by section heading or short quote.

This skill does NOT promise: handoff-grade-bar coverage of an upstream spec, code-vs-original-intent fidelity for an implementation, general-purpose code review, or the lightweight proposal review for an early sketch. A finding that escalates beyond the four plan-review axes is out of scope here — flag it as a suggestion for a separate review rather than performing the heavier check inline.

## Findings Report Shape

The emitted review artifact is ONE record per review run, organized findings-first. The body MUST cover the following six sections in this order:

1. **`## Verdict`** — overall judgment on the plan against the four axes. Suggested vocabulary (executor MAY refine): `ready` (the plan passes the four axes; downstream implementation can act on it), `partially ready` (some findings need addressing first; specify which axis), `not ready` (one or more axes is missing or substantially incoherent; the plan needs a new version before downstream work). One overall verdict plus a one-line tether to the highest-impact finding below.
2. **`## Findings`** — each finding carries a SEVERITY tag (`blocker` / `issue` / `nit`). One finding per bullet (or per `### <title>` heading for longer findings). For each finding state (a) which of the four axes it concerns (source adherence / project conventions / granularity fit / per-task ambiguity) or whether it is a sequential-contract or no-parallelization-contract violation, (b) what is wrong, (c) why it matters for whoever picks up the plan next.
3. **`## Evidence`** — for each finding above, cite the plan's section heading, task number, or a short quote (≤ one sentence). Reference, do not recite — quoting the plan back to the author is noise. For per-task findings, cite by task number plus field name (e.g., "Task 3 / Verification field").
4. **`## References`** — list every artifact the review reads or depends on: the plan path being reviewed (absolute path), the source artifact path (absolute path) if one was supplied, any decision logs cited by absolute path, and any prior review-findings on the same plan (also by absolute path). If the plan cites a decision log and that log contradicts the plan body, the contradiction is one of the findings above and the reference here is what backs it.
5. **`## Open Questions`** — clarifications worth confirming with the plan author or downstream reader. Frame as questions, not as gaps to autofill. If the source artifact was not supplied, this section EXPLICITLY notes that the source-adherence axis was skipped. If a question can only be answered by the author, say so. If a question would normally surface in implementation, say that too.
6. **`## Next Actions`** — what to do next given the verdict and findings. Typical actions: emit a new plan version (an emitted plan is immutable; the revision is a new `v<N+1>` artifact), shift granularity, open a discussion to settle a specific finding, re-review the upstream spec if source-adherence findings trace back to spec ambiguity, or escalate to implementation once findings are addressed. One action per finding cluster; do not pad.

Skip a section entirely rather than padding it — if `Open Questions` has nothing real to add (and the source-adherence axis WAS run), drop the heading. Do NOT collapse two sections into one; the explicit separation lets a downstream reader scan each layer independently.

Multiple findings live in ONE file. The record represents one review run against one plan; emitting one file per finding would clutter `inbox/open/`.

## Output Artifact

Write the review artifact to:

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

The `review-finding` artifact-type token is MANDATORY — no other suffix is permitted for this artifact. The artifact MUST NOT use a versioned form (`v<N>`) because reviews are records, not versioned artifacts.

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description of what this review is about — typically `<plan-slug>-v<N>-review` (capturing which plan version was reviewed) or `<plan-slug>-review` followed by a phrase capturing the highest-impact axis or finding. The slug is not user-confirmed in auto mode; the plan slug + version is treated as authoritative.
- The `inbox/open/` folder is created on-demand. Do not pre-create empty folders.

Example filename:

```text
260521101212Z-auth-rollout-plan-v1-review-finding.md
```

The artifact lives in `inbox/open/` rather than a separate `reviews/` folder. Once a finding has been addressed (typically by emitting a new plan version or by shifting granularity), the review-finding is moved from `inbox/open/` to `inbox/processed/` — that lifecycle is manual and out of scope for this skill.

The review body is plain markdown — no YAML frontmatter on the review artifact itself.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the plan artifact.** Detect the plan path from the user's invocation. If the path is unsupplied, vague, or multiple plausible plans exist in the thread's `plans/` folder, ASK the user which is intended. Do not pick by recency or version number.

3. **Resolve the optional source artifact.** If the user supplied a source-artifact path (spec / proposal / decision-log / GitHub issue / raw prompt), confirm it and prepare to read it. If not supplied, note that the source-spec-adherence axis will be SKIPPED with an `## Open Questions` entry — do not invent a source artifact, do not silently pick the most recent spec in the thread.

4. **Read the plan READ-ONLY.** Emitted plan artifacts are immutable. This skill reads the plan but does NOT edit it, does NOT rewrite it, does NOT add frontmatter, and does NOT propose edits to the plan body. The review report is the deliverable, not a rewritten plan. Read end-to-end at least once before noting findings.

5. **Detect loose vs strict granularity per `## Loose vs Strict Detection`.** Set the per-task-ambiguity axis to MANDATORY-strict mode or granularity-fit-signal-loose mode based on the detection. Flag mixed-granularity bodies as a finding under the `granularity fit` axis.

6. **If a source artifact was supplied, read it READ-ONLY too.** The source artifact is also immutable. Treat any decision logs cited in the source as further READ-ONLY inputs; follow citations as needed but do not edit any cited log.

7. **Run the four review axes from `## What This Skill Reviews`.** Apply each axis in order: source-spec adherence (skip if no source supplied) → project conventions → granularity fit → per-task ambiguity. Tether every finding to downstream impact.

8. **Check the sequential-contract on every task.** For each task in the plan, confirm it is sequential (numbered in execution order), isolated (no implicit cross-task state), independently implementable (one sitting), and independently reviewable (observable success). A failure here is typically a `blocker`.

9. **Check the no-parallelization rule across the plan body.** Scan for wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, or any parallelization markers. ANY such construct is a `blocker` finding.

10. **Draft the findings-first report.** Compose the six sections in order: `## Verdict` → `## Findings` → `## Evidence` → `## References` → `## Open Questions` → `## Next Actions`. Skip a section entirely if it has nothing real to add (with the caveat that `## Open Questions` MUST carry the source-adherence-skipped note if applicable). Order findings within `## Findings` by impact (severity, then by axis sequence, then by task number for per-task findings).

11. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

12. **Write the review artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. The `review-finding` artifact-type suffix is MANDATORY. The `inbox/open/` folder is created on-demand. The review body is plain markdown — no YAML frontmatter on the review artifact itself.

13. **Confirm.** Tell the user: `Review written: <relative-path-to-the-file>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits the review-finding artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session but are never committed by this skill.

## Immutability

Emitted review-finding artifacts are immutable. Once the file is written into `inbox/open/`, it is part of the thread's reviewable history and is NOT edited. A typo discovered in an emitted review-finding means writing a NEW review-finding record (new UTC stamp, new kebab-desc) — not an in-place edit.

The plan under review is ALSO IMMUTABLE. The reviewer reads READ-ONLY and does NOT edit the plan. Findings that warrant revisions to the plan are surfaced under `## Next Actions` with the explicit recommendation to emit a NEW `v<N+1>` plan record — never an instruction to edit the existing plan in place.

When the optional source artifact was supplied, it is ALSO IMMUTABLE — the source spec, proposal, or decision-log is read READ-ONLY and is not edited by this skill regardless of what findings the review surfaces. Findings against the source artifact (e.g., source-adherence findings that trace back to spec ambiguity) are out of scope for this skill — flag them in `## Next Actions` and recommend reviewing the source artifact separately.

No source-relation YAML frontmatter is added to the review body — lineage between a review-finding and the plan it reviews lives in the `## References` section (by absolute path), not in metadata on the file. The accepted trade-off is that the filename alone cannot tell you which plan a review reviewed — that mapping is recovered from the body's references section.
