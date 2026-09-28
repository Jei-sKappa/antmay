# bmad-code-org/BMAD-METHOD — documentation research

Clone state: `skills/bmod-method/bmod.toml:4` declares `version = "6.13.0-next"`, which is after the v6.12.0 entry at the top of `CHANGELOG.md` (2026-09-03). Paths below are relative to the clone root.

## Summary

- **BMAD tried generating standing docs, then removed that approach on purpose.** In v6.11 it retired `bmad-document-project` (overview, source-tree and per-area deep-dive pages), `bmad-generate-project-context` (`project-context.md`), `bmad-shard-doc`, `bmad-index-docs` and the tech-writer agent. It replaced them with one skill, `bmad-project-context`, which writes "one small verified block" inside `AGENTS.md` (`CHANGELOG.md:28,40,91`; `removals.txt:73-82`). Its own summary is "The old skills wrote more documentation. This skill keeps less, and checks it." (`docs/existing-codebases/theory-of-project-context.md:166`). This is the strongest outside evidence so far for Antmay's leaning direction.
- **The admission test is sharper than "hard to tell or find from the code".** It reads: "Not *could an agent derive this* but *what does it cost when it doesn't*". It weighs how much exploration a fact takes, whether the agent will search in time or guess, whether the fact shows up before the mistake or only after it, and how bad a miss is: "a wasted search, or corrupt data" (`skills/bmad-project-context/references/best-practices.md:5-9`). A derivable fact can still earn a line.
- **Pointers must name a trigger the agent can observe.** "An index the agent must choose to fetch gets skipped; one already in context does not." A pointer out of the block names "a path, a file type, a named task — never one it must judge" (`best-practices.md:49-55`; `theory-of-project-context.md:59-68`, which cites a 56% never-invoked rate for an unaided skill). This cuts against any design where the agent itself decides whether to consult a standing doc, such as Antmay's model-invoked `consult-*` skills.
- **BMAD separates two kinds of context into two artifacts.** Implementation context is tiny, lives in the code repo, is checked against the code and loaded every session. Planning context (rationale, rejected approaches, domain meaning) belongs to an initiative and is "consulted in bursts". "One artifact cannot serve both" (`theory-of-project-context.md:123-138`). Planning artifacts live in `_bmad-output`, which can be its own git repo (`skills/bmod-method/help/monorepo-and-polyrepo.md:14-15`).
- **Deleting and shrinking are formalised, and the block may only shrink on audit.** Every existing line goes through a ledger (`retain | rewrite | relocate | automate | delete`). Deletion needs one of four named grounds, and audit "ends smaller or equal" (`best-practices.md:71-84`; `skills/bmad-project-context/SKILL.md:39,111-115`). "Prefer a check over a line; a check that lands deletes its line" (`best-practices.md:63`). A pitfall is admitted only from an observed mistake (`SKILL.md:105-109`).
- **Keeping the block in sync is left to the agent, not to CI.** Each block carries a provenance line with a date and a commit SHA. Refresh runs `git log --diff-filter=DR --name-only` from that SHA against every line (`SKILL.md:72,89`; `references/template.md:18,55`). Nothing mechanical checks user-project docs against code.
- **BMAD's own docs show exactly the drift Antmay worries about, even with deterministic checks in place.**
  - The AI-review rule "docs-follow-source" is scoped to `src/**`, a directory that no longer exists (`.coderabbit.yaml:76-81`, `greptile.json`).
  - The translations still describe the retired `project-context.md` model (`docs/cs/explanation/project-context.md:23-30`).
  - `docs-site/README.md` describes a Diataxis folder tree that the English docs no longer use.
  - One validator states it outright: "every locale in this repo ended up stranded on the pre-restructure tree without anyone noticing" (`docs-site/scripts/validate-locale-coverage.mjs:8-9`).
- **Plans have a hard length budget.** A build plan targets 900–1600 tokens, and going over 1600 prompts a split, with a user override (`skills/bmad-build/workflow.md:23-31`, `step-02-plan.md:35-42`). A PRD's "length scales with stakes": about two pages for a hobby project, with overflow pushed to `addendum.md` (`skills/bmad-prd/SKILL.md:71`). The architecture spine records "decisions, not rationale". Its stack, tree and data shape are "seed … owned by the code once it exists" (`skills/bmad-architecture/SKILL.md:9,17`).
- **BMAD does not generate ADRs.** Help text recommends "small numbered decision records (ADRs)… only for what is needed", with `AGENTS.md` making agents "aware the records exist and when to consult them, without copying their content" (`skills/bmod-method/help/preparing-a-repo-for-agents.md:16-23`). A dedicated "documentation skill for codebases is planned" (`:18`; `CHANGELOG.md:40`).

## 1. Inventory

**(a) Docs about BMAD itself**

```
AGENTS.md (32 lines)   CLAUDE.md ("@AGENTS.md")   README.md (+ CN/KR/VN)
CONTRIBUTING.md  CHANGELOG.md (2,299 lines)  removals.txt  SECURITY.md  TRADEMARK.md
docs/                193 .md in total
  index.md 404.md _STYLE_GUIDE.md
  start/ (3)  plan/ (8)  build/ (6)  existing-codebases/ (4)  customize/ (5)  reference/ (1)
  cs/ (26)  fr/ (32)  ko-kr/ (39)  vi-vn/ (31)  zh-cn/ (35)
      locales mostly still on the old tutorials/how-to/explanation/reference tree
docs-site/           Astro + Starlight; 8 build/validator scripts, 5 tests,
                     locale-coverage-baseline.json, javascript-conventions.md (5 lines)
tools/               skill-validator.md (339-line LLM rule catalog), release.md,
                     validate_{skills,file_refs,manifests}.py, quality.py, tests/
skills/*/help/       bmod-method/help (16 topics), bmod-core-tools/help (6 topics):
                     agent-facing "knowledge" read by the `bmad` help skill
```

The repository has 30 English pages. It has no ADRs, no architecture description and no glossary file. A search for `*adr*` and `*decision*` finds only `docs/plan/research-a-decision.md`, which is a user how-to.

**(b) Docs the method writes into a user's project**

| Artifact | Path (defaults) | Writer |
|---|---|---|
| Agent-instruction block | `AGENTS.md` between `<!-- bmad:context -->` markers | `bmad-project-context` |
| Spec kernel + companions + log | `{output_folder}/specs/spec-{slug}/SPEC.md`, `*.md`, `.memlog.md` | `bmad-spec` (`skills/bmad-spec/SKILL.md:34-52`) |
| PRD + addendum + log | `{planning_artifacts}/prds/prd-{project}-{date}/prd.md` | `bmad-prd` (`skills/bmod-method/help/planning-skills.md:16`) |
| Architecture spine + log + reviews | `{planning_artifacts}/architecture/…/ARCHITECTURE-SPINE.md` | `bmad-architecture` (`planning-skills.md:32`) |
| UX | `DESIGN.md`, `EXPERIENCE.md` under `{planning_artifacts}/ux-designs/…` | `bmad-ux` |
| Ticket tree, plans, retros | `{tickets.root}/{initiative}/…/tickets.toml`, `<type>-<slug>-plan.md`, `epic-<slug>-retrospective.md`, `deferred-work.md` | ticketing, build, retrospective (`skills/bmad-preview-ticketing/references/tree-rules.md`) |

Before v6.11 the method also wrote a documentation tree and `project-context.md`. The v6 `persistent_facts` setting auto-loaded that file into every workflow (`CHANGELOG.md:11,246`). Today every `customize.toml` ships `persistent_facts = []`. For example, `skills/bmad-project-context/customize.toml:14-16` notes: "Deliberately empty: this skill's own output (AGENTS.md) is loaded by the harness".

## 2. Creation

**Layer (a), BMAD's own docs.** Humans write them through PRs, and the PR template asks only What/Why/How/Testing (`.github/PULL_REQUEST_TEMPLATE.md`). The style guide limits the shape of a page, but nothing limits whether a page may exist:
- 8–12 `##` headings per page;
- table cells of 1–2 sentences;
- no "Related"/"Next" sections (`docs/_STYLE_GUIDE.md:20-32`).

The only "don't add" rule is aimed at prompts, not docs: "do not add instructions for exotic cases" (`AGENTS.md:17-21`). A `docs:` commit type exists (`CONTRIBUTING.md:133`).

**Layer (b), user projects.** Creating a doc is behind high friction on purpose:
- **`bmad-project-context` only runs when asked for by name.** "It fires only when you name it — no routing on inferred intent" (`CHANGELOG.md:51`). The skill description ends "Use when invoked by name" (`skills/bmad-project-context/SKILL.md:3`).
- **No writes before step 5, and the user approves each write.** "No writes until step 5!" (`SKILL.md:33`). The user sees the whole block and the settled ledger first. Deletions that rest on no evidence need approval line by line (`SKILL.md:72`).
- **Scan findings alone cannot create a line.** "A surprising scan finding is a question to ask, not a line to write" (`best-practices.md:16`). A single occurrence of a mistake "is noted"; only a recurring or costly mistake earns a line (`SKILL.md:109`).
- **Nested files have a high bar.** A child `AGENTS.md` is allowed only when all of these hold:
  - its rules are subtree-exclusive and substantial ("a handful of rules is not a file");
  - the split materially shrinks the parent;
  - loading is verified for every harness in use;
  - the user approves.

  Otherwise the rules stay at the root as path-qualified lines (`SKILL.md:117-125`).
- **An architecture spine must earn its existence.** A step asks up front, mandatorily, for the "purpose and audience rather than a document type", because "'An architecture doc' balloons into bloat" (`skills/bmad-architecture/SKILL.md:62`). The spine's inclusion test: "could [two units] choose incompatibly? … **and** the call is non-obvious, **and** it's a real trade-off" (`:13`).
- **The path starts from build, not from docs.** On an existing codebase BMAD wants "no up-front documentation pass". `bmad-build` "investigates the repository on every run" (`skills/bmod-method/help/existing-codebase.md:3`). Obvious edits get "No skill" (`skills/bmod-method/help/help.md` "Start here").
- **Review cannot edit agent files.** Build and code-review triage move to **defer** any finding "whose fix edits agent-context files (CLAUDE.md, AGENTS.md, rules, etc)" (`skills/bmad-build/step-04-review.md:82`; `skills/bmad-code-review/step-03-triage.md:40`). Agents cannot grow the instruction file as a side effect of review.

## 3. Length and density

| Set | n | Words: min / median / max | Lines: median / max |
|---|---|---|---|
| English `docs/**/*.md` (not locales) | 30 | 22 / 1,188 / 2,250 | 147 / 416 |
| `skills/*/SKILL.md` | 30 | 61 / 885 / 2,271 (`bmad-spec`) | 75 / 302 |
| All `.md` under `skills/` | 180 | 51 / 582 / 3,025 | – |
| `skills/*/help/*.md` knowledge topics | 22 | 127 / 564 / 3,025 (`bmod-method/help/help.md`) | – |
| Root `AGENTS.md` | 1 | 234 words | 32 |
| Worked-example AGENTS block (`references/template.md:16-53`) | 1 | 218 words | 38 |

- **The docs site is aimed at humans.** It uses Diataxis-style narrative: tutorials with shell sessions, admonitions and Starlight frontmatter. Several pages are argument essays, for example `theory-of-project-context.md` (1,415 words), which cites research results.
- **Agent-facing files are dense and imperative.** The help topics are short (`artifact-lifetime.md` is 9 lines). Each opens with a "Use this when…" trigger (`help/project-context.md:3`, `help/preparing-a-repo-for-agents.md:3`).
- **The block template bans prose.** "Terse imperative lines… No prose beyond Orientation… A bare fact appears only as the justification clause of an instruction… At most two emphasis markers" (`references/template.md:12`).
- **Density and size are enforced for artifacts:**
  - plan budget of 900–1600 tokens, with `<!-- Target: 900–1300 tokens… Above 1600 = high risk of context rot -->` (`skills/bmad-build/plan-template.md:16`);
  - review log entries "up to 150 tokens per entry" (`skills/bmad-walkthrough/templates/log-template.md:26`);
  - Spec Law rule 8, "Lean prose. Every sentence carries load-bearing content" (`skills/bmad-spec/SKILL.md:115`);
  - the `bmad-review` structure lens tags every finding CUT/MERGE/MOVE/CONDENSE/QUESTION/PRESERVE with word impact taken from a deterministic `scripts/word_metrics.py` (`skills/bmad-review/references/lens-structure.md:5-7`).
- **Templates are long but meant to shrink.** Guidance lives in HTML comments that must be stripped, and empty sections are deleted rather than filled with "N/A" (`plan-template.md:42-43,95`; `spine-template.md:18`). For example the spine template is 709 words and the PRD template 1,510, but the finished artifacts should be far smaller.
- **SKILL.md length is limited only in its description.** Descriptions max out at 1,024 characters (`tools/validate_skills.py:393`). The body length is governed by a norm, not a check: "Length and ambiguity are paid on every run; a corner case is paid only when it occurs" (`AGENTS.md:17-21`).

## 4. Sync with source of truth

**Layer (a), mechanical checks that do exist** (pre-commit plus `.github/workflows/quality.yaml`, mirrored by `tools/quality.py`):
- `tools/validate_file_refs.py --strict`: path references inside skills resolve, and no absolute paths leak. Bare filenames and templates are deliberately not checked (`:19-23`).
- `tools/validate_skills.py --strict`: frontmatter and structure rules from `tools/skill-validator.md`.
- `tools/validate_manifests.py`, `topic_problems` (`:253-282`): a help topic that `help.md` never names fails ("is never read"), and so does a pointer to a missing topic. This is a reachability check on progressive disclosure.
- Docs-site build: link validation, sidebar order, redirects.
- `docs-site/scripts/validate-published-implementation-model.mjs`: a **forbidden-terms guard**. The built site fails if it contains retired names (`Quick Dev`, `create-story`, their translations…) (`:4-17`).
- `docs-site/scripts/validate-locale-coverage.mjs`: a **ratchet baseline**. Known gaps in `locale-coverage-baseline.json` are tolerated. The build fails if a new gap appears *or* if a baseline entry goes stale, "what stops the baseline from quietly outliving the problem it records" (`:16-26`).

**Layer (a), checks that don't exist or don't work:**
- No check compares doc content with skill behavior. This is policy: "Do not write automated tests for LLM output or for static source text" (`AGENTS.md:25-27`).
- "Docs follow source" is delegated to AI reviewers (`.coderabbit.yaml:76-81`; `greptile.json` rule `docs-follow-source`). Both are scoped to `src/**`, and there is no `src/` in the tree (skills live in `skills/`), so the rule cannot fire. The Greptile skill-validator scope `src/bmm-skills/**` is equally dead.

  *Inference:* the rule has been dead since the tree moved. `CHANGELOG.md` v6.11 still refers to `src/` call sites.
- Drift that is visible in the tree:
  - `docs-site/README.md:9-21` shows a `tutorials/how-to/explanation` layout that the English docs no longer have.
  - `docs/_STYLE_GUIDE.md:3,6` still claims a Diataxis structure and cites `document-project.md` as an example (`:267`).
  - The locale pages teach the retired auto-loaded `project-context.md` (`docs/cs/explanation/project-context.md:23-30`). 47 locale files still name the retired skills.
  - `skills/bmad-correct-course/SKILL.md:68-89` still discovers "sharded" PRD/architecture folders, although `bmad-shard-doc` was removed.

**Layer (b), user projects** (all run by the agent, none in CI):
- **Refresh:** the provenance line `Verified <date> against <sha>`. Then re-verify every path and caveat and diff deletions and renames since the SHA against every line (`bmad-project-context/SKILL.md:89`). A claim whose source disappears is "fixed or removed, never silently pointed at a different document that still mentions it" (`theory-of-project-context.md:146-148`).
- **Audit:** "ask of every line whether removing it would change agent behavior"; the block ends smaller or equal (`SKILL.md:113-115`).
- **Automation replaces prose.** "For each candidate, ask first whether a hook, lint rule, or CI check enforces it better than prose". An `automate` entry keeps its line until the check is live, and then a later run deletes the line (`SKILL.md:70`).
- **Derived artifacts.** `SPEC.md` is "DERIVED from .memlog.md, never hand-edited", with `bmad-spec` as the "single writer" (`skills/bmad-spec/SKILL.md:48,56-58`). The spine is "distilled from the memlog at the end" (`bmad-architecture/SKILL.md:35`). This removes drift between the log and the artifact, not between docs and code.
- **Planning vs. code:**
  - The spine's "seed" sections are explicitly not kept in sync: "scaffold, not a mirror to maintain" (`spine-template.md:62`).
  - The retrospective runs a "spec-to-implementation reconciliation" at epic end. Each divergence is classified as defect, accepted deviation, or "a spec that should be reconciled to reality (propose…)" (`skills/bmad-retrospective/references/aggregate-views.md:13`). It only proposes; the retro "is the run's only write" (`workflow.md:101`).
  - A spec update searches the tickets that cite it and names the stale ones, but does not edit them (`bmad-spec/SKILL.md:137`).

## 5. Agent-facing files

- **BMAD's own `AGENTS.md`** (32 lines, 234 words). It contains commit convention, the exact pre-push command, a pre-commit install note, three pointers with observable triggers ("Read `tools/release.md` before cutting a release"; skill rules in `tools/skill-validator.md`; docs conventions in `docs/_STYLE_GUIDE.md`), a prompt-writing principle, a testing policy and a release summary. `CLAUDE.md` is only `@AGENTS.md`.

  It deliberately omits any repo tree, stack list or command list. It does **not** use BMAD's own `bmad:context` markers (`grep -c` = 0). *Inference:* this is not a product of the skill.
- **The block the method writes** has fixed sections: Orientation (3–4 sentences), Policy, Where things are, Running and verifying, Conventions that differ from defaults, Known pitfalls. Empty sections are omitted (`references/template.md:3-12`).
  - **Admitted:** policy the code can't express; config caveats; divergences from ecosystem defaults; observed pitfalls; cross-component rules ("a six-line map of who owns what"); required versions; entry points (`best-practices.md:11-22`).
  - **Excluded:** overviews, trees, stack lists, self-enforceable style rules, platitudes, transcribed command lists, pasted code, aspirational state, history (`best-practices.md:24-35`).
  - **Not cheap to delete either:** "'it is discoverable somewhere in the repository' is never, alone, grounds" for deleting a human-written line (`:82`).
- **How pointers work.** Load-bearing rules stay in the block. Links out must name an observable trigger, for example "Writing a migration? Read `docs/db-rules.md` first" (`template.md:33`). Nested `AGENTS.md` files are used only after verifying that each harness loads them: "several harnesses build the instruction chain once at session start… a nested file is invisible to the session that later edits into that subtree" (`best-practices.md:53`). Duplicates across loaded files are removed because they are "paid for twice" (`SKILL.md:95`).
- **Knowledge for the help skill uses a two-level index.** `help/help.md` is a routing document with a "Read when the user asks about" table (`skills/bmod-method/help/help.md:17-35`). `scripts/knowledge.py` lists topics "with their file path and never with their text" (`skills/bmad/scripts/knowledge.py:14-16`). The help skill "work[s] outward, and stop[s] at the first source that answers" (`skills/bmad/SKILL.md:44`).
- **Skills load their inputs just in time.** Build loads step files one at a time ("NEVER load multiple step files simultaneously", `bmad-build/workflow.md:63-82`). It lists `planning_artifacts` and loads "selectively" (`step-01-clarify-and-route.md:59-66`). Plans carry a `context:` list of project docs, annotated "Keep short — only what isn't already distilled into the plan body" (`plan-template.md:13`).
- **Reviewers read agent files as rules.** Review lenses "Read the agent instruction files (`AGENTS.md`, `CLAUDE.md`…) at the repository root and in the directories the diff touches; those are the rules" (`skills/bmad-build/customize.toml:113`). `help/review-choices.md:33` names a bloated `AGENTS.md` as a cause of slow reviews.

## 6. Hard-to-learn-from-code knowledge

- **Rationale is kept out of artifacts that get loaded.** The spine is "Record decisions, not rationale (rationale lives in the memlog)" (`bmad-architecture/SKILL.md:17,21`). Each `AD-n` carries only `Binds / Prevents / Rule` (`spine-template.md:36-40`). PRD "rejected-alternative rationale, options-considered matrices" go to `addendum.md` (`bmad-prd/SKILL.md:14`). The memlog holds "one-line gist, reason included" (`bmad-spec/SKILL.md:63`).
- **Invariants and seed are split explicitly.** An invariant is a call "a future builder *can't* read off compliant code". Seed is true at cold start and then owned by the code (`bmad-architecture/SKILL.md:9`). This is close to the leaning direction's test, applied per section.
- **Navigation is handled per change, not in a standing map.** The plan's `## Code Map` holds "Annotated paths [that] prevent blind codebase searching" (`plan-template.md:52-58`). Later plans in the same epic reuse earlier Code Maps as continuity context (`step-01-clarify-and-route.md:57`). For humans, `bmad-walkthrough` guides through code live instead of documenting it (`help/existing-codebase.md:10`). A standing navigation aid exists only as "Where things are" pointers and "cross-component rules" in the block.
- **Cross-cutting rules get promoted into the loaded layer.** "Seed project context from [the spine] so every later skill reads the same rules" (`docs/plan/design-ux-and-architecture.md:65-67`).
- **Pattern breaks go to specs, not to standing docs.** "If you want this change to break a pattern… write why in the spec so later sessions follow the new rule" (`docs/existing-codebases/start-in-an-existing-codebase.md:71-78`). *Inference:* this relies on later sessions finding that spec, and the retrieval research quoted above says they often won't.
- **BMAD's own rationale lives in code comments, the changelog and `removals.txt` comments,** not in ADRs. Examples: the docstring at `validate-locale-coverage.mjs:1-30`, the docstring at `lint_spine.py:5-21`, and the comment at `customize.toml:14-15`.

## 7. Work records

- **Records are keyed to tickets.** Each ticket gets one plan with frontmatter state (`status`, `baseline_revision`, `route`, `review`) and append-only sections: `Implementation Notes`, `Plan Change Log`, `Review Triage Log` (`plan-template.md:73-91`). Code review appends a dated `## Code Review` block. The retrospective writes `epic-<slug>-retrospective.md` with a machine-readable `verdict` (`tree-rules.md`, "Where review and retrospective write"). Split-off goals go to `deferred-work.md` (`step-02-plan.md:36-42`).
- **Plans stay live after the work ships.** "Joined plans are live ticket state, including after work is done… Deleting plans can turn completed entries back into planned work" (`help/artifact-lifetime.md:3-5`). Superseded planning docs "can be archived once their references and requirement sources remain accessible" (`:7`).
- **Agent reads are scoped to current work.** "Scope ordinary agent reads to the active initiative and current epic in `AGENTS.md`. Historical plans are evidence, not a replacement for the current code" (`:7`). The migration guide ends with running `bmad-project-context` "for a root `AGENTS.md` naming the active initiative" (`skills/bmod-method/v6-v7-migration.toml:157`).
- **Feedback into standing docs is weak and manual.**
  - Build writes no standing docs, and review defers edits to agent files.
  - The retrospective only proposes reconciliation.
  - The only path from a work record into `AGENTS.md` is a human invoking `record` or `refresh`. `record` takes "one observed agent mistake as it happens — the only admissible source for a pitfall" (`bmad-project-context/SKILL.md:105-109`).
- **The project's own change record** is `CHANGELOG.md` plus `removals.txt`. The changelog doubles as the design record for removals, e.g. "`bmad-document-project` generated repository documentation, which the evidence says not to do" (`docs/existing-codebases/set-and-maintain-project-context.md:156`).

## 8. Ideas to borrow and anti-patterns

**Worth borrowing**

1. **A cost-of-miss admission test** (`best-practices.md:5-9`).
   - **Addresses:** complaints 1 and 2.
   - **Bearing on the leaning direction:** it refines it. "Hard to find" becomes concrete: exploration cost, whether the fact arrives before or after the mistake, and how bad a miss is. It also admits some derivable facts ("A line that stops the same rediscovery every session earns its place, derivable or not").
2. **Observable-trigger pointers only** (`best-practices.md:51`; `theory-of-project-context.md:59-68`).
   - **Addresses:** complaint 2.
   - **Bearing:** supports "AGENTS.md lean, pointing out only when needed". It questions model-invoked `consult-*` skills as the main retrieval path. Anything that must hold goes in the loaded file, and pointers name a path or task.
3. **Named deletion grounds, a ledger, and audit that ends "smaller or equal"** (`best-practices.md:71-84`; `SKILL.md:39,115`).
   - **Addresses:** complaints 1 and 3, since stale lines get a defined way out.
   - **Bearing:** Antmay has no retire path for descriptions. Borrow the grounds: stale, mechanically enforced, contradictory, or user-approved.
4. **"Prefer a check over a line; a check that lands deletes its line"** (`best-practices.md:30,63`; `SKILL.md:70`).
   - **Addresses:** complaint 3, by moving the rule to where drift fails loudly.
   - **Bearing:** it fits `spec`'s routing table. A "rule for agents" could route to a lint or hook first and to AGENTS.md only as a fallback.
5. **A provenance line with a SHA, plus a rename/delete diff at refresh** (`template.md:18`; `SKILL.md:89`).
   - **Addresses:** complaint 3, cheaply. It gives `close-thread` or an audit skill a baseline to diff paths against.
6. **Seed vs. invariant** (`bmad-architecture/SKILL.md:9`; `spine-template.md:54,62`).
   - **Addresses:** complaints 2 and 3.
   - **Bearing:** it maps directly onto Antmay's "admitted only where the code does not make it obvious". Make the split explicit: anything structural is allowed only as cold-start scaffolding and expires once code exists.
7. **Ratchet baselines and forbidden-term guards** (`validate-locale-coverage.mjs:16-26`; `validate-published-implementation-model.mjs:4-17`).
   - **Addresses:** complaint 3.
   - **Bearing:** Antmay could keep a retired-terms list fed by glossary removals and fail its lint when a doc still uses one. This is a cheap, deterministic check that docs track the skills.
8. **Topic reachability check** (`validate_manifests.py:253-282`). This catches an unindexed doc (never read) and a dangling pointer.
   - **Addresses:** complaints 1 and 3.
   - **Bearing:** apply it to AGENTS.md pointers, so every standing doc is reachable from a trigger and every pointer resolves.
9. **Hard length budgets with a split gate on work artifacts** (`bmad-build/workflow.md:23-31`), and **stakes-scaled length with an overflow companion** (`bmad-prd/SKILL.md:71`).
   - **Addresses:** complaint 2 for thread artifacts.
10. **Two artifacts for two kinds of context** (`theory-of-project-context.md:123-138`).
    - **Bearing:** it argues that Antmay's ADR/PDR "why" material should live apart from the always-loaded layer and be read in bursts. It also asks whether decisions belong in the code repo at all.

**Anti-patterns and cautions**

1. **Generating documentation from a scan.** BMAD's own verdict: "Large, unverified, stale on arrival" (`theory-of-project-context.md:155-159`).
   - **Worsens:** complaints 1–3. It confirms the direction.
2. **Auto-loading one project-context file into every workflow** (v6 `persistent_facts`, reverted in `CHANGELOG.md:11`).
   - **Worsens:** complaint 2. Antmay's "every entry-point skill reads glossary + descriptions + decisions" input list resembles it.
3. **AI-review "docs follow source" rules with path scopes nobody re-checks** (`.coderabbit.yaml:76`, `greptile.json`). The rule went silently dead.
   - **Worsens:** complaint 3. Prose rules about sync decay the same way docs do.
4. **Translations kept alive but not maintained.** 163 locale pages largely teach a retired model.
   - **Worsens:** complaints 1 and 3. The baseline makes the problem visible but does not fix it.
5. **Planning docs as the home of pattern-break rationale** (`start-in-an-existing-codebase.md:71-78`). The why sits where later sessions may not look.
   - **Bearing:** it is the retrieval problem BMAD itself documents.
6. **A caution against over-applying the leaning direction:** BMAD forbids deleting human-written lines just because they are derivable (`best-practices.md:82`). A pure "the code already says it" filter, applied to existing docs, "is the reasoning that empties good files".

## Evidence gaps

- **The cited studies are unnamed.** `theory-of-project-context.md` has no citations, so the research claims (no gain and +20% cost; the 53/79/100% table; the 709-page wiki) cannot be checked from the clone.
- **No sample output exists.** No real user-project `AGENTS.md` block, spec, spine or retrospective is in the clone. The claims about output size come from templates and rules, not from measured artifacts.
- **Retired skill sources are missing.** They live in `v6-shims/`, which is not in this tree, so the old document-project output (size and structure) cannot be measured. Only the changelog describes it.
- **There is no git history** (shallow, single commit). When `src/` was moved, and how long the review rule and the locales have been stale, is inferred from the changelog.
- **Whether `bmad-project-context` blocks stay small in practice** (refresh/audit discipline) is not observable here. Nothing in CI enforces a size budget, and "Size" is qualitative with no line or token number (`best-practices.md:43-47`).
- **The planned replacement is not in the tree.** The "planning context" capability and the codebase-documentation skill are announced but absent (`theory-of-project-context.md:136`; `help/preparing-a-repo-for-agents.md:18`), so BMAD's intended home for rationale/ADRs is unknown.
