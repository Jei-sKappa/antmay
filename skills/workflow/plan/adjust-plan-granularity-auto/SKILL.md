---
name: adjust-plan-granularity-auto
description: Adjust an existing living plan to a new granularity level autonomously by editing it in place when the current plan is too loose, too strict, or otherwise mismatched to the intended implementer.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Adjust Plan Granularity Auto

Adjust an existing plan to a new granularity end-to-end, from a single source plan path plus a target instruction. This skill reads the source plan, applies the requested granularity shift to the plan body honoring every plan contract, self-reviews before saving, edits the plan **in place** (the plan is a living artifact — there is no new version file), records a lightweight justification for the shift, and confirms the path. It does not ask clarifying questions, it does not walk the user task-by-task, and it does not commit.

## Inputs

This skill requires TWO inputs. Both are mandatory; the skill refuses to draft an adjusted plan when either is missing or ambiguous.

1. **Source plan path** — an existing plan artifact on disk. A plan lives at `plans/NNN[-<desc>]/plan.md` inside a thread; the lineage folder `NNN[-<desc>]/` (zero-padded 3-digit sequence, optional kebab descriptor) is the stable identifier and unit of reference. The path must point to a real `plan.md` file. This skill adjusts the granularity of an existing living plan; it does NOT create plans from scratch. If the thread holds multiple plan lineages (`plans/001/` and `plans/002-cli/`), a bare "the plan" is ambiguous — ASK the user which lineage is intended. There is no "most recent `NNN`" or "highest number" fallback. Because each lineage holds exactly one living `plan.md`, the question of "which version is current" cannot arise — there are no version files.

2. **Target instruction** — what shift to apply to the source plan. One of two forms:

   - **Coarse direction.** One of four named directions:
     - `looser` → fewer tasks, higher-level objective sentences, less prescriptive substeps. Collapses adjacent fine-grained tasks into broader ones; trims per-task fields toward the loose body shape (objective sentence + observable verification sentence, 1–3 sentences per task). This target fits a human-leaning downstream implementer when the existing plan over-specifies what they would infer anyway.
     - `stricter` → more substeps per task, explicit verification per task, files-modified per task, acceptance criteria per task. Expands the body toward the strict six-field per-task shape (objective / input / steps / files-modified / verification / acceptance). This target fits an agent-leaning downstream implementer when the existing plan leaves too much to inference.
     - `more-implementation-ready` → fills in concrete files-modified, mechanical verification commands, observable acceptance criteria where the source plan only described the intent. Adjacent to `stricter` but emphasizes the implementer's executable contract rather than substep count. This target fits a plan authored before the implementation surface was known, after file paths and verification harness are now available.
     - `more-high-level` → collapses substeps into objectives, removes per-task fields, removes verification detail. Adjacent to `looser` but emphasizes "what" over "how". This target fits handoff to a reviewer, sponsor, or planning conversation that does not need the substep block.

   - **Specific phrase.** Free-form natural-language instruction targeting a specific shift the four named directions do not cover. Examples: `split task 3 into substeps`, `merge task 5 and 6`, `add verification to all tasks`, `remove acceptance criteria detail`, `tighten just task 2`, `surface the implicit prerequisite in task 4`. The agent interprets the degree of the shift naturally — there is no fixed list of transformations. The agent MUST apply the requested shift while still honoring every plan contract (`## Plan Artifact Contract` below); a specific-phrase instruction that would violate the sequential-isolated-independent contract or the no-parallelization prohibition is REFUSED, not silently followed.

If either input is missing — no source plan path provided, or no target instruction provided — ASK the user before proceeding. Do not invent a target; do not pick a default direction; do not pick a plan lineage by recency or by highest `NNN`. Both inputs are explicit.

## Output Mechanics: Edit the Living Plan In Place

The plan is a **living artifact** — a disposable compiler-IR derived from the spec, edited in place while the thread is active. The granularity adjustment edits `plan.md` directly inside its lineage folder. This is the binding constraint for everything below.

- **Edit `plan.md` in place — no new version file.** The adjusted body overwrites the plan body at `plans/NNN[-<desc>]/plan.md`. There is NO new filename, NO `v<N>` segment, NO timestamp stamp, NO descriptor suffix, and NO second plan file. A plan lineage holds exactly one living `plan.md`; the granularity shift mutates that file.
- **Git holds the evolution.** The plan carries no version history of its own — git is the record of how the body changed from coarse to fine (or fine to coarse). Do not preserve the pre-shift body as a separate file, a backup, or a commented-out block; the prior state lives in git history.
- **The plan carries NO frontmatter.** Plans have no `version` field and no `status:` map — no human approves a plan, so it has no latch. Do NOT add a `version` field to record the granularity shift, do NOT add lineage frontmatter (`Supersedes:`, `Adjusted from:`, `Source:`), and do NOT add a `status:` map. The plan body is plain markdown with no YAML frontmatter block at all.
- **Record-backed.** The granularity shift is justified by a **lightweight record separate from the plan body** — a decision log (or notes record) capturing *why* the granularity changed (the target instruction, the implementer it now fits, any trade-off). The record is what makes the shift auditable; the plan body itself stays clean. The record is a separate file, never a section inside `plan.md`. See `## Record the Shift` below.
- **Drafting happens in `.wip/`.** While composing the adjusted body, work in the thread's gitignored `.wip/` scratch area; copy the finished body into `plan.md` once self-review passes. Do not stage half-edited bodies into the live `plan.md`.

### Worked Example

Suppose the source plan lives at (within-thread, thread-relative path):

```text
plans/001/plan.md
```

A `stricter` target instruction edits that same file in place — the body becomes the stricter six-field-per-task shape — and writes a record alongside it:

```text
plans/001/plan.md                                   # edited in place; same path
discussions/<UTC>-stricter-granularity-decision-log.md   # why the shift was made
```

There is no second plan file. A reader scanning `plans/001/` sees exactly one `plan.md` (now at the stricter granularity); the prior coarser body is recoverable from git, and the rationale is in the decision log. The plan body contains no wave numbers, dependency arrays, bracketed wave prefixes, or fork/join syntax.

## Record the Shift

The granularity shift must be backed by a lightweight record so the change is auditable without re-reading git diffs. The record is SEPARATE from the plan body — never a section inside `plan.md`.

- **What to record.** The target instruction (the coarse direction or specific phrase), what changed at the granularity level (which tasks were collapsed, split, expanded, or contracted, in one or two lines), and the reason the new granularity fits better (the downstream implementer, the now-known implementation surface, etc.).
- **Where to write it.** A record under the thread's `discussions/` folder that serves this plan lineage — for example `plans/NNN[-<desc>]/discussions/` if the plan lineage has one, or the thread-level discussions that serve the plan. Use the record filename grammar `<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md` (or `-notes.md` for a plainer note). The `decision-log` / `notes` artifact-type token is MANDATORY.
- **Decision-log shape.** Append-only with sequential `## D<N>: <Title>` headings, each carrying `Decision:` and `Rationale:` lines. The record is a frozen record once written — a later granularity change is a NEW record, never an edit of the old one.
- **Keep it lightweight.** This is a justification record, not a second plan. Do not duplicate the plan body into it; capture only why the granularity changed.

## Plan Artifact Contract

The adjusted plan honors the same plan content contract it did before: every task in the plan MUST be **sequential, isolated, independently implementable, and independently reviewable**. The granularity changes; the contract does not.

- **Sequential** — tasks are numbered in execution order. The order is the only execution graph supported. Tasks are executed in plan order.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If the granularity shift would produce a task that requires more than one sitting (typically a risk under `looser` shifts that over-collapse), split it before saving. If the shift would produce a task that cannot be started without setup belonging to another task (typically a risk under `stricter` shifts that hoist substeps into pseudo-tasks), the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable after the shift, the task is under-specified and the shift went too far.

A `looser` shift may collapse multiple sub-tasks into one broader task, but the broader task must still be independently implementable in one sitting and independently reviewable from observable evidence. A `stricter` shift may expand one task into several with prescriptive substeps, but each new task must still be independently implementable — substeps that are themselves plan-task-shaped are a signal that the split went too deep.

## No Parallelization

Plans are sequential. Plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, `depends_on` fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently. This applies after the granularity shift as much as before — the granularity shifts; the prohibition does not.

- **Wave numbers**: do not emit. Tasks execute in numbered order. There are no waves.
- **Dependency arrays / `depends_on` fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

If the target instruction explicitly asks for parallelization (e.g., "add wave numbers" or "mark tasks 3 and 4 as parallel"), the skill REFUSES the instruction — those constructs are out of scope for plan bodies regardless of how the request is framed. A specific-phrase target instruction that would introduce a forbidden construct is treated the same as one that would violate the sequential-isolated-independent contract: refuse to apply it, surface the conflict, and ask the user to revise the instruction.

## Self-Review

Before writing the adjusted body into `plan.md`, run the following four-check self-review pass in-session. The plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the adjusted plan, executed end-to-end, still achieve the plan's goal? The goal does not change just because the granularity does. If the plan exists to migrate the auth middleware to JWT, it still migrates the auth middleware to JWT after the shift — the path through the tasks may be coarser or finer, but the destination is unchanged. If the shift would change what the plan accomplishes, the shift went past granularity into rescoping; surface this and ASK the user before proceeding.
2. **Granularity fit** — does the adjusted plan actually match the requested target? For a `looser` target, are tasks meaningfully broader (fewer tasks, less prescriptive substeps, shorter per-task fields)? For a `stricter` target, do tasks now carry the substep / verification / files-modified / acceptance structure characteristic of strict plans? For a specific-phrase target, does the named shift actually appear in the relevant task(s)? If the shift is undershooting (the body still looks like its pre-shift state) or overshooting (the shift swung past the requested target — e.g., a `looser` ask produced a plan so vague it under-specifies), revise in-session before saving.
3. **No under-splitting** — is every task independently implementable in one sitting? `looser` shifts are especially at risk here because they collapse multiple sub-tasks into broader ones; a collapsed task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one — split it before saving even though the request was to go looser.
4. **No over-splitting** — are any tasks trivial 1-line tasks that bloat the output? `stricter` shifts are especially at risk here because they expand substeps into pseudo-tasks; a task that just says "add a comment to `foo.ts`" with one substep is not a plan task — fold it into an adjacent task. The shift must not produce trivial bloat even when the request was to go stricter.

Run the four checks against the drafted adjusted body (in `.wip/`). If any check fails, revise the draft before saving. After the four checks pass, edit `plan.md` in place.

## Workflow

1. **Resolve the thread and plan lineage.** From the source plan path, identify the thread root and the plan lineage folder `plans/NNN[-<desc>]/` — the adjusted body lands back in `plan.md` inside that same lineage folder. If the thread holds more than one plan lineage and the intended one is ambiguous, ASK the user — do not pick by recency or highest `NNN`.

2. **Read the ledger for tier awareness.** Read the thread's `ledger.md` at the thread root to note the thread's tier and disposition. If the disposition is `deferred` or `closed: …`, the thread (or its artifacts) may be frozen — surface this and ASK the user before editing rather than mutating a paused or sealed thread. On an active thread, the tier is context only; proceed.

3. **Read the source plan.** Open `plan.md` and read its body. Extract the goal, the numbered task list, any per-task fields, and any notes / open-questions sections. The plan carries no frontmatter to parse.

4. **Parse the target instruction.** Detect whether the user passed a coarse direction (`looser` / `stricter` / `more-implementation-ready` / `more-high-level`) or a specific phrase. For coarse directions, apply the documented semantics from `## Inputs`. For specific phrases, interpret the requested shift naturally — there is no fixed list of transformations. If the instruction would violate the sequential-isolated-independent contract or the no-parallelization prohibition, REFUSE and ASK the user to revise.

5. **Draft the adjusted body in `.wip/`.** Compose the adjusted plan body honoring the sequential-isolated-independent contract and the no-parallelization prohibition. The body shape follows the target: a `looser` plan reads with 1–3 sentence task descriptions; a `stricter` plan reads with six-field per-task structure (objective / input / steps / files-modified / verification / acceptance); an `impl-ready` shift fills in files-modified and verification where the body had only intent; a `high-level` shift collapses substeps into objectives. A specific-phrase shift applies the named transformation to the relevant task(s) while leaving the rest as close to the prior body as possible. Do not introduce wave numbers, dependency arrays, bracketed wave prefixes, `depends_on` fields, or any other forbidden construct. Do not add YAML frontmatter.

6. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted body. Revise until all four pass. The body does not contain self-review notes.

7. **Edit `plan.md` in place.** Copy the finished body into `plans/NNN[-<desc>]/plan.md`, overwriting the prior body. Do not create a new file, do not add a version segment or stamp, do not back up the old body — git holds the prior state. The plan stays a single living `plan.md` in its lineage folder.

8. **Record the shift.** Write the lightweight justification record per `## Record the Shift` — a `decision-log` (or `notes`) record under the thread's `discussions/` that serves this plan lineage, using the record filename grammar. The plan body itself stays clean.

9. **Confirm the output paths.** Tell the user, using thread-relative paths: `Plan updated in place: <plan path>` and `Shift recorded: <record path>`. Nothing else — no preamble, no summary, no closing remark.

## Commit Policy

This skill NEVER commits automatically. Commits happen only if the surrounding session explicitly requests one. Editing the plan and writing the record is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.
