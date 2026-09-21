---
name: open-ticket
description: File a rough idea as a tracker ticket whose body reads as a thread's genesis narrative.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Open Ticket

Turn a user's rough idea into one ticket in the project's tracker. You interpret
the raw input, compose a title and a body, confirm both with the user, and file
the ticket.

What makes this worth a deliberate operation is the body. The body you compose
here **is** the ticket section of any thread later opened from this ticket:
`open-thread` quotes it as it stands rather than rewriting it, so this is the one
moment the wording is chosen. Write it as the seed's opening account, not as a
note toward one.

You write nothing to disk. The ticket in the tracker and the URL you report are
the whole result; `docs/adr/` and `docs/glossary.md` are read here and never
written.

## Inputs

Gather the following before composing; the composition below works from what you
gather here.

- The project's `AGENTS.md`, when the file exists — the project's standing
  guidance for agents working in it.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be
  used in everything you write.
- `docs/architecture/<module>.md` for each module the work touches,
  read via `/consult-descriptions` — how the system is structured now.
- `docs/product/<capability>.md` for each capability the work touches,
  read via `/consult-descriptions` — what the product does now.
- `docs/adr/` and `docs/pdr/`, read via `/consult-decisions` — the project
  decisions bearing on the idea.
- The repository's convention files, found and read as
  `<skill_path>/references/repository-conventions.md` directs. A convention can
  decide the title's shape, and a title composed without it has to be rewritten.
- The tracker reference matching the host of the project's git remote — for a
  `github.com` remote that is `<skill_path>/references/trackers/github.md`;
  follow it for that tracker. When the checkout has several remotes and the
  target repository is genuinely ambiguous, ask which one is meant; never pick
  one by order or by name.

The idea itself comes with the invocation: one **rough idea** in prose — what
triggered the work and what outcome is wanted — given as a sentence, a
paragraph, or a few lines of notes.

## Compose the ticket

Compose two things from the user's idea, applying what the repository's
conventions say about a ticket.

**The title** — one human-readable line naming the subject, in the register a
person would use when speaking about the work. Where the project prescribes no
title shape, that register means prose, with no bracketed prefix and no
kebab-case identifier.

**The body** — a self-contained **problem statement**, and the account a thread
will inherit as the ticket section of its genesis narrative: what triggered the
work and what outcome is wanted, written so a reader with no memory of the
conversation understands why the ticket exists. Nothing downstream will rewrite
it, so it has to read as the account a thread opens with. Restraint is the point — a
problem statement records the need, stops where the need stops, and leaves the
solution out. Scope, design, and task decisions have not been made yet, and
inventing them here buries the need under a specification the work has not
earned. When the user supplies a constraint that genuinely already holds — a
deadline, a dependency, a rejected approach — carry it in the narrative.

Length follows the idea. A one-paragraph body is a good body when the idea is
one paragraph wide.

## Confirm once, then file

Show the user the composed title, body, and any labels required by the
repository's convention.

Where a convention shaped the title or requires a label, this message is also
where the value you chose for it is visible, and where you ask about any choice
the idea did not settle.

Invite one round of corrections, fold any adjustment in, and file the ticket
with the command the tracker reference gives. This is a brief confirmation, not
a drawn-out dialogue — one pass is enough. The user's approval here is what
authorizes the write; file nothing before it.

This pass stays even where a skill writing inside the repository would drop it.
Filing a ticket lands outside the repository, on a service other people read: it
notifies, it is visible immediately, and it cannot be quietly withdrawn. The
approval is what authorizes that specific write, and it is also where the body's
wording is settled for good, since a thread opened from this ticket will carry
the body as written.

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
