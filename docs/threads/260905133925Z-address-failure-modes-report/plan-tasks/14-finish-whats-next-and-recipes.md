### Task 14: Rewrite `finish`, `whats-next`, and the recipe references

**Objective:** Make `finish` inspect implementations and recommend `close-thread` with no archive action, make `whats-next` advise from the new layout, and rewrite the three recipe references `whats-next` orients against.

**Input / context:** Starts from task 13. `spec.md` `### Skill inventory` (`finish`, `whats-next`), `### The closing skill` (`finish` keeps its branch-handoff scope and recommends closing first), `### Documentation and repository maintenance` (the three recipes as the overview describes them), `### Thread layout`; decisions.md DR5, DR20, DR18. Existing bodies: `suite/skills/finish-navigate/finish/SKILL.md` (sections `## Readiness inspection`, `## Advice never gates`, `## The ticket step`, `## Branch disposition`, `## Committing before delivery`, `## After the branch action`; hand-authored `references/ticket-step.md`), `suite/skills/finish-navigate/whats-next/SKILL.md` (sections `## Evidence to read`, `## Prioritize signals`, `## Conditional advice for evidence-less operations`, `## Roadmap threads`, `## Response shape`). Synced references: `finish` has `references/formats/adr.md`, `references/repository-conventions.md`, `references/trackers/github.md`; `whats-next` has `references/formats/adr.md` and `references/recipes/{quick,standard,roadmap}.md`, generated from `suite/shared/references/recipes/`. Skill names to use: `open-thread`, `discussion`, `spec`, `review-spec`, `plan-brief`, `plan-strict`, `check-plan`, `implement`, `implement-plan`, `review-implementation`, `review-code`, `roadmap`, `finish`, `close-thread`, `resolve-pending-decisions`.

**Steps:**

1. Rewrite `suite/shared/references/recipes/quick.md`: open the thread with `open-thread`; discuss with `discussion` *(optional)*; write the spec with `spec` *(optional)*; write a brief plan with `plan-brief` *(optional)*; implement with `implement`; review with `review-implementation` and `review-code` *(optional)*; finish with `finish`; close with `close-thread`.
2. Rewrite `suite/shared/references/recipes/standard.md`: `open-thread`; `discussion`; `spec`; `review-spec` *(optional)*; `plan-strict` (or `plan-brief`); `check-plan`; `implement-plan`; `review-implementation`, `review-code` *(optional)*; `finish`; `close-thread`. Note that a further plan or implementation is a new folder under `plans/` or `implementations/`.
3. Rewrite `suite/shared/references/recipes/roadmap.md`: `open-thread`; `discussion` of the direction, writing its ADRs and glossary entries in the delta; `roadmap` to author the index at `docs/roadmaps/`; `finish`; `close-thread`, so the ADRs land before any entry is worked; then, when the frontier reaches an entry, `open-thread` with the index path and entry slug opens an ordinary thread that follows Quick or Standard.
4. `finish`: add `## Inputs` (the two fixed leading items; `seed.md`; `spec.md` when present; the thread's `adr/` and `glossary.md` (unlanded drafts are a reason to close first); every `implementations/*/report.md` (the newest is the principal outcome); the workspaces `.pending-decisions/`, `.pending-reviews/`, `implementations/*/.runs/`; the repository conventions and tracker references; git state). Rewrite `## Readiness inspection` around those inputs: the principal outcome is the newest implementation's `report.md`, or for a Roadmap thread the index under `docs/roadmaps/`; conflict markers are looked for in `spec.md` and under `plans/`. In `## After the branch action` (or a new short section) recommend running `close-thread` before delivery so landed ADRs travel with the branch, and offer no archive action of its own. Check `references/ticket-step.md` for report or decision-log paths and fix them. Remove every `implementation-report.md`, `.implementation-runs`, `roadmap.md`, `archive-thread`, and materialization reference. Bump the version.
5. `whats-next`: add `## Inputs` (the two fixed leading items; location, active or `docs/threads/archive/`; `seed.md`, with its `Roadmap:` / `Entry:` lines; `spec.md`; the thread's `adr/` and `glossary.md`; the folders under `plans/` and `implementations/` with each `report.md`; `.pending-decisions/` and `.pending-reviews/` headers; `implementations/*/.runs/` directories; the recipes under `references/recipes/`; the roadmap index the seed names, or the index the thread authored under `docs/roadmaps/`; git state; the optional user hint). Rewrite `## Evidence to read` to that list and `## Prioritize signals` so the recipe comparison reads `docs/roadmaps/` authorship → Roadmap, `spec.md` or a strict plan folder → Standard, lighter traces → Quick, and so the final recommendation for a delivered thread is `close-thread`. Rewrite `## Roadmap threads`: for a Roadmap thread, whether the index exists and whether the thread is closed; for a thread opened from an entry, name the entry. Remove every `decisions.md`, `proposal.md`, `plan.md` at the thread root, `roadmap.md`, `roadmap-feedback`, `implementation-report.md`, `.implementation-runs`, `archive-thread`, and materialization reference. Bump the version.
6. Update both `agents/openai.yaml` if needed. Run the sync script (regenerates `whats-next/references/recipes/*.md`) and both standing gates from `suite/`.

**Files modified:** `suite/shared/references/recipes/quick.md`, `suite/shared/references/recipes/standard.md`, `suite/shared/references/recipes/roadmap.md`, `suite/skills/finish-navigate/whats-next/references/recipes/quick.md` (generated), `suite/skills/finish-navigate/whats-next/references/recipes/standard.md` (generated), `suite/skills/finish-navigate/whats-next/references/recipes/roadmap.md` (generated), `suite/skills/finish-navigate/finish/SKILL.md`, `suite/skills/finish-navigate/finish/references/ticket-step.md`, `suite/skills/finish-navigate/finish/agents/openai.yaml`, `suite/skills/finish-navigate/whats-next/SKILL.md`, `suite/skills/finish-navigate/whats-next/agents/openai.yaml`

**Verification:**

```sh
F=suite/skills/finish-navigate/finish/SKILL.md; N=suite/skills/finish-navigate/whats-next/SKILL.md
grep -rc "decisions.md\|proposal\|roadmap.md\|roadmap-feedback\|implementation-report.md\|implementation-runs\|archive-thread\|materializ\|reconcile\|CB<N>\|DR<N>" $F $N suite/skills/finish-navigate/finish/references/ticket-step.md suite/shared/references/recipes/*.md   # 0 each
grep -n "^## Inputs" $F $N                                              # both
grep -n "close-thread" $F $N suite/shared/references/recipes/*.md        # all
grep -in "archive" $F | grep -iv "docs/threads/archive\|close-thread"    # no archive action of its own
grep -n "implementations/" $F $N; grep -n "plans/" $N                    # present
grep -n "docs/roadmaps/" $N suite/shared/references/recipes/roadmap.md   # present
grep -n "check-plan" suite/shared/references/recipes/standard.md         # present
grep -n "log.md" $F $N                                                   # no output (neither reads the log)
diff suite/shared/references/recipes/quick.md suite/skills/finish-navigate/whats-next/references/recipes/quick.md   # identical
```

**Acceptance criteria:**

- `finish` recommends `close-thread`, offers no archive action, inspects `implementations/*/report.md`, and carries `## Inputs` (AC-8.8, AC-6.1).
- `whats-next` advises from the new layout with no feedback listing and carries `## Inputs` (spec `### Skill inventory`, AC-6.1).
- The three recipe references name only skills that exist under `suite/skills/` and describe the sequences above; `whats-next`'s copies are in sync (AC-7.2).

**Consumes:** skill names `check-plan` (task 8) and `close-thread` (task 13); the plan and implementation folder contracts (tasks 7, 9); seed lines (task 3).

**Produces:** the three recipe sequences, which `suite/method.md` (task 15) describes in prose for humans and the root `README.md` (task 16) points at.
