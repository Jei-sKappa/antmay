# Task 3: Rename create-thread to allocate-thread and rewrite all primitive descriptions

**Objective:** Kill the `open-thread`/`create-thread` name collision and give all five remaining primitives the uniform exclusive-gate description.

**Input / context:** Settled decisions per `seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md` P8 (rename + verb-first convention) and P9 (description template). Task 2 has already removed `discussion-point`, so exactly five primitives remain. Callers of `create-thread`: `skills/workflow/capture-discussion/open-thread/SKILL.md` and `skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md`.

**Steps:**

1. `git mv skills/workflow/primitives/create-thread skills/workflow/primitives/allocate-thread` and change the frontmatter `name:` to `allocate-thread`. Update the body's self-references (title heading, any "route through /open-thread" prose stays as is — it names the entry point, which keeps its name).
2. Update every `/create-thread` prose invocation in the two callers to `/allocate-thread`.
3. Update the registries: in `.claude-plugin/marketplace.json` change the `JeisKappa-primitives` entry to `./skills/workflow/primitives/allocate-thread`; in `README.md` update the section heading, link path, and install snippet; in `.vscode/settings.json` replace the `create-thread` scope with `allocate-thread` keeping the array alphabetically sorted.
4. Rewrite the `description:` of all five primitives (`allocate-thread`, `append-roadmap-feedback`, `emit-pending-decisions`, `emit-pending-review`, `update-implementation-report`) per the P9 template:
   - Front gate always exactly "Use only when an invoking caller supplies …".
   - Inputs named collectively, not enumerated (e.g. "a complete caller-authorization block for a new thread"); the body keeps the field list and refusals.
   - The bounded side effect named in one clause — what it writes and nothing else.
   - A short negative gate only where misrouting is plausible: `emit-pending-decisions` gains "never for defects, observations, or report material — only genuine open human decisions". Judge the other four individually; do not sprinkle negatives by default.
5. Check each description is one sentence and materially shorter than its predecessor (the `allocate-thread` one in particular must lose the field enumeration).

**Files modified:** `skills/workflow/primitives/allocate-thread/` (RENAMED from `create-thread/`, `SKILL.md` edited), `skills/workflow/primitives/append-roadmap-feedback/SKILL.md`, `skills/workflow/primitives/emit-pending-decisions/SKILL.md`, `skills/workflow/primitives/emit-pending-review/SKILL.md`, `skills/workflow/primitives/update-implementation-report/SKILL.md`, `skills/workflow/capture-discussion/open-thread/SKILL.md`, `skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md`, `.claude-plugin/marketplace.json`, `README.md`, `.vscode/settings.json`

**Verification:** `grep -rn "create-thread" skills/ README.md .claude-plugin .vscode` returns nothing; `test -d skills/workflow/primitives/allocate-thread` succeeds; `grep -h "^description:" skills/workflow/primitives/*/SKILL.md` shows five lines, each beginning "Use only when an invoking caller supplies"; `grep -n "never for defects" skills/workflow/primitives/emit-pending-decisions/SKILL.md` matches.

**Acceptance criteria:**
- The primitive exists only as `allocate-thread`; folder name, frontmatter `name:`, callers, marketplace, README, and commit scopes all agree.
- All five primitive descriptions open with the exclusive gate, name inputs collectively, and name the side effect in one clause.
- `emit-pending-decisions` carries the negative gate.

**Consumes:** the five-primitive set left by Task 2 (discussion-point removed); the P8/P9 conventions written by Task 1.

**Produces:** the `/allocate-thread` name that later tasks and docs reference; final `description:` lines for all five primitives.
