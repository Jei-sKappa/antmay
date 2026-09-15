### Task 10: Migrate every thread to `.wip/threads/`

**Objective:** Move all thirty-five thread folders of this repository, this one included, from `docs/threads/<YYMMDDHHMMSSZ-slug>/` to `.wip/threads/20YY/MM/DD-HHMM-slug/` with Git recording the moves, rewrite only the references that must resolve, update `.gitignore`, and leave `docs/threads/` gone — as one commit of its own.

**Input / context:** `spec.md` § "Thread location and migration" and AC-8.1 … AC-8.3. Settled decisions: `decisions.md DR18` (every thread moves; the leaf derives from the old stamp; references outside a thread and parent references in seeds are rewritten; thread-internal text is otherwise untouched; the move is one commit), `DR10`, `DR13`. Facts observed at planning time: `docs/threads/` holds 35 folders; no two share a minute stamp, so no slug collision arises; `docs/roadmaps/` and `docs/adr/` do not exist, so there is no index to move and no closing line to rewrite; four seeds reference other threads by `docs/threads/<old>/…` paths (`260726163046Z-native-cli-stage-resume/seed.md`, `260728101046Z-pipeline-followups-and-ignore-preflight/seed.md`, `260801125713Z-boundary-retry-and-engine-followups/seed.md`, `260913114934Z-follow-ups/seed.md`); older threads keep their seed at `seed/seed.md` and several of those name sibling threads too; `.gitignore` carries four rules anchored at `docs/threads/**/`. Workspaces (`.pending-decisions/`, `.pending-reviews/`, `.runs/`, and thread-local `.wip/`) are gitignored, so `git mv` will not carry untracked files inside them — move them by hand. Tasks 1–9 have already removed every `docs/threads` / `docs/roadmaps` reference from `suite/`, `README.md`, the `AGENTS.md` files, `CONTRIBUTING.md`, and `docs/*.md`; `cli/` keeps its references by decision.

**Path hand-off.** This run's thread root, plan folder, and implementation folder move with this task. After step 4 the thread root is `.wip/threads/2026/09/13-1149-follow-ups/`; read task 11's brief from `plan-tasks/` under the plan folder at its new path, and write this run's `progress.md` and `report.md` under `implementations/<this run's folder>/` at the new path.

**Steps:**

1. Confirm the starting state: `git status --porcelain` shows nothing unexpected beyond this run's own uncommitted work; `ls docs/threads | wc -l` prints 35; `ls docs/threads | sed -E 's/^([0-9]{10})[0-9]{2}Z-.*/\1/' | sort | uniq -d` prints nothing.
2. Build the mapping and move the folders with Git — the mapping is load-bearing:

   ```sh
   : > /tmp/thread-map.tsv
   for d in docs/threads/*/; do
     d=${d%/}; name=$(basename "$d")
     stamp=${name%%Z-*}; slug=${name#*Z-}
     new="20${stamp:0:2}/${stamp:2:2}/${stamp:4:2}-${stamp:6:4}-$slug"
     printf '%s\t%s\n' "$name" "$new" >> /tmp/thread-map.tsv
     mkdir -p ".wip/threads/$(dirname "$new")"
     git mv "$d" ".wip/threads/$new"
   done
   ```

   Then carry over anything Git left behind (untracked workspace contents): for each row of the map, if `docs/threads/<old>` still exists, `mv` its remaining contents into `.wip/threads/<new>/` preserving relative paths, then remove the emptied old folder. Finally remove `docs/threads/` itself once empty.
3. Rewrite the references that must resolve, using the map. For every old name `<old>` with new path `<new>`:
   - in every seed — files matching `.wip/threads/*/*/*/seed.md` and `.wip/threads/*/*/*/seed/seed.md` — replace `docs/threads/<old>` with `.wip/threads/<new>` (path form) and, where a bare `<old>` folder name stands alone as a reference, replace it with `<new>`;
   - in every tracked file outside `.wip/` and outside `cli/` — after tasks 1–9 that should be only `.gitignore`, but run the search: `grep -rln 'docs/threads' --exclude-dir=cli --exclude-dir=.wip --exclude-dir=node_modules --exclude-dir=.git .` — replace the same way.
   Leave every other file inside a thread as written (specs, plans, decisions, reports, reviews): they are that thread's record of its moment. Use `sed -i ''` (macOS) or a short script; verify with `git diff --stat` that only seeds and `.gitignore` changed content.
4. Edit `.gitignore`: replace the four `docs/threads/**/…` rules with `.wip/threads/**/.wip/`, `.wip/threads/**/.pending-decisions/`, `.wip/threads/**/.pending-reviews/`, `.wip/threads/**/.runs/`, keeping their comments. Confirm no rule ignores `.wip/` itself: `git check-ignore -v .wip/threads/2026/09/13-1149-follow-ups/spec.md` prints nothing.
5. From here on, this run's thread root is `.wip/threads/2026/09/13-1149-follow-ups/`. Append this task's progress block to `progress.md` under `implementations/<this run>/.runs/` at the new path.
6. Run the verification block.
7. Commit boundary: this task's changes — the moves, the seed rewrites, `.gitignore` — are one commit with no other change in it, under the run's per-task cadence (a root-level change, so no scope: for example `chore: move threads to .wip/threads/ in the year/month layout`). If the run does not commit, leave these changes staged together and state in the report that they form the migration commit.

**Files modified:** every folder `docs/threads/<YYMMDDHHMMSSZ-slug>/` → `.wip/threads/20YY/MM/DD-HHMM-slug/` (moved, 35 folders, content untouched except the seed rewrites), `.wip/threads/*/*/*/seed.md` and `.wip/threads/*/*/*/seed/seed.md` where they referenced another thread (content edited), `.gitignore`, `docs/threads/` (DELETED).

**Verification:**

```sh
test ! -e docs/threads
find .wip/threads -mindepth 3 -maxdepth 3 -type d | wc -l                     # 35
find .wip/threads -mindepth 3 -maxdepth 3 -type d | grep -vE '^\.wip/threads/20[0-9]{2}/[0-9]{2}/[0-9]{2}-[0-9]{4}-[a-z0-9-]+$'   # nothing
test -d .wip/threads/2026/09/13-1149-follow-ups && test -f .wip/threads/2026/09/13-1149-follow-ups/spec.md && test -f .wip/threads/2026/09/13-1149-follow-ups/glossary.md
git status --porcelain | grep -vE '^(R  |RM )' | grep -v '^ M \.gitignore'      # nothing: only renames, seed edits, and .gitignore
git status --porcelain | grep '^RM' | grep -v 'seed'                               # nothing: every content edit is a seed
# AC-8.2 (docs/glossary.md excluded by decision — see plan.md)
grep -rn 'docs/threads\|docs/roadmaps' --exclude-dir=cli --exclude-dir=.wip --exclude-dir=node_modules --exclude-dir=.git . | grep -v '^./docs/glossary.md'    # nothing
# AC-8.3: every thread reference in a seed resolves
grep -rhoE '\.wip/threads/[0-9]{4}/[0-9]{2}/[0-9]{2}-[0-9]{4}-[a-z0-9-]+' .wip/threads/*/*/*/seed.md .wip/threads/*/*/*/seed/seed.md 2>/dev/null | sort -u | while read p; do test -d "$p" || echo "UNRESOLVED $p"; done
grep -rn 'docs/threads' .wip/threads/*/*/*/seed.md .wip/threads/*/*/*/seed/seed.md 2>/dev/null    # nothing
grep -n 'docs/threads' .gitignore; grep -c '\.wip/threads/\*\*/' .gitignore    # nothing; 4
git check-ignore -v .wip/threads/2026/09/13-1149-follow-ups/spec.md            # nothing
git check-ignore -q .wip/threads/2026/09/13-1149-follow-ups/.pending-decisions/x.md && echo ignored-ok
```

**Acceptance criteria:**

- `docs/threads/` does not exist; 35 thread folders sit at `.wip/threads/20YY/MM/DD-HHMM-slug/` with every file intact, and Git records each as a rename.
- Every seed's reference to another thread resolves to an existing folder under `.wip/threads/`; no seed names `docs/threads`.
- No tracked file outside `cli/`, `.wip/`, and `docs/glossary.md` contains `docs/threads` or `docs/roadmaps`.
- `.gitignore` ignores the thread workspaces under `.wip/threads/**/` and does not ignore `.wip/` itself.
- The changes of this task stand alone as one commit (or one staged set), and the run's own progress file and report live under the thread's new root.

**Consumes:** `README.md`, `AGENTS.md`, `suite/AGENTS.md`, `CONTRIBUTING.md`, `docs/*.md`, and `suite/` free of `docs/threads` references (tasks 1–9); this thread's `glossary.md` (task 9), which moves with the thread.

**Produces:** the thread root `.wip/threads/2026/09/13-1149-follow-ups/` — the path task 11 and the run's report writes use; `/tmp/thread-map.tsv` (old name → new path, tab-separated) for task 11's final checks if needed.
