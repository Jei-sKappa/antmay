# AGENTS.md

This file provides guidance to AI Agents when working with code in this
repository.

## Update rule

Update `AGENTS.md` when:

- You make significant changes that needs to be remembered across session.
- You made a mistake that should not be repeated.
- The user told you a new rule that should be remembered.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## Repository purpose

`antmay` is the reference repository for the Modular Agentic Workflow — a suite of refined `SKILL.md` files authored by Jei-sKappa that carry a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk. Skills are distributed via [skills.sh](https://skills.sh) and installed by end users with:

```sh
npx skills add Jei-sKappa/antmay --skill <skill-name>
```

There is no build, test, or lint pipeline — this is a content repository. Validation happens by reading the markdown and confirming the skill's instructions are coherent and progressively disclosed.

General-purpose, context-agnostic skills (meta-prompting, handoff drafts, research helpers, and the like) live in the separate companion repository `Jei-sKappa/skills`, not here. This repository holds only the skills that serve the thread-based workflow.

## Layout

Skills live directly under `skills/`, grouped into eleven capability groups. Each skill is either a **user-invoked** entry point (a capability a person deliberately reaches for) or a **model-invoked primitive** (a bounded building block an entry point composes into):

```
skills/
├── capture-discussion/      discussion, open-thread, resolve-pending-decisions
├── finish-navigate/         archive-thread, finish, whats-next
├── implement/               implement, implement-plan, implement-plan-with-subagents
├── merge/                   merge-artifacts
├── plan/                    plan-brief, plan-strict
├── primitives/              allocate-thread, append-roadmap-feedback, emit-pending-decisions, emit-pending-review, update-implementation-report
├── propose/                 propose
├── reconcile/               reconcile-plan, reconcile-proposal, reconcile-roadmap, reconcile-spec
├── review/                  review-code, review-implementation, review-roadmap, review-spec
├── roadmap/                 materialize-roadmap-threads, roadmap
└── spec/                    spec
```

The five skills under `primitives/` are the model-invoked building blocks; every other active skill is a user-invoked entry point.

Canonical shared references and the sync tooling that mirrors them into individual skills live at the repo root:

```
shared/
├── references/                 canonical shared reference sources (e.g. workflows/{quick,standard,roadmap}.md)
└── manifest.yaml               flat map: skill path → list of shared/references/ sources to mirror into it
scripts/
└── sync-shared-references.mjs  mirrors the canonical sources into each declaring skill's references/
```

Rules:

- Every skill lives at `skills/<group>/<skill-name>/SKILL.md`. The leaf directory name MUST match the `name:` field in the frontmatter.
- `README.md` — index of available skills; update when adding/removing a skill (use the full nested path in links).
- `.claude-plugin/marketplace.json` — registers this repo as a `vercel-labs/skills` plugin, so installs are grouped under a single named heading, `Antmay`, in `npx skills list`. There is exactly one plugin entry, named `Antmay`, whose `skills` array lists every skill folder as `./skills/<group>/<skill-name>`. Every skill folder MUST appear in that array. Adding any skill means adding its path to the `Antmay` plugin's `skills` array.

## SKILL.md format

Every skill file starts with YAML frontmatter, then the skill body. Mirror the structure of `skills/propose/propose/SKILL.md`:

```yaml
---
name: <kebab-case, matches directory name>
description: <one sentence: what it does + when to use it. The "use when…" trigger is what the harness matches against, so make it concrete.>
disable-model-invocation: true   # user-invoked entry points ONLY — omit on primitives
metadata:
  author: https://github.com/Jei-sKappa
  version: <semver>
---
```

There is no specific format for the skill body: every skill is different.

Bump `version` in the frontmatter on any meaningful change to a skill's behavior. New skills start at `0.1.0`.

The `disable-model-invocation` key encodes the skill's invocation role — see "Invocation roles" below.

## Invocation roles

Every active skill is either a user-invoked entry point or a model-invoked primitive, and the role is declared identically across both harnesses. Every active skill — both roles — ships an `agents/openai.yaml` carrying a universal `interface:` block of Codex-style picker metadata: `display_name` (the skill name in title case) and `short_description` (a terse 4–7-word human-facing picker line, written fresh — never a copy of the `SKILL.md` `description`). The interface block is universal and never encodes the role; the `policy` block is what encodes it, in lockstep with `disable-model-invocation`:

- **User-invoked entry points** carry `disable-model-invocation: true` in `SKILL.md` frontmatter AND carry `policy.allow_implicit_invocation: false` beneath the interface block in their `agents/openai.yaml`. Their descriptions are concise, human-facing summaries.
- **Model-invoked primitives** (the five under `primitives/`) omit both role restrictions — the `disable-model-invocation` key and the `policy` block — carrying the interface block alone; that omission IS the model-invocable configuration. Their descriptions open with a bounded precondition (the exact situation in which a caller should invoke them), because the model routes to them on that description.

The two harness declarations must never diverge: a skill must never be user-only in one harness and implicitly invocable in the other. Whenever you flip a skill's role or add a new one, set the `SKILL.md` key and the `agents/openai.yaml` policy together.

## Skill composition

Active skills form a coherently installed suite, not isolated files. They compose through invocation and nothing else:

- A user-invoked entry point MAY invoke a model-invoked primitive by naming it in prose as `/skill-name`.
- Primitives never invoke entry points. Invocation is one-way; there are no dependency cycles.
- A skill never reads another skill's `references/` folder (or any other file inside another skill's directory). Invocation is the ONLY permitted cross-skill coupling.
- The suite is designed and tested as a set installed together. A skill referenced by an entry point that is not installed is an installation error, not a runtime fallback the invoking skill must handle.

Still-valid authoring guidance for every skill body:

- Keep `description` to one sentence (entry points) or one bounded-precondition sentence (primitives) that says what the skill does and when to trigger it. Do not include history, taxonomy, sibling counts, version names, project roadmap context, or implementation notes.
- Keep the body focused on instructions for the invoked agent. Do not add "when to use this skill" sections — routing belongs in the frontmatter description.
- When a skill body points at one of its own reference files, cite the full direct skill-relative path (e.g. `references/formats/discussion-point.md`) — never an indirect description like "the `discussion-point.md` format under `references/formats/`", and never a bare folder.
- Do not leak repo-maintenance context into the body: no project-internal planning labels, decision IDs, phase numbers, internal version labels, or explanations of how this repository is organized, unless the invoked agent genuinely needs that fact to do the skill's own job. If a constraint matters at runtime, restate it plainly as behavior the agent must follow. Artifact decision-log IDs such as `DR<N>` are allowed when they are part of the skill's emitted artifact format.
- Status naming is fixed suite-wide. The closing `Outcome: DONE | BLOCKED | REFUSED — <reason or pointer>` line a completion-oriented skill ends with is the **terminal outcome** — never call it a "run status", "workflow status", or any other status phrase. A vocabulary a skill defines for its own caller/callee topology (e.g. an orchestrator's subagent reply tokens and lane verdicts) is **skill-local return tokens** — never called a status or an outcome, never emitted in the terminal outcome, and never reused outside the owning skill. A completed *thread's* lasting artifact is its **final deliverable**, not its "terminal outcome". Canonical definition: `docs/skill-authoring.md` (`## Terminal outcome` and `## Internal progress and local return contracts`).
- Only skills that emit the terminal outcome mention it. A skill with none (dialogue-driven, one-shot deliverable, every primitive) stays silent about the protocol AND about its own posture label — no "emit no outcome line" negation, no "this is a dialogue-driven skill" framing: an agent never told the vocabulary exists cannot emit it, and a negation only teaches the concept it forbids.

## Describe the current state, never the diff

When an edit replaces design A with design B, the resulting skill body or document must describe B as if A had never existed. Never write a negation or before/after contrast whose only referent is the removed design — "X is no longer …", "there is no X anymore", "unlike before, …": once A is removed it is not materially written anywhere, so a fresh reader cannot know it existed, and the sentence's only effect is to teach a dead concept while reading as a changelog. Test every negative statement you keep or add: does it forbid something a fresh reader with no memory of the old design would plausibly do anyway? A live guardrail against natural drift ("never treat the sequence as a checklist", "add no owner field") passes the test; a contrast with a previous version of the text does not.

## Shared references

Some skills ship copies of the same canonical reference (for example the workflow templates under `workflows/` that `whats-next` uses, or the discussion formats). These are NOT hand-maintained per skill:

- Canonical shared files live in `shared/references/` and are declared in `shared/manifest.yaml` (a strictly flat map: each key is a skill path, each value is a list of sources relative to `shared/references/`).
- Edit the canonical source under `shared/references/`, then run `node scripts/sync-shared-references.mjs`. The script mirrors each declared source to the same relative path under the skill's `references/` folder, owning exactly the files the manifest names: it deletes and rewrites precisely those, leaving hand-authored skill-local references untouched. Removing a manifest entry does not delete its previously generated copy — delete that orphan by hand.
- NEVER hand-edit a generated copy under a skill's `references/` (any file the manifest declares for that skill). Those copies are generated, committed, and flow into distribution unchanged. Change the canonical source and re-run the script instead.

## When adding a new skill

1. Decide which group the skill belongs to: `capture-discussion`, `finish-navigate`, `implement`, `merge`, `plan`, `primitives`, `propose`, `reconcile`, `review`, `roadmap`, or `spec`. If none fits, propose a new group folder and document it in this file's Layout section in the same change.
2. Decide the invocation role. If the skill is a capability a person deliberately reaches for, it is a user-invoked entry point. Only add it under `primitives/` when it is a bounded building block an entry point composes into AND it clears the extraction bar — it is genuinely reused by more than one entry point (or is the single well-defined mechanism an entry point delegates to) rather than inlined logic. Do not create a primitive for a one-off.
3. Create `skills/<group>/<skill-name>/SKILL.md` with the frontmatter shown above (start at `version: 0.1.0`). Every skill ships `agents/openai.yaml` with a universal `interface:` block (`display_name` in title case, a fresh terse `short_description`). For a user-invoked entry point, set `disable-model-invocation: true` in `SKILL.md` AND add `policy.allow_implicit_invocation: false` beneath the interface block. For a primitive, omit both role restrictions (carry the interface block alone) and open the description with a bounded precondition. The two harness declarations must never diverge.
4. Add a section to `README.md` under "Available skills" with the description and the `npx skills add …` install snippet, linking to the full nested path.
5. Register the skill folder in `.claude-plugin/marketplace.json` by adding `./skills/<group>/<skill-name>` to the single `Antmay` plugin's `skills` array.
6. Add the skill's folder name (the leaf, not the full path) to `conventionalCommits.scopes` in `.vscode/settings.json` (keep the array sorted alphabetically) so it shows up as a commit scope.

## Commits

Never commit unless explicitly asked to do so.

This repo follows [Conventional Commits](https://www.conventionalcommits.org/). When the change is scoped to a single skill, the commit scope MUST be that skill's folder name — e.g. `refactor(propose): …`, `fix(reconcile-spec): …`. The list of valid skill scopes lives in `conventionalCommits.scopes` inside `.vscode/settings.json`; if a new skill exists on disk but is missing from that array, add it there in the same commit (see "When adding a new skill" above).

Repo-wide changes (touching multiple skills, `README.md`, `.claude-plugin/`, `AGENTS.md`, etc.) should omit the scope: `chore: …`, `docs: …`, `feat: …`.

## Workflow Conventions

This repository is the reference home of the Modular Agentic Workflow, the ruleset for newly opened threads and their workflow artifacts.

The canonical reference — the skill catalog and workflow model, thread layout, decisions, archive lifecycle, write authority, cross-thread references, and skill-authoring conventions — lives at `docs/README.md`, which links the companion documents `docs/thread-model.md`, `docs/skill-authoring.md`, and the three workflow docs under `docs/workflows/`. Read it before editing the workflow itself or writing/editing an artifact that belongs to an existing thread.

This section is a POINTER — it intentionally does NOT duplicate the rules. Edit the canonical docs under `docs/` for any rule change; this section only changes if the reference doc set itself moves or splits.
