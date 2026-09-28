---
type: edit
hash: 58f8a9a40faf830dac061b4acca4917b9d4250bf
---

## replace
```
## Update rule
```
```
## Rules
```

## replace
```
Update this file when, at that level:
```
```
Change this file, through a delta document a thread drafts and `close-thread` lands, when, at that level:
```

## replace
````
lives in exactly one of the three files.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## What this repository is

`antmay` offers the **Antmay method** — a thread-based way of carrying a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk — plus two modules that support it. `suite/` is the installable skill suite, published content that end users add with `npx skills add Jei-sKappa/antmay`. `cli/` is a TypeScript executor that runs a pipeline of those skills unattended against one thread, with durable checkpoints, workspace locking, and per-stage Git boundaries; it has its own build and test gate. The executor reads no file inside `suite/` at runtime, so the two are coupled only by the skill names a pipeline invokes and the terminal-outcome protocol it classifies.

## Layout

```
suite/                       the skill suite            → suite/AGENTS.md
cli/                         the Antmay CLI             → cli/AGENTS.md
docs/adr/                    decisions on how the system is built, created lazily
docs/pdr/                    decisions on what the product does, created lazily
docs/glossary.md             the project's terms
docs/product/                product behavior, one document per capability
docs/architecture/           architecture description, one document per module
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
| `docs/product/method.md` | How the method works and how this repository runs it, which skill to reach for. |
| `docs/architecture/suite.md` | How the suite is put together: shared references, distribution, gates. |
| `suite/authoring/` | The conventions every skill in the suite is authored to. |
| `cli/README.md` | Operating the CLI and the stages a pipeline may hold. |
| `AGENTS.md`, `suite/AGENTS.md`, `cli/AGENTS.md` | Durable working memory for agents, one file per level. |

## Before anything else
````
```
lives in exactly one of the three files.
```

## replace
```
- Invoke `/consult-decisions` to read the project decisions bearing on what you are about to do — `docs/adr/` and `docs/pdr/` — and `/consult-descriptions` for the product behavior and architecture description the work touches; both are authoritative and carry the rule for a contradiction.
```
```
- Invoke `/consult-decisions` to read the project decisions bearing on what you are about to do — `docs/adr/` and `docs/pdr/`; they are authoritative and carry the rule for a contradiction.
```

## replace
```
- Terms, decisions and descriptions are settled through threads — a thread drafts them as delta documents under its `delta/`, and `close-thread` lands them at close; do not edit the project layer by hand outside that landing.
```
```
- Terms, decisions and the agents files are settled through threads — a thread drafts them as delta documents under its `delta/`, and `close-thread` lands them at close; do not edit the project layer by hand outside that landing.
- `.work/` begins with a dot so that ripgrep and the agent harnesses skip thread history by default; reading it is deliberate — pass `rg --hidden`, or name the path.
```

## replace
```
- `cli/` is on hold and out of scope by default — see `## The CLI is on hold`.
```
```
- `cli/` is on hold and out of scope by default — see `### The CLI is on hold`.
```

## replace
```
## The CLI is on hold

Since September 2026 the suite evolves and `cli/` does not. Keeping the executor
```
```
### The CLI is on hold

Since September 2026 the suite evolves and `cli/` does not. Keeping the executor
```

## replace
```
## Keep the CLI stage support reference current
```
```
### Keep the CLI stage support reference current
```

## replace
```
This rule is **suspended while `## The CLI is on hold` holds**: a suite change that would have moved the table records the drift instead of editing it, and the realignment pass brings the table back in step. The rule applies as written again once the user reopens `cli/`.
```
```
This rule is **suspended while `### The CLI is on hold` holds**: a suite change that would have moved the table records the drift instead of editing it, and the realignment pass brings the table back in step. The rule applies as written again once the user reopens `cli/`.
```

## add
end
````

## Layout

`antmay` offers the **Antmay method** — a thread-based way of carrying a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk — plus two modules that support it. `suite/` is the installable skill suite, published content that end users add with `npx skills add Jei-sKappa/antmay`. `cli/` is a TypeScript executor that runs a pipeline of those skills unattended against one thread, with durable checkpoints, workspace locking, and per-stage Git boundaries; it has its own build and test gate. The executor reads no file inside `suite/` at runtime, so the two are coupled only by the skill names a pipeline invokes and the terminal-outcome protocol it classifies.

```
suite/                       the skill suite            → suite/AGENTS.md
cli/                         the Antmay CLI             → cli/AGENTS.md
docs/adr/                    decisions on how the system is built, created lazily
docs/pdr/                    decisions on what the product does, created lazily
docs/glossary.md             the project's terms
docs/documentation-rules.md  how every document here is written
.work/threads/               this repository's own threads
.work/roadmaps/              its roadmap indexes
.claude-plugin/              marketplace.json — load-bearing for skill distribution
.github/                     CI, issue classification, and the `focus: next` cleanup workflows
assets/                      logos and banner
README.md                    the user-facing index of the skills
```

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## Where to look

- When you write user-facing text about the skills or the terminal-outcome protocol, read `README.md`.
- When you classify an issue, size its effort, commit, or open a pull request, read `CONTRIBUTING.md`.
- When you write or edit any document in this repository, read `docs/documentation-rules.md`.
- When you author or change a skill, read `suite/AGENTS.md` and the `suite/authoring/` file it names for the concern you touch.
- When the user reopens `cli/`, read `cli/AGENTS.md` and `cli/README.md`.
````
