### Task 6: The `review-change` skill

**Objective:** Replace `review-spec` with `review-change`, the read-only review of a thread's change document and delta documents that adds the five checks the model requires to the existing readiness axes.

**Input / context:** `spec.md` `## Skills whose roles change` (row `review-spec` → `review-change`: no standing-behavior sentence in the body; every citation resolves inside the thread or in the project layer; every delta document is well-formed — type, hash where required, literal operations, one per target, path mirrors target; every `create` under `docs/adr/` or `docs/pdr/` passes the three clauses against the log, a rejected alternative never argued in the log being a finding; criteria carry no identifiers), `### Delta documents`, `### Decision records`. Thread glossary rows **change document**, **delta document**, **decision test**. Current body `suite/skills/review/review-spec/SKILL.md` as the starting text (posture, axes, recording of findings, after-the-review paragraph all kept). Formats from tasks 1 and 4; the instruction from task 3.

**Steps:**

1. `git mv suite/skills/review/review-spec suite/skills/review/review-change`.
2. Rewrite `suite/skills/review/review-change/SKILL.md`. Frontmatter `name: review-change`, description "Judge a thread's change document and delta documents as a downstream handoff and record any findings.", `disable-model-invocation: true`. Title `# Review Change`. Opening paragraph: assess the thread-root `change.md` and every delta document under `delta/` as a downstream handoff, strictly read-only; the one question stays "could another agent plan and implement from this alone".
3. `## Inputs`: the six-item project-layer block on top; the thread's `change.md` — the reviewed target, at the thread root, read end to end; the thread's `delta/` — every delta document, each in the shape `<skill_path>/references/formats/delta-document.md` defines, and each `create` under `delta/docs/adr/` or `delta/docs/pdr/` in the shape `<skill_path>/references/formats/decision-record.md` defines; the thread's `log.md` — the settled points and their rejected alternatives, which the decision-test check reads against; the thread's `seed.md`.
4. `## Procedure`: gather (refuse with `REFUSED` and `no change.md to review` when the thread holds none); judge against the axes; decide; report — unchanged in shape, with the new target names.
5. `## What you judge`: keep the ten readiness axes, then add a `### Change-document checks` list of five, each a finding when it fails: (1) no sentence in the body describes standing behavior of the product or standing structure of the system — such a sentence belongs in a delta document and is cited; (2) every citation in the body resolves — a delta document path resolves inside `delta/`, a decision record stem resolves in `delta/docs/adr/`, `delta/docs/pdr/`, `docs/adr/` or `docs/pdr/`, a description by path and heading resolves in `delta/` or `docs/`, a roadmap entry resolves in its index, and nothing cites another thread; (3) every delta document is well-formed — a `type` of `create`, `edit` or `delete`, a `hash` on `edit` and `delete`, literal `add`/`replace`/`remove` operations with anchors and exact text rather than instructions, one document per target, and a path under `delta/` that mirrors the target's project-layer path; (4) every `create` under `delta/docs/adr/` or `delta/docs/pdr/` passes the three clauses of the decision test against `log.md` — a rejected alternative the record names that no log line argued against is a finding, as is a record filed in the wrong folder for the question it answers; (5) the acceptance checklist carries no `FR-`, `AC-` or other identifier and is a flat list of behavior statements. Keep the paragraph allowing an obvious contradiction with a project record to be reported, classified as `/consult-decisions` instructs.
6. `## Recording findings`: target `change.md` (or the delta document path when a finding sits in one); add `delta` and `citation` to the category vocabulary; keep the write boundary sentence, now naming `change.md`, `delta/`, `seed.md`, `log.md`, `docs/adr/`, `docs/pdr/`, `docs/product/`, `docs/architecture/` and `docs/glossary.md` as read and never written.
7. Update `suite/skills/review/review-change/agents/openai.yaml`: `display_name: Review Change`, fresh short description, `policy.allow_implicit_invocation: false`.
8. In `suite/shared/manifest.yaml`, rename the key `skills/review/review-spec` to `skills/review/review-change` with the list `instructions/emit-pending-review.md`, `instructions/emit-terminal-outcome.md`, `instructions/read-and-cite-the-project-layer.md`, `formats/change-document.md`, `formats/delta-document.md`, `formats/decision-record.md`.
9. In `.claude-plugin/marketplace.json` replace `./skills/review/review-spec` with `./skills/review/review-change` (sorted); in `.vscode/settings.json` replace the scope `review-spec` with `review-change` (sorted); in `README.md` replace the `review-spec` entry with `review-change` ("Expects a thread holding a `change.md` and its `delta/` to judge as a downstream handoff; leaves nothing when they are ready to plan from, and one findings bundle under `.pending-reviews/` when they are not."), snippet and link updated.
10. From `suite/`, run the sync script and both checks.

**Files modified:** `suite/skills/review/review-spec/` → `suite/skills/review/review-change/` (renamed: `SKILL.md`, `agents/openai.yaml`, `references/**`), `suite/skills/review/review-change/references/formats/decision-record.md` (NEW, synced), `suite/shared/manifest.yaml`, `.claude-plugin/marketplace.json`, `.vscode/settings.json`, `README.md`.

**Verification:**

```sh
test -f suite/skills/review/review-change/SKILL.md && ! test -e suite/skills/review/review-spec && grep -q '^name: review-change$' suite/skills/review/review-change/SKILL.md
grep -q 'no change.md to review' suite/skills/review/review-change/SKILL.md
grep -c -E 'standing (behavior|structure)|every citation|well-formed|three clauses|no `FR-`' suite/skills/review/review-change/SKILL.md   # the five checks, at least 5 hits
grep -q 'log.md' suite/skills/review/review-change/SKILL.md && grep -q 'formats/delta-document.md' suite/skills/review/review-change/SKILL.md
! grep -n -E 'spec\.md|review-spec|thread.s `adr/`' suite/skills/review/review-change/SKILL.md
! grep -rn 'review-spec' suite/ README.md .claude-plugin .vscode
(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && node scripts/check-skill-text.mjs)
git diff --quiet fe83a4f -- cli/ && git diff --quiet fe83a4f -- docs/glossary.md
```

**Acceptance criteria:**

- `suite/skills/review/review-change/SKILL.md` exists with `name: review-change`, `review-spec` exists nowhere, and the skill is registered under its new name in the manifest, `marketplace.json`, the README and the scopes array.
- The body is read-only, targets `change.md` and `delta/`, reads `log.md` for the decision test, and checks the five points: no standing-behavior sentence in the body; every citation resolves inside the thread or the project layer and none names another thread; every delta document well-formed; every record `create` passes the three clauses against the log with an unargued rejected alternative a finding; criteria carry no identifiers.
- The sync script and both suite checks exit 0; nothing under `cli/` or in `docs/glossary.md` differs from the baseline.

**Consumes:** `formats/change-document.md`, `formats/delta-document.md` (task 4); `formats/decision-record.md` (task 1); the `## Inputs` opening block and `instructions/read-and-cite-the-project-layer.md` (task 3); the change authoring named `/change` (task 5).

**Produces:** the skill `/review-change`, named in `README.md` and in `docs/product/method.md` (task 14).
