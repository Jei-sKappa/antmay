# Task 36: Update marketplace, VS Code scopes, and .gitignore

**Objective:** Bring the three mechanical derived files in line with the final V3 skill inventory and thread model.

**Input / context:** The cutover spec `specs/001/spec.md` § "Derived repository files" and AC-12.1/AC-12.4/AC-12.5 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P51 (marketplace additions), P28/P31/P36/P40 (dot-prefixing alone does not gitignore — explicit rules needed). Spec Degrees of freedom #9: the legacy `docs/threads/**/.wip/` ignore rule may be kept (recommended — it still serves untouched pre-V3 threads) — keep it. Current files: `.claude-plugin/marketplace.json` (13 plugins), `.vscode/settings.json` (33 scopes), `.gitignore`. The final on-disk inventory after Tasks 1–33: 38 workflow skills in 15 groups plus 7 deprecated skills.

**Steps:**

1. `.claude-plugin/marketplace.json` — rewrite the `plugins` array to match disk exactly, one plugin per `skills/workflow/` group plus deprecated, each `skills` entry as `./skills/workflow/<group>/<skill>` (or `./skills/deprecated/<skill>`):
   - Add plugins `JeisKappa-primitives` (the six primitives), `JeisKappa-reconcile` (`reconcile-plan`, `reconcile-proposal`, `reconcile-roadmap`, `reconcile-spec`), `JeisKappa-roadmap` (`materialize-roadmap-threads`, `roadmap`).
   - Update `JeisKappa-capture-discussion`: remove `seeded-discussion`, add `resolve-pending-decisions`.
   - Update `JeisKappa-finish-navigate`: remove `record-verdict`.
   - Update `JeisKappa-plan`: add `plan-brief`.
   - Update `JeisKappa-review`: now exactly `review-code`, `review-implementation`, `review-roadmap`, `review-spec`.
   - Update `JeisKappa-deprecated`: remove `plan-loose`; add `record-verdict`, `review-lossless-mapping`, `seeded-discussion` — final list is exactly the seven retired skills.
   - Keep `plugins` sorted alphabetically by `name` with `JeisKappa-deprecated` last.
2. `.vscode/settings.json` — set `conventionalCommits.scopes` to exactly the alphabetically sorted set of skill leaf folder names on disk (workflow + deprecated; 45 entries): remove `plan-loose`, `review-plan`, `review-proposal`; add `append-roadmap-feedback`, `create-thread`, `discussion-point`, `emit-pending-decisions`, `emit-pending-review`, `materialize-roadmap-threads`, `plan-brief`, `reconcile-plan`, `reconcile-proposal`, `reconcile-roadmap`, `reconcile-spec`, `resolve-pending-decisions`, `review-roadmap`, `roadmap`, `update-implementation-report`. Derive the list from disk (command below) rather than by hand.
3. `.gitignore` — add explicit rules `docs/threads/**/.pending-decisions/`, `docs/threads/**/.pending-reviews/`, `docs/threads/**/.implementation-runs/` (with a short comment naming them thread-local workspaces); KEEP the existing `docs/threads/**/.wip/` rule.

**Files modified:** `.claude-plugin/marketplace.json`, `.vscode/settings.json`, `.gitignore`.

**Verification:**

```sh
python3 -c "import json; json.load(open('.claude-plugin/marketplace.json'))" && echo JSON-OK
# Every skill on disk appears exactly once in the marketplace:
ls -d skills/workflow/*/*/ skills/deprecated/*/ | sed 's|^|./|; s|/$||' | sort > /tmp/disk.txt
python3 -c "import json;print('\n'.join(sorted(s for p in json.load(open('.claude-plugin/marketplace.json'))['plugins'] for s in p['skills'])))" > /tmp/mp.txt
diff /tmp/disk.txt /tmp/mp.txt && echo MARKETPLACE-MATCHES-DISK
# Alphabetical plugin order, deprecated last:
python3 -c "import json;n=[p['name'] for p in json.load(open('.claude-plugin/marketplace.json'))['plugins']];assert n[:-1]==sorted(n[:-1]) and n[-1]=='JeisKappa-deprecated';print('ORDER-OK')"
# Scopes equal the on-disk leaf set:
ls skills/workflow/*/ skills/deprecated/ | grep -v ':' | grep -v '^$' | sort -u > /tmp/leaves.txt
python3 -c "import json;print('\n'.join(json.load(open('.vscode/settings.json'))['conventionalCommits.scopes']))" > /tmp/scopes.txt
diff /tmp/leaves.txt /tmp/scopes.txt && echo SCOPES-OK
grep -n 'pending-decisions\|pending-reviews\|implementation-runs' .gitignore
```

**Acceptance criteria:**

- `marketplace.json` parses; contains `JeisKappa-primitives`, `JeisKappa-reconcile`, `JeisKappa-roadmap`; every skill folder on disk appears exactly once under its group's plugin; plugins alphabetical with deprecated last; `JeisKappa-deprecated` lists exactly the seven retired skills (spec AC-12.1).
- `.gitignore` ignores `docs/threads/**/.pending-decisions/`, `docs/threads/**/.pending-reviews/`, `docs/threads/**/.implementation-runs/` (spec AC-12.4), and the legacy `.wip` rule is retained.
- `conventionalCommits.scopes` equals exactly the sorted on-disk leaf set including the six primitives, excluding `plan-loose`, `review-plan`, `review-proposal` (spec AC-12.5).

**Consumes:** the final on-disk inventory (Tasks 1–33).

**Produces:** consistent distribution and tooling metadata for the V3 suite.
