### Task 3: Add check-delta's rendering, word counts and landed view

**Objective:** Give `check-delta.mjs` the three things that are read rather than checked. The first is each edit as an old/new pair of literal text blocks. The second is before/after word counts for every agents-file target. The third is the landed view of any created or edited target. `review-spec` and `close-thread` work from these without parsing JSON by hand.

**Input / context:**
- This task starts from Task 2's `suite/shared/references/scripts/check-delta.mjs` and its exported `checkDelta` / `formatReport`.
- Requirements: `spec.md`, `### The scripts`, under **Rendering.**, **Agents-file word counts.** and **Landed view.**
- The command-line shape and the block layout below are pinned within the spec's degrees of freedom, so that Tasks 6 and 7 can name them. Every other layout detail is the implementer's choice.
- Words are counted the way `wc -w` counts them: maximal runs of characters other than space, `\t`, `\n`, `\v`, `\f` and `\r`.
- Constraint: only `node:` built-ins.

**Steps:**
1. In `check-delta.mjs`, export `countWords(text: string): number`, counting as stated above.
2. Extend `formatReport` so that under each `  edit <N>: <status>` line it prints the edit's `old_string` block and then its `new_string` block, literally and with no escaping:
   - A block opens with a fence line of tildes followed by ` old` or ` new`, and closes with a line of the same tildes alone.
   - The fence is three tildes, or one more than the longest run of tildes in the content.
   - A string that does not end in a newline gets one added for display only. An empty `new_string` renders as an empty block.
3. Extend `formatReport` with one line per document that has no failure and whose target's last segment is `AGENTS.md` or `CLAUDE.md`, of the form `words <target>: <before> -> <after>`:
   - before is `countWords(before)`, or `0` for a `create`;
   - after is `countWords(landed)`, or `0` for a `delete`.
4. Export `landedView(result: CheckResult, target: string): string | null`. It returns the `landed` content of the document whose `target` equals `target` when that document is a `create` or an `edit`. It returns `null` otherwise.
5. Extend the command with an optional `--landed <target path>`, giving the full form `node check-delta.mjs <thread root> [--landed <target path>]`. The target path is project-root-relative, as `target` is.
   - When the delta has no failure and `landedView` returns a string, print exactly that string to stdout, with no report and no added newline, and exit 0.
   - When the delta has any failure, print the report to stderr, print nothing to stdout, and exit 1.
   - When the delta holds no `create` or `edit` for that target, print a one-line message to stderr and exit 2.
   - Without `--landed`, the command behaves as in Task 2, with the richer report.
6. Update the header comment to describe the rendering, the word counts and `--landed`.
7. Run the verification below from `suite/` and fix until it holds.

**Files modified:**
- `suite/shared/references/scripts/check-delta.mjs`

**Verification:** from `suite/`, build the scratch fixtures (not committed):

```sh
S="$PWD/shared/references/scripts"; W="$(mktemp -d)"; P="$W/p"
mkdir -p "$P/docs" "$P/t1/delta/docs" "$P/t3/delta/sub"
printf '# Glossary\n\n| Term | Meaning |\n| --- | --- |\n| **alpha** | First. |\n| **beta** | Second. |\n' > "$P/docs/glossary.md"
printf '# Agents\n\n- Rule one.\n- Rule two.\n' > "$P/AGENTS.md"
printf '# C\n\nx y\n' > "$P/CLAUDE.md"
cat > "$P/t1/delta/docs/glossary.md.json" <<'EOF'
{"type":"edit","edits":[{"old_string":"| **beta** | Second. |\n","new_string":"| **beta** | Second. |\n| **gamma** | Third. |\n"},{"old_string":"| **alpha** | First. |\n","new_string":""}]}
EOF
cat > "$P/t1/delta/AGENTS.md.json" <<'EOF'
{"type":"edit","edits":[{"old_string":"Rule","new_string":"Law","replace_all":true},{"old_string":"- Law two.\n","new_string":""}]}
EOF
printf '# Sub\n\nOne two three.\n' > "$P/t3/delta/sub/AGENTS.md"
echo '{"type":"delete"}' > "$P/t3/delta/CLAUDE.md.json"
```

Then check each of these:
- Rendering: `(cd "$P" && node "$S/check-delta.mjs" t1) > "$W/t1.out"; echo "exit=$?"` prints `exit=0`.
  - `grep -c -E '^~~~+ old$' "$W/t1.out"` and `grep -c -E '^~~~+ new$' "$W/t1.out"` each print `4`.
  - `grep -c -x -F '| **gamma** | Third. |' "$W/t1.out"` prints `1`.
  - `grep -c -F '\n' "$W/t1.out"` prints `0`.
- Word counts:
  - `grep -x -F "words AGENTS.md: $(wc -w < "$P/AGENTS.md" | tr -d ' ') -> 5" "$W/t1.out"` prints one line.
  - `(cd "$P" && node "$S/check-delta.mjs" t3) | grep -x -F -e 'words sub/AGENTS.md: 0 -> 5' -e 'words CLAUDE.md: 4 -> 0'` prints both lines.
  - `grep -c '^words docs/glossary.md' "$W/t1.out"` prints `0`.
- Landed view:
  - `printf '# Agents\n\n- Law one.\n' > "$W/expect"; (cd "$P" && node "$S/check-delta.mjs" t1 --landed AGENTS.md) | cmp - "$W/expect"` reports no difference.
  - `(cd "$P" && node "$S/check-delta.mjs" t3 --landed sub/AGENTS.md | wc -w)` prints `5`.
  - `(cd "$P" && node "$S/check-delta.mjs" t3 --landed CLAUDE.md); echo "exit=$?"` ends `exit=2`.
  - `echo '{ bad' > "$P/t1/delta/docs/glossary.md.json"; (cd "$P" && node "$S/check-delta.mjs" t1 --landed AGENTS.md 2>/dev/null | wc -c); (cd "$P" && node "$S/check-delta.mjs" t1 --landed AGENTS.md >/dev/null 2>&1); echo "exit=$?"` prints `0`, then `exit=1`.
- Imports: `grep -E "from ['\"]" shared/references/scripts/check-delta.mjs | grep -v -E "from ['\"]node:"` prints nothing.
- `node scripts/check-skill-text.mjs` exits 0, and `node scripts/check-marketplace-skills.mjs` exits 0.

**Acceptance criteria:**
- `check-delta.mjs` renders each edit as an old/new pair of literal text blocks.
- `check-delta.mjs` reports before and after word counts, as `wc -w` counts them, for every `AGENTS.md` or `CLAUDE.md` target.
- `check-delta.mjs` can print a target as it will stand after landing.
- `countWords` and `landedView` are exported from `check-delta.mjs`.
- Task 2's verification still holds: the same exit codes, failure lines and no-write behavior.

**Consumes:** `suite/shared/references/scripts/check-delta.mjs` (Task 2): `checkDelta`, `formatReport`, and the `CheckResult` / `DeltaDocument` shapes.

**Produces:**
- The report lines `words <target>: <before> -> <after>` for agents-file targets.
- Tilde-fenced `old` / `new` blocks under each `  edit <N>: <status>` line.
- The command `node <path>/check-delta.mjs <thread root> --landed <target path>`, which prints the landed target to stdout and exits 0, 1 or 2.
- Exports `countWords(text: string): number` and `landedView(result: CheckResult, target: string): string | null`.
