### Task 7: State the rules in the authoring documents

**Objective:** Make `suite/authoring/body-structure.md`, `shared-references.md`, and `interaction-posture.md` state the conventions the sweep just applied — the `<skill_path>/` prefix, the project-layer input items, the one Inputs shape with its presence clauses and early-life rule, the directive intent with its two strict rules and the heading/path distinction, and the every-exit pointer — so a future author writes bodies the way tasks 3–6 left them.

**Input / context:** `spec.md` § "The `<skill_path>` prefix" (the `body-structure.md` sentence to replace and the `shared-references.md` addition), § "Project-layer inputs" (the "The list opens with the same two items" block), § "One shape for Inputs items" (the "authoritative or material" sentence to replace), § "Reference pointers as directives" (both documents state the directive intent, the two strict rules, and the DR9 sentence), § "Every exit points at the terminal-outcome instruction" (the `interaction-posture.md` sentence), § "Same-body section pointers"; AC-1.3, AC-3.5, AC-4.5, AC-5.5, AC-6.5 (the format skeleton in `shared-references.md` is untouched). Settled decisions: `decisions.md DR1`, `DR2`, `DR3`, `DR4`, `DR5`, `DR9`. These documents are written to whoever authors the suite, not to an invoked agent; they may quote forbidden forms as negative examples (the check in task 8 does not walk `suite/authoring/`). They still carry no decision identifiers and no thread paths. Starts from the swept tree tasks 3–6 left; read two or three swept bodies before writing, so the rules describe what is on disk.

**Steps:**

1. `suite/authoring/body-structure.md`, `## Fixed section headings`, the `## Inputs` paragraph. Replace the two sentences "Each item is a path or a source with one clause saying what it is for and whether it is authoritative or material. The list opens with the same two items in every skill that has it:" and the numbered `/consult-adrs` / `/consult-glossary` pair with prose stating, in this order:
   1. the item shape — `- <path or source><, presence clause when it may be absent> — <what it is and what it is for>.`;
   2. the presence clauses — exactly `when present`, `when the seed carries one`, `when the file exists`; an item without one is always present or is the primary input; a primary input keeps its accepted forms inside its clause;
   3. no trailing tag — where a procedure ranks its sources, the ranking is stated once in the prose that uses it, never per item;
   4. the early-life rule — a body normally invoked while the thread holds only `seed.md` and a header-only `log.md` says so in one sentence above the list;
   5. the two opening items, as a fenced `markdown` block:

      ```markdown
      - `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on <the target>.
      - `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
      ```

      followed by one sentence: the input is the file, the skill is how it is read, and the target clause is adapted to the skill;
   6. the conflict-rule phrasing — where a body invokes the conflict rule those decisions come with, it names `/consult-adrs` as a procedure ("classify it as `/consult-adrs` instructs"), never as a document that carries text.
   Keep the sentences that follow ("The thread files the skill reads follow. A skill with one primary input …") unchanged.
2. `suite/authoring/body-structure.md`, `## The three-part body`, the pointer paragraph. Replace the sentence "Every pointer cites the reference file's full skill-relative path, as in `references/formats/adr.md`, never a filename plus a folder description and never a bare folder, and it is woven into the prose of the step as ordinary flowing instruction rather than a mechanical "IF X READ Y" construction." with prose stating, in this order:
   1. the prefix — every pointer to a file inside the skill's folder is written with the literal prefix `<skill_path>/`, as in `<skill_path>/references/formats/adr.md`; the placeholder resolves to the skill's base directory as the harness reports it at invocation; it is what tells a skill-local path apart from a project path such as `docs/adr/`, which stays bare; never a filename plus a folder description and never a bare folder;
   2. the directive intent — a pointer is a directive to open the file and act on it: an instruction is followed and the pointer is the step ("Follow `<skill_path>/references/instructions/append-log-line.md`"); a format is what a write or read conforms to ("following `<skill_path>/references/formats/adr.md`", "in the shape `<skill_path>/references/formats/thread.md` defines"); other verbs are fine where they read better, provided the intent stays plain;
   3. the two strict rules — **no leak**: a body never restates what the pointed file holds; the text around a pointer is limited to the skill-specific parameters the file leaves open (the producer name, what the line states, which folder, the token), and anything the body needs for its own judgment at that step is written as the skill's own rule, not as a paraphrase with a citation; **no `per` before a path**: `per` before a heading of the same body is fine; `per` before a file path is the defect;
   4. the weaving sentence, kept — the pointer is woven into the prose of the step as ordinary flowing instruction rather than a mechanical "IF X READ Y" construction.
3. `suite/authoring/shared-references.md`. In `## The canonical folder`, after the **Instructions** paragraph (or as a short paragraph of its own before `## The manifest`), add prose stating that a pointer inside a shared reference file — an instruction naming the format it writes, say — carries the same `<skill_path>/` prefix a body uses and reads as the same directive: the pointed file is followed or conformed to, never cited with `per` and never restated around the pointer. Do not touch the format skeleton bullets (title, one paragraph, `## Shape`, `## Rules`) or the sentence "Vocabulary an artifact fixes — the log's seven entry types, say — is a rule with its enumeration inline."
4. `suite/authoring/interaction-posture.md`, `## The terminal outcome`: replace "which each emitting skill declares and points at from the step where the run ends" with "which each emitting skill declares and points at from every exit the run can reach". Change nothing else in the file.
5. Re-read the three edited passages against two swept bodies (`discussion` for Inputs and the log-line step, `spec` for exits) and confirm each rule describes what is on disk; adjust the wording, not the bodies.

**Files modified:** `suite/authoring/body-structure.md`, `suite/authoring/shared-references.md`, `suite/authoring/interaction-posture.md`.

**Verification:** run from `suite/` (`$BASE` is the commit the run started from):

```sh
B=authoring/body-structure.md; S=authoring/shared-references.md; I=authoring/interaction-posture.md
grep -n 'whether it is authoritative or material' $B                     # → no output (AC-3.5)
grep -n '^1\. `/consult-adrs`\|^2\. `/consult-glossary`' $B              # → no output (old numbered pair gone)
grep -c -- '- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on <the target>\.' $B   # → 1
grep -c -- '- `docs/glossary.md`, read via `/consult-glossary` — the project.s fixed terms, to be used in everything you write\.' $B   # → 1
grep -c 'when present' $B; grep -c 'when the seed carries one' $B; grep -c 'when the file exists' $B   # → each ≥ 1 (AC-3.5)
grep -c 'header-only `log.md`' $B                                        # → ≥ 1 (early-life rule)
grep -c 'as `/consult-adrs` instructs' $B                                # → ≥ 1
grep -c '<skill_path>/references/formats/adr.md' $B                      # → ≥ 1 (AC-1.3)
grep -ci 'base directory' $B                                             # → ≥ 1 (what the placeholder resolves to)
grep -n 'as in `references/formats/adr.md`' $B                           # → no output (old sentence gone)
grep -ci 'no leak\|never restates' $B                                    # → ≥ 1 (AC-4.5)
grep -c 'before a heading of the same body' $B                           # → 1 (the heading/path distinction)
grep -c '<skill_path>/' $S                                               # → ≥ 1 (AC-1.3)
grep -n '`per`' $S                                                       # → ≥ 1 line: the sentence saying a reference file's pointer is never cited with `per` (AC-4.5)
diff <(git show $BASE:suite/$S | awk '/^\*\*Formats\*\*/,/^\*\*Instructions\*\*/') <(awk '/^\*\*Formats\*\*/,/^\*\*Instructions\*\*/' $S)   # → no output (format skeleton unchanged, AC-6.5)
grep -c 'from every exit the run can reach' $I                           # → 1 (AC-5.5)
grep -c 'from the step where the run ends' $I                            # → 0
git diff $BASE --numstat -- $I                                           # → 1 addition, 1 deletion
grep -rnE '\bDR[0-9]+\b|\.wip/threads' authoring                          # → no output
node scripts/check-marketplace-skills.mjs                                # → exit 0
git status --porcelain -- ../cli                                         # → no output
```

**Acceptance criteria:**
- `body-structure.md` states the `<skill_path>/` prefix and what it resolves to; `shared-references.md` states that pointers inside reference files use it too (AC-1.3).
- `body-structure.md` no longer says "whether it is authoritative or material" and states the item shape, the three presence clauses, the early-life rule, and the two opening project-layer items with the "read via" form (AC-3.5, AC-2.1's source rule).
- Both `body-structure.md` and `shared-references.md` state the directive intent, the no-leak rule, the no-`per`-before-a-path rule, and the sentence distinguishing heading pointers from path pointers (AC-4.5).
- `interaction-posture.md` says the instruction is pointed at from every exit the run can reach, and is otherwise unchanged (AC-5.5).
- The format skeleton text in `shared-references.md` is unchanged (AC-6.5); the authoring folder carries no decision identifiers or thread paths.

**Consumes:** the swept bodies from tasks 3–6 as the on-disk reference for what the rules describe.

**Produces:** the three authoring documents in their final wording — `suite/AGENTS.md` (task 8) keeps pointing at them by the same paths and adds nothing that belongs here.
