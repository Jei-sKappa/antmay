### Task 1: Canonical formats — the types overview and flush-left fences

**Objective:** Make `log-line.md` list its seven types under `### Types` with definition and example together, and start every fence in the three indented format files at column one, so the synced copies read identically everywhere.

**Input / context:** `spec.md` § "`log-line.md` regains the types overview" and § "Flush-left fences"; AC-6.1 … AC-6.5 and AC-7.1. Settled decisions: `decisions.md DR6` (the `### Types` subheading inside `## Shape`, definition and labelled example on one bullet, the vocabulary closed at seven, no `note` type, the authoring skeleton unchanged) and `decisions.md DR7` (no indented fence anywhere in a reference file). Material: the current `suite/shared/references/formats/log-line.md` — its seven definitions sit in one `## Rules` bullet and its seven example lines in a standalone `text` block under `## Shape`; and `suite/shared/references/formats/pending-decision-bundle.md`, `implementation-report.md`, `roadmap-index.md`, whose whole `## Shape` block (opening fence, content, closing fence) is indented by two spaces. This task depends on nothing from an earlier task.

**Steps:**

1. Rewrite `suite/shared/references/formats/log-line.md` so that its body is, in order: the title and intro paragraph unchanged; `## Shape` holding the fenced header-and-entry skeleton unchanged, then a `### Types` subheading with seven bullets; `## Rules`. Remove the "One example line per type:" sentence and the `text` block that followed it. Each `### Types` bullet is the type name in backticks, an em-dash, the one-line definition, and an indented continuation line that starts with the literal word `Example:` followed by one example entry in backticks. Use this content (definitions and examples are those already in the file; the degrees of freedom allow rewording them, not the seven types or their meanings):

   ````markdown
   ## Shape

   ```text
   # Thread log

   - (type) gist with the reason folded in
   ```

   ### Types

   - `decision` — a choice that has been settled and that later work rests on.
     Example: `- (decision) exports go through the queue worker, because the request path cannot hold a multi-minute job`
   - `constraint` — a boundary the work must respect, whether external or chosen.
     Example: `- (constraint) the public API shape stays as published, since three external clients depend on it`
   - `assumption` — something taken as true without confirmation, which later work may need to revisit.
     Example: `- (assumption) the nightly batch runs under ten minutes, based on last quarter's timings`
   - `question` — something open that still needs an answer.
     Example: `- (question) whether partial exports should be retained or discarded when a run fails`
   - `capability` — something the work can now do, or that the surrounding system offers.
     Example: `- (capability) the storage layer can already stream large objects, so no new transport is needed`
   - `direction` — where the work is heading, above the level of any single choice.
     Example: `- (direction) the thread is moving the whole reporting surface off the synchronous path`
   - `event` — a moment in the thread's life, such as an artifact being authored or the thread closing.
     Example: `- (event) spec authored from the conversation`
   ````

2. In the same file's `## Rules`, replace the bullet that begins "Every line uses one of exactly seven types:" (the one inlining all seven definitions) with the bullet `Every line uses one of the seven types listed under \`### Types\`.`, and add directly after it the bullet `A thought that fits none of the seven types is not a log entry and is left out of the file.` Keep the other five Rules bullets as they are. Add no other section.
3. In `suite/shared/references/formats/pending-decision-bundle.md`, remove the two leading spaces from every line of the `## Shape` block, from the opening ```` ```markdown ```` line through the closing ```` ``` ```` line inclusive (lines 7–31 today). Content lines inside the block lose exactly two spaces each, so their relative indentation is preserved.
4. Do the same in `suite/shared/references/formats/implementation-report.md` (the block is lines 7–35 today).
5. Do the same in `suite/shared/references/formats/roadmap-index.md` (the block is lines 7–33 today).
6. From `suite/`, run `node scripts/sync-shared-references.mjs`. Hand-edit no file under any skill's `references/`.

**Files modified:** `suite/shared/references/formats/log-line.md`, `suite/shared/references/formats/pending-decision-bundle.md`, `suite/shared/references/formats/implementation-report.md`, `suite/shared/references/formats/roadmap-index.md`, and the generated copies the sync writes: `suite/skills/capture-discussion/discussion/references/formats/log-line.md`, `suite/skills/capture-discussion/resolve-pending-decisions/references/formats/log-line.md`, `suite/skills/spec/spec/references/formats/log-line.md`, and every `references/formats/pending-decision-bundle.md`, `references/formats/implementation-report.md`, `references/formats/roadmap-index.md` under a skill that `suite/shared/manifest.yaml` declares.

**Verification:** run from `suite/` (`$BASE` is the commit the run started from):

```sh
F=shared/references/formats/log-line.md
grep -c '^## ' $F                                        # → 2
grep -n '^## \|^### ' $F                                 # → "## Shape", "### Types", "## Rules" in that order, nothing else
awk '/^### Types/{p=1} /^## Rules/{p=0} p && /^- `/' $F | wc -l          # → 7
awk '/^### Types/{p=1} /^## Rules/{p=0} p && /^  Example: `- \(/' $F | wc -l   # → 7
for t in decision constraint assumption question capability direction event; do grep -q "^- \`$t\` — " $F || echo "missing type $t"; done   # → no output
grep -c '^```' $F                                        # → 2 (one fenced block, the skeleton)
grep -n 'One example line per type' $F                   # → no output
grep -n 'Every line uses one of the seven types listed under `### Types`\.' $F   # → one line under ## Rules
grep -n 'fits none of the seven' $F                      # → one line under ## Rules
grep -n 'Every line uses one of exactly seven' $F        # → no output
grep -rnE '^[[:space:]]+```' skills shared/references    # → no output (AC-7.1)
for f in pending-decision-bundle implementation-report roadmap-index; do
  diff <(git show $BASE:suite/shared/references/formats/$f.md | sed 's/^  //') shared/references/formats/$f.md && echo "$f: only the two-space indent changed"
done                                                     # → three confirmations (the sed strips two spaces from every line; lines outside the block had none)
h1=$(find skills -path "*/references/*" -name "*.md" | sort | xargs cat | shasum); node scripts/sync-shared-references.mjs >/dev/null; h2=$(find skills -path "*/references/*" -name "*.md" | sort | xargs cat | shasum); [ "$h1" = "$h2" ] && echo "second sync is a no-op" || echo "second sync changed the tree — investigate"   # → "second sync is a no-op"
for s in capture-discussion/discussion capture-discussion/resolve-pending-decisions spec/spec; do cmp $F skills/$s/references/formats/log-line.md && echo "$s: identical"; done   # → three "identical" (AC-6.4)
diff <(git show $BASE:suite/authoring/shared-references.md) authoring/shared-references.md   # → no output (AC-6.5)
node scripts/check-marketplace-skills.mjs                # → exit 0
git status --porcelain -- ../cli                         # → no output
```

**Acceptance criteria:**
- `shared/references/formats/log-line.md` has, under `## Shape`, the fenced skeleton followed by a `### Types` subheading with exactly seven bullets, one per type, each carrying a definition and an indented continuation line beginning `Example:` (AC-6.1).
- The file's only second-level headings are `## Shape` and `## Rules`, and no example block exists outside `### Types` (AC-6.2).
- `## Rules` limits lines to the seven types under `### Types`, states that a thought fitting none is not a log entry, and no rule inlines the seven definitions (AC-6.3).
- The synced copies in `discussion`, `resolve-pending-decisions`, and `spec` are byte-identical to the canonical file (AC-6.4).
- No `.md` under `suite/skills/` or `suite/shared/references/` has a fence line with leading whitespace (AC-7.1).
- `suite/authoring/shared-references.md` is unchanged (AC-6.5).
- A second sync run changes nothing; the marketplace check exits 0; `cli/` has no diff.

**Consumes:** none

**Produces:** the canonical `suite/shared/references/formats/log-line.md` with `### Types`, and the flush-left `pending-decision-bundle.md`, `implementation-report.md`, `roadmap-index.md`, all synced into their declaring skills — the state the check script in task 8 must find clean.
