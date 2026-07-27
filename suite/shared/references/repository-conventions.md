# Repository conventions

A project may prescribe how the artifacts it receives are written — its
tickets, its commits, its pull requests. Where it does, an artifact that
ignores the convention lands wrong and someone has to correct it by hand, so
read the convention before the artifact's text is settled.

## Where the convention is stated

Read the first of these that exists and says something about the artifact you
are about to create, and stop there:

1. `CONTRIBUTING.md` at the repository root
2. `.github/CONTRIBUTING.md`
3. `AGENTS.md` at the repository root

A file that exists but says nothing about that artifact is not a match —
continue down the list. When none of them states a convention, the project has
none, and the register described in the invoking skill's body stands as
written.

## Apply only what governs the artifact in your hands

A contributing guide covers ground far beyond any one operation: how the tests
are run, how a review proceeds, how a release is cut. Take the part that
governs the artifact you are creating and leave the rest alone.

**A ticket.** A title shape — a required prefix, tag, bracketed scope, or
identifier, and where in the line it sits. Required labels, beyond any label
the invoking skill applies for its own reasons. A body structure.

**A commit.** A message shape — a prescribed subject form such as a type, an
optional scope and a summary; a length limit; a required trailer. Where the
convention names a closed set of scopes or types, it usually says which file
holds the list: read that file rather than inferring the set from recent
history.

**A pull request.** A title shape, often the same form the project requires of
a commit subject, especially where pull requests are squash-merged. A body
structure — named sections or a checklist.

## Honor a structure without letting it change what the artifact is

The sections come from the convention; what fills them comes from the work. A
section the work does not answer says so plainly rather than being padded with
invented detail, and a structure that cannot be filled honestly is worth
raising with the user rather than satisfying with invention.

## When the convention leaves a choice

A prescribed shape usually carries a value you have to pick: which component,
which area, which scope. Infer it from the work whenever the work settles it,
and carry the inference into the confirmation the invoking skill already makes,
so the user sees the choice and can correct it in the same pass.

When the work does not settle it — two values are equally defensible, or the
guide's own rule is ambiguous — ask there, naming the candidates you are
choosing between. Never pick one silently, and never produce an artifact
carrying a placeholder value.
