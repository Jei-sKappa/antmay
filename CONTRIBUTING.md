# Contributing to Antmay

## Issue titles carry the scope and type

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

The next prefix names what kind of work the issue describes:

| Prefix | Type |
| --- | --- |
| `[bug]` | Existing behavior contradicts a documented or accepted expectation |
| `[feature]` | Adds a capability or supported use case |
| `[improvement]` | Makes an existing capability clearer, faster, easier, safer, or more consistent |
| `[task]` | Maintenance, refactoring, migration, tooling, or investigation without a direct product-behavior outcome |

Then the descriptive title:

```text
[cli] [bug] afk resume loses the checkpoint after a failed stage
[suite] [feature] add a skill for resolving pending review findings
[repo] [improvement] make installation guidance easier to follow
[cli] [task] reevaluate tsup as the bundler
```

`[contract]` is for the coupling itself, not for issue counting: the suite and
the CLI share no files, so what makes an issue span both is that the CLI's
pipeline names a skill or reads a terminal outcome the suite emits. Two
independent problems that happen to touch both folders are two issues, one per
module — that keeps each one closable on its own.

Choose exactly one type. A behavior is a bug when it conflicts with an existing
expectation, not merely because changing it would be desirable. A new supported
outcome is a feature; a change that preserves an existing capability while
making it work better is an improvement. Use task when the direct outcome is
maintenance or investigation rather than product behavior.

There is no issue template. File from the web UI or from the `gh` CLI,
whichever you prefer:

```sh
gh issue create --title "[cli] [bug] afk resume loses the checkpoint after a failed stage"
```

A workflow reads both prefixes and applies the matching `scope:` and `type:`
labels. A title with a missing or unrecognized value gets the corresponding
`needs-scope` or `needs-type` label and one comment explaining the convention.
Editing the title reconciles the labels automatically. Nothing is rejected or
closed for an invalid title — the labels make incomplete classification visible
and make valid issues filterable by either dimension. The title is authoritative:
manually adding or removing a managed classification label causes the workflow
to restore the labels derived from the title.

## Issues carry an effort estimate

Scope and type say what an issue is about. Effort says how much work closing it
is, on a five-point scale applied as a label:

| Label | Effort |
| --- | --- |
| `effort: 1` | Localized. The change is already known; write it and verify. |
| `effort: 2` | One decision to settle, then a bounded edit or a wide but mechanical sweep. |
| `effort: 3` | Design plus implementation, with tests and documentation following. |
| `effort: 4` | Multi-artifact work whose shape has to be worked out first. |
| `effort: 5` | A dedicated design-and-implementation effort crossing several subsystems. |

The scale is deliberately coarse. It is there to separate a `1` from a `4` —
genuinely different kinds of work, planned differently — and not to separate two
neighbouring bands. No estimate needs defending to that precision.

Effort is a label rather than a title prefix because it changes: an estimate is
revised as an issue comes to be understood, while its scope and type are
intrinsic to it. So the label is the input here, and applying or replacing one is
how the estimate is set. An issue carrying no estimate gets `effort: unset`,
which clears as soon as one is applied; an issue carrying two gets
`needs-effort` until one remains.

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

The CLI has a build and test gate, and a lint pass beside it; run both from
`cli/` before proposing a change there:

```sh
npm run check
npm run lint
```

The skill suite has no build. Its one mechanical gate guards the distribution
manifest, and runs from `suite/`:

```sh
node scripts/check-marketplace-skills.mjs
```
