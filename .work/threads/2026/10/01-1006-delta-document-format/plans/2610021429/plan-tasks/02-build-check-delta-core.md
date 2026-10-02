### Task 2: Build the check-delta core

**Objective:** Add `check-delta.mjs`, which reads a thread's delta against the project layer and computes what landing would write. It reports every malformed document and every conflict in one run, writes nothing, and exports the computation `apply-delta.mjs` will reuse.

**Input / context:**
- The format rules come from `suite/shared/references/formats/delta-document.md` as Task 1 rewrote it. The script requirements come from `spec.md`, `### The scripts` (the `check-delta.mjs` part).
- Why: `delta/docs/adr/2610021413-delta-landed-by-shipped-scripts.md`.
- Constraints: only `node:` built-ins, and the direct-run guard exactly as Global Constraints states it.
- Pinned within the spec's degrees of freedom: the command-line shape, the report lines that verification greps, and the export surface below. Every other layout and internal structure is the implementer's choice.
- What counts as a project-layer path follows `close-thread`'s write boundary (`suite/skills/close/close-thread/SKILL.md`, `## Write boundary`): `docs/glossary.md`, a direct child `docs/adr/<name>.md` or `docs/pdr/<name>.md`, or any path whose last segment is `AGENTS.md` or `CLAUDE.md` and whose first segment is not `.work`.
- Style: follow the existing suite scripts (`suite/scripts/sync-shared-references.mjs`). That means a header comment stating purpose, guarantees, exit codes and "Dependency-free: only `node:` built-ins.", plus small named functions.

**Steps:**
1. Create `suite/shared/references/scripts/check-delta.mjs` with a `#!/usr/bin/env node` line and a header comment in the style named above.
2. Define and export this surface. Its shapes are load-bearing for Tasks 3 and 4:

   ```js
   /**
    * @typedef {{ index: number,                       // 1-based position in `edits`
    *             old_string: string, new_string: string, replace_all: boolean,
    *             status: "applies" | "already done" | "failed" }} EditResult
    * @typedef {{ path: string,                        // relative to the thread root, e.g. "delta/AGENTS.md.json"
    *             target: string,                      // relative to the project root, e.g. "AGENTS.md"
    *             type: "create" | "edit" | "delete" | null,   // null when the type cannot be read
    *             malformed: boolean,
    *             before: string | null,               // target as read; null when it does not exist
    *             landed: string | null,               // target after landing; null for a delete or a failed document
    *             edits: EditResult[] }} DeltaDocument
    * @typedef {{ kind: "malformed" | "conflict", document: string, edit: number | null, message: string }} Failure
    * @typedef {{ threadRoot: string, documents: DeltaDocument[], failures: Failure[] }} CheckResult
    */
   export function checkDelta(threadRoot, projectRoot = process.cwd()) {}  // → CheckResult
   export function formatReport(result) {}                                // → string
   export function isProjectLayerPath(path) {}                            // → boolean
   ```

3. Collect the documents:
   - List every file under `<threadRoot>/delta/` recursively, in sorted path order, and ignore files named `.DS_Store`.
   - A missing `delta/` folder yields no documents and no failures.
   - Derive each file's target. A name ending `.json` targets the path without the suffix, and any other name targets its own path. Both are relative to `delta/`.
4. Report these as **malformed**. A malformed document gets no conflict checks.
   - The target fails `isProjectLayerPath`.
   - Two files share one target: the `delta/<target>` and `delta/<target>.json` pair. Report each of the two.
   - A `.json` document whose text does not parse.
   - A `.json` document with a top-level key missing, unknown or of the wrong type: `type` must be `"edit"` or `"delete"`; an edit document needs a non-empty array `edits`; a delete carries `type` alone.
   - An edit object with a missing, unknown or mistyped key: `old_string` must be a non-empty string, `new_string` a string, and `replace_all` a boolean when present. Report each such edit with its position.
   - A non-`.json` document is a `create`, and its whole content is the file to write.
5. Implement matching as exact after normalization:
   - Normalizing a text means turning `\r\n` and lone `\r` into `\n`, then stripping spaces and tabs at the end of every line.
   - Match the normalized `old_string` against the normalized target content.
   - Splice in a way that keeps the target's other bytes unchanged. Suggested approach: while normalizing the target, build a map from each normalized offset to its original offset. Find the match in normalized text, map its start and end back to original offsets, and splice the original string there.
   - Write the inserted `new_string` with the target's line ending: `\r\n` when the target contains `\r\n`, `\n` otherwise.
   - Count occurrences overlapping, advancing one character per search, for the uniqueness test. Under `replace_all`, replace non-overlapping occurrences left to right.
6. Report these as **conflicts**, for well-formed documents:
   - A `create` whose target exists.
   - An `edit` or `delete` whose target does not exist.
   - For each edit of an `edit`, applied in order against the result of the previous edits:
     - First, the already-done test (`spec.md`, `### The delta-document format`, as amended 2026-10-02). The edit is already done when `new_string` occurs in the content and every occurrence of `old_string` lies inside an occurrence of `new_string`. "Inside" means that for each start position `p` of `old_string`, some start position `q` of `new_string` has `q <= p` and `p + old.length <= q + new.length`, with both counted overlapping on normalized text. An already-done edit gets status `already done`, and the content does not change. This also holds under `replace_all`. With an empty `new_string` the edit is done exactly when `old_string` does not occur.
     - Otherwise, when `old_string` occurs exactly once, or at least once with `replace_all`, the status is `applies` and the content advances.
     - Otherwise, when it occurs more than once without `replace_all`, the status is `failed`, with a conflict naming the edit and the occurrence count.
     - Otherwise it does not occur, and the status is `failed`, with a conflict naming the edit.
     - A failed edit leaves the content unchanged, and checking continues with the next edit, so every failure is reported.

7. Set each document's `before` to the target content as read, or `null`. Set `landed` as follows:
   - a `create`: its content;
   - an `edit` with no failed edit: the final content;
   - a `delete`, a malformed document, or one with any failure: `null`.

   `checkDelta` opens no file for writing.
8. Implement `formatReport`:
   - For each document, one header line naming its path, its target and its type.
   - Under each edit document, one line per edit of the form `  edit <N>: <applies|already done|failed>`.
   - One line per failure that starts exactly `<kind>: <document path>: <message>`, or `<kind>: <document path> edit <N>: <message>` when the failure concerns one edit.
   - A closing line giving the failure count, or `no failures`.
9. Add the command path, guarded:
   - Run it only when `import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href`.
   - Usage is `node check-delta.mjs <thread root>`, with the project root taken as the current working directory.
   - Print the report to stdout.
   - Exit 0 when there is no failure, 1 when there is any failure, and 2 on a usage error: a missing argument, or a thread root that is not a directory.
10. From `suite/`, run the verification fixtures below. Fix the script until every expectation holds.

**Files modified:**
- `suite/shared/references/scripts/check-delta.mjs` (NEW)

**Verification:** from `suite/`, build the scratch fixtures (not committed):

```sh
S="$PWD/shared/references/scripts"; W="$(mktemp -d)"; P="$W/p"
mkdir -p "$P/docs/adr" "$P/docs/pdr" "$P/t1/delta/docs/adr" "$P/t1/delta/docs/pdr" "$P/t2/delta/docs/adr" "$P/t2/delta/docs/pdr"
printf '# Glossary\n\n| Term | Meaning |\n| --- | --- |\n| **alpha** | First. |\n| **beta** | Second. |\n' > "$P/docs/glossary.md"
printf '# Agents\n\n- Rule one.\n- Rule two.\n' > "$P/AGENTS.md"
printf -- '---\ndescription: Old.\n---\n\nOld record.\n' > "$P/docs/adr/2601010000-old.md"
printf '# R\n\nAlpha.\nBeta.\n' > "$P/docs/pdr/2601060000-landed.md"
printf 'Alpha.\nBeta.\nAlpha.\n' > "$P/docs/pdr/2601070000-twice.md"
# t1: a clean delta
cat > "$P/t1/delta/docs/glossary.md.json" <<'EOF'
{"type":"edit","edits":[
 {"old_string":"| **beta** | Second. |\n","new_string":"| **beta** | Second. |\n| **gamma** | Third. |\n"},
 {"old_string":"| **gamma** | Third. |","new_string":"| **gamma** | The third. |"},
 {"old_string":"| **delta** | Absent. |","new_string":"| **alpha** | First. |"}]}
EOF
cat > "$P/t1/delta/AGENTS.md.json" <<'EOF'
{"type":"edit","edits":[{"old_string":"Rule","new_string":"Law","replace_all":true},{"old_string":"- Law two.\n","new_string":""}]}
EOF
printf -- '---\ndescription: New.\n---\n\nNew record.\n' > "$P/t1/delta/docs/adr/2601020000-new.md"
echo '{"type":"delete"}' > "$P/t1/delta/docs/adr/2601010000-old.md.json"
echo '{"type":"edit","edits":[{"old_string":"Alpha.\n","new_string":"Alpha.\nBeta.\n"}]}' > "$P/t1/delta/docs/pdr/2601060000-landed.md.json"
# t2: one of every failure
echo '{"type":"edit","edits":[{"old_string":"| **","new_string":"| __"},{"old_string":"nowhere","new_string":"still nowhere"}]}' > "$P/t2/delta/docs/glossary.md.json"
printf '# Agents\n' > "$P/t2/delta/AGENTS.md"
echo '{"type":"delete"}' > "$P/t2/delta/docs/pdr/2601030000-gone.md.json"
echo '{"type":"edit","edits":[{"old_string":"Alpha.\n","new_string":"Alpha.\nBeta.\n"}]}' > "$P/t2/delta/docs/pdr/2601070000-twice.md.json"
echo '{ not json' > "$P/t2/delta/docs/adr/2601010000-old.md.json"
echo '{"type":"edit","edits":[{"old_string":"a","new_string":7,"extra":true}]}' > "$P/t2/delta/docs/adr/2601040000-keys.md.json"
echo '{"type":"edit"}' > "$P/t2/delta/docs/adr/2601050000-missing.md.json"
echo 'x' > "$P/t2/delta/README.md"
printf '# C\n' > "$P/t2/delta/CLAUDE.md"; echo '{"type":"delete"}' > "$P/t2/delta/CLAUDE.md.json"
```

Then check each of these:
- `(cd "$P" && node "$S/check-delta.mjs" t1); echo "exit=$?"`: the output ends `exit=0`. It contains `edit 3: already done` (the glossary edit with an absent `old_string`) and, under `docs/pdr/2601060000-landed.md`, `edit 1: already done` (an addition already landed).
- `(cd "$P" && node "$S/check-delta.mjs" t2) > "$W/t2.out"; echo "exit=$?"`: prints `exit=1`. Every one of these patterns matches a line of `$W/t2.out` (check with `grep -E '^<pattern>' "$W/t2.out"`):
  - `conflict: delta/docs/glossary.md.json edit 1:`
  - `conflict: delta/docs/glossary.md.json edit 2:`
  - `conflict: delta/AGENTS.md:`
  - `conflict: delta/docs/pdr/2601030000-gone.md.json:`
  - `conflict: delta/docs/pdr/2601070000-twice.md.json edit 1:` (one occurrence of `old_string` lies outside `new_string`, so the addition is not done, and `old_string` occurs twice)
  - `malformed: delta/docs/adr/2601010000-old.md.json:`
  - `malformed: delta/docs/adr/2601040000-keys.md.json edit 1:`
  - `malformed: delta/docs/adr/2601050000-missing.md.json:`
  - `malformed: delta/README.md:`
  - `malformed: delta/CLAUDE.md:`
  - `malformed: delta/CLAUDE.md.json:`
- Writes nothing: `(cd "$W" && find p -type f | sort | xargs shasum) > "$W/before"`. Then run both commands above again, then `(cd "$W" && find p -type f | sort | xargs shasum) | diff "$W/before" -`. The diff prints nothing.
- Symlink guard: `ln -s "$S/check-delta.mjs" "$W/link.mjs" && (cd "$P" && node "$W/link.mjs" t1) | grep -c 'already done'` prints `2`.
- Order and `replace_all`: `(cd "$P" && node --input-type=module -e "import { checkDelta } from '$S/check-delta.mjs'; for (const d of checkDelta('t1').documents) console.log(JSON.stringify([d.target, d.landed]));")` prints, among its lines:
  - `["AGENTS.md","# Agents\n\n- Law one.\n"]`
  - a `docs/glossary.md` line ending `| **gamma** | The third. |\n"]`
  - `["docs/pdr/2601060000-landed.md","# R\n\nAlpha.\nBeta.\n"]`, so the landed addition is not applied again
- Imports: `grep -E "from ['\"]" shared/references/scripts/check-delta.mjs | grep -v -E "from ['\"]node:"` prints nothing.
- `grep -n 'realpathSync(process.argv\[1\])' shared/references/scripts/check-delta.mjs` prints the guard line.
- `node scripts/check-skill-text.mjs` exits 0, and `node scripts/check-marketplace-skills.mjs` exits 0.

**Acceptance criteria:**
- Running `check-delta.mjs` directly through a symlinked path produces its report rather than exiting silently.
- `check-delta.mjs` writes no file under any input.
- `check-delta.mjs` exits non-zero and names the edit when an `old_string` occurs more than once without `replace_all`.
- `check-delta.mjs` exits non-zero and names the edit when an `old_string` does not occur and its `new_string` does not occur either.
- `check-delta.mjs` reports an edit whose `old_string` is absent and whose `new_string` is present as already done, not as a failure.
- `check-delta.mjs` reports an addition already in the target, whose `new_string` occurs and every occurrence of whose `old_string` lies inside an occurrence of `new_string`, as already done, and the landing does not apply it again.
- `check-delta.mjs` reports a `create` whose target exists, and an `edit` or `delete` whose target does not exist, as conflicts.
- `check-delta.mjs` reports unparsable JSON, a missing, unknown or mistyped key, an unmirrored path, and two documents for one target as malformed.
- `check-delta.mjs` reports every failure in the delta in one run, each with its kind.
- Edits apply in order, each against the result of the previous edit, and a `replace_all` edit replaces every occurrence.
- `checkDelta`, `formatReport` and `isProjectLayerPath` are exported from `suite/shared/references/scripts/check-delta.mjs` with the shapes above.
- The command exits 0 on a clean delta, 1 on any failure, and 2 on a usage error.

**Consumes:** `suite/shared/references/formats/delta-document.md` (Task 1) — the rules the script enforces.

**Produces:**
- `suite/shared/references/scripts/check-delta.mjs`, exporting:
  - `checkDelta(threadRoot, projectRoot = process.cwd()): CheckResult`
  - `formatReport(result: CheckResult): string`
  - `isProjectLayerPath(path: string): boolean`
- The command `node <path>/check-delta.mjs <thread root>`, run from the project root, which exits 0, 1 or 2.
- Report lines of the form `  edit <N>: <applies|already done|failed>`, and `<kind>: <document path>[ edit <N>]: <message>`.
