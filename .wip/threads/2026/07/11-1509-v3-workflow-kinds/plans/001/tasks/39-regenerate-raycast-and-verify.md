# Task 39: Regenerate Raycast and verify the cutover

**Objective:** Regenerate the Raycast manifest through the existing generator and run the full acceptance sweep over the finished cutover.

**Input / context:** The cutover spec `specs/001/spec.md` §§ "Acceptance criteria" (all of FR-1, FR-2, FR-14, FR-15 plus spot-checks) — thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`. AC-14.1 permits touching `raycast-extension/scripts/sync-skills-to-raycast.mjs` ONLY if the migrated layout breaks a run, and then only minimally (note: the script derives groups from paths and sorts unknown groups last, so the new `roadmap`/`reconcile`/`primitives` groups should work unchanged — an incomplete `GROUP_ORDER` is cosmetic, not a break). This closing task carries the whole-change gates deliberately deferred from earlier tasks. Fix any mechanical failure by the owning task's own rules; anything requiring new human intent is surfaced to the user, not decided here.

**Steps:**

1. Raycast: run `node raycast-extension/scripts/sync-skills-to-raycast.mjs`. If it exits non-zero, apply the minimal adjustment that restores a successful run — otherwise do not touch it. Confirm the output lists the new groups and 45 skills, and that `raycast-extension/assets/skills.json` is still gitignored and not hand-edited.
2. Inventory sweep (AC-1.1–1.3): every `skills/workflow/` leaf has a `SKILL.md` whose `name:` equals its folder and which carries `metadata.author` and a semver `metadata.version`; the fifteen groups hold exactly the spec's "Final group layout" skill set; the AC-1.2 paths are absent; `skills/deprecated/` is exactly the seven.
3. Vocabulary sweep (AC-1.4) across ALL files under `skills/workflow/` — bodies, references, agents: case-insensitive fixed-string greps for `.wip`, `ledger.md`, `status.approved`, `status.implemented`, `record-verdict`, and word-boundary greps for `tier` and `ledger`, all empty; read a sample to confirm no file references V1/V2 thread layouts or instructs V2 detection (AC-15.2 for skills and `docs/project/v3/`).
4. Metadata sweep (AC-2.1–2.5): every non-primitive `SKILL.md` has `disable-model-invocation: true` AND `agents/openai.yaml` with `allow_implicit_invocation: false`; the six primitives have neither; no skill has an `interaction:` key; Claude/Codex settings agree everywhere.
5. Derived-file re-checks: marketplace/scopes match disk (rerun Task 36's diff commands); `.gitignore` rules present; sync-script idempotency (`node scripts/sync-shared-references.mjs` twice → no diff; copies byte-identical to `shared/references/`).
6. Non-interference (AC-15.1): `git diff --stat <pre-cutover-ref>..HEAD` (the commit before Task 1's changes) shows NO modifications under `docs/workflow/v1/`, `docs/workflow/v2/`, or any pre-existing thread under `docs/threads/` other than `docs/threads/260711150919Z-v3-workflow-kinds/` itself.
7. Report the sweep results honestly, including anything fixed here and anything surfaced for the user.

**Files modified:** `raycast-extension/assets/skills.json` (regenerated, gitignored); `raycast-extension/scripts/sync-skills-to-raycast.mjs` only if a run fails (minimal fix); any file touched by a mechanical sweep fix (name it in the report).

**Verification:**

```sh
node raycast-extension/scripts/sync-skills-to-raycast.mjs                     # exits 0; groups include roadmap, reconcile, primitives
git check-ignore raycast-extension/assets/skills.json && echo STILL-IGNORED  # expect STILL-IGNORED
# AC-1.1:
for f in skills/workflow/*/*/SKILL.md; do d=$(basename $(dirname $f)); grep -q "^name: $d$" $f || echo "NAME-MISMATCH: $f"; \
  grep -q 'author: https://github.com/Jei-sKappa' $f || echo "NO-AUTHOR: $f"; \
  grep -qE 'version: [0-9]+\.[0-9]+\.[0-9]+' $f || echo "NO-SEMVER: $f"; done
# AC-1.4:
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/ ; echo "fixed-strings rc=$?"   # expect rc=1
grep -riwE 'tier|ledger' skills/workflow/ ; echo "word rc=$?"                                                                    # expect rc=1
# AC-2.1–2.4:
for f in skills/workflow/*/*/SKILL.md; do case $f in */primitives/*) \
    grep -q 'disable-model-invocation' $f && echo "PRIMITIVE-RESTRICTED: $f"; test -e $(dirname $f)/agents && echo "PRIMITIVE-AGENTS: $f";; \
  *) grep -q 'disable-model-invocation: true' $f || echo "MISSING-DMI: $f"; \
     grep -q 'allow_implicit_invocation: false' $(dirname $f)/agents/openai.yaml || echo "MISSING-OPENAI: $f";; esac; done
grep -rn 'interaction:' skills/workflow/*/*/SKILL.md ; echo "interaction rc=$?"   # expect rc=1  (AC-2.5)
# FR-13 recheck:
node scripts/sync-shared-references.mjs && node scripts/sync-shared-references.mjs && git status --short
diff -r shared/references/workflows skills/workflow/capture-discussion/open-thread/references/shared/workflows
diff -r shared/references/workflows skills/workflow/roadmap/roadmap/references/shared/workflows
# AC-15.1 (substitute the pre-cutover commit):
git diff --stat <pre-cutover-ref>..HEAD -- docs/workflow/v1 docs/workflow/v2   # expect empty
git diff --stat <pre-cutover-ref>..HEAD -- docs/threads | grep -v '260711150919Z-v3-workflow-kinds'   # expect empty
```

**Acceptance criteria:**

- A fresh Raycast sync run succeeds against the migrated tree with the new groups present in its output; the generator is functionally unchanged unless a run failure forced a minimal adjustment; `assets/skills.json` remains gitignored and hand-unedited (spec AC-14.1, AC-14.2).
- Every sweep in steps 2–5 passes with zero findings, or each finding is fixed per its owning task's rules and the re-run passes (spec AC-1.1–1.4, AC-2.1–2.5, AC-12.1/12.4/12.5, AC-13.4/13.6).
- The cutover diff touches nothing under `docs/workflow/v1/`, `docs/workflow/v2/`, or any pre-existing thread other than this one (spec AC-15.1); no V3 skill or document instructs migrating, interpreting, or detecting pre-V3 threads (spec AC-15.2).
- The final report lists every check run, its result, and any fix or surfaced question.

**Consumes:** everything — Tasks 1–38 complete.

**Produces:** the verified Project V3 cutover and the regenerated Raycast manifest.
