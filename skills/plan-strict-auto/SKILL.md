---
name: plan-strict-auto
description: Turn a spec, proposal, decision log, GitHub issue, or raw prompt into a strict-granularity v1 plan markdown file under the active V1 thread's `plans/` folder, end-to-end, with no clarifying questions. Strict plans carry explicit substeps, verification notes, files-modified, and acceptance criteria per task — optimized for an agent-leaning implementer that needs unambiguous prescriptive steps. Use when you already have the upstream input in hand and want a strict plan written down autonomously — not when you want to walk the plan task-by-task together (use `plan-strict-interactive`), and not when the downstream implementer is human-leaning and a brief task description suffices (use `plan-loose-auto` or `plan-loose-interactive`).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Plan Strict Auto

Forward-design a strict-granularity plan artifact under the active V1 thread's `plans/` folder, end-to-end, from a single upstream input. This skill is the autonomous generator half of the strict-granularity plan pair — it reads the input, drafts numbered tasks each carrying explicit substeps, files modified, verification, and acceptance criteria, self-reviews before emission, writes the artifact, and confirms its path. It does not ask clarifying questions, it does not walk the user task-by-task, and it does not commit.

`plan-strict-auto` is one of four plan-authoring skills. Loose vs strict and auto vs interactive are independent axes; pick the combination that fits your context:

- `plan-loose-auto` — autonomous, loose granularity. Use when the downstream implementer is human-leaning and a brief 1–3 sentence task description per task suffices.
- `plan-loose-interactive` — collaborative, loose granularity.
- `plan-strict-auto` (this skill) — autonomous, strict granularity.
- `plan-strict-interactive` — collaborative, strict granularity. Use when you want to walk each strict task element-by-element with anti-sycophancy pushback live.

Loose vs strict is a user/context choice per D58 — there is no "default" and no "better" granularity. Loose plans suit human-leaning implementers and exploratory work where the implementer is trusted to fill in details. Strict plans suit agent-leaning implementers and tighter handoff where ambiguity is expensive: the per-task substeps + verification + files-modified + acceptance criteria leave less room for the implementer to drift. Both granularities honor the same plan content contract — see `## Plan Artifact Contract` below.

## Inputs

`plan-strict-auto` accepts ONE of the following four input forms. Detect which form was passed before drafting:

1. **A spec artifact path** under `docs/threads/<thread>/specs/<UTC>-v<N>-spec.md`. The spec is the most common upstream input — its semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the plan's task list directly, and the spec's acceptance guidance maps cleanly onto per-task acceptance criteria.
2. **A proposal artifact path** under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. When the input is a proposal rather than a spec, the plan tasks elaborate the proposal's rough shape into an implementable sequence; treat the proposal's open questions as items the plan either resolves or carries forward. Strict-granularity from a proposal is heavier weight than from a spec — if the proposal is thin, consider whether `plan-loose-auto` would be a better fit.
3. **A decision-log artifact path** under `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`. The log carries one or more settled decisions with sequential `## D<N>: <Title>` headings. Each settled decision may map to a task (or constrain one) — cite the source log by absolute path + `D<N>` where the decision is operative in the relevant task's input/context field.
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
5. **A raw user prompt**. When no artifact is referenced, the user's prompt is itself the input — the plan is forward-designed directly from it.

If the input is ambiguous — multiple plausible specs share the same version number in the thread, multiple decision logs cover overlapping topics, the issue identifier is incomplete, the prompt references "the spec" with no clear referent — ASK the user which artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest input" algorithm. Do not silently pick by recency.

## Plan Artifact Contract

V1 plans hold to a single content contract regardless of granularity: every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable** (D59).

- **Sequential** — tasks are numbered in execution order. The implementation skills (Phase 5) execute tasks in plan order; the order is the only execution graph V1 supports.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If a task requires more than one sitting, it is too large and should be split. If a task cannot be started without first doing setup that belongs to another task, the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable, the task is under-specified.

The phrase "sequential, isolated, independently implementable" is the V1 plan content contract — every plan skill body restates it, and every task in every emitted plan must satisfy it. Strict-granularity tasks satisfy this contract just as loose-granularity tasks do; the difference is prescriptiveness of substeps and the presence of per-task fields (objective / input / steps / files-modified / verification / acceptance), not the contract.

## No Parallelization

V1 plans are sequential. Per D60, plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently.

- **Wave numbers**: do not emit. The implementation skills (Phase 5) execute tasks in plan order. There are no waves in V1.
- **Dependency arrays / depends_on fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope for V1.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

These constructs are forbidden at the artifact level per D60 — not as personal taste, but as a project-level V1 constraint. The implementation skills (Phase 5) execute tasks in plan order; introducing parallelization markers in a plan body misleads downstream readers about what V1 supports. Strict granularity is especially tempting territory for parallelization markers because the per-task fields look graph-shaped — resist. If you find yourself wanting to express parallelism, the plan is the wrong place to do it; loop back to the spec phase or open a separate discussion.

This skill body itself avoids parallelization notation in every example below — the `## Worked Example` is a negative test of D60 (the absence of forbidden constructs is observable in the example).

## Strict Plan Body Shape

A strict plan body is **numbered tasks with explicit substeps, verification notes, files modified, and acceptance criteria per task**. Optimize for an agent-leaning implementer who reads each task literally and executes the substeps in order with no inference required. Where a loose task fits in 1–3 sentences, a strict task fits in a structured block.

Each task MUST contain at minimum the following six fields:

1. **Objective** — one sentence stating what this task accomplishes. The objective is the "why" of the task, before any "how".
2. **Input / context** — the artifacts, files, or upstream state the task depends on. Cite settled decisions by absolute path + `D<N>` here when they constrain the task. If the task starts from the previous numbered task's output (the implicit V1 dependency), say so explicitly.
3. **Steps / substeps** — a numbered list of the explicit sub-actions the implementer takes. The substeps are prescriptive; an agent-leaning implementer can follow them literally. Each substep is one concrete action ("create file X", "add function Y to module Z", "run command Q"), not a sub-objective.
4. **Files modified** — the exact files this task touches. List every file by relative path. If a file is created, note `(NEW)` next to it; if removed, note `(DELETED)`. The list is the source of truth for the task's filesystem footprint.
5. **Verification** — how the implementer (or a reviewer) confirms the task succeeded. Prefer a concrete command, `grep`, `jq`, `test -f` check, or named test over "looks correct". Verification is mechanical, not interpretive — a reviewer running the verification block should reach the same conclusion as the implementer.
6. **Acceptance criteria** — the observable state of completion. What must be true after the task is done? A bullet list of post-conditions: "function X exists at module Y", "test Z passes", "config K has value V". Acceptance is the externally observable definition of done; verification is the procedure for checking it.

Each task MAY add additional fields (notes, rollback procedure, performance budget, etc.) when the input warrants it. The six fields above are the minimum.

The plan body uses freeform markdown. The executor MAY suggest a section heading scaffold (for example `## Goal`, `## Tasks`, `## Notes`) at the plan level, but inside each task the six fields above are the structural backbone. Section headings should help the downstream agent-leaning reader follow the prescriptive shape, not bloat the artifact.

Do NOT add YAML frontmatter to the plan body. The filename is the identifier; the body is plain markdown. Lineage between plan versions lives in the filename and the surrounding thread, not in metadata on the file (per `docs/workflow/v1/immutability.md`).

### Worked Example

A tiny strict plan task block. Note: only sequential numbered tasks. No wave numbers, no depends_on array, no bracketed wave prefixes, no fork/join syntax.

```markdown
### Task 1: Add JWT verification helper

**Objective:** Provide a reusable verification function that the auth middleware will call.

**Input / context:** Settled decision per `docs/threads/<thread>/discussions/<UTC>-auth-decision-log.md D2` — use the `jose` library, not `jsonwebtoken`.

**Steps:**
1. Add `jose` to `package.json` dependencies and run install.
2. Create `src/lib/jwt.ts` exporting `verifyToken(token: string): Promise<UserClaims | null>`.
3. Implement: import `jwtVerify` from `jose`, read `JWT_SECRET` from env, return the verified payload typed as `UserClaims`, return `null` on any failure.
4. Add unit tests at `src/lib/jwt.test.ts` covering a valid token, an expired token, a malformed token.

**Files modified:** `package.json`, `src/lib/jwt.ts` (NEW), `src/lib/jwt.test.ts` (NEW)

**Verification:** `npm test src/lib/jwt.test.ts` exits 0; `grep -q "jose" package.json` returns success.

**Acceptance criteria:**
- `verifyToken` exported from `src/lib/jwt.ts` with the signature above.
- Three unit tests pass: valid token, expired token, malformed token.
- `package.json` declares `jose` as a runtime dependency.
```

That is what a strict plan task looks like: six labeled fields, prescriptive substeps, mechanical verification, observable acceptance. An agent-leaning implementer can execute this task without inferring anything beyond what is written.

## Self-Review

Before writing the plan artifact to disk, run the following four-check self-review pass IN-SESSION (D61). The emitted plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the plan, executed end-to-end, actually achieve the input artifact's goal? If the input is a spec, does completing every plan task satisfy the spec's intended outcome and acceptance guidance? If the input is a proposal, does the plan elaborate the proposal's rough shape into a complete implementable sequence?
2. **Granularity fit** — is strict granularity appropriate for THIS input and THIS expected implementer? Strict plans are heavier weight; if the input does not have enough substance to warrant per-task substeps + verification (e.g., a sketchy proposal, an exploratory raw prompt, a small change a human implementer could finish in twenty minutes), the input may want loose granularity instead — flag this and recommend `plan-loose-auto`. The six-field structure should pay for itself; if it bloats the plan, switch.
3. **No under-splitting** — is every task independently implementable in one sitting? A task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one. Split it. Strict-granularity tasks are especially easy to under-split because the substep block hides the size — if the substeps would themselves be plan-task-shaped, the task is too big.
4. **No over-splitting** — are any tasks trivial 1-line tasks that bloat the plan? A task that just says "add a comment to `foo.ts`" with one substep is not a strict plan task; fold it into an adjacent task. Strict plans favor meatier tasks; the six-field overhead must be earned.

Run the four checks against the drafted plan body. If any check fails, revise the draft IN-SESSION (the `.wip/` draft is editable per `docs/workflow/v1/immutability.md`) before emitting. After the four checks pass, write the artifact.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp. If no thread exists, ASK where to create one OR auto-create when the input's slug is obvious.

2. **Resolve and read the input.** Detect which of the five `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title (the user's invocation context is responsible for credentials). For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended per `docs/workflow/v1/immutability.md`. Do not pick by recency.

3. **Derive the descriptor (usually omit).** First emission of a plan uses NO `<kebab-descriptor>` in the filename — the canonical first-version mainline is `<UTC>-v1-plan.md`. A descriptor is used only when this emission is one of several parallel candidates for the same target version (e.g., `<UTC>-v1-opus-plan.md`, `<UTC>-v1-sonnet-plan.md`) or when the executor has an explicit reason to mark this artifact as a variant. Default to NO descriptor.

4. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

5. **Draft the body with per-task fields.** Compose the plan body per `## Strict Plan Body Shape`: a short goal, a numbered task list where each task block carries the six labeled fields (objective / input / steps / files-modified / verification / acceptance), optional plan-level notes. Reference settled decisions from the upstream input by absolute path + `D<N>` in the relevant task's input/context field. No parallelization markers anywhere in the draft.

6. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted body. Revise the draft in `.wip/` (or in memory) until all four pass. The emitted body does not contain self-review notes — the discipline runs before emission.

7. **Write the artifact.** Create `docs/threads/<thread>/plans/<UTC>-v1-plan.md` (or `docs/threads/<thread>/plans/<UTC>-v1-<kebab-descriptor>-plan.md` if a descriptor is genuinely warranted — but the default for first emission is NO descriptor). The `plan` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `plans/` folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation") — do not pre-create it.

8. **Confirm.** Tell the user: `Plan written: <relative-path-to-the-file>`. Nothing else — no preamble, no summary, no closing remark.

## Filename and Folder

The plan artifact uses the V1 versioned-form filename grammar per `docs/workflow/v1/filename-grammar.md`:

```text
<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-plan.md
```

Rules from `docs/workflow/v1/filename-grammar.md`:

- The 12-character UTC stamp `YYMMDDHHMMSSZ` comes first, captured at write time and never re-derived afterward.
- `N` starts at `1`, not `0`. First emission is `v1`. There is no `v0`.
- First emission defaults to NO `<kebab-descriptor>` — the mainline integer-only file is `<UTC>-v1-plan.md`.
- A `<kebab-descriptor>` marks the file as a candidate or variant for mainline `v<N>` (e.g., parallel drafts as `v1-opus-plan.md`, `v1-sonnet-plan.md`, with the promoted file becoming `v1-plan.md`).
- The `plan` artifact-type token is MANDATORY in every plan filename.
- The `v<N>` segment names the TARGET version this artifact represents — not a predecessor it derives from.

Canonical first-emission example:

```text
260521120000Z-v1-plan.md
```

Example with descriptor (parallel candidate for the same target version):

```text
260521120000Z-v1-auth-migration-plan.md
```

The file lands at `docs/threads/<thread>/plans/<filename>` per `docs/workflow/v1/thread-layout.md`. The `plans/` folder is created on-demand on the first plan written for the thread; do not pre-create empty folders.

## Immutability

Emitted plan artifacts are immutable per `docs/workflow/v1/immutability.md`. Once the file is written into `plans/`, it is part of the thread's reviewable history and is not edited. A typo discovered in an emitted v1 plan means emitting a new version (`v2`), not an in-place edit. The same rule applies to every subsequent version — `v2` is locked once written, and a revision to `v2` means emitting `v3`. Never edit a plan file in place after it lands in `plans/`.

Drafts under `docs/threads/<thread>/.wip/` are editable until emission. While `plan-strict-auto` is composing the plan body in scratch space (or in memory), revisions are free. The lock applies the moment the file is written into `plans/` under the canonical filename grammar.

No source-relation YAML frontmatter is added to the plan body — lineage lives in filenames and the surrounding thread, not in metadata on the file. Per `docs/workflow/v1/immutability.md`, the accepted trade-off is that a filename cannot tell whether `v2` came directly from `v1`, from a `v2` candidate variant, or from a merge — that history is recovered from the thread itself, not from the file.

## Commit Policy

This skill NEVER commits the emitted plan automatically. Commits happen only if the surrounding session explicitly requests one. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.
