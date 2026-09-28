# Synthesis — how eight projects handle documentation, and what it means for Antmay

This synthesis reads across the eight project reports, `002A`–`002H`. A project path is written `<project> <path>`, relative to that project's clone root; the report that cites it has the detail. Antmay paths are relative to this repository's root. The Leitspace figures come from the mirror at `temp/mirrors/Leitspace/` (snapshot of 2026-09-20).

## Summary

- **The clearest signal is which way these projects changed, not what they hold now.** Five projects each shipped a richer agent-facing doc model, watched it drift, and cut it back to a small pointer block:
  - BMAD retired four doc-generating skills;
  - spec-kit and OpenSpec shrank or dropped their `AGENTS.md` content;
  - beads cut its skill from 3,306 to about 500 words and points at a generated command;
  - mattpocock treats `CLAUDE.md` as navigation pointers.

  None moved the other way. That is strong outside support for the leaning direction.
- **Descriptive prose drifts first, in every project.** That means "what the system does" and "where things are". Navigation guides ("where is X") were the most drifted documents in three reports. Two of Antmay's five project-layer kinds, product behavior and architecture description, are exactly these kinds.
- **Only machine-owned sync held.** What held was generated references, parity tests between a doc and the source it copies, retired-term sweeps, path/reachability checks, and pinned facts. What decayed was prose sync rules, AI-review "docs follow source" rules, human audit ledgers, and unenforced size caps. No project checks the *meaning* of prose against code; the checks that work are on pointers, terms, copies and counts.
- **"Hard to find in the code" does not bound a document on its own.** gsd-core's `CONTEXT.md` is mostly exactly that kind of knowledge (a module-to-source map), and it reached 503 KB. The direction needs an admission test, a size budget that blocks, a shrink path, and pointer checks alongside it.
- **The admission tests that work ask what a miss costs, and wait for evidence.** mattpocock's "cache" rule admits a doc only when the lookup is expensive. BMAD asks "what does it cost when it doesn't". Several projects only admit a navigation note or pitfall after an agent actually struggled or erred, or after it recurred.
- **Decisions are the one standing kind that almost every project ends up needing.** Where there is no home, rationale becomes unfindable (spec-kit, superpowers, OpenSpec). Where the gate is loose, it balloons (gsd-core: 97 ADRs, median 1,870 words; Leitspace: 46 ADRs by roadmap entry 2). The argument is for keeping decisions, much smaller and much harder to create, not for dropping them.
- **Agents skip indexes they have to choose to open.** OpenAgentsControl's own evals show the main agent bypassing the doc router and grepping the code. BMAD designs around a measured never-invoked rate. So pointers belong in the always-loaded file and should name a trigger the agent can observe. That bears on Antmay's reliance on model-invoked `consult-*` skills outside an entry point.
- **Antmay already gets several things right that others learned the hard way:** lazy creation, one fixed path per kind, supersede-and-move, threads never cited and kept out of search, and a mechanical landing step. Its weak points match the anti-patterns:
  - the default outcome of `spec` is to write something;
  - the descriptive kinds exist at all;
  - nothing retires or shrinks a doc;
  - nothing checks a doc against the code;
  - rules for agents have no home, so they pile up in `AGENTS.md` by hand.

## The eight projects at a glance

| Project | Standing docs prescribed for users | Agent-file approach | What keeps docs honest | Report |
|---|---|---|---|---|
| BMAD-METHOD | One verified block of rules in `AGENTS.md`; doc generation retired in v6.11 | Managed `bmad:context` block, pointers with observable triggers | Agent-run refresh against a recorded SHA; in-repo forbidden-term guard and topic reachability | 002A |
| OpenAgentsControl | A 296-file "context system" behind 75 navigation indexes; decisions-log template | No `AGENTS.md`; agent prompt plus a session-start catalogue built from frontmatter | Path and link existence, partly switched off | 002B |
| OpenSpec | Standing behavior specs, merged mechanically from change deltas | Writes no `AGENTS.md`; `config.yaml` context and per-artifact rules injected by the CLI | Blocking delta-shape validation and merge guards; incident-driven claim tests; nothing against code | 002C |
| beads | None; the issue tracker is the memory | Hash-stamped managed block that says "run `bd prime`"; `bd prime` output generated at runtime | Generated CLI reference with blame-scoped drift check and autofix; freshness markers naming source paths; prose-fact tests | 002D |
| spec-kit | A constitution plus a full per-feature spec set, never reconciled into a standing picture | Opt-in 3-line block pointing at the current plan | Narrow parity tests; prompt regression tests | 002E |
| mattpocock/skills | Only `CONTEXT.md` (glossary) and ADRs, both lazy | `CLAUDE.md` as one pointer line per topic | Nothing mechanical | 002F |
| superpowers | None; dated specs and plans accumulate | Session start injects one skill, everything else lazy | Version-string audit only | 002G |
| gsd-core | Fixed `.planning/` registry, 7 codebase maps, generated `CLAUDE.md` sections | Marker-delimited managed sections, link or embed | 22 `--check` generators, about 48 lints, a structural drift gate on maps | 002H |

## Patterns that recur

### 1. Projects that tried rich agent-facing docs retreated to a small pointer block, after drift

- **BMAD** retired `bmad-document-project`, `bmad-generate-project-context`, `bmad-shard-doc` and `bmad-index-docs` for a single skill that writes "one small verified block" into `AGENTS.md`: "The old skills wrote more documentation. This skill keeps less, and checks it." (BMAD `docs/existing-codebases/theory-of-project-context.md:166`, `CHANGELOG.md:28,40,91`). It also reverted `persistent_facts`, which auto-loaded `project-context.md` into every workflow (`CHANGELOG.md:11`).
- **spec-kit** first stopped writing "Active Technologies / Recent Changes" into the agent file. It then moved that out to an extension, and finally left only a 3-line opt-in pointer to the current plan (spec-kit `CHANGELOG.md:2370,1406,1072`; `extensions/agent-context/scripts/python/update_agent_context.py:204-213`). It also removed constitution propagation because "Propagation duplicated the single source of truth" (`docs/upgrade.md:211-239`).
- **OpenSpec** went from a long generated `openspec/AGENTS.md` plus a root stub, to a slimmed stub ("When teams edit one copy but not the other, the files drift"), to writing no `AGENTS.md` at all (OpenSpec `openspec/changes/add-init-agents-target/proposal.md`; `openspec/specs/legacy-cleanup/spec.md:85-104`).
- **beads** cut its skill "from 3,306 to ~500 words" and pointed CLI detail at `bd prime` (beads `plugins/beads/skills/beads/adr/0001-bd-prime-as-source-of-truth.md`). The managed block exists so that "This keeps AGENTS.md lean while bd prime provides up-to-date workflow details" (`cmd/bd/onboard.go:102`).
- **spec-kit's own `AGENTS.md`** became a 58-line router after an inventory inside it drifted (spec-kit `CHANGELOG.md:1898,1817`).

The one project still embedding descriptive content by default is gsd-core, which copies codebase-map summaries into the generated `CLAUDE.md` (gsd-core `src/profile-output.cts:419-482`). It offers a `link` mode as the lean alternative.

### 2. Descriptive prose drifts first; navigation prose drifts fastest

Every report found drift in hand-written descriptions of the system:

- **OpenSpec's standing specs** still require an `openspec/AGENTS.md` that the code deletes. One deletion ledger admits "the accepted spec library still describes deleted behavior" (OpenSpec `openspec/specs/docs-agent-instructions/spec.md`, `src/core/legacy-cleanup.ts:894`).
- **beads' `engdocs/INTERNALS.md`** documents a `FlushManager` and a cache that no longer exist. Its line-number-anchored "Noridoc" files cite moved lines and a non-existent package (beads `build-docs.md`, `cmd/bd/docs.md:15`).
- **spec-kit's constitution** was "derived from the patterns the codebase already enforces". Within about three months it cited attributes and directories that don't exist (spec-kit `.specify/memory/constitution.md:38,50,56`).
- **Navigation guides were the worst:**
  - OpenAgentsControl's "where is X" lookup lists directories that don't exist, and 31 backticked paths in its navigation indexes don't resolve (OAC `.opencode/context/openagents-repo/lookup/file-locations.md`).
  - superpowers' porting guide, its one "hard-to-explore area" guide, is its most drifted document (superpowers `docs/porting-to-a-new-harness.md:24,295`).
  - gsd-core documents a `DECISIONS-INDEX.md` that nothing produces (gsd-core `docs/reference/planning-artifacts.md`).

Antmay's `docs/product/<capability>.md` is the analogue of OpenSpec's standing specs, which have a median of 117 lines and restate what 207 test files already pin. Its `docs/architecture/<module>.md` is the analogue of INTERNALS and the navigation guides. Their admission clause, "only where the code does not make it obvious", is checked by nothing.

### 3. Only machine-owned sync held; prose sync rules decayed

**What held, each wired into CI or a blocking step:**

- **Generated reference.** beads regenerates at HEAD and at the merge-base and "contributors only own docs for the code they actually touched", with an autofix bot (beads `scripts/check-cli-docs-drift.sh`). gsd-core runs `--check` twins for its ADR index, `FEATURES.md` and inventory manifest (gsd-core `package.json` `lint:generated-sync`).
- **Parity between a doc and what it copies.** spec-kit compares a docs YAML block with the shipped workflow (spec-kit `tests/workflows/test_bundled_speckit_workflow.py:45-60`). OpenSpec requires byte parity between the schema page and `schema.yaml`, and between generated `skills/` and their generator (OpenSpec `test/core/templates/schema-docs-instruction-parity.test.ts`, `skillssh-parity.test.ts`).
- **Retired-term sweeps.** BMAD's forbidden-terms guard fails the site build (BMAD `docs-site/scripts/validate-published-implementation-model.mjs:4-17`). OpenSpec keeps renamed terms out of code and docs (OpenSpec `test/vocabulary-sweep.test.ts`).
- **Pointer checks.** gsd-core requires every cited path to exist (gsd-core `scripts/check-glossary-refs.cjs`). BMAD fails a help topic that nothing links to, or a link to a missing topic (BMAD `tools/validate_manifests.py:253-282`). beads' freshness markers must name source paths that exist (beads `scripts/check-doc-freshness.sh`).
- **Pinned facts.** beads fails if the Dolt version in prose disagrees with the install snippet and the test container (beads `test/docsync/doltpin_test.go`). gsd-core bans hand-written counts in headings (gsd-core `tests/inventory-headings-countfree.test.cjs`).

**What decayed:**

- **Prose and AI-review sync rules.** BMAD's "docs follow source" review rule is scoped to a `src/**` that no longer exists (BMAD `.coderabbit.yaml:76-81`).
- **Human audit ledgers.** beads' quarantine deadline passed with all 11 staged files still present, and the drifted `INTERNALS.md` still marked "Keep" (beads `engdocs/staged-for-removal/MANIFEST.md`).
- **Checks switched off.** OpenAgentsControl excludes its own maintainer docs from link checking "to keep CI green" (OAC `scripts/validation/markdown-link-skip-patterns.txt:31-34`). It asks an AI via an issue to fix README counts, while a script that could check them is wired to nothing (OAC `sync-docs.yml`).
- **Checks that measure activity, not accuracy.** gsd-core's CI fails a PR unless it *touches* `docs/` (gsd-core `scripts/lint-docs-required.cjs`), which measures activity rather than accuracy.

gsd-core puts the cost plainly. It has about 146 scripts, 22 generators and 73 doc-reading tests, and prose still drifts: writing less is cheaper than checking more (report 002H).

### 4. Prose gates don't bound volume, and volume moves to wherever the gate isn't

- **Glossaries.** mattpocock's glossary skill has an explicit inclusion rule, yet users report `CONTEXT.md` files of "500 lines. 1,000. 3,000". The project calls this its most-reported problem and admits the guidance "is not yet strong enough" (mattpocock `docs/engineering/domain-modeling.md:44,54-55`). gsd-core's `CONTEXT.md` is 503 KB and must be read "in full" (gsd-core `docs/contributor-standards.md:47`).
- **Where OpenSpec's volume went.** Its governed standing specs total 5,697 lines. Its ungoverned `explorations/`, `initiatives/` and `work/` total about 22,900, including a 2,197-line roadmap. OpenAgentsControl committed 23k lines of planning for one refactor. In gsd-core, ADR amendments are 62% of the words of ADR-3180.
- **Leitspace follows the same pattern.** It has 46 ADRs (median 246 words, 11.5k words in total) and a 523-line `AGENTS.md` that mixes rules, guidelines and background.

**Size caps:**

- **Unenforced caps are ignored.** At OpenAgentsControl, 119 of 296 files exceed the "strict" 150-line cap. At superpowers, 14 of 15 skills exceed their word target. OpenSpec's limits only warn.
- **Caps met by splitting made things worse.** At OpenAgentsControl one workflow became 9 files, the split broke registry entries, and token cost did not drop.
- **What did bound size:**
  - hard caps inside authoring (spec-kit: at most 3 `[NEEDS CLARIFICATION]`, 5 clarify questions, 50 findings);
  - a proportion rule ("a plan several times longer than the spec it implements is a transcript of the program", which cut plan tokens to about a third, superpowers `skills/writing-plans/SKILL.md:157-161`, `RELEASE-NOTES.md:5`);
  - byte ratchets that require an acknowledgment to grow, applied to gsd-core's prompts but not its docs (gsd-core `docs/adr/1610-…md`);
  - per-write user approval plus "audit ends smaller or equal" (BMAD `skills/bmad-project-context/SKILL.md:39,111-115`).

### 5. Admission tests that work ask what a miss costs, and wait for evidence

- **Cost of a miss:**
  - mattpocock: a doc that restates the environment "is a cache", earning its place "only when the lookup is expensive … Leave the one-file, one-command lookups to the environment, where they cannot go stale" (mattpocock `skills/productivity/writing-for-agents/SKILL.md:79`).
  - BMAD: "Not *could an agent derive this* but *what does it cost when it doesn't*". It weighs exploration cost, whether the fact arrives before or after the mistake, and how bad a miss is (BMAD `skills/bmad-project-context/references/best-practices.md:5-9`).
- **Reversibility.** mattpocock's ADR gate requires all three of: hard to reverse, surprising without context, a real trade-off. "If a decision is easy to reverse, skip it: you'll just reverse it." The agent *offers* an ADR and the user decides (mattpocock `skills/engineering/domain-modeling/ADR-FORMAT.md:29-37`, `SKILL.md:66-74`).
- **Evidence triggers:**
  - a navigation pointer only after a session "took a long time to find a piece of information" (mattpocock `skills/in-progress/retro/SKILL.md:17`);
  - a pitfall only from an observed agent mistake (BMAD `SKILL.md:105-109`);
  - "If users ask the same question twice, document it" (OAC `core/standards/documentation.md:7`);
  - promotion only after recurrence in 3 distinct units of work, with human approval and remembered dismissals (gsd-core `gsd-core/workflows/graduation.md`).
- **Legitimate absence.** OpenSpec rejects a change with no spec delta unless it says `skip_specs: true`, and tells the agent "Do not invent a requirement just to satisfy validation" (OpenSpec `schemas/spec-driven/schema.yaml:36-42`). Consumers of missing docs "proceed silently … don't suggest creating them upfront" (mattpocock `skills/engineering/setup-matt-pocock-skills/domain.md:11`).

### 6. A rule that a check can enforce becomes the check, and the prose goes

- gsd-core: "Prose defect entries retired in favour of gates; the gate IS the record", and rules no check can evaluate were deleted (gsd-core `CONTEXT.md:1051`). A claim that "X is the only place that does Y" must name the lint or test that enforces it (gsd-core ADR-3626, `scripts/lint-seam-enforcement.cjs`).
- BMAD: "Prefer a check over a line; a check that lands deletes its line" (BMAD `best-practices.md:63`).
- mattpocock and superpowers state the same rule. A mechanical rule becomes a lint, hook or CI check "full stop" (mattpocock `retro/SKILL.md:19`). "If it's enforceable with regex/validation, automate it — save documentation for judgment calls" (superpowers `skills/writing-skills/SKILL.md:55-59`).

### 7. Decisions are needed, but only small ones

- **Without a standing home, rationale gets lost.** In spec-kit it scatters across feature folders ("Related decisions can be spread across multiple feature directories", spec-kit `docs/concepts/spec-persistence.md:62-64`). The community built ADR, archive and reconcile extensions to fill the gap. In superpowers it lives in a 14k-word release-notes file that cannot be searched by topic. In OpenSpec it sits in archived `design.md` files that nothing indexes. For mattpocock, "Where did my other decisions go?" is "the most substantive open complaint" (mattpocock `docs/engineering/grill-with-docs.md:54-55`).
- **With a loose gate, records balloon.** gsd-core's ADR test makes most CI rules ADR-worthy, and records are amended forever. beads has five decision homes. Leitspace reached 46 records.
- **What balanced it.** mattpocock allows a 1–3-sentence ADR, gates it three ways, and has the agent offer rather than write. BMAD's architecture spine records "decisions, not rationale", with rationale in an append-only log that isn't loaded by default (BMAD `skills/bmad-architecture/SKILL.md:17,21`).

### 8. Agents skip indexes they have to choose to open

- **OpenAgentsControl's own eval.** Asked how the registry works, the main agent grepped and read `registry.json` directly and never delegated to its doc-routing subagent (OAC `evals/agents/CONTEXTSCOUT_TEST_FINDINGS.md:15-30`).
- **BMAD.** Its design rests on "An index the agent must choose to fetch gets skipped; one already in context does not". A pointer must name "a path, a file type, a named task — never one it must judge" (BMAD `best-practices.md:49-55`).
- **superpowers.** Its two standing guides are never linked from `AGENTS.md` or the README, and they rotted unread.

What works instead:

- a catalogue generated from frontmatter and injected at session start (OAC `plugins/claude-code/hooks/session-start.sh:32-49`);
- CLI digests (OpenSpec `list --specs`, then `show --no-scenarios`, then a full read; beads `bd prime`);
- "digest, select, then read at most 3" (gsd-core `agents/gsd-planner.md:647-680`, `discuss-phase.md:243`).

### 9. Work records stay out of standing docs and are never cited from code

This validates Antmay's existing rules:

- **Citations to records that aren't in the repo.** beads cites bead IDs from comments in 407 Go files, but the issue data isn't in the repo, so no clone can resolve them. gsd-core cites 105 gitignored phase folders from 191 tracked files, and only one of those folders exists.
- **Old records read as live guidance.** superpowers had to write a test that polices path text inside historical specs and plans (superpowers `tests/claude-code/test-worktree-path-policy.sh`). *Inference:* agents were reading old records as current.
- **Scratch that is disposable by design.** superpowers deletes the execution workspace, because "the git history is the record now" (superpowers `skills/executing-plans/SKILL.md:301`). OpenAgentsControl expires `.tmp/` after 24 hours. spec-kit gitignores its own `specs/`. mattpocock treats the spec as throwaway once the work ships.

### 10. Rationale about one code location lives beside that location

- OpenSpec keeps rationale next to the guard it explains, tagged with issue numbers (OpenSpec `src/core/validation/validator.ts:176-195`).
- superpowers and BMAD do the same in script headers and validator docstrings.
- In spec-kit, the most reliable rationale sits in regression-test docstrings, which fail if the prompt loses it (spec-kit `tests/test_tasks_template_constraints.py:1-8`).

The general rule from report 002C: a document is warranted only for rationale that no single code location can hold.

## Where Antmay stands against these patterns

**Already right, and ahead of most of the set:**

- **The project layer is lazy and never a prerequisite.** Compare OpenAgentsControl's "Planned Content" stubs and gsd-core's always-on docs.
- **One fixed path per kind.** Compare beads' five decision homes.
- **Supersede-and-move.** Compare gsd-core's amend-forever ADRs and OpenAgentsControl's "never delete, archive instead".
- **Threads are historical, never cited, and hidden from default search** (`docs/product/method.md`, "How this repository runs on the method"). The beads and gsd-core citation failures are the cost of the opposite rule.
- **A landing step at close with a hash-checked dry run.** This is the one mechanism that held in OpenSpec, and it beats spec-kit's "team convention" (`suite/skills/close/close-thread/SKILL.md`).
- **Catalogues printed from frontmatter and headings without loading bodies** (`consult-decisions`, `consult-descriptions`).

**Where it matches the anti-patterns:**

1. **The default outcome is to write.**
   - `spec` sorts every settled point through a routing table. Its audit treats a settled point "with no home in the spec and no delta document" as missing. Any sentence describing standing behavior or structure must become a delta (`suite/skills/spec/spec/SKILL.md`, "Audit pass"; `suite/shared/references/formats/spec.md`, "Routing").
   - The only brake is the decision test, written as prose. That is the shape that produced 3,000-line glossaries at mattpocock, and 46 ADRs in Leitspace.
2. **Two kinds are descriptive.** The admission rule for `docs/product/` and `docs/architecture/` is a prohibition with a nuance clause ("only where the code does not make it obvious"). superpowers measured that this form binds worse than a positive recipe (superpowers `skills/writing-skills/SKILL.md:463-476`), and nothing checks the rule.
3. **Standing reads on every run.**
   - All 16 entry-point skills list `docs/glossary.md` among their inputs and open it whole. In this repository that is 95 rows and about 3.5k words. It includes 4 "leaves the vocabulary" rows and a CLI section while the CLI is on hold.
   - Every run also opens in full the descriptions and decisions the work touches.
   - This is milder than BMAD's reverted `persistent_facts`, but it is the same lever.
4. **Retrieval outside an entry point depends on the agent choosing `/consult-*`.** Patterns 1 and 8 say that choice gets skipped. Nothing in the method puts a triggered pointer to `docs/` into the always-loaded file.
5. **There is no path for shrinking or retiring a doc.** A delta can `remove`, but nothing prompts it. `close-thread` checks each delta against its target doc, never the doc against the code. That is the same gap as OpenSpec: a sound merge, and content that drifts.
6. **Rules for agents have no method-owned home** (`spec.md` routing: "no method-owned home"). So they pile up by hand in `AGENTS.md`, as the 523-line Leitspace file shows.
7. **In this repository, two maintainer docs copy the source of truth.**
   - `docs/product/method.md`, "What each skill produces", restates the README's skill sections and the skills themselves.
   - `docs/architecture/suite.md`, "Distribution" and "Mechanical gates", restates `suite/AGENTS.md`, "Before anything else", and the scripts.

   Patterns 2 and 3 show that copies like these drift first. This is the most likely place where this repository's docs are drifting from the skills.

## The strongest ideas for Antmay, weighed against the direction

Ranked by strength of evidence times fit.

1. **Own a small, generated, marker-delimited block in the project's `AGENTS.md`, and make it the project layer's index.**
   - **What it holds.** One line per standing doc, each with an observable trigger ("Changing X? Read `docs/…`"), plus the few rules for agents no check can hold.
   - **How it's kept.** `close-thread` regenerates it from what it lands, so it holds pointers and not facts, and cannot drift from `docs/`. It is hash-stamped and never touches text outside the markers.
   - **Evidence:** beads `internal/templates/agents/render.go`; spec-kit `update_agent_context.py:204-213,259-295`; gsd-core `src/profile-output.cts:1115-1300` (refuses to clobber a hand-written file; link vs embed); BMAD `bmad:context`; OAC catalogue built from frontmatter.
   - **Fit:** this is the direction made concrete. It also closes the "index the agent must choose to fetch" gap.
   - **Cost:** the method starts owning a region of a user-owned file, which is a decision for the thread.
2. **Make "nothing leaves the thread" the default, and admit a standing doc by a positive recipe framed as the cost of a miss.** A statement earns a place only when all three hold:
   - finding it in the code is expensive or impossible;
   - missing it is costly (a wrong build, lost data, rediscovery every session);
   - no check can enforce it.

   For decisions, add "hard to reverse". Keep `delta: none` as the ordinary close.
   - **Evidence:** mattpocock `writing-for-agents/SKILL.md:79`, `ADR-FORMAT.md:29-37`; BMAD `best-practices.md:5-9`; OpenSpec `schema.yaml:36-42`; superpowers on positive recipes.
   - **Fit:** it sharpens "hard to tell or find" into something an agent can apply, and replaces the audit's "every settled point must land" pressure.
3. **Route every candidate statement down a ladder before it becomes prose.** Check it in this order, and stop at the first that fits:
   1. It can be enforced: add a lint, test or hook, and write no prose.
   2. It concerns one code location: put a comment beside it.
   3. It is a rule for agents: add a line in the managed block.
   4. Otherwise: add a line to a doc.

   This gives "rules for agents" a home and keeps it bounded.
   - **Evidence:** gsd-core `CONTEXT.md:1051` and ADR-3626; BMAD `SKILL.md:70`; mattpocock `retro/SKILL.md:19`; OpenSpec code comments.
   - **Fit:** strong. Once a check exists, the code does make the rule clear.
4. **Cheap mechanical checks on the project layer, run where Antmay already runs checks.** These check pointers, not meaning:
   - every path and anchor cited in `docs/` and in the managed block exists;
   - every standing doc is reachable from the block;
   - no retired glossary term appears anywhere;
   - no hand-written counts;
   - every surviving descriptive statement names source paths that exist.

   `close-thread` already runs a repository search. These fit next to it, and could also ship as a dependency-free script a project wires into its CI.
   - **Evidence:** gsd-core `check-glossary-refs.cjs`; BMAD `validate_manifests.py:253-282` and the forbidden-terms guard; OpenSpec `vocabulary-sweep.test.ts`; beads `check-doc-freshness.sh`.
   - **Fit:** the leaner the layer, the cheaper these checks are.
5. **A shrink pass at close over every doc the thread touches.** Each existing statement is marked retain, rewrite, relocate, automate or delete. Deletion needs a named ground: stale, now enforced by a check, contradicted, or user-approved. A touched doc ends no longer unless the thread's delta adds to it. "Capability gone = doc gone."
   - **Evidence:** BMAD `best-practices.md:71-84`; OpenSpec `openspec/work/…/roadmap.md:1005`; mattpocock's "gets shorter as often as it gets longer" (`docs/engineering/domain-modeling.md:82`), which no mattpocock skill actually performs.
6. **Budgets that block, per kind, with growth acknowledged and splitting disallowed as the remedy.**
   - Candidates: a line cap on the managed block, a short ADR body (1–3 sentences allowed), one-sentence glossary definitions (already the rule), and a source path per descriptive statement.
   - Enforce them where review already happens: `review-spec` and `close-thread`.
   - **Evidence:** gsd-core ADR-1610 ratchet and growth trailer; BMAD plan budget; superpowers proportion rule; OAC splitting failure.
   - **Fit:** needed because the direction alone does not bound size (pattern 4).
7. **Evidence triggers for navigation guides and pitfalls.** Write the "hard to find" doc after a session measurably struggled, or after the same question recurred, not speculatively at spec time. The implementation report is a natural place to record such friction for a later thread to act on.
   - **Evidence:** mattpocock `retro/SKILL.md:17`; BMAD `record`; gsd-core graduation; OAC "asked twice".
   - **Fit:** it refines the second half of the direction.
8. **Provenance for anything descriptive that survives.** Each doc names its source paths and the commit it was verified at. `consult-descriptions` or `close-thread` warns when those paths were renamed, deleted or restructured since.
   - **Evidence:** BMAD `Verified <date> against <sha>` with `git log --diff-filter=DR`; beads `Freshness source:`; gsd-core `last_mapped_commit` and its drift gate.
9. **Read less by default.** Skills read the catalogue, open docs by trigger, and cap how many they open. The glossary could be looked up by term rather than read whole.
   - **Evidence:** gsd-core "at most 3" pinned by a test; OpenSpec's list, then overview, then full read; spec-kit `AVAILABLE_DOCS`.
10. **Decisions: keep the kind, shrink the record.**
    - Allow very short records, and keep rejected alternatives to one line each.
    - Keep rationale out of the always-loaded path.
    - Keep supersede-and-move.
    - **Evidence:** mattpocock's 1–3-sentence ADR; BMAD "decisions, not rationale"; gsd-core's amend-forever as the counter-example.

## Ideas that argue against or refine the direction

- **"Hard to find in the code" is not a bound by itself.**
  - gsd-core's 503 KB `CONTEXT.md` is mostly navigation knowledge, and OpenAgentsControl's navigation docs were its most drifted.
  - A navigation guide is justified only with a trigger for writing it, a budget, and a check on its paths, or if it is generated.
  - spec-kit's `design/cli.md` shows the best version: it sets a naming convention and names a reference implementation, so the code needs the doc less over time (spec-kit `design/cli.md:7,17-28`).
- **A lean `AGENTS.md` only works if pointers name observable triggers and a loading channel exists.**
  - beads needs 53 lines for agents with hooks and 131 without (beads `internal/templates/agents/render.go:16-19`).
  - "Point only when needed" should become "point with a trigger the agent can see".
  - Pointer-only docs still need path checks: superpowers' guides drifted while unlinked.
- **Volume migrates.** If `docs/` gets a strict gate, content will flow into `AGENTS.md` and into threads (pattern 4).
  - The managed block needs its own budget.
  - The user-owned rest of `AGENTS.md` deserves an audit aid. beads' `bd rules audit` flags near-duplicate and contradictory rules (beads `cmd/bd/rules.go`); BMAD's ledger is another model.
- **Don't delete for derivability alone.** BMAD forbids removing a human-written line only because the code shows it: "the reasoning that empties good files" (BMAD `best-practices.md:82`). Its cost-of-miss test admits a derivable fact that stops the same rediscovery every session. The criterion is *expense*, not *derivability*.
- **Don't go to zero standing docs.** mattpocock's top complaint, spec-kit's catalogue of community gap-fillers, and OpenSpec's stranded decisions all show the cost of keeping only the code. Decisions and a small glossary earn their place.
- **Pointed-to material must be in the repository.** beads' tracker IDs and gsd-core's gitignored phase folders show that a lean file pointing outside the repo, or at gitignored material, fails silently.
- **State the direction as a recipe, not a prohibition.** "Anything the code already makes clear should not be written down" is itself a prohibition with a judgment clause, the form superpowers measured to bind worst. Say what a standing statement *is*, for example "an instruction or fact whose lookup is expensive and whose miss is costly, naming where it applies".

## What the evidence suggests for each kind

These are options for the thread, not decisions.

| Kind | Evidence | Option |
|---|---|---|
| ADR / PDR | Needed everywhere; balloons under a loose gate | Keep. Stricter gate (add reversibility; "offer, don't write" where a dialogue skill runs), much shorter records |
| Glossary | Small and cheap when gated to project-specific terms; bloats when written inline | Keep. Replace "leaves the vocabulary" rows with a retired-terms list that a sweep check reads; consider lookup by term instead of reading it whole |
| Product behavior | Weakest case: behavior catalogues duplicate tests and rot (OpenSpec) | (a) Retire the kind: a commitment and its reason become a PDR, behavior lives in code and tests. (b) Keep only statements that name the test or source that holds them |
| Architecture description | Navigation is the one legitimate "hard to find" case, and the fastest to drift | Reshape into evidence-triggered navigation guides for hard-to-explore areas. Every statement names paths that a check resolves; "X is the only place that does Y" must name its enforcing check |
| Rules for agents (no home today) | Everyone who solved this used checks first, then a small loaded block | Check first; otherwise a line in the managed `AGENTS.md` block, drafted as a delta and landed at close |
| Roadmap index | Not examined closely by the research | Unchanged |

## Open questions for the thread

- **The user's `AGENTS.md`.** Does the method take ownership of a marker-delimited region of it? Today the method treats `AGENTS.md` as the user's.
- **Product behavior.** Retire the kind, or keep it under an enforced-by or source-path rule?
- **Where the checks live.** Inside `close-thread` only, run by the agent, or also as a shipped script a project can wire into CI? The suite has no build, and a user project has no Antmay runtime.
- **"Offer, don't write".** `spec` is completion-oriented, so an offer would have to happen in `discussion`, with `spec` drafting only what was accepted. Does that fit the postures?
- **Migration.** How does an existing project layer shrink to the new bar? For example, Leitspace's 46 ADRs through a one-off audit using the retain/rewrite/relocate/automate/delete ledger.

## Notes on this repository's own docs

- **`docs/product/method.md`** duplicates the README and the skills ("What each skill produces"). **`docs/architecture/suite.md`** duplicates `suite/AGENTS.md` and the script behavior. Both are copies of the source of truth, the kind patterns 2 and 3 say drift first.
- **`docs/glossary.md`** is read whole by every entry-point skill. It carries 4 rows that exist only to retire a term, and a CLI section for a module on hold. The retire rows are permitted by `suite/shared/references/formats/glossary.md`, but they sit uneasily with the dead-concept test in `docs/documentation-rules.md`.
- **This repository has no mechanical check that a doc still matches the skills.** The two scripts check manifest and text form only. A retired-term sweep and a check that paths cited in `docs/` exist would be the cheapest first step.
- **`cli/` is on hold.** None of this proposes touching it. Any drift the method changes cause there should be recorded, not fixed.
