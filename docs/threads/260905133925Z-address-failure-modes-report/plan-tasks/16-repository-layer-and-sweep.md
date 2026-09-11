### Task 16: Rewrite the repository layer and run the whole-change sweep

**Objective:** Turn this repository's `docs/` into the project layer, rewrite the root `AGENTS.md`, root `README.md`, `.gitignore`, and `suite/AGENTS.md` for the redesigned suite, and run every acceptance-criteria check of the spec against the finished change.

**Input / context:** Starts from task 15 (every skill and the suite's method text are final). `spec.md` `### Documentation and repository maintenance` (this repository's project layer, root `AGENTS.md`, `.gitignore`, `suite/AGENTS.md`), `## Constraints` (Vocabulary), `## Acceptance criteria` in full; decisions.md DR7, DR24, DR26, DR1 (the CLI stage-table rule stays in the root `AGENTS.md`; it is suspended for this thread only). Existing files: `docs/glossary.md` (sections: the method and its shape, recipes and pipelines, threads and artifacts, trackers and tickets, running and reporting, skills, queues and workspaces, CLI execution, reserved and avoided words), root `AGENTS.md` (sections `## Repository purpose`, `## The two modules`, `## Keep the CLI stage support reference current`, `## Layout`, `## Issue classification convention`, `## Describe the current state, never the diff`, `## Document only durable, properly scoped information`, `## Commits`, `## Method Conventions`, `## Vocabulary`), root `README.md`, `.gitignore`, `suite/AGENTS.md` (sections `## Purpose`, `## Layout`, `## SKILL.md format`, `## Invocation roles`, `## Skill composition`, `## Shared references`, `## When adding a new skill`). `CLAUDE.md` files are symlinks to `AGENTS.md` and are not edited. The catalog command is the one in `suite/shared/references/formats/adr.md`. The final skill set is twenty-two skills in eight groups.

**Steps:**

1. Rewrite `docs/glossary.md` as this repository's project glossary. Keep the table shape and the section grouping. Define at least: ADR, superseded ADR, thread log, log entry type, spec, plan (brief and strict), implementation, implementation report, deviation, closing, delta, binding test, project layer, roadmap index, entry, pending decision, bundle, terminal outcome, preflight, entry point, primitive, shared reference, review, living project documentation, write authority, and the terms carried today: method, recipe, pipeline, step, stage, thread artifact, Antmay, suite, CLI, suite/CLI contract, thread, unit of work, seed, genesis narrative, tracker, ticket, ticket reference, tracker mutation, run, skill, caller, caller-authorization block, subagent, temporary workspace, queue, and the CLI execution terms as they stand. Remove every row defining `DR<N>`, decision log, round, feedback record or `FBK<N>`, child brief or `CB<N>`, proposal, reconciliation, and the `roadmap.md` / `roadmap-feedback.md` / `implementation-report.md` artifacts. Keep the reserved-words table minus rows that no longer name anything. Pointers to owning documents go to `suite/method.md`, `suite/skill-authoring.md`, or `cli/README.md`. The header states that this is the project glossary and the naming authority for the repository; it does not describe who writes it.
2. Rewrite the root `AGENTS.md`: (a) `## Method Conventions` becomes `## Method`, the human-written method section: pointers to `docs/adr/` and `docs/glossary.md`, the ADR catalog command copied from `formats/adr.md`, and the repository's authoritative living documents by path (`README.md`, `suite/method.md`, `suite/skill-authoring.md`, `cli/README.md`, `CONTRIBUTING.md`, the three `AGENTS.md` files), plus the pointer that this repository's threads live under `docs/threads/`; (b) `## Vocabulary` names `docs/glossary.md` as the project glossary and naming authority, written through threads and the closing skill, consulted before introducing a term, and drops the vocabulary table, since the glossary carries those terms; (c) in `## Document only durable, properly scoped information`, replace the thread-identifier paragraph with: thread-local material (log entries, spec sections, plan tasks, plan or implementation folders) is never cited outside its thread; an ADR may be cited by its stem, never by path, and is never required to be; (d) in `## Layout`, `docs/` is described as the project layer (`adr/`, `glossary.md`, `roadmaps/`, `threads/`); (e) in `## The two modules`, replace "That shared contract is documented in `docs/`" with a pointer to the `suite/CLI contract` entry of `docs/glossary.md` and to `cli/README.md`, and leave the sentence naming the nine skills the CLI catalog invokes as a statement about the CLI; (f) keep `## Keep the CLI stage support reference current` unchanged; (g) check `## Repository purpose` and `## Commits` for `decisions.md`, `DR<N>`, or retired skill names and fix them.
3. Rewrite the root `README.md` prose: the intro paragraph describes a thread as holding a seed, a log, a spec, its ADR and glossary delta, and its plans and implementations; `## Recipes` links each recipe row to `suite/method.md` and states that the overview describes the method as a whole; `## Terminal outcomes` is checked against `suite/skill-authoring.md`; the `## Skills` index lists exactly the twenty-two skills on disk, grouped by folder, each with a description consistent with its frontmatter and an install snippet; the `## Primitives` section lists the four. Remove every reference to `docs/recipes/`, `docs/README.md`, `decisions.md`, or a retired skill.
4. `.gitignore`: replace the `docs/threads/**/.implementation-runs/` line with `docs/threads/**/.runs/` and update the comment above the three workspace lines to name run state under implementation folders. Leave every other line unchanged.
5. Rewrite `suite/AGENTS.md`: `## Layout` shows eight groups and twenty-two skills (`capture-discussion/`: discussion, open-thread, open-ticket, resolve-pending-decisions; `finish-navigate/`: close-thread, finish, whats-next; `implement/`: implement, implement-plan, implement-plan-with-subagents; `plan/`: check-plan, plan-brief, plan-strict; `primitives/`: allocate-thread, emit-pending-decisions, emit-pending-review, update-implementation-report; `review/`: review-code, review-implementation, review-spec; `roadmap/`: roadmap; `spec/`: spec) and "the four skills under `primitives/`"; `shared/references/` is described as `formats/` (formats plus the two ADR behaviours), `recipes/`, `trackers/`, `repository-conventions.md`; `## SKILL.md format` points at `skills/spec/spec/SKILL.md` as the structure to mirror; `## Skill composition` authoring guidance: the "Canonical definition" pointer goes to `suite/skill-authoring.md`, the sentence allowing `DR<N>` becomes "ADR stems are allowed when they are part of the skill's emitted artifact", the conditional-instruction example names only `open-thread`'s ticket input; add `## Inputs convention` (exact heading, list shape, the two fixed leading items, authoritative-or-material clause, skills reading nothing carry none, procedure starts from the gathered state) and a `## Write boundaries` line (every skill states its own inline; only `close-thread` writes `docs/adr/`, `docs/glossary.md`, and a roadmap entry); `## Shared references` says the contract is defined in `suite/skill-authoring.md` and that a skill reading or writing an artifact declares that artifact's format in `manifest.yaml`; `## When adding a new skill` lists the eight groups and adds the step "if the skill reads anything, write `## Inputs` and declare the formats it needs in `shared/manifest.yaml`, then run the sync script".
6. Search the remaining repository-level files for links into the removed documents and fix any found: `grep -rn "docs/README.md\|docs/thread-model.md\|docs/skill-authoring.md\|docs/recipes/" README.md AGENTS.md CONTRIBUTING.md suite/ .github/`.
7. Run the whole-change sweep below and fix every residue that lies inside the spec's scope (never `cli/`, never `docs/threads/`).

**Files modified:** `docs/glossary.md`, `AGENTS.md`, `README.md`, `.gitignore`, `suite/AGENTS.md`, and `CONTRIBUTING.md` only if step 6 finds a link to fix

**Verification:**

```sh
# AC-1.2
grep -rn "decisions.md\|proposal.md\|roadmap-feedback.md\|rounds/\|implementation-runs" suite/ docs/ AGENTS.md README.md .gitignore | grep -v "^docs/threads/"   # no output
# AC-1.4
grep -n "docs/threads/\*\*/.runs/\|docs/threads/\*\*/.pending-decisions/\|docs/threads/\*\*/.pending-reviews/" .gitignore   # three lines
# AC-2.4 — expected set: discussion, spec, resolve-pending-decisions, implement, implement-plan, implement-plan-with-subagents, close-thread, plus allocate-thread and open-thread for the eager creation
grep -rln "log.md" suite/skills/*/*/SKILL.md | sort
# AC-3.4, AC-8.8, AC-9.3, AC-11.3
for s in reconcile-spec reconcile-plan reconcile-proposal reconcile-roadmap propose merge-artifacts archive-thread materialize-roadmap-threads append-roadmap-feedback review-roadmap; do find suite/skills -type d -name "$s" | grep . && echo "STILL PRESENT $s"; done
# AC-5.5
grep -rn "DR<N>\|bare \`DR" AGENTS.md suite/ docs/*.md docs/adr docs/roadmaps 2>/dev/null   # no output
# AC-6.1 — every skill that reads a file carries the heading; expected 0 only for allocate-thread, emit-pending-decisions, emit-pending-review; the two fixed items come first
for f in suite/skills/*/*/SKILL.md; do printf "%s\t%s\n" "$(grep -c '^## Inputs' $f)" "$f"; done
for f in $(grep -l '^## Inputs' suite/skills/*/*/SKILL.md); do awk '/^## Inputs/{p=1;next} p&&/^- /{print FILENAME": "$0; n++} n==2{exit}' $f; done   # first item docs/adr/, second docs/glossary.md
# AC-6.3 — read every ## Inputs section: the only inputs outside the project layer and the active thread are a roadmap index under docs/roadmaps/, a user-named archived thread, and a user-referenced artifact or prompt, each marked material
for f in $(grep -l '^## Inputs' suite/skills/*/*/SKILL.md); do echo "== $f"; awk '/^## Inputs/{p=1;next} /^## /{p=0} p' $f | grep -n "docs/threads/\|archive\|another thread"; done
# AC-7.1
grep -rn "method skill\|load the method" suite/   # no output
# AC-7.2
grep -rln "supersedes" suite/skills/*/*/references | grep -v "formats/adr.md"   # no output
# AC-9.6, AC-10.4
test ! -e suite/shared/references/roadmap-descendant-feedback.md && test ! -e suite/shared/references/formats/decision-record.md && ! grep -n "decision-record\|roadmap-descendant-feedback" suite/shared/manifest.yaml
# AC-13.1, AC-13.2
(cd suite && node scripts/check-marketplace-skills.mjs)
(cd suite && node scripts/sync-shared-references.mjs && git status --porcelain > /tmp/s1 && node scripts/sync-shared-references.mjs && git status --porcelain > /tmp/s2 && diff /tmp/s1 /tmp/s2 && echo SYNC-STABLE)
grep -c '"./skills/' .claude-plugin/marketplace.json     # 22
grep -c '^#### \[`' README.md                            # 22
python3 -c "import json;print(len([s for s in json.load(open('.vscode/settings.json'))['conventionalCommits.scopes'] if s!='cli']))"   # 22
# AC-13.3
ls docs   # glossary.md threads  (adr/ and roadmaps/ only if created)
# AC-13.4
for t in ADR "thread log" plan implementation closing delta "binding test" method recipe pipeline step stage "thread artifact"; do grep -qi -- "$t" docs/glossary.md || echo "MISSING $t"; done
grep -in "DR<N>\|round\b\|feedback record\|child brief\|proposal\|reconcil" docs/glossary.md   # no output
# AC-13.5
grep -n "docs/glossary.md" AGENTS.md; grep -in "closing skill\|close-thread" AGENTS.md; grep -in "never cited outside\|stem" AGENTS.md
grep -rn "docs/README.md\|docs/thread-model.md\|docs/skill-authoring.md\|docs/recipes/" AGENTS.md README.md suite/ CONTRIBUTING.md   # no output
# AC-13.6
grep -rn "no longer\|anymore\|unlike before\|previously" suite/ AGENTS.md README.md docs/glossary.md   # inspect each hit; none may contrast with the replaced design
```

**Acceptance criteria:**

- `docs/` contains only `glossary.md` and `threads/` (plus lazily created `adr/` and `roadmaps/`); `docs/glossary.md` defines the terms of AC-13.4 and none of the removed concepts (AC-13.3, AC-13.4).
- The root `AGENTS.md` carries the human-written method section, names `docs/glossary.md` as the project glossary written through threads and the closing skill, states the rewritten thread-identifier rule, and links into no removed document (AC-13.5).
- `.gitignore` ignores the three workspaces (AC-1.4); `marketplace.json`, the root `README.md`, and the commit scopes list exactly the twenty-two skills, `check-marketplace-skills.mjs` passes, and the sync script produces no diff (AC-13.1, AC-13.2).
- Every grep in the verification block returns the expected result; where a hit is found inside the spec's scope it is fixed in this task.

**Consumes:** `suite/method.md` and `suite/skill-authoring.md` (task 15); the twenty-two-skill tree and registrations (tasks 1, 8, 13); the catalog command (task 2).

**Produces:** none.
