### Task 4: Rewrite the `capture-discussion` bodies

**Objective:** Bring `discussion`, `open-thread`, `open-ticket`, and `resolve-pending-decisions` to the body contract: consult pointers at the top of `## Inputs`, no thread-resolution step, log writes and thread creation through the synced instructions, `.wip/` paths, short descriptions.

**Input / context:** `spec.md` § "Skill bodies" (Structure, Inputs, Primitive invocations, Thread resolution, Log writes, `open-thread`, Descriptions) and AC-2.2, AC-3.3, AC-4.1, AC-5.1, AC-7.2, AC-8.4. Settled decisions: `decisions.md DR1`, `DR2`, `DR5`, `DR6`, `DR7`, `DR8`, `DR10`, `DR12`, `DR13`, `DR14`, `DR16`. Starts from task 3's tree. Files: `suite/skills/capture-discussion/{discussion,open-thread,open-ticket,resolve-pending-decisions}/SKILL.md`, `suite/skills/capture-discussion/open-thread/references/supplied-ticket.md`, and each skill's `agents/openai.yaml` (unchanged unless the `short_description` names a removed concept). Synced instruction copies from task 2 sit at `references/instructions/<name>.md` inside each skill. The sweep (task 11) handles the six defect classes across whole bodies; this task makes the structural changes and rewrites only the sentences they touch.

Rules applied in every body task:

- `## Inputs` opens with these two items, replacing the `docs/adr/` and `docs/glossary.md` items: `/consult-adrs` — read the project decisions relevant to <the target> before starting; authoritative. `/consult-glossary` — write the project's fixed terms; authoritative. Any later sentence that sends the agent to `references/formats/adr.md` for the catalog command or the conflict rule sends it to `/consult-adrs` instead; a sentence that cites `references/formats/adr.md` for the *file shape* of a record the skill writes or lands stays.
- No sentence about resolving the active thread, checking `cwd`, choosing among thread roots, or "most recent stamp". The thread is the folder holding the artifact the invocation names; where a body listed "no thread / ambiguous thread" among its refusals or preflight failures, drop those items and leave the ordinary input-ambiguity handling.
- Every path `docs/threads/<…>` becomes the thread root or `.wip/threads/<…>`; `docs/roadmaps/` becomes `.wip/roadmaps/`; a mention of an archived thread or `docs/threads/archive/` is removed or rewritten to name a thread by its path (a closed thread stays where it is).
- `description:` becomes one short plain phrase saying what the skill does, with no "use when" clause (for example `description: Interview the user to settle decisions into the thread's log, ADRs, and glossary.`).
- A body points at a reference by its full skill-relative path; a pointer to an instruction sits at the step where the act happens.
- After editing, drop from `suite/shared/manifest.yaml` any format the skill's body no longer cites (and `git rm` its orphan copy), then re-run the sync script.

**Steps:**

1. `discussion/SKILL.md`: apply the Inputs rule (the roadmap index item names `.wip/roadmaps/`). Delete procedure step 1 "Resolve the thread" and renumber. Step 4's conflict classification cites `/consult-adrs` for the rule. Step 6 becomes: append the log line the moment a point settles, before doing anything else with the point, per `references/instructions/append-log-line.md` — keep the one-line-one-type-reason-folded-in sentence and the "what stays your judgment" sentence; remove the `printf` block and the shell-append/file-editing/never-re-read sentences (the instruction carries them). Keep the format pointer `references/formats/log-line.md` for the line's shape. Glossary writes cite `references/formats/glossary.md`. Rewrite the description.
2. `open-thread/SKILL.md`: apply the Inputs rule. Remove the sentence "persist no recipe name, no progress markers, and no lifecycle values" — replace with the positive statement that the seed carries the title, the narrative, and the applicable metadata lines only (the "Add no owner field…" sentence already says it). Replace every `/allocate-thread` invocation and the "caller-authorization block" framing: the body composes slug, title, genesis narrative, and conditional metadata (with `Roadmap:` in the form `.wip/roadmaps/<yymmddhhmm>-<slug>.md`), shows them once for correction, then creates the thread per `references/instructions/create-thread.md` and reports the created path. The section `## Delegate creation to /allocate-thread` becomes `## Create the thread` (or folds into the procedure); no sentence says "you do the judgment; the primitive does the write" or "has no update path". The thread's layout is `references/formats/thread.md` (cite it where the body describes what the thread holds). Rewrite the description.
3. `open-thread/references/supplied-ticket.md`: the existing-thread check searches the seeds of threads under `.wip/threads/` (all of them — a closed thread stays in place), with no archive mention.
4. `open-ticket/SKILL.md`: apply the Inputs rule; rewrite the description. Check the body for a thread path or an archive mention and rewrite any found.
5. `resolve-pending-decisions/SKILL.md`: apply the Inputs rule. Delete the `## Resolve the thread` section. The log-line step in `## Writing a settled point` points at `references/instructions/append-log-line.md` and loses its `printf` block and shell-append sentences, keeping the "framing is transient" sentence. Glossary writes cite `references/formats/glossary.md`. Rewrite the description.
6. For each of the four skills, run the conflict-rule pass: every `references/formats/adr.md` citation that is about the catalog or the conflict rule → `/consult-adrs`.
7. Prune undeclared or uncited formats per the manifest rule above; run `cd suite && node scripts/sync-shared-references.mjs && cd ..`.
8. Run the verification block.

**Files modified:** `suite/skills/capture-discussion/discussion/SKILL.md`, `suite/skills/capture-discussion/open-thread/SKILL.md`, `suite/skills/capture-discussion/open-thread/references/supplied-ticket.md`, `suite/skills/capture-discussion/open-ticket/SKILL.md`, `suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md`, possibly `suite/shared/manifest.yaml` and orphan copies under these skills' `references/formats/` (DELETED), and `agents/openai.yaml` of any of the four only if its `short_description` named a removed concept.

**Verification:**

```sh
G=suite/skills/capture-discussion
grep -nE '/(allocate-thread|emit-pending-decisions|emit-pending-review|update-implementation-report)\b' $G/*/SKILL.md $G/*/references/*.md
grep -n 'Resolve the thread\|Resolve the active thread\|cwd\|most recent stamp' $G/*/SKILL.md
grep -n 'docs/threads\|docs/roadmaps\|archiv\|recipe\|primitive\|caller-authorization' $G/*/SKILL.md $G/*/references/*.md
grep -n 'awk\|listed with the command' $G/*/SKILL.md
for s in discussion open-thread open-ticket resolve-pending-decisions; do awk '/^## Inputs/{f=1;next} f&&/^- /{print FILENAME": "$0; c++} c==2{exit}' $G/$s/SKILL.md; done
# expect: the first two items of every Inputs section name /consult-adrs then /consult-glossary
grep -n 'printf' $G/*/SKILL.md                       # nothing
grep -c 'references/instructions/append-log-line.md' $G/discussion/SKILL.md $G/resolve-pending-decisions/SKILL.md   # >= 1 each
grep -c 'references/instructions/create-thread.md' $G/open-thread/SKILL.md   # >= 1
grep -h '^description:' $G/*/SKILL.md | awk '{ if (length($0) > 140 || $0 ~ /use when|— use/) print "LONG/ROUTING: "$0 }'
(cd suite && node scripts/sync-shared-references.mjs) >/dev/null
awk '/^[^ #]/{k=$1; sub(/:$/,"",k)} /^  - /{print k"\t"$2}' suite/shared/manifest.yaml | while IFS=$'\t' read k src; do cmp -s "suite/shared/references/$src" "suite/$k/references/$src" || echo "OUT OF SYNC $k $src"; done   # nothing
```

Every scan prints nothing except the two expected `Inputs` items per skill and the positive counts.

**Acceptance criteria:**

- None of the four bodies names a primitive, a thread-resolution step, `cwd`, "most recent stamp", `docs/threads`, `docs/roadmaps`, an archive, a recipe, or the awk catalog command.
- Every `## Inputs` section opens with `/consult-adrs` then `/consult-glossary`.
- `discussion` and `resolve-pending-decisions` append to `log.md` through `references/instructions/append-log-line.md`; `open-thread` creates the thread through `references/instructions/create-thread.md` and cites `references/formats/thread.md`.
- Every description is one short phrase with no routing clause.
- The sync script leaves the tree unchanged and no orphan copies remain.

**Consumes:** the synced instruction copies `references/instructions/create-thread.md` and `references/instructions/append-log-line.md` from task 2; `references/formats/thread.md` and `references/formats/glossary.md` copies from task 3; the invocation names `/consult-adrs` and `/consult-glossary` from task 3.

**Produces:** none
