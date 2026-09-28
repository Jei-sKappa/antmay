# github/spec-kit — documentation research

Snapshot: shallow clone, version `1.0.12` (`CHANGELOG.md:5`, 2026-09-25). There is no git history, so history claims below come from `CHANGELOG.md` entry titles, which are generated from commit messages (`.github/workflows/release-trigger.yml:84-115`).

## Summary

- **The agent context block has shrunk to a pointer.** Spec Kit no longer writes a digest of the plan into `CLAUDE.md`/`AGENTS.md`. An opt-in extension keeps one marker-delimited block of about 3 lines that says "read the current plan at `<path>`" (`extensions/agent-context/scripts/python/update_agent_context.py:204-213`). The older design kept "Active Technologies" and "Recent Changes" sections in that file (`CHANGELOG.md:2370`, v0.0.76). That design was moved out into an extension (`CHANGELOG.md:1406`, v0.9.0) and then made fully opt-in (`CHANGELOG.md:1072`, v0.12.0). This is the strongest evidence here for the leaning direction.
- **"A pointer, not a copy" is an explicit design decision.** `/constitution` used to copy its principles into the plan, spec and tasks templates. That was removed on purpose because "Propagation duplicated the single source of truth" (`docs/upgrade.md:211-239`; `CHANGELOG.md:591`, v0.14.4). Templates now carry `[Gates determined based on constitution file]` (`templates/plan-template.md:43`). The old behaviour survives only as an opt-in preset whose README lists the drift it causes (`presets/constitution-sync/README.md:14-17, 72-75`).
- **Per-feature docs pile up, and the core never merges them into a standing picture.** Every feature gets `spec.md`, `checklists/requirements.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/` and `tasks.md`. What happens to them afterwards is declared "a team convention, not a CLI setting" (`docs/concepts/spec-persistence.md:88`). The community catalog has filled this gap with Archive, Reconcile, Spec Sync, adrkit, Blueprint Index, DocGuard, MemoryLint and others (`docs/community/extensions.md:28, 41, 44, 52, 69, 108, 135`).
- **Friction sits inside a document, not on whether to create one.** Prompts cap content: at most 3 `[NEEDS CLARIFICATION]` markers, 5 clarify questions and 50 analyze findings; sections that don't apply are removed; stale text is replaced rather than duplicated. Nothing ever decides that a feature needs fewer files.
- **Agent-facing prompts are long, and about a quarter of the core-command text is copied boilerplate.** The 10 core command prompts run 106–379 lines (median ≈238 lines / ≈1,680 words). Between 18% and 63% of each prompt is the same extension-hook block, and tests pin that wording in every file (`tests/test_command_template_hooks.py`). The bundled `lean` preset does the same pipeline in 19–33-line prompts (`presets/lean/commands/*.md`).
- **Drift in the project's own docs is common and easy to find.**
  - `spec-driven.md:206-260, 355-378` quotes plan-template text ("Phase -1", "Simplicity Gate", `implementation-details/`) that no template contains any more.
  - `docs/reference/agentic-sdd.md:40` still says `/constitution` "keeps dependent templates in sync".
  - The project's own constitution, ratified 2026-06-19, cites a `context_file` integration attribute and a `commands/` directory, neither of which exists (`.specify/memory/constitution.md:50, 56`).
  - `design/workflow-step.md:14` gives the wrong source path.
  - 44 of 153 `docs:` changelog entries are catch-up fixes ("missing", "stale", "sync", "align", "remove"…).
- **Mechanical doc checks are few, narrow, and added after drift was noticed.** The checks are:
  - one parsed-YAML equality test between a docs code block and the shipped workflow (`tests/workflows/test_bundled_speckit_workflow.py:45-60`);
  - issue-template agent lists checked against the registry (`tests/test_agent_config_consistency.py:121-170`);
  - "prompt regression tests" that pin required phrases in command prompts (`tests/test_tasks_template_constraints.py`, `tests/test_constitution_template_sync_report.py`);
  - markdownlint.

  None of them compares prose to code.
- **The project's own `AGENTS.md` is a good model.** It is 58 lines, all "before doing X, read Y" routing, with no inventory. It reached that shape after an inventory in it drifted from the code: "sync AGENTS.md with AGENT_CONFIG for missing agents" (`CHANGELOG.md:1898`, v0.4.4), then "Rewrite AGENTS.md" (`CHANGELOG.md:1817`).
- **The project throws away its own feature records.** `specs/` and `.specify/` are gitignored as dogfooding scaffolding (`.gitignore:54-62`; `CONTRIBUTING.md:170-175`). Only the constitution is committed. In practice Spec Kit treats its per-feature specs as disposable work records, much like closed Antmay threads.

## 1. Inventory

**(a) Self-documentation.** The repo holds 156 `.md` files: about 29,000 lines and 186k words outside `tests/`, including the 3,027-line `CHANGELOG.md`.

```
AGENTS.md (58)            router for agents; no CLAUDE.md in repo
DEVELOPMENT.md (24)       two tables: key docs, key directories
CONTRIBUTING.md (454)     PR process, evidence gate, testing rules, AI disclosure
spec-driven.md (418)      philosophy essay
README.md (212) + ja, zh-CN translations
CHANGELOG.md (3027)       generated from commit messages, 228 releases
design/                   cli.md (370), integration.md (108), workflow-step.md (64)
docs/                     DocFX site, 41 pages, 6,477 lines; median 112 lines (range 20–728)
  concepts/ (4)  guides/ (7)  reference/ (12)  install/ (5)  community/ (6) + index, history, upgrade, quickstart…
extensions/*.md           RFC-EXTENSION-SYSTEM.md (1962, "Status: Implemented"), API ref (896), dev guide (806), user guide (1025)…
presets/ARCHITECTURE.md (189), workflows/ARCHITECTURE.md (218), */PUBLISHING.md, */README.md
.specify/memory/constitution.md (214)  the project's own constitution
.github/skills/           code-review (11), add-community-extension (174)
.github/workflows/*.md    agentic (gh-aw) workflow prompts + RELEASE-PROCESS.md (245)
newsletters/ (7)          monthly narrative, 54–156 lines each
```

There is no ADR directory, no glossary and no architecture index. Architecture docs sit next to their modules (`presets/ARCHITECTURE.md`, `workflows/ARCHITECTURE.md`) or in `design/`.

**(b) What it prescribes for a user's project.**

- `specify init` installs `.specify/templates/`, `.specify/scripts/`, `.specify/memory/constitution.md` and the command prompts for the agent (`src/specify_cli/shared_infra.py:344-530`).
- Each feature then gets `specs/NNN-slug/` containing:
  - `spec.md` and `checklists/requirements.md` (`templates/commands/specify.md` steps 3 and 8);
  - `plan.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md` (`templates/commands/plan.md:66-72, 114-159`);
  - `tasks.md`;
  - more `checklists/<domain>.md` files from `/checklist`.
- `.specify/feature.json` records the active feature.
- The extensions add `assessments/<slug>/{intake,research,concept,problem,decision}.md` and `bugs/<slug>/assessment.md` (`extensions/assess/commands/*.md:7`; `extensions/bug/commands/speckit.bug.assess.md:164`).
- The agent context file is touched only when the `agent-context` extension is installed (`extensions/agent-context/README.md:7, 13`).

## 2. Creation

- **Triggers.**
  - Every `/speckit.specify` run makes one new feature directory and spec: "You must only create one feature per … invocation" (`templates/commands/specify.md`, step 3).
  - `/plan` always writes research, data-model and quickstart. It writes contracts only "if project has external interfaces" and skips them "if project is purely internal" (`templates/commands/plan.md:146-150`). That is the only conditional file in the core flow.
  - Scripts copy templates but never overwrite: "Plan already exists … skipping template copy" (`scripts/bash/setup-plan.sh:38-43`, tested by `tests/test_setup_plan_no_overwrite.py`).
- **Who writes.** The agent writes, following command prompts that fill templates. The CLI and scripts only scaffold paths and copy templates. Humans review at two gates in the bundled workflow, "Review the generated spec before planning" and "Review the plan…" (`workflows/speckit/workflow.yml`).
- **Friction inside a document** (bounded authoring):
  - At most 3 `[NEEDS CLARIFICATION]` markers, and only when "no reasonable default exists". The prompt lists defaults not to ask about (`templates/commands/specify.md:293-305`).
  - `/clarify` asks at most 5 questions, with answers of 5 words or fewer. It must "replace that statement instead of duplicating; leave no obsolete contradictory text" (`templates/commands/clarify.md:129-138, 195`).
  - `/analyze` reports at most 50 findings (`templates/commands/analyze.md`, section 4).
  - "When a section doesn't apply, remove it entirely (don't leave as 'N/A')" (`templates/commands/specify.md:287-291`).
  - `plan-template.md:108` has a "Fill ONLY if Constitution Check has violations" table.
  - `quickstart.md` must "use links or references to contracts and data model details instead of duplicating them" (`templates/commands/plan.md:155`).
- **Friction against creating documents: almost none.**
  - `/checklist` must "Never delete or replace existing checklist content — always preserve and append" (`templates/commands/checklist.md:147`). Cleanup is left to a single sentence: "clean up obsolete checklists when done" (`:272`).
  - The brownfield guide is the one place that pushes back on writing docs: "Do not invent standards merely to fill the constitution template… unrealistic rules create noise" and "Do not make 'document the entire existing system' your first feature" (`docs/guides/existing-projects.md:51-53, 59-60`).
- **Self-docs.**
  - CONTRIBUTING asks that large changes be agreed first (`CONTRIBUTING.md:35-36`).
  - It also asks contributors to "Update documentation (`README.md`, `spec-driven.md`)" (`CONTRIBUTING.md:53`; constitution `:187-188`), but nothing enforces this. The PR template has no docs checkbox (`.github/PULL_REQUEST_TEMPLATE.md`).

## 3. Length and density

| Artifact | Lines | Words | Notes |
|---|---|---|---|
| Core command prompts (10) | 106–379, median ≈238 | 1,120–2,993, median ≈1,680 | 2,446 lines / 18.7k words total |
| Hook boilerplate share per prompt | 67–78 lines | — | 18% (`checklist`) to 63% (`taskstoissues`); 41% of `plan.md` |
| `lean` preset prompts (5) | 19–33 | 58–193 | same pipeline, no templates |
| `spec-template.md` | 131 | 629 | 3 sample stories, sample FRs/SCs |
| `plan-template.md` | 113 | 463 | 3 alternative sample source trees to delete |
| `tasks-template.md` | 252 | 1,388 | "SAMPLE TASKS … DO NOT keep" (`:28-46`) |
| `constitution-template.md` | 50 | 272 | placeholders plus example comments |
| Project's own constitution | 214 | 1,743 | 41 MUST lines; read by all 10 core commands |
| `agent-context` managed block | ~4 | ~25 | pointer only |
| `AGENTS.md` / `DEVELOPMENT.md` | 58 / 24 | 355 / 221 | router / index tables |
| `design/*.md` | 64–370 | 479–1,808 | rules, decision guide, anti-patterns, review checklist |

- **Density.**
  - Templates carry a lot of illustrative placeholder material that the agent must delete: `tasks-template.md` is mostly a worked example.
  - Command prompts mix procedure with long rule lists. `specify.md` has a full inline checklist and good/bad example lists.
  - `/analyze` and `/converge` tell the agent to load only named sections ("Load only the minimal necessary context from each artifact", `templates/commands/analyze.md`, step 2; `converge.md:105-131`). The other commands read whole files "IF EXISTS" (`templates/commands/implement.md:91-97`).
- **Audience.**
  - Specs are for humans: "Written for business stakeholders, not developers" (`templates/commands/specify.md:280-285`).
  - Templates are for agents: HTML-comment instructions such as `ACTION REQUIRED` (`templates/spec-template.md:73-76`).
  - CI states the split in so many words. Commands, skills, prompts and `AGENTS.md` "are inputs to coding agents rather than prose, and are deliberately left unlinted" (`.github/workflows/lint.yml:53-57`). Only the human docs are linted.
- **Self-diagnosis.** `docs/concepts/complex-features.md:1-12` puts `/implement` degradation down to "context window exhaustion". Its fixes are to scope runs, use sub-agents, or split the spec. It never considers shrinking the artifacts.

## 4. Sync with source of truth

- **Between artifacts.**
  - `/analyze` is read-only. It checks spec, plan and tasks for coverage, terminology drift and constitution conflicts, and edits nothing (`templates/commands/analyze.md:55-58`).
  - `/converge` compares the code against spec, plan and tasks. Its only write is appending a `## Phase N: Convergence` of new tasks. It "MUST NOT modify `spec.md` or `plan.md`" and "is **not** a diff tool" (`templates/commands/converge.md:60-83`).
  - So both checks treat the documents as the authority and the code as the thing that must catch up. Nothing ever updates a spec from the code.
- **Constitution.** Every command reads it at runtime; it is not copied (`docs/upgrade.md:221-225`). That is the one real single-source-of-truth mechanism, and it works because nothing is copied. `/constitution` writes a "Sync Impact Report" HTML comment. The prompt says to remove it before commit (`templates/commands/constitution.md`, step 4, pinned by `tests/test_constitution_template_sync_report.py`), yet Spec Kit's own committed constitution still has one (`.specify/memory/constitution.md:1-31`), and that report points to `.specify/templates/…` and `.github/agents/…`, neither of which is in the repo.
- **Doc-vs-code checks in CI** (the complete list found):
  - The reference-doc YAML must equal the shipped workflow. The test's docstring says it "had drifted on four points … exactly the sort of thing nothing else would catch" (`tests/workflows/test_bundled_speckit_workflow.py:45-60`).
  - Issue-template dropdowns must match `AGENT_CONFIG` (`tests/test_agent_config_consistency.py:121-170`).
  - Bash, PowerShell and Python script parity (`tests/test_*_python_parity.py`, `tests/extensions/test_update_agent_context_python_parity.py`).
  - Prompt regression tests read command templates as text, because "the behaviour lives in the prompt, so the prompt is what must be checked" (`tests/test_command_template_hooks.py:1-15`).
  - markdownlint, plus a guard that each lint glob still matches files (`.github/workflows/lint.yml:58-90`).
- **Community tables.** An agentic workflow edits the catalog JSON and the matching docs table in the same PR (`.github/skills/add-community-extension/SKILL.md:109-144`; `.github/workflows/add-community-extension.md:52-54`). Currently both hold 175 entries, but no test compares them.
- **No check at all** covers `spec-driven.md`, `docs/reference/*` (apart from the one YAML block), `design/*`, the RFC or the constitution.
  - The constitution's rule "User-facing command groups MUST be documented under `docs/reference/`" (`.specify/memory/constitution.md:120`) is unenforced.
  - Concrete drift found: see the Summary. `extensions/RFC-EXTENSION-SYSTEM.md` ("Status: Implemented", "Updated: 2026-03-11") lists subcommands at `:1080` but not `set-priority`, which exists (`src/specify_cli/extensions/command_set_priority.py`). Treat this as a spot check only.
- **Expiry and archival.**
  - Nothing is archived or expired in the core. `docs/concepts/spec-persistence.md` sets out three models: flow-back (reconcile by hand), flow-forward (immutable feature directories, with the warning "Related decisions can be spread across multiple feature directories", `:62-64`) and living spec (regenerate what derives from the spec, at the risk of "losing useful implementation rationale", `:83-84`).
  - Then: "The model is a team convention, not a CLI setting" (`:88`). **Per-feature specs are never merged into a standing picture of the system.** They pile up, get edited in place, or get regenerated.
  - `spec-driven.md:160` still claims "Specifications stay in sync with code because they generate it". No mechanism for that exists in the repo.

## 5. Agent-facing files

- **Project `AGENTS.md` (58 lines).**
  - A 3-paragraph "About" section, then five sections of the form "Before adding or changing X, read [design doc / CONTRIBUTING anchor]" (`AGENTS.md:11-51`), then a single "Common Pitfalls" bullet (`:53-58`).
  - It links deep anchors instead of restating rules, e.g. `CONTRIBUTING.md#branch-naming` (`:39-45`).
  - It deliberately leaves out any integration or agent inventory. That inventory used to live there and drifted (`CHANGELOG.md:1898, 1817`); it now sits in `design/integration.md`, which in turn points at code (`INTEGRATION_REGISTRY`).
  - It never mentions the constitution. `CONTRIBUTING.md:184` cites a stale path for it, `memory/constitution.md`.
- **`design/cli.md` is a navigation guide that makes itself partly unnecessary.**
  - Its goals include "Small working context" and "coding agents should be able to infer the relevant files from the CLI surface without broad repository searches" (`design/cli.md:17-28`).
  - It points to a live example instead of describing one: "`src/specify_cli/extensions/` is the reference implementation" (`:7`).
  - It ends with a decision table, anti-patterns and a review checklist (`:327-370`).
- **The managed block in users' agent files.**
  - It lives between `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->`, with configurable markers (`extensions/agent-context/agent-context-config.yml:22-24`).
  - It covers one or several context files, with per-agent defaults (`agent-context-defaults.json`).
  - Everything outside the markers is left untouched. Paths are validated to stay inside the project. `.mdc` files get `alwaysApply: true` (`update_agent_context.py:112-138, 216-256, 259-295`).
  - The content is 3 fixed lines plus the plan path, which comes from `.specify/feature.json` or else the most recently modified `specs/**/plan.md` (`:141-213`).
  - It runs on the optional `after_specify` and `after_plan` hooks (`extensions/agent-context/extension.yml:21-29`) and is heavily tested (`tests/extensions/test_update_agent_context_*.py`, about 30 tests).
  - The block points only at the *current* feature's plan. It carries no project-level knowledge.
- **Command prompts.**
  - Hand-off chaining sits in the frontmatter (`handoffs:` in `templates/commands/plan.md:3-10`), as do script bindings (`scripts:`).
  - Conditional loading is marked "IF EXISTS". Scripts compute an `AVAILABLE_DOCS` list so a prompt knows which optional docs exist before it loads anything (`scripts/bash/check-prerequisites.sh:169-180`).
  - The hook block is repeated in full in every prompt instead of living in one shared reference.
- **Repo-internal skills.** `.github/skills/code-review/SKILL.md` is an 11-line model of brevity: three review rules.

## 6. Hard-to-learn-from-code knowledge

- **Invariants.**
  - The user-facing mechanism is the constitution: MUST/SHOULD principles, a "Rationale" per principle, SemVer versioning, and ratification and amendment dates (`templates/constitution-template.md`; `templates/commands/constitution.md`, steps 2–6).
  - `/analyze` and `/converge` treat conflicts with a MUST as CRITICAL (`analyze.md:59`; `converge.md:85-88`).
  - Spec Kit's own constitution says it was "derived from the patterns the codebase already enforces" and that "the existing codebase patterns it codifies remain authoritative references" (`.specify/memory/constitution.md:38, 196-197`). So a document restating the code was generated, went stale within about 3 months, and the code was declared the winner.
- **Decisions.**
  - Per feature only. `research.md` records "Decision / Rationale / Alternatives considered" (`templates/commands/plan.md:130-133`). The plan's Complexity Tracking table has a "Simpler Alternative Rejected Because" column (`templates/plan-template.md:106-113`). `/assess` writes `decision.md` with go/kill (`extensions/assess/commands/speckit.assess.decide.md:40`).
  - None of these is ever promoted to a project-level record. ADRs exist only as a community extension (adrkit, `docs/community/extensions.md:28`).
- **Project rationale** is spread across prose:
  - "Why" sections in `docs/upgrade.md:219-231`;
  - "Why an extension?" in `extensions/agent-context/README.md:9-16`;
  - the "Caveats" in `presets/constitution-sync/README.md`;
  - regression-test docstrings, which may be the most reliable record of rationale because they fail if the prompt loses it (`tests/test_tasks_template_constraints.py:1-8`).
- **Navigation** knowledge lives in `design/*.md` behind conditional pointers in `AGENTS.md`, and in `DEVELOPMENT.md`'s directory table.

## 7. Work records

- **Per feature**, a numbered or timestamped `specs/<prefix>-<slug>/` directory (`templates/commands/specify.md`, step 3). The branch name is kept independent of the directory. Tasks are checked off in place.
- **Mid-flight changes.** `/clarify` adds dated `### Session YYYY-MM-DD` bullets under `## Clarifications` (`clarify.md:184-196`). `/converge` adds numbered convergence phases and never renumbers (`converge.md:204-226`).
- **Large efforts** use an optional hand-written `roadmap.md` or `ROADMAP.md`, linked both ways by plain text. There is no tooling: "the roadmap is a living document… source of truth for how the epic is divided" (`docs/concepts/spec-of-specs.md:45-50, 91-125`).
- **The project's own records.** The changelog is generated from commits. `docs/history.md` tells the project's story by milestone and ends with "Enduring themes" (`:165-179`). Monthly newsletters exist too. Dogfooded `specs/` are never committed (`CONTRIBUTING.md:170-175`).
- **Feedback into standing docs: none.** No command turns a finished feature into README, docs or constitution updates. The only sign is a generic polish task, "Documentation updates in docs/" (`templates/tasks-template.md:154`).

## 8. Ideas to borrow and anti-patterns

**Borrow**

1. **Keep a pointer in the agent file, never a digest.** Use one small marker-delimited block that names where the deeper material is (`extensions/agent-context/scripts/python/update_agent_context.py:204-213, 259-295`). It keeps `AGENTS.md` lean (complaint 2). It cannot drift, because it holds no facts, only a path (complaint 3). It fits the leaning direction directly. Refinement: Spec Kit's block points at a per-feature plan. Antmay would point at project-layer docs only when they exist, which is closer to the stated aim.
2. **Resolve at runtime; don't propagate.** Templates hold `[Gates determined based on constitution file]` and each command reads the source live (`docs/upgrade.md:221-239`). Their stated reason is duplication causing drift (complaint 3). For Antmay, this argues against copying decision or description content into specs or `AGENTS.md`. Cite a path instead.
3. **Make `AGENTS.md` a router of "before X, read Y" lines** (`AGENTS.md:11-51`). Only the relevant deep doc gets loaded (complaint 2). Having no inventory removes a known drift source (complaint 3; `CHANGELOG.md:1898`). This supports the leaning direction, and gives a concrete shape for the "point only when needed" pointer.
4. **Let navigation docs make the code self-describing** (`design/cli.md:7, 17-28`). The doc sets a naming convention and names a reference implementation, so later readers need the doc less. This is a good test case for "hard to find in the codebase": it justifies itself by shrinking future navigation cost.
5. **Put hard caps on authoring** (3 markers, 5 questions, 50 findings), plus "remove a section that doesn't apply" and "replace, don't duplicate" (`specify.md`; `clarify.md:129-138, 195`; `analyze.md`). These bound length (complaint 2). Antmay could carry the same idea to the question of whether a document exists at all, which Spec Kit never does.
6. **Test drift where a doc copies code.** Compare parsed content, not text (`tests/workflows/test_bundled_speckit_workflow.py:45-60`). This addresses complaint 3 cheaply, for the few places where a doc must reproduce code. It argues for keeping such copies rare enough that each can have a test.
7. **Write prompt regression tests** that pin load-bearing phrases in skill text (`tests/test_tasks_template_constraints.py`; `tests/test_constitution_template_sync_report.py`). This fits Antmay's own repository, where the skills are the source of truth, and adds a mechanical check where Antmay has only lint (complaint 3).
8. **Pass an `AVAILABLE_DOCS` list and load "IF EXISTS"** (`scripts/bash/check-prerequisites.sh:169-180`; `implement.md:91-97`). Scripts tell the agent which optional docs exist before it opens any. This is lazy loading that matches "only when those exist" (complaint 2).
9. **Keep the brownfield advice** (`docs/guides/existing-projects.md:51-53, 59-60, 70-72`): don't invent standards to fill a template; don't document the whole system as a first step; "the codebase remains implementation context". This is direct wording support for the leaning direction.

**Anti-patterns**

1. **Every feature always produces the full artifact set** (`plan.md:66-72`), and checklists are append-only (`checklist.md:147`). Creating files is too easy (complaint 1). The only gate is "skip contracts if purely internal".
2. **Per-feature decisions are never promoted or retired** (`plan.md:130-133`; `spec-persistence.md:62-64, 88`). Rationale gets scattered across feature directories and no standing picture ever emerges (complaints 1 and 3). The community extension count (`docs/community/extensions.md`: Archive, Reconcile, Spec Sync, Blueprint Index, DocGuard, MemoryLint) shows the demand. Antmay's `close-thread` landing step is already a better answer. Spec Kit is evidence that leaving it to "team convention" doesn't work.
3. **A constitution derived from the code** (`.specify/memory/constitution.md:38, 196-197`). It restates what the code already shows, runs 214 lines, loads on every command, and was stale within months (`:50, 56`). This worsens complaints 2 and 3, and it is the clearest real case for "don't write down what the code makes clear".
4. **Boilerplate copied into every prompt** (67–78 lines per command; `tests/test_command_template_hooks.py` pins it everywhere). Agent context fills with material the agent may not need (complaint 2), and the tests make shrinking it costly. Compare the `lean` preset (`presets/lean/commands/*.md`).
5. **Templates full of sample content the agent must delete** (`tasks-template.md:28-46`; `plan-template.md:59-101`). These are long inputs for a shorter output (complaint 2).
6. **Philosophy and reference prose quoting mechanisms that have since changed** (`spec-driven.md:206-260`; `docs/reference/agentic-sdd.md:40`), backed by an "update docs" rule with no enforcement (`CONTRIBUTING.md:53`). This is complaint 3 in its plainest form: descriptive prose about the product's own mechanics drifts first.
7. **Scratch material committed as governance.** The Sync Impact Report is meant to be removed before commit, yet sits at the top of their own constitution (`.specify/memory/constitution.md:1-31`), pointing to files that don't exist (complaint 3).

## Evidence gaps

- **No git history.** I could not measure how quickly docs drift, how often specs get revised, or when `AGENTS.md` changed. Changelog titles are the only proxy. The content of the older `update-agent-context` script ("Active Technologies/Recent Changes") is known here only from `CHANGELOG.md:2370`. Any detail beyond those section names is my inference.
- **No real user-project feature directory in the clone.** The project's own `specs/` are gitignored, so I could only measure generated specs and plans through their templates, not actual outputs.
- **I did not run the CLI** (per the constraints). What `specify init` installs is inferred from `src/specify_cli/shared_infra.py` and the docs, not observed.
- **Community extensions were not inspected**; they are external repositories. Their claims (drift validation, archival) come only from the catalog one-liners.
- **The RFC and the `docs/reference/*` pages were only spot-checked** for drift, not audited, so the drift count in §4 is a lower bound.
