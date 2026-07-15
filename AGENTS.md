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

A personal collection of refined `SKILL.md` files authored by Jei-sKappa. Skills are distributed via [skills.sh](https://skills.sh) and installed by end users with:

```sh
npx skills add Jei-sKappa/skills --skill <skill-name>
```
There is no build, test, or lint pipeline — this is a content repository. Validation happens by reading the markdown and confirming the skill's instructions are coherent and progressively disclosed.

## Layout

Skills live under one of two top-level buckets, and within `skills/workflow/` are grouped into fifteen capability groups. Each active skill is either a **user-invoked** entry point (a capability a person deliberately reaches for) or a **model-invoked primitive** (a bounded building block an entry point composes into):

```
skills/
├── deprecated/                  retired skills kept on disk: adjust-plan-granularity, capture-inbox, discussion-loop, record-verdict, review-decision-document, review-lossless-mapping, seeded-discussion
└── workflow/                    all active skills, grouped into fifteen capability groups
    ├── capture-discussion/      discussion, open-thread, open-ticket, resolve-pending-decisions
    ├── documentation/           take-snapshot
    ├── finish-navigate/         archive-thread, finish, whats-next
    ├── handoff/                 brief-the-recipient, consult-the-expert, report-to-the-owner
    ├── implement/               implement, implement-plan, implement-plan-with-subagents
    ├── merge/                   merge-artifacts
    ├── plan/                    plan-brief, plan-strict
    ├── primitives/              allocate-thread, append-roadmap-feedback, emit-pending-decisions, emit-pending-review, update-implementation-report
    ├── propose/                 propose
    ├── reconcile/               reconcile-plan, reconcile-proposal, reconcile-roadmap, reconcile-spec
    ├── research/                afk-exploration, the-librarian
    ├── review/                  review-code, review-implementation, review-roadmap, review-spec
    ├── roadmap/                 materialize-roadmap-threads, roadmap
    ├── spec/                    spec
    └── support/                 meta-prompting
```

The five skills under `primitives/` are the model-invoked building blocks; every other active skill is a user-invoked entry point.

Canonical shared references and the sync tooling that mirrors them into individual skills live at the repo root:

```
shared/
├── references/                 canonical shared reference sources (e.g. workflows/{quick,standard,roadmap}.md)
└── manifest.yaml               flat map: skill path → list of shared/references/ sources to mirror into it
scripts/
└── sync-shared-references.mjs  regenerates each declaring skill's references/shared/ from the canonical sources
```

The repo also contains a Raycast extension that re-uses the same skills:

```
raycast-extension/              local Raycast client (Select Skill command)
├── assets/skills.json          generated — see "Raycast extension" below
└── scripts/
    └── sync-skills-to-raycast.mjs  rebuilds assets/skills.json from ../skills
```

Rules:

- Every skill lives at `skills/<bucket>/[<group>/]<skill-name>/SKILL.md`. The leaf directory name MUST match the `name:` field in the frontmatter.
- `README.md` — index of available skills; update when adding/removing a skill (use the full nested path in links).
- `.claude-plugin/marketplace.json` — registers this repo as a `vercel-labs/skills` plugin per `skills/workflow/` group plus one for `skills/deprecated/`, so installs are grouped under a named heading (e.g. `JeisKappa Plan`, `JeisKappa Handoff`) instead of `General` in `npx skills list`. Every skill folder MUST be listed in the plugin matching its group's `skills` array as `./skills/<bucket>/[<group>/]<skill-name>`. To introduce a new group/heading, add a new folder under `skills/workflow/` AND add the matching plugin entry (`JeisKappa-<folder-name>`) to the `plugins` array. **Plugin order**: entries in `plugins` MUST be sorted alphabetically by `name`, with the single exception that `JeisKappa-deprecated` is always last. Display rule: the CLI splits `name` on `-`, uppercases the first char of each segment, then joins with spaces — so `JeisKappa-handoff` renders as `JeisKappa Handoff`. Dashes cannot survive into the displayed title.

## SKILL.md format

Every skill file starts with YAML frontmatter, then the skill body. Mirror the structure of `skills/workflow/handoff/consult-the-expert/SKILL.md`:

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

Bump `version` in the frontmatter on any meaningful change to a skill's behavior. New skills start at `1.0.0`.

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
- Do not leak repo-maintenance context into the body: no project-internal planning labels, decision IDs, phase numbers, V1/V2/V3 naming, or explanations of how this repository is organized, unless the invoked agent genuinely needs that fact to do the skill's own job. If a constraint matters at runtime, restate it plainly as behavior the agent must follow. Artifact decision-log IDs such as `D<N>` are allowed when they are part of the skill's emitted artifact format.

## Shared references

Some skills ship copies of the same canonical reference (currently the `## Suggested workflow` templates that `open-thread` and `roadmap` both use). These are NOT hand-maintained per skill:

- Canonical shared files live in `shared/references/` and are declared in `shared/manifest.yaml` (a strictly flat map: each key is a skill path, each value is a list of sources relative to `shared/references/`).
- Edit the canonical source under `shared/references/`, then run `node scripts/sync-shared-references.mjs`. The script wipes and re-creates each declaring skill's `references/shared/` folder from the canonical sources.
- NEVER hand-edit any `references/shared/` folder inside a skill. Those copies are generated, committed, and flow into distribution and the Raycast manifest unchanged. Change the canonical source and re-run the script instead.

## Deliverable skills — no preamble

Skills whose job is to produce a deliverable for the user to copy, paste, or hand off elsewhere (currently: `meta-prompting`, `consult-the-expert`, `report-to-the-owner`, `brief-the-recipient`) must enforce that the chat response IS the deliverable. No "Sure, here is…", no chat-style framing, no closing remark like "Hope this helps." Encode the rule explicitly in the skill's Tone or Output format section so a fresh model session honors it without relying on the harness picking up convention.

## When adding a new skill

1. Decide which bucket the skill belongs to — `workflow/` (active) or `deprecated/` (retired). For `workflow/`, also decide which group: `capture-discussion`, `documentation`, `finish-navigate`, `handoff`, `implement`, `merge`, `plan`, `primitives`, `propose`, `reconcile`, `research`, `review`, `roadmap`, `spec`, or `support`. If none fits, propose a new group folder and document it in this file's Layout section in the same change.
2. Decide the invocation role. If the skill is a capability a person deliberately reaches for, it is a user-invoked entry point. Only add it under `primitives/` when it is a bounded building block an entry point composes into AND it clears the extraction bar — it is genuinely reused by more than one entry point (or is the single well-defined mechanism an entry point delegates to) rather than inlined logic. Do not create a primitive for a one-off.
3. Create `skills/<bucket>/[<group>/]<skill-name>/SKILL.md` with the frontmatter shown above (start at `version: 1.0.0`). Every skill ships `agents/openai.yaml` with a universal `interface:` block (`display_name` in title case, a fresh terse `short_description`). For a user-invoked entry point, set `disable-model-invocation: true` in `SKILL.md` AND add `policy.allow_implicit_invocation: false` beneath the interface block. For a primitive, omit both role restrictions (carry the interface block alone) and open the description with a bounded precondition. The two harness declarations must never diverge.
4. Add a section to `README.md` under "Available skills" with the description and the `npx skills add …` install snippet, linking to the full nested path.
5. Register the skill folder in `.claude-plugin/marketplace.json` under the plugin matching its group's `skills` array as `./skills/<bucket>/[<group>/]<skill-name>` — there is one plugin per workflow group (e.g. `JeisKappa-primitives`, `JeisKappa-reconcile`, `JeisKappa-roadmap`) plus `JeisKappa-deprecated`. Keep `plugins` sorted alphabetically by `name` with `JeisKappa-deprecated` last. If the group is new, also add a new plugin entry named `JeisKappa-<folder-name>` in the same change.
6. Add the skill's folder name (the leaf, not the full path) to `conventionalCommits.scopes` in `.vscode/settings.json` (keep the array sorted alphabetically) so it shows up as a commit scope.

## Raycast extension

`raycast-extension/` is a Raycast client over these skills. It is **derived**: nothing inside `raycast-extension/assets/skills.json` is hand-edited — the file is regenerated from `skills/**/SKILL.md` by `raycast-extension/scripts/sync-skills-to-raycast.mjs` (the sync runs automatically as part of `npm run dev` and `npm run build` inside `raycast-extension/`).

Rules when working on it:

- `skills/` stays the source of truth. The sync script strips YAML frontmatter and writes `name`, `title`, `group`, `groupTitle`, `description`, `version`, `sourcePath`, `body`, and a `references` array (each entry: `{path, bytes, body}`) into one manifest. If you need new metadata to surface in Raycast, add it in the sync script — never edit `assets/skills.json` directly.
- References are embedded in the wrapped output inside `<instruction>` at the TOP, then the skill body, then the user's prompt at the bottom — long-context-first layout, optimized for LLM attention. If a skill's `references/` folder grows or changes, the next `npm run sync` (or auto-sync via `npm run dev`/`npm run build`) picks it up.
- The extension folder is gitignored where it must be (`node_modules/`, `raycast-env.d.ts`, `assets/skills.json`). Do not commit those; the regeneration happens on demand.
- The sole command is `select-skill` (`src/select-skill.tsx`). It wraps the skill body inside `<instruction>…</instruction>`, optionally appends the user's prompt, and copies the result to the clipboard (`⌘⏎` on the list skips the prompt and copies just the wrapped instruction).
- The extension icon at `raycast-extension/assets/icon.png` is a 512×512 PNG. Swap in a replacement by overwriting that file.

## Commits

Never commit unless explicitly asked to do so.

This repo follows [Conventional Commits](https://www.conventionalcommits.org/). When the change is scoped to a single skill, the commit scope MUST be that skill's folder name — e.g. `refactor(brief-the-recipient): …`, `fix(report-to-the-owner): …`. The list of valid skill scopes lives in `conventionalCommits.scopes` inside `.vscode/settings.json`; if a new skill exists on disk but is missing from that array, add it there in the same commit (see "When adding a new skill" above).

Repo-wide changes (touching multiple skills, `README.md`, `.claude-plugin/`, `AGENTS.md`, etc.) should omit the scope: `chore: …`, `docs: …`, `feat: …`.

## V3 Workflow Conventions

This repo is the home of the Modular Agentic Workflow V3 — the **active ruleset for all newly opened threads**. The canonical reference for V3 workflow rules — the skill catalog and workflow model, thread layout, decisions, archive lifecycle, write authority, cross-thread references, and skill-authoring conventions — lives at `docs/project/v3/README.md`, which links the companion documents `thread-model.md`, `skill-authoring.md`, and the three workflow docs under `docs/project/v3/workflows/`. Read it before opening a thread or writing/editing any workflow artifact under `docs/threads/<thread>/`.

V1 (`docs/workflow/v1/`) and V2 (`docs/workflow/v2/`) remain the grandfathered references for their own pre-V3 threads only — never edited, never migrated, never mixed with V3 (see the sections below).

This section is a POINTER — it intentionally does NOT duplicate the rules. Edit the canonical docs under `docs/project/v3/` for any rule change; this section only changes if the V3 reference doc set itself moves or splits.

## V2 Workflow Conventions

This repo was the home of the Modular Agentic Workflow V2. The canonical reference for V2 workflow rules — thread layout, filename grammar, lifecycle and immutability, tiers, the spine, discussions, reviews, and tracker integration — lives at `docs/workflow/v2/README.md`, which links the eight companion rule docs under `docs/workflow/v2/`. Read it before writing or editing any workflow artifact belonging to a V2 thread.

V2 is now grandfathered: it applies to pre-V3 threads only — never edited, never migrated, never mixed with V3. New threads use V3 (see "V3 Workflow Conventions" above).

This section is a POINTER — it intentionally does NOT duplicate the rules. Edit the canonical docs under `docs/workflow/v2/` for any rule change; this section only changes if the V2 reference doc set itself moves or splits.

## V1 Workflow Conventions

This repo is the home of the Modular Agentic Workflow V1. The canonical reference for V1 workflow rules — thread layout, filename grammars, immutability — lives at `docs/workflow/v1/README.md`. Read it before writing or editing any workflow artifact under `docs/threads/<thread>/`.

Three things follow from V1:

1. **Thread storage** — All V1 workflow artifacts live under `docs/threads/<YYMMDDHHMMSSZ-slug>/` using the folder set defined in `docs/workflow/v1/thread-layout.md`. Nothing else writes there.
2. **Filename grammar** — Every artifact filename uses the record or versioned grammar in `docs/workflow/v1/filename-grammar.md`, including a mandatory artifact-type suffix.
3. **Immutability** — Emitted versioned and record artifacts are not edited; produce a new version or new record instead. See `docs/workflow/v1/immutability.md` for the ambiguous-reference resolution rule (ask the user — never silently pick "latest").

Drafts under any thread's `.wip/` folder are gitignored and editable until the owning skill emits them.

This section is a POINTER — it intentionally does NOT duplicate the rules. Edit the canonical docs under `docs/workflow/v1/` for any rule change; this section only changes if the V1 reference doc set itself moves or splits.
