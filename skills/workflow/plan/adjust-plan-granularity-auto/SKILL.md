---
name: adjust-plan-granularity-auto
description: Adjust an existing plan to a new granularity level (looser, stricter, more-implementation-ready, more-high-level, or a specific free-form shift like "split task 3 into substeps") and emit a new versioned plan file autonomously — without clarifying questions. Use when you already have a plan but the granularity is wrong for the intended implementer and you want the adjusted version written down without walking through it task-by-task.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.0
---

# Adjust Plan Granularity Auto

Adjust an existing plan to a new granularity end-to-end, from a single source plan path plus a target instruction. This skill reads the source plan, computes the next version integer and a descriptor that encodes the requested shift, drafts the adjusted body honoring every plan contract, self-reviews before emission, writes a NEW versioned artifact, and confirms its path. It does not ask clarifying questions, it does not walk the user task-by-task, it does not edit the source plan, and it does not commit.

## Inputs

This skill requires TWO inputs. Both are mandatory; the skill refuses to draft an adjusted plan when either is missing or ambiguous.

1. **Source plan path** — an existing plan artifact on disk. The path must point to a real file. Reading the source is a READ-ONLY operation — see `## Immutability Discipline` below. If multiple plausible plans exist (for example, two plans at `v2` with different descriptors, or a recently-emitted draft that may or may not be the intended source), ASK the user which is intended. There is no "latest plan" algorithm. Do not silently pick by recency, by highest version, or by alphabetical sort of descriptor. The source plan MUST exist; this skill does NOT create plans from scratch.

2. **Target instruction** — what shift to apply to the source plan. One of two forms:

   - **Coarse direction.** One of four named directions:
     - `looser` → fewer tasks, higher-level objective sentences, less prescriptive substeps. Collapses adjacent fine-grained tasks into broader ones; trims per-task fields toward the loose body shape (objective sentence + observable verification sentence, 1–3 sentences per task). Use when the downstream implementer is human-leaning and the existing plan over-specifies what they would infer anyway.
     - `stricter` → more substeps per task, explicit verification per task, files-modified per task, acceptance criteria per task. Expands the body toward the strict six-field per-task shape (objective / input / steps / files-modified / verification / acceptance). Use when the downstream implementer is agent-leaning and the existing plan leaves too much to inference.
     - `more-implementation-ready` → fills in concrete files-modified, mechanical verification commands, observable acceptance criteria where the source plan only described the intent. Adjacent to `stricter` but emphasizes the implementer's executable contract rather than substep count. Use when the source plan was authored before the implementation surface was known and you now have the file paths and verification harness in hand.
     - `more-high-level` → collapses substeps into objectives, removes per-task fields, removes verification detail. Adjacent to `looser` but emphasizes "what" over "how". Use when handing the plan up to a reviewer, a sponsor, or a planning conversation that does not need the substep block.

   - **Specific phrase.** Free-form natural-language instruction targeting a specific shift the four named directions do not cover. Examples: `split task 3 into substeps`, `merge task 5 and 6`, `add verification to all tasks`, `remove acceptance criteria detail`, `tighten just task 2`, `surface the implicit prerequisite in task 4`. The agent interprets the degree of the shift naturally — there is no fixed list of transformations. The agent MUST apply the requested shift while still honoring every plan contract (`## Plan Artifact Contract` below); a specific-phrase instruction that would violate the sequential-isolated-independent contract or the no-parallelization prohibition is REFUSED, not silently followed.

If either input is missing — no source plan path provided, or no target instruction provided — ASK the user before proceeding. Do not invent a target; do not pick a default direction; do not pick the most recently-emitted plan as the source. Both inputs are explicit.

## Immutability Discipline

The source plan is NEVER edited, rewritten, renamed, or moved. Reading the source is a READ-ONLY operation. This is the binding constraint for this skill — every other piece of behavior follows from it.

- **Read-only on the source.** The skill opens the source plan with read intent only. It does not stage the source for edit, it does not copy the source for in-place modification, it does not call any tool whose effect on disk would be to mutate the source file. The source's timestamp, version integer, descriptor, and body content are all preserved exactly as they exist on disk.
- **Output is a NEW versioned plan.** The adjusted body lands as a fresh artifact in the same folder as the source, under a new filename whose version integer is `N+1` and whose descriptor encodes the granularity shift. See `## Output Filename and Version` below for the grammar.
- **Both versions remain reviewable side by side.** A reader looking at the folder sees the source at its original filename and the adjusted plan at the new filename.
- **No source-relation frontmatter on the adjusted plan.** The adjusted plan does NOT carry `Supersedes:`, `Adjusted from:`, `Source:`, or any other lineage frontmatter. The adjusted plan body is plain markdown like any other plan. The relationship to the source is encoded in the filename grammar (same folder + next version integer + descriptor).
- **The adjusted plan is immutable once written.** Drafts in a `.wip/` scratch area are editable while the adjusted body is being composed; the immutability lock applies the moment the file is written to the `plans/` folder under the canonical filename grammar.

## Output Filename and Version

The adjusted plan uses a versioned filename with a MANDATORY descriptor that encodes the granularity shift:

```text
<YYMMDDHHMMSSZ>-v<N+1>-<descriptor>-plan.md
```

Rules:

- **`N+1` is the next mainline integer AFTER the source plan's version.** Read the source's filename — extract `<N>` from the `v<N>` segment — and use `N+1` for the adjusted plan. If the source is `v1`, the adjusted plan is `v2`. If the source is `v3`, the adjusted plan is `v4`. The `v<N+1>` segment names the TARGET version this artifact represents, not a predecessor it derives from. The version increments by one regardless of how many descriptors or variants exist at the source version.
- **The descriptor encoding the granularity shift is REQUIRED on the adjusted plan**, even if the original plan had no descriptor. The descriptor is what tells a downstream reader at a glance that this is a granularity-shifted variant rather than a fresh from-scratch emission. Recommended descriptor patterns by target instruction form:
  - `looser` target → `v<N+1>-looser-plan.md`
  - `stricter` target → `v<N+1>-stricter-plan.md`
  - `more-implementation-ready` target → `v<N+1>-impl-ready-plan.md`
  - `more-high-level` target → `v<N+1>-high-level-plan.md`
  - Specific-phrase target → descriptor chosen to summarize the shift in kebab-case. Examples: `v<N+1>-split-task-3-plan.md`, `v<N+1>-merge-5-and-6-plan.md`, `v<N+1>-add-verification-plan.md`. Keep the descriptor under ~5 words; the goal is recognizability at a glance, not full sentence reproduction.
- **The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured at write time**, never re-derived afterward. The stamp on the adjusted plan is the moment the adjusted artifact is emitted; it is NOT a copy of the source's stamp.
- **The `plan` artifact-type suffix is MANDATORY.** Every plan filename — source, adjusted, or otherwise — ends with `-plan.md`.

### Worked Example

Suppose the source plan lives at:

```text
docs/threads/260520095223Z-auth-migration/plans/260520120000Z-v1-plan.md
```

A `stricter` target instruction at write time `260521094500Z` produces:

```text
docs/threads/260520095223Z-auth-migration/plans/260521094500Z-v2-stricter-plan.md
```

Both files coexist in the same `plans/` folder. The source is unchanged. The adjusted plan is the new artifact. A reader scanning the folder sees `v1` and `v2-stricter` side by side and understands the relationship without consulting any metadata. Neither file contains any wave numbers, dependency arrays, bracketed wave prefixes, or fork/join syntax.

## Plan Artifact Contract

The adjusted plan honors the same plan content contract the source did: every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable**. The granularity changes; the contract does not.

- **Sequential** — tasks are numbered in execution order. The order is the only execution graph supported. Tasks are executed in plan order.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If the granularity shift would produce a task that requires more than one sitting (typically a risk under `looser` shifts that over-collapse), split it before emitting. If the shift would produce a task that cannot be started without setup belonging to another task (typically a risk under `stricter` shifts that hoist substeps into pseudo-tasks), the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable after the shift, the task is under-specified and the shift went too far.

A `looser` shift may collapse multiple sub-tasks into one broader task, but the broader task must still be independently implementable in one sitting and independently reviewable from observable evidence. A `stricter` shift may expand one task into several with prescriptive substeps, but each new task must still be independently implementable — substeps that are themselves plan-task-shaped are a signal that the split went too deep.

## No Parallelization

Plans are sequential. Plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, `depends_on` fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently. This applies to the adjusted plan as much as it applies to the source — the granularity shifts; the prohibition does not.

- **Wave numbers**: do not emit. Tasks execute in numbered order. There are no waves.
- **Dependency arrays / `depends_on` fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

If the target instruction explicitly asks for parallelization (e.g., "add wave numbers" or "mark tasks 3 and 4 as parallel"), the skill REFUSES the instruction — those constructs are out of scope for plan bodies regardless of how the request is framed. A specific-phrase target instruction that would introduce a forbidden construct is treated the same as one that would violate the sequential-isolated-independent contract: refuse to apply it, surface the conflict, and ask the user to revise the instruction.

## Self-Review

Before writing the adjusted plan artifact to disk, run the following four-check self-review pass in-session. The emitted plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the adjusted plan, executed end-to-end, still achieve the source plan's goal? The goal does not change just because the granularity does. If the source plan exists to migrate the auth middleware to JWT, the adjusted plan still migrates the auth middleware to JWT — the path through the tasks may be coarser or finer, but the destination is unchanged. If the shift would change what the plan accomplishes, the shift went past granularity into rescoping; surface this and ASK the user before proceeding.
2. **Granularity fit** — does the adjusted plan actually match the requested target? For a `looser` target, are tasks meaningfully broader (fewer tasks, less prescriptive substeps, shorter per-task fields)? For a `stricter` target, do tasks now carry the substep / verification / files-modified / acceptance structure characteristic of strict plans? For a specific-phrase target, does the named shift actually appear in the relevant task(s) of the adjusted plan? If the shift is undershooting (the adjusted plan looks too much like the source) or overshooting (the shift swung past the requested target — e.g., a `looser` ask produced a plan so vague it under-specifies), revise in-session before emitting.
3. **No under-splitting** — is every task in the adjusted plan independently implementable in one sitting? `looser` shifts are especially at risk here because they collapse multiple sub-tasks into broader ones; a collapsed task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one — split it before emitting even though the request was to go looser.
4. **No over-splitting** — are any tasks in the adjusted plan trivial 1-line tasks that bloat the output? `stricter` shifts are especially at risk here because they expand substeps into pseudo-tasks; a task that just says "add a comment to `foo.ts`" with one substep is not a plan task — fold it into an adjacent task. The shift must not produce trivial bloat even when the request was to go stricter.

Run the four checks against the drafted adjusted body. If any check fails, revise the draft in-session (while it is still in scratch) before emitting. After the four checks pass, write the artifact.

## Workflow

1. **Resolve the thread.** Identify the plans folder from the source plan path — the adjusted plan will land in the same folder. If the source plan path is ambiguous or does not clearly point to a real file, ASK the user — do not silently pick the most recent or highest-versioned file.

2. **Read the source plan (READ-ONLY).** Open the source plan and read its body. Do not edit, do not copy for in-place modification, do not call any mutation tool against it. Extract from the source filename: the version integer `N`, the descriptor (if any), and the UTC stamp. Extract from the source body: the goal, the numbered task list, any per-task fields, any notes / open questions sections.

3. **Parse the target instruction.** Detect whether the user passed a coarse direction (`looser` / `stricter` / `more-implementation-ready` / `more-high-level`) or a specific phrase. For coarse directions, apply the documented semantics from `## Inputs`. For specific phrases, interpret the requested shift naturally — there is no fixed list of transformations. If the instruction would violate the sequential-isolated-independent contract or the no-parallelization prohibition, REFUSE and ASK the user to revise.

4. **Compute the next version integer.** `N+1` where `N` is the source plan's version integer. The new version integer applies regardless of how many candidate variants exist at the source version.

5. **Compute the descriptor.** For coarse directions, use the recommended descriptor (`looser` / `stricter` / `impl-ready` / `high-level`). For specific phrases, choose a kebab-case descriptor that summarizes the shift in roughly five words or fewer (e.g., `split-task-3`, `add-verification`, `merge-5-and-6`). The descriptor is MANDATORY on the adjusted plan even though first-emission from-scratch plans may default to no descriptor — the descriptor is what signals at a glance that this artifact is a granularity-shifted variant.

6. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

7. **Draft the adjusted body.** Compose the adjusted plan body honoring the sequential-isolated-independent contract and the no-parallelization prohibition. The body shape follows the target: a `looser` adjusted plan reads with 1–3 sentence task descriptions; a `stricter` adjusted plan reads with six-field per-task structure (objective / input / steps / files-modified / verification / acceptance); an `impl-ready` shift fills in files-modified and verification where the source had only intent; a `high-level` shift collapses substeps into objectives. A specific-phrase shift applies the named transformation to the relevant task(s) while leaving the rest of the plan as close to the source as possible. Do not introduce wave numbers, dependency arrays, bracketed wave prefixes, `depends_on` fields, or any other forbidden construct anywhere in the draft.

8. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted adjusted body. Revise the draft until all four pass. The emitted body does not contain self-review notes — the discipline runs before emission.

9. **Write the new artifact.** Create `<same-plans-folder>/<UTC>-v<N+1>-<descriptor>-plan.md` (write-once). The `plan` artifact-type suffix is MANDATORY. The `plans/` folder already exists because the source plan lives there — do not delete, recreate, or reorder the folder. The source plan remains in place under its original filename.

10. **Confirm the output path.** Tell the user: `Plan written: <relative-path-to-the-adjusted-plan>`. Nothing else — no preamble, no summary, no closing remark. Do not announce that the source plan is unchanged (it always is; the announcement adds noise).

## Commit Policy

This skill NEVER commits the emitted plan automatically. Commits happen only if the surrounding session explicitly requests one. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch. The same rule applies to the source plan: do not stage, do not modify, do not touch it in git in any way.
