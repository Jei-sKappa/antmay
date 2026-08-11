# AGENTS.md

This file provides guidance to AI Agents working anywhere in this repository.

## Update rule

This file is the memory for the repository as a whole: what holds true no matter
which module you are in, plus anything about the root-level files themselves.
Update this file when, at that level:

- You make significant changes that needs to be remembered across session.
- You made a mistake that should not be repeated.
- The user told you a new rule that should be remembered.

A fact that belongs to one module goes in that module's own file instead —
`suite/AGENTS.md` for the skill suite, `cli/AGENTS.md` for the CLI. Every fact
lives in exactly one of the three files.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## Repository purpose

`antmay` optimizes Spec Driven Development. It offers the **Antmay method** — a
thread-based way of carrying a unit of work from a rough idea to shipped code
through reviewable Markdown artifacts on disk, kept in a thread folder under
`docs/threads/` — plus the tooling that supports it.

It ships two modules.

## The two modules

**`suite/` — the skill suite.** The refined `SKILL.md` files that define the
method's capabilities, plus the shared references and maintenance scripts that
keep them consistent. This is published content: end users install it with
`npx skills add Jei-sKappa/antmay --skill <skill-name>`, so formats and behavior
stay stable. Read `suite/AGENTS.md` before touching anything under `suite/`.

**`cli/` — the Antmay CLI.** A TypeScript/Node executor (`antmay`) that drives
the method unattended, running a user-authored pipeline document stage by stage
against one selected thread through an agentic harness (Codex or Claude Code),
with durable checkpoints, workspace locking, and per-stage Git boundaries. Its
command surface is one namespace: `antmay afk run`, `antmay afk resume`,
`antmay afk list`. Unlike the skill content, it is a real codebase with its own
build/test gate (`npm run check`). Read `cli/AGENTS.md` before touching anything
under `cli/`.

The two are independent on disk — the executor reads no file inside `suite/` at
runtime, and no skill knows the CLI exists — but they are coupled by contract.
The CLI's trusted stage catalog (`cli/src/pipeline/catalog.ts`) invokes nine
skills by name — `spec`, `reconcile-spec`, `review-spec`, `plan-brief`,
`plan-strict`, `reconcile-plan`, `implement`, `implement-plan`, and
`implement-plan-with-subagents` — points each at a thread artifact, and
classifies the terminal outcome those skills emit. Renaming or retiring one of
them, or changing the outcome protocol, breaks the CLI even though no path
changes. That shared contract is documented in `docs/`.

## Keep the CLI stage support reference current

`cli/README.md` carries the one published table of which Antmay skills run as
CLI stages and what artifact state each supported stage requires. It answers
both questions for users. `cli/src/pipeline/documentation.test.ts` — the one
place in the CLI that reads `suite/`, and it does so only under the test gate —
holds the table's rows to the published skill list and each supported row to the
catalog's own prerequisite; no check can tell whether a row still describes the
skill it names, so the rest is maintained by this rule.

Update that table in the same change whenever either side of the coupling moves:

- a suite skill's invocation posture, accepted inputs, durable outputs, or
  side-effect boundaries change in a way that affects whether it can be a stage
  or what a stage of it would require;
- the CLI's stage catalog, target resolution, artifact-state interpretation, or
  stage prerequisites change.

Wording, formatting, and internal changes that cannot move either answer need no
edit. This rule lives here and only here, because it spans both modules; do not
restate it in `cli/AGENTS.md` or `suite/AGENTS.md`.

## Layout

```
suite/           the skill suite and its maintenance tooling  → suite/AGENTS.md
cli/             the Antmay CLI                              → cli/AGENTS.md
docs/            canonical method reference + docs/threads/
.claude-plugin/  marketplace.json — load-bearing for skill distribution
.github/         the workflow that classifies issues from their title
assets/          logos and banner
README.md        user-facing index of the available skills
```

Root-level files that belong to a module rather than to the repository:
`.claude-plugin/marketplace.json` is what makes the skills installable at all
(the rules for editing it, and the check that guards it, live in
`suite/AGENTS.md`), and `README.md` indexes the skills.

## Issue classification convention

Every issue title in this repository opens with `[scope] [type]`. The scope is
one of `[suite]`, `[cli]`, `[contract]` (the coupling between the two — skill
names the pipeline invokes, or the terminal-outcome protocol), or `[repo]`
(neither module — method docs, tooling, README). The type is exactly one of
`[bug]`, `[feature]`, `[improvement]`, or `[task]`. There is no issue template,
so the convention holds identically for the web UI and for `gh issue create`.

`.github/workflows/issue-classification.yml` parses the title into `scope: *`
and `type: *` labels. A missing, unrecognized, or duplicate classification gets
the corresponding `needs-scope` or `needs-type` label plus one explanatory
comment. Editing the title reconciles all managed labels. The workflow never
closes or rejects an issue. The title is authoritative for those two families,
so manually adding or removing one of their labels triggers the same
reconciliation. GitHub offers no server-side gate at creation time, so
detect-and-flag is the enforcement ceiling.

A third managed family carries an issue's effort estimate on a five-point scale,
and it inverts the direction of authority: `effort: 1` through `effort: 5` are
applied by a person or an agent, and the workflow only supplies the default. An
issue carrying no estimate gets `effort: unset`; one carrying more than one gets
`needs-effort`. Both clear once exactly one estimate is applied, and a valid
estimate is never removed. The estimate is an input rather than something
derived, because it is revised as an issue comes to be understood while scope
and type are intrinsic to it — so do not reach for a title prefix to carry it.

`CONTRIBUTING.md` is where this is documented for contributors, and it publishes
the one definition of what each effort band means; the tables there and the
workflow's `SCOPES`, `TYPES`, and `EFFORTS` maps must be edited together.

## Describe the current state, never the diff

This applies to every document and skill body in the repository.

When an edit replaces design A with design B, the resulting skill body or document must describe B as if A had never existed. Never write a negation or before/after contrast whose only referent is the removed design — "X is no longer …", "there is no X anymore", "unlike before, …": once A is removed it is not materially written anywhere, so a fresh reader cannot know it existed, and the sentence's only effect is to teach a dead concept while reading as a changelog. Test every negative statement you keep or add: does it forbid something a fresh reader with no memory of the old design would plausibly do anyway? A live guardrail against natural drift ("never treat the sequence as a checklist", "add no owner field") passes the test; a contrast with a previous version of the text does not.

## Document only durable, properly scoped information

Do not add comments, sections, or documentation notes merely because a change
was made or to ensure that every changed behavior is mentioned somewhere.
Explanatory prose belongs only where it gives a future reader useful, durable
information such as a contract, non-obvious constraint, rationale, or workflow.
Place each fact at the narrowest location whose scope matches it: broad behavior
does not belong under one example, scenario, or component, and the same fact
does not need to be repeated across documents. If existing documentation remains
accurate and useful after a change, leave it unchanged.

A catalog the software itself prints — a `--list` output, a help screen — is not
documentation to maintain in any file. Point at the command rather than copying
its rows into prose, and keep the runtime source of that listing accurate
instead.

A thread's own identifiers do not travel with what they explain. Every thread
numbers its decisions from `DR1`, so a bare `DR<N>` in code or in living
documentation names nothing a future reader can resolve. Keep the constraint or
rationale the record settled, stated in full where it applies, and leave the tag
in the thread.

README files are user-facing. Include only information an end user needs to
understand, choose, configure, or operate the software; do not expose internal
implementation or maintenance details that have no practical value to that
audience.

AGENTS.md files are durable working memory for agents that lose session context.
Use them to make the repository or module structure quickly understandable and
to preserve non-obvious constraints, rationale, workflows, and rules that cannot
be expressed or enforced practically in code. Do not use them as an inventory of
ordinary implementation details. Code is the source of truth for behavior and
structure that are immediately apparent from reading it.

## Commits

Never commit unless explicitly asked to do so.

This repo follows [Conventional Commits](https://www.conventionalcommits.org/). When the change is scoped to a single skill, the commit scope MUST be that skill's folder name — e.g. `refactor(propose): …`, `fix(reconcile-spec): …`. A change scoped to the CLI uses `cli` — e.g. `feat(cli): …`. The list of valid skill scopes lives in `conventionalCommits.scopes` inside `.vscode/settings.json`; if a new skill exists on disk but is missing from that array, add it there in the same commit (see "When adding a new skill" in `suite/AGENTS.md`).

Changes that span modules or touch shared root files (`README.md`, `.claude-plugin/`, `AGENTS.md`, etc.) should omit the scope: `chore: …`, `docs: …`, `feat: …`.

## Method Conventions

This repository is the reference home of the Antmay method, the ruleset for newly opened threads and their artifacts.

The canonical reference — the skill catalog and recipe model, thread layout, decisions, archive lifecycle, write authority, cross-thread references, and skill-authoring conventions — lives at `docs/README.md`, which links the companion documents `docs/glossary.md`, `docs/thread-model.md`, `docs/skill-authoring.md`, and the three recipe docs under `docs/recipes/`. Read it before editing the method itself or writing/editing an artifact that belongs to an existing thread.

This section is a POINTER — it intentionally does NOT duplicate the rules. Edit the canonical docs under `docs/` for any rule change; this section only changes if the reference doc set itself moves or splits.

## Vocabulary

`docs/glossary.md` is the naming authority for this repository: it fixes one meaning per term across the suite, the CLI, and the docs. Consult it before introducing a term, and update it in the same change whenever a term's meaning changes or a new canonical term appears.

These names carry the most weight, because each sits next to a plausible wrong one:

| Term | Means | Not |
| --- | --- | --- |
| **method** | the whole Antmay approach to SDD | a recipe |
| **recipe** | one of the three documented, advisory paths — Quick, Standard, Roadmap | the method, or a pipeline |
| **pipeline** | the CLI's enforced stage sequence, automating the automatable core of a recipe | a recipe |
| **step** / **stage** | a step is one entry in a recipe; a stage is one entry in a pipeline | interchangeable |
| **thread artifact** | a durable file inside a thread, as opposed to source code | any file a skill writes |
