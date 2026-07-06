---
name: plan-strict
description: Turn a spec, proposal, decision log, GitHub issue, or raw prompt into a strict-granularity multi-file plan (an index plus one dispatchable brief per task) with explicit substeps, files modified, verification, and acceptance criteria; use when the downstream implementer is agent-leaning and needs a prescriptive plan.
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.0.0
---

# Plan Strict

Forward-design a strict-granularity plan in its lineage folder under the active thread's `plans/`, end-to-end, from a single upstream input. Read the input, draft an index plus one dispatchable brief per task — each brief carrying explicit substeps, files modified, verification, and acceptance criteria — self-review before emission, write the plan folder, and confirm its path. By default, run end-to-end without walking the user task-by-task, but honor an invocation that asks you to check in or work through the plan interactively; do not commit.

The plan is a **disposable compiler-IR**: the spec plus its acceptance criteria are the contract a reviewer and the implementation are judged against, and the plan is downstream scaffolding compiled from that contract. This is why the plan is the one versioned-artifact type that carries **no stored status latch and no `version` in its frontmatter** — nothing about a plan needs auditing, because the spec it compiles is the audited artifact. It is also why the human may review the implementation but never needs to read the plan: when the spec carries machine-checkable acceptance criteria and a Degrees-of-freedom section, this autonomous mode can produce the plan and a downstream machine adherence review can clear it without the human reading it. See `## Plan Has No Frontmatter`.

## Inputs

Accept ONE of the following five input forms. Detect which form was passed before drafting:

1. **A spec artifact path** — a spec document on disk, typically `specs/NNN[-<desc>]/spec.md` in the active thread. The spec is the most common upstream input — its semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the plan's task list directly, its acceptance criteria map cleanly onto per-task acceptance criteria, and its Degrees-of-freedom section tells the plan which *hows* are open. Before drafting from a spec, confirm the spec is approved (its frontmatter `status:` map carries an `approved` latch); planning from a Draft spec is allowed but flag that the contract is not yet signed.
2. **A proposal artifact path** — a proposal document on disk, typically `proposals/NNN[-<desc>]/proposal.md` in the active thread. When the input is a proposal rather than a spec, the plan tasks elaborate the proposal's rough shape into an implementable sequence; treat the proposal's open questions as items the plan either resolves or carries forward. A thin proposal yields a thin plan — if there is not enough substance to warrant per-task briefs, flag it in self-review rather than padding the structure.
3. **A decision-log artifact path** — a record carrying one or more settled decisions with sequential `## P<N>: <Title>` headings. Each settled decision may map to a task (or constrain one) — cite the source log by path + `P<N>` where the decision is operative in the relevant task's input/context field (same-thread references thread-relative, e.g. `discussions/<UTC>-<slug>-decision-log.md P3`; cross-thread references repo-relative, `docs/threads/<other>/…`).
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
5. **A raw user prompt**. When no artifact is referenced, the user's prompt is itself the input — the plan is forward-designed directly from it.

If the input is ambiguous — multiple plausible spec lineages could be meant (`specs/001-api/` vs `specs/002-cli/`), multiple decision logs cover overlapping topics, the issue identifier is incomplete, the prompt references "the spec" with no clear referent — ASK the user which artifact is intended. There is no "highest number" or "most recent" fallback; do not silently pick by recency or by `NNN`.

## Plan Artifact Contract

Every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable**.

- **Sequential** — tasks are numbered in execution order. The implementer executes tasks in plan order; the order is the only execution graph supported.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory. The `Consumes:`/`Produces:` hand-off lines (below) make each task's shared state explicit.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If a task requires more than one sitting, it is too large and should be split. If a task cannot be started without first doing setup that belongs to another task, the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable, the task is under-specified.

Each task satisfies this contract through its prescriptive substeps and per-task fields — objective, input, steps, files-modified, verification, acceptance, plus the `Consumes:`/`Produces:` hand-off lines — packaged as a self-contained brief a fresh implementer can execute in isolation.

## No Parallelization

Plans produced by this skill are sequential. Neither the index nor any task file may contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently.

- **Wave numbers**: do not emit. The implementer executes tasks in plan order. There are no waves.
- **Dependency arrays / depends_on fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

Strict granularity is especially tempting territory for parallelization markers because the per-task fields look graph-shaped — resist. If you find yourself wanting to express parallelism, loop back to the spec phase or open a separate discussion.

The `## Worked Example` below is a negative test of this rule — the absence of forbidden constructs is observable in the example.

## Strict Plan Body Shape

A strict plan is a **multi-file artifact**: an index `plan.md` plus one `tasks/NN-<kebab-slug>.md` brief per task. Optimize for an agent-leaning implementer who is handed a single task file in isolation and executes its substeps literally with no inference required. Each task file is a self-contained, directly dispatchable brief; the index ties them together and carries the plan-level context. Where a terse task would fit in 1–3 sentences, a strict task fits in a structured brief.

### Index (`plan.md`)

The index MUST contain:

1. **Plan-level objective and context** — a short statement of what the whole plan achieves and the context a reader needs before opening any task file.
2. **A `Source:` line** — names the upstream artifact this plan was compiled from, in exactly one of four legal value forms:
   - a **thread-relative pointer** to the upstream artifact within the active thread (e.g. `specs/001/spec.md`, `proposals/001/proposal.md`, `discussions/<UTC>-<slug>-decision-log.md`);
   - a **repo-relative path** for a cross-thread artifact (e.g. `docs/threads/<other>/specs/001/spec.md`);
   - an **issue URL** (e.g. `https://github.com/<owner>/<repo>/issues/<NNN>`);
   - `none — raw prompt` when the plan was forward-designed directly from a user prompt with no artifact.
3. **A Global Constraints block** — the project-wide requirements the plan must honor, copied **verbatim** from the source artifact's stated constraints, one line each. When the source states no constraints, or there is no source (`Source: none — raw prompt`), the block still appears and says so explicitly (e.g. `The source states no constraints.`) — never an omitted block.
4. **An ordered task list** — one entry per task, in execution order, carrying the task number, its title, a one-line objective, and a relative pointer to the task file (e.g. `tasks/01-add-jwt-helper.md`). The list is authoritative for task count and order.

### Task files (`tasks/NN-<kebab-slug>.md`)

Each task file is a directly dispatchable brief carrying the six mandatory fields plus two hand-off lines. The six mandatory fields:

1. **Objective** — one sentence stating what this task accomplishes. The objective is the "why" of the task, before any "how".
2. **Input / context** — the artifacts, files, or upstream state the task depends on. Cite settled decisions by absolute path + `P<N>` here when they constrain the task. If the task starts from the previous numbered task's output (the implicit dependency), say so explicitly.
3. **Steps / substeps** — a numbered list of the explicit sub-actions the implementer takes. The substeps are prescriptive; an agent-leaning implementer can follow them literally. Each substep is one concrete action ("create file X", "add function Y to module Z", "run command Q"), not a sub-objective. **Code blocks are the exception, not the default**: describe the action (e.g. "add `verifyToken(token): Promise<UserClaims | null>` to `src/lib/jwt.ts`") and let the implementer write the code. Include an actual code block only when the exact code is load-bearing — a precise signature or interface that must not drift, or a subtle algorithm or edge case likely to be gotten wrong — or when the spec, a discussion, or the user explicitly asked for the code to be pinned. Otherwise, prose substeps.
4. **Files modified** — the exact files this task touches. List every file by relative path. If a file is created, note `(NEW)` next to it; if removed, note `(DELETED)`. The list is the source of truth for the task's filesystem footprint.
5. **Verification** — how the implementer (or a reviewer) confirms the task succeeded. Prefer a concrete command, `grep`, `jq`, `test -f` check, or named test over "looks correct". Verification is mechanical, not interpretive — a reviewer running the verification block should reach the same conclusion as the implementer. The verification block is *task-specific*: it captures the checks that confirm THIS task's objective, and it layers on top of — never replaces — the project's standing required gates (the bar a project enforces on any code allowed to land; a project may define none). Do NOT narrow a task's verification to a subset that silently drops a standing gate, and do NOT defer a cheap standing gate to a later task. Defer to a dedicated closing task only the genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) that the feature would otherwise re-run on every task — a cheap standing commit-gate is not one of those.
6. **Acceptance criteria** — the observable state of completion. What must be true after the task is done? A bullet list of post-conditions: "function X exists at module Y", "test Z passes", "config K has value V". Acceptance is the externally observable definition of done; verification is the procedure for checking it.

Plus two hand-off lines (place them after the six fields, or wherever reads cleanly in the brief):

- `Consumes:` — the exact things this task uses from earlier tasks (state, files, functions, endpoints those tasks produced). `none` is an explicit legal value when the task depends on nothing from an earlier task.
- `Produces:` — the exact things later tasks rely on from this task. `none` is an explicit legal value when nothing later depends on this task's output.

The hand-off lines follow the rule of **precision, not notation**: name the exact thing in whatever notation is native to it — a function in the target language's own signature style (`verifyToken(token: string): Promise<UserClaims | null>`), a CLI invocation as the literal command line (`npm run migrate -- --to 007`), an HTTP endpoint as method + path (`POST /api/sessions`), a file as path + format (`config/auth.json` — JSON). Natural-language entries are fine as long as a later implementer could use the named thing without guessing its name or shape. Do NOT introduce an `Interfaces` umbrella heading to hold these — the two labeled lines are the whole hand-off surface.

Each task file MAY add additional fields (notes, rollback procedure, performance budget, etc.) when the input warrants it. The eight labeled elements above (six fields + two hand-off lines) are the minimum.

The index and task files use freeform markdown. The executor MAY suggest a section-heading scaffold at the index level (for example `## Global Constraints`, `## Tasks`) and MUST use the eight labeled elements as the structural backbone inside each task file. Section headings should help the downstream agent-leaning reader follow the prescriptive shape, not bloat the artifact.

### Invariants

- **No frontmatter, no status markers** anywhere in the plan folder — not in the index, not in any task file. Execution state lives in the implementation's commits and its implementation report, not in the plan; the index never needs updating mid-run. (See `## Plan Has No Frontmatter`.)
- **The index is authoritative** for task count and order. A consumer that finds the index and the `tasks/` folder disagreeing (an index entry with no file, a file not listed, ordinals that skip or collide) must flag the mismatch rather than guess.
- **Task ordering is implicit in the numbering** — `01` runs before `02`, and so on. There is no separate ordering field.
- **Alive in place, whole folder.** The index and every task file are edited alive in place; git holds the evolution of the whole folder (see `## Alive in Place`).
- **No parallelization**, index and task files alike — the sequential contract of `## No Parallelization` binds every file in the folder.

### Worked Example

A complete task file, then a short index excerpt. Note: only sequential numbered tasks — no wave numbers, no depends_on array, no bracketed wave prefixes, no fork/join syntax anywhere.

A task file `tasks/01-add-jwt-helper.md`:

```markdown
### Task 1: Add JWT verification helper

**Objective:** Provide a reusable verification function that the auth middleware will call.

**Input / context:** Settled decision per `discussions/<UTC>-auth-decision-log.md P2` — use the `jose` library, not `jsonwebtoken`.

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

**Consumes:** none

**Produces:** `verifyToken(token: string): Promise<UserClaims | null>` exported from `src/lib/jwt.ts`.
```

The matching index excerpt in `plan.md`:

```markdown
Source: specs/001/spec.md

## Global Constraints

- Use the `jose` library for all JWT work; `jsonwebtoken` is banned.
- All new code ships with unit tests.

## Tasks

1. **Add JWT verification helper** — provide the reusable `verifyToken` the middleware will call. → `tasks/01-add-jwt-helper.md`
2. **Wire the auth middleware** — call `verifyToken` on every protected route. → `tasks/02-wire-auth-middleware.md`
```

That is what a strict plan looks like: an index carrying the `Source:` line, the verbatim Global Constraints block, and the ordered task list; and one task file per task with eight labeled elements — prescriptive substeps, mechanical verification, observable acceptance, and the `Consumes:`/`Produces:` hand-off. An agent-leaning implementer handed a single task file can execute it without inferring anything beyond what is written. The absence of any wave number, `depends_on` array, or fork/join construct is observable throughout — the plan is sequential.

## Self-Review

Before writing the plan folder to disk, run the following four-check self-review pass in-session. The emitted plan does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the plan, executed end-to-end, actually achieve the input artifact's goal? If the input is a spec, does completing every plan task satisfy the spec's intended outcome and acceptance guidance? If the input is a proposal, does the plan elaborate the proposal's rough shape into a complete implementable sequence?
2. **Granularity fit** — does THIS input have enough substance to earn the per-task brief structure? The per-task fields are heavier weight; if the input is too thin (a sketchy proposal, an exploratory raw prompt, a small change finishable in twenty minutes), the structure will bloat rather than pay for itself. When it does not fit, the remedy is to merge tasks into fewer, meatier briefs, shrink the plan, or push back on planning this input at all — introduce no new mechanism to route around the structure. If the fields pay for themselves, keep them.
3. **Right-sized, not under-split** — is every task the smallest unit that still carries its own test cycle and is worth a fresh reviewer's gate? A task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one — split it. Split only where a reviewer could meaningfully reject one task while approving its neighbor. Strict tasks are especially easy to under-split because the substep block hides the size — if the substeps would themselves be task-shaped, the task is too big.
4. **Right-sized, not over-split** — are any tasks too small to earn their own gate? A task that just says "add a comment to `foo.ts`" with one substep is not a standalone strict task; fold it into an adjacent task. Setup, configuration, scaffolding, and documentation steps are not standalone tasks — fold each into the task whose deliverable needs it. A task must be worth a fresh reviewer's gate to stand alone; the per-task overhead must be earned.

Run the four checks against the drafted plan folder (index + task files). If any check fails, revise the draft in-session before emitting. After the four checks pass, write the plan into its lineage folder. (A plan is alive in place after emission too — see `## Alive in Place`; the self-review is the quality bar before the first write.)

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp. If no thread exists, ASK where to create one OR auto-create when the input's slug is obvious.

2. **Read the ledger and confirm the tier.** Open the thread's `ledger.md` at the thread root and read the current `tier` (the last `tier:` line wins) and `disposition` (the last of `deferred` / `resumed` / `closed: done` / `closed: dropped`; absence means active). Planning is a tier ≥1 stage; strict granularity suits the design-decision work of tier 2+. If the ledger records no tier yet, propose one (the default for anything carrying a design decision is tier 2) and confirm it before writing — append a dated, justified `tier: <N> @ <UTC> — <why>` line to the ledger. If the thread is `deferred` or `closed`, STOP — a paused or sealed thread is frozen; do not write. See `## Tier Awareness`.

3. **Resolve and read the input.** Detect which of the five `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title (the user's invocation context is responsible for credentials). For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ASK which is intended. Do not pick by recency or by `NNN`.

4. **Choose the lineage folder.** Plans live in a numbered lineage folder `plans/NNN[-<desc>]/`. `NNN` is a zero-padded 3-digit sequence starting at `001`. If no plan lineage exists yet, use `001`. If plans already exist and this is a NEW, distinct plan subject, use the next free `NNN` and add a short kebab `-<desc>` only when needed to tell the lineages apart (`plans/001-api/`, `plans/002-cli/`); adding a slug to a later lineage never renames an earlier one. The full path is the unit of reference. If which existing lineage the work belongs to is ambiguous, ASK — there is no "highest number" fallback. (Competing candidate plans for ONE subject — e.g. parallel multi-model drafts — are NOT separate lineages; they are `.wip/` scratch and only the chosen-or-merged result is emitted once.)

5. **Draft the index and task files.** Compose the plan folder per `## Strict Plan Body Shape`: an index `plan.md` (plan-level objective and context, the `Source:` line, the verbatim Global Constraints block, and the ordered task list) plus one `tasks/NN-<kebab-slug>.md` brief per task, each carrying the six labeled fields (objective / input / steps / files-modified / verification / acceptance) plus the `Consumes:`/`Produces:` hand-off lines. Reference settled decisions from the upstream input by path + `P<N>` in the relevant task's input/context field. No parallelization markers anywhere in the folder. No YAML frontmatter anywhere in the folder.

6. **Run self-review.** Execute the four checks from `## Self-Review` across the whole drafted folder (index + task files) until all four pass. The emitted files do not contain self-review notes — the discipline runs before emission.

7. **Write the plan folder.** Create `docs/threads/<thread>/plans/NNN[-<desc>]/plan.md` (the index) and the `tasks/NN-<kebab-slug>.md` files together in one pass. The index is named exactly `plan.md`; each task file is `NN-<kebab-slug>.md` under `tasks/` — no UTC stamp, no `v<N>`, and no YAML frontmatter anywhere. The lineage folder is the stable link target. The `plans/` parent, the `NNN[-<desc>]/` lineage folder, and its `tasks/` subfolder are created on-demand on the first plan written for the thread; do not pre-create them.

8. **Confirm.** Tell the user: `Plan written: <thread-relative-path-to-the-index>` (e.g. `plans/001/plan.md`). Nothing else — no preamble, no summary, no closing remark.

## Lineage Folder and Filename

The plan is a **multi-file artifact**: the whole lineage folder — the index plus its task files — is the plan. It is also the **disposable versioned-artifact type**: it lives in a numbered lineage folder, no file carries a UTC stamp or a `v<N>` in its name, and — unlike a proposal or spec — nothing in the folder carries frontmatter.

```text
docs/threads/<thread>/plans/NNN[-<desc>]/
├── plan.md                  # the index
└── tasks/
    ├── 01-<kebab-slug>.md   # one file per task, two-digit zero-padded ordinal
    ├── 02-<kebab-slug>.md
    └── …
```

- `NNN` — a mandatory zero-padded 3-digit sequence starting at `001`. It is the stable identifier; numbered folders sort in creation order.
- `-<desc>` — an optional kebab slug on the lineage folder, added ONLY to distinguish one plan lineage from another. It never renames an earlier lineage, so links stay stable.
- `plan.md` — the index, always literally `plan.md`. The path carries the type (parent folder) and the subject (thread slug), so the bare filename needs neither a stamp nor a version.
- `tasks/NN-<kebab-slug>.md` — one brief per task. `NN` is a two-digit zero-padded ordinal matching the task's position in the index's ordered task list; `<kebab-slug>` is a short kebab summary of the task, chosen at authoring time. One file per task.
- No `v1/` / `v2/` folder names, and no per-revision file. A plan is edited alive in place — git holds its evolution (see `## Alive in Place`). A second lineage is a different plan subject, not a revision of an earlier one.

Examples:

```text
plans/001/plan.md            plans/001/tasks/01-add-jwt-helper.md
plans/001-auth-migration/plan.md
plans/002-billing/plan.md    plans/002-billing/tasks/03-wire-invoices.md
```

Within-thread references in the body are thread-relative (`plans/001/plan.md`, `plans/001/tasks/01-…md`, `specs/001/spec.md`, `discussions/<UTC>-<slug>-decision-log.md`), never repo-rooted and never absolute; cross-thread references are repo-relative (`docs/threads/<other>/…`). The `plans/` folder, its lineage subfolder, and the `tasks/` subfolder are created on-demand on the first plan written; do not pre-create empty folders.

If a reference to an upstream artifact is ambiguous — multiple lineages of one type in the thread (`specs/001-api/` vs `specs/002-cli/`), or "the spec" could mean a spec in another thread — ASK the user which is intended. There is no "highest number" or "most recent" fallback.

## Plan Has No Frontmatter

The plan is the one versioned-artifact type that carries **no `version` and no `status:` map** — it has neither a latch nor a review-cycle counter, and this holds for every file in the plan folder (the index and each task file alike). This is deliberate: the plan is a disposable compiler-IR, the spec plus its acceptance criteria are the contract, and nothing about a plan needs auditing because the spec it compiles is the audited artifact.

- **No `version`.** A spec or proposal counts review→revise cycles in a `version` field; a plan does not. There is no plan version to track anywhere — not in a filename, not in frontmatter.
- **No stored status, no latch.** No human approves a plan. A proposal latches at `approved`/`rejected` and a spec latches at `approved` then `implemented`; a plan has no such event. Its only quality state is the derived verdict of a downstream machine adherence review (does the plan adhere to the spec, honoring the spec's Degrees-of-freedom section), which is computed, never stored on the plan.
- **No frontmatter at all.** Because there is neither a `version` nor a `status:` map to carry, a fresh `plan.md` and every `tasks/NN-<slug>.md` file opens directly with its body, with no `---` YAML block. Do not add one.

## Alive in Place

A plan is edited **alive in place** — there are NO version files, NO `v<N>` filenames, and NO emitting a new file per revision. When the plan needs to change (a self-review fix, an auto-fix after a machine adherence review found a deviation, a refinement during implementation), edit the affected files in the lineage folder directly — the index `plan.md`, any `tasks/NN-<slug>.md` brief, or both. **Git holds the evolution** — the fine-grained history of how the plan changed lives in the commit log, not in a chain of stamped files.

The plan stays alive for the whole time the thread is active and freezes only when the thread closes (the ledger's terminal `closed:` event). There is no per-edit backing record for a plan — it is disposable scaffolding, not a signed contract, so authoring it and refining it are free while the thread is active.

Competing candidate plans for ONE subject (e.g. parallel multi-model drafts of the same plan) are pre-emission scratch and live under `docs/threads/<thread>/.wip/` (gitignored, editable). Compare them there and emit only the chosen-or-merged result once as the `plans/NNN[-<desc>]/` folder (index + task files). They are NOT separate lineages and NOT separate version files.

## Tier Awareness

The tier scales the rigor of the upstream contract this plan compiles and is stored in the thread's `ledger.md` (append-only, last `tier:` line wins) with a one-line justification — never derived from which artifacts are present. The four tiers, by escalating ceremony:

- **Tier 0 — chore:** no behavior change, reversible in one commit. No thread, no ledger — a plan does not belong here.
- **Tier 1 — patch:** small fix/feature, low blast radius, no open design question. A plan is optional; the spec may be light. Strict granularity is usually overkill here.
- **Tier 2 — feature:** anything with a design decision (the default). The spec is reviewed and approved with machine-checkable acceptance criteria, which is what makes autonomous strict planning safe.
- **Tier 3 — initiative:** multi-week, architectural, or hard to reverse. Tier 2 plus a proposal stage and adversarial reviews.

Read the ledger to learn the tier. If no tier is recorded, propose one (default tier 2 for design-decision work) and confirm it, appending a dated, justified `tier: <N> @ <UTC> — <why>` line. Do not write a plan into a thread the ledger marks `deferred` or `closed`.

## Commit Policy

This skill NEVER commits the emitted plan automatically (or the ledger line). Commits happen only if the surrounding session explicitly requests one. Writing the files is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.
