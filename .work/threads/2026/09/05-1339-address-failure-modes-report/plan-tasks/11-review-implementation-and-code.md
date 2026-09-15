### Task 11: Rewrite `review-implementation` and `review-code`

**Objective:** Make both reviews target the newest or a named implementation folder, read its report and the plan it names, anchor on the spec and the thread's ADRs, carry `## Inputs`, and write findings only.

**Input / context:** Starts from task 10. `spec.md` `### Reviews`, `### Thread layout`; decisions.md DR15, DR20. Existing bodies: `suite/skills/review/review-implementation/SKILL.md` (sections `## The authority anchor`, `## The report is the claim under test`, `## Procedure`, `## What you judge`, `## Recording findings`, `## After the review`) and `suite/skills/review/review-code/SKILL.md` (same shape). Synced references in both: `references/formats/adr.md`, `references/formats/implementation-report.md`. `/emit-pending-review` takes `Target: implementations/<folder>/` (task 6).

**Steps:**

1. In both, add `## Inputs`: the two fixed leading items; `spec.md` when present (the anchor's acceptance criteria are the contract); the implementation folder under review, the one named in the invocation or the newest under `implementations/` by stamp, and its `report.md` (the claim under test, per `references/formats/implementation-report.md`); the plan folder the report's `Plan:` line names, when any (`plans/<folder>/plan.md` and `plan-tasks/`); the thread's `adr/` and `glossary.md` (binding constraint sources: delivered work contradicting a thread ADR is a finding); `seed.md` (the anchor when neither spec nor plan exists); the delivered code as named by the user or as the report's `## Changes` describes it. All read-only.
2. Rewrite `## The authority anchor` in both: `spec.md`, else the plan the report names, else `seed.md`; the thread's `adr/` always applies on top. Remove `decisions.md`.
3. Rewrite `## The report is the claim under test` (and `review-code`'s equivalent) to read `implementations/<folder>/report.md`, including its `## Deviations` entries as claims to test.
4. In `## Procedure`, replace the thread-root report and plan reads with the resolution in step 1; when several implementation folders exist and none is named, the newest by stamp is the target and the chat says so.
5. In `## Recording findings`, the `/emit-pending-review` target is the implementation folder `implementations/<folder>/`. Keep the read-only rule: findings only, no edit of any artifact, and a spec criterion judged wrong is a finding, never an edit.
6. Bump both versions; update `agents/openai.yaml` if needed. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/review/review-implementation/SKILL.md`, `suite/skills/review/review-implementation/agents/openai.yaml`, `suite/skills/review/review-code/SKILL.md`, `suite/skills/review/review-code/agents/openai.yaml`

**Verification:**

```sh
A=suite/skills/review/review-implementation/SKILL.md; B=suite/skills/review/review-code/SKILL.md
grep -c "implementation-report.md\|decisions.md\|DR<N>\|plan.md at the thread root" $A $B   # 0 each
grep -n "^## Inputs" $A $B                                                  # both
grep -n "implementations/" $A $B; grep -in "newest" $A $B                    # both
grep -n "Plan:" $A $B                                                        # the plan the report names
grep -n "adr/" $A $B                                                         # both
grep -n "emit-pending-review" $A $B                                          # both
grep -n "Outcome: DONE\|Outcome: REFUSED" $A $B                              # both keep the protocol
```

**Acceptance criteria:**

- `review-implementation` and `review-code` carry `## Inputs`, target the newest implementation unless one is named, read its report and the plan it names, and write findings only (AC-12.1).
- Neither names `decisions.md` or a thread-root report (AC-1.2).

**Consumes:** the implementation folder contract (task 9); the `/emit-pending-review` target form (task 6).

**Produces:** none.
