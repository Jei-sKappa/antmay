### Task 3: Read order and citation instruction

**Objective:** State the citation rule and the seven-step read order once, in a shared instruction, and open every entry-point skill's `## Inputs` with the project-layer reads by path in that order.

**Input / context:** `spec.md` `### Citation and read order` (the six citation bullets and the seven-step order, verbatim source for the instruction), `## Skills whose roles change` (`open-thread`, `open-ticket`, `review-code`: read order in `## Inputs`), `## Inferences` ("Citation rule and read order live in one shared instruction mirrored into skills"; "`suite/authoring/` touched only where it names retired skills or the inputs opening pair"). `suite/authoring/body-structure.md` `## Inputs` (item shape `- <path or source><, presence clause> — <what it is and what it is for>.`; the fixed opening block every skill shares, which this task replaces) and `suite/authoring/shared-references.md` (an instruction holds one self-contained procedure, written to whoever performs it, naming no skill). Starts from task 2's skill names.

**Steps:**

1. Create `suite/shared/references/instructions/read-and-cite-the-project-layer.md`, written in the imperative to whoever performs it and naming no skill. Title `# Read and cite the project layer`. One paragraph: the project layer is what the method owns at fixed paths in every project — `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, `docs/product/`, `docs/architecture/`, the roadmap indexes under `.work/roadmaps/` — created lazily and never a prerequisite; read it in a fixed order before the thread, and cite it by the form each kind fixes. `## Read in this order`: a numbered list of the seven steps exactly as the spec lists them — (1) the project's `AGENTS.md`; (2) `docs/glossary.md`; (3) the architecture description of the touched module; (4) the product behavior of the touched capability; (5) `docs/adr/` and `docs/pdr/`, listed rather than read whole, opening what touches the work; (6) the roadmap entry, when the thread was opened from one; (7) the thread. `## Cite by kind`: the six bullets of the spec's citation rule — nothing under `.work/` is cited from `docs/` or from code, and a thread path appears outside its thread only as commit provenance; a decision record is cited by stem, for the reason behind a choice, never for what the system does; a description is cited by path and heading; a roadmap entry is cited by index path and entry slug, from thread artifacts only; code, comments, test names and migrations carry no thread path and no reference to a thread artifact, and a test is named for the behavior it proves; a commit message explains the change concisely in its own words, may name the thread path once as provenance, and never carries a task number, a criterion, a progress block or a thread artifact as the explanation.
2. In `suite/authoring/body-structure.md` `## Inputs`, replace the sentence "The list opens with the same two project-layer items in every skill that has one:" and its two-line fenced block with the seven-item block below (the fenced block verbatim), followed by one sentence saying that a skill invoked before a thread exists lists the items down to the decision folders, adds the roadmap entry when the invocation supplies one, and omits the thread; and that the thread's own files follow as further items. Replace the sentence naming `/consult-decisions` "as a procedure" so it still reads correctly (it already does after task 2; only confirm). Touch nothing else in the document.

````markdown
- The project's `AGENTS.md`, when the file exists — the project's standing guidance for agents working in it.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be used in everything you write.
- `docs/architecture/<module>.md` for each module the work touches, read via `/consult-descriptions` — how the system is structured now.
- `docs/product/<capability>.md` for each capability the work touches, read via `/consult-descriptions` — what the product does now.
- `docs/adr/` and `docs/pdr/`, read via `/consult-decisions` — the project decisions bearing on <the target>.
- The roadmap entry named by the seed frontmatter's `roadmap` mapping, when the seed carries one — the entry this thread answers: its sketch, its scope boundary and its planned behavior, found as the heading whose text is `roadmap.entry` in the index at `roadmap.path`.
````

3. In each of the sixteen entry-point skills — `discussion`, `open-thread`, `open-ticket`, `resolve-pending-decisions`, `spec`, `review-spec`, `plan-brief`, `plan-strict`, `check-plan`, `roadmap`, `implement`, `implement-plan`, `implement-plan-with-subagents`, `review-implementation`, `review-code`, `close-thread` — replace the two opening `## Inputs` lines (the `docs/adr/` line and the `docs/glossary.md` line) with the six-item block above, adapting `<the target>` to the skill as the current `docs/adr/` line does, then keep the skill's thread-file items after it. In `open-thread`, keep its existing roadmap item (the supplied index and slug) in place of the seed-based sixth item and omit nothing else; in `open-ticket`, list the first five items only. Where a skill already carried a roadmap-index item further down (`discussion`, `close-thread`), fold it into the sixth item so the entry is listed once. Leave every thread-file item (those naming `spec.md`, `adr/`, `glossary.md`) as it stands; later tasks rewrite them.
4. In every skill body whose `## Inputs` said "Read everything under `## Inputs` now, in that order", confirm the sentence still holds and change nothing.
5. In `suite/shared/manifest.yaml`, add `instructions/read-and-cite-the-project-layer.md` to the declarations of `skills/spec/spec`, `skills/review/review-spec`, `skills/plan/plan-brief`, `skills/plan/plan-strict`, `skills/plan/check-plan`, `skills/implement/implement`, `skills/implement/implement-plan`, `skills/implement/implement-plan-with-subagents`, `skills/review/review-implementation`, `skills/roadmap/roadmap` and `skills/close/close-thread` (the skills that write or check citations; tasks 5–13 point their bodies at it where the citation happens).
6. From `suite/`, run the sync script and both checks.

**Files modified:** `suite/shared/references/instructions/read-and-cite-the-project-layer.md` (NEW), `suite/authoring/body-structure.md`, `suite/shared/manifest.yaml`, the sixteen `suite/skills/*/*/SKILL.md` entry-point bodies, and the synced copies `suite/skills/{spec/spec,review/review-spec,plan/plan-brief,plan/plan-strict,plan/check-plan,implement/implement,implement/implement-plan,implement/implement-plan-with-subagents,review/review-implementation,roadmap/roadmap,close/close-thread}/references/instructions/read-and-cite-the-project-layer.md` (NEW).

**Verification:**

```sh
test -f suite/shared/references/instructions/read-and-cite-the-project-layer.md
grep -c '^[0-9]\.' suite/shared/references/instructions/read-and-cite-the-project-layer.md   # 7 numbered read steps
grep -q 'commit provenance' suite/shared/references/instructions/read-and-cite-the-project-layer.md && grep -q 'path and heading' suite/shared/references/instructions/read-and-cite-the-project-layer.md
for f in suite/skills/*/*/SKILL.md; do case "$f" in *model-invoked*) continue;; esac; grep -q '^- The project.s `AGENTS.md`, when the file exists' "$f" && grep -q 'read via `/consult-descriptions`' "$f" && grep -q 'read via `/consult-decisions`' "$f" || echo "read order missing in $f"; done
for f in suite/skills/*/*/SKILL.md; do case "$f" in *model-invoked*|*open-ticket*) continue;; esac; grep -q 'roadmap' "$f" || echo "roadmap item missing in $f"; done
# order: AGENTS.md line precedes glossary line precedes architecture precedes product precedes decisions in every entry-point body
for f in suite/skills/*/*/SKILL.md; do case "$f" in *model-invoked*) continue;; esac; a=$(grep -n 'The project.s `AGENTS.md`' "$f" | head -1 | cut -d: -f1); g=$(grep -n '^- `docs/glossary.md`' "$f" | head -1 | cut -d: -f1); m=$(grep -n '^- `docs/architecture/<module>.md`' "$f" | head -1 | cut -d: -f1); p=$(grep -n '^- `docs/product/<capability>.md`' "$f" | head -1 | cut -d: -f1); d=$(grep -n '^- `docs/adr/` and `docs/pdr/`' "$f" | head -1 | cut -d: -f1); [ "$a" -lt "$g" ] && [ "$g" -lt "$m" ] && [ "$m" -lt "$p" ] && [ "$p" -lt "$d" ] || echo "order wrong in $f"; done
grep -q 'read via `/consult-descriptions`' suite/authoring/body-structure.md && ! grep -q 'same two project-layer items' suite/authoring/body-structure.md
git diff --stat fe83a4f -- suite/authoring/ | grep -E 'body-structure.md|skill-roles.md' ; ! git diff --stat fe83a4f -- suite/authoring/ | grep -E 'interaction-posture|side-effects|shared-references'
(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && node scripts/check-skill-text.mjs)
git diff --quiet fe83a4f -- cli/ && git diff --quiet fe83a4f -- docs/glossary.md
```

**Acceptance criteria:**

- One shared instruction, `suite/shared/references/instructions/read-and-cite-the-project-layer.md`, states the six-bullet citation rule and the seven-step read order and names no skill.
- Every entry-point skill's `## Inputs` opens with the project-layer reads by path in the fixed order (AGENTS.md, glossary, architecture description, product behavior, decision folders, roadmap entry, then the thread), `open-ticket` stopping at the decision folders.
- `suite/authoring/body-structure.md` carries the seven-item opening block in place of the two-item pair; `suite/authoring/` otherwise differs from the baseline only in `body-structure.md` and `skill-roles.md`.
- The eleven citing skills declare the instruction in the manifest and hold its synced copy.
- The sync script and both suite checks exit 0; nothing under `cli/` or in `docs/glossary.md` differs from the baseline.

**Consumes:** `/consult-decisions` and `/consult-descriptions` from task 2.

**Produces:** `suite/shared/references/instructions/read-and-cite-the-project-layer.md`, pointed at from bodies as `<skill_path>/references/instructions/read-and-cite-the-project-layer.md`; the six-item `## Inputs` opening block every later task keeps at the top of the bodies it rewrites.
