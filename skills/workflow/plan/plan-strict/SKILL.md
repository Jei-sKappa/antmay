---
name: plan-strict
description: Turn a spec, proposal, decisions, GitHub issue, or raw prompt into a strict-granularity plan — a thread-root plan.md index plus one dispatchable brief per task under plan-tasks/, each with explicit substeps, files modified, verification, and acceptance criteria; use when the downstream implementer is agent-leaning and needs a prescriptive plan.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 5.0.0
---

# Plan Strict

Forward-design a strict-granularity plan for the active thread from a single upstream input. Read the input, draft an index plus one dispatchable brief per task — each brief carrying explicit substeps, files modified, verification, and acceptance criteria — self-review before emission, write the index `plan.md` at the thread root and the task briefs under `plan-tasks/`, then confirm the path. Run end-to-end without walking the user task-by-task. Writing the files is where you stop — do not stage, commit, or push.

The spec plus its acceptance criteria are the contract a reviewer and the implementation are judged against; the plan is downstream scaffolding compiled from that contract. This is why an implementer or reviewer works from the plan while the human normally reads only the spec and the delivered work: when the spec carries machine-checkable acceptance criteria and a Degrees-of-freedom section, this skill can produce a prescriptive plan a downstream adherence review can clear without the human reading it.

## Inputs

Accept ONE of the following input forms. Detect which form was passed before drafting:

1. **A spec artifact** — the thread-root `spec.md`, the usual upstream input. Its semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the plan's task list directly, its acceptance criteria map cleanly onto per-task acceptance criteria, and its Degrees-of-freedom section tells the plan which *hows* are open.
2. **A proposal artifact** — the thread-root `proposal.md`. When the input is a proposal rather than a spec, the plan tasks elaborate the proposal's rough shape into an implementable sequence; treat the proposal's open questions as items the plan either resolves or carries forward. A thin proposal yields a thin plan — if there is not enough substance to warrant per-task briefs, flag it in self-review rather than padding the structure.
3. **The thread's durable inputs** — `decisions.md` (the settled decisions the plan must honor) together with `seed.md` (why the thread exists and what triggered it), when no proposal or spec has been written. Each settled decision may map to a task or constrain one — cite it as `decisions.md D<N>` in the relevant task's input/context field where the decision is operative.
4. **A GitHub issue URL or identifier** — a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
5. **A raw user prompt** — when no artifact is referenced, the user's prompt is itself the input, and the plan is forward-designed directly from it.

The emitted plan must be self-contained: a fresh implementer with only the plan and the thread's durable inputs can execute it, with no dependency on the originating chat.

If the input is ambiguous — a reference names "the spec" or "the decisions" with no clear referent, or several artifacts could be intended — this is a clarification inside a resolved thread, not a free choice: route it per `## Blocked` as a pending-decisions bundle rather than silently picking by recency.

## Plan Artifact Contract

Every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable**.

- **Sequential** — tasks are numbered in execution order. The implementer executes tasks in plan order; the order is the only execution graph supported.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory. The `Consumes:`/`Produces:` hand-off lines (below) make each task's shared state explicit.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If a task requires more than one sitting, it is too large and should be split. If a task cannot be started without first doing setup that belongs to another task, the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable, the task is under-specified.

Each task satisfies this contract through its prescriptive substeps and per-task fields — objective, input, steps, files-modified, verification, acceptance, plus the `Consumes:`/`Produces:` hand-off lines — packaged as a self-contained brief a fresh implementer can execute in isolation.

## No Parallelization

Plans produced by this skill are sequential. Neither the index nor any task file may contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, `depends_on` fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently.

- **Wave numbers**: do not emit. The implementer executes tasks in plan order. There are no waves.
- **Dependency arrays / `depends_on` fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

Strict granularity is especially tempting territory for parallelization markers because the per-task fields look graph-shaped — resist. If you find yourself wanting to express parallelism, loop back to the spec phase or open a separate discussion.

## Strict Plan Body Shape

A strict plan is a **multi-file artifact**: an index `plan.md` at the thread root plus one `plan-tasks/NN-<kebab-slug>.md` brief per task. Optimize for an agent-leaning implementer who is handed a single task file in isolation and executes its substeps literally with no inference required. Each task file is a self-contained, directly dispatchable brief; the index ties them together and carries the plan-level context.

### Index (`plan.md`)

The index MUST contain:

1. **Plan-level objective and context** — a short statement of what the whole plan achieves and the context a reader needs before opening any task file.
2. **A `Source:` line** — names the upstream artifact this plan was compiled from, in exactly one of four legal value forms:
   - a **thread-relative pointer** to the upstream artifact within the active thread (e.g. `spec.md`, `proposal.md`, `decisions.md`);
   - a **repo-relative path** for a cross-thread artifact (e.g. `docs/threads/<other>/spec.md`);
   - an **issue URL** (e.g. `https://github.com/<owner>/<repo>/issues/<NNN>`);
   - `none — raw prompt` when the plan was forward-designed directly from a user prompt with no artifact.
3. **A Global Constraints block** — the project-wide requirements the plan must honor, copied **verbatim** from the source artifact's stated constraints, one line each. When the source states no constraints, or there is no source (`Source: none — raw prompt`), the block still appears and says so explicitly (e.g. `The source states no constraints.`) — never an omitted block.
4. **An ordered task list** — one entry per task, in execution order, carrying the task number, its title, a one-line objective, and a relative pointer to the task file (e.g. `plan-tasks/01-add-jwt-helper.md`). The list is authoritative for task count and order.

### Task files (`plan-tasks/NN-<kebab-slug>.md`)

Each task file is a directly dispatchable brief carrying the six mandatory fields plus two hand-off lines. The six mandatory fields:

1. **Objective** — one sentence stating what this task accomplishes. The objective is the "why" of the task, before any "how".
2. **Input / context** — the artifacts, files, or upstream state the task depends on. Cite settled decisions as `decisions.md D<N>` here when they constrain the task. If the task starts from the previous numbered task's output (the implicit dependency), say so explicitly.
3. **Steps / substeps** — a numbered list of the explicit sub-actions the implementer takes. The substeps are prescriptive; an agent-leaning implementer can follow them literally. Each substep is one concrete action ("create file X", "add function Y to module Z", "run command Q"), not a sub-objective. **Code blocks are the exception, not the default**: describe the action (e.g. "add `verifyToken(token): Promise<UserClaims | null>` to `src/lib/jwt.ts`") and let the implementer write the code. Include an actual code block only when the exact code is load-bearing — a precise signature or interface that must not drift, or a subtle algorithm or edge case likely to be gotten wrong — or when the spec, the settled decisions, or the user explicitly asked for the code to be pinned. Otherwise, prose substeps.
4. **Files modified** — the exact files this task touches. List every file by relative path. If a file is created, note `(NEW)` next to it; if removed, note `(DELETED)`. The list is the source of truth for the task's filesystem footprint.
5. **Verification** — how the implementer (or a reviewer) confirms the task succeeded. Prefer a concrete command, `grep`, `jq`, `test -f` check, or named test over "looks correct". Verification is mechanical, not interpretive — a reviewer running the verification block should reach the same conclusion as the implementer. The verification block is *task-specific*: it captures the checks that confirm THIS task's objective, and it layers on top of — never replaces — the project's standing required gates (the bar a project enforces on any code allowed to land; a project may define none). Do NOT narrow a task's verification to a subset that silently drops a standing gate, and do NOT defer a cheap standing gate to a later task. Defer to a dedicated closing task only the genuinely expensive, churn-heavy *whole-change* gates (full end-to-end suites, golden regeneration, living-docs, a full build) that the feature would otherwise re-run on every task — a cheap standing commit-gate is not one of those.
6. **Acceptance criteria** — the observable state of completion. What must be true after the task is done? A bullet list of post-conditions: "function X exists at module Y", "test Z passes", "config K has value V". Acceptance is the externally observable definition of done; verification is the procedure for checking it.

Plus two hand-off lines (place them after the six fields, or wherever reads cleanly in the brief):

- `Consumes:` — the exact things this task uses from earlier tasks (state, files, functions, endpoints those tasks produced). `none` is an explicit legal value when the task depends on nothing from an earlier task.
- `Produces:` — the exact things later tasks rely on from this task. `none` is an explicit legal value when nothing later depends on this task's output.

The hand-off lines follow the rule of **precision, not notation**: name the exact thing in whatever notation is native to it — a function in the target language's own signature style (`verifyToken(token: string): Promise<UserClaims | null>`), a CLI invocation as the literal command line (`npm run migrate -- --to 007`), an HTTP endpoint as method + path (`POST /api/sessions`), a file as path + format (`config/auth.json` — JSON). Natural-language entries are fine as long as a later implementer could use the named thing without guessing its name or shape. Do NOT introduce an `Interfaces` umbrella heading to hold these — the two labeled lines are the whole hand-off surface.

Each task file MAY add additional fields (notes, rollback procedure, performance budget, etc.) when the input warrants it. The eight labeled elements above (six fields + two hand-off lines) are the minimum.

The index and task files use freeform markdown. Use section headings that help the downstream agent-leaning reader follow the prescriptive shape (for example `## Global Constraints`, `## Tasks` in the index), and use the eight labeled elements as the structural backbone inside each task file — without bloating the artifact.

### Invariants

- **No frontmatter, no status markers** anywhere in the plan — not in the index, not in any task file. A fresh `plan.md` and every `plan-tasks/NN-<slug>.md` file opens directly with its body, with no `---` YAML block. Execution state lives in the implementation's commits and its report, not in the plan; the index never needs updating mid-run.
- **The index is authoritative** for task count and order. A consumer that finds the index and the `plan-tasks/` folder disagreeing (an index entry with no file, a file not listed, ordinals that skip or collide) must flag the mismatch rather than guess.
- **Task ordering is implicit in the numbering** — `01` runs before `02`, and so on. `NN` is a two-digit zero-padded ordinal matching the task's position in the index's ordered task list. There is no separate ordering field.
- **Edited in place.** When the plan needs to change (a self-review fix, an adherence-review auto-fix, a refinement during implementation), edit the affected files — the index `plan.md`, any `plan-tasks/NN-<slug>.md` brief, or both — directly. Git holds the evolution; there are no per-revision files.
- **No parallelization**, index and task files alike — the sequential contract of `## No Parallelization` binds every file.

## Self-Review

Before writing the plan to disk, run the following four-check self-review pass in-session. The emitted plan does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the plan, executed end-to-end, actually achieve the input's goal? If the input is a spec, does completing every plan task satisfy the spec's intended outcome and acceptance guidance? If the input is a proposal, does the plan elaborate the proposal's rough shape into a complete implementable sequence?
2. **Granularity fit** — does THIS input have enough substance to earn the per-task brief structure? The per-task fields are heavier weight; if the input is too thin (a sketchy proposal, an exploratory raw prompt, a small change finishable in twenty minutes), the structure will bloat rather than pay for itself. When it does not fit, the remedy is to merge tasks into fewer, meatier briefs, shrink the plan, or push back on planning this input at all — introduce no new mechanism to route around the structure. If the fields pay for themselves, keep them.
3. **Right-sized, not under-split** — is every task the smallest unit that still carries its own test cycle and is worth a fresh reviewer's gate? A task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one — split it. Split only where a reviewer could meaningfully reject one task while approving its neighbor. Strict tasks are especially easy to under-split because the substep block hides the size — if the substeps would themselves be task-shaped, the task is too big.
4. **Right-sized, not over-split** — are any tasks too small to earn their own gate? A task that just says "add a comment to `foo.ts`" with one substep is not a standalone strict task; fold it into an adjacent task. Setup, configuration, scaffolding, and documentation steps are not standalone tasks — fold each into the task whose deliverable needs it. A task must be worth a fresh reviewer's gate to stand alone; the per-task overhead must be earned.

Run the four checks against the drafted plan (index + task files). If any check fails, revise the draft in-session before emitting. After the four checks pass, write the plan.

## Replacing an existing plan

If a `plan.md` already exists at the thread root, determine its shape before writing:

- **A brief plan being escalated.** When the existing `plan.md` is a one-screen brief plan and the user is escalating to strict granularity, replace the entire planning artifact atomically: write the strict index over `plan.md` and create the `plan-tasks/` briefs together, in one pass. Never mix strict tasks with the stale brief's steps, and never leave a `plan.md` describing strict tasks while `plan-tasks/` is missing or half-written.
- **An existing strict plan being refined.** Edit the index and the affected task briefs in place (see the Invariants above).

## Workflow

1. **Resolve the thread.** Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. Two situations make a pending bundle physically impossible — `.pending-decisions/` would live inside the very thread that failed to resolve — so in both, refuse in chat, write nothing, and end with `Outcome: REFUSED — <reason>`: no thread exists yet (a thread must be opened before a plan can be written), or several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp).
2. **Resolve and read the input.** Detect which of the five `## Inputs` forms was passed. For an artifact input, read the file. For a GitHub issue, fetch the issue body and title (the invocation context is responsible for credentials). For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, route the clarification per `## Blocked` rather than picking by recency.
3. **Check for an existing plan.** If a `plan.md` already exists at the thread root, apply `## Replacing an existing plan` before writing anything.
4. **Draft the index and task files.** Compose the plan per `## Strict Plan Body Shape`: an index `plan.md` (plan-level objective and context, the `Source:` line, the verbatim Global Constraints block, and the ordered task list) plus one `plan-tasks/NN-<kebab-slug>.md` brief per task, each carrying the six labeled fields plus the `Consumes:`/`Produces:` hand-off lines. Before writing the first task file, look at `references/worked-example.md` for the complete shape of a task file and the matching index excerpt. Cite settled decisions as `decisions.md D<N>` in the relevant task's input/context field. No parallelization markers and no frontmatter anywhere.
5. **Run self-review.** Execute the four checks from `## Self-Review` across the whole drafted plan (index + task files) until all four pass. The emitted files do not contain self-review notes.
6. **Write the plan.** Write `docs/threads/<thread>/plan.md` (the index) and the `plan-tasks/NN-<kebab-slug>.md` files together in one pass. The index is named exactly `plan.md` at the thread root; each task file is `NN-<kebab-slug>.md` under `plan-tasks/` — no UTC stamp, no `v<N>`, and no YAML frontmatter anywhere. The `plan-tasks/` folder is created on demand on the first task file written; do not pre-create it empty. Within-thread references in the body are thread-relative (`plan.md`, `plan-tasks/01-…md`, `spec.md`, `decisions.md`); cross-thread references are repo-relative (`docs/threads/<other>/…`).
7. **Confirm.** End with exactly this line, and nothing before it — no preamble, no summary, no closing remark: `Outcome: DONE — Plan written: plan.md`.

## Blocked

This path applies whenever a human decision is genuinely indispensable to a sound plan — one you cannot settle yourself from the durable inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat. Finish everything safely derivable first, then hand the open decision(s) to `/emit-pending-decisions`, giving it `/plan-strict` as the producer, `plan.md` as the target, the context you gathered as evidence, the originating user request, the open decision(s), and a suggested follow-up: settle the decisions, then re-invoke the plan. Then stop with a concise notification of where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

A blocked run still writes the plan — the index and every task file — as complete as the settled inputs allow, each blocked specific marked inline at its exact location pointing at the pending bundle. The only permitted gaps are those marked ones tied to queued decisions.

## Commit Policy

This skill NEVER commits the emitted plan automatically. Commits happen only if the surrounding session explicitly requests one. Writing the files is where the skill stops. Do not stage, do not commit, do not push, do not branch.
