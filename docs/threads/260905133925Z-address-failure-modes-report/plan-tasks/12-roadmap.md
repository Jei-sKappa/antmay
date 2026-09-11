### Task 12: Rewrite `roadmap`

**Objective:** Make `roadmap` author the project-level index at `docs/roadmaps/<yymmddhhmm>-<slug>.md` with slug-headed entries, from the thread's inputs, and nothing else.

**Input / context:** Starts from task 11. `spec.md` `### Roadmap`, `### Skill inventory` (`roadmap`), `### The project layer` (`docs/roadmaps/`); decisions.md DR14, DR18, DR21, DR28. Existing body: `suite/skills/roadmap/roadmap/SKILL.md` (sections `## Inputs`, `## Author roadmap.md` with the `CB<N>` template, `## Author roadmap-feedback.md`, `## Boundaries`, `## Blocked`, `## Report`). Synced references: `references/formats/adr.md`, `references/formats/roadmap-index.md`. The Roadmap thread is an ordinary thread that discusses the direction, writes its ADRs in its delta, authors the index, and closes through `close-thread` (task 13) before any child opens.

**Steps:**

1. Frontmatter: description says it authors the roadmap index at `docs/roadmaps/` from the thread's discussion; bump the version.
2. `## Inputs`: the two fixed leading items; `seed.md` (the direction's intent; authoritative); `spec.md` when the thread's owner authored one (authoritative); the thread's `adr/` and `glossary.md` (the direction's settled constraints; authoritative within the thread; constraints on children are these ADRs, landed at close). Keep the preflight refusals.
3. Replace `## Author roadmap.md` with `## Author the index`: write `docs/roadmaps/<yymmddhhmm>-<slug>.md` per `references/formats/roadmap-index.md` (stamp the creation time in UTC at minute resolution; slug from the thread's slug unless the invocation names one; create `docs/roadmaps/` on demand; refuse when the file already exists): destination, ordered entries each headed by a kebab-case slug unique within the index with a one-paragraph sketch and a `Scope:` boundary, the out-of-scope list, and the not-yet-specified note. State what the index never carries: shared-constraints sections, statuses, checkboxes, child briefs, or a feedback file, because constraints are ADRs and outcomes are written by the closing skill beneath each entry.
4. Delete `## Author roadmap-feedback.md`. Rewrite `## Boundaries` as the write boundary: this skill alone creates an index file; it writes that one file and nothing else; the owner edits the index in place afterwards; entries are opened as threads by the user with `open-thread` when the frontier reaches them.
5. Keep `## Blocked` (hand `/emit-pending-decisions` the producer `/roadmap`, the index path as target, the originating request, and the points). `## Report`: the index path and the recommendation to close the thread with `close-thread` so its ADRs land before any entry is worked; terminal outcome `Outcome: DONE — Roadmap index written: docs/roadmaps/<file>`.
6. Update `agents/openai.yaml`. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/roadmap/roadmap/SKILL.md`, `suite/skills/roadmap/roadmap/agents/openai.yaml`

**Verification:**

```sh
R=suite/skills/roadmap/roadmap/SKILL.md
grep -c "roadmap.md\|roadmap-feedback\|CB<N>\|CB[0-9]\|decisions.md\|proposal\|Shared constraints\|materialize" $R   # 0
grep -n "docs/roadmaps/<yymmddhhmm>-<slug>.md" $R                        # present
grep -n "references/formats/roadmap-index.md" $R                        # present
grep -n "^## Inputs" $R                                                 # present
grep -in "slug" $R | wc -l                                              # >= 2
grep -n "close-thread" $R                                               # present
grep -n "Outcome: DONE — Roadmap index written" $R                      # present
```

**Acceptance criteria:**

- `roadmap` specifies `docs/roadmaps/<yymmddhhmm>-<slug>.md` with destination, slug-headed entries each with a sketch and scope boundary, an out-of-scope list, and a not-yet-specified note, and no shared-constraints section, statuses, child briefs, or feedback file (AC-11.1).
- `roadmap` carries `## Inputs` and is the only skill that creates an index file (AC-6.1, spec constraint on write authority).

**Consumes:** `references/formats/roadmap-index.md` and `references/formats/adr.md` (task 2).

**Produces:** the index file `docs/roadmaps/<yymmddhhmm>-<slug>.md` whose entry headings `close-thread` (task 13) writes beneath and `open-thread` (task 3) reads.
