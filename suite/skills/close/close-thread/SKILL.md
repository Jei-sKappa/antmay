---
name: close-thread
description: Close a thread by landing its delta documents into the project layer.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Close Thread

Close one thread, end to end. You gather the thread's material, run every check before the first write, then land the thread's delta — every delta document under `delta/` — into the project layer, record the closing line on the roadmap entry the thread answers, append the closing event to the thread log, and leave the thread folder and its `delta/` in place. The closing event makes the completed operation detectable from that folder. Once the checks pass, the writes run without questions. Writing the closing event is where you stop — do not stage, commit, or push.

## Inputs

Gather all of these before running the checks; everything below works from what you gather here.

- The project's `AGENTS.md`, when the file exists — the project's standing guidance for agents working in it.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be used in everything you write, and the target of the thread's glossary delta document when it carries one.
- `docs/architecture/<module>.md` for each module the work touches, read via `/consult-descriptions` — how the system is structured now, and the targets of the thread's architecture delta documents.
- `docs/product/<capability>.md` for each capability the work touches, read via `/consult-descriptions` — what the product does now, and the targets of the thread's product delta documents.
- `docs/adr/` and `docs/pdr/`, read via `/consult-decisions` — the project decisions bearing on the thread, and the folders the thread's records land beside.
- The roadmap entry named by the seed frontmatter's `roadmap` mapping, when the seed carries one — the entry this thread answers: its sketch, its scope boundary and its planned behavior, found as the heading whose text is `roadmap.entry` in the index at `roadmap.path`, in the shape `<skill_path>/references/formats/roadmap-index.md` defines; that heading is where the closing line goes.
- The thread to close — the folder the invocation names, in the shape `<skill_path>/references/formats/thread.md` defines. Everything below is read inside it.
- The thread's `log.md` — the thread's memory and the place closure is recorded, in the shape `<skill_path>/references/formats/log-line.md` defines.
- The thread's `seed.md` — why the thread exists and what it set out to reach. When its frontmatter carries a `roadmap` mapping, `roadmap.path` and `roadmap.entry` name the roadmap index this thread was opened from and the slug of its entry.
- The thread's `change.md`, when the file exists — the change document, whose claims the currency check reads.
- The thread's `delta/`, when present — the delta to land: every delta document in the shape `<skill_path>/references/formats/delta-document.md` defines, each `create` under `delta/docs/adr/` or `delta/docs/pdr/` carrying a body in the shape `<skill_path>/references/formats/decision-record.md` defines.
- For every `edit` and `delete` delta document, its target file and that file's current blob hash from `git hash-object <target>` on the working tree — what the dry run reads the recorded `hash` and every quoted operation against.
- Every `implementations/<folder>/report.md` the thread holds — what each implementation delivered, in the shape `<skill_path>/references/formats/implementation-report.md` defines; its `## Deviations` entries and the delivered changes it describes are what the currency check reads.
- The contents of `.pending-decisions/`, `.pending-reviews/`, and every `implementations/<folder>/.runs/` — the thread's workspaces, inspected by listing what each holds. You need their names and whether they are empty, not their contents.

## Checks before any write

Run all six, in order, and all of them before the first write. They are reads; none of them changes anything.

1. **Prior closure** — when `log.md` already contains the closing event, refuse per `## Refusals` unless the invocation explicitly says to proceed anyway.

2. **Currency check** — does the thread's design truth still match what the thread produced? Read each report's `## Deviations` entries and the delivered changes it describes against the change document's claims and against the thread's delta documents. A deviation touching the target of a delta document blocks the close until the change document and that delta document are amended: stop per `## Blocked`, naming the deviation and the delta document whose target it touches. Scale the rest to the material the thread holds:
   - **With implementations and a change document:** read the reports against both the change document and the delta documents.
   - **With a change document and no implementations:** read the delta documents against the change document.
   - **With implementations and no change document:** read the reports and the delivered changes against the delta documents and the seed's intent.
   - **With neither a change document nor an implementation:** no divergence is possible and the check passes.

   The check is narrow: it reads recorded deviations and delivered changes, and it is not a review of the implementation at large. Do not open the code to audit it, and do not treat an unrecorded improvement as a divergence. A divergence you cannot settle from the thread's material goes to `## Blocked`.

3. **Thread-reference search** — follow `<skill_path>/references/instructions/search-for-thread-references.md` over the repository outside `.work/`, with this thread's identifier as the thread in hand. A hit is put to the user before anything is written: stop per `## Blocked`, naming each hit by file and line. When the search returns nothing, the check passes.

4. **Delta dry run** — walk every delta document under `delta/` and decide, without writing anything, whether it will land against the project layer as it stands:
   - a `create` whose target already exists stops the close for that file;
   - an `edit` or a `delete` whose recorded `hash` differs from the target's current blob hash stops the close for that file;
   - an `edit` operation whose quoted text is not found in the target stops the close for that file, unless the operation's new text is already present there, in which case the operation is already done and nothing is wrong;
   - a `create` under `delta/docs/adr/` or `delta/docs/pdr/` whose frontmatter names `supersedes` resolves every stem it names to a file in the folder it lands in, and contradicts no project record it does not supersede; whether a contradiction is intentional or an unnoticed conflict is classified as `/consult-decisions` instructs. An unresolved stem or an unnoticed conflict stops the close for that file.

   Every stop goes to `## Blocked`, naming the file and the mismatch, with nothing written for it. A delta document that is structurally malformed is a refusal, per `## Refusals`, not this path.

5. **Roadmap reference** — when the seed frontmatter carries a `roadmap` mapping, the index file exists at `roadmap.path` and a heading whose text is `roadmap.entry` exists inside it. A missing file or a missing heading goes to `## Blocked`. When the seed carries no such mapping, this check passes and no entry line is written.

6. **Workspaces** — list `.pending-decisions/`, `.pending-reviews/`, and every `implementations/<folder>/.runs/`. A non-empty `.pending-decisions/` blocks the close: name its bundles and stop per `## Blocked`, unless the invocation says explicitly to close anyway, in which case the close proceeds and the bundles are named in the report. Non-empty `.pending-reviews/` folders and run-state folders never block: leave them in place and name them in the report.

## Blocked

This path is reachable only once the delta documents are structurally sound — a malformed delta document is a refusal (`## Refusals`), not this path. It applies to anything a check cannot settle from the thread's material: a divergence between what the thread designed and what it delivered, a hit from the thread-reference search, a recorded `hash` that no longer matches its target, an operation whose quoted text is not in the target, a `create` whose target already exists, a `supersedes` stem that resolves to nothing, an unnoticed conflict between a record about to land and a project record, or a roadmap index or entry heading the seed names and the project layer does not hold. Do not invent the answer, do not close around the gap, and do not stall waiting in chat.

Queue the open decision(s): follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, the thread root as the target, and the originating user request. Name each blocking file and what about it did not match, so the user can decide per file.

Then stop with a concise notification of where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`. The thread is left untouched except for that bundle: nothing has landed, and no entry line was written.

A close stopped by a non-empty `.pending-decisions/` writes no bundle of its own. Name the bundles that are open and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `open pending decisions: <bundle names>`.

Re-invocation after either block is a plain re-run: this skill starts from `## Inputs` every time and carries nothing over.

## Writes

Once every check passes, run these in order, without asking further questions.

1. **Land each delta document.** Apply the thread's delta to the project layer, one delta document at a time, creating the folders a target needs on the way. A `create` writes its whole body to the target path. An `edit` applies its operations against the target in document order, each one matched literally after line ends and trailing spaces are normalised, and an operation whose new text is already present in the target is treated as done and changes nothing. A `delete` removes the target.

2. **Supersede.** For each landed `create` under `docs/adr/` or `docs/pdr/` whose frontmatter names `supersedes`, move every record it names into that folder's `superseded/`, created on demand, content untouched.

3. **Update the roadmap entry.** When the seed frontmatter carries a `roadmap` mapping, insert `Closed: <thread path relative to .work/threads/> — <one-line outcome>` as the first line beneath the `roadmap.entry` heading in the index at `roadmap.path`, where the outcome is one line saying what the thread settled or delivered. Touch nothing else in the index.

4. **Append the closing event.** Follow `<skill_path>/references/instructions/append-log-line.md` to append `- (event) thread closed; delta: <landed|none>`. The value is `landed` when step 1 applied at least one delta document, and `none` otherwise.

5. **Report.** State which project-layer files the delta wrote, which records moved into a `superseded/` folder, which roadmap entry was updated, that the closing event was appended, and the names of any `.pending-decisions/`, `.pending-reviews/`, or run-state folders left in place — together with the thread's `delta/`, which stays where it is as the historical snapshot of what landed. Recommend committing the result. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `Thread closed: <thread path relative to .work/threads/>`.

## Refusals

Refuse before any write, naming what is wrong and how to re-invoke, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`:

- A delta document carries no frontmatter block.
- A delta document's `type` is something other than `create`, `edit` or `delete`.
- An `edit` or a `delete` delta document carries no `hash`.
- A delta document's path under `delta/` does not mirror a project-layer path, so it names no target.
- An `edit` delta document carries an operation that is not literal text — an instruction to make a change rather than the text to add, replace or remove.
- A `create` under `delta/docs/adr/` or `delta/docs/pdr/` whose stem already exists in that folder's `superseded/`; re-invoke after resolving the duplicate record. A stem present in the folder itself is an existing target, which the dry run stops on and puts to the user.
- The thread log already contains the closing event and the invocation does not explicitly say to proceed anyway.

## Write boundary

You write exactly these: the project-layer files the thread's delta documents target — under `docs/adr/`, `docs/pdr/`, `docs/product/`, `docs/architecture/`, and `docs/glossary.md` — the records moved into a `superseded/` folder beside them, one `Closed:` line beneath one entry heading of the roadmap index the seed names, and the closing event in this thread's `log.md`. Nothing else you touch is written, and no file of any other thread is written under any circumstance. The thread's `delta/` stays in place as its historical snapshot. You do not stage, commit, or push.
