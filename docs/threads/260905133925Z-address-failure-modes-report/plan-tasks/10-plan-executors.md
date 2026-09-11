### Task 10: Rewrite `implement-plan` and `implement-plan-with-subagents`

**Objective:** Make both plan executors run the newest or a named plan folder into a new implementation folder, honour earlier reports that name the same plan, write their report and deviations, queue contradictions, and append log lines only from the orchestrator.

**Input / context:** Starts from task 9's implementation folder and `/update-implementation-report` contracts. `spec.md` `### Planning, the plan check, and implementation` (implementation skills), `### The thread log` (one writer per session; subagents never append); decisions.md DR3, DR8, DR20. Existing bodies: `suite/skills/implement/implement-plan/SKILL.md` and `suite/skills/implement/implement-plan-with-subagents/SKILL.md` (sections `## Inputs`, `## Factual progress records`, `## Run workspace`, `## Procedure`, `## Implementation report`, `## Blocked`, `## Roadmap-descendant feedback`, `## Commit Policy`, `## Plan Deviation Policy`, `## Immutability`; the subagent skill also `## Subagent return contracts (skill-local)`, `## Subagent Briefs`) and the subagent skill's hand-authored references `references/code-quality-reviewer.md`, `references/plan-compliance-reviewer.md`, `references/reviewer-policy.md`. Synced references in both: `references/formats/adr.md`, `references/formats/log-line.md`, `references/formats/implementation-report.md`. Apply the same changes to both skills unless a step says otherwise; `implement` (task 9) is the model for the shared sections.

**Steps:**

1. `## Inputs` in both: the two fixed leading items; `spec.md` (authoritative); the plan folder, the one named in the invocation or the newest under `plans/` by stamp, resolved as `plans/<folder>/plan.md` plus `plan-tasks/` (the artifact executed; a plan not matching the strict shape fails preflight); the thread's `adr/` and `glossary.md`; every `implementations/*/report.md` whose `Plan:` line names the same plan folder (material: tasks they record as completed are skipped after verifying against the code); the newest implementation folder only when told explicitly to continue. Keep the optional task-identifier input.
2. Add `## Implementation folder` and rewrite `## Run workspace` as in task 9 (`implementations/<yymmddhhmm>[-<slug>]/`, `.runs/progress.md`, explicit continue). In `## Procedure`, add the step that reads earlier reports naming the plan and marks their completed tasks as done once verified against the code.
3. Rewrite `## Implementation report` to invoke `/update-implementation-report` with this folder, `Plan: plans/<folder>/`, and the outcome material per `references/formats/implementation-report.md`.
4. Rewrite `## Plan Deviation Policy` as `## Deviations` and fold the contradiction rule into `## Blocked` as in task 9 (producer `/implement-plan` or `/implement-plan-with-subagents`, target this implementation folder's `report.md`).
5. Add `## Settled points and discoveries` as in task 9; in the subagent skill state that only the orchestrator appends to `log.md`, that no subagent brief carries a log instruction, and that a subagent reporting a settled point or a discovery returns it in its reply for the orchestrator to record.
6. Delete `## Roadmap-descendant feedback` in both. Remove every `implementation-report.md`, `.implementation-runs`, `decisions.md`, `proposal`, and `plan.md at the thread root` reference in both bodies, including `## Immutability`, `## Commit Policy`, and `## Factual progress records`.
7. In the subagent skill's `## Subagent Briefs` and the three hand-authored reviewer references, replace paths to the report and run state with the implementation folder's `report.md` and `.runs/`, and replace `decisions.md` with the thread's `adr/` and `spec.md` as the constraint sources.
8. Bump both versions; update `agents/openai.yaml` if needed. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/implement/implement-plan/SKILL.md`, `suite/skills/implement/implement-plan/agents/openai.yaml`, `suite/skills/implement/implement-plan-with-subagents/SKILL.md`, `suite/skills/implement/implement-plan-with-subagents/agents/openai.yaml`, `suite/skills/implement/implement-plan-with-subagents/references/code-quality-reviewer.md`, `suite/skills/implement/implement-plan-with-subagents/references/plan-compliance-reviewer.md`, `suite/skills/implement/implement-plan-with-subagents/references/reviewer-policy.md`

**Verification:**

```sh
P=suite/skills/implement/implement-plan/SKILL.md; W=suite/skills/implement/implement-plan-with-subagents/SKILL.md
grep -rc "implementation-report.md\|implementation-runs\|decisions.md\|proposal\|roadmap feedback\|roadmap-descendant\|append-roadmap-feedback\|DR<N>" $P $W suite/skills/implement/implement-plan-with-subagents/references/*.md   # 0 each
grep -n "^## Inputs" $P $W                                              # both
grep -n "implementations/<yymmddhhmm>" $P $W; grep -n "\.runs/" $P $W  # both
grep -n "plans/" $P $W                                                  # newest or named plan folder
grep -in "earlier report\|reports that name\|already name\|record as completed\|recorded as completed" $P $W   # both
grep -in "verif.*before skipping\|verify against the code\|verifying against the code" $P $W   # both
grep -n "references/formats/implementation-report.md\|references/formats/log-line.md" $P $W    # both files, both refs
grep -in "only the orchestrator" $W                                     # present
grep -n ">>" $P $W; grep -in "contradiction" $P $W; grep -n "emit-pending-decisions" $P $W   # all present
```

**Acceptance criteria:**

- Both skills create a new implementation folder unless told to continue, keep run state under `.runs/`, write `report.md` with the `Plan:` header and a deviations section, and queue a contradiction of a thread ADR or spec decision (AC-9.4).
- Both read earlier reports naming the same plan and skip tasks recorded as completed after verifying against the code (AC-9.5).
- `implement-plan-with-subagents` states that only the orchestrator appends to `log.md` (AC-2.3); neither references roadmap feedback (AC-9.6).

**Consumes:** the implementation folder and `/update-implementation-report` contracts (task 9); the plan folder contract (task 7).

**Produces:** none beyond restating task 9's contracts; the reviews (task 11) and `close-thread` (task 13) read `implementations/*/report.md` as produced here.
