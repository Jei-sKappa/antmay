# AGENTS.md — skill suite

This file provides guidance to AI Agents working on the skill suite under
`suite/`. Paths below are `suite/`-relative, and the scripts are meant to run
from `suite/`; the few files that live at the repository root say so explicitly.

## Update rule

This file is the memory for the skill suite. While working under `suite/`,
update this file — not the root one, not the CLI's — when:

- You make significant changes that needs to be remembered across session.
- You made a mistake that should not be repeated.
- The user told you a new rule that should be remembered.

A fact that holds for the CLI too, or for the repository as a whole, belongs in
the root `AGENTS.md` instead. Every fact lives in exactly one of the three
files.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## Purpose

The suite is the reference implementation of the Antmay method — refined `SKILL.md` files authored by Jei-sKappa that carry a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk. Skills are distributed via [skills.sh](https://skills.sh) and installed by end users with:

```sh
npx skills add Jei-sKappa/antmay --skill <skill-name>
```

The skill content has no build or lint pipeline: validation happens by reading the markdown and confirming the skill's instructions are coherent and progressively disclosed. Its one mechanical gate is `node scripts/check-marketplace-skills.mjs`, which protects the distribution manifest (see Layout).

General-purpose, context-agnostic skills (meta-prompting, handoff drafts, research helpers, and the like) live in the separate companion repository `Jei-sKappa/skills`, not here. This repository holds only the skills that serve the thread-based method.

## Layout

Skills live under `skills/`, grouped into eleven capability groups. Each skill is either a **user-invoked** entry point (a capability a person deliberately reaches for) or a **model-invoked primitive** (a bounded building block an entry point composes into):

```
skills/
├── capture-discussion/      discussion, open-thread, open-ticket, resolve-pending-decisions
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

Canonical shared references, the sync tooling that mirrors them into individual skills, and the suite's maintenance scripts sit alongside the skills:

```
shared/
├── references/                  canonical shared reference sources (e.g. recipes/{quick,standard,roadmap}.md)
└── manifest.yaml                flat map: skill path → list of shared/references/ sources to mirror into it
scripts/
├── sync-shared-references.mjs   mirrors the canonical sources into each declaring skill's references/
└── check-marketplace-skills.mjs asserts marketplace.json and skills/ agree
```

Rules:

- Every skill lives at `skills/<group>/<skill-name>/SKILL.md`. The leaf directory name MUST match the `name:` field in the frontmatter.
- The repo-root `README.md` — index of available skills; update when adding/removing a skill (use the full nested path in links).
- The repo-root `.claude-plugin/marketplace.json` — registers this repo as a `vercel-labs/skills` plugin, so installs are grouped under a single named heading, `Antmay`, in `npx skills list`. There is exactly one plugin entry, named `Antmay`; it sets `"source": "./suite"`, and its `skills` array lists every skill folder as `./skills/<group>/<skill-name>`, resolved against that source. Every skill folder MUST appear in that array.
- That array is what makes the skills installable at all. The `skills` CLI scans a fixed set of root-relative directories (the repo root, a root-level `skills/`, the per-agent skill dirs) and then the parent directory of every path the array names; because the suite lives under `suite/`, nothing but the manifest finds it. A skill missing from the array is not a cosmetic grouping bug — it silently disappears from `npx skills add`, with no error, since the CLI's recursive fallback scan only runs when discovery found nothing at all.
- Run `node scripts/check-marketplace-skills.mjs` after adding, removing, renaming, or moving a skill. It fails when the manifest and `skills/` disagree in either direction, and when two skills share a frontmatter `name:` (discovery de-duplicates on that field and would silently drop one).

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

Authoring guidance for every skill body:

- Keep `description` to one sentence (entry points) or one bounded-precondition sentence (primitives) that says what the skill does and when to trigger it. Do not include history, taxonomy, sibling counts, version names, project roadmap context, or implementation notes.
- Keep the body focused on instructions for the invoked agent. Do not add "when to use this skill" sections — routing belongs in the frontmatter description.
- When a skill body points at one of its own reference files, cite the full direct skill-relative path (e.g. `references/formats/discussion-point.md`) — never an indirect description like "the `discussion-point.md` format under `references/formats/`", and never a bare folder.
- **Conditional instructions longer than a line belong in a reference file, not in the body.** When a block of instructions applies only in a specific situation — a ticket reference was supplied, the thread has a roadmap parent — and it runs to more than a short single instruction, move it into the skill's own `references/` folder and leave a one-line pointer in the body that names the condition and cites the file. `open-thread`'s ticket input and the roadmap-descendant feedback in the `implement` skills are the pattern to follow. Every invocation then pays one line for a situation most invocations are not in, and the agent reads the detail exactly when the condition holds. Judgement lives in two places: a genuinely one-line conditional stays inline, because a pointer would cost as much as the instruction; and a condition that in practice holds on every invocation is not conditional at all, so it stays in the body. Such a file is an ordinary hand-authored skill-local reference — it only becomes a shared reference when a second skill needs the same content.
- Do not leak repo-maintenance context into the body: no project-internal planning labels, decision IDs, phase numbers, internal version labels, or explanations of how this repository is organized, unless the invoked agent genuinely needs that fact to do the skill's own job. If a constraint matters at runtime, restate it plainly as behavior the agent must follow. Artifact decision-log IDs such as `DR<N>` are allowed when they are part of the skill's emitted artifact format.
- Status naming is fixed suite-wide. The closing `Outcome: DONE | BLOCKED | REFUSED — <reason or pointer>` line a completion-oriented skill ends with is the **terminal outcome** — never call it a "run status", "stage status", or any other status phrase. A vocabulary a skill defines for its own caller/callee topology (e.g. an orchestrator's subagent reply tokens and lane verdicts) is **skill-local return tokens** — never called a status or an outcome, never emitted in the terminal outcome, and never reused outside the owning skill. A completed *thread's* lasting artifact is its **final deliverable**, not its "terminal outcome". Canonical definition: the repo-root `docs/skill-authoring.md` (`## Terminal outcome` and `## Internal progress and local return contracts`).
- Only skills that emit the terminal outcome mention it. A skill with none (dialogue-driven, one-shot deliverable, every primitive) stays silent about the protocol AND about its own posture label — no "emit no outcome line" negation, no "this is a dialogue-driven skill" framing: an agent never told the vocabulary exists cannot emit it, and a negation only teaches the concept it forbids.

Skill bodies and every document in this repository also follow "Describe the current state, never the diff" — see the root `AGENTS.md`.

## Shared references

Some skills ship copies of the same canonical reference (for example the recipe templates under `recipes/` that `whats-next` uses, or the discussion formats). Those copies are generated, not hand-maintained per skill. The contract — the canonical sources, the flat manifest, what the sync owns and what it leaves alone — is defined in the repo-root `docs/skill-authoring.md`. Working here:

- The workflow is to edit the canonical source under `shared/references/`, then run `node scripts/sync-shared-references.mjs`.
- NEVER hand-edit a generated copy under a skill's `references/` — any file `shared/manifest.yaml` declares for that skill. Change the canonical source and re-run the script instead.

## When adding a new skill

1. Decide which group the skill belongs to: `capture-discussion`, `finish-navigate`, `implement`, `merge`, `plan`, `primitives`, `propose`, `reconcile`, `review`, `roadmap`, or `spec`. If none fits, propose a new group folder and document it in this file's Layout section in the same change.
2. Decide the invocation role. If the skill is a capability a person deliberately reaches for, it is a user-invoked entry point. Only add it under `primitives/` when it is a bounded building block an entry point composes into AND it clears the extraction bar — it is genuinely reused by more than one entry point (or is the single well-defined mechanism an entry point delegates to) rather than inlined logic. Do not create a primitive for a one-off.
3. Create `skills/<group>/<skill-name>/SKILL.md` with the frontmatter shown above (start at `version: 0.1.0`). Every skill ships `agents/openai.yaml` with a universal `interface:` block (`display_name` in title case, a fresh terse `short_description`). For a user-invoked entry point, set `disable-model-invocation: true` in `SKILL.md` AND add `policy.allow_implicit_invocation: false` beneath the interface block. For a primitive, omit both role restrictions (carry the interface block alone) and open the description with a bounded precondition. The two harness declarations must never diverge.
4. Add a section to the repo-root `README.md` under "Available skills" with the description and the `npx skills add …` install snippet, linking to the full nested path.
5. Register the skill folder in the repo-root `.claude-plugin/marketplace.json` by adding `./skills/<group>/<skill-name>` to the single `Antmay` plugin's `skills` array. Skip this and the skill ships uninstallable.
6. Add the skill's folder name (the leaf, not the full path) to `conventionalCommits.scopes` in the repo-root `.vscode/settings.json` (keep the array sorted alphabetically) so it shows up as a commit scope.
7. Run `node scripts/check-marketplace-skills.mjs` and confirm it passes.
