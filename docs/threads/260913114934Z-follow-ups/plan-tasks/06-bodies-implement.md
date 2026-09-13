### Task 6: Rewrite the `implement` bodies

**Objective:** Bring `implement`, `implement-plan`, and `implement-plan-with-subagents` to the body contract with the continuation-run mode gone: every invocation allocates its own implementation folder and is its only writer, the report is written once at the terminal outcome through the instruction, no log write and no "settled with the user" instruction remain, pending decisions and the terminal outcome go through the instructions, no thread resolution, short descriptions.

**Input / context:** `spec.md` § "Skill bodies" (Structure, Inputs, Primitive invocations, Thread resolution, Log writes, Implement skills, Descriptions) and AC-2.2, AC-2.5, AC-3.3, AC-4.1, AC-5.1, AC-6.1. Settled decisions: `decisions.md DR3` (drop the continuation-run mode), `DR5` (implement skills write no log line), `DR1`, `DR2`, `DR6`, `DR7`, `DR8`, `DR10`, `DR16`. Starts from task 5's state. Files: `suite/skills/implement/{implement,implement-plan,implement-plan-with-subagents}/SKILL.md` and the hand-authored references `suite/skills/implement/implement-plan-with-subagents/references/{code-quality-reviewer,plan-compliance-reviewer,reviewer-policy}.md` (checked, edited only if they carry a hit). The body rules in task 4's and task 5's `Input / context` apply unchanged. These three bodies are long and share most of their structure; make the same edit in all three, then read each once end to end.

**Steps:**

1. In each of the three `## Inputs` sections: apply the Inputs rule; delete the item "The newest folder under `implementations/` by stamp, only when the invocation says explicitly to continue…"; in `implement`, the referenced-artifact list says "another thread's artifact, read as history" without "archived"; delete the parenthetical "(Which *thread* is meant is resolved the same way — an unresolvable or ambiguous thread also refuses in preflight.)".
2. In each `## Implementation folder`: delete the paragraph "Only an explicit instruction to continue — … reuses the newest folder … rewriting its `report.md`. Absent that instruction, allocate a fresh folder and never write into one an earlier invocation created." Replace with one sentence: every invocation allocates its own folder and is that folder's only writer.
3. In each `## Procedure`: delete step 2 "Resolve the active thread" and renumber (steps 1–3 become preflight; adjust every "steps 1–4" / "step 5 onward" cross-reference accordingly). In the preflight lead-in and in `## Blocked`, drop "thread" from the lists of preflight failure kinds.
4. In each `## Run workspace`: delete the sentence "A continuation run resumes the newest implementation folder's `.runs/progress.md` and appends to it." Keep the within-invocation recovery sentence.
5. In each `## Implementation report`: replace the `/update-implementation-report` invocation and its bullet list with: at every terminal outcome an executing run reaches (completion, partial completion, a `BLOCKED` halt, or a no-op where the requested state already held), write this folder's `report.md` once per `references/instructions/write-implementation-report.md`, folding the outcome material from `progress.md` re-read from disk (name the material in one sentence: what completed / partially completed / blocked / was already satisfied, the resulting changes, the checks actually run, the deviations per `## Deviations`, remaining concerns, follow-ups). Delete "the primitive merges in place — so hand it the run's end state rather than a running log of earlier passes". Keep the sentences about the per-task self-review feeding the report and, in the subagent skill, that the orchestrator writes it and no subagent reply is loaded as content.
6. In each `## Settled points and discoveries`: delete the block "**A decision settled with the user during the run.** … Then amend `spec.md` in place…" including its `printf` fence; in the subagent skill also delete "**One writer per session.** Only the orchestrator appends to the thread's `log.md`…" and any brief-level instruction that a subagent returns log material. Keep "**A discovery with parent- or sibling-level impact** … Proposing it is the whole action." Rewrite the **Write boundary** sentence to list: the project's code, tests, configuration, and living documentation within this implementation's scope; this invocation's implementation folder with its `report.md` and `.runs/`. Remove "lines appended to the thread's `log.md`" and "amendments to `spec.md` for a decision settled during the run"; the read-never-written list gains `spec.md`; `log.md` is not named anywhere in the body. Rename the section to `## Discoveries` if "settled points" no longer describes it. In `## Deviations` (all three) delete the trailing sentence "A decision settled with the user mid-run is the one thing that changes `spec.md`, under `## Settled points and discoveries`." and repoint any other cross-reference to the renamed section.
7. In each `## Blocked`: apply the pending-decisions rule (queue per `references/instructions/emit-pending-decisions.md`, the report written first per `## Implementation report`, then the `BLOCKED` line); the conflict sentence cites `/consult-adrs`.
8. In each final procedure step ("Final out-message"): apply the terminal-outcome rule — keep the three skill-specific reason forms (`<report path>`, `<diagnosis or bundle path>`, `<reason>`) and point once at `references/instructions/emit-terminal-outcome.md`; remove the sentence "Close with exactly one terminal line from the closed vocabulary" and the token gloss.
9. Read the three hand-authored reviewer references for `docs/threads`, `log.md`, "continue", "archive", or a primitive name; edit only a line that carries one.
10. Rewrite the three descriptions to one short phrase each (for example `description: Execute a strict plan folder task by task on the current working tree, committing per task.`).
11. Run the conflict-rule pass; prune uncited formats (task 3 already removed `formats/log-line.md`; check `formats/adr.md` is still cited — the deviations entry cites ADR stems, so it may stay) and sync.
12. Run the verification block; then read each body once end to end to confirm the cross-references (step numbers, section names) resolve.

**Files modified:** `suite/skills/implement/implement/SKILL.md`, `suite/skills/implement/implement-plan/SKILL.md`, `suite/skills/implement/implement-plan-with-subagents/SKILL.md`, possibly `suite/skills/implement/implement-plan-with-subagents/references/{code-quality-reviewer,plan-compliance-reviewer,reviewer-policy}.md`, possibly `suite/shared/manifest.yaml` and orphan copies (DELETED).

**Verification:**

```sh
G=suite/skills/implement
grep -nE '/(allocate-thread|emit-pending-decisions|emit-pending-review|update-implementation-report)\b' $G/*/SKILL.md $G/*/references/*.md
grep -n 'Resolve the thread\|Resolve the active thread\|cwd\|most recent stamp' $G/*/SKILL.md
grep -n 'docs/threads\|docs/roadmaps\|archiv\|primitive' $G/*/SKILL.md $G/*/references/*.md
grep -n 'awk\|listed with the command\|printf' $G/*/SKILL.md
# AC-4.1
grep -n 'log\.md\|settled with the user\|settles a point with the user' $G/*/SKILL.md $G/*/references/*.md
# AC-6.1
grep -niE 'continu(e|ation) (the|a|an) (previous|newest)|instruction to continue|explicitly to continue|carry on the previous|resum(e|ing|es) the newest|previous implementation|rewriting its' $G/*/SKILL.md   # nothing
for s in implement implement-plan implement-plan-with-subagents; do grep -c 'its own folder\|own new folder' $G/$s/SKILL.md; grep -c 'references/instructions/write-implementation-report.md' $G/$s/SKILL.md; grep -c 'references/instructions/emit-pending-decisions.md' $G/$s/SKILL.md; grep -c 'references/instructions/emit-terminal-outcome.md' $G/$s/SKILL.md; done   # every count >= 1
for f in $G/*/SKILL.md; do awk '/^## Inputs/{f=1;next} f&&/^- /{print FILENAME": "$0; c++} c==2{exit}' $f; done
grep -h '^description:' $G/*/SKILL.md | awk '{ if (length($0) > 140 || $0 ~ /use when|— use/) print "LONG/ROUTING: "$0 }'
grep -n 'Settled points' $G/*/SKILL.md      # nothing if the section was renamed; otherwise every cross-reference must resolve
(cd suite && node scripts/sync-shared-references.mjs) >/dev/null
awk '/^[^ #]/{k=$1; sub(/:$/,"",k)} /^  - /{print k"\t"$2}' suite/shared/manifest.yaml | while IFS=$'\t' read k src; do cmp -s "suite/shared/references/$src" "suite/$k/references/$src" || echo "OUT OF SYNC $k $src"; done   # nothing
```

The AC-6.1 grep must print nothing (the within-invocation recovery sentence does not match it). Every `log.md` hit must be gone.

**Acceptance criteria:**

- The three bodies carry no input, paragraph, or sentence about continuing, carrying on, or resuming a previous implementation folder, and each states that every invocation allocates its own folder and is its only writer.
- No implement body or its references mention `log.md`, a decision settled with the user during the run, a primitive, a thread-resolution step, `docs/threads`, or an archive.
- Each body points at `references/instructions/write-implementation-report.md` in `## Implementation report`, at `references/instructions/emit-pending-decisions.md` in `## Blocked`, and at `references/instructions/emit-terminal-outcome.md` at its final step; every `## Inputs` opens with the two consult pointers.
- Every description is one short phrase; every internal cross-reference (step numbers, section names) resolves; the tree is in sync with no orphan copies.

**Consumes:** synced instruction copies `references/instructions/{write-implementation-report,emit-pending-decisions,emit-terminal-outcome}.md` from task 2; `/consult-adrs` and `/consult-glossary` from task 3; the removal of `formats/log-line.md` from these skills in task 3.

**Produces:** the three `implement` bodies and their hand-authored reviewer references in their structural final shape — continuation mode gone, no log write, free of primitive names, thread-resolution steps, and `docs/threads` paths — which task 9 reads for the expects/leaves lines, task 10 relies on for a clean `docs/threads` search, and task 11 sweeps.
