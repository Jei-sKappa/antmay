# Fission-AI/OpenSpec — documentation research

## Summary

- **Delta-to-spec sync is fully mechanical. Spec-to-code sync doesn't exist.** `openspec archive` rebuilds each standing spec from the change's delta. It matches requirement blocks by header, applies them in the order RENAMED, REMOVED, MODIFIED, ADDED, refuses a MODIFIED block that would drop a scenario, and rolls back on failure (`src/core/specs-apply.ts:165`, `:439`, `:542`). Nothing ever checks a standing spec against the code again. The project's own specs have drifted:
  - `openspec/specs/docs-agent-instructions/spec.md` still requires an `openspec/AGENTS.md` that the code deletes as an "obsolete workflow file" (`src/core/legacy-cleanup.ts:894`).
  - The "Proposal Format" requirement in `openspec/specs/openspec-conventions/spec.md:199` contradicts the shipped template.
  - A deletion ledger admits that "the accepted spec library still describes deleted behavior" (`openspec/work/.../delete-legacy-command-groups/deletion-ledger.md:105`).
- **The standing specs are catalogs of behavior, not lean notes.** There are 36 of them, 53–432 lines each (median 117), 5,697 lines and 36.8k words in total. They restate observable CLI behavior scenario by scenario, which is the same ground the 207 test files cover.
- **Most of the volume is outside the governed layer.** Archived changes total 22,141 lines. The ungoverned planning folders `openspec/explorations/`, `initiatives/` and `work/` total about 22,900 lines, four times the standing specs. One roadmap alone is 2,197 lines. Antmay's complaints 1 and 2 show up most sharply here, where no validator or template applies.
- **The length limits exist but never block.** The limits are a Why section of 50–1000 characters, at most 10 deltas and requirements up to 500 characters (`src/core/validation/constants.ts:6-12`). They only run as non-blocking proposal warnings during archive (`src/core/archive.ts:1429-1435`); `openspec validate` never checks them. Six proposals exceed the Why limit, one at 2,514 characters.
- **OpenSpec deliberately stopped writing agent files.** Version 1 wrote a full `openspec/AGENTS.md` plus a managed stub at the root. Today it writes neither: "OpenSpec writes no AGENTS.md — it strips its markers out of one" (`openspec/changes/add-init-agents-target/proposal.md`). Project context now lives in `openspec/config.yaml` (`context`, capped at 50KB, plus per-artifact `rules`). The CLI injects it only into the instruction for the artifact being written. The repo's own root `AGENTS.md` is 0 bytes, which is most likely what that cleanup left behind (inference).
- **Skills are thin drivers that load what they need at runtime.** They call `openspec instructions <artifact> --json` for the template, rules and context, `openspec list --specs` for spec ids and counts, and `openspec show --no-scenarios` for an overview "without pulling whole spec files into context" (`schemas/spec-driven/schema.yaml:20-35`).
- **Tests catch doc drift, but only where it already happened.** Examples: `test/explore-docs-claims.test.ts` ("Sixteen lines … used to state that `explore` creates no artifacts … false since explore shipped"), `test/core/templates/schema-docs-instruction-parity.test.ts` ("Nothing regenerated that page, and it drifted"), `test/setup-docs-claims.test.ts` and `test/vocabulary-sweep.test.ts`. Generated copies are also held to byte parity (`skills/`, SHA-256-pinned templates).
- **Rationale lives mostly in code comments tied to issue numbers.** About 8,800 of 48,600 `src/` lines are comments, with 99 issue references in `src/` and 318 in `test/`. The rest is in archived `design.md` "Decisions" sections. There is no standing decision register; `docs-lab/reference/architecture/design-decisions.md` is an empty skeleton.
- **The user-facing guidance fits the author's leaning.** It says: "Resist the urge to back-fill everything … Those specs go stale, because nothing forces them to track reality" (`docs/existing-projects.md:123`). A spec should hold behavior only: "if the implementation can change without changing externally visible behavior, it likely does not belong in the spec" (`schema.yaml:71`).

## 1. Inventory

**Maintainer layer (how the repo documents itself):**

```
AGENTS.md (0 B)   test/AGENTS.md (30)   openspec/work/AGENTS.md (35)   CLAUDE.md → gitignored
README.md (269)  README_OLD.md (475)  CONTRIBUTING.md  install.md (70, agent prompt)
openspec-parallel-merge-plan.md (98)  CHANGELOG.md (1,263, changesets-generated)
openspec/
  config.yaml              context + per-artifact rules (≈45 lines)
  specs/<cap>/spec.md      36 capabilities, 5,697 lines
  changes/<name>/          27 active (129 files, 8,310 lines) + IMPLEMENTATION_ORDER.md (stale)
  changes/archive/         83 dated folders, 327 .md, 22,141 lines
  explorations/            5 files, 4,090 lines
  initiatives/             63 files, 7,905 lines ("transition evidence / beta history")
  work/                    38 files, 10,888 lines (experimental goal→roadmap→slice)
.agents/skills/            4 maintainer skills (write/draft/verify docs, release), 655 lines
docs/                      27 pages, 8,246 lines (old tree; README still links here)
docs-lab/                  42 pages, 5,722 lines (new tree; website builds from it; 18 skeletons)
```

**User layer (what the tool prescribes or generates):**

- `openspec init` creates `openspec/config.yaml`, `specs/`, and `changes/archive/`.
- It installs 6 core skills (12 in the expanded profile) and commands into the tool's folder (`docs-lab/start/setup.md:40-70`). "Init changes nothing else in your repo."
- The skills are generated from `src/core/templates/workflows/*.ts` (15 files) and published as `skills/*/SKILL.md` (12 skills, 2,860 lines, 26k words).
- The built-in schema `schemas/spec-driven/schema.yaml` (247 lines) has four templates of 11–31 lines each.

## 2. Creation

**What triggers a record:**

- **Contributors:** `CONTRIBUTING.md` §2 says a bug fix, typo or small improvement goes straight to a PR. A feature, significant refactor or architecture change needs a PR containing only `openspec/changes/<name>/`, approved before any code is written. That is a human gate.
- **Users:** the propose, new and ff skills create a change on request. `explore` writes artifacts only when asked, which `test/explore-docs-claims.test.ts` enforces in the docs.

**Who writes it:**

- The `openspec new change` CLI scaffolds the folder and `.openspec.yaml`.
- The agent fills each artifact from `openspec instructions` (template + instruction + context + rules).
- Standing specs are written only by `openspec archive`, or by the agent-driven `openspec-sync-specs` skill, which "directly edit[s] main specs" (`skills/openspec-sync-specs/SKILL.md:14`).
- A new capability's spec is created from the delta's `## Purpose`. Without one, archive writes a `TBD - created by archiving change …` placeholder (`constants.ts:20-21`). Validation warns about the placeholder, and a repo test bans it from the repo's own specs (`test/specs/source-specs-normalization.test.ts`).

**Friction mechanisms:**

- **An explicit way to opt out of specs.** A change with zero deltas is rejected unless `.openspec.yaml` sets `skip_specs: true`, and the schema says: "Do not invent a requirement just to satisfy validation" (`schema.yaml:36-42`, `validator.ts:512-522`). This targets filler records directly.
- **A conditional design doc.** `design.md` is created "only if any apply": cross-cutting, new dependency, security/migration, ambiguity (`schema.yaml:158`).
- **Brownfield rule.** Specs grow one change at a time; no back-filling (`docs/existing-projects.md:1-3`, `:123`).
- **Deletion needs an opt-in.** Retiring a capability whose last requirement is removed deletes its spec, and requires `retire_capabilities: true` (`docs/agent-contract.md` §4.9).

**What is missing:** there's no threshold on how many specs a project accumulates, and no "decision test". Creating a new capability is as cheap as naming a new folder under `specs/`.

## 3. Length and density

| Set | n | min | median | p90 | max (lines) |
|---|---|---|---|---|---|
| standing `specs/*/spec.md` | 36 | 53 | 117 | ~297 | 432 (`cli-completion`) |
| `proposal.md` (active + archive) | 110 | 11 | 28 | 93 | 774 |
| `design.md` | 54 | 19 | 112 | 208 | 665 |
| `tasks.md` | 108 | 5 | 26 | 67 | 142 |
| delta `specs/**/spec.md` | 181 | 9 | 57 | 158 | 471 |
| whole archived change | 83 | 28 | 197 | — | 1,863 (`2026-02-17-project-config`) |

**Density:**

- **Standing specs are dense but repetitive.** Every requirement needs SHALL/MUST and at least one `#### Scenario:` with bold WHEN/THEN bullets. `openspec/specs/context-injection/spec.md` (53 lines) is three requirements and nine scenarios pinning exact string formats. That's test-level detail written in prose.
- **Changes grow over time.** `openspec/changes/add-validation-findings-report/` is 525 lines, including a 192-line design with byte measurements and a 260-line delta. Its tasks carry verification results inline.
- **Planning docs are long narrative logs.** `openspec/work/.../roadmap.md` is 2,197 lines of dated entries such as "2026-06-11: Decided autonomously (review me) …". `explorations/workspace-user-journeys.md` is 2,259 lines.

**Audience:**

- Specs and skills are written for agents: the rigid header grammar is parsed by `src/core/parsers/requirement-blocks.ts`. Skills are imperative ("Use a todo list", "re-read from disk").
- `docs/agent-contract.md` (146 lines) is dense machine-contract reference: JSON shapes and diagnostic codes, "verified against `src/` (capstone audit, 2026-06-11)".
- `docs-lab/` is aimed at humans under an explicit brevity rule: "The shortest version that answers is the right length" (`.agents/skills/write-openspec-docs/writing.md:10`).

## 4. Sync with source of truth

**What is enforced mechanically:**

1. **Delta shape (blocking at archive).** `validateChangeDeltaSpecs` returns ERROR for:
   - a missing scenario;
   - duplicate or conflicting headers across ADDED, MODIFIED, REMOVED and RENAMED;
   - unpaired FROM/TO lines;
   - a delta at the `specs/` root.

   Archive stops on any of these unless run with `--no-validate`, which needs confirmation (`src/core/archive.ts:1514-1545`). Strict mode also counts warnings as failures (`validator.ts:986`).
2. **The merge itself.** `buildUpdatedSpec`:
   - refuses a MODIFIED block that drops a scenario still present in the main spec (`specs-apply.ts:542`);
   - refuses header near-misses;
   - treats already-applied operations as no-ops ("early-sync pattern");
   - refuses to retire a spec whose content it can't fully account for.

   This came out of the silent data loss described in `openspec-parallel-merge-plan.md`: two parallel changes, and the second archive dropped the first one's scenario.
3. **Structure of the repo's own standing specs.** CI runs `pnpm test` (`.github/workflows/ci.yml:102-105`), which includes `test/specs/source-specs-normalization.test.ts`. It checks for Purpose and Requirements sections, no placeholder, no hidden requirements, no delta headers. It checks structure only, not truth.
4. **Doc claims pinned to code**, each added after drift had already happened:
   - `test/setup-docs-claims.test.ts` requires `docs-lab/start/setup.md` to contain paths computed from `AI_TOOLS` and adapters.
   - `schema-docs-instruction-parity.test.ts` requires `docs-lab/reference/schemas/spec-driven/index.md` to quote `schema.yaml` byte for byte.
   - `explore-docs-claims.test.ts` has a forbidden-phrase list over named pages.
   - `vocabulary-sweep.test.ts` keeps retired terms out of `src`, `test`, `docs` and `scripts`, and stops `workspace_`/`initiative_` tokens from regrowing.
5. **Generated copies.**
   - `skills/` must equal the generator output (`test/core/templates/skillssh-parity.test.ts`, `.gitattributes`).
   - Each template's hash is pinned (`skill-templates-parity.test.ts`, regenerated by `scripts/regen-parity-hashes.mjs`).
   - `openspec update` detects a tampered installed `SKILL.md` and rewrites it (`test/core/update-skill-tamper.test.ts`).

**What isn't enforced:**

- **Standing spec vs code.** The only check is the agent-driven `openspec-verify-change` skill, run before archive and scoped to the change: Completeness, Correctness and Coherence rated CRITICAL, WARNING or SUGGESTION (`skills/openspec-verify-change/SKILL.md:63-70`). No check revisits specs the change didn't touch.
- **Escape hatches:**
  - "Archive without syncing" is offered as a choice (`skills/openspec-archive-change/SKILL.md:128-134`).
  - `--no-validate` skips validation.
  - An unmarked zero-delta change "still archives" (`archive.ts:1485`).
- **Gaps in the repo's own specs:**
  - Shipped features have no standing spec. `nix-flake-support` and `flake-update-script` were archived as ADDED deltas, `flake.nix` and `scripts/update-flake.sh` exist, and no such spec is in `openspec/specs/`.
  - Removed behavior is still specified (the `docs-agent-instructions` spec).
  - Stale planning files sit in live directories: `openspec/changes/IMPLEMENTATION_ORDER.md` orders changes archived on 2025-08-19, and `openspec-parallel-merge-plan.md` cites `src/core/archive.ts:455`, although the merge code now lives in `specs-apply.ts`.
- **Archives are never kept current.** In August 2026, running `openspec validate --archived` against the repo's 83-change archive produced 12 failures (`openspec/changes/add-validation-findings-report/design.md`). The archive is history, not maintained.

**How removed capabilities were cleaned up:** by hand, as a roadmap decision: "capability gone = spec gone … an accepted-spec library that REQUIRES the impossible is worse than one with a gap" (`openspec/work/.../roadmap.md:1005`, `:1635-1640`).

## 5. Agent-facing files

**History:**

- In 2025, v1 generated a long `openspec/AGENTS.md` (the `docs-agent-instructions` spec required a quick reference, embedded templates, and beginner/advanced sections) and a root `AGENTS.md`/`CLAUDE.md` with a managed `<!-- OPENSPEC:START/END -->` block (`README_OLD.md:200-201`).
- `2025-10-14-slim-root-agents-file` shrank the root copy to a pointer because "When teams edit one copy but not the other, the files drift."
- The current code deletes `openspec/AGENTS.md` and strips the markers. A file holding only OpenSpec content is kept "even if empty" (`openspec/specs/legacy-cleanup/spec.md:85-104`).

**Why the root `AGENTS.md` is 0 bytes:** the most likely cause is that the repo's own migration stripped its markers, leaving the empty file. This is an inference; there's no git history.

**Maintainer agent guidance:**

- It's either empty, git-ignored or scoped. `CLAUDE.md` is in `.gitignore`. The maintainers' `use-openspec` skill sits in git-ignored `.codex/` (roadmap L8, `roadmap.md:1512-1519`), so it's invisible in the clone.
- Two small scoped files are committed:
  - `test/AGENTS.md` (30 lines): how to run tests, plus recurring failure modes ("Path identity is a recurring CI failure mode: Windows short/long paths, symlink or junction aliases…"). This is exactly knowledge that's hard to learn from the code.
  - `openspec/work/AGENTS.md` (35 lines): a "product-facing lens" for that folder.

**What OpenSpec installs for users:**

- **Skills of 87–574 lines.** Twelve of them repeat the same "Store selection" and "Project check" paragraphs. The text is authored once (`src/core/templates/workflows/store-selection.ts`, `project-root.ts`) and copied into every output.
- **No `AGENTS.md`.** Its replacement is `openspec/config.yaml`:
  - `context`: capped at 50KB (`src/core/project-config.ts:248`), sent to every artifact instruction as `<context>`.
  - `rules.<artifact>`: sent only to that artifact (`src/core/artifact-graph/instruction-loader.ts:379-399`).
  - `operations.apply/archive.guidance`: advisory.
  - Skills say: "Do not copy the context into artifacts" (`skills/openspec-propose/SKILL.md`). The legacy `openspec/project.md` gets a migration hint: "Move useful content to config.yaml's context field."
- **Progressive disclosure, driven by the CLI:**
  - `openspec status --json` lists artifacts, their dependencies and the next step.
  - `openspec instructions --json` returns the template and instruction for one artifact.
  - `list --specs` lists spec ids and requirement counts.
  - `show --no-scenarios` gives an overview, then the agent reads the relevant specs in full.
  - Referenced stores are indexed by `id: <first Purpose line>` within a 50KB budget (`src/core/references.ts:175-198`, `:493-512`).
- **For the website:** `llms.txt` and `llms-full.txt` are generated from `docs-lab` (`website/app/llms.txt/route.ts`). `install.md` is a prompt addressed to an agent ("OBJECTIVE … DONE WHEN … TODO").

## 6. Hard-to-learn-from-code knowledge

**Decisions and rationale:**

- A per-change `design.md` has a "Decisions" section with "alternatives considered for each decision" (`schema.yaml:167`). It's archived and never merged into standing specs, so decisions end up only in `changes/archive/<date>-<name>/design.md`. Nothing indexes them.
- The initiative experiment kept a dated decision log (`openspec/initiatives/context-store-and-initiatives/decisions.md`, 225 lines). The feature was later deleted.
- In practice, most rationale sits in code and test comments next to the guard, tagged with issue numbers. Example: `validator.ts:176-195`, "without this error the change validates clean and archives while its requirements never reach openspec/specs/ (#1385)".

**Invariants:**

- Behavioral invariants are spec requirements.
- Engineering invariants (cross-platform paths, explicit lookups over pattern matching) are `config.yaml` `rules` and `test/AGENTS.md`. `config.yaml` is also where the repo's own conventions for agents live: "If we generate it, we track it by name in a constant."

**Navigation ("where is X"):**

- There's no architecture document; `docs-lab/reference/architecture/*` pages are headings-only and withheld from the site.
- `docs-lab/message-map.md` routes each reader question to the page that owns its answer, with a status (Answered, Skeleton, Gap). It currently has 25 Answered rows and 26 Skeleton or Gap rows. It routes readers, not code.
- Historical folders carry a status banner with a precedence rule: "If it conflicts with the current `goal.md`, the current `goal.md` wins" (`openspec/initiatives/.../README.md`).

## 7. Work records

**A change:** `changes/<name>/` holds `.openspec.yaml` (schema, created, skip_specs, retire_capabilities), `proposal.md` (Why, What Changes, Capabilities, Impact), delta `specs/<cap>/spec.md`, an optional `design.md`, and `tasks.md`. The tasks are checkboxes that apply parses; each task must state how it's verified, and each group lands its own tests and docs (`schema.yaml:208-222`).

**How records feed back:**

- **Standing specs:** only through the merge. Nothing else from the change reaches them.
- **Archive:** the folder moves to `archive/YYYY-MM-DD-<name>`. Archive isn't blocked by unchecked tasks, but the prompt defaults to "No".
- **Release notes:** a separate channel. `.changeset/*.md` is validated by CI only when present (`ci.yml:250-305`) and turned into `CHANGELOG.md`.

**The `work/` experiment:**

- It was a response to changes being too heavy for multi-slice efforts: goal, then roadmap, then per-slice `spec.md`, `plan.md` and `result.md`, plus an optional `log.md` "only when a meaningful pivot would be hard to understand from the final files alone" (`openspec/work/README.md`).
- The CLI doesn't support it. Slices are turned into normal changes before implementation.

**Compared with Antmay:**

- **Grain.** OpenSpec's delta unit is a named requirement block that gets replaced whole. Antmay's is a literal add/replace/remove against a recorded blob hash. OpenSpec's is coarser and needs the scenario-loss guard. Antmay's is more exact but tied to the file's bytes.
- **What reaches the standing layer.** OpenSpec merges only behavior. Its decisions (`design.md`) and terms never leave the change. Antmay lands ADRs and glossary entries as well.

## 8. Ideas to borrow and anti-patterns

**Borrow:**

1. **A header-keyed merge with safety guards** (`src/core/specs-apply.ts`). It gives idempotent "already synced" handling, rejects near-miss names, keeps a spec from losing scenarios, and deletes a spec only on explicit opt-in (`retire_capabilities`).
   - *Complaint 3:* keeps the delta and the standing doc in step. It doesn't help with code drift.
   - *Leaning:* neutral. It's a mechanism, useful whatever gets documented.
2. **Explicit "no project-layer delta" marker plus "do not invent a requirement to satisfy validation"** (`schema.yaml:36-42`, `validator.ts:512-522`).
   - *Complaint 1:* makes skipping a doc an explicit, legitimate choice instead of an absence.
   - *Leaning:* supports it. The same shape could be "this thread lands nothing in `docs/`".
3. **"Resist the urge to back-fill" plus the behavior-only quick test** (`docs/existing-projects.md:123`, `schema.yaml:71`).
   - *Complaints 1 and 3:* the project admits outright that untouched specs go stale.
   - *Leaning:* supports it, and sharpens the admission rule to: write only what a change needs.
4. **Per-step context channel with a size cap** (`config.yaml` `context`/`rules`, `instruction-loader.ts:379-399`). Rules reach the agent only while it writes the artifact they govern.
   - *Complaint 2:* keeps unrelated rules out of the agent's context.
   - *Leaning:* refines it. It would give Antmay a method-owned home for "rules for agents" (today that has none), and `AGENTS.md` could stay lean. OpenSpec went further and left `AGENTS.md` out of its footprint entirely, moved by drift between two copies.
5. **CLI-level progressive disclosure** (`list --specs`, then `show --no-scenarios`, then a full read; Purpose first line as the index summary; placeholder and minimum-length warnings keep that line usable).
   - *Complaint 2:* the agent loads summaries first and full specs only where needed.
   - *Leaning:* supports it. It parallels consult-descriptions listing by frontmatter; the useful addition is the checks that keep the summary line usable.
6. **Narrow claim tests born from incidents, plus retired-vocabulary sweeps** (`test/explore-docs-claims.test.ts`, `test/vocabulary-sweep.test.ts`, `test/core/templates/schema-docs-instruction-parity.test.ts`). A doc that quotes source is held to it byte for byte, and a glossary rename becomes a forbidden-token test.
   - *Complaint 3:* cheap, precise drift detection where it has already bitten.
   - *Leaning:* supports it. It fits Antmay's "skills are the source of truth" repo well.
7. **Generated distribution with parity tests** (`skills/README.md`, `skillssh-parity.test.ts`).
   - *Complaint 3:* one source, with every copy checked against it.
8. **Small, scoped `AGENTS.md` files holding recurring failure modes** (`test/AGENTS.md`).
   - *Leaning:* strong support. The file is 30 lines and nearly all of it is knowledge the code can't reveal.
9. **Put rationale beside the guard it explains, tagged with an issue number** (`validator.ts`, `constants.ts:13-19`, `archive.ts:1409-1412`).
   - *Complaints 1 and 3:* records fewer documents, and rationale that sits next to the code tends to change when the code changes.
   - *Leaning:* supports it. Rationale about a single code location belongs in the code; a document is warranted only for rationale that no single location can hold.
10. **Status banner plus a precedence pointer on historical folders** (`openspec/initiatives/.../README.md`). This beats silent staleness, but deleting the folder would beat both.
11. **Docs style rules** (`.agents/skills/write-openspec-docs/writing.md:9-29`): "shortest version that answers", "a fact lives on one page; everywhere else links to it", "when docs and source disagree, source wins". Plus a question-to-owner map (`docs-lab/message-map.md`: "Keep rows coarse … so this stays cheap to maintain").
    - *Complaints 1 and 2.*

**Anti-patterns:**

1. **Standing specs as exhaustive scenario catalogs** (median 117 lines, up to 432) of behavior the tests already pin.
   - *Worsens complaints 2 and 3.* The `docs-agent-instructions` and `openspec-conventions` specs show how this rots once code moves on.
   - *Leaning:* argues against writing down what the code or tests already make clear.
2. **Structural validation mistaken for truth.** `source-specs-normalization.test.ts` stays green while specs describe deleted features.
   - *Worsens complaint 3,* because it gives false confidence.
3. **Soft length limits** (`constants.ts:6-12`) that never block and aren't in `validate`.
   - *Complaints 1 and 2 untouched.* A limit that doesn't block is only advice.
4. **Ungoverned planning sprawl** (`explorations/`, `initiatives/`, `work/`, about 22,900 lines; a 2,197-line roadmap; a 225-line decision log for a deleted feature).
   - *Worsens complaints 1 and 2.* Volume moves to wherever the method doesn't reach.
5. **Two live doc trees** (`docs/` linked from `README.md`, `docs-lab/` published). Troubleshooting existed in "all 5 copies" (`docs-lab/sources.md`).
   - *Worsens complaint 3.*
6. **Stale plans left in live directories, citing line numbers** (`openspec-parallel-merge-plan.md`, `openspec/changes/IMPLEMENTATION_ORDER.md`).
   - *Worsens complaint 3.*
7. **Agent guidance kept out of version control** (`.gitignore`: `CLAUDE.md`, `.codex/`).
   - *Leaning:* argues for a lean but *committed* `AGENTS.md`. Guidance nobody can see can't be reviewed or kept in step.
8. **Decisions stranded in archived `design.md`,** where no later change can find them.
   - This argues against the extreme form of the leaning: a small standing home for decisions that are hard to find is still worth having.
9. **The same boilerplate inlined into all 12 skills** (store selection, project check).
   - *Complaint 2:* costs agent context on every invocation, even though the text is written once.
10. **Escape hatches on sync** ("Archive without syncing", `--no-validate`, unmarked zero-delta archive). The standing layer can quietly fall behind shipped code (the nix-flake specs are missing).
    - *Worsens complaint 3.*

## Evidence gaps

- **No git history (shallow clone).** I couldn't tell how the nix-flake and `openspec-docs` deltas went missing from `openspec/specs/` (`--skip-specs` or a later hand-deletion), or when the root `AGENTS.md` was emptied. The emptying explanation is an inference from `legacy-cleanup` behavior.
- **I didn't run the CLI** (read-only constraint). The count of 12 failing archived items comes from `add-validation-findings-report/design.md`, measured 2026-08-27, not re-measured.
- **I couldn't see the maintainers' real agent context:** `CLAUDE.md` and `.codex/skills/use-openspec/` are git-ignored and absent.
- **No evidence that CI runs `openspec validate` on the repo's own active changes.** `ci.yml` runs build, test, lint and tsc only. Validation of changes appears as a task-list step (`tasks.md` 5.3), which suggests it depends on discipline, not CI.
- **The generated site content isn't committed** (`website/content/docs`), so I couldn't inspect the `llms-full.txt` output.
- **I couldn't measure how often agents actually use `--no-scenarios` or read full specs.** The claims about progressive disclosure are about design, not observed use.
