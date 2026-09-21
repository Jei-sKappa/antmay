### Task 11: Plan skills quote criteria verbatim

**Objective:** Make `plan-brief`, `plan-strict` and `check-plan` work from the change document, reference its criteria by verbatim quotation, cite the change document and delta documents, and cite no other thread.

**Input / context:** `spec.md` `## Skills whose roles change` (row `plan-brief`, `plan-strict`, `check-plan`), `### The change document` (acceptance referenced by verbatim quotation), `### Citation and read order`. Current bodies of the three skills and `suite/skills/plan/plan-strict/references/worked-example.md` (hand-authored). The `## Inputs` opening block and the citation instruction (task 3); the change-document format (task 4).

**Steps:**

1. Edit `suite/skills/plan/plan-brief/SKILL.md`: `## Inputs` — the primary input's first form is the thread's `change.md` (the plan's authority); the referenced-artifact forms are a repository path, a GitHub issue, or the user's prompt (drop "another thread's artifact read as history"); `seed.md`; `delta/`, when present — the thread's delta, whose delta documents the plan cites by path and whose records it cites by stem rather than restating. In `## Plan shape`, the `Source:` value is `change.md`, a project-level repo-relative path, an issue URL, or `none — raw prompt`; a step that delivers a criterion quotes that criterion verbatim from the change document; the pointer-frame bullet reads: within-thread references are thread-relative (`change.md`, `delta/docs/adr/<stem>.md`), project-level references repo-relative (`docs/adr/<stem>.md`), and the plan cites no other thread. Point the citation sentences at `<skill_path>/references/instructions/read-and-cite-the-project-layer.md`. Write boundary: `change.md`, `delta/` and the project layer read and never written. `## Blocked`: "a thread ADR or a spec decision" becomes "a delta document or a change document decision"; classify as `/consult-decisions` instructs.
2. Edit `suite/skills/plan/plan-strict/SKILL.md` the same way, plus: in `### Index`, the `Source:` legal forms drop the cross-thread example and keep the thread-relative pointer (`change.md`, `delta/docs/adr/<stem>.md`), a project-level repo-relative path, an issue URL and `none — raw prompt`; the Global Constraints block is copied verbatim from the change document's constraints; in `### Task files`, the **Acceptance criteria** field states that a criterion taken from the change document is quoted verbatim, never numbered, labelled or paraphrased, and **Input / context** cites the change document section or the decision record stem (`delta/docs/adr/<stem>.md` or the landed stem) rather than restating it; in `### Invariants`, the pointer-frame bullet as in step 1 and "the plan cites no other thread"; `## Blocked` as in step 1.
3. Edit `suite/skills/plan/plan-strict/references/worked-example.md`: the example's settled decision is cited by stem as a decision record (`per the decision record 2609051230-use-jose-for-jwt` or the thread's `delta/docs/adr/2609051230-use-jose-for-jwt.md`), `Source: change.md`, and the task's acceptance criteria include one line quoted verbatim from a change document criterion so the shape is shown; the sequential-only note stands.
4. Edit `suite/skills/plan/check-plan/SKILL.md`: `## Inputs` — the thread's `change.md` is the sole authority (required); the plan folder; `delta/`, when present. In `## What is corrected`, "an acceptance criterion of the spec that no task covers" becomes "a criterion of the change document that no task quotes and delivers", and a task that paraphrases, numbers or labels a criterion instead of quoting it verbatim is a fault corrected to the verbatim quotation; a task citing another thread is a wrong target corrected to the change document or the delta document it meant. `## What is never done`: editing the change document or any delta document. Write boundary and `## Blocked` as in step 1. Refusal reason names `change.md`.
5. Update the three `README.md` entries: `plan-brief` and `plan-strict` expect a thread holding a `change.md`, or a referenced artifact; `check-plan` expects a thread holding both a `change.md` and a plan folder and queues what the change document does not settle.
6. In `suite/shared/manifest.yaml`, confirm the three plan skills declare `instructions/read-and-cite-the-project-layer.md` (task 3) and add `formats/change-document.md` to each.
7. From `suite/`, run the sync script and both checks.

**Files modified:** `suite/skills/plan/plan-brief/SKILL.md`, `suite/skills/plan/plan-strict/SKILL.md`, `suite/skills/plan/plan-strict/references/worked-example.md`, `suite/skills/plan/check-plan/SKILL.md`, `suite/shared/manifest.yaml`, `README.md`, and the synced copies `suite/skills/plan/{plan-brief,plan-strict,check-plan}/references/formats/change-document.md` (NEW).

**Verification:**

```sh
for f in suite/skills/plan/plan-brief/SKILL.md suite/skills/plan/plan-strict/SKILL.md suite/skills/plan/check-plan/SKILL.md; do grep -q 'change.md' "$f" && grep -q -i 'verbatim' "$f" && grep -q 'no other thread' "$f" || echo "missing rule in $f"; ! grep -n -E 'spec\.md|`adr/`|thread ADR|spec decision|another thread.s artifact|\.work/threads/<other>' "$f"; done
grep -q 'change.md' suite/skills/plan/plan-strict/references/worked-example.md && ! grep -q 'spec.md' suite/skills/plan/plan-strict/references/worked-example.md && ! grep -q '`adr/2609' suite/skills/plan/plan-strict/references/worked-example.md
grep -c 'change.md' README.md   # the three plan entries name it
(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && node scripts/check-skill-text.mjs)
git diff --quiet fe83a4f -- cli/ && git diff --quiet fe83a4f -- docs/glossary.md
```

**Acceptance criteria:**

- `plan-brief`, `plan-strict` and `check-plan` take `change.md` as the design authority, quote criteria verbatim, cite the change document and delta documents, and state that a plan cites no other thread; no accepted input form or `Source:` form names another thread.
- The strict plan's per-task acceptance criteria quote the change document's criteria verbatim, and the worked example shows it.
- The sync script and both suite checks exit 0; nothing under `cli/` or in `docs/glossary.md` differs from the baseline.

**Consumes:** `formats/change-document.md` (task 4); the `## Inputs` opening block and `instructions/read-and-cite-the-project-layer.md` (task 3).

**Produces:** none
