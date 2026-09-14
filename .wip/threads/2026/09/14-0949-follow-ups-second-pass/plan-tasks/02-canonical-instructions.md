### Task 2: Canonical instructions — prefixed directive pointers and the every-exit sentence

**Objective:** Make every pointer inside the shared instruction files carry the `<skill_path>/` prefix and read as a directive, and give `emit-terminal-outcome.md` the one sentence saying it is followed at whichever exit the run reaches.

**Input / context:** `spec.md` § "The `<skill_path>` prefix" (the instruction files' own pointers carry the prefix), § "Reference pointers as directives" (the three "per `references/formats/…`" pointers in instruction files are rewritten; `per` never precedes a `<skill_path>/` pointer), and § "Every exit points at the terminal-outcome instruction" (the file gains one sentence); AC-1.1, AC-1.2, AC-4.1, AC-5.4. Settled decisions: `decisions.md DR1` (the prefix applies inside every shared reference file, instruction → format pointers included), `DR4` (a pointer is a directive; no `per` before a path; no restating the pointed file), `DR5` (the file is kept singular and is the only place the vocabulary and line rules are written; it gains one sentence). Material: the four pointers today —
- `shared/references/instructions/append-log-line.md`: "…are fixed in `references/formats/log-line.md`."
- `shared/references/instructions/create-thread.md`: "The layout this act writes into is fixed in `references/formats/thread.md`."
- `shared/references/instructions/emit-pending-decisions.md`: "Write the file per `references/formats/pending-decision-bundle.md`: the routing header, then one section per point."
- `shared/references/instructions/write-implementation-report.md`: "Write it per `references/formats/implementation-report.md`: its path inside the folder, the `Plan:` header line, the section order, which sections are always present, and the shape of an entry under `## Deviations`."

Starts from task 1's synced tree; the instruction files themselves were not touched by task 1.

**Steps:**

1. In `suite/shared/references/instructions/append-log-line.md`, change the pointer to `<skill_path>/references/formats/log-line.md`. The sentence "What an entry looks like and which seven types it may carry are fixed in …" already reads as a directive to conform; keep its wording.
2. In `suite/shared/references/instructions/create-thread.md`, change the pointer to `<skill_path>/references/formats/thread.md`; keep the sentence's wording.
3. In `suite/shared/references/instructions/emit-pending-decisions.md`, rewrite the first sentence of `## Write the bundle` so it reads as a directive without `per` and without restating the format's contents — for example: "Write the file following `<skill_path>/references/formats/pending-decision-bundle.md`." Drop ": the routing header, then one section per point" (the format carries it). Keep the next sentence about the `Producer:` line reading `/<your own skill name>`: that is a parameter the format leaves open.
4. In `suite/shared/references/instructions/write-implementation-report.md`, rewrite the first sentence of the second paragraph the same way — for example: "Write it following `<skill_path>/references/formats/implementation-report.md`." Drop the enumeration ": its path inside the folder, the `Plan:` header line, the section order, which sections are always present, and the shape of an entry under `## Deviations`" (the format carries it). Keep the sentence about what the `Plan:` line names, which is the parameter the format leaves open.
5. In `suite/shared/references/instructions/emit-terminal-outcome.md`, add exactly one sentence stating that the instruction is followed at whichever exit the run reaches — refusal, block, or completion. Default placement: a new sentence directly after the fenced line, before "The vocabulary is closed to three tokens:", reading for example "Follow this at whichever exit the run reaches — a refusal, a block, or a completion — and at that one exit only." Change nothing else in the file: the vocabulary bullets, the `## Rules` bullets, and the examples stay byte-for-byte.
6. Read each of the six instruction files once more and confirm no other `references/` occurrence and no `per` before a path remains (`emit-pending-review.md` and the tracker/convention files have none today).
7. From `suite/`, run `node scripts/sync-shared-references.mjs`.

**Files modified:** `suite/shared/references/instructions/append-log-line.md`, `suite/shared/references/instructions/create-thread.md`, `suite/shared/references/instructions/emit-pending-decisions.md`, `suite/shared/references/instructions/write-implementation-report.md`, `suite/shared/references/instructions/emit-terminal-outcome.md`, and the generated copies of those five files under every declaring skill's `references/instructions/` (written by the sync).

**Verification:** run from `suite/`:

```sh
grep -rn 'references/' shared/references | grep -v '<skill_path>/references/'        # → no output
grep -rn 'per `<skill_path>' shared/references                                         # → no output
grep -rn '<skill_path>/references/formats/' shared/references/instructions | wc -l     # → 4 (AC-1.2)
grep -rn 'references/' skills --include='*.md' --exclude='SKILL.md' | grep -v '<skill_path>/references/' | grep '/references/instructions/'   # → no output (every synced instruction copy is prefixed)
grep -rn 'per `<skill_path>' skills                                                    # → no output
grep -c 'whichever exit' shared/references/instructions/emit-terminal-outcome.md       # → 1
diff <(git show $BASE:suite/shared/references/instructions/emit-terminal-outcome.md | grep -v '^$') <(grep -v '^$' shared/references/instructions/emit-terminal-outcome.md)   # → exactly one added line, nothing removed (AC-5.4)
grep -n 'routing header, then one section per point' shared/references/instructions/emit-pending-decisions.md   # → no output
grep -n 'which sections are always present' shared/references/instructions/write-implementation-report.md     # → no output
grep -n 'Producer:' shared/references/instructions/emit-pending-decisions.md          # → still present
grep -n 'Plan: none' shared/references/instructions/write-implementation-report.md    # → still present
h1=$(find skills -path "*/references/*" -name "*.md" | sort | xargs cat | shasum); node scripts/sync-shared-references.mjs >/dev/null; h2=$(find skills -path "*/references/*" -name "*.md" | sort | xargs cat | shasum); [ "$h1" = "$h2" ] && echo "second sync is a no-op" || echo "second sync changed the tree — investigate"   # → "second sync is a no-op"
for s in $(awk '/^skills\//{k=$1} /emit-terminal-outcome/{print k}' shared/manifest.yaml | tr -d ':'); do cmp shared/references/instructions/emit-terminal-outcome.md $s/references/instructions/emit-terminal-outcome.md || echo "$s differs"; done   # → no output (12 identical copies)
node scripts/check-marketplace-skills.mjs                                              # → exit 0
git status --porcelain -- ../cli                                                       # → no output
```

**Acceptance criteria:**
- Every pointer inside `suite/shared/references/instructions/*.md` to a format file reads `<skill_path>/references/formats/<name>.md` (AC-1.2), and no `references/` occurrence under `suite/shared/references/` lacks the prefix (AC-1.1, scoped to this folder).
- No `per` directly precedes a `<skill_path>/` pointer anywhere under `suite/shared/references/` or in any synced copy (AC-4.1, scoped).
- `emit-pending-decisions.md` and `write-implementation-report.md` no longer enumerate the contents of the format they point at; their skill-specific parameters (`Producer:` line, `Plan:` line) remain.
- `emit-terminal-outcome.md` contains one sentence stating it is followed at whichever exit the run reaches, and is otherwise unchanged (AC-5.4).
- Every synced copy is byte-identical to its canonical file; a second sync changes nothing; the marketplace check exits 0; `cli/` has no diff.

**Consumes:** the synced tree from task 1 (the sync in this task re-copies the formats task 1 fixed; they must already be flush left).

**Produces:** the five canonical instruction files at `suite/shared/references/instructions/<name>.md` with prefixed, directive pointers, and `emit-terminal-outcome.md` carrying the every-exit sentence — the file the body tasks 4–6 point at from every exit with the exact path `<skill_path>/references/instructions/emit-terminal-outcome.md`.
