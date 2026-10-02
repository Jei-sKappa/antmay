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
- `docs/adr/` and `docs/pdr/`, read via `/consult-decisions` — the project decisions bearing on the thread, and the folders the thread's records land beside.
- Every agents file in the project, in the shape `<skill_path>/references/formats/agents-file.md` defines, listed with `git ls-files --cached --others --exclude-standard -- ':(glob)**/AGENTS.md' ':(glob)**/CLAUDE.md' ':(exclude).work'`; a `CLAUDE.md` that is a symlink (`test -L`) is counted once, with the file it links to. The project's `AGENTS.md` is still read as standing guidance, but the budget check and the passage check read no agents file whole: each is what the budget check counts and what the passage check searches.
- The roadmap entry named by the seed frontmatter's `roadmap` mapping, when the seed carries one — the entry this thread answers: its sketch, its scope boundary and its planned behavior, found as the heading whose text is `roadmap.entry` in the index at `roadmap.path`, in the shape `<skill_path>/references/formats/roadmap-index.md` defines; that heading is where the closing line goes.
- The thread to close — the folder the invocation names, in the shape `<skill_path>/references/formats/thread.md` defines. Everything below is read inside it.
- The thread's `log.md` — the thread's memory and the place closure is recorded, in the shape `<skill_path>/references/formats/log-line.md` defines.
- The thread's `seed.md` — why the thread exists and what it set out to reach. When its frontmatter carries a `roadmap` mapping, `roadmap.path` and `roadmap.entry` name the roadmap index this thread was opened from and the slug of its entry.
- The thread's `spec.md`, when the file exists — the spec, whose claims the currency check reads.
- The thread's `delta/`, when present — the delta to land: every delta document in the shape `<skill_path>/references/formats/delta-document.md` defines, each `create` under `delta/docs/adr/` or `delta/docs/pdr/` carrying a body in the shape `<skill_path>/references/formats/decision-record.md` defines, and each delta document whose target is an agents file carrying content in the shape `<skill_path>/references/formats/agents-file.md` defines. The scripts the checks run read every target themselves.
- Every `implementations/<folder>/report.md` the thread holds — what each implementation delivered, in the shape `<skill_path>/references/formats/implementation-report.md` defines; its `## Deviations` entries and the delivered changes it describes are what the currency check reads.
- The contents of `.pending-decisions/`, `.pending-reviews/`, and every `implementations/<folder>/.runs/` — the thread's workspaces, inspected by listing what each holds. You need their names and whether they are empty, not their contents.

Any other thread is history: it records how its own work was understood at the time, not what holds now, so do not read it unless the user or this thread's seed names it.

## Checks before any write

Run all eight, in order, and all of them before the first write. They are reads; none of them changes anything.

1. **Prior closure** — when `log.md` already contains the closing event, refuse per `## Refusals` unless the invocation explicitly says to proceed anyway.

2. **Currency check** — does the thread's design truth still match what the thread produced? Read each report's `## Deviations` entries and the delivered changes it describes against the spec's claims and against the thread's delta documents. A deviation touching the target of a delta document blocks the close until the spec and that delta document are amended: stop per `## Blocked`, naming the deviation and the delta document whose target it touches. Scale the rest to the material the thread holds:
   - **With implementations and a spec:** read the reports against both the spec and the delta documents.
   - **With a spec and no implementations:** read the delta documents against the spec.
   - **With implementations and no spec:** read the reports and the delivered changes against the delta documents and the seed's intent.
   - **With neither a spec nor an implementation:** no divergence is possible and the check passes.

   The check is narrow: it reads recorded deviations and delivered changes, and it is not a review of the implementation at large. Do not open the code to audit it, and do not treat an unrecorded improvement as a divergence. A divergence you cannot settle from the thread's material goes to `## Blocked`.

3. **Thread-reference search** — follow `<skill_path>/references/instructions/search-for-thread-references.md` over the repository outside `.work/`. A hit is put to the user before anything is written: stop per `## Blocked`, naming each hit by file and line. When the search returns nothing, the check passes.

4. **Delta dry run** — run `node <skill_path>/references/scripts/check-delta.mjs <thread root>` from the project root. It decides, without writing anything, whether every delta document under `delta/` lands against the project layer as it stands. It exits 0 on a clean delta, 1 on any failure, and 2 on a usage error; each failure line starts `malformed:` or `conflict:` and names the document and, where it applies, the edit. Every `conflict:` line stops the close for that file. A conflict is one of four cases:
   - a `create` whose target already exists;
   - an `edit` or a `delete` whose target is missing;
   - an edit that is not already done whose `old_string` does not occur in the target;
   - an edit that is not already done whose `old_string` occurs more than once and that does not set `replace_all`.

   Beyond the script, a `create` under `delta/docs/adr/` or `delta/docs/pdr/` whose frontmatter names `supersedes` resolves every stem it names to a file in the folder it lands in, and contradicts no project record it does not supersede; whether a contradiction is intentional or an unnoticed conflict is classified as `/consult-decisions` instructs. An unresolved stem or an unnoticed conflict stops the close for that file.

   Every stop goes to `## Blocked`, naming the delta document and the mismatch, with nothing written for it. Every `malformed:` line is a refusal, per `## Refusals`, not this path.

5. **Agents-file budget** — for each agents file a delta document targets, take its word counts before and after the landing from the check-4 report of `<skill_path>/references/scripts/check-delta.mjs`, without reading the file. Each such file has a `words <target>: <before> -> <after>` line, counted as `wc -w` counts:
   - a `create` counts zero before;
   - a `delete` counts zero after and is never over budget;
   - a `CLAUDE.md` that is a symlink is counted once, with the file it links to.

   When a file's after count is over 1,000 and greater than its before count, refuse per `## Refusals`, naming the file and both counts.

6. **Agents-file passages** — does every agents file still say something true once the thread's work stands? First list what the thread changed, outside `.work/`:
   - take the base commit as `git log --diff-filter=A --format=%H -- <thread>/seed.md | tail -n 1`;
   - collect `git diff --name-status -M <base>^ -- . ':(exclude).work'`, which covers the thread's commits and the working tree together; when the seed has no commit, collect `git diff --name-status -M HEAD -- . ':(exclude).work'` instead;
   - add the untracked files from `git ls-files --others --exclude-standard -- . ':(exclude).work'`, and the target of every delta document, whatever its type;
   - the list holds the paths removed, both sides of each rename, and the paths added or modified, and, as a touched folder, each folder a listed path sits in directly. A folder counts as removed when no file under it remains.

   Search each agents file for mentions with `grep -n -F`: every listed path and touched folder, both repo-relative and relative to that agents file's folder, and the last segment of every removed or renamed path and every removed folder. Read each agents file a delta document changes as it will stand after landing, from `node <skill_path>/references/scripts/check-delta.mjs <thread root> --landed <agents file>`, and search and judge the matching passages in that output, the text the delta adds included. An agents file the delta deletes has no passages to judge. Read only the matching passages — the paragraph, list item or table row around each hit.

   Judge in natural language whether the thread's work made each passage false, and refuse per `## Refusals` on every false passage, quoting it together with the change that falsified it. Make no finding about a passage that mentions nothing the thread changed, and propose no addition to any agents file: new content reaches an agents file only through a discussion's closing offer.

7. **Roadmap reference** — when the seed frontmatter carries a `roadmap` mapping, the index file exists at `roadmap.path` and a heading whose text is `roadmap.entry` exists inside it. A missing file or a missing heading goes to `## Blocked`. When the seed carries no such mapping, this check passes and no entry line is written.

8. **Workspaces** — list `.pending-decisions/`, `.pending-reviews/`, and every `implementations/<folder>/.runs/`. A non-empty `.pending-decisions/` blocks the close: name its bundles and stop per `## Blocked`, unless the invocation says explicitly to close anyway, in which case the close proceeds and the bundles are named in the report. Non-empty `.pending-reviews/` folders and run-state folders never block: leave them in place and name them in the report.

## Blocked

This path is reachable only once the delta documents are structurally sound — a malformed delta document is a refusal (`## Refusals`), not this path. It applies to anything a check cannot settle from the thread's material: a divergence between what the thread designed and what it delivered, a hit from the thread-reference search, a conflict `check-delta.mjs` reports, a `supersedes` stem that resolves to nothing, an unnoticed conflict between a record about to land and a project record, or a roadmap index or entry heading the seed names and the project layer does not hold. Do not invent the answer, do not close around the gap, and do not stall waiting in chat.

Queue the open decision(s): follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, the thread root as the target, and the originating user request. Name each blocking file and what about it did not match, so the user can decide per file.

Then stop with a concise notification of where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`. The thread is left untouched except for that bundle: nothing has landed, and no entry line was written.

A failure of `apply-delta.mjs` at Writes step 1, after every check passed, is an operational defect of the run: the script writes nothing on any failure, so nothing has been written. Write no bundle; stop and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and the script's report as the diagnosis.

A close stopped by a non-empty `.pending-decisions/` writes no bundle of its own. Name the bundles that are open and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `open pending decisions: <bundle names>`.

Re-invocation after any block is a plain re-run: this skill starts from `## Inputs` every time and carries nothing over.

## Writes

Once every check passes, run these in order, without asking further questions.

1. **Land each delta document.** Run `node <skill_path>/references/scripts/apply-delta.mjs <thread root>` from the project root. It re-runs the whole check and, all or nothing, writes every `create`, creating the folders a target needs, writes every edited target, and removes every deleted target. Its `wrote <target>` and `removed <target>` lines name the files step 5's report names. On a non-zero exit, stop per `## Blocked`, as a landing failure.

2. **Supersede.** For each landed `create` under `docs/adr/` or `docs/pdr/` whose frontmatter names `supersedes`, move every record it names into that folder's `superseded/`, created on demand, content untouched.

3. **Update the roadmap entry.** When the seed frontmatter carries a `roadmap` mapping, insert `Closed: <thread path relative to .work/threads/> — <one-line outcome>` as the first line beneath the `roadmap.entry` heading in the index at `roadmap.path`, where the outcome is one line saying what the thread settled or delivered. Touch nothing else in the index.

4. **Append the closing event.** Follow `<skill_path>/references/instructions/append-log-line.md` to append `- (event) thread closed; delta: <landed|none>`. The value is `landed` when step 1 wrote or removed at least one file, and `none` otherwise.

5. **Report.** State which project-layer files the delta wrote, which records moved into a `superseded/` folder, which roadmap entry was updated, that the closing event was appended, and the names of any `.pending-decisions/`, `.pending-reviews/`, or run-state folders left in place — together with the thread's `delta/`, which stays where it is as the historical snapshot of what landed. Recommend committing the result. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `Thread closed: <thread path relative to .work/threads/>`.

## Refusals

Refuse before any write, naming what is wrong and how to re-invoke, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`:

- A delta document `check-delta.mjs` reports as malformed, its path under `delta/` mirroring no project-layer path included. Name each `malformed:` line; re-invoke once `spec` has redrafted the document.
- A `create` under `delta/docs/adr/` or `delta/docs/pdr/` whose stem already exists in that folder's `superseded/`; re-invoke after resolving the duplicate record. A stem present in the folder itself is an existing target, which the dry run stops on and puts to the user.
- An agents file the landing changes would end over 1,000 words and longer than it was. Name the file with both counts; re-invoke once an `edit` delta document for that file, drafted through `spec` from an accepted `document` entry, brings it within budget or no longer than it was.
- An agents-file passage the thread's work made false. Quote each such passage with the change that falsified it; re-invoke once an `edit` delta document for that agents file, drafted through `spec` from an accepted `document` entry, corrects it.
- The thread log already contains the closing event and the invocation does not explicitly say to proceed anyway.

## Write boundary

You write exactly these: the project-layer files the thread's delta documents target — under `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, and every agents file — the records moved into a `superseded/` folder beside them, one `Closed:` line beneath one entry heading of the roadmap index the seed names, and the closing event in this thread's `log.md`. Nothing else you touch is written, and no file of any other thread is written under any circumstance. The thread's `delta/` stays in place as its historical snapshot. You do not stage, commit, or push.
