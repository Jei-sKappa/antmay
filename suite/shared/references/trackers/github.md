# GitHub tracker reference

Everything GitHub-specific a skill needs in order to read, create, link, or
close a ticket, and to open a pull request where GitHub is also the code host.
On GitHub a ticket is an issue, and a ticket reference is an issue URL or
number.

A project's tracker and its code host are not always the same service. Resolve
the tracker from a ticket reference's host, and resolve the host from the git
remote — this file applies to whichever of the two GitHub is.

All commands use the `gh` CLI, which carries its own authentication.

## Availability

Treat GitHub as reachable only when both of these succeed:

```sh
gh --version
gh auth status
```

A failure of either means the tracker is unavailable for this invocation.
Report that plainly and follow the invoking skill's own degradation path; never
retry with a different mechanism and never prompt for a token.

## Resolving the repository

```sh
gh repo view --json nameWithOwner -q .nameWithOwner
```

This resolves the repository from the current checkout's remote. When the
checkout has several remotes and the answer is therefore not unique, ask which
repository is meant rather than choosing one:

```sh
git remote -v
```

The repository's default branch matters when linking a ticket from a pull
request:

```sh
gh repo view --json defaultBranchRef -q .defaultBranchRef.name
```

## Reference forms and comparison

The canonical form of a ticket reference is the full issue URL:

```text
https://github.com/<owner>/<repo>/issues/<number>
```

Several forms denote the same ticket. `#<number>` names an issue in the
resolved repository; `<owner>/<repo>#<number>` names one explicitly; a URL may
carry a trailing slash, a query string, or a fragment; the host may differ in
case.

Two references denote the same ticket when their owner, repository, and number
match. Compare them by extracting those three parts — never by string equality
on the raw text, which would treat a trailing slash as a different ticket.

## Reading a ticket

```sh
gh issue view <number-or-url> --json number,title,body,labels,state,url
```

`state` is `OPEN` or `CLOSED`. An operation that acts on an open ticket reads
`state` first and does nothing when the ticket is already closed.

## Creating a ticket

```sh
gh issue create --title "<title>" --body-file <path> [--label "<required-label>" ...]
```

Pass the body through `--body-file` (`-` reads standard input) rather than
`--body`, so newlines and Markdown survive intact.

Include one `--label` option for each label required by the repository's
convention, and omit it when the convention requires none. GitHub may omit
requested labels when the authenticated user lacks permission to apply them, so
verify required labels on the created ticket:

```sh
gh issue view <number-or-url> --json labels -q '.labels[].name'
```

If a required label is absent, report it with the created ticket's URL so a
maintainer can apply it. Do not discard or recreate the ticket.

The command prints the created ticket's URL; retain it for the invoking skill's
report.

## Linking a ticket from a pull request

A closing keyword in a pull request's body links the ticket to the pull request
and closes the ticket when the pull request merges:

```text
Closes #<number>
```

GitHub shows the relationship on both objects — the ticket gains a linked pull
request, the pull request gains a linked ticket — and closes the ticket **only
when the pull request merges into the repository's default branch**. Against
any other base branch the keyword still creates the link, but nothing will
close the ticket.

A non-closing mention creates the same navigable cross-reference in the
ticket's timeline and leaves the ticket open:

```text
Related to #<number>
```

## The pull request body template

A repository may ship a template that every pull-request body is expected to
follow, at the first of these paths that exists:

```text
.github/PULL_REQUEST_TEMPLATE.md
PULL_REQUEST_TEMPLATE.md
docs/PULL_REQUEST_TEMPLATE.md
```

The web UI prefills it, and `gh pr create` prefills it when it prompts for a
body interactively — but passing `--body` or `--body-file` bypasses it
entirely. A skill that drafts the body itself therefore reads the template and
follows its structure, or the project's template is silently defeated by the
automation.

A repository may instead hold several templates in a
`.github/PULL_REQUEST_TEMPLATE/` directory, where none applies by default. Ask
which one the change belongs under rather than picking one.

## Closing a ticket

```sh
gh issue close <number> --comment "<text>"
```

The comment is where a pointer back to the delivered work belongs — a merge
commit, or the thread folder the work lives in — so the closed ticket still
leads somewhere.
