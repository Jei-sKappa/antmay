### Task 3: Rewrite the thread-opening skills

**Objective:** Make `allocate-thread` create `seed.md` and `log.md`, let `open-thread` and `allocate-thread` open a thread from a roadmap entry, and give `open-thread` and `open-ticket` their `## Inputs` sections.

**Input / context:** Starts from task 2's synced references. `spec.md` `### Thread layout` (seed requirements, eager `log.md`), `### Roadmap` (a thread opened from an entry records the index path and entry slug), `### Skill inventory` (`open-thread`, `allocate-thread`, `open-ticket`); decisions.md DR3 (`log.md` created eagerly with a one-line header), DR18 and DR28 (seed records index path and entry slug), DR5 (no check for unclosed threads), DR26 (`## Inputs`). Seed metadata lines are fixed in `plan.md`: `Roadmap: docs/roadmaps/<yymmddhhmm>-<slug>.md` and `Entry: <entry-slug>`, always together; the log header is `# Thread log`. Existing bodies: `suite/skills/primitives/allocate-thread/SKILL.md`, `suite/skills/capture-discussion/open-thread/SKILL.md` (with `references/supplied-ticket.md`), `suite/skills/capture-discussion/open-ticket/SKILL.md`.

**Steps:**

1. Rewrite `allocate-thread`'s `SKILL.md`: the description names the two eager files (`seed.md`, `log.md`); the caller-authorization block's conditional metadata is `External:`, `Supersedes:`, and the pair `Roadmap:` + `Entry:` (both or neither); replace the `## decisions.md` section with a `## log.md` section that creates the file holding only the header line fixed in `references/formats/log-line.md` (`# Thread log`) and no entry; the folder holds exactly `seed.md` and `log.md` and nothing else. The skill reads nothing, so it carries no `## Inputs`; the synced format reference is the one source of the header text. Bump the version.
2. Rewrite `open-thread`'s `SKILL.md`: accept a rough idea, a ticket reference, and/or a roadmap entry given as an index path under `docs/roadmaps/` plus an entry slug. Add `## Inputs` with the two fixed leading items, then the ticket (material, when supplied) and the roadmap index (a project-level file, material for composing the seed; locate the entry as a heading whose text is the slug, per `references/formats/roadmap-index.md`; the heading must exist, otherwise refuse and name the slugs the index carries). Compose `Roadmap:` and `Entry:` when an entry is given and pass them in the caller-authorization block. State that `/allocate-thread` writes `seed.md` and `log.md`. The skill performs no check for unclosed threads. Bump the version.
3. Read `suite/skills/capture-discussion/open-thread/references/supplied-ticket.md` and adjust any sentence that names the eager files or a retired skill.
4. Rewrite `open-ticket`'s `SKILL.md` only as far as adding `## Inputs` (the two fixed leading items, then the repository's convention files via `references/repository-conventions.md` and the tracker reference via `references/trackers/github.md`, both material) and letting the procedure start from the gathered state. Its mandate is unchanged. Bump the version.
5. Update each skill's `agents/openai.yaml` `short_description` if it names decisions.
6. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/primitives/allocate-thread/SKILL.md`, `suite/skills/primitives/allocate-thread/agents/openai.yaml`, `suite/skills/capture-discussion/open-thread/SKILL.md`, `suite/skills/capture-discussion/open-thread/references/supplied-ticket.md`, `suite/skills/capture-discussion/open-thread/agents/openai.yaml`, `suite/skills/capture-discussion/open-ticket/SKILL.md`, `suite/skills/capture-discussion/open-ticket/agents/openai.yaml`

**Verification:**

```sh
grep -rn "decisions.md\|DR<N>\|Parent:\|Roadmap brief\|CB<N>" suite/skills/primitives/allocate-thread suite/skills/capture-discussion/open-thread suite/skills/capture-discussion/open-ticket   # no output
grep -n "references/formats/log-line.md" suite/skills/primitives/allocate-thread/SKILL.md      # present (header source)
grep -n "references/formats/roadmap-index.md" suite/skills/capture-discussion/open-thread/SKILL.md   # present
grep -n "Roadmap:\|Entry:" suite/skills/primitives/allocate-thread/SKILL.md suite/skills/capture-discussion/open-thread/SKILL.md   # both files
grep -n "^## Inputs" suite/skills/capture-discussion/open-thread/SKILL.md suite/skills/capture-discussion/open-ticket/SKILL.md   # both
grep -n "^## Inputs" suite/skills/primitives/allocate-thread/SKILL.md   # no output
grep -in "unclosed" suite/skills/capture-discussion/open-thread/SKILL.md   # no output
(cd suite && node scripts/check-marketplace-skills.mjs && node scripts/sync-shared-references.mjs && git status --porcelain suite/skills | grep references; true)
```

**Acceptance criteria:**

- `allocate-thread` creates exactly `seed.md` and `log.md` and writes `Roadmap:` and `Entry:` when supplied (AC-1.3, AC-11.4).
- `open-thread` accepts a roadmap index path and entry slug, carries `## Inputs`, and contains no unclosed-thread check (AC-11.4, AC-8.7, AC-6.1).
- `open-ticket` carries `## Inputs` with the two fixed leading items (AC-6.1).

**Consumes:** `references/formats/adr.md` synced into `open-thread` and `open-ticket`, `references/formats/roadmap-index.md` synced into `open-thread`, and `references/formats/log-line.md` synced into `allocate-thread` (task 2).

**Produces:** seed metadata lines `Roadmap: docs/roadmaps/<yymmddhhmm>-<slug>.md` and `Entry: <entry-slug>` that `discussion` (task 4), `close-thread` (task 13), and `finish` and `whats-next` (task 14) read; an eager `log.md` holding the header from `references/formats/log-line.md` that every settling skill appends to.
