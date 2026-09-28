# obra/superpowers — documentation research

Clone: `.library/sources/obra_superpowers/` (v6.4.2, 2026-09-25; shallow, single commit). All paths below are relative to the clone root.

## Summary

- **No standing project documentation is prescribed for users.** The method's only document outputs in a user's repo are dated, append-only work records: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` (`skills/brainstorming/SKILL.md:135,241`) and `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` (`skills/writing-plans/SKILL.md:16`). No skill writes a README, an ADR, an architecture doc or the instructions file. Nothing folds specs or plans into anything else, and nothing retires them.
- **The main friction on creating docs is scaling ceremony to the task, not a gate on the doc itself.** Brainstorming sorts each request as spike, bounded or architectural. Only the architectural path produces a file; the other two keep the design in chat (`skills/brainstorming/SKILL.md:58-88`). But the tie-break is "When in doubt between two paths, take the heavier one" (`:86`), which pushes toward more documents.
- **Work records pile up and go stale.** The repo's own `docs/` holds 40 spec and plan files, about 111k words. Plans have a median of 3,218 words and a max of 10,538. `Status:` lines are frozen and wrong: for example, `docs/superpowers/specs/2026-04-06-worktree-rototill-design.md:4` still says "Draft" although the work shipped in v5.1.0 (`RELEASE-NOTES.md:306`). The maintainers had to write a test that polices historical spec and plan text (`tests/claude-code/test-worktree-path-policy.sh:12-13,58-60`). That suggests agents read old records as live guidance (inference).
- **Execution scratch is deleted by design, which is the cleanest idea here.** The per-plan ledger, task briefs and reports live in a git-ignored `.superpowers/sdd/<plan>/` folder, and that folder is removed once review is clean: "the git history is the record now" (`skills/executing-plans/SKILL.md:300-302`; `skills/subagent-driven-development/SKILL.md:482-485`). Decisions made during execution ("Rulings") reach the human only in the final chat message (`skills/subagent-driven-development/SKILL.md:473-480`). They never reach a standing doc.
- **Length budgets are explicit but not enforced.** `skills/writing-skills/SKILL.md:217-220` sets under 150, 200 and 500 words for different kinds of skill. In practice 14 of 15 skills exceed 500 words (median 1,269, max 4,873), and the always-injected `using-superpowers` is 492 words against its own "<200". Only one skill has a mechanical word budget: 1,000 words, in `tests/diagnosing-superpowers/test-skill-structure.sh:12,50-56`. The strongest argument for brevity is measured: "Codex re-reads SKILL.md ~500× per long session … prose length is a real cost" (`docs/superpowers/specs/2026-06-10-positive-instruction-redesign-design.md:32`).
- **There is no mechanism that syncs docs to code.** There is no `.github/workflows/`, and `.pre-commit-config.yaml` only lints the Python evals. The one real drift check is for version strings (`scripts/bump-version.sh --check/--audit`, `.version-bump.json`). The project's stated test philosophy rejects grepping docs: "Documents that instruct agents are tested by the consuming agent's behavior … prose for humans earns no test at all" (`skills/test-driven-development/writing-good-tests.md:47-51`). Its own tests still do exactly that grepping.
- **Drift is visible everywhere in the standing docs:**
  - The README still promises plans with "complete code" and "2-5 minutes" tasks (`README.md:42,313`), wording the same release rewrote (`RELEASE-NOTES.md:10-15`).
  - The porting guide points to `CLAUDE.md` release steps that no longer exist (`docs/porting-to-a-new-harness.md:24,677`), and to a `.antigravity-plugin/` folder that does not exist (`:295,698`).
  - `docs/testing.md:10-21` lists 7 of the 18 `tests/` subdirectories.
  - `skills/brainstorming/spec-document-reviewer-prompt.md` is orphaned.
  - Every fix happened by hand and piecemeal: its sibling file was removed with the note "Nothing referenced it" (`RELEASE-NOTES.md:15`).
- **Agent-facing files: small at session start, loaded lazily after that.** Every harness bootstrap injects the body of one skill (`skills/using-superpowers/SKILL.md`, about 3.2 KB), read from disk at runtime so there is a single source (`hooks/session-start:11,27`; `.pi/extensions/superpowers.ts:12`; `.opencode/plugins/superpowers.js:121`). That body holds conditional "if your harness appears here, read its reference file" pointers (`:52-61`). Everything else loads on demand. The root `AGENTS.md` (1,397 words) is almost entirely contribution policy. It does not link to the two standing guides.
- **How to phrase rules for agents is backed by evidence.** Prohibitions on the *shape* of an output ("don't restate") measurably backfire, while positive recipes work. Nuance clauses make a good recipe worse (`skills/writing-skills/SKILL.md:463-476`; positive-instruction spec `:8-32`). This applies directly to how Antmay words its "don't write a doc unless…" rules.

## 1. Inventory

Tracked files: 229. Documentation (Markdown), grouped:

```
AGENTS.md (115 l / 1,397 w)   GEMINI.md (2 l: two @-includes)   README.md (399 l / 1,880 w)
RELEASE-NOTES.md (1,475 l / 14,027 w)   CODE_OF_CONDUCT.md
docs/
  porting-to-a-new-harness.md (841 l / 7,798 w)   testing.md (37 l / 381 w)
  README.kimi.md, README.opencode.md (1,222 w)     windows/polyglot-hooks.md (918 w)
  plans/                4 files (Nov 2025–Jan 2026; pre-v5 location, never migrated)
  superpowers/specs/   20 files   superpowers/plans/ 16 files
skills/ 15 skills: 15 SKILL.md + ~45 supporting .md (prompts, references, templates, examples)
tests/claude-code/README.md, .opencode/INSTALL.md, .github/PULL_REQUEST_TEMPLATE.md (143 l), 4 issue templates
```

- There is no `CLAUDE.md`: it was removed in v6.4.2 (`RELEASE-NOTES.md:18`).
- There are no ADRs and no architecture or product docs.
- There is no index of `docs/superpowers/`; the folder holds only `plans/` and `specs/`.
- `docs/` is excluded from what ships to users (`scripts/sync-to-codex-plugin.sh:65-81` drops `/docs/`, `/AGENTS.md`, `/RELEASE-NOTES.md`, `/tests/`).

## 2. Creation

**For users' projects (layer b):**

- **Specs.** They are written only on the architectural path, after the design has been approved section by section in conversation. They are committed (`skills/brainstorming/SKILL.md:135,239-244`). There is a hard gate: conversational approval permits writing the spec, and approval of the written spec permits invoking writing-plans (`:38-56`). A bounded task gets "No spec file, no implementation plan document" (`:76-80`). A spike gets "No design doc, no spec file" (`:67-70`).
- **Plans.** writing-plans always saves one (`skills/writing-plans/SKILL.md:16`), and the human reviews it before execution (`:179-198`).
- **No template for specs.** There is only a coverage list: "architecture, components, data flow, error handling, testing" (`skills/brainstorming/SKILL.md:221`).
- **Plans have a mandatory header** (Goal, Architecture, Tech Stack, Spec pointer, Global Constraints, Review Focus) and a task structure (`skills/writing-plans/SKILL.md:52-138`).
- **Review before the human sees them.** Both pass an inline self-review checklist. A subagent reviewer loop was removed after "Regression testing across 5 versions with 5 trials each showed identical quality scores" (`RELEASE-NOTES.md:397-404`).
- **Where docs go is configurable.** "User preferences for spec location override this default" (`skills/brainstorming/SKILL.md:242`). Preferences live in the user's instructions file, which skills read but never write (`skills/using-git-worktrees/SKILL.md:41,67`).
- **Scratch artifacts** are created by helper scripts, not written freehand: `sdd-workspace`, `task-brief`, `task-start`, `task-done`, `review-package` (`skills/subagent-driven-development/scripts/`, `skills/executing-plans/scripts/`).

**For the project itself (layer a):**

- **Skills: creating one is very hard.**
  - Iron Law: "NO SKILL WITHOUT A FAILING TEST FIRST … applies to NEW skills AND EDITS" (`skills/writing-skills/SKILL.md:376-393`).
  - There is an explicit "Don't create for" list: one-offs, well-documented practices, "Project-specific conventions (put in your instructions file)", and "Mechanical constraints (if it's enforceable with regex/validation, automate it—save documentation for judgment calls)" (`:55-59`).
  - `AGENTS.md:93-100` requires before/after eval evidence for skill edits. `AGENTS.md:40-42` rejects "compliance" rewrites.
- **Specs and plans in its own `docs/`: creating them is very easy.** They are produced by dogfooding the method, one or two per feature, with no bar beyond the gate described above.

## 3. Length and density

| Set | n | words min / median / max | lines median |
|---|---|---|---|
| `skills/*/SKILL.md` | 15 | 424 / 1,269 / 4,873 (`subagent-driven-development`) | 225 |
| `docs/superpowers/specs` | 20 | 310 / 1,573 / 3,958 | 196 |
| `docs/superpowers/plans` | 16 | 703 / 3,218 / 10,538 | 780 |
| `docs/plans` (legacy) | 4 | 1,070 / 2,326 / 3,238 | 641 |

- **Plan-to-spec ratio** (12 pairs): 1× to 6×. `2026-07-15-sdd-fix-loop-redesign` has a 1,633-word spec and a 10,459-word plan. Every one of these predates the v6.4.2 "Proportion" rule: "A plan several times longer than the spec it implements is a transcript of the program" (`skills/writing-plans/SKILL.md:157-161,175`). That rule says plans took "a quarter of the time and about a third of the tokens" after the change (`RELEASE-NOTES.md:5`).
- **Budgets the project sets:**
  - Skill word targets (`skills/writing-skills/SKILL.md:213-266`), checked with `wc -w`.
  - Descriptions: at most 1,024 characters, "under 500 characters if possible", with triggers only and never a summary of the workflow (`:95-103,150-158`).
  - Supporting files only for "Heavy reference (100+ lines)" (`:84-91`).
  - The vendored `skills/writing-skills/anthropic-best-practices.md:241,1099` says "SKILL.md body under 500 lines"; `subagent-driven-development` (568) and `writing-skills` (681) exceed it.
  - Spec sections: "a few sentences if straightforward, up to 200-300 words if nuanced" (`skills/brainstorming/SKILL.md:219`).
  - Measured cost at session start: the bootstrap is about 3.2 KB, and all 15 skill descriptions total 2,304 characters.
- **Density:**
  - Skills are dense and aimed at agents: tables of excuses and replies, red-flag tables, DOT flowcharts, "Announce at start" lines. The audience shows in the second-person address to the agent and phrases like "your human partner" (`AGENTS.md:108`).
  - The v6.2.0 "compression campaign" removed "recap sections, social proof, and benefits-selling prose aimed at a reader who has already invoked the skill", with each cut micro-tested (`RELEASE-NOTES.md:128-133`).
  - Specs and plans are narrative and evidence-heavy, and mix human and agent audiences. Plans embed absolute maintainer paths: 71 occurrences of `/Users/jesse` across 4 plans.
  - `RELEASE-NOTES.md` is the most rationale-dense prose, written for humans.

## 4. Sync with source of truth

What exists:

- **Version sync.** `.version-bump.json` declares 11 manifest fields. `scripts/bump-version.sh --check` reports drift, and `--audit` greps the repo for undeclared copies of the version string (`scripts/bump-version.sh:4-9,154-224`). This is the only generator-style sync.
- **Single-source bootstrap.** Every harness reads `skills/using-superpowers/SKILL.md` at runtime rather than keeping a copy (`hooks/session-start:11`; `.hermes-plugin/__init__.py:42`; `.pi/extensions/superpowers.ts:12,63`). The hook output format is tested (`tests/hooks/test-session-start.sh`).
- **Text-grep structure tests, applied to a few files only:**
  - `tests/diagnosing-superpowers/test-skill-structure.sh`: frontmatter, "Use when" start, banned workflow words in the description (`:42-48`), 1,000-word budget, every referenced `references|prompts|templates/*.md` exists (`:67-74`), removed files stay removed (`:109-129`), no leaks of `/Users/` or other personal paths, and no "the user" (`:140-147`). It covers one skill. Other skills use "the user" (for example `skills/brainstorming/SKILL.md`, 5 times), so the terminology rule in `AGENTS.md:108` drifts wherever it is not tested.
  - `tests/antigravity/test-antigravity-tools.sh` and `tests/pi/test-pi-extension.mjs` check that tool-mapping references mention the right tools and that `using-superpowers` links them.
  - `tests/claude-code/test-worktree-path-policy.sh` asserts that skills and one historical spec and plan do not contain an old path.
- **Description-recall tests.** `tests/claude-code/test-subagent-driven-development.sh:1-9` asks a live agent to describe the skill and string-matches the answer. This tests whether the doc is *understood*, not whether it is *accurate*.
- **Behavioral evals.** These live in an external repo cloned into `evals/`, which is git-ignored (`AGENTS.md:102-104`; `docs/testing.md:25-37`). Only "static gates" are CI-safe, and no CI config exists in this repo.
- **Manual rules.** One is "When this guide and the code disagree, the code wins; fix the guide" (`docs/porting-to-a-new-harness.md:16-17`); another is "Use this as the live index; when in doubt, read the files, not this table" (`:795`). A one-off plan step keeps "dated artifacts" frozen, adding an annotation without rewriting (`docs/superpowers/plans/2026-05-06-lift-drill-into-evals.md:1000-1027`).

What does not exist:

- A check that standing docs match code.
- A link or orphan checker.
- An "update X in the same change" rule.
- Any expiry or archival policy for specs and plans.
- A rule that release notes are updated per PR.

**Observed drift, all fixed by hand when fixed at all:**

- Fixed: `docs/testing.md` stale Drill references (`RELEASE-NOTES.md:73`); dead links after reference pruning (`:148`); the orphaned plan reviewer prompt (`:15`).
- Still present:
  - `README.md:42,313` versus `skills/writing-plans/SKILL.md:10,45-50,157`.
  - `README.md:385` still says "drill".
  - `docs/porting-to-a-new-harness.md:24,677` refers to `CLAUDE.md`; `:295,698` refers to `.antigravity-plugin/`.
  - The porting guide's Appendix A omits Hermes, Devin and Muse, and says Claude Code has "no adapter file needed" although `skills/using-superpowers/references/claude-code-tools.md` exists.
  - `docs/testing.md:10-21` lists 7 of the 18 test directories.
  - `RELEASE-NOTES.md:123` cites `docs/specs/`, a folder that does not exist.
  - `.gitignore:11` cites `CLAUDE.md`.
  - The OpenCode tool mapping exists three times: `.opencode/plugins/superpowers.js:77-107`, `docs/README.opencode.md:143-172` and `.opencode/INSTALL.md:136-162`. They currently agree, but nothing checks it.
- Contradiction: `skills/test-driven-development/writing-good-tests.md:177,192` lists "The test greps source text, or asserts a removed symbol stays removed" as a warning sign, and yet the repo's own doc tests do exactly that.

## 5. Agent-facing files

- **`AGENTS.md`** (1,397 words): an "If You Are an AI Agent … Stop" preamble, PR requirements, a "What We Will Not Accept" list, the harness acceptance test ("Let's make a react todo list" must auto-trigger brainstorming, `:78-82`), the eval requirement, and terminology ("your human partner" is deliberate, `:108`).
  - Deliberately left out: layout, build and test commands, architecture.
  - It carries short rationale for non-obvious decisions: zero dependencies "by design" (`:38`), the skill philosophy differs from Anthropic's (`:42`).
  - It points to `.github/PULL_REQUEST_TEMPLATE.md` and `evals/README.md`. It does not point to `docs/porting-to-a-new-harness.md` (even under "New Harness Support") or to `docs/testing.md`; nothing links to either guide from the entry points.
- **`GEMINI.md`**: two `@` includes (the bootstrap skill plus `gemini-tools.md`), loaded through `gemini-extension.json` `contextFileName`. `@` is used on purpose here, while writing-skills warns that `@` "force-loads files immediately" (`skills/writing-skills/SKILL.md:286-288`).
- **Session start.** Registered in `hooks/hooks.json` with matcher `startup|clear|compact`; it no longer fires on `--resume`, "which already have the context" (`RELEASE-NOTES.md:462`).
  - The hook injects `<EXTREMELY_IMPORTANT>You have superpowers … For all other skills, use the 'Skill' tool` plus the skill body (`hooks/session-start:27`). Pi re-injects after compaction (`.pi/extensions/superpowers.ts:27`).
  - The injected skill carries the 1% rule, a red-flags table, conditional per-harness pointers (`skills/using-superpowers/SKILL.md:52-61`), and precedence: "User instructions (CLAUDE.md, AGENTS.md, GEMINI.md …) take precedence over skills" (`:63-65`).
  - `<SUBAGENT-STOP>` keeps dispatched subagents from applying it (`:6-8`).
- **Progressive disclosure inside skills:**
  - `diagnosing-superpowers`: a SKILL.md of 1,000 words or fewer, plus 11 prompts of 20–38 lines each dispatched one per analyst, plus 4 references and 4 templates.
  - `brainstorming` reads `visual-companion.md` only "If they agree to the companion" (`skills/brainstorming/SKILL.md:284-285`).
  - `task-brief` extracts a single task from a plan, so an implementer never loads the whole plan (`skills/subagent-driven-development/scripts/task-brief:1-4`).
  - Cross-skill references use `**REQUIRED SUB-SKILL:**` markers instead of inlining (`skills/writing-skills/SKILL.md:278-288`).
  - Descriptions are "Use when…" triggers only. The reason given: a summarized workflow in the description made an agent do one review instead of two (`:150-158`).

## 6. Hard-to-learn-from-code knowledge

There is no decision-record system. Rationale sits in five places:

1. **Code comments next to the mechanism.** Examples: `skills/subagent-driven-development/scripts/sdd-workspace:1-28` (why per-plan, why not under `.git/`, "Single source of truth … so task-brief and review-package cannot drift"); `hooks/session-start:29-38` (why one output field per harness, a link to issue #571); `.opencode/plugins/superpowers.js:70-76,95-99` ("verified against the 2.0.4 and 2.0.7 host contracts").
2. **`RELEASE-NOTES.md`.** Each entry states the why, with eval numbers (`:128-133,397-404`). It is 14k words in a single file and cannot be looked up by topic.
3. **Specs.** Examples: "Hard invariant: existing eval-tuned sentences move; they do not get reworded" (`docs/superpowers/specs/2026-07-15-sdd-fix-loop-redesign-design.md:8`); measured doctrine (`…positive-instruction-redesign-design.md:26-32`). These are frozen at write time.
4. **Short rationale lines in AGENTS.md and in skills.** Skills carry "Why this matters" paragraphs backed by test evidence (`skills/writing-skills/SKILL.md:154-156,472`).
5. **The PR template's "What alternatives did you consider?"** (`.github/PULL_REQUEST_TEMPLATE.md:48`). Its answer lives on GitHub, not in the repo.

For navigation, the porting guide is the one "hard-to-explore area" guide. It is organized as invariants first, then procedure, then a live index of reference implementations (`docs/porting-to-a-new-harness.md:7-17,793-806`). It is also the most drifted document.

## 7. Work records

- **The chain:** a spec in `docs/superpowers/specs/`, then a plan in `docs/superpowers/plans/`. The plan carries a `Spec:` pointer, "the plan argues from the spec" (`skills/writing-plans/SKILL.md:67-68`).
- **Execution** keeps its ledger at `.superpowers/sdd/<plan>/progress.md`, whose first line names its plan (`skills/executing-plans/SKILL.md:125-139`), plus briefs, reports and review packages.
- **Ledger lines follow a format:** `Task N: complete (commits a..b, tests: … → …)`, `Ruling: <what> — <why> — <cost if wrong>`, `Final: minor (deferred): …`.
- **At finish,** rulings and deferred minors go to the final message, the workspace is deleted, and `finishing-a-development-branch` offers merge, PR or keep. It performs no doc step (`skills/finishing-a-development-branch/SKILL.md:53-65`).
- **Brainstorm mockups** persist under `.superpowers/brainstorm/`, and the user is told to git-ignore them (`skills/brainstorming/visual-companion.md:58,294`).
- **Nothing feeds back.** Specs and plans are never updated after implementation, never marked done, never indexed and never pruned. For example, `docs/superpowers/specs/2026-01-22-document-review-system-design.md:87` describes a spec review loop removed in v5.0.6. The diagnosing spec promises a `CREATION-LOG.md` (`…2026-08-27-diagnosing-superpowers-design.md:459,505`) that was never shipped.
- **The v5.0.0 relocation** told users to "move existing files from `docs/plans/` … if desired" (`RELEASE-NOTES.md:592`). The project itself did not, so two record locations coexist.
- **Release notes** are the only curated roll-up, maintained by hand.

## 8. Ideas to borrow and anti-patterns

**Borrow:**

1. **Delete scratch at the end, keep the decisions visible.**
   - What: a per-thread, git-ignored workspace with an identity line, deleted when the work closes. Its decisions are collected verbatim into the handoff message before deletion (`skills/subagent-driven-development/SKILL.md:473-485`; `scripts/sdd-workspace`).
   - Addresses #1 and #3: execution notes never become standing docs, so they cannot drift.
   - Fits the leaning: implementation reports in Antmay could be treated as scratch rather than kept files.
2. **Right-size the ceremony: only a heavy change gets a file** (`skills/brainstorming/SKILL.md:58-88`).
   - Addresses #1.
   - Refine: Superpowers breaks ties toward the heavier path (`:86`). Antmay would want the opposite tie-break for *standing* docs.
3. **A proportion check on generated docs.** "A plan longer than the code it describes has written the code instead", plus a self-review step comparing lengths (`skills/writing-plans/SKILL.md:157-161,175`). The measured payoff is in `RELEASE-NOTES.md:5`.
   - Addresses #2.
   - An analogue for Antmay: a delta or record longer than the code it explains is a smell.
4. **"Don't create for" list plus "automate the mechanical"** (`skills/writing-skills/SKILL.md:55-59`): project conventions go in the instructions file, and anything enforceable with a regex becomes a check, not prose.
   - Addresses #1 and #3.
   - Strongly supports the leaning ("save documentation for judgment calls").
5. **The code wins, and the doc says so.** Invariants first, a pointer to the live reference implementation, "read the files, not this table" (`docs/porting-to-a-new-harness.md:14-17,795`).
   - Supports the leaning: a navigation guide for a hard-to-explore area.
   - Caveat: the guide drifted anyway (section 4). Pointer docs still need a path-existence check.
6. **Structural checks that are cheap and useful:** referenced files exist, removed files stay removed, word budget, description form (`tests/diagnosing-superpowers/test-skill-structure.sh`).
   - Addresses #2 and #3 for skill packages.
   - Antmay could apply this to every skill, and to every path cited from `AGENTS.md`. Superpowers only did it for one skill.
7. **One source for the always-loaded context,** read at runtime by every entry point (`hooks/session-start:11`, `.pi/extensions/superpowers.ts:12`).
   - Addresses #3.
   - Antmay analogue: one generated `AGENTS.md` section instead of copies.
8. **Positive recipes over prohibitions for the shape of an output; no nuance clauses** (`skills/writing-skills/SKILL.md:463-476`).
   - Bears on #1 and #2. Inference: Antmay rules such as "admitted only where the code does not make it obvious" are prohibition-plus-nuance in form. A positive contract ("a record is exactly: X, Y, Z") may bind better.
9. **Descriptions are triggers, not summaries** (`skills/writing-skills/SKILL.md:150-158`).
   - Addresses #2.
   - Applies to Antmay's frontmatter-first listing in `consult-*`: the `description` should say *when to open* the doc, not restate it.
10. **Verification provenance stamps.** Example: "(V1 list verified against the installed OpenCode 1.18.x CLI's tool inventory …)" (`docs/README.opencode.md:172`).
    - Addresses #3 by telling the reader how stale a fact may be.
11. **Cheap version drift audit** (`scripts/bump-version.sh --audit`).
    - Addresses #3 for duplicated literals; the same pattern could cover duplicated paths or terms.

**Anti-patterns:**

1. **Dated work records in `docs/` with no retirement:**
   - 40 files, about 111k words; status lines that are stale or ad hoc; two record locations.
   - A test must police historical records (`tests/claude-code/test-worktree-path-policy.sh:58-60`).
   - Worsens #1, #2 and #3.
   - Supports Antmay keeping threads out of `docs/` and never cited. Suggests going further by keeping closed threads out of the default search path as well (inference).
2. **Budgets without enforcement.** Word targets in `writing-skills` are ignored by 14 of 15 skills, including the always-loaded one; the terminology rule is enforced for one skill only. Worsens #2.
3. **Duplicated facts in several docs:** the OpenCode mapping three times; porting guide tables that mirror manifests; README summaries of skill behavior (`README.md:309-321`) that went stale in the same release that changed the skill. Worsens #3. Supports the leaning: summaries of what code or skills do should not be written down.
4. **Standing guides with no link from the entry points.** `AGENTS.md` and `README.md` never link `docs/porting-to-a-new-harness.md` or `docs/testing.md`. Worsens #3, because no one reads them in the normal flow. Supports the leaning's idea that `AGENTS.md` should be the conditional index for any extra doc.
5. **Orphaned supporting files** (`skills/brainstorming/spec-document-reviewer-prompt.md`), found only by chance (`RELEASE-NOTES.md:15`). Worsens #3.
6. **Rationale only in release notes and chat.** Rulings die with the workspace, except for the chat message; the "why" lives in a 14k-word changelog. This argues *against* going fully lean: some decision capture that can be looked up by topic is still missing here.

## Evidence gaps

- **No git history** (single-commit clone), so how fast docs drift, and whether specs or plans were ever edited after landing, is inferred from content and release notes only.
- **`evals/` (superpowers-evals) is external and not in the clone.** I could not check whether any eval scenario covers doc or skill accuracy, or which "static gates" run in CI. No CI config exists in this repo; whether CI runs elsewhere (for example in the marketplace repos) is unknown.
- **I did not measure how often agents actually read `docs/superpowers/**`** in user projects. That old records get treated as live guidance is an inference from `test-worktree-path-policy.sh` and from brainstorming's "check files, docs, recent commits" (`skills/brainstorming/SKILL.md:123,130`).
- **Word counts use `wc -w`,** which includes frontmatter, code blocks and DOT graphs; token counts would differ.
- **Maintainer-held eval records** for `diagnosing-superpowers` are "kept … outside the repo" (`docs/testing.md:21`) and could not be reviewed.
