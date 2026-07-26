# The ticket step

Applies when the thread's `seed.md` carries an `External:` value naming a tracker ticket AND that tracker is reachable. When the tracker's tooling or credentials are unavailable, or the ticket is already closed, say nothing about tickets and deliver the branch exactly as the skill body describes.

Determine the tracker from the `External:` value's host and read the matching reference under `references/trackers/` — for a `github.com` ticket that is `references/trackers/github.md`. It carries the availability check, the default-branch lookup, the reference forms, and the exact linking and closing mechanics.

## What to offer, by disposition

The two delivering dispositions close a ticket by different means:

- **create PR** — offer to place a closing keyword for the ticket in the pull-request body. Settle this BEFORE drafting the body, since the keyword is part of what gets pushed. When the PR's base is the repository's default branch, the keyword is the whole job: it links the ticket to the PR on both objects and the tracker closes the ticket when the PR merges. When the base is NOT the default branch, say so plainly — the keyword will link the ticket but nothing will close it — and offer a non-closing `Related to <ticket>` mention instead. Leave the closing itself to the merge: the work is not merged yet, and a closed ticket over an unmerged PR misreports the state of the work.
- **merge into a confirmed target** — no pull request exists to carry a keyword, so after the merge succeeds, offer to close the ticket with a comment citing the merge commit, so the closed ticket still leads back to the code.
- **leave as-is** — offer nothing. No work was delivered.

Each of these is an offer the user accepts or declines, and a decline leaves the ticket untouched. Perform only the write the user accepted.
