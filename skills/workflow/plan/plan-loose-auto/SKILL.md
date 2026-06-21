---
name: plan-loose-auto
description: Turn a spec, proposal, decision log, GitHub issue, or raw prompt into a loose-granularity plan artifact autonomously when the user has the input in hand and wants brief task descriptions suited for a human-leaning implementer.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Plan Loose Auto

Read the upstream input, draft numbered tasks with brief 1–3 sentence descriptions per task, self-review before emission, write the plan into its lineage folder, and confirm its path. This skill does not ask clarifying questions, does not walk the user task-by-task, and does not commit.

Loose granularity suits human-leaning implementers and exploratory work where the implementer is trusted to fill in details. If the downstream implementer is agent-leaning and needs explicit substeps, explicit file lists, and acceptance criteria, a strict-granularity plan is the better fit. Both granularities honor the same plan content contract — see `## Plan Artifact Contract` below.

The plan is a **disposable compiler-IR**: the spec plus its acceptance criteria are the contract a reviewer and the implementation are judged against, and the plan is downstream scaffolding compiled from that contract. This is why the plan is the one versioned-artifact type that carries **no stored status latch and no `version` in its frontmatter** — nothing about a plan needs auditing, because the spec it compiles is the audited artifact. It is also why the human may review the implementation but never needs to read the plan: when the spec carries machine-checkable acceptance criteria and a Degrees-of-freedom section, this autonomous mode can produce the plan and a downstream machine adherence review can clear it without the human reading it. See `## Plan Has No Frontmatter`.

## Inputs

This skill accepts ONE of the following input forms. Detect which form was passed before drafting:

1. **A spec artifact path** — a spec document on disk, typically `specs/NNN[-<desc>]/spec.md` in the active thread. The spec is the most common upstream input — its semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the plan's task list directly, and its Degrees-of-freedom section tells the plan which *hows* are open. Before drafting from a spec, confirm the spec is approved (its frontmatter `status:` map carries an `approved` latch); planning from a Draft spec is allowed but flag that the contract is not yet signed.
2. **A proposal artifact path** — a proposal document on disk, typically `proposals/NNN[-<desc>]/proposal.md` in the active thread. When the input is a proposal rather than a spec, the plan tasks elaborate the proposal's rough shape into an implementable sequence; treat the proposal's open questions as items the plan either resolves or carries forward.
3. **A decision-log artifact path** — a record carrying one or more settled decisions with sequential `## P<N>: <Title>` headings. Each settled decision may map to a task (or constrain one) — cite the source log by path + `P<N>` where the decision is operative in the task description (same-thread references thread-relative, e.g. `discussions/<UTC>-<slug>-decision-log.md P3`; cross-thread references repo-relative, `docs/threads/<other>/…`).
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
5. **A raw user prompt**. When no artifact is referenced, the user's prompt is itself the input — the plan is forward-designed directly from it.

If the input is ambiguous — multiple plausible spec lineages could be meant (`specs/001-api/` vs `specs/002-cli/`), multiple decision logs cover overlapping topics, the issue identifier is incomplete, the prompt references "the spec" with no clear referent — ASK the user which artifact is intended. There is no "highest number" or "most recent" fallback; do not silently pick by recency or by `NNN`.

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

Do NOT add YAML frontmatter to the plan. Unlike a proposal or a spec, the plan carries **no `version` and no `status:` map** — it has no latch and no review-cycle counter (see `## Plan Has No Frontmatter`). The lineage folder is the identifier; the body is plain markdown.

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

Run the four checks against the drafted plan body. If any check fails, revise the draft IN-SESSION before emitting. After the four checks pass, write the plan into its lineage folder. (A plan is alive in place after emission too — see `## Alive in Place`; the self-review is the quality bar before the first write.)

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp. If no thread exists, ASK where to create one OR auto-create when the input's slug is obvious.

2. **Read the ledger and confirm the tier.** Open the thread's `ledger.md` at the thread root and read the current `tier` (the last `tier:` line wins) and `disposition` (the last of `deferred` / `resumed` / `closed: done` / `closed: dropped`; absence means active). Planning is a tier ≥1 stage. If the ledger records no tier yet, propose one (the default for anything carrying a design decision is tier 2) and confirm it before writing — append a dated, justified `tier: <N> @ <UTC> — <why>` line to the ledger. If the thread is `deferred` or `closed`, STOP — a paused or sealed thread is frozen; do not write. The tier scales the rigor of the upstream contract this plan compiles; see `## Tier Awareness`.

3. **Resolve and read the input.** Detect which of the five `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title (the user's invocation context is responsible for credentials). For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended. Do not pick by recency or by `NNN`.

4. **Choose the lineage folder.** Plans live in a numbered lineage folder `plans/NNN[-<desc>]/`. `NNN` is a zero-padded 3-digit sequence starting at `001`. If no plan lineage exists yet, use `001`. If plans already exist and this is a NEW, distinct plan subject, use the next free `NNN` and add a short kebab `-<desc>` only when needed to tell the lineages apart (`plans/001-api/`, `plans/002-cli/`); adding a slug to a later lineage never renames an earlier one. The full path is the unit of reference. If which existing lineage the work belongs to is ambiguous, ASK — there is no "highest number" fallback. (Competing candidate plans for ONE subject — e.g. parallel multi-model drafts — are NOT separate lineages; they are `.wip/` scratch and only the chosen-or-merged result is emitted once.)

5. **Draft the body.** Compose the plan body per `## Loose Plan Body Shape`: a short goal, a numbered task list with 1–3 sentence task descriptions each, optional notes. Reference settled decisions from the upstream input by path + `P<N>` where they constrain a task. No parallelization markers anywhere in the draft. No YAML frontmatter — the plan carries no `version` and no `status:` map.

6. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted body until all four pass. The emitted body does not contain self-review notes — the discipline runs before emission.

7. **Write the plan.** Create `docs/threads/<thread>/plans/NNN[-<desc>]/plan.md`. The file is named exactly `plan.md` — no UTC stamp, no `v<N>`, no descriptor in the filename, and no YAML frontmatter. The lineage folder is the stable link target. The `plans/` parent and the `NNN[-<desc>]/` lineage folder are created on-demand on the first plan written for the thread — do not pre-create them.

8. **Confirm.** Tell the user: `Plan written: <thread-relative-path-to-the-file>` (e.g. `plans/001/plan.md`). Nothing else — no preamble, no summary, no closing remark.

## Lineage Folder and Filename

The plan is a **versioned-artifact type, but the disposable one**: it lives in a numbered lineage folder, the file carries no UTC stamp and no `v<N>` in its name, and — unlike a proposal or spec — it carries no frontmatter at all.

```text
docs/threads/<thread>/plans/NNN[-<desc>]/plan.md
```

- `NNN` — a mandatory zero-padded 3-digit sequence starting at `001`. It is the stable identifier; numbered folders sort in creation order.
- `-<desc>` — an optional kebab slug, added ONLY to distinguish one plan lineage from another. It never renames an earlier lineage, so links stay stable.
- The file is always literally `plan.md` — the path carries the type (parent folder) and the subject (thread slug), so the bare filename needs neither a stamp nor a version. The plan has no `version` to put anywhere (see `## Plan Has No Frontmatter`).
- No `v1/` / `v2/` folder names, and no per-revision file. A plan is edited alive in place — git holds its evolution (see `## Alive in Place`). A second lineage is a different plan subject, not a revision of an earlier one.

Examples:

```text
plans/001/plan.md
plans/001-auth-migration/plan.md
plans/002-billing/plan.md
```

Within-thread references in the body are thread-relative (`plans/001/plan.md`, `specs/001/spec.md`, `discussions/<UTC>-<slug>-decision-log.md`), never repo-rooted and never absolute; cross-thread references are repo-relative (`docs/threads/<other>/…`). The `plans/` folder and its lineage subfolder are created on-demand on the first plan written; do not pre-create empty folders.

## Plan Has No Frontmatter

The plan is the one versioned-artifact type that carries **no `version` and no `status:` map** — it has neither a latch nor a review-cycle counter. This is deliberate: the plan is a disposable compiler-IR, the spec plus its acceptance criteria are the contract, and nothing about a plan needs auditing because the spec it compiles is the audited artifact.

- **No `version`.** A spec or proposal counts review→revise cycles in a `version` field; a plan does not. There is no plan version to track anywhere — not in the filename, not in frontmatter.
- **No stored status, no latch.** No human approves a plan. A proposal latches at `approved`/`rejected` and a spec latches at `approved` then `implemented`; a plan has no such event. Its only quality state is the derived verdict of a downstream machine adherence review (does the plan adhere to the spec, honoring the spec's Degrees-of-freedom section), which is computed, never stored on the plan.
- **No frontmatter at all.** Because there is neither a `version` nor a `status:` map to carry, a fresh `plan.md` opens directly with its body (e.g. `# <goal>`), with no `---` YAML block. Do not add one.

## Alive in Place

A plan is edited **alive in place** — there are NO version files, NO `v<N>` filenames, and NO emitting a new file per revision. When the plan needs to change (a self-review fix, an auto-fix after a machine adherence review found a deviation, a refinement during implementation), edit `plan.md` in its lineage folder directly. **Git holds the evolution** — the fine-grained history of how the plan changed lives in the commit log, not in a chain of stamped files.

The plan stays alive for the whole time the thread is active and freezes only when the thread closes (the ledger's terminal `closed:` event). There is no per-edit backing record for a plan — it is disposable scaffolding, not a signed contract, so authoring it and refining it are free while the thread is active.

Competing candidate plans for ONE subject (e.g. parallel multi-model drafts of the same plan) are pre-emission scratch and live under `docs/threads/<thread>/.wip/` (gitignored, editable). Compare them there and emit only the chosen-or-merged result once as `plans/NNN[-<desc>]/plan.md`. They are NOT separate lineages and NOT separate version files.

## Tier Awareness

The tier scales the rigor of the upstream contract this plan compiles and is stored in the thread's `ledger.md` (append-only, last `tier:` line wins) with a one-line justification — never derived from which artifacts are present. The four tiers, by escalating ceremony:

- **Tier 0 — chore:** no behavior change, reversible in one commit. No thread, no ledger — a plan does not belong here.
- **Tier 1 — patch:** small fix/feature, low blast radius, no open design question. A plan is optional; the spec may be light.
- **Tier 2 — feature:** anything with a design decision (the default). The spec is reviewed and approved with machine-checkable acceptance criteria, which is what makes autonomous planning safe.
- **Tier 3 — initiative:** multi-week, architectural, or hard to reverse. Tier 2 plus a proposal stage and adversarial reviews.

Read the ledger to learn the tier. If no tier is recorded, propose one (default tier 2 for design-decision work) and confirm it, appending a dated, justified `tier: <N> @ <UTC> — <why>` line. Do not write a plan into a thread the ledger marks `deferred` or `closed`.

## Commit Policy

This skill NEVER commits the emitted plan automatically (or the ledger line). Commits happen only if the surrounding session explicitly requests one. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.
