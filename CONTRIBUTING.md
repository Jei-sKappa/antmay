# Contributing to Antmay

## Issue titles carry the scope

Antmay is two modules that ship separately — the skill suite under `suite/` and
the CLI under `cli/` — plus the method documentation they share. Which of those
an issue is about decides who reads it and where the fix lands, so every issue
title opens with a scope prefix:

| Prefix | Scope |
| --- | --- |
| `[suite]` | The skill suite — `suite/`, the skill index in `README.md`, `.claude-plugin/` |
| `[cli]` | The Antmay CLI — `cli/` |
| `[contract]` | The contract between the two modules — skill names the pipeline invokes, or the terminal-outcome protocol |
| `[repo]` | Neither module — the method docs under `docs/`, repository tooling, the README itself |

Then the title, as prose:

```text
[cli] afk resume loses the checkpoint after a failed stage
[suite] reconcile-spec rewrites decisions it should only read
[repo] the Standard recipe doc contradicts the thread model on archive timing
```

`[contract]` is for the coupling itself, not for issue counting: the suite and
the CLI share no files, so what makes an issue span both is that the CLI's
pipeline names a skill or reads a terminal outcome the suite emits. Two
independent problems that happen to touch both folders are two issues, one per
module — that keeps each one closable on its own.

There is no issue template. File from the web UI or from the `gh` CLI,
whichever you prefer:

```sh
gh issue create --title "[cli] afk resume loses the checkpoint after a failed stage"
```

A workflow reads the prefix and applies the matching `scope:` label. A title
with no recognizable prefix gets a `needs-scope` label and one comment
explaining this convention; editing the title to add a prefix clears both.
Nothing is rejected or closed for missing a prefix — the labels exist so the
issue list can be filtered by module.

## Commits

This repository follows [Conventional Commits](https://www.conventionalcommits.org/).
A change scoped to one skill uses that skill's folder name as the commit scope
(`fix(reconcile-spec): …`), a change scoped to the CLI uses `cli`
(`feat(cli): …`), and a change spanning modules or touching shared root files
omits the scope (`docs: …`). The valid scopes are listed in
`conventionalCommits.scopes` in `.vscode/settings.json`.

## Pull requests

A pull request title takes the same Conventional Commits shape as a commit
subject, under the same scope rules — `feat(cli): …`, `docs: …`. The body says
what changed and why; where the work came from an issue, `Closes #<number>`
links the two and closes the issue when the pull request merges into the
default branch.

## Working in the repository

`AGENTS.md` at the root is the entry point — it explains the two modules and
points at `suite/AGENTS.md` and `cli/AGENTS.md` for the rules that apply inside
each. The method itself is documented under [`docs/`](./docs/README.md).

The CLI has a build and test gate; run it from `cli/` before proposing a change
there:

```sh
npm run check
```

The skill suite has no build. Its one mechanical gate guards the distribution
manifest, and runs from `suite/`:

```sh
node scripts/check-marketplace-skills.mjs
```
