---
name: adjust-plan-granularity-interactive
description: Walk an existing living plan task by task to decide whether to split, merge, expand, contract, or leave each task, then edit the plan in place when the user wants to think the granularity shift through collaboratively.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Adjust Plan Granularity Interactive

Walk the user through an existing plan task-by-task, decide per task what action to take (SPLIT / MERGE / EXPAND / CONTRACT / LEAVE), accept freeform answers per task, push back on weak reasoning per the `## Anti-Sycophancy Stance`, run a self-review pass before saving, and edit the living `plan.md` in place at its lineage folder. This skill is the collaborative half of the granularity-adjust pair: it interviews, it disagrees when warranted, it surfaces what the plan didn't ask about, and it leaves the plan at a new granularity behind. Granularity shifts at this stage are cheaper than at implementation time — push back on user-requested shifts that violate the plan contract (e.g., a MERGE request that would make the resulting task not-independently-implementable; refuse to log it silently).

## Anti-Sycophancy Stance

Your job is to help the user reach an adjusted plan that survives later scrutiny, not to make them feel good about whatever shift they walk in with. Treat granularity adjustment as a mutual attempt to get the plan closer to its downstream implementer: you may be missing context about the implementer's strengths and weaknesses, the user may be missing consequences of the requested shift, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — bad granularity calls compound. A `looser` shift that collapses two tasks that should not be collapsed produces a task the implementer cannot complete in one sitting; a `stricter` shift that explodes one task into six pseudo-tasks bloats the plan and hides the real work. Granularity shifts at this stage are cheaper than at implementation time — push back hard.

Hold these together:

- **Disagree when you disagree.** If the user's chosen action for a task (SPLIT / MERGE / EXPAND / CONTRACT / LEAVE) conflicts with the evidence, your read of the plan's structure, the upstream spec or proposal, or the codebase reality, say so plainly before they commit it to the plan body. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user's proposed action rests on an unexamined assumption ("merge tasks 5 and 6 because they're adjacent" without checking whether the merged task is independently implementable in one sitting), ignores a known constraint, or skips a risk or trade-off the implementation will pay for, name the gap and bring it into the conversation before saving.
- **Surface what they didn't ask about.** Tasks that should be SPLIT but the user marked LEAVE, tasks that already are over-split and should be MERGED, files-modified the plan forgot, verification that the plan made interpretive rather than mechanical — raise them, even if it slows the walk down. The walk MAY also propose NEW tasks the plan missed and surface gaps in the plan's coverage of the upstream goal.
- **Take the user's input seriously.** If they push back, add context, or challenge your framing, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never soften your read of a task just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a task's adjustment differently, identify the exact assumption or value judgment causing the split, then resolve it before writing the task into the plan body.
- **Refuse to log a plan task you believe is wrong without flagging it.** If the user insists on an action that produces a task you believe violates the sequential-isolated-independent contract — for example, a MERGE that produces a task too large for one sitting, or a CONTRACT that strips a task's verification down to "looks correct" — refuse to log it silently. If the user insists, write it, but note the dissent in the plan body — either inline next to the relevant task or in a `## Notes` / `## Open questions` section at the bottom. Example: `Note: task 3 logged as user-chosen merge of source tasks 5 and 6; recommended keeping them separate because the merged task likely exceeds one sitting — flagged for implementer to revisit.`
- **Keep the plan owned by the evidence.** The goal is not for either side to win. The goal is to leave behind an adjusted plan that survives the implementation phase because the relevant context, objections, and trade-offs were actually considered.

If you believe the user is about to commit an action into the plan that is wrong, refuse to log it silently. Either resolve the disagreement first, or write it with the dissent included in the plan body. Granularity shifts at this stage are cheaper than at implementation time — this is the cheap moment to push back, and the shift compounds: a wrong action on task 3 propagates through every downstream task that consumes task 3's output.

## Inputs

This skill requires TWO inputs to open the walk. The walk MAY refine either input as the conversation surfaces — the user does not have to commit to the target instruction up front.

1. **Source plan path** — an existing living plan at `plans/NNN[-<desc>]/plan.md` inside a thread. The lineage folder `NNN[-<desc>]/` (zero-padded 3-digit sequence, optional kebab descriptor) is the stable identifier and unit of reference. The path must point to a real `plan.md` file on disk. This skill adjusts the granularity of an existing living plan; it does NOT create plans from scratch. If the thread holds multiple plan lineages (`plans/001/` and `plans/002-cli/`), a bare "the plan" is ambiguous — ASK the user which lineage is intended; there is no "most recent `NNN`" or "highest number" fallback. Because each lineage holds exactly one living `plan.md`, the question of "which version is current" cannot arise — there are no version files.

2. **Target instruction** — what shift to apply to the plan. One of two forms:

   - **Coarse direction.** One of four named directions:
     - `looser` → fewer tasks, higher-level objective sentences, less prescriptive substeps. Collapses adjacent fine-grained tasks into broader ones; trims per-task fields toward the loose body shape (objective sentence + observable verification sentence, 1–3 sentences per task).
     - `stricter` → more substeps per task, explicit verification per task, files-modified per task, acceptance criteria per task. Expands the body toward the strict six-field per-task shape (objective / input / steps / files-modified / verification / acceptance).
     - `more-implementation-ready` → fills in concrete files-modified, mechanical verification commands, observable acceptance criteria where the plan only described the intent.
     - `more-high-level` → collapses substeps into objectives, removes per-task fields, removes verification detail.

   - **Specific phrase.** Free-form natural-language instruction targeting a specific shift the four named directions do not cover. Examples: `split task 3 into substeps`, `merge task 5 and 6`, `add verification to all tasks`, `remove acceptance criteria detail`, `tighten just task 2`, `surface the implicit prerequisite in task 4`. The agent interprets the degree of the shift naturally — there is no fixed list of transformations.

The interactive walk MAY refine the target instruction as the conversation surfaces. The user may start with a coarse direction and adjust it task-by-task ("go stricter overall but leave task 1 as-is because it's already at the right granularity"), or may start with a specific phrase and expand it as similar gaps emerge in other tasks. Confirm the working target with the user at the start of the walk and revisit it whenever a task's chosen action drifts from it. If the user has no target instruction in mind at all, ASK before opening the walk — adjustment without a target shape becomes free-form rewriting, which is rescoping, not adjustment.

## Output Mechanics: Edit the Living Plan In Place

The plan is a **living artifact** — a disposable compiler-IR derived from the spec, edited in place while the thread is active. The granularity adjustment edits `plan.md` directly inside its lineage folder. This is the only V2 change to this skill's mechanics, and the binding constraint for everything below.

- **Edit `plan.md` in place — no new version file.** The adjusted body, assembled through the walk, overwrites the plan body at `plans/NNN[-<desc>]/plan.md`. There is NO new filename, NO `v<N>` segment, NO timestamp stamp, NO descriptor suffix, and NO second plan file. The V1 "emit a fresh `<UTC>-v<N+1>-<descriptor>-plan.md`" mechanic is gone. A plan lineage holds exactly one living `plan.md`; the walk mutates that file.
- **Git holds the evolution.** The plan carries no version history of its own — git is the record of how the body changed from coarse to fine (or fine to coarse). Do not preserve the pre-shift body as a separate file, a backup, or a commented-out block; the prior state lives in git history.
- **The plan carries NO frontmatter.** Plans have no `version` field and no `status:` map — no human approves a plan, so it has no latch. Do NOT add a `version` field to record the granularity shift, do NOT add lineage frontmatter (`Supersedes:`, `Adjusted from:`, `Source:`), and do NOT add a `status:` map. The plan body is plain markdown with no YAML frontmatter block at all. (Dissent flagged during the walk goes inline next to the task or in a `## Notes` / `## Open questions` body section — never in frontmatter.)
- **Record-backed.** The granularity shift is justified by a **lightweight record separate from the plan body** — a decision log capturing *why* the granularity changed (the target instruction, the per-task actions that materially restructured the plan, any dissent the user proceeded past). The record is what makes the shift auditable; the plan body stays clean. The record is a separate file, never a section inside `plan.md`. See `## Record the Shift` below.
- **Drafting happens in `.wip/`.** While the walk assembles the adjusted body, work in the thread's gitignored `.wip/` scratch area; copy the finished body into `plan.md` once self-review passes. Do not stage half-edited bodies into the live `plan.md` mid-walk.

## Per-Task Walk

Instead of consuming the target instruction and producing the adjusted body in one shot, the walk traverses the source plan one task at a time and decides per task what action to take. The five actions are:

- **SPLIT** — break the task into two or more smaller tasks. This action fits a task that bundles work that should be done as separate independently-implementable units, or a `stricter` target where the task's substeps are themselves plan-task-shaped.
- **MERGE** — combine the task with an adjacent task (next or previous). This action fits two tasks that are trivial enough to combine into a single still-independently-implementable task, or a `looser` target where the granularity has over-split related work.
- **EXPAND** — keep the task as a single task but add structure: files-modified, mechanical verification, observable acceptance criteria, or other strict per-task fields. This action fits a `stricter` or `more-implementation-ready` target where the task is well-bounded but under-specified.
- **CONTRACT** — keep the task as a single task but strip structure: remove substeps, fold per-task fields into the objective sentence, simplify verification. This action fits a `looser` or `more-high-level` target where the task carries strict per-task fields the downstream implementer does not need.
- **LEAVE** — keep the task exactly as-is, including any per-task fields or substeps it already has. This action fits a task that is already at the right granularity for the target.

For each task, present the task to the user (objective sentence + a brief read of the current granularity) and propose an action per the working target instruction. The user confirms, overrides, or asks for discussion. If the user picks an action that violates the sequential-isolated-independent contract — for example, a SPLIT that produces a task without observable verification, a MERGE that produces a task too large for one sitting, a CONTRACT that strips a task's verification down to "looks correct" — push back per the `## Anti-Sycophancy Stance` BEFORE applying the action. Refuse to log the action silently; either resolve the disagreement, or apply it with the dissent noted in the plan body.

The walk MAY also propose tasks the plan didn't anticipate or surface gaps in the plan's coverage of the upstream goal. A `stricter` walk that fills in files-modified per task may surface that the plan never accounted for a config file the implementation will need to touch — propose the missing task and walk it through the action list (SPLIT off as its own task, MERGE into an existing task, or LEAVE as a note for the implementer). A `looser` walk that merges adjacent tasks may surface that two seemingly-related tasks are actually coupled to different upstream decisions — push back against the merge.

Move to the next task. The adjusted task list emerges through the walk, not from a pre-built checklist.

## Record the Shift

The granularity shift must be backed by a lightweight record so the change is auditable without re-reading git diffs. The record is SEPARATE from the plan body — never a section inside `plan.md`.

- **What to record.** The target instruction (the coarse direction or specific phrase), the per-task actions that materially restructured the plan (which tasks were SPLIT / MERGED / EXPANDED / CONTRACTED, in one or two lines), and the reason the new granularity fits better (the downstream implementer, the now-known implementation surface, etc.). If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, carry that dissent verbatim into the record's rationale.
- **Where to write it.** A record under the thread's `discussions/` folder that serves this plan lineage — for example `plans/NNN[-<desc>]/discussions/` if the plan lineage has one, or the thread-level discussions that serve the plan. Use the record filename grammar `<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md`. The `decision-log` artifact-type token is MANDATORY.
- **Decision-log shape.** Append-only with sequential `## D<N>: <Title>` headings, each carrying `Decision:` and `Rationale:` lines. The record is a frozen record once written — a later granularity change is a NEW record, never an edit of the old one. The plan body cites the record by thread-relative path + `D<N>` at the inline locations where its decisions are operative; do not copy decision text from the record into the plan.
- **Keep it lightweight.** This is a justification record, not a second plan. Do not duplicate the plan body into it; capture only why the granularity changed.

When in doubt about whether the walk's restructuring rises to needing a recorded rationale, ASK the user. A non-trivial granularity shift should leave a record; a tiny one-task tweak may not.

## Plan Artifact Contract

The adjusted plan honors the same plan content contract it did before: every task in the plan MUST be **sequential, isolated, independently implementable, and independently reviewable**. The granularity changes; the contract does not.

- **Sequential** — tasks are numbered in execution order. Implementers execute tasks in plan order; the order is the only execution graph this plan format supports.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. A walk action — SPLIT, MERGE, EXPAND, CONTRACT, LEAVE — that would produce a task violating independent implementability is a candidate for push-back, not a candidate for silent logging.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. A CONTRACT action that strips a task's verification down to "looks correct" violates this property; push back.

The phrase "sequential, isolated, independently implementable" is the plan content contract — every task in the plan must satisfy it. During the walk, the anti-sycophancy stance and this contract reinforce each other: a chosen action that does not satisfy independent implementability or independent reviewability is a push-back trigger.

## No Parallelization

Plans are sequential. Plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently. This applies after the granularity shift as much as before — the granularity shifts; the prohibition does not.

- **Wave numbers**: do not emit. The implementation phase executes tasks in plan order. There are no waves.
- **Dependency arrays / depends_on fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

These constructs are forbidden at the artifact level. If during the walk the user asks for an action that would introduce a forbidden construct ("mark tasks 3 and 4 as parallel", "add wave numbers", "add a depends_on array between 5 and 6"), push back per the `## Anti-Sycophancy Stance`: the plan is not the place to express parallelism. The walk MUST NOT silently log such actions. Either the user's underlying intent maps to a permitted construct (re-sequencing the task list, splitting an over-large task, surfacing a prerequisite as its own earlier task), or the request needs to live in a different artifact (a separate discussion settling the execution model, or a re-opened spec phase). Adjust the walk's chosen action accordingly.

## Self-Review

The walk closes WITH the self-review pass BEFORE saving. Run the following four-check pass IN-SESSION against the drafted adjusted plan body. The plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the adjusted plan, executed end-to-end, still achieve the plan's goal? The goal does not change just because the granularity does. If the plan exists to migrate the auth middleware to JWT, it still migrates the auth middleware to JWT after the shift — the path through the tasks may be coarser or finer, but the destination is unchanged. If the walk's actions added or removed tasks in a way that changes what the plan accomplishes, the shift went past granularity into rescoping; surface this and ASK the user before proceeding.
2. **Granularity fit** — does the adjusted plan actually match the requested target? For a `looser` target, are tasks meaningfully broader (fewer tasks, less prescriptive substeps, shorter per-task fields)? For a `stricter` target, do tasks now carry the substep / verification / files-modified / acceptance structure characteristic of strict plans? For a specific-phrase target, does the named shift actually appear in the relevant task(s)? If the walk's per-task actions added up to something other than the working target — for example, the user picked LEAVE so often that the body looks identical to its pre-shift state — flag this and ask whether the target instruction is still right.
3. **No under-splitting** — is every task independently implementable in one sitting? `looser` walks are especially at risk here because MERGE actions collapse multiple tasks into broader ones; a merged task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one — split it before saving even though the user picked MERGE.
4. **No over-splitting** — are any tasks trivial 1-line tasks that bloat the output? `stricter` walks are especially at risk here because SPLIT and EXPAND actions can produce pseudo-tasks; a task that just says "add a comment to `foo.ts`" with one substep is not a plan task — fold it into an adjacent task even though the user picked SPLIT.

Run the four checks against the drafted adjusted body. If any check fails, revise the draft IN-SESSION with the user (the `.wip/` draft is editable before saving) before saving. After the four checks pass, edit `plan.md` in place.

## Workflow

1. **Resolve the thread and plan lineage.** From the source plan path, identify the thread root and the plan lineage folder `plans/NNN[-<desc>]/` — the adjusted body lands back in `plan.md` inside that same lineage folder. If the thread holds more than one plan lineage and the intended one is ambiguous, ASK the user — do not pick by recency or highest `NNN`.

2. **Read the ledger for tier awareness.** Read the thread's `ledger.md` at the thread root to note the thread's tier and disposition. If the disposition is `deferred` or `closed: …`, the thread (or its artifacts) may be frozen — surface this and ASK the user before editing rather than mutating a paused or sealed thread. On an active thread, the tier is context only; proceed.

3. **Read the source plan.** Open `plan.md` and read its body. Extract the goal, the numbered task list, any per-task fields, and any notes / open-questions sections. The plan carries no frontmatter to parse.

4. **Confirm or refine the target instruction with the user.** Restate the user's target in one or two sentences and confirm it before opening the walk. If the user supplied only a coarse direction, ask whether the shift applies uniformly across all tasks or whether some tasks should be left alone. If the user supplied a specific phrase, confirm which task(s) the phrase targets. The walk MAY revisit the working target as per-task actions surface new evidence.

5. **Walk the source plan task-by-task per `## Per-Task Walk`.** For each task, present the task with a brief read of its current granularity, propose an action (SPLIT / MERGE / EXPAND / CONTRACT / LEAVE) per the working target, and confirm with the user. Push back per the `## Anti-Sycophancy Stance` when the chosen action violates the sequential-isolated-independent contract or the no-parallelization prohibition. Move to the next task. Surface new tasks the plan missed and gaps in coverage when relevant. Assemble the adjusted body in the thread's `.wip/` scratch area as the walk proceeds.

6. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted adjusted body, with the user in the loop. Revise the `.wip/` draft until all four pass. The body does not contain self-review notes.

7. **Edit `plan.md` in place.** Copy the finished body into `plans/NNN[-<desc>]/plan.md`, overwriting the prior body. Do not create a new file, do not add a version segment or stamp, do not back up the old body — git holds the prior state. The plan stays a single living `plan.md` in its lineage folder.

8. **Record the shift.** Write the lightweight justification record per `## Record the Shift` — a `decision-log` record under the thread's `discussions/` that serves this plan lineage, using the record filename grammar, carrying any walk dissent verbatim in its rationale. The plan body cites it by thread-relative path + `D<N>` where operative; the body itself stays clean.

9. **Confirm the output paths.** Tell the user, using thread-relative paths: `Plan updated in place: <plan path>` and `Shift recorded: <record path>`. No closing remark, no summary.

## Scope Drift

When the user introduces a branch that is outside the granularity adjustment being walked — re-litigating the upstream spec, proposing implementation work, opening a new feature — do not silently follow them and do not let the plan grow into a different shape than a shift on its prior body. Propose ONE of:

1. **Capture it as a seed for a future thread** (PREFERRED for non-blocking side-findings). A tangential item that deserves its own work later becomes the genesis narrative of a new thread, so it survives without polluting this adjustment.
2. **Split into its own plan lineage or discussion.** When the branch is itself worth a dedicated plan (e.g., the user surfaced a new feature mid-walk) or a multi-decision discussion (e.g., the user wants to revisit a settled spec decision), start a new lineage folder or discussion record rather than expand this plan beyond its intent.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER commits automatically (neither the plan edit nor the decision log). Commits happen only if the surrounding session explicitly requests one. Editing the plan and writing the record is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.
