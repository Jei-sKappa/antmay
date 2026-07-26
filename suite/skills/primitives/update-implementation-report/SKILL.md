---
name: update-implementation-report
description: Use only when an invoking caller supplies a verified current implementation outcome and the thread's singleton `implementation-report.md` must be created or merged in place to describe that outcome.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.1.0
---

# Update Implementation Report

Format and merge the caller-supplied current outcome into the thread's implementation report. You own only this bounded side effect: shaping the report and merging in place so it describes the thread's CURRENT implementation outcome.

## Precondition and refusal

Act only when the caller supplies the current outcome to record: what was completed, partially completed, blocked, or found already satisfied; a description of the resulting changes; the checks actually performed and their results; and any deviations, remaining concerns, and follow-ups. If no caller-supplied outcome is given, refuse and write nothing — you never inspect code, rerun checks, or decide whether the implementation succeeded.

## Report contract

The report lives at the thread root as `implementation-report.md`. Write it in this order:

```markdown
# Implementation report

Source: <seed.md, plan.md, or spec.md>

## Outcome

<what was completed, partially completed, blocked, or found already satisfied>

## Changes

<concise description of the resulting code, tests, configuration, and living-document changes>

## Verification

<checks actually performed and their results>

## Deviations and judgment calls

<material differences from the input and choices made within granted freedom>

## Remaining concerns

<known risks, unresolved limitations, or blockers>

## Follow-ups

<work discovered but intentionally left outside this implementation>
```

`Source`, `## Outcome`, `## Changes`, and `## Verification` are always present. `## Deviations and judgment calls`, `## Remaining concerns`, and `## Follow-ups` appear only when they carry real information; omit any empty one entirely and never emit a `none` placeholder.

## Merge semantics

When `implementation-report.md` is absent, create it from the caller's outcome. When it already exists, merge the current outcome in place: replace stale descriptions with the current ones, remove concerns and blockers the caller now reports as resolved, and add newly discovered items. The report reflects only the CURRENT state — never append prior-pass history or keep a running log of earlier attempts.

State partial, blocked, and no-op outcomes plainly. Partial or blocked work names what changed and what prevented completion; a no-op explains that the requested state already existed and how that was verified.

## Content boundaries

`## Verification` records only the checks the caller actually performed, including failures and intentionally skipped checks with their reasons. Never claim an intended check was performed merely because an input named it. Commit SHAs are optional.

Keep out of the report: per-task status blocks and transcripts, dispatch counts, fix-loop details, and any path under `.implementation-runs/`. Those resources are transient; the durable report never cites them.
