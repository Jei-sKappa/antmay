---
name: plan-loose-auto
description: Turn a spec, proposal, decision log, GitHub issue, or raw prompt into a loose-granularity plan artifact autonomously — no clarifying questions — writing brief 1–3 sentence task descriptions suited for a human-leaning implementer who fills in details. Use when you already have the upstream input in hand and want a complete plan written down without interactive back-and-forth.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.1
---

# Plan Loose Auto

Read the upstream input, draft numbered tasks with brief 1–3 sentence descriptions per task, self-review before emission, write the artifact, and confirm its path. This skill does not ask clarifying questions, does not walk the user task-by-task, and does not commit.

Loose granularity suits human-leaning implementers and exploratory work where the implementer is trusted to fill in details. If the downstream implementer is agent-leaning and needs explicit substeps, explicit file lists, and acceptance criteria, a strict-granularity plan is the better fit. Both granularities honor the same plan content contract — see `## Plan Artifact Contract` below.

## Inputs

This skill accepts ONE of the following input forms. Detect which form was passed before drafting:

1. **A spec artifact path** under `docs/threads/<thread>/specs/<UTC>-v<N>-spec.md`. The spec is the most common upstream input — its semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the plan's task list directly.
2. **A proposal artifact path** under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. When the input is a proposal rather than a spec, the plan tasks elaborate the proposal's rough shape into an implementable sequence; treat the proposal's open questions as items the plan either resolves or carries forward.
3. **A decision-log artifact path** under `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`. The log carries one or more settled decisions with sequential `## D<N>: <Title>` headings. Each settled decision may map to a task (or constrain one) — cite the source log by absolute path + decision heading where the decision is operative in the task description.
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
5. **A raw user prompt**. When no artifact is referenced, the user's prompt is itself the input — the plan is forward-designed directly from it.

If the input is ambiguous — multiple plausible specs share the same version number in the thread, multiple decision logs cover overlapping topics, the issue identifier is incomplete, the prompt references "the spec" with no clear referent — ASK the user which artifact is intended. There is no global "latest input" algorithm. Do not silently pick by recency.

## Plan Artifact Contract

Every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable**.

- **Sequential** — tasks are numbered in execution order. Tasks execute in plan order; the order is the only execution graph supported.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If a task requires more than one sitting, it is too large and should be split. If a task cannot be started without first doing setup that belongs to another task, the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable, the task is under-specified.

Loose-granularity tasks satisfy this contract just as strict-granularity tasks do; the difference is prescriptiveness of substeps, not the contract.

## No Parallelization

Plans are strictly sequential. Plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently.

- **Wave numbers**: do not emit. Tasks execute in plan order.
- **Dependency arrays / depends_on fields**: do not emit. The implicit dependency is "the previous numbered task ran first".
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

If you find yourself wanting to express parallelism, the plan is the wrong place to do it; loop back to the spec phase or open a separate discussion.

## Loose Plan Body Shape

A loose plan body is **numbered tasks with brief 1–3 sentence descriptions per task**. Optimize for a human-leaning implementer who will read the task, infer the obvious substeps, and execute. Do not turn every task into a checklist; the brevity is the point.

Each task MUST contain at minimum:

1. An **objective sentence** stating what the task accomplishes. One sentence is enough.
2. **Observable verification** — one sentence stating how a reviewer (or the implementer) will know the task succeeded. A file path, a behavior, a test name, an output to inspect.

Each task MAY add a third sentence noting context, the input it consumes, or a constraint that affects execution. Three sentences is the ceiling — past that, the plan is sliding into strict granularity and strict-granularity planning is the better fit.

The plan body uses freeform markdown. The executor MAY suggest a section heading scaffold (for example `## Goal`, `## Tasks`, `## Notes`) but it is NOT required — a plan that opens with a one-line goal and a numbered task list is acceptable provided every task satisfies the plan artifact contract. Section headings should help the downstream reader, not bloat the artifact.

Do NOT add YAML frontmatter to the plan body. The filename is the identifier; the body is plain markdown. Lineage between plan versions lives in the filename and the surrounding thread, not in metadata on the file.

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

Before writing the plan artifact to disk, run the following four-check self-review pass IN-SESSION. The emitted plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the plan, executed end-to-end, actually achieve the input artifact's goal? If the input is a spec, does completing every plan task satisfy the spec's intended outcome and acceptance guidance? If the input is a proposal, does the plan elaborate the proposal's rough shape into a complete implementable sequence?
2. **Granularity fit** — is loose granularity appropriate for THIS input and THIS expected implementer? If the input has many implicit substeps the implementer would need spelled out (e.g., a downstream agent-leaning consumer, or a tricky migration with non-obvious ordering), strict-granularity planning is the better fit — flag this and recommend it to the user.
3. **No under-splitting** — is every task independently implementable in one sitting? A task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one. Split it.
4. **No over-splitting** — are any tasks trivial 1-line tasks that bloat the plan? A task that just says "add a comment to `foo.ts`" is not a plan task; fold it into an adjacent task. Loose plans favor fewer, meatier tasks over many tiny ones.

Run the four checks against the drafted plan body. If any check fails, revise the draft IN-SESSION (the `.wip/` draft is editable until the file is written into `plans/`) before emitting. After the four checks pass, write the artifact.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp. If no thread exists, ASK where to create one OR auto-create when the input's slug is obvious.

2. **Resolve and read the input.** Detect which of the five `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title (the user's invocation context is responsible for credentials). For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended. Do not pick by recency.

3. **Derive the descriptor (usually omit).** First emission of a plan uses NO `<kebab-descriptor>` in the filename — the canonical first-version mainline is `<UTC>-v1-plan.md`. A descriptor is used only when this emission is one of several parallel candidates for the same target version (e.g., `<UTC>-v1-opus-plan.md`, `<UTC>-v1-sonnet-plan.md`) or when the executor has an explicit reason to mark this artifact as a variant. Default to NO descriptor.

4. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

5. **Draft the body.** Compose the plan body per `## Loose Plan Body Shape`: a short goal, a numbered task list with 1–3 sentence task descriptions each, optional notes. Reference settled decisions from the upstream input by absolute path + decision heading where they constrain a task. No parallelization markers anywhere in the draft.

6. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted body. Revise the draft in `.wip/` (or in memory) until all four pass. The emitted body does not contain self-review notes — the discipline runs before emission.

7. **Write the artifact.** Create `docs/threads/<thread>/plans/<UTC>-v1-plan.md` (or `docs/threads/<thread>/plans/<UTC>-v1-<kebab-descriptor>-plan.md` if a descriptor is genuinely warranted — but the default for first emission is NO descriptor). The `plan` artifact-type suffix is MANDATORY. The `plans/` folder is created on-demand on the first plan written for the thread — do not pre-create it.

8. **Confirm.** Tell the user: `Plan written: <relative-path-to-the-file>`. Nothing else — no preamble, no summary, no closing remark.

## Filename and Folder

The plan artifact uses the versioned-form filename grammar:

```text
<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-plan.md
```

Rules:

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

The file lands at `docs/threads/<thread>/plans/<filename>`. The `plans/` folder is created on-demand on the first plan written for the thread; do not pre-create empty folders.

## Immutability

Emitted plan artifacts are immutable. Once the file is written into `plans/`, it is part of the thread's reviewable history and is not edited. A typo discovered in an emitted v1 plan means emitting a new version (`v2`), not an in-place edit. The same rule applies to every subsequent version — `v2` is locked once written, and a revision to `v2` means emitting `v3`. Never edit a plan file in place after it lands in `plans/`.

Drafts under `docs/threads/<thread>/.wip/` are editable until emission. While the plan body is being composed in scratch space (or in memory), revisions are free. The lock applies the moment the file is written into `plans/` under the canonical filename grammar.

No source-relation YAML frontmatter is added to the plan body — lineage lives in filenames and the surrounding thread, not in metadata on the file. The accepted trade-off is that a filename cannot tell whether `v2` came directly from `v1`, from a `v2` candidate variant, or from a merge — that history is recovered from the thread itself, not from the file.

## Commit Policy

This skill NEVER commits the emitted plan automatically. Commits happen only if the surrounding session explicitly requests one. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.
