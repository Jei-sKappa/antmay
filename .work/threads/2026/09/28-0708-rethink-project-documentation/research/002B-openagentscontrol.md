# darrenhinde/OpenAgentsControl — documentation research

All paths are relative to the clone root. Counts come from `find`/`wc` on the single-commit shallow clone. `find -type f` skips the 4 symlinks, which are covered separately.

## Summary

- **The "context system" is a large, hand-written Markdown corpus behind navigation indexes.** `.opencode/context/` holds 296 `.md` files: 62,112 lines and about 193k words, roughly 250k tokens (estimated at 1.3 tokens per word). Of those, 75 are `navigation.md` index files that the read-only ContextScout agent walks top-down, returning paths ranked Critical/High/Medium (`.opencode/agent/subagents/core/contextscout.md:69-76`). The navigation layer is the one part that roughly keeps its own budget: median 108 words against a stated 200–300-token target.
- **Brevity rules are strict on paper and enforced nowhere in code.** The rules are MVI ("Minimal Viable Information"), per-type line caps of 80–150 lines marked `enforcement="strict"` (`.opencode/context/core/context-system/standards/mvi.md:118-125`), and a required frontmatter comment. No script or CI job parses the frontmatter or counts lines. 119 of 296 files exceed 150 lines, 41 exceed 400, and the largest is 4,616 lines.
- **The line caps produced splitting, not compression.** The old `design-iteration` workflow became 9 files totalling 1,151 lines. The splits broke 13 registry entries (`docs/maintenance/REGISTRY_FIXES_SUMMARY.md:9-26`) and left shims and symlinks behind, for example `core/workflows/task-delegation.md` and `core/standards/code.md -> code-quality.md`. File count went up; token cost did not come down. This worsens complaint 1 without fixing complaint 2.
- **Creation has almost no friction and defaults to "yes".**
  - Harvest pre-ticks extracted items for approval.
  - Project-intelligence rules say "Never Delete… archive instead".
  - Navigation stubs advertise "Planned Content" files that don't exist.
  - The user-facing wizard `/add-context` asks mostly for things the code already shows: tech stack, naming conventions, folder structure.
- **Sync with code is existence-level only, and partly switched off.** CI checks two things: registry paths exist, and Markdown links resolve. The link check excludes the repo's own 107-file maintainer context under "Temporary legacy exclusions (to keep CI green while docs are migrated)" (`scripts/validation/markdown-link-skip-patterns.txt:31-34`). Registry drift is reported but "does not block" (`.github/workflows/validate-registry.yml:61`). README drift is handled by opening a GitHub issue for an AI agent to fix. Drift is measurable everywhere I looked.
- **There is no `AGENTS.md` or `CLAUDE.md` in the repo, and the method never generates one for users.** The always-loaded layer is the agent prompt itself, or, in the Claude Code plugin, a SessionStart hook. The hook injects one skill plus a catalogue built from each skill's frontmatter `description:` line, and tells the agent to run context discovery once per session (`plugins/claude-code/hooks/session-start.sh:32-76`).
- **The project's own evals show agents skipping the doc-routing layer and reading the source.** OpenAgent answered "How does the registry system work?" by grepping and reading `registry.json` directly, never delegating to ContextScout (`evals/agents/CONTEXTSCOUT_TEST_FINDINGS.md:15-30`). This is direct evidence for the leaning direction: agents go to the code, so docs pay off only for what the code doesn't show.
- **Work records are ephemeral by design; the knowledge feedback step is optional.** Task JSON and session context live in gitignored `.tmp/` and are deleted after 24 h. Extracting knowledge back into standing docs ("harvest") is a separate command the user has to invoke. Meanwhile about 23k lines of planning dumps and several AI-style `*_SUMMARY.md` files are committed as standing docs.
- **Decisions have no working home in the repo itself.** A decisions-log template and an ADRManager subagent ship to users. The repo's own ADR index and `ctx validate` CLI exist only as a draft plan (`context-findings/plan/context-system-implementation-plan.md:45-59`); none of the proposed artifacts exist.

## 1. Inventory

1,232 files in total, 566 of them `.md`. Where the Markdown lives:

```
.opencode/                 450 files (388 md)
  context/                 296 md, 62,112 lines   ← the "context system"
    core/                   87 files, 19,481 lines  (shipped to users)
    openagents-repo/       107 files, 24,340 lines  (the repo documenting itself)
    ui/ 30 · development/ 34 · content-creation/ 17 · system-builder-templates/ 4
    project-intelligence/    6 files, 599 lines     (template for users' own project)
    data/ product/ learning/ 2 files each, 40 lines (navigation stubs only)
    CODEBASE_STANDARDS.md  3,795 lines, referenced by no other file
  agent/ command/ skill/ skills/   65 md, 24,372 lines (prompts)
  docs/                    3 md, 4,268 lines
docs/                      48 md, 34,629 lines (median 448)
  planning/                16 md, 23,246 lines (one refactor, issue #206)
  maintenance/ agents/ features/ guides/ getting-started/ contributing/ …
plugins/claude-code/       Claude Code plugin: 13 skills, 6 agents, SessionStart hook
evals/                     263 YAML tests, 55 md (incl. TESTING_SESSION_SUMMARY.md, SUMMARY.md)
.tmp/                      4 README stubs for gitignored planning workspaces
registry.json              194 context entries (of 296 on disk)
CONTEXT_SYSTEM_GUIDE.md 724 · README.md 823 · CHANGELOG.md 318 · ROADMAP.md 85
```

The two layers:

- **(a) Self-documentation.** `openagents-repo/` (107 files), `docs/`, `dev/docs/`, and the maintainer agent `.opencode/agent/meta/repo-manager.md` (1,038 lines).
- **(b) What users get.** `core/` standards and workflows, the `project-intelligence/` template, commands such as `/add-context` and `/context`, and the plugin skills. Installation copies the files into the user's `.opencode/context/` per profile (`packages/cli/src/lib/installer.ts`, `plugins/claude-code/scripts/install-context.ts`).
- **Registry coverage.** 106 context files on disk are not in the registry, 53 of them in `openagents-repo/`, so they are never installed for users.

## 2. Creation

**Who writes the files**

- Humans and agents, all by prompt. The main writers are the `context-organizer` subagent, `DocWriter` (`.opencode/agent/subagents/core/documentation.md`), `ADRManager` (`.opencode/agent/subagents/planning/adr-manager.md`, allowed to edit only `docs/adr/**`), and the commands `/add-context` (921 lines), `/context` (harvest, extract, organize, update, error, migrate) and `/build-context-system` (861 lines, generates a whole `.opencode/` tree for a domain).
- No generator derives content from code. `/analyze-patterns` reports duplication; it doesn't write context.
- The "skill router" scripts only echo text. Every `context-manager/router.sh` operation just prints its name and "See …SKILL.md" (`.opencode/skills/context-manager/router.sh`).

**What triggers a new file**

- **User wizard.** `/add-context` asks six questions: stack, an API example, a component example, naming, standards, security. It writes `project-intelligence/technical-domain.md` (`.opencode/command/add-context.md:349-465`). Most answers can be read off `package.json` and the source tree.
- **Harvest.** Harvest scans for `*SUMMARY.md`, `SESSION-*.md`, `.tmp/` files and "files >2KB in root", maps content to `concepts/examples/guides/errors/lookup`, and shows an approval list with ✓ already ticked on nearly every item (`core/context-system/operations/harvest.md:20-120`).
- **Workflow step.** The maintainer agent's final stage says "New features → Relevant guides in docs/" (`.opencode/agent/meta/repo-manager.md:614-620`).
- **ADR rule.** In the planning workflow, "Architectural decision? → ADRManager" (`.opencode/skill/project-orchestration/workflows/planning-agents.md:38`).

**Friction that does exist**

- Approval gates: DocWriter must "propose first" (`documentation.md:33-35`), and harvest and update have approval stages. These guard writing but don't filter content.
- A few real thresholds:
  - "Golden Rule: If users ask the same question twice, document it" (`core/standards/documentation.md:7`), plus "Don't Document… What code does".
  - ADRManager's "Do NOT use when: trivial details, already documented, no alternatives considered, temporary code" (`planning-agents.md:736-740`).
  - "Create subfolder only when 5+ related files" (`core/standards/project-intelligence-management.md:85-87`).

**Friction that is missing**

- Nothing asks whether the code already says it. The shipped `technical-domain.md` template has sections for Primary Stack, Project Structure and Key Directories (`project-intelligence/technical-domain.md:13-50`); only its "Rationale" column and "Why This Architecture?" section carry non-derivable content.
- Deletion is discouraged. The rules say "Never Delete: Decision history, Lessons learned, Context that might be needed later" (`project-intelligence-management.md:141-144`) and rename files to `.deprecated.md` instead.
- Placeholder navigation for content that doesn't exist, for example `ui/terminal/navigation.md:17-27` ("Planned Content… (Future)") and `development/frameworks/tanstack-start/navigation.md:26-27`.

## 3. Length and density

**Stated rules**

- MVI formula: 1–3 sentence concept, 3–5 bullets, example under 10 lines, reference link, "scannable in <30 seconds" (`mvi.md:13-35`).
- Caps: concept 100, example 80, guide 150, lookup 100, error 150 lines (`mvi.md:118-125`, `guides/creation.md:81-91`); project-intelligence files under 200 lines.
- Navigation files: 200–300 tokens, checked by "wc -w × 1.3" (`guides/navigation-design-basics.md:21-22,107-112`).

**Measured (lines unless noted)**

| Set | n | median | p25–p75 | max | over cap |
|---|---|---|---|---|---|
| All context `.md` | 296 | 118 | – | 4,616 | 119 >150, 41 >400 |
| Context, non-navigation | 221 | 157 | 85–291 | 4,616 | – |
| `examples/` (cap 80) | 15 | – | – | – | 10 over |
| `guides/` (cap 150) | 42 | – | – | – | 24 over |
| `lookup/` (cap 100) | 19 | – | – | – | 10 over |
| `navigation.md` (words) | 75 | 108 w | – | 949 w | 16 over ~230 w |
| Agent prompts `.opencode/agent` | 34 | 253 | – | 1,038 | – |
| `docs/` | 48 | 448 | – | 3,977 | – |

**Where the cap breaks down**

- Only 91 of 221 content files sit in the five required function folders (concepts, examples, guides, lookup, errors). The rest live in `standards/`, `workflows/` and flat files.
- The biggest files are code standards extracted from another codebase ("Analyzed: 206+ TypeScript files across `packages/opencode/src/`", `openagents-repo/standards/opencode-typescript.md:6-7`, 4,616 lines, marked Priority critical). That source tree is not in this repo, so the file cannot be re-checked against it here.
- `docs/planning/05-team-lead-scenarios.md` alone is 3,977 lines.

**Density and audience**

- Content files are dense in form: tables, ✅/❌ lists, XML-ish `<rule id=… enforcement="strict">` blocks. That markup, the HTML-comment metadata, the "Priority: critical (80% of use cases)" convention (`standards/frontmatter.md:28-32`) and the "Load X for Y" routes mark them as agent-facing.
- Much of the content is generic best practice rather than project knowledge. `core/standards/code-quality.md` (164 lines, ~600 words: "Pure functions… Immutability… Small functions (< 50 lines)") is a mandatory load for every code task (`.opencode/agent/core/openagent.md:262-266`).
- `docs/` and `CONTEXT_SYSTEM_GUIDE.md` are narrative and aimed at humans: tutorials, "Real-World Examples", emoji-heavy marketing tone.

## 4. Sync with source of truth

**Mechanisms that exist**

| Mechanism | What it checks | Wired where | Blocking? |
|---|---|---|---|
| `scripts/registry/validate-registry.ts` | registry JSON valid, every `path` exists | `validate-registry.yml:72-73`, `scripts/hooks/pre-commit` | yes |
| `scripts/registry/check-dependencies.ts` | agent `context:` dependencies resolve | pre-commit only (manual install) | local only |
| `scripts/validation/validate-markdown-links.ts` | `[x](y.md)` and `.opencode/…md` paths exist in agent/skill/command/context md | `validate-registry.yml:69-70` | yes, but skips `openagents-repo/**`, `agent/meta/**`, `command/openagents/**`, `command/prompt-engineering/**` (`markdown-link-skip-patterns.txt:31-34`) |
| `auto-detect-components.sh --dry-run` | files on disk missing from registry | `validate-registry.yml:49-64` | "reported but does not block" |
| `update-registry.yml` | auto-adds new components to the registry and pushes to main | push to main | – |
| `sync-docs.yml` | on registry or `.opencode/**` change, opens an issue asking the `/opencode` bot to update README counts (`sync-docs.yml:106-160`) | push to main | AI-mediated, no check |
| `scripts/docs/sync-component-list.sh` | README counts vs registry | not referenced by any workflow | – |
| `post-merge-pr.yml:147-166` | prepends a CHANGELOG entry from the PR title | merge | – |
| `installer.ts:149-170` | SHA-256 manifest; skips files the user modified on update | CLI | – |

**Nothing checks what a doc says against the code.** Frontmatter `Version`/`Updated` fields and the line caps are never read by any code; grep for `<!-- Context` in `.ts`, `.sh` and `.py` finds no parser. Freshness metadata is unreliable anyway: 224 of 296 files carry the same `Updated: 2026-02-15` stamp, which looks like a bulk rewrite (inference). The body's "Last Updated" often disagrees, for example `mvi.md:1` versus `mvi.md:7` (2026-01-06).

**Drift observed**

- 31 backticked paths in `navigation.md` files don't resolve. Examples: root `navigation.md:34` → `openagents-repo/guides/adding-agent.md` (split away); 15 templates in `system-builder-templates/navigation.md`.
- `CONTEXT_SYSTEM_GUIDE.md:112-124,170-186` names `core/workflows/design-iteration.md`, `external-libraries.md` and `ui/web/animation-patterns.md`. None of them exist.
- `openagents-repo/lookup/file-locations.md` (the "where is X" doc) lists `.opencode/agent/development|product|learning/` and `evals/framework/docs/`, none of which exist, and omits `packages/`, `plugins/` and `.opencode/skills/`.
- `core/navigation.md:17-23` lists 6 standards files; the folder has 11.
- `.opencode/skill/task-management/tests/line-number-validation.test.ts:17` imports `../scripts/validators/line-number-validator`, which does not exist.
- `openagents-repo/lookup/compatibility-layer-progress.md:13` is a frozen status snapshot ("59.4% (19/32 subtasks completed)") kept inside standing context.
- The eval harness hard-codes the old file names `standards/code.md`, `docs.md` and `tests.md` (`evals/framework/src/evaluators/context-loading-evaluator.ts:59-86`). Symlinks keep them working after the renames recorded in `core/context-system/CHANGELOG.md`.
- Contradictory rules: "ALWAYS organize by function" (`standards/structure.md:14`) versus the `organize` operation, which is to "Reorganize context files by concern (what you're doing) rather than function" (`.opencode/skills/context-manager/SKILL.md:270-287`).

**Review rules** are a PR checkbox, "Documentation updated (if needed)" (`.github/pull_request_template.md`), plus a governance table with "Quick review: Per PR; Full review: Quarterly" (`project-intelligence-management.md:202-207`). No mechanism backs either.

**Expiry and deletion**

- Only work records expire: `scripts/maintenance/cleanup-stale-sessions.sh:7` sets `STALE_HOURS=24`, and cleanup of `.tmp/external-context` after 7 days is described in prose.
- Standing docs never expire. Deprecation is by banner or rename; the registry still ships an entry described as "⛔ DEPRECATED" (`registry.json`, id `project-context`) in the essential profile.

## 5. Agent-facing files

- **No `AGENTS.md`, `CLAUDE.md` or `GEMINI.md` exist**, and the method never generates one. The only `@AGENTS.md` mention is an allow-list entry in `scripts/validation/validate-context-refs.sh:36`. Model-specific prompt variants live in `.opencode/prompts/core/openagent/gemini.md` (343 lines).
- **The always-on layer is large.** The primary agents are `openagent.md` (678 lines, ~2.8k words) and `opencoder.md` (502 lines). Each hard-codes a routing table of mandatory loads: code → `code-quality.md`, docs → `documentation.md`, tests → `test-coverage.md`, review → `code-review.md`, delegation → `task-delegation-basics.md` (`openagent.md:262-266`). It also states "Context loading is MANDATORY, not optional" (`openagent.md:677`).
- **Claude Code plugin, SessionStart hook** (`plugins/claude-code/hooks/session-start.sh`):
  - Injects the full `using-oac/SKILL.md` (129 lines).
  - Adds a one-line-per-skill catalogue extracted from `description:` frontmatter (lines 32-49).
  - Adds one instruction: run `oac:context-discovery` "once per session — do not repeat it" (line 71).
  - If no `.context-manifest.json` exists, adds an `<important-reminder>` pushing the user to install context (line 58).

  This is the closest analogue to a lean root file plus pointers. It is wrapped in `<EXTREMELY_IMPORTANT>` and "even a 1% chance… you MUST invoke the skill" (`using-oac/SKILL.md:6-13`), which pushes loading up, not down.
- **Progressive disclosure**:
  - The `navigation.md` hierarchy has "Quick Routes" (task → path) and "When to read" lines (`openagents-repo/navigation.md:33,47,59,83`).
  - Priority tiers decide what ContextScout returns. Critical files are mandatory, High "strongly recommended", Medium optional (`plugins/claude-code/skills/context-discovery/SKILL.md:30-59`).
  - ContextScout is forbidden from hard-coding domain paths and must verify that a path exists before recommending it (`contextscout.md:27-46`).
  - Per-task pointers: the task schema separates `context_files` ("Standards paths only — what rules do I follow?") from `reference_files` ("Source material only — what existing code do I look at?") (`core/task-management/standards/task-schema.md:40-41,92-99`). An enhanced schema adds line-range precision (`"lines": "53-95"`, `enhanced-task-schema.md:55-65`).
- **What is deliberately left out**: ContextScout is read-only (`contextscout.md:5-19`); DocWriter edits only `.md` (`documentation.md:27-28`); `project-intelligence` must never fall back to global context (`contextscout.md:39`).

## 6. Hard-to-learn-from-code knowledge

**Decisions**

- Users get one `project-intelligence/decisions-log.md` with a heavy per-entry template: Context, Decision, Rationale, an Alternatives table with pros/cons/why rejected, Impact (positive/negative/risk), Related (`decisions-log.md:15-44`).
- ADRManager writes "lightweight" ADRs (Title, Status, Context, Decision, Consequences) with alternatives mandatory (`adr-manager.md:27-35`) and status proposed/accepted/deprecated/superseded.
- The repo's own decisions have no home. They are scattered across `core/context-system/CHANGELOG.md` ("Organizational Decisions", lines ~40-60), `docs/planning/*`, and the unbuilt ADR plan in `context-findings/`.

**Rationale and "why"**

- Asked for in templates: the Primary Stack "Rationale" column and "Why This Architecture?" in `technical-domain.md`.
- `business-tech-bridge.md` maps business needs to technical solutions.
- `living-notes.md` holds "Active issues, debt, open questions".

**Navigation ("where is X", "how parts connect")**

- `lookup/file-locations.md` and `openagents-repo/quick-start.md` for the repo itself.
- `📂 Codebase References` sections are meant to link context to real files, with the rule "Verify files exist (warn if not found)" (`standards/codebase-references.md:13-16,86-93`). Only 2 of 296 files contain one.
- The navigation guide is itself stale (see §4). Hand-maintained "where is X" docs drift faster than anything else here.

**Invariants**

- Mostly expressed as prose rules inside agent prompts, e.g. `<rule id=…>` blocks.
- The eval framework is the only place rules are checked mechanically: 263 YAML tests and evaluators for approval-gate, context-loading and stop-on-failure behaviour (`evals/framework/src/evaluators/`). It checks agent behaviour, not doc truth.

## 7. Work records

**Tasks.** `.tmp/tasks/{feature}/task.json` plus `subtask_NN.json`: status, `depends_on`, `context_files`, `reference_files`, acceptance criteria (`task-schema.md:17-70`). Managed by `.opencode/skills/task-management/scripts/task-cli.ts` (554 lines).

**Sessions.** `.tmp/sessions/{id}/context.md` bundles are handed to subagents. The template has Request, Requirements, Decisions, Files, Static Context, Constraints and Progress sections (`core/workflows/delegation.md:12`). A per-feature JSON index hands each subagent "ONLY the specific files they need" (`.opencode/skill/project-orchestration/scripts/context-index.ts:1-16`).

**Planning artefacts.** `.tmp/architecture|story-maps|backlog|contracts/` are gitignored. The READMEs say "Archive important architecture documents to permanent locations when features are completed" (`.tmp/architecture/README.md:49`), with no mechanism behind it.

**Lifecycle and feedback into standing docs**

- OpenAgent's stage 6 asks whether to delete the session folder (`openagent.md:433-437`).
- Harvesting into standing docs is a separate user command: `/context harvest`, archiving by default to `.tmp/archive/harvested/{date}/` (`harvest.md:316`).
- So feedback into standing context is opt-in and nothing enforces it.

**Committed work debris**

- `docs/planning/` holds 16 files and 23,246 lines for one refactor. The index still says "Status: Comprehensive Planning Phase" (`docs/planning/00-INDEX.md:4`).
- `openagents-repo/features/oac-package-refactor.md` (2,340 lines, "Status: In Development") sits inside standing context.
- AI-style summaries are committed despite harvest calling them workspace "plague" (`harvest.md:13-15`): `docs/maintenance/REGISTRY_FIXES_SUMMARY.md`, `docs/maintenance/CONTEXTSCOUT_FIX.md`, `packages/plugin-abilities/SIMPLIFICATION_SUMMARY.md`, `.opencode/plugins/coder-verification/IMPLEMENTATION_SUMMARY.md`, `evals/agents/TESTING_SESSION_SUMMARY.md`, and two different `WORKFLOW_AUDIT.md` files (`.github/` and `.github/workflows/`).

**Changelog and roadmap**

- `CHANGELOG.md` is auto-prepended from PR titles. It has duplicate and out-of-order sections: two `0.5.0`, and `0.3.1`/`0.0.2` repeated.
- `ROADMAP.md` defers to a GitHub Project board and was last updated December 2025, with a stray "asd" at line 14.

## 8. Ideas to borrow and anti-patterns

**Ideas to borrow**

1. **Standards vs sources split per task** (`task-schema.md:92-99`). Each unit of work names two lists: "rules to follow" (a few docs) and "code to look at" (source files).
   - Complaint addressed: 2, because an agent loads only the named docs.
   - Leaning direction: strongly supports it. The docs list stays short because the "where" lives in `reference_files` pointing at code. Antmay's plan or spec could carry the same two lists instead of the blanket "read everything" input list.
2. **Catalogue built from frontmatter at session start** (`session-start.sh:32-49`). The always-loaded text is one line per item, taken from `description:`.
   - Complaint addressed: 2.
   - Leaning direction: supports a lean `AGENTS.md` that points, the way Antmay's `consult-*` skills list by frontmatter. Borrow the generation (built from the files, never hand-maintained), not the "1% chance → MUST" tone.
3. **ContextScout's "verify before recommend" rule** (`contextscout.md:44-46`) and the rule never to hard-code domain → path mappings.
   - Complaint addressed: 3, partly: a stale pointer is not propagated.
   - Leaning direction: supports it. Pointers in `AGENTS.md` should be checked for existence at read time or in CI.
4. **Explicit "Do NOT create when" lists**: ADRManager's list (`planning-agents.md:736-740`); "Golden Rule: if users ask the same question twice, document it" (`documentation.md:7`); "Don't document what code does".
   - Complaint addressed: 1.
   - Leaning direction: the "asked twice" rule refines Antmay's decision test into a demand signal, recording what agents or people actually failed to find.
5. **Link and path existence in CI** (`validate-markdown-links.ts`).
   - Complaint addressed: 3 at the pointer level only.
   - Leaning direction: cheap and worth having for Antmay's project layer. The cautionary tale is the skip-list that excluded the repo's own docs to keep CI green.
6. **Hash manifest protecting user edits** (`packages/cli/src/lib/installer.ts:149-170`). Framework-shipped docs are tracked by SHA-256, and modified files are not overwritten.
   - Complaint addressed: 3, for shipped content.
   - Leaning direction: relevant only if Antmay ever ships docs into users' repos.
7. **Evals that check agent behaviour against context rules** (`evals/framework/src/evaluators/context-loading-evaluator.ts`).
   - What they revealed matters more than the tool: agents ignored the routing layer and grepped the code (`CONTEXTSCOUT_TEST_FINDINGS.md:15-30`). That is direct evidence that code-derivable docs go unread, which supports the leaning direction.

**Anti-patterns**

1. **Line caps without enforcement, and splitting as the remedy** (`mvi.md:118-125`; the 9 design-iteration files; `REGISTRY_FIXES_SUMMARY.md`).
   - Complaints: worsens 1 (more files, shims, symlinks) and 3 (broken refs); leaves 2 unchanged (same tokens).
   - Lesson for Antmay: a size limit should force cutting content, for example "only what code can't tell", not splitting it.
2. **Templates that solicit code-obvious facts**: stack table, project structure tree and naming conventions in `technical-domain.md`; `/add-context` Q1 and Q4.
   - Complaints: worsens 2 and 3, because these go stale the moment `package.json` or `src/` changes.
   - Leaning direction: directly contradicts it and is the clearest counter-example.
3. **Generic best-practice corpora as mandatory context**: `code-quality.md` and the other files loaded on every task (`openagent.md:262-266`); 4k-line standards extracted from another codebase.
   - Complaint: worsens 2 (context spent on what the model already knows).
   - Leaning direction: supports it; nothing here is hard to tell from code or from general knowledge.
4. **Hand-maintained navigation trees and "where is X" lookups** (`core/navigation.md:9-59`, `lookup/file-locations.md`).
   - Complaint: worsens 3; they were the most drifted docs found.
   - Leaning direction: refines it. A navigation guide for a hard-to-explore area is justified only if something checks it, for example paths exist and directories listed equal directories on disk, or if it is generated.
5. **Placeholder and "Planned Content" docs** (`ui/terminal/navigation.md`, `tanstack-start/navigation.md`, `data/`, `product/`, `learning/` stubs).
   - Complaint: worsens 1.
   - Contrast: Antmay's lazy creation is the right default.
6. **Freshness metadata that nothing reads**: frontmatter `Version`/`Updated`/`Priority`, 224 identical stamps, disagreeing "Last Updated" lines.
   - Complaint: 3. It gives a false sense of currency and adds noise to every file (2).
7. **"Never delete, archive instead" for standing docs** (`project-intelligence-management.md:141-144`).
   - Complaint: worsens 1.
   - Contrast: Antmay's `superseded/` folder is narrower and better.
8. **Work records inside standing context**: progress snapshots and in-flight feature plans (`compatibility-layer-progress.md`, `features/oac-package-refactor.md`, `docs/planning/`).
   - Complaint: worsens 3.
   - Contrast: Antmay's rule that threads are historical and never cited fits better.
9. **AI-mediated sync via issue** (`sync-docs.yml`): an agent is asked to fix counts after the fact, and the pure script that could verify the counts is not wired into CI.
   - Complaint: 3.
   - Lesson: prefer a deterministic check over asking an agent to reconcile.
10. **Always-on "EXTREMELY_IMPORTANT / 1% chance / MUST" instructions** (`using-oac/SKILL.md:6-13`).
    - Complaint: worsens 2, because it inflates loading rather than keeping the root lean.

## Evidence gaps

- **No git history.** I could not tell how fast docs drift after code changes, whether the 2026-02-15 stamps came from one scripted commit (inferred from uniformity), or whether `sync-docs.yml` issues ever get resolved.
- **Runtime behaviour not observed.** I didn't run the evals or ContextScout, so I don't know how many tokens a typical task actually loads. The ~250k-token corpus figure is a words × 1.3 estimate.
- **`packages/opencode/src/` is not in the clone.** I could not check whether `CODEBASE_STANDARDS.md` or `opencode-typescript.md` still match their source.
- **Scripts not executed**, per the read-only constraint. I don't know whether `validate-markdown-links.ts` currently passes. My own count of 31 unresolved navigation paths covers backticked paths only, which that validator does not check unless they start with `.opencode/` or use link syntax.
- **Remote project board.** The GitHub Project and issues (#141, #206) that `ROADMAP.md` and `docs/planning/` defer to are remote and were not fetched.
