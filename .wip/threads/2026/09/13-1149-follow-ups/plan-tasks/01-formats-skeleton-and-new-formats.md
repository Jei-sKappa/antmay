### Task 1: Bring every format file to the skeleton and add `thread.md` and `glossary.md`

**Objective:** Make every file under `suite/shared/references/formats/` describe one artifact and nothing else, in one shared skeleton, with every path already pointing at the `.wip/` layout, and add the two formats the suite lacked: the thread folder and the glossary table.

**Input / context:** `spec.md` § "Shared reference kinds → Formats" and AC-1.1 … AC-1.4. Settled decisions: `decisions.md DR15` (the skeleton), `DR8` (catalog command and conflict rule leave `adr.md`), `DR5` (append mechanics leave `log-line.md`), `DR3` (no rewrite rule in `implementation-report.md`), `DR9` (thread and glossary become formats), `DR10`, `DR12`, `DR13` (locations, no archive, the year/month layout). The current six files are the material; every rule they carry that describes the artifact is kept, every command, procedure, or policy leaves. Behaviour removed here has a destination in a later task: the catalog command and conflict rule go to `consult-adrs` (task 3, which pins the text), the append mechanics go to `instructions/append-log-line.md` (task 2). Task 3 must land before `node scripts/check-marketplace-skills.mjs` is meaningful, so this task's gate is the sync script and the structural greps below.

**Steps:**

1. Read all six files under `suite/shared/references/formats/` in full.
2. Apply this skeleton to every format file — the exact heading set is load-bearing:

   ```markdown
   # <Artifact> format

   <one paragraph: what the artifact is, where it lives, and its identifier when it has one>

   ## Shape

   <one fenced skeleton of the artifact with placeholders, or the folder tree when the artifact is a folder>

   ## Rules

   - <one rule per bullet: which parts are required, what each carries, naming, ordering, what never appears>
   ```

   No other second-level heading exists; sub-headings (`###`) do not appear either. Vocabulary an artifact fixes is a rule with its enumeration inline.
3. Rewrite `adr.md`: keep file naming and the stem as identifier, location as status (thread `adr/` draft, `docs/adr/` landed, `docs/adr/superseded/` retired), the frontmatter (`name`, `description`, optional `supersedes`) in `## Shape`, and the body's required content as rules. Remove the `## Citing`, `## Catalog`, and `## Conflicts` sections entirely; nothing in the file mentions a catalog command or a conflict rule. Rewrite the sentence "closing the thread moves the file unaltered" so it says the record lands in `docs/adr/` unaltered when the thread closes.
4. Rewrite `log-line.md`: the paragraph says `log.md` sits at the thread root and is the thread's memory; `## Shape` holds the header line `# Thread log` followed by the one-line entry shape `- (type) gist with the reason folded in`; `## Rules` states no identifier, no timestamp, order as the only structure, the seven types as one rule with the enumeration inline (`decision`, `constraint`, `assumption`, `question`, `capability`, `direction`, `event`, each with its one-line meaning), the append-only property (a later entry supersedes an earlier one on the same point and the earlier one stays), and that a terminal moment is an `event` line. The example lines may stay inside `## Shape`'s fence or as a rule. Remove the `printf` command, the "never open with a file-editing tool" sentence, and the one-writer sentence — they move to the instruction in task 2.
5. Rewrite `implementation-report.md` to the skeleton (`## Report shape` becomes `## Shape`). Delete the rule "The report is rewritten in place on every terminal outcome of the same implementation…". The paragraph says the report describes the outcome of the run that wrote it.
6. Rewrite `roadmap-index.md` to the skeleton (`## Index shape` becomes `## Shape`). The location is `.wip/roadmaps/<yymmddhhmm>-<slug>.md`. The closing-line rule reads: when a thread opened from an entry closes, the closing skill writes `Closed: <thread path relative to .wip/threads/> — <one-line outcome>` as the first line beneath that entry's heading. The last rule's "the archived threads" becomes "the threads" (the outcome lives in the code, the ADRs, and the threads).
7. Rewrite `pending-decision-bundle.md` to the skeleton (`## Bundle shape` becomes `## Shape`); content otherwise unchanged.
8. Rewrite `discussion-point.md` to the skeleton: the labeled-sections list becomes `## Shape` (a fenced skeleton listing the sections in their fixed order with placeholders is acceptable, or the current bullet list under `## Shape`), and the `## Discipline` bullets become `## Rules`.
9. Create `suite/shared/references/formats/thread.md` (NEW). Paragraph: a thread is the folder holding one unit of work, at `.wip/threads/yyyy/mm/dd-hhmm-slug/` — a year folder, a month folder, and a leaf named by the day, the creation time in UTC at minute resolution, and a short kebab-case slug; its identifier is that path relative to `.wip/threads/`. `## Shape` holds the folder tree naming every file and folder a suite skill reads or writes inside it, each with a one-line note: `seed.md`, `log.md`, `spec.md`, `adr/`, `glossary.md`, `plans/<yymmddhhmm>[-<slug>]/`, `implementations/<yymmddhhmm>[-<slug>]/` (with `report.md` and `.runs/` inside), `.pending-decisions/`, `.pending-reviews/`. `## Rules`: two threads created in the same minute differ in slug; `seed.md` and `log.md` exist from creation, everything else is created on demand by the skill that writes it; `adr/` and `glossary.md` are the thread's delta of the project layer, authoritative inside the thread; `.pending-decisions/`, `.pending-reviews/`, and each implementation's `.runs/` are workspaces (one uniquely named bundle or run directory per producing invocation); a closed thread stays in place — its `adr/` drafts and glossary terms have moved into the project layer, and nothing else marks closure. The word "archive" does not appear.
10. Create `suite/shared/references/formats/glossary.md` (NEW). Paragraph: a glossary fixes one meaning per term; the project's lives at `docs/glossary.md`, a thread's at its root `glossary.md`. `## Shape`: a Markdown table `| Term | Meaning |` with `| --- | --- |`, terms in bold, optionally grouped under `##` sections in the project glossary. `## Rules`: one row per term, one meaning per term; a thread's glossary is authoritative inside that thread and its rows merge into the project glossary when the thread closes; a retirement is recorded in a thread's glossary as a row whose meaning states that the term leaves the vocabulary and what to write instead, so the merge removes or rewrites the project row.
11. Run `cd suite && node scripts/sync-shared-references.mjs && cd ..` so every declaring skill's copy matches.
12. Run the verification block; fix any format file that fails it.

**Files modified:** `suite/shared/references/formats/adr.md`, `suite/shared/references/formats/log-line.md`, `suite/shared/references/formats/implementation-report.md`, `suite/shared/references/formats/roadmap-index.md`, `suite/shared/references/formats/pending-decision-bundle.md`, `suite/shared/references/formats/discussion-point.md`, `suite/shared/references/formats/thread.md` (NEW), `suite/shared/references/formats/glossary.md` (NEW), and every synced copy `suite/skills/*/*/references/formats/*.md` the manifest currently declares (regenerated by the script, never edited by hand).

**Verification:**

```sh
# AC-1.1: exactly two H2s, in order, and the H1 form
for f in suite/shared/references/formats/*.md; do
  h2=$(grep -E '^## ' "$f" | tr '\n' '|'); h1=$(head -1 "$f")
  [ "$h2" = "## Shape|## Rules|" ] || echo "BAD H2 SET: $f -> $h2"
  echo "$h1" | grep -qE '^# [A-Z].* format$' || echo "BAD H1: $f -> $h1"
  grep -qE '^### ' "$f" && echo "H3 PRESENT: $f"
done
# AC-1.2: no sh fence, no behaviour headings
grep -lE '^```sh' suite/shared/references/formats/*.md
grep -lE '^#+ (Catalog|Conflicts|Appending|Citing)' suite/shared/references/formats/*.md
# AC-1.3 / AC-1.4 / paths
test -f suite/shared/references/formats/thread.md && test -f suite/shared/references/formats/glossary.md
for p in seed.md log.md spec.md 'adr/' glossary.md 'plans/' 'implementations/' '.pending-decisions/' '.pending-reviews/'; do grep -q -- "$p" suite/shared/references/formats/thread.md || echo "thread.md misses $p"; done
grep -n -i 'rewritten in place\|merge' suite/shared/references/formats/implementation-report.md
grep -rn 'docs/threads\|docs/roadmaps\|archiv' suite/shared/references/formats/
grep -n 'printf\|file-editing' suite/shared/references/formats/log-line.md
grep -n -i 'awk\|intentional\|unnoticed' suite/shared/references/formats/adr.md
# every synced copy equals its source
(cd suite && node scripts/sync-shared-references.mjs) >/dev/null
awk '/^[^ #]/{k=$1; sub(/:$/,"",k)} /^  - /{print k"\t"$2}' suite/shared/manifest.yaml | while IFS=$'\t' read k src; do cmp -s "suite/shared/references/$src" "suite/$k/references/$src" || echo "OUT OF SYNC $k $src"; done   # nothing
```

Every `grep` above that lists files or lines must print nothing; the `for` loops must print nothing; the `test` line must succeed.

**Acceptance criteria:**

- Eight files exist under `suite/shared/references/formats/`, each with an H1 of the form `# <Artifact> format`, exactly `## Shape` then `## Rules` as its only H2s, and no H3.
- No format file contains a fenced `sh` block, a catalog command, a conflict rule, a `printf` append, a one-writer rule, a rewrite-in-place rule, or the words `docs/threads`, `docs/roadmaps`, or "archive".
- `thread.md` names the `.wip/threads/yyyy/mm/dd-hhmm-slug/` layout, the identifier rule, the same-minute rule, every listed file and folder, and that a closed thread stays in place.
- `glossary.md` gives the table shape and the thread-glossary-is-authoritative rule.
- `roadmap-index.md` places the index at `.wip/roadmaps/` and names the closed thread by its path relative to `.wip/threads/`.
- The sync script has been run and the synced copies match their sources.

**Consumes:** none

**Produces:** `suite/shared/references/formats/thread.md` and `suite/shared/references/formats/glossary.md` (Markdown, skeleton-shaped), for task 3 to declare in `shared/manifest.yaml`; the format skeleton (title / paragraph / `## Shape` / `## Rules`) that task 8 documents in `suite/authoring/shared-references.md`; `adr.md` without the catalog command and conflict rule, whose new home task 3 writes; `log-line.md` without the append mechanics, whose new home task 2 writes.
