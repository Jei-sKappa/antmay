### Task 8: Roadmap entry as the home of planned behavior

**Objective:** Make the roadmap entry the one home of behavior that is settled but not built, in the roadmap-index format and in the `roadmap` skill.

**Input / context:** `spec.md` `### The roadmap entry` (the `Planned behavior:` list after `Scope:`, statements in product-behavior form, rule 5 rewritten, rule 6's closing sentence, the index stays under `.work/roadmaps/`, release scope in `## Out of scope`), `### Admission rules for descriptions` (behavior not built has exactly one home), `## Skills whose roles change` (row `roadmap`). Thread glossary row **entry**. Current files `suite/shared/references/formats/roadmap-index.md`, `suite/skills/roadmap/roadmap/SKILL.md`; the product-behavior format from task 1. Starts from task 7's synced tree.

**Steps:**

1. Edit `suite/shared/references/formats/roadmap-index.md`. In `## Shape`, after each entry's `Scope:` line add a `Planned behavior:` block — the label on its own line followed by `- <statement>` bullets, one behavior statement per line, that the thread opened from the entry will build. In `## Rules`: add a rule that `Planned behavior:` lists the behavior the entry's thread will build, one present-tense statement per line written in the form a product behavior statement takes once built, and is the only home of behavior that is settled but not built; replace rule 5's closing sentence with: constraints that bind the threads opened from an entry are written in the entry, as planned behavior or as a decision the thread will record; rewrite rule 6's closing sentence to say the outcome lives in the code, the descriptions, the decision records and the threads; add that release scope lives in `## Out of scope` and dies with the index; keep the `Closed:` rule and the `.work/roadmaps/` path unchanged.
2. Rewrite `suite/skills/roadmap/roadmap/SKILL.md` where its role changes: `## Inputs` keeps the project-layer block, then `seed.md`, `change.md` when the file exists (the direction's change document), `delta/` when present (the direction's settled records and descriptions as drafted; they reach the project layer at close, so the index restates none of them, and what they leave unbuilt is what the entries carry as planned behavior); in `## Author the index`, the entries paragraph adds the `Planned behavior:` list after the `Scope:` line — the behavior the entry's thread will build, one statement per line in the product-behavior form; where the body cites decisions or descriptions, point at `<skill_path>/references/instructions/read-and-cite-the-project-layer.md`; `## Boundaries` names `change.md`, `delta/` and the whole project layer as read and never written; `## Report` recommends `close-thread` so the direction's delta lands before any entry is worked.
3. In `suite/shared/manifest.yaml`, add `formats/product-behavior.md` under `skills/roadmap/roadmap` (the form its planned-behavior statements take).
4. Update `README.md`'s `roadmap` entry to name planned behavior among what an entry carries.
5. From `suite/`, run the sync script and both checks.

**Files modified:** `suite/shared/references/formats/roadmap-index.md`, `suite/skills/roadmap/roadmap/SKILL.md`, `suite/shared/manifest.yaml`, `README.md`, and the synced copies `suite/skills/roadmap/roadmap/references/formats/roadmap-index.md`, `suite/skills/roadmap/roadmap/references/formats/product-behavior.md` (NEW), `suite/skills/capture-discussion/discussion/references/formats/roadmap-index.md`, `suite/skills/capture-discussion/open-thread/references/formats/roadmap-index.md`, `suite/skills/close/close-thread/references/formats/roadmap-index.md`.

**Verification:**

```sh
grep -q '^Planned behavior:' suite/shared/references/formats/roadmap-index.md && ! grep -q 'are ADRs' suite/shared/references/formats/roadmap-index.md
grep -q '\.work/roadmaps/<yymmddhhmm>-<slug>.md' suite/shared/references/formats/roadmap-index.md
grep -q 'Planned behavior' suite/skills/roadmap/roadmap/SKILL.md && grep -q 'read via `/consult-descriptions`' suite/skills/roadmap/roadmap/SKILL.md && grep -q 'read via `/consult-decisions`' suite/skills/roadmap/roadmap/SKILL.md
! grep -n -E 'spec\.md|`adr/`|thread.s `glossary.md`|docs/adr/` when this thread closes' suite/skills/roadmap/roadmap/SKILL.md
(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && node scripts/check-skill-text.mjs)
git diff --quiet fe83a4f -- cli/ && git diff --quiet fe83a4f -- docs/glossary.md
```

**Acceptance criteria:**

- `formats/roadmap-index.md` shows a `Planned behavior:` list in the entry shape, states it is the only home of settled-but-unbuilt behavior, no longer states that constraints binding threads are ADRs, and keeps the index at `.work/roadmaps/`.
- The `roadmap` skill writes planned behavior into entries and reads decisions and descriptions in its `## Inputs` in the fixed order.
- The sync script and both suite checks exit 0; nothing under `cli/` or in `docs/glossary.md` differs from the baseline.

**Consumes:** `formats/product-behavior.md` (task 1); the `## Inputs` opening block and `instructions/read-and-cite-the-project-layer.md` (task 3).

**Produces:** the `Planned behavior:` block in `formats/roadmap-index.md`, which `close-thread` (task 13) and the reference-project description (task 14) name.
