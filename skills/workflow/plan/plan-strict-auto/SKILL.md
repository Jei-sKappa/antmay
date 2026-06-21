---
name: plan-strict-auto
description: Turn a spec, proposal, decision log, GitHub issue, or raw prompt into a strict-granularity plan with explicit substeps, files modified, verification, and acceptance criteria when the user wants a prescriptive agent-optimized plan generated autonomously.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Plan Strict Auto

Forward-design a strict-granularity plan in its lineage folder under the active thread's `plans/`, end-to-end, from a single upstream input. Read the input, draft numbered tasks each carrying explicit substeps, files modified, verification, and acceptance criteria, self-review before emission, write the plan, and confirm its path. Do not ask clarifying questions, do not walk the user task-by-task, and do not commit.

The plan is a **disposable compiler-IR**: the spec plus its acceptance criteria are the contract a reviewer and the implementation are judged against, and the plan is downstream scaffolding compiled from that contract. This is why the plan is the one versioned-artifact type that carries **no stored status latch and no `version` in its frontmatter** — nothing about a plan needs auditing, because the spec it compiles is the audited artifact. It is also why the human may review the implementation but never needs to read the plan: when the spec carries machine-checkable acceptance criteria and a Degrees-of-freedom section, this autonomous mode can produce the plan and a downstream machine adherence review can clear it without the human reading it. See `## Plan Has No Frontmatter`.

## Inputs

Accept ONE of the following five input forms. Detect which form was passed before drafting:

1. **A spec artifact path** — a spec document on disk, typically `specs/NNN[-<desc>]/spec.md` in the active thread. The spec is the most common upstream input — its semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the plan's task list directly, its acceptance criteria map cleanly onto per-task acceptance criteria, and its Degrees-of-freedom section tells the plan which *hows* are open. Before drafting from a spec, confirm the spec is approved (its frontmatter `status:` map carries an `approved` latch); planning from a Draft spec is allowed but flag that the contract is not yet signed.
2. **A proposal artifact path** — a proposal document on disk, typically `proposals/NNN[-<desc>]/proposal.md` in the active thread. When the input is a proposal rather than a spec, the plan tasks elaborate the proposal's rough shape into an implementable sequence; treat the proposal's open questions as items the plan either resolves or carries forward. Strict-granularity from a proposal is heavier weight than from a spec — if the proposal is thin, a loose-granularity plan may be a better fit.
3. **A decision-log artifact path** — a record carrying one or more settled decisions with sequential `## P<N>: <Title>` headings. Each settled decision may map to a task (or constrain one) — cite the source log by path + `P<N>` where the decision is operative in the relevant task's input/context field (same-thread references thread-relative, e.g. `discussions/<UTC>-<slug>-decision-log.md P3`; cross-thread references repo-relative, `docs/threads/<other>/…`).
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
5. **A raw user prompt**. When no artifact is referenced, the user's prompt is itself the input — the plan is forward-designed directly from it.

If the input is ambiguous — multiple plausible spec lineages could be meant (`specs/001-api/` vs `specs/002-cli/`), multiple decision logs cover overlapping topics, the issue identifier is incomplete, the prompt references "the spec" with no clear referent — ASK the user which artifact is intended. There is no "highest number" or "most recent" fallback; do not silently pick by recency or by `NNN`.

## Plan Artifact Contract

Every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable**.

- **Sequential** — tasks are numbered in execution order. The implementer executes tasks in plan order; the order is the only execution graph supported.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If a task requires more than one sitting, it is too large and should be split. If a task cannot be started without first doing setup that belongs to another task, the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable, the task is under-specified.

Strict-granularity tasks satisfy this contract just as loose-granularity tasks do; the difference is prescriptiveness of substeps and the presence of per-task fields (objective / input / steps / files-modified / verification / acceptance), not the contract.

## No Parallelization

Plans produced by this skill are sequential. Plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently.

- **Wave numbers**: do not emit. The implementer executes tasks in plan order. There are no waves.
- **Dependency arrays / depends_on fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

Strict granularity is especially tempting territory for parallelization markers because the per-task fields look graph-shaped — resist. If you find yourself wanting to express parallelism, loop back to the spec phase or open a separate discussion.

The `## Worked Example` below is a negative test of this rule — the absence of forbidden constructs is observable in the example.

## Strict Plan Body Shape

A strict plan body is **numbered tasks with explicit substeps, verification notes, files modified, and acceptance criteria per task**. Optimize for an agent-leaning implementer who reads each task literally and executes the substeps in order with no inference required. Where a loose task fits in 1–3 sentences, a strict task fits in a structured block.

Each task MUST contain at minimum the following six fields:

1. **Objective** — one sentence stating what this task accomplishes. The objective is the "why" of the task, before any "how".
2. **Input / context** — the artifacts, files, or upstream state the task depends on. Cite settled decisions by absolute path + `P<N>` here when they constrain the task. If the task starts from the previous numbered task's output (the implicit sequential dependency), say so explicitly.
3. **Steps / substeps** — a numbered list of the explicit sub-actions the implementer takes. The substeps are prescriptive; an agent-leaning implementer can follow them literally. Each substep is one concrete action ("create file X", "add function Y to module Z", "run command Q"), not a sub-objective.
4. **Files modified** — the exact files this task touches. List every file by relative path. If a file is created, note `(NEW)` next to it; if removed, note `(DELETED)`. The list is the source of truth for the task's filesystem footprint.
5. **Verification** — how the implementer (or a reviewer) confirms the task succeeded. Prefer a concrete command, `grep`, `jq`, `test -f` check, or named test over "looks correct". Verification is mechanical, not interpretive — a reviewer running the verification block should reach the same conclusion as the implementer.
6. **Acceptance criteria** — the observable state of completion. What must be true after the task is done? A bullet list of post-conditions: "function X exists at module Y", "test Z passes", "config K has value V". Acceptance is the externally observable definition of done; verification is the procedure for checking it.

Each task MAY add additional fields (notes, rollback procedure, performance budget, etc.) when the input warrants it. The six fields above are the minimum.

The plan body uses freeform markdown. The executor MAY suggest a section heading scaffold (for example `## Goal`, `## Tasks`, `## Notes`) at the plan level, but inside each task the six fields above are the structural backbone. Section headings should help the downstream agent-leaning reader follow the prescriptive shape, not bloat the artifact.

Do NOT add YAML frontmatter to the plan. Unlike a proposal or a spec, the plan carries **no `version` and no `status:` map** — it has no latch and no review-cycle counter (see `## Plan Has No Frontmatter`). The lineage folder is the identifier; the body is plain markdown.

### Worked Example

A tiny strict plan task block. Note: only sequential numbered tasks. No wave numbers, no depends_on array, no bracketed wave prefixes, no fork/join syntax.

```markdown
### Task 1: Add JWT verification helper

**Objective:** Provide a reusable verification function that the auth middleware will call.

**Input / context:** Settled decision per `docs/threads/<thread>/discussions/<UTC>-auth-decision-log.md P2` — use the `jose` library, not `jsonwebtoken`.

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

Before writing the plan artifact to disk, run the following four-check self-review pass in-session. The emitted plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the plan, executed end-to-end, actually achieve the input artifact's goal? If the input is a spec, does completing every plan task satisfy the spec's intended outcome and acceptance guidance? If the input is a proposal, does the plan elaborate the proposal's rough shape into a complete implementable sequence?
2. **Granularity fit** — is strict granularity appropriate for THIS input and THIS expected implementer? Strict plans are heavier weight; if the input does not have enough substance to warrant per-task substeps + verification (e.g., a sketchy proposal, an exploratory raw prompt, a small change a human implementer could finish in twenty minutes), the input may want loose granularity instead — flag this and recommend a loose-granularity plan. The six-field structure should pay for itself; if it bloats the plan, switch.
3. **No under-splitting** — is every task independently implementable in one sitting? A task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one. Split it. Strict-granularity tasks are especially easy to under-split because the substep block hides the size — if the substeps would themselves be plan-task-shaped, the task is too big.
4. **No over-splitting** — are any tasks trivial 1-line tasks that bloat the plan? A task that just says "add a comment to `foo.ts`" with one substep is not a strict plan task; fold it into an adjacent task. Strict plans favor meatier tasks; the six-field overhead must be earned.

Run the four checks against the drafted plan body. If any check fails, revise the draft in-session before emitting. After the four checks pass, write the plan into its lineage folder. (A plan is alive in place after emission too — see `## Alive in Place`; the self-review is the quality bar before the first write.)

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp. If no thread exists, ASK where to create one OR auto-create when the input's slug is obvious.

2. **Read the ledger and confirm the tier.** Open the thread's `ledger.md` at the thread root and read the current `tier` (the last `tier:` line wins) and `disposition` (the last of `deferred` / `resumed` / `closed: done` / `closed: dropped`; absence means active). Planning is a tier ≥1 stage; strict granularity suits the design-decision work of tier 2+. If the ledger records no tier yet, propose one (the default for anything carrying a design decision is tier 2) and confirm it before writing — append a dated, justified `tier: <N> @ <UTC> — <why>` line to the ledger. If the thread is `deferred` or `closed`, STOP — a paused or sealed thread is frozen; do not write. See `## Tier Awareness`.

3. **Resolve and read the input.** Detect which of the five `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title (the user's invocation context is responsible for credentials). For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended. Do not pick by recency or by `NNN`.

4. **Choose the lineage folder.** Plans live in a numbered lineage folder `plans/NNN[-<desc>]/`. `NNN` is a zero-padded 3-digit sequence starting at `001`. If no plan lineage exists yet, use `001`. If plans already exist and this is a NEW, distinct plan subject, use the next free `NNN` and add a short kebab `-<desc>` only when needed to tell the lineages apart (`plans/001-api/`, `plans/002-cli/`); adding a slug to a later lineage never renames an earlier one. The full path is the unit of reference. If which existing lineage the work belongs to is ambiguous, ASK — there is no "highest number" fallback. (Competing candidate plans for ONE subject — e.g. parallel multi-model drafts — are NOT separate lineages; they are `.wip/` scratch and only the chosen-or-merged result is emitted once.)

5. **Draft the body with per-task fields.** Compose the plan body per `## Strict Plan Body Shape`: a short goal, a numbered task list where each task block carries the six labeled fields (objective / input / steps / files-modified / verification / acceptance), optional plan-level notes. Reference settled decisions from the upstream input by path + `P<N>` in the relevant task's input/context field. No parallelization markers anywhere in the draft. No YAML frontmatter — the plan carries no `version` and no `status:` map.

6. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted body until all four pass. The emitted body does not contain self-review notes — the discipline runs before emission.

7. **Write the plan.** Create `docs/threads/<thread>/plans/NNN[-<desc>]/plan.md`. The file is named exactly `plan.md` — no UTC stamp, no `v<N>`, no descriptor in the filename, and no YAML frontmatter. The lineage folder is the stable link target. The `plans/` parent and the `NNN[-<desc>]/` lineage folder are created on-demand on the first plan written for the thread; do not pre-create them.

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

If a reference to an upstream artifact is ambiguous — multiple lineages of one type in the thread (`specs/001-api/` vs `specs/002-cli/`), or "the spec" could mean a spec in another thread — ASK the user which is intended. There is no "highest number" or "most recent" fallback.

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
- **Tier 1 — patch:** small fix/feature, low blast radius, no open design question. A plan is optional; the spec may be light. Strict granularity is usually overkill here.
- **Tier 2 — feature:** anything with a design decision (the default). The spec is reviewed and approved with machine-checkable acceptance criteria, which is what makes autonomous strict planning safe.
- **Tier 3 — initiative:** multi-week, architectural, or hard to reverse. Tier 2 plus a proposal stage and adversarial reviews.

Read the ledger to learn the tier. If no tier is recorded, propose one (default tier 2 for design-decision work) and confirm it, appending a dated, justified `tier: <N> @ <UTC> — <why>` line. Do not write a plan into a thread the ledger marks `deferred` or `closed`.

## Commit Policy

This skill NEVER commits the emitted plan automatically (or the ledger line). Commits happen only if the surrounding session explicitly requests one. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.
