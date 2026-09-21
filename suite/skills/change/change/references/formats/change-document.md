# Change-document format

`change.md` at the thread root is **the change document**: the thread's design of one change, written once the discussion has settled, amended in place while the work runs, and historical once the thread closes. It is cited from every downstream artifact of the thread — the plan, the implementation report, the reviews — and it holds only what is thread-only. Everything the change makes standing lives in the thread's delta documents and is cited from here.

## Shape

```markdown
# <the change, in a title>

## Goal

<what the change is for>

## Context

<what a reader needs in order to judge it>

## Scope and non-scope

<what this change covers, and what it deliberately leaves out>

## Constraints

- <a boundary the change respects, and where it comes from>

## The change

<what the deltas add, replace and remove, each cited by delta document path,
plus any one-off work such as a migration or a data fix>

## Acceptance

- <a statement of behavior the finished work satisfies>
- <another>

## Degrees of freedom

- <a choice deliberately left to the implementer>

## Inferences

- <something taken as settled without being argued, and what it rests on>

## Delta index

- `delta/docs/adr/<stem>.md` — create
- `delta/docs/product/<capability>.md` — edit
```

## Rules

- The one rule: a sentence that describes standing behavior of the product or standing structure of the system is written in a delta document and cited from the change document, never written in the change document's body.
- Heading names and their order are the author's choice; the body covers the goal, the context, scope and non-scope, constraints, the change, acceptance, degrees of freedom, inferences, and the delta index.
- Acceptance is a flat checklist of behavior statements, one `- ` bullet per line, covering everything the implementer builds including what is obvious from the code.
- A criterion carries no `FR-`, `AC-` or other identifier and no numbering. A plan task, a report row or a review finding references a criterion by quoting it verbatim.
- The delta index lists every delta document of the thread by path, with its type.
- A reference within the thread is thread-relative — `log.md`, `delta/docs/adr/<stem>.md` — and a reference to anything in the project is repo-relative.
- An amendment keeps the superseded text, marked with the date and the reason it was superseded, and a delta document is amended together with the change that affects it.
- The file carries no frontmatter.
- A settled point is sorted to its home by the routing table below, one point at a time.

### Routing

| A settled sentence that… | goes to | drafted by | lands |
| --- | --- | --- | --- |
| records a choice with a named rejected alternative about how the system is built | ADR (`create` delta) | the change authoring | close |
| records such a choice about what the product does or for whom | PDR (`create` delta) | the change authoring | close |
| describes built behavior the code does not make obvious | product behavior (`edit`/`create` delta) | the change authoring | close |
| describes built structure no single file makes obvious | architecture description (`edit`/`create` delta) | the change authoring | close |
| fixes a term | glossary (`edit`/`create` delta) | the change authoring | close |
| describes behavior settled but not yet built | the roadmap entry that will build it | the `roadmap` skill or its owner | in place |
| is thread-only design, a criterion, a constraint of this change | the change document body | the change authoring | never |
| is a rule or guideline for agents | no method-owned home | — | — |
