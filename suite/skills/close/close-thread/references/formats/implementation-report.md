# Implementation-report format

One implementation folder holds one report, at `implementations/<yymmddhhmm>[-<slug>]/report.md`. It describes the outcome of the run that wrote it.

## Shape

```markdown
# Implementation report

Plan: plans/<yymmddhhmm>[-<slug>]/

## Outcome

<what the implementation ended up being: what was delivered, and whether it completed or stopped>

## Changes

<the changes made, by area or by path, at the level a reader needs to find them>

## Verification

<what was run or checked to confirm the changes hold, and what it showed>

## Acceptance

| Criterion | Method | Evidence |
| --- | --- | --- |
| <one criterion of the spec, quoted verbatim> | <automated test \| manual check \| code review> | <the test name and file, or what was walked through and what was observed> |

## Deviations

- <what was built> — departs from <the spec section or the decision record stem> — <why>

## Remaining concerns

- <something that holds but is not settled>

## Follow-ups

- <work this implementation leaves for later>
```

## Rules

- The `Plan:` line names the plan folder executed, or reads `Plan: none` when the implementation ran from a seed, a reference, or a prompt.
- `Plan:`, `## Outcome`, `## Changes`, `## Verification`, and `## Acceptance` are always present.
- `## Deviations`, `## Remaining concerns`, and `## Follow-ups` appear only when they carry content; leave the heading out entirely rather than writing a placeholder under it.
- `## Acceptance` holds one row per criterion of the thread's spec: `Criterion` is that criterion quoted verbatim, `Method` is one of `automated test`, `manual check` or `code review`, and `Evidence` is the test name and file, or what was walked through and what was observed. A criterion without a row is a gap the fidelity review reports.
- When the thread holds no spec, `## Acceptance` states so in one line and holds the criteria the plan or the input stated, quoted the same way.
- Each entry under `## Deviations` names what was built, the spec section or the decision record stem it departs from, and why.
- The report cites the thread's durable artifacts by path; a path under that folder's `.runs/` never appears in it.
