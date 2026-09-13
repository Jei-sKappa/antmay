### Task 7: Rewrite the `review` and `close` bodies

**Objective:** Bring `review-spec`, `review-implementation`, `review-code`, and `close-thread` to the body contract: findings through the pending-review instruction, `close-thread` with no archive move and no closing log line and the roadmap closing line naming the thread by its path relative to `.wip/threads/`, consult pointers, no thread resolution, short descriptions.

**Input / context:** `spec.md` § "Skill bodies" (Structure, Inputs, Primitive invocations, Thread resolution, Log writes, `close-thread`, Descriptions) and AC-2.2, AC-2.5, AC-3.3, AC-4.1, AC-5.1, AC-8.4, AC-8.5. Settled decisions: `decisions.md DR12` (no archive; a closed thread stays where it is), `DR13` (closing line names the path relative to `.wip/threads/`), `DR5` (close-thread writes no log line), `DR1`, `DR2`, `DR6`, `DR7`, `DR8`, `DR10`, `DR16`. Starts from task 6's state. Files: `suite/skills/review/{review-spec,review-implementation,review-code}/SKILL.md`, `suite/skills/close/close-thread/SKILL.md`. The body rules in task 4's and task 5's `Input / context` apply unchanged. One further rule for the reviews:

- **Findings.** Every `## Recording findings` section that hands findings to `/emit-pending-review` instead says: when you hold one or more findings, record them as one bundle per `references/instructions/emit-pending-review.md`, naming yourself as reviewer and `<target>` as the target; the finding fields the section lists (severity, category, finding, evidence, impact, suggested action) stay only where they carry a review-specific rule (the review's own categories, what counts as a blocker for this review); the generic field list collapses into the pointer.

**Steps:**

1. `review-spec/SKILL.md`: Inputs rule; procedure step 1 "Resolve the thread" is deleted and the "Two situations make a findings bundle physically impossible" sentence loses the thread case (keep the missing-`spec.md` refusal in the gather step); the report step applies the terminal-outcome rule; `## Recording findings` applies the findings rule; any `references/formats/adr.md` citation for the conflict rule → `/consult-adrs`. Rewrite the description.
2. `review-implementation/SKILL.md`: same edits; the "newest folder under `implementations/`" resolution stays (it is the target, not the thread); the conflict/authority sentences cite `/consult-adrs` where they cite the ADR format for the rule. Rewrite the description.
3. `review-code/SKILL.md`: same edits. Rewrite the description.
4. `close-thread/SKILL.md`, rewritten section by section:
   - Opening paragraph: close one thread end to end — check, land the ADRs, merge the glossary, write the roadmap closing line, leave the folder in place; "Writing the last record is where you stop — do not stage, commit, or push." No "archive", no "move".
   - `## Inputs`: Inputs rule; drop the "Resolve the thread first…" sentence; the roadmap index is under `.wip/roadmaps/`; the thread's layout cites `references/formats/thread.md`; the glossary shape cites `references/formats/glossary.md`.
   - `## Checks before any write`: check 4 loses "unless the invocation says explicitly to archive anyway" — replace with "unless the invocation says explicitly to close anyway"; "carry them into the archive untouched" becomes "leave them in place and name them in the report".
   - `## Blocked`: pending-decisions rule; "the thread stays where it is" may stay (it is true in every case now — reword so it is not a contrast with a move).
   - `## Writes`: step 1 land ADRs (`git mv` into `docs/adr/`, supersession moves) unchanged; step 2 merge the glossary unchanged, citing `references/formats/glossary.md`; step 3 becomes: insert `Closed: <thread path relative to .wip/threads/> — <one-line outcome>` as the first line beneath the entry's heading; delete step 4 (closing event) and step 5 (archive) entirely; the report step states what landed, moved, merged, which entry was updated, and the names of any `.pending-decisions/`, `.pending-reviews/`, or run-state folders left in place, and applies the terminal-outcome rule with `Outcome: DONE — Thread closed: <thread path relative to .wip/threads/>`.
   - `## Refusals`: drop the two thread-resolution items; keep the malformed-draft refusal.
   - `## Write boundary`: the landed records in `docs/adr/`, the superseded records moved into `docs/adr/superseded/`, the merged `docs/glossary.md`, and one line beneath one entry heading of the roadmap index the seed names. Nothing else — no log line, no move.
   - State once, positively, that the thread folder stays in place after the close (for example under `## Writes` or the opening paragraph), as the spec requires (AC-8.5).
   - Rewrite the description (for example `description: Close a thread by landing its ADRs and glossary terms into the project layer.`).
5. Run the conflict-rule pass over the four bodies.
6. Prune uncited formats (close-thread keeps `formats/adr.md`, `formats/glossary.md`, `formats/roadmap-index.md`, `formats/thread.md`, `formats/implementation-report.md`; drop `formats/log-line.md` from its manifest entry and `git rm` the orphan copy, since it no longer writes the log) and sync.
7. Run the verification block.

**Files modified:** `suite/skills/review/review-spec/SKILL.md`, `suite/skills/review/review-implementation/SKILL.md`, `suite/skills/review/review-code/SKILL.md`, `suite/skills/close/close-thread/SKILL.md`, `suite/shared/manifest.yaml`, `suite/skills/close/close-thread/references/formats/log-line.md` (DELETED), possibly other orphan copies (DELETED).

**Verification:**

```sh
F="suite/skills/review/*/SKILL.md suite/skills/close/close-thread/SKILL.md"
grep -nE '/(allocate-thread|emit-pending-decisions|emit-pending-review|update-implementation-report)\b' $F
grep -n 'Resolve the thread\|Resolve the active thread\|cwd\|most recent stamp' $F
grep -n 'docs/threads\|docs/roadmaps\|archiv\|primitive\|git mv the whole thread\|move the thread' $F
grep -n 'awk\|listed with the command\|printf\|log\.md' $F
for f in $F; do awk '/^## Inputs/{f=1;next} f&&/^- /{print FILENAME": "$0; c++} c==2{exit}' $f; done
for s in review-spec review-implementation review-code; do grep -c 'references/instructions/emit-pending-review.md' suite/skills/review/$s/SKILL.md; grep -c 'references/instructions/emit-terminal-outcome.md' suite/skills/review/$s/SKILL.md; done   # >= 1 each
grep -c 'references/instructions/emit-pending-decisions.md' suite/skills/close/close-thread/SKILL.md   # >= 1
grep -c 'references/instructions/emit-terminal-outcome.md' suite/skills/close/close-thread/SKILL.md    # >= 1
grep -n 'relative to `\?\.wip/threads/' suite/skills/close/close-thread/SKILL.md                        # >= 1 (the closing line)
grep -n -i 'stays in place\|remains in place\|left in place' suite/skills/close/close-thread/SKILL.md   # >= 1
grep -h '^description:' $F | awk '{ if (length($0) > 140 || $0 ~ /use when|— use/) print "LONG/ROUTING: "$0 }'
test ! -e suite/skills/close/close-thread/references/formats/log-line.md
(cd suite && node scripts/sync-shared-references.mjs) >/dev/null
awk '/^[^ #]/{k=$1; sub(/:$/,"",k)} /^  - /{print k"\t"$2}' suite/shared/manifest.yaml | while IFS=$'\t' read k src; do cmp -s "suite/shared/references/$src" "suite/$k/references/$src" || echo "OUT OF SYNC $k $src"; done   # nothing
```

**Acceptance criteria:**

- None of the four bodies names a primitive, a thread-resolution step, `docs/threads`, `docs/roadmaps`, an archive, a move of the thread folder, or `log.md`.
- The three reviews record findings through `references/instructions/emit-pending-review.md` and end through `references/instructions/emit-terminal-outcome.md`.
- `close-thread` lands ADRs into `docs/adr/`, merges glossary terms into `docs/glossary.md`, writes `Closed: <thread path relative to .wip/threads/> — <outcome>` beneath the roadmap entry, states that the folder stays in place, lists no move and no log line among its writes, and queues decisions through `references/instructions/emit-pending-decisions.md`.
- Every `## Inputs` opens with the two consult pointers; every description is one short phrase; the tree is in sync with no orphan copies.

**Consumes:** synced instruction copies `references/instructions/{emit-pending-review,emit-pending-decisions,emit-terminal-outcome}.md` from task 2; `references/formats/thread.md` and `references/formats/glossary.md` copies and the `suite/skills/close/close-thread/` path from task 3.

**Produces:** none
