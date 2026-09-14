### Task 8: Write and wire the text check, then verify the whole tree

**Objective:** Add `suite/scripts/check-skill-text.mjs` — a dependency-free gate that fails on a bare `references/` path, on `per` before a `<skill_path>/` pointer, and on an indented fence — run it in CI beside the marketplace check, name it in `CONTRIBUTING.md` and `suite/AGENTS.md`, and run every acceptance check in the spec against the finished tree.

**Input / context:** `spec.md` § "The text check", § "Same-body section pointers", § "The sweep itself", and the whole of `## Acceptance guidance` (AC-1.1 … AC-9.3); settled decisions: `decisions.md DR8` (one new script, its three rules, its exclusion of `suite/authoring/`, its output and exit codes, where it is wired and named), `DR1`, `DR4`, `DR7` (the rules it enforces), `DR9` (rule 2 matches only ``per `<skill_path>``, so same-body heading pointers never trip it). Model: `suite/scripts/check-marketplace-skills.mjs` — header comment explaining why the check is a hard gate, `node:` built-ins only, `SCRIPT_DIR`/`SUITE_ROOT` resolution from `import.meta.url`, a `SKIP_DIRS` list, `fail()` printing a prefixed message and exiting 1, a one-line `OK` summary on success. Wiring sites today: `.github/workflows/ci.yml` job `suite` (name `suite manifest`, `working-directory: suite`, one `run: node scripts/check-marketplace-skills.mjs` step); `CONTRIBUTING.md` § "Working in the repository" paragraph "The skill suite has no build. Its one mechanical gate guards the distribution manifest, and runs from `suite/`:" followed by a one-command `sh` block; `suite/AGENTS.md` — the sentence "There is no build or lint pass: validation is reading the Markdown and confirming the instructions are coherent." under `## What the suite is`, the `scripts/` subtree in `## Layout`, and the `## Before anything else` list. Starts from the tree tasks 1–7 left, which the script must find clean at once: the sweep is complete and the check confirms it, in the order the spec fixes.

**Steps:**

1. Create `suite/scripts/check-skill-text.mjs` (NEW), executable like its siblings (`#!/usr/bin/env node` first line). Open with a header comment stating what it checks and why each rule is a gate: a `references/` path without the `<skill_path>/` prefix is indistinguishable from a project path to an agent working at the project root; `per` before a reference pointer reads as a skippable citation rather than a file to open; an indented fence renders inconsistently across list contexts. State that `suite/authoring/` is excluded because those documents quote the forbidden forms as negative examples, that the exit codes are 0 clean / 1 on any hit, and that the script is dependency-free.
2. Implement it with `node:fs`, `node:path`, `node:url` only:
   1. Resolve `SUITE_ROOT` from the script's own location; walk `skills/` and `shared/references/` under it recursively, skipping the same `SKIP_DIRS` as the marketplace check, collecting every file whose name ends in `.md`.
   2. For each file, read it as UTF-8 and split on `/\r?\n/`; for each line (1-based `lineNo`) apply three rules and push a hit `{ path, lineNo, rule }` per match:
      - `bare-reference` — for every index `i` at which the substring `references/` occurs in the line, a hit unless the 13 characters ending at `i` are exactly `<skill_path>/`;
      - `per-before-path` — a hit when the line contains the substring ``per `<skill_path>`` (the word `per`, one space, a backtick, then the prefix);
      - `indented-fence` — a hit when the line matches `/^[ \t]+```/`.
   3. Print every hit to stderr as `<path>:<lineNo>: <rule>` with `path` relative to `SUITE_ROOT` (so `skills/spec/spec/SKILL.md:53: bare-reference`), one per line, in file order then line order; then exit 1. With no hits, print one line to stdout — `check-skill-text: OK — <N> file(s) under skills/ and shared/references/, no bare reference, no per-before-path, no indented fence.` — and exit 0.
   4. Do not walk `authoring/`, `scripts/`, or `shared/manifest.yaml`; do not read the manifest; do not modify any file.
3. Run it from `suite/`: `node scripts/check-skill-text.mjs` must exit 0 on the tree tasks 1–7 left. If it reports hits, the hit is a miss of an earlier task's sweep: fix it at its canonical source (re-syncing if the source is under `shared/references/`) or in the body, and note the fix in the implementation report against the task it belonged to. Do not weaken the rule to pass.
4. Prove the three rules (AC-8.2), each with a temporary edit that is fully reverted before the next step:
   1. append a line containing ``see `references/formats/x.md` `` to `skills/spec/spec/SKILL.md`; run the script; expect exit 1 and the line `skills/spec/spec/SKILL.md:<N>: bare-reference`; `git checkout -- skills/spec/spec/SKILL.md`;
   2. append a line containing ``per `<skill_path>/references/formats/x.md` `` to `skills/plan/plan-brief/SKILL.md`; expect exit 1 and `…: per-before-path`; revert the same way;
   3. insert a two-space-indented ```` ```text ```` line into `shared/references/formats/thread.md`; expect exit 1 and `shared/references/formats/thread.md:<N>: indented-fence`; revert; run the script once more and expect exit 0.
5. `.github/workflows/ci.yml`, job `suite`: add the step `- run: node scripts/check-skill-text.mjs` directly after `- run: node scripts/check-marketplace-skills.mjs`, under the job's existing `working-directory: suite` default; change the job's display `name:` from `suite manifest` to `suite checks`, since it now runs two. Touch no other job.
6. `CONTRIBUTING.md`, § "Working in the repository": replace the paragraph "The skill suite has no build. Its one mechanical gate guards the distribution manifest, and runs from `suite/`:" and its one-command block with a paragraph stating that the suite has no build and two mechanical gates that run from `suite/` — one guards the distribution manifest, the other the text of every skill body and shared reference (skill-local pointers carry `<skill_path>/`, no `per` precedes one, no fence is indented) — followed by one `sh` block listing both commands:

   ```sh
   node scripts/check-marketplace-skills.mjs
   node scripts/check-skill-text.mjs
   ```

7. `suite/AGENTS.md`:
   1. `## What the suite is`: change "There is no build or lint pass: validation is reading the Markdown and confirming the instructions are coherent." to say there is no build, that `scripts/check-skill-text.mjs` is the one mechanical text check, and that the rest of validation is reading the Markdown and confirming the instructions are coherent.
   2. `## Layout`, the `scripts/` subtree: add a line for `check-skill-text.mjs` with a one-phrase gloss ("fails on a bare `references/` path, `per` before a `<skill_path>/` pointer, or an indented fence"), keeping the tree's alignment.
   3. `## Before anything else`: add one bullet — run `node scripts/check-skill-text.mjs` after editing any body or shared reference; it fails on a `references/` path not prefixed `<skill_path>/`, on ``per `<skill_path>``, and on a fence line with leading whitespace; `authoring/` is not walked because it quotes those forms as negative examples. Place it after the marketplace-check bullet.
8. Run the whole-tree acceptance pass below and fix any miss at its source before reporting. `README.md`, `.claude-plugin/marketplace.json`, `shared/manifest.yaml`, and `cli/` must show no diff.

**Files modified:** `suite/scripts/check-skill-text.mjs` (NEW), `.github/workflows/ci.yml`, `CONTRIBUTING.md`, `suite/AGENTS.md`.

**Verification:** run from `suite/` (`$BASE` is the commit the run started from):

```sh
# The script itself (FR-8)
head -1 scripts/check-skill-text.mjs                                      # → #!/usr/bin/env node
grep -nE '^import|require\(' scripts/check-skill-text.mjs | grep -v 'from "node:'   # → no output (only node: imports, AC-8.1)
grep -c 'authoring' scripts/check-skill-text.mjs                          # → ≥ 1 (the exclusion is stated); the walk roots are skills/ and shared/references/ only (AC-8.3)
node scripts/check-skill-text.mjs; echo "exit=$?"                         # → OK line, exit=0 (AC-8.1)
printf '%s\n' 'see `references/formats/x.md`' >> skills/spec/spec/SKILL.md; node scripts/check-skill-text.mjs; echo "exit=$?"; git checkout -- skills/spec/spec/SKILL.md
#   → one line "skills/spec/spec/SKILL.md:<N>: bare-reference", exit=1 (AC-8.2)
printf '%s\n' 'per `<skill_path>/references/formats/x.md`' >> skills/plan/plan-brief/SKILL.md; node scripts/check-skill-text.mjs; echo "exit=$?"; git checkout -- skills/plan/plan-brief/SKILL.md
#   → "skills/plan/plan-brief/SKILL.md:<N>: per-before-path", exit=1
printf '%s\n' '  ```text' >> shared/references/formats/thread.md; node scripts/check-skill-text.mjs; echo "exit=$?"; git checkout -- shared/references/formats/thread.md
#   → "shared/references/formats/thread.md:<N>: indented-fence", exit=1
node scripts/check-skill-text.mjs; echo "exit=$?"                         # → exit=0 again
# Wiring (AC-8.4, AC-8.5)
awk '/^  suite:/,0' ../.github/workflows/ci.yml | grep -n 'run: node scripts/check-marketplace-skills.mjs' -A1 | grep -c 'run: node scripts/check-skill-text.mjs'   # → 1
awk '/^  suite:/,0' ../.github/workflows/ci.yml | grep -c 'working-directory: suite'   # → 1
grep -c 'node scripts/check-skill-text.mjs' ../CONTRIBUTING.md AGENTS.md  # → CONTRIBUTING.md:1 (or more), AGENTS.md:≥1
grep -n 'one mechanical gate' ../CONTRIBUTING.md                          # → no output
grep -n 'no build or lint pass' AGENTS.md                                 # → no output
# Standing gates (AC-8.6)
node scripts/check-marketplace-skills.mjs; echo "exit=$?"                 # → exit=0
node scripts/sync-shared-references.mjs >/dev/null; echo "sync exit=$?"      # → sync exit=0
h1=$(find skills -path "*/references/*" -name "*.md" | sort | xargs cat | shasum); node scripts/sync-shared-references.mjs >/dev/null; h2=$(find skills -path "*/references/*" -name "*.md" | sort | xargs cat | shasum); [ "$h1" = "$h2" ] && echo "second sync is a no-op" || echo "second sync changed the tree — investigate"   # → "second sync is a no-op"
# Whole-tree acceptance (FR-1 … FR-9)
grep -rn 'references/' skills shared/references --include='*.md' | grep -v '<skill_path>/references/'   # → no output (AC-1.1)
grep -rn '<skill_path>/references/formats/' shared/references/instructions | wc -l                       # → 4 (AC-1.2)
grep -rn '<skill_path>/docs\|<skill_path>/\.wip\|<skill_path>/plans\|<skill_path>/spec\.md\|<skill_path>/log\.md' skills shared/references authoring   # → no output (AC-1.4)
for f in $(grep -rl '^## Inputs' skills --include='SKILL.md'); do awk -v F="$f" '/^## Inputs/{p=1;next} p&&/^## /{exit} p&&/^- /{c++; if(c==1&&$0!~/^- `docs\/adr\/`, read via `\/consult-adrs` — /)print F": item 1"; if(c==2){if($0!~/^- `docs\/glossary\.md`, read via `\/consult-glossary` — /)print F": item 2"; exit}}' $f; done   # → no output (AC-2.1, 16 bodies)
grep -rn "write the project's fixed terms" .                             # → no output (AC-2.2)
grep -rn 'consult-adrs` carries' skills                                   # → no output (AC-2.3)
grep -rn 'docs/adrs' . ../docs ../README.md ../CONTRIBUTING.md ../AGENTS.md   # → no output (AC-2.4)
test ! -e shared/references/instructions/conflict-rule.md && grep -c 'contradict' skills/model-invoked/consult-adrs/SKILL.md   # → ≥ 1 (AC-2.5: the rule still lives in consult-adrs; no new instruction file)
grep -rnE '(; authoritative\.|\. Authoritative\.|\. Material\.|\. Material:|Authoritative for intent\.|Authoritative within the thread\.)' skills   # → no output (AC-3.1)
grep -rnE 'when (the thread holds one|the invocation (carries one|names an entry)|it names one|the thread.s owner authored one|a plan folder is the form)|whenever the thread holds one' skills --include='SKILL.md'   # → no output (AC-3.2)
grep -c 'A freshly opened thread holds only `seed.md` and a header-only `log.md`' skills/capture-discussion/discussion/SKILL.md   # → 1 (AC-3.3)
grep -rn 'per `<skill_path>' skills shared/references                     # → no output (AC-4.1)
for f in $(find skills -name SKILL.md); do a=$(git show $BASE:suite/$f | grep -o 'per `#' | wc -l); b=$(grep -o 'per `#' $f | wc -l); [ "$a" = "$b" ] || echo "$f: $a -> $b"; done   # → no output (AC-4.2)
grep -rn 'Outcome:' skills                                                # → no output (AC-5.1)
grep -rnE '`DONE`.*`BLOCKED`.*`REFUSED`|`REFUSED`.*`BLOCKED`.*`DONE`' skills --include='SKILL.md'   # → no output (AC-5.3)
grep -c 'whichever exit' shared/references/instructions/emit-terminal-outcome.md   # → 1 (AC-5.4)
grep -c 'from every exit the run can reach' authoring/interaction-posture.md       # → 1 (AC-5.5)
git diff --quiet $BASE -- ../README.md && echo "README unchanged"        # → README unchanged (AC-5.6)
awk '/^### Types/{p=1} /^## Rules/{p=0} p && /^- `/' shared/references/formats/log-line.md | wc -l   # → 7 (AC-6.1)
for s in capture-discussion/discussion capture-discussion/resolve-pending-decisions spec/spec; do cmp shared/references/formats/log-line.md skills/$s/references/formats/log-line.md || echo "$s differs"; done   # → no output (AC-6.4)
grep -rnE '^[[:space:]]+```' skills shared/references                     # → no output (AC-7.1)
git status --porcelain -- ../cli                                          # → no output (AC-9.1)
git diff --quiet $BASE -- ../.claude-plugin/marketplace.json shared/manifest.yaml && echo "registrations unchanged"   # → registrations unchanged (AC-9.3)
git diff $BASE --name-status -- skills | grep -v '^M' ; echo "(no added, deleted, or renamed file under skills/ expected)"   # → nothing but the echo (AC-9.3)
for f in $(find skills -name SKILL.md); do diff <(git show $BASE:suite/$f | grep -E '^#{1,4} ') <(grep -E '^#{1,4} ' $f) >/dev/null || echo "$f: heading set changed"; done   # → no output (AC-9.2)
```

**Acceptance criteria:**
- `suite/scripts/check-skill-text.mjs` exists, imports only `node:` modules, walks `skills/` and `shared/references/` and not `authoring/`, prints each hit as `path:line: rule`, and exits 0 on the finished tree (AC-8.1, AC-8.3).
- A bare `references/…` in a body, a ``per `<skill_path>/…`` in a body, and a two-space-indented fence in a shared format file each make it exit 1 with the matching rule line, and reverting restores exit 0 (AC-8.2).
- `.github/workflows/ci.yml` runs the script as a step directly after the marketplace check under `working-directory: suite` (AC-8.4); `CONTRIBUTING.md` lists both gate commands and `suite/AGENTS.md` names the script, the command, and when to run it (AC-8.5).
- `check-marketplace-skills.mjs` and `sync-shared-references.mjs` exit 0 and a second sync changes nothing (AC-8.6).
- Every acceptance criterion in `spec.md` (AC-1.1 … AC-9.3) passes on the whole tree, as the verification block shows; `README.md`'s terminal-outcome section, `.claude-plugin/marketplace.json`, `shared/manifest.yaml`, the `skills/` file set, and `cli/` have no diff.

**Consumes:** the fully swept `suite/skills/` and `suite/shared/references/` trees from tasks 1–6 (the script must find them clean on its first run) and the authoring documents from task 7 (excluded from the walk, named unchanged from `suite/AGENTS.md`).

**Produces:** `node scripts/check-skill-text.mjs` — the command every later edit to a body or shared reference runs, wired into CI; and the verified finished tree the implementation report describes.
