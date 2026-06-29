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
There is no build, test, or lint pipeline — this is a content repository. Validation happens by reading the markdown and confirming the skill's instructions are coherent and progressively disclosed, plus the freshness check described under "Authoring model".

## Authoring model — edit templates, never `SKILL.md`

**Nothing under `skills/workflow/` is hand-edited.** Every active skill folder — the `SKILL.md` itself plus any `references/` it carries — is a GENERATED output, materialized from a template under `.jastr/workflow/templates/<skill>/`. The files committed under `skills/workflow/**` are build artifacts; editing them directly is wrong and will be overwritten on the next regeneration.

To change a skill: edit its `.jastr/workflow/templates/<skill>/TEMPLATE.md` (or a file under that template's `references/`, or a shared partial it includes), then regenerate (see "Regenerating skills" below). The same applies to adding or removing a skill: author/remove the template and regenerate.

### Catalog structure

`.jastr/workflow/` is a single jastr group, marked by a `.jastrgroup` file (its contents are ignored — the file's presence is the marker). There is **no `config.yml`**. Inside the group:

- `partials/` — shared sections, each a standalone `.md` file. Templates pull them in with `::include{root="group", path="partials/<name>.md"}`.
- `templates/<skill>/TEMPLATE.md` — one template per skill (one standalone template each; see "Authoring model tier" below). The `<skill>` segment matches the skill's folder leaf and its `name:` frontmatter.
- `templates/<skill>/references/` — present only for reference-bearing skills; mirrored verbatim into the generated skill folder.

### Regenerating skills

Skills are rendered by the jastr CLI, resolved through the `JASTR_BIN` environment variable. **Never** hard-code a checkout path and **never** use a stale `jastr-dev` on `PATH`.

- `JASTR_BIN` default (repo-relative): `node .library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js`. `.library/` is gitignored, so the binary is a LOCAL build artifact that is never committed — each maintainer builds it locally and, if needed, overrides `JASTR_BIN` to point at their own build.
- Rebuild recipe: `cd .library/sources/Jei-sKappa_jastr && bun install && bun run build`. The required floor is version `0.1.0 (6674fd3)` or later, which must expose `generate agent-skill --mode` (inline-capable rendering).
- `scripts/generate-skills.sh` regenerates every skill in inline mode (default mode) and mirrors each template's `references/` into the skill folder, making the skill folder an exact copy of its template.
- `scripts/generate-skills.sh --check` gates freshness without mutating anything: it exits non-zero — naming the offending skill — when a skill is stale, missing, or has drifted/orphaned references.

### Authoring model tier

The current model is **tier "C": one standalone template per skill** — no variants, no `config.yml`. Consider promoting a family to **tier "B": one template + variants** (a shared base parametrized per sibling) when EITHER:

- sibling templates have converged to a mostly-parametrized-identical body (the differences are values, not structure), OR
- the same logical section has had to be edited across 3+ siblings in a single change (a C→B upgrade trigger — duplicated edits are the signal that the body wants to be one parametrized template plus variants).

## Layout

Skills live under one of two top-level buckets, and within `skills/workflow/` are grouped by spine phase / overlay module. The `skills/workflow/**` tree is generated (see "Authoring model"); the authoring source mirrors this grouping under `.jastr/workflow/templates/`:

```
skills/
├── deprecated/                  retired skills kept on disk: capture-inbox, discussion-loop, review-decision-document
└── workflow/                    all active skills, grouped by spine phase / overlay module
    ├── capture-discussion/      open-thread, open-ticket, discussion, seeded-discussion
    ├── propose/                 propose
    ├── spec/                    spec
    ├── plan/                    plan-loose, plan-strict, adjust-plan-granularity
    ├── implement/               implement, implement-plan, implement-plan-with-subagents
    ├── review/                  review-{proposal,spec,plan,implementation,code}, review-lossless-mapping
    ├── merge/                   merge-artifacts
    ├── finish-navigate/         finish, record-verdict, whats-next
    ├── research/                afk-exploration, the-librarian
    ├── documentation/           take-snapshot
    ├── handoff/                 brief-the-recipient, consult-the-expert, report-to-the-owner
    └── support/                 meta-prompting
```

The repo also contains a Raycast extension that re-uses the same skills:

```
raycast-extension/              local Raycast client (Select Skill command)
├── assets/skills.json          generated — see "Raycast extension" below
└── scripts/
    └── sync-skills-to-raycast.mjs  rebuilds assets/skills.json from ../skills
```

Rules:

- Every skill renders to `skills/<bucket>/[<group>/]<skill-name>/SKILL.md` from `.jastr/workflow/templates/<skill-name>/TEMPLATE.md`. The leaf directory name MUST match the `name:` field in the frontmatter (and the template directory leaf).
- `README.md` — index of available skills; update when adding/removing a skill (use the full nested path in links).
- `.claude-plugin/marketplace.json` — registers this repo as a `vercel-labs/skills` plugin per `skills/workflow/` group plus one for `skills/deprecated/`, so installs are grouped under a named heading (e.g. `JeisKappa Plan`, `JeisKappa Handoff`) instead of `General` in `npx skills list`. Every skill folder MUST be listed in the plugin matching its group's `skills` array as `./skills/<bucket>/[<group>/]<skill-name>`. To introduce a new group/heading, add a new folder under `skills/workflow/` AND add the matching plugin entry (`JeisKappa-<folder-name>`) to the `plugins` array. **Plugin order**: entries in `plugins` MUST be sorted alphabetically by `name`, with the single exception that `JeisKappa-deprecated` is always last. Display rule: the CLI splits `name` on `-`, uppercases the first char of each segment, then joins with spaces — so `JeisKappa-handoff` renders as `JeisKappa Handoff`. Dashes cannot survive into the displayed title.

## Template / SKILL.md format

Author this format in the skill's `TEMPLATE.md`; the renderer materializes it into `SKILL.md`. Every skill starts with YAML frontmatter, then the skill body. Mirror the structure of `.jastr/workflow/templates/consult-the-expert/TEMPLATE.md` (rendered to `skills/workflow/handoff/consult-the-expert/SKILL.md`):

```yaml
---
name: <kebab-case, matches directory name>
description: <one sentence: what it does + when to use it. The "use when…" trigger is what the harness matches against, so make it concrete.>
metadata:
  author: https://github.com/Jei-sKappa
  version: <semver>
---
```

There is no specific format for the skill body: every skill is different.

Bump `version` in the frontmatter on any meaningful change to a skill's behavior.

## Skill self-containment

Self-containment is a guarantee about the **rendered output**: every generated `SKILL.md` is a standalone instruction set handed to an agent that can only rely on the skill's own folder. The renderer's inline mode enforces this — it expands every `::include` in place, so the emitted `SKILL.md` is fully self-contained even when its `TEMPLATE.md` composed it from shared partials.

This means authoring and output have different rules: a `TEMPLATE.md` MAY `::include` shared partials from `.jastr/workflow/partials/`, but the `SKILL.md` it renders to MUST be a complete, self-sufficient instruction set with no unresolved references. When creating or editing a skill's template, the substance below still applies — it describes what the rendered skill must look like:

- Keep `description` to one sentence that says what the skill does and when a routing agent should trigger it. Do not include history, taxonomy, sibling counts, version names, project roadmap context, or implementation notes.
- Keep the body focused on instructions for the invoked agent. Do not add "when to use this skill" sections, because routing belongs in the frontmatter description.
- Do not mention project-internal planning labels, project decision IDs, phase numbers, V1/V2 naming, "the spine", or similar repo-maintenance context. If a constraint matters at runtime, restate it plainly as behavior the agent must follow. Artifact decision-log IDs such as `D<N>` are allowed when they are part of the skill's emitted artifact format.
- Do not couple one skill to another by explicit skill name, command, path, or invocation condition. Natural-language awareness is fine, such as saying the document may later be reviewed.
- The rendered skill must not link to or require instructional/reference files outside its own folder. If supporting material is genuinely needed, inline the necessary guidance into the template, or place a copy under the template's local `references/` folder (which the renderer mirrors into the skill folder) and link to it with a path relative to the skill directory. Composing the template from shared partials via `::include` is fine — inline mode resolves them — but the resolved output must still stand alone. This does not prohibit describing project artifacts the skill reads or writes as part of its actual job, such as `docs/threads/<thread>/...` inputs and outputs.
- Avoid body content that explains how this repository is organized unless the invoked agent needs that fact to perform the skill's own job.

## Deliverable skills — no preamble

Skills whose job is to produce a deliverable for the user to copy, paste, or hand off elsewhere (currently: `meta-prompting`, `consult-the-expert`, `report-to-the-owner`, `brief-the-recipient`) must enforce that the chat response IS the deliverable. No "Sure, here is…", no chat-style framing, no closing remark like "Hope this helps." Encode the rule explicitly in the skill's Tone or Output format section so a fresh model session honors it without relying on the harness picking up convention.

## When adding a new skill

Skills are authored as templates and the `SKILL.md` is generated — never create a `SKILL.md` by hand. Steps 4–6 (the registries) are the same as they have always been; only the authoring step changed.

1. Decide which bucket the skill belongs to — `workflow/` (active) or `deprecated/` (retired). For `workflow/`, also decide which group: `capture-discussion`, `propose`, `spec`, `plan`, `implement`, `review`, `merge`, `finish-navigate`, `research`, `documentation`, `handoff`, or `support`. If none fits, propose a new group folder and document it in this file's Layout section in the same change.
2. Author `.jastr/workflow/templates/<skill-name>/TEMPLATE.md` with the frontmatter shown above (start at `version: 1.0.0`). If the skill needs reference files, add them under `.jastr/workflow/templates/<skill-name>/references/`. The `<skill-name>` directory leaf must match the `name:` frontmatter. Compose from `partials/` via `::include` if useful.
3. Regenerate: ensure an inline-capable `JASTR_BIN` is available (build it with `cd .library/sources/Jei-sKappa_jastr && bun install && bun run build` if needed), then run `scripts/generate-skills.sh` to materialize `skills/workflow/<group>/<skill-name>/SKILL.md` (+ mirrored `references/`). Confirm with `scripts/generate-skills.sh --check`.
4. Add a section to `README.md` under "Available skills" with the description and the `npx skills add …` install snippet, linking to the full nested path.
5. Register the skill folder in `.claude-plugin/marketplace.json` under the plugin matching its group's `skills` array as `./skills/<bucket>/[<group>/]<skill-name>` — there is one plugin per workflow group (e.g. `JeisKappa-plan`, `JeisKappa-handoff`) plus `JeisKappa-deprecated`. If the group is new, also add a new plugin entry named `JeisKappa-<folder-name>` in the same change.
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

## V2 Workflow Conventions

This repo is the home of the Modular Agentic Workflow V2 — the **active ruleset for all new threads**. The canonical reference for V2 workflow rules — thread layout, filename grammar, lifecycle and immutability, tiers, the spine, discussions, reviews, and tracker integration — lives at `docs/workflow/v2/README.md`, which links the eight companion rule docs under `docs/workflow/v2/`. Read it before opening a thread or writing/editing any workflow artifact under `docs/threads/<thread>/`.

V1 (`docs/workflow/v1/`) remains the grandfathered reference for pre-V2 threads only — never edited, never migrated, never mixed with V2 (see "V1 Workflow Conventions" below).

This section is a POINTER — it intentionally does NOT duplicate the rules. Edit the canonical docs under `docs/workflow/v2/` for any rule change; this section only changes if the V2 reference doc set itself moves or splits.

## V1 Workflow Conventions

This repo is the home of the Modular Agentic Workflow V1. The canonical reference for V1 workflow rules — thread layout, filename grammars, immutability — lives at `docs/workflow/v1/README.md`. Read it before writing or editing any workflow artifact under `docs/threads/<thread>/`.

Three things follow from V1:

1. **Thread storage** — All V1 workflow artifacts live under `docs/threads/<YYMMDDHHMMSSZ-slug>/` using the folder set defined in `docs/workflow/v1/thread-layout.md`. Nothing else writes there.
2. **Filename grammar** — Every artifact filename uses the record or versioned grammar in `docs/workflow/v1/filename-grammar.md`, including a mandatory artifact-type suffix.
3. **Immutability** — Emitted versioned and record artifacts are not edited; produce a new version or new record instead. See `docs/workflow/v1/immutability.md` for the ambiguous-reference resolution rule (ask the user — never silently pick "latest").

Drafts under any thread's `.wip/` folder are gitignored and editable until the owning skill emits them.

This section is a POINTER — it intentionally does NOT duplicate the rules. Edit the canonical docs under `docs/workflow/v1/` for any rule change; this section only changes if the V1 reference doc set itself moves or splits.
