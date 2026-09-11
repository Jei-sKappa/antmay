### Task 9: Rewrite `update-implementation-report` and `implement`

**Objective:** Make `update-implementation-report` write one implementation folder's `report.md` with the plan header and the deviations section, and make `implement` create its implementation folder, keep run state under it, write its report on every terminal outcome, queue contradictions, and append log lines.

**Input / context:** Starts from task 8. `spec.md` `### Thread layout` (implementation folders, `.runs/`, continue rule), `### Planning, the plan check, and implementation` (implementation skills, wrong decision discovered downstream, `update-implementation-report`), `### The project layer` (living documentation changes within implementation scope), `### The thread log` (settling skills append; only the orchestrator appends); decisions.md DR5, DR8, DR20, DR3. Folder naming and report header fixed in `plan.md`: `implementations/<yymmddhhmm>[-<slug>]/`, `Plan: plans/<folder>/` or `Plan: none`, `## Deviations`. Existing bodies: `suite/skills/primitives/update-implementation-report/SKILL.md`, `suite/skills/implement/implement/SKILL.md` (sections `## Inputs`, `## Factual progress records`, `## Dirty worktree handling`, `## Procedure`, `## Run workspace`, `## Implementation report`, `## Blocked`, `## Roadmap-descendant feedback`, `## Commit Policy`, `## Plan Deviation Policy`). Synced references in both: `references/formats/adr.md`, `references/formats/implementation-report.md`; `implement` also has `references/formats/log-line.md`. Plan folders come from task 7; `/emit-pending-decisions` fields from task 6.

**Steps:**

1. `update-implementation-report`: the description names the target as one implementation folder's `report.md`. Precondition: the caller supplies the implementation folder path, the plan folder executed or the statement that none was used, and the outcome material (completed, partial, blocked, or already satisfied; changes; checks performed; deviations each naming what was built, the spec section or ADR stem departed from, and why; remaining concerns; follow-ups). Add `## Inputs` (the two fixed leading items, with the ADR catalog clause "for the stems a deviation entry cites"; the existing `report.md` in the named folder when present, the merge target). Replace `## Report contract` with a pointer to `references/formats/implementation-report.md`. Keep `## Merge semantics` for the same folder's report (current state, no history) and `## Content boundaries` (no `.runs/` path, no transcripts). Bump the version.
2. `implement` `## Inputs`: the two fixed leading items; `spec.md` when present (authoritative); `seed.md`; the thread's `adr/` and `glossary.md` (authoritative within the thread); a plan folder when the invocation points at one, the named folder or the newest under `plans/` by stamp (`plan.md`, material the run executes); a referenced artifact or the user's prompt when the run starts from one (material); the newest folder under `implementations/` only when the invocation says explicitly to continue.
3. Add `## Implementation folder`: every invocation creates `implementations/<yymmddhhmm>[-<slug>]/` (stamp and slug rule from `plan.md`; create `implementations/` on demand); only an explicit instruction to continue reuses the newest implementation folder and its run state. Rewrite `## Run workspace` so `progress.md` lives at `implementations/<folder>/.runs/progress.md`; keep the append discipline and compaction-recovery rules.
4. Rewrite `## Implementation report`: on every terminal outcome invoke `/update-implementation-report` with this folder, the plan folder executed or none, and the outcome material folded from `progress.md`; the report is `implementations/<folder>/report.md` per `references/formats/implementation-report.md`.
5. Rewrite `## Plan Deviation Policy` as `## Deviations`: a deviation that stays within accepted intent proceeds and is recorded in the report's `## Deviations`, each entry naming what was built, the spec section or ADR stem departed from, and why; a contradiction of a thread ADR or of a spec decision is a change of intent, queued through `/emit-pending-decisions` (producer `/implement`, target this implementation folder's `report.md`, originating request, points), and ends the run `BLOCKED` after the report is written. Fold this into `## Blocked`.
6. Add `## Settled points and discoveries`: a human decision obtained mid-run is appended to `log.md` with a shell append per `references/formats/log-line.md` before acting on it, and `spec.md` is amended in place (superseded text kept, marked, dated, with the reason); a parent-level discovery is a proposed ADR or a proposed roadmap entry surfaced to the user in chat and in the report's follow-ups, never a write. State the write boundary: project code, tests, and living documentation within the implementation's scope; the implementation folder; `log.md` lines; spec amendments for settled decisions; never `docs/adr/`, `docs/glossary.md`, or another thread.
7. Delete `## Roadmap-descendant feedback`. Remove every `implementation-report.md`, `.implementation-runs`, `decisions.md`, and `proposal` reference elsewhere in the body (`## Factual progress records`, `## Commit Policy`, `## Procedure`). Bump the version.
8. Update both `agents/openai.yaml` `short_description` lines if needed. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/primitives/update-implementation-report/SKILL.md`, `suite/skills/primitives/update-implementation-report/agents/openai.yaml`, `suite/skills/implement/implement/SKILL.md`, `suite/skills/implement/implement/agents/openai.yaml`

**Verification:**

```sh
U=suite/skills/primitives/update-implementation-report/SKILL.md; I=suite/skills/implement/implement/SKILL.md
grep -c "implementation-report.md\|implementation-runs\|decisions.md\|proposal\|roadmap feedback\|roadmap-descendant\|append-roadmap-feedback\|DR<N>" $U $I   # 0 each
grep -n "^## Inputs" $U $I                                                     # both
grep -n "implementations/<yymmddhhmm>" $I                                      # present
grep -n "\.runs/" $I                                                           # present
grep -in "continue" $I                                                         # explicit continue reuses the newest folder
grep -n "references/formats/implementation-report.md" $U $I                    # both
grep -n "## Deviations\|Deviations" $U $I                                      # both
grep -in "spec section or ADR stem\|ADR stem" $U $I                            # both
grep -in "contradiction" $I; grep -n "emit-pending-decisions" $I               # present
grep -n ">>" $I; grep -n "references/formats/log-line.md" $I                   # present
grep -n "docs/adr/\|docs/glossary.md" $I                                       # stated as never written
grep -n "Plan: " $U                                                            # header line referenced
```

**Acceptance criteria:**

- `update-implementation-report` targets one implementation folder's `report.md`, includes the `Plan:` header and the deviations section, and carries `## Inputs` (AC-9.7, AC-6.1).
- `implement` creates a new `implementations/<stamp>[-<slug>]/` folder unless told to continue, keeps run state under its `.runs/`, writes `report.md` on every terminal outcome with the plan header and a deviations section whose entries name what was built, what they depart from, and why, and queues a contradiction of a thread ADR or spec decision as a pending decision (AC-9.4).
- `implement` references no roadmap feedback and appends to `log.md` with a shell append (AC-9.6, AC-2.2).

**Consumes:** `references/formats/implementation-report.md`, `references/formats/log-line.md`, `references/formats/adr.md` (task 2); the plan folder contract (task 7); the `/emit-pending-decisions` contract (task 6).

**Produces:** the `/update-implementation-report` caller contract (implementation folder path; plan folder or none; outcome material with deviations) and the implementation folder contract (`implementations/<yymmddhhmm>[-<slug>]/report.md` and `.runs/progress.md`) that tasks 10, 11, 13, and 14 rely on.
