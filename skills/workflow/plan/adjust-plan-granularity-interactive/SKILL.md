---
name: adjust-plan-granularity-interactive
description: Walk the user through an existing v1+ plan task-by-task — deciding per task whether to SPLIT (break into substeps) / MERGE (combine with adjacent task) / EXPAND (add files-modified / verification / acceptance) / CONTRACT (remove substeps or per-task fields) / LEAVE (keep as-is) — pushing back on weak reasoning, then assemble and write a NEW versioned plan whose body matches the requested granularity target (looser / stricter / more-implementation-ready / more-high-level OR a specific phrase). The source plan is NEVER modified — the original stays immutable per D39 and the new artifact lands alongside it as `<UTC>-v<N+1>-<descriptor>-plan.md` in the same `plans/` folder. Use when you want to think the granularity shift through together with the agent and have the resulting adjusted artifact written for you — not when you already have the source plan and target instruction fully shaped (use `adjust-plan-granularity-auto` for that), and not when you are authoring a plan from scratch (use the `plan-loose-*` or `plan-strict-*` pair).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Adjust Plan Granularity Interactive

Walk the user through an existing v1+ plan task-by-task, decide per task what action to take (SPLIT / MERGE / EXPAND / CONTRACT / LEAVE), accept freeform answers per task, push back on weak reasoning per the `## Anti-Sycophancy Stance`, run a self-review pass before emission, and write a NEW versioned plan artifact to the active thread's `plans/` folder using the V1 versioned-form filename grammar. The source plan stays IMMUTABLE per D39 — reading it is a read-only operation; the original filename and body are preserved exactly as on disk. This skill is the collaborative half of the V1 adjust pair: it interviews, it disagrees when warranted, it surfaces what the source plan didn't ask about, and it leaves an adjusted plan behind alongside the source. Granularity shifts at this stage are cheaper than at implementation time — push back on user-requested shifts that violate the V1 plan contract (e.g., a MERGE request that would make the resulting task not-independently-implementable; refuse to log it silently).

`adjust-plan-granularity-interactive` is one of two granularity-shifting skills, distinct from the four plan-authoring skills it interoperates with:

- `adjust-plan-granularity-auto` — autonomous granularity shift: reads the source plan + a target instruction, emits the adjusted plan end-to-end without a per-task walk.
- `adjust-plan-granularity-interactive` (this skill) — collaborative granularity shift.
- `plan-loose-auto` / `plan-loose-interactive` — author a NEW loose-granularity plan from a spec, proposal, decision log, GitHub issue, or raw prompt. These author plans from scratch; they do NOT take a plan as input.
- `plan-strict-auto` / `plan-strict-interactive` — author a NEW strict-granularity plan from the same five input forms. Strict tasks carry six labeled fields (objective / input / steps / files-modified / verification / acceptance).

Adjust skills accept an EXISTING plan as input — they do not author plans from scratch. If no source plan exists yet, use the `plan-loose-*` or `plan-strict-*` pair to author one first; then come back to `adjust-plan-granularity-interactive` when you want to walk a granularity shift task-by-task. Loose vs strict is a user/context choice per D58 with no "better" framing; the granularity shift produced by this skill is similarly value-neutral.

The walk's shape: read the source plan (read-only), confirm or refine the target instruction with the user, walk the source's task list one task at a time deciding SPLIT / MERGE / EXPAND / CONTRACT / LEAVE for each, push back when the chosen action violates the D59 contract, run self-review, write the new artifact.

## Anti-Sycophancy Stance

Your job is to help the user reach an adjusted plan that survives later scrutiny, not to make them feel good about whatever shift they walk in with. Treat granularity adjustment as a mutual attempt to get the plan closer to its downstream implementer: you may be missing context about the implementer's strengths and weaknesses, the user may be missing consequences of the requested shift, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — bad granularity calls compound. A `looser` shift that collapses two tasks that should not be collapsed produces a task the implementer cannot complete in one sitting; a `stricter` shift that explodes one task into six pseudo-tasks bloats the plan and hides the real work. Granularity shifts at this stage are cheaper than at implementation time — push back hard.

Hold these together:

- **Disagree when you disagree.** If the user's chosen action for a task (SPLIT / MERGE / EXPAND / CONTRACT / LEAVE) conflicts with the evidence, your read of the source plan's structure, the upstream spec or proposal, or the codebase reality, say so plainly before they commit it to the adjusted body. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user's proposed action rests on an unexamined assumption ("merge tasks 5 and 6 because they're adjacent" without checking whether the merged task is independently implementable in one sitting), ignores a known constraint, or skips a risk or trade-off the implementation will pay for, name the gap and bring it into the conversation before writing.
- **Surface what they didn't ask about.** Tasks that should be SPLIT but the user marked LEAVE, tasks that already are over-split and should be MERGED, files-modified the source plan forgot, verification that the source plan made interpretive rather than mechanical — raise them, even if it slows the walk down. The walk MAY also propose NEW tasks the source plan missed and surface gaps in the source plan's coverage of the upstream goal.
- **Take the user's input seriously.** If they push back, add context, or challenge your framing, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never soften your read of a task just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a task's adjustment differently, identify the exact assumption or value judgment causing the split, then resolve it before writing the task into the adjusted body.
- **Refuse to log a plan task you believe is wrong without flagging it.** If the user insists on an action that produces a task you believe violates the D59 sequential-isolated-independent contract — for example, a MERGE that produces a task too large for one sitting, or a CONTRACT that strips a task's verification down to "looks correct" — refuse to log it silently. If the user insists, write it, but note the dissent in the adjusted plan body — either inline next to the relevant task or in a `## Notes` / `## Open questions` section at the bottom. Example: `Note: task 3 logged as user-chosen merge of source v1 tasks 5 and 6; recommended keeping them separate because the merged task likely exceeds one sitting — flagged for implementer to revisit.`
- **Keep the plan owned by the evidence.** The goal is not for either side to win. The goal is to emit an adjusted plan that survives the implementation phase because the relevant context, objections, and trade-offs were actually considered.

If you believe the user is about to commit an action into the adjusted plan that is wrong, refuse to log it silently. Either resolve the disagreement first, or write it with the dissent included in the adjusted body. Granularity shifts at this stage are cheaper than at implementation time — this is the cheap moment to push back, and the shift compounds: a wrong action on task 3 propagates through every downstream task that consumes task 3's output.

## Inputs

`adjust-plan-granularity-interactive` requires TWO inputs to open the walk. The walk MAY refine either input as the conversation surfaces — the user does not have to commit to the target instruction up front.

1. **Source plan path** — an existing plan artifact under `docs/threads/<thread>/plans/<UTC>-v<N>[-<descriptor>]-plan.md`. The path must point to a real file on disk. Reading the source is a READ-ONLY operation — see `## Immutability Discipline` below. If multiple plausible plans exist in the thread (for example, two plans at `v2` with different descriptors, or a recently-emitted draft that may or may not be the intended source), ASK the user which is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest plan" algorithm. The source plan MUST exist; this skill does NOT create plans from scratch.

2. **Target instruction** — what shift to apply to the source plan. One of two forms:

   - **Coarse direction.** One of four named directions:
     - `looser` → fewer tasks, higher-level objective sentences, less prescriptive substeps. Collapses adjacent fine-grained tasks into broader ones; trims per-task fields toward the loose body shape (objective sentence + observable verification sentence, 1–3 sentences per task).
     - `stricter` → more substeps per task, explicit verification per task, files-modified per task, acceptance criteria per task. Expands the body toward the strict six-field per-task shape (objective / input / steps / files-modified / verification / acceptance).
     - `more-implementation-ready` → fills in concrete files-modified, mechanical verification commands, observable acceptance criteria where the source plan only described the intent.
     - `more-high-level` → collapses substeps into objectives, removes per-task fields, removes verification detail.

   - **Specific phrase.** Free-form natural-language instruction targeting a specific shift the four named directions do not cover. Examples: `split task 3 into substeps`, `merge task 5 and 6`, `add verification to all tasks`, `remove acceptance criteria detail`, `tighten just task 2`, `surface the implicit prerequisite in task 4`. The agent interprets the degree of the shift naturally per D57 — there is no fixed list of transformations.

The interactive walk MAY refine the target instruction as the conversation surfaces. The user may start with a coarse direction and adjust it task-by-task ("go stricter overall but leave task 1 as-is because it's already at the right granularity"), or may start with a specific phrase and expand it as similar gaps emerge in other tasks. Confirm the working target with the user at the start of the walk and revisit it whenever a task's chosen action drifts from it. If the user has no target instruction in mind at all, ASK before opening the walk — adjustment without a target shape becomes free-form rewriting, which is rescoping, not adjustment.

## Immutability Discipline

The source plan is NEVER edited, rewritten, renamed, or moved. Reading the source is a READ-ONLY operation. This is the binding constraint for this skill — every other piece of behavior follows from it.

- **Read-only on the source.** The skill opens the source plan with read intent only. It does not stage the source for edit, it does not copy the source to `.wip/` for in-place modification, it does not call any tool whose effect on disk would be to mutate the source file. The source's `<UTC>` stamp, version integer, descriptor, and body content are all preserved exactly as they exist on disk.
- **Output is a NEW versioned plan.** The adjusted body lands as a fresh artifact in the same thread's `plans/` folder, under a new filename whose version integer is `N+1` and whose descriptor encodes the granularity shift. See `## Output Filename and Version` below for the grammar.
- **Both versions remain reviewable side by side.** A downstream reader looking into `plans/` sees the source at its original filename and the adjusted plan at the new filename — the lineage between them is recoverable from the surrounding thread, not from any in-file metadata.
- **No source-relation YAML frontmatter on the adjusted plan.** Per `docs/workflow/v1/immutability.md`, V1 artifacts do NOT carry `Supersedes:`, `Adjusted from:`, `Source:`, or any other lineage frontmatter. The adjusted plan body is plain markdown like any other plan.

Per `docs/workflow/v1/immutability.md`, emitted V1 artifacts are immutable once written to their target folder. Drafts under `docs/threads/<thread>/.wip/` are editable while the adjusted body is being composed during the walk; the immutability lock applies the moment the file is written into `plans/` under the canonical filename grammar.

## Per-Task Walk

This is the COLLABORATIVE delta from the auto sibling: instead of consuming the target instruction and producing the adjusted body in one shot, the walk traverses the source plan one task at a time and decides per task what action to take. The five actions are:

- **SPLIT** — break the source task into two or more smaller tasks. Use when the source task bundles work that should be done as separate independently-implementable units, or when the user's target is `stricter` and the source task's substeps are themselves plan-task-shaped.
- **MERGE** — combine the source task with an adjacent task (next or previous). Use when two source tasks are trivial enough that combining them yields a single still-independently-implementable task, or when the user's target is `looser` and the granularity has over-split related work.
- **EXPAND** — keep the source task as a single task but add structure: files-modified, mechanical verification, observable acceptance criteria, or other strict per-task fields. Use when the user's target is `stricter` or `more-implementation-ready` and the source task is well-bounded but under-specified.
- **CONTRACT** — keep the source task as a single task but strip structure: remove substeps, fold per-task fields into the objective sentence, simplify verification. Use when the user's target is `looser` or `more-high-level` and the source task carries strict per-task fields the downstream implementer does not need.
- **LEAVE** — keep the source task exactly as-is, including any per-task fields or substeps it already has. Use when the source task is already at the right granularity for the target.

For each source task, present the task to the user (objective sentence + a brief read of the current granularity) and propose an action per the working target instruction. The user confirms, overrides, or asks for discussion. If the user picks an action that violates the D59 contract — for example, a SPLIT that produces a task without observable verification, a MERGE that produces a task too large for one sitting, a CONTRACT that strips a task's verification down to "looks correct" — push back per the `## Anti-Sycophancy Stance` BEFORE applying the action. Refuse to log the action silently; either resolve the disagreement, or apply it with the dissent noted in the adjusted body.

The walk MAY also propose tasks the source plan didn't anticipate or surface gaps in the source plan's coverage of the upstream goal. A `stricter` walk that fills in files-modified per task may surface that the source plan never accounted for a config file the implementation will need to touch — propose the missing task and walk it through the action list (SPLIT off as its own task, MERGE into an existing task, or LEAVE as a note for the implementer). A `looser` walk that merges adjacent tasks may surface that two seemingly-related tasks are actually coupled to different upstream decisions — push back against the merge.

Move to the next task. The adjusted task list emerges through the walk, not from a pre-built checklist.

## Output Filename and Version

The adjusted plan uses the V1 versioned-form filename grammar per `docs/workflow/v1/filename-grammar.md`, with a MANDATORY descriptor that encodes the granularity shift:

```text
docs/threads/<thread>/plans/<YYMMDDHHMMSSZ>-v<N+1>-<descriptor>-plan.md
```

Rules:

- **`N+1` is the next mainline integer AFTER the source plan's version.** Read the source's filename — extract `<N>` from the `v<N>` segment — and use `N+1` for the adjusted plan. If the source is `v1`, the adjusted plan is `v2`. If the source is `v3`, the adjusted plan is `v4`. Per target-version semantics (D46, D47), the `v<N+1>` segment names the TARGET version this artifact represents, not a predecessor it derives from. The version increments by one regardless of how many candidate variants exist at the source version.
- **The descriptor encoding the granularity shift is REQUIRED on the adjusted plan**, even though first-emission plans authored from scratch default to NO descriptor. The descriptor is what tells a downstream reader at a glance that this is a granularity-shifted variant rather than a from-scratch next-version emission. Recommended descriptor patterns by target instruction form:
  - `looser` target → `v<N+1>-looser-plan.md`
  - `stricter` target → `v<N+1>-stricter-plan.md`
  - `more-implementation-ready` target → `v<N+1>-impl-ready-plan.md`
  - `more-high-level` target → `v<N+1>-high-level-plan.md`
  - Specific-phrase target → descriptor chosen during the walk to summarize the shift in kebab-case. Examples: `v<N+1>-split-task-3-plan.md`, `v<N+1>-merge-5-and-6-plan.md`, `v<N+1>-add-verification-plan.md`. Keep the descriptor under ~5 words; the goal is recognizability at a glance.
- **The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured at write time** per `docs/workflow/v1/filename-grammar.md`, never re-derived afterward.
- **The `plan` artifact-type suffix is MANDATORY** per `docs/workflow/v1/filename-grammar.md`.

### Worked Example

Suppose the source plan lives at:

```text
docs/threads/260520095223Z-auth-migration/plans/260520120000Z-v1-plan.md
```

A `stricter` target instruction, walked task-by-task and emitted at write time `260521094500Z`, produces:

```text
docs/threads/260520095223Z-auth-migration/plans/260521094500Z-v2-stricter-plan.md
```

Both files coexist in the same `plans/` folder. The source is unchanged. The adjusted plan is the new artifact. A downstream reader scanning the folder sees `v1` and `v2-stricter` side by side and understands the relationship without consulting any metadata. Neither file contains any wave numbers, dependency arrays, bracketed wave prefixes, or fork/join syntax — the V1 plan contracts (`## Plan Artifact Contract` below) hold across the granularity shift.

## Plan Artifact Contract

The adjusted plan honors the same V1 plan content contract the source did: every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable** (D59). The granularity changes; the contract does not.

- **Sequential** — tasks are numbered in execution order. The implementation skills (Phase 5) execute tasks in plan order; the order is the only execution graph V1 supports.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. A walk action — SPLIT, MERGE, EXPAND, CONTRACT, LEAVE — that would produce a task violating independent implementability is a candidate for push-back, not a candidate for silent logging.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. A CONTRACT action that strips a task's verification down to "looks correct" violates this property; push back.

The phrase "sequential, isolated, independently implementable" is the V1 plan content contract — every plan skill body restates it, and every task in every emitted plan (adjusted or from-scratch) must satisfy it. During the walk, the anti-sycophancy stance and the D59 contract reinforce each other: a chosen action that does not satisfy independent implementability or independent reviewability is a push-back trigger.

## No Parallelization

V1 plans are sequential. Per D60, plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently. This applies to the adjusted plan as much as it applies to the source — the granularity shifts; the prohibition does not.

- **Wave numbers**: do not emit. The implementation skills (Phase 5) execute tasks in plan order. There are no waves in V1.
- **Dependency arrays / depends_on fields**: do not emit. The implicit dependency is "the previous numbered task ran first". Anything stronger is out of scope for V1.
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

These constructs are forbidden at the artifact level per D60 — not as personal taste, but as a project-level V1 constraint. If during the walk the user asks for an action that would introduce a forbidden construct ("mark tasks 3 and 4 as parallel", "add wave numbers", "add a depends_on array between 5 and 6"), push back per the `## Anti-Sycophancy Stance`: the plan is not the place to express parallelism. The walk MUST NOT silently log such actions. Either the user's underlying intent maps to a permitted V1 construct (re-sequencing the task list, splitting an over-large task, surfacing a prerequisite as its own earlier task), or the request needs to live in a different artifact (a separate discussion settling the execution model, or a re-opened spec phase). Adjust the walk's chosen action accordingly.

This skill body itself avoids parallelization notation in every example below — the worked example earlier is a negative test of D60 (the absence of forbidden constructs is observable).

## Self-Review

The walk closes WITH the self-review pass BEFORE emission (D61). Run the following four-check pass IN-SESSION against the drafted adjusted plan body. The emitted plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the adjusted plan, executed end-to-end, still achieve the source plan's goal? The goal does not change just because the granularity does. If the source plan exists to migrate the auth middleware to JWT, the adjusted plan still migrates the auth middleware to JWT — the path through the tasks may be coarser or finer, but the destination is unchanged. If the walk's actions added or removed tasks in a way that changes what the plan accomplishes, the shift went past granularity into rescoping; surface this and ASK the user before proceeding.
2. **Granularity fit** — does the adjusted plan actually match the requested target? For a `looser` target, are tasks meaningfully broader (fewer tasks, less prescriptive substeps, shorter per-task fields)? For a `stricter` target, do tasks now carry the substep / verification / files-modified / acceptance structure characteristic of strict plans? For a specific-phrase target, does the named shift actually appear in the relevant task(s) of the adjusted plan? If the walk's per-task actions added up to something other than the working target — for example, the user picked LEAVE so often that the adjusted plan looks identical to the source — flag this and ask whether the target instruction is still right.
3. **No under-splitting** — is every task in the adjusted plan independently implementable in one sitting? `looser` walks are especially at risk here because MERGE actions collapse multiple source tasks into broader ones; a merged task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one — split it before emitting even though the user picked MERGE.
4. **No over-splitting** — are any tasks in the adjusted plan trivial 1-line tasks that bloat the output? `stricter` walks are especially at risk here because SPLIT and EXPAND actions can produce pseudo-tasks; a task that just says "add a comment to `foo.ts`" with one substep is not a plan task — fold it into an adjacent task even though the user picked SPLIT.

Run the four checks against the drafted adjusted body. If any check fails, revise the draft IN-SESSION with the user (the `.wip/` draft is editable per `docs/workflow/v1/immutability.md`) before emitting. After the four checks pass, write the artifact. The walk produces drafts under `.wip/` (editable); the immutability lock applies at write into `plans/`.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. The thread is recoverable from the source plan path — `docs/threads/<thread>/plans/<source-plan-filename>`. If the source plan path is absolute and unambiguous, the thread is the segment between `docs/threads/` and the `plans/` folder. If the source plan path is relative or the thread is otherwise unclear, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp.

2. **Read the source plan (READ-ONLY).** Open the source plan and read its body. Do not edit, do not copy to `.wip/` for in-place modification, do not call any mutation tool against it. Extract from the source filename: the version integer `N`, the descriptor (if any), and the UTC stamp. Extract from the source body: the goal, the numbered task list, any per-task fields, any notes / open questions sections.

3. **Confirm or refine the target instruction with the user.** Restate the user's target in one or two sentences and confirm it before opening the walk. If the user supplied only a coarse direction, ask whether the shift applies uniformly across all source tasks or whether some tasks should be left alone. If the user supplied a specific phrase, confirm which task(s) the phrase targets. The walk MAY revisit the working target as per-task actions surface new evidence.

4. **Walk the source plan task-by-task per `## Per-Task Walk`.** For each source task, present the task with a brief read of its current granularity, propose an action (SPLIT / MERGE / EXPAND / CONTRACT / LEAVE) per the working target, and confirm with the user. Push back per the `## Anti-Sycophancy Stance` when the chosen action violates the D59 contract or the D60 prohibition. Move to the next task. Surface new tasks the source plan missed and gaps in coverage when relevant.

5. **Compute the next version integer and descriptor.** `N+1` where `N` is the source plan's version integer. The descriptor encodes the granularity shift — for coarse directions, use the recommended descriptor (`looser` / `stricter` / `impl-ready` / `high-level`); for specific phrases, choose a kebab-case descriptor that summarizes the shift in roughly five words or fewer.

6. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

7. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted adjusted body, with the user in the loop. Revise the draft in `.wip/` (or in memory) until all four pass. The emitted body does not contain self-review notes — the discipline runs before emission.

8. **Write the new artifact.** Create `docs/threads/<thread>/plans/<UTC>-v<N+1>-<descriptor>-plan.md` (write-once). The `plan` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `plans/` folder already exists because the source plan lives there. The source plan remains in place under its original filename.

9. **Confirm the output path.** Tell the user: `Plan written: <relative-path-to-the-adjusted-plan>`. No closing remark, no summary. Do not announce that the source plan is unchanged — a downstream reader can verify the source's continued presence by listing the `plans/` folder.

## Decision Log

This skill does NOT auto-write a separate decision log. Per D93, the default behavior is to capture the adjusted plan artifact only — most granularity-shift conversation is captured fully inside the adjusted plan body, with any push-back items the user proceeded past noted alongside the relevant task or in a `## Notes` / `## Open questions` section at the bottom. A decision log is written ONLY if durable trade-offs or rejected alternatives emerge during the walk that cannot reasonably be captured in the adjusted plan body itself — for example, a major restructuring of the source plan the user considered and rejected with rationale that downstream readers will need to understand independently of the adjusted plan, or a target-instruction trade-off (loose-vs-strict-vs-impl-ready) the user reasoned through and committed to that affects how to interpret every per-task action.

When such a decision log IS warranted, write it to `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md` per `docs/workflow/v1/filename-grammar.md` (record form, `decision-log` artifact-type token). Use the append-only single-record shape from the `discussion` and `seeded-discussion` skill bodies — sequential per-log `## D<N>: <Title>` headings with `Decision:` and `Rationale:` lines. If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim. The adjusted plan body cites the new decision log by absolute path + `D<N>` at the inline locations where its decisions are operative — do not copy decision text from the log into the plan.

When in doubt about whether a side-conversation rises to "durable trade-off" status, ASK the user. The default is no decision log.

## Scope Drift

When the user introduces a branch that is outside the granularity adjustment being walked — re-litigating the upstream spec, proposing implementation work, opening a new feature — do not silently follow them and do not let the adjusted plan grow into a different shape than a shift on the source plan. Propose ONE of:

1. **Park as an Inbox item** via the `capture-inbox` skill (PREFERRED for non-blocking side-findings). Captures a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this adjustment.
2. **Split into its own plan or discussion thread.** When the branch is itself worth a dedicated plan (e.g., the user surfaced a new feature mid-walk) or a multi-decision discussion (e.g., the user wants to revisit a settled spec decision), start a new artifact rather than expand the adjusted plan beyond its intent.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Filename and Folder

The adjusted plan artifact uses the V1 versioned-form filename grammar per `docs/workflow/v1/filename-grammar.md`:

```text
<YYMMDDHHMMSSZ>-v<N+1>-<kebab-descriptor>-plan.md
```

Rules from `docs/workflow/v1/filename-grammar.md` (applied to this skill):

- The 12-character UTC stamp `YYMMDDHHMMSSZ` comes first, captured at write time and never re-derived afterward.
- `v<N+1>` is the next mainline integer AFTER the source plan's version. The `v<N+1>` segment names the TARGET version this artifact represents — not a predecessor it derives from (D46, D47).
- The `<kebab-descriptor>` is MANDATORY on adjusted plans (unlike first-emission from-scratch plans, which default to no descriptor).
- The `plan` artifact-type token is MANDATORY in every plan filename.

The adjusted plan lands at `docs/threads/<thread>/plans/<filename>` per `docs/workflow/v1/thread-layout.md` — the SAME `plans/` folder as the source. The folder is on-disk already because the source plan lives there.

## Commit Policy

This skill NEVER commits the emitted plan automatically (or the optional decision log). Commits happen only if the surrounding session explicitly requests one. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch. The same rule applies to the source plan: do not stage, do not modify, do not touch it in git in any way.
