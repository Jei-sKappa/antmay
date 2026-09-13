---
name: close-thread
description: Close a thread by landing its ADRs and glossary terms into the project layer.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Close Thread

Close one thread, end to end. You gather the thread's material, run every check before the first write, then land the thread's draft ADRs and glossary entries into the project layer and record the thread's outcome on the roadmap entry it answers. The thread folder stays in place: what marks the thread closed is that its drafts and its terms now live in the project layer. Once the checks pass, the writes run without questions. Writing the last record is where you stop — do not stage, commit, or push.

## Inputs

Gather all of these before running the checks; everything below works from what you gather here.

- `/consult-adrs` — read the project decisions the thread's drafts land beside; authoritative.
- `/consult-glossary` — write the project's fixed terms; authoritative.
- The thread to close — the folder the invocation names, laid out per `references/formats/thread.md`. Everything below is read inside it.
- The thread's `seed.md` — why the thread exists and what it set out to reach. Authoritative for intent. When it carries a `Roadmap:` line and an `Entry:` line, they name the roadmap index this thread was opened from and the slug of its entry.
- The thread's `spec.md`, when the thread holds one — the design claims the currency check reads. Authoritative.
- The thread's `adr/` — the draft records to land, in the shape `references/formats/adr.md` defines. Authoritative within the thread.
- The thread's `glossary.md`, when the thread holds one — the terms to merge into the project's, in the shape `references/formats/glossary.md` defines. Authoritative within the thread.
- Every `implementations/<folder>/report.md` the thread holds — what each implementation delivered, in the shape `references/formats/implementation-report.md` defines. Material: its `## Deviations` entries and the delivered changes it describes are what the currency check reads.
- The roadmap index named by the seed's `Roadmap:` line, when the seed carries one — a project-level file under `.wip/roadmaps/`, whose entry headings are described in `references/formats/roadmap-index.md`. Material: the heading whose text is the seed's `Entry:` slug is where the closing line goes.
- The contents of `.pending-decisions/`, `.pending-reviews/`, and every `implementations/<folder>/.runs/` — the thread's workspaces, inspected by listing what each holds. You need their names and whether they are empty, not their contents.

## Checks before any write

Run all four, in order, and all of them before the first write. They are reads; none of them changes anything.

1. **Currency check** — does the thread's design truth still match what the thread produced? Scale it to the material the thread holds:
   - **With implementations and a spec:** read each report's `## Deviations` entries and the delivered changes it describes against the spec's claims and the draft ADRs in `adr/`.
   - **With a spec and no implementations:** read the draft ADRs against the spec.
   - **With implementations and no spec:** read the reports and the delivered changes against the draft ADRs and the seed's intent.
   - **With neither a spec nor an implementation:** no divergence is possible and the check passes.

   The check is narrow: it reads recorded deviations and delivered changes, and it is not a review of the implementation at large. Do not open the code to audit it, and do not treat an unrecorded improvement as a divergence. A divergence you cannot settle from the thread's material goes to `## Blocked`.

2. **Landing preflight** — every draft in `adr/` is landable: each carries a `name` and a `description` in its frontmatter; every stem listed under `supersedes` resolves to a file in `docs/adr/`; and no draft contradicts a project ADR it does not supersede. What makes a contradiction intentional rather than an unnoticed conflict is the conflict rule `/consult-adrs` carries. An unresolved stem or an unnoticed conflict goes to `## Blocked`; a structurally malformed draft is a refusal, per `## Refusals`.

3. **Roadmap reference** — when the seed carries the `Roadmap:` and `Entry:` pair, the index file exists at the path the seed names and a heading whose text is the entry slug exists inside it. A missing file or a missing heading goes to `## Blocked`. When the seed carries no such pair, this check passes and no entry is written.

4. **Workspaces** — list `.pending-decisions/`, `.pending-reviews/`, and every `implementations/<folder>/.runs/`. A non-empty `.pending-decisions/` blocks the close: name its bundles and stop per `## Blocked`, unless the invocation says explicitly to close anyway, in which case the close proceeds and the bundles are named in the report. Non-empty `.pending-reviews/` folders and run-state folders never block: leave them in place and name them in the report.

## Blocked

This path is reachable only once the drafts are structurally sound — a malformed draft is a refusal (`## Refusals`), not this path. It applies to anything a check cannot settle from the thread's material: a divergence between what the thread designed and what it delivered, a `supersedes` stem that resolves to nothing, an unnoticed conflict between a draft and a project record, or a roadmap index or entry heading the seed names and the project layer does not hold. Do not invent the answer, do not close around the gap, and do not stall waiting in chat.

Queue the open decision(s) per `references/instructions/emit-pending-decisions.md`, naming yourself as the producer, the thread root as the target, the originating user request, and one point per open decision — each stating what the decision blocks, why you could not settle it from the gathered inputs, and the evidence you weighed.

Then stop with a concise notification of where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`. The thread is left untouched except for that bundle: nothing has landed, nothing has merged, and no entry line was written.

A close stopped by a non-empty `.pending-decisions/` writes no bundle of its own. Name the bundles that are open and end with `Outcome: BLOCKED — open pending decisions: <bundle names>`.

Re-invocation after either block is a plain re-run: this skill starts from `## Inputs` every time and carries nothing over.

## Writes

Once every check passes, run these in order, without asking further questions. Every one of them writes into the project layer or the roadmap index.

1. **Land the ADRs.** When the thread's `adr/` holds drafts, create `docs/adr/` if it is not there, and move every file in `adr/` into it unaltered, with `git mv` — the filename is the record's identifier and the content is not touched. For each landed record whose `supersedes` names project ADRs, move those named files into `docs/adr/superseded/` (created on demand) in the same act, content untouched.

2. **Merge the glossary.** When the thread holds a `glossary.md`, create `docs/glossary.md` if it is not there, and merge the thread's terms into it semantically, term by term, in the shape `references/formats/glossary.md` defines: a term already present is updated to the thread's definition, and a new term is added under the section it fits. Then list the terms present before the merge and the terms present after, and confirm that no term present before is absent after; a term that went missing is restored before you go on.

3. **Update the roadmap entry.** When the seed carries the `Roadmap:` and `Entry:` pair, insert `Closed: <thread path relative to .wip/threads/> — <one-line outcome>` as the first line beneath that entry's heading in the index, where the outcome is one line saying what the thread settled or delivered. Touch nothing else in the index.

4. **Report.** State which records landed in `docs/adr/`, which files moved to `docs/adr/superseded/`, which terms merged into `docs/glossary.md`, which roadmap entry was updated, and the names of any `.pending-decisions/`, `.pending-reviews/`, or run-state folders left in place. Recommend committing the result. End per `references/instructions/emit-terminal-outcome.md` with `Outcome: DONE — Thread closed: <thread path relative to .wip/threads/>`.

## Refusals

Refuse before any write, naming what is wrong and how to re-invoke, and end with `Outcome: REFUSED — <the reason and how to re-invoke>`:

- A draft in `adr/` is structurally malformed — it has no frontmatter block, or its filename cannot be read as a record stem.

## Write boundary

You write exactly these: the landed records in `docs/adr/`, the superseded records moved into `docs/adr/superseded/`, the merged `docs/glossary.md`, and one line beneath one entry heading of the roadmap index the seed names. Nothing else you touch is written, and no file of any other thread is written under any circumstance. You do not stage, commit, or push.
