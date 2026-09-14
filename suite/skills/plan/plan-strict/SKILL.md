---
name: plan-strict
description: Turn the thread's design into a strict-granularity plan: an index plus one dispatchable brief per task.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Plan Strict

Forward-design a strict-granularity plan for the active thread. You gather the thread's context, draft an index plus one dispatchable brief per task — each brief carrying explicit substeps, files modified, verification, and acceptance criteria — self-review before emission, create this invocation's plan folder, write the index and the task briefs into it, then confirm the path. Run end-to-end without walking the user task-by-task. Writing the files is where you stop.

## Inputs

Gather all of these before drafting; everything below works from what you gather here.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the design.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- **The design the plan implements** — the primary input, in one of two accepted forms. The thread's **`spec.md`** is the form when the file exists, and it is the plan's authority: its intended outcome, expected behavior, and constraints drive the task list directly, its acceptance criteria map cleanly onto per-task acceptance criteria, and its degrees-of-freedom section tells the plan which *hows* are open. When the invocation names a **referenced artifact** instead — a repository path, a GitHub issue (a full `https://github.com/<owner>/<repo>/issues/<NNN>` URL or the short `owner/repo#NNN` form), another thread's artifact read as history, or the user's own prompt when nothing else is named — that reference is the form; it is material, and it carries no authority over a `spec.md` the thread holds.
- The thread's `seed.md` — why the thread exists and what triggered it.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer, which inside the thread takes precedence over the project records. A task cites a record by its stem where it rests on one, rather than restating it.

The emitted plan must be self-contained: a fresh implementer with only the plan and the thread's durable inputs can execute it, with no dependency on the originating chat.

If which input is meant is ambiguous — a reference names "the spec" with no clear referent, or several artifacts could be intended — that is a preflight failure, not an in-run decision: refuse before drafting, name the ambiguous reference and how to disambiguate it, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the ambiguous reference and how to re-invoke. Never silently pick by recency.

## Plan folder

Every invocation writes into its own new folder `plans/<yymmddhhmm>[-<slug>]/` under the thread root, creating `plans/` on demand. The stamp is the folder's creation time in UTC at minute resolution. Append `-<slug>`, a short kebab-case name for the plan's purpose, when the invocation names one, or when a folder carrying that stamp already exists. Inside that folder you write the index `plan.md` and the task briefs under `plan-tasks/`, and nothing else; never write into a plan folder an earlier invocation created.

You write exactly those files: `plan.md` and `plan-tasks/NN-<kebab-slug>.md` inside the plan folder you created. Nothing else you touch is written — the thread's `spec.md`, `adr/`, and `glossary.md`, and the project's `docs/adr/` and `docs/glossary.md`, are read here and never written.

## Plan Artifact Contract

Every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable**.

- **Sequential** — tasks are numbered in execution order. The implementer executes tasks in plan order; the order is the only execution graph supported.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory. The `Consumes:`/`Produces:` hand-off lines (below) make each task's shared state explicit.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If a task requires more than one sitting, it is too large and should be split. If a task cannot be started without first doing setup that belongs to another task, the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable, the task is under-specified.

Each task satisfies this contract through its prescriptive substeps and per-task fields — objective, input, steps, files-modified, verification, acceptance, plus the `Consumes:`/`Produces:` hand-off lines — packaged as a self-contained brief a fresh implementer can execute in isolation.

## No Parallelization

Plans produced by this skill are sequential: tasks are numbered and the implementer executes them in plan order, the only dependency being that the previous numbered task ran first — anything stronger is out of scope. So the order stays the whole execution graph, neither the index nor any task file carries a concurrency construct: wave numbers, dependency arrays or `depends_on` fields, task-graph notation (DAGs, Mermaid graphs, arrows between tasks), fork/join syntax, or parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks).

Strict granularity is especially tempting territory for parallelization markers because the per-task fields look graph-shaped — resist. If you find yourself wanting to express parallelism, loop back to the design and settle it there.

## Strict Plan Body Shape

A strict plan is a **multi-file artifact**: an index `plan.md` in the plan folder plus one `plan-tasks/NN-<kebab-slug>.md` brief per task beside it. Optimize for an agent-leaning implementer who is handed a single task file in isolation and executes its substeps literally with no inference required. Each task file is a self-contained, directly dispatchable brief; the index ties them together and carries the plan-level context.

### Index (`plans/<folder>/plan.md`)

The index MUST contain:

1. **Plan-level objective and context** — a short statement of what the whole plan achieves and the context a reader needs before opening any task file.
2. **A `Source:` line** — names the upstream artifact this plan was compiled from, in exactly one of four legal value forms:
   - a **thread-relative pointer** to the upstream artifact within the active thread (e.g. `spec.md`, `adr/<stem>.md`);
   - a **repo-relative path** for a cross-thread or project-level artifact (e.g. `.wip/threads/<other>/spec.md`);
   - an **issue URL** (e.g. `https://github.com/<owner>/<repo>/issues/<NNN>`);
   - `none — raw prompt` when the plan was forward-designed directly from a user prompt with no artifact.
3. **A Global Constraints block** — the project-wide requirements the plan must honor, copied **verbatim** from the source artifact's stated constraints, one line each. When the source states no constraints, or there is no source (`Source: none — raw prompt`), the block still appears and says so explicitly (e.g. `The source states no constraints.`) — never an omitted block.
4. **An ordered task list** — one entry per task, in execution order, carrying the task number, its title, a one-line objective, and a pointer relative to the plan folder (e.g. `plan-tasks/01-add-jwt-helper.md`). The list is authoritative for task count and order.

### Task files (`plans/<folder>/plan-tasks/NN-<kebab-slug>.md`)

Each task file is a directly dispatchable brief carrying the six mandatory fields plus two hand-off lines. The six mandatory fields:

1. **Objective** — one sentence stating what this task accomplishes. The objective is the "why" of the task, before any "how".
2. **Input / context** — the artifacts, files, or upstream state the task depends on. Where the task rests on a settled decision, cite the spec section or the thread ADR stem (e.g. `adr/2609051230-use-jose-for-jwt`) that carries it. If the task starts from the previous numbered task's output (the implicit dependency), say so explicitly.
3. **Steps / substeps** — a numbered list of the explicit sub-actions the implementer takes. The substeps are prescriptive; an agent-leaning implementer can follow them literally. Each substep is one concrete action ("create file X", "add function Y to module Z", "run command Q"), not a sub-objective. **Code blocks are the exception, not the default**: describe the action (e.g. "add `verifyToken(token): Promise<UserClaims | null>` to `src/lib/jwt.ts`") and let the implementer write the code. Include an actual code block only when the exact code is load-bearing — a precise signature or interface that must not drift, or a subtle algorithm or edge case likely to be gotten wrong — or when the spec or the user explicitly asked for the code to be pinned. Otherwise, prose substeps.
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

- **No frontmatter, no status markers** anywhere in the plan — not in the index, not in any task file. The index `plans/<folder>/plan.md` and every `plans/<folder>/plan-tasks/NN-<slug>.md` file opens directly with its body, with no `---` YAML block. Execution state lives in the implementation's commits and its report, not in the plan; the index never needs updating mid-run.
- **The index is authoritative** for task count and order. A consumer that finds the index and the `plan-tasks/` folder disagreeing (an index entry with no file, a file not listed, ordinals that skip or collide) must flag the mismatch rather than guess.
- **Task ordering is implicit in the numbering** — `01` runs before `02`, and so on. `NN` is a two-digit zero-padded ordinal matching the task's position in the index's ordered task list. There is no separate ordering field.
- **Pointers carry their own frame.** A pointer from one plan file to another is relative to the plan folder (`plan-tasks/01-…md`); a pointer to a thread file is thread-relative (`spec.md`, `adr/<stem>.md`); a cross-thread or project-level pointer is repo-relative (`docs/adr/<stem>.md`).
- **No parallelization**, index and task files alike — the sequential contract of `## No Parallelization` binds every file.

## Self-Review

Before writing the plan to disk, run the following four-check self-review pass in-session. The emitted plan does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the plan, executed end-to-end, actually achieve the primary input's goal? Does completing every plan task satisfy the spec's intended outcome and acceptance guidance, or, where a referenced artifact is the form, elaborate what it asks for into a complete implementable sequence?
2. **Granularity fit** — does THIS input have enough substance to earn the per-task brief structure? The per-task fields are heavier weight; if the input is too thin (an exploratory raw prompt, a small change finishable in twenty minutes), the structure will bloat rather than pay for itself. When it does not fit, the remedy is to merge tasks into fewer, meatier briefs, shrink the plan, or push back on planning this input at all — introduce no new mechanism to route around the structure. If the fields pay for themselves, keep them.
3. **Right-sized, not under-split** — is every task the smallest unit that still carries its own test cycle and is worth a fresh reviewer's gate? A task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one — split it. Split only where a reviewer could meaningfully reject one task while approving its neighbor. Strict tasks are especially easy to under-split because the substep block hides the size — if the substeps would themselves be task-shaped, the task is too big.
4. **Right-sized, not over-split** — are any tasks too small to earn their own gate? A task that just says "add a comment to `foo.ts`" with one substep is not a standalone strict task; fold it into an adjacent task. Setup, configuration, scaffolding, and documentation steps are not standalone tasks — fold each into the task whose deliverable needs it. A task must be worth a fresh reviewer's gate to stand alone; the per-task overhead must be earned.

Run the four checks against the drafted plan (index + task files). If any check fails, revise the draft in-session before emitting. After the four checks pass, write the plan.

## Procedure

1. **Preflight before any drafting (substantive execution).** A preflight failure writes nothing and follows `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the reason and how to re-invoke — never a pending bundle — refuse when which input is meant is ambiguous per `## Inputs`.
2. **Gather the inputs.** Read everything under `## Inputs` now, in that order. Where the primary input's form is a GitHub issue, fetch the issue body and title (the invocation context is responsible for credentials); where it is the user's prompt, the prompt itself is that material. This picture is what keeps the plan from contradicting a project record or a record the thread has already settled.
3. **Draft the index and task files.** Compose the plan per `## Strict Plan Body Shape`: an index `plan.md` (plan-level objective and context, the `Source:` line, the verbatim Global Constraints block, and the ordered task list) plus one `plan-tasks/NN-<kebab-slug>.md` brief per task, each carrying the six labeled fields plus the `Consumes:`/`Produces:` hand-off lines. Before writing the first task file, look at `<skill_path>/references/worked-example.md` for the complete shape of a task file and the matching index excerpt. No parallelization markers and no frontmatter anywhere.
4. **Run self-review.** Execute the four checks from `## Self-Review` across the whole drafted plan (index + task files) until all four pass. The emitted files do not contain self-review notes.
5. **Write the plan.** Create this invocation's plan folder per `## Plan folder`, then write its `plan.md` (the index) and its `plan-tasks/NN-<kebab-slug>.md` files together in one pass. The index is named exactly `plan.md`; each task file is `NN-<kebab-slug>.md` under the folder's `plan-tasks/` — no UTC stamp, no `v<N>`, and no YAML frontmatter anywhere. The `plan-tasks/` folder is created on demand on the first task file written; do not pre-create it empty.
6. **Confirm.** Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `Plan written: plans/<folder>/plan.md`, and nothing before it — no preamble, no summary, no closing remark.

## Blocked

This path is reachable only after preflight has passed and drafting from otherwise-valid inputs has begun — substantive execution. Invocation and input-reference failures are preflight refusals (`## Procedure` step 1), not this path. It applies whenever a human decision is genuinely indispensable to a sound plan — one you cannot settle yourself from the gathered inputs. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat.

A task that would rest on a thread ADR or a spec decision you find wrong is one of these decisions: planning does not proceed on that task, and the record is corrected before it does. An unnoticed conflict between the plan's material and a project ADR or a project glossary term is another: classify it as `/consult-adrs` instructs, and queue it rather than overriding the project record.

Finish everything safely derivable first, then follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, the plan folder as the target, and the originating user request. Then stop with a concise notification of where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`.

A blocked run still writes the plan — the index and every task file — as complete as the settled inputs allow, each blocked specific marked inline at its exact location pointing at the pending bundle. The only permitted gaps are those marked ones tied to queued decisions.

## Commit Policy

This skill NEVER commits the emitted plan automatically. Commits happen only if the surrounding session explicitly requests one. Writing the files is where the skill stops. Do not stage, do not commit, do not push, do not branch.
