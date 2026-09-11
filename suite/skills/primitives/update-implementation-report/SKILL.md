---
name: update-implementation-report
description: Use only when an invoking caller supplies a verified current implementation outcome and one implementation folder's `report.md` must be created or merged in place to describe that outcome.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.2.0
---

# Update Implementation Report

Format the caller-supplied current outcome into one implementation folder's report and merge it in place. You own only this bounded side effect: shaping that folder's `report.md` so it describes the CURRENT outcome of the implementation it belongs to.

## Precondition and refusal

Act only when the caller supplies all three of:

- **The implementation folder** — the thread-relative path `implementations/<yymmddhhmm>[-<slug>]/` whose report you write.
- **The plan executed** — the plan folder the implementation ran, or the caller's statement that no plan was used.
- **The outcome material** — what was completed, partially completed, blocked, or found already satisfied; a description of the resulting changes; the checks actually performed and their results; the deviations, each naming what was built, the spec section or ADR stem it departs from, and why; any remaining concerns; and any follow-ups.

If any of the three is missing, refuse, name exactly what is absent, and write nothing. You never inspect code, rerun checks, resolve which folder was meant, or decide whether the implementation succeeded.

## Inputs

- `docs/adr/` — the project ADR catalog, listed with the command in `references/formats/adr.md`; open the records relevant to the target, for the stems a deviation entry cites. Authoritative.
- `docs/glossary.md` — the project's terms. Authoritative.
- The named implementation folder's `report.md`, when the folder already holds one — the merge target. Material.

## Report contract

Write the report per `references/formats/implementation-report.md`: its path inside the named folder, the `Plan:` header line that names the plan folder executed or reads `Plan: none`, the section order, which sections are always present, and the shape of an entry under `## Deviations`.

## Merge semantics

When the folder holds no `report.md`, create it from the caller's outcome. When it already holds one, merge the current outcome in place: replace stale descriptions with the current ones, remove concerns and blockers the caller now reports as resolved, and add newly discovered items. The report reflects only that folder's CURRENT state — never append prior-pass history or keep a running log of earlier attempts on the same implementation.

State partial, blocked, and no-op outcomes plainly. Partial or blocked work names what changed and what prevented completion; a no-op explains that the requested state already existed and how that was verified.

You write exactly one file: `report.md` inside the implementation folder the caller named. Nothing else you touch is written — `docs/adr/` and `docs/glossary.md` are read here and never written.

## Content boundaries

`## Verification` records only the checks the caller actually performed, including failures and intentionally skipped checks with their reasons. Never claim an intended check was performed merely because an input named it. Commit SHAs are optional.

Keep out of the report: per-task status blocks and transcripts, dispatch counts, fix-loop details, and any path under the folder's `.runs/`. Those resources are transient; the durable report never cites them.
