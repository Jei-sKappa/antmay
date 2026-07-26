# GitHub tracker reference

Everything GitHub-specific a skill needs in order to read, create, link, or
close a ticket. On GitHub a ticket is an issue, and a ticket reference is an
issue URL or number.

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
gh issue create --title "<title>" --body-file <path> --label <label>
```

Pass the body through `--body-file` (`-` reads standard input) rather than
`--body`, so newlines and Markdown survive intact.

`--label` fails when the label does not exist in the repository, so check
first and create it when needed:

```sh
gh label list --json name -q '.[].name'
gh label create <label> --description "<description>"
```

The command prints the created ticket's URL; that URL is what the invoking
skill reports.

## The marker label

`antmay` marks a ticket whose body is written as a thread's genesis narrative,
which is what makes it ready to open a thread from. It records nothing about
ownership or progress, and no skill changes its behavior according to whether a
ticket carries it.

Listing the marked tickets is an ordinary query:

```sh
gh issue list --label antmay --state open
```

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

## Closing a ticket

```sh
gh issue close <number> --comment "<text>"
```

The comment is where a pointer back to the delivered work belongs — a merge
commit, or the thread folder the work lives in — so the closed ticket still
leads somewhere.
