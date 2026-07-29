---
name: open-ticket
description: Turn a rough idea into a tracker ticket whose body reads as a thread's genesis narrative — use when an idea should be captured in the tracker rather than started now.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.4.0
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

## Read the repository's conventions

Do this first, before composing: a convention can decide the title's shape, and
a title composed without it has to be rewritten.

Read `references/repository-conventions.md` and apply what it says about a
ticket. It carries where a project states such a convention, which parts of it
bind you, and what to do when it leaves a choice the user's idea does not
settle.

## Compose the ticket

Compose two things from the user's idea.

**The title** — one human-readable line naming the subject, in the register a
person would use when speaking about the work. Where the project prescribes no
title shape, that register means prose, with no bracketed prefix and no
kebab-case identifier.

**The body** — a self-contained **problem statement**: what triggered the work
and what outcome is wanted, written so a reader with no memory of the
conversation understands why the ticket exists. Restraint is the point — a
problem statement records the need, stops where the need stops, and leaves the
solution out. Scope, design, and task decisions have not been made yet, and
inventing them here buries the need under a specification the work has not
earned. When the user supplies a constraint that genuinely already holds — a
deadline, a dependency, a rejected approach — carry it in the narrative.

Length follows the idea. A one-paragraph body is a good body when the idea is
one paragraph wide.

## Resolve the tracker and repository

Do this once the title and body exist.

Determine which tracker the project's repository belongs to from the git
remote's host, then read the matching reference under `references/trackers/` —
for a `github.com` remote that is `references/trackers/github.md`. It carries
the availability check, the repository resolution, and the exact commands for
that tracker.

When the checkout has several remotes and the target repository is genuinely
ambiguous, ask which one is meant; never pick one by order or by name.

## Confirm once, then file

Show the user the composed title, body, and any labels required by the
repository's convention.

Where a convention shaped the title or requires a label, this message is also
where the value you chose for it is visible, and where you ask about any choice
the idea did not settle.

Invite one round of corrections, fold any adjustment in, and file the ticket.
This is a brief confirmation, not a drawn-out dialogue — one pass is enough. The
user's approval here is what authorizes the write; file nothing before it.

Apply the labels the repository's convention requires. When it requires none,
file the ticket without labels.

## When the tracker cannot be reached

If the tracker turns out to be unavailable or unauthenticated, print the
composed title and body in full and tell the user to file it themselves. The
composition is the part they cannot easily redo; losing the API call costs them
a copy and paste.

## Report

Report the filed ticket's URL. If a required repository label could not be
applied, name it alongside the URL; otherwise let the URL be the whole report.
Do not propose a next action and do not offer to start the work: filing a ticket
is how a person defers something deliberately, so pushing them onward works
against the reason they invoked this at all.
