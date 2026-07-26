# Working from a supplied ticket

Applies when the invocation carries a ticket reference. Read the ticket before composing any seed field, then check whether a thread already exists for it.

## Read the ticket

Determine which tracker the reference belongs to from its host, then read the matching reference under `references/trackers/` — for a `github.com` ticket that is `references/trackers/github.md`. It carries the availability check, the read command, and the reference forms for that tracker.

Take any ticket the user hands you. A ticket carries no marker or label that this operation checks, and there is no separate mode for one kind of ticket over another: a reference is a reference.

Read the ticket for context only. Perform no tracker writes of any kind — no backlink comments, no label changes, no status transitions, no closures — and never make thread creation depend on tracker access. If the tracker is unavailable or unauthenticated, ask the user to paste the ticket's title and body, then continue from what they supply. Never fail the invocation and never create partial state over a read that did not work.

## Check for an existing thread on the same ticket

Search the seeds of existing threads under `docs/threads/` — including `docs/threads/archive/` — for an `External:` value denoting the same ticket. Compare references by their meaning rather than as raw strings, following the comparison rule in the tracker reference you read above.

When a thread already exists for the ticket, name that thread's folder path and ask the user whether to continue. A confirmed continue proceeds through the ordinary creation path, unchanged — a second thread on one ticket is legitimate for follow-up or superseding work. This check informs the user; it never blocks the operation.
