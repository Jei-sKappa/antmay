### Task 13: Create `close-thread`

**Objective:** Add the completion-oriented closing skill that checks a thread, lands its ADRs, merges its glossary, updates its roadmap entry, appends the closing event, archives the thread, and reports.

**Input / context:** Starts from task 12. `spec.md` `### The closing skill` (the whole section is this task's contract), `### The project layer`, `### Roadmap` (entry outcome line), `### Thread layout`; decisions.md DR5, DR7, DR9, DR10, DR18, DR21, DR27. Name and group fixed in `plan.md`: `close-thread` at `suite/skills/finish-navigate/close-thread/`, an entry point, version `0.1.0`, `display_name: Close Thread`, `policy.allow_implicit_invocation: false`. The closing line beneath a roadmap entry heading is `Closed: <archive folder name> — <one-line outcome>`. Seed lines are `Roadmap:` and `Entry:` (task 3). Reports are `implementations/*/report.md` with `## Deviations` (task 9). Registration checklist as in task 8 (`marketplace.json` entry `./skills/finish-navigate/close-thread`, a `README.md` subsection under `### Finish & Navigate`, the `close-thread` scope, a manifest entry). `suite/AGENTS.md` is updated in task 16.

**Steps:**

1. Create `suite/skills/finish-navigate/close-thread/SKILL.md`. Description: close the active thread by checking it, landing its draft ADRs and glossary entries into the project layer, updating its roadmap entry, and archiving it.
2. `## Inputs`: the two fixed leading items (the catalog is also what every `supersedes` stem is resolved against); `seed.md` (intent; `Roadmap:` and `Entry:` lines when present); `spec.md` when present (the design claims the currency check reads); the thread's `adr/` (the drafts to land) and `glossary.md` (the terms to merge); every `implementations/*/report.md` (its `## Deviations` and the delivered changes it describes are the currency check's inputs); the roadmap index the seed names (the entry heading must exist); the contents of `.pending-decisions/`, `.pending-reviews/`, and `implementations/*/.runs/` (workspaces, inspected by listing).
3. `## Checks before any write`, in order and all before the first write: (1) **Currency check**, scaled to the material: with implementations and a spec, each report's `## Deviations` and the delivered changes against the spec's claims and the draft ADRs; with a spec and no implementations, the draft ADRs against the spec; with implementations and no spec, the reports and delivered changes against the draft ADRs and the seed's intent; with neither, no divergence is possible. The check reads recorded deviations and delivered changes and is not a review of the implementation at large. (2) **Landing preflight**: every draft carries `name` and `description`; every `supersedes` stem resolves to a file in `docs/adr/`; no draft contradicts a project ADR it does not supersede (per the conflict rule in `references/formats/adr.md`). (3) **Roadmap reference**: when the seed names an index and entry, the file exists and a heading with that slug exists. (4) **Workspaces**: a non-empty `.pending-decisions/` blocks, naming the bundles, unless the invocation says explicitly to archive anyway; non-empty `.pending-reviews/` and `.runs/` folders are named in the report and travel untouched.
4. `## Blocked`: anything a check cannot settle from the thread's material is handed to `/emit-pending-decisions` (producer `/close-thread`, target the thread root, the originating request, the points), the run ends `Outcome: BLOCKED — pending decisions at <bundle path>` with the thread untouched except the bundle; a non-empty `.pending-decisions/` ends `Outcome: BLOCKED — open pending decisions: <bundle names>`. Re-invocation is a plain re-run.
5. `## Writes`, run without questions once every check passes, in order: (1) ADR landing: create `docs/adr/` on demand; move every file in `adr/` into it unaltered (`git mv`); for each landed record whose `supersedes` names project ADRs, move those files into `docs/adr/superseded/` (create on demand), content untouched, in the same act. (2) Glossary merge: create `docs/glossary.md` on demand; merge the thread's `glossary.md` semantically: a term already present is updated to the thread's definition, a new term is added in the fitting section; then list the terms present before and after and confirm no term present before is absent after. (3) Roadmap entry: when the seed names an entry, insert `Closed: <archive folder name> — <one-line outcome>` as the first line beneath that entry's heading in the index. (4) Log event: append one `event` line to `log.md` with a single-line shell append (`>>`) per `references/formats/log-line.md` stating the thread closed, never opening `log.md` with a file-editing tool. (5) Archive: `mkdir -p docs/threads/archive` and `git mv` the thread folder to `docs/threads/archive/<same folder name>`, workspaces carried untouched. (6) Report: what landed, what moved to `superseded/`, what merged, which entry was updated, the named workspaces, and a recommendation to commit; end `Outcome: DONE — Thread archived: docs/threads/archive/<folder>/`.
6. `## Refusals`: `Outcome: REFUSED — …` when no thread resolves, several are ambiguous, or a draft ADR is structurally malformed (no frontmatter, unreadable name). The skill does not stage, commit, or push. Write boundary: `docs/adr/`, `docs/adr/superseded/`, `docs/glossary.md`, one line under one entry of the named roadmap index, one `log.md` line, and the archive move; nothing in any other thread.
7. Create `agents/openai.yaml`. Add `skills/finish-navigate/close-thread: [formats/adr.md, formats/log-line.md, formats/roadmap-index.md, formats/implementation-report.md]` to `suite/shared/manifest.yaml` and run the sync script. Register in `marketplace.json`, the root `README.md` (`#### close-thread` under `### Finish & Navigate`), and `conventionalCommits.scopes`.
8. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/finish-navigate/close-thread/SKILL.md` (NEW), `suite/skills/finish-navigate/close-thread/agents/openai.yaml` (NEW), `suite/skills/finish-navigate/close-thread/references/formats/adr.md` (NEW, generated), `suite/skills/finish-navigate/close-thread/references/formats/log-line.md` (NEW, generated), `suite/skills/finish-navigate/close-thread/references/formats/roadmap-index.md` (NEW, generated), `suite/skills/finish-navigate/close-thread/references/formats/implementation-report.md` (NEW, generated), `suite/shared/manifest.yaml`, `.claude-plugin/marketplace.json`, `README.md`, `.vscode/settings.json`

**Verification:**

```sh
C=suite/skills/finish-navigate/close-thread/SKILL.md
grep -n "^name: close-thread\|^disable-model-invocation: true\|version: 0.1.0" $C
grep -in "currency" $C; grep -in "landing preflight\|landing" $C; grep -in "roadmap reference\|entry" $C; grep -in "workspace" $C   # the four checks
grep -in "before any write\|before its first write\|before the first write" $C
grep -in "untouched except" $C
grep -in "with a spec and no implementations\|implementations and no spec\|with neither" $C   # the material combinations
grep -n "docs/adr/superseded/" $C; grep -in "unaltered\|content untouched" $C
grep -in "absent after\|no term present before" $C
grep -in "archive anyway" $C; grep -n "docs/threads/archive/" $C
grep -n "Closed: " $C
grep -n "(event)\|event" $C; grep -n ">>" $C; grep -in "editing tool\|file-editing" $C
grep -n "Outcome: DONE\|Outcome: BLOCKED\|Outcome: REFUSED" $C
grep -in "stage, commit, or push\|commit" $C
grep -c "decisions.md\|DR<N>\|implementation-report.md\|archive-thread" $C   # 0
grep -n "close-thread" .claude-plugin/marketplace.json .vscode/settings.json README.md suite/shared/manifest.yaml
(cd suite && node scripts/check-marketplace-skills.mjs)
```

**Acceptance criteria:**

- The body runs the four checks before any write and states that a blocked run leaves the thread untouched except for the bundle (AC-8.1); the currency check covers all four material combinations, names the deviations sections and delivered changes as inputs, and does not require `spec.md` (AC-8.2).
- ADRs move unaltered into `docs/adr/` and superseded records into `docs/adr/superseded/` untouched (AC-8.3); the glossary loss check is stated (AC-8.4); pending-decision blocking, workspace naming, and untouched archival are stated (AC-8.5); the entry line is written beneath the heading and no other thread is written (AC-8.6); the three terminal outcomes and the no-commit rule are stated (AC-8.7).
- The skill is registered everywhere task 8 registered `check-plan` (AC-13.1).

**Consumes:** `references/formats/adr.md`, `references/formats/log-line.md`, `references/formats/roadmap-index.md`, `references/formats/implementation-report.md` (task 2); seed `Roadmap:` / `Entry:` lines (task 3); `implementations/*/report.md` with `## Deviations` (task 9); the index heading form (task 12).

**Produces:** the skill name `close-thread`, which `finish`, `whats-next`, the recipes (task 14), `suite/method.md` (task 15), and the root documents (task 16) name.
