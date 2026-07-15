# Task 3: Apply refusal-versus-blocking semantics to completion skills

**Objective:** Make the affected non-implementation completion skills refuse all input, prerequisite, and safety failures during preflight while reserving decision bundles for missing human intent discovered after substantive execution begins.

**Input / context:** The governing rule is `docs/threads/260715094144Z-v3-workflow-fixes/implementation/discussions/260715200148Z-implementation-review-findings-decision-log.md P1`, as codified by Task 1. Existing defects include tracker ownership asking in `open-ticket`; input ambiguities routed to `## Blocked` in `plan-brief`, `plan-strict`, `spec`, and `merge-artifacts`; and trivial-clarification or per-brief ambiguity exceptions in `roadmap` and `materialize-roadmap-threads`.

**Steps:**

1. Give each affected skill an explicit preflight that completes thread/target resolution, invocation repair, required-artifact validation, prerequisite tooling or credential checks, and applicable safety checks before it writes its target artifact or performs an external side effect.
2. For every preflight failure, require a final `Outcome: REFUSED — <reason and concrete remediation or re-invocation>` line and no workflow-artifact write; remove all instructions to ask, wait, or emit `.pending-decisions/` for these failures.
3. In `open-ticket`, change unclear tracker ownership from an attended question to a refusal that names the missing ownership choice; keep missing CLI/API access or credentials as refusal and ensure ticket drafting and creation start only after the complete preflight passes.
4. In `plan-brief`, `plan-strict`, and `spec`, change ambiguous or malformed source references from `## Blocked` bundles to preflight refusal; keep `## Blocked` only for genuinely new human intent discovered while drafting from otherwise valid inputs.
5. In `merge-artifacts`, preflight the explicit candidate set, same-subject requirement, readable candidate paths, and target type before reading and merging; refuse vague candidate sets, distinct subjects, or an omitted mixed-type target without creating a bundle. Keep mutually exclusive design choices discovered during the merge as in-run missing intent that emits one decision bundle and ends `BLOCKED`.
6. In `roadmap`, replace the trivial-clarification exception with explicit preflight refusal for ambiguous inputs or missing required artifacts; retain decision bundling only for a decomposition choice discovered during authoring that existing durable intent does not settle.
7. In `materialize-roadmap-threads`, perform a complete read-only preflight across the roadmap and every selected child brief before allocating any child: validate brief identity, required fields, usable expanded suggested workflow, existing materialization references, and `/allocate-thread` availability. Refuse the entire run on any preflight defect with no child or workflow-artifact write.
8. In `materialize-roadmap-threads`, keep post-start human intent on the decision-bundle path and map an unfixable allocation/runtime failure to `BLOCKED` with a diagnosis and no decision bundle; preserve idempotent verification of already materialized children after preflight succeeds.
9. Keep successful completion at `DONE` and ensure each blocked section says or structurally guarantees that substantive execution has begun before it can be entered.
10. Bump the skill versions: `open-ticket` `1.2.0` → `1.3.0`; `plan-brief` `4.1.0` → `4.2.0`; `plan-strict` `5.1.0` → `5.2.0`; `spec` `4.1.0` → `4.2.0`; `merge-artifacts` `4.1.0` → `4.2.0`; `roadmap` `1.1.0` → `1.2.0`; `materialize-roadmap-threads` `1.1.0` → `1.2.0`.
11. Read all seven edited skills end to end and confirm each terminal branch maps mechanically to exactly one of `DONE`, `BLOCKED`, or `REFUSED`.

**Files modified:**

- `skills/workflow/capture-discussion/open-ticket/SKILL.md`
- `skills/workflow/plan/plan-brief/SKILL.md`
- `skills/workflow/plan/plan-strict/SKILL.md`
- `skills/workflow/spec/spec/SKILL.md`
- `skills/workflow/merge/merge-artifacts/SKILL.md`
- `skills/workflow/roadmap/roadmap/SKILL.md`
- `skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md`

**Verification:** Run `rg -n "clarification inside a resolved thread|route (it|the clarification|the missing target-type decision) per .*Blocked|pre-run clarifications|Trivial input clarifications|If the tracker is unclear, ask" skills/workflow/{capture-discussion/open-ticket,plan/plan-brief,plan/plan-strict,spec/spec,merge/merge-artifacts,roadmap/roadmap,roadmap/materialize-roadmap-threads}/SKILL.md` and confirm it returns no matches. Run `rg -n "Outcome: REFUSED|Outcome: BLOCKED|Outcome: DONE" skills/workflow/{capture-discussion/open-ticket,plan/plan-brief,plan/plan-strict,spec/spec,merge/merge-artifacts,roadmap/roadmap,roadmap/materialize-roadmap-threads}/SKILL.md` and confirm every documented terminal branch uses only those tokens. Run `rg -n "substantive execution|preflight|pre-flight" skills/workflow/{capture-discussion/open-ticket,plan/plan-brief,plan/plan-strict,spec/spec,merge/merge-artifacts,roadmap/roadmap,roadmap/materialize-roadmap-threads}/SKILL.md` and confirm the refusal/blocking boundary is explicit in every file. Run `rg -n "version: (1\.3\.0|1\.2\.0|4\.2\.0|5\.2\.0)" skills/workflow/{capture-discussion/open-ticket,plan/plan-brief,plan/plan-strict,spec/spec,merge/merge-artifacts,roadmap/roadmap,roadmap/materialize-roadmap-threads}/SKILL.md` and confirm every file carries its assigned version. In `materialize-roadmap-threads`, verify the procedure checks every selected brief before the first `/allocate-thread` call.

**Acceptance criteria:**

- Invocation repair, target ambiguity, missing required artifacts, tooling/credential failures, and safety gates refuse before substantive execution and write no workflow artifact.
- Every refusal tells the user exactly how to repair or re-invoke.
- Missing human intent discovered during substantive work emits a pending-decision bundle and ends `BLOCKED`.
- In-run operational defects end `BLOCKED` with a diagnosis and no decision bundle.
- `merge-artifacts` no longer bundles preflight candidate or target-type repair.
- `materialize-roadmap-threads` cannot create an early child before discovering a later malformed brief.
- All seven skills use only the universal terminal run tokens and carry the specified version bumps.

**Consumes:** The canonical preflight and blocking contract produced by Task 1; the dialogue-driven exclusions established by Task 2.

**Produces:** Corrected completion-skill preflight and in-run stopping behavior used as the consistency baseline for the implementation executors.
