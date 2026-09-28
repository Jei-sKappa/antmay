# open-gsd/gsd-core — documentation research

Sampling. The clone holds 1,785 Markdown files. I measured every family with `wc` (`docs/` 621, `.changeset/` 469, `gsd-core/` 338, `tests/` 94, `skills/` 72, `commands/` 72, `agents/` 64, `.out-of-scope/` 19). I read these in depth: the root agent files, `docs/adr/README.md` plus 8 ADRs (1610, 1671, 3180, 3473, 3626, 3942, 4139 and the contributor rules), all the doc-generation and doc-check scripts wired into `package.json`, the user-project templates, and the workflows and agents that create, load or bound user docs (map-codebase, docs-update, discuss-phase, planner, graduation, complete-milestone, the drift gate, `src/profile-output.cts`, `src/drift.cts`, `src/artifacts.cts`). I skipped: most how-to and reference pages, the translations, most ADR bodies, most of `src/`, and the history in `CHANGELOG.md`.

## Summary

- **The agent-facing memory file grew without bound.** `CONTEXT.md` is 1,051 lines, 61,879 words and 503 KB (about 125K tokens at 4 chars/token, an inference). Its longest line is 10,955 chars. Contributors must "Read `CONTEXT.md` in full before naming anything" (`docs/contributor-standards.md:47`, `:180`). The project's own ADR says the file has "no programmatic reader" and that agents paraphrasing it caused violations in "5/8 agents in one documented batch" (`docs/adr/1671-dynamic-context-management-platform.md:18`). This is the clearest case in the set of complaint 2.
- **Sync exists only where a machine owns it.** `lint:generated-sync` runs 22 `--check` generators (ADR index, FEATURES, CONTEXT-INDEX, inventory manifest, STATE.md schema regions, exit-code docs and more), and `lint:ci` chains about 48 lint scripts (`package.json`). The hand-written prose drifted even so. Examples: `docs/AGENTS.md:3` says 34 agents while `:15` says 35; `docs/contributor-standards.md:65-76` lists two Superseded ADRs as accepted; `.clinerules` says "CommonJS only… never `import`" while the source is now `src/*.cts` using `import`.
- **For users' projects, GSD keeps a fixed, registered set of `.planning/` files.** It flags unregistered root files (`src/artifacts.cts:14-32`, health W019). It bounds reading more than writing:
  - "paths only" init bundles (`gsd-core/workflows/plan-phase.md:70`)
  - "at most 3 prior CONTEXT.md" (`gsd-core/workflows/discuss-phase.md:243`, pinned by `tests/discuss-mode.test.cjs:272`)
  - a frontmatter digest, then selection, then a full read of past SUMMARYs (`agents/gsd-planner.md:647-680`)
  - loading codebase docs by phase type (`agents/gsd-planner.md:600-618`)
- **Descriptive codebase maps are GSD's biggest user-facing doc cost, and its best drift mechanism.** `/gsd-map-codebase` writes 7 descriptive docs under the rule "Document quality over brevity" (`agents/gsd-codebase-mapper.md:76-77`). GSD then stamps `last_mapped_commit` and, after every phase, checks for structural drift: new dirs, barrels, migrations, routes (`src/drift.cts`, `gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md`).
- **User `CLAUDE.md` files are generated from marker-delimited managed sections** (`src/profile-output.cts:1115-1300`). The generator detects manual edits and refuses to clobber a hand-written file with no markers (`:1221`). It defaults to `.claude/CLAUDE.md` rather than the repo root (`:1150`). An optional `link` mode writes `@path` instead of embedding (`docs/CONFIGURATION.md:254`). This is the nearest existing implementation of the direction you're leaning toward, but by default it embeds summaries of the codebase maps.
- **Several borrowable rules turn prose into checks.** "Prose defect entries retired in favour of gates; the gate IS the record … Entries whose condition no automated check can evaluate were deleted" (`CONTEXT.md:1050-1051`). Seam claims must carry an `enforced-by` pointer that lint resolves (`docs/adr/3626-context-md-seam-claim-gate.md`). Doc file paths must exist on disk (`scripts/check-glossary-refs.cjs`).
- **Size budgets are enforced on prompts, not on docs.** Workflow and agent files have byte caps and a per-file ratchet, and any growth needs an `Emitted-Drift-Ack-Growth:` commit trailer (`docs/adr/1610-workflow-agent-size-budget-ratchet.md`, `tests/workflow-size-budget.test.cjs:120-122`). Nothing bounds `CONTEXT.md`, ADRs or `docs/`. The only size rule on a user file, "Keep STATE.md under 100 lines" (`gsd-core/templates/state.md:197`), is prose, and auto-pruning defaults off (`src/config.cts:398`).
- **ADRs are append-only and turn into work logs.** There are 97 files (median 1,870 words, max 18,339). In ADR-3180, 11,462 of 18,339 words are per-phase "Amendment" validation reports, and two of them are both numbered "Amendment 4" (`docs/adr/3180-…md:635`, `:692`).
- **Code and docs cite work records that don't exist in the repo.** 105 distinct `.gsd/phase/<slug>` folders are cited from 191 files (40 in `src/`, 135 in `tests/`, 6 in `docs/`). `.gsd` is gitignored (`.gitignore:55`) and only one such folder is committed. This is strong outside evidence for Antmay's "threads are never cited" rule.

## 1. Inventory

**How the project documents itself (maintainer layer):**

```
CONTEXT.md (503 KB)         glossary of 183 modules + 281 predicates + session log
docs/CONTEXT-INDEX.json     generated from CONTEXT.md (99.5 KB, 286 predicates)
CONTRIBUTING.md (1,429 l)   TESTING-STANDARDS.md  VERSIONING.md  CHANGELOG.md (2,102 l, 922 KB)
GEMINI.md  .clinerules      (CLAUDE.md gitignored, .gitignore:7)
docs/
  adr/ 97 (+README index)   prd/ 4   research/ 5   design/ 1   proposals/ 1
  discussions/ 1   issueevidence/ 1   registries/ 4
  tutorials/ 5  how-to/ 74  reference/ 15  explanation/ 10     (Diátaxis, docs/README.md:3)
  features/ 183 fragments -> FEATURES.md (generated, 4,602 l)
  INVENTORY.md + INVENTORY-MANIFEST.json   PARTITION-RULES.md
  ARCHITECTURE.md COMMANDS.md CONFIGURATION.md CLI-TOOLS.md USER-GUIDE.md AGENTS.md …
  pt-BR/ ko-KR/ ja-JP/ zh-CN/  (42–52 files each; e.g. 18 of 74 how-tos translated)
.changeset/  4 live fragments + archived/ 464
.out-of-scope/ 19 wontfix records   .plans/ 1   .gsd/phase/ 1 folder (dir gitignored)
```

**What GSD installs for users' projects.** The package ships commands, skills, agents and `gsd-core/`:
- 72 thin commands in `commands/gsd/`
- 72 skills in `skills/`, generated from the commands by `scripts/gen-plugin-skills.cjs --check`
- 35 agents plus 29 `.compact.md` variants in `agents/`
- `gsd-core/workflows/`: 89 top-level workflows, plus step and detail parts
- `gsd-core/references/`: 114 references
- `gsd-core/templates/`: 39 templates

The templates prescribe a `.planning/` tree (`docs/reference/planning-artifacts.md:7-44`, `gsd-core/templates/README.md`):
- **Root:** PROJECT, ROADMAP, REQUIREMENTS, STATE, config.json, and optionally MILESTONES, BACKLOG, LEARNINGS, PATTERNS, RETROSPECTIVE and THREADS.
- **`codebase/`:** STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, CONCERNS.
- **`phases/NN-slug/`:** CONTEXT, DISCUSSION-LOG, RESEARCH, VALIDATION, PATTERNS, NN-MM-PLAN, NN-MM-SUMMARY, VERIFICATION, UAT, plus optional UI-SPEC, SECURITY, AI-SPEC, DEBUG and REVIEWS.
- **`milestones/`:** archives.
- **Outside `.planning/`:** a generated instruction file, `.claude/CLAUDE.md` by default.
- **Optional docs-update output:** README, ARCHITECTURE, GETTING-STARTED, DEVELOPMENT, TESTING, CONFIGURATION, API, CONTRIBUTING, DEPLOYMENT.

## 2. Creation

**Maintainer layer:** creation has heavy process gates, and growth is pushed by rule.
- **An ADR or PRD needs an approved issue first.** The issue number becomes the filename. "One issue = one ADR-or-PRD = one PR". "Rejection reasons: issue not approved before file was created…" (`CONTRIBUTING.md:83-107`).
- **The ADR-required test is loose** (`docs/contributor-standards.md` "When an ADR is required"). Any change that "introduces or removes a Module seam", "changes the policy contract", or "establishes a new architectural invariant (naming convention, test contract, CI enforcement)" qualifies. The last clause makes most CI rules ADR-worthy.
- **Amending is preferred to creating**, which moves growth into existing files instead of preventing it: "An accepted ADR is never rewritten — it is amended … append a `## Amendment (YYYY-MM-DD)`" (`docs/contributor-standards.md` "Amending an accepted ADR"; `docs/adr/README.md:5`).
- **A CI gate forces doc edits.** The `Docs Required` workflow (`scripts/lint-docs-required.cjs`, `.github/workflows/docs-required.yml`) fails any PR whose changeset fragment is typed Added, Changed, Deprecated or Removed unless it also touches a file under `docs/` (`CONTRIBUTING.md:276`). The guidance adds "When unsure whether a change is user-facing, **update the docs**" (`:306`). Opting out needs a label or a `docs-exempt: <reason>` marker. This is friction *against not writing docs*, which worsens complaint 1.
- **`CONTEXT.md` is maintainer-owned.** Contributors propose additions (`docs/contributor-standards.md` "Contributor requirements"). The only admission rule is "New learnings go in as predicates" (`CONTEXT.md:6`), and the session-log discipline says "If you can't compress a session's lesson into a predicate, the lesson isn't sharp enough yet" (`CONTEXT.md:947-951`). No size or relevance test applies.
- **Fragments plus a generator** remove shared-file conflicts for `CHANGELOG.md` (`.changeset/README.md`) and `FEATURES.md` (`CONTRIBUTING.md:308-382`). Creation gets easier here: one new file per PR.

**User layer:** commands create docs, templates shape them, and a few gates exist.
- **Fixed registry.** Every root artifact has a producing command (`gsd-core/templates/README.md` table). An unregistered root file triggers health warning W019, "Unrecognized .planning/ file … not a canonical GSD artifact" (`src/health-diagnostic-rules/milestone-archive-hygiene.cts:87`, `src/artifacts.cts`).
- **docs-update creates documents unconditionally.** "Always-on docs (queued for every project, no exceptions)": 6 docs, plus up to 3 conditional ones, "Maximum 9". It also scans for "Documentation gap detection (missing non-canonical docs)" (`gsd-core/workflows/docs-update.md:75-90`). Only CONTRIBUTING.md asks for confirmation first.
- **map-codebase always writes all 7 docs.** It checks "No empty documents (each should have >20 lines)" (`gsd-core/workflows/map-codebase.md:359`) and skips "trivial codebases (<5 files)" (`commands/gsd/map-codebase.md`).
- **Standing notes need recurrence to be promoted.** `graduation.md` clusters LEARNINGS items by Jaccard ≥0.25. A cluster is surfaced only when it spans ≥3 *distinct* phases in the last 5, and each promotion needs human approval (P, D or X). Dismissals and deferrals are remembered in STATE.md so they don't resurface (`gsd-core/workflows/graduation.md` Steps 3–6). Targets: decisions go to `PROJECT.md ## Validated Decisions`, lessons to `## Invariants`, patterns to `PATTERNS.md`.

## 3. Length and density

| Family | n | words: min / median / max |
|---|---|---|
| `docs/adr/*.md` | 97 | 149 / 1,870 / 18,339 (lines: median 152, max 1,362) |
| `docs/features/*.md` fragments | 183 | 31 / 123 / 2,476 |
| `commands/gsd/*.md` | 72 | 55 / 197 / 2,612 |
| `agents/*.md` (full) | 35 | 617 / 1,789 / 6,513 |
| `gsd-core/workflows/*.md` | 89 | 262 / 1,637 / 12,267 (plan-phase 96 KB, execute-phase 91 KB) |
| `gsd-core/references/*.md` | 114 | 33 / 628 / 5,390 |
| `gsd-core/templates/**/*.md` | 39 | 7,328 lines total; 7 lines (`copilot-instructions.md`) to 615 lines (`phase-prompt.md`) |

**Key user templates:**
- `state.md`: 205 lines / 818 words
- `context.md`: 352 / 1,380
- `summary.md`: 299 / 1,642
- `research.md`: 592 / 2,495
- `project.md`: 203 / 895
- `codebase/architecture.md`: 255 / 949

Much of each template is guidance around the fenced template itself.

**`CONTEXT.md` density.** The header claims "Each operational fact is a single-line predicate" (`CONTEXT.md:3-4`). In fact, about 408 KB of the 503 KB is the prose glossary (lines 9–610): 183 module paragraphs, median 1,409 chars. Only 281 predicate lines exist (median 142 chars, max 6,568). The file mixes a glossary, CI rules, PR postmortems (`PR.3267.POSTMORTEM.*`, `:698-699`), a session log (`:945-969`) and pointers to files outside the repo ("Full detail in `~/.claude/skills/gsd-pr-fix-discipline/SKILL.md`", `:994`). It is written for agents, as its "machine-greppable" header and the `META.RULE.*` rules show, but it reads like an accumulated notebook.

**Enforced size budgets.** These exist only for shipped prompt files:
- Workflow tiers: 96, 60 and 40 KiB, and 32 KiB for a new file (`tests/workflow-size-budget.test.cjs:120-122`).
- Agent tiers: 56, 48 and 24 KiB (`tests/agent-size-budget.test.cjs:73-75`).
- Counts are in bytes, "not lines" (`docs/adr/1610-…md` Decision 1).
- The stated reason is quality, not cost: "larger context erodes recall and reasoning … the caching-independent quality argument is the load-bearing one" (`docs/adr/1610-…md` Context).

**Other bounds.**
- The planner caps each plan at "2-3 tasks … ~50% context" (`agents/gsd-planner.md:297`, `:773`).
- Pending-todo bullets are capped at 240 chars (`gsd-core/templates/state.md` sections).
- STATE.md, ADRs, `CONTEXT.md` and `docs/` have no enforced bound.

**Rationale lives in code comments too.** About 58K of 152K lines in `src/*.cts` are comment lines, a rough heuristic. ADR-1610 notes "the decision was documented in-code but never as an ADR" (`docs/adr/1610-…md:12`).

## 4. Sync with source of truth

**Generated and checked.** `npm run lint:generated-sync` (`package.json`) runs `--check` twins that "derive fresh, diff committed, exit 1 on drift" (`docs/adr/1671-…md:24`). They cover:
- the ADR index and lifecycle invariants: status vocabulary, successor links, symmetric supersession, id matching filename (`scripts/gen-adr-index.cjs:13-19`)
- `FEATURES.md` from fragments, including inbound-anchor resolution
- `CONTEXT-INDEX.json` from `CONTEXT.md` (also in the test suite, after a merge-race incident: `tests/context-index-sync.test.cjs:4-15`)
- the inventory manifest from the file tree
- marked regions of `templates/state.md` and five `reference/state-md.md` pages from `STATE_FIELD_SCHEMA` (`scripts/gen-state-md-docs.cjs`)
- exit-code docs and health docs

**Checks on hand-written docs.** These don't generate text; they verify it:
- `scripts/check-glossary-refs.cjs`: every backticked tracked path in `CONTEXT.md` must exist, and the runtime enum in prose must match `bin/install.js`. There is "NO `--write` — CONTEXT.md's prose is hand-authored".
- `scripts/lint-seam-enforcement.cjs` (ADR-3626): every `SEAM.<id>.owns` needs an `enforced-by=lint-rule:|test:` pointer that resolves. The check is deliberately "resolves-only", not "covers".
- `tests/inventory-manifest-sync.test.cjs`: each manifest entry needs a hand-written row in `INVENTORY.md`, because "a role sentence is hand-written by design".
- `tests/inventory-headings-countfree.test.cjs`: bans "(N shipped)" counts in headings.
- `tests/config-field-docs.test.cjs`: every config key must be in `CONFIGURATION.md`.
- `tests/docs-parity-live-registry.test.cjs`: slash commands named in docs must exist.
- `scripts/lint-docs-command-form.cjs`, and `scripts/lint-removed-but-needed.cjs` (a deleted file still named in `docs/` fails).
- `scripts/docs-guard-registry.cjs`: a registry of 73 doc-reading tests run in a dedicated docs lane.

**What drifts anyway (all hand-written prose):**
- `docs/AGENTS.md:3` says "34 shipped agents total"; `:15` says "35-agent roster" (35 is correct).
- `docs/contributor-standards.md:73,75` list Superseded ADR-0005 and 0007 under "Currently accepted"; `:116` gives the status set as "Accepted | Proposed | Deprecated", which the generator doesn't accept.
- `.clinerules` describes the pre-TypeScript layout.
- `.coderabbit.yaml:30-36` says "The repo intentionally does not use ESLint", while `eslint.config.mjs` and ADR-452 exist.
- `tests/context-predicates-query.test.cjs:8-13` says "NET-NEW COMMAND, EXPECTED RED", but the command is registered (`gsd-core/bin/gsd-tools.cjs:4028`).
- `CONTEXT.md:1006` points to a `## Slash-command form` section that doesn't exist. The path check doesn't cover anchors.
- `docs/reference/planning-artifacts.md` documents `DECISIONS-INDEX.md` as "Generated when the number of prior phases exceeds the rolling-read threshold", but no code or workflow produces it. Only `discuss-phase.md:243` reads it. The claim is repeated in four translations.
- `docs/INVENTORY.md:3` itself concedes: "Where the broad docs … diverge from the filesystem, treat this file and the repository tree itself as the source of truth."

**User layer.**
- **Codebase maps.** `last_mapped_commit` frontmatter plus the post-execute drift gate. It is non-blocking, `warn` by default, `auto-remap` optional, threshold 3. The shell step stamps only the files actually refreshed, because "an agent that concludes its work is already done skips a prose instruction silently" (`codebase-drift-gate.md`).
- **Project docs.** `gsd-doc-verifier` pulls checkable claims (file paths, commands, endpoints, exports, dependencies) and verifies each against the filesystem. Its stance: "Assume every factual claim in the doc is wrong until filesystem evidence proves it correct" (`agents/gsd-doc-verifier.md:28`, `:57-97`). Failing docs go to a writer fix loop.
- **Planning docs.** Health rules check them for consistency: a ROADMAP phase with no directory, or the reverse (`src/health-diagnostic-rules/roadmap-disk-consistency.cts`). GSD never throws on a drifted user document: "Degrade per policy and *warn*" (`docs/adr/3473-…md:85-95`).

**Expiry and archival.**
- Consumed changeset fragments are deleted at release (`.changeset/README.md`).
- Milestone close archives ROADMAP and REQUIREMENTS snapshots and phase folders: "Archives keep ROADMAP.md constant-size" (`gsd-core/workflows/complete-milestone.md:30`, `:428`).
- `state prune` moves older-phase STATE entries to `STATE-ARCHIVE.md`, but automatically only when `auto_prune_state` is set, and it defaults to false (`src/phase.cts:4983-4997`).
- ADRs are never deleted. They are marked Superseded, Retired or Legacy, and Proposed ADRs whose work shipped were audited and ratified (`docs/adr/README.md` "Reading this corpus").

## 5. Agent-facing files

- **`CONTEXT.md`** is maintainer-facing, hand-authored, and not generated (its index is). Nothing loads it automatically. Humans are told to "prompt it [the AI] to read `CONTEXT.md`" (`CONTRIBUTING.md:187`). The maintainers' `CLAUDE.md` is gitignored, so I can't tell whether it @-includes the file (evidence gap). `META.RULE.canonical-source-precedence=CONTRIBUTING.md > docs/adr/* > CONTEXT.md > agent memory` (`:812`). A selector exists (`query context-predicates --class|--prefix|--contains`, `docs/contributor-standards.md:187-195`), but the same file still requires reading `CONTEXT.md` in full (`:180`). What it leaves out: nothing structurally; it holds narrative, rules and logs alike.
- **`docs/AGENTS.md`** (906 lines) is *not* an instruction file. It is a human reference with role cards for GSD's own agents.
- **`GEMINI.md`** (55 lines, 375 words) ships in the npm package (`package.json` `files`) as Antigravity context. It is lean: what GSD is, the 7 key commands, and "Treat `.planning/` as the source of truth — read it before acting". It is a good model of a short pointer file.
- **`.clinerules`** (27 lines) is stale (see §4).
- **Commands** are thin wrappers (median 197 words) that `@`-include one workflow in `<execution_context>` (eager). Rare branches load lazily: "Load it on demand here — it is deliberately not in `<execution_context>`, so the common full-map path does not pay for it" (`commands/gsd/map-codebase.md`).
- **Workflows and agents** use:
  - `<required_reading>` blocks listing paths
  - init bundles that return "paths + flags, not contents" (`docs/adr/1671-…md:22`)
  - the `workflow.compact_content` spine/detail split, governed by `docs/PARTITION-RULES.md`
- **Loading rules for user docs:**
  - STATE.md is "Read first in every workflow" (`templates/state.md` purpose)
  - codebase docs are loaded by phase-keyword table (`agents/gsd-planner.md:608-617`)
  - past SUMMARYs go digest, then selection of 2–4, then full read (`:647-680`)
  - RETROSPECTIVE is read as `tail -100`
  - "Do NOT load full `AGENTS.md` files (100KB+ context cost)" (`agents/gsd-codebase-mapper.md:37`)
- **The generated user `CLAUDE.md`** has 6 managed sections: project, stack, conventions, architecture, skills, workflow. Stack, conventions and architecture are built by copying heading, bullet and table lines out of `codebase/*.md` (`src/profile-output.cts:419-482`). `link` mode would write `@.planning/codebase/ARCHITECTURE.md` instead. The docs claim "~65%" size reduction (`docs/CONFIGURATION.md:254`). Inference: Claude Code expands `@` imports at load, so this shrinks the file, not necessarily the context.

## 6. Hard-to-learn-from-code knowledge

**Maintainer layer.**
- **ADRs.** 47 of 97 have an alternatives section; 92 have Consequences. ADR-3942 is a good example of rationale code can't show: why an acknowledgment belongs in a commit trailer, laid out as a defect-lineage table.
- **The `CONTEXT.md` glossary is mainly a navigation map.** Each module entry ends "Source of truth: `src/x.cts`" and names its callers, which is "hard to find in the codebase" knowledge. Path rot is checked mechanically.
- **Invariants become code.** `SEAM.*.owns/enforced-by` predicates point to the rule or test that enforces each one. ADR-3473 aims for "one owner per invariant" and "Guards are retired, not accumulated" (`:113-117`).
- **Rejected product ideas** live in `.out-of-scope/` (19 files, about 12K words), each with "Why GSD does not own this". Nothing reads it except 3 ADRs and 1 test.

**User layer.**
- Phase `CONTEXT.md` `<decisions>` hold `D-NN` locked choices, with an optional reversibility rating (`CONTEXT.md:551`).
- `<canonical_refs>` "Downstream agents MUST read these" lists the ADR and spec paths that matter for the phase (`templates/context.md`).
- PROJECT.md "Key Decisions" is a table of Decision | Rationale | Outcome (✓ Good / ⚠️ Revisit / — Pending), reviewed at each phase transition (`templates/project.md:67-73`, `:143-163`).
- `codebase/STRUCTURE.md` "answers 'where do I put this?'" and `CONCERNS.md` records fragile areas (`agents/gsd-codebase-mapper.md:62-73`).

## 7. Work records

**User layer.**
- Each phase folder accumulates CONTEXT, RESEARCH, PLAN and SUMMARY files.
- SUMMARY frontmatter is "MANDATORY … Enables automatic context assembly": requires, provides, affects, key-decisions, patterns, coverage (`templates/summary.md`).
- Records feed back into standing docs through STATE.md (a digest), PROJECT.md (Key Decisions and Evolution), graduation (LEARNINGS to PROJECT.md or PATTERNS.md, recurrence-gated), RETROSPECTIVE.md and MILESTONES.md.
- Milestone close archives everything to `.planning/milestones/`.
- `planning.pr_strict` can strip all of `.planning/` from PR branches. By default it keeps the "structural" files and drops the "transient subdirectories" (`docs/CONFIGURATION.md:669`).

**Maintainer layer.**
- The unit of work is an issue (issue-first, `CONTRIBUTING.md:109-119`).
- Phase work goes in gitignored `.gsd/phase/<slug>/` folders with numbered files (`00-run.json`, `40-design.md` at 3,652 words, `50-test-matrix.md`, `60-acceptance-evidence.md`). They are then cited from 191 tracked files (§Summary).
- Records also pile up inside standing docs: ADR amendments that are phase validation reports (ADR-3180), and the `CONTEXT.md` session log and postmortems.
- Changesets are the one record type with a clean lifecycle: a fragment, rendered into the changelog, then deleted.
- ADR-3942 names the rule behind this: data with "PR lifetime and is stored in permanent, shared, merge-path state. **Every defect in this family descends from that one mismatch**".

## 8. Ideas to borrow and anti-patterns

### Borrow

1. **"The gate IS the record"** (`CONTEXT.md:1051`). When a lint rule or test enforces a rule, delete the prose. When no check can evaluate a rule, delete it too, rather than keep "unenforceable prose". Addresses all three complaints. It supports your leaning direction and sharpens it: a rule the code enforces is "clear from the codebase".
2. **Check pointers, not prose.** Verify that every path cited in a doc resolves (`scripts/check-glossary-refs.cjs` A). Extend it to section anchors, which GSD missed (`CONTEXT.md:1006`). Addresses complaint 3 cheaply. It fits a lean AGENTS.md whose value is mostly pointers.
3. **Claims carry an enforcement pointer** (`SEAM.<id>.enforced-by=lint-rule:|test:`, ADR-3626; "resolves-only" by design). An Antmay architecture statement like "X is the only place that does Y" could be required to name the test or lint that holds it, or be dropped. Addresses complaint 3, and prunes complaint 1.
4. **Never write computable counts or lists by hand.** `tests/inventory-headings-countfree.test.cjs` bans counts in headings. The `docs/AGENTS.md` count drift shows why. Addresses complaint 3.
5. **Byte budgets with a per-file ratchet and a growth acknowledgment** (ADR-1610; the `Emitted-Drift-Ack-Growth:` trailer, `CONTRIBUTING.md:1069`). Apply this to `AGENTS.md` and descriptions rather than to prompts. Addresses complaint 2, which GSD never applied to its own docs.
6. **Split rules for progressive disclosure** (`docs/PARTITION-RULES.md`):
   - "A split moves text. It does not restate it."
   - a *disjointness* check, so no line appears in both the spine and a detail file
   - a protected list (negative instructions, output contracts, security text, machine-parsed headings) that must stay in the file loaded eagerly
   - a rule for when a split isn't worth its fixed cost

   This is directly usable for a lean AGENTS.md that points to deeper docs. Addresses complaints 2 and 3.
7. **Digest first, then select, then read** (`agents/gsd-planner.md:647-680`), and bounded rolling reads such as "at most 3" (`discuss-phase.md:243`) pinned by a test. This matches `consult-*` listing by frontmatter. It adds explicit caps on how many are opened and a task-type routing table (`gsd-planner.md:608-617`). Addresses complaint 2.
8. **Promote only on recurrence** (graduation: ≥3 distinct units, human approval, remembered dismissals). A candidate for an Antmay rule on when a settled point graduates to a standing doc. Addresses complaint 1.
9. **Structural drift signal for descriptive docs**: stamp the commit a doc was mapped at, and warn (don't block) when new dirs, routes or migrations appear outside the map (`src/drift.cts`). If Antmay keeps navigation guides, this is the cheapest staleness check. Addresses complaint 3.
10. **Managed, marker-delimited sections in the agent file**: detect manual edits, never clobber a hand-written file, offer link vs embed (`src/profile-output.cts:340-366`, `:1221`). This is the mechanism for "Antmay keeps AGENTS.md lean". Its default of embedding map summaries is the part *not* to copy.
11. **Match storage to lifetime** (ADR-3942; changesets deleted after render). This backs Antmay's closed-thread rule, and its "never cite a thread" rule gets hard evidence from GSD's 105 dangling `.gsd/phase/*` citations.
12. **A canonical artifact registry plus a warning for unknown files** (`src/artifacts.cts`, W019). A cheap guard against doc sprawl. Addresses complaint 1.

### Anti-patterns

- **A monolithic, append-only agent memory with a "read in full" rule** (`CONTEXT.md`, `docs/contributor-standards.md:47`). Worsens complaints 2 and 1. It also shows that "hard to find in the code" knowledge alone doesn't bound a doc: `CONTEXT.md` is mostly exactly that kind of knowledge and still reached 500 KB. The direction needs an admission test, a budget and a deletion rule as well.
- **ADRs amended in place with validation reports** (ADR-3180: 62% of its words are amendments). Worsens complaint 2. Antmay's "supersede and move" beats "amend forever".
- **CI that forces doc edits** (`lint-docs-required.cjs`, "When unsure … update the docs"). Worsens complaints 1 and 2. It measures touching `docs/`, not accuracy.
- **Unconditional doc generation** (docs-update's 6 always-on docs; map-codebase's 7 docs and "quality over brevity"). Worsens complaints 1 and 2, and describes what the code already shows. That argues against the direction, so these are the docs to *not* write.
- **Tool-specific agent files with no check** (`.clinerules`, `.coderabbit.yaml` comments) and **rules sourced from a gitignored `CLAUDE.md`** (`tests/inventory-manifest-sync.test.cjs:4`). Worsens complaint 3.
- **Size rules stated but not enforced** ("Keep STATE.md under 100 lines", pruning off by default). Worsens complaint 2.
- **Aspirational reference docs** (`DECISIONS-INDEX.md` "Generated when…", with no producer). Worsens complaint 3, copied across 4 translations.
- **Sync by mechanism is expensive.** `scripts/` holds about 146 entries, with 22 generators and 73 doc-reading tests (inference from counts), yet prose still drifts. Writing less is cheaper than checking more, which supports the direction.

## Evidence gaps

- **The maintainers' `CLAUDE.md` is gitignored**, so I couldn't see how `CONTEXT.md` actually reaches agents in practice, or what that file says.
- **No real user `.planning/` tree is in the repo.** I could measure templates but not actual STATE, ROADMAP or codebase-map sizes, or a generated `CLAUDE.md`, in a live project.
- **No git history** (shallow clone), so I couldn't measure how fast `CONTEXT.md` or the ADRs grew. My only guides are ADR-1671's "~935 lines, ~200 KB" (June 2026) against 1,051 lines and 503 KB now.
- **Unverified runtime behaviour:** whether `link`-mode `@` imports cut context tokens, and whether W019 fires on user-authored `METHODOLOGY.md` (read by `pause-work.md:197` but missing from `CANONICAL_EXACT`). Both are marked as inferences.
- **Not read:** most how-to and reference pages, 89 of 97 ADR bodies, the translations, `CHANGELOG.md` content, most of `src/`, and the 979-entry `tests/` directory beyond the doc-guard tests named above. ADR status counts come from grepping the bullet and table `Status` forms only.
