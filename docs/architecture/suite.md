# The skill suite

## Shared references

- The canonical text of every reference more than one skill reads lives once under `suite/shared/references/`, and the copy inside a skill's own `references/` folder is generated from it.
- `suite/shared/manifest.yaml` is a strictly flat map from a suite-relative skill path to the sources that skill declares, and it is the only declaration of which skill carries which reference.
- `suite/scripts/sync-shared-references.mjs` mirrors each declared source to the same relative path under the declaring skill's `references/`, and the generated copies are committed with the change that produces them.
- A skill's `references/` folder holds generated copies and hand-authored skill-local references side by side, and only the ones the manifest declares are the sync script's to rewrite.
- A skill reads only the copies under its own folder, so installing one skill alone brings every reference that skill needs with it.

## Distribution

- `.claude-plugin/marketplace.json` holds one plugin entry whose `skills` array names every skill folder, and that array is what makes a suite living under `suite/` installable at all.
- The `skills` CLI scans a fixed set of root-relative directories and then the parent of every path that array names, so a skill missing from the array silently disappears from `npx skills add` with no error.
- A skill's leaf folder name equals its frontmatter `name:`, because discovery de-duplicates on that field and `--skill <name>` matches on it alone.
- A skill declares its invocation role twice, in its `SKILL.md` frontmatter and in its `agents/openai.yaml`, because the two harnesses read different files for it.

## Mechanical gates

- The suite has no build; two dependency-free Node scripts under `suite/scripts/`, both run from `suite/`, are its whole automated check.
- `check-marketplace-skills.mjs` holds the marketplace manifest and the skill folders to each other in both directions, rejects two skills sharing a frontmatter `name:`, and rejects frontmatter a YAML parser would refuse.
- `check-skill-text.mjs` reads the shipped prose under `suite/skills/` and `suite/shared/references/` and fails on a skill-local reference path that carries no pointer prefix, on `per` before such a pointer, and on an indented fence.
- `suite/authoring/` is outside both walks, because the authoring documents quote the forbidden forms as negative examples and every rule would fire on them by design.
- Neither script rewrites anything, so a failure is repaired by editing the suite rather than by rerunning the check.
