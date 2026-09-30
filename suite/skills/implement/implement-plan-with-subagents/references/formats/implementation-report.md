# Implementation-report format

One implementation folder holds one report, at `implementations/<yymmddhhmm>[-<slug>]/report.md`. It describes the outcome of the run that wrote it.

## Shape

```markdown
# Implementation report

Plan: plans/<yymmddhhmm>[-<slug>]/

## Outcome

<one or two sentences: whether the run completed, or at which task it stopped and why>

## Deviations

- Task <NN> — <what was built> — departs from <the spec section or the decision record stem> — <why>

## Judgment calls

- Task <NN> — <the choice> — fills <the degree of freedom or the spec's silence it filled> — <why>

## Changes

- <NN> <task title as the plan index gives it, or a one-line description of an implicit task> — <commit SHA and subject | not run | blocked | already done, <commit SHA and subject the earlier report records> | no change needed>[ — deviation][ — judgment call]

## Verification

- <a check run against the final state, or a check that failed or was deliberately skipped> — <its result, or the reason>

## Acceptance

| Criterion | Method | Evidence |
| --- | --- | --- |
| <one criterion of the spec, quoted verbatim> | <automated test \| manual check \| code review> | <the test name and file, or what was walked through and what was observed> |

## Remaining concerns

- <something that holds but is not settled>

## Follow-ups

- <work this implementation leaves for later>
```

## Rules

- The `Plan:` line names the plan folder executed, or reads `Plan: none` when the implementation ran from a seed, a reference, or a prompt.
- `Plan:`, `## Outcome`, `## Changes`, `## Verification`, and `## Acceptance` are always present.
- `## Deviations`, `## Judgment calls`, `## Remaining concerns`, and `## Follow-ups` appear only when they carry content; leave the heading out entirely rather than writing a placeholder under it. A clean run therefore reads as the outcome followed directly by the ledger.
- `## Outcome` is one or two sentences saying whether the run completed, or at which task it stopped and why. For a no-op, it says that the requested state already held and how that was checked.
- Each entry under `## Deviations` names what was built, the spec section or the decision record stem it departs from, and why. A deviation departs from something pinned.
- Each entry under `## Judgment calls` names the choice, the degree of freedom or the spec's silence it filled, and why. A judgment call departs from nothing pinned, so it is never recorded under `## Deviations`.
- A deviation or judgment-call entry that belongs to a task opens with that task's ordinal, as `Task <NN> —`.
- `## Changes` is the task ledger: one line per task the run covered.
  - A plan task carries its ordinal and its title as the plan index gives it. An implicit task carries its ordinal in the derived task list and a one-line description of what it did.
  - The line then gives the task's commit, as its SHA and subject, or one of `not run`, `blocked`, `already done` with the commit the earlier report records, and `no change needed`.
  - The line ends with a pointer to each deviation or judgment call the task carries, naming its kind; the reader finds the entry by the task ordinal it opens with.
  - A ledger line never describes a task that followed its brief: such a task is listed, never described.
- `## Verification` lists only the checks run against the final state — the project's standing gates, whole-change suites or builds — plus every check that failed or was deliberately skipped, each with its result or its reason. A per-task check that passed is not listed, because every commit in the ledger passed the baseline gate.
- `## Acceptance` holds one row per criterion of the thread's spec: `Criterion` is that criterion quoted verbatim, `Method` is one of `automated test`, `manual check` or `code review`, and `Evidence` is the test name and file, or what was walked through and what was observed. A criterion without a row is a gap the fidelity review reports.
- When the thread holds no spec, `## Acceptance` states so in one line and holds the criteria the plan or the input stated, quoted the same way.
- The report cites the thread's durable artifacts by path; a path under that folder's `.runs/` never appears in it.
