---
name: open-ticket
description: Turn a rough idea into a tracker ticket whose body reads as a thread's genesis narrative, marked so it is recognizable as ready to work from — use when an idea should be captured in the tracker rather than started now.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.1.0
---

# Open Ticket

Turn a user's rough idea into one ticket in the project's tracker. You interpret
the raw input, compose a title and a body, confirm both with the user, and file
the ticket.

What makes this worth a deliberate operation is the body. A ticket filed here is
written so that whoever later opens a thread from it can take the body as the
thread's genesis narrative unchanged, instead of mining intent out of a
half-specification.

You write nothing to disk. The ticket in the tracker and the URL you report are
the whole result.

## Resolve the tracker

Determine which tracker the project's repository belongs to from the git
remote's host, then read the matching reference under `references/trackers/` —
for a `github.com` remote that is `references/trackers/github.md`. It carries
the availability check, the repository resolution, the exact commands, and the
label handling for that tracker.

Resolve the target repository before composing. When the checkout has several
remotes and the target is genuinely ambiguous, ask which repository is meant;
never pick one by order or by name.

## Compose the ticket

Compose two things from the user's idea.

**The title** — one human-readable line naming the subject, in the register a
person would use when speaking about the work. It is prose, not an identifier:
no kebab-case, no timestamp, no bracketed prefixes.

**The body** — a self-contained account of what triggered the work and what
outcome is wanted, written so a reader with no memory of the conversation
understands why the ticket exists. Restraint is the point: the body records the
*need*, and stops where the need stops.

So the body carries no acceptance criteria, no task or subtask breakdown, no
proposed design or file layout, no estimate, and no implementation notes. Those
decisions have not been made yet, and inventing them here buries the need under
a specification the work has not earned. If the user supplies a constraint that
genuinely already holds — a deadline, a dependency, a rejected approach — record
it as part of the narrative rather than as a checklist.

Length follows the idea. A one-paragraph body is a good body when the idea is
one paragraph wide.

## Confirm once, then file

Show the user the composed title, the composed body, and the label you will
apply. When the marker label does not yet exist in the target repository, say so
in this same message — its creation is part of what the user is approving, not a
silent side effect.

Invite one round of corrections, fold any adjustment in, and file the ticket.
This is a brief confirmation, not a drawn-out dialogue — one pass is enough. The
user's approval here is what authorizes the write; file nothing before it.

Apply the marker label by default. Drop it only if the user asks you to.

## When the tracker cannot be reached

Compose first, confirm second, write last. Never probe the tracker before you
have composed the title and body.

If the tracker turns out to be unavailable or unauthenticated when you try to
file, print the composed title and body in full and tell the user to file it
themselves. The composition is the part they cannot easily redo; losing the API
call costs them a copy and paste.

## Report

Report the filed ticket's URL, and let that be the end of it. Do not propose a
next action and do not offer to start the work: filing a ticket is how a person
defers something deliberately, so pushing them onward works against the reason
they invoked this at all.
