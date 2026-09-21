### Task 12: Review skills and the thread-reference search

**Objective:** Fix the thread-reference search in one shared instruction, make `review-implementation` read the report's `## Acceptance` table and run that search over the delivered work, and align `review-code` with the new inputs.

**Input / context:** `spec.md` `## Skills whose roles change` (rows `review-implementation`, `review-code`), `### The implementation report` (a criterion without a row fails `review-implementation`), `### Landing` step 2 (the search over the repository outside `.work/`), `## Inferences` (the pattern: `.work/threads/` plus the closing thread's identifier), `## Constraints` (the search recipe is published for projects that want a hard gate; no hook enforces it). The log's decision on the search (the check belongs where the reading already happens; the pattern fixed in a shared instruction rather than improvised). Current bodies `suite/skills/review/review-implementation/SKILL.md`, `suite/skills/review/review-code/SKILL.md`; the report format from task 9; the `## Inputs` opening block and the citation instruction from task 3.

**Steps:**

1. Create `suite/shared/references/instructions/search-for-thread-references.md`, written to whoever performs it and naming no skill. Title `# Search for thread references`. One paragraph: find every place outside a thread that names a thread or one of its artifacts, so that nothing thread-local is read as a standing requirement. `## The pattern`: the fixed pattern is the literal path fragment `.work/threads/` and, when a thread is in hand, that thread's identifier (`yyyy/mm/dd-hhmm-slug`); the search is never widened or narrowed by improvisation. `## Over a repository`: the one-line recipe, run from the repository root over tracked files outside `.work/`:

```sh
git grep -n -e '.work/threads/' -- ':!.work'
```

   followed by a second invocation adding `-e '<thread identifier>'` when a thread is in hand. `## Over delivered work`: run the same pattern over the files a change touched — the diff, the files the report's `## Changes` names — including comments, test names and migrations; a hit is reported where the surrounding procedure reports findings. `## Rules`: every hit is reported, never silently accepted; the recipe writes nothing and changes no file; a project that wants a hard gate wires this same one-liner into its own tooling.
2. Edit `suite/skills/review/review-implementation/SKILL.md`: `## Inputs` — `change.md`, when the file exists (its acceptance checklist is the contract); `delta/`, when present (the constraint sources delivered work must not contradict); the report's `## Acceptance` table named as the claim under test for the acceptance category. `## The authority anchor`: `change.md` first, its acceptance checklist the contract; the thread's `delta/` applies on top as a binding constraint source; classify as `/consult-decisions` instructs. `## The report is the claim under test`: add that every row of `## Acceptance` is a claim — the quoted criterion must exist verbatim in the change document, the method must be one of the three, and the evidence must be checkable (the named test exists and exercises the behavior; the walked-through observation matches the code). `## What you judge` — **Acceptance**: every criterion of the change document has a row in the report's `## Acceptance` table and a corresponding change in the delivered work; a criterion without a row is a finding of severity `blocker`, and a row whose evidence the code does not bear out is a finding. Add a category **Citation**: follow `<skill_path>/references/instructions/search-for-thread-references.md` over the delivered code, comments, test names and migrations; each hit is a finding. `## Recording findings`: the category vocabulary gains `citation`; the read-only list names `change.md`, `delta/` and the project layer.
3. Edit `suite/skills/review/review-code/SKILL.md`: `## Inputs` — `change.md`, when the file exists; `delta/`, when present; `## The authority anchor` — `change.md` first, `delta/` on top, `/consult-decisions`; the read-only list names `change.md`, `delta/` and the project layer. Nothing else changes.
4. In `suite/shared/manifest.yaml`, add `instructions/search-for-thread-references.md` under `skills/review/review-implementation` and `skills/close/close-thread`, and `formats/change-document.md` under `skills/review/review-implementation` and `skills/review/review-code`.
5. Update `README.md`'s `review-implementation` entry to say it checks the report's acceptance table and searches the delivered work for thread references.
6. From `suite/`, run the sync script and both checks.

**Files modified:** `suite/shared/references/instructions/search-for-thread-references.md` (NEW), `suite/skills/review/review-implementation/SKILL.md`, `suite/skills/review/review-code/SKILL.md`, `suite/shared/manifest.yaml`, `README.md`, and the synced copies `suite/skills/review/review-implementation/references/instructions/search-for-thread-references.md` (NEW), `suite/skills/close/close-thread/references/instructions/search-for-thread-references.md` (NEW), `suite/skills/review/review-implementation/references/formats/change-document.md` (NEW), `suite/skills/review/review-code/references/formats/change-document.md` (NEW).

**Verification:**

```sh
test -f suite/shared/references/instructions/search-for-thread-references.md && grep -q "git grep -n -e '.work/threads/' -- ':!.work'" suite/shared/references/instructions/search-for-thread-references.md
grep -q 'search-for-thread-references.md' suite/skills/review/review-implementation/SKILL.md && grep -q '## Acceptance' suite/skills/review/review-implementation/SKILL.md && grep -q -i 'without a row' suite/skills/review/review-implementation/SKILL.md
grep -q 'citation' suite/skills/review/review-implementation/SKILL.md
for f in suite/skills/review/review-implementation/SKILL.md suite/skills/review/review-code/SKILL.md; do grep -q 'change.md' "$f" && grep -q 'delta/' "$f" || echo "inputs missing in $f"; ! grep -n -E 'spec\.md|`adr/`|thread ADR' "$f"; done
git grep -n -e '.work/threads/' -- ':!.work' >/dev/null; echo recipe-exit:$?   # 0 or 1 (hits or none), never 2
(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && node scripts/check-skill-text.mjs)
git diff --quiet fe83a4f -- cli/ && git diff --quiet fe83a4f -- docs/glossary.md
```

**Acceptance criteria:**

- One shared instruction fixes the thread-reference pattern and the one-line repository recipe, and names no skill.
- `review-implementation` reads the report's `## Acceptance` table for its acceptance category, reports a criterion without a row as a finding, and runs the thread-reference search over the delivered code, comments, test names and migrations with each hit a finding.
- `review-code` reads `change.md` and `delta/` in its inputs and anchor; both reviews stay read-only.
- The sync script and both suite checks exit 0; nothing under `cli/` or in `docs/glossary.md` differs from the baseline.

**Consumes:** the `## Acceptance` table shape in `formats/implementation-report.md` (task 9); `formats/change-document.md` (task 4); the `## Inputs` opening block and `instructions/read-and-cite-the-project-layer.md` (task 3).

**Produces:** `suite/shared/references/instructions/search-for-thread-references.md`, pointed at as `<skill_path>/references/instructions/search-for-thread-references.md` by `close-thread` (task 13); its one-line recipe `git grep -n -e '.work/threads/' -- ':!.work'`, published in `README.md` (task 14).
