# Repository ticket conventions

A project may prescribe how its tickets are titled or labelled. Where it does,
a ticket that ignores the convention lands wrong and someone has to correct it
by hand — so read the convention before the title and the labels are settled.

## Where the convention is stated

Read the first of these that exists and says something about tickets, and stop
there:

1. `CONTRIBUTING.md` at the repository root
2. `.github/CONTRIBUTING.md`
3. `AGENTS.md` at the repository root

A file that exists but says nothing about tickets is not a match — continue
down the list. When none of them states a convention, the project has none, and
the title register in the skill body stands as written.

## What binds you

Three things:

- **A title shape** — a required prefix, tag, bracketed scope, or identifier,
  and where in the line it sits.
- **Required labels** — a label the project asks every ticket to carry, beyond
  the marker label.
- **A body structure** — named sections the project asks a ticket body to have.

Honor a body structure without letting it change what the body is. The sections
come from the convention; what fills them is still a problem statement, and a
section the user's idea does not answer says so plainly instead of being padded
with scope, design, or reproduction steps that were never supplied. A structure
that cannot be filled honestly is worth raising with the user rather than
satisfying with invention.

The rest of what a contributing guide covers — how tests are run, how commits
are named, how a pull request is reviewed — is not yours to apply here.

## When the convention leaves a choice

A title shape usually carries a value you have to pick: which component, which
area, which scope. Infer it from the user's idea whenever the idea settles it,
and carry the inference into the confirmation so the user sees the choice and
can correct it in the same pass.

When the idea does not settle it — two values are equally defensible, or the
guide's own rule is ambiguous — ask in that same confirmation message, naming
the candidates you are choosing between. Never pick one silently, and never
file a ticket carrying a placeholder value.
