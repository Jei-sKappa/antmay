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

## What this repository is

`antmay` offers the **Antmay method** — a thread-based way of carrying a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk — plus two modules that support it. `suite/` is the installable skill suite, published content that end users add with `npx skills add Jei-sKappa/antmay`. `cli/` is a TypeScript executor that runs a pipeline of those skills unattended against one thread, with durable checkpoints, workspace locking, and per-stage Git boundaries; it has its own build and test gate. The executor reads no file inside `suite/` at runtime, so the two are coupled only by the skill names a pipeline invokes and the terminal-outcome protocol it classifies.

## Layout

```
suite/                       the skill suite            → suite/AGENTS.md
cli/                         the Antmay CLI             → cli/AGENTS.md
docs/adr/                    the project's decisions, one file per record
docs/glossary.md             the project's terms
docs/documentation-rules.md  how every document here is written
docs/product/method.md       how this repository works on itself
.work/threads/               this repository's own threads
.work/roadmaps/              its roadmap indexes
.claude-plugin/              marketplace.json — load-bearing for skill distribution
.github/                     CI, issue classification, and the `focus: next` cleanup workflows
assets/                      logos and banner
README.md                    the user-facing index of the skills
```

## The documents that govern the work

| Path | Authoritative for |
| --- | --- |
| `README.md` | The user-facing index of the installable skills and the terminal-outcome protocol. |
| `CONTRIBUTING.md` | Issue classification, effort bands, commits, and pull requests. |
| `docs/documentation-rules.md` | The three document kinds and how every document in this repository is written. |
| `docs/product/method.md` | How this repository runs on the suite it ships, and which skill to reach for. |
| `suite/authoring/` | The conventions every skill in the suite is authored to. |
| `cli/README.md` | Operating the CLI and the stages a pipeline may hold. |
| `AGENTS.md`, `suite/AGENTS.md`, `cli/AGENTS.md` | Durable working memory for agents, one file per level. |

## Before anything else

- Never commit unless explicitly asked to do so.
- This repo follows [Conventional Commits](https://www.conventionalcommits.org/). A change confined to one skill takes that skill's folder name as the scope (`fix(check-plan): …`); a change confined to the CLI takes `cli`.
- A change spanning modules or touching shared root files (`README.md`, `docs/`, `.claude-plugin/`, `AGENTS.md`) omits the scope: `chore: …`, `docs: …`, `feat: …`.
- Invoke `/consult-adrs` to read the project decisions bearing on what you are about to do; it is authoritative and carries the rule for a contradiction.
- Invoke `/consult-glossary` to write the terms the project has fixed. `docs/glossary.md` is this repository's naming authority: one meaning per term across the suite, the CLI, and these documents.
- Terms are settled through threads — a thread drafts them in its own `glossary.md`, and `close-thread` merges that delta into `docs/glossary.md` at close; do not edit the project glossary by hand outside that merge.
- `cli/` is on hold and out of scope by default — see `## The CLI is on hold`.

## The CLI is on hold

Since September 2026 the suite evolves and `cli/` does not. Keeping the executor
in step was slowing the skills down, so the CLI was deliberately left behind: its
thread paths, its stage catalog, its stage-support table, and its own check are
all behind the suite's current shape, and they stay that way on purpose.

**Do not touch anything under `cli/` unless the user explicitly asks for it.**
That holds even when a suite change breaks a CLI assumption, even when the
mismatch is obvious, and even when the fix looks like one line. Noticing that
`cli/` is now wrong is not authorization to correct it — say so and move on.

When a suite change does invalidate something in `cli/`, name the drift in the
work's own record (a thread artifact, a report, a follow-up, or an issue) and
leave the code alone. A single `[contract]` thread realigns the executor with the
suite in one pass when the user decides it is time; piecemeal repairs in the
meantime only make that pass harder.

## Keep the CLI stage support reference current

`cli/README.md` carries the one published table of which Antmay skills run as CLI stages and what artifact state each supported stage requires. It answers both questions for users. `cli/src/pipeline/documentation.test.ts` — the one place in the CLI that reads `suite/`, and it does so only under the test gate — holds the table's rows to the published skill list and each supported row to the catalog's own prerequisite; no check can tell whether a row still describes the skill it names, so the rest is maintained by this rule.

Update that table in the same change whenever either side of the coupling moves:

- a suite skill's invocation posture, accepted inputs, durable outputs, or side-effect boundaries change in a way that affects whether it can be a stage or what a stage of it would require;
- the CLI's stage catalog, target resolution, artifact-state interpretation, or stage prerequisites change.

Wording, formatting, and internal changes that cannot move either answer need no edit. This rule lives here and only here, because it spans both modules; do not restate it in `cli/AGENTS.md` or `suite/AGENTS.md`.

This rule is **suspended while `## The CLI is on hold` holds**: a suite change that would have moved the table records the drift instead of editing it, and the realignment pass brings the table back in step. The rule applies as written again once the user reopens `cli/`.
