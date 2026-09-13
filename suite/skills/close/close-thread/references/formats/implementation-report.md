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

  ## Deviations

  - <what was built> — departs from <the spec section or ADR stem> — <why>

  ## Remaining concerns

  - <something that holds but is not settled>

  ## Follow-ups

  - <work this implementation leaves for later>
  ```

## Rules

- The `Plan:` line names the plan folder executed, or reads `Plan: none` when the implementation ran from a seed, a reference, or a prompt.
- `Plan:`, `## Outcome`, `## Changes`, and `## Verification` are always present.
- `## Deviations`, `## Remaining concerns`, and `## Follow-ups` appear only when they carry content; leave the heading out entirely rather than writing a placeholder under it.
- Each entry under `## Deviations` names what was built, the spec section or ADR stem it departs from, and why.
- The report cites the thread's durable artifacts by path; a path under that folder's `.runs/` never appears in it.
