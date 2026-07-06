---
name: review-plan
description: Read a plan artifact and write a references-first adherence review that checks the plan against its spec, sorts the result into one of four outcomes, auto-fixes plan-fault deviations, and routes spec-fault findings to the human; use when a plan needs to be checked for adherence to its spec.
metadata:
  author: https://github.com/Jei-sKappa
  version: 4.0.0
---

# Review Plan

Read a plan artifact and run a **plan adherence review** against the spec it was derived from. The spec plus its acceptance criteria are the contract; the plan is a disposable compiler-IR derived from that contract. This skill checks the plan against the spec, sorts the result into one of four outcomes, **auto-fixes the plan in place when the plan is at fault** and loops until adherent, and **routes spec-fault findings to the human** in a references-first review record without ever patching the plan to paper over a spec gap. The review is **mode-agnostic** — it judges plan-against-spec however the plan was authored (autonomously or by a human). By default it does not walk findings with the user one-at-a-time, but it honors an invocation that asks it to check in or walk the findings interactively; it does not commit.

## Why This Review Must Be Trustworthy

In this workflow the human reads and approves the **spec**; the plan is a disposable intermediate the human never needs to read. A human may review the implementation, but they do not audit the plan — which is exactly why this machine adherence review carries the weight. If it clears a plan that silently drifted from the spec, the drift reaches implementation unseen. The contract being enforced is the spec, not the plan: a finding always traces back to "does the plan deliver what the spec promised?".

## Inputs

This skill accepts ONE required input and ONE strongly-recommended input:

1. **(Required) A plan artifact path** — the plan is a **multi-file artifact**: a lineage folder `plans/NNN[-<desc>]/` holding `plan.md` (the **index**) plus a `tasks/` subfolder of `tasks/NN-<kebab-slug>.md` task files (two-digit zero-padded ordinal, one file per task). The whole folder is the plan artifact. You may be handed either the lineage-folder path or the index (`plan.md`) path — both resolve to the same artifact. The path may be passed thread-relative or repo-relative.
2. **(Strongly recommended) The spec path** the plan was derived from — `specs/NNN[-<desc>]/spec.md` inside the thread root. The spec is the contract this review judges the plan against. When NOT supplied, ASK the user which spec the plan derives from before proceeding — an adherence review with no contract has nothing to check the plan against. Only if the thread genuinely holds no spec (a planning-without-spec exception the user confirms) does the review fall back to the structural checks alone, with an `## Open Questions` note that adherence could not be assessed.

If the plan path is not supplied, ASK the user which plan to review — do not pick by recency. If the thread holds multiple plan lineages (`plans/001/`, `plans/002-cli/`) and the user's reference is vague ("the plan", "the auth plan"), ASK which lineage is intended. There is NO "most recent lineage" or "highest `NNN`" fallback. Each lineage holds exactly one alive plan — its index at `plan.md` plus the task files under `tasks/` (plans carry no `version` — version lives only on the spec), so "which version" never arises; but "which lineage" can, and silently picking by number would hide a real decision (which lineage the user means) behind a sort order. The same lineage-resolution rule applies to the spec input.

The literal folder `plans/NNN[-<desc>]/` is the canonical location plan artifacts land in. If the path passed does not resolve to a plan lineage folder under `plans/` — either the folder itself or its `plan.md` index — refuse and ASK the user to confirm: a plan not under `plans/` is either a misplaced draft (still in `.wip/`, not yet emitted) or not actually a plan. If the supplied spec path is not a `spec.md` under a `specs/` lineage folder, ASK the user to confirm.

## Honor the Spec's Degrees-of-Freedom Section

The contract a spec hands the plan has two parts: the **what**, which is fixed, and an explicit **`## Degrees of freedom` section** that names the **hows** the spec deliberately left to the implementer's choice. Before classifying any deviation, **read the spec's Degrees-of-freedom section.** A plan choice the spec explicitly left open is **NOT a deviation** — it is the plan exercising granted freedom, and it must never be flagged as drift. This is the load-bearing distinction that separates outcome 2 (the plan deviated from a fixed point of the spec) from "the plan chose within granted freedom" (no finding). When a plan resolves something the spec marked a degree of freedom, that resolution is correct by construction; do not second-guess it against your own preference.

## The Four Outcomes

A plan adherence review checks the plan against the spec and sorts the result into one of four outcomes. This classification is the core of the review:

1. **Plan adheres** — executed end-to-end, the plan delivers what the spec's acceptance criteria promise, and any choices the plan made fall within the spec's granted degrees of freedom. → **Proceed to implement.**
2. **Plan deviates from the spec (the plan is at fault)** — the spec is clear on a point, and the plan contradicts it, omits it, or adds work the spec did not call for (and the spec did not mark that point a degree of freedom). → **Auto-fix the plan in place and loop until adherent.** The plan is a disposable compiler-IR; correcting it to match the spec is the normal flow, requires no human, and bumps no version.
3. **Plan deviates because the spec is ambiguous or incomplete (the SPEC is at fault)** — the plan made a choice it could not avoid, because the spec did not pin the point down and did not mark it a degree of freedom. The deviation is a symptom; the root cause is a spec gap.
4. **Plan is ambiguous because the spec is ambiguous or incomplete (the SPEC is at fault)** — the plan could not commit to a clear approach for a point because the spec left that point under-determined and did not mark it a degree of freedom.

**Outcomes 3 and 4 are spec faults. They route to the HUMAN and FIX THE SPEC — they NEVER patch the plan to paper over a spec gap.** Whether you present outcomes 3 and 4 as two separate findings or merge them into one "spec-fault" finding is your discretion; the requirement is that every spec-fault finding clearly states that the fix is to the SPEC, not the plan. Fixing the spec is the only legal post-approval spec edit, and it happens via an owner-approved, record-backed amendment after the human is in the loop — not by this skill silently editing the plan or the spec. This skill's spec-fault deliverable is the references-first review record that routes the finding to the human; it does not amend the spec itself.

Do not collapse a spec fault into a plan fix. The temptation — "I'll just make the plan pick something reasonable" — is exactly the failure mode that lets an unseen decision reach implementation. If the spec is silent on a fixed point, the plan cannot legitimately fill the gap; the spec must.

## The Multi-File Plan Format and a Valid Task

The plan is a multi-file artifact, and this review reads it in a fixed order: **the index first, then the task files one at a time.**

**The index (`plan.md`)** carries:

- The plan-level objective and context.
- A `Source:` line naming the artifact the plan was compiled from — a thread-relative pointer to an upstream artifact (spec, proposal, decision log), a repo-relative path for a cross-thread artifact, an issue URL, or `none — raw prompt`.
- A **Global Constraints** block: the project-wide requirements copied **verbatim** from the source artifact's stated constraints, one line each. When the source states no constraints (or there is no source), the block says so explicitly rather than being omitted.
- An **ordered task list**: number, title, one-line objective, and a relative pointer to each task file. The index is **authoritative for task count and order**.

**Each task file (`tasks/NN-<kebab-slug>.md`)** carries the **seven-element shape** — the six mandatory fields plus the hand-off pair (counted together as one element):

1. **Objective**
2. **Input / context**
3. **Steps / substeps**
4. **Files modified**
5. **Verification**
6. **Acceptance criteria**
7. **`Consumes:` / `Produces:`** — `Consumes:` lists the exact things this task uses from earlier tasks; `Produces:` lists the exact things later tasks rely on. There is no "Interfaces" umbrella heading. `none` is an explicit legal value for either line.

A task file that carries all seven elements is a **valid task**. A task file lacking either `Consumes:` or `Produces:` — or any of the six mandatory fields — is **flagged as a finding**: a plan-authoring fault (**outcome 2**, auto-fixed by adding the missing element) when the spec makes the content clear, or a spec fault when supplying it would require a decision the spec never made.

No frontmatter and no status markers appear anywhere in the plan folder; execution state lives in commits and the implementation report, not in the plan. The index is the source of truth for task count and order, and this review must flag any index↔folder mismatch (below).

## What This Skill Reviews

This is the **plan adherence review**. Every finding tethers to the spec: "does the plan, executed end-to-end, deliver what the spec's acceptance criteria promised?" — and to downstream impact: "what will the implementer build that the spec did not promise, or fail to build that it did?". A finding that does not tether to the spec or to a downstream consequence is noise; cut it or sharpen it.

### Adherence to the spec (the core check)

Map each of the spec's acceptance criteria (and intended outcomes) to the plan tasks that satisfy them, then classify each gap or drift into one of the four outcomes:

- **Coverage gap** — a spec acceptance criterion or intended outcome that no plan task addresses. If the spec is clear and the plan simply omits it, that is **outcome 2** (plan fault → auto-fix by adding the work to the plan). If the spec itself is silent or ambiguous on what is required, that is **outcome 3 or 4** (spec fault → route to the human, fix the spec).
- **Drift** — a plan task that does work the spec did not call for, or reinterprets a settled point differently from the spec. If the spec is clear and the plan contradicts it, **outcome 2** (plan fault → auto-fix). If the plan drifted because the spec was ambiguous, **outcome 3** (spec fault → route to the human). Before flagging drift, confirm the drifted choice is NOT something the spec's Degrees-of-freedom section granted.
- **Order-of-operations** — the plan's task sequence must be implementable in order (tasks run sequentially, never in parallel). A task that depends on a later task's output is a plan-authoring fault — **outcome 2** (auto-fix the ordering).
- **Ambiguity in the plan** — a plan task too vague to implement. If the vagueness traces to a spec gap (the spec never pinned the point down, and did not mark it a degree of freedom), that is **outcome 4** (spec fault → route to the human). If the vagueness is purely the plan under-specifying a point the spec made clear, that is **outcome 2** (plan fault → auto-fix by sharpening the task).

When no spec is available (the confirmed planning-without-spec exception), the adherence check cannot run; note this in `## Open Questions` and fall back to the structural checks below.

### Structural check (index↔tasks consistency)

Mechanical, run before spec-adherence judgment. Verify the index and the `tasks/` folder agree:

- Every task-list entry in the index resolves to an existing `tasks/NN-<kebab-slug>.md` file.
- Every file under `tasks/` is listed in the index's task list.
- Ordinals are **contiguous** (starting at `01`, no gaps) and each index entry's ordinal matches its task file's filename.

A structural mismatch is a plan-authoring fault — **outcome 2** (auto-fix: add the missing index entry, add the missing task file, or renumber to close a gap), the same way any structural authoring defect is corrected in place. The index is authoritative for task count and order; when index and folder disagree on what exists, reconcile toward the index's task list unless the index is itself internally inconsistent.

### Cross-task hand-off check (`Consumes:` / `Produces:`)

Mechanical. Read the task files in index order and check the hand-off lines against each other:

- Every non-`none` `Consumes:` entry must correspond to some **earlier** task's `Produces:` entry. A `Consumes:` entry matching nothing produced earlier is **dangling** — a finding (a task cannot consume something no prior task hands it). When the spec makes clear what should exist, this is **outcome 2** (auto-fix: add the missing `Produces:` to the earlier task, correct the entry, or reorder); when resolving it would require a decision the spec never made, it is a spec fault (outcome 3/4).
- A `Produces:` entry that nothing later consumes is flagged as a **smell, not an error** — a final task legitimately produces for the world outside the plan (a shipped file, a closed ticket). Note it; do not fail on it.

### Global Constraints check (verbatim against `Source:`)

The index carries a **Global Constraints** block — the project-wide requirements copied verbatim from the artifact named on its `Source:` line. Resolve that source artifact and verify the block against it:

- Each Global Constraints entry must match the source's stated constraints **verbatim**. Flag any **drift**: an entry that is stale (the source's wording changed), missing (a source constraint absent from the block), or altered (reworded, softened, or invented beyond what the source states).
- When `Source:` is `none — raw prompt` (or there is otherwise no source artifact), the block must carry the **explicit no-constraints statement**; an omitted block is itself a finding.
- Drift is a plan-authoring fault — **outcome 2** (auto-fix: recopy the source's constraints verbatim) — unless the point that drifted traces to an ambiguity in the source itself, which routes as a spec fault.
- If the `Source:` artifact cannot be read (for example, an external issue URL that is not accessible), note in `## Open Questions` that the verbatim check could not be performed rather than assuming the block is faithful.

This is the review-side half of the verbatim-copy contract: the index promises the constraints were copied faithfully, and this check confirms it.

### Per-task ambiguity (mandatory)

For **every** task file, each of the seven elements must leave no inference required by an implementer who follows the task literally:

- **Objective** — one concrete sentence stating what the task accomplishes, not a sub-objective or aspiration.
- **Input / context** — names specific artifacts, files, or upstream state, including the spec acceptance criteria the task satisfies; if it starts from an earlier task's output, that is stated.
- **Steps / substeps** — prescriptive, concrete actions. A substep that reads as a sub-objective ("ensure the system handles edge cases") is too vague.
- **Files modified** — every file by relative path with `(NEW)` / `(DELETED)` markers; a missing file the substeps imply touching, or a substep contradicting the list, is a finding.
- **Verification** — mechanical, not interpretive: a concrete command, `grep`, `jq`, `test -f`, or named test — not "looks correct".
- **Acceptance criteria** — observable post-conditions tied where possible to the spec's acceptance criteria, not aspiration.
- **`Consumes:` / `Produces:`** — each entry (when not `none`) names the exact thing precisely enough that a later implementer could use it without guessing its name or shape: a function in the target language's own signature style, a CLI invocation as the literal command line, an HTTP endpoint as method + path, a file as path + format. A vague entry ("the parser", "some config") is a finding, and a task file missing either line entirely is a finding.

A per-task ambiguity whose root cause is a plan under-specifying a spec-clear point is **outcome 2** (auto-fix). A per-task ambiguity whose root cause is the spec leaving the point under-determined is **outcome 4** (spec fault → route to the human).

### Task Right-Sizing rubric

Judge each task's size against this rubric:

- A task is the **smallest unit that carries its own test cycle** and is **worth a fresh reviewer's gate**.
- Setup, configuration, scaffolding, and documentation steps are **not** their own tasks — they fold into the task whose deliverable needs them.
- Split into separate tasks only where a reviewer could **meaningfully reject one task while approving its neighbor**.

A task that bundles independently-rejectable deliverables is over-large (should be split); a task that is pure setup with no reviewable deliverable of its own is under-sized (should fold into its consumer). When the spec is clear enough to say which, a right-sizing violation is a plan-authoring fault — **outcome 2** (auto-fix by splitting or merging). When splitting cleanly would require a scoping decision the spec never made, surface it as an `## Open Questions` note rather than inventing the split.

### Sequential, Isolated, Independently Implementable Contract

Every task must be **sequential, isolated, independently implementable, and independently reviewable**. A task requiring shared state with the next beyond what its description captures fails **isolated**; a task that cannot be reviewed without running the previous one fails **independently reviewable**; a task that needs more than one sitting fails **independently implementable**. These are plan-authoring faults — **outcome 2** (auto-fix), unless the task is fundamentally too large to split cleanly given the spec's scope, which may surface as an `## Open Questions` note.

### No-Parallelization Contract

Plans MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct suggesting tasks may run concurrently. Implementation executes tasks in plan order; parallelization markers mislead downstream readers. ANY such construct is a plan-authoring fault — **outcome 2** (auto-fix by removing the construct and linearizing). When naming the forbidden constructs in the review record, use descriptive prose phrases — "bracketed wave prefixes on tasks", "dependency arrays", "depends_on fields", "task-graph notation", "fork/join syntax", "parallelization markers" — and cite the offending passage by section heading or short quote.

This skill does NOT promise: handoff-grade-bar coverage of the spec itself (that is the spec review), code-vs-spec fidelity for an implementation, or general-purpose code review. A finding that escalates beyond plan adherence is out of scope — flag it as a suggestion for a separate review rather than performing the heavier check inline. In particular, deciding whether a spec gap (outcome 3/4) is itself worth a fuller spec re-review is the human's call once routed.

## The Auto-Fix Loop (Outcome 2)

When the review finds an outcome-2 deviation (the plan is at fault and the spec is clear), **fix the plan in place** and re-run the adherence check. The plan is a disposable compiler-IR with no stored status and no `version`: editing it in place is the normal flow, it requires no human approval, and it bumps no version. Loop — fix, re-check — until the plan either adheres (outcome 1) or the only remaining findings are spec faults (outcomes 3/4).

- Edit the plan in place — the index, a task file, or both — to bring it into adherence with the spec: add a missing task file and its index entry, correct a contradicting step, sharpen an under-specified field, add a missing `Consumes:`/`Produces:` line, recopy a drifted Global Constraints entry verbatim from the `Source:` artifact, reconcile an index↔folder mismatch, linearize a parallelization construct, or split or merge tasks to satisfy the sequential-isolation and right-sizing contracts.
- Re-run the four-outcome classification after each fix. A fix that introduces a new deviation must itself be caught and corrected.
- **Never "fix" the plan to resolve a spec fault.** If the only legitimate way to make the plan adhere is to invent a decision the spec never made, that is outcome 3/4 — stop fixing, leave the plan as-is on that point, and route the spec fault to the human.
- The auto-fix loop edits ONLY the plan. It never edits the spec — fixing the spec is an owner-approved, record-backed amendment that happens after the human is routed the finding, and is out of scope for this skill.

If the plan adheres after the loop (no spec faults remain), the deliverable is a confirmation that the plan now adheres and is ready to implement — the auto-fixed plan is itself the record of what changed (git holds the diff). A review record is written only when spec-fault findings remain (below).

## Review Record (written when spec-fault findings remain)

When the review surfaces outcome-3 or outcome-4 findings (spec faults), they route to the human as a **references-first review record** that nests inside the plan it serves. Auto-fixable outcome-2 findings do NOT go in the record — they are fixed in the plan directly. The record carries ONLY the spec-fault findings the human must act on.

A review is a **record**. Write it to the target plan's `reviews/` folder:

```text
plans/NNN[-<desc>]/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

The `review` artifact-type token is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (reviews are records; they carry no `version`).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is a short description — typically `<plan-slug>-adherence-review` or a phrase capturing the highest-impact spec fault.
- The plan's `reviews/` folder is created on-demand. Do not pre-create empty folders.

Example path:

```text
plans/001/reviews/260521101212Z-auth-rollout-adherence-review.md
```

There is NO open/processed/dropped lifecycle and NO folder-move to express status. A review's disposition is not expressed by where it lives.

The record is organized references-first, in this section order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`.

1. **`## References`** — FIRST, before any verdict. List every artifact the review reads or depends on, naming the plan under review AND the spec it is judged against at the top. One entry per line as `- <description>: <path>`; each path carries a description, never a bare path list. Within-thread paths are **thread-relative** (e.g. `plans/001/plan.md`, `plans/001/tasks/03-<slug>.md`, `specs/001/spec.md`); cross-thread paths are **repo-relative** (e.g. `docs/threads/<other>/...`); **never absolute**. Include the plan's index path, any task file a finding traces to, the spec path, the `Source:` artifact when the Global Constraints check relied on it, any decision logs the finding traces to, and any prior reviews on the same plan.
2. **`## Verdict`** — the outcome classification. State plainly that spec-fault findings remain and the plan cannot proceed to implementation until the spec is fixed. Suggested vocabulary (executor MAY refine): `spec-fault — needs human` (one or more outcome-3/4 findings; the spec must be amended before the plan can adhere). If outcome-2 deviations were auto-fixed in the same run, note that the plan was corrected in place for those and only the spec faults remain. One overall verdict plus a one-line tether to the highest-impact finding.
3. **`## Findings`** — only the spec-fault findings (outcome 3 and/or outcome 4), each carrying a SEVERITY tag (`blocker` / `issue` / `nit`). For each finding state (a) that it is a spec fault (outcome 3 deviation-from-ambiguous-spec, or outcome 4 plan-ambiguous-from-ambiguous-spec), (b) the spec point that is ambiguous or incomplete, (c) why it matters — what the implementer would otherwise build on an unmade decision. **Every spec-fault finding states explicitly that the fix is to the SPEC, not the plan.**
4. **`## Evidence`** — for each finding, cite the spec section (or the missing section) AND the task file that exposed the gap, by task number/slug plus field name (or the index section for an index-level finding), with a short quote (≤ one sentence). Reference, do not recite.
5. **`## Open Questions`** — clarifications worth confirming with the human. Frame as questions, not as gaps to autofill. If no spec was available, this section EXPLICITLY notes that adherence could not be assessed. If a question can only be answered by the spec owner, say so.
6. **`## Next Actions`** — for each spec-fault finding, the action is to **amend the spec** (an owner-approved, record-backed amendment) to pin the ambiguous point down, then re-derive or re-check the plan. Never "edit the plan to pick something". One action per finding cluster; do not pad.

Skip a downstream section rather than padding it; never skip `## References` (the plan and spec are always named). Do NOT collapse two sections into one. Multiple findings live in ONE file — one record per review run.

### Disposition Frontmatter

A review records its own disposition in its YAML frontmatter, under a `status:` map. **This skill emits the review with NO `status.disposed` field** — a review with no `status.disposed` is **open, mechanically, by parse**. The absence of the latch is the open state; there is no separate "open" marker to set.

When the review is later acted on, its disposition is recorded directly in this same frontmatter, set once:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>   # optional
```

- **Accept-and-revise** sets the frontmatter directly — for a spec-fault finding, the **owner-approved amendment of the spec is the record**; no separate disposing document is written.
- **Reject** sets the frontmatter with **no document at all** — no separate disposing record is required.
- The optional `rationale` is a thread-relative path to a discussion, if one happened. A discussion never owns the disposition — the frontmatter does.
- Disposition is **set-once**: changing your mind is a new review or a thread reopen, not a frontmatter flip-flop.

This skill only EMITS the review (open, no `status.disposed`). Disposing it — and amending the spec — is a downstream act, out of scope for this skill.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp.

2. **Resolve the plan artifact.** Detect the plan path — you may be handed the lineage folder or its `plan.md` index, and both resolve to the same artifact. If unsupplied, vague, or the thread holds multiple plan lineages, ASK which lineage is intended. Do not pick by recency or `NNN`. Confirm the resolved path before reading.

3. **Resolve the spec the plan derives from.** The spec is the contract. If the user did not supply it, ASK which spec the plan derives from. Only fall back to structural-checks-only if the user confirms the thread genuinely has no spec, noting in `## Open Questions` that adherence could not be assessed.

4. **Read the index first, then the task files one at a time, then the spec — all READ-ONLY.** Read the index (`plan.md`) end-to-end first (objective/context, `Source:`, Global Constraints, ordered task list), then open each `tasks/NN-<slug>.md` one at a time in index order, then read the spec end-to-end. Also resolve and read the artifact named by the index's `Source:` line — you need it for the Global Constraints check. The spec and the `Source:` artifact are read READ-ONLY (this skill never edits them). Read the spec's `## Degrees of freedom` section carefully — it is what separates outcome 2 from "chose within granted freedom".

5. **Run the mechanical checks.** Verify the valid-task shape (all seven elements per task file; a missing `Consumes:`/`Produces:` or mandatory field is a finding), the structural check (index↔tasks consistency), the cross-task hand-off check (every non-`none` `Consumes:` matches an earlier task's `Produces:`; a dangling `Produces:` is a smell, not an error), and the Global Constraints check (the block matches the `Source:` artifact verbatim). Authoring faults surfaced here are outcome-2 auto-fixes.

6. **Run the adherence check and classify into the four outcomes.** Map the spec's acceptance criteria and intended outcomes onto the task files. Apply the per-task ambiguity check and the Task Right-Sizing rubric to each task file. For each gap, drift, ambiguity, ordering, right-sizing, or contract violation, classify: outcome 1 (adheres), outcome 2 (plan fault), outcome 3 (spec-ambiguous deviation), or outcome 4 (spec-ambiguous plan ambiguity). Honor the Degrees-of-freedom section — a granted choice is never a deviation.

7. **Auto-fix outcome-2 findings in the plan and loop.** Edit the index and/or task files in place to bring the plan into adherence, then re-run steps 5–6. Loop until the plan adheres or only spec faults remain. NEVER fix the plan to resolve a spec fault.

8. **Decide the deliverable.**
   - If the plan adheres (outcome 1, no spec faults): confirm the plan now adheres and is ready to implement. No review record is written — the auto-fixed plan is the record.
   - If spec faults (outcome 3/4) remain: write a review record carrying ONLY those findings.

9. **Capture the UTC stamp** at write time. Stamp once and reuse.

10. **Write the review record** (only if spec faults remain) to `plans/NNN[-<desc>]/reviews/<UTC>-<kebab-desc>-review.md` under the target plan's lineage folder. The `review` suffix is MANDATORY. Emit with NO `status.disposed` field (open by parse). The `reviews/` folder is created on-demand.

11. **Confirm.** If the plan was auto-fixed to adherence: `Plan adheres after auto-fix — ready to implement: <thread-relative plan path>`. If spec faults remain: `Spec-fault review written: <thread-relative review path>`. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits — neither the auto-fixed plan nor the review record. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under the thread's `.wip/` folder — drafts are editable during the session but never committed by this skill.

## Immutability

The plan is a disposable compiler-IR with no stored status and no `version`; the whole folder — index and task files alike — is **edited in place** (the auto-fix loop) while the thread is active, and freezes only when the thread closes. Auto-fixing it to adhere to the spec is the normal flow — there is no new-version-file ceremony. Git holds the diffs.

A review is a record. Its **body is frozen at emission** — once written into the plan's `reviews/` folder, the body is part of the thread's reviewable history and is NOT rewritten. A typo discovered in an emitted review's body means writing a NEW review record (new UTC stamp, new kebab-desc), not an in-place body edit. The review's **frontmatter `status:` map is a live surface** until the review is disposed: `status.disposed` / `status.disposition` / optional `status.rationale` may be set once when the review is acted on (this skill does not set them). Once `status.disposed` is set, the frontmatter freezes too.

The spec is reviewed READ-ONLY by this skill. Spec-fault findings are surfaced under `## Next Actions` as items the human must address by an owner-approved, record-backed spec amendment — never an edit this skill makes to the spec, and never a plan patch that papers over the gap.

No source-relation or lineage frontmatter (`Supersedes:`, `Forked from:`, etc.) is added — lineage between a review, the plan, and the spec lives in the `## References` section, not in metadata. The only frontmatter a review carries is its lifecycle `status:` map (and only once disposed).
