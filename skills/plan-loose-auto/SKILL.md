---
name: plan-loose-auto
description: Turn a spec, proposal, decision log, GitHub issue, or raw prompt into a loose-granularity v1 plan markdown file under the active V1 thread's `plans/` folder, end-to-end, with no clarifying questions. Loose plans use brief 1–3 sentence task descriptions optimized for a human-leaning implementer who fills in details. Use when you already have the upstream input in hand and want a loose plan written down autonomously — not when you want to walk the plan task-by-task together (use `plan-loose-interactive`), and not when the downstream implementer is agent-leaning and needs unambiguous prescriptive steps (use `plan-strict-auto` or `plan-strict-interactive`).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Plan Loose Auto

Forward-design a loose-granularity plan artifact under the active V1 thread's `plans/` folder, end-to-end, from a single upstream input. This skill is the autonomous generator half of the loose-granularity plan pair — it reads the input, drafts numbered tasks with brief 1–3 sentence descriptions per task, self-reviews before emission, writes the artifact, and confirms its path. It does not ask clarifying questions, it does not walk the user task-by-task, and it does not commit.

`plan-loose-auto` is one of four plan-authoring skills. Loose vs strict and auto vs interactive are independent axes; pick the combination that fits your context:

- `plan-loose-auto` (this skill) — autonomous, loose granularity.
- `plan-loose-interactive` — collaborative, loose granularity. Use when you want to walk the plan element-by-element with anti-sycophancy pushback live.
- `plan-strict-auto` — autonomous, strict granularity. Use when the downstream implementer is agent-leaning and needs explicit substeps, per-task files-modified, and acceptance criteria.
- `plan-strict-interactive` — collaborative, strict granularity.

Loose vs strict is a user/context choice per D58 — there is no "default" and no "better" granularity. Loose plans suit human-leaning implementers and exploratory work where the implementer is trusted to fill in details. Strict plans suit agent-leaning implementers and tighter handoff where ambiguity is expensive. Both granularities honor the same plan content contract — see `## Plan Artifact Contract` below.

## Inputs

`plan-loose-auto` accepts ONE of the following four input forms. Detect which form was passed before drafting:

1. **A spec artifact path** under `docs/threads/<thread>/specs/<UTC>-v<N>-spec.md`. The spec is the most common upstream input — its semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the plan's task list directly.
2. **A proposal artifact path** under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. When the input is a proposal rather than a spec, the plan tasks elaborate the proposal's rough shape into an implementable sequence; treat the proposal's open questions as items the plan either resolves or carries forward.
3. **A decision-log artifact path** under `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`. The log carries one or more settled decisions with sequential `## D<N>: <Title>` headings. Each settled decision may map to a task (or constrain one) — cite the source log by absolute path + `D<N>` where the decision is operative in the task description.
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
5. **A raw user prompt**. When no artifact is referenced, the user's prompt is itself the input — the plan is forward-designed directly from it.

If the input is ambiguous — multiple plausible specs share the same version number in the thread, multiple decision logs cover overlapping topics, the issue identifier is incomplete, the prompt references "the spec" with no clear referent — ASK the user which artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest input" algorithm. Do not silently pick by recency.

## Plan Artifact Contract

V1 plans hold to a single content contract regardless of granularity: every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable** (D59).

- **Sequential** — tasks are numbered in execution order. The implementation skills (Phase 5) execute tasks in plan order; the order is the only execution graph V1 supports.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If a task requires more than one sitting, it is too large and should be split. If a task cannot be started without first doing setup that belongs to another task, the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable, the task is under-specified.

The phrase "sequential, isolated, independently implementable" is the V1 plan content contract — every plan skill body restates it, and every task in every emitted plan must satisfy it. Loose-granularity tasks satisfy this contract just as strict-granularity tasks do; the difference is prescriptiveness of substeps, not the contract.

## No Parallelization

V1 plans are sequential. Per D60, plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently.

- **Wave numbers**: do not emit. The implementation skills (Phase 5) execute tasks in plan order. There are no waves in V1.
- **Dependency arrays / depends_on fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope for V1.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

These constructs are forbidden at the artifact level per D60 — not as personal taste, but as a project-level V1 constraint. The implementation skills (Phase 5) execute tasks in plan order; introducing parallelization markers in a plan body misleads downstream readers about what V1 supports. If you find yourself wanting to express parallelism, the plan is the wrong place to do it; loop back to the spec phase or open a separate discussion.

This skill body itself avoids parallelization notation in every example below — the `## Worked Example` is a negative test of D60 (the absence of forbidden constructs is observable in the example).

## Loose Plan Body Shape

A loose plan body is **numbered tasks with brief 1–3 sentence descriptions per task**. Optimize for a human-leaning implementer who will read the task, infer the obvious substeps, and execute. Do not turn every task into a checklist; the brevity is the point.

Each task MUST contain at minimum:

1. An **objective sentence** stating what the task accomplishes. One sentence is enough.
2. **Observable verification** — one sentence stating how a reviewer (or the implementer) will know the task succeeded. A file path, a behavior, a test name, an output to inspect.

Each task MAY add a third sentence noting context, the input it consumes, or a constraint that affects execution. Three sentences is the ceiling — past that, the plan is sliding into strict granularity and the executor should consider using `plan-strict-auto` instead.

The plan body uses freeform markdown. The executor MAY suggest a section heading scaffold (for example `## Goal`, `## Tasks`, `## Notes`) but it is NOT required — a plan that opens with a one-line goal and a numbered task list is acceptable provided every task satisfies the D59 contract. Section headings should help the downstream reader, not bloat the artifact.

Do NOT add YAML frontmatter to the plan body. The filename is the identifier; the body is plain markdown. Lineage between plan versions lives in the filename and the surrounding thread, not in metadata on the file (per `docs/workflow/v1/immutability.md`).

### Worked Example

A tiny loose plan body. Note: only sequential numbered tasks. No wave numbers, no depends_on array, no bracketed wave prefixes, no fork/join syntax.

```markdown
# Migrate auth middleware to JWT

## Goal
Replace the legacy session-cookie middleware in `src/middleware/auth.ts` with a JWT-based check that reads from the `Authorization` header.

## Tasks

1. Add JWT verification helper at `src/lib/jwt.ts` exposing `verifyToken(token: string)` returning a typed payload or null. Verify: unit test in `src/lib/jwt.test.ts` covers a valid token and an expired token.
2. Replace the session-cookie lookup in `src/middleware/auth.ts` with a call to `verifyToken` on the `Authorization` header. Verify: existing integration test `tests/auth.spec.ts` passes against a request carrying a valid JWT.
3. Remove the legacy session-cookie code path from `src/middleware/auth.ts` and delete the `src/lib/session-cookie.ts` helper. Verify: `grep -r session-cookie src/` returns nothing and the integration tests still pass.

## Notes

The JWT secret is read from `process.env.JWT_SECRET` — no plan task introduces the secret; the deploy environment provides it.
```

That is what a loose plan looks like: three tasks, each one objective sentence + one verification sentence (task 1 adds a third context sentence for the helper signature), no parallelization, sequential execution order. A human implementer reads it and knows what to do without needing prescriptive substeps.

## Self-Review

Before writing the plan artifact to disk, run the following four-check self-review pass IN-SESSION (D61). The emitted plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the plan, executed end-to-end, actually achieve the input artifact's goal? If the input is a spec, does completing every plan task satisfy the spec's intended outcome and acceptance guidance? If the input is a proposal, does the plan elaborate the proposal's rough shape into a complete implementable sequence?
2. **Granularity fit** — is loose granularity appropriate for THIS input and THIS expected implementer? If the input has many implicit substeps the implementer would need spelled out (e.g., a downstream agent-leaning consumer, or a tricky migration with non-obvious ordering), the input may want strict granularity instead — flag this and recommend `plan-strict-auto`.
3. **No under-splitting** — is every task independently implementable in one sitting? A task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one. Split it.
4. **No over-splitting** — are any tasks trivial 1-line tasks that bloat the plan? A task that just says "add a comment to `foo.ts`" is not a plan task; fold it into an adjacent task. Loose plans favor fewer, meatier tasks over many tiny ones.

Run the four checks against the drafted plan body. If any check fails, revise the draft IN-SESSION (the `.wip/` draft is editable per `docs/workflow/v1/immutability.md`) before emitting. After the four checks pass, write the artifact.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp. If no thread exists, ASK where to create one OR auto-create when the input's slug is obvious.

2. **Resolve and read the input.** Detect which of the five `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title (the user's invocation context is responsible for credentials). For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended per `docs/workflow/v1/immutability.md`. Do not pick by recency.

3. **Derive the descriptor (usually omit).** First emission of a plan uses NO `<kebab-descriptor>` in the filename — the canonical first-version mainline is `<UTC>-v1-plan.md`. A descriptor is used only when this emission is one of several parallel candidates for the same target version (e.g., `<UTC>-v1-opus-plan.md`, `<UTC>-v1-sonnet-plan.md`) or when the executor has an explicit reason to mark this artifact as a variant. Default to NO descriptor.

4. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

5. **Draft the body.** Compose the plan body per `## Loose Plan Body Shape`: a short goal, a numbered task list with 1–3 sentence task descriptions each, optional notes. Reference settled decisions from the upstream input by absolute path + `D<N>` where they constrain a task. No parallelization markers anywhere in the draft.

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

Drafts under `docs/threads/<thread>/.wip/` are editable until emission. While `plan-loose-auto` is composing the plan body in scratch space (or in memory), revisions are free. The lock applies the moment the file is written into `plans/` under the canonical filename grammar.

No source-relation YAML frontmatter is added to the plan body — lineage lives in filenames and the surrounding thread, not in metadata on the file. Per `docs/workflow/v1/immutability.md`, the accepted trade-off is that a filename cannot tell whether `v2` came directly from `v1`, from a `v2` candidate variant, or from a merge — that history is recovered from the thread itself, not from the file.

## Commit Policy

This skill NEVER commits the emitted plan automatically. Commits happen only if the surrounding session explicitly requests one. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.
