### Task 5: Rewrite the `spec`, `plan`, and `roadmap` bodies

**Objective:** Bring `spec`, `plan-brief`, `plan-strict`, `check-plan`, and `roadmap` to the body contract: consult pointers, no thread resolution, the log line (spec only), pending decisions, and the terminal outcome through the synced instructions, `.wip/` paths, the `finish`/`whats-next` sentence gone from `roadmap`, short descriptions.

**Input / context:** `spec.md` § "Skill bodies" (Structure, Inputs, Primitive invocations, Thread resolution, Log writes, `roadmap`, Descriptions) and AC-2.2, AC-2.5, AC-3.3, AC-4.1, AC-5.1, AC-8.2, AC-8.4. Settled decisions: `decisions.md DR1`, `DR2`, `DR5`, `DR6`, `DR7`, `DR8`, `DR10`, `DR12`, `DR13`, `DR14`, `DR16`. Starts from task 4's state. Files: `suite/skills/spec/spec/SKILL.md`, `suite/skills/plan/{plan-brief,plan-strict,check-plan}/SKILL.md`, `suite/skills/plan/plan-strict/references/worked-example.md`, `suite/skills/roadmap/roadmap/SKILL.md`. The body rules listed in task 4's `Input / context` apply unchanged here (Inputs opening, no thread resolution, `.wip/` paths, description form, full skill-relative pointers, manifest pruning + sync). Two further rules for completion-oriented skills:

- **Pending decisions.** Every `## Blocked` section that hands decisions to `/emit-pending-decisions` instead says: finish everything safely derivable, then queue the open decision(s) per `references/instructions/emit-pending-decisions.md`, naming yourself as producer, `<target>` as the target, the originating request, and one point per decision; then stop with the `BLOCKED` line. The bullet list of what to hand over collapses into that sentence — the instruction file carries the point fields. Keep every sentence that is the skill's own judgment (what counts as a decision here, what a blocked run still writes).
- **Terminal outcome.** The final procedure step and each `Outcome:` sentence keep the skill's exact confirmation text and point at `references/instructions/emit-terminal-outcome.md` once, at the final step (for example: "End per `references/instructions/emit-terminal-outcome.md` with `Outcome: DONE — Spec written: spec.md`"). The token explanations ("DONE means…") that restate the instruction are removed.

**Steps:**

1. `spec/SKILL.md`: apply the Inputs rule. Procedure step 1 keeps the preflight sentence and the input-resolution refusal but loses "Resolve the thread… `cwd`… most recent stamp" and the "no thread exists yet" clause. Step 5 writes `spec.md` at the thread root; cross-thread references are `.wip/threads/<other>/…`. Step 6 appends the `event` line per `references/instructions/append-log-line.md`, keeping the sentence that this line is the cursor the next amendment pass starts after, losing the `printf` block and shell-append sentences. Step 7 applies the terminal-outcome rule. `## Blocked` applies the pending-decisions rule; its conflict sentence cites `/consult-adrs`. Rewrite the description.
2. `plan-brief/SKILL.md`: Inputs rule; the referenced-artifact list says "another thread's artifact, read as history" without "archived"; project-level references are `docs/adr/<stem>.md` and cross-thread ones `.wip/threads/<other>/…`; procedure step 1 loses thread resolution; the final step applies the terminal-outcome rule; `## Blocked` applies the pending-decisions rule and cites `/consult-adrs` for the conflict rule. Rewrite the description.
3. `plan-strict/SKILL.md`: same as plan-brief; additionally the `Source:` line's repo-relative example becomes `.wip/threads/<other>/spec.md` and the `## Invariants` pointer-frame example loses any `docs/threads` path. `plan-strict/references/worked-example.md`: check for thread paths or removed concepts; rewrite any found.
4. `check-plan/SKILL.md`: Inputs rule; step 1 loses thread resolution; the confirm step applies the terminal-outcome rule; `## Blocked` applies the pending-decisions rule and cites `/consult-adrs`. Rewrite the description.
5. `roadmap/SKILL.md`: Inputs rule; the preflight paragraph loses thread resolution; the index is written at `.wip/roadmaps/<yymmddhhmm>-<slug>.md`, created on demand; the slug bullet loses "Naming it from the thread is what lets `finish` and `whats-next` find the index a thread authored" — keep "the slug is the thread's own slug unless the invocation names one" as the rule; `## Blocked` applies the pending-decisions rule; the report applies the terminal-outcome rule; the recommendation to close the thread with `close-thread` stays. Rewrite the description (it currently names `docs/roadmaps/`).
6. Run the conflict-rule pass over the five bodies (`references/formats/adr.md` for the catalog or the conflict rule → `/consult-adrs`; a citation of the ADR file shape may stay only where the skill reads or writes a record's fields).
7. Prune uncited formats from the manifest and delete orphan copies; run `cd suite && node scripts/sync-shared-references.mjs && cd ..`.
8. Run the verification block.

**Files modified:** `suite/skills/spec/spec/SKILL.md`, `suite/skills/plan/plan-brief/SKILL.md`, `suite/skills/plan/plan-strict/SKILL.md`, `suite/skills/plan/plan-strict/references/worked-example.md`, `suite/skills/plan/check-plan/SKILL.md`, `suite/skills/roadmap/roadmap/SKILL.md`, possibly `suite/shared/manifest.yaml` and orphan copies under these skills' `references/formats/` (DELETED).

**Verification:**

```sh
F="suite/skills/spec/spec/SKILL.md suite/skills/plan/*/SKILL.md suite/skills/roadmap/roadmap/SKILL.md suite/skills/plan/plan-strict/references/worked-example.md"
grep -nE '/(allocate-thread|emit-pending-decisions|emit-pending-review|update-implementation-report)\b' $F
grep -n 'Resolve the thread\|Resolve the active thread\|cwd\|most recent stamp' $F
grep -n 'docs/threads\|docs/roadmaps\|archiv\|recipe\|primitive' $F; grep -nw 'whats-next\|finish' $F
grep -n 'awk\|listed with the command\|printf' $F
for f in suite/skills/spec/spec/SKILL.md suite/skills/plan/*/SKILL.md suite/skills/roadmap/roadmap/SKILL.md; do awk '/^## Inputs/{f=1;next} f&&/^- /{print FILENAME": "$0; c++} c==2{exit}' $f; done
for f in suite/skills/spec/spec/SKILL.md suite/skills/plan/*/SKILL.md suite/skills/roadmap/roadmap/SKILL.md; do grep -c 'references/instructions/emit-terminal-outcome.md' $f; grep -c 'references/instructions/emit-pending-decisions.md' $f; done   # every count >= 1
grep -c 'references/instructions/append-log-line.md' suite/skills/spec/spec/SKILL.md   # >= 1
grep -l 'log.md' suite/skills/plan/*/SKILL.md suite/skills/roadmap/roadmap/SKILL.md     # nothing
grep -n '\.wip/roadmaps/' suite/skills/roadmap/roadmap/SKILL.md | head -1               # at least one
grep -h '^description:' $F | awk '{ if (length($0) > 140 || $0 ~ /use when|— use/) print "LONG/ROUTING: "$0 }'
(cd suite && node scripts/sync-shared-references.mjs) >/dev/null
awk '/^[^ #]/{k=$1; sub(/:$/,"",k)} /^  - /{print k"\t"$2}' suite/shared/manifest.yaml | while IFS=$'\t' read k src; do cmp -s "suite/shared/references/$src" "suite/$k/references/$src" || echo "OUT OF SYNC $k $src"; done   # nothing
```

**Acceptance criteria:**

- None of the five bodies (nor the worked example) names a primitive, a thread-resolution step, `docs/threads`, `docs/roadmaps`, an archive, a recipe, `finish`, `whats-next`, or the awk catalog command.
- Every `## Inputs` opens with `/consult-adrs` then `/consult-glossary`.
- Each of the five bodies points at `references/instructions/emit-pending-decisions.md` in its `## Blocked` section and at `references/instructions/emit-terminal-outcome.md` at its final step; `spec` alone appends to `log.md`, through `references/instructions/append-log-line.md`.
- `roadmap` writes `.wip/roadmaps/<yymmddhhmm>-<slug>.md` and no longer mentions `finish` or `whats-next`.
- Every description is one short phrase with no routing clause; the tree is in sync with no orphan copies.

**Consumes:** synced instruction copies `references/instructions/{append-log-line,emit-pending-decisions,emit-terminal-outcome}.md` from task 2; `/consult-adrs` and `/consult-glossary` from task 3.

**Produces:** the `spec`, `plan-brief`, `plan-strict`, `check-plan`, and `roadmap` bodies and `plan-strict/references/worked-example.md` in their structural final shape — free of primitive names, thread-resolution steps, and `docs/threads` paths — which task 9 reads for the expects/leaves lines, task 10 relies on for a clean `docs/threads` search, and task 11 sweeps.
