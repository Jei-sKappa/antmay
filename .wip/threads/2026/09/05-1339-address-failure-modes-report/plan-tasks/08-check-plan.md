### Task 8: Create `check-plan`

**Objective:** Add the completion-oriented plan check that corrects the newest or a named plan folder in place from the spec and queues as pending decisions what it cannot fix.

**Input / context:** Starts from task 7's plan folder contract. `spec.md` `### Planning, the plan check, and implementation` (plan check), `### Skill inventory` (new skills), `### Documentation and repository maintenance` (the "When adding a new skill" checklist); decisions.md DR15, DR8, DR26. Name and group fixed in `plan.md`: `check-plan` at `suite/skills/plan/check-plan/`, an entry point. The checklist from `suite/AGENTS.md`: `SKILL.md` frontmatter with `name: check-plan`, `description`, `disable-model-invocation: true`, `metadata.author: https://github.com/Jei-sKappa`, `metadata.version: 0.1.0`; `agents/openai.yaml` with `interface.display_name: Check Plan`, a fresh 4–7-word `interface.short_description`, and `policy.allow_implicit_invocation: false`; a `README.md` section under `### Plan`; a `marketplace.json` entry `./skills/plan/check-plan`; the scope `check-plan` in `.vscode/settings.json`. `suite/AGENTS.md`'s layout tree is updated in task 16.

**Steps:**

1. Create `suite/skills/plan/check-plan/SKILL.md` with the frontmatter above. Description: check the newest or a named plan folder against the thread's spec and correct in place every fault the spec settles, queueing the rest as pending decisions.
2. Body sections: `## Inputs` (the two fixed leading items; `spec.md`, the sole authority, required; the plan folder to check, the newest folder under `plans/` by stamp or the one named in the invocation, `plan.md` plus `plan-tasks/` when present, the edit target; the thread's `adr/` and `glossary.md` as the records the spec cites); `## What is corrected` (a task contradicting the spec, an acceptance criterion of the spec no task covers, an ambiguous or wrong step, a wrong target path; each fixed only when the fix follows from the spec, by editing the affected task or adding the missing coverage to the task whose deliverable it belongs to); `## What is never done` (removing detail the plan added beyond the spec, inventing a task the spec does not imply, editing anything outside the plan folder, editing the spec); `## Procedure` (preflight: resolve the thread, refuse when `spec.md` is absent or the plan folder does not resolve; gather inputs; walk the plan task by task against the spec; apply corrections in place; for a strict plan keep index and task files consistent; list the corrections in chat; end with the terminal outcome); `## Blocked` (anything the spec does not settle, including a task resting on a thread ADR or spec decision that appears wrong, is handed to `/emit-pending-decisions` with `/check-plan` as producer, the plan folder as target, the originating request, and the points; every derivable correction is applied first; end `Outcome: BLOCKED — pending decisions at <bundle path>`). Terminal outcomes: `Outcome: DONE — Plan checked: plans/<folder>/` (also when no correction was needed), `Outcome: BLOCKED — …`, `Outcome: REFUSED — <reason and how to re-invoke>`. Write boundary: files inside the checked plan folder only.
3. Create `suite/skills/plan/check-plan/agents/openai.yaml` as described above.
4. Add `skills/plan/check-plan: [formats/adr.md]` to `suite/shared/manifest.yaml` and run the sync script.
5. Add `./skills/plan/check-plan` to the `skills` array in `.claude-plugin/marketplace.json`, after `./skills/plan/plan-strict`.
6. Add a `#### check-plan` subsection to the root `README.md` under `### Plan`, following the neighbouring subsections' shape (link to `./suite/skills/plan/check-plan/SKILL.md`, one-paragraph description, install snippet).
7. Add `check-plan` to `conventionalCommits.scopes` in `.vscode/settings.json`, keeping the array sorted.
8. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/plan/check-plan/SKILL.md` (NEW), `suite/skills/plan/check-plan/agents/openai.yaml` (NEW), `suite/skills/plan/check-plan/references/formats/adr.md` (NEW, generated), `suite/shared/manifest.yaml`, `.claude-plugin/marketplace.json`, `README.md`, `.vscode/settings.json`

**Verification:**

```sh
C=suite/skills/plan/check-plan/SKILL.md
grep -n "^name: check-plan\|^disable-model-invocation: true\|version: 0.1.0" $C   # all three
grep -n "allow_implicit_invocation: false" suite/skills/plan/check-plan/agents/openai.yaml
grep -n "^## Inputs" $C; grep -n "sole authority\|spec.md" $C                    # present
grep -in "newest\|named" $C                                                      # present
grep -in "invent" $C; grep -in "detail" $C                                       # forbids inventing tasks and removing plan-added detail
grep -n "emit-pending-decisions" $C
grep -n "Outcome: DONE\|Outcome: BLOCKED\|Outcome: REFUSED" $C                   # all three
grep -c "decisions.md\|DR<N>\|reconcile" $C                                      # 0
grep -n "check-plan" .claude-plugin/marketplace.json .vscode/settings.json README.md suite/shared/manifest.yaml   # all four
test -f suite/skills/plan/check-plan/references/formats/adr.md
(cd suite && node scripts/check-marketplace-skills.mjs)
```

**Acceptance criteria:**

- A `check-plan` skill exists whose sole authority is the spec, whose edit target is the newest or a named plan folder, whose body forbids removing plan-added detail and inventing tasks, and which queues a pending decision for what it cannot fix from the spec (AC-9.2).
- It is registered in `marketplace.json`, the root `README.md`, `conventionalCommits.scopes`, and `manifest.yaml`, and `check-marketplace-skills.mjs` passes (AC-13.1).

**Consumes:** the plan folder contract (task 7); the `/emit-pending-decisions` contract (task 6).

**Produces:** the skill name `check-plan`, which the recipes (task 14), `suite/method.md` (task 15), and `suite/AGENTS.md` (task 16) name.
