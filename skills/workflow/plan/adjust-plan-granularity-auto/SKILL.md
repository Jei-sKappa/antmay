---
name: adjust-plan-granularity-auto
description: Read an existing v1+ plan markdown file under the active V1 thread's `plans/` folder and emit a NEW versioned plan whose body matches a requested granularity target (looser / stricter / more-implementation-ready / more-high-level OR a specific phrase like "split task 3 into substeps"), end-to-end, with no clarifying questions. The source plan is NEVER modified — the original stays immutable per D39 and the new artifact lands alongside it as `<UTC>-v<N+1>-<descriptor>-plan.md` in the same `plans/` folder. Use when you already started with the wrong granularity, or when you need to adapt an existing plan for a different implementer (e.g., handing a loose human-authored plan to an agent-leaning implementer), and you want the adjusted plan written down autonomously — not when you want to walk the source plan task-by-task together (use `adjust-plan-granularity-interactive`), and not when you are authoring a plan from scratch (use the `plan-loose-*` or `plan-strict-*` pair).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Adjust Plan Granularity Auto

Adjust an existing v1+ plan to a new granularity end-to-end, from a single source plan path plus a target instruction. This skill is the autonomous granularity-shifting half of the V1 adjust pair — it reads the source plan, computes the next version integer and a descriptor that encodes the requested shift, drafts the adjusted body honoring every V1 plan contract, self-reviews before emission, writes a NEW versioned artifact, and confirms its path. It does not ask clarifying questions, it does not walk the user task-by-task, it does not edit the source plan, and it does not commit.

`adjust-plan-granularity-auto` is one of two granularity-shifting skills, distinct from the four plan-authoring skills it interoperates with:

- `adjust-plan-granularity-auto` (this skill) — autonomous granularity shift on an existing plan.
- `adjust-plan-granularity-interactive` — collaborative granularity shift: walks the source plan task-by-task with the user, deciding per task whether to SPLIT / MERGE / EXPAND / CONTRACT / LEAVE, pushing back per the anti-sycophancy stance.
- `plan-loose-auto` / `plan-loose-interactive` — author a NEW loose-granularity plan from a spec, proposal, decision log, GitHub issue, or raw prompt. These author plans from scratch; they do NOT take a plan as input.
- `plan-strict-auto` / `plan-strict-interactive` — author a NEW strict-granularity plan from the same five input forms. Strict tasks carry six labeled fields (objective / input / steps / files-modified / verification / acceptance).

Adjust skills accept an EXISTING plan as input — they do not author plans from scratch. If no source plan exists yet, use the `plan-loose-*` or `plan-strict-*` pair to author one first; then come back to `adjust-plan-granularity-auto` when you want to shift its granularity. Loose vs strict is a user/context choice per D58 with no "better" framing; the granularity shift produced by this skill is similarly value-neutral — `looser` does not mean worse and `stricter` does not mean more correct.

## Inputs

`adjust-plan-granularity-auto` requires TWO inputs. Both are mandatory; the skill refuses to draft an adjusted plan when either is missing or ambiguous.

1. **Source plan path** — an existing plan artifact under `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md`. The path must point to a real file on disk. Reading the source is a READ-ONLY operation — see `## Immutability Discipline` below. If multiple plausible plans exist in the thread (for example, two plans at `v2` with different descriptors, or a recently-emitted draft that may or may not be the intended source), ASK the user which is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest plan" algorithm. Do not silently pick by recency, by highest version, or by alphabetical sort of descriptor. The source plan MUST exist; this skill does NOT create plans from scratch — that is the job of the `plan-loose-*` and `plan-strict-*` skills.

2. **Target instruction** — what shift to apply to the source plan. One of two forms:

   - **Coarse direction.** One of four named directions:
     - `looser` → fewer tasks, higher-level objective sentences, less prescriptive substeps. Collapses adjacent fine-grained tasks into broader ones; trims per-task fields toward the loose body shape (objective sentence + observable verification sentence, 1–3 sentences per task). Use when the downstream implementer is human-leaning and the existing plan over-specifies what they would infer anyway.
     - `stricter` → more substeps per task, explicit verification per task, files-modified per task, acceptance criteria per task. Expands the body toward the strict six-field per-task shape (objective / input / steps / files-modified / verification / acceptance). Use when the downstream implementer is agent-leaning and the existing plan leaves too much to inference.
     - `more-implementation-ready` → fills in concrete files-modified, mechanical verification commands, observable acceptance criteria where the source plan only described the intent. Adjacent to `stricter` but emphasizes the implementer's executable contract rather than substep count. Use when the source plan was authored before the implementation surface was known and you now have the file paths and verification harness in hand.
     - `more-high-level` → collapses substeps into objectives, removes per-task fields, removes verification detail. Adjacent to `looser` but emphasizes "what" over "how". Use when handing the plan up to a reviewer, a sponsor, or a planning conversation that does not need the substep block.

   - **Specific phrase.** Free-form natural-language instruction targeting a specific shift the four named directions do not cover. Examples: `split task 3 into substeps`, `merge task 5 and 6`, `add verification to all tasks`, `remove acceptance criteria detail`, `tighten just task 2`, `surface the implicit prerequisite in task 4`. The agent interprets the degree of the shift naturally per D57 — there is no fixed list of transformations. The agent MUST apply the requested shift while still honoring every V1 plan contract (`## Plan Artifact Contract` below); a specific-phrase instruction that would violate the D59 sequential-isolated-independent contract or the D60 no-parallelization prohibition is REFUSED, not silently followed.

If either input is missing — no source plan path provided, or no target instruction provided — ASK the user before proceeding. Do not invent a target; do not pick a default direction; do not pick the most recently-emitted plan as the source. Both inputs are explicit.

## Immutability Discipline

The source plan is NEVER edited, rewritten, renamed, or moved. Reading the source is a READ-ONLY operation. This is the binding constraint for this skill — every other piece of behavior follows from it.

- **Read-only on the source.** The skill opens the source plan with read intent only. It does not stage the source for edit, it does not copy the source to `.wip/` for in-place modification, it does not call any tool whose effect on disk would be to mutate the source file. The source's `<UTC>` stamp, version integer, descriptor, and body content are all preserved exactly as they exist on disk.
- **Output is a NEW versioned plan.** The adjusted body lands as a fresh artifact in the same thread's `plans/` folder, under a new filename whose version integer is `N+1` and whose descriptor encodes the granularity shift. See `## Output Filename and Version` below for the grammar.
- **Both versions remain reviewable side by side.** A downstream reader looking into `plans/` sees the source at its original filename and the adjusted plan at the new filename — the lineage between them is recoverable from the surrounding thread, not from any in-file metadata.
- **No source-relation YAML frontmatter on the adjusted plan.** Per `docs/workflow/v1/immutability.md`, V1 artifacts do NOT carry `Supersedes:`, `Adjusted from:`, `Source:`, or any other lineage frontmatter. The adjusted plan body is plain markdown like any other plan. The relationship to the source is encoded in the filename grammar (same thread + same plans/ folder + next version integer + descriptor) and in the surrounding thread, not on the file.

Per `docs/workflow/v1/immutability.md`, emitted V1 artifacts are immutable once written to their target folder. The source plan is one of those emitted artifacts; the adjusted plan, the moment it lands in `plans/`, becomes one too. Drafts under `docs/threads/<thread>/.wip/` are editable while the adjusted body is being composed in scratch space; the immutability lock applies the moment the file is written into `plans/` under the canonical filename grammar.

## Output Filename and Version

The adjusted plan uses the V1 versioned-form filename grammar per `docs/workflow/v1/filename-grammar.md`, with a MANDATORY descriptor that encodes the granularity shift:

```text
docs/threads/<thread>/plans/<YYMMDDHHMMSSZ>-v<N+1>-<descriptor>-plan.md
```

Rules:

- **`N+1` is the next mainline integer AFTER the source plan's version.** Read the source's filename — extract `<N>` from the `v<N>` segment — and use `N+1` for the adjusted plan. If the source is `v1`, the adjusted plan is `v2`. If the source is `v3`, the adjusted plan is `v4`. Per target-version semantics (D46, D47), the `v<N+1>` segment names the TARGET version this artifact represents, not a predecessor it derives from. The version increments by one regardless of how many descriptors or variants exist at the source version.
- **The descriptor encoding the granularity shift is REQUIRED on the adjusted plan**, even though first-emission plans authored from scratch default to NO descriptor. The descriptor is what tells a downstream reader at a glance that this is a granularity-shifted variant rather than a from-scratch next-version emission. Recommended descriptor patterns by target instruction form:
  - `looser` target → `v<N+1>-looser-plan.md`
  - `stricter` target → `v<N+1>-stricter-plan.md`
  - `more-implementation-ready` target → `v<N+1>-impl-ready-plan.md`
  - `more-high-level` target → `v<N+1>-high-level-plan.md`
  - Specific-phrase target → descriptor chosen to summarize the shift in kebab-case. Examples: `v<N+1>-split-task-3-plan.md`, `v<N+1>-merge-5-and-6-plan.md`, `v<N+1>-add-verification-plan.md`. Keep the descriptor under ~5 words; the goal is recognizability at a glance, not full sentence reproduction.
- **The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured at write time** per `docs/workflow/v1/filename-grammar.md`, never re-derived afterward. The stamp on the adjusted plan is the moment the adjusted artifact is emitted; it is NOT a copy of the source's stamp.
- **The `plan` artifact-type suffix is MANDATORY** per `docs/workflow/v1/filename-grammar.md`. Every plan filename — source, adjusted, or otherwise — ends with `-plan.md`.

### Worked Example

Suppose the source plan lives at:

```text
docs/threads/260520095223Z-auth-migration/plans/260520120000Z-v1-plan.md
```

A `stricter` target instruction at write time `260521094500Z` produces:

```text
docs/threads/260520095223Z-auth-migration/plans/260521094500Z-v2-stricter-plan.md
```

Both files coexist in the same `plans/` folder. The source is unchanged. The adjusted plan is the new artifact. A downstream reader scanning the folder sees `v1` and `v2-stricter` side by side and understands the relationship without consulting any metadata. Neither file contains any wave numbers, dependency arrays, bracketed wave prefixes, or fork/join syntax — the V1 plan contracts (`## Plan Artifact Contract` below) hold across the granularity shift.

## Plan Artifact Contract

The adjusted plan honors the same V1 plan content contract the source did: every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable** (D59). The granularity changes; the contract does not.

- **Sequential** — tasks are numbered in execution order. The implementation skills (Phase 5) execute tasks in plan order; the order is the only execution graph V1 supports.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If the granularity shift would produce a task that requires more than one sitting (typically a risk under `looser` shifts that over-collapse), split it before emitting. If the shift would produce a task that cannot be started without first doing setup belonging to another task (typically a risk under `stricter` shifts that hoist substeps into pseudo-tasks), the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable after the shift, the task is under-specified and the shift went too far in one direction.

The phrase "sequential, isolated, independently implementable" is the V1 plan content contract — every plan skill body restates it, and every task in every emitted plan (adjusted or from-scratch) must satisfy it. The granularity shift does not loosen this contract. A `looser` shift may collapse multiple sub-tasks into one broader task, but the broader task must still be independently implementable in one sitting and independently reviewable from observable evidence. A `stricter` shift may expand one task into several with prescriptive substeps, but each new task must still be independently implementable — substeps that are themselves plan-task-shaped are a signal that the split went too deep.

## No Parallelization

V1 plans are sequential. Per D60, plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently. This applies to the adjusted plan as much as it applies to the source — the granularity shifts; the prohibition does not.

- **Wave numbers**: do not emit. The implementation skills (Phase 5) execute tasks in plan order. There are no waves in V1.
- **Dependency arrays / depends_on fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope for V1.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

These constructs are forbidden at the artifact level per D60 — not as personal taste, but as a project-level V1 constraint. If the target instruction explicitly asks for parallelization (e.g., a specific-phrase instruction like "add wave numbers" or "mark tasks 3 and 4 as parallel"), the skill REFUSES the instruction — those constructs are out of scope for V1 plan bodies regardless of how the request is framed. A specific-phrase target instruction that would introduce a forbidden construct is treated the same as one that would violate the D59 contract: refuse to apply it, surface the conflict, and ask the user to revise the instruction.

This skill body itself avoids parallelization notation in every example below — the worked example earlier is a negative test of D60 (the absence of forbidden constructs is observable in the example).

## Self-Review

Before writing the adjusted plan artifact to disk, run the following four-check self-review pass IN-SESSION (D61). The emitted plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the adjusted plan, executed end-to-end, still achieve the source plan's goal? The goal does not change just because the granularity does. If the source plan exists to migrate the auth middleware to JWT, the adjusted plan still migrates the auth middleware to JWT — the path through the tasks may be coarser or finer, but the destination is unchanged. If the shift would change what the plan accomplishes, the shift went past granularity into rescoping; surface this and ASK the user before proceeding.
2. **Granularity fit** — does the adjusted plan actually match the requested target? For a `looser` target, are tasks meaningfully broader (fewer tasks, less prescriptive substeps, shorter per-task fields)? For a `stricter` target, do tasks now carry the substep / verification / files-modified / acceptance structure characteristic of strict plans? For a specific-phrase target, does the named shift actually appear in the relevant task(s) of the adjusted plan? If the shift is undershooting (the adjusted plan looks too much like the source) or overshooting (the shift swung past the requested target — e.g., a `looser` ask produced a plan so vague it under-specifies), revise IN-SESSION before emitting.
3. **No under-splitting** — is every task in the adjusted plan independently implementable in one sitting? `looser` shifts are especially at risk here because they collapse multiple sub-tasks into broader ones; a collapsed task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one — split it before emitting even though the request was to go looser.
4. **No over-splitting** — are any tasks in the adjusted plan trivial 1-line tasks that bloat the output? `stricter` shifts are especially at risk here because they expand substeps into pseudo-tasks; a task that just says "add a comment to `foo.ts`" with one substep is not a plan task — fold it into an adjacent task. The shift must not produce trivial bloat even when the request was to go stricter.

Run the four checks against the drafted adjusted body. If any check fails, revise the draft IN-SESSION (the `.wip/` draft is editable per `docs/workflow/v1/immutability.md`) before emitting. After the four checks pass, write the artifact. Self-review is in-session; the emitted plan body does not contain a "self-review notes" section.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. The thread is recoverable from the source plan path — `docs/threads/<thread>/plans/<source-plan-filename>`. If the source plan path is absolute and unambiguous, the thread is the segment between `docs/threads/` and the `plans/` folder. If the source plan path is relative or the thread is otherwise unclear, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Read the source plan (READ-ONLY).** Open the source plan and read its body. Do not edit, do not copy to `.wip/` for in-place modification, do not call any mutation tool against it. Extract from the source filename: the version integer `N`, the descriptor (if any), and the UTC stamp. Extract from the source body: the goal, the numbered task list, any per-task fields, any notes / open questions sections.

3. **Parse the target instruction.** Detect whether the user passed a coarse direction (`looser` / `stricter` / `more-implementation-ready` / `more-high-level`) or a specific phrase. For coarse directions, apply the documented semantics (`## Inputs` → Target instruction). For specific phrases, interpret the requested shift naturally per D57 — there is no fixed list of transformations. If the instruction would violate the D59 contract or the D60 prohibition, REFUSE and ASK the user to revise.

4. **Compute the next version integer.** `N+1` where `N` is the source plan's version integer. The new version integer applies regardless of how many candidate variants exist at the source version.

5. **Compute the descriptor.** For coarse directions, use the recommended descriptor (`looser` / `stricter` / `impl-ready` / `high-level`). For specific phrases, choose a kebab-case descriptor that summarizes the shift in roughly five words or fewer (e.g., `split-task-3`, `add-verification`, `merge-5-and-6`). The descriptor is MANDATORY on the adjusted plan even though first-emission from-scratch plans default to no descriptor — the descriptor is what signals at a glance that this artifact is a granularity-shifted variant.

6. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

7. **Draft the adjusted body.** Compose the adjusted plan body honoring the D59 contract and the D60 prohibition. The body shape follows the target: a `looser` adjusted plan reads like a `plan-loose-auto` body (1–3 sentence task descriptions); a `stricter` adjusted plan reads like a `plan-strict-auto` body (six-field per-task structure); an `impl-ready` shift fills in files-modified and verification where the source had only intent; a `high-level` shift collapses substeps into objectives. A specific-phrase shift applies the named transformation to the relevant task(s) while leaving the rest of the plan as close to the source as possible. Do not introduce wave numbers, dependency arrays, bracketed wave prefixes, depends_on fields, or any other forbidden construct anywhere in the draft.

8. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted adjusted body. Revise the draft in `.wip/` (or in memory) until all four pass. The emitted body does not contain self-review notes — the discipline runs before emission.

9. **Write the new artifact.** Create `docs/threads/<thread>/plans/<UTC>-v<N+1>-<descriptor>-plan.md` (write-once). The `plan` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `plans/` folder already exists because the source plan lives there — do not delete, recreate, or reorder the folder. The source plan remains in place under its original filename.

10. **Confirm the output path.** Tell the user: `Plan written: <relative-path-to-the-adjusted-plan>`. Nothing else — no preamble, no summary, no closing remark. Do not announce that the source plan is unchanged (it always is; the announcement adds noise); a downstream reader can verify the source's continued presence by listing the `plans/` folder.

## Filename and Folder

The adjusted plan artifact uses the V1 versioned-form filename grammar per `docs/workflow/v1/filename-grammar.md`:

```text
<YYMMDDHHMMSSZ>-v<N+1>-<kebab-descriptor>-plan.md
```

Rules from `docs/workflow/v1/filename-grammar.md` (applied to this skill):

- The 12-character UTC stamp `YYMMDDHHMMSSZ` comes first, captured at write time and never re-derived afterward.
- `v<N+1>` is the next mainline integer AFTER the source plan's version. The `v<N+1>` segment names the TARGET version this artifact represents — not a predecessor it derives from (D46, D47).
- The `<kebab-descriptor>` is MANDATORY on adjusted plans (unlike first-emission from-scratch plans, which default to no descriptor). The descriptor encodes the granularity shift so a downstream reader recognizes the artifact as a granularity-shifted variant at a glance.
- The `plan` artifact-type token is MANDATORY in every plan filename.

The adjusted plan lands at `docs/threads/<thread>/plans/<filename>` per `docs/workflow/v1/thread-layout.md` — the SAME `plans/` folder as the source. The folder is on-disk already because the source plan lives there; do not pre-create or recreate it.

## Commit Policy

This skill NEVER commits the emitted plan automatically. Commits happen only if the surrounding session explicitly requests one. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch. The same rule applies to the source plan: do not stage, do not modify, do not touch it in git in any way.
