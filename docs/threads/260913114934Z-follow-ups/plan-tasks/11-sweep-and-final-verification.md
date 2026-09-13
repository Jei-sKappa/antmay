### Task 11: Sweep every body and skill-local reference, then verify the whole change

**Objective:** Read every skill body and skill-local reference in full, partitioned by skill group across subagents, report every hit of the six defect classes by file, line, and class before any edit, resolve every hit, confirm the description rule per role, and run every acceptance check of the spec against the finished suite and documents.

**Input / context:** `spec.md` § "Skill bodies → The sweep", § "Descriptions", and AC-10.1 … AC-10.3 plus the whole `## Acceptance guidance`. Settled decisions: `decisions.md DR4` (the dead-concept test), `DR16` (the six classes, one sweep after the structural changes, partitioned by group across subagents, report before edit, remove or replace with the positive instruction and nothing beyond the hit, the description rule per role), `DR7` (the review-time test for class 4). The thread root is now `.wip/threads/2026/09/13-1149-follow-ups/` (task 10). This run's implementation folder is `implementations/<this run>/` under that root; the sweep report is written to its `.runs/sweep-report.md`. The suite's authoring conventions for the sweep are in `suite/authoring/body-structure.md` (task 8) — hand that file to every subagent.

The six classes, as each subagent reports them:

1. **Posture mismatch** — a completion-oriented skill asking, confirming, or settling anything with the user mid-run; an interactive skill emitting a terminal outcome or queuing a pending decision.
2. **Dead-concept negation** — a sentence whose only referent is a removed design (test: does it forbid something a reader with no memory of the old design would plausibly do anyway? if not, it is a hit).
3. **Restated guarantee** — telling the agent something a format, the harness, or another instruction already fixes, or something the agent cannot do anyway.
4. **Skill-independent block inline** — a block that still reads correctly with the skill's name and purpose removed (belongs in an instruction).
5. **Routing prose in the body** — any "when to use this skill" text.
6. **Repository leakage** — decision IDs, phase names, internal labels, thread paths of this repository, or explanations of how this repository is organised.

**Steps:**

1. Dispatch one subagent per skill group — `capture-discussion`, `close`, `implement`, `model-invoked`, `plan`, `review`, `roadmap`, `spec` (eight dispatches; merge `roadmap` and `spec` into one if the runtime limits dispatches). Each subagent receives: its group's folder path, `suite/authoring/body-structure.md`, the six classes above, and the instruction to read every `SKILL.md` and every hand-authored file under `references/` (not the generated `references/formats/` and `references/instructions/` copies) in full and to reply with a list of hits — `file:line — class N — the sentence — proposed fix` — and to edit nothing.
2. Collect the replies into `implementations/<this run>/.runs/sweep-report.md`: one `##` section per skill group, one line per hit in the shape above, and a `no hits` line for a group that reports none. Write the report before any edit.
3. Resolve every hit yourself (or through a fresh implementer subagent per group, handed the report section): remove the sentence, or replace it with the positive instruction it guarded; rewrite nothing beyond the hit. A class-4 hit that qualifies as an instruction under the review-time test becomes a new file under `suite/shared/references/instructions/`, declared in the manifest for its readers, pointed at from the step, and synced — record each such extraction in the report under a closing `## Extracted instructions` section (the spec asks for it to be reported).
4. Description pass (AC-10.3): read every `description:` line; every user-invoked skill's is one short plain phrase; each model-invoked skill's states its invocation condition precisely and completely. Fix any that fails and add the fix to the report.
5. Run the sync script and the marketplace check: `cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && cd ..`.
6. Run the full verification block below — it is the spec's acceptance guidance end to end. Fix anything it catches (a fix outside the sweep's remit — a missed structural edit from an earlier task — is still made here and recorded in the report's `## Out-of-sweep fixes` section).
7. Spot-read three bodies end to end (`spec`, `implement-plan`, `close-thread`) for any sentence of the six classes; record the result in the report.

**Files modified:** `.wip/threads/2026/09/13-1149-follow-ups/implementations/<this run>/.runs/sweep-report.md` (NEW, gitignored), any `suite/skills/*/*/SKILL.md` or hand-authored `suite/skills/*/*/references/*.md` carrying a hit, possibly new `suite/shared/references/instructions/<act>.md` files with their manifest entries and synced copies, possibly `suite/shared/manifest.yaml`.

**Verification:**

```sh
TH=.wip/threads/2026/09/13-1149-follow-ups
S=suite/skills
# AC-10.1
ls $TH/implementations/*/.runs/sweep-report.md && grep -c '^## ' $TH/implementations/*/.runs/sweep-report.md   # >= 8
# AC-1
for f in suite/shared/references/formats/*.md; do [ "$(grep -E '^## ' "$f" | tr '\n' '|')" = "## Shape|## Rules|" ] || echo "BAD $f"; head -1 "$f" | grep -qE '^# .* format$' || echo "BAD H1 $f"; done
grep -lE '^```sh|^#+ (Catalog|Conflicts|Appending|Citing)' suite/shared/references/formats/*.md
# AC-2
ls suite/shared/references/instructions/ | wc -l    # >= 6
grep -rnE '/(allocate-thread|emit-pending-decisions|emit-pending-review|update-implementation-report)\b' $S
test ! -e $S/primitives
for s in spec/spec plan/plan-brief plan/plan-strict plan/check-plan implement/implement implement/implement-plan implement/implement-plan-with-subagents review/review-spec review/review-implementation review/review-code roadmap/roadmap close/close-thread; do grep -q 'references/instructions/emit-terminal-outcome.md' $S/$s/SKILL.md || echo "no terminal pointer: $s"; done
# AC-3
grep -L 'disable-model-invocation: true' $S/*/*/SKILL.md            # exactly the two model-invoked
grep -l 'policy' $S/model-invoked/*/agents/openai.yaml                # nothing
grep -L 'allow_implicit_invocation: false' $S/*/*/agents/openai.yaml # exactly the two model-invoked
grep -rn 'awk -v stem' $S --include=SKILL.md | grep -v model-invoked/consult-adrs    # nothing
for f in $S/*/*/SKILL.md; do grep -q '^## Inputs' $f || continue; awk '/^## Inputs/{f=1;next} f&&/^- /{print FILENAME": "$0; c++} c==2{exit}' $f | grep -vq 'consult-adrs\|consult-glossary' && echo "BAD INPUTS $f"; done
# AC-4 / AC-5 / AC-6
grep -l 'log\.md' $S/implement/*/SKILL.md $S/close/close-thread/SKILL.md    # nothing (AC-4.1); discussion, resolve-pending-decisions, spec, and open-thread may mention it
grep -rn 'settled with the user during the run' $S
grep -rn 'Resolve the thread\|Resolve the active thread\|cwd\|most recent stamp' $S --include=SKILL.md
grep -rniE 'continu(e|ation) (the|a|an) (previous|newest)|carry on the previous|resum(e|es|ing) the newest|rewriting its report' $S/implement
# AC-7
ls $S | sort | tr '\n' ' '; echo                      # capture-discussion close implement model-invoked plan review roadmap spec
test ! -e suite/shared/references/recipes; grep -rni 'recipe' suite README.md AGENTS.md    # nothing (AC-7.2)
(cd suite && node scripts/check-marketplace-skills.mjs)
grep -h 'version:' $S/*/*/SKILL.md | sort -u          # one line: 0.0.0
(cd suite && node scripts/sync-shared-references.mjs) >/dev/null
awk '/^[^ #]/{k=$1; sub(/:$/,"",k)} /^  - /{print k"\t"$2}' suite/shared/manifest.yaml | while IFS=$'\t' read k src; do cmp -s "suite/shared/references/$src" "suite/$k/references/$src" || echo "OUT OF SYNC $k $src"; done   # nothing
# AC-8 (docs/glossary.md excluded by decision — see plan.md)
test ! -e docs/threads
grep -rn 'docs/threads\|docs/roadmaps' --exclude-dir=cli --exclude-dir=.wip --exclude-dir=node_modules --exclude-dir=.git . | grep -v '^./docs/glossary.md'
grep -rniE '\barchiv' suite README.md AGENTS.md CONTRIBUTING.md docs/documentation-rules.md docs/working-with-threads.md
grep -n -i 'stays in place\|remains in place\|left in place' $S/close/close-thread/SKILL.md | head -1
# AC-9 (docs/glossary.md excluded by decision — see plan.md)
test ! -e suite/method.md && test ! -e suite/skill-authoring.md && [ "$(ls suite/authoring | wc -l | tr -d ' ')" = 5 ]
grep -rn 'method.md' . --exclude-dir=cli --exclude-dir=.wip --exclude-dir=node_modules --exclude-dir=.git | grep -v '^./docs/glossary.md'
wc -l AGENTS.md suite/AGENTS.md
grep -oE '\./suite/skills/[a-z-]+/[a-z-]+/SKILL.md' README.md | sort -u | while read p; do test -f "$p" || echo "DEAD $p"; done
# AC-10.3
grep -h '^description:' $S/{capture-discussion,close,implement,plan,review,roadmap,spec}/*/SKILL.md | awk '{ if (length($0) > 140 || $0 ~ /use when|— use/) print "LONG/ROUTING: "$0 }'
grep -h '^description:' $S/model-invoked/*/SKILL.md
# AC-11.1
test -f $TH/glossary.md
```

Every line marked `# nothing` prints nothing; every `test` succeeds; the two `grep -L` lines print exactly the two model-invoked skills; `wc -l` shows each `AGENTS.md` under 80.

**Acceptance criteria:**

- `implementations/<this run>/.runs/sweep-report.md` exists under the thread's new root, with one section per skill group listing every hit by file, line, and class, plus the extracted-instructions and out-of-sweep-fixes sections (each possibly saying none).
- Every listed hit is resolved in the final bodies with nothing beyond the hit rewritten; the three spot-read bodies carry no sentence of the six classes.
- Every user-invoked description is one short phrase; both model-invoked descriptions state their invocation condition.
- The verification block runs clean end to end: the spec's AC-1 through AC-11 hold, with `docs/glossary.md` excluded from AC-8.2 and AC-9.5 by the decision recorded in `plan.md`, and `cli/` untouched.

**Consumes:** the final bodies and references from tasks 4–7; `suite/authoring/body-structure.md` (task 8) as the subagents' brief; the thread root `.wip/threads/2026/09/13-1149-follow-ups/` from task 10.

**Produces:** none
