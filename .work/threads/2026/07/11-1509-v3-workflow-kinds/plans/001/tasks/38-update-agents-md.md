# Task 38: Update AGENTS.md

**Objective:** Update `AGENTS.md` (symlinked as `CLAUDE.md`) to document the decided V3 repository state while keeping V1 and V2 as grandfathered pointer sections.

**Input / context:** The cutover spec `specs/001/spec.md` § "Derived repository files" and AC-12.3 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P14 (V1/V2 pointer sections and canonical docs remain intact; V2 joins V1 as grandfathered), P48 (metadata pair + synchronization requirement), P29/P55 (composition rules replace the V2 self-containment prohibition), P64 (authoring rule for shared references), P51 (repo-wide derived updates). Current file: `AGENTS.md` at the repo root. This is the repository's own agent instruction file — repo-internal concepts (V2/V3 labels, pointers, thread conventions) BELONG here; the skill-body hygiene rules do not apply to this file.

**Steps:**

1. Update the **Layout** section to the final tree: `skills/workflow/` with its 15 groups (including `roadmap/`, `reconcile/`, `primitives/`) and their skills, and the seven-skill `skills/deprecated/` list; add `shared/` (canonical shared references + manifest) and `scripts/sync-shared-references.mjs` to the layout description.
2. Replace the **Skill self-containment** section with the V3 composition rules: user-invoked entry points may invoke model-invoked primitives via `/skill-name` prose; primitives never invoke entry points; no dependency cycles; a skill never reads another skill's `references/` — invocation is the only permitted cross-skill coupling; the suite is designed and tested as a coherently installed set (a missing invoked skill is an installation error). Keep the still-valid authoring guidance (description discipline, no repo-internal leakage into bodies).
3. Add the **invocation-role metadata** rules: every user-invoked skill carries `disable-model-invocation: true` in `SKILL.md` AND `agents/openai.yaml` with `policy.allow_implicit_invocation: false`; the two must never diverge; primitives omit both and open their descriptions with a bounded precondition.
4. Add the **shared-reference authoring rule**: canonical shared files live in `shared/references/` and are declared in `shared/manifest.yaml`; edit the canonical source and run `node scripts/sync-shared-references.mjs`; NEVER hand-edit any `references/shared/` folder — it is generated and committed.
5. Update **When adding a new skill** to the V3 groups (including `primitives/` with its extraction bar), the metadata pair, the marketplace plugin mapping, and the `.vscode` scopes step; keep the marketplace ordering rule (alphabetical, deprecated last).
6. Add a **V3 Workflow Conventions** pointer section: `docs/project/v3/` is the active ruleset for all newly opened threads; like the existing V1/V2 sections it is a POINTER that does not duplicate the rules. Rewrite the **V2 Workflow Conventions** section into a grandfathered pointer (mirroring the V1 section's shape): V2 applies to pre-V3 threads only — never edited, never migrated, never mixed with V3. Leave the V1 section intact.
7. Keep intact: the update rule, repository purpose, `SKILL.md` format section (adjusted to mention the invocation-role keys), deliverable-skills no-preamble rule, commit conventions, and the Raycast extension section (unchanged — its generator and manifest rules still hold).

**Files modified:** `AGENTS.md`.

**Verification:**

```sh
grep -n 'docs/project/v3' AGENTS.md
grep -n 'allow_implicit_invocation' AGENTS.md
grep -n 'sync-shared-references' AGENTS.md
grep -n 'references/shared' AGENTS.md
grep -nE 'primitives/' AGENTS.md
grep -n 'V1 Workflow Conventions' AGENTS.md && grep -n 'V2 Workflow Conventions' AGENTS.md   # both pointer sections retained
grep -n 'never read another skill' AGENTS.md   # or equivalent composition phrasing (read)
```

**Acceptance criteria:**

- `AGENTS.md` documents: the new layout; `docs/project/v3/` as the active ruleset for new threads with V1 and V2 both grandfathered (V1/V2 pointer sections retained); the P48 metadata pair and its synchronization requirement; the composition rules replacing the V2 self-containment prohibition; the shared-reference authoring rule; and "when adding a new skill" steps matching the new groups and metadata (spec AC-12.3).
- The deliverable-skills no-preamble rule and the Raycast generated-manifest rules remain.
- `docs/workflow/v1/` and `docs/workflow/v2/` files themselves are untouched.

**Consumes:** the final inventory (Tasks 1–33); the sync tooling (Task 24); the docs (Tasks 34–35).

**Produces:** the updated repository agent instructions.
