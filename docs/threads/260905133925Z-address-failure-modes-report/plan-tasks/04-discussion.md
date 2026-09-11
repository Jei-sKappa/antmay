### Task 4: Rewrite `discussion`

**Objective:** Make `discussion` the interview that reads the log once and the spec when present, appends log lines as points settle, writes draft ADRs and glossary entries with the user's confirmation, raises conflicts with the project layer, and writes no spec.

**Input / context:** Starts from task 3. `spec.md` `### The thread log` (readers, appends), `### The spec as design truth` (discussion never writes or amends the spec; no context budget), `### The thread's ADR and glossary delta` (binding test, confirmation, direct request, drafts edited in place on reversal, glossary delta, log entry for every settled point), `### Self-contained skills, inputs, and conflicts` (conflicts raised in the discussion before any draft exists), `### Skill inventory` (`discussion`); decisions.md DR3, DR6, DR12, DR17, DR22, DR23. Existing body: `suite/skills/capture-discussion/discussion/SKILL.md` (version 0.3.0). Synced references now in the skill: `references/formats/discussion-point.md`, `references/formats/adr.md`, `references/formats/log-line.md`, `references/formats/roadmap-index.md`. Keep the `## Peer framing` section's substance.

**Steps:**

1. Rewrite the frontmatter description: an open-ended interview that discovers decision points live, appends each settled point to the thread log, and drafts the thread's ADRs and glossary entries with the user; bump the version to `0.4.0`.
2. Rewrite the opening paragraph: the durable outputs are `log.md` lines, draft ADRs in `adr/`, and glossary entries in `glossary.md`; the spec is written afterwards by the user's invocation of `spec`.
3. Add `## Inputs`, in this order: the two fixed leading items; `seed.md` (why the thread exists; authoritative for intent); `log.md` (the thread's memory, read once at session start when it has entries, and never re-read during the session; material); `spec.md` when present (the thread's design truth; authoritative); the thread's `adr/` and `glossary.md` (the delta as it stands; authoritative within the thread); the roadmap index named by the seed's `Roadmap:` line when present (a project-level file, material; locate the entry by its `Entry:` slug per `references/formats/roadmap-index.md`).
4. Rewrite `## Procedure`: resolve the thread (refuse when none exists or several are ambiguous); gather every input once; interview one question at a time; when a leaning contradicts a project ADR or glossary term and the thread's `adr/` holds no draft naming that ADR in `supersedes` and the thread's `glossary.md` does not redefine the term, put the contradiction to the user before going further (per the conflict rule in `references/formats/adr.md`); when a fork emerges, frame it per `references/formats/discussion-point.md`; the moment a point settles, append its one line to `log.md` with a shell append per `references/formats/log-line.md` before doing anything else with it; then apply the binding test.
5. Add `## Binding test and drafts`: a settled point passes when a later thread could build against it incorrectly if not told and could not read it off the code. When it passes, propose an ADR and show the `name`, `description`, and body text; the user confirms or redirects the text before the file `adr/<yymmddhhmm>-<slug>.md` is written per `references/formats/adr.md` (create `adr/` on demand). The user may also ask for an ADR directly. A draft the same thread later reverses is edited in place. A project term the discussion introduces or changes is written to the thread's `glossary.md` (create on demand) as a term and definition, with the same confirmation. State the write boundary: the skill writes `log.md` lines, files under `adr/`, and `glossary.md`; it never writes `spec.md`, `docs/adr/`, or `docs/glossary.md`.
6. Keep `## Scope drift` and `## Peer framing`, rewording the sentence that names the decision store so it names the log and the ADR drafts, and reword the dissent rule so dissent is folded into the log line's reason and, for an ADR, into its body.
7. Rewrite `## Finish`: say so plainly; list the points settled this session as their log lines; name the draft ADRs and glossary entries written; name deferred branches; point at `log.md` and `adr/`. No spec-writing step, no handoff to another skill, no statement about context or session length.
8. Update `agents/openai.yaml` `short_description` if it mentions decisions or a decision log.
9. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/capture-discussion/discussion/SKILL.md`, `suite/skills/capture-discussion/discussion/agents/openai.yaml`

**Verification:**

```sh
F=suite/skills/capture-discussion/discussion/SKILL.md
grep -c "decisions.md\|DR<N>\|DR[0-9]" $F          # 0
grep -n "^## Inputs" $F                            # 1 line
grep -n ">>" $F                                    # present
grep -in "editing tool\|file-editing" $F           # present
grep -in "binding" $F                              # present
grep -n "supersedes" $F                            # present (conflict check)
grep -n "glossary.md" $F | wc -l                   # >= 2 (project and thread)
grep -n "spec.md" $F                               # present, as a read
grep -in "budget\|handoff\|hand off\|hand-off\|write the spec\|amend the spec" $F   # no output
grep -n "references/formats/log-line.md\|references/formats/adr.md\|references/formats/discussion-point.md\|references/formats/roadmap-index.md" $F   # all four
grep -n "^version:" $F; grep -n "version: 0.4.0" $F
```

**Acceptance criteria:**

- `discussion` carries `## Inputs` opening with the two fixed items, reads `log.md` once at start and `spec.md` when present, and cites the four synced references by full skill-relative path (AC-6.1, AC-3.5, AC-2.4).
- The body instructs a single-line shell append to `log.md` and forbids opening it with an editing tool (AC-2.2).
- The body proposes an ADR on the binding test as worded in the spec, requires confirmation of the text, accepts a direct request, and writes glossary entries to the thread's `glossary.md` (AC-4.1, AC-4.3).
- The body contains no spec-writing or spec-amending step, no handoff, no context budget, and no `DR<N>` writing (AC-3.5).

**Consumes:** the synced copies from task 2; the `Roadmap:` / `Entry:` seed lines from task 3.

**Produces:** the thread delta contract every later skill reads: draft ADRs at `adr/<yymmddhhmm>-<slug>.md` per `references/formats/adr.md`, term entries in the thread's `glossary.md`, and `log.md` lines per `references/formats/log-line.md`.
