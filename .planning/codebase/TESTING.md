# Testing Patterns

**Analysis Date:** 2026-05-20

## Test Framework

**Runner:** None

**Assertion Library:** None

**Run Commands:** Not applicable

There is no automated test pipeline in this repository. The `AGENTS.md` file states explicitly:

> There is no build, test, or lint pipeline — this is a content repository.

## What "Testing" Means Here

Validation is **manual and editorial**. A skill is considered correct when a human reads the SKILL.md and confirms:

1. The frontmatter fields are present and internally consistent (`name` matches directory name, `version` is valid semver, `description` has a concrete trigger phrase).
2. The skill body is coherent and progressively disclosed (reader can follow the workflow without contradictions).
3. All four registration steps are complete (file exists, README entry, marketplace.json entry, VSCode scope entry).
4. For deliverable skills: the no-preamble constraint is encoded in both `## Output format` and `## Workflow`.

## Test File Organization

**Location:** No test files exist.

**Naming:** Not applicable.

## Validation Checklist (Manual)

When reviewing or editing a skill, verify the following manually:

**Frontmatter:**
- `name:` value matches the skill's directory name exactly
- `description:` contains a "Use when…" or "use only when…" trigger phrase
- `version:` follows semver and was bumped if behavior changed
- `metadata.author:` is `https://github.com/Jei-sKappa`

**Body:**
- Skill body is coherent end-to-end
- Numbered workflow steps are sequential and unambiguous
- Multi-agent skills specify subagent briefs, return contracts, and hard constraints
- "When context is thin" or equivalent graceful-degradation section is present when relevant

**Deliverable skills only** (meta-prompting, consult-the-expert, report-to-the-owner, brief-the-implementer):
- No-preamble rule stated in `## Output format` section
- No-preamble rule restated in `## Workflow` section
- Forbidden phrases listed explicitly

**Registration:**
- Entry exists in `README.md` under "Available skills" with `npx skills add` snippet
- Entry exists in `.claude-plugin/marketplace.json` under `JeisKappa-skills` plugin's `skills` array as `"./skills/<skill-name>"`
- Folder name present in `conventionalCommits.scopes` in `.vscode/settings.json` (alphabetically sorted)

## Mocking

Not applicable — no code, no dependencies, no I/O to mock.

## Fixtures and Factories

Not applicable.

## Coverage

**Requirements:** None enforced.

There is no coverage tooling. Coverage is bounded by the human reviewer's thoroughness when reading and confirming skill coherence.

## Test Types

**Unit Tests:** Not used.

**Integration Tests:** Not used. The closest equivalent is end-to-end manual testing: install the skill via `npx skills add Jei-sKappa/skills --skill <skill-name>` and exercise it in a live AI session to confirm behavior matches the skill's stated workflow.

**E2E Tests:** Not formal. Manual testing via `npx skills add …` install and invocation is the only runtime validation.

## Implicit Quality Gates

Though not automated, the repository has implicit quality gates enforced by convention:

- All four "When adding a new skill" steps must be complete before a skill is considered shippable (see `AGENTS.md` and `CONVENTIONS.md`)
- `conventionalCommits.scopes` in `.vscode/settings.json` serves as a secondary registration checklist — a skill missing from this array signals an incomplete addition
- `marketplace.json` must list every skill folder; a skill absent from this file will not appear in `npx skills list` under the correct heading
- README must contain an entry for every skill; a missing README entry means the skill is undiscoverable to users browsing the index

---

*Testing analysis: 2026-05-20*
