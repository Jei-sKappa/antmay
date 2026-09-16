# Working from a supplied ticket

Applies when the invocation carries a ticket reference. Read the ticket before composing any seed field, then check whether a thread already exists for it. The ticket's body is not raw material here — it becomes the seed's ticket section as it stands, quoted rather than rewritten, so what you read is what the thread will hold.

## Read the ticket

Determine which tracker the reference belongs to from its host, then read the matching reference under `<skill_path>/references/trackers/` — for a `github.com` ticket that is `<skill_path>/references/trackers/github.md`. It carries the availability check, the read command, and the reference forms for that tracker.

Take any ticket the user hands you.

Read the ticket to reproduce it. Keep its content exactly as the tracker returns it — the whole body, with its lists, its fences, and its line breaks intact — because that text is what the seed will carry. The seed quote-prefixes every line of it when the section is written, and that prefix is the only thing ever added to it. Perform no tracker writes of any kind: no backlink comments, no label changes, no status transitions, no closures. Never make thread creation depend on tracker access. If the tracker is unavailable or unauthenticated, ask the user to paste the ticket's title and body, then treat what they paste exactly as you would treat what the tracker returned. Never fail the invocation and never create partial state over a read that did not work.

## Check for an existing thread on the same ticket

Search the seeds of the threads under `.work/threads/` for an `External:` value denoting the same ticket. Compare references by their meaning rather than as raw strings, following the comparison rule in the tracker reference you read above.

When a thread already exists for the ticket, create the new thread anyway and name the existing thread's folder path in the report alongside it. A second thread on one ticket is legitimate for follow-up or superseding work, so there is nothing here to decide: this check informs the user, and it neither blocks the operation nor pauses it.
