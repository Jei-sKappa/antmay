### Task 14: Reference-project descriptions

**Objective:** Adopt the model in this repository's own user-facing and descriptive documents: create the method's product behavior and the suite's architecture description, remove `docs/working-with-threads.md`, and cut `README.md` back to installation, the skill index, the project-layer overview with the search recipe, and the terminal-outcome protocol.

**Input / context:** `spec.md` `## This repository's adoption` (all bullets), `### Admission rules for descriptions` (built-only, not obvious from the code, one statement per bullet), `## Inferences` (`docs/product/method.md` as the overview's name; the search recipe published in the README's project-layer section), `## Constraints` (documents describe the current state, never the diff). The plan's choice for the architecture module file: `docs/architecture/suite.md`, admitted because how shared references are declared, mirrored and gated spans `suite/shared/manifest.yaml`, `suite/scripts/sync-shared-references.mjs`, every skill's `references/` folder and the two check scripts, which no single file makes readable. Formats from task 1 (`product-behavior.md`, `architecture-description.md`) as the shape of both new files; `suite/shared/references/formats/thread.md` (task 4) as what `method.md` cites for the thread shape; the recipe from task 12. Current files: `README.md` (intro paragraph, `## Threads and the project layer`, the skill entries tasks 2–13 already renamed), `docs/working-with-threads.md`, `CONTRIBUTING.md` (`## Working in the repository` points at `docs/working-with-threads.md`). The bootstrap note in the index: this task writes the two project-layer files directly.

**Steps:**

1. Create `docs/product/method.md` in the product-behavior shape: title `# The Antmay method`; `##` headings per area, one present-tense statement per bullet, each admitted only where the suite's files do not make it obvious. Cover: how the method works (a unit of work is a thread; intent is written before it is built; the change document is the thread's design; the delta is what a thread drafts for the project layer and lands at close; the thread stays as history); the project layer (each kind, its path, what it holds, who drafts and lands it, how it is cited — the table of the spec's `## The project layer` reduced to statements); how the skills relate and what each produces (open-thread/open-ticket, discussion, change, review-change, plan-brief/plan-strict/check-plan, implement/implement-plan/implement-plan-with-subagents, review-implementation/review-code, roadmap, resolve-pending-decisions, close-thread, and the two model-invoked skills), absorbing the "which skill to reach for" map of `docs/working-with-threads.md` as statements; how this repository runs on the suite (its threads under `.work/threads/`, its roadmaps, the dot-folder search note about `rg --hidden`); the thread shape cited as `suite/shared/references/formats/thread.md` rather than restated; the closing event. Write no bullet that describes behavior the suite does not yet have, and no sentence contrasting with the earlier design.
2. Create `docs/architecture/suite.md` in the architecture-description shape: title `# The skill suite`; areas such as the shared-reference mechanism (canonical sources under `suite/shared/references/`, the flat manifest mapping each skill to the sources it declares, the sync script mirroring them into each skill's `references/` as generated committed copies, hand-authored skill-local references alongside), distribution (the marketplace manifest's `skills` array is what makes a suite under `suite/` installable; the leaf folder name equals the frontmatter `name`), and the two mechanical gates; one statement per bullet, only what no single file makes obvious.
3. `git rm docs/working-with-threads.md`.
4. Rewrite `README.md` above `## Skills`: the intro paragraph describes the method in one paragraph without the artifact list (thread, change document, delta, project layer named; the spec's "the spec that is the work's design truth" sentence gone); `## Installation` unchanged; replace `## Threads and the project layer` with a shorter `## Threads and the project layer` overview: the thread folder tree from the thread format (`seed.md`, `log.md`, `change.md`, `delta/`, `plans/`, `implementations/`), the project layer's six kinds with their paths in one sentence each, that `close-thread` alone lands a thread's delta, and a `### Keeping thread references out of code` paragraph publishing the one-line recipe from `suite/shared/references/instructions/search-for-thread-references.md` (`git grep -n -e '.work/threads/' -- ':!.work'`) as the gate a project may wire into its own tooling; point at `docs/product/method.md` for the whole method. `## Terminal outcomes` unchanged except that `discussion` is the dialogue-driven example and the model-invoked skills are "the two below". `## Skills` and `## Model-invoked skills` keep the per-skill entries as tasks 2–13 left them; re-read every entry once for a stale `spec.md`, `adr/` or thread `glossary.md` and fix it. `## Contributing`: replace the pointer to `docs/working-with-threads.md` with `docs/product/method.md`.
5. In `CONTRIBUTING.md` `## Working in the repository`, replace the `docs/working-with-threads.md` sentence with one pointing at `docs/product/method.md` for how the repository carries its own work; nothing else changes.
6. Run the suite checks (no shared reference changed, so no sync is needed, but run the sync script anyway to prove it is a no-op).

**Files modified:** `docs/product/method.md` (NEW), `docs/architecture/suite.md` (NEW), `docs/working-with-threads.md` (DELETED), `README.md`, `CONTRIBUTING.md`.

**Verification:**

```sh
test -f docs/product/method.md && test -f docs/architecture/suite.md && ! test -e docs/working-with-threads.md
grep -q 'suite/shared/references/formats/thread.md' docs/product/method.md
grep -c '^- ' docs/product/method.md docs/architecture/suite.md   # statements, one per bullet
! grep -n -E 'no longer|anymore|used to|previously|unlike before' docs/product/method.md docs/architecture/suite.md README.md
! grep -rn 'working-with-threads' README.md CONTRIBUTING.md docs/ AGENTS.md suite/ .github/
grep -q "git grep -n -e '.work/threads/' -- ':!.work'" README.md
grep -q '^## Installation' README.md && grep -q '^## Terminal outcomes' README.md && grep -q '^## Skills' README.md && grep -q '^## Model-invoked skills' README.md
grep -q 'change.md' README.md && grep -q 'delta/' README.md && ! grep -n -E 'spec\.md|^adr/ |thread.s `adr/`|glossary.md        the terms' README.md
grep -q 'docs/product/method.md' README.md && grep -q 'docs/product/method.md' CONTRIBUTING.md
for f in docs/product/method.md docs/architecture/suite.md; do head -1 "$f" | grep -q '^# ' && grep -q '^## ' "$f" || echo "shape wrong in $f"; ! grep -q '^---$' "$f"; done
(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && node scripts/check-skill-text.mjs)
git diff --quiet fe83a4f -- cli/ && git diff --quiet fe83a4f -- docs/glossary.md
```

Read `docs/product/method.md` once against the admission rule: every bullet describes what the suite now does, none describes something a skill body already makes obvious on its own (a body's own write boundary, say), and none is planned behavior.

**Acceptance criteria:**

- `docs/product/method.md` exists, covers how the method works, how the skills relate and what each produces, cites the thread format rather than restating it, and follows the product-behavior shape.
- `docs/architecture/suite.md` exists in the architecture-description shape and describes only what no single file under `suite/` makes readable.
- `docs/working-with-threads.md` is gone and nothing in the repository points at it.
- `README.md` keeps installation, the skill index and the terminal-outcome protocol, and its project-layer section carries the one-line search recipe.
- The suite checks exit 0; nothing under `cli/` or in `docs/glossary.md` differs from the baseline.

**Consumes:** `formats/product-behavior.md` and `formats/architecture-description.md` (task 1); `formats/thread.md` (task 4); the recipe `git grep -n -e '.work/threads/' -- ':!.work'` (task 12); the renamed skill entries in `README.md` (tasks 2, 5, 6, 7, 8, 11, 12, 13).

**Produces:** `docs/product/method.md` and `docs/architecture/suite.md`, which task 15 names in the root `AGENTS.md` table and in `docs/documentation-rules.md`.
