### Task 7: Rewrite `plan-brief` and `plan-strict`

**Objective:** Make both plan skills read the spec (or a referenced input) and write into a new `plans/<yymmddhhmm>[-<slug>]/` folder on every invocation, keeping their self-checks and routing wrong upstream decisions to pending decisions.

**Input / context:** Starts from task 6. `spec.md` `### Thread layout` (plan folders, stamp and slug rule), `### Planning, the plan check, and implementation` (plan skills, wrong ADR or spec decision during planning), `### Skill inventory`; decisions.md DR8, DR15, DR20. Folder naming fixed in `plan.md`: stamp `yymmddhhmm` UTC; `-<slug>` when the invocation names a purpose or a same-stamp folder exists. Existing bodies: `suite/skills/plan/plan-brief/SKILL.md` (sections `## Inputs`, `## Plan shape`, `## When to recommend plan-strict`, `## Reverse-transition guard`, `## Procedure`, `## Blocked`), `suite/skills/plan/plan-strict/SKILL.md` (sections including `## Replacing an existing plan`) and `suite/skills/plan/plan-strict/references/worked-example.md`. Synced reference in both: `references/formats/adr.md`. `/emit-pending-decisions` takes the fields produced by task 6.

**Steps:**

1. In both skills, replace `## Inputs` with: the two fixed leading items; `spec.md`, the primary input and the plan's authority when present; a referenced artifact or the user's prompt as the primary input when the invocation names one (material, never authority over the spec); `seed.md`; the thread's `adr/` and `glossary.md` (authoritative within the thread; the plan cites ADRs by stem where a task rests on one). Keep the ambiguity refusal. Remove every `decisions.md`, `proposal.md`, and `DR<N>` reference; where the body told the planner to cite `decisions.md DR<N>` in a task's input field, it now cites the spec section or the ADR stem.
2. In both skills, add `## Plan folder`: every invocation creates `plans/<yymmddhhmm>[-<slug>]/` under the thread root (create `plans/` on demand) with the stamp and slug rule above, writes `plan.md` there (`plan-strict` adds `plan-tasks/`), and writes nothing else. Delete `plan-brief`'s `## Reverse-transition guard` and `plan-strict`'s `## Replacing an existing plan`; a plan is never overwritten because every invocation has its own folder. Keep `plan-brief`'s `## When to recommend plan-strict`.
3. In `plan-strict`, change every path the body and the `Invariants` name: the index is `plans/<folder>/plan.md`, task files are `plans/<folder>/plan-tasks/NN-<kebab-slug>.md`; within-plan pointers stay relative to the plan folder (`plan-tasks/01-…md`), thread pointers are thread-relative (`spec.md`). Keep the `Source:` line forms, replacing the `decisions.md` example with `adr/<stem>`.
4. Keep both self-checks (`plan-brief`'s notes on verification, `plan-strict`'s `## Self-Review`).
5. In both `## Blocked` sections: a task that would rest on a thread ADR or spec decision the planner finds wrong is a pending decision, and planning does not proceed on it; hand `/emit-pending-decisions` the producer, the plan folder as target, the originating request, and the points; the plan is still written with the blocked specifics marked inline. An unnoticed conflict with a project ADR or glossary term (per `references/formats/adr.md`) is such a pending decision.
6. Confirmation lines: `Outcome: DONE — Plan written: plans/<folder>/plan.md`. Write boundary: the new plan folder only; never `spec.md`, `adr/`, `docs/adr/`, `docs/glossary.md`.
7. Rewrite `suite/skills/plan/plan-strict/references/worked-example.md` so the task's input cites an ADR stem (for example `per adr/2609051230-use-jose-for-jwt`) and the index excerpt reads `Source: spec.md`; keep everything else.
8. Bump both versions; update `agents/openai.yaml` `short_description` if needed. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/plan/plan-brief/SKILL.md`, `suite/skills/plan/plan-brief/agents/openai.yaml`, `suite/skills/plan/plan-strict/SKILL.md`, `suite/skills/plan/plan-strict/references/worked-example.md`, `suite/skills/plan/plan-strict/agents/openai.yaml`

**Verification:**

```sh
B=suite/skills/plan/plan-brief/SKILL.md; S=suite/skills/plan/plan-strict/SKILL.md; W=suite/skills/plan/plan-strict/references/worked-example.md
grep -c "decisions.md\|proposal\|DR<N>\|DR[0-9]" $B $S $W                    # 0 each
grep -n "^## Inputs" $B $S                                                   # both
grep -n "plans/<yymmddhhmm>" $B $S                                           # both
grep -in "reverse-transition\|replacing an existing plan\|escalat" $B $S    # no output
grep -n "^## Self-Review" $S                                                 # present
grep -n "Outcome: DONE — Plan written: plans/" $B $S                         # both
grep -n "adr/" $W                                                            # present
```

**Acceptance criteria:**

- Both skills create a new `plans/<stamp>[-<slug>]/` folder on every invocation, name the spec or a referenced artifact or prompt as primary input, and keep their self-check (AC-9.1).
- Both carry `## Inputs` opening with the two fixed items (AC-6.1).
- Both queue a pending decision for a wrong thread ADR or spec decision and do not plan on it.

**Consumes:** `references/formats/adr.md` (task 2); the `/emit-pending-decisions` contract (task 6).

**Produces:** the plan folder contract: `plans/<yymmddhhmm>[-<slug>]/plan.md` (brief plan or strict index) and `plans/<folder>/plan-tasks/NN-<kebab-slug>.md`, which `check-plan` (task 8), the plan executors (task 10), the reviews (task 11), and `whats-next` (task 14) resolve as "the newest folder under `plans/` by stamp, or a named one".
