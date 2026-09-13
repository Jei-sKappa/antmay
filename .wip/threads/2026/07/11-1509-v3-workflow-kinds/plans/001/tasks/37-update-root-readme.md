# Task 37: Update the root README

**Objective:** Rewrite the root `README.md` around the V3 model: a subject-neutral workflow table plus the final skill index distinguishing user-invoked skills from model-invoked primitives.

**Input / context:** The cutover spec `specs/001/spec.md` § "Derived repository files" and AC-12.2 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P17 (compact subject-neutral table describing only process shape), P48 (role distinction in the index), P15 (subject-neutrality). Spec Degrees of freedom #8 grants presentation details (table layout, grouping, snippet formatting) provided the table and the role distinction are present. Current file: `README.md` (364 lines, V2 spine/tier/ledger narrative — the workflow-model sections are replaced wholesale; the per-skill index format with `npx skills add Jei-sKappa/skills --skill <name>` snippets is the existing convention to keep).

**Steps:**

1. Replace the V2 narrative sections (Toolbox Model, Layered Workflow Map, Recommended Common Paths, Steering interactivity) with a V3 introduction and a compact workflow table: one row per workflow (Quick, Standard, Roadmap) linking directly to `docs/project/v3/workflows/<name>.md`, describing only process shape (when the process fits — e.g. smallest delivery path / full spec-driven path / direction-and-decomposition). No subject-based routing language (nothing maps bugs/features/docs to a workflow).
2. Rebuild the skill index to the final inventory (the 15 `skills/workflow/` groups), with each entry linking to the skill's `SKILL.md` at its new path, carrying its description and install snippet per the existing convention. Distinguish user-invoked skills from model-invoked primitives — e.g. a separate, clearly labelled Primitives section explaining that primitives are invoked by other skills or the model and are installed as dependencies of the suite.
3. Update the retired-skills section: add `seeded-discussion`, `record-verdict`, `review-lossless-mapping`; remove `plan-loose` from retired (it left `deprecated/`); no retired skill appears among the active entries.
4. Point workflow-methodology readers at `docs/project/v3/` as the canonical documentation; remove links into `docs/workflow/v2/` from the active narrative (V1/V2 docs remain on disk as history; the README simply stops presenting V2 as the active model).
5. Keep the badge, installation, and Raycast-extension sections, updated only where paths or names changed.

**Files modified:** `README.md`.

**Verification:**

```sh
grep -n 'docs/project/v3/workflows/quick.md' README.md
grep -n 'docs/project/v3/workflows/standard.md' README.md
grep -n 'docs/project/v3/workflows/roadmap.md' README.md
grep -nE 'primitive' README.md   # role distinction present
grep -n 'resolve-pending-decisions\|reconcile-spec\|plan-brief' README.md   # new skills indexed
grep -nE 'seeded-discussion|record-verdict|review-lossless-mapping' README.md   # only in the retired section (read hits)
grep -nwE 'tier|ledger' README.md   # expect no active-model narrative hits (read any)
# Every active skill indexed once:
for d in skills/workflow/*/*/; do n=$(basename $d); grep -q "skill $n" README.md || echo "MISSING SNIPPET: $n"; done
```

**Acceptance criteria:**

- The README contains a subject-neutral workflow table linking to the three `docs/project/v3/workflows/*.md` files and describing only process shape; user-invoked skills are distinguished from model-invoked primitives; no retired skill appears among active skills (spec AC-12.2).
- Every active skill (38) is indexed with a link to its new path and an install snippet; the retired list matches `skills/deprecated/` reality.
- No V2 spine/tier/ledger/lineage narrative remains in the active-model sections.

**Consumes:** the final inventory (Tasks 1–33); the workflow documents (Task 35).

**Produces:** the public V3 index of the repository.
