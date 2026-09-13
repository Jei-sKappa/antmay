# Task 24: Shared-reference sync tooling

**Objective:** Create `shared/manifest.yaml` and `scripts/sync-shared-references.mjs`, run the sync, and land the generated committed copies inside the declaring skills.

**Input / context:** The cutover spec `specs/001/spec.md` § "Shared-reference sync tooling" and AC-13.2–AC-13.6 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P64 (the four-part design; deletion authority confined to generated folders), P55 (declaring skills: `open-thread` and `roadmap`; no cross-skill reference reads). Style precedent: `raycast-extension/scripts/sync-skills-to-raycast.mjs` (plain dependency-free Node). Spec Degrees of freedom #5 grants script internals (parsing approach, diagnostics, logging, ordering, CLI ergonomics) within P64's constraints. Both declaring skill folders exist by now (Tasks 8 and 19). This task writes no `SKILL.md`.

**Steps:**

1. Create `shared/manifest.yaml` as a strictly flat map — skill path keys, string-list values, no anchors, nesting beyond the one list level, or multiline strings:
   - `skills/workflow/capture-discussion/open-thread` → `workflows/quick.md`, `workflows/standard.md`, `workflows/roadmap.md`
   - `skills/workflow/roadmap/roadmap` → the same three entries.
   (Entry paths are relative to `shared/references/`; exact key/value spelling is yours within the flat-map shape.)
2. Create `scripts/sync-shared-references.mjs`: dependency-free Node (only `node:` built-ins, in the style of the Raycast generator). Behavior per run: parse the manifest with a purpose-built minimal parser (the restricted shape makes this a few lines — no YAML library); VALIDATE EVERYTHING BEFORE DELETING ANYTHING — the manifest parses, every declared skill path contains a `SKILL.md`, every declared source file exists under `shared/references/`; on any validation failure, exit non-zero with a diagnostic and touch nothing. Only after full validation: for each declaring skill, wipe and re-create `<skill>/references/shared/` from the canonical sources, preserving relative subpaths (`references/shared/workflows/quick.md`). Deletion authority is confined to each declaring skill's `references/shared/` folder — the script must be structurally incapable of deleting outside it (e.g., resolve and assert the target path ends with `references/shared` before any `rm`).
3. Make output deterministic: byte-for-byte copies; stable iteration order; no timestamps written into outputs.
4. Run `node scripts/sync-shared-references.mjs`; confirm it creates `skills/workflow/capture-discussion/open-thread/references/shared/workflows/{quick,standard,roadmap}.md` and `skills/workflow/roadmap/roadmap/references/shared/workflows/{quick,standard,roadmap}.md`.
5. Run it a second time and confirm `git status` shows no new diff (idempotent).
6. Negative checks (restore state afterwards): (a) temporarily add a manifest entry pointing to a missing source file, run, and confirm the script fails without modifying or deleting anything outside `references/shared/` folders — in particular hand-authored `references/` files are untouched; (b) malform the manifest (e.g., a nested key), run, and confirm the same. Revert the manifest.
7. Confirm the generated copies are NOT gitignored (they must be committed and flow into distribution unchanged): `git check-ignore` on each copy returns nothing.

**Files modified:** `shared/manifest.yaml` (NEW), `scripts/sync-shared-references.mjs` (NEW), `skills/workflow/capture-discussion/open-thread/references/shared/workflows/quick.md`, `standard.md`, `roadmap.md` (NEW, generated), `skills/workflow/roadmap/roadmap/references/shared/workflows/quick.md`, `standard.md`, `roadmap.md` (NEW, generated).

**Verification:**

```sh
node scripts/sync-shared-references.mjs && node scripts/sync-shared-references.mjs && git status --short   # second run adds no diff
diff -r shared/references/workflows skills/workflow/capture-discussion/open-thread/references/shared/workflows
diff -r shared/references/workflows skills/workflow/roadmap/roadmap/references/shared/workflows   # both byte-identical
git check-ignore skills/workflow/capture-discussion/open-thread/references/shared/workflows/quick.md ; echo "ignored=$?"   # expect ignored=1 (not ignored)
grep -c 'require\|from "' scripts/sync-shared-references.mjs   # imports limited to node: built-ins (inspect the hits)
```

**Acceptance criteria:**

- `shared/manifest.yaml` exists as a flat map (no anchors/nesting/multiline) declaring at least `open-thread` and `roadmap`, each with the three workflow templates (spec AC-13.2).
- `scripts/sync-shared-references.mjs` exists, runs with no dependencies beyond Node, wipes and re-creates each declaring skill's `references/shared/` from `shared/references/`, and touches nothing outside those generated folders (spec AC-13.3).
- After a run, both skills' `references/shared/workflows/` are byte-identical to `shared/references/workflows/`, and the copies are not gitignored (spec AC-13.4).
- Running twice produces no second-run diff; on a malformed manifest or missing declared source/skill path the script fails without deleting or modifying anything outside declared `references/shared/` folders (spec AC-13.6).
- Neither `open-thread` nor `roadmap` references the other's folder; each reads only its own `references/shared/` copies (spec AC-13.5 — already encoded in Tasks 8 and 19; re-grep both bodies for paths under the other skill).

**Consumes:** the canonical templates (Task 23); the `open-thread` and `roadmap` skill folders (Tasks 8, 19).

**Produces:** the sync system and the generated `references/shared/` copies; the authoring rule ("edit `shared/references/`, run the script, never hand-edit `references/shared/`") that Task 38 documents in `AGENTS.md`.
