---
name: close-thread
description: Close a thread by landing its ADRs and glossary terms into the project layer.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Close Thread

Close one thread, end to end. You gather the thread's material, run every check before the first write, then land the thread's draft ADRs and glossary entries into the project layer, retain the thread's delta as its historical snapshot, record the thread's outcome on the roadmap entry it answers, and append its closing event to the thread log. The thread folder stays in place, and the closing event makes the completed operation detectable from that folder. Once the checks pass, the writes run without questions. Writing the closing event is where you stop — do not stage, commit, or push.

## Inputs

Gather all of these before running the checks; everything below works from what you gather here.

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on the thread's drafts, which land beside them.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
- The thread to close — the folder the invocation names, in the shape `<skill_path>/references/formats/thread.md` defines. Everything below is read inside it.
- The thread's `log.md` — the thread's memory and the place closure is recorded, in the shape `<skill_path>/references/formats/log-line.md` defines.
- The thread's `seed.md` — why the thread exists and what it set out to reach. When its frontmatter carries a `roadmap` mapping, `roadmap.path` and `roadmap.entry` name the roadmap index this thread was opened from and the slug of its entry.
- The thread's `spec.md`, when the file exists — the design claims the currency check reads.
- The thread's `adr/` — the draft records to land, in the shape `<skill_path>/references/formats/adr.md` defines.
- The thread's `glossary.md`, when the file exists — the terms to merge into the project's, in the shape `<skill_path>/references/formats/glossary.md` defines.
- Every `implementations/<folder>/report.md` the thread holds — what each implementation delivered, in the shape `<skill_path>/references/formats/implementation-report.md` defines; its `## Deviations` entries and the delivered changes it describes are what the currency check reads.
- The roadmap index named by the seed frontmatter's `roadmap.path`, when the seed carries a `roadmap` mapping — a project-level file under `.work/roadmaps/`, in the shape `<skill_path>/references/formats/roadmap-index.md` defines; the heading whose text is the `roadmap.entry` slug is where the closing line goes.
- The contents of `.pending-decisions/`, `.pending-reviews/`, and every `implementations/<folder>/.runs/` — the thread's workspaces, inspected by listing what each holds. You need their names and whether they are empty, not their contents.

## Checks before any write

Run all five, in order, and all of them before the first write. They are reads; none of them changes anything.

1. **Prior closure** — when `log.md` already contains the closing event, refuse per `## Refusals` unless the invocation explicitly says to proceed anyway.

2. **Currency check** — does the thread's design truth still match what the thread produced? Scale it to the material the thread holds:
   - **With implementations and a spec:** read each report's `## Deviations` entries and the delivered changes it describes against the spec's claims and the draft ADRs in `adr/`.
   - **With a spec and no implementations:** read the draft ADRs against the spec.
   - **With implementations and no spec:** read the reports and the delivered changes against the draft ADRs and the seed's intent.
   - **With neither a spec nor an implementation:** no divergence is possible and the check passes.

   The check is narrow: it reads recorded deviations and delivered changes, and it is not a review of the implementation at large. Do not open the code to audit it, and do not treat an unrecorded improvement as a divergence. A divergence you cannot settle from the thread's material goes to `## Blocked`.

3. **Landing preflight** — every draft in `adr/` is landable: each carries a `name` and a `description` in its frontmatter; its stem exists in neither `docs/adr/` nor `docs/adr/superseded/`; every stem listed under `supersedes` resolves to a file in `docs/adr/`; and no draft contradicts a project ADR it does not supersede. Whether a contradiction is intentional or an unnoticed conflict is classified as `/consult-adrs` instructs. An unresolved stem or an unnoticed conflict goes to `## Blocked`; a structurally malformed draft or a stem collision is a refusal, per `## Refusals`.

4. **Roadmap reference** — when the seed frontmatter carries a `roadmap` mapping, the index file exists at `roadmap.path` and a heading whose text is `roadmap.entry` exists inside it. A missing file or a missing heading goes to `## Blocked`. When the seed carries no such mapping, this check passes and no entry is written.

5. **Workspaces** — list `.pending-decisions/`, `.pending-reviews/`, and every `implementations/<folder>/.runs/`. A non-empty `.pending-decisions/` blocks the close: name its bundles and stop per `## Blocked`, unless the invocation says explicitly to close anyway, in which case the close proceeds and the bundles are named in the report. Non-empty `.pending-reviews/` folders and run-state folders never block: leave them in place and name them in the report.

## Blocked

This path is reachable only once the drafts are structurally sound — a malformed draft is a refusal (`## Refusals`), not this path. It applies to anything a check cannot settle from the thread's material: a divergence between what the thread designed and what it delivered, a `supersedes` stem that resolves to nothing, an unnoticed conflict between a draft and a project record, or a roadmap index or entry heading the seed names and the project layer does not hold. Do not invent the answer, do not close around the gap, and do not stall waiting in chat.

Queue the open decision(s): follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, the thread root as the target, and the originating user request.

Then stop with a concise notification of where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`. The thread is left untouched except for that bundle: nothing has landed, nothing has merged, and no entry line was written.

A close stopped by a non-empty `.pending-decisions/` writes no bundle of its own. Name the bundles that are open and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `open pending decisions: <bundle names>`.

Re-invocation after either block is a plain re-run: this skill starts from `## Inputs` every time and carries nothing over.

## Writes

Once every check passes, run these in order, without asking further questions.

1. **Land the ADRs.** When the thread's `adr/` holds drafts, create `docs/adr/` if it is not there, and copy every file in `adr/` into it unaltered — the filename is the record's identifier, the project-layer copy becomes authoritative, and the thread copy becomes its immutable historical snapshot. For each landed record whose `supersedes` names project ADRs, move those named files into `docs/adr/superseded/` (created on demand) in the same act, content untouched.

2. **Merge the glossary.** When the thread holds a `glossary.md`, create `docs/glossary.md` if it is not there, and merge the thread's terms into it semantically, term by term, in the shape `<skill_path>/references/formats/glossary.md` defines: a term already present is updated to the thread's definition, and a new term is added under the section it fits. Then list the terms present before the merge and the terms present after, and confirm that no term present before is absent after; a term that went missing is restored before you go on.

3. **Update the roadmap entry.** When the seed frontmatter carries a `roadmap` mapping, insert `Closed: <thread path relative to .work/threads/> — <one-line outcome>` as the first line beneath the `roadmap.entry` heading in the index at `roadmap.path`, where the outcome is one line saying what the thread settled or delivered. Touch nothing else in the index.

4. **Append the closing event.** Follow `<skill_path>/references/instructions/append-log-line.md` to append `- (event) thread closed; ADRs: <adr result>; glossary: <glossary result>`. The ADR result is `landed` when step 1 landed at least one draft and `none` otherwise; the glossary result is `merged` when step 2 merged at least one term and `none` otherwise.

5. **Report.** State which records landed in `docs/adr/` and remain as snapshots in the thread, which files moved to `docs/adr/superseded/`, which terms merged into `docs/glossary.md`, which roadmap entry was updated, the closing event appended, and the names of any `.pending-decisions/`, `.pending-reviews/`, or run-state folders left in place. Recommend committing the result. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `Thread closed: <thread path relative to .work/threads/>`.

## Refusals

Refuse before any write, naming what is wrong and how to re-invoke, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`:

- A draft in `adr/` is structurally malformed — it has no frontmatter block, or its filename cannot be read as a record stem.
- A draft's stem already exists in `docs/adr/` or `docs/adr/superseded/`; re-invoke after resolving the duplicate record.
- The thread log already contains the closing event and the invocation does not explicitly say to proceed anyway.

## Write boundary

You write exactly these: the landed copies in `docs/adr/`, the superseded records moved into `docs/adr/superseded/`, the merged `docs/glossary.md`, one line beneath one entry heading of the roadmap index the seed names, and the closing event in this thread's `log.md`. Nothing else you touch is written, and no file of any other thread is written under any circumstance. You do not stage, commit, or push.
