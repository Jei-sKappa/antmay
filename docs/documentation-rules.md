# Documentation rules

How every document and every skill body in this repository is written. Read this
before writing prose anywhere in the repository.

## Three kinds of document, one audience each

Every file of prose here is exactly one of three kinds. Each has one audience and
one register, and knowing which kind you are editing settles most questions about
what belongs in it. The same fact may appear in two kinds when both audiences
need it; it never appears twice within one kind.

**Shipped content** — everything under `suite/skills/` and
`suite/shared/references/`. Written for the agent that has just been invoked, in
any project, with no memory of this one. It is imperative and project-free: no
decision identifiers, no thread path of this repository, no explanation of how
this repository is organised. It is never cited as this repository's own
documentation — when a maintainer needs a rule that a shipped file happens to
state, the rule is written in a maintainer document too.

**`README.md`** — written for an external user of antmay who has never seen the
source. What it is, the skills with what each expects and leaves behind, the
thread folder and the project layer at overview level, how to install, and where
to go next. Include only what such a user needs in order to understand, choose,
configure, or operate the software; internal implementation and maintenance
detail has no practical value to that audience and stays out.

**Maintainer documentation** — written for whoever works on this repository, and
reached from the `AGENTS.md` files. `CONTRIBUTING.md` covers issues, effort
bands, commits, and pull requests; `docs/documentation-rules.md` is this file;
`docs/product/method.md` describes the method as this repository runs it and
`docs/architecture/suite.md` describes how the suite is put together — both
maintainer documentation of this repository, held in the shapes the suite's
product-behavior and architecture-description formats define; `suite/authoring/`
holds the conventions the skills are authored to; the CLI carries its own.
Rules, rationale, and constraints belong here — stated once, in the file whose
concern they are.

## Describe the current state, never the diff

When an edit replaces design A with design B, the resulting skill body or
document must describe B as if A had never existed. Never write a negation or
before/after contrast whose only referent is the removed design — "X is no
longer …", "there is no X anymore", "unlike before, …": once A is removed it is
not materially written anywhere, so a fresh reader cannot know it existed, and
the sentence's only effect is to teach a dead concept while reading as a
changelog.

Test every negative statement you keep or add: does it forbid something a fresh
reader with no memory of the old design would plausibly do anyway? A live
guardrail against natural drift ("never treat the sequence as a checklist", "add
no owner field") passes the test; a contrast with a previous version of the text
does not.

## Document only durable, properly scoped information

Do not add comments, sections, or documentation notes merely because a change
was made or to ensure that every changed behavior is mentioned somewhere.
Explanatory prose belongs only where it gives a future reader useful, durable
information such as a contract, non-obvious constraint, rationale, or workflow.
Place each fact at the narrowest location whose scope matches it: broad behavior
does not belong under one example, scenario, or component, and the same fact
does not need to be repeated across documents. If existing documentation remains
accurate and useful after a change, leave it unchanged.

A catalog the software itself prints — a `--list` output, a help screen — is not
documentation to maintain in any file. Point at the command rather than copying
its rows into prose, and keep the runtime source of that listing accurate
instead.

Citation runs one way, and the direction is fixed by where the cited thing
lives. Nothing under `.work/` — a thread's log entries, its spec, its
delta documents, its plans or implementation folders, or a roadmap entry — is
cited from `docs/` or from code: each is one thread's record of one moment, and
a reader outside it cannot resolve the reference. A thread path appears outside
its thread only as commit provenance. A decision record, ADR or PDR, is cited by
its stem, for the reason behind a choice and never for what the system does. A
description is cited by path and heading. A roadmap entry is cited by index path
and entry slug, from thread artifacts only. Code, comments, test names and
migrations carry no thread reference at all, and a test is named for the
behavior it proves. What a thread settled reaches a later reader through the
record or the description it landed in, stated in full where it applies, not
through the thread that settled it. No citation is ever required.

`AGENTS.md` files are durable working memory for agents that lose session
context. Use them to make the repository or module structure quickly
understandable and to preserve non-obvious constraints, rationale, workflows, and
rules that cannot be expressed or enforced practically in code. Do not use them
as an inventory of ordinary implementation details. Code is the source of truth
for behavior and structure that are immediately apparent from reading it.
