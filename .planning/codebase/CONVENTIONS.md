# Coding Conventions

**Analysis Date:** 2026-05-20

## Repository Nature

This is a **content repository**, not a code repository. There is no programming language, no build pipeline, no linter, and no formatter. All "conventions" are editorial rules governing SKILL.md files and repository structure. Validation is done by reading and confirming coherence, not by automated tooling.

## File Naming Patterns

**Skills:**
- Each skill lives at `skills/<skill-name>/SKILL.md`
- Directory name MUST match the `name:` field in the YAML frontmatter
- Directory names use kebab-case (e.g., `afk-exploration`, `brief-the-implementer`, `consult-the-expert`)
- Sub-references live at `skills/<skill-name>/references/*.md` (only for skills with supporting reference material)

**Root files:**
- `README.md` — index of all skills; updated when skills are added or removed
- `AGENTS.md` — authoritative agent guidance (symlinked as `CLAUDE.md`)
- `.claude-plugin/marketplace.json` — plugin registry for `vercel-labs/skills` CLI

**Registration files:**
- `.vscode/settings.json` — `conventionalCommits.scopes` array (alphabetically sorted); every skill folder name must appear here

## SKILL.md Frontmatter

Every `SKILL.md` starts with YAML frontmatter. Required fields:

```yaml
---
name: <kebab-case, matches directory name>
description: <one sentence: what it does + when to use it. The "use when…" trigger is what the harness matches against.>
metadata:
  author: https://github.com/Jei-sKappa
  version: <semver>
---
```

- `name` and directory name must match exactly
- `description` must include a concrete "Use when…" or "use only when…" trigger phrase
- `version` starts at `1.0.0` for new skills; bump on any meaningful behavioral change
- All existing skills use `https://github.com/Jei-sKappa` as the author value

## Skill Body Structure

There is no single mandated body structure — every skill is different. However, observed patterns across all skills:

**Section headings** use `##` for top-level sections within the skill body. Examples from existing skills:
- `## Tone` — voice and register guidelines
- `## Structure` — ordered list of output sections (verbatim section name requirement)
- `## Guidelines` — authoring principles and edge-case rules
- `## Output format` — shape of the deliverable
- `## Workflow` — numbered phases the agent follows
- `## When context is thin` — graceful degradation instructions
- `## Discipline` — hard constraints on the orchestrator
- `## Subagent briefs` — per-subagent prompt specs for multi-agent skills

**Ordered content in body sections:** Use numbered lists for sequential steps (workflow phases, structure sections). Use bullet lists for unordered sets (guidelines, constraints, options).

## Deliverable Skills Rule

Skills whose job is to produce a paste-ready artifact for the user (currently: `meta-prompting`, `consult-the-expert`, `report-to-the-owner`, `brief-the-implementer`) MUST encode the no-preamble constraint explicitly in the skill text. The rule must appear in both an `## Output format` section and the `## Workflow` section:

- Forbidden: "Sure, here is…", "Hope this helps.", chat-style framing, closing remarks
- Required: "The response IS the deliverable — no preamble, no closing remark."
- Example: `skills/consult-the-expert/SKILL.md` lines 40–41 and 44–46

Non-deliverable skills (e.g., `discussion-loop`, `afk-exploration`, `derive-spec`) do not carry this constraint.

## Multi-agent Skills

Skills with orchestrator/subagent patterns (`afk-exploration`, `derive-spec`) follow these conventions:

- Orchestrator never reads source directly — all reads go through subagents
- Subagents write to disk; orchestrator reads from disk (never from subagent reply)
- Subagent reply is acknowledgment only — file on disk is the only completion signal
- Each subagent gets a `## Subagent briefs` section with a self-contained brief per agent type
- Return contracts are explicit: subagent writes file, replies with 2–3 sentence summary + path only
- Hard constraints listed per subagent brief

## Output Paths Convention

Multi-agent skills write run artifacts under:
```
<cwd>/docs/<skill-name>/YYYY-MM-DD_NN/
```
- Date and per-day index separated by `_` (not `-`) — `_` makes the index visually distinct
- Zero-padded 2-digit day index (`01`, `02`, …)
- Existing topic subfolders use zero-padded 4-digit prefix for `afk-exploration` (`0001-<slug>/`)

## Version Bumping

Bump `version` in frontmatter on any meaningful change to a skill's behavior. No strict definition of "meaningful" — author judgment. New skills start at `1.0.0`.

## Import Organization

Not applicable — no source code files.

## Error Handling

Not applicable — no source code files.

## Logging

Not applicable — no source code files.

## Comments

Inline comments within SKILL.md bodies use parenthetical asides or the conventional markdown `>` blockquote for notes. There is no formal comment syntax.

## Commit Conventions

This repo follows [Conventional Commits](https://www.conventionalcommits.org/).

**Scoped commits** — used when change touches a single skill:
```
refactor(brief-the-implementer): …
fix(report-to-the-owner): …
feat(afk-exploration): …
```
The scope MUST be the skill's folder name. Valid scopes are listed in `.vscode/settings.json` under `conventionalCommits.scopes`.

**Unscoped commits** — used for repo-wide changes (multiple skills, `README.md`, `.claude-plugin/`, `AGENTS.md`):
```
chore: …
docs: …
feat: …
```

Never commit unless explicitly asked by the user.

## Checklist for Adding a New Skill

When creating a skill, all four steps are required:

1. Create `skills/<skill-name>/SKILL.md` with correct frontmatter (`version: 1.0.0`)
2. Add a section to `README.md` under "Available skills"
3. Add `"./skills/<skill-name>"` to `.claude-plugin/marketplace.json` under the appropriate plugin's `skills` array
4. Add the folder name to `conventionalCommits.scopes` in `.vscode/settings.json` (alphabetically sorted)

---

*Convention analysis: 2026-05-20*
